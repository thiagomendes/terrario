import { test, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { criarMundo, TAMANHOS, type Tamanho } from './guia-palco';

/**
 * Spec 027 (T05 e T07): as fotos da parte 1 da Noite das Fantasias, no jogo de verdade (o mundo
 * do tema, semente 1337), na placa de vídeo (scripts/e2e-gpu.sh), só com FOTOS_027=1. Vão para
 * `capturas-027/parte1/` (ou FOTOS_PASTA). `FOTOS_SO=praca,rua` escolhe as tomadas;
 * `FOTOS_TELAS=pc,empe` as telas.
 *
 * - Cada lugar no entardecer (o "dia" do mundo, 0,7) e de noite (0,85), em pé (390×844), deitado
 *   (844×390) e no computador (1280×720). A câmera fica parada (a abertura é a do jogo: o
 *   enquadramento muda pela posição, nunca pela abertura).
 * - **A conta da noite** (spec, "Experiência medida"): em cada foto de noite, a luminância
 *   0,2126 R + 0,7152 G + 0,0722 B (R, G e B do pixel divididos por 255, sem linearizar) dos pixels
 *   onde o raio da câmera acerta um bloco de chão (pela cena, não pela cor; sem o HUD: o HUD é
 *   HTML por cima do quadro): a mediana tem de passar de 0,25; e nenhum quadrado de lado 10% da
 *   largura com a média abaixo de 0,1. As contas vão para `noite.json`.
 * - Do alto, com a visão 8, nos quatro rumos: nenhum bioma alheio à vista.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.FOTOS_027, 'só com FOTOS_027=1');
test.setTimeout(1_800_000);
test.use({ actionTimeout: 30_000 });

type V3 = [number, number, number];
const PASTA = process.env.FOTOS_PASTA ?? 'capturas-027/parte1';
const SO = (process.env.FOTOS_SO ?? '').split(',').filter(Boolean);
const TELAS = ((process.env.FOTOS_TELAS ?? 'pc,deitado,empe').split(',') as Tamanho[]).filter(Boolean);
const ENTARDECER = 0.7;
const NOITE = 0.85;

interface Plano {
  ox: number;
  oz: number;
  h: number;
  nascimento: { x: number; z: number };
  abobora: { x: number; y: number; z: number; lado: number };
  barracas: { x: number; z: number }[];
  portas: { x: number; z: number; vovo?: boolean }[];
  lanternas: V3[];
  trilha: [number, number][];
  loja: V3;
  castelo: V3;
  torre: V3;
  portaoHorta: V3;
  bancada: V3;
  estacao: V3;
}

async function abrir(browser: Browser, tamanho: Tamanho, distancia: number): Promise<Page> {
  const ctx = await browser.newContext(TAMANHOS[tamanho]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await page.addInitScript((d) => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: d, mostrarFps: false, mostrarAtalhos: false, qualidade: 'alta' }),
      );
    } catch {
      // sem armazenamento
    }
  }, distancia);
  await criarMundo(page, `fotos-festa-${tamanho}`, 'noite-das-fantasias', {}, 1337);
  await page.goto(`/?mundo=fotos-festa-${tamanho}${tamanho === 'pc' ? '&escala=1' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.7;
    e.definirClima?.('limpo');
    window.dispatchEvent(new Event('resize'));
    const w = window as unknown as { __camFixa: { p: V3; a: V3 } | null };
    w.__camFixa = null;
    const scene = e.cenaBabylon!();
    // a criança fica fora da foto (o lugar é o assunto; na tela em pé a cabeça tapava o chão)
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
  await assentar(page);
  return page;
}

async function assentar(page: Page, minimo = 20) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(1500);
}

const plano = (page: Page): Promise<Plano> =>
  page.evaluate(() => {
    const b = window.__brumaluz!.baile!()!;
    const p = b.pontos;
    return {
      ox: b.ox,
      oz: b.oz,
      h: b.h,
      nascimento: b.nascimento,
      abobora: p.abobora,
      barracas: p.barracas,
      portas: p.portas,
      lanternas: p.lanternas,
      trilha: p.trilha,
      loja: p.loja,
      castelo: p.castelo,
      torre: p.torre,
      portaoHorta: p.portaoHorta,
      bancada: p.bancada,
      estacao: p.estacao,
    };
  });

async function camera(page: Page, p: V3, a: V3, ir?: V3) {
  await page.evaluate(
    ([p, a, ir]) => {
      const e = window.__brumaluz!;
      if (ir) {
        e.voar?.(true);
        e.teleportar!(ir[0], ir[2], ir[1]);
      }
      (window as unknown as { __camFixa: unknown }).__camFixa = { p, a };
    },
    [p, a, ir ?? null] as const,
  );
  await page.waitForTimeout(900);
}

/** A foto só da cena (sem a interface). */
async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, quality: 88 });
  await page.evaluate(() => {
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) el.style.visibility = '';
  });
  console.log(`FOTO ${nome}`);
}

/**
 * A conta da noite no quadro de agora: os pixels do chão (o raio acerta a face de cima de um bloco
 * na altura do chão da vila) e os quadrados escuros. Lê o quadro final da tela (depois do glow).
 */
async function contaDaNoite(page: Page, chao: number) {
  return page.evaluate(async (chao) => {
    const e = window.__brumaluz!;
    const scene = e.cenaBabylon!() as unknown as {
      pick(x: number, y: number, f?: (m: { name: string }) => boolean): {
        hit: boolean;
        pickedPoint: { y: number } | null;
        getNormal(w: boolean): { y: number } | null;
        pickedMesh: { name: string } | null;
      };
      getEngine(): {
        getRenderWidth(): number;
        getRenderHeight(): number;
        readPixels(x: number, y: number, w: number, h: number): Promise<ArrayBufferView>;
      };
      onAfterRenderObservable: { addOnce(f: () => void): void };
      activeCamera: unknown;
    };
    const eng = scene.getEngine();
    const W = eng.getRenderWidth();
    const H = eng.getRenderHeight();
    const canvas = document.getElementById('cena') as HTMLCanvasElement;
    const k = W / canvas.clientWidth;
    const px = await new Promise<Uint8Array>((ok) =>
      scene.onAfterRenderObservable.addOnce(() => {
        void eng.readPixels(0, 0, W, H).then((b) => ok(new Uint8Array(b.buffer, b.byteOffset, b.byteLength)));
      }),
    );
    const lum = (x: number, y: number) => {
      // readPixels vem de baixo para cima
      const i = ((H - 1 - y) * W + x) * 4;
      return (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    };
    const chaoL: number[] = [];
    const passo = Math.max(4, Math.round(canvas.clientWidth / 96));
    for (let cy = passo / 2; cy < canvas.clientHeight; cy += passo)
      for (let cx = passo / 2; cx < canvas.clientWidth; cx += passo) {
        const r = scene.pick(cx, cy, (m) => m.name.startsWith('chunk-'));
        if (!r.hit || !r.pickedPoint) continue;
        const n = r.getNormal(true);
        if (!n || n.y < 0.7) continue;
        if (Math.abs(r.pickedPoint.y - (chao + 1)) > 0.15) continue;
        chaoL.push(lum(Math.min(W - 1, Math.round(cx * k)), Math.min(H - 1, Math.round(cy * k))));
      }
    chaoL.sort((a, b) => a - b);
    const mediana = chaoL.length ? chaoL[chaoL.length >> 1] : -1;
    // os quadrados de lado 10% da largura, passo de meio lado
    const lado = Math.max(8, Math.round(W * 0.1));
    let pior = 1;
    // onde fica o pior quadrado (o canto de cima à esquerda, em fração da tela), para achar o culpado
    let onde = [0, 0];
    for (let y0 = 0; y0 + lado <= H; y0 += lado >> 1)
      for (let x0 = 0; x0 + lado <= W; x0 += lado >> 1) {
        let s = 0;
        let n = 0;
        for (let y = y0; y < y0 + lado; y += 4)
          for (let x = x0; x < x0 + lado; x += 4) {
            s += lum(x, y);
            n++;
          }
        if (s / n < pior) {
          pior = s / n;
          onde = [Number((x0 / W).toFixed(2)), Number((y0 / H).toFixed(2))];
        }
      }
    // (quatro casas no pior quadrado: com três, um 0,0996 aparecia como 0,1 e passava)
    return { pixelsChao: chaoL.length, medianaChao: Number(mediana.toFixed(3)), piorQuadrado: Number(pior.toFixed(4)), onde };
  }, chao);
}

interface Tomada {
  nome: string;
  /** Câmera e alvo para a tela deitada/computador e para a em pé (mais atrás e mais alta). */
  deitado: { p: V3; a: V3 };
  empe: { p: V3; a: V3 };
  /** Onde a criança fica (perto da câmera, para o chão em volta carregar). */
  ir: V3;
}

function tomadas(p: Plano): Tomada[] {
  const Y = p.h + 1;
  const a = p.abobora;
  const out: Tomada[] = [];
  const t = (nome: string, cam: V3, alvo: V3, recuo: V3 = [0, 4, 6]): void => {
    const dx = cam[0] - alvo[0];
    const dz = cam[2] - alvo[2];
    const l = Math.hypot(dx, dz) || 1;
    out.push({
      nome,
      deitado: { p: cam, a: alvo },
      empe: { p: [cam[0] + (dx / l) * recuo[2], cam[1] + recuo[1], cam[2] + (dz / l) * recuo[2]], a: alvo },
      ir: [cam[0], Y + 0.2, cam[2]],
    });
  };
  // a praça: de quem nasce, de frente para a abóbora gigante (o palco atrás dela)
  t('praca', [p.nascimento.x, Y + 2.6, p.nascimento.z + 3], [a.x, Y + 4, a.z]);
  // as barracas: de 3/4, da praça
  const b0 = p.barracas[0];
  // (T24: na tela em pé, mais alto e quase sem recuar: 6 blocos para trás a câmera ficava dentro
  // da abóbora gigante)
  t('barracas', [b0.x + 8, Y + 2.4, b0.z + 7], [b0.x - 1, Y + 1.6, b0.z + 2], [0, 4.5, 1]);
  // a rua das casinhas tortas: do começo da rua, olhando para a Vovó lá no fim
  const vovo = p.portas.find((q) => q.vovo)!;
  t('rua', [vovo.x + 2, Y + 3, p.oz + 42], [vovo.x, Y + 3, vovo.z + 6]);
  // a Casa da Vovó de frente, um pouco de lado
  // (pelo meio da rua: de lado, a câmera de trás da tela em pé entrava no telhado da vizinha)
  // (na tela em pé, de longe e baixo: a casa inteira com a varanda cabe, sem o telhado tomar
  // metade do quadro)
  t('vovo', [vovo.x + 2, Y + 2.6, vovo.z + 13], [vovo.x, Y + 2.5, vovo.z - 2], [0, 0.6, 13]);
  // a Loja de Fantasias, da praça
  t('loja', [p.loja[0] - 10, Y + 2.8, p.loja[2] - 3], [p.loja[0] + 3, Y + 3, p.loja[2] + 1]);
  // o bosque das lanternas: de cima do caminho (o corredor de árvores dos dois lados), olhando
  // para dentro dele; na tela em pé, mais alto, por cima das copas do começo
  const tr = p.trilha;
  t('bosque', [tr[1][0] + 1.5, Y + 2.2, tr[1][1] - 0.5], [tr[3][0], Y + 1.6, tr[3][1]], [0, 2, 0]);
  // o castelinho: do fim do caminho, a porta e a torre inteira
  // (T24: 5 blocos mais para trás no caminho e o alvo mais baixo: de perto e olhando para cima, a
  // torre reta parecia torta na foto)
  const cv = [tr[4][0] + 1 - (p.castelo[0] + 2), tr[4][1] - 1 - (p.castelo[2] + 4)];
  const cl = Math.hypot(cv[0], cv[1]) || 1;
  // (rodada do revisor visual: 2,5 blocos para a frente, um tico mais alto; 5 para trás, a copa da
  // árvore do caminho tapava o lado esquerdo)
  t(
    'castelo',
    [tr[4][0] + 1 + (cv[0] / cl) * 2.5, Y + 4.0, tr[4][1] - 1 + (cv[1] / cl) * 2.5],
    [p.castelo[0] + 2, Y + 5, p.castelo[2] + 4],
    [0, 3, 5],
  );
  // a horta: do portão para dentro
  t('horta', [p.portaoHorta[0] - 4, Y + 4, p.portaoHorta[2] - 6], [p.portaoHorta[0] + 8, Y, p.portaoHorta[2] + 12]);
  // o gramado da festa: da estaçãozinha para dentro
  t('gramado', [p.estacao[0] + 2, Y + 4, p.estacao[2] - 6], [p.estacao[0], Y, p.estacao[2] + 16]);
  return out;
}

for (const tamanho of TELAS)
  test(`fotos da parte 1 (${tamanho})`, async ({ browser }) => {
    const page = await abrir(browser, tamanho, tamanho === 'pc' ? 6 : 4);
    const p = await plano(page);
    const contas: Record<string, unknown> = {};
    const lista = tomadas(p).filter((t) => !SO.length || SO.includes(t.nome));
    for (const [qual, h] of [
      ['entardecer', ENTARDECER],
      ['noite', NOITE],
    ] as const) {
      await page.evaluate((v) => {
        window.__brumaluz!.hora = v;
      }, h);
      await page.waitForTimeout(2500);
      for (const t of lista) {
        const c = tamanho === 'empe' ? t.empe : t.deitado;
        await camera(page, c.p, c.a, t.ir);
        await assentar(page, 12);
        await camera(page, c.p, c.a);
        await foto(page, `${t.nome}-${qual}-${tamanho}`);
        if (qual === 'noite') {
          const n = await contaDaNoite(page, p.h);
          contas[`${t.nome}-${tamanho}`] = n;
          console.log(`NOITE ${t.nome}-${tamanho} ${JSON.stringify(n)}`);
        }
      }
    }
    mkdirSync(PASTA, { recursive: true });
    writeFileSync(`${PASTA}/noite-${tamanho}.json`, `${JSON.stringify(contas, null, 2)}\n`);
    await page.context().close();
  });

test('do alto, com a visão 8, nos quatro rumos', async ({ browser }) => {
  test.skip(SO.length > 0 && !SO.includes('alto'), 'só com alto');
  const page = await abrir(browser, 'pc', 8);
  const p = await plano(page);
  const Y = p.h + 1;
  const [cx, cz] = [p.ox + 62, p.oz + 56];
  for (const [rumo, dx, dz] of [
    ['norte', 0, -1],
    ['leste', 1, 0],
    ['sul', 0, 1],
    ['oeste', -1, 0],
  ] as const) {
    // do alto do meio da vila, olhando para fora até a névoa
    await camera(page, [cx - dx * 30, Y + 60, cz - dz * 30], [cx + dx * 90, Y, cz + dz * 90], [cx, Y + 40, cz]);
    await page.waitForTimeout(4000);
    await foto(page, `alto-${rumo}-pc`);
  }
  // e o mapa de cima (o leiaute inteiro)
  await camera(page, [cx, Y + 150, cz + 0.01], [cx, Y, cz]);
  await page.waitForTimeout(3000);
  await foto(page, 'alto-mapa-pc');
  await page.context().close();
});
