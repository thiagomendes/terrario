/**
 * Esboço da spec 027 (Noite das Fantasias, o Halloween de brinquedo) com o motor de verdade.
 * Só roda com `?esboco=fantasias`: o `main.ts` importa este arquivo sob demanda, então ele vira
 * um pedaço à parte que o jogo nunca baixa. Nada aqui é o mundo de verdade (esse vem nas
 * tarefas da spec); é um palco para as fotos do esboço (`e2e/esboco-fantasias.spec.ts`).
 *
 * Parte 1: o céu e os lugares (sem moradores, bichos, trem e vassoura-patinete).
 * - O mundo-base é a Vila Neon (o id e a planta do tema ficam: várias regras dependem deles);
 *   o palco é montado longe do bairro, num terreno aplainado, com blocos do jogo.
 * - O céu e as texturas PROVISÓRIAS moram em `fantasiasCeu.ts`; as peças que não são bloco
 *   (bandeirolas, campainhas, teias, caldeirão, vassoura, a bancada) em `fantasiasPecas.ts`,
 *   no desenho das peças da Vila (`render/vila/ref.ts`).
 * - Os lugares: a Praça da Abóbora (a abóbora gigante, o palco e duas barracas), a Rua das
 *   Casinhas Tortas (quatro casinhas, uma é a da Vovó Zuleica), o Bosque das Lanternas e a
 *   Horta do Seu Jerônimo.
 */
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import '@babylonjs/core/Particles/particleSystemComponent';
import type { Scene } from '@babylonjs/core/scene';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { tema } from '../temas/ativo';
import type { FormaArvore } from '../temas/tipos';
import { Bloco } from '../world/blocks';
import { hash2 } from '../world/noise';
import { ALTURA, TAM_X, TAM_Z, arvoreDaForma, indice } from '../world/chunk';
import type { PecaVila } from '../world/vilaNeon';
import { criarPlasticos } from '../render/formas';
import { Pecas, type V3 } from '../render/solidos';
import { Ref, type Desenho } from '../render/vila/ref';
import { aplicarCeuETexturas } from './fantasiasCeu';
import {
  CORES,
  aboborinha,
  balcaoDoce,
  balcaoMaca,
  bandeirolas,
  bancada,
  caldeirao,
  campainha,
  capaLanterna,
  luaEstrelas,
  mastro,
  placaDoce,
  placaMaca,
  teia,
  toalhaBalcao,
  vassoura,
} from './fantasiasPecas';

/** Antes da cena: o céu e as texturas no tema ativo; depois, o palco. */
export function prepararEsbocoFantasias(): void {
  aplicarCeuETexturas(tema());
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && e.cenaBabylon) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 200);
  };
  esperar();
}

// ------------------------------------------------------------------ o palco

type Lote = { x: number; y: number; z: number; v: number }[];

/** O tamanho do palco (blocos) e a margem aplainada em volta. */
const W = 116;
const D = 88;
const M = 22;

/** Uma tomada de foto: onde a câmera fica, para onde olha e a abertura (graus). */
export interface Tomada {
  pos: V3;
  alvo: V3;
  fov: number;
}

export interface EsbocoFantasias {
  /** As tomadas de cada lugar, para a tela deitada (e o computador) e para a em pé. */
  tomadas: Record<string, Record<'deitado' | 'empe', Tomada>>;
  /** Monta tudo em volta de onde o jogador está (devolve a origem e o chão). */
  montar(): { ox: number; oz: number; y: number };
  /** Câmera fixa (ou null para voltar à do jogo). */
  camera(pos: V3 | null, alvo?: V3, fovGraus?: number): void;
  /** A hora do dia (o rosto da abóbora e os vaga-lumes acendem de noite). */
  hora(h: number): void;
  /** Acende ou apaga uma lanterna do bosque (o "acender com um toque"). */
  lanterna(i: number, acesa: boolean): void;
  /** Quantas lanternas o bosque tem e quais estão acesas. */
  lanternas(): boolean[];
  /** Esconde o jogador e os bichos do mundo-base (só o lugar na foto). */
  esconder(sim: boolean): void;
  /** Pontos de referência (mundo) de cada lugar. */
  pontos: Record<string, V3>;
}

declare global {
  interface Window {
    __fantasias?: EsbocoFantasias;
  }
}

/** Os blocos de árvore e mato (o aplainar tira, o chão não conta com eles). */
const ARVORE_OU_MATO = new Set<number>([
  Bloco.FOLHAGEM,
  Bloco.FOLHAS_BETULA,
  Bloco.FOLHAS_PINHO,
  Bloco.FOLHAS_LANTERNA,
  Bloco.FOLHAS_OUTONO,
  Bloco.MADEIRA_RETORCIDA,
  Bloco.TRONCO_BETULA,
  Bloco.TRONCO_PINHO,
  Bloco.TRONCO_LANTERNA,
  Bloco.GRAMA_ALTA,
  Bloco.FLOR,
  Bloco.ARBUSTO_FRUTINHAS,
  Bloco.NEVE,
]);

function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  const pl = criarPlasticos(scene, 'esboco-fantasias');
  const lote: Lote = [];
  const por = (x: number, y: number, z: number, b: number, meta = 0) => {
    lote.push({ x, y, z, v: b | (meta << 8) });
  };
  const enviar = () => {
    e.editarLote!(lote.splice(0));
  };
  let O = { ox: 0, oz: 0, y: 64 };
  const pontos: Record<string, V3> = {};
  /** As células do rosto da abóbora gigante (de dia o entalhe, de noite aceso). */
  const rosto: V3[] = [];
  /** As lanternas do bosque: a célula do bloco e se está acesa. */
  const lanternas: { p: V3; acesa: boolean }[] = [];
  /** As peças (feitas depois que os blocos foram). */
  const pecasDepois: ((d: Desenho) => void)[] = [];
  /** Os vaga-lumes do bosque (pontos no mundo). */
  const vagalumes: V3[] = [];

  /** A câmera de alguma foto está a menos de `r` blocos (no chão) de (x, z)? */
  const pertoDeCamera = (x: number, z: number, r: number) =>
    Object.values(tomadas).some((t) =>
      Object.values(t).some((c) => c.pos[1] < O.y + 8 && Math.hypot(c.pos[0] - x, c.pos[2] - z) < r),
    );
  // ---------------------------------------------------------------- ferramentas de bloco
  const chao = (x0: number, z0: number, w: number, d: number, b: number) => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) por(x, O.y, z, b);
  };
  /** Uma árvore do gerador do jogo (a mesma forma do mundo), com o tronco e a folha dados. */
  function arvore(x: number, z: number, forma: FormaArvore, tronco: number, folha: number) {
    // nenhuma copa em cima de onde a câmera das fotos fica
    if (pertoDeCamera(x, z, 4.5)) return;
    const buf = new Uint8Array(TAM_X * TAM_Z * ALTURA);
    const r = hash2(x, z, 77);
    arvoreDaForma(buf, 8, O.y, 8, r, forma, tronco, folha);
    for (let y = O.y + 1; y < Math.min(ALTURA, O.y + 18); y++)
      for (let lz = 0; lz < TAM_Z; lz++)
        for (let lx = 0; lx < TAM_X; lx++) {
          const b = buf[indice(lx, y, lz)];
          if (b) por(x + lx - 8, y, z + lz - 8, b);
        }
  }
  const arvoreDoBosque = (x: number, z: number) =>
    hash2(x, z, 31) < 0.62
      ? arvore(x, z, 'carvalho', Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAS_OUTONO)
      : arvore(x, z, 'betula', Bloco.TRONCO_BETULA, Bloco.FOLHAS_BETULA);
  const arvoreDaBeira = (x: number, z: number) => {
    const h = hash2(x, z, 41);
    if (h < 0.55) arvore(x, z, 'carvalho', Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAGEM);
    else if (h < 0.85) arvore(x, z, 'carvalho', Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAS_OUTONO);
    else arvore(x, z, 'betula', Bloco.TRONCO_BETULA, Bloco.FOLHAS_BETULA);
  };
  /** Uma peça no mundo: o referencial no ponto (x, y, z) com a frente para `dir`. */
  const peca = (x: number, y: number, z: number, dir: number, f: (r: Ref) => void) =>
    pecasDepois.push((d) => f(new Ref(d, { tipo: 'banco', x, y, z, dir } as PecaVila)));

  // ---------------------------------------------------------------- a abóbora gigante
  /** A abóbora gigante de blocos (o meio da base em cx, cz), com o rosto para +z. */
  function aboboraGigante(cx: number, cz: number) {
    const Y0 = O.y + 1;
    const rx = 6.4;
    const ry = 4.4;
    const rz = 5.6;
    const cy = 3.5;
    const perfil = (x: number, y: number) => (x / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
    // a frente do rosto é reta (z = 5): os degraus da casca não fazem sombra em volta da
    // carinha (de longe a sombra parecia parte do entalhe)
    const dentro = (x: number, y: number, z: number) =>
      perfil(x, y) + (z / rz) ** 2 <= 1 ||
      (Math.abs(x) <= 3 && y >= 0 && y <= 6 && z >= 0 && z <= 5 && perfil(x, y) <= 1);
    // o rosto (coordenadas locais x, y): olhos 2 × 2 e o sorriso em U fino, sem dente; uma
    // fileira de casca entre os olhos e o sorriso (para nada grudar e virar máscara)
    const ehRosto = (x: number, y: number) =>
      (y >= 4 && y <= 5 && (x === -3 || x === -2 || x === 2 || x === 3)) ||
      (y === 1 && x >= -3 && x <= 3) ||
      (y === 2 && (x === -3 || x === 3));
    for (let y = 0; y <= 8; y++)
      for (let x = -7; x <= 7; x++)
        for (let z = -6; z <= 6; z++) {
          if (!dentro(x, y, z)) continue;
          // só a casca (o miolo não aparece)
          if (
            dentro(x + 1, y, z) &&
            dentro(x - 1, y, z) &&
            dentro(x, y + 1, z) &&
            dentro(x, y - 1, z) &&
            dentro(x, y, z + 1) &&
            dentro(x, y, z - 1)
          )
            continue;
          // o gomo: o vinco mais escuro a cada 36 graus, em pé
          const a = Math.atan2(x / rx, z / rz);
          const g = Math.abs(((a / (Math.PI / 5)) % 1) + 1) % 1;
          // (sem vinco na frente do rosto: a carinha fica limpa de ler)
          const naCara = z > 0 && Math.abs(x) <= 5 && y >= 0 && y <= 7;
          let b: number = !naCara && (g < 0.17 || g > 0.9) ? Bloco.LA_VERMELHA : Bloco.LA_LARANJA;
          const frente = !dentro(x, y, z + 1) && z > 0;
          if (frente && ehRosto(x, y)) {
            rosto.push([cx + x, Y0 + y, cz + z]);
            b = Bloco.LA_PRETA;
          }
          por(cx + x, Y0 + y, cz + z, b);
        }
    // o cabinho torto (em degraus) e a folha musgo
    const topo = Y0 + 8;
    por(cx, topo, cz, Bloco.LA_VERDE);
    por(cx, topo + 1, cz, Bloco.LA_VERDE);
    por(cx + 1, topo + 1, cz, Bloco.LA_VERDE);
    por(cx + 1, topo + 2, cz, Bloco.LA_VERDE);
    for (const [dx, dz] of [
      [-1, 0],
      [-2, 0],
      [-1, 1],
      [-2, -1],
      [-3, -1],
    ])
      por(cx + dx, topo, cz + dz, Bloco.LA_VERDE);
    pontos.abobora = [cx, Y0, cz];
    pontos.cabinho = [cx + 1.5, topo + 3, cz + 0.5];
  }

  // ---------------------------------------------------------------- a praça
  /** O palco de tábuas (9 × 5, a frente para +z em z0 + 4) com a cortina roxa. */
  function palco(x0: number, z0: number) {
    const Y = O.y;
    for (let x = x0; x < x0 + 9; x++)
      for (let z = z0; z < z0 + 5; z++) por(x, Y + 1, z, Bloco.TABUAS_PINHO);
    // a escadinha no meio da frente
    for (let x = x0 + 3; x < x0 + 6; x++) por(x, Y + 1, z0 + 5, Bloco.ESCADA, 2);
    // a parede do fundo: a cortina de veludo na moldura de tábuas
    for (let x = x0; x < x0 + 9; x++)
      for (let y = Y + 2; y <= Y + 6; y++) {
        const moldura = x === x0 || x === x0 + 8 || y === Y + 6;
        por(x, y, z0, moldura ? Bloco.TABUAS_PINHO : Bloco.REBOCO_ROSA);
      }
    // o arco de cima, em degraus (torto de propósito: um lado mais alto)
    for (let x = x0 + 1; x < x0 + 8; x++) por(x, Y + 7, z0, Bloco.TABUAS_PINHO);
    for (let x = x0 + 3; x < x0 + 7; x++) por(x, Y + 8, z0, Bloco.TELHA_COLONIAL);
    // os dois mastros da frente (cerca) e as abóboras acesas nos cantos
    for (const x of [x0, x0 + 8]) for (let y = Y + 2; y <= Y + 5; y++) por(x, y, z0 + 4, Bloco.CERCA);
    por(x0 + 1, Y + 2, z0 + 4, Bloco.LAMPIAO_ABOBORA, 0);
    por(x0 + 7, Y + 2, z0 + 4, Bloco.LAMPIAO_ABOBORA, 0);
    pontos.palco = [x0 + 4.5, Y + 2, z0 + 2.5];
    // as bandeirolas de um mastro ao outro, e dos mastros à cortina
    const a: V3 = [x0 + 0.5, Y + 6.0, z0 + 4.5];
    const b: V3 = [x0 + 8.5, Y + 6.0, z0 + 4.5];
    peca(a[0], 0, a[2], 0, (r) => {
      const l = (p: V3): V3 => [p[0] - a[0], p[1], p[2] - a[2]];
      bandeirolas(r, l(a), l(b), 0.6);
      bandeirolas(r, l(a), l([x0 + 0.5, Y + 6.8, z0 + 0.6]), 0.3, false);
      bandeirolas(r, l(b), l([x0 + 8.5, Y + 6.8, z0 + 0.6]), 0.3, false);
    });
  }

  /** Barraca de tábuas (6 × 4, o balcão de frente para +z) com o toldo listrado. */
  function barraca(x0: number, z0: number, toldo: number, qual: 'doce' | 'maca') {
    const Y = O.y;
    for (let x = x0; x < x0 + 6; x++)
      for (let z = z0; z < z0 + 4; z++) {
        const borda = x === x0 || x === x0 + 5 || z === z0 || z === z0 + 3;
        const frente = z === z0 + 3 && x > x0 && x < x0 + 5;
        por(x, Y, z, Bloco.TABUAS);
        if (borda && !frente) for (let y = Y + 1; y <= Y + 2; y++) por(x, y, z, Bloco.TABUAS);
        if (frente) por(x, Y + 1, z, Bloco.TABUAS);
        por(x, Y + 3, z, toldo);
      }
    for (let x = x0; x < x0 + 6; x++) por(x, Y + 3, z0 + 4, toldo);
    por(x0 + 2, Y + 2, z0 + 1, Bloco.LANTERNA);
    // a toalha de festa no balcão, o que se vende em cima e a plaquinha desenhada no toldo
    peca(x0 + 3, Y + 1, z0 + 4, 0, (r) =>
      toalhaBalcao(r, 4, qual === 'doce' ? CORES.laranja : CORES.roxo),
    );
    peca(x0 + 3, Y + 2.06, z0 + 3.5, 0, qual === 'doce' ? balcaoDoce : balcaoMaca);
    peca(x0 + 3, Y + 3.5, z0 + 4.5, 0, qual === 'doce' ? placaDoce : placaMaca);
    // uma abóbora acesa na frente, do lado do balcão
    por(x0 - 1, Y + 1, z0 + 4, Bloco.LAMPIAO_ABOBORA, 0);
  }

  function praca() {
    const { ox, oz } = O;
    const Y = O.y;
    // o chão de pedrinha lilás, com a beira de grama
    chao(ox + 30, oz + 28, 46, 26, Bloco.PEDREGULHO);
    aboboraGigante(ox + 53, oz + 36);
    palco(ox + 33, oz + 32);
    barraca(ox + 62, oz + 33, Bloco.TOLDO_VERMELHO, 'doce');
    barraca(ox + 69, oz + 33, Bloco.TOLDO_VERDE, 'maca');
    // abóboras acesas em volta da praça (a festa), viradas para dentro
    for (let x = ox + 32; x < ox + 76; x += 6)
      if (Math.abs(x - (ox + 53)) > 2) por(x, Y + 1, oz + 53, Bloco.LAMPIAO_ABOBORA, 2);
    for (let z = oz + 42; z < oz + 54; z += 5) {
      por(ox + 30, Y + 1, z, Bloco.LAMPIAO_ABOBORA, 1);
      por(ox + 75, Y + 1, z, Bloco.LAMPIAO_ABOBORA, 3);
    }
    // os mastros das bandeirolas na frente da praça; os fios sobem até o cabinho da abóbora
    const mastros: [number, number][] = [
      [ox + 31.5, oz + 47.5],
      [ox + 44.5, oz + 49.5],
      [ox + 62.5, oz + 49.5],
      [ox + 74.5, oz + 47.5],
    ];
    const H = 5.2;
    for (const [x, z] of mastros) peca(x, Y + 1, z, 0, (r) => mastro(r, H));
    // a ponta dos fios presa na frente do cabinho (o bloco de baixo dele)
    const [cx, cy, cz] = pontos.cabinho;
    const ponta: V3 = [cx - 1, cy - 1.6, cz + 0.58];
    peca(ponta[0], 0, ponta[2], 0, (r) => {
      const l = (p: V3): V3 => [p[0] - ponta[0], p[1], p[2] - ponta[2]];
      for (const [x, z] of mastros) bandeirolas(r, l(ponta), l([x, Y + 1 + H + 0.2, z]), 1.0);
      // e as dos mastros da ponta até o palco e as barracas
      bandeirolas(r, l([mastros[0][0], Y + 1 + H, mastros[0][1]]), l([ox + 33.5, Y + 6, oz + 36.5]), 0.7);
      bandeirolas(r, l([mastros[3][0], Y + 1 + H, mastros[3][1]]), l([ox + 76.5, Y + 1 + H, oz + 38.5]), 0.7);
    });
    peca(ox + 76.5, Y + 1, oz + 38.5, 0, (r) => mastro(r, H));
    pontos.praca = [ox + 53, Y + 1, oz + 48];
    pontos.barracas = [ox + 68.5, Y + 1, oz + 37];
  }

  // ---------------------------------------------------------------- a rua
  interface Casinha {
    x0: number;
    /** Largura (x) e fundo (z); a frente olha para +z, em z0 + d - 1. */
    w: number;
    d: number;
    /** Altura do térreo (a porta tem 2). */
    H: number;
    /** O andar de cima, desencontrado um bloco para o lado (a casinha de história torta). */
    andar?: { desl: 1 | -1; H: number };
    parede: number;
    /** Quanto o telhado sobe por coluna (2 é o chapéu de bruxa) e onde a cumeeira cai. */
    passo: 1 | 2;
    torto: number;
    chamine: 1 | -1;
    /** A cor das folhas das janelas (as portinhas dos lados). */
    folhas: string;
    /** O toldinho por cima da porta. */
    toldo: number;
    vovo?: boolean;
  }
  function casinha(c: Casinha, z0: number) {
    const Y = O.y;
    const { x0, w, d, H } = c;
    const zf = z0 + d - 1;
    const meio = x0 + Math.floor(w / 2);
    /** As janelas da frente (x, y), para as folhas de abrir. */
    const janelas: [number, number][] = [];
    /** As paredes de uma caixa (as quinas de tábua), de x0 a x1 e de y0 a y1. */
    const paredes = (a: number, b: number, y0: number, y1: number, cinta: boolean) => {
      for (let x = a; x <= b; x++)
        for (let z = z0; z <= zf; z++) {
          const borda = x === a || x === b || z === z0 || z === zf;
          if (!borda) continue;
          const quina = (x === a || x === b) && (z === z0 || z === zf);
          for (let y = y0; y <= y1; y++)
            por(x, y, z, quina || (cinta && y === y0) ? Bloco.TABUAS_PINHO : c.parede);
        }
    };
    // o térreo: o piso de tábuas e as paredes
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z <= zf; z++) por(x, Y, z, Bloco.TABUAS);
    paredes(x0, x0 + w - 1, Y + 1, Y + H, false);
    // o andar de cima, desencontrado para o lado, com a cinta de tábua embaixo
    const tx0 = x0 + (c.andar?.desl ?? 0);
    const tx1 = tx0 + w - 1;
    const topo = Y + H + (c.andar?.H ?? 0);
    if (c.andar) paredes(tx0, tx1, Y + H + 1, topo, true);
    // a porta no meio da frente, o toldinho por cima e as janelas acesas
    por(meio, Y + 1, zf, Bloco.PORTA, 0);
    por(meio, Y + 2, zf, Bloco.PORTA, 0);
    for (let x = meio - 1; x <= meio + 1; x++) por(x, Y + 3, zf + 1, c.toldo);
    for (const x of [x0 + 1, x0 + w - 2])
      if (Math.abs(x - meio) > 1) {
        por(x, Y + 2, zf, Bloco.JANELA_ACESA);
        janelas.push([x, Y + 2]);
      }
    if (c.andar)
      for (const x of [tx0 + 1, tx1 - 1]) {
        por(x, Y + H + 2, zf, Bloco.JANELA_ACESA);
        janelas.push([x, Y + H + 2]);
      }
    for (const z of [z0 + 2, zf - 2]) {
      por(x0, Y + 2, z, Bloco.JANELA_ACESA);
      por(x0 + w - 1, Y + 2, z, Bloco.JANELA_ACESA);
    }
    // o telhado roxo em degraus (o chapéu de bruxa sobe dois por coluna), a cumeeira torta
    const xa = tx0 - 1;
    const xb = tx1 + 1;
    const cume = Math.floor((xa + xb) / 2) + c.torto;
    const h: number[] = [];
    for (let x = xa; x <= xb; x++)
      h.push(x <= cume ? (x - xa) * c.passo : Math.min((xb - x) * c.passo, (cume - xa) * c.passo));
    for (let z = z0 - 1; z <= zf + 1; z++)
      for (let i = 0; i < h.length; i++) {
        const x = xa + i;
        // a telha desce até encostar na coluna vizinha (o degrau nunca deixa buraco)
        const viz = Math.min(h[i - 1] ?? -1, h[i + 1] ?? -1);
        const base = Math.max(0, Math.min(h[i], viz + 1));
        for (let k = base; k <= h[i]; k++) por(x, topo + 1 + k, z, Bloco.TELHA_COLONIAL);
        // o oitão (a parede em triângulo) na frente e no fundo
        if ((z === z0 || z === zf) && x > xa && x < xb)
          for (let k = 0; k < base; k++) por(x, topo + 1 + k, z, c.parede);
      }
    // a janelinha do sótão, na frente, debaixo da cumeeira
    const hCume = h[cume - xa];
    if (hCume >= 3) por(cume, topo + 2, zf, Bloco.JANELA_ACESA);
    // a chaminé de tijolo, inclinada em degraus (o degrau sempre encostado no de baixo)
    const chX = c.chamine === 1 ? tx1 - 1 : tx0 + 1;
    const y0 = topo + 1 + h[chX - xa];
    for (let k = 0; k < 4; k++) {
      const x = chX + c.chamine * Math.floor(k / 2);
      por(x, y0 + k, z0 + 1, Bloco.TIJOLOS);
      if (k > 0 && k % 2 === 0) por(x - c.chamine, y0 + k, z0 + 1, Bloco.TIJOLOS);
    }
    // a varanda de tábuas, a abóbora acesa do lado da porta e a campainha
    for (let x = meio - 1; x <= meio + 1; x++) por(x, Y, zf + 1, Bloco.TABUAS);
    por(meio + 2, Y + 1, zf + 1, Bloco.LAMPIAO_ABOBORA, 0);
    peca(meio - 0.85, Y + 2.0, zf + 1, 0, campainha);
    // as folhas das janelas (as portinhas abertas dos lados)
    for (const [x, y] of janelas)
      peca(x + 0.5, y, zf + 1, 0, (r) => {
        for (const s of [-1, 1]) {
          r.caixa(0.26, 0.94, 0.06, s * 0.64, 0.03, 0.03, c.folhas, 0.02);
          r.caixa(0.12, 0.12, 0.07, s * 0.64, 0.44, 0.04, '#f6ecd8', 0.02);
        }
      });
    // as teias de barbante nos cantos de cima da frente (debaixo do beiral)
    peca(tx0 + 0.04, topo + 0.96, zf + 1.04, 0, (r) => teia(r, 1.2, 1));
    if (c.vovo) {
      peca(tx1 + 0.96, topo + 0.96, zf + 1.04, 0, (r) => teia(r, 0.9, -1));
      // a Vovó Zuleica: a varanda coberta, o caldeirão e a vassoura encostada
      for (let x = x0; x < x0 + w; x++)
        for (const z of [zf + 1, zf + 2]) {
          por(x, Y, z, Bloco.TABUAS);
          por(x, Y + 3, z, Bloco.TOLDO_VERDE);
        }
      for (const x of [x0, x0 + w - 1]) for (let y = Y + 1; y <= Y + 2; y++) por(x, y, zf + 2, Bloco.CERCA);
      peca(meio - 2.5, Y + 1, zf + 1.6, 0, caldeirao);
      peca(meio + 1.6, Y + 1, zf + 1, 0, vassoura);
      peca(meio + 0.5, Y + H + 2.5, zf + 1, 0, luaEstrelas);
      pontos.vovo = [meio + 0.5, Y + 1, zf + 1];
    }
  }

  function rua() {
    const { ox, oz } = O;
    const Y = O.y;
    // a rua de pedrinha, de leste a oeste
    chao(ox + 4, oz + 22, 78, 4, Bloco.PEDREGULHO);
    const casas: Casinha[] = [
      {
        x0: ox + 7,
        w: 7,
        d: 6,
        H: 3,
        parede: Bloco.REBOCO_AMARELO,
        passo: 2,
        torto: 1,
        chamine: -1,
        folhas: '#5a7630',
        toldo: Bloco.TOLDO_VERMELHO,
      },
      {
        x0: ox + 19,
        w: 7,
        d: 6,
        H: 3,
        andar: { desl: 1, H: 3 },
        parede: Bloco.REBOCO_MENTA,
        passo: 1,
        torto: -1,
        chamine: 1,
        folhas: '#6a3e9c',
        toldo: Bloco.TOLDO_VERDE,
      },
      {
        x0: ox + 32,
        w: 9,
        d: 6,
        H: 3,
        andar: { desl: -1, H: 3 },
        parede: Bloco.REBOCO_AMARELO,
        passo: 1,
        torto: 1,
        chamine: 1,
        folhas: '#6a3e9c',
        toldo: Bloco.TOLDO_VERDE,
        vovo: true,
      },
      {
        x0: ox + 47,
        w: 7,
        d: 6,
        H: 3,
        parede: Bloco.REBOCO_MENTA,
        passo: 2,
        torto: -1,
        chamine: 1,
        folhas: '#d8701c',
        toldo: Bloco.TOLDO_VERMELHO,
      },
    ];
    for (const c of casas) casinha(c, oz + 13);
    // as lanternas da rua, do outro lado das casas
    for (const x of [12, 26, 45, 58, 70]) postoLanterna(ox + x, oz + 26, true);
    pontos.rua = [ox + 30, Y + 1, oz + 24];
    // o caminho da rua à praça
    chao(ox + 51, oz + 26, 4, 2, Bloco.PEDREGULHO);
  }

  // ---------------------------------------------------------------- o bosque
  /** Um poste de lanterna: dois blocos de cerca e a lanterna (acesa ou apagada) no alto. */
  function postoLanterna(x: number, z: number, acesa: boolean, doBosque = false) {
    const Y = O.y;
    por(x, Y + 1, z, Bloco.CERCA);
    por(x, Y + 2, z, Bloco.CERCA);
    por(x, Y + 3, z, acesa ? Bloco.LANTERNA : Bloco.LA_BRANCA);
    if (doBosque) lanternas.push({ p: [x, Y + 3, z], acesa });
    peca(x + 0.5, Y + 4, z + 0.5, 0, capaLanterna);
  }

  /** O meio da trilha do bosque (x local) em cada z local. */
  const trilha = (z: number) => Math.round(98 + 4 * Math.sin(z / 9));
  function bosque() {
    const { ox, oz } = O;
    const Y = O.y;
    // a trilha de terra batida que serpenteia de norte a sul
    for (let z = 2; z < D - 2; z++) {
      const c = trilha(z);
      for (let dx = -1; dx <= 1; dx++) por(ox + c + dx, Y, oz + z, Bloco.CASCALHO);
    }
    // o caminho da praça até a trilha
    for (let x = 76; x <= trilha(46) - 2; x++) chao(ox + x, oz + 45, 1, 3, Bloco.PEDREGULHO);
    // os postes-lanterna, um de cada lado; metade acesa, metade apagada
    let i = 0;
    for (let z = 6; z < D - 4; z += 7) {
      const lado = i % 2 ? 1 : -1;
      postoLanterna(ox + trilha(z) + lado * 3, oz + z, i % 2 === 0, true);
      i++;
    }
    // as árvores do bosque (do gerador do jogo, de folhas laranja e douradas)
    for (let z = 3; z < D - 2; z += 5)
      for (let x = 82; x < W + 6; x += 5) {
        const jx = x + Math.floor(hash2(x, z, 3) * 3) - 1;
        const jz = z + Math.floor(hash2(x, z, 4) * 3) - 1;
        if (Math.abs(jx - trilha(jz)) < 5) continue;
        if (jz > 42 && jz < 50 && jx < trilha(46)) continue;
        if (hash2(x, z, 5) < 0.18) continue;
        arvoreDoBosque(ox + jx, oz + jz);
      }
    // a árvore do galho dos morceguinhos (parte 2): um carvalho com o galho sobre a trilha
    const gz = 30;
    const gx = trilha(gz) + 5;
    arvore(ox + gx, oz + gz, 'carvalho', Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAS_OUTONO);
    for (let k = 1; k <= 3; k++) por(ox + gx - k, Y + 4, oz + gz, Bloco.MADEIRA_RETORCIDA);
    pontos.galho = [ox + gx - 2, Y + 4, oz + gz + 0.5];
    // o capim no chão do bosque
    for (let z = 2; z < D - 2; z++)
      for (let x = 82; x < W; x++) {
        if (Math.abs(x - trilha(z)) < 2) continue;
        if (hash2(x, z, 9) < 0.06) por(ox + x, Y + 1, oz + z, Bloco.GRAMA_ALTA);
      }
    // os vaga-lumes (de noite)
    for (let k = 0; k < 40; k++) {
      const z = 4 + hash2(k, 1, 51) * (D - 8);
      const x = trilha(z) + (hash2(k, 2, 51) - 0.5) * 12;
      if (pertoDeCamera(ox + x, oz + z, 6)) continue;
      vagalumes.push([ox + x, Y + 1.2 + hash2(k, 3, 51) * 2.4, oz + z]);
    }
    pontos.bosque = [ox + trilha(60), Y + 1, oz + 60];
    pontos.bosqueNorte = [ox + trilha(20), Y + 1, oz + 20];
  }

  // ---------------------------------------------------------------- a horta
  function horta() {
    const { ox, oz } = O;
    const Y = O.y;
    const [x0, z0, w, d] = [ox + 7, oz + 38, 12, 9];
    // o canteiro de terra arada, os pés de abóbora e as abóboras de três tamanhos
    for (let x = x0; x < x0 + w; x++)
      for (let z = z0; z < z0 + d; z++) {
        por(x, Y, z, Bloco.TERRA_ARADA);
        const h = hash2(x, z, 61);
        if ((z - z0) % 3 !== 1 && h < 0.55) por(x, Y + 1, z, Bloco.ABOBOREIRA_3);
      }
    // as grandes (peças de brinquedo, maiores que a criança de colo)
    for (const [gx, gz] of [
      [x0 + 2, z0 + 2],
      [x0 + 8, z0 + 5],
    ]) {
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) por(gx + dx, Y + 1, gz + dz, Bloco.AR);
      peca(gx + 0.5, Y + 1, gz + 0.5, 0, (r) => aboborinha(r, 0, 0, 0, 3.2));
    }
    // as médias (o bloco de abóbora do jogo)
    for (const [ax, az] of [
      [x0 + 5, z0 + 1],
      [x0 + 10, z0 + 2],
      [x0 + 4, z0 + 6],
      [x0 + 1, z0 + 7],
      [x0 + 10, z0 + 8],
    ])
      por(ax, Y + 1, az, Bloco.ABOBORA);
    // as pequenas (peças)
    peca(x0 + 0, Y + 1, z0, 0, (r) => {
      for (const [ax, az] of [
        [7.5, 1.5],
        [3.5, 4.5],
        [6.5, 7.5],
        [11.5, 4.5],
        [9.5, 0.5],
        [2.5, 8.5],
      ])
        aboborinha(r, ax, 0, az, 0.9);
    });
    // a cerquinha em volta, com a passagem na frente
    for (let x = x0 - 1; x <= x0 + w; x++) {
      por(x, Y + 1, z0 - 1, Bloco.CERCA);
      if (x < x0 + 4 || x > x0 + 6) por(x, Y + 1, z0 + d, Bloco.CERCA);
    }
    for (let z = z0; z < z0 + d; z++) {
      por(x0 - 1, Y + 1, z, Bloco.CERCA);
      por(x0 + w, Y + 1, z, Bloco.CERCA);
    }
    // a bancada das carinhas, na frente do canteiro, e o monte da colheita (feno e abóboras)
    peca(x0 + 5.5, Y + 1, z0 + d + 2.6, 0, bancada);
    chao(x0 + 3, z0 + d + 1, 6, 4, Bloco.CASCALHO);
    for (const [fx, fy, fz, b] of [
      [x0 + w + 2, 1, z0 + d - 1, Bloco.FENO],
      [x0 + w + 3, 1, z0 + d - 1, Bloco.FENO],
      [x0 + w + 2, 1, z0 + d, Bloco.FENO],
      [x0 + w + 2, 2, z0 + d - 1, Bloco.FENO],
      [x0 + w + 3, 1, z0 + d, Bloco.ABOBORA],
      [x0 + w + 3, 2, z0 + d - 1, Bloco.ABOBORA],
      [x0 + w + 4, 1, z0 + d - 1, Bloco.LAMPIAO_ABOBORA],
    ] as const)
      por(fx, Y + fy, fz, b, b === Bloco.LAMPIAO_ABOBORA ? 0 : 0);
    // o caminho da horta à praça
    chao(ox + 19, oz + 50, 11, 3, Bloco.PEDREGULHO);
    pontos.horta = [x0 + w / 2, Y + 1, z0 + d / 2];
    pontos.bancada = [x0 + 5.5, Y + 1, z0 + d + 2.6];
  }

  // ---------------------------------------------------------------- montar
  function montar() {
    const eb = e.bloco!;
    const [px, , pz] = e.posicao!;
    const ox = Math.floor(px) - Math.floor(W / 2);
    const oz = Math.floor(pz) - Math.floor(D / 2);
    // o chão do palco: a mediana das alturas do terreno (sem contar árvore)
    const alturas: number[] = [];
    for (let x = ox; x < ox + W; x += 4)
      for (let z = oz; z < oz + D; z += 4)
        for (let y = 120; y > 1; y--) {
          const b = eb(x, y, z);
          if (b && !ARVORE_OU_MATO.has(b)) {
            alturas.push(y);
            break;
          }
        }
    alturas.sort((a, b) => a - b);
    const Y = Math.max(63, alturas[Math.floor(alturas.length / 2)] ?? 64);
    O = { ox, oz, y: Y };
    // as tomadas primeiro: as árvores e os vaga-lumes deixam o lugar da câmera livre
    definirTomadas();
    // aplaina: o que está acima sai, o que falta embaixo vira terra (com a grama no alto)
    for (let x = ox - M; x < ox + W + M; x++)
      for (let z = oz - M; z < oz + D + M; z++) {
        for (let y = Y + 1; y < Math.min(127, Y + 60); y++) if (eb(x, y, z)) por(x, y, z, Bloco.AR);
        for (let y = Y - 1; y > Y - 30; y--) {
          const b = eb(x, y, z);
          if (b && b !== Bloco.AGUA && !ARVORE_OU_MATO.has(b)) break;
          por(x, y, z, Bloco.TERRA);
        }
        por(x, Y, z, Bloco.TERRA_MUSGOSA);
      }
    // os morros altos à vista (fora do palco) ficam baixinhos: o topo vira um platô de grama
    const cxm = ox + W / 2;
    const czm = oz + D / 2;
    const TETO = Y + 6;
    for (let x = cxm - 126; x < cxm + 126; x++)
      for (let z = czm - 126; z < czm + 126; z++) {
        if (x >= ox - M && x < ox + W + M && z >= oz - M && z < oz + D + M) continue;
        if (Math.hypot(x - cxm, z - czm) > 126 || !eb(x, TETO + 1, z)) continue;
        // só onde o chão (não a copa de uma árvore) passa do teto
        let chaoAlto = false;
        for (let y = Math.min(126, TETO + 60); y > TETO; y--) {
          const b = eb(x, y, z);
          if (b && !ARVORE_OU_MATO.has(b)) {
            chaoAlto = true;
            break;
          }
        }
        if (!chaoAlto) continue;
        for (let y = TETO + 1; y < Math.min(127, TETO + 60); y++) if (eb(x, y, z)) por(x, y, z, Bloco.AR);
        const b = eb(x, TETO, z);
        if (b && !ARVORE_OU_MATO.has(b)) por(x, TETO, z, Bloco.TERRA_MUSGOSA);
      }
    praca();
    rua();
    bosque();
    horta();
    // árvores do gerador atrás das casas e na beira do palco (a moldura)
    for (let x = 2; x < 80; x += 6) {
      const jz = 3 + Math.floor(hash2(x, 1, 81) * 5);
      if (hash2(x, 2, 81) < 0.25) continue;
      arvoreDaBeira(ox + x + Math.floor(hash2(x, 3, 81) * 3), oz + jz);
    }
    for (let k = 0; k < 64; k++) {
      // um anel em volta, fora do palco e dentro da margem aplainada
      const a = (k / 64) * Math.PI * 2 + hash2(k, 0, 91) * 0.08;
      const rx = W / 2 + 6 + hash2(k, 1, 91) * 12;
      const rz = D / 2 + 6 + hash2(k, 2, 91) * 12;
      const x = Math.round(ox + W / 2 + Math.cos(a) * rx);
      const z = Math.round(oz + D / 2 + Math.sin(a) * rz);
      arvoreDaBeira(x, z);
    }
    // a horta e a beira oeste da praça: árvores soltas
    for (const [x, z] of [
      [4, 66],
      [12, 70],
      [24, 64],
      [27, 36],
      [26, 76],
      // o sul da praça, até o bosque: árvores soltas e moitas de abóbora
      [40, 70],
      [52, 78],
      [64, 68],
      [74, 80],
      [34, 82],
    ])
      arvoreDaBeira(ox + x, oz + z);
    for (const [x, z] of [
      [46, 66],
      [58, 72],
      [70, 64],
      [30, 70],
    ]) {
      por(ox + x, Y + 1, oz + z, Bloco.ABOBORA);
      por(ox + x + 1, Y + 1, oz + z, Bloco.GRAMA_ALTA);
    }
    enviar();
    pontos.origem = [ox, Y, oz];
    // as peças só nascem depois que as edições de bloco chegaram (antes, sumiam do desenho)
    setTimeout(montarPecas, 2500);
    return O;
  }

  // ---------------------------------------------------------------- as tomadas das fotos
  const tomadas: Record<string, Record<'deitado' | 'empe', Tomada>> = {};
  /** Onde a câmera fica para cada lugar (deitado: tela larga; em pé: tela comprida). */
  function definirTomadas() {
    const { ox, oz, y } = O;
    const P = (x: number, h: number, z: number): V3 => [ox + x, y + h, oz + z];
    const t = (pos: V3, alvo: V3, fov: number): Tomada => ({ pos, alvo, fov });
    const bz = D - 4;
    tomadas.praca = {
      deitado: t(P(53.5, 3.4, 54), P(53.5, 4.4, 36), 58),
      empe: t(P(53.5, 3.8, 62), P(53.5, 5.0, 36), 72),
    };
    tomadas.barracas = {
      deitado: t(P(69.5, 2.6, 44.5), P(70.5, 2.6, 36), 56),
      empe: t(P(71.5, 2.8, 44.5), P(71.5, 2.4, 36), 72),
    };
    tomadas.rua = {
      deitado: t(P(2, 3.0, 24.5), P(27, 4.0, 16.5), 56),
      empe: t(P(3, 2.9, 24.5), P(24, 4.6, 16.5), 66),
    };
    tomadas.vovo = {
      deitado: t(P(36.5, 3.0, 30), P(36.5, 4.4, 18), 56),
      empe: t(P(36.5, 3.0, 30), P(36.5, 5.0, 18), 80),
    };
    tomadas.bosque = {
      deitado: t(P(trilha(bz) + 0.5, 2.5, bz), P(trilha(66) + 0.5, 2.6, 66), 56),
      empe: t(P(trilha(bz) + 0.5, 2.4, bz), P(trilha(66) + 0.5, 3.2, 66), 66),
    };
    tomadas.horta = {
      deitado: t(P(14, 3.6, 54.5), P(12.5, 1.0, 44), 56),
      empe: t(P(13.5, 4.6, 58.5), P(12.5, 1.2, 44), 66),
    };
    tomadas.panorama = {
      deitado: t(P(57, 25, 84), P(52, 0, 30), 58),
      empe: t(P(56, 30, 90), P(52, 0, 34), 64),
    };
  }

  // ---------------------------------------------------------------- as peças
  let vagalumesMalha: Mesh | null = null;
  const luzes: Mesh[] = [];
  function montarPecas() {
    const corpo = new Pecas();
    const luz = new Pecas();
    const d: Desenho = {
      corpo,
      luz,
      noite: new Pecas(),
      vidro: new Pecas(),
      quadros: [],
      ox: O.ox,
      oz: O.oz,
      chao: O.y + 1,
      recorte: { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 },
    };
    for (const f of pecasDepois) f(d);
    const mc = new Mesh('esboco-fantasias-pecas', scene);
    corpo.juntar().applyToMesh(mc);
    mc.material = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
    mc.position.set(O.ox, 0, O.oz);
    mc.receiveShadows = true;
    mc.isPickable = false;
    // o plástico não brilha de noite (como as peças da Vila e o boneco: fica fora do glow)
    const glow = scene.effectLayers?.find((l) => l.name === 'glow') as GlowLayer | undefined;
    glow?.addExcludedMesh(mc);
    // as luzes: uma malha por cor, acesa (o brilho da noite sai da cor de cada uma)
    const porCor = new Map<string, Pecas>();
    for (const vd of luz.partes) {
      const c = vd.colors!;
      const k = Color3.FromArray([c[0], c[1], c[2]]).toHexString();
      let p = porCor.get(k);
      if (!p) porCor.set(k, (p = new Pecas()));
      p.partes.push(vd);
    }
    for (const [k, p] of porCor) {
      const m = new Mesh(`esboco-fantasias-luz-${k}`, scene);
      p.juntar().applyToMesh(m);
      m.material = acesa(k);
      m.position.set(O.ox, 0, O.oz);
      m.isPickable = false;
      luzes.push(m);
    }
    // os vaga-lumes: cubinhos acesos, só de noite
    const vg = new Pecas();
    const rv = new Ref({ ...d, luz: vg }, { tipo: 'banco', x: O.ox, y: 0, z: O.oz, dir: 0 } as PecaVila);
    for (const [x, y, z] of vagalumes) rv.luz(0.1, 0.1, 0.1, x - O.ox, y, z - O.oz, '#fff0a0');
    vagalumesMalha = new Mesh('esboco-fantasias-vagalumes', scene);
    vg.juntar().applyToMesh(vagalumesMalha);
    vagalumesMalha.material = acesa('#fff0a0');
    vagalumesMalha.position.set(O.ox, 0, O.oz);
    vagalumesMalha.isPickable = false;
    vagalumesMalha.setEnabled(ehNoite);
    nevoa();
  }
  const materiais = new Map<string, StandardMaterial>();
  const acesa = (hex: string) => {
    let m = materiais.get(hex);
    if (!m) {
      m = new StandardMaterial(`esboco-fantasias-aceso-${hex}`, scene);
      m.disableLighting = true;
      m.emissiveColor = Color3.FromHexString(hex);
      m.diffuseColor = Color3.Black();
      m.specularColor = Color3.Black();
      materiais.set(hex, m);
    }
    return m;
  };

  // ---------------------------------------------------------------- a névoa baixa
  let brumas: ParticleSystem[] = [];
  function nevoa() {
    const tex = new DynamicTexture('esboco-nevoa', { width: 64, height: 64 }, scene, false);
    const g = tex.getContext();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    tex.update();
    tex.hasAlpha = true;
    // a névoa mora no bosque e na rua das casinhas, rente ao chão
    const areas: [number, number, number, number, number][] = [
      [O.ox + 98, O.oz + 44, 16, 40, 160],
      [O.ox + 32, O.oz + 21, 30, 4, 80],
    ];
    brumas = areas.map(([cx, cz, rx, rz, n], i) => {
      const ps = new ParticleSystem(`esboco-nevoa-${i}`, n, scene);
      ps.particleTexture = tex;
      ps.emitter = new Vector3(cx, O.y + 1.1, cz);
      ps.minEmitBox = new Vector3(-rx, -0.25, -rz);
      ps.maxEmitBox = new Vector3(rx, 0.35, rz);
      ps.minSize = 2.6;
      ps.maxSize = 4.6;
      ps.minLifeTime = 30;
      ps.maxLifeTime = 50;
      ps.emitRate = n / 30;
      ps.direction1 = new Vector3(-0.08, 0, -0.05);
      ps.direction2 = new Vector3(0.08, 0.01, 0.05);
      ps.minEmitPower = 0.2;
      ps.maxEmitPower = 0.4;
      ps.gravity = Vector3.Zero();
      ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
      ps.color1 = new Color4(1, 0.96, 1, 0.16);
      ps.color2 = new Color4(0.96, 0.92, 1, 0.12);
      ps.colorDead = new Color4(1, 1, 1, 0);
      ps.preWarmCycles = 600;
      ps.preWarmStepOffset = 5;
      ps.start();
      return ps;
    });
    corDaNevoa();
  }
  const corDaNevoa = () => {
    // de dia a névoa é quase nada (só um véu dourado); de noite, clarinha
    for (const ps of brumas) {
      ps.color1 = ehNoite ? new Color4(1, 0.96, 1, 0.2) : new Color4(1, 0.93, 0.82, 0.06);
      ps.color2 = ehNoite ? new Color4(0.94, 0.9, 1, 0.15) : new Color4(1, 0.9, 0.8, 0.04);
    }
  };

  // ---------------------------------------------------------------- câmera, hora, lanternas
  let fixa: { p: Vector3; a: Vector3 } | null = null;
  scene.onBeforeCameraRenderObservable.add((cam) => {
    if (!fixa) return;
    const c = cam as TargetCamera;
    c.position.copyFrom(fixa.p);
    c.setTarget(fixa.a);
    c.maxZ = 900;
    // a escolha do que entra no desenho usa a vista do quadro: refaz com a câmera nova
    c.getViewMatrix(true);
    scene.updateTransformMatrix(true);
  });
  let escondido = false;
  scene.onBeforeRenderObservable.add(() => {
    if (!escondido) return;
    for (const m of scene.meshes)
      if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = false;
      // (os sósias de longe do bairro da Vila Neon, o mundo-base, ficam fora das fotos)
      else if (m.name.startsWith('vila-sosia')) m.isVisible = false;
    for (const n of scene.transformNodes)
      if (n.name.startsWith('criatura-') && n.isEnabled()) n.setEnabled(false);
  });
  let ehNoite = false;
  const api: EsbocoFantasias = {
    montar,
    pontos,
    tomadas,
    camera(pos, alvo, fov) {
      fixa = pos && alvo ? { p: new Vector3(...pos), a: new Vector3(...alvo) } : null;
      if (fov && scene.activeCamera) scene.activeCamera.fov = (fov * Math.PI) / 180;
    },
    hora(h) {
      e.pausarDia = true;
      e.hora = h;
      const noite = h > 0.8 || h < 0.22;
      if (noite !== ehNoite) {
        ehNoite = noite;
        for (const [x, y, z] of rosto) por(x, y, z, noite ? Bloco.FAIXA_NEON : Bloco.LA_PRETA);
        enviar();
      }
      vagalumesMalha?.setEnabled(noite);
      corDaNevoa();
      // de noite o plástico das peças escurece um pouco com o chão (nunca o escuro de verdade)
      pl.definirLuz(noite ? 0.72 : 1);
    },
    lanterna(i, acesaAgora) {
      const l = lanternas[i];
      if (!l) return;
      l.acesa = acesaAgora;
      por(l.p[0], l.p[1], l.p[2], acesaAgora ? Bloco.LANTERNA : Bloco.LA_BRANCA);
      enviar();
    },
    lanternas: () => lanternas.map((l) => l.acesa),
    esconder(sim) {
      escondido = sim;
      if (!sim) {
        for (const m of scene.meshes)
          if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = true;
        for (const n of scene.transformNodes) if (n.name.startsWith('criatura-')) n.setEnabled(true);
      }
    },
  };
  window.__fantasias = api;
}
