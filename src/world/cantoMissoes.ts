/**
 * Spec 031: o canto das missões da Era dos Dinos e do Doce Reino. Puro e determinístico (só a
 * semente e o estilo do mundo): o núcleo (servidor da nuvem e modo local), a cena, o trabalhador
 * da malha e a proteção da 016 acham o mesmo canto.
 *
 * O canto fica a uns 12 blocos de onde a criança nasce (as trilhas curtas, de 8 a 15 blocos, são
 * as que ela acompanha), à frente do olhar de quem nasce, num chão que já é quase plano: nada de
 * terreno aplainado em volta. Só cada peça acerta o chão debaixo dela (no máximo dois degraus) e
 * o mato do canto sai, para ninguém tropeçar na árvore.
 *
 * - **Era dos Dinos, o acampamento-mirim:** o ninho de gravetos (desenhado pela cena, por cima
 *   de um fundo de leque de ginkgo), os 3 ovinhos em volta dele (o núcleo põe quando a d1 é
 *   escolhida), a caixa de areia vermelha com 3 rochas de osso e uma cerquinha de gravetos (d3) e o pasto
 *   dos pescoçudos (d2), com dois fardos de capim-dourado.
 * - **Doce Reino, a confeitaria ao ar livre:** o prato do bolo (tablete de caramelo 4 × 4, no nível do chão) com as
 *   células do bolo (chocolate embaixo, chantilly em cima e a vela), que aceitam só o bloco
 *   certo (como a obra da cidade, 014), e o pasto das ovelhas (e2).
 *
 * A proteção da 016 vale para o canto todo: ninguém cava o chão das peças, ninguém põe bloco no
 * ninho nem na caixa de areia; as rochas de osso só saem para quem tem a d3 (o núcleo decide).
 */
import { Bloco } from './blocks';

export type TemaCanto = 'dinos' | 'doce';

/** O bloco do chão da coluna (o do bioma): a geração troca pelo de verdade. */
export const SUPERFICIE = -1;
/** A terra de baixo do chão da coluna. */
export const SUBSOLO = -2;

/** Uma célula pintada pelo canto (`b` pode ser SUPERFICIE ou SUBSOLO). */
export interface CelulaCanto {
  x: number;
  y: number;
  z: number;
  b: number;
}

/** Uma célula do bolo (a ordem é a de pôr: de baixo para cima, a vela por último). */
export interface CelulaBolo {
  i: number;
  x: number;
  y: number;
  z: number;
  bloco: number;
  camada: number;
}

export interface PlanoCanto {
  tema: TemaCanto;
  /** O meio do canto e o rumo de quem vem do nascer (frente = seno, cosseno). */
  x: number;
  z: number;
  yaw: number;
  /** A caixa do canto (inclusiva): o mato sai daqui, a geração pinta aqui. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  celulas: readonly CelulaCanto[];
  /** Colunas de chão protegido (x, z, a altura do chão). */
  chao: readonly (readonly [number, number, number])[];
  /** Células que ficam vazias (ninguém põe bloco): o ninho, a cova, onde os ovinhos ficam. */
  passagens: readonly (readonly [number, number, number])[];
  /** Era dos Dinos: o ninho (o meio, em cima do chão), os ovinhos, as rochas e a caixa. */
  ninho: readonly [number, number, number] | null;
  ovos: readonly (readonly [number, number, number])[];
  fosseis: readonly (readonly [number, number, number])[];
  /** `entrada`: o meio do lado aberto da cerquinha (onde a criança fica para escavar). */
  caixa: {
    x0: number;
    z0: number;
    x1: number;
    z1: number;
    y: number;
    entrada: readonly [number, number];
  } | null;
  /** O pasto dos bichos (o meio, em cima do chão). */
  pasto: readonly [number, number, number];
  /** Doce Reino: a mesa (inclusiva, `y` é o tampo) e as células do bolo. */
  mesa: { x0: number; z0: number; x1: number; z1: number; y: number } | null;
  bolo: readonly CelulaBolo[];
}

/** O que o planejador lê do terreno (a geração dá o dela; os testes, o deles). */
export interface TerrenoCanto {
  altura(x: number, z: number): number;
  /** O chunk da coluna não tem povoado nem estrutura rara (o canto pinta sozinho nele)? */
  livre(x: number, z: number): boolean;
  /**
   * A coluna é terra firme (nem água, nem brejo, nem pico)? `raso`: a última tentativa aceita
   * praia e água rasa (o chão da peça sobe até a altura dela, como uma prainha).
   */
  firme(x: number, z: number, raso?: boolean): boolean;
  nascer: { x: number; z: number };
  /** O chão mais baixo de uma peça (acima do mar). */
  minimo: number;
  /** Para onde quem nasce olha (yaw: frente = seno, cosseno). */
  olhar: number;
}

/** Até onde o meio do canto fica do nascer (blocos), na ordem de preferência. */
const DISTANCIAS = [12, 11, 13, 10, 14, 9, 15, 16, 17] as const;
/** Quanto o chão de uma peça pode variar (o que passa disto não é bom lugar). */
const DEGRAUS = 1;

type Pe = { x: number; z: number; w: number; d: number };

/** As peças de cada tema em coordenadas do canto (s para a direita, f para a frente). */
function pecas(tema: TemaCanto): { nome: string; s: number; f: number; w: number; d: number }[] {
  return tema === 'dinos'
    ? [
        { nome: 'ninho', s: -4, f: 0, w: 3, d: 3 },
        { nome: 'caixa', s: 4, f: 1, w: 5, d: 5 },
        { nome: 'pasto', s: 0, f: 6, w: 5, d: 5 },
      ]
    : [
        { nome: 'mesa', s: -3, f: 0, w: 4, d: 4 },
        { nome: 'pasto', s: 4, f: 3, w: 5, d: 5 },
      ];
}

/** Os ovinhos em volta do ninho (s, f a partir do meio dele): o primeiro do lado de quem vem. */
const OVOS: readonly [number, number][] = [
  [1, -3],
  [3, 1],
  [-2, 3],
];
/** As rochas de osso na cova (3 × 3 do meio da caixa). */
const FOSSEIS: readonly [number, number][] = [
  [-1, -1],
  [1, 0],
  [-1, 1],
];

export function planejarCanto(tema: TemaCanto, t: TerrenoCanto): PlanoCanto | null {
  const lista = pecas(tema);
  let melhor: { nota: number; x: number; z: number; yaw: number } | null = null;
  // perto e plano primeiro; depois perto com degraus; depois mais longe; por fim, na ilha
  // pequena, a prainha (o chão da peça sobe até a altura dela)
  const tentativas = [
    { folga: DEGRAUS, longe: false, raso: false },
    { folga: DEGRAUS + 2, longe: false, raso: false },
    { folga: DEGRAUS + 2, longe: true, raso: false },
    { folga: DEGRAUS + 4, longe: true, raso: true },
  ];
  for (const { folga, longe, raso } of tentativas) {
    if (melhor) break;
    for (let k = 0; k < 16; k++) {
      const giro = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
      const yaw = t.olhar + giro;
      for (const d of longe ? DISTANCIAS : DISTANCIAS.slice(0, 5)) {
        const x = Math.floor(t.nascer.x + Math.sin(yaw) * d);
        const z = Math.floor(t.nascer.z + Math.cos(yaw) * d);
        const nota = notaDoLugar(t, lista, x, z, yaw, folga, raso);
        if (nota === null) continue;
        const total = nota + Math.ceil(k / 2) * 1.5 + Math.abs(d - 12) * 0.8;
        if (!melhor || total < melhor.nota) melhor = { nota: total, x, z, yaw };
      }
    }
  }
  if (!melhor) return null;
  return montar(tema, t, melhor.x, melhor.z, melhor.yaw);
}

/** Onde cada peça cai no mundo (a caixa no chão). */
function pesDasPecas(
  lista: ReturnType<typeof pecas>,
  x: number,
  z: number,
  yaw: number,
): (Pe & { nome: string })[] {
  const fx = Math.sin(yaw);
  const fz = Math.cos(yaw);
  const sx = Math.cos(yaw);
  const sz = -Math.sin(yaw);
  return lista.map((p) => {
    const cx = x + sx * p.s + fx * p.f;
    const cz = z + sz * p.s + fz * p.f;
    return {
      nome: p.nome,
      x: Math.round(cx - (p.w - 1) / 2),
      z: Math.round(cz - (p.d - 1) / 2),
      w: p.w,
      d: p.d,
    };
  });
}

/** Do canto (s, f) para o mundo, a partir de (x, z). */
function noMundo(x: number, z: number, yaw: number, s: number, f: number): [number, number] {
  return [
    Math.round(x + Math.cos(yaw) * s + Math.sin(yaw) * f),
    Math.round(z - Math.sin(yaw) * s + Math.cos(yaw) * f),
  ];
}

function notaDoLugar(
  t: TerrenoCanto,
  lista: ReturnType<typeof pecas>,
  x: number,
  z: number,
  yaw: number,
  folga: number,
  raso: boolean,
): number | null {
  const pes = pesDasPecas(lista, x, z, yaw);
  let nota = 0;
  // a caixa toda (com folga) é terra firme fora de povoado e de estrutura
  const x0 = Math.min(...pes.map((p) => p.x)) - 3;
  const z0 = Math.min(...pes.map((p) => p.z)) - 3;
  const x1 = Math.max(...pes.map((p) => p.x + p.w - 1)) + 3;
  const z1 = Math.max(...pes.map((p) => p.z + p.d - 1)) + 3;
  // longe dos pés de quem nasce (ninguém nasce em cima da mesa)
  if (t.nascer.x >= x0 - 1 && t.nascer.x <= x1 + 1 && t.nascer.z >= z0 - 1 && t.nascer.z <= z1 + 1)
    return null;
  // cada chunk que o canto alcança fica só para ele
  for (let xx = x0; xx <= x1 + 15; xx += 16)
    for (let zz = z0; zz <= z1 + 15; zz += 16)
      if (!t.livre(Math.min(xx, x1), Math.min(zz, z1))) return null;
  for (const p of pes) {
    const hs: number[] = [];
    for (let i = -1; i <= p.w; i++)
      for (let k = -1; k <= p.d; k++) if (!t.firme(p.x + i, p.z + k, raso)) return null;
    for (let i = 0; i < p.w; i++) for (let k = 0; k < p.d; k++) hs.push(t.altura(p.x + i, p.z + k));
    const min = Math.min(...hs);
    const max = Math.max(...hs);
    if (max - min > folga) return null;
    const h0 = Math.max(t.minimo, mediana(hs));
    for (const h of hs) nota += Math.abs(h - h0);
  }
  // o pasto e o canto não ficam muito acima nem abaixo de quem vem (a trilha sobe pouco)
  const hc = t.altura(x, z);
  const hn = t.altura(Math.floor(t.nascer.x), Math.floor(t.nascer.z));
  nota += Math.max(0, Math.abs(hc - hn) - 3) * 2;
  return nota;
}

function mediana(v: number[]): number {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function montar(tema: TemaCanto, t: TerrenoCanto, x: number, z: number, yaw: number): PlanoCanto {
  const pes = pesDasPecas(pecas(tema), x, z, yaw);
  const celulas = new Map<string, CelulaCanto>();
  const por = (cx: number, y: number, cz: number, b: number) =>
    celulas.set(`${cx},${y},${cz}`, { x: cx, y, z: cz, b });
  const chao = new Map<string, [number, number, number]>();
  const protegerChao = (cx: number, cz: number, h: number) => chao.set(`${cx},${cz}`, [cx, cz, h]);
  const passagens: [number, number, number][] = [];
  /** O chão da coluna fica em h0 (sobe com terra e chão do bioma; desce com ar). */
  const nivelar = (cx: number, cz: number, h0: number) => {
    const h = t.altura(cx, cz);
    for (let y = h0 + 1; y <= h; y++) por(cx, y, cz, Bloco.AR);
    for (let y = h + 1; y < h0; y++) por(cx, y, cz, SUBSOLO);
    if (h0 !== h) por(cx, h0, cz, SUPERFICIE);
  };
  const nivelDa = (p: Pe) => {
    const hs: number[] = [];
    for (let i = 0; i < p.w; i++) for (let k = 0; k < p.d; k++) hs.push(t.altura(p.x + i, p.z + k));
    return Math.max(t.minimo, mediana(hs));
  };
  const ocupadas = new Set<string>();
  let ninho: [number, number, number] | null = null;
  const ovos: [number, number, number][] = [];
  const fosseis: [number, number, number][] = [];
  let caixa: PlanoCanto['caixa'] = null;
  let mesa: PlanoCanto['mesa'] = null;
  const bolo: CelulaBolo[] = [];
  let pasto: [number, number, number] = [x + 0.5, t.altura(x, z) + 1, z + 0.5];

  for (const p of pes) {
    const h0 = nivelDa(p);
    for (let i = 0; i < p.w; i++)
      for (let k = 0; k < p.d; k++) {
        const cx = p.x + i;
        const cz = p.z + k;
        ocupadas.add(`${cx},${cz}`);
        if (p.nome !== 'pasto') nivelar(cx, cz, h0);
      }
    // o chão das peças (e uma volta em torno) não se cava
    for (let i = -1; i <= p.w; i++)
      for (let k = -1; k <= p.d; k++) {
        const cx = p.x + i;
        const cz = p.z + k;
        const dentro = i >= 0 && i < p.w && k >= 0 && k < p.d;
        protegerChao(cx, cz, dentro && p.nome !== 'pasto' ? h0 : t.altura(cx, cz));
      }
    const mx = p.x + (p.w - 1) / 2 + 0.5;
    const mz = p.z + (p.d - 1) / 2 + 0.5;
    if (p.nome === 'ninho') {
      // o fundo de folhas de ginkgo (o ninho de gravetos é da cena, por cima)
      const c = p.x + 1;
      const d = p.z + 1;
      por(c, h0, d, Bloco.FOLHAS_OUTONO);
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 3; k++)
          for (const dy of [1, 2]) passagens.push([p.x + i, h0 + dy, p.z + k]);
      ninho = [mx, h0 + 1, mz];
      for (const [s, f] of OVOS) {
        const [ox, oz] = noMundo(c, d, yaw, s, f);
        const oh = Math.max(t.minimo, t.altura(ox, oz));
        nivelar(ox, oz, oh);
        ovos.push([ox + 0.5, oh + 1, oz + 0.5]);
        ocupadas.add(`${ox},${oz}`);
        passagens.push([ox, oh + 1, oz]);
        protegerChao(ox, oz, oh);
      }
    } else if (p.nome === 'caixa') {
      // a borda de areia vermelha e a cova de 3 × 3 um degrau abaixo, com as rochas
      for (let i = 0; i < p.w; i++)
        for (let k = 0; k < p.d; k++) {
          const cx = p.x + i;
          const cz = p.z + k;
          const borda = i === 0 || k === 0 || i === p.w - 1 || k === p.d - 1;
          por(cx, h0, cz, borda ? Bloco.AREIA_DESERTO : Bloco.AR);
          if (!borda) {
            por(cx, h0 - 1, cz, Bloco.AREIA_DESERTO);
            passagens.push([cx, h0, cz]);
          }
          passagens.push([cx, h0 + 1, cz]);
        }
      for (const [s, f] of FOSSEIS) {
        const fx = p.x + 2 + s;
        const fz = p.z + 2 + f;
        por(fx, h0, fz, Bloco.MINERIO_FERRO);
        fosseis.push([fx, h0, fz]);
      }
      // a cerquinha de gravetos em volta, aberta do lado de quem vem do nascer (a entrada)
      const dx = t.nascer.x - mx;
      const dz = t.nascer.z - mz;
      const aberto = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'l' : 'o') : dz > 0 ? 's' : 'n';
      for (let i = -1; i <= p.w; i++)
        for (let k = -1; k <= p.d; k++) {
          const lado = i === -1 ? 'o' : i === p.w ? 'l' : k === -1 ? 'n' : k === p.d ? 's' : null;
          if (!lado) continue;
          const quina = (i === -1 || i === p.w) && (k === -1 || k === p.d);
          const cx = p.x + i;
          const cz = p.z + k;
          ocupadas.add(`${cx},${cz}`);
          if (!quina && lado === aberto) continue;
          por(cx, t.altura(cx, cz) + 1, cz, Bloco.CERCA);
        }
      const meio = (p.w - 1) / 2;
      const entrada: [number, number] =
        aberto === 'o'
          ? [p.x - 1 + 0.5, p.z + meio + 0.5]
          : aberto === 'l'
            ? [p.x + p.w + 0.5, p.z + meio + 0.5]
            : aberto === 'n'
              ? [p.x + meio + 0.5, p.z - 1 + 0.5]
              : [p.x + meio + 0.5, p.z + p.d + 0.5];
      // umas pedrinhas do lado (o lugar de quem cava)
      const [px, pz] = noMundo(mx - 0.5, mz - 0.5, yaw, 4, -1);
      if (!ocupadas.has(`${px},${pz}`)) {
        por(px, t.altura(px, pz) + 1, pz, Bloco.PEDREGULHO);
        ocupadas.add(`${px},${pz}`);
      }
      caixa = { x0: p.x, z0: p.z, x1: p.x + p.w - 1, z1: p.z + p.d - 1, y: h0, entrada };
    } else if (p.nome === 'mesa') {
      for (let i = 0; i < p.w; i++)
        for (let k = 0; k < p.d; k++) por(p.x + i, h0, p.z + k, Bloco.PEDRA_LISA);
      // o prato de caramelo no nível do chão (o bolo grandão fica da altura da criança: os
      // blocos de baixo no meio da tela, onde o dedo e a mãozinha alcançam)
      mesa = { x0: p.x, z0: p.z, x1: p.x + p.w - 1, z1: p.z + p.d - 1, y: h0 };
      // o bolo: 2 × 2 de chocolate, 2 × 2 de chantilly e a vela (9 blocos)
      const camadas: [number, number][] = [
        [Bloco.LA_PRETA, 0],
        [Bloco.TERRA_NEVADA, 1],
      ];
      let n = 0;
      for (const [b, c] of camadas)
        for (const [i, k] of [
          [1, 1],
          [2, 1],
          [1, 2],
          [2, 2],
        ] as const)
          bolo.push({ i: n++, x: p.x + i, y: h0 + 1 + c, z: p.z + k, bloco: b, camada: c });
      // a vela no bloco de chantilly do lado de quem vem (fica à vista de frente)
      const frente = [...bolo.slice(4)].sort(
        (a, b) =>
          Math.hypot(a.x + 0.5 - t.nascer.x, a.z + 0.5 - t.nascer.z) -
          Math.hypot(b.x + 0.5 - t.nascer.x, b.z + 0.5 - t.nascer.z),
      )[0];
      bolo.push({ i: n, x: frente.x, y: h0 + 3, z: frente.z, bloco: Bloco.TOCHA, camada: 2 });
    } else {
      pasto = [mx, t.altura(Math.floor(mx), Math.floor(mz)) + 1, mz];
    }
  }

  // enfeites do tema, só em chão livre (nunca em cima de uma peça)
  const enfeites: [number, number, number][] =
    tema === 'dinos'
      ? [
          [-1, 3, Bloco.GRAMA_ALTA],
          [1, -3, Bloco.FLOR],
          [-6, 3, Bloco.GRAMA_ALTA],
          [6, -2, Bloco.GRAMA_ALTA],
          [-3, 5, Bloco.FENO],
          [3, 8, Bloco.FENO],
          [-7, -1, Bloco.FLOR],
          [2, 4, Bloco.GRAMA_ALTA],
        ]
      : [
          [0, -2, Bloco.FLOR],
          [-6, 2, Bloco.FLOR],
          [1, 2, Bloco.ARBUSTO_FRUTINHAS],
          [7, 0, Bloco.FLOR],
          [-1, 5, Bloco.FLOR],
          [6, 6, Bloco.ARBUSTO_FRUTINHAS],
        ];
  for (const [s, f, b] of enfeites) {
    const [ex, ez] = noMundo(x, z, yaw, s, f);
    if (ocupadas.has(`${ex},${ez}`)) continue;
    ocupadas.add(`${ex},${ez}`);
    por(ex, t.altura(ex, ez) + 1, ez, b);
  }

  const todas = [...celulas.values()];
  const xs = [...todas.map((c) => c.x), ...[...chao.values()].map((c) => c[0])];
  const zs = [...todas.map((c) => c.z), ...[...chao.values()].map((c) => c[1])];
  return {
    tema,
    x: x + 0.5,
    z: z + 0.5,
    yaw,
    x0: Math.min(...xs) - 1,
    z0: Math.min(...zs) - 1,
    x1: Math.max(...xs) + 1,
    z1: Math.max(...zs) + 1,
    celulas: todas,
    chao: [...chao.values()],
    passagens,
    ninho,
    ovos,
    fosseis,
    caixa,
    pasto,
    mesa,
    bolo,
  };
}

/** A célula é do bolo? (a ordem dela e o bloco que pede) */
export function celulaDoBolo(
  p: PlanoCanto | null,
  x: number,
  y: number,
  z: number,
): CelulaBolo | null {
  if (!p || !p.bolo.length) return null;
  return p.bolo.find((c) => c.x === x && c.y === y && c.z === z) ?? null;
}

/** A célula é de uma rocha de osso do canto? */
export function ehFossilDoCanto(p: PlanoCanto | null, x: number, y: number, z: number): boolean {
  return !!p && p.fosseis.some((f) => f[0] === x && f[1] === y && f[2] === z);
}

/** O canto alcança o chunk (cx, cz)? */
export function cantoNoChunk(p: PlanoCanto | null, cx: number, cz: number, folga = 0): boolean {
  if (!p) return false;
  const x0 = cx * 16;
  const z0 = cz * 16;
  return (
    p.x1 + folga >= x0 && p.x0 - folga < x0 + 16 && p.z1 + folga >= z0 && p.z0 - folga < z0 + 16
  );
}

/** A coluna está na caixa do canto (com folga)? */
export function naCaixaDoCanto(p: PlanoCanto | null, x: number, z: number, folga = 0): boolean {
  return !!p && x >= p.x0 - folga && x <= p.x1 + folga && z >= p.z0 - folga && z <= p.z1 + folga;
}
