import { describe, expect, it } from 'vitest';
import {
  alternar,
  criarEstadoCamera,
  definir,
  posicaoTerceiraPessoa,
  teclaParaCamera,
  textoIndicador,
  visibilidadePorModo,
} from '../../src/player/camera';

const olhos = { x: 10.5, y: 20.5, z: 10.5 };
const livre = () => false;
const dist = (p: { x: number; y: number; z: number }) =>
  Math.hypot(p.x - olhos.x, p.y - olhos.y, p.z - olhos.z);

describe('estado da câmera', () => {
  it('inicia em primeira e só V alterna', () => {
    expect(criarEstadoCamera().modo).toBe('primeira');
    expect(teclaParaCamera('KeyV')).toBe(true);
    expect(teclaParaCamera('KeyC')).toBe(false);
  });
  it('definir igual não muda e alternar passa por primeira, terceira e de frente', () => {
    const e = criarEstadoCamera();
    expect(definir(e, 'primeira')).toBe(e);
    expect(definir(e, 'terceira').modo).toBe('terceira');
    expect(alternar(e).modo).toBe('terceira');
    expect(alternar(alternar(e)).modo).toBe('frente');
    expect(alternar(alternar(alternar(e))).modo).toBe('primeira');
  });
  it('visibilidade e texto por modo', () => {
    expect(visibilidadePorModo('primeira')).toEqual({ braco: true, corpo: false });
    expect(visibilidadePorModo('terceira')).toEqual({ braco: false, corpo: true });
    expect(textoIndicador('primeira')).toBe('Câmera: 1ª pessoa (V)');
    expect(textoIndicador('terceira')).toBe('Câmera: 3ª pessoa (V)');
    expect(textoIndicador('frente')).toBe('Câmera: de frente (V)');
    expect(visibilidadePorModo('frente')).toEqual({ braco: false, corpo: true });
  });
});

describe('posicaoTerceiraPessoa', () => {
  it('por cima do ombro sai para a direita; de frente fica na frente do jogador', () => {
    const olhos = { x: 0.5, y: 70, z: 0.5 };
    const livre = () => false;
    const ombro = posicaoTerceiraPessoa(olhos, 0, 0, livre, { lado: 0.55 });
    expect(ombro.x).toBeCloseTo(0.5 + 0.55, 5);
    expect(ombro.z).toBeLessThan(olhos.z);
    const frente = posicaoTerceiraPessoa(olhos, 0, 0, livre, { frente: true });
    expect(frente.z).toBeGreaterThan(olhos.z);
    // parede à direita: volta para o centro
    const parede = (x: number) => x === 1;
    expect(posicaoTerceiraPessoa(olhos, 0, 0, parede, { lado: 0.55 }).x).toBeCloseTo(0.5, 5);
  });
  it('espaço livre: 3,5 blocos, oposto à mira', () => {
    const p = posicaoTerceiraPessoa(olhos, 0, 0, livre);
    expect(dist(p)).toBeCloseTo(3.5, 5);
    expect(p.z).toBeCloseTo(olhos.z - 3.5, 5);
    const q = posicaoTerceiraPessoa(olhos, 0.8, 0.3, livre);
    expect(dist(q)).toBeCloseTo(3.5, 5);
    expect(q.x).toBeLessThan(olhos.x);
    expect(q.y).toBeGreaterThan(olhos.y);
  });
  it('parede atrás: para antes do bloco', () => {
    const parede = (_x: number, _y: number, z: number) => z <= 8;
    const p = posicaoTerceiraPessoa(olhos, 0, 0, parede);
    expect(dist(p)).toBeLessThan(3.5);
    expect(dist(p)).toBeGreaterThanOrEqual(0.6);
    expect(parede(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))).toBe(false);
  });
  it('teto: olhando para baixo a câmera sobe e para no teto', () => {
    const teto = (_x: number, y: number) => y >= 22;
    const p = posicaoTerceiraPessoa(olhos, 0, 1.2, teto);
    expect(p.y).toBeLessThan(22);
    expect(dist(p)).toBeLessThan(3.5);
    expect(dist(p)).toBeGreaterThanOrEqual(0.6);
  });
  it('teto: ponto não sólido', () => {
    const teto = (_x: number, y: number) => y >= 22;
    const p = posicaoTerceiraPessoa(olhos, 0, 1.2, teto);
    expect(teto(Math.floor(p.x), Math.floor(p.y))).toBe(false);
  });
  it.each([
    [6, 3.5],
    [7, 2.5],
    [8, 1.5],
  ])('parede z<=%i (face a %f): mínimo 0,6 e fora do bloco', (zParede, face) => {
    const solido = (_x: number, _y: number, z: number) => z <= zParede;
    const p = posicaoTerceiraPessoa(olhos, 0, 0, solido);
    expect(dist(p)).toBeGreaterThanOrEqual(0.6 - 1e-9);
    expect(dist(p)).toBeLessThanOrEqual(face);
    expect(solido(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))).toBe(false);
  });
  it('parede a 0,5 (menos que o mínimo): nunca dentro de bloco sólido', () => {
    const solido = (_x: number, _y: number, z: number) => z <= 9;
    const p = posicaoTerceiraPessoa(olhos, 0, 0, solido);
    expect(dist(p)).toBeCloseTo(0, 5);
    expect(solido(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))).toBe(false);
  });
});
