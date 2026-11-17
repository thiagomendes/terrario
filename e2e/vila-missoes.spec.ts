import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {
  abrirMundo,
  andarPelaTrilha,
  assentar,
  escolherNaRoda,
  tocar,
  type Tamanho,
} from './guia-palco';
import { alvoDeSentar, alvoDoToque, diagnostico, esperarDica } from './vila-alvo';

/**
 * Spec 026 (parte 2, etapa B): as quatro missões do parque, do "brincar" à festa, no celular
 * deitado e em pé, com o dedo de verdade nos toques e as moedinhas de verdade na carteira.
 *
 * - **f5 Bilhete do parque:** a trilha leva a cada brinquedo; o passeio inteiro carimba (a
 *   bolinha de cada brinquedo acende no lugar dela) → 5;
 * - **f6 Balões fugidos:** a trilha leva a cada balão; a dica "Toque para pegar"; o toque e o
 *   balão desce até a mão; no terceiro, a festa (4) e o balão de presente na mão;
 * - **f7 Lanche das lhamas:** o toque no fardo põe o feno na mão; o toque no cocho põe o feno
 *   nele; duas vezes; as lhamas vêm comer → 4;
 * - **f8 Prenda para a vovó:** a argola e a pescaria, a lhama de pelúcia na mão, a trilha até a
 *   vovó na porta da Casa anos 80 → 5.
 *
 * `MISSOES_SO=bilhete|baloes|lanche|prenda` roda uma só.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(1_500_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.MISSOES_PASTA ?? 'test-results/vila-missoes';
const SO = process.env.MISSOES_SO ?? '';
const HORA = process.env.MISSOES_HORA === 'noite' ? 0.96 : null;
/** O nome das fotos (as de noite levam "-noite"). */
const SUFIXO = HORA ? '-noite' : '';

type P3 = [number, number, number];
type Aberta = { id: string; feito: number; meta: number; usos?: string[] };

async function abrir(browser: Browser, id: string, tamanho: Tamanho, feitas: string[]) {
  mkdirSync(PASTA, { recursive: true });
  const page = await abrirMundo(browser, {
    id,
    tema: 'vila-neon',
    tamanho,
    extras: { alma: { local: { feitas } } },
  });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  // (`MISSOES_HORA=noite`: as fotos de noite, com a hora parada)
  if (HORA)
    await page.evaluate((h) => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = h;
    }, HORA);
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia && !!window.__vila, undefined, {
    timeout: 30_000,
  });
  await page.waitForTimeout(1500);
  return page;
}

const moedasReais = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as { __almaCrianca: { perfil: { moedas: number } } }).__almaCrianca.perfil
        .moedas,
  );
const aberta = (page: Page, id: string) =>
  page.evaluate(
    (id) =>
      (
        window as unknown as {
          __almaUi: { vista(): { abertas: Aberta[] } | null };
        }
      ).__almaUi
        .vista()
        ?.abertas.find((a) => a.id === id) ?? null,
    id,
  );
const feitas = (page: Page) =>
  page.evaluate(
    () =>
      (
        window as unknown as { __almaUi: { vista(): { feitas: string[] } | null } }
      ).__almaUi.vista()?.feitas ?? [],
  );
const tem = (page: Page, item: string) =>
  page.evaluate((item) => {
    const inv = window.__brumaluz!.inventario!;
    let n = 0;
    for (let i = 0; i < 36; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  }, item);
const foto = (page: Page, nome: string) =>
  page.screenshot({ path: `${PASTA}/${nome}${SUFIXO}.png` });

async function escolher(page: Page, id: string, nomeFoto?: string): Promise<void> {
  await page
    .waitForFunction(() => !document.body.dataset.overlay, undefined, { timeout: 15_000 })
    .catch(() => undefined);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(800);
  if (nomeFoto) await foto(page, nomeFoto);
  await tocar(page, `[data-alma-jogar="${id}"]`);
  await page.waitForTimeout(2500);
}

/** O quadro aberto (a foto do cartão com o progresso) e fechado de novo. */
async function fotoDoQuadro(page: Page, nome: string): Promise<void> {
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(900);
  await foto(page, nome);
  await tocar(page, '[data-alma-quadro] [data-alma-fechar]');
  await page.waitForFunction(() => !document.querySelector('[data-alma-quadro]'));
  await page.waitForTimeout(500);
}

async function festa(page: Page, nomeFoto?: string, teto = 40_000): Promise<void> {
  await page.waitForSelector('[data-alma-festa]', { timeout: teto });
  await page.waitForTimeout(2200);
  if (nomeFoto) await foto(page, nomeFoto);
  let livre = 0;
  for (let k = 0; k < 20 && livre < 3; k++) {
    await page.waitForTimeout(700);
    const ok = page.locator('[data-alma-festa] [data-alma-oba], [data-alma-festa] button');
    if (await ok.count()) {
      livre = 0;
      await ok
        .first()
        .tap()
        .catch(() => undefined);
      await page.waitForTimeout(900);
    } else if (!(await page.locator('[data-alma-festa]').count())) livre++;
  }
  await page.waitForTimeout(600);
}

/** Anda pela trilha até o alvo de agora; devolve a chave dele. */
async function seguir(page: Page, teto = 150_000, esperado?: string): Promise<string> {
  // (o guia confere o alvo a cada segundo e meio: espera o alvo novo aparecer)
  await page.waitForTimeout(1800);
  await page.waitForFunction(
    (esperado) => {
      const a = window.__guia!.alvo();
      return !!a && (!esperado || a.chave === esperado);
    },
    esperado,
    { timeout: 20_000 },
  );
  const r = await andarPelaTrilha(page, teto);
  if (!r.chegou) {
    const onde = await page.evaluate(() => ({
      pes: window.__brumaluz!.jogadorPes!(),
      alvo: window.__guia!.alvo(),
      rota: window.__guia!.caminho().length,
    }));
    console.log(`vila: não chegou: ${JSON.stringify(onde)}`);
    await page.screenshot({ path: `${PASTA}/nao-chegou-${r.alvo?.replace(':', '-')}.png` });
  }
  expect(r.chegou, `chegou a ${r.alvo} em ${r.s.toFixed(0)} s`).toBe(true);
  await page.waitForTimeout(500);
  return r.alvo!;
}

/** A foto do boneco de frente (o que está na mão à vista) e a câmera de volta. */
async function fotoDeFrente(page: Page, nome: string): Promise<void> {
  const antes = await page.evaluate(() => window.__brumaluz!.rotacao ?? [0, 0]);
  // (de cima: a câmera passa por cima das barracas e das cercas em volta)
  await page.evaluate((yaw) => window.__brumaluz!.apontar!(yaw + Math.PI - 0.6, 0.42), antes[1]);
  // (logo: parado, o boneco acaba virando para onde a câmera olha)
  await page.waitForTimeout(450);
  await foto(page, nome);
  await page.evaluate(([p, y]) => window.__brumaluz!.apontar!(y, p), [antes[0], antes[1]] as const);
  await page.waitForTimeout(400);
}

/** Vira a câmera para um ponto do mundo (como a criança que arrasta o dedo para olhar). */
async function olharPara(page: Page, alvo: P3, sobe = 0.55, desvio = 0): Promise<void> {
  await page.evaluate(
    ([alvo, sobe, desvio]) => {
      const e = window.__brumaluz!;
      const p = e.jogadorPes!();
      const d = Math.hypot(alvo[0] - p[0], alvo[2] - p[2]);
      e.apontar!(
        Math.atan2(alvo[0] - p[0], alvo[2] - p[2]) + desvio,
        -Math.atan2(alvo[1] - (p[1] + 1.6), Math.max(1, d + 4)) * sobe,
      );
    },
    [alvo, sobe, desvio] as const,
  );
  await page.waitForTimeout(700);
}

const dica = (page: Page) => page.evaluate(() => window.__vila!.dica());
const eventos = (page: Page, tipo: string) =>
  page.evaluate(
    (tipo) => (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === tipo).length,
    tipo,
  );

async function sairDoBrinquedo(page: Page): Promise<void> {
  await page.locator('.menu-hud.botao-roda').tap();
  const sair = page.locator('.roda.aberta button.ativo[data-item="sair-brinquedo"]');
  await sair.waitFor({ state: 'visible' });
  await page.waitForTimeout(400);
  await sair.tap();
  await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado());
  await page.waitForTimeout(1200);
}

// ------------------------------------------------------------------ f5: o bilhete do parque
async function bilhete(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f5', `${t}-f5-0-quadro`);
  const carimbos = ['bilhete:roda', 'bilhete:carrossel', 'bilhete:bate'];
  for (let k = 0; k < 3; k++) {
    const chave = await seguir(page);
    const b = Number(chave.split(':')[1]);
    // perto do brinquedo, a dica de toque mostra a cadeirinha ("Toque para andar")
    const centro = await page.evaluate((b) => {
      const e = window.__brumaluz!;
      const q = e.vila!()!.pontos.parque;
      const y = e.vila!()!.h + 1;
      if (b === 0) return [q.roda.x, y + 2, q.roda.z] as [number, number, number];
      if (b === 1) return [q.carrossel.x, y + 2.5, q.carrossel.z] as [number, number, number];
      const i = e.vilaParque!.carrinhoLivre();
      const c = e.vilaParque!.carros()?.[i];
      return [c?.x ?? q.bate.x, y + 0.9, c?.z ?? q.bate.z] as [number, number, number];
    }, b);
    await olharPara(page, centro, b === 2 ? -0.6 : 0.4);
    const ponto = await alvoDeSentar(page, b, centro);
    await page.touchscreen.tap(ponto.x, ponto.y);
    await page.waitForFunction(() => !!window.__brumaluz!.vilaParque!.sentado(), undefined, {
      timeout: 15_000,
    });
    if (b === 2) {
      // o bate-bate: guiar de verdade (o controle para a frente e virando), até o passeio contar
      await page.evaluate(async () => {
        const e = window.__brumaluz!;
        const ctl = e.controleDireto!;
        for (let i = 0; i < 26 * 4; i++) {
          ctl.mover(1, Math.sin(i / 9) > 0.55 ? 0.8 : 0);
          await new Promise((r) => setTimeout(r, 250));
          const v = (
            window as unknown as {
              __almaUi: { vista(): { abertas: { id: string; usos?: string[] }[] } | null };
            }
          ).__almaUi.vista();
          const a = v?.abertas.find((q) => q.id === 'f5');
          if (!a || a.usos?.includes('bilhete:bate')) break;
        }
        ctl.mover(0, 0);
      });
    }
    // o passeio inteiro carimba (a roda desce sozinha; o carrossel conta com uma volta)
    await page.waitForFunction(
      (c) => {
        const v = (
          window as unknown as {
            __almaUi: {
              vista(): { feitas: string[]; abertas: { id: string; usos?: string[] }[] } | null;
            };
          }
        ).__almaUi.vista();
        return (
          !!v &&
          (v.feitas.includes('f5') || !!v.abertas.find((a) => a.id === 'f5')?.usos?.includes(c))
        );
      },
      carimbos[b],
      { timeout: 60_000 },
    );
    if (k === 0) await foto(page, `${t}-f5-1-carimbo-no-passeio`);
    if (k === 2) {
      await festa(page, `${t}-f5-3-festa`);
      if (await page.evaluate(() => !!window.__brumaluz!.vilaParque!.sentado()))
        await sairDoBrinquedo(page);
      break;
    }
    if (b === 0)
      await page.waitForFunction(() => !window.__brumaluz!.vilaParque!.sentado(), undefined, {
        timeout: 40_000,
      });
    else await sairDoBrinquedo(page);
    const a = await aberta(page, 'f5');
    expect(a?.feito).toBe(k + 1);
    expect(a?.usos).toContain(carimbos[b]);
    // o cartão do quadro mostra o carimbo do brinquedo no lugar dele
    if (k === 1) await fotoDoQuadro(page, `${t}-f5-2-quadro-dois-carimbos`);
  }
  expect(await feitas(page)).toContain('f5');
}

// ------------------------------------------------------------------ f6: os balões fugidos
async function baloes(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f6', `${t}-f6-0-quadro`);
  const eu = await page.evaluate(() => window.__brumaluz!.voce!);
  for (let k = 0; k < 3; k++) {
    const chave = await seguir(page);
    const i = Number(chave.split(':')[1]);
    // olha para o balão (lá no alto) e espera a dica de toque
    for (let v = 0; v < 40; v++) {
      const onde = await page.evaluate(
        (i) => window.__vila!.toques().find((x) => x.chave === `balao-${i}`) ?? null,
        i,
      );
      expect(onde, `o balão ${i} existe`).not.toBeNull();
      const lugar = await page.evaluate((i) => window.__brumaluz!.balaoFugido!(i), i);
      // (a inclinação muda a cada volta: deitado, a faixa boa da tela para a dica é estreita)
      await olharPara(page, lugar, [1, 1.3, 0.75, 1.6, 0.5][v % 5]);
      if ((await dica(page))?.chave === `balao-${i}`) break;
      await page.waitForTimeout(500);
    }
    expect((await dica(page))?.texto, await diagnostico(page, `balao-${i}`)).toBe(
      'Toque para pegar',
    );
    if (k === 0) await foto(page, `${t}-f6-1-dica-no-balao`);
    const ponto = await alvoDoToque(page, `balao-${i}`);
    await page.touchscreen.tap(ponto.x, ponto.y);
    await page.waitForFunction((i) => !!window.__brumaluz!.vilaEstado!()?.bal?.[i], i, {
      timeout: 10_000,
    });
    await page.waitForTimeout(650);
    if (k === 0) await foto(page, `${t}-f6-2-balao-descendo`);
    await page.waitForTimeout(900);
    if (k === 0) await foto(page, `${t}-f6-3-balao-na-mao`);
    if (k < 2) expect((await aberta(page, 'f6'))?.feito).toBe(k + 1);
  }
  await festa(page, `${t}-f6-4-festa`);
  expect(await feitas(page)).toContain('f6');
  // o balão de presente fica com ela neste mundo
  await page.waitForFunction(
    (eu) => !!window.__brumaluz!.vilaEstado!()?.balao?.includes(eu),
    eu,
    { timeout: 10_000 },
  );
  // (no caminho do parque, andando um pouco para a frente, e a câmera de três quartos do lado da
  // mão: o balão e o fio à vista)
  await page.evaluate(async () => {
    const e = window.__brumaluz!;
    const q = e.vila!()!;
    // (andando para o arco da entrada, no caminho aberto; a câmera atrás e à direita dela)
    e.teleportar!(q.pontos.parque.entrada[0], q.pontos.parque.entrada[2] - 7, q.h + 1.2);
    e.apontar!(0, 0.1);
    await new Promise((r) => setTimeout(r, 600));
    e.controleDireto!.mover(1, 0);
    await new Promise((r) => setTimeout(r, 700));
    e.controleDireto!.mover(0, 0);
    await new Promise((r) => setTimeout(r, 400));
    e.apontar!(-0.65, 0.2);
    // (a câmera um pouco mais longe: o balão inteiro no quadro)
    e.controleDireto!.zoom(1.6);
  });
  await page.waitForTimeout(900);
  expect(
    await page.evaluate(() => window.__brumaluz!.vilaMissoes!.estado().comBalao.length),
  ).toBe(1);
  await foto(page, `${t}-f6-5-balao-de-presente`);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.zoom(1 / 1.6));
}

// ------------------------------------------------------------------ f7: o lanche das lhamas
async function lanche(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f7', `${t}-f7-0-quadro`);
  for (let k = 0; k < 2; k++) {
    expect(await seguir(page, 150_000, 'fardo')).toBe('fardo');
    const fardo = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.parque.fardo);
    await olharPara(page, [fardo[0], fardo[1] - 1, fardo[2]], -0.5);
    await esperarDica(page, 'fardo', fardo);
    if (k === 0) await foto(page, `${t}-f7-1-dica-no-fardo`);
    let ponto = await alvoDoToque(page, 'fardo');
    await page.touchscreen.tap(ponto.x, ponto.y);
    await page.waitForFunction(() => {
      const inv = window.__brumaluz!.inventario!;
      for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === 'trigo') return true;
      return false;
    });
    await page.waitForTimeout(900);
    if (k === 0) await fotoDeFrente(page, `${t}-f7-2-feno-na-mao`);
    expect(await seguir(page, 150_000, 'cocho')).toBe('cocho');
    const cocho = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.parque.cocho);
    await olharPara(page, [cocho[0], cocho[1], cocho[2]], -0.6);
    await esperarDica(page, 'cocho', cocho);
    if (k === 0) {
      await foto(page, `${t}-f7-3-dica-no-cocho`);
      // (a mesma dica com a câmera de lado: o cocho à vista, fora do boneco)
      await olharPara(page, [cocho[0], cocho[1], cocho[2]], 2.2, -0.45);
      await page.waitForTimeout(900);
      await foto(page, `${t}-f7-3b-cocho-de-lado`);
    }
    ponto = await alvoDoToque(page, 'cocho');
    const antes = await eventos(page, 'vilaLanche');
    await page.touchscreen.tap(ponto.x, ponto.y);
    await page.waitForFunction(
      (antes) =>
        (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === 'vilaLanche').length > antes,
      antes,
      { timeout: 10_000 },
    );
    expect(await tem(page, 'trigo')).toBe(0);
    if (k === 0) {
      // as lhamas vêm comer e pulam (a câmera de lado, por cima do boneco: o cocho à vista)
      await olharPara(page, [cocho[0], cocho[1], cocho[2]], 2.2, -0.45);
      await page.waitForTimeout(2600);
      await foto(page, `${t}-f7-4-lhamas-no-cocho`);
      expect((await aberta(page, 'f7'))?.feito).toBe(1);
    }
  }
  await festa(page, `${t}-f7-5-festa`);
  expect(await feitas(page)).toContain('f7');
}

// ------------------------------------------------------------------ f8: a prenda para a vovó
async function prenda(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f8', `${t}-f8-0-quadro`);
  for (let k = 0; k < 2; k++) {
    const chave = await seguir(page);
    const i = Number(chave.split(':')[1]);
    const qual = i ? 'pescaria' : 'argola';
    const onde = await page.evaluate(
      (qual) =>
        (window.__brumaluz!.vila!()!.pontos.parque as unknown as Record<string, P3>)[qual],
      qual,
    );
    await olharPara(page, [onde[0], onde[1] + 1.4, onde[2]], 0.3);
    await esperarDica(page, qual, onde);
    if (k === 0) await foto(page, `${t}-f8-1-dica-na-barraca`);
    const ponto = await alvoDoToque(page, qual);
    await page.touchscreen.tap(ponto.x, ponto.y);
    await page.waitForFunction(
      (k) =>
        (
          window as unknown as {
            __almaUi: { vista(): { abertas: { id: string; feito: number }[] } | null };
          }
        ).__almaUi
          .vista()
          ?.abertas.find((a) => a.id === 'f8')?.feito === k + 1,
      k,
      { timeout: 10_000 },
    );
    await page.waitForTimeout(700);
    if (k === 0) await foto(page, `${t}-f8-2-${qual}`);
  }
  // a lhama de pelúcia veio para a mão
  await page.waitForFunction(() => {
    const inv = window.__brumaluz!.inventario!;
    for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === 'pelucia') return true;
    return false;
  });
  await page.waitForTimeout(1600);
  await foto(page, `${t}-f8-3-pelucia-chegando`);
  await fotoDeFrente(page, `${t}-f8-3-pelucia-na-mao`);
  await fotoDoQuadro(page, `${t}-f8-4-quadro-duas-bolinhas`);
  // a trilha leva até a vovó, na porta da Casa anos 80 (atravessa o bairro)
  const ini = Date.now();
  await page.waitForFunction(() => window.__guia!.alvo()?.chave === 'vovo', undefined, {
    timeout: 15_000,
  });
  // (a prenda é entregue ao chegar perto: a trilha pode acabar antes do fim)
  const r = await andarPelaTrilha(page, 300_000);
  console.log(`vila: até a vovó em ${((Date.now() - ini) / 1000).toFixed(0)} s (${r.alvo})`);
  await page.waitForFunction(
    () => (window.__brumaluz!.eventosVila ?? []).some((e) => e.e === 'vilaVovo'),
    undefined,
    { timeout: 20_000 },
  );
  expect(await tem(page, 'pelucia')).toBe(0);
  const avo = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.postos.avo);
  // (a festa espera: a vovó comemora no mundo primeiro)
  await olharPara(page, [avo[0], avo[1] + 1.2, avo[2]], 0.2, -0.45);
  await page.waitForTimeout(300);
  await foto(page, `${t}-f8-5-vovo-feliz`);
  await festa(page, `${t}-f8-6-festa`);
  expect(await feitas(page)).toContain('f8');
  // a vovó continua na porta da Casa anos 80 (a foto de quem chega pela calçada)
  await page.evaluate((avo) => {
    const e = window.__brumaluz!;
    e.teleportar!(avo[0] + 1.6, avo[2] + 4.6, avo[1] + 0.2);
  }, avo);
  await page.waitForTimeout(800);
  await olharPara(page, [avo[0], avo[1] + 1.2, avo[2]], 0.2, -0.45);
  await page.waitForTimeout(1200);
  await foto(page, `${t}-f8-7-vovo-na-porta`);
}

for (const tamanho of ['empe', 'deitado'] as const) {
  if (!SO || SO === 'bilhete' || SO === 'baloes')
    test(`Vila Neon, ${tamanho}: o bilhete do parque e os balões fugidos, do brincar à festa`, async ({
      browser,
    }) => {
      const page = await abrir(browser, `vila-missoes-a-${tamanho}`, tamanho, ['f1', 'f2', 'f4']);
      const antes = await moedasReais(page);
      let devidas = 0;
      if (SO !== 'baloes') {
        await bilhete(page, tamanho);
        devidas += 5;
      } else
        await page.evaluate(() => {
          const q = window.__brumaluz!.vila!()!;
          window.__brumaluz!.teleportar!(q.pontos.parque.entrada[0], q.pontos.parque.entrada[2] - 6, q.h + 1.2);
        });
      if (SO !== 'bilhete') {
        await baloes(page, tamanho);
        devidas += 4;
      }
      expect((await moedasReais(page)) - antes).toBeGreaterThanOrEqual(devidas);
      await page.close();
    });
  if (!SO || SO === 'lanche' || SO === 'prenda')
    test(`Vila Neon, ${tamanho}: o lanche das lhamas e a prenda para a vovó, do brincar à festa`, async ({
      browser,
    }) => {
      const page = await abrir(browser, `vila-missoes-b-${tamanho}`, tamanho, [
        'f1',
        'f2',
        'f4',
        'f5',
        'f6',
      ]);
      const antes = await moedasReais(page);
      let devidas = 0;
      await page.evaluate(() => {
        const q = window.__brumaluz!.vila!()!;
        window.__brumaluz!.teleportar!(q.pontos.parque.entrada[0], q.pontos.parque.entrada[2] - 6, q.h + 1.2);
      });
      await assentar(page, 9);
      if (SO !== 'prenda') {
        await lanche(page, tamanho);
        devidas += 4;
      }
      if (SO !== 'lanche') {
        await prenda(page, tamanho);
        devidas += 5;
      }
      expect((await moedasReais(page)) - antes).toBeGreaterThanOrEqual(devidas);
      await page.close();
    });
}
