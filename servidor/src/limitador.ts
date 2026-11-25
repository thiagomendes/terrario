/**
 * O limite de mensagens por conexão (spec 010): mais de `max` num segundo fecha a conexão (o
 * navegador reconecta e renumera; ignorar uma mensagem deixaria um buraco na ordem e o jogador
 * parado esperando por ela). Fora do `index.ts` para os testes usarem o mesmo.
 */

/** Mensagens por segundo por conexão (telemetria são 20; o resto é folga para ações). */
export const MAX_POR_SEGUNDO = 150;

export type Veredito = 'passa' | 'fechar' | 'descartar';

/**
 * Um contador por conexão. A janela de 1 s começa na conexão e recomeça na primeira mensagem
 * depois de passar 1 s. `fechar`: a primeira que passou do limite (fecha com 4008);
 * `descartar`: as que vêm atrás dela, até a conexão fechar.
 */
export function criarLimitador(agora: () => number = Date.now, max = MAX_POR_SEGUNDO) {
  let janela = agora();
  let contagem = 0;
  return (): Veredito => {
    const t = agora();
    if (t - janela > 1000) {
      janela = t;
      contagem = 0;
    }
    if (++contagem > max) return contagem === max + 1 ? 'fechar' : 'descartar';
    return 'passa';
  };
}
