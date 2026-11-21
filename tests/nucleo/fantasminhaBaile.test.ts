import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { baileDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { PASSO, type Comando } from '../../src/nucleo/protocolo';
import { LONGE_DEVAGAR, VEL_DEVAGAR } from '../../src/jogo/criaturas';

/**
 * Spec 027 (T12): a fantasminha de lençol da Noite das Fantasias é mansa e devagar. Nada que
 * assuste, medido no núcleo: ela nunca surge perto (a menos de 8 blocos) da criança, flutua a no
 * máximo 0,5 bloco por segundo e, com a criança por perto, nunca vem na direção dela (nem quando
 * a criança chega perto: só se afasta devagarinho).
 */
const BAILE = obterTema('noite-das-fantasias');
const SEMENTE = 1337;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function tel(x: number, y: number, z: number): Comando {
  return {
    t: 'jogador',
    x,
    y,
    z,
    yaw: 0,
    pitch: 0,
    olhos: y + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot: 0,
  };
}
function abrir(modo: 'criativo' | 'sobrevivencia'): Nucleo {
  definirEstiloMundo(BAILE.mundo);
  limparPovoados();
  const n = criarNucleo({ semente: SEMENTE, modo, versaoMundo: 2, confiarNoCliente: true, depuracao: true, dono: 'ana' });
  n.conectar('ana', { perfil: { apelido: 'ana', aparencia: {} } });
  return n;
}

describe('spec 027 (T12): a fantasminha mansa e devagar', () => {
  it('o estilo do mundo é o "devagar"', () => {
    expect(BAILE.mundo.noite).toBe('devagar');
  });

  for (const modo of ['criativo', 'sobrevivencia'] as const)
    it(`nunca surge perto, flutua devagar e nunca vem na direção da criança (${modo})`, () => {
      const n = abrir(modo);
      const p = baileDoMundo(SEMENTE)!;
      n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0.9 } } as Comando);
      // a criança no bosque do tema, fora da vila (longe das lanternas), andando de um lado ao outro
      const x0 = p.ox - 40;
      const z0 = p.oz + 40;
      const j = n.estado.jogadores.get('ana')!;
      const visto = new Map<number, { x: number; z: number }>();
      const porSegundo = new Map<number, { x: number; z: number; i: number; perto: number }>();
      let maiorVel = 0;
      let pertoQueSurgiu = Infinity;
      let naDirecao = 0;
      let medidos = 0;
      // e umas fantasminhas postas de propósito a 6 a 12 blocos dela
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        n.comando('ana', {
          t: 'depurar',
          d: { f: 'invocar', tipo: 'espectro', x: x0 + Math.cos(a) * (6 + k), y: p.h + 1, z: z0 + Math.sin(a) * (6 + k) },
        } as Comando);
      }
      const postas = new Set<number>();
      for (let i = 0; i < 2400; i++) {
        // ela anda devagar para lá e para cá (às vezes chegando perto de uma fantasminha)
        const fase = Math.sin(i * PASSO * 0.4);
        j.saltoPermitido = true;
        n.comando('ana', tel(x0 + fase * 10, p.h + 1, z0 + Math.cos(i * PASSO * 0.25) * 6));
        n.passo();
        n.quadros();
        const jx = j.tel.x;
        const jz = j.tel.z;
        for (const c of n.estado.populacao.lista) {
          if (c.tipo !== 'espectro' || c.estado === 'morrendo') continue;
          if (i === 0) postas.add(c.id);
          const ant = visto.get(c.id);
          const d = Math.hypot(c.x - jx, c.z - jz);
          if (!ant) {
            if (!postas.has(c.id)) pertoQueSurgiu = Math.min(pertoQueSurgiu, d);
          } else {
            const mx = c.x - ant.x;
            const mz = c.z - ant.z;
            const v = Math.hypot(mx, mz) / PASSO;
            // (o empurrão de colisão de um passo não é andar)
            // a velocidade de cada segundo (o empurrãozinho de um passo, quando duas se esbarram,
            // não é flutuar)
            // (e a criança que esbarra nela e a empurra também não: só conta o segundo em que a
            // criança ficou a mais de um bloco e meio)
            const s = porSegundo.get(c.id);
            if (!s) porSegundo.set(c.id, { x: c.x, z: c.z, i, perto: d });
            else {
              s.perto = Math.min(s.perto, d);
              if (i - s.i >= 20) {
                const vs = Math.hypot(c.x - s.x, c.z - s.z) / ((i - s.i) * PASSO);
                if (s.perto > 1.5) maiorVel = Math.max(maiorVel, vs);
                porSegundo.set(c.id, { x: c.x, z: c.z, i, perto: d });
              }
            }
            if (d < LONGE_DEVAGAR && v > 0.05) {
              medidos++;
              // o quanto do passo foi na direção da criança
              const ux = (jx - c.x) / (d || 1);
              const uz = (jz - c.z) / (d || 1);
              if ((mx * ux + mz * uz) / PASSO > 0.08) naDirecao++;
            }
          }
          visto.set(c.id, { x: c.x, z: c.z });
        }
      }
      expect(postas.size).toBeGreaterThan(0);
      expect(medidos).toBeGreaterThan(50);
      expect(maiorVel).toBeLessThanOrEqual(0.5);
      expect(VEL_DEVAGAR).toBeLessThanOrEqual(0.5);
      expect(pertoQueSurgiu).toBeGreaterThanOrEqual(8);
      expect(naDirecao).toBe(0);
    });
});
