import type { Engine } from '@babylonjs/core/Engines/engine';

/**
 * Sair da página sem deixar a placa de vídeo presa. No iPhone (WebKit), a página nova começava
 * a montar o 3D enquanto a anterior ainda segurava o contexto WebGL dela (e o do estúdio de
 * fotos); com a memória apertada, a página nova ficava na tela azul. Aqui: toda saída (trocar de
 * mundo, entrar na sala, recarregar, fechar a aba) solta primeiro os contextos WebGL.
 */

const aoSair = new Set<() => void>();
let liberado = false;
let porConta = false;

/** Registra algo para soltar ao sair da página. Devolve quem cancela o registro. */
export function antesDeSair(f: () => void): () => void {
  aoSair.add(f);
  return () => aoSair.delete(f);
}

/** Solta tudo o que foi registrado (uma vez só). */
export function liberarTudo(): void {
  if (liberado) return;
  liberado = true;
  for (const f of [...aoSair]) {
    try {
      f();
    } catch {
      // soltar é de boa-fé: um que falhe não impede os outros
    }
  }
  aoSair.clear();
}

/** A página já soltou os contextos (saindo ou guardada pelo navegador). */
export function paginaLiberada(): boolean {
  return liberado;
}

/** A saída foi pedida pelo próprio jogo (o mundo já foi salvo antes). */
export function saindoPorConta(): boolean {
  return porConta;
}

/** Vai para outro endereço soltando a placa de vídeo antes. */
export function navegar(url: string): void {
  porConta = true;
  liberarTudo();
  location.href = url;
}

/** Recarrega soltando a placa de vídeo antes. */
export function recarregar(): void {
  porConta = true;
  liberarTudo();
  location.reload();
}

/** Desmonta um engine do Babylon e devolve o contexto WebGL ao navegador na hora. */
export function liberarEngine(engine: Engine): void {
  let gl: WebGLRenderingContext | null = null;
  try {
    gl = (engine as unknown as { _gl?: WebGLRenderingContext })._gl ?? null;
  } catch {
    gl = null;
  }
  const ext = gl?.getExtension('WEBGL_lose_context') ?? null;
  try {
    engine.stopRenderLoop();
    engine.dispose();
  } catch {
    // segue para soltar o contexto mesmo assim
  }
  try {
    ext?.loseContext();
  } catch {
    // contexto já perdido
  }
}

/**
 * Liga as saídas que o jogo não pede (fechar a aba, digitar outro endereço, voltar):
 * `pagehide` solta os contextos; se o navegador devolver a página guardada (bfcache), ela
 * recarrega, porque o 3D já foi desmontado (o mundo foi salvo no `pagehide`).
 * Chamar depois de montar a cena, para o salvamento do `pagehide` vir antes de desmontar.
 */
export function ligarSaida(): void {
  window.addEventListener('pagehide', () => liberarTudo());
  window.addEventListener('pageshow', (e) => {
    if (e.persisted && liberado) location.reload();
  });
  // o vigia do index.html também solta antes de recarregar
  (window as unknown as { __terrarioSair?: () => void }).__terrarioSair = liberarTudo;
}

interface Carregando {
  pronto(): void;
  falhou(detalhe?: string): void;
}

function carregando(): Carregando | undefined {
  return (window as unknown as { __terrarioCarregando?: Carregando }).__terrarioCarregando;
}

/** O jogo já mostra a tela dele: o "Carregando o mundo…" do index.html some devagar. */
export function tirarCarregando(): void {
  carregando()?.pronto();
}

/** A abertura falhou: o "Carregando" vira o botão "Tentar de novo" (nunca a tela vazia). */
export function falhouAoCarregar(detalhe?: string): void {
  const c = carregando();
  if (c) c.falhou(detalhe);
}
