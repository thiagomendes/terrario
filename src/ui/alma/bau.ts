/**
 * Spec 023 (T07): o baú da criança, promovido do esboço aprovado. Abre tocando na carteira.
 *
 * - **Álbum (só onde há missões):** as figurinhas das missões deste mundo (feitas coladas,
 *   abertas com o anel do progresso, as próximas apagadinhas, todas com o prêmio à vista) e as
 *   fantasias de prêmio grandes (com cadeado até ganhar).
 * - **Nível (todo mundo):** o caminho dos níveis com todos os presentes à vista e a carinha da
 *   criança no nível de agora.
 * - **Habilidades (todo mundo):** as 5, com as estrelas e os mundos que alimentam.
 * - **Banca (só onde há missões):** o balcão com toldo, preço fixo, confirmação com os dois
 *   botões grandes; a compra de verdade pelo núcleo (`comprarBanca`), e cada recusa com um
 *   desenho calmo (sem bronca, sem pressa).
 *
 * Cuidados: nada sorteado, nada some, sem prazo; o potinho só informa quanto falta.
 */
import {
  HABILIDADES,
  PRESENTES_NIVEL,
  XP_DO_NIVEL,
  bancaDoMundo,
  estrelasDe,
  missoesDoMundo,
  nivelDoXp,
  type ItemBanca,
  type MundoAlma,
  type PerfilAlma,
  type RecusaBanca,
  type VistaAlmaMundo,
} from '../../jogo/alma';
import { tocarSomInterface } from '../../audio/somInterface';
import { fotografarBoneco } from '../../render/fotoBoneco';
import { normalizarAparencia, type Aparencia } from '../../personagem/aparencia';
import { arte } from './arte';
import { desenhoDaFigurinha, figura } from './figuras';
import { FECHAR_SVG, botao, botaoFechar, pilhaDeMoedas, svgEl, type HudAlma } from './hud';

export const CSS_ALMA_BAU = `
.alma-painel { position: relative; width: min(1000px, 100%); max-height: 100%; box-sizing: border-box; overflow: hidden; display: grid; grid-template-rows: auto 1fr;
  border-radius: 28px; background: var(--painel); box-shadow: 0 0 0 4px var(--painel-borda), 0 10px 0 #d9b77a, 0 22px 40px rgba(40,25,10,0.4);
  animation: alma-cartao-entra 0.3s cubic-bezier(.2,1.3,.4,1) both; }
.alma-cabeca { display: flex; align-items: center; gap: 10px; padding: 12px 14px 8px; }
.alma-cabeca .espaco { flex: 1; }
.alma-aba { width: 64px; height: 58px; border: 0; border-radius: 18px; padding: 6px; cursor: pointer; background: var(--poco); box-shadow: var(--sombra-poco); -webkit-tap-highlight-color: transparent; flex: none; }
.alma-aba .alma-svg { display: block; width: 100%; height: 100%; }
.alma-aba[aria-selected='true'] { background: linear-gradient(#fff3c4, #ffd76a); box-shadow: 0 4px 0 #d9a21a, inset 0 2px 0 #fff; transform: translateY(-2px); }
.alma-corpo { overflow: auto; padding: 4px 16px 16px; min-height: 0; overscroll-behavior: contain; }

/* álbum de missões do mundo */
.alma-album { display: grid; grid-template-columns: 1fr auto; gap: 16px; align-items: start; }
.alma-figurinhas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; padding: 14px; border-radius: 20px;
  background: repeating-linear-gradient(0deg, #f7ecd6 0 2px, transparent 2px 26px), #fbf3e2; box-shadow: var(--sombra-poco); }
.alma-fig-slot { position: relative; aspect-ratio: 1; border-radius: 16px; border: 3px dashed #e3cfa6; display: grid; place-items: center; padding: 8px;
  box-sizing: border-box; cursor: pointer; background: transparent; -webkit-tap-highlight-color: transparent; }
.alma-fig-slot .alma-fig { width: 100%; height: 100%; }
.alma-fig-slot.futura .alma-fig { opacity: 0.35; filter: saturate(0.4); }
.alma-fig-slot.feita, .alma-fig-slot.pulada { border: 0; background: #fff; box-shadow: 0 0 0 4px #fff, 0 4px 0 6px rgba(150,110,60,0.25); transform: rotate(var(--giro, -3deg)); }
.alma-fig-slot.pulada .alma-fig { filter: saturate(0.55); }
.alma-fig-slot.feita::after { content: ''; position: absolute; inset: 0; border-radius: 14px; background: linear-gradient(130deg, rgba(255,255,255,0.55), transparent 40%); pointer-events: none; }
.alma-fig-slot.aberta { border: 3px solid #5cbf4f; background: #effbe6; }
.alma-fig-slot .anel { position: absolute; inset: -5px; border-radius: 50%; pointer-events: none; }
.alma-fig-slot .jogar { position: absolute; right: -8px; bottom: -8px; width: 34px; height: 34px; border-radius: 50%; padding: 6px; box-sizing: border-box;
  background: #5cbf4f; box-shadow: 0 3px 0 #3f9a3a; animation: alma-chama 1.6s ease-in-out infinite; }
.alma-fig-slot .moedas-canto { position: absolute; left: -6px; top: -8px; }
.alma-fig-slot .bis { position: absolute; right: -6px; top: -8px; width: 30px; height: 30px; }
.alma-grandes { display: grid; gap: 12px; }
.alma-grande { position: relative; width: 150px; height: 170px; border-radius: 20px; display: grid; place-items: center; overflow: hidden;
  background: radial-gradient(circle at 50% 35%, #fff6c8, #ffe08a 70%); box-shadow: inset 0 0 0 4px #f5c44a; }
.alma-grande .alma-fig { height: 92%; }
.alma-grande.futura > .alma-fig { filter: brightness(0) opacity(0.22); }
.alma-grande .cad { position: absolute; width: 38px; height: 38px; right: 8px; top: 8px; }
.alma-grande .quando { position: absolute; left: 8px; bottom: 8px; width: 44px; height: 44px; border-radius: 12px; background: #fffaf0; padding: 3px; box-sizing: border-box; box-shadow: 0 2px 0 rgba(150,110,60,0.3); }
.alma-trofeu .quando.nivel { display: grid; place-items: center; font: 900 20px var(--jogo, system-ui); color: #8a4a00;
  background: radial-gradient(circle at 40% 35%, #fff3b0, #ffc93d); border-radius: 50%; }
.alma-trofeu.tem { background: radial-gradient(circle at 50% 40%, #fff6c8, #ffe08a 70%, #ffc93d); }
.alma-grande.tem::after { content: ''; position: absolute; right: 8px; top: 8px; width: 30px; height: 30px; border-radius: 50%;
  background: #5cbf4f url("data:image/svg+xml,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13 33 L27 47 L52 18' fill='none' stroke='white' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/70% no-repeat; box-shadow: 0 2px 0 #3f9a3a; }

/* caminho dos níveis */
.alma-niveis { position: relative; display: grid; grid-auto-flow: column; grid-auto-columns: 104px; gap: 6px; overflow-x: auto; padding: 10px 6px 18px; scroll-snap-type: x mandatory; }
.alma-niveis::before { content: ''; position: absolute; left: 50px; width: calc(110px * 9); top: 154px; border-top: 6px dotted #e3cfa6; }
.alma-nivel-passo { position: relative; display: grid; justify-items: center; gap: 10px; scroll-snap-align: center; }
.alma-nivel-passo .presente { width: 86px; height: 86px; border-radius: 20px; display: grid; place-items: center; padding: 8px; box-sizing: border-box; background: #fffaf0;
  box-shadow: 0 0 0 3px #f0d9b0, 0 5px 0 3px #e2c99b; position: relative; }
.alma-nivel-passo .presente .alma-fig { width: 100%; height: 100%; }
.alma-nivel-passo .presente .alma-moedas { position: absolute; right: -10px; bottom: -8px; }
.alma-nivel-passo .presente.ganho { background: #effbe6; box-shadow: 0 0 0 3px #5cbf4f, 0 5px 0 3px #3f9a3a; }
.alma-nivel-passo .presente.ganho::after { content: ''; position: absolute; right: -6px; top: -6px; width: 26px; height: 26px; border-radius: 50%;
  background: #5cbf4f url("data:image/svg+xml,%3Csvg viewBox='0 0 64 64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M13 33 L27 47 L52 18' fill='none' stroke='white' stroke-width='10' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/70% no-repeat; }
.alma-nivel-passo.futuro .presente { opacity: 0.62; }
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
.alma-banca { position: relative; border-radius: 22px; padding: 30px 14px 14px; margin-top: 12px; background: linear-gradient(#f3e0bd, #e9cf9f); box-shadow: inset 0 0 0 4px #c9955a; }
.alma-banca .toldo { position: absolute; left: -6px; right: -6px; top: -14px; height: 36px; border-radius: 12px 12px 18px 18px;
  background: repeating-linear-gradient(90deg, var(--toldo, #e8402f) 0 34px, #fff 34px 68px); box-shadow: 0 5px 0 rgba(90,50,20,0.25), inset 0 -6px 0 rgba(0,0,0,0.08);
  -webkit-mask: radial-gradient(circle 17px at 17px 100%, transparent 98%, #000) 0 0 / 34px 100% repeat-x; mask: radial-gradient(circle 17px at 17px 100%, transparent 98%, #000) 0 0 / 34px 100% repeat-x; }
.alma-banca .grade { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 12px; }
.alma-item { position: relative; display: grid; grid-template-rows: 1fr auto; justify-items: center; gap: 6px; padding: 10px 8px; border: 0; border-radius: 20px; cursor: pointer;
  background: #fffaf0; box-shadow: 0 0 0 3px #f0d9b0, 0 5px 0 3px #e2c99b; -webkit-tap-highlight-color: transparent; min-height: 140px; }
.alma-item:active { transform: translateY(3px); }
.alma-item .alma-fig { width: 80px; height: 80px; }
.alma-item .pe { display: grid; justify-items: center; gap: 4px; width: 100%; }
.alma-item .preco { display: inline-flex; align-items: center; gap: 3px; font: 900 1.15rem var(--display); color: #8a5a10; }
.alma-item .preco .moeda { width: 24px; height: 24px; }
.alma-item .pote { width: 80%; height: 8px; border-radius: 4px; background: #efe2c6; overflow: hidden; }
.alma-item .pote i { display: block; height: 100%; background: linear-gradient(90deg, #ffd96a, #f0a91c); }
.alma-item.pode { box-shadow: 0 0 0 4px #5cbf4f, 0 5px 0 4px #3f9a3a; }
.alma-item .qtd { position: absolute; left: 10px; top: 10px; font: 900 0.9rem var(--display); color: var(--tinta); background: #fff3c4; padding: 0 6px; border-radius: 8px; }
.alma-esperando { display: flex; align-items: center; gap: 8px; margin: 14px 0 0; padding: 6px 12px 6px 6px; border-radius: 18px; background: #fffaf0; box-shadow: inset 0 0 0 3px #e3cfa6; width: fit-content; }
.alma-esperando > .alma-svg { width: 44px; height: 44px; }
.alma-esperando .pilha { position: relative; width: 44px; height: 44px; }
.alma-esperando .pilha .alma-fig { width: 100%; height: 100%; }
.alma-esperando .pilha b { position: absolute; right: -4px; bottom: -4px; font: 900 0.8rem var(--display); color: var(--tinta); background: #fff3c4; padding: 0 5px; border-radius: 8px; }

/* confirmar e as respostas da banca */
.alma-confirmar .figuras { display: flex; align-items: center; gap: 10px; }
.alma-confirmar .figuras .alma-fig { width: 140px; height: 140px; }
.alma-confirmar .linha-botoes { display: flex; gap: 18px; }
.alma-recusa .figuras { display: flex; align-items: center; gap: 14px; }
.alma-recusa .figuras > .alma-svg { width: 120px; height: 120px; }
.alma-recusa .figuras > .alma-fig { width: 92px; height: 92px; opacity: 0.85; }
.alma-recusa .pote-grande { width: 200px; height: 14px; border-radius: 7px; background: #efe2c6; overflow: hidden; box-shadow: var(--sombra-poco); }
.alma-recusa .pote-grande i { display: block; height: 100%; border-radius: 7px; background: linear-gradient(90deg, #ffd96a, #f0a91c); }
.alma-guardou { display: flex; align-items: center; gap: 10px; }
.alma-guardou > .alma-svg { width: 64px; height: 64px; }
.alma-guardou .alma-fig { width: 56px; height: 56px; }

/* celular deitado (390 de altura) */
@media (max-height: 500px) {
  .alma-cabeca { padding: 8px 10px 4px; gap: 8px; }
  .alma-aba { width: 54px; height: 48px; }
  .alma-corpo { padding: 2px 12px 10px; }
  .alma-figurinhas { gap: 8px; padding: 8px; grid-template-columns: repeat(4, 84px); }
  .alma-grandes { grid-template-columns: repeat(2, 104px); gap: 8px; }
  .alma-grande { width: 104px; height: 128px; }
  .alma-niveis { grid-auto-columns: 88px; padding: 6px 4px 10px; }
  .alma-niveis::before { top: 112px; width: calc(94px * 9); left: 44px; }
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
  .alma-confirmar .figuras .alma-fig { width: 104px; height: 104px; }
  .alma-recusa .figuras > .alma-svg { width: 92px; height: 92px; }
}
/* celular em pé (estreito): abas menores, álbum e habilidades em duas colunas */
@media (max-width: 560px) {
  .alma-cabeca { gap: 5px; padding: 10px 8px 6px; }
  .alma-aba { width: 46px; height: 44px; padding: 5px; border-radius: 14px; }
  .alma-cabeca .alma-saldo { font-size: 1.05rem; padding: 2px 8px 2px 3px; }
  .alma-cabeca .alma-saldo .moeda { width: 24px; height: 24px; }
  .alma-cabeca .alma-fechar { width: 40px; height: 40px; }
  .alma-cabeca .alma-fechar svg { width: 20px; height: 20px; }
  .alma-corpo { padding: 2px 10px 12px; }
  .alma-album { grid-template-columns: 1fr; }
  .alma-figurinhas { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding: 8px; }
  .alma-grandes { grid-template-columns: repeat(2, 1fr); }
  .alma-grande { width: 100%; height: 150px; }
  .alma-niveis { grid-auto-flow: row; grid-auto-columns: auto; grid-template-columns: 1fr; overflow: visible; gap: 18px; }
  .alma-niveis::before { display: block; left: 35px; top: 30px; bottom: 30px; width: 0; border-top: 0; border-left: 6px dotted #e3cfa6; }
  .alma-nivel-passo { grid-template-columns: 76px 1fr; justify-items: start; align-items: center; gap: 14px; }
  .alma-nivel-passo .bola { order: -1; justify-self: center; margin-top: 0 !important; }
  .alma-nivel-passo .presente { width: 72px; height: 72px; }
  .alma-habs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .alma-banca .grade { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .alma-confirmar .figuras .alma-fig { width: 110px; height: 110px; }
}
`;

export type AbaBau = 'album' | 'nivel' | 'habilidades' | 'banca';

export interface OpcoesBau {
  hud: HudAlma;
  perfil(): PerfilAlma;
  vista(): VistaAlmaMundo | null;
  /** Fantasias de prêmio que a criança já tem (as das missões e as do canteiro da 014). */
  fantasiasGanhas(): string[];
  /** Compra na banca pelo núcleo: o aparelho manda o saldo; a resposta vem num evento. */
  comprarBanca(item: string, saldo: number): void;
  aparencia(): Aparencia;
}

/** Cada recusa da banca vira um desenho calmo (sem bronca, sem pressa, sem texto). */
export const DESENHO_RECUSA: Record<RecusaBanca, string> = {
  saldo: 'potinho',
  espera: 'ampulheta',
  limite: 'lua',
  cheio: 'mochilaCheia',
  galinha: 'galinheiroCheio',
  tema: 'cadeado',
};

const NOMES_ABAS: Record<AbaBau, [string, string]> = {
  album: ['album', 'Missões do mundo'],
  nivel: ['nivel', 'Meu nível'],
  habilidades: ['medalha', 'Habilidades'],
  banca: ['toldoVerde', 'Banca do mundo'],
};

export function criarBau(op: OpcoesBau) {
  const { hud } = op;
  let abaAtual: AbaBau = 'nivel';
  let abertoNo: AbaBau | null = null;
  const mundo = (): MundoAlma | null => op.vista()?.mundo ?? null;
  const abasDoMundo = (): AbaBau[] =>
    mundo() ? ['album', 'nivel', 'habilidades', 'banca'] : ['nivel', 'habilidades'];

  function abrir(aba: AbaBau = mundo() ? 'album' : 'nivel'): void {
    if (!abasDoMundo().includes(aba)) aba = 'nivel';
    abaAtual = aba;
    abertoNo = aba;
    const painel = document.createElement('div');
    painel.className = 'alma-painel';
    painel.setAttribute('data-alma-painel', aba);
    const cab = document.createElement('div');
    cab.className = 'alma-cabeca';
    cab.setAttribute('role', 'tablist');
    for (const id of abasDoMundo()) {
      const [desenho, rotulo] = NOMES_ABAS[id];
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'alma-aba';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-label', rotulo);
      b.setAttribute('aria-selected', String(id === aba));
      b.setAttribute('data-alma-aba', id);
      b.appendChild(
        svgEl(id === 'banca' && mundo() === 'rancho-alegre' ? 'toldoVermelho' : desenho),
      );
      b.addEventListener('click', () => {
        tocarSomInterface('toc');
        abrir(id);
      });
      cab.appendChild(b);
    }
    const esp = document.createElement('span');
    esp.className = 'espaco';
    const saldo = pilhaDeMoedas(op.perfil().moedas, 'alma-saldo');
    saldo.setAttribute('data-alma-saldo', '');
    saldo.setAttribute('aria-label', 'Minhas moedinhas');
    cab.append(esp, saldo, botaoFechar(fechar));
    const corpo = document.createElement('div');
    corpo.className = 'alma-corpo';
    if (aba === 'album') corpo.appendChild(album());
    else if (aba === 'nivel') corpo.appendChild(niveis());
    else if (aba === 'habilidades') corpo.appendChild(habilidades());
    else corpo.appendChild(banca());
    painel.append(cab, corpo);
    hud.abrirFundo(painel);
    // o caminho dos níveis abre no nível de agora
    corpo
      .querySelector('.alma-nivel-passo.agora')
      ?.scrollIntoView({ inline: 'center', block: 'center' });
  }
  function fechar(): void {
    abertoNo = null;
    hud.fechar();
  }

  // ---------------------------------------------------------------- álbum
  function album(): HTMLElement {
    const v = op.vista()!;
    const m0 = v.mundo;
    const ganhas = op.fantasiasGanhas();
    const caixa = document.createElement('div');
    caixa.className = 'alma-album';
    const grade = document.createElement('div');
    grade.className = 'alma-figurinhas';
    missoesDoMundo(m0).forEach((m, i) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      const feita = v.feitas.includes(m.id);
      const pulada = v.puladas.includes(m.id);
      const aberta = v.abertas.find((a) => a.id === m.id && !a.bis);
      slot.className = `alma-fig-slot ${feita ? 'feita' : pulada ? 'pulada' : aberta ? 'aberta' : 'futura'}`;
      slot.style.setProperty('--giro', `${((i * 37) % 9) - 4}deg`);
      slot.dataset.missao = m.id;
      slot.setAttribute('aria-label', m.nome);
      slot.appendChild(figura(desenhoDaFigurinha(m)));
      if (aberta) {
        const fr = aberta.meta > 0 ? Math.min(1, aberta.feito / aberta.meta) : 0;
        const anel = document.createElement('span');
        anel.className = 'anel';
        anel.style.background = `conic-gradient(#5cbf4f ${fr}turn, transparent 0)`;
        anel.style.mask =
          'radial-gradient(farthest-side, transparent calc(100% - 6px), #000 calc(100% - 5px))';
        anel.style.webkitMask = anel.style.mask;
        slot.appendChild(anel);
        slot.appendChild(svgEl('play', 'jogar'));
      }
      // o prêmio à vista enquanto não foi feita
      if (!feita && !pulada) slot.appendChild(pilhaDeMoedas(m.moedas, 'alma-moedas moedas-canto'));
      slot.addEventListener('click', () => {
        tocarSomInterface('toc');
        if (aberta || v.abertas.some((a) => a.id === m.id)) hud.quadro();
      });
      grade.appendChild(slot);
    });
    const grandes = document.createElement('div');
    grandes.className = 'alma-grandes';
    for (const m of missoesDoMundo(m0).filter((x) => x.fantasia)) {
      const g = document.createElement('div');
      const tem = ganhas.includes(m.fantasia!);
      g.className = `alma-grande${tem ? ' tem' : ' futura'}`;
      g.dataset.fantasia = m.fantasia;
      g.setAttribute('aria-label', m.nome);
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
    // spec 023 (T09): o troféu do nível 10 (presente de nível), em todo álbum
    const nivel = nivelDoXp(op.perfil().xp).nivel;
    const trofeu = document.createElement('div');
    trofeu.className = `alma-grande alma-trofeu${nivel >= 10 ? ' tem' : ' futura'}`;
    trofeu.dataset.trofeu = '10';
    trofeu.setAttribute('aria-label', 'Troféu do nível 10');
    trofeu.appendChild(figura('trofeu'));
    if (nivel < 10) {
      trofeu.appendChild(svgEl('cadeado', 'cad'));
      const q = document.createElement('span');
      q.className = 'quando nivel';
      q.textContent = '10';
      trofeu.appendChild(q);
    }
    grandes.appendChild(trofeu);
    caixa.append(grade, grandes);
    return caixa;
  }

  // ---------------------------------------------------------------- caminho dos níveis
  function niveis(): HTMLElement {
    const { nivel, fracao } = nivelDoXp(op.perfil().xp);
    const linha = document.createElement('div');
    linha.className = 'alma-niveis';
    const ultimo = Math.max(XP_DO_NIVEL.length, nivel);
    for (let n = 1; n <= ultimo; n++) {
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
        // o presente do nível de agora já é dela (o de cada nível vem quando ele chega)
        if (n <= nivel) caixa.classList.add('ganho');
      } else caixa.appendChild(figura(n === 1 ? 'coracao' : 'estrela'));
      const bola = document.createElement('div');
      bola.className = 'bola';
      if (n === nivel) {
        bola.style.setProperty('--f', String(fracao));
        const cv = document.createElement('canvas');
        fotografarBoneco(cv, normalizarAparencia(op.aparencia()), 'cabeca', 160);
        const b = document.createElement('b');
        b.textContent = String(n);
        bola.append(cv, b);
        bola.setAttribute('aria-label', `Nível ${n}`);
      } else bola.textContent = String(n);
      p.append(caixa, bola);
      linha.appendChild(p);
    }
    return linha;
  }

  // ---------------------------------------------------------------- habilidades
  function habilidades(): HTMLElement {
    const c = op.perfil();
    const grade = document.createElement('div');
    grade.className = 'alma-habs';
    for (const h of HABILIDADES) {
      const { estrelas, fracao } = estrelasDe(c.pontos[h.id] ?? 0);
      const card = document.createElement('div');
      card.className = 'alma-hab';
      card.dataset.hab = h.id;
      card.dataset.estrelas = String(estrelas);
      card.setAttribute('aria-label', h.nome);
      const d = document.createElement('span');
      d.className = 'distintivo';
      d.style.setProperty('--cor', h.cor);
      d.style.setProperty('--f', String(estrelas >= 5 ? 1 : fracao));
      d.appendChild(figura(h.desenho));
      const est = document.createElement('span');
      est.className = 'alma-estrelas';
      for (let i = 0; i < 5; i++) est.appendChild(svgEl(i < estrelas ? 'estrela' : 'estrelaVazia'));
      // os mundos das missões que alimentam, e o mundo inteiro (as ações soltas contam em todos)
      const mundos = document.createElement('span');
      mundos.className = 'mundos';
      for (const m of h.mundos)
        mundos.appendChild(
          svgEl(
            m === 'cidade-grande' ? 'mundoCidade' : m === 'vila-neon' ? 'mundoVila' : 'mundoRancho',
          ),
        );
      mundos.appendChild(svgEl('mundoTodos'));
      card.append(d, est, mundos);
      grade.appendChild(card);
    }
    return grade;
  }

  // ---------------------------------------------------------------- banca
  function banca(): HTMLElement {
    const m0 = mundo()!;
    const c = op.perfil();
    const raiz = document.createElement('div');
    const caixa = document.createElement('div');
    caixa.className = 'alma-banca';
    caixa.setAttribute('data-alma-banca', m0);
    caixa.style.setProperty(
      '--toldo',
      m0 === 'cidade-grande' ? '#3fae5a' : m0 === 'vila-neon' ? '#2f8cff' : '#e8402f',
    );
    const toldo = document.createElement('div');
    toldo.className = 'toldo';
    const grade = document.createElement('div');
    grade.className = 'grade';
    for (const it of bancaDoMundo(m0)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.item = it.id;
      b.setAttribute('aria-label', `${it.nome}: ${it.preco} moedinhas`);
      const pode = c.moedas >= it.preco;
      b.className = `alma-item${pode ? ' pode' : ''}`;
      b.appendChild(figura(it.desenho));
      const q = document.createElement('span');
      q.className = 'qtd';
      q.textContent = `×${it.qtd}`;
      b.appendChild(q);
      const pe = document.createElement('span');
      pe.className = 'pe';
      const preco = document.createElement('span');
      preco.className = 'preco';
      preco.appendChild(svgEl('moeda', 'moeda'));
      preco.append(String(it.preco));
      pe.appendChild(preco);
      if (!pode) pe.appendChild(pote(c.moedas / it.preco, 'pote'));
      b.appendChild(pe);
      b.addEventListener('click', () => {
        tocarSomInterface('toc');
        if (pode) confirmar(it);
        else recusa(it, 'saldo');
      });
      grade.appendChild(b);
    }
    caixa.append(toldo, grade);
    raiz.appendChild(caixa);
    // o que não coube na mochila espera no baú da banca e entra sozinho quando couber
    const bau = op.vista()?.bau ?? [];
    if (bau.length) {
      const esp = document.createElement('div');
      esp.className = 'alma-esperando';
      esp.setAttribute('data-alma-bau-banca', '');
      esp.setAttribute('aria-label', 'Esperando no baú da banca');
      esp.appendChild(svgEl('bau'));
      for (const p of bau) {
        const pilha = document.createElement('span');
        pilha.className = 'pilha';
        pilha.appendChild(figura(`item:${p.item}`));
        const n = document.createElement('b');
        n.textContent = `×${p.qtd}`;
        pilha.appendChild(n);
        esp.appendChild(pilha);
      }
      raiz.appendChild(esp);
    }
    return raiz;
  }

  function pote(fr: number, classe: string): HTMLElement {
    const p = document.createElement('span');
    p.className = classe;
    p.innerHTML = `<i style="width:${Math.max(4, Math.min(1, fr) * 100)}%"></i>`;
    return p;
  }

  /** Confirmar (os dois botões grandes: não e sim), sempre. */
  function confirmar(it: ItemBanca): void {
    const c = document.createElement('div');
    c.className = 'alma-cartao alma-confirmar';
    c.setAttribute('data-alma-confirmar', it.id);
    const figs = document.createElement('div');
    figs.className = 'figuras';
    const fig = figura(it.desenho);
    figs.appendChild(fig);
    const linha = document.createElement('div');
    linha.className = 'linha-botoes';
    const nao = botao(
      'azul',
      'Agora não',
      'data-alma-nao',
      FECHAR_SVG.replace('#5a3a22', '#fff'),
      () => abrir('banca'),
    );
    const sim = botao('chama', 'Comprar', 'data-alma-sim', arte('ok'), () => {
      sim.disabled = true;
      nao.disabled = true;
      void comprar(it, fig);
    });
    linha.append(nao, sim);
    c.append(figs, pilhaDeMoedas(it.preco, 'alma-saldo'), linha);
    hud.abrirFundo(c);
  }

  /** Manda a compra ao núcleo e espera a resposta (a entrega ou a recusa). */
  function comprar(it: ItemBanca, fig: HTMLElement): Promise<void> {
    return new Promise((pronto) => {
      let feito = false;
      const ok = (ev: Event) => {
        const d = (ev as CustomEvent<{ item?: string; guardado?: number }>).detail;
        if (d?.item !== it.id) return;
        fim();
        entregue(it, fig, d.guardado ?? 0);
      };
      const nao = (ev: Event) => {
        const d = (ev as CustomEvent<{ item?: string; motivo?: RecusaBanca }>).detail;
        if (d?.item !== it.id) return;
        fim();
        recusa(it, d.motivo ?? 'tema');
      };
      const fim = () => {
        feito = true;
        window.removeEventListener('brumaluz:almaCompra', ok);
        window.removeEventListener('brumaluz:almaCompraRecusada', nao);
        clearTimeout(t);
        pronto();
      };
      window.addEventListener('brumaluz:almaCompra', ok);
      window.addEventListener('brumaluz:almaCompraRecusada', nao);
      // sem resposta (a conexão caiu): volta à banca, nada foi gasto
      const t = setTimeout(() => {
        if (feito) return;
        fim();
        if (abertoNo === 'banca' || hud.aberto()) abrir('banca');
      }, 6000);
      op.comprarBanca(it.id, op.perfil().moedas);
    });
  }

  function entregue(it: ItemBanca, fig: HTMLElement, guardado: number): void {
    tocarSomInterface('conquista');
    const de = fig.getBoundingClientRect();
    abrir('banca');
    const mochila = document.querySelector<HTMLElement>('[data-botao-mochila]');
    // o pacote voa para a mochila (ou para o baú da banca, o que não coube)
    const alvo = guardado
      ? document.querySelector<HTMLElement>('[data-alma-bau-banca]')
      : mochila && getComputedStyle(mochila).display !== 'none'
        ? mochila
        : hud.carteira;
    if (alvo) hud.voar(figura(it.desenho), de, alvo.getBoundingClientRect(), 120);
    void hud.contarMoedasAte(op.perfil().moedas);
  }

  /** A recusa, sem bronca: o desenho do porquê, o item e o "tá bom". */
  function recusa(it: ItemBanca, motivo: RecusaBanca): void {
    const c = document.createElement('div');
    c.className = 'alma-cartao alma-recusa';
    c.setAttribute('data-alma-recusa', motivo);
    const figs = document.createElement('div');
    figs.className = 'figuras';
    figs.append(svgEl(DESENHO_RECUSA[motivo]), figura(it.desenho));
    c.appendChild(figs);
    // falta moedinha: o potinho mostra quanto já tem (falta pouco), sem pressa
    if (motivo === 'saldo') c.appendChild(pote(op.perfil().moedas / it.preco, 'pote-grande'));
    c.appendChild(botao('azul', 'Tá bom', 'data-alma-ta-bom', arte('ok'), () => abrir('banca')));
    hud.abrirFundo(c);
  }

  return {
    abrir,
    fechar,
    /** A aba aberta agora (null: fechado). */
    get aba() {
      return hud.aberto() ? abertoNo : null;
    },
    /** Redesenha a aba aberta (a carteira mudou, o quadro chegou). */
    atualizar() {
      if (hud.aberto() && abertoNo && document.querySelector('[data-alma-painel]')) abrir(abaAtual);
    },
  };
}
export type BauAlma = ReturnType<typeof criarBau>;
