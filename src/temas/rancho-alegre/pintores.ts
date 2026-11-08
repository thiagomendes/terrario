/**
 * Rancho Alegre: pintores dos tiles. Pasto verdinho de brinquedo, terra vermelha do
 * interior, tábuas cor de mel, celeiro vermelho, chita florida, colcha de retalhos, fogão a
 * lenha caiado, feno amarelo amarrado com barbante e a lavoura em sulcos.
 *
 * Os pintores rodam 16x16 por tile: só contas simples por pixel (nada de laço grande).
 */
import { hash2 } from '../../world/noise';
import {
  T,
  VAZIO,
  aneisDe,
  metadesDaPorta,
  bordaDaPorta,
  escurece,
  fbmT,
  folhasDe,
  hex,
  ladoComTopo,
  rampa,
  ruidoT,
  tabuasDe,
  tijolosDe,
  troncoDe,
  trigoDe,
  milhoDe,
  aboboreiraDe,
  fenoLadoDe,
  fenoTopoDe,
} from '../../art/atlas';
import type { Pintor, Px } from '../tipos';

const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Um tom só, com o leve tremor da pixel-art. */
const cor = (c: string, x: number, y: number, s: number): Px => rampa([c], 0, x, y, s);

/** Mistura um pixel com uma cor (0 = pixel, 1 = cor). */
function mistura(p: Px, c: string, t: number): Px {
  const k = hex(c);
  return [p[0] + (k[0] - p[0]) * t, p[1] + (k[1] - p[1]) * t, p[2] + (k[2] - p[2]) * t, p[3]];
}

/** Tira a saturação (para a pedra em volta do quartzo que brilha não brilhar junto). */
function apaga(p: Px, f: number): Px {
  const l = p[0] * 0.3 + p[1] * 0.55 + p[2] * 0.15;
  return [p[0] + (l - p[0]) * f, p[1] + (l - p[1]) * f, p[2] + (l - p[2]) * f, p[3]];
}

const borda = (x: number, y: number, n = 0) => x <= n || y <= n || x >= T - 1 - n || y >= T - 1 - n;

// --- paletas -----------------------------------------------------------------
const GRAMA = ['#4f9c37', '#5baa3f', '#67b648', '#73c151', '#80cc5b'];
const TERRA = ['#7e4a2e', '#8a5434', '#965e3b', '#a26942'];
const PEDRA = ['#8c8780', '#98928b', '#a39d95', '#aea89f', '#bab4aa'];
const MADEIRA = ['#b5844f', '#c08e57', '#ca9960', '#d4a46a'];
const FENO = ['#ddb65c', '#e6c36c', '#eecf7c', '#f5da8c'];
const BARRO = ['#5e3a24', '#68412a', '#724830', '#7c5036'];

// --- chão --------------------------------------------------------------------

/** Pasto: verde vivo de brinquedo com trevinhos e uma florzinha aqui e ali. */
const pastoTopo: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 5);
  if (r > 0.985) return cor(hash2(x, y, s + 6) > 0.5 ? '#fff6d8' : '#ffe05a', x, y, s);
  if (r > 0.94) return cor('#9ad86a', x, y, s);
  return rampa(GRAMA, fbmT(x, y, 4, s) * 0.55 + hash2(x, y, s) * 0.45, x, y, s);
};

/** Terra vermelha do interior, com pedrinhas claras. */
const terraVermelha: Pintor = (x, y, s) => {
  const r = hash2(x, y, s + 3);
  if (r > 0.95) return cor('#c08a62', x, y, s);
  if (r < 0.05) return cor('#5e3420', x, y, s);
  return rampa(TERRA, fbmT(x, y, 4, s) * 0.45 + hash2(x, y, s) * 0.55, x, y, s);
};

/** Lado do pasto: a grama desce em franja sobre a terra vermelha. */
const pastoLado = ladoComTopo(
  (x, y, s) => rampa(GRAMA, 0.3 + hash2(x, y, s) * 0.7, x, y, s),
  terraVermelha,
  '#3f7a2c',
  2,
);

/** Pedra do morro: cinza quentinho com manchas. */
const pedraMorro: Pintor = (x, y, s) => {
  const mancha = fbmT(x, y, 4, s + 8);
  const p = rampa(PEDRA, fbmT(x, y, 4, s) * 0.55 + hash2(x, y, s) * 0.45, x, y, s);
  if (mancha < 0.3) return escurece(p, 0.84);
  if (hash2(x, y, s + 4) > 0.95) return cor('#cfc9be', x, y, s);
  return p;
};

/** Areia clarinha da beira do açude, com conchinhas. */
const areiaAcude: Pintor = (x, y, s) => {
  if (hash2(x, y, s + 2) > 0.96) return cor('#fff8ea', x, y, s);
  if (hash2(x, y, s + 3) > 0.94) return cor('#c9ae80', x, y, s);
  return rampa(
    ['#e3cc9a', '#e9d4a4', '#eedcae', '#f3e4b8'],
    fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5,
    x,
    y,
    s,
  );
};

/**
 * Terra arada: leiras claras e sulcos escuros em faixas largas (de 4 pixels), para as listras
 * aguentarem a limpeza de brinquedo e aparecerem de longe, como no desenho.
 */
const terraArada: Pintor = (x, y, s) => {
  const leira = y % 8;
  if (leira >= 5) return rampa(['#5e3a22', '#663f25'], hash2(x, y, s), x, y, s);
  if (leira === 4) return rampa(['#7a4f2c'], 0, x, y, s);
  if (leira === 0 && hash2(x, y, s + 9) > 0.7) return cor('#c08e60', x, y, s);
  return rampa(
    ['#a06e40', '#a87646', '#b07e4c'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
    x,
    y,
    s,
  );
};

// --- minérios ----------------------------------------------------------------

/** Pedrinhas de minério engastadas na pedra do morro (manchas de 2 a 3 pixels). */
function minerioRancho(cores: string[], brilho?: string, apagar = 0): Pintor {
  return (x, y, s) => {
    const n = fbmT(x, y, 4, s + 77);
    const v = hash2(x, y, s + 13);
    if (n > 0.6 && v > 0.22) {
      if (brilho && v > 0.84) return cor(brilho, x, y, s);
      return rampa(cores, (n - 0.6) * 2.6, x, y, s);
    }
    const p = n > 0.56 ? escurece(pedraMorro(x, y, s), 0.72) : pedraMorro(x, y, s);
    return apagar ? apaga(p, apagar) : p;
  };
}

// --- madeiras ----------------------------------------------------------------

const tabuasIpe = tabuasDe(MADEIRA);

/** Tronco de jabuticabeira: casca lisinha malhada, com jabuticabas grudadas. */
const jabuticabeira: Pintor = (x, y, s) => {
  const cx = x >> 2;
  const cy = y >> 2;
  if (hash2(cx, cy, s + 40) > 0.72) {
    const bx = (cx << 2) + 1 + Math.floor(hash2(cx, cy, s + 41) * 2);
    const by = (cy << 2) + 1 + Math.floor(hash2(cx, cy, s + 42) * 2);
    const dx = x - bx;
    const dy = y - by;
    if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1)
      return dx === 0 && dy === 0 ? cor('#8a5aa8', x, y, s) : cor('#2a1238', x, y, s);
  }
  const m = fbmT(x, y, 4, s + 3);
  return rampa(
    m > 0.55 ? ['#c9a27a', '#d2ac84'] : ['#8a6a4e', '#977659', '#a38263'],
    hash2(x, y, s) * 0.5 + ruidoT(x, y, 4, 2, s) * 0.5,
    x,
    y,
    s,
  );
};

/** Eucalipto: casca descascando em placas creme, cinza e laranjinha. */
const eucalipto: Pintor = (x, y, s) => {
  const placa = fbmT(x, y * 0.5, 4, s + 6);
  const c =
    placa < 0.4
      ? ['#c8bfae', '#d2c9b8']
      : placa < 0.62
        ? ['#e8dfcc', '#efe7d6']
        : ['#d8a27a', '#e0ad86'];
  const p = rampa(c, hash2(x, y, s), x, y, s);
  return x % 5 === 0 && hash2(x, y >> 2, s) > 0.5 ? escurece(p, 0.86) : p;
};

/** Araucária: casca escura em escamas. */
const araucaria: Pintor = (x, y, s) => {
  const lx = mod(x + ((y >> 2) % 2) * 2, 4);
  const p = rampa(['#4a3021', '#553828', '#61412e', '#6c4934'], hash2(x, y, s), x, y, s);
  if (y % 4 === 3 || lx === 0) return escurece(p, 0.7);
  return lx === 1 ? mistura(p, '#8a6448', 0.4) : p;
};

/** Moldura de madeira (mesa, baú). */
function moldura(miolo: Pintor, madeira = ['#8a5a32', '#946238', '#9e6a3e']): Pintor {
  return (x, y, s) => {
    if (borda(x, y, 1)) {
      const p = rampa(madeira, hash2(x, y, s), x, y, s);
      return borda(x, y) ? escurece(p, 0.72) : p;
    }
    return miolo(x, y, s);
  };
}

// --- folhas ------------------------------------------------------------------

/** Folhagem com flores: pintinhas de cor em grupos de 2 pixels. */
function folhasComFlor(cores: string[], flor: string[], chance: number, buracos = 0.13): Pintor {
  const folha = folhasDe(cores, buracos);
  return (x, y, s) => {
    const f = folha(x, y, s);
    if (f[3] === 0) return f;
    if (hash2(x >> 1, y >> 1, s + 31) > 1 - chance && (x + y) % 2 === 0)
      return rampa(flor, hash2(x, y, s), x, y, s);
    return f;
  };
}

// --- plantas em cruz (com recorte) ---------------------------------------------

/** Capim-gordura: folhinhas finas verde-claras, umas com a pontinha arroxeada. */
const capim: Pintor = (x, y, s) => {
  if (hash2(x, 3, s) < 0.38) return VAZIO;
  const altura = 6 + Math.floor(hash2(x, 4, s) * 9);
  const h = T - 1 - y;
  if (h >= altura) return VAZIO;
  if (h >= altura - 2 && hash2(x, 5, s) > 0.6) return cor('#b07a9a', x, y, s);
  const t = h / altura;
  return rampa(['#5aa53e', '#6cb64a', '#80c658', '#98d46a'], 0.2 + t * 0.8, x, y, s);
};

/** Margarida: miolo amarelo, pétalas brancas e o cabinho verde. */
const margarida: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 5.5;
  const d = Math.hypot(dx, dy);
  if (d < 1.6) return cor(d < 0.9 ? '#ffd23a' : '#f0b020', x, y, s);
  if (d < 5.2) {
    const a = Math.atan2(dy, dx);
    if (Math.cos(a * 8) > -0.35) return cor(d > 4.3 ? '#e6e2f0' : '#ffffff', x, y, s);
    return VAZIO;
  }
  if ((x === 7 || x === 8) && y >= 10)
    return rampa(['#3f8a2c', '#4a9a34'], hash2(x, y, s), x, y, s);
  if (y === 12 && (x === 5 || x === 6 || x === 9 || x === 10)) return cor('#5aaa3e', x, y, s);
  return VAZIO;
};

/** Cogumelo que brilha: chapéu amarelo-limão de vaga-lume com pintas, pé creme. */
const cogumeloLuz: Pintor = (x, y, s) => {
  const dx = x - 7.5;
  const dy = y - 7;
  if (y <= 7 && (dx * dx) / 40 + (dy * dy) / 22 < 1) {
    if ((x * 5 + y * 3) % 11 === 0 && y < 6) return cor('#fffbd0', x, y, s);
    return rampa(['#b8d43a', '#cde54c', '#e0f262'], 1 - y / 8 + hash2(x, y, s) * 0.3, x, y, s);
  }
  if (x >= 6 && x <= 9 && y > 7) return rampa(['#efe2c4', '#f6ebd2'], hash2(x, y, s), x, y, s);
  return VAZIO;
};

/** Galho seco retorcendo para os lados. */
const galhoSeco: Pintor = (x, y, s) => {
  const galho =
    (Math.abs(x - 7.5 - (y - 15) * 0.12) < 0.8 && y > 4) ||
    (Math.abs(x - 7.5 + (y - 10) * 0.8) < 0.7 && y > 3 && y < 11) ||
    (Math.abs(x - 7.5 - (y - 12) * 0.9) < 0.7 && y > 5 && y < 13);
  return galho ? rampa(['#9a7a58', '#a88866', '#b89674'], hash2(x, y, s), x, y, s) : VAZIO;
};

/** Taboa: hastes verdes com a espiga marrom de veludo. */
const taboa: Pintor = (x, y, s) => {
  for (const h of [3, 8, 12]) {
    const topo = 1 + Math.floor(hash2(h, 0, s) * 4);
    if (Math.abs(x - h - (y - 15) * 0.05) < 0.9 && y >= topo) {
      if (y >= topo + 1 && y < topo + 5 && h !== 3)
        return rampa(['#6a3e1e', '#7a4824', '#86522a'], hash2(x, y, s), x, y, s);
      return rampa(['#5a9a3a', '#68a842', '#76b44c'], hash2(x, y, s), x, y, s);
    }
  }
  return VAZIO;
};

/** Pé de amora: folhinhas com amoras roxas e vermelhas. */
const amoreira: Pintor = (x, y, s) => {
  const folha = folhasDe(['#3f8a30', '#4a9a38', '#56a842'], 0.35)(x, y, s);
  if (folha[3] === 0) return VAZIO;
  if (y < 4 || x < 1 || x > 14) return VAZIO;
  if (hash2(x >> 1, y >> 1, s + 4) > 0.8 && (x + y) % 2 === 0)
    return rampa(
      hash2(x >> 1, y >> 1, s + 5) > 0.4 ? ['#3a0f3a', '#52184e'] : ['#c2183a', '#e02a4e'],
      hash2(x, y, s),
      x,
      y,
      s,
    );
  return folha;
};

/** Tocha de bambu: gomos verde-amarelados e a chama no alto. */
const tochaBambu: Pintor = (x, y, s) => {
  if (x >= 7 && x <= 8 && y >= 6) {
    if (y === 9 || y === 13) return cor('#7a8a2a', x, y, s);
    return rampa(x === 7 ? ['#c8c050'] : ['#a8a83a'], hash2(x, y, s), x, y, s);
  }
  if (x >= 6 && x <= 9 && y >= 2 && y <= 5) {
    const f = (5 - y) / 3 + hash2(x, y, s) * 0.3;
    return rampa(['#e8641a', '#ffa22e', '#ffd45a', '#fff0a8'], f, x, y, s);
  }
  if (x >= 7 && x <= 8 && y === 1) return cor('#ffb43a', x, y, s);
  return VAZIO;
};

// --- lavoura (as fábricas do atlas, com as cores do desenho aprovado) -------------------

/** Trigo: haste verde de broto e espiga dourada; madura, a haste doura junto. */
const trigo = trigoDe(
  ['#4f9c3a', '#5fae45', '#72bf52'],
  ['#d8a83a', '#f0c850', '#ffd45a'],
  '#fff0b0',
);
/** Milho: pé verde-vivo, espiga amarela e pendão claro. */
const milho = milhoDe(
  ['#3f8f30', '#4fa03a', '#5fae45', '#72c052'],
  ['#f0b020', '#ffc83a', '#ffe070'],
  '#f4e6b0',
);
/** Abóbora: rama verde e a abóbora laranja-viva do desenho. */
const aboboreira = aboboreiraDe(
  ['#3f8a2c', '#4c9a36', '#5aaa40', '#6aba4c'],
  ['#e07a1e', '#f08a26', '#ff9b2f', '#ffad48'],
  '#5a7a2a',
);
/** Fardo de feno amarelinho amarrado com barbante vermelho (como no desenho). */
const fenoLado = fenoLadoDe(['#e2bc62', '#eccb74', '#f4d58a', '#f8e09e'], '#c0563a');
const fenoTopo = fenoTopoDe(['#dcb45c', '#e8c46e', '#f0d080', '#f6dc96'], '#c0563a');

// --- casa e oficina --------------------------------------------------------------

/** Chita: tecido de algodão com florzinhas estampadas em cima da cor de fundo. */
function chita(fundo: string, flor: string, miolo: string): Pintor {
  const c = hex(fundo);
  return (x, y, s) => {
    const cx = mod(x - 2, 8) - 2;
    const cy = mod(y - 2 + ((x >> 3) % 2) * 4, 8) - 2;
    const d = Math.abs(cx) + Math.abs(cy);
    if (d === 0) return cor(miolo, x, y, s);
    if (d === 1) return cor(flor, x, y, s);
    if ((cx === 2 && cy === -1) || (cx === 3 && cy === -2)) return cor('#3f8a3a', x, y, s);
    const fio = ((x + y) % 4 === 0 ? 0.9 : 1) * (0.95 + hash2(x, y, s) * 0.1);
    return [c[0] * fio, c[1] * fio, c[2] * fio, 255];
  };
}

/** Colcha de retalhos da cama de palha. */
const RETALHOS = ['#d9483b', '#ffd45a', '#4a8fd8', '#7cc35a', '#ff8fb3', '#f6f1e8'];
function retalho(x: number, y: number, s: number): Px {
  const i = Math.floor(hash2(x >> 2, y >> 2, s + 61) * RETALHOS.length);
  if (x % 4 === 3 || y % 4 === 3) return cor('#8a5a3a', x, y, s);
  const p = cor(RETALHOS[i], x, y, s);
  return (x + y) % 3 === 0 ? escurece(p, 0.92) : p;
}

/** Fogão a lenha: alvenaria caiada com a barra vermelha de baixo. */
const fogaoLado: Pintor = (x, y, s) => {
  if (y >= 13) return rampa(['#b8372d', '#c63f34'], hash2(x, y, s), x, y, s);
  if (y <= 1) return rampa(['#3a3634', '#46413e'], hash2(x, y, s), x, y, s);
  const fila = y >> 2;
  const desl = fila % 2 ? 4 : 0;
  if (y % 4 === 1 || mod(x + desl, 8) === 0) return cor('#d8d0c2', x, y, s);
  return rampa(['#efe9de', '#f4efe6', '#f8f4ec'], hash2(x, y, s), x, y, s);
};
/** Chapa de ferro do fogão com as bocas redondas. */
const fogaoTopo: Pintor = (x, y, s) => {
  if (borda(x, y)) return cor('#efe9de', x, y, s);
  for (const [cx, cy] of [
    [5, 5],
    [10.5, 10],
  ]) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < 3.2) return cor(Math.floor(d) % 2 ? '#1e1c1c' : '#4a4644', x, y, s);
  }
  return rampa(
    ['#2a2828', '#343232', '#3c3a38'],
    hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4,
    x,
    y,
    s,
  );
};
function bocaFogao(acesa: boolean): Pintor {
  return (x, y, s) => {
    if (x >= 3 && x <= 12 && y >= 6 && y <= 12) {
      if (x === 3 || x === 12 || y === 6 || y === 12) return cor('#2a2828', x, y, s);
      if (!acesa) return rampa(['#141212', '#1c1a1a'], hash2(x, y, s), x, y, s);
      const f = (12 - y) / 5 + hash2(x, y, s) * 0.4;
      return rampa(['#c23a0a', '#e86a12', '#ffa52a', '#ffd25a'], f, x, y, s);
    }
    if (y === 4 && x >= 6 && x <= 9) return cor('#c8a03a', x, y, s);
    return fogaoLado(x, y, s);
  };
}

/** Baú do sítio: tábuas cor de mel com cantoneiras de ferro. */
const bauMadeira: Pintor = (x, y, s) => {
  if (x <= 1 || x >= T - 2) return rampa(['#4a4644', '#5a5654'], hash2(x, y, s), x, y, s);
  if (y === 6) return cor('#4a2e18', x, y, s);
  return rampa(['#b07840', '#bc8448', '#c89052'], ruidoT(x, y, 2, 8, s), x, y, s);
};

/** Porta de tábua com a trava em Z e duas janelinhas. */
/** Porta de fazenda inteira: duas janelinhas em cima e a trava em Z embaixo. */
const TABUAS_PORTA = tabuasDe(['#a8743e', '#b47e46', '#c0884e']);
const portasTabua = metadesDaPorta((x, yy, s) => {
  const janela = yy >= 4 && yy <= 9 && ((x >= 3 && x <= 6) || (x >= 9 && x <= 12));
  if (janela) return VAZIO;
  if (x === 12 && (yy === 18 || yy === 19)) return cor('#f0c040', x, yy, s);
  const p = TABUAS_PORTA(yy & (T - 1), x, s);
  if (bordaDaPorta(x, yy)) return escurece(p, 0.7);
  const trava =
    yy === 12 ||
    yy === 21 ||
    yy === 29 ||
    (yy > 21 && yy < 29 && Math.abs(x - (2 + (29 - yy) * 1.4)) < 1);
  return trava ? cor('#7a4a26', x, yy, s) : p;
});

/** Vidraça de janela de fazenda: caixilho branco em cruz e o vidro limpo. */
const vidraca: Pintor = (x, y, s) => {
  if (borda(x, y) || x === 7 || x === 8 || y === 7 || y === 8)
    return rampa(['#f2ede4', '#faf6ee'], hash2(x, y, s), x, y, s);
  if ((x === y + 2 || x === y + 3) && x > 2 && x < 7) return [236, 248, 255, 255];
  return VAZIO;
};

/** Lampião: lata vermelha em cima e embaixo, vidro com a chama no meio. */
const lampiao: Pintor = (x, y, s) => {
  if (y <= 2 || y >= 13) return rampa(['#a8302a', '#b83a32'], hash2(x, y, s), x, y, s);
  if (x <= 1 || x >= T - 2) return cor('#3a3230', x, y, s);
  const d = Math.hypot((x - 7.5) / 1.3, y - 8.5) / 5;
  return rampa(
    ['#ffb43a', '#ffcd5c', '#ffe08a', '#fff4c0'],
    1 - d + hash2(x, y, s) * 0.15,
    x,
    y,
    s,
  );
};

/** Quartzo: cristal leitoso cor-de-rosa com facetas. */
const quartzo: Pintor = (x, y, s) => {
  const faceta = ((x + 2 * y) % 9) / 9;
  const t = faceta * 0.6 + fbmT(x, y, 2, s) * 0.4;
  if ((x + y) % 7 === 0 && !borda(x, y)) return cor('#fff0f6', x, y, s);
  const p = rampa(['#d77aa6', '#e58fb6', '#efa6c6', '#f7c0d6'], t, x, y, s);
  return borda(x, y) ? escurece(p, 0.78) : p;
};
const blocoQuartzo: Pintor = (x, y, s) => {
  const t = (((x + y) % 6) / 6) * 0.5 + fbmT(x, y, 2, s) * 0.5;
  const p = rampa(['#e090b4', '#eaa2c2', '#f2b6d0', '#fad0e2'], t, x, y, s);
  if (borda(x, y)) return escurece(p, 0.74);
  return borda(x, y, 1) ? mistura(p, '#ffffff', 0.3) : p;
};

/** Muro de pedra: pedras arredondadas com argamassa clara. */
const muroPedra: Pintor = (x, y, s) => {
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = Math.floor(x / 5.34) + i;
      const cy = Math.floor(y / 5.34) + j;
      const px = cx * 5.34 + hash2(mod(cx, 3), mod(cy, 3), s) * 5;
      const py = cy * 5.34 + hash2(mod(cx, 3), mod(cy, 3), s + 1) * 5;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = mod(cx, 3) * 7 + mod(cy, 3);
      } else if (d < d2) d2 = d;
    }
  if (d2 - d1 < 1) return cor('#e4dccb', x, y, s);
  const tom = 0.82 + hash2(id, 3, s) * 0.3;
  return escurece(rampa(PEDRA, hash2(x, y, s) * 0.5 + 0.45 - d1 * 0.06, x, y, s), tom);
};

/** Pedra de muro solta (pedregulho): pedras miúdas com junta escura. */
const pedraMuro: Pintor = (x, y, s) => {
  let d1 = 99;
  let d2 = 99;
  let id = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = Math.floor(x / 4) + i;
      const cy = Math.floor(y / 4) + j;
      const px = cx * 4 + hash2(mod(cx, 4), mod(cy, 4), s) * 4;
      const py = cy * 4 + hash2(mod(cx, 4), mod(cy, 4), s + 1) * 4;
      const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        id = mod(cx, 4) * 7 + mod(cy, 4);
      } else if (d < d2) d2 = d;
    }
  if (d2 - d1 < 0.9) return cor('#5a544e', x, y, s);
  const tom = 0.85 + hash2(id, 3, s) * 0.3;
  return escurece(
    rampa(
      ['#9a8a78', '#a8978a', '#b4a496', '#c0b0a2'],
      hash2(x, y, s) * 0.5 + 0.4 - d1 * 0.08,
      x,
      y,
      s,
    ),
    tom,
  );
};

/** Abóbora laranja-viva com gomos. */
const aboboraLado: Pintor = (x, y, s) => {
  const gomo = x % 4 === 1;
  return rampa(
    gomo ? ['#d0661a', '#da701e'] : ['#ff8f24', '#ff9b2f', '#ffa83e'],
    hash2(x, y, s) * 0.6 + ruidoT(x, y, 4, 1, s) * 0.4,
    x,
    y,
    s,
  );
};

/** Bancada: tampo grosso, gavetinha e as pernas. */
const bancadaLado: Pintor = (x, y, s) => {
  if (y < 3) return rampa(['#8a5a32', '#946238'], hash2(x, y, s), x, y, s);
  if (y >= 5 && y <= 8 && x >= 4 && x <= 11) {
    if (x === 4 || x === 11 || y === 5 || y === 8) return cor('#6a4224', x, y, s);
    if (y === 6 && (x === 7 || x === 8)) return cor('#e0b040', x, y, s);
    return rampa(MADEIRA, hash2(x, y, s), x, y, s);
  }
  if (y > 9 && x > 2 && x < 13) return rampa(['#4a2e18', '#56361e'], hash2(x, y, s), x, y, s);
  return tabuasIpe(x, y, s);
};

// --- pintores do tema ------------------------------------------------------------

export const PINTORES_RANCHO: Record<string, Pintor> = {
  grama_topo: pastoTopo,
  grama_lado: pastoLado,
  terra: terraVermelha,
  pedra: pedraMorro,
  areia: areiaAcude,
  // ipê: casca cinza-amarronzada; a copa verde com flores amarelas
  tronco: troncoDe(['#5e4a3a', '#6a5444', '#765e4c', '#826856']),
  tronco_topo: aneisDe(
    ['#5e4a3a', '#6a5444'],
    [
      ['#c8a06a', '#d0a872'],
      ['#dcb67e', '#e4be88'],
    ],
  ),
  folhas: folhasComFlor(
    ['#3d8a2e', '#4a9a36', '#56aa40', '#64b84a', '#72c454'],
    ['#ffd23a', '#ffe060'],
    0.12,
  ),
  cristal: quartzo,
  tabuas: tabuasIpe,
  grama_alta: capim,
  flor: margarida,
  cogumelo: cogumeloLuz,
  pedregulho: pedraMuro,
  cascalho: (x, y, s) => {
    const v = hash2(x >> 1, y >> 1, s);
    const p = rampa(
      ['#a07a5a', '#ae8868', '#bc9676', '#c8a484'],
      v * 0.7 + hash2(x, y, s) * 0.3,
      x,
      y,
      s,
    );
    return hash2(x, y, s + 5) > 0.9 ? escurece(p, 0.68) : p;
  },
  rocha_matriz: (x, y, s) =>
    rampa(
      ['#262224', '#34302e', '#423c3a', '#5a5350'],
      fbmT(x, y, 8, s) * 0.6 + hash2(x, y, s) * 0.4,
      x,
      y,
      s,
    ),
  min_carvao: minerioRancho(['#18161a', '#232026', '#302c32']),
  min_cobre: minerioRancho(['#b45a26', '#d0743a', '#e8945a'], '#5ac8a0'),
  min_ferro: minerioRancho(['#c49a84', '#d8b29c', '#ecccb6']),
  min_ouro: minerioRancho(['#e0a810', '#f8c830', '#ffe46a'], '#fffad0'),
  min_luzita: minerioRancho(['#e070a8', '#f090c0', '#ffb6d8'], '#fff0f8', 0.85),
  neve: (x, y, s) => {
    if (hash2(x, y, s + 9) > 0.95) return cor('#d6ecff', x, y, s);
    return rampa(
      ['#eef3f6', '#f3f7f9', '#f8fbfc', '#ffffff'],
      fbmT(x, y, 4, s) * 0.4 + hash2(x, y, s) * 0.6,
      x,
      y,
      s,
    );
  },
  neve_lado: ladoComTopo(
    (x, y, s) => rampa(['#eef3f6', '#ffffff'], hash2(x, y, s), x, y, s),
    terraVermelha,
    '#bccbd6',
    3,
  ),
  gelo: (x, y, s) => {
    const risco = Math.abs(((x * 2 + y) % 11) - 5) < 0.6 && hash2(x, y, s) > 0.4;
    if (risco) return cor('#f2fbff', x, y, s);
    return rampa(
      ['#9cccec', '#a8d6f2', '#b4ddf5', '#c2e6f8'],
      fbmT(x, y, 2, s) * 0.7 + hash2(x, y, s) * 0.3,
      x,
      y,
      s,
    );
  },
  arenito_lado: (x, y, s) => {
    const faixa = Math.floor(y / 4) % 3;
    const c = [
      ['#d4884e', '#dc9258'],
      ['#e6b07a', '#ecba86'],
      ['#c06a3e', '#c8744a'],
    ][faixa];
    const p = rampa(c, hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s);
    return y % 4 === 3 ? escurece(p, 0.88) : p;
  },
  arenito_topo: (x, y, s) =>
    rampa(
      ['#d48a52', '#dc965e', '#e4a26a'],
      fbmT(x, y, 4, s) * 0.5 + hash2(x, y, s) * 0.5,
      x,
      y,
      s,
    ),
  areia_deserto: (x, y, s) => {
    if (hash2(x, y, s + 6) > 0.97) return cor('#9aa83a', x, y, s);
    const onda = Math.sin((y + fbmT(x, y, 2, s) * 4) * 0.9) * 0.5 + 0.5;
    return rampa(
      ['#d0985a', '#d8a466', '#e0b072', '#e8bc80'],
      onda * 0.5 + hash2(x, y, s) * 0.5,
      x,
      y,
      s,
    );
  },
  // mandacaru: verde-azulado com gomos e espinhos claros
  cacto_lado: (x, y, s) => {
    if (x === 0 || x === T - 1) return VAZIO;
    const gomo = x % 5 === 2;
    if (gomo && y % 3 === 0) return cor('#f4eed0', x, y, s);
    return rampa(
      gomo ? ['#2f6a52', '#367458'] : ['#4a8a6a', '#529474', '#5c9e7c'],
      hash2(x, y, s),
      x,
      y,
      s,
    );
  },
  cacto_topo: (x, y, s) => {
    const d = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
    if (d > 6.6) return VAZIO;
    if (d < 1.5) return cor('#ff6a8a', x, y, s);
    return rampa(['#4a8a6a', '#529474'], hash2(x, y, s), x, y, s);
  },
  arbusto_seco: galhoSeco,
  // eucalipto
  betula: eucalipto,
  betula_topo: aneisDe(
    ['#c8bfae', '#d8a27a'],
    [
      ['#e2c49a', '#e8cca2'],
      ['#d4b088', '#dab890'],
    ],
  ),
  folhas_betula: folhasDe(['#4f8a72', '#5a967c', '#66a286', '#74ae92', '#82ba9e'], 0.15),
  // araucária
  pinho: araucaria,
  pinho_topo: aneisDe(
    ['#4a3021', '#553828'],
    [
      ['#b07a52', '#b8825a'],
      ['#c28c62', '#c8946a'],
    ],
  ),
  folhas_pinho: folhasDe(['#1e4a2a', '#245632', '#2c623a', '#346e42', '#3e7a4a'], 0.1),
  // brejo
  pantano_topo: (x, y, s) => {
    if (hash2(x, y, s + 8) > 0.96) return cor('#8ac8e8', x, y, s);
    return rampa(
      ['#4a7a3a', '#548642', '#5e924a', '#6a9e52'],
      fbmT(x, y, 4, s) * 0.6 + hash2(x, y, s) * 0.4,
      x,
      y,
      s,
    );
  },
  pantano_lado: ladoComTopo(
    (x, y, s) => rampa(['#4a7a3a', '#548642', '#5e924a'], hash2(x, y, s), x, y, s),
    (x, y, s) => rampa(BARRO, hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s),
    '#2e4a24',
  ),
  lama: (x, y, s) => {
    const p = rampa(BARRO, hash2(x, y, s) * 0.6 + fbmT(x, y, 4, s) * 0.4, x, y, s);
    if (hash2(x, y, s + 1) > 0.95) return mistura(p, '#a8c8d8', 0.4);
    return hash2(x, y, s + 2) > 0.93 ? escurece(p, 0.72) : p;
  },
  junco: taboa,
  // jabuticabeira
  tronco_lanterna: jabuticabeira,
  tronco_lanterna_topo: aneisDe(
    ['#8a6a4e', '#977659'],
    [
      ['#d8b48a', '#dcba92'],
      ['#e6c6a0', '#eaceaa'],
    ],
  ),
  folhas_lanterna: folhasComFlor(
    ['#2a6a2e', '#327636', '#3a823e', '#448e48', '#4e9a52'],
    ['#ffffff', '#f4f0e0'],
    0.16,
    0.16,
  ),
  vidro: vidraca,
  tocha: tochaBambu,
  lanterna: lampiao,
  bloco_luzita: blocoQuartzo,
  mesa_topo: moldura((x, y, s) => {
    // serrote e esquadro em cima da bancada
    if (y === 5 && x >= 3 && x <= 10) return cor('#c8ccd2', x, y, s);
    if (y === 6 && x >= 3 && x <= 10 && x % 2 === 0) return cor('#8a9098', x, y, s);
    if (y >= 4 && y <= 6 && x >= 11 && x <= 12) return cor('#d9483b', x, y, s);
    if (x === 4 && y >= 9 && y <= 12) return cor('#e0b040', x, y, s);
    if (y === 12 && x >= 4 && x <= 8) return cor('#e0b040', x, y, s);
    return tabuasIpe(x, y, s);
  }),
  mesa_lado: bancadaLado,
  mesa_frente: (x, y, s) => {
    if (y < 3) return rampa(['#8a5a32', '#946238'], hash2(x, y, s), x, y, s);
    // enxada e martelo pendurados
    if (x === 4 && y >= 5 && y <= 13) return cor('#9a6a3e', x, y, s);
    if (y >= 5 && y <= 6 && x >= 2 && x <= 6) return cor('#8a9098', x, y, s);
    if (x === 11 && y >= 7 && y <= 13) return cor('#9a6a3e', x, y, s);
    if (y >= 5 && y <= 7 && x >= 9 && x <= 13) return cor('#5a5e66', x, y, s);
    return tabuasIpe(x, y, s);
  },
  fornalha_lado: fogaoLado,
  fornalha_topo: fogaoTopo,
  fornalha_frente: bocaFogao(false),
  fornalha_acesa: bocaFogao(true),
  bau_lado: moldura(bauMadeira, ['#4a4644', '#5a5654', '#64605c']),
  bau_topo: moldura(
    (x, y, s) => rampa(['#b07840', '#bc8448', '#c89052'], ruidoT(x, y, 8, 2, s), x, y, s),
    ['#4a4644', '#5a5654', '#64605c'],
  ),
  bau_frente: (x, y, s) => {
    if (x >= 6 && x <= 9 && y >= 5 && y <= 9) {
      if (x === 6 || x === 9 || y === 5 || y === 9) return cor('#b08a20', x, y, s);
      return cor('#f0c840', x, y, s);
    }
    return moldura(bauMadeira, ['#4a4644', '#5a5654', '#64605c'])(x, y, s);
  },
  tijolos: tijolosDe(['#c8643a', '#d26e42', '#dc7a4a', '#e48654'], '#efe2cc'),
  tijolos_pedra: muroPedra,
  pedra_lisa: (x, y, s) => {
    if (borda(x, y)) return cor('#9a948c', x, y, s);
    if (borda(x, y, 1)) return cor('#d6d0c6', x, y, s);
    return rampa(
      ['#bcb6ac', '#c4beb4', '#ccc6bc'],
      hash2(x, y, s) * 0.5 + fbmT(x, y, 2, s) * 0.5,
      x,
      y,
      s,
    );
  },
  la_branca: chita('#f6f1e8', '#d9483b', '#ffd45a'),
  la_vermelha: chita('#d9483b', '#ffffff', '#ffd45a'),
  la_laranja: chita('#f08a2a', '#fff6d0', '#d9483b'),
  la_amarela: chita('#f6cc3a', '#4a8fd8', '#ffffff'),
  la_verde: chita('#4caa3a', '#ffd45a', '#d9483b'),
  la_azul: chita('#3a6fd0', '#ffffff', '#ffd45a'),
  la_roxa: chita('#8a4ab8', '#ffb3d0', '#ffffff'),
  la_preta: chita('#2a2630', '#ff6a8a', '#ffd45a'),
  frutinhas: amoreira,
  // ipê amarelo e ipê-rosa no outono
  folhas_outono: folhasComFlor(
    ['#e8a018', '#f0b020', '#f8c030', '#ffd040', '#ffdc5a'],
    ['#ff8fb3', '#ffa6c4'],
    0.08,
    0.15,
  ),
  cama_topo: (x, y, s) => {
    if (y < 5) return rampa(['#f6f1e8', '#fffaf2'], hash2(x, y, s), x, y, s);
    if (y === 5) return cor('#d8cfc0', x, y, s);
    return retalho(x, y, s);
  },
  cama_lado: (x, y, s) => {
    if (y < 6) return retalho(x, y, s);
    if (y < 9) return rampa(['#f6f1e8', '#fffaf2'], hash2(x, y, s), x, y, s);
    return tabuasIpe(x, y, s);
  },
  ...portasTabua,
  // eucalipto (clarinho rosado) e araucária (avermelhada)
  tabuas_betula: tabuasDe(['#dcbc96', '#e2c49e', '#e8cca8', '#eed4b0']),
  tabuas_pinho: tabuasDe(['#94523a', '#a05c42', '#aa664a', '#b47052']),
  abobora_lado: aboboraLado,
  abobora_topo: (x, y, s) => {
    if (Math.abs(x - 7.5) < 1.5 && Math.abs(y - 7.5) < 1.5)
      return rampa(['#4a7a2a', '#5a8a32'], hash2(x, y, s), x, y, s);
    return rampa(
      ['#ff8f24', '#ff9b2f', '#ffa83e'],
      hash2(x, y, s) * 0.5 + (Math.hypot(x - 7.5, y - 7.5) / 12) * 0.5,
      x,
      y,
      s,
    );
  },
  abobora_rosto: (x, y, s) => {
    // carinha sorridente (de festa junina, não de susto)
    const olho = y >= 4 && y <= 6 && ((x >= 4 && x <= 5) || (x >= 10 && x <= 11));
    const boca =
      (y === 10 && x >= 4 && x <= 11) ||
      (y === 11 && x >= 5 && x <= 10) ||
      (y === 9 && (x === 3 || x === 12));
    if (olho || boca) return rampa(['#ffd060', '#ffe08a'], hash2(x, y, s), x, y, s);
    return aboboraLado(x, y, s);
  },
  terra_arada: terraArada,
  trigo,
  milho,
  aboboreira,
  feno_lado: fenoLado,
  feno_topo: fenoTopo,
};
