/**
 * Núcleo: o mundo e as regras do Terrário, sem tela, som nem DOM.
 *
 * Guarda blocos e edições, baús e fornalhas, itens no chão, criaturas e moradores,
 * o inventário e a sobrevivência de cada jogador, o dia, o clima e as estações. Recebe
 * comandos dos clientes, avança em passos fixos (PASSO) e devolve a cada jogador um
 * quadro com o que mudou. Roda no Web Worker do servidor local (spec 009) e no Node do
 * servidor da nuvem (spec 010) com o mesmo código.
 */
import { registrarCatalogo } from '../jogo/catalogo';
import { sanearDadosMundo } from './saneamento';
import { blocoDe, criarEdicoes, empacotar } from '../world/edicoes';
import { Bloco, ehAlvo, luzDoBloco, obterBloco } from '../world/blocks';
import { ALCANCE_REGRAS, alcancaDosOlhos } from '../jogo/alcance';
import { criarCacheGeracional } from './mundo';
import {
  TAM_X,
  ALTURA,
  TAM_Z,
  alturaTerreno,
  encontrarNascimento,
  estiloMundo,
  olharDoNascimento,
  pontoDeNascer,
} from '../world/chunk';
import { AVISO_LIMITE, comeEsse, viraCriado } from '../jogo/criacao';
import { definirRegioesSemPovoado, regiaoDoChunk } from '../world/povoado';
import { abreEFecha, alternado, ehPorta } from '../world/portas';
import { criarConteineres, TAMANHO_BAU } from '../jogo/conteineres';
import { criarMundoDeItens, dropsDoBloco } from '../jogo/drops';
import { criarPopulacao } from '../jogo/populacao';
import {
  ATRASO_RESPOSTA,
  INTERVALO_GESTO_NUCLEO,
  MORADORES_QUE_RESPONDEM,
  RAIO_RESPOSTA_MORADOR,
  RAIO_VER_GESTO,
  moradorResponde,
  type IdGesto,
} from '../personagem/gestos';
import type { EventoCriatura } from '../jogo/criaturas';
import { criarClima, estacaoDoDia, type EstadoClima } from '../jogo/clima';
import { criarSobrevivencia, type Sobrevivencia } from '../jogo/sobrevivencia';
import { criarInventario, type Inventario, type Slot } from '../jogo/inventario';
import { blocoDoItem, obterItem } from '../jogo/itens';
import { podeColetar } from '../jogo/ferramentas';
import { TROCAS, fazerTroca } from '../jogo/trocas';
import {
  CHANCE_SEMENTE_GRAMA,
  SEGUNDOS_POR_ESTAGIO,
  colheita,
  ehEnxada,
  ehLavoura,
  lavouraDoBloco,
  madura,
  podeArar,
  podePlantar,
  proximoEstagio,
  substituivel,
  velocidadeCrescimento,
} from '../jogo/plantio';
import type { DadosMundo, ModoJogo } from '../jogo/mundos';
import { DURACAO_DIA, HORA_INICIAL, noiteNaHora, normalizarHora } from '../jogo/tempo';
import { criarGerador } from '../audio/variacao';
import { colocacaoBloqueada } from '../player/alvo';
import { preencherKit, SLOTS, KIT_EXTRA } from '../player/hotbar';
import { criarAcessoMundo } from './mundo';
import { contaFecha } from './conta';
import { sanear } from './saneamento';
import {
  PASSO,
  type Ambiente,
  type BlocoMudado,
  type Comando,
  type ConteinerVisto,
  type DadosJogador,
  type JogadorVisto,
  type PerfilJogador,
  type CriaturaVista,
  type Depuracao,
  type EventoNucleo,
  type ItemVisto,
  type MudancaSlot,
  type Quadro,
  type SalvoNucleo,
  type Telemetria,
} from './protocolo';

/** Distância máxima para bater, domar e trocar com uma criatura. */
const ALCANCE_CRIATURA = 7;
/** Pés da lavoura que crescem num passo, no máximo (o custo do passo tem teto). */
const ORCAMENTO_LAVOURA = 1024;
/**
 * Segundos que a luz de tocha guardada da lavoura vale. Pôr ou tirar fonte de luz perto já
 * a esquece na hora; isto é só para conferir de vez em quando.
 */
const LUZ_LAVOURA_VALE = 60;
/** Células de luz da lavoura calculadas num passo, no máximo (cada uma lê 2025 blocos). */
const ORCAMENTO_LUZ = 32;
/** Pé da lavoura que ainda cresce: progresso no estágio e quando cresceu por último. */
interface PeLavoura {
  x: number;
  y: number;
  z: number;
  p: number;
  t: number;
}
/** De quanto em quanto tempo cada pé da lavoura cresce (segundos). */
const INTERVALO_LAVOURA = 1;
/** Segundos mínimos entre duas comidas dadas ao mesmo bicho já criado. */
const INTERVALO_COMIDA = 1;
/** Quem está até aqui da planta vê o brilhinho e ouve o som quando ela amadurece. */
const ALCANCE_MADURA = 24;
/** Espera entre deitar na cama e acordar (o véu escurece a tela). */
const ESPERA_SONO = 1.5;
/** Quanto tempo quem deitou espera os outros deitarem. */
const ESPERA_TODOS = 10;

export interface OpcoesNucleo {
  semente: number;
  modo: ModoJogo;
  /** Versão do mundo salvo (mundos de antes dos povoados têm 1). */
  versaoMundo?: number;
  dados?: DadosMundo;
  /**
   * Servidor local, um jogador só: aceita do cliente o que ele diz do próprio inventário.
   * O servidor da nuvem desliga isto e confere a conta dos itens em cada transação.
   */
  confiarNoCliente?: boolean;
  /** Aceita os atalhos de teste (`depurar`). Padrão: só quando confia no cliente. */
  depuracao?: boolean;
  /**
   * Spec 013: a criatura da noite deste mundo. Padrão: a do estilo do mundo definido antes de
   * criar o núcleo (o servidor só conhece o estilo; cada sala guarda a sua aqui).
   */
  noite?: 'assusta' | 'mansa';
}

/**
 * Item jogado no chão de propósito: sai para a frente (blocos por segundo). Cai a uns 3
 * blocos, fora do raio que puxa os itens: quem jogou não puxa de volta parado no lugar.
 */
const VELOCIDADE_ARREMESSO = 4.5;

export interface OpcoesConexao {
  /** O que o jogador tinha neste mundo (inventário, vida, renascer, posição). */
  salvo?: DadosJogador;
  perfil?: PerfilJogador;
  /** Pode construir (visitantes só passeiam, se o dono quiser). */
  constroi?: boolean;
}

interface Jogador {
  id: string;
  tel: Telemetria;
  inventario: Inventario;
  sobrevivencia: Sobrevivencia;
  spawn: { x: number; z: number };
  /** Itens nas mãos durante a tela de inventário (cursor e grade de criação). */
  transito: Slot[];
  conteiner: { tipo: 'bau' | 'fornalha'; abertura: number; x: number; y: number; z: number } | null;
  ack: number;
  ackTransacao: number;
  inventarioSujo: boolean;
  /** Uma transação foi recusada: o cursor e a grade voltam junto com o inventário. */
  transitoSujo: boolean;
  /** O primeiro quadro já foi (a sequência do cliente começa nele). */
  iniciado: boolean;
  conteinerSujo: boolean;
  ultimaSobrevivencia: string;
  eventos: EventoNucleo[];
  correcoes: BlocoMudado[];
  /** Acorda quando chega a zero (dormindo). */
  sono: number;
  /** Deitado esperando os outros deitarem (segundos que ainda vale). */
  querDormir: number;
  perfil: PerfilJogador;
  constroi: boolean;
  /** Golpes, colocações e comidas desde que entrou (os amigos veem o movimento). */
  acoes: [number, number, number];
  /** Passo da última telemetria aceita (para conferir se a posição nova é possível). */
  passoTelemetria: number;
  /** O núcleo mandou o jogador para longe (renascer): a próxima posição pode saltar. */
  saltoPermitido: boolean;
  /** Spec 015: passo do último gesto aceito (limite de repetição). */
  passoGesto: number;
  /** Para as criaturas (o mesmo objeto a cada passo: os ataques dizem em quem foi). */
  corpo: {
    x: number;
    y: number;
    z: number;
    vivo: boolean;
    criativo: boolean;
    /** O que está na mão, do inventário do núcleo (os bichos seguem a comida). */
    mao: string | null;
  };
}

export type Nucleo = ReturnType<typeof criarNucleo>;

export function criarNucleo(op: OpcoesNucleo) {
  registrarCatalogo();
  const { semente, modo } = op;
  // o salvamento pode vir de qualquer aparelho: o que tem posição fora do mundo sai
  const dados = op.dados ? sanearDadosMundo(op.dados) : undefined;
  const extras = dados?.extras ?? {};
  const confiar = op.confiarNoCliente ?? false;
  const depuracao = op.depuracao ?? confiar;

  const edicoes = criarEdicoes();
  if (dados) edicoes.importar(dados.edicoes);

  // mundo de antes dos povoados: na primeira carga depois deles, congela a lista de
  // regiões sem povoado (as editadas e as em volta de onde o jogador está) e salva
  // com o mundo; nas cargas seguintes vale a lista salva, então nada some nem aparece
  const salvoPovoados = extras['povoados'] as { semPovoado?: string[] } | undefined;
  const semPovoado: string[] = salvoPovoados?.semPovoado
    ? [...salvoPovoados.semPovoado]
    : (op.versaoMundo ?? 1) < 2 && dados
      ? (() => {
          const r = new Set<string>();
          for (const k of Object.keys(dados.edicoes)) {
            const [cx, cz] = k.split(',').map(Number);
            r.add(regiaoDoChunk(cx, cz));
          }
          const j = dados.jogador;
          const pontos = j ? [[j.x, j.z]] : [];
          const n = encontrarNascimento(semente);
          pontos.push([n.x, n.z]);
          for (const [x, z] of pontos) {
            const rx = Math.floor(x / 128);
            const rz = Math.floor(z / 128);
            for (let dx = -1; dx <= 1; dx++)
              for (let dz = -1; dz <= 1; dz++) r.add(`${rx + dx},${rz + dz}`);
          }
          return [...r];
        })()
      : [];
  definirRegioesSemPovoado(semPovoado);

  // criaturas só nascem e pisam onde algum jogador tem o terreno carregado (como antes)
  const mundo = criarAcessoMundo(semente, edicoes, (cx, cz) => {
    for (const o of jogadores.values()) {
      const r = o.tel.raio ?? 3;
      if (
        Math.abs(cx - Math.floor(o.tel.x / 16)) <= r &&
        Math.abs(cz - Math.floor(o.tel.z / 16)) <= r
      )
        return true;
    }
    return false;
  });
  const conteineres = criarConteineres(extras['conteineres'], semente);
  const rngDrops = criarGerador(911);
  // sorteios do plantio (colheita, semente da grama alta): gerador próprio, para não mexer
  // na sequência dos drops de sempre (a paridade gravada)
  const rngPlantio = criarGerador(semente + 1313);
  const mundoItens = criarMundoDeItens((x, y, z) => {
    const b = mundo.bloco(x, y, z);
    return b !== Bloco.AR && !!obterBloco(b)?.solido;
  });
  mundoItens.carregar(extras['itensSoltos']);
  const noiteDoMundo = op.noite ?? estiloMundo().noite ?? 'assusta';
  const populacao = criarPopulacao(criarGerador(semente + 55), extras['criaturas'], {
    noite: noiteDoMundo,
  });
  // sorteios da criação (onde o ovo cai): gerador próprio, longe dos de sempre
  const rngCriacao = criarGerador(semente + 1717);
  const clima = criarClima(criarGerador(semente + 31), extras['clima']);
  let dia = Number(extras['dia']) || 0;
  let hora = dados && dados.hora >= 0 ? dados.hora : HORA_INICIAL;
  let horaAnterior = hora;
  let pausado = false;
  let n = 0;

  /** Blocos que mudaram desde o último quadro (para todos). */
  let blocosMudados: BlocoMudado[] = [];
  /** Eventos para todos (relâmpago, sons de criaturas). */
  let eventosGerais: EventoNucleo[] = [];
  const jogadores = new Map<string, Jogador>();

  /**
   * Lavoura que ainda cresce: célula → progresso no estágio atual (segundos na velocidade 1).
   * Sai das edições ao abrir o mundo; o progresso vem de `extras.lavoura` (faltando, 0).
   */
  const lavoura = new Map<string, PeLavoura>();
  /** Relógio da lavoura (segundos): cada pé guarda quando cresceu por último. */
  let relogioLavoura = 0;
  /** Onde parou a volta pela lavoura (cada passo cresce uma parte dela). */
  let cursorLavoura: Iterator<[string, PeLavoura]> | null = null;
  /**
   * Luz de cada célula 2x2x2 da lavoura (só da lavoura; as criaturas têm a delas). Só muda
   * quando entra ou sai uma fonte de luz perto, e aí a célula é esquecida na hora.
   */
  const luzLavoura = criarCacheGeracional<{ v: number; t: number }>(16384);
  /** Células de luz calculadas neste passo (têm teto, como os pés). */
  let luzesNoPasso = 0;
  {
    const salvo = extras['lavoura'];
    const progresso =
      salvo && typeof salvo === 'object' && !Array.isArray(salvo)
        ? (salvo as Record<string, unknown>)
        : {};
    const exportadas = edicoes.exportar();
    for (const k of Object.keys(exportadas)) {
      const [cx, cz] = k.split(',').map(Number);
      for (const [i, v] of exportadas[k]) {
        const b = blocoDe(v);
        if (!ehLavoura(b) || madura(b)) continue;
        const x = cx * TAM_X + (i % TAM_X);
        const z = cz * TAM_Z + (Math.floor(i / TAM_X) % TAM_Z);
        const y = Math.floor(i / (TAM_X * TAM_Z));
        const chave = `${x},${y},${z}`;
        const p = Number(progresso[chave]);
        lavoura.set(chave, {
          x,
          y,
          z,
          t: 0,
          p: Number.isFinite(p) && p > 0 ? Math.min(p, SEGUNDOS_POR_ESTAGIO) : 0,
        });
      }
    }
  }

  // jogador do mundo salvo (o servidor local tem um só)
  // quem chega pela primeira vez nunca nasce em cima de uma árvore
  const nascimento = pontoDeNascer(semente);
  const posSalva = dados?.jogador;
  const spawnSalvo = extras['spawn'] as { x: number; z: number } | undefined;

  /**
   * Mundo novo começa com a barra vazia, nos dois modos (pedido do dono): o jogador escolhe o
   * que pôr em cada espaço — no criativo pelo catálogo do inventário, na sobrevivência com o
   * que for coletando.
   */
  function novoInventario(salvo: unknown): Inventario {
    const inv = criarInventario();
    if (salvo) inv.carregar(salvo);
    return inv;
  }
  let perfisSujos = false;

  /**
   * Põe um jogador no mundo. Sem opções (servidor local): o jogador do mundo salvo.
   * Com opções (nuvem): os dados dele neste mundo, ou um jogador novo no nascimento.
   */
  function conectar(id: string, oc?: OpcoesConexao): void {
    if (jogadores.has(id)) return;
    const legado = !oc;
    const pos = legado ? posSalva : oc.salvo?.pos;
    // o nascimento já é o centro de um bloco
    const x = pos?.x ?? nascimento.x;
    const z = pos?.z ?? nascimento.z;
    // quem chega pela primeira vez fica em cima do terreno do nascimento
    const y0 = pos?.y ?? alturaTerreno(Math.floor(x), Math.floor(z), semente) + 1;
    const j: Jogador = {
      id,
      tel: {
        x,
        y: y0,
        z,
        // mundo de sítio: quem chega pela primeira vez olha para o sítio mais perto
        yaw: pos?.yaw ?? olharDoNascimento(semente) ?? 0,
        pitch: pos?.pitch ?? 0,
        olhos: y0 + 1.62,
        noChao: false,
        voando: false,
        vel: 0,
        correndo: false,
        submerso: false,
        quedas: [],
        pulos: 0,
        golpes: 0,
        slot: 0,
      },
      inventario: novoInventario(legado ? extras['inventario'] : oc.salvo?.inventario),
      sobrevivencia: criarSobrevivencia(legado ? extras['sobrevivencia'] : oc.salvo?.sobrevivencia),
      spawn: (legado ? spawnSalvo : oc.salvo?.spawn) ?? { x, z },
      transito: Array.from({ length: 10 }, () => null),
      conteiner: null,
      ack: 0,
      ackTransacao: 0,
      inventarioSujo: true,
      transitoSujo: false,
      iniciado: false,
      conteinerSujo: false,
      ultimaSobrevivencia: '',
      eventos: [],
      correcoes: [],
      sono: 0,
      querDormir: 0,
      acoes: [0, 0, 0],
      passoTelemetria: n,
      saltoPermitido: true,
      passoGesto: -Infinity,
      perfil: oc?.perfil ?? { apelido: 'Jogador', aparencia: {} },
      constroi: oc?.constroi ?? true,
      corpo: { x, y: y0, z, vivo: true, criativo: modo === 'criativo', mao: null },
    };
    j.inventario.ouvir(() => {
      j.inventarioSujo = true;
    });
    j.sobrevivencia.ouvir((ev) => {
      if (ev.tipo === 'dano') j.eventos.push({ e: 'dano', causa: ev.causa, qtd: ev.qtd });
      else if (ev.tipo === 'morte') {
        // espalha o inventário no lugar da morte
        for (let i = 0; i < j.inventario.slots.length; i++) {
          const p = j.inventario.obter(i);
          if (!p) continue;
          mundoItens.soltar(p.item, p.qtd, j.tel.x, j.tel.y + 1, j.tel.z, rngDrops, p.dur);
          j.inventario.definir(i, null);
        }
        j.eventos.push({ e: 'morte', causa: ev.causa });
      }
    });
    for (const o of jogadores.values())
      o.eventos.push({ e: 'entrou', id, apelido: j.perfil.apelido });
    jogadores.set(id, j);
    perfisSujos = true;
  }

  /** O que é do jogador neste mundo (o que estava nas mãos volta à mochila). */
  function dadosJogador(id: string): DadosJogador | null {
    const j = jogadores.get(id);
    if (!j) return null;
    const inv = criarInventario();
    inv.carregar(j.inventario.salvar());
    for (const p of j.transito) if (p) inv.adicionar(p.item, p.qtd, p.dur);
    return {
      inventario: inv.salvar(),
      sobrevivencia: { ...j.sobrevivencia.estado },
      spawn: { ...j.spawn },
      pos: { x: j.tel.x, y: j.tel.y, z: j.tel.z, yaw: j.tel.yaw, pitch: j.tel.pitch },
    };
  }

  /** Tira o jogador do mundo e devolve os dados dele para salvar. */
  function desconectar(id: string): DadosJogador | null {
    const d = dadosJogador(id);
    const j = jogadores.get(id);
    if (!j) return d;
    jogadores.delete(id);
    perfisSujos = true;
    for (const o of jogadores.values())
      o.eventos.push({ e: 'saiu', id, apelido: j.perfil.apelido });
    return d;
  }

  function editar(x: number, y: number, z: number, bloco: number, meta = 0): boolean {
    const antes = mundo.bloco(x, y, z);
    if (!edicoes.definir(x, y, z, bloco, meta)) return false;
    if (luzDoBloco(antes) > 0 || luzDoBloco(bloco) > 0) esquecerLuzPerto(x, y, z);
    blocosMudados.push({ x, y, z, v: empacotar(bloco, meta) });
    // a lavoura que cresce: entra ao ser plantada, sai quando amadurece ou some
    const k = `${x},${y},${z}`;
    if (ehLavoura(bloco) && !madura(bloco)) {
      if (!lavoura.has(k)) lavoura.set(k, { x, y, z, p: 0, t: relogioLavoura });
    } else lavoura.delete(k);
    // planta não flutua: sem a terra arada embaixo, a lavoura sai e devolve o que é dela
    if (bloco !== Bloco.TERRA_ARADA) {
      const cima = mundo.bloco(x, y + 1, z);
      if (ehLavoura(cima)) {
        editar(x, y + 1, z, Bloco.AR);
        if (modo === 'sobrevivencia') soltarColheita(cima, x, y + 1, z);
      }
    }
    return true;
  }

  function soltarColheita(b: number, x: number, y: number, z: number): void {
    for (const d of colheita(b, rngPlantio))
      mundoItens.soltar(d.item, d.qtd, x + 0.5, y + 0.4, z + 0.5, rngPlantio);
  }

  function corrigir(j: Jogador, x: number, y: number, z: number): void {
    j.correcoes.push({ x, y, z, v: empacotar(mundo.bloco(x, y, z), edicoes.obterMeta(x, y, z)) });
  }

  function perto(j: Jogador, x: number, y: number, z: number, raio: number): boolean {
    return alcancaDosOlhos({ x: j.tel.x, y: j.tel.olhos, z: j.tel.z }, x, y, z, raio);
  }

  function recusar(
    j: Jogador,
    comando: number,
    motivo: string,
    celulas: { x: number; y: number; z: number }[],
  ): void {
    j.eventos.push({ e: 'recusa', comando, motivo });
    for (const c of celulas) corrigir(j, c.x, c.y, c.z);
  }

  const ferramentaDe = (p: Slot) => (p ? obterItem(p.item)?.ferramenta : undefined);

  function quebrar(j: Jogador, c: Extract<Comando, { t: 'quebrar' }>): void {
    const { x, y, z } = c;
    const b = mundo.bloco(x, y, z);
    if (
      !ehAlvo(b) ||
      !j.constroi ||
      !perto(j, x, y, z, ALCANCE_REGRAS) ||
      j.sobrevivencia.estado.morto
    ) {
      recusar(j, c.id, 'quebrar', [c, { x, y: y - 1, z }, { x, y: y + 1, z }]);
      return;
    }
    // baú do mundo (ruína, celeiro) ainda no lugar em que nasceu: nunca foi trocado, então o
    // tesouro dele ainda vale. Quebrado uma vez, a célula ganha edição; o baú posto de novo
    // ali é um baú comum (vazio), senão quebrar e recolocar dava o tesouro outra vez.
    const intocado = edicoes.obter(x, y, z) === undefined;
    editar(x, y, z, Bloco.AR);
    // quebrar meia porta leva a outra metade
    if (b === Bloco.PORTA || b === Bloco.PORTA_ABERTA) {
      for (const dy of [-1, 1]) {
        const v = mundo.bloco(x, y + dy, z);
        if (v === Bloco.PORTA || v === Bloco.PORTA_ABERTA) editar(x, y + dy, z, Bloco.AR);
      }
    }
    // sobrevivência: a ferramenta gasta e o bloco vira item no chão
    if (modo === 'sobrevivencia') {
      const p = j.inventario.obter(c.slot);
      const ferramenta = ferramentaDe(p);
      if (ferramenta && p && p.dur !== undefined && (obterBloco(b)?.dureza ?? 0) > 0) {
        const dur = p.dur - 1;
        if (dur <= 0) {
          j.inventario.definir(c.slot, null);
          j.eventos.push({ e: 'ferramentaQuebrou', item: p.item });
        } else j.inventario.definir(c.slot, { ...p, dur });
      }
      for (const drop of dropsDoBloco(b, rngDrops, podeColetar(b, ferramenta))) {
        mundoItens.soltar(drop.item, drop.qtd, x + 0.5, y + 0.4, z + 0.5, rngDrops);
      }
      // colher: madura dá o produto e sementes; verde devolve a semente
      if (ehLavoura(b)) soltarColheita(b, x, y, z);
      // a grama alta às vezes tem uma semente de trigo (sorteio à parte dos drops)
      if (b === Bloco.GRAMA_ALTA && rngPlantio() < CHANCE_SEMENTE_GRAMA)
        mundoItens.soltar('semente_trigo', 1, x + 0.5, y + 0.4, z + 0.5, rngPlantio);
    }
    // quebrar baú ou fornalha espalha o conteúdo (o de ruína nunca aberto também)
    if (b === Bloco.BAU || b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) {
      const gerado = b === Bloco.BAU && intocado && mundo.gerado(x, y, z) === Bloco.BAU;
      for (const p of conteineres.remover(x, y, z, gerado)) {
        if (p) mundoItens.soltar(p.item, p.qtd, x + 0.5, y + 0.5, z + 0.5, rngDrops, p.dur);
      }
      for (const o of jogadores.values())
        if (o.conteiner && o.conteiner.x === x && o.conteiner.y === y && o.conteiner.z === z) {
          o.conteiner = null;
          o.conteinerSujo = true;
        }
    }
    for (const o of jogadores.values()) {
      o.eventos.push({ e: 'quebra', x, y, z, bloco: b, meu: o === j });
      if (ehLavoura(b))
        o.eventos.push({ e: 'colheu', x, y, z, bloco: b, madura: madura(b), meu: o === j });
    }
  }

  /** Enxada na grama ou na terra: vira terra arada (planta baixa em cima sai junto). */
  function arar(j: Jogador, c: Extract<Comando, { t: 'arar' }>): void {
    const { x, y, z } = c;
    const p = j.inventario.obter(c.slot);
    const acima = mundo.bloco(x, y + 1, z);
    if (
      !ehEnxada(ferramentaDe(p)) ||
      !j.constroi ||
      !perto(j, x, y, z, ALCANCE_REGRAS) ||
      j.sobrevivencia.estado.morto ||
      !podeArar(mundo.bloco(x, y, z), acima)
    ) {
      recusar(j, c.id, 'arar', [c, { x, y: y + 1, z }]);
      return;
    }
    editar(x, y, z, Bloco.TERRA_ARADA);
    if (acima !== Bloco.AR) {
      editar(x, y + 1, z, Bloco.AR);
      // a flor ou a grama alta que sai solta o que soltaria quebrada (sorteios do plantio,
      // para não mexer na sequência dos drops de sempre)
      if (modo === 'sobrevivencia') {
        for (const d of dropsDoBloco(acima, rngPlantio, true))
          mundoItens.soltar(d.item, d.qtd, x + 0.5, y + 1.4, z + 0.5, rngPlantio);
        if (acima === Bloco.GRAMA_ALTA && rngPlantio() < CHANCE_SEMENTE_GRAMA)
          mundoItens.soltar('semente_trigo', 1, x + 0.5, y + 1.4, z + 0.5, rngPlantio);
      }
    }
    if (modo === 'sobrevivencia' && p && p.dur !== undefined) {
      const dur = p.dur - 1;
      if (dur <= 0) {
        j.inventario.definir(c.slot, null);
        j.eventos.push({ e: 'ferramentaQuebrou', item: p.item });
      } else j.inventario.definir(c.slot, { ...p, dur });
    }
    j.acoes[0]++;
    for (const o of jogadores.values()) o.eventos.push({ e: 'arou', x, y, z, meu: o === j });
  }

  const celulaLuz = (x: number, y: number, z: number) => `${x & ~1},${y & ~1},${z & ~1}`;
  /** A luz guardada do pé, se ainda vale. */
  function luzGuardada(c: PeLavoura): number | undefined {
    const g = luzLavoura.obter(celulaLuz(c.x, c.y, c.z));
    return g && relogioLavoura - g.t < LUZ_LAVOURA_VALE ? g.v : undefined;
  }
  /** Luz de fontes perto do pé (guardada; uma tocha nova vale na hora). */
  function luzDoPe(c: PeLavoura): number {
    const g = luzGuardada(c);
    if (g !== undefined) return g;
    const v = mundo.luzDaCelula(c.x, c.y, c.z);
    luzesNoPasso++;
    luzLavoura.guardar(celulaLuz(c.x, c.y, c.z), { v, t: relogioLavoura });
    return v;
  }
  /** Uma fonte de luz entrou ou saiu: esquece a luz das células que ela alcança. */
  function esquecerLuzPerto(x: number, y: number, z: number): void {
    if (luzLavoura.tamanho === 0) return;
    for (let dy = -6; dy <= 6; dy += 2)
      for (let dz = -8; dz <= 8; dz += 2)
        for (let dx = -8; dx <= 8; dx += 2) luzLavoura.apagar(celulaLuz(x + dx, y + dy, z + dz));
  }

  /** Um pé cresce `segundos` (sem sorteio): estágio novo quando o progresso enche. */
  function crescerPe(
    k: string,
    c: PeLavoura,
    segundos: number,
    noite: number,
    chuva: boolean,
  ): void {
    let b = mundo.bloco(c.x, c.y, c.z);
    if (proximoEstagio(b) === null) {
      lavoura.delete(k);
      return;
    }
    const v = velocidadeCrescimento({
      noite,
      chuva,
      ceuAberto: mundo.criaturas.ceuAberto(c.x, c.y, c.z),
      luz: () => luzDoPe(c),
    });
    c.p += v * segundos;
    let prox = proximoEstagio(b);
    let mudou = false;
    while (prox !== null && c.p >= SEGUNDOS_POR_ESTAGIO) {
      c.p -= SEGUNDOS_POR_ESTAGIO;
      b = prox;
      prox = proximoEstagio(b);
      mudou = true;
    }
    if (!mudou) return;
    const resto = c.p;
    editar(c.x, c.y, c.z, b, edicoes.obterMeta(c.x, c.y, c.z));
    const ainda = lavoura.get(k);
    if (ainda) ainda.p = resto;
    if (madura(b))
      for (const o of jogadores.values())
        if (Math.hypot(c.x + 0.5 - o.tel.x, c.z + 0.5 - o.tel.z) <= ALCANCE_MADURA)
          o.eventos.push({ e: 'amadureceu', x: c.x, y: c.y, z: c.z, bloco: b });
  }

  function chuvaNoMundo(): boolean {
    return clima.estado.tipo === 'chuva' || clima.estado.tipo === 'tempestade';
  }

  /** A lavoura inteira cresce `segundos` de uma vez (depuração: testes e capturas). */
  function crescer(segundos: number): void {
    if (lavoura.size === 0) return;
    const noite = noiteNaHora(hora);
    const chuva = chuvaNoMundo();
    for (const [k, c] of lavoura) crescerPe(k, c, segundos, noite, chuva);
  }

  /**
   * A cada passo, uma parte da lavoura cresce o tempo que passou desde a vez dela: cada
   * pé uma vez por segundo, e no máximo ORCAMENTO_LAVOURA pés por passo (numa lavoura
   * enorme a volta demora mais, mas cada pé cresce o tempo todo que esperou; a velocidade
   * de crescer é a mesma e o custo do passo tem teto).
   */
  function crescerAosPoucos(dt: number): void {
    relogioLavoura += dt;
    if (lavoura.size === 0) return;
    const cota = Math.min(ORCAMENTO_LAVOURA, Math.ceil((lavoura.size * dt) / INTERVALO_LAVOURA));
    const noite = noiteNaHora(hora);
    const chuva = chuvaNoMundo();
    luzesNoPasso = 0;
    let reinicios = 0;
    for (let i = 0; i < cota; i++) {
      let r = cursorLavoura?.next();
      if (!r || r.done) {
        // uma volta inteira já foi feita neste passo (lavoura pequena): basta
        if (++reinicios > 1) break;
        cursorLavoura = lavoura.entries();
        r = cursorLavoura.next();
        if (r.done) break;
      }
      const [k, c] = r.value;
      // sem sol, o pé precisa da luz de tocha; calculada demais neste passo, ele fica para
      // a próxima volta (e cresce então todo o tempo que esperou)
      if (
        luzesNoPasso >= ORCAMENTO_LUZ &&
        !(noite < 0.5 && mundo.criaturas.ceuAberto(c.x, c.y, c.z)) &&
        luzGuardada(c) === undefined
      )
        continue;
      const passou = relogioLavoura - c.t;
      c.t = relogioLavoura;
      if (passou > 0) crescerPe(k, c, passou, noite, chuva);
    }
  }

  function colocar(j: Jogador, c: Extract<Comando, { t: 'colocar' }>): void {
    const { x, y, z, bloco, meta } = c;
    const celulas = [c, ...(c.extras ?? [])];
    const p = j.inventario.obter(c.slot);
    const def = obterBloco(bloco);
    const blocoAtual = mundo.bloco(x, y, z);
    // planta baixa e água dão lugar; a lavoura não (colocar em cima dela é recusado)
    const livre = substituivel(blocoAtual);
    // semente só na terra arada
    const lav = lavouraDoBloco(bloco);
    const plantavel = !lav || podePlantar(mundo.bloco(x, y - 1, z), blocoAtual);
    const temItem = modo === 'criativo' || (!!p && blocoDoItem(p.item) === bloco && p.qtd > 0);
    // a outra parte só existe para a porta (dois blocos de altura): exatamente a célula de
    // cima, que tem de estar livre. Qualquer outra "parte extra" é truque (uma semente
    // plantando três pés, uma tábua virando três blocos longe dali) e o pedido é recusado.
    const metade = c.extras && c.extras.length > 0 ? c.extras : null;
    const extrasOk =
      !metade ||
      (bloco === Bloco.PORTA &&
        metade.length === 1 &&
        metade[0].x === x &&
        metade[0].y === y + 1 &&
        metade[0].z === z &&
        y + 1 < ALTURA &&
        substituivel(mundo.bloco(x, y + 1, z)));
    const ocupado =
      !!def?.solido &&
      [...jogadores.values()].some((o) =>
        colocacaoBloqueada({ x, y, z }, { x: o.tel.x, y: o.tel.y, z: o.tel.z }),
      );
    if (
      !def ||
      !j.constroi ||
      bloco === Bloco.AR ||
      !livre ||
      !extrasOk ||
      !plantavel ||
      !temItem ||
      ocupado ||
      !perto(j, x, y, z, ALCANCE_REGRAS) ||
      j.sobrevivencia.estado.morto
    ) {
      recusar(j, c.id, lav && livre && !plantavel ? 'semente' : 'colocar', celulas);
      return;
    }
    editar(x, y, z, bloco, meta);
    // a metade de cima da porta (já conferida: ar, planta baixa ou água)
    if (metade) editar(x, y + 1, z, bloco, meta);
    if (modo === 'sobrevivencia') j.inventario.remover(c.slot, 1);
    j.acoes[1]++;
    for (const o of jogadores.values())
      o.eventos.push({ e: 'colocacao', x, y, z, bloco, meu: o === j });
    if (lav) j.eventos.push({ e: 'plantou', x, y, z, bloco });
  }

  function editarLote(j: Jogador, c: Extract<Comando, { t: 'editar' }>): void {
    if ((modo !== 'criativo' && !confiar) || !j.constroi || c.lote.length > 20000) {
      recusar(j, c.id, 'editar', c.lote.slice(0, 20000));
      return;
    }
    if (!confiar) {
      const longe = c.lote.some(
        (e) =>
          e.y < 0 || e.y >= 128 || Math.max(Math.abs(e.x - j.tel.x), Math.abs(e.z - j.tel.z)) > 64,
      );
      if (longe) {
        recusar(j, c.id, 'editar', c.lote.slice(0, 500));
        return;
      }
    }
    // a lavoura segue a regra de plantar (terra arada embaixo): primeiro o resto do lote
    // (que pode trazer a terra arada), depois as plantas; planta sem terra arada não entra
    // (e a tela é corrigida). Sem isso, milhares de pés no ar faziam o crescer pesar.
    const plantas: typeof c.lote = [];
    for (const e of c.lote) {
      const b = e.v & 255;
      if (ehLavoura(b)) plantas.push(e);
      else editar(e.x, e.y, e.z, b, (e.v >> 8) & 255);
    }
    for (const e of plantas) {
      if (mundo.bloco(e.x, e.y - 1, e.z) === Bloco.TERRA_ARADA)
        editar(e.x, e.y, e.z, e.v & 255, (e.v >> 8) & 255);
      else corrigir(j, e.x, e.y, e.z);
    }
  }

  function alternarPorta(x: number, y: number, z: number): void {
    const b = mundo.bloco(x, y, z);
    const novo = alternado(b);
    editar(x, y, z, novo, edicoes.obterMeta(x, y, z));
    // a porteira tem um bloco só; a porta leva a outra metade junto
    if (!ehPorta(b)) return;
    for (const dy of [-1, 1]) {
      const v = mundo.bloco(x, y + dy, z);
      if (v === Bloco.PORTA || v === Bloco.PORTA_ABERTA)
        editar(x, y + dy, z, novo, edicoes.obterMeta(x, y + dy, z));
    }
  }

  let aberturas = 0;
  function usar(j: Jogador, c: Extract<Comando, { t: 'usar' }>): void {
    const { x, y, z } = c;
    if (!perto(j, x, y, z, ALCANCE_REGRAS) || j.sobrevivencia.estado.morto) {
      // a porta foi prevista na tela: volta as duas metades
      if (c.id !== undefined) recusar(j, c.id, 'usar', [c, { x, y: y - 1, z }, { x, y: y + 1, z }]);
      return;
    }
    const abertura = c.id ?? 1_000_000 + ++aberturas;
    const b = mundo.bloco(x, y, z);
    if (abreEFecha(b)) {
      alternarPorta(x, y, z);
      for (const o of jogadores.values()) o.eventos.push({ e: 'porta', x, y, z });
    } else if (
      (b === Bloco.BAU || b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) &&
      !j.constroi
    ) {
      // quem só passeia não mexe nos baús e fornalhas dos outros
      j.eventos.push({ e: 'recusa', comando: c.id ?? 0, motivo: 'visitante' });
    } else if (b === Bloco.BAU) {
      // baú sem edição no lugar foi gerado pelo mundo (ruína): vem com tesouro
      conteineres.bau(x, y, z, edicoes.obter(x, y, z) === undefined);
      j.conteiner = { tipo: 'bau', abertura, x, y, z };
      j.conteinerSujo = true;
    } else if (b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) {
      conteineres.fornalha(x, y, z);
      j.conteiner = { tipo: 'fornalha', abertura, x, y, z };
      j.conteinerSujo = true;
    } else if (b === Bloco.CAMA) {
      j.spawn = { x: x + 0.5, z: z + 0.5 };
      if (noiteNaHora(hora) < 0.4) {
        j.eventos.push({ e: 'sono', dormiu: false });
        return;
      }
      // a noite só passa quando todos estão deitados (com um jogador só, na hora)
      j.querDormir = ESPERA_TODOS;
      const faltam = [...jogadores.values()].filter((o) => o.querDormir <= 0).length;
      if (faltam > 0) {
        j.eventos.push({ e: 'sonoEspera', faltam });
        return;
      }
      for (const o of jogadores.values()) {
        o.querDormir = 0;
        o.sono = ESPERA_SONO;
        o.eventos.push({ e: 'sono', dormiu: true });
      }
    }
  }

  /** A noite passa (uma vez) e quem dormia acorda. */
  function acordar(): void {
    // dormir à noite (antes da meia-noite) já conta como o dia seguinte
    if (hora > 0.5) dia++;
    hora = 0.265;
    horaAnterior = hora;
    for (const o of jogadores.values())
      if (o.sono !== 0) {
        o.sono = 0;
        o.eventos.push({ e: 'acordou' });
      }
  }

  /** Slots que um lugar da transação alcança. */
  function slotsDe(
    j: Jogador,
    onde: MudancaSlot['onde'],
  ): { ler(i: number): Slot; gravar(i: number, p: Slot): void; tamanho: number } | null {
    if (onde === 'inv')
      return {
        ler: (i) => j.inventario.obter(i),
        gravar: (i, p) => j.inventario.definir(i, p),
        tamanho: j.inventario.slots.length,
      };
    if (onde === 'tr')
      return {
        ler: (i) => j.transito[i] ?? null,
        gravar: (i, p) => {
          j.transito[i] = p;
        },
        tamanho: j.transito.length,
      };
    const ct = j.conteiner;
    if (onde === 'bau' && ct?.tipo === 'bau') {
      const s = conteineres.bau(ct.x, ct.y, ct.z, false);
      return {
        ler: (i) => s[i] ?? null,
        gravar: (i, p) => {
          s[i] = p;
        },
        tamanho: TAMANHO_BAU,
      };
    }
    if (onde === 'forn' && ct?.tipo === 'fornalha') {
      const f = conteineres.fornalha(ct.x, ct.y, ct.z);
      const campos = ['entrada', 'combustivel', 'saida'] as const;
      return {
        ler: (i) => f[campos[i]] ?? null,
        gravar: (i, p) => {
          f[campos[i]] = p;
        },
        tamanho: 3,
      };
    }
    return null;
  }

  const igual = (a: Slot, b: Slot) =>
    (a === null && b === null) ||
    (!!a && !!b && a.item === b.item && a.qtd === b.qtd && (a.dur ?? -1) === (b.dur ?? -1));

  function transacao(j: Jogador, c: Extract<Comando, { t: 'transacao' }>): void {
    j.ackTransacao = Math.max(j.ackTransacao, c.id);
    // confere tudo antes de mexer: ou a transação inteira vale, ou nada muda
    const alvos = c.mudancas.map((m) => ({ m, s: slotsDe(j, m.onde) }));
    const valida = alvos.every(
      ({ m, s }) => !!s && m.i >= 0 && m.i < s.tamanho && igual(s.ler(m.i), m.antes),
    );
    // na nuvem a conta dos itens tem que fechar (no criativo o catálogo dá de tudo)
    const contaOk = confiar || modo === 'criativo' || contaFecha(c.mudancas, c.fabricou ?? []);
    const noConteiner = c.mudancas.some((m) => m.onde === 'bau' || m.onde === 'forn');
    const ct = j.conteiner;
    const alcanca = !ct || confiar || perto(j, ct.x, ct.y, ct.z, ALCANCE_REGRAS + 2);
    // foi embora com o baú aberto: fecha
    if (noConteiner && !alcanca) j.conteiner = null;
    const conteinerOk = !noConteiner || (j.constroi && alcanca);
    if (!valida || !contaOk || !conteinerOk) {
      // Tudo volta ao oficial, inclusive o que estava nas mãos (nada duplica nem some).
      j.inventarioSujo = true;
      j.transitoSujo = true;
      j.conteinerSujo = true;
      return;
    }
    for (const { m, s } of alvos) s!.gravar(m.i, m.depois ? { ...m.depois } : null);
    j.inventarioSujo = true;
    if (c.mudancas.some((m) => m.onde === 'bau' || m.onde === 'forn')) {
      // outros jogadores com o mesmo contêiner aberto veem a mudança
      for (const o of jogadores.values())
        if (
          o !== j &&
          o.conteiner &&
          j.conteiner &&
          o.conteiner.x === j.conteiner.x &&
          o.conteiner.y === j.conteiner.y &&
          o.conteiner.z === j.conteiner.z
        )
          o.conteinerSujo = true;
    }
  }

  function criatura(id: number) {
    return populacao.lista.find((c) => c.id === id);
  }

  function tratarCriaturas(
    eventos: EventoCriatura[],
    alvo: Jogador | undefined,
    golpe = false,
  ): void {
    for (const ev of eventos) {
      const c = ev.criatura;
      const atacado = ev.jogador
        ? [...jogadores.values()].find((o) => o.corpo === ev.jogador)
        : alvo;
      if (ev.tipo === 'ataque' && atacado && modo === 'sobrevivencia') {
        atacado.sobrevivencia.dano(ev.dano ?? 2, 'criatura');
        atacado.eventos.push({ e: 'ataque', dano: ev.dano ?? 2 });
      } else if (ev.tipo === 'ataque') {
        // criativo: as criaturas não machucam
      } else if (ev.tipo === 'ferida') {
        eventosGerais.push({ e: 'criaturaFerida', id: c.id, tipo: c.tipo });
      } else if (ev.tipo === 'morte') {
        for (const d of ev.drops ?? [])
          mundoItens.soltar(d.item, d.qtd, c.x, c.y + 0.5, c.z, rngDrops);
        // derrotada é só a que caiu num golpe (o sol que desfaz o espectro não conta no diário)
        eventosGerais.push({ e: 'criaturaMorreu', id: c.id, tipo: c.tipo, drops: golpe });
      } else if (ev.tipo === 'som') {
        eventosGerais.push({ e: 'criaturaSom', id: c.id, tipo: c.tipo });
      } else if (ev.tipo === 'ovo') {
        // a galinha criada botou: o ovo cai do lado dela
        mundoItens.soltar('ovo', 1, c.x, c.y + 0.3, c.z, rngCriacao);
        eventosGerais.push({ e: 'botouOvo', id: c.id, x: c.x, y: c.y, z: c.z });
      } else if (ev.tipo === 'espantada' && atacado) {
        // a criatura da noite mansa fugiu de quem chegou perto (o diário conta como espantar)
        atacado.eventos.push({ e: 'espantou', id: c.id, tipo: c.tipo });
      }
    }
  }

  function atacar(j: Jogador, c: Extract<Comando, { t: 'atacar' }>): void {
    const cr = criatura(c.criatura);
    if (!cr || Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA) return;
    // morador não apanha
    if (cr.morador) return;
    const p = j.inventario.obter(c.slot);
    const f = ferramentaDe(p);
    const dano = f ? (f.tipo === 'espada' ? f.dano : Math.max(2, f.dano)) : 1;
    tratarCriaturas(populacao.ferir(cr, dano, j.tel.x, j.tel.z), j, true);
    if (modo === 'sobrevivencia' && f && p?.dur !== undefined) {
      const dur = p.dur - (f.tipo === 'espada' ? 1 : 2);
      j.inventario.definir(c.slot, dur > 0 ? { ...p, dur } : null);
    }
  }

  function domar(j: Jogador, c: Extract<Comando, { t: 'domar' }>): void {
    const cr = criatura(c.criatura);
    const p = j.inventario.obter(c.slot);
    if (!cr || cr.tipo !== 'raposa' || cr.domada || p?.item !== 'frutinhas') return;
    if (Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA) return;
    if (modo === 'sobrevivencia') j.inventario.remover(c.slot, 1);
    if (populacao.domar(cr)) j.eventos.push({ e: 'domou', id: cr.id, tipo: cr.tipo });
  }

  /**
   * Dar comida a um bicho (spec 013): a comida tem que estar mesmo na mão (no inventário do
   * núcleo). O bicho vira criado (gasta 1 na sobrevivência); se já era, ganha carinho e a
   * casa passa a ser onde está, sem gastar nada.
   */
  /** Spec 015: moradores que vão acenar de volta (no passo `passo`). */
  let respostasGesto: { passo: number; criatura: number; gesto: IdGesto; voz: boolean }[] = [];

  /** Manda o gesto a quem está perto de (x, z), menos a quem fez. */
  function espalharGesto(
    x: number,
    z: number,
    ev: Extract<EventoNucleo, { e: 'gesto' }>,
    menos?: Jogador,
  ): void {
    for (const o of jogadores.values())
      if (
        o !== menos &&
        Math.abs(o.tel.x - x) < RAIO_VER_GESTO &&
        Math.abs(o.tel.z - z) < RAIO_VER_GESTO
      )
        o.eventos.push(ev);
  }

  /**
   * Spec 015: um gesto da roda. Um por jogador a cada `INTERVALO_GESTO_NUCLEO` (o resto é
   * descartado sem aviso); desmaiado não gesticula. Os amigos perto veem; o morador perto
   * vira e acena de volta; "chamar" traz a raposa domada e os bichos criados.
   */
  function gesto(j: Jogador, g: IdGesto): void {
    if (j.sobrevivencia.estado.morto) return;
    if ((n - j.passoGesto) * PASSO < INTERVALO_GESTO_NUCLEO - 1e-9) return;
    j.passoGesto = n;
    const { x, y, z } = j.tel;
    espalharGesto(x, z, { e: 'gesto', gesto: g, jogador: j.id }, j);
    if (moradorResponde(g)) {
      const perto: [number, number][] = [];
      for (const c of populacao.lista) {
        if (c.tipo !== 'morador' || c.estado === 'morrendo' || Math.abs(c.y - y) > 4) continue;
        const d = Math.hypot(c.x - x, c.z - z);
        if (d <= RAIO_RESPOSTA_MORADOR) perto.push([d, c.id]);
      }
      perto.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      perto.slice(0, MORADORES_QUE_RESPONDEM).forEach(([, id], i) => {
        const c = criatura(id)!;
        // para, vira para quem acenou e acena depois de um instante
        c.yawAlvo = Math.atan2(x - c.x, z - c.z);
        c.pausaGesto = ATRASO_RESPOSTA + 2.2;
        respostasGesto.push({
          passo: n + Math.round(ATRASO_RESPOSTA / PASSO),
          criatura: id,
          gesto: 'acenar',
          voz: i === 0,
        });
      });
    } else if (g === 'chamar') populacao.chamar(x, y, z);
  }

  /** Os moradores que chegou a hora de acenar de volta. */
  function responderGestos(): void {
    if (!respostasGesto.length) return;
    const fica: typeof respostasGesto = [];
    for (const r of respostasGesto) {
      if (r.passo > n) {
        fica.push(r);
        continue;
      }
      const c = criatura(r.criatura);
      if (!c || c.estado === 'morrendo') continue;
      espalharGesto(c.x, c.z, {
        e: 'gesto',
        gesto: r.gesto,
        criatura: c.id,
        ...(r.voz ? { voz: true } : {}),
      });
    }
    respostasGesto = fica;
  }

  /** Passo em que cada bicho ganhou comida por último (os corações têm intervalo). */
  const ultimaComida = new Map<number, number>();
  function alimentar(j: Jogador, c: Extract<Comando, { t: 'alimentar' }>): void {
    const cr = criatura(c.criatura);
    const p = j.inventario.obter(c.slot);
    if (
      !cr ||
      cr.estado === 'morrendo' ||
      !viraCriado(cr.tipo) ||
      !comeEsse(cr.tipo, p?.item) ||
      j.sobrevivencia.estado.morto ||
      Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA
    )
      return;
    // criar bicho novo é mexer no mundo (como arar e plantar): quem só passeia não cria
    if (!cr.criado && !j.constroi) {
      j.eventos.push({ e: 'recusa', comando: 0, motivo: 'visitante' });
      return;
    }
    // o já criado ganha corações no máximo uma vez por segundo (senão um clique repetido
    // enchia todo mundo de eventos e vozes)
    if (cr.criado) {
      const ultima = ultimaComida.get(cr.id);
      if (ultima !== undefined && (n - ultima) * PASSO < INTERVALO_COMIDA) return;
    }
    const r = populacao.criar(cr);
    if (r === 'limite') {
      j.eventos.push({ e: 'criacaoRecusada', motivo: 'limite', aviso: AVISO_LIMITE });
      return;
    }
    if (r === 'nao') return;
    ultimaComida.set(cr.id, n);
    if (ultimaComida.size > 256) ultimaComida.delete(ultimaComida.keys().next().value as number);
    if (r === 'novo' && modo === 'sobrevivencia') j.inventario.remover(c.slot, 1);
    for (const o of jogadores.values())
      o.eventos.push({
        e: 'alimentou',
        id: cr.id,
        tipo: cr.tipo,
        x: cr.x,
        y: cr.y,
        z: cr.z,
        novo: r === 'novo',
        meu: o === j,
      });
  }

  function trocar(j: Jogador, c: Extract<Comando, { t: 'trocar' }>): void {
    const cr = criatura(c.criatura);
    const t = TROCAS[c.profissao]?.find((x) => x.id === c.troca);
    if (!t || !cr?.morador || cr.morador.profissao !== c.profissao) {
      j.eventos.push({ e: 'trocaRecusada', motivo: 'morador' });
      return;
    }
    if (Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA + 3) {
      j.eventos.push({ e: 'trocaRecusada', motivo: 'longe' });
      return;
    }
    const ok = fazerTroca(j.inventario, t, (item, qtd) =>
      mundoItens.soltar(item, qtd, j.tel.x, j.tel.olhos - 1, j.tel.z, rngDrops),
    );
    j.eventos.push(
      ok
        ? { e: 'trocou', profissao: c.profissao, troca: t.id }
        : { e: 'trocaRecusada', motivo: 'faltam' },
    );
  }

  function comer(j: Jogador, c: Extract<Comando, { t: 'comer' }>): void {
    if (modo !== 'sobrevivencia') return;
    const p = j.inventario.obter(c.slot);
    const comida = p ? obterItem(p.item)?.comida : undefined;
    if (!p || !comida) return;
    if (j.sobrevivencia.comer(comida.fome, comida.saturacao)) {
      j.inventario.remover(c.slot, 1);
      j.eventos.push({ e: 'comeu', item: p.item });
      j.acoes[2]++;
    }
  }

  /** Mais rápido que isto é teletransporte (blocos por segundo, com folga). */
  const VEL_MAX = modo === 'criativo' ? 40 : 14;
  function telemetria(j: Jogador, c: Telemetria): void {
    const { quedas, pulos, golpes } = c;
    // depois de entrar ou renascer, a primeira posição ainda tem que ser perto de onde
    // o núcleo sabe que o jogador está (ou do ponto de renascer)
    if (!confiar && !depuracao && j.saltoPermitido) {
      const pertoDe = (x: number, z: number) => Math.hypot(c.x - x, c.z - z) <= 80;
      if (!pertoDe(j.tel.x, j.tel.z) && !pertoDe(j.spawn.x, j.spawn.z)) {
        j.eventos.push({ e: 'teleporte', x: j.tel.x, z: j.tel.z, y: j.tel.y });
        return;
      }
    }
    // na nuvem a posição tem que ser possível: andar, correr, voar e cair, não saltar
    if (!confiar && !depuracao && !j.saltoPermitido) {
      // ficar calado não dá direito a saltar mais longe depois
      const dt = Math.min((n - j.passoTelemetria) * PASSO, 1) + 0.3;
      const horiz = Math.hypot(c.x - j.tel.x, c.z - j.tel.z);
      const sobe = c.y - j.tel.y;
      if (
        !Number.isFinite(c.x + c.y + c.z) ||
        horiz > VEL_MAX * dt + 2 ||
        sobe > VEL_MAX * dt + 2
      ) {
        j.eventos.push({ e: 'teleporte', x: j.tel.x, z: j.tel.z, y: j.tel.y });
        return;
      }
    }
    j.saltoPermitido = false;
    j.passoTelemetria = n;
    j.tel = { ...c, quedas: [], pulos: 0, golpes: 0 };
    if (golpes > 0) j.acoes[0] += Math.min(golpes, 20);
    for (let i = 0; i < golpes; i++) j.sobrevivencia.acao();
    if (modo !== 'sobrevivencia' || j.sobrevivencia.estado.morto) return;
    for (const q of quedas) if (q > 0) j.sobrevivencia.queda(q);
    for (let i = 0; i < pulos; i++) j.sobrevivencia.pulo(c.correndo);
  }

  function depurar(j: Jogador, d: Depuracao): void {
    switch (d.f) {
      case 'invocar': {
        const c = populacao.adicionar(d.tipo, d.x, d.y, d.z);
        if (d.domada && c.tipo === 'raposa') c.domada = true;
        if (d.criado) populacao.criar(c);
        break;
      }
      case 'clima':
        clima.definir(d.tipo);
        break;
      case 'dia':
        dia = Math.max(0, Math.floor(d.dia));
        break;
      case 'hora':
        hora = normalizarHora(d.hora);
        break;
      case 'pausarDia':
        pausado = d.pausar;
        break;
      case 'soltarItem':
        mundoItens.soltar(d.item, d.qtd, d.x, d.y, d.z, rngDrops, d.dur);
        break;
      case 'spawn':
        j.spawn = { x: d.x, z: d.z };
        break;
      case 'dano':
        j.sobrevivencia.dano(d.qtd, d.causa, true);
        break;
      case 'crescer':
        // testes e capturas: a lavoura avança como se tantos segundos tivessem passado
        crescer(Math.min(Math.max(0, Number(d.segundos) || 0), 3600));
        break;
      case 'kit':
        preencherKit(j.inventario, [...SLOTS.map((s) => s.bloco), ...KIT_EXTRA]);
        j.inventarioSujo = true;
        break;
    }
  }

  /** Tira do que o jogador tem (primeiro das mãos, depois da mochila); devolve quanto tirou. */
  function retirar(
    j: Jogador,
    item: string,
    qtd: number,
    /** Slot da mochila de onde tirar primeiro (Q tira do que está na mão). */
    preferir?: number,
  ): { item: string; qtd: number; dur?: number }[] {
    let falta = Math.max(0, Math.floor(qtd));
    const tirados: { item: string; qtd: number; dur?: number }[] = [];
    const de = (ler: (i: number) => Slot, gravar: (i: number, p: Slot) => void, n: number) => {
      for (let i = 0; i < n && falta > 0; i++) {
        const p = ler(i);
        if (!p || p.item !== item) continue;
        const t = Math.min(falta, p.qtd);
        gravar(i, p.qtd - t > 0 ? { ...p, qtd: p.qtd - t } : null);
        tirados.push({ item, qtd: t, dur: p.dur });
        falta -= t;
      }
    };
    if (preferir !== undefined && j.inventario.obter(preferir)?.item === item)
      de(
        (i) => (i === 0 ? j.inventario.obter(preferir) : null),
        (_i, p) => j.inventario.definir(preferir, p),
        1,
      );
    de(
      (i) => j.transito[i] ?? null,
      (i, p) => {
        j.transito[i] = p;
      },
      j.transito.length,
    );
    de(
      (i) => j.inventario.obter(i),
      (i, p) => j.inventario.definir(i, p),
      j.inventario.slots.length,
    );
    j.transitoSujo = true;
    j.inventarioSujo = true;
    return tirados;
  }

  /** Onde e com que velocidade sai um item jogado para a frente (yaw: para onde o boneco olha). */
  function arremesso(j: Jogador, yaw: number) {
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    return {
      de: j.id,
      x: j.tel.x + fx * 0.35,
      y: j.tel.olhos - 0.45,
      z: j.tel.z + fz * 0.35,
      vx: fx * VELOCIDADE_ARREMESSO,
      vy: 2.6,
      vz: fz * VELOCIDADE_ARREMESSO,
    };
  }

  function comando(id: string, bruto: Comando): void {
    const j = jogadores.get(id);
    if (!j) return;
    // na nuvem, mensagem fora do formato (números absurdos, tamanhos enormes) não entra
    const c = confiar ? bruto : sanear(bruto);
    if (!c) return;
    if ('id' in c && typeof c.id === 'number') j.ack = Math.max(j.ack, c.id);
    switch (c.t) {
      case 'jogador':
        telemetria(j, c);
        break;
      case 'quebrar':
        quebrar(j, c);
        break;
      case 'colocar':
        colocar(j, c);
        break;
      case 'arar':
        arar(j, c);
        break;
      case 'editar':
        editarLote(j, c);
        break;
      case 'usar':
        usar(j, c);
        break;
      case 'fecharConteiner':
        j.conteiner = null;
        j.conteinerSujo = true;
        break;
      case 'transacao':
        transacao(j, c);
        break;
      case 'soltar': {
        // jogado de propósito (dar a um amigo): sai na frente do boneco, para onde ele olha,
        // e quem jogou só pega de volta depois de um tempinho
        const arr = c.jogar ? arremesso(j, c.jogar.yaw) : undefined;
        for (const p of c.itens) {
          if (confiar) {
            if (arr) mundoItens.soltar(p.item, p.qtd, arr.x, arr.y, arr.z, rngDrops, p.dur, arr);
            else mundoItens.soltar(p.item, p.qtd, c.x, c.y, c.z, rngDrops, p.dur);
            continue;
          }
          // na nuvem só sai o que o jogador tem, com a durabilidade que tem
          for (const t of retirar(j, p.item, p.qtd, c.jogar?.slot))
            if (arr) mundoItens.soltar(t.item, t.qtd, arr.x, arr.y, arr.z, rngDrops, t.dur, arr);
            else
              mundoItens.soltar(
                t.item,
                t.qtd,
                j.tel.x,
                j.tel.olhos - 0.4,
                j.tel.z,
                rngDrops,
                t.dur,
              );
        }
        break;
      }
      case 'atacar':
        atacar(j, c);
        break;
      case 'domar':
        domar(j, c);
        break;
      case 'alimentar':
        alimentar(j, c);
        break;
      case 'falar': {
        const cr = criatura(c.criatura);
        if (cr?.morador) cr.yawAlvo = Math.atan2(j.tel.x - cr.x, j.tel.z - cr.z);
        break;
      }
      case 'trocar':
        trocar(j, c);
        break;
      case 'comer':
        comer(j, c);
        break;
      case 'renascer':
        // na nuvem só quem desmaiou renasce (senão seria cura e teletransporte de graça)
        if (!confiar && !j.sobrevivencia.estado.morto) break;
        j.saltoPermitido = true;
        j.sobrevivencia.renascer();
        j.eventos.push({ e: 'teleporte', x: j.spawn.x, z: j.spawn.z });
        break;
      case 'conferir':
        for (const q of c.celulas.slice(0, 500)) corrigir(j, q.x, q.y, q.z);
        break;
      case 'depurar':
        if (depuracao) depurar(j, c.d);
        break;
      case 'gesto':
        gesto(j, c.gesto);
        break;
      case 'aparencia':
        j.perfil = { ...j.perfil, aparencia: c.aparencia };
        perfisSujos = true;
        break;
      case 'salvar':
        // o anfitrião responde (precisa do pedido)
        break;
    }
  }

  function passo(dt = PASSO): void {
    n++;
    mundo.avancar(dt);
    if (!pausado) hora = normalizarHora(hora + dt / DURACAO_DIA);
    if (horaAnterior > 0.9 && hora < 0.1) dia++;
    horaAnterior = hora;
    const noite = noiteNaHora(hora);
    const raio = clima.atualizar(dt, estacaoDoDia(dia), noite < 0.5);
    if (raio) eventosGerais.push({ e: 'relampago', atrasoTrovao: raio.atrasoTrovao });

    let amanhece = false;
    for (const j of jogadores.values()) {
      if (j.querDormir > 0) j.querDormir = Math.max(0, j.querDormir - dt);
      if (j.sono > 0) {
        j.sono -= dt;
        if (j.sono <= 0) {
          j.sono = -1;
          amanhece = true;
        }
      }
    }
    if (amanhece) acordar();
    for (const j of jogadores.values()) {
      if (modo !== 'sobrevivencia') continue;
      j.sobrevivencia.atualizar(dt, {
        correndo: j.tel.correndo,
        andando: j.tel.vel > 0.5,
        submerso: j.tel.submerso,
      });
      if (j.tel.y < -20) j.sobrevivencia.dano(100, 'queda', true);
    }

    // criaturas e itens: cada um reage ao jogador mais perto (com um só, é ele)
    const lista = [...jogadores.values()];
    if (lista.length) {
      for (const o of lista) {
        o.corpo.x = o.tel.x;
        o.corpo.y = o.tel.y;
        o.corpo.z = o.tel.z;
        o.corpo.vivo = !o.sobrevivencia.estado.morto;
        o.corpo.mao = o.inventario.obter(o.tel.slot)?.item ?? null;
      }
      const ev = populacao.atualizar(
        dt,
        mundo.criaturas,
        lista.map((o) => o.corpo),
        noite,
      );
      tratarCriaturas(ev, lista[0]);
      const coletados = mundoItens.atualizar(
        dt,
        lista.map((o) => ({ x: o.tel.x, y: o.tel.y, z: o.tel.z, id: o.id })),
        (item, qtd, dur, quem) => lista[quem].inventario.adicionar(item, qtd, dur),
      );
      for (const c of coletados)
        lista[c.quem].eventos.push({ e: 'coletou', item: c.item, qtd: c.qtd });
    }

    // spec 015: moradores acenando de volta
    responderGestos();

    // a lavoura cresce com o mundo aberto (cada pé uma vez por segundo, com teto por passo)
    crescerAosPoucos(dt);

    // fornalhas trabalham mesmo com o painel fechado
    conteineres.atualizar(
      dt,
      (x, y, z) => mundo.bloco(x, y, z) === Bloco.FORNALHA_ACESA,
      (x, y, z, acesa) => {
        const atual = mundo.bloco(x, y, z);
        if (atual !== Bloco.FORNALHA && atual !== Bloco.FORNALHA_ACESA) return;
        editar(x, y, z, acesa ? Bloco.FORNALHA_ACESA : Bloco.FORNALHA, edicoes.obterMeta(x, y, z));
      },
    );
  }

  function ambiente(): Ambiente {
    return { hora, dia, clima: { ...clima.estado } as EstadoClima, pausado };
  }

  function vistaCriaturas(): CriaturaVista[] {
    return populacao.lista.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      x: c.x,
      y: c.y,
      z: c.z,
      yaw: c.yaw,
      estado: c.estado,
      dissolver: c.dissolver,
      noChao: c.noChao,
      ferida: c.ferida,
      domada: c.domada,
      vida: c.vida,
      ...(c.criado ? { criado: true } : {}),
      morador: c.morador
        ? { povoado: c.morador.povoado, n: c.morador.n, profissao: c.morador.profissao }
        : undefined,
    }));
  }

  function vistaItens(): ItemVisto[] {
    return mundoItens.itens.map((i) => ({
      id: i.id,
      item: i.item,
      qtd: i.qtd,
      x: i.x,
      y: i.y,
      z: i.z,
    }));
  }

  function vistaConteiner(j: Jogador): ConteinerVisto | null {
    const c = j.conteiner;
    if (!c) return null;
    if (c.tipo === 'bau')
      return {
        ...c,
        tipo: 'bau',
        slots: conteineres.bau(c.x, c.y, c.z, false).map((p) => (p ? { ...p } : null)),
      };
    const f = conteineres.fornalha(c.x, c.y, c.z);
    return { ...c, tipo: 'fornalha', fornalha: JSON.parse(JSON.stringify(f)) };
  }

  /** Monta o quadro de cada jogador e limpa o que já foi mandado. */
  function quadros(): Map<string, Quadro> {
    const out = new Map<string, Quadro>();
    const criaturas = vistaCriaturas();
    const itens = vistaItens();
    const amb = ambiente();
    const todos: JogadorVisto[] = [...jogadores.values()].map((o) => ({
      id: o.id,
      x: o.tel.x,
      y: o.tel.y,
      z: o.tel.z,
      yaw: o.tel.yaw,
      pitch: o.tel.pitch,
      vel: o.tel.vel,
      voando: o.tel.voando,
      noChao: o.tel.noChao,
      correndo: o.tel.correndo,
      mao: o.inventario.obter(o.tel.slot)?.item ?? null,
      acoes: [o.acoes[0], o.acoes[1], o.acoes[2]],
    }));
    const perfis = perfisSujos
      ? Object.fromEntries([...jogadores.values()].map((o) => [o.id, o.perfil]))
      : undefined;
    perfisSujos = false;
    for (const j of jogadores.values()) {
      const q: Quadro = { t: 'quadro', n, ack: j.ack, ambiente: amb, criaturas, itens };
      // na nuvem a lista vai sempre (vazia também: quem saiu some da tela)
      if (!confiar || todos.length > 1) q.jogadores = todos.filter((o) => o.id !== j.id);
      if (perfis) q.perfis = perfis;
      if (!j.iniciado) {
        q.primeiro = true;
        j.iniciado = true;
      }
      const blocos = [...blocosMudados, ...j.correcoes];
      if (blocos.length) q.blocos = blocos;
      if (j.inventarioSujo) {
        q.inventario = {
          slots: j.inventario.slots.map((p) => (p ? { ...p } : null)),
          ackTransacao: j.ackTransacao,
        };
        if (j.transitoSujo) q.inventario.transito = j.transito.map((p) => (p ? { ...p } : null));
        j.inventarioSujo = false;
        j.transitoSujo = false;
      }
      // a fornalha aberta anda sozinha: vai em todo quadro
      if (j.conteinerSujo || j.conteiner?.tipo === 'fornalha') {
        q.conteiner = vistaConteiner(j);
        j.conteinerSujo = false;
      }
      const sob = JSON.stringify(j.sobrevivencia.estado);
      if (sob !== j.ultimaSobrevivencia) {
        j.ultimaSobrevivencia = sob;
        q.sobrevivencia = { ...j.sobrevivencia.estado };
      }
      const eventos = [...eventosGerais, ...j.eventos];
      if (eventos.length) q.eventos = eventos;
      j.eventos = [];
      j.correcoes = [];
      out.set(j.id, q);
    }
    blocosMudados = [];
    eventosGerais = [];
    return out;
  }

  /** Parte do salvamento que é do núcleo (o jogador local é o primeiro). */
  function salvar(): SalvoNucleo {
    const j = jogadores.values().next().value as Jogador | undefined;
    const out: Record<string, unknown> = {
      povoados: { semPovoado },
      itensSoltos: mundoItens.salvar(),
      criaturas: populacao.salvar(),
      clima: clima.salvar(),
      dia,
      conteineres: conteineres.salvar(),
      lavoura: Object.fromEntries([...lavoura].map(([k, c]) => [k, Math.round(c.p * 100) / 100])),
    };
    // na nuvem cada jogador é salvo à parte (dadosJogador); localmente vai junto do mundo
    if (j && confiar) {
      out['sobrevivencia'] = j.sobrevivencia.salvar();
      out['spawn'] = j.spawn;
      const inv = criarInventario();
      inv.carregar(j.inventario.salvar());
      for (const p of j.transito) if (p) inv.adicionar(p.item, p.qtd, p.dur);
      out['inventario'] = inv.salvar();
    }
    return { edicoes: edicoes.exportar(), hora, extras: out };
  }

  return {
    semente,
    modo,
    /** Regiões sem povoado deste mundo (o servidor da nuvem põe de volta ao trocar de sala). */
    semPovoado: semPovoado as readonly string[],
    conectar,
    desconectar,
    dadosJogador,
    /** Visitantes podem construir? (o dono decide) */
    definirConstrucao(id: string, pode: boolean) {
      const j = jogadores.get(id);
      if (j) j.constroi = pode;
    },
    /** Voltou da queda: o próximo quadro recomeça a sequência e leva tudo de novo. */
    reiniciarQuadros(id: string) {
      const j = jogadores.get(id);
      if (!j) return;
      j.iniciado = false;
      j.inventarioSujo = true;
      j.transitoSujo = true;
      j.conteinerSujo = true;
      j.ultimaSobrevivencia = '';
      perfisSujos = true;
    },
    definirPerfil(id: string, perfil: PerfilJogador) {
      const j = jogadores.get(id);
      if (!j) return;
      j.perfil = perfil;
      perfisSujos = true;
    },
    get quantos() {
      return jogadores.size;
    },
    comando,
    passo,
    quadros,
    salvar,
    /** Leitura para testes (não use para mudar nada). */
    get estado() {
      return {
        n,
        hora,
        dia,
        pausado,
        clima: clima.estado,
        edicoes,
        mundo,
        populacao,
        mundoItens,
        conteineres,
        jogadores,
        lavoura,
        /** A criatura da noite deste mundo ('assusta' ou 'mansa'). */
        noite: noiteDoMundo,
      };
    },
  };
}
