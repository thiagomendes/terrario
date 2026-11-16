/**
 * A tela do celular fica acesa enquanto a criança está num mundo (Screen Wake Lock do
 * navegador; não precisa da casca nativa). Sem isso, um minutinho parada e o aparelho bloqueia;
 * na volta o jogo recarrega tudo de uma vez.
 *
 * - O navegador solta a trava sozinho quando a página some (troca de app, tela desligada no
 *   botão); ao voltar a aparecer, pedimos de novo.
 * - Alguns navegadores só atendem depois de um toque: se o pedido falhar, tentamos de novo no
 *   próximo toque na tela.
 * - Navegador sem o recurso: não faz nada (o aparelho bloqueia como antes).
 */

interface Trava {
  released: boolean;
  release(): Promise<void>;
  addEventListener(tipo: 'release', fn: () => void): void;
}

interface ComTrava {
  wakeLock?: { request(tipo: 'screen'): Promise<Trava> };
}

/** Liga e devolve a função que desliga (sai do mundo, fim dos testes). */
export function manterTelaLigada(
  doc: Document = document,
  nav: ComTrava = navigator as unknown as ComTrava,
): () => void {
  const wl = nav.wakeLock;
  if (!wl) return () => {};
  let trava: Trava | null = null;
  let pedindo = false;
  let ligado = true;

  const pedir = async (): Promise<void> => {
    if (!ligado || pedindo || (trava && !trava.released)) return;
    if (doc.visibilityState !== 'visible') return;
    pedindo = true;
    try {
      const t = await wl.request('screen');
      if (!ligado) {
        void t.release().catch(() => {});
        return;
      }
      trava = t;
      t.addEventListener('release', () => {
        if (trava === t) trava = null;
      });
    } catch {
      // sem permissão agora (aba escondida, sem toque ainda, economia de bateria): o próximo
      // toque ou a volta da página tentam de novo
    } finally {
      pedindo = false;
    }
  };

  const aoMudarVisibilidade = (): void => {
    if (doc.visibilityState === 'visible') void pedir();
  };
  const aoTocar = (): void => {
    if (!trava || trava.released) void pedir();
  };

  doc.addEventListener('visibilitychange', aoMudarVisibilidade);
  doc.addEventListener('pointerdown', aoTocar, { capture: true, passive: true });
  void pedir();

  return () => {
    ligado = false;
    doc.removeEventListener('visibilitychange', aoMudarVisibilidade);
    doc.removeEventListener('pointerdown', aoTocar, { capture: true });
    const t = trava;
    trava = null;
    if (t && !t.released) void t.release().catch(() => {});
  };
}
