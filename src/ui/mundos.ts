import {
  SEMENTE_PADRAO_MUNDO,
  TAMANHO_MAXIMO_NOME_MUNDO,
  sementeDeTexto,
  type MetaMundo,
  type ModoJogo,
  type RepositorioMundos,
} from '../jogo/mundos';

export const CSS_MODAL = `
.modal-fundo {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  box-sizing: border-box;
  background: rgba(6, 8, 14, 0.62);
  backdrop-filter: blur(6px);
  animation: modal-entra 0.18s ease-out;
  cursor: default;
}
.modal-fundo[hidden] { display: none; }
@keyframes modal-entra { from { opacity: 0; } to { opacity: 1; } }
@keyframes cartao-entra { from { transform: translateY(12px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
.modal {
  width: min(760px, 100%);
  max-height: min(86vh, 900px);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(30, 32, 46, 0.96), rgba(18, 19, 28, 0.97));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);
  color: #ece6da;
  font-family: system-ui, 'Segoe UI', sans-serif;
  animation: cartao-entra 0.22s ease-out;
  overflow: hidden;
}
.modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.modal h2 { margin: 0; font-size: 1.2rem; color: #ffd98f; letter-spacing: 0.02em; }
.modal .corpo { padding: 16px 20px; overflow-y: auto; }
.modal .fechar {
  width: 36px; height: 36px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.05); color: #ece6da; font-size: 1.1rem; cursor: pointer;
}
.modal .fechar:hover { background: rgba(255,255,255,0.12); }
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  min-height: 40px; padding: 8px 16px; box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.14); border-radius: 10px;
  background: rgba(255, 255, 255, 0.06); color: #ece6da;
  font: 600 0.92rem system-ui, sans-serif; cursor: pointer;
  transition: background 0.12s ease, transform 0.12s ease, border-color 0.12s ease;
}
.btn:hover { background: rgba(255, 255, 255, 0.12); transform: translateY(-1px); }
.btn:focus-visible { outline: 2px solid #ffd98f; outline-offset: 2px; }
.btn.primario { border-color: #ffc46b; background: linear-gradient(180deg, #ffcf7a, #f0a94a); color: #2a1a08; }
.btn.primario:hover { background: linear-gradient(180deg, #ffd98f, #f5b45a); }
.btn.perigo { border-color: rgba(255, 110, 110, 0.4); color: #ffb3b3; }
.btn.perigo:hover { background: rgba(255, 90, 90, 0.16); }
.lista-mundos { display: grid; gap: 10px; }
.cartao-mundo-item {
  display: grid; grid-template-columns: 128px 1fr auto; gap: 14px; align-items: center;
  padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
}
.cartao-mundo-item.atual { border-color: rgba(255, 207, 122, 0.55); background: rgba(255, 207, 122, 0.06); }
.cartao-mundo-item .mini {
  width: 128px; aspect-ratio: 16 / 9; border-radius: 8px; object-fit: cover;
  background: linear-gradient(160deg, #5a8fd6, #f5c28a 70%, #3d7a2c 71%);
}
.cartao-mundo-item .nome { font-weight: 700; font-size: 1rem; }
.cartao-mundo-item .detalhe { margin-top: 4px; font-size: 0.8rem; color: #b9b2a6; }
.cartao-mundo-item .acoes { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
.chip { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.72rem; font-weight: 700; }
.chip.criativo { background: rgba(110, 200, 255, 0.16); color: #9fd8ff; }
.chip.sobrevivencia { background: rgba(255, 130, 100, 0.16); color: #ffb39f; }
.form-novo { display: grid; gap: 12px; margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); }
.form-novo h3 { margin: 0; font-size: 1rem; color: #ffd98f; }
.campo { display: grid; gap: 6px; font-size: 0.82rem; color: #b9b2a6; }
.campo input {
  min-height: 40px; padding: 8px 12px; box-sizing: border-box; border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.25); color: #ece6da; font: 500 0.95rem system-ui, sans-serif;
}
.campo input:focus { outline: 2px solid #ffd98f; outline-offset: 1px; }
.segmentado { display: inline-flex; padding: 3px; border-radius: 12px; background: rgba(0,0,0,0.3); gap: 3px; }
.segmentado button {
  min-height: 36px; padding: 6px 14px; border: 0; border-radius: 9px; background: transparent; color: #b9b2a6;
  font: 600 0.88rem system-ui, sans-serif; cursor: pointer;
}
.segmentado button[aria-pressed='true'] { background: rgba(255,255,255,0.12); color: #fff; }
.linha { display: flex; gap: 12px; flex-wrap: wrap; align-items: end; }
.linha > .campo { flex: 1 1 200px; }
@media (max-width: 560px) {
  .cartao-mundo-item { grid-template-columns: 88px 1fr; }
  .cartao-mundo-item .mini { width: 88px; }
  .cartao-mundo-item .acoes { grid-column: 1 / -1; justify-content: flex-start; }
}
`;

export function formatarData(ms: number): string {
  const d = new Date(ms);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function rotuloModo(m: ModoJogo): string {
  return m === 'criativo' ? 'Criativo' : 'Sobrevivência';
}

/** Cria um modal genérico com título e corpo; devolve o fundo e o corpo. */
export function criarModal(titulo: string, atributo: string) {
  const fundo = document.createElement('div');
  fundo.className = 'modal-fundo';
  fundo.hidden = true;
  fundo.setAttribute(atributo, '');
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', titulo);
  const cab = document.createElement('header');
  const h = document.createElement('h2');
  h.textContent = titulo;
  const fechar = document.createElement('button');
  fechar.type = 'button';
  fechar.className = 'fechar';
  fechar.setAttribute('aria-label', 'Fechar');
  fechar.textContent = '✕';
  cab.append(h, fechar);
  const corpo = document.createElement('div');
  corpo.className = 'corpo';
  modal.append(cab, corpo);
  fundo.appendChild(modal);
  const fecharModal = () => {
    fundo.hidden = true;
  };
  fechar.addEventListener('click', fecharModal);
  fundo.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === fundo) fecharModal();
  });
  fundo.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') fecharModal();
  });
  return { fundo, corpo, titulo: h, fechar: fecharModal };
}

export interface OpcoesPainelMundos {
  repo: RepositorioMundos;
  atual: MetaMundo | null;
  abrir(id: string): void;
}

export function criarPainelMundos(raiz: HTMLElement, op: OpcoesPainelMundos) {
  const { fundo, corpo } = criarModal('Mundos', 'data-painel-mundos');
  raiz.appendChild(fundo);

  const lista = document.createElement('div');
  lista.className = 'lista-mundos';

  // Formulário de novo mundo
  const form = document.createElement('form');
  form.className = 'form-novo';
  form.innerHTML = `
    <h3>Novo mundo</h3>
    <div class="linha">
      <label class="campo">Nome<input name="nome" maxlength="${TAMANHO_MAXIMO_NOME_MUNDO}" placeholder="Vale da Bruma" data-novo-nome></label>
      <label class="campo">Semente (opcional)<input name="semente" placeholder="aleatória" data-novo-semente></label>
    </div>
    <div class="linha">
      <div class="campo">Modo
        <div class="segmentado" role="group" aria-label="Modo de jogo">
          <button type="button" data-modo="criativo" aria-pressed="true">Criativo</button>
          <button type="button" data-modo="sobrevivencia" aria-pressed="false">Sobrevivência</button>
        </div>
      </div>
      <button type="submit" class="btn primario" data-criar-mundo>Criar e jogar</button>
    </div>`;
  let modo: ModoJogo = 'criativo';
  form.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach((b) => {
    b.addEventListener('click', () => {
      modo = b.dataset.modo as ModoJogo;
      form
        .querySelectorAll<HTMLButtonElement>('[data-modo]')
        .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    });
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = (form.querySelector('[data-novo-nome]') as HTMLInputElement).value;
    const txt = (form.querySelector('[data-novo-semente]') as HTMLInputElement).value;
    const semente = sementeDeTexto(txt, Math.random);
    const meta = await op.repo.criar(nome || 'Novo mundo', semente, modo);
    op.abrir(meta.id);
  });

  async function render(): Promise<void> {
    const mundos = await op.repo.listar();
    lista.replaceChildren();
    for (const m of mundos) {
      const item = document.createElement('div');
      item.className = 'cartao-mundo-item';
      item.dataset.mundo = m.id;
      if (op.atual?.id === m.id) item.classList.add('atual');
      const mini = document.createElement('img');
      mini.className = 'mini';
      mini.alt = '';
      if (m.miniatura) mini.src = m.miniatura;
      const info = document.createElement('div');
      const nome = document.createElement('div');
      nome.className = 'nome';
      nome.textContent = m.nome;
      const det = document.createElement('div');
      det.className = 'detalhe';
      const chip = document.createElement('span');
      chip.className = `chip ${m.modo}`;
      chip.textContent = rotuloModo(m.modo);
      det.append(chip, ` · semente ${m.semente} · ${formatarData(m.jogadoEm)}`);
      info.append(nome, det);
      const acoes = document.createElement('div');
      acoes.className = 'acoes';
      const jogar = document.createElement('button');
      jogar.type = 'button';
      jogar.className = 'btn primario';
      jogar.textContent = op.atual?.id === m.id ? 'Continuar' : 'Jogar';
      jogar.addEventListener('click', () => {
        if (op.atual?.id === m.id) fundo.hidden = true;
        else op.abrir(m.id);
      });
      const renomear = document.createElement('button');
      renomear.type = 'button';
      renomear.className = 'btn';
      renomear.textContent = 'Renomear';
      renomear.addEventListener('click', async () => {
        const novo = window.prompt('Novo nome do mundo', m.nome);
        if (novo === null) return;
        await op.repo.renomear(m.id, novo);
        await render();
      });
      const excluir = document.createElement('button');
      excluir.type = 'button';
      excluir.className = 'btn perigo';
      excluir.textContent = 'Excluir';
      excluir.disabled = op.atual?.id === m.id;
      excluir.title = excluir.disabled ? 'Não dá para excluir o mundo aberto' : '';
      excluir.addEventListener('click', async () => {
        if (!window.confirm(`Excluir "${m.nome}" para sempre?`)) return;
        await op.repo.excluir(m.id);
        await render();
      });
      acoes.append(jogar, renomear, excluir);
      item.append(mini, info, acoes);
      lista.appendChild(item);
    }
  }

  corpo.append(lista, form);
  return {
    async abrir() {
      await render();
      fundo.hidden = false;
      (form.querySelector('[data-novo-nome]') as HTMLInputElement).value = '';
    },
    elemento: fundo,
  };
}

export { SEMENTE_PADRAO_MUNDO };
