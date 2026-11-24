/**
 * "Meus tesouros" (023, depois de publicada): a prateleira da aba Fantasias do editor com o que
 * a criança comprou na lojinha. Nome escolhido pelo dono; na tela nunca aparece a palavra da
 * loja nem nada em inglês.
 *
 * - Só o que é dela: um toque veste, outro tira, com o mesmo puf de brilho da lojinha.
 * - Um lugar de cada vez (`saiAoVestir`): vestir a capa tira as asas do dragão (e o contrário),
 *   e a troca aparece às claras, como na lojinha: a figurinha do que sai, a seta e o que entra.
 * - Vestir e tirar passam pelo perfil da criança (`vestirPremium`), o mesmo caminho da lojinha:
 *   o boneco do jogo e os amigos recebem igual.
 * - Nada comprado: o bauzinho e a vitrine (só desenho; o toque abre a lojinha), sem pressa.
 */
import { tocarSomInterface } from '../audio/somInterface';
import {
  PREMIUM,
  premiumPorId,
  saiAoVestir,
  type ItemPremium,
  type PerfilAlma,
} from '../jogo/alma';
import { normalizarAparencia, type Aparencia, type PremiumVestido } from '../personagem/aparencia';
import { arte } from './alma/arte';
import { fotografarPremium } from './alma/figuras';
import { fotografarBoneco } from '../render/fotoBoneco';
import { oQueSai, type Saida } from '../personagem/tesouroEFantasia';

/** O que a criança tem e veste (o perfil do aparelho) e como vestir e abrir a lojinha. */
export interface FonteTesouros {
  perfil(): Pick<PerfilAlma, 'premium' | 'vestidos'>;
  vestir(id: string, vestir: boolean): void;
  /** A lojinha já está no jogo (no título, antes do mundo abrir, ainda não). */
  temLojinha(): boolean;
  abrirLojinha(): void;
}

/** A aparência com os premium vestidos de agora (o que a criança está usando de verdade). */
export function comPremium(a: Aparencia, vestidos: PremiumVestido | undefined): Aparencia {
  const sem: Aparencia = { ...a };
  delete sem.premium;
  const v = vestidos && Object.keys(vestidos).length ? { ...vestidos } : undefined;
  return normalizarAparencia(v ? { ...sem, premium: v } : sem);
}

/**
 * A aparência sem os tesouros destes lugares. As miniaturas das escolhas que ficam por baixo de
 * um tesouro (a roupa sob a camiseta, a fantasia sob o dragão) mostram a escolha sem ele: senão
 * todas sairiam iguais.
 */
export function semTesouros(a: Aparencia, lugares: readonly (keyof PremiumVestido)[]): Aparencia {
  if (!a.premium || !lugares.some((l) => a.premium?.[l])) return a;
  const premium = { ...a.premium };
  for (const l of lugares) delete premium[l];
  const out: Aparencia = { ...a };
  if (Object.keys(premium).length) out.premium = premium;
  else delete out.premium;
  return out;
}

/** Os tesouros da criança, na ordem da vitrine (só os do catálogo). */
export function tesourosDaCrianca(p: Pick<PerfilAlma, 'premium'>): ItemPremium[] {
  return PREMIUM.filter((x) => p.premium.includes(x.id));
}

/** O toque num tesouro: veste (e o que sai) ou tira. */
export function toqueNoTesouro(
  vestidos: Readonly<PremiumVestido>,
  id: string,
): { vestir: boolean; sai: string[] } {
  const p = premiumPorId(id);
  if (!p) return { vestir: false, sai: [] };
  if (vestidos[p.categoria] === id) return { vestir: false, sai: [] };
  return { vestir: true, sai: saiAoVestir(vestidos, id) };
}

const SETA = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 32 H46 M34 18 L50 32 L34 46" fill="none" stroke="#ffe27a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const CAMISETA = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 8 L32 14 L42 8 L58 18 L52 30 L46 27 L46 58 L18 58 L18 27 L12 30 L6 18 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;

export const CSS_TESOUROS = `
.painel-personagem .tesouros {
  position: relative; display: grid; gap: 8px; padding: 10px 12px 12px; border-radius: 20px; overflow: hidden;
  color: #fff;
  background:
    radial-gradient(ellipse 60% 70% at 50% -10%, rgba(255, 228, 150, 0.22), transparent 70%),
    repeating-linear-gradient(118deg, rgba(255,255,255,0.025) 0 2px, transparent 2px 6px),
    radial-gradient(ellipse at 50% 30%, #4d3cb4 0%, #2b1f78 60%, #1a1150 100%);
  box-shadow: inset 0 0 0 3px #e6b23e, inset 0 0 0 6px rgba(255, 226, 140, 0.18), 0 5px 0 #120c36;
}
.painel-personagem .tesouros .ceu-t { position: absolute; inset: 0; pointer-events: none; }
.painel-personagem .tesouros .ceu-t i { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; box-shadow: 0 0 6px #fff;
  animation: tesouro-pisca 2.6s ease-in-out infinite; }
@keyframes tesouro-pisca { 50% { opacity: 0.25; transform: scale(0.6); } }
.painel-personagem .tesouros .titulo-t { position: relative; display: flex; align-items: center; gap: 8px;
  font: 700 1.05rem var(--display); color: #ffe27a; text-shadow: 0 2px 0 #140e44; }
.painel-personagem .tesouros .titulo-t .bauzinho { width: 40px; height: 40px; flex: none; filter: drop-shadow(0 0 8px rgba(255, 214, 120, 0.45)); }
.painel-personagem .tesouros .titulo-t .bauzinho svg { width: 100%; height: 100%; display: block; }
.painel-personagem .tesouros .lista-t { position: relative; display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; }
/* spec 036 (T06): com os 18 tesouros a prateleira não toma o painel: rola dentro dela (num
   rolo em volta da grade: a grade fica com a altura dela, os cartões nunca se encavalam) */
.painel-personagem .tesouros .rolo-t { position: relative; max-height: 180px; overflow-y: auto; overscroll-behavior: contain; padding: 4px; margin: -4px; scrollbar-width: thin; }
.painel-personagem .tesouros .rolo-t[hidden], .painel-personagem .tesouros .lista-t[hidden] { display: none; }
.painel-personagem .tesouros button.tesouro {
  position: relative; aspect-ratio: 5 / 6; min-height: 0; padding: 0; border-radius: 18px; overflow: hidden; isolation: isolate;
  background: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.12)),
    radial-gradient(ellipse at 50% 30%, #6e56e0 0%, #3b2b9e 58%, #231870 100%);
  box-shadow: 0 0 0 3px #e9b949, inset 0 -14px 20px rgba(10, 5, 40, 0.35), 0 5px 0 2px #120c36;
}
.painel-personagem .tesouros button.tesouro:hover { filter: brightness(1.08); }
.painel-personagem .tesouros button.tesouro:active { transform: scale(0.95); box-shadow: 0 0 0 3px #e9b949, 0 2px 0 2px #120c36; }
.painel-personagem .tesouros button.tesouro:focus-visible { outline: 3px solid #7fe0ff; outline-offset: 4px; }
.painel-personagem .tesouros button.tesouro[aria-pressed='true'] {
  background: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.12)),
    radial-gradient(ellipse at 50% 30%, #6e56e0 0%, #3b2b9e 58%, #231870 100%);
  box-shadow: 0 0 0 4px #7fe0ff, 0 0 22px 6px rgba(127, 224, 255, 0.5), inset 0 -14px 20px rgba(10, 5, 40, 0.35), 0 5px 0 2px #120c36;
}
/* tudo mora dentro do cartão (o iPhone em pé estourava o selo e os pés para fora): o boneco
   numa caixa posta por inset, sem depender da altura em % de item de grade */
.painel-personagem .tesouros .pedestal-t { position: absolute; left: 50%; bottom: 8%; width: 68%; height: 11%; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(ellipse at 50% 35%, #fff4c2, #e9b949 55%, #a8741a 100%); box-shadow: 0 4px 0 #7a5214, 0 0 18px 4px rgba(255, 214, 120, 0.35); }
.painel-personagem .tesouros .arte-t { position: absolute; inset: 10% 8% 14%; display: block; pointer-events: none;
  animation: tesouro-flutua 3.4s ease-in-out infinite; animation-delay: var(--f, 0s); }
@keyframes tesouro-flutua { 50% { transform: translateY(-4%); } }
.painel-personagem .tesouros .arte-t canvas { position: absolute; inset: 0; width: 100%; height: 100%; max-width: 100%; max-height: 100%; object-fit: contain; object-position: 50% 100%;
  filter: drop-shadow(0 5px 0 rgba(10,5,40,0.32)) drop-shadow(0 0 10px rgba(255,230,160,0.3)); }
.painel-personagem .tesouros .vestindo { position: absolute; z-index: 1; left: 7px; top: 7px; width: 28px; height: 28px; padding: 5px; box-sizing: border-box; border-radius: 50%;
  background: linear-gradient(#bff0ff, #39b8e8); box-shadow: 0 0 0 2px #fff, 0 3px 0 2px #1d7aa8; display: none; pointer-events: none; }
.painel-personagem .tesouros .vestindo svg { width: 100%; height: 100%; display: block; }
.painel-personagem .tesouros button.tesouro[aria-pressed='true'] .vestindo { display: block; }
.painel-personagem .tesouros button.tesouro.puf::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(circle at 50% 45%, rgba(255, 246, 190, 0.95), rgba(255, 246, 190, 0) 62%);
  animation: tesouro-puf 0.7s ease-out forwards;
}
@keyframes tesouro-puf { from { opacity: 1; transform: scale(0.6); } to { opacity: 0; transform: scale(1.25); } }
.painel-personagem .tesouros .faisca-t { position: absolute; z-index: 2; width: 16px; height: 16px; pointer-events: none; left: var(--x); top: var(--y);
  background: #ffe066; clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  filter: drop-shadow(0 0 4px rgba(255, 240, 160, 0.9)); transform: translate(-50%, -50%) scale(0);
  animation: brilho-festa 0.8s ease-out var(--atraso) forwards; }
.painel-personagem .tesouros .troca-t { position: absolute; z-index: 3; top: 6px; right: 10px; height: 46px; display: flex; align-items: center; gap: 4px;
  padding: 0 8px; border-radius: 16px; background: rgba(8, 4, 30, 0.72); box-shadow: inset 0 0 0 2px rgba(230, 178, 62, 0.8), 0 4px 10px rgba(0,0,0,0.35);
  animation: tesouro-troca 0.3s ease-out both; pointer-events: none; }
.painel-personagem .tesouros .troca-t[hidden] { display: none; }
@keyframes tesouro-troca { from { opacity: 0; transform: translateY(-6px); } }
.painel-personagem .tesouros .troca-t .fig-t { width: 38px; height: 42px; display: grid; place-items: center; }
.painel-personagem .tesouros .troca-t .fig-t canvas { width: 100%; height: 100%; object-fit: contain; }
.painel-personagem .tesouros .troca-t .sai { opacity: 0.45; filter: grayscale(0.7); }
.painel-personagem .tesouros .troca-t .seta-t { width: 26px; height: 26px; }
.painel-personagem .tesouros .troca-t .seta-t svg { width: 100%; height: 100%; display: block; }
/* nada comprado ainda: o bauzinho fechado e a vitrine (o toque abre a lojinha) */
.painel-personagem .tesouros[data-vazio='true'] { grid-template-columns: auto 1fr; align-items: center; }
.painel-personagem .tesouros .vazio-t { position: relative; display: flex; align-items: center; justify-content: flex-end; gap: 12px; }
.painel-personagem .tesouros .vazio-t[hidden] { display: none; }
.painel-personagem .tesouros button.ir-lojinha {
  width: 64px; height: 64px; min-height: 0; padding: 8px; border-radius: 20px; display: grid; place-items: center;
  background: radial-gradient(ellipse at 50% 30%, #6e56e0 0%, #3b2b9e 58%, #231870 100%);
  box-shadow: 0 0 0 3px #e9b949, 0 0 18px 4px rgba(255, 214, 120, 0.3), 0 5px 0 2px #120c36;
}
.painel-personagem .tesouros button.ir-lojinha svg { width: 100%; height: 100%; display: block; animation: tesouro-flutua 3.4s ease-in-out infinite; }
.painel-personagem .tesouros button.ir-lojinha:active { transform: scale(0.95); }
.painel-personagem .tesouros .vazio-t .pontinhos { display: flex; gap: 8px; }
.painel-personagem .tesouros .vazio-t .pontinhos i { width: 34px; height: 40px; border-radius: 12px; border: 2px dashed rgba(233, 185, 73, 0.55); box-sizing: border-box; }
@media (max-width: 420px) {
  .painel-personagem .tesouros .lista-t { grid-template-columns: repeat(auto-fill, minmax(66px, 1fr)); gap: 9px; }
  .painel-personagem .tesouros .titulo-t { font-size: 0.98rem; }
  .painel-personagem .tesouros .vestindo { left: 5px; top: 5px; width: 24px; height: 24px; padding: 4px; }
  .painel-personagem .tesouros[data-vazio='true'] .titulo-t { flex-direction: column; gap: 2px; font-size: 0.86rem; }
  .painel-personagem .tesouros .vazio-t .pontinhos i:nth-child(3) { display: none; }
}
/* celular deitado: a tela é baixa; o título vira uma coluna estreita ao lado da fileira */
@media (max-height: 500px) {
  .painel-personagem .tesouros { grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 6px 12px; padding: 8px 12px; }
  .painel-personagem .tesouros .titulo-t { flex-direction: column; gap: 2px; font-size: 0.86rem; text-align: center; }
  .painel-personagem .tesouros .lista-t { grid-template-columns: repeat(auto-fill, minmax(66px, 1fr)); }
  .painel-personagem .tesouros .rolo-t { max-height: 112px; }
  .painel-personagem .tesouros button.tesouro { aspect-ratio: 1; }
  .painel-personagem .tesouros .vestindo { left: 5px; top: 5px; width: 24px; height: 24px; padding: 4px; }
  .painel-personagem .tesouros .troca-t { top: 50%; right: auto; left: 6px; transform: translateY(-50%); animation: none; }
}
@media (prefers-reduced-motion: reduce) {
  .painel-personagem .tesouros .arte-t, .painel-personagem .tesouros button.ir-lojinha svg, .painel-personagem .tesouros .ceu-t i { animation: none; }
}
`;

const FAISCAS: Array<[number, number, number]> = [
  [14, 18, 0],
  [86, 22, 60],
  [8, 62, 120],
  [92, 58, 30],
  [50, 2, 90],
];

export interface OpcoesTesouros {
  fonte: FonteTesouros;
  /** A aparência da criança no editor (o boneco que veste as roupas nas figuras). */
  aparencia(): Aparencia;
  /** Vestiu agora: o puf de brilho no palco do editor. */
  aoVestir(): void;
}

export interface MeusTesouros {
  raiz: HTMLElement;
  /** Reflete o perfil de agora (o que tem, o que veste) e refaz as figuras. */
  atualizar(): void;
}

export function criarMeusTesouros(op: OpcoesTesouros): MeusTesouros {
  const raiz = document.createElement('section');
  raiz.className = 'tesouros';
  raiz.setAttribute('data-tesouros', '');
  raiz.setAttribute('aria-label', 'Meus tesouros');
  const ceu = document.createElement('span');
  ceu.className = 'ceu-t';
  ceu.setAttribute('aria-hidden', 'true');
  for (const [x, y, d] of [
    [8, 20, 0],
    [93, 14, 0.9],
    [70, 30, 1.7],
    [30, 12, 2.2],
    [96, 70, 0.4],
  ]) {
    const i = document.createElement('i');
    i.style.left = `${x}%`;
    i.style.top = `${y}%`;
    i.style.animationDelay = `${d}s`;
    ceu.appendChild(i);
  }
  const titulo = document.createElement('div');
  titulo.className = 'titulo-t';
  const bau = document.createElement('span');
  bau.className = 'bauzinho';
  bau.innerHTML = arte('tesouros');
  titulo.append(bau, 'Meus tesouros');
  const troca = document.createElement('div');
  troca.className = 'troca-t';
  troca.setAttribute('data-tesouro-troca', '');
  troca.setAttribute('role', 'status');
  troca.hidden = true;
  const lista = document.createElement('div');
  lista.className = 'lista-t';
  lista.setAttribute('role', 'group');
  lista.setAttribute('aria-label', 'Meus tesouros');
  const vazio = document.createElement('div');
  vazio.className = 'vazio-t';
  vazio.setAttribute('data-tesouros-vazio', '');
  const pontinhos = document.createElement('span');
  pontinhos.className = 'pontinhos';
  pontinhos.setAttribute('aria-hidden', 'true');
  pontinhos.innerHTML = '<i></i><i></i><i></i>';
  const irLojinha = document.createElement('button');
  irLojinha.type = 'button';
  irLojinha.className = 'ir-lojinha';
  irLojinha.setAttribute('data-tesouros-lojinha', '');
  irLojinha.setAttribute('aria-label', 'Abrir a lojinha');
  irLojinha.title = 'Lojinha';
  irLojinha.innerHTML = arte('vitrine');
  irLojinha.addEventListener('click', () => {
    tocarSomInterface('toc');
    op.fonte.abrirLojinha();
  });
  vazio.append(pontinhos, irLojinha);
  // spec 036 (T06): o rolo em volta da grade (com muitos tesouros, rola dentro dele)
  const rolo = document.createElement('div');
  rolo.className = 'rolo-t';
  rolo.appendChild(lista);
  raiz.append(ceu, titulo, troca, rolo, vazio);

  const cartas = new Map<string, { botao: HTMLButtonElement; canvas: HTMLCanvasElement }>();
  let chaveLista = '';
  let fecharTroca: ReturnType<typeof setTimeout> | undefined;

  function montar(itens: ItemPremium[]): void {
    lista.replaceChildren();
    cartas.clear();
    itens.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tesouro';
      b.dataset.tesouro = p.id;
      b.setAttribute('aria-label', p.nome);
      b.title = p.nome;
      b.style.setProperty('--f', `${(i % 4) * -0.8}s`);
      const ped = document.createElement('span');
      ped.className = 'pedestal-t';
      const a = document.createElement('span');
      a.className = 'arte-t';
      const cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      a.appendChild(cv);
      const selo = document.createElement('span');
      selo.className = 'vestindo';
      selo.setAttribute('data-tesouro-vestindo', '');
      selo.innerHTML = CAMISETA;
      b.append(ped, a, selo);
      b.addEventListener('click', () => tocar(p.id, b));
      cartas.set(p.id, { botao: b, canvas: cv });
      lista.appendChild(b);
    });
  }

  function tocar(id: string, b: HTMLButtonElement): void {
    const vestidos = op.fonte.perfil().vestidos;
    const t = toqueNoTesouro(vestidos, id);
    if (t.vestir) {
      // spec 036 (T06): a regra única do que sai, com a fantasia às claras também
      mostrarTroca(id, oQueSai(op.aparencia(), vestidos, { premium: id }));
      puf(b);
      tocarSomInterface('criar');
      op.fonte.vestir(id, true);
      op.aoVestir();
    } else {
      troca.hidden = true;
      tocarSomInterface('toc');
      op.fonte.vestir(id, false);
    }
    atualizar();
  }

  function puf(b: HTMLButtonElement): void {
    b.classList.remove('puf');
    void b.offsetWidth;
    b.classList.add('puf');
    for (const f of b.querySelectorAll('.faisca-t')) f.remove();
    for (const [x, y, atraso] of FAISCAS) {
      const s = document.createElement('i');
      s.className = 'faisca-t';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--x', `${x}%`);
      s.style.setProperty('--y', `${y}%`);
      s.style.setProperty('--atraso', `${atraso}ms`);
      b.appendChild(s);
    }
    setTimeout(() => {
      b.classList.remove('puf');
      for (const f of b.querySelectorAll('.faisca-t')) f.remove();
    }, 1000);
  }

  /** O que saiu ao vestir (a figurinha apagada, a seta e o que entrou), por um instante. */
  function mostrarTroca(id: string, saidas: readonly Saida[]): void {
    clearTimeout(fecharTroca);
    if (!saidas.length) {
      troca.hidden = true;
      return;
    }
    const p = premiumPorId(id);
    // um por coisa: cada tesouro e a fantasia (inteira ou só a peça dela)
    const sai = [
      ...new Set(
        saidas.map((s) =>
          s.tipo === 'premium' ? s.id : `fantasia:${s.tipo === 'fantasia' ? s.id : s.fantasia}`,
        ),
      ),
    ];
    troca.replaceChildren();
    troca.setAttribute('data-tesouro-troca', sai.join(' '));
    troca.setAttribute(
      'aria-label',
      `${p?.nome ?? id} entra no lugar de ${sai.map((s) => (s.startsWith('fantasia:') ? 'a fantasia' : (premiumPorId(s)?.nome ?? s))).join(' e ')}`,
    );
    const base = op.aparencia();
    const fig = (pid: string, classe: string) => {
      const el = document.createElement('span');
      el.className = `fig-t ${classe}`;
      const cv = document.createElement('canvas');
      cv.setAttribute('aria-hidden', 'true');
      if (pid.startsWith('fantasia:'))
        fotografarBoneco(cv, normalizarAparencia({ ...base, premium: undefined, fantasia: { id: pid.slice(9), cor: base.fantasia?.cor ?? 0 } }), 'corpo', 120);
      else fotografarPremium(cv, pid, 120, base);
      el.appendChild(cv);
      return el;
    };
    for (const s of sai) troca.appendChild(fig(s, 'sai'));
    const seta = document.createElement('span');
    seta.className = 'seta-t';
    seta.innerHTML = SETA;
    troca.append(seta, fig(id, 'entra'));
    troca.hidden = false;
    fecharTroca = setTimeout(() => (troca.hidden = true), 3200);
  }

  function atualizar(): void {
    const perfil = op.fonte.perfil();
    const itens = tesourosDaCrianca(perfil);
    const chave = itens.map((p) => p.id).join();
    if (chave !== chaveLista) {
      chaveLista = chave;
      montar(itens);
    }
    raiz.dataset.vazio = String(!itens.length);
    lista.hidden = !itens.length;
    rolo.hidden = !itens.length;
    vazio.hidden = !!itens.length;
    irLojinha.hidden = !op.fonte.temLojinha();
    const base = op.aparencia();
    for (const [id, c] of cartas) {
      const p = premiumPorId(id)!;
      c.botao.setAttribute('aria-pressed', String(perfil.vestidos[p.categoria] === id));
      // só com a prateleira à vista (a aba Fantasias aberta): as outras abas não esperam
      if (raiz.isConnected && raiz.offsetParent !== null)
        fotografarPremium(c.canvas, id, 200, base);
    }
  }

  return { raiz, atualizar };
}
