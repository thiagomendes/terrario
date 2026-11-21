import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { baileDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear } from '../../src/nucleo/saneamento';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import {
  balcoesDaVila,
  balcoesDoBaile,
  balcoesDoMundo,
  CHEGA_NA_MAO,
  ESPERA_COMPRA,
  MAX_POR_LANCHE,
  noMundo,
  VENDEDORA,
} from '../../src/jogo/compra';
import {
  BEIJINHO,
  BRIGADEIRO,
  CAJUZINHO,
  CHOCOLATE_QUENTE,
  EXCLUSIVOS_BAILE,
  POCAO_UVA,
  SURPRESA_UVA,
} from '../../src/jogo/exclusivos';
import { N_BAILE } from '../../src/jogo/baile';
import { vilaDoMundo } from '../../src/world/chunk';
import { obterItem } from '../../src/jogo/itens';
import { registrarCatalogo } from '../../src/jogo/catalogo';

/**
 * Spec 027 (T14): comprar nas barracas da Noite das Fantasias, no núcleo. O mesmo módulo da
 * Vila Neon (spec 032), com os balcões lidos da planta da festa: a Barraca dos Doces (a Tia
 * Filó), a Barraca das Canecas (o Seu Olavo) e a Bancada da Horta (o Seu Jerônimo); no aparelho
 * e na nuvem, com dois amigos.
 */
const BAILE = obterTema('noite-das-fantasias');
const SEMENTE = 1337;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function tel(x: number, y: number, z: number): Comando {
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
    slot: 0,
  };
}
function abrir(confiar: boolean, quem = ['ana', 'bia']): Nucleo {
  definirEstiloMundo(BAILE.mundo);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: confiar,
    depuracao: true,
    dono: quem[0],
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
function passos(n: Nucleo, k = 1): Map<string, EventoNucleo[]> {
  const r = new Map<string, EventoNucleo[]>();
  for (let i = 0; i < k; i++) {
    n.passo();
    for (const [q, f] of n.quadros()) r.set(q, [...(r.get(q) ?? []), ...(f.eventos ?? [])]);
  }
  return r;
}
const plano = () => baileDoMundo(SEMENTE)!;
const Y = () => plano().h + 1;
const inv = (n: Nucleo, quem: string) => n.estado.jogadores.get(quem)!.inventario;
const comprar = (i: number) => ({ t: 'baile', a: 'comprar', i }) as unknown as Comando;
const passosAte = (s: number) => Math.ceil(s / PASSO);
/** A peça do balcão `i` (a barraca ou a bancada). */
function pecaDo(i: number) {
  const b = balcoesDoBaile(plano())[i];
  const tipo = b.barraca === 'horta' ? 'bancada' : 'barraca';
  return plano().pecas.find(
    (q) => q.tipo === tipo && (tipo === 'bancada' || q.n === (b.barraca === 'doces' ? 0 : 1)),
  )!;
}
/** Leva `quem` para a frente do balcão `i` (a `d` blocos, do lado de fora). */
function pertoDo(n: Nucleo, quem: string, i: number, d = 2.4, lado = 0): void {
  const b = balcoesDoBaile(plano())[i];
  const q = pecaDo(i);
  const f0 = noMundo(q, 0, 0, 0);
  const f1 = noMundo(q, lado, 0, 1);
  const p: [number, number] = [b.p[0] + (f1[0] - f0[0]) * d, b.p[2] + (f1[2] - f0[2]) * d];
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(p[0], Y(), p[1]));
  passos(n, 2);
}

describe('spec 027 (T14): comprar nas barracas da festa', () => {
  it('o comando novo passa a limpo; nada de lixo', () => {
    expect(sanear({ t: 'baile', a: 'comprar', i: 3, lixo: 1 })).toEqual({ t: 'baile', a: 'comprar', i: 3 });
    expect(sanear({ t: 'baile', a: 'comprar', i: -1 })).toBeNull();
    expect(sanear({ t: 'baile', a: 'comprar', i: 99 })).toBeNull();
    expect(sanear({ t: 'baile', a: 'comprar' })).toBeNull();
    expect(sanear({ t: 'baile', a: 'abracar' })).toBeNull();
  });

  it('os balcões pela planta: os docinhos da Tia Filó, as canecas do Seu Olavo, a surpresa de uva do Seu Jerônimo', () => {
    definirEstiloMundo(BAILE.mundo);
    const b = balcoesDoBaile(plano());
    expect(b.map((q) => [q.chave, q.barraca, q.item])).toEqual([
      ['compra-brigadeiro', 'doces', BRIGADEIRO],
      ['compra-beijinho', 'doces', BEIJINHO],
      ['compra-cajuzinho', 'doces', CAJUZINHO],
      ['compra-chocolate', 'canecas', CHOCOLATE_QUENTE],
      ['compra-pocao', 'canecas', POCAO_UVA],
      ['compra-uva', 'horta', SURPRESA_UVA],
    ]);
    expect(VENDEDORA.doces).toBe(N_BAILE.filo);
    expect(VENDEDORA.canecas).toBe(N_BAILE.olavo);
    expect(VENDEDORA.horta).toBe(N_BAILE.jeronimo);
    expect(b.map((q) => q.vendedora)).toEqual([5, 5, 5, 6, 6, 4]);
    // cada lanche em cima do tampo da peça dele, a menos de 2 blocos do meio dela; os três
    // docinhos lado a lado (o dedo pega cada um)
    b.forEach((q, i) => {
      const p = pecaDo(i);
      expect(Math.hypot(q.p[0] - p.x, q.p[2] - p.z)).toBeLessThan(2);
      expect(q.p[1] - p.y).toBeGreaterThan(0.9);
      expect(q.p[1] - p.y).toBeLessThan(1.4);
    });
    expect(Math.hypot(b[0].p[0] - b[1].p[0], b[0].p[2] - b[1].p[2])).toBeGreaterThan(1);
    expect(Math.hypot(b[3].p[0] - b[4].p[0], b[3].p[2] - b[4].p[2])).toBeGreaterThan(1);
    // pela planta: a festa lê os dela, a Vila os dela
    expect(balcoesDoMundo({ baile: plano() })).toEqual(b);
    const vila = vilaDoMundo(4242);
    if (vila) expect(balcoesDoMundo({ vila })).toEqual(balcoesDaVila(vila));
  });

  it('as comidas da festa são só deste mundo, comida de verdade e com nome em português', () => {
    registrarCatalogo();
    for (const id of [BRIGADEIRO, BEIJINHO, CAJUZINHO, SURPRESA_UVA, CHOCOLATE_QUENTE, POCAO_UVA]) {
      expect(EXCLUSIVOS_BAILE.itens).toContain(id);
      expect(obterItem(id)?.tipo).toBe('comida');
      expect(BAILE.textos.itens?.[id]).toBeTruthy();
    }
  });

  for (const confiar of [true, false])
    describe(confiar ? 'no aparelho' : 'na nuvem', () => {
      it('a entrega: de longe nada; de perto todos veem e o lanche chega na mão no tempo dela', () => {
        const n = abrir(confiar);
        n.comando('ana', comprar(0));
        let evs = passos(n, passosAte(CHEGA_NA_MAO) + 4);
        expect(evs.get('ana')!.some((e) => e.e === 'vilaCompra')).toBe(false);
        pertoDo(n, 'ana', 0);
        pertoDo(n, 'bia', 0, 3.5, 1);
        n.comando('ana', comprar(0));
        evs = passos(n, 1);
        for (const q of ['ana', 'bia'])
          expect(evs.get(q)!.find((e) => e.e === 'vilaCompra')).toEqual({ e: 'vilaCompra', i: 0, quem: 'ana' });
        expect(inv(n, 'ana').contar(BRIGADEIRO)).toBe(0);
        passos(n, passosAte(CHEGA_NA_MAO) + 3);
        expect(inv(n, 'ana').contar(BRIGADEIRO)).toBe(1);
        expect(inv(n, 'ana').slots.slice(0, 9).some((s) => s?.item === BRIGADEIRO)).toBe(true);
        expect(inv(n, 'bia').contar(BRIGADEIRO)).toBe(0);
      });

      it('em cada balcão (as canecas e a horta também), uma compra por vez e no máximo três', () => {
        const n = abrir(confiar);
        for (const i of [3, 4, 5]) {
          pertoDo(n, 'ana', i);
          n.comando('ana', comprar(i));
          passos(n, 1);
          // outro toque no meio da entrega não compra de novo
          n.comando('ana', comprar(i));
          passos(n, passosAte(ESPERA_COMPRA) + 1);
          const item = balcoesDoBaile(plano())[i].item;
          expect(inv(n, 'ana').contar(item)).toBe(1);
          for (let k = 0; k < 4; k++) {
            n.comando('ana', comprar(i));
            passos(n, passosAte(ESPERA_COMPRA) + 1);
          }
          expect(inv(n, 'ana').contar(item)).toBe(MAX_POR_LANCHE);
        }
      });

      it('duas amigas na mesma barraca ao mesmo tempo: cada uma recebe o dela', () => {
        const n = abrir(confiar);
        pertoDo(n, 'ana', 1);
        pertoDo(n, 'bia', 2, 2.4, 0.6);
        n.comando('ana', comprar(1));
        n.comando('bia', comprar(2));
        passos(n, passosAte(CHEGA_NA_MAO) + 4);
        expect(inv(n, 'ana').contar(BEIJINHO)).toBe(1);
        expect(inv(n, 'ana').contar(CAJUZINHO)).toBe(0);
        expect(inv(n, 'bia').contar(CAJUZINHO)).toBe(1);
        expect(inv(n, 'bia').contar(BEIJINHO)).toBe(0);
      });
    });

  it('o comando da Vila não compra na festa', () => {
    const n = abrir(true);
    pertoDo(n, 'ana', 0);
    n.comando('ana', { t: 'vila', a: 'comprar', i: 0 } as unknown as Comando);
    passos(n, passosAte(CHEGA_NA_MAO) + 4);
    expect(inv(n, 'ana').contar(BRIGADEIRO)).toBe(0);
    expect(inv(n, 'ana').contar('pipoca')).toBe(0);
  });
});
