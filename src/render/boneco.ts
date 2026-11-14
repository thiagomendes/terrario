/**
 * O boneco de brinquedo em 3D (spec 012): monta as peças do plano (personagem/boneco.ts)
 * presas nas juntas, aplica a pose com os movimentos novos (peso, mola, golpe com preparo,
 * respiração, piscar, topete) e segura o item na mão direita pela ponta do cabo.
 * Mesmo contrato do personagem antigo (render/personagem.ts), para a cena, os amigos e o
 * editor não mudarem.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateCylinderVertexData } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateTorusVertexData } from '@babylonjs/core/Meshes/Builders/torusBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Aparencia } from '../personagem/aparencia';
import {
  planoBoneco,
  rotacoesDaPose,
  type Junta,
  type Peca,
  type PlanoBoneco,
  type SubjuntaPremium,
} from '../personagem/boneco';
import { luzPremium, texturaListras } from './premiumLuzes';
import type { Pose } from '../personagem/poses';
import {
  caixaArredondada,
  cilindro,
  corViva,
  criarPlasticos,
  caixaFeita,
  dadosEsfera,
  dadosAnel,
  dadosPlaca,
  esfera,
  pintarVertices,
  type Plasticos,
} from './formas';
import { modeloNaMao, type ModeloItem } from './itensBrinquedo';
import type { ExtrasPose, Personagem } from './personagem';

export const MAXIMO_MALHAS_BONECO = 90;

/** Uma peça em 3D a partir do plano. */
export function montarPeca(scene: Scene, mats: Plasticos, p: Peca, prefixo: string): Mesh {
  if (p.luz || p.textura || p.pintar) {
    // spec 023: os premium montam pelos dados (o degradê e as listras vão nos vértices)
    const m = new Mesh(`${prefixo}-${p.nome}`, scene);
    dadosDaPeca(p, undefined, false).applyToMesh(m);
    m.material = materialDaPeca(scene, mats, p);
    m.isPickable = false;
    m.receiveShadows = false;
    return m;
  }
  // a tinta da fantasia vai nos vértices, num material só por brilho (spec 017)
  const mat = p.viva
    ? mats.tinta(p.brilho ?? 0.28, p.alfa ?? 1)
    : mats.cor(p.cor, p.brilho ?? 0.28, p.alfa ?? 1);
  const nome = `${prefixo}-${p.nome}`;
  let m: Mesh;
  if (p.forma === 'caixa')
    m = caixaArredondada(
      nome,
      scene,
      p.tamanho[0],
      p.tamanho[1],
      p.tamanho[2],
      p.raio ?? 0.05,
      mat,
      3,
    );
  else if (p.forma === 'esfera') {
    const r = Math.max(p.tamanho[0], p.tamanho[1], p.tamanho[2]);
    m = esfera(nome, scene, r, mat, [p.tamanho[0] / r, p.tamanho[1] / r, p.tamanho[2] / r]);
  } else if (p.forma === 'cilindro')
    m = cilindro(nome, scene, p.tamanho[0], p.tamanho[1], p.tamanho[2], mat);
  else if (p.forma === 'placa') {
    m = new Mesh(nome, scene);
    dadosPlaca(p.perfil ?? [], p.tamanho[2]).applyToMesh(m);
    m.material = mat;
    m.isPickable = false;
  } else if (p.tamanho[2] > 0) {
    // arco de anel (a tiara, spec 017)
    m = new Mesh(nome, scene);
    dadosAnel(p.tamanho[0], p.tamanho[1], p.tamanho[2]).applyToMesh(m);
    m.material = mat;
    m.isPickable = false;
  } else {
    m = MeshBuilder.CreateTorus(
      nome,
      { diameter: p.tamanho[0], thickness: p.tamanho[1], tessellation: 20 },
      scene,
    );
    m.material = mat;
    m.isPickable = false;
  }
  if (p.viva) pintarVertices(m, p.cor);
  m.position.set(p.pos[0], p.pos[1], p.pos[2]);
  if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
  m.receiveShadows = false;
  return m;
}

/**
 * Os dados de uma peça já no lugar dela na junta (spec 017, desempenho): a mesma malha que
 * `montarPeca` faz, mas só na memória, sem mandar nada para a placa de vídeo. As peças da
 * mesma junta e do mesmo material são juntadas aqui e sobem uma vez só (o morador que aparece
 * no povoado não trava a tela). A conta da posição e das normais é a mesma do MergeMeshes.
 */
export function dadosDaPeca(
  p: Peca,
  deslocar?: [number, number, number],
  /** Spec 014 (T11): a cor da peça nos vértices, sem a gama da tinta (material `corVertice`). */
  corNoVertice = false,
): VertexData {
  let vd: VertexData;
  let escala: [number, number, number] = [1, 1, 1];
  if (p.forma === 'caixa')
    vd = caixaFeita(p.tamanho[0], p.tamanho[1], p.tamanho[2], p.raio ?? 0.05, 3);
  else if (p.forma === 'esfera') {
    const r = Math.max(p.tamanho[0], p.tamanho[1], p.tamanho[2]);
    vd = dadosEsfera(r);
    escala = [p.tamanho[0] / r, p.tamanho[1] / r, p.tamanho[2] / r];
  } else if (p.forma === 'cilindro')
    vd = CreateCylinderVertexData({
      height: p.tamanho[0],
      diameterBottom: p.tamanho[1] * 2,
      diameterTop: p.tamanho[2] * 2,
      tessellation: 14,
    });
  else if (p.forma === 'placa') vd = dadosPlaca(p.perfil ?? [], p.tamanho[2]);
  else if (p.tamanho[2] > 0) vd = dadosAnel(p.tamanho[0], p.tamanho[1], p.tamanho[2]);
  else
    vd = CreateTorusVertexData({
      diameter: p.tamanho[0],
      thickness: p.tamanho[1],
      tessellation: 20,
    });
  if ((p.viva || corNoVertice) && !p.pintar) {
    const n = vd.positions!.length / 3;
    const [r, g, b] = corNoVertice ? Color3.FromHexString(p.cor).asArray() : corViva(p.cor);
    const cores = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cores.set([r, g, b, 1], i * 4);
    vd.colors = cores;
  }
  const rot = p.rot ?? [0, 0, 0];
  const d = deslocar ?? [0, 0, 0];
  const m = Matrix.Compose(
    new Vector3(escala[0], escala[1], escala[2]),
    Quaternion.RotationYawPitchRoll(rot[1], rot[0], rot[2]),
    new Vector3(p.pos[0] + d[0], p.pos[1] + d[1], p.pos[2] + d[2]),
  );
  vd.transform(m);
  ajustarDadosPremium(vd, p);
  return vd;
}

/**
 * Spec 023: o que os premium pedem nos vértices, já no lugar da peça na junta: o degradê
 * (`pintar`, na tinta) e a coordenada das listras que correm (`textura`: sobem pela altura).
 */
function ajustarDadosPremium(vd: VertexData, p: Peca): void {
  const pos = vd.positions!;
  const n = pos.length / 3;
  if (p.pintar) {
    const cores = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const [r, g, b] = corViva(p.pintar(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
      cores.set([r, g, b, 1], i * 4);
    }
    vd.colors = cores;
  }
  if (p.textura) {
    const uv = new Float32Array(n * 2);
    // uma volta inteira das 7 listras a cada 0,42 (a altura do tronco)
    for (let i = 0; i < n; i++) {
      uv[i * 2] = 0.5;
      uv[i * 2 + 1] = pos[i * 3 + 1] / 0.42;
    }
    vd.uvs = uv;
  }
}

/** Spec 023: o material da peça (luz própria, listras, tinta ou cor). */
function materialDaPeca(scene: Scene, mats: Plasticos, p: Peca): StandardMaterial {
  if (p.luz) return luzPremium(scene, p.luz);
  if (p.textura) return mats.textura(texturaListras(scene), p.brilho ?? 0.28);
  return p.viva
    ? mats.tinta(p.brilho ?? 0.28, p.alfa ?? 1)
    : mats.cor(p.cor, p.brilho ?? 0.28, p.alfa ?? 1);
}

/** As espécies de dados de vértice da peça (só junta malhas com as mesmas). */
function tiposDaPeca(p: Peca, corNoVertice = false): string {
  // todas as formas têm posição, normal e uv; a tinta da fantasia tem cor
  return p.viva || corNoVertice ? 'cor' : '';
}

function naVista(m: Mesh): void {
  m.alwaysSelectAsActiveMesh = true;
  m.doNotSyncBoundingInfo = true;
}

export function criarBoneco(
  scene: Scene,
  aparencia: Aparencia,
  prefixo = 'personagem',
  /** Ajusta o plano antes de montar (moradores: cores e peças do tema). */
  ajustarPlano?: (p: PlanoBoneco) => PlanoBoneco,
  /**
   * Desempenho (spec 013): funde as peças da mesma junta e do mesmo material numa malha só
   * (o desenho é o mesmo; olhos, brilho dos olhos e boca ficam soltos, porque piscam e
   * falam). Para os moradores, que não trocam de aparência.
   */
  fundir = false,
  /**
   * Desempenho (spec 015): o boneco do jogador está sempre na frente da câmera de terceira
   * pessoa; as peças não passam pelo teste de vista nem refazem a caixa envolvente a cada
   * quadro (não projetam sombra e não são clicáveis).
   */
  sempreNaVista = false,
): Personagem {
  const raiz = new TransformNode(prefixo, scene);
  const escalar = new TransformNode(`${prefixo}-escala`, scene);
  escalar.parent = raiz;
  const mats = criarPlasticos(scene, prefixo);
  let juntas = {} as Record<Junta, TransformNode>;
  /** Spec 023: os nós próprios dos premium (as asas do dragão). */
  let subjuntas: Partial<Record<SubjuntaPremium, TransformNode>> = {};
  let malhas: Mesh[] = [];
  let visivel = true;
  let luz = 1;
  /** Meio transparente quando a câmera chega perto demais (spec 015); 1 = normal. */
  let opacidade = 1;
  /** Posição de repouso de cada junta (a pose soma em cima). */
  let repouso = {} as Record<Junta, [number, number, number]>;
  // a mão direita segura pela ponta do cabo: o nó "pega" fica no centro da mão
  const pega = new TransformNode(`${prefixo}-pega`, scene);
  // o item de brinquedo na mão, preso pelo ponto de pega (ponta do cabo nas ferramentas)
  let modelo: ModeloItem | null = null;
  let chaveMao = '';
  const naMao = {
    definir(bloco: number | null, item: string | null) {
      const chave = `${bloco ?? ''}|${item ?? ''}`;
      if (chave === chaveMao) return;
      chaveMao = chave;
      if (modelo) {
        for (const m of modelo.malhas) m.dispose();
        modelo.no.dispose();
      }
      modelo = modeloNaMao(scene, mats, bloco, item, `${prefixo}-mao`);
      if (!modelo) return;
      modelo.no.parent = pega;
      for (const m of modelo.malhas) {
        m.visibility = opacidade;
        if (sempreNaVista) naVista(m);
      }
      // ferramenta: o cabo sai da mão para a frente com o braço abaixado; peças ficam
      // apoiadas na palma, um pouco à frente
      if (modelo.ferramenta) modelo.no.rotation.set(Math.PI / 2, 0, 0);
      else if (modelo.planta) {
        // a flor sai da mão para cima, do tamanho de uma flor de verdade na mão do boneco
        modelo.no.position.set(0, -0.02, 0.1);
        modelo.no.scaling.setAll(1.6);
      } else modelo.no.position.set(0, -0.05, 0.09);
      for (const m of modelo.malhas) m.setEnabled(visivel);
    },
    segurando: () => modelo !== null,
    definirLuz(_f: number) {
      // os materiais são os mesmos do boneco (seguem a mesma luz)
    },
    definirVisivel(v: boolean) {
      if (modelo) for (const m of modelo.malhas) m.setEnabled(v);
    },
    descartar() {
      if (modelo) {
        for (const m of modelo.malhas) m.dispose();
        modelo.no.dispose();
      }
      modelo = null;
    },
  };

  function limpar(): void {
    pega.parent = null;
    for (const m of malhas) m.dispose();
    for (const j of Object.values(subjuntas)) j.dispose();
    for (const j of Object.values(juntas)) j.dispose();
    subjuntas = {};
    malhas = [];
    juntas = {} as Record<Junta, TransformNode>;
  }

  function aplicarAparencia(a: Aparencia): void {
    limpar();
    const plano = ajustarPlano ? ajustarPlano(planoBoneco(a)) : planoBoneco(a);
    escalar.scaling.setAll(plano.escala);
    for (const [nome, j] of Object.entries(plano.juntas) as Array<
      [Junta, (typeof plano.juntas)[Junta]]
    >) {
      const no = new TransformNode(`${prefixo}-junta-${nome}`, scene);
      no.position.set(j.pos[0], j.pos[1], j.pos[2]);
      juntas[nome] = no;
      repouso[nome] = [...j.pos];
    }
    for (const [nome, j] of Object.entries(plano.juntas) as Array<
      [Junta, (typeof plano.juntas)[Junta]]
    >)
      juntas[nome].parent = j.pai ? juntas[j.pai] : escalar;
    // fundir: as peças da mesma junta e do mesmo material são juntadas na memória e sobem
    // para a placa de vídeo uma vez só, numa malha (spec 013; spec 017 sem malhas de passagem)
    const paraFundir = new Map<
      string,
      {
        junta: Junta;
        material: StandardMaterial;
        dados: VertexData[];
        nome: string;
        pivo?: [number, number, number];
        n: number;
        /** Spec 023: o nó próprio (as asas), quando não é a junta. */
        no?: TransformNode;
      }
    >();
    const materialDe = (p: Peca) => materialDaPeca(scene, mats, p);
    /**
     * Spec 014 (T11, desempenho da cidade: 12 moradores à vista na praça): a peça opaca de cor
     * lisa vai com a cor nos vértices num material por brilho, desenhado igual ao da cor; as
     * peças da mesma junta viram uma malha só (de ~22 para ~9 malhas por morador).
     */
    const corVertice = (p: Peca) =>
      !p.viva && !p.luz && !p.textura && (p.alfa ?? 1) >= 1
        ? mats.corVertice(p.brilho ?? 0.28)
        : null;
    // spec 023: os nós próprios dos premium (as asas), dentro da junta deles
    const noDaPeca = (p: Peca): TransformNode => {
      const sj = p.subjunta;
      if (!sj) return juntas[p.junta];
      let no = subjuntas[sj.nome];
      if (!no) {
        no = new TransformNode(`${prefixo}-junta-${sj.nome}`, scene);
        no.parent = juntas[p.junta];
        no.position.set(sj.pivo[0], sj.pivo[1], sj.pivo[2]);
        subjuntas[sj.nome] = no;
      }
      return no;
    };
    for (const p of plano.pecas) {
      // os dois olhos (e os dois brilhos) piscam juntos e ficam na mesma altura: viram uma
      // malha só, que pisca em volta do meio deles
      const par = /^(olho|brilho)-?\d/.exec(p.nome)?.[1];
      if (fundir && (par || !/^(olho|brilho|boca)/.test(p.nome))) {
        const cv = corVertice(p);
        const material = cv ?? materialDe(p);
        // a mão não gira sozinha: as peças dela vão para a junta do braço (menos malhas)
        let junta = p.junta;
        let deslocar: [number, number, number] | undefined;
        if (!par && (junta === 'maoE' || junta === 'maoD')) {
          deslocar = plano.juntas[junta].pos;
          junta = junta === 'maoE' ? 'bracoE' : 'bracoD';
        }
        const sub = p.subjunta?.nome ?? '';
        const k = `${par ?? ''}|${junta}|${sub}|${material.uniqueId}|${tiposDaPeca(p, !!cv)}`;
        let g = paraFundir.get(k);
        if (!g)
          paraFundir.set(
            k,
            (g = par
              ? { junta, material, dados: [], nome: `${par}s`, pivo: [0, 0, 0], n: 0 }
              : {
                  junta,
                  material,
                  dados: [],
                  nome: sub || junta,
                  n: 0,
                  // a mão já foi para a junta do braço (deslocada): o nó próprio é só das asas
                  no: p.subjunta ? noDaPeca(p) : undefined,
                }),
          );
        g.dados.push(dadosDaPeca(p, deslocar, !!cv));
        if (g.pivo) {
          g.pivo[0] += p.pos[0];
          g.pivo[1] += p.pos[1];
          g.pivo[2] += p.pos[2];
        }
        g.n++;
        continue;
      }
      const m = montarPeca(scene, mats, p, prefixo);
      m.parent = noDaPeca(p);
      m.setEnabled(visivel);
      m.visibility = opacidade;
      malhas.push(m);
    }
    for (const { junta, material, dados, nome, pivo, n, no } of paraFundir.values()) {
      const vd = dados.length === 1 ? dados[0] : dados[0].merge(dados.slice(1), true);
      const f = new Mesh(`${prefixo}-${nome}-fundida`, scene);
      vd.applyToMesh(f);
      // pisca em volta do meio dos olhos (não do meio da cabeça)
      if (pivo) f.setPivotPoint(new Vector3(pivo[0] / n, pivo[1] / n, pivo[2] / n));
      f.material = material;
      // a cor nos vértices é opaca (o alfa do vértice não vale nada)
      f.hasVertexAlpha = false;
      f.isPickable = false;
      f.receiveShadows = false;
      f.parent = no ?? juntas[junta];
      f.setEnabled(visivel);
      f.visibility = opacidade;
      malhas.push(f);
    }
    pega.parent = juntas.maoD;
    pega.position.set(0, 0, 0);
    if (sempreNaVista) for (const m of malhas) naVista(m);
    olhos = malhas.filter((m) => /-(olho|brilho)/.test(m.name));
    boca = malhas.find((m) => m.name.endsWith('-boca')) ?? null;
    // a escala é a forma oval de cada peça: o piscar e a boca multiplicam sobre ela
    baseY.clear();
    for (const m of [...olhos, ...(boca ? [boca] : [])]) baseY.set(m, m.scaling.y);
    mats.definirLuz(luz);
  }
  let olhos: Mesh[] = [];
  let boca: Mesh | null = null;
  let faseAsa = 0;
  const baseY = new Map<Mesh, number>();

  /** Valores suavizados entre quadros (nada salta de uma pose para outra). */
  const atual = new Map<string, number>();
  const suave = (chave: string, alvo: number, k: number) => {
    const v = atual.get(chave) ?? alvo;
    const n = v + (alvo - v) * k;
    atual.set(chave, n);
    return n;
  };

  /** Sobe na hora até o alvo e desce suave (a capa levanta com a perna e cai devagar). */
  const subirJunto = (chave: string, alvo: number, k: number) => {
    const v = atual.get(chave) ?? alvo;
    const n = alvo >= v ? alvo : v + (alvo - v) * k;
    atual.set(chave, n);
    return n;
  };

  function aplicarPose(pose: Pose, extras?: ExtrasPose): void {
    if (!juntas.corpo) return;
    const dt = extras ? Math.min(Math.max(extras.dt, 0), 0.1) : 1;
    const k = extras ? 1 - Math.exp(-dt * 16) : 1;
    const kLento = extras ? 1 - Math.exp(-dt * 6) : 1;
    // para onde cada junta vai nesta pose (a mesma conta do teste de encaixe)
    const alvo = rotacoesDaPose(pose, extras ? extras.olhar : 0, naMao.segurando());
    const j = juntas;
    j.corpo.position.y = suave('corpoY', alvo.corpoY, k);
    // movimento com vida: o corpo inteiro inclina para a frente e para dentro da curva
    // (os valores já chegam suavizados do corpo vivo; os gestos também usam)
    j.corpo.rotation.x = suave('corpoX', alvo.corpo[0], k);
    j.corpo.rotation.z = suave('corpoZ', alvo.corpo[2], k);
    const esc = suave('escala', alvo.escala, k);
    j.corpo.scaling.set(1 / Math.sqrt(esc), esc, 1 / Math.sqrt(esc));
    j.tronco.rotation.x = suave('troncoX', alvo.tronco[0], kLento);
    j.tronco.rotation.y = suave('troncoY', alvo.tronco[1], k);
    j.tronco.rotation.z = suave('troncoZ', alvo.tronco[2], k);
    j.pernaD.rotation.x = suave('pernaD', alvo.pernaD[0], k);
    j.pernaE.rotation.x = suave('pernaE', alvo.pernaE[0], k);
    j.bracoD.rotation.x = suave('bracoD', alvo.bracoD[0], k);
    j.bracoE.rotation.x = suave('bracoE', alvo.bracoE[0], k);
    j.bracoD.rotation.z = suave('bracoDZ', alvo.bracoD[2], k);
    j.bracoE.rotation.z = suave('bracoEZ', alvo.bracoE[2], k);
    j.bracoD.rotation.y = suave('bracoDY', alvo.bracoD[1], k);
    j.bracoE.rotation.y = suave('bracoEY', alvo.bracoE[1], k);
    j.cabeca.rotation.x = suave('cabecaX', alvo.cabeca[0], k);
    j.cabeca.rotation.y = suave('cabecaY', alvo.cabeca[1], k);
    j.cabeca.rotation.z = suave('cabecaZ', alvo.cabeca[2], k);
    j.topete.rotation.x = suave('topete', alvo.topete[0], kLento);
    // spec 017: capa, saia e rabo sobem junto com o movimento (nunca ficam para trás das
    // pernas e dos braços) e descem devagar, como pano
    j.capa.rotation.x = subirJunto('capaX', alvo.capa[0], kLento);
    j.capa.rotation.z = suave('capaZ', alvo.capa[2], kLento);
    j.saia.rotation.x = suave('saiaX', alvo.saia[0], k);
    j.saia.rotation.z = suave('saiaZ', alvo.saia[2], kLento);
    const abre = subirJunto('saiaAbre', alvo.saiaEscala[0], kLento);
    j.saia.scaling.set(abre, suave('saiaY', alvo.saiaEscala[1], k), abre);
    j.rabo.rotation.x = subirJunto('raboX', alvo.rabo[0], kLento);
    j.rabo.rotation.y = suave('raboY', alvo.rabo[1], k);
    // spec 023: as asas do dragão batem: devagar parado (mas sempre se vê), rápido correndo e
    // forte no ar; a fase anda com o tempo (mudar o ritmo não dá tranco)
    if (subjuntas.asaE || subjuntas.asaD) {
      const v = extras?.vista;
      const forte = Math.max(v?.noAr ?? 0, Math.min(1, (v?.passada ?? 0) / 1.5));
      faseAsa += dt * (1.15 + forte * 2.9) * Math.PI * 2;
      const amp = 0.34 + forte * 0.5;
      // parado, a batida sobe menos do que desce: de frente, as pontas não espetam acima do
      // capuz (o vaivém continua bem maior que 15°)
      const sobe = 0.55 + forte * 0.45;
      const bate = Math.sin(faseAsa);
      for (const [no, s] of [
        [subjuntas.asaE, -1],
        [subjuntas.asaD, 1],
      ] as const) {
        if (!no) continue;
        no.rotation.y = s * (0.42 + Math.sin(faseAsa + 0.9) * amp * 0.45);
        no.rotation.z = s * (-0.06 + forte * 0.2 + (bate > 0 ? bate * sobe : bate) * amp);
        no.rotation.x = -0.12;
      }
    }
    const pisca = pose.piscar ? 0.1 : 1;
    for (const o of olhos) o.scaling.y = (baseY.get(o) ?? 1) * pisca;
    if (boca) boca.scaling.y = (baseY.get(boca) ?? 1) * (1 + (pose.boca ?? 0) * 1.1);
  }

  aplicarAparencia(aparencia);

  return {
    raiz,
    aplicarAparencia,
    aplicarPose,
    posicionar(x, y, z, yaw) {
      raiz.position.set(x, y, z);
      raiz.rotation.y = yaw;
    },
    definirLuz(f) {
      // os amigos e moradores recebem a luz a cada quadro: só repinta quando ela muda
      if (Math.abs(f - luz) < 0.002) return;
      luz = f;
      mats.definirLuz(f);
      naMao.definirLuz(f);
    },
    definirNaMao(bloco, item) {
      naMao.definir(bloco, item);
    },
    definirVisivel(v) {
      visivel = v;
      for (const m of malhas) m.setEnabled(v);
      naMao.definirVisivel(v);
    },
    definirOpacidade(a) {
      const n = Math.min(1, Math.max(0, a));
      if (n === opacidade) return;
      opacidade = n;
      mats.definirSoFrente(n < 1);
      for (const m of malhas) {
        m.visibility = n;
        // meio transparente, a ordem de desenho das peças usa a caixa de cada uma
        if (sempreNaVista) m.doNotSyncBoundingInfo = n >= 1;
      }
      if (modelo) for (const m of modelo.malhas) m.visibility = n;
    },
    opacidade: () => opacidade,
    contarMalhas: () => malhas.length,
    contarMalhasMao: () => (modelo ? modelo.malhas.length : 0),
    descartar() {
      limpar();
      naMao.descartar();
      pega.dispose();
      mats.descartar();
      escalar.dispose();
      raiz.dispose();
    },
  };
}
