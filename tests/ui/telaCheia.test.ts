import { afterEach, describe, expect, it, vi } from 'vitest';

/** Spec 012: em tela cheia o Esc é do jogo (o teclado trava o Esc onde o navegador deixa). */
describe('tela cheia e o Esc', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('trava o Esc ao entrar na tela cheia e destrava ao sair', async () => {
    const ouvintes: Record<string, (() => void)[]> = {};
    const el = {
      requestFullscreen: async () => {
        doc.fullscreenElement = el;
        for (const f of ouvintes['fullscreenchange'] ?? []) f();
      },
    };
    const doc = {
      fullscreenElement: null as unknown,
      fullscreenEnabled: true,
      documentElement: el,
      exitFullscreen: async () => {
        doc.fullscreenElement = null;
        for (const f of ouvintes['fullscreenchange'] ?? []) f();
      },
      addEventListener: (t: string, f: () => void) => (ouvintes[t] ??= []).push(f),
    };
    const lock = vi.fn(async () => undefined);
    const unlock = vi.fn();
    vi.stubGlobal('document', doc);
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
    vi.stubGlobal('navigator', { keyboard: { lock, unlock } });
    const { entrarTelaCheia, sairTelaCheia } = await import('../../src/ui/telaCheia');
    entrarTelaCheia();
    await Promise.resolve();
    expect(lock).toHaveBeenCalledWith(['Escape']);
    sairTelaCheia();
    await Promise.resolve();
    expect(unlock).toHaveBeenCalled();
  });
});
