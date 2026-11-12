import type { Page } from '@playwright/test';

/**
 * O palco dos esboços da spec 014 (`src/esboco/`): abre o jogo com `?esboco=...`, acha um
 * lugar plano e livre, monta a cidade e esconde a interface. Usado por esboco-cidade e
 * esboco-veiculos (só rodam com ESBOCO_CIDADE=1).
 */
export type V3 = [number, number, number];

export async function abrirPalco(page: Page, w: number, h: number, esboco = 'cidade') {
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({
          distancia: 6,
          mostrarFps: false,
          qualidade: 'alta',
          mostrarAtalhos: false,
        }),
      );
    } catch {
      // sem armazenamento: fica a distância padrão
    }
  });
  page.on('pageerror', (err) => console.log('erro na página:', String(err)));
  page.on('console', (m) => {
    if (m.text().startsWith('pedreiro') || m.text().startsWith('esboco'))
      console.log(m.text().slice(0, 1500));
  });
  await page.goto(`/?tema=rancho-alegre&esboco=${esboco}`);
  await page.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__esboco,
    undefined,
    {
      timeout: 180_000,
    },
  );
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.4;
    e.definirClima?.('limpo');
  });
  // espera os pedaços do mundo pararem de chegar
  let antes = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 20) break;
    antes = n;
  }
  console.log('chunks', antes);
  // longe de povoado e sítio (o que o mundo construiu é protegido e não sai do palco), em
  // terra firme e mais ou menos plana
  for (let k = 1; k < 20; k++) {
    const x = k * 520 + 40;
    const z = -k * 290 + 40;
    const longe = await page.evaluate(
      ([x, z]) => {
        const e = window.__brumaluz!;
        e.teleportar!(x, z);
        const perto = e.povoados!()[0];
        return perto ? Math.hypot(perto.cx - x, perto.cz - z) : 1e9;
      },
      [x, z] as const,
    );
    if (longe < 200) continue;
    await page.waitForTimeout(9000);
    const chao = await page.evaluate(
      ([x, z]) => {
        const e = window.__brumaluz!;
        const alt: number[] = [];
        for (let dx = -50; dx <= 50; dx += 10)
          for (let dz = -35; dz <= 35; dz += 10)
            for (let y = 120; y > 1; y--) {
              const b = e.bloco!(x + dx, y, z + dz);
              if (b) {
                alt.push(b === 67 ? -1 : y);
                break;
              }
            }
        return alt;
      },
      [x, z] as const,
    );
    // nada protegido no palco (estrutura rara do tema): o palco não conseguiria tirar
    const protegido = await page.evaluate(
      ([x, z]) => {
        const e = window.__brumaluz!;
        for (let dx = -64; dx <= 64; dx += 3)
          for (let dz = -48; dz <= 48; dz += 3)
            for (let y = 58; y < 110; y += 2) {
              const p = e.protecao!(x + dx, y, z + dz);
              if (p && p !== 'livre') return true;
            }
        return false;
      },
      [x, z] as const,
    );
    if (protegido) {
      console.log('lugar', k, 'tem estrutura protegida');
      continue;
    }
    const terra = chao.filter((h) => h > 63);
    const desvio = terra.length ? Math.max(...terra) - Math.min(...terra) : 99;
    console.log('lugar', k, x, z, 'terra', terra.length, '/', chao.length, 'desnível', desvio);
    if (terra.length >= chao.length * 0.95 && desvio < 14) break;
  }
  antes = -1;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(2000);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 20) break;
    antes = n;
  }
  await page.evaluate(() => window.__esboco!.montar());
  await page.waitForTimeout(9000);
  // só o 3D na foto
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
}

export const pontosDoPalco = (page: Page) => page.evaluate(() => window.__esboco!.pontos);
export async function camera(page: Page, pos: V3, alvo: V3, fov = 55) {
  await page.evaluate(([a, b, f]) => window.__esboco!.camera(a, b, f), [pos, alvo, fov] as const);
  await page.waitForTimeout(900);
}
