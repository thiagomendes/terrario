import { describe, expect, it } from 'vitest';
import { manterTelaLigada } from '../../src/ui/telaLigada';

class TravaFalsa {
  released = false;
  private fns: (() => void)[] = [];
  addEventListener(_t: 'release', fn: () => void): void {
    this.fns.push(fn);
  }
  async release(): Promise<void> {
    this.solta();
  }
  /** O navegador soltando sozinho (página escondida). */
  solta(): void {
    if (this.released) return;
    this.released = true;
    for (const f of this.fns) f();
  }
}

function montar(opcoes: { falhaAte?: number; visivel?: boolean } = {}) {
  const travas: TravaFalsa[] = [];
  let pedidos = 0;
  const nav = {
    wakeLock: {
      request: async (_t: 'screen') => {
        pedidos++;
        if (pedidos <= (opcoes.falhaAte ?? 0)) throw new Error('NotAllowedError');
        const t = new TravaFalsa();
        travas.push(t);
        return t;
      },
    },
  };
  const ouvintes = new Map<string, () => void>();
  let visibilidade: DocumentVisibilityState = opcoes.visivel === false ? 'hidden' : 'visible';
  const doc = {
    get visibilityState() {
      return visibilidade;
    },
    addEventListener: (tipo: string, fn: () => void) => ouvintes.set(tipo, fn),
    removeEventListener: (tipo: string) => ouvintes.delete(tipo),
  } as unknown as Document;
  return {
    doc,
    nav,
    travas,
    pedidos: () => pedidos,
    ouvintes,
    mostrar(v: DocumentVisibilityState) {
      visibilidade = v;
      ouvintes.get('visibilitychange')?.();
    },
    tocar: () => ouvintes.get('pointerdown')?.(),
  };
}

const passar = () => new Promise((r) => setTimeout(r, 0));

describe('tela sempre ligada no jogo', () => {
  it('pede a trava ao entrar e não pede duas vezes', async () => {
    const m = montar();
    manterTelaLigada(m.doc, m.nav);
    await passar();
    m.tocar();
    await passar();
    expect(m.pedidos()).toBe(1);
    expect(m.travas[0].released).toBe(false);
  });

  it('pede de novo quando a página volta a aparecer', async () => {
    const m = montar();
    manterTelaLigada(m.doc, m.nav);
    await passar();
    m.travas[0].solta();
    m.mostrar('hidden');
    await passar();
    expect(m.pedidos()).toBe(1);
    m.mostrar('visible');
    await passar();
    expect(m.pedidos()).toBe(2);
    expect(m.travas[1].released).toBe(false);
  });

  it('se o navegador recusa sem toque, tenta de novo no primeiro toque', async () => {
    const m = montar({ falhaAte: 1 });
    manterTelaLigada(m.doc, m.nav);
    await passar();
    expect(m.travas).toHaveLength(0);
    m.tocar();
    await passar();
    expect(m.travas).toHaveLength(1);
  });

  it('com a página escondida não pede', async () => {
    const m = montar({ visivel: false });
    manterTelaLigada(m.doc, m.nav);
    await passar();
    expect(m.pedidos()).toBe(0);
  });

  it('desligar solta a trava e para de ouvir', async () => {
    const m = montar();
    const desligar = manterTelaLigada(m.doc, m.nav);
    await passar();
    desligar();
    await passar();
    expect(m.travas[0].released).toBe(true);
    expect(m.ouvintes.size).toBe(0);
  });

  it('navegador sem o recurso: não faz nada', () => {
    const m = montar();
    expect(() => manterTelaLigada(m.doc, {})()).not.toThrow();
  });
});
