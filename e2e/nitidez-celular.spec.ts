import { expect, test, type Page } from '@playwright/test';

/**
 * Nitidez no celular (correção de 12 nov): o iPhone do dono ficou borrado (o jogo desenhava
 * com menos pixels que a própria tela, nível 2 a 2,5) e com uma faixa azul embaixo da barra.
 *
 * - Sempre: num celular emulado (toque, densidade 3), a escala nunca passa de 1 (pixels de
 *   CSS) e o canvas cobre a tela toda.
 * - MEDIR_NITIDEZ=1: o mundo da Lua à noite, com o boneco fantasiado, por 60 s (ou
 *   NITIDEZ_SEGUNDOS); imprime a escala, os quadros e os efeitos a cada 2 s. LIMITE_QUADROS=30
 *   imita o modo de pouca energia do iPhone (o Safari desenha no máximo 30 quadros);
 *   DESACELERAR_CPU=4, um celular médio; NITIDEZ_PASTA, onde salvar as capturas.
 */
declare const process: { env: Record<string, string | undefined> };

const IPHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });

async function noMundoDaLua(page: Page, tema = 'exploracao-lunar', extra = '') {
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  const limite = Number(process.env.LIMITE_QUADROS ?? 0);
  if (limite > 0)
    await page.addInitScript((fps: number) => {
      // o Safari no modo de pouca energia: no máximo `fps` quadros por segundo
      const raf = window.requestAnimationFrame.bind(window);
      const passo = 1000 / fps;
      // a decisão é por quadro: todos os pedidos do mesmo quadro passam ou esperam juntos
      let proximo = 0;
      let ultimoT = -1;
      let liberado = true;
      window.requestAnimationFrame = (f: FrameRequestCallback) =>
        raf(function quadro(t) {
          if (t !== ultimoT) {
            ultimoT = t;
            liberado = t + 2 >= proximo;
            if (liberado) proximo = Math.max(proximo + passo, t + passo - 4);
          }
          if (!liberado) return void raf(quadro);
          f(t);
        });
    }, limite);
  const lento = Number(process.env.DESACELERAR_CPU ?? 0);
  if (lento > 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: lento });
  }
  await page.goto(`/?tema=${tema}${extra}`);
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.92;
    e.personagem!.definir({
      corpo: 'masculino',
      cabeloEstilo: 0,
      rosto: 0,
      cabeloCor: 0,
      pele: 2,
      fantasia: { id: 'realeza-estrelas', cor: 0 },
    } as never);
    e.apontar!(0.6, 0.1);
  });
}

test.describe('celular', () => {
  test.use(IPHONE);

  test('a escala nunca passa de 1 e o canvas cobre a tela', async ({ page }) => {
    test.setTimeout(480_000);
    await noMundoDaLua(page);
    const escalas: number[] = [];
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(2500);
      escalas.push(await page.evaluate(() => window.__brumaluz!.escalaResolucao));
    }
    console.log(`ESCALAS ${JSON.stringify(escalas)}`);
    expect(Math.max(...escalas)).toBeLessThanOrEqual(1);
    const cobre = await page.evaluate(() => {
      const c = document.getElementById('cena')!.getBoundingClientRect();
      return { top: c.top, bottom: c.bottom, w: c.width, iw: innerWidth, ih: innerHeight };
    });
    expect(cobre.top).toBeLessThanOrEqual(0);
    expect(cobre.bottom).toBeGreaterThanOrEqual(cobre.ih);
    expect(cobre.w).toBeGreaterThanOrEqual(cobre.iw);
  });

  test('aberto pelo ícone (app) com a janela curta, o canvas vai até o fim da tela', async ({
    page,
  }) => {
    test.setTimeout(480_000);
    // o bicho do iPhone: como app, a janela vem 47 px mais baixa que a tela
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'standalone', { get: () => true });
      Object.defineProperty(screen, 'height', { get: () => window.innerHeight + 47 });
      Object.defineProperty(screen, 'width', { get: () => window.innerWidth });
    });
    await page.goto('/');
    await pronto(page);
    const r = await page.evaluate(() => {
      const c = document.getElementById('cena')!.getBoundingClientRect();
      return { top: c.top, altura: c.height, tela: screen.height, ih: innerHeight };
    });
    console.log(`APP ${JSON.stringify(r)}`);
    expect(r.top).toBe(0);
    expect(r.altura).toBe(r.tela);
  });

  test('medida: escala e quadros ao longo do tempo na Lua à noite', async ({ page }) => {
    test.skip(!process.env.MEDIR_NITIDEZ, 'medição só com MEDIR_NITIDEZ');
    const segundos = Number(process.env.NITIDEZ_SEGUNDOS ?? 60);
    test.setTimeout(300_000 + segundos * 1000);
    await noMundoDaLua(page);
    const pasta = process.env.NITIDEZ_PASTA ?? 'test-results/nitidez';
    const rotulo = process.env.NITIDEZ_ROTULO ?? 'medida';
    const t0 = Date.now();
    const linhas: string[] = [];
    while (Date.now() - t0 < segundos * 1000) {
      await page.waitForTimeout(2000);
      const s = await page.evaluate(() => {
        const e = window.__brumaluz! as unknown as Record<string, unknown>;
        return {
          fps: Math.round(Number(e.fps) * 10) / 10,
          escala: e.escalaResolucao,
          alivio: e.alivioEfeitos,
        };
      });
      linhas.push(`${Math.round((Date.now() - t0) / 1000)}s ${JSON.stringify(s)}`);
      console.log(`NITIDEZ ${rotulo} ${linhas[linhas.length - 1]}`);
    }
    await page.screenshot({ path: `${pasta}/${rotulo}.png` });
  });

  /**
   * MEDIR_TEMAS=1 (com E2E_SEM_VSYNC=1): o mesmo lugar à noite em cada tema, na densidade 3 da
   * tela (nível fixo 1/3, para a placa de vídeo pesar), com e sem cada efeito: o que pesa mais
   * na Lua que nos outros. TEMAS=a,b escolhe os temas.
   */
  test('medida: custo de cada tema e de cada efeito', async ({ page }) => {
    test.skip(!process.env.MEDIR_TEMAS, 'medição só com MEDIR_TEMAS');
    test.setTimeout(900_000);
    const temas = (process.env.TEMAS ?? 'exploracao-lunar,doce-reino,mata-encantada').split(',');
    const escala = process.env.NITIDEZ_ESCALA ?? '0.3333';
    for (const tema of temas) {
      await noMundoDaLua(page, tema, `&escala=${escala}`);
      await page.waitForTimeout(12_000);
      const r = await page.evaluate(async () => {
        const e = window.__brumaluz!;
        type M = {
          name: string;
          isVisible: boolean;
          isEnabled(): boolean;
          material?: { name: string; needAlphaBlending?(): boolean; getClassName(): string } | null;
          getTotalVertices(): number;
        };
        const sc = e.cenaBabylon!() as unknown as {
          meshes: M[];
          getActiveMeshes(): { length: number; data: M[] };
          effectLayers: { isEnabled: boolean; name: string }[];
          particleSystems: { name: string; getCapacity(): number; isStarted(): boolean }[];
          postProcessRenderPipelineManager: {
            supportedPipelines: {
              bloomEnabled: boolean;
              fxaaEnabled: boolean;
              imageProcessingEnabled: boolean;
            }[];
          };
          lights: { shadowEnabled?: boolean }[];
        };
        const medirFps = async (ms = 3000) => {
          await new Promise((r) => setTimeout(r, 600));
          let n = 0;
          const t0 = performance.now();
          const d0 = e.desenho!().chamadas;
          await new Promise<void>((ok) => {
            const f = () => {
              n++;
              if (performance.now() - t0 < ms) requestAnimationFrame(f);
              else ok();
            };
            requestAnimationFrame(f);
          });
          const t = performance.now() - t0;
          return {
            fps: Math.round((n / t) * 10000) / 10,
            draws: Math.round((e.desenho!().chamadas - d0) / n),
          };
        };
        const ativas = sc.getActiveMeshes().data.slice(0, sc.getActiveMeshes().length);
        const transp = ativas.filter((m) => m.material?.needAlphaBlending?.());
        const porNome: Record<string, number> = {};
        for (const m of ativas) {
          const k = m.name.replace(/[-_:]?\d.*$/, '');
          porNome[k] = (porNome[k] ?? 0) + 1;
        }
        const resumo = {
          ativas: ativas.length,
          verts: ativas.reduce((a, m) => a + m.getTotalVertices(), 0),
          transparentes: transp.length,
          vertsTransp: transp.reduce((a, m) => a + m.getTotalVertices(), 0),
          particulas: sc.particleSystems
            .filter((p) => p.isStarted())
            .map((p) => `${p.name}:${p.getCapacity()}`),
          topo: Object.entries(porNome)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12),
        };
        const pipe = sc.postProcessRenderPipelineManager.supportedPipelines[0]!;
        const glow = sc.effectLayers[0]!;
        const out: Record<string, unknown> = { resumo };
        out.todos = await medirFps();
        glow.isEnabled = false;
        out.semGlow = await medirFps();
        glow.isEnabled = true;
        pipe.bloomEnabled = false;
        out.semBloom = await medirFps();
        pipe.bloomEnabled = true;
        const boneco = sc.meshes.filter((m) => m.name.startsWith('personagem') && m.isVisible);
        for (const m of boneco) m.isVisible = false;
        out.semBoneco = await medirFps();
        for (const m of boneco) m.isVisible = true;
        // a conta do plástico (017) desligada: o material padrão puro
        type Plug = { _enable(v: boolean): void };
        const plugins = (
          sc as unknown as {
            materials: { pluginManager?: { getPlugin(n: string): Plug | null } }[];
          }
        ).materials
          .map((m) => m.pluginManager?.getPlugin('Plastico'))
          .filter((x): x is Plug => !!x);
        for (const pl of plugins) pl._enable(false);
        out.semPlastico = { ...(await medirFps()), plugins: plugins.length };
        for (const pl of plugins) pl._enable(true);
        // o tonemapping de antes da 017 (ACES) no lugar do neutro
        const ip = (pipe as unknown as { imageProcessing: { toneMappingType: number } })
          .imageProcessing;
        const tom = ip.toneMappingType;
        ip.toneMappingType = 1;
        out.comAces = await medirFps();
        ip.toneMappingType = tom;
        const ceu = sc.meshes.filter((m) => /^ceu|c[eé]u/i.test(m.name));
        for (const m of ceu) m.isVisible = false;
        out.semCeu = await medirFps();
        for (const m of ceu) m.isVisible = true;
        for (const m of transp) m.isVisible = false;
        out.semTransparentes = await medirFps();
        for (const m of transp) m.isVisible = true;
        const ps = sc.particleSystems.filter((p) => p.isStarted()) as unknown as {
          stop(): void;
          start(): void;
        }[];
        for (const p of ps) p.stop();
        out.semParticulas = await medirFps();
        for (const p of ps) p.start();
        return out;
      });
      console.log(`TEMA ${tema} ${JSON.stringify(r)}`);
      await page.screenshot({ path: `test-results/nitidez/tema-${tema}.png` });
    }
  });

  /**
   * MEDIR_SESSAO=1: uma sessão longa (SESSAO_MINUTOS, padrão 8) andando e girando na Lua à
   * noite, num nível fixo (NITIDEZ_ESCALA, padrão 1): os quadros caem com o tempo? Imprime a
   * cada 30 s quadros, desenhos, malhas, chunks, criaturas, memória e nós de som.
   */
  test('medida: sessão longa (os quadros caem com o tempo?)', async ({ page }) => {
    test.skip(!process.env.MEDIR_SESSAO, 'medição só com MEDIR_SESSAO');
    const minutos = Number(process.env.SESSAO_MINUTOS ?? 8);
    test.setTimeout(300_000 + minutos * 60_000);
    const escala = process.env.NITIDEZ_ESCALA ?? '1';
    await noMundoDaLua(page, process.env.TEMA ?? 'exploracao-lunar', `&escala=${escala}`);
    const t0 = Date.now();
    let volta = 0;
    let primeiro: number | undefined;
    let varrido = false;
    while (Date.now() - t0 < minutos * 60_000) {
      // anda 25 s numa direção (girando um pouco), e mede 5 s
      // SESSAO_PARADO=1: só gira no lugar (sem cair na água nem mudar de paisagem)
      await page.evaluate(
        ({ v, parado }) => {
          const e = window.__brumaluz!;
          e.apontar!(v * 0.9, 0.1);
          e.controleDireto!.mover(parado ? 0 : 1, 0);
        },
        { v: volta++, parado: !!process.env.SESSAO_PARADO },
      );
      await page.waitForTimeout(25_000);
      const r = await page.evaluate(async () => {
        const e = window.__brumaluz!;
        e.controleDireto!.mover(0, 0);
        let n = 0;
        const t = performance.now();
        const d0 = e.desenho!().chamadas;
        await new Promise<void>((ok) => {
          const f = () => {
            n++;
            if (performance.now() - t < 4000) requestAnimationFrame(f);
            else ok();
          };
          requestAnimationFrame(f);
        });
        const d = e.desenho!();
        const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
        const sc = e.cenaBabylon!() as unknown as {
          materials: unknown[];
          textures: unknown[];
          particleSystems: unknown[];
          geometries: unknown[];
        };
        return {
          fps: Math.round((n / (performance.now() - t)) * 10000) / 10,
          desenhos: Math.round((d.chamadas - d0) / n),
          malhas: d.malhas,
          ativas: d.ativas,
          geometrias: sc.geometries.length,
          materiais: sc.materials.length,
          texturas: sc.textures.length,
          particulas: sc.particleSystems.length,
          chunks: e.chunksCarregados,
          criaturas: e.criaturas?.().length,
          heapMB: mem ? Math.round(mem.usedJSHeapSize / 1e6) : undefined,
          escala: e.escalaResolucao,
          info: (e as unknown as { infoMundo?: string }).infoMundo,
          precipitacao: e.precipitacao,
          pos: e.posicao?.map((v) => Math.round(v)),
          hora: Math.round((e.hora ?? 0) * 100) / 100,
          particulasVivas: (sc.particleSystems as { name: string; getActiveCount(): number }[]).map(
            (p) => `${p.name}:${p.getActiveCount()}`,
          ),
        };
      });
      const seg = Math.round((Date.now() - t0) / 1000);
      console.log(`SESSAO ${seg}s ${JSON.stringify(r)}`);
      await page.screenshot({ path: `test-results/nitidez/sessao-${seg}s.png` });
      primeiro ??= r.fps;
      if (r.fps < primeiro * 0.5 && !varrido) {
        varrido = true;
        // onde foi o tempo: cada parte desligada por vez
        const v = await page.evaluate(async () => {
          const e = window.__brumaluz!;
          type M = { name: string; isVisible: boolean };
          const sc = e.cenaBabylon!() as unknown as {
            meshes: M[];
            effectLayers: { isEnabled: boolean }[];
            postProcessRenderPipelineManager: {
              supportedPipelines: { bloomEnabled: boolean; fxaaEnabled: boolean }[];
            };
            particleSystems: { stop(): void; start(): void }[];
          };
          const medir = async () => {
            await new Promise((r) => setTimeout(r, 500));
            let n = 0;
            const t = performance.now();
            await new Promise<void>((ok) => {
              const f = () => {
                n++;
                if (performance.now() - t < 2000) requestAnimationFrame(f);
                else ok();
              };
              requestAnimationFrame(f);
            });
            return Math.round((n / (performance.now() - t)) * 1000);
          };
          const out: Record<string, number | string> = { todos: await medir() };
          const esconder = async (rotulo: string, f: (m: M) => boolean) => {
            const ms = sc.meshes.filter((m) => m.isVisible && f(m));
            for (const m of ms) m.isVisible = false;
            out[`sem-${rotulo}(${ms.length})`] = await medir();
            for (const m of ms) m.isVisible = true;
          };
          const glow = sc.effectLayers[0]!;
          glow.isEnabled = false;
          out.semGlow = await medir();
          glow.isEnabled = true;
          const pipe = sc.postProcessRenderPipelineManager.supportedPipelines[0]!;
          pipe.bloomEnabled = false;
          out.semBloom = await medir();
          pipe.bloomEnabled = true;
          for (const p of sc.particleSystems) p.stop();
          out.semParticulas = await medir();
          for (const p of sc.particleSystems) p.start();
          const nomes = new Set(
            sc.meshes.filter((m) => m.isVisible).map((m) => m.name.replace(/[-_:]?\d.*$/, '')),
          );
          for (const n of nomes) await esconder(n, (m) => m.name.replace(/[-_:]?\d.*$/, '') === n);
          out.camera = JSON.stringify(e.camera?.posicao());
          return out;
        });
        console.log(`VARREDURA ${seg}s ${JSON.stringify(v)}`);
      }
    }
  });
});
