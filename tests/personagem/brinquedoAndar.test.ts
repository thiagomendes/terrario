import { describe, expect, it } from 'vitest';
import { normalizarAparencia } from '../../src/personagem/aparencia';
import { planoBoneco, rotacoesDaPose } from '../../src/personagem/boneco';
import {
  IDS_ANDAR,
  MONTARIA,
  poseNoBrinquedo,
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

  it.each(IDS_ANDAR)('%s: as peças inteiras no nó do brinquedo, na prancha', (id) => {
    const lista: Parameters<typeof vestirBrinquedoAndar>[1] = [];
    vestirBrinquedoAndar(id, lista);
    expect(lista.length).toBeGreaterThan(2);
    for (const p of lista) {
      expect(p.junta).toBe('prancha');
      expect(p.subjunta?.nome).toBe('brinquedo');
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
