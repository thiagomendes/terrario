/**
 * Spec 036 (T03): os efeitos dos tesouros novos, uma vez por cena para todos os bonecos (o da
 * criança e os dos amigos): a fumacinha da mochila-foguete, as bolhas da varinha, as gotinhas do
 * guarda-chuva e a linha da pipa. Cada um é uma malha com instâncias finas (uma chamada de
 * desenho para todos os bonecos), criada na primeira vez que alguém veste.
 *
 * Brilho contido (o defeito do unicórnio que o dono apontou): nada aqui tem luz própria acima de
 * 0,5, nada entra no mapa do brilho da cena (as malhas levam o nome do boneco, `personagem-`) e
 * nada pisca. A fumacinha sobe e se desfaz encolhendo (nada de tufo parado embaixo do foguete);
 * as bolhas sobem devagar balançando e estouram; as gotinhas caem só por fora da criança, dos
 * lados e de trás (ninguém se molha, nada passa na frente do rosto). Tudo anda pelo tempo de
 * verdade, sem sorteio a cada quadro na posição (nada treme).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';
import type { PremiumVestido } from '../personagem/aparencia';
import { PONTOS_LOJINHA } from '../personagem/bonecoPremiumLojinha';

/** O que cada boneco guarda entre um quadro e outro (os relógios de soltar). */
export interface EstadoEfeitosLojinha {
  fumaca: number;
  bolha: number;
  gota: number;
  /** A gotinha da vez (as pontinhas se revezam, sem sorteio). */
  ponta: number;
  semente: number;
}

export const estadoEfeitosLojinha = (): EstadoEfeitosLojinha => ({
  fumaca: 0,
  bolha: 0.2,
  gota: 0,
  ponta: 0,
  semente: Math.floor(Math.random() * 1e6),
});

/** Um sorteio com semente (o mesmo boneco solta sempre do mesmo jeito). */
function sorteio(e: EstadoEfeitosLojinha): number {
  e.semente = (e.semente * 1103515245 + 12345) % 2147483648;
  return e.semente / 2147483648;
}

interface Particula {
  vivo: boolean;
  p: Vector3;
  v: Vector3;
  vida: number;
  dura: number;
  r0: number;
  r1: number;
  fase: number;
}

type Tipo = 'fumaca' | 'bolha' | 'gota';

const MAXIMO: Record<Tipo, number> = { fumaca: 48, bolha: 20, gota: 36 };
const MAX_LINHAS = 12;

function material(scene: Scene, nome: string, cor: string, luz: number): StandardMaterial {
  const m = new StandardMaterial(`personagem-premium-fx-${nome}`, scene);
  const c = Color3.FromHexString(cor);
  m.diffuseColor = c.scale(0.75);
  m.emissiveColor = c.scale(luz);
  m.specularColor = new Color3(0.12, 0.12, 0.12);
  return m;
}

function malhaFina(scene: Scene, nome: string, base: Mesh, max: number) {
  base.isPickable = false;
  base.alwaysSelectAsActiveMesh = true;
  base.receiveShadows = false;
  const matrizes = new Float32Array(max * 16);
  base.thinInstanceSetBuffer('matrix', matrizes, 16, false);
  base.thinInstanceCount = 0;
  base.setEnabled(false);
  void nome;
  return { m: base, matrizes };
}

export interface EfeitosLojinha {
  /**
   * Um quadro de um boneco: solta o que os tesouros dele soltam e põe a linha da pipa. `nos`:
   * as juntas e os nós próprios do boneco; `frente`: para onde o corpo olha; `andando`: 0 a 1.
   */
  doBoneco(
    e: EstadoEfeitosLojinha,
    premium: PremiumVestido,
    nos: Record<string, TransformNode | undefined>,
    raiz: Vector3,
    yaw: number,
    andando: number,
    dt: number,
  ): void;
  /** Move tudo e manda as instâncias para a placa (uma vez por quadro, depois dos bonecos). */
  quadro(dt: number): void;
  /** Testes: quantos de cada estão vivos e quantas chamadas de desenho isso custa agora. */
  contar(): { fumaca: number; bolha: number; gota: number; linhas: number; chamadas: number };
}

const porCena = new WeakMap<Scene, EfeitosLojinha>();

export function efeitosLojinha(scene: Scene): EfeitosLojinha {
  const ja = porCena.get(scene);
  if (ja) return ja;
  const pools: Partial<Record<Tipo, { malha: ReturnType<typeof malhaFina>; brilho?: ReturnType<typeof malhaFina>; lista: Particula[] }>> = {};
  let linhas: ReturnType<typeof malhaFina> | null = null;
  let nLinhas = 0;
  const pedidosLinha: Array<[Vector3, Vector3]> = [];

  function pool(tipo: Tipo) {
    let p = pools[tipo];
    if (p) return p;
    const max = MAXIMO[tipo];
    let base: Mesh;
    let brilho: ReturnType<typeof malhaFina> | undefined;
    if (tipo === 'fumaca') {
      base = MeshBuilder.CreateSphere('personagem-premium-fx-fumaca', { diameter: 2, segments: 6 }, scene);
      // (branca de nuvem, foscona: não acende de noite)
      base.material = material(scene, 'fumaca', '#f4f2fa', 0.42);
    } else if (tipo === 'gota') {
      base = MeshBuilder.CreateSphere('personagem-premium-fx-gota', { diameter: 2, segments: 6 }, scene);
      const m = material(scene, 'gota', '#6cc0ff', 0.32);
      m.specularColor = new Color3(0.6, 0.6, 0.65);
      m.specularPower = 32;
      base.material = m;
    } else {
      base = MeshBuilder.CreateSphere('personagem-premium-fx-bolha', { diameter: 2, segments: 10 }, scene);
      // a bolha de sabão do esboço aprovado: quase transparente, com o reflexo do céu e um tico
      // de lilás e azul (a beirada com luz de lado deixava o miolo escuro: parecia um olho)
      const m = new StandardMaterial('personagem-premium-fx-bolha', scene);
      m.diffuseColor = Color3.FromHexString('#e6f4ff');
      m.emissiveColor = new Color3(0.25, 0.28, 0.36);
      m.specularColor = new Color3(0.8, 0.8, 0.85);
      m.specularPower = 48;
      m.alpha = 0.32;
      m.backFaceCulling = false;
      m.disableDepthWrite = true;
      base.material = m;
      // o brilhinho da bolha (um pontinho claro, opaco, fosco: nada de halo)
      const b = MeshBuilder.CreateSphere('personagem-premium-fx-bolha-brilho', { diameter: 2, segments: 4 }, scene);
      const mb = new StandardMaterial('personagem-premium-fx-bolha-brilho', scene);
      mb.disableLighting = true;
      mb.emissiveColor = new Color3(0.86, 0.9, 0.95);
      b.material = mb;
      brilho = malhaFina(scene, 'bolha-brilho', b, max);
    }
    const lista: Particula[] = Array.from({ length: max }, () => ({
      vivo: false,
      p: new Vector3(),
      v: new Vector3(),
      vida: 0,
      dura: 1,
      r0: 0,
      r1: 0.1,
      fase: 0,
    }));
    p = { malha: malhaFina(scene, tipo, base, max), brilho, lista };
    pools[tipo] = p;
    return p;
  }

  function soltar(tipo: Tipo, pos: Vector3, v: Vector3, r0: number, r1: number, dura: number, fase = 0): void {
    const p = pool(tipo);
    // o mais velho dá lugar ao novo quando enche
    let q = p.lista.find((x) => !x.vivo);
    if (!q) q = p.lista.reduce((a, b) => (b.vida / b.dura > a.vida / a.dura ? b : a));
    q.vivo = true;
    q.p.copyFrom(pos);
    q.v.copyFrom(v);
    q.vida = 0;
    q.dura = dura;
    q.r0 = r0;
    q.r1 = r1;
    q.fase = fase;
  }

  // (os de sempre de cada quadro, sem lixo para o coletor)
  const tmpMat = new Matrix();
  const tmpEsc = new Vector3();
  const tmpPos = new Vector3();
  const tmpDir = new Vector3();
  const tmpQ = new Quaternion();
  const SEM_GIRO = Quaternion.Identity();
  const aux = new Vector3();
  const aux2 = new Vector3();
  const local = new Vector3();
  const frente = new Vector3();
  const direita = new Vector3();
  const mundo = (no: TransformNode, x: number, y: number, z: number, out: Vector3): Vector3 => {
    local.set(x, y, z);
    return Vector3.TransformCoordinatesToRef(local, no.getWorldMatrix(), out);
  };
  /** A cadeia inteira do nó até a raiz, no quadro de agora (a pose já foi aplicada). */
  const atualizar = (no: TransformNode) => {
    const cadeia: TransformNode[] = [];
    for (let n: TransformNode | null = no; n; n = n.parent as TransformNode | null) cadeia.unshift(n);
    for (const n of cadeia) n.computeWorldMatrix(true);
  };

  const efeitos: EfeitosLojinha = {
    doBoneco(e, premium, nos, raiz, yaw, andando, dt) {
      frente.set(Math.sin(yaw), 0, Math.cos(yaw));
      direita.set(Math.cos(yaw), 0, -Math.sin(yaw));
      // a fumacinha do foguete: fiapos pequenos que saem do bocal, descem um tico, vão para trás
      // e sobem se desfazendo (nada de bolo parado embaixo do foguete)
      if (premium.costas === 'mochila-foguete' && nos.tronco) {
        e.fumaca -= dt;
        if (e.fumaca <= 0) {
          const anda = andando > 0.3;
          e.fumaca = anda ? 0.13 : 0.24;
          const [bx, by, bz] = PONTOS_LOJINHA.bocalFoguete;
          atualizar(nos.tronco);
          mundo(nos.tronco, bx, by, bz, aux);
          aux.x += (sorteio(e) - 0.5) * 0.04;
          aux.z += (sorteio(e) - 0.5) * 0.04;
          // andando, o fiapo fica para trás no ar e sobe se desfazendo (o rastro); parada, sai
          // para baixo e para os lados, abrindo como uma florzinha, e some antes de voltar à
          // altura do foguete (nada de coluna branca na frente dele)
          const lado = (sorteio(e) < 0.5 ? -1 : 1) * (anda ? 0.1 : 0.28 + sorteio(e) * 0.12);
          aux2.copyFrom(direita).scaleInPlace(lado).addInPlace(frente.scale(anda ? -0.3 : -0.12));
          aux2.y = anda ? -0.3 : -0.55;
          soltar('fumaca', aux, aux2, 0.025, (anda ? 0.07 : 0.06) + sorteio(e) * 0.02, anda ? 1.4 : 1.05);
        }
      }
      // as bolhas da varinha: saem do aro de tempos em tempos, para a frente e um tico para cima
      if (premium.mao === 'varinha-bolhas' && nos.maoE) {
        e.bolha -= dt;
        if (e.bolha <= 0) {
          e.bolha = 0.42 + sorteio(e) * 0.12;
          atualizar(nos.maoE);
          const [ax, ay, az] = PONTOS_LOJINHA.aroVarinha;
          mundo(nos.maoE, ax, ay, az, aux);
          // (devagar: a criança vê as bolhas subindo perto dela antes de estourarem)
          aux2
            .copyFrom(frente)
            .scaleInPlace(0.22 + sorteio(e) * 0.15)
            .addInPlace(direita.scale(-(sorteio(e) - 0.3) * 0.3))
            .addInPlace(new Vector3(0, 0.18 + sorteio(e) * 0.12, 0));
          soltar('bolha', aux, aux2, 0, 0.07 + sorteio(e) * 0.06, 2.6 + sorteio(e) * 1.2, sorteio(e) * 6);
        }
      }
      // as gotinhas do guarda-chuva: das pontinhas por fora da criança, dos lados e de trás
      if (premium.mao === 'guarda-chuva-gotinhas' && nos.guarda) {
        e.gota -= dt;
        if (e.gota <= 0) {
          e.gota = 0.12;
          const g = PONTOS_LOJINHA.guarda;
          atualizar(nos.guarda);
          for (let tenta = 0; tenta < g.gomos; tenta++) {
            e.ponta = (e.ponta + 3) % g.gomos;
            const a = (e.ponta / g.gomos) * Math.PI * 2;
            mundo(nos.guarda, Math.cos(a) * g.raio, g.base - 0.03, Math.sin(a) * g.raio, aux);
            const dx = aux.x - raiz.x;
            const dz = aux.z - raiz.z;
            if (Math.hypot(dx, dz) > 0.6 && dx * frente.x + dz * frente.z < 0.1) {
              aux2.set(0, -0.3, 0).addInPlace(frente.scale(-0.4 * andando));
              soltar('gota', aux, aux2, 0, 0.034, 0.55 + sorteio(e) * 0.12);
              break;
            }
          }
        }
      }
      // a linha da pipa: da mão até a ponta de baixo da pipa
      if (premium.mao === 'pipa-lacinhos' && nos.maoE && nos.pipa) {
        atualizar(nos.maoE);
        atualizar(nos.pipa);
        const a = mundo(nos.maoE, 0, -0.06, 0, new Vector3());
        const b = nos.pipa.getAbsolutePosition().clone();
        pedidosLinha.push([a, b]);
      }
    },
    quadro(dt) {
      const cam = scene.activeCamera;
      for (const tipo of ['fumaca', 'bolha', 'gota'] as const) {
        const p = pools[tipo];
        if (!p) continue;
        let n = 0;
        const mat = tmpMat;
        const esc = tmpEsc;
        const pos = tmpPos;
        for (const q of p.lista) {
          if (!q.vivo) continue;
          q.vida += dt;
          const f = q.vida / q.dura;
          if (f >= 1) {
            q.vivo = false;
            continue;
          }
          let r: number;
          let alongar = 1;
          if (tipo === 'gota') {
            q.v.y -= dt * 4.5;
            r = q.r1 * Math.min(1, f / 0.1) * (f > 0.8 ? (1 - f) / 0.2 : 1);
            alongar = 1.4;
          } else if (tipo === 'fumaca') {
            // o vento leva devagar e ela sobe (a curva para cima), crescendo macio e depois
            // encolhendo até sumir
            const freio = Math.exp(-dt * 1.2);
            q.v.x *= freio;
            q.v.z *= freio;
            q.v.y += dt * 0.95;
            const cresce = Math.min(1, f / 0.4);
            r = (q.r0 + (q.r1 - q.r0) * cresce) * (f < 0.55 ? 1 : 1 - (f - 0.55) / 0.45);
          } else {
            // a bolha sobe devagar balançando; no fim estoura (cresce um tico e some)
            q.v.scaleInPlace(Math.exp(-dt * 0.9));
            q.v.y += dt * 0.12;
            q.p.x += Math.sin(q.vida * 2.3 + q.fase) * dt * 0.12;
            q.p.z += Math.cos(q.vida * 1.9 + q.fase) * dt * 0.12;
            r = q.r1 * Math.min(1, f / 0.08) * (f > 0.96 ? 1.18 : 1);
          }
          q.p.addInPlace(q.v.scale(dt));
          const s = Math.max(0.001, r);
          esc.set(s, s * alongar, s);
          Matrix.ComposeToRef(esc, SEM_GIRO, q.p, mat);
          mat.copyToArray(p.malha.matrizes, n * 16);
          if (p.brilho) {
            // o brilhinho fica no alto da bolha, do lado da câmera
            pos.copyFrom(q.p);
            if (cam) {
              cam.globalPosition.subtractToRef(q.p, tmpDir).normalize();
              pos.addInPlace(tmpDir.scaleInPlace(s * 0.7));
              pos.y += s * 0.45;
            }
            esc.setAll(s * 0.16);
            Matrix.ComposeToRef(esc, SEM_GIRO, pos, mat);
            mat.copyToArray(p.brilho.matrizes, n * 16);
          }
          n++;
        }
        for (const m of p.brilho ? [p.malha, p.brilho] : [p.malha]) {
          m.m.thinInstanceCount = n;
          if (n) m.m.thinInstanceBufferUpdated('matrix');
          m.m.setEnabled(n > 0);
        }
      }
      // as linhas das pipas: um cilindro fininho de cada mão até a pipa
      if (pedidosLinha.length && !linhas) {
        const base = MeshBuilder.CreateCylinder('personagem-premium-fx-linha', { height: 1, diameter: 1, tessellation: 5 }, scene);
        base.material = material(scene, 'linha', '#f2efe6', 0.45);
        linhas = malhaFina(scene, 'linha', base, MAX_LINHAS);
      }
      if (linhas) {
        let n = 0;
        const mat = tmpMat;
        const q = tmpQ;
        const cima = Vector3.Up();
        for (const [a, b] of pedidosLinha.slice(0, MAX_LINHAS)) {
          const d = b.subtract(a);
          const l = d.length();
          if (l < 1e-3) continue;
          d.scaleInPlace(1 / l);
          const eixo = Vector3.Cross(cima, d);
          const ang = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(cima, d))));
          if (eixo.length() > 1e-6) Quaternion.RotationAxisToRef(eixo.normalize(), ang, q);
          else q.copyFrom(SEM_GIRO);
          tmpEsc.set(0.016, l, 0.016);
          Matrix.ComposeToRef(tmpEsc, q, a.add(b).scaleInPlace(0.5), mat);
          mat.copyToArray(linhas.matrizes, n * 16);
          n++;
        }
        nLinhas = n;
        linhas.m.thinInstanceCount = n;
        if (n) linhas.m.thinInstanceBufferUpdated('matrix');
        linhas.m.setEnabled(n > 0);
      }
      pedidosLinha.length = 0;
    },
    contar() {
      const vivos = (t: Tipo) => pools[t]?.lista.filter((q) => q.vivo).length ?? 0;
      const fumaca = vivos('fumaca');
      const bolha = vivos('bolha');
      const gota = vivos('gota');
      return {
        fumaca,
        bolha,
        gota,
        linhas: nLinhas,
        chamadas: (fumaca ? 1 : 0) + (bolha ? 2 : 0) + (gota ? 1 : 0) + (nLinhas ? 1 : 0),
      };
    },
  };
  porCena.set(scene, efeitos);
  scene.onDisposeObservable.addOnce(() => porCena.delete(scene));
  return efeitos;
}
