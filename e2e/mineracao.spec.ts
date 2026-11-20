import { expect, test, type Page } from '@playwright/test';

import { PASTA_CAPTURAS } from '../playwright.config';

const VIEWPORTS = [
  { nome: 'desktop', width: 1920, height: 1080 },
  { nome: 'tablet', width: 820, height: 1180 },
  { nome: 'celular', width: 390, height: 844 },
];

const PEDRA = 2;
const SLOT_PEDRA = 1;
const PLANTAS = [8, 9, 10];
const DURACAO_PEDRA = 1.6;

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console.error: ${m.text()}`);
  });
  return erros;
}

async function abrir(page: Page): Promise<void> {
  // spec 034: no Doce Reino, de terreno natural no nascimento (o "Meu primeiro mundo" era do
  // Bruma e Luz, que saiu; na Vila Neon, agora o padrão, o chão do bairro é protegido)
  await page.goto('/?tema=doce-reino');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 120_000,
  });
  // o mundo novo começa com a barra vazia: o teste põe o kit de blocos
  await page.evaluate(() => window.__brumaluz!.darKit?.());
  await page.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
  });
}

async function apontar(page: Page, yaw: number, pitch: number): Promise<void> {
  await page.evaluate(([y, p]) => window.__brumaluz!.apontar!(y, p), [yaw, pitch]);
  await page.waitForFunction(
    ([y, p]) => {
      const r = window.__brumaluz!.rotacao;
      return !!r && Math.abs(r[0] - p) < 1e-6 && Math.abs(r[1] - y) < 1e-6;
    },
    [yaw, pitch],
  );
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.alvo), { timeout: 30_000 })
    .not.toBeNull();
}

// Coloca um bloco de pedra na face apontada e volta a mirar nele.
async function prepararPedra(page: Page): Promise<{ x: number; y: number; z: number }> {
  await apontar(page, 0, 0.6);
  await page.evaluate((s) => window.__brumaluz!.selecionarSlot!(s), SLOT_PEDRA);
  const alvo = await page.evaluate(() => window.__brumaluz!.alvo!);
  const ok = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
  expect(ok).toBe(true);
  // mirando planta (grama alta, flor) o bloco a substitui no próprio lugar
  const noLugar = await page.evaluate(([a, b]) => window.__brumaluz!.bloco!(a.x, a.y, a.z) === b, [
    alvo,
    PEDRA,
  ] as const);
  const pos = noLugar
    ? { x: alvo.x, y: alvo.y, z: alvo.z }
    : { x: alvo.x + alvo.normal.x, y: alvo.y + alvo.normal.y, z: alvo.z + alvo.normal.z };
  await expect
    .poll(() => page.evaluate((p) => window.__brumaluz!.bloco!(p.x, p.y, p.z), pos))
    .toBe(PEDRA);
  await apontar(page, 0, 0.6);
  await expect
    .poll(() =>
      page.evaluate(() => {
        const a = window.__brumaluz!.alvo;
        return a ? window.__brumaluz!.bloco!(a.x, a.y, a.z) : -1;
      }),
    )
    .toBe(PEDRA);
  return pos;
}

async function esperarDecaimento(page: Page): Promise<void> {
  // Decaimento síncrono: 1,2 s de quadros sem segurar (o dano por bloco decai em 1 s).
  await page.evaluate(() => {
    window.__brumaluz!.minerar!(1.2, false);
    window.__brumaluz!.minerar!(1.2, false);
  });
}

test('minerar pedra por tempo: rachadura de 1 a 5 e quebra ao completar', async ({ page }) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const pos = await prepararPedra(page);

  // Tudo dentro de um único evaluate, para o decaimento em tempo real não interferir.
  const r = await page.evaluate(
    ([dur, p]) => {
      const g = window.__brumaluz!;
      const estagios: number[] = [];
      let tempo = 0;
      let quebrou = false;
      while (tempo < dur - 0.1 - 1e-9) {
        const m = g.minerar!(0.1, true);
        tempo += 0.1;
        quebrou = quebrou || m.quebrou;
        estagios.push(m.estagio);
      }
      const parcial = quebrou;
      const blocoAntes = g.bloco!(p.x, p.y, p.z);
      const final = g.minerar!(0.3, true);
      return { estagios, quebrou: parcial, blocoAntes, final: final.quebrou };
    },
    [DURACAO_PEDRA, pos] as const,
  );
  expect(r.quebrou).toBe(false);
  expect(r.blocoAntes).toBe(PEDRA);
  expect(new Set(r.estagios)).toEqual(new Set([1, 2, 3, 4, 5]));
  expect([...r.estagios].sort((a, b) => a - b)).toEqual(r.estagios);
  expect(r.final).toBe(true);
  await expect
    .poll(() => page.evaluate((p) => window.__brumaluz!.bloco!(p.x, p.y, p.z), pos))
    .toBe(0);
  expect(erros, erros.join('\n')).toEqual([]);
});

test('soltar zera o estágio em cerca de 1 s e planta quebra no primeiro golpe', async ({
  page,
}) => {
  test.setTimeout(240_000);
  const erros = coletarErros(page);
  await abrir(page);
  const pos = await prepararPedra(page);

  const parcial = await page.evaluate(() => window.__brumaluz!.minerar!(0.8, true));
  expect(parcial.quebrou).toBe(false);
  expect(parcial.estagio).toBeGreaterThan(0);
  const solto = await page.evaluate(() => window.__brumaluz!.minerar!(0, false));
  expect(solto.quebrou).toBe(false);
  const inicio = Date.now();
  await esperarDecaimento(page);
  const decorrido = Date.now() - inicio;
  expect(decorrido).toBeLessThan(5000);
  expect(await page.evaluate(() => window.__brumaluz!.mineracao!.estagio)).toBe(0);
  expect(await page.evaluate((p) => window.__brumaluz!.bloco!(p.x, p.y, p.z), pos)).toBe(PEDRA);

  // Procura uma planta mirando em volta.
  const planta = await page.evaluate(async (ids) => {
    const g = window.__brumaluz!;
    const quadro = () => new Promise((res) => requestAnimationFrame(() => res(null)));
    for (let i = 0; i < 48; i++) {
      for (const pitch of [-0.2, 0, 0.15, 0.3, 0.4, 0.55, 0.7, 0.85, 1.0, 1.2]) {
        g.apontar!((i * Math.PI) / 24, pitch);
        await quadro();
        await quadro();
        const a = g.alvo;
        if (a && ids.includes(g.bloco!(a.x, a.y, a.z))) return { x: a.x, y: a.y, z: a.z };
      }
    }
    return null;
  }, PLANTAS);
  test.info().annotations.push({
    type: 'planta',
    description: planta ? 'encontrada' : 'nenhuma planta no alcance',
  });
  expect(planta, 'nenhuma planta no alcance do spawn').not.toBeNull();
  const m = await page.evaluate(() => window.__brumaluz!.minerar!(0.25, true));
  expect(m.quebrou).toBe(true);
  await expect
    .poll(() => page.evaluate((p) => window.__brumaluz!.bloco!(p.x, p.y, p.z), planta!))
    .toBe(0);
  expect(erros, erros.join('\n')).toEqual([]);
});

for (const vp of VIEWPORTS) {
  test(`capturas de rachadura, fragmentos e colocação em ${vp.nome}`, async ({ page }) => {
    test.setTimeout(300_000);
    const erros = coletarErros(page);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await abrir(page);
    const foto = (nome: string) =>
      page.screenshot({ path: `${PASTA_CAPTURAS}/${nome}-${vp.nome}.png` });

    // Colocação: efeito logo após colocar.
    await apontar(page, 0, 0.6);
    await page.evaluate((s) => window.__brumaluz!.selecionarSlot!(s), SLOT_PEDRA);
    const colocou = await page.evaluate(() => window.__brumaluz!.interagir!('colocar'));
    expect(colocou).toBe(true);
    await expect
      .poll(() => page.evaluate(() => window.__brumaluz!.fx!.particulas), { timeout: 5_000 })
      .toBeGreaterThan(0);
    await foto('colocacao-efeito');
    await expect
      .poll(() => page.evaluate(() => window.__brumaluz!.fx!.particulas), { timeout: 10_000 })
      .toBe(0);

    await apontar(page, 0, 0.6);
    await expect
      .poll(() =>
        page.evaluate(() => {
          const a = window.__brumaluz!.alvo;
          return a ? window.__brumaluz!.bloco!(a.x, a.y, a.z) : -1;
        }),
      )
      .toBe(PEDRA);
    // Simula o botão esquerdo com o ponteiro travado (sem pointer lock real),
    // para o minerador do loop manter a rachadura visível durante a captura.
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')!;
      Object.defineProperty(document, 'pointerLockElement', { get: () => canvas });
    });
    for (let n = 1; n <= 5; n++) {
      await esperarDecaimento(page);
      const est = await page.evaluate(
        ([s]) => {
          document
            .querySelector('canvas')!
            .dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
          const m = window.__brumaluz!.minerar!(s, true);
          return { quebrou: m.quebrou, progresso: m.progresso };
        },
        [DURACAO_PEDRA * ((n - 1) / 5 + 0.02)],
      );
      expect(est.quebrou, `n=${n} p=${est.progresso}`).toBe(false);
      await expect
        .poll(() => page.evaluate(() => window.__brumaluz!.rachadura!.visivel), {
          message: `n=${n}`,
        })
        .toBe(true);
      // A captura é lenta em SwiftShader e a rachadura pode decair no meio:
      // repete até a rachadura seguir visível depois da foto.
      let visivelDepois = false;
      for (let tentativa = 0; tentativa < 4 && !visivelDepois; tentativa++) {
        if (tentativa > 0) {
          await page.evaluate(
            ([s]) => {
              document
                .querySelector('canvas')!
                .dispatchEvent(new MouseEvent('mousedown', { button: 0 }));
              window.__brumaluz!.minerar!(s, true);
            },
            [DURACAO_PEDRA * ((n - 1) / 5 + 0.02)],
          );
        }
        await foto(`rachadura-estagio-${n}`);
        visivelDepois = await page.evaluate(() => window.__brumaluz!.rachadura!.visivel);
      }
      expect(visivelDepois, `n=${n} ainda visível após a captura`).toBe(true);
      await page.evaluate(() => {
        window.dispatchEvent(new MouseEvent('mouseup', { button: 0 }));
      });
    }
    await esperarDecaimento(page);
    await expect.poll(() => page.evaluate(() => window.__brumaluz!.rachadura!.visivel)).toBe(false);

    // Fragmentos: logo após quebrar.
    const frag = await page.evaluate(async () => {
      const quadro = () => new Promise((res) => requestAnimationFrame(() => res(null)));
      const ok = window.__brumaluz!.interagir!('quebrar');
      await quadro();
      await quadro();
      return { ok, vivas: window.__brumaluz!.fx!.particulas };
    });
    expect(frag.ok).toBe(true);
    expect(frag.vivas).toBeGreaterThan(0);
    await foto('fragmentos-quebra');
    expect(erros, erros.join('\n')).toEqual([]);
  });
}
