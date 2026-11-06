import { Bloco, REGISTRO_BLOCOS } from '../world/blocks';

export type TipoItem = 'bloco' | 'ferramenta' | 'comida' | 'material';
export type TipoFerramenta = 'picareta' | 'machado' | 'pa' | 'espada';

export interface DefFerramenta {
  tipo: TipoFerramenta;
  /** 1 madeira, 2 pedra, 3 cobre, 4 ferro, 5 cristal. */
  nivel: number;
  /** Multiplicador de velocidade de mineração no material certo. */
  velocidade: number;
  dano: number;
}

export interface DefItem {
  id: string;
  nome: string;
  tipo: TipoItem;
  /** Tamanho máximo da pilha. */
  pilha: number;
  bloco?: number;
  ferramenta?: DefFerramenta;
  durabilidade?: number;
  comida?: { fome: number; saturacao: number };
  /** Cor de destaque do ícone (itens sem bloco). */
  cor?: string;
}

const itens = new Map<string, DefItem>();

export function registrarItem(def: DefItem): DefItem {
  itens.set(def.id, def);
  return def;
}

/** Id do item que representa um bloco. */
export function idDoBloco(bloco: number): string {
  return `bloco:${bloco}`;
}

export function obterItem(id: string): DefItem | undefined {
  if (!itens.has(id) && id.startsWith('bloco:')) registrarBlocos();
  return itens.get(id);
}

export function todosItens(): DefItem[] {
  registrarBlocos();
  return [...itens.values()];
}

let blocosRegistrados = 0;
/** Registra (ou completa) os itens dos blocos do registro; chamável várias vezes. */
export function registrarBlocos(): void {
  if (blocosRegistrados === REGISTRO_BLOCOS.length) return;
  for (const b of REGISTRO_BLOCOS) {
    if (b.id === Bloco.AR || itens.has(idDoBloco(b.id))) continue;
    if (b.semItem) continue;
    registrarItem({
      id: idDoBloco(b.id),
      nome: nomeBonito(b.nome),
      tipo: 'bloco',
      pilha: 64,
      bloco: b.id,
    });
  }
  blocosRegistrados = REGISTRO_BLOCOS.length;
}

export function nomeBonito(nome: string): string {
  return nome.charAt(0).toUpperCase() + nome.slice(1);
}

export function blocoDoItem(id: string | null | undefined): number | null {
  if (!id) return null;
  const def = obterItem(id);
  return def?.bloco ?? null;
}
