/**
 * Povoados (spec 008): planejados uma vez por região de 128×128 blocos, de forma pura e
 * determinística (mesma semente, mesmo povoado, na thread principal e no worker, em
 * qualquer ordem de chunk). Cada chunk aplica só a parte que cai nele.
 *
 * A mecânica é a mesma em todo tema: posições, lotes, tipos de construção, blocos
 * funcionais (camas, mesas, fornalhas, baú, luz) e profissões. O tema escolhe só a forma.
 */
import { Bloco } from './blocks';
import { hash2 } from './noise';
import type { Bioma } from './chunk';

export const REGIAO_POVOADO = 128;
/** Raio máximo ocupado (lotes, caminhos e rampas) a partir do centro. */
export const RAIO_POVOADO = 30;
const TAM_LOTE = 7;
/** Lado da praça: o marco ocupa o miolo (até 2 do centro), os postes os cantos. */
export const PRACA = 9;
/** Alcance máximo da rampa entre o piso do povoado e o terreno natural. */
const RAMPA = 8;
const MAX_DESNIVEL = 4;

export type Profissao = 'ferreiro' | 'cozinheiro' | 'construtor';
export const PROFISSOES: readonly Profissao[] = ['ferreiro', 'cozinheiro', 'construtor'];
/** 'campo' (spec 013): lote do sítio sem construção de morar (lavoura, curral, galinheiro). */
export type TipoLote = 'casa' | 'oficina' | 'deposito' | 'campo';
export type FormaCasa = 'duas-aguas' | 'cupula' | 'tenda' | 'redonda' | 'modulo';
export type FormaMarco = 'poco' | 'fonte' | 'antena' | 'totem' | 'esqueleto' | 'moinho';
/**
 * Spec 013: o que o planejador põe nos lotes. 'vila' (ou sem o campo) é o povoado de
 * sempre; 'sitio' troca as casas por casa da fazenda, celeiro, ferraria, silo, lavouras,
 * curral e galinheiro (mesma região, mesmo raio e mesmo lote).
 */
export type PlantaPovoado = 'vila' | 'sitio';
/** Uso de cada lote do sítio (o `tipo` continua dizendo casa, oficina, depósito ou campo). */
export type UsoSitio =
  | 'fazenda'
  | 'celeiro'
  | 'ferraria'
  | 'silo'
  | 'lavoura'
  | 'curral'
  | 'galinheiro';

export interface FormasPovoado {
  casa: FormaCasa;
  oficina: FormaCasa;
  deposito: FormaCasa;
  marco: FormaMarco;
  /** Spec 013: sem o campo, 'vila'. No sítio, casa/oficina/depósito não se aplicam. */
  planta?: PlantaPovoado;
}
export const FORMAS_PADRAO: FormasPovoado = {
  casa: 'duas-aguas',
  oficina: 'duas-aguas',
  deposito: 'duas-aguas',
  marco: 'poco',
};

/** Porta: lado do lote voltado para a praça. */
export type Lado = 'n' | 's' | 'l' | 'o';

export interface Lote {
  tipo: TipoLote;
  /** Profissão da oficina (oficinas) ou do morador (casas). */
  profissao?: Profissao;
  /** Canto mínimo do lote (inclusivo) e tamanho. */
  x0: number;
  z0: number;
  /** Altura do chão do lote (y do bloco de piso). */
  h: number;
  porta: Lado;
  /** Caminho a pé da borda da praça até a frente da porta (com a quina do L). */
  rota: [number, number][];
  /** Só no sítio: o que vai no lote. */
  uso?: UsoSitio;
}

/**
 * Cercado do sítio (curral ou galinheiro): onde nascem os bichos do sítio, até 3 por
 * cercado. O papel do bicho é o mesmo em todo tema (o Rancho chama de vaca e galinha).
 */
export interface Cercado {
  /** Índice do lote no plano. */
  lote: number;
  bicho: 'cervo' | 'coelho';
  /** Miolo livre do cercado (inclusivo): onde os bichos nascem. */
  x0: number;
  z0: number;
  x1: number;
  z1: number;
  /** Porteira (porta de dois blocos na cerca, que o jogador abre e fecha) e a célula de fora. */
  portao: [number, number];
  fora: [number, number];
}

export interface Morador {
  /** Índice estável no povoado (nome, profissão e casa saem daqui). */
  n: number;
  profissao: Profissao;
  casa: number;
  oficina: number;
}

export interface PlanoPovoado {
  id: string;
  /** Centro da praça e altura do piso dela. */
  cx: number;
  cz: number;
  h: number;
  lotes: Lote[];
  moradores: Morador[];
  /** Caminhos: células (x, z) e a altura do piso em cada uma. */
  caminho: Map<number, number>;
  /** Caixa ocupada (com rampas) para consultas rápidas. */
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Distância (Chebyshev) de cada coluna da caixa até o piso do povoado (0 = piso). */
  dist: Uint8Array;
  /** Tipo do piso: 0 nada, 1 lote, 2 praça, 3 caminho. */
  piso: Uint8Array;
  /**
   * Células de borda plana em volta do piso: 2 quando o terreno permite (quem sai um
   * pouco do caminho não desce degrau), senão 1. Não muda quais povoados existem.
   */
  borda: 1 | 2;
  /** Só no sítio (spec 013): os cercados com bichos. */
  currais?: Cercado[];
  /** Só no sítio: baú do celeiro (sementes e enxada), em coordenadas de mundo. */
  bauCeleiro?: [number, number, number];
}

const BIOMAS_OK: ReadonlySet<Bioma> = new Set(['floresta', 'campos', 'deserto', 'taiga', 'praia']);

/** Funções do terreno natural (injetadas por chunk.ts, sem import circular de valores). */
export interface TerrenoNatural {
  altura(wx: number, wz: number, semente: number): number;
  bioma(wx: number, wz: number, semente: number, h: number): Bioma;
  nivelMar: number;
  /** Ponto de nascimento do jogador (nenhum povoado o cobre). */
  nascimento?(semente: number): { x: number; z: number };
  /** Spec 013: o que vai nos lotes (do estilo do mundo; sem o campo, 'vila'). */
  readonly planta?: PlantaPovoado;
}

const chave = (x: number, z: number) => (x + 32768) * 65536 + (z + 32768);

const cache = new Map<string, PlanoPovoado | null>();

/** Limpa o cache (testes que trocam de semente muitas vezes). */
export function limparPovoados(): void {
  cache.clear();
  versao++;
}

/**
 * Regiões sem povoado neste mundo: num mundo criado antes dos povoados, as regiões
 * onde o jogador já editou algo (o povoado não pode nascer em cima da construção dele).
 */
let regioesBloqueadas: ReadonlySet<string> = new Set();
let versao = 0;
export function definirRegioesSemPovoado(regioes: readonly string[]): void {
  // o servidor troca de mundo o tempo todo: a mesma lista não apaga os planos à toa
  if (regioes.length === regioesBloqueadas.size && regioes.every((r) => regioesBloqueadas.has(r)))
    return;
  regioesBloqueadas = new Set(regioes);
  cache.clear();
  versao++;
}

/** Muda sempre que os planos podem ter mudado (para memórias fora deste módulo). */
export function versaoDosPovoados(): number {
  return versao;
}

/** Região ("rx,rz") de um chunk. */
export function regiaoDoChunk(cx: number, cz: number): string {
  const n = REGIAO_POVOADO / 16;
  return `${Math.floor(cx / n)},${Math.floor(cz / n)}`;
}

/** Plano do povoado da região (rx, rz), ou null se ela não tiver povoado. */
export function planoDaRegiao(
  rx: number,
  rz: number,
  semente: number,
  t: TerrenoNatural,
): PlanoPovoado | null {
  if (regioesBloqueadas.has(`${rx},${rz}`)) return null;
  return planoSemBloqueio(rx, rz, semente, t);
}

/**
 * Plano da região sem olhar as regiões bloqueadas dos mundos antigos (o nascimento perto
 * do sítio sai daqui, igual no cliente e no servidor).
 */
export function planoSemBloqueio(
  rx: number,
  rz: number,
  semente: number,
  t: TerrenoNatural,
): PlanoPovoado | null {
  const planta = t.planta ?? 'vila';
  const k = planta === 'vila' ? `${rx},${rz},${semente}` : `${rx},${rz},${semente},${planta}`;
  if (cache.has(k)) return cache.get(k)!;
  const p = planejar(rx, rz, semente, t);
  if (cache.size > 256) cache.clear();
  cache.set(k, p);
  return p;
}

/** Lotes do sítio, na ordem do anel (os vizinhos combinam: lavoura perto da casa e do celeiro). */
function lotesDoSitio(
  rx: number,
  rz: number,
  semente: number,
): { tipo: TipoLote; profissao?: Profissao; uso: UsoSitio }[] {
  const duas = hash2(rx, rz, semente + 7104) < 0.5;
  return [
    { tipo: 'casa', profissao: 'cozinheiro', uso: 'fazenda' },
    { tipo: 'campo', uso: 'lavoura' },
    { tipo: 'oficina', profissao: 'construtor', uso: 'celeiro' },
    { tipo: 'deposito', uso: 'silo' },
    { tipo: 'campo', uso: 'curral' },
    { tipo: 'campo', uso: 'galinheiro' },
    { tipo: 'oficina', profissao: 'ferreiro', uso: 'ferraria' },
    ...(duas ? [{ tipo: 'campo' as const, uso: 'lavoura' as const }] : []),
  ];
}

/**
 * Porteira do cercado. A porta gerada pelo mundo tem sempre a mesma direção (painel no
 * eixo x), então a porteira fica num lado de z constante: na frente, se a frente for
 * norte ou sul; senão no lado (norte ou sul) mais perto da praça, junto da frente.
 */
export function portaoDoCercado(
  l: Lote,
  cz: number,
): { portao: [number, number]; fora: [number, number] } {
  if (l.porta === 'n') return { portao: [l.x0 + 3, l.z0], fora: [l.x0 + 3, l.z0 - 1] };
  if (l.porta === 's')
    return { portao: [l.x0 + 3, l.z0 + TAM_LOTE - 1], fora: [l.x0 + 3, l.z0 + TAM_LOTE] };
  const x = l.porta === 'o' ? l.x0 + 1 : l.x0 + TAM_LOTE - 2;
  return cz < l.z0 + 3
    ? { portao: [x, l.z0], fora: [x, l.z0 - 1] }
    : { portao: [x, l.z0 + TAM_LOTE - 1], fora: [x, l.z0 + TAM_LOTE] };
}

/** Lugares tentados por região no sítio (o povoado de sempre tenta só o primeiro). */
const TENTATIVAS_SITIO = 6;

function planejar(rx: number, rz: number, semente: number, t: TerrenoNatural): PlanoPovoado | null {
  // metade das regiões tem chance de povoado
  if (hash2(rx, rz, semente + 7101) > 0.5) return null;
  if (t.planta !== 'sitio') return planejarEm(rx, rz, semente, t, 0);
  // spec 013: o sítio procura mais de um lugar na região (o Rancho nasce perto de um),
  // com sorteios novos a partir do segundo
  for (let k = 0; k < TENTATIVAS_SITIO; k++) {
    const p = planejarEm(rx, rz, semente, t, k);
    if (p) return p;
  }
  return null;
}

function planejarEm(
  rx: number,
  rz: number,
  semente: number,
  t: TerrenoNatural,
  tentativa: number,
): PlanoPovoado | null {
  const margem = RAIO_POVOADO + 2;
  const sx = tentativa === 0 ? 7102 : 7130 + tentativa * 2;
  const sz = tentativa === 0 ? 7103 : 7131 + tentativa * 2;
  const cx = Math.floor(
    rx * REGIAO_POVOADO + margem + hash2(rx, rz, semente + sx) * (REGIAO_POVOADO - 2 * margem),
  );
  const cz = Math.floor(
    rz * REGIAO_POVOADO + margem + hash2(rx, rz, semente + sz) * (REGIAO_POVOADO - 2 * margem),
  );
  const h = t.altura(cx, cz, semente);
  if (h <= t.nivelMar + 1 || h >= 88) return null;
  if (!BIOMAS_OK.has(t.bioma(cx, cz, semente, h))) return null;
  // relevo calmo em volta da praça
  let min = h;
  let max = h;
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2;
    const y = t.altura(
      Math.round(cx + Math.cos(ang) * 14),
      Math.round(cz + Math.sin(ang) * 14),
      semente,
    );
    min = Math.min(min, y);
    max = Math.max(max, y);
  }
  if (max - min > 7) return null;

  const sitio = t.planta === 'sitio';
  // lotes: 3 a 6 casas, as 3 oficinas e o depósito, num anel em volta da praça
  // (no sítio, os lotes da roça: spec 013)
  const nCasas = 3 + Math.floor(hash2(rx, rz, semente + 7104) * 4);
  const tipos: { tipo: TipoLote; profissao?: Profissao; uso?: UsoSitio }[] = sitio
    ? lotesDoSitio(rx, rz, semente)
    : [
        ...PROFISSOES.map((p) => ({ tipo: 'oficina' as const, profissao: p })),
        { tipo: 'deposito' as const },
        ...Array.from({ length: nCasas }, () => ({ tipo: 'casa' as const })),
      ];
  const giro = hash2(rx, rz, semente + 7105) * Math.PI * 2;
  const raio = 14 + (tipos.length > 8 ? 2 : 0);
  const lotes: Lote[] = [];
  const ocupado = (x0: number, z0: number) =>
    lotes.some(
      (l) =>
        x0 < l.x0 + TAM_LOTE + 1 &&
        x0 + TAM_LOTE + 1 > l.x0 &&
        z0 < l.z0 + TAM_LOTE + 1 &&
        z0 + TAM_LOTE + 1 > l.z0,
    );
  tipos.forEach((tp, i) => {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const ang = giro + (i / tipos.length) * Math.PI * 2 + tentativa * 0.21;
      const r = raio + tentativa * 2;
      const mx = Math.round(cx + Math.cos(ang) * r);
      const mz = Math.round(cz + Math.sin(ang) * r);
      const x0 = mx - 3;
      const z0 = mz - 3;
      if (ocupado(x0, z0)) continue;
      // não invade a praça
      if (
        Math.abs(mx - cx) < (PRACA + TAM_LOTE) / 2 + 1 &&
        Math.abs(mz - cz) < (PRACA + TAM_LOTE) / 2 + 1
      )
        continue;
      const natural = t.altura(mx, mz, semente);
      if (Math.abs(natural - h) > MAX_DESNIVEL) continue;
      if (natural <= t.nivelMar) continue;
      // o povoado inteiro fica numa altura só (sem degraus entre lotes vizinhos);
      // as rampas em volta levam ao terreno natural
      const piso = h;
      const dx = cx - mx;
      const dz = cz - mz;
      const porta: Lado = Math.abs(dx) > Math.abs(dz) ? (dx > 0 ? 'l' : 'o') : dz > 0 ? 's' : 'n';
      lotes.push({ tipo: tp.tipo, profissao: tp.profissao, x0, z0, h: piso, porta, rota: [] });
      if (tp.uso) lotes[lotes.length - 1].uso = tp.uso;
      return;
    }
  });
  const moradores: Morador[] = [];
  if (sitio) {
    // o sítio precisa de tudo (só a segunda lavoura é opcional)
    const usos = new Set(lotes.map((l) => l.uso));
    if (lotes.length < 7 || usos.size < 7) return null;
    // três moradores, cada um mora onde trabalha: a fazendeira (cozinheira) na casa da
    // fazenda, o carpinteiro (construtor) no celeiro e a ferreira na ferraria
    const onde: Record<Profissao, UsoSitio> = {
      ferreiro: 'ferraria',
      cozinheiro: 'fazenda',
      construtor: 'celeiro',
    };
    for (const profissao of PROFISSOES) {
      const i = lotes.findIndex((l) => l.uso === onde[profissao]);
      moradores.push({ n: moradores.length, profissao, casa: i, oficina: i });
    }
  } else {
    // sem as três oficinas e o depósito não há povoado
    if (
      lotes.filter((l) => l.tipo !== 'casa').length < 4 ||
      lotes.filter((l) => l.tipo === 'casa').length < 2
    )
      return null;

    // um morador por casa; profissões em rodízio
    const oficinas = new Map(lotes.map((l, i) => [l.profissao, i] as const).filter(([p]) => p));
    lotes.forEach((l, i) => {
      if (l.tipo !== 'casa') return;
      const profissao = PROFISSOES[moradores.length % PROFISSOES.length];
      moradores.push({
        n: moradores.length,
        profissao,
        casa: i,
        oficina: oficinas.get(profissao)!,
      });
    });
    for (const l of lotes)
      if (l.tipo === 'casa') l.profissao = moradores.find((m) => lotes[m.casa] === l)?.profissao;
  }

  // caminhos: da porta de cada lote até a borda da praça, em L, com a altura interpolada
  const caminho = new Map<number, number>();
  for (const l of lotes) {
    const [px, pz] = frenteDaPorta(l);
    const eixoX = l.porta === 'l' || l.porta === 'o';
    // entra na praça por uma célula da borda que não é canto (os cantos têm postes)
    const borda = (PRACA - 1) / 2;
    const lim = (v: number, m: number) => Math.sign(v) * Math.min(Math.abs(v), m);
    const ex = eixoX ? Math.sign(px - cx) * borda : lim(px - cx, borda - 2);
    const ez = eixoX ? lim(pz - cz, borda - 2) : Math.sign(pz - cz) * borda;
    const E: [number, number] = [cx + ex, cz + ez];
    // um passo para fora da praça no eixo da porta: a perna lateral corre fora da borda
    const O: [number, number] = eixoX ? [E[0] + Math.sign(ex), E[1]] : [E[0], E[1] + Math.sign(ez)];
    // da porta pelo eixo dela até a fileira de O, depois de lado até O, e entra em E
    const C: [number, number] = eixoX ? [O[0], pz] : [px, O[1]];
    const pts: [number, number][] = [];
    const andar = (de: [number, number], ate: [number, number]) => {
      let [x, z] = de;
      pts.push([x, z]);
      for (let passo = 0; passo < 80 && (x !== ate[0] || z !== ate[1]); passo++) {
        if (x !== ate[0]) x += Math.sign(ate[0] - x);
        else z += Math.sign(ate[1] - z);
        pts.push([x, z]);
      }
    };
    andar([px, pz], C);
    andar(C, O);
    andar(O, E);
    // rota a pé (da praça para a porta), sem pontos repetidos
    l.rota = [E, O, C, [px, pz] as [number, number]].filter(
      (q, k, a) => k === 0 || q[0] !== a[k - 1][0] || q[1] !== a[k - 1][1],
    );
    for (const [x, z] of pts) {
      const c = chave(x, z);
      if (!caminho.has(c)) caminho.set(c, h);
    }
  }

  // sítio: os cercados, com o caminho da frente do lote até a porteira (por fora do lote)
  const currais: Cercado[] = [];
  if (sitio)
    lotes.forEach((l, i) => {
      if (l.uso !== 'curral' && l.uso !== 'galinheiro') return;
      const { portao, fora } = portaoDoCercado(l, cz);
      const [px, pz] = frenteDaPorta(l);
      // até a quina do lote no lado da porteira, depois ao longo dele até a porteira
      let [x, z] = [px, pz];
      for (let passo = 0; passo < 20 && (x !== fora[0] || z !== fora[1]); passo++) {
        if (z !== fora[1]) z += Math.sign(fora[1] - z);
        else x += Math.sign(fora[0] - x);
        const c = chave(x, z);
        if (!caminho.has(c)) caminho.set(c, h);
      }
      // o galinheiro tem o abrigo no fundo: o miolo para nascer é a parte da frente
      const curral = l.uso === 'curral';
      currais.push({
        lote: i,
        bicho: curral ? 'cervo' : 'coelho',
        x0: l.x0 + 1,
        z0: l.z0 + 1,
        x1: l.x0 + TAM_LOTE - 2,
        z1: l.z0 + TAM_LOTE - 2,
        portao,
        fora,
      });
    });

  // caixa: lotes, praça e caminhos, mais a rampa em volta
  let minX = cx - (PRACA - 1) / 2;
  let maxX = cx + (PRACA - 1) / 2;
  let minZ = cz - (PRACA - 1) / 2;
  let maxZ = cz + (PRACA - 1) / 2;
  for (const l of lotes) {
    minX = Math.min(minX, l.x0);
    maxX = Math.max(maxX, l.x0 + TAM_LOTE - 1);
    minZ = Math.min(minZ, l.z0);
    maxZ = Math.max(maxZ, l.z0 + TAM_LOTE - 1);
  }
  for (const c of caminho.keys()) {
    const x = Math.floor(c / 65536) - 32768;
    const z = (c % 65536) - 32768;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  // caixa da regra de sempre (quais povoados existem) e uma célula a mais de grade,
  // para a rampa da borda larga
  const caixa = { minX: minX - RAMPA, maxX: maxX + RAMPA, minZ: minZ - RAMPA, maxZ: maxZ + RAMPA };
  minX -= RAMPA + 1;
  maxX += RAMPA + 1;
  minZ -= RAMPA + 1;
  maxZ += RAMPA + 1;
  const w = maxX - minX + 1;
  const d = maxZ - minZ + 1;
  const piso = new Uint8Array(w * d);
  const marcar = (x: number, z: number, tipo: number) => {
    if (x < minX || x > maxX || z < minZ || z > maxZ) return;
    const i = (z - minZ) * w + (x - minX);
    if (!piso[i] || tipo === 2) piso[i] = tipo;
  };
  for (const l of lotes)
    for (let dx = 0; dx < TAM_LOTE; dx++)
      for (let dz = 0; dz < TAM_LOTE; dz++) marcar(l.x0 + dx, l.z0 + dz, 1);
  for (const c of caminho.keys()) marcar(Math.floor(c / 65536) - 32768, (c % 65536) - 32768, 3);
  for (let dx = 0; dx < PRACA; dx++)
    for (let dz = 0; dz < PRACA; dz++)
      marcar(cx - (PRACA - 1) / 2 + dx, cz - (PRACA - 1) / 2 + dz, 2);
  // distância de Chebyshev até o piso: duas passadas de chanfro (8 vizinhos, custo 1)
  const dist = new Uint8Array(w * d).fill(255);
  for (let i = 0; i < piso.length; i++) if (piso[i]) dist[i] = 0;
  const viz = (i: number, x: number, z: number, dx: number, dz: number) => {
    const nx = x + dx;
    const nz = z + dz;
    if (nx < 0 || nx >= w || nz < 0 || nz >= d) return;
    const v = dist[nz * w + nx] + 1;
    if (v < dist[i]) dist[i] = v;
  };
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      viz(i, x, z, -1, 0);
      viz(i, x, z, 0, -1);
      viz(i, x, z, -1, -1);
      viz(i, x, z, 1, -1);
    }
  for (let z = d - 1; z >= 0; z--)
    for (let x = w - 1; x >= 0; x--) {
      const i = z * w + x;
      viz(i, x, z, 1, 0);
      viz(i, x, z, 0, 1);
      viz(i, x, z, 1, 1);
      viz(i, x, z, -1, 1);
    }
  // a rampa precisa alcançar o terreno natural: na borda dela, o desnível tem que caber
  // nos RAMPA blocos (senão sobraria um penhasco no fim). Com a borda larga, a rampa
  // anda uma célula a mais e precisa caber do mesmo jeito; se não couber, fica a estreita.
  let borda: 1 | 2 = 2;
  for (let z = 0; z < d; z++)
    for (let x = 0; x < w; x++) {
      const i = z * w + x;
      if (dist[i] !== RAMPA && dist[i] !== RAMPA + 1) continue;
      const nat = t.altura(minX + x, minZ + z, semente);
      const cabe = nat - h <= RAMPA - 1 && h - nat <= Math.ceil((RAMPA - 1) / 2);
      if (dist[i] === RAMPA && !cabe) return null;
      if (dist[i] === RAMPA + 1 && !cabe) borda = 1;
    }
  // o jogador nunca nasce dentro de um povoado (no sítio, é o nascimento que procura um
  // lugar fora de todos eles, perto de um: spec 013)
  const nasc = sitio ? undefined : t.nascimento?.(semente);
  if (
    nasc &&
    nasc.x >= caixa.minX - 2 &&
    nasc.x <= caixa.maxX + 2 &&
    nasc.z >= caixa.minZ - 2 &&
    nasc.z <= caixa.maxZ + 2
  )
    return null;
  return {
    id: `${rx},${rz}`,
    cx,
    cz,
    h,
    lotes,
    moradores,
    caminho,
    minX,
    maxX,
    minZ,
    maxZ,
    dist,
    piso,
    borda,
    ...(sitio ? { currais, bauCeleiro: bauDoCeleiro(lotes) } : {}),
  };
}

/**
 * Peças de cada lote do sítio em coordenadas do lote: `s` corre de lado (3 é o meio, onde
 * fica a porta) e `f` da frente (0, voltada para a praça) ao fundo (6).
 */
export function noLote(l: Lote, s: number, f: number): [number, number] {
  switch (l.porta) {
    case 'n':
      return [l.x0 + s, l.z0 + f];
    case 's':
      return [l.x0 + TAM_LOTE - 1 - s, l.z0 + TAM_LOTE - 1 - f];
    case 'o':
      return [l.x0 + f, l.z0 + s];
    default:
      return [l.x0 + TAM_LOTE - 1 - f, l.z0 + s];
  }
}

/** O baú do celeiro (sementes e enxada): no fundo, à direita de quem entra. */
export const BAU_CELEIRO: [number, number] = [4, 5];

function bauDoCeleiro(lotes: Lote[]): [number, number, number] | undefined {
  const l = lotes.find((q) => q.uso === 'celeiro');
  if (!l) return undefined;
  const [x, z] = noLote(l, ...BAU_CELEIRO);
  return [x, l.h + 1, z];
}

/** Célula logo à frente da porta (do lado de fora). */
export function frenteDaPorta(l: Lote): [number, number] {
  const m = 3;
  switch (l.porta) {
    case 'n':
      return [l.x0 + m, l.z0 - 1];
    case 's':
      return [l.x0 + m, l.z0 + TAM_LOTE];
    case 'l':
      return [l.x0 + TAM_LOTE, l.z0 + m];
    default:
      return [l.x0 - 1, l.z0 + m];
  }
}

/** Ponto dentro da casa, ao lado da cama (onde o morador passa a noite). */
export function dentroDaCasa(l: Lote): [number, number] {
  return [l.x0 + 3, l.z0 + 3];
}

/** Planos que podem afetar a coluna (wx, wz): o da região dela (o povoado não sai da região). */
export function planosNaColuna(
  wx: number,
  wz: number,
  semente: number,
  t: TerrenoNatural,
): PlanoPovoado | null {
  const rx = Math.floor(wx / REGIAO_POVOADO);
  const rz = Math.floor(wz / REGIAO_POVOADO);
  const p = planoDaRegiao(rx, rz, semente, t);
  if (!p || wx < p.minX || wx > p.maxX || wz < p.minZ || wz > p.maxZ) return null;
  return p;
}

export interface AjusteColuna {
  /** Altura final do piso na coluna. */
  h: number;
  /** A coluna é piso de povoado (praça, lote ou caminho): sem árvores nem plantas. */
  ocupada: boolean;
  /** Bloco do piso, se o povoado pintar o chão (praça e caminhos). */
  piso?: number;
}

/**
 * Altura da coluna com o povoado. O piso (praça, lotes e caminhos) fica na altura da
 * praça; em volta, a altura natural é presa a "altura do povoado ± distância até o piso".
 * Isso nunca cria degrau maior que um bloco além dos que o relevo natural já tinha.
 */
export function ajusteDaColuna(
  p: PlanoPovoado,
  wx: number,
  wz: number,
  natural: number,
): AjusteColuna | null {
  if (wx < p.minX || wx > p.maxX || wz < p.minZ || wz > p.maxZ) return null;
  const w = p.maxX - p.minX + 1;
  const i = (wz - p.minZ) * w + (wx - p.minX);
  const d = p.dist[i];
  if (d === 0) {
    const tipo = p.piso[i];
    return {
      h: p.h,
      ocupada: true,
      piso: tipo === 2 ? Bloco.PEDRA_LISA : tipo === 3 ? Bloco.CASCALHO : undefined,
    };
  }
  if (d > RAMPA + p.borda - 1) return null;
  // borda plana em volta de todo piso (1 ou 2 células: quem sai um pouco do caminho não
  // desce degrau); depois sobe até 1 bloco por célula e desce 1 bloco a cada 2 células
  const e = Math.max(0, d - p.borda);
  const h = Math.max(p.h - Math.ceil(e / 2), Math.min(p.h + e, natural));
  if (h === natural) return null;
  return { h, ocupada: d <= p.borda };
}
