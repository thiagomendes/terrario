import { describe, expect, it } from 'vitest';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import {
  encontrarNascimento,
  alturaTerreno,
  definirEstiloMundo,
  ESTILO_PADRAO,
  gerarChunk,
  indice,
  ALTURA,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import { planoDaRegiao, REGIAO_POVOADO } from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { sanear } from '../../src/nucleo/saneamento';
import { idDoBloco } from '../../src/jogo/itens';
import type { Comando, Telemetria } from '../../src/nucleo/protocolo';

/**
 * Spec 013, auditoria independente: cada furo achado vira um teste que prova a correção
 * (todos na nuvem, `confiarNoCliente: false`, com o comando passando pelo saneamento como
 * no servidor).
 */
const SEMENTE = 1337;
const p0 = encontrarNascimento(SEMENTE);
const X = Math.floor(p0.x);
const Z = Math.floor(p0.z);
const Y = alturaTerreno(X, Z, SEMENTE) + 1;

function tel(x: number, z: number, extra: Partial<Telemetria> = {}): Comando {
  const y = alturaTerreno(Math.floor(x), Math.floor(z), SEMENTE) + 1;
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
function nuvem(modo: 'criativo' | 'sobrevivencia' = 'sobrevivencia'): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo,
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.conectar('bia', { perfil: { apelido: 'Bia', aparencia: {} } });
  n.comando('ana', tel(X + 0.5, Z + 0.5));
  n.comando('bia', tel(X + 2.5, Z + 0.5));
  return n;
}
const inv = (n: Nucleo, id: string) => n.estado.jogadores.get(id)!.inventario;
const bloco = (n: Nucleo, x: number, y: number, z: number) => n.estado.mundo.bloco(x, y, z);
/** O comando passa pelo saneamento (como o servidor faz) e vai ao núcleo. */
function mandar(n: Nucleo, quem: string, c: unknown): boolean {
  const s = sanear(c);
  if (s) n.comando(quem, s);
  return !!s;
}

describe('colocar com "outra parte": só a metade de cima da porta', () => {
  it('uma semente não planta três pés (as partes extras são recusadas)', () => {
    const n = nuvem();
    const F = { x: X + 1, y: Y - 1, z: Z + 1 };
    n.estado.edicoes.definir(F.x, F.y, F.z, Bloco.TERRA_ARADA);
    n.estado.edicoes.definir(F.x, F.y + 1, F.z, Bloco.AR);
    inv(n, 'ana').definir(1, { item: 'semente_trigo', qtd: 1 });
    const longe = { x: X + 10000, y: 100, z: Z + 10000 };
    mandar(n, 'ana', {
      t: 'colocar',
      id: 1,
      x: F.x,
      y: F.y + 1,
      z: F.z,
      bloco: Bloco.TRIGO_0,
      meta: 0,
      slot: 1,
      extras: [longe],
    });
    expect(bloco(n, longe.x, longe.y, longe.z)).toBe(Bloco.AR);
    expect(n.estado.lavoura.size).toBe(0);
    // a semente não foi gasta e a tela é corrigida
    expect(inv(n, 'ana').contar('semente_trigo')).toBe(1);
    expect(n.quadros().get('ana')!.eventos?.some((e) => e.e === 'recusa')).toBe(true);
  });

  it('o saneamento descarta mais de uma parte extra', () => {
    expect(
      sanear({
        t: 'colocar',
        id: 1,
        x: 0,
        y: 70,
        z: 0,
        bloco: Bloco.PORTA,
        meta: 0,
        slot: 0,
        extras: [
          { x: 0, y: 71, z: 0 },
          { x: 0, y: 72, z: 0 },
        ],
      }),
    ).toBeNull();
  });

  it('uma tábua não vira dois blocos (a parte extra só vale para a porta)', () => {
    const n = nuvem();
    inv(n, 'ana').definir(2, { item: idDoBloco(Bloco.TABUAS), qtd: 1 });
    mandar(n, 'ana', {
      t: 'colocar',
      id: 2,
      x: X + 1,
      y: Y + 2,
      z: Z + 1,
      bloco: Bloco.TABUAS,
      meta: 0,
      slot: 2,
      extras: [{ x: X + 1, y: Y + 3, z: Z + 1 }],
    });
    expect(bloco(n, X + 1, Y + 2, Z + 1)).toBe(Bloco.AR);
    expect(bloco(n, X + 1, Y + 3, Z + 1)).toBe(Bloco.AR);
    expect(inv(n, 'ana').contar(idDoBloco(Bloco.TABUAS))).toBe(1);
  });

  it('a porta com a outra metade longe é recusada; com a de cima, entra inteira', () => {
    const n = nuvem();
    inv(n, 'ana').definir(3, { item: idDoBloco(Bloco.PORTA), qtd: 2 });
    mandar(n, 'ana', {
      t: 'colocar',
      id: 3,
      x: X + 2,
      y: Y,
      z: Z + 2,
      bloco: Bloco.PORTA,
      meta: 0,
      slot: 3,
      extras: [{ x: X + 2, y: Y + 4, z: Z + 2 }],
    });
    expect(bloco(n, X + 2, Y, Z + 2)).not.toBe(Bloco.PORTA);
    expect(bloco(n, X + 2, Y + 4, Z + 2)).toBe(Bloco.AR);
    expect(inv(n, 'ana').contar(idDoBloco(Bloco.PORTA))).toBe(2);
    mandar(n, 'ana', {
      t: 'colocar',
      id: 4,
      x: X + 2,
      y: Y,
      z: Z + 2,
      bloco: Bloco.PORTA,
      meta: 0,
      slot: 3,
      extras: [{ x: X + 2, y: Y + 1, z: Z + 2 }],
    });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTA);
    expect(bloco(n, X + 2, Y + 1, Z + 2)).toBe(Bloco.PORTA);
    expect(inv(n, 'ana').contar(idDoBloco(Bloco.PORTA))).toBe(1);
  });
});

/**
 * Quebra o baú, junta o que caiu, põe um baú novo no mesmo lugar e repete. O tesouro do
 * baú do mundo sai uma vez só; depois é um baú comum, vazio.
 */
function voltasNoBau(semente: number, bx: number, by: number, bz: number): string[][] {
  const n = criarNucleo({
    semente,
    modo: 'sobrevivencia',
    versaoMundo: 2,
    confiarNoCliente: false,
    depuracao: true,
  });
  n.conectar('ana', { perfil: { apelido: 'Ana', aparencia: {} } });
  n.comando('ana', { t: 'depurar', d: { f: 'spawn', x: bx + 2.5, z: bz + 0.5 } });
  n.estado.jogadores.get('ana')!.saltoPermitido = true;
  n.comando('ana', {
    t: 'jogador',
    x: bx + 2.5,
    y: by,
    z: bz + 0.5,
    yaw: 0,
    pitch: 0,
    olhos: by + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot: 0,
  });
  expect(n.estado.mundo.bloco(bx, by, bz)).toBe(Bloco.BAU);
  const i = n.estado.jogadores.get('ana')!.inventario;
  const voltas: string[][] = [];
  for (let v = 0; v < 3; v++) {
    n.estado.mundoItens.itens.length = 0;
    mandar(n, 'ana', { t: 'quebrar', id: 10 + v * 2, x: bx, y: by, z: bz, slot: 0 });
    voltas.push(
      n.estado.mundoItens.itens
        .map((o) => o.item)
        .filter((o) => o !== idDoBloco(Bloco.BAU))
        .sort(),
    );
    i.definir(5, { item: idDoBloco(Bloco.BAU), qtd: 1 });
    mandar(n, 'ana', {
      t: 'colocar',
      id: 11 + v * 2,
      x: bx,
      y: by,
      z: bz,
      bloco: Bloco.BAU,
      meta: 0,
      slot: 5,
    });
    expect(n.estado.mundo.bloco(bx, by, bz)).toBe(Bloco.BAU);
  }
  return voltas;
}

describe('o tesouro do baú do mundo sai uma vez só', () => {
  it('o baú do celeiro do sítio (Rancho, semente 42) não se refaz ao ser recolocado', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    try {
      const semente = 42;
      const n0 = encontrarNascimento(semente);
      let bau: [number, number, number] | undefined;
      const rx0 = Math.floor(n0.x / REGIAO_POVOADO);
      const rz0 = Math.floor(n0.z / REGIAO_POVOADO);
      for (let dx = -1; dx <= 1 && !bau; dx++)
        for (let dz = -1; dz <= 1 && !bau; dz++)
          bau = planoDaRegiao(rx0 + dx, rz0 + dz, semente, TERRENO_NATURAL)?.bauCeleiro;
      expect(bau).toBeDefined();
      const voltas = voltasNoBau(semente, ...bau!);
      expect(voltas[0]).toContain('enxada_madeira');
      expect(voltas[1]).toEqual([]);
      expect(voltas[2]).toEqual([]);
    } finally {
      definirEstiloMundo(ESTILO_PADRAO);
    }
  });

  it('o baú de ruína também não', () => {
    // a ruína mais perto do nascimento (o baú fica no meio do chunk, em 8, h + 1, 8)
    let bau: [number, number, number] | undefined;
    const cx0 = Math.floor(X / 16);
    const cz0 = Math.floor(Z / 16);
    for (let r = 0; r < 40 && !bau; r++)
      for (let dx = -r; dx <= r && !bau; dx++)
        for (let dz = -r; dz <= r && !bau; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const c = gerarChunk(cx0 + dx, cz0 + dz, SEMENTE);
          for (let y = 1; y < ALTURA && !bau; y++)
            if (c[indice(8, y, 8)] === Bloco.BAU)
              bau = [(cx0 + dx) * 16 + 8, y, (cz0 + dz) * 16 + 8];
        }
    expect(bau).toBeDefined();
    const voltas = voltasNoBau(SEMENTE, ...bau!);
    expect(voltas[0].length).toBeGreaterThan(0);
    expect(voltas[1]).toEqual([]);
    expect(voltas[2]).toEqual([]);
  });
});

describe('dar comida na nuvem', () => {
  function cervoPerto(n: Nucleo, x: number, z: number): number {
    n.comando('ana', { t: 'depurar', d: { f: 'invocar', tipo: 'cervo', x, y: Y, z } });
    const l = n.estado.populacao.lista;
    return l[l.length - 1].id;
  }
  function dia(n: Nucleo): void {
    n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: 0.5 } });
    n.comando('ana', { t: 'depurar', d: { f: 'pausarDia', pausar: true } });
  }

  it('a visitante sem permissão de construir não cria bicho (nem enche o limite do mundo)', () => {
    const n = nuvem();
    n.definirConstrucao('bia', false);
    dia(n);
    inv(n, 'bia').definir(0, { item: 'trigo', qtd: 30 });
    for (let i = 0; i < 5; i++)
      mandar(n, 'bia', { t: 'alimentar', criatura: cervoPerto(n, X + 2.5, Z + 2.5), slot: 0 });
    expect(n.estado.populacao.criados).toBe(0);
    // não gastou o trigo e foi avisada
    expect(inv(n, 'bia').contar('trigo')).toBe(30);
    const q = n.quadros().get('bia')!;
    expect(q.eventos?.some((e) => e.e === 'recusa' && e.motivo === 'visitante')).toBe(true);
    expect(q.eventos?.some((e) => e.e === 'alimentou')).toBe(false);
    // a dona cria
    inv(n, 'ana').definir(0, { item: 'trigo', qtd: 1 });
    mandar(n, 'ana', { t: 'alimentar', criatura: cervoPerto(n, X + 1.5, Z + 1.5), slot: 0 });
    expect(n.estado.populacao.criados).toBe(1);
  });

  it('o mesmo bicho criado mostra corações no máximo uma vez por segundo', () => {
    const n = nuvem();
    dia(n);
    inv(n, 'ana').definir(0, { item: 'trigo', qtd: 30 });
    const id = cervoPerto(n, X + 1.5, Z + 1.5);
    const coracoes = () =>
      n
        .quadros()
        .get('bia')!
        .eventos?.filter((e) => e.e === 'alimentou').length ?? 0;
    for (let i = 0; i < 30; i++) mandar(n, 'ana', { t: 'alimentar', criatura: id, slot: 0 });
    expect(n.estado.populacao.criados).toBe(1);
    expect(coracoes()).toBe(1);
    // passado um segundo, ganha comida de novo
    for (let i = 0; i < 21; i++) n.passo();
    n.quadros();
    for (let i = 0; i < 30; i++) mandar(n, 'ana', { t: 'alimentar', criatura: id, slot: 0 });
    expect(coracoes()).toBe(1);
    // a visitante pode dar comida ao bicho que já é criado
    n.definirConstrucao('bia', false);
    inv(n, 'bia').definir(0, { item: 'trigo', qtd: 1 });
    for (let i = 0; i < 21; i++) n.passo();
    n.quadros();
    mandar(n, 'bia', { t: 'alimentar', criatura: id, slot: 0 });
    expect(coracoes()).toBe(1);
  });
});

describe('portas e porteiras na nuvem', () => {
  it('a visitante abre e fecha a porteira e a porta, mas não quebra nenhuma', () => {
    const n = nuvem();
    n.definirConstrucao('bia', false);
    n.estado.edicoes.definir(X + 2, Y, Z + 2, Bloco.PORTEIRA);
    n.estado.edicoes.definir(X + 3, Y, Z + 1, Bloco.PORTA);
    n.estado.edicoes.definir(X + 3, Y + 1, Z + 1, Bloco.PORTA);
    mandar(n, 'bia', { t: 'usar', x: X + 2, y: Y, z: Z + 2 });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTEIRA_ABERTA);
    mandar(n, 'bia', { t: 'usar', x: X + 2, y: Y, z: Z + 2 });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTEIRA);
    mandar(n, 'bia', { t: 'usar', x: X + 3, y: Y, z: Z + 1 });
    expect(bloco(n, X + 3, Y, Z + 1)).toBe(Bloco.PORTA_ABERTA);
    expect(bloco(n, X + 3, Y + 1, Z + 1)).toBe(Bloco.PORTA_ABERTA);
    mandar(n, 'bia', { t: 'quebrar', id: 1, x: X + 2, y: Y, z: Z + 2, slot: 0 });
    mandar(n, 'bia', { t: 'quebrar', id: 2, x: X + 3, y: Y, z: Z + 1, slot: 0 });
    expect(bloco(n, X + 2, Y, Z + 2)).toBe(Bloco.PORTEIRA);
    expect(bloco(n, X + 3, Y, Z + 1)).toBe(Bloco.PORTA_ABERTA);
  });
});
