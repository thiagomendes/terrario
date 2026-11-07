/**
 * Base da interface de brinquedo (spec 012): as letras arredondadas, as cores de todas as
 * telas e as peças, os botões que parecem peças de brinquedo (com o degrau embaixo e um
 * brilho em cima). Entra antes do estilo de cada módulo: cada tela usa estas cores e peças
 * e só acerta medida e arrumação no próprio CSS.
 */
export const CSS_BRINQUEDO = `
@font-face { font-family: 'Fredoka'; font-weight: 300 700; font-display: swap; src: url(/fontes/fredoka.woff2) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 200 1000; font-display: swap; src: url(/fontes/nunito.woff2) format('woff2'); }
:root {
  /* tinta em cima do creme: as duas passam do contraste AA (4,5:1) no painel e no poço */
  --tinta: #3b2a1e; --tinta-suave: #6f5a46;
  --titulo: #b5531a;
  --painel: #fffaf0; --painel-borda: #f0d9b0; --poco: #f3e6cc;
  --creme: #fff6e4; --creme-fundo: #e2c99b;
  --amarela: #ffc23d; --amarela-fundo: #d9861a;
  --azul: #5aa7ff; --azul-fundo: #2f6fcf;
  /* peça azul com letra branca: mais funda que o azul dos contornos, para a letra ler (4:1) */
  --azul-peca: #2f7fe8; --azul-peca-fundo: #1d58b0;
  --verde: #7fd06a; --verde-fundo: #3f9a3a;
  --vermelha: #b42318;
  --sombra-poco: inset 0 3px 0 rgba(120, 80, 30, 0.14);
  --jogo: 'Nunito', system-ui, sans-serif;
  --display: 'Fredoka', 'Nunito', system-ui, sans-serif;
}
body { font-family: var(--jogo); }

/* ---------- peças: todo botão de ação é uma peça de brinquedo ---------- */
.botao-jogo, .btn, .barra-atalhos button, .pausa .grade-funcoes button {
  --c: var(--creme); --f: var(--creme-fundo);
  border: 0; border-radius: 16px; color: var(--tinta); text-shadow: none; cursor: pointer;
  font-family: var(--jogo); font-weight: 800; letter-spacing: 0;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--c), white 35%) 0%, var(--c) 45%, color-mix(in srgb, var(--c), black 6%) 100%);
  box-shadow: 0 5px 0 var(--f), 0 9px 14px rgba(60, 35, 10, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.75);
  transition: transform 0.08s, box-shadow 0.08s, filter 0.1s;
}
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 42px; padding: 8px 16px; margin-bottom: 5px; box-sizing: border-box; font-size: 0.95rem;
}
.botao-jogo:hover, .btn:hover, .barra-atalhos button:hover, .pausa .grade-funcoes button:hover { filter: brightness(1.04); }
.botao-jogo:focus-visible, .btn:focus-visible, .barra-atalhos button:focus-visible, .pausa .grade-funcoes button:focus-visible {
  outline: 3px solid var(--azul); outline-offset: 3px;
}
.entrada .botao-jogo:focus-visible { outline-color: #fff; }
.botao-jogo:active, .btn:active, .barra-atalhos button:active, .pausa .grade-funcoes button:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 var(--f), 0 3px 6px rgba(60, 35, 10, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.75);
}
.botao-jogo.primario, .btn.primario { --c: var(--amarela); --f: var(--amarela-fundo); }
.botao-jogo.azul, .btn.azul, .botao-jogo[data-entrar-com-codigo] {
  --c: var(--azul-peca); --f: var(--azul-peca-fundo); color: #fff; text-shadow: 0 1px 0 rgba(20, 50, 110, 0.45);
}
.botao-jogo.azul .sub, .botao-jogo[data-entrar-com-codigo] .sub { color: #fff; }
.btn.perigo { color: var(--vermelha); }
.btn:disabled, .botao-jogo:disabled {
  cursor: not-allowed; filter: saturate(0.4); opacity: 0.6; transform: none;
  box-shadow: 0 3px 0 var(--f), inset 0 2px 0 rgba(255, 255, 255, 0.75);
}

/* régua de arrastar: trilho de poço e uma bolinha amarela de peça */
input[type='range'] { -webkit-appearance: none; appearance: none; height: 28px; background: transparent; cursor: pointer; }
input[type='range']::-webkit-slider-runnable-track { height: 12px; border-radius: 6px; background: var(--poco); box-shadow: var(--sombra-poco); }
input[type='range']::-moz-range-track { height: 12px; border-radius: 6px; background: var(--poco); box-shadow: var(--sombra-poco); }
input[type='range']::-moz-range-progress { height: 12px; border-radius: 6px; background: var(--amarela); }
input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none; width: 26px; height: 26px; margin-top: -7px; border: 0; border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, #fff1b8, var(--amarela) 60%, #f5b42e);
  box-shadow: 0 3px 0 var(--amarela-fundo), 0 5px 8px rgba(60, 35, 10, 0.25);
}
input[type='range']::-moz-range-thumb {
  width: 26px; height: 26px; border: 0; border-radius: 50%;
  background: radial-gradient(circle at 38% 30%, #fff1b8, var(--amarela) 60%, #f5b42e);
  box-shadow: 0 3px 0 var(--amarela-fundo), 0 5px 8px rgba(60, 35, 10, 0.25);
}
input[type='range']:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; border-radius: 8px; }
`;
