import { test, type Page } from '@playwright/test';

/**
 * Desempenho do visual de brinquedo (spec 012): quadros por segundo sem o teto do monitor
 * (E2E_SEM_VSYNC=1), parado olhando o horizonte e girando a câmera, no mundo padrão.
 * Roda igual na versão de antes, para comparar. Só com MEDIR_DESEMPENHO=1.
 *
 * Spec 013 (critério 8): o mesmo, em pé ao lado de um sítio do Rancho Alegre (lavoura,
 * bichos do curral e moradores), na porteira do primeiro cercado olhando para dentro.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');

async function preparar(page: Page) {
  await page.setViewportSize({ width: 1280, height: 720 });
  // DESACELERAR_CPU=4: CPU como a de um celular médio
  const lento = Number(process.env.DESACELERAR_CPU ?? 0);
  if (lento > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
  }
}

async function pronto(page: Page) {
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

async function fecharEntrada(page: Page) {
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
}

/** Mede 6 s, parado ou girando a câmera a partir do yaw dado. */
async function medir(page: Page, girar: boolean, yaw0: number, pitch: number) {
  return page.evaluate(
    async ({ girar, yaw0, pitch }) => {
      const e = window.__brumaluz!;
      const amostras: number[] = [];
      let yaw = yaw0;
      const fim = performance.now() + 6000;
      let ultimo = performance.now();
      let quadros = 0;
      const d0 = e.desenho?.();
      await new Promise<void>((pronto) => {
        const passo = () => {
          const agora = performance.now();
          quadros++;
          if (girar) {
            yaw += (agora - ultimo) * 0.0008;
            e.apontar!(yaw, pitch);
          }
          amostras.push(agora - ultimo);
          ultimo = agora;
          if (agora < fim) requestAnimationFrame(passo);
          else pronto();
        };
        requestAnimationFrame(passo);
      });
      const d1 = e.desenho?.();
      amostras.sort((a, b) => a - b);
      return {
        fps: Math.round((quadros / 6) * 10) / 10,
        p95ms: Math.round(amostras[Math.floor(amostras.length * 0.95)] * 10) / 10,
        escala: e.escalaResolucao,
        chunks: e.chunksCarregados,
        desenhos: d0 && d1 ? Math.round((d1.chamadas - d0.chamadas) / quadros) : undefined,
        malhas: d1?.malhas,
        ativas: d1?.ativas,
      };
    },
    { girar, yaw0, pitch },
  );
}

/** Parado, girando e girando de novo com o perfil de CPU; imprime tudo. */
async function medirTudo(page: Page, rotulo: string, yaw0: number, pitch = 0.1) {
  await page.evaluate(({ y, p }) => window.__brumaluz!.apontar!(y, p), { y: yaw0, p: pitch });
  const parado = await medir(page, false, yaw0, pitch);
  const girando = await medir(page, true, yaw0, pitch);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const girando2 = await medir(page, true, yaw0, pitch);
  const { profile } = (await cdp.send('Profiler.stop')) as unknown as {
    profile: {
      nodes: {
        id: number;
        callFrame: { functionName: string; url: string; lineNumber: number; columnNumber: number };
      }[];
      samples: number[];
      timeDeltas: number[];
    };
  };
  const porNo = new Map<number, number>();
  profile.samples.forEach((id, i) =>
    porNo.set(id, (porNo.get(id) ?? 0) + (profile.timeDeltas[i] ?? 0)),
  );
  const porFuncao = new Map<string, number>();
  for (const n of profile.nodes) {
    const t = porNo.get(n.id) ?? 0;
    if (!t) continue;
    const f = n.callFrame;
    const k = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}:${f.columnNumber}`;
    porFuncao.set(k, (porFuncao.get(k) ?? 0) + t);
  }
  const top = [...porFuncao].sort((a, b) => b[1] - a[1]).slice(0, 25);
  for (const [k, t] of top) console.log(`PERFIL ${rotulo} ${(t / 1000).toFixed(1)}ms ${k}`);
  console.log(`DESEMPENHO ${rotulo} ${JSON.stringify({ parado, girando, girando2 })}`);
}

test('quadros por segundo, parado e girando', async ({ page }) => {
  test.setTimeout(300_000);
  await preparar(page);
  await page.goto('/');
  await pronto(page);
  await fecharEntrada(page);
  // espera o mundo em volta carregar
  await page.waitForTimeout(12_000);
  await medirTudo(page, 'padrao', 0);
});

test('quadros por segundo ao lado de um sítio do Rancho Alegre', async ({ page }) => {
  test.setTimeout(420_000);
  await preparar(page);
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-mundos]').click();
  await page.locator('.cartao-tema[data-tema="rancho-alegre"]').click();
  await page.locator('[data-modo="criativo"]').click();
  await page.locator('[data-novo-nome]').fill('Medida');
  await page.locator('[data-novo-semente]').fill(process.env.SEMENTE_SITIO ?? '1337');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  await fecharEntrada(page);
  // na porteira do primeiro cercado do sítio mais perto, olhando para dentro dele
  const lugar = await page.evaluate(() => {
    const p = window.__brumaluz!.povoados!()[0];
    if (!p?.foraPorteira || !p.porteira) return null;
    const [fx, fz] = p.foraPorteira;
    const [px, pz] = p.porteira;
    // dois passos mais para fora: o cercado, a lavoura e as casas cabem na vista
    const x = fx + 0.5 + (fx - px) * 2;
    const z = fz + 0.5 + (fz - pz) * 2;
    window.__brumaluz!.teleportar!(x, z);
    return { x, z, yaw: Math.atan2(px - fx, pz - fz), cx: p.cx, cz: p.cz };
  });
  if (!lugar) throw new Error('sem sítio com cercado perto do nascimento');
  // o chão do sítio carrega, os moradores e os bichos do curral aparecem
  await page.waitForTimeout(15_000);
  const perto = await page.evaluate(({ x, z }) => {
    const cs = window.__brumaluz!.criaturas!().filter((c) => Math.hypot(c.x - x, c.z - z) < 40);
    const n: Record<string, number> = {};
    for (const c of cs) n[c.tipo] = (n[c.tipo] ?? 0) + 1;
    return n;
  }, lugar);
  console.log(`SITIO ${JSON.stringify({ ...lugar, perto })}`);
  await medirTudo(page, 'rancho-sitio', lugar.yaw, 0.15);
});
