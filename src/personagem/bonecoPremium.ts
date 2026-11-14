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

// ------------------------------------------------------------------ o premium no plano
/** Acrescenta os premium de roupa ao plano (por cima do look e da fantasia). */
export function vestirPremiumNoPlano(
  premium: PremiumVestido,
  lista: Peca[],
  m: MedidasBoneco,
  _comFantasia: boolean,
): void {
  const P = new Pecas(lista);
  if (premium.roupa === 'camiseta-arco-iris') camisetaArcoIris(P, m);
  if (premium.roupa === 'tenis-cometa') tenisCometa(P, m);
}
