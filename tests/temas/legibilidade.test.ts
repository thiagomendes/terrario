import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { PINTORES } from '../../src/art/atlas';
import { NOMES_TILES, TILES_PECAS } from '../../src/art/tiles';
import type { Px, Tema } from '../../src/temas/tipos';

/**
 * Legibilidade medida (spec 007, critério 4): minério se destaca da pedra, flores se
 * destacam do chão, água se distingue da areia e da grama, e nenhum tile fica quase
 * igual a outro de função diferente.
 */
type Grade = Px[];
function grade(t: Tema, nome: string): Grade {
  const p = t.pintores[nome] ?? PINTORES[nome];
  const g: Grade = [];
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.push(p(x, y, 4242));
  return g;
}
function media(g: Grade): [number, number, number] {
  let r = 0;
  let gg = 0;
  let b = 0;
  let n = 0;
  for (const p of g) {
    if (p[3] < 128) continue;
    r += p[0];
    gg += p[1];
    b += p[2];
    n++;
  }
  return n ? [r / n, gg / n, b / n] : [0, 0, 0];
}
const dist = (a: readonly number[], b: readonly number[]) =>
  Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Diferença média por pixel (0..441) entre dois tiles, contando transparência. */
function diferenca(a: Grade, b: Grade): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) {
    const va = a[i][3] < 128;
    const vb = b[i][3] < 128;
    if (va && vb) continue;
    s += va !== vb ? 255 : dist(a[i], b[i]);
  }
  return s / a.length;
}
const luz = (p: readonly number[]) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];

const MINERIOS = ['min_carvao', 'min_cobre', 'min_ferro', 'min_ouro', 'min_luzita'];
const PLANTAS_DE_DESTAQUE = ['flor', 'cogumelo', 'frutinhas'];

/** Pares que podem ser parecidos de propósito (mesmo bloco ou variação dele). */
const PARENTES: [string, string][] = [
  ['fornalha_frente', 'fornalha_acesa'],
  ['fornalha_lado', 'fornalha_topo'],
  ['abobora_lado', 'abobora_rosto'],
  ['abobora_lado', 'abobora_topo'],
  ['tabuas', 'tabuas_betula'],
  ['tabuas', 'tabuas_pinho'],
  ['tabuas_betula', 'tabuas_pinho'],
  ['mesa_lado', 'mesa_frente'],
  ['bau_lado', 'bau_frente'],
  ['bau_lado', 'bau_topo'],
  ['bau_topo', 'bau_frente'],
  ['arenito_lado', 'arenito_topo'],
  ['cacto_lado', 'cacto_topo'],
  ['neve', 'neve_lado'],
  ['areia', 'areia_deserto'],
  ['pedra', 'pedregulho'],
  ['pedra', 'pedra_lisa'],
  ['pedra', 'rocha_matriz'],
  ['pedregulho', 'cascalho'],
  ['terra', 'lama'],
  ['grama_topo', 'pantano_topo'],
  ['grama_lado', 'pantano_lado'],
  ['tronco_topo', 'tronco'],
  ['betula_topo', 'betula'],
  ['pinho_topo', 'pinho'],
  ['tronco_lanterna_topo', 'tronco_lanterna'],
  ['folhas', 'folhas_outono'],
  ['folhas', 'folhas_betula'],
  ['folhas', 'folhas_pinho'],
  ['cama_lado', 'cama_topo'],
  ['tijolos', 'tijolos_pedra'],
  ['tocha', 'lanterna'],
  // a fornalha é feita de pedregulho
  ['pedregulho', 'fornalha_lado'],
  ['pedregulho', 'fornalha_topo'],
  // spec 027: o topo e o lado do mesmo bloco da Noite das Fantasias
  ['telha_roxa', 'telha_roxa_topo'],
  ['toldinho', 'toldinho_topo'],
];
const parentes = (a: string, b: string) =>
  PARENTES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

describe.each(temasDisponiveis().map((id) => [id, obterTema(id)] as [string, Tema]))(
  'tema %s: legibilidade',
  (_id, t) => {
    const cache = new Map<string, Grade>();
    const g = (n: string) => {
      let v = cache.get(n);
      if (!v) {
        v = grade(t, n);
        cache.set(n, v);
      }
      return v;
    };

    it('minérios se destacam da pedra (pintas visíveis)', () => {
      const pedra = g('pedra');
      for (const m of MINERIOS) {
        const o = g(m);
        // pelo menos 8% dos pixels bem diferentes da pedra
        let fortes = 0;
        for (let i = 0; i < o.length; i++) if (dist(o[i], pedra[i]) > 60) fortes++;
        expect(fortes / o.length, `${m} some na pedra`).toBeGreaterThanOrEqual(0.08);
      }
      // e um minério não é igual a outro
      for (let i = 0; i < MINERIOS.length; i++)
        for (let j = i + 1; j < MINERIOS.length; j++)
          expect(
            dist(media(g(MINERIOS[i])), media(g(MINERIOS[j]))) +
              diferenca(g(MINERIOS[i]), g(MINERIOS[j])) / 4,
            `${MINERIOS[i]} parecido com ${MINERIOS[j]}`,
          ).toBeGreaterThan(14);
    });

    it('flores, cogumelos e frutinhas se destacam da grama', () => {
      const chao = media(g('grama_topo'));
      for (const p of PLANTAS_DE_DESTAQUE) {
        const pix = g(p).filter((q) => q[3] >= 128);
        expect(pix.length, `${p} sem pixels`).toBeGreaterThan(12);
        // a parte mais chamativa (10% mais distantes) contrasta com o chão
        const d = pix.map((q) => dist(q, chao)).sort((a, b) => b - a);
        const topo = d.slice(0, Math.max(3, Math.floor(d.length * 0.1)));
        const m = topo.reduce((s, v) => s + v, 0) / topo.length;
        expect(m, `${p} some na grama`).toBeGreaterThan(70);
      }
    });

    it('água se distingue da areia, da grama e da pedra', () => {
      const agua = t.agua.fundoDia.map((v) => v * 255);
      for (const n of ['areia', 'grama_topo', 'pedra', 'areia_deserto']) {
        expect(dist(agua, media(g(n))), `água parecida com ${n}`).toBeGreaterThan(40);
      }
    });

    it('nenhum tile quase igual a outro de função diferente', () => {
      // o tile branco das peças de brinquedo não é de bloco
      const nomes = NOMES_TILES.filter((n) => !TILES_PECAS.includes(n));
      const iguais: string[] = [];
      for (let i = 0; i < nomes.length; i++)
        for (let j = i + 1; j < nomes.length; j++) {
          const a = nomes[i];
          const b = nomes[j];
          if (parentes(a, b)) continue;
          const d = diferenca(g(a), g(b));
          if (d <= 12) iguais.push(`${a} ~ ${b} (${d.toFixed(1)})`);
        }
      expect(iguais, 'tiles quase iguais').toEqual([]);
    });

    it('plantas em cruz têm silhueta (transparência) e não são um quadrado cheio', () => {
      for (const p of [
        'grama_alta',
        'flor',
        'cogumelo',
        'arbusto_seco',
        'junco',
        'frutinhas',
        'tocha',
      ]) {
        const v = g(p).filter((q) => q[3] < 128).length / 256;
        expect(v, `${p} sem recorte`).toBeGreaterThan(0.2);
      }
    });

    it('luz no céu: a noite é escura e o meio-dia é claro', () => {
      const q = t.quadrosCeu;
      const meiaNoite = q[0];
      const meioDia = q.reduce((a, b) => (Math.abs(b.h - 0.5) < Math.abs(a.h - 0.5) ? b : a));
      expect(luz(meioDia.luz.map((v) => v * 255)) * meioDia.il).toBeGreaterThan(
        luz(meiaNoite.luz.map((v) => v * 255)) * meiaNoite.il,
      );
    });
  },
);
