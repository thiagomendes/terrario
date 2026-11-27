/**
 * Spec 039 (T03): as camas dos mundos de antes viram a cama nova, de duas células, onde couber.
 * Roda só no núcleo, uma vez por mundo, ao abrir (o salvamento guarda `extras.camas: 2`), antes
 * da regra da peça solta. Nada some:
 *
 * - **A cama posta pela criança** (a edição de `CAMA` de uma célula, com a direção de quando foi
 *   posta): o pé entra na célula da frente se ela for ar (sem flor, sem água), com chão sólido
 *   embaixo, sem ninguém em cima e com a proteção de colocar do dono da cama. O pé fica com o
 *   dono da cabeceira (sem evento de colocação, sem som). Onde não couber, a cama vira a
 *   curtinha (a mesma célula, com a parte 2).
 * - **A cama que a geração pôs** (os povoados, o sítio e a cidade já desenham as duas células):
 *   se a célula do pé tem edição de outro bloco (a criança construiu ali antes da cama nova), a
 *   edição fica e a cabeceira vira a curtinha; a edição de ar no pé sai (o pé volta). Se a
 *   cabeceira tem edição de outro bloco, o pé que sobrou vira ar.
 */
import { Bloco } from '../world/blocks';
import type { Edicoes } from '../world/edicoes';
import { blocoApoia } from '../jogo/construir';
import { recusaColocar, type MundoDaRegra } from '../jogo/permissao';
import {
  PARTE_CURTINHA,
  metaDoMovel,
  parteDoMeta,
  vetorDoMovel,
  type Celula,
} from '../jogo/moveis';
import { ALTURA, TAM_X, TAM_Z } from '../world/chunk';

/** A versão da conversão gravada em `extras.camas` (2: a cama de duas células). */
export const VERSAO_CAMAS = 2;

export interface MundoDaConversao {
  edicoes: Edicoes;
  /** O bloco de agora (com as edições). */
  bloco(x: number, y: number, z: number): number;
  /** O bloco e o metadado que a geração pôs (sem as edições). */
  gerado(x: number, y: number, z: number): number;
  metaGerada(x: number, y: number, z: number): number;
  regra: MundoDaRegra;
  /** Há um corpo (bicho, morador) na célula? */
  ocupada(c: Celula): boolean;
  /** Grava a célula: o bloco, o metadado e o índice do dono. */
  gravar(x: number, y: number, z: number, bloco: number, meta: number, dono: number): void;
  /** Tira a edição da célula (volta o que a geração pôs). */
  remover(x: number, y: number, z: number): void;
}

export interface ResultadoConversao {
  /** Camas postas que ganharam o pé. */
  novas: number;
  /** Camas postas que ficaram curtinhas. */
  curtinhas: number;
  /** Camas da geração que ficaram curtinhas (a criança construiu onde vai o pé). */
  geradasCurtinhas: number;
  /** Pés da geração que voltaram (a edição de ar saiu). */
  pesDeVolta: number;
  /** Pés da geração que viraram ar (a cabeceira tinha outra coisa). */
  pesSemCabeceira: number;
}

/** As células editadas do mundo (x, y, z, valor), na ordem do salvamento. */
function editadas(ed: Edicoes): { x: number; y: number; z: number; v: number }[] {
  const out: { x: number; y: number; z: number; v: number }[] = [];
  for (const [k, lista] of Object.entries(ed.exportar())) {
    const [cx, cz] = k.split(',').map(Number);
    for (const [i, v] of lista)
      out.push({
        x: cx * TAM_X + (i % TAM_X),
        z: cz * TAM_Z + (Math.floor(i / TAM_X) % TAM_Z),
        y: Math.floor(i / (TAM_X * TAM_Z)),
        v,
      });
  }
  return out;
}

/** O pé da cama da geração em (x, y, z)? Devolve a direção dela, ou null. */
function peGerado(m: MundoDaConversao, x: number, y: number, z: number): number | null {
  const meta = m.metaGerada(x, y, z);
  if (parteDoMeta(meta) !== 1 || meta >> 5 !== 0) return null;
  return m.gerado(x, y, z) === Bloco.CAMA ? meta & 3 : null;
}

export function converterCamas(m: MundoDaConversao): ResultadoConversao {
  const r: ResultadoConversao = {
    novas: 0,
    curtinhas: 0,
    geradasCurtinhas: 0,
    pesDeVolta: 0,
    pesSemCabeceira: 0,
  };
  const todas = editadas(m.edicoes);
  /** A edição é exatamente a parte da cama da geração (o mesmo bloco, a parte e o dono do mundo)? */
  const exata = (v: number, d: number, parte: number) =>
    (v & 255) === Bloco.CAMA && ((v >> 8) & 255) === metaDoMovel(d, parte) && v >>> 16 === 0;
  // 1. as camas da geração com edição na cabeceira ou no pé (antes da cama nova). A edição de
  // `CAMA` no pé gerado (a cama que a criança pôs ali antes da 039) é outro bloco: só a edição
  // que é exatamente o pé fica como está
  for (const e of todas) {
    const atual = e.v & 255;
    // o pé editado: a cabeceira (da geração) vira curtinha, ou o pé volta (era ar)
    const dPe = peGerado(m, e.x, e.y, e.z);
    if (dPe !== null) {
      if (exata(e.v, dPe, 1)) continue;
      const [dx, dz] = vetorDoMovel(dPe);
      const cab = { x: e.x - dx, y: e.y, z: e.z - dz };
      if (m.edicoes.obterValor(cab.x, cab.y, cab.z) !== undefined) continue;
      if (atual === Bloco.AR) {
        m.remover(e.x, e.y, e.z);
        r.pesDeVolta++;
      } else {
        m.gravar(cab.x, cab.y, cab.z, Bloco.CAMA, metaDoMovel(dPe, PARTE_CURTINHA), 0);
        r.geradasCurtinhas++;
      }
      continue;
    }
    // a cabeceira editada com outra coisa (também outra cama): o pé da geração ao lado fica sem
    // cama (o metadado gerado do vizinho vem antes: o terreno inteiro só é gerado onde há cama)
    for (let d = 0; d < 4; d++) {
      const [dx, dz] = vetorDoMovel(d);
      const pe = { x: e.x + dx, y: e.y, z: e.z + dz };
      if (peGerado(m, pe.x, pe.y, pe.z) !== d) continue;
      if (exata(e.v, d, 0)) continue;
      if (m.edicoes.obterValor(pe.x, pe.y, pe.z) !== undefined) continue;
      if (m.gerado(e.x, e.y, e.z) !== Bloco.CAMA) continue;
      m.gravar(pe.x, pe.y, pe.z, Bloco.AR, 0, 0);
      r.pesSemCabeceira++;
    }
  }
  // 2. as camas que a criança pôs (uma célula, com a direção de quando foi posta)
  for (const e of todas) {
    if ((e.v & 255) !== Bloco.CAMA) continue;
    const valor = m.edicoes.obterValor(e.x, e.y, e.z);
    if (valor === undefined || (valor & 255) !== Bloco.CAMA) continue;
    const meta = (valor >> 8) & 255;
    // já é da cama nova (a curtinha de cima, ou o pé de outra que entrou agora)
    if (meta >> 2 !== 0) continue;
    const d = meta & 3;
    const dono = valor >>> 16;
    const [dx, dz] = vetorDoMovel(d);
    const pe = { x: e.x + dx, y: e.y, z: e.z + dz };
    // a frente já é o pé certo (a cama já é a nova): nada a fazer (a conversão pode rodar de novo)
    if (
      m.bloco(pe.x, pe.y, pe.z) === Bloco.CAMA &&
      m.edicoes.obterMeta(pe.x, pe.y, pe.z) === metaDoMovel(d, 1) &&
      m.edicoes.indiceDono(pe.x, pe.y, pe.z) === dono
    )
      continue;
    const idDono = (dono ? m.edicoes.donos.id(dono) : undefined) || m.regra.donoDoMundo || '';
    const cabe =
      pe.y > 0 &&
      pe.y < ALTURA &&
      m.bloco(pe.x, pe.y, pe.z) === Bloco.AR &&
      blocoApoia(m.bloco(pe.x, pe.y - 1, pe.z)) &&
      !m.ocupada(pe) &&
      !recusaColocar(m.regra, idDono, pe.x, pe.y, pe.z, Bloco.CAMA);
    if (cabe) {
      m.gravar(pe.x, pe.y, pe.z, Bloco.CAMA, metaDoMovel(d, 1), dono);
      r.novas++;
    } else {
      m.gravar(e.x, e.y, e.z, Bloco.CAMA, metaDoMovel(d, PARTE_CURTINHA), dono);
      r.curtinhas++;
    }
  }
  return r;
}
