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

export interface AlvoGesto {
  addEventListener(tipo: 'pointerdown' | 'keydown', ouvinte: () => void): void;
  removeEventListener(tipo: 'pointerdown' | 'keydown', ouvinte: () => void): void;
}

export function ativarNoPrimeiroGesto(alvo: AlvoGesto, motor: Pick<MotorAudio, 'ativar'>) {
  let usado = false;
  const ouvinte = () => {
    if (usado) return;
    usado = true;
    alvo.removeEventListener('pointerdown', ouvinte);
    alvo.removeEventListener('keydown', ouvinte);
    void motor.ativar().catch(() => undefined);
  };
  alvo.addEventListener('pointerdown', ouvinte);
  alvo.addEventListener('keydown', ouvinte);
}

export function teclaParaMudo(codigo: string): boolean {
  return codigo === 'KeyM';
}

export function textoIndicador(estado: EstadoAudio, mudo: boolean): string {
  if (estado === 'bloqueado') return 'Som: indisponível';
  if (estado === 'inativo') return 'Som: ativa ao clicar';
  return mudo ? 'Som: mudo' : 'Som: ligado';
}
