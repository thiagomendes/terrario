/**
 * Estado do cliente, sem tela: o que ele sabe do mundo enquanto o núcleo é o dono.
 *
 * - Previsões: o que o jogador faz aparece na hora (bloco posto, porta aberta) e fica
 *   marcado até o núcleo confirmar; aí o valor oficial passa a mandar.
 * - Ordem: quadros chegam numerados e são aplicados em sequência, mesmo que a rede
 *   entregue fora de ordem; comandos saem numerados pelo mesmo motivo.
 * - Itens, criaturas, vida, dia e clima: cópias atualizadas a cada quadro.
 *
 * A cena usa isto para desenhar; os testes do protocolo usam direto, sem navegador.
 */
import type { Inventario } from '../jogo/inventario';
import type { EstadoClima } from '../jogo/clima';
import type { EstadoSobrevivencia } from '../jogo/sobrevivencia';
import type { Comando, EventoNucleo, Mensagem, Quadro, SalvoNucleo } from '../nucleo/protocolo';
import type { Conexao } from './conexao';
import { indiceDonoDe } from '../world/edicoes';
import { criarReplicaVeiculos } from './veiculos';
import { criarReplicaVila } from './vila';
import { criarReplicaBaile } from './baile';
import { PASSO } from '../nucleo/protocolo';
import type { BateVista } from '../jogo/bate';
import {
  criarReplicaCriaturas,
  criarReplicaItens,
  criarSincronizadorItens,
  type ConteinerReplica,
} from './replica';

export interface OpcoesEstadoCliente {
  conexao: Conexao;
  inventario: Inventario;
  /**
   * Aplica um bloco na cópia local (e refaz a malha). Devolve se mudou. `dono`: índice do dono
   * que o núcleo mandou (spec 016); nas previsões não vem e a célula fica com o que tinha.
   */
  aplicarBloco(
    x: number,
    y: number,
    z: number,
    bloco: number,
    meta: number,
    dono?: number,
  ): boolean;
  aoEvento?(e: EventoNucleo): void;
  /** Contêiner aberto mudou (novo: acabou de abrir). */
  aoConteiner?(c: ConteinerReplica | null, novo: boolean): void;
  /** Depois de aplicar cada quadro. */
  aoQuadro?(q: Quadro): void;
  clima: EstadoClima;
  dia: number;
  hora: number;
  sobrevivencia: EstadoSobrevivencia;
  /** Spec 035: o relógio da rede de segurança, em ms (os testes trocam). */
  agora?: () => number;
  /** Spec 035: a página está visível (sem `document`, sempre). */
  visivel?: () => boolean;
  /**
   * Spec 035: travou de novo depois das 2 ressincronizações. A página guarda o diário e
   * recarrega uma vez (se a marca deixar); a rede de segurança para de tentar.
   */
  aoDesistir?(): void;
}

/** Spec 035: os números da rede de segurança (ver a spec, seção 2). */
const TRAVADO_MS = 1000;
const TRAVADO_QUADROS = 10;
const SILENCIO_MS = 4000;
const VIGIA_MS = 1000;
/** Duas voltas do vigia mais longe que isto: a página estava ocupada (o silêncio é dela). */
const VIGIA_ATRASADO_MS = 2000;
const MAX_RESSINC_TRAVADO = 2;
const ESPERA_SEGUNDA_MS = 3000;
const ZERA_CONTA_MS = 60_000;
const SILENCIO_ENTRE_MS = 30_000;

const visivelPadrao = () =>
  typeof document === 'undefined' || document.visibilityState === 'visible';

export type EstadoCliente = ReturnType<typeof criarEstadoCliente>;

export function criarEstadoCliente(op: OpcoesEstadoCliente) {
  const { conexao } = op;
  let idComando = 0;
  let seq = 0;
  const proximoId = () => ++idComando;
  /** Células com previsão local ainda não confirmada (chave → id do comando). */
  const pendentes = new Map<string, number>();
  const celula = (x: number, y: number, z: number) => `${x},${y},${z}`;

  const ambiente = {
    hora: op.hora,
    dia: op.dia,
    clima: op.clima,
    pausado: false,
  };
  let sobrevivencia = op.sobrevivencia;

  function enviar(c: Comando): void {
    conexao.enviar({ ...c, seq: ++seq });
  }

  const sincronia = criarSincronizadorItens(op.inventario, enviar, proximoId);
  const criaturas = criarReplicaCriaturas();
  const itens = criarReplicaItens();
  /** Spec 014 (T14): os planos e o relógio dos veículos da cidade. */
  const veiculos = criarReplicaVeiculos();
  /** Spec 026: o estado da Vila Neon e o relógio do núcleo. */
  const vila = criarReplicaVila();
  /** Spec 027 (T18): a festa desta criança (as missões n1 a n5). */
  const baile = criarReplicaBaile();
  /** Spec 026 (parte 2): quem recebe os carrinhos do bate-bate (a cena, na Vila Neon). */
  let ouvinteBate: ((v: BateVista, t: number, agora: number) => void) | null = null;
  let conteiner: ConteinerReplica | null = null;
  let ultimoAckTransacao = 0;

  /** `dono`: índice do dono previsto (quem coloca prevê que é dele; sem: fica o da célula). */
  function prever(
    id: number,
    x: number,
    y: number,
    z: number,
    b: number,
    meta = 0,
    dono?: number,
  ): boolean {
    pendentes.set(celula(x, y, z), id);
    return op.aplicarBloco(x, y, z, b, meta, dono);
  }

  function aplicar(q: Quadro): void {
    const a = q.ambiente;
    ambiente.hora = a.hora;
    ambiente.dia = a.dia;
    ambiente.pausado = a.pausado;
    ambiente.clima = a.clima;
    // previsões confirmadas deixam de valer: o que o núcleo diz passa a mandar
    for (const [k, id] of pendentes) if (id <= q.ack) pendentes.delete(k);
    for (const b of q.blocos ?? []) {
      if (pendentes.has(celula(b.x, b.y, b.z))) continue;
      op.aplicarBloco(b.x, b.y, b.z, b.v & 255, (b.v >> 8) & 255, indiceDonoDe(b.v));
    }
    if (q.criaturas) criaturas.receber(q.criaturas);
    if (q.itens) itens.receber(q.itens);
    if (q.veiculos) veiculos.receber(q.veiculos, performance.now() / 1000, !!q.primeiro);
    if (q.vila) vila.receber(q.vila, performance.now() / 1000);
    if (q.baile) baile.receber(q.baile);
    // spec 026 (parte 2): os carrinhos do bate-bate (o relógio do quadro é o passo do núcleo)
    if (q.bate) ouvinteBate?.(q.bate, q.n * PASSO, performance.now() / 1000);
    if (q.inventario) {
      ultimoAckTransacao = q.inventario.ackTransacao;
      sincronia.inventario(q.inventario.slots, q.inventario.ackTransacao, q.inventario.transito);
    }
    if (q.conteiner !== undefined) {
      const antes = conteiner;
      conteiner = sincronia.conteiner(q.conteiner, ultimoAckTransacao);
      op.aoConteiner?.(conteiner, !!conteiner && conteiner !== antes);
    }
    if (q.sobrevivencia) sobrevivencia = q.sobrevivencia;
    for (const e of q.eventos ?? []) op.aoEvento?.(e);
    op.aoQuadro?.(q);
  }

  // quadros em ordem (n): a sequência começa no primeiro quadro deste jogador; os
  // adiantados esperam o que falta
  let proximoQuadro = -1;
  const adiantados = new Map<number, Quadro>();
  /** Quadros recebidos (testes: esperar o núcleo). */
  let quadrosRecebidos = 0;
  /**
   * Spec 035: a rede de segurança. Só com uma conexão que sabe ressincronizar (a da nuvem): o
   * servidor local e o canal dos testes não têm a corrida e nunca disparam nada.
   */
  const sabe = typeof conexao.ressincronizar === 'function';
  const agora = op.agora ?? (() => performance.now());
  const visivel = op.visivel ?? visivelPadrao;
  /** Desde quando nada é aplicado (o último aplicado, a criação ou o último reconferir). */
  let desdeAplicado = agora();
  let aplicouAlgum = false;
  /** O último quadro que chegou (aplicado ou não): o silêncio conta daqui. */
  let ultimoChegou = agora();
  /** Ressincronizações pelo travamento nesta conta (no máximo 2; zera com 60 s andando). */
  let travamentos = 0;
  let ultimoTravamento = -Infinity;
  let ultimoSilencio = -Infinity;
  let ressincronizacoes = 0;
  let desistiu = false;
  /** A última ressincronização foi pelo travamento (e não pelo silêncio). */
  let ultimaPeloTravamento = false;

  function ressincronizar(peloTravamento: boolean): void {
    ressincronizacoes++;
    ultimaPeloTravamento = peloTravamento;
    // a conexão primeiro: o `conferir` do reconferir espera na fila dela e vai na conexão nova
    conexao.ressincronizar!();
    proximoQuadro = -1;
    adiantados.clear();
    desdeAplicado = agora();
    ultimoChegou = desdeAplicado;
    reconferirPrevistas();
  }

  function medirTravamento(): void {
    if (!sabe || desistiu) return;
    // sem a conexão de pé, o `ressincronizar` dela não faz nada: nem mede, nem conta
    if (conexao.estado !== undefined && conexao.estado !== 'conectado') return;
    const t = agora();
    if (adiantados.size < TRAVADO_QUADROS || t - desdeAplicado < TRAVADO_MS) return;
    // travou de novo antes de 3 s da última: espera
    if (t - ultimoTravamento < ESPERA_SEGUNDA_MS) return;
    if (travamentos >= MAX_RESSINC_TRAVADO) {
      // o recarregar só vem daqui (o travamento com a conexão de pé), uma vez por página
      desistiu = true;
      op.aoDesistir?.();
      return;
    }
    travamentos++;
    ultimoTravamento = t;
    ressincronizar(true);
  }

  function receberQuadro(q: Quadro): void {
    quadrosRecebidos++;
    ultimoChegou = agora();
    if (q.primeiro) {
      proximoQuadro = q.n;
      // sobras de antes do `primeiro` não ficam presas no mapa
      for (const n of adiantados.keys()) if (n < q.n) adiantados.delete(n);
    }
    if (proximoQuadro >= 0 && q.n < proximoQuadro) return;
    adiantados.set(q.n, q);
    while (adiantados.has(proximoQuadro)) {
      const atual = adiantados.get(proximoQuadro)!;
      adiantados.delete(proximoQuadro);
      proximoQuadro++;
      aplicar(atual);
      desdeAplicado = agora();
      aplicouAlgum = true;
      // 60 s com os quadros andando: a conta do travamento volta a zero
      if (travamentos > 0 && desdeAplicado - ultimoTravamento >= ZERA_CONTA_MS) travamentos = 0;
    }
    medirTravamento();
  }

  /** O vigia do silêncio: nenhum quadro por 4 s com a página visível e a conexão de pé. */
  if (sabe) {
    let ultimaVolta = agora();
    const vigia = setInterval(() => {
      const t = agora();
      const atrasado = t - ultimaVolta > VIGIA_ATRASADO_MS;
      ultimaVolta = t;
      // escondida, ocupada ou sem a conexão de pé: o silêncio não é da rede (recomeça a contar)
      if (atrasado || !visivel() || conexao.estado !== 'conectado') {
        ultimoChegou = t;
        return;
      }
      if (!aplicouAlgum || t - ultimoChegou < SILENCIO_MS) return;
      // conta própria: fora das 2 do travamento, uma a cada 30 s, e nunca recarrega
      if (t - ultimoSilencio < SILENCIO_ENTRE_MS) return;
      ultimoSilencio = t;
      ressincronizar(false);
    }, VIGIA_MS);
    // no Node (testes), o vigia não segura o processo
    (vigia as unknown as { unref?: () => void }).unref?.();
  }

  /** Pede o valor oficial das células ainda previstas (o comando pode ter se perdido). */
  function reconferirPrevistas(): void {
    if (pendentes.size === 0) return;
    const celulas = [...pendentes.keys()].map((k) => {
      const [x, y, z] = k.split(',').map(Number);
      return { x, y, z };
    });
    enviar({ t: 'conferir', id: proximoId(), celulas });
  }

  let pedido = 0;
  const esperando = new Map<number, (d: SalvoNucleo) => void>();
  conexao.aoReceber((m: Mensagem) => {
    if (m.t === 'quadro') receberQuadro(m);
    else if (m.t === 'salvo') {
      esperando.get(m.pedido)?.(m.dados);
      esperando.delete(m.pedido);
    } else if (m.t === 'erro') console.error('núcleo:', m.mensagem);
  });

  return {
    enviar,
    proximoId,
    prever,
    sincronia,
    criaturas,
    itens,
    veiculos,
    vila,
    baile,
    /** Spec 026 (parte 2): a cena pede os carrinhos do bate-bate que chegam no quadro. */
    ouvirBate(f: ((v: BateVista, t: number, agora: number) => void) | null) {
      ouvinteBate = f;
    },
    ambiente,
    get sobrevivencia() {
      return sobrevivencia;
    },
    get conteiner() {
      return conteiner;
    },
    /** Pede ao núcleo a parte dele do salvamento (desiste em 5 s: nada fica travado). */
    pedirSalvamento(): Promise<SalvoNucleo> {
      const p = ++pedido;
      return new Promise((resolve, reject) => {
        const prazo = setTimeout(() => {
          esperando.delete(p);
          reject(new Error('o núcleo não respondeu ao salvamento'));
        }, 5000);
        esperando.set(p, (d) => {
          clearTimeout(prazo);
          resolve(d);
        });
        enviar({ t: 'salvar', pedido: p });
      });
    },
    /**
     * Voltou de uma queda: pede o valor oficial das células ainda previstas (o comando
     * pode ter se perdido no caminho) e recomeça a sequência dos quadros.
     */
    reconferir(): void {
      proximoQuadro = -1;
      adiantados.clear();
      // spec 035: a queda de verdade não confunde a conta do travamento
      desdeAplicado = agora();
      ultimoChegou = desdeAplicado;
      // a queda que nasceu de uma ressincronização pelo travamento (5 s sem bem-vindo) não
      // zera a conta: senão, travar, cair e voltar viraria um ciclo sem fim, sem o recarregar
      if (!(ultimaPeloTravamento && conexao.quedaNaRessincronizacao)) {
        travamentos = 0;
        ultimoTravamento = -Infinity;
      }
      reconferirPrevistas();
    },
    /** Spec 035: quantas vezes a rede de segurança ressincronizou nesta página. */
    get ressincronizacoes() {
      return ressincronizacoes;
    },
    /** Há previsão local esperando confirmação nesta célula? */
    get quadrosRecebidos() {
      return quadrosRecebidos;
    },
    pendente(x: number, y: number, z: number): boolean {
      return pendentes.has(celula(x, y, z));
    },
  };
}
