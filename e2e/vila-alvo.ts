import type { Page } from '@playwright/test';

/**
 * Spec 026 (parte 2, etapa B): onde o dedo de verdade toca uma coisa da Vila Neon. O ponto tem
 * de estar livre na tela: longe das bordas e dos controles de toque (no joystick, o dedo pega o
 * joystick, como pegaria o da criança). Se não está, a câmera olha um pouco mais para cima ou
 * para baixo (como a criança que arrasta o dedo para olhar) até a coisa ficar num lugar bom.
 */
type Ponto = { x: number; y: number };
type Leitura = { t: Ponto | null; p: [number, number, number] | null; pronto: boolean };

/** Inclinações da câmera para tentar (negativo olha para cima). */
const INCLINACOES = [0.15, 0.35, -0.05, 0.5, -0.25, 0.65, -0.4];

async function enquadrar(
  page: Page,
  ler: () => Promise<Leitura>,
  teto: number,
  nome: string,
): Promise<Ponto> {
  const fim = Date.now() + teto;
  let k = 0;
  let ultima: Leitura | null = null;
  while (Date.now() < fim) {
    const r = await ler();
    ultima = r;
    if (r.pronto && r.t) {
      const livre = await page.evaluate((t) => {
        if (t.x < 50 || t.x > innerWidth - 50 || t.y < 110 || t.y > innerHeight - 130) return false;
        const toque = document.querySelector<HTMLElement>('[data-toque]');
        if (!toque || toque.hidden) return true;
        for (const el of toque.querySelectorAll<HTMLElement>('.joystick, .botoes > *')) {
          const b = el.getBoundingClientRect();
          if (b.width && t.x > b.left - 36 && t.x < b.right + 36 && t.y > b.top - 36 && t.y < b.bottom + 36)
            return false;
        }
        return true;
      }, r.t);
      if (livre) return r.t;
    }
    if (r.pronto && r.p) {
      await page.evaluate(
        ([p, inc]) => {
          const e = window.__brumaluz!;
          const pes = e.jogadorPes!();
          e.apontar!(Math.atan2(p[0] - pes[0], p[2] - pes[2]), inc);
        },
        [r.p, INCLINACOES[k++ % INCLINACOES.length]] as const,
      );
      await page.waitForTimeout(450);
    } else await page.waitForTimeout(300);
  }
  throw new Error(`${nome}: não ficou num lugar livre da tela (${JSON.stringify(ultima)})`);
}

/**
 * Espera a dica de toque `chave` aparecer, olhando para `p` com inclinações diferentes (a dica só
 * aparece com a coisa num lugar bom da tela, longe dos controles).
 */
export async function esperarDica(
  page: Page,
  chave: string,
  p: readonly [number, number, number],
  teto = 30_000,
): Promise<void> {
  const fim = Date.now() + teto;
  let k = 0;
  while (Date.now() < fim) {
    for (let i = 0; i < 6; i++) {
      if (await page.evaluate((c) => window.__vila!.dica()?.chave === c, chave)) return;
      await page.waitForTimeout(250);
    }
    await page.evaluate(
      ([p, inc]) => {
        const e = window.__brumaluz!;
        const pes = e.jogadorPes!();
        e.apontar!(Math.atan2(p[0] - pes[0], p[2] - pes[2]), inc);
      },
      [p, INCLINACOES[k++ % INCLINACOES.length]] as const,
    );
  }
  throw new Error(`a dica ${chave} não apareceu`);
}

/** O toque `chave` da etapa B (as missões do parque e a rua), com a criança ao alcance. */
export function alvoDoToque(page: Page, chave: string, teto = 30_000): Promise<Ponto> {
  return enquadrar(
    page,
    () =>
      page.evaluate((chave) => {
        const q = window.__vila!.toques().find((t) => t.chave === chave);
        return { t: q?.t ?? null, p: q?.p ?? null, pronto: !!q?.perto };
      }, chave),
    teto,
    chave,
  );
}

/** A cadeira livre do brinquedo de sentar `b` (0 a roda, 1 o carrossel, 2 o bate-bate). */
export function alvoDeSentar(
  page: Page,
  b: number,
  centro: [number, number, number],
  teto = 30_000,
): Promise<Ponto> {
  return enquadrar(
    page,
    async () => ({
      t: await page.evaluate((b) => window.__vila!.parque().sentar[b].t, b),
      p: centro,
      pronto: true,
    }),
    teto,
    `sentar ${b}`,
  );
}
