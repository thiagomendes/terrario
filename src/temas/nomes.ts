import { povoadoDoTema } from './ativo';
import { hash2 } from '../world/noise';

/** Nome do morador no tema: estável para o povoado e o número da casa. */
export function nomeDoMorador(povoado: string, n: number): string {
  const nomes = povoadoDoTema().nomes;
  const [a, b] = povoado.split(',').map(Number);
  const base = Math.floor(hash2(a, b, 991) * nomes.length);
  return nomes[(base + n * 3) % nomes.length];
}
