/**
 * Spec 017 (T04): a aba Fantasias do editor de personagem, como no esboço aprovado
 * (`.sdd/specs/017-fantasias/referencia/fantasias.html`). Três abas sempre na mesma ordem
 * (Realeza · Heróis · Dos temas), cartões com o boneco da própria criança já vestido, as
 * bolinhas da cor principal, as peças que saem e voltam com um toque e "Tirar fantasia" /
 * "Vestir de novo".
 *
 * As fotos dos cartões saem do mesmo fotógrafo das miniaturas (src/render/fotoBoneco.ts),
 * só da aba que está à vista e guardadas em cache: vestir não manda refazer foto nenhuma
 * além da prévia e do cartão escolhido.
 */
import { fotografarBoneco } from '../render/fotoBoneco';
import { tocarSomInterface } from '../audio/somInterface';
import {
  alternarPecaDaFantasia,
  tirarFantasia,
  trocarCorDaFantasia,
  vestirFantasia,
  type Aparencia,
} from '../personagem/aparencia';
import {
  GRUPOS_FANTASIA,
  TINTAS_PRESENTE,
  ROTULOS_GRUPOS,
  fantasiaLiberada,
  fantasiaPorId,
  fantasiasDoGrupo,
  normalizarFantasia,
  rotuloDaFantasia,
  type FantasiaDef,
  type FantasiaVestida,
  type GrupoFantasia,
  type TipoPeca,
} from '../personagem/fantasias';
import type { Armazenamento } from '../personagem/persistencia';
import { nivelDaCrianca } from '../personagem/almaCrianca';
import type { IdTema } from '../temas/tipos';
import { icone, type NomeIcone } from './pixicones';

/** Nome de cada tema na aba (o inteiro no título da seção, o curto no selinho do cartão). */
export const NOMES_TEMAS: Record<IdTema, { nome: string; curto: string; de: string }> = {
  'rancho-alegre': { nome: 'Rancho Alegre', curto: 'Rancho', de: 'do' },
  'exploracao-lunar': { nome: 'Exploração Lunar', curto: 'Lua', de: 'da' },
  'era-dos-dinos': { nome: 'Era dos Dinos', curto: 'Dinos', de: 'da' },
  'doce-reino': { nome: 'Doce Reino', curto: 'Doce Reino', de: 'do' },
  'planeta-vivo': { nome: 'Planeta Vivo', curto: 'Planeta', de: 'do' },
  'mata-encantada': { nome: 'Mata Encantada', curto: 'Mata', de: 'da' },
  'bruma-e-luz': { nome: 'Bruma e Luz', curto: 'Bruma', de: 'de' },
  'cidade-grande': { nome: 'Cidade Grande', curto: 'Cidade', de: 'da' },
  'vila-neon': { nome: 'Vila Neon', curto: 'Vila', de: 'da' },
};

export const ICONES_GRUPOS: Record<GrupoFantasia, NomeIcone> = {
  realeza: 'coroa',
  herois: 'raio',
  temas: 'globo',
};

/** Nome curto de cada peça que sai e volta ("Capa", "Varinha"...). */
export const NOMES_PECAS: Partial<Record<TipoPeca, string>> = {
  coroa: 'Coroa',
  tiara: 'Tiara',
  'enfeite-cabeca': 'Enfeite',
  varinha: 'Varinha',
  'capa-curta': 'Capa',
  cetro: 'Cetro',
  capa: 'Capa',
  mascara: 'Máscara',
  'chapeu-palha': 'Chapéu',
  'chapeu-vaqueiro': 'Chapéu',
  'capacete-bolha': 'Capacete',
  'touca-chef': 'Touca',
  oculos: 'Óculos',
  'coroa-folhas': 'Coroa',
  'capa-folhas': 'Capa',
  lanterna: 'Lanterna',
  'capacete-obra': 'Capacete',
  'chapeu-festa': 'Chapéu',
  'chapeu-peao': 'Chapéu',
};

export interface SecaoFantasias {
  /** Só em "Dos temas" com o tema do mundo aberto: "Do seu mundo · Rancho Alegre". */
  titulo?: string;
  fantasias: FantasiaDef[];
}

/** O que a aba mostra: em "Dos temas", primeiro as do mundo aberto, depois as outras. */
export function secoesDaAba(grupo: GrupoFantasia, temaDoMundo?: string): SecaoFantasias[] {
  const lista = fantasiasDoGrupo(grupo, temaDoMundo);
  if (grupo !== 'temas' || !temaDoMundo) return [{ fantasias: lista }];
  const meu = lista.filter((f) => f.tema === temaDoMundo);
  if (!meu.length) return [{ fantasias: lista }];
  const nome = NOMES_TEMAS[temaDoMundo as IdTema]?.nome ?? '';
  return [
    { titulo: `Do seu mundo · ${nome}`, fantasias: meu },
    { titulo: 'Dos outros temas', fantasias: lista.filter((f) => f.tema !== temaDoMundo) },
  ];
}

/** As peças opcionais da fantasia vestida, no corpo dela, sem nome repetido. */
export function pecasOpcionais(a: Aparencia): Array<{ tipo: TipoPeca; nome: string }> {
  const def = a.fantasia && fantasiaPorId(a.fantasia.id);
  if (!def) return [];
  return def.visual[a.corpo].pecas
    .filter((p) => p.opcional)
    .map((p) => ({ tipo: p.tipo, nome: NOMES_PECAS[p.tipo] ?? p.tipo }));
}

/**
 * Spec 014: a criança pode vestir esta fantasia? As livres, sempre; as do canteiro da cidade
 * (capacete, colete), só depois de ganhar. A aba nunca veste uma que esteja trancada.
 */
export function podeVestirFantasia(
  def: FantasiaDef | string | undefined,
  a: Pick<Aparencia, 'desbloqueios'>,
): boolean {
  const d = typeof def === 'string' ? fantasiaPorId(def) : def;
  return !!d && fantasiaLiberada(d, a.desbloqueios);
}

/** O aviso ao tocar numa fantasia trancada (curto: o desenho do canteiro ajuda quem não lê). */
export const TEXTO_TRANCADA = 'Ganhe no canteiro da cidade';
/** Spec 023: os prêmios do Rancho Alegre saem das missões da roça. */
export const TEXTO_TRANCADA_RANCHO = 'Ganhe nas missões do Rancho';

/** Onde se ganha a fantasia trancada: o texto (para os pais) e o desenho (para a criança). */
export function ondeSeGanha(def: Pick<FantasiaDef, 'tema'>): { texto: string; svg: string } {
  return def.tema === 'rancho-alegre'
    ? { texto: TEXTO_TRANCADA_RANCHO, svg: SVG_ROCA }
    : { texto: TEXTO_TRANCADA, svg: SVG_CANTEIRO };
}

/** Desenho do canteiro (tapume, tijolos e o capacete), em SVG próprio: nada de fora. */
export const SVG_CANTEIRO =
  '<svg viewBox="0 0 48 32" aria-hidden="true">' +
  '<rect x="2" y="18" width="44" height="12" rx="2" fill="#e8a23a"/>' +
  '<path d="M6 18 L12 30 M18 18 L24 30 M30 18 L36 30 M42 18 L46 26" stroke="#5a3a12" stroke-width="3"/>' +
  '<rect x="14" y="8" width="9" height="5" rx="1" fill="#c8553d"/>' +
  '<rect x="24" y="8" width="9" height="5" rx="1" fill="#c8553d"/>' +
  '<rect x="19" y="2" width="9" height="5" rx="1" fill="#c8553d"/>' +
  '<path d="M33 13 a6 6 0 0 1 12 0 z" fill="#ffc61a"/>' +
  '<rect x="31" y="12" width="15" height="2.4" rx="1.2" fill="#e0a800"/>' +
  '</svg>';

/** Spec 023: a roça do Rancho (terra arada, trigo maduro e a cerquinha), em SVG próprio. */
export const SVG_ROCA =
  '<svg viewBox="0 0 48 32" aria-hidden="true">' +
  '<rect x="2" y="20" width="44" height="10" rx="2" fill="#8a5a32"/>' +
  '<path d="M4 24 H44 M4 28 H44" stroke="#6a4226" stroke-width="1.6"/>' +
  '<path d="M9 21 V9 M17 21 V7 M25 21 V9 M33 21 V7" stroke="#6a9a2a" stroke-width="2"/>' +
  '<g fill="#f2c64a" stroke="#c9952a" stroke-width="0.8">' +
  '<ellipse cx="9" cy="8" rx="2.4" ry="4.4"/><ellipse cx="17" cy="6" rx="2.4" ry="4.4"/>' +
  '<ellipse cx="25" cy="8" rx="2.4" ry="4.4"/><ellipse cx="33" cy="6" rx="2.4" ry="4.4"/></g>' +
  '<path d="M38 22 V10 M45 22 V10 M37 13 H46 M37 18 H46" stroke="#f5f0e0" stroke-width="2.2" stroke-linecap="round"/>' +
  '</svg>';

/** Cadeadinho do cartão trancado. */
const SVG_CADEADO =
  '<svg viewBox="0 0 16 16" aria-hidden="true">' +
  '<path d="M4.5 7 V5 a3.5 3.5 0 0 1 7 0 V7" fill="none" stroke="#5a5560" stroke-width="2"/>' +
  '<rect x="2.5" y="7" width="11" height="8" rx="2" fill="#7a7480"/>' +
  '<circle cx="8" cy="11" r="1.4" fill="#e8e4ea"/>' +
  '</svg>';

// ---------------------------------------------------------------------------
// Lembranças do aparelho (conveniência: sem armazenamento, só não lembra)

export const CHAVE_SUBABA = 'terrario:fantasias-aba';
export const CHAVE_ANTERIOR = 'terrario:fantasia-anterior';
/** Spec 014: fantasias ganhas que já brilharam na aba (o brilho é só na primeira vez). */
export const CHAVE_BRILHOU = 'terrario:fantasias-brilhou';

export function jaBrilhou(loja: Armazenamento | null, id: string): boolean {
  try {
    const v: unknown = JSON.parse(loja?.getItem(CHAVE_BRILHOU) ?? '[]');
    return Array.isArray(v) && v.includes(id);
  } catch {
    return false;
  }
}

export function marcarBrilhou(loja: Armazenamento | null, id: string): void {
  try {
    const v: unknown = JSON.parse(loja?.getItem(CHAVE_BRILHOU) ?? '[]');
    const lista = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
    if (!lista.includes(id)) lista.push(id);
    loja?.setItem(CHAVE_BRILHOU, JSON.stringify(lista.slice(-32)));
  } catch {
    // sem armazenamento: brilha de novo na próxima vez, sem problema
  }
}

export function lerSubAba(loja: Armazenamento | null): GrupoFantasia {
  try {
    const g = loja?.getItem(CHAVE_SUBABA);
    return GRUPOS_FANTASIA.includes(g as GrupoFantasia) ? (g as GrupoFantasia) : 'realeza';
  } catch {
    return 'realeza';
  }
}

export function guardarSubAba(loja: Armazenamento | null, g: GrupoFantasia): void {
  try {
    loja?.setItem(CHAVE_SUBABA, g);
  } catch {
    // sem armazenamento: só não lembra
  }
}

/** A última fantasia tirada (para "Vestir de novo"), já passada a limpo. */
export function lerAnterior(
  loja: Armazenamento | null,
  corpo: Aparencia['corpo'],
): FantasiaVestida | undefined {
  try {
    const bruto = loja?.getItem(CHAVE_ANTERIOR);
    return bruto ? normalizarFantasia(JSON.parse(bruto), corpo) : undefined;
  } catch {
    return undefined;
  }
}

export function guardarAnterior(loja: Armazenamento | null, f: FantasiaVestida): void {
  try {
    loja?.setItem(CHAVE_ANTERIOR, JSON.stringify(f));
  } catch {
    // sem armazenamento: "Vestir de novo" vale só até fechar o jogo
  }
}

// ---------------------------------------------------------------------------

export const CSS_FANTASIAS = `
.painel-personagem .sub-abas {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;
}
.painel-personagem .sub-abas button {
  min-height: 46px; padding: 0 8px; display: flex; gap: 6px; align-items: center; justify-content: center;
  border-radius: 999px; font-size: 0.95rem; white-space: nowrap;
}
.painel-personagem .sub-abas button .pixicone-caixa { font-size: 1.15rem; display: inline-grid; }
.painel-personagem .sub-abas button[aria-selected='false'] {
  background: var(--poco); box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.12);
}
.painel-personagem .sub-abas button[aria-selected='true'] {
  background: linear-gradient(to bottom, #ffe39a, var(--amarela) 55%, #f5b42e);
  box-shadow: 0 4px 0 var(--amarela-fundo), 0 7px 12px rgba(60, 35, 10, 0.2), inset 0 2px 0 rgba(255, 255, 255, 0.6);
}
.painel-personagem .cartas { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 10px; }
.painel-personagem .cartas[hidden] { display: none; }
.painel-personagem .cartas .secao {
  grid-column: 1 / -1; margin: 4px 0 -2px; font: 800 0.85rem var(--jogo); color: var(--tinta-suave);
}
.painel-personagem button.carta {
  position: relative; display: grid; grid-template-rows: auto 1fr; gap: 4px; justify-items: center; align-content: start;
  padding: 8px 6px 10px; min-height: 0; border-radius: 16px; font: 800 0.84rem/1.15 var(--jogo); text-align: center;
  background: radial-gradient(ellipse at 50% 62%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 55%), var(--poco);
  box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.14);
}
.painel-personagem button.carta:active { transform: none; box-shadow: inset 0 3px 0 rgba(120, 80, 30, 0.2); }
.painel-personagem button.carta[aria-pressed='true'] {
  background: radial-gradient(ellipse at 50% 62%, rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0) 55%), #fff3d0;
  box-shadow: inset 0 0 0 3px var(--amarela), 0 4px 0 var(--amarela-fundo);
}
.painel-personagem button.carta canvas { height: 104px; width: auto; max-width: 100%; display: block; }
.painel-personagem button.carta .nome-carta { overflow-wrap: anywhere; }
.painel-personagem button.carta .selo {
  position: absolute; top: 6px; right: 6px; padding: 2px 7px; border-radius: 999px;
  font: 800 0.66rem var(--jogo); color: #fff; background: #6aae4a; pointer-events: none;
}
.painel-personagem button.carta .selo.meu { background: #e0782a; }
.painel-personagem button.carta.festa::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(circle at 50% 40%, rgba(255, 246, 190, 0.95), rgba(255, 246, 190, 0) 60%);
  animation: carta-brilho 0.6s ease-out forwards;
}
@keyframes carta-brilho { from { opacity: 1; transform: scale(0.7); } to { opacity: 0; transform: scale(1.15); } }
.painel-personagem [data-aba-painel='fantasias'] { padding-bottom: 20px; }
@media (max-width: 420px) {
  .painel-personagem .sub-abas { gap: 6px; }
  .painel-personagem .sub-abas button { padding: 0 4px; gap: 4px; font-size: 0.86rem; }
  .painel-personagem .cartas { gap: 8px; }
}
.painel-personagem .rodape-fantasia {
  display: flex; flex-wrap: wrap; gap: 10px 14px; align-items: center; justify-content: space-between;
  padding-top: 12px; border-top: 2px dashed var(--painel-borda);
}
.painel-personagem .rodape-fantasia[hidden], .painel-personagem .rodape-fantasia [hidden] { display: none; }
.painel-personagem .cores-fantasia, .painel-personagem .pecas-fantasia { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.painel-personagem .pecas-fantasia button { min-height: 44px; padding: 0 14px; border-radius: 999px; }
.painel-personagem button.tirar-fantasia { min-height: 46px; padding: 0 16px; border-radius: 999px; margin-left: auto; }
@media (prefers-reduced-motion: reduce) { .painel-personagem button.carta.festa::after { animation-duration: 0.01s; } }
/* spec 014: fantasia ainda não ganha (silhueta cinza, cadeadinho e o desenho do canteiro) */
.painel-personagem button.carta.trancada { background: #e6e2e8; box-shadow: inset 0 3px 0 rgba(60, 50, 70, 0.14); color: #77707c; }
.painel-personagem button.carta.trancada canvas { filter: brightness(0) opacity(0.28); }
.painel-personagem button.carta .cadeado {
  position: absolute; top: 34px; left: 50%; width: 30px; height: 30px; transform: translateX(-50%);
  display: none; pointer-events: none;
}
.painel-personagem button.carta .canteiro-mini {
  position: absolute; left: 6px; bottom: 30px; width: 34px; height: 23px; display: none; pointer-events: none;
}
.painel-personagem button.carta.trancada .cadeado, .painel-personagem button.carta.trancada .canteiro-mini { display: block; }
.painel-personagem button.carta.estreia::after {
  content: ''; position: absolute; inset: -2px; border-radius: inherit; pointer-events: none;
  background: linear-gradient(115deg, rgba(255, 255, 255, 0) 30%, rgba(255, 248, 200, 0.95) 50%, rgba(255, 255, 255, 0) 70%);
  background-size: 250% 100%; animation: carta-estreia 1.4s ease-out 2 forwards;
  box-shadow: 0 0 0 3px #ffd45a, 0 0 16px rgba(255, 212, 90, 0.9);
}
@keyframes carta-estreia { from { background-position: 120% 0; } to { background-position: -120% 0; opacity: 0.6; } }
.painel-personagem .dica-trancada {
  grid-column: 1 / -1; display: flex; gap: 10px; align-items: center; justify-content: center;
  padding: 8px 12px; border-radius: 16px; background: #fff3d0; box-shadow: inset 0 0 0 3px var(--amarela);
  font: 800 0.95rem var(--jogo); color: var(--tinta);
}
.painel-personagem .dica-trancada[hidden] { display: none; }
.painel-personagem .dica-trancada svg { width: 60px; height: 40px; flex: none; }
@media (prefers-reduced-motion: reduce) { .painel-personagem button.carta.estreia::after { animation-duration: 0.01s; animation-iteration-count: 1; } }
/* festa ao vestir: a prévia dá pulinhos e brilhos saem em volta */
.palco-personagem .pedestal.festa canvas { animation: previa-festa 0.9s ease-out; }
@keyframes previa-festa {
  0%, 100% { transform: none; }
  12% { transform: scale(1.06, 0.94); }
  28% { transform: translateY(-9%) scale(0.97, 1.04); }
  44% { transform: scale(1.04, 0.96); }
  60% { transform: translateY(-5%); }
  76% { transform: scale(1.02, 0.98); }
}
.palco-personagem .brilho-festa {
  position: absolute; z-index: 2; width: 22px; height: 22px; pointer-events: none;
  left: var(--x); top: var(--y); transform: translate(-50%, -50%) scale(0);
  background: #ffe066; clip-path: polygon(50% 0, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0 50%, 38% 38%);
  filter: drop-shadow(0 0 4px rgba(255, 240, 160, 0.9));
  animation: brilho-festa 0.8s ease-out var(--atraso) forwards;
}
@keyframes brilho-festa {
  0% { transform: translate(-50%, -50%) scale(0) rotate(0deg); opacity: 1; }
  45% { transform: translate(-50%, -50%) scale(1.15) rotate(40deg); opacity: 1; }
  100% { transform: translate(-50%, -50%) scale(0.2) rotate(90deg); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .palco-personagem .pedestal.festa canvas { animation: none; }
  .palco-personagem .brilho-festa { animation-duration: 0.4s; }
}
`;

const BRILHOS: Array<[number, number, number]> = [
  [18, 22, 0],
  [82, 18, 60],
  [10, 52, 120],
  [90, 48, 30],
  [26, 80, 90],
  [76, 78, 150],
  [50, 6, 40],
];

/** Festa ao vestir (spec 017): brilho rápido e pulinho do boneco na prévia. */
export function festejarNoPalco(pedestal: HTMLElement): void {
  pedestal.classList.remove('festa');
  void pedestal.offsetWidth;
  pedestal.classList.add('festa');
  for (const b of pedestal.querySelectorAll('.brilho-festa')) b.remove();
  for (const [x, y, atraso] of BRILHOS) {
    const s = document.createElement('i');
    s.className = 'brilho-festa';
    s.setAttribute('aria-hidden', 'true');
    s.style.setProperty('--x', `${x}%`);
    s.style.setProperty('--y', `${y}%`);
    s.style.setProperty('--atraso', `${atraso}ms`);
    pedestal.appendChild(s);
  }
  clearTimeout(Number(pedestal.dataset.festa ?? 0));
  pedestal.dataset.festa = String(
    window.setTimeout(() => {
      pedestal.classList.remove('festa');
      for (const b of pedestal.querySelectorAll('.brilho-festa')) b.remove();
    }, 1100),
  );
}

export interface OpcoesAbaFantasias {
  armazenamento: Armazenamento | null;
  /** Tema do mundo aberto (vem primeiro em "Dos temas"). */
  temaDoMundo?: string;
  aparencia: () => Aparencia;
  /** Spec 023: como a aparência aparece nas fotos (com os tesouros que ela está usando). */
  vista?: (a: Aparencia) => Aparencia;
  /** Nova aparência escolhida aqui; `festa` quando a criança acabou de vestir. */
  mudar: (a: Aparencia, festa: boolean) => void;
}

export interface AbaFantasias {
  /** Reflete a aparência atual (marcas, nomes, cores, peças) e tira as fotos à vista. */
  atualizar(): void;
  mostrarGrupo(g: GrupoFantasia): void;
  grupo(): GrupoFantasia;
}

/** Monta a aba dentro do painel dela (o painel já existe no editor). */
export function criarAbaFantasias(painel: HTMLElement, op: OpcoesAbaFantasias): AbaFantasias {
  let grupo = lerSubAba(op.armazenamento);
  /** O que "Vestir de novo" veste: a última fantasia tirada (lembrada no aparelho). */
  let anterior = lerAnterior(op.armazenamento, op.aparencia().corpo);

  const subAbas = document.createElement('div');
  subAbas.className = 'sub-abas';
  subAbas.setAttribute('role', 'tablist');
  subAbas.setAttribute('aria-label', 'Tipos de fantasia');
  const botoesGrupo = new Map<GrupoFantasia, HTMLButtonElement>();
  const listas = new Map<GrupoFantasia, HTMLElement>();
  const cartas: Array<{
    def: FantasiaDef;
    grupo: GrupoFantasia;
    botao: HTMLButtonElement;
    canvas: HTMLCanvasElement;
    nome: HTMLElement;
  }> = [];

  /** Spec 014: o aviso do cartão trancado ("Ganhe no canteiro da cidade" e o desenho). */
  const dica = document.createElement('div');
  dica.className = 'dica-trancada';
  dica.setAttribute('data-dica-trancada', '');
  dica.setAttribute('role', 'status');
  dica.hidden = true;
  let fecharDica: ReturnType<typeof setTimeout> | undefined;
  function mostrarDica(lista: HTMLElement, def: FantasiaDef): void {
    const onde = ondeSeGanha(def);
    dica.innerHTML = onde.svg;
    dica.append(onde.texto);
    dica.setAttribute('data-dica-onde', def.tema ?? '');
    // aparece no alto da lista à vista e some sozinha
    lista.prepend(dica);
    dica.hidden = false;
    clearTimeout(fecharDica);
    fecharDica = setTimeout(() => (dica.hidden = true), 3500);
  }

  for (const g of GRUPOS_FANTASIA) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('data-grupo-fantasia', g);
    b.append(icone(ICONES_GRUPOS[g]), ROTULOS_GRUPOS[g]);
    b.addEventListener('click', () => mostrarGrupo(g));
    // setas trocam de aba (como nas abas do sistema)
    b.addEventListener('keydown', (e) => {
      const i = GRUPOS_FANTASIA.indexOf(g);
      const passo = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!passo) return;
      e.preventDefault();
      const prox = GRUPOS_FANTASIA[(i + passo + GRUPOS_FANTASIA.length) % GRUPOS_FANTASIA.length];
      mostrarGrupo(prox);
      botoesGrupo.get(prox)?.focus();
    });
    botoesGrupo.set(g, b);
    subAbas.appendChild(b);

    const lista = document.createElement('div');
    lista.className = 'cartas';
    lista.setAttribute('role', 'tabpanel');
    lista.setAttribute('aria-label', ROTULOS_GRUPOS[g]);
    lista.setAttribute('data-cartas', g);
    for (const secao of secoesDaAba(g, op.temaDoMundo)) {
      if (secao.titulo) {
        const t = document.createElement('div');
        t.className = 'secao';
        t.textContent = secao.titulo;
        lista.appendChild(t);
      }
      for (const def of secao.fantasias) {
        const botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'carta';
        botao.setAttribute('data-fantasia', def.id);
        const canvas = document.createElement('canvas');
        canvas.setAttribute('aria-hidden', 'true');
        const nome = document.createElement('span');
        nome.className = 'nome-carta';
        botao.append(canvas, nome);
        if (def.tema) {
          const selo = document.createElement('span');
          selo.className = `selo${def.tema === op.temaDoMundo ? ' meu' : ''}`;
          selo.textContent = NOMES_TEMAS[def.tema]?.curto ?? '';
          selo.setAttribute('aria-hidden', 'true');
          botao.appendChild(selo);
        }
        if (def.desbloqueio) {
          // spec 014: o cadeadinho e o canteiro só aparecem enquanto não foi ganha (CSS)
          const cadeado = document.createElement('span');
          cadeado.className = 'cadeado';
          cadeado.innerHTML = SVG_CADEADO;
          const canteiro = document.createElement('span');
          canteiro.className = 'canteiro-mini';
          canteiro.innerHTML = ondeSeGanha(def).svg;
          botao.append(cadeado, canteiro);
        }
        botao.addEventListener('click', () => escolher(def, botao));
        cartas.push({ def, grupo: g, botao, canvas, nome });
        lista.appendChild(botao);
      }
    }
    listas.set(g, lista);
  }

  // rodapé: cor principal, peças que saem e voltam, tirar / vestir de novo
  const rodape = document.createElement('div');
  rodape.className = 'rodape-fantasia';
  const cores = document.createElement('div');
  cores.className = 'cores-fantasia';
  cores.setAttribute('role', 'group');
  cores.setAttribute('aria-label', 'Cor da fantasia');
  const pecas = document.createElement('div');
  pecas.className = 'pecas-fantasia';
  pecas.setAttribute('role', 'group');
  pecas.setAttribute('aria-label', 'Peças da fantasia');
  const tirar = document.createElement('button');
  tirar.type = 'button';
  tirar.className = 'tirar-fantasia';
  tirar.setAttribute('data-tirar-fantasia', '');
  tirar.addEventListener('click', () => {
    const a = op.aparencia();
    if (a.fantasia) {
      anterior = a.fantasia;
      guardarAnterior(op.armazenamento, a.fantasia);
      op.mudar(tirarFantasia(a), false);
    } else if (anterior && podeVestirFantasia(anterior.id, a)) {
      const vestida = vestirFantasia(a, anterior.id, anterior.cor);
      op.mudar(
        anterior.sem?.length && vestida.fantasia
          ? { ...vestida, fantasia: { ...vestida.fantasia, sem: [...anterior.sem] } }
          : vestida,
        true,
      );
    }
  });
  rodape.append(cores, pecas, tirar);
  painel.append(subAbas, ...listas.values(), rodape);

  function escolher(def: FantasiaDef, botao: HTMLButtonElement): void {
    const a = op.aparencia();
    if (!podeVestirFantasia(def, a)) {
      // trancada: não veste, só conta onde se ganha
      tocarSomInterface('toc');
      const lista = botao.closest<HTMLElement>('.cartas');
      if (lista) mostrarDica(lista, def);
      return;
    }
    // tocar de novo na que já está vestida só faz a festa (nada muda)
    const proxima = a.fantasia?.id === def.id ? a : vestirFantasia(a, def.id);
    botao.classList.remove('festa');
    void botao.offsetWidth;
    botao.classList.add('festa');
    tocarSomInterface('festa');
    op.mudar(proxima, true);
  }

  function mostrarGrupo(g: GrupoFantasia): void {
    grupo = g;
    guardarSubAba(op.armazenamento, g);
    for (const [id, b] of botoesGrupo) b.setAttribute('aria-selected', String(id === g));
    for (const [id, l] of listas) l.hidden = id !== g;
    atualizar();
  }

  /** Bolinhas da cor principal da fantasia vestida (refeitas só quando a fantasia muda). */
  let coresDe = '';
  function desenharCores(a: Aparencia): void {
    const def = a.fantasia && fantasiaPorId(a.fantasia.id);
    // spec 023 (T09): as tintas que vieram de presente de nível (lilás no 4, menta no 9)
    const tintas = TINTAS_PRESENTE.filter((t) => t.nivel <= nivelDaCrianca());
    const chave = def ? `${def.id}|${tintas.length}` : '';
    if (chave !== coresDe) {
      coresDe = chave;
      cores.replaceChildren();
      def?.cores.forEach((cor, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'amostra';
        b.style.setProperty('--cor', cor);
        b.setAttribute('data-cor-fantasia', String(i));
        b.setAttribute('aria-label', `Cor ${i + 1}`);
        b.addEventListener('click', () => op.mudar(trocarCorDaFantasia(op.aparencia(), i), false));
        cores.appendChild(b);
      });
      if (def)
        for (const t of tintas) {
          const b = document.createElement('button');
          b.type = 'button';
          b.className = 'amostra amostra-presente';
          b.style.setProperty('--cor', t.hex);
          b.setAttribute('data-cor-fantasia', String(t.cor));
          b.setAttribute('aria-label', `${t.nome} (presente do nível ${t.nivel})`);
          b.addEventListener('click', () =>
            op.mudar(trocarCorDaFantasia(op.aparencia(), t.cor), false),
          );
          cores.appendChild(b);
        }
    }
    cores.hidden = !def;
    for (const b of cores.querySelectorAll<HTMLButtonElement>('button'))
      b.setAttribute('aria-pressed', String(Number(b.dataset.corFantasia) === a.fantasia?.cor));
  }

  let pecasDe = '';
  function desenharPecas(a: Aparencia): void {
    const lista = pecasOpcionais(a);
    const chave = a.fantasia ? `${a.fantasia.id}|${a.corpo}` : '';
    if (chave !== pecasDe) {
      pecasDe = chave;
      pecas.replaceChildren();
      for (const p of lista) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = p.nome;
        b.setAttribute('data-peca-fantasia', p.tipo);
        b.setAttribute('aria-label', `${p.nome} (tocar para tirar ou pôr)`);
        b.addEventListener('click', () =>
          op.mudar(alternarPecaDaFantasia(op.aparencia(), p.tipo), false),
        );
        pecas.appendChild(b);
      }
    }
    pecas.hidden = !lista.length;
    for (const b of pecas.querySelectorAll<HTMLButtonElement>('button')) {
      const sem = a.fantasia?.sem?.includes(b.dataset.pecaFantasia as TipoPeca) ?? false;
      b.setAttribute('aria-pressed', String(!sem));
    }
  }

  const vista = (x: Aparencia) => op.vista?.(x) ?? x;
  function atualizar(): void {
    const a = op.aparencia();
    const base = tirarFantasia(a);
    const visivel = !painel.hidden;
    for (const c of cartas) {
      const vestida = a.fantasia?.id === c.def.id;
      c.botao.setAttribute('aria-pressed', String(vestida));
      const rotulo = rotuloDaFantasia(c.def, a.corpo);
      if (c.nome.textContent !== rotulo) c.nome.textContent = rotulo;
      const trancada = !podeVestirFantasia(c.def, a);
      c.botao.classList.toggle('trancada', trancada);
      c.botao.setAttribute('data-trancada', String(trancada));
      c.botao.setAttribute(
        'aria-label',
        trancada ? `${rotulo}: ${ondeSeGanha(c.def).texto}` : rotulo,
      );
      // ganhou: o cartão colorido brilha na primeira vez que a criança o vê
      if (
        c.def.desbloqueio &&
        !trancada &&
        visivel &&
        c.grupo === grupo &&
        !jaBrilhou(op.armazenamento, c.def.id)
      ) {
        marcarBrilhou(op.armazenamento, c.def.id);
        c.botao.classList.add('estreia');
        setTimeout(() => c.botao.classList.remove('estreia'), 3000);
      }
      // só as fotos da aba à vista; as outras saem quando a criança abrir a aba
      if (visivel && c.grupo === grupo)
        fotografarBoneco(c.canvas, vista(vestida ? a : vestirFantasia(base, c.def.id)), 'corpo');
    }
    desenharCores(a);
    desenharPecas(a);
    const podeVestir = !a.fantasia && !!anterior && podeVestirFantasia(anterior.id, a);
    tirar.hidden = !a.fantasia && !podeVestir;
    tirar.textContent = a.fantasia ? 'Tirar fantasia' : 'Vestir de novo';
    tirar.setAttribute('data-vestir-de-novo', String(!a.fantasia));
    rodape.hidden = !a.fantasia && !podeVestir;
  }

  mostrarGrupo(grupo);
  return { atualizar, mostrarGrupo, grupo: () => grupo };
}
