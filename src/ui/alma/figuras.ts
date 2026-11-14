/**
 * Spec 023: as figuras da alma (tudo desenhado no projeto): o ícone de brinquedo dos itens
 * (012), a foto do boneco de verdade com a fantasia (017), a obra em isométrico com as
 * texturas do jogo (014) e os desenhos de `arte.ts`.
 */
import { atlasDosIcones, desenharIsometrico, iconeDoItem, EVENTO_ICONES } from '../icones';
import { TAM_TILE } from '../../art/atlas';
import { celulasDaObra, obraDoCanteiro } from '../../world/obras';
import { fotografarBoneco } from '../../render/fotoBoneco';
import { normalizarAparencia, type Aparencia } from '../../personagem/aparencia';
import { arte } from './arte';
import type { Missao } from '../../jogo/alma';

function aparenciaAtual(): Aparencia {
  const a = window.__brumaluz?.personagem?.aparencia?.() as Aparencia | undefined;
  return normalizarAparencia(a ?? {});
}

const cacheObra = new Map<number, string>();
/** A obra do canteiro n em isométrico, com as texturas dos blocos de verdade (data URL). */
export function desenhoDaObra(n: number): string {
  const pronto = cacheObra.get(n);
  if (pronto) return pronto;
  const def = obraDoCanteiro(n);
  const c = document.createElement('canvas');
  const T = 48; // lado do cubo no desenho (a tela reduz)
  const cel = def ? celulasDaObra(def) : [];
  if (!def || !cel.length) return '';
  const s0 = Math.min(...cel.map((q) => q.s));
  const f0 = Math.min(...cel.map((q) => q.f));
  const pts = cel.map((q) => ({ ...q, s: q.s - s0, f: q.f - f0 }));
  const a = T / 2;
  const q4 = T / 4;
  const xs = pts.map((p) => (p.s - p.f) * a);
  const ys = pts.map((p) => (p.s + p.f) * q4 - p.y * a);
  const minX = Math.min(...xs) - a;
  const maxX = Math.max(...xs) + a;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) + T;
  const m = 10;
  c.width = Math.ceil(maxX - minX + m * 2);
  c.height = Math.ceil(maxY - minY + m * 2);
  const ctx = c.getContext('2d')!;
  const { atlas, fonte } = atlasDosIcones();
  const px = (uv: { u0: number; v0: number }): [number, number] => [
    Math.round(uv.u0 * atlas.largura),
    Math.round(uv.v0 * atlas.altura),
  ];
  const cuboCv = document.createElement('canvas');
  cuboCv.width = T;
  cuboCv.height = T;
  const cubo = cuboCv.getContext('2d')!;
  // de trás para a frente, de baixo para cima
  const ordem = [...pts].sort((p, q) => p.s + p.f - (q.s + q.f) || p.y - q.y || p.s - q.s);
  for (const p of ordem) {
    const lado = atlas.uvDaFace(p.bloco, 'lado');
    const topo = atlas.uvDaFace(p.bloco, 'topo');
    if (!lado || !topo) continue;
    // desenharIsometrico usa setTransform (absoluto): desenha num quadrinho e cola no lugar
    cubo.clearRect(0, 0, T, T);
    desenharIsometrico(cubo, fonte, { topo: px(topo), lado: px(lado) }, T);
    ctx.drawImage(cuboCv, (p.s - p.f) * a - minX - a + m, (p.s + p.f) * q4 - p.y * a - minY + m);
  }
  void TAM_TILE;
  const url = c.toDataURL();
  cacheObra.set(n, url);
  return url;
}

/** Uma figura pelo nome: 'item:<id>', 'fantasia:<id>', 'obra:<n>' ou um desenho de arte.ts. */
export function figura(desenho: string, classe = ''): HTMLElement {
  const el = document.createElement('span');
  el.className = `alma-fig ${classe}`.trim();
  if (desenho.startsWith('item:')) {
    const img = document.createElement('img');
    img.alt = '';
    const id = desenho.slice(5);
    img.src = iconeDoItem(id);
    // os ícones de brinquedo (3D) chegam depois do jogo abrir: troca quando chegarem
    window.addEventListener(EVENTO_ICONES, () => (img.src = iconeDoItem(id)));
    el.appendChild(img);
    el.dataset.tipo = 'item';
  } else if (desenho.startsWith('fantasia:')) {
    const cv = document.createElement('canvas');
    const id = desenho.slice(9);
    fotografarBoneco(cv, { ...aparenciaAtual(), fantasia: { id, cor: 0 } }, 'corpo', 260);
    el.appendChild(cv);
    el.dataset.tipo = 'fantasia';
  } else if (desenho.startsWith('obra:')) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = desenhoDaObra(Number(desenho.slice(5)));
    el.appendChild(img);
    el.dataset.tipo = 'obra';
  } else {
    el.innerHTML = arte(desenho);
    el.dataset.tipo = 'arte';
  }
  return el;
}

/** O desenho principal da missão (o que fazer) e o selinho da ação. */
export function figuraMissao(m: Pick<Missao, 'desenho'>): HTMLElement {
  const caixa = document.createElement('span');
  caixa.className = 'alma-fig-missao';
  const d = m.desenho;
  if (d.tipo === 'obra') {
    // a obra (com as texturas de verdade) e o selinho da colher de pedreiro: "construir isto"
    caixa.appendChild(figura(`obra:${d.canteiro}`, 'principal'));
    caixa.appendChild(figura('construtor', 'selo'));
  } else if (d.tipo === 'bicho') {
    caixa.appendChild(figura(d.bicho, 'principal'));
    caixa.appendChild(figura(`item:${d.item}`, 'selo'));
  } else if (d.tipo === 'lugares') {
    const trio = document.createElement('span');
    trio.className = 'alma-trio';
    for (const u of d.usos) trio.appendChild(figura(u));
    caixa.appendChild(trio);
  } else {
    caixa.appendChild(figura(`item:${d.item}`, 'principal'));
    if (d.acao) caixa.appendChild(figura(d.acao, 'selo'));
  }
  return caixa;
}

/** O desenho que vira figurinha no álbum (a obra, o bicho, o item). */
export function desenhoDaFigurinha(m: Pick<Missao, 'desenho'>): string {
  const d = m.desenho;
  if (d.tipo === 'obra') return `obra:${d.canteiro}`;
  if (d.tipo === 'bicho') return d.bicho;
  if (d.tipo === 'lugares') return 'sorveteria';
  return `item:${d.item}`;
}

/** As bolinhas do progresso: a figura de cada vez (cinza → colorida). */
export function desenhoDaBolinha(m: Pick<Missao, 'desenho'>, i: number): string {
  const d = m.desenho;
  if (d.tipo === 'lugares') return d.usos[i] ?? 'estrela';
  if (d.tipo === 'bicho') return d.bicho;
  if (d.tipo === 'item') return `item:${d.item}`;
  return 'estrela';
}
