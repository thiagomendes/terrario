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
import { criarEdicoes, empacotar } from '../world/edicoes';
import { Bloco, ehAlvo, obterBloco } from '../world/blocks';
import { alturaTerreno, encontrarNascimento } from '../world/chunk';
import { definirRegioesSemPovoado, regiaoDoChunk } from '../world/povoado';
import { criarConteineres, TAMANHO_BAU } from '../jogo/conteineres';
import { criarMundoDeItens, dropsDoBloco } from '../jogo/drops';
import { criarPopulacao } from '../jogo/populacao';
import type { EventoCriatura } from '../jogo/criaturas';
import { criarClima, estacaoDoDia, type EstadoClima } from '../jogo/clima';
import { criarSobrevivencia, type Sobrevivencia } from '../jogo/sobrevivencia';
import { criarInventario, type Inventario, type Slot } from '../jogo/inventario';
import { blocoDoItem, obterItem } from '../jogo/itens';
import { podeColetar } from '../jogo/ferramentas';
import { TROCAS, fazerTroca } from '../jogo/trocas';
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

/** Distância máxima (dos olhos ao centro do bloco) para quebrar, colocar e usar. */
const ALCANCE_REGRAS = 8;
/** Distância máxima para bater, domar e trocar com uma criatura. */
const ALCANCE_CRIATURA = 7;
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
}

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
  /** Para as criaturas (o mesmo objeto a cada passo: os ataques dizem em quem foi). */
  corpo: { x: number; y: number; z: number; vivo: boolean; criativo: boolean };
}

export type Nucleo = ReturnType<typeof criarNucleo>;

export function criarNucleo(op: OpcoesNucleo) {
  registrarCatalogo();
  const { semente, modo } = op;
  const dados = op.dados;
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
  const mundoItens = criarMundoDeItens((x, y, z) => {
    const b = mundo.bloco(x, y, z);
    return b !== Bloco.AR && !!obterBloco(b)?.solido;
  });
  mundoItens.carregar(extras['itensSoltos']);
  const populacao = criarPopulacao(criarGerador(semente + 55), extras['criaturas']);
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

  // jogador do mundo salvo (o servidor local tem um só)
  const nascimento = encontrarNascimento(semente);
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
        yaw: pos?.yaw ?? 0,
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
      perfil: oc?.perfil ?? { apelido: 'Jogador', aparencia: {} },
      constroi: oc?.constroi ?? true,
      corpo: { x, y: y0, z, vivo: true, criativo: modo === 'criativo' },
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
    if (!edicoes.definir(x, y, z, bloco, meta)) return false;
    blocosMudados.push({ x, y, z, v: empacotar(bloco, meta) });
    return true;
  }

  function corrigir(j: Jogador, x: number, y: number, z: number): void {
    j.correcoes.push({ x, y, z, v: empacotar(mundo.bloco(x, y, z), edicoes.obterMeta(x, y, z)) });
  }

  function perto(j: Jogador, x: number, y: number, z: number, raio: number): boolean {
    return Math.hypot(x + 0.5 - j.tel.x, y + 0.5 - j.tel.olhos, z + 0.5 - j.tel.z) <= raio;
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
    }
    // quebrar baú ou fornalha espalha o conteúdo (o de ruína nunca aberto também)
    if (b === Bloco.BAU || b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) {
      const gerado = b === Bloco.BAU && mundo.gerado(x, y, z) === Bloco.BAU;
      for (const p of conteineres.remover(x, y, z, gerado)) {
        if (p) mundoItens.soltar(p.item, p.qtd, x + 0.5, y + 0.5, z + 0.5, rngDrops, p.dur);
      }
      for (const o of jogadores.values())
        if (o.conteiner && o.conteiner.x === x && o.conteiner.y === y && o.conteiner.z === z) {
          o.conteiner = null;
          o.conteinerSujo = true;
        }
    }
    for (const o of jogadores.values())
      o.eventos.push({ e: 'quebra', x, y, z, bloco: b, meu: o === j });
  }

  function colocar(j: Jogador, c: Extract<Comando, { t: 'colocar' }>): void {
    const { x, y, z, bloco, meta } = c;
    const celulas = [c, ...(c.extras ?? [])];
    const p = j.inventario.obter(c.slot);
    const def = obterBloco(bloco);
    const atual = obterBloco(mundo.bloco(x, y, z));
    const livre = !atual || atual.id === Bloco.AR || !!atual.liquido || !!atual.planta;
    const temItem = modo === 'criativo' || (!!p && blocoDoItem(p.item) === bloco && p.qtd > 0);
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
      !temItem ||
      ocupado ||
      !perto(j, x, y, z, ALCANCE_REGRAS) ||
      j.sobrevivencia.estado.morto
    ) {
      recusar(j, c.id, 'colocar', celulas);
      return;
    }
    editar(x, y, z, bloco, meta);
    for (const e of c.extras ?? []) {
      // a outra metade da porta: entra no lugar de ar, planta ou água
      const v = obterBloco(mundo.bloco(e.x, e.y, e.z));
      if (!v || v.id === Bloco.AR || v.planta || v.liquido) editar(e.x, e.y, e.z, bloco, meta);
    }
    if (modo === 'sobrevivencia') j.inventario.remover(c.slot, 1);
    j.acoes[1]++;
    for (const o of jogadores.values())
      o.eventos.push({ e: 'colocacao', x, y, z, bloco, meu: o === j });
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
    for (const e of c.lote) editar(e.x, e.y, e.z, e.v & 255, (e.v >> 8) & 255);
  }

  function alternarPorta(x: number, y: number, z: number): void {
    const b = mundo.bloco(x, y, z);
    const novo = b === Bloco.PORTA ? Bloco.PORTA_ABERTA : Bloco.PORTA;
    editar(x, y, z, novo, edicoes.obterMeta(x, y, z));
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
    if (b === Bloco.PORTA || b === Bloco.PORTA_ABERTA) {
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
      case 'invocar':
        populacao.adicionar(d.tipo, d.x, d.y, d.z);
        break;
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
      case 'soltar':
        for (const p of c.itens) {
          if (confiar) {
            mundoItens.soltar(p.item, p.qtd, c.x, c.y, c.z, rngDrops, p.dur);
            continue;
          }
          // na nuvem só sai o que o jogador tem, com a durabilidade que tem
          for (const t of retirar(j, p.item, p.qtd))
            mundoItens.soltar(t.item, t.qtd, j.tel.x, j.tel.olhos - 0.4, j.tel.z, rngDrops, t.dur);
        }
        break;
      case 'atacar':
        atacar(j, c);
        break;
      case 'domar':
        domar(j, c);
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
        lista.map((o) => o.tel),
        (item, qtd, dur, quem) => lista[quem].inventario.adicionar(item, qtd, dur),
      );
      for (const c of coletados)
        lista[c.quem].eventos.push({ e: 'coletou', item: c.item, qtd: c.qtd });
    }

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
      };
    },
  };
}
