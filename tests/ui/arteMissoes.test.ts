import { describe, expect, it } from 'vitest';
import { MISSOES } from '../../src/jogo/alma';
import { ARTE } from '../../src/ui/alma/arte';
import { ARTE_VILA } from '../../src/ui/alma/arteVila';

describe('os desenhos das missões (spec 031 e 026)', () => {
  it('toda missão de desenho próprio tem os desenhos dela (nenhum cai na estrela de reserva)', () => {
    for (const m of MISSOES) {
      const d = m.desenho;
      if (d.tipo !== 'arte') continue;
      const nomes = [d.principal, d.selo, d.resultado, d.bolinha, d.placa, ...(d.bolinhas ?? [])];
      for (const n of nomes) {
        if (n.includes(':')) continue;
        expect(ARTE[n], `${m.id}: ${n}`).toBeTruthy();
      }
    }
  });

  it('026 (etapa B): as missões do parque e as dicas de toque da rua têm desenho, sem letra', () => {
    const nomes = [
      'bilhete',
      'bilheteCarimbado',
      'carimbo',
      'carimboRoda',
      'carimboCavalinho',
      'carimboCarrinho',
      'balaoPreso',
      'balaoParque',
      'balaoNaMao',
      'cocho',
      'lhamaComendo',
      'pelucia',
      'argola',
      'peixinho',
      'vovo',
      'vovoPresente',
      'dicaPegarBalao',
      'dicaFeno',
      'dicaCocho',
      'dicaArgola',
      'dicaPescaria',
      'dicaTelefone',
      'dicaFita',
      'dicaVitamina',
      'dicaRevista',
      'feno',
      'sentarBrinquedo',
    ];
    for (const n of nomes) {
      expect(ARTE_VILA[n], n).toMatch(/^<svg viewBox="0 0 64 64"/);
      expect(ARTE[n], n).toBe(ARTE_VILA[n]);
      expect(ARTE_VILA[n], n).not.toMatch(/<text|NaN|undefined/);
    }
    // a mãozinha de "pegar" (o selo da f6) é a do jogo todo
    expect(ARTE.pegar).toBeTruthy();
    // o balão de fala do presente do nível 6 continua sendo o dele (a Vila não troca)
    expect(ARTE.balao).toContain('#ffc93d');
  });
});
