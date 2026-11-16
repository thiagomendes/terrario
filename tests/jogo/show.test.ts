import { describe, expect, it } from 'vitest';
import {
  APLAUSO,
  CHAMADO,
  CONTA_INTRO,
  CONTAGEM,
  DURACAO_SHOW,
  ENTRADA,
  ESPERA_FINAL,
  INTRO,
  PAUSA,
  ROTEIRO,
  SETLIST,
  faseDoShow,
  finalSozinho,
  momentoDoShow,
  momentoFinalSozinho,
} from '../../src/jogo/show';
import {
  PAPEIS_BANDA,
  alturaEm,
  noPalco,
  posturaNaBanda,
  LUGAR,
  COXIA,
} from '../../src/jogo/coreografia';

describe('o Show da Vila: o roteiro do show de verdade (spec 026, 16 nov 2026)', () => {
  const s = { inicio: 100, final: null };

  it('dura de 5 a 6 min: abertura, entrada, três músicas com pausas, o chamado e o fim', () => {
    expect(DURACAO_SHOW).toBeGreaterThan(5 * 60);
    expect(DURACAO_SHOW).toBeLessThan(6 * 60);
    expect(INTRO).toBeGreaterThanOrEqual(15);
    expect(INTRO).toBeLessThanOrEqual(25);
    expect(faseDoShow(s, 100)).toBe('intro');
    expect(faseDoShow(s, 100 + INTRO)).toBe('entrada');
    expect(faseDoShow(s, 100 + INTRO + ENTRADA)).toBe('contagem');
    expect(faseDoShow(s, 100 + CONTAGEM)).toBe('tocando');
    expect(faseDoShow(s, 100 + ROTEIRO[0].fim + 1)).toBe('pausa');
    expect(faseDoShow(s, 100 + ROTEIRO[1].contagem)).toBe('contagem');
    expect(faseDoShow(s, 100 + CHAMADO - 0.01)).toBe('tocando');
    expect(faseDoShow(s, 100 + CHAMADO)).toBe('chamando');
    // a contagem da abertura vem antes do estouro
    expect(CONTA_INTRO).toHaveLength(4);
    expect(Math.max(...CONTA_INTRO)).toBeLessThan(INTRO);
  });

  it('três músicas de 1:20 a 1:40, cada uma com andamento e tom próprios, sem buraco entre elas', () => {
    expect(SETLIST).toHaveLength(3);
    expect(new Set(SETLIST.map((m) => m.bpm)).size).toBe(3);
    expect(new Set(SETLIST.map((m) => m.acordes[0].join())).size).toBe(3);
    ROTEIRO.forEach((r, k) => {
      expect(r.fim - r.inicio).toBeGreaterThan(80);
      expect(r.fim - r.inicio).toBeLessThan(100);
      expect(r.inicio - r.contagem).toBeCloseTo(r.compasso, 9);
      if (k > 0) expect(r.contagem - ROTEIRO[k - 1].fim).toBeCloseTo(PAUSA, 9);
      let fim = r.inicio;
      for (const p of r.partes) {
        expect(p.ini).toBeCloseTo(fim, 9);
        fim = p.ini + p.compassos * r.compasso;
      }
      expect(fim).toBeCloseTo(r.fim, 9);
    });
    // o chamado é a última parte da última música, e o acorde final vem no fim dele
    expect(CHAMADO + ESPERA_FINAL).toBeCloseTo(ROTEIRO[2].fim, 9);
  });

  it('o momento dá a música, a batida e a parte de agora', () => {
    const r = ROTEIRO[1];
    const p = r.partes.find((q) => q.pedaco === 'ponte')!;
    const m = momentoDoShow(s, 100 + p.ini + r.compasso * 2.5);
    expect(m.musica).toBe(1);
    expect(m.pedaco).toBe('ponte');
    expect(m.noPedaco).toBe(2);
    expect(m.segBatida).toBeCloseTo(60 / 140, 9);
    expect(m.batida).toBeCloseTo((p.ini - r.inicio + r.compasso * 2.5) / (60 / 140), 6);
  });

  it('o acorde final vem sozinho no fim do chamado (o show é só para ver)', () => {
    expect(finalSozinho(s, 100 + CHAMADO + ESPERA_FINAL - 0.05)).toBe(false);
    expect(finalSozinho(s, 100 + CHAMADO + ESPERA_FINAL)).toBe(true);
    expect(momentoFinalSozinho(s)).toBeCloseTo(100 + CHAMADO + ESPERA_FINAL, 9);
  });

  it('depois do acorde final vem o fim (a banda sai), e o show acaba', () => {
    const f = { inicio: 100, final: 100 + CHAMADO + 1 };
    expect(faseDoShow(f, f.final + 0.1)).toBe('final');
    expect(faseDoShow(f, f.final + APLAUSO)).toBe('acabou');
  });
});

describe('a coreografia da banda (spec 026)', () => {
  const F = CHAMADO + ESPERA_FINAL;
  it('ninguém pula de lugar: cada um anda no máximo uns 3 blocos por segundo, do começo ao fim', () => {
    for (const papel of PAPEIS_BANDA) {
      const s = { inicio: 0, final: null as number | null };
      let ant = posturaNaBanda(papel, s, 0);
      for (let t = 0.05; t < F + APLAUSO; t += 0.05) {
        s.final = t >= F ? F : null;
        const p = posturaNaBanda(papel, s, t);
        expect(Math.hypot(p.a - ant.a, p.b - ant.b), `${papel} ${t.toFixed(2)}`).toBeLessThan(0.17);
        ant = p;
      }
    }
  });

  it('começa na coxia (no chão), entra pela escadinha e toca no palco; no fim volta para a coxia', () => {
    for (const papel of PAPEIS_BANDA) {
      if (papel === 'roadie') continue;
      const s = { inicio: 0, final: F };
      const ini = posturaNaBanda(papel, { inicio: 0, final: null }, 1);
      expect(ini.altura).toBe(0);
      expect(noPalco(ini.a, ini.b)).toBe(false);
      const toca = posturaNaBanda(papel, { inicio: 0, final: null }, CONTAGEM);
      expect(noPalco(toca.a, toca.b), papel).toBe(true);
      expect(Math.hypot(toca.a - LUGAR[papel][0], toca.b - LUGAR[papel][1]), papel).toBeLessThan(
        0.2,
      );
      const fim = posturaNaBanda(papel, s, F + APLAUSO + 3);
      expect(Math.hypot(fim.a - COXIA[papel][0], fim.b - COXIA[papel][1]), papel).toBeLessThan(2.5);
    }
  });

  it('a altura dos pés: chão, escadinha subindo, tablado e praticável da bateria', () => {
    expect(alturaEm(40, 8)).toBe(0);
    expect(alturaEm(35, 8)).toBeGreaterThan(0.5);
    expect(alturaEm(35, 8)).toBeLessThan(2.5);
    expect(alturaEm(20, 10)).toBe(3);
    expect(alturaEm(17, 17.5)).toBe(4);
    expect(alturaEm(17, 1)).toBe(3);
  });

  it('nas músicas eles se mexem: o vocalista anda de um lado ao outro, a guitarrista vai para a ponta no solo', () => {
    const s = { inicio: 0, final: null };
    const xs = new Set<number>();
    const r = ROTEIRO[0];
    for (let t = r.inicio; t < r.fim; t += 1)
      xs.add(Math.round(posturaNaBanda('vocalista', s, t).a));
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(12);
    const solo = r.partes.find((p) => p.pedaco === 'solo')!;
    const g = posturaNaBanda('guitarrista', s, solo.ini + 4);
    expect(g.acao).toBe('solo');
    expect(g.b).toBeLessThan(3);
    // na ponte da segunda, guitarrista e baixista de costas uma para a outra
    const ponte = ROTEIRO[1].partes.find((p) => p.pedaco === 'ponte')!;
    const a = posturaNaBanda('guitarrista', s, ponte.ini + 6);
    const b = posturaNaBanda('baixista', s, ponte.ini + 6);
    expect(Math.hypot(a.a - b.a, a.b - b.b)).toBeLessThan(1.6);
    expect(Math.sign(Math.sin(a.giro))).toBe(-Math.sign(Math.sin(b.giro)));
    // o baterista toca sentado
    expect(posturaNaBanda('baterista', s, r.inicio + 10).acao).toBe('bateria');
  });
});

describe('a noite dos bichos: passarinho não canta de noite (o dono, 15 nov 2026)', () => {
  it('quando a noite do show abre, só grilo; de dia, passarinho; no amanhecer, eles voltam', async () => {
    const { noiteDosBichos, noiteNaHora } = await import('../../src/jogo/tempo');
    const { noiteDeShow } = await import('../../src/jogo/show');
    // a primeira hora de show já é noite fechada para os bichos (a do sol ainda é dia)
    let abre = 0.6;
    while (!noiteDeShow(abre)) abre += 0.001;
    expect(noiteNaHora(abre)).toBe(0);
    expect(noiteDosBichos(abre)).toBe(1);
    // e a noite inteira de show também
    for (let h = abre; h < abre + 0.45; h += 0.005)
      if (noiteDeShow(h)) expect(noiteDosBichos(h)).toBe(1);
    // de dia, passarinho
    for (const h of [0.3, 0.42, 0.5, 0.6]) expect(noiteDosBichos(h)).toBe(0);
    // no amanhecer, como o sol (os passarinhos acordam com a luz)
    for (const h of [0.2, 0.23, 0.26]) expect(noiteDosBichos(h)).toBe(noiteNaHora(h));
  });
});
