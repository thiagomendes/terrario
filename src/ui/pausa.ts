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
`;

export interface AcoesPausa {
  continuar(): void;
  configuracoes(): void;
  mundos(): void;
  salvar(): void;
  telaInicial(): void;
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
  const botao = (rot: string, classe: string, f: () => void, attr: string) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `btn ${classe}`;
    b.textContent = rot;
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
    botao('⚙ Configurações', '', acoes.configuracoes, 'data-pausa-config'),
    botao('🌍 Mundos', '', acoes.mundos, 'data-pausa-mundos'),
  );
  card.append(
    h,
    m,
    botao('Continuar', 'primario', acoes.continuar, 'data-pausa-continuar'),
    dupla,
    botao('💾 Salvar agora', '', acoes.salvar, 'data-pausa-salvar'),
    botao('Tela inicial', '', acoes.telaInicial, 'data-pausa-inicio'),
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
    },
    fechar() {
      fundo.hidden = true;
      if (document.body.dataset.overlay === 'pausa') delete document.body.dataset.overlay;
    },
  };
}
