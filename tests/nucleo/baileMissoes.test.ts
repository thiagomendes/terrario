import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { baileDoMundo, definirEstiloMundo, ESTILO_PADRAO, gerarChunk, indice, TAM_X, TAM_Z } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { obterBloco, Bloco } from '../../src/world/blocks';
import { sanear } from '../../src/nucleo/saneamento';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import { almaMundoVazia, missaoPorId, missoesDoMundo, moedasDoMundo } from '../../src/jogo/alma';
import {
  CHAVE_LANTERNA,
  MISSOES_BAILE,
  USOS_ABOBORA,
  USOS_DOCES,
  USOS_LULU,
  USOS_TUFINHO,
  passoDaLulu,
} from '../../src/jogo/baile';
import { LAMPIOES_CARINHA, SACOLA_DOCES, SACOLA_VAZIA, itemNoMundo } from '../../src/jogo/exclusivos';
import { idDoBloco } from '../../src/jogo/itens';
import { VERSAO_REDE } from '../../src/rede/protocolo';
import { caixasDaPecaBaile } from '../../src/world/baileSolidos';
import { TOQUES_POR_SEGUNDO } from '../../src/jogo/show';

/**
 * Spec 027 (T18): as missões n1 a n5 da Noite das Fantasias no núcleo, com o progresso de cada
 * criança (a seção 10 da spec). No aparelho e na nuvem (`confiar: false`), uma criança sozinha e
 * duas juntas (as duas na mesma missão, uma adiantada e outra atrasada, uma que escolhe de novo
 * com a outra no meio); o mundo salvo no meio da missão volta certo. Moedinhas só no fim.
 */
const BAILE = obterTema('noite-das-fantasias').mundo;
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
function abrir(confiar = true, quem: string[] = ['ana', 'bia'], extras?: Record<string, unknown>): Nucleo {
  definirEstiloMundo(BAILE);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: confiar,
    depuracao: true,
    dono: quem[0],
    ...(extras ? { dados: { extras } as never } : {}),
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
type Ev = EventoNucleo;
function passos(n: Nucleo, k = 1): Map<string, Ev[]> {
  const r = new Map<string, Ev[]>();
  for (let i = 0; i < k; i++) {
    n.passo();
    for (const [q, f] of n.quadros()) r.set(q, [...(r.get(q) ?? []), ...(f.eventos ?? [])]);
  }
  return r;
}
const plano = () => baileDoMundo(SEMENTE)!;
const Y = () => plano().h + 1;
function ir(n: Nucleo, quem: string, x: number, z: number, y = Y()): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}
const alma = (n: Nucleo, quem: string) => {
  let e = n.estado.almas.get(quem);
  if (!e) n.estado.almas.set(quem, (e = almaMundoVazia()));
  return e;
};
const fez = (n: Nucleo, quem: string, ...ids: string[]) => alma(n, quem).feitas.push(...ids);
const inv = (n: Nucleo, quem: string) => n.estado.jogadores.get(quem)!.inventario;
const cmd = (a: string, extra: Record<string, unknown> = {}) => ({ t: 'baile', a, ...extra }) as unknown as Comando;
/** Manda e espera o limite de toques por segundo passar. */
function tocar(n: Nucleo, quem: string, a: string, extra: Record<string, unknown> = {}): Map<string, Ev[]> {
  n.comando(quem, cmd(a, extra));
  return passos(n, 22);
}
const de = (evs: Map<string, Ev[]>, q: string) => evs.get(q) ?? [];
const movidas = (evs: Ev[]) => evs.flatMap((e) => (e.e === 'alma' ? e.missoes : []));
const moedas = (evs: Ev[]) => evs.reduce((s, e) => s + (e.e === 'alma' ? e.ganho.moedas : 0), 0);
const vista = (n: Nucleo, q: string) => n.estado.baile!.vistaDe(q);
/** Os pés na frente de cada porta da rua (onde a criança fica para tocar a campainha). */
const portas = () => plano().pontos.portas;

describe('spec 027 (T18): as missões n1 a n5 no núcleo', () => {
  it('a rede é a 18 da parte 1 e os comandos novos passam a limpo', () => {
    expect(VERSAO_REDE).toBe(18);
    expect(sanear({ t: 'baile', a: 'campainha', i: 5, x: 1 })).toEqual({ t: 'baile', a: 'campainha', i: 5 });
    expect(sanear({ t: 'baile', a: 'campainha', i: 6 })).toBeNull();
    expect(sanear({ t: 'baile', a: 'lanterna', i: 4 })).toEqual({ t: 'baile', a: 'lanterna', i: 4 });
    expect(sanear({ t: 'baile', a: 'lanterna', i: -1 })).toBeNull();
    expect(sanear({ t: 'baile', a: 'lanterna', i: 1.5 })).toBeNull();
    expect(sanear({ t: 'baile', a: 'carinha', c: 2 })).toEqual({ t: 'baile', a: 'carinha', c: 2 });
    expect(sanear({ t: 'baile', a: 'carinha', c: 3 })).toBeNull();
    for (const a of ['lulu', 'horta', 'lampiao', 'tufinho', 'uva'])
      expect(sanear({ t: 'baile', a, i: 9, lixo: 'x' })).toEqual({ t: 'baile', a });
    expect(sanear({ t: 'baile', a: 'moedas' })).toBeNull();
  });

  it('as contas da alma são as do núcleo; as coisas das missões são só deste mundo', () => {
    definirEstiloMundo(BAILE);
    limparPovoados();
    expect(missoesDoMundo('noite-das-fantasias').map((m) => m.id)).toEqual(['n1', 'n2', 'n3', 'n4', 'n5']);
    expect(moedasDoMundo('noite-das-fantasias')).toBe(22);
    expect(missaoPorId('n1')!.conta).toEqual({ tipo: 'lugares', usos: [...USOS_DOCES] });
    expect(missaoPorId('n2')!.conta).toEqual({ tipo: 'evento', chave: CHAVE_LANTERNA, meta: 5 });
    expect(missaoPorId('n3')!.conta).toEqual({ tipo: 'lugares', usos: [...USOS_LULU] });
    expect(missaoPorId('n4')!.conta).toEqual({ tipo: 'lugares', usos: [...USOS_ABOBORA] });
    expect(missaoPorId('n4')!.habilidade).toBe('fazendeiro');
    expect(missaoPorId('n5')!.conta).toEqual({ tipo: 'lugares', usos: [...USOS_TUFINHO] });
    expect(plano().pontos.lanternas).toHaveLength(5);
    expect(portas()).toHaveLength(6);
    for (const item of [SACOLA_VAZIA, SACOLA_DOCES, ...LAMPIOES_CARINHA]) {
      expect(itemNoMundo(item, BAILE)).toBe(true);
      expect(itemNoMundo(item, obterTema('vila-neon').mundo)).toBe(false);
    }
  });

  it('os esconderijos da Lulu e a horta do Tufinho ficam no chão livre (3 sementes)', () => {
    definirEstiloMundo(BAILE);
    for (const semente of [1337, 7, 90210]) {
      limparPovoados();
      const p = baileDoMundo(semente)!;
      const pontos = [
        ...p.pontos.esconderijos.map((e) => [e.x, e.y, e.z] as const),
        // (e o lugar de chegar no da árvore: do lado do tronco, no chão livre)
        ...p.pontos.esconderijos.flatMap((e) => (e.chegar ? [[e.chegar[0], p.h + 1, e.chegar[1]] as const] : [])),
        p.pontos.tufinhoHorta,
      ];
      expect(p.pontos.esconderijos).toHaveLength(3);
      for (const [x, y, z] of pontos) {
        const cx = Math.floor(x / TAM_X);
        const cz = Math.floor(z / TAM_Z);
        const blocos = gerarChunk(cx, cz, semente);
        const lx = Math.floor(x) - cx * TAM_X;
        const lz = Math.floor(z) - cz * TAM_Z;
        expect(y).toBe(p.h + 1);
        expect(obterBloco(blocos[indice(lx, p.h, lz)])?.solido, `chão em ${x},${z}`).toBe(true);
        expect(blocos[indice(lx, p.h, lz)]).not.toBe(Bloco.AGUA);
        expect(obterBloco(blocos[indice(lx, p.h + 1, lz)])?.solido, `pés em ${x},${z}`).toBe(false);
      }
      // o do bosque fica no bosque; o da abóbora atrás dela (do lado do palco), encostado na casca
      // e fora das caixas que a seguram
      const [ab, , bo] = p.pontos.esconderijos;
      const A = p.pontos.abobora;
      expect(ab.z).toBeLessThan(A.z - 2);
      const d = Math.hypot(ab.x - A.x, ab.z - A.z);
      expect(d).toBeGreaterThan(A.lado * 0.56);
      expect(d).toBeLessThan(A.lado * 0.7);
      for (const c of caixasDaPecaBaile(p.pecas.find((q) => q.tipo === 'abobora-gigante')!))
        expect(ab.x > c[0] - 0.3 && ab.x < c[3] + 0.3 && ab.z > c[2] - 0.3 && ab.z < c[5] + 0.3).toBe(false);
      const zb = p.zonas.bosque;
      expect(bo.x >= zb.x0 && bo.x <= zb.x1 + 1 && bo.z >= zb.z0 && bo.z <= zb.z1 + 1).toBe(true);
    }
  });

  for (const confiar of [true, false])
    it(`n1 doces ou travessuras: as portas de cada criança, o doce na sacola, a travessura (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(confiar);
      // a sacola vazia vai para a mão quando a n1 abre
      passos(n, 30);
      expect(inv(n, 'ana').contar(SACOLA_VAZIA)).toBe(1);
      expect(inv(n, 'bia').contar(SACOLA_VAZIA)).toBe(1);
      // de longe a campainha não toca
      ir(n, 'ana', portas()[0].x + 20, portas()[0].z);
      passos(n, 2);
      let evs = tocar(n, 'ana', 'campainha', { i: 0 });
      expect(de(evs, 'bia').some((e) => e.e === 'bailePorta')).toBe(false);
      let total = 0;
      const ordem = [3, 0, 5, 1, 4];
      ordem.forEach((i, k) => {
        ir(n, 'ana', portas()[i].x, portas()[i].z);
        passos(n, 2);
        evs = tocar(n, 'ana', 'campainha', { i });
        // a porta abre para todos; o doce é só da Ana
        const ev = de(evs, 'bia').find((e) => e.e === 'bailePorta');
        expect(ev).toMatchObject({ i, quem: 'ana', doce: true });
        if (ev?.e === 'bailePorta') expect(ev.travessura).toBe(k === 2 ? true : undefined);
        expect(movidas(de(evs, 'ana')).find((m) => m.id === 'n1')).toMatchObject({ feito: k + 1 });
        expect(inv(n, 'ana').contar(SACOLA_DOCES)).toBe(k + 1);
        expect(inv(n, 'ana').contar(SACOLA_VAZIA)).toBe(0);
        // o aviso da tela é o docinho que entrou na sacola, não uma sacola nova
        expect(de(evs, 'ana').filter((e) => e.e === 'coletou')).toEqual([
          { e: 'coletou', item: ['brigadeiro', 'beijinho', 'cajuzinho'][k % 3], qtd: 1 },
        ]);
        // a mesma porta de novo não conta (e não dá outro doce)
        if (k === 1) {
          passos(n, Math.ceil(MISSOES_BAILE.portaAberta / PASSO));
          const de_novo = tocar(n, 'ana', 'campainha', { i });
          expect(de(de_novo, 'bia').find((e) => e.e === 'bailePorta')).toEqual({ e: 'bailePorta', i, quem: 'ana' });
          expect(movidas(de(de_novo, 'ana'))).toEqual([]);
          expect(inv(n, 'ana').contar(SACOLA_DOCES)).toBe(2);
        }
        total += moedas(de(evs, 'ana'));
        expect(total).toBe(k === 4 ? 5 : 0);
      });
      expect(alma(n, 'ana').feitas).toContain('n1');
      expect(vista(n, 'ana').pt).toEqual(ordem);
      // a Bia não fez nada: a sacola dela continua vazia e as portas dela, nenhuma
      expect(vista(n, 'bia').pt).toEqual([]);
      expect(alma(n, 'bia').progresso['n1']).toBeUndefined();
      expect(inv(n, 'bia').contar(SACOLA_VAZIA)).toBe(1);
    });

  it('n1 com duas: a porta que a amiga acabou de abrir conta igual; uma adiantada, outra atrasada', () => {
    const n = abrir();
    const [a, b] = [portas()[1], portas()[2]];
    ir(n, 'ana', a.x, a.z);
    ir(n, 'bia', a.x + 0.8, a.z);
    passos(n, 2);
    tocar(n, 'ana', 'campainha', { i: 1 });
    // (a porta ainda aberta)
    n.comando('bia', cmd('campainha', { i: 1 }));
    let evs = passos(n, 2);
    expect(de(evs, 'ana').find((e) => e.e === 'bailePorta')).toMatchObject({ i: 1, quem: 'bia', doce: true });
    expect(n.estado.baile!.missoes.portasAbertas()).toEqual([1]);
    // a Ana adianta
    ir(n, 'ana', b.x, b.z);
    passos(n, 22);
    tocar(n, 'ana', 'campainha', { i: 2 });
    expect(vista(n, 'ana').pt).toEqual([1, 2]);
    expect(vista(n, 'bia').pt).toEqual([1]);
    // a porta fecha sozinha em 2 s
    evs = passos(n, Math.ceil(MISSOES_BAILE.portaAberta / PASSO) + 2);
    expect(n.estado.baile!.missoes.portasAbertas()).toEqual([]);
    // mundo salvo no meio: as portas de cada uma voltam certas
    const salvo = n.salvar().extras as Record<string, unknown>;
    const n2 = abrir(true, ['ana', 'bia'], salvo);
    n2.estado.almas.set('ana', alma(n, 'ana'));
    passos(n2, 2);
    expect(vista(n2, 'ana').pt).toEqual([1, 2]);
    expect(vista(n2, 'bia').pt).toEqual([1]);
    ir(n2, 'ana', b.x, b.z);
    passos(n2, 2);
    evs = tocar(n2, 'ana', 'campainha', { i: 2 });
    expect(movidas(de(evs, 'ana'))).toEqual([]);
  });

  for (const confiar of [true, false])
    it(`n2 lanternas: a acesa por uma conta (e pisca) para a outra; cada uma com as suas (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(confiar);
      const ls = plano().pontos.lanternas;
      const naLanterna = (q: string, i: number) => ir(n, q, ls[i][0] + 1.5, ls[i][2]);
      // a Ana acende as cinco
      let total = 0;
      for (let i = 0; i < 5; i++) {
        naLanterna('ana', i);
        passos(n, 2);
        const evs = tocar(n, 'ana', 'lanterna', { i });
        expect(de(evs, 'bia').find((e) => e.e === 'baileLanterna')).toEqual({ e: 'baileLanterna', i, quem: 'ana', acendeu: true, conta: true });
        total += moedas(de(evs, 'ana'));
      }
      expect(total).toBe(4);
      expect(alma(n, 'ana').feitas).toContain('n2');
      expect(vista(n, 'bia').ln).toEqual([true, true, true, true, true]);
      // a Bia chega depois: a lanterna já acesa conta para ela e pisca
      naLanterna('bia', 2);
      passos(n, 2);
      let evs = tocar(n, 'bia', 'lanterna', { i: 2 });
      expect(de(evs, 'ana').find((e) => e.e === 'baileLanterna')).toEqual({ e: 'baileLanterna', i: 2, quem: 'bia', conta: true });
      expect(movidas(de(evs, 'bia')).find((m) => m.id === 'n2')).toMatchObject({ feito: 1, meta: 5 });
      // a mesma de novo não conta
      evs = tocar(n, 'bia', 'lanterna', { i: 2 });
      expect(movidas(de(evs, 'bia'))).toEqual([]);
      expect(vista(n, 'bia').lc).toEqual([2]);
      // de longe, nada
      evs = tocar(n, 'bia', 'lanterna', { i: 4 });
      expect(de(evs, 'ana').some((e) => e.e === 'baileLanterna')).toBe(false);
    });

  it('n2 escolhida de novo: com a amiga no meio nada se apaga; sozinha, as lanternas se apagam', () => {
    const n = abrir();
    const ls = plano().pontos.lanternas;
    // a Ana acabou a lista: a n2 é o bis dela (volta aberta); a Bia está no meio da n2
    fez(n, 'ana', 'n1', 'n3', 'n4', 'n5');
    alma(n, 'ana').progresso['n2'] = 0;
    for (const [q, is] of [['ana', [0, 1, 2, 3, 4]], ['bia', [0, 1]]] as const)
      for (const i of is) {
        ir(n, q, ls[i][0] + 1.5, ls[i][2]);
        passos(n, 2);
        tocar(n, q, 'lanterna', { i });
      }
    expect(vista(n, 'ana').lc).toHaveLength(5);
    expect(vista(n, 'bia').lc).toEqual([0, 1]);
    // a Ana escolhe a n2 de novo (o bis): a rodada dela recomeça, mas a Bia tem a n2 aberta
    n.comando('ana', { t: 'almaFixar', missao: 'n2' } as Comando);
    let evs = passos(n, 2);
    expect(de(evs, 'bia').some((e) => e.e === 'baileApagou')).toBe(false);
    expect(vista(n, 'ana').lc).toEqual([]);
    expect(vista(n, 'bia').ln.every(Boolean)).toBe(true);
    // a Bia, no meio da rodada, escolhe de novo: nada muda para ela
    n.comando('bia', { t: 'almaFixar', missao: 'n2' } as Comando);
    passos(n, 2);
    expect(vista(n, 'bia').lc).toEqual([0, 1]);
    // a Ana sozinha na sala, de novo do zero: as lanternas se apagam para o recomeço
    n.desconectar('bia');
    n.comando('ana', { t: 'almaFixar', missao: null } as Comando);
    passos(n, 2);
    n.comando('ana', { t: 'almaFixar', missao: 'n2' } as Comando);
    evs = passos(n, 2);
    expect(de(evs, 'ana').some((e) => e.e === 'baileApagou')).toBe(true);
    expect(vista(n, 'ana').ln.some(Boolean)).toBe(false);
  });

  for (const confiar of [true, false])
    it(`n3 a Lulu: um esconderijo de cada vez, só para quem procura (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(confiar);
      const es = plano().pontos.esconderijos;
      fez(n, 'ana', 'n1', 'n2');
      // fora da vez: o esconderijo do bosque antes do da abóbora não vale
      ir(n, 'ana', es[2].x + 1, es[2].z);
      passos(n, 2);
      let evs = tocar(n, 'ana', 'lulu');
      expect(movidas(de(evs, 'ana'))).toEqual([]);
      let total = 0;
      for (let k = 0; k < 3; k++) {
        expect(passoDaLulu(alma(n, 'ana').lugares)).toBe(k);
        ir(n, 'ana', es[k].x + 1.2, es[k].z + 0.8);
        passos(n, 2);
        evs = tocar(n, 'ana', 'lulu');
        expect(de(evs, 'ana').find((e) => e.e === 'baileLulu')).toEqual({ e: 'baileLulu', quem: 'ana', k });
        total += moedas(de(evs, 'ana'));
      }
      expect(total).toBe(4);
      expect(alma(n, 'ana').feitas).toContain('n3');
      // a Bia, sem a n3 aberta, não acha ninguém
      ir(n, 'bia', es[0].x + 1, es[0].z);
      passos(n, 2);
      evs = tocar(n, 'bia', 'lulu');
      expect(de(evs, 'bia').some((e) => e.e === 'baileLulu')).toBe(false);
      expect(alma(n, 'bia').lugares.filter((u) => u.startsWith('lulu:'))).toEqual([]);
    });

  for (const confiar of [true, false])
    it(`n4 a abóbora de carinha: plantar, regar, crescer, colher, a carinha e o lampião na porta (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(confiar);
      const pt = plano().pontos;
      const vovo = pt.portas.find((q) => q.vovo)!;
      for (const q of ['ana', 'bia']) fez(n, q, 'n1', 'n2', 'n3');
      ir(n, 'ana', pt.canteiro[0], pt.canteiro[2] + 1);
      passos(n, 2);
      tocar(n, 'ana', 'horta');
      expect(vista(n, 'ana').hv?.f).toBe('broto');
      // a plantinha é só da Ana
      expect(vista(n, 'bia').hv).toBeUndefined();
      tocar(n, 'ana', 'horta');
      expect(vista(n, 'ana').hv?.f).toBe('regada');
      // ainda crescendo: o toque não colhe
      let evs = tocar(n, 'ana', 'horta');
      expect(movidas(de(evs, 'ana'))).toEqual([]);
      passos(n, Math.ceil(MISSOES_BAILE.cresce / PASSO));
      evs = tocar(n, 'ana', 'horta');
      expect(de(evs, 'ana').find((e) => e.e === 'baileHorta')).toMatchObject({ f: 'colheu' });
      expect(movidas(de(evs, 'ana')).find((m) => m.id === 'n4')).toMatchObject({ feito: 1 });
      expect(inv(n, 'ana').contar(idDoBloco(Bloco.ABOBORA))).toBe(1);
      // a carinha da língua de fora, na bancada
      ir(n, 'ana', pt.bancada[0], pt.bancada[2] + 1);
      passos(n, 2);
      evs = tocar(n, 'ana', 'carinha', { c: 1 });
      expect(de(evs, 'ana').find((e) => e.e === 'baileCarinha')).toMatchObject({ c: 1 });
      expect(inv(n, 'ana').contar(LAMPIOES_CARINHA[1])).toBe(1);
      expect(inv(n, 'ana').contar(idDoBloco(Bloco.ABOBORA))).toBe(0);
      expect(vista(n, 'ana').car).toBe(1);
      // a Bia também chega no último passo (o lampião do sorriso) e fica perto da porta
      alma(n, 'bia').lugares.push(USOS_ABOBORA[0], USOS_ABOBORA[1]);
      alma(n, 'bia').progresso['n4'] = 2;
      ir(n, 'bia', vovo.x + 2, vovo.z);
      ir(n, 'ana', vovo.x, vovo.z);
      passos(n, 2);
      evs = tocar(n, 'ana', 'lampiao');
      expect(de(evs, 'bia').find((e) => e.e === 'baileLampiao')).toEqual({ e: 'baileLampiao', quem: 'ana', c: 1 });
      expect(moedas(de(evs, 'ana'))).toBe(5);
      expect(moedas(de(evs, 'bia'))).toBe(5);
      expect(inv(n, 'ana').contar(LAMPIOES_CARINHA[1])).toBe(0);
      // o lampião da porta é do mundo: os dois veem a carinha da Ana
      expect(vista(n, 'bia').lp).toBe(1);
      // salvo, ele fica
      const n2 = abrir(true, ['ana'], n.salvar().extras as Record<string, unknown>);
      passos(n2, 2);
      expect(vista(n2, 'ana').lp).toBe(1);
    });

  it('n4 com duas: a amiga longe da porta não faz o passo; a plantinha salva volta pronta', () => {
    const n = abrir();
    const pt = plano().pontos;
    const vovo = pt.portas.find((q) => q.vovo)!;
    for (const q of ['ana', 'bia']) {
      fez(n, q, 'n1', 'n2', 'n3');
      alma(n, q).lugares.push(USOS_ABOBORA[0], USOS_ABOBORA[1]);
      alma(n, q).progresso['n4'] = 2;
    }
    ir(n, 'bia', vovo.x + 9, vovo.z + 6);
    ir(n, 'ana', vovo.x, vovo.z);
    passos(n, 2);
    const evs = tocar(n, 'ana', 'lampiao');
    expect(moedas(de(evs, 'ana'))).toBe(5);
    expect(moedas(de(evs, 'bia'))).toBe(0);
    expect(alma(n, 'bia').feitas).not.toContain('n4');
    // a plantinha regada vai salva e volta pronta para colher
    const n3 = abrir();
    fez(n3, 'ana', 'n1', 'n2', 'n3');
    ir(n3, 'ana', pt.canteiro[0], pt.canteiro[2] + 1);
    passos(n3, 2);
    tocar(n3, 'ana', 'horta');
    tocar(n3, 'ana', 'horta');
    const n4 = abrir(true, ['ana'], n3.salvar().extras as Record<string, unknown>);
    n4.estado.almas.set('ana', alma(n3, 'ana'));
    ir(n4, 'ana', pt.canteiro[0], pt.canteiro[2] + 1);
    passos(n4, 2);
    expect(vista(n4, 'ana').hv?.f).toBe('regada');
    const e4 = tocar(n4, 'ana', 'horta');
    expect(de(e4, 'ana').find((e) => e.e === 'baileHorta')).toMatchObject({ f: 'colheu' });
  });

  for (const confiar of [true, false])
    it(`n5 o Tufinho: foge, segue quem chamou e a entrega conta para quem está perto (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(confiar);
      const pt = plano().pontos;
      const [hx, , hz] = pt.tufinhoHorta;
      const [vx, , vz] = pt.varanda;
      expect(n.estado.baile!.missoes.tufinho()).toEqual({ o: 'casa' });
      for (const q of ['ana', 'bia']) fez(n, q, 'n1', 'n2', 'n3', 'n4');
      // a n5 abriu: ele foge para a horta
      let evs = passos(n, 6);
      expect(de(evs, 'ana').find((e) => e.e === 'baileTufinho')).toEqual({ e: 'baileTufinho', o: 'horta' });
      expect(vista(n, 'bia').tf).toEqual({ o: 'horta' });
      // de longe não chama
      ir(n, 'ana', hx + 15, hz);
      passos(n, 2);
      evs = tocar(n, 'ana', 'tufinho');
      expect(movidas(de(evs, 'ana'))).toEqual([]);
      // a Ana chama: ele segue a Ana; a Bia, perto, acha também, mas ele continua com a Ana
      ir(n, 'ana', hx + 1, hz);
      ir(n, 'bia', hx - 1, hz);
      passos(n, 2);
      evs = tocar(n, 'ana', 'tufinho');
      expect(de(evs, 'bia').find((e) => e.e === 'baileTufinho')).toEqual({ e: 'baileTufinho', o: 'segue', quem: 'ana', miou: true });
      evs = tocar(n, 'bia', 'tufinho');
      expect(movidas(de(evs, 'bia')).find((m) => m.id === 'n5')).toMatchObject({ feito: 1 });
      expect(n.estado.baile!.missoes.tufinho()).toEqual({ o: 'segue', q: 'ana' });
      // as duas levam ele até a Vovó: a entrega conta para as duas
      ir(n, 'ana', vx, vz + 2);
      ir(n, 'bia', vx + 2, vz + 2);
      evs = passos(n, 8);
      expect(de(evs, 'bia').find((e) => e.e === 'baileTufinho')).toEqual({ e: 'baileTufinho', o: 'casa', quem: 'ana' });
      expect(moedas(de(evs, 'ana'))).toBe(4);
      expect(moedas(de(evs, 'bia'))).toBe(4);
      expect(n.estado.baile!.missoes.tufinho()).toEqual({ o: 'casa' });
      expect(n.estado.baile!.missoes.copias()).toEqual({});
    });

  it('n5 entregue por uma amiga com a outra num passo anterior: a cópia fugida só na tela dela', () => {
    const n = abrir(false);
    const pt = plano().pontos;
    const [hx, , hz] = pt.tufinhoHorta;
    const [vx, , vz] = pt.varanda;
    for (const q of ['ana', 'bia']) fez(n, q, 'n1', 'n2', 'n3', 'n4');
    ir(n, 'bia', hx + 30, hz + 10);
    ir(n, 'ana', hx + 1, hz);
    passos(n, 6);
    tocar(n, 'ana', 'tufinho');
    ir(n, 'ana', vx, vz + 2);
    let evs = passos(n, 8);
    expect(moedas(de(evs, 'ana'))).toBe(4);
    expect(moedas(de(evs, 'bia'))).toBe(0);
    // o de verdade fica com a Vovó; a Bia, longe, ganha a cópia fugida na horta
    expect(vista(n, 'ana').tf).toEqual({ o: 'casa' });
    expect(vista(n, 'ana').tc).toBeUndefined();
    expect(vista(n, 'bia').tf).toEqual({ o: 'casa' });
    expect(vista(n, 'bia').tc).toBe('horta');
    // e ele não foge de novo (a Bia tem a cópia)
    passos(n, 10);
    expect(n.estado.baile!.missoes.tufinho()).toEqual({ o: 'casa' });
    // a Bia chama a cópia e ela segue a Bia até a Vovó; a Ana não ganha de novo
    ir(n, 'bia', hx + 1, hz);
    passos(n, 2);
    evs = tocar(n, 'bia', 'tufinho');
    expect(de(evs, 'bia').find((e) => e.e === 'baileTufinho')).toEqual({ e: 'baileTufinho', o: 'segue', quem: 'bia', copia: true, miou: true });
    expect(vista(n, 'bia').tc).toBe('segue');
    // salvo no meio (a cópia seguindo): volta fugida na horta
    const salvo = n.salvar().extras as Record<string, unknown>;
    const n2 = abrir(true, ['ana', 'bia'], salvo);
    for (const q of ['ana', 'bia']) n2.estado.almas.set(q, alma(n, q));
    passos(n2, 2);
    expect(vista(n2, 'bia').tc).toBe('horta');
    expect(vista(n2, 'bia').tf).toEqual({ o: 'casa' });
    ir(n, 'bia', vx + 1, vz + 2);
    evs = passos(n, 8);
    expect(de(evs, 'bia').find((e) => e.e === 'baileTufinho')).toEqual({ e: 'baileTufinho', o: 'casa', quem: 'bia', copia: true });
    expect(moedas(de(evs, 'bia'))).toBe(4);
    expect(moedas(de(evs, 'ana'))).toBe(0);
    expect(vista(n, 'bia').tc).toBeUndefined();
    expect(n.estado.baile!.missoes.tufinho()).toEqual({ o: 'casa' });
  });

  it('n5: quem o Tufinho seguia saiu da sala: ele volta para a horta', () => {
    const n = abrir();
    const [hx, , hz] = plano().pontos.tufinhoHorta;
    for (const q of ['ana', 'bia']) fez(n, q, 'n1', 'n2', 'n3', 'n4');
    ir(n, 'ana', hx + 1, hz);
    passos(n, 6);
    tocar(n, 'ana', 'tufinho');
    expect(n.estado.baile!.missoes.tufinho()).toEqual({ o: 'segue', q: 'ana' });
    n.desconectar('ana');
    passos(n, 6);
    expect(n.estado.baile!.missoes.tufinho()).toEqual({ o: 'horta' });
  });

  it('a uva da parreirinha se colhe a qualquer hora, sem missão (até 8 na mochila)', () => {
    const n = abrir(false);
    const [px, , pz] = plano().pontos.parreira;
    ir(n, 'ana', px, pz + 1);
    passos(n, 2);
    for (let k = 0; k < 10; k++) tocar(n, 'ana', 'uva');
    expect(inv(n, 'ana').contar('frutinhas')).toBe(MISSOES_BAILE.uvas);
    ir(n, 'bia', px + 20, pz);
    passos(n, 2);
    tocar(n, 'bia', 'uva');
    expect(inv(n, 'bia').contar('frutinhas')).toBe(0);
  });

  it('o limite de toques por segundo vale para os toques das missões', () => {
    const n = abrir();
    const ls = plano().pontos.lanternas;
    ir(n, 'ana', ls[0][0] + 1.5, ls[0][2]);
    passos(n, 2);
    for (let i = 0; i < 30; i++) n.comando('ana', cmd('lanterna', { i: 0 }));
    const evs = passos(n, 2);
    // (a primeira acende e conta; as outras só piscam, e no máximo o limite do segundo)
    const ls0 = de(evs, 'ana').filter((e) => e.e === 'baileLanterna');
    expect(ls0.length).toBe(TOQUES_POR_SEGUNDO);
    expect(ls0.filter((e) => e.e === 'baileLanterna' && e.conta).length).toBe(1);
  });
});
