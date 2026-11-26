/**
 * Os blocos fantasmas do canteiro (spec 014, T06): cada célula da planta ainda vazia é um
 * cubo azul translúcido com contorno claro e a cor do bloco bem leve por cima. Tudo em
 * instâncias finas (uma malha de cubo, uma cor por instância): duas malhas para todas as
 * obras perto, a da próxima camada (que pulsa devagar) e a das de cima (mais apagadas).
 * Sem colisão, sem sombra, sem picking: a câmera passa por eles.
 *
 * Também mora aqui o que acompanha os fantasmas: o bloco de verdade, pequeno, girando no
 * fantasma da mira; o tremidinho e o balão com o bloco certo (bloco errado); e a placa
 * "Feita por Ana e Léo" das obras feitas.
 */
import type { Scene } from '@babylonjs/core/scene';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix } from '@babylonjs/core/Maths/math.vector';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import '@babylonjs/core/Meshes/thinInstanceMesh';
import { Bloco } from '../world/blocks';
import { criarPlasticos } from './formas';
import { modeloNaMao } from './itensBrinquedo';

/** Um fantasma: a célula, o bloco que ela pede e se é da camada que pulsa. */
export interface FantasmaVisto {
  x: number;
  y: number;
  z: number;
  bloco: number;
  pulsa: boolean;
}

/** A cor leve de cada bloco das obras (por cima do azul). */
const COR_BLOCO: Record<number, [number, number, number]> = {
  [Bloco.TIJOLOS]: [0.86, 0.32, 0.26],
  [Bloco.TABUAS]: [0.82, 0.62, 0.36],
  [Bloco.TABUAS_BETULA]: [0.95, 0.88, 0.7],
  [Bloco.VIDRO]: [0.75, 0.95, 1],
  [Bloco.LAJE]: [0.75, 0.75, 0.78],
  [Bloco.CERCA]: [0.7, 0.5, 0.3],
  [Bloco.PORTA]: [0.66, 0.44, 0.26],
  [Bloco.ESCADA]: [0.74, 0.52, 0.3],
  [Bloco.TOLDO_VERMELHO]: [0.95, 0.3, 0.3],
  [Bloco.TOLDO_VERDE]: [0.35, 0.8, 0.4],
  // spec 031: o bolo do Doce Reino (chocolate, chantilly e a vela cor-de-rosa)
  [Bloco.LA_PRETA]: [0.55, 0.3, 0.18],
  [Bloco.TERRA_NEVADA]: [1, 0.88, 0.92],
  [Bloco.TOCHA]: [1, 0.55, 0.7],
};
/**
 * Spec 037: de dentro, o fantasma a menos que isto dos olhos (até o cubo, em blocos) some, e a
 * partir daquilo fica inteiro; no meio, vai clareando. O contorno do da mira não fica mais
 * apagado que ALFA_MIRA_PERTO.
 */
const PERTO_SOME = 0.2;
const PERTO_INTEIRO = 1.5;
const ALFA_MIRA_PERTO = 0.55;
/**
 * Spec 037 (o revisor: a obra de dentro, a um ou dois passos, vira uma grade branca que cobre a
 * tela e, de noite, é a coisa mais clara dela). Só de dentro: o miolo da camada da vez fica a 0,45
 * do de fora (0,17 a 0,3), o contorno dela a 0,7; as camadas de cima ficam só com o contorno, a
 * 0,45 (0,25). O contorno fica fino (0,035 em vez de 0,07), e de noite tudo segue a luz do lugar,
 * sem passar de metade abaixo dela.
 */
const MIOLO_DENTRO_DA_VEZ = 0.45;
const CONTORNO_DENTRO_DA_VEZ = 0.7;
const CONTORNO_DENTRO_CIMA = 0.45;
const PISO_LUZ_DENTRO = 0.5;
/**
 * De dentro, a marca do próximo bloco: o miolo cheio (sobre o alfa do pulso) e amarelo claro (a
 * cor do vértice multiplica o azul do material: 3 × 0,32, 1,45 × 0,6 e 0,32 × 1 dão o amarelo).
 */
const MIOLO_MARCA = 1.3;
const COR_MARCA: [number, number, number] = [3, 1.45, 0.32];

/** De dentro, quanto de um fantasma aparece pela distância dos olhos até o cubo (0 some, 1 inteiro). */
function aparecePerto(
  olho: { x: number; y: number; z: number },
  f: { x: number; y: number; z: number },
  some = PERTO_SOME,
  inteiro = PERTO_INTEIRO,
): number {
  const dx = Math.max(0, Math.abs(olho.x - (f.x + 0.5)) - 0.47);
  const dy = Math.max(0, Math.abs(olho.y - (f.y + 0.5)) - 0.47);
  const dz = Math.max(0, Math.abs(olho.z - (f.z + 0.5)) - 0.47);
  const t = Math.max(0, Math.min(1, (Math.hypot(dx, dy, dz) - some) / (inteiro - some)));
  return t * t * (3 - 2 * t);
}
/** A base é branca: o azul vem da textura, e a cor do bloco tinge por cima. */
const AZUL: [number, number, number] = [1, 1, 1];
/** Quanto da cor do bloco vai por cima do azul. */
const MISTURA = 0.42;

export function corDoFantasma(bloco: number): [number, number, number] {
  const c = COR_BLOCO[bloco] ?? [0.8, 0.8, 0.8];
  return [0, 1, 2].map((i) => AZUL[i] * (1 - MISTURA) + c[i] * MISTURA) as [number, number, number];
}

/** A moldura do fantasma (o contorno claro): as 12 arestas do cubo, numa malha só. */
function malhaDaMoldura(scene: Scene, nome: string, lado = 0.95, grossura = 0.07): Mesh {
  const h = lado / 2;
  const barras: Mesh[] = [];
  for (const eixo of [0, 1, 2])
    for (const a of [-h, h])
      for (const b of [-h, h]) {
        const tam = [grossura, grossura, grossura];
        tam[eixo] = lado + grossura;
        const m = MeshBuilder.CreateBox(
          `${nome}-b`,
          { width: tam[0], height: tam[1], depth: tam[2] },
          scene,
        );
        const p = [a, b];
        const outros = [0, 1, 2].filter((k) => k !== eixo);
        const pos = [0, 0, 0];
        pos[outros[0]] = p[0];
        pos[outros[1]] = p[1];
        m.position.set(pos[0], pos[1], pos[2]);
        barras.push(m);
      }
  return Mesh.MergeMeshes(barras, true, true)!;
}

export function criarFantasmasObra(scene: Scene, excluirDoGlow: (m: Mesh) => void) {
  const material = (nome: string, alfa: number, cor = new Color3(0.32, 0.6, 1)) => {
    const m = new StandardMaterial(nome, scene);
    m.disableLighting = true;
    m.diffuseColor = Color3.Black();
    m.emissiveColor = cor;
    m.fogEnabled = false;
    m.specularColor = Color3.Black();
    m.alpha = alfa;
    m.backFaceCulling = true;
    // o fantasma não esconde o que está atrás dele (nem os outros fantasmas)
    m.disableDepthWrite = true;
    return m;
  };
  const claro = new Color3(0.9, 0.95, 1);
  const camadas = [
    {
      mat: material('fantasma-pulso', 0.5),
      matMoldura: material('fantasma-pulso-moldura', 0.9, claro),
      malha: null as Mesh | null,
      moldura: null as Mesh | null,
    },
    {
      mat: material('fantasma-cima', 0.32),
      matMoldura: material('fantasma-cima-moldura', 0.55, claro),
      malha: null as Mesh | null,
      moldura: null as Mesh | null,
    },
  ];
  const preparar = (m: Mesh, mat: StandardMaterial) => {
    m.material = mat;
    m.isPickable = false;
    m.receiveShadows = false;
    m.alwaysSelectAsActiveMesh = true;
    m.thinInstanceEnablePicking = false;
    m.alphaIndex = 10;
    m.setEnabled(false);
    excluirDoGlow(m);
    return m;
  };
  /** Spec 037: de dentro, o contorno mais fino (o de fora, 0,07, a um passo vira uma grade branca). */
  const finas: Mesh[] = [];
  for (const [k, c] of camadas.entries()) {
    c.malha = preparar(MeshBuilder.CreateBox(`fantasmas-obra-${k}`, { size: 0.94 }, scene), c.mat);
    c.moldura = preparar(malhaDaMoldura(scene, `fantasmas-moldura-${k}`), c.matMoldura);
    c.moldura.name = `fantasmas-moldura-${k}`;
    const fina = preparar(malhaDaMoldura(scene, `fantasmas-moldura-fina-${k}`, 0.95, 0.035), c.matMoldura);
    fina.name = `fantasmas-moldura-fina-${k}`;
    finas.push(fina);
  }
  /** De dentro agora (o contorno fino, o miolo mais leve, a luz do lugar). */
  let deDentro = false;
  const corBase = camadas.map((c) => ({ mat: c.mat.emissiveColor.clone(), mo: c.matMoldura.emissiveColor.clone() }));
  /** O que está desenhado agora (para refazer só quando muda). */
  let chave = '';
  let lista: FantasmaVisto[] = [];
  const tremendo = new Map<string, number>();
  /** Spec 037: os fantasmas de cada camada e o alfa de cada um (o de perto dos olhos some). */
  const porCamada: FantasmaVisto[][] = [[], []];
  const coresCamada: (Float32Array | null)[] = [null, null];
  const coresMoldura: (Float32Array | null)[] = [null, null];
  let olhoVisto = '';

  function montar(): void {
    for (const [k, c] of camadas.entries()) {
      const deles = lista.filter((f) => (k === 0) === f.pulsa);
      porCamada[k] = deles;
      const m = c.malha!;
      const mo = c.moldura!;
      const fina = finas[k];
      if (!deles.length) {
        for (const x of [m, mo, fina]) {
          x.setEnabled(false);
          x.thinInstanceCount = 0;
        }
        coresCamada[k] = coresMoldura[k] = null;
        continue;
      }
      const mats = new Float32Array(16 * deles.length);
      const cores = new Float32Array(4 * deles.length);
      const coresMo = new Float32Array(4 * deles.length).fill(1);
      deles.forEach((f, i) => {
        Matrix.Translation(f.x + 0.5, f.y + 0.5, f.z + 0.5).copyToArray(mats, i * 16);
        const [r, g, b] = corDoFantasma(f.bloco);
        cores.set([r, g, b, 1], i * 4);
      });
      m.thinInstanceSetBuffer('matrix', mats, 16, false);
      m.thinInstanceSetBuffer('color', cores, 4, false);
      m.setEnabled(true);
      mo.thinInstanceSetBuffer('matrix', mats.slice(), 16, false);
      mo.thinInstanceSetBuffer('color', coresMo, 4, false);
      mo.setEnabled(!deDentro);
      fina.thinInstanceSetBuffer('matrix', mats.slice(), 16, false);
      fina.thinInstanceSetBuffer('color', coresMo, 4, false);
      fina.setEnabled(deDentro);
      coresCamada[k] = cores;
      coresMoldura[k] = coresMo;
    }
    olhoVisto = '';
  }

  /**
   * Spec 037 (portão): de dentro, o fantasma encostado na câmera virava uma névoa branca que
   * cobria até 40% da tela. Pela distância dos olhos até o cubo, o de perto fica transparente e,
   * colado, some; o da mira (o que o dedo ou a mira vai preencher) fica sempre à vista.
   */
  function apagarPerto(
    olho: { x: number; y: number; z: number } | null,
    mira: { x: number; y: number; z: number } | null,
  ): void {
    const k0 = olho
      ? `${olho.x.toFixed(2)},${olho.y.toFixed(2)},${olho.z.toFixed(2)}|${mira ? `${mira.x},${mira.y},${mira.z}` : ''}`
      : '-';
    if (k0 === olhoVisto) return;
    olhoVisto = k0;
    for (let k = 0; k < camadas.length; k++) {
      const cores = coresCamada[k];
      const coresMo = coresMoldura[k];
      if (!cores || !coresMo) continue;
      let mudou = false;
      // de dentro, a obra fica mais leve: a camada da vez com o miolo a menos da metade, as de
      // cima só com o contorno, fraquinho (a um passo, a grade inteira cobria a tela)
      const miolo = olho ? (k === 0 ? MIOLO_DENTRO_DA_VEZ : 0) : 1;
      const traco = olho ? (k === 0 ? CONTORNO_DENTRO_DA_VEZ : CONTORNO_DENTRO_CIMA) : 1;
      porCamada[k].forEach((f, i) => {
        const perto = olho ? aparecePerto(olho, f) : 1;
        // o contorno some mais devagar que o miolo e, no da mira, fica aceso: mostra onde o
        // bloco vai sem a névoa do miolo colado nos olhos
        const naMira = !!mira && mira.x === f.x && mira.y === f.y && mira.z === f.z;
        // de dentro, o próximo bloco (o da mira) é o único com o miolo cheio, em amarelo claro:
        // a marca se vê sem procurar no meio da grade leve
        const marca = naMira && !!olho;
        const a = marca ? Math.max(perto, ALFA_MIRA_PERTO) * MIOLO_MARCA : perto * miolo;
        const contorno = marca ? Math.max(Math.min(1, perto * 1.6), ALFA_MIRA_PERTO) : Math.min(1, perto * 1.6) * traco;
        const cor = marca ? COR_MARCA : corDoFantasma(f.bloco);
        if (
          cores[i * 4 + 3] !== a ||
          coresMo[i * 4 + 3] !== contorno ||
          cores[i * 4] !== cor[0] ||
          cores[i * 4 + 1] !== cor[1] ||
          cores[i * 4 + 2] !== cor[2]
        ) {
          cores.set([cor[0], cor[1], cor[2], a], i * 4);
          coresMo.set(marca ? [1, 0.86, 0.35, contorno] : [1, 1, 1, contorno], i * 4);
          mudou = true;
        }
      });
      if (mudou) {
        camadas[k].malha!.thinInstanceBufferUpdated('color');
        camadas[k].moldura!.thinInstanceBufferUpdated('color');
        finas[k].thinInstanceBufferUpdated('color');
      }
    }
  }

  // o bloco de verdade, pequeno, girando no fantasma da mira
  const plasticos = criarPlasticos(scene, 'fantasma-mira');
  const modelos = new Map<number, { no: TransformNode; malhas: Mesh[] }>();
  let naMira: { no: TransformNode } | null = null;
  function modeloDe(bloco: number) {
    let m = modelos.get(bloco);
    if (m) return m;
    const mod = modeloNaMao(scene, plasticos, bloco, null, `fantasma-mira-${bloco}`);
    const no = new TransformNode(`fantasma-mira-${bloco}`, scene);
    const malhas: Mesh[] = [];
    if (mod) {
      mod.no.parent = no;
      malhas.push(...mod.malhas);
    }
    for (const x of malhas) {
      x.isPickable = false;
      x.receiveShadows = false;
      excluirDoGlow(x);
    }
    no.setEnabled(false);
    m = { no, malhas };
    modelos.set(bloco, m);
    return m;
  }

  // o balão com o bloco certo (bloco errado): um plano creme virado para a câmera
  const texBalao = new DynamicTexture('balao-obra', { width: 128, height: 128 }, scene, true);
  {
    const g = texBalao.getContext() as unknown as CanvasRenderingContext2D;
    g.clearRect(0, 0, 128, 128);
    g.fillStyle = '#fffaf0';
    g.beginPath();
    g.arc(64, 58, 50, 0, Math.PI * 2);
    g.moveTo(52, 100);
    g.lineTo(64, 124);
    g.lineTo(76, 100);
    g.fill();
    g.strokeStyle = '#e2d6c0';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(64, 58, 50, 0, Math.PI * 2);
    g.stroke();
    texBalao.hasAlpha = true;
    texBalao.update();
  }
  const matBalao = new StandardMaterial('balao-obra', scene);
  matBalao.diffuseTexture = texBalao;
  matBalao.useAlphaFromDiffuseTexture = true;
  matBalao.disableLighting = true;
  matBalao.emissiveColor = new Color3(1, 1, 1);
  matBalao.backFaceCulling = false;
  const balao = MeshBuilder.CreatePlane('balao-obra', { size: 0.9 }, scene);
  balao.material = matBalao;
  balao.billboardMode = Mesh.BILLBOARDMODE_ALL;
  balao.isPickable = false;
  balao.renderingGroupId = 1;
  balao.setEnabled(false);
  excluirDoGlow(balao);
  let balaoAte = 0;
  let balaoBloco: { no: TransformNode } | null = null;

  // placas "Feita por ..." das obras feitas
  const placas = new Map<number, { malha: Mesh; texto: string }>();

  return {
    /** Os fantasmas de agora (refaz as instâncias só quando a lista muda). */
    definir(novos: FantasmaVisto[]): void {
      const k = novos.map((f) => `${f.x},${f.y},${f.z},${f.pulsa ? 1 : 0}`).join(';');
      if (k === chave) return;
      chave = k;
      lista = novos;
      montar();
    },
    get quantos(): number {
      return lista.length;
    },
    /**
     * A cada quadro: o pulso, o tremidinho, o bloco da mira e o balão. `olho`: a câmera de
     * dentro (a primeira pessoa), onde os fantasmas colados nela somem.
     */
    quadro(
      tempo: number,
      mira: { x: number; y: number; z: number; bloco: number } | null,
      olho: { x: number; y: number; z: number } | null = null,
      /** A luz do lugar (1 de dia, menos de noite e na caverna): de dentro, a obra segue ela. */
      luz = 1,
    ): void {
      // de dentro: o contorno fino no lugar do grosso, e a cor na luz do lugar
      const dentro = !!olho;
      if (dentro !== deDentro) {
        deDentro = dentro;
        for (let k = 0; k < camadas.length; k++) {
          const tem = !!coresCamada[k];
          camadas[k].moldura!.setEnabled(tem && !dentro);
          finas[k].setEnabled(tem && dentro);
        }
      }
      const f = dentro ? Math.max(PISO_LUZ_DENTRO, Math.min(1, luz)) : 1;
      camadas.forEach((c, k) => {
        c.mat.emissiveColor.copyFrom(corBase[k].mat).scaleInPlace(f);
        c.matMoldura.emissiveColor.copyFrom(corBase[k].mo).scaleInPlace(f);
      });
      apagarPerto(olho, mira);
      const pulso = 0.5 + 0.5 * Math.sin(tempo * 3.2);
      camadas[0].mat.alpha = 0.38 + 0.3 * pulso;
      camadas[0].matMoldura.alpha = 0.7 + 0.3 * pulso;
      if (tremendo.size) {
        let mudou = false;
        for (const [k, ate] of tremendo)
          if (tempo > ate) {
            tremendo.delete(k);
            mudou = true;
          }
        const m = camadas.map((c) => c.malha!);
        const mo = camadas.map((c) => c.moldura!);
        for (let k = 0; k < camadas.length; k++) {
          const deles = lista.filter((f) => (k === 0) === f.pulsa);
          deles.forEach((f, i) => {
            const t = tremendo.has(`${f.x},${f.y},${f.z}`);
            if (!t && !mudou) return;
            const dx = t ? Math.sin(tempo * 48) * 0.07 : 0;
            const mt = Matrix.Translation(f.x + 0.5 + dx, f.y + 0.5, f.z + 0.5);
            m[k].thinInstanceSetMatrixAt(i, mt, i === deles.length - 1);
            mo[k].thinInstanceSetMatrixAt(i, mt, i === deles.length - 1);
            finas[k].thinInstanceSetMatrixAt(i, mt, i === deles.length - 1);
          });
        }
      }
      const alvo = mira ? modeloDe(mira.bloco) : null;
      if (naMira && naMira !== alvo) naMira.no.setEnabled(false);
      naMira = alvo;
      if (alvo && mira) {
        // spec 037: de dentro, colado nos olhos, o bloquinho girando encolhe até sumir (de perto
        // ele tapava meia tela); o contorno do fantasma continua mostrando onde o bloco vai
        // (só bem colado: no alcance de pôr, ele fica do tamanho de sempre)
        const perto = olho ? aparecePerto(olho, mira, 0.02, 0.35) : 1;
        alvo.no.setEnabled(perto > 0.05);
        alvo.no.position.set(
          mira.x + 0.5,
          mira.y + 0.45 + Math.sin(tempo * 2.4) * 0.05,
          mira.z + 0.5,
        );
        alvo.no.rotation.y = tempo * 1.8;
        alvo.no.scaling.setAll(0.75 * perto);
      }
      if (balao.isEnabled() && tempo > balaoAte) {
        balao.setEnabled(false);
        balaoBloco?.no.setEnabled(false);
        balaoBloco = null;
      }
    },
    /** Bloco errado: o fantasma treme e o balão mostra o bloco certo em cima dele. */
    avisar(x: number, y: number, z: number, certo: number, tempo: number): void {
      tremendo.set(`${x},${y},${z}`, tempo + 0.45);
      balao.position.set(x + 0.5, y + 1.75, z + 0.5);
      balao.setEnabled(true);
      balaoAte = tempo + 2.2;
      balaoBloco?.no.setEnabled(false);
      const m = modeloDe(certo);
      // o bloquinho do balão: outro nó com o mesmo modelo seria outra malha; usa o da mira
      // quando ela não está nele (o balão dura pouco)
      if (naMira !== m) {
        m.no.setEnabled(true);
        m.no.position.set(x + 0.5, y + 1.82, z + 0.5);
        m.no.rotation.y = 0.6;
        m.no.scaling.setAll(0.6);
        balaoBloco = m;
      }
    },
    /** A placa da obra feita, com os nomes de quem fez (até 4). */
    placa(n: number, x: number, y: number, z: number, yaw: number, nomes: readonly string[]): void {
      const texto = nomes.length ? juntarNomes(nomes) : '';
      const ja = placas.get(n);
      if (ja && ja.texto === texto) return;
      ja?.malha.material?.dispose(true, true);
      ja?.malha.dispose();
      placas.delete(n);
      if (!texto) return;
      const t = new DynamicTexture(`placa-feita-${n}`, { width: 512, height: 192 }, scene, true);
      const g = t.getContext() as unknown as CanvasRenderingContext2D;
      g.fillStyle = '#fffaf0';
      g.fillRect(0, 0, 512, 192);
      g.strokeStyle = '#c9a36a';
      g.lineWidth = 10;
      g.strokeRect(5, 5, 502, 182);
      g.fillStyle = '#3b2a1e';
      g.textAlign = 'center';
      g.font = '700 44px sans-serif';
      g.fillText('Feita por', 256, 76);
      let tam = 52;
      g.font = `700 ${tam}px sans-serif`;
      while (g.measureText(texto).width > 480 && tam > 22)
        g.font = `700 ${(tam -= 2)}px sans-serif`;
      g.fillText(texto, 256, 148);
      t.update();
      const mat = new StandardMaterial(`placa-feita-${n}`, scene);
      mat.diffuseTexture = t;
      mat.emissiveColor = new Color3(0.55, 0.55, 0.55);
      mat.specularColor = Color3.Black();
      mat.backFaceCulling = false;
      const malha = MeshBuilder.CreatePlane(`placa-feita-${n}`, { width: 1.6, height: 0.6 }, scene);
      malha.material = mat;
      malha.position.set(x, y, z);
      malha.rotation.y = yaw;
      malha.isPickable = false;
      excluirDoGlow(malha);
      placas.set(n, { malha, texto });
    },
  };
}

/** "Ana", "Ana e Léo", "Ana, Bia e Léo". */
export function juntarNomes(nomes: readonly string[]): string {
  const n = nomes.slice(0, 4);
  if (n.length <= 1) return n[0] ?? '';
  return `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}`;
}

export type FantasmasObra = ReturnType<typeof criarFantasmasObra>;
