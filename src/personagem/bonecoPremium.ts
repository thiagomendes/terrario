/**
 * Spec 023 (T11 e T12): as peças dos premium vestidos no boneco de brinquedo. Só dados, como o
 * resto do plano (boneco.ts e bonecoFantasia.ts): forma, tamanho, cor, a junta, e o que é só
 * dos premium (a luz própria que se anima, as listras que correm, o degradê e as asas num nó
 * próprio). A montagem e a animação ficam em render/boneco.ts, render/premiumLuzes.ts e
 * render/premiumMundo.ts.
 *
 * O premium tem que se ver além de tudo que se ganha no jogo: cada peça leva luz própria, um
 * degradê, ouro de verdade e um detalhe que só ele tem. Nada de modelo pronto: tudo feito aqui.
 *
 * - **Camiseta arco-íris:** as sete listras correm devagar pela camiseta e pelas mangas; a gola,
 *   os punhos e a barra são de pérola acesa; a estrelinha de ouro no peito.
 * - **Tênis-cometa:** sola branca grossa com a faixa de luz que corre o arco-íris, o cano
 *   violeta, a biqueira, a língua rosa, os cadarços e o cometa de ouro com a cauda colorida dos
 *   dois lados.
 * - **Capa de estrelas:** veludo azul-noite que vira violeta embaixo, a barra de ouro, a lua e
 *   as estrelas que piscam em três tempos, a gola e os broches de estrela.
 * - **Dragãozinho** (fantasia, pela 017): o capuz refeito (focinho com narinas, dentinhos,
 *   olhos com sobrancelha de escama, chifres de ouro grandes e curvos, barbatanas), os espinhos
 *   da cabeça às costas e ao rabo, a barriga de escamas, as asas e as patinhas com garras.
 */
import type { Junta, Peca, SubjuntaPremium } from './boneco';
import type { MedidasBoneco } from './bonecoFantasia';
import { perfilCoracao, perfilEstrela, perfilFolha } from './bonecoFantasia';
import type { PremiumVestido } from './aparencia';

type V3 = [number, number, number];
type P2 = [number, number];

// ------------------------------------------------------------------ cores
const OURO = '#ffc93d';
const OURO_FUNDO = '#e8a21e';
const BRANCO = '#fbfbff';
const PEROLA = '#fff4fb';

/** Mistura duas cores "#rrggbb" (t de 0 a 1). */
export function misturarCor(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const k = Math.max(0, Math.min(1, t));
  const c = [16, 8, 0].map((s) => {
    const x = (pa >> s) & 255;
    const y = (pb >> s) & 255;
    return Math.round(x + (y - x) * k);
  });
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ------------------------------------------------------------------ peças
/** Quem junta as peças (o plano do boneco). */
export class Pecas {
  constructor(readonly lista: Peca[]) {}
  por(p: Peca): void {
    this.lista.push(p);
  }
  caixa(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    t: V3,
    pos: V3,
    cor: string,
    raio = 0.04,
    extra: Partial<Peca> = {},
  ): void {
    this.por({ nome, junta, apoio, forma: 'caixa', tamanho: t, raio, pos, cor, ...extra });
  }
  bola(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    r: number,
    pos: V3,
    cor: string,
    esc: V3 = [1, 1, 1],
    extra: Partial<Peca> = {},
  ): void {
    this.por({
      nome,
      junta,
      apoio,
      forma: 'esfera',
      tamanho: [r * esc[0], r * esc[1], r * esc[2]],
      pos,
      cor,
      ...extra,
    });
  }
  cone(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    h: number,
    rb: number,
    rc: number,
    pos: V3,
    cor: string,
    extra: Partial<Peca> = {},
  ): void {
    this.por({ nome, junta, apoio, forma: 'cilindro', tamanho: [h, rb, rc], pos, cor, ...extra });
  }
  placa(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    perfil: P2[],
    espessura: number,
    pos: V3,
    cor: string,
    extra: Partial<Peca> = {},
  ): void {
    let w = 0;
    let h = 0;
    for (const [x, y] of perfil) {
      w = Math.max(w, Math.abs(x) * 2);
      h = Math.max(h, Math.abs(y) * 2);
    }
    this.por({
      nome,
      junta,
      apoio,
      forma: 'placa',
      tamanho: [w, h, espessura],
      perfil,
      pos,
      cor,
      ...extra,
    });
  }
  anel(
    nome: string,
    junta: Junta,
    apoio: Peca['apoio'],
    diametro: number,
    espessura: number,
    pos: V3,
    cor: string,
    extra: Partial<Peca> = {},
  ): void {
    this.por({
      nome,
      junta,
      apoio,
      forma: 'anel',
      tamanho: [diametro, espessura, 0],
      pos,
      cor,
      ...extra,
    });
  }
  /** Tira as peças cujo nome casa (devolve quantas saíram). */
  tirar(re: RegExp): number {
    let n = 0;
    for (let i = this.lista.length - 1; i >= 0; i--)
      if (re.test(this.lista[i].nome)) {
        this.lista.splice(i, 1);
        n++;
      }
    return n;
  }
}

/** Gira um vetor como o Babylon gira a peça (z, depois x, depois y). */
export function girar(v: V3, rot: V3): V3 {
  let [x, y, z] = v;
  const [rx, ry, rz] = rot;
  let c = Math.cos(rz);
  let s = Math.sin(rz);
  [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(rx);
  s = Math.sin(rx);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ry);
  s = Math.sin(ry);
  [x, z] = [x * c + z * s, -x * s + z * c];
  return [x, y, z];
}

/**
 * Um chifre ou espinho curvo em gomos: cada gomo é um cone que continua do fim do outro,
 * dobrando um pouco mais. Devolve a ponta.
 */
function chifreCurvo(
  P: Pecas,
  nome: string,
  junta: Junta,
  apoio: Peca['apoio'],
  base: V3,
  rot0: V3,
  dobra: V3,
  gomos: number,
  comp: number,
  r0: number,
  cor: (i: number) => string,
  extra: Partial<Peca> = {},
): V3 {
  let p: V3 = [...base];
  let rot: V3 = [...rot0];
  for (let i = 0; i < gomos; i++) {
    const h = comp / gomos;
    const ra = r0 * (1 - i / gomos);
    const rb = r0 * (1 - (i + 1) / gomos) + 0.004;
    const meio = girar([0, h / 2, 0], rot);
    const centro: V3 = [p[0] + meio[0], p[1] + meio[1], p[2] + meio[2]];
    P.cone(`${nome}${i}`, junta, apoio, h * 1.08, ra, rb, centro, cor(i), { rot: [...rot], ...extra });
    const fim = girar([0, h, 0], rot);
    p = [p[0] + fim[0], p[1] + fim[1], p[2] + fim[2]];
    rot = [rot[0] + dobra[0], rot[1] + dobra[1], rot[2] + dobra[2]];
  }
  return p;
}

// ------------------------------------------------------------------ camiseta arco-íris
function camisetaArcoIris(P: Pecas, m: MedidasBoneco): void {
  const { larg, troncoH, prof, frente } = m;
  // a roupa de baixo sai (os enfeites do estilo); a camiseta cobre o peito e as mangas
  P.tirar(/^(tunica-barra|cinto|fivela|avental|camiseta|gola|listra\d|colete-?1|colete1|bandoleira|bolso)$/);
  for (const p of P.lista) {
    if (p.nome === 'peito' || /^braco[ED]-(manga|ombro)$/.test(p.nome)) {
      p.textura = 'arco-iris';
      // a cor vem só da textura (sem tinta nos vértices por cima)
      p.viva = false;
      p.brilho = 0.42;
    }
    if (/^braco[ED]-punho$/.test(p.nome)) {
      p.cor = PEROLA;
      p.luz = 'perola';
      p.viva = undefined;
    }
  }
  // a gola, a barra e a estrelinha do peito (pérola e ouro acesos)
  P.anel('camiseta-gola', 'tronco', 'tronco', larg * 0.78, 0.045, [0, troncoH - 0.01, 0.005], PEROLA, {
    luz: 'perola',
  });
  P.caixa(
    'camiseta-barra',
    'tronco',
    'tronco',
    [larg + 0.012, 0.022, prof + 0.012],
    [0, 0.012, 0],
    PEROLA,
    0.03,
    { luz: 'perola' },
  );
  P.placa('camiseta-estrela', 'tronco', 'tronco', perfilEstrela(0.05), 0.016, [-larg * 0.22, troncoH * 0.7, frente + 0.006], OURO, {
    luz: 'ouro',
  });
}

// ------------------------------------------------------------------ tênis-cometa
function tenisCometa(P: Pecas, m: MedidasBoneco): void {
  const { quadril } = m;
  // o tênis entra no lugar do sapato, da bota ou da pata da fantasia
  P.tirar(/^perna[ED]-(sapato|bota)/);
  const violeta = '#6a3df5';
  const rosa = '#ff5fc8';
  for (const lado of ['pernaE', 'pernaD'] as const) {
    const y0 = -quadril;
    const z0 = 0.04;
    // tênis gordinho de brinquedo: a sola branca grossa com a faixa de luz que corre o
    // arco-íris em volta dela, por inteiro
    P.caixa(`${lado}-tenis-sola`, lado, 'perna', [0.25, 0.05, 0.35], [0, y0 + 0.026, z0], BRANCO, 0.024, {
      brilho: 0.45,
    });
    P.caixa(`${lado}-tenis-luz`, lado, 'perna', [0.266, 0.04, 0.366], [0, y0 + 0.068, z0], '#ff4f6d', 0.018, {
      luz: 'arco',
    });
    P.caixa(`${lado}-tenis-sola2`, lado, 'perna', [0.25, 0.026, 0.35], [0, y0 + 0.098, z0], BRANCO, 0.012, {
      brilho: 0.45,
    });
    // o cano em degradê do violeta ao rosa (lê de longe), a biqueira branca redonda
    P.caixa(`${lado}-tenis-cano`, lado, 'perna', [0.23, 0.15, 0.285], [0, y0 + 0.18, z0 - 0.012], violeta, 0.065, {
      viva: true,
      brilho: 0.5,
      pintar: (_x, y, z) => misturarCor(violeta, rosa, (y - (y0 + 0.1)) / 0.16 + (z - z0) * 0.8),
    });
    P.bola(`${lado}-tenis-bico`, lado, 'perna', 0.12, [0, y0 + 0.15, z0 + 0.12], BRANCO, [1, 0.55, 0.75], {
      brilho: 0.45,
    });
    // a língua e a gola de pelúcia branca em cima, e os cadarços
    P.caixa(`${lado}-tenis-lingua`, lado, 'perna', [0.12, 0.09, 0.05], [0, y0 + 0.255, z0 - 0.03], '#ffe14d', 0.022, {
      brilho: 0.4,
      rot: [-0.25, 0, 0],
    });
    P.caixa(`${lado}-tenis-gola`, lado, 'perna', [0.235, 0.035, 0.24], [0, y0 + 0.255, z0 - 0.04], '#ffffff', 0.016, {
      brilho: 0.3,
    });
    for (let i = 0; i < 3; i++)
      P.caixa(
        `${lado}-tenis-cadarco${i}`,
        lado,
        'perna',
        [0.15, 0.02, 0.028],
        [0, y0 + 0.248 - i * 0.014, z0 + 0.015 + i * 0.045],
        '#ffffff',
        0.009,
      );
    // o calcanhar com a estrelinha de pérola acesa
    P.placa(`${lado}-tenis-calcanhar`, lado, 'perna', perfilEstrela(0.04), 0.014, [0, y0 + 0.18, z0 - 0.162], PEROLA, {
      luz: 'perola',
      rot: [0, Math.PI, 0],
    });
    // o cometa dos dois lados: a estrela de ouro acesa e a cauda em três fitas para trás
    for (const s of [-1, 1]) {
      const x = s * 0.119;
      P.placa(`${lado}-tenis-cometa${s}`, lado, 'perna', perfilEstrela(0.058), 0.016, [x, y0 + 0.185, z0 + 0.05], OURO, {
        luz: 'ouro',
        rot: [0, (s * Math.PI) / 2, 0],
      });
      const fitas = ['#ff6fb5', '#ffd93d', '#3cc4ff'];
      fitas.forEach((cor, i) =>
        P.caixa(
          `${lado}-tenis-cauda${s}${i}`,
          lado,
          'perna',
          [0.01, 0.02, 0.12 - i * 0.015],
          [x + s * 0.002, y0 + 0.205 - i * 0.021, z0 - 0.045 + i * 0.008],
          cor,
          0.007,
          { rot: [-0.16 + i * 0.12, 0, 0], brilho: 0.5 },
        ),
      );
    }
  }
}

// ------------------------------------------------------------------ capa de estrelas
/** Pano da capa (como o da 017): estreito em cima, largo embaixo, pontas redondas. */
function perfilPano(cima: number, baixo: number, comprimento: number): P2[] {
  const r = Math.min(0.08, baixo / 6);
  const pts: P2[] = [
    [-cima / 2, 0],
    [cima / 2, 0],
  ];
  const meio = baixo / 2;
  pts.push([meio, -comprimento + r]);
  for (let i = 1; i <= 3; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push([meio - r + Math.cos(a) * r, -comprimento + r - Math.sin(a) * r]);
  }
  // a barra de baixo em três ondinhas (o veludo cai em dobras)
  for (let i = 1; i < 12; i++) {
    const x = meio - r - (i / 12) * (baixo - 2 * r);
    pts.push([x, -comprimento - Math.sin((i / 12) * Math.PI * 3) * 0.018]);
  }
  for (let i = 3; i >= 1; i--) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push([-meio + r - Math.cos(a) * r, -comprimento + r - Math.sin(a) * r]);
  }
  pts.push([-meio, -comprimento + r]);
  return pts.reverse();
}

/**
 * A lua crescente: o arco de fora (do círculo de raio r) e o de dentro (de um círculo
 * deslocado para a direita que passa pelas duas pontas), sem cruzar.
 */
function perfilLua(r: number): P2[] {
  const pts: P2[] = [];
  const graus = Math.PI / 180;
  for (let i = 0; i <= 16; i++) {
    const a = (60 + (i / 16) * 240) * graus;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  const c = 0.5 * r;
  const q = Math.sqrt(0.75) * r;
  for (let i = 15; i >= 1; i--) {
    const a = (90 + (i / 16) * 180) * graus;
    pts.push([c + Math.cos(a) * q, Math.sin(a) * q]);
  }
  return pts;
}

function capaDeEstrelas(P: Pecas, m: MedidasBoneco): void {
  const { quadril, troncoH } = m;
  // a capa da fantasia (se houver) dá lugar à de estrelas
  P.tirar(/^capa-/);
  const comp = Math.min(0.72, quadril + troncoH - 0.08);
  const cima = 0.36;
  const baixo = 0.74;
  const esp = 0.035;
  const zPano = -0.025 - esp / 2;
  const noite = '#1d2a78';
  const violeta = '#5a2aa8';
  // o veludo: azul-noite em cima que vira violeta na barra
  P.placa('capa-veludo', 'capa', 'tronco', perfilPano(cima, baixo, comp), esp, [0, -0.005, zPano], noite, {
    viva: true,
    brilho: 0.55,
    pintar: (_x, y) => misturarCor(noite, violeta, -y / comp),
  });
  // a barra de ouro: o mesmo pano um pouco maior, na frente (aparece em volta)
  P.placa(
    'capa-barra',
    'capa',
    'tronco',
    perfilPano(cima + 0.02, baixo + 0.045, comp + 0.03),
    0.02,
    [0, -0.0, zPano + esp / 2 + 0.002],
    OURO_FUNDO,
    { brilho: 0.8 },
  );
  // as estrelas por fora do veludo (nas costas), em três tempos de piscar, e a lua
  const zFora = zPano - esp / 2 - 0.006;
  const largura = (y: number) => cima + ((baixo - cima) * -y) / comp;
  const estrelas: Array<[number, number, number, 0 | 1 | 2]> = [
    // [fração de x na largura, fração do comprimento, raio, tempo]
    [-0.28, 0.2, 0.05, 0],
    [0.22, 0.3, 0.038, 1],
    [-0.05, 0.42, 0.06, 2],
    [0.33, 0.55, 0.045, 0],
    [-0.34, 0.62, 0.04, 1],
    [0.06, 0.72, 0.035, 0],
    [-0.15, 0.86, 0.05, 2],
    [0.25, 0.86, 0.042, 1],
    [0.38, 0.18, 0.028, 2],
  ];
  estrelas.forEach(([fx, fy, r, tempo], i) => {
    const y = -fy * comp;
    P.placa(`capa-estrela${i}`, 'capa', 'tronco', perfilEstrela(r), 0.012, [fx * largura(y), y, zFora], '#fff3b0', {
      luz: `estrela${tempo}` as const,
      rot: [0, Math.PI, 0.3 * i],
    });
  });
  // pontinhos de poeira de estrela
  const pontos: Array<[number, number]> = [
    [0.1, 0.14],
    [-0.4, 0.4],
    [0.4, 0.4],
    [-0.22, 0.5],
    [0.16, 0.6],
    [-0.02, 0.92],
    [0.42, 0.72],
    [-0.42, 0.8],
  ];
  pontos.forEach(([fx, fy], i) => {
    const y = -fy * comp;
    P.bola(`capa-poeira${i}`, 'capa', 'tronco', 0.012, [fx * largura(y), y, zFora], '#fff3b0', [1, 1, 0.5], {
      luz: `estrela${(i % 3) as 0 | 1 | 2}` as const,
    });
  });
  const yLua = -0.36 * comp;
  P.placa('capa-lua', 'capa', 'tronco', perfilLua(0.075), 0.014, [0.2 * largura(yLua) + 0.1, yLua + 0.1, zFora], '#ffe9a0', {
    luz: 'ouro',
    rot: [0, Math.PI, -0.35],
  });
  // a gola de ouro e os broches de estrela na frente dos ombros
  P.caixa('capa-gola', 'capa', 'tronco', [0.42, 0.07, 0.13], [0, 0.015, -0.035], OURO, 0.033, { brilho: 0.85 });
  for (const s of [-1, 1])
    P.placa(`capa-broche${s}`, 'capa', 'tronco', perfilEstrela(0.052), 0.024, [s * 0.16, 0.03, 0.09], OURO, {
      luz: 'ouro',
    });
}

// ------------------------------------------------------------------ dragãozinho (a fantasia)
/** As cores do dragão (a principal vem do catálogo; o resto combina com ela). */
const DRAGAO = {
  escuro: '#1f8f7a',
  claro: '#5fe0be',
  asa1: '#34d6b4',
  asa2: '#8a6aff',
  asa3: '#ff86d6',
  espinho: '#9a7bff',
  espinhoPonta: '#ff9ad8',
  barriga: '#fff1c4',
  barriga2: '#ffe08a',
  garra: '#fffaf0',
};

/** O capuz refeito: a cabeça de dragão de pelúcia, com o rosto da criança aparecendo embaixo. */
export function capuzDragao(lista: Peca[], m: MedidasBoneco, c: string): void {
  const P = new Pecas(lista);
  const { cab } = m;
  const capH = 0.34;
  const capY = m.topoTampa + 0.04 - capH / 2;
  const capW = cab.w + 0.15;
  const capD = cab.d + 0.12;
  const baixo = capY - capH / 2;
  const cima = capY + capH / 2;
  const frente = capD / 2 - 0.03;
  const claro = DRAGAO.claro;
  // a cúpula do capuz e a nuca descendo atrás (capuz de verdade, não uma caixa em cima)
  P.caixa('dragao-capuz', 'cabeca', 'cabeca', [capW, capH, capD], [0, capY, -0.03], c, 0.14, {
    viva: true,
    brilho: 0.4,
    pintar: (_x, y) => misturarCor(c, claro, (y - baixo) / capH - 0.35),
  });
  // o capuz de verdade: desce pelos lados e pela nuca até o queixo, com o rosto de fora
  const baixoLado = -0.3;
  // os lados sobem até onde a cúpula começa a arredondar em cima, com a face de fora um fio
  // por fora da dela: a quina arredondada de baixo da cúpula some (era a emenda da fase C)
  const topoLado = capY + capH / 2 - 0.14;
  const hLado = topoLado - baixoLado;
  const yLado = baixoLado + hLado / 2;
  // a nuca é uma peça só do alto ao queixo (sem a dobra entre a cúpula e a nuca)
  const hNuca = cima - baixoLado;
  P.caixa('dragao-nuca', 'cabeca', 'cabeca', [capW, hNuca, 0.34], [0, baixoLado + hNuca / 2, -capD / 2 + 0.14], c, 0.14, {
    brilho: 0.4,
  });
  for (const s of [-1, 1])
    P.caixa(`dragao-lado${s}`, 'cabeca', 'cabeca', [0.12, hLado, capD * 0.66], [s * (capW / 2 - 0.057), yLado, -capD / 2 + capD * 0.33 - 0.01], c, 0.035, {
      brilho: 0.4,
    });
  // a borda do capuz em volta do rosto (mais clara, como pelúcia virada)
  for (const s of [-1, 1])
    P.caixa(`dragao-borda${s}`, 'cabeca', 'cabeca', [0.07, hLado - 0.04, 0.07], [s * (capW / 2 - 0.07), yLado + 0.01, capD * 0.16 - 0.015], claro, 0.03, {
      brilho: 0.4,
    });
  // o focinho por cima da testa, mais claro, com as narinas e o sorrisinho
  const fz = frente + 0.07;
  const fy = baixo + 0.075;
  P.caixa('dragao-focinho', 'cabeca', 'cabeca', [0.5, 0.15, 0.22], [0, fy, fz], c, 0.07, {
    viva: true,
    brilho: 0.4,
    pintar: (_x, y, z) => misturarCor(c, claro, 0.25 + (z - fz) * 2.2 + (y - fy) * 1.5),
  });
  P.bola('dragao-focinho-ponta', 'cabeca', 'cabeca', 0.1, [0, fy + 0.005, fz + 0.09], claro, [2.3, 0.72, 0.9], {
    brilho: 0.4,
  });
  for (const s of [-1, 1]) {
    P.bola(`dragao-narina${s}`, 'cabeca', 'cabeca', 0.026, [s * 0.075, fy + 0.06, fz + 0.135], DRAGAO.escuro, [1.3, 0.75, 0.9], {
      brilho: 0.2,
    });
    // os dentinhos de pelúcia (dois caninos e um do meio de cada lado)
    P.cone(`dragao-dente${s}`, 'cabeca', 'cabeca', 0.07, 0.034, 0.004, [s * 0.17, fy - 0.1, fz + 0.04], '#ffffff', {
      rot: [Math.PI, 0, 0],
      brilho: 0.4,
    });
    P.cone(`dragao-dentinho${s}`, 'cabeca', 'cabeca', 0.045, 0.024, 0.004, [s * 0.06, fy - 0.09, fz + 0.06], '#ffffff', {
      rot: [Math.PI, 0, 0],
      brilho: 0.4,
    });
  }
  // os olhos grandes em cima, nos montinhos, com a sobrancelha de escama
  for (const s of [-1, 1]) {
    const ox = s * 0.19;
    const oy = cima - 0.03;
    const oz = capD / 2 - 0.13;
    P.bola(`dragao-montinho${s}`, 'cabeca', 'cabeca', 0.11, [ox, oy - 0.02, oz - 0.02], c, [1, 0.9, 1], { brilho: 0.4 });
    P.bola(`dragao-olho${s}`, 'cabeca', 'cabeca', 0.088, [ox, oy + 0.01, oz + 0.04], '#ffffff', [1, 1.05, 0.75], {
      brilho: 0.5,
    });
    P.bola(`dragao-pupila${s}`, 'cabeca', 'cabeca', 0.048, [ox + s * 0.005, oy + 0.0, oz + 0.095], '#22163a', [0.9, 1.15, 0.5], {
      brilho: 0.7,
    });
    P.bola(`dragao-brilhinho${s}`, 'cabeca', 'cabeca', 0.017, [ox + s * 0.018, oy + 0.025, oz + 0.118], '#ffffff', [1, 1, 0.5], {
      brilho: 0.2,
    });
    for (let k = -1; k <= 1; k++)
      P.bola(
        `dragao-sobrancelha${s}${k}`,
        'cabeca',
        'cabeca',
        0.036 - Math.abs(k) * 0.005,
        [ox + s * k * 0.055, oy + 0.095 - Math.abs(k) * 0.022, oz + 0.035],
        DRAGAO.escuro,
        [1, 0.62, 0.8],
        { brilho: 0.45, rot: [0, 0, -s * k * 0.4] },
      );
  }
  // os chifres de ouro grandes, curvando para trás e para fora, com a pontinha acesa
  for (const s of [-1, 1]) {
    const ponta = chifreCurvo(
      P,
      `dragao-chifre${s}`,
      'cabeca',
      'cabeca',
      [s * 0.25, cima - 0.04, -0.1],
      [-0.55, 0, -s * 0.42],
      [-0.34, 0, -s * 0.07],
      4,
      0.4,
      0.068,
      (i) => (i === 0 ? OURO_FUNDO : OURO),
      { brilho: 0.85 },
    );
    P.bola(`dragao-chifre-ponta${s}`, 'cabeca', 'cabeca', 0.018, ponta, '#fff1a8', [1, 1, 1], { luz: 'ouro' });
    // a barbatana de lado (orelha de dragão), na cor das asas
    P.placa(`dragao-barbatana${s}`, 'cabeca', 'cabeca', perfilFolha(0.2), 0.022, [s * (capW / 2 + 0.005), capY + 0.0, -0.12], DRAGAO.asa2, {
      viva: true,
      brilho: 0.45,
      rot: [0, (s * Math.PI) / 2, -0.95],
      pintar: (_x, y) => misturarCor(DRAGAO.asa2, DRAGAO.asa3, (y - capY + 0.1) / 0.2),
    });
  }
  // os espinhos do alto do capuz, descendo pela nuca até o queixo
  const costas = -capD / 2 - 0.03;
  const espinhos: Array<[number, number, number, number]> = [
    // y, z, giro, altura
    // a crista começa atrás dos olhos (de frente, não espeta no meio dos chifres)
    [cima - 0.01, -0.16, -0.55, 0.12],
    [cima - 0.03, -0.26, -0.75, 0.15],
    [cima - 0.06, costas + 0.03, -0.85, 0.16],
    [capY - 0.04, costas, -1.0, 0.14],
    [capY - 0.2, costas, -1.1, 0.12],
    [baixoLado + 0.1, costas + 0.01, -1.2, 0.1],
  ];
  espinhos.forEach(([y, z, g, h], i) => {
    const meio = girar([0, h / 2, 0], [g, 0, 0]);
    P.cone(`dragao-espinho${i}`, 'cabeca', 'cabeca', h, h * 0.42, 0.004, [0, y + meio[1] * 0.7, z + meio[2] * 0.7], DRAGAO.espinho, {
      viva: true,
      brilho: 0.5,
      rot: [g, 0, 0],
      pintar: (_x, yy, zz) =>
        misturarCor(DRAGAO.espinho, DRAGAO.espinhoPonta, Math.hypot(yy - y, zz - z) / h + 0.2),
    });
  });
}

/** A barriga de escamas, os espinhos das costas e o rabo de dragão com a ponta de espada. */
export function corpoDragao(lista: Peca[], m: MedidasBoneco, c: string, barriga: string): void {
  const P = new Pecas(lista);
  const { troncoH, prof, frente, larg } = m;
  // a placa da barriga (creme) e as escamas em fileiras desencontradas por cima
  P.caixa('dragao-barriga', 'tronco', 'tronco', [larg * 0.66, troncoH * 0.92, 0.03], [0, troncoH * 0.47, frente - 0.004], barriga, 0.07, {
    brilho: 0.4,
  });
  const fileiras: Array<[number, number[]]> = [
    [troncoH * 0.82, [-0.06, 0.06]],
    [troncoH * 0.64, [-0.11, 0, 0.11]],
    [troncoH * 0.46, [-0.06, 0.06]],
    [troncoH * 0.28, [-0.11, 0, 0.11]],
    [troncoH * 0.11, [-0.06, 0.06]],
  ];
  fileiras.forEach(([y, xs], f) =>
    xs.forEach((x, i) =>
      P.bola(
        `dragao-escama${f}-${i}`,
        'tronco',
        'tronco',
        0.06,
        [x * (larg / 0.46), y, frente + 0.012 + (fileiras.length - f) * 0.002],
        (f + i) % 2 ? '#fff6d8' : DRAGAO.barriga2,
        [1.1, 0.7, 0.22],
        { brilho: 0.45 },
      ),
    ),
  );
  // os espinhos das costas, do pescoço à cintura (entre as asas)
  for (let i = 0; i < 4; i++) {
    const y = troncoH - 0.04 - i * 0.11;
    const h = 0.1 - i * 0.008;
    P.cone(`dragao-costas${i}`, 'tronco', 'tronco', h, h * 0.45, 0.004, [0, y, -prof / 2 - h * 0.32], DRAGAO.espinho, {
      viva: true,
      brilho: 0.5,
      rot: [-Math.PI / 2 + 0.35, 0, 0],
    });
  }
  // o rabo: gomos que afinam, com espinho em cada um, e a ponta de espada
  const gomos = 5;
  let ultimo: V3 = [0, 0, 0];
  for (let i = 0; i < gomos; i++) {
    const r = 0.11 - i * 0.014;
    const z = -0.06 - i * 0.095;
    const y = -0.02 - i * 0.03 + (i >= 3 ? (i - 2) * 0.035 : 0);
    P.bola(`dragao-rabo${i}`, 'rabo', 'tronco', r, [0, y, z], c, [1, 0.92, 1.15], {
      viva: true,
      brilho: 0.4,
      pintar: (_x, yy) => misturarCor(c, DRAGAO.barriga, yy < y - r * 0.4 ? 0.7 : 0),
    });
    P.cone(`dragao-rabo-espinho${i}`, 'rabo', 'tronco', 0.075 - i * 0.008, 0.032 - i * 0.003, 0.003, [0, y + r * 0.9, z], DRAGAO.espinho, {
      brilho: 0.5,
      rot: [-0.45, 0, 0],
    });
    ultimo = [0, y + 0.02, z - r];
  }
  // a ponta de espada (coração de cabeça para baixo), de frente para quem vem atrás
  P.placa('dragao-rabo-ponta', 'rabo', 'tronco', perfilCoracao(0.15), 0.03, [ultimo[0], ultimo[1] + 0.04, ultimo[2] - 0.03], DRAGAO.espinho, {
    viva: true,
    brilho: 0.55,
    rot: [-0.5, 0, Math.PI],
    pintar: (_x, y) => misturarCor(DRAGAO.espinhoPonta, DRAGAO.espinho, (y - ultimo[1]) / 0.12 + 0.5),
  });
}

/** A asa (a raiz no 0,0; a ponta para +x): o pulso, as pontas dos dedos e o contorno. */
const PULSO: P2 = [0.3, 0.36];
const PONTAS: P2[] = [
  [0.78, 0.52],
  [0.74, 0.16],
  [0.5, -0.04],
];
const RAIZ_BAIXO: P2 = [0.06, -0.12];

function contornoAsa(): P2[] {
  const pts: P2[] = [[0, 0.06], PULSO, PONTAS[0]];
  const recorte = (a: P2, b: P2) => {
    // entre duas pontas, a membrana faz a curva para dentro (puxada para o pulso)
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const k = Math.sin(t * Math.PI) * 0.28;
      pts.push([x + (PULSO[0] - x) * k, y + (PULSO[1] - y) * k]);
    }
    pts.push(b);
  };
  recorte(PONTAS[0], PONTAS[1]);
  recorte(PONTAS[1], PONTAS[2]);
  recorte(PONTAS[2], RAIZ_BAIXO);
  return pts;
}

/** As asas: membrana em degradê (verde-água, violeta, rosa) e os ossos de ouro. */
export function asasDragao(lista: Peca[], m: MedidasBoneco): void {
  const P = new Pecas(lista);
  const { troncoH, prof } = m;
  const K = 1.25;
  const contorno = contornoAsa().map(([x, y]) => [x * K, y * K] as P2);
  for (const s of [-1, 1]) {
    const nome: SubjuntaPremium = s < 0 ? 'asaE' : 'asaD';
    // a raiz nas omoplatas (não no meio das costas): de frente, os ossos não sobem juntos
    // atrás do capuz, como uma ponta espetando no alto da cabeça
    const sub = { nome, pivo: [s * 0.15, troncoH - 0.2, -prof / 2 - 0.015] as V3 };
    const perfil = contorno.map(([x, y]) => [x * s, y] as P2);
    P.placa(`dragao-asa${s}`, 'tronco', undefined, s < 0 ? [...perfil].reverse() : perfil, 0.018, [0, 0, 0], DRAGAO.asa2, {
      subjunta: sub,
      viva: true,
      brilho: 0.6,
      pintar: (x, y) => {
        const d = Math.hypot(x, y - 0.1 * K) / (0.8 * K);
        return d < 0.5
          ? misturarCor(DRAGAO.asa1, DRAGAO.asa2, d / 0.5)
          : misturarCor(DRAGAO.asa2, DRAGAO.asa3, (d - 0.5) / 0.5);
      },
    });
    // os ossos de ouro: do ombro ao pulso, e do pulso a cada ponta (com as bolinhas das juntas)
    const osso = (a: P2, b: P2, r: number, i: number) => {
      const ax = a[0] * K * s;
      const ay = a[1] * K;
      const bx = b[0] * K * s;
      const by = b[1] * K;
      const dx = bx - ax;
      const dy = by - ay;
      const comp = Math.hypot(dx, dy);
      P.cone(`dragao-asa-osso${s}${i}`, 'tronco', undefined, comp, r, r * 0.75, [ax + dx / 2, ay + dy / 2, 0], OURO, {
        subjunta: sub,
        rot: [0, 0, -Math.atan2(dx, dy)],
        brilho: 0.85,
      });
      P.bola(`dragao-asa-junta${s}${i}`, 'tronco', undefined, r * 1.15, [bx, by, 0], OURO, [1, 1, 1], {
        subjunta: sub,
        brilho: 0.85,
      });
    };
    osso([0, 0.06], PULSO, 0.032, 0);
    PONTAS.forEach((p, i) => osso(PULSO, p, i === 0 ? 0.024 : 0.018, i + 1));
    P.bola(`dragao-asa-ombro${s}`, 'tronco', undefined, 0.045, [0, 0.06 * K, 0], OURO, [1, 1, 1], {
      subjunta: sub,
      brilho: 0.85,
    });
    // a garrinha de ouro no pulso, acesa
    P.cone(`dragao-asa-garra${s}`, 'tronco', undefined, 0.06, 0.02, 0.003, [PULSO[0] * K * s, PULSO[1] * K + 0.045, 0], '#fff1a8', {
      subjunta: sub,
      luz: 'ouro',
      rot: [0, 0, -s * 0.3],
    });
  }
}

/** As patinhas: as mãos na cor do dragão com garrinhas, e os pés de pelúcia com três garras. */
export function patasDragao(lista: Peca[], m: MedidasBoneco, c: string): void {
  const P = new Pecas(lista);
  const { quadril } = m;
  for (const p of lista)
    if (/^braco[ED]-mao$/.test(p.nome)) {
      p.cor = c;
      p.brilho = 0.4;
    }
  for (const mao of ['maoE', 'maoD'] as const)
    for (let i = -1; i <= 1; i++)
      P.bola(`${mao}-garra${i}`, mao, 'mao', 0.024, [i * 0.04, -0.06, 0.06], DRAGAO.garra, [0.9, 1.25, 0.9], {
        brilho: 0.45,
      });
  P.tirar(/^perna[ED]-sapato$/);
  for (const lado of ['pernaE', 'pernaD'] as const) {
    P.caixa(`${lado}-sapato`, lado, 'perna', [0.23, 0.15, 0.3], [0, -quadril + 0.075, 0.035], c, 0.07, { brilho: 0.4 });
    P.caixa(`${lado}-sapato-sola`, lado, 'perna', [0.225, 0.03, 0.29], [0, -quadril + 0.015, 0.035], DRAGAO.barriga2, 0.014, {
      brilho: 0.35,
    });
    for (let i = -1; i <= 1; i++)
      P.cone(`${lado}-sapato-garra${i}`, lado, 'perna', 0.06, 0.026, 0.004, [i * 0.065, -quadril + 0.05, 0.2], DRAGAO.garra, {
        rot: [Math.PI / 2, 0, 0],
        brilho: 0.45,
      });
  }
}

// ------------------------------------------------------------------ o premium no plano
/**
 * Acrescenta os premium de roupa e de costas ao plano (por cima do look e da fantasia). O
 * dragãozinho veste pela fantasia (bonecoFantasia.ts); com ele, a capa fica guardada (uma coisa
 * só nas costas: as asas).
 */
export function vestirPremiumNoPlano(
  premium: PremiumVestido,
  lista: Peca[],
  m: MedidasBoneco,
  _comFantasia: boolean,
): void {
  const P = new Pecas(lista);
  if (premium.roupa === 'camiseta-arco-iris') camisetaArcoIris(P, m);
  if (premium.roupa === 'tenis-cometa') tenisCometa(P, m);
  if (premium.costas === 'capa-estrelas' && !premium.fantasia) {
    capaDeEstrelas(P, m);
    // o cabelo comprido das costas cai por cima da gola (termina acima do pano), como na 017
    for (const p of lista)
      if (p.junta === 'cabeca' && p.nome === 'costas' && p.forma === 'caixa') {
        const topo = p.pos[1] + p.tamanho[1] / 2;
        const baixo = -0.2;
        p.tamanho = [p.tamanho[0], topo - baixo, p.tamanho[2]];
        p.pos = [p.pos[0], (topo + baixo) / 2, p.pos[2] - 0.01];
      }
  }
}
