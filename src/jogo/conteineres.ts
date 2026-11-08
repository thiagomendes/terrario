import { obterItem } from './itens';
import type { Slot } from './inventario';
import { novaFornalha, normalizarFornalha, passoFornalha, type EstadoFornalha } from './fornalha';
import { hash3 } from '../world/noise';
import { idDoBloco } from './itens';
import { Bloco } from '../world/blocks';
import { estiloMundo, TERRENO_NATURAL } from '../world/chunk';
import { planoDaRegiao, REGIAO_POVOADO } from '../world/povoado';

export const TAMANHO_BAU = 27;

export const chavePos = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Tesouro determinístico de um baú gerado pelo mundo (ruínas). */
export function tesouro(x: number, y: number, z: number, semente: number): Slot[] {
  const slots: Slot[] = Array.from({ length: TAMANHO_BAU }, () => null);
  const opcoes: [string, number, number][] = [
    ['carvao', 2, 8],
    ['ferro_bruto', 1, 4],
    ['cobre_bruto', 2, 6],
    ['luzita', 1, 2],
    ['maca', 1, 3],
    ['graveto', 2, 8],
    [idDoBloco(Bloco.TOCHA), 2, 6],
    ['picareta_pedra', 1, 1],
    ['lingote_ouro', 1, 2],
    [idDoBloco(Bloco.LANTERNA), 1, 1],
  ];
  let n = 0;
  for (let k = 0; k < opcoes.length && n < 6; k++) {
    const r = hash3(x + k * 31, y, z, semente + 4040);
    if (r > 0.45) continue;
    const [item, min, max] = opcoes[k];
    const qtd = min + Math.floor(hash3(x, y + k, z, semente + 4041) * (max - min + 1));
    const pos = Math.floor(hash3(x, y, z + k, semente + 4042) * TAMANHO_BAU);
    if (!slots[pos]) {
      const durabilidade = obterItem(item)?.durabilidade;
      slots[pos] = durabilidade ? { item, qtd: 1, dur: durabilidade } : { item, qtd };
      n++;
    }
  }
  return slots;
}

/** Item com a durabilidade cheia, se for ferramenta. */
function slot(item: string, qtd: number): Slot {
  const durabilidade = obterItem(item)?.durabilidade;
  return durabilidade ? { item, qtd: 1, dur: durabilidade } : { item, qtd };
}

/**
 * Conteúdo de um baú gerado pelo mundo. O do celeiro do sítio (spec 013) tem sementes e
 * uma enxada, sempre nos primeiros lugares; o do espantalho tem o tesouro e sementes; os
 * outros, o tesouro de sempre. Sorteios próprios (hash3 com sementes novas).
 */
export function conteudoGerado(x: number, y: number, z: number, semente: number): Slot[] {
  const rx = Math.floor(x / REGIAO_POVOADO);
  const rz = Math.floor(z / REGIAO_POVOADO);
  const p = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
  const b = p?.bauCeleiro;
  const qtd = (min: number, max: number, k: number) =>
    min + Math.floor(hash3(x + k, y, z, semente + 4050) * (max - min + 1));
  if (b && b[0] === x && b[1] === y && b[2] === z) {
    const slots: Slot[] = Array.from({ length: TAMANHO_BAU }, () => null);
    slots[0] = slot('enxada_madeira', 1);
    slots[1] = slot('semente_trigo', qtd(6, 9, 1));
    slots[2] = slot('semente_milho', qtd(4, 6, 2));
    slots[3] = slot('semente_abobora', qtd(2, 3, 3));
    return slots;
  }
  const slots = tesouro(x, y, z, semente);
  const dentroDoPovoado = !!p && x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ;
  if (
    estiloMundo().estrutura === 'espantalho' &&
    !dentroDoPovoado &&
    ((x % 16) + 16) % 16 === 8 &&
    ((z % 16) + 16) % 16 === 8
  ) {
    const sementes: [string, number][] = [
      ['semente_trigo', qtd(3, 6, 4)],
      ['semente_abobora', qtd(1, 2, 5)],
    ];
    for (const [item, n] of sementes) {
      const livre = slots.findIndex((q) => !q);
      if (livre >= 0) slots[livre] = slot(item, n);
    }
  }
  return slots;
}

export function criarConteineres(salvo: unknown, semente: number) {
  const baus = new Map<string, Slot[]>();
  const fornalhas = new Map<string, EstadoFornalha>();
  const s = (salvo ?? {}) as { baus?: Record<string, Slot[]>; fornalhas?: Record<string, unknown> };
  for (const [k, v] of Object.entries(s.baus ?? {})) {
    if (Array.isArray(v))
      baus.set(
        k,
        Array.from({ length: TAMANHO_BAU }, (_, i) => v[i] ?? null),
      );
  }
  for (const [k, v] of Object.entries(s.fornalhas ?? {})) fornalhas.set(k, normalizarFornalha(v));
  return {
    bau(x: number, y: number, z: number, gerado: boolean): Slot[] {
      const k = chavePos(x, y, z);
      let c = baus.get(k);
      if (!c) {
        c = gerado
          ? conteudoGerado(x, y, z, semente)
          : Array.from({ length: TAMANHO_BAU }, () => null);
        baus.set(k, c);
      }
      return c;
    },
    fornalha(x: number, y: number, z: number): EstadoFornalha {
      const k = chavePos(x, y, z);
      let f = fornalhas.get(k);
      if (!f) {
        f = novaFornalha();
        fornalhas.set(k, f);
      }
      return f;
    },
    /**
     * Remove e devolve o conteúdo (ao quebrar o bloco). `gerado`: o baú veio do mundo
     * (ruína); se nunca foi aberto, o tesouro ainda não existe e é criado agora.
     */
    remover(x: number, y: number, z: number, gerado = false): Slot[] {
      const k = chavePos(x, y, z);
      const salvo = baus.get(k) ?? (gerado ? conteudoGerado(x, y, z, semente) : []);
      const out: Slot[] = [...salvo];
      const f = fornalhas.get(k);
      if (f) out.push(f.entrada, f.combustivel, f.saida);
      baus.delete(k);
      fornalhas.delete(k);
      return out.filter((p) => !!p);
    },
    /** Avança todas as fornalhas; chama `aoMudarChama` quando acende ou apaga. */
    atualizar(
      dt: number,
      acesa: (x: number, y: number, z: number) => boolean,
      aoMudarChama: (x: number, y: number, z: number, acesa: boolean) => void,
    ): void {
      for (const [k, f] of fornalhas) {
        const r = passoFornalha(f, dt);
        const [x, y, z] = k.split(',').map(Number);
        if (r.acesa !== acesa(x, y, z)) aoMudarChama(x, y, z, r.acesa);
      }
    },
    salvar() {
      return { baus: Object.fromEntries(baus), fornalhas: Object.fromEntries(fornalhas) };
    },
  };
}
