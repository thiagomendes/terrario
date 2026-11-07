/**
 * Interface de brinquedo (spec 012, esboço de telas): painéis creme de cantos redondos, botões
 * que parecem peças (com o degrau embaixo e um brilho em cima), poços para os itens, letra
 * arredondada e o logo em letras gordinhas. Vem por último e com `:root body` na frente, então
 * vale sobre o estilo de cada módulo sem mexer neles um por um.
 */
export const CSS_BRINQUEDO = `
@font-face { font-family: 'Fredoka'; font-weight: 300 700; font-display: swap; src: url(/fontes/fredoka.woff2) format('woff2'); }
@font-face { font-family: 'Nunito'; font-weight: 200 1000; font-display: swap; src: url(/fontes/nunito.woff2) format('woff2'); }
:root {
  --tinta: #3b2a1e; --tinta-suave: #8a7560;
  --painel: #fffaf0; --painel-borda: #f0d9b0; --poco: #f3e6cc;
  --creme: #fff6e4; --creme-fundo: #e2c99b;
  --amarela: #ffc23d; --amarela-fundo: #d9861a;
  --azul: #5aa7ff; --azul-fundo: #2f6fcf;
  --verde: #7fd06a; --verde-fundo: #3f9a3a;
  --jogo: 'Nunito', system-ui, sans-serif;
  --display: 'Fredoka', 'Nunito', system-ui, sans-serif;
}
:root body { font-family: var(--jogo); }

/* ---------- peças: todo botão grande é uma peça de brinquedo ---------- */
:root body .botao-jogo, :root body .pausa .btn, :root body .morte-fundo .btn, :root body .modal .btn,
:root body .barra-atalhos button, :root body .pausa .grade-funcoes button {
  --c: var(--creme); --f: var(--creme-fundo);
  border: 0; border-radius: 16px; color: var(--tinta); text-shadow: none; image-rendering: auto;
  font-family: var(--jogo); font-weight: 800; letter-spacing: 0;
  background: linear-gradient(to bottom, color-mix(in srgb, var(--c), white 35%) 0%, var(--c) 45%, color-mix(in srgb, var(--c), black 6%) 100%);
  box-shadow: 0 5px 0 var(--f), 0 9px 14px rgba(60, 35, 10, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.75);
  transition: transform 0.08s, box-shadow 0.08s, filter 0.1s;
}
:root body .botao-jogo:hover, :root body .botao-jogo:focus-visible,
:root body .pausa .btn:hover, :root body .pausa .btn:focus-visible,
:root body .morte-fundo .btn:hover, :root body .morte-fundo .btn:focus-visible,
:root body .barra-atalhos button:hover, :root body .barra-atalhos button:focus-visible,
:root body .pausa .grade-funcoes button:hover, :root body .pausa .grade-funcoes button:focus-visible {
  --c: #fffdf6; color: var(--tinta); filter: brightness(1.03); outline: none;
}
:root body .botao-jogo:focus-visible, :root body .pausa .btn:focus-visible, :root body .barra-atalhos button:focus-visible {
  outline: 3px solid #fff; outline-offset: 3px;
}
:root body .botao-jogo:active, :root body .pausa .btn:active, :root body .morte-fundo .btn:active,
:root body .barra-atalhos button:active, :root body .pausa .grade-funcoes button:active {
  transform: translateY(4px);
  box-shadow: 0 1px 0 var(--f), 0 3px 6px rgba(60, 35, 10, 0.25), inset 0 2px 0 rgba(255, 255, 255, 0.75);
}
:root body .botao-jogo.primario, :root body .pausa .btn.primario, :root body .morte-fundo .btn.primario,
:root body .botao-jogo.primario:hover, :root body .pausa .btn.primario:hover, :root body .morte-fundo .btn.primario:hover {
  --c: var(--amarela); --f: var(--amarela-fundo); color: var(--tinta); animation: none;
}
:root body .botao-jogo.azul, :root body .botao-jogo[data-entrar-com-codigo] {
  --c: var(--azul); --f: var(--azul-fundo); color: #fff; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.18);
}
:root body .botao-jogo .sub { color: var(--tinta); opacity: 0.72; font-weight: 700; text-shadow: none; }
:root body .barra-atalhos kbd, :root body .pausa .grade-funcoes kbd { color: var(--tinta-suave); font-family: var(--jogo); font-weight: 800; }

/* ---------- tela inicial ---------- */
/* o mundo atrás fica claro como no esboço: só um véu leve embaixo, para o rodapé ler bem */
:root body .entrada {
  font-family: var(--jogo);
  background: linear-gradient(180deg, rgba(120, 170, 230, 0.12), rgba(0, 0, 0, 0) 35%, rgba(0, 0, 0, 0) 75%, rgba(40, 30, 60, 0.35));
}
:root body .logo-titulo { display: none; }
:root body .titulo-oculto {
  position: static; width: auto; height: auto; overflow: visible; clip: auto; white-space: nowrap; margin: 0;
  font: 700 clamp(3.2rem, 13vw, 8.6rem)/0.95 var(--display); letter-spacing: 0.02em;
  background: linear-gradient(to bottom, #fff3b0 0%, #ffd24a 35%, #ff9b2f 75%, #f0742a 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 4px 0 #b8541b) drop-shadow(0 6px 0 #8a3c13) drop-shadow(0 14px 12px rgba(60, 25, 5, 0.35));
  animation: logo-flutua 5s ease-in-out infinite;
}
:root body .lema { color: #fff; font-family: var(--jogo); font-weight: 800; letter-spacing: 0.01em; text-shadow: 0 2px 0 rgba(40, 60, 90, 0.35); }
:root body .entrada .bruma-titulo, :root body .entrada .faisca { display: none; }
:root body .rodape-titulo { color: #fff; font-family: var(--jogo); font-weight: 700; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.3); }
:root body .rodape-titulo kbd {
  font-family: var(--jogo); font-weight: 800; color: var(--tinta); background: rgba(255, 255, 255, 0.88);
  border: 0; border-radius: 7px; box-shadow: 0 2px 0 rgba(0, 0, 0, 0.2); text-shadow: none;
}

/* ---------- painéis: creme com a borda de baixo ---------- */
:root body .inventario, :root body .pausa, :root body .modal, :root body .painel-personagem,
:root body .painel-trocas, :root body .painel-conteiner, :root body .painel-fornalha, :root body .livro {
  background: var(--painel); color: var(--tinta); border: 0; border-radius: 24px;
  box-shadow: 0 8px 0 var(--painel-borda), 0 22px 40px rgba(40, 25, 10, 0.35);
}
:root body .inventario h2, :root body .pausa h2, :root body .modal h2, :root body .painel-trocas h2,
:root body .painel-conteiner h2, :root body .painel-fornalha h2 {
  color: var(--tinta); font-family: var(--display); font-weight: 700; letter-spacing: 0.01em; text-shadow: none;
}
:root body .inventario .secao, :root body .inventario .rotulo-secao { color: var(--tinta-suave); }
:root body .inventario-fundo, :root body .pausa-fundo, :root body .modal-fundo {
  background: rgba(60, 45, 80, 0.32); backdrop-filter: blur(6px) saturate(0.95);
}
:root body .separador { border-color: var(--painel-borda); border-style: dashed; }

/* poços dos itens */
:root body .slot-inv {
  background: var(--poco); border: 0; border-radius: 12px; box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.14);
}
:root body .slot-inv:hover { background: #fff3d6; border: 0; }
:root body .slot-inv.ativo { background: #fff3d6; outline: 3px solid var(--amarela); outline-offset: -1px; }
:root body .slot-inv .qtd, :root body .barra .qtd { color: #fff; font-family: var(--jogo); font-weight: 800; text-shadow: 0 1px 0 rgba(0, 0, 0, 0.55); }
:root body .catalogo input, :root body .modal input, :root body .painel-personagem input {
  background: var(--poco); color: var(--tinta); border: 0; border-radius: 12px; font-family: var(--jogo); font-weight: 700;
  box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
:root body .catalogo input::placeholder { color: var(--tinta-suave); }

/* ---------- jogo: chips, missão, mira, avisos, barra ---------- */
:root body .hud .som, :root body .hud .camera-indicador, :root body .hud .fps {
  background: rgba(255, 250, 240, 0.86); color: var(--tinta); border: 0; border-radius: 999px;
  font: 800 0.76rem var(--jogo); padding: 4px 11px; box-shadow: 0 2px 0 rgba(150, 110, 60, 0.35);
}
:root body .missao-hud {
  background: rgba(255, 250, 240, 0.9); color: var(--tinta); border: 0; border-radius: 16px;
  font-family: var(--jogo); font-weight: 800; box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35);
}
:root body .missao-hud small { color: var(--tinta-suave); font-weight: 700; }
:root body .missao-hud .barra-progresso { height: 7px; border-radius: 4px; background: #f0e2c8; }
:root body .missao-hud .barra-progresso i { background: linear-gradient(90deg, #8fdc6f, #5cbf4f); border-radius: 4px; }
/* mira: um anelzinho branco */
:root body .hud .mira::before {
  top: 1px; left: 1px; width: 12px; height: 12px; border-radius: 50%; background: transparent;
  border: 2.5px solid rgba(255, 255, 255, 0.95); box-shadow: 0 0 0 1px rgba(40, 30, 60, 0.25), inset 0 0 0 1px rgba(40, 30, 60, 0.2);
}
:root body .hud .mira::after { display: none; }
:root body .toast, :root body .dica-mira {
  background: rgba(255, 250, 240, 0.94); color: var(--tinta); border: 0; border-radius: 999px;
  font-family: var(--jogo); font-weight: 800; box-shadow: 0 3px 0 rgba(150, 110, 60, 0.3), 0 8px 18px rgba(40, 25, 10, 0.2);
}
:root body .painel-construcao {
  background: rgba(255, 250, 240, 0.92); color: var(--tinta); border: 0; border-radius: 16px; font-family: var(--jogo);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.3);
}
:root body .painel-construcao small { color: var(--tinta-suave); }
:root body .barra {
  background: rgba(255, 250, 240, 0.78); border: 0; border-radius: 20px; padding: 7px;
  box-shadow: 0 4px 0 rgba(150, 110, 60, 0.35), 0 10px 20px rgba(40, 25, 10, 0.18);
}
:root body .barra button {
  background: var(--poco); border: 0; border-radius: 12px; box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.14);
  transition: transform 0.1s;
}
:root body .barra button:hover { background: #fff3d6; }
:root body .barra button[aria-pressed='true'] {
  background: #fff3d6; outline: 3px solid var(--amarela); outline-offset: -1px; transform: translateY(-4px);
  box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.1), 0 4px 0 var(--amarela-fundo);
}
:root body .barra .numero { color: var(--tinta-suave); font-family: var(--jogo); font-weight: 800; text-shadow: none; }
:root body .nome-item {
  background: rgba(255, 250, 240, 0.92); color: var(--tinta); border-radius: 999px; font-family: var(--jogo); font-weight: 800;
  box-shadow: 0 2px 0 rgba(150, 110, 60, 0.3);
}

/* ---------- debaixo d'água: piscina clara, bolhinhas e faixas de luz ---------- */
:root body.submerso::after {
  background:
    repeating-linear-gradient(105deg, rgba(255, 255, 255, 0) 0 90px, rgba(255, 255, 255, 0.04) 120px 150px, rgba(255, 255, 255, 0) 180px 260px),
    linear-gradient(180deg, rgba(150, 215, 255, 0.34), rgba(60, 140, 215, 0.3) 60%, rgba(30, 95, 180, 0.4));
  background-size: 400px 100%, 100% 100%;
  animation: luz-agua 7s ease-in-out infinite alternate;
}
@keyframes luz-agua { from { background-position: 0 0, 0 0; } to { background-position: 120px 0, 0 0; } }
.bolhas-agua { position: fixed; inset: 0; pointer-events: none; z-index: 3; overflow: hidden; display: none; }
body.submerso .bolhas-agua { display: block; }
.bolhas-agua i {
  position: absolute; bottom: -24px; width: var(--tam); height: var(--tam); border-radius: 50%;
  border: 1.5px solid rgba(255, 255, 255, 0.75); background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.08) 45%);
  animation: bolha-sobe linear infinite;
}
@keyframes bolha-sobe {
  0% { transform: translate(0, 0); opacity: 0; }
  10% { opacity: 1; }
  50% { transform: translate(12px, -50vh); }
  100% { transform: translate(-8px, -105vh); opacity: 0.6; }
}
@media (prefers-reduced-motion: reduce) { .bolhas-agua i, :root body.submerso::after { animation: none; } }

/* ---------- vitrine e cartões dos temas ---------- */
:root body .vitrine-temas, :root body .cartao-tema {
  background: rgba(255, 250, 240, 0.94); color: var(--tinta); border: 0; border-radius: 18px;
  box-shadow: 0 5px 0 var(--painel-borda), 0 12px 22px rgba(40, 25, 10, 0.25);
}
:root body .vitrine-temas:hover, :root body .cartao-tema:hover { filter: brightness(1.03); }
:root body .vitrine-temas .previa, :root body .cartao-tema .previa { border: 0; border-radius: 12px; }
:root body .cartao-tema .previa img, :root body .vitrine-temas .previa img { image-rendering: auto; }
:root body .vitrine-temas .rotulo { color: var(--tinta-suave); font-weight: 800; }
:root body .vitrine-temas .nome, :root body .cartao-tema .nome {
  color: color-mix(in srgb, var(--acento, #ffb35c), #5a2e00 45%); text-shadow: none;
  font-family: var(--display); font-weight: 700;
}
:root body .vitrine-temas .lema-tema, :root body .cartao-tema .convite { color: var(--tinta); font-weight: 600; }
:root body .vitrine-temas .pontos i { background: var(--painel-borda); border-radius: 50%; }
:root body .vitrine-temas .pontos i.ativa { background: var(--amarela-fundo); }
:root body .cartao-tema[aria-checked='true'] { outline: 3px solid var(--amarela); outline-offset: 2px; }

/* ---------- ícones e botão de fechar ---------- */
:root body .pixicone { filter: none; }
:root body .botao-fechar {
  border: 0; border-radius: 50%; color: var(--tinta);
  background: linear-gradient(to bottom, #fffdf6, var(--creme));
  box-shadow: 0 4px 0 var(--creme-fundo), 0 6px 12px rgba(60, 35, 10, 0.22), inset 0 2px 0 rgba(255, 255, 255, 0.8);
}
:root body .botao-fechar:hover, :root body .botao-fechar:focus-visible { background: #fffdf6; color: var(--tinta); }
:root body .botao-fechar:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--creme-fundo); }
`;
