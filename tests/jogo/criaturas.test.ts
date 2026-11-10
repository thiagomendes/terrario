import { describe, expect, it } from 'vitest';
import {
  criaturaNaMira,
  ferir,
  novaCriatura,
  passoCriatura,
  type Mundo,
} from '../../src/jogo/criaturas';
import { criarPopulacao } from '../../src/jogo/populacao';
import { criarGerador } from '../../src/audio/variacao';
import type { Solido } from '../../src/player/fisica';

const chao = ((_x: number, y: number) => y < 10) as Solido;
const mundo = (luz = 0, ceu = false): Mundo => ({
  solido: chao,
  agua: () => false,
  luzBloco: () => luz,
  ceuAberto: () => ceu,
});
const jog = (x: number, z: number) => ({ x, y: 10, z, vivo: true, criativo: false });

describe('criaturas', () => {
  it('espectro persegue o jogador no escuro e ataca de perto', () => {
    const e = novaCriatura(1, 'espectro', 0.5, 10, 0.5);
    const rng = criarGerador(1);
    let ataques = 0;
    for (let i = 0; i < 400 && ataques === 0; i++) {
      for (const ev of passoCriatura(e, 1 / 30, mundo(), jog(6.5, 0.5), rng, [], 1))
        if (ev.tipo === 'ataque') ataques++;
    }
    expect(ataques).toBeGreaterThan(0);
    expect(e.x).toBeGreaterThan(4);
  });

  it('espectro foge da luz e se dissolve ao sol', () => {
    const e = novaCriatura(1, 'espectro', 0.5, 10, 0.5);
    const rng = criarGerador(2);
    passoCriatura(e, 0.1, mundo(12), jog(6.5, 0.5), rng, [], 1);
    expect(e.estado).toBe('fugir');
    const d = novaCriatura(2, 'espectro', 0.5, 10, 0.5);
    let morreu = false;
    for (let i = 0; i < 120; i++)
      for (const ev of passoCriatura(d, 0.05, mundo(0, true), jog(40, 40), rng, [], 0))
        if (ev.tipo === 'morte') morreu = true;
    expect(morreu).toBe(true);
  });

  it('espectro que persegue ao amanhecer se desfaz uma vez só e sai do mundo', () => {
    // perseguindo (sobrevivência, jogador perto) e vagando (longe): os dois param ao se desfazer
    for (const [jx, jz] of [
      [3.5, 0.5],
      [60, 60],
    ]) {
      const e = novaCriatura(1, 'espectro', 0.5, 10, 0.5);
      const rng = criarGerador(4);
      let mortes = 0;
      for (let i = 0; i < 200; i++)
        for (const ev of passoCriatura(e, 0.05, mundo(0, true), jog(jx, jz), rng, [], 0))
          if (ev.tipo === 'morte') mortes++;
      expect(mortes).toBe(1);
      expect(e.estado).toBe('morrendo');
      expect(e.dissolver).toBe(1);
    }
  });

  it('a população tira o espectro desfeito pelo dia', () => {
    const pop = criarPopulacao(criarGerador(5));
    const e = pop.adicionar('espectro', 0.5, 10, 0.5);
    const m = {
      ...mundo(0, true),
      bioma: () => 'campos' as const,
      superficie: () => 10,
      nivelMar: 0,
    };
    let mortes = 0;
    for (let i = 0; i < 200 && pop.lista.includes(e); i++)
      for (const ev of pop.atualizar(0.05, m, jog(3.5, 0.5), 0))
        if (ev.tipo === 'morte' && ev.criatura === e) mortes++;
    expect(pop.lista.includes(e)).toBe(false);
    expect(mortes).toBe(1);
  });

  it('cervo foge ao ser ferido e solta carne ao morrer', () => {
    const rng = criarGerador(3);
    const c = novaCriatura(1, 'cervo', 0.5, 10, 0.5);
    expect(ferir(c, 4, rng, 0, -1)[0].tipo).toBe('ferida');
    expect(c.estado).toBe('fugir');
    c.ferida = 0;
    const morte = ferir(c, 99, rng, 0, -1)[0];
    expect(morte.tipo).toBe('morte');
    expect(morte.drops?.[0]?.item).toBe('carne_crua');
  });

  it('mira acerta a criatura mais próxima no raio', () => {
    const a = novaCriatura(1, 'cervo', 0.5, 10, 3);
    const b = novaCriatura(2, 'cervo', 0.5, 10, 6);
    const r = criaturaNaMira([b, a], { x: 0.5, y: 10.8, z: 0 }, { x: 0, y: 0, z: 1 }, 10);
    expect(r?.criatura.id).toBe(1);
    expect(criaturaNaMira([a], { x: 5, y: 10.8, z: 0 }, { x: 0, y: 0, z: 1 }, 10)).toBeNull();
  });

  it('raposa domada segue o jogador e persiste no salvamento', () => {
    const rng = criarGerador(4);
    const p = criarPopulacao(rng);
    const r = p.adicionar('raposa', 0.5, 10, 0.5);
    let domou = false;
    for (let i = 0; i < 20 && !domou; i++) domou = p.domar(r);
    expect(domou).toBe(true);
    for (let i = 0; i < 200; i++) passoCriatura(r, 1 / 30, mundo(), jog(10.5, 0.5), rng, [], 0);
    expect(r.x).toBeGreaterThan(5);
    const salvo = JSON.parse(JSON.stringify(p.salvar()));
    expect(criarPopulacao(rng, salvo).lista[0]).toMatchObject({ tipo: 'raposa', domada: true });
  });
});
