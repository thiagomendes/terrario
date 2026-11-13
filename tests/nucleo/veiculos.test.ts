import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { cidadeDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparCidades } from '../../src/world/cidade';
import { limparPovoados } from '../../src/world/povoado';
import { definirObrasFeitas } from '../../src/world/obras';
import type { Comando, Quadro } from '../../src/nucleo/protocolo';
import {
  FROTA,
  MEDIDAS,
  MODELO_DO_TIPO,
  noPlano,
  poseDoVeiculo,
  rotaDoVeiculo,
  type PlanoVeiculo,
} from '../../src/jogo/veiculos';
import { corpoNaRua } from '../../src/jogo/transito';

/**
 * Spec 014 (T13): os veículos no núcleo (servidor e modo local). O quadro leva o relógio dos
 * veículos e os planos (inteiros para quem chega, depois só os que mudaram); duas crianças
 * recebem os mesmos; a conta do plano no cliente dá a posição do núcleo; o carro para para a
 * criança (telemetria de verdade) e buzina; o bicho parado na rua sai dela; nada vai no
 * salvamento; e fora da cidade não existe nada disso.
 */
const SEMENTE = 1337;
beforeAll(() => {
  definirEstiloMundo(obterTema('cidade-grande').mundo);
  limparCidades();
  limparPovoados();
});
afterAll(() => {
  definirObrasFeitas([]);
  definirEstiloMundo(ESTILO_PADRAO);
  limparCidades();
  limparPovoados();
});

function tel(x: number, y: number, z: number): Comando {
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
    slot: 0,
  };
}

function abrir(dados?: unknown): Nucleo {
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: 'ana',
    dados: (dados ?? { versao: 1, edicoes: [], jogador: null, hora: 0.45, extras: {} }) as never,
  });
  return n;
}

/** O que o cliente faz com os quadros: guarda os planos e calcula a posição no relógio. */
function replica() {
  const planos = new Map<number, PlanoVeiculo>();
  let t = 0;
  return {
    receber(q: Quadro) {
      if (!q.veiculos) return;
      t = q.veiculos.t;
      for (const p of q.veiculos.p ?? []) planos.set(p.id, p);
    },
    s(id: number) {
      return noPlano(planos.get(id)!, t).s;
    },
    get tamanho() {
      return planos.size;
    },
  };
}

describe('veículos no núcleo da cidade', () => {
  it('quadro leva o relógio e os planos: inteiros para quem chega, depois só os que mudaram', () => {
    const n = abrir();
    n.conectar('ana');
    n.passo();
    const q1 = n.quadros().get('ana')!;
    expect(q1.veiculos?.p?.length).toBe(FROTA.length);
    let comMudanca = 0;
    let semPlano = 0;
    for (let i = 0; i < 400; i++) {
      n.passo();
      const q = n.quadros().get('ana')!;
      expect(q.veiculos).toBeDefined();
      if (q.veiculos!.p) {
        comMudanca++;
        expect(q.veiculos!.p.length).toBeLessThan(FROTA.length);
      } else semPlano++;
    }
    // poucos quadros com plano novo
    expect(comMudanca).toBeGreaterThan(0);
    expect(semPlano).toBeGreaterThan(comMudanca * 3);
  });

  it('duas crianças recebem os mesmos planos e a conta do cliente dá a posição do núcleo', () => {
    const n = abrir();
    n.conectar('ana');
    n.conectar('bia');
    const ra = replica();
    const rb = replica();
    for (let i = 0; i < 600; i++) {
      n.passo();
      const qs = n.quadros();
      const qa = qs.get('ana')!;
      const qb = qs.get('bia')!;
      // iguais (menos no quadro em que a bia volta: ela recebe todos os planos de novo)
      if (!qb.primeiro) expect(JSON.stringify(qa.veiculos)).toBe(JSON.stringify(qb.veiculos));
      ra.receber(qa);
      rb.receber(qb);
      // a bia entra no meio: recebe tudo e fica igual
      if (i === 300) n.reiniciarQuadros('bia');
    }
    const tr = n.estado.transito!;
    for (const v of tr.veiculos) {
      expect(ra.s(v.id)).toBeCloseTo(v.s, 2);
      expect(rb.s(v.id)).toBeCloseTo(v.s, 2);
    }
  });

  it('a criança na frente do carro: ele para sem encostar e dá um fom-fom', () => {
    const n = abrir();
    n.conectar('ana');
    n.passo();
    n.quadros();
    const p = cidadeDoMundo(SEMENTE)!;
    const tr = n.estado.transito!;
    // na frente do táxi, 12 blocos adiante na faixa
    const v = tr.veiculos.find((x) => x.tipo === 'taxi')!;
    const m = MEDIDAS[MODELO_DO_TIPO[v.tipo]];
    const alvo = poseDoVeiculo(rotaDoVeiculo(p, FROTA[v.id]), { ...m, apoio: 0 }, v.s + 12);
    const buzinas: number[] = [];
    for (let i = 0; i < 20 * 20; i++) {
      if (i % 4 === 0) n.comando('ana', tel(alvo.x, p.h + 1, alvo.z));
      n.passo();
      for (const e of n.quadros().get('ana')!.eventos ?? [])
        if (e.e === 'veiculo' && e.id === v.id && e.o === 'buzina') buzinas.push(i);
    }
    const agora = tr.veiculos[v.id];
    expect(agora.v).toBe(0);
    const d = Math.hypot(agora.pose.x - alvo.x, agora.pose.z - alvo.z) - m.meioComp;
    expect(d).toBeGreaterThan(1.5);
    expect(buzinas.length).toBeGreaterThan(0);
    expect(buzinas.length).toBeLessThanOrEqual(3);
  });

  it('bicho parado na rua por mais de 2 s ganha um destino fora dela', () => {
    const n = abrir();
    n.conectar('ana');
    n.passo();
    const p = cidadeDoMundo(SEMENTE)!;
    const pista = p.pistas[10];
    const x = pista.celulas.x0 + 0.5;
    const z = pista.celulas.z0 + 0.5;
    // a criança por perto (bicho longe de todo mundo some)
    n.comando('ana', tel(x + 6, p.h + 1, z));
    const c = n.estado.populacao.adicionar('coelho', x, p.h + 1, z);
    // segura o bicho parado na faixa (como se tivesse empacado ali) até ganhar outro destino
    let fora = false;
    for (let i = 0; i < 60 && !fora; i++) {
      c.x = x;
      c.z = z;
      c.vx = 0;
      c.vz = 0;
      if (i === 0) {
        c.alvoX = x;
        c.alvoZ = z;
      }
      n.passo();
      fora = !n.estado.transito!.pista(c.alvoX, c.alvoZ);
    }
    expect(fora).toBe(true);
  });

  it('nada dos veículos vai no salvamento (o relógio do mundo põe cada um no lugar)', () => {
    const n = abrir();
    n.conectar('ana');
    for (let i = 0; i < 100; i++) n.passo();
    const salvo = n.salvar();
    expect(JSON.stringify(salvo)).not.toMatch(/veicul|transito/i);
    // o mesmo mundo aberto de novo (servidor ou aparelho) começa com os mesmos planos
    const a = abrir({ versao: 1, edicoes: [], jogador: null, hora: 0.3, extras: { dia: 4 } });
    const b = abrir({ versao: 1, edicoes: [], jogador: null, hora: 0.3, extras: { dia: 4 } });
    expect(JSON.stringify(a.estado.transito!.planos())).toBe(
      JSON.stringify(b.estado.transito!.planos()),
    );
    // e outra hora põe a frota em outro lugar
    const c = abrir({ versao: 1, edicoes: [], jogador: null, hora: 0.6, extras: { dia: 4 } });
    expect(JSON.stringify(c.estado.transito!.planos())).not.toBe(
      JSON.stringify(a.estado.transito!.planos()),
    );
  });
});

describe('fora da cidade', () => {
  it('outro tema não tem veículo nenhum (nem no núcleo, nem no quadro)', () => {
    definirEstiloMundo(obterTema('rancho-alegre').mundo);
    limparCidades();
    limparPovoados();
    try {
      const n = criarNucleo({
        semente: SEMENTE,
        modo: 'criativo',
        versaoMundo: 2,
        confiarNoCliente: true,
      });
      n.conectar('ana');
      for (let i = 0; i < 5; i++) n.passo();
      expect(n.estado.transito).toBeNull();
      expect(n.quadros().get('ana')!.veiculos).toBeUndefined();
    } finally {
      definirEstiloMundo(obterTema('cidade-grande').mundo);
      limparCidades();
      limparPovoados();
    }
  });
});

describe('bichos e veículos no núcleo', () => {
  it('cachorros soltos perto das faixas: nenhum encosta num veículo e nenhum fica na rua', () => {
    const n = abrir();
    n.conectar('ana');
    n.passo();
    const p = cidadeDoMundo(SEMENTE)!;
    const tr = n.estado.transito!;
    const v = tr.veiculos.find((x) => x.tipo === 'taxi')!;
    const m = MEDIDAS[MODELO_DO_TIPO[v.tipo]];
    const r = rotaDoVeiculo(p, FROTA[v.id]);
    // a criança na calçada perto do táxi (os bichos longe de todo mundo somem)
    const q0 = poseDoVeiculo(r, { ...m, apoio: 0 }, v.s + 10);
    const cx = q0.x + q0.hz * 2.6;
    const cz = q0.z - q0.hx * 2.6;
    // seis cachorros grandes na frente dele, na faixa e na calçada, cada um olhando para um lado
    const caes = [6, 9, 12, 15, 18, 22].map((d, i) => {
      const q = poseDoVeiculo(r, { ...m, apoio: 0 }, v.s + d);
      const lado = [0, 1.7, -0.3, 1.5, 0.4, 2.2][i];
      const c = n.estado.populacao.adicionar(
        'cervo',
        q.x + q.hz * lado,
        p.h + 1,
        q.z - q.hx * lado,
      );
      c.yaw = c.yawAlvo = (i * Math.PI) / 3;
      return c;
    });
    const cortes: string[] = [];
    const naRua = new Map<number, number>();
    let maisTempoNaRua = 0;
    for (let i = 0; i < 90 * 20; i++) {
      if (i % 4 === 0) n.comando('ana', tel(cx, p.h + 1, cz));
      n.passo();
      n.quadros();
      for (const c of caes) {
        if (!n.estado.populacao.lista.includes(c)) continue;
        // o desenho do cachorro (o retângulo dele) contra a caixa de cada veículo
        const f = tr.folga({
          x: c.x,
          y: c.y,
          z: c.z,
          crianca: false,
          corpo: corpoNaRua('cervo', c.yaw),
        });
        if (f < -0.02) cortes.push(`cão ${c.id} t=${(i / 20).toFixed(1)} folga ${f.toFixed(2)}`);
        // segundos seguidos na faixa (passear por ela pode; ficar parado nela, não)
        const t = tr.pista(c.x, c.z) ? (naRua.get(c.id) ?? 0) + 1 / 20 : 0;
        naRua.set(c.id, t);
        maisTempoNaRua = Math.max(maisTempoNaRua, t);
      }
    }
    expect(cortes.slice(0, 5)).toEqual([]);
    // nenhum fica na faixa: em 2 s ganha um destino fora dela (logo, com veículo andando perto)
    expect(maisTempoNaRua).toBeLessThan(5);
    // e o táxi andou (ninguém o segura para sempre)
    expect(tr.veiculos[v.id].s).toBeGreaterThan(v.s + 10);
  });
});
