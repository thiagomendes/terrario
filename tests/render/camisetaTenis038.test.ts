import { describe, expect, it } from 'vitest';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { BRILHOS, PEIXES, corDoCometa } from '../../src/render/premiumLuzes';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import '../../src/temas/todos';

/**
 * Spec 038 (T04): os dois itens antigos redesenhados, com o mesmo id e o mesmo preço.
 * - **A camiseta de aquário** (Peixinhos de bolinhas): nenhum peixe tem listra, e o peixe laranja
 *   de antes não volta; o da frente é amarelo de bolinhas brancas.
 * - **O tênis-cometa** (Violeta e ouro): nada de rosa nem de azul, nem nas peças, nem na faixa de
 *   luz, nem nos brilhos; só o violeta, o ouro e o branco.
 */
const matiz = (hex: string): { h: number; s: number; l: number } => {
  const c = Color3.FromHexString(hex);
  const mx = Math.max(c.r, c.g, c.b);
  const mn = Math.min(c.r, c.g, c.b);
  const l = (mx + mn) / 2;
  const d = mx - mn;
  if (d < 1e-6) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === c.r ? ((c.g - c.b) / d) % 6 : mx === c.g ? (c.b - c.r) / d + 2 : (c.r - c.g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s, l };
};
/** Violeta (250° a 290°), ouro e amarelo (35° a 60°) ou quase branco. */
const doTenis = (hex: string) => {
  const { h, s, l } = matiz(hex);
  return s < 0.25 || l > 0.9 || (h >= 245 && h <= 290) || (h >= 35 && h <= 60);
};

describe('spec 038 (T04): a camiseta de aquário, Peixinhos de bolinhas', () => {
  it('nenhum peixe tem listra; o da frente é amarelo de bolinhas brancas', () => {
    for (const p of PEIXES) expect('listras' in p, JSON.stringify(p)).toBe(false);
    const frente = PEIXES[0];
    expect(frente.corpo).toBe('#ffd23a');
    expect(frente.pintas).toBe('#ffffff');
    // o laranja de antes (o do peixe de listras) não volta
    expect(PEIXES.some((p) => p.corpo.toLowerCase() === '#ff8a1f')).toBe(false);
  });
});

describe('spec 038 (T04): o tênis-cometa, Violeta e ouro', () => {
  it('as peças do tênis só no violeta, no ouro e no branco (e o degradê do cano também)', () => {
    const pl = planoBoneco(normalizarAparencia({ premium: { roupa: 'tenis-cometa' } }));
    const ruins: string[] = [];
    for (const p of pl.pecas.filter((q) => /-tenis-/.test(q.nome))) {
      if (!doTenis(p.cor)) ruins.push(`${p.nome} ${p.cor}`);
      if (p.pintar)
        for (const y of [-0.4, -0.3, -0.2, -0.1]) {
          const c = p.pintar(0, y, 0.05);
          if (!doTenis(c)) ruins.push(`${p.nome} degradê ${c}`);
        }
    }
    expect(ruins).toEqual([]);
  });

  it('a faixa de luz vai do ouro ao ouro claro, sem azul, e os brilhos ficam no ouro e no violeta', () => {
    const c = new Color3();
    for (let t = 0; t < 2.4; t += 0.05) {
      corDoCometa(t, c);
      expect(c.b).toBeLessThan(c.g);
      expect(c.g).toBeLessThanOrEqual(c.r);
      expect(doTenis(c.toHexString())).toBe(true);
    }
    for (const cor of BRILHOS.cometa) expect(doTenis(cor), cor).toBe(true);
  });
});
