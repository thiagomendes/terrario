/**
 * Spec 035, seção 3 (os blocos da volta): a diferença entre as edições que a tela tem e as do
 * bem-vindo novo (a volta de uma queda ou de uma ressincronização). Os quadros só trazem o que
 * muda dali em diante; o que mudou com a criança fora vem aqui. Função pura, fora de
 * `src/world/` para o servidor não publicar por ela.
 */
import type { EdicoesExportadas } from '../world/edicoes';
import { TAM_X, TAM_Z } from '../world/chunk';

/** Uma célula a acertar: `valor` (empacotado, com o dono) a pôr, ou `undefined` para tirar a edição. */
export interface CelulaDaVolta {
  x: number;
  y: number;
  z: number;
  valor: number | undefined;
}

function posicao(chaveChunk: string, i: number): { x: number; y: number; z: number } {
  const [cx, cz] = chaveChunk.split(',').map(Number);
  const lx = i % TAM_X;
  const lz = Math.floor(i / TAM_X) % TAM_Z;
  const y = Math.floor(i / (TAM_X * TAM_Z));
  return { x: cx * TAM_X + lx, y, z: cz * TAM_Z + lz };
}

/**
 * O que muda na tela: célula com valor diferente no bem-vindo (ou nova) recebe o valor de lá;
 * célula editada aqui que não está no bem-vindo perde a edição (volta ao terreno gerado);
 * célula com previsão local ainda não confirmada fica como está (o `reconferir` resolve).
 */
export function diferencaDasEdicoes(
  aqui: EdicoesExportadas,
  la: EdicoesExportadas,
  previsto: (x: number, y: number, z: number) => boolean = () => false,
): CelulaDaVolta[] {
  const saida: CelulaDaVolta[] = [];
  const chaves = new Set([...Object.keys(aqui), ...Object.keys(la)]);
  for (const k of chaves) {
    const meus = new Map(aqui[k] ?? []);
    const deles = la[k] ?? [];
    for (const [i, v] of deles) {
      const antes = meus.get(i);
      meus.delete(i);
      if (antes === v) continue;
      const p = posicao(k, i);
      if (previsto(p.x, p.y, p.z)) continue;
      saida.push({ ...p, valor: v });
    }
    // o que sobrou aqui saiu do mundo (a edição desfeita, a obra do canteiro feita)
    for (const i of meus.keys()) {
      const p = posicao(k, i);
      if (previsto(p.x, p.y, p.z)) continue;
      saida.push({ ...p, valor: undefined });
    }
  }
  return saida;
}
