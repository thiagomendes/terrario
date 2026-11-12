import { describe, expect, it } from 'vitest';
import { tamanhoDoCanvas, type MedidasJanela } from '../../src/ui/telaCheia';

/** iPhone 14 Plus (428×926) aberto pelo ícone: a janela veio 47 px mais baixa. */
const APP_CURTO: MedidasJanela = {
  innerWidth: 428,
  innerHeight: 879,
  clientWidth: 428,
  clientHeight: 879,
  vvWidth: 428,
  vvHeight: 879,
  screenWidth: 428,
  screenHeight: 926,
  app: true,
};

describe('tamanho do canvas (faixa azul no app do iPhone)', () => {
  it('como app, cobre a tela toda mesmo com a janela curta', () => {
    expect(tamanhoDoCanvas(APP_CURTO)).toEqual({ largura: 428, altura: 926 });
  });

  it('deitado, usa a tela deitada', () => {
    const m = {
      ...APP_CURTO,
      innerWidth: 926,
      clientWidth: 926,
      vvWidth: 926,
      innerHeight: 400,
      clientHeight: 400,
      vvHeight: 400,
    };
    expect(tamanhoDoCanvas(m)).toEqual({ largura: 926, altura: 428 });
  });

  it('no navegador segue a janela (sem passar da barra do Safari)', () => {
    expect(tamanhoDoCanvas({ ...APP_CURTO, app: false })).toEqual({ largura: 428, altura: 879 });
  });

  it('janela dividida (bem menor que a tela) não estica', () => {
    const m = { ...APP_CURTO, innerHeight: 500, clientHeight: 500, vvHeight: 500 };
    expect(tamanhoDoCanvas(m).altura).toBe(500);
  });
});
