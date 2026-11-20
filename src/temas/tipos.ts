/**
 * Pacote de tema do Terrário. O tema muda aparência, nomes e sons — nunca regras:
 * blocos, itens, criaturas, receitas e biomas têm os mesmos ids em todos os temas.
 *
 * Tudo aqui é dado puro (sem Babylon), para servir também ao worker e aos testes.
 */
import type { Bioma } from '../world/chunk';
import type { TipoCriatura } from '../jogo/criaturas';
import type { GrupoMaterial } from '../audio/materiais';
import type { Acessorio, Aparencia } from '../personagem/aparencia';
import type { FantasiaVestida } from '../personagem/fantasias';
import type { Estacao, TipoClima } from '../jogo/clima';
import type { FormasPovoado, Profissao } from '../world/povoado';
import type { Exclusivos } from '../jogo/exclusivos';

export type IdTema =
  | 'bruma-e-luz'
  | 'planeta-vivo'
  | 'mata-encantada'
  | 'doce-reino'
  | 'era-dos-dinos'
  | 'exploracao-lunar'
  | 'rancho-alegre'
  | 'cidade-grande'
  | 'vila-neon';

export type Rgb = readonly [number, number, number];
/** Pixel RGBA 0..255 de um tile. */
export type Px = [number, number, number, number];
/** Pinta um pixel (x, y) de um tile 16x16; `s` é a semente do tile. */
export type Pintor = (x: number, y: number, s: number) => Px;

/** Quadro-chave do ciclo do dia (hora 0..1; cores 0..1). */
export interface QuadroCeu {
  h: number;
  zen: Rgb;
  meio: Rgb;
  hor: Rgb;
  luz: Rgb;
  il: number;
  ceu: Rgb;
  chao: Rgb;
  ic: number;
  amb: Rgb;
  dens: number;
}

/** Astros e detalhes do céu (shader do céu). Os padrões reproduzem a base. */
export interface CeuTema {
  /** 0..1: estrelas visíveis de dia (1 na Lua). */
  estrelasDia: number;
  corEstrelas: Rgb;
  /** Quantidade de estrelas (0..1, 0.5 = padrão). */
  densidadeEstrelas: number;
  /** Tinta do disco do sol (multiplica a cor da luz). */
  corSol: Rgb;
  /** Raio angular do disco do sol (padrão 1). */
  tamanhoSol: number;
  /** Halo em volta do sol (0 = nenhum, como no vácuo). */
  haloSol: number;
  /** Segundo sol (Planeta Vivo): deslocamento angular em relação ao primeiro e cor. */
  segundoSol?: { deslocamento: number; cor: Rgb; tamanho: number };
  /** Tinta da lua. */
  corLua: Rgb;
  tamanhoLua: number;
  /** Planeta/astro grande fixo no céu (a Terra vista da Lua, um gigante gasoso). */
  planeta?: {
    /** Direção (normalizada pelo shader) do centro do planeta. */
    direcao: Rgb;
    raio: number;
    cor: Rgb;
    corSecundaria: Rgb;
    /** 0 = faixas (gigante gasoso), 1 = manchas (continentes). */
    mistura?: number;
    /** 0..1: nuvens brancas e borda de atmosfera (planeta azul). */
    nuvens?: number;
    aneis?: { cor: Rgb; inclinacao: number };
  };
  /** Tinta das nuvens. */
  corNuvens: Rgb;
  /** Multiplica a cobertura de nuvens (0 = sem nuvens, como na Lua). */
  fatorNuvens: number;
  /** Faixa colorida do horizonte no nascer/pôr (0 = nenhuma). */
  faixaCrepusculo: number;
  /** Cor da faixa do crepúsculo (padrão: laranja). */
  corCrepusculo?: Rgb;
  /**
   * Spec 026: o piso de luz dos blocos de noite (0 a 1; padrão 1, o de sempre). O material
   * dos blocos tem um piso de luz próprio do visual de brinquedo, e com ele o chão nunca
   * escurece de verdade. Abaixo de 1, o piso baixa conforme a noite chega (na Vila Neon, 0,3:
   * o chão fica escuro e a luz vem do palco, do neon e das janelas).
   */
  pisoNoite?: number;
  /**
   * Spec 026: quanto o verde dos blocos apaga de noite (0 a 1; padrão 0, o de sempre). Na Vila
   * Neon o gramado ficava verde aceso no escuro; com isto ele vira um roxo-escuro.
   */
  verdeNoite?: number;
}

export interface AguaTema {
  fundoDia: Rgb;
  fundoNoite: Rgb;
  /** Tinta do reflexo do céu. */
  tinta: Rgb;
  /** Opacidade base (0.74 = padrão). */
  opacidade: number;
}

export interface BrumaTema {
  /** Tinta multiplicada sobre a cor da bruma (que segue a névoa do céu). */
  cor: Rgb;
  /** Multiplica a força da bruma dos vales (0 desliga). */
  forca: number;
}

export interface ParticulasTema {
  /** Vaga-lumes à noite e pólen de dia (cores). */
  vagalumeNoite: Rgb;
  vagalumeDia: Rgb;
  chuva: Rgb;
  neve: Rgb;
  folhas: Rgb;
  poeira: Rgb;
}

/** Como o clima aparece no tema (o clima em si — quando chove, neva — não muda). */
export interface ClimaVisualTema {
  /** Chuva: gotas, poeira que cai devagar (Lua), granulado colorido (doces) ou nada visível. */
  chuva: 'gotas' | 'poeira' | 'granulado' | 'nenhuma';
  /** Flocos e topo branco no inverno. */
  neve: boolean;
  /** Clarão de relâmpago nas tempestades. */
  relampago: boolean;
  arcoIris: boolean;
}

/** Peça de criatura: tamanho [w, h, d], posição do centro (pés na origem, frente +z). */
export interface PecaCriatura {
  t: [number, number, number];
  p: [number, number, number];
  cor: string;
  brilho?: number;
  alfa?: number;
  /**
   * Como a peça anima: pernas balançam (pivô no topo), cabeça acena, cauda abana;
   * roda gira com o deslocamento; asa0/asa1 batem espelhadas (pivô na borda de dentro);
   * antena balança devagar (pivô na base).
   */
  papel?: 'perna0' | 'perna1' | 'cabeca' | 'cauda' | 'roda' | 'asa0' | 'asa1' | 'antena';
  /**
   * Bicho desenhado à mão como brinquedo (spec 012): com a forma dita, o modelo é usado como
   * está (sem a passagem automática de cabeça maior, olhos de bolinha etc.).
   * 'bola' = elipsoide do tamanho t; 'capsula' = caixa de pontas bem redondas; 'caixa' = caixa
   * com os cantos de raio `raio`.
   */
  forma?: 'bola' | 'capsula' | 'caixa';
  /** Raio dos cantos da caixa (padrão: 40% do lado menor). */
  raio?: number;
  /** Inclinação da peça em radianos [x, y, z] (orelhas, chifres, rabo). */
  rot?: [number, number, number];
}

/** Jeito de se mover da criatura (só visual). */
export interface MovimentoCriatura {
  /** Altura dos pulinhos ao andar (coelho, gelatina). */
  saltita: number;
  /** Flutua parada no ar (amplitude; a noturna da base usa 0.08). */
  flutua: number;
  /** Ginga o corpo de lado ao andar (0 a 0.3). */
  ginga: number;
  /** Empurra a cabeça para a frente a cada passo (blocos; o pombo da praça). */
  cabecada?: number;
}

/** Um som curto sintetizado: varredura de tom com repetições (pio, grunhido, bipe). */
export interface PioCriatura {
  onda: 'sine' | 'triangle' | 'square' | 'sawtooth';
  /** Tom inicial e final (Hz). */
  de: number;
  ate: number;
  /** Duração de cada repetição (s). */
  dur: number;
  repeticoes: number;
  /** Tempo entre repetições (s). */
  intervalo: number;
  /** Vibrato (Hz; 0 = nenhum). */
  vibrato?: number;
  /** 0..1: sopro/chiado misturado (grunhido, ronco, chiado de rádio). */
  ruido?: number;
  /** Volume relativo (padrão 1). */
  ganho?: number;
}

/** Vozes da criatura: chamado de vez em quando, susto ao levar golpe e contentamento. */
export interface VozCriatura {
  chamado: PioCriatura;
  susto: PioCriatura;
  contente: PioCriatura;
}

export type FormaArvore =
  | 'carvalho'
  | 'betula'
  | 'pinho'
  | 'lanterna'
  | 'palmeira'
  | 'fungo'
  | 'pirulito'
  | 'samambaia'
  | 'cristal'
  | 'araucaria';

/** Forma da estrutura rara (sempre os mesmos blocos e o mesmo baú; só o desenho muda). */
export type FormaEstrutura =
  | 'ruina'
  | 'cupula'
  | 'circulo'
  | 'arcos'
  | 'casinha'
  | 'torre'
  | 'ninho'
  /** Spec 013: espantalho com baú no meio de uma lavoura abandonada. */
  | 'espantalho'
  /** Spec 014: a roda-gigante de um parque de diversões abandonado (Cidade Grande). */
  | 'roda-gigante';

/** Como o mundo é montado (só forma; os blocos e as regras são os mesmos). */
export interface EstiloMundo {
  /** Formas de árvore por bioma (sorteadas por posição). */
  arvores: Partial<Record<Bioma, FormaArvore[]>>;
  estrutura: FormaEstrutura;
  /** 0..1: crateras no relevo (Lua). */
  crateras: number;
  /** 0..1: fração de flores e grama alta mantida (1 = todas). */
  flora: number;
  /** Forma das construções dos povoados (só o desenho; blocos e regras são os mesmos). */
  povoado?: FormasPovoado;
  /**
   * Spec 013: como a criatura da noite age. Sem o campo, assusta como sempre; 'mansa'
   * (Rancho Alegre) só pia e foge. O comportamento vem da T04; o campo já passa pela nuvem.
   */
  noite?: 'assusta' | 'mansa';
  /**
   * Spec 014: a comida que doma o papel raposa. Sem o campo, frutinhas (como sempre); na
   * Cidade Grande, 'peixe' (o gato de rua é domado com peixe fresco ou assado).
   */
  domar?: 'frutinhas' | 'peixe';
}

export interface TimbreMusica {
  /** Forma de onda das vozes dos acordes (padrão: triângulo). */
  onda: 'sine' | 'triangle' | 'square' | 'sawtooth';
  /** Brilho (frequência do filtro) e duração das notas. */
  brilho: number;
  sustentacao: number;
  /** Desafinação extra entre vozes do acorde (cents) — calor/coro. */
  coro: number;
  /** Forma de onda do "sino" da melodia (padrão: senoide). */
  sino?: 'sine' | 'triangle' | 'square' | 'sawtooth';
}

/** Sons da natureza ao fundo (multiplicadores; 0 desliga). */
export interface NaturezaTema {
  passaros: number;
  grilos: number;
  /** Multiplica o tom de pássaros e grilos (dinossauros: mais grave). */
  tom: number;
  /** Bipes de rádio distantes no lugar dos pássaros (Lua), de dia e à noite. */
  bipes?: boolean;
  /** Volume do vento contínuo (padrão 1; 0 no vácuo). */
  vento?: number;
  /**
   * Sons curtos do campo (Rancho Alegre), cada um na sua hora: galo ao amanhecer, mugido ao
   * longe de dia, cigarra de tarde e sapo à noite. Multiplicadores da chance (0 ou ausente =
   * nunca). Sempre sons curtos, nunca em laço.
   */
  roca?: { galo?: number; mugido?: number; cigarra?: number; sapo?: number };
  /**
   * Spec 019: o som da tempestade (padrão 'trovao'). 'pipoca' no Doce Reino (a legenda diz
   * "estouro de pipoca"); 'estalo' na Lua, o chiado de rádio da tempestade solar, sem clarão
   * (no vácuo não há trovão).
   */
  trovao?: 'trovao' | 'pipoca' | 'estalo';
  /** Spec 019: sem chiado de chuva (no vácuo a "chuva" é de poeira e não faz barulho). */
  chuvaMuda?: boolean;
  /**
   * Spec 014 (Cidade Grande): sons curtos da rua. A buzininha de brinquedo ao longe (rara: uma
   * a cada 40 a 90 s). Multiplicador da chance (0 ou ausente = nunca).
   */
  cidade?: { buzininha?: number };
}

/** Ajuste do som de um material no tema (mesmo motor de amostras). */
export interface AjusteMaterial {
  /** Multiplica o tom (0.5 = mais grave). */
  tom: number;
  /** Usa a receita de outro material como base (biscoito ~ madeira seca, etc.). */
  base?: GrupoMaterial;
}

export type ContextoMusicalTema =
  | 'dia'
  | 'noite'
  | 'deserto'
  | 'taiga'
  | 'pantano'
  | 'caverna'
  | 'perigo';

export interface PaletaMusicalTema {
  /** Acordes em notas MIDI. */
  acordes: number[][];
  melodia: number[];
  intervalo: number;
  chanceNota: number;
  /** Batida grave (notas MIDI); 0 é pausa (dá ritmo ao tambor). */
  pulso?: number[];
  /** Volume da batida (padrão 1). */
  ganhoPulso?: number;
  gotas?: boolean;
}

/** Povoados no tema: só nomes, pele, jeito de andar e vozes (a mecânica é a mesma). */
export interface PovoadoTema {
  /** Nome do tipo de povoado ("Aldeia das lanternas"). */
  nome: string;
  profissoes: Record<Profissao, string>;
  /** Nomes dos moradores (sorteados por povoado; pelo menos 8). */
  nomes: readonly string[];
  /** Pele do morador de cada profissão: pernas e braços com perna0/perna1, cabeça. */
  moradores: Record<Profissao, PecaCriatura[]>;
  /**
   * Acessório do boneco de cada profissão (o mesmo desenho do jogador, como o chapéu de palha
   * da fazendeira). Sem ele, o morador não usa acessório.
   */
  acessorios?: Partial<Record<Profissao, Acessorio>>;
  /**
   * Spec 014 (T11): a fantasia (017) que a profissão veste, o mesmo desenho do jogador: o
   * pedreiro da cidade usa o capacete e o colete de obra que a criança ganha no canteiro.
   */
  fantasias?: Partial<Record<Profissao, FantasiaVestida>>;
  /**
   * Spec 026: moradores de posto com nome, corpo e roupa próprios (o vocalista, a dançarina,
   * o patinador da Vila Neon), pela chave "povoado:n". Sem a entrada, vale a profissão.
   */
  porMorador?: Record<
    string,
    {
      nome: string;
      genero: 'f' | 'm';
      /** O que ele faz (a etiqueta das trocas): "Vocalista", "Dançarina". */
      titulo?: string;
      /** Sem trocas (o vocalista dá o pôster; a dançarina e o patinador só acenam). */
      semTrocas?: true;
      pecas?: PecaCriatura[];
      acessorio?: Acessorio;
      fantasia?: FantasiaVestida;
      /** O corte de cabelo do boneco (sem ele, sorteado): o liso comprido do vocalista. */
      cabelo?: number;
    }
  >;
  movimento: MovimentoCriatura;
  vozes: VozCriatura & { obrigado: PioCriatura };
  textos: {
    /** Título da tela de trocas ("Trocas"). */
    trocas: string;
    /** Botão de cada troca ("Trocar"). */
    trocar: string;
    /** Aviso quando faltam itens. */
    faltam: string;
    /** Aviso ao chegar perto de um povoado pela primeira vez. */
    chegou: string;
  };
}

export interface TextosTema {
  /** Nome do bloco por id (todos os blocos com nome). */
  blocos: Record<number, string>;
  /** Nome do item por id (itens que não são blocos). */
  itens: Record<string, string>;
  criaturas: Record<TipoCriatura, string>;
  biomas: Record<Bioma, string>;
  estacoes: Record<Estacao, string>;
  climas: Record<TipoClima, string>;
  /** Título do diário ("Diário", "Caderno de bordo"...). */
  diario: string;
  /** Missões por id: título e descrição no tema. */
  missoes: Record<string, { titulo: string; descricao: string }>;
  /** Capítulos do diário (nome original -> nome no tema). */
  capitulos: Record<string, string>;
  /** Frase de boas-vindas ao entrar no mundo (os controles são mostrados à parte). */
  boasVindas: string;
  /** Texto ao desmaiar e ao renascer. */
  morte: string;
  /** Legendas de sons (acessibilidade). */
  legendas: { trovao: string; criaturaNoturna: string };
}

export interface Tema {
  /** O id do tema; `'base'` só na base (que não se escolhe: `src/temas/base`). */
  id: IdTema | 'base';
  nome: string;
  /** Frase do cartão e do título. */
  lema: string;
  /** Uma linha que vende o tema na criação de mundo (para crianças). */
  convite: string;
  cores: {
    /** Acento da interface (botões em destaque, seleção). */
    acento: string;
    /** Fundo do título (topo, base) e cor do texto do lema. */
    fundoTitulo: [string, string];
    lema: string;
    /** Logo em blocos: topo, meio, base da letra e extrusão. */
    logo: { topo: Rgb; meio: Rgb; base: Rgb; extrusao: Rgb; bruma: Rgb };
  };
  textos: TextosTema;
  /** Pintores de tile que substituem os do tema base (por nome do tile). */
  pintores: Record<string, Pintor>;
  /** Tiles que brilham (glow) neste tema. */
  emissivos: readonly string[];
  /**
   * Opcional: por tile brilhante, quais pixels (x, y de 0 a 15) podem brilhar. Sem
   * máscara, brilha todo pixel saturado do tile.
   */
  mascarasBrilho?: Record<string, (x: number, y: number) => boolean>;
  /** Tiles marcados de propósito como iguais ao tema base. */
  mesmoQueBase?: readonly string[];
  /** Ciclo do dia (8 quadros, h de 0 a 1). */
  quadrosCeu: QuadroCeu[];
  ceu: CeuTema;
  agua: AguaTema;
  bruma: BrumaTema;
  particulas: ParticulasTema;
  climaVisual: ClimaVisualTema;
  /** Modelos (pele) das criaturas: mesmas caixas de colisão, forma e cor do tema. */
  criaturas: Record<TipoCriatura, PecaCriatura[]>;
  movimento: Record<TipoCriatura, MovimentoCriatura>;
  vozes: Record<TipoCriatura, VozCriatura>;
  mundo: EstiloMundo;
  musica: {
    timbre: TimbreMusica;
    /** Semitons somados a todas as notas (troca a "tonalidade" do tema). */
    transporte: number;
    /** Paletas por contexto (notas MIDI); o que faltar usa a do tema base. */
    paletas?: Partial<Record<ContextoMusicalTema, PaletaMusicalTema>>;
  };
  materiais: Partial<Record<GrupoMaterial, AjusteMaterial>>;
  natureza: NaturezaTema;
  /** Povoados (spec 008). Sem esta seção, o tema usa o povoado de reserva da base. */
  povoado?: PovoadoTema;
  /** Aparência sugerida ao criar o mundo (a personalização continua livre). */
  personagem: Partial<Aparencia>;
  /**
   * Opcional: capítulo do diário que guia primeiro (spec 013: o Rancho Alegre começa pela
   * Roça). Sem ele, a ordem de sempre.
   */
  primeiroCapitulo?: string;
  /**
   * Spec 014 (decisão do dono, 12 nov 2026): blocos e itens que só existem neste tema. Os
   * outros temas não geram, não trocam, não mostram no criativo nem nas receitas, e não
   * precisam nomear nem pintar. A regra fica em `src/jogo/exclusivos.ts`.
   */
  exclusivos?: Exclusivos;
}
