import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';
import { abrirRoleta, itensDaRoleta, rolarAte, tocarNoMeio } from './roleta-palco';
import { Bloco } from '../src/world/blocks';

/**
 * Spec 037 (T03): a câmera e a mira da primeira pessoa no jogo de verdade, e o olhinho na roda.
 *
 * - **a roda e o recarregar:** o olhinho entra e sai pela cabeça em uns 0,7 s; os olhos a 1,62,
 *   no máximo 0,2 à frente do centro, 80° no celular em pé; a escolha fica no aparelho;
 *   comprar na lojinha volta para fora;
 * - **20 toques** em pé, nas duas câmeras: cada bloco entra na célula embaixo do dedo (o ponto do
 *   toque sai da face do bloco desenhada na tela, não da conta do jogo);
 * - **na obra** (Cidade Grande), 20 toques de dentro: cada um enche o fantasma embaixo do dedo;
 * - **a parede encostada:** a câmera nunca entra no bloco, e a criança quebra e põe na parede;
 * - **o computador:** o mouse travado, arrastar gira, o clique age na mira do meio (o pontinho e
 *   o contorno); o controle de videogame também mira do meio;
 * - **os lugares com câmera própria:** a foto, a Casa anos 80, o parque, montada, dormindo e
 *   desmaiada: a primeira pessoa sai sozinha e volta depois.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp" scripts/e2e-gpu.sh e2e/primeira-pessoa.spec.ts --workers 1 --trace off
 */
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = 'capturas-037/t03';
const medidas: Record<string, unknown> = {};
const gravar = (parte: string, valor: unknown) => {
  medidas[parte] = valor;
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(`${PASTA}/medidas-${parte}.json`, JSON.stringify(valor, null, 1));
};
const foto = async (p: Page, nome: string) => {
  mkdirSync(PASTA, { recursive: true });
  await p.screenshot({ path: `${PASTA}/${nome}.png` });
};

type C3 = [number, number, number];
const fracao = (p: Page) => p.evaluate(() => window.__brumaluz!.primeiraPessoa!.fracao());
const ligada = (p: Page) => p.evaluate(() => window.__brumaluz!.primeiraPessoa!.ligada());
const propria = (p: Page) => p.evaluate(() => window.__brumaluz!.primeiraPessoa!.propria());
const camera = (p: Page) => p.evaluate(() => window.__brumaluz!.primeiraPessoa!.camera());
const ligar = (p: Page, sim: boolean) =>
  p.evaluate((sim) => window.__brumaluz!.primeiraPessoa!.ligar(sim), sim);
const dentro = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.fracao() >= 1, undefined, { timeout: 15_000 });
const fora = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.fracao() <= 0, undefined, { timeout: 15_000 });
const bloco = (p: Page, c: C3) => p.evaluate((c) => window.__brumaluz!.bloco!(c[0], c[1], c[2]), c);
const olhar = (p: Page, yaw: number, pitch: number) =>
  p.evaluate(([y, pi]) => window.__brumaluz!.apontar!(y, pi), [yaw, pitch] as const);

/** Põe tábuas na mão (o espaço 1 da barra). */
const tabuasNaMao = (p: Page) =>
  p.evaluate(() => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, null);
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.selecionarSlot!(1);
  });

/**
 * Um campo de pedregulho, limpo por cima, com uma parede de 3 de altura sete passos à frente;
 * a criança no meio, olhando para a parede (+z). Devolve a célula dos pés.
 */
async function montarCampo(p: Page, paredeEm = 5): Promise<C3> {
  const c = await p.evaluate(
    async ({ pedra, paredeEm }) => {
      const e = window.__brumaluz!;
      const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
      e.voar?.(false);
      const [x0, , z0] = e.posicao!;
      const fx = Math.floor(x0);
      const fz = Math.floor(z0);
      const fy = Math.floor(e.posicao![1] - 1.62);
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      for (let dx = -7; dx <= 7; dx++)
        for (let dz = -5; dz <= paredeEm + 3; dz++) {
          lote.push({ x: fx + dx, y: fy - 1, z: fz + dz, v: pedra });
          for (let dy = 0; dy < 7; dy++) {
            const parede = dz === paredeEm && Math.abs(dx) <= 5 && dy <= 2;
            lote.push({ x: fx + dx, y: fy + dy, z: fz + dz, v: parede ? pedra : 0 });
          }
        }
      e.editarLote!(lote);
      await espera(300);
      e.teleportar!(fx + 0.5, fz + 0.5, fy);
      e.apontar!(0, 0.45);
      await espera(900);
      return [fx, fy, fz] as [number, number, number];
    },
    { pedra: Bloco.PEDREGULHO, paredeEm },
  );
  await p.evaluate(() => window.__brumaluz!.sincronizar?.());
  return c;
}

/** O ponto da tela de um ponto do mundo, se ele cai no jogo (fora dos botões). */
const telaLivre = (p: Page, w: C3) =>
  p.evaluate((w) => {
    const t = window.__brumaluz!.telaDoPonto!(w[0], w[1], w[2]);
    if (!t) return null;
    const x = Math.round(t.x);
    const y = Math.round(t.y);
    // (longe do minimapa, da mochila e dos botões de baixo)
    if (x < 12 || y < innerHeight * 0.27 || x > innerWidth - 12 || y > innerHeight * 0.78) return null;
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    if (!el || !(el.tagName === 'CANVAS' || el.classList.contains('olhar'))) return null;
    return { x, y };
  }, w);

/** Quantos blocos `b` há no campo (para achar um bloco que caiu em outra célula). */
const contar = (p: Page, c: C3, b: number) =>
  p.evaluate(
    ([c, b]) => {
      const e = window.__brumaluz!;
      let n = 0;
      for (let dx = -7; dx <= 7; dx++)
        for (let dz = -5; dz <= 10; dz++)
          for (let dy = 0; dy < 7; dy++) if (e.bloco!(c[0] + dx, c[1] + dy, c[2] + dz) === b) n++;
      return n;
    },
    [c, b] as const,
  );

/**
 * 20 toques de verdade: o ponto sai de uma face desenhada na tela (o tampo do chão à frente ou a
 * frente da parede, com um desvio dentro da face) e o bloco tem de entrar na célula encostada
 * nela. Depois de cada um o bloco sai, para a cena ficar igual.
 */
async function vinteToques(p: Page, c: C3, paredeEm = 5) {
  const [fx, fy, fz] = c;
  const desvios: [number, number][] = [
    [0, 0],
    [0.22, -0.18],
    [-0.2, 0.2],
    [0.15, 0.24],
    [-0.24, -0.12],
  ];
  const faces: { ponto: C3; cel: C3; face: string }[] = [];
  for (let k = 0; k < 120; k++) {
    const [jx, jy] = desvios[(k + Math.floor(k / 10)) % desvios.length];
    if (k % 2 === 0) {
      const dx = ((k / 2) % 5) - 2;
      // (dentro do alcance do dedo, 6,5 dos olhos: o chão até a parede, a 5)
      const dz = 2 + (Math.floor(k / 10) % 3);
      faces.push({
        ponto: [fx + dx + 0.5 + jx, fy, fz + dz + 0.5 + jy],
        cel: [fx + dx, fy, fz + dz],
        face: 'chão',
      });
    } else {
      const dx = (((k - 1) / 2) % 5) - 2;
      const dy = Math.floor(k / 10) % 3;
      faces.push({
        ponto: [fx + dx + 0.5 + jx, fy + dy + 0.5 + jy, fz + paredeEm],
        cel: [fx + dx, fy + dy, fz + paredeEm - 1],
        face: 'parede',
      });
    }
  }
  const lista: { ponto: number[]; cel: C3; face: string; certo: boolean }[] = [];
  for (const f of faces) {
    if (lista.length >= 20) break;
    const t = await telaLivre(p, f.ponto);
    if (!t) continue;
    if ((await bloco(p, f.cel)) !== 0) continue;
    const antes = await contar(p, c, Bloco.TABUAS);
    await p.touchscreen.tap(t.x, t.y);
    await p.waitForTimeout(450);
    const noLugar = await bloco(p, f.cel);
    const depois = await contar(p, c, Bloco.TABUAS);
    const certo = noLugar === Bloco.TABUAS && depois === antes + 1;
    lista.push({ ponto: [t.x, t.y], cel: f.cel, face: f.face, certo });
    if (!certo) {
      const onde = await p.evaluate(
        ([c]) => {
          const e = window.__brumaluz!;
          const l: number[][] = [];
          for (let dx = -7; dx <= 7; dx++)
            for (let dz = -5; dz <= 10; dz++)
              for (let dy = 0; dy < 7; dy++)
                if (e.bloco!(c[0] + dx, c[1] + dy, c[2] + dz) === 7) l.push([c[0] + dx, c[1] + dy, c[2] + dz]);
          return { l, overlay: document.body.dataset.overlay ?? null, pos: e.posicao };
        },
        [c] as const,
      );
      console.log(`  errou: toque ${t.x},${t.y} ${f.face} queria ${f.cel} achou ${noLugar} ${JSON.stringify(onde)}`);
    }
    // tira o bloco (e qualquer outro que tenha entrado) para a cena continuar igual
    await p.evaluate(
      ([c]) => {
        const e = window.__brumaluz!;
        for (let dx = -7; dx <= 7; dx++)
          for (let dz = -5; dz <= 10; dz++)
            for (let dy = 0; dy < 7; dy++)
              if (e.bloco!(c[0] + dx, c[1] + dy, c[2] + dz) === 7) e.definirBloco!(c[0] + dx, c[1] + dy, c[2] + dz, 0);
      },
      [c] as const,
    );
    await p.waitForTimeout(150);
  }
  const certos = lista.filter((t) => t.certo).length;
  const porFace: Record<string, number> = {};
  for (const t of lista) porFace[t.face] = (porFace[t.face] ?? 0) + 1;
  console.log(`toques: ${certos} de ${lista.length} na célula embaixo do dedo ${JSON.stringify(porFace)}`);
  return { toques: lista.length, certos, porFace, erros: lista.filter((t) => !t.certo) };
}

test('a roda troca a câmera (pela cabeça, em uns 0,7 s), a escolha fica no aparelho e a lojinha volta para fora', async ({
  browser,
}) => {
  const page = await abrirMundo(browser, { id: 'pp-roda', tema: 'doce-reino', tamanho: 'empe' });
  await assentar(page);
  expect(await ligada(page)).toBe(false);
  expect(await fracao(page)).toBe(0);
  await abrirRoleta(page);
  expect(await itensDaRoleta(page)).toContain('ver-de-dentro');
  expect(await itensDaRoleta(page)).not.toContain('ver-de-fora');
  await rolarAte(page, 'ver-de-dentro');
  await page.waitForTimeout(300);
  await foto(page, 'roda-olhinho');
  await tocarNoMeio(page);
  await dentro(page);
  await page.waitForTimeout(400);
  const cam = await camera(page);
  expect(await ligada(page)).toBe(true);
  expect(cam.cima).toBeGreaterThan(1.55);
  expect(cam.cima).toBeLessThan(1.66);
  expect(cam.frente).toBeGreaterThanOrEqual(-0.001);
  expect(cam.frente).toBeLessThanOrEqual(0.2001);
  expect(Math.abs(cam.lado)).toBeLessThan(0.01);
  expect(cam.fovV).toBeGreaterThan(79);
  expect(cam.fovV).toBeLessThan(81);
  expect(await page.evaluate(() => document.body.classList.contains('primeira-pessoa'))).toBe(true);
  await foto(page, 'em-pe-dentro');
  // a saída e a entrada pela cabeça, de 0,7 s (a meta: até 0,8 s, sem quadro acima de 100 ms),
  // contadas do quadro em que a escolha muda até a câmera chegar
  const trocar = (sim: boolean) =>
    page.evaluate(
      (sim) =>
        new Promise<{ ms: number; maior: number }>((ok) => {
          const pp = window.__brumaluz!.primeiraPessoa!;
          const t0 = performance.now();
          let antes = t0;
          let maior = 0;
          pp.ligar(sim);
          const f = () => {
            const agora = performance.now();
            maior = Math.max(maior, agora - antes);
            antes = agora;
            if (pp.fracao() === (sim ? 1 : 0)) ok({ ms: agora - t0, maior });
            else requestAnimationFrame(f);
          };
          requestAnimationFrame(f);
        }),
      sim,
    );
  const saida = await trocar(false);
  const entrada = await trocar(true);
  gravar('roda', { entrada, saida, camera: cam });
  console.log('troca', JSON.stringify({ entrada, saida, cam }));
  for (const t of [entrada, saida]) {
    // (a fração chega a 1 num quadro, e o teste vê no seguinte)
    expect(t.ms).toBeLessThan(800 + t.maior);
    expect(t.maior).toBeLessThan(100);
  }

  // recarregar: continua de dentro
  await page.reload();
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.evaluate(() => document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', ''));
  await dentro(page);
  expect(await ligada(page)).toBe(true);
  await assentar(page);
  await abrirRoleta(page);
  expect(await itensDaRoleta(page)).toContain('ver-de-fora');
  expect(await itensDaRoleta(page)).not.toContain('ver-de-dentro');
  await rolarAte(page, 'ver-de-fora');
  await page.waitForTimeout(300);
  await foto(page, 'roda-olhinho-dentro');
  await tocarNoMeio(page);
  await fora(page);
  expect(await ligada(page)).toBe(false);
  expect(await page.evaluate(() => document.body.classList.contains('primeira-pessoa'))).toBe(false);
  await page.reload();
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await page.waitForTimeout(1500);
  expect(await ligada(page)).toBe(false);
  expect(await fracao(page)).toBe(0);

  // comprar e vestir na lojinha: volta para fora
  await page.evaluate(() => document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', ''));
  await ligar(page, true);
  await dentro(page);
  await page.evaluate(() => {
    const a = (
      window as unknown as {
        __almaCrianca: {
          aplicarGanho(g: { moedas: number; xp: number; pontos: Record<string, number> }): unknown;
          comprarPremium(id: string): { ok: boolean };
        };
      }
    ).__almaCrianca;
    a.aplicarGanho({ moedas: 300, xp: 0, pontos: {} });
    a.comprarPremium('camiseta-aquario');
  });
  await fora(page);
  expect(await ligada(page)).toBe(false);
  await page.context().close();
});

test('20 toques em pé, nas duas câmeras: cada bloco entra na célula embaixo do dedo', async ({ browser }) => {
  const page = await abrirMundo(browser, { id: 'pp-toques', tema: 'doce-reino', tamanho: 'empe' });
  await assentar(page);
  const c = await montarCampo(page);
  await tabuasNaMao(page);
  await page.waitForTimeout(900);
  // de fora (a terceira pessoa de hoje)
  await foto(page, 'toques-fora');
  const deFora = await vinteToques(page, c);
  // de dentro
  await ligar(page, true);
  await dentro(page);
  await olhar(page, 0, 0.32);
  await page.waitForTimeout(700);
  await foto(page, 'toques-dentro');
  const deDentro = await vinteToques(page, c);
  // o contorno embaixo do dedo enquanto ele segura (o tampo do chão à frente)
  const pontoContorno: C3 = [c[0] + 0.5, c[1], c[2] + 3.5];
  const t = await telaLivre(page, pontoContorno);
  if (!t)
    console.log(
      'contorno: o ponto não caiu no jogo',
      JSON.stringify(
        await page.evaluate((w) => {
          const t = window.__brumaluz!.telaDoPonto!(w[0], w[1], w[2]);
          const el = t ? (document.elementFromPoint(t.x, t.y) as HTMLElement | null) : null;
          return { t, el: el ? `${el.tagName}.${el.className}` : null, h: innerHeight };
        }, pontoContorno),
      ),
    );
  expect(t).not.toBeNull();
  await page.evaluate(
    (t) => {
      const el = document.querySelector<HTMLElement>('[data-toque] .olhar')!;
      el.dispatchEvent(
        new PointerEvent('pointerdown', { pointerId: 41, pointerType: 'touch', clientX: t.x, clientY: t.y, bubbles: true, isPrimary: true }),
      );
    },
    t!,
  );
  await page.waitForTimeout(200);
  const mira = await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.mira());
  await foto(page, 'contorno-embaixo-do-dedo');
  await page.evaluate(
    (t) => {
      const el = document.querySelector<HTMLElement>('[data-toque] .olhar')!;
      el.dispatchEvent(
        new PointerEvent('pointercancel', { pointerId: 41, pointerType: 'touch', clientX: t.x, clientY: t.y, bubbles: true, isPrimary: true }),
      );
    },
    t!,
  );
  gravar('toques', { deFora, deDentro, mira });
  await page.context().close();
  expect(deFora.toques).toBe(20);
  expect(deFora.certos).toBe(20);
  expect(deDentro.toques).toBe(20);
  expect(deDentro.certos).toBe(20);
  expect(mira).toEqual([c[0], c[1], c[2] + 3]);
});

test('a parede encostada: a câmera nunca entra no bloco, e a criança quebra e põe na parede', async ({ browser }) => {
  const page = await abrirMundo(browser, { id: 'pp-parede', tema: 'doce-reino', tamanho: 'empe' });
  await assentar(page);
  // a parede logo à frente (na célula seguinte)
  const c = await montarCampo(page, 1);
  const [fx, fy, fz] = c;
  // a parede com dois de grossura (o fundo do buraco, depois de quebrar)
  await page.evaluate(
    ([fx, fy, fz, pedra]) => {
      const lote: { x: number; y: number; z: number; v: number }[] = [];
      for (let dx = -5; dx <= 5; dx++) for (let dy = 0; dy <= 2; dy++) lote.push({ x: fx + dx, y: fy + dy, z: fz + 2, v: pedra });
      window.__brumaluz!.editarLote!(lote);
    },
    [fx, fy, fz, Bloco.PEDREGULHO] as const,
  );
  await tabuasNaMao(page);
  await ligar(page, true);
  await dentro(page);
  // anda até encostar
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await page.waitForTimeout(300);
  const pes = await page.evaluate(() => window.__brumaluz!.posicao!);
  expect(pes[2]).toBeGreaterThan(fz + 0.6);
  // gira o olhar de um lado para o outro, para cima e para baixo: a câmera nunca entra nem chega
  // perto da parede (o plano de perto, 0,1, nunca corta o bloco)
  const giro = await page.evaluate(async (zParede) => {
    const e = window.__brumaluz!;
    const pp = e.primeiraPessoa!;
    const s = e.cenaBabylon!();
    const cam = s.activeCamera!;
    let dentroDeBloco = 0;
    let menor = 9;
    let quadros = 0;
    for (let i = 0; i <= 60; i++) {
      const yaw = -1.4 + (2.8 * i) / 60;
      const pitch = Math.sin(i / 6) * 0.9;
      e.apontar!(yaw, pitch);
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const c = pp.camera();
      if (c.dentroDeBloco) dentroDeBloco++;
      menor = Math.min(menor, zParede - cam.position.z);
      quadros++;
    }
    return { quadros, dentroDeBloco, menorAteParede: +menor.toFixed(3) };
  }, fz + 1);
  console.log('giro encostada', JSON.stringify(giro));
  expect(giro.dentroDeBloco).toBe(0);
  expect(giro.menorAteParede).toBeGreaterThanOrEqual(0.19);
  await olhar(page, 0, 0.05);
  await page.waitForTimeout(500);
  await foto(page, 'parede-encostada');
  // (encostada, a criança vê só o bloco da frente: quebra ele e põe de volta pelo buraco, no
  // bloco de trás)
  // quebra o bloco da parede na altura dos olhos (segurando o dedo)
  const quebrar: C3 = [fx, fy + 1, fz + 1];
  const tq = await telaLivre(page, [fx + 0.5, fy + 1.55, fz + 1]);
  if (!tq)
    console.log(
      'parede: o ponto não caiu no jogo',
      JSON.stringify(
        await page.evaluate((w) => {
          const e = window.__brumaluz!;
          const t = e.telaDoPonto!(w[0], w[1], w[2]);
          const el = t ? (document.elementFromPoint(t.x, t.y) as HTMLElement | null) : null;
          const v = e.cenaBabylon!().activeCamera!.position;
          return { t, el: el ? `${el.tagName}.${el.className}` : null, v: [v.x, v.y, v.z], pos: e.posicao, rot: e.rotacao };
        }, [fx + 0.5, fy + 1.55, fz + 1] as C3),
      ),
    );
  expect(tq).not.toBeNull();
  await page.evaluate((t) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(2, { item: 'picareta_pedra', qtd: 1 });
    e.selecionarSlot!(2);
    const c = e.controleDireto!;
    c.mirar(t.x, t.y);
    c.quebrar(true);
  }, tq!);
  await page.waitForFunction((q) => window.__brumaluz!.bloco!(q[0], q[1], q[2]) === 0, quebrar, { timeout: 8000 });
  await page.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.quebrar(false);
    c.soltarMira();
  });
  await page.waitForTimeout(400);
  expect(await bloco(page, quebrar)).toBe(0);
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(1));
  await page.waitForTimeout(500);
  await foto(page, 'parede-quebrou');
  // põe na parede: no fundo do buraco (a face do bloco de trás), o bloco volta para o buraco
  const tp = await telaLivre(page, [fx + 0.5, fy + 1.5, fz + 2]);
  expect(tp).not.toBeNull();
  await page.touchscreen.tap(tp!.x, tp!.y);
  await page.waitForTimeout(600);
  const pos = await bloco(page, quebrar);
  // e a câmera continua fora dos blocos
  const depois = await camera(page);
  await foto(page, 'parede-pos');
  gravar('parede', { giro, pos, depois });
  expect(pos).toBe(Bloco.TABUAS);
  expect(depois.dentroDeBloco).toBe(false);
  await page.context().close();
});

test('na obra (Cidade Grande), 20 toques de dentro: cada um enche o fantasma embaixo do dedo', async ({
  browser,
}) => {
  const page = await abrirMundo(browser, { id: 'pp-obra', tema: 'cidade-grande', tamanho: 'empe' });
  await assentar(page, 20);
  await page.waitForFunction(
    () => {
      const e = window.__brumaluz!;
      const i = e.inventario as unknown as { obter(i: number): { item: string } | null };
      return (e.colherRecebida ?? 0) > 0 || !!i.obter(0);
    },
    undefined,
    { timeout: 30_000 },
  );
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(0));
  await ligar(page, true);
  await dentro(page);
  type F = { x: number; y: number; z: number; bloco: number; canteiro: number };
  const lista: { f: number[]; certo: boolean }[] = [];
  let fotoTirada = false;
  const pulos = { semFantasma: 0, foraDaTela: 0, tapado: 0 };
  for (let volta = 0; volta < 60 && lista.length < 20; volta++) {
    const fs: F[] = await page.evaluate(() =>
      (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === 1),
    );
    if (!fs.length) {
      pulos.semFantasma++;
      break;
    }
    const f = fs[volta % Math.min(fs.length, 6)];
    let tocou = false;
    for (const [dx, dz, dy] of [
      [0, -2.6, 1.2],
      [0, 2.6, 1.2],
      [-2.6, 0, 1.2],
      [2.6, 0, 1.2],
      [0, -2.2, 2.4],
      [0, 2.2, 2.4],
    ]) {
      await page.evaluate(
        ([f, dx, dz, dy]) => {
          const e = window.__brumaluz!;
          e.voar?.(true);
          e.teleportar!(f.x + 0.5 + dx, f.z + 0.5 + dz, f.y + dy);
        },
        [f, dx, dz, dy] as const,
      );
      // spec 037 (como no canteiro, c55fc51): o soltar tira o boneco de dentro do tapume e dos
      // blocos da obra; a mira é feita depois que ele assenta, de onde ele ficou
      await page.waitForTimeout(60);
      await page.evaluate((f) => window.__brumaluz!.mirarPonto!(f.x + 0.5, f.y + 0.5, f.z + 0.5), f);
      await page.waitForTimeout(350);
      const t = await telaLivre(page, [f.x + 0.5, f.y + 0.5, f.z + 0.5]);
      if (!t) {
        pulos.foraDaTela++;
        if (pulos.foraDaTela <= 3)
          console.log(
            '  obra fora da tela',
            JSON.stringify(
              await page.evaluate((f) => {
                const t = window.__brumaluz!.telaDoPonto!(f.x + 0.5, f.y + 0.5, f.z + 0.5);
                const el = t ? (document.elementFromPoint(t.x, t.y) as HTMLElement | null) : null;
                return { t, el: el ? `${el.tagName}.${el.className}` : null, fr: window.__brumaluz!.primeiraPessoa!.fracao() };
              }, f),
            ),
          );
        continue;
      }
      // nada na frente do fantasma, nem bloco de verdade nem outro fantasma: o caminho da
      // câmera que desenha até o meio dele, de 2 em 2 centésimos (a conta do teste, não a do jogo)
      const livre = await page.evaluate(
        ([f, fs]) => {
          const e = window.__brumaluz!;
          const o = e.cenaBabylon!().activeCamera!.position;
          const outros = new Set(fs.filter((g) => g.x !== f.x || g.y !== f.y || g.z !== f.z).map((g) => `${g.x},${g.y},${g.z}`));
          const alvo = [f.x + 0.5, f.y + 0.5, f.z + 0.5];
          const d = Math.hypot(alvo[0] - o.x, alvo[1] - o.y, alvo[2] - o.z);
          for (let s = 0; s < d; s += 0.02) {
            const k = s / d;
            const x = Math.floor(o.x + (alvo[0] - o.x) * k);
            const y = Math.floor(o.y + (alvo[1] - o.y) * k);
            const z = Math.floor(o.z + (alvo[2] - o.z) * k);
            if (x === f.x && y === f.y && z === f.z) return true;
            if (outros.has(`${x},${y},${z}`) || e.bloco!(x, y, z) !== 0) return false;
          }
          return true;
        },
        [f, fs] as const,
      );
      if (!livre) {
        pulos.tapado++;
        continue;
      }
      if (!fotoTirada) {
        await foto(page, 'obra-dentro');
        fotoTirada = true;
      }
      const previsto = await page.evaluate((t) => window.__brumaluz!.preverToque!(t.x, t.y), t);
      const colocados0 = await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0);
      await page.touchscreen.tap(t.x, t.y);
      await page.waitForTimeout(350);
      const certo = (await bloco(page, [f.x, f.y, f.z])) === f.bloco;
      lista.push({ f: [f.x, f.y, f.z], certo });
      if (!certo) {
        const depois: F[] = await page.evaluate(() =>
          (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((g) => g.canteiro === 1),
        );
        const cheio = fs.filter((g) => !depois.some((d) => d.x === g.x && d.y === g.y && d.z === g.z));
        const perto = await page.evaluate(
          (f) =>
            (window.__brumaluz!.criaturas?.() ?? [])
              .filter((c) => Math.hypot(c.x - f.x - 0.5, c.z - f.z - 0.5) < 2.5 && Math.abs(c.y - f.y) < 3)
              .map((c) => `${c.tipo} ${c.x.toFixed(2)},${c.y.toFixed(2)},${c.z.toFixed(2)}`),
          f,
        );
        console.log(
          `  obra errou: ${[f.x, f.y, f.z]} colocou ${(await page.evaluate(() => window.__brumaluz!.obraColocados ?? 0)) - colocados0} abaixo ${await bloco(page, [f.x, f.y - 1, f.z])} encheu ${JSON.stringify(cheio)} previsto ${JSON.stringify(previsto)} perto ${JSON.stringify(perto)} eu ${JSON.stringify(await page.evaluate(() => window.__brumaluz!.posicao))}`,
        );
      }
      tocou = true;
      break;
    }
    if (!tocou) continue;
  }
  const certos = lista.filter((t) => t.certo).length;
  console.log(`obra: ${certos} de ${lista.length} no fantasma embaixo do dedo ${JSON.stringify(pulos)}`);
  await foto(page, 'obra-depois');
  gravar('obra', { toques: lista.length, certos, erros: lista.filter((t) => !t.certo) });
  await page.context().close();
  expect(lista.length).toBe(20);
  expect(certos).toBe(20);
});

test('no computador: o mouse travado gira, o clique age na mira do meio, com o pontinho; o controle também', async ({
  browser,
}) => {
  const page = await abrirMundo(browser, { id: 'pp-pc', tema: 'doce-reino', tamanho: 'pc' });
  await assentar(page);
  const c = await montarCampo(page);
  const [fx, fy, fz] = c;
  await tabuasNaMao(page);
  await ligar(page, true);
  await dentro(page);
  // o mouse travado (sem o travar de verdade do navegador, como em mineracao.spec.ts)
  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')!;
    Object.defineProperty(document, 'pointerLockElement', { configurable: true, get: () => canvas });
  });
  // arrastar gira (o movimento do mouse travado)
  const yaw0 = (await page.evaluate(() => window.__brumaluz!.rotacao!))[1];
  await page.evaluate(() => document.dispatchEvent(new MouseEvent('mousemove', { movementX: 120, movementY: 0 })));
  await page.waitForTimeout(200);
  const yaw1 = (await page.evaluate(() => window.__brumaluz!.rotacao!))[1];
  expect(Math.abs(yaw1 - yaw0)).toBeGreaterThan(0.05);
  // o pontinho do meio (de dentro, no computador)
  const pontinho = await page.evaluate(() => {
    const m = document.querySelector('.hud .mira');
    if (!m) return null;
    const s = getComputedStyle(m, '::before');
    return { w: s.width, fundo: s.backgroundColor, visivel: getComputedStyle(m).display !== 'none' };
  });
  expect(pontinho?.visivel).toBe(true);
  expect(pontinho?.w).toBe('6px');
  // 10 cliques: a mira do meio passa pelo centro de uma face; o clique direito põe na célula dela
  const alvos: { ponto: C3; cel: C3 }[] = [];
  for (let dx = -2; dx <= 2; dx++) alvos.push({ ponto: [fx + dx + 0.5, fy, fz + 3.5], cel: [fx + dx, fy, fz + 3] });
  // (a parede a 5: no alcance da mira do meio, 5 dos olhos)
  for (let dx = -1; dx <= 1; dx++)
    for (const dy of [0, 1])
      if (alvos.length < 10)
        alvos.push({ ponto: [fx + dx + 0.5, fy + dy + 0.5, fz + 5], cel: [fx + dx, fy + dy, fz + 4] });
  const cliques: { cel: C3; certo: boolean; centroPx: number; contorno: unknown }[] = [];
  for (const a of alvos) {
    await page.evaluate((p) => window.__brumaluz!.mirarPonto!(p[0], p[1], p[2]), a.ponto);
    await page.waitForTimeout(250);
    // conferência independente: o ponto da face está no meio da tela
    const centroPx = await page.evaluate((p) => {
      const t = window.__brumaluz!.telaDoPonto!(p[0], p[1], p[2]);
      return t ? Math.hypot(t.x - innerWidth / 2, t.y - innerHeight / 2) : 999;
    }, a.ponto);
    const contorno = await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.mira());
    if (cliques.length === 0) await foto(page, 'computador-mira-do-meio');
    await page.evaluate(() =>
      document.querySelector('canvas')!.dispatchEvent(new MouseEvent('mousedown', { button: 2, bubbles: true })),
    );
    await page.waitForTimeout(450);
    cliques.push({ cel: a.cel, certo: (await bloco(page, a.cel)) === Bloco.TABUAS, centroPx, contorno });
    // (o bloco sai: a cena fica igual para o próximo clique)
    await page.evaluate((c) => window.__brumaluz!.definirBloco!(c[0], c[1], c[2], 0), a.cel);
    await page.waitForTimeout(150);
  }
  // o controle de videogame: a mira do meio também (o botão de usar, sem dedo)
  await page.evaluate((p) => window.__brumaluz!.mirarPonto!(p[0], p[1], p[2]), [fx + 2.5, fy, fz + 2.5] as C3);
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.usar());
  await page.waitForTimeout(450);
  const controle = (await bloco(page, [fx + 2, fy, fz + 2])) === Bloco.TABUAS;
  await foto(page, 'computador-depois');
  gravar('computador', { cliques, controle, pontinho });
  await page.context().close();
  for (const k of cliques) {
    expect(k.centroPx).toBeLessThan(3);
    expect(k.certo, `clique em ${k.cel}`).toBe(true);
    expect(k.contorno).toEqual(k.cel);
  }
  expect(controle).toBe(true);
});

test('os lugares com câmera própria: a primeira pessoa sai sozinha e volta depois', async ({ browser }) => {
  const page = await abrirMundo(browser, { id: 'pp-lugares', tema: 'vila-neon', tamanho: 'empe' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__brumaluz!.vila?.() && !!window.__brumaluz!.vilaParque, undefined, {
    timeout: 30_000,
  });
  const vila = await page.evaluate(() => {
    const v = window.__brumaluz!.vila!()!;
    return { h: v.h, casa: v.pontos.casa.porta, carrossel: v.pontos.parque.carrossel };
  });
  const resultado: Record<string, string | null> = {};
  /** Sai sozinha (a fração vai a 0 e o lugar é este) e volta para dentro depois. */
  async function confere(nome: string, entrar: () => Promise<void>, sair: () => Promise<void>) {
    await dentro(page);
    await entrar();
    await fora(page);
    resultado[nome] = await propria(page);
    expect(await ligada(page), `${nome}: a escolha continua`).toBe(true);
    await foto(page, `lugar-${nome}`);
    await sair();
    await dentro(page);
    expect(await propria(page)).toBeNull();
  }
  // longe da casa e do parque, num lugar aberto da praça
  await page.evaluate(
    ([x, z, beira, h]) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x, z - beira - 4, h + 1.2);
      e.apontar!(0, 0.3);
    },
    [vila.carrossel.x, vila.carrossel.z, vila.carrossel.beira, vila.h] as const,
  );
  await page.waitForTimeout(1500);
  // a bicicletinha comprada antes (comprar volta para fora; aqui ainda não ligou)
  await page.evaluate(() => {
    const a = (
      window as unknown as {
        __almaCrianca: {
          aplicarGanho(g: { moedas: number; xp: number; pontos: Record<string, number> }): unknown;
          comprarPremium(id: string): { ok: boolean };
        };
      }
    ).__almaCrianca;
    a.aplicarGanho({ moedas: 300, xp: 0, pontos: {} });
    a.comprarPremium('bicicletinha');
  });
  await page.waitForFunction(() => window.__brumaluz!.personagem!.montado!() === 'bicicletinha');
  await page.evaluate(() => window.__brumaluz!.personagem!.descer!());
  await page.waitForFunction(() => window.__brumaluz!.personagem!.montado!() === null);
  await ligar(page, true);

  // o modo foto
  await confere(
    'foto',
    () => page.evaluate(() => void window.__brumaluz!.modoFoto!.alternar()),
    () => page.evaluate(() => void window.__brumaluz!.modoFoto!.alternar()),
  );
  // montada
  await confere(
    'montada',
    () => page.evaluate(() => void window.__brumaluz!.personagem!.montar!()),
    () => page.evaluate(() => void window.__brumaluz!.personagem!.descer!()),
  );
  // dormindo (o núcleo avisa o sono e o acordar; aqui, os mesmos avisos da cena)
  await confere(
    'dormindo',
    () => page.evaluate(() => void window.dispatchEvent(new CustomEvent('brumaluz:sono', { detail: { dormiu: true } }))),
    () => page.evaluate(() => void window.dispatchEvent(new CustomEvent('brumaluz:acordou'))),
  );
  // sentada no carrossel
  await confere(
    'parque',
    async () => {
      // de frente para o carrossel, o toque nele (como em montar-036)
      await page.evaluate(
        ([x, z, beira, h]) => {
          const e = window.__brumaluz!;
          e.teleportar!(x, z - beira - 4, h + 1.2);
          e.apontar!(0, -0.05);
        },
        [vila.carrossel.x, vila.carrossel.z, vila.carrossel.beira, vila.h] as const,
      );
      await assentar(page, 9);
      const t = await page.evaluate(
        () => (window as unknown as { __vila: { parque(): { sentar: { t: { x: number; y: number } | null }[] } } }).__vila.parque().sentar[1].t,
      );
      expect(t, 'o carrossel na tela').not.toBeNull();
      await page.touchscreen.tap(t!.x, t!.y);
      await page.waitForFunction(() => window.__brumaluz!.vilaParque!.sentado()?.b === 'carrossel', undefined, {
        timeout: 20_000,
      });
    },
    async () => {
      await page.evaluate(() => window.__brumaluz!.vilaParque!.sair());
      await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado(), undefined, { timeout: 20_000 });
    },
  );
  // a Casa anos 80: entra pela porta andando e sai de novo
  await confere(
    'casa',
    async () => {
      await page.evaluate(
        ([porta, h]) => {
          const e = window.__brumaluz!;
          e.voar?.(false);
          e.teleportar!(porta[0], porta[2] + 4.5, h + 1.2);
          e.apontar!(Math.PI, 0.3);
        },
        [vila.casa, vila.h] as const,
      );
      await assentar(page, 9);
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
      await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.dentro(), undefined, { timeout: 15_000 });
      await page.waitForTimeout(700);
      await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
    },
    async () => {
      await page.evaluate(
        ([porta, h]) => {
          const e = window.__brumaluz!;
          e.teleportar!(porta[0], porta[2] + 6, h + 1.2);
        },
        [vila.casa, vila.h] as const,
      );
      await page.waitForFunction(() => !window.__brumaluz!.vilaCasa!.dentro(), undefined, { timeout: 15_000 });
    },
  );
  gravar('lugares', resultado);
  await page.context().close();
  expect(resultado).toEqual({ foto: 'foto', montada: 'montada', dormindo: 'dormindo', parque: 'parque', casa: 'casa' });
});

/**
 * Defeito achado pelo dono no ar (26 nov): de dentro, com o machadinho na mão, ligar o voo fazia a
 * mão e o item sumirem, e eles só voltavam ao pousar. A mão fica à vista voando, pulando e caindo.
 */
for (const [nome, tamanho, tela] of [
  ['empe', 'empe', null],
  // (um celular em pé menor: com o botão de descer, a mão não achava lugar e sumia o voo inteiro)
  ['empe-pequeno', 'empe', { width: 360, height: 640 }],
  ['deitado', 'deitado', null],
  ['pc', 'pc', null],
] as const)
  test(`voando, pulando e caindo de dentro, a mão e o machadinho continuam à vista (${nome})`, async ({ browser }) => {
    const page = await abrirMundo(browser, { id: `pp-voo-${nome}`, tema: 'doce-reino', tamanho });
    if (tela) await page.setViewportSize(tela);
    await assentar(page);
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.inventario!.definir(0, { item: 'machado_pedra', qtd: 1 });
      e.selecionarSlot!(0);
    });
    await ligar(page, true);
    await dentro(page);
    await olhar(page, 0.6, 0.1);
    /** A mão (peso) e o tamanho dela na tela, quadro a quadro, por `ms`. */
    const amostrar = (ms: number) =>
      page.evaluate(
        (ms) =>
          new Promise<{ menor: number; maoPx: number; quadros: number }>((ok) => {
            const pp = window.__brumaluz!.primeiraPessoa! as unknown as {
              maos(): { direita: number };
              tela(): { maoPx: number };
            };
            const t0 = performance.now();
            let menor = 1;
            let quadros = 0;
            const f = () => {
              menor = Math.min(menor, pp.maos().direita);
              quadros++;
              if (performance.now() - t0 < ms) requestAnimationFrame(f);
              else ok({ menor, maoPx: pp.tela().maoPx, quadros });
            };
            requestAnimationFrame(f);
          }),
        ms,
      );
    await page.waitForTimeout(1200);
    const noChao = await amostrar(600);
    const y0 = await page.evaluate(() => window.__brumaluz!.posicao![1]);
    // voando como a criança: dois toques no pulo ligam o voo, segurar sobe (o botão de descer
    // aparece no celular), e anda para a frente no ar
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
    const subindo = amostrar(2500);
    await page.keyboard.down('Space');
    await page.waitForTimeout(900);
    await page.keyboard.up('Space');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(900);
    await page.keyboard.up('KeyW');
    const voando = await subindo;
    const subiu = (await page.evaluate(() => window.__brumaluz!.posicao![1])) - y0;
    const descer = await page.evaluate(() => {
      const b = document.querySelector<HTMLElement>('.toque .descer');
      return b ? !b.hidden && b.getBoundingClientRect().width > 0 : null;
    });
    if (tamanho === 'empe') {
      mkdirSync('capturas-037/voo', { recursive: true });
      await page.screenshot({ path: `capturas-037/voo/${nome === 'empe' ? 'em-pe' : nome}-voando-machadinho.png` });
    }
    // caindo: o voo desliga lá no alto
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      e.voar!(false);
      e.teleportar!(x, z, y - 1.62 + 4);
    });
    const caindo = await amostrar(1500);
    // pulando, no chão
    await page.waitForTimeout(800);
    const pulando = await page.evaluate(
      () =>
        new Promise<number>((ok) => {
          const e = window.__brumaluz!;
          const pp = e.primeiraPessoa! as unknown as { maos(): { direita: number } };
          e.controleDireto!.tecla?.('pular', true);
          const t0 = performance.now();
          let menor = 1;
          const f = () => {
            menor = Math.min(menor, pp.maos().direita);
            if (performance.now() - t0 > 250) e.controleDireto!.tecla?.('pular', false);
            if (performance.now() - t0 < 1200) requestAnimationFrame(f);
            else ok(menor);
          };
          requestAnimationFrame(f);
        }),
    );
    const medida = { noChao, voando, subiu, descer, caindo, pulando };
    console.log(`voo ${nome}`, JSON.stringify(medida));
    mkdirSync('capturas-037/voo', { recursive: true });
    writeFileSync(`capturas-037/voo/medidas-${nome}.json`, JSON.stringify(medida, null, 1));
    expect(noChao.menor).toBeGreaterThan(0.9);
    expect(subiu).toBeGreaterThan(1);
    expect(voando.menor).toBeGreaterThan(0.9);
    expect(voando.maoPx).toBeGreaterThan(0);
    expect(caindo.menor).toBeGreaterThan(0.9);
    expect(pulando).toBeGreaterThan(0.9);
    await page.context().close();
  });

test('desmaiada: a primeira pessoa sai e volta quando ela renasce', async ({ browser }) => {
  const page = await abrirMundo(browser, {
    id: 'pp-desmaio',
    tema: 'doce-reino',
    tamanho: 'empe',
    modo: 'sobrevivencia',
  });
  await assentar(page);
  await ligar(page, true);
  await dentro(page);
  const [x, y, z] = await page.evaluate(() => window.__brumaluz!.posicao!);
  await page.evaluate(([x, y, z]) => window.__brumaluz!.teleportar!(x, z, y + 25), [x, y, z] as const);
  await page.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.propria() === 'desmaiada', undefined, {
    timeout: 30_000,
  });
  await fora(page);
  await foto(page, 'lugar-desmaiada');
  await page.evaluate(() => document.querySelector<HTMLElement>('[data-renascer]')!.click());
  await dentro(page);
  expect(await propria(page)).toBeNull();
  expect(await ligada(page)).toBe(true);
  await page.context().close();
});
