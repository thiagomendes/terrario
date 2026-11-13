import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';

/**
 * Esboço 014c (`src/esboco/veiculosRefino.ts`, com `?esboco=refino`): o veículo de hoje ao
 * lado do refinado (táxi, ônibus e sorvete) na Cidade Grande de verdade, de dia e de noite, no
 * computador e no celular, com a criança do lado; e vídeos do táxi e do sorvete chegando,
 * freando na zebra, arrancando e fazendo a curva (hoje e refinado, a mesma volta).
 * Só com ESBOCO_REFINO=1.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_REFINO, 'esboço só com ESBOCO_REFINO=1');
const PASTA = 'capturas-014c/veiculos';
type V3 = [number, number, number];
type Tipo = 'taxi' | 'civil' | 'onibusAzul' | 'sorvete' | 'ambulancia' | 'bombeiros';
type Versao = 'atual' | 'refinado' | 'cara';

async function abrir(browser: Browser, w: number, h: number, gravar: boolean) {
  mkdirSync(`${PASTA}/video-bruto`, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    ...(gravar ? { recordVideo: { dir: `${PASTA}/video-bruto`, size: { width: w, height: h } } } : {}),
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 6, mostrarFps: false, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  const p = await ctx.newPage();
  const t0 = Date.now();
  p.on('pageerror', (e) => console.log('erro na página:', String(e)));
  await p.goto('/?tema=cidade-grande&esboco=refino');
  await p.waitForFunction(() => window.__brumaluz?.ready === true && !!window.__refino, undefined, {
    timeout: 240_000,
  });
  await p.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    const wj = window as unknown as { __camFixa: { p: number[]; a: number[]; fov?: number } | null };
    wj.__camFixa = null;
    e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
      const f = wj.__camFixa;
      if (!f) return;
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
        fov: number;
      };
      cam.position.set(...f.p);
      const alvo = cam.position.clone();
      alvo.set(...f.a);
      cam.setTarget(alvo);
      cam.fov = f.fov ?? 0.8;
      // recorta a cena com a vista da câmera fixa (6b32d1e)
      (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await p.waitForTimeout(1500);
    const n = await p.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 20) break;
    antes = n;
  }
  await p.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  return { p, t0 };
}

const camera = (p: Page, pos: V3, alvo: V3, fov = 0.8) =>
  p.evaluate(
    ([a, b, f]) => {
      (window as unknown as { __camFixa: unknown }).__camFixa = { p: a, a: b, fov: f };
    },
    [pos, alvo, fov] as const,
  );

/** A criança em pé num lugar, olhando para um ponto. */
async function crianca(p: Page, x: number, z: number, olhar: [number, number]) {
  await p.evaluate(
    ([x2, z2, o]) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x2, z2);
      const yaw = Math.atan2(o[0] - x2, o[1] - z2);
      e.apontar?.(yaw, 0);
      e.personagem?.girarCorpo?.(yaw);
    },
    [x, z, olhar] as const,
  );
}

const DIST: Record<Tipo, number> = {
  taxi: 7.5,
  civil: 7.5,
  onibusAzul: 12,
  sorvete: 8.5,
  ambulancia: 7.5,
  bombeiros: 12,
};
/** Hoje × refinado (sem carinha, a proposta) e a carinha só para comparar; os novos sozinhos. */
const VITRINES: [string, Tipo, Versao[]][] = [
  ['taxi', 'taxi', ['atual', 'refinado']],
  ['onibus', 'onibusAzul', ['atual', 'refinado']],
  ['sorvete', 'sorvete', ['atual', 'refinado']],
  ['ambulancia', 'ambulancia', ['refinado']],
  ['bombeiros', 'bombeiros', ['refinado']],
  ['taxi-com-cara', 'taxi', ['refinado', 'cara']],
];

async function vitrines(p: Page, nome: string, noite: boolean) {
  for (const [rotulo, tipo, versoes] of VITRINES) {
    const v = await p.evaluate(([t, vs]) => window.__refino!.vitrine(t as Tipo, vs as Versao[]), [tipo, versoes] as const);
    const [mx, my, mz] = v.meio;
    const [rx, rz] = v.direita;
    const [fx, fz] = v.frente;
    // a câmera do outro lado da rua (por cima da outra mão: do lado da calçada há prédios)
    const grande = tipo === 'onibusAzul' || tipo === 'bombeiros';
    const d = grande ? 4.4 : 4.8;
    const ao = versoes.length > 1 ? 0.9 : 0.7;
    // a criança na calçada, entre os dois, olhando para a câmera
    const kx = mx + rx * 2.3;
    const kz = mz + rz * 2.3;
    const camP: V3 = [mx - rx * d + fx * d * ao, my + (grande ? 3.6 : 2.9), mz - rz * d + fz * d * ao];
    await crianca(p, kx, kz, [camP[0], camP[2]]);
    await p.evaluate((n) => window.__refino!.noite(n), noite);
    await p.waitForTimeout(noite ? 2500 : 1200);
    await camera(p, camP, [mx + fx * 0.6, my + (grande ? 1.8 : 1.0), mz + fz * 0.6], versoes.length > 1 ? 1.15 : 0.95);
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${PASTA}/${nome}-${rotulo}-${noite ? 'noite' : 'dia'}.jpg`, type: 'jpeg', quality: 88 });
    if (!noite) {
      // de lado, mais de perto (a lataria)
      const lado: V3 = [mx - rx * d, my + (grande ? 2.2 : 1.4), mz - rz * d];
      await camera(p, lado, [mx, my + (grande ? 1.7 : 0.95), mz], versoes.length > 1 ? 1.25 : 1.0);
      await p.waitForTimeout(600);
      await p.screenshot({ path: `${PASTA}/${nome}-${rotulo}-lado.jpg`, type: 'jpeg', quality: 88 });
    }
  }
  await p.evaluate(() => window.__refino!.noite(false));
}

test('esboço do refino: vitrine e custo', async ({ browser }) => {
  test.setTimeout(900_000);
  const { p } = await abrir(browser, 1280, 720, false);
  const custo = await p.evaluate(() => window.__refino!.custo());
  writeFileSync(`${PASTA}/custos.json`, JSON.stringify(custo, null, 1));
  console.log('custo', JSON.stringify(custo));
  await vitrines(p, 'pc', false);
  await vitrines(p, 'pc', true);
  await p.setViewportSize({ width: 844, height: 390 });
  await p.evaluate(() => window.__brumaluz!.cenaBabylon!().getEngine().resize());
  await p.waitForTimeout(1200);
  await vitrines(p, 'celular', false);
  await vitrines(p, 'celular', true);
  await p.context().close();
});

test('esboço do refino: curva e zebra (vídeo)', async ({ browser }) => {
  test.setTimeout(900_000);
  const { p } = await abrir(browser, 1280, 720, false);
  for (const [tipo, versoes] of [
    ['taxi', ['atual', 'refinado']],
    ['sorvete', ['atual', 'refinado']],
    ['ambulancia', ['refinado']],
    ['bombeiros', ['refinado']],
  ] as [Tipo, Versao[]][])
    for (const versao of versoes) {
      const info = await p.evaluate(
        ([t, v]) => window.__refino!.dirigir(t as Tipo, v as 'atual'),
        [tipo, versao] as const,
      );
      const [px, py, pz] = info.parada;
      const [rx, rz] = info.direita;
      const [fx, fz] = info.frente;
      // a criança na calçada ao lado da zebra, esperando para atravessar
      await crianca(p, px + fx * 3.2 + rx * 2.4, pz + fz * 3.2 + rz * 2.4, [px, pz]);
      // câmera que acompanha o carro, sempre do mesmo lado (da calçada, um pouco à frente)
      await p.evaluate(
        ([r, f, y, tipo2]) => {
          const wj = window as unknown as {
            __camFixa: { p: number[]; a: number[]; fov?: number } | null;
          };
          let cx = 0;
          let cz = 0;
          let pronto = false;
          const d = tipo2 === 'bombeiros' ? 5.4 : 4.6;
          const passo = () => {
            const s = window.__refino!.estado();
            if (s.fase === 'nada') return;
            if (!pronto) {
              cx = s.x;
              cz = s.z;
              pronto = true;
            }
            cx += (s.x - cx) * 0.12;
            cz += (s.z - cz) * 0.12;
            wj.__camFixa = {
              p: [cx - r[0] * d + f[0] * 2.2, y + (tipo2 === 'bombeiros' ? 3.6 : 2.4), cz - r[1] * d + f[1] * 2.2],
              a: [cx, y + 0.8, cz],
              fov: tipo2 === 'bombeiros' ? 1.05 : 0.9,
            };
            if (!s.fim) requestAnimationFrame(passo);
          };
          requestAnimationFrame(passo);
        },
        [info.direita, info.frente, py, tipo] as const,
      );
      await comecarGravacao(p);
      await p.waitForFunction(() => window.__refino!.estado().fim, undefined, { timeout: 60_000, polling: 100 });
      await p.waitForTimeout(300);
      await pararGravacao(p, `${PASTA}/video-bruto/${tipo}-${versao}.webm`);
    }
  await p.context().close();
});
