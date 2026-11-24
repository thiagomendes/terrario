/**
 * Spec 023 (T10): as luzes dos premium, uma vez por cena para todos os bonecos (o da criança e
 * os dos amigos usam os mesmos materiais): a faixa do tênis que vai do ouro ao azul, o ouro que
 * pulsa, a pérola das bordas da camiseta, as estrelas da capa piscando em três tempos e o
 * chifre do unicórnio. E o aquário da camiseta, com os peixinhos e as bolhas.
 *
 * Um só observador por cena anima tudo (o custo não cresce com quantos amigos vestem).
 * Luz é luz: não segue a luz do lugar (à noite e na caverna, o tênis continua aceso).
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { IdLuzPremium } from '../personagem/boneco';

/**
 * As cores dos brilhos dos premium (estrelinhas, pegadas), por peça: nada de arco-íris
 * (decisão do dono), cada premium com as suas duas ou três cores.
 */
export const BRILHOS = {
  /** A festa de vestir e de comprar: ouro, creme e um fio de lilás. */
  festa: ['#ffe27a', '#fff6c8', '#ffc93d', '#d9c8ff'],
  /** O tênis-cometa: ouro e azul. */
  cometa: ['#ffd84a', '#7fd4ff', '#ffe9a0', '#4fa8ff'],
  /** O unicórnio: rosa, lilás e branco perolado. */
  unicornio: ['#ff6fbf', '#b98cff', '#fff4fb', '#ff9ad6'],
  /** O dragãozinho: as cores dele (verde-água, violeta) e ouro. */
  dragao: ['#5fe0be', '#9a7bff', '#ffe27a'],
} as const;

/** Uma cor qualquer da paleta. */
export const umaDe = (paleta: readonly string[]): string =>
  paleta[Math.floor(Math.random() * paleta.length)];

interface LuzesDaCena {
  mats: Partial<Record<IdLuzPremium, StandardMaterial>>;
  aquario: Aquario | null;
  t: number;
}

const porCena = new WeakMap<Scene, LuzesDaCena>();

/** A cor base de cada luz (a animação passeia em volta dela). */
const BASE: Record<IdLuzPremium, string> = {
  cometa: '#ffd84a',
  ouro: '#ffd25a',
  perola: '#fff4fb',
  estrela0: '#fff3b0',
  estrela1: '#fff3b0',
  estrela2: '#fff3b0',
  chifre: '#fff1a8',
  // spec 027: a vela da lanterninha do Conde Dudu (âmbar; a soma das cores fica abaixo de 1,6,
  // o limiar do brilho que borra nos moradores: a luz dela não lava a roupa)
  vela: '#f09410',
  // spec 036: a chaminha da mochila-foguete, morna e mansa (abaixo do brilho que borra)
  chama: '#e8a850',
  // spec 036 (T05): as rodinhas do patinete e os faróis do carrinho, mansos (abaixo de 1 e fora
  // do mapa do brilho, como tudo do boneco)
  menta: '#4cc8b2',
  farol: '#e8dfb4',
};

function daCena(scene: Scene): LuzesDaCena {
  let d = porCena.get(scene);
  if (d) return d;
  const nova: LuzesDaCena = { mats: {}, aquario: null, t: 0 };
  d = nova;
  porCena.set(scene, nova);
  const cor = new Color3();
  const obs = scene.onBeforeRenderObservable.add(() => {
    const dt = Math.min(0.05, scene.getEngine().getDeltaTime() / 1000);
    nova.t += dt;
    const t = nova.t;
    const m = nova.mats;
    if (m.cometa) {
      // a faixa vai do ouro ao azul e volta, passando pelo branco (um lampejo de cometa, sem
      // o verde-acinzentado do meio do caminho), sempre bem acesa
      corDoCometa(t, cor);
      m.cometa.emissiveColor.copyFrom(cor).scaleInPlace(1.25);
    }
    if (m.ouro) {
      const p = 0.82 + 0.18 * Math.sin(t * 2.4);
      m.ouro.emissiveColor.set(1 * p, 0.82 * p, 0.36 * p);
    }
    if (m.perola) {
      // a pérola respira com um fio de rosa e de azul
      const k = Math.sin(t * 1.3);
      m.perola.emissiveColor.set(0.96 + 0.04 * k, 0.9, 0.97 - 0.05 * k);
    }
    for (let i = 0; i < 3; i++) {
      const e = m[`estrela${i}` as IdLuzPremium];
      if (!e) continue;
      // cada grupo pisca no seu tempo: acende forte, fica, apaga devagar até a brasa
      const f = (t * 0.55 + i / 3) % 1;
      const acesa = f < 0.12 ? f / 0.12 : f < 0.3 ? 1 : Math.max(0, 1 - (f - 0.3) / 0.45);
      const v = 0.38 + 0.9 * acesa;
      e.emissiveColor.set(v, v * 0.95, v * 0.66);
    }
    if (m.chifre) {
      // spec 036 (T02): o brilho contido dos itens novos. Antes ia de 1,45 a 1,75, acima do
      // limiar do bloom (1,0): o chifre virava uma chama borrada. Agora fica abaixo dele,
      // respirando devagar: de dia é marfim e de noite continua aceso no escuro
      const p = 0.8 + 0.06 * Math.sin(t * 1.6);
      m.chifre.emissiveColor.set(p, p * 0.88, p * 0.56);
    }
    if (m.chama) {
      // spec 036: a chaminha tremula de leve (duas ondas que não se repetem juntas), sempre
      // abaixo de 1 (nada de halo)
      const k = 0.84 + 0.05 * Math.sin(t * 9) + 0.03 * Math.sin(t * 13);
      m.chama.emissiveColor.set(0.98 * k, 0.72 * k, 0.36 * k);
    }
    if (nova.aquario) nova.aquario.quadro(t);
  });
  scene.onDisposeObservable.addOnce(() => {
    scene.onBeforeRenderObservable.remove(obs);
    porCena.delete(scene);
  });
  return nova;
}

/** O material de luz própria (o mesmo para todos os bonecos da cena). */
export function luzPremium(scene: Scene, id: IdLuzPremium): StandardMaterial {
  const d = daCena(scene);
  let m = d.mats[id];
  if (m) return m;
  m = new StandardMaterial(`premium-luz-${id}`, scene);
  m.disableLighting = true;
  m.diffuseColor = Color3.Black();
  m.specularColor = Color3.Black();
  m.emissiveColor = Color3.FromHexString(BASE[id]);
  d.mats[id] = m;
  return m;
}

/** O ouro e o azul da faixa do tênis-cometa, passando pelo branco (t em segundos). */
function corDoCometa(t: number, out: Color3): void {
  // uma volta a cada 2,4 s: ouro, lampejo branco, azul, lampejo branco
  const f = (t / 2.4) % 1;
  const ouro = [0.86, 0.6, 0.1];
  const azul = [0.22, 0.62, 1];
  const branco = [1, 0.97, 0.88];
  const misturar = (a: number[], b: number[], k: number) =>
    out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
  const suave = (k: number) => k * k * (3 - 2 * k);
  if (f < 0.35) misturar(ouro, ouro, 0);
  else if (f < 0.42) misturar(ouro, branco, suave((f - 0.35) / 0.07));
  else if (f < 0.5) misturar(branco, azul, suave((f - 0.42) / 0.08));
  else if (f < 0.85) misturar(azul, azul, 0);
  else if (f < 0.92) misturar(azul, branco, suave((f - 0.85) / 0.07));
  else misturar(branco, ouro, suave((f - 0.92) / 0.08));
}

// ------------------------------------------------------------------ o aquário da camiseta
/**
 * O aquário da camiseta (spec 023, no lugar das listras de arco-íris, decisão do dono): a
 * água azul-mar com a luz do sol entrando de cima, a areia com as algas na barra, os
 * peixinhos dando a volta no corpo (rabinho abanando) e as bolhas subindo. Uma textura só
 * para todos os bonecos da cena, desenhada num canvas pequeno 24 vezes por segundo (só quando
 * alguém veste: a textura nasce na primeira camiseta).
 *
 * A largura da textura é uma volta inteira em torno do tronco (frente no meio, costura nas
 * costas) e a altura é a do tronco (a gola em cima): o que sai por um lado entra pelo outro.
 */
export const AQUARIO = { largura: 512, altura: 136, quadrosPorSegundo: 24 } as const;

type Rgb = string;
interface Peixe {
  /** Onde começa na volta (0 a 1) e a altura (0 em cima, na gola; 1 na barra). */
  x0: number;
  y: number;
  tam: number;
  /** Blocos de textura por segundo (+ nada para a direita, - para a esquerda). */
  vel: number;
  corpo: Rgb;
  borda: Rgb;
  barbatana: Rgb;
  barriga?: Rgb;
  /** Listras (o palhacinho) ou pintas. */
  listras?: Rgb;
  pintas?: Rgb;
}

/**
 * Os peixinhos (duas ou três cores amigas cada: laranja, amarelo, coral e branco). Na foto da
 * lojinha (t = 0) o palhacinho e o amarelinho estão na frente do peito.
 */
const PEIXES: readonly Peixe[] = [
  {
    x0: 0.45,
    y: 0.43,
    tam: 27,
    vel: 12,
    corpo: '#ff8a1f',
    borda: '#c4500a',
    barbatana: '#ff8a1f',
    listras: '#ffffff',
  },
  {
    x0: 0.6,
    y: 0.66,
    tam: 21,
    vel: -9,
    corpo: '#ffd23a',
    borda: '#d18a00',
    barbatana: '#ff9f1c',
  },
  {
    x0: 0.93,
    y: 0.4,
    tam: 24,
    vel: 14,
    corpo: '#ff7a86',
    borda: '#d0475a',
    barbatana: '#ffd23a',
    barriga: '#fff3ee',
  },
  {
    x0: 0.16,
    y: 0.6,
    tam: 24,
    vel: -11,
    corpo: '#fffaf2',
    borda: '#e07a2a',
    barbatana: '#ff9a3c',
    pintas: '#ff9a3c',
  },
  {
    x0: 0.31,
    y: 0.72,
    tam: 14,
    vel: 17,
    corpo: '#ffc23a',
    borda: '#d17a00',
    barbatana: '#ff8a1f',
  },
  {
    x0: 0.74,
    y: 0.3,
    tam: 16,
    vel: -13,
    corpo: '#ff9e8a',
    borda: '#d05a48',
    barbatana: '#ffffff',
    barriga: '#ffffff',
  },
];

/** Um peixinho virado para +x (o canvas já virado para o lado em que ele nada). */
function desenharPeixe(c: CanvasRenderingContext2D, p: Peixe, fase: number): void {
  const s = p.tam;
  const abana = Math.sin(fase);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.lineWidth = Math.max(1.3, s * 0.1);
  c.strokeStyle = p.borda;
  // o rabo em leque, abanando
  c.save();
  c.translate(-s * 0.78, 0);
  c.rotate(abana * 0.32);
  c.fillStyle = p.barbatana;
  c.beginPath();
  c.moveTo(s * 0.12, 0);
  c.quadraticCurveTo(-s * 0.35, -s * 0.2, -s * 0.62, -s * 0.62);
  c.quadraticCurveTo(-s * 0.42, 0, -s * 0.62, s * 0.62);
  c.quadraticCurveTo(-s * 0.35, s * 0.2, s * 0.12, 0);
  c.fill();
  c.stroke();
  c.restore();
  // a barbatana de cima e a de baixo
  c.fillStyle = p.barbatana;
  c.beginPath();
  c.moveTo(-s * 0.42, -s * 0.48);
  c.quadraticCurveTo(-s * 0.1, -s * 1.02, s * 0.3, -s * 0.52);
  c.closePath();
  c.fill();
  c.stroke();
  c.beginPath();
  c.moveTo(-s * 0.2, s * 0.5);
  c.quadraticCurveTo(-s * 0.05, s * 0.86, s * 0.18, s * 0.52);
  c.closePath();
  c.fill();
  c.stroke();
  // o corpo redondinho
  c.beginPath();
  c.ellipse(0, 0, s, s * 0.66, 0, 0, Math.PI * 2);
  c.fillStyle = p.corpo;
  c.fill();
  c.save();
  c.clip();
  if (p.barriga) {
    c.fillStyle = p.barriga;
    c.beginPath();
    c.ellipse(s * 0.05, s * 0.5, s * 0.95, s * 0.36, 0, 0, Math.PI * 2);
    c.fill();
  }
  if (p.listras) {
    // as faixas brancas do palhacinho, com o contorno escuro fininho
    for (const x of [s * 0.42, -s * 0.22]) {
      c.fillStyle = p.listras;
      c.beginPath();
      c.ellipse(x, 0, s * 0.15, s * 0.8, 0, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = Math.max(1, s * 0.06);
      c.stroke();
    }
  }
  if (p.pintas) {
    c.fillStyle = p.pintas;
    for (const [x, y, r] of [
      [-s * 0.35, -s * 0.18, 0.2],
      [s * 0.05, -s * 0.34, 0.15],
      [-s * 0.05, s * 0.16, 0.17],
      [-s * 0.6, s * 0.12, 0.12],
    ] as const) {
      c.beginPath();
      c.arc(x, y, s * r, 0, Math.PI * 2);
      c.fill();
    }
  }
  // o brilho do plástico em cima
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.ellipse(-s * 0.05, -s * 0.36, s * 0.55, s * 0.14, -0.08, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.lineWidth = Math.max(1.3, s * 0.1);
  c.strokeStyle = p.borda;
  c.beginPath();
  c.ellipse(0, 0, s, s * 0.66, 0, 0, Math.PI * 2);
  c.stroke();
  // o olho grande com brilho, a bochecha e o sorriso
  const ox = s * 0.5;
  const oy = -s * 0.12;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(ox, oy, s * 0.24, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1d1430';
  c.beginPath();
  c.arc(ox + s * 0.04, oy + s * 0.02, s * 0.15, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(ox + s * 0.09, oy - s * 0.05, s * 0.06, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,110,150,0.55)';
  c.beginPath();
  c.ellipse(ox - s * 0.06, oy + s * 0.3, s * 0.12, s * 0.07, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = p.borda;
  c.lineWidth = Math.max(1, s * 0.07);
  c.beginPath();
  c.arc(s * 0.8, s * 0.12, s * 0.12, 0.2, Math.PI * 0.85);
  c.stroke();
}

/** Uma bolha de sabão de água: o anel claro, o miolo quase transparente e o brilhinho. */
function desenharBolha(c: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
  c.fillStyle = `rgba(230,255,255,${0.22 * a})`;
  c.strokeStyle = `rgba(255,255,255,${0.9 * a})`;
  c.lineWidth = Math.max(1, r * 0.32);
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = `rgba(255,255,255,${a})`;
  c.beginPath();
  c.arc(x - r * 0.35, y - r * 0.35, Math.max(0.8, r * 0.28), 0, Math.PI * 2);
  c.fill();
}

interface Aquario {
  tex: DynamicTexture;
  quadro(t: number): void;
}

/** Desenha o aquário no instante t (segundos). Exportada para os testes. */
export function desenharAquario(c: CanvasRenderingContext2D, t: number): void {
  const W = AQUARIO.largura;
  const H = AQUARIO.altura;
  const areia = H * 0.83;
  // o que passa da borda aparece do outro lado (a volta do corpo)
  const emVolta = (x: number, margem: number, f: (x: number) => void) => {
    const xx = ((x % W) + W) % W;
    f(xx);
    if (xx < margem) f(xx + W);
    if (xx > W - margem) f(xx - W);
  };
  // a água: clarinha em cima (o sol), azul-mar embaixo
  const g = c.createLinearGradient(0, 0, 0, areia);
  g.addColorStop(0, '#a6f2f4');
  g.addColorStop(0.3, '#55d6ec');
  g.addColorStop(0.7, '#2cabe2');
  g.addColorStop(1, '#2391d6');
  c.fillStyle = g;
  c.fillRect(0, 0, W, areia + 2);
  // os raios de sol entrando de cima, devagar
  for (let i = 0; i < 6; i++) {
    const x = (i / 6) * W + Math.sin(t * 0.35 + i * 1.7) * 14;
    emVolta(x, 60, (xx) => {
      const r = c.createLinearGradient(0, 0, 0, H * 0.75);
      r.addColorStop(0, 'rgba(255,255,255,0.3)');
      r.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = r;
      c.beginPath();
      c.moveTo(xx - 9, 0);
      c.lineTo(xx + 9, 0);
      c.lineTo(xx + 34, H * 0.75);
      c.lineTo(xx + 12, H * 0.75);
      c.closePath();
      c.fill();
    });
  }
  // a luz brincando na superfície (a linha ondulada lá em cima)
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = 0; x <= W; x += 8) {
    const y = 7 + Math.sin((x / W) * Math.PI * 12 + t * 1.6) * 2;
    if (x === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();
  // as algas (balançando) e os corais, atrás dos peixes
  const algas: Array<[number, number, number]> = [
    [0.05, 34, 0],
    [0.21, 26, 1.3],
    [0.37, 40, 2.1],
    [0.58, 30, 0.7],
    [0.69, 44, 2.8],
    [0.86, 32, 1.9],
  ];
  for (const [fx, alt, fase] of algas)
    emVolta(fx * W, 30, (x) => {
      const ponta = Math.sin(t * 1.3 + fase) * 6;
      for (const [cor, larg] of [
        ['#1f9a5a', 7],
        ['#3fcf7a', 4],
      ] as const) {
        c.strokeStyle = cor;
        c.lineWidth = larg;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, areia + 4);
        c.bezierCurveTo(x - 6, areia - alt * 0.35, x + 7 + ponta * 0.4, areia - alt * 0.65, x + ponta, areia - alt);
        c.stroke();
      }
    });
  for (const fx of [0.13, 0.5, 0.78])
    emVolta(fx * W, 24, (x) => {
      // o coral de três galhos, cor de coral com as pontas claras
      c.strokeStyle = '#ff8a8a';
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x, areia + 3);
      c.lineTo(x, areia - 14);
      c.moveTo(x, areia - 6);
      c.quadraticCurveTo(x - 9, areia - 8, x - 9, areia - 18);
      c.moveTo(x, areia - 8);
      c.quadraticCurveTo(x + 9, areia - 10, x + 8, areia - 21);
      c.stroke();
      c.fillStyle = '#ffd0c8';
      for (const [dx, dy] of [
        [0, -14],
        [-9, -18],
        [8, -21],
      ])
        c.beginPath(), c.arc(x + dx, areia + dy, 2.6, 0, Math.PI * 2), c.fill();
    });
  // a areia da barra com a borda ondulada, as pedrinhas e as conchinhas
  c.fillStyle = '#f6dc94';
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, areia + Math.sin((x / W) * Math.PI * 8) * 2.2);
  c.lineTo(W, H);
  c.closePath();
  c.fill();
  c.fillStyle = '#e2bd6a';
  for (let i = 0; i < 40; i++) {
    const x = (i * 97.3) % W;
    const y = areia + 6 + ((i * 37) % 15);
    c.fillRect(x, y, 2, 2);
  }
  for (const [fx, cor] of [
    [0.1, '#ffffff'],
    [0.29, '#ffb3c1'],
    [0.46, '#ffffff'],
    [0.64, '#ffb3c1'],
    [0.83, '#ffffff'],
  ] as const) {
    c.fillStyle = cor;
    c.beginPath();
    c.ellipse(fx * W, areia + 10, 4.5, 3, 0, Math.PI, 0);
    c.closePath();
    c.fill();
  }
  // as bolhas que sobem do fundo, balançando
  for (let i = 0; i < 18; i++) {
    const vel = 9 + ((i * 7) % 9);
    const sobe = (t * vel + i * 41) % (areia - 6);
    const y = areia - 4 - sobe;
    const x = ((i * 0.618) % 1) * W + Math.sin(t * 2 + i) * 3;
    const r = 2.4 + ((i * 5) % 7) * 0.55;
    const a = Math.min(1, sobe / 12, (y - 2) / 10);
    if (a > 0) emVolta(x, 8, (xx) => desenharBolha(c, xx, y, r, a));
  }
  // os peixinhos dando a volta (e as bolhinhas que cada um solta)
  for (let i = 0; i < PEIXES.length; i++) {
    const p = PEIXES[i];
    const x = p.x0 * W + p.vel * t;
    const y = p.y * H + Math.sin(t * 1.4 + i * 1.9) * 3;
    const dir = Math.sign(p.vel) || 1;
    emVolta(x, p.tam * 1.8, (xx) => {
      c.save();
      c.translate(xx, y);
      c.scale(dir, 1);
      desenharPeixe(c, p, t * (5 + i * 0.6) + i);
      c.restore();
      for (let k = 0; k < 2; k++) {
        const f = (t * 0.45 + i * 0.37 + k * 0.5) % 1;
        if (f > 0.85) continue;
        const a = Math.min(1, f * 6, (0.85 - f) * 6);
        desenharBolha(c, xx + dir * p.tam * (1.05 + f * 0.4), y - p.tam * 0.25 - f * 34, 2 + f * 2, a);
      }
    });
  }
}

/**
 * A textura do aquário da camiseta (a mesma para todos na cena), redesenhada 24 vezes por
 * segundo pelo observador das luzes.
 */
export function texturaAquario(scene: Scene): Texture {
  const d = daCena(scene);
  if (d.aquario) return d.aquario.tex;
  const tex = new DynamicTexture(
    'premium-aquario',
    { width: AQUARIO.largura, height: AQUARIO.altura },
    scene,
    true,
  );
  const c = tex.getContext() as unknown as CanvasRenderingContext2D;
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.CLAMP_ADDRESSMODE;
  tex.anisotropicFilteringLevel = 4;
  let ultimo = -1;
  const aq: Aquario = {
    tex,
    quadro(t) {
      if (ultimo >= 0 && t - ultimo < 1 / AQUARIO.quadrosPorSegundo) return;
      ultimo = t;
      desenharAquario(c, t);
      tex.update();
    },
  };
  aq.quadro(0);
  d.aquario = aq;
  return tex;
}
