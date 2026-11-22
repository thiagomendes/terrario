/**
 * Spec 027 (T18): o que o cliente sabe da festa (a vista do núcleo para esta criança) e a
 * previsão dos toques das missões, para nada piscar: a lanterna tocada já aparece acesa e a porta
 * tocada já abre na hora, antes do quadro do núcleo chegar. A previsão usa as mesmas contas do
 * núcleo (`jogo/baile.ts`) e vale só até o núcleo responder (ou 1,5 s, se o toque foi recusado).
 */
import { MISSOES_BAILE, type BaileVista } from '../jogo/baile';

/** Quanto tempo uma previsão vale sem o núcleo confirmar (s). */
const VALE_PREVISAO = 1.5;

export function criarReplicaBaile() {
  let vista: BaileVista | null = null;
  /** A lanterna tocada e quando (a previsão: acesa na hora). */
  const lanternas = new Map<number, number>();
  /** A porta tocada e quando (a previsão: abre na hora). */
  const portas = new Map<number, number>();
  return {
    receber(v: BaileVista): void {
      vista = v;
      // o que o núcleo já mostra acesa deixa de ser previsão
      for (const i of [...lanternas.keys()]) if (v.ln[i]) lanternas.delete(i);
    },
    /** O estado da festa desta criança (null antes do primeiro quadro, ou fora da festa). */
    get estado(): BaileVista | null {
      return vista;
    },
    /** A previsão de um toque (agora: o relógio local, s). */
    prever(c: { a: 'lanterna' | 'campainha'; i: number }, agora: number): void {
      (c.a === 'lanterna' ? lanternas : portas).set(c.i, agora);
    },
    /** A lanterna `i` está acesa (o núcleo, ou a previsão de um toque de agora)? */
    acesa(i: number, agora: number): boolean {
      if (vista?.ln[i]) return true;
      const t = lanternas.get(i);
      return t !== undefined && agora - t < VALE_PREVISAO;
    },
    /** A porta `i` foi tocada agora há pouco (a previsão: já abriu)? Quando, ou null. */
    portaTocada(i: number, agora: number): number | null {
      const t = portas.get(i);
      return t !== undefined && agora - t < MISSOES_BAILE.portaAberta ? t : null;
    },
  };
}
export type ReplicaBaile = ReturnType<typeof criarReplicaBaile>;
