import { expect, test, type Browser, type Page } from '@playwright/test';
import { criarMundo } from './guia-palco';

/**
 * Spec 026 (parte 3), dois navegadores no mesmo mundo da nuvem: a Ana e a Bia na sala da Casa
 * anos 80. A TV e o disco são da sala, de todos: o canal que a Ana troca aparece na tela da Bia,
 * a Bia logo em seguida não troca por cima (a esperinha da sala) e, passada a esperinha, troca para
 * as duas; o disco que a Bia liga toca para as duas. Na rampa, a Bia vê a Ana no trilho.
 *
 * Dono, 18 nov (f9 Sessão de cinema): a Ana põe a fita dela; a Bia, sem fita nenhuma, só senta no
 * sofá. As duas, sentadas durante o filme e na casa quando ele acaba, fazem a missão (o cartão da
 * Bia todo aceso e as moedinhas no fim): é mais justo entre irmãos.
 */
const ANTES = ['f1', 'f2', 'f4', 'f5', 'f6', 'f7', 'f8'];
type Vista = { feitas: string[]; abertas: { id: string; usos?: string[] }[] };
const vista = (p: Page) =>
  p.evaluate(
    () =>
      (window as unknown as { __almaUi: { vista(): Vista | null } }).__almaUi.vista() ?? {
        feitas: [],
        abertas: [],
      },
  );
const moedas = (p: Page) =>
  p.evaluate(
    () =>
      (window as unknown as { __almaCrianca: { perfil: { moedas: number } } }).__almaCrianca.perfil
        .moedas,
  );
const temFita = (p: Page) =>
  p.evaluate(() => {
    const inv = window.__brumaluz!.inventario!;
    for (let i = 0; i < 36; i++) if (inv.obter(i)?.item === 'fita_video') return true;
    return false;
  });
/** Senta no assento livre do sofá (de pé na frente dele). */
async function sentarNoSofa(p: Page, i: number): Promise<void> {
  await p.evaluate((i) => {
    const e = window.__brumaluz!;
    const a = e.vila!()!.pontos.casa.sofa.assentos[i];
    e.teleportar!(a.x, a.z - 1.2, a.y + 0.2);
  }, i);
  await p.waitForTimeout(900);
  await p.evaluate(() => window.__brumaluz!.vilaCasa!.sentar());
  await p.waitForFunction(
    () => {
      const e = window.__brumaluz!;
      const pes = e.jogadorPes!();
      return e
        .vila!()!
        .pontos.casa.sofa.assentos.slice(1)
        .some((a) => Math.hypot(a.x - pes[0], a.z - pes[2]) < 0.45 && Math.abs(a.y - pes[1]) < 0.25);
    },
    null,
    { timeout: 10_000 },
  );
}
async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
      );
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 240_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
    window.__brumaluz!.hora = 0.42;
  });
const canal = (p: Page) => p.evaluate(() => window.__brumaluz!.vilaCasa!.sala().canal);
/** A criança na sala, entre o sofá e a TV. */
const naSala = (p: Page, dx: number) =>
  p.evaluate((dx) => {
    const e = window.__brumaluz!;
    const c = e.vila!()!.pontos.casa;
    e.voar?.(false);
    e.teleportar!(c.tv[0] + dx, c.tv[2] + 4.5, c.y + 0.2);
    e.apontar!(Math.PI, 0.9);
  }, dx);

test('dois navegadores na sala da casa: a TV e o disco são de todos, com a esperinha', async ({
  browser,
}) => {
  test.setTimeout(900_000);
  const ana = await jogador(browser, 'ana-casa', 'Ana');
  // (as duas com as missões de antes feitas: a f9 aberta para as duas)
  await criarMundo(ana, 'vila-casa-amigos', 'vila-neon', {
    alma: { local: { feitas: ANTES }, 'bia-casa': { feitas: ANTES } },
  });
  await ana.goto('/?mundo=vila-casa-amigos');
  await pronto(ana);
  await entrarNoJogo(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');
  const bia = await jogador(browser, 'bia-casa', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);
  for (const [p, outra] of [
    [ana, 'Bia'],
    [bia, 'Ana'],
  ] as const)
    await p.waitForFunction(
      (o) => (window.__brumaluz!.outrosJogadores?.() ?? []).some((q) => q.apelido === o),
      outra,
      { timeout: 90_000 },
    );

  await naSala(ana, -1);
  await naSala(bia, 1.2);
  await ana.waitForTimeout(2500);
  expect(await canal(ana)).toBe(0);
  expect(await canal(bia)).toBe(0);
  // a Ana troca o canal: as duas veem o canal 2
  await ana.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('tv'));
  for (const p of [ana, bia])
    await p.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().canal === 1, null, {
      timeout: 10_000,
    });
  // a Bia logo em seguida: a esperinha da sala segura (ninguém troca por cima do outro)
  await bia.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('tv'));
  await bia.waitForTimeout(800);
  expect(await canal(bia)).toBe(1);
  expect(await canal(ana)).toBe(1);
  // passada a esperinha, a Bia troca: as duas veem o canal 3
  await bia.waitForTimeout(700);
  await bia.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('tv'));
  for (const p of [ana, bia])
    await p.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().canal === 2, null, {
      timeout: 10_000,
    });
  await ana.waitForTimeout(1200);
  // as duas telas mostram o mesmo desenho
  expect((await ana.evaluate(() => window.__brumaluz!.vilaCasa!.estado().tela))).toBe('canal2');
  expect((await bia.evaluate(() => window.__brumaluz!.vilaCasa!.estado().tela))).toBe('canal2');
  // a Bia liga o disco: toca para as duas
  await bia.evaluate(() => {
    const e = window.__brumaluz!;
    const c = e.vila!()!.pontos.casa;
    e.teleportar!(c.discos[0] + 2, c.discos[2], c.y + 0.2);
  });
  await bia.waitForTimeout(800);
  await bia.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('disco'));
  for (const p of [ana, bia])
    await p.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().disco >= 0, null, {
      timeout: 10_000,
    });
  await ana.screenshot({ path: 'capturas-026c/amigos-ana.png' });
  await bia.screenshot({ path: 'capturas-026c/amigos-bia.png' });

  // f9 (18 nov): a Ana pega a fita e põe; a Bia, sem fita, só senta no sofá
  for (const p of [ana, bia])
    await p.waitForFunction(
      () =>
        !!(
          window as unknown as { __almaUi: { vista(): Vista | null } }
        ).__almaUi
          .vista()
          ?.abertas.some((a) => a.id === 'f9'),
      null,
      { timeout: 30_000 },
    );
  expect(await temFita(bia)).toBe(false);
  const moedasBia = await moedas(bia);
  await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    const f = p.pontos.rua.fitas;
    e.teleportar!(f[0] + 0.5, f[2] + 3.2, p.h + 1.2);
  });
  await ana.waitForTimeout(1500);
  await ana.evaluate(() => window.__brumaluz!.vilaMissoes!.comando({ a: 'fita' }));
  await ana.waitForFunction(
    () => {
      const inv = window.__brumaluz!.inventario!;
      for (let i = 0; i < 36; i++) if (inv.obter(i)?.item === 'fita_video') return true;
      return false;
    },
    null,
    { timeout: 10_000 },
  );
  await naSala(ana, -1);
  await naSala(bia, 1.2);
  await ana.waitForTimeout(1500);
  await ana.evaluate(() => window.__brumaluz!.vilaCasa!.tocar('videocassete'));
  for (const p of [ana, bia])
    await p.waitForFunction(() => window.__brumaluz!.vilaCasa!.sala().filme > 0, null, {
      timeout: 10_000,
    });
  // a Bia sem fita não pôs nada (não ganhou o passo do videocassete)
  expect((await vista(bia)).abertas.find((a) => a.id === 'f9')?.usos ?? []).not.toContain(
    'cinema:tv',
  );
  await sentarNoSofa(ana, 1);
  await sentarNoSofa(bia, 2);
  await bia.waitForTimeout(1500);
  await bia.screenshot({ path: 'capturas-026c/amigos-f9-as-duas-no-sofa.png' });
  // o filme acaba com as duas sentadas: as duas fizeram a missão
  for (const p of [ana, bia])
    await p.waitForFunction(
      () =>
        (
          window as unknown as { __almaUi: { vista(): Vista | null } }
        ).__almaUi
          .vista()
          ?.feitas.includes('f9') ?? false,
      null,
      { timeout: 40_000 },
    );
  expect(await temFita(bia)).toBe(false);
  await bia.waitForFunction((m) => {
    const w = window as unknown as { __almaCrianca: { perfil: { moedas: number } } };
    return w.__almaCrianca.perfil.moedas >= m + 5;
  }, moedasBia, { timeout: 15_000 });
  await bia.waitForTimeout(2000);
  await bia.screenshot({ path: 'capturas-026c/amigos-f9-bia-festa.png' });
  // fecha a festa das duas (o "oba") antes da rampa
  for (const p of [ana, bia])
    for (let k = 0; k < 8; k++) {
      const ok = p.locator('[data-alma-festa] [data-alma-oba], [data-alma-festa] button');
      if (!(await ok.count())) break;
      await ok
        .first()
        .click()
        .catch(() => undefined);
      await p.waitForTimeout(900);
    }

  // na rampa: a Ana de skate no trilho, a Bia vê a Ana subir a curva
  await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const R = e.vila!()!.pontos.skate.rampa;
    e.vilaSkate!(true);
    e.teleportar!(R.x - 0.4, R.z, R.y + 0.2);
    e.apontar!(Math.PI / 2, 0.3);
  });
  await bia.evaluate(() => {
    const e = window.__brumaluz!;
    const R = e.vila!()!.pontos.skate.rampa;
    e.teleportar!(R.x, R.z1 + 4, R.y + 0.2);
    e.apontar!(Math.PI, 0.3);
  });
  await ana.waitForTimeout(3000);
  await ana.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await bia.waitForFunction(
    () => {
      const e = window.__brumaluz!;
      const R = e.vila!()!.pontos.skate.rampa;
      const a = (e.outrosJogadores?.() ?? []).find((q) => q.apelido === 'Ana');
      return !!a && a.y > R.y + 0.6;
    },
    null,
    { timeout: 20_000 },
  );
  await bia.screenshot({ path: 'capturas-026c/amigos-bia-ve-ana-na-rampa.png' });
  await ana.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await ana.context().close();
  await bia.context().close();
});
