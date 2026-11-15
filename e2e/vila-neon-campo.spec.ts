import { expect, test, type Page } from '@playwright/test';

/**
 * Spec 026 (Vila Neon): o campo de visão sem buracos (pedido do dono, 15 nov 2026; a lição dos
 * carrinhos voando da 014). Anda pelo bairro inteiro na distância de sempre (3 pedaços) e, a
 * cada quadro, confere que:
 * - nenhuma peça do bairro (letreiro, brinquedo, carro, palco) está em cima de chunk sem malha;
 * - nenhum pedaço de sósia de longe aparece junto com o chunk de verdade (nada em dobro);
 * - ao abrir o mundo, o chão em volta de onde a criança nasce já está todo desenhado.
 */
test.setTimeout(600_000);

type V2 = [number, number];

async function abrir(page: Page, celular: boolean) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  await page.goto(`/?tema=vila-neon${celular ? '&detalhe=baixo' : ''}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
}

/** Junta, por um tempo, os problemas de cada quadro (peça sem chão, sósia em dobro). */
async function vigiar(page: Page, ms: number): Promise<{ quadros: number; problemas: string[] }> {
  return page.evaluate(async (ms) => {
    const e = window.__brumaluz!;
    const problemas: string[] = [];
    let quadros = 0;
    const fim = performance.now() + ms;
    await new Promise<void>((pronto) => {
      const passo = () => {
        const v = e.vilaPecas?.();
        if (v) {
          quadros++;
          if (v.semChao > 0) problemas.push(`semChao=${v.semChao}`);
          for (const s of v.sosiaEmDobro) problemas.push(`dobro ${s}`);
        }
        if (performance.now() < fim) requestAnimationFrame(passo);
        else pronto();
      };
      requestAnimationFrame(passo);
    });
    return { quadros, problemas: problemas.slice(0, 20) };
  }, ms);
}

for (const celular of [false, true]) {
  test(`campo de visão sem buracos (${celular ? 'celular' : 'computador'})`, async ({
    browser,
  }) => {
    const ctx = await browser.newContext(
      celular
        ? { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }
        : { viewport: { width: 1280, height: 720 } },
    );
    const page = await ctx.newPage();
    await abrir(page, celular);
    // ao abrir: todo chunk no raio em volta do nascer já tem malha (a cortina só sai assim)
    const aoAbrir = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const p = e.vila!()!;
      return { carregados: e.chunksCarregados ?? 0, nascer: p.nascimento };
    });
    expect(aoAbrir.carregados).toBeGreaterThanOrEqual(25);
    // anda pelo bairro: da pracinha à rua, ao festival, ao palco, ao rinque e de volta
    const p = await page.evaluate(() => {
      const v = window.__brumaluz!.vila!()!;
      return { ox: v.ox, oz: v.oz, h: v.h, nascer: v.nascimento };
    });
    const rota: V2[] = [
      [113, 79],
      [100, 66],
      [60, 64],
      [30, 64],
      [60, 66],
      [61, 90],
      [80, 112],
      [100, 90],
      [138, 88],
      [138, 120],
      [170, 64],
      [113, 79],
    ];
    const problemas: string[] = [];
    let quadros = 0;
    for (let i = 1; i < rota.length; i++) {
      const [a, b] = [rota[i - 1], rota[i]];
      const passos = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4);
      for (let k = 1; k <= passos; k++) {
        const x = p.ox + a[0] + ((b[0] - a[0]) * k) / passos;
        const z = p.oz + a[1] + ((b[1] - a[1]) * k) / passos;
        await page.evaluate(
          ([x, z, y]) => {
            const e = window.__brumaluz!;
            e.voar?.(true);
            e.teleportar!(x, z, y);
          },
          [x, z, p.h + 2.2] as const,
        );
        // ~4 blocos por segundo: um passo de 4 blocos por segundo de vigia
        const r = await vigiar(page, 1000);
        quadros += r.quadros;
        problemas.push(...r.problemas);
      }
    }
    console.log(`quadros vigiados ${quadros}, problemas ${problemas.length}`);
    expect(quadros).toBeGreaterThan(200);
    expect(problemas).toEqual([]);
    // e as peças apareceram de verdade (o teste não passa no vazio)
    const fim = await page.evaluate(() => window.__brumaluz!.vilaPecas!()!);
    expect(fim.chunks).toBeGreaterThan(5);
    await ctx.close();
  });
}
