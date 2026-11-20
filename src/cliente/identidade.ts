/**
 * Identidade anônima do aparelho para jogar com amigos (spec 010): um id, uma chave que
 * nunca sai daqui a não ser para o servidor conferir, e o apelido. Nenhum dado pessoal.
 */
import { limparApelido } from '../jogo/apelido';

export interface IdentidadeLocal {
  id: string;
  chave: string;
  apelido: string;
}

const CHAVE = 'terrario:identidade';

function aleatorio(bytes: number): string {
  const b = new Uint8Array(bytes);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function armazenamento(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** A identidade deste aparelho (criada na primeira vez). */
export function identidade(): IdentidadeLocal {
  const a = armazenamento();
  try {
    const v = JSON.parse(a?.getItem(CHAVE) ?? 'null') as IdentidadeLocal | null;
    if (v && typeof v.id === 'string' && typeof v.chave === 'string' && v.chave.length >= 32)
      return {
        id: v.id,
        chave: v.chave,
        // "Jogador" foi o nome que a versão antiga gravava quando ficava vazio: vale como vazio
        apelido: typeof v.apelido === 'string' && v.apelido !== 'Jogador' ? v.apelido : '',
      };
  } catch {
    // estragada: cria outra
  }
  const nova: IdentidadeLocal = { id: aleatorio(12), chave: aleatorio(24), apelido: '' };
  try {
    a?.setItem(CHAVE, JSON.stringify(nova));
  } catch {
    // sem armazenamento: vale só nesta visita
  }
  return nova;
}

export { MAX_APELIDO, limparApelido } from '../jogo/apelido';

/** O complemento do nome sugerido em cada tema (neutro: vale para menina e menino). */
const DO_TEMA: Record<string, string> = {
  'doce-reino': 'Doce',
  'exploracao-lunar': 'Lunar',
  'rancho-alegre': 'do Rancho',
  'cidade-grande': 'da Cidade',
  'vila-neon': 'da Vila',
};

/**
 * Nome sugerido quando a criança não escreve nenhum (spec 011): o personagem dela mais o tema
 * do mundo, como "Exploradora Lunar". Nunca mais "Jogador".
 */
export function nomeSugerido(personagem: string, tema?: string): string {
  const base = limparApelido(personagem) || 'Aventureiro';
  // sem tema (ou um que saiu do jogo), o do tema padrão (spec 034: a Vila Neon)
  const extra = (tema && DO_TEMA[tema]) || DO_TEMA['vila-neon'];
  return limparApelido(`${base} ${extra}`);
}

export function definirApelido(apelido: string): void {
  const a = armazenamento();
  const atual = identidade();
  try {
    a?.setItem(CHAVE, JSON.stringify({ ...atual, apelido: limparApelido(apelido) }));
  } catch {
    // fica só nesta visita
  }
}

/** Endereço do servidor: o do build (nuvem) ou o da própria máquina em desenvolvimento. */
export function urlServidor(): string {
  const doBuild = import.meta.env.VITE_SERVIDOR_URL as string | undefined;
  if (doBuild) return doBuild;
  const p = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${p}://${location.hostname}:8080/jogo`;
}
