import { tema } from '../temas/ativo';
import { corMediaDoBloco } from '../fx/cores';
import { CONFETE, type ParametrosParticula } from '../fx/particulas';
import { criarGerador, jitter, type Gerador } from '../audio/variacao';
import type { EventosJogo, NomeEvento } from '../player/eventos';
import { estagioRachadura } from '../player/mineracao';

export const PARTICULAS_QUEBRA = 8;
/** Confete de festa ao quebrar (spec 012: efeitos de brinquedo). */
export const CONFETES_QUEBRA = 9;
export const CORES_CONFETE: [number, number, number][] = [
  [255, 107, 138],
  [255, 211, 77],
  [90, 209, 255],
  [123, 224, 123],
  [197, 155, 255],
  [255, 159, 67],
];
export const PARTICULAS_GOLPE = 2;
export const PARTICULAS_POEIRA = 4;
export const DURACAO_PULSO = 0.2;
export const ESCALA_PULSO_MAXIMA = 1.12;
export const COR_POEIRA: [number, number, number] = [150, 140, 130];
/** Folga da caixa de rachadura em relação ao bloco. */
export const FOLGA_RACHADURA = 0.01;

export interface PlanoEfeito {
  particulas: ParametrosParticula[];
  pulso: boolean;
}

function emitirParticulas(
  centro: { x: number; y: number; z: number },
  cor: [number, number, number],
  n: number,
  rng: Gerador,
  velocidade: number,
): ParametrosParticula[] {
  const lista: ParametrosParticula[] = [];
  for (let i = 0; i < n; i++) {
    lista.push({
      x: centro.x + 0.5 + jitter(rng, 0, 0.35),
      y: centro.y + 0.5 + jitter(rng, 0, 0.35),
      z: centro.z + 0.5 + jitter(rng, 0, 0.35),
      vx: jitter(rng, 0, velocidade),
      vy: jitter(rng, velocidade * 0.8, velocidade * 0.5),
      vz: jitter(rng, 0, velocidade),
      cor,
    });
  }
  return lista;
}

/** Decide, sem Babylon, o que cada evento do jogo solta em partículas e pulso. */
export function planejarEfeito<K extends NomeEvento>(
  nome: K,
  dados: EventosJogo[K],
  rng: Gerador = criarGerador(1),
): PlanoEfeito {
  const vazio: PlanoEfeito = { particulas: [], pulso: false };
  if (nome === 'quebra' || nome === 'golpe') {
    const d = dados as EventosJogo['quebra'];
    const cor = corMediaDoBloco(d.bloco);
    if (!cor) return vazio;
    const quebra = nome === 'quebra';
    const n = quebra ? PARTICULAS_QUEBRA : PARTICULAS_GOLPE;
    const particulas = emitirParticulas(d, cor, n, rng, quebra ? 2.5 : 1.5);
    if (quebra) {
      // e uma chuvinha de confete que sobe do bloco e desce planando
      for (let i = 0; i < CONFETES_QUEBRA; i++) {
        const ang = (i / CONFETES_QUEBRA) * Math.PI * 2 + jitter(rng, 0, 0.5);
        const v = 0.7 + jitter(rng, 0.25, 0.2);
        particulas.push({
          x: d.x + 0.5 + Math.cos(ang) * 0.2,
          y: d.y + 0.6,
          z: d.z + 0.5 + Math.sin(ang) * 0.2,
          vx: Math.cos(ang) * v,
          vy: 3.4 + jitter(rng, 0, 0.6),
          vz: Math.sin(ang) * v,
          cor: CORES_CONFETE[i % CORES_CONFETE.length],
          tipo: CONFETE,
        });
      }
    }
    return { particulas, pulso: false };
  }
  if (nome === 'colocacao') {
    // assentar: poeira baixa que escorre pelo chão em volta da base (nada de lascas voando)
    const d = dados as EventosJogo['colocacao'];
    const lista: ParametrosParticula[] = [];
    for (let i = 0; i < PARTICULAS_POEIRA; i++) {
      const ang = (i / PARTICULAS_POEIRA) * Math.PI * 2 + jitter(rng, 0, 0.4);
      lista.push({
        x: d.x + 0.5 + Math.cos(ang) * 0.55,
        y: d.y + 0.06,
        z: d.z + 0.5 + Math.sin(ang) * 0.55,
        vx: Math.cos(ang) * (0.7 + jitter(rng, 0, 0.2)),
        vy: 0.35 + jitter(rng, 0, 0.1),
        vz: Math.sin(ang) * (0.7 + jitter(rng, 0, 0.2)),
        cor: tema().particulas.poeira.map((v) => v * 255) as [number, number, number],
      });
    }
    return { particulas: lista, pulso: false };
  }
  return vazio;
}

/** Escala do contorno no instante t (s) do pulso: sobe e volta a 1, monótona em cada fase. */
export function escalaPulso(t: number): number {
  if (t <= 0 || t >= DURACAO_PULSO) return 1;
  const f = t / DURACAO_PULSO;
  const subida = f < 0.5 ? f * 2 : (1 - f) * 2;
  return 1 + (ESCALA_PULSO_MAXIMA - 1) * subida;
}

/** Opacidade do pulso: decresce de 1 a 0 em DURACAO_PULSO. */
export function opacidadePulso(t: number): number {
  if (t <= 0) return 1;
  if (t >= DURACAO_PULSO) return 0;
  return 1 - t / DURACAO_PULSO;
}

export interface EstadoRachadura {
  visivel: boolean;
  estagio: number;
}

/** Overlay só existe no bloco minerado agora (chaveAtual) e com dano. */
export function estadoRachadura(chaveAtual: string | null, progresso: number): EstadoRachadura {
  const estagio = chaveAtual === null ? 0 : estagioRachadura(progresso);
  return { visivel: estagio > 0, estagio };
}
