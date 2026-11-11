import { describe, expect, it, vi } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import type { Criatura } from '../../src/jogo/criaturas';
import '../../src/temas/todos';
import { criarRenderCriaturas, VALIDADE_GESTO_PENDENTE } from '../../src/render/criaturas';

/**
 * Auditoria 017: os moradores de um povoado que aparece saem um por quadro. O aceno que o
 * servidor manda para um que ainda espera na fila não se perde: toca quando o boneco sai
 * (o velho demais, mais de `VALIDADE_GESTO_PENDENTE` segundos, é esquecido).
 */
vi.mock('../../src/render/balaoGesto', () => ({
  criarBalao: () => ({ gesto: null, mostrar() {}, atualizar() {}, descartar() {} }),
}));

const morador = (id: number, x: number): Criatura =>
  ({
    id,
    tipo: 'morador',
    x,
    y: 64,
    z: 0,
    yaw: 0,
    estado: 'parado',
    noChao: true,
    ferida: 0,
    dissolver: 0,
    morador: { povoado: 'teste', profissao: 'construtor', n: id },
  }) as unknown as Criatura;

function montar() {
  const scene = new Scene(new NullEngine());
  const r = criarRenderCriaturas(
    scene,
    () => {},
    () => {},
  );
  const lista = [morador(1, 0), morador(2, 2), morador(3, 4)];
  const quadro = (dt = 1 / 60) => r.atualizar(lista, dt, 0, () => 1);
  const gestoDe = (id: number) => r.gestosMoradores().find((m) => m.id === id)?.gesto ?? null;
  const montados = () => r.gestosMoradores().map((m) => m.id);
  return { r, quadro, gestoDe, montados };
}

describe('aceno para morador ainda na fila de montar', () => {
  it('toca quando o boneco sai', () => {
    const { r, quadro, gestoDe, montados } = montar();
    quadro();
    // o último da fila ainda não tem boneco
    expect(montados()).not.toContain(3);
    expect(r.gesto(3, 'acenar')).toBe(false);
    for (let i = 0; i < 20 && !montados().includes(3); i++) quadro();
    expect(montados()).toContain(3);
    expect(gestoDe(3)).toBe('acenar');
  });

  it('velho demais: esquecido', () => {
    const { r, quadro, gestoDe, montados } = montar();
    quadro();
    expect(r.gesto(3, 'acenar')).toBe(false);
    // quadros longos (aba em segundo plano): o aceno passou da validade antes do boneco sair
    quadro(VALIDADE_GESTO_PENDENTE + 0.5);
    for (let i = 0; i < 20 && !montados().includes(3); i++) quadro();
    expect(montados()).toContain(3);
    expect(gestoDe(3)).toBeNull();
  });
});
