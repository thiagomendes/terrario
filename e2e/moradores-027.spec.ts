import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T10): os moradores com posto da Noite das Fantasias, cada um no seu lugar do mundo
 * de verdade (semente 1337), de frente e de 3/4, no entardecer (0,7) e de noite (0,85): a Vovó
 * Zuleica, o Conde Dudu, a Lulu, o Bento, o Seu Jerônimo, a Tia Filó, o Seu Olavo e os cinco
 * vizinhos da rua. E a conta da calça do Dudu de noite: a distância de cor (ΔE CIE76, em Lab)
 * entre a calça e a pele dele, perto da lanterninha, de pelo menos 20 (a luz da lanterninha não
 * lava a calça escura). Na placa de vídeo (scripts/e2e-gpu.sh), só com MORADORES_027=1; as fotos
 * vão para `capturas-027/parte1/moradores/` (ou MORADORES_PASTA).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MORADORES_027, 'só com MORADORES_027=1');
test.setTimeout(1_200_000);

type V3 = [number, number, number];
const PASTA = process.env.MORADORES_PASTA ?? 'capturas-027/parte1/moradores';

/** Quem fotografar: o nome da foto, o morador ("baile:n") e o rumo da câmera (graus, 0 = sul). */
const QUEM: Array<{ nome: string; n: number; rumo?: number; longe?: number }> = [
  { nome: 'vovo', n: 0 },
  { nome: 'dudu', n: 1 },
  // (a Lulu espia da quina de uma casinha: a câmera fica na rua, a leste dela)
  { nome: 'lulu', n: 2, rumo: 90 },
  { nome: 'bento', n: 3, longe: 4.4 },
  { nome: 'jeronimo', n: 4 },
  { nome: 'filo', n: 5 },
  { nome: 'olavo', n: 6 },
  { nome: 'vizinha-gatinho', n: 7 },
  { nome: 'marceneiro', n: 8 },
  { nome: 'confeiteira', n: 9 },
  { nome: 'vizinho-morceguinho', n: 10 },
  { nome: 'lanterneiro', n: 11 },
];

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
  await criarMundo(page, 'fotos-moradores', 'noite-das-fantasias', {}, 1337);
  await page.goto('/?mundo=fotos-moradores&escala=1');
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
    // a criança fica fora da foto (o morador é o assunto)
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
  await page.waitForTimeout(10_000);
}

/** O morador "baile:n" à vista (com o boneco montado), ou null. */
async function morador(page: Page, n: number) {
  return page.evaluate((n) => {
    const c = window.__brumaluz!.criaturas!().find((q) => q.morador === `baile:${n}`);
    if (!c) return null;
    const scene = window.__brumaluz!.cenaBabylon!();
    const tem = scene.transformNodes.some((t) => t.name === `morador-${c.id}-junta-cabeca`);
    return tem ? { id: c.id, x: c.x, y: c.y, z: c.z } : null;
  }, n);
}

async function semInterface(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('.rotulo-amigo'))) el.style.display = 'none';
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
}

async function camera(page: Page, p: V3, a: V3): Promise<void> {
  await page.evaluate(
    ({ p, a }) => {
      (window as unknown as { __camFixa: { p: V3; a: V3 } }).__camFixa = { p, a };
    },
    { p, a },
  );
  await page.waitForTimeout(800);
}

/**
 * A cor média (sRGB 0 a 255) de pontos do boneco do morador `id`, dados no espaço de cada junta,
 * lida no quadro final da tela (depois do brilho): um quadradinho de 5 × 5 pixels em cada ponto.
 */
async function corNosPontos(page: Page, id: number, pontos: Array<{ junta: string; p: V3 }>) {
  return page.evaluate(
    async ({ id, pontos }) => {
      const scene = window.__brumaluz!.cenaBabylon!() as unknown as {
        transformNodes: { name: string; computeWorldMatrix(f: boolean): { m: Float32Array } }[];
        getTransformMatrix(): { m: Float32Array };
        getEngine(): {
          getRenderWidth(): number;
          getRenderHeight(): number;
          readPixels(x: number, y: number, w: number, h: number): Promise<ArrayBufferView>;
        };
        onAfterRenderObservable: { addOnce(f: () => void): void };
      };
      const eng = scene.getEngine();
      const W = eng.getRenderWidth();
      const H = eng.getRenderHeight();
      const px = await new Promise<Uint8Array>((ok) =>
        scene.onAfterRenderObservable.addOnce(() => {
          void eng.readPixels(0, 0, W, H).then((b) => ok(new Uint8Array(b.buffer, b.byteOffset, b.byteLength)));
        }),
      );
      const vp = scene.getTransformMatrix().m;
      const soma = [0, 0, 0];
      let n = 0;
      const onde: number[][] = [];
      for (const { junta, p } of pontos) {
        const no = scene.transformNodes.find((t) => t.name === `morador-${id}-junta-${junta}`);
        if (!no) continue;
        const m = no.computeWorldMatrix(true).m;
        const x = p[0] * m[0] + p[1] * m[4] + p[2] * m[8] + m[12];
        const y = p[0] * m[1] + p[1] * m[5] + p[2] * m[9] + m[13];
        const z = p[0] * m[2] + p[1] * m[6] + p[2] * m[10] + m[14];
        const cx = x * vp[0] + y * vp[4] + z * vp[8] + vp[12];
        const cy = x * vp[1] + y * vp[5] + z * vp[9] + vp[13];
        const cw = x * vp[3] + y * vp[7] + z * vp[11] + vp[15];
        const sx = Math.round(((cx / cw + 1) / 2) * W);
        const sy = Math.round(((1 - cy / cw) / 2) * H);
        onde.push([sx / W, sy / H]);
        for (let dy = -2; dy <= 2; dy++)
          for (let dx = -2; dx <= 2; dx++) {
            const qx = Math.min(W - 1, Math.max(0, sx + dx));
            const qy = Math.min(H - 1, Math.max(0, sy + dy));
            // readPixels vem de baixo para cima
            const i = ((H - 1 - qy) * W + qx) * 4;
            soma[0] += px[i];
            soma[1] += px[i + 1];
            soma[2] += px[i + 2];
            n++;
          }
      }
      return { rgb: soma.map((s) => s / Math.max(1, n)), onde };
    },
    { id, pontos },
  );
}

/** sRGB (0 a 255) para Lab (D65). */
function lab([r, g, b]: number[]): V3 {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047;
  const Y = 0.2126 * R + 0.7152 * G + 0.0722 * B;
  const Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
const deltaE = (a: number[], b: number[]) => {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
};

test('os moradores com posto da festa, de dia e de noite, e a calça do Dudu', async ({ browser }) => {
  const page = await (await browser.newContext(TAMANHOS.pc)).newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await abrir(page);
  mkdirSync(PASTA, { recursive: true });
  const plano = await page.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    return { praca: [b.nascimento.x, b.h + 1, b.nascimento.z] as V3, vizinhos: b.pontos.vizinhos, postos: b.pontos.postos };
  });
  await semInterface(page);
  const medidas: Record<string, unknown> = {};
  // (MORADORES_SO=lulu,dudu refaz só esses)
  const so = process.env.MORADORES_SO?.split(',');
  for (const q of QUEM.filter((x) => !so || so.includes(x.nome))) {
    // o rumo da câmera: os vizinhos pela rua (para onde olham); os outros, do lado da praça
    const posto: V3 =
      q.n >= 7
        ? [plano.vizinhos[q.n - 7].x, plano.vizinhos[q.n - 7].y, plano.vizinhos[q.n - 7].z]
        : (Object.values(plano.postos)[q.n] as V3);
    let ang =
      q.n >= 7
        ? plano.vizinhos[q.n - 7].yaw
        : Math.atan2(plano.praca[0] - posto[0], plano.praca[2] - posto[2]);
    if (q.rumo !== undefined) ang = (q.rumo * Math.PI) / 180;
    const d = q.longe ?? 3.3;
    // a criança (escondida) fica onde a câmera vai: o morador olha para ela
    await page.evaluate(
      ({ x, z }) => window.__brumaluz!.teleportar!(x, z),
      { x: posto[0] + Math.sin(ang) * (d + 0.6), z: posto[2] + Math.cos(ang) * (d + 0.6) },
    );
    let m = null;
    for (let i = 0; i < 60 && !m; i++) {
      await page.waitForTimeout(1000);
      m = await morador(page, q.n);
    }
    expect(m, q.nome).not.toBeNull();
    await page.waitForTimeout(2500);
    m = (await morador(page, q.n))!;
    const alto = q.nome === 'bento' ? 1.35 : 1.05;
    const alvo: V3 = [m.x, m.y + alto, m.z];
    for (const [hora, nomeHora] of [
      [0.7, 'entardecer'],
      [0.85, 'noite'],
    ] as const) {
      await page.evaluate((h) => {
        window.__brumaluz!.hora = h;
      }, hora);
      await page.waitForTimeout(1500);
      for (const [tomada, giro] of [
        ['frente', 0],
        ['lado', 0.85],
      ] as const) {
        const a = ang + giro;
        await camera(page, [m.x + Math.sin(a) * d, m.y + alto + 0.55, m.z + Math.cos(a) * d], alvo);
        await page.screenshot({ path: `${PASTA}/${q.nome}-${tomada}-${nomeHora}-pc.jpg`, type: 'jpeg', quality: 86 });
        if (q.nome === 'dudu' && tomada === 'frente' && nomeHora === 'noite') {
          // a calça (as duas pernas, na frente da coxa) e a pele (o meio do rosto, entre os
          // olhos e a boca)
          const calca = await corNosPontos(page, m.id, [
            { junta: 'pernaE', p: [0, -0.1, 0.09] },
            { junta: 'pernaD', p: [0, -0.1, 0.09] },
          ]);
          const pele = await corNosPontos(page, m.id, [{ junta: 'cabeca', p: [0, -0.1, 0.3] }]);
          const de = deltaE(calca.rgb, pele.rgb);
          medidas.dudu = { calca, pele, deltaE: Number(de.toFixed(1)) };
          console.log(`DELTA_E calça do Dudu x pele, de noite: ${de.toFixed(1)}`);
          expect(de).toBeGreaterThanOrEqual(20);
        }
      }
    }
    console.log(`FOTO ${q.nome}`);
  }
  writeFileSync(`${PASTA}/medidas.json`, JSON.stringify(medidas, null, 2));
  await page.context().close();
});
