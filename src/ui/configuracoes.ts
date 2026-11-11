import { LIMITES, type Config, type GerenciadorConfig, type Qualidade } from '../jogo/config';
import { criarModal } from './mundos';

export const CSS_CONFIG = `
/* abas: trilho de poço com a aba escolhida em peça amarela */
.abas {
  display: flex; gap: 6px; padding: 6px; margin-bottom: 14px; border-radius: 16px; flex-wrap: wrap;
  background: var(--poco); box-shadow: var(--sombra-poco);
}
.abas button {
  flex: 1 1 auto; min-height: 38px; padding: 6px 12px; border: 0; border-radius: 12px;
  background: transparent; color: var(--tinta); font: 800 0.9rem var(--jogo); cursor: pointer;
  transition: background 0.1s ease;
}
.abas button:hover { background: rgba(255, 255, 255, 0.6); }
.abas button:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
.abas button[aria-selected='true'] {
  background: linear-gradient(to bottom, #ffe39a, var(--amarela) 55%, #f5b42e);
  box-shadow: 0 3px 0 var(--amarela-fundo), inset 0 2px 0 rgba(255, 255, 255, 0.6);
}
.opcao-config {
  display: grid; grid-template-columns: minmax(140px, 1fr) minmax(0, 1.4fr) 56px; gap: 12px; align-items: center;
  padding: 12px 0; border-bottom: 2px dashed var(--painel-borda);
}
.opcao-config:last-child { border-bottom: 0; }
.opcao-config .nome { font-weight: 800; font-size: 0.95rem; color: var(--tinta); }
.opcao-config .nome small { display: block; font-weight: 600; font-size: 0.78rem; color: var(--tinta-suave); }
.opcao-config .valor { text-align: right; font: 800 0.9rem var(--jogo); color: var(--tinta); }
.opcao-config input[type='range'] { width: 100%; accent-color: var(--amarela-fundo); }
.interruptor {
  justify-self: start; position: relative; width: 52px; height: 30px; border-radius: 15px; border: 0;
  background: #e6d3b0; box-shadow: var(--sombra-poco); cursor: pointer; transition: background 0.15s ease;
}
.interruptor::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%;
  background: #fff; box-shadow: 0 2px 0 rgba(120, 80, 30, 0.3); transition: transform 0.15s ease;
}
.interruptor[aria-checked='true'] { background: var(--azul); }
.interruptor:focus-visible { outline: 3px solid var(--azul-fundo); outline-offset: 2px; }
/* área de toque maior que o desenho do interruptor */
.interruptor::before { content: ''; position: absolute; inset: -7px -4px; }
.interruptor[aria-checked='true']::after { transform: translateX(22px); }
.rodape-config { display: flex; justify-content: space-between; gap: 10px; margin-top: 16px; flex-wrap: wrap; }
@media (max-width: 560px) { .opcao-config { grid-template-columns: 1fr 56px; } .opcao-config .controle { grid-column: 1 / -1; grid-row: 2; } }
`;

type Aba = 'video' | 'audio' | 'controles' | 'acessibilidade';

interface DefFaixa {
  tipo: 'faixa';
  chave: keyof Config;
  nome: string;
  dica?: string;
  min: number;
  max: number;
  passo: number;
  formato: (v: number) => string;
}
interface DefBool {
  tipo: 'bool';
  chave: keyof Config;
  nome: string;
  dica?: string;
}
interface DefEscolha {
  tipo: 'escolha';
  chave: keyof Config;
  nome: string;
  dica?: string;
  opcoes: [string, string][];
}
type Def = DefFaixa | DefBool | DefEscolha;

const pct = (v: number) => `${Math.round(v * 100)}%`;

const ABAS: Record<Aba, { titulo: string; itens: Def[] }> = {
  video: {
    titulo: 'Vídeo',
    itens: [
      {
        tipo: 'escolha',
        chave: 'qualidade',
        nome: 'Qualidade gráfica',
        dica: 'Sombras, bloom e resolução',
        opcoes: [
          ['baixa', 'Baixa'],
          ['media', 'Média'],
          ['alta', 'Alta'],
          ['ultra', 'Ultra'],
        ],
      },
      {
        tipo: 'faixa',
        chave: 'distancia',
        nome: 'Distância de visão',
        dica: 'Em chunks de 16 blocos',
        min: LIMITES.distancia[0],
        max: LIMITES.distancia[1],
        passo: 1,
        formato: (v) => `${v}`,
      },
      {
        tipo: 'faixa',
        chave: 'fov',
        nome: 'Campo de visão',
        min: LIMITES.fov[0],
        max: LIMITES.fov[1],
        passo: 1,
        formato: (v) => `${v}°`,
      },
      {
        tipo: 'bool',
        chave: 'balanco',
        nome: 'Câmera volta sozinha',
        dica: 'Andando, a câmera volta devagar para trás do boneco',
      },
      { tipo: 'bool', chave: 'mostrarFps', nome: 'Mostrar FPS' },
      {
        tipo: 'bool',
        chave: 'telaCheia',
        nome: 'Tela cheia ao jogar',
        dica: 'Ao clicar em Jogar, onde o navegador permite',
      },
      {
        tipo: 'bool',
        chave: 'mostrarAtalhos',
        nome: 'Teclas nos botões',
        dica: 'A tecla de cada função num selinho no botão (computador)',
      },
    ],
  },
  audio: {
    titulo: 'Áudio',
    itens: [
      {
        tipo: 'faixa',
        chave: 'volumeGeral',
        nome: 'Volume geral',
        min: 0,
        max: 1,
        passo: 0.05,
        formato: pct,
      },
      {
        tipo: 'faixa',
        chave: 'volumeEfeitos',
        nome: 'Efeitos',
        dica: 'Blocos, passos e ações',
        min: 0,
        max: 1,
        passo: 0.05,
        formato: pct,
      },
      {
        tipo: 'faixa',
        chave: 'volumeVozes',
        nome: 'Vozes',
        dica: 'Bichos e moradores',
        min: 0,
        max: 1,
        passo: 0.05,
        formato: pct,
      },
      {
        tipo: 'faixa',
        chave: 'volumeMusica',
        nome: 'Música',
        min: 0,
        max: 1,
        passo: 0.05,
        formato: pct,
      },
      {
        tipo: 'faixa',
        chave: 'volumeAmbiente',
        nome: 'Ambiente',
        dica: 'Vento, pássaros e grilos',
        min: 0,
        max: 1,
        passo: 0.05,
        formato: pct,
      },
    ],
  },
  controles: {
    titulo: 'Controles',
    itens: [
      {
        tipo: 'faixa',
        chave: 'sensibilidade',
        nome: 'Sensibilidade do mouse',
        min: LIMITES.sensibilidade[0],
        max: LIMITES.sensibilidade[1],
        passo: 0.05,
        formato: (v) => `${v.toFixed(2)}x`,
      },
      { tipo: 'bool', chave: 'inverterY', nome: 'Inverter eixo vertical' },
      {
        tipo: 'bool',
        chave: 'puloAutomatico',
        nome: 'Pulo automático',
        dica: 'Andando contra um degrau de um bloco, o personagem sobe sozinho',
      },
      {
        tipo: 'bool',
        chave: 'previaColocar',
        nome: 'Prévia do bloco a colocar',
        dica: 'Mostra um bloco transparente onde o bloco da mão vai ficar',
      },
    ],
  },
  acessibilidade: {
    titulo: 'Acessibilidade',
    itens: [
      {
        tipo: 'faixa',
        chave: 'escalaInterface',
        nome: 'Tamanho da interface',
        min: LIMITES.escalaInterface[0],
        max: LIMITES.escalaInterface[1],
        passo: 0.05,
        formato: pct,
      },
      {
        tipo: 'bool',
        chave: 'legendas',
        nome: 'Legendas de sons',
        dica: 'Mostra textos para sons importantes',
      },
    ],
  },
};

export function criarPainelConfig(raiz: HTMLElement, g: GerenciadorConfig) {
  const modal = criarModal('Configurações', 'data-painel-config', 'config');
  const { fundo, corpo } = modal;
  raiz.appendChild(fundo);
  const abas = document.createElement('div');
  abas.className = 'abas';
  abas.setAttribute('role', 'tablist');
  const conteudo = document.createElement('div');
  const rodape = document.createElement('div');
  rodape.className = 'rodape-config';
  const restaurar = document.createElement('button');
  restaurar.type = 'button';
  restaurar.className = 'btn';
  restaurar.textContent = 'Restaurar padrões';
  const pronto = document.createElement('button');
  pronto.type = 'button';
  pronto.className = 'btn primario';
  pronto.textContent = 'Pronto';
  rodape.append(restaurar, pronto);
  corpo.append(abas, conteudo, rodape);

  let aba: Aba = 'video';
  const botoesAba = (Object.keys(ABAS) as Aba[]).map((a) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.textContent = ABAS[a].titulo;
    b.dataset.aba = a;
    b.addEventListener('click', () => {
      aba = a;
      render();
    });
    abas.appendChild(b);
    return b;
  });

  function linha(d: Def): HTMLElement {
    const c = g.atual;
    const el = document.createElement('div');
    el.className = 'opcao-config';
    el.dataset.config = d.chave;
    const nome = document.createElement('div');
    nome.className = 'nome';
    nome.textContent = d.nome;
    if (d.dica) {
      const s = document.createElement('small');
      s.textContent = d.dica;
      nome.appendChild(s);
    }
    const controle = document.createElement('div');
    controle.className = 'controle';
    const valor = document.createElement('div');
    valor.className = 'valor';
    if (d.tipo === 'faixa') {
      const r = document.createElement('input');
      r.type = 'range';
      r.min = String(d.min);
      r.max = String(d.max);
      r.step = String(d.passo);
      r.value = String(c[d.chave]);
      r.setAttribute('aria-label', d.nome);
      valor.textContent = d.formato(c[d.chave] as number);
      r.addEventListener('input', () => {
        const v = Number(r.value);
        valor.textContent = d.formato(v);
        g.alterar({ [d.chave]: v } as Partial<Config>);
      });
      controle.appendChild(r);
    } else if (d.tipo === 'bool') {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'interruptor';
      b.setAttribute('role', 'switch');
      b.setAttribute('aria-label', d.nome);
      b.setAttribute('aria-checked', String(c[d.chave]));
      b.addEventListener('click', () => {
        const novo = !g.atual[d.chave];
        b.setAttribute('aria-checked', String(novo));
        g.alterar({ [d.chave]: novo } as Partial<Config>);
      });
      controle.appendChild(b);
    } else {
      const seg = document.createElement('div');
      seg.className = 'segmentado';
      for (const [v, rot] of d.opcoes) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = rot;
        b.dataset.valor = v;
        b.setAttribute('aria-pressed', String(c[d.chave] === v));
        b.addEventListener('click', () => {
          g.alterar({ [d.chave]: v as Qualidade } as Partial<Config>);
          seg
            .querySelectorAll('button')
            .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        });
        seg.appendChild(b);
      }
      controle.appendChild(seg);
    }
    el.append(nome, controle, valor);
    return el;
  }

  function render(): void {
    botoesAba.forEach((b) => b.setAttribute('aria-selected', String(b.dataset.aba === aba)));
    conteudo.replaceChildren(...ABAS[aba].itens.map(linha));
  }
  restaurar.addEventListener('click', () => {
    g.restaurar();
    render();
  });
  let aoFechar: (() => void) | null = null;
  modal.aoFechar(() => {
    const f = aoFechar;
    aoFechar = null;
    f?.();
  });
  pronto.addEventListener('click', () => modal.fechar());
  return {
    abrir(depois?: () => void) {
      aoFechar = depois ?? null;
      render();
      modal.abrir();
    },
    fechar: () => modal.fechar(),
    get aberto() {
      return modal.aberto;
    },
  };
}
