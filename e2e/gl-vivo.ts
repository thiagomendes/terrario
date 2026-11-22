import type { Page } from '@playwright/test';

/**
 * T23: o que está vivo na placa, contado no WebGL desde a hora da chamada: buffers, texturas,
 * VAOs, framebuffers e renderbuffers criados e ainda não apagados, e os bytes dos buffers e das
 * texturas (o nível 0). Só conta o que foi criado depois de ligar (o que já existia não entra nem
 * quando é apagado). Para achar o que acumula na página de uma missão para a outra.
 */
export async function contarGl(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __gl?: () => Record<string, number> };
    if (w.__gl) return;
    const P = WebGL2RenderingContext.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
    const vivos: Record<string, Set<object>> = { buffer: new Set(), textura: new Set(), vao: new Set(), fb: new Set(), rb: new Set() };
    const bytes = new Map<object, number>();
    const pares: [string, string, string][] = [
      ['createBuffer', 'deleteBuffer', 'buffer'],
      ['createTexture', 'deleteTexture', 'textura'],
      ['createVertexArray', 'deleteVertexArray', 'vao'],
      ['createFramebuffer', 'deleteFramebuffer', 'fb'],
      ['createRenderbuffer', 'deleteRenderbuffer', 'rb'],
    ];
    for (const [criar, apagar, tipo] of pares) {
      const c = P[criar];
      const a = P[apagar];
      P[criar] = function (this: unknown, ...args: unknown[]) {
        const o = c.apply(this, args) as object;
        if (o) vivos[tipo].add(o);
        return o;
      };
      P[apagar] = function (this: unknown, ...args: unknown[]) {
        const o = args[0] as object;
        if (o) {
          vivos[tipo].delete(o);
          bytes.delete(o);
        }
        return a.apply(this, args);
      };
    }
    // o buffer ligado em cada alvo e a textura ligada em cada unidade
    const ligado = new Map<number, object>();
    const texLigada = new Map<number, object>();
    let unidade = 0;
    const bind = P.bindBuffer;
    P.bindBuffer = function (this: unknown, ...args: unknown[]) {
      ligado.set(args[0] as number, args[1] as object);
      return bind.apply(this, args);
    };
    const data = P.bufferData;
    P.bufferData = function (this: unknown, ...args: unknown[]) {
      const b = ligado.get(args[0] as number);
      const t = args[1];
      if (b) bytes.set(b, typeof t === 'number' ? t : ((t as ArrayBufferView)?.byteLength ?? 0));
      return data.apply(this, args);
    };
    const ativa = P.activeTexture;
    P.activeTexture = function (this: unknown, ...args: unknown[]) {
      unidade = args[0] as number;
      return ativa.apply(this, args);
    };
    const bindTex = P.bindTexture;
    P.bindTexture = function (this: unknown, ...args: unknown[]) {
      texLigada.set(unidade * 100000 + (args[0] as number), args[1] as object);
      return bindTex.apply(this, args);
    };
    const tamanhoTex = (alvo: number, n: number) => {
      const t = texLigada.get(unidade * 100000 + alvo);
      if (t) bytes.set(t, Math.max(bytes.get(t) ?? 0, n));
    };
    const img = P.texImage2D;
    P.texImage2D = function (this: unknown, ...args: unknown[]) {
      if (args[1] === 0) {
        const fonte = args[args.length - 1] as { width?: number; height?: number } | null;
        const [w, h] = typeof args[3] === 'number' && typeof args[4] === 'number' && args.length >= 9 ? [args[3], args[4]] : [fonte?.width ?? 0, fonte?.height ?? 0];
        tamanhoTex(args[0] as number, (w as number) * (h as number) * 4);
      }
      return img.apply(this, args);
    };
    const sto = P.texStorage2D;
    P.texStorage2D = function (this: unknown, ...args: unknown[]) {
      tamanhoTex(args[0] as number, (args[3] as number) * (args[4] as number) * 4 * ((args[1] as number) > 1 ? 1.33 : 1));
      return sto.apply(this, args);
    };
    w.__gl = () => {
      const r: Record<string, number> = {};
      for (const k of Object.keys(vivos)) r[k] = vivos[k].size;
      let mb = 0;
      for (const v of bytes.values()) mb += v;
      r.mb = Math.round(mb / 1e5) / 10;
      return r;
    };
  });
}

/** A contagem de agora (null se não ligou ou se a página não responde). */
export async function lerGl(page: Page): Promise<Record<string, number> | null> {
  try {
    return await page.evaluate(() => (window as unknown as { __gl?: () => Record<string, number> }).__gl?.() ?? null);
  } catch {
    return null;
  }
}
