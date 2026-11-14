/**
 * Spec 023 (T06): o HUD da alma, promovido do esboço aprovado (rodada 2).
 *
 * - **Carteira (todo mundo):** a estrela do nível com o anel do XP e as moedinhas. Toca e abre
 *   o baú da criança.
 * - **Cartão da missão (só onde há missões: Cidade Grande e Rancho Alegre):** o que fazer, o
 *   progresso (bolinhas com a figura ou a barra da obra) e o prêmio, sem texto. Fica no lugar
 *   do chip do diário (o diário continua na roda do menu).
 * - **Quadro de missões:** as abertas, cada uma com o prêmio grande e o botão de brincar
 *   (fixa a missão do cartão). Abre sozinho só na primeira visita a cada mundo.
 *
 * O texto que aparece é só número; o `aria-label` é para os pais e o leitor de tela. Peças de
 * brinquedo da 012 (creme, degrau embaixo, brilho em cima).
 */
import {
  MOEDAS_BIS,
  missaoPorId,
  nivelDoXp,
  type Missao,
  type PerfilAlma,
  type VistaAlmaMundo,
} from '../../jogo/alma';
import { tocarSomInterface } from '../../audio/somInterface';
import { arte } from './arte';
import { desenhoDaBolinha, desenhoDaFigurinha, figura, figuraMissao } from './figuras';

export const FECHAR_SVG = `<svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" stroke="#5a3a22" stroke-width="4" stroke-linecap="round"/></svg>`;

export const CSS_ALMA_HUD = `
.alma-svg svg, .alma-fig svg { width: 100%; height: 100%; display: block; }
.alma-fig { display: inline-grid; place-items: center; }
.alma-fig > * { min-width: 0; min-height: 0; }
.alma-fig img, .alma-fig canvas { width: 100%; height: 100%; object-fit: contain; display: block; }
.alma-fig[data-tipo='fantasia'] { overflow: hidden; }
.alma-fig[data-tipo='fantasia'] canvas { width: auto; height: 100%; max-width: 100%; }
.alma-fig-missao { position: relative; display: grid; place-items: center; width: 100%; height: 100%; }
.alma-fig-missao .principal { width: 86%; height: 86%; }
.alma-fig-missao .selo { position: absolute; right: -4%; bottom: -4%; width: 44%; height: 44%; padding: 6%; box-sizing: border-box;
  border-radius: 50%; background: #fffaf0; box-shadow: 0 0 0 2.5px #e8c98e, 0 3px 0 rgba(150,110,60,0.35); }
.alma-trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3%; width: 100%; height: 100%; align-items: center; }
.alma-trio .alma-fig { width: 100%; aspect-ratio: 1; }
@keyframes alma-pulo { 40% { transform: scale(1.18); } }
@keyframes alma-chama { 50% { transform: scale(1.12); } }
@keyframes alma-flutuar { 50% { transform: translateY(-5px); } }
@keyframes alma-entra { from { opacity: 0; transform: translateY(-6px) scale(0.92); } }

/* ---------------- a carteira (nível + moedinhas) e o cartão da missão ---------------- */
body.alma-missoes .missao-hud { display: none !important; }
.alma-carteira { position: fixed; z-index: 7; top: calc(8px + env(safe-area-inset-top)); left: calc(112px + env(safe-area-inset-left));
  height: 44px; display: flex; align-items: center; gap: 6px; padding: 0 12px 0 2px; border: 0; border-radius: 22px; cursor: pointer;
  background: rgba(255, 250, 240, 0.95); color: var(--tinta); font: 900 1.25rem var(--display);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.2), inset 0 2px 0 rgba(255,255,255,0.85);
  touch-action: manipulation; -webkit-tap-highlight-color: transparent; animation: alma-entra 0.4s ease-out both; pointer-events: auto; }
.alma-carteira:active { transform: translateY(2px); }
.alma-carteira:focus-visible, .alma-missao:focus-visible { outline: 3px solid var(--azul, #2f7fe8); outline-offset: 2px; }
.alma-nivel { position: relative; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(#ffb21a calc(var(--f, 0) * 1turn), #f0e2c4 0); }
.alma-nivel::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #fffaf0; }
.alma-nivel .alma-svg { position: absolute; inset: 5px; }
.alma-nivel b { position: relative; font: 900 0.86rem var(--display); color: #8a4a00; margin-top: 2px; }
.alma-nivel.subiu { animation: alma-pulo 0.6s ease-out; }
.alma-carteira .moeda { width: 26px; height: 26px; }
.alma-carteira kbd { position: absolute; bottom: -6px; right: -6px; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px;
  display: grid; place-items: center; font: 800 0.6rem var(--jogo, system-ui), sans-serif; color: var(--tinta, #3b2a1e);
  background: #ffe4a8; box-shadow: 0 1px 0 #d9b56a; pointer-events: none; }
body.toque-ativo .alma-carteira kbd, body.sem-teclas .alma-carteira kbd { display: none; }
.alma-carteira .n { min-width: 1.2em; text-align: left; font-variant-numeric: tabular-nums; }
.alma-carteira.pulou .moeda { animation: alma-pulo 0.35s ease-out; }

/* spec 030: o selinho da missão, embaixo da estrela (o desenho dela; tocar repete a ondinha) */
.alma-missao { position: fixed; z-index: 7; top: calc(60px + env(safe-area-inset-top)); left: calc(112px + env(safe-area-inset-left));
  width: 44px; height: 44px; padding: 4px; box-sizing: border-box; border: 0; border-radius: 50%; cursor: pointer; display: grid; place-items: center;
  background: rgba(255, 250, 240, 0.97); box-shadow: 0 0 0 3px #5fe3c4, 0 3px 0 3px rgba(31, 168, 137, 0.45), 0 6px 12px rgba(40, 25, 10, 0.2);
  touch-action: manipulation; -webkit-tap-highlight-color: transparent; animation: alma-entra 0.4s ease-out both; pointer-events: auto; }
.alma-missao[hidden] { display: none; }
.alma-missao:active { transform: translateY(2px); }
.alma-missao .alma-fig { width: 100%; height: 100%; }
.alma-missao.chama { animation: alma-chama 0.5s ease-out; }
/* o convite: o baú com "?" no lugar do selinho (brilha uma vez e fica quieto) */
.alma-missao.convite { box-shadow: 0 0 0 3px #e0a83a, 0 3px 0 3px rgba(168, 116, 26, 0.45), 0 6px 12px rgba(40, 25, 10, 0.2); padding: 1px; }
.alma-missao.convite.brilha { animation: alma-convite 0.9s cubic-bezier(.3,1.5,.5,1); }
@keyframes alma-convite { 0% { transform: scale(0.2); } 45% { transform: scale(1.3); } 65% { transform: scale(0.92); } 100% { transform: scale(1); } }
.alma-brilho { position: fixed; z-index: 8; width: 12px; height: 12px; margin: -6px; pointer-events: none;
  background: radial-gradient(circle, #fffbe0 0 30%, rgba(255, 226, 122, 0.9) 45%, rgba(255, 226, 122, 0) 72%);
  animation: alma-brilho 0.9s ease-out forwards; }
@keyframes alma-brilho { 0% { transform: translate(0, 0) scale(0.4); opacity: 1; } 100% { transform: translate(var(--dx), var(--dy)) scale(1.4); opacity: 0; } }
/* o canto parado é só a estrela: as moedinhas abrem de lado quando chegam e contam */
.alma-carteira { padding: 0 2px; gap: 0; }
.alma-carteira .gaveta { display: flex; align-items: center; gap: 3px; max-width: 0; overflow: hidden; opacity: 0;
  transition: max-width 0.45s cubic-bezier(.3,1.25,.5,1), opacity 0.25s, padding 0.35s; white-space: nowrap; }
.alma-carteira.contando .gaveta { max-width: 140px; opacity: 1; padding: 0 10px 0 4px; }
/* informações abertas (as pílulas descem): o selinho fica embaixo delas */
body.hud-aberto .alma-missao { top: calc(156px + env(safe-area-inset-top)); }
.alma-bolinhas { display: flex; gap: 3px; }
.alma-bolinhas .b { width: 20px; height: 20px; border-radius: 50%; background: #efe2c6; display: grid; place-items: center; padding: 2px; box-sizing: border-box; transition: transform 0.25s, background 0.25s; }
.alma-bolinhas .b .alma-fig { width: 100%; height: 100%; filter: grayscale(1) opacity(0.35); transition: filter 0.3s; }
.alma-bolinhas .b.cheia { background: #c9f0b0; box-shadow: 0 0 0 2px #5cbf4f; }
.alma-bolinhas .b.cheia .alma-fig { filter: none; }
.alma-bolinhas .b.agora { animation: alma-pulo 0.5s ease-out; }
.alma-barra { height: 14px; border-radius: 7px; background: #efe2c6; box-shadow: var(--sombra-poco); overflow: hidden; min-width: 70px; }
.alma-barra i { display: block; height: 100%; border-radius: 7px; background: linear-gradient(180deg, #a6e88a, #5cbf4f); transition: width 0.4s ease-out; }
.alma-moedas { display: inline-flex; align-items: center; gap: 1px; padding: 1px 6px 1px 2px; border-radius: 999px; background: #fffaf0;
  box-shadow: 0 0 0 2px #f5c44a, 0 2px 0 rgba(150,110,60,0.35); font: 900 0.85rem var(--display); color: #8a5a10; white-space: nowrap; }
.alma-moedas .moeda { width: 18px; height: 18px; }
/* o que esconde o HUD esconde a alma também */
body[data-overlay]:not([data-overlay='alma-festa']) .alma-carteira, body[data-overlay] .alma-missao, body.modo-foto .alma-carteira, body.modo-foto .alma-missao,
body.tela-titulo .alma-carteira, body.tela-titulo .alma-missao, body:has(.entrada:not([hidden])) .alma-carteira,
body:has(.entrada:not([hidden])) .alma-missao { display: none !important; }

/* ---------------- painéis de brinquedo (o quadro de missões e o baú) ---------------- */
.alma-fundo { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; box-sizing: border-box;
  padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: rgba(40, 25, 10, 0.42); animation: alma-fundo-entra 0.2s ease-out both; }
@keyframes alma-fundo-entra { from { opacity: 0; } }
.alma-fundo[hidden] { display: none; }
.alma-fechar { width: 52px; height: 52px; border: 0; border-radius: 50%; cursor: pointer; background: var(--creme); box-shadow: 0 4px 0 var(--creme-fundo), inset 0 2px 0 #fff; display: grid; place-items: center; flex: none; }
.alma-fechar svg { width: 24px; height: 24px; }
.alma-saldo { display: inline-flex; align-items: center; gap: 4px; padding: 4px 14px 4px 6px; border-radius: 999px; background: #fff3c4;
  box-shadow: inset 0 0 0 3px #f5c44a; font: 900 1.5rem var(--display); color: #8a5a10; }
.alma-saldo .moeda { width: 34px; height: 34px; }
.alma-cartao { position: relative; display: grid; justify-items: center; gap: 12px; padding: 18px 22px 22px; border-radius: 28px; background: var(--painel);
  box-shadow: 0 0 0 4px var(--painel-borda), 0 10px 0 #d9b77a, 0 22px 40px rgba(40,25,10,0.4); max-height: 100%; box-sizing: border-box;
  animation: alma-cartao-entra 0.35s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes alma-cartao-entra { from { transform: scale(0.85); opacity: 0; } }
.alma-cartao > .alma-fechar { position: absolute; top: -12px; right: -12px; width: 50px; height: 50px; z-index: 2; box-shadow: 0 0 0 4px var(--painel-borda), 0 5px 0 4px #d9b77a; }
.alma-cartao[data-alma-quadro] { margin-top: 10px; overflow: auto; }
.alma-botao { min-width: 120px; height: 64px; border: 0; border-radius: 22px; cursor: pointer; display: inline-grid; place-items: center; padding: 8px 22px;
  background: linear-gradient(#a6e88a, #5cbf4f); box-shadow: 0 6px 0 #3f9a3a, 0 10px 16px rgba(40,25,10,0.25), inset 0 2px 0 rgba(255,255,255,0.7); -webkit-tap-highlight-color: transparent; }
.alma-botao .alma-svg { width: 40px; height: 40px; }
.alma-botao:active { transform: translateY(4px); box-shadow: 0 2px 0 #3f9a3a; }
.alma-botao.azul { background: linear-gradient(#8fc2ff, #2f7fe8); box-shadow: 0 6px 0 #1d58b0, 0 10px 16px rgba(40,25,10,0.25), inset 0 2px 0 rgba(255,255,255,0.7); }
.alma-botao.ouro { background: linear-gradient(#fff3c4, #ffc93d); box-shadow: 0 6px 0 #a8741a, 0 10px 16px rgba(0,0,0,0.3), inset 0 2px 0 #fff; }
.alma-botao.chama .alma-svg { animation: alma-chama 1.4s ease-in-out infinite; }
.alma-botao[disabled] { filter: saturate(0.3) opacity(0.6); }
.alma-quadro { display: grid; grid-template-columns: repeat(var(--n, 2), minmax(0, 340px)); gap: 18px; }
.alma-oferta { display: grid; justify-items: center; gap: 10px; padding: 14px 16px 18px; border-radius: 24px; background: #fffaf0; box-shadow: 0 0 0 4px #f0d9b0, 0 6px 0 4px #e2c99b; }
.alma-oferta.fixada { box-shadow: 0 0 0 5px #5cbf4f, 0 6px 0 5px #3f9a3a; }
.alma-oferta .linha { display: flex; align-items: center; gap: 8px; }
.alma-oferta .tarefa { width: 120px; height: 120px; border-radius: 20px; background: var(--poco); box-shadow: var(--sombra-poco); display: grid; place-items: center; padding: 8px; box-sizing: border-box; }
.alma-oferta .premio { position: relative; width: 120px; height: 120px; border-radius: 20px; display: grid; place-items: center; padding: 6px; box-sizing: border-box;
  background: radial-gradient(circle at 50% 40%, #fff6c8, #ffe08a); box-shadow: inset 0 0 0 4px #f5c44a; }
.alma-oferta .premio .alma-fig { width: 100%; height: 100%; }
.alma-oferta .premio .alma-moedas { position: absolute; right: -10px; bottom: -10px; font-size: 1.1rem; }
.alma-oferta .premio .alma-moedas .moeda { width: 24px; height: 24px; }
.alma-oferta .seta { width: 40px; height: 40px; }
.alma-oferta .alma-bolinhas .b { width: 28px; height: 28px; }
.alma-voo { position: fixed; z-index: 90; pointer-events: none; transition: transform 0.75s cubic-bezier(.5,-0.3,.6,1), opacity 0.75s; }

/* celular deitado (390 de altura): tudo um pouco menor */
@media (max-height: 500px) {
  .alma-fechar { width: 44px; height: 44px; }
  .alma-saldo { font-size: 1.2rem; padding: 2px 10px 2px 4px; }
  .alma-saldo .moeda { width: 28px; height: 28px; }
  .alma-cartao { padding: 12px 16px 16px; gap: 8px; }
  .alma-oferta { padding: 10px 12px 14px; gap: 8px; }
  .alma-oferta .tarefa, .alma-oferta .premio { width: 96px; height: 96px; }
  .alma-botao { height: 54px; }
}
/* celular em pé (estreito): as missões do quadro uma embaixo da outra, o prêmio ao lado */
@media (max-width: 560px) {
  .alma-quadro { grid-template-columns: minmax(0, 340px); gap: 12px; }
  .alma-oferta { grid-template-columns: 1fr auto; grid-template-areas: 'linha linha' 'prog jogar'; align-items: center; padding: 10px 12px 12px; gap: 8px; }
  .alma-oferta .linha { grid-area: linha; }
  .alma-oferta > .alma-bolinhas, .alma-oferta > .alma-barra { grid-area: prog; justify-self: start; }
  .alma-oferta > .alma-botao { grid-area: jogar; min-width: 92px; height: 52px; }
  .alma-oferta .tarefa, .alma-oferta .premio { width: 104px; height: 104px; }
  .alma-cartao { padding: 14px 12px 16px; }
}
@media (prefers-reduced-motion: reduce) {
  .alma-carteira, .alma-missao, .alma-missao.convite.brilha, .alma-cartao, .alma-fundo { animation: none; }
  .alma-botao.chama .alma-svg { animation: none; }
}
`;

export const svgEl = (nome: string, classe = ''): HTMLElement => {
  const s = document.createElement('span');
  s.className = `alma-svg ${classe}`.trim();
  s.innerHTML = arte(nome);
  return s;
};

export function pilhaDeMoedas(n: number, classe = 'alma-moedas'): HTMLElement {
  const el = document.createElement('span');
  el.className = classe;
  el.appendChild(svgEl('moeda', 'moeda'));
  el.append(`${n}`);
  return el;
}

export function botaoFechar(aoFechar: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'alma-fechar';
  b.setAttribute('aria-label', 'Fechar');
  b.setAttribute('data-alma-fechar', '');
  b.innerHTML = FECHAR_SVG;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    tocarSomInterface('toc');
    aoFechar();
  });
  return b;
}

/** Botão grande de brinquedo com desenho (nunca só texto). */
export function botao(
  classe: string,
  rotulo: string,
  dado: string,
  miolo: string | HTMLElement,
  aoTocar: () => void,
): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `alma-botao ${classe}`.trim();
  b.setAttribute('aria-label', rotulo);
  b.setAttribute(dado, '');
  if (typeof miolo === 'string') b.innerHTML = `<span class="alma-svg">${miolo}</span>`;
  else b.appendChild(miolo);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    aoTocar();
  });
  return b;
}

/** O prêmio da missão: a fantasia no boneco da criança, ou a figurinha; e as moedinhas. */
export function premioEl(m: Missao, bis = false): HTMLElement {
  const premio = document.createElement('div');
  premio.className = 'premio';
  premio.appendChild(figura(m.fantasia && !bis ? `fantasia:${m.fantasia}` : desenhoDaFigurinha(m)));
  premio.appendChild(pilhaDeMoedas(bis ? MOEDAS_BIS : m.moedas));
  return premio;
}

/** O progresso: bolinhas com a figura de cada vez (até 8), ou a barra (a obra, os grandes). */
/**
 * Quais bolinhas acendem: no passeio, a do lugar já visto (pelos `usos` que o núcleo manda; um
 * núcleo antigo sem eles, as primeiras pela conta); nas outras, as primeiras `feito`.
 */
export function bolinhasCheias(
  m: Missao,
  feito: number,
  meta: number,
  usos?: readonly unknown[],
): boolean[] {
  const cheias = Math.min(meta, Math.floor(feito));
  if (m.conta.tipo === 'lugares' && Array.isArray(usos)) {
    const vistos = new Set(usos.filter((u): u is string => typeof u === 'string'));
    const lugares = m.conta.usos;
    return Array.from({ length: meta }, (_, i) => vistos.has(lugares[i]));
  }
  return Array.from({ length: Math.max(0, meta) }, (_, i) => i < cheias);
}

export function progressoEl(
  m: Missao,
  feito: number,
  meta: number,
  usos?: readonly unknown[],
): HTMLElement {
  const fr = meta > 0 ? Math.min(1, feito / meta) : 0;
  if (m.conta.tipo === 'obra' || meta > 8) {
    const b = document.createElement('div');
    b.className = 'alma-barra';
    b.innerHTML = `<i style="width:${Math.max(6, fr * 100)}%"></i>`;
    return b;
  }
  const lista = document.createElement('div');
  lista.className = 'alma-bolinhas';
  const cheias = bolinhasCheias(m, feito, meta, usos);
  for (let i = 0; i < meta; i++) {
    const b = document.createElement('span');
    b.className = `b${cheias[i] ? ' cheia' : ''}`;
    b.appendChild(figura(desenhoDaBolinha(m, i)));
    lista.appendChild(b);
  }
  return lista;
}

export interface OpcoesHudAlma {
  perfil(): PerfilAlma;
  /** O quadro deste mundo (null: mundo sem missões). */
  vista(): VistaAlmaMundo | null;
  /** Fixa a missão do cartão (o núcleo responde com o quadro novo). */
  fixar(id: string): void;
  /** A carteira foi tocada (abre o baú). */
  aoTocarCarteira(): void;
  /** O cartão foi tocado (abre o quadro de missões). */
  aoTocarCartao(): void;
  /** Um painel abriu ou fechou (trava e solta o ponteiro). */
  aoAbrir(): void;
  aoFechar(): void;
}

/** A missão do cartão, como o núcleo diz: a fixada, se aberta, ou a primeira aberta. */
export function missaoDoCartao(
  v: VistaAlmaMundo | null,
): { m: Missao; feito: number; meta: number; usos?: string[]; bis: boolean } | null {
  if (!v) return null;
  const a = v.abertas.find((x) => x.id === v.fixada) ?? v.abertas[0];
  const m = a && missaoPorId(a.id);
  return m ? { m, feito: a.feito, meta: a.meta, usos: a.usos, bis: !!a.bis } : null;
}

/** A missão escolhida (a fixada, se ainda aberta): a do selinho e a da trilha (030). */
export function missaoFixada(
  v: VistaAlmaMundo | null,
): { m: Missao; feito: number; meta: number; usos?: string[]; bis: boolean } | null {
  if (!v?.fixada) return null;
  const a = v.abertas.find((x) => x.id === v.fixada);
  const m = a && missaoPorId(a.id);
  return m ? { m, feito: a.feito, meta: a.meta, usos: a.usos, bis: !!a.bis } : null;
}

/** O "?" do convite (desenhado, não letra) em cima do baú. */
const CONVITE_SVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <g transform="translate(4 14) scale(0.78)">${arte('bau').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>
  <g transform="translate(30 -2) scale(0.5)"><circle cx="32" cy="34" r="27" fill="#1fa889"/><circle cx="32" cy="31" r="27" fill="#5fe3c4" stroke="#5a3a22" stroke-width="3.5"/>
  <path d="M24 25 Q24 15 32 15 Q40 15 40 23 Q40 28 34 31 Q32 32.5 32 36 V38" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="47" r="4" fill="#fff"/></g>
</svg>`;

export function criarHudAlma(raiz: HTMLElement, op: OpcoesHudAlma) {
  // ---------------------------------------------------------------- carteira
  const carteira = document.createElement('button');
  carteira.type = 'button';
  carteira.className = 'alma-carteira';
  carteira.setAttribute('aria-label', 'Meu nível e minhas moedinhas');
  carteira.setAttribute('data-alma-carteira', '');
  const nivelEl = document.createElement('span');
  nivelEl.className = 'alma-nivel';
  nivelEl.setAttribute('data-alma-nivel', '');
  nivelEl.appendChild(svgEl('nivel'));
  const nNivel = document.createElement('b');
  nivelEl.appendChild(nNivel);
  const moedaEl = svgEl('moeda', 'moeda');
  const nMoedas = document.createElement('span');
  nMoedas.className = 'n';
  nMoedas.setAttribute('data-alma-moedas', '');
  // no computador, a tecla H abre o baú (o selinho some no toque, como os da roda)
  const tecla = document.createElement('kbd');
  tecla.textContent = 'H';
  // spec 030: parado, o canto é só a estrela; as moedinhas abrem de lado para contar
  const gaveta = document.createElement('span');
  gaveta.className = 'gaveta';
  gaveta.append(moedaEl, nMoedas);
  carteira.append(nivelEl, gaveta, tecla);
  carteira.addEventListener('click', () => {
    tocarSomInterface('toc');
    op.aoTocarCarteira();
  });
  raiz.appendChild(carteira);

  // ---------------------------------------------------------------- selinho da missão (030)
  const cartao = document.createElement('button');
  cartao.type = 'button';
  cartao.className = 'alma-missao';
  cartao.setAttribute('aria-label', 'Missão');
  cartao.setAttribute('data-alma-missao', '');
  cartao.hidden = true;
  /** O convite (sem missão, depois de ~2 min brincando): o baú com "?" no lugar do selinho. */
  let convite = false;
  cartao.addEventListener('click', () => {
    tocarSomInterface('toc');
    if (convite) quadro();
    else op.aoTocarCartao();
  });
  raiz.appendChild(cartao);

  let moedasMostradas = op.perfil().moedas;
  let xpMostrado = op.perfil().xp;
  let nivelMostrado = nivelDoXp(xpMostrado).nivel;
  /** Enquanto uma festa mostra o ganho, a carteira espera (ela conta depois do voo). */
  let segurando = false;

  function pintarNivel(xp: number): void {
    const { nivel, fracao } = nivelDoXp(xp);
    nNivel.textContent = String(nivel);
    nivelEl.style.setProperty('--f', String(fracao));
    carteira.dataset.nivel = String(nivel);
    if (nivel > nivelMostrado) {
      nivelEl.classList.remove('subiu');
      void nivelEl.offsetWidth;
      nivelEl.classList.add('subiu');
    }
    nivelMostrado = nivel;
  }

  let chaveCartao = '';
  /** O selinho: o desenho da missão escolhida (a fixada), ou o convite, ou nada. */
  function renderCartao(animar: boolean): void {
    const v = op.vista();
    document.body.classList.toggle('alma-missoes', !!v);
    const c = missaoFixada(v);
    const chave = c ? `m:${c.m.id}` : convite && v ? 'convite' : '';
    cartao.hidden = !chave;
    if (chave === chaveCartao) return;
    chaveCartao = chave;
    cartao.classList.toggle('convite', chave === 'convite');
    cartao.replaceChildren();
    if (c) {
      cartao.dataset.missao = c.m.id;
      cartao.dataset.feito = String(c.feito);
      cartao.setAttribute('aria-label', `Missão: ${c.m.nome}`);
      cartao.appendChild(figura(desenhoDaFigurinha(c.m)));
      if (animar) {
        cartao.classList.remove('chama');
        void cartao.offsetWidth;
        cartao.classList.add('chama');
      }
    } else {
      delete cartao.dataset.missao;
      delete cartao.dataset.feito;
      cartao.setAttribute('aria-label', 'Missões');
      if (chave === 'convite') cartao.innerHTML = CONVITE_SVG;
    }
  }

  /** O convite aparece (brilha uma vez, estrelinhas e o "plim") ou some. */
  function definirConvite(mostra: boolean, brilha: boolean): void {
    if (mostra === convite && !brilha) return;
    convite = mostra;
    renderCartao(false);
    if (!brilha || cartao.hidden) return;
    cartao.classList.remove('brilha');
    void cartao.offsetWidth;
    cartao.classList.add('brilha');
    const r = cartao.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const f = document.createElement('span');
      f.className = 'alma-brilho';
      const a = (i / 10) * Math.PI * 2 + 0.3;
      const d = 40 * (0.75 + (i % 3) * 0.18);
      f.style.left = `${r.left + r.width / 2}px`;
      f.style.top = `${r.top + r.height / 2}px`;
      f.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      f.style.setProperty('--dy', `${Math.sin(a) * d}px`);
      document.body.appendChild(f);
      setTimeout(() => f.remove(), 950);
    }
    tocarSomInterface('plim');
  }

  function renderHud(animar = false): void {
    const p = op.perfil();
    if (!segurando && !animar) {
      moedasMostradas = p.moedas;
      xpMostrado = p.xp;
    }
    nMoedas.textContent = String(moedasMostradas);
    pintarNivel(xpMostrado);
    renderCartao(animar);
  }

  /** O número das moedas sobe de uma em uma, com o tlim de cada moeda. */
  let fecharGaveta = 0;
  /** A gaveta das moedinhas aberta (contando), e fecha ~2,5 s depois. */
  function abrirGaveta(seg = 2.5): void {
    carteira.classList.add('contando');
    clearTimeout(fecharGaveta);
    fecharGaveta = window.setTimeout(() => carteira.classList.remove('contando'), seg * 1000);
  }
  function contarMoedasAte(ate: number): Promise<void> {
    abrirGaveta(60);
    return new Promise<void>((okFim) => {
      const ok = () => {
        abrirGaveta();
        okFim();
      };
      const passo = () => {
        if (moedasMostradas === ate) return ok();
        moedasMostradas += moedasMostradas < ate ? 1 : -1;
        nMoedas.textContent = String(moedasMostradas);
        carteira.classList.remove('pulou');
        void carteira.offsetWidth;
        carteira.classList.add('pulou');
        if (moedasMostradas <= ate) tocarSomInterface('moeda');
        setTimeout(passo, 140);
      };
      // gasto (a moeda sai): direto, sem tlim
      if (ate < moedasMostradas) {
        moedasMostradas = ate;
        nMoedas.textContent = String(ate);
        return ok();
      }
      passo();
    });
  }

  /** O anel do nível enche devagar até o XP pedido. */
  function encherXp(ate = op.perfil().xp): Promise<void> {
    return new Promise((ok) => {
      const de = xpMostrado;
      const t0 = performance.now();
      const dur = 700;
      const passo = () => {
        const f = Math.min(1, (performance.now() - t0) / dur);
        xpMostrado = de + (ate - de) * (1 - Math.pow(1 - f, 3));
        pintarNivel(xpMostrado);
        if (f < 1) requestAnimationFrame(passo);
        else ok();
      };
      passo();
    });
  }

  /** Sem festa: a carteira mostra o ganho na hora (as moedas contando e o anel enchendo). */
  async function mostrarGanho(): Promise<void> {
    if (segurando) return;
    const p = op.perfil();
    await Promise.all([contarMoedasAte(p.moedas), encherXp(p.xp)]);
  }

  // ---------------------------------------------------------------- fundo dos painéis
  const fundo = document.createElement('div');
  fundo.className = 'alma-fundo';
  fundo.hidden = true;
  fundo.setAttribute('data-alma-fundo', '');
  fundo.addEventListener('click', (ev) => {
    if (ev.target === fundo) fechar();
  });
  document.body.appendChild(fundo);

  function abrirFundo(conteudo: HTMLElement): void {
    fundo.replaceChildren(conteudo);
    if (fundo.hidden) {
      fundo.hidden = false;
      document.body.dataset.overlay = 'alma';
      document.exitPointerLock?.();
      op.aoAbrir();
    }
  }
  function fechar(): void {
    if (fundo.hidden) return;
    fundo.hidden = true;
    fundo.replaceChildren();
    if (document.body.dataset.overlay === 'alma') delete document.body.dataset.overlay;
    if (!document.body.dataset.overlay) op.aoFechar();
  }
  const aberto = () => !fundo.hidden;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && aberto()) {
      e.stopPropagation();
      fechar();
    }
  });

  // ---------------------------------------------------------------- quadro de missões
  function quadro(): boolean {
    const v = op.vista();
    if (!v) return false;
    const lista = v.abertas
      .map((a) => ({ a, m: missaoPorId(a.id) }))
      .filter((x): x is { a: (typeof v.abertas)[number]; m: Missao } => !!x.m)
      .slice(0, 3);
    if (!lista.length) return false;
    const caixa = document.createElement('div');
    caixa.className = 'alma-cartao';
    caixa.setAttribute('data-alma-quadro', '');
    caixa.appendChild(botaoFechar(fechar));
    const grade = document.createElement('div');
    grade.className = 'alma-quadro';
    grade.style.setProperty('--n', String(lista.length));
    const doCartao = missaoDoCartao(v)?.m.id;
    for (const { a, m } of lista) grade.appendChild(oferta(m, a, m.id === doCartao));
    caixa.appendChild(grade);
    abrirFundo(caixa);
    return true;
  }

  function oferta(
    m: Missao,
    a: { feito: number; meta: number; usos?: string[]; bis?: true },
    fixada: boolean,
  ): HTMLElement {
    const c = document.createElement('div');
    c.className = `alma-oferta${fixada ? ' fixada' : ''}`;
    c.dataset.missao = m.id;
    c.setAttribute('aria-label', m.nome);
    const linha = document.createElement('div');
    linha.className = 'linha';
    const t = document.createElement('div');
    t.className = 'tarefa';
    t.appendChild(figuraMissao(m));
    linha.append(t, svgEl('seta', 'seta'), premioEl(m, !!a.bis));
    c.appendChild(linha);
    c.appendChild(progressoEl(m, a.feito, a.meta, a.usos));
    const jogar = botao(fixada ? '' : 'chama', 'Brincar', 'data-alma-jogar', arte('play'), () => {
      tocarSomInterface('criar');
      op.fixar(m.id);
      const de = c.getBoundingClientRect();
      fechar();
      renderHud();
      voar(linha, de, cartao.getBoundingClientRect());
    });
    jogar.dataset.almaJogar = m.id;
    c.appendChild(jogar);
    return c;
  }

  // ---------------------------------------------------------------- voo
  function voar(el: HTMLElement, de: DOMRect, para: DOMRect, tam?: number): void {
    if (para.width < 1 || de.width < 1) return;
    const v = el.cloneNode(true) as HTMLElement;
    v.classList.add('alma-voo');
    const w = tam ?? de.width;
    const h = tam ?? de.height;
    Object.assign(v.style, {
      left: `${de.left + de.width / 2 - w / 2}px`,
      top: `${de.top + de.height / 2 - h / 2}px`,
      width: `${w}px`,
      height: `${h}px`,
      margin: '0',
    });
    document.body.appendChild(v);
    const dx = para.left + para.width / 2 - (de.left + de.width / 2);
    const dy = para.top + para.height / 2 - (de.top + de.height / 2);
    const k = Math.max(0.15, Math.min(1, para.width / w));
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        v.style.transform = `translate(${dx}px, ${dy}px) scale(${k})`;
        v.style.opacity = '0.4';
      }),
    );
    setTimeout(() => v.remove(), 800);
  }

  renderHud();
  return {
    renderHud,
    contarMoedasAte,
    encherXp,
    mostrarGanho,
    /** A festa segura a carteira (o ganho aparece depois do voo). */
    segurar(s: boolean) {
      segurando = s;
    },
    get segurando() {
      return segurando;
    },
    quadro,
    definirConvite,
    abrirGaveta,
    abrirFundo,
    fechar,
    aberto,
    voar,
    carteira,
    nivelEl,
    cartao,
  };
}
export type HudAlma = ReturnType<typeof criarHudAlma>;
