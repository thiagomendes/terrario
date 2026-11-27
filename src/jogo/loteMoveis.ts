/**
 * Spec 039: o lote do criativo (colar, espelho, preencher, desfazer, os ganchos dos testes)
 * com os móveis de várias células. A mesma conta no núcleo e na previsão do cliente:
 *
 * 1. **Só a âncora entra.** A parte que não é âncora sai do lote (as partes saem da tabela), e o
 *    id do tapete também (o tapete não é de célula).
 * 2. **O móvel que muda sai inteiro.** A célula de um móvel inteiro que o lote troca leva as
 *    outras partes junto (viram ar), como quebrar.
 * 3. **Cada âncora vira o móvel inteiro**, se couber (as outras células dentro do mundo, livres
 *    ou ar no próprio lote, e não tomadas por outro móvel do lote); senão, fica de fora.
 * 4. **O móvel entra inteiro ou nada:** as células de um móvel (o que entra e o que sai) formam
 *    um grupo. Uma célula recusada (a proteção, alguém em cima) volta o grupo todo, e nenhum
 *    pedaço vira peça solta.
 *
 * Assim o colar, o espelho, o preencher e o desfazer funcionam com os móveis sem saber deles.
 */
import { Bloco } from '../world/blocks';
import { ALTURA } from '../world/chunk';
import { celulaDoLote, recusaQuebrar, type MundoDaRegra, type RecusaProtecao } from './permissao';
import { blocoOcupa, corpoNaCelula, type Corpo } from './construir';
import { substituivel } from './plantio';
import {
  celulasDaAncora,
  ehAncora,
  ehMovel,
  metaDoMovel,
  movelEm,
  type Celula,
  type LeitorMoveis,
} from './moveis';

/** Uma célula do lote: `v` é o bloco e o metadado (bloco | meta << 8), sem o dono. */
export interface EntradaLote {
  x: number;
  y: number;
  z: number;
  v: number;
}

export interface GrupoLote {
  celulas: EntradaLote[];
  /** Tem móvel (o que entra ou o que sai): entra inteiro ou nada. */
  movel: boolean;
  /** Uma âncora do grupo não coube: o grupo todo fica de fora. */
  naoCabe: boolean;
}

const chave = (x: number, y: number, z: number) => `${x},${y},${z}`;
const valor = (b: number, meta: number) => (b & 255) | ((meta & 255) << 8);

/** O lote em grupos (uma célula comum sozinha; um móvel com todas as células dele). */
export function gruposDoLote(lote: readonly EntradaLote[], l: LeitorMoveis): GrupoLote[] {
  const pedido = new Map<string, EntradaLote>();
  const ordem: string[] = [];
  const pedir = (x: number, y: number, z: number, v: number) => {
    const k = chave(x, y, z);
    if (!pedido.has(k)) ordem.push(k);
    pedido.set(k, { x, y, z, v: v & 0xffff });
  };
  // a união das células de um mesmo móvel
  const pai = new Map<string, string>();
  const raiz = (k: string): string => {
    let r = k;
    while (pai.has(r) && pai.get(r) !== r) r = pai.get(r)!;
    pai.set(k, r);
    return r;
  };
  const unir = (a: string, b: string) => {
    const ra = raiz(a);
    const rb = raiz(b);
    if (ra !== rb) pai.set(rb, ra);
  };
  const comMovel = new Set<string>();
  const semLugar = new Set<string>();

  // 1. só as âncoras (as partes pedidas ficam anotadas: o colar que traz o móvel inteiro pode
  // pôr a parte em cima do terreno, como poria um bloco comum)
  const ancoras: EntradaLote[] = [];
  const partesPedidas = new Map<string, number>();
  for (const e of lote) {
    const b = e.v & 255;
    const meta = (e.v >> 8) & 255;
    if (b === Bloco.TAPETE) continue;
    if (ehMovel(b) && !ehAncora(b, meta)) {
      partesPedidas.set(chave(e.x, e.y, e.z), e.v & 0xffff);
      continue;
    }
    pedir(e.x, e.y, e.z, e.v);
    if (ehMovel(b)) ancoras.push({ x: e.x, y: e.y, z: e.z, v: e.v & 0xffff });
  }
  // 2. o móvel que muda sai inteiro (também onde a parte de um móvel novo vai entrar, depois)
  const tirarOQueMuda = (k: string) => {
    const e = pedido.get(k)!;
    const b0 = l.bloco(e.x, e.y, e.z);
    if (!ehMovel(b0) || e.v === valor(b0, l.meta(e.x, e.y, e.z))) return;
    const m = movelEm(l, e.x, e.y, e.z);
    if (!m) return;
    comMovel.add(k);
    for (const c of m.celulas) {
      const ck = chave(c.x, c.y, c.z);
      if (!pedido.has(ck)) pedir(c.x, c.y, c.z, Bloco.AR);
      unir(k, ck);
    }
  };
  for (const k of [...ordem]) tirarOQueMuda(k);
  // 3. cada âncora vira o móvel inteiro, se couber; a primeira que chega ganha a célula
  const tomadas = new Set<string>();
  const aEsperar = new Set(ancoras.map((a) => chave(a.x, a.y, a.z)));
  const novasPartes: string[] = [];
  for (const a of ancoras) {
    const k = chave(a.x, a.y, a.z);
    aEsperar.delete(k);
    // a célula já é parte de um móvel que veio antes no lote, ou o lote pediu outra coisa nela
    // depois (a última vale): esta âncora fica de fora
    if (tomadas.has(k) || pedido.get(k)?.v !== a.v) continue;
    const b = a.v & 255;
    const d = (a.v >> 8) & 3;
    const celulas = celulasDaAncora(b, a.x, a.y, a.z, (a.v >> 8) & 255);
    comMovel.add(k);
    let cabe = true;
    for (const c of celulas.slice(1)) {
      const ck = chave(c.x, c.y, c.z);
      const parte = valor(b, metaDoMovel(d, c.parte));
      const ja = pedido.get(ck);
      if (c.y < 0 || c.y >= ALTURA || tomadas.has(ck)) cabe = false;
      // outra âncora do lote que ainda não veio: esta chegou antes e fica com a célula
      else if (ja && aEsperar.has(ck)) cabe = true;
      // o lote pede outro bloco ali: não cabe (o ar pedido, ou o do móvel que sai, cabe)
      else if (ja) cabe = (ja.v & 255) === Bloco.AR || ja.v === parte;
      // o lote pediu exatamente esta parte ali: entra por cima do que houver (a proteção e o
      // móvel que estava ali seguem a regra de sempre)
      else if (partesPedidas.get(ck) === parte) cabe = true;
      else {
        const atual = valor(l.bloco(c.x, c.y, c.z), l.meta(c.x, c.y, c.z));
        cabe = substituivel(atual & 255) || atual === parte;
      }
      if (!cabe) break;
    }
    if (!cabe) {
      semLugar.add(k);
      continue;
    }
    tomadas.add(k);
    for (const c of celulas.slice(1)) {
      const ck = chave(c.x, c.y, c.z);
      if (!pedido.has(ck)) novasPartes.push(ck);
      pedir(c.x, c.y, c.z, valor(b, metaDoMovel(d, c.parte)));
      tomadas.add(ck);
      unir(k, ck);
    }
  }
  for (const k of novasPartes) tirarOQueMuda(k);
  // 4. os grupos, na ordem em que a primeira célula de cada um apareceu
  const grupos = new Map<string, GrupoLote>();
  for (const k of ordem) {
    const r = raiz(k);
    let g = grupos.get(r);
    if (!g) {
      g = { celulas: [], movel: false, naoCabe: false };
      grupos.set(r, g);
    }
    g.celulas.push(pedido.get(k)!);
    if (comMovel.has(k)) g.movel = true;
    if (semLugar.has(k)) g.naoCabe = true;
  }
  return [...grupos.values()];
}

/** O que entra do lote, célula a célula, e o que volta. */
export interface DecisaoLote {
  /** `manterDono`: a célula fica com o dono que tinha (colheita, giro do mesmo bloco). */
  vai: (EntradaLote & { manterDono: boolean })[];
  /** As células recusadas (o núcleo corrige a tela de quem mandou). */
  voltam: Celula[];
  /** A primeira recusa da proteção (o aviso de criança). */
  primeira: RecusaProtecao | null;
  /** Uma célula prenderia um amigo ou um bicho. */
  prendia: boolean;
  /** Um móvel não coube. */
  naoCabia: boolean;
}

/**
 * Cada grupo pela regra de sempre (`celulaDoLote` e o corpo da spec 037). O grupo com móvel entra
 * inteiro (todas as células com o dono de quem mandou, para o móvel não virar peça solta) ou
 * volta inteiro. `atual` é o valor de agora (sem o dono); `corpos`, os corpos perto (quem manda o
 * lote fica de fora).
 */
export function decidirLote(
  grupos: readonly GrupoLote[],
  m: MundoDaRegra,
  quem: string,
  atual: (x: number, y: number, z: number) => number,
  corpos: () => readonly Corpo[],
): DecisaoLote {
  const r: DecisaoLote = { vai: [], voltam: [], primeira: null, prendia: false, naoCabia: false };
  const voltar = (g: GrupoLote) => {
    for (const e of g.celulas) r.voltam.push({ x: e.x, y: e.y, z: e.z });
  };
  for (const g of grupos) {
    if (g.naoCabe) {
      r.naoCabia = true;
      voltar(g);
      continue;
    }
    const decisoes = g.celulas.map((e) => ({
      e,
      d: celulaDoLote(m, quem, e.x, e.y, e.z, e.v, atual(e.x, e.y, e.z)),
    }));
    let recusa: RecusaProtecao | null = null;
    let prende = false;
    let muda = false;
    for (const { e, d } of decisoes) {
      if ('recusa' in d) {
        recusa ??= d.recusa;
        continue;
      }
      if ('pula' in d) continue;
      muda = true;
      if (blocoOcupa(d.v & 255) && corpos().some((k) => corpoNaCelula(e, k))) prende = true;
    }
    // o móvel que entra regrava as células iguais com o dono de quem mandou: elas também
    // seguem a regra de mexer no bloco
    if (g.movel && muda && !recusa)
      for (const { e, d } of decisoes)
        if ('pula' in d && (e.v & 255) !== Bloco.AR)
          recusa ??= recusaQuebrar(m, quem, e.x, e.y, e.z);
    if (recusa) {
      r.primeira ??= recusa;
      voltar(g);
      continue;
    }
    if (prende) {
      r.prendia = true;
      voltar(g);
      continue;
    }
    if (!muda) continue;
    for (const { e, d } of decisoes) {
      if (g.movel)
        r.vai.push({ x: e.x, y: e.y, z: e.z, v: 'v' in d ? d.v : e.v, manterDono: false });
      else if ('v' in d) r.vai.push({ x: e.x, y: e.y, z: e.z, v: d.v, manterDono: d.manterDono });
    }
  }
  return r;
}
