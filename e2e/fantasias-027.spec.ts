import { test } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T13): as fantasias do tema para a criança (a Bruxinha com a varinha, a Vampirinha, a
 * Fantasminha e o Monstrinho Peludo), vestidas por amigos de mentirinha na menina e no menino, na
 * praça da festa (semente 1337): a fila inteira (as quatro, nas três cores) e cada par de frente e
 * de 3/4, no entardecer e de noite. Só com FANTASIAS_027=1, na placa de vídeo; as fotos vão para
 * `capturas-027/parte1/fantasias-crianca/`.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.FANTASIAS_027, 'só com FANTASIAS_027=1');
test.setTimeout(600_000);

type V3 = [number, number, number];
const PASTA = process.env.FANTASIAS_PASTA ?? 'capturas-027/parte1/fantasias-crianca';
const IDS = ['bruxinha-festa', 'vampirinho-festa', 'fantasminha-festa', 'monstrinho-peludo'];

test('as fantasias da festa na criança, de dia e de noite', async ({ browser }) => {
  const page = await (await browser.newContext(TAMANHOS.pc)).newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
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
  await criarMundo(page, 'fotos-fantasias', 'noite-das-fantasias', {}, 1337);
  await page.goto('/?mundo=fotos-fantasias&escala=1');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.7;
    e.definirClima?.('limpo');
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    w.__camFixa = null;
    e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
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
  await page.waitForTimeout(10_000);
  mkdirSync(PASTA, { recursive: true });
  const base = await page.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    return { x: b.nascimento.x, z: b.nascimento.z, y: b.h + 1 };
  });
  const z = base.z + 6;
  await page.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), { x: base.x - 16, z });
  await page.waitForTimeout(8000);
  // as quatro na menina e no menino (a primeira cor), e a fila de trás com a segunda e a terceira
  const lista = IDS.flatMap((id, i) =>
    (['feminino', 'masculino'] as const).flatMap((corpo, k) =>
      [0, 1, 2].map((cor) => ({
        id: `${id}-${corpo[0]}-${cor}`,
        aparencia: { corpo, cabeloEstilo: k ? 0 : 5, pele: (i + k + cor) % 4, fantasia: { id, cor } },
        x: base.x - 5.1 + i * 3.4 + (k ? 0.6 : -0.6) + (cor ? (cor === 1 ? -0.3 : 0.3) : 0),
        y: base.y,
        z: z + (k ? 0.9 : 0) + cor * 2.2,
        yaw: Math.PI,
      })),
    ),
  );
  await page.evaluate((l) => window.__brumaluz!.amigosDeTeste!(l), lista);
  await page.waitForTimeout(3000);
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.rotulo-amigo'))) el.style.display = 'none';
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  const y = base.y;
  for (const [hora, nome] of [
    [0.7, 'entardecer'],
    [0.85, 'noite'],
  ] as const) {
    await page.evaluate((h) => {
      window.__brumaluz!.hora = h;
    }, hora);
    await page.waitForTimeout(2500);
    const tomadas: Array<[string, V3, V3]> = [['fila', [base.x, y + 2.4, z - 9.5], [base.x, y + 1.0, z + 2]]];
    IDS.forEach((id, i) => {
      const x = base.x - 5.1 + i * 3.4;
      tomadas.push([`${id}-frente`, [x, y + 1.6, z - 3.2], [x, y + 1.05, z + 0.4]]);
      tomadas.push([`${id}-lado`, [x - 2.4, y + 1.7, z - 2.0], [x, y + 1.05, z + 0.4]]);
    });
    for (const [t, p, a] of tomadas) {
      await page.evaluate(({ p, a }) => {
        (window as unknown as { __camFixa: { p: V3; a: V3 } }).__camFixa = { p, a };
      }, { p, a });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${PASTA}/${t}-${nome}-pc.jpg`, type: 'jpeg', quality: 86 });
    }
  }
  await page.context().close();
});
