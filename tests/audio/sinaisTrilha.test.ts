import { describe, expect, it } from 'vitest';
import {
  FUNDO_CAVERNA,
  SinaisTrilha,
  cavernaDeVerdade,
  estadoBruto,
  horaDaTrilha,
  type EntradaSinais,
} from '../../src/audio/sinaisTrilha';

const ent = (p: Partial<EntradaSinais> = {}): EntradaSinais => ({
  noite: 0,
  crepusculo: 0,
  hora: 0.5,
  chuva: 0,
  chuvaMolha: true,
  coberto: false,
  y: 70,
  superficie: 68,
  perigo: false,
  velocidade: 0,
  correndo: false,
  amigosPerto: false,
  lavouraPerto: false,
  bioma: 'campos',
  ...p,
});

describe('sinais da trilha', () => {
  it('hora: noite, entardecer (só à tarde) e dia', () => {
    expect(horaDaTrilha(0.9, 0, 0.9)).toBe('noite');
    expect(horaDaTrilha(0.2, 0.8, 0.74)).toBe('tarde');
    // o crepúsculo da manhã é dia
    expect(horaDaTrilha(0.2, 0.8, 0.26)).toBe('dia');
    expect(horaDaTrilha(0, 0, 0.5)).toBe('dia');
  });

  it('caverna só coberto e abaixo do chão (dentro de casa não é caverna)', () => {
    // casa no chão: teto acima, mas o olho está acima da superfície
    expect(cavernaDeVerdade(true, 70, 68)).toBe(false);
    // debaixo da copa ou da varanda, idem
    expect(cavernaDeVerdade(true, 66, 66)).toBe(false);
    // num buraco ou caverna, abaixo do chão
    expect(cavernaDeVerdade(true, 68 - FUNDO_CAVERNA - 1, 68)).toBe(true);
    // túnel dentro da montanha, bem acima de y 55 (antes não contava)
    expect(cavernaDeVerdade(true, 90, 110)).toBe(true);
    // fundo de um barranco a céu aberto
    expect(cavernaDeVerdade(false, 40, 68)).toBe(false);
  });

  it('o bioma não apaga a noite; a poeira da Lua não é chuva', () => {
    const b = estadoBruto(ent({ noite: 1, bioma: 'deserto' }));
    expect(b.hora).toBe('noite');
    expect(b.bioma).toBe('deserto');
    expect(estadoBruto(ent({ chuva: 1, chuvaMolha: false })).chuva).toBe(0);
    expect(estadoBruto(ent({ chuva: 0.3 })).chuva).toBe(0.5);
    expect(estadoBruto(ent({ chuva: 0.9 })).chuva).toBe(1);
    expect(estadoBruto(ent({ bioma: 'floresta' })).bioma).toBe('normal');
  });

  it('andar e correr', () => {
    expect(estadoBruto(ent({ velocidade: 0.3 })).mov).toBe(0);
    expect(estadoBruto(ent({ velocidade: 3 })).mov).toBe(1);
    expect(estadoBruto(ent({ velocidade: 6, correndo: true })).mov).toBe(2);
  });

  it('segura cada sinal antes de valer: tropeço não troca a música', () => {
    const s = new SinaisTrilha();
    expect(s.atualizar(0.016, ent()).mov).toBe(0);
    // andou 0,3 s e parou: não vale
    for (let t = 0; t < 0.3; t += 0.05) s.atualizar(0.05, ent({ velocidade: 3 }));
    expect(s.atualizar(0.05, ent()).mov).toBe(0);
    // andou de verdade
    let mov = 0;
    for (let t = 0; t < 1; t += 0.05) mov = s.atualizar(0.05, ent({ velocidade: 3 })).mov;
    expect(mov).toBe(1);
    // o perigo entra na hora e demora a sair
    expect(s.atualizar(0.05, ent({ velocidade: 3, perigo: true })).perigo).toBe(true);
    for (let t = 0; t < 3; t += 0.1)
      expect(s.atualizar(0.1, ent({ velocidade: 3 })).perigo).toBe(true);
    let p = true;
    for (let t = 0; t < 1.5; t += 0.1) p = s.atualizar(0.1, ent({ velocidade: 3 })).perigo;
    expect(p).toBe(false);
  });
});
