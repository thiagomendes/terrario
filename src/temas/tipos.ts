/**
 * Pacote de tema do Terrário. O tema muda aparência, nomes e sons — nunca regras:
 * blocos, itens, criaturas, receitas e biomas têm os mesmos ids em todos os temas.
 *
 * Tudo aqui é dado puro (sem Babylon), para servir também ao worker e aos testes.
 */
import type { Bioma } from '../world/chunk';
import type { TipoCriatura } from '../jogo/criaturas';
import type { GrupoMaterial } from '../audio/materiais';
import type { Aparencia } from '../personagem/aparencia';
import type { Estacao, TipoClima } from '../jogo/clima';

export type IdTema =
  | 'bruma-e-luz'
  | 'planeta-vivo'
  | 'mata-encantada'
  | 'doce-reino'
  | 'era-dos-dinos'
  | 'exploracao-lunar';

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

/** Astros e detalhes do céu (shader do céu). Os padrões reproduzem o Bruma e Luz. */
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

/** Peça de criatura: tamanho [w, h, d], posição do centro (pés na origem, frente +z). */
export interface PecaCriatura {
  t: [number, number, number];
  p: [number, number, number];
  cor: string;
  brilho?: number;
  alfa?: number;
  papel?: 'perna0' | 'perna1' | 'cabeca' | 'cauda';
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
  | 'cristal';

/** Forma da estrutura rara (sempre os mesmos blocos e o mesmo baú; só o desenho muda). */
export type FormaEstrutura = 'ruina' | 'cupula' | 'circulo' | 'arcos' | 'casinha' | 'torre';

/** Como o mundo é montado (só forma; os blocos e as regras são os mesmos). */
export interface EstiloMundo {
  /** Formas de árvore por bioma (sorteadas por posição). */
  arvores: Partial<Record<Bioma, FormaArvore[]>>;
  estrutura: FormaEstrutura;
  /** 0..1: crateras no relevo (Lua). */
  crateras: number;
  /** 0..1: fração de flores e grama alta mantida (1 = todas). */
  flora: number;
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
  /** Bipes de rádio distantes no lugar dos pássaros (Lua). */
  bipes?: boolean;
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
  pulso?: number[];
  gotas?: boolean;
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
  id: IdTema;
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
  /** Tiles marcados de propósito como iguais ao tema base. */
  mesmoQueBase?: readonly string[];
  /** Ciclo do dia (8 quadros, h de 0 a 1). */
  quadrosCeu: QuadroCeu[];
  ceu: CeuTema;
  agua: AguaTema;
  bruma: BrumaTema;
  particulas: ParticulasTema;
  /** Modelos (pele) das criaturas: mesmas caixas de colisão, forma e cor do tema. */
  criaturas: Record<TipoCriatura, PecaCriatura[]>;
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
  /** Aparência sugerida ao criar o mundo (a personalização continua livre). */
  personagem: Partial<Aparencia>;
}
