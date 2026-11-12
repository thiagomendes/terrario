/** Escala de resolução: nível de hardware scaling (1 = nativa, maior = menos pixels). */
export const ESCALA_MIN = 1;
export const ESCALA_MAX = 2.5;
export const PASSO_ESCALA = 0.25;
export const FPS_BAIXO = 30;
export const FPS_ALTO = 58;
/**
 * Correção da 017 ("névoa" no celular): o celular desenhava em pixels de CSS (390 de largura
 * num iPhone de densidade 3, um terço da tela) e a imagem esticada parecia um véu em cima do
 * cenário e do boneco. Com folga, ele desenha até a densidade 2 (nível 0,5); abaixo do nível 1
 * a nitidez é um extra: cai de volta assim que os quadros passam abaixo deste limite.
 */
export const FPS_NITIDEZ = 50;
/** O nível mais fino no celular (densidade 2). */
export const ESCALA_MIN_TOQUE = 0.5;
/** Em que nível o celular começa (densidade 1,33); sobe para o melhor se sobrar folga. */
export const ESCALA_INICIO_TOQUE = 0.75;

/**
 * O melhor nível para a tela. No celular (toque e tela estreita) segue a densidade da tela
 * até 2, em passos de PASSO_ESCALA; no computador e no tablet, pela largura.
 */
export function escalaBase(larguraTela: number, densidade = 1, toque = false): number {
  if (toque && larguraTela < 1000 && densidade > 1) {
    const nivel = 1 / Math.min(densidade, 2);
    return Math.max(ESCALA_MIN_TOQUE, Math.ceil(nivel / PASSO_ESCALA - 1e-6) * PASSO_ESCALA);
  }
  if (larguraTela >= 1600) return 1.5;
  if (larguraTela >= 1000) return 1.25;
  return 1;
}

function limitar(v: number, base: number): number {
  return Math.min(ESCALA_MAX, Math.max(Math.min(ESCALA_MIN, base), v));
}

/**
 * Sobe a escala (menos pixels) abaixo de FPS_BAIXO e desce acima de FPS_ALTO.
 * Entre os dois limites mantém a atual (histerese). Abaixo do nível 1 (nitidez extra do
 * celular), sobe já abaixo de FPS_NITIDEZ.
 */
export function ajustarEscala(atual: number, fps: number, base: number): number {
  if (fps <= 0) return limitar(atual, base);
  if (fps < FPS_BAIXO || (atual < ESCALA_MIN && fps < FPS_NITIDEZ))
    return limitar(atual + PASSO_ESCALA, base);
  if (fps > FPS_ALTO) return limitar(Math.max(base, atual - PASSO_ESCALA), base);
  return limitar(atual, base);
}

/*
 * Correção de 12 nov ("a qualidade caiu muito" no iPhone): no celular a regra de cima subia o
 * nível até 2,5 (menos pixels que a própria tela) sempre que os quadros ficavam abaixo de 30 e
 * só melhorava acima de 58, o que num celular de 60 Hz quase nunca acontece. No modo de pouca
 * energia o Safari desenha no máximo 30 quadros: o contador fica em 29 e pouco por mais pixels
 * que se tire, e a imagem ia até 2,5 e ficava lá, borrada. No celular agora:
 * - o nível nunca passa de 1 (pixels de CSS, como antes da 017) nem do que a qualidade pede;
 * - sem folga, depois do nível 1 tira efeitos caros (o "alívio": bloom, brilho, sombra fina);
 * - cada piora tem de ajudar: se os quadros não sobem, ela é desfeita e fica um tempo sem
 *   tentar de novo (o teto de 30 quadros não vira imagem borrada);
 * - melhora com 55 quadros (alcançável a 60 Hz); se a melhora não se sustenta, volta e espera
 *   cada vez mais antes de tentar de novo (sem vaivém, que trava a cada troca).
 */

/** Efeitos que o celular tira, um de cada vez, depois do nível 1: 1 bloom, 2 brilho, 3 sombra fina e FXAA. */
export const ALIVIO_MAX = 3;
/** Quadros a partir dos quais o celular tenta melhorar um degrau. */
export const FPS_FOLGA = 55;
/** Uma piora vale se os quadros sobem pelo menos isto (fração) e mais FPS_GANHO_MIN. */
export const GANHO_MIN = 0.08;
export const FPS_GANHO_MIN = 1;
/** Espera (s) antes de tentar de novo uma piora que não ajudou; dobra até ESPERA_MAX. */
export const ESPERA_PIORA = 60;
/** Espera (s) antes de tentar de novo uma melhora que não se sustentou; dobra até ESPERA_MAX. */
export const ESPERA_MELHORA = 30;
export const ESPERA_MAX = 480;

/** Um degrau do celular: o nível de pixels e quantos efeitos tirados. */
export interface DegrauCelular {
  escala: number;
  alivio: number;
}

/** Os degraus do celular, do melhor ao mais leve: os níveis de `base` até `teto`, depois o alívio. */
export function degrausCelular(base: number, teto: number): DegrauCelular[] {
  const t = Math.max(base, teto);
  const d: DegrauCelular[] = [];
  for (let e = base; e < t - 1e-6; e += PASSO_ESCALA) d.push({ escala: e, alivio: 0 });
  for (let a = 0; a <= ALIVIO_MAX; a++) d.push({ escala: t, alivio: a });
  return d;
}

/** Abaixo de quantos quadros o degrau piora: 50 com nitidez extra (abaixo do nível 1), senão 30. */
export function limiarPiora(d: DegrauCelular): number {
  return d.escala < ESCALA_MIN - 1e-6 ? FPS_NITIDEZ : FPS_BAIXO;
}

export interface PoliticaCelular {
  readonly degraus: readonly DegrauCelular[];
  readonly indice: number;
  readonly degrau: DegrauCelular;
  /** Uma leitura dos quadros (a cada 2 s); devolve o degrau novo quando muda. */
  ler(fps: number, agoraS: number): DegrauCelular | null;
  /** A tela mudou (girou): degraus novos, no degrau de escala mais próxima. */
  trocarDegraus(degraus: DegrauCelular[]): DegrauCelular;
}

/**
 * A regra do celular. Pede duas leituras seguidas para mudar (cada troca de escala recria os
 * render targets e dá uma travada); depois de mudar, ignora a leitura seguinte (a travada) e
 * confere a outra.
 */
export function criarPoliticaCelular(degraus: DegrauCelular[], inicio = 0): PoliticaCelular {
  let lista = degraus;
  let i = Math.min(Math.max(0, inicio), lista.length - 1);
  let pedido = 0;
  let somaPedido = 0;
  /** Conferência depois de uma troca. */
  let conferir: {
    tipo: 'piora' | 'melhora';
    de: number;
    fpsAntes: number;
    leituras: number;
  } | null = null;
  let esperaPiora = ESPERA_PIORA;
  let esperaMelhora = ESPERA_MELHORA;
  /** Não piora para além deste índice até `ate` (piora que não ajudou). */
  let bloqueioPiora = { indice: Infinity, ate: 0 };
  let bloqueioMelhora = { indice: -1, ate: 0 };

  const ir = (j: number): DegrauCelular => {
    i = j;
    pedido = 0;
    somaPedido = 0;
    return lista[i]!;
  };

  return {
    get degraus() {
      return lista;
    },
    get indice() {
      return i;
    },
    get degrau() {
      return lista[i]!;
    },
    ler(fps, agora) {
      if (!(fps > 0)) return null;
      if (conferir) {
        conferir.leituras++;
        if (conferir.leituras === 1) return null; // a travada da troca
        if (conferir.tipo === 'piora') {
          const ajudou = fps >= conferir.fpsAntes * (1 + GANHO_MIN) + FPS_GANHO_MIN;
          const de = conferir.de;
          conferir = null;
          if (ajudou) {
            esperaPiora = ESPERA_PIORA;
            return null;
          }
          // não ajudou (teto de quadros, ou a conta não é dos pixels): desfaz e espera
          bloqueioPiora = { indice: de, ate: agora + esperaPiora };
          esperaPiora = Math.min(ESPERA_MAX, esperaPiora * 2);
          return ir(de);
        }
        // melhora: precisa se sustentar por três leituras
        if (fps < limiarPiora(lista[i]!)) {
          const de = conferir.de;
          conferir = null;
          bloqueioMelhora = { indice: de, ate: agora + esperaMelhora };
          esperaMelhora = Math.min(ESPERA_MAX, esperaMelhora * 2);
          return ir(de);
        }
        if (conferir.leituras >= 4) {
          conferir = null;
          esperaMelhora = ESPERA_MELHORA;
        }
        return null;
      }
      let direcao = 0;
      if (fps < limiarPiora(lista[i]!) && i < lista.length - 1) {
        if (!(agora < bloqueioPiora.ate && i >= bloqueioPiora.indice)) direcao = 1;
      } else if (fps >= FPS_FOLGA && i > 0) {
        if (!(agora < bloqueioMelhora.ate && i <= bloqueioMelhora.indice)) direcao = -1;
      }
      if (direcao === 0 || direcao !== pedido) {
        pedido = direcao;
        somaPedido = direcao ? fps : 0;
        return null;
      }
      const fpsAntes = (somaPedido + fps) / 2;
      const de = i;
      const novo = ir(i + direcao);
      conferir = { tipo: direcao > 0 ? 'piora' : 'melhora', de, fpsAntes, leituras: 0 };
      return novo;
    },
    trocarDegraus(novos) {
      const atual = lista[i]!;
      lista = novos;
      let j = novos.findIndex((d) => d.escala >= atual.escala - 1e-6 && d.alivio >= atual.alivio);
      if (j < 0) j = novos.length - 1;
      conferir = null;
      bloqueioPiora = { indice: Infinity, ate: 0 };
      bloqueioMelhora = { indice: -1, ate: 0 };
      return ir(j);
    },
  };
}
