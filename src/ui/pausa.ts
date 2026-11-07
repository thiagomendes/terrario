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
  padding: 16px; box-sizing: border-box; background: rgba(60, 45, 80, 0.32); backdrop-filter: blur(6px) saturate(0.95);
  font-family: var(--jogo); color: var(--tinta); animation: modal-entra 0.15s ease-out;
  overflow-y: auto;
}
.pausa-fundo[hidden] { display: none; }
.pausa {
  width: min(400px, 100%); max-height: 100%; overflow-y: auto; display: grid; gap: 12px; padding: 22px 22px 26px;
  box-sizing: border-box; text-align: left;
  border: 0; border-radius: 24px; background: var(--painel); color: var(--tinta);
  box-shadow: 0 8px 0 var(--painel-borda), 0 22px 40px rgba(40, 25, 10, 0.35); animation: cartao-entra 0.18s ease-out;
}
.pausa h2 { margin: 0; font: 700 1.6rem/1.1 var(--display); color: var(--titulo); }
.pausa .mundo { margin: -6px 0 4px; font-size: 0.88rem; font-weight: 700; color: var(--tinta-suave); }
.pausa .btn { width: 100%; min-height: 48px; font-size: 1rem; margin-bottom: 4px; }
.pausa .btn.primario { min-height: 52px; font: 700 1.15rem var(--display); }
.pausa .dupla { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pausa .dica-app { margin: 2px 0 0; font-size: 0.8rem; font-weight: 600; color: var(--tinta-suave); text-align: center; }
.pausa .dica-app[hidden] { display: none; }
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
    ? [botao('Convidar amigos', 'azul', acoes.amigos, 'data-pausa-amigos', 'pessoa')]
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
