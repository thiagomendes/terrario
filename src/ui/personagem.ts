import { icone, rotuloComIcone, type NomeIcone } from './pixicones';
import {
  ACESSORIOS,
  CABELOS_LONGOS,
  CORPOS,
  SAIAS,
  aplicarCorpo,
  ESTILOS_CABELO,
  ESTILOS_ROSTO,
  ESTILOS_ROUPA,
  IDS_MODELOS,
  MODELOS,
  PALETAS,
  TAMANHO_MAXIMO_NOME,
  aplicarModelo,
  normalizarAparencia,
  type Acessorio,
  type Aparencia,
} from '../personagem/aparencia';
import { carregarAparencia, salvarAparencia, type Armazenamento } from '../personagem/persistencia';
import { desenharPrevia, type RecortePrevia } from './titulo';

export function teclaParaPainel(codigo: string): boolean {
  return codigo === 'KeyC';
}

export const CSS_PAINEL = `
.painel-personagem {
  width: min(620px, 100%);
  max-height: 46vh;
  overflow-y: auto;
  overflow-x: hidden;
  box-sizing: border-box;
  padding: 16px 18px 0;
  border: 0;
  border-radius: 24px;
  background: var(--painel);
  color: var(--tinta);
  box-shadow: 0 8px 0 var(--painel-borda), 0 22px 40px rgba(40, 25, 10, 0.35);
  text-align: left;
  cursor: default;
  justify-self: center;
  display: grid;
  align-content: start;
  gap: 14px;
}
.painel-personagem .topo-painel { display: grid; grid-template-columns: 1fr auto; gap: 10px; align-items: center; }
.painel-personagem button,
.painel-personagem input { font: 800 0.92rem var(--jogo); color: var(--tinta); }
/* cada botão do editor é uma peça creme */
.painel-personagem button {
  cursor: pointer; border: 0; border-radius: 14px;
  background: linear-gradient(to bottom, #fffdf6, var(--creme) 50%, #f6ead2);
  box-shadow: 0 4px 0 var(--creme-fundo), 0 7px 12px rgba(60, 35, 10, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.8);
  transition: transform 0.08s ease, box-shadow 0.08s ease, filter 0.1s ease;
}
.painel-personagem button:hover { filter: brightness(1.03); }
.painel-personagem button:active {
  transform: translateY(3px);
  box-shadow: 0 1px 0 var(--creme-fundo), 0 3px 6px rgba(60, 35, 10, 0.18), inset 0 2px 0 rgba(255, 255, 255, 0.8);
}
.painel-personagem button:focus-visible,
.painel-personagem input:focus-visible { outline: 3px solid var(--azul); outline-offset: 2px; }
.painel-personagem button[aria-pressed='true'],
.painel-personagem .abas button[aria-selected='true'] {
  background: linear-gradient(to bottom, #ffe39a, var(--amarela) 55%, #f5b42e);
  box-shadow: 0 4px 0 var(--amarela-fundo), 0 7px 12px rgba(60, 35, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.6);
}
.painel-personagem input {
  width: 100%; box-sizing: border-box; min-height: 46px; padding: 8px 14px; font-size: 1rem; font-weight: 700;
  border: 0; border-radius: 14px; background: var(--poco); box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
.painel-personagem input::placeholder { color: var(--tinta-suave); }
.painel-personagem .dado { width: 50px; min-height: 46px; font-size: 1.4rem; padding: 0; display: grid; place-items: center; }
.painel-personagem .abas {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 6px; border-radius: 18px;
  background: var(--poco); box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
.painel-personagem .abas button { min-height: 46px; font-size: 1.45rem; padding: 0; display: grid; place-items: center; }
.painel-personagem .abas button[aria-selected='false'] { background: transparent; box-shadow: none; }
.painel-personagem .abas button[aria-selected='false']:hover { background: rgba(255, 255, 255, 0.55); }
.painel-personagem [data-aba-painel] { display: grid; gap: 14px; }
.painel-personagem [data-aba-painel][hidden] { display: none; }
.painel-personagem .miniaturas { display: grid; grid-template-columns: repeat(auto-fill, minmax(78px, 1fr)); gap: 10px; padding-bottom: 4px; }
.painel-personagem .miniaturas.largas { grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
.painel-personagem button.miniatura {
  display: grid; place-items: end center; padding: 6px 4px 4px; aspect-ratio: 1; min-height: 0; overflow: hidden;
  background: radial-gradient(ellipse at 50% 88%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 60%), var(--poco);
  box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.14);
}
.painel-personagem button.miniatura:active { transform: none; box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.2); }
.painel-personagem button.miniatura[aria-pressed='true'] {
  background: radial-gradient(ellipse at 50% 88%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 60%), #fff3d0;
  box-shadow: inset 0 0 0 3px var(--amarela), 0 4px 0 var(--amarela-fundo);
}
.painel-personagem .largas button.miniatura { aspect-ratio: 3 / 4; }
.painel-personagem button.miniatura canvas { width: auto; height: 100%; max-width: 100%; object-fit: contain; }
.painel-personagem .amostras { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 12px; border-top: 2px dashed var(--painel-borda); }
.painel-personagem button.amostra {
  width: 40px; min-height: 40px; height: 40px; padding: 0; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.45), rgba(255, 255, 255, 0) 45%), var(--cor) !important;
  box-shadow: 0 3px 0 rgba(60, 35, 10, 0.28), inset 0 -3px 0 rgba(0, 0, 0, 0.15);
}
@media (pointer: coarse) { .painel-personagem button.amostra { width: 44px; height: 44px; min-height: 44px; } }
.painel-personagem button.amostra[aria-pressed='true'] {
  outline: 3px solid var(--amarela-fundo); outline-offset: 3px;
  box-shadow: 0 3px 0 rgba(60, 35, 10, 0.28), inset 0 -3px 0 rgba(0, 0, 0, 0.15);
}
/* Jogar fica preso embaixo; sombras creme em volta tampam as miniaturas que rolam por trás */
.painel-personagem .jogar {
  position: sticky;
  bottom: 16px;
  z-index: 1;
  width: 100%;
  min-height: 52px;
  margin: 2px 0 16px;
  font: 700 1.2rem var(--display);
  background: linear-gradient(to bottom, #ffe39a, var(--amarela) 55%, #f5b42e);
  box-shadow: 0 5px 0 var(--amarela-fundo), inset 0 2px 0 rgba(255, 255, 255, 0.6),
    0 24px 0 18px var(--painel), 0 -12px 0 18px var(--painel);
}
.painel-personagem .jogar:active {
  box-shadow: 0 1px 0 var(--amarela-fundo), inset 0 2px 0 rgba(255, 255, 255, 0.6),
    0 20px 0 18px var(--painel), 0 -16px 0 18px var(--painel);
}
`;

const NOMES_ROSTO = [
  'Clássico',
  'Cílios e lábios',
  'Sardas',
  'Cílios, lábios e sardas',
  'Barba',
  'Bigode',
];
const NOMES_CABELO = [
  'Curto',
  'Franja de lado',
  'Longo liso',
  'Raspado',
  'Cacheado volumoso',
  'Rabo de cavalo',
  'Coque',
  'Tranças',
  'Chanel',
];
const NOMES_ROUPA = [
  'Túnica',
  'Avental',
  'Jaqueta',
  'Listrada',
  'Colete',
  'Bandoleira',
  'Vestido',
  'Blusa e saia',
  'Vestido longo',
];
const NOMES_ACESSORIO: Record<Acessorio, string> = {
  nenhum: 'Nenhum',
  capuz: 'Capuz',
  lanterna: 'Lanterna',
  chapeu: 'Chapéu',
  mochila: 'Mochila',
  cachecol: 'Cachecol',
  oculos: 'Óculos',
  capacete: 'Capacete',
  'chapeu-explorador': 'Chapéu de explorador',
  avental: 'Avental',
  'touca-chef': 'Touca de chef',
  'coroa-flores': 'Coroa de flores',
};

type Campo = Exclude<keyof Aparencia, 'nome'>;
type Valor = string | number;

/** Opções em miniatura (mostram o resultado) ou em amostras de cor. */
interface GrupoVisual {
  campo: Campo;
  titulo: string;
  tipo: 'miniatura' | 'amostra';
  valores: Valor[];
  /** Rótulo acessível de cada valor (não aparece na tela). */
  rotulos: string[];
  recorte?: RecortePrevia;
  cores?: readonly string[];
  largas?: boolean;
}

interface Aba {
  id: string;
  icone: NomeIcone;
  titulo: string;
  grupos: GrupoVisual[];
}

function claridade(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255);
}

const indices = (n: number) => Array.from({ length: n }, (_, i) => i);
/** Pele: amostras da mais clara para a mais escura, sem nomes de cor. */
const ORDEM_PELE = indices(PALETAS.pele.length).sort(
  (a, b) => claridade(PALETAS.pele[b]) - claridade(PALETAS.pele[a]),
);

export const ABAS: Aba[] = [
  {
    id: 'corpo',
    icone: 'pessoa',
    titulo: 'Corpo',
    grupos: [
      {
        campo: 'corpo',
        titulo: 'Corpo',
        tipo: 'miniatura',
        valores: [...CORPOS],
        rotulos: ['Feminino', 'Masculino'],
        recorte: 'corpo',
        largas: true,
      },
      {
        campo: 'modelo',
        titulo: 'Modelo',
        tipo: 'miniatura',
        valores: [...IDS_MODELOS],
        rotulos: IDS_MODELOS.map((id) => MODELOS[id].rotulo),
        recorte: 'corpo',
        largas: true,
      },
      {
        campo: 'rosto',
        titulo: 'Rosto',
        tipo: 'miniatura',
        valores: indices(ESTILOS_ROSTO),
        rotulos: NOMES_ROSTO,
        recorte: 'cabeca',
      },
      {
        campo: 'pele',
        titulo: 'Pele',
        tipo: 'amostra',
        valores: ORDEM_PELE,
        rotulos: ORDEM_PELE.map((_, i) => `Tom ${i + 1}`),
        cores: PALETAS.pele,
      },
    ],
  },
  {
    id: 'cabelo',
    icone: 'cabelo',
    titulo: 'Cabelo',
    grupos: [
      {
        campo: 'cabeloEstilo',
        titulo: 'Corte',
        tipo: 'miniatura',
        valores: indices(ESTILOS_CABELO),
        rotulos: NOMES_CABELO,
        recorte: 'busto',
      },
      {
        campo: 'cabeloCor',
        titulo: 'Cor do cabelo',
        tipo: 'amostra',
        valores: indices(PALETAS.cabelo.length),
        rotulos: indices(PALETAS.cabelo.length).map((i) => `Cor ${i + 1}`),
        cores: PALETAS.cabelo,
      },
    ],
  },
  {
    id: 'roupa',
    icone: 'camisa',
    titulo: 'Roupa',
    grupos: [
      {
        campo: 'roupaEstilo',
        titulo: 'Estilo da roupa',
        tipo: 'miniatura',
        valores: indices(ESTILOS_ROUPA),
        rotulos: NOMES_ROUPA,
        recorte: 'tronco',
      },
      {
        campo: 'roupaCor',
        titulo: 'Cor da roupa',
        tipo: 'amostra',
        valores: indices(PALETAS.roupa.length),
        rotulos: indices(PALETAS.roupa.length).map((i) => `Cor ${i + 1}`),
        cores: PALETAS.roupa,
      },
    ],
  },
  {
    id: 'calca',
    icone: 'calca',
    titulo: 'Calça',
    grupos: [
      {
        campo: 'calcaCor',
        titulo: 'Calça',
        tipo: 'miniatura',
        valores: indices(PALETAS.calca.length),
        rotulos: indices(PALETAS.calca.length).map((i) => `Calça ${i + 1}`),
        recorte: 'pernas',
      },
    ],
  },
  {
    id: 'extra',
    icone: 'mochila',
    titulo: 'Acessórios',
    grupos: [
      {
        campo: 'acessorio',
        titulo: 'Acessório',
        tipo: 'miniatura',
        valores: [...ACESSORIOS],
        rotulos: ACESSORIOS.map((a) => NOMES_ACESSORIO[a]),
        recorte: 'busto',
        largas: true,
      },
    ],
  },
];

/** Em qual aba fica cada campo (útil para testes e atalhos). */
export const ABA_DO_CAMPO = Object.fromEntries(
  ABAS.flatMap((a) => a.grupos.map((g) => [g.campo, a.id])),
) as Record<Campo, string>;

function variante(base: Aparencia, campo: Campo, valor: Valor): Aparencia {
  if (campo === 'modelo') return aplicarModelo(base, valor as Aparencia['modelo']);
  if (campo === 'corpo') return aplicarCorpo(base, valor as Aparencia['corpo']);
  return { ...base, [campo]: valor };
}

/** Cortes e roupas que combinam com cada corpo (o dado sorteia dentro deles). */
const CABELOS_DO_CORPO = {
  feminino: [2, 4, 5, 6, 7, 8],
  masculino: [0, 1, 3, 4, 5],
};

/** Aparência aleatória e coerente com o corpo sorteado (o nome é mantido). */
export function sortearAparencia(
  base: Aparencia,
  aleatorio: () => number = Math.random,
): Aparencia {
  const escolher = <T>(lista: readonly T[]): T => lista[Math.floor(aleatorio() * lista.length)];
  const corpo = escolher(CORPOS);
  const feminino = corpo === 'feminino';
  const roupas = indices(ESTILOS_ROUPA).filter((i) => feminino || SAIAS[i] === undefined);
  return normalizarAparencia({
    nome: base.nome,
    modelo: escolher(IDS_MODELOS),
    corpo,
    pele: escolher(indices(PALETAS.pele.length)),
    rosto: escolher(feminino ? [0, 1, 2, 3] : indices(ESTILOS_ROSTO)),
    cabeloEstilo: escolher(CABELOS_DO_CORPO[corpo].filter((i) => i < ESTILOS_CABELO)),
    cabeloCor: escolher(indices(PALETAS.cabelo.length)),
    roupaEstilo: escolher(roupas),
    roupaCor: escolher(indices(PALETAS.roupa.length)),
    calcaCor: escolher(indices(PALETAS.calca.length)),
    acessorio: escolher(ACESSORIOS),
  });
}

/** Cortes longos (útil para testes). */
export const CORTES_LONGOS = Object.keys(CABELOS_LONGOS).map(Number);

export interface OpcoesPainel {
  armazenamento: Armazenamento | null;
  aoMudar: (aparencia: Aparencia) => void;
  aoJogar: () => void;
}

export function criarPainelPersonagem(pai: HTMLElement, opcoes: OpcoesPainel) {
  let aparencia = carregarAparencia(opcoes.armazenamento);
  const raiz = document.createElement('section');
  raiz.className = 'painel-personagem';
  raiz.setAttribute('data-painel-personagem', '');
  raiz.setAttribute('aria-label', 'Seu personagem');

  // nome e dado
  const topo = document.createElement('div');
  topo.className = 'topo-painel';
  const campoNome = document.createElement('input');
  campoNome.type = 'text';
  campoNome.maxLength = TAMANHO_MAXIMO_NOME;
  campoNome.placeholder = 'Nome';
  campoNome.setAttribute('aria-label', 'Nome');
  campoNome.setAttribute('data-campo', 'nome');
  campoNome.value = aparencia.nome;
  const dado = document.createElement('button');
  dado.type = 'button';
  dado.className = 'dado';
  dado.appendChild(icone('dado'));
  dado.title = 'Sortear visual';
  dado.setAttribute('aria-label', 'Sortear visual');
  dado.setAttribute('data-sortear', '');
  topo.append(campoNome, dado);

  // abas com ícones
  const abas = document.createElement('div');
  abas.className = 'abas';
  abas.setAttribute('role', 'tablist');
  const botoesAba: HTMLButtonElement[] = [];
  const paineis: HTMLElement[] = [];
  const botoes: HTMLButtonElement[] = [];
  const miniaturas: Array<{ canvas: HTMLCanvasElement; grupo: GrupoVisual; valor: Valor }> = [];

  function mostrarAba(id: string): void {
    for (const b of botoesAba) b.setAttribute('aria-selected', String(b.dataset.aba === id));
    for (const p of paineis) p.hidden = p.dataset.abaPainel !== id;
  }

  for (const aba of ABAS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('data-aba', aba.id);
    b.setAttribute('aria-label', aba.titulo);
    b.title = aba.titulo;
    b.appendChild(icone(aba.icone));
    b.addEventListener('click', () => mostrarAba(aba.id));
    botoesAba.push(b);
    abas.appendChild(b);

    const painel = document.createElement('div');
    painel.setAttribute('data-aba-painel', aba.id);
    painel.setAttribute('role', 'tabpanel');
    painel.setAttribute('aria-label', aba.titulo);
    for (const g of aba.grupos) {
      const lista = document.createElement('div');
      lista.className =
        g.tipo === 'miniatura' ? `miniaturas${g.largas ? ' largas' : ''}` : 'amostras';
      lista.setAttribute('role', 'group');
      lista.setAttribute('aria-label', g.titulo);
      g.valores.forEach((valor, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-campo', g.campo);
        b.setAttribute('data-valor', String(valor));
        b.setAttribute('aria-label', `${g.titulo}: ${g.rotulos[i]}`);
        if (g.tipo === 'amostra') {
          b.className = 'amostra';
          b.style.setProperty('--cor', g.cores![valor as number]);
        } else {
          b.className = 'miniatura';
          if (g.campo === 'modelo' || g.campo === 'acessorio') b.title = g.rotulos[i];
          const c = document.createElement('canvas');
          b.appendChild(c);
          miniaturas.push({ canvas: c, grupo: g, valor });
        }
        b.addEventListener('click', () => mudou(variante(aparencia, g.campo, valor)));
        botoes.push(b);
        lista.appendChild(b);
      });
      painel.appendChild(lista);
    }
    paineis.push(painel);
  }
  raiz.append(topo, abas, ...paineis);

  function marcar(): void {
    for (const b of botoes) {
      const atual = String(aparencia[b.dataset.campo as Campo]);
      b.setAttribute('aria-pressed', String(atual === b.dataset.valor));
    }
  }
  /** Cada miniatura mostra a aparência atual com aquela opção aplicada. */
  function desenharMiniaturas(): void {
    for (const m of miniaturas) {
      desenharPrevia(m.canvas, variante(aparencia, m.grupo.campo, m.valor), m.grupo.recorte);
    }
  }
  function mudou(proxima: Aparencia): void {
    aparencia = normalizarAparencia(proxima);
    marcar();
    desenharMiniaturas();
    salvarAparencia(opcoes.armazenamento, aparencia);
    opcoes.aoMudar(aparencia);
  }

  campoNome.addEventListener('input', () => mudou({ ...aparencia, nome: campoNome.value }));
  dado.addEventListener('click', () => mudou(sortearAparencia(aparencia)));

  const jogar = document.createElement('button');
  jogar.type = 'button';
  jogar.className = 'jogar';
  rotuloComIcone(jogar, 'jogar', 'Jogar');
  jogar.setAttribute('data-jogar', '');
  jogar.addEventListener('click', (e) => {
    e.stopPropagation();
    opcoes.aoJogar();
  });
  raiz.appendChild(jogar);

  for (const tipo of ['click', 'keydown', 'keyup', 'mousedown', 'pointerdown']) {
    raiz.addEventListener(tipo, (e) => e.stopPropagation());
  }

  mostrarAba('corpo');
  marcar();
  desenharMiniaturas();
  pai.appendChild(raiz);
  return { raiz, aparencia: () => aparencia };
}
