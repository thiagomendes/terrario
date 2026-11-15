import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { criarMundoSolido } from '../../src/world/solido';
import {
  caixasDaPeca,
  comPecasDaVila,
  indiceDaVila,
  pecaSolida,
} from '../../src/world/vilaSolidos';
import type { PecaVila, PlanoVila } from '../../src/world/vilaNeon';
import {
  ALTURA_JOGADOR,
  MEIA_LARGURA,
  colideCorpo,
  criarJogador,
  passoFisica,
  type CaixaSolida,
  type EstadoJogador,
  type Solido,
} from '../../src/player/fisica';
import { CRIATURAS, type Criatura } from '../../src/jogo/criaturas';
import {
  contatoComCorpo,
  corpoDoDesenho,
  desencostar,
  type CorpoNoChao,
} from '../../src/jogo/contato';
import { PASSO, type Comando } from '../../src/nucleo/protocolo';
import { FENO } from '../../src/nucleo/vila';
import { Bloco } from '../../src/world/blocks';

/**
 * Spec 026, o pedido do dono: "notei em vários momentos o personagem atravessando objetos e
 * bichos". As peças da Vila Neon seguram no núcleo (a mesma conta do aparelho), e um robô anda o
 * bairro inteiro pelas ruas e para dentro de cada tipo de peça, com o núcleo rodando os
 * moradores e as lhamas: o corpo dele nunca entra numa caixa e nunca fica dentro de um bicho
 * mais que um instante. As lhamas que seguem o feno nunca prendem a criança num corredor.
 */
const VILA = obterTema('vila-neon');
const SEMENTE = 4242;
const DT = PASSO;
let plano: PlanoVila;
beforeAll(() => {
  definirEstiloMundo(VILA.mundo);
  limparPovoados();
  plano = vilaDoMundo(SEMENTE)!;
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function tel(j: EstadoJogador, slot = 0): Comando {
  return {
    t: 'jogador',
    x: j.x,
    y: j.y,
    z: j.z,
    yaw: 0,
    pitch: 0,
    olhos: j.y + 1.62,
    noChao: j.noChao,
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

function abrir(): Nucleo {
  definirEstiloMundo(VILA.mundo);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: 'ana',
  });
  n.conectar('ana', { perfil: { apelido: 'ana', aparencia: {} } });
  return n;
}

const entra = (c: CaixaSolida, j: { x: number; y: number; z: number }) =>
  Math.min(
    j.x + MEIA_LARGURA - c[0],
    c[3] - (j.x - MEIA_LARGURA),
    j.z + MEIA_LARGURA - c[2],
    c[5] - (j.z - MEIA_LARGURA),
    j.y + ALTURA_JOGADOR - c[1],
    c[4] - j.y,
  );

/**
 * O robô: anda como o aparelho anda (a física do jogo contra o mundo sólido do núcleo), tira o
 * corpo de dentro dos bichos como a tela tira (o desenho do tema), manda a posição ao núcleo e
 * o núcleo dá um passo. Mede a pior entrada numa caixa de peça e o maior tempo dentro de um bicho.
 */
function criarRobo(n: Nucleo, slot = 0) {
  const s: Solido = n.estado.mundo.solido;
  const caixas = indiceDaVila(plano).caixas;
  const j = criarJogador(plano.nascimento.x, plano.h + 1, plano.nascimento.z);
  const medidas = new Map<string, [number, number, number]>();
  const corpo = (c: Criatura): CorpoNoChao => {
    const k = `${c.tipo}:${c.morador?.profissao ?? ''}`;
    let m = medidas.get(k);
    if (!m) {
      const pecas =
        c.tipo === 'morador'
          ? VILA.povoado!.moradores[c.morador?.profissao ?? 'construtor']
          : VILA.criaturas[c.tipo];
      m = corpoDoDesenho(pecas, CRIATURAS[c.tipo].mw);
      medidas.set(k, m);
    }
    return {
      x: c.x,
      y: c.y,
      z: c.z,
      alt: CRIATURAS[c.tipo].alt,
      frente: m[0],
      lado: m[1],
      meio: m[2],
      yaw: c.yaw,
    };
  };
  const dentroDe = new Map<number, number>();
  const r = {
    j,
    piorCaixa: 0,
    piorCaixaOnde: '',
    /** O maior tempo seguido (s) com o corpo dentro de um bicho (mais que 0,15 de entrada). */
    piorBicho: 0,
    piorBichoQuem: '',
    /** Quantas vezes encostou num bicho (o teste viu bicho de verdade). */
    encostos: 0,
    levar(x: number, y: number, z: number) {
      j.x = x;
      j.y = y;
      j.z = z;
      j.vy = 0;
      j.noChao = false;
      n.estado.jogadores.get('ana')!.saltoPermitido = true;
      n.comando('ana', tel(j, slot));
    },
    /** Um passo andando para (ax, az) (ou parado). */
    passo(ax?: number, az?: number, onde = '') {
      const anda = ax !== undefined && az !== undefined && Math.hypot(ax - j.x, az - j.z) > 0.05;
      const yaw = anda ? Math.atan2(ax! - j.x, az! - j.z) : 0;
      passoFisica(
        j,
        {
          frente: anda ? 1 : 0,
          direita: 0,
          pular: false,
          correr: false,
          yaw,
          puloAutomatico: true,
        },
        DT,
        s,
      );
      const bichos = n.estado.populacao.lista.filter(
        (c) => c.tipo !== 'peixe' && c.estado !== 'morrendo',
      );
      const corpos = bichos.map(corpo);
      desencostar(
        j,
        corpos,
        DT,
        s,
        MEIA_LARGURA,
        ALTURA_JOGADOR,
        anda ? Math.sin(yaw) : 0,
        anda ? Math.cos(yaw) : 0,
      );
      for (const c of caixas) {
        const e = entra(c, j);
        if (e > r.piorCaixa) {
          r.piorCaixa = e;
          r.piorCaixaOnde = `${onde} (${j.x.toFixed(2)}, ${j.y.toFixed(2)}, ${j.z.toFixed(2)})`;
        }
      }
      bichos.forEach((c, i) => {
        const q = corpos[i];
        const vert = j.y < q.y + q.alt && j.y + ALTURA_JOGADOR > q.y;
        const k = vert ? contatoComCorpo(j.x, j.z, MEIA_LARGURA, q) : null;
        if (k) r.encostos++;
        if (k && k.pen > 0.15) {
          const t = (dentroDe.get(c.id) ?? 0) + DT;
          dentroDe.set(c.id, t);
          if (t > r.piorBicho) {
            r.piorBicho = t;
            r.piorBichoQuem = `${c.tipo} ${c.id} ${onde}`;
          }
        } else dentroDe.delete(c.id);
      });
      n.comando('ana', tel(j, slot));
      n.passo();
    },
    /** Anda até (ax, az) ou até `seg` segundos; devolve se chegou (a 0,3). */
    ir(ax: number, az: number, seg: number, onde = ''): boolean {
      for (let t = 0; t < seg; t += DT) {
        if (Math.hypot(ax - j.x, az - j.z) < 0.3) return true;
        r.passo(ax, az, onde);
      }
      return Math.hypot(ax - j.x, az - j.z) < 0.3;
    },
  };
  return r;
}

const X = (u: number) => plano.ox + u + 0.5;
const Z = (v: number) => plano.oz + v + 0.5;

describe('spec 026: as peças e os bichos da Vila Neon seguram (núcleo e aparelho)', () => {
  it('o núcleo e o aparelho veem as mesmas peças (a mesma conta, célula por célula)', () => {
    const n = abrir();
    const doNucleo = n.estado.mundo.solido;
    const doAparelho = comPecasDaVila(criarMundoSolido(SEMENTE), SEMENTE);
    let tomadas = 0;
    for (const c of indiceDaVila(plano).caixas)
      for (let x = Math.floor(c[0]) - 1; x <= Math.floor(c[3]) + 1; x++)
        for (let z = Math.floor(c[2]) - 1; z <= Math.floor(c[5]) + 1; z++)
          for (let y = Math.floor(c[1]); y < c[4]; y++) {
            expect(doAparelho(x, y, z)).toBe(doNucleo(x, y, z));
            expect(JSON.stringify(doAparelho.caixas?.(x, y, z))).toBe(
              JSON.stringify(doNucleo.caixas?.(x, y, z)),
            );
            if (doNucleo(x, y, z)) tomadas++;
          }
    expect(tomadas).toBeGreaterThan(500);
  });

  it('a criança bate no carro, na van, na barraca, no carrinho de pipoca e no rádio gigante e para encostada', () => {
    const n = abrir();
    const r = criarRobo(n);
    const s = n.estado.mundo.solido;
    /** Anda de 3 blocos para dentro da caixa pela face (dx, dz); devolve a folga final. */
    const bater = (c: CaixaSolida, dx: number, dz: number, y: number, onde: string) => {
      const mx = (c[0] + c[3]) / 2;
      const mz = (c[2] + c[5]) / 2;
      const fx = dx > 0 ? c[3] : dx < 0 ? c[0] : mx;
      const fz = dz > 0 ? c[5] : dz < 0 ? c[2] : mz;
      const sx = fx + dx * 3;
      const sz = fz + dz * 3;
      if (colideCorpo(s, sx, y + 0.02, sz, MEIA_LARGURA, ALTURA_JOGADOR)) return Infinity;
      r.levar(sx, y + 0.02, sz);
      for (let i = 0; i < 6; i++) r.passo(undefined, undefined, onde);
      r.ir(mx, mz, 2.5, onde);
      return dx ? Math.abs(r.j.x - fx) - MEIA_LARGURA : Math.abs(r.j.z - fz) - MEIA_LARGURA;
    };
    const alvo = (tipo: string, n?: number) =>
      plano.pecas.find((p) => p.tipo === tipo && (n === undefined || p.n === n))!;
    const folgas: Record<string, number> = {};
    for (const p of [
      alvo('carro', 0),
      alvo('carro', 1),
      alvo('van', 0),
      alvo('pipoca'),
      alvo('radio-gigante'),
    ]) {
      const [c] = caixasDaPeca(p);
      let melhor = Infinity;
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        melhor = Math.min(melhor, bater(c, dx, dz, p.y, p.tipo));
      folgas[`${p.tipo}${p.n ?? ''}`] = melhor;
    }
    // a barraca do lanche (blocos): o balcão da frente segura do mesmo jeito
    const b = alvo('balcao', 2);
    const balcao: CaixaSolida = [
      b.x - 2.5,
      plano.h + 1,
      b.z - 0.5,
      b.x + 2.5,
      plano.h + 2,
      b.z + 0.5,
    ];
    r.levar(b.x, plano.h + 1.02, b.z + 4);
    r.ir(b.x, b.z, 2.5, 'barraca');
    folgas.barraca = r.j.z - MEIA_LARGURA - balcao[5];
    for (const [k, f] of Object.entries(folgas)) {
      // encostou de verdade (nada de parar no ar antes da peça)
      expect(f, k).toBeLessThan(0.06);
      expect(f, k).toBeGreaterThan(-0.01);
    }
    expect(r.piorCaixa, r.piorCaixaOnde).toBeLessThanOrEqual(1e-3);
  });

  it('o robô anda o bairro pelas ruas e para dentro de cada tipo de peça: nunca entra numa caixa', () => {
    const n = abrir();
    const r = criarRobo(n);
    const s = n.estado.mundo.solido;
    const Y = plano.h + 1.02;
    // as ruas: a avenida de ponta a ponta, a rua da pracinha, a rua de trás
    const ruas: [number, number][][] = [
      [
        [2, 64.5],
        [178, 64.5],
      ],
      [
        [97.5, 2],
        [97.5, 148],
      ],
      [
        [2, 30.5],
        [91, 30.5],
      ],
    ];
    for (const rua of ruas) {
      r.levar(X(rua[0][0]), Y, Z(rua[0][1]));
      for (const [u, v] of rua.slice(1))
        expect(r.ir(X(u), Z(v), 60, `rua ${u},${v}`), `rua até ${u},${v}`).toBe(true);
    }
    // para dentro de cada tipo de peça: de 2,5 blocos fora de cada face, andando para o meio
    const tipos = new Map<string, PecaVila[]>();
    for (const p of plano.pecas)
      if (pecaSolida(p)) tipos.set(p.tipo, [...(tipos.get(p.tipo) ?? []), p]);
    const encostou = new Set<string>();
    for (const [tipo, lista] of tipos)
      for (const p of lista.slice(0, 3)) {
        const caixas = caixasDaPeca(p);
        const x0 = Math.min(...caixas.map((c) => c[0]));
        const z0 = Math.min(...caixas.map((c) => c[2]));
        const x1 = Math.max(...caixas.map((c) => c[3]));
        const z1 = Math.max(...caixas.map((c) => c[5]));
        const mx = (x0 + x1) / 2;
        const mz = (z0 + z1) / 2;
        for (const [dx, dz] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ]) {
          const sx = dx ? (dx > 0 ? x1 : x0) + dx * 2.5 : mx;
          const sz = dz ? (dz > 0 ? z1 : z0) + dz * 2.5 : mz;
          if (colideCorpo(s, sx, p.y + 0.02, sz, MEIA_LARGURA, ALTURA_JOGADOR)) continue;
          r.levar(sx, p.y + 0.02, sz);
          for (let i = 0; i < 6; i++) r.passo(undefined, undefined, tipo);
          r.ir(mx, mz, 2, `${tipo} ${p.x},${p.z} pela face ${dx},${dz}`);
          const folga = dx
            ? Math.abs(r.j.x - (dx > 0 ? x1 : x0)) - MEIA_LARGURA
            : Math.abs(r.j.z - (dz > 0 ? z1 : z0)) - MEIA_LARGURA;
          // encostou na face (ou, peça baixa como a piscininha, subiu nela como num degrau)
          const topo = Math.max(...caixas.map((c) => c[4]));
          if (folga < 0.08 || (topo - p.y <= 0.51 && r.j.y >= topo - 0.02)) encostou.add(tipo);
        }
      }
    expect(r.piorCaixa, r.piorCaixaOnde).toBeLessThanOrEqual(1e-3);
    // cada tipo foi encostado de verdade por pelo menos um lado (a caixa é justa)
    for (const tipo of tipos.keys()) expect(encostou.has(tipo), tipo).toBe(true);
  });

  it('bichos e moradores: o robô vai para cima de cada um e nunca fica dentro (sai de lado)', () => {
    const n = abrir();
    const r = criarRobo(n);
    const P = plano.pontos;
    const Y = plano.h + 1.02;
    // os moradores do chão (lanchonete, rinque) e as lhamas do cercadinho
    r.levar(P.postos.lanchonete[0], Y, P.postos.lanchonete[2] + 5);
    for (let i = 0; i < 40; i++) r.passo();
    const c = P.cercado;
    const visitas: [number, number, number][] = [
      P.postos.lanchonete,
      P.postos.danca,
      P.postos.patinador,
      [(c.x0 + c.x1 + 1) / 2, Y, (c.z0 + c.z1 + 1) / 2],
    ];
    for (const [px, , pz] of visitas) {
      r.levar(px + 4, Y, pz + 4);
      for (let i = 0; i < 60; i++) r.passo();
      // cada bicho e morador perto: vai reto para o meio dele, por uns segundos
      const perto = n.estado.populacao.lista.filter(
        (b) => b.tipo !== 'peixe' && Math.hypot(b.x - px, b.z - pz) < 8,
      );
      for (const b of perto) {
        for (let t = 0; t < 3; t += DT) r.passo(b.x, b.z, `${b.tipo} ${b.id}`);
        for (let t = 0; t < 1; t += DT) r.passo(b.x + 3, b.z + 3, `${b.tipo} ${b.id} saindo`);
      }
    }
    expect(r.encostos, 'encostou em algum bicho').toBeGreaterThan(20);
    expect(r.piorBicho, r.piorBichoQuem).toBeLessThan(0.5);
    expect(r.piorCaixa, r.piorCaixaOnde).toBeLessThanOrEqual(1e-3);
  });

  it('f2: as lhamas seguem o feno até o fundo de um corredor e, na volta, nunca prendem a criança', () => {
    const n = abrir();
    n.passo();
    n.comando('ana', { t: 'almaFixar', missao: 'f2' });
    const P = plano.pontos;
    const c = P.cercado;
    const mx = (c.x0 + c.x1 + 1) / 2;
    const mz = (c.z0 + c.z1 + 1) / 2;
    const Y = plano.h + 1.02;
    // um corredor de um bloco de largura, sem saída, no gramado do lado do cercadinho
    const cu = 87;
    const v0 = 90;
    const v1 = 97;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let v = v0; v <= v1 + 1; v++)
      for (const y of [plano.h + 1, plano.h + 2]) {
        for (const du of [-1, 1])
          lote.push({ x: plano.ox + cu + du, y, z: plano.oz + v, v: Bloco.TIJOLOS_PEDRA });
        lote.push({
          x: plano.ox + cu,
          y,
          z: plano.oz + v,
          v: v > v1 ? Bloco.TIJOLOS_PEDRA : Bloco.AR,
        });
      }
    n.comando('ana', { t: 'editar', id: 1, lote });
    const r = criarRobo(n);
    r.levar(mx, Y, mz + 1);
    for (let i = 0; i < 40; i++) r.passo();
    const ana = n.estado.jogadores.get('ana')!;
    expect(ana.inventario.contar(FENO)).toBeGreaterThan(0);
    let slot = 0;
    for (let i = 0; i < 9; i++) if (ana.inventario.obter(i)?.item === FENO) slot = i;
    const robo = criarRobo(n, slot);
    robo.levar(r.j.x, r.j.y, r.j.z);
    // sai do cercadinho, entra no corredor e vai até o fundo (as lhamas vêm atrás)
    expect(robo.ir(P.portaoCercado[0], P.portaoCercado[2] + 1, 20, 'saindo do cercado')).toBe(true);
    expect(robo.ir(X(cu - 2), Z(v0 - 5), 20, 'ao lado do cercado')).toBe(true);
    // na frente da boca do corredor, espera as lhamas chegarem atrás, e entra devagar
    expect(robo.ir(X(cu), Z(v0 - 5), 20, 'até a boca do corredor')).toBe(true);
    for (let i = 0; i < 100; i++) robo.passo();
    for (let v = v0 - 4; v <= v1; v++) {
      expect(robo.ir(X(cu), Z(v), 5, 'entrando no corredor')).toBe(true);
      for (let i = 0; i < 6; i++) robo.passo();
    }
    for (let i = 0; i < 80; i++) robo.passo();
    const noCorredor = n.estado.populacao.lista.filter(
      (b) => b.tipo === 'cervo' && Math.abs(b.x - X(cu)) < 0.6 && b.z > Z(v0) - 0.5 && b.z < Z(v1),
    );
    // pelo menos uma lhama entrou atrás da criança e tampa a saída
    expect(noCorredor.length).toBeGreaterThan(0);
    // meia-volta: a criança sai do corredor passando por elas (elas dão passagem, andando para trás)
    const antes = robo.encostos;
    // (dez blocos em até 8 s: a lhama anda para trás na frente dela, sem tampar a saída)
    const voltou = robo.ir(X(cu), Z(v0 - 2), 8, 'voltando pelas lhamas');
    expect(voltou).toBe(true);
    expect(robo.encostos - antes, 'encostou nas lhamas no corredor').toBeGreaterThan(5);
    expect(robo.piorBicho, robo.piorBichoQuem).toBeLessThan(0.5);
    expect(robo.piorCaixa, robo.piorCaixaOnde).toBeLessThanOrEqual(1e-3);
    // nenhuma lhama foi parar em cima do muro (dar passagem nunca empurra para dentro de bloco)
    for (const b of n.estado.populacao.lista.filter((q) => q.tipo === 'cervo'))
      expect(b.y).toBeLessThan(plano.h + 1.6);
  });
});
