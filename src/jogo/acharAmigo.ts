/**
 * Spec 021 "Achar o amigo" (T02): a conta da borda da tela, sem DOM nem motor. Recebe onde
 * cada amigo cai na tela (a projeção da câmera), as caixas do HUD que não podem ser tapadas e
 * quem está escolhido ou chamando; devolve o que desenhar: carinhas, montinhos e pontinhos.
 *
 * - Amigo à vista (e não tapado) ou a menos de PERTO blocos: nada.
 * - Fora da tela: a carinha presa na borda, do lado dele, com a seta para fora. Atrás da
 *   câmera, vai para baixo, para o lado dele. Cresce conforme ele chega perto.
 * - Na tela, mas tapado por morro, árvore ou casa: a carinha em cima de onde ele está, sem seta.
 * - Nunca em cima do HUD: desliza pela borda até achar lugar.
 * - Com mais de MAX_CARINHAS amigos: no máximo 3 coisas na borda (as que se encostam viram um
 *   montinho com "+N"); com um escolhido, ele fica grande e os outros viram pontinhos.
 * - Quem chamou vem na frente, sozinho, seja qual for a escolha.
 */

/** Mais perto que isto (blocos), ou à vista, o amigo não tem carinha. */
export const PERTO_AMIGO = 12;
/** No máximo tantas coisas na borda (carinhas ou montinhos) sem amigo escolhido. */
export const MAX_CARINHAS = 3;
/** Segurar a carinha por isto (s) faz pular; o anel só começa a encher depois do TOQUE. */
export const SEGURAR_PULO = 0.9;
/** Menos que isto (s) é um toque (escolhe e desenha a trilha). */
export const TOQUE_CARINHA = 0.25;
/** Quanto o "Chamar" deixa a carinha de quem chamou na frente (s). */
export const DURA_CHAMADO = 6;
/** Quanto a trilha dura (s), se a criança não chegar antes. */
export const DURA_TRILHA = 14;
/** Entre dois pulos do mesmo jogador (s), conferido no núcleo. */
export const ESPERA_PULO = 10;
/** Entre dois "Chamar" do mesmo jogador (s), conferido no núcleo. */
export const ESPERA_CHAMAR = 8;
/** Dano há menos que isto (s): em combate, sem pulo (sobrevivência). */
export const COMBATE_PULO = 5;
/** O pontinho do amigo não escolhido: o desenho e a área de toque (px). */
export const PONTINHO = 16;
export const TOQUE_PONTINHO = 40;
/** Distância (blocos) em que a carinha fica do menor tamanho. */
const LONGE = 140;

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
  nome?: string;
}

/** Onde o amigo cai na tela, do jeito que a câmera vê (px CSS e coordenadas da vista). */
export interface AmigoNaTela {
  id: string;
  /** Distância ao jogador no chão (blocos). */
  d: number;
  /** Posição na tela (px CSS), válida quando `frente`. */
  sx: number;
  sy: number;
  /** Na frente da câmera (z da vista positivo). */
  frente: boolean;
  /** Na vista: x para a direita, y para cima, z para a frente. */
  vx: number;
  vy: number;
  vz: number;
  /** Na tela, mas escondido por morro, árvore ou casa. */
  tapado: boolean;
}

export interface EntradaBorda {
  W: number;
  H: number;
  celular: boolean;
  amigos: readonly AmigoNaTela[];
  proibidos: readonly Caixa[];
  escolhido: string | null;
  chamando: string | null;
  /** Quantos amigos estão na sala (o montinho e os pontinhos só com mais de MAX_CARINHAS). */
  total: number;
}

export interface ItemBorda {
  tipo: 'carinha' | 'montinho' | 'pontinho';
  /** Carinha e pontinho: um; montinho: todos do grupo (do mais perto ao mais longe). */
  ids: string[];
  /** Centro (px CSS). */
  x: number;
  y: number;
  /** Diâmetro da carinha (no montinho, de cada cara; no pontinho, a área de toque). */
  diam: number;
  /** Largura do montinho (px). */
  larg?: number;
  /** Para onde a seta aponta (rad, 0 = direita, sentido da tela). */
  ang: number;
  /** Na borda (com seta) ou em cima do amigo tapado (sem seta). */
  borda: boolean;
  escolhido?: boolean;
  chamando?: boolean;
}

/** Diâmetro da carinha pela distância: 78 → 48 px no computador, 62 → 40 px no celular. */
export function diametroCarinha(d: number, celular: boolean): number {
  const k = Math.max(0, Math.min(1, (d - PERTO_AMIGO) / (LONGE - PERTO_AMIGO)));
  const [perto, longe] = celular ? [62, 40] : [78, 48];
  return Math.round(perto + (longe - perto) * Math.sqrt(k));
}

/** O retângulo onde os centros andam (a tela menos a margem), com a volta parametrizada. */
export function perimetro(W: number, H: number, m: number) {
  const l = m;
  const t = m;
  const r = W - m;
  const b = H - m;
  const w = Math.max(1, r - l);
  const h = Math.max(1, b - t);
  const P = 2 * (w + h);
  return {
    l,
    t,
    r,
    b,
    P,
    ponto(s: number): [number, number] {
      s = ((s % P) + P) % P;
      if (s < w) return [l + s, t];
      if (s < w + h) return [r, t + (s - w)];
      if (s < 2 * w + h) return [r - (s - w - h), b];
      return [l, b - (s - 2 * w - h)];
    },
    param(x: number, y: number): number {
      if (Math.abs(y - t) < 0.5) return x - l;
      if (Math.abs(x - r) < 0.5) return w + (y - t);
      if (Math.abs(y - b) < 0.5) return w + h + (r - x);
      return 2 * w + h + (b - y);
    },
  };
}

/** Um círculo (x, y, raio) encosta em alguma caixa? */
export function bateCirculo(
  proibidos: readonly Caixa[],
  x: number,
  y: number,
  raio: number,
): boolean {
  for (const p of proibidos) {
    const cx = Math.max(p.x, Math.min(x, p.x + p.w));
    const cy = Math.max(p.y, Math.min(y, p.y + p.h));
    if ((x - cx) ** 2 + (y - cy) ** 2 < raio * raio) return true;
  }
  return false;
}

/** Um retângulo (com folga de 6 px) encosta em alguma caixa? */
export function bateRetangulo(
  proibidos: readonly Caixa[],
  x: number,
  y: number,
  w: number,
  h: number,
): boolean {
  for (const p of proibidos)
    if (x < p.x + p.w + 6 && x + w + 6 > p.x && y < p.y + p.h + 6 && y + h + 6 > p.y) return true;
  return false;
}

interface Candidato {
  id: string;
  d: number;
  borda: boolean;
  x: number;
  y: number;
  ang: number;
  diam: number;
  /** Posição na volta da borda (só das da borda). */
  s: number;
  m: number;
}

/** Desliza pela volta (os dois sentidos) até o círculo sair de cima do HUD. */
function deslizar(
  per: ReturnType<typeof perimetro>,
  proibidos: readonly Caixa[],
  s: number,
  raio: number,
): number {
  for (let passo = 0; passo < per.P / 2; passo += 6) {
    const [x1, y1] = per.ponto(s + passo);
    if (!bateCirculo(proibidos, x1, y1, raio)) return s + passo;
    const [x2, y2] = per.ponto(s - passo);
    if (!bateCirculo(proibidos, x2, y2, raio)) return s - passo;
  }
  return s;
}

/**
 * Lugar da carinha do amigo tapado: logo acima dele; se o HUD estiver ali, sobe até sair; sem
 * lugar acima, desce; e por fim vai para o lado (de dentro da tela).
 */
function lugarLivre(
  proibidos: readonly Caixa[],
  W: number,
  H: number,
  sx: number,
  sy: number,
  d: number,
): [number, number] {
  const r = d / 2 + 10;
  const min = d / 2 + 6;
  const livre = (x: number, y: number) =>
    y >= min && y <= H - min && x >= min && x <= W - min && !bateCirculo(proibidos, x, y, r);
  for (let y = sy - d * 0.8; y >= min; y -= 8) if (livre(sx, y)) return [sx, y];
  for (let y = sy + d * 0.8; y <= H - min; y += 8) if (livre(sx, y)) return [sx, y];
  const lado = sx < W / 2 ? 1 : -1;
  for (let k = 8; k < W; k += 8)
    for (const y of [sy - d * 0.8, sy, sy + d * 0.8])
      if (livre(sx + lado * k, y)) return [sx + lado * k, y];
  return [sx, Math.max(min, sy - d * 0.8)];
}

function candidato(e: EntradaBorda, a: AmigoNaTela): Candidato | null {
  const { W, H, celular, proibidos } = e;
  const naTela = a.frente && a.sx > 30 && a.sx < W - 30 && a.sy > 30 && a.sy < H - 30;
  const chamando = e.chamando === a.id;
  if (!chamando && (a.d < PERTO_AMIGO || (naTela && !a.tapado))) return null;
  const diam = Math.round(diametroCarinha(a.d, celular) * (chamando ? 1.15 : 1));
  if (naTela && !chamando) {
    // à vista mas tapado: em cima de onde ele está, sem seta (sobe até sair do HUD)
    const d = Math.round(diam * 0.85);
    const [x, y] = lugarLivre(proibidos, W, H, a.sx, a.sy, d);
    return { id: a.id, d: a.d, borda: false, x, y, ang: Math.PI / 2, diam: d, s: 0, m: 0 };
  }
  const cx = W / 2;
  const cy = H / 2;
  let dx: number;
  let dy: number;
  if (a.frente) {
    dx = a.sx - cx;
    dy = a.sy - cy;
  } else {
    // atrás da câmera: para baixo e para o lado dele ("vira para trás")
    dx = a.vx;
    dy = Math.abs(a.vz) * 0.9 - a.vy * 0.3;
  }
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) dy = 1;
  const dir = Math.atan2(dy, dx);
  const m = diam / 2 + 18;
  const per = perimetro(W, H, m);
  const hw = (per.r - per.l) / 2;
  const hh = (per.b - per.t) / 2;
  const k = Math.min(hw / Math.max(1e-6, Math.abs(dx)), hh / Math.max(1e-6, Math.abs(dy)));
  const bx = Math.max(per.l, Math.min(per.r, cx + dx * k));
  const by = Math.max(per.t, Math.min(per.b, cy + dy * k));
  const s = deslizar(per, proibidos, per.param(bx, by), diam / 2 + 16);
  const [x, y] = per.ponto(s);
  // a seta aponta de verdade para o amigo (na frente, para onde ele cai na tela)
  const ang = a.frente ? Math.atan2(a.sy - y, a.sx - x) : dir;
  return { id: a.id, d: a.d, borda: true, x, y, ang, diam, s, m };
}

/** Pontinho na beirada da tela, do mesmo lado em que a carinha estaria. */
function pontinho(e: EntradaBorda, c: Candidato): ItemBorda {
  const dentro = perimetro(e.W, e.H, c.m);
  const fora = perimetro(e.W, e.H, 14);
  let { x, y } = c;
  if (c.x <= dentro.l + 1) x = fora.l;
  if (c.x >= dentro.r - 1) x = fora.r;
  if (c.y <= dentro.t + 1) y = fora.t;
  if (c.y >= dentro.b - 1) y = fora.b;
  // se a beirada cair no HUD, desliza por ela
  const s = deslizar(fora, e.proibidos, fora.param(x, y), TOQUE_PONTINHO / 2);
  [x, y] = fora.ponto(s);
  return { tipo: 'pontinho', ids: [c.id], x, y, diam: TOQUE_PONTINHO, ang: c.ang, borda: true };
}

/** Largura do montinho: até 3 caras encostadas (58% do diâmetro) e o "+N". */
export function larguraMontinho(n: number, d: number): number {
  const caras = Math.min(3, n);
  return Math.round(d + (caras - 1) * d * 0.58 + (n > 3 ? 30 : 0));
}

function montinho(e: EntradaBorda, g: Candidato[]): ItemBorda {
  const d = e.celular ? 40 : 50;
  const larg = larguraMontinho(g.length, d);
  const c0 = g[0];
  let x = Math.max(14, Math.min(e.W - larg - 14, c0.x - larg / 2));
  let y = Math.max(14, Math.min(e.H - d - 14, c0.y - d / 2));
  // não em cima do HUD: desce pela beirada (e passa para a coluna de dentro se precisar)
  for (let t = 0; t < 120 && bateRetangulo(e.proibidos, x, y, larg, d); t++) {
    y += 8;
    if (y > e.H - d - 14) {
      y = 14;
      x += c0.x < e.W / 2 ? 8 : -8;
    }
  }
  let sx = 0;
  let sy = 0;
  for (const c of g) {
    sx += Math.cos(c.ang);
    sy += Math.sin(c.ang);
  }
  return {
    tipo: 'montinho',
    ids: g.map((c) => c.id),
    x: x + larg / 2,
    y: y + d / 2,
    diam: d,
    larg,
    ang: Math.atan2(sy, sx),
    borda: true,
  };
}

/** Afasta pela borda as carinhas que se encostariam (com poucos amigos não há montinho). */
function separar(e: EntradaBorda, lista: Candidato[]): void {
  const borda = lista.filter((c) => c.borda);
  for (let i = 1; i < borda.length; i++) {
    const c = borda[i];
    for (let volta = 0; volta < 3; volta++) {
      const outro = borda
        .slice(0, i)
        .find((o) => Math.hypot(o.x - c.x, o.y - c.y) < (o.diam + c.diam) / 2 + 6);
      if (!outro) break;
      const per = perimetro(e.W, e.H, c.m);
      const s0 = per.param(outro.x, outro.y);
      const lado = Math.sign(((c.s - s0 + per.P * 1.5) % per.P) - per.P / 2) || 1;
      c.s = deslizar(
        per,
        e.proibidos,
        s0 + lado * ((outro.diam + c.diam) / 2 + 8),
        c.diam / 2 + 16,
      );
      [c.x, c.y] = per.ponto(c.s);
    }
  }
}

/** O que desenhar na borda (ver o topo do arquivo). */
export function disporCarinhas(e: EntradaBorda): ItemBorda[] {
  const cands: Candidato[] = [];
  for (const a of e.amigos) {
    const c = candidato(e, a);
    if (c) cands.push(c);
  }
  cands.sort((p, q) => p.d - q.d || (p.id < q.id ? -1 : 1));
  const muitos = e.total > MAX_CARINHAS;
  const chamando = e.chamando ? cands.find((c) => c.id === e.chamando) : undefined;
  const carinha = (c: Candidato): ItemBorda => ({
    tipo: 'carinha',
    ids: [c.id],
    x: c.x,
    y: c.y,
    diam: c.diam,
    ang: c.ang,
    borda: c.borda,
    ...(c.id === e.escolhido ? { escolhido: true } : {}),
    ...(c === chamando ? { chamando: true } : {}),
  });
  if (!muitos) {
    // poucos amigos (o caso de casa): só as carinhas, afastadas umas das outras
    const lista = chamando ? [chamando, ...cands.filter((c) => c !== chamando)] : cands;
    separar(e, lista);
    return lista.map(carinha);
  }
  const escolhido = e.escolhido ? cands.find((c) => c.id === e.escolhido) : undefined;
  if (e.escolhido) {
    // o escolhido grande, quem chamou também; os outros viram pontinhos na beirada
    const out: ItemBorda[] = [];
    for (const c of cands) {
      if (c === escolhido || c === chamando) out.push(carinha(c));
      else if (c.borda) out.push(pontinho(e, c));
    }
    // os pontinhos não se encostam (cada um com a área de toque inteira)
    const fora = perimetro(e.W, e.H, 14);
    const pts = out
      .filter((i) => i.tipo === 'pontinho')
      .map((p) => ({ p, s: fora.param(p.x, p.y) }))
      .sort((u, v) => u.s - v.s);
    const grandes = out.filter((i) => i.tipo !== 'pontinho');
    const postos: ItemBorda[] = [];
    const bate = (x: number, y: number) =>
      grandes.some((o) => Math.hypot(o.x - x, o.y - y) < o.diam / 2 + TOQUE_PONTINHO / 2 + 4) ||
      postos.some((o) => Math.hypot(o.x - x, o.y - y) < TOQUE_PONTINHO) ||
      bateCirculo(e.proibidos, x, y, TOQUE_PONTINHO / 2);
    for (const { p, s: s0 } of pts) {
      // anda pela beirada (sempre no mesmo sentido) até a área de toque ficar livre
      let s = s0;
      let [x, y] = fora.ponto(s);
      for (let k = 0; k < fora.P / 4 && bate(x, y); k++) {
        s += 4;
        [x, y] = fora.ponto(s);
      }
      p.x = x;
      p.y = y;
      postos.push(p);
    }
    // o escolhido e quem chamou na frente (desenhados por último ficam por cima)
    return out.sort((p, q) => Number(p.tipo !== 'pontinho') - Number(q.tipo !== 'pontinho'));
  }
  // sem escolhido: as que se encostariam viram montinho; no máximo 3 coisas na borda
  const grupos: Candidato[][] = [];
  for (const c of cands) {
    if (c === chamando) continue;
    const g = grupos.find((gr) =>
      gr.some((o) => Math.hypot(o.x - c.x, o.y - c.y) < (o.diam + c.diam) / 2 + 6),
    );
    if (g) g.push(c);
    else grupos.push([c]);
  }
  if (chamando) grupos.unshift([chamando]);
  const out: ItemBorda[] = [];
  for (const g of grupos.slice(0, MAX_CARINHAS))
    out.push(g.length === 1 ? carinha(g[0]) : montinho(e, g));
  return out;
}
