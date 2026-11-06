import type { ResultadoFisica } from './fisica';
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
import type { Edicoes } from '../world/edicoes';
import { ALTURA_OLHOS, passoFisica, posicaoInicial, type Solido } from './fisica';
import { acaoDaTecla, aplicarMouse, eixos, type TeclasAtivas } from './entrada';

export interface AlvoCamera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
}

export function criarMundoSolido(
  semente: number = SEMENTE_PADRAO,
  gerar: (cx: number, cz: number, semente: number) => Uint8Array = gerarChunk,
  edicoes?: Edicoes,
): Solido {
  const cache = new Map<string, { versao: number; blocos: Uint8Array }>();
  return (x, y, z) => {
    if (y < 0) return true;
    if (y >= ALTURA) return false;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    const versao = edicoes ? edicoes.versaoDoChunk(cx, cz) : 0;
    let entrada = cache.get(k);
    if (!entrada || entrada.versao !== versao) {
      const blocos = gerar(cx, cz, semente);
      if (edicoes) for (const [i, b] of edicoes.doChunk(cx, cz)) blocos[i] = b;
      entrada = { versao, blocos };
      cache.set(k, entrada);
    }
    const c = entrada.blocos;
    const b = c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
    return obterBloco(b)?.solido ?? false;
  };
}

export function criarControle(
  canvas: HTMLElement,
  camera: AlvoCamera,
  semente = SEMENTE_PADRAO,
  edicoes?: Edicoes,
) {
  const solido = criarMundoSolido(semente, gerarChunk, edicoes);
  const jogador = posicaoInicial(8.5, 8.5, (x, z) => alturaTerreno(x, z, semente));
  const teclas: TeclasAtivas = {};
  let yaw = 0.8;
  let pitch = 0.2;
  let sensibilidade = 1;
  let inverterY = false;

  let podeVoar = false;
  let ultimoEspaco = -1;
  let ultimoResultado: ResultadoFisica = { aterrissou: false, queda: 0 };
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
    const a = acaoDaTecla(e.code);
    if (a) teclas[a] = true;
    // dois toques no espaço alternam o voo (só no criativo)
    if (e.code === 'Space' && !e.repeat && podeVoar) {
      const agora = performance.now();
      if (agora - ultimoEspaco < 300) {
        jogador.voando = !jogador.voando;
        jogador.vy = 0;
        ultimoEspaco = -1;
      } else {
        ultimoEspaco = agora;
      }
    }
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
    ({ yaw, pitch } = aplicarMouse(
      yaw,
      pitch,
      e.movementX * sensibilidade,
      e.movementY * sensibilidade * (inverterY ? -1 : 1),
    ));
  });

  function atualizar(dtSeg: number): void {
    const dt = Math.min(dtSeg, 0.05);
    const { frente, direita } = eixos(teclas);
    const voando = !!jogador.voando;
    ultimoResultado = passoFisica(
      jogador,
      {
        frente,
        direita,
        pular: !!teclas.pular,
        correr: voando ? !!teclas.rapido : !!teclas.correr || !!teclas.rapido,
        descer: voando && !!teclas.correr,
        yaw,
      },
      dt,
      solido,
    );
    camera.position.x = jogador.x;
    camera.position.y = jogador.y + ALTURA_OLHOS;
    camera.position.z = jogador.z;
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
  }

  function apontar(novoYaw: number, novoPitch: number): void {
    yaw = novoYaw;
    pitch = novoPitch;
  }

  function definirMouse(sens: number, inverter: boolean): void {
    sensibilidade = sens;
    inverterY = inverter;
  }

  function definirVoo(permitido: boolean): void {
    podeVoar = permitido;
    if (!permitido) jogador.voando = false;
  }

  return {
    atualizar,
    jogador,
    apontar,
    solido,
    definirMouse,
    definirVoo,
    teclas,
    get resultado() {
      return ultimoResultado;
    },
  };
}
