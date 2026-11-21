/**
 * O toque nas peças da Noite das Fantasias (spec 027, parte 1): a abóbora gigante pisca os olhos
 * e dá uma risadinha; a porta fechada da Loja, do Castelinho, da Casa da Vovó e das casinhas
 * balança e brilha, sem abrir (a regra da Vila: nada de placa de "em breve"). É desenho só da tela
 * de quem tocou: nenhum estado novo no núcleo.
 *
 * O dedo vale perto da peça (o toque generoso da Vila Neon): a abóbora a até 16 blocos e as
 * portas a até 6, e o dedo a até 60 px do ponto da peça na tela (80 px de alvo, a regra da 031).
 */
import type { EstadoDepuracao } from '../../render/cena';
import { tocarSomInterface } from '../../audio/somInterface';
import { balcoesDoBaile, MAX_POR_LANCHE } from '../../jogo/compra';
import { DESENHOS } from '../../art/itens';
import { boaParaDica, criarDicaToque } from './dicaToque';

const RAIO_TOQUE = 60;
/** Até onde (blocos) a dica de comprar aparece, e quanto a criança se afasta para ela voltar. */
const PERTO_DA_DICA = 3.6;
const LONGE_DA_DICA = 6;

/** O desenho do item (o mesmo da barrinha, 16 × 16) como figura da dica. */
function figuraDoItem(id: string): string {
  const d = DESENHOS[id];
  if (!d) return '';
  let r = '';
  d.linhas.forEach((linha, y) =>
    [...linha].forEach((ch, x) => {
      const cor = d.paleta[ch];
      if (cor) r += `<rect x="${x}" y="${y}" width="1.04" height="1.04" fill="${cor}"/>`;
    }),
  );
  return `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}

export function ligarBaile(e: EstadoDepuracao): void {
  const plano = e.baile?.();
  if (!plano) return;
  const tela = (x: number, y: number, z: number) => e.telaDoPonto?.(x, y, z) ?? null;
  // T14: os lugares de comprar (a mesma lista do núcleo, na mesma ordem)
  const balcoes = balcoesDoBaile(plano);
  let tocouParaComprar = -Infinity;
  const tem = (item: string): number => {
    const inv = e.inventario;
    if (!inv) return 0;
    let n = 0;
    for (let i = 0; i < 36; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  };
  const noJogo = () => {
    const b = document.body;
    return !b.dataset.overlay && !b.classList.contains('modo-foto') && !b.classList.contains('tela-titulo');
  };

  // T14: a dica de comprar (a da 032): perto do balcão, a mãozinha toca no docinho e o
  // balãozinho mostra o desenho dele e "Toque para comprar". Some no meio da entrega e só volta
  // quando a criança se afasta.
  const dica = criarDicaToque();
  const comprando = () => !!e.baileCompras?.estado().some((q) => q.quem === e.voce);
  let usada: { i: number } | null = null;
  let pertoDe: { i: number; desde: number } | null = null;
  const dicaDeComprar = () => {
    const pes = e.jogadorPes?.();
    if (!pes || !noJogo() || comprando()) {
      pertoDe = null;
      return dica.mostrar(null);
    }
    const dist = (i: number) => Math.hypot(pes[0] - balcoes[i].p[0], pes[2] - balcoes[i].p[2]);
    if (usada && dist(usada.i) > LONGE_DA_DICA) usada = null;
    let i = -1;
    balcoes.forEach((b, k) => {
      if (k === usada?.i || tem(b.item) >= MAX_POR_LANCHE || dist(k) > PERTO_DA_DICA) return;
      if (i < 0 || dist(k) < dist(i)) i = k;
    });
    const agora = performance.now() / 1000;
    if (i < 0) {
      pertoDe = null;
      return dica.mostrar(null);
    }
    if (pertoDe?.i !== i) pertoDe = { i, desde: agora };
    const b = balcoes[i];
    const t = tela(b.p[0], b.p[1], b.p[2]);
    if (!t || agora - pertoDe.desde < 0.5 || !boaParaDica(t, innerWidth, innerHeight)) return dica.mostrar(null);
    dica.mostrar({ chave: b.chave, t, figura: figuraDoItem(b.item), texto: 'Toque para comprar' });
  };
  e.cenaBabylon?.().onBeforeRenderObservable.add(dicaDeComprar);
  e.dicaBaile = () => dica.estado();

  window.addEventListener(
    'pointerdown',
    (ev) => {
      const alvo = ev.target as HTMLElement | null;
      if (alvo?.closest?.('button, .alma-fundo, .roleta, .barra, .joystick, .menu-hud, .controle-toque'))
        return;
      if (!noJogo()) return;
      const preso = !!document.pointerLockElement;
      const x = preso ? innerWidth / 2 : ev.clientX;
      const y = preso ? innerHeight / 2 : ev.clientY;
      const pes = e.jogadorPes?.();
      if (!pes) return;
      const perto = (px: number, pz: number, r: number) => Math.hypot(pes[0] - px, pes[2] - pz) <= r;
      let melhor: { d: number; f: () => void } | null = null;
      const conferir = (px: number, py: number, pz: number, r: number, f: () => void) => {
        if (!perto(px, pz, r)) return;
        const t = tela(px, py, pz);
        if (!t) return;
        const d = Math.hypot(t.x - x, t.y - y);
        if (d <= RAIO_TOQUE && (!melhor || d < melhor.d)) melhor = { d, f };
      };
      const a = plano.pontos.abobora;
      // o rosto da abóbora (o meio da cara, na frente da casca) e o meio do corpo
      conferir(a.x, a.y + 0.45 * a.lado, a.z + 0.5 * a.lado, 16, () => e.baileToque?.({ a: 'abobora' }));
      conferir(a.x, a.y + 0.3 * a.lado, a.z + 0.45 * a.lado, 16, () => e.baileToque?.({ a: 'abobora' }));
      (e.bailePortas?.() ?? []).forEach((p, i) =>
        conferir(p.x, p.y, p.z, 6, () => e.baileToque?.({ a: 'porta', i })),
      );
      // T14: o docinho, a caneca ou a surpresa de uva no balcão: um toque e a entrega acontece
      // (com 3 do mesmo, ou no meio da entrega, quem vende só acena)
      balcoes.forEach((b, i) =>
        conferir(b.p[0], b.p[1], b.p[2], b.alcance, () => {
          const agora = performance.now();
          if (tem(b.item) >= MAX_POR_LANCHE || agora - tocouParaComprar < 2300) {
            e.baileCompras?.acenar(b.vendedora);
            return;
          }
          tocouParaComprar = agora;
          usada = { i };
          e.baileCompras?.comprar(i);
        }),
      );
      const m = melhor as { d: number; f: () => void } | null;
      if (!m) return;
      m.f();
      tocarSomInterface('plim');
      ev.stopImmediatePropagation();
      ev.preventDefault();
    },
    { capture: true },
  );
}
