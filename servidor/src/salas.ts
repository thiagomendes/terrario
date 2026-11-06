/**
 * Salas do servidor da nuvem: cada uma é um mundo carregado na memória, rodando o mesmo
 * núcleo do jogo. Recebe quem entra pelo código, aplica os comandos em ordem, avança 20
 * vezes por segundo, manda a cada jogador o que está perto dele, grava o que mudou a
 * cada 5 s e dorme (salva e sai da memória) quando fica vazia.
 */
import { createHash, randomUUID } from 'node:crypto';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo } from '../../src/world/chunk';
import { definirRegioesSemPovoado } from '../../src/world/povoado';
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
import { regiaoDe, type Armazem, type Sala } from './armazem';

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
  }

  function estadoSala(s: SalaAtiva): EstadoSala {
    return {
      codigo: s.sala.codigo,
      fechado: s.sala.fechado,
      constroem: s.sala.constroem,
      dono: s.sala.dono,
    };
  }

  function limitado(ip: string): boolean {
    const e = erros.get(ip);
    if (!e || agora() - e.desde > 600_000) return false;
    return e.n >= TENTATIVAS;
  }
  function errou(ip: string): void {
    const e = erros.get(ip);
    if (!e || agora() - e.desde > 600_000) erros.set(ip, { n: 1, desde: agora() });
    else e.n++;
  }

  async function carregar(codigo: string): Promise<SalaAtiva | null> {
    const ja = ativas.get(codigo);
    if (ja) return ja;
    const pendente = carregando.get(codigo);
    if (pendente) return pendente;
    const p = (async () => {
      const sala = await armazem.lerSala(codigo);
      if (!sala) return null;
      const g = await armazem.lerMundo(sala.mundoId);
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

  function abrir(sala: Sala, mundo: MundoNuvem, dados: DadosMundo | undefined): SalaAtiva {
    definirEstiloMundo(mundo.estilo);
    const nucleo = criarNucleo({
      semente: mundo.semente,
      modo: mundo.modo,
      versaoMundo: mundo.versaoMundo,
      dados,
      confiarNoCliente: false,
      depuracao: op.depuracao ?? false,
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
      estilo: c.estilo,
    };
    const sala: Sala = {
      codigo,
      mundoId: mundo.id,
      dono: jog.id,
      chaveDono: resumo(jog.chave),
      fechado: false,
      constroem: true,
      criadoEm: agora(),
      acessadoEm: agora(),
    };
    // levar para a nuvem: o mundo vai inteiro; o que era do jogador fica com o dono
    const d = c.dados;
    let doDono: DadosJogador | undefined;
    if (d) {
      const { inventario, sobrevivencia, spawn, diario, marcadores, ...doMundo } = d.extras;
      d.extras = doMundo;
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
    if (doDono)
      await armazem.gravarJogador(mundo.id, jog.id, {
        chave: resumo(jog.chave),
        perfil: { apelido: jog.apelido, aparencia: jog.aparencia },
        dados: doDono,
      });
    await gravarMundo(s);
    log(`sala ${codigo} criada`);
    return s;
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
      typeof jog.chave !== 'string' ||
      jog.chave.length < 16
    )
      return recusar('identidade');
    if (limitado(canal.ip)) return recusar('limite');
    let s: SalaAtiva | null;
    if (p.criar) s = await criar(canal, jog, p.criar);
    else {
      const codigo = normalizarCodigo(String(p.codigo ?? ''));
      s = codigo ? await carregar(codigo) : null;
      if (!s) {
        errou(canal.ip);
        return recusar('codigo');
      }
    }
    const ehDono = s.sala.dono === jog.id && s.sala.chaveDono === resumo(jog.chave);
    if (s.expulsos.has(jog.id)) return recusar('expulso');
    if (s.sala.fechado && !ehDono) return recusar('fechado');
    const ja = s.presentes.get(jog.id);
    if (!ja && s.presentes.size >= MAX_JOGADORES) return recusar('cheio');
    // ninguém entra no lugar de outro
    const guardado = await armazem.lerJogador(s.mundo.id, jog.id);
    if (guardado && guardado.chave !== resumo(jog.chave)) return recusar('identidade');
    contexto(s);
    if (ja) {
      // voltou da queda: o mesmo jogador, no mesmo lugar
      if (ja.canal && ja.canal !== canal) ja.canal.fechar();
      ja.canal = canal;
      ja.desligadoEm = null;
      ja.esperado = undefined;
      ja.adiantados.clear();
      s.nucleo.reiniciarQuadros(jog.id);
    } else {
      s.nucleo.conectar(jog.id, {
        salvo: guardado?.dados,
        perfil: {
          apelido: String(jog.apelido ?? 'Jogador').slice(0, 20),
          aparencia: jog.aparencia ?? {},
        },
        constroi: ehDono || s.sala.constroem,
      });
      if (guardado?.guardado !== undefined && !guardados.has(`${s.mundo.id}/${jog.id}`))
        guardados.set(`${s.mundo.id}/${jog.id}`, guardado.guardado);
      s.presentes.set(jog.id, {
        id: jog.id,
        chave: resumo(jog.chave),
        canal,
        desligadoEm: null,
        esperado: undefined,
        adiantados: new Map(),
        ultimoSalvo: '',
      });
    }
    s.vaziaDesde = null;
    s.sala.acessadoEm = agora();
    deCanal.set(canal, { sala: s, id: jog.id });
    enviar(canal, {
      t: 'bemvindo',
      mundo: s.mundo,
      sala: estadoSala(s),
      voce: jog.id,
      guardado: guardados.get(`${s.mundo.id}/${jog.id}`),
      edicoes: s.nucleo.estado.edicoes.exportar(),
      semPovoado: [...s.nucleo.semPovoado],
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
    id: string,
    p: Extract<PedidoCliente, { t: 'dono' }>,
  ): Promise<void> {
    if (s.sala.dono !== id) return;
    if (p.acao === 'expulsar' && p.id !== id) {
      s.expulsos.add(p.id);
      s.sala.expulsos = [...s.expulsos];
      const alvo = s.presentes.get(p.id);
      if (alvo) {
        enviar(alvo.canal, { t: 'expulso' });
        alvo.canal?.fechar();
        await despedir(s, alvo);
      }
    } else if (p.acao === 'trocarCodigo') {
      const antigo = s.sala.codigo;
      let novo = gerarCodigo(sorteio);
      for (let i = 0; i < 20 && (ativas.has(novo) || (await armazem.lerSala(novo))); i++)
        novo = gerarCodigo(sorteio);
      s.sala.codigo = novo;
      ativas.delete(antigo);
      ativas.set(novo, s);
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

  async function receber(canal: Canal, texto: string): Promise<void> {
    let p: PedidoCliente;
    try {
      p = JSON.parse(texto) as PedidoCliente;
    } catch {
      return;
    }
    const quem = deCanal.get(canal);
    if (!quem) {
      if (p.t === 'entrar') await entrar(canal, p);
      return;
    }
    const { sala: s, id } = quem;
    const pr = s.presentes.get(id);
    if (!pr || pr.canal !== canal) return;
    if (p.t === 'dono') return dono(s, id, p);
    if (p.t === 'entrar') return;
    if (p.t === 'guardar') {
      // diário e mapa do jogador (opaco, com limite de tamanho)
      const g = JSON.stringify(p.dados ?? null);
      if (g.length < 64_000) guardados.set(`${s.mundo.id}/${id}`, p.dados);
      return;
    }
    const c = p as Comando;
    if (c.seq === undefined) return aplicar(s, pr, c);
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
    if (pr.adiantados.size > 200) pr.adiantados.clear();
  }

  /** A conexão caiu: o jogador fica no mundo um tempo, esperando voltar. */
  function caiu(canal: Canal): void {
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

  async function despedir(s: SalaAtiva, pr: Presente): Promise<void> {
    contexto(s);
    await gravarJogador(s, pr, true);
    s.nucleo.desconectar(pr.id);
    s.presentes.delete(pr.id);
    if (s.presentes.size === 0) s.vaziaDesde = agora();
  }

  async function gravarMundo(s: SalaAtiva): Promise<void> {
    const salvo = s.nucleo.salvar();
    // regiões que mudaram: as edições dos 64 chunks de cada uma
    for (const r of s.regioesSujas) {
      const [rx, rz] = r.split(',').map(Number);
      const parte: Record<string, Array<[number, number]>> = {};
      for (let cx = rx * 8; cx < rx * 8 + 8; cx++)
        for (let cz = rz * 8; cz < rz * 8 + 8; cz++) {
          const k = `${cx},${cz}`;
          if (salvo.edicoes[k]) parte[k] = salvo.edicoes[k];
        }
      await armazem.gravarRegiao(s.mundo.id, r, parte);
    }
    s.regioesSujas.clear();
    await armazem.gravarMundo(s.mundo.id, {
      mundo: s.mundo,
      hora: salvo.hora,
      extras: salvo.extras,
    });
    await armazem.gravarSala(s.sala);
    s.ultimaGravacao = agora();
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
      for (const pr of [...s.presentes.values()])
        if (pr.desligadoEm !== null && agora() - pr.desligadoEm > TOLERANCIA_QUEDA)
          await despedir(s, pr);
      if (agora() - s.ultimaGravacao >= INTERVALO_GRAVAR) {
        await gravarMundo(s);
        for (const pr of s.presentes.values()) await gravarJogador(s, pr);
      }
      if (
        s.presentes.size === 0 &&
        s.vaziaDesde !== null &&
        agora() - s.vaziaDesde > ESPERA_VAZIA
      ) {
        await gravarMundo(s);
        ativas.delete(codigo);
        log(`sala ${codigo} dormiu`);
      }
    }
  }

  /** Antes de desligar (nova versão do servidor): grava tudo. */
  async function gravarTudo(): Promise<void> {
    for (const s of ativas.values()) {
      contexto(s);
      for (const pr of s.presentes.values()) await gravarJogador(s, pr, true);
      await gravarMundo(s);
    }
  }

  return {
    receber,
    caiu,
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
