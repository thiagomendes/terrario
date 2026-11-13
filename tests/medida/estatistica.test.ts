import { describe, expect, it } from 'vitest';
import {
  codificar,
  decodificar,
  diferenca,
  etapas,
  ganhouClaro,
  novaSessao,
  percentil,
  proximaEtapa,
  resumir,
  situacaoDoEfeito,
} from '../../src/medida/estatistica';

describe('medida WebGPU (spec 029): contas', () => {
  it('resume a rodada: quadros por segundo, mediana, p95 e processador', () => {
    const intervalos = [...Array(95).fill(16), 40, 40, 40, 40, 40];
    const cpu = [...Array(50).fill(4), ...Array(50).fill(6)];
    const r = resumir(intervalos, cpu, 2);
    expect(r.fps).toBe(50);
    expect(r.medianaMs).toBe(16);
    expect(r.p95Ms).toBe(16);
    expect(
      percentil(
        [...intervalos].sort((a, b) => a - b),
        0.96,
      ),
    ).toBe(40);
    expect(r.cpuMs).toBe(5);
    expect(r.cpuMedianaMs).toBe(4);
    expect(r.quadros).toBe(100);
  });

  it('sem quadros não quebra', () => {
    const r = resumir([], [], 0);
    expect(r.fps).toBe(0);
    expect(r.cpuMs).toBeUndefined();
  });

  it('critério da spec: 15% mais quadros ou 15% menos processador', () => {
    const gl = { ok: true, fps: 40, cpuMs: 10 };
    expect(ganhouClaro(gl, { ok: true, fps: 46, cpuMs: 10 })).toBe(true);
    expect(ganhouClaro(gl, { ok: true, fps: 40, cpuMs: 8.5 })).toBe(true);
    expect(ganhouClaro(gl, { ok: true, fps: 44, cpuMs: 9 })).toBe(false);
    expect(ganhouClaro(gl, { ok: false })).toBeNull();
    expect(diferenca(40, 50)).toBe(25);
    expect(diferenca(undefined, 50)).toBeNull();
  });

  it('etapas: com WebGPU confere, mede os dois e o snapshot; sem, só o WebGL2', () => {
    expect(etapas({ webgpu: true })).toEqual(['conferir', 'webgl2', 'webgpu', 'snapshot']);
    expect(proximaEtapa({ webgpu: false }, null)).toBe('webgl2');
    expect(proximaEtapa({ webgpu: false }, 'webgl2')).toBeNull();
    expect(proximaEtapa({ webgpu: true }, 'webgl2')).toBe('webgpu');
    expect(proximaEtapa({ webgpu: true }, 'snapshot')).toBeNull();
  });

  it('a sessão vai e volta pelo fragmento do endereço; lixo vira null', () => {
    const s = novaSessao({ webgpu: true, adaptador: 'apple · metal-3' }, 0.75, 'alta', 25);
    s.res.webgl2 = { ok: true, fps: 58.2 };
    s.desligados = ['água'];
    const volta = decodificar(`#${codificar(s)}`);
    expect(volta).toEqual(s);
    expect(decodificar('#m=%7Bquebrado')).toBeNull();
    expect(decodificar('')).toBeNull();
    expect(decodificar('#m=%7B%22v%22%3A2%7D')).toBeNull();
  });

  it('situação de cada efeito escrito à mão', () => {
    const s = novaSessao({ webgpu: true }, 1, 'alta', 25);
    s.convertidos = ['céu', 'materialMundo'];
    s.desligados = ['água'];
    expect(situacaoDoEfeito(s, 'céu')).toBe('convertido');
    expect(situacaoDoEfeito(s, 'água')).toBe('desligado');
    expect(situacaoDoEfeito(s, 'horizonte')).toBe('ausente');
    expect(situacaoDoEfeito(s, 'fotoBoneco')).toBe('fora');
  });
});
