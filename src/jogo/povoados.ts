import { povoadoDoTema } from '../temas/ativo';
import { TERRENO_NATURAL } from '../world/chunk';
import { hash2 } from '../world/noise';
import { planoDaRegiao, REGIAO_POVOADO, type PlanoPovoado } from '../world/povoado';

/** Povoados cujo centro está a até `raio` blocos de (x, z). */
export function povoadosPerto(x: number, z: number, raio: number, semente: number): PlanoPovoado[] {
  const r: PlanoPovoado[] = [];
  const rx0 = Math.floor((x - raio) / REGIAO_POVOADO);
  const rx1 = Math.floor((x + raio) / REGIAO_POVOADO);
  const rz0 = Math.floor((z - raio) / REGIAO_POVOADO);
  const rz1 = Math.floor((z + raio) / REGIAO_POVOADO);
  for (let rx = rx0; rx <= rx1; rx++)
    for (let rz = rz0; rz <= rz1; rz++) {
      const p = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
      if (p && Math.hypot(p.cx - x, p.cz - z) <= raio) r.push(p);
    }
  return r;
}

/** Nome do morador no tema: estável para o povoado e o número da casa. */
export function nomeDoMorador(povoado: string, n: number): string {
  const nomes = povoadoDoTema().nomes;
  const [a, b] = povoado.split(',').map(Number);
  const base = Math.floor(hash2(a, b, 991) * nomes.length);
  return nomes[(base + n * 3) % nomes.length];
}
