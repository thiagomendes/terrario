import { test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { abrirPalco, camera, foto, hora, PASTA, passo, type V3 } from './esboco-fantasias-palco';
import { comecarGravacao, pararGravacao } from './gravarCena';
import type { Tamanho } from './guia-palco';

/**
 * Fotos do esboço da spec 027 (Noite das Fantasias) com o motor de verdade: o palco de
 * `src/esboco/fantasias.ts`, que só existe com `?esboco=fantasias`. Pesado e só para o esboço:
 * roda com ESBOCO_027=1, na placa de vídeo (E2E_ENV="-e ESBOCO_027=1" scripts/e2e-gpu.sh
 * e2e/esboco-fantasias.spec.ts). As fotos vão para capturas-027/esboco/.
 *
 * Parte 1: o céu e os lugares. Cada lugar no entardecer (o "dia" do mundo) e de noite; as
 * tomadas (onde a câmera fica) são do próprio esboço, que sabe onde montou cada coisa.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.ESBOCO_027, 'fotos do esboço só com ESBOCO_027');

/** O entardecer dourado (o dia do mundo) e a noite roxa com a lua baixa no leste. */
const ENTARDECER = 0.7;
const NOITE = 0.8;

const ORDEM = ['praca', 'barracas', 'rua', 'vovo', 'bosque', 'horta', 'panorama'];

async function fotografar(page: Page, t: Tamanho) {
  const tomadas = await page.evaluate(() => window.__fantasias!.tomadas);
  const tipo = t === 'empe' ? 'empe' : 'deitado';
  const so = process.env.FANTASIAS_SO?.split(',');
  for (const [qual, h] of [
    ['entardecer', ENTARDECER],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    await page.waitForTimeout(3000);
    for (const [i, nome] of ORDEM.entries()) {
      if (so && !so.includes(nome)) continue;
      // (de noite, a tomada própria da noite quando há: a rua e o panorama olham para a lua)
      const tm = (qual === 'noite' && tomadas[`${nome}Noite`] ? tomadas[`${nome}Noite`] : tomadas[nome])[tipo];
      await camera(page, tm.pos, tm.alvo, tm.fov);
      await foto(page, `${String(i + 1).padStart(2, '0')}-${nome}-${qual}-${t}`);
    }
    if (process.env.FANTASIAS_MAPA) {
      // o mapa visto de cima (só para conferir o leiaute, não vai para o dono)
      const [ox, y, oz] = await page.evaluate(() => window.__fantasias!.pontos.origem);
      const centro: V3 = [ox + 58, y, oz + 44];
      await camera(page, [centro[0], y + 150, centro[2] + 0.01], centro, 50);
      await foto(page, `00-mapa-${qual}-${t}`);
    }
  }
  // o bosque com as lanternas todas acesas (o "acender com um toque" de todas)
  const n = await page.evaluate(() => window.__fantasias!.lanternas().length);
  await page.evaluate((k) => {
    for (let i = 0; i < k; i++) window.__fantasias!.lanterna(i, true);
  }, n);
  await page.waitForTimeout(4000);
  const b = tomadas.bosque[tipo];
  await camera(page, b.pos, b.alvo, b.fov);
  await foto(page, `05-bosque-noite-todas-acesas-${t}`);
}

/**
 * Parte 2: os moradores fantasiados (os cinco lado a lado na praça e cada um no seu lugar) e
 * os bichos, de tarde e de noite, com a animação parada num instante bonito.
 */
const FOTOS_GENTE: Array<[string, string]> = [
  ['10-moradores-fila', 'morador-fila'],
  ['11-vovo-tufinho', 'morador-vovo'],
  ['12-dudu-bosque', 'morador-dudu'],
  ['13-lulu-espiando', 'morador-lulu'],
  ['14-bento-palco', 'morador-bento'],
  ['15-jeronimo-horta', 'morador-jeronimo'],
  ['16-bichos-morcegos', 'bicho-morcegos'],
  ['16-bichos-fantasminhas', 'bicho-fantasminhas'],
  ['16-bichos-abobrinhas', 'bicho-abobrinhas'],
  ['16-bichos-tufinho', 'bicho-tufinho'],
  // (só para conferir a gola da capa por trás: não vai para o dono)
  ...(process.env.FANTASIAS_DEBUG ? [['99-debug-dudu-costas', 'morador-duduCostas'] as [string, string]] : []),
];

async function fotografarGente(page: Page, t: Tamanho) {
  await page.waitForFunction(() => window.__fantasias!.gentePronta(), undefined, { timeout: 60_000 });
  await page.evaluate(() => {
    window.__fantasias!.animar(false);
    window.__fantasias!.fovFixo(true);
  });
  const tomadas = await page.evaluate(() => window.__fantasias!.tomadas);
  const tipo = t === 'empe' ? 'empe' : 'deitado';
  const so = process.env.FANTASIAS_SO?.split(',');
  for (const [qual, h] of [
    ['entardecer', ENTARDECER],
    ['noite', NOITE],
  ] as const) {
    await hora(page, h);
    await page.waitForTimeout(2000);
    for (const [nome, tomada] of FOTOS_GENTE) {
      if (so && !so.some((s) => nome.includes(s))) continue;
      // (nas fotos dos bichos, os moradores ficam na fila da praça: a Vovó não entra pela beira
      // da foto do Tufinho)
      const fila = tomada === 'morador-fila' || tomada.startsWith('bicho-');
      await page.evaluate((f) => window.__fantasias!.moradores(f ? 'fila' : 'lugares'), fila);
      const tm = tomadas[tomada][tipo];
      await camera(page, tm.pos, tm.alvo, tm.fov);
      await foto(page, `${nome}-${qual}-${t}`);
    }
  }
  await page.evaluate(() => window.__fantasias!.moradores('lugares'));
}

/**
 * Parte 3: a vassoura-patinete e o Trem das Risadas, num roteiro (fotos paradas num instante
 * do roteiro, com a câmera que acompanha) e os vídeos (só no computador, FANTASIAS_VIDEO=1):
 * a vassoura na rua, o trem no túnel (de fora e a bordo) e o passeio noturno pelo bosque.
 * O webm sai em capturas-027/esboco/videos/ (o mp4 do celular é feito à parte, com o ffmpeg).
 */
const FOTOS_PASSEIO: Array<[string, string, number]> = [
  // nome, câmera do roteiro e o instante (s)
  ['20-vassoura', 'vassoura', 3.6],
  ['20-vassoura-perto', 'vassouraPerto', 2.4],
  ['21-trem', 'trem', 7.4],
  ['21-trem-perto', 'tremPerto', 5.7],
  ['21-trem-bordo', 'bordo', 2.9],
  ['21-trem-tunel-dentro', 'tunelDentro', 5.5],
];

async function fotografarPasseios(page: Page, t: Tamanho) {
  await page.waitForFunction(() => window.__fantasias!.passeiosProntos(), undefined, { timeout: 60_000 });
  const tipo = t === 'empe' ? 'empe' : 'deitado';
  const so = process.env.FANTASIAS_SO?.split(',');
  // a folga até o teto do túnel: o alto de cada passageiro (do chão), com o trem lá dentro
  for (const inst of [4.0, 4.8, 5.6, 6.4]) {
    const alto = await page.evaluate((i) => {
      window.__fantasias!.passeio(null, i, false);
      const cena = window.__brumaluz!.cenaBabylon!() as {
        meshes: Array<{ name: string; isEnabled(): boolean; computeWorldMatrix(f: boolean): unknown; getBoundingInfo(): { boundingBox: { maximumWorld: { y: number } } } }>;
      };
      const chao = window.__fantasias!.pontos.origem[1] + 1;
      const r: Record<string, number> = {};
      for (const m of cena.meshes) {
        const k = ['bento-trem', 'bruxinha-trem', 'abobrinha-trem'].find((n) => m.name.startsWith(`esboco-passeio-${n}`));
        if (!k || !m.isEnabled()) continue;
        m.computeWorldMatrix(true);
        r[k] = Math.max(r[k] ?? 0, m.getBoundingInfo().boundingBox.maximumWorld.y - chao);
      }
      return r;
    }, inst);
    console.log(`FOLGA t=${inst} alto dos passageiros ${JSON.stringify(alto)} (o teto do túnel a 4,25 no meio e 4,12 a 0,6 do meio)`);
  }
  for (const [qual, h] of [
    ['entardecer', ENTARDECER],
    ['noite', NOITE],
  ] as const) {
    if (process.env.FANTASIAS_HORA && process.env.FANTASIAS_HORA !== qual) continue;
    await hora(page, h);
    await page.waitForTimeout(2000);
    for (const [nome, rig, inst] of FOTOS_PASSEIO) {
      if (so && !so.some((s) => nome.includes(s))) continue;
      await page.evaluate(([r, i, tp]) => window.__fantasias!.passeio(r, i, false, tp), [rig, inst, tipo] as const);
      await page.waitForTimeout(1500);
      await foto(page, `${nome}-${qual}-${t}`);
    }
  }
}

async function gravarPasseios(page: Page) {
  const pasta = `${PASTA}/videos`;
  mkdirSync(pasta, { recursive: true });
  const so = process.env.FANTASIAS_VIDEO!.split(',');
  const quer = (n: string) => so.includes('1') || so.includes(n);
  await page.waitForFunction(() => window.__fantasias!.passeiosProntos(), undefined, { timeout: 60_000 });
  await page.evaluate(() => window.__fantasias!.animar(true));
  if (quer('vassoura')) {
    await hora(page, ENTARDECER);
    await page.evaluate(() => window.__fantasias!.passeio('vassoura', 0, false, 'deitado'));
    await page.waitForTimeout(2500);
    await comecarGravacao(page);
    await page.evaluate(() => window.__fantasias!.passeio('vassoura', 0, true, 'deitado'));
    await page.waitForTimeout(6300);
    await pararGravacao(page, `${pasta}/20-vassoura.webm`);
    passo('vídeo da vassoura');
  }
  if (quer('trem')) {
    await hora(page, ENTARDECER);
    // sempre para a frente no tempo (revisor: o corte voltava no tempo): de fora, a câmera
    // acompanhando a locomotiva até a boca do túnel; a bordo, por dentro do túnel até sair; de
    // fora de novo, os vagões saindo e o trem indo embora
    const trocar = (rig: string) =>
      page.evaluate((r) => window.__fantasias!.passeio(r, window.__fantasias!.passeioAgora(), true, 'deitado'), rig);
    await page.evaluate(() => window.__fantasias!.passeio('tremSegue', 0, false, 'deitado'));
    await page.waitForTimeout(2500);
    await comecarGravacao(page);
    await page.evaluate(() => window.__fantasias!.passeio('tremSegue', 0, true, 'deitado'));
    await page.waitForTimeout(3100);
    await trocar('bordo');
    await page.waitForTimeout(3200);
    await trocar('tremSegue');
    await page.waitForTimeout(3600);
    await pararGravacao(page, `${pasta}/21-trem.webm`);
    passo('vídeo do trem');
  }
  if (quer('bosque')) {
    await hora(page, NOITE);
    const n = await page.evaluate(() => window.__fantasias!.lanternas().length);
    await page.evaluate((k) => {
      for (let i = 0; i < k; i++) window.__fantasias!.lanterna(i, false);
      window.__fantasias!.passeio('bosque', 0, false, 'deitado');
    }, n);
    await page.waitForTimeout(4000);
    await comecarGravacao(page);
    await page.evaluate(() => window.__fantasias!.passeio('bosque', 0, true, 'deitado'));
    // as lanternas da trilha acendem uma a uma, na frente de quem passeia
    const t0 = Date.now();
    for (const [i, quando] of [
      [4, 700],
      [5, 2000],
      [6, 3300],
      [7, 4600],
      [8, 5900],
      [9, 7200],
    ] as const) {
      await page.waitForTimeout(Math.max(0, quando - (Date.now() - t0)));
      await page.evaluate((k) => window.__fantasias!.lanterna(k, true), i);
    }
    await page.waitForTimeout(Math.max(0, 10200 - (Date.now() - t0)));
    await pararGravacao(page, `${pasta}/22-bosque-noite.webm`);
    passo('vídeo do bosque');
  }
}

for (const t of ['empe', 'deitado', 'pc'] as const)
  test(`passeios da Noite das Fantasias: ${t}`, async ({ browser }) => {
    test.setTimeout(1_200_000);
    const page = await abrirPalco(browser, t);
    if (process.env.FANTASIAS_VIDEO && t === 'pc') await gravarPasseios(page);
    if (!process.env.FANTASIAS_SEM_FOTOS) await fotografarPasseios(page, t);
    passo(`passeios ${t}`);
    await page.context().close();
  });

for (const t of ['empe', 'deitado', 'pc'] as const)
  test(`moradores e bichos da Noite das Fantasias: ${t}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const page = await abrirPalco(browser, t);
    await fotografarGente(page, t);
    passo(`fotos da gente ${t}`);
    await page.context().close();
  });

for (const t of ['empe', 'deitado', 'pc'] as const)
  test(`esboço da Noite das Fantasias: ${t}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const page = await abrirPalco(browser, t);
    await fotografar(page, t);
    passo(`fotos ${t}`);
    await page.context().close();
  });
