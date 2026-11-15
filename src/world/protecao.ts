/**
 * Proteção do que o mundo construiu (spec 016, T01). Uma regra só, pura e determinística,
 * para o núcleo (servidor na nuvem e modo local) e para o cliente (cadeado e rachadura):
 * mesma semente, mesmo estilo e mesmas regiões sem povoado dão a mesma resposta.
 *
 * Nada é gravado bloco a bloco: o chunk refaz o último passo da geração (`pintarEstruturas`,
 * o mesmo que `gerarChunk` usa) num rascunho e classifica cada célula. O resultado fica em
 * memória por chunk (só a faixa de altura que tem algo protegido), com limite de chunks.
 *
 * O que cada célula é (o núcleo decide com isto; a T03 aplica as regras):
 * - LIVRE: terreno natural e o vão das construções (dentro da casa enfeitar pode).
 * - ESTRUTURA: bloco que a geração pôs (parede, telhado, cerca, tocha, água do poço).
 * - USAVEL: bloco do mundo que se usa (porta, porteira, cama, mesa, fornalha, baú): não
 *   quebra, mas abre, fecha e guarda.
 * - LAVOURA: pé da lavoura gerada (sítio e espantalho): colhe e se replanta sozinho.
 * - CHAO: o terreno embaixo e em volta (margem de MARGEM_CHAO colunas, PROFUNDIDADE_CHAO
 *   blocos abaixo da superfície): não quebra, para ninguém cavar e deixar a casa no ar.
 * - PASSAGEM: tem que ficar vazia (porta e as células na frente e logo dentro, o vão da
 *   porteira dos dois lados, a trilha da lavoura e os caminhos dos moradores).
 * - OBRA (spec 014, T05): o miolo do canteiro que ainda não virou obra feita. Vazia, a
 *   célula da planta aceita só o bloco da planta (`planejado`); cheia, não quebra. O resto
 *   do miolo espera a obra (ninguém põe nada ali).
 *
 * As células da estrutura que estão vazias num mundo antigo (alguém quebrou antes desta
 * spec) continuam ESTRUTURA ou USAVEL: ninguém tapa o buraco com outra coisa. Repor o
 * bloco que a geração pôs (`gerado`) é o conserto que a T03 pode aceitar. Ver "Notas da
 * T01" na spec.
 */
import { Bloco, obterBloco } from './blocks';
import {
  ALTURA,
  TAM_X,
  TAM_Z,
  alturaTerreno,
  cantoDoMundo,
  cidadeDoMundo,
  estiloMundo,
  estruturaDoChunk,
  versaoDoCanto,
} from './chunk';
import { celulaDoBolo, type PlanoCanto } from './cantoMissoes';
import {
  frenteDaPorta,
  noLote,
  portaoDoCercado,
  versaoDosPovoados,
  type Lote,
  type PlanoPovoado,
} from './povoado';
import { lavouraDoBloco } from '../jogo/plantio';
import { distanciaDaCidade, passagensDaCidade } from './cidade';
import { construirVila, distanciaDaVila } from './vilaNeon';

/** Passo de cada direção do metadado (0 +z, 1 +x, 2 -z, 3 -x). */
const DIRS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 0],
  [0, -1],
  [-1, 0],
];
import {
  ALTURA_OBRA,
  canteiroDoMiolo,
  planejadoNaCidade,
  situacaoDoCanteiro,
  versaoDasObras,
  type CelulaPlanejada,
} from './obras';

export const Protecao = {
  LIVRE: 0,
  ESTRUTURA: 1,
  USAVEL: 2,
  LAVOURA: 3,
  CHAO: 4,
  PASSAGEM: 5,
  OBRA: 6,
} as const;
export type Protecao = (typeof Protecao)[keyof typeof Protecao];

export const NOMES_PROTECAO = [
  'livre',
  'estrutura',
  'usavel',
  'lavoura',
  'chao',
  'passagem',
  'obra',
] as const;
export type NomeProtecao = (typeof NOMES_PROTECAO)[number];

/**
 * Colunas de chão protegido em volta do piso do povoado (e da ruína). Duas é a borda
 * plana que o povoado já aplaina (`borda`): quem cava logo ao lado da parede não abre
 * buraco sob a casa; dali para fora a rampa é terreno de cavar.
 */
export const MARGEM_CHAO = 2;
/** Blocos protegidos abaixo da superfície (além dela): cavar por baixo não derruba a casa. */
export const PROFUNDIDADE_CHAO = 3;

/** Blocos que o mundo põe e que todo mundo usa (abre, fecha, deita, guarda, cozinha). */
const USAVEIS: ReadonlySet<number> = new Set([
  Bloco.CAMA,
  Bloco.MESA_TRABALHO,
  Bloco.FORNALHA,
  Bloco.FORNALHA_ACESA,
  Bloco.BAU,
  Bloco.PORTA,
  Bloco.PORTA_ABERTA,
  Bloco.PORTEIRA,
  Bloco.PORTEIRA_ABERTA,
]);
// os bancos da praça (degraus de escada) são estrutura: senta-se sem quebrar

/** Ninguém quebra (o chão, a estrutura e os usáveis). A lavoura colhe. */
export function naoQuebra(p: Protecao): boolean {
  return (
    p === Protecao.ESTRUTURA || p === Protecao.USAVEL || p === Protecao.CHAO || p === Protecao.OBRA
  );
}

/** Ninguém coloca ali (a passagem fica livre; a célula da estrutura é dela). */
export function naoColoca(p: Protecao): boolean {
  return p === Protecao.PASSAGEM || p === Protecao.ESTRUTURA || p === Protecao.USAVEL;
}

/** Estágio 0 da planta que a lavoura do mundo replanta depois da colheita, ou null. */
export function replantioDaLavoura(colhido: number): number | null {
  return lavouraDoBloco(colhido)?.primeiro ?? null;
}

/**
 * De quem é a construção do chunk, para o aviso (spec 016, T03): a vila, o sítio, a ruína ou
 * a estrutura rara do tema.
 */
export type LugarProtecao = 'vila' | 'sitio' | 'ruina' | 'estrutura' | 'cidade' | 'bairro';

/** Proteção de um chunk: só a faixa de altura [y0, y1] com algo protegido. */
export interface MascaraProtecao {
  /** O que o mundo construiu aqui (o aviso fala dele). */
  lugar: LugarProtecao;
  y0: number;
  y1: number;
  /** ((y - y0) * TAM_Z + z) * TAM_X + x */
  dados: Uint8Array;
}

const NAO_PINTADO = 255;
const CAMADA = TAM_X * TAM_Z;

/**
 * Proteção do chunk (cx, cz), sem memória (null: nada protegido). Usa o estilo do mundo e
 * as regiões sem povoado definidos agora, como a geração.
 */
export function protecaoDoChunk(
  cx: number,
  cz: number,
  semente: number,
  rascunho: Uint8Array = new Uint8Array(TAM_X * ALTURA * TAM_Z),
): MascaraProtecao | null {
  rascunho.fill(NAO_PINTADO);
  const e = estruturaDoChunk(cx, cz, semente, rascunho);
  if (!e) return null;
  const cls = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  /** Célula pintada pela geração (bloco ou vão): o chão não a cobre. */
  const pintada = (i: number) => rascunho[i] !== NAO_PINTADO;
  let y0 = ALTURA;
  let y1 = -1;
  const marcar = (i: number, p: Protecao) => {
    cls[i] = p;
    const y = Math.floor(i / CAMADA);
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  };
  // 1. o que a geração pintou
  for (let i = 0; i < rascunho.length; i++) {
    const b = rascunho[i];
    if (b === NAO_PINTADO || b === Bloco.AR) continue;
    if (USAVEIS.has(b)) marcar(i, Protecao.USAVEL);
    else if (lavouraDoBloco(b)) marcar(i, Protecao.LAVOURA);
    // grama alta, flor e cogumelo de enfeite em cima da ruína: planta, quebra como sempre
    else if (obterBloco(b)?.planta) continue;
    else marcar(i, Protecao.ESTRUTURA);
  }
  const x0 = cx * TAM_X;
  const z0 = cz * TAM_Z;
  const idx = (wx: number, y: number, wz: number) => {
    const x = wx - x0;
    const z = wz - z0;
    if (x < 0 || x >= TAM_X || z < 0 || z >= TAM_Z || y < 1 || y >= ALTURA) return -1;
    return (y * TAM_Z + z) * TAM_X + x;
  };
  /** Chão protegido na coluna, de `ate - PROFUNDIDADE_CHAO` até `ate`. */
  const chao = (wx: number, wz: number, ate: number, de = ate) => {
    for (let y = de - PROFUNDIDADE_CHAO; y <= ate; y++) {
      const i = idx(wx, y, wz);
      if (i >= 0 && !pintada(i) && cls[i] === Protecao.LIVRE) marcar(i, Protecao.CHAO);
    }
  };
  /** Passagem: só no vão (nunca por cima de bloco da estrutura). */
  const passagem = (wx: number, y: number, wz: number) => {
    const i = idx(wx, y, wz);
    if (i < 0) return;
    if (pintada(i) && rascunho[i] !== Bloco.AR && !obterBloco(rascunho[i])?.planta) return;
    marcar(i, Protecao.PASSAGEM);
  };

  if (e.tipo === 'povoado') {
    const p = e.plano;
    // 2. chão: piso do povoado (lotes, praça, caminhos) e a margem em volta
    const w = p.maxX - p.minX + 1;
    for (let z = 0; z < TAM_Z; z++)
      for (let x = 0; x < TAM_X; x++) {
        const wx = x0 + x;
        const wz = z0 + z;
        if (wx < p.minX || wx > p.maxX || wz < p.minZ || wz > p.maxZ) continue;
        const d = p.dist[(wz - p.minZ) * w + (wx - p.minX)];
        if (d > MARGEM_CHAO) continue;
        chao(wx, wz, d === 0 ? p.h : alturaTerreno(wx, wz, semente));
      }
    // 3. passagens
    passagensDoPovoado(p, passagem);
  } else if (e.tipo === 'cidade') {
    // spec 014: o chão da cidade inteira (calçadas, pistas, parque) e a margem em volta não
    // se cavam; o ar em cima das pistas e o caminho das portas e escadas ficam livres
    const p = e.plano;
    for (let z = 0; z < TAM_Z; z++)
      for (let x = 0; x < TAM_X; x++) {
        const wx = x0 + x;
        const wz = z0 + z;
        if (distanciaDaCidade(p, wx, wz) > MARGEM_CHAO) continue;
        chao(wx, wz, alturaTerreno(wx, wz, semente));
      }
    passagensDaCidade(p, cx, cz, passagem);
    // o miolo dos canteiros que ainda não viraram obra feita é célula de obra
    const Y = p.h + 1;
    for (let y = Y; y < Y + ALTURA_OBRA; y++)
      for (let z = 0; z < TAM_Z; z++)
        for (let x = 0; x < TAM_X; x++) {
          const n = canteiroDoMiolo(p, x0 + x, y, z0 + z);
          if (n === null || situacaoDoCanteiro(n) === 'feita') continue;
          const i = idx(x0 + x, y, z0 + z);
          if (i < 0 || (pintada(i) && rascunho[i] !== Bloco.AR)) continue;
          marcar(i, Protecao.OBRA);
        }
  } else if (e.tipo === 'vila') {
    // spec 026: o chão do bairro inteiro e a margem não se cavam; a frente das portas e o ar
    // em cima de cada degrau ficam livres (ninguém fecha a escadinha do palco)
    const p = e.plano;
    for (let z = 0; z < TAM_Z; z++)
      for (let x = 0; x < TAM_X; x++) {
        const wx = x0 + x;
        const wz = z0 + z;
        if (distanciaDaVila(p, wx, wz) > MARGEM_CHAO) continue;
        chao(wx, wz, alturaTerreno(wx, wz, semente));
      }
    construirVila(p, cx, cz, (wx, y, wz, id, meta) => {
      if (wx < x0 || wx >= x0 + TAM_X || wz < z0 || wz >= z0 + TAM_Z) return;
      const d = DIRS[(meta ?? 0) & 3];
      if (id === Bloco.PORTA) {
        passagem(wx + d[0], y, wz + d[1]);
        passagem(wx + d[0], y + 1, wz + d[1]);
      } else if (id === Bloco.ESCADINHA_PEDRA) {
        passagem(wx, y + 1, wz);
        passagem(wx, y + 2, wz);
      }
    });
  } else if (e.tipo === 'canto') {
    // spec 031: o canto das missões. O chão das peças não se cava; o ninho, a cova da caixa
    // de areia e o lugar dos ovinhos ficam vazios; as células do bolo são de obra (só o bloco
    // certo entra; cheias, não quebram)
    const p: PlanoCanto = e.plano;
    for (const [wx, wz, h] of p.chao) chao(wx, wz, h);
    for (const [wx, y, wz] of p.passagens) passagem(wx, y, wz);
    for (const c of p.bolo) {
      const i = idx(c.x, c.y, c.z);
      if (i >= 0) marcar(i, Protecao.OBRA);
    }
  } else {
    // ruína (ou estrutura do tema): piso 7x7 no meio do chunk, mais a margem
    const { h } = e;
    const r = 3 + MARGEM_CHAO;
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) {
        const wx = x0 + 8 + dx;
        const wz = z0 + 8 + dz;
        const natural = alturaTerreno(wx, wz, semente);
        if (Math.abs(dx) <= 3 && Math.abs(dz) <= 3) chao(wx, wz, h, Math.min(h, natural));
        else chao(wx, wz, natural);
      }
    // portas das formas fechadas (cúpula e casinha): a porta, uma célula dentro e uma fora
    const ate = e.forma === 'cupula' ? 4 : e.forma === 'casinha' ? 3 : 0;
    for (let dz = 1; dz <= ate; dz++)
      for (const y of [h + 1, h + 2]) passagem(x0 + 8, y, z0 + 8 + dz);
  }
  if (y1 < 0) return null;
  const lugar: LugarProtecao =
    e.tipo === 'cidade'
      ? 'cidade'
      : e.tipo === 'vila'
        ? 'bairro'
        : e.tipo === 'canto'
          ? 'estrutura'
          : e.tipo === 'povoado'
            ? e.plano.lotes.some((l) => l.uso !== undefined)
              ? 'sitio'
              : 'vila'
            : e.forma === 'ruina'
              ? 'ruina'
              : 'estrutura';
  return { lugar, y0, y1, dados: cls.slice(y0 * CAMADA, (y1 + 1) * CAMADA) };
}

/**
 * Passagens do povoado. Toda porta fica no meio da frente do lote (s = 3), do lado de fora
 * (f = -1, onde começa o caminho) até o miolo (f = 3, onde o morador dorme): é o corredor
 * que `abrirPorta` (e as casas do sítio) abrem, com uma célula a mais de cada lado.
 */
function passagensDoPovoado(
  p: PlanoPovoado,
  passagem: (wx: number, y: number, wz: number) => void,
): void {
  const q = (l: Lote, s: number, f: number, y: number) => {
    const [x, z] = noLote(l, s, f);
    passagem(x, l.h + y, z);
  };
  for (const l of p.lotes) {
    const [fx, fz] = frenteDaPorta(l);
    for (const y of [1, 2]) passagem(fx, l.h + y, fz);
    switch (l.uso) {
      case 'lavoura':
        // a trilha do meio, entre os dois canteiros
        for (let f = 0; f <= 6; f++) for (const y of [1, 2]) q(l, 3, f, y);
        break;
      case 'curral':
      case 'galinheiro': {
        // o vão da porteira: a célula de fora e a de dentro
        const { portao, fora } = portaoDoCercado(l, p.cz);
        const dentro: [number, number] = [2 * portao[0] - fora[0], 2 * portao[1] - fora[1]];
        for (const [x, z] of [fora, dentro]) for (const y of [1, 2]) passagem(x, l.h + y, z);
        break;
      }
      case 'celeiro':
        // portão largo (3 de largura) e o corredor até o miolo
        for (let s = 2; s <= 4; s++)
          for (let f = 0; f <= 1; f++) for (const y of [1, 2, 3]) q(l, s, f, y);
        for (let f = 2; f <= 3; f++) for (const y of [1, 2]) q(l, 3, f, y);
        break;
      default:
        for (let f = 0; f <= 3; f++) for (const y of [1, 2]) q(l, 3, f, y);
    }
  }
  // caminhos: por onde os moradores andam (da praça até cada porta e porteira)
  for (const [c, h] of p.caminho) {
    const x = Math.floor(c / 65536) - 32768;
    const z = (c % 65536) - 32768;
    for (const y of [1, 2]) passagem(x, h + y, z);
  }
}

/** Consulta com memória por chunk (uma por mundo: núcleo e cena criam a sua). */
export interface ProtecaoMundo {
  /** O que a célula é (ver o topo do arquivo). */
  em(x: number, y: number, z: number): Protecao;
  /** De quem é a construção do chunk da coluna (null: nada protegido no chunk). */
  lugar(x: number, z: number): LugarProtecao | null;
  /** Máscara do chunk (null: nada protegido nele). */
  doChunk(cx: number, cz: number): MascaraProtecao | null;
  /**
   * Spec 014 (T05): a célula da planta de uma obra aberta (o bloco e o meta que ela pede),
   * ou null. O núcleo e o cliente perguntam a mesma coisa.
   */
  planejado(x: number, y: number, z: number): CelulaPlanejada | null;
  /** Esquece tudo (o estilo e as regiões sem povoado também esquecem sozinhos). */
  limpar(): void;
}

/** Chunks guardados por padrão (cada um guarda só a faixa protegida, poucos KB). */
export const LIMITE_CHUNKS_PROTECAO = 512;
/**
 * Spec 031: o "canteiro" do bolo do Doce Reino (as células planejadas dele usam o mesmo formato
 * das obras da cidade: os fantasmas, a mira e o núcleo leem igual). Longe dos da cidade (1 a 6).
 */
export const CANTEIRO_BOLO = 31;

export function criarProtecaoMundo(
  semente: number,
  limite: number = LIMITE_CHUNKS_PROTECAO,
): ProtecaoMundo {
  const cache = new Map<number, MascaraProtecao | null>();
  const rascunho = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  let estilo = estiloMundo();
  let versao = versaoDosPovoados();
  let obras = versaoDasObras();
  let canto = versaoDoCanto();
  let ultimaChave = NaN;
  let ultima: MascaraProtecao | null = null;
  const chave = (cx: number, cz: number) => (cx + 32768) * 65536 + (cz + 32768);
  function doChunk(cx: number, cz: number): MascaraProtecao | null {
    // o estilo do mundo ou as regiões sem povoado mudaram: a geração muda junto
    if (
      estiloMundo() !== estilo ||
      versaoDosPovoados() !== versao ||
      versaoDasObras() !== obras ||
      versaoDoCanto() !== canto
    ) {
      canto = versaoDoCanto();
      estilo = estiloMundo();
      versao = versaoDosPovoados();
      obras = versaoDasObras();
      cache.clear();
      ultimaChave = NaN;
    }
    const k = chave(cx, cz);
    if (k === ultimaChave) return ultima;
    let m = cache.get(k);
    if (m === undefined) {
      m = protecaoDoChunk(cx, cz, semente, rascunho);
      cache.set(k, m);
      if (cache.size > limite) cache.delete(cache.keys().next().value as number);
    }
    ultimaChave = k;
    ultima = m;
    return m;
  }
  return {
    em(x, y, z) {
      if (y < 0 || y >= ALTURA) return Protecao.LIVRE;
      const cx = Math.floor(x / TAM_X);
      const cz = Math.floor(z / TAM_Z);
      const m = doChunk(cx, cz);
      if (!m || y < m.y0 || y > m.y1) return Protecao.LIVRE;
      return m.dados[
        ((y - m.y0) * TAM_Z + (z - cz * TAM_Z)) * TAM_X + (x - cx * TAM_X)
      ] as Protecao;
    },
    lugar(x, z) {
      return doChunk(Math.floor(x / TAM_X), Math.floor(z / TAM_Z))?.lugar ?? null;
    },
    doChunk,
    planejado(x, y, z) {
      // spec 031: a célula do bolo do canto das missões (sempre aberta)
      const b = celulaDoBolo(cantoDoMundo(semente), x, y, z);
      if (b) return { ...b, canteiro: CANTEIRO_BOLO, meta: 0 };
      const c = cidadeDoMundo(semente);
      if (!c) return null;
      const p = planejadoNaCidade(c, x, y, z);
      return p && situacaoDoCanteiro(p.canteiro) === 'aberta' ? p : null;
    },
    limpar() {
      cache.clear();
      ultimaChave = NaN;
      ultima = null;
    },
  };
}

let padrao: { semente: number; p: ProtecaoMundo } | null = null;

/**
 * Atalho sem instância (testes, ferramentas): proteção da célula no mundo da semente.
 * O núcleo e a cena usam `criarProtecaoMundo`, uma por mundo.
 */
export function protecaoDoMundo(x: number, y: number, z: number, semente: number): Protecao {
  if (!padrao || padrao.semente !== semente) padrao = { semente, p: criarProtecaoMundo(semente) };
  return padrao.p.em(x, y, z);
}

/** Nome da proteção (avisos de teste e depuração). */
export function nomeProtecao(p: Protecao): NomeProtecao {
  return NOMES_PROTECAO[p];
}
