import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { alturaTerreno, encontrarNascimento } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { sanear } from '../../src/nucleo/saneamento';
import { PARTE_CURTINHA, celulasDoMovel, metaDoMovel } from '../../src/jogo/moveis';
import type { DadosMundo } from '../../src/jogo/mundos';
import type { Comando, EventoNucleo, Quadro, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Spec 039 (T04): sentar e deitar, como as cadeiras do parque (o núcleo é dono de cada assento:
 * o sofá tem 2, a cadeira 1 e a cama 1), os casos de levantar, o jogador visto (também para quem
 * entra no meio), quem está montado desce, e o dormir com todos deitados. E o lugar de nascer
 * gravado antes da 039, no meio da cama, que passa para o lado dela.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const YP = alturaTerreno(X, Z, SEMENTE) + 24;
const X0 = X - 2;
const Z0 = Z - 2;
const NOMES = ['ana', 'bia', 'caio', 'duda'] as const;
type Quem = (typeof NOMES)[number];

function tel(x: number, y: number, z: number, extra: Partial<Telemetria> = {}): Comando {
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
    ...extra,
  };
}

function sala(n: Nucleo): void {
  const ed = n.estado.edicoes;
  for (let x = X0 - 1; x <= X0 + 9; x++)
    for (let z = Z0 - 1; z <= Z0 + 9; z++) {
      ed.definir(x, YP - 1, z, Bloco.TABUAS);
      for (let y = YP; y <= YP + 3; y++) ed.definir(x, y, z, Bloco.AR);
    }
}

function ir(n: Nucleo, quem: string, x: number, z: number, extra?: Partial<Telemetria>) {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, YP, z, extra));
}

/** Uma sala na nuvem com `quantos` amigos na beira do chão de tábuas. */
function abrir(quantos = 2): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
    dono: 'ana',
  });
  for (let i = 0; i < quantos; i++) entrar(n, NOMES[i], i);
  sala(n);
  n.passo();
  n.quadros();
  return n;
}
function entrar(n: Nucleo, quem: Quem, i: number) {
  n.conectar(quem, { perfil: { apelido: quem, aparencia: {} } });
  ir(n, quem, X0 + 0.5 + i * 2, Z0 - 0.5);
}

let ids = 1;
function mandar(n: Nucleo, quem: string, c: Record<string, unknown>): number {
  const id = ++ids;
  const s = sanear({ ...c, id });
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
  return id;
}
function porMovel(n: Nucleo, b: number, x: number, z: number, d = 0) {
  const extras = celulasDoMovel(b, x, YP, z, d)
    .slice(1)
    .map(({ x, y, z }) => ({ x, y, z }));
  mandar(n, 'ana', { t: 'colocar', x, y: YP, z, bloco: b, meta: d, slot: 0, ...(extras.length ? { extras } : {}) });
}
const usar = (n: Nucleo, quem: Quem, x: number, z: number) =>
  mandar(n, quem, { t: 'usar', x, y: YP, z });

function passo(n: Nucleo): Map<string, Quadro> {
  n.passo();
  return n.quadros();
}
const eventos = (q: Map<string, Quadro>, quem: Quem): EventoNucleo[] => q.get(quem)?.eventos ?? [];
const sentado = (n: Nucleo, quem: Quem) => n.estado.jogadores.get(quem)!.sentado;
const visto = (q: Map<string, Quadro>, quem: Quem, de: Quem) =>
  q.get(quem)?.jogadores?.find((o) => o.id === de)?.sentado;

const SOFA = { x: X0 + 2, z: Z0 + 2 };
const CADEIRA = { x: X0 + 5, z: Z0 + 2 };

describe('sentar no sofá e na cadeira (nuvem)', () => {
  it('o sofá tem dois lugares, um dono cada; a cadeira, um; quem não acha lugar ouve o não', () => {
    const n = abrir(3);
    porMovel(n, Bloco.SOFA, SOFA.x, SOFA.z);
    porMovel(n, Bloco.CADEIRA, CADEIRA.x, CADEIRA.z);
    passo(n);
    usar(n, 'ana', SOFA.x, SOFA.z);
    usar(n, 'bia', SOFA.x, SOFA.z);
    usar(n, 'caio', SOFA.x + 1, SOFA.z);
    const q = passo(n);
    expect(sentado(n, 'ana')).toMatchObject({ x: SOFA.x, z: SOFA.z, deitado: false });
    // a Bia tocou no mesmo lugar: fica com o outro do sofá
    expect(sentado(n, 'bia')).toMatchObject({ x: SOFA.x + 1, z: SOFA.z });
    expect(sentado(n, 'caio')).toBeNull();
    expect(eventos(q, 'caio')).toContainEqual({ e: 'recusa', comando: 0, motivo: 'sentar' });
    expect(eventos(q, 'ana')).toContainEqual(
      expect.objectContaining({ e: 'sentou', x: SOFA.x, z: SOFA.z, px: SOFA.x + 0.5, pz: SOFA.z + 0.5 }),
    );
    // o amigo vê quem está sentado onde
    expect(visto(q, 'caio', 'ana')).toEqual({
      movel: 'sofa',
      x: SOFA.x,
      y: YP,
      z: SOFA.z,
      d: 0,
      px: SOFA.x + 0.5,
      pz: SOFA.z + 0.5,
    });
    expect(visto(q, 'ana', 'bia')).toMatchObject({ x: SOFA.x + 1 });
    // a cadeira tem um lugar só
    usar(n, 'caio', CADEIRA.x, CADEIRA.z);
    passo(n);
    expect(sentado(n, 'caio')).toMatchObject({ x: CADEIRA.x, z: CADEIRA.z });
  });

  it('levanta ao andar, ao pular, ao tocar de novo, quando o móvel quebra e quando não chega ao lugar', () => {
    const n = abrir(2);
    porMovel(n, Bloco.SOFA, SOFA.x, SOFA.z);
    passo(n);
    // chega ao lugar (a tela leva o boneco) e depois anda: levanta, e o lugar fica livre
    usar(n, 'ana', SOFA.x, SOFA.z);
    passo(n);
    ir(n, 'ana', SOFA.x + 0.5, SOFA.z + 0.5);
    passo(n);
    expect(sentado(n, 'ana')).not.toBeNull();
    ir(n, 'ana', SOFA.x + 0.5, SOFA.z - 1.5);
    let q = passo(n);
    expect(sentado(n, 'ana')).toBeNull();
    expect(eventos(q, 'ana')).toContainEqual({ e: 'levantou' });
    usar(n, 'bia', SOFA.x, SOFA.z);
    passo(n);
    expect(sentado(n, 'bia')).toMatchObject({ x: SOFA.x });
    // pular levanta
    ir(n, 'bia', SOFA.x + 0.5, SOFA.z + 0.5, { pulos: 1 });
    passo(n);
    expect(sentado(n, 'bia')).toBeNull();
    // tocar de novo no mesmo móvel levanta
    usar(n, 'ana', SOFA.x, SOFA.z);
    passo(n);
    expect(sentado(n, 'ana')).not.toBeNull();
    usar(n, 'ana', SOFA.x + 1, SOFA.z);
    passo(n);
    expect(sentado(n, 'ana')).toBeNull();
    // o sofá quebra: as duas levantam
    usar(n, 'ana', SOFA.x, SOFA.z);
    usar(n, 'bia', SOFA.x + 1, SOFA.z);
    passo(n);
    mandar(n, 'ana', { t: 'quebrar', x: SOFA.x + 1, y: YP, z: SOFA.z, slot: 0 });
    q = passo(n);
    expect(sentado(n, 'ana')).toBeNull();
    expect(sentado(n, 'bia')).toBeNull();
    expect(eventos(q, 'bia')).toContainEqual({ e: 'levantou' });
    // quem senta e não chega ao lugar em 3 s fica de pé
    porMovel(n, Bloco.CADEIRA, CADEIRA.x, CADEIRA.z);
    passo(n);
    usar(n, 'bia', CADEIRA.x, CADEIRA.z);
    passo(n);
    expect(sentado(n, 'bia')).not.toBeNull();
    for (let i = 0; i < 62; i++) n.passo();
    expect(sentado(n, 'bia')).toBeNull();
  });

  it('quem entra no meio vê quem está sentado; quem cai e volta, ou sai, deixa o lugar', () => {
    const n = abrir(3);
    porMovel(n, Bloco.SOFA, SOFA.x, SOFA.z);
    passo(n);
    usar(n, 'ana', SOFA.x, SOFA.z);
    usar(n, 'bia', SOFA.x + 1, SOFA.z);
    passo(n);
    ir(n, 'ana', SOFA.x + 0.5, SOFA.z + 0.5);
    ir(n, 'bia', SOFA.x + 1.5, SOFA.z + 0.5);
    passo(n);
    entrar(n, 'duda', 3);
    let q = passo(n);
    expect(q.get('duda')!.primeiro).toBe(true);
    expect(visto(q, 'duda', 'ana')).toMatchObject({ x: SOFA.x });
    expect(visto(q, 'duda', 'bia')).toMatchObject({ x: SOFA.x + 1 });
    // a Bia cai e volta: volta de pé, e o lugar dela fica livre
    n.reiniciarQuadros('bia');
    q = passo(n);
    expect(sentado(n, 'bia')).toBeNull();
    expect(visto(q, 'duda', 'bia')).toBeUndefined();
    usar(n, 'caio', SOFA.x + 1, SOFA.z);
    passo(n);
    expect(sentado(n, 'caio')).toMatchObject({ x: SOFA.x + 1 });
    // a Ana sai da sala: o lugar dela fica livre
    n.desconectar('ana');
    usar(n, 'duda', SOFA.x, SOFA.z);
    passo(n);
    expect(sentado(n, 'duda')).toMatchObject({ x: SOFA.x });
  });

  it('quem está montado no brinquedo de andar desce antes de sentar', () => {
    const n = abrir(2);
    porMovel(n, Bloco.CADEIRA, CADEIRA.x, CADEIRA.z);
    passo(n);
    const bia = n.estado.jogadores.get('bia')!;
    bia.perfil = { ...bia.perfil, aparencia: { ...bia.perfil.aparencia, montado: true } };
    usar(n, 'bia', CADEIRA.x, CADEIRA.z);
    const q = passo(n);
    expect(bia.perfil.aparencia.montado).toBeUndefined();
    expect(eventos(q, 'bia')).toContainEqual(expect.objectContaining({ e: 'sentou', desceu: true }));
    // os amigos recebem a aparência nova (sem o brinquedo)
    expect(q.get('ana')!.perfis?.['bia']?.aparencia.montado).toBeUndefined();
  });
});

describe('deitar e dormir (nuvem)', () => {
  /** Uma cama para cada um, lado a lado (as cabeceiras em z0, os pés em z0 + 1). */
  function camas(n: Nucleo, quantas: number) {
    for (let i = 0; i < quantas; i++) porMovel(n, Bloco.CAMA, X0 + 1 + i * 2, Z0 + 2);
    passo(n);
  }
  /** Deita na cama `i` e a tela leva o boneco para o meio dela. */
  const deitar = (n: Nucleo, quem: Quem, i: number) => {
    usar(n, quem, X0 + 1 + i * 2, Z0 + 3);
    ir(n, quem, X0 + 1.5 + i * 2, Z0 + 3);
  };
  const noite = (n: Nucleo) => mandar(n, 'ana', { t: 'depurar', d: { f: 'hora', hora: 0.9 } });

  it('a noite só passa com todos deitados; quem levantou e deitou de novo também conta', () => {
    const n = abrir(3);
    camas(n, 3);
    noite(n);
    deitar(n, 'ana', 0);
    let q = passo(n);
    expect(sentado(n, 'ana')).toMatchObject({ deitado: true });
    expect(eventos(q, 'ana')).toContainEqual({ e: 'sonoEspera', faltam: 2 });
    deitar(n, 'bia', 1);
    passo(n);
    // a Bia levanta antes de o Caio deitar: a Ana continua esperando (não há prazo)
    ir(n, 'bia', X0 + 3.5, Z0 + 0.5, { pulos: 1 });
    for (let i = 0; i < 400; i++) n.passo();
    expect(n.estado.hora).toBeGreaterThan(0.85);
    expect(sentado(n, 'ana')).toMatchObject({ deitado: true });
    deitar(n, 'caio', 2);
    passo(n);
    expect(n.estado.hora).toBeGreaterThan(0.85);
    // a Bia deita de novo: agora são todos
    deitar(n, 'bia', 1);
    q = passo(n);
    expect(eventos(q, 'caio')).toContainEqual({ e: 'sono', dormiu: true });
    for (let i = 0; i < 40; i++) n.passo();
    expect(n.estado.hora).toBeLessThan(0.3);
  });

  it('a cama tem um lugar só; a curtinha também deita; quem sai da sala deixa os outros dormirem', () => {
    const n = abrir(2);
    camas(n, 1);
    usar(n, 'ana', X0 + 1, Z0 + 2);
    usar(n, 'bia', X0 + 1, Z0 + 3);
    let q = passo(n);
    expect(sentado(n, 'ana')).toMatchObject({ deitado: true });
    expect(sentado(n, 'bia')).toBeNull();
    expect(eventos(q, 'bia')).toContainEqual({ e: 'recusa', comando: 0, motivo: 'sentar' });
    // o deitado vai no jogador visto, com o ponto do corpo no meio da cama
    expect(visto(q, 'bia', 'ana')).toEqual({
      movel: 'cama',
      x: X0 + 1,
      y: YP,
      z: Z0 + 2,
      d: 0,
      px: X0 + 1.5,
      pz: Z0 + 3,
      deitado: true,
    });
    // a curtinha (a cama de antes, numa célula) também deita
    n.estado.edicoes.definir(X0 + 5, YP, Z0 + 2, Bloco.CAMA, metaDoMovel(0, PARTE_CURTINHA));
    usar(n, 'bia', X0 + 5, Z0 + 2);
    passo(n);
    expect(sentado(n, 'bia')).toMatchObject({ deitado: true, x: X0 + 5 });
    // de noite, a Bia levanta; a Ana fica deitada esperando; a Bia sai da sala: a noite passa
    noite(n);
    ir(n, 'bia', X0 + 5.5, Z0 + 0.5, { pulos: 1 });
    passo(n);
    expect(n.estado.hora).toBeGreaterThan(0.85);
    n.desconectar('bia');
    q = passo(n);
    expect(eventos(q, 'ana')).toContainEqual({ e: 'sono', dormiu: true });
  });
});

describe('o sofá também deita, à noite (decisão do dono, 27 nov)', () => {
  const CAMA = { x: X0 + 1, z: Z0 + 2 };
  const SOFA_N = { x: X0 + 4, z: Z0 + 3 };
  const noite = (n: Nucleo) => mandar(n, 'ana', { t: 'depurar', d: { f: 'hora', hora: 0.9 } });

  it('dois irmãos, uma cama e um sofá: a noite passa; o lugar de nascer é só o da cama', () => {
    const n = abrir(2);
    porMovel(n, Bloco.CAMA, CAMA.x, CAMA.z);
    porMovel(n, Bloco.SOFA, SOFA_N.x, SOFA_N.z);
    passo(n);
    noite(n);
    const spawnBia = { ...n.estado.jogadores.get('bia')!.spawn };
    // a Ana deita na cama; a Bia deita no sofá (os dois lugares dele)
    usar(n, 'ana', CAMA.x, CAMA.z);
    ir(n, 'ana', CAMA.x + 0.5, CAMA.z + 1);
    let q = passo(n);
    expect(eventos(q, 'ana')).toContainEqual({ e: 'sonoEspera', faltam: 1 });
    usar(n, 'bia', SOFA_N.x + 1, SOFA_N.z);
    q = passo(n);
    expect(sentado(n, 'bia')).toMatchObject({ deitado: true, x: SOFA_N.x, z: SOFA_N.z });
    // a Ana vê a Bia deitada no sofá inteiro, com o corpo no meio dele
    expect(visto(q, 'ana', 'bia')).toEqual({
      movel: 'sofa',
      x: SOFA_N.x,
      y: YP,
      z: SOFA_N.z,
      d: 0,
      px: SOFA_N.x + 1,
      pz: SOFA_N.z + 0.5,
      deitado: true,
    });
    expect(eventos(q, 'bia')).toContainEqual(
      expect.objectContaining({ e: 'sentou', movel: 'sofa', deitado: true }),
    );
    // todos deitados: a noite passa para os dois
    expect(eventos(q, 'ana')).toContainEqual({ e: 'sono', dormiu: true });
    expect(eventos(q, 'bia')).toContainEqual({ e: 'sono', dormiu: true });
    for (let i = 0; i < 40; i++) n.passo();
    expect(n.estado.hora).toBeLessThan(0.3);
    // o sofá não marca o lugar de nascer; a cama, sim
    expect(n.estado.jogadores.get('bia')!.spawn).toEqual(spawnBia);
    expect(n.estado.jogadores.get('ana')!.spawn).not.toEqual({ x: X0 + 0.5, z: Z0 - 0.5 });
  });

  it('com alguém sentado, ninguém deita no sofá; deitado nele, ninguém senta; de dia, ele é de sentar', () => {
    const n = abrir(3);
    porMovel(n, Bloco.SOFA, SOFA_N.x, SOFA_N.z);
    passo(n);
    // de dia: dois sentados, um em cada lugar
    usar(n, 'ana', SOFA_N.x, SOFA_N.z);
    usar(n, 'bia', SOFA_N.x + 1, SOFA_N.z);
    passo(n);
    expect(sentado(n, 'ana')).toMatchObject({ deitado: false, x: SOFA_N.x });
    expect(sentado(n, 'bia')).toMatchObject({ deitado: false, x: SOFA_N.x + 1 });
    // as duas chegam aos lugares (a tela leva o boneco)
    ir(n, 'ana', SOFA_N.x + 0.5, SOFA_N.z + 0.5);
    ir(n, 'bia', SOFA_N.x + 1.5, SOFA_N.z + 0.5);
    passo(n);
    // de noite, a Bia levanta; com a Ana sentada, o Caio não deita (o "não" curtinho)
    noite(n);
    passo(n);
    ir(n, 'bia', SOFA_N.x + 3.5, SOFA_N.z - 2.5);
    usar(n, 'caio', SOFA_N.x + 1, SOFA_N.z);
    let q = passo(n);
    expect(sentado(n, 'bia')).toBeNull();
    expect(sentado(n, 'caio')).toBeNull();
    expect(eventos(q, 'caio')).toContainEqual({ e: 'recusa', comando: 0, motivo: 'sentar' });
    // a Ana levanta; o Caio deita no sofá inteiro, e a Bia não senta mais nele
    ir(n, 'ana', SOFA_N.x + 0.5, SOFA_N.z - 2.5);
    passo(n);
    usar(n, 'caio', SOFA_N.x + 1, SOFA_N.z);
    passo(n);
    expect(sentado(n, 'caio')).toMatchObject({ deitado: true });
    usar(n, 'bia', SOFA_N.x, SOFA_N.z);
    q = passo(n);
    expect(sentado(n, 'bia')).toBeNull();
    expect(eventos(q, 'bia')).toContainEqual({ e: 'recusa', comando: 0, motivo: 'sentar' });
    // quem está deitado no sofá levanta como sempre (pulou), e os dois lugares ficam livres
    ir(n, 'caio', SOFA_N.x + 1, SOFA_N.z + 0.5, { pulos: 1 });
    passo(n);
    expect(sentado(n, 'caio')).toBeNull();
    usar(n, 'ana', SOFA_N.x, SOFA_N.z);
    passo(n);
    expect(sentado(n, 'ana')).toMatchObject({ deitado: true });
  });
});

describe('o lugar de nascer gravado antes da 039, no meio da cama', () => {
  /** O mundo da main: a cama de uma célula (com a frente livre) e o lugar de nascer em cima dela. */
  function mundoDaMain(): DadosMundo {
    const base = criarNucleo({ semente: SEMENTE, modo: 'criativo', versaoMundo: 2, dono: 'ana' });
    sala(base);
    // o chão embaixo da cama vai até o terreno (como numa casa de verdade: a tela põe a criança
    // no primeiro vão de dois blocos, subindo do terreno)
    for (let x = X0 + 1; x <= X0 + 5; x++)
      for (let z = Z0 + 2; z <= Z0 + 5; z++)
        for (let y = alturaTerreno(x, z, SEMENTE) + 1; y < YP; y++)
          base.estado.edicoes.definir(x, y, z, Bloco.TABUAS);
    base.estado.edicoes.definir(X0 + 3, YP, Z0 + 3, Bloco.CAMA, 0);
    // paredes dos dois lados da cabeceira (a criança nasce do lado do pé)
    for (const dx of [-1, 1])
      for (const dy of [0, 1]) base.estado.edicoes.definir(X0 + 3 + dx, YP + dy, Z0 + 3, Bloco.TABUAS);
    const s = base.salvar();
    const extras: Record<string, unknown> = { ...s.extras, spawn: { x: X0 + 3.5, z: Z0 + 3.5 } };
    delete extras['camas'];
    return { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras };
  }
  const naCama = (p: { x: number; z: number }) =>
    Math.floor(p.x) === X0 + 3 && (Math.floor(p.z) === Z0 + 3 || Math.floor(p.z) === Z0 + 4);

  it('no aparelho: renascer leva para o lado da cama, e o lugar corrigido fica gravado', () => {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'criativo',
      versaoMundo: 2,
      dados: mundoDaMain(),
      confiarNoCliente: true,
      dono: 'ana',
    });
    n.conectar('ana');
    // a cama virou a nova (a frente estava livre)
    expect(n.estado.mundo.bloco(X0 + 3, YP, Z0 + 4)).toBe(Bloco.CAMA);
    n.comando('ana', { t: 'renascer' });
    n.passo();
    const tp = (n.quadros().get('ana')!.eventos ?? []).find((e) => e.e === 'teleporte') as
      | Extract<EventoNucleo, { e: 'teleporte' }>
      | undefined;
    expect(tp).toBeDefined();
    expect(naCama(tp!)).toBe(false);
    // do lado do pé (os lados da cabeceira têm parede)
    expect(Math.floor(tp!.z)).toBe(Z0 + 4);
    expect(n.estado.mundo.bloco(Math.floor(tp!.x), YP, Math.floor(tp!.z))).toBe(Bloco.AR);
    expect(naCama(n.salvar().extras['spawn'] as { x: number; z: number })).toBe(false);
  });

  it('na nuvem: voltar para casa leva para o lado da cama', () => {
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'criativo',
      versaoMundo: 2,
      dados: mundoDaMain(),
      confiarNoCliente: false,
      depuracao: true,
      dono: 'ana',
    });
    n.conectar('bia', {
      perfil: { apelido: 'Bia', aparencia: {} },
      salvo: {
        inventario: undefined,
        sobrevivencia: undefined as never,
        spawn: { x: X0 + 3.5, z: Z0 + 3.5 },
        pos: { x: X0 + 0.5, y: YP, z: Z0 - 0.5, yaw: 0, pitch: 0 },
      },
    });
    n.comando('bia', { t: 'voltarCasa' });
    n.passo();
    const tp = (n.quadros().get('bia')!.eventos ?? []).find((e) => e.e === 'teleporte') as
      | Extract<EventoNucleo, { e: 'teleporte' }>
      | undefined;
    expect(tp).toBeDefined();
    expect(naCama(tp!)).toBe(false);
    expect(n.dadosJogador('bia')!.spawn).toEqual({ x: tp!.x, z: tp!.z });
  });
});
