/**
 * Núcleo: o mundo e as regras do Terrário, sem tela, som nem DOM.
 *
 * Guarda blocos e edições, baús e fornalhas, itens no chão, criaturas e moradores,
 * o inventário e a sobrevivência de cada jogador, o dia, o clima e as estações. Recebe
 * comandos dos clientes, avança em passos fixos (PASSO) e devolve a cada jogador um
 * quadro com o que mudou. Roda no Web Worker do servidor local (spec 009) e no Node do
 * servidor da nuvem (spec 010) com o mesmo código.
 */
import { registrarCatalogo } from '../jogo/catalogo';
import { normalizarAparencia } from '../personagem/aparencia';
import { sanearDadosMundo, sanearDonos } from './saneamento';
import { blocoDe, criarEdicoes, donoNaCelula, empacotar } from '../world/edicoes';
import { Bloco, ehAlvo, luzDoBloco, obterBloco } from '../world/blocks';
import { ALCANCE_REGRAS, alcancaDosOlhos } from '../jogo/alcance';
import {
  podeLevarBicho,
  celulaDoLote,
  ehConteiner,
  outraMetadeDaPorta,
  recusaConteiner,
  recusaColocar,
  recusaQuebrar,
  type MundoDaRegra,
  type RecusaProtecao,
} from '../jogo/permissao';
import { CANTEIRO_BOLO, Protecao, criarProtecaoMundo, replantioDaLavoura } from '../world/protecao';
import {
  celulaDoBolo,
  colunasEditadas,
  ehFossilDoCanto,
  escolherCanto,
} from '../world/cantoMissoes';
import { criarCacheGeracional } from './mundo';
import {
  TAM_X,
  ALTURA,
  TAM_Z,
  alturaTerreno,
  candidatosDoCanto,
  cantoDoMundo,
  cidadeDoMundo,
  vilaDoMundo,
  definirEscolhaDoCanto,
  encontrarNascimento,
  estiloMundo,
  olharDoNascimento,
  pontoDeNascer,
  povoadoNaColuna,
} from '../world/chunk';
import {
  ESPERA_MESMO_BICHO,
  MAX_BAU_BANCA,
  almaMundoVazia,
  conferirBanca,
  conferirObrasFeitas,
  fixar,
  ganhoTemAlgo,
  ganhoVazio,
  juntarResultado,
  abertas,
  missaoDoHud,
  mundoAlmaDoEstilo,
  normalizarAlmaDoMundo,
  progressoObra,
  registrarEvento,
  visitarLugar,
  vistaAlmaMundo,
  type AlmaMundo,
  type ResultadoAlma,
} from '../jogo/alma';
import { AVISO_LIMITE, comeEsse, domaCom, viraCriado } from '../jogo/criacao';
import { TAM_LOTE, definirRegioesSemPovoado, regiaoDoChunk } from '../world/povoado';
import { povoadosPerto } from '../jogo/povoados';
import { LIMITE_CRIADOS } from '../jogo/criacao';
import { abreEFecha, alternado, ehPorta } from '../world/portas';
import { criarConteineres, TAMANHO_BAU } from '../jogo/conteineres';
import { criarMundoDeItens, dropsDoBloco } from '../jogo/drops';
import { criarPopulacao } from '../jogo/populacao';
import { corpoNaRua, criarTransito, type PessoaNaRua } from '../jogo/transito';
import { arred } from '../jogo/veiculos';
import { criarVila, FENO, type VilaNucleo, type VilaVista } from './vila';
import {
  ATRASO_RESPOSTA,
  INTERVALO_GESTO_NUCLEO,
  MORADORES_QUE_RESPONDEM,
  RAIO_RESPOSTA_MORADOR,
  RAIO_VER_GESTO,
  moradorResponde,
  type IdGesto,
} from '../personagem/gestos';
import type { EventoCriatura } from '../jogo/criaturas';
import { criarClima, estacaoDoDia, type EstadoClima } from '../jogo/clima';
import { criarSobrevivencia, type Sobrevivencia } from '../jogo/sobrevivencia';
import { criarInventario, type Inventario, type Slot } from '../jogo/inventario';
import { blocoDoItem, obterItem } from '../jogo/itens';
import { lugarNaBarra } from '../jogo/compra';
import { DURACAO_REFEICAO } from '../jogo/refeicao';
import { RECEITAS } from '../jogo/receitas';
import { podeColetar } from '../jogo/ferramentas';
import { TROCAS, fazerTroca, trocasDoMundo } from '../jogo/trocas';
import { COLHER_PEDREIRO, blocoNoMundo } from '../jogo/exclusivos';
import {
  canteirosAbertos,
  celulasPlanejadas,
  chunksDoCanteiro,
  definirObrasFeitas,
  loteDoCanteiro,
  mesmoBlocoDaObra,
  noLoteObra,
  NUM_OBRAS,
  postoDoPedreiro,
  type CelulaPlanejada,
} from '../world/obras';
import { MAX_AJUDANTES_OBRA, type ObraSalva } from './saneamento';
import { COMBATE_PULO, ESPERA_CHAMAR, ESPERA_PULO } from '../jogo/acharAmigo';
import { lugarDoPulo, type MundoDoPulo } from './lugarPulo';
import { comPecas } from '../jogo/caminho';
import { celulaTomadaPelaVila } from '../world/vilaSolidos';
import { roteiroDoMorador, type LugarCidade, type RoteiroCidade } from '../world/ruasCidade';

type DadosFolga = 'casa' | 'loja' | undefined;
import {
  CHANCE_SEMENTE_GRAMA,
  SEGUNDOS_POR_ESTAGIO,
  colheita,
  ehEnxada,
  ehLavoura,
  lavouraDoBloco,
  madura,
  podeArar,
  podePlantar,
  proximoEstagio,
  substituivel,
  velocidadeCrescimento,
} from '../jogo/plantio';
import type { DadosMundo, ModoJogo } from '../jogo/mundos';
import { DURACAO_DIA, HORA_INICIAL, noiteNaHora, normalizarHora } from '../jogo/tempo';
import { criarGerador } from '../audio/variacao';
import { colocacaoBloqueada } from '../player/alvo';
import { preencherKit, SLOTS, KIT_EXTRA } from '../player/hotbar';
import { criarAcessoMundo } from './mundo';
import { contaFecha } from './conta';
import { limparApelido } from '../jogo/apelido';
import { sanear } from './saneamento';
import {
  ESPERA_VOLTA_CASA,
  PASSO,
  type Ambiente,
  type BlocoMudado,
  type Comando,
  type ConteinerVisto,
  type DadosJogador,
  type JogadorVisto,
  type PerfilJogador,
  type CriaturaVista,
  type Depuracao,
  type EventoNucleo,
  type ItemVisto,
  type MudancaSlot,
  type Quadro,
  type SalvoNucleo,
  type Telemetria,
} from './protocolo';

/** Distância máxima para bater, domar e trocar com uma criatura. */
const ALCANCE_CRIATURA = 7;
/** Pés da lavoura que crescem num passo, no máximo (o custo do passo tem teto). */
const ORCAMENTO_LAVOURA = 1024;
/**
 * Segundos que a luz de tocha guardada da lavoura vale. Pôr ou tirar fonte de luz perto já
 * a esquece na hora; isto é só para conferir de vez em quando.
 */
const LUZ_LAVOURA_VALE = 60;
/** Células de luz da lavoura calculadas num passo, no máximo (cada uma lê 2025 blocos). */
const ORCAMENTO_LUZ = 32;
/** Pé da lavoura que ainda cresce: progresso no estágio e quando cresceu por último. */
interface PeLavoura {
  x: number;
  y: number;
  z: number;
  p: number;
  t: number;
}
/** De quanto em quanto tempo cada pé da lavoura cresce (segundos). */
const INTERVALO_LAVOURA = 1;
/** Segundos mínimos entre duas comidas dadas ao mesmo bicho já criado. */
const INTERVALO_COMIDA = 1;
/**
 * Auditoria 017: segundos mínimos entre duas aparências aplicadas do mesmo jogador (cada uma
 * refaz o boneco dele na tela de todos; a que chega antes espera e entra depois).
 */
export const INTERVALO_APARENCIA = 0.5;
/** Quem está até aqui da planta vê o brilhinho e ouve o som quando ela amadurece. */
const ALCANCE_MADURA = 24;
/** Espera entre deitar na cama e acordar (o véu escurece a tela). */
const ESPERA_SONO = 1.5;
/** Quanto tempo quem deitou espera os outros deitarem. */
const ESPERA_TODOS = 10;

export interface OpcoesNucleo {
  semente: number;
  modo: ModoJogo;
  /** Versão do mundo salvo (mundos de antes dos povoados têm 1). */
  versaoMundo?: number;
  dados?: DadosMundo;
  /**
   * Servidor local, um jogador só: aceita do cliente o que ele diz do próprio inventário.
   * O servidor da nuvem desliga isto e confere a conta dos itens em cada transação.
   */
  confiarNoCliente?: boolean;
  /** Aceita os atalhos de teste (`depurar`). Padrão: só quando confia no cliente. */
  depuracao?: boolean;
  /**
   * Spec 013: a criatura da noite deste mundo. Padrão: a do estilo do mundo definido antes de
   * criar o núcleo (o servidor só conhece o estilo; cada sala guarda a sua aqui).
   */
  noite?: 'assusta' | 'mansa';
  /**
   * Spec 016: id do dono do mundo (na nuvem, quem criou a sala; no servidor local, o jogador
   * local). O que ele coloca não entra na tabela de donos: edição sem dono é dele, e assim
   * o "levar para a nuvem" já fica com o dono certo.
   */
  dono?: string;
  /**
   * Apelido do dono do mundo antes de ele entrar (na nuvem, o guardado com a sala): com o
   * dono fora, o aviso diz "Essa parede é da Bia." e não "de um amigo". Passa a limpo aqui.
   */
  apelidoDono?: string;
}

/**
 * Item jogado no chão de propósito: sai para a frente (blocos por segundo). Cai a uns 3
 * blocos, fora do raio que puxa os itens: quem jogou não puxa de volta parado no lugar.
 */
const VELOCIDADE_ARREMESSO = 4.5;

export interface OpcoesConexao {
  /** O que o jogador tinha neste mundo (inventário, vida, renascer, posição). */
  salvo?: DadosJogador;
  perfil?: PerfilJogador;
  /** Pode construir (visitantes só passeiam, se o dono quiser). */
  constroi?: boolean;
}

interface Jogador {
  id: string;
  tel: Telemetria;
  inventario: Inventario;
  sobrevivencia: Sobrevivencia;
  spawn: { x: number; z: number };
  /** Itens nas mãos durante a tela de inventário (cursor e grade de criação). */
  transito: Slot[];
  conteiner: { tipo: 'bau' | 'fornalha'; abertura: number; x: number; y: number; z: number } | null;
  ack: number;
  ackTransacao: number;
  inventarioSujo: boolean;
  /** Uma transação foi recusada: o cursor e a grade voltam junto com o inventário. */
  transitoSujo: boolean;
  /** O primeiro quadro já foi (a sequência do cliente começa nele). */
  iniciado: boolean;
  conteinerSujo: boolean;
  ultimaSobrevivencia: string;
  eventos: EventoNucleo[];
  correcoes: BlocoMudado[];
  /** Acorda quando chega a zero (dormindo). */
  sono: number;
  /** Deitado esperando os outros deitarem (segundos que ainda vale). */
  querDormir: number;
  perfil: PerfilJogador;
  constroi: boolean;
  /** Golpes, colocações e comidas desde que entrou (os amigos veem o movimento). */
  acoes: [number, number, number];
  /** Spec 032: o que está comendo e até quando (o relógio do núcleo); null sem refeição. */
  comendo: { item: string; ate: number } | null;
  /** Passo da última telemetria aceita (para conferir se a posição nova é possível). */
  passoTelemetria: number;
  /** O núcleo mandou o jogador para longe (renascer): a próxima posição pode saltar. */
  saltoPermitido: boolean;
  /** Spec 015: passo do último gesto aceito (limite de repetição). */
  passoGesto: number;
  /** Spec 016: passo da última volta para casa (intervalo entre duas). */
  passoVoltaCasa: number;
  /** Spec 021: passo do último pulo para perto e do último "chamar" (intervalos). */
  passoPulo: number;
  passoChamar: number;
  /** Spec 021: passo do último dano (fora a fome): em combate não há pulo. */
  passoDano: number;
  /** Spec 021: para onde o núcleo levou (a primeira posição depois do pulo vale lá). */
  destinoSalto: { x: number; z: number; ate: number } | null;
  /** Auditoria 017: passo da última aparência aplicada (limite de repetição). */
  passoAparencia: number;
  /** Auditoria 017: a última aparência que chegou dentro da janela (aplicada quando ela fecha). */
  aparenciaPendente: Record<string, unknown> | null;
  /** Spec 016: versão da tabela de donos que este jogador já recebeu (-1: nenhuma). */
  versaoDonos: number;
  /** Spec 014: o pedreiro já veio dizer oi (uma vez por visita). */
  pedreiroViu: boolean;
  /** Spec 014: passo da última colher que o pedreiro deu (uma a cada ESPERA_COLHER s). */
  passoColher: number;
  /** Para as criaturas (o mesmo objeto a cada passo: os ataques dizem em quem foi). */
  corpo: {
    x: number;
    y: number;
    z: number;
    vivo: boolean;
    criativo: boolean;
    /** O que está na mão, do inventário do núcleo (os bichos seguem a comida). */
    mao: string | null;
    /** Spec 016: quem é (o bicho criado só segue quem pode levá-lo). */
    id: string;
  };
}

export type Nucleo = ReturnType<typeof criarNucleo>;

export function criarNucleo(op: OpcoesNucleo) {
  registrarCatalogo();
  const { semente, modo } = op;
  // o salvamento pode vir de qualquer aparelho: o que tem posição fora do mundo sai
  const dados = op.dados ? sanearDadosMundo(op.dados) : undefined;
  const extras = dados?.extras ?? {};
  const confiar = op.confiarNoCliente ?? false;
  const depuracao = op.depuracao ?? confiar;

  const edicoes = criarEdicoes(semente);
  if (dados) edicoes.importar(dados.edicoes);
  // quem colocou cada bloco (fora o dono do mundo): a posição na lista é o índice nas edições
  edicoes.donos.importar(sanearDonos(extras['donos']));
  const donoDoMundo = op.dono ?? null;

  // mundo de antes dos povoados: na primeira carga depois deles, congela a lista de
  // regiões sem povoado (as editadas e as em volta de onde o jogador está) e salva
  // com o mundo; nas cargas seguintes vale a lista salva, então nada some nem aparece
  const salvoPovoados = extras['povoados'] as { semPovoado?: string[] } | undefined;
  const semPovoado: string[] = salvoPovoados?.semPovoado
    ? [...salvoPovoados.semPovoado]
    : (op.versaoMundo ?? 1) < 2 && dados
      ? (() => {
          const r = new Set<string>();
          for (const k of Object.keys(dados.edicoes)) {
            const [cx, cz] = k.split(',').map(Number);
            r.add(regiaoDoChunk(cx, cz));
          }
          const j = dados.jogador;
          const pontos = j ? [[j.x, j.z]] : [];
          const n = encontrarNascimento(semente);
          pontos.push([n.x, n.z]);
          for (const [x, z] of pontos) {
            const rx = Math.floor(x / 128);
            const rz = Math.floor(z / 128);
            for (let dx = -1; dx <= 1; dx++)
              for (let dz = -1; dz <= 1; dz++) r.add(`${rx + dx},${rz + dz}`);
          }
          return [...r];
        })()
      : [];
  definirRegioesSemPovoado(semPovoado);

  /**
   * Spec 031: qual lugar do canto das missões vale (Era dos Dinos e Doce Reino). Gravado com o
   * mundo; sem a gravação (mundo novo, ou salvo antes do canto), o primeiro lugar bom sem
   * nenhuma edição na caixa dele: o canto nunca cobre o que alguém construiu ou mexeu.
   */
  const candidatosCanto = candidatosDoCanto(semente);
  const salvoCanto = extras['canto'] as { escolha?: unknown } | undefined;
  const escolhaCanto =
    typeof salvoCanto?.escolha === 'number' &&
    Number.isInteger(salvoCanto.escolha) &&
    salvoCanto.escolha >= -1 &&
    salvoCanto.escolha < candidatosCanto.length
      ? salvoCanto.escolha
      : candidatosCanto.length
        ? (() => {
            const editadas = colunasEditadas(dados?.edicoes ?? {});
            return escolherCanto(candidatosCanto, (x, z) => editadas.has(`${x},${z}`));
          })()
        : 0;
  definirEscolhaDoCanto(escolhaCanto);

  /**
   * Spec 014 (T05): o canteiro de obras da Cidade Grande. Por obra: os ajudantes (quem pôs
   * pelo menos um bloco), as células cheias e se terminou. As feitas mudam a geração (viram
   * parte da cidade), então entram na geração antes de qualquer chunk deste mundo.
   */
  const cidade = cidadeDoMundo(semente);
  const obras = new Map<
    number,
    { ajudantes: Map<string, string>; cheias: number[]; feita: boolean }
  >();
  if (cidade) {
    const salvas = (extras['obras'] ?? {}) as Record<string, ObraSalva>;
    for (const [k, o] of Object.entries(salvas))
      obras.set(Number(k), {
        ajudantes: new Map(o.ajudantes),
        cheias: [...o.cheias],
        feita: o.feita === true,
      });
  }
  const feitasDoMundo = () => [...obras].filter(([, o]) => o.feita).map(([n]) => n);
  definirObrasFeitas(feitasDoMundo());

  // criaturas só nascem e pisam onde algum jogador tem o terreno carregado (como antes)
  const mundo = criarAcessoMundo(semente, edicoes, (cx, cz) => {
    for (const o of jogadores.values()) {
      const r = o.tel.raio ?? 3;
      if (
        Math.abs(cx - Math.floor(o.tel.x / 16)) <= r &&
        Math.abs(cz - Math.floor(o.tel.z / 16)) <= r
      )
        return true;
    }
    return false;
  });
  const conteineres = criarConteineres(extras['conteineres'], semente);
  /**
   * Spec 016: o que o mundo construiu (calculado da geração, como no cliente) e a regra de
   * quem mexe em quê, a mesma que o cliente usa para prever.
   */
  const protecao = criarProtecaoMundo(semente);
  /** Apelido do dono do mundo (ele não entra na tabela de donos; o aviso diz o nome dele). */
  let apelidoDoMundo: string | undefined = limparApelido(String(op.apelidoDono ?? '')) || undefined;
  const regra: MundoDaRegra = {
    protecao,
    bloco: (x, y, z) => mundo.bloco(x, y, z),
    gerado: (x, y, z) => mundo.gerado(x, y, z),
    dono: (x, y, z) => donoNaCelula(edicoes, x, y, z, donoDoMundo),
    apelido: (id) => apelidoDe(id),
    donoDoMundo,
  };
  function apelidoDe(id: string): string | undefined {
    return (
      jogadores.get(id)?.perfil.apelido ??
      (id === donoDoMundo ? apelidoDoMundo : edicoes.donos.apelido(id))
    );
  }
  const rngDrops = criarGerador(911);
  // sorteios do plantio (colheita, semente da grama alta): gerador próprio, para não mexer
  // na sequência dos drops de sempre (a paridade gravada)
  const rngPlantio = criarGerador(semente + 1313);
  const mundoItens = criarMundoDeItens((x, y, z) => {
    const b = mundo.bloco(x, y, z);
    return b !== Bloco.AR && !!obterBloco(b)?.solido;
  });
  mundoItens.carregar(extras['itensSoltos']);
  const noiteDoMundo = op.noite ?? estiloMundo().noite ?? 'assusta';
  const populacao = criarPopulacao(criarGerador(semente + 55), extras['criaturas'], {
    noite: noiteDoMundo,
    donoDoMundo,
  });
  // sorteios da criação (onde o ovo cai): gerador próprio, longe dos de sempre
  const rngCriacao = criarGerador(semente + 1717);
  const clima = criarClima(criarGerador(semente + 31), extras['clima']);
  let dia = Number(extras['dia']) || 0;
  let hora = dados && dados.hora >= 0 ? dados.hora : HORA_INICIAL;
  let horaAnterior = hora;
  let pausado = false;
  let n = 0;

  /** Blocos que mudaram desde o último quadro (para todos). */
  let blocosMudados: BlocoMudado[] = [];
  /** Eventos para todos (relâmpago, sons de criaturas). */
  let eventosGerais: EventoNucleo[] = [];
  /**
   * Spec 014 (T13): os carrinhos e ônibus da cidade. Não são gravados: ao abrir o mundo (ou a
   * sala acordar), cada um começa onde o relógio do mundo dá.
   */
  const transito = cidade
    ? criarTransito({
        plano: cidade,
        relogioMundo: (dia + hora) * DURACAO_DIA,
        obraFeita: (n) => !!obras.get(n)?.feita,
      })
    : null;
  // os bichos não andam para dentro dos veículos (a mesma conta no servidor e no modo local)
  if (transito)
    mundo.criaturas.folgaVeiculo = (x, y, z, yaw, tipo) =>
      transito.folga({ x, y, z, crianca: false, corpo: corpoNaRua(tipo, yaw) });
  /** Planos de veículo que mudaram neste passo (vão a todos no quadro). */
  let veiculosMudados: ReturnType<NonNullable<typeof transito>['tirarMudados']> = [];
  const jogadores = new Map<string, Jogador>();

  // ------------------------------------------------------------ alma (spec 023)
  /**
   * O mundo das missões (Cidade Grande ou Rancho Alegre; null nos outros temas, por enquanto).
   * O núcleo decide todo ganho; cada jogador tem aqui as missões, o progresso, os lugares, o
   * baú da banca e o livro-razão deste mundo (`extras.alma[id]`: cada mundo é uma história).
   * Pedido do dono: o nível e as habilidades sobem brincando em **qualquer** mundo, então as
   * ações soltas (pôr bloco, plantar, colher, dar comida, fazer receita, lugar novo) dão XP e
   * pontos em todo tema, com os mesmos valores; missões e banca, só nos dois.
   */
  const mundoAlma = mundoAlmaDoEstilo(estiloMundo());
  const plantaDoMundo = estiloMundo().povoado?.planta ?? 'povoado';
  const almas = new Map<string, AlmaMundo>(
    Object.entries(normalizarAlmaDoMundo(extras['alma'], mundoAlma)),
  );
  /** O que vai no evento `alma` de cada jogador no próximo quadro. */
  const almaPendente = new Map<string, { r: ResultadoAlma; quadro: boolean }>();
  /** Passo em que cada jogador alimentou cada bicho por último (o mesmo bicho: 1 minuto). */
  const almaBichos = new Map<string, number>();
  /**
   * Ovos postos pelas galinhas e comida posta na saída da fornalha: pegar de novo o ovo que
   * se jogou no chão (ou tirar a pipoca que se pôs na saída) não conta outra vez.
   */
  let ovosPostos = 0;
  const postoNaSaida = new Map<string, number>();
  function almaDe(id: string): AlmaMundo {
    let e = almas.get(id);
    if (!e) {
      e = almaMundoVazia();
      almas.set(id, e);
    }
    return e;
  }
  function ganharAlma(id: string, r: ResultadoAlma, quadro = false): void {
    if (!jogadores.has(id)) return;
    const p = almaPendente.get(id);
    if (p) {
      juntarResultado(p.r, r);
      p.quadro ||= quadro || r.mudouLista;
    } else almaPendente.set(id, { r, quadro: quadro || r.mudouLista });
  }
  /**
   * Uma ação deste jogador que conta (as chaves do diário). `chaveGanho`: o ganho é o de outra
   * chave (a receita de comida conta a missão pela receita e ganha como 'cozinhou').
   */
  function almaEvento(id: string, chave: string, qtd = 1, chaveGanho = chave): void {
    if (!jogadores.has(id)) return;
    ganharAlma(id, registrarEvento(almaDe(id), mundoAlma, chave, qtd, chaveGanho));
  }
  /** O quadro de missões inteiro vai no próximo evento (entrou, fixou, o baú mudou). */
  function pedirQuadroAlma(id: string): void {
    if (!mundoAlma) return;
    ganharAlma(id, { ganho: ganhoVazio(), missoes: [], mudouLista: false }, true);
  }
  const totalObra = (k: number) => (cidade ? celulasPlanejadas(cidade, k).length : 0);
  /** A obra como o cartão mostra (células cheias e o total). */
  const vistaObra = (k: number) => {
    const t = totalObra(k);
    if (!t) return null;
    const o = obras.get(k);
    return { cheias: o?.feita ? t : (o?.cheias.length ?? 0), total: t };
  };
  /** As missões de obra deste jogador diante das obras feitas (ajudou: ganha; senão passa). */
  function almaObrasFeitas(id: string): void {
    const e = almaDe(id);
    if (!mundoAlma || !cidade) return;
    ganharAlma(
      id,
      conferirObrasFeitas(
        e,
        mundoAlma,
        (k) => !!obras.get(k)?.feita,
        (k) => !!obras.get(k)?.ajudantes.has(id),
        totalObra,
      ),
    );
  }
  /** O uso do lote em (x, z): da cidade, ou do sítio ('sitio:curral'...). */
  function lugarEm(x: number, z: number): string | null {
    if (cidade) {
      const l = cidade.lotes.find(
        (q) => x >= q.x0 && x < q.x0 + q.largura && z >= q.z0 && z < q.z0 + q.profundidade,
      );
      return l?.uso ?? null;
    }
    const p = povoadoNaColuna(Math.floor(x), Math.floor(z), semente);
    const l = p?.lotes.find(
      (q) => x >= q.x0 && x < q.x0 + TAM_LOTE && z >= q.z0 && z < q.z0 + TAM_LOTE,
    );
    return l?.uso ? `${plantaDoMundo}:${l.uso}` : null;
  }
  /** Compras na banca de cada jogador nesta sessão da sala (o núcleo aberto) e a última. */
  const bancaSessao = new Map<string, { compras: number; passo: number }>();

  /** Onde a galinha comprada vai morar: o miolo do galinheiro mais perto (ou do lado). */
  function lugarDaGalinha(j: Jogador): [number, number, number] {
    let melhor: [number, number, number] | null = null;
    let dMelhor = Infinity;
    for (const p of povoadosPerto(j.tel.x, j.tel.z, 160, semente))
      for (const c of p.currais ?? []) {
        if (c.bicho !== 'coelho') continue;
        const x = (c.x0 + c.x1) / 2 + 0.5;
        const z = (c.z0 + c.z1) / 2 + 0.5;
        const d = Math.hypot(x - j.tel.x, z - j.tel.z);
        if (d < dMelhor) {
          dMelhor = d;
          melhor = [x, p.h + 1, z];
        }
      }
    // galinheiro longe (fora do que está carregado): ela vem para perto da criança
    if (melhor && dMelhor <= 48) return melhor;
    return [
      j.tel.x + Math.sin(j.tel.yaw) * 1.5,
      j.tel.y + 0.5,
      j.tel.z + Math.cos(j.tel.yaw) * 1.5,
    ];
  }

  /**
   * Spec 023 (T04): a banca do mundo. Só item do tema, saldo do aparelho que cubra o preço, 1
   * compra a cada 2 s e 30 por sessão; o pacote vai de verdade para a mochila (o que não cabe
   * espera no baú da banca); a galinha nasce criada no galinheiro mais perto. Só depois da
   * entrega o aparelho desconta (almaCompra); o gasto fica no livro-razão.
   */
  function comprarBanca(j: Jogador, c: Extract<Comando, { t: 'comprarBanca' }>): void {
    const recusar = (motivo: Extract<EventoNucleo, { e: 'almaCompraRecusada' }>['motivo']) => {
      j.eventos.push({ e: 'almaCompraRecusada', item: String(c.item).slice(0, 32), motivo });
    };
    const e = almaDe(j.id);
    if (!mundoAlma || j.sobrevivencia.estado.morto) return recusar('tema');
    const ses = bancaSessao.get(j.id) ?? { compras: 0, passo: -Infinity };
    const r = conferirBanca(mundoAlma, c.item, c.saldo, ses.compras, (n - ses.passo) * PASSO);
    if (!r.ok) return recusar(r.motivo);
    const it = r.item;
    let guardado = 0;
    if (it.item) {
      // cabe? o que não couber vai para o baú da banca (que também tem fim)
      const prova = criarInventario();
      prova.carregar(j.inventario.salvar());
      const sobra = prova.adicionar(it.item, it.qtd);
      const noBau = e.bau.find((p) => p.item === it.item);
      if (sobra > 0 && !noBau && e.bau.length >= MAX_BAU_BANCA) return recusar('cheio');
      guardado = j.inventario.adicionar(it.item, it.qtd);
      if (guardado > 0) {
        if (noBau) noBau.qtd += guardado;
        else e.bau.push({ item: it.item, qtd: guardado });
        pedirQuadroAlma(j.id);
      }
    } else {
      // a galinha: já criada, de quem comprou (o limite de bichos do mundo vale)
      if (populacao.criados >= LIMITE_CRIADOS) return recusar('galinha');
      const [x, y, z] = lugarDaGalinha(j);
      const g = populacao.adicionar('coelho', x, y, z);
      populacao.criar(g, j.id === donoDoMundo ? undefined : j.id);
    }
    bancaSessao.set(j.id, { compras: ses.compras + 1, passo: n });
    e.livro.gasto += it.preco;
    e.livro.compras[it.id] = (e.livro.compras[it.id] ?? 0) + 1;
    j.eventos.push({
      e: 'almaCompra',
      item: it.id,
      preco: it.preco,
      ...(guardado ? { guardado } : {}),
    });
  }

  /** O baú da banca entrega sozinho o que agora cabe na mochila (a cada segundo). */
  function entregarBauBanca(): void {
    for (const j of jogadores.values()) {
      const e = almas.get(j.id);
      if (!e?.bau.length || j.sobrevivencia.estado.morto) continue;
      let mudou = false;
      for (const p of e.bau) {
        const resto = j.inventario.adicionar(p.item, p.qtd);
        if (resto < p.qtd) {
          j.eventos.push({ e: 'coletou', item: p.item, qtd: p.qtd - resto });
          p.qtd = resto;
          mudou = true;
        }
      }
      if (!mudou) continue;
      e.bau = e.bau.filter((p) => p.qtd > 0);
      pedirQuadroAlma(j.id);
    }
  }

  // ------------------------------------------------------------ canto das missões (spec 031)
  /**
   * O canto das missões da Era dos Dinos e do Doce Reino (perto do nascer, da geração). O que é
   * de cada missão volta quando ela é escolhida de novo (nunca sozinho, com o tempo): os 3
   * ovinhos do ninho (d1), os dois bichos do pasto ainda sem comida (d2, e2), as rochas de osso
   * (d3) e o bolo vazio (e1).
   */
  const canto = cantoDoMundo(semente);
  // os bichos não entram na caixa de areia (nem nascem nela): a cerquinha vale para eles
  // (a mesma conta dos veículos da cidade: o passo que entra na caixa não é dado)
  if (canto?.caixa && !transito) {
    const k = canto.caixa;
    const [ax0, az0, ax1, az1] = [k.x0 - 1, k.z0 - 1, k.x1 + 2, k.z1 + 2];
    mundo.criaturas.folgaVeiculo = (x, _y, z) => {
      const dx = Math.max(ax0 - x, 0, x - ax1);
      const dz = Math.max(az0 - z, 0, z - az1);
      const fora = Math.hypot(dx, dz);
      // dentro: negativo (quanto mais para o meio, mais negativo), para poder sair
      return fora > 0 ? fora - 0.45 : -Math.min(x - ax0, ax1 - x, z - az0, az1 - z) - 0.45;
    };
    const sup = mundo.criaturas.superficie;
    mundo.criaturas.superficie = (x, z) =>
      x >= ax0 - 1 && x <= ax1 && z >= az0 - 1 && z <= az1 ? null : sup(x, z);
  }
  /** Quem pôs bloco no bolo desta vez (ganha quando ele fica pronto). */
  const ajudantesBolo = new Set<string>();
  /** Os bichos do pasto que o canto chamou (o guia da criança vai até eles). */
  const bichosDoPasto = new Set<number>();
  /** Missões do canto que contam para o jogador agora (abertas: as duas da vez, ou o bis). */
  const missaoAberta = (id: string, missao: string) =>
    !!mundoAlma && abertas(almaDe(id), mundoAlma).some((m) => m.id === missao);
  const MARCA_OVO = 'ninho:';
  /** Perto do bicho (blocos): a comida aparece na mão. */
  const PERTO_DO_BICHO = 3.2;
  function prepararCanto(j: Jogador, missao: string | null): void {
    if (!canto || !mundoAlma || !missao || !missaoAberta(j.id, missao)) return;
    if (missao === 'd1')
      canto.ovos.forEach(([x, y, z], i) => {
        const marca = `${MARCA_OVO}${i}`;
        if (mundoItens.itens.some((it) => it.marca === marca)) return;
        mundoItens.pousar('ovo', 1, x, y + 0.13, z, marca);
      });
    else if (missao === 'd2' || missao === 'e2') prepararPasto();
    else if (missao === 'd3') {
      for (const [x, y, z] of canto.fosseis)
        if (mundo.bloco(x, y, z) !== Bloco.MINERIO_FERRO) editar(x, y, z, Bloco.MINERIO_FERRO);
    } else if (missao === 'e1' && canto.bolo.every((c) => mundo.bloco(c.x, c.y, c.z) === c.bloco)) {
      // o bolo de antes já foi festejado: a mesa fica limpa para fazer outro
      for (const c of canto.bolo) editar(c.x, c.y, c.z, Bloco.AR);
      ajudantesBolo.clear();
    }
  }
  /** Dois bichos do pasto ainda sem comida (os que faltarem nascem ali, sem dono). */
  function prepararPasto(): void {
    if (!canto) return;
    const [px, py, pz] = canto.pasto;
    for (const id of [...bichosDoPasto]) {
      const c = criatura(id);
      if (!c || c.estado === 'morrendo' || Math.hypot(c.x - px, c.z - pz) > 24)
        bichosDoPasto.delete(id);
    }
    const semComida = populacao.lista.filter(
      (c) =>
        c.tipo === 'cervo' &&
        !c.criado &&
        c.estado !== 'morrendo' &&
        Math.hypot(c.x - px, c.z - pz) < 10,
    );
    for (const c of semComida) if (bichosDoPasto.size < 2) bichosDoPasto.add(c.id);
    for (let k = semComida.length; k < 2; k++) {
      const a = canto.yaw + (k ? 1.4 : -1.4);
      const c = populacao.adicionar(
        'cervo',
        px + Math.sin(a) * 1.6,
        py + 0.2,
        pz + Math.cos(a) * 1.6,
      );
      bichosDoPasto.add(c.id);
    }
    // os do pasto moram no pasto (passeiam ali perto, não somem pelo mundo)
    for (const id of bichosDoPasto) {
      const c = criatura(id);
      if (c && !c.criado) c.casa = [px, pz];
    }
  }
  /**
   * A comida na mão ao chegar perto de um bicho do pasto ainda sem comida (d2, e2): o capim
   * dourado ou o broto-doce (o mesmo item, o trigo), como os blocos que a obra dá. Só para quem
   * tem a missão no selinho.
   */
  function cuidarDoPasto(): void {
    if (!canto || !mundoAlma) return;
    for (const j of jogadores.values()) {
      if (j.sobrevivencia.estado.morto) continue;
      const m = missaoDoHud(almaDe(j.id), mundoAlma);
      if (m?.id !== 'd2' && m?.id !== 'e2') continue;
      if (j.inventario.contar('trigo') > 0) continue;
      const perto = populacao.lista.some(
        (c) =>
          c.tipo === 'cervo' &&
          !c.criado &&
          c.estado !== 'morrendo' &&
          Math.hypot(c.x - j.tel.x, c.z - j.tel.z) <= PERTO_DO_BICHO,
      );
      if (!perto) continue;
      // na mão: a casinha de agora, se vazia; senão a primeira vazia da barra
      const slots = j.inventario.slots;
      let slot = slots[j.tel.slot] ? -1 : j.tel.slot;
      for (let i = 0; i < 9 && slot < 0; i++) if (!slots[i]) slot = i;
      if (slot >= 0) j.inventario.definir(slot, { item: 'trigo', qtd: 2 });
      else if (j.inventario.adicionar('trigo', 2) >= 2) continue;
      j.eventos.push({ e: 'coletou', item: 'trigo', qtd: 2 });
    }
  }
  /**
   * O bolo ganhou um bloco: cada camada pronta (o chocolate, o chantilly, a vela) acende uma
   * bolinha da e1 de todos que ajudaram nesta rodada; a vela fecha a missão.
   */
  function encheuBolo(quem: string): void {
    if (!canto || !mundoAlma) return;
    ajudantesBolo.add(quem);
    almaEvento(quem, 'bolo:bloco');
    let prontas = 0;
    for (let c = 0; c < 3; c++)
      if (
        canto.bolo
          .filter((q) => q.camada === c)
          .every((q) => mundo.bloco(q.x, q.y, q.z) === q.bloco)
      )
        prontas = c + 1;
      else break;
    for (const id of ajudantesBolo) {
      if (!missaoAberta(id, 'e1')) continue;
      const falta = prontas - (almaDe(id).progresso['e1'] ?? 0);
      if (falta > 0) almaEvento(id, 'bolo:camada', falta);
    }
    if (prontas >= 3) ajudantesBolo.clear();
  }

  // ------------------------------------------------------------ a Vila Neon (spec 026)
  /** O bairro da Vila Neon (o show, os estojos, as lhamas e os moradores com posto). */
  const planoVila = vilaDoMundo(semente);
  /** Quem precisa do estado da vila no próximo quadro (todos, quando muda). */
  let vilaSuja = true;
  const jogadorDaVila = (o: Jogador) => ({
    id: o.id,
    x: o.tel.x,
    y: o.tel.y,
    z: o.tel.z,
    morto: o.sobrevivencia.estado.morto,
    olhar: o.tel.yaw,
    patins: (o.perfil.aparencia as { patins?: unknown } | undefined)?.patins === true,
    skate: (o.perfil.aparencia as { skate?: unknown } | undefined)?.skate === true,
    missao: mundoAlma ? (missaoDoHud(almaDe(o.id), mundoAlma)?.id ?? null) : null,
    aberta: (m: string) => missaoAberta(o.id, m),
    contar: (item: string) => o.inventario.contar(item),
    darNaMao(item: string, qtd: number) {
      const slots = o.inventario.slots;
      let slot = slots[o.tel.slot] ? -1 : o.tel.slot;
      for (let i = 0; i < 9 && slot < 0; i++) if (!slots[i]) slot = i;
      if (slot >= 0) o.inventario.definir(slot, { item, qtd });
      else if (o.inventario.adicionar(item, qtd) >= qtd) return;
      o.eventos.push({ e: 'coletou', item, qtd });
    },
    dar(item: string, qtd: number) {
      const resto = o.inventario.adicionar(item, qtd);
      if (resto < qtd) o.eventos.push({ e: 'coletou', item, qtd: qtd - resto });
      return resto;
    },
    // spec 026 (parte 2): desceu de um brinquedo do parque (o lugar seguinte vale, mesmo longe)
    soltar() {
      o.saltoPermitido = true;
    },
    // spec 026 (parte 2, etapa B): o feno no cocho e a pelúcia para a vovó saem da mochila; o
    // carimbo do bilhete e os passos da prenda são "lugares" das missões de lugares
    tirar(item: string, qtd: number) {
      const n = Math.min(Math.floor(qtd), o.inventario.contar(item));
      return n > 0 && o.inventario.consumir(item, n) ? n : 0;
    },
    visitar(uso: string) {
      ganharAlma(o.id, visitarLugar(almaDe(o.id), mundoAlma, uso));
    },
    visitou: (uso: string) => almaDe(o.id).lugares.includes(uso),
    // spec 032: o lanche comprado entra na barrinha (a pilha dele, a mão vazia ou um espaço vazio)
    cabeNaBarra: (item: string) =>
      lugarNaBarra(o.inventario.slots, item, o.tel.slot, obterItem(item)?.pilha) >= 0,
    porNaBarra(item: string) {
      const i = lugarNaBarra(o.inventario.slots, item, o.tel.slot, obterItem(item)?.pilha);
      if (i < 0) return false;
      const s = o.inventario.obter(i);
      o.inventario.definir(i, { item, qtd: (s?.item === item ? s.qtd : 0) + 1 });
      o.eventos.push({ e: 'coletou', item, qtd: 1 });
      return true;
    },
  });
  const vila: VilaNucleo | null = planoVila
    ? criarVila({
        plano: planoVila,
        salvo: extras['vila'],
        agora: () => n * PASSO,
        hora: () => hora,
        dia: () => dia,
        jogadores: () => [...jogadores.values()].map(jogadorDaVila),
        jogador: (id) => {
          const o = jogadores.get(id);
          return o ? jogadorDaVila(o) : undefined;
        },
        adicionar: (tipo, x, y, z) => populacao.adicionar(tipo, x, y, z),
        criaturas: () => populacao.lista,
        carregado: (x, z) => mundo.criaturas.superficie(Math.floor(x), Math.floor(z)) !== null,
        evento: (id, chave, qtd) => almaEvento(id, chave, qtd),
        espalhar: (e) => eventosGerais.push(e),
        sujar: () => {
          vilaSuja = true;
        },
      })
    : null;
  void FENO;

  /** Lugares novos (conferidos no passo, a cada meio segundo). */
  function cuidarDosLugares(): void {
    for (const j of jogadores.values()) {
      if (j.sobrevivencia.estado.morto) continue;
      const uso = lugarEm(j.tel.x, j.tel.z);
      if (!uso) continue;
      const e = almaDe(j.id);
      if (e.lugares.includes(uso)) continue;
      ganharAlma(j.id, visitarLugar(e, mundoAlma, uso));
    }
  }

  /**
   * Lavoura que ainda cresce: célula → progresso no estágio atual (segundos na velocidade 1).
   * Sai das edições ao abrir o mundo; o progresso vem de `extras.lavoura` (faltando, 0).
   */
  const lavoura = new Map<string, PeLavoura>();
  /** Relógio da lavoura (segundos): cada pé guarda quando cresceu por último. */
  let relogioLavoura = 0;
  /** Onde parou a volta pela lavoura (cada passo cresce uma parte dela). */
  let cursorLavoura: Iterator<[string, PeLavoura]> | null = null;
  /**
   * Luz de cada célula 2x2x2 da lavoura (só da lavoura; as criaturas têm a delas). Só muda
   * quando entra ou sai uma fonte de luz perto, e aí a célula é esquecida na hora.
   */
  const luzLavoura = criarCacheGeracional<{ v: number; t: number }>(16384);
  /** Células de luz calculadas neste passo (têm teto, como os pés). */
  let luzesNoPasso = 0;
  {
    const salvo = extras['lavoura'];
    const progresso =
      salvo && typeof salvo === 'object' && !Array.isArray(salvo)
        ? (salvo as Record<string, unknown>)
        : {};
    const exportadas = edicoes.exportar();
    for (const k of Object.keys(exportadas)) {
      const [cx, cz] = k.split(',').map(Number);
      for (const [i, v] of exportadas[k]) {
        const b = blocoDe(v);
        if (!ehLavoura(b) || madura(b)) continue;
        const x = cx * TAM_X + (i % TAM_X);
        const z = cz * TAM_Z + (Math.floor(i / TAM_X) % TAM_Z);
        const y = Math.floor(i / (TAM_X * TAM_Z));
        const chave = `${x},${y},${z}`;
        const p = Number(progresso[chave]);
        lavoura.set(chave, {
          x,
          y,
          z,
          t: 0,
          p: Number.isFinite(p) && p > 0 ? Math.min(p, SEGUNDOS_POR_ESTAGIO) : 0,
        });
      }
    }
  }

  // jogador do mundo salvo (o servidor local tem um só)
  // quem chega pela primeira vez nunca nasce em cima de uma árvore
  const nascimento = pontoDeNascer(semente);
  const posSalva = dados?.jogador;
  const spawnSalvo = extras['spawn'] as { x: number; z: number } | undefined;

  /**
   * Mundo novo começa com a barra vazia, nos dois modos (pedido do dono): o jogador escolhe o
   * que pôr em cada espaço — no criativo pelo catálogo do inventário, na sobrevivência com o
   * que for coletando.
   */
  function novoInventario(salvo: unknown): Inventario {
    const inv = criarInventario();
    if (salvo) inv.carregar(salvo);
    return inv;
  }
  let perfisSujos = false;

  /**
   * Põe um jogador no mundo. Sem opções (servidor local): o jogador do mundo salvo.
   * Com opções (nuvem): os dados dele neste mundo, ou um jogador novo no nascimento.
   */
  function conectar(id: string, oc?: OpcoesConexao): void {
    if (jogadores.has(id)) return;
    const legado = !oc;
    const pos = legado ? posSalva : oc.salvo?.pos;
    // o nascimento já é o centro de um bloco
    const x = pos?.x ?? nascimento.x;
    const z = pos?.z ?? nascimento.z;
    // quem chega pela primeira vez fica em cima do terreno do nascimento
    const y0 = pos?.y ?? alturaTerreno(Math.floor(x), Math.floor(z), semente) + 1;
    const j: Jogador = {
      id,
      tel: {
        x,
        y: y0,
        z,
        // mundo de sítio: quem chega pela primeira vez olha para o sítio mais perto
        yaw: pos?.yaw ?? olharDoNascimento(semente) ?? 0,
        pitch: pos?.pitch ?? 0,
        olhos: y0 + 1.62,
        noChao: false,
        voando: false,
        vel: 0,
        correndo: false,
        submerso: false,
        quedas: [],
        pulos: 0,
        golpes: 0,
        slot: 0,
      },
      inventario: novoInventario(legado ? extras['inventario'] : oc.salvo?.inventario),
      sobrevivencia: criarSobrevivencia(legado ? extras['sobrevivencia'] : oc.salvo?.sobrevivencia),
      spawn: (legado ? spawnSalvo : oc.salvo?.spawn) ?? { x, z },
      transito: Array.from({ length: 10 }, () => null),
      conteiner: null,
      ack: 0,
      ackTransacao: 0,
      inventarioSujo: true,
      transitoSujo: false,
      iniciado: false,
      conteinerSujo: false,
      ultimaSobrevivencia: '',
      eventos: [],
      correcoes: [],
      sono: 0,
      querDormir: 0,
      acoes: [0, 0, 0],
      comendo: null,
      passoTelemetria: n,
      saltoPermitido: true,
      passoGesto: -Infinity,
      passoVoltaCasa: -Infinity,
      passoPulo: -Infinity,
      passoChamar: -Infinity,
      passoDano: -Infinity,
      destinoSalto: null,
      passoAparencia: -Infinity,
      aparenciaPendente: null,
      versaoDonos: -1,
      pedreiroViu: false,
      passoColher: -Infinity,
      perfil: oc?.perfil ?? { apelido: 'Jogador', aparencia: {} },
      constroi: oc?.constroi ?? true,
      corpo: { x, y: y0, z, vivo: true, criativo: modo === 'criativo', mao: null, id },
    };
    j.inventario.ouvir(() => {
      j.inventarioSujo = true;
    });
    j.sobrevivencia.ouvir((ev) => {
      if (ev.tipo === 'dano') {
        j.eventos.push({ e: 'dano', causa: ev.causa, qtd: ev.qtd });
        // spec 021: em combate (ou caindo, afogando) o pulo espera; a fome não conta
        if (ev.causa !== 'fome') j.passoDano = n;
      } else if (ev.tipo === 'morte') {
        // espalha o inventário no lugar da morte
        for (let i = 0; i < j.inventario.slots.length; i++) {
          const p = j.inventario.obter(i);
          if (!p) continue;
          mundoItens.soltar(p.item, p.qtd, j.tel.x, j.tel.y + 1, j.tel.z, rngDrops, p.dur);
          j.inventario.definir(i, null);
        }
        j.eventos.push({ e: 'morte', causa: ev.causa });
      }
    });
    for (const o of jogadores.values())
      o.eventos.push({ e: 'entrou', id, apelido: j.perfil.apelido });
    // o apelido guardado com os blocos dele segue o atual (o aviso diz o nome de agora)
    edicoes.donos.renomear(id, j.perfil.apelido);
    if (id === donoDoMundo) apelidoDoMundo = j.perfil.apelido;
    jogadores.set(id, j);
    perfisSujos = true;
    // spec 023: o quadro de missões vai no primeiro quadro; a obra feita enquanto ele estava
    // fora dá o prêmio a quem ajudou (ou passa a missão, para quem não ajudou)
    if (mundoAlma) {
      almaObrasFeitas(id);
      pedirQuadroAlma(id);
      // spec 031: a missão do canto que ficou no selinho (o ovinho do ninho esperando)
      prepararCanto(j, missaoDoHud(almaDe(id), mundoAlma)?.id ?? null);
    }
  }

  /** O que é do jogador neste mundo (o que estava nas mãos volta à mochila). */
  function dadosJogador(id: string): DadosJogador | null {
    const j = jogadores.get(id);
    if (!j) return null;
    const inv = criarInventario();
    inv.carregar(j.inventario.salvar());
    for (const p of j.transito) if (p) inv.adicionar(p.item, p.qtd, p.dur);
    return {
      inventario: inv.salvar(),
      sobrevivencia: { ...j.sobrevivencia.estado },
      spawn: { ...j.spawn },
      pos: { x: j.tel.x, y: j.tel.y, z: j.tel.z, yaw: j.tel.yaw, pitch: j.tel.pitch },
    };
  }

  /** Tira o jogador do mundo e devolve os dados dele para salvar. */
  function desconectar(id: string): DadosJogador | null {
    const d = dadosJogador(id);
    const j = jogadores.get(id);
    if (!j) return d;
    jogadores.delete(id);
    almaPendente.delete(id);
    perfisSujos = true;
    for (const o of jogadores.values())
      o.eventos.push({ e: 'saiu', id, apelido: j.perfil.apelido });
    return d;
  }

  /**
   * Pode mexer em blocos agora? Spec 016: com a tabela de donos cheia (MAX_DONOS pessoas),
   * quem não está nela passeia como visitante: o bloco dele não pode virar do dono do mundo.
   */
  function constroiAgora(j: Jogador): boolean {
    if (!j.constroi) return false;
    return j.id === donoDoMundo || !edicoes.donos.cheia || edicoes.donos.procurar(j.id) > 0;
  }

  /** Índice do dono para as edições: o dono do mundo é o 0 (não entra na tabela). */
  function indiceDe(id: string): number {
    if (id === donoDoMundo) return 0;
    return edicoes.donos.indice(id, jogadores.get(id)?.perfil.apelido);
  }

  /**
   * Muda um bloco. `dono`: quem colocou (o bloco passa a ser dele); sem ele, a célula fica
   * com o dono que já tinha (porta que abre, fornalha que acende, planta que cresce). Ar
   * nunca tem dono.
   */
  function editar(
    x: number,
    y: number,
    z: number,
    bloco: number,
    meta = 0,
    dono?: string,
  ): boolean {
    const antes = mundo.bloco(x, y, z);
    if (!edicoes.definir(x, y, z, bloco, meta, dono === undefined ? undefined : indiceDe(dono)))
      return false;
    if (luzDoBloco(antes) > 0 || luzDoBloco(bloco) > 0) esquecerLuzPerto(x, y, z);
    blocosMudados.push({ x, y, z, v: edicoes.obterValor(x, y, z) ?? empacotar(bloco, meta) });
    // spec 014: bloco posto numa célula da obra aberta (quem pôs vira ajudante)
    if (cidade && dono !== undefined && bloco !== Bloco.AR) {
      const pl = protecao.planejado(x, y, z);
      if (pl && mesmoBlocoDaObra(bloco, pl.bloco)) encheuObra(pl, dono);
    }
    // spec 031: o bloco certo no bolo do canto
    if (canto?.bolo.length && dono !== undefined && bloco !== Bloco.AR) {
      const b = celulaDoBolo(canto, x, y, z);
      if (b && b.bloco === bloco) encheuBolo(dono);
    }
    // a lavoura que cresce: entra ao ser plantada, sai quando amadurece ou some
    const k = `${x},${y},${z}`;
    if (ehLavoura(bloco) && !madura(bloco)) {
      if (!lavoura.has(k)) lavoura.set(k, { x, y, z, p: 0, t: relogioLavoura });
    } else lavoura.delete(k);
    // planta não flutua: sem a terra arada embaixo, a lavoura sai e devolve o que é dela
    if (bloco !== Bloco.TERRA_ARADA) {
      const cima = mundo.bloco(x, y + 1, z);
      if (ehLavoura(cima)) {
        editar(x, y + 1, z, Bloco.AR);
        if (modo === 'sobrevivencia') soltarColheita(cima, x, y + 1, z);
      }
    }
    return true;
  }

  function soltarColheita(b: number, x: number, y: number, z: number): void {
    for (const d of colheita(b, rngPlantio))
      mundoItens.soltar(d.item, d.qtd, x + 0.5, y + 0.4, z + 0.5, rngPlantio);
  }

  function corrigir(j: Jogador, x: number, y: number, z: number): void {
    // o valor inteiro, com o dono (o cliente guarda o mesmo que o núcleo)
    j.correcoes.push({
      x,
      y,
      z,
      v: edicoes.obterValor(x, y, z) ?? empacotar(mundo.bloco(x, y, z)),
    });
  }

  function perto(j: Jogador, x: number, y: number, z: number, raio: number): boolean {
    return alcancaDosOlhos({ x: j.tel.x, y: j.tel.olhos, z: j.tel.z }, x, y, z, raio);
  }

  function recusar(
    j: Jogador,
    comando: number,
    motivo: string,
    celulas: { x: number; y: number; z: number }[],
    protecao?: RecusaProtecao,
  ): void {
    j.eventos.push(
      protecao ? { e: 'recusa', comando, motivo, protecao } : { e: 'recusa', comando, motivo },
    );
    for (const c of celulas) corrigir(j, c.x, c.y, c.z);
  }

  const ferramentaDe = (p: Slot) => (p ? obterItem(p.item)?.ferramenta : undefined);

  function quebrar(j: Jogador, c: Extract<Comando, { t: 'quebrar' }>): void {
    const { x, y, z } = c;
    const b = mundo.bloco(x, y, z);
    if (
      !ehAlvo(b) ||
      !constroiAgora(j) ||
      !perto(j, x, y, z, ALCANCE_REGRAS) ||
      j.sobrevivencia.estado.morto
    ) {
      recusar(j, c.id, 'quebrar', [c, { x, y: y - 1, z }, { x, y: y + 1, z }]);
      return;
    }
    // spec 031: a rocha de osso do canto sai com um toque, só para quem tem a d3
    if (b === Bloco.MINERIO_FERRO && ehFossilDoCanto(canto, x, y, z)) {
      if (!missaoAberta(j.id, 'd3')) {
        recusar(j, c.id, 'quebrar', [c], { motivo: 'mundo', lugar: 'estrutura' });
        return;
      }
      editar(x, y, z, Bloco.AR);
      j.acoes[0]++;
      almaEvento(j.id, 'escavou:fossil');
      return;
    }
    // spec 016: o que o mundo construiu não quebra; o que alguém pôs, só ele e o dono do mundo
    const protegido = recusaQuebrar(regra, j.id, x, y, z);
    if (protegido) {
      recusar(j, c.id, 'quebrar', [c, { x, y: y - 1, z }, { x, y: y + 1, z }], protegido);
      return;
    }
    // a lavoura do mundo se replanta: o estágio 0 da mesma planta volta na hora (colher
    // verde só recomeça, sem dar nada: senão o sítio virava fonte de sementes)
    const replantio =
      ehLavoura(b) && protecao.em(x, y, z) === Protecao.LAVOURA ? replantioDaLavoura(b) : null;
    // baú do mundo (ruína, celeiro) ainda no lugar em que nasceu: nunca foi trocado, então o
    // tesouro dele ainda vale. Quebrado uma vez, a célula ganha edição; o baú posto de novo
    // ali é um baú comum (vazio), senão quebrar e recolocar dava o tesouro outra vez.
    const intocado = edicoes.obter(x, y, z) === undefined;
    // quebrar meia porta leva a outra metade (a do mesmo par, do mesmo dono, se puder)
    const outraMetade = outraMetadeDaPorta(regra, j.id, x, y, z);
    // spec 023: colheita madura; "minha" é a planta que este jogador plantou (não a do sítio)
    const colhida = ehLavoura(b) && madura(b);
    const minha =
      colhida &&
      donoNaCelula(edicoes, x, y, z, donoDoMundo) === j.id &&
      protecao.em(x, y, z) !== Protecao.LAVOURA;
    if (replantio !== null) {
      // entra de novo na lista da lavoura que cresce, do começo
      lavoura.delete(`${x},${y},${z}`);
      if (!editar(x, y, z, replantio, edicoes.obterMeta(x, y, z)))
        lavoura.set(`${x},${y},${z}`, { x, y, z, p: 0, t: relogioLavoura });
    } else editar(x, y, z, Bloco.AR);
    const darColheita = replantio === null || madura(b);
    if (outraMetade !== null) editar(x, outraMetade, z, Bloco.AR);
    // sobrevivência: a ferramenta gasta e o bloco vira item no chão
    if (modo === 'sobrevivencia') {
      const p = j.inventario.obter(c.slot);
      const ferramenta = ferramentaDe(p);
      if (ferramenta && p && p.dur !== undefined && (obterBloco(b)?.dureza ?? 0) > 0) {
        const dur = p.dur - 1;
        if (dur <= 0) {
          j.inventario.definir(c.slot, null);
          j.eventos.push({ e: 'ferramentaQuebrou', item: p.item });
        } else j.inventario.definir(c.slot, { ...p, dur });
      }
      if (darColheita)
        for (const drop of dropsDoBloco(b, rngDrops, podeColetar(b, ferramenta))) {
          mundoItens.soltar(drop.item, drop.qtd, x + 0.5, y + 0.4, z + 0.5, rngDrops);
        }
      // colher: madura dá o produto e sementes; verde devolve a semente
      if (ehLavoura(b) && darColheita) soltarColheita(b, x, y, z);
      // a grama alta às vezes tem uma semente de trigo (sorteio à parte dos drops)
      if (b === Bloco.GRAMA_ALTA && rngPlantio() < CHANCE_SEMENTE_GRAMA)
        mundoItens.soltar('semente_trigo', 1, x + 0.5, y + 0.4, z + 0.5, rngPlantio);
    }
    // quebrar baú ou fornalha espalha o conteúdo (o de ruína nunca aberto também)
    if (b === Bloco.BAU || b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) {
      const gerado = b === Bloco.BAU && intocado && mundo.gerado(x, y, z) === Bloco.BAU;
      for (const p of conteineres.remover(x, y, z, gerado)) {
        if (p) mundoItens.soltar(p.item, p.qtd, x + 0.5, y + 0.5, z + 0.5, rngDrops, p.dur);
      }
      for (const o of jogadores.values())
        if (o.conteiner && o.conteiner.x === x && o.conteiner.y === y && o.conteiner.z === z) {
          o.conteiner = null;
          o.conteinerSujo = true;
        }
    }
    for (const o of jogadores.values()) {
      o.eventos.push({ e: 'quebra', x, y, z, bloco: b, meu: o === j });
      if (ehLavoura(b))
        o.eventos.push({ e: 'colheu', x, y, z, bloco: b, madura: madura(b), meu: o === j });
    }
    if (colhida) {
      almaEvento(j.id, 'colheu');
      if (minha) almaEvento(j.id, 'colheu:minha');
    }
  }

  /** Enxada na grama ou na terra: vira terra arada (planta baixa em cima sai junto). */
  function arar(j: Jogador, c: Extract<Comando, { t: 'arar' }>): void {
    const { x, y, z } = c;
    const p = j.inventario.obter(c.slot);
    const acima = mundo.bloco(x, y + 1, z);
    if (
      !ehEnxada(ferramentaDe(p)) ||
      !constroiAgora(j) ||
      !perto(j, x, y, z, ALCANCE_REGRAS) ||
      j.sobrevivencia.estado.morto ||
      !podeArar(mundo.bloco(x, y, z), acima)
    ) {
      recusar(j, c.id, 'arar', [c, { x, y: y + 1, z }]);
      return;
    }
    // spec 016: arar é mexer no chão (e na planta de cima): a mesma regra de quebrar
    const protegido =
      recusaQuebrar(regra, j.id, x, y, z) ??
      (acima !== Bloco.AR ? recusaQuebrar(regra, j.id, x, y + 1, z) : null);
    if (protegido) {
      recusar(j, c.id, 'arar', [c, { x, y: y + 1, z }], protegido);
      return;
    }
    // a terra arada é de quem arou (a lavoura dele)
    editar(x, y, z, Bloco.TERRA_ARADA, 0, j.id);
    if (acima !== Bloco.AR) {
      editar(x, y + 1, z, Bloco.AR);
      // a flor ou a grama alta que sai solta o que soltaria quebrada (sorteios do plantio,
      // para não mexer na sequência dos drops de sempre)
      if (modo === 'sobrevivencia') {
        for (const d of dropsDoBloco(acima, rngPlantio, true))
          mundoItens.soltar(d.item, d.qtd, x + 0.5, y + 1.4, z + 0.5, rngPlantio);
        if (acima === Bloco.GRAMA_ALTA && rngPlantio() < CHANCE_SEMENTE_GRAMA)
          mundoItens.soltar('semente_trigo', 1, x + 0.5, y + 1.4, z + 0.5, rngPlantio);
      }
    }
    if (modo === 'sobrevivencia' && p && p.dur !== undefined) {
      const dur = p.dur - 1;
      if (dur <= 0) {
        j.inventario.definir(c.slot, null);
        j.eventos.push({ e: 'ferramentaQuebrou', item: p.item });
      } else j.inventario.definir(c.slot, { ...p, dur });
    }
    j.acoes[0]++;
    for (const o of jogadores.values()) o.eventos.push({ e: 'arou', x, y, z, meu: o === j });
  }

  const celulaLuz = (x: number, y: number, z: number) => `${x & ~1},${y & ~1},${z & ~1}`;
  /** A luz guardada do pé, se ainda vale. */
  function luzGuardada(c: PeLavoura): number | undefined {
    const g = luzLavoura.obter(celulaLuz(c.x, c.y, c.z));
    return g && relogioLavoura - g.t < LUZ_LAVOURA_VALE ? g.v : undefined;
  }
  /** Luz de fontes perto do pé (guardada; uma tocha nova vale na hora). */
  function luzDoPe(c: PeLavoura): number {
    const g = luzGuardada(c);
    if (g !== undefined) return g;
    const v = mundo.luzDaCelula(c.x, c.y, c.z);
    luzesNoPasso++;
    luzLavoura.guardar(celulaLuz(c.x, c.y, c.z), { v, t: relogioLavoura });
    return v;
  }
  /** Uma fonte de luz entrou ou saiu: esquece a luz das células que ela alcança. */
  function esquecerLuzPerto(x: number, y: number, z: number): void {
    if (luzLavoura.tamanho === 0) return;
    for (let dy = -6; dy <= 6; dy += 2)
      for (let dz = -8; dz <= 8; dz += 2)
        for (let dx = -8; dx <= 8; dx += 2) luzLavoura.apagar(celulaLuz(x + dx, y + dy, z + dz));
  }

  /** Um pé cresce `segundos` (sem sorteio): estágio novo quando o progresso enche. */
  function crescerPe(
    k: string,
    c: PeLavoura,
    segundos: number,
    noite: number,
    chuva: boolean,
  ): void {
    let b = mundo.bloco(c.x, c.y, c.z);
    if (proximoEstagio(b) === null) {
      lavoura.delete(k);
      return;
    }
    const v = velocidadeCrescimento({
      noite,
      chuva,
      ceuAberto: mundo.criaturas.ceuAberto(c.x, c.y, c.z),
      luz: () => luzDoPe(c),
    });
    c.p += v * segundos;
    let prox = proximoEstagio(b);
    let mudou = false;
    while (prox !== null && c.p >= SEGUNDOS_POR_ESTAGIO) {
      c.p -= SEGUNDOS_POR_ESTAGIO;
      b = prox;
      prox = proximoEstagio(b);
      mudou = true;
    }
    if (!mudou) return;
    const resto = c.p;
    editar(c.x, c.y, c.z, b, edicoes.obterMeta(c.x, c.y, c.z));
    const ainda = lavoura.get(k);
    if (ainda) ainda.p = resto;
    if (madura(b))
      for (const o of jogadores.values())
        if (Math.hypot(c.x + 0.5 - o.tel.x, c.z + 0.5 - o.tel.z) <= ALCANCE_MADURA)
          o.eventos.push({ e: 'amadureceu', x: c.x, y: c.y, z: c.z, bloco: b });
  }

  function chuvaNoMundo(): boolean {
    return clima.estado.tipo === 'chuva' || clima.estado.tipo === 'tempestade';
  }

  /** A lavoura inteira cresce `segundos` de uma vez (depuração: testes e capturas). */
  function crescer(segundos: number): void {
    if (lavoura.size === 0) return;
    const noite = noiteNaHora(hora);
    const chuva = chuvaNoMundo();
    for (const [k, c] of lavoura) crescerPe(k, c, segundos, noite, chuva);
  }

  /**
   * A cada passo, uma parte da lavoura cresce o tempo que passou desde a vez dela: cada
   * pé uma vez por segundo, e no máximo ORCAMENTO_LAVOURA pés por passo (numa lavoura
   * enorme a volta demora mais, mas cada pé cresce o tempo todo que esperou; a velocidade
   * de crescer é a mesma e o custo do passo tem teto).
   */
  function crescerAosPoucos(dt: number): void {
    relogioLavoura += dt;
    if (lavoura.size === 0) return;
    const cota = Math.min(ORCAMENTO_LAVOURA, Math.ceil((lavoura.size * dt) / INTERVALO_LAVOURA));
    const noite = noiteNaHora(hora);
    const chuva = chuvaNoMundo();
    luzesNoPasso = 0;
    let reinicios = 0;
    for (let i = 0; i < cota; i++) {
      let r = cursorLavoura?.next();
      if (!r || r.done) {
        // uma volta inteira já foi feita neste passo (lavoura pequena): basta
        if (++reinicios > 1) break;
        cursorLavoura = lavoura.entries();
        r = cursorLavoura.next();
        if (r.done) break;
      }
      const [k, c] = r.value;
      // sem sol, o pé precisa da luz de tocha; calculada demais neste passo, ele fica para
      // a próxima volta (e cresce então todo o tempo que esperou)
      if (
        luzesNoPasso >= ORCAMENTO_LUZ &&
        !(noite < 0.5 && mundo.criaturas.ceuAberto(c.x, c.y, c.z)) &&
        luzGuardada(c) === undefined
      )
        continue;
      const passou = relogioLavoura - c.t;
      c.t = relogioLavoura;
      if (passou > 0) crescerPe(k, c, passou, noite, chuva);
    }
  }

  function colocar(j: Jogador, c: Extract<Comando, { t: 'colocar' }>): void {
    const { x, y, z, bloco } = c;
    let { meta } = c;
    const celulas = [c, ...(c.extras ?? [])];
    const p = j.inventario.obter(c.slot);
    const def = obterBloco(bloco);
    const blocoAtual = mundo.bloco(x, y, z);
    // planta baixa e água dão lugar; a lavoura não (colocar em cima dela é recusado)
    const livre = substituivel(blocoAtual);
    // semente só na terra arada
    const lav = lavouraDoBloco(bloco);
    const plantavel = !lav || podePlantar(mundo.bloco(x, y - 1, z), blocoAtual);
    // spec 014: a célula da obra aberta pede um bloco; com a colher de pedreiro, ele entra
    // sem gastar nada (na sobrevivência também), sempre com a direção da planta
    const plano = cidade || canto?.bolo.length ? protecao.planejado(x, y, z) : null;
    // spec 031: no bolo do canto, quem tem a e1 põe o bloco certo de graça (a mão do guia
    // mostra qual; sem colher, que é só da cidade)
    const doBolo =
      !!plano &&
      plano.canteiro === CANTEIRO_BOLO &&
      plano.bloco === bloco &&
      missaoAberta(j.id, 'e1');
    const daColher = (p?.item === COLHER_PEDREIRO && !!plano && plano.bloco === bloco) || doBolo;
    if (plano && plano.bloco === bloco) meta = plano.meta;
    const temItem =
      modo === 'criativo' || daColher || (!!p && blocoDoItem(p.item) === bloco && p.qtd > 0);
    // a outra parte só existe para a porta (dois blocos de altura): exatamente a célula de
    // cima, que tem de estar livre. Qualquer outra "parte extra" é truque (uma semente
    // plantando três pés, uma tábua virando três blocos longe dali) e o pedido é recusado.
    const metade = c.extras && c.extras.length > 0 ? c.extras : null;
    const extrasOk =
      !metade ||
      (bloco === Bloco.PORTA &&
        metade.length === 1 &&
        metade[0].x === x &&
        metade[0].y === y + 1 &&
        metade[0].z === z &&
        y + 1 < ALTURA &&
        substituivel(mundo.bloco(x, y + 1, z)));
    const ocupado =
      !!def?.solido &&
      [...jogadores.values()].some((o) =>
        colocacaoBloqueada({ x, y, z }, { x: o.tel.x, y: o.tel.y, z: o.tel.z }),
      );
    if (
      !def ||
      !constroiAgora(j) ||
      bloco === Bloco.AR ||
      // spec 014: bloco só de outro tema não existe neste mundo (nem no criativo)
      !blocoNoMundo(bloco, estiloMundo()) ||
      !livre ||
      !extrasOk ||
      !plantavel ||
      !temItem ||
      ocupado ||
      !perto(j, x, y, z, ALCANCE_REGRAS) ||
      j.sobrevivencia.estado.morto
    ) {
      recusar(j, c.id, lav && livre && !plantavel ? 'semente' : 'colocar', celulas);
      return;
    }
    // spec 016: passagem e construção do mundo ficam livres; a flor do amigo não some
    const protegido =
      recusaColocar(regra, j.id, x, y, z, bloco) ??
      (metade ? recusaColocar(regra, j.id, x, y + 1, z, bloco) : null);
    if (protegido) {
      recusar(j, c.id, 'colocar', celulas, protegido);
      return;
    }
    // spec 016: o bloco guarda quem o colocou
    editar(x, y, z, bloco, meta, j.id);
    // a metade de cima da porta (já conferida: ar, planta baixa ou água)
    if (metade)
      editar(x, y + 1, z, bloco, (cidade && protecao.planejado(x, y + 1, z)?.meta) || meta, j.id);
    if (modo === 'sobrevivencia' && !daColher) j.inventario.remover(c.slot, 1);
    j.acoes[1]++;
    for (const o of jogadores.values())
      o.eventos.push({ e: 'colocacao', x, y, z, bloco, meu: o === j });
    if (lav) j.eventos.push({ e: 'plantou', x, y, z, bloco });
    // spec 023: pôr bloco e plantar contam (o bloco da obra conta à parte, em encheuObra)
    almaEvento(j.id, 'colocou');
    if (lav) almaEvento(j.id, 'plantou');
  }

  function editarLote(j: Jogador, c: Extract<Comando, { t: 'editar' }>): void {
    if ((modo !== 'criativo' && !confiar) || !constroiAgora(j) || c.lote.length > 20000) {
      recusar(j, c.id, 'editar', c.lote.slice(0, 20000));
      return;
    }
    if (!confiar) {
      const longe = c.lote.some(
        (e) =>
          e.y < 0 || e.y >= 128 || Math.max(Math.abs(e.x - j.tel.x), Math.abs(e.z - j.tel.z)) > 64,
      );
      if (longe) {
        recusar(j, c.id, 'editar', c.lote.slice(0, 500));
        return;
      }
    }
    // a lavoura segue a regra de plantar (terra arada embaixo): primeiro o resto do lote
    // (que pode trazer a terra arada), depois as plantas; planta sem terra arada não entra
    // (e a tela é corrigida). Sem isso, milhares de pés no ar faziam o crescer pesar.
    const plantas: typeof c.lote = [];
    let primeira: RecusaProtecao | null = null;
    for (const e of c.lote) {
      // spec 016: cada célula segue a regra de quebrar (o que sai) e de colocar (o que entra);
      // a igual não muda nada (nem o dono), a lavoura do mundo só se colhe
      const atual = empacotar(mundo.bloco(e.x, e.y, e.z), edicoes.obterMeta(e.x, e.y, e.z));
      const d = celulaDoLote(regra, j.id, e.x, e.y, e.z, e.v, atual);
      if ('pula' in d) continue;
      if ('recusa' in d) {
        primeira ??= d.recusa;
        corrigir(j, e.x, e.y, e.z);
        continue;
      }
      const b = d.v & 255;
      const meta = (d.v >> 8) & 255;
      if (d.manterDono) {
        // colheita da lavoura do mundo: entra de novo na lista que cresce, do começo
        lavoura.delete(`${e.x},${e.y},${e.z}`);
        editar(e.x, e.y, e.z, b, meta);
      } else if (ehLavoura(b)) plantas.push(e);
      else editar(e.x, e.y, e.z, b, meta, j.id);
    }
    if (primeira)
      j.eventos.push({ e: 'recusa', comando: c.id, motivo: 'editar', protecao: primeira });
    for (const e of plantas) {
      if (mundo.bloco(e.x, e.y - 1, e.z) === Bloco.TERRA_ARADA)
        editar(e.x, e.y, e.z, e.v & 255, (e.v >> 8) & 255, j.id);
      else corrigir(j, e.x, e.y, e.z);
    }
  }

  // ------------------------------------------------------------ canteiro (spec 014, T05)

  /** Obras que ganharam bloco neste comando (conferidas no fim dele). */
  const obrasTocadas = new Map<number, { quem: string; c: CelulaPlanejada }>();
  function estadoObra(n: number) {
    let o = obras.get(n);
    if (!o) {
      o = { ajudantes: new Map(), cheias: [], feita: false };
      obras.set(n, o);
    }
    return o;
  }
  function encheuObra(c: CelulaPlanejada, quem: string): void {
    const o = estadoObra(c.canteiro);
    if (!o.ajudantes.has(quem) && o.ajudantes.size < MAX_AJUDANTES_OBRA)
      o.ajudantes.set(quem, apelidoDe(quem) ?? '');
    obrasTocadas.set(c.canteiro, { quem, c });
    almaEvento(quem, 'obra:bloco');
  }

  /** As obras tocadas: o progresso para todos, ou a obra feita. */
  function conferirObras(): void {
    if (!cidade || obrasTocadas.size === 0) return;
    for (const [n, { quem, c }] of obrasTocadas) {
      const celulas = celulasPlanejadas(cidade, n);
      const o = estadoObra(n);
      const cheia = (q: CelulaPlanejada) => mesmoBlocoDaObra(mundo.bloco(q.x, q.y, q.z), q.bloco);
      o.cheias = celulas.filter(cheia).map((q) => q.i);
      if (o.cheias.length >= celulas.length) {
        concluirObra(n);
        continue;
      }
      const camada = celulas.every((q) => q.camada !== c.camada || cheia(q));
      // spec 023: a bolinha do cartão de quem tem esta obra aberta
      for (const p of jogadores.values()) {
        const e = almaDe(p.id);
        const mv = mundoAlma
          ? progressoObra(e, mundoAlma, n, o.cheias.length, celulas.length)
          : null;
        if (mv) ganharAlma(p.id, { ganho: ganhoVazio(), missoes: [mv], mudouLista: false });
      }
      for (const p of jogadores.values())
        p.eventos.push({
          e: 'obra',
          canteiro: n,
          cheias: o.cheias.length,
          total: celulas.length,
          x: c.x,
          y: c.y,
          z: c.z,
          meu: p.id === quem,
          ...(camada ? { camada: true } : {}),
        });
    }
    obrasTocadas.clear();
  }

  /**
   * A obra terminou: vira parte da cidade (a geração passa a pintá-la, as edições das células
   * dela saem), o próximo canteiro abre, todos perto festejam e cada ajudante ganha a peça.
   */
  function concluirObra(n: number): void {
    if (!cidade) return;
    const o = estadoObra(n);
    if (o.feita) return;
    o.feita = true;
    const antes = canteirosAbertos();
    definirObrasFeitas(feitasDoMundo());
    const abriram = canteirosAbertos().filter((k) => !antes.includes(k));
    for (const k of [n, ...abriram])
      for (const [cx, cz] of chunksDoCanteiro(cidade, k)) mundo.esquecer(cx, cz);
    const celulas = celulasPlanejadas(cidade, n);
    for (const c of celulas) edicoes.remover?.(c.x, c.y, c.z);
    if (celulas[0]) esquecerLuzPerto(celulas[0].x, celulas[0].y, celulas[0].z);
    const todas = feitasDoMundo().length >= NUM_OBRAS;
    const nomes = [...o.ajudantes]
      .slice(0, 4)
      .map(([id, a]) => apelidoDe(id) ?? a)
      .filter((a) => a);
    for (const p of jogadores.values()) {
      const ajudou = o.ajudantes.has(p.id);
      p.eventos.push({
        e: 'obra',
        canteiro: n,
        cheias: celulas.length,
        total: celulas.length,
        feita: true,
        nomes,
        ...(ajudou
          ? { ajudou: true, recompensa: ['capacete-obra', ...(todas ? ['colete-obra'] : [])] }
          : {}),
      });
    }
    // spec 023: a missão da obra (todo ajudante ganha; quem não ajudou passa para a próxima)
    for (const p of jogadores.values()) almaObrasFeitas(p.id);
    // o pedreiro bate palmas e vai para o próximo canteiro aberto
    const ped = pedreiro();
    if (ped) {
      ped.yawAlvo = ped.yaw;
      ped.pausaGesto = 2.4;
      espalharGesto(ped.x, ped.z, { e: 'gesto', gesto: 'aplaudir', criatura: ped.id });
      moverPedreiro(ped, n);
    }
  }

  /** O canteiro onde o pedreiro trabalha: o primeiro aberto (todas feitas: o último). */
  const canteiroDoPedreiro = () => canteirosAbertos()[0] ?? NUM_OBRAS;
  const pedreiro = () =>
    populacao.lista.find((c) => c.morador?.povoado === 'cidade' && c.morador.n === 0);
  /** A entrada do canteiro, por dentro (f = 1) ou pela calçada (f = -1). */
  function entradaDoCanteiro(n: number, f: number): [number, number] | null {
    const l = cidade ? loteDoCanteiro(cidade, n) : undefined;
    if (!l) return null;
    const [ax, az] = noLoteObra(l, 3, f);
    const [bx, bz] = noLoteObra(l, 4, f);
    return [(ax + bx) / 2 + 0.5, (az + bz) / 2 + 0.5];
  }
  /**
   * Spec 014 (T08): o canteiro `n` como lugar da cidade a pé: a frente na calçada, a entrada
   * no tapume e o posto do pedreiro.
   */
  function lugarDoCanteiro(n: number): LugarCidade | null {
    const fora = entradaDoCanteiro(n, -1);
    const dentro = entradaDoCanteiro(n, 1);
    const posto = cidade ? postoDoPedreiro(cidade, n) : null;
    if (!cidade || !fora || !dentro || !posto) return null;
    return { frente: fora, passos: [[dentro[0], cidade.h + 1, dentro[1]], posto] };
  }
  /** Caminho a pé até o canteiro `n`, pelas calçadas (sem o posto: a rotina vai até ele). */
  function caminhoAteCanteiro(
    m: NonNullable<ReturnType<typeof pedreiro>>['morador'],
    de: LugarCidade | null,
    aqui: [number, number],
    n: number,
  ): [number, number][] | null {
    const para = lugarDoCanteiro(n);
    if (!m?.cidade || !para) return null;
    const r = m.cidade.rota(de, aqui, para).map(([x, , z]) => [x, z] as [number, number]);
    r.pop();
    return r;
  }
  /** Do canteiro `de` para o posto do canteiro de agora: sai pela entrada e vai pela calçada. */
  function moverPedreiro(c: NonNullable<ReturnType<typeof pedreiro>>, de: number): void {
    const novo = canteiroDoPedreiro();
    const posto = cidade ? postoDoPedreiro(cidade, novo) : null;
    if (!posto || !c.morador) return;
    c.morador.posto = posto;
    c.morador.caminho =
      novo === de
        ? []
        : (caminhoAteCanteiro(c.morador, lugarDoCanteiro(de), [c.x, c.z], novo) ??
          ([
            entradaDoCanteiro(de, 1),
            entradaDoCanteiro(de, -1),
            entradaDoCanteiro(novo, -1),
            entradaDoCanteiro(novo, 1),
          ].filter((p) => p) as [number, number][]));
  }

  /** Alguém (acordado) a até `r` blocos de (x, z)? */
  const alguemPerto = (x: number, z: number, r: number) =>
    [...jogadores.values()].some(
      (o) => !o.sobrevivencia.estado.morto && Math.hypot(o.tel.x - x, o.tel.z - z) < r,
    );

  /** Os roteiros dos moradores da cidade (casa, loja e praça), um por número. */
  const roteiros = new Map<number, RoteiroCidade | null>();
  const roteiro = (n: number): RoteiroCidade | null => {
    if (!cidade) return null;
    if (!roteiros.has(n)) {
      const mo = cidade.moradores.find((m) => m.n === n);
      roteiros.set(n, mo ? roteiroDoMorador(cidade, mo) : null);
    }
    return roteiros.get(n)!;
  };

  /**
   * Spec 014 (T08): o dia do pedreiro. No horário do canteiro (e sempre que tem criança perto
   * dele ou do canteiro) fica no posto; de manhãzinha passa na loja de construção; à noite vai
   * para casa. Nunca deixa uma criança sozinha na obra: chegou alguém, ele volta.
   */
  function horarioDoPedreiro(c: NonNullable<ReturnType<typeof pedreiro>>): void {
    const m = c.morador;
    if (!m?.cidade || !m.posto) return;
    const n = canteiroDoPedreiro();
    const raio = m.folga ? 20 : 32;
    const perto = alguemPerto(m.posto[0], m.posto[2], raio) || alguemPerto(c.x, c.z, raio / 2);
    const folga: DadosFolga =
      perto || (hora >= 0.3 && hora < 0.74)
        ? undefined
        : hora >= 0.24 && hora < 0.3
          ? 'loja'
          : 'casa';
    if (folga === m.folga) return;
    if (folga && !m.folga) {
      // sai do canteiro pela entrada do tapume
      m.lugar = lugarDoCanteiro(n);
      m.ir = undefined;
      m.caminho = [];
    } else if (!folga) {
      if (m.emCasa) {
        c.x = m.cidade.fora[0];
        c.y = m.cidade.fora[1];
        c.z = m.cidade.fora[2];
        m.emCasa = false;
        m.lugar = m.cidade.casa;
      }
      m.caminho = caminhoAteCanteiro(m, m.lugar ?? null, [c.x, c.z], n) ?? [];
    }
    m.folga = folga;
    m.rumo = undefined;
    m.trilha = undefined;
    m.pausa = undefined;
  }

  let relogioCidade = 0;
  /**
   * Spec 014 (T08): os moradores da cidade (os do planejador, menos o pedreiro, que cuida do
   * canteiro) aparecem na porta de casa (ou dentro dela, de noite) quando alguém chega perto,
   * e o cachorro vem morar na casinha da obra 1 quando ela fica pronta.
   */
  function cuidarDaCidade(dt: number): void {
    if (!cidade) return;
    relogioCidade -= dt;
    if (relogioCidade > 0) return;
    relogioCidade = 1;
    const vivos = new Set<number>();
    let cachorro = false;
    for (const c of populacao.lista) {
      if (c.morador?.povoado === 'cidade') vivos.add(c.morador.n);
      if (c.lar === 1) cachorro = true;
    }
    const deNoite = noiteNaHora(hora) > 0.35;
    for (const mo of cidade.moradores) {
      if (mo.n === 0 || vivos.has(mo.n)) continue;
      const r = roteiro(mo.n);
      if (!r || !alguemPerto(r.fora[0], r.fora[2], 64)) continue;
      if (mundo.criaturas.superficie(Math.floor(r.fora[0]), Math.floor(r.fora[2])) === null)
        continue;
      const q = deNoite ? r.dentro : r.fora;
      const c = populacao.adicionar('morador', q[0], q[1], q[2]);
      c.morador = {
        povoado: 'cidade',
        n: mo.n,
        profissao: mo.profissao,
        fora: r.fora,
        dentro: r.dentro,
        oficina: r.loja.passos[r.loja.passos.length - 1],
        praca: r.pracas[0].passos[r.pracas[0].passos.length - 1],
        rotaCasa: [],
        rotaOficina: [],
        centro: r.centro,
        cidade: r,
        lugar: r.casa,
        emCasa: deNoite,
        rumoDia: mo.n % 2 === 0 ? 'praca' : 'loja',
      };
    }
    // o cachorro da casinha: mora no quintal do canteiro 1 (a obra feita)
    if (!cachorro && obras.get(1)?.feita) {
      const l = loteDoCanteiro(cidade, 1);
      if (!l) return;
      const [x, z] = noLoteObra(l, 3, 4);
      if (!alguemPerto(x, z, 48) || mundo.criaturas.superficie(x, z) === null) return;
      const c = populacao.adicionar('cervo', x + 0.5, cidade.h + 1, z + 0.5);
      c.lar = 1;
      const [ax, az] = noLoteObra(l, 1, 1);
      const [bx, bz] = noLoteObra(l, 6, 7);
      c.cerca = [Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz)];
      // a casa dele é a porta da casinha: passeia ali pertinho, sem ir longe dela
      const [px, pz] = noLoteObra(l, 3, 2);
      c.casa = [px + 0.5, pz + 0.5];
    }
  }

  /** Raio em que o pedreiro vê a criança chegar (acena, vem até ela e dá a colher). */
  const RAIO_PEDREIRO = 8;
  /** Segundos entre duas colheres para o mesmo jogador (quem perdeu ganha outra). */
  const ESPERA_COLHER = 5;
  let relogioPedreiro = 0;
  const temColher = (j: Jogador) =>
    j.inventario.contar(COLHER_PEDREIRO) > 0 || j.transito.some((p) => p?.item === COLHER_PEDREIRO);

  /**
   * O pedreiro da cidade: aparece no posto quando alguém chega perto do canteiro; acena e vem
   * até a criança que chegou e dá a colher a quem não tem (ela entra na barra e fica na mão).
   */
  function cuidarDoPedreiro(dt: number): void {
    if (!cidade) return;
    relogioPedreiro -= dt;
    if (relogioPedreiro > 0) return;
    relogioPedreiro = 0.25;
    const posto = postoDoPedreiro(cidade, canteiroDoPedreiro());
    if (!posto) return;
    let c = pedreiro();
    if (!c) {
      const alguem = [...jogadores.values()].some(
        (o) => Math.hypot(o.tel.x - posto[0], o.tel.z - posto[2]) < 60,
      );
      if (
        !alguem ||
        mundo.criaturas.superficie(Math.floor(posto[0]), Math.floor(posto[2])) === null
      )
        return;
      c = populacao.adicionar('morador', posto[0], posto[1], posto[2]);
      // spec 014 (T08): o pedreiro também mora num apartamento e passa na loja de construção
      const r = roteiro(0);
      c.morador = {
        povoado: 'cidade',
        n: 0,
        profissao: 'construtor',
        fora: r?.fora ?? posto,
        dentro: r?.dentro ?? posto,
        oficina: r ? r.loja.passos[r.loja.passos.length - 1] : posto,
        praca: posto,
        rotaCasa: [],
        rotaOficina: [],
        centro: r?.centro ?? [posto[0] + 1000, posto[2]],
        posto,
        ...(r ? { cidade: r, lugar: lugarDoCanteiro(canteiroDoPedreiro()) } : {}),
      };
    }
    horarioDoPedreiro(c);
    for (const j of jogadores.values()) {
      if (j.sobrevivencia.estado.morto) continue;
      const d = Math.hypot(j.tel.x - c.x, j.tel.z - c.z);
      if (d > RAIO_PEDREIRO || Math.abs(j.tel.y - c.y) > 4) continue;
      if (!j.pedreiroViu) {
        j.pedreiroViu = true;
        c.yawAlvo = Math.atan2(j.tel.x - c.x, j.tel.z - c.z);
        espalharGesto(c.x, c.z, { e: 'gesto', gesto: 'acenar', criatura: c.id, voz: true });
        if (c.morador && d > 2.5) c.morador.ir = { x: j.tel.x, z: j.tel.z, t: 3 };
      }
      if (!j.constroi || temColher(j) || (n - j.passoColher) * PASSO < ESPERA_COLHER) continue;
      j.passoColher = n;
      const resto = j.inventario.adicionar(COLHER_PEDREIRO, 1);
      if (resto > 0) {
        mundoItens.soltar(COLHER_PEDREIRO, resto, j.tel.x, j.tel.y + 0.5, j.tel.z, rngCriacao);
        continue;
      }
      const slot = j.inventario.slots.findIndex((q) => q?.item === COLHER_PEDREIRO);
      if (slot >= 0) j.eventos.push({ e: 'colher', slot });
    }
  }

  function alternarPorta(x: number, y: number, z: number): void {
    const b = mundo.bloco(x, y, z);
    const novo = alternado(b);
    editar(x, y, z, novo, edicoes.obterMeta(x, y, z));
    // a porteira tem um bloco só; a porta leva a outra metade junto
    if (!ehPorta(b)) return;
    for (const dy of [-1, 1]) {
      const v = mundo.bloco(x, y + dy, z);
      if (v === Bloco.PORTA || v === Bloco.PORTA_ABERTA)
        editar(x, y + dy, z, novo, edicoes.obterMeta(x, y + dy, z));
    }
  }

  let aberturas = 0;
  function usar(j: Jogador, c: Extract<Comando, { t: 'usar' }>): void {
    const { x, y, z } = c;
    if (!perto(j, x, y, z, ALCANCE_REGRAS) || j.sobrevivencia.estado.morto) {
      // a porta foi prevista na tela: volta as duas metades
      if (c.id !== undefined) recusar(j, c.id, 'usar', [c, { x, y: y - 1, z }, { x, y: y + 1, z }]);
      return;
    }
    const abertura = c.id ?? 1_000_000 + ++aberturas;
    const b = mundo.bloco(x, y, z);
    if (abreEFecha(b)) {
      alternarPorta(x, y, z);
      for (const o of jogadores.values()) o.eventos.push({ e: 'porta', x, y, z });
    } else if (
      (b === Bloco.BAU || b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) &&
      !j.constroi
    ) {
      // quem só passeia não mexe nos baús e fornalhas dos outros
      j.eventos.push({ e: 'recusa', comando: c.id ?? 0, motivo: 'visitante' });
    } else if (ehConteiner(b) && recusaConteiner(regra, j.id, x, y, z)) {
      // spec 016: o baú e a fornalha que alguém pôs abrem só para ele e para o dono do mundo
      j.eventos.push({
        e: 'recusa',
        comando: c.id ?? 0,
        motivo: 'usar',
        protecao: recusaConteiner(regra, j.id, x, y, z)!,
      });
    } else if (b === Bloco.BAU) {
      // baú sem edição no lugar foi gerado pelo mundo (ruína): vem com tesouro
      conteineres.bau(x, y, z, edicoes.obter(x, y, z) === undefined);
      j.conteiner = { tipo: 'bau', abertura, x, y, z };
      j.conteinerSujo = true;
    } else if (b === Bloco.FORNALHA || b === Bloco.FORNALHA_ACESA) {
      conteineres.fornalha(x, y, z);
      j.conteiner = { tipo: 'fornalha', abertura, x, y, z };
      j.conteinerSujo = true;
    } else if (b === Bloco.CAMA) {
      j.spawn = { x: x + 0.5, z: z + 0.5 };
      if (noiteNaHora(hora) < 0.4) {
        j.eventos.push({ e: 'sono', dormiu: false });
        return;
      }
      // a noite só passa quando todos estão deitados (com um jogador só, na hora)
      j.querDormir = ESPERA_TODOS;
      const faltam = [...jogadores.values()].filter((o) => o.querDormir <= 0).length;
      if (faltam > 0) {
        j.eventos.push({ e: 'sonoEspera', faltam });
        return;
      }
      for (const o of jogadores.values()) {
        o.querDormir = 0;
        o.sono = ESPERA_SONO;
        o.eventos.push({ e: 'sono', dormiu: true });
      }
    }
  }

  /** A noite passa (uma vez) e quem dormia acorda. */
  function acordar(): void {
    // dormir à noite (antes da meia-noite) já conta como o dia seguinte
    if (hora > 0.5) dia++;
    hora = 0.265;
    horaAnterior = hora;
    for (const o of jogadores.values())
      if (o.sono !== 0) {
        o.sono = 0;
        o.eventos.push({ e: 'acordou' });
      }
  }

  /** Slots que um lugar da transação alcança. */
  function slotsDe(
    j: Jogador,
    onde: MudancaSlot['onde'],
  ): { ler(i: number): Slot; gravar(i: number, p: Slot): void; tamanho: number } | null {
    if (onde === 'inv')
      return {
        ler: (i) => j.inventario.obter(i),
        gravar: (i, p) => j.inventario.definir(i, p),
        tamanho: j.inventario.slots.length,
      };
    if (onde === 'tr')
      return {
        ler: (i) => j.transito[i] ?? null,
        gravar: (i, p) => {
          j.transito[i] = p;
        },
        tamanho: j.transito.length,
      };
    const ct = j.conteiner;
    if (onde === 'bau' && ct?.tipo === 'bau') {
      const s = conteineres.bau(ct.x, ct.y, ct.z, false);
      return {
        ler: (i) => s[i] ?? null,
        gravar: (i, p) => {
          s[i] = p;
        },
        tamanho: TAMANHO_BAU,
      };
    }
    if (onde === 'forn' && ct?.tipo === 'fornalha') {
      const f = conteineres.fornalha(ct.x, ct.y, ct.z);
      const campos = ['entrada', 'combustivel', 'saida'] as const;
      return {
        ler: (i) => f[campos[i]] ?? null,
        gravar: (i, p) => {
          f[campos[i]] = p;
        },
        tamanho: 3,
      };
    }
    return null;
  }

  const igual = (a: Slot, b: Slot) =>
    (a === null && b === null) ||
    (!!a && !!b && a.item === b.item && a.qtd === b.qtd && (a.dur ?? -1) === (b.dur ?? -1));

  function transacao(j: Jogador, c: Extract<Comando, { t: 'transacao' }>): void {
    j.ackTransacao = Math.max(j.ackTransacao, c.id);
    // confere tudo antes de mexer: ou a transação inteira vale, ou nada muda
    const alvos = c.mudancas.map((m) => ({ m, s: slotsDe(j, m.onde) }));
    const valida = alvos.every(
      ({ m, s }) => !!s && m.i >= 0 && m.i < s.tamanho && igual(s.ler(m.i), m.antes),
    );
    // na nuvem a conta dos itens tem que fechar (no criativo o catálogo dá de tudo)
    const contaOk = confiar || modo === 'criativo' || contaFecha(c.mudancas, c.fabricou ?? []);
    const noConteiner = c.mudancas.some((m) => m.onde === 'bau' || m.onde === 'forn');
    const ct = j.conteiner;
    const alcanca = !ct || confiar || perto(j, ct.x, ct.y, ct.z, ALCANCE_REGRAS + 2);
    // foi embora com o baú aberto: fecha
    if (noConteiner && !alcanca) j.conteiner = null;
    // spec 016: o baú e a fornalha de outra pessoa não abrem; nem por transação mandada direto
    const donoOk = !ct || !recusaConteiner(regra, j.id, ct.x, ct.y, ct.z, ct.tipo);
    const conteinerOk = !noConteiner || (j.constroi && alcanca && donoOk);
    if (!valida || !contaOk || !conteinerOk) {
      // Tudo volta ao oficial, inclusive o que estava nas mãos (nada duplica nem some).
      j.inventarioSujo = true;
      j.transitoSujo = true;
      j.conteinerSujo = true;
      return;
    }
    for (const { m, s } of alvos) s!.gravar(m.i, m.depois ? { ...m.depois } : null);
    j.inventarioSujo = true;
    almaDaTransacao(j, c);
    if (c.mudancas.some((m) => m.onde === 'bau' || m.onde === 'forn')) {
      // outros jogadores com o mesmo contêiner aberto veem a mudança
      for (const o of jogadores.values())
        if (
          o !== j &&
          o.conteiner &&
          j.conteiner &&
          o.conteiner.x === j.conteiner.x &&
          o.conteiner.y === j.conteiner.y &&
          o.conteiner.z === j.conteiner.z
        )
          o.conteinerSujo = true;
    }
  }

  /**
   * Spec 023: o que a transação fez e conta: receitas feitas (na nuvem, só com a conta dos
   * itens fechando, também no criativo) e pipoca tirada da saída da fornalha.
   */
  function almaDaTransacao(j: Jogador, c: Extract<Comando, { t: 'transacao' }>): void {
    // receita de comida (o pão e as outras) ganha como 'cozinhou'; as outras, como 'fabricou'
    if (c.fabricou?.length && (confiar || contaFecha(c.mudancas, c.fabricou)))
      for (const f of c.fabricou) {
        const r = RECEITAS.find((x) => x.id === f.receita);
        const comida = r?.categoria === 'comida' || !!obterItem(r?.resultado.item ?? '')?.comida;
        almaEvento(j.id, `fabricou:${f.receita}`, f.vezes, comida ? 'cozinhou' : 'fabricou');
      }
    for (const m of c.mudancas) {
      if (m.onde !== 'forn' || m.i !== 2) continue;
      // comida que sai da fornalha (pipoca, carne e peixe assados, ovo cozido)
      const item = m.antes?.item ?? m.depois?.item;
      if (!item || !obterItem(item)?.comida) continue;
      const antes = m.antes?.item === item ? m.antes.qtd : 0;
      const depois = m.depois?.item === item ? m.depois.qtd : 0;
      // pôr comida na saída não é cozinhar: a que foi posta não conta ao sair
      const posta = postoNaSaida.get(item) ?? 0;
      if (depois > antes) postoNaSaida.set(item, posta + depois - antes);
      else if (antes > depois) {
        const tirou = antes - depois;
        const descontada = Math.min(tirou, posta);
        postoNaSaida.set(item, posta - descontada);
        if (tirou > descontada) almaEvento(j.id, `fundiu:${item}`, tirou - descontada);
      }
    }
  }

  function criatura(id: number) {
    return populacao.lista.find((c) => c.id === id);
  }

  function tratarCriaturas(
    eventos: EventoCriatura[],
    alvo: Jogador | undefined,
    golpe = false,
  ): void {
    for (const ev of eventos) {
      const c = ev.criatura;
      const atacado = ev.jogador
        ? [...jogadores.values()].find((o) => o.corpo === ev.jogador)
        : alvo;
      if (ev.tipo === 'ataque' && atacado && modo === 'sobrevivencia') {
        atacado.sobrevivencia.dano(ev.dano ?? 2, 'criatura');
        atacado.eventos.push({ e: 'ataque', dano: ev.dano ?? 2 });
      } else if (ev.tipo === 'ataque') {
        // criativo: as criaturas não machucam
      } else if (ev.tipo === 'ferida') {
        eventosGerais.push({ e: 'criaturaFerida', id: c.id, tipo: c.tipo });
      } else if (ev.tipo === 'morte') {
        for (const d of ev.drops ?? [])
          mundoItens.soltar(d.item, d.qtd, c.x, c.y + 0.5, c.z, rngDrops);
        // derrotada é só a que caiu num golpe (o sol que desfaz o espectro não conta no diário)
        eventosGerais.push({ e: 'criaturaMorreu', id: c.id, tipo: c.tipo, drops: golpe });
      } else if (ev.tipo === 'som') {
        eventosGerais.push({ e: 'criaturaSom', id: c.id, tipo: c.tipo });
      } else if (ev.tipo === 'ovo') {
        // a galinha criada botou: o ovo cai do lado dela
        mundoItens.soltar('ovo', 1, c.x, c.y + 0.3, c.z, rngCriacao);
        ovosPostos++;
        eventosGerais.push({ e: 'botouOvo', id: c.id, x: c.x, y: c.y, z: c.z });
      } else if (ev.tipo === 'espantada' && atacado) {
        // a criatura da noite mansa fugiu de quem chegou perto (o diário conta como espantar)
        atacado.eventos.push({ e: 'espantou', id: c.id, tipo: c.tipo });
      }
    }
  }

  function atacar(j: Jogador, c: Extract<Comando, { t: 'atacar' }>): void {
    const cr = criatura(c.criatura);
    if (!cr || Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA) return;
    // morador não apanha
    if (cr.morador) return;
    // spec 016: o bicho criado ou domado do amigo também não (só quem criou e o dono do mundo)
    if ((cr.criado || cr.domada) && !podeLevarBicho(j.id, cr, donoDoMundo)) {
      j.eventos.push(recusaBicho('atacar', cr));
      return;
    }
    const p = j.inventario.obter(c.slot);
    const f = ferramentaDe(p);
    const dano = f ? (f.tipo === 'espada' ? f.dano : Math.max(2, f.dano)) : 1;
    tratarCriaturas(populacao.ferir(cr, dano, j.tel.x, j.tel.z), j, true);
    if (modo === 'sobrevivencia' && f && p?.dur !== undefined) {
      const dur = p.dur - (f.tipo === 'espada' ? 1 : 2);
      j.inventario.definir(c.slot, dur > 0 ? { ...p, dur } : null);
    }
  }

  function domar(j: Jogador, c: Extract<Comando, { t: 'domar' }>): void {
    const cr = criatura(c.criatura);
    const p = j.inventario.obter(c.slot);
    if (!cr || cr.tipo !== 'raposa' || cr.domada || !domaCom(estiloMundo().domar, p?.item)) return;
    if (Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA) return;
    if (modo === 'sobrevivencia') j.inventario.remover(c.slot, 1);
    // spec 016: a raposa é de quem domou (o dono do mundo não entra: sem dono, é dele)
    if (populacao.domar(cr, j.id === donoDoMundo ? undefined : j.id))
      j.eventos.push({ e: 'domou', id: cr.id, tipo: cr.tipo });
  }

  /**
   * Dar comida a um bicho (spec 013): a comida tem que estar mesmo na mão (no inventário do
   * núcleo). O bicho vira criado (gasta 1 na sobrevivência); se já era, ganha carinho e a
   * casa passa a ser onde está, sem gastar nada.
   */
  /** Spec 015: moradores que vão acenar de volta (no passo `passo`). */
  let respostasGesto: { passo: number; criatura: number; gesto: IdGesto; voz: boolean }[] = [];

  /** Manda o gesto a quem está perto de (x, z), menos a quem fez. */
  function espalharGesto(
    x: number,
    z: number,
    ev: Extract<EventoNucleo, { e: 'gesto' }>,
    menos?: Jogador,
  ): void {
    for (const o of jogadores.values())
      if (
        o !== menos &&
        Math.abs(o.tel.x - x) < RAIO_VER_GESTO &&
        Math.abs(o.tel.z - z) < RAIO_VER_GESTO
      )
        o.eventos.push(ev);
  }

  /** A aparência passada a limpo, em texto (as chaves saem sempre na mesma ordem). */
  const chaveAparencia = (a: unknown): string => JSON.stringify(normalizarAparencia(a));

  function aplicarAparencia(j: Jogador, a: Record<string, unknown>): void {
    j.perfil = { ...j.perfil, aparencia: a };
    j.passoAparencia = n;
    perfisSujos = true;
  }

  /**
   * Auditoria 017: o editor manda a aparência a cada toque. A igual à de agora é ignorada (não
   * refaz o boneco de ninguém); fora isso, no máximo uma a cada `INTERVALO_APARENCIA` por
   * jogador. A que chega dentro da janela fica guardada (só a última) e entra quando a janela
   * fecha: o visual final sempre chega.
   */
  function pedirAparencia(j: Jogador, a: Record<string, unknown>): void {
    const chave = chaveAparencia(a);
    if (chave === chaveAparencia(j.perfil.aparencia)) {
      j.aparenciaPendente = null;
      return;
    }
    if ((n - j.passoAparencia) * PASSO < INTERVALO_APARENCIA - 1e-9) {
      j.aparenciaPendente = a;
      return;
    }
    j.aparenciaPendente = null;
    aplicarAparencia(j, a);
  }

  /** A aparência guardada entra quando a janela do jogador fecha. */
  function aparenciasPendentes(): void {
    for (const j of jogadores.values()) {
      const a = j.aparenciaPendente;
      if (!a || (n - j.passoAparencia) * PASSO < INTERVALO_APARENCIA - 1e-9) continue;
      j.aparenciaPendente = null;
      aplicarAparencia(j, a);
    }
  }

  /**
   * Spec 015: um gesto da roda. Um por jogador a cada `INTERVALO_GESTO_NUCLEO` (o resto é
   * descartado sem aviso); desmaiado não gesticula. Os amigos perto veem; o morador perto
   * vira e acena de volta; "chamar" traz a raposa domada e os bichos criados.
   */
  function gesto(j: Jogador, g: IdGesto): void {
    if (j.sobrevivencia.estado.morto) return;
    if ((n - j.passoGesto) * PASSO < INTERVALO_GESTO_NUCLEO - 1e-9) return;
    j.passoGesto = n;
    const { x, y, z } = j.tel;
    espalharGesto(x, z, { e: 'gesto', gesto: g, jogador: j.id }, j);
    if (moradorResponde(g)) {
      const perto: [number, number][] = [];
      for (const c of populacao.lista) {
        if (c.tipo !== 'morador' || c.estado === 'morrendo' || Math.abs(c.y - y) > 4) continue;
        const d = Math.hypot(c.x - x, c.z - z);
        if (d <= RAIO_RESPOSTA_MORADOR) perto.push([d, c.id]);
      }
      perto.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      perto.slice(0, MORADORES_QUE_RESPONDEM).forEach(([, id], i) => {
        const c = criatura(id)!;
        // para, vira para quem acenou e acena depois de um instante
        c.yawAlvo = Math.atan2(x - c.x, z - c.z);
        c.pausaGesto = ATRASO_RESPOSTA + 2.2;
        respostasGesto.push({
          passo: n + Math.round(ATRASO_RESPOSTA / PASSO),
          criatura: id,
          gesto: 'acenar',
          voz: i === 0,
        });
      });
    } else if (g === 'chamar') {
      // spec 016: vêm só os bichos de quem chamou (o dono do mundo chama todos); se só
      // havia bicho dos outros por perto, o aviso diz de quem é
      const r = populacao.chamar(x, y, z, j.id);
      if (r.vem === 0 && r.deOutro) j.eventos.push(recusaBicho('chamar', r.deOutro));
    }
  }

  /** Os moradores que chegou a hora de acenar de volta. */
  function responderGestos(): void {
    if (!respostasGesto.length) return;
    const fica: typeof respostasGesto = [];
    for (const r of respostasGesto) {
      if (r.passo > n) {
        fica.push(r);
        continue;
      }
      const c = criatura(r.criatura);
      if (!c || c.estado === 'morrendo') continue;
      espalharGesto(c.x, c.z, {
        e: 'gesto',
        gesto: r.gesto,
        criatura: c.id,
        ...(r.voz ? { voz: true } : {}),
      });
    }
    respostasGesto = fica;
  }

  /** O aviso "esse bichinho é da Ana" (spec 016). */
  function recusaBicho(
    motivo: string,
    cr: { dono?: string },
  ): Extract<EventoNucleo, { e: 'recusa' }> {
    const dono = cr.dono ?? donoDoMundo;
    const apelido = dono ? apelidoDe(dono) : undefined;
    return {
      e: 'recusa',
      comando: 0,
      motivo,
      protecao: apelido ? { motivo: 'bicho', dono: apelido } : { motivo: 'bicho' },
    };
  }

  /** Passo em que cada bicho ganhou comida por último (os corações têm intervalo). */
  const ultimaComida = new Map<number, number>();
  function alimentar(j: Jogador, c: Extract<Comando, { t: 'alimentar' }>): void {
    const cr = criatura(c.criatura);
    const p = j.inventario.obter(c.slot);
    if (
      !cr ||
      cr.estado === 'morrendo' ||
      !viraCriado(cr.tipo) ||
      !comeEsse(cr.tipo, p?.item) ||
      j.sobrevivencia.estado.morto ||
      Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA
    )
      return;
    // criar bicho novo é mexer no mundo (como arar e plantar): quem só passeia não cria
    if (!cr.criado && !j.constroi) {
      j.eventos.push({ e: 'recusa', comando: 0, motivo: 'visitante' });
      return;
    }
    // o já criado ganha corações no máximo uma vez por segundo (senão um clique repetido
    // enchia todo mundo de eventos e vozes)
    if (cr.criado) {
      const ultima = ultimaComida.get(cr.id);
      if (ultima !== undefined && (n - ultima) * PASSO < INTERVALO_COMIDA) return;
    }
    // spec 016: o bicho de outra pessoa ganha carinho, mas continua morando onde mora (e o
    // aviso diz de quem é); o novo é de quem deu a comida
    const meu = podeLevarBicho(j.id, cr, donoDoMundo);
    const r = populacao.criar(cr, j.id === donoDoMundo ? undefined : j.id, meu);
    if (r === 'ja' && !meu) j.eventos.push(recusaBicho('alimentar', cr));
    if (r === 'limite') {
      j.eventos.push({ e: 'criacaoRecusada', motivo: 'limite', aviso: AVISO_LIMITE });
      return;
    }
    if (r === 'nao') return;
    ultimaComida.set(cr.id, n);
    // spec 031: o bicho do pasto que comeu sai andando contente (a trilha vai para o outro)
    if (r === 'novo' && bichosDoPasto.has(cr.id)) cr.satisfeito = 7;
    if (ultimaComida.size > 256) ultimaComida.delete(ultimaComida.keys().next().value as number);
    if (r === 'novo' && modo === 'sobrevivencia') j.inventario.remover(c.slot, 1);
    // spec 023: dar comida conta para o amigo dos bichos; o mesmo bicho, só depois de 1 minuto
    // (sem limite por dia, decisão do dono)
    {
      const k = `${j.id}:${cr.id}`;
      const ultima = almaBichos.get(k);
      if (ultima === undefined || (n - ultima) * PASSO >= ESPERA_MESMO_BICHO - 1e-9) {
        almaBichos.delete(k);
        almaBichos.set(k, n);
        if (almaBichos.size > 512) almaBichos.delete(almaBichos.keys().next().value as string);
        almaEvento(j.id, `criou:${cr.tipo}`);
      }
    }
    for (const o of jogadores.values())
      o.eventos.push({
        e: 'alimentou',
        id: cr.id,
        tipo: cr.tipo,
        x: cr.x,
        y: cr.y,
        z: cr.z,
        novo: r === 'novo',
        meu: o === j,
      });
  }

  function trocar(j: Jogador, c: Extract<Comando, { t: 'trocar' }>): void {
    const cr = criatura(c.criatura);
    const t = TROCAS[c.profissao]
      ? trocasDoMundo(c.profissao, estiloMundo()).find((x) => x.id === c.troca)
      : undefined;
    if (!t || !cr?.morador || cr.morador.profissao !== c.profissao) {
      j.eventos.push({ e: 'trocaRecusada', motivo: 'morador' });
      return;
    }
    if (Math.hypot(cr.x - j.tel.x, cr.z - j.tel.z) > ALCANCE_CRIATURA + 3) {
      j.eventos.push({ e: 'trocaRecusada', motivo: 'longe' });
      return;
    }
    const ok = fazerTroca(j.inventario, t, (item, qtd) =>
      mundoItens.soltar(item, qtd, j.tel.x, j.tel.olhos - 1, j.tel.z, rngDrops),
    );
    j.eventos.push(
      ok
        ? { e: 'trocou', profissao: c.profissao, troca: t.id }
        : { e: 'trocaRecusada', motivo: 'faltam' },
    );
    if (ok) almaEvento(j.id, `trocou:${c.profissao}`);
  }

  /**
   * Spec 032: comer vale em todo modo. A refeição come no começo (tira da mochila e, na
   * sobrevivência, sobe a fome; de barriga cheia ela fica no máximo) e a tela faz as três
   * mordidas; outra refeição só depois de `DURACAO_REFEICAO`. No criativo é brincadeira (sem
   * conta), mas a comida acaba como de verdade.
   */
  function comer(j: Jogador, c: Extract<Comando, { t: 'comer' }>): void {
    if (j.sobrevivencia.estado.morto) return;
    const p = j.inventario.obter(c.slot);
    const comida = p ? obterItem(p.item)?.comida : undefined;
    if (!p || !comida) return;
    const t = n * PASSO;
    if (j.comendo && t < j.comendo.ate) return;
    if (modo === 'sobrevivencia') j.sobrevivencia.comer(comida.fome, comida.saturacao);
    j.inventario.remover(c.slot, 1);
    j.comendo = { item: p.item, ate: t + DURACAO_REFEICAO };
    j.eventos.push({ e: 'comeu', item: p.item });
    j.acoes[2]++;
  }

  /**
   * Spec 016: "Voltar para casa" leva o jogador à cama (ou ao ponto de nascer), sem curar e
   * sem mexer no inventário: é a saída de quem ficou cercado. Quem desmaiou usa o renascer;
   * entre duas voltas, ESPERA_VOLTA_CASA segundos (o aviso diz para esperar).
   */
  function voltarCasa(j: Jogador): void {
    if (j.sobrevivencia.estado.morto) return;
    if ((n - j.passoVoltaCasa) * PASSO < ESPERA_VOLTA_CASA - 1e-9) {
      j.eventos.push({ e: 'recusa', comando: 0, motivo: 'voltarCasa' });
      return;
    }
    j.passoVoltaCasa = n;
    j.saltoPermitido = true;
    j.eventos.push({ e: 'teleporte', x: j.spawn.x, z: j.spawn.z });
  }

  /** Spec 021: o mundo como o lugar do pulo o vê (blocos, proteção da 016 e donos). */
  const mundoDoPulo: MundoDoPulo = {
    // spec 026: nunca cair dentro de um carro ou banco da Vila Neon
    bloco: comPecas(
      (x, y, z) => mundo.bloco(x, y, z),
      planoVila ? (x, y, z) => celulaTomadaPelaVila(planoVila, x, y, z) : null,
    ),
    protecao: (x, y, z) => protecao.em(x, y, z),
    dono: (x, y, z) => donoNaCelula(edicoes, x, y, z, donoDoMundo),
  };

  /**
   * Spec 021: "pular para perto" do amigo. Não pede licença; o que protege é a regra da 016
   * (nunca cair dentro do que o mundo ou outra pessoa construiu). Não leva itens nem cura;
   * na sobrevivência não vale para quem está caído nem em combate (dano há menos de
   * COMBATE_PULO s); entre dois, ESPERA_PULO s. Sem lugar seguro: recusa, e a carinha
   * balança "não" no cliente.
   */
  function pularPerto(j: Jogador, alvo: string): void {
    const recusa = () => j.eventos.push({ e: 'recusa', comando: 0, motivo: 'pularPerto' });
    const o = jogadores.get(alvo);
    if (!o || o === j || j.sobrevivencia.estado.morto || o.sobrevivencia.estado.morto)
      return void recusa();
    if ((n - j.passoPulo) * PASSO < ESPERA_PULO - 1e-9) return void recusa();
    if (modo === 'sobrevivencia' && (n - j.passoDano) * PASSO < COMBATE_PULO - 1e-9)
      return void recusa();
    const l = lugarDoPulo(mundoDoPulo, j.id, j.tel, o.tel);
    if (!l) return void recusa();
    j.passoPulo = n;
    j.saltoPermitido = true;
    j.destinoSalto = { x: l[0], z: l[2], ate: n + Math.round(3 / PASSO) };
    j.eventos.push({ e: 'teleporte', x: l[0], z: l[2], y: l[1], pulo: alvo });
  }

  /** Spec 021: "vem cá!" para todos da sala (não só os 48 blocos do gesto). */
  function chamarAmigos(j: Jogador): void {
    if (j.sobrevivencia.estado.morto) return;
    if ((n - j.passoChamar) * PASSO < ESPERA_CHAMAR - 1e-9) return;
    j.passoChamar = n;
    for (const o of jogadores.values()) if (o !== j) o.eventos.push({ e: 'chamado', de: j.id });
  }

  /** Mais rápido que isto é teletransporte (blocos por segundo, com folga). */
  const VEL_MAX = modo === 'criativo' ? 40 : 14;
  function telemetria(j: Jogador, c: Telemetria): void {
    const { quedas, pulos, golpes } = c;
    // spec 021: o pulo para perto vale por uns segundos (o cliente mostra o puf antes de ir)
    const destino = j.destinoSalto && n <= j.destinoSalto.ate ? j.destinoSalto : null;
    const chegouNoDestino = !!destino && Math.hypot(c.x - destino.x, c.z - destino.z) <= 8;
    // depois de entrar ou renascer, a primeira posição ainda tem que ser perto de onde
    // o núcleo sabe que o jogador está (ou do ponto de renascer)
    if (!confiar && !depuracao && j.saltoPermitido) {
      const pertoDe = (x: number, z: number) => Math.hypot(c.x - x, c.z - z) <= 80;
      if (!pertoDe(j.tel.x, j.tel.z) && !pertoDe(j.spawn.x, j.spawn.z) && !chegouNoDestino) {
        j.eventos.push({ e: 'teleporte', x: j.tel.x, z: j.tel.z, y: j.tel.y });
        return;
      }
    }
    // na nuvem a posição tem que ser possível: andar, correr, voar e cair, não saltar
    if (!confiar && !depuracao && !j.saltoPermitido && !chegouNoDestino) {
      // ficar calado não dá direito a saltar mais longe depois
      const dt = Math.min((n - j.passoTelemetria) * PASSO, 1) + 0.3;
      const horiz = Math.hypot(c.x - j.tel.x, c.z - j.tel.z);
      const sobe = c.y - j.tel.y;
      if (
        !Number.isFinite(c.x + c.y + c.z) ||
        horiz > VEL_MAX * dt + 2 ||
        sobe > VEL_MAX * dt + 2
      ) {
        j.eventos.push({ e: 'teleporte', x: j.tel.x, z: j.tel.z, y: j.tel.y });
        return;
      }
    }
    j.saltoPermitido = false;
    if (chegouNoDestino || (j.destinoSalto && n > j.destinoSalto.ate)) j.destinoSalto = null;
    j.passoTelemetria = n;
    j.tel = { ...c, quedas: [], pulos: 0, golpes: 0 };
    if (golpes > 0) j.acoes[0] += Math.min(golpes, 20);
    for (let i = 0; i < golpes; i++) j.sobrevivencia.acao();
    if (modo !== 'sobrevivencia' || j.sobrevivencia.estado.morto) return;
    for (const q of quedas) if (q > 0) j.sobrevivencia.queda(q);
    for (let i = 0; i < pulos; i++) j.sobrevivencia.pulo(c.correndo);
  }

  function depurar(j: Jogador, d: Depuracao): void {
    switch (d.f) {
      case 'invocar': {
        const c = populacao.adicionar(d.tipo, d.x, d.y, d.z);
        if (d.domada && c.tipo === 'raposa') c.domada = true;
        // spec 016: o bicho criado pelo atalho é de quem chamou o atalho (como dar comida)
        if (d.criado) populacao.criar(c, j.id === donoDoMundo ? undefined : j.id);
        if (d.domada && c.tipo === 'raposa' && j.id !== donoDoMundo) c.dono = j.id;
        break;
      }
      case 'clima':
        clima.definir(d.tipo);
        break;
      case 'dia':
        dia = Math.max(0, Math.floor(d.dia));
        break;
      case 'hora':
        hora = normalizarHora(d.hora);
        break;
      case 'pausarDia':
        pausado = d.pausar;
        break;
      case 'soltarItem':
        mundoItens.soltar(d.item, d.qtd, d.x, d.y, d.z, rngDrops, d.dur);
        break;
      case 'spawn':
        j.spawn = { x: d.x, z: d.z };
        break;
      case 'dano':
        j.sobrevivencia.dano(d.qtd, d.causa, true);
        break;
      case 'crescer':
        // testes e capturas: a lavoura avança como se tantos segundos tivessem passado
        crescer(Math.min(Math.max(0, Number(d.segundos) || 0), 3600));
        break;
      case 'kit':
        preencherKit(j.inventario, [...SLOTS.map((s) => s.bloco), ...KIT_EXTRA]);
        j.inventarioSujo = true;
        break;
      case 'pularShow':
        vila?.pularShow(Number(d.s) || 0);
        break;
    }
  }

  /** Tira do que o jogador tem (primeiro das mãos, depois da mochila); devolve quanto tirou. */
  function retirar(
    j: Jogador,
    item: string,
    qtd: number,
    /** Slot da mochila de onde tirar primeiro (Q tira do que está na mão). */
    preferir?: number,
  ): { item: string; qtd: number; dur?: number }[] {
    let falta = Math.max(0, Math.floor(qtd));
    const tirados: { item: string; qtd: number; dur?: number }[] = [];
    const de = (ler: (i: number) => Slot, gravar: (i: number, p: Slot) => void, n: number) => {
      for (let i = 0; i < n && falta > 0; i++) {
        const p = ler(i);
        if (!p || p.item !== item) continue;
        const t = Math.min(falta, p.qtd);
        gravar(i, p.qtd - t > 0 ? { ...p, qtd: p.qtd - t } : null);
        tirados.push({ item, qtd: t, dur: p.dur });
        falta -= t;
      }
    };
    if (preferir !== undefined && j.inventario.obter(preferir)?.item === item)
      de(
        (i) => (i === 0 ? j.inventario.obter(preferir) : null),
        (_i, p) => j.inventario.definir(preferir, p),
        1,
      );
    de(
      (i) => j.transito[i] ?? null,
      (i, p) => {
        j.transito[i] = p;
      },
      j.transito.length,
    );
    de(
      (i) => j.inventario.obter(i),
      (i, p) => j.inventario.definir(i, p),
      j.inventario.slots.length,
    );
    j.transitoSujo = true;
    j.inventarioSujo = true;
    return tirados;
  }

  /** Onde e com que velocidade sai um item jogado para a frente (yaw: para onde o boneco olha). */
  function arremesso(j: Jogador, yaw: number) {
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    return {
      de: j.id,
      x: j.tel.x + fx * 0.35,
      y: j.tel.olhos - 0.45,
      z: j.tel.z + fz * 0.35,
      vx: fx * VELOCIDADE_ARREMESSO,
      vy: 2.6,
      vz: fz * VELOCIDADE_ARREMESSO,
    };
  }

  function comando(id: string, bruto: Comando): void {
    const j = jogadores.get(id);
    if (!j) return;
    // na nuvem, mensagem fora do formato (números absurdos, tamanhos enormes) não entra
    const c = confiar ? bruto : sanear(bruto);
    if (!c) return;
    if ('id' in c && typeof c.id === 'number') j.ack = Math.max(j.ack, c.id);
    switch (c.t) {
      case 'jogador':
        telemetria(j, c);
        break;
      case 'quebrar':
        quebrar(j, c);
        break;
      case 'colocar':
        colocar(j, c);
        break;
      case 'arar':
        arar(j, c);
        break;
      case 'editar':
        editarLote(j, c);
        break;
      case 'usar':
        usar(j, c);
        break;
      case 'fecharConteiner':
        j.conteiner = null;
        j.conteinerSujo = true;
        break;
      case 'transacao':
        transacao(j, c);
        break;
      case 'soltar': {
        // jogado de propósito (dar a um amigo): sai na frente do boneco, para onde ele olha,
        // e quem jogou só pega de volta depois de um tempinho
        const arr = c.jogar ? arremesso(j, c.jogar.yaw) : undefined;
        for (const p of c.itens) {
          if (confiar) {
            if (arr) mundoItens.soltar(p.item, p.qtd, arr.x, arr.y, arr.z, rngDrops, p.dur, arr);
            else mundoItens.soltar(p.item, p.qtd, c.x, c.y, c.z, rngDrops, p.dur);
            continue;
          }
          // na nuvem só sai o que o jogador tem, com a durabilidade que tem
          for (const t of retirar(j, p.item, p.qtd, c.jogar?.slot))
            if (arr) mundoItens.soltar(t.item, t.qtd, arr.x, arr.y, arr.z, rngDrops, t.dur, arr);
            else
              mundoItens.soltar(
                t.item,
                t.qtd,
                j.tel.x,
                j.tel.olhos - 0.4,
                j.tel.z,
                rngDrops,
                t.dur,
              );
        }
        break;
      }
      case 'atacar':
        atacar(j, c);
        break;
      case 'domar':
        domar(j, c);
        break;
      case 'alimentar':
        alimentar(j, c);
        break;
      case 'falar': {
        const cr = criatura(c.criatura);
        if (cr?.morador) cr.yawAlvo = Math.atan2(j.tel.x - cr.x, j.tel.z - cr.z);
        // spec 026: o vocalista dá o pôster da banda (uma vez por mundo a cada criança)
        if (cr && vila) vila.falou(j.id, cr);
        break;
      }
      case 'trocar':
        trocar(j, c);
        break;
      case 'comer':
        comer(j, c);
        break;
      case 'renascer':
        // na nuvem só quem desmaiou renasce (senão seria cura e teletransporte de graça)
        if (!confiar && !j.sobrevivencia.estado.morto) break;
        j.saltoPermitido = true;
        j.sobrevivencia.renascer();
        j.eventos.push({ e: 'teleporte', x: j.spawn.x, z: j.spawn.z });
        break;
      case 'voltarCasa':
        voltarCasa(j);
        break;
      case 'pularPerto':
        pularPerto(j, c.alvo);
        break;
      case 'chamarAmigos':
        chamarAmigos(j);
        break;
      case 'conferir':
        for (const q of c.celulas.slice(0, 500)) corrigir(j, q.x, q.y, q.z);
        break;
      case 'depurar':
        if (depuracao) depurar(j, c.d);
        break;
      case 'gesto':
        gesto(j, c.gesto);
        break;
      case 'aparencia':
        pedirAparencia(j, c.aparencia);
        break;
      case 'comprarBanca':
        comprarBanca(j, c);
        break;
      case 'almaFixar': {
        // spec 023: a missão do cartão do HUD (só uma aberta; null volta à primeira)
        const e = almaDe(j.id);
        if (e && mundoAlma && fixar(e, mundoAlma, c.missao)) pedirQuadroAlma(j.id);
        // spec 031: escolheu (ou escolheu de novo) uma missão do canto: o que é dela volta
        prepararCanto(j, c.missao);
        // spec 026: a missão da Vila Neon escolhida de novo: o que é dela volta ao lugar
        if (e && mundoAlma && missaoAberta(j.id, c.missao ?? '')) vila?.preparar(c.missao, j.id);
        break;
      }
      case 'vila': {
        // spec 026: a caixa do palco (brinquedo fora do show; o módulo confere o lugar e o limite)
        // e, no parque (parte 2), sentar no brinquedo, sair, o empurrão da roda e o controle do
        // carrinho do bate-bate
        if (c.a === 'caixa') vila?.comando(j.id, { a: 'caixa', i: c.i });
        else if (c.a === 'sentar') vila?.comando(j.id, { a: 'sentar', b: c.b });
        else if (c.a === 'guiar') vila?.comando(j.id, { a: 'guiar', x: c.x, z: c.z, n: c.n });
        // (etapa B: o balão fugido, a barraca de prendas, o feno, o cocho, a fita e a vitamina)
        else if (c.a === 'balao' || c.a === 'prenda') vila?.comando(j.id, { a: c.a, i: c.i });
        // (parte 3: o trilho da rampa de skate, para um lado)
        else if (c.a === 'rampa') vila?.comando(j.id, { a: 'rampa', l: c.l });
        // (parte 3B: o brinquedo espalhado do quarto)
        else if (c.a === 'brinquedo') vila?.comando(j.id, { a: 'brinquedo', i: c.i });
        // (spec 032: comprar o lanche de uma barraca)
        else if (c.a === 'comprar') vila?.comando(j.id, { a: 'comprar', i: c.i });
        else vila?.comando(j.id, { a: c.a });
        break;
      }
      case 'salvar':
        // o anfitrião responde (precisa do pedido)
        break;
    }
    // spec 014: o bloco que entrou numa obra (o progresso, ou a obra feita)
    conferirObras();
  }

  /** Bicho na faixa: segundos ali (passou de 2 s, ganha um destino fora dela). */
  const bichosNaRua = new Map<number, number>();
  function cuidarDoTransito(dt: number): void {
    if (!transito || !cidade) return;
    const pessoas: PessoaNaRua[] = [];
    for (const o of jogadores.values()) {
      if (o.sobrevivencia.estado.morto) continue;
      pessoas.push({ x: o.tel.x, y: o.tel.y, z: o.tel.z, crianca: true });
    }
    const pl = cidade.plana;
    for (const c of populacao.lista) {
      if (c.dissolver > 0 || c.x < pl.x0 || c.x > pl.x1 + 1 || c.z < pl.z0 || c.z > pl.z1 + 1)
        continue;
      pessoas.push({ x: c.x, y: c.y, z: c.z, crianca: false, corpo: corpoNaRua(c.tipo, c.yaw) });
      if (c.morador || c.domada || c.criado || c.tipo === 'peixe') continue;
      if (!transito.pista(c.x, c.z)) {
        bichosNaRua.delete(c.id);
        continue;
      }
      const t = (bichosNaRua.get(c.id) ?? 0) + dt;
      bichosNaRua.set(c.id, t);
      // na rua: sai dela em 2 s, ou logo (meio segundo) com um veículo andando perto
      if (t < 2 && !(t >= 0.5 && transito.andandoPerto(c.x, c.z, 12))) continue;
      bichosNaRua.delete(c.id);
      const fora = foraDaRua(c.x, c.z);
      if (fora) {
        c.alvoX = fora[0];
        c.alvoZ = fora[1];
        // anda até lá (o passeio sorteia outro destino só quando o tempo acaba)
        c.estado = 'vagar';
        c.tempoEstado = 6;
      }
    }
    transito.passo(dt, pessoas);
    for (const e of transito.tirarEventos())
      eventosGerais.push({ e: 'veiculo', id: e.id, o: e.o, x: arred(e.x, 2), z: arred(e.z, 2) });
    const mud = transito.tirarMudados();
    if (mud.length)
      veiculosMudados = veiculosMudados.filter((p) => !mud.some((q) => q.id === p.id)).concat(mud);
  }
  /** A célula de calçada (ou grama) mais perto, fora da pista. */
  function foraDaRua(x: number, z: number): [number, number] | null {
    if (!transito) return null;
    const cx = Math.floor(x);
    const cz = Math.floor(z);
    for (let r = 1; r <= 8; r++)
      for (let dz = -r; dz <= r; dz++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          if (!transito.pista(cx + dx + 0.5, cz + dz + 0.5)) return [cx + dx + 0.5, cz + dz + 0.5];
        }
    return null;
  }

  function passo(dt = PASSO): void {
    n++;
    mundo.avancar(dt);
    if (!pausado) hora = normalizarHora(hora + dt / DURACAO_DIA);
    if (horaAnterior > 0.9 && hora < 0.1) dia++;
    horaAnterior = hora;
    const noite = noiteNaHora(hora);
    const raio = clima.atualizar(dt, estacaoDoDia(dia), noite < 0.5);
    if (raio) eventosGerais.push({ e: 'relampago', atrasoTrovao: raio.atrasoTrovao });

    aparenciasPendentes();
    let amanhece = false;
    for (const j of jogadores.values()) {
      if (j.querDormir > 0) j.querDormir = Math.max(0, j.querDormir - dt);
      if (j.sono > 0) {
        j.sono -= dt;
        if (j.sono <= 0) {
          j.sono = -1;
          amanhece = true;
        }
      }
    }
    if (amanhece) acordar();
    for (const j of jogadores.values()) {
      if (modo !== 'sobrevivencia') continue;
      j.sobrevivencia.atualizar(dt, {
        correndo: j.tel.correndo,
        andando: j.tel.vel > 0.5,
        submerso: j.tel.submerso,
      });
      if (j.tel.y < -20) j.sobrevivencia.dano(100, 'queda', true);
    }

    // criaturas e itens: cada um reage ao jogador mais perto (com um só, é ele)
    const lista = [...jogadores.values()];
    if (lista.length) {
      for (const o of lista) {
        o.corpo.x = o.tel.x;
        o.corpo.y = o.tel.y;
        o.corpo.z = o.tel.z;
        o.corpo.vivo = !o.sobrevivencia.estado.morto;
        o.corpo.mao = o.inventario.obter(o.tel.slot)?.item ?? null;
      }
      const ev = populacao.atualizar(
        dt,
        mundo.criaturas,
        lista.map((o) => o.corpo),
        noite,
      );
      tratarCriaturas(ev, lista[0]);
      const coletados = mundoItens.atualizar(
        dt,
        lista.map((o) => ({ x: o.tel.x, y: o.tel.y, z: o.tel.z, id: o.id })),
        (item, qtd, dur, quem) => lista[quem].inventario.adicionar(item, qtd, dur),
      );
      for (const c of coletados) {
        lista[c.quem].eventos.push({ e: 'coletou', item: c.item, qtd: c.qtd });
        // spec 023: só o ovo que a galinha pôs (o jogado no chão e pego de novo não conta)
        // spec 031: o ovinho do ninho do canto (só o que o canto pôs; pegar de novo não conta)
        if (c.marca?.startsWith(MARCA_OVO)) almaEvento(lista[c.quem].id, 'coletou:ovo:ninho');
        else if (c.item === 'ovo' && ovosPostos > 0) {
          const q = Math.min(c.qtd, ovosPostos);
          ovosPostos -= q;
          almaEvento(lista[c.quem].id, 'coletou:ovo', q);
        }
      }
    }

    // spec 015: moradores acenando de volta
    responderGestos();
    // spec 023: lugares novos, a cada meio segundo
    if (n % 10 === 0) cuidarDosLugares();
    // spec 023: o baú da banca entrega o que agora cabe, a cada segundo
    if (mundoAlma && n % 20 === 0) entregarBauBanca();
    // spec 031: a comida na mão perto do bicho do pasto, 4 vezes por segundo
    if (canto && n % 5 === 0) cuidarDoPasto();
    // spec 026: a Vila Neon (estojos, show, lhamas e moradores com posto)
    vila?.passo(n);

    // spec 014: o pedreiro do canteiro (aparece, acena e dá a colher), os moradores da cidade
    // e o cachorro da casinha
    cuidarDoPedreiro(dt);
    cuidarDaCidade(dt);
    // spec 014 (T13): os carrinhos e ônibus, e os bichos que ficam parados na rua
    cuidarDoTransito(dt);

    // a lavoura cresce com o mundo aberto (cada pé uma vez por segundo, com teto por passo)
    crescerAosPoucos(dt);

    // fornalhas trabalham mesmo com o painel fechado
    conteineres.atualizar(
      dt,
      (x, y, z) => mundo.bloco(x, y, z) === Bloco.FORNALHA_ACESA,
      (x, y, z, acesa) => {
        const atual = mundo.bloco(x, y, z);
        if (atual !== Bloco.FORNALHA && atual !== Bloco.FORNALHA_ACESA) return;
        editar(x, y, z, acesa ? Bloco.FORNALHA_ACESA : Bloco.FORNALHA, edicoes.obterMeta(x, y, z));
      },
    );
  }

  function ambiente(): Ambiente {
    return { hora, dia, clima: { ...clima.estado } as EstadoClima, pausado };
  }

  function vistaCriaturas(): CriaturaVista[] {
    return populacao.lista.map((c) => ({
      id: c.id,
      tipo: c.tipo,
      x: c.x,
      y: c.y,
      z: c.z,
      yaw: c.yaw,
      estado: c.estado,
      dissolver: c.dissolver,
      noChao: c.noChao,
      ferida: c.ferida,
      domada: c.domada,
      vida: c.vida,
      ...(c.criado ? { criado: true } : {}),
      ...((c.criado || c.domada) && c.dono ? { dono: c.dono } : {}),
      morador: c.morador
        ? { povoado: c.morador.povoado, n: c.morador.n, profissao: c.morador.profissao }
        : undefined,
    }));
  }

  function vistaItens(): ItemVisto[] {
    return mundoItens.itens.map((i) => ({
      id: i.id,
      item: i.item,
      qtd: i.qtd,
      x: i.x,
      y: i.y,
      z: i.z,
    }));
  }

  function vistaConteiner(j: Jogador): ConteinerVisto | null {
    const c = j.conteiner;
    if (!c) return null;
    if (c.tipo === 'bau')
      return {
        ...c,
        tipo: 'bau',
        slots: conteineres.bau(c.x, c.y, c.z, false).map((p) => (p ? { ...p } : null)),
      };
    const f = conteineres.fornalha(c.x, c.y, c.z);
    return { ...c, tipo: 'fornalha', fornalha: JSON.parse(JSON.stringify(f)) };
  }

  /** Monta o quadro de cada jogador e limpa o que já foi mandado. */
  function quadros(): Map<string, Quadro> {
    const out = new Map<string, Quadro>();
    const criaturas = vistaCriaturas();
    const itens = vistaItens();
    const amb = ambiente();
    const todos: JogadorVisto[] = [...jogadores.values()].map((o) => ({
      id: o.id,
      x: o.tel.x,
      y: o.tel.y,
      z: o.tel.z,
      yaw: o.tel.yaw,
      pitch: o.tel.pitch,
      vel: o.tel.vel,
      voando: o.tel.voando,
      noChao: o.tel.noChao,
      correndo: o.tel.correndo,
      mao: o.inventario.obter(o.tel.slot)?.item ?? null,
      acoes: [o.acoes[0], o.acoes[1], o.acoes[2]],
      // spec 032: o que está comendo (o amigo vê as mordidas na comida certa)
      ...(o.comendo && n * PASSO < o.comendo.ate ? { come: o.comendo.item } : {}),
    }));
    const perfis = perfisSujos
      ? Object.fromEntries([...jogadores.values()].map((o) => [o.id, o.perfil]))
      : undefined;
    perfisSujos = false;
    const relogioVeiculos = transito ? arred(transito.relogio) : 0;
    const vistaVila: VilaVista | null = vila ? vila.vista() : null;
    const todosPlanos = transito ? transito.planos() : null;
    for (const j of jogadores.values()) {
      const q: Quadro = { t: 'quadro', n, ack: j.ack, ambiente: amb, criaturas, itens };
      // spec 026: o estado da Vila Neon quando muda (e o relógio a cada segundo)
      // (com os arcos do rinque que este jogador já acendeu: a f4 é de cada um)
      if (vila && vistaVila && (vilaSuja || !j.iniciado || n % 20 === 0))
        q.vila = vila.vistaDe(j.id, vistaVila);
      // spec 026 (parte 2): os carrinhos do bate-bate, só para quem está perto da pista
      const carrinhos = vila?.bateDe(j.id, n);
      if (carrinhos) q.bate = carrinhos;
      // spec 014 (T13): o relógio dos veículos sempre; os planos inteiros para quem chega
      if (todosPlanos)
        q.veiculos = !j.iniciado
          ? { t: relogioVeiculos, p: todosPlanos.map((p) => ({ ...p })) }
          : veiculosMudados.length
            ? { t: relogioVeiculos, p: veiculosMudados }
            : { t: relogioVeiculos };
      // na nuvem a lista vai sempre (vazia também: quem saiu some da tela)
      if (!confiar || todos.length > 1) q.jogadores = todos.filter((o) => o.id !== j.id);
      if (perfis) q.perfis = perfis;
      if (!j.iniciado) {
        q.primeiro = true;
        j.iniciado = true;
        // tabela vazia não precisa ir no começo (é o que o cliente já supõe)
        if (j.versaoDonos < 0 && edicoes.donos.tamanho === 0) j.versaoDonos = edicoes.donos.versao;
      }
      // spec 016: quem chega recebe a tabela de donos inteira (se o "bem-vindo" já não
      // levou); depois, só o que entrou ou mudou
      if (j.versaoDonos !== edicoes.donos.versao) {
        if (j.versaoDonos < 0) q.donos = edicoes.donos.exportar();
        else q.donosNovos = edicoes.donos.mudadasDesde(j.versaoDonos);
        j.versaoDonos = edicoes.donos.versao;
      }
      const blocos = [...blocosMudados, ...j.correcoes];
      if (blocos.length) q.blocos = blocos;
      if (j.inventarioSujo) {
        q.inventario = {
          slots: j.inventario.slots.map((p) => (p ? { ...p } : null)),
          ackTransacao: j.ackTransacao,
        };
        if (j.transitoSujo) q.inventario.transito = j.transito.map((p) => (p ? { ...p } : null));
        j.inventarioSujo = false;
        j.transitoSujo = false;
      }
      // a fornalha aberta anda sozinha: vai em todo quadro
      if (j.conteinerSujo || j.conteiner?.tipo === 'fornalha') {
        q.conteiner = vistaConteiner(j);
        j.conteinerSujo = false;
      }
      const sob = JSON.stringify(j.sobrevivencia.estado);
      if (sob !== j.ultimaSobrevivencia) {
        j.ultimaSobrevivencia = sob;
        q.sobrevivencia = { ...j.sobrevivencia.estado };
      }
      // spec 023: a alma deste jogador (só ele recebe o que ganhou)
      const pa = almaPendente.get(j.id);
      if (pa && (ganhoTemAlgo(pa.r.ganho) || pa.r.missoes.length || pa.quadro))
        j.eventos.push({
          e: 'alma',
          missoes: pa.r.missoes,
          ganho: pa.r.ganho,
          ...(pa.quadro && mundoAlma
            ? { quadro: vistaAlmaMundo(almaDe(j.id), mundoAlma, vistaObra) }
            : {}),
        });
      const eventos = [...eventosGerais, ...j.eventos];
      if (eventos.length) q.eventos = eventos;
      j.eventos = [];
      j.correcoes = [];
      out.set(j.id, q);
    }
    blocosMudados = [];
    eventosGerais = [];
    veiculosMudados = [];
    almaPendente.clear();
    vilaSuja = false;
    return out;
  }

  /** Parte do salvamento que é do núcleo (o jogador local é o primeiro). */
  function salvar(): SalvoNucleo {
    const j = jogadores.values().next().value as Jogador | undefined;
    const out: Record<string, unknown> = {
      povoados: { semPovoado },
      // spec 031: o lugar do canto das missões (só nos mundos que têm canto)
      ...(candidatosCanto.length ? { canto: { escolha: escolhaCanto } } : {}),
      itensSoltos: mundoItens.salvar(),
      criaturas: populacao.salvar(),
      clima: clima.salvar(),
      dia,
      conteineres: conteineres.salvar(),
      lavoura: Object.fromEntries([...lavoura].map(([k, c]) => [k, Math.round(c.p * 100) / 100])),
    };
    // spec 016: quem colocou blocos (fora o dono); mundo sem amigos grava igual a antes
    if (edicoes.donos.tamanho > 0) out['donos'] = edicoes.donos.exportar();
    // spec 014: as obras do canteiro (mundo sem obra começada grava igual a antes)
    if (obras.size > 0) out['obras'] = obrasSalvas();
    // spec 023: a alma de cada jogador neste mundo (mundo sem alma grava igual a antes)
    if (almas.size > 0) out['alma'] = JSON.parse(JSON.stringify(Object.fromEntries(almas)));
    // spec 026: a Vila Neon (instrumentos no palco, caixas acesas, quem já ganhou o pôster)
    if (vila) out['vila'] = vila.salvar();
    // na nuvem cada jogador é salvo à parte (dadosJogador); localmente vai junto do mundo
    if (j && confiar) {
      out['sobrevivencia'] = j.sobrevivencia.salvar();
      out['spawn'] = j.spawn;
      const inv = criarInventario();
      inv.carregar(j.inventario.salvar());
      for (const p of j.transito) if (p) inv.adicionar(p.item, p.qtd, p.dur);
      out['inventario'] = inv.salvar();
    }
    return { edicoes: edicoes.exportar(), hora, extras: out };
  }

  function obrasSalvas(): Record<string, ObraSalva> {
    const r: Record<string, ObraSalva> = {};
    for (const [k, o] of obras)
      r[String(k)] = {
        cheias: [...o.cheias],
        ajudantes: [...o.ajudantes],
        ...(o.feita ? { feita: true as const } : {}),
      };
    return r;
  }

  return {
    semente,
    modo,
    /** Spec 031: o lugar do canto das missões (o servidor da nuvem põe de volta ao trocar de sala). */
    escolhaCanto,
    /** Spec 014: as obras feitas deste mundo (o servidor da nuvem põe de volta ao trocar de sala). */
    get obrasFeitas(): readonly number[] {
      return feitasDoMundo();
    },
    /** Spec 014: as obras do canteiro como vão no salvamento e no "bem-vindo" da nuvem. */
    obras: obrasSalvas,
    /** Regiões sem povoado deste mundo (o servidor da nuvem põe de volta ao trocar de sala). */
    semPovoado: semPovoado as readonly string[],
    conectar,
    desconectar,
    dadosJogador,
    /**
     * Spec 016: a tabela de donos inteira já foi a este jogador por fora (o "bem-vindo" da
     * nuvem): o primeiro quadro não manda de novo, só o que mudar daqui em diante.
     */
    donosEnviados(id: string) {
      const j = jogadores.get(id);
      if (j) j.versaoDonos = edicoes.donos.versao;
    },
    /** Visitantes podem construir? (o dono decide) */
    definirConstrucao(id: string, pode: boolean) {
      const j = jogadores.get(id);
      if (j) j.constroi = pode;
    },
    /** Voltou da queda: o próximo quadro recomeça a sequência e leva tudo de novo. */
    reiniciarQuadros(id: string) {
      const j = jogadores.get(id);
      if (!j) return;
      j.iniciado = false;
      j.inventarioSujo = true;
      j.transitoSujo = true;
      j.conteinerSujo = true;
      j.ultimaSobrevivencia = '';
      // a tabela de donos vai de novo (a conexão nova pode ser outro navegador)
      j.versaoDonos = -1;
      perfisSujos = true;
      // spec 023: o quadro de missões também
      pedirQuadroAlma(id);
    },
    definirPerfil(id: string, perfil: PerfilJogador) {
      const j = jogadores.get(id);
      if (!j) return;
      j.perfil = perfil;
      edicoes.donos.renomear(id, perfil.apelido);
      if (id === donoDoMundo) apelidoDoMundo = perfil.apelido;
      perfisSujos = true;
    },
    /** Spec 016: id do dono do mundo (null: o núcleo não sabe; tudo vai para a tabela). */
    donoDoMundo,
    /**
     * Spec 016: quem colocou o bloco desta célula (null: terreno natural, ar ou célula sem
     * edição). O cliente faz a mesma conta com `donoNaCelula` na cópia dele.
     */
    donoDoBloco(x: number, y: number, z: number): string | null {
      return donoNaCelula(edicoes, x, y, z, donoDoMundo);
    },
    /** Apelido guardado de quem colocou blocos (mesmo fora do mundo agora). */
    apelidoDoDono(id: string): string | undefined {
      return apelidoDe(id);
    },
    /** Spec 016: a proteção do que o mundo construiu (a mesma conta do cliente). */
    protecao,
    get quantos() {
      return jogadores.size;
    },
    comando,
    passo,
    quadros,
    salvar,
    /** Leitura para testes (não use para mudar nada). */
    get estado() {
      return {
        n,
        hora,
        dia,
        pausado,
        clima: clima.estado,
        edicoes,
        mundo,
        populacao,
        mundoItens,
        conteineres,
        jogadores,
        lavoura,
        /** A criatura da noite deste mundo ('assusta' ou 'mansa'). */
        noite: noiteDoMundo,
        /** Spec 014 (T13): os veículos da cidade (null fora dela). */
        transito,
        /** Spec 023: o mundo da alma (null fora da Cidade e do Rancho) e a de cada jogador. */
        mundoAlma,
        almas,
        /** Spec 026: a Vila Neon (null fora dela). */
        vila,
      };
    },
  };
}
