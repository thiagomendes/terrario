import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Spec 034 (T00 e T15): o nascer dos cinco mundos que ficam, para comparar antes e depois de
 * os quatro saírem. Fora da suíte: só roda com CAPTURAS_034=antes ou CAPTURAS_034=depois (a
 * pasta das fotos), por exemplo
 *   CAPTURAS_034=antes npx playwright test e2e/capturas-034.spec.ts --workers 2 --trace off
 *
 * O mundo é gravado direto no banco do jogo com o tema, a semente e o modo (como na paridade),
 * e aberto por `?mundo=`: antes e depois passam pelo mesmo caminho, sem depender do "Meu
 * primeiro mundo" nem da prévia de tema. Hora parada às 0,45 e tempo limpo; a câmera é a do
 * nascer (ninguém aponta). Duas fotos por tamanho: com a interface e só a cena. A resolução fica
 * fixa (`escala=1`): sem o ajuste automático pelos quadros por segundo nem o corte de efeitos
 * do celular, que mudam com a velocidade da máquina.
 *
 * A comparação de antes e depois é visual (olhando as fotos lado a lado), não pixel a pixel:
 * a física, as criaturas e os moradores andam com o relógio e nunca saem no mesmo lugar.
 */
declare const process: { env: Record<string, string | undefined> };
const pedido = process.env.CAPTURAS_034;
test.skip(!pedido, 'capturas da 034 só com CAPTURAS_034=antes ou CAPTURAS_034=depois');
if (pedido && pedido !== 'antes' && pedido !== 'depois')
  throw new Error(`CAPTURAS_034 aceita só "antes" ou "depois" (veio "${pedido}")`);

const PASTA = `capturas-034/${pedido}`;
const CINCO = [
  'vila-neon',
  'cidade-grande',
  'rancho-alegre',
  'doce-reino',
  'exploracao-lunar',
] as const;
const SEMENTE = 1337;
const HORA = 0.45;
const ID_MUNDO = 'capturas-034';

async function abrir(page: Page, tema: string) {
  // uma página leve da mesma origem para gravar o mundo direto no banco do jogo
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    ({ id, semente, tema }) =>
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
                nome: 'Capturas',
                semente,
                modo: 'criativo',
                criadoEm: agora,
                jogadoEm: agora,
                versao: 2,
                tema,
              },
            ],
            'mundos',
          );
          kv.put({ versao: 1, edicoes: {}, jogador: null, hora: -1, extras: {} }, `mundo:${id}`);
          // spec 016: o formato dos mundos de agora (senão o jogo apaga como mundo antigo)
          kv.put(2, 'formato');
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { id: ID_MUNDO, semente: SEMENTE, tema },
  );
  await page.goto(`/?mundo=${ID_MUNDO}&escala=1`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(
    ({ hora }) => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = hora;
      e.definirClima?.('limpo');
    },
    { hora: HORA },
  );
  // os chunks em volta chegam (a contagem para de subir)
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= 12) break;
    antes = n;
  }
  await page.waitForTimeout(1500);
}

async function fotos(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 85 });
  // só a cena: tudo o que não é o canvas some (a interface muda na 034; o mundo não)
  await page.evaluate(() => {
    const tela = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== tela && !el.contains(tela)) el.style.visibility = 'hidden';
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${PASTA}/${nome}-cena.jpg`, type: 'jpeg', quality: 85 });
}

test.describe('computador 1280 × 720', () => {
  test.use({ viewport: { width: 1280, height: 720 } });
  for (const tema of CINCO)
    test(`nascer: ${tema} · 1280 × 720`, async ({ page }) => {
      test.setTimeout(600_000);
      await abrir(page, tema);
      await fotos(page, `${tema}-1280x720`);
    });
});

test.describe('celular 390 × 844', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const tema of CINCO)
    test(`nascer: ${tema} · 390 × 844`, async ({ page }) => {
      test.setTimeout(600_000);
      await abrir(page, tema);
      await fotos(page, `${tema}-390x844`);
    });
});
