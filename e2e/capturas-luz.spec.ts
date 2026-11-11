import { test, type Page } from '@playwright/test';

/**
 * Luz dos bonecos (correção da 017): as mesmas cenas no computador e num celular emulado
 * (iPhone, densidade 3, toque), para comparar antes e depois o brilho de plástico, a sombra
 * de forma e a névoa ao longe. Só com CAPTURAS_LUZ=<pasta>.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = process.env.CAPTURAS_LUZ;
test.skip(!PASTA, 'capturas da luz só com CAPTURAS_LUZ');

const MENINA = { corpo: 'feminino', cabeloEstilo: 5, rosto: 1, cabeloCor: 1, pele: 1 };
const MENINO = { corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2 };
/** O boneco da foto do dono no Rancho: camisa clara, colete vermelho e chapéu de palha. */
const SEM_FANTASIA = {
  corpo: 'masculino',
  cabeloEstilo: 0,
  rosto: 0,
  cabeloCor: 2,
  pele: 0,
  roupaEstilo: 4,
  roupaCor: 10,
  calcaCor: 5,
  acessorio: 'chapeu-palha',
  // null tira a fantasia (undefined some no caminho até a página)
  fantasia: null,
};
const BONECOS: Array<[string, Record<string, unknown>]> = [
  ['princesa', { ...MENINA, fantasia: { id: 'realeza-flores', cor: 0 } }],
  ['heroi', { ...MENINO, fantasia: { id: 'heroi-relampago', cor: 0 } }],
  ['principe', { ...MENINO, fantasia: { id: 'realeza-estrelas', cor: 0 } }],
  ['sem-fantasia', SEM_FANTASIA],
];

const APARELHOS = {
  pc: { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 },
  celular: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
} as const;

async function abrir(page: Page, tema?: string) {
  await page.goto(tema ? `/?tema=${tema}` : '/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.45;
    e.definirClima?.('limpo' as never);
    document.body.classList.add('modo-foto');
  });
}

/** O que o motor desenha de fato (resolução, escala) para o relatório. */
async function medidas(page: Page) {
  return page.evaluate(() => {
    const c = document.querySelector('canvas')!;
    return {
      dpr: devicePixelRatio,
      css: [c.clientWidth, c.clientHeight],
      desenho: [c.width, c.height],
      escala: window.__brumaluz!.escalaResolucao,
    };
  });
}

for (const [aparelho, uso] of Object.entries(APARELHOS)) {
  test.describe(aparelho, () => {
    test.use(uso);

    test(`bonecos na laje (${aparelho})`, async ({ page }) => {
      test.setTimeout(600_000);
      await abrir(page);
      await page.evaluate(async () => {
        const e = window.__brumaluz!;
        const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const [x0, , z0] = e.posicao!;
        const fx = Math.floor(x0);
        const fz = Math.floor(z0);
        e.teleportar!(fx + 0.5, fz + 0.5);
        await espera(1500);
        const fy = Math.floor(e.posicao![1]);
        for (let dx = -9; dx <= 9; dx++)
          for (let dz = -9; dz <= 9; dz++) {
            e.definirBloco!(fx + dx, fy - 1, fz + dz, 45);
            for (let dy = 0; dy < 5; dy++) e.definirBloco!(fx + dx, fy + dy, fz + dz, 0);
          }
        e.teleportar!(fx + 0.5, fz + 0.5, fy);
        await espera(600);
        await e.sincronizar!();
        e.camera?.definirZoom(3.6);
        e.apontar!(0.5, 0.12);
      });
      await page.waitForTimeout(1500);
      for (const [nome, ap] of BONECOS) {
        await page.evaluate((ap) => {
          const e = window.__brumaluz!;
          e.personagem!.definir(ap as never);
          const [cx, , cz] = e.camera!.posicao();
          const [px, , pz] = e.posicao!;
          // três quartos: o lado do sol e o da sombra aparecem juntos
          e.personagem!.girarCorpo?.(Math.atan2(cx - px, cz - pz) - 0.6 - e.camera!.yawCorpo());
        }, ap);
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${PASTA}/${aparelho}-${nome}.png` });
      }
      console.log(aparelho, JSON.stringify(await medidas(page)));
    });

    test(`rancho, morador e cena aberta (${aparelho})`, async ({ page }) => {
      test.setTimeout(600_000);
      await abrir(page, 'rancho-alegre');
      // o boneco da foto do dono, olhando para o sítio (casa e árvores atrás)
      const sitio = await page.evaluate(async (ap) => {
        const e = window.__brumaluz!;
        e.personagem!.definir(ap as never);
        const s = e.povoados!()[0];
        const [x, , z] = e.posicao!;
        e.camera?.definirZoom(4.2);
        e.apontar!(Math.atan2(s.cx - x, s.cz - z), 0.02);
        return s;
      }, SEM_FANTASIA);
      await page.waitForTimeout(3000);
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [cx, , cz] = e.camera!.posicao();
        const [px, , pz] = e.posicao!;
        e.personagem!.girarCorpo?.(Math.atan2(cx - px, cz - pz) - 0.5 - e.camera!.yawCorpo());
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${PASTA}/${aparelho}-rancho.png` });
      // cena aberta: o horizonte (a névoa ao longe), sem o boneco no meio
      await page.evaluate(() => {
        const e = window.__brumaluz!;
        e.camera?.definirZoom(0.5);
        const [x, , z] = e.posicao!;
        const s = e.povoados!()[0];
        e.apontar!(Math.atan2(s.cx - x, s.cz - z) + 0.4, -0.05);
      });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${PASTA}/${aparelho}-aberta.png` });
      // um morador do sítio, de perto
      await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), sitio);
      await page
        .waitForFunction(
          () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
          undefined,
          { timeout: 30_000 },
        )
        .catch(() => undefined);
      for (let i = 0; i < 3; i++) {
        await page.evaluate(() => {
          const e = window.__brumaluz!;
          const [ex, , ez] = e.posicao!;
          const ms = (e.criaturas?.() ?? []).filter((c) => c.tipo === 'morador');
          ms.sort((a, b) => Math.hypot(a.x - ex, a.z - ez) - Math.hypot(b.x - ex, b.z - ez));
          const m = ms[0];
          if (!m) return;
          const d = Math.hypot(m.x - ex, m.z - ez) || 1;
          e.teleportar!(m.x - ((m.x - ex) / d) * 3.2, m.z - ((m.z - ez) / d) * 3.2, m.y);
          e.camera?.definirZoom(2.4);
          e.apontar!(Math.atan2(m.x - ex, m.z - ez), 0.1);
        });
        await page.waitForTimeout(700);
      }
      await page.screenshot({ path: `${PASTA}/${aparelho}-morador.png` });
      console.log(aparelho, JSON.stringify(await medidas(page)));
    });
  });
}
