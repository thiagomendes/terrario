import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirMundo, andarPelaTrilha, assentar, criarMundo, escolherNaRoda, tocar, type Tamanho } from './guia-palco';
import { contarGl, lerGl } from './gl-vivo';
import { telasDoFluxo } from './telas';

/**
 * Spec 027: as missões n1 a n5 da Noite das Fantasias na tela, com o dedo de verdade.
 *
 * - **T18 (o núcleo e a previsão):** o dedo na campainha abre a porta e põe o docinho na sacola
 *   (a sacola vazia já está na mão quando a n1 abre); o dedo na lanterna do bosque acende na hora
 *   (a previsão do cliente, antes do quadro do núcleo), e a bolinha da n2 acende. As fotos do
 *   cartão da missão andando (no entardecer e de noite) em `capturas-027/parte1/missoes/`.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
// (T24: MISSOES027_PASTA põe as fotos noutro lugar, as do portão visual)
const PASTA = process.env.MISSOES027_PASTA ?? 'capturas-027/parte1/missoes';

type Aberta = { id: string; feito: number; meta: number; usos?: string[] };

async function abrir(browser: Browser, id: string, tamanho: Tamanho, hora: number, feitas: string[] = []): Promise<Page> {
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id,
    tema: 'noite-das-fantasias',
    tamanho,
    extras: { alma: { local: { feitas } } },
  });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await page.evaluate((h) => {
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = h;
  }, hora);
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia && !!window.__brumaluz!.baileEstado?.(), undefined, {
    timeout: 60_000,
  });
  await page.waitForTimeout(1200);
  return page;
}
const aberta = (page: Page, id: string) =>
  page.evaluate(
    (id) =>
      (window as unknown as { __almaUi: { vista(): { abertas: Aberta[] } | null } }).__almaUi
        .vista()
        ?.abertas.find((a) => a.id === id) ?? null,
    id,
  );
const naMochila = (page: Page, item: string) =>
  page.evaluate((item) => {
    const inv = window.__brumaluz!.inventario!;
    let n = 0;
    for (let i = 0; i < 36; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  }, item);
/** Vai até perto do ponto (os pés em `pes`) olhando para `alvo`. */
async function irOlhando(page: Page, pes: [number, number], alvo: [number, number, number], pitch = 0.2): Promise<void> {
  await page.evaluate(
    ({ pes, alvo, pitch }) => {
      const e = window.__brumaluz!;
      const b = e.baile!()!;
      e.voar?.(false);
      e.teleportar!(pes[0], pes[1], b.h + 1.2);
      e.apontar!(Math.atan2(alvo[0] - pes[0], alvo[2] - pes[1]), pitch);
    },
    { pes, alvo, pitch },
  );
  await page.waitForTimeout(1600);
}
/** O dedo no ponto do mundo (toque de verdade no celular, clique no computador). */
async function tocarNoMundo(page: Page, p: [number, number, number]): Promise<void> {
  const t = await page.evaluate((p) => window.__brumaluz!.telaDoPonto!(p[0], p[1], p[2]), p);
  expect(t, 'o ponto está na tela').not.toBeNull();
  const toque = await page.evaluate(() => matchMedia('(pointer: coarse)').matches);
  if (toque) await page.touchscreen.tap(t!.x, t!.y);
  else await page.mouse.click(t!.x, t!.y);
}

/** A câmera fixa das fotos (posição e alvo; null volta a câmera do jogo). */
async function cameraFixa(page: Page): Promise<void> {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    type V3 = [number, number, number];
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
}
const camera = (page: Page, p: [number, number, number] | null, a: [number, number, number] = [0, 0, 0]) =>
  page.evaluate(({ p, a }) => {
    (window as unknown as { __camFixa: unknown }).__camFixa = p ? { p, a } : null;
  }, { p, a });
const tela = (page: Page) => page.evaluate(() => window.__brumaluz!.baileTela!() as Record<string, unknown>);
/** Vai até (x, z) no chão da festa, olhando para (ax, az). */
const ir = (page: Page, x: number, z: number, ax: number, az: number) =>
  page.evaluate(
    ({ x, z, ax, az }) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x, z, e.baile!()!.h + 1.2);
      e.apontar!(Math.atan2(ax - x, az - z), 0.2);
    },
    { x, z, ax, az },
  );
/** A festa da missão acabada: espera ela aparecer e toca no "oba" (o botão do ✓). */
async function fecharFesta(page: Page): Promise<void> {
  const ok = page.locator('[data-alma-oba]').first();
  await ok.waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(1500);
  await ok.click();
  await page.waitForTimeout(1200);
}
/** O toque de missão direto (o dedo de verdade é o da T18 e da T20). */
const missao = (page: Page, c: Record<string, unknown>) =>
  page.evaluate((c) => window.__brumaluz!.baileMissao!(c as never), c);

for (const [hora, nome] of [
  [0.7, 'entardecer'],
  [0.86, 'noite'],
] as const)
  test(`T19: os momentos das missões na tela (${nome})`, async ({ browser }) => {
    const foto = (page: Page, n: string) =>
      page.screenshot({ path: `${PASTA}/${n}-${nome}.jpg`, type: 'jpeg', quality: 88 });
    // ---------------------------------------------------------------- n1 e n2
    let page = await abrir(browser, `t19-a-${nome}`, 'pc', hora);
    await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
    await cameraFixa(page);
    const p = await page.evaluate(() => {
      const b = window.__brumaluz!.baile!()!;
      return {
        portas: b.pontos.portas,
        lanternas: b.pontos.lanternas,
        trilha: b.pontos.trilha,
        vizinhos: b.pontos.vizinhos,
        nascimento: b.nascimento,
        h: b.h,
        postes: b.pecas.filter((q) => q.tipo === 'poste-lanterna').map((q) => [q.x, q.z] as [number, number]),
        esconderijos: b.pontos.esconderijos,
        palco: b.pontos.palco,
      };
    });
    const Y = p.h + 1;
    const frente = (i: number, k: number) => {
      const q = p.portas[i];
      const d = [[0, 1], [1, 0], [0, -1], [-1, 0]][q.dir];
      return [q.x + d[0] * k, q.z + d[1] * k] as const;
    };
    for (const i of [0, 1, 2]) {
      const [x, z] = frente(i, 1.4);
      await ir(page, x, z, p.portas[i].x, p.portas[i].z);
      await page.waitForTimeout(i === 0 ? 2500 : 900);
      const q = p.portas[i];
      const lado = [[1, 0], [0, -1], [-1, 0], [0, 1]][q.dir];
      // A foto: a criança um passo para o lado da campainha (a porta à vista, sem ela na frente),
      // de lado para a porta; a câmera alta, de frente e um tico para o lado do vizinho: a porta
      // aberta no meio, o vizinho que dá o doce de um lado, a criança com a sacola do outro
      const viz = p.vizinhos[i];
      let s = viz && (viz.x - q.x) * lado[0] + (viz.z - q.z) * lado[1] < 0 ? -1 : 1;
      // (a travessura, de 3/4: a câmera do lado em que nenhum poste de lanterna fica entre ela e a
      // porta, e a criança do outro lado; o fantasminha no meio do quadro, na porta)
      const cam34 = (sc: number) => {
        const [cx, cz] = frente(i, 4.2);
        return [cx + sc * lado[0] * 2.8, cz + sc * lado[1] * 2.8] as const;
      };
      const folga = (sc: number) => {
        const [ax, az] = cam34(sc);
        const [bx, bz] = frente(i, 0.65);
        let m = Infinity;
        for (const [px, pz] of p.postes) {
          const [vx, vz] = [bx - ax, bz - az];
          const u = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz)));
          m = Math.min(m, Math.hypot(ax + vx * u - px, az + vz * u - pz));
        }
        return m;
      };
      if (i === 2) s = folga(1) >= folga(-1) ? 1 : -1;
      await ir(page, x - s * lado[0] * 1.1, z - s * lado[1] * 1.1, q.x, q.z);
      await page.waitForTimeout(500);
      const [fx0, fz0] = frente(i, 6.0);
      const [mx, mz] = frente(i, 0.7);
      if (i === 2) {
        const [cx, cz] = cam34(s);
        const [gx, gz] = frente(i, 0.65);
        await camera(page, [cx, Y + 2.1, cz], [gx, Y + 1.15, gz]);
      } else await camera(page, [fx0 + s * lado[0] * 0.9, Y + 3.3, fz0 + s * lado[1] * 0.9], [mx, Y + 1.3, mz]);
      await missao(page, { a: 'campainha', i });
      await page.waitForFunction(() => ((window.__brumaluz!.baileTela!()!.portas as { abertas: number[] }).abertas.length ?? 0) > 0, undefined, { timeout: 5000 });
      if (i === 0) {
        await page.waitForTimeout(700);
        await foto(page, 't19-n1-porta-abrindo');
      }
      if (i === 2) {
        // a travessura: o fantasminha sorridente e o confete de folhinhas
        await page.waitForFunction(() => (window.__brumaluz!.baileTela!()!.travessuras as number) > 0, undefined, { timeout: 5000 });
        await page.waitForTimeout(1300);
        await foto(page, 't19-n1-travessura');
      }
      await page.waitForTimeout(2200);
    }
    const t1 = await tela(page);
    expect(t1.travessuras).toBe(0);
    // a sacola cheia na mão (3 docinhos), de 3/4 de frente
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const inv = e.inventario!;
      for (let s = 0; s < 9; s++) if (inv.obter(s)?.item === 'sacola_doces') e.selecionarSlot!(s);
    });
    // (no meio da praça, onde nada fica na frente da câmera; de 3/4 de frente, do lado da mão: a
    // sacola cheia, com os docinhos espiando)
    await camera(page, null);
    await ir(page, p.nascimento.x, p.nascimento.z - 3, p.nascimento.x, p.nascimento.z - 10);
    await page.waitForTimeout(1500);
    const olhoNaMao = () =>
      page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, y, z] = e.jogadorPes!();
        const yaw = e.rotacao![1];
        const f = [Math.sin(yaw), Math.cos(yaw)];
        const d = [Math.cos(yaw), -Math.sin(yaw)];
        e.travarYaw?.(yaw);
        (window as unknown as { __camFixa: unknown }).__camFixa = {
          p: [x + f[0] * 1.9 + d[0] * 0.9, y + 1.45, z + f[1] * 1.9 + d[1] * 0.9],
          a: [x + d[0] * 0.15, y + 0.95, z + d[1] * 0.15],
        };
      });
    await olhoNaMao();
    await page.waitForTimeout(900);
    await foto(page, 't19-n1-sacola-na-mao');
    // comer a sacola: um docinho a cada mordida; o último leva a sacola embora num brilhinho
    for (let k = 0; k < 3; k++) {
      // (acabamento da n1: a sacola mostra quantos restam: três, dois, um)
      if (k > 0) await foto(page, `t19-n1-sacola-${3 - k}`);
      await page.evaluate(() => window.__brumaluz!.comer!());
      if (k === 0) {
        await page.waitForTimeout(1300);
        await foto(page, 't19-n1-sacola-comendo');
      }
      await page.waitForTimeout(3200);
    }
    await page.waitForFunction(() => (window.__brumaluz!.sacolaSumiu ?? 0) === 1, undefined, { timeout: 8000 });
    expect(await naMochila(page, 'sacola_doces')).toBe(0);
    await page.evaluate(() => window.__brumaluz!.travarYaw?.(null));
    await camera(page, null);
    // n2: três lanternas acesas e uma piscando (o caminho do bosque)
    for (const i of [0, 1, 2]) {
      const l = p.lanternas[i];
      await ir(page, l[0] + 1.5, l[2], l[0], l[2]);
      await page.waitForTimeout(i === 0 ? 2500 : 600);
      await missao(page, { a: 'lanterna', i });
      await page.waitForTimeout(400);
    }
    await page.waitForFunction(() => window.__brumaluz!.baileEstado!()!.ln.filter(Boolean).length === 3, undefined, { timeout: 5000 });
    // (do meio do caminho do bosque, na frente da lanterna do meio: ela e as vizinhas acesas)
    const l1 = p.lanternas[1];
    let [tx, tz] = [p.trilha[1][0], p.trilha[1][1]];
    let dm = Infinity;
    for (let k = 1; k < p.trilha.length; k++)
      for (let s = 0; s <= 10; s++) {
        const [a, b2] = [p.trilha[k - 1], p.trilha[k]];
        const qx = a[0] + ((b2[0] - a[0]) * s) / 10;
        const qz = a[1] + ((b2[1] - a[1]) * s) / 10;
        const d = Math.hypot(qx - l1[0], qz - l1[2]);
        if (d < dm) [dm, tx, tz] = [d, qx, qz];
      }
    const ux = (tx - l1[0]) / dm;
    const uz = (tz - l1[2]) / dm;
    // (no próprio caminho, meio bloco além do meio dele: as copas dos dois lados ficam fora)
    await camera(page, [tx + ux * 0.5, Y + 1.7, tz + uz * 0.5], [l1[0], Y + 2.2, l1[2]]);
    await page.waitForTimeout(900);
    await foto(page, 't19-n2-lanternas');
    await page.context().close();

    // ---------------------------------------------------------------- n3 e n4
    page = await abrir(browser, `t19-b-${nome}`, 'pc', hora, ['n1', 'n2']);
    await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
    await cameraFixa(page);
    const b = await page.evaluate(() => {
      const pl = window.__brumaluz!.baile!()!;
      const peca = (t: string) => {
        const q = pl.pecas.find((k) => k.tipo === t)!;
        return [q.x, q.y, q.z] as [number, number, number];
      };
      return {
        es: pl.pontos.esconderijos,
        canteiro: pl.pontos.canteiro,
        bancada: pl.pontos.bancada,
        portas: pl.pontos.portas,
        pCanteiro: peca('canteiro-marcado'),
        pBancada: peca('bancada'),
        palco: pl.pontos.palco,
        nascimento: pl.nascimento,
      };
    });
    // acabamento da n3: atrás da abóbora gigante a Lulu fica escondida de todos os lados até a
    // criança chegar perto (o montinho de abóboras tapa o lado do palco). A foto de quem olha da
    // frente do palco, de longe: só a pontinha do lençol
    const e0 = b.es[0];
    const fx = Math.sin(e0.yaw);
    const fz = Math.cos(e0.yaw);
    const pcx = (b.palco.x0 + b.palco.x1) / 2;
    const pcz = b.palco.z1 + 2;
    await ir(page, pcx, pcz, e0.x, e0.z);
    await page.waitForFunction(() => window.__brumaluz!.baileTela!()!.lulu === 0, undefined, { timeout: 15_000 });
    await camera(page, [pcx, Y + 2.6, pcz], [e0.x, Y + 0.9, e0.z]);
    await page.waitForTimeout(1500);
    await foto(page, 't19-n3-lulu-escondida-do-palco');
    // e de quem vem da praça pelo corredor rente à casca (onde antes ficava a fresta): a 12 blocos,
    // no rumo da fresta antiga (uns 27 graus do sul para o leste), também tapada
    const [rx, rz] = [e0.x + Math.sin(0.47) * 12, e0.z + Math.cos(0.47) * 12];
    // (a criança um tico atrás da câmera, fora do quadro)
    await ir(page, e0.x + Math.sin(0.47) * 13.6, e0.z + Math.cos(0.47) * 13.6, e0.x, e0.z);
    await camera(page, [rx, Y + 2.0, rz], [e0.x, Y + 0.9, e0.z]);
    await page.waitForTimeout(1500);
    await foto(page, 't19-n3-lulu-escondida-da-praca');
    // e de perto, de onde a trilha acaba (do lado de fora do montinho, ao alcance do dedo: a fresta
    // rente à casca agora é fechada por uma abóbora): ela espia por cima das abóboras
    const tx0 = Math.cos(e0.yaw);
    const tz0 = -Math.sin(e0.yaw);
    const ladoT = (e0.x + tx0 - b.nascimento.x) ** 2 + (e0.z + tz0 - b.nascimento.z) ** 2 < (e0.x - tx0 - b.nascimento.x) ** 2 + (e0.z - tz0 - b.nascimento.z) ** 2 ? 1 : -1;
    const [ex, ez] = [e0.x + fx * 3.0, e0.z + fz * 3.0];
    await ir(page, ex, ez, e0.x, e0.z);
    await page.waitForTimeout(1200);
    // (de 3/4, por trás e acima da criança, do lado da praça: ela à frente, a Lulu espiando por cima)
    await camera(page, [e0.x + fx * 5.6 + ladoT * tx0 * 1.6, Y + 3.0, e0.z + fz * 5.6 + ladoT * tz0 * 1.6], [e0.x, Y + 0.9, e0.z]);
    await page.waitForTimeout(1500);
    await foto(page, 't19-n3-lulu-espiando');
    await missao(page, { a: 'lulu' });
    // (achada, de lado: a câmera sai de trás da criança, cuja cabeça tapava a Lulu)
    await camera(page, [e0.x + fx * 2.6 + ladoT * tx0 * 3.4, Y + 2.3, e0.z + fz * 2.6 + ladoT * tz0 * 3.4], [e0.x, Y + 1.0, e0.z]);
    await page.waitForTimeout(500);
    await foto(page, 't19-n3-lulu-achada');
    // a horta: plantar, regar e a abóbora crescendo
    const [kx, , kz] = b.canteiro;
    const [cx0, , cz0] = b.pCanteiro;
    await ir(page, kx, kz, cx0, cz0);
    await page.waitForTimeout(2500);
    // (do lado, um tico acima: a criança à esquerda, o canteiro na frente dela)
    await camera(page, [cx0 + 3.2, Y + 1.7, (kz + cz0) / 2 - 0.4], [cx0 - 0.3, Y + 0.35, cz0]);
    await missao(page, { a: 'horta' });
    await page.waitForFunction(() => window.__brumaluz!.baileTela!()!.broto === true, undefined, { timeout: 5000 });
    await page.waitForTimeout(400);
    await foto(page, 't19-n4-broto');
    await page.waitForTimeout(900);
    await missao(page, { a: 'horta' });
    await page.waitForTimeout(2600);
    await foto(page, 't19-n4-horta-crescendo');
    await page.waitForTimeout(3000);
    await foto(page, 't19-n4-abobora-pronta');
    await missao(page, { a: 'horta' });
    await page.waitForFunction(() => window.__brumaluz!.baileEstado!()!.hv === undefined, undefined, { timeout: 5000 });
    // as três carinhas com as estrelinhas
    const [bx, , bz] = b.bancada;
    const [px0, , pz0] = b.pBancada;
    await ir(page, bx - 1.5, bz, px0, pz0);
    await page.waitForFunction(() => (window.__brumaluz!.baileTela!()!.estrelas as number) === 3, undefined, { timeout: 8000 });
    await camera(page, [bx + 2.2, Y + 2.0, bz - 0.8], [px0 - 0.4, Y + 1.0, pz0]);
    await page.waitForTimeout(600);
    await foto(page, 't19-n4-carinhas');
    await missao(page, { a: 'carinha', c: 2 });
    await page.waitForTimeout(800);
    // o lampião de carinha na porta da Vovó
    const vovo = b.portas.find((q) => q.vovo)!;
    const dv = [[0, 1], [1, 0], [0, -1], [-1, 0]][vovo.dir];
    await ir(page, vovo.x + dv[0] * 1.3, vovo.z + dv[1] * 1.3, vovo.x, vovo.z);
    await page.waitForTimeout(2500);
    await missao(page, { a: 'lampiao' });
    await page.waitForFunction(() => window.__brumaluz!.baileTela!()!.lampiao === 2, undefined, { timeout: 8000 });
    await camera(page, [vovo.x + dv[0] * 5 + 2, Y + 2.2, vovo.z + dv[1] * 5], [vovo.x + 1, Y + 0.8, vovo.z]);
    await ir(page, vovo.x + dv[0] * 3 - 3, vovo.z + dv[1] * 3, vovo.x, vovo.z);
    await fecharFesta(page);
    await foto(page, 't19-n4-lampiao-na-porta');
    await page.context().close();

    // ---------------------------------------------------------------- n5
    page = await abrir(browser, `t19-c-${nome}`, 'pc', hora, ['n1', 'n2', 'n3', 'n4']);
    await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
    await cameraFixa(page);
    const c = await page.evaluate(() => {
      const pl = window.__brumaluz!.baile!()!;
      return { horta: pl.pontos.tufinhoHorta, varanda: pl.pontos.varanda, portao: pl.pontos.portaoHorta };
    });
    const [hx, , hz] = c.horta;
    await ir(page, hx + 1.5, hz - 1.5, hx, hz);
    await page.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tf.o === 'horta', undefined, { timeout: 15_000 });
    await page.waitForTimeout(2500);
    // (de lado, girada da linha entre a criança e ele: o Tufinho passeando à vista, sem a criança na frente)
    const lado5 = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const g = e.tufinhoOnde!()!;
      const [x, , z] = e.jogadorPes!();
      const d = Math.hypot(x - g.x, z - g.z) || 1;
      const [ux, uz] = [(x - g.x) / d, (z - g.z) / d];
      return { p: [g.x - uz * 3.2 - ux * 0.8, g.y + 1.7, g.z + ux * 3.2 - uz * 0.8], a: [g.x, g.y + 0.3, g.z] };
    });
    await camera(page, lado5.p as [number, number, number], lado5.a as [number, number, number]);
    await page.waitForTimeout(400);
    await foto(page, 't19-n5-tufinho-na-horta');
    // as patinhas do guia (a n5 escolhida)
    await camera(page, null);
    await page.evaluate(() => window.__brumaluz!.alma!.fixar('n5'));
    await page.waitForTimeout(300);
    await ir(page, c.portao[0], c.portao[2] - 6, hx, hz);
    await page.waitForFunction(() => window.__guia?.patinhas?.() === true, undefined, { timeout: 15_000 });
    await page.waitForTimeout(800);
    await foto(page, 't19-n5-patinhas');
    await ir(page, hx + 1.5, hz - 1.5, hx, hz);
    await page.waitForTimeout(600);
    await missao(page, { a: 'tufinho' });
    await page.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tf.o === 'segue', undefined, { timeout: 5000 });
    // ele vem atrás: a criança anda uns passos para o portão
    const [gx, , gz] = c.portao;
    // (acabamento da n5: ele anda de verdade, em pé, com as patinhas mexendo)
    let patas = 0;
    for (let k = 1; k <= 4; k++) {
      await ir(page, hx + ((gx - hx) * k) / 4, hz + ((gz - hz) * k) / 4, gx, gz);
      for (let j = 0; j < 5; j++) {
        await page.waitForTimeout(100);
        const g = ((await tela(page)).bichos as { nome: string; emPe: boolean; patas: number[] }[]).find((q) => q.nome === 'tufinho')!;
        expect(g.emPe).toBe(true);
        patas = Math.max(patas, ...g.patas.map(Math.abs));
      }
    }
    expect(patas).toBeGreaterThan(0.1);
    await page.waitForTimeout(1200);
    const gato = ((await tela(page)).bichos as { nome: string; x: number; z: number }[]).find((q) => q.nome === 'tufinho')!;
    expect(Math.hypot(gato.x - gx, gato.z - gz)).toBeLessThan(3);
    await camera(page, [gx + 3.5, Y + 2.2, gz + 3], [gx, Y + 0.5, gz]);
    await page.waitForTimeout(300);
    await foto(page, 't19-n5-tufinho-seguindo');
    // de volta à Vovó: ele volta para o banquinho
    const [vx, , vz] = c.varanda;
    await camera(page, null);
    await ir(page, vx, vz + 2, vx, vz);
    await page.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tf.o === 'casa', undefined, { timeout: 15_000 });
    await fecharFesta(page);
    await camera(page, [vx + 3, Y + 2.4, vz + 5], [vx, Y + 0.8, vz]);
    await page.waitForTimeout(300);
    await foto(page, 't19-n5-tufinho-em-casa');
    // o quadro de missões nunca abriu sozinho (nem na missão acabada)
    expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
    await page.context().close();
  });

for (const [tamanho, hora, nome] of [
  ['deitado', 0.7, 'entardecer'],
  ['empe', 0.86, 'noite'],
] as const)
  test(`T18: a campainha dá o docinho e a lanterna acende na hora (${tamanho}, ${nome})`, async ({ browser }) => {
    const page = await abrir(browser, `t18-${tamanho}`, tamanho, hora);
    // a sacola vazia foi para a mão quando a n1 abriu
    await page.waitForFunction(
      () => {
        const inv = window.__brumaluz!.inventario!;
        for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === 'sacola_vazia') return true;
        return false;
      },
      undefined,
      { timeout: 20_000 },
    );
    const plano = await page.evaluate(() => {
      const b = window.__brumaluz!.baile!()!;
      return { portas: b.pontos.portas, lanternas: b.pontos.lanternas, h: b.h };
    });
    // n1: duas portas com o dedo (a sacola enche)
    for (const [k, i] of [0, 3].entries()) {
      const p = plano.portas[i];
      const dir = [[0, 1], [1, 0], [0, -1], [-1, 0]][p.dir];
      await irOlhando(page, [p.x + dir[0] * 2.2, p.z + dir[1] * 2.2], [p.x, p.y + 1.1, p.z]);
      await tocarNoMundo(page, [p.x, p.y + 1.1, p.z]);
      await page.waitForFunction(
        (i) => (window.__brumaluz!.eventosBaile ?? []).some((e) => e.e === 'bailePorta' && e.i === i && 'doce' in e),
        i,
        { timeout: 10_000 },
      );
      await page.waitForFunction((k) => {
        const inv = window.__brumaluz!.inventario!;
        for (let s = 0; s < 9; s++) if (inv.obter(s)?.item === 'sacola_doces' && inv.obter(s)!.qtd === k + 1) return true;
        return false;
      }, k, { timeout: 10_000 });
      expect((await aberta(page, 'n1'))?.feito).toBe(k + 1);
    }
    expect(await naMochila(page, 'sacola_vazia')).toBe(0);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${PASTA}/t18-n1-${tamanho}-${nome}.jpg`, type: 'jpeg', quality: 88 });
    // n2: o dedo na lanterna acende na hora (a previsão), antes do núcleo responder
    const l = plano.lanternas[1];
    await irOlhando(page, [l[0] + 2.5, l[2] + 1], [l[0], l[1], l[2]], 0.1);
    const antes = await page.evaluate(() => window.__brumaluz!.baileEstado!()!.ln[1]);
    expect(antes).toBe(false);
    await tocarNoMundo(page, [l[0], l[1], l[2]]);
    const previu = await page.evaluate(() => window.__brumaluz!.baileReplica!().acesa(1, performance.now() / 1000));
    expect(previu).toBe(true);
    await page.waitForFunction(() => window.__brumaluz!.baileEstado!()!.ln[1] === true, undefined, { timeout: 10_000 });
    await page.waitForFunction(
      () =>
        ((window as unknown as { __almaUi: { vista(): { abertas: Aberta[] } | null } }).__almaUi
          .vista()
          ?.abertas.find((a) => a.id === 'n2')?.feito ?? 0) === 1,
      undefined,
      { timeout: 10_000 },
    );
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${PASTA}/t18-n2-${tamanho}-${nome}.jpg`, type: 'jpeg', quality: 88 });
    await page.context().close();
  });

// ------------------------------------------------------------------------------------ T20
type P3 = [number, number, number];
const moedasReais = (page: Page) =>
  page.evaluate(() => (window as unknown as { __almaCrianca: { perfil: { moedas: number } } }).__almaCrianca.perfil.moedas);
const toques = (page: Page) => page.evaluate(() => window.__brumaluz!.baileToques!()!);

/** Escolhe a missão no quadro (a roda, "Missões", o "brincar" do cartão). */
async function escolher(page: Page, id: string): Promise<void> {
  await page.waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 15_000 }).catch(() => undefined);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(700);
  await tocar(page, `[data-alma-jogar="${id}"]`);
  await page.waitForFunction(() => !document.querySelector('[data-alma-quadro]'), undefined, { timeout: 10_000 });
  await page.waitForTimeout(1500);
}
/**
 * A festa do fim da missão (o "oba" fecha; depois dela pode vir a do nível). Devolve as moedinhas
 * da missão (as da chuva da festa da missão) e confere que a carteira de verdade subiu ao menos isso.
 */
async function festaDoFim(page: Page, antes: number): Promise<number> {
  await page.waitForSelector('[data-alma-festa="missao"]', { timeout: 30_000 });
  await page.waitForTimeout(2200);
  const daMissao = await page.locator('[data-alma-festa="missao"] .chuva .moeda').count();
  let livre = 0;
  for (let k = 0; k < 30 && livre < 3; k++) {
    await page.waitForTimeout(700);
    const ok = page.locator('[data-alma-festa] [data-alma-oba]');
    if (await ok.count()) {
      livre = 0;
      await ok.first().tap().catch(() => undefined);
      await page.waitForTimeout(900);
    } else if (!(await page.locator('[data-alma-festa]').count())) livre++;
  }
  await page.waitForTimeout(600);
  expect((await moedasReais(page)) - antes).toBeGreaterThanOrEqual(daMissao);
  return daMissao;
}
/** Anda pela trilha (o joystick de verdade) até o alvo de agora; devolve a chave dele. */
async function seguir(page: Page, esperado?: RegExp): Promise<string> {
  await page.waitForTimeout(1600);
  await page.waitForFunction(() => !!window.__guia!.alvo(), undefined, { timeout: 20_000 });
  const r = await andarPelaTrilha(page, 120_000);
  if (!r.chegou) {
    const onde = await page.evaluate(() => ({
      pes: window.__brumaluz!.jogadorPes!(),
      alvo: window.__guia!.alvo(),
      rota: window.__guia!.caminho().length,
      fim: window.__guia!.caminho().slice(-1)[0],
    }));
    console.log(`T20: não chegou: ${JSON.stringify(onde)}`);
    await page.screenshot({ path: `${PASTA}/t20-nao-chegou-${String(r.alvo).replace(':', '-')}.jpg`, type: 'jpeg', quality: 80 });
  }
  expect(r.chegou, `chegou a ${r.alvo} em ${r.s.toFixed(0)} s`).toBe(true);
  if (esperado) expect(r.alvo).toMatch(esperado);
  await page.waitForTimeout(400);
  return r.alvo!;
}
/** Vira a câmera para o ponto (a criança arrasta o dedo para olhar) e toca nele com o dedo. */
async function tocarNo(page: Page, p: P3): Promise<void> {
  await page.evaluate((p) => {
    const e = window.__brumaluz!;
    const q = e.jogadorPes!();
    const d = Math.hypot(p[0] - q[0], p[2] - q[2]);
    e.apontar!(Math.atan2(p[0] - q[0], p[2] - q[2]), Math.max(-0.2, Math.min(0.45, -Math.atan2(p[1] - (q[1] + 1.6), Math.max(1, d + 4)) * 0.6)));
  }, p);
  await page.waitForTimeout(700);
  const t = await page.evaluate((p) => window.__brumaluz!.telaDoPonto!(p[0], p[1], p[2]), p);
  expect(t, 'o ponto está na tela').not.toBeNull();
  await page.touchscreen.tap(t!.x, t!.y);
}
const esperar = async (page: Page, f: string, arg: unknown = null, timeout = 10_000) => {
  try {
    await page.waitForFunction(new Function('arg', `return (${f})(arg)`) as (a: unknown) => boolean, arg, { timeout });
  } catch (erro) {
    const estado = await page.evaluate(() => ({
      pes: window.__brumaluz!.jogadorPes!(),
      vista: window.__brumaluz!.baileEstado!(),
      eventos: (window.__brumaluz!.eventosBaile ?? []).slice(-4),
    }));
    console.log(`T20: esperou ${f} (${JSON.stringify(arg)}): ${JSON.stringify(estado)}`);
    await page.screenshot({ path: `${PASTA}/t20-esperou.jpg`, type: 'jpeg', quality: 80 });
    throw erro;
  }
};

// fluxo: só o celular em pé (ver e2e/telas.ts)
for (const tamanho of telasDoFluxo(['deitado', 'empe'] as const))
  test(`T20: n1 a n5 de ponta a ponta, com o dedo e moedinhas de verdade (${tamanho})`, async ({ browser }) => {
    test.setTimeout(1_500_000);
    const page = await abrir(browser, `t20-${tamanho}`, tamanho, 0.7);
    await contarGl(page);
    await page.addStyleTag({ content: '.toast-area { display: none !important; }' });
    const tq = await toques(page);
    // (portão da T24: no celular em pé, as fotos com a interface de quatro momentos, para ver a
    // tela pequena limpa: a sacola com o "+1", a lanterna da n2, a Lulu achada e o Tufinho seguindo)
    const fotoEmPe = async (nome: string, espera = 600) => {
      if (tamanho !== 'empe') return;
      await page.waitForTimeout(espera);
      await page.screenshot({ path: `${PASTA}/t20-empe-${nome}.jpg`, type: 'jpeg', quality: 88 });
    };
    const tempos: Record<string, number> = {};
    const ganhos: Record<string, number> = {};
    const missao = async (id: string, fazer: () => Promise<void>) => {
      const antes = await moedasReais(page);
      const t0 = Date.now();
      await escolher(page, id);
      await fazer();
      ganhos[id] = await festaDoFim(page, antes);
      tempos[id] = (Date.now() - t0) / 1000;
      // (as texturas e malhas da cena: nada pode crescer a cada missão)
      const cena = await page.evaluate(() => {
        const s = window.__brumaluz!.cenaBabylon!();
        return { texturas: s.textures.length, malhas: s.meshes.length, materiais: s.materials.length };
      });
      const gl = await lerGl(page);
      console.log(
        `T20 ${tamanho}: ${id} em ${tempos[id].toFixed(0)} s, ${ganhos[id]} moedinhas, cena ${JSON.stringify(cena)}, gl ${JSON.stringify(gl)}`,
      );
      expect(tempos[id], `${id} em até 3 minutos`).toBeLessThan(180);
    };
    // n1: as portas que a trilha mostra, uma de cada vez; cada campainha, um doce na sacola
    await missao('n1', async () => {
      for (let k = 0; k < 5; k++) {
        const alvo = await seguir(page, /^porta:\d$/);
        const i = Number(alvo.split(':')[1]);
        await tocarNo(page, tq.portas[i]);
        await esperar(page, `(i) => (window.__brumaluz.eventosBaile ?? []).some((e) => e.e === 'bailePorta' && e.i === i && e.doce)`, i);
        if (k === 1) await fotoEmPe('n1-sacola-mais-um', 900);
      }
      expect(await naMochila(page, 'sacola_doces')).toBe(5);
    });
    // n2: as cinco lanternas do bosque
    await missao('n2', async () => {
      for (let k = 0; k < 5; k++) {
        const alvo = await seguir(page, /^lanterna:\d$/);
        const i = Number(alvo.split(':')[1]);
        await tocarNo(page, tq.lanternas[i]);
        await esperar(page, `(i) => window.__brumaluz.baileEstado().lc.includes(i) || window.__brumaluz.baileEstado().lc.length === 0`, i);
        if (k === 1) await fotoEmPe('n2-lanterna');
      }
    });
    // n3: a Lulu nos três esconderijos
    await missao('n3', async () => {
      for (let k = 0; k < 3; k++) {
        await seguir(page, /^lulu:\d$/);
        await tocarNo(page, tq.lulu[k]);
        await esperar(page, `(k) => (window.__brumaluz.eventosBaile ?? []).some((e) => e.e === 'baileLulu' && e.k === k)`, k);
        if (k === 0) await fotoEmPe('n3-lulu-achada', 500);
      }
    });
    // n4: plantar, regar, esperar, colher; a carinha; o lampião na porta da Vovó
    await missao('n4', async () => {
      await seguir(page, /^horta$/);
      await tocarNo(page, tq.canteiro);
      await esperar(page, `() => window.__brumaluz.baileEstado().hv?.f === 'broto'`);
      await page.waitForTimeout(1100);
      await tocarNo(page, tq.canteiro);
      await esperar(page, `() => window.__brumaluz.baileEstado().hv?.f === 'regada'`);
      await page.waitForTimeout(5600);
      await tocarNo(page, tq.canteiro);
      await esperar(page, `() => !window.__brumaluz.baileEstado().hv`);
      await seguir(page, /^bancada$/);
      await tocarNo(page, tq.carinhas[0]);
      await esperar(page, `() => window.__brumaluz.baileEstado().car === 0`);
      await seguir(page, /^portaVovo$/);
      await tocarNo(page, tq.porta);
    });
    // n5: as patinhas até a horta, o toque chama o Tufinho e ele vem atrás até a Vovó
    await missao('n5', async () => {
      await esperar(page, `() => window.__guia.patinhas?.() === true`, null, 20_000);
      await seguir(page, /^tufinho$/);
      await tocarNo(page, tq.tufinho);
      await esperar(page, `() => window.__brumaluz.baileEstado().tf.o === 'segue'`);
      await fotoEmPe('n5-tufinho-seguindo', 1500);
      await seguir(page, /^vovo$/);
    });
    expect(ganhos).toEqual({ n1: 5, n2: 4, n3: 4, n4: 5, n5: 4 });
    // o quadro nunca abriu sozinho
    expect(await page.locator('[data-alma-quadro]').count()).toBe(0);
    await page.context().close();
  });

/** Uma jogadora com identidade própria (a nuvem precisa de duas). */
async function jogadora(b: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
      localStorage.setItem('terrario:config', JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }));
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => {
    console.log(`[${apelido}] erro: ${String(e)}`);
    errosDeMalha.push(`${apelido}: ${String(e)}`);
  });
  return p;
}
/**
 * Os erros de montar malha nas páginas das duas (o acabamento achou um: o mesmo desenho montado de
 * novo na segunda travessura não juntava; o teste confere que nenhum volta).
 */
const errosDeMalha: string[] = [];
/** Teleporta para (x, z) no chão da festa (as missões por toque direto: o dedo é o do teste de cima). */
const irPara = (p: Page, x: number, z: number) =>
  p.evaluate(({ x, z }) => {
    const e = window.__brumaluz!;
    e.voar?.(false);
    e.teleportar!(x, z, e.baile!()!.h + 1.2);
  }, { x, z });
const toque = (p: Page, c: Record<string, unknown>) => p.evaluate((c) => window.__brumaluz!.baileMissao!(c as never), c);

test('T20: duas amigas na nuvem, na n2 (a lanterna da Ana conta para a Bia), na sacola (a Bia vê os docinhos da Ana) e na n5 (a cópia fugida)', async ({ browser }) => {
  test.setTimeout(900_000);
  const pronto = (p: Page) => p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
  const jogar = (p: Page) =>
    p.evaluate(() => {
      document.querySelector('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.86;
      e.definirClima?.('limpo');
    });
  const ana = await jogadora(browser, 'ana-027-t20', 'Ana');
  await criarMundo(ana, 't20-nuvem', 'noite-das-fantasias', {}, 1337);
  await ana.goto('/?mundo=t20-nuvem');
  await pronto(ana);
  await jogar(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await jogar(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  await ana.evaluate(() => document.querySelector<HTMLElement>('.amigos [data-fechar], .amigos .fechar')?.click());
  const bia = await jogadora(browser, 'bia-027-t20', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await jogar(bia);
  for (const p of [ana, bia]) await p.addStyleTag({ content: '.toast-area, .dica-mira { display: none !important; }' });
  const pl = await ana.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    return { lanternas: b.pontos.lanternas, portas: b.pontos.portas, es: b.pontos.esconderijos, canteiro: b.pontos.canteiro, bancada: b.pontos.bancada, horta: b.pontos.tufinhoHorta, varanda: b.pontos.varanda };
  });
  const vista = (p: Page) => p.evaluate(() => window.__brumaluz!.baileEstado!()!);
  const feitas = (p: Page) =>
    p.evaluate(() => (window as unknown as { __almaUi: { vista(): { feitas: string[] } | null } }).__almaUi.vista()?.feitas ?? []);

  // ---------------------------------------------------------------- n2
  // a Ana acende a lanterna 0; a Bia chega depois: a lanterna já acesa conta para ela (e pisca)
  const l = pl.lanternas[0];
  await irPara(ana, l[0] + 1.5, l[2]);
  await ana.waitForTimeout(1500);
  await toque(ana, { a: 'lanterna', i: 0 });
  await bia.waitForFunction(() => window.__brumaluz!.baileEstado!()!.ln[0] === true, undefined, { timeout: 15_000 });
  expect((await vista(bia)).lc).toEqual([]);
  await irPara(bia, l[0] - 1.5, l[2]);
  await bia.waitForTimeout(1500);
  await toque(bia, { a: 'lanterna', i: 0 });
  await bia.waitForFunction(() => window.__brumaluz!.baileEstado!()!.lc.includes(0), undefined, { timeout: 10_000 });
  // a Ana vê a lanterna piscar pela Bia
  await ana.waitForFunction(
    () => (window.__brumaluz!.eventosBaile ?? []).some((e) => e.e === 'baileLanterna' && e.quem !== 'ana-027-t20' && e.i === 0 && e.conta && !e.acendeu),
    undefined,
    { timeout: 10_000 },
  );
  expect((await vista(ana)).lc).toEqual([0]);

  // ---------------------------------------------------------------- a sacola da Ana na tela da Bia
  // (a contagem vai pela rede junto com a mão: com um docinho a Bia vê um, com dois, dois)
  const docinhosDaAna = async () => {
    const pes = await ana.evaluate(() => window.__brumaluz!.jogadorPes!());
    return bia.evaluate((o) => {
      const ms = window.__brumaluz!.cenaBabylon!().meshes.filter(
        (m) => /^personagem-mao-docinho\d$/.test(m.name) && m.isEnabled(),
      );
      // (só os da mão da Ana: a sacola da Bia está na mão dela, longe)
      return ms.filter((m) => {
        const q = m.getAbsolutePosition();
        return Math.hypot(q.x - o[0], q.z - o[2]) < 1.5;
      }).length;
    }, pes);
  };
  for (const i of [0, 1]) {
    const q = pl.portas[i];
    await irPara(ana, q.x, q.z);
    await irPara(bia, q.x + 2.5, q.z + 1);
    await ana.waitForTimeout(1200);
    await toque(ana, { a: 'campainha', i });
    await ana.waitForFunction(
      (k) => {
        const e = window.__brumaluz!;
        const inv = e.inventario!;
        for (let s = 0; s < 9; s++)
          if (inv.obter(s)?.item === 'sacola_doces' && inv.obter(s)!.qtd === k) {
            e.selecionarSlot!(s);
            return true;
          }
        return false;
      },
      i + 1,
      { timeout: 10_000 },
    );
    await expect.poll(docinhosDaAna, { timeout: 10_000, message: `a Bia vê ${i + 1} docinho(s) na sacola da Ana` }).toBe(i + 1);
  }

  // ---------------------------------------------------------------- até a n5 (as duas fazem n1 a n4 pelo toque)
  async function ate5(p: Page): Promise<void> {
    const passo = async (x: number, z: number, c: Record<string, unknown>, espera = 1200) => {
      await irPara(p, x, z);
      await p.waitForTimeout(espera);
      await toque(p, c);
      await p.waitForTimeout(400);
    };
    for (const i of [0, 1, 2, 3, 4]) await passo(pl.portas[i].x, pl.portas[i].z, { a: 'campainha', i });
    for (const i of [0, 1, 2, 3, 4]) await passo(pl.lanternas[i][0] + 1.5, pl.lanternas[i][2], { a: 'lanterna', i });
    for (const k of [0, 1, 2]) await passo(pl.es[k].x + 1, pl.es[k].z, { a: 'lulu' }, 1500);
    await passo(pl.canteiro[0], pl.canteiro[2], { a: 'horta' });
    await passo(pl.canteiro[0], pl.canteiro[2], { a: 'horta' }, 600);
    await p.waitForTimeout(5500);
    await passo(pl.canteiro[0], pl.canteiro[2], { a: 'horta' }, 600);
    await passo(pl.bancada[0], pl.bancada[2], { a: 'carinha', c: 1 });
    const vovo = pl.portas.find((q) => q.vovo)!;
    await passo(vovo.x, vovo.z, { a: 'lampiao' });
    await p.waitForFunction(() => {
      const v = (window as unknown as { __almaUi: { vista(): { feitas: string[] } | null } }).__almaUi.vista();
      return ['n1', 'n2', 'n3', 'n4'].every((m) => v?.feitas.includes(m));
    }, undefined, { timeout: 20_000 });
    await fecharFestas(p);
  }
  /** As festas (das missões e do nível) que estiverem na tela: o "oba" fecha cada uma. */
  async function fecharFestas(p: Page): Promise<void> {
    let livre = 0;
    for (let k = 0; k < 40 && livre < 4; k++) {
      await p.waitForTimeout(700);
      const ok = p.locator('[data-alma-festa] [data-alma-oba]');
      if (await ok.count()) {
        livre = 0;
        await ok.first().click().catch(() => undefined);
        await p.waitForTimeout(900);
      } else if (!(await p.locator('[data-alma-festa]').count())) livre++;
    }
  }
  await ate5(ana);
  await ate5(bia);
  expect(await feitas(ana)).toEqual(expect.arrayContaining(['n1', 'n2', 'n3', 'n4']));

  // ---------------------------------------------------------------- n5
  // a Bia fica longe; a Ana chama o Tufinho na horta e leva até a Vovó
  await irPara(bia, pl.horta[0] - 40, pl.horta[2]);
  const [hx, , hz] = pl.horta;
  await irPara(ana, hx + 1.2, hz);
  await ana.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tf.o === 'horta', undefined, { timeout: 15_000 });
  await ana.waitForTimeout(1200);
  await toque(ana, { a: 'tufinho' });
  await ana.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tf.o === 'segue', undefined, { timeout: 10_000 });
  const [vx, , vz] = pl.varanda;
  await irPara(ana, vx, vz + 2);
  await ana.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tf.o === 'casa', undefined, { timeout: 15_000 });
  // o de verdade está com a Vovó; a Bia, que estava longe, tem a cópia fugida na horta
  await bia.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tc === 'horta', undefined, { timeout: 15_000 });
  expect((await vista(ana)).tc).toBeUndefined();
  expect(await feitas(ana)).toContain('n5');
  expect(await feitas(bia)).not.toContain('n5');
  // a Bia vai até a horta: na tela dela o Tufinho está lá (a cópia); na da Ana, no banquinho
  await irPara(bia, hx + 1.2, hz);
  await bia.waitForTimeout(2500);
  const gatoDa = async (p: Page) =>
    ((await p.evaluate(() => window.__brumaluz!.baileTela!()!.bichos)) as { nome: string; x: number; z: number }[]).find(
      (q) => q.nome === 'tufinho',
    )!;
  const naBia = await gatoDa(bia);
  expect(Math.hypot(naBia.x - hx, naBia.z - hz)).toBeLessThan(1.5);
  const naAna = await gatoDa(ana);
  expect(Math.hypot(naAna.x - hx, naAna.z - hz)).toBeGreaterThan(20);
  mkdirSync(PASTA, { recursive: true });
  await fecharFestas(bia);
  // (a foto com o Tufinho à vista: a Bia a uns 2,5 blocos dele, um tico de lado, a câmera do jogo
  // olhando para ele por cima do ombro dela)
  await bia.evaluate(({ hx, hz }) => {
    const e = window.__brumaluz!;
    const g = e.tufinhoOnde?.() ?? { x: hx, z: hz };
    const [x, , z] = e.jogadorPes!();
    const d = Math.hypot(x - g.x, z - g.z) || 1;
    const [px, pz] = [g.x + ((x - g.x) / d) * 2.5, g.z + ((z - g.z) / d) * 2.5];
    e.teleportar!(px, pz, e.baile!()!.h + 1.2);
    e.apontar!(Math.atan2(g.x - px, g.z - pz) + 0.3, 0.45);
  }, { hx, hz });
  await bia.waitForTimeout(1200);
  // (a câmera de lado, de 3/4: a Bia de um lado, o Tufinho do outro, nenhum na frente do outro)
  await cameraFixa(bia);
  const enquadre = await bia.evaluate(() => {
    const e = window.__brumaluz!;
    const g = e.tufinhoOnde!()!;
    const [x, y, z] = e.jogadorPes!();
    const [dx, dz] = [(x - g.x) / 2.5, (z - g.z) / 2.5];
    const meio = [(x + g.x) / 2, y + 0.45, (z + g.z) / 2];
    // (girada 80 graus da linha entre os dois, 3,6 blocos do meio, um tico acima)
    const c = Math.cos(1.4);
    const s = Math.sin(1.4);
    return { p: [meio[0] + (dx * c - dz * s) * 3.6, y + 1.9, meio[2] + (dx * s + dz * c) * 3.6], a: meio };
  });
  await camera(bia, enquadre.p as [number, number, number], enquadre.a as [number, number, number]);
  await bia.waitForTimeout(900);
  const naTela = await bia.evaluate(() => {
    const e = window.__brumaluz!;
    const g = e.tufinhoOnde!()!;
    return e.telaDoPonto!(g.x, g.y + 0.3, g.z);
  });
  expect(naTela, 'o Tufinho (a cópia) à vista na foto').not.toBeNull();
  await bia.screenshot({ path: `${PASTA}/t20-n5-copia-fugida-bia.jpg`, type: 'jpeg', quality: 88 });
  await camera(bia, null);
  // a Bia chama a cópia e leva até a Vovó: a n5 dela fecha; a da Ana não conta de novo
  await toque(bia, { a: 'tufinho' });
  await bia.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tc === 'segue', undefined, { timeout: 10_000 });
  await irPara(bia, vx + 1, vz + 2);
  await bia.waitForFunction(() => window.__brumaluz!.baileEstado!()!.tc === undefined, undefined, { timeout: 15_000 });
  await bia.waitForFunction(
    () => ((window as unknown as { __almaUi: { vista(): { feitas: string[] } | null } }).__almaUi.vista()?.feitas ?? []).includes('n5'),
    undefined,
    { timeout: 15_000 },
  );
  await fecharFestas(bia);
  await bia.screenshot({ path: `${PASTA}/t20-n5-bia-entregou.jpg`, type: 'jpeg', quality: 88 });
  // (cada uma viu duas travessuras, a dela e a da amiga: a malha montou as duas vezes)
  expect(errosDeMalha.filter((e) => /merge|vertex/i.test(e))).toEqual([]);
  for (const p of [ana, bia]) await p.context().close();
});
