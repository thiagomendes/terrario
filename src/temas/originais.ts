import { REGISTRO_BLOCOS } from '../world/blocks';
import { NOMES_BIOMA, type Bioma } from '../world/chunk';
import { CRIATURAS, TIPOS_ANIMAIS, type TipoCriatura } from '../jogo/criaturas';
import { NOMES_CLIMA, NOMES_ESTACAO } from '../jogo/clima';
import { MISSOES, type Missao } from '../jogo/diario';
import { registrarCatalogo } from '../jogo/catalogo';
import { idDoBloco, nomeBonito, obterItem, registrarBlocos, todosItens } from '../jogo/itens';
import type { TextosTema } from './tipos';

let originais: TextosTema | null = null;

/**
 * Textos do jogo base, lidos dos registros na primeira chamada — antes
 * de qualquer tema renomear algo. Servem de tema base e de valor de volta.
 */
export function textosOriginais(): TextosTema {
  if (originais) return originais;
  registrarBlocos();
  registrarCatalogo();
  const blocos: Record<number, string> = {};
  for (const b of REGISTRO_BLOCOS) if (b.id !== 0) blocos[b.id] = b.nome;
  const itens: Record<string, string> = {};
  // itens que não são o próprio bloco (as sementes plantam um bloco, mas têm nome de item)
  for (const i of todosItens()) if (i.tipo !== 'bloco') itens[i.id] = i.nome;
  const criaturas = {} as Record<TipoCriatura, string>;
  for (const t of TIPOS_ANIMAIS) criaturas[t] = CRIATURAS[t].nome;
  const missoes: Record<string, { titulo: string; descricao: string }> = {};
  const capitulos: Record<string, string> = {};
  for (const m of MISSOES) {
    missoes[m.id] = { titulo: m.titulo, descricao: m.descricao };
    capitulos[m.capitulo] = m.capitulo;
    capituloOriginal(m);
  }
  originais = {
    blocos,
    itens,
    criaturas,
    biomas: { ...NOMES_BIOMA } as Record<Bioma, string>,
    estacoes: { ...NOMES_ESTACAO },
    climas: { ...NOMES_CLIMA } as TextosTema['climas'],
    diario: 'Diário',
    missoes,
    capitulos,
    // spec 034: a base tem texto neutro (todo tema que se escolhe tem as boas-vindas dele)
    boasVindas: 'Bem-vindo ao seu mundo',
    morte: 'Você desmaiou',
    legendas: { trovao: 'Trovão', criaturaNoturna: 'Gemido de espectro' },
  };
  return originais;
}

/**
 * Aplica os nomes do tema aos registros do jogo (uma vez, ao abrir o mundo). Os ids
 * não mudam; só o que o jogador lê. Chamar com o tema base devolve os nomes originais.
 */
export function aplicarTextos(t: TextosTema): void {
  const o = textosOriginais();
  for (const b of REGISTRO_BLOCOS) {
    if (b.id === 0) continue;
    const nome = t.blocos[b.id] ?? o.blocos[b.id];
    (b as { nome: string }).nome = nome;
    const item = obterItem(idDoBloco(b.id));
    if (item) item.nome = nomeBonito(nome);
  }
  for (const i of todosItens()) {
    if (i.tipo === 'bloco') continue;
    const nome = t.itens[i.id] ?? o.itens[i.id];
    if (nome) i.nome = nome;
  }
  for (const [tipo, d] of Object.entries(CRIATURAS))
    (d as { nome: string }).nome =
      t.criaturas[tipo as TipoCriatura] ?? o.criaturas[tipo as TipoCriatura];
  Object.assign(NOMES_BIOMA, o.biomas, t.biomas);
  Object.assign(NOMES_ESTACAO, o.estacoes, t.estacoes);
  Object.assign(NOMES_CLIMA, o.climas, t.climas);
  for (const m of MISSOES as Missao[]) {
    const tm = t.missoes[m.id] ?? o.missoes[m.id];
    m.titulo = tm.titulo;
    m.descricao = tm.descricao;
    const cap = capituloOriginal(m);
    m.capitulo = t.capitulos[cap] ?? cap;
  }
}

/** Capítulo original da missão (guardado antes do primeiro tema renomear). */
const capituloDe = new Map<string, string>();
function capituloOriginal(m: Missao): string {
  if (!capituloDe.has(m.id)) capituloDe.set(m.id, m.capitulo);
  return capituloDe.get(m.id)!;
}
