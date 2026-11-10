import { describe, expect, it } from 'vitest';
import {
  ALTURA_PIVO,
  ALTURA_PIVO_TOQUE,
  ZOOM_PADRAO_TOQUE,
  ANGULO_MAXIMO_RECENTRAR,
  criarCameraOrbita,
  degrauOpacidade,
  difAngulo,
  direcaoOlhar,
  distanciaLivre,
  ESPERA_RECENTRAR,
  fatorLado,
  LADO_OMBRO,
  limitarPitch,
  limitarZoom,
  opacidadeBoneco,
  OPACIDADE_MINIMA,
  PITCH_BAIXO,
  PITCH_CIMA,
  pivoCamera,
  recentrar,
  suavizarDistancia,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  ZOOM_PADRAO,
  type BloqueiaCamera,
} from '../../src/player/camera';

const olhos = { x: 10.5, y: 20.62, z: 10.5 };
const livre: BloqueiaCamera = () => false;
const dist = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) =>
  Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** Uma bolinha de raio 0,15 em volta do ponto não toca bloco. */
const foraDeBloco = (b: BloqueiaCamera, p: { x: number; y: number; z: number }) => {
  for (const dx of [-0.15, 0, 0.15])
    for (const dy of [-0.15, 0, 0.15])
      for (const dz of [-0.15, 0, 0.15])
        if (b(Math.floor(p.x + dx), Math.floor(p.y + dy), Math.floor(p.z + dz))) return false;
  return true;
};

/** Roda a câmera alguns quadros parada (o atraso some). */
function assentar(b: BloqueiaCamera, yaw: number, pitch: number, zoom = ZOOM_PADRAO) {
  const c = criarCameraOrbita(zoom);
  let r = c.quadro({ dt: 1 / 60, olhos, yaw, pitch, bloqueia: b });
  for (let i = 0; i < 240; i++) r = c.quadro({ dt: 1 / 60, olhos, yaw, pitch, bloqueia: b });
  return r;
}

describe('zoom e limites do olhar', () => {
  it('zoom fica entre 2,5 e 7 blocos', () => {
    expect(limitarZoom(1)).toBe(ZOOM_MINIMO);
    expect(limitarZoom(99)).toBe(ZOOM_MAXIMO);
    expect(limitarZoom(4)).toBe(4);
    expect(limitarZoom(Number.NaN)).toBe(ZOOM_PADRAO);
    const c = criarCameraOrbita();
    for (let i = 0; i < 30; i++) c.aproximar(-0.5);
    expect(c.zoom()).toBe(2.5);
    for (let i = 0; i < 30; i++) c.aproximar(0.5);
    expect(c.zoom()).toBe(7);
    expect(c.definirZoom(3.3)).toBeCloseTo(3.3);
  });
  it('pitch entre olhar o céu e quase reto para baixo', () => {
    expect(limitarPitch(2)).toBe(PITCH_BAIXO);
    expect(limitarPitch(-2)).toBe(PITCH_CIMA);
    expect(limitarPitch(0.3)).toBe(0.3);
    expect(PITCH_BAIXO).toBeLessThan(Math.PI / 2);
    expect(PITCH_CIMA).toBeGreaterThan(-Math.PI / 2);
  });
});

describe('órbita em campo aberto', () => {
  it('fica atrás do olhar, na distância do zoom, olhando para o pivô', () => {
    const r = assentar(livre, 0, 0.3);
    expect(r.distancia).toBeCloseTo(ZOOM_PADRAO, 5);
    expect(dist(r.posicao, r.pivo)).toBeCloseTo(ZOOM_PADRAO, 5);
    // atrás (z menor) e acima (pitch positivo olha para baixo)
    expect(r.posicao.z).toBeLessThan(olhos.z - 3);
    expect(r.posicao.y).toBeGreaterThan(r.pivo.y);
    // a direção da câmera para o pivô é a do olhar
    const f = direcaoOlhar(0, 0.3);
    const d = dist(r.posicao, r.pivo);
    expect((r.pivo.x - r.posicao.x) / d).toBeCloseTo(f.x, 5);
    expect((r.pivo.y - r.posicao.y) / d).toBeCloseTo(f.y, 5);
    expect(r.opacidade).toBe(1);
    expect(r.desviando).toBe(false);
  });
  it('pivô acima dos olhos e à direita; olhando reto para baixo, o lado some', () => {
    const p = pivoCamera(olhos, 0, 0.3, livre);
    expect(p.y).toBeCloseTo(olhos.y + ALTURA_PIVO, 5);
    // yaw 0 olha para +z; a direita é +x
    expect(p.x).toBeCloseTo(olhos.x + LADO_OMBRO, 5);
    const baixo = pivoCamera(olhos, 0, PITCH_BAIXO, livre);
    expect(baixo.x).toBeCloseTo(olhos.x, 5);
    expect(fatorLado(0.5)).toBe(1);
    expect(fatorLado(1.45)).toBe(0);
    expect(fatorLado(1.25)).toBeGreaterThan(0);
    expect(fatorLado(1.25)).toBeLessThan(1);
  });
  it('no toque o pivô desce até o pescoço (o boneco fica acima da barra) e o zoom começa mais longe', () => {
    const c = criarCameraOrbita(ZOOM_PADRAO_TOQUE, ALTURA_PIVO_TOQUE);
    const r = c.quadro({ dt: 1 / 60, olhos, yaw: 0, pitch: 0.3, bloqueia: livre });
    expect(r.pivo.y).toBeCloseTo(olhos.y + ALTURA_PIVO_TOQUE, 5);
    expect(ALTURA_PIVO_TOQUE).toBeLessThan(0);
    expect(c.zoom()).toBeGreaterThan(ZOOM_PADRAO);
  });
  it('parede à direita: o pivô encolhe o lado e nunca entra nela', () => {
    const parede: BloqueiaCamera = (x) => x >= 11;
    const p = pivoCamera(olhos, 0, 0.3, parede);
    expect(p.x).toBeLessThan(11 - 0.15);
    expect(p.x).toBeGreaterThanOrEqual(olhos.x - 1e-9);
  });
  it('teto logo acima da cabeça: o pivô fica nos olhos', () => {
    const teto: BloqueiaCamera = (_x, y) => y >= 21;
    const o = { ...olhos, y: 20.9 };
    expect(pivoCamera(o, 0, 0.3, teto).y).toBeCloseTo(o.y, 5);
  });
});

describe('desvio de blocos', () => {
  it('parede atrás: chega perto em vez de atravessar, fora do bloco', () => {
    const parede: BloqueiaCamera = (_x, _y, z) => z <= 8;
    const r = assentar(parede, 0, 0);
    expect(r.distancia).toBeLessThan(ZOOM_PADRAO);
    expect(r.desviando).toBe(true);
    expect(foraDeBloco(parede, r.posicao)).toBe(true);
  });
  it('caverna: teto e chão perto, olhando para baixo e para cima, nunca dentro de bloco', () => {
    // túnel de 3 de altura (y 18..20 livres) e 3 de largura em x, aberto em z
    const tunel: BloqueiaCamera = (x, y) => y < 18 || y > 20 || x < 9 || x > 11;
    const o = { x: 10.5, y: 19.62, z: 10.5 };
    for (const pitch of [-1.1, -0.5, 0, 0.5, 1.0, 1.4])
      for (const yaw of [0, 0.7, 1.57, 3]) {
        const c = criarCameraOrbita(7);
        let r = c.quadro({ dt: 1 / 60, olhos: o, yaw, pitch, bloqueia: tunel });
        for (let i = 0; i < 30; i++)
          r = c.quadro({ dt: 1 / 60, olhos: o, yaw, pitch, bloqueia: tunel });
        expect(foraDeBloco(tunel, r.posicao), `yaw ${yaw} pitch ${pitch}`).toBe(true);
        expect(r.distancia).toBeGreaterThan(0);
      }
  });
  it('casinha 3x3 fechada: a câmera fica dentro, perto, e o boneco fica meio transparente', () => {
    // paredes em x 9 e 13, z 9 e 13, chão y 19, teto y 23; dentro livre
    const casa: BloqueiaCamera = (x, y, z) =>
      y <= 19 || y >= 23 || x <= 9 || x >= 13 || z <= 9 || z >= 13;
    const o = { x: 11.5, y: 21.62, z: 11.5 };
    const c = criarCameraOrbita(ZOOM_PADRAO);
    let r = c.quadro({ dt: 1 / 60, olhos: o, yaw: 0.4, pitch: 0.3, bloqueia: casa });
    for (let i = 0; i < 60; i++)
      r = c.quadro({ dt: 1 / 60, olhos: o, yaw: 0.4, pitch: 0.3, bloqueia: casa });
    expect(foraDeBloco(casa, r.posicao)).toBe(true);
    expect(r.distancia).toBeLessThan(2);
    expect(r.opacidade).toBeLessThan(1);
    expect(r.opacidade).toBeGreaterThanOrEqual(OPACIDADE_MINIMA);
  });
  it('distância livre: nunca negativa, para uma folga antes da parede', () => {
    const colado: BloqueiaCamera = (_x, _y, z) => z <= 10;
    const d = distanciaLivre({ x: 10.5, y: 20.8, z: 10.5 }, 0, 0, 5, colado);
    expect(d).toBeGreaterThan(0);
    expect(d).toBeLessThan(0.5);
  });
  it('perto chega na hora, longe volta devagar', () => {
    expect(suavizarDistancia(4, 1, 1 / 60)).toBe(1);
    const v = suavizarDistancia(1, 4, 1 / 60);
    expect(v).toBeGreaterThan(1);
    expect(v).toBeLessThan(1.2);
  });
});

describe('transparência do boneco', () => {
  it('opaco a partir de 2 blocos; nunca menos que 0,25', () => {
    expect(opacidadeBoneco(4)).toBe(1);
    expect(opacidadeBoneco(2)).toBe(1);
    expect(opacidadeBoneco(1.4)).toBeCloseTo(0.5, 5);
    expect(opacidadeBoneco(0.5)).toBe(OPACIDADE_MINIMA);
    expect(opacidadeBoneco(0)).toBe(OPACIDADE_MINIMA);
  });
  it('degraus: só muda quando o degrau muda', () => {
    expect(degrauOpacidade(0.995)).toBe(1);
    expect(degrauOpacidade(0.51)).toBe(0.5);
    expect(degrauOpacidade(0.52)).toBe(0.5);
    expect(degrauOpacidade(0.26)).toBe(0.25);
  });
});

describe('seguir com atraso', () => {
  it('andando, a câmera vem atrás com atraso e alcança ao parar', () => {
    const c = criarCameraOrbita();
    const o = { ...olhos };
    c.quadro({ dt: 1 / 60, olhos: o, yaw: 0, pitch: 0.3, bloqueia: livre });
    for (let i = 0; i < 30; i++) {
      o.z += 4.3 / 60;
      c.quadro({ dt: 1 / 60, olhos: o, yaw: 0, pitch: 0.3, bloqueia: livre });
    }
    const s = c.seguido()!;
    expect(o.z - s.z).toBeGreaterThan(0.2);
    expect(o.z - s.z).toBeLessThan(1);
    for (let i = 0; i < 120; i++)
      c.quadro({ dt: 1 / 60, olhos: o, yaw: 0, pitch: 0.3, bloqueia: livre });
    expect(c.seguido()!.z).toBeCloseTo(o.z, 3);
  });
  it('teleporte vai direto', () => {
    const c = criarCameraOrbita();
    c.quadro({ dt: 1 / 60, olhos, yaw: 0, pitch: 0.3, bloqueia: livre });
    const longe = { x: olhos.x + 30, y: olhos.y, z: olhos.z };
    c.quadro({ dt: 1 / 60, olhos: longe, yaw: 0, pitch: 0.3, bloqueia: livre });
    expect(c.seguido()!.x).toBeCloseTo(longe.x, 5);
  });
  it('mesmo resultado em 30 e 120 quadros por segundo (sem depender do FPS)', () => {
    const rodar = (fps: number) => {
      const c = criarCameraOrbita();
      const o = { ...olhos };
      c.quadro({ dt: 1 / fps, olhos: o, yaw: 0, pitch: 0.3, bloqueia: livre });
      for (let i = 0; i < fps; i++) {
        o.x += 4 / fps;
        c.quadro({ dt: 1 / fps, olhos: o, yaw: 0, pitch: 0.3, bloqueia: livre });
      }
      return c.seguido()!.x;
    };
    expect(Math.abs(rodar(30) - rodar(120))).toBeLessThan(0.05);
  });
});

describe('voltar para trás do boneco', () => {
  const base = {
    dt: 1 / 60,
    tempo: 10,
    mexeuEm: 0,
    arrastando: false,
    velocidade: 4.3,
    yaw: 0,
    yawCorpo: 1,
    permitido: true,
  };
  it('andando sem mexer na câmera, gira devagar para o corpo', () => {
    const y = recentrar(base);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(0.05);
  });
  it('não gira: mexeu há pouco, arrastando, parado, desligado ou andando para a câmera', () => {
    expect(recentrar({ ...base, mexeuEm: 10 - ESPERA_RECENTRAR + 0.1 })).toBe(0);
    expect(recentrar({ ...base, arrastando: true })).toBe(0);
    expect(recentrar({ ...base, velocidade: 0.5 })).toBe(0);
    expect(recentrar({ ...base, permitido: false })).toBe(0);
    expect(recentrar({ ...base, yawCorpo: ANGULO_MAXIMO_RECENTRAR + 0.2 })).toBe(0);
  });
  it('em 3 s andando em curva, chega atrás do boneco', () => {
    let yaw = 0;
    for (let i = 0; i < 180; i++) yaw = recentrar({ ...base, yaw, tempo: 10 + i / 60 });
    expect(Math.abs(difAngulo(yaw, 1))).toBeLessThan(0.1);
  });
});
