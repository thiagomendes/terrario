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
import { criarPaletaLuz } from './luzes';

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
  // as luzes (as lâmpadas da grade, os raios, a placa do rinque): acesas, a cor na paleta
  const paleta = criarPaletaLuz(scene, 'vila-sosia-luz', false);
  const matLuz = paleta.material;
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
        const vd = e.l.juntar();
        paleta.aplicar(vd);
        vd.applyToMesh(luzes);
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
  const GRAFITE = '#3a3944';
  const CROMO = '#d4d8e2';
  /** O raio da logo em degraus (5 caixas), no plano x-y (`emX`) ou z-y, com a altura `k`. */
  const raio = (
    cx: Caixa,
    emX: boolean,
    m: number,
    y0: number,
    k: number,
    f0: number,
    f1: number,
    cor: string,
  ) => {
    for (const [a0, a1, b0, b1] of [
      [0.12, 0.42, 0.3, 0.5],
      [0.0, 0.3, 0.1, 0.3],
      [-0.24, 0.36, -0.08, 0.1],
      [-0.05, 0.22, -0.28, -0.08],
      [-0.16, 0.06, -0.5, -0.28],
    ]) {
      const ya = y0 + (b0 + 0.5) * k;
      const yb = y0 + (b1 + 0.5) * k;
      if (emX) cx(m + a0 * k, m + a1 * k, ya, yb, f0, f1, cor);
      else cx(f0, f1, ya, yb, m + a0 * k, m + a1 * k, cor);
    }
  };
  // o palco: o chão (grama), o tablado de beira vermelha com a passarela, a concha grafite (o
  // fundo e as abas), as torres e a grade de luzes, as caixas penduradas, os raios e as lâmpadas
  fazer(
    'palco',
    { x0: palco.x0 - 8, z0: palco.z0 - 8, x1: palco.x1 + 8, z1: palco.z1 + 3 },
    (c, l) => {
      const x0 = palco.x0;
      const x1 = palco.x1 + 1;
      // a frente do tablado (a passarela entra 5 na plateia) e o fundo
      const zf = palco.z0 + 5;
      const zb = palco.z1 + 1;
      const yp = palco.y + 1;
      // o chão: o gramado aparado em faixas, o caminho de cascalho e a grade da plateia
      for (let z = palco.z0 - 8; z < zb + 3; z += 4)
        c(x0 - 8, x1 + 8, Y - 1, Y, z, Math.min(zb + 3, z + 4), ((z - palco.z0) >> 2) & 1 ? '#3f9a34' : '#58b848');
      c((x0 + x1) / 2 - 1.5, (x0 + x1) / 2 + 2.5, Y - 0.02, Y + 0.03, palco.z0 - 8, palco.z0 - 3, '#b08a5c');
      c(x0 - 8, x1 + 8, Y, Y + 0.7, palco.z0 - 3.2, palco.z0 - 2.9, '#e2e6ee');
      c(x0 - 8, x1 + 8, Y + 0.7, Y + 0.95, palco.z0 - 3.25, palco.z0 - 2.85, '#e8302a');
      // a saia do tablado: grafite e azul alternados, a beira vermelha
      c(x0, x1, Y, yp - 1, zf, zb, GRAFITE);
      for (let x = x0; x < x1; x += 4) {
        c(x + 2, Math.min(x1, x + 4), Y, yp - 1, zf - 0.04, zf, '#2f6fd0');
        c(x1 - 0.02, x1 + 0.04, Y, yp - 1, zf + (x - x0) / 2 + 1, zf + (x - x0) / 2 + 2, '#2f6fd0');
        c(x0 - 0.04, x0 + 0.02, Y, yp - 1, zf + (x - x0) / 2 + 1, zf + (x - x0) / 2 + 2, '#2f6fd0');
      }
      c(x0, x1, yp - 1, yp, zf, zb, '#e8302a');
      // a escadinha do lado leste
      for (let i = 0; i < 3; i++) c(x1 + i, x1 + i + 1, Y, yp - i - 0.02, zf + 2, zf + 4, '#8e8a86');
      c(x0 + 0.2, x1 - 0.2, yp - 0.02, yp + 0.02, zf + 0.2, zb, '#34333d');
      const mx = (x0 + x1) / 2 + 0.5;
      c(mx - 3, mx + 3, Y, yp - 1, palco.z0, zf, '#2f6fd0');
      c(mx - 3, mx + 3, yp - 1, yp, palco.z0, zf, '#c8302a');
      // a concha: o fundo e as abas, com o fio de neon em cima
      const topo = Y + 12;
      c(x0, x1, yp, topo, zb - 1, zb, GRAFITE);
      c(x0, x0 + 1, yp, topo, zb - 7, zb - 1, GRAFITE);
      c(x1 - 1, x1, yp, topo, zb - 7, zb - 1, GRAFITE);
      l(x0, x1, topo, topo + 0.5, zb - 1, zb, '#2ee0d0');
      l(x0, x0 + 1, topo, topo + 0.5, zb - 7, zb - 1, '#2ee0d0');
      l(x1 - 1, x1, topo, topo + 0.5, zb - 7, zb - 1, '#2ee0d0');
      // os amplificadores e o praticável vermelho da bateria
      c(x0 + 1, x0 + 5, yp, yp + 3, zb - 2, zb - 1, '#2a2932');
      c(x1 - 5, x1 - 1, yp, yp + 3, zb - 2, zb - 1, '#2a2932');
      c(mx - 4, mx + 4, yp, yp + 1, zb - 4, zb - 1, '#c8302a');
      c(mx - 1.6, mx + 1.6, yp + 1, yp + 2.4, zb - 3, zb - 2, '#e8e4dc');
      // as torres de treliça, a grade de luzes e as travessas
      // (em gomos claros e escuros: de longe lê como treliça, não como viga lisa)
      const g = Y + 16;
      const GOMO = ['#eef1f6', '#b4bac6'];
      for (const tx of [x0 - 2, x1 + 1])
        for (const tz of [zf - 1, zb - 1])
          for (let y = Y; y < g + 1; y += 2) c(tx, tx + 1, y, Math.min(g + 1, y + 2), tz, tz + 1, GOMO[((y - Y) >> 1) & 1]);
      for (const tz of [zf - 1, zb - 1, zf + 6])
        for (let x = x0 - 2; x < x1 + 2; x += 2) c(x, Math.min(x1 + 2, x + 2), g, g + 1, tz, tz + 1, GOMO[((x - x0 + 2) >> 1) & 1]);
      for (const tx of [x0 - 2, x0 + 8, mx - 1, x1 - 9, x1 + 1])
        for (let z = zf; z < zb - 1; z += 2) c(tx, tx + 1, g, g + 1, z, Math.min(zb - 1, z + 2), GOMO[((z - zf) >> 1) & 1]);
      // as caixas de som penduradas e as flâmulas
      c(x0 - 5, x0 - 3, g - 7, g - 3, zf - 1, zf, '#2a2932');
      c(x1 + 2, x1 + 4, g - 7, g - 3, zf - 1, zf, '#2a2932');
      // os cones das caixas (penduradas e dos amplificadores): quadradinhos mais claros
      for (const sx of [x0 - 5, x1 + 2])
        for (let i = 0; i < 2; i++)
          for (let j = 0; j < 4; j++) {
            c(sx + i + 0.22, sx + i + 0.78, g - 7 + j + 0.22, g - 7 + j + 0.78, zf - 1.05, zf - 1, '#6a6976');
            if (sx > x0) c(sx + 2, sx + 2.05, g - 7 + j + 0.22, g - 7 + j + 0.78, zf - 0.78, zf - 0.22, '#6a6976');
          }
      for (const ax of [x0 + 1, x1 - 5])
        for (let i = 0; i < 4; i++)
          for (let j = 0; j < 3; j++)
            c(ax + i + 0.22, ax + i + 0.78, yp + j + 0.22, yp + j + 0.78, zb - 2.05, zb - 2, '#6a6976');
      c(x0 - 5, x0 - 2, g - 3, g - 2, zf - 1, zf, CROMO);
      c(x1 + 1, x1 + 4, g - 3, g - 2, zf - 1, zf, CROMO);
      c(x0 - 2.1, x0 - 0.9, g - 6.2, g - 4, zf - 2.3, zf - 2.1, '#c8302a');
      c(x1 + 0.9, x1 + 2.1, g - 6.2, g - 4, zf - 2.3, zf - 2.1, '#2f6fd0');
      // os holofotes da grade (lâmpadas), os raios acesos e o arco de lâmpadas
      const cores = ['#e8302a', '#2f8cff', '#fff1c4', '#ffe14a'];
      for (let i = 0; i < 8; i++) {
        const x = x0 + 2 + (i * (x1 - x0 - 5)) / 7;
        c(x, x + 0.7, g - 1.2, g, zf - 1, zf - 0.3, '#2a2932');
        l(x + 0.1, x + 0.6, g - 1.1, g - 0.6, zf - 1.2, zf - 1, cores[i % 4]);
      }
      raio(c, true, mx, yp + 1.9, 7.2, zb - 1.3, zb - 1.1, CROMO);
      raio(l, true, mx, yp + 2.3, 6.4, zb - 1.5, zb - 1.3, '#e8302a');
      raio(l, true, mx + 0.1, yp + 3.0, 5.0, zb - 1.7, zb - 1.5, '#ffe14a');
      raio(l, true, x0 + 8.5, yp + 4.2, 3, zb - 1.4, zb - 1.1, '#2f8cff');
      raio(l, true, x1 - 8.5, yp + 4.2, 3, zb - 1.4, zb - 1.1, '#ffe14a');
      for (const [f0, f1] of [
        [x1, x1 + 0.3],
        [x0 - 0.3, x0],
      ]) {
        raio(l, false, zb - 4, yp + 1.2, 7.6, f0, f1, '#e8302a');
        raio(
          l,
          false,
          zb - 3.9,
          yp + 2.2,
          5.6,
          f0 < x0 ? f0 - 0.2 : f1,
          f0 < x0 ? f0 : f1 + 0.2,
          '#ffe14a',
        );
      }
      for (let i = 0; i <= 10; i++) {
        const a = ((16 + i * 14.8) * Math.PI) / 180;
        const x = mx + Math.cos(a) * 7.6;
        const y = yp + 1.6 + Math.sin(a) * 7.6;
        l(x - 0.25, x + 0.25, y - 0.25, y + 0.25, zb - 1.4, zb - 1.1, '#fff1c4');
      }
    },
  );
  // o rinque: a pista quadriculada, a mureta, o arco de treliça com o globo e o pórtico aceso
  const rq = plano.pontos.rinque;
  fazer('rinque', { x0: rq.x0, z0: rq.z0 - 4, x1: rq.x1, z1: rq.z1 }, (c, l) => {
    const x0 = rq.x0;
    const x1 = rq.x1 + 1;
    const z0 = rq.z0;
    const z1 = rq.z1 + 1;
    c(x0 - 2, x1 + 2, Y - 1, Y, z0 - 5, z1 + 2, '#c9c4bb');
    for (let x = x0; x < x1; x += 4)
      for (let z = z0; z < z1; z += 4)
        c(
          x,
          Math.min(x1, x + 4),
          Y - 0.02,
          Y + 0.04,
          z,
          Math.min(z1, z + 4),
          ((x - x0) / 4 + (z - z0) / 4) % 2 ? '#3a3944' : '#ff6fb4',
        );
    for (const z of [z0 - 1, z1]) c(x0 - 1, x1 + 1, Y, Y + 0.8, z + 0.35, z + 0.65, '#4a4954');
    for (const x of [x0 - 1, x1]) c(x + 0.35, x + 0.65, Y, Y + 0.8, z0 - 1, z1 + 1, '#4a4954');
    for (const x of [x0 - 1, x1])
      for (const z of [z0 - 1, z1]) {
        c(x + 0.3, x + 0.7, Y, Y + 3, z + 0.3, z + 0.7, '#3a3944');
        l(x + 0.15, x + 0.85, Y + 3, Y + 3.7, z + 0.15, z + 0.85, '#ffe08e');
      }
    // o arco de treliça e o globo
    const za = z0 + 7;
    c(x0 + 1, x0 + 2, Y, Y + 10, za, za + 1, CROMO);
    c(x1 - 2, x1 - 1, Y, Y + 10, za, za + 1, CROMO);
    c(x0 + 1, x1 - 1, Y + 9, Y + 10, za, za + 1, CROMO);
    const mx = (x0 + x1) / 2;
    c(mx - 0.8, mx + 0.8, Y + 7.1, Y + 8.7, za - 0.3, za + 1.3, '#c2c7d2');
    // o pórtico da entrada
    for (const x of [mx - 2.2, mx + 1.96]) c(x, x + 0.24, Y, Y + 4.6, z0 - 1.62, z0 - 1.38, CROMO);
    c(mx - 2.4, mx + 2.4, Y + 4.3, Y + 6.4, z0 - 1.7, z0 - 1.3, '#2e2d36');
    l(mx - 1.9, mx + 1.9, Y + 4.8, Y + 5.9, z0 - 1.78, z0 - 1.7, '#ff6fb4');
    l(mx - 1.9, mx + 1.9, Y + 4.8, Y + 5.9, z0 - 1.3, z0 - 1.22, '#ff6fb4');
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
      // (de dia com mais cor e contraste: o palco de longe não fica uma mancha lavada)
      const k = 0.36 - 0.06 * noite;
      mat.emissiveColor.set(fog.r * k, fog.g * k, fog.b * k);
      const d = 0.68 * (1 - noite) + 0.1;
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
      paleta.descartar();
    },
  };
}
