import type { Armazenamento } from '../personagem/persistencia';

export type Qualidade = 'baixa' | 'media' | 'alta' | 'ultra';

export interface Config {
  volumeGeral: number;
  volumeEfeitos: number;
  volumeMusica: number;
  volumeAmbiente: number;
  /** Multiplicador da sensibilidade do mouse (1 = padrão). */
  sensibilidade: number;
  inverterY: boolean;
  /** Campo de visão vertical em graus. */
  fov: number;
  qualidade: Qualidade;
  /** Raio de chunks carregados em volta do jogador. */
  distancia: number;
  mostrarFps: boolean;
  /** Balanço da câmera e do braço ao andar. */
  balanco: boolean;
  /** Escala da interface (acessibilidade). */
  escalaInterface: number;
  /** Legendas de sons importantes (acessibilidade). */
  legendas: boolean;
  /** Entrar em tela cheia ao clicar em Jogar (onde o navegador permite). */
  telaCheia: boolean;
  /** Barra de atalhos com ícones e teclas no canto da tela (desktop). */
  mostrarAtalhos: boolean;
}

export const CHAVE_CONFIG = 'terrario:config';
/** Chave de antes do jogo se chamar Terrário: lida se a nova ainda não existe. */
export const CHAVE_CONFIG_ANTIGA = 'brumaluz:config';

export const CONFIG_PADRAO: Config = {
  volumeGeral: 0.8,
  volumeEfeitos: 1,
  volumeMusica: 0.6,
  volumeAmbiente: 0.8,
  sensibilidade: 1,
  inverterY: false,
  fov: 70,
  qualidade: 'alta',
  distancia: 3,
  mostrarFps: true,
  balanco: true,
  escalaInterface: 1,
  legendas: false,
  telaCheia: true,
  mostrarAtalhos: true,
};

export const LIMITES = {
  sensibilidade: [0.2, 3],
  fov: [50, 100],
  distancia: [2, 8],
  escalaInterface: [0.8, 1.4],
} as const;

const QUALIDADES: readonly Qualidade[] = ['baixa', 'media', 'alta', 'ultra'];

function faixa(v: unknown, min: number, max: number, padrao: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : padrao;
}
function bool(v: unknown, padrao: boolean): boolean {
  return typeof v === 'boolean' ? v : padrao;
}

export function normalizarConfig(entrada: unknown): Config {
  const o = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;
  const p = CONFIG_PADRAO;
  return {
    volumeGeral: faixa(o.volumeGeral, 0, 1, p.volumeGeral),
    volumeEfeitos: faixa(o.volumeEfeitos, 0, 1, p.volumeEfeitos),
    volumeMusica: faixa(o.volumeMusica, 0, 1, p.volumeMusica),
    volumeAmbiente: faixa(o.volumeAmbiente, 0, 1, p.volumeAmbiente),
    sensibilidade: faixa(o.sensibilidade, ...LIMITES.sensibilidade, p.sensibilidade),
    inverterY: bool(o.inverterY, p.inverterY),
    fov: Math.round(faixa(o.fov, ...LIMITES.fov, p.fov)),
    qualidade: QUALIDADES.includes(o.qualidade as Qualidade)
      ? (o.qualidade as Qualidade)
      : p.qualidade,
    distancia: Math.round(faixa(o.distancia, ...LIMITES.distancia, p.distancia)),
    mostrarFps: bool(o.mostrarFps, p.mostrarFps),
    balanco: bool(o.balanco, p.balanco),
    escalaInterface: faixa(o.escalaInterface, ...LIMITES.escalaInterface, p.escalaInterface),
    legendas: bool(o.legendas, p.legendas),
    telaCheia: bool(o.telaCheia, p.telaCheia),
    mostrarAtalhos: bool(o.mostrarAtalhos, p.mostrarAtalhos),
  };
}

export function carregarConfig(a: Armazenamento | null): Config {
  try {
    const t = a?.getItem(CHAVE_CONFIG) ?? a?.getItem(CHAVE_CONFIG_ANTIGA);
    return normalizarConfig(t ? JSON.parse(t) : null);
  } catch {
    return { ...CONFIG_PADRAO };
  }
}

export function salvarConfig(a: Armazenamento | null, c: Config): void {
  try {
    a?.setItem(CHAVE_CONFIG, JSON.stringify(c));
  } catch {
    // armazenamento indisponível: segue só em memória
  }
}

export interface PerfilQualidade {
  sombras: boolean;
  tamanhoSombra: number;
  bloom: boolean;
  fxaa: boolean;
  glow: boolean;
  /** Escala mínima de resolução (1 = nativa; maior = menos pixels). */
  escalaMinima: number;
  vagalumes: number;
  nuvens: boolean;
}

export function perfilDaQualidade(q: Qualidade): PerfilQualidade {
  switch (q) {
    case 'baixa':
      return {
        sombras: false,
        tamanhoSombra: 512,
        bloom: false,
        fxaa: false,
        glow: false,
        escalaMinima: 2,
        vagalumes: 60,
        nuvens: false,
      };
    case 'media':
      return {
        sombras: true,
        tamanhoSombra: 1024,
        bloom: false,
        fxaa: true,
        glow: true,
        escalaMinima: 1.5,
        vagalumes: 140,
        nuvens: true,
      };
    case 'alta':
      return {
        sombras: true,
        tamanhoSombra: 2048,
        bloom: true,
        fxaa: true,
        glow: true,
        escalaMinima: 1,
        vagalumes: 260,
        nuvens: true,
      };
    default:
      return {
        sombras: true,
        tamanhoSombra: 4096,
        bloom: true,
        fxaa: true,
        glow: true,
        escalaMinima: 0.75,
        vagalumes: 400,
        nuvens: true,
      };
  }
}

/** Gerencia a configuração ativa, com ouvintes. */
export function criarGerenciadorConfig(a: Armazenamento | null) {
  let atual = carregarConfig(a);
  const ouvintes = new Set<(c: Config) => void>();
  return {
    get atual(): Config {
      return atual;
    },
    alterar(parcial: Partial<Config>): Config {
      atual = normalizarConfig({ ...atual, ...parcial });
      salvarConfig(a, atual);
      for (const f of ouvintes) f(atual);
      return atual;
    },
    restaurar(): Config {
      atual = { ...CONFIG_PADRAO };
      salvarConfig(a, atual);
      for (const f of ouvintes) f(atual);
      return atual;
    },
    ouvir(f: (c: Config) => void): () => void {
      ouvintes.add(f);
      f(atual);
      return () => ouvintes.delete(f);
    },
  };
}
export type GerenciadorConfig = ReturnType<typeof criarGerenciadorConfig>;
