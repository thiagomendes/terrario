import { mkdirSync, writeFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { abrirMundo, assentar, type Tamanho } from './guia-palco';
import { abrirRoleta, rolarAte, tocarNoMeio } from './roleta-palco';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { Bloco } from '../src/world/blocks';

/**
 * Spec 037 (T08): as fotos do portão visual da primeira pessoa, com a câmera de verdade (T03) e
 * o braço (T04). Fora da suíte: só com CAPTURAS_037 (t08 = as fotos nas três telas; extras = a
 * roda, a volta, as recusas e a parede; video = o vídeo em pé). Fotos em capturas-037/t08/.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e CAPTURAS_037=t08,extras,video" \
 *     scripts/e2e-gpu.sh e2e/capturas-037.spec.ts --workers 1 --trace off
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.CAPTURAS_037 ?? '').split(',').filter(Boolean);
const PASTA = 'capturas-037/t08';
test.skip(!QUAL.length, 'fotos da 037 só com CAPTURAS_037');
test.describe.configure({ mode: 'serial' });
test.setTimeout(1_500_000);

const notas: Record<string, unknown> = {};
const nota = (k: string, v: unknown) => {
  notas[k] = v;
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(`${PASTA}/notas.json`, JSON.stringify(notas, null, 1));
};
const foto = (p: Page, nome: string) => p.screenshot({ path: `${PASTA}/${nome}.png` });
const ligar = (p: Page, sim: boolean) => p.evaluate((s) => window.__brumaluz!.primeiraPessoa!.ligar(s), sim);
const dentro = (p: Page) => p.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.fracao() === 1, undefined, { timeout: 10_000 });
const fora = (p: Page) => p.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.fracao() === 0, undefined, { timeout: 10_000 });
const olhar = (p: Page, yaw: number, pitch: number) =>
  p.evaluate(([y, pi]) => window.__brumaluz!.apontar!(y, pi), [yaw, pitch] as const);
const naMao = (p: Page, item: string | null, qtd = 1) =>
  p.evaluate(
    ([item, qtd]) => {
      const e = window.__brumaluz!;
      e.inventario!.definir(5, item ? { item: item as string, qtd: qtd as number } : null);
      e.selecionarSlot!(5);
    },
    [item, qtd] as const,
  );
/** As peças acesas na mão da primeira pessoa (o que se vê segurando). */
const pecasNaMao = (p: Page) =>
  p.evaluate(() => {
    const s = window.__brumaluz!.cenaBabylon!();
    const pega = s.getTransformNodeByName('pp-braco-pega');
    const osso = s.getTransformNodeByName('pp-braco-osso');
    return {
      pega: pega ? pega.getChildMeshes(false).filter((m) => m.isEnabled() && m.isVisible).map((m) => m.name) : null,
      braco: osso ? osso.getChildMeshes(false).filter((m) => m.isEnabled() && m.isVisible).length : -1,
    };
  });
const hora = (p: Page, h: number) =>
  p.evaluate((h) => {
    const e = window.__brumaluz!;
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    e.pausarDia = true;
    e.hora = h;
    e.definirClima?.('limpo');
  }, h);

async function tentar(nome: string, f: () => Promise<void>) {
  try {
    await f();
  } catch (err) {
    console.log(`falhou ${nome}: ${String(err).slice(0, 300)}`);
    nota(`erro-${nome}`, String(err).slice(0, 300));
  }
}

const TELAS: [Tamanho, string][] = [
  ['empe', 'em-pe'],
  ['deitado', 'deitado'],
  ['pc', 'computador'],
];

test('T08: a primeira pessoa nas três telas, de dia e de noite', async ({ browser }) => {
  test.skip(!QUAL.includes('t08'));
  mkdirSync(PASTA, { recursive: true });
  for (const [tam, nome] of TELAS)
    for (const [quando, h] of [
      ['dia', 0.42],
      ['noite', 0.95],
    ] as const) {
      const page = await abrirMundo(browser, { id: `t08-${nome}-${quando}`, tema: 'cidade-grande', tamanho: tam });
      await hora(page, h);
      await assentar(page, 20);
      // a colher do pedreiro chega perto do canteiro
      await page
        .waitForFunction(() => (window.__brumaluz!.colherRecebida ?? 0) > 0, undefined, { timeout: 30_000 })
        .catch(() => undefined);
      const pre = `${nome}-${quando}`;
      // 1. a obra: chega perto de um fantasma, de fora, e entra
      await tentar(`${pre}-obra`, async () => {
        const f = await page.evaluate(() => {
          const e = window.__brumaluz!;
          const fs = (e.fantasmasPerto?.() ?? []).filter((g) => g.canteiro === 1);
          return fs[0] ?? null;
        });
        if (!f) throw new Error('sem fantasma');
        await page.evaluate((f) => {
          const e = window.__brumaluz!;
          e.voar?.(false);
          e.teleportar!(f.x + 0.5, f.z - 3.5);
        }, f);
        await page.waitForTimeout(1200);
        const i = await page.evaluate(() => {
          const e = window.__brumaluz!;
          const inv = e.inventario as unknown as { obter(i: number): { item: string } | null };
          for (let k = 0; k < 9; k++) if (inv.obter(k)?.item === 'colher_pedreiro') return k;
          return -1;
        });
        if (i >= 0) await page.evaluate((k) => window.__brumaluz!.selecionarSlot!(k), i);
        else await naMao(page, `bloco:${f.bloco}`, 16);
        await ligar(page, true);
        await dentro(page);
        await page.evaluate((f) => window.__brumaluz!.mirarPonto!(f.x + 0.5, f.y + 0.5, f.z + 0.5), f);
        await page.waitForTimeout(900);
        const naMira = await page.evaluate(() => !!window.__brumaluz!.fantasmaNaMira?.());
        nota(`${pre}-obra`, { naMira, mao: await pecasNaMao(page), colher: i >= 0 });
        await foto(page, `${pre}-bloco-na-obra`);
      });
      // 2. a mão vazia, olhando para a frente
      await tentar(`${pre}-mao-vazia`, async () => {
        await naMao(page, null);
        await olhar(page, 0.6, 0.1);
        await page.waitForTimeout(900);
        await foto(page, `${pre}-mao-vazia`);
      });
      // 3. a picareta no meio do golpe (no chão logo na frente)
      await tentar(`${pre}-picareta`, async () => {
        await naMao(page, 'picareta_pedra');
        await olhar(page, 0.6, 0.55);
        await page.waitForTimeout(900);
        await page.evaluate(() => {
          const c = window.__brumaluz!.controleDireto!;
          c.mirar(innerWidth * 0.5, innerHeight * 0.6);
          c.quebrar(true);
        });
        await page.waitForTimeout(330);
        await foto(page, `${pre}-picareta-golpe`);
        await page.evaluate(() => {
          const c = window.__brumaluz!.controleDireto!;
          c.quebrar(false);
          c.soltarMira();
        });
      });
      // 4. comendo a pipoca
      await tentar(`${pre}-pipoca`, async () => {
        await naMao(page, 'pipoca', 3);
        await olhar(page, 0.6, 0.1);
        await page.waitForTimeout(900);
        const antes = await pecasNaMao(page);
        await page.evaluate(() => window.__brumaluz!.comer!());
        await page.waitForTimeout(700);
        const comendo = await pecasNaMao(page);
        await foto(page, `${pre}-pipoca-comendo`);
        nota(`${pre}-pipoca`, { antes, comendo });
      });
      // 5. o tesouro da mão (a varinha; no computador e deitado, o guarda-chuva e a pipa)
      await tentar(`${pre}-tesouro`, async () => {
        const id = nome === 'em-pe' ? 'varinha-bolhas' : nome === 'deitado' ? 'guarda-chuva-gotinhas' : 'pipa-lacinhos';
        await naMao(page, null);
        const vestiu = await page.evaluate((id) => {
          const a = (window as unknown as {
            __almaCrianca: {
              aplicarGanho(g: unknown): unknown;
              comprarPremium(id: string): { ok: boolean };
              vestirPremium(id: string, v: boolean): boolean;
            };
          }).__almaCrianca;
          a.aplicarGanho({ moedas: 500, xp: 0, pontos: {} });
          a.comprarPremium(id);
          return a.vestirPremium(id, true);
        }, id);
        await page.waitForTimeout(400);
        // comprar ou vestir na lojinha volta para fora (T03): entra de novo
        await ligar(page, true);
        await dentro(page);
        // (para o lado da rua, longe dos moradores da calçada)
        await olhar(page, 0.6 + Math.PI / 2, 0.1);
        await page.waitForTimeout(1500);
        nota(`${pre}-tesouro`, { id, vestiu, mao: await pecasNaMao(page) });
        await foto(page, `${pre}-tesouro-${id}`);
      });
      await page.context().close();
    }
});

test('T08: a roda, a volta, as recusas e a parede (em pé, de dia)', async ({ browser }) => {
  test.skip(!QUAL.includes('extras'));
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, { id: 't08-extras', tema: 'doce-reino', tamanho: 'empe' });
  await hora(page, 0.42);
  await assentar(page, 16);
  // uma plataforma de pedra lisa com o ar limpo em cima
  const { cx, cz, Y } = await page.evaluate((pedra) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    let alto = 0;
    for (let dx = -8; dx <= 8; dx++)
      for (let dz = -8; dz <= 8; dz++) {
        let y = 120;
        while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
        alto = Math.max(alto, y);
      }
    const Y = alto + 4;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -7; dx <= 7; dx++)
      for (let dz = -7; dz <= 7; dz++) {
        lote.push({ x: cx + dx, y: Y, z: cz + dz, v: pedra });
        for (let dy = 1; dy <= 5; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
      }
    e.editarLote!(lote);
    return { cx, cz, Y };
  }, Bloco.PEDRA_LISA);
  await page.waitForTimeout(2500);
  await page.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x: cx + 0.5, y: Y + 1, z: cz - 2.5 });
  await naMao(page, `bloco:${Bloco.TABUAS}`, 64);
  await olhar(page, 0, 0.3);
  await page.waitForTimeout(1200);

  await tentar('roda', async () => {
    await abrirRoleta(page);
    await rolarAte(page, 'ver-de-dentro');
    await page.waitForTimeout(500);
    await foto(page, 'em-pe-dia-roda-ver-de-dentro');
    await tocarNoMeio(page);
    await dentro(page);
    await page.waitForTimeout(600);
    await abrirRoleta(page);
    await rolarAte(page, 'ver-de-fora');
    await page.waitForTimeout(500);
    await foto(page, 'em-pe-dia-roda-ver-de-fora');
    await tocarNoMeio(page);
    await fora(page);
  });
  // a volta para a terceira pessoa com o bloco na mão
  await tentar('volta', async () => {
    await ligar(page, true);
    await dentro(page);
    await page.waitForTimeout(800);
    await ligar(page, false);
    await fora(page);
    await page.waitForTimeout(1000);
    nota('volta', { mao: await pecasNaMao(page) });
    await foto(page, 'em-pe-dia-volta-para-terceira');
  });
  // as recusas, de dentro: em cima de um amigo e no ar (o "não" curtinho no meio)
  await tentar('recusas', async () => {
    await ligar(page, true);
    await dentro(page);
    // (o amigo de teste da tela não existe no núcleo e não segura o bloco: quem segura aqui é
    // um bicho de verdade, o cervo; o amigo de verdade é provado na nuvem, no construir-037)
    const amigo = { x: cx + 0.5, y: Y + 1, z: cz + 0.5 };
    await page.evaluate((a) => window.__brumaluz!.invocar!('cervo', a.x, a.y, a.z), amigo);
    await page.waitForTimeout(1500);
    const naoEm = async (nomeFoto: string, b: { x: number; y: number; z: number }) => {
      let ok = false;
      for (let i = 0; i < 30 && !ok; i++) {
        ok = await page.evaluate((b) => window.__brumaluz!.mirarBloco!(b.x, b.y, b.z, { x: 0, y: 1, z: 0 }), b);
        if (!ok) await page.waitForTimeout(300);
      }
      await page.waitForTimeout(400);
      const r = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
      await page.waitForTimeout(120);
      await foto(page, nomeFoto);
      return { mirou: ok, colocou: r };
    };
    // o cervo anda: mira a célula onde ele está no mesmo instante do toque (até 10 tentativas)
    let emCimaDoAmigo: unknown = { achou: false };
    for (let t = 0; t < 10; t++) {
      // (de dentro, a mira no chão debaixo do cervo pega o cervo; na 5ª tentativa, de fora)
      if (t === 5) {
        await ligar(page, false);
        await fora(page);
      }
      const r = await page.evaluate((Y) => {
        const e = window.__brumaluz!;
        const c = e.criaturas!().find((b) => b.tipo === 'cervo');
        if (!c) return { achou: false };
        const b = { x: Math.floor(c.x), y: Y, z: Math.floor(c.z) };
        const mirou = e.mirarBloco!(b.x, b.y, b.z, { x: 0, y: 1, z: 0 });
        const ali = e.criaturas!().some((d) => d.tipo === 'cervo' && Math.floor(d.x) === b.x && Math.floor(d.z) === b.z);
        if (!mirou || !ali) return { achou: true, mirou, ali };
        return { achou: true, mirou, ali, colocou: e.interagir!('colocar') };
      }, Y);
      emCimaDoAmigo = r;
      if ('colocou' in r) {
        await page.waitForTimeout(120);
        await foto(page, `em-pe-dia-recusa-em-cima-do-cervo${t >= 5 ? '-de-fora' : ''}`);
        break;
      }
      await page.waitForTimeout(500);
    }
    // sem a mira no cervo: o bloco em cima dela mesma (o corpo dela também segura o bloco)
    if (!('colocou' in (emCimaDoAmigo as object))) {
      const r = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [px, py, pz] = e.jogadorPes!();
        const b = { x: Math.floor(px), y: Math.floor(py) - 1, z: Math.floor(pz) };
        const mirou = e.mirarBloco!(b.x, b.y, b.z, { x: 0, y: 1, z: 0 });
        return mirou ? { mirou, colocou: e.interagir!('colocar') } : { mirou };
      });
      await page.waitForTimeout(120);
      if (r.mirou) await foto(page, 'em-pe-dia-recusa-em-cima-dela-mesma-de-fora');
      nota('recusaEmCimaDelaMesma', r);
    }
    emCimaDoAmigo = { ...(emCimaDoAmigo as object), deFora: !(await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.ligada())) };
    await ligar(page, true);
    await dentro(page);
    // no ar: em cima de uma tocha (que não apoia)
    const T = { x: cx + 1, y: Y + 1, z: cz };
    await page.evaluate(({ t, tocha }) => window.__brumaluz!.editarLote!([{ ...t, v: tocha }]), { t: T, tocha: Bloco.TOCHA });
    await page.waitForTimeout(800);
    const noAr = await naoEm('em-pe-dia-recusa-no-ar', T);
    nota('recusas', { emCimaDoAmigo, noAr });
  });
  // encostada na parede, de dentro, olhando para ela e de lado
  await tentar('parede', async () => {
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -3; dx <= 3; dx++) for (let dy = 1; dy <= 3; dy++) lote.push({ x: cx - 2 + dx, y: Y + dy, z: cz + 4, v: Bloco.TABUAS });
    await page.evaluate((l) => window.__brumaluz!.editarLote!(l), lote);
    await page.waitForTimeout(800);
    await page.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x: cx - 1.5, y: Y + 1, z: cz + 3.62 });
    await ligar(page, true);
    await dentro(page);
    await olhar(page, 0, 0.05);
    await page.waitForTimeout(900);
    await foto(page, 'em-pe-dia-encostada-na-parede');
    await olhar(page, 0.9, 0.05);
    await page.waitForTimeout(700);
    await foto(page, 'em-pe-dia-encostada-na-parede-de-lado');
    nota('parede', { camera: await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.camera()) });
  });
  await page.context().close();
});

test('T08: o vídeo em pé (entrar pelo olhinho, andar, pôr 3, quebrar 1 e sair)', async ({ browser }) => {
  test.skip(!QUAL.includes('video'));
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, { id: 't08-video', tema: 'doce-reino', tamanho: 'empe' });
  await hora(page, 0.42);
  await assentar(page, 16);
  await naMao(page, `bloco:${Bloco.TABUAS}`, 64);
  await page.evaluate((b) => window.__brumaluz!.inventario!.definir(6, { item: 'picareta_pedra', qtd: 1 }), Bloco.TABUAS);
  await olhar(page, 0.6, 0.3);
  await page.waitForTimeout(800);
  await comecarGravacao(page);
  await page.waitForTimeout(500);
  await abrirRoleta(page);
  await rolarAte(page, 'ver-de-dentro');
  await page.waitForTimeout(400);
  await tocarNoMeio(page);
  await dentro(page);
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0.6, 0));
  await page.waitForTimeout(1400);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await page.waitForTimeout(500);
  for (const [fx, fy] of [
    [0.45, 0.66],
    [0.58, 0.64],
    [0.5, 0.56],
  ] as const) {
    await page.touchscreen.tap(Math.round(390 * fx), Math.round(844 * fy));
    await page.waitForTimeout(900);
  }
  await page.evaluate(() => window.__brumaluz!.selecionarSlot!(6));
  await page.waitForTimeout(900);
  await page.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.mirar(innerWidth * 0.5, innerHeight * 0.56);
    c.quebrar(true);
  });
  await page.waitForTimeout(1800);
  await page.evaluate(() => {
    const c = window.__brumaluz!.controleDireto!;
    c.quebrar(false);
    c.soltarMira();
  });
  await page.waitForTimeout(600);
  await abrirRoleta(page);
  await rolarAte(page, 'ver-de-fora');
  await page.waitForTimeout(400);
  await tocarNoMeio(page);
  await fora(page);
  await page.waitForTimeout(1200);
  await pararGravacao(page, `${PASTA}/em-pe-dia-video.webm`);
  nota('video', { golpes: await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.ritmo?.()) });
  await page.context().close();
});
