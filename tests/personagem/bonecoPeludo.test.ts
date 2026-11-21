import { afterEach, describe, expect, it } from 'vitest';
import { aparenciaPadrao, vestirFantasia } from '../../src/personagem/aparencia';
import { planoBoneco } from '../../src/personagem/boneco';
import {
  definirPeloDeTeste,
  ESTILOS_PELO,
  PELO_EM_USO,
  peloEmUso,
  type EstiloPelo,
} from '../../src/personagem/bonecoPeludo';

/**
 * Spec 027 (T08): o pelo do Bento em três versões, todas verde-musgo; a versão em uso é a
 * recomendada (tufos grandes e redondos) até o dono escolher outra.
 */
const plano = (estilo: EstiloPelo, cabeloEstilo = 0) => {
  definirPeloDeTeste(estilo);
  const p = planoBoneco(vestirFantasia({ ...aparenciaPadrao(), cabeloEstilo }, 'bento-peludo'));
  definirPeloDeTeste(null);
  return p;
};
const tufos = (estilo: EstiloPelo) => plano(estilo).pecas.filter((p) => p.nome.startsWith('peludo-tufo'));

describe('o pelo do Bento (spec 027, T08)', () => {
  afterEach(() => definirPeloDeTeste(null));

  it('a versão em uso é a recomendada, e o gancho de teste volta a ela', () => {
    expect(PELO_EM_USO).toBe('tufos');
    definirPeloDeTeste('mechas');
    expect(peloEmUso()).toBe('mechas');
    definirPeloDeTeste(null);
    expect(peloEmUso()).toBe('tufos');
  });

  it('as três versões são de formas diferentes, todas no mesmo verde-musgo e foscas', () => {
    const contas = ESTILOS_PELO.map((e) => tufos(e).length);
    expect(new Set(contas).size).toBe(3);
    // os miúdos são os mais cheios; as mechas, as de gotas mais compridas
    expect(contas[1]).toBeGreaterThan(contas[0]);
    for (const e of ESTILOS_PELO)
      for (const t of tufos(e)) {
        expect(t.brilho).toBe(0);
        // os três tons bem próximos do verde-musgo (nada de azul nem verde-folha)
        const v = parseInt(t.cor.slice(1), 16);
        const [r, g, b] = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
        expect(g).toBeGreaterThan(b);
        expect(g - r).toBeLessThan(25);
        expect(Math.abs(g - 0x74)).toBeLessThan(16);
      }
  });

  it('a mesma aparência monta sempre o mesmo pelo', () => {
    for (const e of ESTILOS_PELO) expect(JSON.stringify(tufos(e))).toBe(JSON.stringify(tufos(e)));
  });

  it('o cabelo fica guardado dentro do capuz (nada de faixa de cabelo em cima dos olhos)', () => {
    for (let c = 0; c < 8; c++) {
      const p = plano('tufos', c);
      const cabelo = p.pecas.filter(
        (q) => (q.junta === 'cabeca' || q.junta === 'topete') && /^(cabelo|topete|franja)/.test(q.nome),
      );
      expect(cabelo.map((q) => q.nome), `cabelo ${c}`).toEqual([]);
    }
  });

  it('a franja fica acima dos olhos e os chifrinhos saem por cima do pelo do capuz', () => {
    for (const e of ESTILOS_PELO) {
      const p = plano(e);
      const olhos = p.pecas.filter((q) => q.junta === 'cabeca' && /^olho/.test(q.nome));
      expect(olhos.length).toBeGreaterThan(0);
      const altoDosOlhos = Math.max(...olhos.map((q) => q.pos[1] + q.tamanho[1]));
      // os tufos da franja (os da frente do rosto, mais para a frente que o capuz)
      const frente = p.pecas.filter(
        (q) => q.nome.startsWith('peludo-tufo') && q.junta === 'cabeca' && q.pos[2] > 0.27 && Math.abs(q.pos[0]) < 0.25,
      );
      expect(frente.length, e).toBeGreaterThan(5);
      for (const t of frente)
        if (Math.abs(t.pos[0]) < 0.25) expect(t.pos[1] - t.tamanho[1], `${e} ${t.nome}`).toBeGreaterThan(altoDosOlhos - 0.02);
      const chifres = p.pecas.filter((q) => q.nome.startsWith('peludo-chifre'));
      expect(chifres).toHaveLength(2);
    }
  });
});
