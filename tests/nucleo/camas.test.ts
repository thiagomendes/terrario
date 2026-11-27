import { afterAll, describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import {
  ESTILO_PADRAO,
  TERRENO_NATURAL,
  alturaTerreno,
  definirEstiloMundo,
  definirPovoados,
  encontrarNascimento,
  gerarChunk,
  indice,
  metaGerada,
  metasGeradasDoChunk,
} from '../../src/world/chunk';
import { limparPovoados, planoDaRegiao } from '../../src/world/povoado';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { Bloco } from '../../src/world/blocks';
import { criarEdicoes, metasDoChunk } from '../../src/world/edicoes';
import { sanear } from '../../src/nucleo/saneamento';
import { VERSAO_CAMAS } from '../../src/nucleo/camas';
import {
  PARTE_CURTINHA,
  celulasDoMovel,
  metaDoMovel,
  movelEm,
  parteDoMeta,
  type LeitorMoveis,
} from '../../src/jogo/moveis';
import { casaGeminada } from '../../src/world/plantas/geminada';
import { predioDeTijolo } from '../../src/world/plantas/tijolo';
import { indicePlanta, type ParametrosPredio, type Planta } from '../../src/world/plantas/formato';
import type { DadosMundo } from '../../src/jogo/mundos';
import type { Comando, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Spec 039 (T03): a cama nova de duas células na geração (os povoados, o sítio e as plantas da
 * cidade, com o metadado igual no núcleo e no aparelho), a conversão das camas dos mundos de antes
 * (só no núcleo, uma vez por mundo, no aparelho e na nuvem), a cama da geração com edição no pé e
 * o nascer ao lado da cama.
 */
const SEMENTE = 1337;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

/** As células de cama da geração em volta dos povoados das regiões perto da origem. */
function camasDaGeracao(semente = SEMENTE) {
  const chunks = new Map<string, Uint8Array>();
  const bloco = (x: number, y: number, z: number) => {
    const cx = Math.floor(x / 16);
    const cz = Math.floor(z / 16);
    const k = `${cx},${cz}`;
    let c = chunks.get(k);
    if (!c) {
      c = gerarChunk(cx, cz, semente);
      chunks.set(k, c);
    }
    return y < 0 || y >= 128 ? Bloco.AR : c[indice(x - cx * 16, y, z - cz * 16)];
  };
  const leitor: LeitorMoveis = {
    bloco,
    meta: (x, y, z) => metaGerada(x, y, z, semente),
    dono: () => 0,
  };
  const camas: { x: number; y: number; z: number }[] = [];
  for (let rx = -2; rx <= 2; rx++)
    for (let rz = -2; rz <= 2; rz++) {
      const p = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
      if (!p) continue;
      for (const l of p.lotes)
        for (let x = l.x0; x < l.x0 + 7; x++)
          for (let z = l.z0; z < l.z0 + 7; z++)
            for (let y = l.h; y <= l.h + 3; y++)
              if (bloco(x, y, z) === Bloco.CAMA) camas.push({ x, y, z });
    }
  return { camas, leitor, bloco };
}

describe('a cama nova na geração', () => {
  for (const tema of ['rancho-alegre', 'doce-reino', 'exploracao-lunar'] as const)
    it(`${tema}: toda cama dos povoados tem as duas células, e o núcleo e o aparelho leem o mesmo metadado`, () => {
      definirEstiloMundo(obterTema(tema).mundo);
      definirPovoados(true);
      limparPovoados();
      const { camas, leitor, bloco } = camasDaGeracao();
      expect(camas.length, tema).toBeGreaterThan(1);
      const cabeceiras = camas.filter((c) => parteDoMeta(leitor.meta(c.x, c.y, c.z)) === 0);
      const pes = camas.filter((c) => parteDoMeta(leitor.meta(c.x, c.y, c.z)) === 1);
      expect(cabeceiras.length + pes.length).toBe(camas.length);
      expect(pes.length).toBe(cabeceiras.length);
      // a do núcleo (a edição com a semente) e a do aparelho (os metadados do pedaço, no worker)
      const doNucleo = criarEdicoes(SEMENTE);
      for (const c of camas) {
        const m = movelEm(leitor, c.x, c.y, c.z);
        expect(m, `${c.x},${c.y},${c.z}`).not.toBeNull();
        expect(m!.celulas).toHaveLength(2);
        // o pé tem chão e não fica na passagem da porta (o miolo da casa)
        const pe = m!.celulas[1];
        expect(bloco(pe.x, pe.y - 1, pe.z)).not.toBe(Bloco.AR);
        const cx = Math.floor(c.x / 16);
        const cz = Math.floor(c.z / 16);
        const doAparelho = metasDoChunk(cx, cz, criarEdicoes(), SEMENTE).get(
          indice(c.x - cx * 16, c.y, c.z - cz * 16),
        );
        expect(doNucleo.obterMeta(c.x, c.y, c.z)).toBe(leitor.meta(c.x, c.y, c.z));
        expect(doAparelho ?? 0).toBe(leitor.meta(c.x, c.y, c.z));
      }
    });

  it('o custo: o metadado gerado de um pedaço de povoado custa menos que gerar o pedaço', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    definirPovoados(true);
    limparPovoados();
    let p = null;
    for (let rx = -2; rx <= 2 && !p; rx++)
      for (let rz = -2; rz <= 2 && !p; rz++) p = planoDaRegiao(rx, rz, 4242, TERRENO_NATURAL);
    expect(p).not.toBeNull();
    const chunks: [number, number][] = [];
    for (let cx = Math.floor(p!.minX / 16); cx <= Math.floor(p!.maxX / 16); cx++)
      for (let cz = Math.floor(p!.minZ / 16); cz <= Math.floor(p!.maxZ / 16); cz++)
        chunks.push([cx, cz]);
    let t0 = performance.now();
    for (const [cx, cz] of chunks) gerarChunk(cx, cz, 4242);
    const gerar = (performance.now() - t0) / chunks.length;
    t0 = performance.now();
    let camas = 0;
    for (const [cx, cz] of chunks) camas += metasGeradasDoChunk(cx, cz, 4242).size;
    const metas = (performance.now() - t0) / chunks.length;
    console.log(
      `spec 039, custo por pedaço de povoado: gerar ${gerar.toFixed(2)} ms, metadado ${metas.toFixed(2)} ms (${chunks.length} pedaços, ${camas} células com metadado)`,
    );
    expect(camas).toBeGreaterThan(0);
    expect(metas).toBeLessThan(gerar);
  });

  it('a Vila Neon e a Festa não têm cama (a geração delas não muda)', () => {
    for (const tema of ['vila-neon', 'noite-das-fantasias'] as const) {
      definirEstiloMundo(obterTema(tema).mundo);
      limparPovoados();
      const n = encontrarNascimento(SEMENTE);
      const cx0 = Math.floor(n.x / 16);
      const cz0 = Math.floor(n.z / 16);
      for (let cx = cx0 - 4; cx <= cx0 + 4; cx++)
        for (let cz = cz0 - 4; cz <= cz0 + 4; cz++)
          expect(gerarChunk(cx, cz, SEMENTE).includes(Bloco.CAMA), `${tema} ${cx},${cz}`).toBe(
            false,
          );
    }
  });

  it('as plantas da cidade põem a cabeceira e o pé lado a lado, com a parte no metadado', () => {
    const params = (andares: number, espelho: boolean): ParametrosPredio => ({
      andares,
      corPorta: 0,
      corToldo: 'vermelho',
      espelho,
      caixaDagua: false,
      loja: false,
      luzes: 3,
    });
    const plantas: Planta[] = [];
    for (const espelho of [false, true])
      for (const andares of [2, 3, 4]) {
        plantas.push(casaGeminada(params(andares, espelho)));
        plantas.push(predioDeTijolo(params(andares, espelho)));
      }
    // direções locais: 0 +f, 1 +s, 2 -f, 3 -s
    const passo = [
      [0, 1],
      [1, 0],
      [0, -1],
      [-1, 0],
    ];
    let camas = 0;
    for (const p of plantas)
      for (let y = 0; y < p.altura; y++)
        for (let f = 0; f < p.profundidade; f++)
          for (let s = 0; s < p.largura; s++) {
            const i = indicePlanta(p, s, f, y);
            if (p.blocos[i] !== Bloco.CAMA || parteDoMeta(p.metas[i]) !== 0) continue;
            camas++;
            const d = p.metas[i] & 3;
            const [ds, df] = passo[d];
            const j = indicePlanta(p, s + ds, f + df, y);
            expect(p.blocos[j], `${p.modelo} ${s},${f},${y}`).toBe(Bloco.CAMA);
            expect(p.metas[j], `${p.modelo} ${s},${f},${y}`).toBe(metaDoMovel(d, 1));
          }
    expect(camas).toBeGreaterThan(6);
  });
});

// ------------------------------------------------------------------ o núcleo

const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const YP = alturaTerreno(X, Z, SEMENTE) + 24;
const X0 = X - 2;
const Z0 = Z - 2;

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
  } satisfies Telemetria & { t: 'jogador' };
}

type Modo = 'local' | 'nuvem';

function abrir(modo: Modo, dados?: DadosMundo): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    dados,
    confiarNoCliente: modo === 'local',
    depuracao: true,
    dono: 'ana',
  });
  // no aparelho, a criança é a do salvamento (o lugar de nascer vem dele)
  if (modo === 'local') n.conectar('ana');
  else n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  if (modo === 'nuvem') n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  for (const [quem, dx] of [
    ['ana', 0],
    ['bia', 2],
  ] as const) {
    const j = n.estado.jogadores.get(quem);
    if (!j) continue;
    j.saltoPermitido = true;
    n.comando(quem, tel(X0 + 0.5 + dx, YP, Z0 - 0.5));
  }
  n.passo();
  n.quadros();
  return n;
}

let ids = 1;
function mandar(n: Nucleo, quem: string, c: Record<string, unknown>): number {
  const id = ++ids;
  const s = sanear({ ...c, id });
  expect(s, JSON.stringify(c)).not.toBeNull();
  n.comando(quem, s!);
  return id;
}
const bloco = (n: Nucleo, x: number, y: number, z: number) => n.estado.mundo.bloco(x, y, z);
const meta = (n: Nucleo, x: number, y: number, z: number) => n.estado.edicoes.obterMeta(x, y, z);

/**
 * Um mundo salvo antes da cama nova (como a `main` grava): o chão de tábuas, as camas de uma
 * célula com a direção de quando foram postas, e sem `extras.camas`.
 */
function mundoDeAntes(modo: Modo, montar: (definir: (x: number, z: number, b: number, meta?: number, dono?: number, y?: number) => void) => void): DadosMundo {
  const n = abrir(modo);
  const ed = n.estado.edicoes;
  for (let x = X0 - 1; x <= X0 + 9; x++)
    for (let z = Z0 - 1; z <= Z0 + 10; z++) {
      ed.definir(x, YP - 1, z, Bloco.TABUAS);
      for (let y = YP; y <= YP + 3; y++) ed.definir(x, y, z, Bloco.AR);
    }
  const bia = ed.donos.indice('bia', 'Bia');
  montar((x, z, b, m = 0, dono = 0, y = YP) => ed.definir(x, y, z, b, m, dono === 1 ? bia : dono));
  const s = n.salvar();
  const extras: Record<string, unknown> = { ...s.extras, spawn: { x: X0 + 1.5, z: Z0 + 2.5 } };
  delete extras['camas'];
  return { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras };
}

for (const modo of ['local', 'nuvem'] as const)
  describe(`as camas dos mundos de antes (${modo})`, () => {
    it('viram a nova onde cabe e a curtinha onde não cabe; nada some e o lugar de nascer fica', () => {
      const dados = mundoDeAntes(modo, (def) => {
        // A: a frente livre
        def(X0 + 1, Z0 + 2, Bloco.CAMA, 0);
        // B: uma parede na frente
        def(X0 + 3, Z0 + 2, Bloco.CAMA, 0);
        def(X0 + 3, Z0 + 3, Bloco.TABUAS);
        // C: uma flor na frente (olhando para +x)
        def(X0 + 5, Z0 + 2, Bloco.CAMA, 1);
        def(X0 + 6, Z0 + 2, Bloco.FLOR);
        // D: a frente sem chão (olhando para -z)
        def(X0 + 1, Z0 + 6, Bloco.CAMA, 2);
        def(X0 + 1, Z0 + 5, Bloco.AR, 0, 0, YP - 1);
        // E: a cama da Bia, com a frente livre
        def(X0 + 3, Z0 + 6, Bloco.CAMA, 0, 1);
        // F e G: a frente de F é a cama G; a de G está livre
        def(X0 + 5, Z0 + 6, Bloco.CAMA, 0);
        def(X0 + 5, Z0 + 7, Bloco.CAMA, 0);
        // H: a frente é água
        def(X0 + 7, Z0 + 2, Bloco.CAMA, 0);
        def(X0 + 7, Z0 + 3, Bloco.AGUA);
      });
      const n = abrir(modo, dados);
      const nova = (x: number, z: number, d: number) => {
        expect(bloco(n, x, YP, z), `${x},${z}`).toBe(Bloco.CAMA);
        expect(meta(n, x, YP, z), `${x},${z}`).toBe(metaDoMovel(d, 0));
      };
      const leitor: LeitorMoveis = {
        bloco: (x, y, z) => bloco(n, x, y, z),
        meta: (x, y, z) => meta(n, x, y, z),
        dono: (x, y, z) => n.estado.edicoes.indiceDono(x, y, z),
      };
      const inteira = (x: number, z: number) => movelEm(leitor, x, YP, z)?.celulas.length ?? 0;
      nova(X0 + 1, Z0 + 2, 0);
      expect(inteira(X0 + 1, Z0 + 2)).toBe(2);
      expect(bloco(n, X0 + 1, YP, Z0 + 3)).toBe(Bloco.CAMA);
      // as curtinhas: a mesma célula, a parte 2, a direção de antes
      for (const [x, z, d] of [
        [X0 + 3, Z0 + 2, 0],
        [X0 + 5, Z0 + 2, 1],
        [X0 + 1, Z0 + 6, 2],
        [X0 + 5, Z0 + 6, 0],
        [X0 + 7, Z0 + 2, 0],
      ]) {
        expect(bloco(n, x, YP, z), `${x},${z}`).toBe(Bloco.CAMA);
        expect(meta(n, x, YP, z), `${x},${z}`).toBe(metaDoMovel(d, PARTE_CURTINHA));
        expect(inteira(x, z), `${x},${z}`).toBe(1);
      }
      // o que estava na frente fica
      expect(bloco(n, X0 + 3, YP, Z0 + 3)).toBe(Bloco.TABUAS);
      expect(bloco(n, X0 + 6, YP, Z0 + 2)).toBe(Bloco.FLOR);
      expect(bloco(n, X0 + 7, YP, Z0 + 3)).toBe(Bloco.AGUA);
      // a da Bia: o pé é dela também
      expect(inteira(X0 + 3, Z0 + 6)).toBe(2);
      expect(n.donoDoBloco(X0 + 3, YP, Z0 + 7)).toBe('bia');
      // G ganhou o pé
      expect(inteira(X0 + 5, Z0 + 7)).toBe(2);
      // o lugar de nascer continua; o salvamento marca a conversão
      const s = n.salvar();
      expect(s.extras['camas']).toBe(VERSAO_CAMAS);
      if (modo === 'local') expect(s.extras['spawn']).toEqual({ x: X0 + 1.5, z: Z0 + 2.5 });
      // aberto de novo, nada muda (a conversão não roda duas vezes)
      const m = abrir(modo, {
        versao: 1,
        edicoes: s.edicoes,
        jogador: null,
        hora: s.hora,
        extras: s.extras,
      });
      expect(JSON.stringify(m.estado.edicoes.exportar())).toBe(
        JSON.stringify(n.estado.edicoes.exportar()),
      );
    });

    it('a cama nova se põe e se quebra inteira, e quem usa nasce ao lado (nunca em cima)', () => {
      const n = abrir(modo);
      const ed = n.estado.edicoes;
      for (let x = X0 - 1; x <= X0 + 9; x++)
        for (let z = Z0 - 1; z <= Z0 + 9; z++) {
          ed.definir(x, YP - 1, z, Bloco.TABUAS);
          for (let y = YP; y <= YP + 3; y++) ed.definir(x, y, z, Bloco.AR);
        }
      const C = { x: X0 + 3, z: Z0 + 2 };
      // paredes dos dois lados da cabeceira: a criança nasce do lado do pé
      ed.definir(C.x - 1, YP, C.z, Bloco.TABUAS);
      ed.definir(C.x + 1, YP, C.z, Bloco.TABUAS);
      ed.definir(C.x - 1, YP + 1, C.z, Bloco.TABUAS);
      ed.definir(C.x + 1, YP + 1, C.z, Bloco.TABUAS);
      const extras = celulasDoMovel(Bloco.CAMA, C.x, YP, C.z, 0)
        .slice(1)
        .map(({ x, y, z }) => ({ x, y, z }));
      mandar(n, 'ana', { t: 'colocar', x: C.x, y: YP, z: C.z, bloco: Bloco.CAMA, meta: 0, slot: 0, extras });
      n.passo();
      n.quadros();
      expect(bloco(n, C.x, YP, C.z + 1)).toBe(Bloco.CAMA);
      expect(meta(n, C.x, YP, C.z + 1)).toBe(metaDoMovel(0, 1));
      // o toque no pé usa a cama inteira: nasce ao lado do pé (os lados da cabeceira têm parede)
      mandar(n, 'ana', { t: 'usar', x: C.x, y: YP, z: C.z + 1 });
      const spawn = n.estado.jogadores.get('ana')!.spawn;
      const cx = Math.floor(spawn.x);
      const cz = Math.floor(spawn.z);
      expect([C.z, C.z + 1]).toContain(cz);
      expect(cz === C.z ? false : cx !== C.x).toBe(true);
      expect(bloco(n, cx, YP, cz)).toBe(Bloco.AR);
      // quebrar a cabeceira leva o pé
      mandar(n, 'ana', { t: 'quebrar', x: C.x, y: YP, z: C.z, slot: 0 });
      n.passo();
      expect(bloco(n, C.x, YP, C.z)).toBe(Bloco.AR);
      expect(bloco(n, C.x, YP, C.z + 1)).toBe(Bloco.AR);
      // a cama sem a frente (os extras de antes, sem o pé) é recusada
      const id = mandar(n, 'ana', { t: 'colocar', x: C.x, y: YP, z: C.z, bloco: Bloco.CAMA, meta: 0, slot: 0 });
      n.passo();
      const q = n.quadros().get('ana')!;
      expect((q.eventos ?? []).some((e) => e.e === 'recusa' && e.comando === id)).toBe(true);
      expect(bloco(n, C.x, YP, C.z)).toBe(Bloco.AR);
    });
  });

describe('a cama da geração com edição de antes no pé (doce-reino)', () => {
  /** A primeira cama de um povoado do Doce Reino: a cabeceira e o pé. */
  function primeiraCama() {
    definirEstiloMundo(obterTema('doce-reino').mundo);
    definirPovoados(true);
    limparPovoados();
    const { camas, leitor } = camasDaGeracao();
    const cab = camas.find((c) => parteDoMeta(leitor.meta(c.x, c.y, c.z)) === 0)!;
    const m = movelEm(leitor, cab.x, cab.y, cab.z)!;
    return { cab: m.celulas[0], pe: m.celulas[1] };
  }

  function abrirComEdicao(
    modo: Modo,
    em: { x: number; y: number; z: number },
    b: number,
    doBia = false,
  ): Nucleo {
    const base = criarNucleo({ semente: SEMENTE, modo: 'criativo', versaoMundo: 2, dono: 'ana' });
    const ed = base.estado.edicoes;
    ed.definir(em.x, em.y, em.z, b, 0, doBia ? ed.donos.indice('bia', 'Bia') : 0);
    const s = base.salvar();
    const extras = { ...s.extras };
    delete extras['camas'];
    const n = criarNucleo({
      semente: SEMENTE,
      modo: 'criativo',
      versaoMundo: 2,
      dados: { versao: 1, edicoes: s.edicoes, jogador: null, hora: s.hora, extras },
      confiarNoCliente: modo === 'local',
      depuracao: true,
      dono: 'ana',
    });
    n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
    n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
    return n;
  }
  const leitorDe = (n: Nucleo): LeitorMoveis => ({
    bloco: (x, y, z) => n.estado.mundo.bloco(x, y, z),
    meta: (x, y, z) => n.estado.edicoes.obterMeta(x, y, z),
    dono: (x, y, z) => n.estado.edicoes.indiceDono(x, y, z),
  });

  for (const modo of ['local', 'nuvem'] as const)
    it(`a edição fica e a cabeceira vira curtinha; o bloco da criança não fica preso (${modo})`, () => {
      const { cab, pe } = primeiraCama();
      const n = abrirComEdicao(modo, pe, Bloco.TABUAS, true);
      expect(n.estado.mundo.bloco(pe.x, pe.y, pe.z)).toBe(Bloco.TABUAS);
      const m = movelEm(leitorDe(n), cab.x, cab.y, cab.z);
      expect(m?.celulas).toHaveLength(1);
      expect(parteDoMeta(n.estado.edicoes.obterMeta(cab.x, cab.y, cab.z))).toBe(PARTE_CURTINHA);
      // a tábua da Bia é dela: ela quebra (não virou usável do mundo)
      const j = n.estado.jogadores.get('bia')!;
      j.saltoPermitido = true;
      n.comando('bia', tel(pe.x + 0.5, pe.y + 2, pe.z + 0.5));
      mandar(n, 'bia', { t: 'quebrar', x: pe.x, y: pe.y, z: pe.z, slot: 0 });
      n.passo();
      expect(n.estado.mundo.bloco(pe.x, pe.y, pe.z)).toBe(Bloco.AR);
      // a cabeceira da geração (agora curtinha) continua protegida
      mandar(n, 'bia', { t: 'quebrar', x: cab.x, y: cab.y, z: cab.z, slot: 0 });
      n.passo();
      expect(n.estado.mundo.bloco(cab.x, cab.y, cab.z)).toBe(Bloco.CAMA);
      definirEstiloMundo(ESTILO_PADRAO);
      limparPovoados();
    });

  it('o ar no pé sai (o pé volta); outra coisa na cabeceira deixa o pé virar ar', () => {
    const { cab, pe } = primeiraCama();
    let n = abrirComEdicao('nuvem', pe, Bloco.AR);
    expect(n.estado.edicoes.obterValor(pe.x, pe.y, pe.z)).toBeUndefined();
    expect(movelEm(leitorDe(n), cab.x, cab.y, cab.z)?.celulas).toHaveLength(2);
    n = abrirComEdicao('nuvem', cab, Bloco.TABUAS);
    expect(n.estado.mundo.bloco(cab.x, cab.y, cab.z)).toBe(Bloco.TABUAS);
    expect(n.estado.mundo.bloco(pe.x, pe.y, pe.z)).toBe(Bloco.AR);
    definirEstiloMundo(ESTILO_PADRAO);
    limparPovoados();
  });
});
