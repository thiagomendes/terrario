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
import {
  criarReplicaCriaturas,
  criarReplicaItens,
  criarSincronizadorItens,
  type ConteinerReplica,
} from './replica';

export interface OpcoesEstadoCliente {
  conexao: Conexao;
  inventario: Inventario;
  /** Aplica um bloco na cópia local (e refaz a malha). Devolve se mudou. */
  aplicarBloco(x: number, y: number, z: number, bloco: number, meta: number): boolean;
  aoEvento?(e: EventoNucleo): void;
  /** Contêiner aberto mudou (novo: acabou de abrir). */
  aoConteiner?(c: ConteinerReplica | null, novo: boolean): void;
  /** Depois de aplicar cada quadro. */
  aoQuadro?(q: Quadro): void;
  clima: EstadoClima;
  dia: number;
  hora: number;
  sobrevivencia: EstadoSobrevivencia;
}

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
  let conteiner: ConteinerReplica | null = null;
  let ultimoAckTransacao = 0;

  function prever(id: number, x: number, y: number, z: number, b: number, meta = 0): boolean {
    pendentes.set(celula(x, y, z), id);
    return op.aplicarBloco(x, y, z, b, meta);
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
      op.aplicarBloco(b.x, b.y, b.z, b.v & 255, (b.v >> 8) & 255);
    }
    if (q.criaturas) criaturas.receber(q.criaturas);
    if (q.itens) itens.receber(q.itens);
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
  function receberQuadro(q: Quadro): void {
    if (q.primeiro) proximoQuadro = q.n;
    if (proximoQuadro >= 0 && q.n < proximoQuadro) return;
    adiantados.set(q.n, q);
    while (adiantados.has(proximoQuadro)) {
      const atual = adiantados.get(proximoQuadro)!;
      adiantados.delete(proximoQuadro);
      proximoQuadro++;
      aplicar(atual);
    }
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
      if (pendentes.size === 0) return;
      const celulas = [...pendentes.keys()].map((k) => {
        const [x, y, z] = k.split(',').map(Number);
        return { x, y, z };
      });
      enviar({ t: 'conferir', id: proximoId(), celulas });
    },
    /** Há previsão local esperando confirmação nesta célula? */
    pendente(x: number, y: number, z: number): boolean {
      return pendentes.has(celula(x, y, z));
    },
  };
}
