import { describe, expect, it } from 'vitest';
import { aparenciaPadrao } from '../../src/personagem/aparencia';
import { planoBoneco, type Peca, type PlanoBoneco } from '../../src/personagem/boneco';
import { girar } from '../../src/personagem/bonecoPremium';
import { PITCH_BAIXO, PITCH_CIMA } from '../../src/player/camera';

/**
 * Spec 036 (T03): o passarinho de ombro nunca passa na frente do rosto, de nenhum ângulo da
 * câmera do jogo (a volta inteira em torno da criança, do mais baixo ao mais alto que ela
 * chega). No esboço, de três-quartos, ele cobria a quina do rosto. Depois da decisão do dono (24
 * nov) ele voa pertinho do ombro, batendo as asinhas e boiando: a conta leva a volta inteira das
 * asas e o sobe e desce.
 *
 * A conta (no espaço do tronco, na pose de repouso, sem a escala do boneco): cada pontinho do
 * rosto (a frente da cabeça, da testa ao queixo) que a câmera vê, olhando para ela, não pode
 * esbarrar em nenhuma bolinha do passarinho no caminho.
 */
type V3 = [number, number, number];

function passaroEmBolinhas(plano: PlanoBoneco): Array<{ c: V3; r: number }> {
  const sub = (nome: string) => plano.pecas.find((p) => p.subjunta?.nome === nome)?.subjunta;
  const corpo = sub('passaro');
  expect(corpo, 'o passarinho no ombro').toBeTruthy();
  const noCorpo = (v: V3): V3 => {
    const g = girar(v, corpo!.rot ?? [0, 0, 0]);
    return [g[0] + corpo!.pivo[0], g[1] + corpo!.pivo[1], g[2] + corpo!.pivo[2]];
  };
  const bolinhas: Array<{ c: V3; r: number }> = [];
  for (const p of plano.pecas as Peca[]) {
    const s = p.subjunta;
    if (!s || !s.nome.startsWith('passaro')) continue;
    const tam = p.forma === 'esfera' ? Math.max(...p.tamanho) : Math.max(p.tamanho[0], p.tamanho[1]) / 2;
    if (s.nome === 'passaro') {
      // (+0,04: o sobe e desce e o balanço do voo)
      bolinhas.push({ c: noCorpo(p.pos), r: tam + 0.04 });
      continue;
    }
    // as asinhas, num nó dentro do corpo que bate esticando e encolhendo (x de 0,72 a 1,28 e y
    // de 0,6 a 1,4): a asa nas duas pontas do bater e no meio
    for (const [ex, ey] of [
      [0.72, 1.4],
      [1, 1],
      [1.28, 0.6],
    ])
      bolinhas.push({
        c: noCorpo([s.pivo[0] + p.pos[0] * ex, s.pivo[1] + p.pos[1] * ey, s.pivo[2] + p.pos[2]]),
        r: tam * Math.max(ex, ey) + 0.04,
      });
  }
  return bolinhas;
}

/**
 * O rosto e a quina da cabeça: a frente (da testa ao queixo) e o pedaço da frente de cada lado
 * (onde o esboço passava). Cada ponto vai com a normal (para saber se a câmera o vê).
 */
function rosto(plano: PlanoBoneco): Array<{ p: V3; n: V3 }> {
  const cab = plano.pecas.find((p) => p.nome === 'cabeca' && p.junta === 'cabeca')!;
  const jc = plano.juntas.cabeca.pos;
  const c: V3 = [jc[0] + cab.pos[0], jc[1] + cab.pos[1], jc[2] + cab.pos[2]];
  const [w, h, d] = cab.tamanho;
  const pts: Array<{ p: V3; n: V3 }> = [];
  for (let y = -h / 2 + 0.05; y <= h * 0.2; y += 0.03) {
    for (let x = -w / 2 + 0.06; x <= w / 2 - 0.06 + 1e-9; x += 0.03)
      pts.push({ p: [c[0] + x, c[1] + y, c[2] + d / 2 + 0.001], n: [0, 0, 1] });
    for (const s of [-1, 1])
      for (let z = d / 2 - 0.15; z <= d / 2 - 0.05 + 1e-9; z += 0.025)
        pts.push({ p: [c[0] + s * (w / 2 + 0.001), c[1] + y, c[2] + z], n: [s, 0, 0] });
  }
  return pts;
}

/** O raio sai do ponto `o` na direção `u` (unitária) e esbarra na bolinha? */
function esbarra(o: V3, u: V3, b: { c: V3; r: number }): boolean {
  const oc: V3 = [o[0] - b.c[0], o[1] - b.c[1], o[2] - b.c[2]];
  const bb = oc[0] * u[0] + oc[1] * u[1] + oc[2] * u[2];
  const cc = oc[0] ** 2 + oc[1] ** 2 + oc[2] ** 2 - b.r * b.r;
  const disc = bb * bb - cc;
  if (disc < 0) return false;
  return -bb + Math.sqrt(disc) > 0;
}

describe('036 T03: o passarinho de ombro', () => {
  for (const corpo of ['feminino', 'masculino'] as const)
    it(`${corpo}: de nenhum ângulo da câmera do jogo ele passa na frente do rosto`, () => {
      const plano = planoBoneco({ ...aparenciaPadrao(), corpo, premium: { bicho: 'passarinho-ombro' } });
      const bolinhas = passaroEmBolinhas(plano);
      expect(bolinhas.length).toBeGreaterThan(8);
      const pts = rosto(plano);
      const tapados: string[] = [];
      for (let g = 0; g < 360; g += 5)
        for (let pitch = PITCH_CIMA; pitch <= PITCH_BAIXO; pitch += 0.05) {
          const yaw = (g * Math.PI) / 180;
          // de onde a câmera olha: para a criança, de cima (pitch positivo) ou de baixo
          const paraCamera: V3 = [-Math.cos(pitch) * Math.sin(yaw), Math.sin(pitch), -Math.cos(pitch) * Math.cos(yaw)];
          for (const { p, n } of pts) {
            // (só o que a câmera vê: o lado da cabeça virado para ela; a quina conta vista de
            // lado ou da frente, que é onde ela é o rosto. Vista de trás, o passarinho no ombro
            // fica na frente do lado da cabeça, como um passarinho de verdade no ombro)
            if (n[0] * paraCamera[0] + n[2] * paraCamera[2] <= 0.02) continue;
            if (n[0] !== 0 && paraCamera[2] < -0.05) continue;
            if (bolinhas.some((b) => esbarra(p, paraCamera, b))) {
              tapados.push(`${g}° ${pitch.toFixed(2)}`);
              break;
            }
          }
        }
      expect(tapados).toEqual([]);
    });

  it('não segue pelo chão e fica preso ao tronco (as asinhas dentro do corpo dele)', () => {
    const plano = planoBoneco({ ...aparenciaPadrao(), premium: { bicho: 'passarinho-ombro' } });
    const dele = plano.pecas.filter((p) => p.subjunta?.nome.startsWith('passaro'));
    expect(dele.every((p) => p.junta === 'tronco')).toBe(true);
    expect(dele.filter((p) => p.subjunta?.pai === 'passaro').length).toBe(2);
    // (as peças do corpo vêm antes das asinhas: o nó do pai nasce primeiro)
    const primeiraAsa = plano.pecas.findIndex((p) => p.subjunta?.pai === 'passaro');
    const ultimaDoCorpo = plano.pecas.map((p) => p.subjunta?.nome).lastIndexOf('passaro');
    expect(ultimaDoCorpo).toBeLessThan(primeiraAsa);
  });
});
