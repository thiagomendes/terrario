import { mkdirSync, writeFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { abrirMundo, assentar, type Tamanho } from './guia-palco';
import { abrirRoleta, rolarAte, tocarNoMeio } from './roleta-palco';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { Bloco } from '../src/world/blocks';

/**
 * Spec 037 (T08): as fotos do portão visual da primeira pessoa, com a câmera de verdade (T03) e
 * o braço (T04). Fora da suíte: só com CAPTURAS_037 (t08 = as fotos nas três telas; extras = a
 * roda, a volta, as recusas e a parede; video = o vídeo em pé; interface = os retângulos da
 * interface nas três telas). Fotos em capturas-037/t08b/ (os consertos do portão; as da primeira
 * rodada ficam em t08/, e CAPTURAS_037_PASTA escolhe outra pasta).
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp -e CAPTURAS_037=t08,extras,video" \
 *     scripts/e2e-gpu.sh e2e/capturas-037.spec.ts --workers 1 --trace off
 */
declare const process: { env: Record<string, string | undefined> };
const QUAL = (process.env.CAPTURAS_037 ?? '').split(',').filter(Boolean);
// (o portão barrou a t08: os consertos saem em t08b; CAPTURAS_037_PASTA escolhe outra)
const PASTA = process.env.CAPTURAS_037_PASTA ?? 'capturas-037/t08c';
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
/**
 * Portão, 5ª rodada: o que está à vista perto dos olhos (até 6 blocos), fora o chão e as paredes
 * de blocos: o nome, a visibilidade e a distância. `meio` lista as peças meio transparentes
 * (visibilidade entre 0 e 1), que depois do sumiço não podem sobrar.
 */
const vistosPerto = (p: Page) =>
  p.evaluate(() => {
    const s = window.__brumaluz!.cenaBabylon!();
    const cam = s.activeCamera!.globalPosition;
    const perto: string[] = [];
    const meio: string[] = [];
    for (const m of s.meshes) {
      if (!m.isEnabled() || !m.isVisible || m.visibility <= 0) continue;
      if (/^(chunk|agua|ceu|nuvem|pp-)/.test(m.name)) continue;
      const c = m.getBoundingInfo().boundingSphere.centerWorld;
      const d = Math.hypot(c.x - cam.x, c.y - cam.y, c.z - cam.z);
      if (d > 6) continue;
      const v = `${m.name} vis=${m.visibility.toFixed(2)} d=${d.toFixed(1)} y=${c.y.toFixed(1)}`;
      if (m.visibility < 1) meio.push(v);
      if (/morador|criatura|veic|prop|caixa|placa|balao/.test(m.name) || m.visibility < 1) perto.push(v);
    }
    return { perto: perto.slice(0, 60), meio };
  });
const hora = (p: Page, h: number) =>
  p.evaluate((h) => {
    const e = window.__brumaluz!;
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    e.pausarDia = true;
    e.hora = h;
    e.definirClima?.('limpo');
  }, h);

/** Só as cenas cujo nome tem uma destas palavras (CAPTURAS_037_SO=obra,colado,pipoca); vazio: todas. */
const SO = (process.env.CAPTURAS_037_SO ?? '').split(',').filter(Boolean);
async function tentar(nome: string, f: () => Promise<void>) {
  if (SO.length && !SO.some((s) => nome.includes(s))) return;
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
        // de perto: o meio da tela, onde fica a marca do próximo bloco
        const vp = page.viewportSize()!;
        await page.screenshot({
          path: `${PASTA}/${pre}-bloco-na-obra-perto.png`,
          clip: { x: Math.round(vp.width * 0.25), y: Math.round(vp.height * 0.2), width: Math.round(vp.width * 0.5), height: Math.round(vp.height * 0.5) },
        });
      });
      // 1b. colada num fantasma da obra (na altura dos olhos), olhando por ele
      await tentar(`${pre}-fantasma-colado`, async () => {
        const g = await page.evaluate(() => {
          const e = window.__brumaluz!;
          const [, py] = e.jogadorPes!();
          const fs = e.fantasmasPerto?.() ?? [];
          // um fantasma na altura dos olhos, com chão livre na frente dele (do lado de -z)
          return fs.find((f) => f.y === Math.floor(py) + 1 && !e.bloco!(f.x, f.y - 1, f.z - 1) && !e.bloco!(f.x, f.y, f.z - 1)) ?? null;
        });
        if (!g) throw new Error('sem fantasma na altura dos olhos');
        await page.evaluate((g) => window.__brumaluz!.teleportar!(g.x + 0.5, g.z - 0.32), g);
        await page.waitForTimeout(900);
        await page.evaluate((g) => window.__brumaluz!.mirarPonto!(g.x + 0.5, g.y + 0.62, g.z + 4), g);
        await page.waitForTimeout(900);
        const cam = await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.camera());
        nota(`${pre}-fantasma-colado`, {
          g,
          cam,
          naMira: await page.evaluate(() => window.__brumaluz!.fantasmaNaMira?.() ?? null),
          vistos: await vistosPerto(page),
        });
        await foto(page, `${pre}-fantasma-colado`);
        // e um passo para trás: os fantasmas da frente voltam inteiros
        await page.evaluate((g) => window.__brumaluz!.teleportar!(g.x + 0.5, g.z - 1.6), g);
        await page.waitForTimeout(900);
        await page.evaluate((g) => window.__brumaluz!.mirarPonto!(g.x + 0.5, g.y + 0.5, g.z + 0.5), g);
        await page.waitForTimeout(700);
        await foto(page, `${pre}-fantasma-um-passo-atras`);
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
      // 4. comendo a pipoca (de noite, antes, a mesma cena de fora: a luz do boneco perto do poste)
      await tentar(`${pre}-pipoca`, async () => {
        await naMao(page, 'pipoca', 3);
        await olhar(page, 0.6, 0.1);
        await page.waitForTimeout(900);
        if (quando === 'noite') {
          await ligar(page, false);
          await fora(page);
          await page.waitForTimeout(600);
          await foto(page, `${pre}-de-fora-pipoca-referencia`);
          await ligar(page, true);
          await dentro(page);
          await page.waitForTimeout(600);
        }
        const antes = await pecasNaMao(page);
        await page.evaluate(() => window.__brumaluz!.comer!());
        await page.waitForTimeout(700);
        const comendo = await pecasNaMao(page);
        await foto(page, `${pre}-pipoca-comendo`);
        nota(`${pre}-pipoca`, { antes, comendo, vistos: await vistosPerto(page) });
      });
      // 5. os tesouros da mão (a varinha, o guarda-chuva e a pipa), um de cada vez, sem item na barra
      // (a varinha por último: as bolhas que ela já soltou continuam no ar uns 3 a 4 s, como
      // bolhas de verdade, e apareciam na foto do tesouro seguinte)
      for (const id of ['guarda-chuva-gotinhas', 'pipa-lacinhos', 'varinha-bolhas'])
        await tentar(`${pre}-tesouro-${id}`, async () => {
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
        nota(`${pre}-tesouro-${id}`, {
          vestiu,
          mao: await pecasNaMao(page),
          tesouro: await page.evaluate(() => {
            const s = window.__brumaluz!.cenaBabylon!();
            const n = s.getTransformNodeByName('pp-tesouro');
            const g = s.getTransformNodeByName('pp-tesouro-mundo');
            const p = s.getTransformNodeByName('pp-pipa');
            const on = (x: typeof n) => (x ? x.getChildMeshes(false).filter((m) => m.isEnabled()).length : -1);
            return { naMao: on(n), guardaChuva: on(g), pipa: on(p), fio: !!s.getMeshByName('pp-pipa-fio')?.isEnabled() };
          }),
        });
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
      await foto(page, `${nomeFoto}-antes`);
      const t0 = Date.now();
      const r = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
      // o "não" dura 0,6 s: uma rajada de fotos pega os balanços (o tempo de cada uma vai nas notas)
      const tempos: number[] = [];
      for (let k = 1; k <= 5; k++) {
        tempos.push(Date.now() - t0);
        await foto(page, `${nomeFoto}-${k}`);
      }
      return { mirou: ok, colocou: r, tempos };
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
    // o "não" em vídeo: dois toques na tocha, com uma pausa entre eles
    await page.waitForTimeout(800);
    await comecarGravacao(page);
    await page.waitForTimeout(500);
    for (let k = 0; k < 2; k++) {
      await page.evaluate((b) => window.__brumaluz!.mirarBloco!(b.x, b.y, b.z, { x: 0, y: 1, z: 0 }), T);
      await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
      await page.waitForTimeout(1400);
    }
    await pararGravacao(page, `${PASTA}/em-pe-dia-recusa-no-ar.webm`);
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

/** T08c: a tela de fora num lugar aberto (Doce Reino, numa laje), nas três telas, de dia e de noite. */
test('T08c: a tela de fora num lugar aberto', async ({ browser }) => {
  test.skip(!QUAL.includes('defora'));
  mkdirSync(PASTA, { recursive: true });
  for (const [tam, nome] of TELAS)
    for (const [quando, h] of [
      ['dia', 0.42],
      ['noite', 0.95],
    ] as const) {
      const page = await abrirMundo(browser, { id: `t08c-fora-${nome}-${quando}`, tema: 'doce-reino', tamanho: tam });
      await hora(page, h);
      await assentar(page, 12);
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
        for (let dx = -9; dx <= 9; dx++)
          for (let dz = -9; dz <= 9; dz++) {
            lote.push({ x: cx + dx, y: Y, z: cz + dz, v: pedra });
            for (let dy = 1; dy <= 6; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
          }
        e.editarLote!(lote);
        return { cx, cz, Y };
      }, Bloco.PEDRA_LISA);
      await page.waitForTimeout(2000);
      await page.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x: cx + 0.5, y: Y + 1, z: cz + 0.5 });
      await naMao(page, `bloco:${Bloco.TABUAS}`, 16);
      await olhar(page, 0, 0.3);
      await page.waitForTimeout(2500);
      await foto(page, `${nome}-${quando}-de-fora`);
      await page.context().close();
    }
});

/**
 * T08c: a caixa de cada item da folha na tela, nas três telas, segurando, comendo (a comida) e no
 * meio do golpe (as ferramentas), em raios da mão a partir do meio dela: a régua do item inteiro
 * na tela da conta do ombro (`ITEM_CAIXA`, em `contaOmbro.ts`).
 */
test('T08c: a caixa dos itens da folha na tela (segurando, comendo e golpeando)', async ({ browser }) => {
  test.skip(!QUAL.includes('itens'));
  mkdirSync(PASTA, { recursive: true });
  const medidas: Record<string, unknown> = {};
  for (const [tam, nome] of TELAS) {
    const page = await abrirMundo(browser, { id: `t08c-itens-${nome}`, tema: 'doce-reino', tamanho: tam });
    await hora(page, 0.42);
    await assentar(page, 12);
    await ligar(page, true);
    await dentro(page);
    await olhar(page, 0, 0.15);
    await page.waitForTimeout(800);
    const todos = await page.evaluate(() => window.__brumaluz!.primeiraPessoa!.itens());
    const blocos = [7, 43, 9, 37, 56, 57, 59, 60, 61, 82, 98, 10];
    const lista = [
      ...blocos.map((b) => ({ id: `bloco:${b}`, tipo: 'bloco' })).filter((x) => todos.some((t) => t.id === x.id)),
      ...todos.filter((t) => t.tipo !== 'bloco'),
    ];
    const caixa = async () =>
      page.evaluate(() => {
        const t = window.__brumaluz!.primeiraPessoa!.tela();
        if (!t.item || !t.maoPx) return null;
        const r = t.maoPx / 2;
        const [mx, my] = t.mao;
        const [x0, y0, x1, y1] = t.item;
        return {
          px: t.item,
          mao: t.mao,
          r,
          // em raios da mão, a partir do meio dela (esquerda, cima, direita, baixo)
          rel: [(mx - x0) / r, (my - y0) / r, (x1 - mx) / r, (y1 - my) / r].map((v) => +v.toFixed(2)),
          dentro: x0 >= 0 && y0 >= 0 && x1 <= innerWidth && y1 <= innerHeight,
        };
      });
    const daTela: Record<string, unknown> = {};
    for (const it of lista) {
      const linha: Record<string, unknown> = {};
      await page.evaluate((id) => {
        const e = window.__brumaluz!;
        e.inventario!.definir(5, { item: id, qtd: 3 });
        e.selecionarSlot!(5);
      }, it.id);
      await page.waitForTimeout(650);
      linha.segurando = await caixa();
      if (it.tipo === 'comida') {
        await page.evaluate(() => window.__brumaluz!.comer!());
        for (const ms of [250, 300, 300]) {
          await page.waitForTimeout(ms);
          linha[`comendo${ms}`] = await caixa();
        }
        await page.waitForTimeout(900);
      }
      if (it.tipo === 'ferramenta') {
        await olhar(page, 0, 0.55);
        await page.waitForTimeout(300);
        await page.evaluate(() => {
          const c = window.__brumaluz!.controleDireto!;
          c.mirar(innerWidth * 0.5, innerHeight * 0.6);
          c.quebrar(true);
        });
        for (const ms of [120, 120, 120]) {
          await page.waitForTimeout(ms);
          linha[`golpe${ms}`] = await caixa();
        }
        await page.evaluate(() => {
          const c = window.__brumaluz!.controleDireto!;
          c.quebrar(false);
          c.soltarMira();
        });
        await olhar(page, 0, 0.15);
        await page.waitForTimeout(300);
      }
      daTela[it.id] = linha;
    }
    medidas[nome] = daTela;
    nota(`itens-${nome}`, daTela);
    await page.context().close();
  }
  writeFileSync(`${PASTA}/caixas-dos-itens.json`, JSON.stringify(medidas, null, 1));
});

test('T08b: a interface de verdade nas três telas (os retângulos que a conta do ombro usa)', async ({ browser }) => {
  test.skip(!QUAL.includes('interface'));
  mkdirSync(PASTA, { recursive: true });
  for (const [tam, nome] of TELAS) {
    const page = await abrirMundo(browser, { id: `t08b-interface-${nome}`, tema: 'cidade-grande', tamanho: tam });
    await assentar(page, 12);
    await naMao(page, `bloco:${Bloco.TABUAS}`, 16);
    await ligar(page, true);
    await dentro(page);
    await page.waitForTimeout(2500);
    const r = await page.evaluate(() => {
      const w = innerWidth;
      const h = innerHeight;
      const els = [...document.querySelectorAll<HTMLElement>('button, .barra, .minimapa, .area-mapa, .joystick')];
      return {
        w,
        h,
        els: els
          .map((el) => {
            const q = el.getBoundingClientRect();
            return { c: `${el.tagName}.${el.className}`, q: [q.left, q.top, q.right, q.bottom].map(Math.round) };
          })
          .filter((x) => x.q[2] > x.q[0] && x.q[3] > x.q[1] && x.q[0] < w && x.q[1] < h),
        braco: window.__brumaluz!.primeiraPessoa!.tela(),
        maos: window.__brumaluz!.primeiraPessoa!.maos(),
      };
    });
    nota(`interface-${nome}`, r);
    await foto(page, `${nome}-interface`);
    await page.context().close();
  }
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
