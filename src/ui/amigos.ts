import { perguntar } from './dialogo';
/**
 * Jogar com amigos (spec 010): entrar com código, o painel do convite (código ilustrado,
 * copiar, compartilhar, QR Code), quem está no mundo, o painel do dono e os avisos de
 * conexão. Tudo com textos para crianças: nada de "erro 1006".
 */
import qrcode from 'qrcode-generator';
import { criarModal } from './mundos';
import { normalizarCodigo } from '../jogo/codigos';
import type { EstadoSala, MotivoRecusa } from '../rede/protocolo';
import type { EstadoConexao } from '../cliente/conexaoNuvem';

export const CSS_AMIGOS = `
.amigos .campo { display: grid; gap: 6px; margin: 0 0 14px; }
.amigos label { font-weight: 800; color: var(--tinta); }
.amigos input[type=text] {
  font: 900 1.5rem var(--jogo); letter-spacing: 0.08em; text-transform: uppercase;
  padding: 12px 14px; min-height: 56px; border-radius: 16px; border: 0;
  background: var(--poco); color: var(--tinta); width: 100%; box-sizing: border-box; box-shadow: var(--sombra-poco);
}
.amigos input[type=text]::placeholder { color: var(--tinta-suave); letter-spacing: 0.04em; }
.amigos input.apelido { text-transform: none; font: 800 1.2rem var(--jogo); letter-spacing: 0; }
.amigos input:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
.amigos .erro { min-height: 1.4em; color: var(--vermelha); font-weight: 800; }
.amigos .dica { color: var(--tinta-suave); font-weight: 600; margin: 0 0 12px; line-height: 1.45; }
.amigos .acoes { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0 4px; }
.amigos .acoes .btn { min-height: 50px; padding: 0 20px; }
/* código do mundo: cada pedaço é uma peça amarela */
.amigos .codigo { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center; margin: 4px 0 16px; }
.amigos .peca {
  font: 700 clamp(1.4rem, 5vw, 2.2rem) var(--display); letter-spacing: 0.06em; color: var(--tinta);
  background: linear-gradient(to bottom, #ffe39a, var(--amarela) 55%, #f5b42e); padding: 8px 14px; border-radius: 14px;
  box-shadow: 0 5px 0 var(--amarela-fundo), 0 9px 14px rgba(60, 35, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.6);
}
.amigos .ponto { font-size: 1.6rem; font-weight: 900; color: var(--tinta-suave); }
.amigos .qr { display: grid; justify-items: center; gap: 6px; margin: 6px 0 14px; }
.amigos .qr img { width: 168px; height: 168px; image-rendering: pixelated; background: #fff; padding: 10px; border-radius: 16px; box-shadow: 0 4px 0 var(--painel-borda); }
.amigos .qr small { color: var(--tinta-suave); font-weight: 700; }
.amigos .lista { list-style: none; margin: 0 0 12px; padding: 0; display: grid; gap: 8px; }
.amigos .lista li { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 14px; background: var(--poco); box-shadow: var(--sombra-poco); }
.amigos .lista .nome { flex: 1; font-weight: 800; color: var(--tinta); }
.amigos .lista .tag { font-size: 0.8rem; color: var(--tinta); background: #ffe39a; border-radius: 999px; padding: 2px 10px; font-weight: 800; }
.amigos .chave { display: flex; align-items: center; gap: 10px; min-height: 48px; cursor: pointer; font-weight: 800; color: var(--tinta); }
.amigos .chave input { width: 24px; height: 24px; accent-color: var(--azul-peca); }
.amigos .passos { margin: 0 0 14px; padding-left: 1.3em; display: grid; gap: 8px; color: var(--tinta); font-weight: 600; }
/* convite no mundo (spec 011): quem chega brilha; o botão de começar fica grande */
.amigos .lista li.chegou { animation: chegou 1.6s ease-out; }
@keyframes chegou { 0% { box-shadow: 0 0 0 0 rgba(255, 212, 90, 0.9); background: #fff1b8; } 100% { box-shadow: var(--sombra-poco); } }
.amigos .esperando { display: flex; align-items: center; gap: 10px; color: var(--tinta-suave); font-weight: 700; padding: 10px 12px; border-radius: 14px; background: var(--poco); }
.amigos .esperando i { width: 10px; height: 10px; border-radius: 50%; background: var(--amarela-fundo); animation: piscar 1.2s infinite; }
.amigos .comecar { width: 100%; min-height: 56px; font-size: 1.15rem; margin-top: 6px; }
.amigos .devolver { margin-top: 10px; }
@media (prefers-reduced-motion: reduce) { .amigos .lista li.chegou, .amigos .esperando i { animation: none; } }
/* botão fixo de amigos: pílula creme com o número de quem está no mundo */
.botao-amigos {
  position: fixed; z-index: 7; right: max(16px, env(safe-area-inset-right)); top: 226px;
  display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 6px 14px 6px 10px; border: 0; border-radius: 999px;
  background: rgba(255, 250, 240, 0.95); color: var(--tinta); font: 800 0.95rem var(--jogo); cursor: pointer;
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 8px 16px rgba(40, 25, 10, 0.2);
}
.botao-amigos:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
.botao-amigos .rostos { display: inline-flex; }
.botao-amigos .rostos i { width: 22px; height: 22px; border-radius: 50%; border: 2px solid #fffaf0; margin-left: -6px; background: #ffd45a; }
.botao-amigos .rostos i:first-child { margin-left: 0; background: #7cc6ff; }
.botao-amigos .rostos i:nth-child(3) { background: #ff9fb8; }
body[data-overlay] .botao-amigos, body.tela-titulo .botao-amigos, body.modo-foto .botao-amigos { display: none; }
@media (max-width: 700px), (max-height: 520px) { .botao-amigos { top: auto; bottom: calc(118px + env(safe-area-inset-bottom)); right: 12px; } }
/* entrar no mundo de alguém (link ou QR): o tema do mundo em cima, o nome e um botão */
.tela-entrar {
  position: fixed; inset: 0; z-index: 80; display: grid; place-items: center; padding: 16px; overflow: auto;
  background: linear-gradient(180deg, #a9d4ff, #dcefff 60%, #fff4dc); font: 700 1rem var(--jogo, system-ui, sans-serif); color: #3b2a1e;
}
.tela-entrar .cartao {
  width: min(440px, 100%); box-sizing: border-box; border-radius: 24px; overflow: hidden; background: #fffaf0;
  box-shadow: 0 8px 0 #f0d9b0, 0 22px 40px rgba(40, 25, 10, 0.25);
}
.tela-entrar .arte { height: 150px; background: #cfe9fb center / cover no-repeat; position: relative; }
.tela-entrar .arte .chip-tema {
  position: absolute; left: 14px; bottom: 12px; padding: 4px 12px; border-radius: 999px; font: 800 0.82rem var(--jogo, system-ui);
  background: rgba(255, 250, 240, 0.92); color: #3b2a1e;
}
.tela-entrar .miolo { display: grid; gap: 12px; padding: 18px 20px 22px; }
.tela-entrar h2 { margin: 0; font: 700 1.5rem/1.15 var(--display, system-ui, sans-serif); color: #b5531a; overflow-wrap: anywhere; }
.tela-entrar .nome-mundo { margin: -6px 0 0; font-weight: 700; color: #6b5a4a; overflow-wrap: anywhere; }
.tela-entrar .quem { margin: 0; color: #6b5a4a; font-weight: 600; line-height: 1.4; }
.tela-entrar label { display: grid; gap: 6px; font-weight: 800; }
.tela-entrar input {
  min-height: 52px; padding: 10px 14px; box-sizing: border-box; border: 0; border-radius: 14px; width: 100%;
  background: #f3e6cc; color: #3b2a1e; font: 800 1.15rem var(--jogo, system-ui); box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
.tela-entrar input:focus-visible { outline: 3px solid #5aa7ff; outline-offset: 2px; }
.tela-entrar .btn { min-height: 56px; font-size: 1.15rem; }
.tela-entrar .erro { color: #c0392b; font-weight: 800; }
.tela-entrar .erro:empty { display: none; }
.tela-entrar .barra { height: 14px; border-radius: 999px; background: #f3e6cc; box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.14); overflow: hidden; }
.tela-entrar .barra[hidden] { display: none; }
.tela-entrar .barra i { display: block; height: 100%; width: 0; border-radius: 999px; background: linear-gradient(90deg, #ffd45a, #ff9b2f); transition: width 0.4s ease; }
/* avisos de conexão: pílula creme com a bolinha piscando */
.aviso-conexao {
  position: fixed; left: 50%; top: 12px; transform: translateX(-50%); z-index: 60;
  display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 999px;
  background: rgba(255, 250, 240, 0.96); color: var(--tinta); font: 800 0.95rem var(--jogo);
  box-shadow: 0 3px 0 rgba(150, 110, 60, 0.35), 0 8px 18px rgba(40, 25, 10, 0.25); pointer-events: none;
}
.aviso-conexao[hidden] { display: none; }
.aviso-conexao .bolinha { width: 11px; height: 11px; border-radius: 50%; background: var(--amarela-fundo); animation: piscar 1s infinite; }
@keyframes piscar { 50% { opacity: 0.3; } }
@media (prefers-reduced-motion: reduce) { .aviso-conexao .bolinha { animation: none; } }
`;

/** O que dizer para cada recusa do servidor, do jeito de uma criança entender. */
export const TEXTO_RECUSA: Record<
  MotivoRecusa | 'sem-internet' | 'servidor' | 'encerrada',
  string
> = {
  codigo: 'Esse código não existe. Confere com quem te mandou?',
  cheio: 'O mundo está cheio (8 amigos). Tenta daqui a pouco.',
  fechado: 'O dono fechou este mundo para visitas por enquanto.',
  expulso: 'O dono pediu para você sair deste mundo. Que tal jogar no seu?',
  versao: 'Tem uma versão nova do jogo. Recarregue a página para entrar.',
  limite: 'Muitas tentativas de código. Espere uns minutos e tente de novo.',
  identidade: 'Não deu para entrar com este aparelho. Peça um código novo ao dono.',
  erro: 'Algo deu errado do nosso lado. Tente de novo daqui a pouco.',
  'sem-internet': 'Você está sem internet, mas seus mundos do aparelho continuam aqui.',
  encerrada: 'O dono levou este mundo de volta para o aparelho dele. Obrigado por jogar junto!',
  servidor: 'O servidor dos mundos com amigos não respondeu. Tente de novo daqui a pouco.',
};

export function linkDoMundo(codigo: string): string {
  const u = new URL(location.href);
  u.search = '';
  u.hash = '';
  u.searchParams.set('sala', codigo);
  return u.toString();
}

export interface OpcoesEntrar {
  apelido: string;
  /** Tenta entrar; rejeita com a mensagem a mostrar. */
  aoEntrar(codigo: string, apelido: string): Promise<void>;
}

/** "Entrar com código": campo grande, apelido e uma mensagem clara se não der. */
export function criarEntrarComCodigo(raiz: HTMLElement, op: OpcoesEntrar) {
  const m = criarModal('Entrar com código', 'data-entrar-codigo', 'amigos');
  m.corpo.classList.add('amigos');
  const dica = document.createElement('p');
  dica.className = 'dica';
  dica.textContent = 'Peça o código para quem abriu o mundo. São duas palavras e um número.';
  const campo = (rot: string, input: HTMLInputElement) => {
    const c = document.createElement('div');
    c.className = 'campo';
    const l = document.createElement('label');
    l.textContent = rot;
    input.id = `campo-${Math.random().toString(36).slice(2)}`;
    l.htmlFor = input.id;
    c.append(l, input);
    return c;
  };
  const codigo = document.createElement('input');
  codigo.type = 'text';
  codigo.placeholder = 'LUA-COMETA-48';
  codigo.autocomplete = 'off';
  codigo.setAttribute('autocapitalize', 'characters');
  codigo.spellcheck = false;
  codigo.setAttribute('data-campo-codigo', '');
  const apelido = document.createElement('input');
  apelido.type = 'text';
  apelido.className = 'apelido';
  apelido.placeholder = 'Como te chamam?';
  apelido.maxLength = 22;
  apelido.value = op.apelido;
  apelido.setAttribute('data-campo-apelido', '');
  const erro = document.createElement('div');
  erro.className = 'erro';
  erro.setAttribute('role', 'alert');
  const acoes = document.createElement('div');
  acoes.className = 'acoes';
  const entrar = document.createElement('button');
  entrar.type = 'button';
  entrar.className = 'btn primario';
  entrar.textContent = 'Entrar no mundo';
  entrar.setAttribute('data-entrar', '');
  acoes.append(entrar);
  m.corpo.append(
    dica,
    campo('Código do mundo', codigo),
    campo('Seu apelido', apelido),
    erro,
    acoes,
  );
  raiz.appendChild(m.fundo);

  async function tentar(): Promise<void> {
    const c = normalizarCodigo(codigo.value);
    if (!c) {
      erro.textContent =
        'Esse código não parece certo. Escreva as duas palavras e o número, como LUA-COMETA-48.';
      codigo.focus();
      return;
    }
    if (!apelido.value.trim()) {
      erro.textContent = 'Escolha um apelido para os amigos te verem no mundo.';
      apelido.focus();
      return;
    }
    erro.textContent = '';
    entrar.disabled = true;
    entrar.textContent = 'Entrando…';
    try {
      await op.aoEntrar(c, apelido.value);
    } catch (e) {
      erro.textContent = e instanceof Error ? e.message : String(e);
    } finally {
      entrar.disabled = false;
      entrar.textContent = 'Entrar no mundo';
    }
  }
  entrar.addEventListener('click', () => void tentar());
  for (const i of [codigo, apelido])
    i.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') void tentar();
    });
  return {
    abrir(preenchido?: string) {
      if (preenchido) codigo.value = preenchido;
      m.abrir();
      requestAnimationFrame(() => (codigo.value ? apelido : codigo).focus());
    },
    fechar: () => m.fechar(),
  };
}

export interface JogadorNaLista {
  id: string;
  apelido: string;
}

export interface OpcoesPainelAmigos {
  /** Mundo local: leva para a nuvem e devolve quando estiver pronto. */
  abrirParaAmigos?(): Promise<void>;
  /** Mundo na nuvem: comandos do dono. */
  dono?: {
    expulsar(id: string): void;
    trocarCodigo(): void;
    fechar(fechado: boolean): void;
    construir(pode: boolean): void;
    /** Parar de jogar com amigos: o mundo volta inteiro para o aparelho. */
    devolver(): void;
  };
  /** Fechou o convite pelo "Começar a jogar" (o toque serve de gesto: mouse e som). */
  aoComecar?(): void;
}

/** "Jogar com amigos": convite (código, link, QR), quem está no mundo e o painel do dono. */
export function criarPainelAmigos(raiz: HTMLElement, op: OpcoesPainelAmigos) {
  const m = criarModal('Jogar com amigos', 'data-painel-amigos', 'amigos');
  m.corpo.classList.add('amigos');
  raiz.appendChild(m.fundo);
  // tocar fora do cartão fecha (o mundo já está atrás)
  m.fundo.addEventListener('click', (e) => {
    if (e.target === m.fundo) m.fechar();
  });
  let sala: EstadoSala | null = null;
  let eu = '';
  let jogadores: JogadorNaLista[] = [];
  /** Convite de quem acabou de criar: título de boas-vindas e o botão de começar. */
  let modoConvite = false;
  /** Quem já estava na lista (quem chega depois brilha). */
  const vistos = new Set<string>();

  function botao(rot: string, f: () => void, attr: string, classe = 'btn'): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe;
    b.textContent = rot;
    b.setAttribute(attr, '');
    b.addEventListener('click', f);
    return b;
  }

  function desenhar(): void {
    m.corpo.replaceChildren();
    if (!sala) {
      // mundo do aparelho: explica em três passos e leva para a nuvem
      const p = document.createElement('p');
      p.className = 'dica';
      p.textContent =
        'Seus amigos entram no seu mundo e todo mundo joga junto, cada um no seu aparelho.';
      const passos = document.createElement('ol');
      passos.className = 'passos';
      for (const t of [
        'Toque em “Abrir para amigos”: o mundo vai para a nuvem e ganha um código.',
        'Mande o código (ou o QR Code) para quem vai jogar.',
        'Eles tocam em “Entrar com código” na tela de início. Pronto!',
      ]) {
        const li = document.createElement('li');
        li.textContent = t;
        passos.appendChild(li);
      }
      const erro = document.createElement('div');
      erro.className = 'erro';
      erro.setAttribute('role', 'alert');
      const acoes = document.createElement('div');
      acoes.className = 'acoes';
      const abrir = botao(
        'Abrir para amigos',
        async () => {
          abrir.disabled = true;
          abrir.textContent = 'Levando o mundo para a nuvem…';
          try {
            await op.abrirParaAmigos?.();
          } catch (e) {
            // desistiu no diálogo do apelido: só volta o botão
            const msg = e instanceof Error ? e.message : String(e);
            erro.textContent = msg === 'cancelado' ? '' : msg;
            abrir.disabled = false;
            abrir.textContent = 'Abrir para amigos';
          }
        },
        'data-abrir-para-amigos',
        'btn primario',
      );
      acoes.appendChild(abrir);
      m.corpo.append(p, passos, erro, acoes);
      return;
    }
    // código ilustrado: palavras grandes para uma criança ler para outra
    const titulo = document.createElement('p');
    titulo.className = 'dica';
    titulo.textContent = 'Código do mundo:';
    const cod = document.createElement('div');
    cod.className = 'codigo';
    cod.setAttribute('data-codigo-mundo', sala.codigo);
    cod.setAttribute('aria-label', `Código: ${sala.codigo.split('-').join(' ')}`);
    sala.codigo.split('-').forEach((parte, i) => {
      if (i) {
        const pt = document.createElement('span');
        pt.className = 'ponto';
        pt.textContent = '·';
        pt.setAttribute('aria-hidden', 'true');
        cod.appendChild(pt);
      }
      const s = document.createElement('span');
      s.className = 'peca';
      s.textContent = parte;
      cod.appendChild(s);
    });
    const link = linkDoMundo(sala.codigo);
    const qr = document.createElement('div');
    qr.className = 'qr';
    const q = qrcode(0, 'M');
    q.addData(link);
    q.make();
    const img = document.createElement('img');
    img.src = q.createDataURL(4, 2);
    img.alt = 'QR Code para entrar no mundo';
    const leg = document.createElement('small');
    leg.textContent = 'Aponte a câmera do outro celular';
    qr.append(img, leg);
    const acoes = document.createElement('div');
    acoes.className = 'acoes';
    const copiar = botao(
      'Copiar convite',
      async () => {
        try {
          await navigator.clipboard.writeText(
            `Vem jogar Terrário comigo! Código ${sala!.codigo}: ${link}`,
          );
          copiar.textContent = 'Copiado!';
          setTimeout(() => (copiar.textContent = 'Copiar convite'), 1500);
        } catch {
          copiar.textContent = 'Não deu para copiar';
        }
      },
      'data-copiar-convite',
      'btn primario',
    );
    acoes.appendChild(copiar);
    if (typeof navigator.share === 'function') {
      acoes.appendChild(
        botao(
          'Compartilhar',
          () =>
            void navigator
              .share({
                title: 'Terrário',
                text: `Vem jogar comigo! Código ${sala!.codigo}`,
                url: link,
              })
              .catch(() => undefined),
          'data-compartilhar',
        ),
      );
    }
    const quem = document.createElement('p');
    quem.className = 'dica';
    quem.textContent = 'No mundo agora:';
    const lista = document.createElement('ul');
    lista.className = 'lista';
    lista.setAttribute('data-lista-jogadores', '');
    const souDono = sala.dono === eu;
    for (const j of jogadores) {
      const li = document.createElement('li');
      li.setAttribute('data-jogador', j.id);
      if (vistos.size && !vistos.has(j.id)) li.classList.add('chegou');
      const n = document.createElement('span');
      n.className = 'nome';
      n.textContent = j.id === eu ? `${j.apelido} (você)` : j.apelido;
      li.appendChild(n);
      if (j.id === sala.dono) {
        const t = document.createElement('span');
        t.className = 'tag';
        t.textContent = 'dono';
        li.appendChild(t);
      } else if (souDono && op.dono) {
        const b = botao(
          'Pedir para sair',
          async () => {
            const ok = await perguntar({
              titulo: 'Pedir para sair',
              texto: `Pedir para ${j.apelido} sair do mundo? Quem sair não volta com este código.`,
              confirmar: 'Pedir para sair',
              perigo: true,
            });
            if (ok === true) op.dono!.expulsar(j.id);
          },
          'data-expulsar',
        );
        b.setAttribute('aria-label', `Pedir para ${j.apelido} sair`);
        li.appendChild(b);
      }
      lista.appendChild(li);
    }
    for (const j of jogadores) vistos.add(j.id);
    m.corpo.append(titulo, cod, qr, acoes, quem, lista);
    if (jogadores.length <= 1) {
      const esp = document.createElement('div');
      esp.className = 'esperando';
      esp.setAttribute('data-esperando', '');
      const bol = document.createElement('i');
      esp.append(bol, 'Esperando os amigos…');
      m.corpo.append(esp);
    }
    if (modoConvite) {
      const comecar = botao(
        'Começar a jogar',
        () => {
          m.fechar();
          op.aoComecar?.();
        },
        'data-comecar-a-jogar',
        'btn primario comecar',
      );
      m.corpo.append(comecar);
    }
    if (souDono && op.dono) {
      const d = op.dono;
      const chave = (rot: string, marcado: boolean, f: (v: boolean) => void, attr: string) => {
        const l = document.createElement('label');
        l.className = 'chave';
        const c = document.createElement('input');
        c.type = 'checkbox';
        c.checked = marcado;
        c.setAttribute(attr, '');
        c.addEventListener('change', () => f(c.checked));
        l.append(c, rot);
        return l;
      };
      const t = document.createElement('p');
      t.className = 'dica';
      t.textContent = 'Você é o dono deste mundo:';
      m.corpo.append(
        t,
        chave(
          'Visitantes podem construir',
          sala.constroem,
          (v) => d.construir(v),
          'data-constroem',
        ),
        chave('Fechar para novas visitas', sala.fechado, (v) => d.fechar(v), 'data-fechado'),
        botao(
          'Trocar o código',
          async () => {
            const ok = await perguntar({
              titulo: 'Trocar o código',
              texto: 'O código antigo para de funcionar na hora (quem já está no mundo continua).',
              confirmar: 'Trocar',
            });
            if (ok === true) d.trocarCodigo();
          },
          'data-trocar-codigo',
        ),
        botao(
          'Parar de jogar com amigos',
          async () => {
            const ok = await perguntar({
              titulo: 'Parar de jogar com amigos',
              texto:
                'O mundo volta inteiro para este aparelho, com tudo o que os amigos construíram. O código deixa de valer e quem estiver no mundo recebe um aviso.',
              confirmar: 'Trazer o mundo de volta',
              perigo: true,
            });
            if (ok === true) d.devolver();
          },
          'data-devolver-mundo',
          'btn devolver',
        ),
      );
    }
  }

  return {
    abrir() {
      modoConvite = false;
      desenhar();
      m.abrir();
    },
    /** O convite de quem acabou de criar o mundo (com "Começar a jogar"). */
    abrirConvite() {
      modoConvite = true;
      desenhar();
      m.abrir();
      requestAnimationFrame(() =>
        m.corpo.querySelector<HTMLButtonElement>('[data-comecar-a-jogar]')?.focus(),
      );
    },
    fechar: () => m.fechar(),
    get aberto() {
      return m.aberto;
    },
    definirSala(s: EstadoSala, voce: string) {
      sala = s;
      eu = voce;
      if (m.aberto) desenhar();
    },
    definirJogadores(lista: JogadorNaLista[]) {
      jogadores = lista;
      if (m.aberto) desenhar();
    },
  };
}

/** Aviso discreto de conexão: "Reconectando…" com o mundo ainda visível atrás. */
export function criarAvisoConexao(raiz: HTMLElement) {
  const el = document.createElement('div');
  el.className = 'aviso-conexao';
  el.hidden = true;
  el.setAttribute('role', 'status');
  el.setAttribute('data-aviso-conexao', '');
  const b = document.createElement('span');
  b.className = 'bolinha';
  const t = document.createElement('span');
  el.append(b, t);
  raiz.appendChild(el);
  return {
    mostrar(e: EstadoConexao) {
      if (e === 'reconectando') {
        t.textContent = 'A internet caiu. Reconectando…';
        el.hidden = false;
      } else el.hidden = true;
    },
  };
}

/** Botão fixo de amigos: quantos estão no mundo e o mesmo cartão do convite. */
export function criarBotaoAmigos(raiz: HTMLElement, aoClicar: () => void) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'botao-amigos';
  b.setAttribute('data-botao-amigos', '');
  const rostos = document.createElement('span');
  rostos.className = 'rostos';
  rostos.setAttribute('aria-hidden', 'true');
  const texto = document.createElement('span');
  b.append(rostos, texto);
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    aoClicar();
  });
  raiz.appendChild(b);
  const definir = (n: number) => {
    rostos.replaceChildren(
      ...Array.from({ length: Math.min(3, n) }, () => document.createElement('i')),
    );
    texto.textContent = n <= 1 ? 'Convidar' : `${n} no mundo`;
    b.setAttribute(
      'aria-label',
      n <= 1 ? 'Convidar amigos' : `${n} pessoas no mundo: ver e convidar amigos`,
    );
  };
  definir(1);
  return { definir };
}

/** O que a tela de entrar mostra do mundo (vem do servidor antes de entrar). */
export interface PreviaNaTela {
  nome: string;
  tema: string;
  nomeTema: string;
  dono: string;
  presentes: string[];
}

/**
 * "Entrar no mundo de Ana" (spec 011, T03): pelo link ou pelo QR. O tema do mundo em cima, o
 * nome, quem está lá, "Seu nome" e um botão. O mesmo cartão mostra o progresso e, se não der,
 * o motivo (nunca uma tela nova vazia).
 */
export function criarTelaEntrar(op: {
  previa: PreviaNaTela | null;
  apelido: string;
  /** Toque em "Entrar" (dentro do gesto: o áudio já pode ser preparado aqui). */
  aoEntrar(apelido: string): void;
  aoVoltar(): void;
}) {
  const el = document.createElement('div');
  el.className = 'tela-entrar';
  el.setAttribute('data-tela-entrar', '');
  const c = document.createElement('div');
  c.className = 'cartao';
  c.setAttribute('role', 'dialog');
  c.setAttribute('aria-modal', 'true');
  const arte = document.createElement('div');
  arte.className = 'arte';
  const p = op.previa;
  if (p) {
    arte.style.backgroundImage = `url(/temas/${encodeURIComponent(p.tema)}.jpg)`;
    const chip = document.createElement('span');
    chip.className = 'chip-tema';
    chip.textContent = p.nomeTema;
    arte.appendChild(chip);
  }
  const miolo = document.createElement('div');
  miolo.className = 'miolo';
  const h = document.createElement('h2');
  h.textContent = p?.dono ? `Entrar no mundo de ${p.dono}` : 'Entrar no mundo';
  c.setAttribute('aria-label', h.textContent);
  miolo.appendChild(h);
  if (p) {
    const nm = document.createElement('p');
    nm.className = 'nome-mundo';
    nm.textContent = p.nome;
    const quem = document.createElement('p');
    quem.className = 'quem';
    quem.setAttribute('data-quem-esta', '');
    quem.textContent = p.presentes.length
      ? `No mundo agora: ${p.presentes.join(', ')}`
      : 'Ninguém está jogando agora: você chega primeiro!';
    miolo.append(nm, quem);
  }
  const rot = document.createElement('label');
  rot.textContent = 'Seu nome';
  const nome = document.createElement('input');
  nome.type = 'text';
  nome.maxLength = 22;
  nome.setAttribute('autocomplete', 'nickname');
  nome.value = op.apelido;
  nome.setAttribute('data-entrar-apelido', '');
  rot.appendChild(nome);
  const erro = document.createElement('div');
  erro.className = 'erro';
  erro.setAttribute('role', 'alert');
  const barra = document.createElement('div');
  barra.className = 'barra';
  barra.hidden = true;
  const i = document.createElement('i');
  barra.appendChild(i);
  const entrar = document.createElement('button');
  entrar.type = 'button';
  entrar.className = 'btn primario';
  entrar.textContent = 'Entrar';
  entrar.setAttribute('data-entrar-mundo', '');
  miolo.append(rot, erro, barra, entrar);
  c.append(arte, miolo);
  el.appendChild(c);
  document.body.appendChild(el);
  const ir = () => {
    erro.textContent = '';
    entrar.disabled = true;
    entrar.textContent = 'Entrando…';
    nome.disabled = true;
    barra.hidden = false;
    op.aoEntrar(nome.value);
  };
  entrar.addEventListener('click', ir);
  nome.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') ir();
  });
  requestAnimationFrame(() => entrar.focus());
  return {
    passo(fracao: number) {
      i.style.width = `${Math.round(fracao * 100)}%`;
    },
    erro(t: string) {
      erro.textContent = t;
      barra.hidden = true;
      nome.disabled = false;
      entrar.disabled = false;
      entrar.textContent = 'Tentar de novo';
      if (!c.querySelector('[data-voltar-meu-mundo]')) {
        const v = document.createElement('button');
        v.type = 'button';
        v.className = 'btn';
        v.textContent = 'Voltar ao meu mundo';
        v.setAttribute('data-voltar-meu-mundo', '');
        v.addEventListener('click', op.aoVoltar);
        miolo.appendChild(v);
      }
    },
    fechar: () => el.remove(),
  };
}
