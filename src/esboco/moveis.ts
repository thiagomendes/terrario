/**
 * Esboço da spec 039 "Móveis e utensílios" (só com `?esboco=moveis`). O `main.ts` importa este
 * arquivo sob demanda: vira um pedaço à parte que o jogo nunca baixa.
 *
 * Uma casinha de blocos de verdade (o chão de tábua, as paredes de tábua clara com janelas, sem a
 * parede da frente e sem teto, como uma casa de bonecas) num gramado ao sul da Vila Neon, com três
 * cômodos lado a lado: a sala, a cozinha e o quarto, montados com os móveis de `moveisPecas.ts`.
 * A criança é o boneco de verdade do jogo (`criarBoneco`), em pé, tocando, sentada ou deitada.
 *
 * O que é de mentirinha: não há bloco de móvel, núcleo nem toque de verdade; o teste liga cada
 * toque pela API (`window.__moveis`) e o relógio das animações é o do teste (a mesma foto sempre).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import type { Scene } from '@babylonjs/core/scene';
import { aparenciaPadrao, normalizarAparencia, type Aparencia } from '../personagem/aparencia';
import type { PlanoBoneco } from '../personagem/boneco';
import { calcularPose } from '../personagem/poses';
import { criarBoneco } from '../render/boneco';
import { modeloNaMao, type ModeloItem } from '../render/itensBrinquedo';
import { criarPlasticos } from '../render/formas';
import { fovDeDentro } from '../render/primeiraPessoa';
import type { Personagem } from '../render/personagem';
import { Pecas, type V3 } from '../render/solidos';
import { criarPaletaLuz } from '../render/vila/luzes';
import { pintarCanal } from '../render/vila/desenhosTv';
import { Ref, type Desenho } from '../render/vila/ref';
import type { PecaVila } from '../world/vilaNeon';
import { Bloco } from '../world/blocks';
import { EDREDOM, ESCALA, desenharMovel, type TipoMovel } from './moveisPecas';

/** As versões de estilo (a recomendada primeiro). */
export interface Versoes {
  cama: 'a' | 'b';
  sofa: 'a' | 'b';
  tv: 'a' | 'b';
}

/** O que está ligado agora (o toque de cada móvel). */
export interface Toques {
  /** A TV: -1 desligada; de 0 a 1, ligando; 1 ligada. */
  tv: number;
  canal: number;
  /** A porta da geladeira (0 fechada, 1 aberta). */
  geladeira: number;
  som: boolean;
  fogao: boolean;
  abajur: boolean;
  lua: boolean;
  agua: boolean;
  pratos: boolean;
  guarda: number;
  carrinho: boolean;
  /** A comidinha desenhada na geladeira (desligada, a geladeira mostra só a comida guardada). */
  comidinha: boolean;
}

/** Onde e como a criança está (coordenadas da casa; yaw 0 olha para +z, o fundo da casa). */
export interface Onde {
  x: number;
  z: number;
  yaw: number;
  pose: 'pe' | 'toca' | 'sentada' | 'deitada' | 'fora';
  /** Sentada ou deitada: a altura do assento (ou do colchão). */
  assento?: number;
  /** Os olhos fechados (dormindo). */
  dormindo?: boolean;
  /** Deitada: o alto do travesseiro acima do colchão (a nuca encosta nele). */
  travesseiro?: number;
  /** Sentada: leva o lanche à boca. */
  come?: boolean;
  /** O item do jogo na mão (o lanche). */
  segura?: string;
  /** Outra roupa (o estilo de roupa da aparência), para a troca no guarda-roupa. */
  roupa?: number;
}

/** Só na cama: quanto o corpo deitado achata de frente para trás (o edredom fica baixo). */
const ACHATA_DEITADA = 0.6;

/** A câmera: em volta de um alvo (cabendo `largura` × `altura`) ou nos olhos de quem olha. */
export type Camera =
  | { tipo: 'olhar'; alvo: V3; yaw: number; pitch: number; largura: number; altura: number; fov: number }
  | { tipo: 'olho'; olho: V3; alvo: V3; fov: number };

export interface EsbocoMoveis {
  montar(): V3;
  versao(v: Partial<Versoes>): void;
  tocar(t: Partial<Toques>): void;
  /** Põe a criança `i` (0 a menina; 1 o menino, só para a mesa). */
  crianca(o: Onde, i?: number): void;
  /** Liga ou desliga a escala nova dos móveis (a da conta de proporção). */
  escala(nova: boolean): void;
  /** Itens do jogo soltos na cena (a comida no fogão, na geladeira, nos pratos). */
  itens(lista: Array<{ item: string; em: V3; giro?: number; tamanho?: number }>): void;
  enquadrar(c: Camera | null): void;
  hora(h: number): void;
  tempo(t: number): void;
  esconder(sim: boolean): void;
  /** O custo de cada móvel (as malhas acesas e os triângulos) e o total. */
  custo(): Record<string, { malhas: number; triangulos: number }>;
  /** As medidas do boneco em pé (do chão): a altura, os olhos, a mão, o quadril, o ombro... */
  medidas(): Record<string, number>;
}

declare global {
  interface Window {
    __moveis?: EsbocoMoveis;
  }
}

/** A criança das fotos (a mesma menina das capturas da 036 e da 038). */
const MENINA: Partial<Aparencia> = { corpo: 'feminino', cabeloEstilo: 5, rosto: 1, cabeloCor: 1, pele: 1, roupaEstilo: 6 };
const MENINO: Partial<Aparencia> = { corpo: 'masculino', cabeloEstilo: 0, rosto: 0, cabeloCor: 0, pele: 2, roupaEstilo: 0 };

/** Onde cada móvel fica (coordenadas da casa: o meio do pé; dir 0 +z, 1 +x, 2 -z, 3 -x). */
interface Lugar {
  id: string;
  tipo: TipoMovel;
  x: number;
  z: number;
  dir: number;
}
export const LUGARES: Lugar[] = [
  // a sala (x de -11 a -4)
  { id: 'sofa', tipo: 'sofa', x: -8, z: 3.5, dir: 2 },
  { id: 'abajur', tipo: 'abajur', x: -9.5, z: 3.5, dir: 2 },
  { id: 'som', tipo: 'som', x: -5.5, z: 3.5, dir: 2 },
  { id: 'tv', tipo: 'tv', x: -10.5, z: 1, dir: 1 },
  { id: 'tapete', tipo: 'tapete', x: -7.5, z: 1, dir: 2 },
  // a cozinha (x de -3 a 4)
  { id: 'geladeira', tipo: 'geladeira', x: -2.5, z: 3.5, dir: 2 },
  { id: 'pia', tipo: 'pia', x: -1.5, z: 3.5, dir: 2 },
  { id: 'fogao', tipo: 'fogao', x: -0.5, z: 3.5, dir: 2 },
  { id: 'mesa', tipo: 'mesa', x: 1.5, z: 0.5, dir: 2 },
  { id: 'cadeira1', tipo: 'cadeira', x: 1, z: 1.5, dir: 2 },
  { id: 'cadeira2', tipo: 'cadeira', x: 2, z: 1.5, dir: 2 },
  { id: 'cadeira3', tipo: 'cadeira', x: 3.5, z: 0.5, dir: 3 },
  // o quarto (x de 5 a 12)
  { id: 'cama', tipo: 'cama', x: 7.5, z: 3, dir: 2 },
  { id: 'criado', tipo: 'criado-mudo', x: 6.5, z: 3.5, dir: 2 },
  { id: 'guarda', tipo: 'guarda-roupa', x: 11, z: 3.5, dir: 2 },
];

export function prepararEsbocoMoveis(): void {
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && e.cenaBabylon) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 200);
  };
  esperar();
}

const PREFIXO = 'personagem-esboco';

function desenhoNoMundo(): Desenho {
  return {
    corpo: new Pecas(),
    luz: new Pecas(),
    noite: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    ox: 0,
    oz: 0,
    chao: 0,
    recorte: { x0: -Infinity, z0: -Infinity, x1: Infinity, z1: Infinity },
  };
}
const peca = (x: number, y: number, z: number, dir: number): PecaVila => ({ tipo: 'banco', x, y, z, dir });

/**
 * O `Ref` com a escala do móvel em cada eixo (a conta de proporção): as caixas e as barras crescem
 * em cada eixo, e o redondo (os prismas: botões, rolos, alto-falantes) cresce por igual, sem
 * virar oval.
 */
class RefEscala extends Ref {
  constructor(
    d: Desenho,
    p: PecaVila,
    readonly esc: V3,
  ) {
    super(d, p);
  }
  override caixa(w: number, h: number, d: number, x: number, y: number, z: number, cor: string, b = 0.03, luz = false): void {
    const [a, c, e] = this.esc;
    super.caixa(w * a, h * c, d * e, x * a, y * c, z * e, cor, b, luz);
  }
  override barra(p: V3, q: V3, lado: number, cor: string, luz = false): void {
    const [a, c, e] = this.esc;
    super.barra([p[0] * a, p[1] * c, p[2] * e], [q[0] * a, q[1] * c, q[2] * e], lado * Math.min(a, e), cor, luz);
  }
  override prisma(n: number, r: number, larg: number, x: number, y: number, z: number, cor: string, eixo: 'x' | 'y' | 'z' = 'z', luz = false): void {
    const [a, c, e] = this.esc;
    const raio = eixo === 'y' ? Math.min(a, e) : eixo === 'z' ? Math.min(a, c) : Math.min(c, e);
    const comp = eixo === 'x' ? a : eixo === 'y' ? c : e;
    super.prisma(n, r * raio, larg * comp, x * a, y * c, z * e, cor, eixo, luz);
  }
  override placa(perfil: Array<[number, number]>, esp: number, x: number, y: number, z: number, cor: string, luz = false): void {
    const [a, c, e] = this.esc;
    const k = Math.min(a, c);
    super.placa(perfil.map(([u, v]) => [u * k, v * k] as [number, number]), esp, x * a, y * c, z * e, cor, luz);
  }
}

interface Parte {
  no: TransformNode;
  malhas: Mesh[];
  pivo: Vector3;
  giro: number;
}
interface Montado {
  lugar: Lugar;
  ref: Ref;
  giro: number;
  malhas: Mesh[];
  partes: Record<string, Parte>;
  tela?: { malha: Mesh; tex: DynamicTexture };
  E: V3;
}

function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  let O: V3 = [0, 64, 0];
  const pl = criarPlasticos(scene, `${PREFIXO}-moveis`);
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const matAgua = pl.cor('#5fb8f6', 0.6, 0.8);
  const paleta = criarPaletaLuz(scene, `${PREFIXO}-moveis-luz`);
  const versoes: Versoes = { cama: 'a', sofa: 'a', tv: 'a' };
  const toques: Toques = {
    tv: -1,
    canal: 0,
    geladeira: 0,
    som: false,
    fogao: false,
    abajur: false,
    lua: false,
    agua: false,
    pratos: false,
    guarda: 0,
    carrinho: false,
    comidinha: true,
  };
  let tempo = 0;
  let montados: Montado[] = [];
  /** A escala da conta de proporção (a segunda volta); desligada, os móveis da primeira volta. */
  let escalaNova = true;
  const soltos: ModeloItem[] = [];

  const malhaDe = (nome: string, d: Pecas, luz: boolean, mat?: StandardMaterial): Mesh | null => {
    if (!d.partes.length) return null;
    const m = new Mesh(nome, scene);
    const vd = d.juntar();
    if (luz) paleta.aplicar(vd);
    vd.applyToMesh(m);
    m.material = mat ?? (luz ? paleta.material : matCorpo);
    m.isPickable = false;
    m.hasVertexAlpha = false;
    return m;
  };

  // ---------------------------------------------------------------- os móveis
  function montarMovel(l: Lugar): Montado {
    const giro = (l.dir & 3) * (Math.PI / 2);
    const d = desenhoNoMundo();
    const E: V3 = escalaNova ? ESCALA[l.tipo] : [1, 1, 1];
    const ref = new RefEscala(d, peca(O[0] + l.x, O[1], O[2] + l.z, l.dir), E);
    const partes: Record<string, Parte> = {};
    const malhas: Mesh[] = [];
    let tela: Montado['tela'];
    const nome = `${PREFIXO}-movel-${l.id}`;
    const versao = l.tipo === 'cama' ? versoes.cama : l.tipo === 'sofa' ? versoes.sofa : l.tipo === 'tv' ? versoes.tv : 'a';
    desenharMovel(
      {
        r: ref,
        parte(np, pivo, desenhar, op) {
          const dp = desenhoNoMundo();
          desenhar(new RefEscala(dp, peca(0, 0, 0, 0), E));
          const no = new TransformNode(`${nome}-${np}`, scene);
          const [px, py, pz] = ref.mundo(pivo[0] * E[0], pivo[1] * E[1], pivo[2] * E[2]);
          no.position.set(px, py, pz);
          no.rotation.y = giro;
          const ms: Mesh[] = [];
          for (const m of [
            malhaDe(`${nome}-${np}`, dp.corpo, false, op?.agua ? matAgua : undefined),
            malhaDe(`${nome}-${np}-luz`, dp.luz, true),
          ])
            if (m) {
              m.parent = no;
              ms.push(m);
            }
          partes[np] = { no, malhas: ms, pivo: new Vector3(px, py, pz), giro };
        },
        tela(meio0, w0, h0) {
          const meio: V3 = [meio0[0] * E[0], meio0[1] * E[1], meio0[2] * E[2]];
          const w = w0 * E[0];
          const h = h0 * E[1];
          const W = 128;
          const H = Math.round((128 * h) / w);
          const tex = new DynamicTexture(`${nome}-tela`, { width: W, height: H }, scene, false);
          tex.wrapU = Texture.CLAMP_ADDRESSMODE;
          tex.wrapV = Texture.CLAMP_ADDRESSMODE;
          const mat = new StandardMaterial(`${nome}-tela`, scene);
          mat.disableLighting = true;
          mat.emissiveTexture = tex;
          mat.diffuseColor = Color3.Black();
          mat.specularColor = Color3.Black();
          const m = new Mesh(`${nome}-tela`, scene);
          const vd = new VertexData();
          const a = w / 2;
          const b = h / 2;
          vd.positions = [-a, -b, 0, a, -b, 0, a, b, 0, -a, b, 0];
          vd.normals = [0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1];
          vd.uvs = [0, 0, 1, 0, 1, 1, 0, 1];
          vd.indices = [0, 1, 2, 0, 2, 3];
          vd.applyToMesh(m);
          m.material = mat;
          m.isPickable = false;
          const [x, y, z] = ref.mundo(meio[0], meio[1], meio[2]);
          m.position.set(x, y, z);
          m.rotation.y = giro + Math.PI;
          tela = { malha: m, tex };
        },
      },
      l.tipo,
      versao,
    );
    for (const m of [malhaDe(nome, d.corpo, false), malhaDe(`${nome}-luz`, d.luz, true)]) if (m) malhas.push(m);
    if (tela) malhas.push(tela.malha);
    return { lugar: l, ref, giro, malhas, partes, tela, E };
  }

  function descartarMovel(m: Montado): void {
    for (const ms of m.malhas) ms.dispose();
    for (const p of Object.values(m.partes)) {
      for (const ms of p.malhas) ms.dispose();
      p.no.dispose();
    }
    if (m.tela) {
      m.tela.tex.dispose();
      m.tela.malha.material?.dispose();
    }
  }

  function montarMoveis(): void {
    for (const m of montados) descartarMovel(m);
    montados = LUGARES.map(montarMovel);
    animar();
  }
  const achar = (id: string) => montados.find((m) => m.lugar.id === id);

  // ---------------------------------------------------------------- os toques
  const suave = (k: number) => {
    const c = Math.max(0, Math.min(1, k));
    return c * c * (3 - 2 * c);
  };
  function ver(p: Parte | undefined, sim: boolean, alfa = 1): void {
    if (!p) return;
    p.no.setEnabled(sim);
    for (const m of p.malhas) m.visibility = alfa;
  }
  function pintarTela(m: Montado): void {
    if (!m.tela) return;
    const tex = m.tela.tex;
    const g = tex.getContext() as unknown as CanvasRenderingContext2D;
    const { width: W, height: H } = tex.getSize();
    const k = toques.tv;
    if (k < 0) {
      // desligada: o vidro escuro com o reflexo
      g.fillStyle = '#1c2630';
      g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(255,255,255,0.08)';
      g.beginPath();
      g.moveTo(W * 0.12, 0);
      g.lineTo(W * 0.32, 0);
      g.lineTo(W * 0.12, H);
      g.lineTo(0, H);
      g.closePath();
      g.fill();
    } else if (k < 1) {
      // ligando: a luz abre do meio, mansa, e o desenho aparece por trás
      if (k > 0.45) {
        pintarCanal(g, W, H, toques.canal, tempo);
        g.fillStyle = `rgba(250,246,232,${(1 - suave((k - 0.45) / 0.55)).toFixed(3)})`;
        g.fillRect(0, 0, W, H);
      } else {
        g.fillStyle = '#1c2630';
        g.fillRect(0, 0, W, H);
        const s = suave(k / 0.45);
        const w = W * (0.12 + 0.88 * s);
        const h = H * (0.08 + 0.92 * s * s);
        g.fillStyle = '#faf6e8';
        g.beginPath();
        const rr = Math.min(w, h) * 0.3;
        const x0 = (W - w) / 2;
        const y0 = (H - h) / 2;
        g.moveTo(x0 + rr, y0);
        g.arcTo(x0 + w, y0, x0 + w, y0 + h, rr);
        g.arcTo(x0 + w, y0 + h, x0, y0 + h, rr);
        g.arcTo(x0, y0 + h, x0, y0, rr);
        g.arcTo(x0, y0, x0 + w, y0, rr);
        g.fill();
      }
    } else pintarCanal(g, W, H, toques.canal, tempo);
    tex.update();
  }
  // a poça de luz morna no chão em volta do abajur e da lua acesos (no jogo, a luz do bloco faz
  // isso no chão e nas paredes; no esboço, um disco manso, sem halo)
  const texPoca = new DynamicTexture(`${PREFIXO}-poca`, { width: 64, height: 64 }, scene, false);
  {
    const g = texPoca.getContext() as unknown as CanvasRenderingContext2D;
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,220,150,0.55)');
    gr.addColorStop(0.5, 'rgba(255,210,140,0.25)');
    gr.addColorStop(1, 'rgba(255,200,130,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 64, 64);
    texPoca.update();
    texPoca.hasAlpha = true;
  }
  const matPoca = new StandardMaterial(`${PREFIXO}-poca`, scene);
  matPoca.disableLighting = true;
  matPoca.emissiveColor = new Color3(1, 0.86, 0.6);
  matPoca.diffuseColor = Color3.Black();
  matPoca.specularColor = Color3.Black();
  matPoca.opacityTexture = texPoca;
  matPoca.zOffset = -2;
  const pocas = new Map<string, Mesh>();
  function poca(m: Montado, nome: string, acesa: boolean, raio: number): void {
    let d = pocas.get(nome);
    if (!d) {
      d = MeshBuilder.CreateGround(`${PREFIXO}-poca-${nome}`, { width: 2, height: 2 }, scene);
      d.material = matPoca;
      d.isPickable = false;
      pocas.set(nome, d);
    }
    const [x, y, z] = m.ref.mundo(0, 0.015, 0);
    d.position.set(x, y, z);
    d.scaling.set(raio, 1, raio);
    // (só de noite: de dia a luz do sol já basta)
    d.setEnabled(acesa && noite);
  }
  let noite = false;
  function animar(): void {
    for (const m of montados) {
      const P = m.partes;
      switch (m.lugar.tipo) {
        case 'tv':
          pintarTela(m);
          break;
        case 'som': {
          const toca = toques.som;
          for (const [i, n] of [P.cone0, P.cone1].entries()) {
            if (!n) continue;
            const pulo = toca ? Math.abs(Math.sin(tempo * Math.PI * 1.9 + i * 0.6)) : 0;
            n.no.scaling.set(1 + pulo * 0.06, 1 + pulo * 0.06, 1 + pulo * 1.4);
          }
          ver(P.luzSom, toca);
          for (let i = 0; i < 3; i++) {
            const n = P[`nota${i}`];
            if (!n) continue;
            if (!toca) {
              ver(n, false);
              continue;
            }
            const f = (tempo * 0.45 + i / 3) % 1;
            ver(n, true, Math.min(1, Math.sin(f * Math.PI) * 1.6));
            const lado = (i - 1) * 0.2 + Math.sin(f * Math.PI * 2 + i * 2) * 0.08;
            const c = Math.cos(m.giro);
            const s = Math.sin(m.giro);
            n.no.position.set(n.pivo.x + lado * c, n.pivo.y + f * 0.6, n.pivo.z - lado * s);
            n.no.rotation.y = m.giro;
            n.no.rotation.z = Math.sin(f * Math.PI * 2 + i) * 0.2;
            n.no.scaling.setAll(0.8 + 0.3 * Math.sin(f * Math.PI));
          }
          break;
        }
        case 'geladeira': {
          const k = suave(toques.geladeira);
          if (P.porta) P.porta.no.rotation.y = m.giro + k * 1.95;
          ver(P.comidinha, toques.comidinha);
          ver(P.luzDentro, k > 0.04);
          break;
        }
        case 'fogao': {
          const f = toques.fogao;
          ver(P.bocas, f);
          if (P.tampa) P.tampa.no.position.y = P.tampa.pivo.y + (f ? Math.abs(Math.sin(tempo * 8)) * 0.035 : 0);
          for (let i = 0; i < 3; i++) {
            const n = P[`vapor${i}`];
            if (!n) continue;
            const g = (tempo * 0.6 + i / 3) % 1;
            ver(n, f, Math.sin(g * Math.PI) * 0.85);
            n.no.position.set(n.pivo.x + Math.sin(g * 6 + i) * 0.05, n.pivo.y + g * 0.55, n.pivo.z);
            n.no.scaling.setAll(0.6 + g * 0.9);
          }
          break;
        }
        case 'abajur':
          ver(P.cupula, !toques.abajur);
          ver(P.cupulaAcesa, toques.abajur);
          poca(m, 'abajur', toques.abajur, 1.7);
          break;
        case 'criado-mudo':
          ver(P.lua, !toques.lua);
          ver(P.luaAcesa, toques.lua);
          poca(m, 'lua', toques.lua, 1.1);
          break;
        case 'pia':
          ver(P.agua, toques.agua, 0.85);
          ver(P.bolhas, toques.agua);
          if (P.bolhas) P.bolhas.no.scaling.y = 0.8 + 0.3 * Math.abs(Math.sin(tempo * 5));
          break;
        case 'mesa':
          ver(P.pratos, toques.pratos);
          break;
        case 'guarda-roupa': {
          const k = suave(toques.guarda);
          if (P.portaE) P.portaE.no.rotation.y = m.giro - k * 1.9;
          if (P.portaD) P.portaD.no.rotation.y = m.giro + k * 1.9;
          break;
        }
        case 'tapete': {
          const n = P.carrinho;
          if (!n) break;
          // a volta pela estrada (um oval quase quadrado), em 6 s
          const a = 1.1;
          const b = 0.62;
          const ponto = (th: number): [number, number] => {
            const c = Math.cos(th);
            const s = Math.sin(th);
            return [a * Math.sign(c) * Math.abs(c) ** 0.35, b * Math.sign(s) * Math.abs(s) ** 0.35];
          };
          const th = Math.PI / 2 + (toques.carrinho ? (tempo / 6) * Math.PI * 2 : 0);
          const [x, z] = ponto(th);
          const [x2, z2] = ponto(th + 0.01);
          const [wx, wy, wz] = m.ref.mundo(x * m.E[0], 0.02, z * m.E[2]);
          n.no.position.set(wx, wy, wz);
          n.no.rotation.y = m.giro + Math.atan2(-(z2 - z), x2 - x);
          break;
        }
        case 'cama':
          {
            // com a criança deitada, o cobertor esticado dá lugar ao edredom fofo por cima dela
            const deitada = onde.pose === 'deitada';
            ver(P.cobertor, !deitada);
            ver(P.edredom, deitada);
            // a altura do edredom segue o corpo deitado (uns 3 cm por cima)
            if (P.edredom && deitada && topoCorpo > 0) {
              const topo = (EDREDOM.altura - EDREDOM.beirada) * m.E[1];
              const quer = topoCorpo + 0.03 - P.edredom.pivo.y;
              P.edredom.no.scaling.y = Math.max(0.5, quer / topo);
            }
          }
          break;
      }
    }
  }
  scene.onBeforeRenderObservable.add(() => {
    if (montados.length) animar();
  });

  // ---------------------------------------------------------------- as crianças
  interface Crianca {
    p: Personagem;
    juntas: Record<string, TransformNode>;
    /** A aparência de agora (troca no guarda-roupa). */
    chave: string;
    /** O que ela segura na mão (o item do jogo), ou null. */
    mao: ModeloItem | null;
    maoItem: string | null;
    /** Onde a cabeça fica no corpo (deitada, ela desce até o travesseiro; depois volta). */
    cabecaPos: Vector3;
  }
  const criancas: Crianca[] = [];
  /** Deitada: o alto do corpo (para o edredom cobrir); 0 quando ninguém está deitado. */
  let topoCorpo = 0;
  let onde: Onde = { x: -7, z: 0, yaw: 0, pose: 'pe' };
  function aparenciaDe(i: number, roupa?: number): Aparencia {
    const base = i === 0 ? MENINA : MENINO;
    return normalizarAparencia({ ...aparenciaPadrao(), ...base, ...(roupa !== undefined ? { roupaEstilo: roupa, roupaCor: 3 } : {}), nome: 'esboco' });
  }
  function montarCrianca(i: number, roupa?: number): Crianca {
    const chave = `${i}:${roupa ?? '-'}`;
    const velha = criancas[i];
    if (velha && velha.chave === chave) return velha;
    velha?.mao?.no.dispose();
    velha?.p.descartar();
    const p = criarBoneco(scene, aparenciaDe(i, roupa), `${PREFIXO}-${i}`, (pl: PlanoBoneco) => pl, true, false);
    const juntas: Record<string, TransformNode> = {};
    for (const n of p.raiz.getChildTransformNodes(false)) {
      const k = /-junta-(\w+)$/.exec(n.name);
      if (k) juntas[k[1]] = n;
    }
    for (const m of p.raiz.getChildMeshes(false)) m.isPickable = false;
    const c: Crianca = { p, juntas, chave, mao: null, maoItem: null, cabecaPos: juntas.cabeca.position.clone() };
    criancas[i] = c;
    return c;
  }
  /** Um item do jogo (o mesmo modelinho da mão e do chão), solto na cena. */
  function itemDoJogo(item: string, nome: string): ModeloItem | null {
    const m = modeloNaMao(scene, pl, null, item, `${PREFIXO}-item-${nome}`);
    if (m) for (const ms of m.malhas) ms.isPickable = false;
    return m;
  }
  function minimoY(no: TransformNode): number {
    let y = Infinity;
    for (const m of no.getChildMeshes(false)) {
      if (!m.isEnabled()) continue;
      m.computeWorldMatrix(true);
      y = Math.min(y, m.getBoundingInfo().boundingBox.minimumWorld.y);
    }
    return y;
  }
  /** A caixa (no mundo) das malhas acesas do boneco que passam no filtro. */
  function caixaDe(no: TransformNode, filtro: (m: AbstractMesh) => boolean): { min: Vector3; max: Vector3 } {
    const min = new Vector3(Infinity, Infinity, Infinity);
    const max = new Vector3(-Infinity, -Infinity, -Infinity);
    for (const m of no.getChildMeshes(false)) {
      if (!m.isEnabled() || !filtro(m)) continue;
      m.computeWorldMatrix(true);
      const bb = m.getBoundingInfo().boundingBox;
      min.minimizeInPlace(bb.minimumWorld);
      max.maximizeInPlace(bb.maximumWorld);
    }
    return { min, max };
  }
  function atualizar(no: TransformNode): void {
    no.computeWorldMatrix(true);
    for (const n of no.getChildTransformNodes(false)) n.computeWorldMatrix(true);
  }
  /**
   * Põe a criança `i` (0 a menina, 1 o menino). Deitada, `o.x` e `o.z` são o meio da cabeceira por
   * dentro (o alto da cabeça encosta nela) e `o.assento` o alto do colchão; a cama olha para -z.
   */
  function porCrianca(o: Onde, i = 0): void {
    if (i === 0) onde = o;
    const c = montarCrianca(i, o.roupa);
    const b = c.p;
    b.raiz.setEnabled(o.pose !== 'fora');
    if (c.mao && c.maoItem !== (o.segura ?? null)) {
      c.mao.no.dispose();
      c.mao = null;
      c.maoItem = null;
    }
    if (o.pose === 'fora') {
      if (i === 0) topoCorpo = 0;
      return;
    }
    const pose = calcularPose({ andando: false, correndo: false, noAr: false, minerando: false, colocando: false, tempo: 1.2 });
    pose.tempo = 1.2;
    pose.piscar = !!o.dormindo;
    for (let k = 0; k < 90; k++) b.aplicarPose(pose);
    const j = c.juntas;
    j.cabeca.position.copyFrom(c.cabecaPos);
    b.raiz.rotation.x = 0;
    b.raiz.scaling.setAll(1);
    b.posicionar(O[0] + o.x, O[1], O[2] + o.z, o.yaw);
    if (o.pose === 'toca') {
      j.bracoD.rotation.set(-1.45, 0, 0.08);
      j.cabeca.rotation.x = 0.12;
    }
    if (o.pose === 'sentada') {
      j.pernaE.rotation.x = -1.45;
      j.pernaD.rotation.x = -1.45;
      j.bracoE.rotation.set(-0.35, 0, -0.12);
      j.bracoD.rotation.set(-0.35, 0, 0.12);
      // comendo: a mão direita leva o lanche à boca
      if (o.come) {
        j.bracoD.rotation.set(-2.35, 0, 0.42);
        j.cabeca.rotation.x = -0.08;
      }
      atualizar(b.raiz);
      const baixo = Math.min(minimoY(j.pernaE), minimoY(j.pernaD));
      b.raiz.position.y += O[1] + (o.assento ?? 0.48) - baixo;
    }
    if (i === 0) topoCorpo = 0;
    if (o.pose === 'deitada') {
      j.bracoE.rotation.set(0, 0, -0.05);
      j.bracoD.rotation.set(0, 0, 0.05);
      j.cabeca.rotation.set(0, 0, 0);
      // (os pés deitam um tico para a ponta da cama: as pontas dos sapatos não espetam o edredom)
      j.pernaE.rotation.x = 0.3;
      j.pernaD.rotation.x = 0.3;
      // só na cama, o corpo achata no fundo (o boneco de brinquedo é gordinho de frente para trás):
      // o edredom fica baixo. De cima, a cara e o corpo continuam do mesmo tamanho.
      b.raiz.scaling.set(1, 1, ACHATA_DEITADA);
      b.raiz.rotation.x = -Math.PI / 2;
      atualizar(b.raiz);
      // o alto da cabeça encosta na cabeceira, no meio da cama
      const cab = caixaDe(b.raiz, (m) => m.isDescendantOf(j.cabeca));
      b.raiz.position.x += O[0] + o.x - (cab.min.x + cab.max.x) / 2;
      b.raiz.position.z += O[2] + o.z - cab.max.z;
      atualizar(b.raiz);
      // as costas no colchão
      const corpo = caixaDe(b.raiz, (m) => !m.isDescendantOf(j.cabeca));
      b.raiz.position.y += O[1] + (o.assento ?? 0.44) - corpo.min.y;
      atualizar(b.raiz);
      // a nuca no travesseiro, sem afundar: a cabeça sobe (ou desce) até encostar nele
      const cab2 = caixaDe(b.raiz, (m) => m.isDescendantOf(j.cabeca));
      const quer = O[1] + (o.assento ?? 0.44) + (o.travesseiro ?? 0.12);
      j.cabeca.setAbsolutePosition(j.cabeca.getAbsolutePosition().add(new Vector3(0, quer - cab2.min.y, 0)));
      atualizar(b.raiz);
      const corpo2 = caixaDe(b.raiz, (m) => !m.isDescendantOf(j.cabeca));
      if (i === 0) topoCorpo = corpo2.max.y;
      const cab3 = caixaDe(b.raiz, (m) => m.isDescendantOf(j.cabeca));
      console.log(
        `esboco deitada corpo ${(corpo2.max.y - corpo2.min.y).toFixed(2)} comprimento ${(cab3.max.z - corpo2.min.z).toFixed(2)} pes ${(corpo2.min.z - O[2]).toFixed(2)}`,
      );
    }
    atualizar(b.raiz);
    // o lanche na mão (o mesmo item do jogo), encostado na palma
    if (o.segura) {
      if (!c.mao) {
        c.mao = itemDoJogo(o.segura, `mao${i}`);
        c.maoItem = o.segura;
      }
      if (c.mao) {
        const mao = caixaDe(b.raiz, (m) => m.isDescendantOf(j.bracoD));
        const ponta = o.come ? new Vector3((mao.min.x + mao.max.x) / 2, mao.max.y + 0.02, (mao.min.z + mao.max.z) / 2) : new Vector3((mao.min.x + mao.max.x) / 2, mao.min.y, (mao.min.z + mao.max.z) / 2);
        c.mao.no.position.copyFrom(ponta);
        c.mao.no.rotation.set(0, o.yaw, 0);
        c.mao.no.scaling.setAll(1.3);
      }
    }
    animar();
  }

  // ---------------------------------------------------------------- câmera
  let camera: Camera | null = null;
  scene.onBeforeCameraRenderObservable.add((cam) => {
    if (!camera) return;
    const c = cam as TargetCamera;
    const em = (p: V3) => new Vector3(O[0] + p[0], O[1] + p[1], O[2] + p[2]);
    let fov = (camera.fov * Math.PI) / 180;
    const eng = scene.getEngine();
    const aspecto = eng.getRenderWidth() / Math.max(1, eng.getRenderHeight());
    let p: Vector3;
    let a: Vector3;
    if (camera.tipo === 'olho') {
      // de dentro, o campo do jogo (nunca menos de 42,4° na horizontal)
      fov = fovDeDentro(aspecto, fov);
      p = em(camera.olho);
      a = em(camera.alvo);
    } else {
      a = em(camera.alvo);
      const hfov = 2 * Math.atan(Math.tan(fov / 2) * aspecto);
      const dist = Math.max(camera.largura / 2 / Math.tan(hfov / 2), camera.altura / 2 / Math.tan(fov / 2));
      const cp = Math.cos(camera.pitch);
      p = a.add(new Vector3(Math.sin(camera.yaw) * cp, Math.sin(camera.pitch), -Math.cos(camera.yaw) * cp).scale(dist));
    }
    c.fov = fov;
    c.minZ = 0.05;
    c.maxZ = 900;
    c.position.copyFrom(p);
    c.setTarget(a);
    c.getViewMatrix(true);
    scene.updateTransformMatrix(true);
  });

  // ---------------------------------------------------------------- esconder o jogo
  let escondido = false;
  scene.onBeforeRenderObservable.add(() => {
    if (!escondido) return;
    for (const m of scene.meshes)
      if ((m.name.startsWith('personagem') && !m.name.startsWith(PREFIXO)) || m.name.startsWith('braco') || m.name.startsWith('pp-')) m.isVisible = false;
      else if (m.name.startsWith('vila-sosia') || m.name.startsWith('premium-')) m.isVisible = false;
    for (const n of scene.transformNodes) if (n.name.startsWith('criatura-') && n.isEnabled()) n.setEnabled(false);
  });

  // ---------------------------------------------------------------- a casinha
  function montar(): V3 {
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    const NAO_CHAO = new Set<number>([
      Bloco.FOLHAGEM,
      Bloco.FOLHAS_BETULA,
      Bloco.FOLHAS_PINHO,
      Bloco.FOLHAS_LANTERNA,
      Bloco.FOLHAS_OUTONO,
      Bloco.MADEIRA_RETORCIDA,
      Bloco.TRONCO_BETULA,
      Bloco.TRONCO_PINHO,
      Bloco.TRONCO_LANTERNA,
      Bloco.GRAMA_ALTA,
      Bloco.FLOR,
      Bloco.ARBUSTO_FRUTINHAS,
      Bloco.AGUA,
    ]);
    const alturas: number[] = [];
    for (let dx = -20; dx <= 20; dx += 4)
      for (let dz = -14; dz <= 14; dz += 4)
        for (let y = 120; y > 1; y--) {
          const b = e.bloco!(cx + dx, y, cz + dz);
          if (!b || NAO_CHAO.has(b)) continue;
          alturas.push(y);
          break;
        }
    alturas.sort((a, b) => a - b);
    const gy = alturas[Math.floor(alturas.length / 2)] ?? 64;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    const W = 24;
    const D = 16;
    // (a casa: x de -12 a 12, z de -3 a 4; a parede do fundo em z = 4)
    const parede = (dx: number, dz: number) =>
      dz === 4 ? dx >= -12 && dx <= 12 : dz >= -3 && dz <= 4 && (dx === -12 || dx === 12 || ((dx === -4 || dx === 4) && dz >= 0));
    const janela = (dx: number, dz: number, y: number) => dz === 4 && y === 2 && [-6, 1, 2, 9].includes(dx);
    for (let dx = -W; dx <= W; dx++)
      for (let dz = -D; dz <= D; dz++) {
        const x = cx + dx;
        const z = cz + dz;
        for (let y = gy - 3; y < gy; y++) lote.push({ x, y, z, v: Bloco.TERRA });
        const dentro = dx >= -12 && dx <= 12 && dz >= -3 && dz <= 4;
        lote.push({ x, y: gy, z, v: dentro ? Bloco.TABUAS : Bloco.TERRA_MUSGOSA });
        for (let y = 1; y <= 16; y++) {
          let v: number = Bloco.AR;
          if (y <= 3 && parede(dx, dz)) v = janela(dx, dz, y) ? Bloco.VIDRO : Bloco.TABUAS_BETULA;
          lote.push({ x, y: gy + y, z, v });
        }
      }
    e.editarLote!(lote);
    O = [cx, gy + 1, cz];
    e.teleportar!(cx + 0.5, cz - 8.5, gy + 1);
    montarMoveis();
    porCrianca(onde);
    return O;
  }

  // ---------------------------------------------------------------- a API dos testes
  const api: EsbocoMoveis = {
    montar,
    versao(v) {
      Object.assign(versoes, v);
      montarMoveis();
    },
    tocar(t) {
      Object.assign(toques, t);
      animar();
    },
    crianca(o, i = 0) {
      porCrianca(o, i);
      // a segunda criança só aparece quando pedida (a mesa); some quando a primeira muda de cena
      if (i === 0 && criancas[1]) criancas[1].p.raiz.setEnabled(false);
    },
    escala(nova) {
      escalaNova = nova;
      montarMoveis();
    },
    itens(lista) {
      for (const s of soltos.splice(0)) s.no.dispose();
      lista.forEach((it, k) => {
        const m = itemDoJogo(it.item, `solto${k}`);
        if (!m) return;
        m.no.position.set(O[0] + it.em[0], O[1] + it.em[1], O[2] + it.em[2]);
        m.no.rotation.y = it.giro ?? 0;
        m.no.scaling.setAll(it.tamanho ?? 1.3);
        soltos.push(m);
      });
    },
    enquadrar(c) {
      camera = c;
    },
    hora(h) {
      e.pausarDia = true;
      e.hora = h;
      noite = h > 0.78 || h < 0.22;
      animar();
    },
    tempo(t) {
      tempo = t;
      animar();
    },
    esconder(sim) {
      escondido = sim;
    },
    custo() {
      const r: Record<string, { malhas: number; triangulos: number }> = {};
      const total = { malhas: 0, triangulos: 0 };
      for (const m of montados) {
        const c = { malhas: 0, triangulos: 0 };
        const todas = [...m.malhas, ...Object.values(m.partes).flatMap((p) => p.malhas)];
        for (const ms of todas) {
          if (!ms.isEnabled()) continue;
          c.malhas++;
          c.triangulos += Math.round(ms.getTotalIndices() / 3);
        }
        r[m.lugar.id] = c;
        total.malhas += c.malhas;
        total.triangulos += c.triangulos;
      }
      r.total = total;
      return r;
    },
    medidas() {
      porCrianca({ x: 0, z: -2, yaw: Math.PI, pose: 'pe' });
      const b = criancas[0];
      const j = b.juntas;
      const chao = O[1];
      const tudo = caixaDe(b.p.raiz, () => true);
      const cab = caixaDe(b.p.raiz, (m) => m.isDescendantOf(j.cabeca));
      const olho = caixaDe(b.p.raiz, (m) => /olho/i.test(m.name));
      const mao = caixaDe(b.p.raiz, (m) => m.isDescendantOf(j.bracoD));
      const tronco = caixaDe(
        b.p.raiz,
        (m) => m.isDescendantOf(j.tronco) && !m.isDescendantOf(j.cabeca) && !m.isDescendantOf(j.bracoE) && !m.isDescendantOf(j.bracoD),
      );
      const r = (v: number) => Math.round(v * 1000) / 1000;
      return {
        altura: r(tudo.max.y - chao),
        olhos: r((olho.min.y + olho.max.y) / 2 - chao),
        cabecaBase: r(cab.min.y - chao),
        cabecaLargura: r(cab.max.x - cab.min.x),
        cabecaFundo: r(cab.max.z - cab.min.z),
        ombro: r(j.bracoD.getAbsolutePosition().y - chao),
        mao: r(mao.min.y - chao),
        quadril: r(j.pernaD.getAbsolutePosition().y - chao),
        troncoBase: r(tronco.min.y - chao),
        corpoLargura: r(tudo.max.x - tudo.min.x),
        corpoFundo: r(tronco.max.z - tronco.min.z),
      };
    },
  };
  window.__moveis = api;
}
