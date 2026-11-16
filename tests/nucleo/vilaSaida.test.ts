import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { PASSO } from '../../src/nucleo/protocolo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import type { Comando } from '../../src/nucleo/protocolo';
import { N0_PUBLICO, daTurma as ehDaTurma } from '../../src/nucleo/vila';
import { APLAUSO, CHAMADO, ESPERA_FINAL } from '../../src/jogo/show';
import type { Criatura } from '../../src/jogo/criaturas';
import {
  ATRAS_VE,
  LONGE_VE,
  PERTO_VE,
  PUBLICO_DA_NOITE,
  PUBLICO_GRADE,
  alguemVe,
  caminhoDoPublico,
  publicoDaVila,
  zonaSemBichos,
  type QuemOlha,
} from '../../src/world/publicoVila';

/**
 * Spec 026 (dono, 16 nov 2026, depois de ver o show publicado): "depois do show a turma anda até
 * o portão do festival e some lá, na frente da gente; os bichos que saem do festival também".
 *
 * Ninguém some nem aparece à vista: quem vai embora sai pelo portão e anda pelas calçadas até o
 * quintal de casa, e só sai do mundo onde nenhuma criança pode estar vendo; quem chega nasce
 * fora da vista e vem andando. Os bichos que saem do festival saem andando e continuam no mundo.
 */
const VILA = obterTema('vila-neon').mundo;
const SEMENTE = 4242;
const NOITE = 0.9;
const DIA = 0.42;
/** Olhando para o palco (sul) e para o portão (norte): a frente é (seno, cosseno) do yaw. */
const SUL = 0;
const NORTE = Math.PI;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function abrir(quem: string[] = ['ana']): Nucleo {
  definirEstiloMundo(VILA);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: quem[0],
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
function ir(n: Nucleo, quem: string, x: number, y: number, z: number, yaw: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, {
    t: 'jogador',
    x,
    y,
    z,
    yaw,
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
    slot: 0,
  } as Comando);
}
const depurar = (n: Nucleo, d: Record<string, unknown>) =>
  n.comando('ana', { t: 'depurar', d } as Comando);

/**
 * A conta de quem vê, refeita aqui (o teste não confia na do jogo), com um bloco e três graus de
 * folga: o teste olha onde a pessoa estava um passo antes de o núcleo decidir.
 */
function aVista(js: readonly QuemOlha[], x: number, z: number): boolean {
  return js.some((j) => {
    const d = Math.hypot(x - j.x, z - j.z);
    if (d <= PERTO_VE - 1) return true;
    if (d >= LONGE_VE - 1) return false;
    const ang =
      (Math.acos(((x - j.x) * Math.sin(j.olhar!) + (z - j.z) * Math.cos(j.olhar!)) / d) * 180) /
      Math.PI;
    return ang < ATRAS_VE - 3;
  });
}

/**
 * Anda o mundo e vigia a turma (ou os bichos): quem nasceu e quem sumiu à vista de alguém, quem
 * deu um salto de um passo para o outro e quem precisou do anti-trava.
 */
function vigiar(n: Nucleo, quem: (c: Criatura) => boolean) {
  const ult = new Map<number, [number, number]>();
  const r = {
    nasceuAVista: [] as string[],
    sumiuAVista: [] as string[],
    /** Quem saltou de um passo para o outro à vista de alguém (e quantos saltos fora da vista). */
    saltos: [] as string[],
    saltosForaDaVista: 0,
    nasceram: 0,
    sumiram: 0,
    /** Onde cada um sumiu (blocos do jogador mais perto). */
    distAoSumir: [] as number[],
  };
  const js = (): QuemOlha[] =>
    [...n.estado.jogadores.values()].map((j) => ({ x: j.tel.x, z: j.tel.z, olhar: j.tel.yaw }));
  return {
    r,
    passos(k: number, aCada?: (i: number) => void): void {
      for (let i = 0; i < k; i++) {
        aCada?.(i);
        // quem olha neste passo (antes de o mundo andar: é com isto que o núcleo decide)
        const olhos = js();
        n.passo();
        const vivos = new Set<number>();
        for (const c of n.estado.populacao.lista) {
          if (!quem(c) || c.estado === 'morrendo') continue;
          vivos.add(c.id);
          const a = ult.get(c.id);
          if (!a) {
            r.nasceram++;
            if (aVista(olhos, c.x, c.z)) r.nasceuAVista.push(`${c.id} em ${c.x},${c.z}`);
          } else if (Math.hypot(c.x - a[0], c.z - a[1]) > 1.5) {
            // (o anti-trava de sempre põe a pessoa no ponto seguinte: só vale fora da vista)
            if (aVista(olhos, a[0], a[1]) || aVista(olhos, c.x, c.z))
              r.saltos.push(`${c.id}: ${a} -> ${c.x},${c.z}`);
            else r.saltosForaDaVista++;
          }
          ult.set(c.id, [c.x, c.z]);
        }
        for (const [id, a] of ult)
          if (!vivos.has(id)) {
            ult.delete(id);
            r.sumiram++;
            r.distAoSumir.push(Math.min(...olhos.map((j) => Math.hypot(a[0] - j.x, a[1] - j.z))));
            if (aVista(olhos, a[0], a[1])) r.sumiuAVista.push(`${id} em ${a}`);
          }
      }
    },
  };
}
const daTurma = (c: Criatura) => c.morador?.povoado === 'vila' && ehDaTurma(c.morador.n);
const turma = (n: Nucleo) => n.estado.populacao.lista.filter((c) => daTurma(c) && c.estado !== 'morrendo');

describe('spec 026: quem vê o quê (a conta do núcleo, sem a câmera)', () => {
  const j: QuemOlha = { x: 0, z: 0, olhar: SUL };
  it('de perto tudo se vê, para qualquer lado; de longe nada', () => {
    expect(alguemVe([j], 0, -PERTO_VE + 1)).toBe(true);
    expect(alguemVe([j], PERTO_VE - 1, 0)).toBe(true);
    expect(alguemVe([j], 0, LONGE_VE + 1)).toBe(false);
    expect(alguemVe([], 0, 1)).toBe(false);
  });
  it('até longe se vê o que está na frente e dos lados; bem atrás, não', () => {
    expect(alguemVe([j], 0, 40)).toBe(true);
    expect(alguemVe([j], 30, 0)).toBe(true);
    expect(alguemVe([j], -30, 3)).toBe(true);
    expect(alguemVe([j], 0, -30)).toBe(false);
    expect(alguemVe([j], 12, -30)).toBe(false);
    // virou para trás: agora vê
    expect(alguemVe([{ ...j, olhar: NORTE }], 0, -30)).toBe(true);
    // sem saber para onde olha, conta que vê
    expect(alguemVe([{ x: 0, z: 0 }], 0, -30)).toBe(true);
  });
  it('com amigos, basta um estar vendo', () => {
    const amigo: QuemOlha = { x: 0, z: -60, olhar: SUL };
    expect(alguemVe([j], 0, -30)).toBe(false);
    expect(alguemVe([j, amigo], 0, -30)).toBe(true);
  });
  it('as medidas: a tela mais larga mostra uns 65 graus para cada lado, e o chão desenhado acaba a 44', () => {
    expect(ATRAS_VE).toBeGreaterThanOrEqual(90);
    expect(LONGE_VE).toBeGreaterThanOrEqual(48);
    expect(PERTO_VE).toBeGreaterThanOrEqual(12);
  });
});

describe('spec 026: o caminho de casa da turma', () => {
  it('cada um tem o seu lugar num quintal, em chão livre, longe um do outro e fora do festival', () => {
    definirEstiloMundo(VILA);
    limparPovoados();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    const zona = zonaSemBichos(p);
    const casas: [number, number][] = [];
    for (let k = 0; k < PUBLICO_GRADE; k++) {
      const [x, y, z] = pub.casa(k);
      expect(y).toBe(p.h + 1);
      expect(pub.livreNaRua(x, z), `casa de ${k} em ${x - p.ox},${z - p.oz}`).toBe(true);
      expect(zona.dentro(x, z)).toBe(false);
      // longe do palco e do campo: de lá ninguém vê a pessoa sumir sem estar olhando
      expect(Math.hypot(x - pub.meio[0], z - pub.meio[1])).toBeGreaterThan(30);
      casas.push([x, z]);
    }
    // cada um no seu lugar (ninguém em cima de ninguém)
    for (let a = 0; a < casas.length; a++)
      for (let b = a + 1; b < casas.length; b++)
        expect(
          Math.hypot(casas[a][0] - casas[b][0], casas[a][1] - casas[b][1]),
          `${a} e ${b}`,
        ).toBeGreaterThan(0.9);
    for (let k = 0; k < PUBLICO_GRADE; k++)
      for (const [x, , z] of pub.paradas(k))
        expect(pub.livreNaRua(x, z), `parada ${x - p.ox},${z - p.oz}`).toBe(true);
  });

  it('da grade até em casa e de volta: pelo portão, pelas calçadas, sem pisar no asfalto nem atravessar nada', () => {
    definirEstiloMundo(VILA);
    limparPovoados();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    const portao: [number, number] = [pub.portao[0], pub.portao[2]];
    const fora: [number, number] = [pub.foraDoPortao[0], pub.foraDoPortao[2]];
    /** O ponto é chão de andar (o campo, as calçadas de fora ou a passagem do portão)? */
    const chao = (x: number, z: number) =>
      pub.livre(x, z) ||
      pub.livreNaRua(x, z) ||
      (Math.abs(x - portao[0]) < 1 && z >= fora[1] - 0.5 && z <= portao[1] + 0.5);
    const andavel = (pts: [number, number][], nome: string) => {
      for (let i = 1; i < pts.length; i++) {
        const [ax, az] = pts[i - 1];
        const [bx, bz] = pts[i];
        const d = Math.hypot(bx - ax, bz - az);
        for (let s = 0; s <= d; s += 0.25) {
          const x = ax + ((bx - ax) * s) / (d || 1);
          const z = az + ((bz - az) * s) / (d || 1);
          expect(chao(x, z), `${nome}: ${x - p.ox},${z - p.oz}`).toBe(true);
        }
      }
    };
    for (let k = 0; k < PUBLICO_GRADE; k++) {
      const g: [number, number] = [pub.grade[k][0], pub.grade[k][2]];
      const c: [number, number] = [pub.casa(k)[0], pub.casa(k)[2]];
      const ida = caminhoDoPublico(pub, g, c);
      // passa pelo portão e pela calçada de fora dele
      expect(ida).toContainEqual(portao);
      expect(ida).toContainEqual(fora);
      andavel([g, ...ida, c], `ida ${k}`);
      const volta = caminhoDoPublico(pub, c, g);
      expect(volta).toContainEqual(portao);
      andavel([c, ...volta, g], `volta ${k}`);
      // e de cada parada de chegada até o lugar no show
      for (const q of pub.paradas(k)) {
        const de: [number, number] = [q[0], q[2]];
        andavel([de, ...caminhoDoPublico(pub, de, g), g], `chegada ${k}`);
      }
    }
  });
});

describe('spec 026: ninguém da turma some nem aparece à vista', () => {
  /** A criança na grade, de noite, e o show desta noite já tocando com os 40 no lugar. */
  function noShow(quem: string[] = ['ana']) {
    const n = abrir(quem);
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    const g = p.pontos.plateia;
    const grade: [number, number] = [(g.x0 + g.x1) / 2 + 0.5, g.z1 - 1.5];
    depurar(n, { f: 'hora', hora: NOITE });
    const v = vigiar(n, daTurma);
    for (const q of quem) ir(n, q, grade[0], p.h + 1, grade[1], SUL);
    let k = 0;
    while (!n.estado.vila!.vista().show && k++ < 120 / PASSO) v.passos(1);
    expect(n.estado.vila!.vista().show).not.toBeNull();
    // a turma chega andando (ninguém nasce à vista) e todos acham o lugar
    v.passos(Math.ceil(75 / PASSO));
    return { n, p, pub, grade, v };
  }

  it('a turma chega andando de onde ninguém vê, em fila, e os 40 acham o lugar no show', () => {
    const { n, pub, v } = noShow();
    const t = turma(n);
    expect(t).toHaveLength(PUBLICO_GRADE);
    expect(v.r.nasceram).toBe(PUBLICO_GRADE);
    expect(v.r.nasceuAVista).toEqual([]);
    expect(v.r.saltos).toEqual([]);
    expect(t.every((c) => !c.teleportes)).toBe(true);
    for (const c of t) {
      const k = c.morador!.n - N0_PUBLICO;
      expect(Math.hypot(c.x - pub.grade[k][0], c.z - pub.grade[k][2]), `morador ${k}`).toBeLessThan(
        1.2,
      );
    }
  });

  it('o fluxo do dono: o show acaba e ele olha a turma ir embora pelo portão: ninguém some à vista', () => {
    const { n, p, pub, grade, v } = noShow();
    depurar(n, { f: 'pularShow', s: CHAMADO + ESPERA_FINAL - 1 });
    v.passos(Math.ceil((APLAUSO + 2) / PASSO));
    expect(n.estado.vila!.vista().show).toBeNull();
    // ele se vira para o portão e fica olhando os 20 que vieram só para o show irem embora
    ir(n, 'ana', grade[0], p.h + 1, grade[1], NORTE);
    v.passos(Math.ceil(50 / PASSO));
    // foram andando: já passaram do portão, e ninguém sumiu (ele está olhando)
    expect(v.r.sumiram).toBe(0);
    const indo = turma(n).filter((c) => c.morador!.n - N0_PUBLICO >= PUBLICO_DA_NOITE);
    expect(indo).toHaveLength(PUBLICO_GRADE - PUBLICO_DA_NOITE);
    const F = p.zonas.festival;
    const fora = indo.filter((c) => c.z < F.z0 || c.x < F.x0);
    expect(fora).toHaveLength(indo.length);
    // ele vai atrás até o portão e olha a rua: continuam andando para casa, pela calçada
    ir(n, 'ana', pub.portao[0], p.h + 1, pub.portao[2] - 5, Math.PI * 1.5);
    v.passos(Math.ceil(90 / PASSO));
    expect(v.r.sumiuAVista).toEqual([]);
    expect(v.r.saltos).toEqual([]);
    // quem ele ainda vê está andando ou já no quintal de casa (de papo), nunca parado no portão
    for (const c of turma(n).filter((q) => q.morador!.n - N0_PUBLICO >= PUBLICO_DA_NOITE)) {
      const k = c.morador!.n - N0_PUBLICO;
      const casa = pub.casa(k);
      const emCasa = Math.hypot(c.x - casa[0], c.z - casa[2]) < 1.5;
      expect(emCasa || Math.hypot(c.x - pub.portao[0], c.z - pub.portao[2]) > 6, `morador ${k}`).toBe(
        true,
      );
    }
    // ele volta para a grade olhando o palco: os quintais ficam de lado (a conta do núcleo não
    // arrisca), e quem chegou em casa fica lá, de papo
    ir(n, 'ana', grade[0], p.h + 1, grade[1], SUL);
    v.passos(Math.ceil(120 / PASSO));
    expect(v.r.sumiuAVista).toEqual([]);
    for (const c of turma(n).filter((q) => q.morador!.n - N0_PUBLICO >= PUBLICO_DA_NOITE)) {
      const casa = pub.casa(c.morador!.n - N0_PUBLICO);
      expect(Math.hypot(c.x - casa[0], c.z - casa[2])).toBeLessThan(1.5);
    }
    // ele vira as costas para as casas: aí sim, quem já foi embora sai do mundo
    ir(n, 'ana', grade[0], p.h + 1, grade[1], Math.PI / 2);
    v.passos(Math.ceil(10 / PASSO));
    expect(turma(n)).toHaveLength(PUBLICO_DA_NOITE);
    expect(v.r.sumiram).toBe(PUBLICO_GRADE - PUBLICO_DA_NOITE);
    expect(v.r.sumiuAVista).toEqual([]);
    expect(v.r.saltos).toEqual([]);
    // todo mundo sumiu longe de onde ele estava
    expect(Math.min(...v.r.distAoSumir)).toBeGreaterThan(PERTO_VE);
    expect(turma(n).every((c) => !c.teleportes)).toBe(true);
  });

  it('o dia chega: os que não ficam vão para casa andando; girando a câmera para todo lado, ninguém some à vista', () => {
    const { n, p, grade, v } = noShow();
    depurar(n, { f: 'pularShow', s: CHAMADO + ESPERA_FINAL - 1 });
    v.passos(Math.ceil((APLAUSO + 2) / PASSO));
    depurar(n, { f: 'hora', hora: DIA });
    // a criança brinca no campo, andando e girando a câmera sem parar, por 4 minutos
    v.passos(Math.ceil(240 / PASSO), (i) => {
      if (i % 10) return;
      const a = i * 0.004;
      ir(n, 'ana', grade[0] + Math.sin(a) * 9, p.h + 1, grade[1] - 9 + Math.cos(a) * 7, i * 0.013);
    });
    expect(v.r.sumiuAVista).toEqual([]);
    expect(v.r.nasceuAVista).toEqual([]);
    expect(v.r.saltos).toEqual([]);
    // quem foi embora e saiu do mundo saiu longe dela
    if (v.r.distAoSumir.length) expect(Math.min(...v.r.distAoSumir)).toBeGreaterThan(PERTO_VE);
  });

  it('com um amigo olhando para o outro lado, vale a vista dos dois', () => {
    const { n, p, pub, grade, v } = noShow(['ana', 'bia']);
    depurar(n, { f: 'pularShow', s: CHAMADO + ESPERA_FINAL - 1 });
    v.passos(Math.ceil((APLAUSO + 2) / PASSO));
    // a Ana olha o palco; a Bia fica na calçada das casas, olhando a rua de casa
    ir(n, 'ana', grade[0], p.h + 1, grade[1], SUL);
    ir(n, 'bia', p.ox + 22.5, p.h + 1, p.oz + 72, SUL);
    v.passos(Math.ceil(150 / PASSO));
    expect(v.r.sumiuAVista).toEqual([]);
    expect(v.r.saltos).toEqual([]);
    // a Bia vê os quintais: quem chegou em casa fica lá, de papo
    const emCasa = turma(n).filter((c) => {
      const casa = pub.casa(c.morador!.n - N0_PUBLICO);
      return Math.hypot(c.x - casa[0], c.z - casa[2]) < 1.5;
    });
    expect(emCasa.length).toBeGreaterThanOrEqual(6);
  });
});

describe('spec 026: os bichos que saem do festival', () => {
  it('saem andando pelo portão e continuam no mundo: nenhum some nem salta à vista', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    const zona = zonaSemBichos(p);
    // a criança na calçada do portão, olhando para dentro do festival
    ir(n, 'ana', pub.portao[0] + 3, p.h + 1, p.zonas.festival.z0 - 5, SUL);
    for (let i = 0; i < 20; i++) n.passo();
    const bichos = [
      n.estado.populacao.adicionar('coelho', pub.meio[0], p.h + 1, pub.meio[1]),
      n.estado.populacao.adicionar('cervo', p.ox + 45, p.h + 1, p.oz + 80),
      n.estado.populacao.adicionar('coelho', p.ox + 52, p.h + 1, p.oz + 88),
      n.estado.populacao.adicionar('raposa', p.ox + 66, p.h + 1, p.oz + 84),
    ];
    const ids = new Set(bichos.map((b) => b.id));
    const v = vigiar(n, (c) => ids.has(c.id));
    v.passos(Math.ceil(180 / PASSO));
    expect(v.r.sumiram).toBe(0);
    expect(v.r.saltos).toEqual([]);
    for (const b of bichos) {
      expect(n.estado.populacao.lista).toContain(b);
      expect(zona.dentro(b.x, b.z), `${b.tipo} em ${b.x - p.ox},${b.z - p.oz}`).toBe(false);
    }
  });
});
