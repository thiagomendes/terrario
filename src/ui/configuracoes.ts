import { LIMITES, type Config, type GerenciadorConfig, type Qualidade } from '../jogo/config';
import { criarModal } from './mundos';

export const CSS_CONFIG = `
.abas { display: flex; gap: 4px; padding: 4px; margin-bottom: 14px; border-radius: 12px; background: rgba(0,0,0,0.3); flex-wrap: wrap; }
.abas button {
  flex: 1 1 auto; min-height: 36px; padding: 6px 12px; border: 0; border-radius: 9px;
  background: transparent; color: #b9b2a6; font: 600 0.88rem system-ui, sans-serif; cursor: pointer;
}
.abas button[aria-selected='true'] { background: rgba(255,255,255,0.12); color: #fff; }
.opcao-config {
  display: grid; grid-template-columns: minmax(140px, 1fr) minmax(0, 1.4fr) 56px; gap: 12px; align-items: center;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.opcao-config .nome { font-weight: 600; font-size: 0.92rem; }
.opcao-config .nome small { display: block; font-weight: 400; font-size: 0.76rem; color: #8f897e; }
.opcao-config .valor { text-align: right; font: 700 0.85rem ui-monospace, monospace; color: #ffd98f; }
.opcao-config input[type='range'] { width: 100%; accent-color: #ffc46b; }
.interruptor {
  justify-self: start; position: relative; width: 46px; height: 26px; border-radius: 13px; border: 0;
  background: rgba(255,255,255,0.15); cursor: pointer; transition: background 0.15s ease;
}
.interruptor::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%;
  background: #fff; transition: transform 0.15s ease;
}
.interruptor[aria-checked='true'] { background: #f0a94a; }
/* área de toque maior que o desenho do interruptor */
.interruptor::before { content: ''; position: absolute; inset: -9px -4px; }
.interruptor[aria-checked='true']::after { transform: translateX(20px); }
.rodape-config { display: flex; justify-content: space-between; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
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
        nome: 'Balanço ao andar',
        dica: 'Movimento do braço e da câmera',
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
        nome: 'Barra de atalhos',
        dica: 'Ícones com as teclas de cada função no canto da tela',
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
