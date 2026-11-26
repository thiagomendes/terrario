import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import {
  cidadeDoMundo,
  definirEstiloMundo,
  ESTILO_PADRAO,
  TERRENO_NATURAL,
} from '../../src/world/chunk';
import { limparCidades, type PlanoCidade } from '../../src/world/cidade';
import { limparPovoados, noLote, planoDaRegiao, type PlanoPovoado } from '../../src/world/povoado';
import { construirLoteDoSitio } from '../../src/world/sitio';
import { Bloco } from '../../src/world/blocks';
import { missaoPorId, type Missao } from '../../src/jogo/alma';
import {
  alisar,
  alvoDaMissao,
  chegouAoAlvo,
  contarLavoura,
  CONVITE_REPETE_S,
  CONVITE_S,
  CONVITE_VISIVEL_S,
  criarRelogioConvite,
  espalharPegadas,
  ondaNaPegada,
  afastarDe,
  posicaoDaPlaca,
  PASSO_PAR,
  ruimNoSitio,
  trilhaDosPes,
  type MundoDoGuia,
} from '../../src/jogo/guia';
import type { V3 } from '../../src/jogo/caminho';

const m = (id: string): Missao => missaoPorId(id)!;

describe('030: alvo da missão na Cidade Grande', () => {
  let p: PlanoCidade;
  beforeAll(() => {
    definirEstiloMundo(obterTema('cidade-grande').mundo);
    limparCidades();
    p = cidadeDoMundo(1337)!;
  });
  afterAll(() => {
    definirEstiloMundo(ESTILO_PADRAO);
    limparCidades();
  });
  const mundo = (moradores: MundoDoGuia['moradores'] = () => []): MundoDoGuia => ({
    cidade: p,
    sitios: [],
    bloco: () => Bloco.AR,
    moradores,
  });

  it('obra: a entrada do tapume do canteiro, e chegou é dentro do lote', () => {
    const a = alvoDaMissao(m('c6'), mundo(), new Set(), p.nascimento)!;
    expect(a.chave).toBe('canteiro:4');
    expect(a.figura).toBe('obra:4');
    const l = p.lotes.find((q) => q.canteiro === 4)!;
    expect(chegouAoAlvo(a, a.x, a.z)).toBe(true);
    expect(a.x).toBeGreaterThanOrEqual(l.x0);
    expect(a.x).toBeLessThan(l.x0 + l.largura);
    expect(chegouAoAlvo(a, l.x0 - 3, l.z0 - 3)).toBe(false);
  });

  it('passeio: o lugar ainda não visto mais perto pela calçada; os vistos não voltam', () => {
    const vistos = new Set<string>();
    const ordem: string[] = [];
    let de = { x: p.nascimento.x, z: p.nascimento.z };
    for (let k = 0; k < 3; k++) {
      const a = alvoDaMissao(m('c3'), mundo(), vistos, de)!;
      expect(vistos.has(a.chave)).toBe(false);
      ordem.push(a.chave);
      vistos.add(a.chave);
      de = { x: a.x, z: a.z };
    }
    expect(new Set(ordem)).toEqual(new Set(['padaria', 'escola', 'sorveteria']));
    expect(alvoDaMissao(m('c3'), mundo(), vistos, de)).toBeNull();
  });

  it('c5: a padeira mais perto, a placa na cabeça dela, chegou a 3 blocos', () => {
    const ms = () => [
      { id: 7, profissao: 'cozinheiro', x: p.nascimento.x + 30, y: p.h + 1, z: p.nascimento.z },
      { id: 8, profissao: 'cozinheiro', x: p.nascimento.x + 5, y: p.h + 1, z: p.nascimento.z },
      { id: 9, profissao: 'ferreiro', x: p.nascimento.x + 1, y: p.h + 1, z: p.nascimento.z },
    ];
    const a = alvoDaMissao(m('c5'), mundo(ms), new Set(), p.nascimento)!;
    expect(a.morador).toBe(8);
    expect(a.placa[1]).toBeGreaterThan(a.y);
    expect(chegouAoAlvo(a, a.x + 2.5, a.z)).toBe(true);
    expect(chegouAoAlvo(a, a.x + 4, a.z)).toBe(false);
  });
});

describe('030: alvo da missão no sítio (Rancho)', () => {
  let sitio: PlanoPovoado;
  let blocos: Map<string, number>;
  const ler = (x: number, y: number, z: number) => blocos.get(`${x},${y},${z}`) ?? Bloco.AR;
  beforeAll(() => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparPovoados();
    for (let rx = -3; rx <= 3 && !sitio; rx++)
      for (let rz = -3; rz <= 3 && !sitio; rz++) {
        const q = planoDaRegiao(rx, rz, 1337, TERRENO_NATURAL);
        if (q?.lotes.some((l) => l.uso === 'lavoura')) sitio = q;
      }
  });
  afterAll(() => {
    definirEstiloMundo(ESTILO_PADRAO);
    limparPovoados();
  });
  const montar = () => {
    blocos = new Map();
    for (const l of sitio.lotes)
      construirLoteDoSitio(sitio, l, (x, y, z, id) => blocos.set(`${x},${y},${z}`, id));
  };
  const mundo = (): MundoDoGuia => ({
    cidade: null,
    sitios: [sitio],
    bloco: ler,
    moradores: () => [],
  });
  const lavouras = () => sitio.lotes.map((l, i) => ({ l, i })).filter((x) => x.l.uso === 'lavoura');
  const colherTudo = (i: number) => {
    const l = sitio.lotes[i];
    for (let f = 1; f <= 5; f++)
      for (const s of [1, 2, 4, 5]) {
        const [x, z] = noLote(l, s, f);
        blocos.set(`${x},${l.h + 1},${z}`, Bloco.AR);
      }
  };

  it('r1: a lavoura com trigo maduro; a placa em cima dela; a trilha acaba no corredor do meio', () => {
    montar();
    const a = alvoDaMissao(m('r1'), mundo(), new Set(), { x: sitio.cx, z: sitio.cz })!;
    expect(a.chave.startsWith('lavoura:')).toBe(true);
    const i = Number(a.chave.split(':')[2]);
    expect(contarLavoura(sitio.lotes[i], ler).maduras).toBe(20);
    // o fim da trilha não é cova da roça
    expect(ler(Math.floor(a.x), a.y - 1, Math.floor(a.z))).not.toBe(Bloco.TERRA_ARADA);
    expect(chegouAoAlvo(a, a.x, a.z)).toBe(true);
  });

  it('r1: sem maduro, leva à terra arada (o passo de antes); o alvo de agora fica até acabar', () => {
    montar();
    const de = { x: sitio.cx, z: sitio.cz };
    const todas = lavouras();
    const a = alvoDaMissao(m('r1'), mundo(), new Set(), de)!;
    // o de agora fica, mesmo que a criança ande para perto de outra lavoura madura
    if (todas.length > 1) {
      const outra = todas.find((x) => !a.chave.endsWith(`:${x.i}`))!;
      const perto = { x: outra.l.x0 + 3, z: outra.l.z0 + 3 };
      expect(alvoDaMissao(m('r1'), mundo(), new Set(), perto, a.chave)!.chave).toBe(a.chave);
    }
    for (const x of todas) colherTudo(x.i);
    const b = alvoDaMissao(m('r1'), mundo(), new Set(), de, a.chave)!;
    expect(b).not.toBeNull();
    expect(contarLavoura(sitio.lotes[Number(b.chave.split(':')[2])], ler).livres).toBe(20);
  });

  it('r2, r4, r5, r6, r7: galinheiro, curral, celeiro, galinheiro e a lavoura', () => {
    montar();
    const de = { x: sitio.cx, z: sitio.cz };
    const uso = (id: string) => alvoDaMissao(m(id), mundo(), new Set(), de)?.chave.split(':')[0];
    expect(uso('r2')).toBe('galinheiro');
    expect(uso('r4')).toBe('curral');
    expect(uso('r5')).toBe('celeiro');
    expect(uso('r6')).toBe('galinheiro');
    expect(uso('r7')).toBe('lavoura');
    expect(uso('r3')).toBe('lavoura');
  });

  it('a trilha alisada não pisa na roça nem raspa na cerca', () => {
    montar();
    const l = lavouras()[0].l;
    // um caminho em escada que cortaria a roça: de um lado ao outro da lavoura
    const [ax, az] = noLote(l, 0, 0);
    const [bx, bz] = noLote(l, 6, 6);
    const pts: V3[] = [];
    for (let k = 0; k <= 12; k++)
      pts.push([ax + 0.5 + ((bx - ax) * k) / 12, l.h + 1, az + 0.5 + ((bz - az) * k) / 12]);
    const ruim = ruimNoSitio(ler);
    const liso = alisar(pts, () => l.h + 1, ruim);
    // o alisado só junta pontos por onde dá para ir reto: nenhum pedaço novo passa pela roça
    for (let k = 1; k < liso.length; k++) {
      const a = liso[k - 1];
      const b = liso[k];
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[2] - a[2]) / 0.25);
      for (let t = 0; t <= n; t++) {
        const x = Math.floor(a[0] + ((b[0] - a[0]) * t) / n);
        const z = Math.floor(a[2] + ((b[2] - a[2]) * t) / n);
        const original = pts.some((q) => Math.floor(q[0]) === x && Math.floor(q[2]) === z);
        if (!original) expect(ruim(x, l.h + 1, z)).toBe(false);
      }
    }
  });
});

describe('030: a trilha', () => {
  const rota: V3[] = [
    [0.5, 10, 0.5],
    [10.5, 10, 0.5],
    [10.5, 10, 10.5],
  ];
  it('sempre nasce nos pés: o que ficou para trás sai, e um trechinho liga os pés à rota', () => {
    const t = trilhaDosPes(rota, [5, 10, 3]);
    expect(t[0]).toEqual([5, 10, 3]);
    expect(t[1][0]).toBeCloseTo(5);
    expect(t[1][2]).toBeCloseTo(0.5);
    expect(t[t.length - 1]).toEqual([10.5, 10, 10.5]);
    const pegadas = espalharPegadas(t);
    expect(Math.hypot(pegadas[0][0] - 5, pegadas[0][2] - 3)).toBeLessThan(1.5);
    // em cima da rota: sem o trechinho
    expect(trilhaDosPes(rota, [10.5, 10, 4])[1]).toEqual([10.5, 10, 10.5]);
  });
  it('pegadas alternam os pés, viradas para a frente', () => {
    const p = espalharPegadas(rota);
    expect(p.length).toBeGreaterThan(20);
    expect(p[0][4]).toBe(-p[1][4]);
    expect(p[0][3]).toBeCloseTo(Math.PI / 2);
  });
  it('pares de pegadas com um vão entre um par e o outro', () => {
    const p = espalharPegadas(rota);
    // o esquerdo e o direito do mesmo par lado a lado; o par seguinte PASSO_PAR adiante
    expect(Math.abs(p[0][0] - p[1][0])).toBeLessThan(0.2);
    expect(Math.abs(p[0][2] - p[1][2])).toBeCloseTo(0.4, 1);
    expect(p[2][0] - p[0][0]).toBeCloseTo(PASSO_PAR, 5);
  });
  it('a rota passa a 1 bloco de quem está parado nela (o pedreiro)', () => {
    const r = afastarDe(rota, [{ x: 5, z: 0.7 }], 1.1, () => true);
    for (const q of r) expect(Math.hypot(q[0] - 5, q[2] - 0.7)).toBeGreaterThanOrEqual(1.09);
    // sem lugar para ir: fica onde estava
    expect(afastarDe(rota, [{ x: 5, z: 0.7 }], 1.1, () => false)).toEqual(rota);
  });
  it('a placa fica longe do HUD do alto e com margem; fora da tela, some', () => {
    const caixas = [
      { x: 0, y: 0, w: 220, h: 110 },
      { x: 700, y: 50, w: 140, h: 140 },
    ];
    const a = posicaoDaPlaca({ x: 100, y: 60 }, 60, caixas, 844, 390)!;
    expect(a.y).toBeGreaterThanOrEqual(110);
    const b = posicaoDaPlaca({ x: 420, y: 5 }, 60, caixas, 844, 390)!;
    expect(b.y).toBeGreaterThanOrEqual(10);
    const c = posicaoDaPlaca({ x: 760, y: 120 }, 60, caixas, 844, 390)!;
    expect(c.y).toBeGreaterThanOrEqual(190);
    expect(posicaoDaPlaca(null, 60, caixas, 844, 390)).toBeNull();
    expect(posicaoDaPlaca({ x: -300, y: 100 }, 60, caixas, 844, 390)).toBeNull();
  });
  it('a ondinha sai dos pés e corre para a frente', () => {
    const pico = (t: number) => {
      let melhor = 0;
      for (let i = 1; i < 40; i++) if (ondaNaPegada(i, t) > ondaNaPegada(melhor, t)) melhor = i;
      return melhor;
    };
    expect(pico(0.2)).toBeLessThan(pico(1));
    expect(ondaNaPegada(10, 5, 5 - 10 / (14 * 1.3))).toBeCloseTo(1);
  });
});

describe('030: o convite', () => {
  it('só com o jogo à vista e sem missão; brilha uma vez; zera com missão', () => {
    const r = criarRelogioConvite(2);
    let acendeu = 0;
    for (let i = 0; i < 30; i++)
      if (r.passo(0.1, { missao: false, noJogo: i % 2 === 0 }).acendeu) acendeu++;
    expect(acendeu).toBe(0);
    for (let i = 0; i < 40; i++)
      if (r.passo(0.1, { missao: false, noJogo: true }).acendeu) acendeu++;
    expect(acendeu).toBe(1);
    expect(r.passo(0.1, { missao: true, noJogo: true }).mostra).toBe(false);
    expect(r.segundos).toBe(0);
    expect(r.passo(0.1, { missao: false, noJogo: true }).mostra).toBe(false);
  });
});

describe('038: o convite aparece e some', () => {
  /**
   * Um relógio falso a 60 quadros por segundo: anda `seg` segundos e anota cada aparição (quando
   * acendeu) e cada sumiço, no tempo do relógio.
   */
  function rodar(
    r: ReturnType<typeof criarRelogioConvite>,
    seg: number,
    op: { missao: boolean; noJogo: boolean; nova?: boolean } | ((t: number) => { missao: boolean; noJogo: boolean }),
    relogio: { t: number; acendeu: number[]; sumiu: number[]; antes: boolean },
  ) {
    const dt = 1 / 60;
    for (let i = 0; i < Math.round(seg * 60); i++) {
      relogio.t += dt;
      const p = r.passo(dt, typeof op === 'function' ? op(relogio.t) : op);
      if (p.acendeu) relogio.acendeu.push(relogio.t);
      if (relogio.antes && !p.mostra) relogio.sumiu.push(relogio.t);
      relogio.antes = p.mostra;
    }
    return relogio;
  }
  const novo = () => ({ t: 0, acendeu: [] as number[], sumiu: [] as number[], antes: false });
  const brincando = { missao: false, noJogo: true };

  it('aparece aos 2 min, some aos 8 s e não volta antes de 5 min', () => {
    expect(CONVITE_VISIVEL_S).toBe(8);
    expect(CONVITE_REPETE_S).toBe(300);
    const r = criarRelogioConvite();
    const c = rodar(r, CONVITE_S + 1, brincando, novo());
    expect(c.acendeu).toHaveLength(1);
    expect(c.acendeu[0]).toBeCloseTo(CONVITE_S, 1);
    rodar(r, 10, brincando, c);
    expect(c.sumiu).toHaveLength(1);
    expect(c.sumiu[0] - c.acendeu[0]).toBeCloseTo(CONVITE_VISIVEL_S, 1);
    // 5 min brincando sem missão: ele não volta antes, e volta uma vez só
    rodar(r, c.acendeu[0] + CONVITE_REPETE_S - 0.5 - c.t, brincando, c);
    expect(c.acendeu).toHaveLength(1);
    rodar(r, 20, brincando, c);
    expect(c.acendeu).toHaveLength(2);
    expect(c.acendeu[1] - c.acendeu[0]).toBeGreaterThanOrEqual(CONVITE_REPETE_S);
    expect(c.sumiu).toHaveLength(2);
    // numa hora sem missão: no máximo uma vez a cada 5 min, e cada vez à vista por 8 s
    rodar(r, 3600, brincando, c);
    for (let i = 1; i < c.acendeu.length; i++)
      expect(c.acendeu[i] - c.acendeu[i - 1]).toBeGreaterThanOrEqual(CONVITE_REPETE_S);
    for (let i = 0; i < c.sumiu.length; i++) expect(c.sumiu[i] - c.acendeu[i]).toBeCloseTo(CONVITE_VISIVEL_S, 1);
    expect(c.acendeu.length).toBeLessThanOrEqual(2 + Math.ceil(3600 / CONVITE_REPETE_S));
  });

  it('com uma tela por cima (o quadro aberto pelo toque nele), ele some no tempo e não conta a espera', () => {
    const r = criarRelogioConvite(2);
    const c = rodar(r, 2.5, brincando, novo());
    expect(c.acendeu).toHaveLength(1);
    // ela toca no convite e o quadro fica aberto 20 s: ele some no tempo de antes
    rodar(r, 20, { missao: false, noJogo: false }, c);
    expect(c.sumiu).toHaveLength(1);
    expect(c.sumiu[0] - c.acendeu[0]).toBeCloseTo(CONVITE_VISIVEL_S, 1);
    // com a tela por cima, a espera de 5 min não anda
    rodar(r, 600, { missao: false, noJogo: false }, c);
    expect(c.acendeu).toHaveLength(1);
  });

  it('a missão escolhida zera tudo; sem missão de novo, o primeiro convite volta a ser aos 2 min', () => {
    const r = criarRelogioConvite();
    const c = rodar(r, CONVITE_S + 3, brincando, novo());
    expect(c.acendeu).toHaveLength(1);
    // ela escolhe uma missão com o convite à vista: ele some na hora
    rodar(r, 1, { missao: true, noJogo: true }, c);
    expect(c.sumiu).toHaveLength(1);
    expect(r.aVista).toBe(0);
    rodar(r, 30, { missao: true, noJogo: true }, c);
    // a missão acabou: o próximo convite é aos 2 min, e não aos 5
    const fim = c.t;
    rodar(r, CONVITE_S + 1, brincando, c);
    expect(c.acendeu).toHaveLength(2);
    expect(c.acendeu[1] - fim).toBeCloseTo(CONVITE_S, 1);
  });

  it('sem missão nova, nunca aparece', () => {
    const r = criarRelogioConvite();
    const c = rodar(r, 1200, { missao: false, noJogo: true, nova: false }, novo());
    expect(c.acendeu).toHaveLength(0);
  });
});
