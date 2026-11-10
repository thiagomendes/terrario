/**
 * A câmera de terceira pessoa (spec 015, como no esboço aprovado
 * `.sdd/specs/015-terceira-pessoa/referencia/camera-e-gestos.html`): solta do corpo, segue o
 * boneco com um leve atraso, volta devagar para trás dele quando a criança anda sem mexer
 * nela, desvia de paredes, árvores e tetos chegando perto (nunca entra num bloco), deixa o
 * boneco meio transparente quando chega perto demais e aproxima de 2,5 a 7 blocos.
 *
 * Convenção do jogo: pitch positivo olha para baixo; frente = (sen yaw · cos pitch,
 * −sen pitch, cos yaw · cos pitch). Tudo aqui é puro e determinístico (testes em
 * tests/player/camera.test.ts); a cena só lê o resultado.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Célula que a câmera não atravessa (inteiros). */
export type BloqueiaCamera = (x: number, y: number, z: number) => boolean;

/** Aproximar e afastar (roda do mouse e pinça), em blocos. */
export const ZOOM_MINIMO = 2.5;
export const ZOOM_MAXIMO = 7;
/** Distância de começo: o boneco inteiro na tela e o bloco da frente perto da mira. */
export const ZOOM_PADRAO = 3.8;
/** Um dente da roda do mouse. */
export const PASSO_ZOOM = 0.5;

/** Limites do olhar: para baixo quase em pé sobre o boneco; para cima até ver o céu. */
export const PITCH_BAIXO = 1.45;
export const PITCH_CIMA = -1.2;

/**
 * O ponto que a câmera olha fica um pouco acima dos olhos e à direita do boneco: a mira
 * do centro passa ao lado da cabeça (nunca aponta um bloco escondido atrás do boneco).
 */
export const ALTURA_PIVO = 0.2;
/**
 * No toque não há mira no meio da tela (a criança toca no bloco): o pivô desce até o
 * pescoço e o boneco fica no meio da tela, acima da barra de itens (celular deitado).
 */
export const ALTURA_PIVO_TOQUE = -0.35;
export const ZOOM_PADRAO_TOQUE = 4.4;
export const LADO_OMBRO = 0.45;
/** Olhando quase reto para baixo, o lado some (a mira volta para o pé do boneco). */
export const PITCH_SEM_LADO = 1.4;
export const PITCH_LADO_INTEIRO = 1.1;

/** Seguir com leve atraso (taxas por segundo, como no esboço). */
export const SEGUIR_HORIZONTAL = 8;
export const SEGUIR_VERTICAL = 6;
/** Pulos maiores que isto num quadro (teleporte, renascer) vão direto. */
export const SALTO_DIRETO = 3;

/** Andando sem mexer na câmera por este tempo, ela volta para trás do boneco. */
export const ESPERA_RECENTRAR = 1.4;
export const TAXA_RECENTRAR = 1.2;
/** Só volta andando de verdade (blocos/s). */
export const VELOCIDADE_RECENTRAR = 1;
/** Andando para a câmera (boneco de frente para ela), ela não gira sozinha. */
export const ANGULO_MAXIMO_RECENTRAR = 1.9;

/** Desvio de blocos: passos da marcha e folga até a parede. */
export const PASSO_COLISAO = 0.1;
export const INICIO_COLISAO = 0.3;
export const FOLGA_COLISAO = 0.3;
export const DISTANCIA_MINIMA = 0.2;
/** Raio da "bolinha" da câmera (sonda dos lados, de cima e de baixo). */
export const RAIO_CAMERA = 0.2;
/** Afastar de volta depois de desviar (por segundo): chega rápido, volta devagar. */
export const TAXA_AFASTAR = 3;

/** Perto demais: o boneco fica meio transparente (nunca menos que isto). */
export const OPACIDADE_MINIMA = 0.25;
export const FADE_INICIO = 0.8;
export const FADE_LARGURA = 1.2;

export const limitarZoom = (d: number): number =>
  Number.isFinite(d) ? Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, d)) : ZOOM_PADRAO;

export const limitarPitch = (p: number): number =>
  Number.isFinite(p) ? Math.min(PITCH_BAIXO, Math.max(PITCH_CIMA, p)) : 0;

/** Diferença de ângulo b − a no caminho mais curto (−π..π). */
export function difAngulo(a: number, b: number): number {
  const d = (((b - a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  return d - Math.PI;
}

/** Aproxima o ângulo a de b pela fração t (0..1), pelo caminho mais curto. */
export function angAlvo(a: number, b: number, t: number): number {
  return a + difAngulo(a, b) * Math.min(1, Math.max(0, t));
}

/** Fração de aproximação suave por quadro, independente do FPS. */
export const fracao = (taxa: number, dt: number): number => 1 - Math.exp(-taxa * Math.max(0, dt));

export function direcaoOlhar(yaw: number, pitch: number): Vec3 {
  const cp = Math.cos(pitch);
  return { x: Math.sin(yaw) * cp, y: -Math.sin(pitch), z: Math.cos(yaw) * cp };
}

/** Quanto do deslocamento de lado vale neste pitch (1 normal, 0 olhando reto para baixo). */
export function fatorLado(pitch: number): number {
  if (pitch <= PITCH_LADO_INTEIRO) return 1;
  if (pitch >= PITCH_SEM_LADO) return 0;
  const t = (pitch - PITCH_LADO_INTEIRO) / (PITCH_SEM_LADO - PITCH_LADO_INTEIRO);
  return 1 - t * t * (3 - 2 * t);
}

const celula = (b: BloqueiaCamera, p: Vec3) => b(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z));

/**
 * O ponto que a câmera olha: acima dos olhos seguidos e à direita, encolhendo o lado se
 * houver parede ali (nunca dentro de um bloco).
 */
export function pivoCamera(
  seguido: Vec3,
  yaw: number,
  pitch: number,
  bloqueia: BloqueiaCamera,
  lado = LADO_OMBRO,
  altura = ALTURA_PIVO,
): Vec3 {
  let base = { x: seguido.x, y: seguido.y + altura, z: seguido.z };
  // teto baixo logo acima da cabeça: o pivô fica nos olhos
  if (celula(bloqueia, base)) base = { x: seguido.x, y: seguido.y, z: seguido.z };
  const quer = lado * fatorLado(pitch);
  if (quer <= 0) return base;
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  // marcha para o lado; para a uma folga antes da parede
  let livre = 0;
  for (let d = 0.05; d <= quer + RAIO_CAMERA + 1e-9; d += 0.05) {
    if (celula(bloqueia, { x: base.x + rx * d, y: base.y, z: base.z + rz * d })) break;
    livre = d;
  }
  const l = Math.max(0, Math.min(quer, livre - RAIO_CAMERA));
  return { x: base.x + rx * l, y: base.y, z: base.z + rz * l };
}

/**
 * Até onde a câmera pode recuar do pivô sem entrar em bloco: marcha de 0,1 em 0,1 com uma
 * bolinha de raio 0,2 (centro, lados, cima e baixo) e para uma folga antes da parede.
 */
export function distanciaLivre(
  pivo: Vec3,
  yaw: number,
  pitch: number,
  desejada: number,
  bloqueia: BloqueiaCamera,
): number {
  const f = direcaoOlhar(yaw, pitch);
  const rx = Math.cos(yaw);
  const rz = -Math.sin(yaw);
  // "cima" da câmera: perpendicular à frente, no plano vertical
  const ux = Math.sin(yaw) * Math.sin(pitch);
  const uy = Math.cos(pitch);
  const uz = Math.cos(yaw) * Math.sin(pitch);
  const r = RAIO_CAMERA;
  const bate = (d: number): boolean => {
    const cx = pivo.x - f.x * d;
    const cy = pivo.y - f.y * d;
    const cz = pivo.z - f.z * d;
    return (
      bloqueia(Math.floor(cx), Math.floor(cy), Math.floor(cz)) ||
      bloqueia(Math.floor(cx + rx * r), Math.floor(cy), Math.floor(cz + rz * r)) ||
      bloqueia(Math.floor(cx - rx * r), Math.floor(cy), Math.floor(cz - rz * r)) ||
      bloqueia(Math.floor(cx + ux * r), Math.floor(cy + uy * r), Math.floor(cz + uz * r)) ||
      bloqueia(Math.floor(cx - ux * r), Math.floor(cy - uy * r), Math.floor(cz - uz * r))
    );
  };
  const passos = Math.ceil((desejada - INICIO_COLISAO) / PASSO_COLISAO);
  for (let i = 0; i <= passos; i++) {
    const d = Math.min(desejada, INICIO_COLISAO + i * PASSO_COLISAO);
    if (bate(d)) return Math.max(DISTANCIA_MINIMA, d - FOLGA_COLISAO);
  }
  return desejada;
}

/** Perto da parede chega na hora; longe dela volta devagar (sem tranco). */
export function suavizarDistancia(atual: number, livre: number, dt: number): number {
  if (!Number.isFinite(atual) || livre <= atual) return livre;
  return atual + (livre - atual) * fracao(TAXA_AFASTAR, dt);
}

/** Opacidade do boneco do jogador pela distância da câmera (1 = normal). */
export function opacidadeBoneco(distancia: number): number {
  return Math.min(1, Math.max(OPACIDADE_MINIMA, (distancia - FADE_INICIO) / FADE_LARGURA));
}

/** Opacidade em degraus (só mexe nos materiais quando o degrau muda). */
export function degrauOpacidade(a: number): number {
  return a >= 0.99 ? 1 : Math.round(a * 20) / 20;
}

export interface EntradaRecentrar {
  dt: number;
  tempo: number;
  /** Quando a criança mexeu na câmera pela última vez (s). */
  mexeuEm: number;
  arrastando: boolean;
  velocidade: number;
  yaw: number;
  yawCorpo: number;
  /** Desligado nas configurações, movimento reduzido, minerando ou construindo. */
  permitido: boolean;
}

/** Yaw da câmera depois de voltar (ou não) para trás do boneco neste quadro. */
export function recentrar(e: EntradaRecentrar): number {
  if (!e.permitido || e.arrastando) return e.yaw;
  if (e.velocidade <= VELOCIDADE_RECENTRAR) return e.yaw;
  if (e.tempo - e.mexeuEm <= ESPERA_RECENTRAR) return e.yaw;
  if (Math.abs(difAngulo(e.yaw, e.yawCorpo)) > ANGULO_MAXIMO_RECENTRAR) return e.yaw;
  return angAlvo(e.yaw, e.yawCorpo, e.dt * TAXA_RECENTRAR);
}

export interface QuadroCamera {
  dt: number;
  olhos: Vec3;
  yaw: number;
  pitch: number;
  bloqueia: BloqueiaCamera;
}

export interface ResultadoCamera {
  posicao: Vec3;
  pivo: Vec3;
  distancia: number;
  opacidade: number;
  /** Chegou perto por causa de uma parede (diagnóstico e testes). */
  desviando: boolean;
}

/** O estado da câmera que segue o boneco: ponto seguido, distância atual e zoom. */
export function criarCameraOrbita(zoom = ZOOM_PADRAO, alturaPivo = ALTURA_PIVO) {
  let seguido: Vec3 | null = null;
  let distancia = Number.NaN;
  let alvoDistancia = limitarZoom(zoom);
  let ultimo: ResultadoCamera | null = null;
  return {
    quadro(q: QuadroCamera): ResultadoCamera {
      const o = q.olhos;
      if (
        !seguido ||
        Math.abs(o.x - seguido.x) + Math.abs(o.y - seguido.y) + Math.abs(o.z - seguido.z) >
          SALTO_DIRETO
      ) {
        seguido = { ...o };
        distancia = Number.NaN;
      } else {
        const kh = fracao(SEGUIR_HORIZONTAL, q.dt);
        const kv = fracao(SEGUIR_VERTICAL, q.dt);
        seguido.x += (o.x - seguido.x) * kh;
        seguido.y += (o.y - seguido.y) * kv;
        seguido.z += (o.z - seguido.z) * kh;
      }
      const pivo = pivoCamera(seguido, q.yaw, q.pitch, q.bloqueia, LADO_OMBRO, alturaPivo);
      const livre = distanciaLivre(pivo, q.yaw, q.pitch, alvoDistancia, q.bloqueia);
      distancia = suavizarDistancia(distancia, livre, q.dt);
      const f = direcaoOlhar(q.yaw, q.pitch);
      ultimo = {
        posicao: {
          x: pivo.x - f.x * distancia,
          y: pivo.y - f.y * distancia,
          z: pivo.z - f.z * distancia,
        },
        pivo,
        distancia,
        opacidade: opacidadeBoneco(distancia),
        desviando: livre < alvoDistancia - 0.4,
      };
      return ultimo;
    },
    /** Aproxima (negativo) ou afasta (positivo) em blocos. */
    aproximar(delta: number): number {
      alvoDistancia = limitarZoom(alvoDistancia + delta);
      return alvoDistancia;
    },
    definirZoom(d: number): number {
      alvoDistancia = limitarZoom(d);
      return alvoDistancia;
    },
    zoom: () => alvoDistancia,
    /** Altura do pivô acima dos olhos (negativa no toque). */
    alturaPivo: () => alturaPivo,
    /** Ponto seguido (olhos com atraso); null antes do primeiro quadro. */
    seguido: (): Vec3 | null => (seguido ? { ...seguido } : null),
    ultimo: () => ultimo,
    /** Vai direto para o boneco no próximo quadro (teleporte, sair do modo foto). */
    encaixar(): void {
      seguido = null;
    },
  };
}

export type CameraOrbita = ReturnType<typeof criarCameraOrbita>;
