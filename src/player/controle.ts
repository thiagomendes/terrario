import {
  ALTURA,
  TAM_X,
  TAM_Z,
  alturaTerreno,
  gerarChunk,
  indice,
  SEMENTE_PADRAO,
} from '../world/chunk';
import { obterBloco } from '../world/blocks';
import { ALTURA_OLHOS, passoFisica, posicaoInicial, type Solido } from './fisica';
import { acaoDaTecla, aplicarMouse, eixos, type TeclasAtivas } from './entrada';

export interface AlvoCamera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
}

export function criarMundoSolido(
  semente: number = SEMENTE_PADRAO,
  gerar: (cx: number, cz: number, semente: number) => Uint8Array = gerarChunk,
): Solido {
  const cache = new Map<string, Uint8Array>();
  return (x, y, z) => {
    if (y < 0) return true;
    if (y >= ALTURA) return false;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    let c = cache.get(k);
    if (!c) {
      c = gerar(cx, cz, semente);
      cache.set(k, c);
    }
    const b = c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
    return obterBloco(b)?.solido ?? false;
  };
}

export function criarControle(canvas: HTMLElement, camera: AlvoCamera, semente = SEMENTE_PADRAO) {
  const solido = criarMundoSolido(semente);
  const jogador = posicaoInicial(8.5, 8.5, (x, z) => alturaTerreno(x, z, semente));
  const teclas: TeclasAtivas = {};
  let yaw = 0.8;
  let pitch = 0.2;

  window.addEventListener('keydown', (e) => {
    const a = acaoDaTecla(e.code);
    if (a) teclas[a] = true;
  });
  window.addEventListener('keyup', (e) => {
    const a = acaoDaTecla(e.code);
    if (a) teclas[a] = false;
  });
  canvas.addEventListener('click', () => {
    void canvas.requestPointerLock?.();
  });
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement !== canvas) return;
    ({ yaw, pitch } = aplicarMouse(yaw, pitch, e.movementX, e.movementY));
  });

  function atualizar(dtSeg: number): void {
    const dt = Math.min(dtSeg, 0.05);
    const { frente, direita } = eixos(teclas);
    passoFisica(
      jogador,
      { frente, direita, pular: !!teclas.pular, correr: !!teclas.correr, yaw },
      dt,
      solido,
    );
    camera.position.x = jogador.x;
    camera.position.y = jogador.y + ALTURA_OLHOS;
    camera.position.z = jogador.z;
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
  }

  return { atualizar, jogador };
}
