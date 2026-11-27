import { expect, test, type Page } from '@playwright/test';

/**
 * Spec 039 (T03): um mundo salvo pela `main` (as camas de uma célula, sem `extras.camas`) abre no
 * aparelho com as camas convertidas pelo núcleo: a que tem a frente livre ganha o pé, a que tem
 * uma parede na frente vira a curtinha; a cópia da tela recebe as mesmas células, nada some, o
 * lugar de nascer fica, e o salvamento marca a conversão (recarregar não converte de novo).
 */
const ID = 'camas-da-main';
/** As células, no pedaço 0,0, bem acima do chão (um chão de tábuas só para elas). */
const Y = 100;
const A = { x: 4, z: 4 };
const B = { x: 8, z: 4 };
const indice = (x: number, y: number, z: number) => (y * 16 + z) * 16 + x;

async function gravarMundoDaMain(page: Page): Promise<void> {
  const edicoes: [number, number][] = [];
  for (let x = 2; x <= 10; x++) for (let z = 2; z <= 8; z++) edicoes.push([indice(x, Y - 1, z), 7]);
  // A e B olham para +z (o metadado 0): a frente de A está livre; na de B há uma tábua
  edicoes.push([indice(A.x, Y, A.z), 56]);
  edicoes.push([indice(B.x, Y, B.z), 56]);
  edicoes.push([indice(B.x, Y, B.z + 1), 7]);
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    ({ id, edicoes }) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('kv', 'readwrite');
          const kv = tx.objectStore('kv');
          const agora = 1_700_000_000_000;
          kv.put(
            [
              {
                id,
                nome: 'Casa da main',
                semente: 1337,
                modo: 'criativo',
                criadoEm: agora,
                jogadoEm: agora,
                versao: 2,
                tema: 'rancho-alegre',
              },
            ],
            'mundos',
          );
          kv.put(
            {
              versao: 1,
              edicoes: { '0,0': edicoes },
              jogador: { x: 6.5, y: 100, z: 1.5, yaw: 0, pitch: 0 },
              hora: 0.4,
              extras: { spawn: { x: 6.5, z: 1.5 } },
            },
            `mundo:${id}`,
          );
          kv.put(2, 'formato');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { id: ID, edicoes },
  );
}

async function abrir(page: Page, erros: string[]): Promise<void> {
  await page.goto(`/?mundo=${ID}`);
  await page
    .waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 120_000 })
    .catch((e) => {
      throw new Error(`a página não ficou pronta (${String(e)}); erros: ${erros.join(' | ')}`);
    });
  await page.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
}

/** As células das duas camas, como a tela as vê: [bloco, metadado]. */
async function camas(page: Page) {
  return page.evaluate(
    ({ A, B, Y }) => {
      const e = window.__brumaluz!;
      const c = (x: number, z: number) => [e.bloco!(x, Y, z), e.meta!(x, Y, z)];
      return { a: c(A.x, A.z), pe: c(A.x, A.z + 1), b: c(B.x, B.z), frenteB: c(B.x, B.z + 1) };
    },
    { A, B, Y },
  );
}

const CONVERTIDAS = {
  // a cabeceira (direção 0, parte 0) e o pé (parte 1: metadado 4)
  a: [56, 0],
  pe: [56, 4],
  // a curtinha (parte 2: metadado 8) e a tábua que ficou na frente dela
  b: [56, 8],
  frenteB: [7, 0],
};

test('o mundo da main abre com as camas novas e a curtinha, e recarrega igual', async ({ page }) => {
  test.setTimeout(300_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await gravarMundoDaMain(page);
  await abrir(page, erros);
  // o primeiro quadro do núcleo leva as células convertidas à cópia da tela
  await expect.poll(() => camas(page), { timeout: 30_000 }).toEqual(CONVERTIDAS);
  expect(await page.evaluate(() => window.__brumaluz!.salvar!(true))).toBe(true);
  const salvo = await page.evaluate(
    (id) =>
      new Promise<{ camas: unknown; spawn: unknown }>((resolve) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('kv').objectStore('kv').get(`mundo:${id}`);
          g.onsuccess = () => resolve({ camas: g.result?.extras?.camas, spawn: g.result?.extras?.spawn });
        };
      }),
    ID,
  );
  expect(salvo).toEqual({ camas: 2, spawn: { x: 6.5, z: 1.5 } });
  await page.reload();
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await expect.poll(() => camas(page), { timeout: 30_000 }).toEqual(CONVERTIDAS);
  expect(erros).toEqual([]);
});
