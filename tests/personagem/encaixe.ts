/**
 * Régua do encaixe (spec 017, T01): mede, no plano do boneco (sem 3D), a distância entre cada
 * enfeite (peça com `apoio`) e a parte do corpo onde ele se apoia, se ele cobre o rosto e se o
 * cabelo atravessa um chapéu. Serve para os acessórios de hoje e para as fantasias da 017:
 * basta marcar as peças novas com `apoio`.
 *
 * Como mede: cada peça vira uma "distância até a superfície" (negativa dentro dela), igual à
 * malha que o render/boneco.ts monta (caixa de cantos redondos, esfera esticada, cilindro de
 * dois raios e anel). A distância entre duas peças é o menor valor dessa conta nos pontos da
 * superfície de uma, olhando da outra também (os dois lados).
 */
import type { Junta, Peca, PlanoBoneco } from '../../src/personagem/boneco';

type V3 = [number, number, number];

/**
 * Folga máxima entre um enfeite e o apoio, em medidas do plano (antes da escala 1,15).
 * 0,015 é menos que a espessura da aba mais fina (0,04) e cerca de 2% da largura da cabeça
 * (0,72): na câmera do jogo e nas fotos do editor isso fica abaixo de um pixel ou dois; os
 * vãos que o dono viu eram de 0,04 em diante.
 */
export const FOLGA_MAXIMA = 0.015;

/** Peças do cabelo (o que um chapéu precisa cobrir sem ser atravessado). */
export const EH_CABELO = /^(cabelo|nuca|topete|franja|lado|costas|cacho|rabo|coque|tranca|chanel)/;
/** Peças do rosto que nenhum enfeite pode tapar. */
export const EH_ROSTO = /^(olho|brilho|cilio|boca|bochecha)/;

/** Peças que servem de apoio para cada tipo de enfeite. */
const JUNTAS_APOIO: Record<NonNullable<Peca['apoio']>, Junta[]> = {
  cabeca: ['cabeca', 'topete'],
  tronco: ['tronco'],
  mao: ['maoE', 'maoD'],
};

/** Giro de cada junta numa pose (rad, x/y/z); sem nada, o boneco parado. */
export type GirosJuntas = Partial<Record<Junta, V3>>;

/** Passos da peça até o corpo: cada um põe o ponto no espaço do pai (gira e desloca). */
function cadeia(plano: PlanoBoneco, p: Peca, giros: GirosJuntas): Array<{ pos: V3; rot?: V3 }> {
  const passos: Array<{ pos: V3; rot?: V3 }> = [{ pos: p.pos, rot: p.rot }];
  for (let j: Junta | null = p.junta; j; j = plano.juntas[j].pai)
    passos.push({ pos: plano.juntas[j].pos, rot: giros[j] });
  return passos;
}

/** Rotação como no Babylon (z, depois x, depois y). */
function girar(v: V3, r: V3 | undefined, inversa: boolean): V3 {
  if (!r) return v;
  const [rx, ry, rz] = r;
  const rotZ = (p: V3, a: number): V3 => [
    p[0] * Math.cos(a) - p[1] * Math.sin(a),
    p[0] * Math.sin(a) + p[1] * Math.cos(a),
    p[2],
  ];
  const rotX = (p: V3, a: number): V3 => [
    p[0],
    p[1] * Math.cos(a) - p[2] * Math.sin(a),
    p[1] * Math.sin(a) + p[2] * Math.cos(a),
  ];
  const rotY = (p: V3, a: number): V3 => [
    p[0] * Math.cos(a) + p[2] * Math.sin(a),
    p[1],
    -p[0] * Math.sin(a) + p[2] * Math.cos(a),
  ];
  if (!inversa) return rotY(rotX(rotZ(v, rz), rx), ry);
  return rotZ(rotX(rotY(v, -ry), -rx), -rz);
}

const comp = (x: number, y: number) => Math.hypot(x, y);

/** Distância (com sinal) de um ponto local até a superfície da peça. */
function distanciaLocal(p: Peca, q: V3): number {
  const [x, y, z] = q;
  if (p.forma === 'caixa') {
    const meio = [p.tamanho[0] / 2, p.tamanho[1] / 2, p.tamanho[2] / 2];
    const r = Math.max(0, Math.min(p.raio ?? 0.05, ...meio));
    const d = [Math.abs(x) - meio[0] + r, Math.abs(y) - meio[1] + r, Math.abs(z) - meio[2] + r];
    const fora = Math.hypot(Math.max(d[0], 0), Math.max(d[1], 0), Math.max(d[2], 0));
    return fora + Math.min(Math.max(d[0], d[1], d[2]), 0) - r;
  }
  if (p.forma === 'esfera') {
    const [a, b, c] = p.tamanho;
    const k0 = Math.hypot(x / a, y / b, z / c);
    const k1 = Math.hypot(x / (a * a), y / (b * b), z / (c * c));
    return k1 === 0 ? -Math.min(a, b, c) : (k0 * (k0 - 1)) / k1;
  }
  if (p.forma === 'cilindro') {
    // cone cortado (iq): altura, raio de baixo, raio de cima
    const h = p.tamanho[0] / 2;
    const r1 = p.tamanho[1];
    const r2 = p.tamanho[2];
    const qx = comp(x, z);
    const qy = y;
    const k2x = r2 - r1;
    const k2y = 2 * h;
    const cax = qx - Math.min(qx, qy < 0 ? r1 : r2);
    const cay = Math.abs(qy) - h;
    const t = Math.max(
      0,
      Math.min(1, ((r2 - qx) * k2x + (h - qy) * k2y) / (k2x * k2x + k2y * k2y)),
    );
    const cbx = qx - r2 + k2x * t;
    const cby = qy - h + k2y * t;
    const s = cbx < 0 && cay < 0 ? -1 : 1;
    return s * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
  }
  // anel deitado no plano xz (como o CreateTorus)
  const R = p.tamanho[0] / 2;
  const r = p.tamanho[1] / 2;
  return comp(comp(x, z) - R, y) - r;
}

/** Pontos na superfície da peça (no próprio espaço dela). */
function pontosLocais(p: Peca, n = 10): V3[] {
  const pts: V3[] = [];
  if (p.forma === 'caixa') {
    const meio: V3 = [p.tamanho[0] / 2, p.tamanho[1] / 2, p.tamanho[2] / 2];
    const r = Math.max(0, Math.min(p.raio ?? 0.05, ...meio));
    const dentro = meio.map((m) => m - r);
    for (let eixo = 0; eixo < 3; eixo++)
      for (const s of [-1, 1])
        for (let i = 0; i <= n; i++)
          for (let j = 0; j <= n; j++) {
            const u = (eixo + 1) % 3;
            const v = (eixo + 2) % 3;
            const c: V3 = [0, 0, 0];
            c[eixo] = s * meio[eixo];
            c[u] = (i / n) * 2 * meio[u] - meio[u];
            c[v] = (j / n) * 2 * meio[v] - meio[v];
            const q = c.map((x, k) => Math.max(-dentro[k], Math.min(dentro[k], x))) as V3;
            const d: V3 = [c[0] - q[0], c[1] - q[1], c[2] - q[2]];
            const l = Math.hypot(...d);
            pts.push(
              l < 1e-9 ? c : [q[0] + (d[0] / l) * r, q[1] + (d[1] / l) * r, q[2] + (d[2] / l) * r],
            );
          }
    return pts;
  }
  if (p.forma === 'esfera') {
    const [a, b, c] = p.tamanho;
    for (let i = 0; i <= n; i++) {
      const fi = (i / n) * Math.PI - Math.PI / 2;
      for (let j = 0; j < 2 * n; j++) {
        const te = (j / (2 * n)) * Math.PI * 2;
        pts.push([
          a * Math.cos(fi) * Math.cos(te),
          b * Math.sin(fi),
          c * Math.cos(fi) * Math.sin(te),
        ]);
      }
    }
    return pts;
  }
  if (p.forma === 'cilindro') {
    const h = p.tamanho[0] / 2;
    const [, r1, r2] = p.tamanho;
    for (let j = 0; j < 2 * n; j++) {
      const te = (j / (2 * n)) * Math.PI * 2;
      const cx = Math.cos(te);
      const cz = Math.sin(te);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const r = r1 + (r2 - r1) * t;
        pts.push([r * cx, -h + 2 * h * t, r * cz]);
        pts.push([r1 * t * cx, -h, r1 * t * cz]);
        pts.push([r2 * t * cx, h, r2 * t * cz]);
      }
    }
    return pts;
  }
  const R = p.tamanho[0] / 2;
  const r = p.tamanho[1] / 2;
  for (let j = 0; j < 2 * n; j++) {
    const te = (j / (2 * n)) * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const fi = (i / n) * Math.PI * 2;
      const rr = R + r * Math.cos(fi);
      pts.push([rr * Math.cos(te), r * Math.sin(fi), rr * Math.sin(te)]);
    }
  }
  return pts;
}

/** Uma peça pronta para medir: onde está no boneco parado e seus pontos de superfície. */
export interface PecaMedida {
  peca: Peca;
  centro: V3;
  pontos: V3[];
  min: V3;
  max: V3;
  distancia(q: V3): number;
  /** Ponto do espaço da peça para o boneco. */
  paraFora(q: V3): V3;
}

export function medirPeca(
  plano: PlanoBoneco,
  p: Peca,
  giros: GirosJuntas = {},
  n = 10,
): PecaMedida {
  const passos = cadeia(plano, p, giros);
  const paraFora = (q: V3): V3 => {
    let g = q;
    for (const s of passos) {
      g = girar(g, s.rot, false);
      g = [g[0] + s.pos[0], g[1] + s.pos[1], g[2] + s.pos[2]];
    }
    return g;
  };
  const paraDentro = (q: V3): V3 => {
    let g = q;
    for (let i = passos.length - 1; i >= 0; i--) {
      const s = passos[i];
      g = girar([g[0] - s.pos[0], g[1] - s.pos[1], g[2] - s.pos[2]], s.rot, true);
    }
    return g;
  };
  const centro = paraFora([0, 0, 0]);
  const pontos = pontosLocais(p, n).map(paraFora);
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const q of pontos)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], q[k]);
      max[k] = Math.max(max[k], q[k]);
    }
  return {
    peca: p,
    centro,
    pontos,
    min,
    max,
    distancia: (q) => distanciaLocal(p, paraDentro(q)),
    paraFora,
  };
}

/** Distância entre duas peças (negativa quando uma entra na outra). */
export function distanciaEntre(a: PecaMedida, b: PecaMedida, limite = Infinity): number {
  // as caixas envolventes já separadas por mais que o limite: nem precisa olhar ponto a ponto
  let vao = 0;
  for (let k = 0; k < 3; k++) vao = Math.max(vao, a.min[k] - b.max[k], b.min[k] - a.max[k]);
  if (vao > limite) return vao;
  let d = Infinity;
  for (const q of a.pontos) d = Math.min(d, b.distancia(q));
  for (const q of b.pontos) d = Math.min(d, a.distancia(q));
  return d;
}

export interface ProblemaEncaixe {
  tipo: 'solto' | 'escondido' | 'rosto' | 'cabelo';
  peca: string;
  /** solto: a folga; escondido: 0; rosto: peça do rosto tapada; cabelo: quanto sai do chapéu. */
  medida: number;
  outra?: string;
}

/**
 * Confere os enfeites do plano:
 * - solto: cada enfeite encosta (folga ≤ FOLGA_MAXIMA) no apoio ou noutra peça do mesmo enfeite
 *   que já está presa (a copa na aba, a aba no cabelo);
 * - escondido: o enfeite não pode sumir inteiro dentro do apoio (afundado demais);
 * - rosto: nenhum enfeite da cabeça tapa olhos, cílios, boca ou bochechas;
 * - cabelo: nenhum fio de cabelo fica por cima de um enfeite da cabeça (atravessando o chapéu,
 *   o capacete ou o capuz).
 */
export function conferirEncaixe(plano: PlanoBoneco, folgaMaxima = FOLGA_MAXIMA): ProblemaEncaixe[] {
  const problemas: ProblemaEncaixe[] = [];
  const medidas = plano.pecas.map((p) => medirPeca(plano, p));
  const enfeites = medidas.filter((m) => m.peca.apoio);
  for (const tipo of ['cabeca', 'tronco', 'mao'] as const) {
    const meus = enfeites.filter((m) => m.peca.apoio === tipo);
    if (!meus.length) continue;
    const apoio = medidas.filter((m) => !m.peca.apoio && JUNTAS_APOIO[tipo].includes(m.peca.junta));
    // presos: começa pelo que encosta no apoio e vai puxando o que encosta nos presos
    const folga = new Map<PecaMedida, number>();
    for (const e of meus) {
      let d = Infinity;
      for (const s of apoio) d = Math.min(d, distanciaEntre(e, s, Math.min(d, 0.2)));
      folga.set(e, d);
    }
    const presos = new Set(meus.filter((e) => folga.get(e)! <= folgaMaxima));
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (const e of meus) {
        if (presos.has(e)) continue;
        for (const p of presos) {
          const d = distanciaEntre(e, p, 0.2);
          folga.set(e, Math.min(folga.get(e)!, d));
          if (d <= folgaMaxima) {
            presos.add(e);
            mudou = true;
            break;
          }
        }
      }
    }
    for (const e of meus) {
      if (!presos.has(e))
        problemas.push({ tipo: 'solto', peca: e.peca.nome, medida: folga.get(e)! });
      // escondido: todo ponto dele fica dentro do apoio
      const visivel = e.pontos.some((q) => apoio.every((s) => s.distancia(q) > -0.002));
      if (!visivel) problemas.push({ tipo: 'escondido', peca: e.peca.nome, medida: 0 });
    }
    if (tipo !== 'cabeca') continue;
    for (const r of medidas.filter((m) => EH_ROSTO.test(m.peca.nome)))
      for (const e of meus) {
        const dentro = r.pontos.filter((q) => e.distancia(q) < -0.002).length;
        if (dentro > r.pontos.length * 0.1)
          problemas.push({ tipo: 'rosto', peca: e.peca.nome, medida: dentro, outra: r.peca.nome });
      }
    // cabelo atravessando: a peça de cabelo entra num enfeite que cobre a cabeça (passa do
    // alto dela: chapéu, capacete, capuz, coroa) e sai por cima dele (um ponto dela fora dos
    // enfeites, com o enfeite logo abaixo). Cabelo por cima do que não cobre a cabeça (a
    // franja acima dos óculos, o cabelo caindo sobre um lenço ou uma gola) não conta.
    const pele = medidas.find((m) => m.peca.nome === 'cabeca' && m.peca.junta === 'cabeca');
    const topoCabeca = pele ? pele.max[1] : -Infinity;
    for (const c of medidas.filter((m) => !m.peca.apoio && EH_CABELO.test(m.peca.nome))) {
      const cruzados = meus.filter(
        (e) => e.max[1] > topoCabeca && c.pontos.some((q) => e.distancia(q) < -0.002),
      );
      if (!cruzados.length) continue;
      let pior = 0;
      for (const q of c.pontos) {
        if (meus.some((e) => e.distancia(q) < 0)) continue;
        for (const e of cruzados) {
          if (q[1] < e.min[1] || q[1] > e.max[1] + 0.3) continue;
          // desce até 0,3 procurando o enfeite por baixo do fio
          for (let dy = 0.01; dy <= 0.3; dy += 0.01)
            if (e.distancia([q[0], q[1] - dy, q[2]]) < 0) {
              pior = Math.max(pior, dy);
              break;
            }
        }
      }
      if (pior > folgaMaxima) problemas.push({ tipo: 'cabelo', peca: c.peca.nome, medida: pior });
    }
  }
  return problemas;
}

export interface ProblemaMembro {
  tipo: 'membro' | 'quadril';
  /** A junta que se soltou (bracoD, pernaE, cabeca...). */
  junta: Junta;
  /** O vão medido. */
  medida: number;
}

/** Peças de cada membro (as que se mexem com ele) e a peça do tronco onde ele encaixa. */
const MEMBROS: Array<{ junta: Junta; pecas: RegExp }> = [
  { junta: 'bracoE', pecas: /^bracoE-(manga|ombro)$/ },
  { junta: 'bracoD', pecas: /^bracoD-(manga|ombro)$/ },
  { junta: 'pernaE', pecas: /^pernaE-perna$/ },
  { junta: 'pernaD', pecas: /^pernaD-perna$/ },
  { junta: 'cabeca', pecas: /^cabeca$/ },
];
const NO_TRONCO = /^(peito|quadril)$/;

/**
 * Braços, pernas e cabeça presos no tronco numa pose (spec 017, T01, pedido do dono: nada de
 * membro solto, nem no jogador, nem nos amigos, nem nos moradores):
 * - membro: o braço (com o ombro), a perna e a cabeça encostam no tronco (vão ≤ folga);
 * - quadril: a boca de cima da perna fica escondida no quadril (nenhum ponto da tampa de cima
 *   da perna aparece fora do tronco), para não abrir uma fresta quando a perna balança.
 */
export function conferirMembros(
  plano: PlanoBoneco,
  giros: GirosJuntas,
  folgaMaxima = FOLGA_MAXIMA,
): ProblemaMembro[] {
  const problemas: ProblemaMembro[] = [];
  const tronco = plano.pecas
    .filter((p) => p.junta === 'tronco' && NO_TRONCO.test(p.nome))
    .map((p) => medirPeca(plano, p, giros, 8));
  for (const m of MEMBROS) {
    const pecas = plano.pecas
      .filter((p) => m.pecas.test(p.nome))
      .map((p) => medirPeca(plano, p, giros, 8));
    if (!pecas.length) continue;
    let vao = Infinity;
    for (const a of pecas) for (const b of tronco) vao = Math.min(vao, distanciaEntre(a, b, vao));
    if (vao > folgaMaxima) problemas.push({ tipo: 'membro', junta: m.junta, medida: vao });
    if (!m.junta.startsWith('perna')) continue;
    const perna = pecas[0];
    const [w, h, d] = perna.peca.tamanho;
    let pior = 0;
    // a tampa de cima, um pouco para dentro dos cantos redondos (o que dá para ver de fora)
    const r = Math.min(perna.peca.raio ?? 0.05, w / 2, d / 2);
    for (let i = 0; i <= 6; i++)
      for (let k = 0; k <= 6; k++) {
        const q = perna.paraFora([(i / 6 - 0.5) * (w - r), h / 2, (k / 6 - 0.5) * (d - r)]);
        const dist = Math.min(...tronco.map((t) => t.distancia(q)));
        pior = Math.max(pior, dist);
      }
    if (pior > folgaMaxima) problemas.push({ tipo: 'quadril', junta: m.junta, medida: pior });
  }
  return problemas;
}
