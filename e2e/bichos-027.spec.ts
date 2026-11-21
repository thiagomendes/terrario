import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T12): os bichos da Noite das Fantasias nas fotos (só com BICHOS_027=1, na placa de
 * vídeo), em `capturas-027/parte1/bichos/`:
 * - a fila dos cinco papéis parados na praça (a abóbora saltitante, o morceguinho, o sapinho de
 *   chapeuzinho, o peixinho lilás e a fantasminha de lençol), de frente e de 3/4, no entardecer e
 *   de noite;
 * - o morceguinho voando a 15 blocos, de noite (a silhueta tem de se ler);
 * - o Tufinho no banquinho da varanda da Vovó e a corujinha no poleiro do bosque.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.BICHOS_027, 'só com BICHOS_027=1');
test.setTimeout(600_000);

type V3 = [number, number, number];
const PASTA = process.env.BICHOS_PASTA ?? 'capturas-027/parte1/bichos';

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
  await criarMundo(page, 'fotos-bichos', 'noite-das-fantasias', {}, 1337);
  await page.goto('/?mundo=fotos-bichos&escala=1');
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
    scene.onBeforeRenderObservable.add(() => {
      for (const m of scene.meshes)
        if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = false;
    });
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
  await page.waitForTimeout(8000);
}

async function foto(page: Page, nome: string, p: V3, a: V3) {
  await page.evaluate(({ p, a }) => {
    (window as unknown as { __camFixa: unknown }).__camFixa = { p, a };
  }, { p, a });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 86 });
  console.log(`FOTO ${nome}`);
}

test('os bichos da festa, o morceguinho a 15 blocos, o Tufinho e a corujinha', async ({ browser }) => {
  const page = await (await browser.newContext(TAMANHOS.pc)).newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await abrir(page);
  mkdirSync(PASTA, { recursive: true });
  const b = await page.evaluate(() => {
    const p = window.__brumaluz!.baile!()!;
    const poleiro = p.pecas.find((q) => q.tipo === 'poleiro')!;
    const banco = p.pecas.find((q) => q.tipo === 'banquinho')!;
    return {
      x: p.nascimento.x,
      z: p.nascimento.z,
      y: p.h + 1,
      poleiro: [poleiro.x, poleiro.y, poleiro.z, poleiro.dir] as [number, number, number, number],
      banco: [banco.x, banco.y, banco.z, banco.dir] as [number, number, number, number],
    };
  });
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  // ------------------------------------------------ a fila dos cinco, parados (a vitrine)
  const z = b.z + 6;
  await page.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), { x: b.x - 14, z });
  await page.waitForTimeout(6000);
  const tipos = ['cervo', 'coelho', 'raposa', 'peixe', 'espectro'] as const;
  await page.evaluate(
    ({ b, z, tipos }) => {
      const e = window.__brumaluz!;
      tipos.forEach((t, i) => e.estatua!(t, b.x - 3.2 + i * 1.6, b.y + (t === 'peixe' ? 0.3 : t === 'coelho' ? 0.5 : 0), z, Math.PI));
    },
    { b, z, tipos: [...tipos] },
  );
  for (const [h, nh] of [
    [0.7, 'entardecer'],
    [0.85, 'noite'],
  ] as const) {
    await page.evaluate((h) => {
      window.__brumaluz!.hora = h;
    }, h);
    await page.waitForTimeout(1500);
    await foto(page, `fila-${nh}-pc`, [b.x, b.y + 1.3, z - 4.6], [b.x, b.y + 0.4, z]);
    await foto(page, `fila-lado-${nh}-pc`, [b.x - 4.2, b.y + 1.3, z - 3.0], [b.x + 0.2, b.y + 0.4, z]);
    for (const [i, t] of tipos.entries()) {
      const x = b.x - 3.2 + i * 1.6;
      await foto(page, `${t}-${nh}-pc`, [x + 0.6, b.y + 0.9, z - 1.9], [x, b.y + 0.45, z]);
    }
  }
  // ------------------------------------------------ o morceguinho voando a 15 blocos, de noite
  await page.evaluate(
    ({ b, z }) => {
      const e = window.__brumaluz!;
      e.estatua!('coelho', b.x, b.y + 1.6, z + 15, Math.PI);
    },
    { b, z },
  );
  await foto(page, 'morceguinho-15-blocos-noite-pc', [b.x, b.y + 1.6, z], [b.x, b.y + 1.8, z + 15]);
  // ------------------------------------------------ o Tufinho e a corujinha
  for (const [nome, q, alto, longe] of [
    ['tufinho', b.banco, 0.75, 2.2],
    ['corujinha', b.poleiro, 2.75, 3.2],
  ] as const) {
    const [x, y, zz, dir] = q;
    const a = (dir & 3) * (Math.PI / 2);
    const fx = Math.sin(a);
    const fz = Math.cos(a);
    await page.evaluate(({ x, z }) => window.__brumaluz!.teleportar!(x, z), { x: x + fx * 8, z: zz + fz * 8 });
    await page.waitForTimeout(6000);
    for (const [h, nh] of [
      [0.7, 'entardecer'],
      [0.85, 'noite'],
    ] as const) {
      await page.evaluate((h) => {
        window.__brumaluz!.hora = h;
      }, h);
      await page.waitForTimeout(1200);
      const alvo: V3 = [x, y + alto, zz];
      await foto(page, `${nome}-frente-${nh}-pc`, [x + fx * longe, y + alto + 0.5, zz + fz * longe], alvo);
      await foto(
        page,
        `${nome}-lado-${nh}-pc`,
        [x + fx * longe * 0.7 + fz * longe * 0.7, y + alto + 0.6, zz + fz * longe * 0.7 - fx * longe * 0.7],
        alvo,
      );
    }
  }
  await page.context().close();
});
