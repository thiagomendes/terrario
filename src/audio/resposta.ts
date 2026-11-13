/**
 * Resposta de filtros do Web Audio em conta pura (testes e desenho do som): o módulo e a fase
 * de um biquad (as fórmulas do livro de receitas, as mesmas do Web Audio) numa frequência.
 */
export function respostaBiquad(
  tipo: 'lowpass' | 'highpass' | 'bandpass' | 'peaking',
  f0: number,
  q: number,
  f: number,
  ganhoDb = 0,
  taxa = 48000,
): [number, number] {
  const w0 = (2 * Math.PI * f0) / taxa;
  const al = Math.sin(w0) / (2 * q);
  const c = Math.cos(w0);
  const A = 10 ** (ganhoDb / 40);
  let b: number[];
  let a: number[];
  if (tipo === 'lowpass') {
    b = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    a = [1 + al, -2 * c, 1 - al];
  } else if (tipo === 'highpass') {
    b = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    a = [1 + al, -2 * c, 1 - al];
  } else if (tipo === 'bandpass') {
    b = [al, 0, -al];
    a = [1 + al, -2 * c, 1 - al];
  } else {
    b = [1 + al * A, -2 * c, 1 - al * A];
    a = [1 + al / A, -2 * c, 1 - al / A];
  }
  const w = (2 * Math.PI * f) / taxa;
  // H(e^jw) = (b0 + b1 z^-1 + b2 z^-2) / (a0 + a1 z^-1 + a2 z^-2)
  const re = (k: number[]) => k[0] + k[1] * Math.cos(w) + k[2] * Math.cos(2 * w);
  const im = (k: number[]) => -k[1] * Math.sin(w) - k[2] * Math.sin(2 * w);
  const nr = re(b);
  const ni = im(b);
  const dr = re(a);
  const di = im(a);
  const d = dr * dr + di * di;
  return [(nr * dr + ni * di) / d, (ni * dr - nr * di) / d];
}
