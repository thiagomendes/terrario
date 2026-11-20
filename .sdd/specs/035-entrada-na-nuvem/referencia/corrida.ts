// Reprodução: o dono entra na sala (novo=1) e só liga o estado do cliente depois de um await
// (como o `await repo.listar()` de src/main.ts:178). Os quadros que chegam nesse meio se perdem.
const W = '/tmp/claude-0/-home-user-terrario/1ae08b7f-a992-50d5-9504-e1a95c60b8b3/scratchpad/main-65b0a57';
const { criarGerenciador } = await import(W + '/servidor/src/salas.ts');
const { armazemMemoria } = await import(W + '/servidor/src/armazem.ts');
await import(W + '/src/temas/todos.ts');
const { obterTema } = await import(W + '/src/temas/index.ts');
const { conexaoNuvem } = await import(W + '/src/cliente/conexaoNuvem.ts');
const { criarEstadoCliente } = await import(W + '/src/cliente/estado.ts');
const { criarInventario } = await import(W + '/src/jogo/inventario.ts');
const { estadoInicial } = await import(W + '/src/jogo/sobrevivencia.ts');
const { VERSAO_REDE } = await import(W + '/src/rede/protocolo.ts');

(globalThis as any).WebSocket = { OPEN: 1 };
const g = criarGerenciador({ armazem: armazemMemoria(), depuracao: true });
const tic = setInterval(() => g.passo(), 50);
const ident = (id: string) => ({ id, chave: `chave-secreta-de-${id}-123`, apelido: id, aparencia: {} });
const estilo = obterTema('vila-neon').mundo;

// canal do servidor ligado a um WebSocket de mentira (cada mensagem é uma tarefa, como no navegador)
function ponte() {
  const ws: any = { readyState: 0, onopen: null, onmessage: null, onclose: null,
    send: (t: string) => void g.receber(canal, t), close: () => { ws.readyState = 3; g.caiu(canal); } };
  const canal = { ip: '9.9.9.9', enviar: (t: string) => setTimeout(() => ws.onmessage?.({ data: t }), 0), fechar: () => {} };
  setTimeout(() => { ws.readyState = 1; ws.onopen?.(); }, 0);
  return ws;
}
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function cenario(atrasoMs: number) {
  // 1) o filho cria a sala (subirParaNuvem) e fecha essa conexão
  const c1 = conexaoNuvem({ url: 'x', jogador: ident('filho'), abrir: () => ponte(),
    criar: { nome: 'Vila', semente: 7, tema: 'vila-neon', modo: 'criativo', versaoMundo: 2, estilo } });
  const bv1 = await c1.pronta; c1.encerrar();
  const codigo = bv1.sala.codigo;
  // 2) a página nova (?sala=…&novo=1&direto=1): conecta pelo código
  const c2 = conexaoNuvem({ url: 'x', jogador: ident('filho'), codigo, abrir: () => ponte() });
  await c2.pronta;
  await espera(atrasoMs); // <- o `await repo.listar()` do main.ts quando novo=1
  let aplicados = 0; let viuPai = false;
  criarEstadoCliente({ conexao: c2, inventario: criarInventario(), aplicarBloco: () => false,
    clima: { tipo: 'limpo' } as any, dia: 0, hora: 0, sobrevivencia: estadoInicial(),
    aoQuadro: (q: any) => { aplicados++; if (q.jogadores?.some((o: any) => o.id === 'pai')) viuPai = true; } });
  // 3) o pai entra pelo link
  const c3 = conexaoNuvem({ url: 'x', jogador: ident('pai'), codigo, abrir: () => ponte() });
  await c3.pronta;
  let paiViuFilho = false;
  criarEstadoCliente({ conexao: c3, inventario: criarInventario(), aplicarBloco: () => false,
    clima: { tipo: 'limpo' } as any, dia: 0, hora: 0, sobrevivencia: estadoInicial(),
    aoQuadro: (q: any) => { if (q.jogadores?.some((o: any) => o.id === 'filho')) paiViuFilho = true; } });
  await espera(1500);
  console.log(`atraso ${atrasoMs} ms: quadros aplicados no filho=${aplicados}, filho vê o pai=${viuPai}, pai vê o filho=${paiViuFilho}`);
  c2.encerrar(); c3.encerrar();
}
await cenario(0);
await cenario(120);
clearInterval(tic);
process.exit(0);
