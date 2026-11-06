import type { DefItem } from '../jogo/itens';

/** Ícones pixel-art (16x16 ampliados) para itens que não são blocos. */
export function pintarIconeItem(ctx: CanvasRenderingContext2D, def: DefItem): void {
  const desenho = DESENHOS[def.id] ?? DESENHOS[`tipo:${def.tipo}`];
  ctx.imageSmoothingEnabled = false;
  const px = 4;
  if (!desenho) {
    ctx.fillStyle = def.cor ?? '#c9c2b6';
    ctx.fillRect(16, 16, 32, 32);
    return;
  }
  const paleta: Record<string, string> = {
    ...desenho.paleta,
    '*': def.cor ?? desenho.paleta['*'] ?? '#ffffff',
  };
  desenho.linhas.forEach((linha, y) => {
    [...linha].forEach((ch, x) => {
      const cor = paleta[ch];
      if (!cor) return;
      ctx.fillStyle = cor;
      ctx.fillRect(x * px, y * px, px, px);
    });
  });
}

export interface Desenho {
  paleta: Record<string, string>;
  linhas: string[];
}

/** Registro de desenhos por id de item; outras tarefas acrescentam os seus. */
export const DESENHOS: Record<string, Desenho> = {};

export function registrarDesenho(id: string, d: Desenho): void {
  DESENHOS[id] = d;
}
