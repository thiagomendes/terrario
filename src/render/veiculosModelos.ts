/**
 * Os modelos dos veículos da cidade (spec 014; 014d: a lataria "miniatura", `veiculosMiniatura.ts`).
 * Cada veículo vira:
 * - **carroceria**: todas as peças de plástico numa malha só, com a cor em cada vértice
 *   (uma chamada de desenho por veículo);
 * - **rodas**: pneu redondo com calota, desenhado uma vez e repetido por instâncias;
 * - **luzes**: faróis, lanternas e as barras de luzinhas, uma esfera por instância com a cor de
 *   cada uma (acendem de noite, as do teto piscam);
 * - **de longe**: os mesmos volumes e cores sem miudezas, com as rodas e as luzes pintadas.
 *
 * Eixos do modelo: x para a frente, y para cima, z para a esquerda; o chão em y = 0. Tudo já sai
 * na escala do jogo (`MEDIDAS[...].escala`). A porta do ônibus e a janelinha do sorvete ficam do
 * lado direito (o da calçada).
 */
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import type { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { dadosAnel } from './formas';
import { Pecas } from './solidos';
import type { TipoVeiculo } from '../jogo/veiculos';
import { modeloFirme, modeloLonge } from './veiculosMiniatura';

export type TipoLuz = 'farol' | 'lanterna' | 'giroAzul' | 'giroBranco' | 'giroVermelho';

/** Uma luz (esfera achatada): centro, semieixos e de que tipo é. */
export interface Luz {
  tipo: TipoLuz;
  pos: [number, number, number];
  raio: [number, number, number];
}

export interface Roda {
  x: number;
  z: number;
  raio: number;
}

export interface ModeloVeiculo {
  corpo: VertexData;
  /** As peças que mexem (a porta do ônibus): vértices de `ini` a `fim` (exclusivo). */
  porta?: { ini: number; fim: number };
  luzes: Luz[];
  rodas: Roda[];
  simples: VertexData;
  triangulos: number;
  /** Entre-eixos (já na escala): a conta do esterço das rodas da frente. */
  entreEixos: number;
}

const guardados = new Map<string, ModeloVeiculo>();

/** O modelo do veículo (feito uma vez por tipo e cor; quem usa copia os dados). */
export function modeloDoVeiculo(tipo: TipoVeiculo, cor = '#3f7fe0'): ModeloVeiculo {
  const k = `${tipo}|${cor}`;
  let r = guardados.get(k);
  if (r) return r;
  const m = modeloFirme(tipo, 'C', cor);
  r = {
    corpo: m.corpo,
    porta: m.porta,
    luzes: m.luzes,
    rodas: m.rodas,
    simples: modeloLonge(tipo, cor),
    triangulos: m.triangulos,
    entreEixos: m.entreEixos,
  };
  guardados.set(k, r);
  return r;
}

/**
 * A roda (raio 1, eixo z), aprovada no 014c: pneu gordinho e bem redondo, a calota abaulada
 * branca e o parafusinho fora do meio (dá para ver girar).
 */
export function dadosRoda(): VertexData {
  const esp = 0.6;
  const partes = new Pecas();
  const deitar = Matrix.RotationX(Math.PI / 2);
  const pneu = dadosAnel(2 - esp, esp, 0, 18, 8);
  pneu.transform(Matrix.Scaling(1, 1.15, 1).multiply(deitar));
  partes.add(pneu, '#2a2b33');
  const miolo = CreateCylinderVertexData({ height: esp * 0.95, diameter: (2 - esp) * 1.02, tessellation: 14 });
  miolo.transform(deitar);
  partes.add(miolo, '#34353e');
  for (const lado of [-1, 1]) {
    const calota = CreateSphereVertexData({ diameter: 1.0, segments: 6 });
    calota.transform(Matrix.Scaling(1, 1, 0.32).multiply(Matrix.Translation(0, 0, lado * esp * 0.42)));
    partes.add(calota, '#eef0f4');
    const parafuso = CreateSphereVertexData({ diameter: 0.18, segments: 3 });
    parafuso.transform(Matrix.Translation(0.24, 0.1, lado * esp * 0.58));
    partes.add(parafuso, '#9aa0ab');
  }
  return partes.juntar();
}
