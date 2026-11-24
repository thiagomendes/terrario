import { describe, expect, it } from 'vitest';
import { planoBoneco } from '../../src/personagem/boneco';
import { ESTILOS_CABELO, normalizarAparencia } from '../../src/personagem/aparencia';
import '../../src/temas/todos';

/**
 * Spec 036 (portão visual, o revisor: "pontinhos pretos do cabelo varam a borda" do boné): com o
 * boné de hélice, o cabelo de cima (a tampa, o topete, o coque, os cachos do alto) fica todo dentro
 * da copa, nos 9 penteados dos dois corpos. O que pende da beira para baixo aparece como debaixo de
 * qualquer boné (a franja, os lados, o cabelo comprido nas costas). A copa e a tampa são caixas de
 * cantos redondos: a conta tira de cada uma o quanto o canto entra.
 */
const ROSTO = /^(cabeca|olho|brilho|boca|bochecha|sobrancelha|nariz|orelha|cilio|sarda)/;

describe('036 (portão): o boné de hélice cobre o cabelo', () => {
  for (const corpo of ['feminino', 'masculino'] as const)
    it(`${corpo}: nos ${ESTILOS_CABELO} penteados, nada do cabelo vara a copa`, () => {
      const fora: string[] = [];
      for (let cabeloEstilo = 0; cabeloEstilo < ESTILOS_CABELO; cabeloEstilo++) {
        const plano = planoBoneco(normalizarAparencia({ corpo, cabeloEstilo, premium: { chapeu: 'bone-helice' } }));
        const copa = plano.pecas.find((p) => p.nome === 'bone-copa')!;
        expect(copa).toBeDefined();
        // (o canto redondo entra 0,3 do raio na diagonal)
        const r = (copa.raio ?? 0) * 0.3;
        const [cx, cy, cz] = copa.pos;
        const [w, h, d] = copa.tamanho;
        const beira = cy - h / 2;
        for (const p of plano.pecas) {
          if (p.junta !== 'cabeca' || p.apoio || p.subjunta || ROSTO.test(p.nome)) continue;
          const meio: [number, number, number] =
            p.forma === 'esfera' ? [p.tamanho[0], p.tamanho[1], p.tamanho[2]] : [p.tamanho[0] / 2, p.tamanho[1] / 2, p.tamanho[2] / 2];
          const [x, y, z] = p.pos;
          // o cabelo de cima (o meio do pedaço acima da beira da copa); o que pende para baixo
          // dela (os lados, as costas, o rabo, os cachos dos lados) aparece por baixo do boné
          // (o rabo de cavalo sai por trás da copa, como num boné de verdade)
          if (y <= beira || p.nome.startsWith('rabo')) continue;
          // (os cantos redondos do pedaço de cabelo também entram para dentro)
          const rp = p.forma === 'caixa' ? (p.raio ?? 0) * 0.3 : 0;
          const sai = Math.max(
            Math.abs(x - cx) + meio[0] - rp - (w / 2 - r),
            y + meio[1] - rp - (cy + h / 2 - r),
            Math.abs(z - cz) + meio[2] - rp - (d / 2 - r),
          );
          if (sai > 0) fora.push(`cabelo ${cabeloEstilo}: ${p.nome} sai ${sai.toFixed(3)}`);
        }
      }
      expect(fora).toEqual([]);
    });
});
