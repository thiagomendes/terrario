/**
 * Gestos no jogo (spec 015, T04): o menu da tela com a roda (src/ui/menuRoda.ts: G abre os
 * gestos; com ela aberta, 1 a 8 escolhem e Esc fecha — fechada, os números continuam sendo da
 * barra de itens), o gesto do
 * próprio boneco na hora (previsão), o comando para o núcleo e o que chega dele: o gesto dos
 * amigos e dos moradores que respondem.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import {
  GESTOS,
  INTERVALO_GESTO,
  ehGesto,
  type AnimadorComGestos,
  type IdGesto,
} from '../personagem/gestos';
import type { Comando, EventoNucleo } from '../nucleo/protocolo';
import { criarBalao, type BalaoGesto } from './balaoGesto';
import type { Roda } from '../ui/roda';
import { criarMenuRoda, type MenuRoda } from '../ui/menuRoda';
import { ICONES_GESTOS, svgDoIcone } from '../ui/iconesGestos';

export interface OpcoesGestosJogo {
  scene: Scene;
  /** O boneco do jogador (o balão fica em cima dele). */
  raiz: TransformNode;
  animador: AnimadorComGestos;
  enviar(c: Comando): void;
  proximoId(): number;
  /** Pode gesticular agora (no jogo, acordado, sem painel aberto). */
  pode(): boolean;
  /** Amigos e moradores: tocam o gesto que chegou do núcleo. */
  gestoDoAmigo(id: string, g: IdGesto): void;
  gestoDoMorador(id: number, g: IdGesto, voz: boolean): void;
  /** Relógio (s); os testes podem trocar. */
  agora?(): number;
}

export interface GestosJogo {
  readonly roda: Roda;
  readonly menu: MenuRoda;
  /** Faz o gesto (do botão, da tecla ou dos testes). Devolve se valeu (limite de repetição). */
  fazer(g: IdGesto): boolean;
  /** Avança o balão do jogador (uma vez por quadro). */
  atualizar(dt: number): void;
  /** Evento `gesto` do núcleo. */
  evento(e: Extract<EventoNucleo, { e: 'gesto' }>): void;
  readonly balao: BalaoGesto;
}

export function criarGestosJogo(op: OpcoesGestosJogo): GestosJogo {
  const agora = op.agora ?? (() => performance.now() / 1000);
  const balao = criarBalao(op.scene, op.raiz);
  let ultimo = -Infinity;

  function fazer(g: IdGesto): boolean {
    if (!op.pode()) return false;
    const t = agora();
    if (t - ultimo < INTERVALO_GESTO) return false;
    ultimo = t;
    // previsão: o boneco e o balão na hora; o núcleo avisa os amigos e o mundo responde
    op.animador.gesto(g);
    balao.mostrar(g);
    op.enviar({ t: 'gesto', id: op.proximoId(), gesto: g });
    window.dispatchEvent(new CustomEvent('brumaluz:gesto', { detail: g }));
    return true;
  }

  // o menu da tela (opção C): a mesma roda tem o menu e os gestos
  const menu = criarMenuRoda({
    gestos: GESTOS.map((g) => ({ id: g.id, nome: g.nome, icone: svgDoIcone(ICONES_GESTOS[g.id]) })),
    fazerGesto: (id) => {
      if (ehGesto(id)) fazer(id);
    },
    pode: op.pode,
  });
  const roda = menu.roda;
  // pedido de abrir os gestos (testes, atalhos)
  window.addEventListener('brumaluz:gestos', () => {
    if (menu.aberta === 'gestos') menu.fechar();
    else menu.abrirGestos(true);
  });

  return {
    roda,
    menu,
    fazer,
    atualizar(dt) {
      balao.atualizar(dt);
      // painel aberto, modo foto ou desmaio: a roda fecha
      if (roda.aberta && !op.pode()) roda.fechar();
    },
    evento(e) {
      if (!ehGesto(e.gesto)) return;
      if (e.jogador !== undefined) op.gestoDoAmigo(e.jogador, e.gesto);
      else if (e.criatura !== undefined) op.gestoDoMorador(e.criatura, e.gesto, !!e.voz);
    },
    balao,
  };
}
