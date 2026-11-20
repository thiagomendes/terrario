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
 *   em `fantasiasPecas.ts`, no desenho das peças da Vila (`render/vila/ref.ts`).
 * - Uma só linguagem de abóbora: a gigante da praça em blocos; todas as outras (portas,
 *   horta, bancada, beira da praça) no modelo de brinquedo do jogo (`blocosBrinquedo.ts`).
 * - Os lugares: a Praça da Abóbora (a abóbora gigante, o palco, duas barracas, bancos e
 *   mesinhas), a Rua das Casinhas Tortas (quatro casinhas, uma é a da Vovó Zuleica), o Bosque
 *   das Lanternas e a Horta do Seu Jerônimo.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Constants } from '@babylonjs/core/Engines/constants';
import type { GlowLayer } from '@babylonjs/core/Layers/glowLayer';
import type { Scene } from '@babylonjs/core/scene';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { tema } from '../temas/ativo';
import type { FormaArvore } from '../temas/tipos';
import { Bloco } from '../world/blocks';
import { hash2 } from '../world/noise';
import { ALTURA, TAM_X, TAM_Z, arvoreDaForma, indice } from '../world/chunk';
import type { PecaVila } from '../world/vilaNeon';
import { criarPlasticos } from '../render/formas';
import { modeloDeBloco } from '../render/blocosBrinquedo';
import { Pecas, type V3 } from '../render/solidos';
import { Ref, type Desenho } from '../render/vila/ref';
import { aplicarCeuETexturas } from './fantasiasCeu';
import {
  CORES,
  balcaoDoce,
  balcaoMaca,
  bandeirolas,
  bancada,
  banco,
  caldeirao,
  campainha,
  capaLanterna,
  carinha,
  carrinhoDeMao,
  janelaRedonda,
  luaEstrelas,
  mastro,
  mesinha,
  placaDoce,
  placaMaca,
  porta,
  portaVovo,
  posteFerro,
  taloEFolha,
  teia,
  toalhaBalcao,
  toldoListrado,
  vapor,
  vassoura,
  type Carinha,
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
  /** A hora do dia (as carinhas, os halos e os vaga-lumes acendem de noite). */
  hora(h: number): void;
  /** Acende ou apaga uma lanterna do bosque (o "acender com um toque"). */
  lanterna(i: number, acesa: boolean): void;
  /** As lanternas do bosque (a 0 é a da frente das fotos) e quais estão acesas. */
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

/** Uma abóbora no modelo de brinquedo do jogo (a base no chão em x, y, z). */
interface Abobrinha {
  x: number;
  y: number;
  z: number;
  /** Para onde o rosto olha (radianos, 0 = +z). */
  ang: number;
  bloco: number;
  lado: number;
  carinha?: Carinha;
}

/** O meio da trilha do bosque (x local) em cada z local. */
const trilha = (z: number) => Math.round(98 + 4 * Math.sin(z / 9));

function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  const pl = criarPlasticos(scene, 'esboco-fantasias');
  // o lote guarda só a última edição de cada célula: abrir um vão (ar) onde a parede acabou
  // de ser posta no mesmo lote apaga a parede (senão o ar, igual ao mundo de antes, nem ia)
  const lote = new Map<string, Lote[number]>();
  const por = (x: number, y: number, z: number, b: number, meta = 0) => {
    const k = `${x},${y},${z}`;
    lote.delete(k);
    lote.set(k, { x, y, z, v: b | (meta << 8) });
  };
  const enviar = () => {
    e.editarLote!([...lote.values()]);
    lote.clear();
  };
  let O = { ox: 0, oz: 0, y: 64 };
  const pontos: Record<string, V3> = {};
  /** As lanternas do bosque: a célula do bloco e se está acesa (a 0 é a da frente). */
  const lanternas: { p: V3; acesa: boolean }[] = [];
  /** Todas as lanternas que têm halo de noite (as do bosque, a rua e a praça). */
  const halos: { p: V3; malha?: Mesh; doBosque?: number }[] = [];
  /** As peças (feitas depois que os blocos foram), por malha de destino. */
  type Destino = 'corpo' | 'rostoDia' | 'rostoNoite';
  const pecasDepois: { em: Destino; f: (d: Desenho) => void }[] = [];
  const abobrinhas: Abobrinha[] = [];
  /** Os vaga-lumes do bosque (pontos no mundo). */
  const vagalumes: V3[] = [];

  const glowDaCena = () =>
    scene.effectLayers?.find((l) => l.name === 'glow') as GlowLayer | undefined;
  /**
   * O plástico das peças não brilha de noite, mas tapa o brilho do que fica atrás dele (como
   * as peças da Vila): entra preto no mapa do glow. Só excluir deixava a luz de trás vazar
   * por cima das maçãs e do toldo.
   */
  const tapam = new Set<number>();
  let seletorPronto = false;
  const semBrilho = (m: Mesh) => {
    const g = glowDaCena();
    if (!g) return;
    if (!seletorPronto) {
      seletorPronto = true;
      const antes = g.customEmissiveColorSelector;
      g.customEmissiveColorSelector = (mesh, sub, mat, cor) => {
        if (tapam.has(mesh.uniqueId)) return void cor.set(0, 0, 0, 1);
        antes?.(mesh, sub, mat, cor);
      };
    }
    tapam.add(m.uniqueId);
  };
  const foraDoBrilho = (m: Mesh) => glowDaCena()?.addExcludedMesh(m);

  // ---------------------------------------------------------------- ferramentas
  /** A câmera de alguma foto está a menos de `r` blocos (no chão) de (x, z)? */
  const pertoDeCamera = (x: number, z: number, r: number) =>
    Object.values(tomadas).some((t) =>
      Object.values(t).some(
        (c) => c.pos[1] < O.y + 8 && Math.hypot(c.pos[0] - x, c.pos[2] - z) < r,
      ),
    );
  const chao = (x0: number, z0: number, w: number, d: number, b: number) => {
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) por(x, O.y, z, b);
  };
  /** O chão natural (o primeiro bloco firme de cima para baixo), ou -1 (água ou nada). */
  // (o morro cortado vira platô em `teto`: a árvore pousa no platô, não no morro de antes)
  let teto = 999;
  const chaoNatural = (x: number, z: number) => {
    const eb = e.bloco!;
    for (let y = 120; y > 1; y--) {
      const b = eb(x, y, z);
      if (!b || ARVORE_OU_MATO.has(b)) continue;
      return b === Bloco.AGUA ? -1 : Math.min(y, teto);
    }
    return -1;
  };
  /** Uma árvore do gerador do jogo (a mesma forma do mundo), com o tronco e a folha dados. */
  function arvore(
    x: number,
    z: number,
    forma: FormaArvore,
    tronco: number,
    folha: number,
    base = O.y,
  ) {
    // nenhuma copa em cima de onde a câmera das fotos fica
    if (pertoDeCamera(x, z, 7)) return;
    const buf = new Uint8Array(TAM_X * TAM_Z * ALTURA);
    const r = hash2(x, z, 77);
    arvoreDaForma(buf, 8, base, 8, r, forma, tronco, folha);
    for (let y = base + 1; y < Math.min(ALTURA, base + 18); y++)
      for (let lz = 0; lz < TAM_Z; lz++)
        for (let lx = 0; lx < TAM_X; lx++) {
          const b = buf[indice(lx, y, lz)];
          if (b) por(x + lx - 8, y, z + lz - 8, b);
        }
  }
  // (todos os troncos de madeira marrom: nada de tronco cinza)
  const arvoreDoBosque = (x: number, z: number, base = O.y) =>
    hash2(x, z, 31) < 0.62
      ? arvore(x, z, 'carvalho', Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAS_OUTONO, base)
      : arvore(x, z, 'betula', Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAS_BETULA, base);
  const arvoreDaBeira = (x: number, z: number, base = O.y) => {
    const h = hash2(x, z, 41);
    if (h < 0.5) arvore(x, z, 'carvalho', Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAGEM, base);
    else arvoreDoBosque(x, z, base);
  };
  /** Uma peça no mundo: o referencial no ponto (x, y, z) com a frente para `dir`. */
  const peca = (
    x: number,
    y: number,
    z: number,
    dir: number,
    f: (r: Ref) => void,
    escala = 1,
    em: Destino = 'corpo',
  ) =>
    pecasDepois.push({
      em,
      f: (d) => f(new Ref(d, { tipo: 'banco', x, y, z, dir } as PecaVila, escala)),
    });
  const abobora = (a: Abobrinha) => abobrinhas.push(a);

  // ---------------------------------------------------------------- a abóbora gigante
  /**
   * A abóbora gigante de blocos (o meio da base em cx, cz): redonda em degraus, mais larga
   * que alta, com os gomos em sulcos mais escuros; o talo curvo com a folha e a carinha de
   * brinquedo (olhos e sorriso arredondados, bochechas) em peças por cima da casca.
   */
  function aboboraGigante(cx: number, cz: number) {
    const Y0 = O.y + 1;
    const rx = 7.3;
    const ry = 5.0;
    const rz = 6.6;
    const cy = 3.4;
    // (a fileira do chão tem a largura da de cima: a abóbora assenta, sem "pezinhos")
    const dentro = (x: number, y: number, z: number) =>
      (x / rx) ** 2 + ((Math.max(y, 1) + 0.5 - cy) / ry) ** 2 + (z / rz) ** 2 <= 1;
    /** A frente da casca na coluna (x, y): o z do último bloco (ou -99). */
    const frente = (x: number, y: number) => {
      for (let z = 7; z >= 0; z--) if (dentro(x, y, z)) return z;
      return -99;
    };
    let topo = 0;
    for (let y = 0; y <= 9; y++)
      for (let x = -8; x <= 8; x++)
        for (let z = -7; z <= 7; z++) {
          if (!dentro(x, y, z)) continue;
          topo = Math.max(topo, y);
          if (
            dentro(x + 1, y, z) &&
            dentro(x - 1, y, z) &&
            dentro(x, y + 1, z) &&
            dentro(x, y - 1, z) &&
            dentro(x, y, z + 1) &&
            dentro(x, y, z - 1)
          )
            continue;
          // os 12 gomos: o sulco mais escuro em pé (menos na frente da carinha)
          const a = Math.atan2(x / rx, z / rz);
          const g = (((a / (Math.PI / 6)) % 1) + 1) % 1;
          const naCara = z > 0 && Math.abs(x) <= 3 && y >= 1 && y <= 6;
          const sulco = !naCara && (g < 0.13 || g > 0.93);
          por(cx + x, Y0 + y, cz + z, sulco ? Bloco.LA_VERMELHA : Bloco.LA_LARANJA);
        }
    // o talo curvo e a folha (peças), saindo do alto
    peca(cx + 0.5, Y0 + topo + 1, cz + 0.5, 0, taloEFolha, 1.5);
    pontos.abobora = [cx, Y0, cz];
    // a carinha: cada peça encosta na casca da coluna dela (a frente em degraus)
    // (a peça cobre as colunas e as fileiras do retângulo dela: fica na frente de todas)
    const naCasca = (x: number, y: number, larg: number, alt: number) => {
      let zf = -99;
      for (let k = Math.floor(x + 0.5 - larg / 2); k <= Math.floor(x + 0.5 + larg / 2); k++)
        for (let j = Math.floor(y - alt / 2); j <= Math.floor(y + alt / 2); j++)
          zf = Math.max(zf, frente(k, j));
      return cz + zf + 1;
    };
    // a carinha toda num plano só (o da frente mais saliente da cara), cada peça funda o
    // bastante para encostar na casca da coluna dela: lê como carinha de longe, sem degrau
    // da casca cortando os olhos
    const zCara = naCasca(0, 4, 7, 5) + 0.06;
    const parte = (
      x: number,
      y: number,
      w: number,
      h: number,
      cor: string,
      bisel: number,
      em: Destino,
      aceso: boolean,
      noPlano = true,
    ) => {
      // (a peça sai meio bloco da casca: as quinas redondas ficam todas à mostra)
      const zLocal = naCasca(x, y, w, h);
      const z = (noPlano ? zCara : zLocal) + 0.45;
      const fundo = z - zLocal + 1.2;
      peca(
        cx + x + 0.5,
        Y0 + y - h / 2,
        z,
        0,
        (r) => r.caixa(w, h, fundo, 0, 0, -fundo / 2, cor, bisel, aceso),
        1,
        em,
      );
    };
    for (const [em, cor, aceso] of [
      ['rostoDia', '#5a2a10', false],
      ['rostoNoite', '#ffd24a', true],
    ] as const) {
      // os olhos redondos (um ovo de quinas bem redondas)
      for (const s of [-1, 1]) {
        parte(s * 2.5, 5.1, 1.45, 1.7, cor, 0.4, em, aceso);
        parte(s * 2.5, 5.1, 1.15, 2.05, cor, 0.38, em, aceso);
      }
      // o sorriso em U: gomos arredondados que sobem nas pontas
      for (const [x, y] of [
        [-3.2, 3.3],
        [-2.3, 2.6],
        [-1.15, 2.25],
        [0, 2.15],
        [1.15, 2.25],
        [2.3, 2.6],
        [3.2, 3.3],
      ])
        parte(x, y, 1.45, 0.72, cor, 0.2, em, aceso);
    }
    // as bochechas rosadas (de dia e de noite), na casca do lado
    for (const s of [-1, 1]) parte(s * 4.3, 3.7, 1.2, 0.8, '#ff8a5a', 0.35, 'corpo', false, false);
  }

  // ---------------------------------------------------------------- lanternas de poste
  /** Poste de ferro de brinquedo com a lanterna de bloco no alto (acesa ou apagada). */
  function postoLanterna(x: number, z: number, acesa: boolean, doBosque = false) {
    const Y = O.y;
    por(x, Y + 3, z, acesa ? Bloco.LANTERNA : Bloco.LA_BRANCA);
    peca(x + 0.5, Y + 1, z + 0.5, 0, (r) => posteFerro(r, 2));
    peca(x + 0.5, Y + 4, z + 0.5, 0, capaLanterna);
    if (doBosque) lanternas.push({ p: [x, Y + 3, z], acesa });
    halos.push({ p: [x + 0.5, Y + 3.5, z + 0.5], doBosque: doBosque ? lanternas.length - 1 : undefined });
  }

  // ---------------------------------------------------------------- a praça
  /** O palco de tábuas (9 × 5, a frente para +z em z0 + 4) com a cortina roxa. */
  function palco(x0: number, z0: number) {
    const Y = O.y;
    for (let x = x0; x < x0 + 9; x++)
      for (let z = z0; z < z0 + 5; z++) por(x, Y + 1, z, Bloco.TABUAS_PINHO);
    for (let x = x0 + 3; x < x0 + 6; x++) por(x, Y + 1, z0 + 5, Bloco.ESCADA, 2);
    for (let x = x0; x < x0 + 9; x++)
      for (let y = Y + 2; y <= Y + 6; y++) {
        const moldura = x === x0 || x === x0 + 8 || y === Y + 6;
        por(x, y, z0, moldura ? Bloco.TABUAS_PINHO : Bloco.REBOCO_ROSA);
      }
    for (let x = x0 + 1; x < x0 + 8; x++) por(x, Y + 7, z0, Bloco.TABUAS_PINHO);
    for (let x = x0 + 3; x < x0 + 7; x++) por(x, Y + 8, z0, Bloco.TELHA_COLONIAL);
    for (const x of [x0, x0 + 8]) for (let y = Y + 2; y <= Y + 5; y++) por(x, y, z0 + 4, Bloco.CERCA);
    // as abóboras acesas nos cantos da frente do palco
    abobora({ x: x0 + 1.5, y: Y + 2, z: z0 + 4.5, ang: 0, bloco: Bloco.LAMPIAO_ABOBORA, lado: 0.8 });
    abobora({ x: x0 + 7.5, y: Y + 2, z: z0 + 4.5, ang: 0, bloco: Bloco.LAMPIAO_ABOBORA, lado: 0.8 });
    pontos.palco = [x0 + 4.5, Y + 2, z0 + 2.5];
    const a: V3 = [x0 + 0.5, Y + 6.0, z0 + 4.5];
    const b: V3 = [x0 + 8.5, Y + 6.0, z0 + 4.5];
    peca(a[0], 0, a[2], 0, (r) => {
      const l = (p: V3): V3 => [p[0] - a[0], p[1], p[2] - a[2]];
      bandeirolas(r, l(a), l(b), 0.6);
    });
  }

  /** Barraca de tábuas (6 × 4, o balcão de frente para +z) com o toldo listrado de peças. */
  function barraca(x0: number, z0: number, qual: 'doce' | 'maca') {
    const Y = O.y;
    for (let x = x0; x < x0 + 6; x++)
      for (let z = z0; z < z0 + 4; z++) {
        const borda = x === x0 || x === x0 + 5 || z === z0 || z === z0 + 3;
        const frente = z === z0 + 3 && x > x0 && x < x0 + 5;
        por(x, Y, z, Bloco.TABUAS);
        if (borda && !frente) for (let y = Y + 1; y <= Y + 2; y++) por(x, y, z, Bloco.TABUAS);
        if (frente) por(x, Y + 1, z, Bloco.TABUAS);
      }
    const [a, b] = qual === 'doce' ? [CORES.laranja, CORES.creme] : [CORES.roxo, CORES.creme];
    peca(x0 + 3, Y + 3, z0 + 4.4, 0, (r) => toldoListrado(r, 6.2, 4.6, a, b));
    peca(x0 + 3, Y + 1, z0 + 4, 0, (r) =>
      toalhaBalcao(r, 4, qual === 'doce' ? CORES.laranja : CORES.roxo),
    );
    peca(x0 + 3, Y + 2.06, z0 + 3.5, 0, qual === 'doce' ? balcaoDoce : balcaoMaca);
    peca(x0 + 3, Y + 3.3, z0 + 2.2, 0, qual === 'doce' ? placaDoce : placaMaca);
  }

  function praca() {
    const { ox, oz } = O;
    const Y = O.y;
    // o chão de pedrinhas variadas, com a beira de grama
    chao(ox + 30, oz + 28, 46, 26, Bloco.PEDREGULHO);
    aboboraGigante(ox + 53, oz + 36);
    palco(ox + 33, oz + 32);
    barraca(ox + 62, oz + 33, 'doce');
    barraca(ox + 69, oz + 33, 'maca');
    abobora({ x: ox + 61.5, y: Y + 1, z: oz + 37.5, ang: 0, bloco: Bloco.LAMPIAO_ABOBORA, lado: 0.8 });
    abobora({ x: ox + 68.5, y: Y + 1, z: oz + 37.5, ang: 0, bloco: Bloco.LAMPIAO_ABOBORA, lado: 0.8 });
    // as abóboras acesas da beira da frente (o caminho de quem chega)
    for (const x of [34, 40, 46, 61, 67, 73])
      abobora({ x: ox + x + 0.5, y: Y + 1, z: oz + 53.5, ang: 0, bloco: Bloco.LAMPIAO_ABOBORA, lado: 0.7 });
    // as lanternas de poste nos quatro cantos da praça
    for (const [x, z] of [
      [29, 30],
      [77, 30],
      [29, 53],
      [77, 53],
    ])
      postoLanterna(ox + x, oz + z, true);
    // bancos e mesinhas (sem exagero)
    peca(ox + 38.5, Y + 1, oz + 46.5, 2, banco);
    peca(ox + 68.5, Y + 1, oz + 47.5, 2, banco);
    peca(ox + 41.5, Y + 1, oz + 41.5, 0, mesinha);
    peca(ox + 65.5, Y + 1, oz + 42.5, 0, mesinha);
    // as bandeirolas: em volta da frente da praça, longe da abóbora (nada passa por ela)
    const H = 5.2;
    const mastros: [number, number][] = [
      [ox + 31.5, oz + 47.5],
      [ox + 40.5, oz + 50.5],
      [ox + 66.5, oz + 50.5],
      [ox + 75.5, oz + 47.5],
      [ox + 76.5, oz + 39.5],
    ];
    for (const [x, z] of mastros) peca(x, Y + 1, z, 0, (r) => mastro(r, H));
    const [p0x, p0z] = mastros[0];
    peca(p0x, 0, p0z, 0, (r) => {
      const l = (x: number, y: number, z: number): V3 => [x - p0x, y, z - p0z];
      bandeirolas(r, l(ox + 33.5, Y + 6, oz + 36.5), l(p0x, Y + 1 + H, p0z), 0.6);
      // (o vão do meio fica aberto: da frente da praça, nenhum fio cruza a abóbora)
      for (let i = 0; i < mastros.length - 1; i++) {
        if (i === 1) continue;
        const [x1, z1] = mastros[i];
        const [x2, z2] = mastros[i + 1];
        bandeirolas(r, l(x1, Y + 1 + H, z1), l(x2, Y + 1 + H, z2), 0.8);
      }
    });
    pontos.praca = [ox + 53, Y + 1, oz + 48];
    pontos.barracas = [ox + 68.5, Y + 1, oz + 37];
  }

  // ---------------------------------------------------------------- a rua
  interface Casinha {
    x0: number;
    /** Largura (x) e fundo (z); a frente olha para +z, em z0 + d - 1. */
    w: number;
    d: number;
    /** Altura do térreo. */
    H: number;
    /** O andar de cima, desencontrado um bloco para o lado (saliente e torto). */
    andar?: { desl: 1 | -1; H: number };
    parede: number;
    /** A cumeeira corre em z (o oitão na frente) ou em x (o caimento na frente). */
    cumeeira: 'z' | 'x';
    /** Quanto o telhado sobe por coluna de cada lado (lados diferentes: o telhado torto). */
    passo: [number, number];
    chamine: 1 | -1;
    folhas: string;
    portaCor: string;
    toldo: number;
    vovo?: boolean;
  }
  function casinha(c: Casinha, z0: number) {
    const Y = O.y;
    const { x0, w, d, H } = c;
    const zf = z0 + d - 1;
    const meio = x0 + Math.floor(w / 2);
    const janelas: [number, number][] = [];
    // as quinas e a cinta: tábua escura na casa de tijolo, verde-musgo na casa de tábua verde
    const madeira = c.parede === Bloco.REBOCO_MENTA ? Bloco.LA_VERDE : Bloco.TABUAS_PINHO;
    const paredes = (a: number, b: number, y0: number, y1: number, cinta: boolean) => {
      for (let x = a; x <= b; x++)
        for (let z = z0; z <= zf; z++) {
          const borda = x === a || x === b || z === z0 || z === zf;
          if (!borda) continue;
          const quina = (x === a || x === b) && (z === z0 || z === zf);
          for (let y = y0; y <= y1; y++)
            por(x, y, z, quina || (cinta && y === y0) ? madeira : c.parede);
        }
    };
    for (let x = x0; x < x0 + w; x++) for (let z = z0; z <= zf; z++) por(x, Y, z, Bloco.TABUAS);
    paredes(x0, x0 + w - 1, Y + 1, Y + H, false);
    const tx0 = x0 + (c.andar?.desl ?? 0);
    const tx1 = tx0 + w - 1;
    const topo = Y + H + (c.andar?.H ?? 0);
    if (c.andar) paredes(tx0, tx1, Y + H + 1, topo, true);
    // a porta (peça, num vão aberto na parede) e o toldinho por cima
    if (c.vovo) {
      for (let x = meio - 1; x <= meio + 1; x++)
        for (let y = Y + 1; y <= Y + 3; y++) por(x, y, zf, Bloco.AR);
      peca(meio + 0.5, Y + 1, zf + 1, 0, portaVovo);
    } else {
      por(meio, Y + 1, zf, Bloco.AR);
      por(meio, Y + 2, zf, Bloco.AR);
      peca(meio + 0.5, Y + 1, zf + 1, 0, (r) => porta(r, c.portaCor));
      for (let x = meio - 1; x <= meio + 1; x++) por(x, Y + 3, zf + 1, c.toldo);
    }
    // as janelas acesas em alturas diferentes (casa torta não tem janela em fila)
    if (!c.vovo)
      [x0 + 1, x0 + w - 2].forEach((x, i) => {
        if (Math.abs(x - meio) <= 1) return;
        const y = Y + 2 + (H >= 4 && i === 1 ? 1 : 0);
        por(x, y, zf, Bloco.JANELA_ACESA);
        janelas.push([x, y]);
      });
    if (c.andar)
      [tx0 + 1, tx1 - 2].forEach((x, i) => {
        const y = Y + H + (i === 0 ? 3 : 2);
        por(x, y, zf, Bloco.JANELA_ACESA);
        janelas.push([x, y]);
      });
    for (const z of [z0 + 2, zf - 2]) {
      por(x0, Y + 2, z, Bloco.JANELA_ACESA);
      por(x0 + w - 1, Y + 2, z, Bloco.JANELA_ACESA);
    }
    // o telhado roxo em degraus: cada lado sobe num passo (os dois diferentes: torto)
    const eixoZ = c.cumeeira === 'z';
    const a0 = eixoZ ? tx0 - 1 : z0 - 1;
    const a1 = eixoZ ? tx1 + 1 : zf + 1;
    const b0 = eixoZ ? z0 - 1 : tx0 - 1;
    const b1 = eixoZ ? zf + 1 : tx1 + 1;
    const h: number[] = [];
    for (let a = a0; a <= a1; a++) h.push(Math.min((a - a0) * c.passo[0], (a1 - a) * c.passo[1]));
    const cel = (a: number, b: number): [number, number] => (eixoZ ? [a, b] : [b, a]);
    for (let b = b0; b <= b1; b++)
      for (let i = 0; i < h.length; i++) {
        const a = a0 + i;
        const viz = Math.min(h[i - 1] ?? -1, h[i + 1] ?? -1);
        const base = Math.max(0, Math.min(h[i], viz + 1));
        const [x, z] = cel(a, b);
        for (let k = base; k <= h[i]; k++) por(x, topo + 1 + k, z, Bloco.TELHA_COLONIAL);
        // o oitão (a parede em triângulo) nas pontas da cumeeira
        const ponta = eixoZ ? b === z0 || b === zf : b === tx0 || b === tx1;
        if (ponta && a > a0 && a < a1) for (let k = 0; k < base; k++) por(x, topo + 1 + k, z, c.parede);
      }
    const iMax = h.indexOf(Math.max(...h));
    if (c.vovo) {
      // o chapéu de bruxa: a ponta sobe mais dois e entorta para o lado
      const xa = a0 + iMax;
      for (let z = z0 + 1; z <= zf - 1; z++) {
        por(xa, topo + 2 + h[iMax], z, Bloco.TELHA_COLONIAL);
        por(xa + 1, topo + 2 + h[iMax], z, Bloco.TELHA_COLONIAL);
        por(xa + 1, topo + 3 + h[iMax], z, Bloco.TELHA_COLONIAL);
        por(xa + 2, topo + 3 + h[iMax], z, Bloco.TELHA_COLONIAL);
      }
      // a janela redonda acesa no oitão, em cima da porta
      peca(xa + 0.5, topo + 3, zf + 1, 0, janelaRedonda);
    } else if (eixoZ && h[iMax] >= 3) por(a0 + iMax, topo + 2, zf, Bloco.JANELA_ACESA);
    // a chaminé de tijolo, inclinada em degraus (o degrau sempre encostado no de baixo)
    const chX = c.chamine === 1 ? tx1 - 1 : tx0 + 1;
    const chZ = z0 + 1;
    const hCh = eixoZ ? h[chX - a0] : h[chZ - a0];
    for (let k = 0; k < 4; k++) {
      const x = chX + c.chamine * Math.floor(k / 2);
      por(x, topo + 1 + hCh + k, chZ, Bloco.TIJOLOS);
      if (k > 0 && k % 2 === 0) por(x - c.chamine, topo + 1 + hCh + k, chZ, Bloco.TIJOLOS);
    }
    // a varanda de tábuas, a abóbora acesa do lado da porta e a campainha
    for (let x = meio - 1; x <= meio + 1; x++) por(x, Y, zf + 1, Bloco.TABUAS);
    for (const [x, y] of janelas)
      peca(x + 0.5, y, zf + 1, 0, (r) => {
        for (const s of [-1, 1]) {
          r.caixa(0.26, 0.94, 0.06, s * 0.64, 0.03, 0.03, c.folhas, 0.02);
          r.caixa(0.12, 0.12, 0.07, s * 0.64, 0.44, 0.04, CORES.creme, 0.02);
        }
      });
    if (!c.vovo) {
      abobora({ x: meio + 2.5, y: Y + 1, z: zf + 1.5, ang: 0, bloco: Bloco.LAMPIAO_ABOBORA, lado: 0.75 });
      peca(meio - 0.6, Y + 1.25, zf + 1, 0, campainha);
      peca(tx0 + 0.04, topo + 0.96, zf + 1.04, 0, (r) => teia(r, 1.0, 1));
      return;
    }
    // a Vovó Zuleica: a varanda coberta, o caldeirão com fumacinha, a vassoura e a lua
    for (let x = x0; x < x0 + w; x++)
      for (const z of [zf + 1, zf + 2]) {
        por(x, Y, z, Bloco.TABUAS);
        por(x, Y + 4, z, Bloco.TOLDO_VERDE);
      }
    for (const x of [x0, x0 + w - 1]) for (let y = Y + 1; y <= Y + 3; y++) por(x, y, zf + 2, Bloco.CERCA);
    abobora({ x: x0 + 5.45, y: Y + 1, z: zf + 1.45, ang: 0, bloco: Bloco.LAMPIAO_ABOBORA, lado: 0.62 });
    peca(x0 + 5.5, Y + 1.75, zf + 1, 0, campainha);
    peca(x0 + 1.45, Y + 1, zf + 1, 0, vassoura);
    // o caldeirão no pé da varanda, na frente (à vista de quem passa na rua)
    peca(x0 + 1.9, Y + 1, zf + 3.9, 0, caldeirao, 1.3);
    peca(x0 + 1.9, Y + 1, zf + 3.9, 0, vapor, 1.3);
    peca(x0 + 0.62, Y + 3.98, zf + 2.5, 0, (r) => teia(r, 0.9, 1));
    peca(tx1 + 0.96, topo + 0.96, zf + 1.04, 0, (r) => teia(r, 0.8, -1));
    peca(x0 + 5.2, Y + 5.75, zf + 1, 0, luaEstrelas);
    pontos.vovo = [meio + 0.5, Y + 1, zf + 1];
  }

  function rua() {
    const { ox, oz } = O;
    const Y = O.y;
    // o caminho de pedras irregulares, de leste a oeste (a beira em zigue-zague, sem régua)
    for (let x = ox + 4; x < ox + 82; x++)
      for (let z = oz + 21; z <= oz + 26; z++) {
        const beira = z === oz + 21 || z === oz + 26;
        if (beira && hash2(x, z, 17) < 0.55) continue;
        por(x, Y, z, Bloco.LA_AMARELA);
      }
    const casas: Casinha[] = [
      {
        x0: ox + 7,
        w: 7,
        d: 6,
        H: 4,
        parede: Bloco.REBOCO_AMARELO,
        cumeeira: 'z',
        passo: [1, 2],
        chamine: -1,
        folhas: '#5a7630',
        portaCor: '#6a3e9c',
        toldo: Bloco.TOLDO_VERMELHO,
      },
      {
        x0: ox + 19,
        w: 7,
        d: 6,
        H: 3,
        andar: { desl: 1, H: 3 },
        parede: Bloco.REBOCO_MENTA,
        cumeeira: 'x',
        passo: [1, 2],
        chamine: 1,
        folhas: '#6a3e9c',
        portaCor: '#d8701c',
        toldo: Bloco.TOLDO_VERDE,
      },
      {
        x0: ox + 32,
        w: 7,
        d: 7,
        H: 4,
        parede: Bloco.REBOCO_AMARELO,
        cumeeira: 'z',
        passo: [2, 2],
        chamine: -1,
        folhas: '#6a3e9c',
        portaCor: '#7a4aae',
        toldo: Bloco.TOLDO_VERDE,
        vovo: true,
      },
      {
        x0: ox + 47,
        w: 7,
        d: 6,
        H: 3,
        parede: Bloco.REBOCO_MENTA,
        cumeeira: 'z',
        passo: [2, 1],
        chamine: 1,
        folhas: '#d8701c',
        portaCor: '#5e3488',
        toldo: Bloco.TOLDO_VERMELHO,
      },
    ];
    for (const c of casas) casinha(c, c.d === 7 ? oz + 12 : oz + 13);
    for (const x of [12, 26, 45, 58, 70]) postoLanterna(ox + x, oz + 27, true);
    pontos.rua = [ox + 30, Y + 1, oz + 24];
    chao(ox + 51, oz + 27, 4, 1, Bloco.LA_AMARELA);
  }

  // ---------------------------------------------------------------- o bosque
  function bosque() {
    const { ox, oz } = O;
    const Y = O.y;
    for (let z = 2; z < D - 2; z++) {
      const c = trilha(z);
      for (let dx = -1; dx <= 1; dx++) por(ox + c + dx, Y, oz + z, Bloco.CASCALHO);
    }
    for (let x = 76; x <= trilha(46) - 2; x++) chao(ox + x, oz + 45, 1, 3, Bloco.LA_AMARELA);
    // os postes-lanterna, um de cada lado; metade acesa, metade apagada (a 0 é a da frente
    // das fotos, e começa apagada: a foto do "acender com um toque" acende ela)
    const zs: number[] = [];
    for (let z = 6; z < D - 4; z += 7) zs.push(z);
    zs.reverse().forEach((z, i) => {
      const lado = i % 2 ? -1 : 1;
      postoLanterna(ox + trilha(z) + lado * 3, oz + z, i % 2 === 1, true);
    });
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
    for (let k = 0; k < 70; k++) {
      const z = 4 + hash2(k, 1, 51) * (D - 8);
      const x = trilha(z) + (hash2(k, 2, 51) - 0.5) * 12;
      if (pertoDeCamera(ox + x, oz + z, 7)) continue;
      vagalumes.push([ox + x, Y + 0.9 + hash2(k, 3, 51) * 2.2, oz + z]);
    }
    pontos.bosque = [ox + trilha(60), Y + 1, oz + 60];
  }

  // ---------------------------------------------------------------- a horta
  function horta() {
    const { ox, oz } = O;
    const Y = O.y;
    const [x0, z0, w, d] = [ox + 7, oz + 38, 12, 9];
    const grandes: [number, number][] = [
      [x0 + 2, z0 + 2],
      [x0 + 8, z0 + 5],
    ];
    const livre = (x: number, z: number) =>
      grandes.some(([gx, gz]) => Math.abs(x - gx) <= 1 && Math.abs(z - gz) <= 1);
    for (let x = x0; x < x0 + w; x++)
      for (let z = z0; z < z0 + d; z++) {
        por(x, Y, z, Bloco.TERRA_ARADA);
        if (livre(x, z)) continue;
        if ((z - z0) % 3 !== 1 && hash2(x, z, 61) < 0.5) por(x, Y + 1, z, Bloco.ABOBOREIRA_3);
      }
    // as abóboras de três tamanhos, todas no modelo de brinquedo do jogo
    for (const [gx, gz] of grandes)
      abobora({ x: gx + 0.5, y: Y + 1, z: gz + 0.5, ang: 0.4, bloco: Bloco.ABOBORA, lado: 1.9 });
    for (const [ax, az] of [
      [x0 + 5, z0 + 1],
      [x0 + 10, z0 + 2],
      [x0 + 4, z0 + 6],
      [x0 + 1, z0 + 7],
      [x0 + 10, z0 + 8],
    ]) {
      por(ax, Y + 1, az, Bloco.AR);
      abobora({ x: ax + 0.5, y: Y + 1, z: az + 0.5, ang: ax * 0.7, bloco: Bloco.ABOBORA, lado: 0.95 });
    }
    for (const [ax, az] of [
      [7, 1],
      [3, 4],
      [6, 7],
      [11, 4],
      [9, 0],
      [2, 8],
    ]) {
      por(x0 + ax, Y + 1, z0 + az, Bloco.AR);
      abobora({ x: x0 + ax + 0.5, y: Y + 1, z: z0 + az + 0.5, ang: ax, bloco: Bloco.ABOBORA, lado: 0.55 });
    }
    for (let x = x0 - 1; x <= x0 + w; x++) {
      por(x, Y + 1, z0 - 1, Bloco.CERCA);
      if (x < x0 + 4 || x > x0 + 6) por(x, Y + 1, z0 + d, Bloco.CERCA);
    }
    for (let z = z0; z < z0 + d; z++) {
      por(x0 - 1, Y + 1, z, Bloco.CERCA);
      por(x0 + w, Y + 1, z, Bloco.CERCA);
    }
    // a bancada das três carinhas, na frente do canteiro
    const bx = x0 + 5.5;
    const bz = z0 + d + 2.6;
    peca(bx, Y + 1, bz, 0, bancada);
    const tipos: Carinha[] = ['sorridente', 'piscando', 'surpresa'];
    tipos.forEach((t, i) =>
      abobora({ x: bx - 0.9 + i * 0.9, y: Y + 2.0, z: bz + 0.02, ang: 0, bloco: Bloco.ABOBORA, lado: 0.8, carinha: t }),
    );
    chao(x0 + 3, z0 + d + 1, 6, 4, Bloco.CASCALHO);
    // o carrinho de mão com a colheita
    const cx = x0 + w + 2.5;
    const cz = z0 + d - 1;
    peca(cx, Y + 1, cz, 1, carrinhoDeMao);
    for (const [dx, dz] of [
      [-0.05, -0.25],
      [0.2, 0.15],
      [-0.25, 0.25],
    ])
      abobora({ x: cx + dz, y: Y + 1.5, z: cz + dx, ang: dx * 5, bloco: Bloco.ABOBORA, lado: 0.5 });
    chao(ox + 19, oz + 50, 11, 3, Bloco.LA_AMARELA);
    pontos.horta = [x0 + w / 2, Y + 1, z0 + d / 2];
    pontos.bancada = [bx, Y + 1, bz];
  }

  // ---------------------------------------------------------------- montar
  function montar() {
    const eb = e.bloco!;
    const [px, , pz] = e.posicao!;
    const ox = Math.floor(px) - Math.floor(W / 2);
    const oz = Math.floor(pz) - Math.floor(D / 2);
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
    // (baixinho: os degraus do corte ficam atrás das árvores da volta)
    const TETO = Y + 2;
    teto = TETO;
    for (let x = cxm - 126; x < cxm + 126; x++)
      for (let z = czm - 126; z < czm + 126; z++) {
        if (x >= ox - M && x < ox + W + M && z >= oz - M && z < oz + D + M) continue;
        if (Math.hypot(x - cxm, z - czm) > 126 || !eb(x, TETO + 1, z)) continue;
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
    // árvores do gerador atrás das casas e soltas no palco
    for (let x = 2; x < 80; x += 6) {
      const jz = 3 + Math.floor(hash2(x, 1, 81) * 5);
      if (hash2(x, 2, 81) < 0.25) continue;
      arvoreDaBeira(ox + x + Math.floor(hash2(x, 3, 81) * 3), oz + jz);
    }
    for (const [x, z] of [
      [4, 66],
      [12, 70],
      [24, 64],
      [27, 36],
      [26, 76],
      [40, 70],
      [52, 78],
      [64, 68],
      [74, 80],
      [34, 82],
    ])
      arvoreDaBeira(ox + x, oz + z);
    // o fundo: voltas de árvores do gerador em volta do palco, no chão de cada lugar
    // (cobrem o terreno de outro bioma e os platôs cortados que apareciam ao longe)
    for (const [afasta, passo] of [
      [6, 6],
      [15, 6],
      [24, 6],
      [33, 7],
    ] as const) {
      const x0 = ox - M - afasta;
      const x1 = ox + W + M + afasta;
      const z0 = oz - M - afasta;
      const z1 = oz + D + M + afasta;
      const volta: [number, number][] = [];
      for (let x = x0; x <= x1; x += passo) volta.push([x, z0], [x, z1]);
      for (let z = z0 + passo; z < z1; z += passo) volta.push([x0, z], [x1, z]);
      for (const [vx, vz] of volta) {
        const x = vx + Math.floor((hash2(vx, vz, 93) - 0.5) * 4);
        const z = vz + Math.floor((hash2(vx, vz, 94) - 0.5) * 4);
        const base = chaoNatural(x, z);
        if (base < 0) continue;
        arvoreDaBeira(x, z, base);
      }
    }
    enviar();
    pontos.origem = [ox, Y, oz];
    setTimeout(montarPecas, 2500);
    return O;
  }

  // ---------------------------------------------------------------- as tomadas das fotos
  const tomadas: Record<string, Record<'deitado' | 'empe', Tomada>> = {};
  function definirTomadas() {
    const { ox, oz, y } = O;
    const P = (x: number, h: number, z: number): V3 => [ox + x, y + h, oz + z];
    const t = (pos: V3, alvo: V3, fov: number): Tomada => ({ pos, alvo, fov });
    const bz = D + 1;
    tomadas.praca = {
      deitado: t(P(53.5, 3.0, 52), P(53.5, 5.0, 36), 60),
      empe: t(P(53.5, 3.0, 58), P(53.5, 6.6, 36), 76),
    };
    tomadas.barracas = {
      deitado: t(P(69.5, 2.4, 44), P(70, 2.8, 36), 56),
      empe: t(P(71.5, 2.1, 46.5), P(71.5, 3.7, 36), 78),
    };
    tomadas.rua = {
      deitado: t(P(2, 3.0, 28), P(27, 5.0, 18), 58),
      empe: t(P(-1, 3.0, 27), P(20, 6.5, 16), 72),
    };
    tomadas.vovo = {
      deitado: t(P(35.5, 3.4, 30.5), P(35.5, 7.4, 18), 76),
      empe: t(P(35.5, 3.6, 30.5), P(35.5, 7.2, 18), 94),
    };
    tomadas.bosque = {
      deitado: t(P(trilha(bz) + 0.5, 2.3, bz), P(trilha(66) + 0.5, 2.8, 66), 58),
      empe: t(P(trilha(bz) + 0.5, 2.3, bz), P(trilha(66) + 0.5, 3.2, 66), 70),
    };
    tomadas.horta = {
      deitado: t(P(13.5, 3.0, 54.5), P(12.5, 1.9, 44), 58),
      empe: t(P(12.5, 3.0, 56.5), P(12.5, 2.2, 44), 74),
    };
    // o panorama da noite olha para o leste, onde a lua nasce (no em pé, do sul)
    tomadas.panorama = {
      deitado: t(P(-4, 11, 44), P(58, 6, 38), 58),
      empe: t(P(53.5, 16, 66), P(52, 8, 32), 70),
    };
  }

  // ---------------------------------------------------------------- as peças
  let vagalumesMalha: Mesh | null = null;
  const rostos: { dia: Mesh | null; noite: Mesh | null } = { dia: null, noite: null };
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
  /** Junta as luzes de um Pecas em uma malha por cor (cada uma acesa na cor dela). */
  const malhasDeLuz = (luz: Pecas, nome: string): Mesh[] => {
    const porCor = new Map<string, Pecas>();
    for (const vd of luz.partes) {
      const c = vd.colors!;
      const k = Color3.FromArray([c[0], c[1], c[2]]).toHexString();
      let p = porCor.get(k);
      if (!p) porCor.set(k, (p = new Pecas()));
      p.partes.push(vd);
    }
    const out: Mesh[] = [];
    for (const [k, p] of porCor) {
      const m = new Mesh(`${nome}-${k}`, scene);
      p.juntar().applyToMesh(m);
      m.material = acesa(k);
      m.position.set(O.ox, 0, O.oz);
      m.isPickable = false;
      out.push(m);
    }
    return out;
  };
  function montarPecas() {
    const mk = (corpo: Pecas, luz: Pecas): Desenho => ({
      corpo,
      luz,
      noite: new Pecas(),
      vidro: new Pecas(),
      quadros: [],
      ox: O.ox,
      oz: O.oz,
      chao: O.y + 1,
      recorte: { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 },
    });
    const corpo = new Pecas();
    const luz = new Pecas();
    const rDia = new Pecas();
    const rNoite = new Pecas();
    const lixo = new Pecas();
    const dCorpo = mk(corpo, luz);
    const dDia = mk(rDia, lixo);
    const dNoite = mk(lixo, rNoite);
    for (const p of pecasDepois)
      p.f(p.em === 'corpo' ? dCorpo : p.em === 'rostoDia' ? dDia : dNoite);
    const mc = new Mesh('esboco-fantasias-pecas', scene);
    corpo.juntar().applyToMesh(mc);
    mc.material = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
    mc.position.set(O.ox, 0, O.oz);
    mc.receiveShadows = true;
    mc.isPickable = false;
    // o plástico não brilha de noite (como as peças da Vila e o boneco: fica fora do glow)
    semBrilho(mc);
    malhasDeLuz(luz, 'esboco-fantasias-luz');
    if (rDia.partes.length) {
      rostos.dia = new Mesh('esboco-fantasias-rosto-dia', scene);
      rDia.juntar().applyToMesh(rostos.dia);
      rostos.dia.material = mc.material;
      rostos.dia.position.set(O.ox, 0, O.oz);
      semBrilho(rostos.dia);
    }
    const [mn] = malhasDeLuz(rNoite, 'esboco-fantasias-rosto-noite');
    rostos.noite = mn ?? null;
    // os vaga-lumes: cubinhos acesos maiores (aparecem no celular), só de noite
    const vg = new Pecas();
    const rv = new Ref(mk(new Pecas(), vg), { tipo: 'banco', x: O.ox, y: 0, z: O.oz, dir: 0 } as PecaVila);
    for (const [x, y, z] of vagalumes) rv.luz(0.13, 0.13, 0.13, x - O.ox, y, z - O.oz, '#fff2a0');
    vagalumesMalha = new Mesh('esboco-fantasias-vagalumes', scene);
    vg.juntar().applyToMesh(vagalumesMalha);
    vagalumesMalha.material = acesa('#fff2a0');
    vagalumesMalha.position.set(O.ox, 0, O.oz);
    vagalumesMalha.isPickable = false;
    montarAbobrinhas();
    montarHalos();
    atualizarNoite();
  }

  /** As abóboras pequenas: o modelo de brinquedo do jogo, com o rosto aceso de verdade. */
  function montarAbobrinhas() {
    abobrinhas.forEach((a, i) => {
      const ms = modeloDeBloco(scene, pl, a.bloco, `esboco-abobrinha-${i}`, a.lado);
      if (!ms) return;
      const raiz = new TransformNode(`esboco-abobrinha-${i}`, scene);
      raiz.position.set(a.x, a.y + 0.4 * a.lado, a.z);
      // o rosto do modelo olha para a quina (o ícone): o giro leva ele para `ang`
      raiz.rotation.y = a.ang + (5 * Math.PI) / 4;
      for (const m of ms) {
        m.parent = raiz;
        m.receiveShadows = true;
        if (m.material?.name.includes('ffe04a')) m.material = acesa('#ffcf4a');
        else semBrilho(m);
      }
      if (a.carinha) {
        const k = 0.5 * a.lado;
        const t = a.carinha;
        const ref = new Pecas();
        const luzC = new Pecas();
        const r = new Ref(mk2(ref, luzC), {
          tipo: 'banco',
          x: a.x,
          y: a.y + 0.36 * a.lado,
          z: a.z + 0.08 * a.lado,
          dir: 0,
        } as PecaVila);
        carinha(r, 0, 0, k, t);
        malhasDeLuz(luzC, `esboco-carinha-${i}`);
        if (ref.partes.length) {
          const m = new Mesh(`esboco-carinha-corpo-${i}`, scene);
          ref.juntar().applyToMesh(m);
          m.material = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
          m.position.set(O.ox, 0, O.oz);
          semBrilho(m);
        }
      }
    });
  }
  const mk2 = (corpo: Pecas, luz: Pecas): Desenho => ({
    corpo,
    luz,
    noite: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    ox: O.ox,
    oz: O.oz,
    chao: O.y + 1,
    recorte: { x0: -1e9, z0: -1e9, x1: 1e9, z1: 1e9 },
  });

  /** O halo quente das lanternas acesas (só de noite): um brilho macio em volta do vidro. */
  function montarHalos() {
    const tex = new DynamicTexture('esboco-halo', { width: 64, height: 64 }, scene, false);
    const g = tex.getContext();
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,214,120,0.9)');
    gr.addColorStop(0.35, 'rgba(255,190,90,0.35)');
    gr.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    tex.update();
    tex.hasAlpha = true;
    const mat = new StandardMaterial('esboco-halo', scene);
    mat.disableLighting = true;
    mat.emissiveTexture = tex;
    mat.opacityTexture = tex;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.alphaMode = Constants.ALPHA_ADD;
    mat.backFaceCulling = false;
    halos.forEach((h, i) => {
      const m = MeshBuilder.CreatePlane(`esboco-halo-${i}`, { size: 3.8 }, scene);
      m.material = mat;
      m.billboardMode = Mesh.BILLBOARDMODE_ALL;
      m.position.set(...h.p);
      m.isPickable = false;
      foraDoBrilho(m);
      h.malha = m;
    });
  }

  let ehNoite = false;
  function atualizarNoite() {
    vagalumesMalha?.setEnabled(ehNoite);
    rostos.dia?.setEnabled(!ehNoite);
    rostos.noite?.setEnabled(ehNoite);
    for (const h of halos) {
      const acesaAgora = h.doBosque === undefined || lanternas[h.doBosque].acesa;
      h.malha?.setEnabled(ehNoite && acesaAgora);
    }
  }

  // ---------------------------------------------------------------- câmera, hora, lanternas
  let fixa: { p: Vector3; a: Vector3 } | null = null;
  scene.onBeforeCameraRenderObservable.add((cam) => {
    if (!fixa) return;
    const c = cam as TargetCamera;
    c.position.copyFrom(fixa.p);
    c.setTarget(fixa.a);
    c.maxZ = 900;
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
      ehNoite = h >= 0.78 || h < 0.22;
      atualizarNoite();
      // de noite o plástico das peças escurece um pouco com o chão (nunca o escuro de verdade)
      pl.definirLuz(ehNoite ? 0.78 : 1);
    },
    lanterna(i, acesaAgora) {
      const l = lanternas[i];
      if (!l) return;
      l.acesa = acesaAgora;
      por(l.p[0], l.p[1], l.p[2], acesaAgora ? Bloco.LANTERNA : Bloco.LA_BRANCA);
      enviar();
      atualizarNoite();
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
