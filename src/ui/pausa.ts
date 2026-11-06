import { criarGradeFuncoes } from './atalhos';
import { rotuloComIcone, type NomeIcone } from './pixicones';
import {
  alternarTelaCheia,
  emTelaCheia,
  ouvirTelaCheia,
  podeAlternarTelaCheia,
  rodandoComoApp,
  suportaTelaCheia,
} from './telaCheia';
export const CSS_PAUSA = `
.pausa-fundo {
  position: fixed; inset: 0; z-index: 25; display: flex; align-items: center; justify-content: center;
  padding: 16px; box-sizing: border-box; background: rgba(6, 8, 14, 0.5); backdrop-filter: blur(5px);
  font-family: system-ui, 'Segoe UI', sans-serif; color: #ece6da; animation: modal-entra 0.15s ease-out;
}
.pausa-fundo[hidden] { display: none; }
.pausa {
  width: min(380px, 100%); display: grid; gap: 10px; padding: 22px; box-sizing: border-box; text-align: center;
  border-radius: 18px; border: 1px solid rgba(255,255,255,0.12);
  background: linear-gradient(180deg, rgba(34, 36, 50, 0.95), rgba(20, 21, 30, 0.96));
  box-shadow: 0 24px 64px rgba(0,0,0,0.55); animation: cartao-entra 0.18s ease-out;
}
.pausa h2 { margin: 0; font-size: 1.6rem; letter-spacing: 0.04em; color: #ffe2a8; }
.pausa .mundo { margin: -4px 0 8px; font-size: 0.85rem; color: #a59f93; }
.pausa .btn { width: 100%; min-height: 46px; font-size: 1rem; }
.pausa .dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pausa .dica-app { margin: 2px 0 0; font-size: 0.78rem; color: #a59f93; }
.pausa .dica-app[hidden] { display: none; }
/* botões pixelados, no mesmo estilo dos botões do título (pausa e tela de morte) */
.pausa .btn, .morte-fundo .btn {
  border: 3px solid #120e16; border-radius: 0; color: #f6f2ea;
  font: 800 1rem/1.1 system-ui, 'Segoe UI', sans-serif; letter-spacing: 0.04em;
  text-shadow: 2px 2px 0 #2a2630;
  background: linear-gradient(#5a5464, #3e3946);
  box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.22), inset -3px -4px 0 rgba(0, 0, 0, 0.38), 0 4px 0 #0b080e;
  transition: transform 0.08s ease, filter 0.12s ease, color 0.12s ease;
}
.pausa .btn:hover, .pausa .btn:focus-visible, .morte-fundo .btn:hover, .morte-fundo .btn:focus-visible {
  transform: none; filter: brightness(1.16); color: #ffe7a3; background: linear-gradient(#5a5464, #3e3946);
}
.pausa .btn:focus-visible, .morte-fundo .btn:focus-visible { outline: 3px solid #ffd98f; outline-offset: 2px; }
.pausa .btn:active, .morte-fundo .btn:active {
  transform: translateY(3px);
  box-shadow: inset 3px 3px 0 rgba(255, 255, 255, 0.18), inset -3px -4px 0 rgba(0, 0, 0, 0.4), 0 1px 0 #0b080e;
}
.pausa .btn.primario, .morte-fundo .btn.primario {
  color: #fff8e4; text-shadow: 2px 2px 0 #6a3208;
  background: linear-gradient(#f2b45c, #c9701e);
  box-shadow: inset 3px 3px 0 rgba(255, 246, 210, 0.5), inset -3px -4px 0 rgba(110, 46, 6, 0.55), 0 4px 0 #0b080e;
}
.pausa .btn.primario:hover, .morte-fundo .btn.primario:hover { background: linear-gradient(#f2b45c, #c9701e); color: #fff; }
.pausa { border-radius: 0; border: 3px solid #120e16; box-shadow: inset 3px 3px 0 rgba(255,255,255,0.08), 0 24px 64px rgba(0,0,0,0.55); }
`;

export interface AcoesPausa {
  continuar(): void;
  configuracoes(): void;
  mundos(): void;
  salvar(): void;
  telaInicial(): void;
  /** Abre uma função do jogo pelo código da tecla (grade de botões grandes). */
  abrirFuncao?(codigo: string): void;
  /** Jogar com amigos: convite, código e quem está no mundo. */
  amigos?(): void;
}

export function criarMenuPausa(raiz: HTMLElement, nomeMundo: string, acoes: AcoesPausa) {
  const fundo = document.createElement('div');
  fundo.className = 'pausa-fundo';
  fundo.hidden = true;
  fundo.setAttribute('data-pausa', '');
  const card = document.createElement('div');
  card.className = 'pausa';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', 'Jogo pausado');
  const h = document.createElement('h2');
  h.textContent = 'Pausado';
  const m = document.createElement('div');
  m.className = 'mundo';
  m.textContent = nomeMundo;
  const botao = (rot: string, classe: string, f: () => void, attr: string, ic?: NomeIcone) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${classe}`;
    if (ic) rotuloComIcone(b, ic, rot);
    else b.textContent = rot;
    b.setAttribute(attr, '');
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      f();
    });
    return b;
  };
  const dupla = document.createElement('div');
  dupla.className = 'dupla';
  dupla.append(
    botao('Configurações', '', acoes.configuracoes, 'data-pausa-config', 'engrenagem'),
    botao('Mundos', '', acoes.mundos, 'data-pausa-mundos', 'globo'),
  );
  // Tela cheia: alterna onde o navegador permite; no iPhone, dica para instalar como app.
  const bTela = botao('Tela cheia', '', alternarTelaCheia, 'data-pausa-tela-cheia', 'telaCheia');
  const dicaApp = document.createElement('p');
  dicaApp.className = 'dica-app';
  dicaApp.setAttribute('data-dica-app', '');
  dicaApp.textContent =
    'No iPhone: Compartilhar › Adicionar à Tela de Início para jogar em tela cheia';
  const atualizarTela = () => {
    bTela.hidden = !podeAlternarTelaCheia();
    dicaApp.hidden = suportaTelaCheia() || rodandoComoApp();
    if (!bTela.hidden) {
      const dentro = emTelaCheia();
      rotuloComIcone(
        bTela,
        dentro ? 'janela' : 'telaCheia',
        dentro ? 'Sair da tela cheia' : 'Tela cheia',
      );
    }
  };
  ouvirTelaCheia(atualizarTela);
  atualizarTela();
  const continuar = botao(
    'Continuar',
    'primario',
    acoes.continuar,
    'data-pausa-continuar',
    'jogar',
  );
  const grade = acoes.abrirFuncao ? [criarGradeFuncoes(acoes.abrirFuncao)] : [];
  const amigos = acoes.amigos
    ? [botao('Jogar com amigos', 'primario', acoes.amigos, 'data-pausa-amigos', 'pessoa')]
    : [];
  card.append(
    h,
    m,
    continuar,
    ...amigos,
    ...grade,
    dupla,
    botao('Salvar agora', '', acoes.salvar, 'data-pausa-salvar', 'salvar'),
    bTela,
    botao('Tela inicial', '', acoes.telaInicial, 'data-pausa-inicio'),
    dicaApp,
  );
  fundo.appendChild(card);
  fundo.addEventListener('click', (e) => e.stopPropagation());
  raiz.appendChild(fundo);
  return {
    get aberto() {
      return !fundo.hidden;
    },
    abrir() {
      fundo.hidden = false;
      document.body.dataset.overlay = 'pausa';
      atualizarTela();
      continuar.focus({ preventScroll: true });
    },
    fechar() {
      fundo.hidden = true;
      if (document.body.dataset.overlay === 'pausa') delete document.body.dataset.overlay;
    },
  };
}
