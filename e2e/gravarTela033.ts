import { chromium, type Browser, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

declare const process: { env: Record<string, string | undefined> };

/**
 * Spec 033 (vídeos do esboço e da entrega): grava a tela inteira (o jogo e a interface por cima) pelo screencast do Chromium,
 * quadro a quadro, com a hora de cada um. O mp4 de 30 quadros constantes sai depois pelo
 * ffmpeg, com a `lista.txt` (cada quadro dura até o seguinte).
 *
 * No contêiner, a janela do navegador sem tela é menor que a tela do celular deitado e o
 * screencast (e o vídeo do Playwright) perdiam 88 px de baixo, onde fica a roleta: os vídeos
 * abrem um navegador próprio com a janela grande (`navegadorJanelaGrande`).
 */
export async function navegadorJanelaGrande(): Promise<Browser> {
  const gpu = process.env.E2E_GPU
    ? {
        ignoreDefaultArgs: ['--headless'],
        args: [
          '--headless=new',
          '--enable-gpu',
          '--ignore-gpu-blocklist',
          '--disable-software-rasterizer',
          '--use-gl=angle',
          '--use-angle=gl-egl',
        ],
      }
    : { args: ['--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] };
  return chromium.launch({ ...gpu, args: [...gpu.args, '--window-size=2000,2000'] });
}

export async function gravarTela(page: Page, dir: string, largura: number, altura: number) {
  mkdirSync(dir, { recursive: true });
  const cdp = await page.context().newCDPSession(page);
  const tempos: { arquivo: string; t: number }[] = [];
  let n = 0;
  // GRAVAR=fotos: cada quadro é uma foto da página inteira (mais lento, mas sem perder a parte de
  // baixo, que o screencast do contêiner cortava mesmo com a janela grande)
  if (process.env.GRAVAR === 'fotos') {
    let vivo = true;
    const laco = (async () => {
      while (vivo) {
        try {
          // (o Page.captureScreenshot cru também perdia os 88 px; a foto do Playwright não)
          const arquivo = `${String(n++).padStart(5, '0')}.jpg`;
          await page.screenshot({ path: `${dir}/${arquivo}`, type: 'jpeg', quality: 82, scale: 'css' });
          tempos.push({ arquivo, t: Date.now() / 1000 });
        } catch {
          break;
        }
      }
    })();
    return async () => {
      vivo = false;
      await laco;
      fechar();
    };
  }
  cdp.on('Page.screencastFrame', (f) => {
    const arquivo = `${String(n++).padStart(5, '0')}.jpg`;
    writeFileSync(`${dir}/${arquivo}`, Buffer.from(f.data, 'base64') as unknown as string);
    tempos.push({ arquivo, t: f.metadata.timestamp ?? Date.now() / 1000 });
    void cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => undefined);
  });
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 88,
    maxWidth: largura,
    maxHeight: altura,
    everyNthFrame: 1,
  });
  return async () => {
    await cdp.send('Page.stopScreencast').catch(() => undefined);
    await page.waitForTimeout(200);
    fechar();
  };
  function fechar(): void {
    const linhas: string[] = [];
    for (let i = 0; i < tempos.length; i++) {
      const d = i + 1 < tempos.length ? tempos[i + 1].t - tempos[i].t : 1 / 30;
      linhas.push(`file '${tempos[i].arquivo}'`, `duration ${Math.max(0.001, d).toFixed(4)}`);
    }
    if (tempos.length) linhas.push(`file '${tempos[tempos.length - 1].arquivo}'`);
    writeFileSync(`${dir}/lista.txt`, linhas.join('\n'));
    const dur = tempos.length > 1 ? tempos[tempos.length - 1].t - tempos[0].t : 0;
    console.log(
      `GRAVOU ${dir} ${tempos.length} quadros em ${dur.toFixed(1)} s (${(tempos.length / Math.max(0.1, dur)).toFixed(1)} por segundo)`,
    );
  };
}
