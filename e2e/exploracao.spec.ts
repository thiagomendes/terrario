import { expect, test, type Page } from '@playwright/test';

/**
 * Exploração automática (spec 007, critério 11): ~3 minutos de jogo em cada tema.
 * Anda, corre, pula, voa, nada, quebra e coloca blocos de todos os materiais,
 * anoitece e chove. Falha com erro na página, posição inválida, mundo sem malhas,
 * criatura presa dentro de bloco ou quadros longos demais.
 * Pesado: só roda com EXPLORACAO=1 (ou EXPLORACAO=<id>,<id>).
 */
declare const process: { env: Record<string, string | undefined> };
const pedido = process.env.EXPLORACAO;
const TODOS = [
  'bruma-e-luz',
  'planeta-vivo',
  'mata-encantada',
  'doce-reino',
  'era-dos-dinos',
  'exploracao-lunar',
];
const TEMAS = pedido && pedido !== '1' ? pedido.split(',') : TODOS;
test.skip(!pedido, 'exploração só com EXPLORACAO');

/** Um bloco de cada grupo de material (pedra, terra, areia, madeira, folhagem, cristal). */
const MATERIAIS = [2, 11, 3, 7, 5, 36, 6, 21, 46];

async function esperar(page: Page, ms: number) {
  await page.waitForTimeout(ms);
}

async function checarEstado(page: Page, etapa: string) {
  const s = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.posicao ?? [NaN, NaN, NaN];
    const presas = (e.criaturas?.() ?? []).filter((c) => {
      const b = e.bloco!(Math.floor(c.x), Math.floor(c.y + 0.3), Math.floor(c.z));
      return b !== 0 && b !== 67 && ![8, 9, 10, 26, 33, 54, 37].includes(b);
    }).length;
    return { p, malhas: e.malhasAtivas ?? 0, presas, fps: e.fps };
  });
  expect(s.p.every(Number.isFinite), `${etapa}: posição inválida ${s.p}`).toBe(true);
  expect(s.malhas, `${etapa}: mundo sem malhas`).toBeGreaterThan(0);
  expect(s.presas, `${etapa}: criatura presa num bloco`).toBe(0);
  return s;
}

for (const id of TEMAS) {
  test(`exploração automática: ${id}`, async ({ page }) => {
    test.setTimeout(900_000);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/AudioContext|favicon/i.test(m.text())) erros.push(m.text());
    });
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto(`/?tema=${id}`);
    await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
      timeout: 180_000,
    });
    expect(await page.evaluate(() => window.__brumaluz!.tema)).toBe(id);
    // relógio de quadros: guarda os intervalos entre quadros
    await page.evaluate(() => {
      const w = window as unknown as { __quadros: number[] };
      w.__quadros = [];
      let ultimo = performance.now();
      const passo = (t: number) => {
        w.__quadros.push(t - ultimo);
        ultimo = t;
        requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    });
    const c = 'window.__brumaluz.controleDireto';
    const fazer = (js: string) => page.evaluate(js);

    // andar e correr em círculo
    await fazer(`${c}.mover(1, 0)`);
    for (let i = 0; i < 12; i++) {
      await fazer(`${c}.olhar(40, 0)`);
      if (i === 4) await fazer(`${c}.tecla('correr', true)`);
      if (i % 3 === 0) {
        await fazer(`${c}.tecla('pular', true)`);
        await esperar(page, 120);
        await fazer(`${c}.tecla('pular', false)`);
      }
      await esperar(page, 900);
    }
    await fazer(`${c}.tecla('correr', false)`);
    await fazer(`${c}.mover(0, 0)`);
    await checarEstado(page, 'andar');

    // voar: dois toques no pulo
    for (let i = 0; i < 2; i++) {
      await fazer(`${c}.tecla('pular', true)`);
      await esperar(page, 60);
      await fazer(`${c}.tecla('pular', false)`);
      await esperar(page, 90);
    }
    await fazer(`${c}.tecla('pular', true)`);
    await esperar(page, 1500);
    await fazer(`${c}.tecla('pular', false)`);
    await fazer(`${c}.mover(1, 0.3)`);
    await esperar(page, 5000);
    await fazer(`${c}.mover(0, 0)`);
    await checarEstado(page, 'voar');

    // quebrar cada material: põe o bloco à frente, mira nele e confere que sumiu
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x0, , z0] = e.posicao!.map(Math.floor);
      e.teleportar!(x0 + 0.5, z0 + 0.5);
    });
    await esperar(page, 600);
    let quebrados = 0;
    const falhas: string[] = [];
    for (const m of MATERIAIS) {
      const pos = await page.evaluate((m) => {
        const e = window.__brumaluz!;
        // posicao é o olho da câmera: o bloco vai na altura do peito, dois blocos à frente
        const [ex, ey, ez] = e.posicao!;
        const x = Math.floor(ex);
        const y = Math.floor(ey) - 1;
        const z = Math.floor(ez) + 2;
        // caminho livre entre o olho e o bloco (o terreno em volta pode estar na frente)
        for (let dz = 1; dz < 2; dz++)
          for (const yy of [y, y + 1]) e.definirBloco!(x, yy, Math.floor(ez) + dz, 0);
        e.definirBloco!(x, y, z, m);
        // mira no centro do bloco (yaw 0 olha para +z; pitch positivo olha para baixo)
        const dx = x + 0.5 - ex;
        const dy = y + 0.5 - ey;
        const dz = z + 0.5 - ez;
        e.apontar!(Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
        return { x, y, z };
      }, m);
      // espera a mira achar o bloco recém-colocado (o primeiro passa pelo worker de edição)
      await page
        .waitForFunction(
          (p) => {
            const a = window.__brumaluz!.alvo;
            return !!a && a.x === p.x && a.y === p.y && a.z === p.z;
          },
          pos,
          { timeout: 5000 },
        )
        .catch(() => undefined);
      const r = await page.evaluate((p) => {
        const e = window.__brumaluz!;
        const a = e.alvo;
        if (!a || a.x !== p.x || a.y !== p.y || a.z !== p.z)
          return `mira em ${a ? `${a.x},${a.y},${a.z}` : 'nada'} em vez de ${p.x},${p.y},${p.z}`;
        if (!e.interagir!('quebrar')) return 'quebrar recusou';
        const b = e.bloco!(p.x, p.y, p.z);
        return b === 0 ? '' : `ficou o bloco ${b}`;
      }, pos);
      if (!r) quebrados++;
      else falhas.push(`bloco ${m}: ${r}`);
    }
    expect(falhas, 'materiais que não quebraram').toEqual([]);
    await esperar(page, 1200);
    for (let i = 0; i < 5; i++) {
      await page.evaluate((i) => window.__brumaluz!.selecionarSlot!(i), i);
      await fazer(`${c}.usar()`);
      await esperar(page, 250);
    }
    await checarEstado(page, 'materiais');

    // nadar: procura água e mergulha
    const agua = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x0, , z0] = e.posicao!.map(Math.floor);
      for (let r = 8; r < 300; r += 6)
        for (let a = 0; a < 20; a++) {
          const x = Math.round(x0 + Math.cos((a / 20) * Math.PI * 2) * r);
          const z = Math.round(z0 + Math.sin((a / 20) * Math.PI * 2) * r);
          if (e.blocoGerado!(x, 61, z) === 67 && e.blocoGerado!(x, 57, z) === 67) {
            e.teleportar!(x + 0.5, z + 0.5, 59);
            return true;
          }
        }
      return false;
    });
    if (agua) {
      await esperar(page, 4000);
      await fazer(`${c}.mover(1, 0)`);
      await fazer(`${c}.tecla('pular', true)`);
      await esperar(page, 4000);
      await fazer(`${c}.tecla('pular', false)`);
      await fazer(`${c}.mover(0, 0)`);
      await checarEstado(page, 'nadar');
    }

    // anoitecer, chuva e criaturas por perto
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.hora = 0.7;
      e.definirClima!('chuva');
      const [x, y, z] = e.posicao!;
      for (const t of ['cervo', 'coelho', 'raposa']) e.invocar!(t as never, x + 3, y + 1, z + 3);
    });
    await esperar(page, 15_000);
    await page.evaluate(() => (window.__brumaluz!.hora = 0.95));
    await esperar(page, 15_000);
    await checarEstado(page, 'noite e chuva');

    const quadros = await page.evaluate(
      () => (window as unknown as { __quadros: number[] }).__quadros,
    );
    const ordenados = [...quadros].sort((a, b) => a - b);
    const p95 = ordenados[Math.floor(ordenados.length * 0.95)];
    test.info().annotations.push({
      type: 'quadros',
      description: `${id}: ${quadros.length} quadros, p95 ${p95.toFixed(0)} ms, pior ${ordenados[ordenados.length - 1].toFixed(0)} ms`,
    });
    // WebGL por software (SwiftShader) roda a uns 3 quadros por segundo (p95 de 450 a 650 ms
    // em todos os temas, inclusive o base): o limite pega travamentos, não o FPS
    expect(
      p95,
      `quadros longos demais: p95 ${p95.toFixed(0)} ms em ${quadros.length} quadros`,
    ).toBeLessThan(1000);
    expect(erros).toEqual([]);
  });
}
