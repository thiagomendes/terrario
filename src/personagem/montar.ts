/**
 * Spec 036: montar no brinquedo de andar (o patinete, o carrinho de pedal, a bicicletinha, a
 * nuvem fofa). Um só "pode montar" decide a roda (o item de montar só aparece quando pode) e o
 * descer sozinho (montada, a criança desce quando deixa de poder: ao sentar no carrossel, ao
 * entrar na casa, ao nadar). Puro: quem chama junta a situação de agora.
 *
 * Pode montar quem está a pé: com um brinquedo de andar vestido, sem patins nem skate, fora de
 * todo brinquedo de tema (sentada, guiando, no trilho, no sofá: cada um se registra em
 * `criarBrinquedosDeTema`), fora da casa por dentro, sem nadar, sem voar, sem estar desmaiada, e
 * fora do provador e do modo foto. Os brinquedos de andar são só enfeite: montar não muda a
 * velocidade, o pulo nem o caminho, então esta regra é só do cliente (o núcleo não a confere).
 */
import type { Aparencia } from './aparencia';

/** O que o cliente sabe da criança agora, para decidir se ela pode estar montada. */
export interface SituacaoMontar {
  aparencia: Pick<Aparencia, 'premium' | 'patins' | 'skate' | 'montado'>;
  /** Os brinquedos de tema em que ela está agora (`criarBrinquedosDeTema().agora()`). */
  brinquedos: readonly string[];
  dentroDeCasa: boolean;
  nadando: boolean;
  voando: boolean;
  desmaiada: boolean;
  provador: boolean;
  modoFoto: boolean;
}

/** Por que não pode montar (o primeiro que vale, nesta ordem). */
export type MotivoSemMontar =
  | 'sem-brinquedo'
  | 'patins'
  | 'skate'
  | 'brinquedo'
  | 'casa'
  | 'nadando'
  | 'voando'
  | 'desmaiada'
  | 'provador'
  | 'foto';

/** O motivo de não poder montar agora, ou null quando pode (estar montada não conta). */
export function motivoSemMontar(s: SituacaoMontar): MotivoSemMontar | null {
  const a = s.aparencia;
  if (!a.premium?.andar) return 'sem-brinquedo';
  if (a.patins) return 'patins';
  if (a.skate) return 'skate';
  if (s.brinquedos.length) return 'brinquedo';
  if (s.dentroDeCasa) return 'casa';
  if (s.nadando) return 'nadando';
  if (s.voando) return 'voando';
  if (s.desmaiada) return 'desmaiada';
  if (s.provador) return 'provador';
  if (s.modoFoto) return 'foto';
  return null;
}

/** A criança pode montar (ou continuar montada) agora? */
export const podeMontar = (s: SituacaoMontar): boolean => motivoSemMontar(s) === null;

/** Montada e não pode mais: desce sozinha (na ação dela, antes de o núcleo responder). */
export const precisaDescer = (s: SituacaoMontar): boolean =>
  !!s.aparencia.montado && !podeMontar(s);

/**
 * A aparência passada a limpo em texto, sem o `montado` (quem desenha o amigo só refaz o boneco
 * quando esta chave muda; o montado sozinho só acende o brinquedo e troca a pose).
 */
export function chaveSemMontado(a: Aparencia): { chave: string; montado: boolean } {
  if (!a.montado) return { chave: JSON.stringify(a), montado: false };
  const { montado: _m, ...resto } = a;
  void _m;
  return { chave: JSON.stringify(resto), montado: true };
}

/** O brinquedo de andar em que ela está montada agora, ou null. */
export function brinquedoMontado(a: Pick<Aparencia, 'premium' | 'montado'>): string | null {
  return a.montado && a.premium?.andar ? a.premium.andar : null;
}

/**
 * O registro dos brinquedos de tema (o carrossel, a roda-gigante, o bate-bate, o trilho da
 * rampa, o sofá da Casa anos 80 e os da 027 parte 3): cada um diz se a criança está nele agora.
 * Um brinquedo novo de tema se registra aqui, e o "pode montar" passa a valer para ele.
 */
export interface BrinquedosDeTema {
  /** Registra um brinquedo (o id aparece em `agora` enquanto `ocupa()` for verdade). Devolve o "tirar". */
  registrar(id: string, ocupa: () => boolean): () => void;
  /** Os ids dos brinquedos em que ela está agora, na ordem do registro. */
  agora(): string[];
}

export function criarBrinquedosDeTema(): BrinquedosDeTema {
  const lista = new Map<string, () => boolean>();
  return {
    registrar(id, ocupa) {
      lista.set(id, ocupa);
      return () => {
        if (lista.get(id) === ocupa) lista.delete(id);
      };
    },
    agora() {
      const out: string[] = [];
      for (const [id, ocupa] of lista) if (ocupa()) out.push(id);
      return out;
    },
  };
}
