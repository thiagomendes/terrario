/**
 * Spec 034 (T01): um gesto escondido (vários toques seguidos no mesmo lugar) para abrir o
 * painel de medida da janela. Aberto pelo ícone da tela de início, o iPhone não recebe
 * parâmetro de URL nem divide o armazenamento com o Safari: o gesto é o único caminho.
 */

/** Toques seguidos no título "Configurações" que abrem o painel de medida. */
export const TOQUES_PAINEL_MEDIDA = 5;
/** Tempo máximo entre um toque e o seguinte (ms); passou disso, a contagem recomeça. */
export const INTERVALO_TOQUES_MS = 800;

/**
 * Conta toques seguidos: `tocar(agora)` devolve true no n-ésimo toque em que cada um veio até
 * `intervalo` ms depois do anterior (e a contagem recomeça).
 */
export function contadorDeToques(
  n: number,
  intervalo = INTERVALO_TOQUES_MS,
): { tocar(agora: number): boolean } {
  let seguidos = 0;
  let ultimo = -Infinity;
  return {
    tocar(agora: number): boolean {
      seguidos = agora - ultimo <= intervalo ? seguidos + 1 : 1;
      ultimo = agora;
      if (seguidos < n) return false;
      seguidos = 0;
      ultimo = -Infinity;
      return true;
    },
  };
}

/** Liga o gesto no elemento: `n` toques seguidos (dedo, mouse ou caneta) chamam `acao`. */
export function ligarToquesEscondidos(alvo: HTMLElement, n: number, acao: () => void): void {
  const contador = contadorDeToques(n);
  alvo.addEventListener('pointerup', (e) => {
    if (!e.isPrimary) return;
    if (contador.tocar(e.timeStamp || performance.now())) acao();
  });
}
