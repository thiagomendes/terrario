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
import { premiumPorId, type Missao } from '../../jogo/alma';
import type { IdBichoPremium } from '../../render/bichoPremium';
import type { RecorteBoneco } from '../../render/fotoBoneco';

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

/**
 * Como cada premium aparece na lojinha: desenhado do 3D de verdade (a criança vê o que
 * ganha). As roupas no boneco da própria criança (sem a fantasia da 017), cada uma do jeito que
 * ela aparece melhor (a capa de costas); os bichinhos sozinhos.
 */
const FOTO_PREMIUM: Record<
  string,
  { recorte: RecorteBoneco; giro: number; bicho?: IdBichoPremium; tudo?: boolean; montado?: true }
> = {
  // spec 036 (T06): os brinquedos de andar com a criança montada (o brinquedo inteiro no quadro)
  'patinete-luz': { recorte: 'corpo', giro: 0.9, tudo: true, montado: true },
  'carrinho-pedal': { recorte: 'corpo', giro: 0.9, tudo: true, montado: true },
  bicicletinha: { recorte: 'corpo', giro: 1.1, tudo: true, montado: true },
  'nuvem-fofa': { recorte: 'corpo', giro: 0.7, tudo: true, montado: true },
  'camiseta-aquario': { recorte: 'corpo', giro: 0.36 },
  'tenis-cometa': { recorte: 'corpo', giro: 0.75 },
  'capa-estrelas': { recorte: 'corpo', giro: Math.PI - 1.05 },
  // (portão visual: as asas inteiras no quadro, sem o corte reto da borda)
  dragao: { recorte: 'corpo', giro: 0.62, tudo: true },
  pinguim: { recorte: 'corpo', giro: 0.5, bicho: 'pinguim' },
  unicornio: { recorte: 'corpo', giro: 0.62, bicho: 'unicornio' },
  // spec 036: os tesouros novos no boneco da criança, cada um do lado em que aparece melhor (as
  // costas de quina por trás; o passarinho no ombro direito, de frente para ele; o guarda-chuva e
  // a pipa com o boneco inteiro, para o que fica no alto caber no quadro)
  // (portão visual: o passarinho voa perto do ombro; o quadro pega ele inteiro)
  'passarinho-ombro': { recorte: 'corpo', giro: -0.55, tudo: true },
  'bone-helice': { recorte: 'busto', giro: 0.5 },
  'pijama-nuvem': { recorte: 'corpo', giro: 0.36 },
  'asas-borboleta': { recorte: 'corpo', giro: Math.PI - 0.75, tudo: true },
  'mochila-foguete': { recorte: 'corpo', giro: Math.PI - 1.1 },
  // (portão visual: quase de frente, a mão da varinha fica ao lado do rosto, não na frente dele;
  // as bolhas saindo do aro são desenhadas na foto, no `fotoBoneco.ts`)
  'varinha-bolhas': { recorte: 'corpo', giro: 0.12, tudo: true },
  'guarda-chuva-gotinhas': { recorte: 'corpo', giro: 0.5, tudo: true },
  'pipa-lacinhos': { recorte: 'corpo', giro: Math.PI - 0.5, tudo: true },
};

/** A foto de um premium (o 3D de verdade) num canvas novo. */
export function fotoPremium(id: string, altura = 280, base?: Aparencia): HTMLCanvasElement {
  const cv = document.createElement('canvas');
  fotografarPremium(cv, id, altura, base);
  return cv;
}

/**
 * A foto de um premium num canvas que já existe (o editor refaz quando a criança muda).
 * `base`: o boneco que veste (padrão: o do jogo).
 */
export function fotografarPremium(
  cv: HTMLCanvasElement,
  id: string,
  altura = 280,
  base?: Aparencia,
): void {
  const p = premiumPorId(id);
  const f = FOTO_PREMIUM[id];
  if (!p || !f) return;
  const a = base ?? aparenciaAtual();
  fotografarBoneco(
    cv,
    normalizarAparencia({
      ...a,
      fantasia: undefined,
      premium: { [p.categoria]: id },
      // (patins e skate do mundo não entram na foto; o de andar vai montado)
      patins: undefined,
      skate: undefined,
      montado: f.montado,
    }),
    f.recorte,
    altura,
    { giro: f.giro, bicho: f.bicho, tudo: f.tudo },
  );
}

/** Uma figura pelo nome: 'item:<id>', 'fantasia:<id>', 'obra:<n>', 'premium:<id>' ou um desenho de arte.ts. */
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
  } else if (desenho.startsWith('premium:')) {
    el.appendChild(fotoPremium(desenho.slice(8)));
    el.dataset.tipo = 'premium';
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
  } else if (d.tipo === 'arte') {
    // spec 031: os desenhos próprios (o que fazer e o selinho da ação)
    caixa.dataset.arte = '';
    caixa.appendChild(figura(d.principal, 'principal'));
    caixa.appendChild(figura(d.selo, 'selo'));
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
  // o passeio (030): o tênis e as casinhas, nada de sorvete (a c6 é que é a sorveteria)
  if (d.tipo === 'lugares') return 'passeio';
  // spec 031: o resultado (o bolo aceso, o bicho com coração), nunca o da esquerda
  if (d.tipo === 'arte') return d.resultado;
  return `item:${d.item}`;
}

/** As bolinhas do progresso: a figura de cada vez (cinza → colorida). */
export function desenhoDaBolinha(m: Pick<Missao, 'desenho'>, i: number): string {
  const d = m.desenho;
  if (d.tipo === 'lugares') return d.usos[i] ?? 'estrela';
  if (d.tipo === 'bicho') return d.bicho;
  if (d.tipo === 'item') return `item:${d.item}`;
  if (d.tipo === 'arte') return d.bolinhas?.[i] ?? d.bolinha;
  return 'estrela';
}
