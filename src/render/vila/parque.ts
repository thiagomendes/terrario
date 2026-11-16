/**
 * O Parque de diversões da Vila Neon na tela (spec 026, parte 2): o que gira e o que responde
 * ao toque. A conta de onde está cada cadeira é de `src/jogo/parque.ts` (o relógio do mundo: todo
 * mundo vê igual); aqui ficam as malhas.
 *
 * - **a roda-gigante:** os cavaletes parados, a roda que gira (aros de gomos, raios, lâmpadas) e
 *   as oito cadeirinhas sempre em pé, balançando de leve; no toque, as lâmpadas piscam;
 * - **o carrossel:** o deque, a coluna, o toldo de duas cores e os oito cavalinhos subindo e
 *   descendo nos mastros; no toque, as lâmpadas correm em volta;
 * - **o bate-bate:** os seis carrinhos rodando a pista, a faísca na ponta da haste, o "tum" (o
 *   carrinho da frente balança e solta estrelinhas; quem bateu dá um tranquinho);
 * - **os brinquedos de tocar:** os balões sobem um pouco, a argola voa e cai no pino (sempre
 *   acerta), o peixinho pula da tina, a pipoca estoura, a cuba do algodão-doce gira e a nuvem
 *   cresce no palito.
 *
 * Tudo só com o chão de TODOS os pedaços onde a peça pisa desenhado (a regra do campo de visão)
 * e com um número fixo de malhas (nada é criado depois do começo): cadeirinhas, cavalinhos,
 * faíscas e estrelinhas são instâncias finas (uma chamada de desenho por molde).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila } from '../../world/vilaNeon';
import {
  CADEIRAS,
  DURA_TUM,
  anguloDaRoda,
  eixoDaCadeirinha,
  impulsoDaVista,
  lugarDaCadeira,
  VOLTA_CARROSSEL,
  type ParqueVista,
} from '../../jogo/parque';
import { COR, Ref, perfilEstrela, type Desenho } from './ref';
import { criarPaletaLuz, type PaletaLuz } from './luzes';
import {
  BALCAO_BARRACA,
  CARROSSEL,
  CUBA_ALGODAO,
  MESA_ARGOLA,
  PINOS_ARGOLA,
  PONTA_BALOES,
  TINA_PESCA,
  aro,
  cadeirinha,
  carrinho,
  carrosselQueGira,
  cavalinho,
  luzesDaRoda,
  luzesDoBate,
  luzesDoCarrinho,
  luzesDoCarrossel,
  macoDeBaloes,
  mioloAlgodao,
  nuvemAlgodao,
  peixinho,
  pesDaRoda,
  rodaQueGira,
} from './pecasParque';

export type ToqueParque =
  | 'roda'
  | 'carrossel'
  | 'baloes'
  | 'argola'
  | 'pescaria'
  | 'pipoca'
  | 'algodao';

/** Uma partícula do jogo (o mesmo formato do `fx/particulas`). */
export interface Faisca {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  cor: [number, number, number];
  tipo?: number;
}

export interface OpcoesParqueVila {
  temMalha(cx: number, cz: number): boolean;
  brilha?(m: Mesh): void;
  tapaOGlow?(m: Mesh): void;
  /** Solta partículas do jogo (a pipoca, o algodão, o respingo da pescaria). */
  emitir?(lista: Faisca[], tipo: 'confete' | 'gota'): void;
}

export interface RenderParque {
  /** Uma vez por quadro: `t` é o relógio da tela (s) e `tNucleo` o do mundo. */
  quadro(t: number, tNucleo: number, vista: ParqueVista | null, x: number, z: number): void;
  /** O toque num brinquedo (a resposta na tela; o som é do `somParque`). */
  tocar(qual: ToqueParque, i?: number): void;
  /** O "tum" do bate-bate: o carrinho `alvo` balança e solta estrelinhas; o `de` dá o tranco. */
  tum(alvo: number, de: number): void;
  /** Testes: o que está à vista e mexendo. */
  estado(): {
    roda: boolean;
    carrossel: boolean;
    bate: boolean;
    anguloRoda: number;
    piscando: boolean;
    correndo: boolean;
    baloes: number;
    argolasNoPino: number;
    peixePulando: boolean;
    algodao: number;
    estrelinhas: number;
    malhas: number;
    triangulos: number;
  };
  descartar(): void;
}

const N_ESTRELAS = 14;
const DURA_PISCA = 1.6;
const DURA_CORRE = 3.2;
const DURA_BALOES = 1.8;
const VOO_ARGOLA = 0.75;
const FICA_ARGOLA = 3.2;
const DURA_PEIXE = 0.9;
const DURA_ALGODAO = 2.4;
const FICA_ALGODAO = 2.2;
/** Mais longe que isto (blocos) o parque não desenha as peças que mexem. */
const LONGE = 96;

const desenhoMundo = (): Desenho => ({
  corpo: new Pecas(),
  luz: new Pecas(),
  noite: new Pecas(),
  vidro: new Pecas(),
  quadros: [],
  ox: 0,
  oz: 0,
  chao: 0,
  recorte: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity },
});
const NA_ORIGEM = { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 } as PecaVila;

export function criarParqueVila(
  scene: Scene,
  plano: PlanoVila,
  opcoes: OpcoesParqueVila,
): RenderParque {
  const pq = plano.pontos.parque;
  const Y = plano.h + 1;
  const todas: Mesh[] = [];
  const pl = criarPlasticos(scene, 'vila-parque');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  // três tintas acesas: a de sempre, a da roda e a do carrossel (cada uma pisca sozinha)
  const paleta = criarPaletaLuz(scene, 'vila-parque-luz');
  const paletaRoda = criarPaletaLuz(scene, 'vila-parque-luz-roda');
  const paletaCarrossel = criarPaletaLuz(scene, 'vila-parque-luz-carrossel');
  const ligar = (m: Mesh | null, ver: boolean) => {
    if (m && m.isEnabled() !== ver) m.setEnabled(ver);
  };
  const malhaCorpo = (nome: string, pecas: Pecas): Mesh => {
    const m = new Mesh(nome, scene);
    pecas.juntar().applyToMesh(m);
    m.material = matCorpo;
    m.isPickable = false;
    m.receiveShadows = true;
    m.setEnabled(false);
    opcoes.tapaOGlow?.(m);
    todas.push(m);
    return m;
  };
  const malhaLuz = (nome: string, pecas: Pecas, p: PaletaLuz = paleta): Mesh => {
    const m = new Mesh(nome, scene);
    const vd = pecas.juntar();
    p.aplicar(vd);
    vd.applyToMesh(m);
    m.material = p.material;
    m.isPickable = false;
    m.setEnabled(false);
    opcoes.brilha?.(m);
    todas.push(m);
    return m;
  };
  /** Um molde em 0, 0, 0 (o corpo e, se houver, as luzes). */
  const molde = (desenhar: (r: Ref) => void) => {
    const d = desenhoMundo();
    desenhar(new Ref(d, NA_ORIGEM));
    return d;
  };
  /** Uma peça no lugar dela no mundo. */
  const noMundo = (p: PecaVila, desenhar: (r: Ref) => void) => {
    const d = desenhoMundo();
    desenhar(new Ref(d, p));
    return d;
  };
  /** Instâncias finas: `n` cópias do molde, cada uma com a matriz dela (atualizada por quadro). */
  const instancias = (m: Mesh, n: number) => {
    const buf = new Float32Array(16 * n);
    Matrix.Identity().copyToArray(buf, 0);
    for (let i = 1; i < n; i++) buf.copyWithin(i * 16, 0, 16);
    m.thinInstanceSetBuffer('matrix', buf, 16, false);
    m.alwaysSelectAsActiveMesh = true;
    return buf;
  };
  const q = new Quaternion();
  const pos = new Vector3();
  const esc = new Vector3(1, 1, 1);
  const mat = new Matrix();
  /** Escreve a matriz `i`: o lugar, o giro em y e o balanço (rolar em z, arfar em x). */
  const por = (
    buf: Float32Array,
    i: number,
    x: number,
    y: number,
    z: number,
    yaw = 0,
    rolar = 0,
    arfar = 0,
    escala = 1,
  ) => {
    Quaternion.RotationYawPitchRollToRef(yaw, arfar, rolar, q);
    pos.set(x, y, z);
    esc.setAll(escala);
    Matrix.ComposeToRef(esc, q, pos, mat);
    mat.copyToArray(buf, i * 16);
  };
  /** O chão de todos os pedaços do retângulo está desenhado? */
  const temChao = (x0: number, z0: number, x1: number, z1: number) => {
    for (let cx = Math.floor(x0 / 16); cx <= Math.floor(x1 / 16); cx++)
      for (let cz = Math.floor(z0 / 16); cz <= Math.floor(z1 / 16); cz++)
        if (!opcoes.temMalha(cx, cz)) return false;
    return true;
  };
  const peca = (tipo: PecaVila['tipo']) => plano.pecas.find((p) => p.tipo === tipo) ?? null;

  // ------------------------------------------------------------------ a roda-gigante
  const R = pq.roda;
  const pecaRoda = peca('roda-gigante');
  const pes = pecaRoda ? noMundo(pecaRoda, pesDaRoda) : null;
  const rodaPes = pes ? malhaCorpo('vila-roda-pes', pes.corpo) : null;
  const rodaPesLuz = pes ? malhaLuz('vila-roda-pes-luz', pes.luz, paletaRoda) : null;
  const gira = molde(rodaQueGira);
  const rodaGira = malhaCorpo('vila-roda', gira.corpo);
  const rodaLuz = malhaLuz('vila-roda-luz', molde(luzesDaRoda).luz, paletaRoda);
  for (const m of [rodaGira, rodaLuz]) {
    m.position.set(R.x, R.y, R.z);
    // (a roda de pé no plano z-y: o molde, feito no plano x-y, vira um quarto de volta)
    if (R.eixo === 'z') m.rotation.y = -Math.PI / 2;
  }
  const cadeirinhas = [0, 1].map((v) => {
    const m = malhaCorpo(`vila-roda-cadeirinha-${v}`, molde((r) => cadeirinha(r, v)).corpo);
    return { m, buf: instancias(m, CADEIRAS.roda / 2) };
  });
  let piscaDesde = -Infinity;
  let anguloRoda = 0;

  // ------------------------------------------------------------------ o carrossel
  const C = pq.carrossel;
  const carrosselGira = malhaCorpo('vila-carrossel', molde(carrosselQueGira).corpo);
  const carrosselLuz = malhaLuz('vila-carrossel-luz', molde(luzesDoCarrossel).luz, paletaCarrossel);
  for (const m of [carrosselGira, carrosselLuz]) m.position.set(C.x, Y + 1, C.z);
  const cavalinhos = [0, 1].map((v) => {
    const m = malhaCorpo(`vila-carrossel-cavalinho-${v}`, molde((r) => cavalinho(r, v)).corpo);
    return { m, buf: instancias(m, CADEIRAS.carrossel / 2) };
  });
  let correDesde = -Infinity;

  // ------------------------------------------------------------------ o bate-bate
  const B = pq.bate;
  const pecaBate = peca('bate-bate');
  const bateLuz = pecaBate
    ? malhaLuz('vila-bate-lampadas', noMundo(pecaBate, luzesDoBate).luz)
    : null;
  const haste = Y + 5 - B.y;
  const carrinhos = Array.from({ length: CADEIRAS.bate }, (_, i) => {
    const m = malhaCorpo(`vila-bate-carrinho-${i}`, molde((r) => carrinho(r, i, haste)).corpo);
    return { m, buf: instancias(m, 1), tum: -Infinity, tranco: -Infinity };
  });
  const farois = malhaLuz('vila-bate-farois', molde(luzesDoCarrinho).luz);
  const bufFarois = instancias(farois, CADEIRAS.bate);
  // a faísca na ponta da haste (uma cruzinha branca-azulada que pisca)
  const faisca = malhaLuz(
    'vila-bate-faisca',
    molde((r) => {
      r.luz(0.34, 0.08, 0.08, 0, -0.04, 0, '#dff4ff');
      r.luz(0.08, 0.34, 0.08, 0, -0.17, 0, '#dff4ff');
      r.luz(0.08, 0.08, 0.34, 0, -0.04, 0, '#8fd8ff');
    }).luz,
  );
  const bufFaisca = instancias(faisca, CADEIRAS.bate);
  // as estrelinhas do "tum"
  const estrela = malhaLuz(
    'vila-bate-estrelinhas',
    molde((r) => r.placa(perfilEstrela(0.2), 0.06, 0, 0, 0, COR.amarelo, true)).luz,
  );
  const bufEstrela = instancias(estrela, N_ESTRELAS);
  const estrelas = Array.from({ length: N_ESTRELAS }, () => ({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    desde: -Infinity,
  }));
  let proxEstrela = 0;

  // ------------------------------------------------------------------ os balões
  const pecaBaloes = peca('baloes');
  const baloes = pecaBaloes ? malhaCorpo('vila-baloes', molde(macoDeBaloes).corpo) : null;
  if (baloes && pecaBaloes)
    baloes.position.set(pecaBaloes.x, pecaBaloes.y + PONTA_BALOES, pecaBaloes.z);
  let baloesDesde = -Infinity;

  // ------------------------------------------------------------------ as argolas
  const pecaArgola = peca('barraca-argola');
  const refArgola = pecaArgola ? new Ref(desenhoMundo(), pecaArgola) : null;
  const argolas = pecaArgola
    ? PINOS_ARGOLA.map((_, k) => ({
        m: malhaCorpo(
          `vila-argola-${k}`,
          molde((r) => aro(r, [COR.vermelho, COR.amarelo, COR.azul][k])).corpo,
        ),
        desde: -Infinity,
      }))
    : [];
  let proxArgola = 0;

  // ------------------------------------------------------------------ a pescaria
  const pecaPesca = peca('barraca-pesca');
  const refPesca = pecaPesca ? new Ref(desenhoMundo(), pecaPesca) : null;
  const peixes = pecaPesca
    ? [0, 1, 2].map((k) => ({
        m: malhaCorpo(`vila-peixinho-${k}`, molde((r) => peixinho(r, k)).corpo),
        desde: -Infinity,
      }))
    : [];
  let proxPeixe = 0;

  // ------------------------------------------------------------------ o algodão-doce
  const pecaAlgodao = peca('algodao');
  const refAlgodao = pecaAlgodao ? new Ref(desenhoMundo(), pecaAlgodao) : null;
  const miolo = pecaAlgodao ? malhaCorpo('vila-algodao-miolo', molde(mioloAlgodao).corpo) : null;
  const nuvem = pecaAlgodao ? malhaCorpo('vila-algodao-nuvem', molde(nuvemAlgodao).corpo) : null;
  if (refAlgodao && miolo && nuvem) {
    const [x, y, z] = refAlgodao.mundo(CUBA_ALGODAO.x, CUBA_ALGODAO.y - 0.04, CUBA_ALGODAO.z);
    miolo.position.set(x, y, z);
    nuvem.position.set(x, y + 0.1, z);
  }
  let algodaoDesde = -Infinity;
  let giroMiolo = 0;

  // ------------------------------------------------------------------ a pipoca
  const pipocas = plano.pecas.filter((p) => p.tipo === 'pipoca');

  let agora = 0;
  let ultimoNucleo = 0;
  let baloesSubindo = 0;
  let argolasNoPino = 0;
  let peixePulando = false;
  let algodaoTam = 0;
  let estrelasVivas = 0;
  const vendo = { roda: false, carrossel: false, bate: false };
  const cor = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16) / 255,
    parseInt(h.slice(3, 5), 16) / 255,
    parseInt(h.slice(5, 7), 16) / 255,
  ];

  return {
    tocar(qual, i = 0) {
      if (qual === 'roda') piscaDesde = agora;
      else if (qual === 'carrossel') correDesde = agora;
      else if (qual === 'baloes') baloesDesde = agora;
      else if (qual === 'argola') {
        // a próxima argola parada voa para o pino dela (sempre acerta)
        for (let k = 0; k < argolas.length; k++) {
          const a = argolas[(proxArgola + k) % argolas.length];
          if (agora - a.desde < VOO_ARGOLA + FICA_ARGOLA) continue;
          a.desde = agora;
          proxArgola = (proxArgola + k + 1) % argolas.length;
          break;
        }
      } else if (qual === 'pescaria') {
        const p = peixes[proxPeixe++ % Math.max(1, peixes.length)];
        if (p && agora - p.desde > DURA_PEIXE) {
          p.desde = agora;
          if (refPesca) {
            const [x, y, z] = refPesca.mundo(0, TINA_PESCA.y + 0.1, TINA_PESCA.z);
            opcoes.emitir?.(
              Array.from({ length: 8 }, (_, k) => {
                const a = (k / 8) * Math.PI * 2;
                return {
                  x: x + Math.cos(a) * 0.3,
                  y,
                  z: z + Math.sin(a) * 0.3,
                  vx: Math.cos(a) * 1.1,
                  vy: 2.4,
                  vz: Math.sin(a) * 1.1,
                  cor: cor('#8fe0f6'),
                };
              }),
              'gota',
            );
          }
        }
      } else if (qual === 'pipoca') {
        const p = pipocas[((i % pipocas.length) + pipocas.length) % pipocas.length];
        if (!p) return;
        opcoes.emitir?.(
          Array.from({ length: 14 }, (_, k) => {
            const a = (k / 14) * Math.PI * 2 + k;
            const v = 0.5 + ((k * 37) % 10) / 12;
            return {
              x: p.x + Math.cos(a) * 0.25,
              y: p.y + 1.9,
              z: p.z + Math.sin(a) * 0.25,
              vx: Math.cos(a) * v,
              vy: 2.6 + ((k * 13) % 7) / 5,
              vz: Math.sin(a) * v,
              cor: cor(k % 3 ? '#fff6d8' : '#ffe9a8'),
            };
          }),
          'confete',
        );
      } else if (qual === 'algodao') {
        if (agora - algodaoDesde > DURA_ALGODAO + FICA_ALGODAO) algodaoDesde = agora;
      }
    },
    tum(alvo, de) {
      const a = carrinhos[alvo];
      const d = carrinhos[de];
      if (a) a.tum = agora;
      if (d) d.tranco = agora;
      if (!a) return;
      // seis estrelinhas saem do carrinho que levou o "tum"
      const l = lugarDaCadeira(pq, 'bate', alvo, ultimoNucleo);
      for (let k = 0; k < 6; k++) {
        const e = estrelas[proxEstrela];
        proxEstrela = (proxEstrela + 1) % N_ESTRELAS;
        const ang = (k / 6) * Math.PI * 2 + alvo;
        e.x = l.x;
        e.y = l.y + 0.5;
        e.z = l.z;
        e.vx = Math.cos(ang) * 1.5;
        e.vy = 2.4 + (k % 2) * 0.7;
        e.vz = Math.sin(ang) * 1.5;
        e.desde = agora;
      }
    },
    quadro(t, tNucleo, vista, x, z) {
      const dt = agora > 0 ? Math.min(0.1, Math.max(0, t - agora)) : 0;
      agora = t;
      ultimoNucleo = tNucleo;
      const imp = impulsoDaVista(vista);
      const perto = (px: number, pz: number) => Math.hypot(px - x, pz - z) < LONGE;

      // ---- a roda-gigante
      const verRoda =
        perto(R.x, R.z) &&
        (R.eixo === 'x'
          ? temChao(R.x - R.raio - 1, R.z - 2, R.x + R.raio + 1, R.z + 2)
          : temChao(R.x - 2, R.z - R.raio - 1, R.x + 2, R.z + R.raio + 1));
      vendo.roda = verRoda;
      for (const m of [rodaPes, rodaPesLuz, rodaGira, rodaLuz, ...cadeirinhas.map((c) => c.m)])
        ligar(m, verRoda);
      if (verRoda) {
        anguloRoda = anguloDaRoda(tNucleo, imp);
        rodaGira.rotation.z = rodaLuz.rotation.z = anguloRoda;
        for (let i = 0; i < CADEIRAS.roda; i++) {
          const [px, py, pz] = eixoDaCadeirinha(R, i, tNucleo, imp);
          // a cadeirinha pende sempre em pé e balança de leve
          const balanca = Math.sin(t * 1.4 + i * 1.9) * 0.05;
          const c = cadeirinhas[i % 2];
          // (o banco olha ao longo da roda: o balanço é em torno do eixo dela)
          por(c.buf, i >> 1, px, py, pz, R.eixo === 'x' ? -Math.PI / 2 : Math.PI, 0, balanca);
        }
        for (const c of cadeirinhas) c.m.thinInstanceBufferUpdated('matrix');
        // as lâmpadas piscam no toque
        const f = t - piscaDesde;
        const nivel = f >= 0 && f < DURA_PISCA ? (Math.floor(f * 9) % 2 ? 1.25 : 0.3) : 1;
        const tex = paletaRoda.material.emissiveTexture;
        if (tex && tex.level !== nivel) tex.level = nivel;
      }

      // ---- o carrossel
      const verCarrossel =
        perto(C.x, C.z) && temChao(C.x - C.beira, C.z - C.beira, C.x + C.beira, C.z + C.beira);
      vendo.carrossel = verCarrossel;
      for (const m of [carrosselGira, carrosselLuz, ...cavalinhos.map((c) => c.m)])
        ligar(m, verCarrossel);
      if (verCarrossel) {
        carrosselGira.rotation.y = carrosselLuz.rotation.y =
          ((Math.PI * 2 * tNucleo) / VOLTA_CARROSSEL) % (Math.PI * 2);
        for (let i = 0; i < CADEIRAS.carrossel; i++) {
          const l = lugarDaCadeira(pq, 'carrossel', i, tNucleo);
          const c = cavalinhos[i % 2];
          por(c.buf, i >> 1, l.x, l.y, l.z, l.yaw, 0, Math.sin(t * 2 + i) * 0.04);
        }
        for (const c of cavalinhos) c.m.thinInstanceBufferUpdated('matrix');
        // no toque as lâmpadas pulsam (o realejo toca o floreio)
        const f = t - correDesde;
        const nivel = f >= 0 && f < DURA_CORRE ? 0.75 + 0.5 * Math.abs(Math.sin(f * 7)) : 1;
        const tex = paletaCarrossel.material.emissiveTexture;
        if (tex && tex.level !== nivel) tex.level = nivel;
      }

      // ---- o bate-bate
      const alcance = B.meia + B.raio + 3;
      const verBate =
        perto(B.x, B.z) &&
        temChao(B.x - alcance, B.z - B.raio - 3, B.x + alcance, B.z + B.raio + 3);
      vendo.bate = verBate;
      ligar(bateLuz, verBate);
      ligar(farois, verBate);
      ligar(faisca, verBate);
      for (const c of carrinhos) ligar(c.m, verBate);
      let vivas = 0;
      if (verBate) {
        carrinhos.forEach((c, i) => {
          const l = lugarDaCadeira(pq, 'bate', i, tNucleo);
          // o "tum": balança de lado e dá um pulinho (nunca vira); quem bateu, um tranquinho
          const f = t - c.tum;
          const k = f >= 0 && f < DURA_TUM ? Math.exp(-f * 4.5) : 0;
          const rolar = k > 0 ? Math.sin(f * 24) * 0.17 * k : 0;
          const pulo = k > 0 ? Math.abs(Math.sin(f * 12)) * 0.07 * k : 0;
          const g = t - c.tranco;
          const tranco = g >= 0 && g < 0.36 ? Math.sin((g / 0.36) * Math.PI) * 0.32 : 0;
          const empurrao = k * 0.22;
          const fx = Math.sin(l.yaw);
          const fz = Math.cos(l.yaw);
          const px = l.x + fx * (tranco + empurrao);
          const pz = l.z + fz * (tranco + empurrao);
          por(c.buf, 0, px, l.y + pulo, pz, l.yaw, rolar, -tranco * 0.18);
          c.m.thinInstanceBufferUpdated('matrix');
          por(bufFarois, i, px, l.y + pulo, pz, l.yaw, rolar, -tranco * 0.18);
          // a faísca pisca na ponta da haste (um chuvisco de vez em quando, mais no "tum")
          const sorte =
            Math.abs(Math.sin(Math.floor(t * 11) * 12.9898 + i * 78.233) * 43758.5453) % 1;
          const acesa = sorte < 0.16 || k > 0.25;
          por(
            bufFaisca,
            i,
            px - fx * 0.86,
            l.y + haste - 0.02,
            pz - fz * 0.86,
            t * 9 + i,
            0,
            0,
            acesa ? 0.8 + sorte : 0.001,
          );
        });
        farois.thinInstanceBufferUpdated('matrix');
        faisca.thinInstanceBufferUpdated('matrix');
        // as estrelinhas sobem em leque, giram e somem
        estrelas.forEach((e, i) => {
          const f = Math.min(1, t - e.desde);
          const viva = f >= 0 && f < 0.9;
          if (viva) vivas++;
          por(
            bufEstrela,
            i,
            e.x + e.vx * f,
            e.y + e.vy * f - 2.6 * f * f,
            e.z + e.vz * f,
            f * 9 + i,
            0,
            0,
            viva ? Math.sin((f / 0.9) * Math.PI) * 1.5 + 0.05 : 0.001,
          );
        });
        estrela.thinInstanceBufferUpdated('matrix');
      }
      ligar(estrela, verBate && vivas > 0);
      estrelasVivas = vivas;

      // ---- os balões: balançam sempre; no toque sobem um pouco (o fio estica) e voltam
      if (baloes && pecaBaloes) {
        const ver =
          perto(pecaBaloes.x, pecaBaloes.z) &&
          temChao(pecaBaloes.x - 1, pecaBaloes.z - 1, pecaBaloes.x + 1, pecaBaloes.z + 1);
        ligar(baloes, ver);
        if (ver) {
          const f = t - baloesDesde;
          const sobe = f >= 0 && f < DURA_BALOES ? Math.sin((f / DURA_BALOES) * Math.PI) : 0;
          // (o maço é grande, de brinquedo: vê-se da entrada)
          baloes.scaling.set(1.4, 1.4 * (1 + sobe * 0.24), 1.4);
          baloes.rotation.z =
            Math.sin(t * 0.9) * 0.05 + (sobe > 0 ? Math.sin(f * 9) * 0.07 * sobe : 0);
          baloes.rotation.x = Math.sin(t * 0.7 + 1) * 0.04;
          baloes.rotation.y = Math.sin(t * 0.25) * 0.5;
          baloesSubindo = sobe;
        }
      }

      // ---- as argolas: paradas no balcão; no toque, voam em arco até o pino e ficam um pouco
      if (refArgola && pecaArgola) {
        const ver =
          perto(pecaArgola.x, pecaArgola.z) &&
          temChao(pecaArgola.x - 3, pecaArgola.z - 2, pecaArgola.x + 3, pecaArgola.z + 2);
        let noPino = 0;
        argolas.forEach((a, k) => {
          ligar(a.m, ver);
          if (!ver) return;
          const x0 = (k - 1) * 0.8;
          const de = refArgola.mundo(x0, BALCAO_BARRACA.y + 0.05, BALCAO_BARRACA.z);
          const ate = refArgola.mundo(PINOS_ARGOLA[k], MESA_ARGOLA.y + 0.22, MESA_ARGOLA.z);
          const f = t - a.desde;
          let u = 0;
          if (f >= 0 && f < VOO_ARGOLA) u = f / VOO_ARGOLA;
          else if (f >= VOO_ARGOLA && f < VOO_ARGOLA + FICA_ARGOLA) u = 1;
          else if (f >= VOO_ARGOLA + FICA_ARGOLA && f < VOO_ARGOLA + FICA_ARGOLA + 0.4)
            u = 1 - (f - VOO_ARGOLA - FICA_ARGOLA) / 0.4;
          if (u === 1) noPino++;
          const voando = u > 0 && u < 1;
          a.m.position.set(
            de[0] + (ate[0] - de[0]) * u,
            de[1] + (ate[1] - de[1]) * u + Math.sin(u * Math.PI) * 1.2,
            de[2] + (ate[2] - de[2]) * u,
          );
          a.m.rotation.x = voando ? u * Math.PI * 4 : 0;
          // pousada no pino, gira um tiquinho até parar
          const g = f - VOO_ARGOLA;
          a.m.rotation.y = u === 1 && g < 0.6 ? Math.sin(g * 16) * (0.6 - g) : 0;
        });
        argolasNoPino = noPino;
      }

      // ---- os peixinhos: boiam na tina; no toque, um pula
      if (refPesca && pecaPesca) {
        const ver =
          perto(pecaPesca.x, pecaPesca.z) &&
          temChao(pecaPesca.x - 3, pecaPesca.z - 2, pecaPesca.x + 3, pecaPesca.z + 2);
        let pulando = false;
        peixes.forEach((p, k) => {
          ligar(p.m, ver);
          if (!ver) return;
          // cada um nada numa voltinha da tina
          const a = t * (0.5 + k * 0.13) + k * 2.1;
          const lx = Math.cos(a) * 1.05 + (k - 1) * 0.2;
          const lz = TINA_PESCA.z + Math.sin(a) * 0.32;
          const f = t - p.desde;
          const pulo = f >= 0 && f < DURA_PEIXE ? Math.sin((f / DURA_PEIXE) * Math.PI) : 0;
          if (pulo > 0) pulando = true;
          const [mx, my, mz] = refPesca.mundo(lx, TINA_PESCA.y + 0.02 + pulo * 1.1, lz);
          p.m.position.set(mx, my + Math.sin(t * 2.2 + k) * 0.02, mz);
          p.m.rotation.y = refPesca.giro - a - Math.PI / 2;
          p.m.rotation.z = pulo > 0 ? Math.sin(f * 20) * 0.5 : 0;
        });
        peixePulando = pulando;
      }

      // ---- o algodão-doce: o miolo gira (rápido no toque) e a nuvem cresce no palito
      if (miolo && nuvem && pecaAlgodao) {
        const ver =
          perto(pecaAlgodao.x, pecaAlgodao.z) &&
          temChao(pecaAlgodao.x - 1, pecaAlgodao.z - 1, pecaAlgodao.x + 1, pecaAlgodao.z + 1);
        ligar(miolo, ver);
        const f = t - algodaoDesde;
        const girando = f >= 0 && f < DURA_ALGODAO;
        const ficando = f >= DURA_ALGODAO && f < DURA_ALGODAO + FICA_ALGODAO;
        const v = girando ? 3 + Math.sin((f / DURA_ALGODAO) * Math.PI) * 22 : 1.2;
        giroMiolo = (giroMiolo + v * dt) % (Math.PI * 2);
        miolo.rotation.y = giroMiolo;
        const tam = girando
          ? f / DURA_ALGODAO
          : ficando
            ? Math.min(1, (DURA_ALGODAO + FICA_ALGODAO - f) / 0.4)
            : 0;
        algodaoTam = tam;
        ligar(nuvem, ver && tam > 0.02);
        if (tam > 0.02) {
          nuvem.scaling.set(0.3 + tam * 0.7, 1, 0.3 + tam * 0.7);
          nuvem.rotation.y = girando ? -giroMiolo * 0.5 : nuvem.rotation.y;
          nuvem.rotation.z = Math.sin(t * 5) * 0.08 * (girando ? 1 : 0);
        }
      }
    },
    estado: () => ({
      ...vendo,
      anguloRoda,
      piscando: agora - piscaDesde >= 0 && agora - piscaDesde < DURA_PISCA,
      correndo: agora - correDesde >= 0 && agora - correDesde < DURA_CORRE,
      baloes: baloesSubindo,
      argolasNoPino,
      peixePulando,
      algodao: algodaoTam,
      estrelinhas: estrelasVivas,
      malhas: todas.filter((m) => m.isEnabled()).length,
      triangulos: todas
        .filter((m) => m.isEnabled())
        .reduce(
          (n, m) => n + ((m.getTotalIndices() / 3) | 0) * Math.max(1, m.thinInstanceCount),
          0,
        ),
    }),
    descartar() {
      for (const m of todas) m.dispose();
      paleta.descartar();
      paletaRoda.descartar();
      paletaCarrossel.descartar();
      pl.descartar();
    },
  };
}
