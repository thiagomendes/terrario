/**
 * Salas do servidor da nuvem: cada uma é um mundo carregado na memória, rodando o mesmo
 * núcleo do jogo. Recebe quem entra pelo código, aplica os comandos em ordem, avança 20
 * vezes por segundo, manda a cada jogador o que está perto dele, grava o que mudou a
 * cada 5 s e dorme (salva e sai da memória) quando fica vazia.
 */
import { createHash, randomUUID } from 'node:crypto';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { JOGADOR_LOCAL } from '../../src/nucleo/anfitriao';
import { definirEstiloMundo } from '../../src/world/chunk';
import { estiloSeguro } from '../../src/world/estiloSeguro';
import { sanearAparencia, sanearDadosMundo } from '../../src/nucleo/saneamento';
import { definirRegioesSemPovoado } from '../../src/world/povoado';
import { definirObrasFeitas } from '../../src/world/obras';
import { gerarCodigo, normalizarCodigo } from '../../src/jogo/codigos';
import type { DadosMundo } from '../../src/jogo/mundos';
import { PASSO, type Comando, type DadosJogador, type Quadro } from '../../src/nucleo/protocolo';
import {
  MAX_JOGADORES,
  VERSAO_REDE,
  type EstadoSala,
  type Identidade,
  type MotivoRecusa,
  type MundoNuvem,
  type PedidoCliente,
  type RespostaServidor,
} from '../../src/rede/protocolo';
import { limparApelido } from '../../src/jogo/apelido';
import { FORMATO_MUNDO, regiaoDe, type Armazem, type MundoGuardado, type Sala } from './armazem';

/** O que o gerenciador precisa de uma conexão (WebSocket de verdade ou de teste). */
export interface Canal {
  enviar(texto: string): void;
  fechar(): void;
  readonly ip: string;
}

/** Raio (blocos) do que cada jogador recebe: criaturas e itens longe não vão. */
const RAIO_CRIATURAS = 64;
const RAIO_ITENS = 48;
/** Quem cai da internet tem este tempo para voltar ao mesmo lugar. */
const TOLERANCIA_QUEDA = 30_000;
/** Sala vazia dorme depois disto (salva e sai da memória). */
const ESPERA_VAZIA = 60_000;
/** Gravação do que mudou. */
const INTERVALO_GRAVAR = 5_000;
/** Tentativas de código errado por endereço a cada 10 minutos. */
const TENTATIVAS = 20;
/** Prévias de mundo por endereço a cada 10 minutos (acertos também contam). */
const PREVIAS = 60;
/** Mundos novos por endereço a cada 10 minutos, e salas na memória ao mesmo tempo. */
const CRIACOES = 10;
const MAX_SALAS = 300;
/** Identidade do aparelho: só letras, números, - e _ (vira nome de arquivo no Storage). */
const ID_VALIDO = /^[A-Za-z0-9_-]{2,64}$/;
const JANELA = 600_000;

const resumo = (chave: string) => createHash('sha256').update(chave).digest('hex');
/** Números com 2 casas: metade dos bytes, sem diferença que se veja. */
const compacto = (_k: string, v: unknown) =>
  typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 100) / 100 : v;

interface Presente {
  id: string;
  /** Resumo da chave do aparelho (gravado com os dados do jogador). */
  chave: string;
  canal: Canal | null;
  desligadoEm: number | null;
  /** Ordem dos comandos desta conexão (pelo seq). */
  esperado: number | undefined;
  adiantados: Map<number, Comando>;
  ultimoSalvo: string;
}

interface SalaAtiva {
  sala: Sala;
  mundo: MundoNuvem;
  nucleo: Nucleo;
  presentes: Map<string, Presente>;
  regioesSujas: Set<string>;
  vaziaDesde: number | null;
  ultimaGravacao: number;
  expulsos: Set<string>;
  /** Muda cada vez que a sala é aberta (o navegador percebe que o servidor recomeçou). */
  instancia: string;
  /** Último erro registrado no passo (para não encher o log). */
  erroEm: number;
  /** O dono parou de jogar com amigos: nada mais grava nem reabre esta sala. */
  encerrada?: boolean;
}

/** O que a tela "Entrar no mundo de…" mostra antes de entrar. */
export interface PreviaMundo {
  codigo: string;
  nome: string;
  tema: string;
  modo: string;
  dono: string;
  presentes: string[];
  fechado: boolean;
  cheio: boolean;
}

export interface OpcoesGerenciador {
  armazem: Armazem;
  agora?: () => number;
  sorteio?: () => number;
  /** Atalhos de teste no núcleo (só em ambiente de testes). */
  depuracao?: boolean;
  log?: (msg: string) => void;
}

export function criarGerenciador(op: OpcoesGerenciador) {
  const { armazem } = op;
  const agora = op.agora ?? Date.now;
  const sorteio = op.sorteio ?? Math.random;
  const log = op.log ?? (() => undefined);
  const ativas = new Map<string, SalaAtiva>();
  /** Salas sendo carregadas (dois entrando ao mesmo tempo esperam a mesma carga). */
  const carregando = new Map<string, Promise<SalaAtiva | null>>();
  const deCanal = new Map<Canal, { sala: SalaAtiva; id: string }>();
  const erros = new Map<string, { n: number; desde: number }>();
  const criacoes = new Map<string, { n: number; desde: number }>();
  /** Conexões com um "entrar" em andamento (um por vez). */
  const entrando = new Set<Canal>();
  /** Códigos trocados pelo dono: só quem estava na sala volta por eles. */
  const antigos = new Map<string, SalaAtiva>();
  /**
   * Mundos que voltaram para o aparelho do dono, por código: os dados ficam aqui uns minutos
   * para o dono que caiu no meio receber de novo quando voltar (só ele, com a chave dele).
   */
  const devolvidos = new Map<
    string,
    { dono: string; chave: string; dados: DadosMundo; ate: number }
  >();
  /** Prévias por endereço (acertos também contam: cada uma lê o armazém). */
  const previas = new Map<string, { n: number; desde: number }>();
  /** Diário e mapa de cada jogador em cada mundo (vão junto dos dados dele). */
  const guardados = new Map<string, unknown>();

  function enviar(c: Canal | null, m: RespostaServidor): void {
    if (!c) return;
    try {
      c.enviar(JSON.stringify(m, compacto));
    } catch {
      // conexão já fechada: a queda é tratada no fechamento
    }
  }

  /** O terreno do tema e as regiões sem povoado são do mundo desta sala. */
  function contexto(s: SalaAtiva): void {
    definirEstiloMundo(s.mundo.estilo);
    definirRegioesSemPovoado(s.nucleo.semPovoado);
    // spec 014: as obras feitas mudam a geração da cidade (cada sala tem as suas)
    definirObrasFeitas(s.nucleo.obrasFeitas);
  }

  function estadoSala(s: SalaAtiva): EstadoSala {
    return {
      codigo: s.sala.codigo,
      fechado: s.sala.fechado,
      constroem: s.sala.constroem,
      dono: s.sala.dono,
    };
  }

  function excedeu(m: Map<string, { n: number; desde: number }>, ip: string, max: number) {
    const e = m.get(ip);
    if (!e || agora() - e.desde > JANELA) return false;
    return e.n >= max;
  }
  function contar(m: Map<string, { n: number; desde: number }>, ip: string, d = 1): void {
    const e = m.get(ip);
    if (!e || agora() - e.desde > JANELA) {
      if (d > 0) m.set(ip, { n: d, desde: agora() });
    } else e.n = Math.max(0, e.n + d);
  }

  /**
   * O mundo guardado, só se for do formato de agora (spec 016: os de antes foram apagados; um
   * que sobrou é como se não existisse, e o código dá a recusa de sempre).
   */
  async function lerMundoAtual(id: string): Promise<MundoGuardado | null> {
    const g = await armazem.lerMundo(id);
    return g && g.formato === FORMATO_MUNDO ? g : null;
  }

  async function carregar(codigo: string): Promise<SalaAtiva | null> {
    // código de um mundo que voltou para o aparelho do dono: não reabre (nem por corrida)
    if (devolvidos.has(codigo)) return null;
    const ja = ativas.get(codigo);
    if (ja) return ja;
    const pendente = carregando.get(codigo);
    if (pendente) return pendente;
    const p = (async () => {
      const sala = await armazem.lerSala(codigo);
      if (!sala) return null;
      const g = await lerMundoAtual(sala.mundoId);
      if (!g) return null;
      const regioes = await armazem.lerRegioes(sala.mundoId);
      const edicoes: DadosMundo['edicoes'] = {};
      for (const r of Object.values(regioes)) Object.assign(edicoes, r);
      return abrir(sala, g.mundo, {
        versao: 1,
        edicoes,
        jogador: null,
        hora: g.hora,
        extras: g.extras,
      });
    })();
    carregando.set(codigo, p);
    try {
      return await p;
    } finally {
      carregando.delete(codigo);
    }
  }

  function abrir(sala: Sala, salvoMundo: MundoNuvem, dados: DadosMundo | undefined): SalaAtiva {
    // estilo guardado de antes desta conferência também passa pelo saneamento
    const mundo = { ...salvoMundo, estilo: estiloSeguro(salvoMundo.estilo) };
    definirEstiloMundo(mundo.estilo);
    const nucleo = criarNucleo({
      semente: mundo.semente,
      modo: mundo.modo,
      versaoMundo: mundo.versaoMundo,
      dados,
      confiarNoCliente: false,
      depuracao: op.depuracao ?? false,
      // spec 013: a criatura da noite deste mundo (cada sala guarda a sua)
      noite: mundo.estilo.noite,
      // spec 016: o que o dono coloca (e o que veio do aparelho dele) é do dono; com ele
      // fora, os avisos dizem o nome dele (o núcleo passa a limpo)
      dono: sala.dono,
      apelidoDono: sala.apelidoDono,
    });
    const s: SalaAtiva = {
      sala,
      mundo,
      nucleo,
      presentes: new Map(),
      regioesSujas: new Set(),
      vaziaDesde: agora(),
      ultimaGravacao: agora(),
      expulsos: new Set(sala.expulsos ?? []),
      instancia: randomUUID(),
      erroEm: 0,
    };
    ativas.set(sala.codigo, s);
    log(`sala ${sala.codigo} aberta (${mundo.tema}, ${mundo.modo})`);
    return s;
  }

  async function criar(
    canal: Canal,
    jog: Identidade,
    c: NonNullable<Extract<PedidoCliente, { t: 'entrar' }>['criar']>,
  ): Promise<SalaAtiva> {
    let codigo = gerarCodigo(sorteio);
    for (let i = 0; i < 20 && (ativas.has(codigo) || (await armazem.lerSala(codigo))); i++)
      codigo = gerarCodigo(sorteio);
    const mundo: MundoNuvem = {
      id: randomUUID(),
      nome: String(c.nome ?? 'Mundo').slice(0, 40),
      semente: Number(c.semente) | 0,
      tema: String(c.tema),
      modo: c.modo === 'sobrevivencia' ? 'sobrevivencia' : 'criativo',
      versaoMundo: Number(c.versaoMundo) || 2,
      estilo: estiloSeguro(c.estilo),
    };
    const sala: Sala = {
      codigo,
      mundoId: mundo.id,
      dono: jog.id,
      apelidoDono: jog.apelido,
      chaveDono: resumo(jog.chave),
      fechado: false,
      constroem: true,
      criadoEm: agora(),
      acessadoEm: agora(),
    };
    // levar para a nuvem: o mundo vai inteiro; o que era do jogador fica com o dono
    // o mundo do aparelho vem como o cliente mandou: o que tem posição fora do mundo (um
    // bicho em x = 1e300 travava a sala) sai antes de a sala existir
    const d = c.dados ? sanearDadosMundo(c.dados) : undefined;
    let doDono: DadosJogador | undefined;
    if (d) {
      const { inventario, sobrevivencia, spawn, diario, marcadores, ...doMundo } = d.extras;
      d.extras = doMundo;
      // spec 023: a alma do jogador local (missões, progresso) passa a ser do dono na nuvem
      d.extras.alma = trocarDonoDaAlma(d.extras.alma, JOGADOR_LOCAL, jog.id);
      if (d.extras.alma === undefined) delete d.extras.alma;
      if (inventario || sobrevivencia)
        doDono = {
          inventario,
          sobrevivencia: sobrevivencia as DadosJogador['sobrevivencia'],
          spawn: (spawn as DadosJogador['spawn']) ?? { x: d.jogador?.x ?? 0, z: d.jogador?.z ?? 0 },
          pos: d.jogador ?? undefined,
        };
      guardados.set(`${mundo.id}/${jog.id}`, { diario, marcadores });
    }
    await armazem.gravarSala(sala);
    const s = abrir(sala, mundo, d);
    // o que veio do aparelho é novo para o Storage: todas as regiões com edição vão gravadas
    for (const k of Object.keys(d?.edicoes ?? {})) s.regioesSujas.add(regiaoDe(k));
    if (doDono)
      await armazem.gravarJogador(mundo.id, jog.id, {
        chave: resumo(jog.chave),
        perfil: { apelido: jog.apelido, aparencia: sanearAparencia(jog.aparencia) ?? {} },
        dados: doDono,
      });
    await gravarMundo(s);
    log(`sala ${codigo} criada`);
    return s;
  }

  /** A sala do código: ativa, dormindo no Storage ou (para quem estava nela) o código antigo. */
  async function salaDoCodigo(codigo: string, id: string): Promise<SalaAtiva | null> {
    const velha = antigos.get(codigo);
    if (velha)
      return velha.presentes.has(id) && ativas.get(velha.sala.codigo) === velha ? velha : null;
    return carregar(codigo);
  }

  async function entrar(canal: Canal, p: Extract<PedidoCliente, { t: 'entrar' }>): Promise<void> {
    const recusar = (motivo: MotivoRecusa) => {
      enviar(canal, { t: 'recusado', motivo });
      canal.fechar();
    };
    if (p.versao !== VERSAO_REDE) return recusar('versao');
    const jog = p.jogador;
    if (
      !jog ||
      typeof jog.id !== 'string' ||
      !ID_VALIDO.test(jog.id) ||
      typeof jog.chave !== 'string' ||
      jog.chave.length < 16 ||
      jog.chave.length > 200
    )
      return recusar('identidade');
    // o apelido vai para os avisos dos outros e para o Storage: passa a limpo como no aparelho
    jog.apelido = limparApelido(String(jog.apelido ?? '')) || 'Jogador';
    const chave = resumo(jog.chave);
    let s: SalaAtiva | null;
    let guardado: Awaited<ReturnType<Armazem['lerJogador']>> = null;
    if (p.criar) {
      if (excedeu(criacoes, canal.ip, CRIACOES) || ativas.size >= MAX_SALAS)
        return recusar('limite');
      contar(criacoes, canal.ip);
      s = await criar(canal, jog, p.criar);
    } else {
      if (excedeu(erros, canal.ip, TENTATIVAS)) return recusar('limite');
      // conta antes de esperar o Storage (rajadas de palpites contam todas); acerto devolve
      contar(erros, canal.ip);
      const codigo = normalizarCodigo(String(p.codigo ?? ''));
      // o dono que caiu enquanto levava o mundo para o aparelho recebe o mundo agora
      const dev = codigo ? devolvidos.get(codigo) : undefined;
      if (dev && dev.dados && dev.dono === jog.id && dev.chave === chave) {
        contar(erros, canal.ip, -1);
        enviar(canal, { t: 'devolvido', dados: dev.dados });
        canal.fechar();
        return;
      }
      s = null;
      // a sala pode dormir enquanto esperamos: confere de novo e, se for o caso, recarrega
      for (let tentativa = 0; codigo && tentativa < 3; tentativa++) {
        s = await salaDoCodigo(codigo, jog.id);
        if (!s) break;
        guardado = await armazem.lerJogador(s.mundo.id, jog.id);
        if (ativas.get(s.sala.codigo) === s) break;
        s = null;
      }
      if (!s) return recusar('codigo');
      contar(erros, canal.ip, -1);
    }
    const ehDono = s.sala.dono === jog.id && s.sala.chaveDono === resumo(jog.chave);
    // o nome do dono para quando ele sair (gravado com a sala na próxima gravação)
    if (ehDono) s.sala.apelidoDono = jog.apelido;
    if (s.expulsos.has(jog.id)) return recusar('expulso');
    if (s.sala.fechado && !ehDono) return recusar('fechado');
    const ja = s.presentes.get(jog.id);
    if (!ja && s.presentes.size >= MAX_JOGADORES) return recusar('cheio');
    // ninguém entra no lugar de outro (nem de quem ainda não foi gravado)
    if (guardado && guardado.chave !== chave) return recusar('identidade');
    if (ja && ja.chave !== chave) return recusar('identidade');
    contexto(s);
    if (ja) {
      // voltou da queda: o mesmo jogador, no mesmo lugar
      if (ja.canal && ja.canal !== canal) {
        // a aba (ou aparelho) antiga para de tentar: sem isso as duas se derrubam sem fim
        enviar(ja.canal, { t: 'substituido' });
        ja.canal.fechar();
      }
      ja.canal = canal;
      ja.desligadoEm = null;
      ja.esperado = undefined;
      ja.adiantados.clear();
      s.nucleo.reiniciarQuadros(jog.id);
    } else {
      s.nucleo.conectar(jog.id, {
        salvo: guardado?.dados,
        perfil: {
          apelido: jog.apelido,
          aparencia: sanearAparencia(jog.aparencia) ?? {},
        },
        constroi: ehDono || s.sala.constroem,
      });
      if (guardado?.guardado !== undefined && !guardados.has(`${s.mundo.id}/${jog.id}`))
        guardados.set(`${s.mundo.id}/${jog.id}`, guardado.guardado);
      const novo: Presente = {
        id: jog.id,
        chave,
        canal,
        desligadoEm: null,
        esperado: undefined,
        adiantados: new Map(),
        ultimoSalvo: '',
      };
      s.presentes.set(jog.id, novo);
      // a chave fica registrada já na entrada (ninguém toma o lugar antes da 1ª gravação)
      if (!guardado) {
        const sala = s;
        void gravarJogador(sala, novo, true).catch((e) => log(`gravar jogador: ${String(e)}`));
      }
    }
    s.vaziaDesde = null;
    s.sala.acessadoEm = agora();
    deCanal.set(canal, { sala: s, id: jog.id });
    const edicoes = s.nucleo.estado.edicoes;
    // a tabela de donos vai no "bem-vindo": o primeiro quadro não repete (quem volta de uma
    // queda recebe de novo no quadro: a aba que ficou aberta não relê o "bem-vindo")
    if (!ja) s.nucleo.donosEnviados(jog.id);
    enviar(canal, {
      t: 'bemvindo',
      mundo: s.mundo,
      sala: estadoSala(s),
      voce: jog.id,
      instancia: s.instancia,
      guardado: guardados.get(`${s.mundo.id}/${jog.id}`),
      edicoes: edicoes.exportar(),
      donos: edicoes.donos.exportar(),
      semPovoado: [...s.nucleo.semPovoado],
      // spec 014: as obras do canteiro (o navegador gera a cidade com as feitas)
      ...(Object.keys(s.nucleo.obras()).length ? { obras: s.nucleo.obras() } : {}),
      pos: (() => {
        const t = s.nucleo.estado.jogadores.get(jog.id)!.tel;
        return { x: t.x, y: t.y, z: t.z, yaw: t.yaw, pitch: t.pitch };
      })(),
    });
    log(`${jog.apelido} entrou em ${s.sala.codigo} (${s.presentes.size})`);
  }

  function aplicar(s: SalaAtiva, pr: Presente, c: Comando): void {
    contexto(s);
    if (c.t === 'salvar' || c.t === 'pausar') return; // só o servidor local faz isto
    s.nucleo.comando(pr.id, c);
  }

  async function dono(
    s: SalaAtiva,
    pr: Presente,
    p: Extract<PedidoCliente, { t: 'dono' }>,
  ): Promise<void> {
    const id = pr.id;
    if (s.sala.dono !== id || s.sala.chaveDono !== pr.chave) return;
    if (p.acao === 'devolver') return devolver(s, pr);
    if (p.acao === 'expulsar' && p.id !== id) {
      s.expulsos.add(p.id);
      s.sala.expulsos = [...s.expulsos];
      const alvo = s.presentes.get(p.id);
      if (alvo) {
        enviar(alvo.canal, { t: 'expulso' });
        alvo.canal?.fechar();
        await despedir(s, alvo, false);
      }
    } else if (p.acao === 'trocarCodigo') {
      const antigo = s.sala.codigo;
      let novo = gerarCodigo(sorteio);
      for (let i = 0; i < 20 && (ativas.has(novo) || (await armazem.lerSala(novo))); i++)
        novo = gerarCodigo(sorteio);
      s.sala.codigo = novo;
      ativas.delete(antigo);
      ativas.set(novo, s);
      antigos.set(antigo, s);
      await armazem.gravarSala(s.sala);
      await armazem.apagarSala(antigo);
    } else if (p.acao === 'fechar') s.sala.fechado = !!p.fechado;
    else if (p.acao === 'construir') {
      s.sala.constroem = !!p.pode;
      for (const pr of s.presentes.values())
        if (pr.id !== s.sala.dono) s.nucleo.definirConstrucao(pr.id, s.sala.constroem);
    }
    await armazem.gravarSala(s.sala);
    for (const pr of s.presentes.values()) enviar(pr.canal, { t: 'sala', sala: estadoSala(s) });
  }

  /**
   * Parar de jogar com amigos (spec 011): grava, monta o mundo como ele fica no aparelho
   * (blocos, baús, criaturas e o inventário, a vida e o diário do dono), manda para o dono,
   * avisa os outros com carinho e apaga o código (ele deixa de valer).
   */
  async function devolver(s: SalaAtiva, pr: Presente): Promise<void> {
    if (s.encerrada) return;
    contexto(s);
    // ninguém mais entra por este código, nem pelos antigos, a partir de agora
    devolvidos.set(s.sala.codigo, { dono: pr.id, chave: pr.chave, dados: null as never, ate: 0 });
    for (const [c, a] of antigos) if (a === s) devolvidos.set(c, devolvidos.get(s.sala.codigo)!);
    await gravarMundo(s);
    s.encerrada = true;
    const salvo = s.nucleo.salvar();
    const dj = s.nucleo.dadosJogador(pr.id);
    const guardado = (guardados.get(`${s.mundo.id}/${pr.id}`) ?? {}) as Record<string, unknown>;
    const dados: DadosMundo = {
      versao: 1,
      edicoes: salvo.edicoes,
      jogador: dj?.pos ?? null,
      hora: salvo.hora,
      extras: {
        ...salvo.extras,
        // spec 023: no aparelho o dono volta a ser o jogador local
        ...(salvo.extras.alma
          ? { alma: trocarDonoDaAlma(salvo.extras.alma, pr.id, JOGADOR_LOCAL) }
          : {}),
        ...(dj
          ? { inventario: dj.inventario, sobrevivencia: dj.sobrevivencia, spawn: dj.spawn }
          : {}),
        ...(guardado.diario ? { diario: guardado.diario } : {}),
        ...(guardado.marcadores ? { marcadores: guardado.marcadores } : {}),
      },
    };
    // guardado uns minutos: se o dono caiu no meio, recebe quando voltar com a chave dele
    const pendente = { dono: pr.id, chave: pr.chave, dados, ate: agora() + 15 * 60_000 };
    devolvidos.set(s.sala.codigo, pendente);
    for (const [c, a] of antigos) if (a === s) devolvidos.set(c, pendente);
    enviar(pr.canal, { t: 'devolvido', dados });
    for (const outro of s.presentes.values()) {
      if (outro.id === pr.id) continue;
      enviar(outro.canal, { t: 'encerrada' });
      outro.canal?.fechar();
    }
    // o código e os antigos deixam de valer; o mundo guardado fica (some com a manutenção)
    ativas.delete(s.sala.codigo);
    for (const [c, a] of antigos) if (a === s) antigos.delete(c);
    await armazem.apagarSala(s.sala.codigo);
    log(`${s.sala.codigo}: o dono levou o mundo de volta para o aparelho`);
    s.presentes.clear();
    pr.canal?.fechar();
  }

  async function receber(canal: Canal, texto: string): Promise<void> {
    let p: PedidoCliente;
    try {
      p = JSON.parse(texto) as PedidoCliente;
    } catch {
      return;
    }
    if (!p || typeof p !== 'object') return;
    const quem = deCanal.get(canal);
    if (!quem) {
      // um "entrar" por vez em cada conexão (rajadas não criam salas nem fantasmas)
      if (p.t !== 'entrar' || entrando.has(canal)) return;
      entrando.add(canal);
      try {
        await entrar(canal, p);
      } finally {
        entrando.delete(canal);
      }
      return;
    }
    const { sala: s, id } = quem;
    const pr = s.presentes.get(id);
    if (!pr || pr.canal !== canal) return;
    if (p.t === 'dono') return dono(s, pr, p);
    if (p.t === 'entrar') return;
    if (p.t === 'guardar') {
      // diário e mapa do jogador (opaco, com limite de tamanho)
      const g = JSON.stringify(p.dados ?? null);
      if (g.length < 64_000) guardados.set(`${s.mundo.id}/${id}`, p.dados);
      return;
    }
    const c = p as Comando;
    if (c.seq === undefined) return aplicar(s, pr, c);
    if (typeof c.seq !== 'number' || !Number.isInteger(c.seq)) return;
    // em ordem de seq: cada conexão numera do 1 (o cliente renumera ao reconectar)
    if (pr.esperado === undefined) pr.esperado = 1;
    if (c.seq < pr.esperado) return;
    pr.adiantados.set(c.seq, c);
    while (pr.adiantados.has(pr.esperado)) {
      const atual = pr.adiantados.get(pr.esperado)!;
      pr.adiantados.delete(pr.esperado);
      pr.esperado++;
      aplicar(s, pr, atual);
    }
    if (pr.adiantados.size > 200) {
      // um buraco que não vai se fechar (mensagem perdida): pula para o que chegou
      pr.esperado = Math.min(...pr.adiantados.keys());
      while (pr.adiantados.has(pr.esperado)) {
        const atual = pr.adiantados.get(pr.esperado)!;
        pr.adiantados.delete(pr.esperado);
        pr.esperado++;
        aplicar(s, pr, atual);
      }
      pr.adiantados.clear();
    }
  }

  /** A conexão caiu: o jogador fica no mundo um tempo, esperando voltar. */
  function caiu(canal: Canal): void {
    entrando.delete(canal);
    const quem = deCanal.get(canal);
    deCanal.delete(canal);
    if (!quem) return;
    const pr = quem.sala.presentes.get(quem.id);
    if (pr && pr.canal === canal) {
      pr.canal = null;
      pr.desligadoEm = agora();
    }
  }

  async function gravarJogador(s: SalaAtiva, pr: Presente, forcar = false): Promise<void> {
    const d = s.nucleo.dadosJogador(pr.id);
    if (!d) return;
    const g = guardados.get(`${s.mundo.id}/${pr.id}`);
    const texto = JSON.stringify([d, g]);
    if (!forcar && texto === pr.ultimoSalvo) return;
    pr.ultimoSalvo = texto;
    const perfil = s.nucleo.estado.jogadores.get(pr.id)?.perfil ?? {
      apelido: 'Jogador',
      aparencia: {},
    };
    await armazem.gravarJogador(s.mundo.id, pr.id, {
      chave: pr.chave,
      perfil,
      dados: d,
      guardado: g,
    });
  }

  async function despedir(s: SalaAtiva, pr: Presente, porQueda: boolean): Promise<void> {
    await gravarJogador(s, pr, true);
    // voltou enquanto gravávamos: fica
    if (porQueda && pr.desligadoEm === null) return;
    if (s.presentes.get(pr.id) !== pr) return;
    if (pr.canal) {
      deCanal.delete(pr.canal);
      pr.canal.fechar();
      pr.canal = null;
    }
    contexto(s);
    const apelido = s.nucleo.estado.jogadores.get(pr.id)?.perfil.apelido ?? pr.id;
    s.nucleo.desconectar(pr.id);
    s.presentes.delete(pr.id);
    log(
      `${apelido} saiu de ${s.sala.codigo}${porQueda ? ' (não voltou em 30 s)' : ''} (${s.presentes.size})`,
    );
    if (s.presentes.size === 0) s.vaziaDesde = agora();
  }

  async function gravarMundo(s: SalaAtiva): Promise<void> {
    contexto(s);
    const salvo = s.nucleo.salvar();
    // o que muda durante a gravação fica para a próxima (a lista é tirada antes de esperar)
    const sujas = [...s.regioesSujas];
    s.regioesSujas.clear();
    try {
      // spec 016: o mundo (com a tabela de donos, que só cresce) vai antes das regiões: uma
      // queda no meio deixa a tabela com gente a mais, nunca bloco com dono que não existe
      // (que viraria do dono do mundo)
      await armazem.gravarMundo(s.mundo.id, {
        formato: FORMATO_MUNDO,
        mundo: s.mundo,
        hora: salvo.hora,
        extras: salvo.extras,
      });
      await gravarRegioes(s, sujas, salvo.edicoes);
    } catch (e) {
      for (const r of sujas) s.regioesSujas.add(r);
      throw e;
    }
    // o dono levou o mundo para o aparelho enquanto gravávamos: a sala não volta a existir
    if (s.encerrada) return;
    await armazem.gravarSala(s.sala);
    s.ultimaGravacao = agora();
  }

  async function gravarRegioes(
    s: SalaAtiva,
    sujas: string[],
    edicoes: DadosMundo['edicoes'],
  ): Promise<void> {
    // regiões que mudaram: as edições dos 64 chunks de cada uma
    for (const r of sujas) {
      const [rx, rz] = r.split(',').map(Number);
      const parte: Record<string, Array<[number, number]>> = {};
      for (let cx = rx * 8; cx < rx * 8 + 8; cx++)
        for (let cz = rz * 8; cz < rz * 8 + 8; cz++) {
          const k = `${cx},${cz}`;
          if (edicoes[k]) parte[k] = edicoes[k];
        }
      await armazem.gravarRegiao(s.mundo.id, r, parte);
    }
  }

  // ritmo: quanto tempo cada passo leva (médio e o pior do último minuto)
  let passoMedioMs = 0;
  let passoMaxMs = 0;
  let passos = 0;
  /** Um passo de todas as salas (chamado a cada 50 ms). */
  function passo(): void {
    const t0 = performance.now();
    passo2();
    const ms = performance.now() - t0;
    passoMedioMs += (ms - passoMedioMs) * 0.02;
    passoMaxMs = Math.max(passoMaxMs, ms);
    passos++;
  }
  function passo2(): void {
    for (const s of ativas.values()) {
      if (s.presentes.size === 0) continue;
      // um mundo com problema não para os outros
      try {
        contexto(s);
        s.nucleo.passo(PASSO);
        const quadros = s.nucleo.quadros();
        for (const pr of s.presentes.values()) {
          const q = quadros.get(pr.id);
          if (!q) continue;
          for (const b of q.blocos ?? [])
            s.regioesSujas.add(regiaoDe(`${Math.floor(b.x / 16)},${Math.floor(b.z / 16)}`));
          if (pr.canal) enviar(pr.canal, filtrar(s, pr.id, q));
        }
      } catch (e) {
        if (agora() - s.erroEm > 60_000) {
          s.erroEm = agora();
          log(`erro na sala ${s.sala.codigo}: ${e instanceof Error ? e.stack : String(e)}`);
        }
      }
    }
  }

  /** Cada jogador recebe as criaturas e os itens perto dele. */
  function filtrar(s: SalaAtiva, id: string, q: Quadro): Quadro {
    const j = s.nucleo.estado.jogadores.get(id);
    if (!j) return q;
    const { x, z } = j.tel;
    const perto = (o: { x: number; z: number }, r: number) =>
      Math.abs(o.x - x) < r && Math.abs(o.z - z) < r;
    return {
      ...q,
      criaturas: q.criaturas?.filter((c) => perto(c, RAIO_CRIATURAS)),
      itens: q.itens?.filter((i) => perto(i, RAIO_ITENS)),
    };
  }

  /** Tarefas lentas: quedas vencidas, gravação a cada 5 s, salas vazias dormindo. */
  async function manutencao(): Promise<void> {
    for (const [codigo, s] of [...ativas]) {
      try {
        await manter(codigo, s);
      } catch (e) {
        log(`manutenção da sala ${codigo}: ${String(e)}`);
      }
    }
    // limites vencidos e mundos devolvidos antigos saem da memória
    for (const [c, d] of devolvidos) if (agora() > d.ate) devolvidos.delete(c);
    for (const m of [erros, criacoes, previas])
      for (const [ip, e] of m) if (agora() - e.desde > JANELA) m.delete(ip);
    for (const [c, s] of antigos) if (ativas.get(s.sala.codigo) !== s) antigos.delete(c);
  }

  async function manter(codigo: string, s: SalaAtiva): Promise<void> {
    if (s.encerrada) return;
    for (const pr of [...s.presentes.values()])
      if (pr.desligadoEm !== null && agora() - pr.desligadoEm > TOLERANCIA_QUEDA)
        await despedir(s, pr, true);
    if (agora() - s.ultimaGravacao >= INTERVALO_GRAVAR) {
      await gravarMundo(s);
      for (const pr of [...s.presentes.values()]) await gravarJogador(s, pr);
    }
    if (s.presentes.size === 0 && s.vaziaDesde !== null && agora() - s.vaziaDesde > ESPERA_VAZIA) {
      await gravarMundo(s);
      // alguém entrou enquanto gravávamos: a sala continua acordada
      if (s.presentes.size > 0 || ativas.get(codigo) !== s) return;
      ativas.delete(codigo);
      log(`sala ${codigo} dormiu`);
    }
  }

  /** Antes de desligar (nova versão do servidor): grava tudo. */
  async function gravarTudo(): Promise<void> {
    for (const s of ativas.values()) {
      try {
        contexto(s);
        for (const pr of s.presentes.values()) await gravarJogador(s, pr, true);
        await gravarMundo(s);
      } catch (e) {
        log(`gravar ${s.sala.codigo}: ${String(e)}`);
      }
    }
  }

  /**
   * Prévia do mundo para a tela "Entrar no mundo de…" (spec 011): nome, tema, o dono e quem
   * está lá. Nada de id nem chave. Conta como tentativa de código (mesmo limite do entrar).
   */
  async function previa(codigoBruto: string, ip: string): Promise<PreviaMundo | 'limite' | null> {
    if (excedeu(erros, ip, TENTATIVAS) || excedeu(previas, ip, PREVIAS)) return 'limite';
    contar(erros, ip);
    contar(previas, ip);
    const codigo = normalizarCodigo(codigoBruto);
    if (!codigo || devolvidos.has(codigo)) return null;
    const ativa = ativas.get(codigo);
    const sala = ativa?.sala ?? (await armazem.lerSala(codigo));
    if (!sala) return null;
    contar(erros, ip, -1);
    const mundo = ativa?.mundo ?? (await lerMundoAtual(sala.mundoId))?.mundo;
    if (!mundo) return null;
    const apelidoDe = (id: string) => ativa?.nucleo.estado.jogadores.get(id)?.perfil.apelido;
    const dono =
      apelidoDe(sala.dono) ??
      sala.apelidoDono ??
      (await armazem.lerJogador(sala.mundoId, sala.dono))?.perfil.apelido ??
      '';
    const presentes = ativa
      ? [...ativa.presentes.values()]
          .filter((p) => p.canal)
          .map((p) => apelidoDe(p.id) ?? '')
          .filter(Boolean)
      : [];
    // "cheio" conta como o entrar: todos os presentes (inclusive quem caiu e pode voltar)
    const ocupados = ativa?.presentes.size ?? 0;
    return {
      codigo: sala.codigo,
      nome: mundo.nome,
      tema: mundo.tema,
      modo: mundo.modo,
      dono,
      presentes,
      fechado: sala.fechado,
      cheio: ocupados >= MAX_JOGADORES,
    };
  }

  return {
    receber,
    caiu,
    previa,
    passo,
    manutencao,
    gravarTudo,
    get resumo() {
      let jogadores = 0;
      for (const s of ativas.values()) jogadores += s.presentes.size;
      return {
        salas: ativas.size,
        jogadores,
        passoMs: Math.round(passoMedioMs * 100) / 100,
        passoMaxMs: Math.round(passoMaxMs * 10) / 10,
        passos,
      };
    },
    /** Zera o pior passo (a cada minuto, junto com a linha de métricas). */
    zerarPior() {
      passoMaxMs = 0;
    },
    /** Para testes. */
    ativas,
  };
}

/**
 * Spec 023: `extras.alma` com a alma de `de` passada para `para` (levar o mundo para a nuvem
 * e devolver ao aparelho). A de `para` que já existia dá lugar à de `de`.
 */
export function trocarDonoDaAlma(alma: unknown, de: string, para: string): unknown {
  if (!alma || typeof alma !== 'object' || Array.isArray(alma)) return alma;
  const a = { ...(alma as Record<string, unknown>) };
  if (!(de in a)) return a;
  a[para] = a[de];
  if (de !== para) delete a[de];
  return a;
}
