import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '../../src/temas/todos';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { criarPlasticos } from '../../src/render/formas';
import { criarRefeicoes, formasGuardadas, montarComidaMordida } from '../../src/render/refeicao';
import { MORDIDAS } from '../../src/jogo/refeicao';

/** Spec 032: a comida mordida (a forma muda a cada mordida, não só encolhe) e a refeição. */
function cena() {
  registrarCatalogo();
  const scene = new Scene(new NullEngine());
  new FreeCamera('c', new Vector3(0, 0, -5), scene);
  return scene;
}
const ligadas = (m: { modelo: { malhas: Mesh[]; no: TransformNode } }) =>
  m.modelo.no.getChildMeshes().filter((q) => q.isEnabled()).length;

describe('spec 032: a comida mordida', () => {
  it('o cachorro-quente perde um pedaço com a marca da mordida, maior a cada vez (o miolo à mostra)', () => {
    const scene = cena();
    const c = montarComidaMordida(scene, criarPlasticos(scene, 't'), 'cachorro_quente', 'cq')!;
    const pao = formasGuardadas('cachorro_quente')!.find((p) => p.nome === 'pao-cq')!;
    const maxX = (p: Float32Array) => {
      let m = -Infinity;
      for (let i = 0; i < p.length; i += 3) m = Math.max(m, p[i]);
      return m;
    };
    const comprimentos = pao.estados.map(maxX);
    // a ponta recua a cada mordida
    expect(comprimentos[1]).toBeLessThan(comprimentos[0] - 0.01);
    expect(comprimentos[2]).toBeLessThan(comprimentos[1] - 0.01);
    expect(comprimentos[3]).toBeLessThan(comprimentos[2] - 0.01);
    // a outra ponta fica onde estava (é mordida, não escala)
    const minX = (p: Float32Array) => {
      let m = Infinity;
      for (let i = 0; i < p.length; i += 3) m = Math.min(m, p[i]);
      return m;
    };
    expect(minX(pao.estados[3])).toBeCloseTo(minX(pao.estados[0]), 4);
    // o miolo de outra cor onde a mordida pegou
    c.estagio(2);
    const malha = c.modelo.no.getChildMeshes().find((m) => m.name.includes('pao-cq-mordida'))!;
    const cores = malha.getVerticesData(VertexBuffer.ColorKind)!;
    const distintas = new Set<string>();
    for (let i = 0; i < cores.length; i += 4) distintas.add(cores.slice(i, i + 3).join(','));
    expect(distintas.size).toBeGreaterThanOrEqual(2);
    c.descartar();
  });

  it('a pipoca some aos poucos, o algodão perde os tufos, o copo esvazia', () => {
    const scene = cena();
    const pl = criarPlasticos(scene, 't');
    const pipoca = montarComidaMordida(scene, pl, 'pipoca', 'pp')!;
    const n0 = ligadas(pipoca);
    pipoca.estagio(1);
    const n1 = ligadas(pipoca);
    pipoca.estagio(3);
    const n3 = ligadas(pipoca);
    expect(n1).toBeLessThan(n0);
    expect(n3).toBeLessThan(n1);
    const algodao = montarComidaMordida(scene, pl, 'algodao_doce', 'al')!;
    const a0 = ligadas(algodao);
    algodao.estagio(2);
    expect(ligadas(algodao)).toBeLessThan(a0);
    const suco = montarComidaMordida(scene, pl, 'suco', 'su')!;
    const liquido = suco.modelo.malhas.find((m) => m.name === 'su-suco')!;
    const h0 = liquido.scaling.y;
    suco.estagio(2);
    expect(liquido.scaling.y).toBeLessThan(h0 * 0.5);
    for (const c of [pipoca, algodao, suco]) c.descartar();
  });

  it('a fatia de bolo é recortada pela ponta (o contorno muda; o número de vértices não)', () => {
    const scene = cena();
    const c = montarComidaMordida(scene, criarPlasticos(scene, 't'), 'fatia_bolo', 'fb')!;
    const m = c.modelo.no.getChildMeshes().find((q) => q.name === 'fb-fatia-mordida')!;
    const p0 = Float32Array.from(m.getVerticesData(VertexBuffer.PositionKind)!);
    c.estagio(2);
    const p2 = m.getVerticesData(VertexBuffer.PositionKind)!;
    expect(p2.length).toBe(p0.length);
    const maxX = (p: ArrayLike<number>) => {
      let r = -Infinity;
      for (let i = 0; i < p.length; i += 3) r = Math.max(r, p[i]);
      return r;
    };
    expect(maxX(p2)).toBeLessThan(maxX(p0) - 0.03);
    c.descartar();
  });

  it('a refeição: três mordidas no tempo certo, a mão volta ao item de sempre e os corações sobem', () => {
    const scene = cena();
    const pl = criarPlasticos(scene, 't');
    const raiz = new TransformNode('raiz', scene);
    const mao = new TransformNode('mao', scene);
    mao.parent = raiz;
    let ocupada = false;
    const dono = {
      raiz,
      noDaMao: () => mao,
      ocuparMao: (o: boolean) => {
        ocupada = o;
      },
      plasticos: () => pl,
    };
    const sons: string[] = [];
    let coracoes = 0;
    const r = criarRefeicoes(scene, {
      som: (ev) => sons.push(ev),
      coracoes: (_x, _y, _z, n) => {
        coracoes += n;
      },
    });
    r.comecar(dono, 'cachorro_quente', true);
    expect(ocupada).toBe(true);
    let t = 0;
    while (t < MORDIDAS[0] - 0.05) {
      r.atualizar(0.05);
      t += 0.05;
    }
    expect(r.estado(dono)?.mordidas).toBe(0);
    for (let i = 0; i < 70; i++) r.atualizar(0.05);
    expect(sons).toEqual(['mordida', 'mordida', 'mordida']);
    expect(coracoes).toBeGreaterThan(0);
    expect(ocupada).toBe(false);
    expect(r.estado(dono)).toBeNull();
  });
});
