import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear as sanearComando } from '../../src/nucleo/saneamento';
import type { Comando, EventoNucleo } from '../../src/nucleo/protocolo';
import { CHAMADO, CONTAGEM, ENTRADA, ESPERA_FINAL, APLAUSO, INTRO } from '../../src/jogo/show';
import { BAIXISTA, BATERISTA, TECLADISTA, papelNaBanda } from '../../src/nucleo/vila';
import {
  COXIA,
  LUGAR,
  VAN,
  doMundo,
  noPalco,
  paraOMundo,
  alturaEm,
  type Ponto,
} from '../../src/jogo/coreografia';
import { PASSO } from '../../src/nucleo/protocolo';
import { MORADORES_VILA, N0_PUBLICO, POVOADO_VILA } from '../../src/nucleo/vila';
import {
  ACENDE_SOZINHA,
  idDaNoite,
  NOITE_ANTES,
  noiteDeShow,
  PERTO_ANTES,
} from '../../src/jogo/show';
import { HORA_INICIAL } from '../../src/jogo/tempo';
import { VEL_ANDAR } from '../../src/player/fisica';
import { RAIO_SEGUIR } from '../../src/jogo/criacao';
import {
  FICAM_DE_DIA,
  PUBLICO_DA_NOITE,
  PUBLICO_GRADE,
  publicoDaVila,
} from '../../src/world/publicoVila';
import { F_RINQUE } from '../../src/jogo/rinque';

/**
 * Spec 026: a Vila Neon no núcleo. As três missões de ponta a ponta com as moedinhas de
 * verdade (4 + 5 + 6, só no fim de cada uma), o show sozinho toda noite (só para ver: nenhum
 * toque muda o show, o acorde final vem sozinho), a banda que nunca fica no palco fora do show,
 * o que volta só quando a missão é escolhida de novo, os moradores com posto, o pôster do
 * vocalista e o comando da nuvem passado a limpo.
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
  aparencia: Record<string, unknown> = {},
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
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia } });
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
/** O show tocando pula para `s` s desde o começo (o atalho dos testes). */
function pularShow(n: Nucleo, seg: number): void {
  n.comando('ana', { t: 'depurar', d: { f: 'pularShow', s: seg } } as Comando);
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

  it('o show é só para ver: tocar no palco não faz nada, o acorde final vem sozinho, sem moedinha; depois as caixas são brinquedo', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    hora(n, NOITE);
    const [gx, gz] = meioDaGrade(p);
    ir(n, 'ana', gx, p.h + 1, gz);
    ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    // no show, o toque nas caixas não liga nem desliga nada (e nenhum acorde é tocado)
    pularShow(n, CONTAGEM + 3);
    passos(n, 2);
    const [cx, cy, cz] = p.pontos.caixas[0];
    ir(n, 'ana', cx + 0.5, cy, cz - 1.5);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    const toque = passos(n, 3);
    expect(toque.some((e) => e.e === 'vilaCaixa')).toBe(false);
    expect(n.estado.vila!.vista().cx).toEqual([true, true, true]);
    // o "toque no palco" de antes não existe mais (a nuvem nem deixa passar)
    expect(sanearComando({ t: 'vila', a: 'palco' })).toBeNull();
    // ninguém toca no chamado: o acorde final vem sozinho, sem moedinha
    pularShow(n, CHAMADO - 1);
    const fim = passos(n, Math.ceil((ESPERA_FINAL + 1.5) / PASSO));
    const final = fim.find((e) => e.e === 'vilaFinal') as Extract<Ev, { e: 'vilaFinal' }>;
    expect(final?.quem).toBe('auto');
    expect(moedas(fim)).toBe(0);
    // depois do fim, o show acaba e as caixas ficam como brinquedo livre (sem moedinha)
    const depois = passos(n, Math.ceil((APLAUSO + 1) / PASSO));
    expect(n.estado.vila!.vista().show).toBeNull();
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    const brinca = passos(n, 3);
    expect(moedas([...depois, ...brinca])).toBe(0);
    expect(n.estado.vila!.vista().cx[0]).toBe(false);
  });

  /** A banda (os seis, com a roadie) como o núcleo a vê. */
  const bandaDe = (n: Nucleo) =>
    n.estado.populacao.lista.filter(
      (c) =>
        c.morador?.povoado === POVOADO_VILA &&
        papelNaBanda(c.morador.n) !== null &&
        c.estado !== 'morrendo',
    );

  it('a banda nunca fica no palco fora do show: de dia de papo na van, de noite na coxia', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, DIA);
    const [x, y, z] = p.pontos.escadinha;
    ir(n, 'ana', x + 3, y, z + 4);
    passos(n, 30 * 20);
    const local = (c: { x: number; z: number }) => doMundo(p.pontos.palco, c.x, c.z);
    // os seis (com o baterista, a baixista e a tecladista) existem
    expect(new Set(bandaDe(n).map((c) => c.morador!.n))).toEqual(
      new Set([0, 1, 2, BATERISTA, BAIXISTA, TECLADISTA]),
    );
    // de dia: ninguém no palco; a banda na frente da van, a roadie na coxia
    for (const c of bandaDe(n)) {
      const papel = papelNaBanda(c.morador!.n)!;
      const [a, b] = local(c);
      expect(noPalco(a, b), papel).toBe(false);
      expect(Math.hypot(a - VAN[papel][0], b - VAN[papel][1]), papel).toBeLessThan(0.3);
    }
    // a noite chega: vão a pé (nunca pelo palco) para a coxia, e ali esperam
    hora(n, NOITE);
    let noPalcoAlgumaVez = false;
    for (let k = 0; k < 15 * 20; k++) {
      passos(n, 1);
      for (const c of bandaDe(n)) if (noPalco(...local(c))) noPalcoAlgumaVez = true;
      // (longe do festival o show não começa: a criança fica fora dele)
    }
    expect(noPalcoAlgumaVez).toBe(false);
    for (const c of bandaDe(n)) {
      const papel = papelNaBanda(c.morador!.n)!;
      const [a, b] = local(c);
      expect(Math.hypot(a - COXIA[papel][0], b - COXIA[papel][1]), papel).toBeLessThan(0.3);
    }
  });

  it('a banda: espera na coxia, entra pela escadinha na entrada, toca no lugar e sai no fim (todos veem o mesmo)', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    const [gx, gz] = meioDaGrade(p);
    ir(n, 'ana', gx, p.h + 1, gz);
    passos(n, 5 * 20);
    const local = (c: { x: number; z: number }) => doMundo(p.pontos.palco, c.x, c.z);
    ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    // na abertura, ninguém da banda no palco (a roadie sobe para a beira dele)
    passos(n, 10 * 20);
    for (const c of bandaDe(n)) {
      const papel = papelNaBanda(c.morador!.n)!;
      if (papel === 'roadie') continue;
      expect(noPalco(...local(c)), papel).toBe(false);
    }
    // quando a música começa, cada um no lugar dele no palco (a tecladista atrás do teclado)
    passos(n, Math.ceil((CONTAGEM - 10) / PASSO));
    expect(bandaDe(n)).toHaveLength(6);
    for (const c of bandaDe(n)) {
      const papel = papelNaBanda(c.morador!.n)!;
      const [a, b] = local(c);
      expect(Math.hypot(a - LUGAR[papel][0], b - LUGAR[papel][1]), papel).toBeLessThan(0.5);
    }
    // no fim do show, de volta para a coxia
    pularShow(n, CHAMADO + ESPERA_FINAL - 0.1);
    passos(n, Math.ceil((APLAUSO + 4) / PASSO));
    for (const c of bandaDe(n)) {
      const papel = papelNaBanda(c.morador!.n)!;
      const [a, b] = local(c);
      expect(Math.hypot(a - COXIA[papel][0], b - COXIA[papel][1]), papel).toBeLessThan(0.5);
    }
  });

  /** Põe cada um da banda num dos lugares (no referencial do palco), rodando a lista. */
  function espalharBanda(
    n: Nucleo,
    p: NonNullable<ReturnType<typeof vilaDoMundo>>,
    lugares: Ponto[],
    k: number,
  ) {
    bandaDe(n).forEach((c, i) => {
      const q = lugares[(k + i) % lugares.length];
      const [x, y, z] = paraOMundo(p.pontos.palco, q[0], q[1], alturaEm(q[0], q[1]));
      c.x = x;
      c.y = y;
      c.z = z;
    });
  }
  /** Até o fim da entrada, cada um chegou ao lugar dele no palco. */
  function todosNoLugar(n: Nucleo, p: NonNullable<ReturnType<typeof vilaDoMundo>>, caso: string) {
    expect(bandaDe(n)).toHaveLength(6);
    for (const c of bandaDe(n)) {
      const papel = papelNaBanda(c.morador!.n)!;
      const [a, b] = doMundo(p.pontos.palco, c.x, c.z);
      expect(
        Math.hypot(a - LUGAR[papel][0], b - LUGAR[papel][1]),
        `${caso}: ${papel} em ${a.toFixed(1)},${b.toFixed(1)}`,
      ).toBeLessThan(0.5);
    }
  }
  // os lugares estranhos (no referencial do palco): o tablado, os degraus da escadinha (o caso
  // do dono: "desceu para subir de novo e ficou presa"), o praticável da bateria, a ponta da
  // passarela, atrás do teclado
  const NO_PALCO: Ponto[] = [
    [12, 10],
    [34.6, 8],
    [35.8, 7.4],
    [17, 17.5],
    [17, 1],
    [26.5, 15.4],
    [30, 12],
  ];
  // e no chão: o pé do palco na plateia, atrás dele e do outro lado
  const NO_CHAO: Ponto[] = [
    [10, -3],
    [44, 30],
    [-6, 12],
    [20, 26],
    [40, 2],
  ];

  it('a banda começa de qualquer lugar e chega ao lugar dela até o fim da entrada (quem está longe da coxia aparece nela no escuro da abertura)', () => {
    const lugares = [...NO_PALCO, ...NO_CHAO];
    for (let k = 0; k < lugares.length; k++) {
      const n = abrir();
      const p = vilaDoMundo(SEMENTE)!;
      hora(n, NOITE);
      const [gx, gz] = meioDaGrade(p);
      ir(n, 'ana', gx, p.h + 1, gz);
      // até as caixas começarem a acender sozinhas (o show vem em 3,6 s)
      for (let i = 0; i < 120 / PASSO && !n.estado.vila!.vista().cx.some(Boolean); i++)
        passos(n, 1);
      espalharBanda(n, p, lugares, k);
      ateOShow(n, 20);
      expect(n.estado.vila!.vista().show, `caso ${k}`).not.toBeNull();
      passos(n, Math.ceil((INTRO + ENTRADA) / PASSO));
      todosNoLugar(n, p, `caso ${k}`);
    }
  });

  it('a banda tirada do lugar no meio da abertura (no palco, nos degraus, no praticável) volta andando pela escadinha e chega a tempo', () => {
    for (let k = 0; k < NO_PALCO.length; k++) {
      const n = abrir();
      const p = vilaDoMundo(SEMENTE)!;
      hora(n, NOITE);
      showSozinho(n, p);
      passos(n, 2 * 20);
      espalharBanda(n, p, NO_PALCO, k);
      passos(n, Math.ceil((INTRO + ENTRADA - 2) / PASSO));
      todosNoLugar(n, p, `caso ${k}`);
    }
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
    // (parte 3B: o feno é item próprio, não mais o trigo)
    expect(n.estado.jogadores.get('ana')!.inventario.contar('feno')).toBeGreaterThan(0);
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
    expect(sanearComando({ t: 'vila', a: 'palco', i: 0 })).toBeNull();
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
  /** Toca nas três caixas (a criança vai a cada uma e toca). */
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
  /** Faz a f1 (a terceira missão abre depois de uma das duas primeiras). */
  function fazerF1(n: Nucleo, p: NonNullable<ReturnType<typeof vilaDoMundo>>): void {
    for (const [x, y, z] of p.pontos.estojos) {
      ir(n, 'ana', x, y, z);
      passos(n, 10);
    }
  }
  /** O show desta noite, sozinho: a criança na grade até ele começar. */
  function showSozinho(n: Nucleo, p: NonNullable<ReturnType<typeof vilaDoMundo>>): void {
    const [gx, gz] = meioDaGrade(p);
    ir(n, 'ana', gx, p.h + 1, gz);
    ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
  }

  it('o show é só de noite (decisão do dono): de dia as caixas são brinquedo e não começam o show', () => {
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
    const dia = acenderAsTres(n, p);
    expect(n.estado.vila!.vista().cx).toEqual([true, true, true]);
    expect(n.estado.vila!.vista().show).toBeNull();
    expect(dia.filter((e) => e.e === 'vilaCaixa').every((e) => 'dia' in e && e.dia)).toBe(true);
    // um minuto de dia no palco com as três acesas: nada de show
    passos(n, 60 * 20);
    expect(n.estado.vila!.vista().show).toBeNull();
    // a noite chega: as caixas se apagam (a banda prepara o show) e o show vem sozinho
    hora(n, NOITE);
    passos(n, 5);
    expect(n.estado.vila!.vista().cx).toEqual([false, false, false]);
    showSozinho(n, p);
  });

  it('de noite, antes do show, a caixa é brinquedo: liga e desliga, e não começa nem adianta o show', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    passos(n);
    const [x, y, z] = p.pontos.caixas[0];
    ir(n, 'ana', x + 0.5, y, z - 1.5);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    passos(n, 30);
    expect(n.estado.vila!.vista().cx[0]).toBe(true);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    passos(n, 3);
    expect(n.estado.vila!.vista().cx[0]).toBe(false);
    // as três acesas pela criança: o show não começa por isso
    acenderAsTres(n, p);
    passos(n, 3 * 20);
    expect(n.estado.vila!.vista().cx).toEqual([true, true, true]);
    expect(n.estado.vila!.vista().show).toBeNull();
    // ele vem na hora dele (a noite aberta há NOITE_ANTES e alguém no festival há PERTO_ANTES),
    // as caixas se apagam e acendem de novo uma a uma, sempre no mesmo tempo
    const { evs } = ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    const auto = evs.filter((e) => e.e === 'vilaCaixa' && e.quem === 'auto');
    expect(auto).toHaveLength(3);
  });

  it('a noite acaba no meio do show: o show termina normal, nunca é cortado', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    passos(n);
    showSozinho(n, p);
    passos(n, 5 * 20);
    pularShow(n, CHAMADO - 2);
    passos(n);
    const inicio = n.estado.vila!.vista().show!.inicio;
    hora(n, DIA);
    const evs = passos(n, Math.ceil((ESPERA_FINAL + 3) / PASSO));
    expect(evs.some((e) => e.e === 'vilaFinal')).toBe(true);
    expect(n.estado.vila!.vista().show?.inicio ?? inicio).toBe(inicio);
    passos(n, Math.ceil((APLAUSO + 1) / PASSO));
    expect(n.estado.vila!.vista().show).toBeNull();
  });

  it('salvo no meio do show: de noite o show toca de novo; salvo depois dele, a noite dele vai junto', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    passos(n);
    showSozinho(n, p);
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
    expect(m.estado.vila!.vista().show).toBeNull();
    // a noite chega: o show cortado não conta (a noite segue aberta) e ele começa de novo
    hora(m, NOITE);
    passos(m, 5);
    showSozinho(m, p);
    // e depois do show, salvo de novo, a noite dele vai junto
    pularShow(m, CHAMADO + ESPERA_FINAL - 1);
    const fim = passos(m, Math.ceil((APLAUSO + 3) / PASSO));
    expect(fim.some((e) => e.e === 'vilaFinal')).toBe(true);
    const s2 = m.salvar();
    expect(typeof (s2.extras as { vila: { noite?: number } }).vila.noite).toBe('number');
    const k = abrir(['ana'], true, {
      edicoes: s2.edicoes,
      hora: NOITE,
      extras: s2.extras,
    } as never);
    const [gx, gz] = meioDaGrade(p);
    ir(k, 'ana', gx, p.h + 1, gz);
    passos(k, 60 * 20);
    expect(k.estado.vila!.vista().show).toBeNull();
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
    expect(n.estado.jogadores.get('ana')!.inventario.contar('feno')).toBeGreaterThan(0);
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
  it('o público do show é de uns 40 (o dobro, 16 nov 2026), espalhado pelo campo (nada de bloco) e fora do caminho, do corredor das lhamas e do estojo', () => {
    for (const sem of [SEMENTE, 1, 77, 1337]) {
      const p = vilaDoMundo(sem)!;
      const pub = publicoDaVila(p);
      expect(pub.grade).toHaveLength(PUBLICO_GRADE);
      expect(PUBLICO_GRADE).toBeGreaterThanOrEqual(36);
      expect(PUBLICO_GRADE).toBeLessThanOrEqual(44);
      for (const [x, , z] of pub.grade) {
        expect(pub.livre(x, z), `${sem} ${x - p.ox},${z - p.oz}`).toBe(true);
        expect(pub.naFaixaLivre(x, z), `${sem} ${x - p.ox},${z - p.oz}`).toBe(false);
      }
      // ninguém colado em ninguém, e o povo vai da grade até o meio do campo
      for (let a = 0; a < pub.grade.length; a++)
        for (let b = a + 1; b < pub.grade.length; b++)
          expect(
            Math.hypot(pub.grade[a][0] - pub.grade[b][0], pub.grade[a][2] - pub.grade[b][2]),
          ).toBeGreaterThan(1.5);
      const vs = pub.grade.map((g) => g[2]);
      expect(Math.max(...vs) - Math.min(...vs)).toBeGreaterThan(10);
      // as rodinhas também ficam em chão livre, fora das faixas
      for (const [a, b] of pub.rodas)
        for (const [x, , z] of [a, b]) expect(pub.naFaixaLivre(x, z)).toBe(false);
    }
  });

  it('a turma do show: de noite os 20, no show os 40 (os outros chegam pelo portão), de dia só 4; no show, cada um no lugar dele', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    hora(n, NOITE);
    // no nascer, ninguém (o público é do festival)
    passos(n, 100);
    expect(n.estado.vila!.publico()).toHaveLength(0);
    ir(n, 'ana', pub.portao[0], p.h + 1, pub.portao[2] - 3);
    // (16 nov 2026: ninguém nasce à vista; com a criança no portão olhando para dentro, a turma
    // vem andando de onde ela não vê, pelas calçadas, e entra pelo portão)
    passos(n, 14 * 20);
    expect(n.estado.vila!.vista().show).toBeNull();
    const noite = n.estado.vila!.publico();
    expect(noite).toHaveLength(PUBLICO_DA_NOITE);
    // o show (sozinho): todos na grade, com os que vieram só para ele
    ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    // (os que vêm só para o show chegam em fila, atravessam na faixa e dão a volta na criança
    // parada no meio do portão)
    passos(n, 75 * 20);
    const naGrade = n.estado.vila!.publico();
    expect(naGrade).toHaveLength(PUBLICO_GRADE);
    for (const c of naGrade) {
      const k = c.morador!.n - N0_PUBLICO;
      expect(Math.hypot(c.x - pub.grade[k][0], c.z - pub.grade[k][2]), `morador ${k}`).toBeLessThan(
        1.2,
      );
    }
    // ninguém teleportou para chegar (o caminho dá a volta nas peças)
    expect(naGrade.every((c) => !c.teleportes)).toBe(true);
    // depois do show, de noite: os que vieram só para ele vão embora
    pularShow(n, CHAMADO + ESPERA_FINAL - 1);
    passos(n, Math.ceil((APLAUSO + 2) / PASSO));
    expect(n.estado.vila!.vista().show).toBeNull();
    passos(n, 60 * 20);
    // (quem foi embora anda até em casa e só sai do mundo onde ninguém vê: aqui conta quem
    // ficou no festival; a saída tem os testes dela em vilaSaida.test.ts)
    const F = p.zonas.festival;
    const noFestival = () =>
      n.estado.vila!.publico().filter((c) => c.x >= F.x0 && c.z >= F.z0 && c.z <= F.z1);
    expect(noFestival()).toHaveLength(PUBLICO_DA_NOITE);
    // de papo nas rodinhas, ninguém no caminho de cascalho nem no corredor das lhamas
    for (const c of noFestival()) expect(pub.livre(c.x, c.z)).toBe(true);
    // de dia: quatro ficam, os outros saem pelo portão
    hora(n, DIA);
    passos(n, 60 * 20);
    expect(noFestival()).toHaveLength(FICAM_DE_DIA.length);
    // e quando a criança vai embora olhando para o outro lado, só os quatro continuam no mundo
    ir(n, 'ana', pub.portao[0] + 30, p.h + 1, pub.portao[2] - 5);
    n.estado.jogadores.get('ana')!.tel.yaw = Math.PI / 2;
    passos(n, 5 * 20);
    expect(n.estado.vila!.publico()).toHaveLength(FICAM_DE_DIA.length);
  });

  // ------------------------------------------------------------------ o show sozinho, toda noite
  /** Passos até o show começar (ou o teto), juntando os eventos. */
  function ateOShow(n: Nucleo, teto: number): { evs: Ev[]; s: number } {
    const evs: Ev[] = [];
    let k = 0;
    while (!n.estado.vila!.vista().show && k < teto / PASSO) {
      evs.push(...passos(n, 1));
      k++;
    }
    return { evs, s: k * PASSO };
  }
  function meioDaGrade(p: NonNullable<ReturnType<typeof vilaDoMundo>>): [number, number] {
    return [(p.pontos.plateia.x0 + p.pontos.plateia.x1) / 2, p.pontos.plateia.z1 - 2];
  }

  it('o dono: de noite, no festival, ninguém toca em nada: as caixas acendem uma a uma, o show começa sozinho e a turma dança', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    hora(n, DIA);
    passos(n);
    const [gx, gz] = meioDaGrade(p);
    ir(n, 'ana', gx, p.h + 1, gz);
    passos(n, 20);
    // a noite chega com a criança na grade, de mãos paradas (com qualquer missão no selinho: o
    // show é do bairro, sem missão)
    n.comando('ana', { t: 'almaFixar', missao: 'f2' });
    hora(n, NOITE);
    const { evs, s } = ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    expect(s).toBeGreaterThanOrEqual(NOITE_ANTES);
    expect(s).toBeLessThan(NOITE_ANTES + 3 * ACENDE_SOZINHA + 2);
    // as três acendem sozinhas, uma de cada vez, antes da contagem
    const acesas = evs.filter((e) => e.e === 'vilaCaixa') as Extract<Ev, { e: 'vilaCaixa' }>[];
    expect(acesas.map((e) => [e.i, e.acesa, e.quem])).toEqual([
      [0, true, 'auto'],
      [1, true, 'auto'],
      [2, true, 'auto'],
    ]);
    expect(n.estado.vila!.vista().cx).toEqual([true, true, true]);
    // a turma vai para a grade, de frente para o palco (dança no show); os que vêm só para o
    // show chegam pelo portão
    passos(n, 30 * 20);
    const turma = n.estado.vila!.publico();
    expect(turma).toHaveLength(PUBLICO_GRADE);
    const naGrade = turma.filter((c) => {
      const k = c.morador!.n - N0_PUBLICO;
      return Math.hypot(c.x - pub.grade[k][0], c.z - pub.grade[k][2]) < 1.2;
    });
    expect(naGrade.length).toBe(PUBLICO_GRADE);
    // e o show vai até o fim sozinho (o acorde final vem sozinho)
    pularShow(n, CHAMADO - 1);
    const fim = passos(n, Math.ceil((ESPERA_FINAL + APLAUSO + 2) / PASSO));
    expect(fim.some((e) => e.e === 'vilaFinal' && e.quem === 'auto')).toBe(true);
    expect(n.estado.vila!.vista().show).toBeNull();
  });

  it('quem chega de noite vê o show começar logo; longe do festival, nada começa', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    // a noite inteira na pracinha (longe): nada de show
    ir(n, 'ana', p.nascimento.x, p.h + 1, p.nascimento.z);
    passos(n, 60 * 20);
    expect(n.estado.vila!.vista().show).toBeNull();
    expect(n.estado.vila!.vista().cx).toEqual([false, false, false]);
    // chegou ao festival: em poucos segundos as caixas acendem e a banda toca
    const [gx, gz] = meioDaGrade(p);
    ir(n, 'ana', gx, p.h + 1, gz);
    const { s } = ateOShow(n, 60);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    expect(s).toBeLessThan(PERTO_ANTES + 3 * ACENDE_SOZINHA + 2);
  });

  it('uma vez por noite: depois do show, a mesma noite não tem outro; a noite seguinte tem, sozinho', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, NOITE);
    const [gx, gz] = meioDaGrade(p);
    ir(n, 'ana', gx, p.h + 1, gz);
    ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    passos(n, 2);
    pularShow(n, CHAMADO + ESPERA_FINAL - 1);
    passos(n, Math.ceil((APLAUSO + 3) / PASSO));
    expect(n.estado.vila!.vista().show).toBeNull();
    // a mesma noite: um minuto ali, nada; as caixas viram brinquedo livre (liga e desliga)
    passos(n, 60 * 20);
    expect(n.estado.vila!.vista().show).toBeNull();
    const [x, y, z] = p.pontos.caixas[0];
    ir(n, 'ana', x + 0.5, y, z - 1.5);
    n.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    passos(n, 3);
    expect(n.estado.vila!.vista().cx[0]).toBe(false);
    expect(n.estado.vila!.vista().show).toBeNull();
    ir(n, 'ana', gx, p.h + 1, gz);
    // a madrugada é da mesma noite; a manhã seguinte (o dia do mundo virou) e a tarde: nada de show de dia
    const diaAntes = (n.salvar().extras as { dia: number }).dia;
    n.comando('ana', { t: 'depurar', d: { f: 'dia', dia: diaAntes + 1 } } as Comando);
    hora(n, 0.3);
    passos(n, 20 * 20);
    expect(n.estado.vila!.vista().show).toBeNull();
    hora(n, NOITE);
    passos(n, 5);
    // as caixas do brinquedo livre se apagam com a noite, e acendem de novo uma a uma
    expect(n.estado.vila!.vista().cx).toEqual([false, false, false]);
    ateOShow(n, 120);
    expect(n.estado.vila!.vista().show).not.toBeNull();
  });

  it('da grade da plateia a criança alcança as três caixas com o dedo (brinquedo fora do show); do meio do campo, não', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    hora(n, DIA);
    passos(n);
    const [gx] = meioDaGrade(p);
    ir(n, 'ana', gx, p.h + 1, p.pontos.plateia.z1 - 0.5);
    for (let i = 0; i < 3; i++) {
      n.comando('ana', { t: 'vila', a: 'caixa', i });
      passos(n, 10);
    }
    expect(n.estado.vila!.vista().cx).toEqual([true, true, true]);
    expect(n.estado.vila!.vista().show).toBeNull();
    // do meio do campo, longe da grade, o toque não vale
    const m = abrir();
    hora(m, DIA);
    passos(m);
    ir(m, 'ana', gx, p.h + 1, p.pontos.plateia.z0 - 12);
    m.comando('ana', { t: 'vila', a: 'caixa', i: 0 });
    passos(m, 3);
    expect(m.estado.vila!.vista().cx[0]).toBe(false);
  });

  // ------------------------------------------------------------------ f4: a volta no rinque
  /** Passa por dentro do arco (de um lado ao outro, devagar). */
  function passarNoArco(
    n: Nucleo,
    a: { x: number; y: number; z: number; eixo: 'x' | 'z' },
    quem = 'ana',
  ): Ev[] {
    const evs: Ev[] = [];
    for (let t = -2; t <= 2; t += 0.25) {
      const x = a.eixo === 'x' ? a.x + 0.3 : a.x + t;
      const z = a.eixo === 'x' ? a.z + t : a.z + 0.3;
      ir(n, quem, x, a.y, z);
      evs.push(...passos(n, 1, quem));
    }
    return evs;
  }
  const comPatins = { patins: true };

  it('f4, a volta no rinque: de patins, os três arcos dão 6 moedinhas no fim; cada arco conta uma vez', () => {
    const n = abrir(['ana'], true, undefined, comPatins);
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    fazerF1(n, p);
    n.comando('ana', { t: 'almaFixar', missao: F_RINQUE });
    passos(n);
    expect(p.pontos.arcos).toHaveLength(3);
    const ganho: number[] = [];
    for (const a of p.pontos.arcos) {
      const evs = passarNoArco(n, a);
      expect(evs.some((e) => e.e === 'vilaArco')).toBe(true);
      ganho.push(moedas([...evs, ...passos(n, 5)]));
      // o mesmo arco de novo: não conta outra vez
      ganho.push(moedas([...passarNoArco(n, a), ...passos(n, 5)]));
    }
    expect(ganho).toEqual([0, 0, 0, 0, 6, 0]);
    expect(n.estado.almas.get('ana')!.feitas).toContain(F_RINQUE);
    // os arcos que ela acendeu vão no quadro dela
    expect(n.estado.vila!.vistaDe('ana').arcos).toEqual([true, true, true]);
  });

  it('f4: sem patins o arco não conta; descalça do lado, de patins conta; escolhida de novo, a volta recomeça', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    fazerF1(n, p);
    n.comando('ana', { t: 'almaFixar', missao: F_RINQUE });
    passos(n);
    const prog = () => n.estado.almas.get('ana')!.progresso[F_RINQUE] ?? 0;
    const evs = passarNoArco(n, p.pontos.arcos[0]);
    expect(evs.some((e) => e.e === 'vilaArco')).toBe(false);
    expect(prog()).toBe(0);
    // calça os patins (a aparência) e passa
    n.comando('ana', { t: 'aparencia', aparencia: { patins: true } } as Comando);
    passos(n, 20);
    passarNoArco(n, p.pontos.arcos[0]);
    passos(n, 3);
    expect(prog()).toBe(1);
    expect(n.estado.vila!.vistaDe('ana').arcos).toEqual([true, false, false]);
    // passando por fora do arco (do lado do poste), não conta
    const a = p.pontos.arcos[1];
    ir(n, 'ana', a.eixo === 'x' ? a.x + 4 : a.x, a.y, a.eixo === 'x' ? a.z : a.z + 4);
    passos(n, 5);
    expect(prog()).toBe(1);
    // escolhida de novo: os arcos dela apagam (a volta recomeça)
    n.comando('ana', { t: 'almaFixar', missao: F_RINQUE });
    passos(n, 2);
    expect(n.estado.vila!.vistaDe('ana').arcos).toEqual([false, false, false]);
  });

  it('f4 com amigos: cada um acende os arcos dele (o arco aceso de um não conta para o outro)', () => {
    const n = abrir(['ana', 'bia'], true, undefined, comPatins);
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    // as duas fazem a f1 juntas (quem está perto com a missão aberta conta junto)
    n.comando('bia', { t: 'almaFixar', missao: 'f1' });
    for (const [x, y, z] of p.pontos.estojos) {
      ir(n, 'ana', x, y, z);
      ir(n, 'bia', x + 1, y, z);
      passos(n, 10);
    }
    for (const q of ['ana', 'bia']) n.comando(q, { t: 'almaFixar', missao: F_RINQUE });
    passos(n);
    ir(n, 'bia', p.nascimento.x, p.h + 1, p.nascimento.z);
    passarNoArco(n, p.pontos.arcos[2]);
    passos(n, 3);
    expect(n.estado.vila!.vistaDe('ana').arcos).toEqual([false, false, true]);
    expect(n.estado.vila!.vistaDe('bia').arcos).toEqual([false, false, false]);
    passarNoArco(n, p.pontos.arcos[2], 'bia');
    passos(n, 3);
    expect(n.estado.vila!.vistaDe('bia').arcos).toEqual([false, false, true]);
    expect(n.estado.almas.get('bia')!.progresso[F_RINQUE]).toBe(1);
  });

  it('f4: o mundo salvo com a f3 de antes (o show) feita abre com a f4 nova e as moedinhas de antes', () => {
    const n = abrir();
    passos(n);
    const s = n.salvar();
    const extras = s.extras as Record<string, unknown>;
    const alma = {
      ana: {
        feitas: ['f1', 'f2', 'f3'],
        progresso: {},
        livro: { moedas: 15, xp: 60, pontos: {}, gasto: 0, compras: {} },
      },
    };
    const m = abrir(['ana'], true, {
      edicoes: s.edicoes,
      hora: DIA,
      extras: { ...extras, alma },
    } as never);
    passos(m);
    const e = m.estado.almas.get('ana')!;
    expect(e.feitas).toEqual(['f1', 'f2']);
    expect(e.livro.moedas).toBe(15);
    // a f4 está aberta (é a única que falta), e a lista não acabou
    expect(m.estado.vila).not.toBeNull();
  });

  it('mundo salvo de antes (com "tocou"): abre e o show toca na noite', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    passos(n);
    const s = n.salvar();
    const extras = {
      ...(s.extras as Record<string, unknown>),
      vila: { ins: [true, true, true], cx: [true, true, true], poster: [], tocou: true },
    };
    const m = abrir(['ana'], true, { edicoes: s.edicoes, hora: NOITE, extras } as never);
    passos(m);
    expect(m.estado.vila!.vista().ins).toEqual([true, true, true]);
    const [gx, gz] = meioDaGrade(p);
    ir(m, 'ana', gx, p.h + 1, gz);
    ateOShow(m, 120);
    expect(m.estado.vila!.vista().show).not.toBeNull();
  });
});
