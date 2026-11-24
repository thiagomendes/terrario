/**
 * Spec 023 (T14): a lojinha premium. Abre pela roda do menu, de qualquer mundo, e tem a cara
 * dela: uma vitrine de veludo azul-noite, com cortinas, holofotes e estrelas piscando.
 *
 * - **Vitrine:** seis cartões de vidro com borda de ouro; o item de verdade (desenhado do 3D)
 *   flutua sobre um pedestal dourado, com um brilho que passa; o preço numa fita dourada. O que
 *   já é da criança mostra o visto verde; o que está vestido, o anel azul aceso.
 * - **Detalhe:** o item grande sob o holofote, o preço e os botões experimentar (espelho) e
 *   comprar; o que já é dela tem vestir e tirar.
 * - **Provador:** a vitrine some, a criança aparece no mundo vestindo o item (só na tela dela:
 *   nada vai pela rede) e a câmera gira devagar em volta. O bichinho aparece ao lado.
 * - **Confirmar:** sempre, com os dois botões grandes (✗ e ✓). **Festa:** o item sobe no
 *   pedestal (a festa premium da fila); ao fechar, a criança já está vestindo, com um puf.
 * - **Falta moedinha:** sem pressa e sem bronca: o potinho mostra quanto já tem, e o botão
 *   verde de brincar volta ao jogo. Nada some da vitrine, nada acaba, preço sempre o mesmo.
 * - **Um lugar de cada vez:** o que vai sair do boneco ao vestir (a mesma categoria, ou a capa e
 *   as asas do dragão, que dividem as costas) aparece às claras: a figurinha do que sai, a seta
 *   e o que entra.
 */
import {
  PREMIUM,
  premiumPorId,
  saiAoVestir,
  type CategoriaPremium,
  type ItemPremium,
} from '../../jogo/alma';
import type { Aparencia, PremiumVestido as PremiumVestidos } from '../../personagem/aparencia';
import { oQueSai, type Saida } from '../../personagem/tesouroEFantasia';
import { ABAS_LOJA, criarNovidadesLoja, type NovidadesLoja } from './lojaNovidades';
import { tocarSomInterface } from '../../audio/somInterface';
import type { PerfilCrianca } from '../../personagem/almaCrianca';
import { arte } from './arte';
import { CAMISETA } from './festa';
import { OVERLAY_FESTA, type FestasAlma } from './festas';
import { figura, fotoPremium } from './figuras';
import { FECHAR_SVG, botao, botaoFechar, pilhaDeMoedas, svgEl, type HudAlma } from './hud';

const ESPELHO = `<svg viewBox="0 0 64 64"><ellipse cx="32" cy="27" rx="17" ry="21" fill="#bfe3ff" stroke="#fff" stroke-width="5"/><path d="M23 19 Q26 12 33 11" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M32 48 V58 M22 59 H42" stroke="#fff" stroke-width="5" stroke-linecap="round"/></svg>`;
const VOLTAR = `<svg viewBox="0 0 64 64"><path d="M40 12 L20 32 L40 52" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const TIRAR = `<svg viewBox="0 0 64 64"><path d="M22 8 L32 14 L42 8 L58 18 L52 30 L46 27 L46 58 L18 58 L18 27 L12 30 L6 18 Z" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M12 12 L52 54" stroke="#fff" stroke-width="6" stroke-linecap="round"/></svg>`;
const NAO = FECHAR_SVG.replace('#5a3a22', '#fff');
/** A seta da troca (o que sai → o que entra). */
const TROCA = `<svg viewBox="0 0 64 64"><path d="M10 32 H46 M34 18 L50 32 L34 46" fill="none" stroke="#ffe27a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
/** Spec 036 (T06): a estrelinha de "novo" (só desenho, sem palavra). */
const NOVO = `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 L40 23 L60 24 L44 37 L50 58 L32 46 L14 58 L20 37 L4 24 L24 23 Z" fill="#ffe14d" stroke="#b86e00" stroke-width="4" stroke-linejoin="round"/><path d="M27 20 L31 13" stroke="#fff8c8" stroke-width="4" stroke-linecap="round"/></svg>`;
/** Spec 036 (T06): o desenho de cada aba da vitrine (o lugar do corpo; nenhuma palavra). */
const ICONE_ABA: Record<CategoriaPremium, string> = {
  andar: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M42 10 L46 48" stroke="#3b2a1e" stroke-width="5" stroke-linecap="round"/><path d="M34 11 H50" stroke="#7b5cff" stroke-width="7" stroke-linecap="round"/><rect x="10" y="42" width="38" height="8" rx="4" fill="#7b5cff" stroke="#3b2a1e" stroke-width="3"/><circle cx="16" cy="54" r="6" fill="#3ee0c8" stroke="#3b2a1e" stroke-width="3"/><circle cx="46" cy="54" r="6" fill="#3ee0c8" stroke="#3b2a1e" stroke-width="3"/></svg>`,
  roupa: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M22 8 L32 14 L42 8 L58 18 L52 30 L46 27 L46 58 L18 58 L18 27 L12 30 L6 18 Z" fill="#5cb8ff" stroke="#3b2a1e" stroke-width="3.5" stroke-linejoin="round"/><circle cx="26" cy="36" r="4" fill="#fff"/><circle cx="38" cy="44" r="3" fill="#fff"/></svg>`,
  costas: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 8 H44 L54 56 Q32 50 10 56 Z" fill="#e8463c" stroke="#3b2a1e" stroke-width="3.5" stroke-linejoin="round"/><path d="M22 8 Q32 16 42 8" fill="none" stroke="#ffd45a" stroke-width="4" stroke-linecap="round"/><path d="M32 30 L35 36 L41 36 L36 40 L38 46 L32 42 L26 46 L28 40 L23 36 L29 36 Z" fill="#ffd45a"/></svg>`,
  mao: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 56 L40 24" stroke="#3b2a1e" stroke-width="9" stroke-linecap="round"/><path d="M18 56 L40 24" stroke="#2fc7d8" stroke-width="4.5" stroke-linecap="round"/><path d="M44 6 L48 15 L58 16 L50 22 L53 32 L44 26 L35 32 L38 22 L30 16 L40 15 Z" fill="#ffe14d" stroke="#3b2a1e" stroke-width="3" stroke-linejoin="round"/></svg>`,
  chapeu: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 42 Q10 18 32 18 Q54 18 54 42 Z" fill="#ffcf3a" stroke="#3b2a1e" stroke-width="3.5" stroke-linejoin="round"/><path d="M8 42 H60 Q60 50 50 50 H8 Z" fill="#e8463c" stroke="#3b2a1e" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 18 V8 M22 8 H42" stroke="#3b2a1e" stroke-width="4" stroke-linecap="round"/></svg>`,
  bicho: `<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="42" rx="14" ry="12" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="3.5"/><circle cx="14" cy="26" r="6" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="3"/><circle cx="25" cy="15" r="6" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="3"/><circle cx="39" cy="15" r="6" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="3"/><circle cx="50" cy="26" r="6" fill="#ff8fb3" stroke="#3b2a1e" stroke-width="3"/></svg>`,
  fantasia: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M6 24 Q32 14 58 24 Q58 46 40 46 Q34 46 32 40 Q30 46 24 46 Q6 46 6 24 Z" fill="#b48cff" stroke="#3b2a1e" stroke-width="3.5" stroke-linejoin="round"/><ellipse cx="20" cy="31" rx="6" ry="5" fill="#2a1f78"/><ellipse cx="44" cy="31" rx="6" ry="5" fill="#2a1f78"/></svg>`,
};

export const CSS_LOJA = `
/* as fotos do 3D cabem na caixa delas (o canvas não empurra o cartão) */
.alma-fig[data-tipo='premium'] { position: relative; display: block; }
.alma-fig[data-tipo='premium'] canvas { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
/* na vitrine e no palco, o item fica de pé no pedestal */
.alma-lcard .arte canvas, .alma-palco .arte canvas { object-position: 50% 100%; }
/* ---------------- a lojinha premium: vitrine de veludo ---------------- */
.alma-loja { position: fixed; inset: 0; z-index: 62; display: grid; grid-template-rows: auto minmax(0, 1fr); overflow: hidden; box-sizing: border-box;
  padding: max(12px, env(safe-area-inset-top)) max(18px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(18px, env(safe-area-inset-left));
  color: #fff; -webkit-tap-highlight-color: transparent;
  background:
    radial-gradient(ellipse 55% 40% at 50% 0%, rgba(255, 228, 150, 0.22), transparent 70%),
    radial-gradient(ellipse 80% 40% at 50% 112%, rgba(255, 120, 210, 0.16), transparent 70%),
    repeating-linear-gradient(118deg, rgba(255,255,255,0.022) 0 2px, transparent 2px 6px),
    radial-gradient(ellipse at 50% 32%, #4d3cb4 0%, #2b1f78 44%, #130c3a 100%);
  animation: alma-loja-entra 0.35s ease-out both; }
@keyframes alma-loja-entra { from { opacity: 0; transform: scale(1.03); } }
.alma-loja .cortina { position: absolute; top: 0; bottom: 0; width: clamp(16px, 5.5vw, 84px); pointer-events: none; z-index: 0;
  background: linear-gradient(90deg, rgba(0,0,0,0.25), transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%, rgba(0,0,0,0.3)),
    repeating-linear-gradient(90deg, #5c1544 0 6px, #8a2a66 11px, #6a1a4e 16px, #4a0f36 22px);
  box-shadow: 0 0 30px rgba(0,0,0,0.5); }
.alma-loja .cortina.e { left: 0; border-bottom-right-radius: 100% 55%; }
.alma-loja .cortina.d { right: 0; border-bottom-left-radius: 100% 55%; }
.alma-loja .cortina::after { content: ''; position: absolute; top: 56%; left: 0; right: 0; height: 12px; border-radius: 6px;
  background: linear-gradient(#fff1b0, #e6b23e 50%, #a8741a); box-shadow: 0 3px 6px rgba(0,0,0,0.4); }
.alma-loja .sanefa { position: absolute; left: 0; right: 0; top: 0; height: 24px; z-index: 1; pointer-events: none;
  background: linear-gradient(#7a1f5a, #5a1442); box-shadow: 0 4px 10px rgba(0,0,0,0.4);
  -webkit-mask: radial-gradient(circle 15px at 15px 100%, transparent 98%, #000) 0 0 / 30px 100% repeat-x;
  mask: radial-gradient(circle 15px at 15px 100%, transparent 98%, #000) 0 0 / 30px 100% repeat-x; }
.alma-loja .sanefa::after { content: ''; position: absolute; left: 0; right: 0; top: 6px; height: 3px; background: #e6b23e; }
.alma-loja .feixe { position: absolute; top: -8%; width: 38vw; height: 125%; pointer-events: none; opacity: 0.55; z-index: 0;
  background: linear-gradient(180deg, rgba(255,236,170,0.30), rgba(255,236,170,0) 72%); clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%);
  animation: alma-feixe 7s ease-in-out infinite alternate; transform-origin: 50% 0; }
.alma-loja .feixe.e { left: 6%; --g: 13deg; transform: rotate(var(--g)); }
.alma-loja .feixe.d { right: 6%; --g: -13deg; transform: rotate(var(--g)); animation-delay: -3.5s; }
@keyframes alma-feixe { to { transform: rotate(calc(var(--g) * 0.55)); } }
.alma-loja .ceu { position: absolute; inset: 0; pointer-events: none; z-index: 0; }
.alma-loja .ceu i { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #fff; box-shadow: 0 0 6px #fff; animation: alma-pisca 2.6s ease-in-out infinite; }
.alma-loja .ceu i.g { width: 5px; height: 5px; background: #ffe9a8; box-shadow: 0 0 10px #ffd96a; }
.alma-loja .topo { position: relative; z-index: 2; display: flex; align-items: center; gap: 12px; padding: 14px 4px 8px; }
.alma-loja .placa { display: flex; align-items: center; gap: 8px; padding: 6px 18px 6px 8px; border-radius: 999px;
  background: linear-gradient(#fff1b8, #e9b949 55%, #c98f22); box-shadow: 0 4px 0 #8a5a14, 0 0 22px rgba(255, 210, 110, 0.45), inset 0 2px 0 #fff8d8; }
.alma-loja .placa > .alma-svg { width: 46px; height: 46px; }
.alma-loja .placa .coroa { display: flex; gap: 2px; }
.alma-loja .placa .coroa .alma-svg { width: 20px; height: 20px; animation: alma-pisca-ouro 2.4s ease-in-out infinite; }
.alma-loja .placa .coroa .alma-svg:nth-child(2) { width: 26px; height: 26px; animation-delay: 0.8s; }
.alma-loja .placa .coroa .alma-svg:nth-child(3) { animation-delay: 1.6s; }
@keyframes alma-pisca-ouro { 50% { transform: scale(0.82) rotate(12deg); filter: brightness(1.25); } }
.alma-loja .espaco { flex: 1; }
.alma-loja .alma-saldo, .alma-provador .alma-saldo, .alma-lconf .alma-saldo { background: #241a5e; color: #ffe27a; box-shadow: inset 0 0 0 3px #e6b23e, 0 0 16px rgba(255, 210, 110, 0.25); }
.alma-loja .alma-fechar, .alma-provador .alma-fechar { background: #3a2c8e; box-shadow: 0 4px 0 #140e44, inset 0 2px 0 rgba(255,255,255,0.3), 0 0 0 3px #e6b23e; }
.alma-loja .alma-fechar svg path { stroke: #fff; }

/* spec 036 (T06): as abas por lugar do corpo (só o desenho), no topo; em pé, numa linha própria */
.alma-loja .topo { flex-wrap: wrap; row-gap: 8px; }
.alma-abas { display: flex; align-items: center; gap: 8px; }
.alma-aba { position: relative; width: 56px; height: 56px; padding: 8px; border: 0; border-radius: 50%; cursor: pointer; box-sizing: border-box; display: grid; place-items: center;
  background: radial-gradient(circle at 50% 35%, #fffaf0, #f3e3bf 70%, #dcc28a); box-shadow: 0 4px 0 #120c36, 0 0 0 3px #a8741a; transition: transform 0.15s;
  -webkit-tap-highlight-color: transparent; }
.alma-aba svg { width: 100%; height: 100%; display: block; pointer-events: none; }
.alma-aba:active { transform: scale(0.93); }
.alma-aba:focus-visible { outline: 3px solid #7fe0ff; outline-offset: 4px; }
.alma-aba[aria-selected='true'] { transform: translateY(-3px) scale(1.12); box-shadow: 0 5px 0 #120c36, 0 0 0 4px #7fe0ff, 0 0 22px 6px rgba(127, 224, 255, 0.55); }
.alma-aba .alma-novo { width: 24px; height: 24px; top: -7px; right: -7px; }
/* a estrelinha de novo (até ela abrir o detalhe do item uma vez) */
.alma-novo { position: absolute; z-index: 3; top: -14px; right: -12px; width: 44px; height: 44px; pointer-events: none;
  filter: drop-shadow(0 3px 0 rgba(90, 50, 0, 0.45)) drop-shadow(0 0 8px rgba(255, 230, 120, 0.8)); animation: alma-novo 1.8s ease-in-out infinite; }
.alma-novo svg { width: 100%; height: 100%; display: block; }
@keyframes alma-novo { 50% { transform: scale(0.86) rotate(10deg); } }
/* a prateleira da aba: 4 numa fileira no computador e no celular deitado, 2 × 2 em pé; o que
   não couber rola dentro da prateleira (a página não rola) */
.alma-prateleira { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, minmax(0, 236px)); justify-content: center; align-content: center;
  gap: clamp(14px, 3.2vh, 28px) clamp(16px, 2.4vw, 30px); padding: 18px clamp(18px, 6vw, 96px) 14px; min-height: 0; --h: clamp(176px, 33vh, 262px);
  overflow-x: hidden; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: none; }
.alma-prateleira::-webkit-scrollbar { display: none; }
.alma-lcard { position: relative; height: var(--h); border: 0; padding: 0; cursor: pointer; border-radius: 26px; overflow: visible; display: block;
  background: linear-gradient(180deg, rgba(255,255,255,0.13), rgba(255,255,255,0.02) 38%, rgba(0,0,0,0.12)),
    radial-gradient(ellipse at 50% 30%, #6e56e0 0%, #3b2b9e 58%, #231870 100%);
  box-shadow: 0 0 0 3px #e9b949, 0 0 0 6px rgba(255, 226, 140, 0.2), inset 0 0 0 1px rgba(255,255,255,0.18), inset 0 -20px 30px rgba(10, 5, 40, 0.35), 0 10px 0 2px #120c36, 0 18px 26px rgba(0,0,0,0.45);
  transition: transform 0.15s; -webkit-tap-highlight-color: transparent; animation: alma-lcard-entra 0.5s cubic-bezier(.2,1.4,.4,1) both; animation-delay: var(--e, 0s); }
@keyframes alma-lcard-entra { from { opacity: 0; transform: translateY(18px) scale(0.92); } }
.alma-lcard:active { transform: scale(0.96); }
.alma-lcard:focus-visible { outline: 3px solid #7fe0ff; outline-offset: 5px; }
.alma-lcard .vidro { position: absolute; inset: 0; border-radius: 26px; overflow: hidden; pointer-events: none; }
.alma-lcard .vidro::before { content: ''; position: absolute; left: 8%; top: 5%; width: 26%; height: 50%; border-radius: 40%; transform: rotate(18deg);
  background: linear-gradient(180deg, rgba(255,255,255,0.20), rgba(255,255,255,0)); }
.alma-lcard .vidro::after { content: ''; position: absolute; top: -20%; bottom: -20%; width: 28%; left: -45%; transform: skewX(-18deg);
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent); animation: alma-lvarre 6s ease-in-out infinite; animation-delay: var(--d, 0s); }
@keyframes alma-lvarre { 0%, 62% { left: -45%; } 100% { left: 135%; } }
.alma-lcard .palquinho { position: absolute; left: 0; right: 0; top: 4%; bottom: 25%; display: grid; place-items: end center; }
.alma-lcard .pedestal { position: absolute; left: 50%; bottom: 0; width: 64%; height: 16%; max-height: 22px; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(ellipse at 50% 35%, #fff4c2, #e9b949 55%, #a8741a 100%); box-shadow: 0 5px 0 #7a5214, 0 0 26px 6px rgba(255, 214, 120, 0.35); }
.alma-lcard .arte { position: absolute; left: 6%; right: 6%; top: 0; bottom: 7%; display: grid; place-items: center; animation: alma-flutuar 3.4s ease-in-out infinite; animation-delay: var(--f, 0s); }
.alma-lcard .arte .alma-fig { width: 100%; height: 100%; filter: drop-shadow(0 7px 0 rgba(10,5,40,0.32)) drop-shadow(0 0 14px rgba(255,230,160,0.35)); }
.alma-lcard .pe { position: absolute; left: 0; right: 0; bottom: 6%; display: grid; justify-items: center; gap: 5px; }
.alma-fita { display: inline-flex; align-items: center; gap: 4px; padding: 3px 20px 3px 14px; font: 900 1.35rem var(--display); color: #6a3e00; white-space: nowrap;
  background: linear-gradient(#fff4c2, #ffd76a 55%, #e6a92a); filter: drop-shadow(0 3px 0 #8a5a14);
  clip-path: polygon(0 0, 100% 0, calc(100% - 11px) 50%, 100% 100%, 0 100%, 11px 50%); }
.alma-fita .moeda { width: 28px; height: 28px; }
.alma-lcard .pote { width: 62%; height: 8px; border-radius: 4px; background: rgba(255,255,255,0.16); overflow: hidden; box-shadow: inset 0 1px 0 rgba(0,0,0,0.3); }
.alma-lcard .pote i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, #ffe27a, #ffb21a); }
.alma-lcard.pode { box-shadow: 0 0 0 3px #e9b949, 0 0 0 7px rgba(120, 230, 120, 0.55), 0 0 26px 8px rgba(120, 230, 120, 0.35), inset 0 -20px 30px rgba(10, 5, 40, 0.35), 0 10px 0 2px #120c36, 0 18px 26px rgba(0,0,0,0.45); }
.alma-lcard.vestido { box-shadow: 0 0 0 4px #7fe0ff, 0 0 30px 8px rgba(127, 224, 255, 0.5), inset 0 -20px 30px rgba(10, 5, 40, 0.35), 0 10px 0 2px #120c36; }
.alma-selo { position: absolute; z-index: 2; width: 44px; height: 44px; border-radius: 50%; padding: 8px; box-sizing: border-box; display: grid; place-items: center; }
.alma-selo.meu { right: -10px; top: -10px; background: linear-gradient(#a6e88a, #4cae3f); box-shadow: 0 3px 0 #2f7a2a, 0 0 0 3px #fff; }
.alma-selo.no-boneco { left: -10px; top: -10px; padding: 7px; background: linear-gradient(#bff0ff, #39b8e8); box-shadow: 0 3px 0 #1d7aa8, 0 0 0 3px #fff; }
.alma-lcard .pe .alma-selo.meu { position: static; width: 46px; height: 46px; }

/* o detalhe (e o confirmar): por cima da vitrine */
.alma-ldet { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; padding: 12px; box-sizing: border-box; background: rgba(8, 4, 30, 0.62); animation: alma-fundo-entra 0.2s ease-out both; }
.alma-ldet[hidden] { display: none; }
.alma-ldet .caixa { position: relative; display: grid; grid-template-columns: auto auto; align-items: center; gap: clamp(14px, 3vw, 34px); padding: 18px clamp(18px, 3vw, 34px) 22px;
  border-radius: 32px; max-height: 100%; box-sizing: border-box;
  background: repeating-linear-gradient(118deg, rgba(255,255,255,0.02) 0 2px, transparent 2px 6px), radial-gradient(ellipse at 30% 25%, #5b47cc, #2a1f7a 72%);
  box-shadow: 0 0 0 4px #e6b23e, 0 0 0 9px rgba(255, 226, 140, 0.18), 0 14px 0 4px #0e0a2a, 0 26px 44px rgba(0,0,0,0.55);
  animation: alma-cartao-entra 0.35s cubic-bezier(.2,1.4,.4,1) both; }
.alma-ldet .caixa > .alma-fechar { position: absolute; top: -14px; right: -14px; z-index: 3; }
.alma-ldet .caixa > .alma-fechar svg path { stroke: #fff; }
.alma-palco { position: relative; width: clamp(200px, 40vh, 300px); height: clamp(220px, 46vh, 330px); display: grid; place-items: center; }
.alma-palco .luz { position: absolute; left: 50%; top: -18px; width: 120%; height: 100%; transform: translateX(-50%); pointer-events: none;
  background: linear-gradient(180deg, rgba(255,240,190,0.38), rgba(255,240,190,0.04) 85%); clip-path: polygon(40% 0, 60% 0, 100% 100%, 0 100%); }
.alma-palco .pedestal { position: absolute; left: 50%; bottom: 6%; width: 78%; height: 13%; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(ellipse at 50% 35%, #fff4c2, #e9b949 55%, #a8741a); box-shadow: 0 9px 0 #7a5214, 0 0 40px 10px rgba(255, 214, 120, 0.35); }
.alma-palco .arte { position: absolute; left: 4%; right: 4%; top: 2%; bottom: 13%; display: grid; place-items: center; animation: alma-flutuar 3s ease-in-out infinite; }
.alma-palco .arte .alma-fig { width: 100%; height: 100%; filter: drop-shadow(0 10px 0 rgba(10,5,40,0.32)) drop-shadow(0 0 24px rgba(255,230,160,0.5)); }
.alma-palco .faisca { position: absolute; width: 18px; height: 18px; pointer-events: none; animation: alma-pisca-ouro 1.8s ease-in-out infinite; }
.alma-ldet .lado { display: grid; justify-items: center; gap: 14px; }
.alma-ldet .lado .alma-saldo { font-size: 2rem; padding: 4px 18px 4px 8px; }
.alma-ldet .lado .alma-saldo .moeda { width: 42px; height: 42px; }
.alma-ldet .botoes { display: flex; gap: 14px; flex-wrap: wrap; justify-content: center; }
.alma-ldet .alma-selo.meu { position: static; width: 70px; height: 70px; padding: 13px; }
.alma-botao.ouro .alma-svg svg path { stroke: #4a7a10; }
.alma-botao.ouro.chama { box-shadow: 0 6px 0 #a8741a, 0 0 22px 4px rgba(255, 214, 110, 0.55), inset 0 2px 0 #fff; }
/* falta moedinha: o potinho e o brincar (sem pressa) */
.alma-falta { display: grid; justify-items: center; gap: 10px; }
.alma-falta .trilho { display: flex; align-items: center; gap: 8px; }
.alma-falta .trilho > .alma-svg { width: 46px; height: 46px; flex: none; }
.alma-falta .enche { width: clamp(120px, 22vw, 200px); height: 18px; border-radius: 9px; background: rgba(255,255,255,0.16); overflow: hidden; box-shadow: inset 0 2px 0 rgba(0,0,0,0.3), 0 0 0 2px rgba(255, 226, 140, 0.5); }
.alma-falta .enche i { display: block; height: 100%; border-radius: 9px; background: linear-gradient(90deg, #ffe27a, #ffb21a); box-shadow: 0 0 12px rgba(255, 210, 90, 0.7); }
.alma-falta .alma-fita { font-size: 1.1rem; }
.alma-falta .alma-fita .moeda { width: 22px; height: 22px; }
/* a troca: o que sai do boneco → o que entra (um lugar de cada vez) */
.alma-troca { display: flex; align-items: center; gap: 6px; padding: 4px 12px 4px 4px; border-radius: 999px; background: rgba(10, 6, 40, 0.55); box-shadow: inset 0 0 0 2px rgba(255, 226, 140, 0.45); }
.alma-troca .sai, .alma-troca .entra { width: 50px; height: 50px; border-radius: 50%; display: grid; place-items: center; overflow: hidden; background: radial-gradient(#5a46c8, #2a1f78); }
.alma-troca .sai { filter: saturate(0.5) brightness(0.85); box-shadow: 0 0 0 2px rgba(255,255,255,0.4); }
.alma-troca .entra { box-shadow: 0 0 0 3px #7fe0ff; }
.alma-troca .alma-fig { width: 90%; height: 90%; }
.alma-troca > .alma-svg { width: 28px; height: 28px; }
/* confirmar a compra (veludo e ouro, os dois botões grandes) */
.alma-ldet .caixa.alma-lconf { grid-template-columns: auto; justify-items: center; gap: 10px; padding: 16px 30px 24px; }
.alma-lconf .alma-palco { width: clamp(170px, 34vh, 240px); height: clamp(180px, 36vh, 260px); }
.alma-lconf .linha-botoes { display: flex; gap: 22px; }
.alma-lconf .alma-botao { min-width: 120px; height: 72px; }
.alma-lconf .alma-botao .alma-svg { width: 46px; height: 46px; }

/* provador: a criança no mundo, a câmera gira em volta; embaixo, voltar, o preço e comprar */
body.alma-provando > *:not(.alma-provador):not(.alma-festa):not(.alma-fundo):not(.alma-voo) { visibility: hidden !important; }
body.alma-provando canvas { visibility: visible !important; }
body.alma-provando .painel-foto, body.alma-provando .grade-foto, body.alma-provando .moldura-foto { display: none !important; }
.alma-provador { position: fixed; z-index: 64; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: 999px; background: linear-gradient(#3a2c8e, #241a5e); max-width: calc(100vw - 24px); box-sizing: border-box;
  box-shadow: 0 0 0 3px #e6b23e, 0 0 0 7px rgba(255, 226, 140, 0.18), 0 8px 0 2px #0e0a2a, 0 14px 24px rgba(0,0,0,0.4); animation: alma-provador-entra 0.4s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes alma-provador-entra { from { transform: translate(-50%, 140%); } }
.alma-provador[hidden] { display: none; }
.alma-provador .mini { width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; overflow: hidden; background: radial-gradient(#6e56e0, #2a1f78); box-shadow: 0 0 0 3px #e6b23e; flex: none; }
.alma-provador .mini .alma-fig { width: 92%; height: 92%; }
.alma-provador .alma-falta { grid-auto-flow: column; align-items: center; gap: 8px; }
.alma-provador .alma-falta .enche { width: 90px; }
.alma-provador-troca { position: fixed; z-index: 64; left: 50%; bottom: calc(max(14px, env(safe-area-inset-bottom)) + 96px); transform: translateX(-50%); }
.alma-provador-troca[hidden] { display: none; }

/* celular deitado (390 de altura): uma fileira de seis */
@media (max-height: 500px) {
  .alma-loja { padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: max(8px, env(safe-area-inset-bottom)); }
  .alma-loja .sanefa { height: 14px; -webkit-mask-size: 20px 100%; mask-size: 20px 100%; }
  .alma-loja .sanefa::after { top: 3px; height: 2px; }
  .alma-loja .topo { padding: 8px 2px 4px; }
  .alma-loja .placa > .alma-svg { width: 36px; height: 36px; }
  .alma-prateleira { grid-template-columns: repeat(4, minmax(0, 190px)); gap: 12px 16px; padding: 14px clamp(16px, 5vw, 60px) 12px; --h: min(262px, calc(100vh - 126px)); }
  .alma-abas { gap: 6px; }
  .alma-aba { width: 46px; height: 46px; padding: 6px; }
  .alma-fita { font-size: 1.1rem; padding: 2px 16px 2px 11px; }
  .alma-fita .moeda { width: 22px; height: 22px; }
  .alma-selo { width: 38px; height: 38px; }
  .alma-ldet .caixa { padding: 12px 18px 14px; }
  .alma-palco { width: 210px; height: min(250px, calc(100vh - 80px)); }
  .alma-ldet .lado { gap: 10px; }
  .alma-ldet .lado .alma-saldo { font-size: 1.5rem; }
  .alma-ldet .lado .alma-saldo .moeda { width: 32px; height: 32px; }
  .alma-lconf { gap: 8px; padding: 10px 20px 14px; }
  .alma-lconf .alma-palco { width: 150px; height: 160px; }
  .alma-ldet .caixa.alma-lconf { padding: 10px 24px 14px; gap: 6px; }
  .alma-lconf .alma-botao { height: 60px; }
  .alma-provador { padding: 6px 10px; gap: 8px; }
  .alma-provador .mini { width: 46px; height: 46px; }
  .alma-provador-troca { bottom: calc(max(10px, env(safe-area-inset-bottom)) + 76px); }
}
/* celular em pé: duas colunas, três fileiras; o detalhe em pé também */
@media (max-width: 560px) {
  .alma-loja { padding-left: max(10px, env(safe-area-inset-left)); padding-right: max(10px, env(safe-area-inset-right)); }
  .alma-loja .cortina { width: 12px; }
  .alma-loja .cortina::after { display: none; }
  .alma-loja .placa { padding-right: 12px; }
  .alma-loja .placa .coroa { display: none; }
  .alma-prateleira { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 22px 16px; padding: 16px 14px 14px; --h: min(250px, calc((100vh - 250px) / 2)); }
  .alma-loja .topo { padding-bottom: 2px; }
  .alma-abas { order: 9; flex-basis: 100%; justify-content: center; gap: 6px; }
  .alma-aba { width: 46px; height: 46px; padding: 6px; }
  .alma-ldet .caixa { grid-template-columns: auto; justify-items: center; gap: 10px; padding: 16px 14px 18px; }
  .alma-palco { width: min(250px, 66vw); height: min(270px, 34vh); }
  .alma-provador { gap: 6px; padding: 7px 8px; }
  .alma-provador .alma-botao { min-width: 74px; height: 56px; padding: 6px 12px; }
  .alma-provador .alma-botao .alma-svg { width: 34px; height: 34px; }
  .alma-provador .mini { width: 44px; height: 44px; }
  .alma-provador .alma-saldo { font-size: 1.15rem; padding: 2px 10px 2px 4px; }
  .alma-provador .alma-saldo .moeda { width: 26px; height: 26px; }
  .alma-provador .alma-falta .enche { width: 60px; }
}
@media (prefers-reduced-motion: reduce) {
  .alma-loja, .alma-lcard, .alma-loja .feixe, .alma-lcard .arte, .alma-palco .arte, .alma-lcard .vidro::after { animation: none; }
}
`;

export interface OpcoesLoja {
  hud: HudAlma;
  festas: FestasAlma;
  perfil: PerfilCrianca;
  /** Saiu da lojinha direto para o jogo (sem painel): volta a prender o ponteiro. */
  aoFechar(): void;
  /** Spec 036 (T06): a aba e as estrelinhas de novo (padrão: a chave própria do aparelho). */
  novidades?: NovidadesLoja;
}

function armazenamentoLocal() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type Estudio = NonNullable<Window['__brumaluz']>;

/** O jogo (a câmera de estúdio do modo foto e o boneco); null fora do jogo (testes). */
const jogo = (): Estudio | null => window.__brumaluz ?? null;

export function criarLoja(op: OpcoesLoja) {
  const { hud, festas, perfil } = op;
  let raiz: HTMLElement | null = null;
  let det: HTMLElement | null = null;
  let compraEmCurso = false;
  const novidades = op.novidades ?? criarNovidadesLoja(armazenamentoLocal());
  /** A aba aberta (na primeira vez da página, a que a lembrança do aparelho diz). */
  let aba: CategoriaPremium | null = null;
  let prat: HTMLElement | null = null;
  let abasEl: HTMLElement | null = null;

  const p0 = () => perfil.perfil;
  const tem = (id: string) => p0().premium.includes(id);
  const vestido = (id: string) => Object.values(p0().vestidos).includes(id);

  // ---------------------------------------------------------------- vitrine
  function abrir(): void {
    if (compraEmCurso || festas.festando) return;
    sairProvador(false);
    const v = document.createElement('div');
    v.className = 'alma-loja';
    v.setAttribute('data-alma-loja', '');
    v.setAttribute('role', 'dialog');
    v.setAttribute('aria-label', 'Lojinha');
    for (const lado of ['e', 'd']) {
      const f = document.createElement('div');
      f.className = `feixe ${lado}`;
      const c = document.createElement('div');
      c.className = `cortina ${lado}`;
      v.append(f, c);
    }
    const ceu = document.createElement('div');
    ceu.className = 'ceu';
    for (let i = 0; i < 52; i++) {
      const s = document.createElement('i');
      if (i % 9 === 0) s.className = 'g';
      s.style.left = `${(i * 37.7 + 3) % 100}%`;
      s.style.top = `${(i * 53.3 + 7) % 100}%`;
      s.style.animationDelay = `${(i % 11) * 0.27}s`;
      ceu.appendChild(s);
    }
    const sanefa = document.createElement('div');
    sanefa.className = 'sanefa';
    v.append(ceu, sanefa);

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
    const saldo = pilhaDeMoedas(p0().moedas, 'alma-saldo');
    saldo.setAttribute('data-alma-saldo', '');
    saldo.setAttribute('aria-label', 'Minhas moedinhas');
    // spec 036 (T06): as abas por lugar do corpo (só o desenho; o nome fica para quem lê)
    aba ??= novidades.abrir();
    abasEl = document.createElement('div');
    abasEl.className = 'alma-abas';
    abasEl.setAttribute('role', 'tablist');
    abasEl.setAttribute('data-alma-abas', '');
    for (const cat of ABAS_LOJA) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'alma-aba';
      b.setAttribute('role', 'tab');
      b.setAttribute('data-alma-aba', cat);
      b.setAttribute('aria-label', NOME_ABA[cat]);
      b.innerHTML = ICONE_ABA[cat];
      b.addEventListener('click', () => {
        if (cat === aba) return;
        tocarSomInterface('toc');
        trocarAba(cat);
      });
      abasEl.appendChild(b);
    }
    topo.append(placa, abasEl, esp, saldo, botaoFechar(fechar));

    prat = document.createElement('div');
    prat.className = 'alma-prateleira';
    prat.setAttribute('data-alma-prateleira', '');
    prat.setAttribute('role', 'tabpanel');
    encherPrateleira();

    det = document.createElement('div');
    det.className = 'alma-ldet';
    det.hidden = true;
    det.setAttribute('data-alma-detalhe', '');
    det.addEventListener('click', (e) => {
      if (e.target === det && !compraEmCurso) fecharDetalhe();
    });
    v.append(topo, prat, det);
    const reabrir = !!raiz && hud.aberto();
    raiz = v;
    hud.abrirFundo(v);
    if (!reabrir) tocarSomInterface('plim');
  }

  /** Os cartões da aba aberta (só eles são desenhados: a vitrine abre rápido). */
  function encherPrateleira(): void {
    if (!prat || !aba) return;
    prat.dataset.aba = aba;
    prat.replaceChildren(...PREMIUM.filter((p) => p.categoria === aba).map((p, i) => cartao(p, i)));
    prat.scrollTop = 0;
    marcarAbas();
  }

  /** A aba escolhida acesa e a estrelinha nas abas que ainda têm novidade. */
  function marcarAbas(): void {
    if (!abasEl) return;
    for (const b of abasEl.querySelectorAll<HTMLElement>('[data-alma-aba]')) {
      const cat = b.dataset.almaAba as CategoriaPremium;
      b.setAttribute('aria-selected', String(cat === aba));
      const tem = novidades.abaComNovo(cat);
      const estrela = b.querySelector('.alma-novo');
      if (tem && !estrela) b.appendChild(estrelaNovo());
      else if (!tem && estrela) estrela.remove();
    }
  }

  function trocarAba(cat: CategoriaPremium): void {
    aba = cat;
    novidades.guardarAba(cat);
    encherPrateleira();
  }

  function cartao(p: ItemPremium, i: number): HTMLElement {
    const c = p0();
    const b = document.createElement('button');
    b.type = 'button';
    const meu = tem(p.id);
    const noBoneco = vestido(p.id);
    const pode = !meu && c.moedas >= p.preco;
    b.className = `alma-lcard${noBoneco ? ' vestido' : pode ? ' pode' : ''}`;
    b.dataset.premium = p.id;
    if (meu) b.dataset.meu = '';
    b.setAttribute('aria-label', meu ? `${p.nome} (é meu)` : `${p.nome}: ${p.preco} moedinhas`);
    b.style.setProperty('--d', `${(i % 3) * 1.7 + Math.floor(i / 3) * 0.8}s`);
    b.style.setProperty('--f', `${(i % 4) * -0.8}s`);
    b.style.setProperty('--e', `${i * 0.06}s`);
    const vidro = document.createElement('span');
    vidro.className = 'vidro';
    const palco = document.createElement('span');
    palco.className = 'palquinho';
    const ped = document.createElement('span');
    ped.className = 'pedestal';
    const arteEl = document.createElement('span');
    arteEl.className = 'arte';
    arteEl.appendChild(figuraPremium(p.id, 300));
    palco.append(ped, arteEl);
    const pe = document.createElement('span');
    pe.className = 'pe';
    if (meu) pe.appendChild(selo('meu'));
    else {
      pe.appendChild(fita(p.preco));
      if (!pode) pe.appendChild(pote(c.moedas / p.preco, 'pote'));
    }
    b.append(vidro, palco, pe);
    if (noBoneco) b.appendChild(selo('no-boneco'));
    if (novidades.novo(p.id)) b.appendChild(estrelaNovo());
    b.addEventListener('click', () => {
      tocarSomInterface('toc');
      detalhe(p.id);
    });
    return b;
  }

  // ---------------------------------------------------------------- detalhe
  function detalhe(id: string): void {
    const p = premiumPorId(id);
    if (!p) return;
    if (!raiz || !hud.aberto()) abrir();
    if (!det) return;
    // spec 036 (T06): o item é da outra aba (veio de "Meus tesouros"): a vitrine vai junto
    if (p.categoria !== aba) trocarAba(p.categoria);
    // viu de perto: a estrelinha de novo sai (do cartão e, se for a última, da aba)
    if (novidades.ver(p.id)) {
      prat?.querySelector(`[data-premium="${p.id}"] .alma-novo`)?.remove();
      marcarAbas();
    }
    const c = p0();
    const meu = tem(p.id);
    const noBoneco = vestido(p.id);
    const caixa = document.createElement('div');
    caixa.className = 'caixa';
    caixa.dataset.premium = p.id;
    caixa.setAttribute('aria-label', `${p.nome}: ${p.efeito}`);
    caixa.appendChild(palcoGrande(p));
    const lado = document.createElement('div');
    lado.className = 'lado';
    if (meu) lado.appendChild(selo('meu'));
    else lado.appendChild(pilhaDeMoedas(p.preco, 'alma-saldo'));
    // vestir (ou provar) este tira o que divide o lugar com ele: às claras
    if (!noBoneco) {
      const t = troca(p);
      if (t) lado.appendChild(t);
    }
    const botoes = document.createElement('div');
    botoes.className = 'botoes';
    botoes.appendChild(
      botao('azul', 'Experimentar', 'data-alma-experimentar', ESPELHO, () => {
        tocarSomInterface('toc');
        provar(p.id);
      }),
    );
    if (meu) {
      botoes.appendChild(
        botao(
          noBoneco ? 'azul' : 'chama',
          noBoneco ? 'Tirar' : 'Vestir',
          'data-alma-vestir-premium',
          noBoneco ? TIRAR : CAMISETA,
          () => {
            perfil.vestirPremium(p.id, !noBoneco);
            tocarSomInterface('criar');
            abrir();
            detalhe(p.id);
          },
        ),
      );
    } else if (c.moedas >= p.preco) {
      botoes.appendChild(
        botao('ouro chama', 'Comprar', 'data-alma-comprar', arte('ok'), () => {
          tocarSomInterface('toc');
          confirmar(p.id);
        }),
      );
    } else lado.appendChild(falta(p));
    lado.appendChild(botoes);
    caixa.append(lado, botaoFechar(fecharDetalhe));
    det.replaceChildren(caixa);
    det.hidden = false;
  }

  function fecharDetalhe(): void {
    if (!det) return;
    det.hidden = true;
    det.replaceChildren();
  }

  /** O item grande sob o holofote, no pedestal, com faíscas em volta. */
  function palcoGrande(p: ItemPremium, altura = 520): HTMLElement {
    const palco = document.createElement('div');
    palco.className = 'alma-palco';
    const luz = document.createElement('span');
    luz.className = 'luz';
    const ped = document.createElement('span');
    ped.className = 'pedestal';
    const a = document.createElement('span');
    a.className = 'arte';
    a.appendChild(figuraPremium(p.id, altura));
    palco.append(luz, ped, a);
    for (const [x, y, d] of [
      [8, 18, 0],
      [86, 30, 0.6],
      [16, 64, 1.1],
      [82, 70, 0.3],
    ]) {
      const f = svgEl('estrela', 'faisca');
      f.style.left = `${x}%`;
      f.style.top = `${y}%`;
      f.style.animationDelay = `${d}s`;
      palco.appendChild(f);
    }
    return palco;
  }

  /** Falta moedinha: o potinho de quanto já tem e o brincar (volta ao jogo, sem pressa). */
  function falta(p: ItemPremium, curto = false): HTMLElement {
    const c = p0();
    const el = document.createElement('div');
    el.className = 'alma-falta';
    el.setAttribute('data-alma-falta', '');
    el.setAttribute('aria-label', `Tenho ${c.moedas} de ${p.preco} moedinhas: é só brincar mais`);
    const trilho = document.createElement('div');
    trilho.className = 'trilho';
    trilho.appendChild(svgEl('potinho'));
    const barra = document.createElement('span');
    barra.className = 'enche';
    barra.innerHTML = `<i style="width:${Math.max(4, Math.min(1, c.moedas / p.preco) * 100)}%"></i>`;
    trilho.appendChild(barra);
    el.appendChild(trilho);
    if (!curto) {
      el.appendChild(
        botao('chama', 'Brincar mais', 'data-alma-brincar', arte('play'), () => {
          tocarSomInterface('toc');
          fechar();
        }),
      );
    }
    return el;
  }

  /** O que sai do boneco ao vestir este (figurinha apagada → seta → este), ou null. */
  function troca(p: ItemPremium, vestidos = p0().vestidos): HTMLElement | null {
    // spec 036 (T06): a regra única do que sai (os tesouros e, da fantasia, ela ou a peça)
    const a = (jogo()?.personagem?.aparencia?.() ?? {}) as Aparencia;
    const sai = oQueSai(a, vestidos, { premium: p.id });
    if (!sai.length) return null;
    const el = document.createElement('div');
    el.className = 'alma-troca';
    el.setAttribute('data-alma-troca', sai.map(rotuloSaida).join(' '));
    el.setAttribute(
      'aria-label',
      `${p.nome} entra no lugar de ${sai.map((s) => (s.tipo === 'premium' ? (premiumPorId(s.id)?.nome ?? s.id) : 'a fantasia')).join(' e ')}`,
    );
    for (const s of figurasDaSaida(sai)) {
      const b = document.createElement('span');
      b.className = 'sai';
      b.appendChild(s);
      el.appendChild(b);
    }
    el.appendChild(svgEl('seta'));
    el.lastElementChild!.innerHTML = TROCA;
    const e = document.createElement('span');
    e.className = 'entra';
    e.appendChild(figuraPremium(p.id, 120));
    el.appendChild(e);
    return el;
  }

  // ---------------------------------------------------------------- confirmar e comprar
  function confirmar(id: string): void {
    const p = premiumPorId(id);
    if (!p || !det) return;
    if (tem(id) || p0().moedas < p.preco) return detalhe(id);
    const c = document.createElement('div');
    c.className = 'caixa alma-lconf';
    c.setAttribute('data-alma-confirmar', id);
    const fig = palcoGrande(p, 440);
    const preco = pilhaDeMoedas(p.preco, 'alma-saldo');
    const linha = document.createElement('div');
    linha.className = 'linha-botoes';
    const nao = botao('azul', 'Agora não', 'data-alma-nao', NAO, () => {
      tocarSomInterface('toc');
      detalhe(id);
    });
    const sim = botao('chama', 'Comprar', 'data-alma-sim', arte('ok'), () => {
      sim.disabled = true;
      nao.disabled = true;
      void comprar(p, fig, preco);
    });
    linha.append(nao, sim);
    c.append(fig, preco, linha);
    det.replaceChildren(c);
    det.hidden = false;
  }

  async function comprar(p: ItemPremium, fig: HTMLElement, preco: HTMLElement): Promise<void> {
    const c = p0();
    if (c.premium.includes(p.id) || c.moedas < p.preco) return detalhe(p.id);
    compraEmCurso = true;
    // as moedinhas saem do preço e entram no item (o gasto se vê), depois a festa
    const de = preco.getBoundingClientRect();
    const para = fig.getBoundingClientRect();
    for (let i = 0; i < Math.min(5, p.preco); i++)
      setTimeout(() => {
        hud.voar(svgEl('moeda', 'moeda'), de, para, 46);
        tocarSomInterface('moeda');
      }, i * 90);
    await new Promise((ok) => setTimeout(ok, 820));
    const premio = document.createElement('span');
    premio.className = 'alma-fig';
    premio.dataset.tipo = 'premium';
    premio.dataset.premium = p.id;
    premio.appendChild(fotoPremium(p.id, 560));
    // compra (a carteira do aparelho, até a 024) e já veste; o gasto aparece na carteira
    const r = perfil.comprarPremium(p.id);
    if (!r.ok) {
      compraEmCurso = false;
      return detalhe(p.id);
    }
    // a festa vem por cima e a carteira aparece: a página fica "em festa" (nada de pausa)
    document.body.dataset.overlay = OVERLAY_FESTA;
    raiz = null;
    det = null;
    hud.fechar();
    festas.premium(premio, () => {
      compraEmCurso = false;
      // a criança já está vestindo: o puf de brilho, agora que a festa saiu da frente
      jogo()?.personagem?.festaPremium?.();
    });
  }

  // ---------------------------------------------------------------- provador
  let provador: HTMLElement | null = null;
  let trocaEl: HTMLElement | null = null;
  let provando: ItemPremium | null = null;
  let pararOrbita: (() => void) | null = null;

  function provar(id: string): void {
    const p = premiumPorId(id);
    const e = jogo();
    if (!p || !e?.personagem?.provar) return;
    provando = p;
    // a vitrine sai da frente; a página continua "com painel" (a pausa não abre)
    document.body.dataset.overlay = 'alma-provador';
    raiz = null;
    det = null;
    hud.fechar();
    document.body.classList.add('alma-provando');
    const vestidos = p0().vestidos;
    const look: PremiumVestidos = { ...vestidos };
    for (const s of saiAoVestir(vestidos, id)) {
      const cat = premiumPorId(s)?.categoria;
      if (cat) delete look[cat];
    }
    look[p.categoria] = id;
    // spec 036 (T06): o brinquedo de andar se prova montada
    e.personagem.provar(look, p.categoria === 'andar');
    pararOrbita = orbitar(p);
    setTimeout(() => {
      if (provando === p) {
        e.personagem?.festaPremium?.();
        tocarSomInterface('plim');
      }
    }, 450);
    montarProvador(p, vestidos);
  }

  function montarProvador(p: ItemPremium, vestidos: PremiumVestidos): void {
    provador?.remove();
    trocaEl?.remove();
    const bar = document.createElement('div');
    bar.className = 'alma-provador';
    bar.setAttribute('data-alma-provador', p.id);
    bar.appendChild(
      botao('azul', 'Voltar para a lojinha', 'data-alma-provador-voltar', VOLTAR, () => {
        tocarSomInterface('toc');
        sairProvador(true);
      }),
    );
    const mini = document.createElement('span');
    mini.className = 'mini';
    mini.appendChild(figuraPremium(p.id, 120));
    bar.appendChild(mini);
    const c = p0();
    if (tem(p.id)) {
      bar.appendChild(selo('meu'));
      if (!vestido(p.id))
        bar.appendChild(
          botao('chama', 'Vestir', 'data-alma-provador-vestir', CAMISETA, () => {
            sairProvador(false);
            perfil.vestirPremium(p.id, true);
            tocarSomInterface('criar');
            op.aoFechar();
          }),
        );
    } else {
      bar.appendChild(pilhaDeMoedas(p.preco, 'alma-saldo'));
      if (c.moedas >= p.preco)
        bar.appendChild(
          botao('ouro chama', 'Comprar', 'data-alma-provador-comprar', arte('ok'), () => {
            tocarSomInterface('toc');
            sairProvador(true);
            confirmar(p.id);
          }),
        );
      else bar.appendChild(falta(p, true));
    }
    document.body.appendChild(bar);
    provador = bar;
    const t = troca(p, vestidos);
    if (t) {
      t.classList.add('alma-provador-troca');
      document.body.appendChild(t);
      trocaEl = t;
    }
  }

  function sairProvador(voltar: boolean): void {
    if (!provando) return;
    const p = provando;
    provando = null;
    pararOrbita?.();
    pararOrbita = null;
    provador?.remove();
    trocaEl?.remove();
    provador = null;
    trocaEl = null;
    document.body.classList.remove('alma-provando');
    jogo()?.personagem?.provar?.(null);
    if (document.body.dataset.overlay === 'alma-provador') delete document.body.dataset.overlay;
    if (voltar) {
      abrir();
      detalhe(p.id);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && provando) {
      e.stopPropagation();
      sairProvador(true);
    }
  });

  function fechar(): void {
    const estavaProvando = !!provando;
    sairProvador(false);
    raiz = null;
    det = null;
    if (hud.aberto()) hud.fechar();
    else if (estavaProvando) op.aoFechar();
  }

  return {
    abrir,
    fechar,
    detalhe,
    provar,
    confirmar,
    sairProvador,
    /** Testes: o que está aberto agora. */
    estado(): 'fechada' | 'vitrine' | 'detalhe' | 'provador' {
      if (provando) return 'provador';
      if (!raiz || !hud.aberto()) return 'fechada';
      return det && !det.hidden ? 'detalhe' : 'vitrine';
    },
  };
}
export type LojaAlma = ReturnType<typeof criarLoja>;

// ------------------------------------------------------------------ peças
/** O nome de uma saída nos testes (`data-alma-troca`): o id do tesouro ou `fantasia:<id>`. */
export function rotuloSaida(s: Saida): string {
  return s.tipo === 'premium' ? s.id : `fantasia:${s.tipo === 'fantasia' ? s.id : s.fantasia}`;
}

/**
 * As figurinhas do que sai, uma por coisa: cada tesouro e a fantasia (inteira ou só a peça dela:
 * a figurinha é a fantasia, a que a criança reconhece).
 */
export function figurasDaSaida(sai: readonly Saida[], altura = 120): HTMLElement[] {
  const vistos = new Set<string>();
  const out: HTMLElement[] = [];
  for (const s of sai) {
    const k = rotuloSaida(s);
    if (vistos.has(k)) continue;
    vistos.add(k);
    out.push(s.tipo === 'premium' ? figuraPremium(s.id, altura) : figura(k));
  }
  return out;
}

function estrelaNovo(): HTMLElement {
  const s = document.createElement('span');
  s.className = 'alma-novo';
  s.setAttribute('data-alma-novo', '');
  s.innerHTML = NOVO;
  return s;
}

/** O nome de cada aba (só para quem lê e para os leitores de tela; a criança vê o desenho). */
const NOME_ABA: Record<CategoriaPremium, string> = {
  andar: 'Brinquedos de andar',
  roupa: 'Roupas',
  costas: 'Nas costas',
  mao: 'Na mão',
  chapeu: 'Chapéus',
  bicho: 'Bichinhos',
  fantasia: 'Fantasias',
};

function figuraPremium(id: string, altura: number): HTMLElement {
  const el = document.createElement('span');
  el.className = 'alma-fig';
  el.dataset.tipo = 'premium';
  el.appendChild(fotoPremium(id, altura));
  return el;
}

function fita(preco: number): HTMLElement {
  const f = pilhaDeMoedas(preco, 'alma-fita');
  f.setAttribute('data-alma-preco', String(preco));
  return f;
}

function selo(tipo: 'meu' | 'no-boneco'): HTMLElement {
  const s = document.createElement('span');
  s.className = `alma-selo ${tipo}`;
  s.setAttribute('aria-label', tipo === 'meu' ? 'É meu' : 'Estou vestindo');
  s.setAttribute(`data-alma-${tipo}`, '');
  s.innerHTML = tipo === 'meu' ? arte('ok') : CAMISETA;
  return s;
}

function pote(fr: number, classe: string): HTMLElement {
  const p = document.createElement('span');
  p.className = classe;
  p.innerHTML = `<i style="width:${Math.max(4, Math.min(1, fr) * 100)}%"></i>`;
  return p;
}

/**
 * A câmera do provador: gira devagar em volta da criança (pela câmera de estúdio do modo foto).
 * A capa começa vista de costas, o tênis de perto e baixo, o bichinho com os dois no quadro.
 * Devolve como parar (a câmera volta para trás do boneco, olhando como antes).
 */
function orbitar(p: ItemPremium): () => void {
  const e = jogo();
  const mf = e?.modoFoto;
  if (!e || !mf?.posicionar || !e.camera || !e.apontar) return () => undefined;
  const pos0 = e.camera.posicao();
  const piv0 = e.camera.pivo();
  const dx = piv0[0] - pos0[0];
  const dz = piv0[2] - pos0[2];
  const yaw0 = Math.atan2(dx, dz);
  const pitch0 = Math.atan2(pos0[1] - piv0[1], Math.hypot(dx, dz));
  if (!mf.ativo()) mf.alternar();
  const corpo = e.camera.yawCorpo();
  // (o passarinho de ombro é bicho, mas fica no boneco: a câmera de sempre)
  const bicho = p.categoria === 'bicho' && p.id !== 'passarinho-ombro';
  const pes = p.id === 'tenis-cometa';
  // spec 036 (T06): o brinquedo de andar inteiro no quadro; a pipa voando lá no alto, atrás
  const andar = p.categoria === 'andar';
  const pipa = p.id === 'pipa-lacinhos';
  const alto = pipa || p.id === 'guarda-chuva-gotinhas';
  // começa de quina e passa pela frente (a capa, as asas e a pipa: pelas costas)
  const inicio = p.categoria === 'costas' || pipa ? Math.PI - 0.6 : -0.6;
  // celular em pé: a tela é estreita, a câmera fica mais longe (a criança e o bicho cabem)
  const emPe = innerWidth < innerHeight ? (bicho || pipa ? 1.5 : 1.2) : 1;
  const dist = (bicho ? 3.9 : pipa ? 4.6 : andar ? 4.2 : alto ? 3.2 : pes ? 1.9 : 2.7) * emPe;
  const alt = bicho ? 0.9 : pipa ? 0.5 : andar ? 0.9 : pes ? 0.35 : 0.45;
  const altAlvo = bicho ? 0.6 : pipa ? 1.7 : alto ? 1.2 : pes ? 0.3 : andar ? 0.65 : 0.8;
  const t0 = performance.now();
  let vivo = true;
  const quadro = () => {
    if (!vivo) return;
    const pe = e.jogadorPes?.() ?? e.posicao;
    if (pe) {
      let ax = pe[0];
      let az = pe[2];
      if (bicho) {
        const b = e.personagem?.bichoPremium?.();
        if (b && Math.hypot(b.x - ax, b.z - az) < 5) {
          ax = (ax + b.x) / 2;
          az = (az + b.z) / 2;
        }
      }
      const t = (performance.now() - t0) / 1000;
      const ang = corpo + inicio + t * 0.26;
      mf.posicionar!(ax + Math.sin(ang) * dist, pe[1] + altAlvo + alt, az + Math.cos(ang) * dist);
      e.apontar!(ang + Math.PI, Math.atan2(alt, dist));
    }
    requestAnimationFrame(quadro);
  };
  requestAnimationFrame(quadro);
  return () => {
    vivo = false;
    if (mf.ativo()) mf.alternar();
    e.apontar!(yaw0, pitch0);
  };
}
