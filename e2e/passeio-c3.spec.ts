import { expect, test } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * 023 (depois de publicada): o passeio da Cidade (c3: padaria, escola e sorveteria) acende a
 * bolinha do lugar visitado, não a primeira. A criança vai à sorveteria primeiro: a terceira
 * bolinha (a da sorveteria) acende; depois a padaria: a primeira. Captura em PASSEIO_PASTA.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.PASSEIO_PASTA ?? 'test-results/passeio';

test('passeio c3: a bolinha do lugar visitado acende', async ({ page }) => {
  test.setTimeout(400_000);
  mkdirSync(PASTA, { recursive: true });
  await page.setViewportSize({ width: 1280, height: 720 });
  // um mundo da Cidade em que c1 e c2 já foram (a c3, o passeio, é a primeira aberta)
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    () =>
      new Promise<void>((ok, erro) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onerror = () => erro(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('kv', 'readwrite');
          const kv = tx.objectStore('kv');
          const agora = 1_700_000_000_000;
          kv.put(
            [
              {
                id: 'passeio',
                nome: 'Passeio',
                semente: 1337,
                modo: 'criativo',
                criadoEm: agora,
                jogadoEm: agora,
                versao: 2,
                tema: 'cidade-grande',
              },
            ],
            'mundos',
          );
          kv.put(
            {
              versao: 1,
              edicoes: {},
              jogador: null,
              hora: -1,
              extras: { alma: { local: { feitas: ['c1', 'c2'] } } },
            },
            'mundo:passeio',
          );
          kv.put(2, 'formato');
          tx.oncomplete = () => {
            db.close();
            ok();
          };
          tx.onerror = () => erro(tx.error);
        };
      }),
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      'terrario:config',
      JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
    );
    // o quadro de missões não abre sozinho (já foi visto)
    localStorage.setItem('terrario:alma-quadro-visto', JSON.stringify(['passeio']));
  });
  await page.goto('/?mundo=passeio');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
  const cartao = page.locator('[data-alma-missao]');
  await expect(cartao).toHaveAttribute('data-missao', 'c3', { timeout: 30_000 });
  const acesas = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-alma-missao] .alma-bolinhas .b')].map((b) =>
        b.classList.contains('cheia'),
      ),
    );
  expect(await acesas()).toEqual([false, false, false]);
  await page.keyboard.press('Escape');

  const ir = async (uso: string) => {
    await page.evaluate((uso) => {
      const e = window.__brumaluz!;
      const l = e.cidade!()!.lotes.find((q) => q.uso === uso)!;
      e.teleportar!(l.x0 + l.largura / 2, l.z0 + l.profundidade / 2);
    }, uso);
  };
  // a sorveteria primeiro: acende a terceira (a da sorveteria)
  await ir('sorveteria');
  await expect.poll(acesas, { timeout: 20_000 }).toEqual([false, false, true]);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${PASTA}/c3-sorveteria-primeiro.png` });
  await cartao.screenshot({ path: `${PASTA}/c3-sorveteria-primeiro-cartao.png` });
  // depois a padaria: a primeira
  await ir('padaria');
  await expect.poll(acesas, { timeout: 20_000 }).toEqual([true, false, true]);
  await page.waitForTimeout(1200);
  await cartao.screenshot({ path: `${PASTA}/c3-padaria-depois-cartao.png` });
  // o quadro também mostra cada bolinha no seu lugar
  await cartao.click();
  const oferta = page.locator('.alma-oferta[data-missao="c3"] .alma-bolinhas .b');
  await expect(oferta).toHaveCount(3);
  expect(await oferta.evaluateAll((bs) => bs.map((b) => b.classList.contains('cheia')))).toEqual([
    true,
    false,
    true,
  ]);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${PASTA}/c3-quadro.png` });
});
