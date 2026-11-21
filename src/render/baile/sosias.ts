/**
 * Os sósias de longe da Noite das Fantasias (spec 027, "Campo de visão sem buracos"): a torre do
 * castelinho e a abóbora gigante, em formas grandes e sem detalhe, cada um com o próprio pedaço de
 * chão por baixo, no caminho dos sósias da Vila Neon (`render/vila/sosias.ts`).
 *
 * - Cada pedaço (cortado por chunk) só aparece enquanto o chunk de verdade dele não está desenhado
 *   e a criança está longe; quando o chunk chega, ele some no mesmo quadro (nada em dobro).
 * - A névoa dele é mais fraca que a do mundo, para a silhueta se ler ao longe; de noite, o rosto
 *   da abóbora e as janelas da torre acendem.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { CreateSphereVertexData } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { caixa, Pecas } from '../solidos';
import type { PlanoBaile } from '../../world/noiteFantasias';
import type { RetanguloVila } from '../../world/vilaNeon';
import type { OpcoesRenderBaile } from './index';
import { criarPaletaLuz } from '../vila/luzes';

export interface SosiasBaile {
  quadro(t: number, x: number, z: number, noite: number, alto?: number): void;
  visiveis(): number;
  lista(): { nome: string; caixa: RetanguloVila; visivel: boolean }[];
  /** Cada pedaço (por chunk) e se está à vista: nunca à vista com o chunk desenhado. */
  pedacos(): { nome: string; cx: number; cz: number; visivel: boolean }[];
  descartar(): void;
}

interface Pedaco {
  cx: number;
  cz: number;
  malha: Mesh;
  luzes: Mesh | null;
}

/** Até onde (do meio do pedaço) o sósia não aparece: perto, o de verdade já chegou. */
const PERTO = 24;

export function criarSosiasBaile(scene: Scene, plano: PlanoBaile, opcoes: OpcoesRenderBaile): SosiasBaile {
  const mat = new StandardMaterial('baile-sosia', scene);
  mat.specularColor = Color3.Black();
  mat.diffuseColor = new Color3(0.62, 0.6, 0.62);
  mat.emissiveColor = new Color3(0.36, 0.34, 0.38);
  mat.fogEnabled = false;
  const paleta = criarPaletaLuz(scene, 'baile-sosia-luz', false);
  const lista: { nome: string; caixa: RetanguloVila; pedacos: Pedaco[] }[] = [];
  let acesas = false;

  /** O sósia cortado por chunk: cada pedaço com o chão dele. */
  const fazer = (
    nome: string,
    r: RetanguloVila,
    montar: (c: (vd: ReturnType<typeof caixa>) => void, l: (vd: ReturnType<typeof caixa>) => void) => void,
  ) => {
    const porChunk = new Map<string, { cx: number; cz: number; c: Pecas; l: Pecas }>();
    const pedaco = (luz: boolean) => (vd: ReturnType<typeof caixa>) => {
      const P = vd.positions as number[];
      // o pedaço do meio da peça decide o chunk (as peças do sósia são pequenas perto do chunk)
      let mx = 0;
      let mz = 0;
      for (let i = 0; i < P.length; i += 3) {
        mx += P[i];
        mz += P[i + 2];
      }
      const n = P.length / 3;
      const cx = Math.floor(mx / n / 16);
      const cz = Math.floor(mz / n / 16);
      const k = `${cx},${cz}`;
      let e = porChunk.get(k);
      if (!e) porChunk.set(k, (e = { cx, cz, c: new Pecas(), l: new Pecas() }));
      (luz ? e.l : e.c).add(vd);
    };
    montar(pedaco(false), pedaco(true));
    const pedacos: Pedaco[] = [];
    for (const e of porChunk.values()) {
      if (!e.c.partes.length) continue;
      const malha = new Mesh(`baile-sosia-${nome}-${e.cx},${e.cz}`, scene);
      e.c.juntar().applyToMesh(malha);
      malha.material = mat;
      malha.isPickable = false;
      malha.setEnabled(false);
      opcoes.tapaOGlow?.(malha);
      let luzes: Mesh | null = null;
      if (e.l.partes.length) {
        luzes = new Mesh(`baile-sosia-${nome}-luz-${e.cx},${e.cz}`, scene);
        const vd = e.l.juntar();
        paleta.aplicar(vd);
        vd.applyToMesh(luzes);
        luzes.material = paleta.material;
        luzes.isPickable = false;
        luzes.setEnabled(false);
        opcoes.brilha?.(luzes);
      }
      pedacos.push({ cx: e.cx, cz: e.cz, malha, luzes });
    }
    lista.push({ nome, caixa: r, pedacos });
  };
  const cx = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, cor: string) =>
    caixa(x0, x1, y0, y1, z0, z1, 0, 0, cor, 1);

  // a torre do castelinho: o corpo de tijolo, as cintas roxas, o chapéu pontudo e a bandeirinha
  {
    const [x, yTopo, z] = plano.pontos.torre;
    const y0 = plano.h + 1;
    const r: RetanguloVila = { x0: x - 4, z0: z - 4, x1: x + 4, z1: z + 4 };
    fazer('torre', r, (c, l) => {
      c(cx(x - 3.5, x + 3.5, plano.h - 0.6, plano.h + 1, z - 3.5, z + 3.5, '#5c6430'));
      c(cx(x - 2.5, x + 2.5, y0, yTopo - 6, z - 2.5, z + 2.5, '#c27e44'));
      for (const y of [y0 + 3, y0 + 7, y0 + 11]) c(cx(x - 2.55, x + 2.55, y, y + 1, z - 2.55, z + 2.55, '#6a4494'));
      for (let k = 0; k < 4; k++) {
        const m = 3.5 - k;
        c(cx(x - m, x + m, yTopo - 6 + k, yTopo - 5 + k, z - m, z + m, '#6a4498'));
      }
      c(cx(x - 0.5, x + 0.5, yTopo - 2, yTopo, z - 0.5, z + 0.5, '#6a4498'));
      c(cx(x - 0.05, x + 1.2, yTopo, yTopo + 0.6, z - 0.05, z + 0.05, '#f0862a'));
      for (const y of [y0 + 4, y0 + 8]) l(cx(x - 0.5, x + 0.5, y, y + 1, z - 2.62, z - 2.5, '#ffd87e'));
    });
  }
  // a abóbora gigante: a bola laranja achatada, os gomos, o talo e o rosto (aceso de noite)
  {
    const a = plano.pontos.abobora;
    const L = a.lado;
    const r: RetanguloVila = { x0: a.x - L, z0: a.z - L, x1: a.x + L, z1: a.z + L };
    fazer('abobora', r, (c, l) => {
      c(cx(a.x - L * 0.7, a.x + L * 0.7, plano.h - 0.6, plano.h + 1, a.z - L * 0.7, a.z + L * 0.7, '#5c6430'));
      const bola = CreateSphereVertexData({ diameter: L, segments: 8 });
      const P = bola.positions as number[];
      const N = bola.normals as number[];
      for (let i = 0; i < P.length; i += 3) {
        P[i] = a.x + P[i] * 1.1;
        P[i + 1] = a.y + 0.38 * L + P[i + 1] * 0.82;
        P[i + 2] = a.z + P[i + 2] * 1.1;
        N[i + 1] *= 1.2;
      }
      const cores: number[] = [];
      for (let i = 0; i < P.length / 3; i++) cores.push(0.94, 0.53, 0.14, 1);
      bola.colors = cores;
      bola.uvs = null;
      c(bola as unknown as ReturnType<typeof caixa>);
      c(cx(a.x - 0.5, a.x + 0.5, a.y + 0.75 * L, a.y + 0.95 * L, a.z - 0.5, a.z + 0.5, '#6b7a2e'));
      const f = a.z + 0.5 * L + 0.05;
      for (const s of [-1, 1]) l(cx(a.x + s * 0.12 * L - 0.9, a.x + s * 0.12 * L + 0.9, a.y + 0.43 * L, a.y + 0.55 * L, f - 0.1, f, '#ffd24a'));
      l(cx(a.x - 0.18 * L, a.x + 0.18 * L, a.y + 0.2 * L, a.y + 0.28 * L, f - 0.1, f, '#ffd24a'));
    });
  }

  let vistos = 0;
  return {
    quadro(_t, x, z, noite, alto = 0) {
      const acender = acesas ? noite > 0.3 : noite > 0.42;
      acesas = acender;
      vistos = 0;
      for (const s of lista) {
        let algum = false;
        for (const p of s.pedacos) {
          const longe = Math.hypot(p.cx * 16 + 8 - x, p.cz * 16 + 8 - z) > PERTO;
          // de cima (voando alto) os sósias somem: o mundo de verdade se vê inteiro
          const ver = longe && alto < 40 && !opcoes.temMalha(p.cx, p.cz);
          p.malha.setEnabled(ver);
          p.luzes?.setEnabled(ver && acender);
          if (ver) algum = true;
        }
        if (algum) vistos++;
      }
    },
    visiveis: () => vistos,
    lista: () =>
      lista.map((s) => ({ nome: s.nome, caixa: s.caixa, visivel: s.pedacos.some((p) => p.malha.isEnabled()) })),
    pedacos: () =>
      lista.flatMap((s) =>
        s.pedacos.map((p) => ({ nome: s.nome, cx: p.cx, cz: p.cz, visivel: p.malha.isEnabled() })),
      ),
    descartar() {
      for (const s of lista)
        for (const p of s.pedacos) {
          p.malha.dispose();
          p.luzes?.dispose();
        }
      lista.length = 0;
      paleta.descartar();
      mat.dispose();
    },
  };
}
