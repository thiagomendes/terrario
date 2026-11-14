/**
 * Esboço da spec 023 (rodada 2): as telas, por cima do HUD de verdade. Tudo com figura, cor,
 * gesto e som; o texto que aparece é só número (moedinhas, nível) e o `aria-label` (para os
 * pais e o leitor de tela). Peças de brinquedo da 012 (creme, degrau embaixo, brilho em cima);
 * a lojinha premium tem a cara dela: vitrine de veludo azul-noite, ouro e holofote.
 */
import { arte } from '../../ui/alma/arte';
import { figura, figuraMissao, desenhoDaFigurinha, desenhoDaBolinha } from '../../ui/alma/figuras';
import {
  HABILIDADES,
  PREMIUM,
  PRESENTES_NIVEL,
  XP_DO_NIVEL,
  bancaDoMundo,
  estrelasDe,
  missoesDoMundo,
  nivelDoXp,
  type ItemBanca,
  type ItemPremium,
  type Missao,
  type MundoAlma,
} from './dados';
import {
  abertas,
  fracaoDa,
  metaDa,
  missaoDoHud,
  type EstadoCrianca,
  type EstadoMundo,
} from './estado';
import { tocarSomInterface } from '../../audio/somInterface';
import { fotografarBoneco } from '../../render/fotoBoneco';
import { normalizarAparencia, type Aparencia } from '../../personagem/aparencia';
import { CSS_FESTA } from '../../ui/alma/festa';

const ESPELHO = `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="28" rx="18" ry="22" fill="#bfe3ff" stroke="#fff" stroke-width="5"/><path d="M22 20 Q26 12 34 12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M26 50 L22 60 M38 50 L42 60" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;
const VOLTAR = `<svg viewBox="0 0 64 64"><path d="M40 12 L20 32 L40 52" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const FECHAR = `<svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" stroke="#5a3a22" stroke-width="4" stroke-linecap="round"/></svg>`;
const TIRAR = `<svg viewBox="0 0 64 64"><path d="M22 8 L32 14 L42 8 L58 18 L52 30 L46 27 L46 58 L18 58 L18 27 L12 30 L6 18 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M14 14 L50 52" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`;
const VESTIR = `<svg viewBox="0 0 64 64"><path d="M22 8 L32 14 L42 8 L58 18 L52 30 L46 27 L46 58 L18 58 L18 27 L12 30 L6 18 Z" fill="#fff" stroke="#fff" stroke-width="3" stroke-linejoin="round"/></svg>`;

export const CSS_ALMA = `
body.esboco-alma .missao-hud { display: none !important; }
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

/* ---------------- HUD: a carteira (nível + moedinhas) e o cartão da missão ---------------- */
.alma-carteira { position: fixed; z-index: 7; top: calc(8px + env(safe-area-inset-top)); left: calc(112px + env(safe-area-inset-left));
  height: 44px; display: flex; align-items: center; gap: 6px; padding: 0 12px 0 2px; border: 0; border-radius: 22px; cursor: pointer;
  background: rgba(255, 250, 240, 0.95); color: var(--tinta); font: 900 1.25rem var(--display);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.2), inset 0 2px 0 rgba(255,255,255,0.85);
  touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.alma-carteira:active { transform: translateY(2px); }
.alma-nivel { position: relative; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(#ffb21a calc(var(--f, 0) * 1turn), #f0e2c4 0); }
.alma-nivel::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #fffaf0; }
.alma-nivel .alma-svg { position: absolute; inset: 5px; }
.alma-nivel b { position: relative; font: 900 0.86rem var(--display); color: #8a4a00; margin-top: 2px; }
.alma-carteira .moeda { width: 26px; height: 26px; }
.alma-carteira .n { min-width: 1.2em; text-align: left; font-variant-numeric: tabular-nums; }
.alma-carteira.pulou { animation: alma-pulo 0.45s ease-out; }
.alma-carteira .barrinha { position: absolute; left: 44px; right: 12px; bottom: 4px; height: 0; }

.alma-missao { position: fixed; z-index: 7; top: calc(60px + env(safe-area-inset-top)); left: calc(8px + env(safe-area-inset-left));
  display: flex; align-items: center; gap: 6px; padding: 5px 8px 5px 5px; border: 0; border-radius: 20px; cursor: pointer;
  background: rgba(255, 250, 240, 0.95); box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.18);
  touch-action: manipulation; -webkit-tap-highlight-color: transparent; transform-origin: top left; }
.alma-missao[hidden] { display: none; }
.alma-missao:active { transform: translateY(2px); }
.alma-missao .tarefa { position: relative; width: 50px; height: 50px; border-radius: 14px; background: var(--poco); box-shadow: var(--sombra-poco); display: grid; place-items: center; }
.alma-missao .tarefa .alma-fig-missao { width: 44px; height: 44px; }
.alma-missao .meio { display: grid; gap: 4px; min-width: 64px; }
.alma-missao .seta { width: 22px; height: 22px; opacity: 0.9; }
.alma-missao .premio { position: relative; width: 50px; height: 50px; border-radius: 14px; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 40%, #fff6c8, #ffe08a); box-shadow: inset 0 0 0 2.5px #f5c44a; }
.alma-missao .premio .alma-fig { width: 44px; height: 44px; }
.alma-missao .premio .alma-moedas { position: absolute; right: -8px; bottom: -6px; }
.alma-missao.cresceu { animation: alma-pulo 0.4s ease-out; }
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

/* ---------------- painéis de brinquedo (quadro de missões e baú) ---------------- */
.alma-fundo { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; box-sizing: border-box;
  padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: rgba(40, 25, 10, 0.42); }
.alma-fundo[hidden] { display: none; }
.alma-painel { position: relative; width: min(1000px, 100%); max-height: 100%; box-sizing: border-box; overflow: hidden; display: grid; grid-template-rows: auto 1fr;
  border-radius: 28px; background: var(--painel); box-shadow: 0 0 0 4px var(--painel-borda), 0 10px 0 #d9b77a, 0 22px 40px rgba(40,25,10,0.4); }
.alma-cabeca { display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px; }
.alma-cabeca .espaco { flex: 1; }
.alma-aba { width: 64px; height: 58px; border: 0; border-radius: 18px; padding: 6px; cursor: pointer; background: var(--poco); box-shadow: var(--sombra-poco); -webkit-tap-highlight-color: transparent; }
.alma-aba .alma-svg { display: block; width: 100%; height: 100%; }
.alma-aba[aria-selected='true'] { background: linear-gradient(#fff3c4, #ffd76a); box-shadow: 0 4px 0 #d9a21a, inset 0 2px 0 #fff; transform: translateY(-2px); }
.alma-saldo { display: inline-flex; align-items: center; gap: 4px; padding: 4px 14px 4px 6px; border-radius: 999px; background: #fff3c4;
  box-shadow: inset 0 0 0 3px #f5c44a; font: 900 1.5rem var(--display); color: #8a5a10; }
.alma-saldo .moeda { width: 34px; height: 34px; }
.alma-fechar { width: 52px; height: 52px; border: 0; border-radius: 50%; cursor: pointer; background: var(--creme); box-shadow: 0 4px 0 var(--creme-fundo), inset 0 2px 0 #fff; display: grid; place-items: center; }
.alma-fechar svg { width: 24px; height: 24px; }
.alma-corpo { overflow: auto; padding: 4px 16px 16px; min-height: 0; }

/* álbum de missões do mundo */
.alma-album { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; }
.alma-figurinhas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 14px; border-radius: 20px;
  background: repeating-linear-gradient(0deg, #f7ecd6 0 2px, transparent 2px 26px), #fbf3e2; box-shadow: var(--sombra-poco); }
.alma-fig-slot { position: relative; aspect-ratio: 1; border-radius: 16px; border: 3px dashed #e3cfa6; display: grid; place-items: center; padding: 8px;
  box-sizing: border-box; cursor: pointer; background: transparent; -webkit-tap-highlight-color: transparent; }
.alma-fig-slot .alma-fig { width: 100%; height: 100%; }
.alma-fig-slot.futura .alma-fig { opacity: 0.35; filter: saturate(0.4); }
.alma-fig-slot.feita { border: 0; background: #fff; box-shadow: 0 0 0 4px #fff, 0 4px 0 6px rgba(150,110,60,0.25); transform: rotate(var(--giro, -3deg)); }
.alma-fig-slot.feita::after { content: ''; position: absolute; inset: 0; border-radius: 14px; background: linear-gradient(130deg, rgba(255,255,255,0.55), transparent 40%); pointer-events: none; }
.alma-fig-slot.aberta { border: 3px solid #5cbf4f; background: #effbe6; }
.alma-fig-slot .anel { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
.alma-fig-slot .jogar { position: absolute; right: -8px; bottom: -8px; width: 34px; height: 34px; border-radius: 50%; padding: 6px; box-sizing: border-box;
  background: #5cbf4f; box-shadow: 0 3px 0 #3f9a3a; animation: alma-chama 1.6s ease-in-out infinite; }
.alma-fig-slot .moedas-canto { position: absolute; left: -6px; top: -8px; }
.alma-grandes { display: grid; gap: 12px; }
.alma-grande { position: relative; width: 150px; height: 170px; border-radius: 20px; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 35%, #fff6c8, #ffe08a 70%); box-shadow: inset 0 0 0 4px #f5c44a; }
.alma-grande .alma-fig { height: 92%; }
.alma-grande.futura .alma-fig { filter: brightness(0) opacity(0.22); }
.alma-grande .cad { position: absolute; width: 38px; height: 38px; right: 8px; top: 8px; }
.alma-grande .quando { position: absolute; left: 8px; bottom: 8px; width: 44px; height: 44px; border-radius: 12px; background: #fffaf0; padding: 3px; box-sizing: border-box; box-shadow: 0 2px 0 rgba(150,110,60,0.3); }

/* caminho dos níveis */
.alma-niveis { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 104px; gap: 6px; overflow-x: auto; padding: 10px 6px 18px; scroll-snap-type: x mandatory; }
.alma-niveis::before { content: ''; position: absolute; left: 50px; right: 50px; top: 154px; border-top: 6px dotted #e3cfa6; }
.alma-nivel-passo { position: relative; display: grid; justify-items: center; gap: 10px; scroll-snap-align: center; }
.alma-nivel-passo .presente { width: 86px; height: 86px; border-radius: 20px; display: grid; place-items: center; padding: 8px; box-sizing: border-box; background: #fffaf0;
  box-shadow: 0 0 0 3px #f0d9b0, 0 5px 0 3px #e2c99b; position: relative; }
.alma-nivel-passo .presente .alma-fig { width: 100%; height: 100%; }
.alma-nivel-passo .presente .alma-moedas { position: absolute; right: -10px; bottom: -8px; }
.alma-nivel-passo.ja .presente { background: #effbe6; box-shadow: 0 0 0 3px #5cbf4f, 0 5px 0 3px #3f9a3a; }
.alma-nivel-passo.ja .presente::after { content: ''; position: absolute; right: -6px; top: -6px; width: 26px; height: 26px; border-radius: 50%;
  background: #5cbf4f url("data:image/svg+xml,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13 33 L27 47 L52 18' fill='none' stroke='white' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/70% no-repeat; }
.alma-nivel-passo.futuro .presente { opacity: 0.6; }
.alma-nivel-passo .bola { position: relative; width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; z-index: 1;
  background: #ecdcbc; font: 900 1.3rem var(--display); color: #8a6a3a; box-shadow: 0 4px 0 #d9c39a; }
.alma-nivel-passo.ja .bola { background: radial-gradient(circle at 40% 35%, #fff3b0, #ffc93d); color: #8a4a00; box-shadow: 0 4px 0 #d98a14; }
.alma-nivel-passo.agora .bola { width: 72px; height: 72px; margin-top: -8px; background: conic-gradient(#ffb21a calc(var(--f) * 1turn), #ecdcbc 0); box-shadow: 0 0 0 6px rgba(255, 201, 61, 0.35); animation: alma-chama 1.8s ease-in-out infinite; }
.alma-nivel-passo.agora .bola canvas { position: absolute; inset: 6px; width: calc(100% - 12px); height: calc(100% - 12px); border-radius: 50%; background: #fffaf0; object-fit: cover; }
.alma-nivel-passo.agora .bola b { position: absolute; right: -6px; bottom: -6px; min-width: 26px; height: 26px; border-radius: 13px; background: #ffc93d; color: #8a4a00;
  font: 900 0.95rem var(--display); display: grid; place-items: center; box-shadow: 0 2px 0 #d98a14; }

/* habilidades (universais) */
.alma-habs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; }
.alma-hab { display: grid; justify-items: center; gap: 8px; padding: 14px 6px 12px; border-radius: 22px; background: #fffaf0; box-shadow: 0 0 0 3px #f0d9b0, 0 5px 0 3px #e2c99b; }
.alma-hab .distintivo { position: relative; width: 104px; height: 104px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--cor) calc(var(--f) * 1turn), #ecdcbc 0); }
.alma-hab .distintivo::before { content: ''; position: absolute; inset: 9px; border-radius: 50%; background: #fffaf0; box-shadow: inset 0 3px 0 rgba(120,80,30,0.12); }
.alma-hab .distintivo .alma-fig { position: relative; width: 62px; height: 62px; }
.alma-estrelas { display: flex; gap: 1px; }
.alma-estrelas .alma-svg { width: 20px; height: 20px; }
.alma-hab .mundos { display: flex; gap: 6px; }
.alma-hab .mundos .alma-svg { width: 30px; height: 30px; padding: 3px; border-radius: 10px; background: var(--poco); }

/* banca do mundo: um balcão de feira com toldo */
.alma-banca { position: relative; border-radius: 22px; padding: 30px 14px 14px; background: linear-gradient(#f3e0bd, #e9cf9f); box-shadow: inset 0 0 0 4px #c9955a; }
.alma-banca .toldo { position: absolute; left: -6px; right: -6px; top: -14px; height: 36px; border-radius: 12px 12px 18px 18px;
  background: repeating-linear-gradient(90deg, var(--toldo, #e8402f) 0 34px, #fff 34px 68px); box-shadow: 0 5px 0 rgba(90,50,20,0.25), inset 0 -6px 0 rgba(0,0,0,0.08);
  -webkit-mask: radial-gradient(circle 17px at 17px 100%, transparent 98%, #000) 0 0 / 34px 100% repeat-x; }
.alma-banca .grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 12px; }
.alma-item { position: relative; display: grid; grid-template-rows: 1fr auto; justify-items: center; gap: 6px; padding: 10px 8px; border: 0; border-radius: 20px; cursor: pointer;
  background: #fffaf0; box-shadow: 0 0 0 3px #f0d9b0, 0 5px 0 3px #e2c99b; -webkit-tap-highlight-color: transparent; min-height: 140px; }
.alma-item .alma-fig { width: 80px; height: 80px; }
.alma-item .preco { display: inline-flex; align-items: center; gap: 3px; font: 900 1.15rem var(--display); color: #8a5a10; }
.alma-item .preco .moeda { width: 24px; height: 24px; }
.alma-item .pote { width: 80%; height: 8px; border-radius: 4px; background: #efe2c6; overflow: hidden; }
.alma-item .pote i { display: block; height: 100%; background: linear-gradient(90deg, #ffd96a, #f0a91c); }
.alma-item.pode { box-shadow: 0 0 0 4px #5cbf4f, 0 5px 0 4px #3f9a3a; }
.alma-item .qtd { position: absolute; left: 10px; top: 10px; font: 900 0.9rem var(--display); color: var(--tinta); background: #fff3c4; padding: 0 6px; border-radius: 8px; }

/* ---------------- a lojinha premium (vitrine) ---------------- */
.alma-vitrine { position: fixed; inset: 0; z-index: 62; display: grid; grid-template-rows: auto 1fr; overflow: hidden; box-sizing: border-box;
  padding: max(10px, env(safe-area-inset-top)) max(14px, env(safe-area-inset-right)) max(8px, env(safe-area-inset-bottom)) max(14px, env(safe-area-inset-left));
  background: radial-gradient(ellipse at 50% 0%, #5a48c8 0%, #2a1f72 42%, #120c36 100%); color: #fff; }
.alma-vitrine[hidden] { display: none; }
.alma-vitrine .feixe { position: absolute; top: -10%; width: 34vw; height: 130%; pointer-events: none; opacity: 0.5;
  background: linear-gradient(180deg, rgba(255,236,170,0.32), rgba(255,236,170,0) 70%); clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%); }
.alma-vitrine .feixe.e { left: 8%; transform: rotate(14deg); }
.alma-vitrine .feixe.d { right: 8%; transform: rotate(-14deg); }
.alma-vitrine .ceu i { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; animation: alma-pisca 2.6s ease-in-out infinite; pointer-events: none; }
@keyframes alma-pisca { 50% { opacity: 0.15; transform: scale(0.5); } }
.alma-vitrine .topo { position: relative; display: flex; align-items: center; gap: 12px; padding: 2px 2px 8px; }
.alma-vitrine .placa { display: flex; align-items: center; gap: 10px; padding: 6px 20px 6px 8px; border-radius: 999px;
  background: linear-gradient(#ffe9a8, #e6b23e); box-shadow: 0 4px 0 #a8741a, inset 0 2px 0 #fff6d0; }
.alma-vitrine .placa .alma-svg { width: 46px; height: 46px; }
.alma-vitrine .placa .coroa { display: flex; gap: 2px; }
.alma-vitrine .placa .coroa .alma-svg { width: 22px; height: 22px; }
.alma-vitrine .espaco { flex: 1; }
.alma-vitrine .alma-saldo { background: #241a5e; color: #ffe27a; box-shadow: inset 0 0 0 3px #e6b23e; }
.alma-vitrine .alma-fechar { background: #3a2c8e; box-shadow: 0 4px 0 #1a1250, inset 0 2px 0 rgba(255,255,255,0.3); }
.alma-vitrine .alma-fechar svg path { stroke: #fff; }
.alma-prateleira { position: relative; display: grid; grid-auto-flow: column; grid-template-rows: repeat(var(--linhas, 2), auto); grid-auto-columns: 168px;
  gap: 18px 16px; align-content: center; overflow-x: auto; overflow-y: hidden; padding: 12px 8px 16px; scroll-snap-type: x proximity; scrollbar-width: none; }
.alma-prateleira::-webkit-scrollbar { display: none; }
.alma-prateleira.duas { grid-auto-flow: row; grid-template-rows: none; grid-template-columns: repeat(6, 168px); justify-content: center; }
.alma-pcard { position: relative; height: 196px; border: 0; border-radius: 26px; cursor: pointer; padding: 0; scroll-snap-align: start; overflow: visible;
  background: radial-gradient(ellipse at 50% 30%, #6a52d8 0%, #3a2a9a 60%, #241a6e 100%);
  box-shadow: 0 0 0 3px #e6b23e, 0 0 0 6px rgba(255, 226, 140, 0.25), 0 10px 0 2px #120c36, 0 16px 24px rgba(0,0,0,0.45);
  -webkit-tap-highlight-color: transparent; transition: transform 0.15s; }
.alma-pcard:active { transform: scale(0.97); }
.alma-pcard .arte { position: absolute; left: 14px; right: 14px; top: 14px; height: 116px; display: grid; place-items: center; animation: alma-flutuar 3.2s ease-in-out infinite; }
.alma-pcard .arte .alma-fig { width: 108px; height: 108px; filter: drop-shadow(0 8px 0 rgba(0,0,0,0.28)) drop-shadow(0 0 14px rgba(255,230,160,0.35)); }
.alma-pcard .chao { position: absolute; left: 30px; right: 30px; top: 124px; height: 14px; border-radius: 50%; background: radial-gradient(ellipse, rgba(255,226,140,0.45), transparent 70%); }
.alma-pcard .brilho { position: absolute; inset: 0; overflow: hidden; border-radius: 26px; pointer-events: none; }
.alma-pcard .brilho::after { content: ''; position: absolute; top: -20%; bottom: -20%; width: 26%; left: -40%; transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent); animation: alma-varre 5s ease-in-out infinite; animation-delay: var(--d, 0s); }
@keyframes alma-varre { 30%, 100% { left: 130%; } }
.alma-pcard .preco { position: absolute; left: 50%; bottom: 12px; transform: translateX(-50%); display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 14px 3px 5px; border-radius: 999px; background: linear-gradient(#fff3c4, #ffd76a); box-shadow: 0 3px 0 #a8741a; font: 900 1.3rem var(--display); color: #7a4a00; white-space: nowrap; }
.alma-pcard .preco .moeda { width: 30px; height: 30px; }
.alma-pcard .pote { position: absolute; left: 26px; right: 26px; bottom: 4px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.18); overflow: hidden; }
.alma-pcard .pote i { display: block; height: 100%; background: linear-gradient(90deg, #ffe27a, #ffb21a); }
.alma-pcard .prova { position: absolute; left: -8px; top: -8px; width: 40px; height: 40px; border-radius: 50%; padding: 6px; box-sizing: border-box;
  background: linear-gradient(#8fc2ff, #2f7fe8); box-shadow: 0 3px 0 #1d58b0, 0 0 0 3px #e6b23e; }
.alma-pcard .meu { position: absolute; right: -8px; top: -8px; width: 40px; height: 40px; border-radius: 50%; padding: 7px; box-sizing: border-box; background: #5cbf4f; box-shadow: 0 3px 0 #3f9a3a, 0 0 0 3px #fff; }
.alma-pcard.vestido { box-shadow: 0 0 0 4px #7fe0ff, 0 0 26px 6px rgba(127, 224, 255, 0.55), 0 10px 0 2px #120c36; }
.alma-pdet { position: absolute; inset: 0; z-index: 3; display: grid; place-items: center; background: rgba(10, 6, 30, 0.6); }
.alma-pdet[hidden] { display: none; }
.alma-pdet .caixa { position: relative; display: grid; grid-template-columns: auto auto; align-items: center; gap: 22px; padding: 22px 26px; border-radius: 30px;
  background: radial-gradient(ellipse at 30% 30%, #5a46c8, #2a1f78 70%); box-shadow: 0 0 0 4px #e6b23e, 0 14px 0 4px #0e0a2a, 0 26px 40px rgba(0,0,0,0.5); }
.alma-pdet .grande { position: relative; width: 230px; height: 230px; display: grid; place-items: center; }
.alma-pdet .grande .alma-fig { width: 200px; height: 200px; animation: alma-flutuar 3s ease-in-out infinite; filter: drop-shadow(0 10px 0 rgba(0,0,0,0.3)) drop-shadow(0 0 22px rgba(255,230,160,0.5)); }
.alma-pdet .grande::after { content: ''; position: absolute; left: 20px; right: 20px; bottom: 6px; height: 22px; border-radius: 50%; background: radial-gradient(ellipse, #ffe9a8, #c9902a 60%, transparent 72%); }
.alma-pdet .lado { display: grid; justify-items: center; gap: 14px; }
.alma-pdet .alma-saldo { font-size: 2rem; }
.alma-pdet .alma-saldo .moeda { width: 42px; height: 42px; }
.alma-pdet .botoes { display: flex; gap: 14px; }
.alma-pdet .alma-fechar { position: absolute; top: -14px; right: -14px; }
.alma-pdet .pote-grande { width: 220px; height: 14px; border-radius: 7px; background: rgba(255,255,255,0.18); overflow: hidden; box-shadow: inset 0 2px 0 rgba(0,0,0,0.25); }
.alma-pdet .pote-grande i { display: block; height: 100%; border-radius: 7px; background: linear-gradient(90deg, #ffe27a, #ffb21a); }
.alma-pdet .efeito { display: flex; gap: 8px; }
.alma-pdet .efeito i { width: 10px; height: 10px; border-radius: 50%; background: #ffe27a; box-shadow: 0 0 10px #ffe27a; animation: alma-pisca 1.2s ease-in-out infinite; }
.alma-pdet .efeito i:nth-child(2) { animation-delay: 0.3s; background: #ff86d6; box-shadow: 0 0 10px #ff86d6; }
.alma-pdet .efeito i:nth-child(3) { animation-delay: 0.6s; background: #7fe0ff; box-shadow: 0 0 10px #7fe0ff; }

/* provador: a criança no mundo, a câmera gira em volta; embaixo, voltar e comprar */
body.alma-provando > *:not(canvas):not(.alma-provador):not(.alma-festa):not(.alma-fundo):not(.alma-voo) { visibility: hidden !important; }
body.alma-provando canvas { visibility: visible !important; }
.alma-provador { position: fixed; z-index: 64; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; align-items: center; gap: 14px;
  padding: 10px 14px; border-radius: 999px; background: linear-gradient(#3a2c8e, #241a5e); box-shadow: 0 0 0 3px #e6b23e, 0 8px 0 2px #0e0a2a, 0 14px 24px rgba(0,0,0,0.4); }
.alma-provador[hidden] { display: none; }
.alma-provador .alma-saldo { background: #241a5e; color: #ffe27a; box-shadow: inset 0 0 0 3px #e6b23e; }

/* botões grandes */
.alma-cartao { position: relative; display: grid; justify-items: center; gap: 12px; padding: 18px 22px 22px; border-radius: 28px; background: var(--painel);
  box-shadow: 0 0 0 4px var(--painel-borda), 0 10px 0 #d9b77a, 0 22px 40px rgba(40,25,10,0.4); max-height: 100%; box-sizing: border-box; }
.alma-cartao .alma-fechar { position: absolute; top: -12px; right: -12px; width: 50px; height: 50px; z-index: 2; box-shadow: 0 0 0 4px var(--painel-borda), 0 5px 0 4px #d9b77a; }
.alma-cartao[data-alma-quadro] { margin-top: 10px; }
.alma-cartao.premium { background: radial-gradient(ellipse at 50% 30%, #5a46c8, #2a1f78 70%); box-shadow: 0 0 0 4px #e6b23e, 0 14px 0 4px #0e0a2a, 0 26px 40px rgba(0,0,0,0.5); }
.alma-botao { min-width: 120px; height: 64px; border: 0; border-radius: 22px; cursor: pointer; display: inline-grid; place-items: center; padding: 8px 22px;
  background: linear-gradient(#a6e88a, #5cbf4f); box-shadow: 0 6px 0 #3f9a3a, 0 10px 16px rgba(40,25,10,0.25), inset 0 2px 0 rgba(255,255,255,0.7); -webkit-tap-highlight-color: transparent; }
.alma-botao .alma-svg { width: 40px; height: 40px; }
.alma-botao:active { transform: translateY(4px); box-shadow: 0 2px 0 #3f9a3a; }
.alma-botao.azul { background: linear-gradient(#8fc2ff, #2f7fe8); box-shadow: 0 6px 0 #1d58b0, 0 10px 16px rgba(40,25,10,0.25), inset 0 2px 0 rgba(255,255,255,0.7); }
.alma-botao.ouro { background: linear-gradient(#fff3c4, #ffc93d); box-shadow: 0 6px 0 #a8741a, 0 10px 16px rgba(0,0,0,0.3), inset 0 2px 0 #fff; }
.alma-botao.ouro .alma-svg { width: auto; display: flex; align-items: center; gap: 4px; }
.alma-botao.chama .alma-svg { animation: alma-chama 1.4s ease-in-out infinite; }
.alma-botao[disabled] { filter: saturate(0.3) opacity(0.6); }
.alma-quadro { display: grid; grid-template-columns: repeat(var(--n, 2), minmax(0, 360px)); gap: 18px; }
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
  .alma-cabeca { padding: 8px 10px 4px; gap: 8px; }
  .alma-aba { width: 54px; height: 48px; }
  .alma-saldo { font-size: 1.2rem; padding: 2px 10px 2px 4px; }
  .alma-saldo .moeda { width: 28px; height: 28px; }
  .alma-fechar { width: 44px; height: 44px; }
  .alma-corpo { padding: 2px 12px 10px; }
  .alma-figurinhas { gap: 8px; padding: 8px; grid-template-columns: repeat(4, 84px); }
  .alma-grandes { grid-template-columns: repeat(2, 104px); gap: 8px; }
  .alma-grande { width: 104px; height: 128px; }
  .alma-niveis { grid-auto-columns: 88px; padding: 6px 4px 10px; }
  .alma-niveis::before { top: 112px; }
  .alma-nivel-passo { gap: 8px; }
  .alma-nivel-passo .presente { width: 70px; height: 70px; }
  .alma-hab { padding: 8px 4px 8px; gap: 5px; }
  .alma-hab .distintivo { width: 80px; height: 80px; }
  .alma-hab .distintivo .alma-fig { width: 48px; height: 48px; }
  .alma-hab .mundos .alma-svg { width: 26px; height: 26px; }
  .alma-estrelas .alma-svg { width: 16px; height: 16px; }
  .alma-banca { padding: 26px 10px 10px; }
  .alma-banca .grade { grid-template-columns: repeat(auto-fill, minmax(98px, 1fr)); gap: 10px; }
  .alma-item { min-height: 0; padding: 8px 6px; }
  .alma-item .alma-fig { width: 60px; height: 60px; }
  .alma-cartao { padding: 12px 16px 16px; gap: 8px; }
  .alma-oferta { padding: 10px 12px 14px; gap: 8px; }
  .alma-oferta .tarefa, .alma-oferta .premio { width: 104px; height: 104px; }
  .alma-botao { height: 54px; }
  .alma-vitrine .placa .alma-svg { width: 36px; height: 36px; }
  .alma-vitrine .topo { padding-bottom: 2px; }
  .alma-prateleira, .alma-prateleira.duas { --linhas: 1 !important; grid-auto-flow: column; grid-template-columns: none; grid-template-rows: repeat(1, auto); justify-content: start; grid-auto-columns: 176px; padding: 10px 8px 16px; }
  .alma-pcard { height: 236px; }
  .alma-pcard .arte { height: 150px; top: 18px; }
  .alma-pcard .arte .alma-fig { width: 136px; height: 136px; }
  .alma-pcard .chao { top: 160px; }
  .alma-pdet .caixa { padding: 14px 18px; gap: 14px; }
  .alma-pdet .grande { width: 190px; height: 190px; }
  .alma-pdet .grande .alma-fig { width: 165px; height: 165px; }
}
` + CSS_FESTA;

const svgEl = (nome: string, classe = '') => {
  const s = document.createElement('span');
  s.className = `alma-svg ${classe}`.trim();
  s.innerHTML = arte(nome);
  return s;
};

function botaoFechar(aoFechar: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'alma-fechar';
  b.setAttribute('aria-label', 'Fechar');
  b.setAttribute('data-alma-fechar', '');
  b.innerHTML = FECHAR;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    tocarSomInterface('toc');
    aoFechar();
  });
  return b;
}

function botao(classe: string, rotulo: string, dado: string, miolo: string | HTMLElement, aoTocar: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `alma-botao ${classe}`;
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

export function pilhaDeMoedas(n: number, classe = 'alma-moedas'): HTMLElement {
  const el = document.createElement('span');
  el.className = classe;
  el.appendChild(svgEl('moeda', 'moeda'));
  el.append(`${n}`);
  return el;
}

export function progressoEl(m: Missao, e: EstadoMundo): HTMLElement {
  const meta = metaDa(m);
  const fr = fracaoDa(e, m);
  if (m.conta.tipo === 'obra' || meta > 8) {
    const b = document.createElement('div');
    b.className = 'alma-barra';
    b.innerHTML = `<i style="width:${Math.max(6, fr * 100)}%"></i>`;
    return b;
  }
  const lista = document.createElement('div');
  lista.className = 'alma-bolinhas';
  const feitos = Math.round(fr * meta);
  for (let i = 0; i < meta; i++) {
    const b = document.createElement('span');
    b.className = `b${i < feitos ? ' cheia' : ''}`;
    b.appendChild(figura(desenhoDaBolinha(m, i)));
    lista.appendChild(b);
  }
  return lista;
}

function premioEl(m: Missao): HTMLElement {
  const premio = document.createElement('div');
  premio.className = 'premio';
  premio.appendChild(figura(m.fantasia ? `fantasia:${m.fantasia}` : desenhoDaFigurinha(m)));
  premio.appendChild(pilhaDeMoedas(m.moedas));
  return premio;
}

export interface AcoesUi {
  crianca(): EstadoCrianca;
  mundoEst(): EstadoMundo;
  mundo: MundoAlma;
  fixar(id: string): void;
  comprarPremium(id: string): boolean;
  comprarBanca(id: string): boolean;
  vestirPremium(id: string, vestir: boolean): void;
  /** Provador: veste o item só para ver (null: tira e volta). */
  experimentar(id: string | null): void;
  aoAbrir(): void;
  aoFechar(): void;
}

export function criarUiAlma(a: AcoesUi) {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_ALMA;
  document.head.appendChild(estilo);
  document.body.classList.add('esboco-alma');

  // ---------------------------------------------------------------- HUD
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
  carteira.appendChild(nivelEl);
  carteira.appendChild(svgEl('moeda', 'moeda'));
  const nMoedas = document.createElement('span');
  nMoedas.className = 'n';
  carteira.appendChild(nMoedas);
  document.body.appendChild(carteira);

  const cartao = document.createElement('button');
  cartao.type = 'button';
  cartao.className = 'alma-missao';
  cartao.setAttribute('aria-label', 'Missão');
  cartao.setAttribute('data-alma-missao', '');
  document.body.appendChild(cartao);

  let moedasMostradas = a.crianca().moedas;
  let xpMostrado = a.crianca().xp;
  function pintarNivel(xp: number): void {
    const { nivel, fracao } = nivelDoXp(xp);
    nNivel.textContent = String(nivel);
    nivelEl.style.setProperty('--f', String(fracao));
  }
  function renderHud(animar = false): void {
    const c = a.crianca();
    if (!animar) {
      moedasMostradas = c.moedas;
      xpMostrado = c.xp;
    }
    nMoedas.textContent = String(moedasMostradas);
    pintarNivel(xpMostrado);
    const m = missaoDoHud(a.mundoEst(), a.mundo);
    cartao.hidden = !m;
    if (!m) return;
    cartao.dataset.missao = m.id;
    cartao.replaceChildren();
    const t = document.createElement('span');
    t.className = 'tarefa';
    t.appendChild(figuraMissao(m));
    const meio = document.createElement('span');
    meio.className = 'meio';
    meio.appendChild(progressoEl(m, a.mundoEst()));
    cartao.append(t, meio, svgEl('seta', 'seta'), premioEl(m));
  }

  /** O número das moedas sobe de uma em uma (com o tlim de cada moeda). */
  function contarMoedasAte(ate: number, som: (i: number) => void): Promise<void> {
    return new Promise((ok) => {
      let i = 0;
      const passo = () => {
        if (moedasMostradas >= ate) {
          moedasMostradas = ate;
          nMoedas.textContent = String(ate);
          ok();
          return;
        }
        moedasMostradas++;
        nMoedas.textContent = String(moedasMostradas);
        carteira.classList.remove('pulou');
        void carteira.offsetWidth;
        carteira.classList.add('pulou');
        som(i++);
        setTimeout(passo, 140);
      };
      passo();
    });
  }

  /** O anel do nível enche devagar até o XP de agora. */
  function encherXp(ate = a.crianca().xp): Promise<void> {
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

  function pulsarCartao(): void {
    cartao.classList.remove('cresceu');
    void cartao.offsetWidth;
    cartao.classList.add('cresceu');
    const cheias = cartao.querySelectorAll('.alma-bolinhas .b.cheia');
    cheias[cheias.length - 1]?.classList.add('agora');
  }

  // ---------------------------------------------------------------- fundo dos painéis
  const fundo = document.createElement('div');
  fundo.className = 'alma-fundo';
  fundo.hidden = true;
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
      a.aoAbrir();
    }
  }
  function fechar(): void {
    if (!fundo.hidden) {
      fundo.hidden = true;
      fundo.replaceChildren();
    }
    if (!vitrine.hidden) vitrine.hidden = true;
    if (document.body.dataset.overlay === 'alma') delete document.body.dataset.overlay;
    a.aoFechar();
  }

  // ---------------------------------------------------------------- quadro de missões
  function quadro(): void {
    const e = a.mundoEst();
    const lista = abertas(e, a.mundo).slice(0, 3);
    const caixa = document.createElement('div');
    caixa.className = 'alma-cartao';
    caixa.setAttribute('data-alma-quadro', '');
    caixa.appendChild(botaoFechar(fechar));
    const grade = document.createElement('div');
    grade.className = 'alma-quadro';
    grade.style.setProperty('--n', String(lista.length));
    const fix = missaoDoHud(e, a.mundo);
    for (const m of lista) grade.appendChild(oferta(m, m === fix));
    caixa.appendChild(grade);
    abrirFundo(caixa);
  }

  function oferta(m: Missao, fixada: boolean): HTMLElement {
    const c = document.createElement('div');
    c.className = `alma-oferta${fixada ? ' fixada' : ''}`;
    c.dataset.missao = m.id;
    const linha = document.createElement('div');
    linha.className = 'linha';
    const t = document.createElement('div');
    t.className = 'tarefa';
    t.appendChild(figuraMissao(m));
    linha.append(t, svgEl('seta', 'seta'), premioEl(m));
    c.appendChild(linha);
    c.appendChild(progressoEl(m, a.mundoEst()));
    const jogar = document.createElement('button');
    jogar.type = 'button';
    jogar.className = `alma-botao${fixada ? '' : ' chama'}`;
    jogar.setAttribute('aria-label', 'Brincar');
    jogar.setAttribute('data-alma-jogar', m.id);
    jogar.appendChild(svgEl('play'));
    jogar.addEventListener('click', () => {
      tocarSomInterface('criar');
      a.fixar(m.id);
      const de = c.getBoundingClientRect();
      fechar();
      renderHud();
      voar(c, de, cartao.getBoundingClientRect());
    });
    c.appendChild(jogar);
    return c;
  }

  // ---------------------------------------------------------------- o baú (4 abas)
  type Aba = 'album' | 'nivel' | 'habilidades' | 'banca';
  function bau(aba: Aba): void {
    const painel = document.createElement('div');
    painel.className = 'alma-painel';
    painel.setAttribute('data-alma-painel', aba);
    const cab = document.createElement('div');
    cab.className = 'alma-cabeca';
    const abas: Array<[Aba, string, string]> = [
      ['album', 'album', 'Missões do mundo'],
      ['nivel', 'nivel', 'Meu nível'],
      ['habilidades', 'medalha', 'Habilidades'],
      ['banca', a.mundo === 'cidade-grande' ? 'toldoVerde' : 'toldoVermelho', 'Banca do mundo'],
    ];
    for (const [id, desenho, rotulo] of abas) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'alma-aba';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', rotulo);
      b.setAttribute('aria-selected', String(id === aba));
      b.setAttribute('data-alma-aba', id);
      b.appendChild(svgEl(desenho));
      b.addEventListener('click', () => {
        tocarSomInterface('toc');
        bau(id);
      });
      cab.appendChild(b);
    }
    const esp = document.createElement('span');
    esp.className = 'espaco';
    const saldo = pilhaDeMoedas(a.crianca().moedas, 'alma-saldo');
    saldo.setAttribute('data-alma-saldo', '');
    cab.append(esp, saldo, botaoFechar(fechar));
    const corpo = document.createElement('div');
    corpo.className = 'alma-corpo';
    if (aba === 'album') corpo.appendChild(album());
    else if (aba === 'nivel') corpo.appendChild(niveis());
    else if (aba === 'habilidades') corpo.appendChild(habilidades());
    else corpo.appendChild(banca());
    painel.append(cab, corpo);
    abrirFundo(painel);
    // o caminho dos níveis abre no nível de agora
    corpo.querySelector('.alma-nivel-passo.agora')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  }

  function album(): HTMLElement {
    const e = a.mundoEst();
    const c = a.crianca();
    const caixa = document.createElement('div');
    caixa.className = 'alma-album';
    const grade = document.createElement('div');
    grade.className = 'alma-figurinhas';
    const abertasAgora = abertas(e, a.mundo);
    missoesDoMundo(a.mundo).forEach((m, i) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      const feita = e.feitas.includes(m.id);
      const aberta = abertasAgora.includes(m);
      slot.className = `alma-fig-slot ${feita ? 'feita' : aberta ? 'aberta' : 'futura'}`;
      slot.style.setProperty('--giro', `${((i * 37) % 9) - 4}deg`);
      slot.dataset.missao = m.id;
      slot.setAttribute('aria-label', m.nome);
      slot.appendChild(figura(desenhoDaFigurinha(m)));
      if (aberta) {
        const fr = fracaoDa(e, m);
        const anel = document.createElement('span');
        anel.className = 'anel';
        anel.style.background = `conic-gradient(#5cbf4f ${fr}turn, transparent 0)`;
        anel.style.mask = 'radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))';
        slot.appendChild(anel);
        slot.appendChild(svgEl('play', 'jogar'));
      }
      if (!feita) slot.appendChild(pilhaDeMoedas(m.moedas, 'alma-moedas moedas-canto'));
      slot.addEventListener('click', () => {
        tocarSomInterface('toc');
        if (aberta) quadro();
      });
      grade.appendChild(slot);
    });
    const grandes = document.createElement('div');
    grandes.className = 'alma-grandes';
    for (const m of missoesDoMundo(a.mundo).filter((x) => x.fantasia)) {
      const g = document.createElement('div');
      const tem = c.fantasias.includes(m.fantasia!);
      g.className = `alma-grande${tem ? '' : ' futura'}`;
      g.dataset.fantasia = m.fantasia;
      g.appendChild(figura(`fantasia:${m.fantasia}`));
      if (!tem) {
        g.appendChild(svgEl('cadeado', 'cad'));
        const q = document.createElement('span');
        q.className = 'quando';
        q.appendChild(figura(desenhoDaFigurinha(m)));
        g.appendChild(q);
      }
      grandes.appendChild(g);
    }
    caixa.append(grade, grandes);
    return caixa;
  }

  function aparencia(): Aparencia {
    return normalizarAparencia((window.__brumaluz?.personagem?.aparencia?.() ?? {}) as Aparencia);
  }

  function niveis(): HTMLElement {
    const c = a.crianca();
    const { nivel, fracao } = nivelDoXp(c.xp);
    const linha = document.createElement('div');
    linha.className = 'alma-niveis';
    for (let n = 1; n <= XP_DO_NIVEL.length; n++) {
      const p = document.createElement('div');
      p.className = `alma-nivel-passo ${n < nivel ? 'ja' : n === nivel ? 'agora' : 'futuro'}`;
      p.dataset.nivel = String(n);
      const presente = PRESENTES_NIVEL.find((x) => x.nivel === n);
      const caixa = document.createElement('div');
      caixa.className = 'presente';
      if (presente) {
        caixa.appendChild(figura(presente.desenho));
        caixa.appendChild(pilhaDeMoedas(presente.moedas));
        caixa.setAttribute('aria-label', presente.nome);
        if (n <= nivel) p.classList.add('ja');
      } else {
        caixa.appendChild(figura('estrela'));
      }
      const bola = document.createElement('div');
      bola.className = 'bola';
      if (n === nivel) {
        bola.style.setProperty('--f', String(fracao));
        p.style.setProperty('--f', String(fracao));
        const cv = document.createElement('canvas');
        fotografarBoneco(cv, aparencia(), 'cabeca', 160);
        const b = document.createElement('b');
        b.textContent = String(n);
        bola.append(cv, b);
        p.classList.remove('ja');
      } else bola.textContent = String(n);
      p.append(caixa, bola);
      linha.appendChild(p);
    }
    return linha;
  }

  function habilidades(): HTMLElement {
    const c = a.crianca();
    const grade = document.createElement('div');
    grade.className = 'alma-habs';
    for (const h of HABILIDADES) {
      const { estrelas, fracao } = estrelasDe(c.pontos[h.id] ?? 0);
      const card = document.createElement('div');
      card.className = 'alma-hab';
      card.dataset.hab = h.id;
      card.setAttribute('aria-label', h.nome);
      const d = document.createElement('span');
      d.className = 'distintivo';
      d.style.setProperty('--cor', h.cor);
      d.style.setProperty('--f', String(estrelas >= 5 ? 1 : fracao));
      d.appendChild(figura(h.desenho));
      const est = document.createElement('span');
      est.className = 'alma-estrelas';
      for (let i = 0; i < 5; i++) est.appendChild(svgEl(i < estrelas ? 'estrela' : 'estrelaVazia'));
      const mundos = document.createElement('span');
      mundos.className = 'mundos';
      for (const m of h.mundos) mundos.appendChild(svgEl(m === 'cidade-grande' ? 'mundoCidade' : 'mundoRancho'));
      card.append(d, est, mundos);
      grade.appendChild(card);
    }
    return grade;
  }

  function banca(): HTMLElement {
    const c = a.crianca();
    const caixa = document.createElement('div');
    caixa.className = 'alma-banca';
    caixa.style.setProperty('--toldo', a.mundo === 'cidade-grande' ? '#3fae5a' : '#e8402f');
    const toldo = document.createElement('div');
    toldo.className = 'toldo';
    const grade = document.createElement('div');
    grade.className = 'grade';
    for (const it of bancaDoMundo(a.mundo)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.item = it.id;
      b.setAttribute('aria-label', it.nome);
      const pode = c.moedas >= it.preco;
      b.className = `alma-item${pode ? ' pode' : ''}`;
      b.appendChild(figura(it.desenho));
      const q = document.createElement('span');
      q.className = 'qtd';
      q.textContent = `×${it.qtd}`;
      b.appendChild(q);
      const pe = document.createElement('span');
      pe.style.cssText = 'display:grid;justify-items:center;gap:4px;width:100%';
      const preco = document.createElement('span');
      preco.className = 'preco';
      preco.appendChild(svgEl('moeda', 'moeda'));
      preco.append(String(it.preco));
      pe.appendChild(preco);
      if (!pode) {
        const pote = document.createElement('span');
        pote.className = 'pote';
        pote.innerHTML = `<i style="width:${Math.min(1, c.moedas / it.preco) * 100}%"></i>`;
        pe.appendChild(pote);
      }
      b.appendChild(pe);
      b.addEventListener('click', () => {
        tocarSomInterface('toc');
        if (pode) confirmarBanca(it);
        else balancar(b);
      });
      grade.appendChild(b);
    }
    caixa.append(toldo, grade);
    return caixa;
  }

  function balancar(el: HTMLElement): void {
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      { duration: 280 },
    );
  }

  /** Confirmar (os dois botões grandes: não e sim) — banca e premium usam a mesma peça. */
  function cartaoConfirmar(fig: HTMLElement, preco: number, premium: boolean, sim: () => void, nao: () => void): HTMLElement {
    const c = document.createElement('div');
    c.className = `alma-cartao${premium ? ' premium' : ''}`;
    c.setAttribute('data-alma-confirmar', '');
    fig.style.width = '150px';
    fig.style.height = '150px';
    const linha = document.createElement('div');
    linha.style.cssText = 'display:flex;gap:18px';
    linha.append(
      botao('azul', 'Agora não', 'data-alma-nao', FECHAR.replace('#5a3a22', '#fff'), nao),
      botao('chama', 'Comprar', 'data-alma-sim', arte('ok'), sim),
    );
    c.append(fig, pilhaDeMoedas(preco, 'alma-saldo'), linha);
    return c;
  }

  function confirmarBanca(it: ItemBanca): void {
    const fig = figura(it.desenho);
    abrirFundo(
      cartaoConfirmar(fig, it.preco, false, () => {
        if (!a.comprarBanca(it.id)) return;
        tocarSomInterface('conquista');
        const de = fig.getBoundingClientRect();
        bau('banca');
        // o pacote voa para a mochila
        const mochila = document.querySelector<HTMLElement>('[data-botao-mochila]');
        if (mochila) voar(figura(it.desenho), de, mochila.getBoundingClientRect(), 120);
        renderHud();
      }, () => bau('banca')),
    );
  }

  // ---------------------------------------------------------------- a lojinha premium
  const vitrine = document.createElement('div');
  vitrine.className = 'alma-vitrine';
  vitrine.hidden = true;
  vitrine.setAttribute('data-alma-vitrine', '');
  document.body.appendChild(vitrine);

  function abrirVitrine(): void {
    vitrine.replaceChildren();
    for (const lado of ['e', 'd']) {
      const f = document.createElement('div');
      f.className = `feixe ${lado}`;
      vitrine.appendChild(f);
    }
    const ceu = document.createElement('div');
    ceu.className = 'ceu';
    for (let i = 0; i < 46; i++) {
      const s = document.createElement('i');
      s.style.left = `${(i * 37.7) % 100}%`;
      s.style.top = `${(i * 53.3) % 100}%`;
      s.style.animationDelay = `${(i % 9) * 0.29}s`;
      ceu.appendChild(s);
    }
    vitrine.appendChild(ceu);
    const topo = document.createElement('div');
    topo.className = 'topo';
    const placa = document.createElement('div');
    placa.className = 'placa';
    placa.appendChild(svgEl('vitrine'));
    const coroa = document.createElement('span');
    coroa.className = 'coroa';
    for (let i = 0; i < 3; i++) coroa.appendChild(svgEl('estrela'));
    placa.appendChild(coroa);
    const esp = document.createElement('span');
    esp.className = 'espaco';
    const saldo = pilhaDeMoedas(a.crianca().moedas, 'alma-saldo');
    saldo.setAttribute('data-alma-saldo', '');
    topo.append(placa, esp, saldo, botaoFechar(fechar));
    const prat = document.createElement('div');
    prat.className = 'alma-prateleira';
    if (innerHeight > 600) prat.classList.add('duas');
    PREMIUM.forEach((p, i) => prat.appendChild(cartaoPremium(p, i)));
    const det = document.createElement('div');
    det.className = 'alma-pdet';
    det.hidden = true;
    det.setAttribute('data-alma-detalhe', '');
    vitrine.append(topo, prat, det);
    if (vitrine.hidden) {
      vitrine.hidden = false;
      document.body.dataset.overlay = 'alma';
      document.exitPointerLock?.();
      a.aoAbrir();
    }
  }

  function cartaoPremium(p: ItemPremium, i: number): HTMLElement {
    const c = a.crianca();
    const b = document.createElement('button');
    b.type = 'button';
    const tem = c.premium.includes(p.id);
    const vestido = Object.values(c.vestidos).includes(p.id);
    b.className = `alma-pcard${vestido ? ' vestido' : ''}`;
    b.dataset.premium = p.id;
    b.setAttribute('aria-label', p.nome);
    b.style.setProperty('--d', `${(i % 5) * 0.9}s`);
    const arteEl = document.createElement('div');
    arteEl.className = 'arte';
    arteEl.style.animationDelay = `${(i % 4) * -0.7}s`;
    arteEl.appendChild(figura(p.desenho));
    const chao = document.createElement('div');
    chao.className = 'chao';
    const brilho = document.createElement('div');
    brilho.className = 'brilho';
    b.append(chao, arteEl, brilho);
    if (tem) b.appendChild(svgEl('ok', 'meu'));
    else {
      b.appendChild(pilhaDeMoedas(p.preco, 'preco'));
      if (c.moedas < p.preco) {
        const pote = document.createElement('span');
        pote.className = 'pote';
        pote.innerHTML = `<i style="width:${Math.min(1, c.moedas / p.preco) * 100}%"></i>`;
        b.appendChild(pote);
      }
    }
    if (p.feito) {
      const pr = document.createElement('span');
      pr.className = 'prova alma-svg';
      pr.innerHTML = ESPELHO;
      b.appendChild(pr);
    }
    b.addEventListener('click', () => {
      tocarSomInterface('toc');
      detalhe(p);
    });
    return b;
  }

  function detalhe(p: ItemPremium): void {
    const det = vitrine.querySelector<HTMLElement>('[data-alma-detalhe]');
    if (!det) return;
    const c = a.crianca();
    const tem = c.premium.includes(p.id);
    const vestido = Object.values(c.vestidos).includes(p.id);
    det.replaceChildren();
    det.hidden = false;
    det.onclick = (e) => {
      if (e.target === det) det.hidden = true;
    };
    const caixa = document.createElement('div');
    caixa.className = 'caixa';
    caixa.dataset.premium = p.id;
    const grande = document.createElement('div');
    grande.className = 'grande';
    grande.appendChild(figura(p.desenho));
    const lado = document.createElement('div');
    lado.className = 'lado';
    lado.setAttribute('aria-label', p.efeito);
    const botoes = document.createElement('div');
    botoes.className = 'botoes';
    if (p.feito)
      botoes.appendChild(
        botao('azul', 'Experimentar', 'data-alma-experimentar', ESPELHO, () => provar(p)),
      );
    if (tem) {
      botoes.appendChild(
        botao(vestido ? 'azul' : 'chama', vestido ? 'Tirar' : 'Vestir', 'data-alma-vestir-premium', vestido ? TIRAR : VESTIR, () => {
          a.vestirPremium(p.id, !vestido);
          tocarSomInterface('criar');
          abrirVitrine();
        }),
      );
    } else {
      lado.appendChild(pilhaDeMoedas(p.preco, 'alma-saldo'));
      const pode = c.moedas >= p.preco;
      if (!pode) {
        // o potinho: quanto da carteira já dá (sem pressa: nada some da lojinha)
        const pote = document.createElement('div');
        pote.className = 'pote-grande';
        pote.innerHTML = `<i style="width:${Math.min(1, c.moedas / p.preco) * 100}%"></i>`;
        lado.appendChild(pote);
      }
      const comprar = botao(`ouro${pode ? ' chama' : ''}`, 'Comprar', 'data-alma-comprar', arte('ok'), () => {
        if (!pode) return balancar(comprar);
        confirmarPremium(p);
      });
      if (!pode) comprar.setAttribute('disabled', '');
      botoes.appendChild(comprar);
    }
    lado.appendChild(botoes);
    caixa.append(grande, lado, botaoFechar(() => (det.hidden = true)));
    det.appendChild(caixa);
  }

  function confirmarPremium(p: ItemPremium): void {
    const det = vitrine.querySelector<HTMLElement>('[data-alma-detalhe]');
    if (!det) return;
    det.replaceChildren(
      cartaoConfirmar(figura(p.desenho), p.preco, true, () => {
        if (!a.comprarPremium(p.id)) return;
        det.hidden = true;
      }, () => detalhe(p)),
    );
    det.hidden = false;
  }

  // ---------------------------------------------------------------- provador
  const provador = document.createElement('div');
  provador.className = 'alma-provador';
  provador.hidden = true;
  provador.setAttribute('data-alma-provador', '');
  document.body.appendChild(provador);
  let provando: ItemPremium | null = null;

  function provar(p: ItemPremium): void {
    provando = p;
    vitrine.hidden = true;
    document.body.classList.add('alma-provando');
    a.experimentar(p.id);
    provador.replaceChildren(
      botao('azul', 'Voltar para a lojinha', 'data-alma-provador-voltar', VOLTAR, () => sairProvador(true)),
    );
    if (!a.crianca().premium.includes(p.id)) {
      provador.appendChild(pilhaDeMoedas(p.preco, 'alma-saldo'));
      const pode = a.crianca().moedas >= p.preco;
      const b = botao(`ouro${pode ? ' chama' : ''}`, 'Comprar', 'data-alma-provador-comprar', arte('ok'), () => {
        if (!pode) return balancar(b);
        sairProvador(true);
        confirmarPremium(p);
      });
      if (!pode) b.setAttribute('disabled', '');
      provador.appendChild(b);
    }
    provador.hidden = false;
  }

  function sairProvador(voltarAVitrine: boolean): void {
    if (!provando) return;
    const p = provando;
    provando = null;
    provador.hidden = true;
    document.body.classList.remove('alma-provando');
    a.experimentar(null);
    if (voltarAVitrine) {
      abrirVitrine();
      detalhe(p);
    }
  }

  // ---------------------------------------------------------------- voo
  function voar(el: HTMLElement, de: DOMRect, para: DOMRect, tam?: number): void {
    const v = el.cloneNode(true) as HTMLElement;
    v.classList.add('alma-voo');
    const w = tam ?? de.width;
    const h = tam ?? de.height;
    Object.assign(v.style, { left: `${de.left + de.width / 2 - w / 2}px`, top: `${de.top + de.height / 2 - h / 2}px`, width: `${w}px`, height: `${h}px`, margin: '0' });
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

  return {
    renderHud,
    pulsarCartao,
    contarMoedasAte,
    encherXp,
    quadro,
    abrir: (aba: Aba) => bau(aba),
    vitrine: abrirVitrine,
    detalhe: (id: string) => {
      const p = PREMIUM.find((x) => x.id === id);
      if (p) detalhe(p);
    },
    provar: (id: string) => {
      const p = PREMIUM.find((x) => x.id === id);
      if (p) provar(p);
    },
    sairProvador,
    fechar,
    carteira,
    nivelEl,
    cartao,
    voar,
    svgEl,
  };
}
export type UiAlma = ReturnType<typeof criarUiAlma>;
