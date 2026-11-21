/**
 * Spec 035, seção 3 (os blocos da volta), as obras do canteiro: o evento da obra feita chega
 * só no quadro, e quem estava fora não recebe esse quadro. Na volta, o bem-vindo traz as obras
 * como estão; o canteiro que ficou pronto com a criança fora vira parte da cidade aqui, antes
 * da diferença das edições (o servidor já tirou das edições as células da obra feita). Função
 * pura, fora de `src/world/` para o servidor não publicar por ela.
 */
import { sanearObras, type ObraSalva } from '../nucleo/saneamento';

/** Os nomes da placa "Feita por ..." (os ajudantes com apelido). */
export function nomesDaObra(o: ObraSalva): string[] {
  return o.ajudantes.map(([, a]) => a).filter((a) => a);
}

/**
 * Os canteiros que estão feitos no bem-vindo (`la`) e não estão feitos aqui, em ordem, com os
 * nomes da placa. A obra feita não desfaz: a que está feita aqui e não lá fica como está.
 */
export function obrasQueFicaramProntas(
  aqui: ReadonlyMap<number, { feita: boolean }>,
  la: unknown,
): { canteiro: number; nomes: string[] }[] {
  return Object.entries(sanearObras(la))
    .map(([k, o]) => ({ canteiro: Number(k), o }))
    .filter(({ canteiro, o }) => o.feita && !aqui.get(canteiro)?.feita)
    .sort((a, b) => a.canteiro - b.canteiro)
    .map(({ canteiro, o }) => ({ canteiro, nomes: nomesDaObra(o) }));
}
