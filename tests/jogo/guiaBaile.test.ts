import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { baileDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { alvoDaMissao, chegouAoAlvo, type MundoDoGuia } from '../../src/jogo/guia';
import { missaoPorId } from '../../src/jogo/alma';
import { MISSOES_BAILE, USOS_ABOBORA, USOS_LULU, USOS_TUFINHO, type BaileVista } from '../../src/jogo/baile';
import { ARTE } from '../../src/ui/alma/arte';

/**
 * Spec 027 (T19): o guia nas missões da Noite das Fantasias. Cada missão leva ao alvo de agora (a
 * porta, a lanterna, o esconderijo da Lulu, o canteiro, a bancada, a porta da Vovó, o Tufinho), um
 * por vez, o mais perto que ainda falta; a trilha acaba ao alcance do toque (o núcleo aceita de lá).
 */
const BAILE = obterTema('noite-das-fantasias').mundo;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});
function plano() {
  definirEstiloMundo(BAILE);
  limparPovoados();
  return baileDoMundo(1337)!;
}
const vazia = (): BaileVista => ({ t: 0, pt: [], ln: [false, false, false, false, false], lc: [], tf: { o: 'casa' } });
function mundo(v: BaileVista): MundoDoGuia {
  return {
    cidade: null,
    sitios: [],
    bloco: () => 0,
    moradores: () => [],
    baile: plano(),
    estadoBaile: () => v,
  };
}
const m = (id: string) => missaoPorId(id)!;

describe('spec 027 (T19): o guia das missões da festa', () => {
  it('n1: a porta mais perto que ainda não deu doce; a trilha acaba ao alcance da campainha', () => {
    const p = plano();
    const v = vazia();
    const de = { x: p.nascimento.x, z: p.nascimento.z };
    const vistas = new Set<string>();
    for (let k = 0; k < 5; k++) {
      const a = alvoDaMissao(m('n1'), mundo(v), vistas, de)!;
      expect(a.chave).toMatch(/^porta:\d$/);
      const i = Number(a.chave.split(':')[1]);
      expect(v.pt).not.toContain(i);
      const q = p.pontos.portas[i];
      // chegou na trilha: a campainha responde dali
      expect(Math.hypot(a.x - q.x, a.z - q.z)).toBeLessThan(MISSOES_BAILE.campainha - (a.raio ?? 0));
      expect(ARTE[a.figura], a.figura).toBeDefined();
      v.pt.push(i);
    }
  });

  it('n2: a lanterna que ainda não contou nesta rodada, com a trilha no caminho do bosque', () => {
    const p = plano();
    const v = vazia();
    const de = { x: p.pontos.trilha[0][0], z: p.pontos.trilha[0][1] };
    for (let k = 0; k < 5; k++) {
      const a = alvoDaMissao(m('n2'), mundo(v), new Set(), de)!;
      const i = Number(a.chave.split(':')[1]);
      expect(a.chave).toBe(`lanterna:${i}`);
      const l = p.pontos.lanternas[i];
      expect(Math.hypot(a.x - l[0], a.z - l[2])).toBeLessThan(MISSOES_BAILE.lanterna - (a.raio ?? 0));
      v.lc.push(i);
    }
    expect(alvoDaMissao(m('n2'), mundo(v), new Set(), de)).toBeNull();
  });

  it('n3: o esconderijo da vez, a uns 3 blocos (a risadinha e o lençol mostram o resto)', () => {
    const p = plano();
    const vistos = new Set<string>();
    for (let k = 0; k < 3; k++) {
      const a = alvoDaMissao(m('n3'), mundo(vazia()), vistos, { x: 0, z: 0 })!;
      expect(a.chave).toBe(`lulu:${k}`);
      const e = p.pontos.esconderijos[k];
      const d = Math.hypot(a.x - e.x, a.z - e.z);
      expect(d).toBeGreaterThan(2);
      expect(d + (a.raio ?? 0)).toBeLessThan(MISSOES_BAILE.risadinha);
      // o fim da trilha deixa a Lulu ao alcance do toque
      expect(d).toBeLessThan(MISSOES_BAILE.lulu);
      vistos.add(USOS_LULU[k]);
    }
    expect(alvoDaMissao(m('n3'), mundo(vazia()), vistos, { x: 0, z: 0 })).toBeNull();
  });

  it('n4: o canteiro, a bancada e a porta da Vovó, cada passo ao alcance do toque', () => {
    const p = plano();
    const vistos = new Set<string>();
    const vovo = p.pontos.portas.find((q) => q.vovo)!;
    const lugares: [string, readonly number[] | { x: number; z: number }, number][] = [
      ['horta', p.pontos.canteiro, MISSOES_BAILE.canteiro],
      ['bancada', p.pontos.bancada, MISSOES_BAILE.bancada],
      ['portaVovo', vovo, MISSOES_BAILE.porta],
    ];
    lugares.forEach(([chave, q, alcance], k) => {
      const a = alvoDaMissao(m('n4'), mundo(vazia()), vistos, { x: 0, z: 0 })!;
      expect(a.chave).toBe(chave);
      const [x, z] = Array.isArray(q) ? [q[0], q[2]] : [(q as { x: number }).x, (q as { z: number }).z];
      expect(Math.hypot(a.x - x, a.z - z) + (a.raio ?? 0)).toBeLessThan(alcance);
      vistos.add(USOS_ABOBORA[k]);
    });
  });

  it('n5: a horta enquanto ele está fugido; com ele atrás, a Vovó; a cópia fugida manda na tela dela', () => {
    const p = plano();
    const v = vazia();
    v.tf = { o: 'horta' };
    let a = alvoDaMissao(m('n5'), mundo(v), new Set(), { x: 0, z: 0 })!;
    expect(a.chave).toBe('tufinho');
    const [hx, , hz] = p.pontos.tufinhoHorta;
    expect(Math.hypot(a.x - hx, a.z - hz) + (a.raio ?? 0)).toBeLessThan(MISSOES_BAILE.tufinho);
    // ele segue esta criança: a varanda da Vovó, e chegar lá é a entrega
    v.tf = { o: 'segue', q: 'ana' };
    v.tc = 'segue';
    a = alvoDaMissao(m('n5'), mundo(v), new Set([USOS_TUFINHO[0]]), { x: 0, z: 0 })!;
    expect(a.chave).toBe('vovo');
    const [vx, , vz] = p.pontos.varanda;
    expect(chegouAoAlvo(a, vx, vz + 1)).toBe(true);
    expect(Math.hypot(a.x - vx, a.z - vz) + (a.raio ?? 0)).toBeLessThan(MISSOES_BAILE.entrega);
    // o de verdade já em casa (a amiga entregou), a cópia fugida na horta: o guia vai para a horta
    v.tf = { o: 'casa' };
    v.tc = 'horta';
    a = alvoDaMissao(m('n5'), mundo(v), new Set([USOS_TUFINHO[0]]), { x: 0, z: 0 })!;
    expect(a.chave).toBe('tufinho');
  });

  it('o desenho de cada placa e de cada missão existe (o Dudu no cartão da n2)', () => {
    for (const id of ['n1', 'n2', 'n3', 'n4', 'n5']) {
      const d = m(id).desenho;
      if (d.tipo !== 'arte') continue;
      for (const nome of [d.principal, d.selo, d.resultado, d.placa, ...(d.bolinhas ?? [])])
        if (!nome.startsWith('item:')) expect(ARTE[nome], `${id}: ${nome}`).toBeDefined();
    }
    const n2 = m('n2').desenho;
    expect(n2.tipo === 'arte' && n2.selo).toBe('dudu');
  });
});
