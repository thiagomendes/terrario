/**
 * Spec 030 "Guia da missão", a parte pura (sem cena, sem tela): aonde a missão leva
 * (`alvoDaMissao`, na Cidade Grande e no sítio do Rancho), a trilha que sempre nasce nos pés
 * da criança, o alisamento da busca a pé da 021 no sítio (sem zigue-zague, sem pisar na roça,
 * sem raspar na cerca), as pegadinhas, a ondinha que corre dos pés para a frente e o relógio
 * do convite (~2 min brincando sem missão).
 */
import type { Missao } from './alma';
import { ehSolido, type V3 } from './caminho';
import { lavouraDoBloco, madura } from './plantio';
import { Bloco, obterBloco } from '../world/blocks';
import type { LoteCidade, PlanoCidade } from '../world/cidade';
import { frenteDaLoja, rotaPelaCidade, type LugarCidade } from '../world/ruasCidade';
import { loteDoCanteiro, noLoteObra } from '../world/obras';
import { frenteDaPorta, noLote, TAM_LOTE, type Lote, type PlanoPovoado } from '../world/povoado';
import type { PlanoCanto } from '../world/cantoMissoes';
import type { PlanoVila } from '../world/vilaNeon';
import { ALTURA_ARCO, CHAVE_ARCO } from './rinque';
import {
  CARIMBOS,
  CHAVE_BALAO,
  CHAVE_LANCHE,
  F_BILHETE,
  F_PRENDA,
  N_BALOES,
  PRENDAS,
  chaoDoBalao,
} from './missoesParque';
import { BOLO, CINEMA, F_BOLO, F_CINEMA, F_QUARTO, F_RAMPA, QUARTO, sentadoNoSofa } from './missoesCasa';
import { casaDaRede, passaFilme } from './casa';
import { FITA_VIDEO, VITAMINA } from './exclusivos';

// ------------------------------------------------------------------ o alvo
/** Uma caixa no chão (inclusivo em x0/z0, exclusivo em x1/z1). */
export interface CaixaChao {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface AlvoGuia {
  /** Quem é (fica igual enquanto o alvo vale): 'canteiro:4', 'padaria', 'lavoura:<sítio>:<lote>'. */
  chave: string;
  tipo: 'obra' | 'lugar' | 'morador' | 'sitio';
  /** Aonde a trilha vai (os pés). */
  x: number;
  y: number;
  z: number;
  /** Onde a placa fica (o pé dela; ela flutua acima). */
  placa: V3;
  /** O desenho da placa (nome da arte, 'obra:n' ou 'passeio'). */
  figura: string;
  /** Na cidade: o lugar a pé (a trilha vai pelas calçadas e atravessa na faixa). */
  lugar?: LugarCidade;
  /** Chegou: dentro da caixa, ou a `raio` blocos do fim da trilha. */
  caixa?: CaixaChao;
  raio?: number;
  /** Morador que anda (c5): o id da criatura. */
  morador?: number;
}

export function chegouAoAlvo(a: AlvoGuia, x: number, z: number): boolean {
  const c = a.caixa;
  if (c && x >= c.x0 && x < c.x1 && z >= c.z0 && z < c.z1) return true;
  return a.raio !== undefined && Math.hypot(x - a.x, z - a.z) <= a.raio;
}

/** Um morador visto pelo aparelho (as criaturas da réplica). */
export interface MoradorVisto {
  id: number;
  profissao?: string;
  x: number;
  y: number;
  z: number;
}

/** O que o resolvedor lê do mundo (o aparelho dá a cópia dele). */
export interface MundoDoGuia {
  /** A Cidade Grande do mundo (null fora dela). */
  cidade: PlanoCidade | null;
  /** Os sítios perto (Rancho), do mais perto ao mais longe. */
  sitios: readonly PlanoPovoado[];
  bloco(x: number, y: number, z: number): number;
  moradores(): readonly MoradorVisto[];
  /** Spec 031: o canto das missões (Era dos Dinos e Doce Reino; null nos outros). */
  canto?: PlanoCanto | null;
  /** Spec 031: os bichos perto (o guia leva ao do pasto que ainda não comeu). */
  bichos?(): readonly (MoradorVisto & { tipo?: string; criado?: boolean })[];
  /** Spec 031: os ovinhos no chão (o aparelho vê os itens soltos). */
  ovos?(): readonly { x: number; y: number; z: number }[];
  /** Spec 026: a Vila Neon (null nos outros mundos). */
  vila?: PlanoVila | null;
  /** Spec 026: o estado do bairro (estojos achados, lhamas na grade, os arcos acesos da f4). */
  estadoVila?(): {
    ins: readonly boolean[];
    lhamas: readonly number[];
    arcos?: readonly boolean[];
    /** Etapa B (f6): os balões fugidos que a criança já pegou. */
    bal?: readonly boolean[];
    /** Parte 3: a sala da casa (o filme da fita), como vem na rede. */
    casa?: unknown;
    /** Parte 3B (f10): os brinquedos espalhados que a criança pegou e ainda não guardou. */
    qto?: readonly boolean[];
    /** Parte 3B (f2): as duas lhamas do cercadinho (ids). */
    lhamasF2?: readonly number[];
  } | null;
  /** Spec 026: a criança está com o feno na mão (a lhama já vem atrás). */
  comFeno?(): boolean;
  /** Spec 026: a criança está de patins (a f4: primeiro o suporte, depois os arcos). */
  comPatins?(): boolean;
  /** Parte 3B: a criança está de skate (a f11: primeiro o suporte, depois a rampa). */
  comSkate?(): boolean;
  /** Parte 3B: quantos deste item a criança tem (a fita da f9, a vitamina da f12). */
  tem?(item: string): number;
  /** Parte 3B: o relógio do núcleo (s), para saber se o filme da fita está passando. */
  tempoNucleo?(): number;
  /** Parte 3B: os pés da criança (a altura: sentada no sofá). */
  pes?(): readonly [number, number, number];
}

const caixaDoLoteCidade = (l: LoteCidade): CaixaChao => ({
  x0: l.x0,
  z0: l.z0,
  x1: l.x0 + l.largura,
  z1: l.z0 + l.profundidade,
});

/** O comprimento de uma linha no chão. */
export function comprimento(pts: readonly (readonly number[])[]): number {
  let d = 0;
  for (let k = 1; k < pts.length; k++)
    d += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][2] - pts[k - 1][2]);
  return d;
}

/** O pé do último passo do lugar (onde a trilha acaba). */
function fimDoLugar(p: PlanoCidade, lugar: LugarCidade): V3 {
  const u = lugar.passos[lugar.passos.length - 1];
  return u ? [u[0], u[1], u[2]] : [lugar.frente[0], p.h + 1, lugar.frente[1]];
}

/** A entrada do canteiro como lugar da cidade (a frente na calçada, um passo para dentro). */
export function lugarDoCanteiro(p: PlanoCidade, l: LoteCidade): LugarCidade {
  const meio = (f: number): [number, number] => {
    const [ax, az] = noLoteObra(l, 3, f);
    const [bx, bz] = noLoteObra(l, 4, f);
    return [(ax + bx) / 2 + 0.5, (az + bz) / 2 + 0.5];
  };
  const fora = meio(-1);
  const dentro = meio(1);
  return { frente: fora, passos: [[dentro[0], p.h + 1, dentro[1]]] };
}

/** Quanto se anda pela calçada de (x, z) até a frente do lugar (a rota dos moradores). */
function andarNaCidade(p: PlanoCidade, de: { x: number; z: number }, lugar: LugarCidade): number {
  const rota = rotaPelaCidade(p, [de.x, de.z], lugar.frente);
  let d = 0;
  let ax = de.x;
  let az = de.z;
  for (const [x, z] of rota) {
    d += Math.hypot(x - ax, z - az);
    ax = x;
    az = z;
  }
  return d + Math.hypot(lugar.frente[0] - ax, lugar.frente[1] - az);
}

/** Até onde a criança chega perto da padeira (ela para e espera). */
export const PERTO_MORADOR = 3;

function alvoNaCidade(
  m: Missao,
  p: PlanoCidade,
  vistos: ReadonlySet<string>,
  de: { x: number; z: number },
  mundo: MundoDoGuia,
): AlvoGuia | null {
  const c = m.conta;
  if (c.tipo === 'obra') {
    const l = loteDoCanteiro(p, c.canteiro);
    if (!l) return null;
    const lugar = lugarDoCanteiro(p, l);
    const [x, y, z] = fimDoLugar(p, lugar);
    return {
      chave: `canteiro:${c.canteiro}`,
      tipo: 'obra',
      x,
      y,
      z,
      placa: [l.x0 + l.largura / 2, p.h + 1, l.z0 + l.profundidade / 2],
      figura: `obra:${c.canteiro}`,
      lugar,
      // chegou é lá dentro, perto dos blocos azuis (na porta do tapume ela ainda não vê a obra)
      raio: 1.6,
    };
  }
  if (c.tipo === 'lugares') {
    let melhor: AlvoGuia | null = null;
    let dMelhor = Infinity;
    for (const uso of c.usos) {
      if (vistos.has(uso)) continue;
      const l = p.lotes.find((q) => q.uso === uso);
      const lugar = l ? frenteDaLoja(p, l) : null;
      if (!l || !lugar) continue;
      // pelo caminho a pé (as calçadas), não em linha reta
      const d = andarNaCidade(p, de, lugar);
      if (d >= dMelhor) continue;
      dMelhor = d;
      const [x, y, z] = fimDoLugar(p, lugar);
      melhor = {
        chave: uso,
        tipo: 'lugar',
        x,
        y,
        z,
        placa: [l.x0 + l.largura / 2, p.h + 1, l.z0 + l.profundidade / 2],
        figura: uso,
        lugar,
        caixa: caixaDoLoteCidade(l),
      };
    }
    return melhor;
  }
  // c5: a troca com a padeira (a cozinheira que anda pela cidade)
  if (c.tipo === 'evento' && c.chave.startsWith('trocou:')) {
    const prof = c.chave.slice('trocou:'.length);
    let melhor: MoradorVisto | null = null;
    for (const q of mundo.moradores())
      if (q.profissao === prof && (!melhor || dist(q, de) < dist(melhor, de))) melhor = q;
    if (!melhor) return null;
    return {
      chave: `morador:${melhor.id}`,
      tipo: 'morador',
      x: melhor.x,
      y: melhor.y,
      z: melhor.z,
      placa: [melhor.x, melhor.y + 1.6, melhor.z],
      figura: 'item:pao',
      raio: PERTO_MORADOR,
      morador: melhor.id,
    };
  }
  return null;
}
const dist = (a: { x: number; z: number }, b: { x: number; z: number }) =>
  Math.hypot(a.x - b.x, a.z - b.z);

// ------------------------------------------------------------------ o sítio (Rancho)
/** O que a lavoura tem agora (as 20 covas do lote, lidas dos blocos). */
export function contarLavoura(
  l: Lote,
  bloco: (x: number, y: number, z: number) => number,
): { maduras: number; livres: number; produto: string | null } {
  let maduras = 0;
  let livres = 0;
  const conta = new Map<string, number>();
  for (let f = 1; f <= 5; f++)
    for (const s of [1, 2, 4, 5]) {
      const [x, z] = noLote(l, s, f);
      const em = bloco(x, l.h + 1, z);
      if (bloco(x, l.h, z) !== Bloco.TERRA_ARADA) continue;
      if (madura(em)) {
        maduras++;
        const p = lavouraDoBloco(em)?.produto;
        if (p) conta.set(p, (conta.get(p) ?? 0) + 1);
      } else if (em === Bloco.AR) livres++;
    }
  let produto: string | null = null;
  for (const [p, n] of conta) if (!produto || n > conta.get(produto)!) produto = p;
  return { maduras, livres, produto };
}

/** O lote inteiro com 1 bloco de folga (chegou na beira já vale). */
function caixaDoLoteSitio(l: Lote, folga = 1): CaixaChao {
  return {
    x0: l.x0 - folga,
    z0: l.z0 - folga,
    x1: l.x0 + TAM_LOTE + folga,
    z1: l.z0 + TAM_LOTE + folga,
  };
}

/** O que cada missão do Rancho procura no sítio. */
type BuscaSitio = 'colher' | 'plantar' | 'lavoura' | 'galinheiro' | 'curral' | 'celeiro';
export function buscaDaMissao(m: Missao): BuscaSitio | null {
  const c = m.conta;
  if (c.tipo !== 'evento') return null;
  if (c.chave === 'colheu') return 'colher';
  if (c.chave === 'colheu:minha') return 'lavoura';
  if (c.chave === 'plantou') return 'plantar';
  if (c.chave === 'criou:coelho' || c.chave === 'coletou:ovo') return 'galinheiro';
  if (c.chave === 'criou:cervo') return 'curral';
  if (c.chave.startsWith('fabricou:')) return 'celeiro';
  return null;
}

/** O desenho da placa no sítio: o mesmo da missão (o trigo, a semente, a galinha, o pão). */
function figuraNoSitio(m: Missao): string {
  const d = m.desenho;
  if (d.tipo === 'bicho') return d.bicho;
  if (d.tipo === 'item') return `item:${d.item}`;
  return 'item:trigo';
}

/** A altura do primeiro bloco cheio de cima para baixo (para a placa ficar em cima do telhado). */
function topo(
  bloco: (x: number, y: number, z: number) => number,
  x: number,
  z: number,
  h: number,
): number {
  for (let y = h + 16; y > h; y--) if (bloco(x, y, z) !== Bloco.AR) return y + 1;
  return h + 1;
}

function alvoDoLote(
  m: Missao,
  sitio: PlanoPovoado,
  i: number,
  bloco: (x: number, y: number, z: number) => number,
): AlvoGuia {
  const l = sitio.lotes[i];
  const chave = `${l.uso}:${sitio.id}:${i}`;
  const figura = figuraNoSitio(m);
  const meio = noLote(l, 3, 3);
  const cx = meio[0] + 0.5;
  const cz = meio[1] + 0.5;
  if (l.uso === 'curral' || l.uso === 'galinheiro') {
    // do lado de fora da porteira (a criança abre e entra; a trilha não pula a cerca)
    const c = sitio.currais?.find((q) => q.lote === i);
    const [fx, fz] = c ? c.fora : frenteDaPorta(l);
    return {
      chave,
      tipo: 'sitio',
      x: fx + 0.5,
      y: l.h + 1,
      z: fz + 0.5,
      placa: [cx, topo(bloco, Math.floor(cx), Math.floor(cz), l.h), cz],
      figura,
      raio: 2.2,
      caixa: caixaDoLoteSitio(l, 0),
    };
  }
  if (l.uso === 'lavoura') {
    // colher: a placa mostra o que está maduro lá (o trigo, o milho ou a abóbora)
    const produto = buscaDaMissao(m) === 'colher' ? contarLavoura(l, bloco).produto : null;
    // no corredor do meio (s = 3), na beira da frente: nenhuma pegada em cima da roça
    const [ex, ez] = noLote(l, 3, 0);
    return {
      chave,
      tipo: 'sitio',
      x: ex + 0.5,
      y: l.h + 1,
      z: ez + 0.5,
      placa: [cx, l.h + 1, cz],
      figura: produto ? `item:${produto}` : figura,
      caixa: caixaDoLoteSitio(l),
    };
  }
  // o celeiro (a mesa de trabalho e o baú das sementes): na frente da porta
  const [fx, fz] = frenteDaPorta(l);
  return {
    chave,
    tipo: 'sitio',
    x: fx + 0.5,
    y: l.h + 1,
    z: fz + 0.5,
    placa: [cx, topo(bloco, Math.floor(cx), Math.floor(cz), l.h), cz],
    figura,
    raio: 2.2,
    caixa: caixaDoLoteSitio(l, 0),
  };
}

/** Os lotes que servem para a busca, com a "força" (maior primeiro; 0 não serve). */
function lotesQueServem(
  busca: BuscaSitio,
  sitio: PlanoPovoado,
  bloco: (x: number, y: number, z: number) => number,
): { i: number; forca: number }[] {
  const out: { i: number; forca: number }[] = [];
  sitio.lotes.forEach((l, i) => {
    if (busca === 'galinheiro' || busca === 'curral' || busca === 'celeiro') {
      if (l.uso === busca) out.push({ i, forca: 1 });
      return;
    }
    if (l.uso !== 'lavoura') return;
    if (busca === 'lavoura') return void out.push({ i, forca: 1 });
    const { maduras, livres } = contarLavoura(l, bloco);
    // colher: a com trigo maduro; sem maduro, o passo de antes (a terra arada livre)
    if (busca === 'colher') out.push({ i, forca: maduras > 0 ? 3 : livres > 0 ? 2 : 0 });
    else out.push({ i, forca: livres > 0 ? 3 : 1 });
  });
  return out.filter((x) => x.forca > 0);
}

/**
 * O alvo no sítio. Um por vez: o de agora (`atual`) fica enquanto servir do mesmo jeito; senão
 * vale o melhor (mais forte, depois o mais perto) dos sítios perto.
 */
function alvoNoSitio(
  m: Missao,
  mundo: MundoDoGuia,
  de: { x: number; z: number },
  atual: string | null,
): AlvoGuia | null {
  const busca = buscaDaMissao(m);
  if (!busca) return null;
  type Achado = { sitio: PlanoPovoado; i: number; forca: number; d: number };
  let melhor: Achado | null = null;
  let doAtual: Achado | null = null;
  for (const sitio of mundo.sitios)
    for (const x of lotesQueServem(busca, sitio, mundo.bloco)) {
      const l = sitio.lotes[x.i];
      const a: Achado = {
        sitio,
        i: x.i,
        forca: x.forca,
        d: Math.hypot(l.x0 + 3.5 - de.x, l.z0 + 3.5 - de.z),
      };
      if (`${l.uso}:${sitio.id}:${x.i}` === atual) doAtual = a;
      if (!melhor || a.forca > melhor.forca || (a.forca === melhor.forca && a.d < melhor.d))
        melhor = a;
    }
  // o de agora fica enquanto servir tão bem quanto o melhor (nada de pular para um vizinho)
  const e = doAtual && (!melhor || doAtual.forca >= melhor.forca) ? doAtual : melhor;
  return e ? alvoDoLote(m, e.sitio, e.i, mundo.bloco) : null;
}

/**
 * O resolvedor de alvo (todas as missões dos dois mundos). `vistos`: os lugares do passeio já
 * vistos (o núcleo manda em `usos`); `atual`: a chave do alvo de agora (fica, se ainda servir).
 */
export function alvoDaMissao(
  m: Missao,
  mundo: MundoDoGuia,
  vistos: ReadonlySet<string>,
  de: { x: number; z: number },
  atual: string | null = null,
): AlvoGuia | null {
  if (mundo.canto) return alvoNoCanto(m, mundo.canto, mundo, de, atual);
  if (mundo.vila) return alvoNaVila(m, mundo.vila, mundo, de, atual, vistos);
  if (mundo.cidade) {
    const a = alvoNaCidade(m, mundo.cidade, vistos, de, mundo);
    if (a) return a;
  }
  if (mundo.sitios.length) return alvoNoSitio(m, mundo, de, atual);
  return null;
}

// ------------------------------------------------------------------ o canto (spec 031)
/** Perto do ovinho (blocos): ele já veio para a mochila sozinho (o ímã dos itens). */
export const RAIO_OVO = 1.3;
/** Perto do bicho do pasto: a comida aparece na mão. */
export const RAIO_BICHO = 3;
/** Na caixa de areia e na mesa: dentro da caixa ou a tanto do lado de quem vem. */
export const RAIO_LUGAR = 2.4;
/** Na mesa e na caixa de areia a criança chega bem perto (o bolo e as rochas ao alcance do dedo). */
export const RAIO_CHEGAR_PERTO = 1.2;

/** O mais perto de `de` (o atual fica, enquanto servir: a trilha não pula de um para outro). */
function maisPerto<T extends { chave: string; x: number; z: number }>(
  lista: readonly T[],
  de: { x: number; z: number },
  atual: string | null,
): T | null {
  let melhor: T | null = null;
  let dm = Infinity;
  for (const q of lista) {
    const d = q.chave === atual ? -1 : Math.hypot(q.x - de.x, q.z - de.z);
    if (d < dm) {
      dm = d;
      melhor = q;
    }
  }
  return melhor;
}

/** A beira da caixa (x0..x1, z0..z1 inclusiva) do lado de quem vem, a `fora` blocos dela. */
function beiraDoLado(
  c: { x0: number; z0: number; x1: number; z1: number },
  de: { x: number; z: number },
  fora: number,
): [number, number] {
  const mx = (c.x0 + c.x1 + 1) / 2;
  const mz = (c.z0 + c.z1 + 1) / 2;
  const dx = de.x - mx;
  const dz = de.z - mz;
  // o lado mais perto de quem vem (a trilha chega de frente, não pela quina)
  if (Math.abs(dx) > Math.abs(dz)) return [dx > 0 ? c.x1 + 1 + fora - 0.5 : c.x0 - fora + 0.5, mz];
  return [mx, dz > 0 ? c.z1 + 1 + fora - 0.5 : c.z0 - fora + 0.5];
}

function alvoNoCanto(
  m: Missao,
  p: PlanoCanto,
  mundo: MundoDoGuia,
  de: { x: number; z: number },
  atual: string | null,
): AlvoGuia | null {
  const d = m.desenho;
  const figura = d.tipo === 'arte' ? d.placa : 'estrela';
  const c = m.conta;
  if (c.tipo !== 'evento') return null;
  if (c.chave === 'coletou:ovo:ninho') {
    // o ovinho que ainda está no chão (o aparelho vê os itens soltos perto de cada lugar)
    const noChao = mundo.ovos?.() ?? [];
    const lista = p.ovos
      .map((o, i) => ({ chave: `ovo:${i}`, x: o[0], y: o[1], z: o[2] }))
      .filter((o) => noChao.some((q) => Math.hypot(q.x - o.x, q.z - o.z) < 1.2));
    const o = maisPerto(lista, de, atual);
    if (!o) return null;
    return {
      chave: o.chave,
      tipo: 'sitio',
      x: o.x,
      y: o.y,
      z: o.z,
      placa: [o.x, o.y - 1, o.z],
      figura,
      raio: RAIO_OVO,
    };
  }
  if (c.chave === 'criou:cervo') {
    const [px, , pz] = p.pasto;
    const lista = (mundo.bichos?.() ?? [])
      .filter((b) => b.tipo === 'cervo' && !b.criado && Math.hypot(b.x - px, b.z - pz) < 20)
      .map((b) => ({ ...b, chave: `bicho:${b.id}` }));
    const b = maisPerto(lista, de, atual);
    if (!b) {
      // os bichos ainda vão chegar (o núcleo chama quando a missão é escolhida): o pasto
      const [x, y, z] = p.pasto;
      return {
        chave: 'pasto',
        tipo: 'sitio',
        x,
        y,
        z,
        placa: [x, y - 1, z],
        figura,
        raio: RAIO_BICHO,
      };
    }
    return {
      chave: b.chave,
      tipo: 'morador',
      x: b.x,
      y: b.y,
      z: b.z,
      placa: [b.x, b.y + 1.6, b.z],
      figura,
      raio: RAIO_BICHO,
      morador: b.id,
    };
  }
  const lugar =
    c.chave === 'escavou:fossil' && p.caixa
      ? { caixa: p.caixa, y: p.caixa.y + 1, placaY: p.caixa.y }
      : c.chave === 'bolo:camada' && p.mesa
        ? { caixa: p.mesa, y: p.mesa.y + 1, placaY: p.mesa.y + 1 }
        : null;
  if (!lugar) return null;
  const [x, z] =
    c.chave === 'escavou:fossil' && p.caixa ? p.caixa.entrada : beiraDoLado(lugar.caixa, de, 1);
  const k = lugar.caixa;
  return {
    chave: c.chave === 'escavou:fossil' ? 'caixa' : 'mesa',
    tipo: 'sitio',
    x,
    y: lugar.y,
    z,
    placa: [(k.x0 + k.x1 + 1) / 2, lugar.placaY, (k.z0 + k.z1 + 1) / 2],
    figura,
    raio: RAIO_CHEGAR_PERTO,
    caixa: { x0: k.x0 - 1, z0: k.z0 - 1, x1: k.x1 + 2, z1: k.z1 + 2 },
  };
}

// ------------------------------------------------------------------ a Vila Neon (spec 026)
/** Perto do estojo: ele já foi achado (o núcleo confere a 1,6). */
export const RAIO_ESTOJO = 1.3;
/** Perto da lhama: o feno aparece na mão (o núcleo dá a 4). */
export const RAIO_LHAMA = 3.2;
/**
 * Com o feno na mão (f2), a lhama a mais que `VEIO_JUNTO` da criança ficou para trás e a trilha
 * volta até ela (na grade, a mais que `FICOU_PARA_TRAS`, para a trilha não ir e voltar com a lhama
 * que segue a uns dois blocos e apressa o passo acima de cinco). As duas ficam abaixo dos 8 blocos
 * em que a lhama começa a seguir o feno: a lhama parada a 8,5 da grade nunca mais vinha, e a
 * trilha não a mostrava.
 */
export const FICOU_PARA_TRAS = 7.5;
export const VEIO_JUNTO = 6;
/** As lhamas da f2 ficam a menos que isto (blocos) do meio do cercadinho (a grade fica a ~25). */
const LONGE_DA_F2 = 45;
/** Perto do suporte dos patins: o toque nele calça (a tela aceita a 4). */
export const RAIO_PATINS = 2.2;
/** Dentro do arco (o núcleo conta no vão, a uns 0,75 do meio). */
export const RAIO_ARCO = 0.7;

type Sitio = (
  chave: string,
  x: number,
  z: number,
  raio: number,
  fig?: string,
  alto?: number,
) => AlvoGuia;

/**
 * Parte 3B: as missões da Casa anos 80 e da rampa (f9 a f12). Devolve undefined quando a missão
 * não é delas, e null quando não há aonde ir agora (sentada no sofá vendo o filme, tudo feito).
 */
function alvoNaCasa(
  m: Missao,
  p: PlanoVila,
  mundo: MundoDoGuia,
  de: { x: number; z: number },
  atual: string | null,
  vistos: ReadonlySet<string>,
  sitio: Sitio,
): AlvoGuia | null | undefined {
  const pt = p.pontos;
  const c = pt.casa;
  const rua = pt.rua;
  const d = m.desenho;
  const bolinhas = d.tipo === 'arte' ? (d.bolinhas ?? []) : [];
  // (a locadora e a lanchonete: da calçada, na frente da parede de fitas e do balcão)
  const locadora = () =>
    sitio('locadora', rua.fitas[0] + 0.5, rua.fitas[2] + 3.2, 1.6, 'fitaVideo', 1.6);
  const lanchonete = () =>
    sitio('lanchonete', rua.balcao[0] - 2.6, rua.balcao[2] + 3.0, 1.6, 'vitamina', 1.6);
  if (m.id === F_CINEMA) {
    if (vistos.has(CINEMA[2])) return null;
    const sala = casaDaRede(mundo.estadoVila?.()?.casa ?? null);
    const t = mundo.tempoNucleo?.() ?? 0;
    if (vistos.has(CINEMA[1]) && passaFilme(sala, t)) {
      // o filme passando: o sofá (sentada, a trilha some: é só assistir)
      const pes = mundo.pes?.();
      if (pes && sentadoNoSofa(c, pes[0], pes[1], pes[2])) return null;
      const a = c.sofa.assentos[1];
      return sitio('sofa', a.x, a.z - 1.3, 1.3, bolinhas[2] ?? 'sofaCinema', 1.1);
    }
    if ((mundo.tem?.(FITA_VIDEO) ?? 0) > 0)
      // com a fita: o tapete na frente da TV (o videocassete alcança de toda a sala)
      return sitio('tv', c.tv[0], c.tv[2] + 3.4, 1.6, bolinhas[1] ?? 'fitaNaTv', 1.8);
    return locadora();
  }
  if (m.id === F_QUARTO) {
    const pegos = mundo.estadoVila?.()?.qto ?? [];
    // com um brinquedo na mão: o baú (de frente para ele, do lado do quarto, a uns dois blocos:
    // de mais perto o baú ficava atrás do boneco; de mais longe, fora do alcance do toque)
    if (QUARTO.some((u, i) => pegos[i] && !vistos.has(u)))
      return sitio('bau', c.bau[0] - 2.0, c.bau[2], 0.9, 'bauArrumado', 1.0);
    const lista = c.espalhados
      .map((q, i) => ({ chave: `brinquedo:${i}`, x: q[0], z: q[2], i }))
      .filter((b) => !vistos.has(QUARTO[b.i]) && !pegos[b.i]);
    const b = maisPerto(lista, de, atual);
    // (a trilha vai até o brinquedo e acaba a uns dois blocos dele: de mais perto ele ficava atrás
    // do boneco na câmera, como o feno da f7; um ponto de chegada ao lado dele às vezes caía na
    // célula de um móvel e a trilha empacava)
    // (a três blocos: de cima, o brinquedo fica acima da cabeça da criança, nunca atrás dela)
    return b ? sitio(b.chave, b.x, b.z, 3.0, bolinhas[b.i] ?? 'bauArrumado', 0.9) : null;
  }
  if (m.id === F_RAMPA) {
    const sk = pt.skate.suporte;
    if (!mundo.comSkate?.()) return sitio('suporte', sk[0] + 2.2, sk[2] + 1.0, 1.6, 'skate', 1.8);
    const r = pt.skate.rampa;
    // de skate: o fundo da rampa (lá, segurar o controle para uma das curvas)
    return sitio('rampa', r.x - 0.4, r.z, 2.2, 'rampaU', 1.4);
  }
  if (m.id === F_BOLO) {
    if (vistos.has(BOLO[1])) return null;
    if (!vistos.has(BOLO[0]) && (mundo.tem?.(VITAMINA) ?? 0) < 1) return lanchonete();
    const [ax, , az] = c.vovo;
    return sitio('vovo', ax, az, 1.6, 'vovo', 2.2);
  }
  return undefined;
}

function alvoNaVila(
  m: Missao,
  p: PlanoVila,
  mundo: MundoDoGuia,
  de: { x: number; z: number },
  atual: string | null,
  vistos: ReadonlySet<string> = new Set(),
): AlvoGuia | null {
  const d = m.desenho;
  const figura = d.tipo === 'arte' ? d.placa : 'estrela';
  const c = m.conta;
  const pt = p.pontos;
  const pq = pt.parque;
  const chao = p.h + 1;
  const sitio = (
    chave: string,
    x: number,
    z: number,
    raio: number,
    fig = figura,
    alto = 0,
  ): AlvoGuia => ({
    chave,
    tipo: 'sitio',
    x,
    y: chao,
    z,
    placa: [x, chao + alto, z],
    figura: fig,
    raio,
  });
  if (m.id === F_BILHETE) {
    // o brinquedo mais perto ainda sem carimbo: a frente da roda-gigante, a beira do carrossel do
    // lado de quem vem, a ponta do caminho do bate-bate (lá, a dica de toque mostra o resto)
    const bolinhas = d.tipo === 'arte' ? (d.bolinhas ?? []) : [];
    const dc = Math.hypot(de.x - pq.carrossel.x, de.z - pq.carrossel.z) || 1;
    const beira = pq.carrossel.beira + 1.2;
    const lugares: { chave: string; x: number; z: number; i: number }[] = [
      { chave: 'bilhete:0', x: pq.roda.saida[0], z: pq.roda.saida[2], i: 0 },
      {
        chave: 'bilhete:1',
        x: pq.carrossel.x + ((de.x - pq.carrossel.x) / dc) * beira,
        z: pq.carrossel.z + ((de.z - pq.carrossel.z) / dc) * beira,
        i: 1,
      },
      { chave: 'bilhete:2', x: pq.bate.saida[0], z: pq.bate.saida[2], i: 2 },
    ].filter((l) => !vistos.has(CARIMBOS[l.i]));
    const l = maisPerto(lugares, de, atual);
    return l ? sitio(l.chave, l.x, l.z, 2.4, bolinhas[l.i] ?? figura, 1.2) : null;
  }
  if (m.id === F_PRENDA) {
    // a argola, a pescaria (a que estiver mais perto primeiro) e, com a prenda, a vovó
    const frente = (q: readonly number[]) => ({ x: q[0], z: q[2] - 2.5 });
    const barracas = [
      { chave: 'prenda:0', ...frente(pq.argola), i: 0 },
      { chave: 'prenda:1', ...frente(pq.pescaria), i: 1 },
    ].filter((b) => !vistos.has(PRENDAS[b.i]));
    const b = maisPerto(barracas, de, atual);
    const bolinhas = d.tipo === 'arte' ? (d.bolinhas ?? []) : [];
    if (b) return sitio(b.chave, b.x, b.z, 1.6, bolinhas[b.i] ?? figura, 1.4);
    if (vistos.has(PRENDAS[2])) return null;
    // (parte 3) a vovó mora no sofá da sala da Casa anos 80: a trilha entra pela porta e acaba
    // na frente dela, entre o sofá e o tapete
    const [ax, , az] = pt.casa.vovo;
    return sitio('vovo', ax, az, 1.6, bolinhas[2] ?? figura, 2.2);
  }
  const casa = alvoNaCasa(m, p, mundo, de, atual, vistos, sitio);
  if (casa !== undefined) return casa;
  if (c.tipo !== 'evento') return null;
  const v = mundo.estadoVila?.() ?? null;
  if (c.chave === CHAVE_BALAO) {
    // o balão fugido mais perto que ela ainda não pegou (o pé da roda, a árvore, o carrossel)
    const lista = Array.from({ length: N_BALOES }, (_, i) => {
      const [x, , z] = chaoDoBalao(pq, chao, i);
      return { chave: `balao:${i}`, x, z, i };
    }).filter((b) => !v?.bal?.[b.i]);
    const b = maisPerto(lista, de, atual);
    return b ? sitio(b.chave, b.x, b.z, 1.8) : null;
  }
  if (c.chave === CHAVE_LANCHE) {
    // sem feno: o fardo da beira do caminho; com o feno na mão: o cocho da fazendinha
    // (o canto do noroeste do cocho, de quem vem da porteira: as lhamas comem do outro lado).
    // A trilha acaba a uns três blocos: de perto demais a coisa fica nos pés do boneco, atrás
    // dele na câmera (e, deitado, embaixo da faixa boa da tela para a dica de toque)
    if (mundo.comFeno?.())
      return sitio('cocho', pq.cocho[0] - 1.4, pq.cocho[2] - 2.4, 1.5, 'cocho', 0.4);
    // (do lado da porteira: é de lá que ela vem buscar a segunda braçada)
    return sitio('fardo', pq.fardo[0] + 1.2, pq.fardo[2] + 2.6, 1.4, 'feno', 1.6);
  }
  if (c.chave === 'achou:instrumento') {
    // o estojo mais perto que ainda está no chão (um em cada zona)
    const lista = pt.estojos
      .map((o, i) => ({ chave: `estojo:${i}`, x: o[0], y: o[1], z: o[2], i }))
      .filter((o) => !v?.ins[o.i]);
    const o = maisPerto(lista, de, atual);
    if (!o) return null;
    return {
      chave: o.chave,
      tipo: 'sitio',
      x: o.x,
      y: o.y,
      z: o.z,
      placa: [o.x, o.y - 1, o.z],
      figura,
      raio: RAIO_ESTOJO,
    };
  }
  if (c.chave === 'levou:lhama') {
    const g = pt.plateia;
    const ce = pt.cercado;
    const mx = (ce.x0 + ce.x1 + 1) / 2;
    const mz = (ce.z0 + ce.z1 + 1) / 2;
    const naGrade = new Set(v?.lhamas ?? []);
    // as duas lhamas da f2 que ainda não chegaram à grade: as do cercadinho, que o núcleo diz
    // quais são (as lhamas soltas passeiam pelo campo e não são da missão: a trilha ia atrás de
    // uma delas); sem a lista, as que estão perto do cercadinho ou da grade
    const doCercadinho = v?.lhamasF2 ? new Set(v.lhamasF2) : null;
    const daMissao = (mundo.bichos?.() ?? []).filter(
      (b) =>
        b.tipo === 'cervo' &&
        !naGrade.has(b.id) &&
        (doCercadinho ? doCercadinho.has(b.id) : Math.hypot(b.x - mx, b.z - mz) < LONGE_DA_F2),
    );
    // com o feno na mão: a grade da plateia, de frente para o cercadinho (as lhamas vêm atrás).
    // A lhama que ficou para trás (estava longe quando o feno chegou à mão, ou desistiu de
    // seguir) leva a trilha de volta até ela: perto do feno ela vem junto. Sem isso a trilha
    // ficava na grade e a criança esperava para sempre por uma lhama que não vinha (a f2 que
    // falhava "de vez em quando": a segunda lhama passeava do outro lado do cercadinho)
    if (mundo.comFeno?.()) {
      const longe = atual === 'grade' ? FICOU_PARA_TRAS : VEIO_JUNTO;
      const atras = daMissao
        .filter((b) => Math.hypot(b.x - de.x, b.z - de.z) > longe)
        .map((b) => ({ ...b, chave: `lhama:${b.id}` }));
      const b = maisPerto(atras, de, atual);
      if (b)
        return {
          chave: b.chave,
          tipo: 'morador',
          x: b.x,
          y: b.y,
          z: b.z,
          placa: [b.x, b.y + 1.6, b.z],
          figura,
          raio: RAIO_LHAMA,
          morador: b.id,
        };
      const x = Math.max(g.x0 + 2, Math.min(g.x1 - 1, mx));
      const z = g.z1 - 0.5;
      return {
        chave: 'grade',
        tipo: 'sitio',
        x,
        y: p.h + 1,
        z,
        placa: [x, p.h + 1, g.z1 + 1],
        figura,
        raio: 1.6,
      };
    }
    // sem feno: a lhama mais perto ainda no cercadinho (o feno aparece na mão perto dela)
    const lista = daMissao
      .filter((b) => b.x >= ce.x0 - 4 && b.x <= ce.x1 + 5 && b.z >= ce.z0 - 4 && b.z <= ce.z1 + 5)
      .map((b) => ({ ...b, chave: `lhama:${b.id}` }));
    const b = maisPerto(lista, de, atual);
    if (!b) {
      const [x, y, z] = pt.portaoCercado;
      return {
        chave: 'cercado',
        tipo: 'sitio',
        x,
        y,
        z,
        placa: [x, y - 1, z],
        figura,
        raio: RAIO_LHAMA,
      };
    }
    return {
      chave: b.chave,
      tipo: 'morador',
      x: b.x,
      y: b.y,
      z: b.z,
      placa: [b.x, b.y + 1.6, b.z],
      figura,
      raio: RAIO_LHAMA,
      morador: b.id,
    };
  }
  if (c.chave === CHAVE_ARCO) {
    // sem patins: o suporte do rinque (um toque nele calça); de patins: o arco mais perto ainda
    // apagado (a trilha passa por dentro dele: o vão fica livre, os postes seguram)
    if (!mundo.comPatins?.()) {
      const [x, y, z] = pt.patins;
      return {
        chave: 'patins',
        tipo: 'sitio',
        x,
        y,
        z,
        placa: [x, y + 2.9, z + 1],
        figura: 'patins',
        raio: RAIO_PATINS,
      };
    }
    const lista = pt.arcos
      .map((a, i) => ({ chave: `arco:${i}`, x: a.x, y: a.y, z: a.z, i }))
      .filter((a) => !v?.arcos?.[a.i]);
    const a = maisPerto(lista, de, atual);
    if (!a) return null;
    return {
      chave: a.chave,
      tipo: 'sitio',
      x: a.x,
      y: a.y,
      z: a.z,
      placa: [a.x, a.y + ALTURA_ARCO - 0.4, a.z],
      figura,
      raio: RAIO_ARCO,
    };
  }
  return null;
}

// ------------------------------------------------------------------ a trilha
/**
 * As pegadas andam em pares (o pé esquerdo e o direito lado a lado, um pouquinho adiantado),
 * com um vão de ~0,4 bloco entre um par e o outro: lê como "passos", não como uma nuvem.
 */
export const PASSO_PAR = 1.1;
export const LADO_PEGADA = 0.2;
/** O pé direito vai um tico adiante do esquerdo. */
const ADIANTE = 0.12;
export const MAX_PEGADAS = 420;

/** Uma pegada: [x, y, z, yaw, lado (1 direito, -1 esquerdo)]. */
export type Pegada = [number, number, number, number, number];

/** Pares de pegadas a cada PASSO_PAR (o primeiro em `primeira`), virados para a frente. */
export function espalharPegadas(pts: readonly V3[], primeira = 0.45): Pegada[] {
  const out: Pegada[] = [];
  const total = comprimento(pts);
  for (let t = primeira; t < total && out.length < MAX_PEGADAS - 1; t += PASSO_PAR) {
    for (const lado of [-1, 1]) {
      const u = Math.min(total, t + (lado > 0 ? ADIANTE : 0));
      const q = pontoNaLinha(pts, u);
      const dir = direcaoNaLinha(pts, u);
      const nx = dir[1];
      const nz = -dir[0];
      out.push([
        q[0] + nx * LADO_PEGADA * lado,
        q[1],
        q[2] + nz * LADO_PEGADA * lado,
        Math.atan2(dir[0], dir[1]),
        lado,
      ]);
    }
  }
  return out;
}

/** O ponto a uma distância u ao longo da linha (no chão; a altura é a do degrau mais perto). */
export function pontoNaLinha(pts: readonly V3[], u: number): V3 {
  if (!pts.length) return [0, 0, 0];
  let resto = Math.max(0, u);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (resto <= d && d > 1e-6) {
      const k = resto / d;
      return [a[0] + (b[0] - a[0]) * k, k > 0.5 ? b[1] : a[1], a[2] + (b[2] - a[2]) * k];
    }
    resto -= d;
  }
  const u2 = pts[pts.length - 1];
  return [u2[0], u2[1], u2[2]];
}

/** A direção (x, z) unitária da linha na distância u. */
function direcaoNaLinha(pts: readonly V3[], u: number): [number, number] {
  let resto = Math.max(0, u);
  let ultima: [number, number] = [0, 1];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    if (d < 1e-6) continue;
    ultima = [(b[0] - a[0]) / d, (b[2] - a[2]) / d];
    if (resto <= d) return ultima;
    resto -= d;
  }
  return ultima;
}

/** A distância ao longo da linha até o ponto dela mais perto de (x, z). */
export function distanciaNaLinha(pts: readonly V3[], x: number, z: number): number {
  const p = pertoNaLinha(pts, x, z);
  let d = 0;
  for (let k = 1; k <= p.i && k < pts.length; k++)
    d += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][2] - pts[k - 1][2]);
  const b = pts[Math.min(pts.length - 1, p.i + 1)];
  return d + Math.hypot(b[0] - pts[p.i][0], b[2] - pts[p.i][2]) * p.k;
}

/**
 * Afasta a rota de quem fica parado nela (o pedreiro na calçada): os pontos a menos de `raio`
 * de um deles vão para o lado, até `raio`, se der para pisar lá (`pode`).
 */
export function afastarDe(
  pts: readonly V3[],
  quem: readonly { x: number; z: number }[],
  raio: number,
  pode: (x: number, z: number) => boolean,
): V3[] {
  return pts.map((q, i) => {
    let [x, y, z] = q;
    for (const o of quem) {
      const d = Math.hypot(x - o.x, z - o.z);
      if (d >= raio) continue;
      // para o lado da rota (perpendicular), do lado contrário ao de quem está parado
      const a = pts[Math.max(0, i - 1)];
      const b = pts[Math.min(pts.length - 1, i + 1)];
      const dl = Math.hypot(b[0] - a[0], b[2] - a[2]) || 1;
      let nx = -(b[2] - a[2]) / dl;
      let nz = (b[0] - a[0]) / dl;
      if (nx * (x - o.x) + nz * (z - o.z) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const ex = o.x + (x - o.x) + nx * (raio - d + 0.05);
      const ez = o.z + (z - o.z) + nz * (raio - d + 0.05);
      if (pode(ex, ez)) {
        x = ex;
        z = ez;
      }
    }
    return [x, y, z] as V3;
  });
}

/**
 * Onde a placa fica na tela: em cima do ponto do alvo (o rabinho embaixo), com `tam` px, longe
 * das caixas do HUD (a estrela, o selinho, a bússola, o minimapa) e com uma margem em cima. Se
 * cair numa caixa do alto, desce para baixo dela; numa de baixo, sobe. null: fora da tela.
 */
export function posicaoDaPlaca(
  ponto: { x: number; y: number } | null,
  tam: number,
  caixas: readonly { x: number; y: number; w: number; h: number }[],
  W: number,
  H: number,
  margem = 10,
): { x: number; y: number } | null {
  if (!ponto) return null;
  if (ponto.x < -tam || ponto.x > W + tam || ponto.y < -tam * 2 || ponto.y > H + tam) return null;
  // o canto de cima da placa (o rabinho aponta para o ponto)
  let x = Math.max(margem, Math.min(W - margem - tam, ponto.x - tam / 2));
  let y = Math.max(margem, Math.min(H - margem - tam * 1.2, ponto.y - tam * 1.2));
  for (let volta = 0; volta < 4; volta++) {
    let mexeu = false;
    for (const c of caixas) {
      const cruza =
        x < c.x + c.w + 4 && x + tam > c.x - 4 && y < c.y + c.h + 4 && y + tam * 1.2 > c.y - 4;
      if (!cruza) continue;
      if (c.y + c.h / 2 < H / 2) y = c.y + c.h + 6;
      else y = c.y - tam * 1.2 - 6;
      mexeu = true;
    }
    if (!mexeu) break;
  }
  if (y < 0 || y + tam * 1.2 > H) return null;
  return { x, y };
}

/** Um ponto a cada bloco ao longo da linha (a rota das calçadas tem só as quinas). */
export function reamostrar(pts: readonly V3[]): V3[] {
  const out: V3[] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay, az] = pts[i - 1];
    const [bx, by, bz] = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az)));
    for (let k = 0; k < n; k++)
      out.push([ax + ((bx - ax) * k) / n, k < n / 2 ? ay : by, az + ((bz - az) * k) / n]);
  }
  const u = pts[pts.length - 1];
  if (u) out.push([u[0], u[1], u[2]]);
  return out;
}

/** O ponto da linha mais perto de (x, z): o índice do segmento, a fração e a distância. */
export function pertoNaLinha(
  pts: readonly V3[],
  x: number,
  z: number,
): { i: number; k: number; d: number } {
  let melhor = { i: 0, k: 0, d: Infinity };
  if (pts.length === 1) return { i: 0, k: 0, d: Math.hypot(pts[0][0] - x, pts[0][2] - z) };
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const vx = b[0] - a[0];
    const vz = b[2] - a[2];
    const d2 = vx * vx + vz * vz;
    const k = d2 > 1e-9 ? Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[2]) * vz) / d2)) : 0;
    const d = Math.hypot(a[0] + vx * k - x, a[2] + vz * k - z);
    if (d < melhor.d) melhor = { i: i - 1, k, d };
  }
  return melhor;
}

/**
 * A trilha que a criança vê agora: **sempre nasce nos pés dela**. O que ficou para trás sai;
 * se ela saiu da rota, um trechinho reto liga os pés à rota (o mais perto dela, adiante).
 */
export function trilhaDosPes(rota: readonly V3[], pes: V3): V3[] {
  if (!rota.length) return [];
  const p = pertoNaLinha(rota, pes[0], pes[2]);
  const a = rota[p.i];
  const b = rota[Math.min(rota.length - 1, p.i + 1)];
  const ponto: V3 = [
    a[0] + (b[0] - a[0]) * p.k,
    p.k > 0.5 ? b[1] : a[1],
    a[2] + (b[2] - a[2]) * p.k,
  ];
  const out: V3[] = [[pes[0], pes[1], pes[2]]];
  if (p.d > 0.35) out.push(ponto);
  for (let i = p.i + 1; i < rota.length; i++) out.push([rota[i][0], rota[i][1], rota[i][2]]);
  return out;
}

/**
 * Alisa a busca em escada da 021 (no sítio): puxa o fio de cada ponto até o mais longe que dá
 * para ir reto sem passar por célula ruim (roça, cerca do lado, degrau de mais de 1). `pisa`
 * diz a altura dos pés em (x, z) vindo de y, ou null se não dá; `ruim` marca o que evitar.
 */
export function alisar(
  pts: readonly V3[],
  pisa: (x: number, z: number, y: number) => number | null,
  ruim: (x: number, y: number, z: number) => boolean,
): V3[] {
  if (pts.length < 3) return pts.map((q) => [q[0], q[1], q[2]] as V3);
  const reto = (a: V3, b: V3): boolean => {
    const d = Math.hypot(b[0] - a[0], b[2] - a[2]);
    const n = Math.ceil(d / 0.25);
    let y = a[1];
    let cx = Math.floor(a[0]);
    let cz = Math.floor(a[2]);
    for (let k = 1; k <= n; k++) {
      const t = k / n;
      // a faixa do corpo (0,3 de cada lado) também tem que passar
      for (const lado of [-0.3, 0, 0.3]) {
        const nx = d > 0 ? -(b[2] - a[2]) / d : 0;
        const nz = d > 0 ? (b[0] - a[0]) / d : 0;
        const x = Math.floor(a[0] + (b[0] - a[0]) * t + nx * lado);
        const z = Math.floor(a[2] + (b[2] - a[2]) * t + nz * lado);
        const yy = pisa(x, z, y);
        if (yy === null || Math.abs(yy - y) > 1 || ruim(x, yy, z)) return false;
        if (lado === 0 && (x !== cx || z !== cz)) {
          y = yy;
          cx = x;
          cz = z;
        }
      }
    }
    return Math.abs(y - b[1]) <= 1;
  };
  const out: V3[] = [[pts[0][0], pts[0][1], pts[0][2]]];
  let i = 0;
  while (i < pts.length - 1) {
    let j = Math.min(pts.length - 1, i + 1);
    for (let k = pts.length - 1; k > i + 1; k--)
      if (reto(pts[i], pts[k])) {
        j = k;
        break;
      }
    out.push([pts[j][0], pts[j][1], pts[j][2]]);
    i = j;
  }
  return out;
}

/**
 * O que a trilha do sítio evita: a roça plantada (e a terra arada), a beira da cerca e a das
 * paredes (o silo, o celeiro: um bloco cheio na altura da cabeça do lado). Degrau de morro não
 * conta (ele só tem um bloco).
 */
export function ruimNoSitio(bloco: (x: number, y: number, z: number) => number) {
  const cerca = (b: number) =>
    b === Bloco.CERCA || b === Bloco.PORTEIRA || b === Bloco.PORTEIRA_ABERTA;
  return (x: number, y: number, z: number): boolean => {
    // spec 026: a trilha alisada também nunca passa por cima de cerca ou grade
    if (obterBloco(bloco(x, y - 1, z))?.forma === 'cerca') return true;
    if (lavouraDoBloco(bloco(x, y, z)) || bloco(x, y - 1, z) === Bloco.TERRA_ARADA) return true;
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ])
      if (cerca(bloco(x + dx, y, z + dz)) || ehSolido(bloco(x + dx, y + 1, z + dz))) return true;
    return false;
  };
}

/** O custo a mais de cada célula na busca a pé no sítio (a roça custa muito, a cerca um pouco). */
export function custoNoSitio(bloco: (x: number, y: number, z: number) => number) {
  const ruim = ruimNoSitio(bloco);
  return (x: number, y: number, z: number): number => {
    // spec 026: em cima de cerca ou grade não se anda (a busca subia na mureta do rinque, de
    // um bloco, e a criança ficava presa em cima dela): a trilha dá a volta pela entrada
    if (obterBloco(bloco(x, y - 1, z))?.forma === 'cerca') return 80;
    if (lavouraDoBloco(bloco(x, y, z)) || bloco(x, y - 1, z) === Bloco.TERRA_ARADA) return 25;
    return ruim(x, y, z) ? 2 : 0;
  };
}

// ------------------------------------------------------------------ a ondinha
/** Pegadas por segundo que a ondinha anda, o intervalo entre ondinhas e a largura dela. */
const VEL_ONDA = 14;
const INTERVALO_ONDA = 2.6;

/**
 * Quanto a pegada i (contada dos pés) cresce agora: uma ondinha sai dos pés a cada
 * INTERVALO_ONDA e corre pela trilha; a de `forte` (o toque no selinho, a trilha que acendeu)
 * é maior. Devolve 0..1.
 */
export function ondaNaPegada(i: number, t: number, forteDesde = -Infinity): number {
  const fase = (t % INTERVALO_ONDA) * VEL_ONDA;
  const calma = Math.max(0, 1 - Math.abs(i - fase) / 2.2) ** 2 * Math.max(0, 1 - i / 40);
  const tf = t - forteDesde;
  const forte = tf >= 0 && tf < 4 ? Math.max(0, 1 - Math.abs(i - tf * VEL_ONDA * 1.3) / 3) ** 2 : 0;
  return Math.min(1, calma * 0.55 + forte);
}

// ------------------------------------------------------------------ o convite
/** Segundos brincando (com o jogo à vista) sem missão até o convite. */
export const CONVITE_S = 120;

/**
 * O relógio do convite: conta só com o jogo à vista e sem missão; com missão volta a zero (e
 * quando a missão acaba, recomeça do zero). `passo` devolve se o convite está à vista e se
 * acabou de aparecer (o brilho é uma vez só).
 *
 * `nova` (dono, 16 nov 2026: "o jogo ficou oferecendo as missões que eu já tinha feito"): há
 * missão que a criança ainda não fez neste mundo (`temMissaoNova`)? Sem missão nova o convite
 * nunca aparece e o relógio fica em zero: com tudo feito, o jogo não oferece nada.
 */
export function criarRelogioConvite(limite = CONVITE_S) {
  let brincando = 0;
  let antes = false;
  return {
    passo(
      dt: number,
      op: { missao: boolean; noJogo: boolean; nova?: boolean },
    ): { mostra: boolean; acendeu: boolean } {
      const nova = op.nova !== false;
      if (op.missao || !nova) brincando = 0;
      else if (op.noJogo) brincando += Math.max(0, Math.min(0.25, dt));
      const mostra = !op.missao && nova && brincando >= limite;
      const acendeu = mostra && !antes;
      antes = mostra;
      return { mostra, acendeu };
    },
    zerar() {
      brincando = 0;
      antes = false;
    },
    get segundos() {
      return brincando;
    },
  };
}
