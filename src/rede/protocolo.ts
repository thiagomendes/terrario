/**
 * Mensagens entre o navegador e o servidor da nuvem (spec 010), por fora das do núcleo:
 * entrar num mundo pelo código, criar um mundo na nuvem, o painel do dono e as recusas.
 * Depois do "bem-vindo", o que passa são os comandos e quadros do núcleo de sempre.
 */
import type { DadosMundo, ModoJogo } from '../jogo/mundos';
import type { EstiloMundo } from '../temas/tipos';
import type { Comando, Mensagem } from '../nucleo/protocolo';
import type { DonosExportados } from '../world/edicoes';
import type { ObraSalva } from '../nucleo/saneamento';

/**
 * Sobe quando estas mensagens mudam de formato. 3: spec 016 (dono nos blocos e tabela de
 * donos; o navegador de antes recebe "versão nova, recarregue"). 4: spec 014 (o canteiro de
 * obras: o evento `obra`, a colher e as obras no "bem-vindo"; os carrinhos e ônibus da
 * cidade: o campo `veiculos` do quadro e o evento `veiculo`, que vêm na mesma versão porque a
 * 014 ainda não foi publicada). 5: spec 021 (os comandos `pularPerto` e `chamarAmigos`, o
 * evento `chamado` e o `pulo` do teleporte). 6: spec 023 (os comandos `almaFixar` e
 * `comprarBanca`, os eventos `alma`, `almaCompra` e `almaCompraRecusada`; o campo `premium` da
 * aparência chega na mesma versão, porque a 023 ainda não foi publicada). 7: spec 031 (o canto
 * das missões muda a geração da Era dos Dinos e do Doce Reino em volta do nascer: o navegador
 * de antes veria outro chão que o servidor; e o campo `canto` do "bem-vindo"). 8: spec 026 (a
 * Vila Neon: o planejador do bairro e os blocos 103 a 116 mudam a geração; o comando `vila`, o
 * campo `vila` do quadro e os eventos do show; os patins na aparência). 9: spec 026, o show de
 * verdade (o formato das mensagens é o mesmo, mas o sentido mudou: o show de 6 min com a abertura,
 * a entrada e três músicas, a banda que anda pela coreografia, o acorde do toque com a música no
 * número e o atalho de teste `pularShow`; o navegador de antes desenharia e tocaria o show de 40 s
 * em cima do relógio do novo, então recebe "versão nova, recarregue"). 10: spec 026, o show
 * separado das missões (o comando `vila` só aceita a caixa: o toque no palco saiu; o evento
 * `vilaAcorde` saiu e o `vilaArco` entrou; o quadro `vila` ganhou os `arcos` de cada jogador; a
 * banda ganhou a tecladista e mudou de número; o público dobrou; os arcos do rinque entram nas
 * peças sólidas do bairro; a f3 do show virou a f4 da volta no rinque). 11: spec 026, parte 2 (o
 * Parque de diversões: o lote do nordeste muda a geração do bairro, e as peças sólidas dele; o
 * comando `vila` ganhou `sentar`, `sair`, `tum` e `roda`; o quadro `vila` ganhou o `parque` (quem
 * está sentado em qual cadeira e o empurrão da roda-gigante); os eventos `parqueSentou`,
 * `parqueDesceu`, `parqueTum` e `parqueRoda`; três moradores novos e as lhamas da fazendinha).
 * 12: spec 026, o bate-bate de guiar (a pista maior muda a geração do lote do parque; o comando
 * `vila` perdeu o `tum` e ganhou o `guiar`; o quadro ganhou o `bate`, os carrinhos que o núcleo
 * simula; o evento `parqueTum` agora é a batida de verdade, com o lugar e a força; quatro
 * moradores novos guiam carrinhos).
 * 13: spec 026, as missões do parque e os toques da Rua anos 80 (o comando `vila` ganhou o
 * `balao`, a `prenda`, o `feno`, o `cocho`, a `fita` e a `vitamina`; os eventos `vilaBalao`,
 * `vilaPrenda`, `vilaVovo` e `vilaLanche`; o quadro da vila ganhou o `bal` e o `balao`; as
 * missões f5 a f8; a vovó; os itens `vitamina`, `fita_video` e `pelucia`).
 * 14: spec 026, parte 3 (a Casa anos 80 por dentro e a pista de skate: o lote da casa e o do
 * sudeste mudam a geração do bairro e as peças sólidas dele; o comando `vila` ganhou a `tv`, o
 * `videocassete`, o `disco`, o `bau` e a `rampa`; o quadro da vila ganhou a `casa` (o canal, o
 * filme e o disco da sala) e a `rampa` (quem está no trilho); o `skate` na aparência; a vovó no
 * sofá; a menina do skate e o menino da BMX; os itens `ioio`, `piao` e `cubo_cores`).
 * 15: spec 026, parte 3, etapa B (as missões f9 a f12 da casa e da rampa: o comando `vila` ganhou
 * o `brinquedo` e o `bau` guarda com a f10 aberta; o quadro da vila ganhou o `qto`; os eventos
 * `vilaGuardou` e `vilaBolo`; a mesinha do bolo nas peças sólidas da casa; os itens `feno` (no
 * lugar do trigo da f2 e da f7) e `fatia_bolo`).
 */
export const VERSAO_REDE = 15;
/** Jogadores por mundo. */
export const MAX_JOGADORES = 8;

/** Quem joga: identidade anônima do aparelho (a chave nunca sai do navegador, só o pedido). */
export interface Identidade {
  id: string;
  chave: string;
  apelido: string;
  aparencia: Record<string, unknown>;
}

/** O que define um mundo na nuvem. */
export interface MundoNuvem {
  id: string;
  nome: string;
  semente: number;
  tema: string;
  modo: ModoJogo;
  versaoMundo: number;
  estilo: EstiloMundo;
}

export type PedidoCliente =
  | {
      t: 'entrar';
      versao: number;
      jogador: Identidade;
      /** Entrar num mundo que já existe. */
      codigo?: string;
      /** Ou criar um (com os dados de um mundo local, para levar para a nuvem). */
      criar?: Omit<MundoNuvem, 'id'> & { dados?: DadosMundo };
    }
  | { t: 'dono'; acao: 'expulsar'; id: string }
  | { t: 'dono'; acao: 'trocarCodigo' }
  | { t: 'dono'; acao: 'fechar'; fechado: boolean }
  | { t: 'dono'; acao: 'construir'; pode: boolean }
  /** Parar de jogar com amigos (spec 011): o mundo volta inteiro para o aparelho do dono. */
  | { t: 'dono'; acao: 'devolver' }
  /** Diário e mapa do jogador (guardados com os dados dele neste mundo). */
  | { t: 'guardar'; dados: unknown }
  | Comando;

export type MotivoRecusa =
  | 'codigo'
  | 'cheio'
  | 'fechado'
  | 'expulso'
  | 'versao'
  | 'limite'
  | 'identidade'
  | 'erro';

/** Estado da sala que o dono controla (todos recebem). */
export interface EstadoSala {
  codigo: string;
  fechado: boolean;
  constroem: boolean;
  dono: string;
}

export type RespostaServidor =
  | {
      t: 'bemvindo';
      mundo: MundoNuvem;
      sala: EstadoSala;
      voce: string;
      /** Muda quando a sala é aberta de novo (servidor recomeçou): o navegador recarrega. */
      instancia?: string;
      /** Diário e mapa deste jogador neste mundo. */
      guardado?: unknown;
      /** Edições de blocos do mundo e regiões sem povoado (o navegador monta o terreno igual). */
      edicoes: Record<string, Array<[number, number]>>;
      /** Spec 016: quem colocou os blocos ([id, apelido] na ordem dos índices das edições). */
      donos: DonosExportados;
      semPovoado: string[];
      /** Spec 031: o lugar do canto das missões (0 o melhor, -1 nenhum; o navegador gera igual). */
      canto?: number;
      /** Spec 014: as obras do canteiro da cidade (só quando alguma começou). */
      obras?: Record<string, ObraSalva>;
      /** Onde este jogador estava (ou o nascimento). */
      pos: { x: number; y: number; z: number; yaw: number; pitch: number };
    }
  | { t: 'recusado'; motivo: MotivoRecusa }
  | { t: 'sala'; sala: EstadoSala }
  | { t: 'expulso' }
  /** O mundo voltou para o aparelho do dono: os dados para gravar lá (só o dono recebe). */
  | { t: 'devolvido'; dados: DadosMundo }
  /** O dono parou de jogar com amigos: a sala acabou (os outros recebem). */
  | { t: 'encerrada' }
  /** O mesmo jogador abriu o mundo em outra aba ou aparelho: esta conexão para (sem reconectar). */
  | { t: 'substituido' }
  | Mensagem;
