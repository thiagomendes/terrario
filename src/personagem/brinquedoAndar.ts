/**
 * Spec 036 (T04): o brinquedo de andar no boneco (o patinete de luz, o carrinho de pedal, a
 * bicicletinha e a nuvem fofa) e a pose de quem está montada. Só dados e contas: o desenho
 * (`render/boneco.ts`) monta as peças uma vez, quando o brinquedo está vestido, num nó próprio
 * (`brinquedo`, na junta `prancha`, debaixo dos pés), e o `montado` só acende esse nó e troca a
 * pose. Montar e descer nunca refazem o boneco.
 *
 * **PROVISÓRIO (T04).** As peças daqui são caixinhas e bolinhas só para o montar e o descer
 * funcionarem e aparecerem nas fotos de prova. Os modelos de verdade e as animações (o impulso
 * com o pé, o pedal, o balanço da nuvem, as rodinhas girando) são da T05, saídos do esboço
 * (`src/esboco/lojinhaPecas.ts`). Os pontos onde a T05 liga:
 * - `vestirBrinquedoAndar`: troca as peças provisórias pelos modelos (todas na junta `prancha`
 *   com o nó `brinquedo`; nós de rodinha e de pedal podem nascer com `pai: 'brinquedo'`);
 * - `MONTARIA`: a altura do corpo e as juntas de cada brinquedo (do esboço, `MONTARIAS`);
 * - `poseNoBrinquedo`: a pose de cada quadro (o impulso do patinete, a passada do pedal);
 * - `animarBrinquedo` em `render/boneco.ts`: os nós que giram com o andar.
 */
import type { Junta, Peca, RotacoesPose } from './boneco';
import type { Pose } from './poses';

type V3 = [number, number, number];

/** Os brinquedos de andar da 036 (os ids do catálogo, categoria `andar`). */
export const IDS_ANDAR = ['patinete-luz', 'carrinho-pedal', 'bicicletinha', 'nuvem-fofa'] as const;
export type IdAndar = (typeof IDS_ANDAR)[number];

export const ehBrinquedoAndar = (id: unknown): id is IdAndar =>
  typeof id === 'string' && (IDS_ANDAR as readonly string[]).includes(id);

/** Como a criança fica em cada brinquedo (as medidas do esboço aprovado). */
export interface Montaria {
  /** A altura do corpo (o mesmo `corpoY` da pose: 0 é de pé no chão). */
  corpoY: number;
  sentada: boolean;
  /** Os braços para a frente (rad, negativo para a frente) e abertos para fora. */
  bracoX: number;
  bracoAbre: number;
  /** As pernas (rad, negativo para a frente). */
  perna: number;
  troncoX: number;
  /** O balanço de sobe e desce (só a nuvem). */
  flutua?: number;
}

export const MONTARIA: Readonly<Record<IdAndar, Montaria>> = {
  'patinete-luz': { corpoY: 0.135, sentada: false, bracoX: -1.0, bracoAbre: -0.12, perna: 0, troncoX: 0.08 },
  'carrinho-pedal': { corpoY: 0.05, sentada: true, bracoX: -0.85, bracoAbre: -0.16, perna: -1.45, troncoX: 0.04 },
  bicicletinha: { corpoY: 0.3, sentada: true, bracoX: -1.05, bracoAbre: -0.05, perna: -0.62, troncoX: 0.28 },
  'nuvem-fofa': { corpoY: 0.36, sentada: true, bracoX: -0.25, bracoAbre: 0.35, perna: -1.3, troncoX: 0, flutua: 0.025 },
};

const J: Junta = 'prancha';
/** O nó do brinquedo (o desenho acende e apaga ele inteiro ao montar e descer). */
const NO = { subjunta: { nome: 'brinquedo' as const, pivo: [0, 0, 0] as V3 } };

function peca(
  lista: Peca[],
  nome: string,
  forma: Peca['forma'],
  tamanho: V3,
  pos: V3,
  cor: string,
  extra: Partial<Peca> = {},
): void {
  lista.push({ nome: `andar-${nome}`, premium: true, junta: J, forma, tamanho, pos, cor, brilho: 0.4, ...NO, ...extra });
}

/** As rodinhas: bolinhas achatadas de lado (o eixo em x). */
function roda(lista: Peca[], nome: string, r: number, pos: V3, cor: string): void {
  peca(lista, nome, 'esfera', [r * 0.45, r, r], pos, cor);
}

/**
 * As peças do brinquedo de andar vestido (provisórias: a T05 põe os modelos de verdade aqui).
 * Todas na junta `prancha`, no nó `brinquedo`, que só aparece com a criança montada.
 */
export function vestirBrinquedoAndar(id: string, lista: Peca[]): void {
  if (!ehBrinquedoAndar(id)) return;
  if (id === 'patinete-luz') {
    const VIOLETA = '#7b5cff';
    peca(lista, 'deque', 'caixa', [0.3, 0.05, 0.72], [0, 0.1, -0.02], VIOLETA, { raio: 0.022 });
    peca(lista, 'guidao-haste', 'cilindro', [0.78, 0.025, 0.025], [0, 0.5, 0.31], '#e6e9f2');
    peca(lista, 'guidao', 'caixa', [0.46, 0.045, 0.045], [0, 0.9, 0.31], VIOLETA, { raio: 0.02 });
    roda(lista, 'roda-f1', 0.075, [-0.1, 0.075, 0.33], '#3ee0c8');
    roda(lista, 'roda-f2', 0.075, [0.1, 0.075, 0.33], '#3ee0c8');
    roda(lista, 'roda-t', 0.075, [0, 0.075, -0.36], '#3ee0c8');
  } else if (id === 'carrinho-pedal') {
    const VERMELHO = '#ff6b5a';
    peca(lista, 'corpo', 'caixa', [0.62, 0.26, 0.92], [0, 0.25, 0.04], VERMELHO, { raio: 0.06 });
    peca(lista, 'encosto', 'caixa', [0.52, 0.3, 0.08], [0, 0.44, -0.36], VERMELHO, { raio: 0.04 });
    peca(lista, 'volante', 'anel', [0.24, 0.035, 0], [0, 0.55, 0.3], '#3b3650', { rot: [1.15, 0, 0] });
    peca(lista, 'bandeira-haste', 'cilindro', [0.5, 0.012, 0.012], [0.24, 0.6, -0.38], '#e6e9f2');
    peca(lista, 'bandeira', 'caixa', [0.02, 0.12, 0.16], [0.24, 0.8, -0.3], '#ffcf3a', { raio: 0.01 });
    for (const x of [-0.33, 0.33]) for (const z of [-0.3, 0.34]) roda(lista, `roda${x}${z}`, 0.13, [x, 0.13, z], '#3b3650');
  } else if (id === 'bicicletinha') {
    const AZUL = '#4fb3ff';
    for (const z of [-0.34, 0.34])
      peca(lista, `roda${z}`, 'anel', [0.42, 0.05, 0], [0, 0.21, z], '#3b3650', { rot: [0, 0, Math.PI / 2] });
    peca(lista, 'quadro', 'caixa', [0.06, 0.06, 0.62], [0, 0.34, 0], AZUL, { raio: 0.02 });
    peca(lista, 'selim', 'caixa', [0.2, 0.05, 0.22], [0, 0.42, -0.12], '#3b3650', { raio: 0.02 });
    peca(lista, 'guidao-haste', 'cilindro', [0.36, 0.022, 0.022], [0, 0.52, 0.32], AZUL);
    peca(lista, 'guidao', 'caixa', [0.42, 0.04, 0.04], [0, 0.7, 0.3], AZUL, { raio: 0.018 });
    peca(lista, 'cestinha', 'caixa', [0.22, 0.14, 0.16], [0, 0.6, 0.44], '#e8c27a', { raio: 0.02 });
    peca(lista, 'flor', 'esfera', [0.05, 0.05, 0.05], [0, 0.7, 0.44], '#ff8fb3');
    for (const x of [-0.2, 0.2]) roda(lista, `apoio${x}`, 0.06, [x, 0.06, -0.34], '#e6e9f2');
  } else {
    const BRANCO = '#fbfdff';
    peca(lista, 'meio', 'esfera', [0.32, 0.2, 0.32], [0, 0.24, 0], BRANCO);
    for (const [x, z, r] of [
      [-0.3, 0.06, 0.22],
      [0.3, 0.06, 0.22],
      [0, 0.3, 0.2],
      [0, -0.28, 0.22],
    ] as const)
      peca(lista, `bola${x}${z}`, 'esfera', [r, r * 0.75, r], [x, 0.22, z], BRANCO);
  }
}

/**
 * A pose de quem está montada (provisória até a T05): o corpo na altura do brinquedo, as pernas
 * paradas (sentada ou de pé no deque) e as mãos no guidão. Durante um gesto, o gesto manda nos
 * braços (montada, a criança faz tudo). Muda `alvo` no lugar.
 */
export function poseNoBrinquedo(id: string, alvo: RotacoesPose, pose: Pose): void {
  if (!ehBrinquedoAndar(id)) return;
  const m = MONTARIA[id];
  const t = pose.tempo ?? 0;
  alvo.corpoY = m.corpoY + (m.flutua ? Math.sin(t * 1.7) * m.flutua : 0);
  alvo.escala = 1;
  alvo.pernaD = [m.perna, 0, 0];
  alvo.pernaE = [m.perna, 0, 0];
  alvo.tronco = [m.troncoX, alvo.tronco[1], alvo.tronco[2]];
  const w = 1 - Math.min(1, Math.max(0, (pose.pesoGesto ?? 0) / 0.3));
  if (w <= 0) return;
  const mistura = (a: V3, b: V3): V3 => [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w, a[2] + (b[2] - a[2]) * w];
  alvo.bracoD = mistura(alvo.bracoD, [m.bracoX, 0, 0.06 + m.bracoAbre]);
  alvo.bracoE = mistura(alvo.bracoE, [m.bracoX, 0, -0.06 - m.bracoAbre]);
}
