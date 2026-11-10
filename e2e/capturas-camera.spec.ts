import { test, type Browser, type Page } from '@playwright/test';
import { Bloco } from '../src/world/blocks';

/**
 * Capturas da terceira pessoa (spec 015) nos momentos do esboço aprovado
 * (`.sdd/specs/015-terceira-pessoa/referencia/camera-e-gestos.html`): parado, andando na
 * diagonal, virando, correndo, pulando, dentro de uma casinha (boneco meio transparente) e
 * numa caverna; no computador e no celular, no Rancho Alegre e no Bruma e Luz. Com
 * CAPTURAS_ESBOCO=1, o esboço também é fotografado nos mesmos momentos, para comparar.
 * Pesado: só roda com CAPTURAS_CAMERA=1.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CAPTURAS_CAMERA, 'capturas só com CAPTURAS_CAMERA');
const PASTA = 'capturas-temas/camera015';

const TEMAS = (process.env.CAPTURAS_CAMERA_TEMAS ?? 'rancho-alegre,bruma-e-luz').split(',');
const TELAS = [
  { nome: 'computador', viewport: { width: 1280, height: 720 }, toque: false },
  { nome: 'celular', viewport: { width: 844, height: 390 }, toque: true },
] as const;

async function abrirJogo(browser: Browser, tema: string, tela: (typeof TELAS)[number]) {
  const ctx = await browser.newContext({
    viewport: tela.viewport,
    ...(tela.toque ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}),
  });
  const page = await ctx.newPage();
  await page.goto(`/?tema=${tema}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    window.__brumaluz!.darKit?.();
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.4;
    e.definirClima?.('limpo');
  });
  await page.waitForTimeout(6000);
  return { ctx, page };
}

const foto = (p: Page, nome: string) =>
  p.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 84 });

/** Um lugar perto do nascimento, olhando para o lado mais plano e sem água. */
async function campoAberto(page: Page) {
  await page.evaluate((agua) => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    const topo = (cx: number, cz: number) => {
      for (let yy = Math.floor(y) + 6; yy > Math.floor(y) - 12; yy--) {
        const b = e.bloco!(Math.floor(cx), yy, Math.floor(cz));
        if (b === agua) return { h: yy, agua: true };
        if (b !== 0) return { h: yy, agua: false };
      }
      return { h: -99, agua: false };
    };
    let melhor = 0;
    let nota = Infinity;
    const h0 = topo(x, z).h;
    for (let i = 0; i < 16; i++) {
      const yaw = (i / 16) * Math.PI * 2;
      let n = 0;
      for (let d = 1; d <= 16; d++) {
        const t = topo(x + Math.sin(yaw) * d, z + Math.cos(yaw) * d);
        n += (t.agua ? 20 : 0) + Math.abs(t.h - h0);
      }
      if (n < nota) {
        nota = n;
        melhor = yaw;
      }
    }
    e.apontar!(melhor, 0.32);
    e.teleportar!(x, z);
  }, Bloco.AGUA);
  await page.waitForTimeout(1500);
}

/** Casinha 3x3 por dentro (tábuas e telhado) em volta do jogador. */
async function casinha(page: Page) {
  await page.evaluate(
    (B) => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      const fx = Math.floor(x);
      const fz = Math.floor(z);
      const fy = Math.floor(y - 1.62);
      for (let dx = -2; dx <= 2; dx++)
        for (let dz = -2; dz <= 2; dz++) {
          const borda = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          for (let dy = 0; dy < 3; dy++) {
            const janela = dy === 1 && dz === 2 && dx === 0;
            e.definirBloco!(fx + dx, fy + dy, fz + dz, borda ? (janela ? B.vidro : B.tabuas) : 0);
          }
          e.definirBloco!(fx + dx, fy + 3, fz + dz, B.tabuas);
          e.definirBloco!(fx + dx, fy - 1, fz + dz, B.tabuas);
        }
      e.teleportar!(fx + 0.5, fz + 0.5, fy);
      e.apontar!(0.5, 0.35);
    },
    { tabuas: Bloco.TABUAS, vidro: Bloco.VIDRO },
  );
  await page.waitForTimeout(2500);
}

/** Túnel de pedra de 3x3 (uma caverna feita à mão, sempre igual), acima do terreno. */
async function caverna(page: Page) {
  await page.evaluate(
    (B) => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      const fx = Math.floor(x) + 12;
      const fz = Math.floor(z);
      const fy = Math.floor(y) + 14;
      for (let dx = -3; dx <= 3; dx++)
        for (let dy = -1; dy <= 4; dy++)
          for (let dz = -8; dz <= 8; dz++) {
            const dentro = Math.abs(dx) <= 1 && dy >= 0 && dy <= 2;
            e.definirBloco!(fx + dx, fy + dy, fz + dz, dentro ? 0 : B.pedra);
          }
      // uma tocha na parede para a caverna não ficar só no escuro
      e.definirBloco!(fx - 1, fy + 2, fz + 3, B.tocha);
      e.teleportar!(fx + 0.5, fz - 2.5, fy);
      e.apontar!(0, 0.25);
    },
    { pedra: Bloco.PEDREGULHO, tocha: Bloco.TOCHA },
  );
  await page.waitForTimeout(3000);
}

async function momentos(page: Page, prefixo: string) {
  await campoAberto(page);
  await page.waitForTimeout(1200);
  await foto(page, `${prefixo}-1-parado`);
  // andando na diagonal (frente e direita): o corpo vira para onde anda
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(900);
  await foto(page, `${prefixo}-2-diagonal`);
  // virando: solta a direita e vai para a esquerda (o corpo gira, inclina na curva)
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(160);
  await foto(page, `${prefixo}-3-virando`);
  await page.keyboard.up('KeyA');
  // correndo: passada própria e inclinação
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(1300);
  await foto(page, `${prefixo}-4-correndo`);
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(700);
  // pulo: no alto e a amortecida ao cair
  await page.keyboard.press('Space');
  await page.waitForTimeout(260);
  await foto(page, `${prefixo}-5-pulo`);
  await page
    .waitForFunction(() => window.__brumaluz!.personagem!.pose().corpoY! < -0.02, undefined, {
      timeout: 3000,
      polling: 'raf',
    })
    .catch(() => undefined);
  await foto(page, `${prefixo}-6-aterrissou`);
  await page.waitForTimeout(500);
  // andando sem mexer na câmera, ela volta para trás do boneco
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.apontar!(e.rotacao![1], 0.32);
  });
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(2600);
  await foto(page, `${prefixo}-7-voltando`);
  await page.keyboard.up('KeyD');
  await casinha(page);
  await foto(page, `${prefixo}-8-casinha`);
  await caverna(page);
  await foto(page, `${prefixo}-9-caverna`);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(700);
  await foto(page, `${prefixo}-10-caverna-andando`);
  await page.keyboard.up('KeyW');
}

for (const tema of TEMAS)
  for (const tela of TELAS)
    test(`terceira pessoa: ${tema} no ${tela.nome}`, async ({ browser }) => {
      test.setTimeout(300_000);
      const { ctx, page } = await abrirJogo(browser, tema, tela);
      await momentos(page, `${tema}-${tela.nome}`);
      await ctx.close();
    });

// o esboço aprovado, nos mesmos momentos (precisa da internet para o three.js)
test('esboço aprovado nos mesmos momentos', async ({ browser }) => {
  test.skip(!process.env.CAPTURAS_ESBOCO, 'esboço só com CAPTURAS_ESBOCO');
  test.setTimeout(180_000);
  const fs = await import('node:fs');
  const html = fs.readFileSync(
    '.sdd/specs/015-terceira-pessoa/referencia/camera-e-gestos.html',
    'utf8',
  );
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`,
  );
  await page.waitForTimeout(6000);
  const palco = page.locator('#palco');
  await palco.scrollIntoViewIfNeeded();
  await palco.click({ position: { x: 30, y: 30 } });
  const f = (n: string) =>
    palco.screenshot({ path: `${PASTA}/esboco-${n}.jpg`, type: 'jpeg', quality: 84 });
  await page.waitForTimeout(800);
  await f('1-parado');
  await page.keyboard.down('KeyW');
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(900);
  await f('2-diagonal');
  await page.keyboard.up('KeyD');
  await page.keyboard.down('KeyA');
  await page.waitForTimeout(160);
  await f('3-virando');
  await page.keyboard.up('KeyA');
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(1300);
  await f('4-correndo');
  await page.keyboard.up('ShiftLeft');
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(700);
  await page.keyboard.press('Space');
  await page.waitForTimeout(260);
  await f('5-pulo');
  await ctx.close();
});
