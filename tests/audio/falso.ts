import type { ContextoAudio, FonteAudio } from '../../src/audio/motor';

export class NoFalso {
  gain = { value: 1 };
  conectados: unknown[] = [];
  desconectado = false;
  connect(destino: unknown) {
    this.conectados.push(destino);
    return destino;
  }
  disconnect() {
    this.desconectado = true;
  }
}

export class FonteFalsa extends NoFalso implements FonteAudio {
  onended: (() => void) | null = null;
  iniciada = false;
  parada = false;
  start() {
    this.iniciada = true;
  }
  stop() {
    this.parada = true;
  }
  terminar() {
    this.onended?.();
  }
}

export class ContextoFalso implements ContextoAudio {
  destination = { nome: 'destino' };
  currentTime = 0;
  resumeChamadas = 0;
  gains: NoFalso[] = [];
  compressores: NoFalso[] = [];
  constructor(private rejeitarResume = false) {}
  resume() {
    this.resumeChamadas++;
    return this.rejeitarResume ? Promise.reject(new Error('bloqueado')) : Promise.resolve();
  }
  createGain() {
    const g = new NoFalso();
    this.gains.push(g);
    return g;
  }
  createDynamicsCompressor() {
    const c = new NoFalso();
    this.compressores.push(c);
    return c;
  }
}
