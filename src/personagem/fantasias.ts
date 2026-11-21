/**
 * Spec 017 (T02): o catálogo das fantasias prontas. Só dados (nada de Babylon): o boneco
 * (T03) lê as peças daqui e a aba Fantasias (T04) lê os grupos, nomes e cores.
 *
 * A fantasia é uma camada por cima do look da criança: corpo, pele, rosto, cabelo e nome
 * continuam os dela, e a roupa, a calça e o enfeite de baixo ficam guardados intactos.
 * "Tirar fantasia" só tira a camada, e o look de antes volta igualzinho.
 */
import type { Corpo, IdDesbloqueio } from './aparencia';
import type { IdTema } from '../temas/tipos';

export type GrupoFantasia = 'realeza' | 'herois' | 'temas';
/** Abas sempre nesta ordem (a criança aprende o lugar das coisas). */
export const GRUPOS_FANTASIA: readonly GrupoFantasia[] = ['realeza', 'herois', 'temas'];
export const ROTULOS_GRUPOS: Record<GrupoFantasia, string> = {
  realeza: 'Realeza',
  herois: 'Heróis',
  temas: 'Dos temas',
};

/** Tipos de peça nova que o boneco sabe montar (T03). */
export type TipoPeca =
  // realeza
  | 'saia-camadas'
  | 'mangas-bufantes'
  | 'coroa'
  | 'tiara'
  | 'enfeite-cabeca'
  | 'varinha'
  | 'casaco-faixa'
  | 'capa-curta'
  | 'cetro'
  // heróis
  | 'capa'
  | 'mascara'
  | 'emblema'
  | 'cinto'
  | 'botas'
  | 'luvas'
  // dos temas
  | 'camisa-xadrez'
  | 'macacao'
  | 'chapeu-palha'
  | 'colete-lenco'
  | 'chapeu-vaqueiro'
  | 'traje-espacial'
  | 'capacete-bolha'
  | 'avental-doce'
  | 'touca-chef'
  // spec 014: prêmios do canteiro da cidade
  | 'capacete-obra'
  | 'colete-obra'
  // spec 014 (T11): boné de brinquedo (copa redonda e pala curta), o do mecânico da cidade
  | 'bone'
  // spec 023: prêmios das missões do Rancho Alegre (a Caipira da festa e o Peão campeão)
  | 'camisa-festa'
  | 'chapeu-festa'
  | 'remendos'
  | 'chapeu-peao'
  | 'estrela-peao'
  | 'fivela-campeao'
  | 'franjas'
  // spec 023: o dragãozinho da lojinha premium (capuz refeito, corpo de escamas, asas e patas)
  | 'capuz-dragao'
  | 'corpo-dragao'
  | 'asas-dragao'
  | 'patas-dragao'
  // spec 026: as fantasias da Vila Neon (o vocalista, a dançarina e a patinadora) e o
  // guitarrista do palco
  | 'jaqueta-tachas'
  | 'faixa-braco'
  | 'munhequeira'
  | 'faixa-testa'
  | 'tenis-cano'
  | 'cabelo-liso'
  | 'moletom-ombro'
  | 'polainas'
  | 'viseira'
  | 'joelheiras'
  | 'colete-brim'
  | 'guitarra-raio'
  | 'bone-tras'
  // spec 026 (a tecladista, 16 nov 2026): o paletó de ombreiras, as mangas arregaçadas, a
  // gravata fina e os óculos escuros de armação quadrada
  | 'paleto-ombreiras'
  | 'mangas-arregacadas'
  | 'gravata-fina'
  | 'oculos-quadrados'
  // spec 027: o monstrinho peludo (o Bento e a fantasia de Monstrinho Peludo, em bonecoPeludo.ts)
  | 'macacao-tufos'
  | 'capuz-monstro'
  | 'pezoes'
  // spec 027 (T09): as peças novas da Noite das Fantasias (bonecoFesta.ts)
  | 'chapeu-bruxa'
  | 'lencol-capuz'
  | 'gola-alta'
  | 'orelhas-gatinho'
  | 'orelhas-morceguinho'
  // spec 027 (T10): o que só os moradores da festa vestem (bonecoFesta.ts): o xale e os óculos
  // redondos da Vovó, as sobrancelhas grisalhas, a lanterninha do Dudu, o lenço com o broche e as
  // mechas grisalhas do Seu Jerônimo
  | 'xale'
  | 'oculos-redondos'
  | 'sobrancelhas'
  | 'lanterninha'
  | 'lenco-broche'
  | 'mechas-grisalhas';

/** Símbolos próprios (nada de letra no peito, teia ou morcego). */
export type Simbolo = 'flor' | 'estrela' | 'concha' | 'floco' | 'raio' | 'coracao' | 'folha';

/**
 * Cor de uma peça: um papel ligado à cor principal escolhida ('principal', 'clara' e
 * 'escura'), a cor do emblema da fantasia ('emblema') ou uma cor fixa em "#rrggbb".
 */
export type CorPeca = 'principal' | 'clara' | 'escura' | 'emblema' | `#${string}`;

export interface PecaFantasia {
  tipo: TipoPeca;
  cor: CorPeca;
  simbolo?: Simbolo;
  /** Dá para tirar só esta peça e continuar fantasiado (capa, varinha, máscara...). */
  opcional?: boolean;
}

/** A roupa de baixo que a fantasia pinta no boneco (no lugar da roupa e da calça da criança). */
export interface RoupaDeBaixo {
  camisa: CorPeca;
  manga?: CorPeca;
  calca: CorPeca;
  sapato?: CorPeca;
}

/**
 * Como o cabelo fica por baixo do que vai na cabeça: 'livre' (tiara, máscara: nada muda),
 * 'chapeu' (assenta por cima, como os chapéus de hoje), 'capuz' (cobre o topo; as mechas
 * saem por baixo) e 'capacete' (bolha: o cabelo volumoso é achatado ou vira coque).
 */
export type Cabeca = 'livre' | 'chapeu' | 'capuz' | 'capacete';

export interface Visual {
  roupa: RoupaDeBaixo;
  pecas: readonly PecaFantasia[];
  cabeca: Cabeca;
}

export interface FantasiaDef {
  id: string;
  grupo: GrupoFantasia;
  /** Só nas fantasias dos temas (elas servem em qualquer mundo; o tema só ordena e sugere). */
  tema?: IdTema;
  /** Nome pelo corpo escolhido: "Heroína Relâmpago" / "Herói Relâmpago". */
  nomes: Record<Corpo, string>;
  /** Opções da cor principal; a primeira é a padrão. */
  cores: readonly string[];
  corEmblema: string;
  /** O que veste em cada corpo (na Realeza o masculino vira príncipe, sem saia). */
  visual: Record<Corpo, Visual>;
  /**
   * Spec 014: só se veste depois de ganhar (no canteiro da cidade). Antes disso a aba mostra a
   * silhueta com cadeado e a sugestão do tema nunca oferece.
   */
  desbloqueio?: IdDesbloqueio;
  /**
   * Spec 023: fantasia da lojinha premium. Não aparece na aba Fantasias e nunca vem no campo
   * `fantasia`: veste pelo `premium.fantasia` da aparência (o que a criança comprou).
   */
  premium?: true;
}

/**
 * Spec 023 (T09): as cores novas para as fantasias, presentes de nível (lilás no 4, menta no
 * 9). Valem em qualquer fantasia, no lugar da cor principal: o índice delas é fixo (90 e 91),
 * longe das cores de cada fantasia.
 */
export const TINTAS_PRESENTE = [
  { cor: 90, nivel: 4, nome: 'Lilás', hex: '#b48cff' },
  { cor: 91, nivel: 9, nome: 'Menta', hex: '#4fd8b0' },
] as const;
export const tintaPresente = (cor: number) => TINTAS_PRESENTE.find((t) => t.cor === cor);

/** Fantasia vestida: o id do catálogo e o índice da cor principal. */
export interface FantasiaVestida {
  id: string;
  cor: number;
  /** Peças opcionais que a criança tirou ("personalizar peça por peça"). */
  sem?: TipoPeca[];
}

const OURO = '#ffd45a';
const BRANCO = '#ffffff';

function mesmo(v: Visual): Record<Corpo, Visual> {
  return { feminino: v, masculino: v };
}

// ---------------------------------------------------------------------------
// Realeza: princesa no corpo feminino, príncipe no masculino (mesmas cores e símbolo).

function princesa(enfeite: 'coroa' | 'tiara' | 'enfeite-cabeca', simbolo: Simbolo): Visual {
  return {
    roupa: { camisa: 'principal', manga: 'clara', calca: 'clara', sapato: BRANCO },
    cabeca: 'livre',
    pecas: [
      { tipo: 'saia-camadas', cor: 'principal' },
      { tipo: 'mangas-bufantes', cor: 'clara' },
      { tipo: enfeite, cor: OURO, simbolo, opcional: true },
      { tipo: 'varinha', cor: BRANCO, simbolo, opcional: true },
    ],
  };
}

function principe(simbolo: Simbolo): Visual {
  return {
    roupa: { camisa: 'escura', manga: 'escura', calca: 'escura', sapato: '#3b2a1e' },
    cabeca: 'chapeu',
    pecas: [
      { tipo: 'casaco-faixa', cor: 'escura', simbolo },
      { tipo: 'botas', cor: '#3b2a1e' },
      { tipo: 'luvas', cor: BRANCO },
      { tipo: 'capa-curta', cor: 'clara', opcional: true },
      { tipo: 'coroa', cor: OURO, simbolo, opcional: true },
      { tipo: 'cetro', cor: OURO, simbolo, opcional: true },
    ],
  };
}

function realeza(
  id: string,
  sufixo: string,
  cores: string[],
  enfeite: 'coroa' | 'tiara' | 'enfeite-cabeca',
  simbolo: Simbolo,
): FantasiaDef {
  return {
    id,
    grupo: 'realeza',
    nomes: { feminino: `Princesa ${sufixo}`, masculino: `Príncipe ${sufixo}` },
    cores,
    corEmblema: OURO,
    visual: { feminino: princesa(enfeite, simbolo), masculino: principe(simbolo) },
  };
}

// ---------------------------------------------------------------------------
// Heróis: macacão inteiro, capa, máscara, emblema próprio, cinto, luvas e botas.

function heroi(
  id: string,
  sufixo: string,
  cores: string[],
  corEmblema: string,
  simbolo: Simbolo,
): FantasiaDef {
  return {
    id,
    grupo: 'herois',
    nomes: { feminino: `Heroína ${sufixo}`, masculino: `Herói ${sufixo}` },
    cores,
    corEmblema,
    visual: mesmo({
      roupa: { camisa: 'principal', calca: 'principal' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'emblema', cor: 'emblema', simbolo },
        { tipo: 'cinto', cor: 'emblema' },
        { tipo: 'luvas', cor: 'escura' },
        { tipo: 'botas', cor: 'escura' },
        { tipo: 'capa', cor: 'escura', opcional: true },
        { tipo: 'mascara', cor: 'escura', opcional: true },
      ],
    }),
  };
}

// ---------------------------------------------------------------------------

export const FANTASIAS: readonly FantasiaDef[] = [
  realeza(
    'realeza-flores',
    'das Flores',
    ['#ff8fc8', '#ffd45a', '#b89cff', '#7cc6ff', '#ff9b6b'],
    'tiara',
    'flor',
  ),
  realeza(
    'realeza-estrelas',
    'das Estrelas',
    ['#6f78ff', '#2f3a8a', '#ff8fc8', '#3fb8a8'],
    'coroa',
    'estrela',
  ),
  realeza(
    'realeza-mar',
    'do Mar',
    ['#3fc4d8', '#7cc6ff', '#5ad8a8', '#b89cff'],
    'enfeite-cabeca',
    'concha',
  ),
  realeza(
    'realeza-neve',
    'da Neve',
    ['#dff4ff', '#cfd8ff', '#ffe4f2', '#e8ffe8'],
    'enfeite-cabeca',
    'floco',
  ),

  heroi(
    'heroi-relampago',
    'Relâmpago',
    ['#2f6fd8', '#7a3ad8', '#1aa88a', '#e8462e'],
    '#ffd45a',
    'raio',
  ),
  heroi(
    'heroi-estrela',
    'Estrela',
    ['#ff6a9a', '#8a4ab8', '#ffb000', '#3fb8a8'],
    '#ffffff',
    'estrela',
  ),
  heroi(
    'heroi-coracao',
    'Coração',
    ['#3fae5a', '#2f6fd8', '#ff8a3d', '#8a4ab8'],
    '#ff5a6a',
    'coracao',
  ),
  heroi('heroi-mata', 'da Mata', ['#4caa3a', '#2f8a7a', '#c9a03a', '#5a7a2a'], '#d6ff8a', 'folha'),

  {
    id: 'fazendeira',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Fazendeira', masculino: 'Fazendeiro' },
    cores: ['#3f6fb8', '#5a4a6e', '#3f8a5a'],
    corEmblema: '#d9483b',
    visual: mesmo({
      roupa: { camisa: '#d9483b', manga: '#d9483b', calca: 'principal', sapato: '#5a3a26' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'camisa-xadrez', cor: BRANCO },
        { tipo: 'macacao', cor: 'principal' },
        { tipo: 'chapeu-palha', cor: '#f0cf6a', opcional: true },
      ],
    }),
  },
  {
    id: 'vaqueira',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Vaqueira', masculino: 'Vaqueiro' },
    cores: ['#a8733f', '#7a4826', '#c9a03a'],
    corEmblema: '#d9483b',
    visual: mesmo({
      roupa: { camisa: '#f2e6c8', manga: '#f2e6c8', calca: '#3f6fb8' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'colete-lenco', cor: 'principal' },
        { tipo: 'botas', cor: 'principal' },
        { tipo: 'chapeu-vaqueiro', cor: 'escura', opcional: true },
      ],
    }),
  },
  {
    id: 'astronauta',
    grupo: 'temas',
    tema: 'exploracao-lunar',
    nomes: { feminino: 'Astronauta', masculino: 'Astronauta' },
    cores: ['#f2f4f8', '#ffd45a', '#ff8fb3'],
    corEmblema: '#3b4250',
    visual: mesmo({
      roupa: { camisa: 'principal', calca: 'principal' },
      cabeca: 'capacete',
      pecas: [
        { tipo: 'traje-espacial', cor: 'principal' },
        { tipo: 'luvas', cor: '#b9c0c8' },
        { tipo: 'botas', cor: '#b9c0c8' },
        { tipo: 'capacete-bolha', cor: '#cfe8ff', opcional: true },
      ],
    }),
  },
  {
    id: 'confeiteira',
    grupo: 'temas',
    tema: 'doce-reino',
    nomes: { feminino: 'Confeiteira', masculino: 'Confeiteiro' },
    cores: ['#ff9ac8', '#9ad8ff', '#ffe08a'],
    corEmblema: '#e8202a',
    visual: mesmo({
      roupa: { camisa: BRANCO, calca: 'principal' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'avental-doce', cor: 'principal' },
        { tipo: 'touca-chef', cor: BRANCO, opcional: true },
      ],
    }),
  },
  // spec 014: os prêmios do canteiro da Cidade Grande (ganhos uma vez, vestidos em qualquer
  // mundo). A cor principal é a da camisa; o capacete e o colete têm a cor de obra de sempre.
  {
    id: 'capacete-obra',
    grupo: 'temas',
    tema: 'cidade-grande',
    desbloqueio: 'capacete-obra',
    nomes: { feminino: 'Pedreira', masculino: 'Pedreiro' },
    cores: ['#3f6fb8', '#5a8a4a', '#a8733f', '#8a5a9a'],
    corEmblema: '#ffc61a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#36507a', sapato: '#6a4426' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'capacete-obra', cor: '#ffc61a' },
        { tipo: 'botas', cor: '#7a4826' },
      ],
    }),
  },
  {
    id: 'colete-obra',
    grupo: 'temas',
    tema: 'cidade-grande',
    desbloqueio: 'colete-obra',
    nomes: { feminino: 'Mestra de obras', masculino: 'Mestre de obras' },
    cores: ['#3f6fb8', '#f2f4f8', '#5a8a4a', '#8a5a9a'],
    corEmblema: '#ffc61a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#36507a', sapato: '#6a4426' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'colete-obra', cor: '#ff7a1a' },
        { tipo: 'botas', cor: '#7a4826' },
        { tipo: 'capacete-obra', cor: '#ffc61a', opcional: true },
      ],
    }),
  },
  // spec 023: os prêmios das missões do Rancho Alegre (só saem de lá; vestidos em qualquer
  // mundo). A Caipira da festa vem na primeira colheita (r1); o Peão campeão, na roça que a
  // criança plantou e colheu (r7).
  {
    id: 'caipira',
    grupo: 'temas',
    tema: 'rancho-alegre',
    desbloqueio: 'caipira',
    nomes: { feminino: 'Caipira da festa', masculino: 'Caipira da festa' },
    cores: ['#e8402f', '#2f7fe8', '#f2a31a', '#8a5ad8'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#3f6fb8', sapato: '#6a4426' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'camisa-festa', cor: BRANCO },
        { tipo: 'remendos', cor: 'emblema' },
        { tipo: 'chapeu-festa', cor: '#f2d07a', opcional: true },
      ],
    }),
  },
  {
    id: 'peao-campeao',
    grupo: 'temas',
    tema: 'rancho-alegre',
    desbloqueio: 'peao-campeao',
    nomes: { feminino: 'Peoa campeã', masculino: 'Peão campeão' },
    cores: ['#b8322f', '#2f5a9a', '#6a3f9a'],
    corEmblema: OURO,
    visual: mesmo({
      roupa: { camisa: '#fff3d6', manga: '#fff3d6', calca: '#2f4f86', sapato: '#7a4826' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'colete-lenco', cor: 'principal' },
        { tipo: 'franjas', cor: '#e2b25a' },
        { tipo: 'estrela-peao', cor: 'emblema' },
        { tipo: 'fivela-campeao', cor: '#5a3a26' },
        { tipo: 'botas', cor: '#7a4826' },
        { tipo: 'chapeu-peao', cor: '#f2e6c8', opcional: true },
      ],
    }),
  },
  // spec 026: as fantasias da Vila Neon (livres, como as da 017). A Roqueira do Palco é o
  // look do vocalista ajustado à criança, com o cabelo comprido e liso ligado (sai com um
  // toque); a Dançarina do Neon é a única de rosa; a Patinadora é só a roupa (os patins a
  // criança calça no suporte do rinque, por escolha dela: dono, 16 nov 2026).
  {
    id: 'roqueira-palco',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Roqueira do Palco', masculino: 'Roqueiro do Palco' },
    cores: ['#3a3944', '#2c3a6a', '#5a2a36'],
    corEmblema: '#2f6fd0',
    visual: mesmo({
      roupa: { camisa: '#e8302a', manga: 'principal', calca: '#2a3350', sapato: '#e8302a' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'jaqueta-tachas', cor: 'principal' },
        { tipo: 'faixa-braco', cor: '#e8302a' },
        { tipo: 'munhequeira', cor: '#24232a' },
        { tipo: 'tenis-cano', cor: '#e8302a' },
        { tipo: 'faixa-testa', cor: '#e8302a', opcional: true },
        { tipo: 'cabelo-liso', cor: 'escura', opcional: true },
      ],
    }),
  },
  {
    id: 'danca-neon',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Dançarina do Neon', masculino: 'Dançarino do Neon' },
    cores: ['#ff6fb4', '#8a5ad8', '#ff8a2a'],
    corEmblema: '#2ee0d0',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#2e2a48', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'moletom-ombro', cor: 'principal' },
        { tipo: 'polainas', cor: 'emblema' },
        { tipo: 'faixa-testa', cor: 'emblema', opcional: true },
      ],
    }),
  },
  {
    id: 'patinadora',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Patinadora', masculino: 'Patinador' },
    cores: ['#2f8cff', '#e8302a', '#22c2b0'],
    corEmblema: '#ff8a2a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: '#f6f4ee', calca: '#f6f4ee', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'joelheiras', cor: 'principal' },
        { tipo: 'viseira', cor: 'emblema', opcional: true },
      ],
    }),
  },
  // spec 027 (T13): as fantasias da Noite das Fantasias (livres, como as dos outros temas), com
  // as peças da T09 e as cores do mundo (roxo, laranja, verde-oliva e dourado; nada de
  // arco-íris). A Bruxinha vem primeiro (é a sugestão ao criar um mundo da festa). Nada que
  // assuste: o vampirinho sem presas, a fantasminha de rosto à mostra, o monstrinho de tufos
  // redondos.
  {
    id: 'bruxinha-festa',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Bruxinha', masculino: 'Bruxinho' },
    cores: ['#6a3e9c', '#4a6326', '#c8621a'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: '#5f7d34', manga: '#5f7d34', calca: '#46305e', sapato: '#46305e' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'chapeu-bruxa', cor: 'principal' },
        { tipo: 'capa-curta', cor: 'principal' },
        { tipo: 'varinha', cor: 'emblema', simbolo: 'estrela', opcional: true },
      ],
    }),
  },
  {
    id: 'vampirinho-festa',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Vampirinha', masculino: 'Vampirinho' },
    cores: ['#3a2850', '#6a3e9c', '#4a6326'],
    corEmblema: '#ef8a2c',
    visual: mesmo({
      roupa: { camisa: '#f4ead8', manga: '#f4ead8', calca: '#3a2c50', sapato: '#2a2232' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'capa', cor: 'principal' },
        { tipo: 'gola-alta', cor: 'principal' },
        { tipo: 'colete-lenco', cor: '#6a3e9c', opcional: true },
      ],
    }),
  },
  {
    id: 'fantasminha-festa',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Fantasminha', masculino: 'Fantasminha' },
    cores: ['#f4efe4', '#e6dcf8', '#fbe4cc'],
    corEmblema: '#b9a0e0',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#c4b0e6', sapato: '#7a54b0' },
      cabeca: 'capuz',
      pecas: [{ tipo: 'lencol-capuz', cor: 'principal' }],
    }),
  },
  {
    id: 'monstrinho-peludo',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Monstrinho Peludo', masculino: 'Monstrinho Peludo' },
    // o verde-musgo do Bento primeiro; o roxo e o laranja do mundo (nunca azul: não lembra
    // nenhum monstro peludo conhecido)
    cores: ['#6b7444', '#7a5aa8', '#c87a3a'],
    corEmblema: '#d9863c',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: 'principal', sapato: 'principal' },
      cabeca: 'capuz',
      pecas: [
        { tipo: 'macacao-tufos', cor: 'principal' },
        { tipo: 'capuz-monstro', cor: 'principal' },
        { tipo: 'pezoes', cor: 'principal' },
      ],
    }),
  },
];

/**
 * Spec 014 (T11): fantasias que só os moradores vestem (o tema as dá a uma profissão em
 * `PovoadoTema.fantasias`); não aparecem na aba Fantasias. O desenho é o mesmo do jogador.
 */
export const FANTASIAS_DE_MORADOR: readonly FantasiaDef[] = [
  {
    id: 'mecanico-cidade',
    grupo: 'temas',
    tema: 'cidade-grande',
    nomes: { feminino: 'Mecânica', masculino: 'Mecânico' },
    cores: ['#3a6ab0'],
    corEmblema: '#d8433a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#2f5a9a', sapato: '#2a2026' },
      cabeca: 'chapeu',
      pecas: [{ tipo: 'bone', cor: '#d8433a' }],
    }),
  },
  // spec 026: a roadie do palco (o boné amarelo virado para trás, camiseta grafite e bermuda
  // verde-oliva; o fone e a fita crepe vêm das peças do tema)
  {
    id: 'roadie-vila',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Roadie', masculino: 'Roadie' },
    cores: ['#3a3944'],
    corEmblema: '#ffe14a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#6b7a3a', sapato: '#2e2d36' },
      cabeca: 'chapeu',
      pecas: [{ tipo: 'bone-tras', cor: 'emblema' }],
    }),
  },
  // spec 026: a guitarrista da Vila Neon (colete de brim com remendos, a faixa azul no braço e
  // a guitarra-raio vermelha nas costas: um raio gordinho inventado aqui, nunca um V)
  {
    id: 'guitarrista-vila',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Guitarrista', masculino: 'Guitarrista' },
    cores: ['#2f8cff'],
    corEmblema: '#e8302a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#e8302a', sapato: '#2e2d36' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'colete-brim', cor: '#3d5f8f' },
        { tipo: 'faixa-braco', cor: '#2f8cff' },
        { tipo: 'guitarra-raio', cor: 'emblema' },
        { tipo: 'tenis-cano', cor: '#2e2d36' },
      ],
    }),
  },
  // spec 026 (o show de verdade): o baterista (camiseta grafite, a bandana vermelha na testa e as
  // munhequeiras) e a baixista (camiseta verde-água, colete grafite, o baixo-raio azul no peito)
  {
    id: 'baterista-vila',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Baterista', masculino: 'Baterista' },
    cores: ['#2e2d36'],
    corEmblema: '#e8302a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#3a6fb8', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'faixa-testa', cor: 'emblema' },
        { tipo: 'munhequeira', cor: 'emblema' },
        { tipo: 'faixa-braco', cor: '#ffe14a' },
      ],
    }),
  },
  {
    id: 'baixista-vila',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Baixista', masculino: 'Baixista' },
    cores: ['#22c2b0'],
    corEmblema: '#2f8cff',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#24232a', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'colete-brim', cor: '#2e2d36' },
        { tipo: 'guitarra-raio', cor: 'emblema' },
        { tipo: 'faixa-braco', cor: '#ffe14a' },
        { tipo: 'tenis-cano', cor: '#f6f4ee' },
      ],
    }),
  },
  // spec 026 (a tecladista, 16 nov 2026): a do sintetizador, diferente de todo o resto da
  // banda (jaqueta preta, colete de brim, camiseta verde-água; o rosa é só da dançarina): o
  // paletó amarelo de ombreiras com as mangas arregaçadas sobre a camiseta branca, a gravata
  // fina e o lencinho no bolso verde-água, os óculos escuros de armação quadrada (as lentes
  // deixam ver os olhos) e o tênis branco; o cabelo de franja de lado, nunca maior que o boneco
  {
    id: 'tecladista-vila',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Tecladista', masculino: 'Tecladista' },
    cores: ['#f4d03f'],
    corEmblema: '#1fbfae',
    visual: mesmo({
      roupa: { camisa: '#f6f4ee', manga: 'principal', calca: '#2b2a33', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'paleto-ombreiras', cor: 'principal' },
        { tipo: 'mangas-arregacadas', cor: 'principal' },
        { tipo: 'gravata-fina', cor: 'emblema' },
        { tipo: 'oculos-quadrados', cor: 'emblema' },
        { tipo: 'tenis-cano', cor: '#f6f4ee' },
      ],
    }),
  },
  // spec 027: o Bento, o monstrinho peludo grandão da Noite das Fantasias (o macacão de tufos
  // verde-musgo, o capuz de monstro com os chifrinhos e os pezões); o pelo é o da versão em uso
  {
    id: 'bento-peludo',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Monstrinho Peludo', masculino: 'Monstrinho Peludo' },
    cores: ['#6b7444'],
    corEmblema: '#d9863c',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: 'principal', sapato: 'principal' },
      cabeca: 'capuz',
      pecas: [
        { tipo: 'macacao-tufos', cor: 'principal' },
        { tipo: 'capuz-monstro', cor: 'principal' },
        { tipo: 'pezoes', cor: 'principal' },
      ],
    }),
  },
  // spec 027 (T09): os moradores fantasiados da Noite das Fantasias, com as peças novas (o
  // chapéu de bruxa, o lençol de capuz, a gola alta e as orelhinhas) e as que já existem
  {
    id: 'vovo-bruxa',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Bruxinha', masculino: 'Bruxinho' },
    cores: ['#6a3e9c'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: '#5f7d34', manga: '#5f7d34', calca: '#4e3a66', sapato: '#46305e' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'chapeu-bruxa', cor: 'principal' },
        { tipo: 'capa-curta', cor: 'principal' },
        { tipo: 'varinha', cor: 'emblema', simbolo: 'estrela' },
      ],
    }),
  },
  {
    id: 'dudu-vampiro',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Vampirinha', masculino: 'Vampirinho' },
    cores: ['#3a2850'],
    corEmblema: '#ef8a2c',
    visual: mesmo({
      roupa: { camisa: '#f4ead8', manga: '#f4ead8', calca: '#3a2c50', sapato: '#2a2232' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'capa', cor: 'principal' },
        { tipo: 'gola-alta', cor: 'principal' },
        { tipo: 'colete-lenco', cor: '#6a3e9c' },
      ],
    }),
  },
  {
    id: 'lulu-fantasma',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Fantasminha', masculino: 'Fantasminha' },
    cores: ['#f4efe4'],
    corEmblema: '#b9a0e0',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#c4b0e6', sapato: '#7a54b0' },
      cabeca: 'capuz',
      pecas: [{ tipo: 'lencol-capuz', cor: 'principal' }],
    }),
  },
  {
    id: 'jeronimo-horta',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Hortelã', masculino: 'Hortelão' },
    cores: ['#3f6aa8'],
    corEmblema: '#ef8a2c',
    visual: mesmo({
      roupa: { camisa: '#c8463a', manga: '#c8463a', calca: 'principal', sapato: '#6b4a2e' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'chapeu-palha', cor: '#e8c46a' },
        { tipo: 'macacao', cor: 'principal' },
        { tipo: 'camisa-xadrez', cor: '#c8463a' },
        // T10: o detalhe de festa (o lenço roxo, o broche de abóbora e a fita roxa e laranja) e
        // o cabelo grisalho em mechas, com o chapéu mais baixo (depois do chapéu: mexem nele)
        { tipo: 'lenco-broche', cor: '#6a3e9c' },
        { tipo: 'mechas-grisalhas', cor: '#d6d3de' },
        { tipo: 'sobrancelhas', cor: '#d6d3de' },
      ],
    }),
  },
  // T10: a Vovó Zuleica, uma senhora (o jeito de vovó dos povoados: o cabelo grisalho, os óculos
  // redondos e o vestido comprido), com o chapéu de bruxa, o xale roxo de franjinha e a varinha
  {
    id: 'vovo-zuleica',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Vovó Bruxinha', masculino: 'Vovô Bruxinho' },
    cores: ['#6a3e9c'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: '#5f7d34', manga: '#5f7d34', calca: '#4e6a2a', sapato: '#46305e' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'chapeu-bruxa', cor: 'principal' },
        { tipo: 'xale', cor: '#7c50b4' },
        { tipo: 'oculos-redondos', cor: '#c9962e' },
        { tipo: 'sobrancelhas', cor: '#e2dee8' },
        { tipo: 'varinha', cor: 'emblema', simbolo: 'estrela' },
      ],
    }),
  },
  // T10: o Conde Dudu, o vampirinho com medo do escuro (sem presas), com a lanterninha acesa
  {
    id: 'conde-dudu',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Condessa', masculino: 'Conde' },
    cores: ['#3a2850'],
    corEmblema: '#ef8a2c',
    visual: mesmo({
      roupa: { camisa: '#f4ead8', manga: '#f4ead8', calca: '#3a2c50', sapato: '#2a2232' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'capa', cor: 'principal' },
        { tipo: 'gola-alta', cor: 'principal' },
        { tipo: 'colete-lenco', cor: '#6a3e9c' },
        { tipo: 'lanterninha', cor: '#46305e' },
      ],
    }),
  },
  {
    id: 'gatinho-festa',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Gatinha', masculino: 'Gatinho' },
    cores: ['#4a4458'],
    corEmblema: '#f4b6c8',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: 'principal' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'mascara', cor: 'principal' },
        { tipo: 'orelhas-gatinho', cor: 'principal' },
      ],
    }),
  },
  {
    id: 'morceguinho-festa',
    grupo: 'temas',
    tema: 'noite-das-fantasias',
    nomes: { feminino: 'Morceguinha', masculino: 'Morceguinho' },
    cores: ['#6a3e9c'],
    corEmblema: '#b9a0e0',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#46305e' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'mascara', cor: 'principal' },
        { tipo: 'orelhas-morceguinho', cor: 'principal' },
      ],
    }),
  },
  // spec 026 (o público do show): a turma da grade, quatro jeitos da época, só nos moradores.
  // Vistos de trás na plateia: o colete de brim com remendos, o boné (para a frente ou para
  // trás), a jaqueta de tachinhas e a faixa na testa; nada de rosa (é da dançarina)
  {
    id: 'plateia-colete',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Fã do show', masculino: 'Fã do show' },
    cores: ['#e8302a', '#f6f4ee', '#ffd23d'],
    corEmblema: '#ffe14a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#2a3350', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'colete-brim', cor: '#3d5f8f' },
        { tipo: 'faixa-testa', cor: 'emblema' },
      ],
    }),
  },
  {
    id: 'plateia-bone',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Fã do show', masculino: 'Fã do show' },
    cores: ['#f6f4ee', '#22c2b0', '#e8302a'],
    corEmblema: '#2f8cff',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#3a6fb8', sapato: '#2e2d36' },
      cabeca: 'chapeu',
      pecas: [{ tipo: 'bone', cor: 'emblema' }],
    }),
  },
  {
    id: 'plateia-bone-tras',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Fã do show', masculino: 'Fã do show' },
    cores: ['#22c2b0', '#2f8cff', '#3a3944'],
    corEmblema: '#e8302a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#2a3350', sapato: '#f6f4ee' },
      cabeca: 'chapeu',
      pecas: [{ tipo: 'bone-tras', cor: 'emblema' }],
    }),
  },
  {
    id: 'plateia-jaqueta',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Fã do show', masculino: 'Fã do show' },
    cores: ['#3d5f8f', '#2e2d36', '#7a4422'],
    corEmblema: '#ffe14a',
    visual: mesmo({
      roupa: { camisa: '#f6f4ee', manga: 'principal', calca: '#24232a', sapato: '#2e2d36' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'jaqueta-tachas', cor: 'principal' },
        { tipo: 'munhequeira', cor: '#24232a' },
      ],
    }),
  },
  // (16 nov 2026, o dobro no show) a viseira e as polainas, e o moletom largo de ombro caído
  // (nunca rosa: o rosa é da dançarina)
  {
    id: 'plateia-viseira',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Fã do show', masculino: 'Fã do show' },
    // (a quarta, laranja, para a turma de trás não repetir a cor de quem está do lado)
    cores: ['#f6f4ee', '#ffd23d', '#22c2b0', '#ff8a2a'],
    corEmblema: '#2f8cff',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#3a3944', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'viseira', cor: 'emblema' },
        { tipo: 'munhequeira', cor: 'emblema' },
      ],
    }),
  },
  {
    id: 'plateia-moletom',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Fã do show', masculino: 'Fã do show' },
    // (a quarta, lilás: nunca rosa)
    cores: ['#22c2b0', '#ffd23d', '#2f8cff', '#9a6cf0'],
    corEmblema: '#e8302a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#2a3350', sapato: '#f6f4ee' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'moletom-ombro', cor: 'principal' },
        { tipo: 'faixa-testa', cor: 'emblema' },
      ],
    }),
  },
  {
    id: 'plateia-faixa',
    grupo: 'temas',
    tema: 'vila-neon',
    nomes: { feminino: 'Fã do show', masculino: 'Fã do show' },
    cores: ['#ff8a2a', '#3a3944', '#2f8cff'],
    corEmblema: '#ffe14a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#2a3350', sapato: '#e8302a' },
      cabeca: 'livre',
      pecas: [
        { tipo: 'faixa-testa', cor: 'emblema' },
        { tipo: 'faixa-braco', cor: 'emblema' },
      ],
    }),
  },
];

/**
 * Spec 023: as fantasias da lojinha premium (o boneco as veste pelo `premium.fantasia`). O
 * dragãozinho: verde-água com barriga de escamas, capuz com focinho, chifres de ouro, espinhos
 * das costas ao rabo, asas que batem e patinhas com garras.
 */
export const FANTASIAS_PREMIUM: readonly FantasiaDef[] = [
  {
    id: 'dragao',
    grupo: 'temas',
    premium: true,
    nomes: { feminino: 'Dragãozinho', masculino: 'Dragãozinho' },
    cores: ['#2ec4a0'],
    corEmblema: '#fff1c4',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: 'principal', sapato: '#2ec4a0' },
      cabeca: 'capuz',
      pecas: [
        { tipo: 'capuz-dragao', cor: 'principal' },
        { tipo: 'corpo-dragao', cor: 'emblema' },
        { tipo: 'asas-dragao', cor: '#8a6aff' },
        { tipo: 'patas-dragao', cor: 'principal' },
      ],
    }),
  },
];

const POR_ID = new Map(
  [...FANTASIAS, ...FANTASIAS_DE_MORADOR, ...FANTASIAS_PREMIUM].map((f) => [f.id, f]),
);

export function fantasiaPorId(id: unknown): FantasiaDef | undefined {
  return typeof id === 'string' ? POR_ID.get(id) : undefined;
}

/** Nome pelo corpo: "Princesa das Estrelas" / "Príncipe das Estrelas". */
export function rotuloDaFantasia(
  fantasia: FantasiaDef | FantasiaVestida | string,
  corpo: Corpo,
): string {
  const def =
    typeof fantasia === 'string'
      ? fantasiaPorId(fantasia)
      : 'nomes' in fantasia
        ? fantasia
        : fantasiaPorId(fantasia.id);
  return def ? def.nomes[corpo] : '';
}

/** As fantasias de uma aba. Em "Dos temas", as do tema do mundo aberto vêm primeiro. */
export function fantasiasDoGrupo(grupo: GrupoFantasia, temaDoMundo?: string): FantasiaDef[] {
  const lista = FANTASIAS.filter((f) => f.grupo === grupo);
  if (grupo !== 'temas' || !temaDoMundo) return lista;
  return [
    ...lista.filter((f) => f.tema === temaDoMundo),
    ...lista.filter((f) => f.tema !== temaDoMundo),
  ];
}

/** Os temas de "Dos temas" na ordem da tela (o do mundo aberto primeiro, sem repetir). */
export function temasDasFantasias(temaDoMundo?: string): IdTema[] {
  const temas: IdTema[] = [];
  for (const f of fantasiasDoGrupo('temas', temaDoMundo))
    if (f.tema && !temas.includes(f.tema)) temas.push(f.tema);
  return temas;
}

/** Spec 014: a criança pode vestir esta fantasia (é livre, ou ela já ganhou a peça)? */
export function fantasiaLiberada(
  def: Pick<FantasiaDef, 'desbloqueio'>,
  desbloqueios: readonly string[] = [],
): boolean {
  return !def.desbloqueio || desbloqueios.includes(def.desbloqueio);
}

/**
 * A fantasia sugerida ao criar um mundo daquele tema (a primeira dele que a criança pode
 * vestir), se houver: as que ainda não foram ganhas nunca são sugeridas.
 */
export function fantasiaDoTema(
  tema: string,
  desbloqueios: readonly string[] = [],
): FantasiaDef | undefined {
  return FANTASIAS.find(
    (f) => f.grupo === 'temas' && f.tema === tema && fantasiaLiberada(f, desbloqueios),
  );
}

/**
 * Fantasia válida ou nenhuma: id desconhecido vira "sem fantasia", cor fora da paleta vira a
 * padrão e só ficam em `sem` peças opcionais daquela fantasia naquele corpo.
 */
export function normalizarFantasia(entrada: unknown, corpo: Corpo): FantasiaVestida | undefined {
  if (typeof entrada !== 'object' || entrada === null || Array.isArray(entrada)) return undefined;
  const obj = entrada as Record<string, unknown>;
  const def = fantasiaPorId(obj.id);
  // spec 023: a fantasia premium só veste pelo campo `premium` (o que foi comprado)
  if (!def || def.premium) return undefined;
  const cor =
    typeof obj.cor === 'number' &&
    Number.isInteger(obj.cor) &&
    ((obj.cor >= 0 && obj.cor < def.cores.length) || tintaPresente(obj.cor))
      ? obj.cor
      : 0;
  const saida: FantasiaVestida = { id: def.id, cor };
  if (Array.isArray(obj.sem)) {
    const opcionais = def.visual[corpo].pecas.filter((p) => p.opcional).map((p) => p.tipo);
    const sem = opcionais.filter((t) => (obj.sem as unknown[]).includes(t));
    if (sem.length) saida.sem = sem;
  }
  return saida;
}

/** As peças que o boneco monta agora (sem as opcionais que a criança tirou). */
export function pecasVestidas(f: FantasiaVestida, corpo: Corpo): PecaFantasia[] {
  const def = fantasiaPorId(f.id);
  if (!def) return [];
  return def.visual[corpo].pecas.filter((p) => !f.sem?.includes(p.tipo));
}

// ---------------------------------------------------------------------------
// Cores: os papéis 'clara' e 'escura' saem da cor principal, como no esboço.

function paraRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function paraHex([r, g, b]: number[]): string {
  return (
    '#' +
    [r, g, b]
      .map((c) =>
        Math.round(Math.min(255, Math.max(0, c)))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
/** Mistura com branco (k de 0 a 1). */
export function clarear(hex: string, k: number): string {
  return paraHex(paraRgb(hex).map((c) => c + (255 - c) * k));
}
/** Escurece (k de 0 a 1). */
export function escurecer(hex: string, k: number): string {
  return paraHex(paraRgb(hex).map((c) => c * (1 - k)));
}

/** A cor "#rrggbb" de um papel na fantasia vestida. */
export function corDaPeca(f: FantasiaVestida, cor: CorPeca): string {
  const def = fantasiaPorId(f.id);
  const principal = tintaPresente(f.cor)?.hex ?? def?.cores[f.cor] ?? def?.cores[0] ?? '#888888';
  switch (cor) {
    case 'principal':
      return principal;
    case 'clara':
      return clarear(principal, 0.3);
    case 'escura':
      return escurecer(principal, 0.3);
    case 'emblema':
      return def?.corEmblema ?? BRANCO;
    default:
      return cor;
  }
}
