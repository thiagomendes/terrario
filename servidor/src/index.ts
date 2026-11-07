/**
 * Servidor do Terrário na nuvem (spec 010): WebSocket em /jogo, verificação de saúde em
 * /saude. As salas rodam o mesmo núcleo do jogo. Configuração por ambiente:
 * - PORT: porta (padrão 8080);
 * - TERRARIO_CONTA: Storage Account (sem ela, guarda em memória: desenvolvimento);
 * - TERRARIO_ORIGENS: sites que podem conectar, separados por vírgula;
 * - TERRARIO_DEPURACAO=1: aceita os atalhos de teste do núcleo (só em testes).
 */
import { createServer, type IncomingMessage } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import { criarGerenciador, type Canal } from './salas';
import { armazemMemoria } from './armazem';
import { armazemAzure } from './armazemAzure';
import { PASSO } from '../../src/nucleo/protocolo';

const PORTA = Number(process.env.PORT ?? 8080);
const ORIGENS = (process.env.TERRARIO_ORIGENS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
/** Mensagem maior que isto fecha a conexão (levar um mundo grande para a nuvem cabe). */
const MAX_MENSAGEM = 8 * 1024 * 1024;
/** Mensagens por segundo por conexão (telemetria são 20; o resto é folga para ações). */
const MAX_POR_SEGUNDO = 150;

const log = (m: string) => console.log(`[${new Date().toISOString()}] ${m}`);
const conta = process.env.TERRARIO_CONTA;
const armazem = conta ? armazemAzure(conta) : armazemMemoria();
const salas = criarGerenciador({ armazem, depuracao: process.env.TERRARIO_DEPURACAO === '1', log });

function origemPermitida(req: IncomingMessage): boolean {
  const o = req.headers.origin;
  if (!o) return false;
  if (ORIGENS.includes(o)) return true;
  // desenvolvimento e testes na própria máquina
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(o);
}

const http = createServer((req, res) => {
  if (req.url === '/saude') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ...salas.resumo }));
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('Terrário: nada aqui.');
});

const wss = new WebSocketServer({
  server: http,
  path: '/jogo',
  maxPayload: MAX_MENSAGEM,
  // JSON comprime muito bem: bem menos banda para quem joga pelo celular
  perMessageDeflate: { threshold: 256 },
  verifyClient: ({ req }: { req: IncomingMessage }) => origemPermitida(req),
});

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  // a entrada do Container Apps acrescenta o endereço de verdade no fim (o começo quem
  // escreve é o próprio navegador, então não vale para limitar tentativas)
  const ip =
    String(req.headers['x-forwarded-for'] ?? '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .pop() ??
    req.socket.remoteAddress ??
    '';
  const canal: Canal = {
    ip,
    enviar: (t) => {
      if (ws.readyState === ws.OPEN) ws.send(t);
    },
    fechar: () => ws.close(),
  };
  let janela = Date.now();
  let contagem = 0;
  ws.on('message', (dados) => {
    const agora = Date.now();
    if (agora - janela > 1000) {
      janela = agora;
      contagem = 0;
    }
    // excesso fecha a conexão: o navegador reconecta e renumera (ignorar uma mensagem
    // deixaria um buraco na ordem e o jogador parado esperando por ela)
    if (++contagem > MAX_POR_SEGUNDO) {
      if (contagem === MAX_POR_SEGUNDO + 1) ws.close(4008, 'devagar');
      return;
    }
    void salas.receber(canal, dados.toString()).catch((e) => log(`erro: ${String(e)}`));
  });
  ws.on('close', () => salas.caiu(canal));
  ws.on('error', () => salas.caiu(canal));
});

// relógio: 20 passos por segundo para todas as salas
let ultimo = performance.now();
let acumulado = 0;
setInterval(
  () => {
    const agora = performance.now();
    acumulado += (agora - ultimo) / 1000;
    ultimo = agora;
    let k = 0;
    while (acumulado >= PASSO && k < 5) {
      acumulado -= PASSO;
      try {
        salas.passo();
      } catch (e) {
        log(`passo: ${String(e)}`);
      }
      k++;
    }
    if (k === 5) acumulado = 0;
  },
  (PASSO * 1000) / 2,
);
// gravação e salas que dormem
// (uma de cada vez: com o Storage lento, a próxima espera a anterior terminar)
let emManutencao = false;
setInterval(() => {
  if (emManutencao) return;
  emManutencao = true;
  void salas
    .manutencao()
    .catch((e) => log(`manutenção: ${String(e)}`))
    .finally(() => (emManutencao = false));
}, 1000);
process.on('unhandledRejection', (e) => log(`promessa sem tratamento: ${String(e)}`));
process.on('uncaughtException', (e) => {
  // estado incerto: grava o que der e sai (o Container Apps sobe de novo)
  log(`erro inesperado: ${e.stack ?? String(e)}`);
  void salas
    .gravarTudo()
    .catch(() => undefined)
    .finally(() => process.exit(1));
});

// uma linha de métricas por minuto (vai para o Log Analytics): salas, jogadores e ritmo
setInterval(() => {
  const r = salas.resumo;
  const mem = Math.round(process.memoryUsage().rss / 1e6);
  log(
    `metricas salas=${r.salas} jogadores=${r.jogadores} passoMs=${r.passoMs} passoMaxMs=${r.passoMaxMs} memMB=${mem}`,
  );
  salas.zerarPior();
}, 60_000);

http.listen(PORTA, () => log(`Terrário no ar na porta ${PORTA} (${conta ? 'Azure' : 'memória'})`));

// nova versão sendo publicada: grava tudo antes de sair
for (const sinal of ['SIGTERM', 'SIGINT'] as const)
  process.on(sinal, () => {
    log(`${sinal}: gravando tudo`);
    void salas
      .gravarTudo()
      .catch(() => undefined)
      .finally(() => process.exit(0));
  });
