import type { Page } from '@playwright/test';
import { writeFileSync } from 'node:fs';

/**
 * Grava só o desenho do jogo (o canvas da cena), de dentro da página, num .webm por trecho:
 * começa e termina exatamente onde o teste pede (o vídeo do Playwright conta o tempo de outro
 * jeito e as marcas escorregavam). O mp4 sai pelo ffmpeg à parte.
 */
export async function comecarGravacao(p: Page, fps = 30): Promise<void> {
  await p.evaluate((f) => {
    const canvas = document.getElementById('cena') as HTMLCanvasElement;
    const stream = canvas.captureStream(f);
    const tipo = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType: tipo, videoBitsPerSecond: 10_000_000 });
    const partes: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) partes.push(e.data);
    };
    rec.start(250);
    (window as unknown as { __gravacao: { rec: MediaRecorder; partes: Blob[] } }).__gravacao = {
      rec,
      partes,
    };
  }, fps);
}

export async function pararGravacao(p: Page, caminho: string): Promise<void> {
  const b64 = await p.evaluate(async () => {
    const g = (window as unknown as { __gravacao: { rec: MediaRecorder; partes: Blob[] } })
      .__gravacao;
    await new Promise<void>((r) => {
      g.rec.onstop = () => r();
      g.rec.stop();
    });
    const blob = new Blob(g.partes, { type: 'video/webm' });
    const buf = new Uint8Array(await blob.arrayBuffer());
    let s = '';
    for (let i = 0; i < buf.length; i += 0x8000)
      s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
    return btoa(s);
  });
  writeFileSync(caminho, Buffer.from(b64, 'base64') as unknown as string);
}
