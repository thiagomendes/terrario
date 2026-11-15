/**
 * Os sósias de longe dos marcos da Vila Neon (spec 026, "Campo de visão sem buracos"): a grade
 * de luzes do palco e a placa do rinque, em blocos grandes e sem detalhe, cada um com o próprio
 * pedaço de chão por baixo (grama e calçada), no caminho das torres do horizonte da 014.
 *
 * - O sósia só aparece enquanto NENHUM chunk do marco está desenhado (nada fica em dobro) e a
 *   criança está longe; quando o primeiro chunk de verdade chega, ele some no mesmo quadro.
 * - A névoa dele é mais fraca que a do mundo (senão ele sumia inteiro além da borda do chão),
 *   então a silhueta se lê como um marco ao longe; de noite as lâmpadas da grade acendem.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { caixa, Pecas } from '../solidos';
import type { PlanoVila, RetanguloVila } from '../../world/vilaNeon';
import type { OpcoesRenderVila } from './index';

export interface Sosias {
  quadro(t: number, x: number, z: number, noite: number): void;
  /** Quantos sósias estão à vista agora. */
  visiveis(): number;
  /** Os sósias (teste do campo de visão): a caixa de cada um e se está à vista. */
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
interface Sosia {
  nome: string;
  caixa: RetanguloVila;
  pedacos: Pedaco[];
}

/** Até onde (do meio do pedaço) o sósia não aparece: perto, o de verdade já chegou. */
const PERTO = 24;

/** Caixa do mundo (x0..x1, y0..y1, z0..z1) com cor. */
type Caixa = (
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  z0: number,
  z1: number,
  cor: string,
) => void;

export function criarSosias(scene: Scene, plano: PlanoVila, opcoes: OpcoesRenderVila): Sosias {
  const mat = new StandardMaterial('vila-sosia', scene);
  mat.specularColor = Color3.Black();
  mat.diffuseColor = new Color3(0.55, 0.55, 0.58);
  mat.emissiveColor = new Color3(0.35, 0.35, 0.38);
  // a névoa do mundo apagaria tudo além da borda do chão: a cor puxa para a névoa à mão
  mat.fogEnabled = false;
  const matLuz = new StandardMaterial('vila-sosia-luz', scene);
  matLuz.disableLighting = true;
  matLuz.emissiveColor = Color3.White();
  matLuz.diffuseColor = Color3.Black();
  matLuz.specularColor = Color3.Black();
  matLuz.fogEnabled = false;
  const lista: Sosia[] = [];

  /**
   * Monta o sósia cortado por chunk: cada pedaço (com o chão dele) só aparece enquanto o chunk
   * de verdade não está desenhado. Assim a parte de longe do marco aparece mesmo com a parte de
   * perto já carregada, e nada fica em dobro.
   */
  const fazer = (nome: string, r: RetanguloVila, montar: (c: Caixa, l: Caixa) => void) => {
    const porChunk = new Map<string, { cx: number; cz: number; c: Pecas; l: Pecas }>();
    const cortar =
      (luz: boolean): Caixa =>
      (x0, x1, y0, y1, z0, z1, cor) => {
        for (let cx = Math.floor(x0 / 16); cx * 16 < x1; cx++)
          for (let cz = Math.floor(z0 / 16); cz * 16 < z1; cz++) {
            const a0 = Math.max(x0, cx * 16);
            const a1 = Math.min(x1, cx * 16 + 16);
            const b0 = Math.max(z0, cz * 16);
            const b1 = Math.min(z1, cz * 16 + 16);
            if (a1 - a0 < 1e-3 || b1 - b0 < 1e-3) continue;
            const k = `${cx},${cz}`;
            let e = porChunk.get(k);
            if (!e) porChunk.set(k, (e = { cx, cz, c: new Pecas(), l: new Pecas() }));
            (luz ? e.l : e.c).add(caixa(a0, a1, y0, y1, b0, b1, 0, 0, cor, 1));
          }
      };
    montar(cortar(false), cortar(true));
    const pedacos: Pedaco[] = [];
    for (const e of porChunk.values()) {
      let malha: Mesh | null = null;
      if (e.c.partes.length) {
        malha = new Mesh(`vila-sosia-${nome}-${e.cx},${e.cz}`, scene);
        e.c.juntar().applyToMesh(malha);
        malha.material = mat;
        malha.isPickable = false;
        malha.setEnabled(false);
        opcoes.tapaOGlow?.(malha);
      }
      let luzes: Mesh | null = null;
      if (e.l.partes.length) {
        luzes = new Mesh(`vila-sosia-${nome}-luz-${e.cx},${e.cz}`, scene);
        e.l.juntar().applyToMesh(luzes);
        luzes.material = matLuz;
        luzes.isPickable = false;
        luzes.setEnabled(false);
        opcoes.brilha?.(luzes);
      }
      if (!malha) continue;
      pedacos.push({ cx: e.cx, cz: e.cz, malha, luzes });
    }
    lista.push({ nome, caixa: r, pedacos });
  };

  const Y = plano.h + 1;
  const { palco } = plano.pontos;
  // o palco: o chão (grama e o tablado), as torres, a grade de luzes, o fundo e o raio
  fazer(
    'palco',
    { x0: palco.x0 - 4, z0: palco.z0 - 4, x1: palco.x1 + 4, z1: palco.z1 + 2 },
    (c, l) => {
      const x0 = palco.x0 - 4;
      const x1 = palco.x1 + 5;
      const z0 = palco.z0 - 4;
      const z1 = palco.z1 + 3;
      c(x0, x1, Y - 1, Y, z0, z1, '#4f8f3e');
      c(palco.x0, palco.x1 + 1, Y, palco.y + 1, palco.z0 + 5, palco.z1 + 1, '#2e2d36');
      c(palco.x0, palco.x1 + 1, palco.y + 1, Y + 12, palco.z1, palco.z1 + 1, '#2e2d36');
      const topo = Y + 16;
      for (const tx of [palco.x0 - 2, palco.x1 + 2])
        for (const tz of [palco.z0 + 4, palco.z1])
          c(tx, tx + 1, Y, topo + 1, tz, tz + 1, '#d4d8e2');
      c(palco.x0 - 2, palco.x1 + 3, topo, topo + 1, palco.z0 + 4, palco.z0 + 5, '#d4d8e2');
      c(palco.x0 - 2, palco.x1 + 3, topo, topo + 1, palco.z1, palco.z1 + 1, '#d4d8e2');
      // as lâmpadas da grade e o raio do fundo (acesos)
      for (let i = 0; i < 8; i++) {
        const x = palco.x0 + 2 + (i * (palco.x1 - palco.x0 - 4)) / 7;
        l(
          x,
          x + 0.8,
          topo - 0.8,
          topo,
          palco.z0 + 4,
          palco.z0 + 4.8,
          i % 2 ? '#ffe14a' : '#2f8cff',
        );
      }
      const mx = (palco.x0 + palco.x1) / 2;
      l(mx - 1.5, mx + 1.5, Y + 5, Y + 11, palco.z1 - 0.4, palco.z1, '#ffe14a');
    },
  );
  // a placa do rinque
  const rq = plano.pontos.rinque;
  fazer('rinque', { x0: rq.x0, z0: rq.z0 - 4, x1: rq.x1, z1: rq.z1 }, (c, l) => {
    c(rq.x0 - 1, rq.x1 + 2, Y - 1, Y, rq.z0 - 4, rq.z1 + 2, '#c9c4bb');
    c(rq.x0, rq.x1 + 1, Y - 0.98, Y - 0.9, rq.z0, rq.z1 + 1, '#ff6fb4');
    const mx = (rq.x0 + rq.x1) / 2;
    c(mx - 0.2, mx + 0.2, Y, Y + 6, rq.z0 - 3, rq.z0 - 2.6, '#2e2d36');
    l(mx - 3, mx + 3, Y + 5, Y + 7, rq.z0 - 3.2, rq.z0 - 2.8, '#ff6fb4');
  });

  const fog = new Color3();
  return {
    quadro(_t, x, z, noite) {
      for (const s of lista)
        for (const p of s.pedacos) {
          const longe = Math.hypot(p.cx * 16 + 8 - x, p.cz * 16 + 8 - z) > PERTO;
          const ver = longe && !opcoes.temMalha(p.cx, p.cz);
          if (p.malha.isEnabled() !== ver) p.malha.setEnabled(ver);
          if (p.luzes && p.luzes.isEnabled() !== ver) p.luzes.setEnabled(ver);
        }
      // a silhueta puxa para a cor da névoa (mais de dia), e escurece de noite
      fog.copyFrom(scene.fogColor);
      const k = 0.55 - 0.25 * noite;
      mat.emissiveColor.set(fog.r * k, fog.g * k, fog.b * k);
      const d = 0.45 * (1 - noite) + 0.1;
      mat.diffuseColor.set(d, d, d * 1.06);
    },
    visiveis: () =>
      lista.reduce((n, s) => n + s.pedacos.filter((p) => p.malha.isEnabled()).length, 0),
    lista: () =>
      lista.map((s) => ({
        nome: s.nome,
        caixa: s.caixa,
        visivel: s.pedacos.some((p) => p.malha.isEnabled()),
      })),
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
      mat.dispose();
      matLuz.dispose();
    },
  };
}
