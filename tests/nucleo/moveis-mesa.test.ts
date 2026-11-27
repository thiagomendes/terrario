import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { encontrarNascimento, alturaTerreno } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { sanear } from '../../src/nucleo/saneamento';
import { indiceDonoDe } from '../../src/world/edicoes';
import { celulasDoMovel, metaDoMovel, movelEm, type LeitorMoveis } from '../../src/jogo/moveis';
import { direcaoParaAMesa, lugaresDaMesa } from '../../src/jogo/mesa';
import { DURA_MUSICA, TV_SOZINHA } from '../../src/jogo/ligados';
import { ESPERA_CANAL } from '../../src/jogo/casa';
import { DURACAO_REFEICAO } from '../../src/jogo/refeicao';
import { TEMPO_FUNDIR } from '../../src/jogo/receitas';
import type { Comando, EventoNucleo, MovelLigado, Quadro } from '../../src/nucleo/protocolo';

/**
 * Spec 039b (T01b): a mesa que junta para comer e o estado dos móveis ligados (`moveisLigados`),
 * no servidor local e na nuvem (`confiar: false`, tudo pelo saneamento): os lugares em volta, a
 * cadeira que vira para a mesa só no `colocar`, quem come (de 2 a 5 sentados), a TV e o som,
 * quem entra no meio e quem cai e volta.
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const YP = alturaTerreno(X, Z, SEMENTE) + 24;
const X0 = X - 2;
const Z0 = Z - 2;
/** A mesa: duas células para +x (direção 0). */
const MESA = { x: X0 + 3, z: Z0 + 4 };
/** Os seis lugares em volta, na ordem fixa (x, depois z). */
const LUGARES = [
  { x: MESA.x - 1, z: MESA.z },
  { x: MESA.x, z: MESA.z - 1 },
  { x: MESA.x, z: MESA.z + 1 },
  { x: MESA.x + 1, z: MESA.z - 1 },
  { x: MESA.x + 1, z: MESA.z + 1 },
  { x: MESA.x + 2, z: MESA.z },
];

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

type Modo = 'local' | 'nuvem';
const NOMES = ['ana', 'bia', 'caio', 'duda', 'eva', 'fabi'] as const;
type Quem = (typeof NOMES)[number];

function sala(n: Nucleo): void {
  const ed = n.estado.edicoes;
  for (let x = X0 - 1; x <= X0 + 9; x++)
    for (let z = Z0 - 1; z <= Z0 + 9; z++) {
      ed.definir(x, YP - 1, z, Bloco.TABUAS);
      for (let y = YP; y <= YP + 3; y++) ed.definir(x, y, z, Bloco.AR);
    }
}

const lugar = (i: number) => ({ x: X0 + 0.5 + i, y: YP, z: Z0 - 0.5 });

function ir(n: Nucleo, quem: string, x: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, YP, z));
}

function abrir(modo: Modo, quantos = 2, jogo: 'criativo' | 'sobrevivencia' = 'criativo'): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: jogo,
    versaoMundo: 2,
    confiarNoCliente: modo === 'local',
    depuracao: true,
    dono: 'ana',
  });
  const q = modo === 'local' ? 1 : quantos;
  for (let i = 0; i < q; i++) entrar(n, NOMES[i], i, false);
  sala(n);
  for (let i = 0; i < q; i++) ir(n, NOMES[i], lugar(i).x, lugar(i).z);
  n.passo();
  n.quadros();
  return n;
}
function entrar(n: Nucleo, quem: Quem, i: number, andar = true): void {
  n.conectar(quem, { perfil: { apelido: quem[0].toUpperCase() + quem.slice(1), aparencia: {} } });
  if (andar) ir(n, quem, lugar(i).x, lugar(i).z);
}

let ids = 1;
function mandar(n: Nucleo, quem: string, c: Record<string, unknown>): number {
  const id = ++ids;
  const s = sanear({ ...c, id });
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
  return id;
}
function porMovel(n: Nucleo, b: number, x: number, z: number, d = 0, quem: Quem = 'ana') {
  const extras = celulasDoMovel(b, x, YP, z, d)
    .slice(1)
    .map(({ x, y, z }) => ({ x, y, z }));
  return mandar(n, quem, {
    t: 'colocar',
    x,
    y: YP,
    z,
    bloco: b,
    meta: d,
    slot: 0,
    ...(extras.length ? { extras } : {}),
  });
}
const usar = (n: Nucleo, quem: Quem, x: number, z: number, extra: Record<string, unknown> = {}) =>
  mandar(n, quem, { t: 'usar', x, y: YP, z, ...extra });
const bloco = (n: Nucleo, x: number, z: number) => n.estado.mundo.bloco(x, YP, z);
const meta = (n: Nucleo, x: number, z: number) => n.estado.edicoes.obterMeta(x, YP, z);
const jog = (n: Nucleo, quem: Quem) => n.estado.jogadores.get(quem)!;
function passo(n: Nucleo): Map<string, Quadro> {
  n.passo();
  return n.quadros();
}
const eventos = (q: Map<string, Quadro>, quem: Quem): EventoNucleo[] => q.get(quem)?.eventos ?? [];
const leitor = (n: Nucleo): LeitorMoveis => ({
  bloco: (x, y, z) => n.estado.mundo.bloco(x, y, z),
  meta: (x, y, z) => n.estado.edicoes.obterMeta(x, y, z),
  dono: (x, y, z) => {
    const v = n.estado.edicoes.obterValor(x, y, z);
    return v === undefined ? null : indiceDonoDe(v);
  },
});

/** Senta `quem` na cadeira (ou no sofá) da célula e leva o boneco até o assento. */
function sentar(n: Nucleo, quem: Quem, x: number, z: number): void {
  ir(n, quem, x + 0.5, z + 0.5);
  usar(n, quem, x, z);
  passo(n);
  ir(n, quem, x + 0.5, z + 0.5);
  passo(n);
  expect(jog(n, quem).sentado, quem).toMatchObject({ x, z, chegou: true, deitado: false });
}

/** A mesa e as cadeiras dos lugares pedidos (todas olhando para +z, como vieram). */
function mesaCom(n: Nucleo, cadeiras: number): void {
  porMovel(n, Bloco.MESA, MESA.x, MESA.z);
  for (const c of LUGARES.slice(0, cadeiras))
    mandar(n, 'ana', {
      t: 'editar',
      lote: [{ x: c.x, y: YP, z: c.z, v: Bloco.CADEIRA | (metaDoMovel(0, 0) << 8) }],
    });
  passo(n);
  expect(bloco(n, MESA.x + 1, MESA.z)).toBe(Bloco.MESA);
}

const pratos = (q: Map<string, Quadro>, quem: Quem) =>
  eventos(q, quem).filter((e): e is Extract<EventoNucleo, { e: 'prato' }> => e.e === 'prato');
const comeu = (q: Map<string, Quadro>, quem: Quem) => eventos(q, quem).some((e) => e.e === 'comeu');
const recusaMesa = (q: Map<string, Quadro>, quem: Quem) =>
  eventos(q, quem).some((e) => e.e === 'recusa' && e.motivo === 'mesa');

describe('a mesa, as regras puras', () => {
  it('os lugares em volta: a cadeira e o sofá encostados, no mesmo andar; a peça solta não', () => {
    const n = abrir('local');
    mesaCom(n, 2);
    // o sofá encostado no lado de baixo (as duas células encostam)
    porMovel(n, Bloco.SOFA, MESA.x, MESA.z + 1);
    // uma cadeira um andar acima não conta; a peça solta de sofá também não
    n.estado.edicoes.definir(MESA.x + 2, YP, MESA.z, Bloco.SOFA, metaDoMovel(0, 1));
    passo(n);
    const m = movelEm(leitor(n), MESA.x, YP, MESA.z)!;
    expect(lugaresDaMesa(leitor(n), m).map(({ x, z }) => ({ x, z }))).toEqual([
      LUGARES[0],
      LUGARES[1],
      LUGARES[2],
      LUGARES[4],
    ]);
  });

  it('a cadeira colada à mesa vira de frente para ela; com mesa dos dois lados, a primeira direção', () => {
    const n = abrir('local');
    mesaCom(n, 0);
    const l = leitor(n);
    // ao norte da mesa (z - 1): de frente para +z (0); a oeste: para +x (1); ao sul: para -z (2)
    expect(direcaoParaAMesa(l, MESA.x, YP, MESA.z - 1)).toBe(0);
    expect(direcaoParaAMesa(l, MESA.x - 1, YP, MESA.z)).toBe(1);
    expect(direcaoParaAMesa(l, MESA.x + 1, YP, MESA.z + 1)).toBe(2);
    expect(direcaoParaAMesa(l, MESA.x + 2, YP, MESA.z)).toBe(3);
    // longe da mesa: nada
    expect(direcaoParaAMesa(l, MESA.x + 4, YP, MESA.z)).toBeNull();
  });
});

for (const modo of ['local', 'nuvem'] as const)
  describe(`a cadeira que vira para a mesa (${modo})`, () => {
    it('no colocar vira; no lote do criativo (o colar e o espelho) fica como veio', () => {
      const n = abrir(modo);
      ir(n, 'ana', MESA.x + 2.5, MESA.z - 1.5);
      passo(n);
      porMovel(n, Bloco.MESA, MESA.x, MESA.z);
      passo(n);
      // posta ao sul olhando para +z (as costas para a mesa): vira para -z
      porMovel(n, Bloco.CADEIRA, MESA.x, MESA.z + 1, 0);
      // longe da mesa: fica como veio
      porMovel(n, Bloco.CADEIRA, MESA.x + 4, MESA.z + 3, 3);
      // o colar: a mesa e a cadeira juntas, com a cadeira de costas, como estavam
      const v = (b: number, d: number, parte: number) => b | (metaDoMovel(d, parte) << 8);
      mandar(n, 'ana', {
        t: 'editar',
        lote: [
          { x: MESA.x, y: YP, z: MESA.z + 3, v: v(Bloco.MESA, 0, 0) },
          { x: MESA.x + 1, y: YP, z: MESA.z + 3, v: v(Bloco.MESA, 0, 1) },
          { x: MESA.x, y: YP, z: MESA.z + 4, v: v(Bloco.CADEIRA, 0, 0) },
        ],
      });
      passo(n);
      expect(bloco(n, MESA.x, MESA.z + 1)).toBe(Bloco.CADEIRA);
      expect(meta(n, MESA.x, MESA.z + 1)).toBe(metaDoMovel(2, 0));
      expect(meta(n, MESA.x + 4, MESA.z + 3)).toBe(metaDoMovel(3, 0));
      expect(bloco(n, MESA.x, MESA.z + 4)).toBe(Bloco.CADEIRA);
      expect(meta(n, MESA.x, MESA.z + 4)).toBe(metaDoMovel(0, 0));
    });
  });

describe('comer junto na mesa (nuvem)', () => {
  it('quem está em pé ao lado põe; os 2 sentados comem, uma refeição cada; quem pôs não', () => {
    const n = abrir('nuvem', 3, 'sobrevivencia');
    // na sobrevivência a mesa e as cadeiras vêm do lote do criativo de teste: o núcleo de teste
    // põe direto
    const ed = n.estado.edicoes;
    for (const [x, z, b, parte] of [
      [MESA.x, MESA.z, Bloco.MESA, 0],
      [MESA.x + 1, MESA.z, Bloco.MESA, 1],
      [LUGARES[0].x, LUGARES[0].z, Bloco.CADEIRA, 0],
      [LUGARES[5].x, LUGARES[5].z, Bloco.CADEIRA, 0],
    ])
      ed.definir(x, YP, z, b, metaDoMovel(0, parte));
    passo(n);
    sentar(n, 'bia', LUGARES[5].x, LUGARES[5].z);
    sentar(n, 'caio', LUGARES[0].x, LUGARES[0].z);
    // com fome (o estado é só de leitura fora do núcleo; o teste mexe direto)
    for (const q of ['bia', 'caio'] as const)
      (jog(n, q).sobrevivencia.estado as { fome: number }).fome = 4;
    ir(n, 'ana', MESA.x + 0.5, MESA.z - 1.5);
    jog(n, 'ana').inventario.definir(2, { item: 'carne_assada', qtd: 3 });
    usar(n, 'ana', MESA.x + 1, MESA.z, { slot: 2 });
    const q = passo(n);
    expect(jog(n, 'ana').inventario.obter(2)).toEqual({ item: 'carne_assada', qtd: 2 });
    expect(comeu(q, 'bia')).toBe(true);
    expect(comeu(q, 'caio')).toBe(true);
    expect(comeu(q, 'ana')).toBe(false);
    for (const quem of ['bia', 'caio'] as const) {
      expect(jog(n, quem).sobrevivencia.estado.fome).toBeGreaterThan(4);
      expect(jog(n, quem).comendo?.item).toBe('carne_assada');
      expect(jog(n, quem).acoes[2]).toBe(1);
    }
    // o prato vai para todos perto, com quantos comem
    for (const quem of ['ana', 'bia', 'caio'] as const)
      expect(pratos(q, quem)).toEqual([
        { e: 'prato', x: MESA.x, y: YP, z: MESA.z, item: 'carne_assada', quantos: 2 },
      ]);
    // logo depois: os dois ainda comem, então ninguém sobra para comer (o não, nada sai)
    usar(n, 'ana', MESA.x, MESA.z, { slot: 2 });
    const q2 = passo(n);
    expect(recusaMesa(q2, 'ana')).toBe(true);
    expect(jog(n, 'ana').inventario.obter(2)).toEqual({ item: 'carne_assada', qtd: 2 });
    // terminada a refeição, comem de novo
    for (let i = 0; i < (DURACAO_REFEICAO + 0.2) * 20; i++) n.passo();
    usar(n, 'ana', MESA.x, MESA.z, { slot: 2 });
    const q3 = passo(n);
    expect(comeu(q3, 'bia')).toBe(true);
    expect(jog(n, 'ana').inventario.obter(2)).toEqual({ item: 'carne_assada', qtd: 1 });
  });

  it('com 5 sentados comem 4: quem pôs primeiro, depois a ordem fixa dos assentos', () => {
    const n = abrir('nuvem', 5);
    mesaCom(n, 6);
    // a Eva senta no último lugar e é quem põe; os outros, nos quatro primeiros
    sentar(n, 'ana', LUGARES[0].x, LUGARES[0].z);
    sentar(n, 'bia', LUGARES[1].x, LUGARES[1].z);
    sentar(n, 'caio', LUGARES[2].x, LUGARES[2].z);
    sentar(n, 'duda', LUGARES[3].x, LUGARES[3].z);
    sentar(n, 'eva', LUGARES[5].x, LUGARES[5].z);
    jog(n, 'eva').inventario.definir(0, { item: 'pao', qtd: 1 });
    usar(n, 'eva', MESA.x + 1, MESA.z, { slot: 0 });
    const q = passo(n);
    expect(['eva', 'ana', 'bia', 'caio', 'duda'].map((k) => comeu(q, k as Quem))).toEqual([
      true,
      true,
      true,
      true,
      false,
    ]);
    // uma comida só sai da mochila (no criativo ela acaba como de verdade)
    expect(jog(n, 'eva').inventario.obter(0)).toBeNull();
    expect(pratos(q, 'duda')[0]?.quantos).toBe(4);
  });

  it('sentado sem ter chegado ao assento não conta; sentado longe não põe; sem comida, o não', () => {
    const n = abrir('nuvem', 3);
    mesaCom(n, 2);
    ir(n, 'ana', MESA.x + 2.5, MESA.z - 1.5);
    passo(n);
    porMovel(n, Bloco.CADEIRA, MESA.x + 5, MESA.z + 3, 0);
    passo(n);
    // a Bia tocou na cadeira mas não chegou ao lugar
    ir(n, 'bia', LUGARES[0].x + 0.5, LUGARES[0].z - 0.6);
    usar(n, 'bia', LUGARES[0].x, LUGARES[0].z);
    passo(n);
    expect(jog(n, 'bia').sentado?.chegou).toBe(false);
    // o Caio está sentado na cadeira longe da mesa
    sentar(n, 'caio', MESA.x + 5, MESA.z + 3);
    jog(n, 'caio').inventario.definir(0, { item: 'pao', qtd: 2 });
    usar(n, 'caio', MESA.x + 1, MESA.z, { slot: 0 });
    let q = passo(n);
    expect(recusaMesa(q, 'caio')).toBe(true);
    // a Ana, ao lado, sem ninguém que chegou: o não, e nada sai
    ir(n, 'ana', MESA.x + 0.5, MESA.z - 1.5);
    jog(n, 'ana').inventario.definir(0, { item: 'pao', qtd: 2 });
    usar(n, 'ana', MESA.x, MESA.z, { slot: 0 });
    q = passo(n);
    expect(recusaMesa(q, 'ana')).toBe(true);
    expect(comeu(q, 'bia')).toBe(false);
    expect(jog(n, 'ana').inventario.obter(0)).toEqual({ item: 'pao', qtd: 2 });
    // com uma tábua na mão também é o não
    jog(n, 'ana').inventario.definir(1, { item: 'graveto', qtd: 2 });
    usar(n, 'ana', MESA.x, MESA.z, { slot: 1 });
    expect(recusaMesa(passo(n), 'ana')).toBe(true);
    expect(jog(n, 'ana').inventario.obter(1)).toEqual({ item: 'graveto', qtd: 2 });
  });

  it('o visitante também põe e come; quem senta em volta e põe come junto', () => {
    const n = abrir('nuvem', 2);
    mesaCom(n, 2);
    n.definirConstrucao('bia', false);
    sentar(n, 'bia', LUGARES[0].x, LUGARES[0].z);
    sentar(n, 'ana', LUGARES[1].x, LUGARES[1].z);
    jog(n, 'bia').inventario.definir(0, { item: 'pao', qtd: 2 });
    usar(n, 'bia', MESA.x, MESA.z, { slot: 0 });
    const q = passo(n);
    expect(comeu(q, 'bia')).toBe(true);
    expect(comeu(q, 'ana')).toBe(true);
  });

  it('o sofá encostado conta: sentado come; deitado (de noite) não', () => {
    const n = abrir('nuvem', 2);
    mesaCom(n, 0);
    porMovel(n, Bloco.SOFA, MESA.x, MESA.z + 1);
    passo(n);
    sentar(n, 'bia', MESA.x + 1, MESA.z + 1);
    ir(n, 'ana', MESA.x + 0.5, MESA.z - 1.5);
    jog(n, 'ana').inventario.definir(0, { item: 'pao', qtd: 3 });
    usar(n, 'ana', MESA.x, MESA.z, { slot: 0 });
    expect(comeu(passo(n), 'bia')).toBe(true);
    // de noite, tocar de novo no sofá deita a Bia (inteira, nos dois lugares)
    mandar(n, 'ana', { t: 'depurar', d: { f: 'hora', hora: 0.9 } });
    for (let i = 0; i < (DURACAO_REFEICAO + 0.2) * 20; i++) n.passo();
    usar(n, 'bia', MESA.x + 1, MESA.z + 1);
    passo(n);
    ir(n, 'bia', jog(n, 'bia').sentado!.px, jog(n, 'bia').sentado!.pz);
    passo(n);
    expect(jog(n, 'bia').sentado).toMatchObject({ deitado: true, chegou: true });
    usar(n, 'ana', MESA.x, MESA.z, { slot: 0 });
    const q = passo(n);
    expect(comeu(q, 'bia')).toBe(false);
    expect(recusaMesa(q, 'ana')).toBe(true);
    expect(jog(n, 'ana').inventario.obter(0)).toEqual({ item: 'pao', qtd: 2 });
  });

  it('o slot do usar é saneado: fora da mochila, recusa', () => {
    expect(sanear({ t: 'usar', id: 3, x: 1, y: 2, z: 3, slot: 99 })).toBeNull();
    expect(sanear({ t: 'usar', id: 3, x: 1, y: 2, z: 3, slot: -1 })).toBeNull();
    expect(sanear({ t: 'usar', id: 3, x: 1, y: 2, z: 3, slot: 'a' })).toBeNull();
    expect(sanear({ t: 'usar', id: 3, x: 1, y: 2, z: 3, slot: 4 })).not.toBeNull();
    expect(sanear({ t: 'usar', id: 3, x: 1, y: 2, z: 3 })).not.toBeNull();
  });
});

const TV = { x: X0 + 6, z: Z0 + 7 };
const SOM = { x: X0 + 1, z: Z0 + 7 };
/** Perto de tudo da sala (a TV, o som, o fogão e a geladeira, ao alcance da mão). */
const PERTO = { x: X0 + 3.5, z: Z0 + 5.5 };
const ligadosDe = (q: Map<string, Quadro>, quem: Quem) => q.get(quem)?.moveisLigados;
/** A próxima lista que o quadro leva (sem mudança, ela vai de novo a cada 20 passos). */
function proximaLista(n: Nucleo, quem: Quem): MovelLigado[] | undefined {
  for (let i = 0; i < 21; i++) {
    const l = ligadosDe(passo(n), quem);
    if (l) return l;
  }
  return undefined;
}
const tvDe = (l: MovelLigado[] | undefined) =>
  l?.find((e): e is Extract<MovelLigado, { tipo: 'tv' | 'som' }> => e.tipo === 'tv');

for (const modo of ['local', 'nuvem'] as const)
  describe(`os móveis ligados (${modo})`, () => {
    it('a TV: cada toque o próximo desenho, a esperinha, o quinto desliga; o quadro leva', () => {
      const n = abrir(modo);
      ir(n, 'ana', PERTO.x, PERTO.z);
      passo(n);
      porMovel(n, Bloco.TV, TV.x, TV.z);
      passo(n);
      // nada ligado: o quadro não leva o campo
      expect(ligadosDe(passo(n), 'ana')).toBeUndefined();
      usar(n, 'ana', TV.x + 1, TV.z);
      let q = passo(n);
      expect(tvDe(ligadosDe(q, 'ana'))).toMatchObject({ x: TV.x, y: YP, z: TV.z, programa: 0 });
      // na esperinha nada muda
      usar(n, 'ana', TV.x, TV.z);
      passo(n);
      expect(tvDe(proximaLista(n, 'ana'))?.programa).toBe(0);
      const vistos: number[] = [];
      for (let k = 0; k < 4; k++) {
        for (let i = 0; i < ESPERA_CANAL * 20 + 1; i++) n.passo();
        usar(n, 'ana', TV.x, TV.z);
        q = passo(n);
        vistos.push(tvDe(ligadosDe(q, 'ana'))?.programa ?? -1);
      }
      // 1, 2, 3 e o quinto toque desliga (a lista vazia apaga a de antes)
      expect(vistos).toEqual([1, 2, 3, -1]);
      expect(ligadosDe(q, 'ana')).toEqual([]);
      // e depois o campo não vai mais
      for (let i = 0; i < 25; i++) n.passo();
      expect(ligadosDe(passo(n), 'ana')).toBeUndefined();
    });

    it('a TV desliga sozinha 3 minutos depois de ninguém perto; o som para sozinho e no toque', () => {
      const n = abrir(modo);
      ir(n, 'ana', PERTO.x, PERTO.z);
      passo(n);
      porMovel(n, Bloco.TV, TV.x, TV.z);
      porMovel(n, Bloco.SOM, SOM.x, SOM.z);
      passo(n);
      usar(n, 'ana', TV.x, TV.z);
      usar(n, 'ana', SOM.x, SOM.z);
      let q = passo(n);
      const tipos = (ligadosDe(q, 'ana') ?? []).map((e) => e.tipo);
      expect(tipos.sort()).toEqual(['som', 'tv']);
      // o som para sozinho depois da musiquinha
      for (let i = 0; i < DURA_MUSICA * 20 + 21; i++) n.passo();
      q = passo(n);
      expect(ligadosDe(q, 'ana')?.map((e) => e.tipo)).toEqual(['tv']);
      // de novo, e outro toque para antes (depois da esperinha)
      usar(n, 'ana', SOM.x, SOM.z);
      for (let i = 0; i < 40; i++) n.passo();
      usar(n, 'ana', SOM.x, SOM.z);
      q = passo(n);
      expect(ligadosDe(q, 'ana')?.map((e) => e.tipo)).toEqual(['tv']);
      // perto, a TV fica ligada; longe, 3 minutos depois desliga
      for (let i = 0; i < (TV_SOZINHA + 5) * 20; i += 20) {
        ir(n, 'ana', PERTO.x, PERTO.z);
        for (let k = 0; k < 20; k++) n.passo();
      }
      expect(tvDe(proximaLista(n, 'ana'))).toBeDefined();
      // longe (mais de 9,5 blocos da TV, ainda dentro dos 32): 3 minutos e desliga
      // (na nuvem a Bia, na beira da sala, também estava perto: vai junto)
      ir(n, 'ana', TV.x + 0.5, TV.z - 12);
      if (modo === 'nuvem') ir(n, 'bia', TV.x - 0.5, TV.z - 12);
      for (let i = 0; i < (TV_SOZINHA - 5) * 20; i++) n.passo();
      expect(tvDe(proximaLista(n, 'ana'))).toBeDefined();
      for (let i = 0; i < 12 * 20; i++) n.passo();
      expect(proximaLista(n, 'ana')).toEqual([]);
    });

    it('a TV trocada pelo som na mesma âncora (o lote): o toque liga o som, não desliga a TV', () => {
      const n = abrir(modo);
      ir(n, 'ana', PERTO.x, PERTO.z);
      passo(n);
      porMovel(n, Bloco.TV, TV.x, TV.z);
      passo(n);
      usar(n, 'ana', TV.x, TV.z);
      passo(n);
      while ((passo(n).get('ana')!.n + 1) % 20 !== 5);
      // o lote tira a TV inteira e põe o som na âncora dela
      mandar(n, 'ana', { t: 'editar', lote: [{ x: TV.x, y: YP, z: TV.z, v: Bloco.SOM }] });
      usar(n, 'ana', TV.x, TV.z);
      const q = passo(n).get('ana')!;
      expect(bloco(n, TV.x, TV.z)).toBe(Bloco.SOM);
      expect(q.moveisLigados).toEqual([
        { tipo: 'som', x: TV.x, y: YP, z: TV.z, programa: 0, desde: expect.any(Number) },
      ]);
    });

    it('quebrar a TV ligada tira ela da lista; o fogão cozinhando e a geladeira aberta entram', () => {
      const n = abrir(modo);
      ir(n, 'ana', PERTO.x, PERTO.z);
      passo(n);
      porMovel(n, Bloco.TV, TV.x, TV.z);
      porMovel(n, Bloco.FOGAO, X0 + 3, Z0 + 7);
      porMovel(n, Bloco.GELADEIRA, X0 + 4, Z0 + 7);
      passo(n);
      usar(n, 'ana', TV.x, TV.z);
      passo(n);
      // quebrar sai na hora (num passo longe da conferência de cada segundo)
      while ((passo(n).get('ana')!.n + 1) % 20 !== 5);
      mandar(n, 'ana', { t: 'quebrar', x: TV.x + 1, y: YP + 1, z: TV.z, slot: 0 });
      const qq = passo(n).get('ana')!;
      expect(qq.n % 20).toBe(5);
      expect(qq.moveisLigados).toEqual([]);
      // o fogão com milho cozinha: entra com a receita e o progresso
      usar(n, 'ana', X0 + 3, Z0 + 7);
      mandar(n, 'ana', {
        t: 'transacao',
        mudancas: [{ onde: 'fog', i: 0, antes: null, depois: { item: 'milho', qtd: 2 } }],
      });
      let q = passo(n);
      expect(ligadosDe(q, 'ana')).toEqual([
        {
          tipo: 'fogao',
          x: X0 + 3,
          y: YP,
          z: Z0 + 7,
          receita: 'pipoca',
          progresso: expect.any(Number),
        },
      ]);
      for (let i = 0; i < TEMPO_FUNDIR * 10; i++) n.passo();
      // a cada 20 passos o fogão vai de novo, com o progresso andando
      const fog = proximaLista(n, 'ana')?.find((e) => e.tipo === 'fogao');
      expect(fog?.tipo).toBe('fogao');
      expect(fog?.tipo === 'fogao' ? fog.progresso : 0).toBeGreaterThan(0.3);
      // a geladeira aberta entra (e sai quando fecha)
      usar(n, 'ana', X0 + 4, Z0 + 7);
      q = passo(n);
      expect(ligadosDe(q, 'ana')?.some((e) => e.tipo === 'geladeira')).toBe(true);
      mandar(n, 'ana', { t: 'fecharConteiner' });
      q = passo(n);
      expect(ligadosDe(q, 'ana')?.some((e) => e.tipo === 'geladeira')).toBe(false);
      // tirar a comida crua: o fogão para e sai da lista
      usar(n, 'ana', X0 + 3, Z0 + 7);
      passo(n);
      const entrada = n.estado.conteineres.fogao(X0 + 3, YP, Z0 + 7).entrada;
      mandar(n, 'ana', {
        t: 'transacao',
        mudancas: [{ onde: 'fog', i: 0, antes: entrada, depois: null }],
      });
      q = passo(n);
      expect(ligadosDe(q, 'ana')?.some((e) => e.tipo === 'fogao')).toBe(false);
    });
  });

describe('os móveis ligados com amigos (nuvem)', () => {
  it('quem entra no meio vê a TV no primeiro quadro; quem cai e volta também; longe não', () => {
    const n = abrir('nuvem', 2);
    ir(n, 'ana', PERTO.x, PERTO.z);
    passo(n);
    porMovel(n, Bloco.TV, TV.x, TV.z);
    passo(n);
    for (let k = 0; k < 2; k++) {
      usar(n, 'ana', TV.x, TV.z);
      for (let i = 0; i < ESPERA_CANAL * 20 + 1; i++) n.passo();
    }
    let q = passo(n);
    // a Bia, que já estava, vê o mesmo
    expect(tvDe(ligadosDe(q, 'bia'))?.programa).toBe(1);
    const desde = tvDe(ligadosDe(q, 'bia'))!;
    // a Caio entra no meio: o primeiro quadro dele já traz a TV no desenho 1, com o mesmo "desde"
    entrar(n, 'caio', 2);
    q = passo(n);
    expect(q.get('caio')!.primeiro).toBe(true);
    expect(tvDe(ligadosDe(q, 'caio'))).toEqual(desde);
    // a Bia cai e volta
    n.reiniciarQuadros('bia');
    q = passo(n);
    expect(tvDe(ligadosDe(q, 'bia'))).toEqual(desde);
    // a Duda está longe (mais de 32 blocos): não recebe
    entrar(n, 'duda', 3);
    ir(n, 'duda', TV.x + 0.5, TV.z + 40);
    q = passo(n);
    expect(ligadosDe(q, 'duda')).toBeUndefined();
    // a geladeira aberta pela Ana aparece para a Bia
    porMovel(n, Bloco.GELADEIRA, X0 + 4, Z0 + 7);
    passo(n);
    usar(n, 'ana', X0 + 4, Z0 + 7);
    q = passo(n);
    expect(ligadosDe(q, 'bia')?.some((e) => e.tipo === 'geladeira')).toBe(true);
  });

  it('não vai salvo: o mundo reaberto começa com tudo desligado', () => {
    const n = abrir('nuvem', 1);
    ir(n, 'ana', PERTO.x, PERTO.z);
    passo(n);
    porMovel(n, Bloco.TV, TV.x, TV.z);
    passo(n);
    usar(n, 'ana', TV.x, TV.z);
    passo(n);
    const s = n.salvar();
    expect(JSON.stringify(s.extras)).not.toContain('ligad');
    const m = criarNucleo({
      semente: SEMENTE,
      modo: 'criativo',
      versaoMundo: 2,
      dados: { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras: s.extras },
      confiarNoCliente: false,
      depuracao: true,
      dono: 'ana',
    });
    entrar(m, 'ana', 0);
    expect(m.estado.mundo.bloco(TV.x, YP, TV.z)).toBe(Bloco.TV);
    expect(ligadosDe(passo(m), 'ana')).toBeUndefined();
  });
});
