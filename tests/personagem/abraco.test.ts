import { describe, expect, it } from 'vitest';
import { DURACAO_ABRACO, ABRACO } from '../../src/jogo/baile';
import {
  DISTANCIA_ABRACO,
  DISTANCIA_ABRACO_CAPUZ,
  DISTANCIA_ABRACO_CHAPEU,
  DISTANCIA_ABRACO_GOLA,
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
      // as cabeças deitam uma na outra: o Bento curva para a frente, por cima dela, e os dois
      // inclinam para o lado um do outro
      if (papel === 'bento') expect(meio!.troncoX ?? 0).toBeGreaterThan(0.1);
      expect(Math.abs(meio!.cabecaLado ?? 0)).toBeGreaterThan(0.15);
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

  it('o que ela tem na cabeça afasta o Bento um tico (chapéu de aba, capuz, gola alta)', () => {
    expect(distanciaDoAbraco(null)).toBe(DISTANCIA_ABRACO);
    expect(distanciaDoAbraco({ corpo: 'feminino', acessorio: 'nenhum' })).toBe(DISTANCIA_ABRACO);
    expect(distanciaDoAbraco({ corpo: 'feminino', acessorio: 'chapeu-palha' })).toBe(DISTANCIA_ABRACO_CHAPEU);
    expect(distanciaDoAbraco({ corpo: 'feminino', acessorio: 'nenhum', fantasia: { id: 'vovo-bruxa', cor: 0 } })).toBe(
      DISTANCIA_ABRACO_CHAPEU,
    );
    expect(distanciaDoAbraco({ corpo: 'masculino', acessorio: 'nenhum', fantasia: { id: 'lulu-fantasma', cor: 0 } })).toBe(
      DISTANCIA_ABRACO_CAPUZ,
    );
    for (const id of ['dudu-vampiro', 'bento-peludo'])
      expect(distanciaDoAbraco({ corpo: 'feminino', acessorio: 'nenhum', fantasia: { id, cor: 0 } })).toBe(DISTANCIA_ABRACO_GOLA);
  });

  it('quem vê o abraço chegar atrasado entra no mesmo ponto', () => {
    const c = camadaDeAbraco('bento', 1.0);
    expect(c.tempo).toBeCloseTo(1.0, 6);
  });

  it('o Bento chega ao lado dela, meio virado para ela, e ela vira um tico para ele', () => {
    const crianca = { x: 10, z: 5 };
    const bento = { x: 12, z: 5 };
    const longe = lugarDoBentoNoAbraco(crianca, bento, 0);
    expect(longe.x).toBeCloseTo(12, 6);
    // de longe ele vem de frente para ela (olha para -x)
    expect(Math.sin(longe.yaw)).toBeCloseTo(-1, 6);
    const perto = lugarDoBentoNoAbraco(crianca, bento, 1);
    expect(Math.hypot(perto.x - crianca.x, perto.z - crianca.z)).toBeCloseTo(DISTANCIA_ABRACO, 6);
    // ela de frente para o posto (+x): a esquerda dela é +z; ele fica do lado esquerdo dela
    expect(perto.z).toBeGreaterThan(crianca.z + 0.8);
    // ele olha para ela (o vetor dele aponta para o lado dela) e ela vira para ele
    const olharDele = [Math.sin(perto.yaw), Math.cos(perto.yaw)];
    expect(olharDele[0] * (crianca.x - perto.x) + olharDele[1] * (crianca.z - perto.z)).toBeGreaterThan(0);
    const yc = yawDaCriancaNoAbraco(crianca, bento);
    expect(Math.sin(yc)).toBeGreaterThan(0.8);
    expect(Math.cos(yc)).toBeGreaterThan(0.1);
  });
});
