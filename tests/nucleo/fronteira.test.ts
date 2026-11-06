import { describe, expect, it } from 'vitest';

/**
 * Spec 009, critério 2: o núcleo é puro. Nenhum arquivo que ele alcança por import
 * (que carrega código, não só tipos) pode depender de desenho, interface, áudio de
 * verdade, Babylon ou DOM.
 */
const FONTES = import.meta.glob('../../src/**/*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;
const PROIBIDOS = [/^@babylonjs/, /\/render\//, /\/ui\//];
const DOM = /\b(window|document|localStorage|requestAnimationFrame|HTMLElement)\b/;
// variacao.ts é só o gerador de números (sem Web Audio)
const PERMITIDOS_EM_AUDIO = new Set(['../../src/audio/variacao.ts']);

function normalizar(caminho: string): string {
  const partes: string[] = [];
  for (const p of caminho.split('/')) {
    if (p === '..' && partes.length && partes[partes.length - 1] !== '..') partes.pop();
    else if (p !== '.') partes.push(p);
  }
  return partes.join('/');
}

function resolver(de: string, alvo: string): string {
  if (!alvo.startsWith('.')) return alvo;
  const base = normalizar(`${de.slice(0, de.lastIndexOf('/'))}/${alvo}`);
  for (const c of [base, `${base}.ts`, `${base}/index.ts`]) if (c in FONTES) return c;
  return base;
}

function alcancados(): Map<string, string[]> {
  const vistos = new Map<string, string[]>();
  const fila = Object.keys(FONTES).filter(
    (f) => f.startsWith('../../src/nucleo/') && !f.endsWith('.worker.ts'),
  );
  while (fila.length) {
    const f = fila.pop()!;
    if (vistos.has(f)) continue;
    const imports = [
      ...FONTES[f].matchAll(
        /(?:^|\n)\s*(?:import|export)(?!\s+type\b)[^'"]*?from\s+['"]([^'"]+)['"]/g,
      ),
    ].map((m) => resolver(f, m[1]));
    vistos.set(f, imports);
    for (const i of imports) if (i in FONTES) fila.push(i);
  }
  return vistos;
}

describe('fronteira do núcleo', () => {
  const grafo = alcancados();

  it('alcança os módulos de regras e não os de desenho', () => {
    expect([...grafo.keys()]).toContain('../../src/nucleo/nucleo.ts');
    expect([...grafo.keys()]).toContain('../../src/jogo/populacao.ts');
    for (const [f, imports] of grafo) {
      for (const i of imports) {
        for (const p of PROIBIDOS) expect(i, `${f} importa ${i}`).not.toMatch(p);
        if (i.includes('/audio/'))
          expect(PERMITIDOS_EM_AUDIO.has(i), `${f} importa ${i}`).toBe(true);
      }
    }
  });

  it('nenhum arquivo alcançado usa o DOM', () => {
    for (const f of grafo.keys()) {
      const texto = FONTES[f].replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(DOM.test(texto), `${f} usa o DOM`).toBe(false);
    }
  });
});
