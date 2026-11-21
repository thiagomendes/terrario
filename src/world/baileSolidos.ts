/**
 * O que segura nas peças da Noite das Fantasias (spec 027), no caminho de `vilaSolidos.ts`: a
 * abóbora gigante, as barracas, as portas fechadas, os bancos, as mesinhas, os postes das
 * lanternas, a bancada, a latada e o carrinho ganham caixas de colisão.
 *
 * - **Do plano, nunca da malha:** cada caixa sai do tipo da peça, da posição e do giro que o
 *   planejador (`noiteFantasias.ts`) dá; o núcleo (o servidor local e o da nuvem) sabe delas sem
 *   desenhar nada. As medidas foram tiradas do desenho (`render/baile/pecas.ts`).
 * - **O que fica de passagem:** o que é fino ou fica no alto (bandeirolas, teias, campainhas,
 *   folhinhas de janela, a lua, as bandeirinhas) e o que é baixinho de pisar (o canteiro de
 *   hortelã, o regador, a estaquinha do canteiro marcado). A vitrine fica atrás do vidro.
 */
import type { CaixaSolida } from '../player/fisica';
import type { PecaBaile, TipoPecaBaile } from './noiteFantasias';

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

function caixasLocais(tipo: TipoPecaBaile, n: number): readonly Local[] {
  switch (tipo) {
    case 'abobora-gigante': {
      // a abóbora redonda: duas caixas em cruz (um octógono por cima), até o alto da casca
      const L = n || 12;
      const h = 0.72 * L;
      return [B(-0.42 * L, 0.42 * L, 0, h, -0.56 * L, 0.56 * L), B(-0.56 * L, 0.56 * L, 0, h, -0.42 * L, 0.42 * L)];
    }
    case 'abobora': {
      const L = (n || 8) / 10;
      return [B(-0.45 * L, 0.45 * L, 0, 0.72 * L, -0.45 * L, 0.45 * L)];
    }
    case 'barraca':
      // o balcão da frente e o fundo com a prateleira (o vendedor fica no meio, livre)
      return [B(-1.9, 1.9, 0, 1.01, 0.2, 0.92), B(-1.9, 1.9, 0, 2.5, -1.12, -0.85)];
    case 'banco':
      return [B(-0.95, 0.95, 0, 0.5, -0.3, 0.3), B(-0.95, 0.95, 0.5, 1.04, -0.3, -0.17)];
    case 'mesinha':
      return [B(-0.5, 0.5, 0, 0.81, -0.5, 0.5), B(-1.07, -0.63, 0, 0.58, -0.22, 0.22), B(0.63, 1.07, 0, 0.58, -0.22, 0.22)];
    case 'mastro':
      return [B(-0.25, 0.25, 0, 0.18, -0.25, 0.25), B(-0.12, 0.12, 0, n / 10, -0.12, 0.12)];
    case 'poste-lanterna':
      return [B(-0.31, 0.31, 0, 0.38, -0.31, 0.31), B(-0.13, 0.13, 0, 2, -0.13, 0.13)];
    case 'lanterna-bosque':
      return [B(-0.31, 0.31, 0, 0.38, -0.31, 0.31), B(-0.14, 0.14, 0, 2.1, -0.14, 0.14), B(-0.3, 0.3, 2.1, 3.3, -0.3, 0.3)];
    // as portas fechadas enchem o vão (ninguém entra antes da parte 2)
    case 'porta':
      return [B(-0.5, 0.5, 0, 2.0, -0.2, 0.06)];
    case 'porta-vovo':
      return [B(-1.5, 1.5, 0, 3.0, -0.2, 0.06)];
    case 'porta-loja':
      return [B(-1.5, 1.5, 0, 3.0, -0.16, 0.1)];
    case 'porta-castelo':
      return [B(-1.5, 1.5, 0, 3.0, -0.12, 0.12)];
    case 'porta-vassouras':
      return [B(-0.5, 0.5, 0, 1.8, -0.52, -0.2)];
    case 'banquinho':
      return [B(-0.36, 0.36, 0, 0.5, -0.22, 0.22)];
    case 'bancada':
      // (spec 027, T14: mais larga, com as surpresas de uva do lado das abóboras)
      return [B(-1.85, 1.85, 0, 1.0, -0.45, 0.45)];
    case 'parreira': {
      const out: Local[] = [];
      for (const x of [-3.8, 0, 3.8]) for (const z of [-0.7, 0.7]) out.push(B(x - 0.08, x + 0.08, 0, 2.4, z - 0.08, z + 0.08));
      return out;
    }
    case 'carrinho':
      return [B(-0.5, 0.5, 0, 0.9, -0.5, 1.0)];
    case 'poleiro':
      return [B(-0.18, 0.18, 0, 2.5, -0.18, 0.18)];
    default:
      return [];
  }
}

/** As caixas da peça no mundo (o giro de `dir` em passos de 90°, como o desenho). */
export function caixasDaPecaBaile(p: PecaBaile): CaixaSolida[] {
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
