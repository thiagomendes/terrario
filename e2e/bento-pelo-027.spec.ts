import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T08): o pelo do Bento para o dono escolher. As três versões lado a lado, todas
 * verde-musgo (A: tufos grandes e redondos, a recomendada; B: tufos miúdos e cheios; C: mechas
 * compridas), vestidas por três amigos de mentirinha na praça da Noite das Fantasias (semente
 * 1337), nas mesmas tomadas (de frente, de 3/4, de costas e de perto), no entardecer (0,7) e de
 * noite (0,85). Na placa de vídeo (scripts/e2e-gpu.sh), só com BENTO_027=1; as fotos vão para
 * `capturas-027/parte1/bento/` (ou BENTO_PASTA).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.BENTO_027, 'só com BENTO_027=1');
test.setTimeout(600_000);

type V3 = [number, number, number];
const PASTA = process.env.BENTO_PASTA ?? 'capturas-027/parte1/bento';
const VERSOES = [
  ['A tufos grandes', 'tufos'],
  ['B tufos miudos', 'miudos'],
  ['C mechas', 'mechas'],
] as const;

async function abrir(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 4, mostrarFps: false, mostrarAtalhos: false, qualidade: 'alta' }),
      );
    } catch {
      // sem armazenamento
    }
  });
  await criarMundo(page, 'fotos-bento', 'noite-das-fantasias', {}, 1337);
  await page.goto('/?mundo=fotos-bento&escala=1');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.7;
    e.definirClima?.('limpo');
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    w.__camFixa = null;
    const scene = e.cenaBabylon!();
    scene.onBeforeCameraRenderObservable.add((c) => {
      const f = w.__camFixa;
      if (!f) return;
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
      };
      cam.position.set(...f.p);
      const alvo = cam.position.clone();
      alvo.set(...f.a);
      cam.setTarget(alvo);
      (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
  await page.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
  await page.waitForTimeout(12_000);
}

test('o pelo do Bento: as três versões lado a lado, de dia e de noite', async ({ browser }) => {
  const page = await (await browser.newContext(TAMANHOS.pc)).newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await abrir(page);
  mkdirSync(PASTA, { recursive: true });
  const base = await page.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    return { x: b.nascimento.x, z: b.nascimento.z, y: b.h + 1 };
  });
  // os três lado a lado na beira sul da praça, de frente para o norte (para a câmera, com as
  // casinhas e a praça atrás dela); a criança fica longe, fora da foto
  const z = base.z + 1;
  // (A à esquerda, C à direita na foto de frente)
  const lugar = (i: number) => base.x - 1.9 + i * 1.9;
  await page.evaluate(
    ({ x, z }) => {
      window.__brumaluz!.teleportar!(x, z);
    },
    // (fora de todas as tomadas e perto o bastante para os pedaços em volta deles ficarem)
    { x: base.x - 16, z: z },
  );
  await page.waitForTimeout(8000);
  for (let n = 1; n <= VERSOES.length; n++) {
    // o pelo vale para o boneco montado agora: um amigo de cada vez, cada um com a versão dele
    await page.evaluate(
      ({ estilo, lista }) => {
        const e = window.__brumaluz!;
        e.peloDeTeste!(estilo as never);
        e.amigosDeTeste!(lista);
      },
      {
        estilo: VERSOES[n - 1][1],
        lista: VERSOES.slice(0, n).map(([id], i) => ({
          id,
          aparencia: { corpo: 'masculino', cabeloEstilo: 0, pele: 2, fantasia: { id: 'bento-peludo', cor: 0 } },
          x: lugar(i),
          y: base.y,
          z,
          yaw: Math.PI,
        })),
      },
    );
    await page.waitForTimeout(1500);
  }
  await page.evaluate(() => window.__brumaluz!.peloDeTeste!(null));
  const y = base.y;
  // a câmera ao norte deles (de frente), de 3/4, de costas (do sul) e de perto do rosto
  const tomadas: Array<[string, V3, V3]> = [
    ['frente', [base.x, y + 1.5, z - 5.2], [base.x, y + 1.0, z]],
    ['tres-quartos', [base.x - 4.2, y + 1.7, z - 3.6], [base.x + 0.3, y + 1.0, z]],
    ['costas', [base.x + 0.6, y + 1.6, z + 5], [base.x, y + 1.0, z]],
    ['perto', [base.x, y + 1.75, z - 3.1], [base.x, y + 1.45, z]],
  ];
  // sem o HUD, mas com o nome de cada versão por cima da cabeça
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (
        el !== cena &&
        !el.contains(cena) &&
        !el.classList.contains('rotulo-amigo') &&
        !el.querySelector('.rotulo-amigo') &&
        !el.closest('.rotulo-amigo')
      )
        el.style.visibility = 'hidden';
  });
  for (const [hora, nome] of [
    [0.7, 'entardecer'],
    [0.85, 'noite'],
  ] as const) {
    await page.evaluate((h) => {
      window.__brumaluz!.hora = h;
    }, hora);
    await page.waitForTimeout(2500);
    for (const [t, p, a] of tomadas) {
      await page.evaluate(
        ({ p, a }) => {
          (window as unknown as { __camFixa: { p: V3; a: V3 } }).__camFixa = { p, a };
        },
        { p, a },
      );
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${PASTA}/bento-${t}-${nome}-pc.jpg`, type: 'jpeg', quality: 86 });
    }
  }
  await page.context().close();
});
