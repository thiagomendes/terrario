import { criarSeletorTemas } from './temasUi';
import { obterTema } from '../temas';
import type { IdTema } from '../temas/tipos';
import { carregarAparencia, salvarAparencia } from '../personagem/persistencia';
import { botaoFechar } from './pixicones';
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
  max-height: min(86dvh, 900px);
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
.modal header .botao-fechar { position: static; flex: 0 0 auto; }
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
.chip.tema { color: #120e16; background: var(--acento, #ffd98f); }
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

/** Modais abertos, do mais antigo ao do topo (só o do topo responde ao Esc). */
const pilhaModais: { fechar(): void }[] = [];

/** Valor de body.dataset.overlay a devolver ao fechar (só se ainda fizer sentido). */
export function overlayAoFechar(
  anterior: string | undefined,
  pausaAberta: boolean,
): string | undefined {
  if (anterior === 'pausa' && !pausaAberta) return undefined;
  return anterior;
}

/**
 * Cria um modal genérico com título e corpo.
 * Com `overlay`, grava document.body.dataset.overlay enquanto aberto (o jogo não pausa por
 * baixo) e devolve o valor anterior ao fechar (ex.: configurações abertas pela pausa).
 * Ao abrir, foca o botão fechar; Esc fecha; ao fechar, o foco volta para onde estava.
 */
export function criarModal(titulo: string, atributo: string, overlay?: string) {
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
  const botaoX = botaoFechar(() => fecharModal());
  botaoX.classList.add('fechar');
  cab.append(h, botaoX);
  const corpo = document.createElement('div');
  corpo.className = 'corpo';
  modal.append(cab, corpo);
  fundo.appendChild(modal);

  let aberto = false;
  let anterior: string | undefined;
  let focoAntes: HTMLElement | null = null;
  const aoFecharLista: (() => void)[] = [];
  const api = { fechar: () => fecharModal() };
  const aoTecla = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || !aberto || pilhaModais[pilhaModais.length - 1] !== api) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    fecharModal();
  };
  function abrirModal(): void {
    if (aberto) return;
    aberto = true;
    anterior = document.body.dataset.overlay;
    if (overlay) document.body.dataset.overlay = overlay;
    const ativo = document.activeElement;
    focoAntes = ativo instanceof HTMLElement && ativo !== document.body ? ativo : null;
    fundo.hidden = false;
    pilhaModais.push(api);
    window.addEventListener('keydown', aoTecla, true);
    botaoX.focus({ preventScroll: true });
  }
  function fecharModal(): void {
    if (!aberto) return;
    aberto = false;
    fundo.hidden = true;
    const i = pilhaModais.indexOf(api);
    if (i >= 0) pilhaModais.splice(i, 1);
    window.removeEventListener('keydown', aoTecla, true);
    if (overlay && document.body.dataset.overlay === overlay) {
      const volta = overlayAoFechar(
        anterior,
        !!document.querySelector('.pausa-fundo:not([hidden])'),
      );
      if (volta) document.body.dataset.overlay = volta;
      else delete document.body.dataset.overlay;
    }
    if (focoAntes?.isConnected && !focoAntes.closest('[hidden]')) {
      focoAntes.focus({ preventScroll: true });
    }
    focoAntes = null;
    for (const f of aoFecharLista) f();
  }
  // quem esconder o fundo direto (fundo.hidden = true) também passa pelo fechamento
  new MutationObserver(() => {
    if (fundo.hidden && aberto) fecharModal();
    else if (!fundo.hidden && !aberto) abrirModal();
  }).observe(fundo, { attributes: true, attributeFilter: ['hidden'] });
  fundo.addEventListener('click', (e) => {
    e.stopPropagation();
    if (e.target === fundo) fecharModal();
  });
  fundo.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') fecharModal();
  });
  // teclado virtual (iOS): o campo focado rola para a área visível
  fundo.addEventListener('focusin', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo.matches?.('input, textarea')) {
      setTimeout(() => alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
    }
  });
  return {
    fundo,
    corpo,
    titulo: h,
    abrir: abrirModal,
    fechar: fecharModal,
    get aberto() {
      return aberto;
    },
    /** Chamado sempre que o modal fecha (X, fundo, Esc ou código). */
    aoFechar(f: () => void) {
      aoFecharLista.push(f);
    },
  };
}

export interface OpcoesPainelMundos {
  repo: RepositorioMundos;
  atual: MetaMundo | null;
  abrir(id: string): void;
}

export function criarPainelMundos(raiz: HTMLElement, op: OpcoesPainelMundos) {
  const modal = criarModal('Mundos', 'data-painel-mundos', 'mundos');
  const { fundo, corpo } = modal;
  raiz.appendChild(fundo);

  const lista = document.createElement('div');
  lista.className = 'lista-mundos';

  // Formulário de novo mundo
  const form = document.createElement('form');
  form.className = 'form-novo';
  form.innerHTML = `
    <h3>Novo mundo</h3>
    <div class="campo">Tema<div data-seletor-temas></div></div>
    <label class="visual-tema"><input type="checkbox" data-visual-tema> <span data-visual-tema-texto></span></label>
    <div class="linha">
      <label class="campo">Nome<input name="nome" maxlength="${TAMANHO_MAXIMO_NOME_MUNDO}" placeholder="Meu mundo" data-novo-nome></label>
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
  // tema: cartões com prévia; a aparência sugerida do tema é opcional (não troca sozinha)
  const textoVisual = form.querySelector('[data-visual-tema-texto]') as HTMLElement;
  const caixaVisual = form.querySelector('[data-visual-tema]') as HTMLInputElement;
  const seletor = criarSeletorTemas((id) => {
    const t = obterTema(id);
    const temVisual = Object.keys(t.personagem).length > 0;
    caixaVisual.closest('label')!.hidden = !temVisual;
    caixaVisual.checked = false;
    textoVisual.textContent = `Vestir meu personagem com o visual de ${t.nome}`;
  });
  form.querySelector('[data-seletor-temas]')!.replaceWith(seletor.elemento);
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
    const tema = seletor.valor;
    if (caixaVisual.checked) {
      try {
        const loja = window.localStorage;
        salvarAparencia(loja, { ...carregarAparencia(loja), ...obterTema(tema).personagem });
      } catch {
        // sem armazenamento: o mundo abre com o personagem de sempre
      }
    }
    const meta = await op.repo.criar(nome || 'Novo mundo', semente, modo, tema);
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
      const chipTema = document.createElement('span');
      chipTema.className = 'chip tema';
      const tm = obterTema(m.tema);
      chipTema.textContent = tm.nome;
      chipTema.style.setProperty('--acento', tm.cores.acento);
      det.append(chip, ' ', chipTema, ` · semente ${m.semente} · ${formatarData(m.jogadoEm)}`);
      info.append(nome, det);
      const acoes = document.createElement('div');
      acoes.className = 'acoes';
      const jogar = document.createElement('button');
      jogar.type = 'button';
      jogar.className = 'btn primario';
      jogar.textContent = op.atual?.id === m.id ? 'Continuar' : 'Jogar';
      jogar.addEventListener('click', () => {
        if (op.atual?.id === m.id) modal.fechar();
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
      modal.abrir();
      (form.querySelector('[data-novo-nome]') as HTMLInputElement).value = '';
    },
    /** Abre já no formulário de mundo novo, com o tema escolhido. */
    async criarComTema(id: IdTema) {
      await render();
      modal.abrir();
      seletor.definir(id);
      (form.querySelector('[data-novo-nome]') as HTMLInputElement).value = '';
      form.scrollIntoView({ block: 'start' });
      (form.querySelector(`[data-tema="${id}"]`) as HTMLElement | null)?.focus();
    },
    elemento: fundo,
  };
}

export { SEMENTE_PADRAO_MUNDO };
