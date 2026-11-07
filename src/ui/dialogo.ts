/**
 * Diálogo de brinquedo (spec 012): no lugar das janelas do navegador (prompt e confirm), um
 * cartão creme com a pergunta, um campo opcional e botões-peça. Enter confirma, Esc cancela, e
 * o foco vai para o campo (ou para o botão de confirmar).
 */
export const CSS_DIALOGO = `
.dialogo-fundo { position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 16px;
  background: rgba(60, 45, 80, 0.38); backdrop-filter: blur(4px); }
.dialogo {
  width: min(380px, 100%); box-sizing: border-box; display: grid; gap: 14px; padding: 20px;
  background: var(--painel, #fffaf0); color: var(--tinta, #3b2a1e); border-radius: 22px;
  box-shadow: 0 8px 0 var(--painel-borda, #f0d9b0), 0 20px 40px rgba(40, 25, 10, 0.35);
  font: 700 1rem var(--jogo, system-ui);
}
.dialogo h2 { margin: 0; font: 700 1.25rem var(--display, system-ui); color: var(--titulo, #b5531a); }
.dialogo p { margin: 0; line-height: 1.4; font-weight: 600; overflow-wrap: anywhere; }
.dialogo input {
  width: 100%; box-sizing: border-box; padding: 12px 14px; border: 0; border-radius: 12px;
  background: var(--poco, #f3e6cc); color: var(--tinta, #3b2a1e); font: 700 1rem var(--jogo, system-ui);
  box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
.dialogo input:focus-visible { outline: 3px solid var(--azul, #5aa7ff); outline-offset: 2px; }
.dialogo .botoes { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
.dialogo .botoes .btn { min-height: 44px; padding: 8px 18px; }
`;

let estiloPosto = false;

export interface OpcoesDialogo {
  titulo: string;
  texto?: string;
  /** Com campo de texto: o valor inicial (e o diálogo devolve o texto digitado). */
  campo?: string;
  confirmar?: string;
  cancelar?: string;
  /** Ação que não tem volta (excluir): o botão de confirmar fica vermelho. */
  perigo?: boolean;
}

/** Abre o diálogo. Devolve o texto (com campo), true (sem campo) ou null se cancelou. */
export function perguntar(op: OpcoesDialogo): Promise<string | true | null> {
  if (!estiloPosto) {
    const st = document.createElement('style');
    st.textContent = CSS_DIALOGO;
    document.head.appendChild(st);
    estiloPosto = true;
  }
  return new Promise((resolver) => {
    const fundo = document.createElement('div');
    fundo.className = 'dialogo-fundo';
    fundo.setAttribute('data-dialogo', '');
    const caixa = document.createElement('div');
    caixa.className = 'dialogo';
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-modal', 'true');
    const h = document.createElement('h2');
    h.textContent = op.titulo;
    caixa.setAttribute('aria-label', op.titulo);
    caixa.appendChild(h);
    if (op.texto) {
      const p = document.createElement('p');
      p.textContent = op.texto;
      caixa.appendChild(p);
    }
    let campo: HTMLInputElement | null = null;
    if (op.campo !== undefined) {
      campo = document.createElement('input');
      campo.type = 'text';
      campo.value = op.campo;
      campo.maxLength = 40;
      campo.setAttribute('data-dialogo-campo', '');
      caixa.appendChild(campo);
    }
    const botoes = document.createElement('div');
    botoes.className = 'botoes';
    const nao = document.createElement('button');
    nao.type = 'button';
    nao.className = 'btn';
    nao.textContent = op.cancelar ?? 'Cancelar';
    nao.setAttribute('data-dialogo-cancelar', '');
    const sim = document.createElement('button');
    sim.type = 'button';
    sim.className = op.perigo ? 'btn perigo' : 'btn primario';
    sim.textContent = op.confirmar ?? 'Confirmar';
    sim.setAttribute('data-dialogo-confirmar', '');
    botoes.append(nao, sim);
    caixa.appendChild(botoes);
    fundo.appendChild(caixa);
    const fechar = (v: string | true | null) => {
      fundo.remove();
      window.removeEventListener('keydown', tecla, true);
      resolver(v);
    };
    const confirmar = () => fechar(campo ? campo.value : true);
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        fechar(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        confirmar();
      } else e.stopPropagation();
    };
    nao.addEventListener('click', () => fechar(null));
    sim.addEventListener('click', confirmar);
    fundo.addEventListener('click', (e) => {
      if (e.target === fundo) fechar(null);
    });
    window.addEventListener('keydown', tecla, true);
    document.body.appendChild(fundo);
    (campo ?? sim).focus();
    campo?.select();
  });
}
