import { expect, test, type Page } from '@playwright/test';
import { criarMundo, TAMANHOS } from './guia-palco';

/**
 * Spec 027 (T04 e T05): o campo de visão sem buracos na Noite das Fantasias (a regra da Vila
 * Neon). Anda pela vila inteira na distância de sempre (3 pedaços) e, a cada quadro, confere que:
 * - nenhuma peça da festa (a abóbora gigante, as barracas, as portas...) está em cima de chunk sem
 *   malha;
 * - nenhum pedaço de sósia de longe (a torre do castelinho, a abóbora) aparece junto com o chunk
 *   de verdade (nada em dobro);
 * - ao abrir o mundo, o chão em volta de onde a criança nasce já está todo desenhado.
 */
test.setTimeout(600_000);

type V2 = [number, number];

async function abrir(page: Page) {
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
  await criarMundo(page, 'campo-festa', 'noite-das-fantasias', {}, 1337);
  await page.goto('/?mundo=campo-festa');
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
        const v = e.bailePecas?.();
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

for (const tamanho of ['pc', 'deitado'] as const) {
  test(`campo de visão sem buracos na festa (${tamanho})`, async ({ browser }) => {
    const ctx = await browser.newContext(TAMANHOS[tamanho]);
    const page = await ctx.newPage();
    page.on('pageerror', (err) => console.log(`erro na página: ${String(err)}`));
    await abrir(page);
    const aoAbrir = await page.evaluate(() => {
      const e = window.__brumaluz!;
      return { carregados: e.chunksCarregados ?? 0, tem: !!e.baile?.() };
    });
    expect(aoAbrir.tem).toBe(true);
    expect(aoAbrir.carregados).toBeGreaterThanOrEqual(25);
    const p = await page.evaluate(() => {
      const b = window.__brumaluz!.baile!()!;
      return { ox: b.ox, oz: b.oz, h: b.h };
    });
    // da praça à rua, à Vovó, de volta, ao bosque, ao castelinho, ao gramado, à horta e à loja
    const rota: V2[] = [
      [68, 70],
      [51, 40],
      [51, 12],
      [51, 40],
      [44, 67],
      [24, 76],
      [14, 90],
      [30, 71],
      [68, 76],
      [68, 95],
      [90, 76],
      [100, 90],
      [88, 57],
      [68, 70],
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
        const r = await vigiar(page, 1000);
        quadros += r.quadros;
        problemas.push(...r.problemas);
      }
    }
    console.log(`quadros vigiados ${quadros}, problemas ${problemas.length}`);
    expect(quadros).toBeGreaterThan(200);
    expect(problemas).toEqual([]);
    // as peças apareceram de verdade (o teste não passa no vazio)
    const fim = await page.evaluate(() => window.__brumaluz!.bailePecas!()!);
    expect(fim.chunks).toBeGreaterThan(5);
    await ctx.close();
  });
}
