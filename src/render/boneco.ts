/**
 * O boneco de brinquedo em 3D (spec 012): monta as peças do plano (personagem/boneco.ts)
 * presas nas juntas, aplica a pose com os movimentos novos (peso, mola, golpe com preparo,
 * respiração, piscar, topete) e segura o item na mão direita pela ponta do cabo.
 * Mesmo contrato do personagem antigo (render/personagem.ts), para a cena, os amigos e o
 * editor não mudarem.
 */
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { Aparencia } from '../personagem/aparencia';
import { planoBoneco, type Junta, type Peca } from '../personagem/boneco';
import type { Pose } from '../personagem/poses';
import { caixaArredondada, cilindro, criarPlasticos, esfera, type Plasticos } from './formas';
import { modeloNaMao, type ModeloItem } from './itensBrinquedo';
import type { ExtrasPose, Personagem } from './personagem';

export const MAXIMO_MALHAS_BONECO = 90;

/** Uma peça em 3D a partir do plano. */
export function montarPeca(scene: Scene, mats: Plasticos, p: Peca, prefixo: string): Mesh {
  const mat = mats.cor(p.cor, p.brilho ?? 0.28);
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
  else {
    m = MeshBuilder.CreateTorus(
      nome,
      { diameter: p.tamanho[0], thickness: p.tamanho[1], tessellation: 20 },
      scene,
    );
    m.material = mat;
    m.isPickable = false;
  }
  m.position.set(p.pos[0], p.pos[1], p.pos[2]);
  if (p.rot) m.rotation.set(p.rot[0], p.rot[1], p.rot[2]);
  m.receiveShadows = false;
  return m;
}

export function criarBoneco(
  scene: Scene,
  aparencia: Aparencia,
  prefixo = 'personagem',
): Personagem {
  const raiz = new TransformNode(prefixo, scene);
  const escalar = new TransformNode(`${prefixo}-escala`, scene);
  escalar.parent = raiz;
  const mats = criarPlasticos(scene, prefixo);
  let juntas = {} as Record<Junta, TransformNode>;
  let malhas: Mesh[] = [];
  let visivel = true;
  let luz = 1;
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
      // ferramenta: o cabo sai da mão para a frente com o braço abaixado; peças ficam
      // apoiadas na palma, um pouco à frente
      if (modelo.ferramenta) modelo.no.rotation.set(Math.PI / 2, 0, 0);
      else modelo.no.position.set(0, -0.05, 0.09);
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
    for (const j of Object.values(juntas)) j.dispose();
    malhas = [];
    juntas = {} as Record<Junta, TransformNode>;
  }

  function aplicarAparencia(a: Aparencia): void {
    limpar();
    const plano = planoBoneco(a);
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
    for (const p of plano.pecas) {
      if (p.soVista) continue;
      const m = montarPeca(scene, mats, p, prefixo);
      m.parent = juntas[p.junta];
      m.setEnabled(visivel);
      malhas.push(m);
    }
    pega.parent = juntas.maoD;
    pega.position.set(0, 0, 0);
    olhos = malhas.filter((m) => /-(olho|brilho)/.test(m.name));
    boca = malhas.find((m) => m.name.endsWith('-boca')) ?? null;
    // a escala é a forma oval de cada peça: o piscar e a boca multiplicam sobre ela
    baseY.clear();
    for (const m of [...olhos, ...(boca ? [boca] : [])]) baseY.set(m, m.scaling.y);
    mats.definirLuz(luz);
  }
  let olhos: Mesh[] = [];
  let boca: Mesh | null = null;
  const baseY = new Map<Mesh, number>();

  /** Valores suavizados entre quadros (nada salta de uma pose para outra). */
  const atual = new Map<string, number>();
  const suave = (chave: string, alvo: number, k: number) => {
    const v = atual.get(chave) ?? alvo;
    const n = v + (alvo - v) * k;
    atual.set(chave, n);
    return n;
  };

  function aplicarPose(pose: Pose, extras?: ExtrasPose): void {
    if (!juntas.corpo) return;
    const dt = extras ? Math.min(Math.max(extras.dt, 0), 0.1) : 1;
    const k = extras ? 1 - Math.exp(-dt * 16) : 1;
    const kLento = extras ? 1 - Math.exp(-dt * 6) : 1;
    const olhar = extras ? Math.max(-0.9, Math.min(0.9, extras.olhar)) : 0;
    const segurando = naMao.segurando();
    const j = juntas;
    j.corpo.position.y = suave('corpoY', pose.corpoY ?? pose.tronco, k);
    const esc = suave('escala', pose.escala ?? 1, k);
    j.corpo.scaling.set(1 / Math.sqrt(esc), esc, 1 / Math.sqrt(esc));
    j.tronco.rotation.x = suave('troncoX', pose.troncoX ?? 0, kLento);
    j.tronco.rotation.y = suave('troncoY', pose.troncoY ?? 0, k);
    j.tronco.rotation.z = suave('troncoZ', pose.troncoZ ?? 0, k);
    j.pernaD.rotation.x = suave('pernaD', pose.pernaDireita, k);
    j.pernaE.rotation.x = suave('pernaE', pose.pernaEsquerda, k);
    // segurando algo, o antebraço fica um pouco à frente (como antes)
    j.bracoD.rotation.x = suave('bracoD', pose.bracoDireito - (segurando ? 0.32 : 0), k);
    j.bracoE.rotation.x = suave('bracoE', pose.bracoEsquerdo, k);
    j.bracoD.rotation.z = suave('bracoDZ', -0.06 - (pose.bracoDireitoAbre ?? 0), k);
    j.bracoE.rotation.z = suave('bracoEZ', 0.06 + (pose.bracoEsquerdoAbre ?? 0), k);
    // a cabeça acompanha o olhar da câmera e compensa a inclinação do tronco
    j.cabeca.rotation.x = suave('cabecaX', pose.cabeca + olhar * 0.75 - (pose.troncoX ?? 0), k);
    j.cabeca.rotation.y = suave('cabecaY', pose.cabecaGiro ?? 0, kLento);
    j.cabeca.rotation.z = suave('cabecaZ', pose.cabecaLado ?? 0, k);
    j.topete.rotation.x = suave('topete', pose.topete ?? 0, kLento);
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
    contarMalhas: () => malhas.length,
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
