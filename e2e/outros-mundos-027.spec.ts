import { test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T24): a T22 mexeu em código de todos os mundos (os gomos dos bichos, o boneco de
 * longe dos moradores, os gomos do lampião). Aqui, o mesmo enquadramento em cada um dos outros
 * cinco mundos (semente 1337, de dia), para pôr lado a lado a `main` e o ramo:
 * - um bicho de verdade (invocado ao lado da criança: o cervo, que cada tema veste do seu jeito)
 *   e o morador mais perto, cada um **de longe** (22 blocos da câmera, além dos 18 da troca),
 *   com a lente fechada (o bicho enche a foto: o que mudou nos gomos aparece) e com a lente do
 *   jogo (como a criança vê), e **de perto** (4 blocos);
 * - a criança fica em cima da câmera, para a conta da distância do jogo ser a da foto.
 *
 * Só com OUTROS_027=1, na placa de vídeo; as fotos vão para OUTROS_PASTA (ou
 * `capturas-027/parte1/portao/outros-mundos/ramo`), com `outros.json` (a distância e se a malha
 * de longe estava acesa em cada foto). `OUTROS_SO=vila-neon,rancho-alegre` escolhe os mundos
 * (e `noite-das-fantasias` entra só assim).
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.OUTROS_027, 'só com OUTROS_027=1');
test.setTimeout(900_000);

type V3 = [number, number, number];
const PASTA = process.env.OUTROS_PASTA ?? 'capturas-027/parte1/portao/outros-mundos/ramo';
const SO = (process.env.OUTROS_SO ?? '').split(',').filter(Boolean);
// (`OUTROS_SO=noite-das-fantasias` tira as mesmas fotos na festa: os moradores e os bichos dela a
// 22 blocos)
const MUNDOS = SO.length ? SO : ['vila-neon', 'cidade-grande', 'rancho-alegre', 'doce-reino', 'exploracao-lunar'];

/** A câmera que segue um nó (o bicho ou o morador): de `rumo`, a `dist` blocos, com a lente `fov`. */
interface Seguir {
  no: string;
  alto: number;
  dist: number;
  subida: number;
  rumo: number;
  fov: number;
}

async function abrir(page: Page, tema: string): Promise<void> {
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
  await criarMundo(page, `outros-${tema}`, tema, {}, 1337);
  await page.goto(`/?mundo=outros-${tema}&escala=1`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    const w = window as unknown as { __seguir: Seguir | null };
    w.__seguir = null;
    const scene = e.cenaBabylon!();
    scene.onBeforeRenderObservable.add(() => {
      for (const m of scene.meshes)
        if (m.name.startsWith('personagem') || m.name.startsWith('braco')) m.isVisible = false;
    });
    let fovJogo = -1;
    scene.onBeforeCameraRenderObservable.add((c) => {
      const s = w.__seguir;
      const cam = c as unknown as {
        fov: number;
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
      };
      if (!s) {
        if (fovJogo > 0) cam.fov = fovJogo;
        fovJogo = -1;
        return;
      }
      const no = scene.getTransformNodeByName(s.no);
      if (!no) return;
      const p = no.getAbsolutePosition();
      if (fovJogo < 0) fovJogo = cam.fov;
      cam.fov = s.fov;
      const ax = p.x;
      const ay = p.y + s.alto;
      const az = p.z;
      const h = Math.sqrt(Math.max(0, s.dist * s.dist - s.subida * s.subida));
      cam.position.set(ax + Math.sin(s.rumo) * h, ay + s.subida, az + Math.cos(s.rumo) * h);
      const alvo = cam.position.clone();
      alvo.set(ax, ay, az);
      cam.setTarget(alvo);
      (c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  await page.addStyleTag({ content: '.toast-area, .dica-mira, .rotulo-amigo { display: none !important; }' });
  await page.waitForTimeout(6000);
}

/**
 * O rumo (de 8) com a vista limpa até o nó, a `dist` blocos e `subida` acima: o raio da câmera
 * até o alvo não pode bater em nada antes dele (o chão, uma casa, uma árvore).
 */
async function rumoLimpo(
  page: Page,
  no: string,
  alto: number,
  dist: number,
  subida: number,
): Promise<{ rumo: number; livre: number }> {
  return page.evaluate(
    ({ no, alto, dist, subida }) => {
      const scene = window.__brumaluz!.cenaBabylon!() as unknown as {
        getTransformNodeByName(n: string): { getAbsolutePosition(): { x: number; y: number; z: number; clone(): unknown } } | null;
        pickWithRay(r: unknown, f: (m: { name: string; isEnabled(): boolean; isVisible: boolean; isPickable: boolean }) => boolean): { hit: boolean; distance: number } | null;
        activeCamera: { position: { constructor: new (x: number, y: number, z: number) => { subtract(o: unknown): { normalize(): unknown } } } };
      };
      const n = scene.getTransformNodeByName(no);
      if (!n) return { rumo: 0, livre: 0 };
      const p = n.getAbsolutePosition();
      const V = scene.activeCamera.position.constructor;
      const Ray = (window as unknown as { __Ray?: new (o: unknown, d: unknown, l: number) => unknown }).__Ray;
      const h = Math.sqrt(Math.max(0, dist * dist - subida * subida));
      let melhor = 0;
      let melhorLivre = -1;
      for (let k = 0; k < 8; k++) {
        const rumo = (k * Math.PI) / 4;
        const o = new V(p.x + Math.sin(rumo) * h, p.y + alto + subida, p.z + Math.cos(rumo) * h);
        const alvo = new V(p.x, p.y + alto, p.z);
        const d = alvo.subtract(o).normalize();
        if (!Ray) return { rumo: 0, livre: 0 };
        const r = scene.pickWithRay(new Ray(o, d, dist), (m) => m.isEnabled() && m.isVisible && !m.name.startsWith(no));
        const livre = r?.hit ? r.distance : dist;
        if (livre > melhorLivre) {
          melhorLivre = livre;
          melhor = rumo;
        }
        if (livre >= dist - 1.2) return { rumo, livre };
      }
      return { rumo: melhor, livre: melhorLivre };
    },
    { no, alto, dist, subida },
  );
}

/** Se a malha de longe do nó está acesa (o bicho: `-longe`; o morador: as peças de longe). */
async function emLonge(page: Page, no: string): Promise<boolean> {
  return page.evaluate((no) => {
    const scene = window.__brumaluz!.cenaBabylon!();
    return scene.meshes.some((m) => m.name.startsWith(no) && m.name.includes('longe') && m.isEnabled());
  }, no);
}

test('os bichos e os moradores dos outros cinco mundos, de longe e de perto', async ({ browser }) => {
  mkdirSync(PASTA, { recursive: true });
  const registro: Record<string, unknown> = {};
  for (const tema of MUNDOS) {
    const ctx = await browser.newContext(TAMANHOS.pc);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
    await abrir(page, tema);
    // o Ray do Babylon (o mesmo da página), para o rumo de vista limpa
    await page.evaluate(() => {
      const scene = window.__brumaluz!.cenaBabylon!() as unknown as {
        createPickingRay(x: number, y: number, m: unknown, c: unknown): { constructor: unknown };
        activeCamera: unknown;
      };
      (window as unknown as { __Ray: unknown }).__Ray = scene.createPickingRay(0, 0, null, scene.activeCamera).constructor;
    });
    // o morador: o mais perto do nascer, ou o do primeiro povoado
    const achar = () =>
      page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, , z] = e.jogadorPes!();
        const scene = e.cenaBabylon!();
        const ms = (e.criaturas?.() ?? [])
          .filter((c) => c.tipo === 'morador' && !!scene.getTransformNodeByName(`morador-${c.id}`))
          .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
        return ms[0] ? { id: ms[0].id, x: ms[0].x, y: ms[0].y, z: ms[0].z } : null;
      });
    let m = await achar();
    if (!m) {
      const p = await page.evaluate(() => window.__brumaluz!.povoados?.()[0] ?? null);
      if (p) {
        await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
        await page.waitForFunction(
          () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
          undefined,
          { timeout: 90_000 },
        ).catch(() => undefined);
        await page.waitForTimeout(5000);
        m = await achar();
      }
    }
    // o bicho: um cervo invocado perto do morador, em terra firme (o mesmo papel em todos os
    // mundos; ao lado do nascer, no Rancho, ele caía no lago)
    if (m) {
      await page.evaluate((m) => window.__brumaluz!.teleportar!(m.x + 3, m.z + 3), m);
      await page.waitForTimeout(3000);
    }
    const pe = await page.evaluate(() => window.__brumaluz!.jogadorPes!());
    const antes = await page.evaluate(() => (window.__brumaluz!.criaturas?.() ?? []).map((c) => c.id));
    await page.evaluate(([x, y, z]) => window.__brumaluz!.invocar!('cervo', x + 2, y + 1, z + 2), pe);
    await page.waitForFunction(
      (antes) => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'cervo' && !antes.includes(c.id)),
      antes,
      { timeout: 30_000 },
    );
    const bicho = await page.evaluate(
      (antes) => (window.__brumaluz!.criaturas?.() ?? []).find((c) => c.tipo === 'cervo' && !antes.includes(c.id))!.id,
      antes,
    );
    await page.waitForTimeout(2500);
    const alvos: [string, string, number][] = [[`bicho`, `criatura-${bicho}`, 0.5]];
    if (m) alvos.push([`morador`, `morador-${m.id}`, 1.1]);
    else console.log(`${tema}: nenhum morador à vista`);
    for (const [quem, no, alto] of alvos) {
      for (const [qual, dist, subida0, fov] of [
        // (a lente fechada de mais alto: de 6 blocos, uma cerca viva ou uma copa no meio do
        // caminho tapava a foto inteira, e o raio de teste não vê as peças instanciadas)
        ['longe-lente', 22, 12, 0.11],
        ['longe-jogo', 22, 6, 0.8],
        ['perto', 4, 1.6, 0.8],
      ] as const) {
        // (com a vista tapada, a câmera sobe: de cima, por cima das casas e das cercas)
        let subida: number = subida0;
        let { rumo, livre } = await rumoLimpo(page, no, alto, dist, subida);
        for (const mais of dist > 10 ? [10, 15] : [2.5]) {
          if (livre >= dist - 1.2) break;
          const r = await rumoLimpo(page, no, alto, dist, mais);
          if (r.livre > livre) ({ rumo, livre } = r), (subida = mais);
        }
        // a criança em cima da câmera (a troca de longe conta da câmera do jogo); de novo a cada
        // pouco, que o bicho anda
        const levar = () =>
          page.evaluate(
            ({ no, dist, rumo }) => {
              const e = window.__brumaluz!;
              const n = e.cenaBabylon!().getTransformNodeByName(no);
              if (!n) return;
              const p = n.getAbsolutePosition();
              e.teleportar!(p.x + Math.sin(rumo) * dist, p.z + Math.cos(rumo) * dist);
              // (de frente para ele: a câmera do jogo fica atrás da criança, mais longe; de costas,
              // ela ficava entre os dois, a menos de 18 blocos, e o morador não trocava)
              e.apontar!(Math.atan2(-Math.sin(rumo), -Math.cos(rumo)), 0);
            },
            { no, dist, rumo },
          );
        await page.evaluate((s) => {
          (window as unknown as { __seguir: Seguir }).__seguir = s;
        }, { no, alto, dist, subida, rumo, fov } satisfies Seguir);
        for (let k = 0; k < 4; k++) {
          await levar();
          await page.waitForTimeout(700);
        }
        await page.waitForTimeout(800);
        const longe = await emLonge(page, no);
        const real = await page.evaluate((no) => {
          const e = window.__brumaluz!;
          const n = e.cenaBabylon!().getTransformNodeByName(no);
          const [x, y, z] = e.jogadorPes!();
          if (!n) return -1;
          const p = n.getAbsolutePosition();
          return Number(Math.hypot(p.x - x, p.y - y, p.z - z).toFixed(1));
        }, no);
        const nome = `${tema}-${quem}-${qual}`;
        await page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 88 });
        registro[nome] = { longe, distanciaDaCrianca: real, rumo: Number(rumo.toFixed(2)) };
        console.log(`FOTO ${nome} ${JSON.stringify(registro[nome])}`);
      }
      await page.evaluate(() => {
        (window as unknown as { __seguir: null }).__seguir = null;
      });
    }
    await ctx.close();
  }
  writeFileSync(`${PASTA}/outros.json`, `${JSON.stringify(registro, null, 2)}\n`);
});
