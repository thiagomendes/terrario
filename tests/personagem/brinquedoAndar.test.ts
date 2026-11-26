import { describe, expect, it } from 'vitest';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import { planoBoneco, rotacoesDaPose } from '../../src/personagem/boneco';
import {
  IDS_ANDAR,
  MONTARIA,
  NOS_DO_ANDAR,
  avancarAndar,
  estadoAndar,
  impulsoPatinete,
  poseNoBrinquedo,
  raioDaRoda,
  vestirBrinquedoAndar,
} from '../../src/personagem/brinquedoAndar';
import { chaveSemMontado } from '../../src/personagem/montar';
import { PREMIUM } from '../../src/jogo/alma';
import '../../src/temas/todos';

/**
 * Spec 036 (T04): o brinquedo de andar no plano do boneco. Ele entra uma vez, quando está
 * vestido, inteiro no nó `brinquedo` da junta `prancha` (o desenho só acende o nó ao montar), e o
 * plano é o mesmo montada ou a pé: montar e descer nunca refazem o boneco.
 */
const doBrinquedo = (pecas: { subjunta?: { nome: string } }[]) =>
  pecas.filter((p) => p.subjunta?.nome === 'brinquedo');

describe('spec 036 (T04): o brinquedo de andar no boneco', () => {
  it('os ids são os de andar do catálogo', () => {
    const doCatalogo = PREMIUM.filter((p) => p.categoria === 'andar').map((p) => p.id);
    expect([...IDS_ANDAR].sort()).toEqual([...doCatalogo].sort());
  });

  it.each(IDS_ANDAR)('%s: as peças inteiras no nó do brinquedo (ou num nó que gira dentro dele), na prancha', (id) => {
    const lista: Parameters<typeof vestirBrinquedoAndar>[1] = [];
    vestirBrinquedoAndar(id, lista);
    expect(lista.length).toBeGreaterThan(2);
    // (T05: o nó do brinquedo nasce primeiro; as rodas, o pedal e a nuvem nascem dentro dele)
    expect(lista[0].subjunta?.nome).toBe('brinquedo');
    for (const p of lista) {
      expect(p.junta).toBe('prancha');
      const s = p.subjunta!;
      expect(s.nome === 'brinquedo' || s.pai === 'brinquedo', `${p.nome}`).toBe(true);
      if (s.nome !== 'brinquedo') expect(NOS_DO_ANDAR).toContain(s.nome);
    }
  });

  it('sem brinquedo vestido, nada no plano; vestido, o mesmo plano montada ou a pé', () => {
    const aPe = normalizarAparencia({ premium: { andar: 'bicicletinha' } });
    const montada = normalizarAparencia({ premium: { andar: 'bicicletinha' }, montado: true });
    expect(montada.montado).toBe(true);
    expect(doBrinquedo(planoBoneco(normalizarAparencia({})).pecas)).toHaveLength(0);
    const p1 = planoBoneco(aPe).pecas;
    const p2 = planoBoneco(montada).pecas;
    expect(doBrinquedo(p1).length).toBeGreaterThan(0);
    expect(JSON.stringify(p2)).toBe(JSON.stringify(p1));
  });

  it('a chave de quem desenha o amigo não muda com o montado', () => {
    const aPe = normalizarAparencia({ premium: { andar: 'nuvem-fofa' } });
    const montada = normalizarAparencia({ premium: { andar: 'nuvem-fofa' }, montado: true });
    expect(chaveSemMontado(aPe)).toEqual({ chave: JSON.stringify(aPe), montado: false });
    expect(chaveSemMontado(montada)).toEqual({ chave: JSON.stringify(aPe), montado: true });
  });

  it.each(IDS_ANDAR)('%s: a pose leva o corpo à altura do brinquedo; no gesto, os braços são do gesto', (id) => {
    const pose = { tronco: 0, cabeca: 0, bracoDireito: 0.5, bracoEsquerdo: -0.5, pernaDireita: 0.4, pernaEsquerda: -0.4, tempo: 0 };
    const alvo = rotacoesDaPose(pose, 0, false);
    poseNoBrinquedo(id, alvo, pose);
    const m = MONTARIA[id];
    expect(alvo.corpoY).toBeCloseTo(m.corpoY, 5);
    expect(alvo.pernaD[0]).toBe(m.perna);
    expect(alvo.pernaE[0]).toBe(m.perna);
    expect(alvo.bracoD[0]).toBeCloseTo(m.bracoX, 9);
    // no meio de um gesto (o aceno), os braços ficam com o gesto
    const gesto = { ...pose, pesoGesto: 1 };
    const alvoG = rotacoesDaPose(gesto, 0, false);
    const bracoAntes = [...alvoG.bracoD];
    poseNoBrinquedo(id, alvoG, gesto);
    expect(alvoG.bracoD).toEqual(bracoAntes);
  });
});

describe('spec 036 (T05): as animações dos brinquedos de andar', () => {
  const pose = { tronco: 0, cabeca: 0, bracoDireito: 0, bracoEsquerdo: 0, pernaDireita: 0, pernaEsquerda: 0, tempo: 0 };
  /** Anda `s` segundos a `vel` blocos por segundo, em quadros de 1/60. */
  const andar = (id: string, vel: number, s: number) => {
    const e = estadoAndar();
    const voltas: number[] = [];
    for (let i = 0; i < s * 60; i++) {
      const antes = e.roda;
      avancarAndar(e, id, 1 / 60, vel);
      voltas.push((e.roda - antes + Math.PI * 2) % (Math.PI * 2));
    }
    return { e, giroTotal: voltas.reduce((a, b) => a + b, 0) };
  };

  it.each(['patinete-luz', 'carrinho-pedal', 'bicicletinha'] as const)('%s: as rodas giram pelo caminho andado, sem patinar', (id) => {
    const { giroTotal } = andar(id, 4.3, 3);
    // (a velocidade chega suavizada: o caminho andado fica um tico abaixo de 4,3 × 3)
    const caminho = giroTotal * raioDaRoda(id);
    expect(caminho).toBeGreaterThan(4.3 * 3 * 0.9);
    expect(caminho).toBeLessThan(4.3 * 3 + 0.01);
  });

  it('parada, as rodas e o pedal não giram', () => {
    for (const id of IDS_ANDAR) {
      const { e } = andar(id, 0, 2);
      expect(e.roda).toBe(0);
      expect(e.pedal).toBe(0);
    }
  });

  it('no pedal, as pernas vão e voltam juntas com a volta do pedal (uma para cada lado)', () => {
    for (const id of ['carrinho-pedal', 'bicicletinha'] as const) {
      const e = estadoAndar();
      let maior = 0;
      for (let i = 0; i < 120; i++) {
        avancarAndar(e, id, 1 / 60, 4.3);
        const alvo = rotacoesDaPose(pose, 0, false);
        poseNoBrinquedo(id, alvo, pose, e);
        const m = MONTARIA[id];
        // as duas pernas sempre em lados opostos da pose sentada, na mesma volta do pedal
        expect(alvo.pernaD[0] - m.perna).toBeCloseTo(-(alvo.pernaE[0] - m.perna), 9);
        expect(alvo.pernaD[0] - m.perna).toBeCloseTo(m.pedal * Math.sin(e.pedal), 9);
        maior = Math.max(maior, Math.abs(alvo.pernaD[0] - m.perna));
      }
      expect(maior).toBeGreaterThan(MONTARIA[id].pedal * 0.8);
    }
  });

  it('o patinete: andando, o pé esquerdo dá o impulso; parado, descansa para trás', () => {
    const { e } = andar('patinete-luz', 4.3, 2);
    let maior = 0;
    for (let i = 0; i < 80; i++) {
      avancarAndar(e, 'patinete-luz', 1 / 60, 4.3);
      maior = Math.max(maior, impulsoPatinete(e));
    }
    expect(maior).toBeGreaterThan(0.9);
    const parado = andar('patinete-luz', 0, 2).e;
    expect(impulsoPatinete(parado)).toBe(0);
    const alvo = rotacoesDaPose(pose, 0, false);
    poseNoBrinquedo('patinete-luz', alvo, pose, parado);
    expect(alvo.pernaE[0]).toBeGreaterThan(0.2);
    expect(alvo.pernaD[0]).toBeCloseTo(0, 5);
  });

  it('a nuvem boia devagar e pouco (nada de tremor), e o corpo boia junto', () => {
    const e = estadoAndar();
    let antes: number | null = null;
    let maiorPasso = 0;
    let maior = 0;
    for (let i = 0; i < 600; i++) {
      avancarAndar(e, 'nuvem-fofa', 1 / 60, 2);
      const alvo = rotacoesDaPose(pose, 0, false);
      poseNoBrinquedo('nuvem-fofa', alvo, pose, e);
      const y = alvo.corpoY - MONTARIA['nuvem-fofa'].corpoY;
      if (antes !== null) maiorPasso = Math.max(maiorPasso, Math.abs(y - antes));
      maior = Math.max(maior, Math.abs(y));
      antes = y;
    }
    expect(maior).toBeLessThan(0.05);
    expect(maior).toBeGreaterThan(0.02);
    expect(maiorPasso).toBeLessThan(0.002);
  });

  it('a bicicletinha ficou maior que no esboço (o selim e a roda)', () => {
    const lista: Parameters<typeof vestirBrinquedoAndar>[1] = [];
    vestirBrinquedoAndar('bicicletinha', lista);
    const selim = lista.find((p) => p.nome === 'andar-bici-selim')!;
    // (no esboço o selim ficava a 0,47 e a roda tinha raio 0,2; spec 038: o selim desceu para o pé
    // alcançar o pedal, e continua acima do selim do esboço)
    expect(selim.pos[1]).toBeGreaterThan(0.45);
    expect(MONTARIA.bicicletinha.raioRoda).toBeGreaterThan(0.22);
  });
});
