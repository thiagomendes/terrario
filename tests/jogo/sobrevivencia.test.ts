import { describe, expect, it } from 'vitest';
import {
  AR_MAX,
  FOME_MAX,
  VIDA_MAX,
  criarSobrevivencia,
  danoDeQueda,
} from '../../src/jogo/sobrevivencia';
import { passoFisica, criarJogador, VEL_VOO } from '../../src/player/fisica';

const parado = { correndo: false, andando: false, submerso: false };

function rodar(s: ReturnType<typeof criarSobrevivencia>, segundos: number, a = parado) {
  for (let t = 0; t < segundos; t += 0.1) s.atualizar(0.1, a);
}

describe('sobrevivência', () => {
  it('queda: até 3 blocos não machuca, depois 1 por bloco', () => {
    expect(danoDeQueda(3)).toBe(0);
    expect(danoDeQueda(3.9)).toBe(0);
    expect(danoDeQueda(7.2)).toBe(4);
    const s = criarSobrevivencia();
    expect(s.queda(10)).toBe(7);
    expect(s.estado.vida).toBe(VIDA_MAX - 7);
  });

  it('invulnerabilidade curta evita dano em sequência', () => {
    const s = criarSobrevivencia();
    expect(s.dano(3, 'criatura')).toBe(3);
    expect(s.dano(3, 'criatura')).toBe(0);
    rodar(s, 0.6);
    expect(s.dano(3, 'criatura')).toBe(3);
  });

  it('regenera com fome alta e morre ao zerar a vida', () => {
    const s = criarSobrevivencia();
    s.dano(5, 'outro');
    rodar(s, 7);
    expect(s.estado.vida).toBeGreaterThan(VIDA_MAX - 5);
    const eventos: string[] = [];
    s.ouvir((e) => eventos.push(e.tipo));
    rodar(s, 1);
    s.dano(100, 'queda');
    expect(s.estado.morto).toBe(true);
    expect(s.estado.causa).toBe('queda');
    expect(eventos).toContain('morte');
    s.renascer();
    expect(s.estado).toMatchObject({ vida: VIDA_MAX, fome: FOME_MAX, morto: false });
  });

  it('correr esvazia a fome mais rápido que ficar parado', () => {
    const a = criarSobrevivencia();
    const b = criarSobrevivencia();
    rodar(a, 300, { correndo: true, andando: true, submerso: false });
    rodar(b, 300);
    expect(a.estado.fome).toBeLessThan(b.estado.fome);
  });

  it('o relógio cansa: parado, a saturação cai 1 a cada 200 s, antes da fome', () => {
    // spec 034: a paridade desliga este cansaço (a duração da sessão varia com a máquina); a
    // regra do jogo fica conferida aqui
    const s = criarSobrevivencia();
    const sat0 = s.estado.saturacao;
    expect(sat0).toBeGreaterThan(1);
    for (let i = 0; i < 1990; i++) s.atualizar(0.1, parado);
    expect(s.estado.saturacao).toBe(sat0);
    for (let i = 0; i < 20; i++) s.atualizar(0.1, parado);
    expect(s.estado.saturacao).toBe(sat0 - 1);
    expect(s.estado.fome).toBe(FOME_MAX);
    // andando cansa mais que parado, e correndo mais ainda
    const andando = criarSobrevivencia();
    const correndo = criarSobrevivencia();
    // 81 s: 4,05 de exaustão andando, 20,25 correndo
    for (let i = 0; i < 810; i++) {
      andando.atualizar(0.1, { ...parado, andando: true });
      correndo.atualizar(0.1, { ...parado, andando: true, correndo: true });
    }
    expect(andando.estado.saturacao).toBe(sat0 - 1);
    expect(correndo.estado.saturacao).toBeLessThan(andando.estado.saturacao);
  });

  it('sem o cansaço do relógio (atalho da paridade), só pulos e golpes cansam', () => {
    const s = criarSobrevivencia();
    const sat0 = s.estado.saturacao;
    for (let i = 0; i < 6000; i++)
      s.atualizar(0.1, { correndo: true, andando: true, submerso: false, relogioCansa: false });
    expect(s.estado.saturacao).toBe(sat0);
    expect(s.estado.exaustao).toBe(0);
    // 6 pulos correndo = 4,8 de exaustão: a saturação cai 1
    for (let i = 0; i < 6; i++) s.pulo(true);
    expect(s.estado.saturacao).toBe(sat0 - 1);
  });

  it('debaixo d’água o ar acaba e começa o afogamento; fora, o ar volta', () => {
    const s = criarSobrevivencia();
    rodar(s, AR_MAX + 3, { correndo: false, andando: false, submerso: true });
    expect(s.estado.ar).toBe(0);
    expect(s.estado.vida).toBeLessThan(VIDA_MAX);
    rodar(s, 4);
    expect(s.estado.ar).toBe(AR_MAX);
  });

  it('comer só com fome e respeita o máximo', () => {
    const s = criarSobrevivencia({ fome: 10 });
    expect(s.comer(6, 4)).toBe(true);
    expect(s.estado.fome).toBe(16);
    expect(s.comer(10, 10)).toBe(true);
    expect(s.estado.fome).toBe(FOME_MAX);
    expect(s.comer(1, 1)).toBe(false);
  });

  it('carrega salvo com limites e nunca nasce morto', () => {
    expect(criarSobrevivencia({ vida: 0, fome: 99 }).estado).toMatchObject({
      vida: VIDA_MAX,
      fome: FOME_MAX,
    });
  });
});

describe('física: voo e queda', () => {
  const chao = (_x: number, y: number) => y < 10;
  it('mede a altura da queda ao aterrissar', () => {
    const j = criarJogador(0.5, 20, 0.5);
    let r = { aterrissou: false, queda: 0 };
    for (let i = 0; i < 200 && !r.aterrissou; i++) {
      r = passoFisica(
        j,
        { frente: 0, direita: 0, pular: false, correr: false, yaw: 0 },
        1 / 60,
        chao,
      );
    }
    expect(r.aterrissou).toBe(true);
    expect(r.queda).toBeCloseTo(10, 0);
  });

  it('voando não cai, sobe com pular e anda mais rápido', () => {
    const j = criarJogador(0.5, 20, 0.5);
    j.voando = true;
    for (let i = 0; i < 60; i++) {
      passoFisica(j, { frente: 1, direita: 0, pular: false, correr: false, yaw: 0 }, 1 / 60, chao);
    }
    expect(j.y).toBe(20);
    expect(j.z).toBeCloseTo(0.5 + VEL_VOO, 1);
    passoFisica(j, { frente: 0, direita: 0, pular: true, correr: false, yaw: 0 }, 0.1, chao);
    expect(j.y).toBeGreaterThan(20);
  });
});

describe('física: água', () => {
  const s = ((_x: number, y: number) => y < 5) as import('../../src/player/fisica').Solido;
  s.liquido = (_x, y) => y >= 5 && y < 12;
  it('afunda devagar, nada para cima com espaço e não leva dano de queda', () => {
    const j = criarJogador(0.5, 11, 0.5);
    for (let i = 0; i < 30; i++)
      passoFisica(j, { frente: 0, direita: 0, pular: false, correr: false, yaw: 0 }, 1 / 60, s);
    expect(j.naAgua).toBe(true);
    expect(j.vy).toBeGreaterThanOrEqual(-2.2);
    const y0 = j.y;
    for (let i = 0; i < 30; i++)
      passoFisica(j, { frente: 0, direita: 0, pular: true, correr: false, yaw: 0 }, 1 / 60, s);
    expect(j.y).toBeGreaterThan(y0);
    expect(j.topoQueda).toBeUndefined();
  });
});
