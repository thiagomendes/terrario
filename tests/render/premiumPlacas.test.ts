import { describe, expect, it } from 'vitest';
import { triangular } from '../../src/render/formas';
import { ehBichoQueSegue, pecasDoBicho } from '../../src/render/bichoPremium';
import { PREMIUM } from '../../src/jogo/alma';
import { planoBoneco, type Peca } from '../../src/personagem/boneco';
import { aparenciaPadrao, type PremiumVestido } from '../../src/personagem/aparencia';

/**
 * Spec 023: toda placa dos premium (capa, lua, estrelas, asas, crina e rabo do unicórnio)
 * triangula inteira: a área dos triângulos é a do contorno (sem buraco na peça).
 */
function areaContorno(p: Array<[number, number]>): number {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return Math.abs(a / 2);
}
function areaTriangulos(p: Array<[number, number]>): number {
  const t = triangular(p);
  let a = 0;
  for (let i = 0; i < t.length; i += 3) {
    const [ax, ay] = p[t[i]];
    const [bx, by] = p[t[i + 1]];
    const [cx, cy] = p[t[i + 2]];
    a += Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2;
  }
  return a;
}
function conferir(pecas: Array<Pick<Peca, 'nome' | 'forma' | 'perfil'>>): string[] {
  const falhas: string[] = [];
  for (const p of pecas) {
    if (p.forma !== 'placa' || !p.perfil) continue;
    const a = areaContorno(p.perfil);
    const t = areaTriangulos(p.perfil);
    if (Math.abs(a - t) > a * 0.01 + 1e-6) falhas.push(`${p.nome}: ${t.toFixed(4)} de ${a.toFixed(4)}`);
  }
  return falhas;
}

describe('placas dos premium (spec 023)', () => {
  const vestidos: PremiumVestido[] = [
    { roupa: 'camiseta-aquario' },
    { roupa: 'tenis-cometa', costas: 'capa-estrelas' },
    { fantasia: 'dragao' },
  ];
  for (const corpo of ['feminino', 'masculino'] as const)
    for (const premium of vestidos)
      it(`${corpo} ${JSON.stringify(premium)}`, () => {
        const plano = planoBoneco({ ...aparenciaPadrao(), corpo, premium });
        expect(conferir(plano.pecas)).toEqual([]);
      });
  for (const id of ['unicornio', 'pinguim'] as const)
    it(`bicho ${id}`, () => {
      expect(conferir(pecasDoBicho(id))).toEqual([]);
    });
});

describe('036: só o pinguim e o unicórnio seguem pelo chão', () => {
  it('o passarinho de ombro e o id desconhecido não montam bicho que segue', () => {
    const bichos = PREMIUM.filter((p) => p.categoria === 'bicho').map((p) => p.id);
    expect(bichos.filter(ehBichoQueSegue)).toEqual(['pinguim', 'unicornio']);
    expect(ehBichoQueSegue('passarinho-ombro')).toBe(false);
    for (const lixo of ['toString', '__proto__', 'foguete-do-futuro', undefined, 7])
      expect(ehBichoQueSegue(lixo)).toBe(false);
  });
});
