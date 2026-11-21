import { describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { aparenciaPadrao, aplicarCorpo, vestirFantasia, type ModeloId } from '../../src/personagem/aparencia';
import { planoBoneco, rotacoesDaPose, type PlanoBoneco } from '../../src/personagem/boneco';
import { moradorDeBrinquedo } from '../../src/render/moradorBoneco';
import {
  camadaDeAbraco,
  distanciaDoAbraco,
  lugarDoBentoNoAbraco,
  yawDaCriancaNoAbraco,
} from '../../src/personagem/abraco';
import { ABRACO, ESCALA_BENTO, N_BAILE, POVOADO_BAILE } from '../../src/jogo/baile';
import { criarAnimador } from '../../src/player/animacao';
import type { Pose } from '../../src/personagem/poses';
import { girosDaPose, medirPeca, distanciaEntre, type PecaMedida } from './encaixe';

/**
 * Spec 027 (T11): no abraço do Bento, nada de um atravessa o outro. Os dois bonecos de verdade
 * (a criança em vários modelos, corpos, cabelos e fantasias; o Bento grandão em vários modelos),
 * na pose do abraço em vários instantes (o encontro e o balanço), cada um no lugar dele (o
 * Bento à distância do abraço dela, de frente para ela): a menor distância entre qualquer
 * peça de um e qualquer peça do outro não pode ser negativa (encostar pode; entrar, não).
 */
type V3 = [number, number, number];

/** Até onde uma peça pode encostar entrando (pano e tufos macios), em blocos. */
const TOLERANCIA = 0.01;

function poseNoAbraco(papel: 'bento' | 'crianca', f: number): Pose {
  const an = criarAnimador();
  const base = an.atualizar(0.016, { velocidadeHoriz: 0, correndo: false, noChao: true, voando: false });
  const c = camadaDeAbraco(papel, f);
  return c({ ...base }, { dt: 0, tempo: 0, andando: false, noChao: true, voando: false, ocupado: false })!;
}

/** As peças do boneco no mundo: escala, giro no chão (yaw) e lugar dos pés. */
function noMundo(plano: PlanoBoneco, pose: Pose, escala: number, yaw: number, pes: V3) {
  const giros = girosDaPose({ pose, olhar: 0, segurando: false });
  const k = plano.escala * escala;
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  const fora = (q: V3): V3 => {
    const x = q[0] * k;
    const y = q[1] * k;
    const z = q[2] * k;
    return [x * c + z * s + pes[0], y + pes[1], -x * s + z * c + pes[2]];
  };
  return plano.pecas.map((p) => {
    const m = medirPeca(plano, p, giros, 6);
    const pontos = m.pontos.map(fora);
    const min: V3 = [Infinity, Infinity, Infinity];
    const max: V3 = [-Infinity, -Infinity, -Infinity];
    for (const q of pontos)
      for (let i = 0; i < 3; i++) {
        min[i] = Math.min(min[i], q[i]);
        max[i] = Math.max(max[i], q[i]);
      }
    const dentro = (q: V3): V3 => {
      const x = q[0] - pes[0];
      const z = q[2] - pes[2];
      // o giro inverso e a escala inversa (as distâncias voltam à medida do mundo no fim)
      return [(x * c - z * s) / k, (q[1] - pes[1]) / k, (x * s + z * c) / k];
    };
    const medida: PecaMedida = {
      ...m,
      pontos,
      min,
      max,
      centro: fora(m.centro),
      distancia: (q) => m.distancia(dentro(q)) * k,
    };
    return medida;
  });
}

describe('o abraço do Bento: nada atravessando (T11)', () => {
  it('a criança e o Bento se encostam sem entrar um no outro', () => {
    const pov = obterTema('noite-das-fantasias').povoado!;
    const fixo = pov.porMorador![`${POVOADO_BAILE}:${N_BAILE.bento}`];
    const bentos = [0, 1].map((id) => {
      const m = moradorDeBrinquedo(fixo.pecas!, id, fixo.genero, fixo.acessorio, fixo.fantasia, fixo.cabelo);
      return m.ajustar(planoBoneco(m.aparencia));
    });
    const criancas: Array<[string, PlanoBoneco, number]> = [];
    // os modelos de tronco mais largo e mais fino, os dois corpos, o cabelo de cima (topete) e o
    // volumoso (cachos), sem fantasia e com as que crescem para fora (o chapéu de bruxa, o
    // lençol, os tufos do monstrinho e a gola alta) e o chapéu de palha de acessório
    const modelos: ModeloId[] = ['andarilho', 'ferreiro', 'herbolaria'];
    const fantasias = [null, 'vovo-bruxa', 'lulu-fantasma', 'bento-peludo', 'dudu-vampiro'];
    modelos.forEach((modelo, i) => {
      const corpo = i % 2 ? 'masculino' : 'feminino';
      fantasias.forEach((f, k) => {
        const cabeloEstilo = (i + k) % 2 ? 4 : 0;
        const base = { ...aplicarCorpo(aparenciaPadrao(modelo), corpo), cabeloEstilo };
        const a = f ? vestirFantasia(base, f) : { ...base, acessorio: i === 1 ? ('chapeu-palha' as const) : base.acessorio };
        criancas.push([`${modelo} ${corpo} cabelo ${cabeloEstilo} ${f ?? a.acessorio}`, planoBoneco(a), distanciaDoAbraco(a)]);
      });
    });
    // os dois lados do balanço
    const instantes = [ABRACO.entra + 0.3, ABRACO.entra + 0.9];
    const pior = new Map<string, number>();
    for (const f of instantes) {
      const poseB = poseNoAbraco('bento', f);
      const poseC = poseNoAbraco('crianca', f);
      const porDistancia = new Map<number, ReturnType<typeof noMundo>[]>();
      for (const [rotulo, plano, dist] of criancas) {
        // o posto dele à frente dela (+z); o lugar e os giros do abraço, como na tela
        const crianca = { x: 0, z: 0 };
        const posto = { x: 0, z: 3 };
        let pecasB = porDistancia.get(dist);
        if (!pecasB) {
          const l = lugarDoBentoNoAbraco(crianca, posto, 1, dist);
          pecasB = bentos.map((b) => noMundo(b, poseB, ESCALA_BENTO, l.yaw, [l.x, 0, l.z]));
          porDistancia.set(dist, pecasB);
        }
        const pc = noMundo(plano, poseC, 1, yawDaCriancaNoAbraco(crianca, posto), [0, 0, 0]);
        for (const pb of pecasB)
          for (const a of pc)
            for (const b of pb) {
              const d = distanciaEntre(a, b, 0.05);
              if (d < -TOLERANCIA) {
                const k = `${a.peca.nome} x ${b.peca.nome} (${rotulo})`;
                pior.set(k, Math.min(pior.get(k) ?? 0, d));
              }
            }
      }
    }
    const lista = [...pior].sort((x, y) => x[1] - y[1]).map(([k, d]) => `${d.toFixed(3)} ${k}`);
    if (process.env.ABRACO_LISTA) {
      const porRotulo = new Map<string, string>();
      for (const l of lista) {
        const r = l.slice(l.indexOf('('));
        if (!porRotulo.has(r)) porRotulo.set(r, l);
      }
      console.log([...porRotulo.values()].join('\n'));
    }
    expect(lista.slice(0, 30)).toEqual([]);
  });
});
