import { expect, test } from '@playwright/test';

/**
 * Spec 016 (decisão do dono, 11 nov 2026): os mundos de antes da 016 são apagados uma vez,
 * sem erro; o personagem e as preferências ficam, e um aviso curto conta o que houve.
 */
test('mundos de antes somem uma vez; personagem e preferências ficam', async ({ page }) => {
  test.setTimeout(240_000);
  await page.goto('/manifest.webmanifest');
  // como o jogo de antes deixava o aparelho: um mundo no IndexedDB (sem marca de formato)
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        localStorage.setItem('terrario:preferencia-teste', 'fica');
        const req = indexedDB.open('brumaluz', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('kv', 'readwrite');
          const kv = tx.objectStore('kv');
          const t = 1_700_000_000_000;
          kv.put(
            [
              {
                id: 'velho',
                nome: 'Castelo antigo',
                semente: 5,
                modo: 'criativo',
                criadoEm: t,
                jogadoEm: t,
                versao: 2,
              },
            ],
            'mundos',
          );
          kv.put(
            { versao: 1, edicoes: { '0,0': [[1, 7]] }, jogador: null, hora: -1, extras: {} },
            'mundo:velho',
          );
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  // abre um mundo novinho (o de antes não existe mais) e conta uma vez só
  await expect(page.locator('[data-mundo-atual]')).toContainText('Meu primeiro mundo');
  await expect(page.getByText('Os mundos começaram de novo!')).toBeVisible({ timeout: 20_000 });
  const lista = await page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('kv').objectStore('kv').get('mundo:velho');
          g.onsuccess = () => resolve(g.result ?? null);
        };
      }),
  );
  expect(lista).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem('terrario:preferencia-teste'))).toBe(
    'fica',
  );
  await page.reload();
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  await page.waitForTimeout(3000);
  await expect(page.getByText('Os mundos começaram de novo!')).toHaveCount(0);
  expect(erros).toEqual([]);
});
