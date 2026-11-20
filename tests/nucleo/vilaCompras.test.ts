import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear } from '../../src/nucleo/saneamento';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import {
  balcoesDaVila,
  CHEGA_NA_MAO,
  ESPERA_COMPRA,
  MAX_POR_LANCHE,
  PAGAMENTO,
  VENDEDORA,
} from '../../src/jogo/compra';
import { DURACAO_REFEICAO } from '../../src/jogo/refeicao';
import {
  MORADORES_VILA,
  PIPOQUEIRA_PRACINHA,
  PIPOQUEIRO,
  POVOADO_VILA,
} from '../../src/nucleo/vila';
import { ALGODAO_DOCE, CACHORRO_QUENTE, SUCO, VITAMINA } from '../../src/jogo/exclusivos';
import { VERSAO_REDE } from '../../src/rede/protocolo';
import { TROCAS } from '../../src/jogo/trocas';

/**
 * Spec 032: comprar nas barracas da Vila Neon no núcleo (a entrega, uma por vez, os 3 de cada
 * lanche, a barrinha cheia) e comer em todo modo (uma refeição por vez, o amigo vê o quê).
 */
const VILA = obterTema('vila-neon').mundo;
const SEMENTE = 4242;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function tel(x: number, y: number, z: number, slot = 0): Comando {
  return {
    t: 'jogador',
    x,
    y,
    z,
    yaw: 0,
    pitch: 0,
    olhos: y + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot,
  };
}
function abrir(modo: 'criativo' | 'sobrevivencia' = 'criativo', quem = ['ana', 'bia']) {
  definirEstiloMundo(VILA);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: quem[0],
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
type Ev = EventoNucleo;
/** Anda `k` passos e devolve os eventos de cada um. */
function passos(n: Nucleo, k = 1): Map<string, Ev[]> {
  const r = new Map<string, Ev[]>();
  for (let i = 0; i < k; i++) {
    n.passo();
    for (const [q, f] of n.quadros()) r.set(q, [...(r.get(q) ?? []), ...(f.eventos ?? [])]);
  }
  return r;
}
function ir(n: Nucleo, quem: string, x: number, y: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}
const plano = () => vilaDoMundo(SEMENTE)!;
const Y = () => plano().h + 1;
const inv = (n: Nucleo, quem: string) => n.estado.jogadores.get(quem)!.inventario;
const comprar = (i: number) => ({ t: 'vila', a: 'comprar', i }) as unknown as Comando;
/** Leva `quem` para perto do lugar de comprar `i` (do lado de fora, a 2,5 blocos). */
function pertoDo(n: Nucleo, quem: string, i: number): void {
  const b = balcoesDaVila(plano())[i];
  ir(n, quem, b.p[0], Y(), b.p[2] + 2.5);
  passos(n, 2);
}
const passosAte = (s: number) => Math.ceil(s / PASSO);

describe('spec 032: comprar nas barracas da Vila Neon', () => {
  it('a rede subiu para 16, o comando novo passa a limpo e o pagamento é a fichinha de graça', () => {
    expect(VERSAO_REDE).toBeGreaterThanOrEqual(16);
    expect(sanear({ t: 'vila', a: 'comprar', i: 2, lixo: 1 })).toEqual({ t: 'vila', a: 'comprar', i: 2 });
    expect(sanear({ t: 'vila', a: 'comprar', i: -1 })).toBeNull();
    expect(sanear({ t: 'vila', a: 'comprar', i: 99 })).toBeNull();
    expect(sanear({ t: 'vila', a: 'comprar' })).toBeNull();
    expect(PAGAMENTO).toEqual({ tipo: 'fichinha', preco: 0 });
  });

  it('os lugares de comprar: os três lanches da Bia, a vitamina, a pipoca e o algodão do parque, a pipoca da pracinha', () => {
    definirEstiloMundo(VILA);
    const b = balcoesDaVila(plano());
    expect(b.map((q) => [q.chave, q.item])).toEqual([
      ['compra-pipoca', 'pipoca'],
      ['compra-cachorro', CACHORRO_QUENTE],
      ['compra-suco', SUCO],
      ['compra-vitamina', VITAMINA],
      ['compra-pipoca-parque', 'pipoca'],
      ['compra-algodao', ALGODAO_DOCE],
      ['compra-pipoca-pracinha', 'pipoca'],
    ]);
    // quem entrega: a Bia (o posto do lanche), a Tati (a lanchonete), o Seu Chico e a Dona Cida
    expect(VENDEDORA.lanche).toBe(MORADORES_VILA.findIndex((m) => m.posto === 'lanche'));
    expect(VENDEDORA.lanchonete).toBe(MORADORES_VILA.findIndex((m) => m.posto === 'lanchonete'));
    expect(VENDEDORA.pipocaParque).toBe(PIPOQUEIRO);
    expect(VENDEDORA.algodao).toBe(PIPOQUEIRO);
    expect(VENDEDORA.pipocaPracinha).toBe(PIPOQUEIRA_PRACINHA);
    // os três lanches da Bia em cima do balcão, lado a lado (o dedo pega cada um)
    const [p, c, s] = b;
    expect(Math.abs(p.p[1] - c.p[1])).toBeLessThan(0.3);
    expect(Math.hypot(p.p[0] - c.p[0], p.p[2] - c.p[2])).toBeGreaterThan(1.2);
    expect(Math.hypot(c.p[0] - s.p[0], c.p[2] - s.p[2])).toBeGreaterThan(0.8);
  });

  it('a entrega: todos veem, o lanche chega na barrinha só quando chega na mão', () => {
    const n = abrir();
    // de longe, nada
    n.comando('ana', comprar(1));
    let evs = passos(n, passosAte(CHEGA_NA_MAO) + 4);
    expect(evs.get('ana')!.some((e) => e.e === 'vilaCompra')).toBe(false);
    expect(inv(n, 'ana').contar(CACHORRO_QUENTE)).toBe(0);
    pertoDo(n, 'ana', 1);
    n.comando('ana', comprar(1));
    evs = passos(n, 1);
    // a Ana e a Bia veem a mesma entrega
    for (const q of ['ana', 'bia'])
      expect(evs.get(q)!.find((e) => e.e === 'vilaCompra')).toEqual({ e: 'vilaCompra', i: 1, quem: 'ana' });
    expect(inv(n, 'ana').contar(CACHORRO_QUENTE)).toBe(0);
    evs = passos(n, passosAte(CHEGA_NA_MAO) - 3);
    expect(inv(n, 'ana').contar(CACHORRO_QUENTE)).toBe(0);
    evs = passos(n, 4);
    expect(inv(n, 'ana').contar(CACHORRO_QUENTE)).toBe(1);
    expect(evs.get('ana')!.some((e) => e.e === 'coletou' && e.item === CACHORRO_QUENTE)).toBe(true);
    // na barrinha (um dos 9 de baixo)
    const slots = inv(n, 'ana').slots;
    expect(slots.slice(0, 9).some((s) => s?.item === CACHORRO_QUENTE)).toBe(true);
    // nada de moedinha: comprar não paga nem gasta
    expect(evs.get('ana')!.some((e) => e.e === 'alma' && e.ganho.moedas > 0)).toBe(false);
  });

  it('uma compra por vez, e no máximo três de cada lanche', () => {
    const n = abrir();
    pertoDo(n, 'ana', 0);
    n.comando('ana', comprar(0));
    passos(n, 1);
    // outro toque no meio da entrega não compra de novo
    n.comando('ana', comprar(0));
    n.comando('ana', comprar(2));
    passos(n, passosAte(ESPERA_COMPRA));
    expect(inv(n, 'ana').contar('pipoca')).toBe(1);
    expect(inv(n, 'ana').contar(SUCO)).toBe(0);
    for (let k = 0; k < 4; k++) {
      n.comando('ana', comprar(0));
      passos(n, passosAte(ESPERA_COMPRA) + 1);
    }
    expect(inv(n, 'ana').contar('pipoca')).toBe(MAX_POR_LANCHE);
    // (os 3 numa pilha só)
    expect(inv(n, 'ana').slots.filter((s) => s?.item === 'pipoca').length).toBe(1);
  });

  it('a barrinha cheia: nada é comprado e nada sai da mão (o aviso é só para a tela)', () => {
    const n = abrir();
    pertoDo(n, 'ana', 5);
    for (let i = 0; i < 9; i++) inv(n, 'ana').definir(i, { item: 'graveto', qtd: 3 });
    const antes = JSON.stringify(inv(n, 'ana').slots);
    n.comando('ana', comprar(5));
    let evs = passos(n, 1);
    expect(evs.get('ana')!.find((e) => e.e === 'vilaCompra')).toEqual({
      e: 'vilaCompra',
      i: 5,
      quem: 'ana',
      cheia: true,
    });
    evs = passos(n, passosAte(CHEGA_NA_MAO) + 4);
    expect(JSON.stringify(inv(n, 'ana').slots)).toBe(antes);
    expect(inv(n, 'ana').contar(ALGODAO_DOCE)).toBe(0);
    // com um espaço livre, compra
    inv(n, 'ana').definir(4, null);
    passos(n, passosAte(ESPERA_COMPRA));
    n.comando('ana', comprar(5));
    passos(n, passosAte(CHEGA_NA_MAO) + 4);
    expect(inv(n, 'ana').obter(4)?.item).toBe(ALGODAO_DOCE);
  });

  it('a Dona Cida aparece atrás do carrinho de pipoca da pracinha', () => {
    const n = abrir();
    const b = balcoesDaVila(plano())[6];
    ir(n, 'ana', b.p[0] + 3, Y(), b.p[2]);
    passos(n, 60);
    const cida = n.estado.populacao.lista.find(
      (c) => c.morador?.povoado === POVOADO_VILA && c.morador.n === PIPOQUEIRA_PRACINHA,
    );
    expect(cida).toBeDefined();
    expect(Math.hypot(cida!.x - b.p[0], cida!.z - b.p[2])).toBeLessThan(2.2);
  });

  it('a janela de trocas não dá mais comida de graça na Vila (agora se compra)', () => {
    const ids = TROCAS.cozinheiro.map((t) => t.id);
    expect(ids).not.toContain('cachorro-quente');
    expect(ids).not.toContain('suco');
    expect(TROCAS.cozinheiro.some((t) => t.planta === 'bairro' && t.receber.item === 'pipoca')).toBe(false);
  });
});

describe('spec 032: comer em todo modo, uma refeição por vez', () => {
  const quadroDaBia = (n: Nucleo) => n.quadros().get('bia')!.jogadores?.find((j) => j.id === 'ana');

  it('no criativo come (sem conta nenhuma), a comida acaba e o amigo vê o quê', () => {
    const n = abrir('criativo');
    inv(n, 'ana').definir(0, { item: CACHORRO_QUENTE, qtd: 2 });
    n.comando('ana', { t: 'comer', slot: 0 });
    n.passo();
    const v = quadroDaBia(n);
    expect(v?.acoes?.[2]).toBe(1);
    expect(v?.come).toBe(CACHORRO_QUENTE);
    expect(inv(n, 'ana').contar(CACHORRO_QUENTE)).toBe(1);
    // outra refeição no meio desta não vale
    n.comando('ana', { t: 'comer', slot: 0 });
    n.passo();
    expect(inv(n, 'ana').contar(CACHORRO_QUENTE)).toBe(1);
    // depois da refeição o `come` some, e a próxima vale
    passos(n, passosAte(DURACAO_REFEICAO));
    expect(quadroDaBia(n)?.come).toBeUndefined();
    n.comando('ana', { t: 'comer', slot: 0 });
    n.passo();
    expect(inv(n, 'ana').contar(CACHORRO_QUENTE)).toBe(0);
    expect(quadroDaBia(n)?.acoes?.[2]).toBe(2);
  });

  it('não-comida não se come', () => {
    const n = abrir('criativo');
    inv(n, 'ana').definir(0, { item: 'graveto', qtd: 2 });
    n.comando('ana', { t: 'comer', slot: 0 });
    n.passo();
    expect(inv(n, 'ana').contar('graveto')).toBe(2);
    expect(quadroDaBia(n)?.acoes?.[2]).toBe(0);
  });

  it('na sobrevivência a fome sobe; de barriga cheia come do mesmo jeito (a fome fica no máximo)', () => {
    const n = abrir('sobrevivencia');
    const ana = n.estado.jogadores.get('ana')!;
    expect(ana.sobrevivencia.estado.fome).toBe(20);
    inv(n, 'ana').definir(0, { item: VITAMINA, qtd: 3 });
    n.comando('ana', { t: 'comer', slot: 0 });
    n.passo();
    expect(inv(n, 'ana').contar(VITAMINA)).toBe(2);
    expect(ana.sobrevivencia.estado.fome).toBe(20);
    for (let i = 0; i < 6000 && ana.sobrevivencia.estado.fome > 12; i++) ana.sobrevivencia.pulo(true);
    const antes = ana.sobrevivencia.estado.fome;
    passos(n, passosAte(DURACAO_REFEICAO));
    n.comando('ana', { t: 'comer', slot: 0 });
    n.passo();
    expect(ana.sobrevivencia.estado.fome).toBeGreaterThan(antes);
  });
});
