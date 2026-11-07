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
export const TEXTO_RECUSA: Record<MotivoRecusa | 'sem-internet' | 'servidor', string> = {
  codigo: 'Esse código não existe. Confere com quem te mandou?',
  cheio: 'O mundo está cheio (8 amigos). Tenta daqui a pouco.',
  fechado: 'O dono fechou este mundo para visitas por enquanto.',
  expulso: 'O dono pediu para você sair deste mundo. Que tal jogar no seu?',
  versao: 'Tem uma versão nova do jogo. Recarregue a página para entrar.',
  limite: 'Muitas tentativas de código. Espere uns minutos e tente de novo.',
  identidade: 'Não deu para entrar com este aparelho. Peça um código novo ao dono.',
  erro: 'Algo deu errado do nosso lado. Tente de novo daqui a pouco.',
  'sem-internet': 'Você está sem internet, mas seus mundos do aparelho continuam aqui.',
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
  apelido.maxLength = 16;
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
  };
}

/** "Jogar com amigos": convite (código, link, QR), quem está no mundo e o painel do dono. */
export function criarPainelAmigos(raiz: HTMLElement, op: OpcoesPainelAmigos) {
  const m = criarModal('Jogar com amigos', 'data-painel-amigos', 'amigos');
  m.corpo.classList.add('amigos');
  raiz.appendChild(m.fundo);
  let sala: EstadoSala | null = null;
  let eu = '';
  let jogadores: JogadorNaLista[] = [];

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
            erro.textContent = e instanceof Error ? e.message : String(e);
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
    quem.textContent =
      jogadores.length > 1 ? 'No mundo agora:' : 'Só você por enquanto. Mande o código!';
    const lista = document.createElement('ul');
    lista.className = 'lista';
    lista.setAttribute('data-lista-jogadores', '');
    const souDono = sala.dono === eu;
    for (const j of jogadores) {
      const li = document.createElement('li');
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
          () => {
            if (
              confirm(
                `Pedir para ${j.apelido} sair do mundo? Ele não vai poder voltar com este código.`,
              )
            )
              op.dono!.expulsar(j.id);
          },
          'data-expulsar',
        );
        b.setAttribute('aria-label', `Pedir para ${j.apelido} sair`);
        li.appendChild(b);
      }
      lista.appendChild(li);
    }
    m.corpo.append(titulo, cod, qr, acoes, quem, lista);
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
          () => {
            if (
              confirm(
                'Trocar o código? O antigo para de funcionar na hora (quem já está continua).',
              )
            )
              d.trocarCodigo();
          },
          'data-trocar-codigo',
        ),
      );
    }
  }

  return {
    abrir() {
      desenhar();
      m.abrir();
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
