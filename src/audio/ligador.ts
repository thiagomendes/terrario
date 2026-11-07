import type { Barramento } from '../player/eventos';
import { grupoDoBloco } from './materiais';
import type { EstadoAudio, MotorAudio } from './motor';
import { tocarSom } from './sons';

export function ligarAudio(barramento: Barramento, motor: MotorAudio): () => void {
  const desligar = [
    barramento.ouvir('golpe', (d) => {
      tocarSom(motor, 'golpe', grupoDoBloco(d.bloco) ?? 'pedra');
    }),
    barramento.ouvir('quebra', (d) => {
      tocarSom(motor, 'quebra', grupoDoBloco(d.bloco) ?? 'pedra');
    }),
    barramento.ouvir('colocacao', (d) => {
      tocarSom(motor, 'colocar', grupoDoBloco(d.bloco) ?? 'pedra');
    }),
    barramento.ouvir('recusa', () => {
      tocarSom(motor, 'recusa');
    }),
    barramento.ouvir('slot', () => {
      tocarSom(motor, 'troca');
    }),
  ];
  return () => {
    for (const f of desligar) f();
  };
}

type Gesto = 'pointerdown' | 'touchend' | 'click' | 'keydown';
const GESTOS: readonly Gesto[] = ['pointerdown', 'touchend', 'click', 'keydown'];

export interface AlvoGesto {
  addEventListener(tipo: Gesto, ouvinte: () => void): void;
  removeEventListener(tipo: Gesto, ouvinte: () => void): void;
}

/**
 * Ativa o áudio no primeiro gesto. No celular, toque (touchend/click) é o que o
 * navegador aceita como gesto para som; pointerdown e tecla cobrem o desktop.
 */
let preparado: AudioContext | null = null;

/**
 * Cria e destrava o áudio dentro de um toque que vem antes de o mundo existir (o "Entrar" de
 * jogar com amigos, spec 011): o motor usa este contexto depois, sem esperar outro toque.
 * O iPhone só libera o som criado (ou retomado) dentro do próprio gesto.
 */
export function prepararAudioNoGesto(): void {
  if (preparado || typeof AudioContext === 'undefined') return;
  try {
    preparado = new AudioContext();
    void preparado.resume().catch(() => undefined);
    const b = preparado.createBuffer(1, 1, 22050);
    const f = preparado.createBufferSource();
    f.buffer = b;
    f.connect(preparado.destination);
    f.start(0);
  } catch {
    preparado = null;
  }
}

/** O contexto preparado no gesto de entrada, se houver (e se o navegador o liberou). */
export function contextoPreparado(): AudioContext | null {
  return preparado;
}

export function ativarNoPrimeiroGesto(alvo: AlvoGesto, motor: Pick<MotorAudio, 'ativar'>) {
  let usado = false;
  const ouvinte = () => {
    if (usado) return;
    usado = true;
    for (const g of GESTOS) alvo.removeEventListener(g, ouvinte);
    void motor.ativar().catch(() => undefined);
  };
  for (const g of GESTOS) alvo.addEventListener(g, ouvinte);
}

/** Cada toque retoma o contexto se o sistema o suspendeu (tela bloqueada, outra aba, iOS). */
export function manterAudioDesbloqueado(alvo: AlvoGesto, motor: Pick<MotorAudio, 'retomar'>) {
  const ouvinte = () => motor.retomar();
  alvo.addEventListener('touchend', ouvinte);
  alvo.addEventListener('click', ouvinte);
  alvo.addEventListener('pointerdown', ouvinte);
}

export function teclaParaMudo(codigo: string): boolean {
  return codigo === 'KeyM';
}

export function textoIndicador(estado: EstadoAudio, mudo: boolean): string {
  if (estado === 'bloqueado') return 'Som: indisponível';
  if (estado === 'inativo') return 'Som: ativa ao clicar';
  return mudo ? 'Som: mudo' : 'Som: ligado';
}
