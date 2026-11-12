import { expect, test } from '@playwright/test';
import { temasPedidos } from './temas';

/**
 * Régua de volume da trilha (spec 019, T03): em cada tema, a trilha sintetizada de hoje e a
 * gravada, renderizadas offline pela mesma cadeia no padrão (Música 60%). A gravada não pode
 * ficar mais alta que a de hoje (o dono: "sem aumentar o volume da trilha").
 * TEMAS=<id>,<id> escolhe os temas (padrão: todos).
 */
const TEMAS = temasPedidos(process.env.TEMAS);
/** Folga de medida (dB): as versões das frases são sorteadas e variam uns décimos. */
const FOLGA_DB = 0.25;

test('régua de volume: a gravada não fica mais alta que a de hoje', async ({ page }, info) => {
  test.setTimeout(120_000 + TEMAS.length * 120_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const linhas: unknown[] = [];
  for (const id of TEMAS) {
    await page.goto(`/?tema=${id}`);
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    for (const ctx of ['dia', 'noite'] as const) {
      const r = await page.evaluate((c) => window.__brumaluz!.trilha!.regua(c, 40), ctx);
      linhas.push(r);
      console.log(
        `${r.tema} ${r.contexto}: hoje ${r.hojeDb} dBFS, gravada ${r.gravadaDb} dBFS (${r.diferencaDb >= 0 ? '+' : ''}${r.diferencaDb} dB, ganho ${r.ganho})`,
      );
    }
  }
  await info.attach('regua-trilha', {
    body: JSON.stringify(linhas, null, 2),
    contentType: 'application/json',
  });
  // em todo tema e contexto, a gravada não passa da de hoje
  for (const r of linhas as { tema: string; contexto: string; diferencaDb: number }[])
    expect(r.diferencaDb, `${r.tema} ${r.contexto}`).toBeLessThanOrEqual(FOLGA_DB);
  expect(erros).toEqual([]);
});
