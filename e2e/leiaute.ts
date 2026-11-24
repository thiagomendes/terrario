import type { Page } from '@playwright/test';

/**
 * As caixas do HUD para os testes de leiaute (spec 023, promovidas do alma.spec.ts): as da alma
 * (carteira, selinho da missão e plaquinha do guia) e as do HUD que elas não podem tapar, em px
 * CSS. Não é um teste.
 */
export async function caixasDoHud(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 2 &&
        r.height > 2 &&
        cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        Number(cs.opacity) > 0.05
      );
    };
    const caixa = (el: Element) => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left,
        y: r.top,
        w: r.width,
        h: r.height,
        nome: (el.className || el.tagName).toString().slice(0, 40),
      };
    };
    const alma = Array.from(document.querySelectorAll('[data-alma-carteira], [data-alma-missao], [data-guia-placa]'))
      .filter(vis)
      .map(caixa);
    const hud = Array.from(
      document.querySelectorAll(
        '.hud-info, .menu-hud, .bussola, .minimapa, .barra, [data-botao-mochila], .toque .joystick, .toque .botoes > *, .toque .topo > *, .toque .correr, .botao-amigos, .hud .chip-hud, .status .linha-icones',
      ),
    )
      .filter(vis)
      .filter((el) => !el.closest('[data-alma-carteira], [data-alma-missao]'))
      .map(caixa);
    return { alma, hud, W: innerWidth, H: innerHeight };
  });
}

export type CaixasDoHud = Awaited<ReturnType<typeof caixasDoHud>>;

/** O que está errado: caixa da alma fora da tela ou por cima de uma do HUD (folga de 2 px). */
export function sobrepostas(c: CaixasDoHud): string[] {
  const out: string[] = [];
  const folga = 2;
  for (const a of c.alma) {
    if (a.x < 0 || a.y < 0 || a.x + a.w > c.W || a.y + a.h > c.H)
      out.push(`${a.nome} fora da tela`);
    for (const b of c.hud) {
      const x = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const y = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (x > folga && y > folga) out.push(`${a.nome} × ${b.nome}`);
    }
  }
  return out;
}

/** As caixas do HUD fora da tela (o corte: nada do HUD pode ficar fora da área visível). */
export function foraDaTela(c: CaixasDoHud): string[] {
  return c.hud
    .filter((b) => b.x < -1 || b.y < -1 || b.x + b.w > c.W + 1 || b.y + b.h > c.H + 1)
    .map((b) => `${b.nome} fora da tela`);
}
