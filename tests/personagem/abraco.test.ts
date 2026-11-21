import { describe, expect, it } from 'vitest';
import { DURACAO_ABRACO, ABRACO } from '../../src/jogo/baile';
import {
  DISTANCIA_ABRACO,
  DISTANCIA_ABRACO_CHAPEU,
  distanciaDoAbraco,
  SAIDA_ABRACO,
  camadaDeAbraco,
  lugarDoBentoNoAbraco,
  pesoDoAbraco,
  yawDaCriancaNoAbraco,
} from '../../src/personagem/abraco';
import { criarAnimador } from '../../src/player/animacao';
import type { InfoCamada } from '../../src/personagem/poses';

/** Spec 027 (T11): a animação de dois corpos do abraço do Bento, nas contas. */
const parado = (dt: number): InfoCamada => ({ dt, tempo: 0, andando: false, noChao: true, voando: false, ocupado: false });

describe('o abraço do Bento (T11)', () => {
  it('entra, balança 1,2 s e solta (o peso)', () => {
    expect(DURACAO_ABRACO).toBeCloseTo(ABRACO.entra + 1.2 + ABRACO.sai, 6);
    expect(pesoDoAbraco(0)).toBe(0);
    expect(pesoDoAbraco(ABRACO.entra)).toBeCloseTo(1, 6);
    expect(pesoDoAbraco(ABRACO.entra + 0.6)).toBeCloseTo(1, 6);
    expect(pesoDoAbraco(DURACAO_ABRACO)).toBe(0);
    expect(pesoDoAbraco(DURACAO_ABRACO + 0.1)).toBe(0);
  });

  it('a camada do Bento e a da criança mudam a pose e acabam sozinhas', () => {
    for (const papel of ['bento', 'crianca'] as const) {
      const an = criarAnimador();
      const base = an.atualizar(0.016, { velocidadeHoriz: 0, correndo: false, noChao: true, voando: false });
      const c = camadaDeAbraco(papel);
      let meio = null as ReturnType<typeof c>;
      let t = 0;
      let fim = -1;
      while (t < DURACAO_ABRACO + 0.5) {
        const r = c({ ...base }, parado(0.05));
        t += 0.05;
        if (Math.abs(t - (ABRACO.entra + 0.3)) < 0.026) meio = r;
        if (!r && fim < 0) fim = t;
      }
      // no meio do abraço os dois braços vão para a frente
      expect(meio, papel).not.toBeNull();
      expect(meio!.bracoDireito).toBeLessThan(-0.9);
      expect(meio!.bracoEsquerdo).toBeLessThan(-0.9);
      // o Bento dobra os joelhos (desce) com a cabeça para trás (as cabeças grandes nunca se batem)
      if (papel === 'bento') {
        expect(meio!.corpoY ?? 0).toBeLessThan(base.corpoY ?? base.tronco);
        expect(meio!.troncoX ?? 0).toBeLessThan(0);
      }
      expect(fim).toBeGreaterThan(DURACAO_ABRACO - 0.06);
      expect(fim).toBeLessThan(DURACAO_ABRACO + 0.11);
    }
  });

  it('mexer no controle solta a criança na hora (o Bento só solta quando mandam)', () => {
    const an = criarAnimador();
    const base = an.atualizar(0.016, { velocidadeHoriz: 0, correndo: false, noChao: true, voando: false });
    const c = camadaDeAbraco('crianca');
    for (let i = 0; i < 12; i++) c({ ...base }, parado(0.05));
    expect(c.ativa).toBe(true);
    // anda: sai em 0,15 s
    let t = 0;
    let r: unknown = c({ ...base }, { ...parado(0.05), andando: true });
    t += 0.05;
    while (r && t < 1) {
      r = c({ ...base }, { ...parado(0.05), andando: true });
      t += 0.05;
    }
    expect(c.ativa).toBe(false);
    expect(t).toBeLessThanOrEqual(SAIDA_ABRACO + 0.06);
    // o do Bento não solta porque alguém anda: só no "soltar"
    const b = camadaDeAbraco('bento');
    for (let i = 0; i < 12; i++) expect(b({ ...base }, { ...parado(0.05), andando: true })).not.toBeNull();
    b.soltar();
    expect(b.ativa).toBe(false);
  });

  it('o chapéu de aba afasta o Bento um tico (a aba chega na altura do rosto dele)', () => {
    expect(distanciaDoAbraco(null)).toBe(DISTANCIA_ABRACO);
    expect(distanciaDoAbraco({ corpo: 'feminino', acessorio: 'nenhum' })).toBe(DISTANCIA_ABRACO);
    expect(distanciaDoAbraco({ corpo: 'feminino', acessorio: 'chapeu-palha' })).toBe(DISTANCIA_ABRACO_CHAPEU);
    expect(distanciaDoAbraco({ corpo: 'feminino', acessorio: 'nenhum', fantasia: { id: 'vovo-bruxa', cor: 0 } })).toBe(
      DISTANCIA_ABRACO_CHAPEU,
    );
    expect(distanciaDoAbraco({ corpo: 'masculino', acessorio: 'nenhum', fantasia: { id: 'lulu-fantasma', cor: 0 } })).toBe(
      DISTANCIA_ABRACO,
    );
  });

  it('quem vê o abraço chegar atrasado entra no mesmo ponto', () => {
    const c = camadaDeAbraco('bento', 1.0);
    expect(c.tempo).toBeCloseTo(1.0, 6);
  });

  it('o Bento chega à frente da criança, de frente para ela, e ela olha para ele', () => {
    const crianca = { x: 10, z: 5 };
    const bento = { x: 12, z: 5 };
    const longe = lugarDoBentoNoAbraco(crianca, bento, 0);
    expect(longe.x).toBeCloseTo(12, 6);
    const perto = lugarDoBentoNoAbraco(crianca, bento, 1);
    expect(Math.hypot(perto.x - crianca.x, perto.z - crianca.z)).toBeCloseTo(DISTANCIA_ABRACO, 6);
    // o Bento olha para -x (para ela); ela olha para +x (para ele)
    expect(Math.sin(perto.yaw)).toBeCloseTo(-1, 6);
    expect(Math.sin(yawDaCriancaNoAbraco(crianca, bento))).toBeCloseTo(1, 6);
  });
});
