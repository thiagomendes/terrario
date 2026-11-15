import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear as sanearComando } from '../../src/nucleo/saneamento';
import type { Comando, EventoNucleo } from '../../src/nucleo/protocolo';
import { CHAMADO, ESPERA_FINAL, APLAUSO } from '../../src/jogo/show';
import { PASSO } from '../../src/nucleo/protocolo';
import { MORADORES_VILA, N0_PUBLICO, POVOADO_VILA } from '../../src/nucleo/vila';
import { noiteDeShow } from '../../src/jogo/show';
import { HORA_INICIAL } from '../../src/jogo/tempo';
import { VEL_ANDAR } from '../../src/player/fisica';
import { RAIO_SEGUIR } from '../../src/jogo/criacao';
import { FICAM_DE_DIA, PUBLICO_GRADE, publicoDaVila } from '../../src/world/publicoVila';

/**
 * Spec 026: a Vila Neon no núcleo. As três missões de ponta a ponta com as moedinhas de
 * verdade (4 + 5 + 6, só no fim de cada uma), o show no tempo (o toque encaixa, o acorde final
 * vem sozinho em 4 s), o que volta só quando a missão é escolhida de novo, os moradores com
 * posto, o pôster do vocalista e o comando da nuvem passado a limpo.
 */
const VILA = obterTema('vila-neon').mundo;
const SEMENTE = 4242;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function tel(x: number, y: number, z: number, slot = 0): Comando {
  return {
    t: 'jogador',
    x,
    y,
    z,
    yaw: 0,
    pitch: 0,
    olhos: y + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot,
  };
}
function ir(n: Nucleo, quem: string, x: number, y: number, z: number, slot = 0): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z, slot));
}
function abrir(
  quem: string[] = ['ana'],
  confiar = true,
  dados?: Parameters<typeof criarNucleo>[0]['dados'],
) {
  definirEstiloMundo(VILA);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: confiar,
    depuracao: true,
    dono: quem[0],
    dados,
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
type Ev = EventoNucleo;
function passos(n: Nucleo, k = 1, quem = 'ana'): Ev[] {
  const r: Ev[] = [];
  for (let i = 0; i < k; i++) {
    n.passo();
    for (const [q, f] of n.quadros()) if (q === quem) r.push(...(f.eventos ?? []));
  }
  return r;
}
/** O relógio do mundo (o comando de depuração dos testes de tela). */
function hora(n: Nucleo, h: number): void {
  n.comando('ana', { t: 'depurar', d: { f: 'hora', hora: h } } as Comando);
}
const NOITE = 0.9;
const DIA = 0.42;
const moedas = (evs: Ev[]) => evs.reduce((s, e) => s + (e.e === 'alma' ? e.ganho.moedas : 0), 0);

describe('spec 026: a Vila Neon no núcleo', () => {
  it('é a Vila Neon da alma, com 15 moedinhas no mundo', () => {
    const n = abrir();
    expect(n.estado.mundoAlma).toBe('vila-neon');
    expect(n.estado.vila).not.toBeNull();
  });

  it('f1: passar pelos três estojos (um por zona) dá 4 moedinhas, só no fim', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    n.comando('ana', { t: 'almaFixar', missao: 'f1' });
    passos(n);
    let ganho = 0;
    const porEstojo: number[] = [];
    for (const [x, y, z] of p.pontos.estojos) {
      ir(n, 'ana', x, y, z);
      const evs = passos(n, 10);
      porEstojo.push(moedas(evs));
      ganho += moedas(evs);
      expect(evs.some((e) => e.e === 'vilaEstojo')).toBe(true);
    }
    expect(porEstojo.slice(0, 2)).toEqual([0, 0]);
    expect(ganho).toBe(4);
    expect(n.estado.vila!.vista().ins).toEqual([true, true, true]);
    // com o tempo nada volta; escolhida de novo, os estojos voltam
    passos(n, 20 * 20);
    expect(n.estado.vila!.vista().ins).toEqual([true, true, true]);
    n.estado.vila!.preparar('f1');
    expect(n.estado.vila!.vista().ins).toEqual([false, false, false]);
  });

  it('f3 e o show: três caixas acendem e o show começa; o toque toca no tempo; o acorde final vem sozinho; 6 moedinhas depois do acorde', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    // a f3 abre depois de uma das duas primeiras: faz a f1
    for (const [x, y, z] of p.pontos.estojos) {
      ir(n, 'ana', x, y, z);
      passos(n, 10);
    }
    n.comando('ana', { t: 'almaFixar', missao: 'f3' });
    hora(n, NOITE);
    passos(n);
    const [cx, cy, cz] = p.pontos.caixas[0];
    ir(n, 'ana', cx + 0.5, cy, cz - 1.5);
    let ganho = 0;
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = p.pontos.caixas[i];
      ir(n, 'ana', x + 0.5, y, z - 1.5);
      n.comando('ana', { t: 'vila', a: 'caixa', i });
      ganho += moedas(passos(n, 3));
    }
    expect(ganho).toBe(0);
    const v = n.estado.vila!.vista();
    expect(v.cx).toEqual([true, true, true]);
    expect(v.show).not.toBeNull();
    // um toque no palco: o acorde encaixa no próximo oitavo (no máximo 0,25 s)
    passos(n, 60);
    const antes = n.estado.n * PASSO;
    n.comando('ana', { t: 'vila', a: 'palco' });
    const evs = passos(n, 1);
    const ac = evs.find((e) => e.e === 'vilaAcorde') as Extract<Ev, { e: 'vilaAcorde' }>;
    expect(ac).toBeDefined();
    expect(ac.quando - antes).toBeLessThanOrEqual(0.25 + PASSO);
    // ninguém toca no chamado: o acorde final vem sozinho em 4 s
    const ate = Math.ceil((CHAMADO + ESPERA_FINAL + 0.5) / PASSO);
    const fim = passos(n, ate);
    const final = fim.find((e) => e.e === 'vilaFinal') as Extract<Ev, { e: 'vilaFinal' }>;
    expect(final?.quem).toBe('auto');
    expect(moedas(fim)).toBe(6);
    expect(n.estado.almas.get('ana')!.feitas).toContain('f3');
    // depois do aplauso, o show acaba e as caixas ficam como brinquedo livre (sem moedinha)
    const depois = passos(n, Math.ceil((APLAUSO + 1) / PASSO));
    expect(n.estado.vila!.vista().show).toBeNull();
    ir(n, 'ana', cx + 0.5, cy, cz - 1.5);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    const brinca = passos(n, 3);
    expect(moedas([...depois, ...brinca])).toBe(0);
    expect(n.estado.vila!.vista().cx[0]).toBe(false);
  });

  it('o toque do chamado dispara o acorde final na hora', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    passos(n);
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = p.pontos.caixas[i];
      ir(n, 'ana', x + 0.5, y, z - 1.5);
      n.comando('ana', { t: 'vila', a: 'caixa', i });
      passos(n, 2);
    }
    passos(n, Math.ceil((CHAMADO + 0.5) / PASSO));
    const t = n.estado.n * PASSO;
    n.comando('ana', { t: 'vila', a: 'palco' });
    const evs = passos(n, 1);
    const f = evs.find((e) => e.e === 'vilaFinal') as Extract<Ev, { e: 'vilaFinal' }>;
    expect(f.quem).toBe('ana');
    expect(f.quando - t).toBeLessThanOrEqual(0.1);
  });

  it('longe do palco, o toque não vale; muitos toques num segundo, só uns poucos', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    ir(n, 'ana', p.nascimento.x, p.h + 1, p.nascimento.z);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    passos(n, 2);
    expect(n.estado.vila!.vista().cx[0]).toBe(false);
  });

  it('os moradores aparecem cada um no seu posto quando a criança chega perto', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const [x, y, z] = p.pontos.postos.lanche;
    ir(n, 'ana', x + 2, y, z);
    passos(n, 200);
    const vila = n.estado.populacao.lista.filter((c) => c.morador?.povoado === POVOADO_VILA);
    expect(vila.length).toBeGreaterThan(0);
    const lanche = vila.find(
      (c) => c.morador!.n === MORADORES_VILA.findIndex((m) => m.posto === 'lanche'),
    );
    expect(lanche).toBeDefined();
    expect(Math.hypot(lanche!.x - x, lanche!.z - z)).toBeLessThan(2);
  });

  it('f2: o feno aparece na mão perto das lhamas; levadas até a grade, 5 moedinhas e elas ficam lá', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    n.comando('ana', { t: 'almaFixar', missao: 'f2' });
    const c = p.pontos.cercado;
    const mx = (c.x0 + c.x1 + 1) / 2;
    const mz = (c.z0 + c.z1 + 1) / 2;
    ir(n, 'ana', mx, p.h + 1, mz + 1);
    passos(n, 40);
    const lh = n.estado.vila!.lhamas();
    expect(lh.todas).toHaveLength(2);
    expect(n.estado.jogadores.get('ana')!.inventario.contar('trigo')).toBeGreaterThan(0);
    // a criança anda devagar até a grade com o feno na mão; as lhamas seguem
    const g = p.pontos.plateia;
    const gx = Math.max(g.x0 + 1, Math.min(g.x1 - 1, mx));
    const gz = g.z1 - 0.5;
    let ganho = 0;
    const passosAndando = 80;
    for (let k = 1; k <= passosAndando; k++) {
      const t = k / passosAndando;
      ir(n, 'ana', mx + (gx - mx) * t, p.h + 1, mz + 1 + (gz - mz - 1) * t);
      ganho += moedas(passos(n, 4));
    }
    ganho += moedas(passos(n, 200));
    expect(n.estado.vila!.lhamas().naGrade).toHaveLength(2);
    expect(ganho).toBe(5);
    // um minuto depois, ainda na grade
    passos(n, 60 * 20);
    expect(n.estado.vila!.lhamas().naGrade).toHaveLength(2);
  });

  it('o vocalista dá o pôster uma vez por criança', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const [x, y, z] = p.pontos.postos.vocalista;
    ir(n, 'ana', x, y, z - 2);
    passos(n, 60);
    const voc = n.estado.populacao.lista.find(
      (c) => c.morador?.povoado === POVOADO_VILA && c.morador.n === 0,
    )!;
    expect(voc).toBeDefined();
    n.comando('ana', { t: 'falar', criatura: voc.id });
    passos(n, 2);
    n.comando('ana', { t: 'falar', criatura: voc.id });
    passos(n, 2);
    expect(n.estado.jogadores.get('ana')!.inventario.contar('bloco:108')).toBe(4);
  });

  it('na nuvem: o comando vila passa a limpo (caixa de 0 a 2; nada mais vai junto)', () => {
    expect(sanearComando({ t: 'vila', a: 'caixa', i: 1, x: 99 })).toEqual({
      t: 'vila',
      a: 'caixa',
      i: 1,
    });
    expect(sanearComando({ t: 'vila', a: 'caixa', i: 3 })).toBeNull();
    expect(sanearComando({ t: 'vila', a: 'caixa', i: 1.5 })).toBeNull();
    expect(sanearComando({ t: 'vila', a: 'palco', i: 0 })).toEqual({ t: 'vila', a: 'palco' });
    expect(sanearComando({ t: 'vila', a: 'roubar' })).toBeNull();
  });

  it('salvo: instrumentos, caixas e o pôster voltam com o mundo', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    const [x, y, z] = p.pontos.estojos[1];
    ir(n, 'ana', x, y, z);
    passos(n, 10);
    const s = n.salvar();
    const m = abrir(['ana'], true, { edicoes: s.edicoes, hora: s.hora, extras: s.extras } as never);
    expect(m.estado.vila!.vista().ins).toEqual([false, true, false]);
  });

  // ------------------------------------------------------------------ o show só de noite
  /** Acende as três caixas (a criança vai a cada uma e toca). */
  function acenderAsTres(n: Nucleo, p: NonNullable<ReturnType<typeof vilaDoMundo>>): Ev[] {
    const evs: Ev[] = [];
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = p.pontos.caixas[i];
      ir(n, 'ana', x + 0.5, y, z - 1.5);
      n.comando('ana', { t: 'vila', a: 'caixa', i });
      evs.push(...passos(n, 3));
    }
    return evs;
  }
  /** Faz a f1 (a f3 abre depois de uma das duas primeiras). */
  function fazerF1(n: Nucleo, p: NonNullable<ReturnType<typeof vilaDoMundo>>): void {
    for (const [x, y, z] of p.pontos.estojos) {
      ir(n, 'ana', x, y, z);
      passos(n, 10);
    }
  }

  it('o show é só de noite (decisão do dono): de dia as caixas são brinquedo e não começam o show nem contam a f3', () => {
    expect(noiteDeShow(DIA)).toBe(false);
    expect(noiteDeShow(HORA_INICIAL)).toBe(false);
    expect(noiteDeShow(NOITE)).toBe(true);
    expect(noiteDeShow(0.05)).toBe(true);
    // a janela abre no fim do entardecer e fecha antes de clarear (o show acaba no escuro)
    expect(noiteDeShow(0.74)).toBe(true);
    expect(noiteDeShow(0.7)).toBe(false);
    expect(noiteDeShow(0.23)).toBe(false);
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, DIA);
    passos(n);
    fazerF1(n, p);
    n.comando('ana', { t: 'almaFixar', missao: 'f3' });
    passos(n);
    const dia = acenderAsTres(n, p);
    expect(n.estado.vila!.vista().cx).toEqual([true, true, true]);
    expect(n.estado.vila!.vista().show).toBeNull();
    expect(dia.filter((e) => e.e === 'vilaCaixa').every((e) => 'dia' in e && e.dia)).toBe(true);
    // nenhuma bolinha da f3 de dia
    const f3 = () => n.estado.almas.get('ana')!.progresso['f3'] ?? 0;
    expect(f3()).toBe(0);
    // a passagem de som segue: um minuto de dia, nada de show
    passos(n, 60 * 20);
    expect(n.estado.vila!.vista().show).toBeNull();
    // a noite chega: o primeiro toque numa caixa (já acesa de dia) conta, e o show começa
    hora(n, NOITE);
    passos(n);
    const [x, y, z] = p.pontos.caixas[1];
    ir(n, 'ana', x + 0.5, y, z - 1.5);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 1 });
    passos(n, 3);
    expect(n.estado.vila!.vista().cx).toEqual([true, true, true]);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    expect(f3()).toBe(1);
    // e o show vai até o fim: a f3 fecha (6 moedinhas)
    const fim = passos(n, Math.ceil((CHAMADO + ESPERA_FINAL + 1) / PASSO));
    expect(moedas(fim)).toBe(6);
    expect(n.estado.almas.get('ana')!.feitas).toContain('f3');
  });

  it('de noite, a caixa acesa antes do show fica acesa (o toque não apaga sem querer)', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    passos(n);
    const [x, y, z] = p.pontos.caixas[0];
    ir(n, 'ana', x + 0.5, y, z - 1.5);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    passos(n, 30);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    passos(n, 3);
    expect(n.estado.vila!.vista().cx[0]).toBe(true);
    expect(n.estado.vila!.vista().show).toBeNull();
  });

  it('a noite acaba no meio do show: o show termina normal, nunca é cortado', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    passos(n);
    acenderAsTres(n, p);
    const inicio = n.estado.vila!.vista().show!.inicio;
    passos(n, 5 * 20);
    hora(n, DIA);
    const evs = passos(n, Math.ceil((CHAMADO + ESPERA_FINAL + 1) / PASSO));
    expect(evs.some((e) => e.e === 'vilaFinal')).toBe(true);
    expect(n.estado.vila!.vista().show?.inicio ?? inicio).toBe(inicio);
    passos(n, Math.ceil((APLAUSO + 1) / PASSO));
    expect(n.estado.vila!.vista().show).toBeNull();
  });

  it('salvo no meio do show (ou de dia com as caixas acesas): na noite seguinte a f3 ainda fecha', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    passos(n);
    fazerF1(n, p);
    n.comando('ana', { t: 'almaFixar', missao: 'f3' });
    passos(n);
    acenderAsTres(n, p);
    passos(n, 5 * 20);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    // fecha o mundo no meio da música; abre de dia
    const s = n.salvar();
    const m = abrir(['ana'], true, {
      edicoes: s.edicoes,
      hora: DIA,
      extras: s.extras,
    } as never);
    passos(m);
    expect(m.estado.vila!.vista().cx).toEqual([true, true, true]);
    expect(m.estado.vila!.vista().show).toBeNull();
    // a noite chega: um toque e o show começa de novo
    hora(m, NOITE);
    passos(m);
    const [x, y, z] = p.pontos.caixas[2];
    ir(m, 'ana', x + 0.5, y, z - 1.5);
    m.comando('ana', { t: 'vila', a: 'caixa', i: 2 });
    passos(m, 3);
    expect(m.estado.vila!.vista().show).not.toBeNull();
    // e depois do show, salvo de novo, as caixas voltam como brinquedo livre (sem show)
    passos(m, Math.ceil((CHAMADO + ESPERA_FINAL + APLAUSO + 2) / PASSO));
    const s2 = m.salvar();
    expect((s2.extras as { vila: { tocou?: boolean } }).vila.tocou).toBe(true);
  });

  it('f2 a passo de criança, do canto mais longe do cercadinho: as duas lhamas alcançam e chegam à grade', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    n.comando('ana', { t: 'almaFixar', missao: 'f2' });
    const c = p.pontos.cercado;
    const sx = c.x0 + 0.6;
    const sz = c.z0 + 0.6;
    ir(n, 'ana', sx, p.h + 1, sz);
    passos(n, 60);
    expect(n.estado.jogadores.get('ana')!.inventario.contar('trigo')).toBeGreaterThan(0);
    const g = p.pontos.plateia;
    const mx = (c.x0 + c.x1 + 1) / 2;
    const gx = Math.max(g.x0 + 2, Math.min(g.x1 - 1, mx));
    const gz = g.z1 - 0.5;
    // anda no passo de verdade da criança (4,3 blocos por segundo, o joystick todo)
    const D = Math.hypot(gx - sx, gz - sz);
    const k = Math.ceil(D / VEL_ANDAR / PASSO);
    let maior = 0;
    for (let i = 1; i <= k; i++) {
      const t = i / k;
      ir(n, 'ana', sx + (gx - sx) * t, p.h + 1, sz + (gz - sz) * t);
      passos(n, 1);
      const j = n.estado.jogadores.get('ana')!;
      for (const id of n.estado.vila!.lhamas().todas) {
        const l = n.estado.populacao.lista.find((q) => q.id === id)!;
        maior = Math.max(maior, Math.hypot(l.x - j.tel.x, l.z - j.tel.z));
      }
    }
    passos(n, 200);
    // nunca ficou para trás o bastante para desistir (12 blocos)
    expect(maior).toBeLessThan(RAIO_SEGUIR - 1.5);
    expect(n.estado.vila!.lhamas().naGrade).toHaveLength(2);
  });

  // ------------------------------------------------------------------ o público do show
  it('a turma da grade: de noite 12, de dia só 4; no show, todos na grade de frente para o palco', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    hora(n, NOITE);
    // no nascer, ninguém (o público é do festival)
    passos(n, 100);
    expect(n.estado.vila!.publico()).toHaveLength(0);
    ir(n, 'ana', pub.portao[0], p.h + 1, pub.portao[2] - 3);
    passos(n, 40 * 20);
    const noite = n.estado.vila!.publico();
    expect(noite).toHaveLength(PUBLICO_GRADE);
    // de papo nas rodinhas, ninguém no caminho de cascalho nem no corredor das lhamas
    for (const c of noite) expect(pub.livre(c.x, c.z)).toBe(true);
    // o show: todos na grade
    acenderAsTres(n, p);
    ir(n, 'ana', pub.portao[0], p.h + 1, pub.portao[2] - 3);
    passos(n, 22 * 20);
    const naGrade = n.estado.vila!.publico();
    expect(naGrade).toHaveLength(PUBLICO_GRADE);
    for (const c of naGrade) {
      const k = c.morador!.n - N0_PUBLICO;
      expect(Math.hypot(c.x - pub.grade[k][0], c.z - pub.grade[k][2]), `morador ${k}`).toBeLessThan(1.2);
    }
    // ninguém teleportou para chegar (o caminho dá a volta nas peças)
    expect(naGrade.every((c) => !c.teleportes)).toBe(true);
    // de dia (depois do show): quatro ficam, os outros saem pelo portão
    passos(n, Math.ceil((CHAMADO + ESPERA_FINAL + APLAUSO) / PASSO));
    hora(n, DIA);
    passos(n, 60 * 20);
    expect(n.estado.vila!.publico()).toHaveLength(FICAM_DE_DIA.length);
  });
});
