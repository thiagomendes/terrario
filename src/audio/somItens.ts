/**
 * Spec 036 (T07): os sons dos tesouros novos enquanto a criança brinca com eles (o puf e o som de
 * montar são da T04). Cada um é curto, macio e espaçado, abaixo dos passos: o brinquedo se ouve
 * sem virar barulho de fundo.
 *
 * - **As rodinhas** do patinete e do carrinho rolando, e **o pedal** da bicicletinha e do carrinho,
 *   só montada e andando no chão; o ritmo acompanha a velocidade.
 * - **A hélice** do boné, só correndo (ela gira rápido).
 * - **As bolhas** da varinha estourando, de tempos em tempos.
 * - **O foguete** soltando a fumacinha, andando.
 * - **As gotinhas** do guarda-chuva, pingando devagar.
 * - **A pipa** pegando vento, de vez em quando.
 *
 * Puro: quem chama passa a situação a cada quadro e toca os eventos que voltam. Só a criança da
 * tela toca (os tesouros dos amigos ficam calados: nada de coro de bolhas com 4 amigos).
 */
import type { PremiumVestido } from '../personagem/aparencia';
import type { EventoSom } from './sons';

export interface SituacaoSomItens {
  premium: PremiumVestido | undefined;
  /** Montada no brinquedo de andar. */
  montado: boolean;
  /** A velocidade no chão (blocos por segundo). */
  anda: number;
  noChao: boolean;
  /** Visível e com o som do jogo (fora do modo foto, sem tela por cima): senão, nada toca. */
  ativa: boolean;
}

/**
 * O som curto de cada brinquedo de andar ao montar (o puf vem junto). Spec 038 (T05): a
 * motoquinha faz um "vrum" de brinquedo, só ao montar.
 */
export const SOM_DO_BRINQUEDO: Readonly<Record<string, EventoSom>> = {
  'patinete-luz': 'zum',
  'carrinho-pedal': 'buzininha',
  bicicletinha: 'campainha',
  'nuvem-fofa': 'fuf',
  'motoquinha-dourada': 'vrum',
};

/** Os relógios de cada som (segundos até o próximo). */
export type RelogiosSomItens = Partial<Record<EventoSom, number>>;

/** Acima disto ela está andando (blocos por segundo). */
export const ANDANDO = 0.8;
/** Acima disto ela está correndo (a hélice gira rápido). */
export const CORRENDO = 5;

/** De quanto em quanto tempo cada som toca (s), na velocidade `anda`. */
export function intervaloDoSom(ev: EventoSom, anda: number): number {
  const ritmo = Math.min(1.4, Math.max(0.6, anda / 4.3));
  switch (ev) {
    case 'rodinha':
      return 0.7 / ritmo;
    case 'pedal':
      return 0.8 / ritmo;
    case 'helice':
      return 0.7;
    case 'bolha':
      return 2.3;
    case 'foguete':
      return 1.8;
    case 'gotinha':
      return 1.3;
    case 'pipa':
      return 3.2;
    default:
      return 1;
  }
}

/** Os sons que valem agora, pelo que ela veste e faz. */
export function sonsQueValem(s: SituacaoSomItens): EventoSom[] {
  if (!s.ativa) return [];
  const p = s.premium ?? {};
  const out: EventoSom[] = [];
  const andando = s.noChao && s.anda > ANDANDO;
  if (s.montado && andando) {
    // (spec 038: a motoquinha andando é só as rodinhas, nada de motor)
    if (p.andar === 'patinete-luz' || p.andar === 'carrinho-pedal' || p.andar === 'motoquinha-dourada')
      out.push('rodinha');
    if (p.andar === 'bicicletinha' || p.andar === 'carrinho-pedal') out.push('pedal');
  }
  if (p.chapeu === 'bone-helice' && s.anda > CORRENDO) out.push('helice');
  if (p.mao === 'varinha-bolhas') out.push('bolha');
  if (p.mao === 'guarda-chuva-gotinhas') out.push('gotinha');
  if (p.mao === 'pipa-lacinhos') out.push('pipa');
  if (p.costas === 'mochila-foguete' && andando) out.push('foguete');
  return out;
}

/**
 * Um quadro: anda os relógios e devolve os sons a tocar agora. O som que deixa de valer esquece o
 * relógio (voltando a valer, ele espera um pouco antes do primeiro, sem estourar na hora).
 */
export function quadroSomItens(r: RelogiosSomItens, s: SituacaoSomItens, dt: number): EventoSom[] {
  const valem = sonsQueValem(s);
  for (const k of Object.keys(r) as EventoSom[]) if (!valem.includes(k)) delete r[k];
  const tocar: EventoSom[] = [];
  for (const ev of valem) {
    const falta = (r[ev] ?? intervaloDoSom(ev, s.anda) * 0.5) - dt;
    if (falta <= 0) {
      tocar.push(ev);
      r[ev] = intervaloDoSom(ev, s.anda);
    } else r[ev] = falta;
  }
  return tocar;
}
