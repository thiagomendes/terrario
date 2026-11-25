import { describe, expect, it } from 'vitest';
import {
  CHAVE_PRIMEIRA_PESSOA,
  OLHOS_FRENTE,
  carregarEscolha,
  fovDeDentro,
  frenteLivre,
  guardarEscolha,
  lugarComCameraPropria,
  pitchDeEntrada,
  type SituacaoCamera,
} from '../../src/render/primeiraPessoa';

const graus = (r: number) => (r * 180) / Math.PI;
const NADA: SituacaoCamera = {
  modoFoto: false,
  casa: false,
  sentadaNoParque: false,
  montada: false,
  dormindo: false,
  desmaiada: false,
};

describe('spec 037 (T03): a câmera da primeira pessoa', () => {
  it('o campo: 80° no celular em pé, o da configuração deitado e no computador', () => {
    const fov70 = (70 * Math.PI) / 180;
    expect(graus(fovDeDentro(390 / 844, fov70))).toBeCloseTo(80, 0);
    expect(graus(fovDeDentro(844 / 390, fov70))).toBeCloseTo(70, 5);
    expect(graus(fovDeDentro(1280 / 720, fov70))).toBeCloseTo(70, 5);
    // a configuração maior que a regra vale como está
    const fov95 = (95 * Math.PI) / 180;
    expect(graus(fovDeDentro(390 / 844, fov95))).toBeCloseTo(95, 5);
    // nunca menos de 42,4° na horizontal, em qualquer tela
    for (const a of [0.4, 0.46, 0.56, 0.75, 1, 1.33, 1.78, 2.2]) {
      const v = fovDeDentro(a, fov70);
      const h = 2 * Math.atan(Math.tan(v / 2) * a);
      expect(graus(h)).toBeGreaterThanOrEqual(42.39);
    }
  });

  it('ao entrar, o horizonte fica no terço de cima', () => {
    const v = (80 * Math.PI) / 180;
    // a linha do horizonte, de -1 (embaixo) a 1 (em cima), olhando um tico para baixo
    const y = Math.tan(pitchDeEntrada(v)) / Math.tan(v / 2);
    expect(y).toBeCloseTo(1 / 3, 5);
  });

  it('os olhos ficam dentro do corpo e recuam quando há bloco à frente', () => {
    const vazio = () => false;
    expect(frenteLivre(10.5, 41.62, 10.5, 0, vazio)).toBe(OLHOS_FRENTE);
    expect(OLHOS_FRENTE).toBeLessThanOrEqual(0.2);
    // encostada numa parede em +z (o corpo de 0,3 de meia largura: o centro a 0,3 dela)
    const parede = (_x: number, _y: number, z: number) => z >= 11;
    const f = frenteLivre(10.5, 41.62, 10.7, 0, parede);
    expect(f).toBeLessThan(OLHOS_FRENTE);
    expect(10.7 + f).toBeLessThanOrEqual(11 - 0.2 + 1e-9);
    // a 0,5 da parede ela já pode ir um pouco à frente, sem chegar a 0,2 dela
    const g = frenteLivre(10.5, 41.62, 10.5, 0, parede);
    expect(10.5 + g).toBeLessThanOrEqual(11 - 0.2 + 1e-9);
    expect(g).toBeGreaterThan(0);
    // de lado para a parede, o rumo não aponta para ela: vai inteiro
    expect(frenteLivre(10.5, 41.62, 10.7, Math.PI / 2, parede)).toBe(OLHOS_FRENTE);
  });

  it('os lugares com câmera própria tiram a primeira pessoa (a foto antes de tudo)', () => {
    expect(lugarComCameraPropria(NADA)).toBeNull();
    expect(lugarComCameraPropria({ ...NADA, modoFoto: true, casa: true })).toBe('foto');
    expect(lugarComCameraPropria({ ...NADA, casa: true })).toBe('casa');
    expect(lugarComCameraPropria({ ...NADA, sentadaNoParque: true })).toBe('parque');
    expect(lugarComCameraPropria({ ...NADA, montada: true })).toBe('montada');
    expect(lugarComCameraPropria({ ...NADA, dormindo: true })).toBe('dormindo');
    expect(lugarComCameraPropria({ ...NADA, desmaiada: true })).toBe('desmaiada');
  });

  it('a escolha fica guardada no aparelho (e sem armazenamento, nada quebra)', () => {
    const m = new Map<string, string>();
    const a = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    expect(carregarEscolha(a)).toBe(false);
    guardarEscolha(a, true);
    expect(m.get(CHAVE_PRIMEIRA_PESSOA)).toBe('1');
    expect(carregarEscolha(a)).toBe(true);
    guardarEscolha(a, false);
    expect(carregarEscolha(a)).toBe(false);
    expect(carregarEscolha(null)).toBe(false);
    const quebrado = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(carregarEscolha(quebrado)).toBe(false);
    expect(() => guardarEscolha(quebrado, true)).not.toThrow();
  });
});
