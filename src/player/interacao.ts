import { Bloco } from '../world/blocks';
import type { Edicoes } from '../world/edicoes';
import { colocacaoBloqueada, posicaoColocacao, type Alvo, type Vec3 } from './alvo';

export type AcaoInteracao = 'quebrar' | 'colocar';

export interface ContextoInteracao {
  alvo: Pick<Alvo, 'x' | 'y' | 'z' | 'normal'> | null;
  edicoes: Pick<Edicoes, 'definir'>;
  blocoAtivo: number;
  /** Pés do jogador. */
  jogador: Vec3;
  /** Opcional: substitui `edicoes.definir` (ex.: para enfileirar a remalha). */
  editar?: (x: number, y: number, z: number, bloco: number) => boolean;
  /** Onde colocar (ex.: grama alta e flores são substituídas no próprio lugar). */
  posicao?: (alvo: Pick<Alvo, 'x' | 'y' | 'z' | 'normal'>) => Vec3;
  /** O bloco ocupa espaço? Tocha, flor etc. podem ser postas junto ao corpo. */
  ocupa?: (bloco: number) => boolean;
}

export function executarInteracao(acao: AcaoInteracao, ctx: ContextoInteracao): boolean {
  const { alvo } = ctx;
  if (!alvo) return false;
  const editar = ctx.editar ?? ((x, y, z, b) => ctx.edicoes.definir(x, y, z, b));
  if (acao === 'quebrar') {
    return editar(alvo.x, alvo.y, alvo.z, Bloco.AR);
  }
  if (ctx.blocoAtivo === Bloco.AR) return false;
  const p = ctx.posicao ? ctx.posicao(alvo) : posicaoColocacao(alvo);
  const ocupa = ctx.ocupa ? ctx.ocupa(ctx.blocoAtivo) : true;
  if (ocupa && colocacaoBloqueada(p, ctx.jogador)) return false;
  return editar(p.x, p.y, p.z, ctx.blocoAtivo);
}

export function acaoParaBotao(botao: number, bloqueioAtivo: boolean): AcaoInteracao | null {
  if (!bloqueioAtivo) return null;
  if (botao === 0) return 'quebrar';
  if (botao === 2) return 'colocar';
  return null;
}

export function tratarMenuContexto(evento: { preventDefault(): void }): void {
  evento.preventDefault();
}
