import { perguntar } from './dialogo';
import { criarSeletorTemas } from './temasUi';
import { obterTema, TEMA_PADRAO } from '../temas';
import type { IdTema } from '../temas/tipos';
import { carregarAparencia, salvarAparencia } from '../personagem/persistencia';
import { botaoFechar } from './pixicones';
import { marcarMundoNovo } from './sugestaoFantasia';
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
  background: rgba(60, 45, 80, 0.32);
  backdrop-filter: blur(6px) saturate(0.95);
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
  border: 0;
  border-radius: 24px;
  background: var(--painel);
  box-shadow: 0 8px 0 var(--painel-borda), 0 22px 40px rgba(40, 25, 10, 0.35);
  color: var(--tinta);
  font-family: var(--jogo);
  animation: cartao-entra 0.22s ease-out;
  overflow: hidden;
}
.modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px 10px 22px;
}
.modal h2 { margin: 0; font: 700 1.5rem/1.1 var(--display); color: var(--titulo); }
.modal .corpo { padding: 8px 22px 22px; overflow-y: auto; }
.modal header .botao-fechar { position: static; flex: 0 0 auto; }
.lista-mundos { display: grid; gap: 12px; }
.cartao-mundo-item {
  display: grid; grid-template-columns: 128px 1fr auto; gap: 14px; align-items: center;
  padding: 10px; border-radius: 18px; background: var(--poco); box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
.cartao-mundo-item.atual { background: #fff1cc; box-shadow: inset 0 0 0 3px var(--amarela); }
.cartao-mundo-item .mini {
  width: 128px; aspect-ratio: 16 / 9; border-radius: 12px; object-fit: cover;
  background: linear-gradient(160deg, #8cc4ff, #ffe0b0 70%, #7fd06a 71%);
  box-shadow: 0 3px 0 rgba(120, 80, 30, 0.2);
}
.cartao-mundo-item .nome { font: 700 1.08rem/1.2 var(--display); color: var(--tinta); }
.cartao-mundo-item .detalhe { margin-top: 4px; font-size: 0.82rem; font-weight: 600; color: var(--tinta-suave); display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.cartao-mundo-item .acoes { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.chip { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 0.74rem; font-weight: 800; }
.chip.criativo { background: #d8ebff; color: #1d4f99; }
.chip.sobrevivencia { background: #ffe0d6; color: #9a2f12; }
.chip.tema { color: var(--tinta); background: color-mix(in srgb, var(--acento, #ffd98f), white 45%); }
.form-novo { display: grid; gap: 14px; margin-top: 20px; padding-top: 18px; border-top: 2px dashed var(--painel-borda); }
.form-novo h3 { margin: 0; font: 700 1.2rem var(--display); color: var(--titulo); }
.campo { display: grid; gap: 6px; font-size: 0.86rem; font-weight: 800; color: var(--tinta); }
.campo input {
  min-height: 46px; padding: 8px 14px; box-sizing: border-box; border-radius: 14px; border: 0;
  background: var(--poco); color: var(--tinta); font: 700 1rem var(--jogo);
  box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
.campo input::placeholder { color: var(--tinta-suave); font-weight: 600; }
.campo input:focus { outline: 3px solid var(--azul); outline-offset: 1px; }
/* Criativo / Sobrevivência: duas peças lado a lado, a escolhida em amarelo */
.segmentado { display: inline-flex; gap: 10px; padding-bottom: 5px; }
.segmentado button {
  min-height: 44px; padding: 6px 16px; border: 0; border-radius: 14px; cursor: pointer; color: var(--tinta);
  font: 800 0.92rem var(--jogo);
  background: linear-gradient(to bottom, #fffdf6, var(--creme) 50%, #f6ead2);
  box-shadow: 0 4px 0 var(--creme-fundo), 0 7px 12px rgba(60, 35, 10, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.8);
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}
.segmentado button:active { transform: translateY(3px); box-shadow: 0 1px 0 var(--creme-fundo); }
.segmentado button:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
.segmentado button[aria-pressed='true'] {
  background: linear-gradient(to bottom, #ffe39a, var(--amarela) 55%, #f5b42e);
  box-shadow: 0 4px 0 var(--amarela-fundo), 0 7px 12px rgba(60, 35, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.6);
}
.chip.amigos { background: #dff5d6; color: #2f6b1c; }
.chip.codigo { background: #fff1cc; color: var(--tinta); letter-spacing: 0.04em; }
/* jogar com amigos (spec 011): chave grande com explicação curta */
.chave-amigos {
  display: flex; gap: 12px; align-items: center; min-height: 56px; padding: 10px 14px; border-radius: 16px;
  background: #eef8e8; box-shadow: inset 0 3px 0 rgba(60, 110, 40, 0.12); cursor: pointer; color: var(--tinta);
}
.chave-amigos[hidden] { display: none; }
.chave-amigos input { width: 26px; height: 26px; flex: none; accent-color: #4caa3a; }
.chave-amigos span { display: grid; gap: 2px; }
.chave-amigos b { font: 800 1rem var(--jogo); }
.chave-amigos small { font-weight: 600; color: var(--tinta-suave); line-height: 1.35; }
.campo[hidden] { display: none; }
.erro-novo { min-height: 0; color: var(--vermelha); font-weight: 800; }
.erro-novo:empty { display: none; }
.linha.fim { justify-content: flex-end; }
.linha { display: flex; gap: 12px; flex-wrap: wrap; align-items: end; }
.linha > .campo { flex: 1 1 200px; }
@media (max-width: 560px) {
  .modal header { padding: 16px 16px 8px 18px; }
  .modal .corpo { padding: 6px 16px 18px; }
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
    // um diálogo aberto por cima (renomear, excluir) cuida do próprio Esc
    if (document.querySelector('[data-dialogo]')) return;
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
  /** Mundo novo já com amigos: cria na nuvem e entra (rejeita com a mensagem a mostrar). */
  criarComAmigos?(meta: MetaMundo, apelido: string): Promise<void>;
  sugestaoApelido?(tema: string): string;
  /** Mundo do aparelho passa a ser com amigos (vai para a nuvem e abre com o convite). */
  levarParaAmigos?(meta: MetaMundo): Promise<void>;
  /** Mundo com amigos volta para o aparelho (só o dono). Rejeita com a mensagem a mostrar. */
  pararComAmigos?(meta: MetaMundo): Promise<void>;
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
    </div>
    <label class="chave-amigos"><input type="checkbox" data-com-amigos>
      <span><b>Jogar com amigos</b><small>O mundo fica na nuvem e ganha um código para os amigos entrarem.</small></span></label>
    <label class="campo" data-campo-apelido-novo hidden>Seu nome para os amigos
      <input name="apelido" maxlength="22" autocomplete="nickname" data-novo-apelido></label>
    <div class="erro-novo" role="alert" data-erro-novo></div>
    <div class="linha fim">
      <button type="submit" class="btn primario" data-criar-mundo>Criar e jogar</button>
    </div>`;
  // jogar com amigos (spec 011): o campo do nome aparece logo abaixo, já preenchido
  const comAmigos = form.querySelector('[data-com-amigos]') as HTMLInputElement;
  const campoApelido = form.querySelector('[data-campo-apelido-novo]') as HTMLElement;
  const inputApelido = form.querySelector('[data-novo-apelido]') as HTMLInputElement;
  const erroNovo = form.querySelector('[data-erro-novo]') as HTMLElement;
  const botaoCriar = form.querySelector('[data-criar-mundo]') as HTMLButtonElement;
  comAmigos.closest('label')!.hidden = !op.criarComAmigos;
  // a sugestão de nome acompanha o tema escolhido (até a criança escrever o dela)
  let nomeEscrito = false;
  inputApelido.addEventListener('input', () => (nomeEscrito = true));
  form.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('[data-tema]') || nomeEscrito || !comAmigos.checked)
      return;
    requestAnimationFrame(() => (inputApelido.value = op.sugestaoApelido?.(seletor.valor) ?? ''));
  });
  comAmigos.addEventListener('change', () => {
    campoApelido.hidden = !comAmigos.checked;
    botaoCriar.textContent = comAmigos.checked ? 'Criar e chamar os amigos' : 'Criar e jogar';
    if (comAmigos.checked && !inputApelido.value)
      inputApelido.value = op.sugestaoApelido?.(seletor.valor) ?? '';
  });
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
    // spec 017: a página do mundo novo sugere uma vez a fantasia do tema
    try {
      marcarMundoNovo(window.localStorage, meta.id);
    } catch {
      // sem armazenamento: o mundo abre sem sugestão
    }
    if (comAmigos.checked && op.criarComAmigos) {
      erroNovo.textContent = '';
      botaoCriar.disabled = true;
      botaoCriar.textContent = 'Criando o mundo na nuvem…';
      try {
        await op.criarComAmigos(meta, inputApelido.value);
        return;
      } catch (err) {
        // não deu (sem internet, servidor): nada fica pela metade; dá para tentar de novo ou
        // desligar "Jogar com amigos" e criar só no aparelho
        await op.repo.excluir(meta.id);
        erroNovo.textContent = `${err instanceof Error ? err.message : String(err)} Tente de novo, ou desligue "Jogar com amigos" para criar só no aparelho.`;
        botaoCriar.disabled = false;
        botaoCriar.textContent = 'Criar e chamar os amigos';
        await render();
        return;
      }
    }
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
      det.append(chip, ' ', chipTema);
      // mundo com amigos: o selo e o código (abrir entra direto, como pelo link)
      if (m.nuvem) {
        const ca = document.createElement('span');
        ca.className = 'chip amigos';
        ca.textContent = 'com amigos';
        ca.setAttribute('data-selo-amigos', '');
        const cc = document.createElement('span');
        cc.className = 'chip codigo';
        cc.textContent = m.nuvem;
        det.append(' ', ca, ' ', cc);
      }
      det.append(` · ${formatarData(m.jogadoEm)}`);
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
        const novo = await perguntar({
          titulo: 'Renomear mundo',
          campo: m.nome,
          confirmar: 'Salvar nome',
        });
        if (typeof novo !== 'string') return;
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
        const ok = await perguntar({
          titulo: 'Excluir mundo',
          texto: `Excluir "${m.nome}" para sempre? Não dá para desfazer.`,
          confirmar: 'Excluir',
          perigo: true,
        });
        if (ok !== true) return;
        await op.repo.excluir(m.id);
        await render();
      });
      // jogar com amigos direto da lista (spec 011): ligar leva para a nuvem; parar traz de volta
      const amigos = document.createElement('button');
      amigos.type = 'button';
      const nuvem = !!m.nuvem;
      amigos.className = nuvem ? 'btn' : 'btn azul';
      amigos.textContent = nuvem ? 'Parar com amigos' : 'Jogar com amigos';
      amigos.setAttribute(nuvem ? 'data-parar-amigos' : 'data-ligar-amigos', '');
      amigos.hidden = nuvem ? !op.pararComAmigos : !op.levarParaAmigos;
      amigos.addEventListener('click', async () => {
        if (nuvem) {
          const ok = await perguntar({
            titulo: 'Parar de jogar com amigos',
            texto: `"${m.nome}" volta inteiro para este aparelho, com tudo o que os amigos construíram. O código deixa de valer.`,
            confirmar: 'Trazer o mundo de volta',
            perigo: true,
          });
          if (ok !== true) return;
        }
        amigos.disabled = true;
        amigos.textContent = nuvem ? 'Trazendo o mundo…' : 'Levando para a nuvem…';
        try {
          if (nuvem) {
            await op.pararComAmigos!(m);
            await render();
          } else await op.levarParaAmigos!(m);
        } catch (err) {
          amigos.disabled = false;
          amigos.textContent = nuvem ? 'Parar com amigos' : 'Jogar com amigos';
          const msg = err instanceof Error ? err.message : String(err);
          if (msg !== 'cancelado')
            await perguntar({ titulo: 'Não deu certo', texto: msg, confirmar: 'Entendi' });
        }
      });
      acoes.append(jogar, amigos, renomear, excluir);
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
      // cada abertura começa do jeito padrão (tema base, sem trocar o visual)
      seletor.definir(TEMA_PADRAO);
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
