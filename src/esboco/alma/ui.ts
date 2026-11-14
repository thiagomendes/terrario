/**
 * Esboço da spec 023: as telas, por cima do HUD de verdade. Tudo com figura, cor, gesto e som;
 * o texto que aparece é só o número das moedinhas e o `aria-label` (para os pais e o leitor de
 * tela). Peças de brinquedo da 012 (creme, degrau embaixo, brilho em cima).
 */
import { arte } from './arte';
import { figura, figuraMissao, desenhoDaFigurinha, desenhoDaBolinha } from './figuras';
import {
  HABILIDADES,
  MEDALHA,
  lojaDoMundo,
  missoesDoMundo,
  type Habilidade,
  type ItemLoja,
  type Missao,
  type MundoAlma,
} from './dados';
import {
  abertas,
  fracaoDa,
  liberado,
  metaDa,
  missaoDoHud,
  nivelDaHabilidade,
  type EstadoAlma,
} from './estado';
import { tocarSomInterface } from '../../audio/somInterface';

export const CSS_ALMA = `
body.esboco-alma .missao-hud { display: none !important; }
.alma-svg svg, .alma-fig svg { width: 100%; height: 100%; display: block; }
.alma-fig { display: inline-grid; place-items: center; }
.alma-fig > * { min-width: 0; min-height: 0; }
.alma-fig img, .alma-fig canvas { width: 100%; height: 100%; object-fit: contain; display: block; }
.alma-fig[data-tipo='fantasia'] { overflow: hidden; }
.alma-fig[data-tipo='fantasia'] canvas { width: auto; height: 100%; max-width: 100%; object-fit: contain; }
.alma-fig-missao { position: relative; display: grid; place-items: center; width: 100%; height: 100%; }
.alma-fig-missao .principal { width: 86%; height: 86%; }
.alma-fig-missao .selo { position: absolute; right: -4%; bottom: -4%; width: 44%; height: 44%; padding: 6%; box-sizing: border-box;
  border-radius: 50%; background: #fffaf0; box-shadow: 0 0 0 2.5px #e8c98e, 0 3px 0 rgba(150,110,60,0.35); }
.alma-trio { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3%; width: 100%; height: 100%; align-items: center; }
.alma-trio .alma-fig { width: 100%; aspect-ratio: 1; }

/* ---------------- HUD: o baú com as moedinhas e o cartão da missão ---------------- */
.alma-bau { position: fixed; z-index: 7; top: calc(8px + env(safe-area-inset-top)); left: calc(112px + env(safe-area-inset-left));
  height: 44px; display: flex; align-items: center; gap: 4px; padding: 0 12px 0 4px; border: 0; border-radius: 22px; cursor: pointer;
  background: rgba(255, 250, 240, 0.95); color: var(--tinta); font: 900 1.25rem var(--display);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 6px 12px rgba(40, 25, 10, 0.2), inset 0 2px 0 rgba(255,255,255,0.85);
  touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.alma-bau:active { transform: translateY(2px); }
.alma-bau .bau { width: 36px; height: 36px; }
.alma-bau .moeda { width: 24px; height: 24px; margin-left: 2px; }
.alma-bau .n { min-width: 1.2em; text-align: left; font-variant-numeric: tabular-nums; }
.alma-bau.pulou { animation: alma-pulo 0.45s ease-out; }
.alma-bau.novidade::after { content: ''; position: absolute; top: -3px; right: -3px; width: 14px; height: 14px; border-radius: 50%;
  background: #ff5a5a; box-shadow: 0 0 0 3px #fffaf0; }
@keyframes alma-pulo { 40% { transform: scale(1.18); } }

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
.alma-missao .premio .moedas { position: absolute; right: -8px; bottom: -6px; }
.alma-missao.cresceu { animation: alma-pulo 0.4s ease-out; }
/* as bolinhas (cada vez é uma figura que fica colorida) e a barra da obra */
.alma-bolinhas { display: flex; gap: 3px; }
.alma-bolinhas .b { width: 20px; height: 20px; border-radius: 50%; background: #efe2c6; display: grid; place-items: center; padding: 2px; box-sizing: border-box;
  transition: transform 0.25s, background 0.25s; }
.alma-bolinhas .b .alma-fig { width: 100%; height: 100%; filter: grayscale(1) opacity(0.35); transition: filter 0.3s; }
.alma-bolinhas .b.cheia { background: #c9f0b0; box-shadow: 0 0 0 2px #5cbf4f; }
.alma-bolinhas .b.cheia .alma-fig { filter: none; }
.alma-bolinhas .b.agora { animation: alma-bolinha 0.5s ease-out; }
@keyframes alma-bolinha { 40% { transform: scale(1.5); } }
.alma-barra { height: 14px; border-radius: 7px; background: #efe2c6; box-shadow: var(--sombra-poco); overflow: hidden; min-width: 70px; }
.alma-barra i { display: block; height: 100%; border-radius: 7px; background: linear-gradient(180deg, #a6e88a, #5cbf4f); transition: width 0.4s ease-out; }
/* moedinhas do prêmio: uma pilha de moedas com o número (o número ajuda os pais) */
.alma-moedas { display: inline-flex; align-items: center; gap: 1px; padding: 1px 6px 1px 2px; border-radius: 999px; background: #fffaf0;
  box-shadow: 0 0 0 2px #f5c44a, 0 2px 0 rgba(150,110,60,0.35); font: 900 0.85rem var(--display); color: #8a5a10; white-space: nowrap; }
.alma-moedas .moeda { width: 18px; height: 18px; }

/* ---------------- painéis (quadro de missões e baú) ---------------- */
.alma-fundo { position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; padding: max(10px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(10px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left));
  background: rgba(40, 25, 10, 0.42); box-sizing: border-box; }
.alma-fundo[hidden] { display: none; }
.alma-painel { position: relative; width: min(980px, 100%); max-height: 100%; box-sizing: border-box; overflow: hidden; display: grid; grid-template-rows: auto 1fr;
  border-radius: 28px; background: var(--painel); box-shadow: 0 0 0 4px var(--painel-borda), 0 10px 0 #d9b77a, 0 22px 40px rgba(40,25,10,0.4); }
.alma-cabeca { display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px; }
.alma-cabeca .espaco { flex: 1; }
.alma-aba { width: 64px; height: 58px; border: 0; border-radius: 18px; padding: 6px; cursor: pointer; background: var(--poco); box-shadow: var(--sombra-poco);
  -webkit-tap-highlight-color: transparent; }
.alma-aba .alma-svg { display: block; width: 100%; height: 100%; }
.alma-aba[aria-selected='true'] { background: linear-gradient(#fff3c4, #ffd76a); box-shadow: 0 4px 0 #d9a21a, inset 0 2px 0 #fff; transform: translateY(-2px); }
.alma-saldo { display: inline-flex; align-items: center; gap: 4px; padding: 4px 14px 4px 6px; border-radius: 999px; background: #fff3c4;
  box-shadow: inset 0 0 0 3px #f5c44a; font: 900 1.5rem var(--display); color: #8a5a10; }
.alma-saldo .moeda { width: 34px; height: 34px; }
.alma-fechar { width: 52px; height: 52px; border: 0; border-radius: 50%; cursor: pointer; background: var(--creme);
  box-shadow: 0 4px 0 var(--creme-fundo), inset 0 2px 0 #fff; display: grid; place-items: center; }
.alma-fechar svg { width: 24px; height: 24px; }
.alma-corpo { overflow: auto; padding: 4px 16px 16px; min-height: 0; }

/* álbum */
.alma-album { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; }
.alma-figurinhas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 14px; border-radius: 20px;
  background: repeating-linear-gradient(0deg, #f7ecd6 0 2px, transparent 2px 26px), #fbf3e2; box-shadow: var(--sombra-poco); }
.alma-fig-slot { position: relative; aspect-ratio: 1; border-radius: 16px; border: 3px dashed #e3cfa6; display: grid; place-items: center; padding: 8px;
  box-sizing: border-box; cursor: pointer; background: transparent; -webkit-tap-highlight-color: transparent; }
.alma-fig-slot .alma-fig { width: 100%; height: 100%; }
.alma-fig-slot.futura .alma-fig { filter: brightness(0) opacity(0.16); }
.alma-fig-slot.feita { border: 0; background: #fff; box-shadow: 0 0 0 4px #fff, 0 4px 0 6px rgba(150,110,60,0.25); transform: rotate(var(--giro, -3deg)); }
.alma-fig-slot.feita::after { content: ''; position: absolute; inset: 0; border-radius: 14px; background: linear-gradient(130deg, rgba(255,255,255,0.55), transparent 40%); pointer-events: none; }
.alma-fig-slot.aberta { border: 3px solid #5cbf4f; background: #effbe6; }
.alma-fig-slot.aberta .alma-fig { filter: saturate(0.5) opacity(0.7); }
.alma-fig-slot .anel { position: absolute; inset: -5px; border-radius: 19px; pointer-events: none; }
.alma-fig-slot .jogar { position: absolute; right: -8px; bottom: -8px; width: 34px; height: 34px; border-radius: 50%; padding: 6px; box-sizing: border-box;
  background: #5cbf4f; box-shadow: 0 3px 0 #3f9a3a; animation: alma-chama 1.6s ease-in-out infinite; }
.alma-fig-slot .moedas-canto { position: absolute; left: -6px; top: -8px; }
@keyframes alma-chama { 50% { transform: scale(1.12); } }
.alma-grandes { display: grid; gap: 12px; }
.alma-grande { position: relative; width: 150px; height: 170px; border-radius: 20px; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 35%, #fff6c8, #ffe08a 70%); box-shadow: inset 0 0 0 4px #f5c44a; }
.alma-grande .alma-fig { height: 92%; }
.alma-grande.futura .alma-fig { filter: brightness(0) opacity(0.22); }
.alma-grande .cad { position: absolute; width: 38px; height: 38px; right: 8px; top: 8px; }
.alma-grande .quando { position: absolute; left: 8px; bottom: 8px; width: 44px; height: 44px; border-radius: 12px; background: #fffaf0; padding: 3px; box-sizing: border-box;
  box-shadow: 0 2px 0 rgba(150,110,60,0.3); }
.alma-medalhas { display: flex; gap: 8px; justify-content: center; margin-top: 12px; }
.alma-medalhas .m { width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; background: var(--poco); }
.alma-medalhas .m .alma-fig { width: 70%; height: 70%; filter: brightness(0) opacity(0.18); }
.alma-medalhas .m.ouro { background: radial-gradient(circle at 40% 35%, #fff3b0, #ffc93d); box-shadow: 0 0 0 3px #d98a14; }
.alma-medalhas .m.ouro .alma-fig { filter: none; }

/* habilidades */
.alma-habs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
.alma-hab { display: grid; justify-items: center; gap: 6px; padding: 10px 4px 8px; border: 0; border-radius: 20px; background: transparent; cursor: pointer;
  -webkit-tap-highlight-color: transparent; }
.alma-hab[aria-pressed='true'] { background: var(--poco); box-shadow: var(--sombra-poco); }
.alma-hab .distintivo { position: relative; width: 96px; height: 96px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--cor) calc(var(--f) * 1turn), #ecdcbc 0); }
.alma-hab .distintivo::before { content: ''; position: absolute; inset: 9px; border-radius: 50%; background: #fffaf0; box-shadow: inset 0 3px 0 rgba(120,80,30,0.12); }
.alma-hab .distintivo .alma-fig { position: relative; width: 58px; height: 58px; }
.alma-hab .distintivo .coroa { position: absolute; top: -10px; width: 36px; height: 36px; }
.alma-estrelas { display: flex; gap: 2px; }
.alma-estrelas .alma-svg { width: 24px; height: 24px; }
.alma-caminho { display: grid; grid-template-columns: auto 1fr auto 1fr auto 1fr auto; align-items: center; gap: 6px; margin-top: 12px; padding: 12px 18px;
  border-radius: 20px; background: var(--poco); box-shadow: var(--sombra-poco); }
.alma-caminho .passo { position: relative; width: 84px; height: 84px; border-radius: 18px; display: grid; place-items: center; background: #fffaf0; padding: 6px; box-sizing: border-box; }
.alma-caminho .passo .alma-fig { width: 100%; height: 100%; }
.alma-caminho .passo.longe .alma-fig { filter: brightness(0) opacity(0.18); }
.alma-caminho .passo.longe .cad { position: absolute; right: -8px; top: -8px; width: 30px; height: 30px; }
.alma-caminho .passo.ja { box-shadow: 0 0 0 4px #5cbf4f; }
.alma-caminho .passo .nivel { position: absolute; left: 50%; bottom: -12px; transform: translateX(-50%); display: flex; }
.alma-caminho .passo .nivel .alma-svg { width: 18px; height: 18px; }
.alma-caminho .trilha { height: 10px; border-radius: 5px; background: #e3cfa6; overflow: hidden; }
.alma-caminho .trilha i { display: block; height: 100%; background: var(--cor); }
.alma-caminho .eu { width: 64px; height: 64px; }

/* lojinha */
.alma-loja { display: grid; grid-template-columns: repeat(auto-fill, minmax(124px, 1fr)); gap: 12px; }
.alma-item { position: relative; display: grid; grid-template-rows: 1fr auto; justify-items: center; gap: 6px; padding: 10px 8px 10px; border: 0; border-radius: 20px; cursor: pointer;
  background: #fffaf0; box-shadow: 0 0 0 3px #f0d9b0, 0 5px 0 3px #e2c99b; -webkit-tap-highlight-color: transparent; min-height: 150px; }
.alma-item .alma-fig { width: 84px; height: 84px; }
.alma-item .alma-fig[data-tipo='fantasia'] { height: 96px; }
.alma-item .preco { display: inline-flex; align-items: center; gap: 3px; font: 900 1.15rem var(--display); color: #8a5a10; }
.alma-item .preco .moeda { width: 24px; height: 24px; }
.alma-item .pote { width: 80%; height: 8px; border-radius: 4px; background: #efe2c6; overflow: hidden; }
.alma-item .pote i { display: block; height: 100%; background: linear-gradient(90deg, #ffd96a, #f0a91c); }
.alma-item.pode { box-shadow: 0 0 0 4px #5cbf4f, 0 5px 0 4px #3f9a3a; }
.alma-item.pode .alma-fig { animation: alma-chama 1.8s ease-in-out infinite; }
.alma-item.trancado .alma-fig { filter: brightness(0) opacity(0.16); }
.alma-item.trancado .quem { position: absolute; top: 8px; right: 8px; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--cor) calc(var(--f) * 1turn), #ecdcbc 0); }
.alma-item.trancado .quem::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: #fffaf0; }
.alma-item.trancado .quem .alma-fig { position: relative; width: 24px; height: 24px; filter: none; animation: none; }
.alma-item.trancado .cad { position: absolute; left: 8px; top: 8px; width: 28px; height: 28px; }
.alma-item.meu { box-shadow: 0 0 0 4px #8fd3ff, 0 5px 0 4px #2f7fe8; }
.alma-item .marca { position: absolute; top: -8px; right: -8px; width: 38px; height: 38px; border-radius: 50%; padding: 6px; box-sizing: border-box;
  background: #2f7fe8; box-shadow: 0 3px 0 #1d58b0; }
.alma-item .presente { width: 30px; height: 30px; }
.alma-item .qtd { position: absolute; left: 10px; bottom: 44px; font: 900 0.9rem var(--display); color: var(--tinta); background: #fff3c4; padding: 0 6px; border-radius: 8px; }

/* confirmar compra, oferta de missão, festa */
.alma-cartao { position: relative; display: grid; justify-items: center; gap: 12px; padding: 18px 22px 22px; border-radius: 28px; background: var(--painel);
  box-shadow: 0 0 0 4px var(--painel-borda), 0 10px 0 #d9b77a, 0 22px 40px rgba(40,25,10,0.4); max-height: 100%; box-sizing: border-box; }
.alma-cartao .alma-fechar { position: absolute; top: -12px; right: -12px; width: 50px; height: 50px; z-index: 2; box-shadow: 0 0 0 4px var(--painel-borda), 0 5px 0 4px #d9b77a; }
.alma-cartao[data-alma-quadro] { margin-top: 10px; }
.alma-botao { min-width: 120px; height: 64px; border: 0; border-radius: 22px; cursor: pointer; display: inline-grid; place-items: center; padding: 8px 22px;
  background: linear-gradient(#a6e88a, #5cbf4f); box-shadow: 0 6px 0 #3f9a3a, 0 10px 16px rgba(40,25,10,0.25), inset 0 2px 0 rgba(255,255,255,0.7);
  -webkit-tap-highlight-color: transparent; }
.alma-botao .alma-svg { width: 40px; height: 40px; }
.alma-botao:active { transform: translateY(4px); box-shadow: 0 2px 0 #3f9a3a; }
.alma-botao.azul { background: linear-gradient(#8fc2ff, #2f7fe8); box-shadow: 0 6px 0 #1d58b0, 0 10px 16px rgba(40,25,10,0.25), inset 0 2px 0 rgba(255,255,255,0.7); }
.alma-botao.chama .alma-svg { animation: alma-chama 1.4s ease-in-out infinite; }

.alma-quadro { display: grid; grid-template-columns: repeat(var(--n, 2), minmax(0, 360px)); gap: 18px; }
.alma-oferta { display: grid; justify-items: center; gap: 10px; padding: 14px 16px 18px; border-radius: 24px; background: #fffaf0;
  box-shadow: 0 0 0 4px #f0d9b0, 0 6px 0 4px #e2c99b; }
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
.alma-oferta .tempo { display: flex; gap: 3px; opacity: 0.85; }

.alma-festa { position: fixed; inset: 0; z-index: 70; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 45%, rgba(255, 236, 160, 0.92), rgba(255, 170, 60, 0.85) 45%, rgba(120, 50, 20, 0.85)); }
.alma-festa[hidden] { display: none; }
.alma-festa .raios { position: absolute; left: 50%; top: 45%; width: 180vmax; height: 180vmax; margin: -90vmax 0 0 -90vmax; border-radius: 50%;
  background: repeating-conic-gradient(rgba(255,255,255,0.22) 0 10deg, transparent 10deg 20deg); animation: alma-gira 14s linear infinite; }
@keyframes alma-gira { to { transform: rotate(1turn); } }
.alma-festa canvas.confete { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.alma-festa .meio { position: relative; display: grid; justify-items: center; gap: 10px; }
.alma-festa .premio { position: relative; width: min(42vh, 280px); height: min(42vh, 280px); display: grid; place-items: center;
  animation: alma-chega 0.7s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .premio .alma-fig { width: 100%; height: 100%; filter: drop-shadow(0 8px 0 rgba(120,60,10,0.25)); }
.alma-festa .premio .figurinha { position: absolute; left: -18%; bottom: -4%; width: 44%; height: 44%; padding: 8px; box-sizing: border-box; border-radius: 18px; background: #fff;
  box-shadow: 0 0 0 4px #fff, 0 5px 0 6px rgba(150,110,60,0.3); transform: rotate(-8deg); animation: alma-chega 0.6s 0.35s cubic-bezier(.2,1.6,.4,1) both; }
@keyframes alma-chega { from { transform: scale(0.1) rotate(-20deg); opacity: 0; } }
.alma-festa .chuva { display: flex; gap: 6px; min-height: 52px; }
.alma-festa .chuva .moeda { width: 52px; height: 52px; animation: alma-chega 0.45s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .botoes { display: flex; gap: 18px; min-height: 70px; }
.alma-festa .botoes > * { animation: alma-chega 0.4s cubic-bezier(.2,1.6,.4,1) both; }
.alma-festa .nivel { position: absolute; right: 6%; top: 10%; display: grid; justify-items: center; gap: 4px; animation: alma-chega 0.6s 1.2s both; }

.alma-voo { position: fixed; z-index: 90; pointer-events: none; transition: transform 0.75s cubic-bezier(.5,-0.3,.6,1), opacity 0.75s; }

/* celular deitado (390 de altura): tudo um pouco menor, nada desce até o joystick */
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
  .alma-medalhas { margin-top: 8px; gap: 6px; }
  .alma-medalhas .m { width: 40px; height: 40px; }
  .alma-hab { padding: 4px 2px; gap: 3px; }
  .alma-hab .distintivo { width: 76px; height: 76px; }
  .alma-hab .distintivo .alma-fig { width: 46px; height: 46px; }
  .alma-estrelas .alma-svg { width: 20px; height: 20px; }
  .alma-caminho { margin-top: 6px; padding: 8px 14px 14px; }
  .alma-caminho .passo { width: 66px; height: 66px; }
  .alma-caminho .eu { width: 50px; height: 50px; }
  .alma-loja { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 10px; }
  .alma-item { min-height: 0; padding: 8px 6px; }
  .alma-item .alma-fig { width: 64px; height: 64px; }
  .alma-item .alma-fig[data-tipo='fantasia'] { height: 74px; }
  .alma-cartao { padding: 12px 16px 16px; gap: 8px; }
  .alma-oferta { padding: 10px 12px 14px; gap: 8px; }
  .alma-oferta .tarefa, .alma-oferta .premio { width: 104px; height: 104px; }
  .alma-botao { height: 54px; }
  .alma-festa .chuva .moeda { width: 40px; height: 40px; }
  .alma-festa .meio { gap: 6px; }
  .alma-festa .botoes { min-height: 60px; }
}
`;

const svgEl = (nome: string, classe = '') => {
  const s = document.createElement('span');
  s.className = `alma-svg ${classe}`.trim();
  s.innerHTML = arte(nome);
  return s;
};

const FECHAR = `<svg viewBox="0 0 24 24"><path d="M5 5 L19 19 M19 5 L5 19" stroke="#5a3a22" stroke-width="4" stroke-linecap="round"/></svg>`;

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

export function pilhaDeMoedas(n: number, classe = 'alma-moedas'): HTMLElement {
  const el = document.createElement('span');
  el.className = classe;
  el.appendChild(svgEl('moeda', 'moeda'));
  el.append(`${n}`);
  return el;
}

/** As bolinhas do progresso (até 8) ou a barra (obra). */
export function progressoEl(m: Missao, e: EstadoAlma): HTMLElement {
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
  estado(): EstadoAlma;
  mundo: MundoAlma;
  fixar(id: string): void;
  comprar(id: string): boolean;
  vestir(fantasia: string): void;
  aoAbrir(): void;
  aoFechar(): void;
}

export function criarUiAlma(a: AcoesUi) {
  const estilo = document.createElement('style');
  estilo.textContent = CSS_ALMA;
  document.head.appendChild(estilo);
  document.body.classList.add('esboco-alma');

  // ---------------------------------------------------------------- HUD
  const bau = document.createElement('button');
  bau.type = 'button';
  bau.className = 'alma-bau';
  bau.setAttribute('aria-label', 'Baú de prêmios');
  bau.setAttribute('data-alma-bau', '');
  bau.appendChild(svgEl('bau', 'bau'));
  bau.appendChild(svgEl('moeda', 'moeda'));
  const nMoedas = document.createElement('span');
  nMoedas.className = 'n';
  bau.appendChild(nMoedas);
  document.body.appendChild(bau);

  const cartao = document.createElement('button');
  cartao.type = 'button';
  cartao.className = 'alma-missao';
  cartao.setAttribute('aria-label', 'Missão');
  cartao.setAttribute('data-alma-missao', '');
  document.body.appendChild(cartao);

  let moedasMostradas = a.estado().moedas;
  function renderHud(animarMoedas = false): void {
    const e = a.estado();
    if (!animarMoedas) moedasMostradas = e.moedas;
    nMoedas.textContent = String(moedasMostradas);
    const m = missaoDoHud(e, a.mundo);
    cartao.hidden = !m;
    if (!m) return;
    cartao.dataset.missao = m.id;
    cartao.replaceChildren();
    const t = document.createElement('span');
    t.className = 'tarefa';
    t.appendChild(figuraMissao(m));
    const meio = document.createElement('span');
    meio.className = 'meio';
    meio.appendChild(progressoEl(m, e));
    cartao.append(t, meio, svgEl('seta', 'seta'), premioEl(m));
  }

  /** O número do baú sobe de uma em uma (com o tlim de cada moeda). */
  function contarMoedas(ate: number, som: (i: number) => void): Promise<void> {
    return new Promise((ok) => {
      let i = 0;
      const passo = () => {
        if (moedasMostradas >= ate) {
          ok();
          return;
        }
        moedasMostradas++;
        nMoedas.textContent = String(moedasMostradas);
        bau.classList.remove('pulou');
        void bau.offsetWidth;
        bau.classList.add('pulou');
        som(i++);
        setTimeout(passo, 140);
      };
      passo();
    });
  }

  function pulsarCartao(): void {
    cartao.classList.remove('cresceu');
    void cartao.offsetWidth;
    cartao.classList.add('cresceu');
    const nova = cartao.querySelectorAll('.alma-bolinhas .b.cheia');
    nova[nova.length - 1]?.classList.add('agora');
  }

  // ---------------------------------------------------------------- fundo dos painéis
  const fundo = document.createElement('div');
  fundo.className = 'alma-fundo';
  fundo.hidden = true;
  fundo.addEventListener('click', (ev) => {
    if (ev.target === fundo) fechar();
  });
  document.body.appendChild(fundo);
  let aberto: 'quadro' | 'album' | 'habilidades' | 'loja' | null = null;

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
    if (fundo.hidden) return;
    fundo.hidden = true;
    fundo.replaceChildren();
    aberto = null;
    if (document.body.dataset.overlay === 'alma') delete document.body.dataset.overlay;
    a.aoFechar();
  }

  // ---------------------------------------------------------------- quadro de missões
  function quadro(): void {
    aberto = 'quadro';
    const e = a.estado();
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

  /** Um cartão de missão: o que fazer → o prêmio; quantas vezes; o botão de brincar. */
  function oferta(m: Missao, fixada: boolean): HTMLElement {
    const e = a.estado();
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
    c.appendChild(progressoEl(m, e));
    const jogar = document.createElement('button');
    jogar.type = 'button';
    jogar.className = `alma-botao${fixada ? '' : ' chama'}`;
    jogar.setAttribute('aria-label', 'Brincar');
    jogar.setAttribute('data-alma-jogar', m.id);
    jogar.appendChild(svgEl('play'));
    jogar.addEventListener('click', () => {
      tocarSomInterface('criar');
      a.fixar(m.id);
      // o cartão "voa" para o canto do HUD
      const de = c.getBoundingClientRect();
      fechar();
      renderHud();
      voar(c, de, cartao.getBoundingClientRect());
    });
    c.appendChild(jogar);
    return c;
  }

  // ---------------------------------------------------------------- o baú (3 abas)
  function bauAberto(aba: 'album' | 'habilidades' | 'loja', habSel?: string): void {
    aberto = aba;
    const painel = document.createElement('div');
    painel.className = 'alma-painel';
    painel.setAttribute('data-alma-painel', aba);
    const cab = document.createElement('div');
    cab.className = 'alma-cabeca';
    for (const [id, desenho, rotulo] of [
      ['album', 'album', 'Álbum'],
      ['habilidades', 'medalha', 'Habilidades'],
      ['loja', 'loja', 'Lojinha'],
    ] as const) {
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
        bauAberto(id);
      });
      cab.appendChild(b);
    }
    const esp = document.createElement('span');
    esp.className = 'espaco';
    const saldo = pilhaDeMoedas(a.estado().moedas, 'alma-saldo');
    saldo.setAttribute('data-alma-saldo', '');
    cab.append(esp, saldo, botaoFechar(fechar));
    const corpo = document.createElement('div');
    corpo.className = 'alma-corpo';
    if (aba === 'album') corpo.appendChild(album());
    else if (aba === 'habilidades') corpo.appendChild(habilidades(habSel));
    else corpo.appendChild(loja());
    painel.append(cab, corpo);
    abrirFundo(painel);
  }

  function album(): HTMLElement {
    const e = a.estado();
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
        anel.style.borderRadius = '50%';
        slot.appendChild(anel);
        slot.appendChild(svgEl('play', 'jogar'));
      }
      if (!feita) {
        const mc = pilhaDeMoedas(m.moedas, 'alma-moedas moedas-canto');
        slot.appendChild(mc);
      }
      slot.addEventListener('click', () => {
        tocarSomInterface('toc');
        if (aberta) quadro();
      });
      grade.appendChild(slot);
    });
    const lado = document.createElement('div');
    const grandes = document.createElement('div');
    grandes.className = 'alma-grandes';
    for (const m of missoesDoMundo(a.mundo).filter((x) => x.fantasia)) {
      const g = document.createElement('div');
      const tem = e.fantasias.includes(m.fantasia!);
      g.className = `alma-grande${tem ? '' : ' futura'}`;
      g.dataset.fantasia = m.fantasia;
      g.appendChild(figura(`fantasia:${m.fantasia}`));
      if (!tem) {
        g.appendChild(svgEl('cadeado', 'cad'));
        // de onde vem: a figurinha da missão que dá
        const q = document.createElement('span');
        q.className = 'quando';
        q.appendChild(figura(desenhoDaFigurinha(m)));
        g.appendChild(q);
      }
      grandes.appendChild(g);
    }
    const med = document.createElement('div');
    med.className = 'alma-medalhas';
    for (const h of HABILIDADES[a.mundo]) {
      const n = nivelDaHabilidade(e, a.mundo, h.id).nivel;
      const m = document.createElement('span');
      m.className = `m${n >= 3 ? ' ouro' : ''}`;
      m.appendChild(figura(h.desenho));
      med.appendChild(m);
    }
    lado.append(grandes, med);
    caixa.append(grade, lado);
    return caixa;
  }

  function figuraDoLibera(libera: string, h: Habilidade): string {
    if (libera === MEDALHA) return 'medalha';
    const item = lojaDoMundo(a.mundo).find((i) => i.id === libera);
    return item?.desenho ?? h.desenho;
  }

  function habilidades(sel?: string): HTMLElement {
    const e = a.estado();
    const caixa = document.createElement('div');
    const linha = document.createElement('div');
    linha.className = 'alma-habs';
    const lista = HABILIDADES[a.mundo];
    const atual = lista.find((h) => h.id === sel) ?? lista[0];
    for (const h of lista) {
      const { nivel, fracao } = nivelDaHabilidade(e, a.mundo, h.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'alma-hab';
      b.setAttribute('aria-pressed', String(h === atual));
      b.setAttribute('aria-label', h.nome);
      b.dataset.hab = h.id;
      const d = document.createElement('span');
      d.className = 'distintivo';
      d.style.setProperty('--cor', h.cor);
      d.style.setProperty('--f', String(nivel >= 3 ? 1 : fracao));
      d.appendChild(figura(h.desenho));
      if (nivel >= 3) d.appendChild(svgEl('estrela', 'coroa'));
      const est = document.createElement('span');
      est.className = 'alma-estrelas';
      for (let i = 0; i < 3; i++) est.appendChild(svgEl(i < nivel ? 'estrela' : 'estrelaVazia'));
      b.append(d, est);
      b.addEventListener('click', () => {
        tocarSomInterface('toc');
        bauAberto('habilidades', h.id);
      });
      linha.appendChild(b);
    }
    // o caminho da habilidade escolhida: eu → nível 1 → nível 2 → medalha
    const { nivel, fracao } = nivelDaHabilidade(e, a.mundo, atual.id);
    const cam = document.createElement('div');
    cam.className = 'alma-caminho';
    cam.style.setProperty('--cor', atual.cor);
    cam.setAttribute('data-alma-caminho', atual.id);
    const eu = figura(atual.desenho, 'eu');
    cam.appendChild(eu);
    atual.niveis.forEach((n, i) => {
      const tr = document.createElement('span');
      tr.className = 'trilha';
      const f = nivel > i ? 1 : nivel === i ? fracao : 0;
      tr.innerHTML = `<i style="width:${f * 100}%"></i>`;
      const p = document.createElement('span');
      p.className = `passo ${nivel > i ? 'ja' : 'longe'}`;
      p.appendChild(figura(figuraDoLibera(n.libera, atual)));
      if (nivel <= i) p.appendChild(svgEl('cadeado', 'cad'));
      const nv = document.createElement('span');
      nv.className = 'nivel';
      for (let k = 0; k <= i; k++) nv.appendChild(svgEl('estrela'));
      p.appendChild(nv);
      cam.append(tr, p);
    });
    caixa.append(linha, cam);
    return caixa;
  }

  function loja(): HTMLElement {
    const e = a.estado();
    const grade = document.createElement('div');
    grade.className = 'alma-loja';
    const itens = lojaDoMundo(a.mundo).sort((x, y) => Number(!!x.presente) - Number(!!y.presente) || x.preco - y.preco);
    for (const it of itens) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.item = it.id;
      b.setAttribute('aria-label', it.nome);
      const lib = liberado(e, a.mundo, it);
      const meu = e.meus.includes(it.id) && (it.tipo === 'fantasia' || it.tipo === 'bicho' || !!it.presente);
      const pode = lib && !meu && !it.presente && e.moedas >= it.preco;
      b.className = `alma-item${!lib ? ' trancado' : meu ? ' meu' : pode ? ' pode' : ''}`;
      b.appendChild(figura(it.desenho));
      if (it.qtd && lib) {
        const q = document.createElement('span');
        q.className = 'qtd';
        q.textContent = `×${it.qtd}`;
        b.appendChild(q);
      }
      const pe = document.createElement('span');
      pe.style.display = 'grid';
      pe.style.justifyItems = 'center';
      pe.style.gap = '4px';
      pe.style.width = '100%';
      if (it.presente) {
        pe.appendChild(svgEl('coracao', 'presente'));
      } else {
        const preco = document.createElement('span');
        preco.className = 'preco';
        preco.appendChild(svgEl('moeda', 'moeda'));
        preco.append(String(it.preco));
        pe.appendChild(preco);
        if (lib && !meu) {
          const pote = document.createElement('span');
          pote.className = 'pote';
          pote.innerHTML = `<i style="width:${Math.min(1, e.moedas / it.preco) * 100}%"></i>`;
          pe.appendChild(pote);
        }
      }
      b.appendChild(pe);
      if (meu) b.appendChild(svgEl('ok', 'marca'));
      if (!lib && it.precisa) {
        const h = HABILIDADES[a.mundo].find((x) => x.id === it.precisa!.habilidade)!;
        const { nivel, fracao } = nivelDaHabilidade(e, a.mundo, h.id);
        const quem = document.createElement('span');
        quem.className = 'quem';
        quem.style.setProperty('--cor', h.cor);
        quem.style.setProperty('--f', String(nivel >= it.precisa.nivel - 1 ? fracao : 0));
        quem.appendChild(figura(h.desenho));
        b.appendChild(quem);
        b.appendChild(svgEl('cadeado', 'cad'));
      }
      b.addEventListener('click', () => {
        tocarSomInterface('toc');
        if (!lib && it.precisa) bauAberto('habilidades', it.precisa.habilidade);
        else if (pode) confirmar(it);
        else if (meu && it.tipo === 'fantasia') a.vestir(it.desenho.slice(9));
        else balancar(b);
      });
      grade.appendChild(b);
    }
    return grade;
  }

  function balancar(el: HTMLElement): void {
    el.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      { duration: 280 },
    );
  }

  /** Confirmar a compra: a figura grande, o preço, e os dois botões (sim e não). */
  function confirmar(it: ItemLoja): void {
    const c = document.createElement('div');
    c.className = 'alma-cartao';
    c.setAttribute('data-alma-confirmar', it.id);
    const fig = figura(it.desenho);
    fig.style.width = '150px';
    fig.style.height = '150px';
    const preco = pilhaDeMoedas(it.preco, 'alma-saldo');
    const linha = document.createElement('div');
    linha.style.display = 'flex';
    linha.style.gap = '18px';
    const nao = document.createElement('button');
    nao.type = 'button';
    nao.className = 'alma-botao azul';
    nao.setAttribute('aria-label', 'Agora não');
    nao.setAttribute('data-alma-nao', '');
    nao.innerHTML = `<span class="alma-svg">${FECHAR.replace('#5a3a22', '#fff')}</span>`;
    nao.addEventListener('click', () => bauAberto('loja'));
    const sim = document.createElement('button');
    sim.type = 'button';
    sim.className = 'alma-botao chama';
    sim.setAttribute('aria-label', 'Comprar');
    sim.setAttribute('data-alma-sim', '');
    sim.appendChild(svgEl('ok'));
    sim.addEventListener('click', () => {
      if (!a.comprar(it.id)) return;
      const de = fig.getBoundingClientRect();
      bauAberto('loja');
      const alvo = document.querySelector<HTMLElement>(`.alma-item[data-item='${it.id}']`);
      // as moedas voam do saldo para o item, e o item ganha o "é seu"
      const saldo = document.querySelector<HTMLElement>('[data-alma-saldo]');
      if (saldo && alvo) for (let i = 0; i < Math.min(it.preco, 6); i++) setTimeout(() => voar(svgEl('moeda'), saldo.getBoundingClientRect(), alvo.getBoundingClientRect(), 40), i * 90);
      void de;
      tocarSomInterface('conquista');
      alvo?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 500, delay: 500 });
    });
    linha.append(nao, sim);
    c.append(fig, preco, linha);
    abrirFundo(c);
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
    contarMoedas,
    quadro,
    abrir: (aba: 'album' | 'habilidades' | 'loja', hab?: string) => bauAberto(aba, hab),
    fechar,
    get aberto() {
      return aberto;
    },
    bau,
    cartao,
    voar,
    svgEl,
  };
}
export type UiAlma = ReturnType<typeof criarUiAlma>;

