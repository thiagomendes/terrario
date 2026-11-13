/**
 * Spec 021 "Achar o amigo": o lugar seguro ao lado do amigo para o "pular para perto". Uma
 * função só, pura, usada pelo núcleo (servidor na nuvem e modo local) e pelos testes:
 *
 * - de pé: chão firme (não a copa de uma árvore), duas células livres, sem água;
 * - no máximo 1 bloco de diferença do chão do amigo, e sem buraco em volta;
 * - a proteção da 016: os pés e a cabeça num lugar que pode ficar vazio (não dentro de parede,
 *   cerca, lavoura ou obra), o chão do mundo ou de quem pula (nunca bloco de outra pessoa) e
 *   nada construído por cima: dentro de casa, do sítio, da cidade ou do que outra pessoa
 *   construiu não vale. Com o amigo dentro de casa, os anéis vão abrindo até achar o lado de
 *   fora, perto da porta.
 *
 * Procura primeiro do lado de onde o jogador vem (cai entre os dois, virado para o amigo).
 */
import { Protecao, type Protecao as TipoProtecao } from '../world/protecao';
import { dePe, ehSolido, type LerBloco, type V3 } from '../jogo/caminho';

export interface MundoDoPulo {
  bloco: LerBloco;
  /** A proteção da célula (spec 016). */
  protecao(x: number, y: number, z: number): TipoProtecao;
  /** Quem pôs o bloco (null: o mundo, ou ninguém). */
  dono(x: number, y: number, z: number): string | null;
}

/** Os anéis em volta do amigo (blocos) e os desvios do lado de quem vem (rad). */
const RAIOS = [2, 2.6, 3.2, 4, 5, 6.5, 8];
const LADOS = [0, 0.6, -0.6, 1.2, -1.2, 1.9, -1.9, 2.5, -2.5, Math.PI];
/** Até que altura acima da cabeça um teto construído quer dizer "dentro". */
const TETO = 12;

const vazioPode = (p: TipoProtecao) => p === Protecao.LIVRE || p === Protecao.PASSAGEM;
const chaoPode = (p: TipoProtecao) =>
  p === Protecao.LIVRE || p === Protecao.CHAO || p === Protecao.PASSAGEM;
const construido = (p: TipoProtecao) =>
  p === Protecao.ESTRUTURA || p === Protecao.USAVEL || p === Protecao.OBRA;

/** Dá para cair em (x, y, z) (y: a célula dos pés)? */
export function podeCair(m: MundoDoPulo, quem: string, x: number, y: number, z: number): boolean {
  if (!dePe(m.bloco, x, y, z)) return false;
  // sem buraco em volta: o chão das 8 vizinhas no máximo 1 abaixo
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue;
      if (!ehSolido(m.bloco(x + dx, y - 1, z + dz)) && !ehSolido(m.bloco(x + dx, y - 2, z + dz)))
        return false;
    }
  if (!vazioPode(m.protecao(x, y, z)) || !vazioPode(m.protecao(x, y + 1, z))) return false;
  if (!chaoPode(m.protecao(x, y - 1, z))) return false;
  const donoChao = m.dono(x, y - 1, z);
  if (donoChao !== null && donoChao !== quem) return false;
  // nada construído por cima (dentro de casa, ou debaixo do que outra pessoa fez)
  for (let yy = y + 2; yy <= y + TETO; yy++) {
    const b = m.bloco(x, yy, z);
    if (!ehSolido(b)) continue;
    if (construido(m.protecao(x, yy, z))) return false;
    const d = m.dono(x, yy, z);
    if (d !== null && d !== quem) return false;
  }
  return true;
}

/**
 * Dá para ver bem dali? Nada entre a cabeça de quem chega e a do amigo, e espaço atrás para
 * a câmera (3,5 blocos do lado oposto ao amigo, na altura da cabeça e um pouco acima).
 */
export function vistaLivre(
  m: MundoDoPulo,
  x: number,
  y: number,
  z: number,
  alvo: { x: number; y: number; z: number },
): boolean {
  const ax = alvo.x;
  const ay = alvo.y + 1.5;
  const az = alvo.z;
  const ox = x + 0.5;
  const oy = y + 1.5;
  const oz = z + 0.5;
  const d = Math.hypot(ax - ox, ay - oy, az - oz);
  for (let s = 0.5; s < d - 0.3; s += 0.5) {
    const k = s / d;
    const b = m.bloco(
      Math.floor(ox + (ax - ox) * k),
      Math.floor(oy + (ay - oy) * k),
      Math.floor(oz + (az - oz) * k),
    );
    if (ehSolido(b)) return false;
  }
  const h = Math.hypot(ax - ox, az - oz) || 1;
  const tx = (ox - ax) / h;
  const tz = (oz - az) / h;
  for (let s = 0.5; s <= 3.5; s += 0.5)
    for (const dy of [1.5, 2.5]) {
      const b = m.bloco(Math.floor(ox + tx * s), Math.floor(y + dy), Math.floor(oz + tz * s));
      if (ehSolido(b)) return false;
    }
  return true;
}

/**
 * O lugar ao lado do amigo (os pés no centro da célula), ou null se não há lugar seguro.
 * `de`: onde o jogador está agora; `alvo`: os pés do amigo. Prefere um lugar de onde a
 * criança vê o amigo logo ao chegar (nada no meio, a câmera atrás com espaço); sem nenhum
 * assim, vale qualquer lugar seguro.
 */
export function lugarDoPulo(
  m: MundoDoPulo,
  quem: string,
  de: { x: number; z: number },
  alvo: { x: number; y: number; z: number },
): V3 | null {
  const yAlvo = Math.floor(alvo.y);
  const vindo = Math.atan2(de.x - alvo.x, de.z - alvo.z);
  const seguros: V3[] = [];
  const vistos = new Set<number>();
  for (const raio of RAIOS)
    for (const da of LADOS) {
      const ang = vindo + da;
      const cx = Math.floor(alvo.x + Math.sin(ang) * raio);
      const cz = Math.floor(alvo.z + Math.cos(ang) * raio);
      const k = (cx + 65536) * 131072 + (cz + 65536);
      if (vistos.has(k)) continue;
      vistos.add(k);
      // a célula dos pés: a mesma altura do amigo, um acima ou um abaixo
      for (const y of [yAlvo, yAlvo + 1, yAlvo - 1])
        if (podeCair(m, quem, cx, y, cz)) {
          if (vistaLivre(m, cx, y, cz, alvo)) return [cx + 0.5, y, cz + 0.5];
          seguros.push([cx + 0.5, y, cz + 0.5]);
          break;
        }
    }
  return seguros[0] ?? null;
}
