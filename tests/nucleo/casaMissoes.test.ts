import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear } from '../../src/nucleo/saneamento';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import { almaMundoVazia, missoesDoMundo, moedasDoMundo } from '../../src/jogo/alma';
import {
  BOLO,
  CINEMA,
  F_BOLO,
  F_CINEMA,
  F_QUARTO,
  F_RAMPA,
  QUARTO,
} from '../../src/jogo/missoesCasa';
import { DURA_FILME } from '../../src/jogo/casa';
import {
  CUBO_CORES,
  FATIA_BOLO,
  FITA_VIDEO,
  IOIO,
  PIAO,
  VITAMINA,
} from '../../src/jogo/exclusivos';
import { VERSAO_REDE } from '../../src/rede/protocolo';
import { obterItem } from '../../src/jogo/itens';

/**
 * Spec 026 (parte 3, etapa B): as missões da Casa anos 80 no núcleo. Cada criança tem o progresso
 * dela; o núcleo confere a missão aberta e o alcance; as moedinhas só vêm no fim da missão.
 */
const VILA = obterTema('vila-neon').mundo;
const SEMENTE = 4242;
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
function abrir(quem: string[] = ['ana']) {
  definirEstiloMundo(VILA);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: quem[0],
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
type Ev = EventoNucleo;
/** Anda `k` passos, cada um parado onde está (o aparelho manda o lugar a cada quadro). */
function passos(n: Nucleo, k = 1, quem = 'ana'): Ev[] {
  const r: Ev[] = [];
  for (let i = 0; i < k; i++) {
    n.passo();
    for (const [q, f] of n.quadros()) if (q === quem) r.push(...(f.eventos ?? []));
  }
  return r;
}
function ir(n: Nucleo, quem: string, x: number, y: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}
const plano = () => vilaDoMundo(SEMENTE)!;
const alma = (n: Nucleo, quem: string) => {
  let e = n.estado.almas.get(quem);
  if (!e) n.estado.almas.set(quem, (e = almaMundoVazia()));
  return e;
};
function fez(n: Nucleo, quem: string, ...ids: string[]): void {
  alma(n, quem).feitas.push(...ids);
}
const ANTES = ['f1', 'f2', 'f4', 'f5', 'f6', 'f7', 'f8'];
const inv = (n: Nucleo, quem: string) => n.estado.jogadores.get(quem)!.inventario;
const vila = (a: string, extra: Record<string, unknown> = {}) =>
  ({ t: 'vila', a, ...extra }) as unknown as Comando;
const movidas = (evs: Ev[]) => evs.flatMap((e) => (e.e === 'alma' ? e.missoes : []));
const moedas = (evs: Ev[]) => evs.reduce((s, e) => s + (e.e === 'alma' ? e.ganho.moedas : 0), 0);

describe('spec 026 (parte 3, etapa B): as missões da casa no núcleo', () => {
  it('a rede subiu para 15, o comando do brinquedo passa a limpo e os itens novos são da Vila', () => {
    // (15 na parte 3B; 16 na spec 032, comprar e comer)
    expect(VERSAO_REDE).toBeGreaterThanOrEqual(15);
    expect(sanear({ t: 'vila', a: 'brinquedo', i: 2, lixo: 1 })).toEqual({
      t: 'vila',
      a: 'brinquedo',
      i: 2,
    });
    expect(sanear({ t: 'vila', a: 'brinquedo', i: 3 })).toBeNull();
    expect(sanear({ t: 'vila', a: 'brinquedo' })).toBeNull();
    abrir();
    expect(obterItem('feno')?.nome).toBeTruthy();
    expect(obterItem(FATIA_BOLO)?.comida).toBeTruthy();
  });

  it('as quatro missões novas: 18 moedinhas (o mundo dá 51), sem fantasia', () => {
    const lista = missoesDoMundo('vila-neon');
    expect(lista.map((m) => m.id).slice(7)).toEqual([F_CINEMA, F_QUARTO, F_RAMPA, F_BOLO]);
    expect(lista.slice(7).map((m) => m.moedas)).toEqual([5, 4, 4, 5]);
    expect(moedasDoMundo('vila-neon')).toBe(51);
    for (const m of lista.slice(7)) {
      expect(m.fantasia).toBeUndefined();
      if (m.desenho.tipo === 'arte') expect(m.desenho.resultado).not.toBe(m.desenho.principal);
    }
    expect(lista[9].conta).toEqual({ tipo: 'evento', chave: 'andou:rampa', meta: 3 });
  });

  it('f9 cinema: a fita, o videocassete e o filme visto no sofá (cada criança a dela)', () => {
    const n = abrir(['ana', 'bia']);
    const c = plano().pontos.casa;
    for (const q of ['ana', 'bia']) fez(n, q, ...ANTES);
    inv(n, 'ana').definir(3, { item: FITA_VIDEO, qtd: 1 });
    // as duas no tapete, de frente para a TV
    ir(n, 'ana', c.tv[0], c.y, c.tv[2] + 3.5);
    ir(n, 'bia', c.tv[0] + 1, c.y, c.tv[2] + 3.5);
    let evs = passos(n, 6);
    expect(movidas(evs)).toContainEqual({ id: F_CINEMA, feito: 1, meta: 3, usos: [CINEMA[0]] });
    n.comando('ana', vila('videocassete'));
    evs = passos(n, 6);
    expect(movidas(evs)).toContainEqual({
      id: F_CINEMA,
      feito: 2,
      meta: 3,
      usos: [CINEMA[0], CINEMA[1]],
    });
    // a Bia, sem fita, só assiste (não conta para ela)
    expect(alma(n, 'bia').lugares).not.toContain(CINEMA[1]);
    // a Ana senta no sofá (o assento do meio), levanta no meio e o filme acaba com ela na sala
    const a = c.sofa.assentos[1];
    ir(n, 'ana', a.x, a.y, a.z);
    passos(n, Math.round(4 / PASSO));
    ir(n, 'ana', a.x, c.y, a.z - 1.4);
    expect(moedas(passos(n, Math.round(4 / PASSO)))).toBe(0);
    evs = passos(n, Math.round((DURA_FILME - 7) / PASSO));
    expect(movidas(evs).find((m) => m.id === F_CINEMA)).toMatchObject({ concluiu: true });
    expect(moedas(evs)).toBe(5);
    expect(alma(n, 'bia').feitas).not.toContain(F_CINEMA);
  });

  it('f9: quem não sentou durante o filme não ganha; põe a fita de novo (ela fica na mochila)', () => {
    const n = abrir();
    const c = plano().pontos.casa;
    fez(n, 'ana', ...ANTES);
    inv(n, 'ana').definir(3, { item: FITA_VIDEO, qtd: 1 });
    ir(n, 'ana', c.tv[0], c.y, c.tv[2] + 3.5);
    passos(n, 3);
    n.comando('ana', vila('videocassete'));
    const evs = passos(n, Math.round((DURA_FILME + 2) / PASSO));
    expect(alma(n, 'ana').feitas).not.toContain(F_CINEMA);
    expect(moedas(evs)).toBe(0);
    expect(inv(n, 'ana').contar(FITA_VIDEO)).toBe(1);
  });

  it('f9 (18 nov): quem sentou no sofá durante o filme faz a missão inteira, com ou sem fita', () => {
    const n = abrir(['ana', 'bia', 'caio']);
    const c = plano().pontos.casa;
    for (const q of ['ana', 'bia', 'caio']) fez(n, q, ...ANTES);
    inv(n, 'ana').definir(3, { item: FITA_VIDEO, qtd: 1 });
    // a Ana põe a fita do tapete; a Bia e o Caio, sem fita, estão do lado dela
    ir(n, 'ana', c.tv[0], c.y, c.tv[2] + 3.5);
    ir(n, 'bia', c.tv[0] + 1, c.y, c.tv[2] + 3.5);
    ir(n, 'caio', c.tv[0] - 1, c.y, c.tv[2] + 3.5);
    passos(n, 6);
    n.comando('ana', vila('videocassete'));
    passos(n, 6);
    expect(alma(n, 'bia').lugares).not.toContain(CINEMA[1]);
    // as duas sentam (a Ana no meio, a Bia no outro assento); o Caio fica de pé no tapete
    const [, a1, a2] = c.sofa.assentos;
    ir(n, 'ana', a1.x, a1.y, a1.z);
    ir(n, 'bia', a2.x, a2.y, a2.z);
    const bia: Ev[] = [];
    const caio: Ev[] = [];
    for (let i = 0; i < Math.round((DURA_FILME + 2) / PASSO); i++) {
      n.passo();
      for (const [q, f] of n.quadros()) {
        if (q === 'bia') bia.push(...(f.eventos ?? []));
        if (q === 'caio') caio.push(...(f.eventos ?? []));
      }
    }
    for (const q of ['ana', 'bia']) {
      expect(alma(n, q).feitas).toContain(F_CINEMA);
      for (const u of CINEMA) expect(alma(n, q).lugares).toContain(u);
    }
    // a Bia: o cartão todo aceso e as moedinhas só no fim (uma vez)
    expect(movidas(bia).find((m) => m.id === F_CINEMA)).toMatchObject({ concluiu: true });
    expect(moedas(bia)).toBe(5);
    // o Caio, que não sentou, não fez
    expect(alma(n, 'caio').feitas).not.toContain(F_CINEMA);
    expect(alma(n, 'caio').lugares).not.toContain(CINEMA[2]);
    expect(moedas(caio)).toBe(0);
  });

  it('f10 quarto: o espalhado vai para a mão e o baú guarda; com a missão aberta o baú não dá', () => {
    const n = abrir();
    const c = plano().pontos.casa;
    fez(n, 'ana', ...ANTES, F_CINEMA);
    const v = n.estado.vila!;
    // longe, o toque não pega
    ir(n, 'ana', c.bau[0] - 1, c.y, c.bau[2]);
    passos(n, 2);
    n.comando('ana', vila('brinquedo', { i: 0 }));
    passos(n, 2);
    expect(v.vistaDe('ana').qto).toEqual([false, false, false]);
    // o baú, com a missão aberta e nada na mão, não dá brinquedo
    n.comando('ana', vila('bau'));
    passos(n, 2);
    expect(inv(n, 'ana').contar(IOIO)).toBe(0);
    let total = 0;
    const itens = [IOIO, PIAO, CUBO_CORES];
    for (let i = 0; i < 3; i++) {
      const q = c.espalhados[i];
      ir(n, 'ana', q[0] + 1.2, c.y, q[2]);
      passos(n, 25);
      n.comando('ana', vila('brinquedo', { i }));
      passos(n, 2);
      expect(inv(n, 'ana').contar(itens[i])).toBe(1);
      expect(v.vistaDe('ana').qto![i]).toBe(true);
      ir(n, 'ana', c.bau[0] - 1.2, c.y, c.bau[2]);
      passos(n, 25);
      n.comando('ana', vila('bau'));
      const evs = passos(n, 3);
      expect(evs.some((e) => e.e === 'vilaGuardou' && e.i === i)).toBe(true);
      expect(inv(n, 'ana').contar(itens[i])).toBe(0);
      expect(alma(n, 'ana').lugares).toContain(QUARTO[i]);
      total += moedas(evs);
    }
    expect(total).toBe(4);
    expect(alma(n, 'ana').feitas).toContain(F_QUARTO);
    // feita a missão, o baú dá os brinquedos de novo
    n.comando('ana', vila('bau'));
    passos(n, 2);
    expect(inv(n, 'ana').contar(IOIO)).toBe(1);
  });

  it('f12 bolo: a vitamina para a vovó, que dá a fatia de bolo de fubá (comida)', () => {
    const n = abrir();
    const c = plano().pontos.casa;
    fez(n, 'ana', ...ANTES, F_CINEMA, F_QUARTO);
    // perto da vovó sem a vitamina: nada
    ir(n, 'ana', c.vovo[0], c.y, c.vovo[2]);
    let evs = passos(n, 10);
    expect(inv(n, 'ana').contar(FATIA_BOLO)).toBe(0);
    // com a vitamina na mochila (da lanchonete), longe: a primeira bolinha
    ir(n, 'ana', c.vovo[0], c.y, c.vovo[2] + 8);
    inv(n, 'ana').definir(4, { item: VITAMINA, qtd: 1 });
    evs = passos(n, 10);
    expect(movidas(evs)).toContainEqual({ id: F_BOLO, feito: 1, meta: 2, usos: [BOLO[0]] });
    ir(n, 'ana', c.vovo[0], c.y, c.vovo[2]);
    evs = passos(n, 10);
    expect(evs.some((e) => e.e === 'vilaBolo' && e.quem === 'ana')).toBe(true);
    expect(inv(n, 'ana').contar(VITAMINA)).toBe(0);
    expect(inv(n, 'ana').contar(FATIA_BOLO)).toBe(1);
    expect(movidas(evs).find((m) => m.id === F_BOLO)).toMatchObject({ concluiu: true });
    expect(moedas(evs)).toBe(5);
    // uma vez só
    evs = passos(n, 10);
    expect(evs.some((e) => e.e === 'vilaBolo')).toBe(false);
  });

  it('f2 e f7: o feno é item próprio; o trigo de um mundo salvo antes ainda vale no cocho', () => {
    const n = abrir();
    const pq = plano().pontos.parque;
    fez(n, 'ana', 'f1', 'f2', 'f4', 'f5', 'f6');
    ir(n, 'ana', pq.cocho[0] - 1, plano().h + 1, pq.cocho[2] - 1);
    passos(n, 25);
    inv(n, 'ana').definir(5, { item: 'trigo', qtd: 1 });
    n.comando('ana', vila('cocho'));
    passos(n, 3);
    expect(inv(n, 'ana').contar('trigo')).toBe(0);
    expect(alma(n, 'ana').progresso.f7).toBe(1);
    // com o trigo antigo na mochila o fardo não dá mais; sem ele, dá o feno
    ir(n, 'ana', pq.fardo[0] + 1, plano().h + 1, pq.fardo[2] + 1);
    passos(n, 25);
    n.comando('ana', vila('feno'));
    passos(n, 3);
    expect(inv(n, 'ana').contar('feno')).toBe(1);
  });
});
