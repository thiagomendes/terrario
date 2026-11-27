/**
 * Quem pode mexer em quê (spec 016, T03). Uma regra só, como o alcance da 015: o núcleo
 * (servidor na nuvem e modo local) confere com ela e o cliente prevê com ela (cadeado na
 * mira, rachadura que nem começa e o aviso), então nada "pisca" e volta.
 *
 * 1. O que o mundo construiu (proteção da T01) ninguém quebra, nem o dono do mundo, em
 *    nenhum modo. A lavoura do mundo colhe (e se replanta sozinha).
 * 2. O que alguém colocou só ele quebra; o dono do mundo também pode (desfazer o do amigo).
 * 3. Terreno natural: todos.
 * 4. Colocar: passagem, estrutura e usável do mundo ficam como estão; só o bloco que a
 *    geração pôs volta para o buraco (conserto). A planta (flor) do amigo não sai por baixo
 *    de um bloco novo.
 * 5. Baú e fornalha postos por alguém: só ele e o dono do mundo abrem (a fornalha da vila é
 *    de todos). Bicho criado ou domado: só quem criou e o dono do mundo chamam e levam.
 */
import { Bloco, obterBloco } from '../world/blocks';
import { ehPorta } from '../world/portas';
import { ehLavoura } from './plantio';
import {
  Protecao,
  naoColoca,
  naoQuebra,
  replantioDaLavoura,
  type LugarProtecao,
  type ProtecaoMundo,
} from '../world/protecao';

/** Por que não deu (o cliente escolhe o aviso). */
export type MotivoProtecao =
  | 'mundo'
  | 'amigo'
  | 'passagem'
  | 'bau'
  | 'fornalha'
  | 'bicho'
  /** Spec 014: célula de obra do canteiro (só o bloco da planta entra; o posto não sai). */
  | 'obra';

export interface RecusaProtecao {
  motivo: MotivoProtecao;
  /** Apelido de quem é (amigo, baú, bicho). */
  dono?: string;
  /** De quem é a construção do mundo (mundo, passagem). */
  lugar?: LugarProtecao;
  /** Spec 014: o bloco que a célula da obra pede (o balãozinho mostra o desenho dele). */
  certo?: number;
}

/** O que a regra precisa ler (o núcleo e o cliente dão a sua cópia do mundo). */
export interface MundoDaRegra {
  protecao: Pick<ProtecaoMundo, 'em' | 'lugar'> & Partial<Pick<ProtecaoMundo, 'planejado'>>;
  bloco(x: number, y: number, z: number): number;
  /** Bloco que a geração pôs (sem edições). */
  gerado(x: number, y: number, z: number): number;
  /** Id de quem colocou o bloco (null: natural, ar ou sem edição). */
  dono(x: number, y: number, z: number): string | null;
  apelido(id: string): string | undefined;
  /** Id do dono do mundo (null: não se sabe; ninguém tem o poder dele). */
  donoDoMundo: string | null;
}

/** `quem` pode mexer no que é de `dono`? (null: de ninguém) */
export function podeMexer(quem: string, dono: string | null, donoDoMundo: string | null): boolean {
  return dono === null || dono === quem || (donoDoMundo !== null && quem === donoDoMundo);
}

function doMundo(m: MundoDaRegra, x: number, z: number, motivo: MotivoProtecao): RecusaProtecao {
  const lugar = m.protecao.lugar(x, z);
  return lugar ? { motivo, lugar } : { motivo };
}

function deAlguem(m: MundoDaRegra, dono: string, motivo: MotivoProtecao): RecusaProtecao {
  const apelido = m.apelido(dono);
  return apelido ? { motivo, dono: apelido } : { motivo };
}

/** Quebrar (x, y, z): null pode; senão, o porquê. */
export function recusaQuebrar(
  m: MundoDaRegra,
  quem: string,
  x: number,
  y: number,
  z: number,
): RecusaProtecao | null {
  const p = m.protecao.em(x, y, z);
  // a lavoura do mundo é de todos: colhe e se replanta
  if (p === Protecao.LAVOURA) return null;
  // spec 014: o bloco posto na obra já é da cidade (ninguém tira, nem quem pôs)
  if (p === Protecao.OBRA) return { motivo: 'obra', lugar: 'cidade' };
  // por garantia: chão onde a geração deixou ar é o bloco de quem pôs (nunca fica preso)
  const chaoVazio = p === Protecao.CHAO && m.gerado(x, y, z) === Bloco.AR;
  if (naoQuebra(p) && !chaoVazio && !camaDaGeracaoTrocada(m, x, y, z))
    return doMundo(m, x, z, 'mundo');
  const dono = m.dono(x, y, z);
  if (podeMexer(quem, dono, m.donoDoMundo)) return null;
  return deAlguem(m, dono!, motivoDoBloco(m.bloco(x, y, z)) ?? 'amigo');
}

/**
 * Spec 039 (T03): a célula onde a geração põe a cama (a cabeceira ou o pé da cama nova) com outro
 * bloco por cima, de uma edição antiga (a criança construiu ali antes da cama de duas células):
 * ela segue a regra da edição, e não a do usável do mundo, para nunca prender o bloco da criança.
 */
function camaDaGeracaoTrocada(m: MundoDaRegra, x: number, y: number, z: number): boolean {
  return m.gerado(x, y, z) === Bloco.CAMA && m.bloco(x, y, z) !== Bloco.CAMA;
}

/** Baú e fornalha são contêineres (abrir segue a mesma regra); o resto, null. */
export function ehConteiner(b: number): boolean {
  return motivoDoBloco(b) !== null;
}

function motivoDoBloco(b: number): 'bau' | 'fornalha' | null {
  if (b === Bloco.BAU) return 'bau';
  if (b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) return 'fornalha';
  return null;
}

/** Colocar `bloco` em (x, y, z) (célula vazia, com planta baixa ou água): null pode. */
export function recusaColocar(
  m: MundoDaRegra,
  quem: string,
  x: number,
  y: number,
  z: number,
  bloco: number,
): RecusaProtecao | null {
  const p = m.protecao.em(x, y, z);
  // spec 014: a célula da obra aberta aceita só o bloco da planta; o resto do miolo espera
  if (p === Protecao.OBRA) {
    const pl = m.protecao.planejado?.(x, y, z) ?? null;
    if (pl && bloco === pl.bloco) return null;
    return pl
      ? { motivo: 'obra', lugar: 'cidade', certo: pl.bloco }
      : { motivo: 'obra', lugar: 'cidade' };
  }
  if (naoColoca(p) && !camaDaGeracaoTrocada(m, x, y, z)) {
    // conserto: o bloco que a geração pôs volta ao buraco da estrutura
    const conserto = p !== Protecao.PASSAGEM && bloco !== Bloco.AR && bloco === m.gerado(x, y, z);
    if (!conserto) return doMundo(m, x, z, p === Protecao.PASSAGEM ? 'passagem' : 'mundo');
  }
  // a florzinha do amigo não some debaixo do bloco de outro
  const dono = m.dono(x, y, z);
  if (podeMexer(quem, dono, m.donoDoMundo)) return null;
  return deAlguem(m, dono!, 'amigo');
}

/** Uma célula do lote do criativo: pula (nada muda), recusa ou o valor que entra. */
export type CelulaDoLote =
  | { pula: true }
  | { recusa: RecusaProtecao }
  /** `manterDono`: a célula fica com o dono que tinha (colheita, giro do mesmo bloco). */
  | { v: number; manterDono: boolean };

/**
 * O lote do criativo, célula a célula (núcleo e cliente): `v` é o valor pedido (bloco e meta)
 * e `atual` o valor de agora (sem o dono).
 * - Igual: pula (não carimba quem mandou: senão o lote "tomava" o bloco do amigo ou criava
 *   edição nas casas do mundo e esvaziava o tesouro da ruína).
 * - Mesmo bloco com outro meta: é mexer no bloco (regra de quebrar), e o dono fica.
 * - Lavoura do mundo: só colher (vira o estágio 0 da mesma planta, como quebrar); outra
 *   coisa por cima não entra.
 * - O resto: o que sai segue a regra de quebrar, o que entra a de colocar.
 */
export function celulaDoLote(
  m: MundoDaRegra,
  quem: string,
  x: number,
  y: number,
  z: number,
  v: number,
  atual: number,
): CelulaDoLote {
  const b = v & 255;
  const ab = atual & 255;
  if ((v & 0xffff) === (atual & 0xffff)) return { pula: true };
  if (b === ab) {
    const r = recusaQuebrar(m, quem, x, y, z);
    return r ? { recusa: r } : { v: v & 0xffff, manterDono: true };
  }
  if (ehLavoura(ab) && m.protecao.em(x, y, z) === Protecao.LAVOURA) {
    const rep = replantioDaLavoura(ab);
    if (rep === null || (b !== Bloco.AR && b !== rep)) return { recusa: doMundo(m, x, z, 'mundo') };
    const nv = rep | (atual & 0xff00);
    return nv === (atual & 0xffff) ? { pula: true } : { v: nv, manterDono: true };
  }
  const r =
    (ab !== Bloco.AR ? recusaQuebrar(m, quem, x, y, z) : null) ??
    (b !== Bloco.AR ? recusaColocar(m, quem, x, y, z, b) : null);
  return r ? { recusa: r } : { v: v & 0xffff, manterDono: false };
}

/**
 * A outra metade da porta de (x, y, z) que sai junto ao quebrar (o y dela), ou null. Portas
 * empilhadas formam pares de baixo para cima (como a malha desenha); a outra metade só sai
 * se for do mesmo dono e quem quebra puder quebrá-la (a porta solta da Bia em cima da do Léo
 * não leva a metade dele).
 */
export function outraMetadeDaPorta(
  m: MundoDaRegra,
  quem: string,
  x: number,
  y: number,
  z: number,
): number | null {
  if (!ehPorta(m.bloco(x, y, z))) return null;
  let abaixo = 0;
  while (y - abaixo - 1 >= 0 && ehPorta(m.bloco(x, y - abaixo - 1, z))) abaixo++;
  const oy = abaixo % 2 === 1 ? y - 1 : y + 1;
  if (!ehPorta(m.bloco(x, oy, z))) return null;
  if (m.dono(x, oy, z) !== m.dono(x, y, z)) return null;
  return recusaQuebrar(m, quem, x, oy, z) ? null : oy;
}

/**
 * Abrir o baú ou a fornalha de (x, y, z) (e mexer no que tem dentro): os do mundo são de
 * todos; o posto, de quem pôs e do dono do mundo (decisão do dono, 11 nov 2026: a fornalha
 * segue o baú). Outro bloco: null. `tipo` diz o contêiner já aberto (a transação confere
 * mesmo se o bloco mudou no meio).
 */
export function recusaConteiner(
  m: MundoDaRegra,
  quem: string,
  x: number,
  y: number,
  z: number,
  tipo?: 'bau' | 'fornalha',
): RecusaProtecao | null {
  const motivo = tipo ?? motivoDoBloco(m.bloco(x, y, z));
  if (!motivo || m.protecao.em(x, y, z) === Protecao.USAVEL) return null;
  const dono = m.dono(x, y, z);
  if (podeMexer(quem, dono, m.donoDoMundo)) return null;
  return deAlguem(m, dono!, motivo);
}

/**
 * Bicho criado ou domado: `dono` é quem criou (undefined: o dono do mundo, como o bloco sem
 * dono na tabela). Bicho solto (nem criado nem domado) é de todos.
 */
export function podeLevarBicho(
  quem: string,
  bicho: { criado?: boolean; domada?: boolean; dono?: string },
  donoDoMundo: string | null,
): boolean {
  if (!bicho.criado && !bicho.domada) return true;
  const dono = bicho.dono ?? donoDoMundo;
  return podeMexer(quem, dono, donoDoMundo);
}

/** O aviso de criança para cada recusa (curto, gentil, com o nome). */
export function avisoDaRecusa(r: RecusaProtecao): string {
  const de = r.dono ? ` ${daOuDo(r.dono)}` : '';
  switch (r.motivo) {
    case 'mundo':
      return r.lugar === 'cidade'
        ? 'Essa construção é da cidade. Que tal construir a sua?'
        : r.lugar === 'sitio'
          ? 'Esse cantinho é do sítio. Que tal construir a sua?'
          : r.lugar === 'ruina'
            ? 'Essa ruína é do mundo. Que tal construir a sua?'
            : r.lugar === 'estrutura'
              ? 'Isso o mundo construiu. Que tal construir o seu?'
              : 'Essa casa é da vila. Que tal construir a sua?';
    case 'passagem':
      return 'Aqui é passagem: deixa livre para todo mundo passar.';
    case 'obra':
      return r.certo !== undefined
        ? `Aqui vai ${nomeDoBlocoCerto(r.certo)}. Use a colher!`
        : 'Essa obra é da cidade. Que tal ajudar a construir?';
    case 'bau':
      return r.dono ? `Esse baú é${de}.` : 'Esse baú é de um amigo.';
    case 'fornalha':
      return r.dono ? `Essa fornalha é${de}.` : 'Essa fornalha é de um amigo.';
    case 'bicho':
      return r.dono ? `Esse bichinho é${de}.` : 'Esse bichinho é de um amigo.';
    case 'amigo':
    default:
      return r.dono ? `Essa parede é${de}.` : 'Essa parede é de um amigo.';
  }
}

/** Nome curto do bloco que a obra pede ("tijolo", "vidro"): o do tema, em minúsculas. */
function nomeDoBlocoCerto(b: number): string {
  return (obterBloco(b)?.nome ?? 'o bloco marcado').toLowerCase();
}

/** O aviso discreto do dono do mundo ao desfazer a construção de um amigo. */
export function avisoTirouDoAmigo(apelido: string): string {
  return `Você tirou um bloco ${daOuDo(apelido)}.`;
}

/**
 * "da Ana", "do Léo" ou "de Davi": o jogo não sabe o gênero, então vai pelo fim do nome
 * (a: "da", o: "do"; o resto, "de", que soa bem com qualquer nome).
 */
export function daOuDo(apelido: string): string {
  const n = apelido.trim();
  const ultima = n.slice(-1).toLowerCase();
  return `${ultima === 'a' ? 'da' : ultima === 'o' ? 'do' : 'de'} ${n}`;
}
