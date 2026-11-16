/**
 * O que segura nas peças da Vila Neon (spec 026, o pedido do dono: "o personagem atravessando
 * objetos e bichos"). As peças que não são bloco (carros, carrinho de pipoca, rádio e fita
 * gigantes, máquinas, bancos, parquinho, mural, orelhão...) ganham caixas de colisão.
 *
 * - **Do plano, nunca da malha:** cada caixa sai do tipo da peça, da posição e do giro que o
 *   planejador (`vilaNeon.ts`) já dá, então o núcleo (o servidor local e o da nuvem) sabe delas
 *   sem desenhar nada. As medidas foram tiradas do desenho de cada peça (`render/vila/*`) e o
 *   teste `tests/world/vilaSolidos.test.ts` confere que a caixa cobre o desenho sem sobrar ar.
 * - **Caixas simples (AABB)**, justas: o boneco não entra na peça e não esbarra no vazio. Peça
 *   comprida ou em degrau (carro, escorregador, fita) tem duas ou três caixas.
 * - **O que fica de passagem:** o que é fino ou fica no alto (varal de lâmpadas, bandeirolas,
 *   pôsteres na parede, letreiros por cima das lojas, holofotes, a pipa, o globo, o pedestal do
 *   microfone, a toalha de piquenique, o varal de roupa, os banquinhos da lanchonete) e o que já
 *   está cercado de blocos (o balcão da banca, as coisas em cima do balcão das barracas).
 * - **A regra do campo de visão:** a caixa mora no chunk da peça e só é lida junto com os blocos
 *   daquela célula (`comPecasDaVila` lê o bloco antes); nada depende da malha desenhada.
 */
import type { CaixaSolida, Solido } from '../player/fisica';
import { estiloMundo, vilaDoMundo } from './chunk';
import { LETREIRO, type PecaVila, type PlanoVila, type TipoPecaVila } from './vilaNeon';

/** Caixa local da peça: x para a direita de quem olha a frente, y para cima, z para a frente. */
type Local = readonly [x0: number, x1: number, y0: number, y1: number, z0: number, z1: number];

const B = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Local => [
  x0,
  x1,
  y0,
  y1,
  z0,
  z1,
];
/** Caixa espelhada nos dois lados (x e -x). */
const par = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Local[] => [
  B(x0, x1, y0, y1, z0, z1),
  B(-x1, -x0, y0, y1, z0, z1),
];

/**
 * As caixas de cada tipo (medidas do desenho, no referencial da peça). Sem entrada: de
 * passagem. Os carros são o corpo baixo do para-choque ao porta-malas e a cabine por cima.
 */
function caixasLocais(tipo: TipoPecaVila, n: number): readonly Local[] {
  switch (tipo) {
    // ---------------------------------------------------------------- os carros parados
    case 'carro':
      return n % 2 === 0
        ? // o hatch em cunha: capô baixo na frente (+z), a traseira alta
          [B(-0.92, 0.92, 0, 0.95, -1.85, 1.88), B(-0.9, 0.9, 0, 1.5, -1.62, 0.4)]
        : // o carrinho bolha
          [B(-0.9, 0.9, 0, 0.93, -1.62, 1.6), B(-0.88, 0.88, 0, 1.58, -1.2, 0.62)];
    case 'van':
      return [B(-1.06, 1.06, 0, 1.82, -2.18, 2.2), B(-1.06, 1.06, 0, 2.45, -2.18, 0.72)];
    case 'picape':
      return [
        B(-0.95, 0.95, 0, 0.98, -1.98, 1.96),
        // a caçamba (as paredes) e a cabine
        B(-0.95, 0.95, 0, 1.36, -1.98, -0.62),
        B(-0.92, 0.92, 0, 1.56, -0.62, 0.45),
      ];
    // ---------------------------------------------------------------- a pracinha
    case 'mural':
      return [B(-1.58, 1.58, 0, 2.6, -0.18, 0.52)];
    case 'gangorra':
      // a prancha inclinada: a ponta de -x embaixo, a de +x no alto
      return [B(-1.74, 0, 0, 0.85, -0.3, 0.3), B(0, 1.74, 0, 1.45, -0.3, 0.3)];
    case 'balanco':
      return [B(-1.82, 1.82, 0, 2.6, -0.82, 0.82)];
    case 'escorregador':
      // a escadinha e o patamar atrás; a rampa em três degraus que descem para a frente
      return [
        B(-0.43, 0.43, 0, 2.3, -1.52, -0.22),
        B(-0.43, 0.43, 0, 1.5, -0.22, 0.7),
        B(-0.43, 0.43, 0, 1.05, 0.7, 1.45),
        B(-0.43, 0.43, 0, 0.48, 1.45, 2.15),
      ];
    case 'banco':
      return [B(-1.0, 1.0, 0, 1.02, -0.36, 0.32)];
    case 'lixeira':
      return [B(-0.28, 0.28, 0, 1.06, -0.28, 0.25)];
    case 'floreira':
      return [B(-0.9, 0.9, 0, 0.82, -0.28, 0.28)];
    case 'pipoca':
      return [B(-0.72, 0.72, 0, 1.8, -0.88, 0.7)];
    // ---------------------------------------------------------------- a rua
    case 'orelhao':
      return [B(-0.54, 0.54, 0, 2.0, -0.5, 0.55)];
    case 'ponto-onibus':
      return [
        // o fundo de vidro com os postes, o banco e a plaquinha do ponto
        B(-1.72, 1.72, 0, 2.45, -0.6, -0.42),
        B(-1.55, 0.25, 0, 0.52, -0.42, 0.02),
        B(2.22, 2.38, 0, 2.7, 0.42, 0.58),
      ];
    case 'bicicleta':
      return [B(-0.8, 0.8, 0, 1.06, -0.25, 0.25)];
    case 'hidrante':
      return [B(-0.32, 0.32, 0, 0.9, -0.22, 0.25)];
    case 'caixa-correio':
      return n >= 9
        ? [B(-0.35, 0.35, 0, 1.2, -0.27, 0.27)]
        : [B(-0.15, 0.15, 0, 1.16, -0.25, 0.25)];
    case 'mesinha':
      // a mesa e os dois banquinhos (o guarda-sol fica acima da cabeça)
      return [B(-0.5, 0.5, 0, 0.81, -0.5, 0.5), ...par(0.65, 1.05, 0, 0.54, -0.2, 0.2)];
    case 'vitrine':
      return [B(-2.2, 2.2, 0, 2.3, -0.25, 0.27)];
    case 'balcao':
      // a lanchonete (o balcão branco); a banca e as barracas já estão cercadas de blocos
      return n === 1 ? [B(-3.1, 3.1, 0, 1.08, -0.5, 0.5)] : [];
    // ---------------------------------------------------------------- os quintais
    case 'casinha-cachorro':
      return [B(-0.72, 0.72, 0, 1.24, -0.72, 0.72)];
    case 'piscininha':
      return [B(-0.95, 0.95, 0, 0.4, -0.95, 0.95)];
    case 'varal-roupa':
      return par(1.25, 1.35, 0, 1.7, -0.05, 0.05);
    // ---------------------------------------------------------------- fliperama e rinque
    case 'maquina':
      return [B(-0.59, 0.59, 0, 2.78, -0.59, 0.7)];
    case 'suporte-patins':
      return [B(-1.55, 1.55, 0, 2.62, -0.3, 0.3)];
    case 'arco-rinque':
      // os dois postes e a trave em cima (o vão de uns 4 blocos fica livre para passar)
      return [...par(2.02, 2.96, 0, 4.6, -0.43, 0.43), B(-2.02, 2.02, 3.9, 4.6, -0.43, 0.43)];
    case 'letreiro':
      // só o pórtico do rinque pisa no chão (os dois postes); os outros ficam no alto
      return n === LETREIRO.rinque ? par(1.85, 2.35, 0, 4.4, -0.25, 0.25) : [];
    // ---------------------------------------------------------------- o festival
    case 'bateria':
      return [B(-2.7, 2.85, 0, 2.2, -1.45, 0.75)];
    case 'teclado':
      return [B(-1.31, 1.31, 0, 0.83, -0.39, 0.42)];
    case 'radio-gigante':
      return [B(-2.5, 2.5, 0, 2.75, -0.65, 0.72)];
    case 'fita-gigante':
      return [
        // a base, a fita em pé e o lápis espetado no carretel
        B(-2.2, 2.2, 0, 0.3, -0.55, 0.55),
        B(-1.95, 1.95, 0, 2.8, -0.27, 0.27),
        B(-0.68, -0.44, 1.47, 1.76, 0.27, 2.17),
      ];
    case 'mesa-som':
      return [B(-2.36, 2.36, 0, 1.55, -0.52, 0.5), B(-0.22, 0.22, 0, 0.62, 0.73, 1.17)];
    // ---------------------------------------------------------------- o parque (parte 2)
    case 'arco-parque':
      // os dois postes (passa-se por baixo do arco)
      return par(2.3, 3.2, 0, 4.36, -0.45, 0.45);
    case 'roda-gigante':
      // as duas sapatas compridas dos cavaletes, baixas como um degrau (a roda gira por cima)
      return par(4.15, 5.25, 0, 0.4, -2.2, 2.2);
    case 'carrossel':
      // o carrossel inteiro, do pedestal ao toldo (um octógono em três caixas): sobe-se pelo
      // toque, nunca andando para cima do deque que gira
      return [
        B(-5.6, 5.6, 0, 4, -2.3, 2.3),
        B(-2.3, 2.3, 0, 4, -5.6, 5.6),
        B(-4, 4, 0, 4, -4, 4),
      ];
    // (a pista do bate-bate é cercada de grade e as prendas das barracas ficam atrás do balcão:
    // já cercadas de blocos, como o balcão da banca)
    case 'algodao':
      return [B(-0.9, 0.9, 0, 2.4, -0.89, 0.53)];
    case 'baloes':
      return [B(-0.31, 0.31, 0, 1.56, -0.31, 0.31)];
    case 'cocho':
      return [B(-0.94, 0.94, 0, 0.76, -0.34, 0.34)];
    default:
      return [];
  }
}

/** Os tipos que seguram (o resto fica de passagem). */
export function pecaSolida(p: PecaVila): boolean {
  return caixasLocais(p.tipo, p.n ?? 0).length > 0;
}

/** As caixas da peça no mundo (o giro de `dir` em passos de 90°, como o desenho). */
export function caixasDaPeca(p: PecaVila): CaixaSolida[] {
  const a = (p.dir & 3) * (Math.PI / 2);
  const c = Math.round(Math.cos(a));
  const s = Math.round(Math.sin(a));
  return caixasLocais(p.tipo, p.n ?? 0).map(([x0, x1, y0, y1, z0, z1]) => {
    // o mesmo referencial do desenho (`Ref.ponto`): x' = x c + z s; z' = -x s + z c
    const xs = [x0 * c + z0 * s, x1 * c + z1 * s];
    const zs = [-x0 * s + z0 * c, -x1 * s + z1 * c];
    return [
      p.x + Math.min(xs[0], xs[1]),
      p.y + y0,
      p.z + Math.min(zs[0], zs[1]),
      p.x + Math.max(xs[0], xs[1]),
      p.y + y1,
      p.z + Math.max(zs[0], zs[1]),
    ] as const;
  });
}

type Rel = [number, number, number, number, number, number];
interface NaCelula {
  abs: CaixaSolida;
  rel: Rel;
}

export interface IndiceVila {
  /** Todas as caixas do bairro. */
  readonly caixas: readonly CaixaSolida[];
  /** As caixas que tocam a célula (null: nenhuma). */
  daCelula(x: number, y: number, z: number): readonly NaCelula[] | null;
}

const chaveCelula = (x: number, y: number, z: number) =>
  ((x + 32768) * 65536 + (z + 32768)) * 512 + y;

const indices = new WeakMap<PlanoVila, IndiceVila>();

/** O índice das caixas do bairro por célula (montado uma vez por plano). */
export function indiceDaVila(plano: PlanoVila): IndiceVila {
  let idx = indices.get(plano);
  if (idx) return idx;
  const caixas: CaixaSolida[] = [];
  for (const p of plano.pecas) caixas.push(...caixasDaPeca(p));
  const mapa = new Map<number, NaCelula[]>();
  for (const c of caixas)
    for (let x = Math.floor(c[0]); x < c[3]; x++)
      for (let y = Math.floor(c[1]); y < c[4]; y++)
        for (let z = Math.floor(c[2]); z < c[5]; z++) {
          const k = chaveCelula(x, y, z);
          const rel: Rel = [c[0] - x, c[1] - y, c[2] - z, c[3] - x, c[4] - y, c[5] - z];
          const l = mapa.get(k);
          if (l) l.push({ abs: c, rel });
          else mapa.set(k, [{ abs: c, rel }]);
        }
  idx = { caixas, daCelula: (x, y, z) => mapa.get(chaveCelula(x, y, z)) ?? null };
  indices.set(plano, idx);
  return idx;
}

/** O índice do bairro do mundo (null fora da Vila Neon; quase de graça nos outros temas). */
export function indiceDoMundo(semente: number): IndiceVila | null {
  if (estiloMundo().povoado?.planta !== 'bairro') return null;
  const p = vilaDoMundo(semente);
  return p ? indiceDaVila(p) : null;
}

/**
 * O mundo sólido com as peças do bairro: a célula que uma caixa toca vira parcial, com as
 * caixas dela (e as do bloco, se houver), como os veículos da cidade (`comCaixasExtras`). O
 * bloco é lido antes (o chunk carrega junto: nada de caixa sem o chão dela). `ignorar`: as
 * caixas em que o boneco já está dentro (nunca prendem: ele sai andando).
 */
export function comPecasDaVila(
  base: Solido,
  semente: number,
  ignorar?: () => ReadonlySet<CaixaSolida> | null,
): Solido {
  // o índice do mundo muda só com o tema (uma comparação por consulta)
  let estiloVisto: unknown = null;
  let idxVisto: IndiceVila | null = null;
  const indice = () => {
    const e = estiloMundo();
    if (e !== estiloVisto) {
      estiloVisto = e;
      idxVisto = indiceDoMundo(semente);
    }
    return idxVisto;
  };
  const pecas = (x: number, y: number, z: number): Rel[] | null => {
    const idx = indice();
    const l = idx?.daCelula(x, y, z);
    if (!l) return null;
    const fora = ignorar?.();
    if (!fora || !fora.size) return l.map((q) => q.rel);
    const r: Rel[] = [];
    for (const q of l) if (!fora.has(q.abs)) r.push(q.rel);
    return r.length ? r : null;
  };
  const s = ((x: number, y: number, z: number) => base(x, y, z) || !!pecas(x, y, z)) as Solido;
  s.liquido = base.liquido;
  s.caixas = (x, y, z) => {
    const solidoBase = base(x, y, z);
    const p = pecas(x, y, z);
    if (!p) return base.caixas ? base.caixas(x, y, z) : null;
    if (!solidoBase) return p;
    return [...(base.caixas?.(x, y, z) ?? [[0, 0, 0, 1, 1, 1]]), ...p];
  };
  return s;
}

/** As caixas do bairro em volta do ponto (x, y, z), até `r` blocos (para o "já está dentro"). */
export function caixasDaVilaPerto(
  semente: number,
  x: number,
  y: number,
  z: number,
  r = 1,
): CaixaSolida[] {
  const idx = indiceDoMundo(semente);
  if (!idx) return [];
  const out = new Set<CaixaSolida>();
  for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++)
    for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++)
      for (let iy = Math.floor(y) - 1; iy <= Math.floor(y + 2); iy++)
        for (const q of idx.daCelula(ix, iy, iz) ?? []) out.add(q.abs);
  return [...out];
}

/**
 * A célula (x, y, z) está tomada por uma peça para quem anda nela (o guia, o pulo para perto)?
 * Vale o miolo da célula, onde o boneco fica de pé (a meia largura dele em volta do centro).
 */
export function celulaTomadaPelaVila(
  plano: PlanoVila | null,
  x: number,
  y: number,
  z: number,
): boolean {
  if (!plano) return false;
  const l = indiceDaVila(plano).daCelula(x, y, z);
  if (!l) return false;
  for (const { rel: c } of l)
    if (c[0] < 0.8 && c[3] > 0.2 && c[2] < 0.8 && c[5] > 0.2 && c[1] < 0.95 && c[4] > 0.05)
      return true;
  return false;
}
