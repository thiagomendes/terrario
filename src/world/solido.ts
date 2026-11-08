import { ALTURA, TAM_X, TAM_Z, gerarChunk, indice, SEMENTE_PADRAO } from './chunk';
import { Bloco, obterBloco } from './blocks';
import {
  caixasDoBloco,
  cercaConecta,
  colisaoPorteira,
  temFormaParcial,
  vetorDirecao,
} from './formas';
import type { Edicoes } from './edicoes';
import type { Solido } from '../player/fisica';

/**
 * O que é sólido no mundo (blocos com as edições, água e caixas de blocos parciais).
 * Puro: serve à física do jogador no cliente e às regras do núcleo.
 */
export function criarMundoSolido(
  semente: number = SEMENTE_PADRAO,
  gerar: (cx: number, cz: number, semente: number) => Uint8Array = gerarChunk,
  edicoes?: Edicoes,
): Solido {
  const cache = new Map<string, { versao: number; blocos: Uint8Array }>();
  /**
   * Blocos do chunk com as edições. A base vem pronta (provedor/worker); editar um
   * bloco só copia a base e reaplica as edições, sem regerar o terreno.
   */
  function carregar(k: string, cx: number, cz: number, versao: number) {
    const base = gerar(cx, cz, semente);
    const lista = edicoes ? edicoes.doChunk(cx, cz) : [];
    let blocos = base;
    if (lista.length) {
      blocos = base.slice();
      for (const [i, v] of lista) blocos[i] = v & 255;
    }
    const entrada = { versao, blocos };
    cache.delete(k);
    cache.set(k, entrada);
    if (cache.size > 300) cache.delete(cache.keys().next().value as string);
    return entrada;
  }
  function bloco(x: number, y: number, z: number): number {
    if (y < 0 || y >= ALTURA) return 0;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    const versao = edicoes ? edicoes.versaoDoChunk(cx, cz) : 0;
    let entrada = cache.get(k);
    if (!entrada || entrada.versao !== versao) entrada = carregar(k, cx, cz, versao);
    return entrada.blocos[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  }
  const ler = (x: number, y: number, z: number): boolean => {
    if (y < 0) return true;
    if (y >= ALTURA) return false;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    const versao = edicoes ? edicoes.versaoDoChunk(cx, cz) : 0;
    let entrada = cache.get(k);
    if (!entrada || entrada.versao !== versao) entrada = carregar(k, cx, cz, versao);
    const c = entrada.blocos;
    const b = c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
    return obterBloco(b)?.solido ?? false;
  };
  const solido = ler as Solido;
  solido.liquido = (x, y, z) => bloco(x, y, z) === Bloco.AGUA;
  // caixas de blocos parciais (lajes, escadas, cercas, portas)
  solido.caixas = (x, y, z) => {
    const b = bloco(x, y, z);
    if (!temFormaParcial(b)) return null;
    const meta = edicoes?.obterMeta(x, y, z) ?? 0;
    // porteira fechada segura como a cerca: uma caixa inteira de 1,5 bloco, sem vãos
    if (b === Bloco.PORTEIRA) return [colisaoPorteira(meta)];
    const caixas = caixasDoBloco(b, meta, (d) => {
      const [dx, dz] = vetorDirecao(d);
      return cercaConecta(bloco(x + dx, y, z + dz));
    });
    // cerca segura de verdade: 1,5 bloco de altura na colisão (o desenho continua com 1)
    if (caixas && obterBloco(b)?.forma === 'cerca') {
      return caixas.map((c) => [c[0], c[1], c[2], c[3], 1.5, c[5]] as typeof c);
    }
    return caixas;
  };
  return solido;
}
