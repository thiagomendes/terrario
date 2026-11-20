// Reprodução do fluxo real do e2e multiplayer (Ana cria o mundo e o leva para a nuvem; a página
// nova ?sala=…&novo=1&direto=1 conecta e liga o estado do cliente), com o servidor, a conexão e
// o estado do cliente reais e o repositório de mundos da versão pedida. O IndexedDB é de mentira
// mas com a ordem dele: uma transação de leitura espera as de escrita criadas antes (de qualquer
// página: o banco é o mesmo), e uma de escrita espera todas as de antes. Varia a latência de
// leitura e escrita e um salvar automático da página de antes no meio da ida para a nuvem.
// Uso (da raiz do repositório):
//   npx vite-node .sdd/specs/035-entrada-na-nuvem/referencia/levar-a-nuvem.ts -- <raiz> <modo>
//   <raiz>: o repositório (ou uma worktree) com o src/jogo/mundos.ts a testar;
//   <modo>: "agora" (o main.ts de antes do conserto da 034: `repo.listar()` depois do bem-vindo)
//   ou "antes" (o conserto: a lista lida antes de conectar; depois do bem-vindo, nada espera).
// Resultado (20 nov 2026): "agora" dá o mesmo na 1a968b1 e na ec4f682 (com leitura de 5 ms a Ana
// vê a Bia em 11 e 14 de 16; com 60 ms, em 1 e 0 de 16); "antes" dá 64 de 64.
const RAIZ = process.argv[2];
const MODO = process.argv[3] ?? 'agora';
const H = process.cwd();
const { criarRepositorioMundos } = await import(RAIZ + '/src/jogo/mundos.ts');
const { criarGerenciador } = await import(H + '/servidor/src/salas.ts');
const { armazemMemoria } = await import(H + '/servidor/src/armazem.ts');
await import(H + '/src/temas/todos.ts');
const { obterTema } = await import(H + '/src/temas/index.ts');
const { conexaoNuvem } = await import(H + '/src/cliente/conexaoNuvem.ts');
const { criarEstadoCliente } = await import(H + '/src/cliente/estado.ts');
const { criarInventario } = await import(H + '/src/jogo/inventario.ts');
const { estadoInicial } = await import(H + '/src/jogo/sobrevivencia.ts');

(globalThis as any).WebSocket = { OPEN: 1 };
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** IndexedDB de mentira: latência por transação e a ordem do IndexedDB entre transações. */
function bancoFalso(lerMs: number, gravarMs: number) {
  const dados = new Map<string, unknown>();
  type Tx = { modo: 'r' | 'w'; feito: boolean; prom: Promise<unknown> };
  const txs: Tx[] = [];
  function tx<T>(modo: 'r' | 'w', corpo: () => T): Promise<T> {
    const antes = txs.filter((t) => !t.feito && (modo === 'w' || t.modo === 'w'));
    const me: Tx = { modo, feito: false, prom: Promise.resolve() };
    txs.push(me);
    me.prom = Promise.all(antes.map((t) => t.prom))
      .then(() => espera(modo === 'r' ? lerMs : gravarMs))
      .then(() => {
        const v = corpo();
        me.feito = true;
        return v;
      });
    return me.prom as Promise<T>;
  }
  return {
    obter: (k: string) => tx('r', () => structuredClone(dados.get(k))),
    gravar: (k: string, v: unknown) => tx('w', () => void dados.set(k, structuredClone(v))),
    remover: (k: string) => tx('w', () => void dados.delete(k)),
  };
}

const g = criarGerenciador({ armazem: armazemMemoria(), depuracao: true });
const tic = setInterval(() => g.passo(), 50);
const ident = (id: string) => ({ id, chave: `chave-secreta-de-${id}-123`, apelido: id, aparencia: {} });
let ip = 1;
// canal do servidor ligado a um WebSocket de mentira (cada mensagem é uma tarefa, como no navegador)
function ponte() {
  const ws: any = {
    readyState: 0, onopen: null, onmessage: null, onclose: null,
    send: (t: string) => void g.receber(canal, t),
    close: () => { ws.readyState = 3; g.caiu(canal); },
  };
  const canal = { ip: `9.9.9.${ip++ % 250}`, enviar: (t: string) => setTimeout(() => ws.onmessage?.({ data: t }), 0), fechar: () => {} };
  setTimeout(() => { ws.readyState = 1; ws.onopen?.(); }, 0);
  return ws;
}

async function cenario(lerMs: number, gravarMs: number, salvarAutoMs: number | null) {
  const banco = bancoFalso(lerMs, gravarMs);
  // página 1 (/): o "Meu primeiro mundo" (salvo com miniatura) e o "Mundo da Ana" criado
  const r1 = criarRepositorioMundos(banco);
  await r1.prepararFormato();
  await r1.apagarTemasQueSairam();
  const m0 = await r1.criar('Meu primeiro mundo', 1, 'criativo', 'vila-neon');
  await r1.salvar(m0.id, await r1.carregar(m0.id), 'data:image/jpeg;base64,' + 'x'.repeat(20000));
  const ana = await r1.criar('Mundo da Ana', 7, 'criativo', 'doce-reino');
  // página 2 (?mundo=): abre e leva para a nuvem (com o salvar automático no meio, se pedido)
  const r2 = criarRepositorioMundos(banco);
  await r2.prepararFormato();
  await r2.apagarTemasQueSairam();
  await r2.obter(ana.id);
  const dados = await r2.carregar(ana.id);
  if (salvarAutoMs !== null) setTimeout(() => void r2.salvar(ana.id, dados).catch(() => {}), salvarAutoMs);
  const c1 = conexaoNuvem({
    url: 'x', jogador: ident('ana'), abrir: () => ponte(),
    criar: { nome: 'Mundo da Ana', semente: 7, tema: 'doce-reino', modo: 'criativo', versaoMundo: 2, estilo: obterTema('doce-reino').mundo, dados },
  });
  const bv1 = await c1.pronta;
  await r2.marcarNuvem(ana.id, bv1.sala.codigo);
  c1.encerrar();
  const codigo = bv1.sala.codigo;
  // página 3 (?sala=…&novo=1&direto=1): o que o main.ts faz
  const r3 = criarRepositorioMundos(banco);
  await r3.prepararFormato();
  await r3.apagarTemasQueSairam();
  // "antes": o conserto da 034 (a lista lida antes de conectar; depois do bem-vindo, nada espera)
  const adiantado = MODO === 'antes' ? Promise.resolve(await r3.listar()) : null;
  const c2 = conexaoNuvem({ url: 'x', jogador: ident('ana'), codigo, abrir: () => ponte() });
  const bv2 = await c2.pronta;
  const t0 = performance.now();
  const lista = await (adiantado ?? r3.listar());
  const espera3 = performance.now() - t0;
  const local = lista.find((m: any) => m.nuvem === bv2.sala.codigo);
  let viuBia = false;
  criarEstadoCliente({
    conexao: c2, inventario: criarInventario(), aplicarBloco: () => false,
    clima: { tipo: 'limpo' } as any, dia: 0, hora: 0, sobrevivencia: estadoInicial(),
    aoQuadro: (q: any) => { if (q.jogadores?.some((o: any) => o.id === 'bia')) viuBia = true; },
  });
  const c3 = conexaoNuvem({ url: 'x', jogador: ident('bia'), codigo, abrir: () => ponte() });
  await c3.pronta;
  criarEstadoCliente({
    conexao: c3, inventario: criarInventario(), aplicarBloco: () => false,
    clima: { tipo: 'limpo' } as any, dia: 0, hora: 0, sobrevivencia: estadoInicial(),
  });
  await espera(1200);
  c2.encerrar();
  c3.encerrar();
  return { espera3, viuBia, achou: !!local };
}

const linhas: string[] = [];
for (const [ler, gravar] of [[1, 3], [5, 20], [20, 60], [60, 120]] as const)
  for (const auto of [null, 0, 5, 30] as const) {
    let viu = 0;
    let somaEspera = 0;
    let achou = 0;
    const N = 4;
    for (let i = 0; i < N; i++) {
      const r = await cenario(ler, gravar, auto);
      if (r.viuBia) viu++;
      if (r.achou) achou++;
      somaEspera += r.espera3;
    }
    linhas.push(
      `ler ${ler} ms, gravar ${gravar} ms, salvar automático ${auto === null ? 'não' : `em ${auto} ms`}: ` +
        `Ana vê a Bia em ${viu}/${N}; espera depois do bem-vindo ${(somaEspera / N).toFixed(1)} ms; achou o mundo ${achou}/${N}`,
    );
  }
clearInterval(tic);
console.log(`${RAIZ} (${MODO})\n` + linhas.join('\n'));
process.exit(0);
