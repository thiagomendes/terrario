import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import {
  abrirMundo,
  andarPelaTrilha,
  assentar,
  escolherNaRoda,
  tocar as tocarNoSeletor,
  type Tamanho,
} from './guia-palco';
import { alvoDoToque, diagnostico, esperarDica } from './vila-alvo';

/**
 * Spec 026 (parte 3, etapa B): as quatro missões da Casa anos 80 e da rampa, do "brincar" à festa,
 * no celular em pé e deitado, com o dedo de verdade nos toques e as moedinhas de verdade.
 *
 * - **f9 Sessão de cinema:** a trilha leva à locadora (um toque, a fita), à TV da casa (um toque
 *   no videocassete, o filme começa) e ao sofá (um toque, a criança senta do lado da vovó); o
 *   filme acaba com ela sentada → 5;
 * - **f10 Arrumar o quarto:** a trilha leva a cada brinquedo espalhado (o ioiô no quintal, o pião
 *   na sala, o cubo no quarto); um toque pega, outro no baú guarda → 4;
 * - **f11 Volta na rampa:** a trilha leva ao suporte dos skates (um toque, o skate nos pés) e ao
 *   fundo da rampa; segurando o controle, três idas e voltas → 4;
 * - **f12 Bolo da vovó:** a trilha leva à lanchonete (um toque, a vitamina) e à vovó no sofá; ela
 *   comemora e a fatia de bolo de fubá voa até a mão → 5.
 *
 * Mais o feno das lhamas na mão (f2). `CASA_MISSOES_SO=cinema|bolo|feno` roda uma parte só;
 * `CASA_MISSOES_HORA=noite` tira as fotos de noite.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(1_500_000);
test.use({ actionTimeout: 30_000 });
const PASTA = process.env.CASA_MISSOES_PASTA ?? 'test-results/vila-casa-missoes';
const SO = process.env.CASA_MISSOES_SO ?? '';
const HORA = process.env.CASA_MISSOES_HORA === 'noite' ? 0.96 : null;
const SUFIXO = HORA ? '-noite' : '';
const ANTES = ['f1', 'f2', 'f4', 'f5', 'f6', 'f7', 'f8'];

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
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  (page as unknown as { erros: string[] }).erros = erros;
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
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
const errosDe = (page: Page) => (page as unknown as { erros: string[] }).erros;

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
        window as unknown as { __almaUi: { vista(): { abertas: Aberta[] } | null } }
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
const naMao = (page: Page) =>
  page.evaluate(() => {
    const e = window.__brumaluz!;
    return e.inventario!.obter(e.slotAtivo ?? 0)?.item ?? null;
  });
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
  await tocarNoSeletor(page, `[data-alma-jogar="${id}"]`);
  await page.waitForTimeout(2500);
}

async function fotoDoQuadro(page: Page, nome: string): Promise<void> {
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(900);
  await foto(page, nome);
  await tocarNoSeletor(page, '[data-alma-quadro] [data-alma-fechar]');
  await page.waitForFunction(() => !document.querySelector('[data-alma-quadro]'));
  await page.waitForTimeout(500);
}

async function festa(page: Page, nomeFoto?: string, teto = 45_000): Promise<void> {
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

/** Anda pela trilha até o alvo de agora (o `esperado`, se dito); devolve a chave dele. */
async function seguir(page: Page, esperado?: string, teto = 180_000): Promise<string> {
  await page.waitForTimeout(1800);
  // (o nível que sobe no meio da missão abre a festa da estrela: a criança toca no "certo")
  for (let k = 0; k < 6; k++) {
    const ok = page.locator('[data-alma-festa] [data-alma-oba], [data-alma-festa] button');
    if (!(await ok.count())) break;
    await ok
      .first()
      .tap()
      .catch(() => undefined);
    await page.waitForTimeout(900);
  }
  await page.waitForFunction(
    (esperado) => {
      const a = window.__guia!.alvo();
      return !!a && (!esperado || a.chave === esperado);
    },
    esperado,
    { timeout: 25_000 },
  );
  const r = await andarPelaTrilha(page, teto);
  if (!r.chegou) {
    const onde = await page.evaluate(() => ({
      pes: window.__brumaluz!.jogadorPes!(),
      alvo: window.__guia!.alvo(),
      rota: window.__guia!.caminho().length,
    }));
    console.log(`casa: não chegou: ${JSON.stringify(onde)}`);
    await page.screenshot({ path: `${PASTA}/nao-chegou-${r.alvo?.replace(':', '-')}.png` });
  }
  expect(r.chegou, `chegou a ${r.alvo} em ${r.s.toFixed(0)} s`).toBe(true);
  console.log(`casa: trilha ${r.alvo} em ${r.s.toFixed(1)} s`);
  await page.waitForTimeout(500);
  return r.alvo!;
}

/** O ponto de um toque da vila (onde fica no mundo). */
const pontoDoToque = (page: Page, chave: string) =>
  page.evaluate(
    (chave) => window.__vila!.toques().find((q) => q.chave === chave)?.p ?? null,
    chave,
  );

/** Espera a dica `chave` com o texto e toca nela com o dedo de verdade. */
async function tocarNaDica(page: Page, chave: string, texto: string, nomeFoto?: string) {
  const p = await pontoDoToque(page, chave);
  expect(p, `o toque ${chave} existe`).not.toBeNull();
  await esperarDica(page, chave, p as P3);
  expect((await page.evaluate(() => window.__vila!.dica()))?.texto, await diagnostico(page, chave)).toBe(
    texto,
  );
  if (nomeFoto) await foto(page, nomeFoto);
  const t = await alvoDoToque(page, chave);
  await page.touchscreen.tap(t.x, t.y);
}

/** A foto do boneco de frente (o que está na mão à vista) e a câmera de volta. */
async function fotoDeFrente(page: Page, nome: string, inclina = 0.42): Promise<void> {
  const antes = await page.evaluate(() => window.__brumaluz!.rotacao ?? [0, 0]);
  await page.evaluate(
    ([yaw, inc]) => window.__brumaluz!.apontar!(yaw + Math.PI - 0.6, inc),
    [antes[1], inclina] as const,
  );
  await page.waitForTimeout(500);
  await foto(page, nome);
  await page.evaluate(([p, y]) => window.__brumaluz!.apontar!(y, p), [antes[0], antes[1]] as const);
  await page.waitForTimeout(400);
}

const eventos = (page: Page, tipo: string) =>
  page.evaluate(
    (tipo) => (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === tipo).length,
    tipo,
  );

// ------------------------------------------------------------------ f9: a sessão de cinema
async function cinema(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f9', `${t}-f9-0-quadro`);
  expect(await seguir(page, 'locadora')).toBe('locadora');
  await tocarNaDica(page, 'fitas', 'Toque para pegar', `${t}-f9-1-locadora-dica`);
  await page.waitForFunction(() => {
    const inv = window.__brumaluz!.inventario!;
    for (let i = 0; i < 36; i++) if (inv.obter(i)?.item === 'fita_video') return true;
    return false;
  });
  await page.waitForFunction(
    () =>
      !!(
        window as unknown as { __almaUi: { vista(): { abertas: Aberta[] } | null } }
      ).__almaUi
        .vista()
        ?.abertas.find((a) => a.id === 'f9')
        ?.usos?.includes('cinema:fita'),
    undefined,
    { timeout: 10_000 },
  );
  expect(await seguir(page, 'tv')).toBe('tv');
  await tocarNaDica(page, 'videocassete', 'Toque para pôr a fita', `${t}-f9-2-videocassete-dica`);
  await page.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().filme > 0, undefined, {
    timeout: 10_000,
  });
  expect((await aberta(page, 'f9'))?.usos).toContain('cinema:tv');
  // o filme começou: a trilha leva ao sofá
  expect(await seguir(page, 'sofa', 30_000)).toBe('sofa');
  await tocarNaDica(page, 'sofa', 'Toque para sentar');
  const sofa = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.casa.sofa);
  await page.waitForFunction(
    (s) => {
      const p = window.__brumaluz!.jogadorPes!();
      return s.assentos
        .slice(1)
        .some((a) => Math.hypot(a.x - p[0], a.z - p[2]) < 0.45 && Math.abs(a.y - p[1]) < 0.25);
    },
    sofa,
    { timeout: 10_000 },
  );
  await page.waitForTimeout(1500);
  // a criança e a vovó no sofá com o filme passando (a câmera atrás do sofá, olhando a TV)
  await page.evaluate((s) => window.__brumaluz!.apontar!(s.yaw, 0.62), sofa);
  await page.waitForTimeout(1200);
  await foto(page, `${t}-f9-3-sofa-com-a-vovo-filme`);
  // e de frente, as duas sentadas (do lado da criança: a vovó fica atrás dela, inteira)
  await page.evaluate((s) => window.__brumaluz!.apontar!(s.yaw + Math.PI + 0.5, 0.6), sofa);
  // (logo: parada, a criança acaba virando para onde a câmera olha)
  await page.waitForTimeout(450);
  await foto(page, `${t}-f9-4-sentadas-de-frente`);
  await page.evaluate((s) => window.__brumaluz!.apontar!(s.yaw, 0.62), sofa);
  // o filme acaba com ela sentada: a festa
  await festa(page, `${t}-f9-5-festa`, 40_000);
  expect(await feitas(page)).toContain('f9');
  // ainda tem a fita (fica na mochila)
  expect(await tem(page, 'fita_video')).toBe(1);
  // levanta do sofá (andar para a frente, para o tapete, desce)
  await page.evaluate((s) => window.__brumaluz!.apontar!(s.yaw, 0.5), sofa);
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await page.waitForTimeout(500);
}

// ------------------------------------------------------------------ f10: arrumar o quarto
async function quarto(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f10', `${t}-f10-0-quadro`);
  const itens = ['ioio', 'piao', 'cubo_cores'];
  for (let k = 0; k < 3; k++) {
    const chave = await seguir(page);
    expect(chave).toMatch(/^brinquedo:/);
    const i = Number(chave.split(':')[1]);
    // o brinquedo espalhado à vista (a missão aberta, ainda no chão)
    expect(await page.evaluate(() => window.__brumaluz!.vilaMissoesCasa!()!.espalhados)).toBe(
      3 - k,
    );
    await tocarNaDica(page, `espalhado-${i}`, 'Toque para pegar', k === 0 ? `${t}-f10-1-espalhado-dica` : undefined);
    await page.waitForFunction((i) => !!window.__brumaluz!.vilaEstado!()?.qto?.[i], i, {
      timeout: 10_000,
    });
    await page.waitForTimeout(900);
    expect(await tem(page, itens[i])).toBe(1);
    if (k === 0) await fotoDeFrente(page, `${t}-f10-2-brinquedo-na-mao`);
    expect(await seguir(page, 'bau')).toBe('bau');
    const antes = await eventos(page, 'vilaGuardou');
    await tocarNaDica(page, 'bau-guardar', 'Toque para guardar', k === 0 ? `${t}-f10-3-bau-dica` : undefined);
    await page.waitForFunction(
      (antes) =>
        (window.__brumaluz!.eventosVila ?? []).filter((e) => e.e === 'vilaGuardou').length > antes,
      antes,
      { timeout: 10_000 },
    );
    await page.waitForTimeout(450);
    // (no primeiro, o nível sobe e a festa da estrela tapa a tela: a foto é no segundo)
    if (k === 1) await foto(page, `${t}-f10-4-guardando`);
    expect(await tem(page, itens[i])).toBe(0);
    if (k === 1) await fotoDoQuadro(page, `${t}-f10-5-quadro-dois-guardados`);
  }
  await festa(page, `${t}-f10-6-festa`);
  expect(await feitas(page)).toContain('f10');
}

// ------------------------------------------------------------------ f11: a volta na rampa
async function rampa(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f11', `${t}-f11-0-quadro`);
  expect(await seguir(page, 'suporte')).toBe('suporte');
  await tocarNaDica(page, 'skate', 'Toque para pegar', `${t}-f11-1-suporte-dica`);
  await page.waitForFunction(() => !!window.__brumaluz!.personagem!.aparencia().skate);
  expect(await seguir(page, 'rampa')).toBe('rampa');
  await foto(page, `${t}-f11-2-no-fundo`);
  /** Segura o controle para a curva do leste até `feito` voltas (ou a festa). */
  const segurar = (ate: number) =>
    page.evaluate(async (ate) => {
      const e = window.__brumaluz!;
      const vista = () =>
        (
          window as unknown as {
            __almaUi: {
              vista(): { feitas: string[]; abertas: { id: string; feito: number }[] } | null;
            };
          }
        ).__almaUi.vista();
      // (olhando para a curva do leste: o controle para a frente leva para ela)
      e.apontar!(Math.PI / 2, 0.3);
      e.controleDireto!.mover(1, 0);
      const t0 = performance.now();
      while (performance.now() - t0 < 90_000) {
        await new Promise((r) => setTimeout(r, 200));
        const v = vista();
        if (v?.feitas.includes('f11')) break;
        if ((v?.abertas.find((a) => a.id === 'f11')?.feito ?? 0) >= ate) break;
      }
      e.controleDireto!.mover(0, 0);
    }, ate);
  // a primeira ida e volta (a foto no meio do vaivém)
  const meio = page.waitForFunction(
    () => window.__brumaluz!.vilaCasa!.estado().trilho.fase === 'sobe',
    undefined,
    { timeout: 30_000 },
  );
  const primeira = segurar(1);
  await meio;
  // (descendo a curva, com a câmera já de lado olhando ao longo da rampa)
  await page.waitForTimeout(2400);
  await foto(page, `${t}-f11-3-no-alto`);
  await primeira;
  await page.waitForTimeout(1500);
  await fotoDoQuadro(page, `${t}-f11-4-quadro-um-carimbo`);
  await segurar(3);
  await festa(page, `${t}-f11-5-festa`);
  expect(await feitas(page)).toContain('f11');
}

// ------------------------------------------------------------------ f12: o bolo da vovó
async function bolo(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f12', `${t}-f12-0-quadro`);
  expect(await seguir(page, 'lanchonete')).toBe('lanchonete');
  // (spec 032: a vitamina se compra; a Tati entrega na mão)
  await tocarNaDica(page, 'compra-vitamina', 'Toque para comprar', `${t}-f12-1-lanchonete-dica`);
  await page.waitForFunction(() => {
    const inv = window.__brumaluz!.inventario!;
    for (let i = 0; i < 36; i++) if (inv.obter(i)?.item === 'vitamina') return true;
    return false;
  });
  await page.waitForTimeout(1000);
  await fotoDeFrente(page, `${t}-f12-2-vitamina-na-mao`);
  // a trilha leva até a vovó no sofá (a vitamina é entregue ao chegar perto)
  await page.waitForFunction(() => window.__guia!.alvo()?.chave === 'vovo', undefined, {
    timeout: 20_000,
  });
  const r = await andarPelaTrilha(page, 300_000);
  console.log(`casa: até a vovó em ${r.s.toFixed(0)} s`);
  await page.waitForFunction(
    () => (window.__brumaluz!.eventosVila ?? []).some((e) => e.e === 'vilaBolo'),
    undefined,
    { timeout: 20_000 },
  );
  // a vovó comemora e a fatia voa da mesinha até a mão (a criança de frente para ela: a câmera
  // atrás da criança, um pouco de lado, vê o rosto da vovó, a mesinha e a fatia)
  const c = await page.evaluate(() => window.__brumaluz!.vila!()!.pontos.casa);
  await page.evaluate((a) => {
    const e = window.__brumaluz!;
    const p = e.jogadorPes!();
    e.apontar!(Math.atan2(a.x - p[0], a.z - p[2]) + 0.4, 0.5);
  }, c.sofa.assentos[0]);
  await page.waitForTimeout(250);
  await foto(page, `${t}-f12-3-vovo-da-a-fatia`);
  await page.waitForTimeout(650);
  await foto(page, `${t}-f12-4-fatia-voando`);
  await page.waitForTimeout(1600);
  expect(await tem(page, 'fatia_bolo')).toBe(1);
  expect(await tem(page, 'vitamina')).toBe(0);
  await festa(page, `${t}-f12-5-festa`);
  expect(await feitas(page)).toContain('f12');
  // a fatia na mão (no tapete, de frente, sem nada que se toca por perto)
  await page.evaluate((tv) => {
    const e = window.__brumaluz!;
    e.teleportar!(tv[0] + 1.5, tv[2] + 3.4, tv[1] + 0.2);
    e.apontar!(0.3, 0.35);
  }, c.tv);
  await page.waitForTimeout(1500);
  await fotoDeFrente(page, `${t}-f12-6-fatia-na-mao`, 0.35);
  expect(await naMao(page)).toBe('fatia_bolo');
}

// ------------------------------------------------------------------ o feno das lhamas (f2)
async function feno(page: Page, t: Tamanho): Promise<void> {
  await escolher(page, 'f2');
  for (let k = 0; k < 4 && (await tem(page, 'feno')) < 1; k++) await seguir(page);
  await page.waitForFunction(() => {
    const inv = window.__brumaluz!.inventario!;
    for (let i = 0; i < 9; i++) if (inv.obter(i)?.item === 'feno') return true;
    return false;
  });
  await page.waitForTimeout(1300);
  await foto(page, `${t}-feno-1-chegou-na-mao`);
  expect(await naMao(page)).toBe('feno');
  await fotoDeFrente(page, `${t}-feno-2-na-mao-de-frente`, 0.3);
}

for (const tamanho of ['empe', 'deitado'] as const) {
  if (!SO || SO === 'cinema')
    test(`Vila Neon, ${tamanho}: a sessão de cinema e arrumar o quarto, do brincar à festa`, async ({
      browser,
    }) => {
      const page = await abrir(browser, `vila-casa-m-a-${tamanho}`, tamanho, ANTES);
      const antes = await moedasReais(page);
      await cinema(page, tamanho);
      await quarto(page, tamanho);
      expect((await moedasReais(page)) - antes).toBeGreaterThanOrEqual(9);
      expect(errosDe(page)).toEqual([]);
      await page.close();
    });
  if (!SO || SO === 'bolo')
    test(`Vila Neon, ${tamanho}: a volta na rampa e o bolo da vovó, do brincar à festa`, async ({
      browser,
    }) => {
      const page = await abrir(browser, `vila-casa-m-b-${tamanho}`, tamanho, [
        ...ANTES,
        'f9',
        'f10',
      ]);
      const antes = await moedasReais(page);
      await rampa(page, tamanho);
      await bolo(page, tamanho);
      expect((await moedasReais(page)) - antes).toBeGreaterThanOrEqual(9);
      expect(errosDe(page)).toEqual([]);
      await page.close();
    });
  if (!SO || SO === 'feno')
    test(`Vila Neon, ${tamanho}: o feno das lhamas na mão (item próprio)`, async ({ browser }) => {
      const page = await abrir(browser, `vila-casa-m-feno-${tamanho}`, tamanho, ['f1']);
      await feno(page, tamanho);
      await page.close();
    });
}
