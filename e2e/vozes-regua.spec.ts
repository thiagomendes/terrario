import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { temasPedidos } from './temas';

/**
 * Régua de volume das vozes e dos golpes (spec 019, T05): em cada tema, o som de hoje (voz
 * sintetizada, baque de terra, farfalhar da derrota) e o gravado, renderizados offline com o
 * filtro K, só no tempo em que soam. Por grupo (bichos, moradores, baque, derrota), a média
 * gravada fica do mesmo volume ou um pouco abaixo (de 0 a 1 dB, com folga de medida), e
 * nenhuma fatia sozinha passa muito da média de hoje.
 * TEMAS=<id>,<id> escolhe os temas. REGUA_CRUA=1 mede com ganho 1 e não confere os limites.
 */
const PEDIDOS = temasPedidos(process.env.TEMAS);
/**
 * Spec 034: só os temas com vozes gravadas no índice. A Vila Neon (spec 026, depois desta
 * régua) não tem pacote de vozes de bichos e moradores (o som dela é a música e o show), e a
 * régua caía nela com "tema sem vozes no índice". O teste confere que só ela fica de fora.
 */
const INDICE = JSON.parse(readFileSync('public/sons/indice.json', 'utf8')) as {
  temas: Record<string, { vozes?: { criaturas?: unknown[] } }>;
};
const temVozes = (id: string) => (INDICE.temas[id]?.vozes?.criaturas?.length ?? 0) > 0;
const TEMAS = PEDIDOS.filter(temVozes);
const CRUA = process.env.REGUA_CRUA === '1';
const FOLGA_DB = 0.25;
const MAIS_BAIXA_DB = -1.5;
/** Uma fatia sozinha (a versão mais forte) pode passar da média de hoje até tanto. */
const FATIA_DB = 4.5;

test('régua de volume: vozes e golpes gravados no volume dos de hoje', async ({ page }, info) => {
  test.setTimeout(60_000 + TEMAS.length * 120_000);
  // só a Vila Neon fica de fora (sem vozes gravadas); um tema novo sem vozes quebra aqui
  expect(PEDIDOS.filter((id) => !temVozes(id))).toEqual(
    PEDIDOS.includes('vila-neon') ? ['vila-neon'] : [],
  );
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const todos: unknown[] = [];
  for (const id of TEMAS) {
    await page.goto(`/?tema=${id}`);
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    const r = await page.evaluate((c) => window.__brumaluz!.reguaVozes!(c), CRUA);
    todos.push(r);
    for (const l of r.linhas) {
      console.log(
        `${r.tema} ${l.grupo}: hoje ${l.hojeDb} dB, gravada ${l.gravadaDb} dB (crua ${l.cruaDb}, ganho ${l.ganhoDb}) → ${l.diferencaDb >= 0 ? '+' : ''}${l.diferencaDb} dB; mais alta ${l.maisAltaDb} (${l.nHoje}/${l.nGravada})`,
      );
      if (CRUA) continue;
      const nome = `${r.tema} ${l.grupo}`;
      expect(l.nGravada, nome).toBeGreaterThan(0);
      expect(l.diferencaDb, nome).toBeLessThanOrEqual(FOLGA_DB);
      expect(l.diferencaDb, nome).toBeGreaterThanOrEqual(MAIS_BAIXA_DB);
      expect(l.maisAltaDb, nome).toBeLessThanOrEqual(FATIA_DB);
    }
  }
  await info.attach('regua-vozes', {
    body: JSON.stringify(todos, null, 2),
    contentType: 'application/json',
  });
  expect(erros).toEqual([]);
});
