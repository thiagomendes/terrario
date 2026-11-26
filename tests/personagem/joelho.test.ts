import { describe, expect, it } from 'vitest';
import { aparenciaPadrao, normalizarAparencia, vestirFantasia, IDS_MODELOS, type Aparencia } from '../../src/personagem/aparencia';
import { planoBoneco, type Peca } from '../../src/personagem/boneco';
import { FANTASIAS } from '../../src/personagem/fantasias';
import { SOLA, dividirPernas, medidaDaPerna, pernaAte, pernaNoPedal } from '../../src/personagem/joelho';
import { IDS_ANDAR, temPes } from '../../src/personagem/brinquedoAndar';
import '../../src/temas/todos';

/**
 * Spec 038 (T02): a perna com joelho. A conta leva a sola exatamente até o ponto; a divisão deixa
 * a perna esticada igual à de antes, e as roupas da perna vão com a canela.
 */
type V3 = [number, number, number];

/** Onde a sola cai com o giro da perna (z, depois x) e do joelho (x). */
function solaDe(r: { x: number; z: number; joelho: number }, coxa: number, a: number, b: number): V3 {
  const ck = Math.cos(r.joelho);
  const sk = Math.sin(r.joelho);
  let v: V3 = [0, -coxa + (-a * ck - b * sk), -a * sk + b * ck];
  const cz = Math.cos(r.z);
  const sz = Math.sin(r.z);
  v = [v[0] * cz - v[1] * sz, v[0] * sz + v[1] * cz, v[2]];
  const cx = Math.cos(r.x);
  const sx = Math.sin(r.x);
  return [v[0], v[1] * cx - v[2] * sx, v[1] * sx + v[2] * cx];
}

describe('spec 038 (T02): a conta do joelho', () => {
  const m = { coxa: 0.14, quadril: 0.34, pontaZ: 0.06 };
  it('a sola cai no ponto, com o joelho dobrando para a frente', () => {
    for (const T of [
      [0.03, -0.25, 0.12],
      [-0.02, -0.2, 0.2],
      [0, -0.3, 0.05],
      [0.04, -0.1, 0.22],
    ] as V3[]) {
      const r = pernaAte(T, m);
      const s = solaDe(r, m.coxa, m.quadril - m.coxa, m.pontaZ);
      expect(Math.hypot(s[0] - T[0], s[1] - T[1], s[2] - T[2])).toBeLessThan(1e-6);
      // o joelho dobra para trás (a canela) e a coxa vai para a frente
      expect(r.joelho).toBeGreaterThan(0);
      expect(r.x).toBeLessThan(0.2);
    }
  });

  it('fora do alcance, a perna estica na direção do ponto (sem virar nem saltar)', () => {
    const r = pernaAte([0, -0.6, 0.3], m);
    const s = solaDe(r, m.coxa, m.quadril - m.coxa, m.pontaZ);
    const n = Math.hypot(...s);
    expect(n).toBeLessThan(Math.hypot(m.coxa + Math.hypot(m.quadril - m.coxa, m.pontaZ), 0) + 1e-6);
    expect(s[2] / s[1]).toBeCloseTo(0.3 / -0.6, 2);
  });

  it('no pedal, a sola pisa por um ponto entre o meio do pé e a ponta, que anda contínuo', () => {
    let antes: number | null = null;
    for (let i = 0; i <= 60; i++) {
      const g = (i / 60) * Math.PI * 2;
      const T: V3 = [0.02, -0.21 + 0.05 * Math.cos(g), 0.12 + 0.05 * Math.sin(g)];
      const r = pernaNoPedal(T, m);
      expect(r.ponta).toBeGreaterThanOrEqual(SOLA.de - 1e-9);
      expect(r.ponta).toBeLessThanOrEqual(SOLA.ate + 1e-9);
      const s = solaDe(r, m.coxa, m.quadril - m.coxa, r.ponta);
      expect(Math.hypot(s[0] - T[0], s[1] - T[1], s[2] - T[2])).toBeLessThan(1e-5);
      if (antes !== null) expect(Math.abs(r.ponta - antes)).toBeLessThan(0.03);
      antes = r.ponta;
    }
  });
});

describe('spec 038 (T02): a perna dividida no joelho', () => {
  const comPedal = (a: Partial<Aparencia>) => normalizarAparencia({ ...a, premium: { ...(a.premium ?? {}), andar: 'bicicletinha' } });

  it('só com brinquedo de pedal ou de apoio vestido, e nunca de patins ou skate', () => {
    for (const id of IDS_ANDAR) {
      const pl = planoBoneco(normalizarAparencia({ premium: { andar: id } }));
      expect(pl.pecas.some((p) => p.subjunta?.nome === 'joelhoE'), id).toBe(temPes(id));
    }
    expect(planoBoneco(normalizarAparencia({})).pecas.some((p) => p.subjunta?.nome === 'joelhoE')).toBe(false);
  });

  it('esticada, a coxa e a canela cobrem a perna de antes inteira, sem fresta (os 7 modelos)', () => {
    for (const modelo of IDS_MODELOS) {
      const base = { ...aparenciaPadrao(modelo) };
      const antes = planoBoneco(normalizarAparencia(base)).pecas.find((p) => p.nome === 'pernaE-perna')!;
      const pl = planoBoneco(comPedal(base));
      const { coxa } = medidaDaPerna(pl);
      const c = pl.pecas.find((p) => p.nome === 'pernaE-perna')!;
      const k = pl.pecas.find((p) => p.nome === 'pernaE-canela')!;
      const topoAntes = antes.pos[1] + antes.tamanho[1] / 2;
      const baixoAntes = antes.pos[1] - antes.tamanho[1] / 2;
      expect(c.pos[1] + c.tamanho[1] / 2).toBeCloseTo(topoAntes, 6);
      // a canela, no espaço da perna (o joelho fica a `coxa` abaixo do quadril)
      expect(k.pos[1] - coxa - k.tamanho[1] / 2).toBeCloseTo(baixoAntes, 6);
      // as duas se cruzam no joelho
      expect(c.pos[1] - c.tamanho[1] / 2).toBeLessThan(k.pos[1] - coxa + k.tamanho[1] / 2 - 0.05);
    }
  });

  it('o sapato, o tênis, as botas, as polainas, as patas e as pantufas vão com a canela', () => {
    const casos: Array<[string, Partial<Aparencia>]> = [
      ['sapato', {}],
      ['tênis-cometa', { premium: { roupa: 'tenis-cometa' } }],
      ['pijama', { premium: { roupa: 'pijama-nuvem' } }],
      ...FANTASIAS.map((f): [string, Partial<Aparencia>] => [f.id, vestirFantasia(aparenciaPadrao(), f.id)]),
    ];
    const ruins: string[] = [];
    for (const [nome, a] of casos) {
      const pl = planoBoneco(comPedal(a));
      const { coxa } = medidaDaPerna(pl);
      for (const p of pl.pecas) {
        if (p.junta !== 'pernaE') continue;
        const curto = p.nome.replace(/^pernaE-/, '');
        const naCanela = p.subjunta?.nome === 'joelhoE';
        if (/(sapato|bota|tenis|polaina|pantufa|dedo|garra|joelheira|remendo|barra)/.test(curto) && !naCanela) ruins.push(`${nome}: ${curto} fora da canela`);
        // nada da canela fica acima do quadril, e nada da coxa desce até o pé
        if (naCanela && p.pos[1] - coxa > 0) ruins.push(`${nome}: ${curto} acima do quadril`);
        if (!naCanela && p.pos[1] < -coxa - 0.06) ruins.push(`${nome}: ${curto} na coxa, embaixo do joelho`);
      }
    }
    expect(ruins).toEqual([]);
  });

  it('o degradê da peça que vai para a canela fica com as mesmas cores', () => {
    const sem = planoBoneco(normalizarAparencia({ premium: { roupa: 'tenis-cometa' } }));
    const com = planoBoneco(comPedal({ premium: { roupa: 'tenis-cometa' } }));
    const { coxa } = medidaDaPerna(com);
    const a = sem.pecas.find((p) => p.nome === 'pernaE-tenis-cano') as Peca;
    const b = com.pecas.find((p) => p.nome === 'pernaE-tenis-cano') as Peca;
    expect(b.subjunta?.nome).toBe('joelhoE');
    for (const y of [-0.3, -0.25, -0.2])
      expect(b.pintar!(0.05, y + coxa, 0.04)).toBe(a.pintar!(0.05, y, 0.04));
  });
});
