import { expect, test } from '@playwright/test';
import { temasPedidos } from './temas';

/**
 * Régua de volume da trilha (spec 019, T03 e T05): em cada tema e contexto, a trilha
 * sintetizada de hoje e a gravada, renderizadas offline pela mesma cadeia no padrão (Música
 * 60%). A gravada não pode ficar mais alta que a de hoje (o dono: "sem aumentar o volume da
 * trilha") nem bem mais baixa (o mesmo volume percebido): de 0 a 1 dB abaixo, com folga de
 * medida.
 * TEMAS=<id>,<id> escolhe os temas (padrão: todos). REGUA_CRUA=1 mede sem o ajuste do tema
 * (`NIVEL_TRILHA`), para recalcular a tabela, e não confere os limites.
 */
const TEMAS = temasPedidos(process.env.TEMAS);
const CRUA = process.env.REGUA_CRUA === '1';
/** Folga de medida (dB): as versões das frases são sorteadas e variam uns décimos. */
const FOLGA_DB = 0.25;
/** O mais baixo que a gravada pode ficar (dB abaixo da de hoje). */
const MAIS_BAIXA_DB = -1.5;
/**
 * Spec 034 (T14): a faixa (dB, gravada − hoje) de cada tema. A Vila Neon tem a dela (era o que
 * caía): veio depois desta régua (spec 026) e nunca tocou a trilha sintetizada de antes, que é
 * a "de hoje" aqui; o volume dela foi afinado pelo volume percebido (LUFS) na média do Rancho
 * e da Cidade (026, T18), e o synth-pop, com mais grave, tem o RMS acima no mesmo volume
 * percebido. A faixa é a medida de hoje (dia +0,66, tarde −0,16, noite +1,42, caverna +1,84)
 * com folga; a regra da 026 fica no teste de unidade (tests/audio/somVila.test.ts).
 */
const FAIXA_DB: Record<string, readonly [number, number]> = {
  'vila-neon': [-0.6, 2.1],
};
const faixa = (tema: string) => FAIXA_DB[tema] ?? ([MAIS_BAIXA_DB, FOLGA_DB] as const);
const CONTEXTOS = ['dia', 'tarde', 'noite', 'caverna', 'perigo'] as const;

test('régua de volume: a gravada não fica mais alta que a de hoje', async ({ page }, info) => {
  test.setTimeout(120_000 + TEMAS.length * 300_000);
  expect(TEMAS.length, `nenhum tema pedido em TEMAS=${process.env.TEMAS ?? ''}`).toBeGreaterThan(0);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  const linhas: unknown[] = [];
  for (const id of TEMAS) {
    await page.goto(`/?tema=${id}`);
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 120_000,
    });
    for (const ctx of CONTEXTOS) {
      // o Rancho não tem perigo (a noite é mansa)
      if (ctx === 'perigo' && id === 'rancho-alegre') continue;
      const r = await page.evaluate(([c, crua]) => window.__brumaluz!.trilha!.regua(c, 40, crua), [
        ctx,
        CRUA,
      ] as const);
      linhas.push(r);
      console.log(
        `${r.tema} ${r.contexto}: hoje ${r.hojeDb} dBFS, gravada ${r.gravadaDb} dBFS (${r.diferencaDb >= 0 ? '+' : ''}${r.diferencaDb} dB, ganho ${r.ganho}, ajuste ${r.nivelDb} dB)`,
      );
    }
  }
  await info.attach('regua-trilha', {
    body: JSON.stringify(linhas, null, 2),
    contentType: 'application/json',
  });
  // em todo tema e contexto, a gravada não passa da de hoje e não fica bem mais baixa (a Vila
  // Neon, na faixa dela)
  if (!CRUA)
    for (const r of linhas as { tema: string; contexto: string; diferencaDb: number }[]) {
      const [baixa, alta] = faixa(r.tema);
      expect(r.diferencaDb, `${r.tema} ${r.contexto}`).toBeLessThanOrEqual(alta);
      expect(r.diferencaDb, `${r.tema} ${r.contexto}`).toBeGreaterThanOrEqual(baixa);
    }
  expect(erros).toEqual([]);
});
