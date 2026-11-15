/**
 * Os brinquedos de tocar da Vila Neon na tela (spec 026, T19). O som é do `somVila`; aqui fica o
 * que a criança vê quando toca:
 * - **o fliperama:** a tela da máquina tocada vira um joguinho que mexe por uns segundos (a
 *   navinha atira e os bichinhos dançam, o carrinho corre na estrada, os blocos caem e somem
 *   numa linha), com um clarão branco no começo;
 * - **o rádio gigante:** ligado, os alto-falantes pulsam no tempo da batida, as luzinhas do
 *   mostrador sobem e descem e notinhas sobem do rádio; outro toque desliga;
 * - **a fita gigante:** o lápis (sextavado, como lápis de verdade) gira e os carretéis
 *   rebobinam rápido por um segundo e meio;
 * - **o ladrilho da pista:** o quadradinho onde o pé pisa acende e apaga devagar.
 *
 * Tudo só com o chão do pedaço desenhado (a regra do campo de visão) e com um número fixo de
 * malhas (nada é criado depois do começo).
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Constants } from '@babylonjs/core/Engines/constants';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaVila, PlanoVila } from '../../world/vilaNeon';
import { BPM } from '../../jogo/show';
import { COR, Ref, type Desenho } from './ref';
import { criarPaletaLuz } from './luzes';
import { pintarTela, sorteio } from './neon';

export type ToqueVila = 'fliperama' | 'radio' | 'fita';

export interface OpcoesBrinquedosVila {
  temMalha(cx: number, cz: number): boolean;
  brilha?(m: Mesh): void;
  tapaOGlow?(m: Mesh): void;
  semBrilho?(m: Mesh): void;
}

export interface BrinquedosVila {
  /** O toque num brinquedo (a máquina `i` do fliperama). */
  tocar(qual: ToqueVila, i?: number): void;
  /** O pé pisou num ladrilho novo da pista (o quadradinho acende). */
  pisar(x: number, y: number, z: number): void;
  quadro(t: number): void;
  /** Testes: o que está mexendo agora. */
  estado(): { telas: number; radio: boolean; fita: boolean; ladrilhos: number };
  descartar(): void;
}

/** Quanto a tela do fliperama mexe depois do toque (s). */
const TELA_DURA = 3.4;
/** O rádio toca 8 compassos (o mesmo do som). */
const RADIO_DURA = 8 * (60 / BPM) * 4;
const FITA_DURA = 1.5;
const LADRILHO_DURA = 1.1;
const N_LADRILHOS = 6;
const N_NOTAS = 5;

const chunkDe = (x: number, z: number): [number, number] => [
  Math.floor(x / 16),
  Math.floor(z / 16),
];

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

/** O joguinho da máquina `n` no instante `f` (s desde o toque), em blocos de 32 × 26. */
function pintarJogo(g: CanvasRenderingContext2D, L: number, A: number, n: number, f: number): void {
  const C = 32;
  const R = 26;
  const px = L / C;
  const py = A / R;
  const p = (x: number, y: number, cor: string, w = 1, h = 1) => {
    g.fillStyle = cor;
    g.fillRect(Math.floor(x * px), Math.floor(y * py), Math.ceil(w * px), Math.ceil(h * py));
  };
  const jogo = n % 3;
  const r = sorteio(31 + n * 7);
  if (jogo === 0) {
    // a navinha: as estrelas descem, os bichinhos dançam de lado e a nave atira
    p(0, 0, n === 3 ? '#1a0f3a' : '#0c1030', C, R);
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(r() * C);
      const y = (Math.floor(r() * R) + f * 9) % R;
      p(x, Math.floor(y), r() > 0.5 ? '#ffffff' : '#8fb8ff');
    }
    const cores = ['#ff6fb4', '#2ee0d0', '#ffe14a'];
    const dx = Math.round(Math.sin(f * 3) * 2);
    const abre = Math.floor(f * 4) % 2;
    const acertado = Math.min(4, Math.floor(f / 0.7));
    for (let j = 0; j < 3; j++)
      for (let i = 0; i < 5; i++) {
        if (j === 2 && i < acertado) continue;
        const x = 3 + i * 5.5 + dx;
        const y = 3 + j * 4;
        p(x, y, cores[j], 3, 2);
        p(x - 1, y + 1 - abre, cores[j]);
        p(x + 3, y + 1 - abre, cores[j]);
        p(x + 0.5, y + 0.4, '#0c1030', 0.7, 0.7);
        p(x + 1.8, y + 0.4, '#0c1030', 0.7, 0.7);
      }
    const nx = 14 + Math.round(Math.sin(f * 2.2) * 6);
    p(nx, 21, '#f6f4ee', 4, 2);
    p(nx + 1.5, 19, '#f6f4ee', 1, 2);
    p(nx - 1, 22.5, '#e8302a', 1, 1.5);
    p(nx + 4, 22.5, '#e8302a', 1, 1.5);
    // os tiros sobem
    for (let k = 0; k < 3; k++) {
      const y = 18 - ((f * 22 + k * 6) % 16);
      p(nx + 1.6, y, '#ffe14a', 0.8, 2);
    }
    p(0, 25, '#2ee0d0', C, 1);
  } else if (jogo === 1) {
    // o carrinho: a estrada corre, as faixas descem e o carrinho desvia de um lado para o outro
    p(0, 0, '#ff8a5a', C, 5);
    p(0, 5, '#ffb45a', C, 4);
    p(11, 3, '#ffe14a', 10, 6);
    p(0, 9, '#3a2a6a', C, 1);
    p(0, 10, n === 4 ? '#2f8a4a' : '#22a08a', C, R - 10);
    for (let y = 10; y < R; y++) {
      const t = (y - 10) / (R - 10);
      const w = 3 + t * 22;
      const fase = Math.floor(y + f * 14) % 4;
      p(16 - w / 2, y, '#3a3944', w, 1);
      p(16 - w / 2 - 1, y, fase < 2 ? '#f6f4ee' : '#e8302a', 1, 1);
      p(16 + w / 2, y, fase < 2 ? '#f6f4ee' : '#e8302a', 1, 1);
      if (fase < 2) p(15.6, y, '#ffe14a', 0.8, 1);
    }
    const cx = 11 + Math.round(Math.sin(f * 2.6) * 4);
    const cor = n === 4 ? '#2f8cff' : '#e8302a';
    p(cx, 18, cor, 9, 4);
    p(cx + 1.5, 16, cor, 6, 2);
    p(cx + 2.2, 16.4, '#bfe7ff', 4.6, 1.4);
    p(cx, 21.5, '#1f1e25', 2, 2);
    p(cx + 7, 21.5, '#1f1e25', 2, 2);
    p(cx + 0.5, 19, '#ffe14a', 1.5, 1);
    p(cx + 6, 19, '#ffe14a', 1.5, 1);
  } else {
    // os blocos: o par cai, a linha de baixo pisca e some
    p(0, 0, '#141230', C, R);
    p(8, 1, '#2a2850', 16, 24);
    const cores = ['#e8302a', '#2f8cff', '#ffe14a', '#2ee0d0', '#ff6fb4'];
    const alt = [5, 3, 6, 2, 4, 1, 3, 5];
    const pisca = f > 1.6 && f < 2.4 && Math.floor(f * 10) % 2 === 0;
    const somiu = f >= 2.4;
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < alt[i]; j++) {
        const cor = cores[Math.floor(r() * cores.length)];
        if (j === 0 && somiu) continue;
        const yy = somiu ? 23 - (j - 1) * 2 : 23 - j * 2;
        p(8 + i * 2, yy, j === 0 && pisca ? '#ffffff' : cor, 2, 2);
        p(8 + i * 2, yy, 'rgba(255,255,255,0.35)', 2, 0.4);
        p(8 + i * 2 + 1.6, yy, 'rgba(0,0,0,0.25)', 0.4, 2);
      }
    const yq = Math.min(17, 1 + Math.floor(f * 9));
    p(14, yq, '#ffe14a', 2, 2);
    p(16, yq, '#ff6fb4', 2, 2);
    p(14, yq, 'rgba(255,255,255,0.4)', 4, 0.4);
    p(7, 1, '#d4d8e2', 1, 24);
    p(24, 1, '#d4d8e2', 1, 24);
    p(7, 25, '#d4d8e2', 18, 1);
    const pontos = somiu ? 4 : 3;
    for (let i = 0; i < 4; i++) p(27, 4 + i * 3, i < pontos ? '#ffe14a' : '#3a3860', 3, 2);
    for (let i = 0; i < 3; i++) p(2, 6 + i * 4, cores[i], 3, 3);
  }
  // o clarão do começo (a máquina "acorda")
  if (f < 0.18) {
    g.fillStyle = `rgba(255,255,255,${(1 - f / 0.18) * 0.85})`;
    g.fillRect(0, 0, L, A);
  }
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < A; y += 4) g.fillRect(0, y, L, 1);
}

export function criarBrinquedosVila(
  scene: Scene,
  plano: PlanoVila,
  opcoes: OpcoesBrinquedosVila,
): BrinquedosVila {
  const todas: Mesh[] = [];
  const materiais: StandardMaterial[] = [];
  const texturas: DynamicTexture[] = [];
  const pl = criarPlasticos(scene, 'vila-brinquedos');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const paleta = criarPaletaLuz(scene, 'vila-brinquedos-luz');
  const chao = (x: number, z: number) => {
    const [cx, cz] = chunkDe(x, z);
    return opcoes.temMalha(cx, cz);
  };
  const ligar = (m: Mesh, ver: boolean) => {
    if (m.isEnabled() !== ver) m.setEnabled(ver);
  };
  const malhaCorpo = (nome: string, pecas: Pecas): Mesh => {
    const m = new Mesh(nome, scene);
    pecas.juntar().applyToMesh(m);
    m.material = matCorpo;
    m.isPickable = false;
    m.setEnabled(false);
    opcoes.tapaOGlow?.(m);
    todas.push(m);
    return m;
  };
  const malhaLuz = (nome: string, pecas: Pecas): Mesh => {
    const m = new Mesh(nome, scene);
    const vd = pecas.juntar();
    paleta.aplicar(vd);
    vd.applyToMesh(m);
    m.material = paleta.material;
    m.isPickable = false;
    m.setEnabled(false);
    opcoes.brilha?.(m);
    todas.push(m);
    return m;
  };

  // ------------------------------------------------------------------ as telas do fliperama
  const maquinas = plano.pecas
    .filter((q) => q.tipo === 'maquina')
    .sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  const telas = maquinas.map((q, i) => {
    const d = desenhoMundo();
    // o mesmo lugar da tela pintada, um tico mais para fora (por cima dela)
    new Ref(d, q, 1.3).quadro(0.66, 0.52, 0, 1.48, 0.23, () => undefined, true, 128);
    const qd = d.quadros[0];
    const tex = new DynamicTexture(`vila-tela-${i}`, { width: 128, height: 128 }, scene, false);
    tex.wrapU = Texture.CLAMP_ADDRESSMODE;
    tex.wrapV = Texture.CLAMP_ADDRESSMODE;
    const mat = new StandardMaterial(`vila-tela-mat-${i}`, scene);
    mat.disableLighting = true;
    mat.emissiveTexture = tex;
    mat.diffuseColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    const m = new Mesh(`vila-tela-${i}`, scene);
    const vd = new VertexData();
    const w = qd.w / 2;
    const h = qd.h / 2;
    vd.positions = [-w, -h, 0, w, -h, 0, w, h, 0, -w, h, 0];
    vd.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
    vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
    vd.indices = [0, 1, 2, 0, 2, 3];
    vd.applyToMesh(m);
    m.material = mat;
    m.position.set(qd.x, qd.y, qd.z);
    m.rotation.y = qd.giro;
    m.isPickable = false;
    m.setEnabled(false);
    opcoes.brilha?.(m);
    todas.push(m);
    materiais.push(mat);
    texturas.push(tex);
    return { m, tex, n: q.n ?? i, x: q.x, z: q.z, desde: -Infinity, ultimoQuadro: -1 };
  });
  const pintarTelaEm = (tela: (typeof telas)[number], f: number) => {
    const g = tela.tex.getContext() as unknown as CanvasRenderingContext2D;
    g.save();
    g.scale(1, 128 / 101);
    if (f >= TELA_DURA) pintarTela(g, 128, 101, tela.n);
    else pintarJogo(g, 128, 101, tela.n, f);
    g.restore();
    tela.tex.update(true);
  };

  // ------------------------------------------------------------------ o rádio gigante
  const pecaRadio = plano.pecas.find((q) => q.tipo === 'radio-gigante') ?? null;
  let radioLuz: Mesh | null = null;
  let radioBrilho: Mesh | null = null;
  const notas: Mesh[] = [];
  const dadosNotas = Array.from({ length: N_NOTAS }, () => ({
    x: 0,
    y: 0,
    z: 0,
    vida: 0,
    lado: 0,
  }));
  if (pecaRadio) {
    // os aros acesos dos alto-falantes e as luzinhas do mostrador (o que pulsa)
    const d = desenhoMundo();
    const r = new Ref(d, pecaRadio);
    const zf = 0.65;
    for (const x of [-1.62, 1.62]) {
      r.prisma(10, 0.9, 0.03, x, 1.02, zf + 0.02, '#ff4a3a', 'z', true);
      r.prisma(10, 0.82, 0.04, x, 1.02, zf + 0.025, '#24232a', 'z', true);
    }
    for (let i = 0; i < 9; i++)
      r.luz(0.16, 0.08, 0.03, 0.5 - 0.88 + i * 0.22, 2.32, zf + 0.04, '#8dff9a');
    radioLuz = malhaLuz('vila-radio-aceso', d.luz);
    // o miolo dos falantes que bate (pula para fora no tempo)
    const db = desenhoMundo();
    const rb = new Ref(db, pecaRadio);
    for (const x of [-1.62, 1.62]) {
      rb.prisma(10, 0.3, 0.08, x, 1.02, zf + 0.1, '#ffe14a', 'z', true);
    }
    radioBrilho = malhaLuz('vila-radio-batida', db.luz);
    // as notinhas (a cabeça redonda de oito lados e a haste, com a bandeirinha)
    for (let k = 0; k < N_NOTAS; k++) {
      const dn = desenhoMundo();
      const rn = new Ref(dn, { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 } as PecaVila);
      const cor = ['#ffe14a', '#4aa0ff', '#ff4a3a', '#f6f4ee', '#2ee0d0'][k];
      rn.prisma(8, 0.14, 0.06, 0, 0, 0, cor, 'z', true);
      rn.luz(0.05, 0.42, 0.06, 0.11, 0, 0, cor);
      rn.luz(0.18, 0.06, 0.06, 0.19, 0.36, 0, cor);
      const m = malhaLuz(`vila-radio-nota-${k}`, dn.luz);
      m.billboardMode = Mesh.BILLBOARDMODE_Y;
      notas.push(m);
    }
  }
  let radioAte = -Infinity;
  let radioDesde = 0;
  let proxNota = 0;

  // ------------------------------------------------------------------ a fita gigante
  const pecaFita = plano.pecas.find((q) => q.tipo === 'fita-gigante') ?? null;
  let lapis: Mesh | null = null;
  const carreteis: Mesh[] = [];
  if (pecaFita) {
    const y0 = 0.3;
    const lx = -0.56;
    const ly = y0 + 1.38;
    // o lápis sextavado (cobre o de caixa da peça), a ponta de madeira e a borracha
    const dl = desenhoMundo();
    const rl = new Ref(dl, { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 } as PecaVila);
    rl.prisma(6, 0.15, 1.3, 0, 0, 1.16, COR.amarelo, 'z');
    for (let k = 0; k < 6; k++) {
      const a = (k * Math.PI) / 3 + Math.PI / 6;
      rl.caixa(
        0.02,
        0.02,
        1.3,
        Math.cos(a) * 0.128,
        Math.sin(a) * 0.128 - 0.01,
        1.16,
        '#e8b830',
        0,
      );
    }
    rl.prisma(6, 0.155, 0.16, 0, 0, 1.88, COR.cromo, 'z');
    rl.prisma(6, 0.15, 0.22, 0, 0, 2.07, '#ff8fb8', 'z');
    const cl = new Pecas();
    for (const vd of dl.corpo.partes) cl.add(vd);
    lapis = malhaCorpo('vila-fita-lapis', cl);
    // o lápis gira no eixo dele: o meio da peça no lugar do furo do carretel
    const rf = new Ref(desenhoMundo(), pecaFita);
    const [mx, my, mz] = rf.mundo(lx, ly, 0);
    lapis.position.set(mx, my, mz);
    lapis.rotation.y = rf.giro;
    lapis.rotationQuaternion = null;
    // os dentinhos dos dois carretéis, das duas faces (giram junto com o lápis)
    for (const x of [-0.56, 0.56])
      for (const s of [-1, 1]) {
        const dc = desenhoMundo();
        const rc = new Ref(dc, { tipo: 'banco', x: 0, y: 0, z: 0, dir: 0 } as PecaVila);
        for (let k = 0; k < 3; k++) {
          const a = (k * 2 * Math.PI) / 3;
          rc.caixa(
            0.05,
            0.05,
            0.03,
            Math.cos(a) * 0.12,
            Math.sin(a) * 0.12 - 0.025,
            0,
            COR.grafite,
            0,
          );
        }
        const m = malhaCorpo(`vila-fita-carretel-${x}-${s}`, dc.corpo);
        const [cx, cy, cz] = rf.mundo(x, ly, s * (0.25 + 0.065));
        m.position.set(cx, cy, cz);
        m.rotation.y = rf.giro;
        carreteis.push(m);
      }
  }
  let fitaDesde = -Infinity;
  let giroFita = 0;

  // ------------------------------------------------------------------ os ladrilhos da pista
  const matLadrilho = new StandardMaterial('vila-ladrilho', scene);
  matLadrilho.disableLighting = true;
  matLadrilho.emissiveColor = new Color3(0.35, 1, 0.92);
  matLadrilho.diffuseColor = Color3.Black();
  matLadrilho.specularColor = Color3.Black();
  matLadrilho.alphaMode = Constants.ALPHA_ADD;
  matLadrilho.disableDepthWrite = true;
  // (alfa abaixo de 1: vai para a fila dos transparentes e soma de verdade)
  matLadrilho.alpha = 0.99;
  materiais.push(matLadrilho);
  const ladrilhos = Array.from({ length: N_LADRILHOS }, (_, i) => {
    const m = new Mesh(`vila-ladrilho-${i}`, scene);
    const vd = new VertexData();
    // o quadradinho aceso com a beira mais forte (dois quadrados: o miolo e a moldura)
    const a = 0.47;
    const b = 0.36;
    vd.positions = [-a, 0, -a, a, 0, -a, a, 0, a, -a, 0, a, -b, 0, -b, b, 0, -b, b, 0, b, -b, 0, b];
    vd.indices = [
      0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 4, 6, 5, 4, 7, 6,
    ];
    vd.colors = [
      ...[1, 1, 1, 1].flatMap(() => [1, 1, 1, 1]),
      ...[1, 1, 1, 1].flatMap(() => [0.3, 0.3, 0.3, 1]),
    ];
    vd.applyToMesh(m);
    m.material = matLadrilho;
    m.hasVertexAlpha = false;
    m.isPickable = false;
    m.setEnabled(false);
    opcoes.semBrilho?.(m);
    todas.push(m);
    return { m, desde: -Infinity };
  });
  let proxLadrilho = 0;
  let agora = 0;

  return {
    tocar(qual, i = 0) {
      if (qual === 'fliperama') {
        const tela = telas[((i % telas.length) + telas.length) % telas.length];
        if (tela) tela.desde = agora;
      } else if (qual === 'radio') {
        if (agora < radioAte) radioAte = agora;
        else {
          radioAte = agora + RADIO_DURA;
          radioDesde = agora;
        }
      } else if (qual === 'fita') fitaDesde = agora;
    },
    pisar(x, y, z) {
      const l = ladrilhos[proxLadrilho];
      proxLadrilho = (proxLadrilho + 1) % N_LADRILHOS;
      l.m.position.set(Math.floor(x) + 0.5, y + 0.03, Math.floor(z) + 0.5);
      l.desde = agora;
    },
    quadro(t) {
      const dt = agora > 0 ? Math.min(0.1, Math.max(0, t - agora)) : 0;
      agora = t;
      // ---- as telas: só a que foi tocada mexe (a ~12 quadros por segundo)
      for (const tela of telas) {
        const f = t - tela.desde;
        const ativa = f >= 0 && f < TELA_DURA + 0.2 && chao(tela.x, tela.z);
        ligar(tela.m, ativa);
        if (!ativa) continue;
        const q = Math.floor(f * 12);
        if (q !== tela.ultimoQuadro) {
          tela.ultimoQuadro = q;
          pintarTelaEm(tela, f);
        }
      }
      // ---- o rádio
      if (pecaRadio && radioLuz && radioBrilho) {
        const ver = chao(pecaRadio.x, pecaRadio.z);
        const ligado = ver && t < radioAte;
        ligar(radioLuz, ligado);
        ligar(radioBrilho, ligado);
        if (ligado) {
          const batida = ((t - radioDesde) * BPM) / 60;
          const k = Math.exp(-(batida - Math.floor(batida)) * 5);
          radioBrilho.scaling.setAll(1);
          radioBrilho.position.set(0, 0, 0);
          // o miolo pula para fora na batida (ao longo da frente do rádio)
          const a = (pecaRadio.dir & 3) * (Math.PI / 2);
          radioBrilho.position.set(Math.sin(a) * 0.08 * k, 0, Math.cos(a) * 0.08 * k);
          proxNota -= dt;
          if (proxNota <= 0) {
            proxNota = 60 / BPM;
            const n = dadosNotas.find((q) => q.vida <= 0);
            if (n) {
              const r = new Ref(desenhoMundo(), pecaRadio);
              const lado = Math.random() < 0.5 ? -1 : 1;
              [n.x, n.y, n.z] = r.mundo(lado * 1.62, 2.4, 0.8);
              n.vida = 2.2;
              n.lado = lado;
            }
          }
        }
        dadosNotas.forEach((n, k) => {
          const m = notas[k];
          if (n.vida > 0) n.vida -= dt;
          const vivo = ver && n.vida > 0;
          ligar(m, vivo);
          if (!vivo) return;
          const idade = 2.2 - n.vida;
          m.position.set(n.x + Math.sin(idade * 3 + k) * 0.25, n.y + idade * 0.9, n.z);
          m.scaling.setAll(Math.min(1, idade * 4) * Math.min(1, n.vida * 1.6) * 1.4);
        });
      }
      // ---- a fita: o lápis e os carretéis rebobinam
      if (pecaFita && lapis) {
        const ver = chao(pecaFita.x, pecaFita.z);
        ligar(lapis, ver);
        for (const c of carreteis) ligar(c, ver);
        const f = t - fitaDesde;
        if (f >= 0 && f < FITA_DURA) {
          // rápido no meio, devagar no começo e no fim
          const v = Math.sin((f / FITA_DURA) * Math.PI) * 22;
          giroFita += v * dt;
          lapis.rotation.z = giroFita;
          for (const c of carreteis) c.rotation.z = giroFita;
        }
      }
      // ---- os ladrilhos
      for (const l of ladrilhos) {
        const f = t - l.desde;
        const vivo = f >= 0 && f < LADRILHO_DURA;
        ligar(l.m, vivo);
        if (!vivo) continue;
        const k = 1 - f / LADRILHO_DURA;
        l.m.visibility = k;
      }
    },
    estado: () => ({
      telas: telas.filter((q) => q.m.isEnabled()).length,
      radio: !!radioLuz?.isEnabled(),
      fita: agora - fitaDesde >= 0 && agora - fitaDesde < FITA_DURA,
      ladrilhos: ladrilhos.filter((l) => l.m.isEnabled()).length,
    }),
    descartar() {
      for (const m of todas) m.dispose();
      for (const m of materiais) m.dispose();
      for (const t of texturas) t.dispose();
      paleta.descartar();
      pl.descartar();
    },
  };
}
