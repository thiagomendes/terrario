import { test } from '@playwright/test';

/**
 * Desempenho do visual de brinquedo (spec 012): quadros por segundo sem o teto do monitor
 * (E2E_SEM_VSYNC=1), parado olhando o horizonte e girando a câmera, no mundo padrão.
 * Roda igual na versão de antes, para comparar. Só com MEDIR_DESEMPENHO=1.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.MEDIR_DESEMPENHO, 'medição só com MEDIR_DESEMPENHO');

test('quadros por segundo, parado e girando', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
  // espera o mundo em volta carregar
  await page.waitForTimeout(12_000);
  const medir = async (girar: boolean) =>
    page.evaluate(async (girar) => {
      const e = window.__brumaluz!;
      const amostras: number[] = [];
      let yaw = 0;
      const fim = performance.now() + 6000;
      let ultimo = performance.now();
      let quadros = 0;
      await new Promise<void>((pronto) => {
        const passo = () => {
          const agora = performance.now();
          quadros++;
          if (girar) {
            yaw += (agora - ultimo) * 0.0008;
            e.apontar!(yaw, 0.1);
          }
          amostras.push(agora - ultimo);
          ultimo = agora;
          if (agora < fim) requestAnimationFrame(passo);
          else pronto();
        };
        requestAnimationFrame(passo);
      });
      amostras.sort((a, b) => a - b);
      return {
        fps: Math.round((quadros / 6) * 10) / 10,
        p95ms: Math.round(amostras[Math.floor(amostras.length * 0.95)] * 10) / 10,
        escala: e.escalaResolucao,
        chunks: e.chunksCarregados,
      };
    }, girar);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0.1));
  const parado = await medir(false);
  const girando = await medir(true);
  // de novo, gravando o perfil de CPU (o que pesa nos quadros lentos)
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  const girando2 = await medir(true);
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
  for (const [k, t] of top) console.log(`PERFIL ${(t / 1000).toFixed(1)}ms ${k}`);
  console.log(`DESEMPENHO ${JSON.stringify({ parado, girando, girando2 })}`);
});
