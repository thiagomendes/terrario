import type { ResultadoFisica } from './fisica';
import {
  alturaTerreno,
  gerarChunk,
  SEMENTE_PADRAO,
  olharDoNascimento,
  pontoDeNascer,
} from '../world/chunk';
import type { Edicoes } from '../world/edicoes';
import {
  ALTURA_OLHOS,
  comCaixasExtras,
  dentroDaCaixa,
  passoFisica,
  posicaoInicial,
  type CaixaSolida,
} from './fisica';
import { criarMundoSolido } from '../world/solido';
export { criarMundoSolido };
import { acaoDaTecla, aplicarMouse, eixos, type TeclasAtivas } from './entrada';
import { limitarPitch } from './camera';

export interface AlvoCamera {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
}

export function criarControle(
  canvas: HTMLElement,
  camera: AlvoCamera,
  semente = SEMENTE_PADRAO,
  edicoes?: Edicoes,
  gerar: (cx: number, cz: number, semente: number) => Uint8Array = gerarChunk,
) {
  const solidoMundo = criarMundoSolido(semente, gerar, edicoes);
  /**
   * Spec 014 (T14): caixas sólidas que não são blocos (os carrinhos e ônibus da cidade), em
   * coordenadas do mundo. A caixa em que o boneco já está dentro não segura (nunca prende).
   */
  let fonteExtras: (() => readonly CaixaSolida[]) | null = null;
  let extras: CaixaSolida[] = [];
  const solido = comCaixasExtras(solidoMundo, () => extras);
  // nunca em cima de uma árvore (o nascimento de geração fica igual)
  const nasc = pontoDeNascer(semente);
  const jogador = posicaoInicial(nasc.x, nasc.z, (x, z) => alturaTerreno(x, z, semente));
  const teclas: TeclasAtivas = {};
  // mundo de sítio (Rancho Alegre): nasce olhando para o sítio mais perto
  let yaw = olharDoNascimento(semente) ?? 0.8;
  let pitch = 0.2;
  let sensibilidade = 1;
  let inverterY = false;
  let puloAutomatico = true;
  /** Quando a criança mexeu na câmera pela última vez (s): a câmera só volta sozinha depois. */
  let mexeuEm = -Infinity;
  const agora = () => performance.now() / 1000;

  let podeVoar = false;
  let ultimoEspaco = -1;
  let ultimoResultado: ResultadoFisica = { aterrissou: false, queda: 0 };
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
    const a = acaoDaTecla(e.code);
    if (a) teclas[a] = true;
    if (e.code === 'Space' && !e.repeat) toquePulo();
  });
  /** Aviso curto de como voar (as crianças não sabem os atalhos). */
  function avisarVoo(voando: boolean): void {
    const toque = document.body.classList.contains('toque-ativo');
    const texto = voando
      ? toque
        ? 'Voo ligado · pular sobe · descer desce · dois toques em pular pousa'
        : 'Voo ligado · Espaço sobe · Shift desce · Espaço duas vezes pousa'
      : 'Voo desligado';
    window.dispatchEvent(new CustomEvent('brumaluz:toast', { detail: texto }));
  }
  /** Dois toques no pulo alternam o voo (só no criativo). */
  function toquePulo(): void {
    if (!podeVoar) return;
    const agora = performance.now();
    if (agora - ultimoEspaco < 300) {
      jogador.voando = !jogador.voando;
      jogador.vy = 0;
      ultimoEspaco = -1;
      avisarVoo(!!jogador.voando);
    } else {
      ultimoEspaco = agora;
    }
  }
  /** Pulo por botão (toque e controle): mesma regra do espaço. */
  function pular(ativo: boolean): void {
    if (ativo && !teclas.pular) toquePulo();
    teclas.pular = ativo;
  }
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
    pitch = limitarPitch(pitch);
    if (e.movementX !== 0 || e.movementY !== 0) mexeuEm = agora();
  });

  /** Spec 026: calçado de patins (a pista onde o embalo desliza), ou null. */
  let pistaPatins: ((x: number, z: number) => boolean) | null = null;

  function atualizar(dtSeg: number): void {
    const dt = Math.min(dtSeg, 0.05);
    extras = fonteExtras ? fonteExtras().filter((c) => !dentroDaCaixa(c, jogador)) : [];
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
        puloAutomatico,
        yaw,
        ...(pistaPatins ? { patins: { pista: pistaPatins } } : {}),
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

  /** Aponta o olhar; `sozinha`: a câmera que vira sozinha (spec 030) não conta como a criança. */
  function apontar(novoYaw: number, novoPitch: number, sozinha = false): void {
    yaw = novoYaw;
    pitch = limitarPitch(novoPitch);
    if (!sozinha) mexeuEm = agora();
    // a mira vale já (o alvo é calculado pela rotação da câmera), sem esperar o quadro
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
  }

  function definirMouse(sens: number, inverter: boolean): void {
    sensibilidade = sens;
    inverterY = inverter;
  }

  function definirPuloAutomatico(ligado: boolean): void {
    puloAutomatico = ligado;
  }

  /** Olhar por deltas (toque e controle), na mesma escala do mouse. */
  function girar(dx: number, dy: number): void {
    ({ yaw, pitch } = aplicarMouse(
      yaw,
      pitch,
      dx * sensibilidade,
      dy * sensibilidade * (inverterY ? -1 : 1),
    ));
    pitch = limitarPitch(pitch);
    if (dx !== 0 || dy !== 0) mexeuEm = agora();
  }

  /** A câmera voltando sozinha para trás do boneco (não conta como a criança mexer). */
  function recentrar(novoYaw: number): void {
    yaw = novoYaw;
    camera.rotation.y = yaw;
  }

  function definirVoo(permitido: boolean): void {
    podeVoar = permitido;
    if (!permitido) jogador.voando = false;
  }

  return {
    atualizar,
    jogador,
    /** Spec 014 (T14): caixas sólidas além dos blocos (os veículos), lidas a cada passo. */
    definirSolidosExtras(f: (() => readonly CaixaSolida[]) | null) {
      fonteExtras = f;
    },
    /** As caixas de fora que seguraram no último passo (testes e o "toc" do carrinho). */
    get caixasExtras(): readonly CaixaSolida[] {
      return extras;
    },
    apontar,
    solido,
    definirMouse,
    definirPuloAutomatico,
    definirVoo,
    /** Spec 026: patins (a pista onde desliza) ou null (descalço dos patins). */
    definirPatins(pista: ((x: number, z: number) => boolean) | null) {
      pistaPatins = pista;
    },
    get patins() {
      return !!pistaPatins;
    },
    girar,
    recentrar,
    /** Quando a criança mexeu na câmera pela última vez (s, relógio da página). */
    get mexeuEm() {
      return mexeuEm;
    },
    pular,
    teclas,
    get resultado() {
      return ultimoResultado;
    },
  };
}
