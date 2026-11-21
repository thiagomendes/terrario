import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '../../src/temas/todos';
import { temasDisponiveis } from '../../src/temas';
import { Bloco, obterBloco, luzDoBloco } from '../../src/world/blocks';
import { ALTURA, TAM_X, TAM_Z, indice } from '../../src/world/chunk';
import {
  criarLampioes,
  modeloCaldeirao,
  modeloLampiao,
  ROSTO_DO_LAMPIAO,
} from '../../src/render/lampioes';
import { empacotar } from '../../src/world/edicoes';

/**
 * Spec 027 (T06, decisão do orquestrador): o lampião de abóbora posto vira a peça arredondada em
 * todos os mundos, com o rosto do tema (o Rancho mantém a carinha de festa junina), e o lampião e
 * o caldeirão postos são instanciados por pedaço.
 */
function cena() {
  const scene = new Scene(new NullEngine());
  new FreeCamera('c', new Vector3(0, 80, -5), scene);
  return scene;
}

describe('spec 027: o lampião arredondado em todos os mundos', () => {
  it('o lampião do Rancho continua aceso, com a mesma luz, e a carinha de festa junina dele', () => {
    // o bloco é o mesmo (nada muda no terreno, no salvamento nem na rede): a mesma luz e o brilho
    const b = obterBloco(Bloco.LAMPIAO_ABOBORA)!;
    expect(b.emissivo).toBe(true);
    expect(luzDoBloco(Bloco.LAMPIAO_ABOBORA)).toBe(14);
    expect(b.tiles.frente).toBe('abobora_rosto');
    expect(ROSTO_DO_LAMPIAO['rancho-alegre']).toBe('junina');
    // os outros mundos: o sorriso de olhos redondos
    for (const id of temasDisponiveis())
      if (id !== 'rancho-alegre') expect(ROSTO_DO_LAMPIAO[id], id).toBe('sorriso');
    // o modelo tem o corpo apagado e o rosto aceso (as duas partes da textura que brilha)
    for (const r of ['junina', 'sorriso'] as const) {
      const vd = modeloLampiao(r);
      const uvs = vd.uvs as number[];
      // (a textura que brilha tem três pontos: o apagado, o rosto e a poção do caldeirão)
      const acesos = uvs.filter((u, i) => i % 2 === 0 && u > 0.4 && u < 0.6).length;
      const apagados = uvs.filter((u, i) => i % 2 === 0 && u < 0.3).length;
      expect(acesos, r).toBeGreaterThan(20);
      expect(apagados, r).toBeGreaterThan(acesos);
      // cabe na célula (não passa do bloco)
      const P = vd.positions as number[];
      for (let i = 0; i < P.length; i += 3) {
        expect(Math.abs(P[i])).toBeLessThanOrEqual(0.5);
        expect(P[i + 1]).toBeGreaterThanOrEqual(-0.01);
        expect(P[i + 1]).toBeLessThanOrEqual(1.0);
        expect(Math.abs(P[i + 2])).toBeLessThanOrEqual(0.52);
      }
    }
    const c = modeloCaldeirao();
    expect((c.positions as number[]).length).toBeGreaterThan(100);
  });

  it('cem lampiões e cem caldeirões postos num pedaço são duas malhas (duas chamadas de desenho)', () => {
    const scene = cena();
    const criadas: string[] = [];
    const l = criarLampioes(scene, 'sorriso', () => 0, (m) => criadas.push(m.name));
    const base = new Uint8Array(TAM_X * ALTURA * TAM_Z);
    // cem lampiões gerados e cem caldeirões editados no mesmo chunk
    let n = 0;
    for (let y = 70; y < 80 && n < 100; y++)
      for (let z = 0; z < TAM_Z && n < 100; z += 2)
        for (let x = 0; x < TAM_X && n < 100; x += 2, n++) base[indice(x, y, z)] = Bloco.LAMPIAO_ABOBORA;
    const edicoes: [number, number][] = [];
    for (let i = 0; i < 100; i++) edicoes.push([indice(i % 16, 90 + Math.floor(i / 16), 5), empacotar(Bloco.CALDEIRAO, 1)]);
    const antes = scene.meshes.length;
    l.chunk(3, -2, base, edicoes);
    expect(l.contagem()).toEqual({ malhas: 2, lampioes: 100, caldeiroes: 100 });
    expect(scene.meshes.length - antes).toBe(2);
    expect(criadas).toHaveLength(2);
    // um lampião quebrado (a edição põe ar) sai; refazer o chunk não acumula malha
    edicoes.push([indice(0, 70, 0), empacotar(Bloco.AR, 0)]);
    l.chunk(3, -2, base, edicoes);
    expect(l.contagem()).toEqual({ malhas: 2, lampioes: 99, caldeiroes: 100 });
    expect(scene.meshes.length - antes).toBe(2);
    l.soltar(3, -2);
    expect(scene.meshes.length).toBe(antes);
    expect(l.contagem().malhas).toBe(0);
  });
});
