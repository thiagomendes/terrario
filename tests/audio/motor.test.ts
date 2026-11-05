import { describe, expect, it } from 'vitest';
import { criarMotorAudio } from '../../src/audio/motor';
import { ContextoFalso, FonteFalsa } from './falso';

function montar(rejeitar = false) {
  const ctx = new ContextoFalso(rejeitar);
  let chamadas = 0;
  const motor = criarMotorAudio(() => {
    chamadas++;
    return ctx;
  });
  return { ctx, motor, chamadas: () => chamadas };
}

const nova = () => {
  const f = new FonteFalsa();
  return f;
};

describe('motor de áudio', () => {
  it('nasce inativo, não chama a fábrica e ignora tocar sem fila', async () => {
    const { motor, chamadas } = montar();
    expect(motor.estado).toBe('inativo');
    expect(motor.tocar(nova)).toBe(false);
    expect(chamadas()).toBe(0);
    await motor.ativar();
    expect(motor.vozes).toBe(0);
  });

  it('ativar cria uma vez, retoma e é idempotente', async () => {
    const { motor, ctx, chamadas } = montar();
    await Promise.all([motor.ativar(), motor.ativar()]);
    await motor.ativar();
    expect(motor.estado).toBe('ativo');
    expect(chamadas()).toBe(1);
    expect(ctx.resumeChamadas).toBe(1);
    expect(motor.tocar(nova)).toBe(true);
  });

  it('fábrica que lança ou resume rejeitado vira bloqueado', async () => {
    const a = criarMotorAudio(() => {
      throw new Error('x');
    });
    await expect(a.ativar()).resolves.toBeUndefined();
    expect(a.estado).toBe('bloqueado');
    expect(a.tocar(nova)).toBe(false);
    const { motor } = montar(true);
    await motor.ativar();
    expect(motor.estado).toBe('bloqueado');
    expect(motor.tocar(nova)).toBe(false);
    expect(motor.vozes).toBe(0);
  });

  it('bus com compressor, grupos e mudo', async () => {
    const { motor, ctx } = montar();
    await motor.ativar();
    expect(ctx.compressores).toHaveLength(1);
    expect(ctx.compressores[0].conectados).toContain(ctx.destination);
    expect(ctx.gains).toHaveLength(4);
    const ganhos = ctx.gains.slice(1).map((g) => g.gain.value);
    expect(ganhos[2]).toBeLessThanOrEqual(0.08);
    expect(ganhos[0]).toBeGreaterThan(ganhos[1]);
    const mestre = ctx.gains[0];
    expect(motor.alternarMudo()).toBe(true);
    expect(mestre.gain.value).toBe(0);
    expect(motor.tocar(nova)).toBe(false);
    expect(motor.alternarMudo()).toBe(false);
    expect(mestre.gain.value).toBe(1);
    expect(motor.tocar(nova)).toBe(true);
  });

  it('limite de vozes descarta a mais antiga não alta', async () => {
    const ctx = new ContextoFalso();
    const motor = criarMotorAudio(() => ctx, { maxVozes: 12 });
    await motor.ativar();
    const fontes: FonteFalsa[] = [];
    const criar = () => {
      const f = nova();
      fontes.push(f);
      return f;
    };
    motor.tocar(criar, { prioridade: 'alta' });
    for (let i = 0; i < 11; i++) motor.tocar(criar);
    expect(motor.vozes).toBe(12);
    motor.tocar(criar);
    expect(motor.vozes).toBe(12);
    expect(fontes[0].parada).toBe(false);
    expect(fontes[1].parada).toBe(true);
    expect(fontes[1].desconectado).toBe(true);
    fontes[2].terminar();
    expect(motor.vozes).toBe(11);
  });

  it('vozes de prioridade alta nunca são descartadas', async () => {
    const ctx = new ContextoFalso();
    const motor = criarMotorAudio(() => ctx, { maxVozes: 2 });
    await motor.ativar();
    const a = nova();
    const b = nova();
    motor.tocar(() => a, { prioridade: 'alta' });
    motor.tocar(() => b, { prioridade: 'alta' });
    expect(motor.tocar(nova)).toBe(false);
    expect(a.parada || b.parada).toBe(false);
    expect(motor.vozes).toBe(2);
  });
});
