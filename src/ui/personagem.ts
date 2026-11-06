import {
  ACESSORIOS,
  ESTILOS_CABELO,
  ESTILOS_ROUPA,
  IDS_MODELOS,
  MODELOS,
  PALETAS,
  TAMANHO_MAXIMO_NOME,
  aplicarModelo,
  normalizarAparencia,
  type Aparencia,
} from '../personagem/aparencia';
import { carregarAparencia, salvarAparencia, type Armazenamento } from '../personagem/persistencia';

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
  padding: 16px 18px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(30, 32, 46, 0.9), rgba(18, 19, 28, 0.92));
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  text-align: left;
  cursor: default;
  justify-self: center;
}
@media (min-width: 1000px) { .painel-personagem { max-height: 78vh; } }
.painel-personagem h2 { margin: 0 0 10px; font-size: 1.15rem; color: #ffd98f; }
.painel-personagem .grupo { margin: 10px 0; }
.painel-personagem .rotulo {
  display: block; margin-bottom: 6px; font-size: 0.74rem; color: #b9b2a6;
  text-transform: uppercase; letter-spacing: 0.08em;
}
.painel-personagem .opcoes { display: flex; flex-wrap: wrap; gap: 6px; }
.painel-personagem button,
.painel-personagem input {
  font: 600 0.86rem system-ui, sans-serif;
  color: #ece6da;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
}
.painel-personagem button { min-height: 34px; padding: 6px 12px; cursor: pointer; transition: background 0.12s ease; }
.painel-personagem button:hover { background: rgba(255, 255, 255, 0.12); }
.painel-personagem button[aria-pressed='true'] {
  border-color: #ffc46b;
  background: rgba(255, 196, 107, 0.2);
  color: #fff;
}
.painel-personagem button:focus-visible,
.painel-personagem input:focus-visible { outline: 2px solid #ffd98f; outline-offset: 2px; }
.painel-personagem input { width: 100%; box-sizing: border-box; min-height: 40px; padding: 8px 12px; background: rgba(0, 0, 0, 0.25); }
.painel-personagem .jogar {
  margin-top: 12px;
  width: 100%;
  min-height: 44px;
  border-color: #ffc46b;
  background: linear-gradient(180deg, #ffcf7a, #f0a94a);
  color: #2a1a08;
  font-size: 1.02rem;
  font-weight: 800;
}
.painel-personagem .jogar:hover { background: linear-gradient(180deg, #ffd98f, #f5b45a); }
`;

const NOMES_PELE = ['Clara', 'Dourada', 'Morena', 'Escura', 'Profunda'];
const NOMES_CABELO = ['Preto', 'Castanho', 'Ruivo', 'Louro', 'Cinza azulado', 'Rosado'];
const NOMES_ROUPA = ['Azul', 'Roxo', 'Verde', 'Ferrugem', 'Vinho', 'Cinza'];
const NOMES_CALCA = ['Noite', 'Terra', 'Musgo', 'Grafite'];
const NOMES_ACESSORIO: Record<string, string> = {
  nenhum: 'Nenhum',
  capuz: 'Capuz',
  lanterna: 'Lanterna',
};

function estilos(total: number): string[] {
  return Array.from({ length: total }, (_, i) => `Estilo ${i + 1}`);
}

interface Grupo {
  campo: keyof Aparencia;
  titulo: string;
  valores: Array<string | number>;
  nomes: string[];
}

const GRUPOS: Grupo[] = [
  {
    campo: 'modelo',
    titulo: 'Modelo',
    valores: [...IDS_MODELOS],
    nomes: IDS_MODELOS.map((id) => MODELOS[id].rotulo),
  },
  {
    campo: 'pele',
    titulo: 'Pele',
    valores: PALETAS.pele.map((_, i) => i),
    nomes: NOMES_PELE,
  },
  {
    campo: 'cabeloEstilo',
    titulo: 'Estilo do cabelo',
    valores: estilos(ESTILOS_CABELO).map((_, i) => i),
    nomes: estilos(ESTILOS_CABELO),
  },
  {
    campo: 'cabeloCor',
    titulo: 'Cor do cabelo',
    valores: PALETAS.cabelo.map((_, i) => i),
    nomes: NOMES_CABELO,
  },
  {
    campo: 'roupaEstilo',
    titulo: 'Estilo da roupa',
    valores: estilos(ESTILOS_ROUPA).map((_, i) => i),
    nomes: estilos(ESTILOS_ROUPA),
  },
  {
    campo: 'roupaCor',
    titulo: 'Cor da roupa',
    valores: PALETAS.roupa.map((_, i) => i),
    nomes: NOMES_ROUPA,
  },
  {
    campo: 'calcaCor',
    titulo: 'Cor da calça',
    valores: PALETAS.calca.map((_, i) => i),
    nomes: NOMES_CALCA,
  },
  {
    campo: 'acessorio',
    titulo: 'Acessório',
    valores: [...ACESSORIOS],
    nomes: ACESSORIOS.map((a) => NOMES_ACESSORIO[a]),
  },
];

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
  const titulo = document.createElement('h2');
  titulo.textContent = 'Seu personagem';
  raiz.appendChild(titulo);

  const grupoNome = document.createElement('div');
  grupoNome.className = 'grupo';
  const rotuloNome = document.createElement('label');
  rotuloNome.className = 'rotulo';
  rotuloNome.textContent = 'Nome';
  const campoNome = document.createElement('input');
  campoNome.type = 'text';
  campoNome.maxLength = TAMANHO_MAXIMO_NOME;
  campoNome.placeholder = 'Como você quer ser chamado';
  campoNome.setAttribute('data-campo', 'nome');
  campoNome.value = aparencia.nome;
  rotuloNome.appendChild(campoNome);
  grupoNome.appendChild(rotuloNome);
  raiz.appendChild(grupoNome);

  const botoes: HTMLButtonElement[] = [];
  function marcar(): void {
    for (const b of botoes) {
      const atual = String(aparencia[b.dataset.campo as keyof Aparencia]);
      b.setAttribute('aria-pressed', String(atual === b.dataset.valor));
    }
  }
  function mudou(proxima: Aparencia): void {
    aparencia = normalizarAparencia(proxima);
    marcar();
    salvarAparencia(opcoes.armazenamento, aparencia);
    opcoes.aoMudar(aparencia);
  }

  for (const g of GRUPOS) {
    const bloco = document.createElement('div');
    bloco.className = 'grupo';
    const rotulo = document.createElement('span');
    rotulo.className = 'rotulo';
    rotulo.textContent = g.titulo;
    const lista = document.createElement('div');
    lista.className = 'opcoes';
    lista.setAttribute('role', 'group');
    lista.setAttribute('aria-label', g.titulo);
    g.valores.forEach((valor, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = g.nomes[i];
      b.setAttribute('data-campo', g.campo);
      b.setAttribute('data-valor', String(valor));
      b.addEventListener('click', () => {
        mudou(
          g.campo === 'modelo'
            ? aplicarModelo(aparencia, valor as Aparencia['modelo'])
            : { ...aparencia, [g.campo]: valor },
        );
      });
      botoes.push(b);
      lista.appendChild(b);
    });
    bloco.append(rotulo, lista);
    raiz.appendChild(bloco);
  }

  campoNome.addEventListener('input', () => mudou({ ...aparencia, nome: campoNome.value }));

  const jogar = document.createElement('button');
  jogar.type = 'button';
  jogar.className = 'jogar';
  jogar.textContent = 'Jogar';
  jogar.setAttribute('data-jogar', '');
  jogar.addEventListener('click', (e) => {
    e.stopPropagation();
    opcoes.aoJogar();
  });
  raiz.appendChild(jogar);

  for (const tipo of ['click', 'keydown', 'keyup', 'mousedown', 'pointerdown']) {
    raiz.addEventListener(tipo, (e) => e.stopPropagation());
  }

  marcar();
  pai.appendChild(raiz);
  return { raiz, aparencia: () => aparencia };
}
