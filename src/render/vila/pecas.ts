/**
 * O desenho de cada peça da Vila Neon que não é bloco (spec 026): aqui as da rua, da pracinha e
 * dos quintais; as do festival, do fliperama e do rinque em `pecasFestival.ts`. Cada peça monta
 * pedaços no corpo (plástico, a cor nos vértices), nas luzes (acesas: neon, lâmpadas, telas) ou
 * num quadro pintado (letreiro com nome, mural). O chunk inteiro vira uma malha de corpo e uma
 * de luzes (`index.ts`).
 *
 * Regras (identidade visual do jogo): peças quadradas de brinquedo, com bisel firme, como os
 * carrinhos da cidade e o ninho da 031; liso redondo só onde o jogo já usa (rodas). Nada de
 * arco-íris em ordem, nada de marca nem logotipo de verdade, nada que assuste.
 *
 * Coordenadas locais de cada peça: x para a direita de quem olha a frente, y para cima (0 é
 * onde a peça pisa), z para a frente (a frente olha para `dir`).
 */
import { LETREIROS, LETREIRO, type PecaVila } from '../../world/vilaNeon';
import type { Item, V3 } from '../solidos';
import { COR, LAMPADAS, Ref, perfilRaio, type Desenho } from './ref';
import {
  controleNeon,
  copoNeon,
  estrelaNeon,
  fitaNeon,
  fundoPlaca,
  larguraTexto,
  patimNeon,
  pintarCartaz,
  pintarMural,
  pintarRevistas,
  raioNeon,
  textoNeon,
  type G,
} from './neon';
import { desenharPecaFestival } from './pecasFestival';
import { desenharPecaParque } from './pecasParque';
import { desenharPecaRampa } from './pecasCasa';
import { carroVila, picapeVila, vanVila } from './carros';

export { COR, Ref, perfilRaio };
export type { Desenho, QuadroDesenhado } from './ref';

// cores de apoio (além da paleta da spec, em `COR`)
const MADEIRA2 = '#8a5a30';
const MADEIRA3 = '#c58a4c';
const VIDRO = '#a8dcf2';
const VIDRO_ESC = '#6fb4d8';
const PNEU = '#2a2b33';
const CALOTA = '#e6e9f0';
const MORNA = '#ffe9a8';

/** Desenha a peça. */
export function desenharPeca(p: PecaVila, d: Desenho): void {
  const r = new Ref(d, p);
  const n = p.n ?? 0;
  switch (p.tipo) {
    case 'letreiro':
      return letreiro(r, n);
    case 'mural':
      return mural(r);
    case 'gangorra':
      return gangorra(r);
    case 'balanco':
      return balanco(r);
    case 'escorregador':
      return escorregador(r);
    case 'banco':
      return banco(r);
    case 'lixeira':
      return lixeira(r);
    case 'orelhao':
      return orelhao(r);
    case 'ponto-onibus':
      return pontoOnibus(r);
    case 'bicicleta':
      return bicicleta(r, n);
    case 'carro':
      return carroVila(r, n);
    case 'van':
      return vanVila(r, n);
    case 'picape':
      return picapeVila(r, n);
    case 'posteres':
      return posteres(r, n);
    case 'hidrante':
      return hidrante(r);
    case 'caixa-correio':
      return caixaCorreio(r, n);
    case 'varal-lampadas':
      return varalLampadas(r, n);
    case 'bandeirolas':
      return bandeirolas(r, n);
    case 'pipa':
      return pipa(r);
    case 'varal-roupa':
      return varalRoupa(r, n);
    case 'casinha-cachorro':
      return casinhaCachorro(r, n);
    case 'piscininha':
      return piscininha(r);
    case 'vitrine':
      return vitrine(r);
    case 'balcao':
      return balcao(r, n);
    case 'pipoca':
      return carrinhoPipoca(r);
    case 'mesinha':
      return mesinha(r, n);
    case 'floreira':
      return floreira(r, n);
    case 'toalha':
      return toalha(r, n);
    default:
      // (a Casa anos 80 por dentro vai na malha dela, com a luz de dentro: `casa.ts`)
      if (p.tipo.startsWith('casa-')) return;
      if (desenharPecaRampa(r, p.tipo, n)) return;
      if (desenharPecaParque(r, p.tipo, n)) return;
      return desenharPecaFestival(r, p.tipo, n);
  }
}

// ------------------------------------------------------------------ letreiros

/** A caixa de um letreiro: a chapa grafite, a moldura de cromo e o quadro aceso. */
function caixaLetreiro(
  r: Ref,
  w: number,
  h: number,
  y: number,
  z: number,
  esp: number,
  pintar: (g: G, L: number, A: number) => void,
  doisLados = false,
): void {
  r.caixa(w + 0.16, h + 0.16, esp, 0, y, z, COR.grafite, 0.04);
  // a moldura de cromo (quatro réguas) na frente
  const f = esp / 2 + 0.02;
  for (const s of doisLados ? [1, -1] : [1]) {
    r.caixa(w + 0.24, 0.1, 0.06, 0, y - 0.03, z + s * f, COR.cromo, 0.02);
    r.caixa(w + 0.24, 0.1, 0.06, 0, y + h + 0.09, z + s * f, COR.cromo, 0.02);
    r.caixa(0.1, h + 0.2, 0.06, -w / 2 - 0.07, y - 0.02, z + s * f, COR.cromo, 0.02);
    r.caixa(0.1, h + 0.2, 0.06, w / 2 + 0.07, y - 0.02, z + s * f, COR.cromo, 0.02);
  }
  r.quadro(w, h, 0, y + 0.08 + h / 2, z + esp / 2 + 0.012, pintar, true, 512);
  if (doisLados) r.quadro(w, h, 0, y + 0.08 + h / 2, z - esp / 2 - 0.012, pintar, true, 512, true);
}

/** Fileira de lâmpadas de cubinho (acesas) de (x0) a (x1). */
function fileiraLampadas(r: Ref, x0: number, x1: number, y: number, z: number, passo = 0.5): void {
  const n = Math.max(1, Math.round((x1 - x0) / passo));
  for (let i = 0; i <= n; i++)
    r.luz(0.13, 0.13, 0.13, x0 + ((x1 - x0) * i) / n, y, z, LAMPADAS[i % 2 ? 1 : 0]);
}

function letreiro(r: Ref, n: number): void {
  const texto = LETREIROS[n] ?? '';
  switch (n) {
    case LETREIRO.vila: {
      // o portal da pracinha: a placa pendurada na travessa de treliça, lida dos dois lados
      const w = 5.7;
      const h = 1.4;
      for (const x of [-2.2, 2.2]) r.caixa(0.1, 0.5, 0.1, x, h + 0.2, 0, COR.cromo, 0);
      caixaLetreiro(
        r,
        w,
        h,
        0,
        0,
        0.5,
        (g, L, A) => {
          fundoPlaca(g, L, A, '#1a1430', '#2ee0d0');
          textoNeon(g, texto, L / 2, A * 0.52, A * 0.46, ['#2ee0d0', '#ff6fb4']);
          estrelaNeon(g, L * 0.075, A * 0.5, A * 0.16, '#ffe14a', A * 0.035);
          estrelaNeon(g, L * 0.925, A * 0.5, A * 0.16, '#ffe14a', A * 0.035);
        },
        true,
      );
      for (const z of [0.33, -0.33]) {
        fileiraLampadas(r, -w / 2, w / 2, h + 0.2, z, 0.48);
        fileiraLampadas(r, -w / 2, w / 2, -0.2, z, 0.48);
      }
      return;
    }
    case LETREIRO.locadora: {
      // na fachada, por cima do toldo (a parede fica em z = -0,5)
      const w = 6.2;
      const h = 1.7;
      r.caixa(0.3, 0.2, 0.3, -2.4, 0.9, -0.42, COR.grafite2, 0);
      r.caixa(0.3, 0.2, 0.3, 2.4, 0.9, -0.42, COR.grafite2, 0);
      caixaLetreiro(r, w, h, 0.06, -0.3, 0.3, (g, L, A) => {
        fundoPlaca(g, L, A, '#141a3c', '#ffe14a');
        textoNeon(g, 'LOCADORA', L * 0.44, A * 0.27, A * 0.2, '#ffe14a');
        textoNeon(g, 'FITA MÁGICA', L * 0.44, A * 0.64, A * 0.3, ['#ff6fb4', '#2ee0d0']);
        fitaNeon(g, L * 0.9, A * 0.5, A * 0.3, A * 0.03);
      });
      return;
    }
    case LETREIRO.banca: {
      // em pé na beira do telhado do quiosque
      const w = 5.0;
      const h = 0.95;
      for (const x of [-2, 2]) r.caixa(0.12, 0.2, 0.12, x, 0, 0.3, COR.grafite2, 0);
      caixaLetreiro(r, w, h, 0.18, 0.3, 0.26, (g, L, A) => {
        fundoPlaca(g, L, A, '#0f2a1c', '#ffe14a');
        textoNeon(g, texto, L / 2, A * 0.52, A * 0.4, ['#f6f4ee', '#ffe14a', '#f6f4ee']);
      });
      return;
    }
    case LETREIRO.lanchonete: {
      // no telhado do sobrado, em três pernas (o letreiro grande de esquina)
      const w = 8.4;
      const h = 2.3;
      for (const x of [-3, 0, 3]) {
        r.caixa(0.16, 0.5, 0.16, x, 0, 0, COR.grafite2, 0);
        r.barra([x, 0, -0.9], [x, 1.5, -0.12], 0.08, COR.grafite2);
      }
      caixaLetreiro(r, w, h, 0.45, 0, 0.34, (g, L, A) => {
        fundoPlaca(g, L, A, '#3a0f18', '#ffe14a');
        textoNeon(g, 'LANCHONETE', L * 0.43, A * 0.27, A * 0.2, '#f6f4ee');
        textoNeon(g, 'DOIS CANUDOS', L * 0.43, A * 0.65, A * 0.28, ['#ffe14a', '#ff6fb4']);
        copoNeon(g, L * 0.91, A * 0.54, A * 0.62, A * 0.03);
      });
      fileiraLampadas(r, -w / 2, w / 2, 0.45 + h + 0.2, 0.2, 0.5);
      return;
    }
    case LETREIRO.fliperama: {
      // no telhado do fliperama
      const w = 8.4;
      const h = 2.3;
      for (const x of [-3.2, 0, 3.2]) {
        r.caixa(0.16, 0.5, 0.16, x, 0, 0, COR.cromo, 0);
        r.barra([x, 0, -0.9], [x, 1.5, -0.12], 0.08, COR.cromo);
      }
      caixaLetreiro(r, w, h, 0.45, 0, 0.34, (g, L, A) => {
        fundoPlaca(g, L, A, '#17152a', '#e8302a');
        textoNeon(g, texto, L * 0.56, A * 0.52, A * 0.38, '#ffe14a');
        controleNeon(g, L * 0.11, A * 0.5, A * 0.5, A * 0.03);
      });
      fileiraLampadas(r, -w / 2, w / 2, 0.45 + h + 0.2, 0.2, 0.5);
      return;
    }
    case LETREIRO.rinque: {
      // o pórtico da entrada do rinque: dois postes e a placa alta, lida dos dois lados
      const w = 4.6;
      const h = 1.9;
      for (const x of [-2.1, 2.1]) {
        r.caixa(0.5, 0.3, 0.5, x, 0, 0, COR.grafite2, 0.05);
        r.caixa(0.24, 4.3, 0.24, x, 0.3, 0, COR.cromo, 0.04);
        r.caixa(0.3, 0.12, 0.3, x, 3.2, 0, COR.rosa, 0.03);
      }
      caixaLetreiro(
        r,
        w,
        h,
        4.3,
        0,
        0.36,
        (g, L, A) => {
          fundoPlaca(g, L, A, '#1d1430', '#2ee0d0');
          textoNeon(g, texto, L * 0.39, A * 0.5, A * 0.3, '#ff6fb4');
          patimNeon(g, L * 0.84, A * 0.46, A * 0.34, '#2ee0d0', A * 0.03);
        },
        true,
      );
      for (const z of [0.26, -0.26]) fileiraLampadas(r, -w / 2, w / 2, 4.3 + h + 0.2, z, 0.46);
      return;
    }
    default: {
      // o festival: a placa pendurada na travessa do portão, lida dos dois lados
      const w = 7.4;
      const h = 1.5;
      for (const x of [-3, 3]) r.caixa(0.1, 0.3, 0.1, x, h + 0.16, 0, COR.cromo, 0);
      caixaLetreiro(
        r,
        w,
        h,
        0,
        0,
        0.4,
        (g, L, A) => {
          fundoPlaca(g, L, A, '#1c1b22', '#2f8cff');
          const alt = Math.min(A * 0.4, (L * 0.8 * A * 0.4) / larguraTexto(texto, A * 0.4));
          textoNeon(g, texto, L / 2, A * 0.52, alt, ['#ffe14a', '#e8302a']);
          raioNeon(g, L * 0.055, A * 0.5, A * 0.6, '#ffe14a', A * 0.035);
          raioNeon(g, L * 0.945, A * 0.5, A * 0.6, '#ffe14a', A * 0.035);
        },
        true,
      );
      return;
    }
  }
}

// ------------------------------------------------------------------ a pracinha

/** O mural de recados (o canto das missões): quadro de cortiça com telhadinho e floreira. */
function mural(r: Ref): void {
  for (const x of [-1.45, 1.45]) {
    r.caixa(0.2, 2.5, 0.2, x, 0, 0, MADEIRA2, 0.04);
    r.caixa(0.34, 0.14, 0.34, x, 0, 0, COR.grafite2, 0.03);
  }
  // a moldura e a cortiça
  r.caixa(3.0, 1.75, 0.14, 0, 0.72, -0.02, COR.madeira, 0.04);
  r.caixa(3.1, 0.14, 0.24, 0, 0.66, 0, MADEIRA2, 0.03);
  r.quadro(2.72, 1.5, 0, 1.6, 0.06, pintarMural, false, 512);
  // o telhadinho de duas águas (a cumeeira ao longo do quadro)
  const telhado: Item[] = [
    { x: -0.62, y: 2.45 },
    { x: 0.62, y: 2.45 },
    { x: 0.62, y: 2.55 },
    { x: 0, y: 2.95 },
    { x: -0.62, y: 2.55 },
  ];
  r.perfil(telhado, -1.75, 1.75, 0.03, '#c8502e');
  r.caixa(3.56, 0.08, 0.16, 0, 2.93, 0, '#a83e22', 0.02);
  // a lampadinha debaixo do telhado (o mural se lê de noite)
  r.caixa(0.5, 0.06, 0.14, 0, 2.39, 0.22, COR.grafite2, 0);
  r.luz(0.4, 0.07, 0.1, 0, 2.32, 0.22, MORNA);
  // a floreira no pé
  r.caixa(2.5, 0.3, 0.42, 0, 0, 0.3, '#f4ecdc', 0.05);
  const flores = [COR.vermelho, COR.amarelo, '#ff8fc0', COR.branco, COR.amarelo, COR.vermelho];
  flores.forEach((c, i) => {
    const x = -1.0 + i * 0.4;
    r.caixa(0.22, 0.14, 0.22, x, 0.3, 0.3, '#3c9a32', 0.02);
    r.caixa(0.16, 0.14, 0.16, x + (i % 2 ? 0.04 : -0.03), 0.42, 0.3, c, 0.03);
  });
}

function gangorra(r: Ref): void {
  // a base, a prancha inclinada e os assentos com alça
  r.caixa(0.5, 0.12, 0.7, 0, 0, 0, COR.grafite2, 0.03);
  r.caixa(0.22, 0.55, 0.5, 0, 0.1, 0, COR.azul, 0.05);
  r.barra([-1.7, 0.36, 0], [1.7, 0.96, 0], 0.2, COR.amarelo);
  for (const [s, y] of [
    [-1, 0.36],
    [1, 0.96],
  ] as const) {
    const x = s * 1.45;
    const yy = y + (s < 0 ? 0.05 : -0.05) + 0.1;
    r.caixa(0.5, 0.1, 0.44, x, yy, 0, COR.vermelho, 0.04);
    r.caixa(0.06, 0.3, 0.06, x - s * 0.36, yy + 0.08, 0, COR.cromo, 0);
    r.caixa(0.06, 0.06, 0.36, x - s * 0.36, yy + 0.36, 0, COR.cromo, 0);
  }
}

function balanco(r: Ref): void {
  // o pórtico em A dos dois lados, a travessa e dois balanços
  const W = 1.7;
  for (const s of [-1, 1]) {
    r.barra([s * W, 0, -0.75], [s * W, 2.5, 0], 0.14, COR.azul);
    r.barra([s * W, 0, 0.75], [s * W, 2.5, 0], 0.14, COR.azul);
    r.caixa(0.2, 0.08, 1.7, s * W, 0, 0, COR.grafite2, 0);
  }
  r.caixa(W * 2 + 0.3, 0.16, 0.16, 0, 2.44, 0, COR.amarelo, 0.04);
  for (const [x, z] of [
    [-0.7, 0.18],
    [0.7, -0.12],
  ] as const) {
    for (const dx of [-0.26, 0.26]) r.barra([x + dx, 2.44, 0], [x + dx, 0.62, z], 0.035, COR.cromo);
    r.caixa(0.66, 0.09, 0.3, x, 0.55, z, COR.vermelho, 0.03);
  }
}

function escorregador(r: Ref): void {
  // a escadinha atrás (z negativo), o patamar e a rampa que desce para a frente
  const H = 1.7;
  for (const x of [-0.36, 0.36]) {
    r.barra([x, 0, -1.5], [x, H, -0.9], 0.09, COR.azul);
    r.caixa(0.09, H, 0.09, x, 0, -0.3, COR.azul, 0);
    r.caixa(0.07, 0.6, 0.07, x, H, -0.86, COR.amarelo, 0);
    r.caixa(0.07, 0.6, 0.07, x, H, -0.32, COR.amarelo, 0);
    r.caixa(0.07, 0.07, 0.62, x, H + 0.56, -0.59, COR.amarelo, 0);
  }
  for (let i = 1; i <= 5; i++) {
    const t = i / 6;
    r.caixa(0.72, 0.06, 0.16, 0, H * t, -1.5 + 0.6 * t, COR.cromo, 0);
  }
  r.caixa(0.86, 0.1, 0.66, 0, H - 0.05, -0.59, COR.vermelho, 0.03);
  // a rampa: fundo amarelo e as duas bordas vermelhas
  const rampa: Item[] = [
    { x: -0.3, y: H - 0.05 },
    { x: 1.75, y: 0.22 },
    { x: 2.15, y: 0.22 },
    { x: 2.15, y: 0.32 },
    { x: 1.8, y: 0.32 },
    { x: -0.3, y: H + 0.05 },
  ];
  r.perfil(rampa, -0.36, 0.36, 0, COR.amarelo);
  const borda: Item[] = [
    { x: -0.3, y: H + 0.02 },
    { x: 1.8, y: 0.3 },
    { x: 2.15, y: 0.3 },
    { x: 2.15, y: 0.46 },
    { x: 1.82, y: 0.46 },
    { x: -0.3, y: H + 0.2 },
  ];
  r.perfil(borda, -0.43, -0.34, 0, COR.vermelho);
  r.perfil(borda, 0.34, 0.43, 0, COR.vermelho);
  r.caixa(0.1, 0.24, 0.1, 0, 0, 2.0, COR.azul, 0);
}

/** Banco de praça: pés de ferro e ripas de madeira. */
function banco(r: Ref): void {
  for (const x of [-0.85, 0.85]) {
    r.caixa(0.1, 0.44, 0.56, x, 0, 0.02, COR.grafite2, 0.03);
    r.barra([x, 0.4, -0.2], [x, 1.0, -0.32], 0.09, COR.grafite2);
    r.caixa(0.1, 0.06, 0.5, x, 0.62, 0.05, COR.grafite2, 0);
  }
  for (const z of [-0.12, 0.06, 0.24]) r.caixa(2.0, 0.07, 0.15, 0, 0.44, z, COR.madeira, 0.02);
  r.caixa(2.0, 0.16, 0.06, 0, 0.62, -0.27, MADEIRA3, 0.02);
  r.caixa(2.0, 0.16, 0.06, 0, 0.84, -0.31, COR.madeira, 0.02);
}

function lixeira(r: Ref): void {
  r.caixa(0.12, 1.1, 0.12, 0, 0, -0.22, COR.grafite2, 0.02);
  r.caixa(0.52, 0.62, 0.42, 0, 0.38, 0.02, COR.laranja, 0.06);
  r.caixa(0.56, 0.08, 0.46, 0, 0.98, 0.02, '#e06a10', 0.03);
  r.caixa(0.3, 0.07, 0.03, 0, 0.8, 0.235, COR.grafite, 0);
  r.caixa(0.22, 0.2, 0.02, 0, 0.5, 0.235, COR.branco, 0);
}

/** Orelhão de cúpula (forma genérica de brinquedo): o poste, a cúpula e o telefone dentro. */
function orelhao(r: Ref): void {
  r.caixa(0.5, 0.1, 0.5, 0, 0, -0.1, COR.grafite2, 0.03);
  r.caixa(0.14, 1.5, 0.14, 0, 0.1, -0.1, COR.grafite2, 0.03);
  // a cúpula: o contorno de lado arredondado em cima e atrás, aberto na frente
  const cupula: Item[] = [
    { x: -0.5, y: 1.05, r: 0.1, seg: 2 },
    { x: 0.42, y: 1.05, r: 0.05, seg: 1 },
    { x: 0.5, y: 2.0, r: 0.32, seg: 3 },
    { x: -0.5, y: 2.0, r: 0.36, seg: 3 },
  ];
  r.perfil(cupula, -0.52, 0.52, 0.06, COR.laranja);
  // o miolo escuro (a boca da cúpula) e o telefone
  r.caixa(0.8, 0.72, 0.04, 0, 1.14, 0.47, '#3a2a20', 0);
  r.caixa(0.36, 0.5, 0.1, 0.08, 1.22, 0.5, COR.cromo, 0.03);
  r.caixa(0.1, 0.42, 0.1, -0.24, 1.26, 0.5, COR.vermelho, 0.03);
  for (let i = 0; i < 9; i++)
    r.caixa(0.06, 0.06, 0.02, (i % 3) * 0.08, 1.3 + Math.floor(i / 3) * 0.08, 0.56, COR.grafite, 0);
  r.caixa(0.2, 0.08, 0.02, 0.08, 1.58, 0.56, '#bfe7ff', 0);
  // a faixa azul da cúpula
  r.caixa(1.08, 0.12, 0.9, 0, 1.12, 0, COR.azul, 0.03);
}

function pontoOnibus(r: Ref): void {
  const W = 3.4;
  // os dois postes de trás, o teto e o fundo de vidro
  for (const x of [-W / 2 + 0.1, W / 2 - 0.1]) {
    r.caixa(0.14, 2.4, 0.14, x, 0, -0.5, COR.grafite2, 0.03);
    r.caixa(0.1, 0.1, 1.1, x, 2.3, 0, COR.grafite2, 0);
  }
  r.caixa(W + 0.3, 0.14, 1.5, 0, 2.4, 0.05, COR.azul, 0.05);
  r.caixa(W + 0.34, 0.08, 1.54, 0, 2.36, 0.05, COR.branco, 0.02);
  r.caixa(W - 1.5, 1.5, 0.05, -0.65, 0.6, -0.5, VIDRO, 0);
  r.caixa(W - 0.2, 0.08, 0.08, 0, 0.56, -0.5, COR.grafite2, 0);
  // o cartaz (inventado, sem palavra) com a moldura
  r.caixa(1.24, 1.66, 0.1, 0.98, 0.52, -0.5, COR.grafite, 0.03);
  r.quadro(1.08, 1.5, 0.98, 1.35, -0.44, (g, L, A) => pintarCartaz(g, L, A, 4), false, 128);
  // o banco
  for (const x of [-1.3, 0]) r.caixa(0.1, 0.44, 0.4, x, 0, -0.2, COR.grafite2, 0);
  r.caixa(1.7, 0.08, 0.44, -0.65, 0.44, -0.2, COR.madeira, 0.02);
  // a plaquinha do ponto: o poste amarelo com o desenho do ônibus
  r.caixa(0.1, 2.6, 0.1, W / 2 + 0.6, 0, 0.5, COR.amarelo, 0.02);
  r.caixa(0.7, 0.7, 0.08, W / 2 + 0.6, 2.0, 0.5, COR.azul, 0.04);
  for (const z of [0.545, 0.455]) {
    r.caixa(0.46, 0.26, 0.01, W / 2 + 0.6, 2.28, z, COR.branco, 0);
    r.caixa(0.36, 0.1, 0.012, W / 2 + 0.6, 2.4, z, VIDRO_ESC, 0);
    r.caixa(0.1, 0.08, 0.012, W / 2 + 0.46, 2.22, z, COR.grafite, 0);
    r.caixa(0.1, 0.08, 0.012, W / 2 + 0.74, 2.22, z, COR.grafite, 0);
  }
}

const CORES_BICI = [COR.vermelho, COR.azul, COR.amarelo, COR.turquesa];

/** Bicicleta parada de lado (o comprimento em x), com o paraciclo de cromo. */
function bicicleta(r: Ref, n: number): void {
  const cor = CORES_BICI[n % CORES_BICI.length];
  const R = 0.3;
  for (const x of [-0.5, 0.5]) {
    r.roda(R, 0.07, x, R, 0, PNEU, 'z');
    r.roda(R * 0.62, 0.08, x, R, 0, CALOTA, 'z');
    r.roda(0.06, 0.12, x, R, 0, COR.grafite, 'z');
  }
  const A: V3 = [-0.5, R, 0];
  const B: V3 = [-0.08, R - 0.02, 0];
  const C: V3 = [-0.2, 0.74, 0];
  const D: V3 = [0.3, 0.78, 0];
  const E: V3 = [0.5, R, 0];
  const t = 0.055;
  r.barra(A, B, t, cor);
  r.barra(B, C, t, cor);
  r.barra(A, C, t, cor);
  r.barra(C, D, t, cor);
  r.barra(B, D, t, cor);
  r.barra(D, E, t, COR.cromo);
  r.barra(D, [0.27, 0.98, 0], t, COR.cromo);
  r.caixa(0.06, 0.06, 0.46, 0.27, 0.95, 0, COR.cromo, 0);
  for (const z of [-0.2, 0.2]) r.caixa(0.08, 0.08, 0.1, 0.27, 0.94, z, COR.grafite, 0);
  r.barra(C, [-0.23, 0.86, 0], t, COR.cromo);
  r.caixa(0.3, 0.07, 0.16, -0.25, 0.86, 0, COR.grafite, 0.03);
  // a campainha e o para-lama de trás
  r.caixa(0.08, 0.08, 0.08, 0.27, 1.0, 0.12, COR.amarelo, 0.02);
  r.caixa(0.36, 0.04, 0.09, -0.52, R * 2 + 0.03, 0, cor, 0);
  // o paraciclo (U de cromo) atrás
  r.caixa(0.07, 0.8, 0.07, -0.3, 0, -0.16, COR.cromo, 0);
  r.caixa(0.07, 0.8, 0.07, 0.3, 0, -0.16, COR.cromo, 0);
  r.caixa(0.67, 0.07, 0.07, 0, 0.78, -0.16, COR.cromo, 0);
}

/**
 * O painel de pôsteres do fliperama: um quadro claro de moldura cromada, do tamanho da parede
 * do fundo, com seis cartazes inventados diferentes (sem palavra), presos com fita, cada um do
 * seu tamanho e um tico torto. Claro de propósito: o fundo do salão não fica um buraco escuro.
 */
function posteres(r: Ref, n: number): void {
  const L = 13.6;
  const A = 2.7;
  r.caixa(L + 0.24, A + 0.24, 0.08, 0, -0.12, -0.46, COR.cromo, 0.03);
  for (const s of [-1, 1])
    r.quadro(
      L / 2,
      A,
      (s * L) / 4,
      A / 2,
      -0.41,
      (g, w, h) => {
        g.fillStyle = '#f4ecdc';
        g.fillRect(0, 0, w, h);
        // o feltro do painel: pontinhos de leve
        g.fillStyle = '#e8dcc4';
        for (let i = 0; i < 90; i++) g.fillRect((i * 97) % w, (i * 53) % h, 2, 2);
        for (let i = 0; i < 3; i++) {
          const k = (s > 0 ? 3 : 0) + i;
          const ph = h * (0.74 + ((k * 7) % 3) * 0.06);
          const pw = ph * (k % 2 ? 0.62 : 0.74);
          g.save();
          g.translate(w * ((i + 0.5) / 3), h * (0.5 + ((k % 3) - 1) * 0.02));
          g.rotate((((k * 5) % 7) - 3) * 0.012);
          g.fillStyle = 'rgba(60, 40, 30, 0.22)';
          g.fillRect(-pw / 2 + 3, -ph / 2 + 4, pw, ph);
          g.translate(-pw / 2, -ph / 2);
          pintarCartaz(g, pw, ph, k + n);
          // a fita nos cantos de cima
          g.fillStyle = '#ffe14a';
          g.fillRect(-4, -3, 16, 7);
          g.fillRect(pw - 12, -3, 16, 7);
          g.restore();
        }
      },
      false,
      512,
    );
}

function hidrante(r: Ref): void {
  r.caixa(0.44, 0.1, 0.44, 0, 0, 0, '#b8241e', 0.03);
  r.caixa(0.3, 0.56, 0.3, 0, 0.1, 0, COR.vermelho, 0.05);
  r.caixa(0.38, 0.09, 0.38, 0, 0.62, 0, '#b8241e', 0.03);
  r.caixa(0.24, 0.12, 0.24, 0, 0.71, 0, COR.vermelho, 0.05);
  r.caixa(0.1, 0.08, 0.1, 0, 0.83, 0, COR.cromo, 0.02);
  for (const s of [-1, 1]) {
    r.caixa(0.14, 0.16, 0.16, s * 0.2, 0.36, 0, COR.vermelho, 0.03);
    r.caixa(0.05, 0.12, 0.12, s * 0.29, 0.38, 0, COR.cromo, 0.02);
  }
  r.caixa(0.16, 0.16, 0.12, 0, 0.3, 0.19, COR.cromo, 0.03);
}

function caixaCorreio(r: Ref, n: number): void {
  if (n >= 9) {
    // a caixa de coleta da rua: amarela, de pé, com a faixa azul e a boca
    r.caixa(0.1, 0.3, 0.1, -0.22, 0, 0, COR.grafite2, 0);
    r.caixa(0.1, 0.3, 0.1, 0.22, 0, 0, COR.grafite2, 0);
    r.caixa(0.66, 0.9, 0.5, 0, 0.3, 0, COR.amarelo, 0.07);
    r.caixa(0.7, 0.14, 0.54, 0, 0.84, 0, COR.azul, 0.03);
    r.caixa(0.44, 0.07, 0.03, 0, 1.0, 0.25, COR.grafite, 0);
    r.caixa(0.3, 0.2, 0.02, 0, 0.5, 0.255, COR.branco, 0);
    r.caixa(0.22, 0.03, 0.022, 0, 0.6, 0.257, COR.azul, 0);
    r.caixa(0.22, 0.03, 0.022, 0, 0.54, 0.257, COR.azul, 0);
    return;
  }
  // a caixinha de carta do portão: no poste, com a bandeirinha
  const cores = [COR.azul, COR.vermelho, COR.verde, COR.amarelo];
  r.caixa(0.1, 0.9, 0.1, 0, 0, 0, MADEIRA2, 0.02);
  r.caixa(0.3, 0.26, 0.5, 0, 0.9, 0, cores[n % cores.length], 0.06);
  r.caixa(0.2, 0.04, 0.02, 0, 1.02, 0.255, COR.grafite, 0);
  r.caixa(0.03, 0.2, 0.04, 0.165, 0.98, 0.1, COR.vermelho, 0);
  r.caixa(0.03, 0.08, 0.12, 0.165, 1.14, 0.06, COR.vermelho, 0);
}

// ------------------------------------------------------------------ fios, lâmpadas, pipa

/**
 * O fio de um poste ao outro, com a barriga; devolve os pontos (locais) ao longo dele.
 * `poste`: bit 1 põe o poste na ponta de cá, bit 2 na de lá (o fio nunca fica preso no ar).
 */
function fio(r: Ref, n: number, barriga: number, poste = 3): V3[] {
  const a = r.p.ate ?? [r.p.x, r.p.y, r.p.z];
  const dx = a[0] - r.p.x;
  const dz = a[2] - r.p.z;
  const ang = (r.p.dir & 3) * (Math.PI / 2);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const fim: V3 = [dx * c - dz * s, a[1] - r.p.y, dx * s + dz * c];
  const pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([fim[0] * t, fim[1] * t - barriga * 4 * t * (1 - t), fim[2] * t]);
  }
  // (cada chunk desenha só o pedaço do fio que passa por cima dele)
  for (let i = 0; i < n; i++) {
    const seg = r.recortar(pts[i], pts[i + 1]);
    if (seg) r.barra(seg[0], seg[1], 0.035, COR.grafite);
  }
  const H = r.altura;
  const pe = (q: V3) => {
    if (!r.dentro(q[0], 0, q[2])) return;
    r.caixa(0.34, 0.2, 0.34, q[0], -H, q[2], COR.grafite, 0.04);
    r.caixa(0.14, H + q[1] + 0.12, 0.14, q[0], -H, q[2], COR.grafite2, 0.03);
    r.caixa(0.2, 0.08, 0.2, q[0], q[1] + 0.1, q[2], COR.cromo, 0.02);
  };
  if (poste & 1) pe(pts[0]);
  if (poste & 2) pe(pts[n]);
  return pts;
}

/** Ponto do fio na fração t (0..1). */
function noFio(pts: V3[], t: number): V3 {
  const f = Math.min(pts.length - 1.001, Math.max(0, t * (pts.length - 1)));
  const i = Math.floor(f);
  const k = f - i;
  return [0, 1, 2].map((j) => pts[i][j] + (pts[i + 1][j] - pts[i][j]) * k) as V3;
}

function varalLampadas(r: Ref, n: number): void {
  const pts = fio(r, 10, 0.9);
  const a = r.p.ate ?? [r.p.x, r.p.y, r.p.z];
  const L = Math.hypot(a[0] - r.p.x, a[2] - r.p.z);
  const q = Math.max(4, Math.round(L / 0.85));
  for (let i = 1; i < q; i++) {
    const [x, y, z] = noFio(pts, i / q);
    if (!r.dentro(x, y, z)) continue;
    r.caixa(0.07, 0.08, 0.07, x, y - 0.09, z, COR.grafite, 0);
    r.luz(0.17, 0.17, 0.17, x, y - 0.26, z, LAMPADAS[(i + n) % LAMPADAS.length]);
  }
}

const CORES_BANDEIROLA = [COR.vermelho, COR.branco, COR.azul, COR.amarelo];

/** Bandeirolas do festival: triângulos vermelhos, brancos, azuis e amarelos num fio. */
function bandeirolas(r: Ref, n: number): void {
  const pts = fio(r, 8, 0.7, n & 3);
  const a = r.p.ate ?? [r.p.x, r.p.y, r.p.z];
  const dx = a[0] - r.p.x;
  const dz = a[2] - r.p.z;
  const L = Math.hypot(dx, dz);
  const q = Math.max(3, Math.round(L / 0.7));
  // as bandeirolas ficam de frente para o lado do fio
  const ang = (r.p.dir & 3) * (Math.PI / 2);
  const lx = dx * Math.cos(ang) - dz * Math.sin(ang);
  const lz = dx * Math.sin(ang) + dz * Math.cos(ang);
  const aoLongoDeX = Math.abs(lx) > Math.abs(lz);
  for (let i = 0; i < q; i++) {
    const [x, y, z] = noFio(pts, (i + 0.5) / q);
    if (!r.dentro(x, y, z)) continue;
    const s = r.sub(x, y, z, aoLongoDeX ? 0 : 1);
    s.placa(
      [
        [-0.24, 0],
        [0.24, 0],
        [0, -0.52],
      ],
      0.03,
      0,
      -0.02,
      0,
      CORES_BANDEIROLA[(i + (n >> 2)) % CORES_BANDEIROLA.length],
    );
  }
}

/** A pipa enroscada no fio do varal: o losango de duas cores e a rabiola de lacinhos. */
function pipa(r: Ref): void {
  r.barra([0, 0, 0], [0.1, -0.5, 0.05], 0.025, COR.branco);
  const cx = 0.25;
  const cy = -1.0;
  r.placa(
    [
      [cx, cy + 0.62],
      [cx + 0.46, cy + 0.1],
      [cx, cy - 0.62],
    ],
    0.04,
    0,
    0,
    0.05,
    COR.vermelho,
  );
  r.placa(
    [
      [cx, cy + 0.62],
      [cx, cy - 0.62],
      [cx - 0.46, cy + 0.1],
    ],
    0.04,
    0,
    0,
    0.05,
    COR.amarelo,
  );
  r.barra([cx - 0.46, cy + 0.1, 0.05], [cx + 0.46, cy + 0.1, 0.05], 0.03, MADEIRA2);
  // a rabiola
  let p: V3 = [cx, cy - 0.62, 0.05];
  const lacos = [COR.azul, COR.branco, COR.vermelho, COR.amarelo];
  lacos.forEach((c, i) => {
    const q: V3 = [p[0] + (i % 2 ? -0.16 : 0.2), p[1] - 0.36, 0.05];
    r.barra(p, q, 0.02, COR.branco);
    r.caixa(0.2, 0.08, 0.03, q[0], q[1] - 0.04, 0.05, c, 0);
    p = q;
  });
}

// ------------------------------------------------------------------ os quintais

const CAMISETA: [number, number][] = [
  [-0.3, 0],
  [0.3, 0],
  [0.44, -0.2],
  [0.3, -0.32],
  [0.21, -0.23],
  [0.21, -0.68],
  [-0.21, -0.68],
  [-0.21, -0.23],
  [-0.3, -0.32],
  [-0.44, -0.2],
];

function varalRoupa(r: Ref, n: number): void {
  const W = 1.3;
  for (const s of [-1, 1]) {
    r.caixa(0.1, 1.7, 0.1, s * W, 0, 0, COR.branco, 0.02);
    r.caixa(0.08, 0.08, 0.7, s * W, 1.62, 0, COR.branco, 0);
  }
  for (const z of [-0.26, 0.26]) r.barra([-W, 1.66, z], [W, 1.66, z], 0.02, COR.grafite2);
  // a camiseta, a toalha, o pano e a meia (cores de quintal, nunca em ordem de arco-íris)
  const cores = [COR.vermelho, COR.amarelo, COR.azul, COR.turquesa, COR.rosa];
  r.placa(CAMISETA, 0.03, -0.7, 1.64, 0.26, cores[n % 5]);
  r.caixa(0.6, 0.8, 0.03, 0.4, 0.84, 0.26, cores[(n + 2) % 5], 0);
  r.caixa(0.6, 0.12, 0.034, 0.4, 1.3, 0.26, COR.branco, 0);
  r.placa(CAMISETA, 0.03, 0.2, 1.64, -0.26, COR.branco);
  r.caixa(0.5, 0.5, 0.03, -0.6, 1.14, -0.26, cores[(n + 3) % 5], 0);
  r.caixa(0.16, 0.34, 0.03, 0.9, 1.3, -0.26, cores[(n + 1) % 5], 0);
}

function casinhaCachorro(r: Ref, n: number): void {
  const parede = [COR.creme, '#bfe0f4', '#ffe9a8'][n % 3];
  r.caixa(1.0, 0.62, 1.2, 0, 0, 0, parede, 0.04);
  // a empena e o telhado de duas águas (a frente mostra o triângulo)
  r.placa(
    [
      [-0.5, 0.6],
      [0.5, 0.6],
      [0, 1.04],
    ],
    1.16,
    0,
    0,
    0,
    parede,
  );
  for (const s of [-1, 1])
    r.placa(
      [
        [s * 0.72, 0.46],
        [s * 0.72, 0.6],
        [0, 1.22],
        [0, 1.08],
      ],
      1.4,
      0,
      0,
      0,
      s > 0 ? COR.vermelho : '#d02a24',
    );
  r.caixa(0.12, 0.1, 1.44, 0, 1.14, 0, '#b8241e', 0.02);
  // a portinha e a tigela
  r.caixa(0.44, 0.4, 0.03, 0, 0, 0.6, '#4a3626', 0);
  r.caixa(0.32, 0.12, 0.03, 0, 0.4, 0.6, '#4a3626', 0);
  r.caixa(0.36, 0.1, 0.3, 0.75, 0, 0.5, COR.azul, 0.03);
  r.caixa(0.26, 0.04, 0.2, 0.75, 0.08, 0.5, '#f4ecdc', 0);
  // o ossinho
  r.caixa(0.22, 0.05, 0.06, -0.72, 0, 0.6, COR.branco, 0);
  for (const dx of [-0.11, 0.11]) r.caixa(0.07, 0.06, 0.12, -0.72 + dx, 0, 0.6, COR.branco, 0);
}

function piscininha(r: Ref): void {
  const S = 1.9;
  // a borda inflável (dois gomos) e a água
  for (const [w, d, x, z] of [
    [S, 0.3, 0, -S / 2 + 0.15],
    [S, 0.3, 0, S / 2 - 0.15],
    [0.3, S - 0.5, -S / 2 + 0.15, 0],
    [0.3, S - 0.5, S / 2 - 0.15, 0],
  ] as const) {
    r.caixa(w, 0.2, d, x, 0, z, '#3f9be8', 0.08);
    r.caixa(w, 0.2, d, x, 0.18, z, COR.branco, 0.08);
  }
  r.caixa(S - 0.5, 0.26, S - 0.5, 0, 0, 0, '#6fd0f4', 0);
  r.caixa(0.5, 0.02, 0.2, -0.2, 0.26, 0.3, '#b8ecff', 0);
  r.caixa(0.3, 0.02, 0.14, 0.3, 0.26, -0.3, '#b8ecff', 0);
  // o patinho e a bola
  r.caixa(0.28, 0.16, 0.2, 0.25, 0.26, 0.2, COR.amarelo, 0.05);
  r.caixa(0.16, 0.16, 0.16, 0.34, 0.4, 0.2, COR.amarelo, 0.04);
  r.caixa(0.1, 0.05, 0.08, 0.45, 0.43, 0.2, COR.laranja, 0);
  r.caixa(0.3, 0.3, 0.3, -1.25, 0, 0.6, COR.vermelho, 0.09);
  r.caixa(0.31, 0.1, 0.31, -1.25, 0.1, 0.6, COR.branco, 0.03);
}

// ------------------------------------------------------------------ as lojas

const CAPAS = [
  COR.vermelho,
  COR.azul,
  COR.amarelo,
  COR.branco,
  COR.turquesa,
  COR.laranja,
  COR.grafite2,
  COR.rosa,
];

/** A estante de fitas de vídeo da locadora, atrás do vidro: caixinhas coloridas em fileiras. */
function vitrine(r: Ref): void {
  const W = 4.4;
  r.caixa(W, 2.3, 0.3, 0, 0, -0.1, MADEIRA2, 0.04);
  r.caixa(W - 0.2, 2.1, 0.04, 0, 0.12, 0.05, '#f4ecdc', 0);
  let k = 3;
  for (let j = 0; j < 4; j++) {
    const y = 0.2 + j * 0.52;
    r.caixa(W - 0.1, 0.06, 0.34, 0, y - 0.06, 0.1, COR.madeira, 0);
    for (let i = 0; i < 17; i++) {
      k = (k * 7 + 5 + j) % 23;
      const deFrente = (i + j) % 6 === 2;
      const x = -W / 2 + 0.32 + i * 0.236;
      if (deFrente) {
        r.caixa(0.22, 0.4, 0.06, x, y, 0.2, CAPAS[k % CAPAS.length], 0.02);
        r.caixa(0.14, 0.14, 0.02, x, y + 0.18, 0.235, CAPAS[(k + 3) % CAPAS.length], 0);
      } else {
        r.caixa(0.2, 0.4 - (k % 3) * 0.03, 0.26, x, y, 0.12, CAPAS[k % CAPAS.length], 0.02);
        r.caixa(0.2, 0.06, 0.262, x, y + 0.26, 0.12, COR.branco, 0);
      }
    }
  }
}

/** Copo de vitamina com dois canudos. */
function vitamina(r: Ref, x: number, y: number, z: number, cor: string): void {
  r.caixa(0.2, 0.06, 0.2, x, y, z, COR.cromo, 0.02);
  r.caixa(0.06, 0.1, 0.06, x, y + 0.05, z, COR.cromo, 0);
  r.caixa(0.24, 0.34, 0.24, x, y + 0.14, z, cor, 0.04);
  r.caixa(0.26, 0.08, 0.26, x, y + 0.46, z, COR.branco, 0.03);
  r.barra([x - 0.04, y + 0.5, z], [x - 0.14, y + 0.82, z], 0.035, COR.vermelho);
  r.barra([x + 0.04, y + 0.5, z], [x + 0.15, y + 0.8, z], 0.035, COR.azul);
}

function balcao(r: Ref, n: number): void {
  if (n === 0) {
    // a banca: o expositor de revistinhas e os jornais empilhados
    r.caixa(3.6, 0.9, 0.5, 0, 0, 0.2, '#256a3c', 0.04);
    r.caixa(3.6, 1.14, 0.1, 0, 0.92, 0.22, MADEIRA2, 0.03);
    r.quadro(3.4, 1.0, 0, 1.5, 0.3, (g, L, A) => pintarRevistas(g, L, A, 8, 2), false, 256);
    for (let i = 0; i < 4; i++)
      r.caixa(
        0.6,
        0.1 + (i % 2) * 0.06,
        0.4,
        -1.3 + i * 0.86,
        0.9,
        0.5,
        i % 2 ? '#f4ecdc' : '#e6dcc4',
        0.02,
      );
    return;
  }
  if (n === 1) {
    // a lanchonete: o balcão branco de faixa vermelha, tampo de cromo, banquinhos e vitaminas
    const W = 6;
    r.caixa(W, 1.0, 0.8, 0, 0, 0, COR.branco, 0.05);
    r.caixa(W + 0.02, 0.2, 0.82, 0, 0.5, 0, COR.vermelho, 0);
    r.caixa(W + 0.2, 0.08, 1.0, 0, 1.0, 0, COR.cromo, 0.03);
    for (let i = 0; i < 4; i++) {
      const x = -2.1 + i * 1.4;
      r.caixa(0.34, 0.06, 0.34, x, 0, 1.0, COR.cromo, 0.02);
      r.caixa(0.1, 0.6, 0.1, x, 0.06, 1.0, COR.cromo, 0);
      r.caixa(0.46, 0.14, 0.46, x, 0.64, 1.0, COR.vermelho, 0.06);
    }
    vitamina(r, -1.6, 1.08, 0.1, '#ffb0cc');
    vitamina(r, -0.3, 1.08, 0.05, '#fff0b8');
    vitamina(r, 1.5, 1.08, 0.12, '#c8f0c0');
    // o liquidificador
    r.caixa(0.34, 0.2, 0.34, 2.4, 1.08, -0.1, COR.cromo, 0.04);
    r.caixa(0.26, 0.44, 0.26, 2.4, 1.28, -0.1, VIDRO, 0.03);
    r.caixa(0.28, 0.07, 0.28, 2.4, 1.72, -0.1, COR.vermelho, 0.02);
    return;
  }
  if (n === 2) {
    // a barraca do lanche: pipoca, cachorro-quente e suco em cima do balcão
    for (let i = 0; i < 3; i++) {
      const x = -1.4 + i * 0.5;
      r.caixa(0.3, 0.4, 0.3, x, 0, 0, COR.branco, 0.03);
      r.caixa(0.1, 0.4, 0.31, x - 0.1, 0, 0, COR.vermelho, 0);
      r.caixa(0.1, 0.4, 0.31, x + 0.1, 0, 0, COR.vermelho, 0);
      r.caixa(0.32, 0.12, 0.32, x, 0.38, 0, '#fff0b0', 0.05);
    }
    for (let i = 0; i < 2; i++) {
      const x = 0.3 + i * 0.6;
      r.caixa(0.5, 0.1, 0.2, x, 0, 0.05, '#e8b25a', 0.04);
      r.caixa(0.54, 0.08, 0.1, x, 0.08, 0.05, '#c8402a', 0.03);
      r.caixa(0.4, 0.02, 0.04, x, 0.16, 0.05, COR.amarelo, 0);
    }
    vitamina(r, 1.5, 0, 0, '#ffb45a');
    return;
  }
  // a barraca das camisetas: o varão e as camisetas do festival penduradas
  r.caixa(4.0, 0.06, 0.06, 0, 0.95, -0.2, COR.cromo, 0);
  const cores = [COR.grafite, COR.vermelho, COR.branco, COR.azul];
  cores.forEach((c, i) => {
    const x = -1.5 + i * 1.0;
    r.placa(CAMISETA, 0.04, x, 0.93, -0.2, c);
    r.placa(
      perfilRaio(0.4),
      0.02,
      x - 0.04,
      0.52,
      -0.17,
      c === COR.branco ? COR.vermelho : COR.amarelo,
    );
  });
  // e a pilha de dobradas no balcão
  for (let i = 0; i < 3; i++) r.caixa(0.5, 0.08, 0.4, 1.3, i * 0.08, 0.2, cores[(i + 1) % 4], 0.02);
}

/** O carrinho de pipoca da pracinha: vermelho, de toldo listrado em duas cores, e a vitrine. */
function carrinhoPipoca(r: Ref): void {
  r.roda(0.34, 0.08, -0.7, 0.34, -0.2, PNEU);
  r.roda(0.34, 0.08, 0.7, 0.34, -0.2, PNEU);
  r.roda(0.2, 0.1, -0.7, 0.34, -0.2, COR.amarelo);
  r.roda(0.2, 0.1, 0.7, 0.34, -0.2, COR.amarelo);
  r.caixa(0.08, 0.5, 0.08, 0, 0, 0.4, COR.grafite2, 0);
  r.caixa(1.3, 0.6, 1.0, 0, 0.42, 0, COR.vermelho, 0.06);
  r.caixa(1.32, 0.1, 1.02, 0, 0.6, 0, COR.amarelo, 0);
  // a vitrine de vidro com a pipoca dentro
  r.caixa(1.2, 0.7, 0.9, 0, 1.02, 0, VIDRO, 0.03);
  r.caixa(1.22, 0.34, 0.92, 0, 1.02, 0, '#fff0b0', 0.05);
  for (const [x, z] of [
    [-0.58, -0.43],
    [0.58, -0.43],
    [-0.58, 0.43],
    [0.58, 0.43],
  ] as const)
    r.caixa(0.07, 1.26, 0.07, x, 1.02, z, COR.cromo, 0);
  // o toldo de listras largas vermelhas e brancas
  for (let i = 0; i < 6; i++)
    r.caixa(0.25, 0.14, 1.3, -0.625 + i * 0.25, 2.26, 0, i % 2 ? COR.branco : COR.vermelho, 0.03);
  r.luz(0.5, 0.06, 0.1, 0, 2.18, 0.4, MORNA);
  // a alça e os saquinhos
  r.barra([-0.5, 0.9, -0.5], [-0.5, 1.0, -0.86], 0.05, COR.cromo);
  r.barra([0.5, 0.9, -0.5], [0.5, 1.0, -0.86], 0.05, COR.cromo);
  r.caixa(1.06, 0.06, 0.06, 0, 0.98, -0.86, COR.cromo, 0);
  r.caixa(1.3, 0.05, 0.3, 0, 1.72, 0.56, COR.cromo, 0);
  for (const x of [-0.3, 0.05, 0.4]) {
    r.caixa(0.2, 0.26, 0.14, x, 1.77, 0.56, COR.branco, 0.02);
    r.caixa(0.07, 0.26, 0.142, x, 1.77, 0.56, COR.vermelho, 0);
    r.caixa(0.22, 0.08, 0.16, x, 2.01, 0.56, '#fff0b0', 0.03);
  }
}

/** Mesinha de calçada com guarda-sol de duas cores e dois banquinhos. */
function mesinha(r: Ref, n: number): void {
  const [a, b] = n % 2 ? [COR.azul, COR.branco] : [COR.vermelho, COR.branco];
  r.caixa(0.4, 0.06, 0.4, 0, 0, 0, COR.grafite2, 0.02);
  r.caixa(0.08, 2.2, 0.08, 0, 0, 0, COR.cromo, 0);
  r.caixa(1.0, 0.07, 1.0, 0, 0.74, 0, COR.branco, 0.03);
  // o guarda-sol quadrado em degraus, com as abas em duas cores
  r.caixa(2.0, 0.1, 2.0, 0, 2.0, 0, a, 0.04);
  r.caixa(1.2, 0.12, 1.2, 0, 2.1, 0, b, 0.04);
  r.caixa(0.5, 0.1, 0.5, 0, 2.22, 0, a, 0.04);
  for (let i = 0; i < 4; i++)
    for (const s of [-1, 1]) {
      const t = -0.75 + i * 0.5;
      r.caixa(0.5, 0.14, 0.03, t, 1.88, s * 0.99, i % 2 ? a : b, 0);
      r.caixa(0.03, 0.14, 0.5, s * 0.99, 1.88, t, i % 2 ? b : a, 0);
    }
  for (const s of [-1, 1]) {
    r.caixa(0.08, 0.44, 0.08, s * 0.85, 0, 0, COR.cromo, 0);
    r.caixa(0.4, 0.1, 0.4, s * 0.85, 0.44, 0, a, 0.05);
  }
  r.caixa(0.16, 0.22, 0.16, 0.2, 0.81, 0.15, '#ffb0cc', 0.03);
  r.caixa(0.16, 0.22, 0.16, -0.2, 0.81, -0.1, '#fff0b8', 0.03);
}

/** Floreira de calçada: a caixa clara e as flores de cubinho. */
function floreira(r: Ref, n: number): void {
  const cores = [
    [COR.vermelho, COR.amarelo, COR.branco],
    ['#ff8fc0', COR.branco, COR.amarelo],
    [COR.amarelo, COR.laranja, COR.branco],
  ][n % 3];
  r.caixa(1.8, 0.42, 0.56, 0, 0, 0, n % 2 ? '#f4ecdc' : '#e8c9a0', 0.06);
  r.caixa(1.6, 0.06, 0.4, 0, 0.4, 0, '#5a3e2c', 0);
  for (let i = 0; i < 5; i++) {
    const x = -0.64 + i * 0.32;
    const z = i % 2 ? 0.07 : -0.07;
    r.caixa(0.26, 0.2, 0.26, x, 0.44, z, '#3c9a32', 0.03);
    r.caixa(0.18, 0.16, 0.18, x, 0.62 + (i % 2) * 0.05, z, cores[i % 3], 0.04);
  }
}

/** Toalha de piquenique xadrez no gramado, com a cesta e o lanche. */
function toalha(r: Ref, n: number): void {
  const [a, b] = n % 2 ? [COR.azul, COR.branco] : [COR.vermelho, COR.branco];
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++)
      r.caixa(0.6, 0.04, 0.6, -0.9 + i * 0.6, 0, -0.9 + j * 0.6, (i + j) % 2 ? a : b, 0);
  r.caixa(0.7, 0.36, 0.5, -0.5, 0.04, -0.4, MADEIRA3, 0.05);
  r.caixa(0.74, 0.06, 0.54, -0.5, 0.38, -0.4, COR.madeira, 0.02);
  r.barra([-0.8, 0.4, -0.4], [-0.5, 0.7, -0.4], 0.05, COR.madeira);
  r.barra([-0.2, 0.4, -0.4], [-0.5, 0.7, -0.4], 0.05, COR.madeira);
  r.caixa(0.3, 0.12, 0.3, 0.4, 0.04, 0.3, COR.amarelo, 0.04);
  r.caixa(0.16, 0.24, 0.16, 0.6, 0.04, -0.5, n % 2 ? '#ffb0cc' : '#ffb45a', 0.03);
  r.caixa(0.34, 0.08, 0.2, -0.1, 0.04, 0.6, '#e8b25a', 0.03);
}
