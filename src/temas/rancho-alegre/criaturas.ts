import type { TipoCriatura } from '../../jogo/criaturas';
import type { MovimentoCriatura, PecaCriatura } from '../tipos';

type V3 = [number, number, number];
type Papel = PecaCriatura['papel'];

/**
 * Monta um bicho com as mesmas medidas do desenho aprovado (`referencia/temas.html`), numa
 * escala `k`: `caixa` e `bola` recebem as medidas do esboço (bola pelo raio e pelas escalas
 * de cada eixo) e a posição dentro de um grupo (a cabeça é um grupo deslocado).
 */
export function bicho(k: number) {
  const pecas: PecaCriatura[] = [];
  let origem: V3 = [0, 0, 0];
  let papelGrupo: Papel = undefined;
  const pos = (p: V3): V3 => [
    (origem[0] + p[0]) * k,
    (origem[1] + p[1]) * k,
    (origem[2] + p[2]) * k,
  ];
  const api = {
    pecas,
    /** Tudo o que vier depois fica no grupo (cabeça), até `fim()`. */
    grupo(o: V3, papel: Papel) {
      origem = o;
      papelGrupo = papel;
      return api;
    },
    fim() {
      origem = [0, 0, 0];
      papelGrupo = undefined;
      return api;
    },
    caixa(
      t: V3,
      p: V3,
      cor: string,
      r: number,
      extra: { papel?: Papel; rot?: V3; brilho?: number } = {},
    ) {
      pecas.push({
        t: [t[0] * k, t[1] * k, t[2] * k],
        p: pos(p),
        cor,
        forma: 'caixa',
        raio: Math.max(0.005, r * k),
        papel: 'papel' in extra ? extra.papel : papelGrupo,
        ...(extra.rot ? { rot: extra.rot } : {}),
        ...(extra.brilho ? { brilho: extra.brilho } : {}),
      });
      return api;
    },
    bola(
      r: number,
      cor: string,
      s: V3,
      p: V3,
      extra: { papel?: Papel; rot?: V3; brilho?: number } = {},
    ) {
      pecas.push({
        t: [2 * r * s[0] * k, 2 * r * s[1] * k, 2 * r * s[2] * k],
        p: pos(p),
        cor,
        forma: 'bola',
        papel: 'papel' in extra ? extra.papel : papelGrupo,
        ...(extra.rot ? { rot: extra.rot } : {}),
        ...(extra.brilho ? { brilho: extra.brilho } : {}),
      });
      return api;
    },
    /**
     * Olhos de bolinha do desenho: bolinha escura, pontinho de brilho (sempre do mesmo lado,
     * como a luz batendo) e bochecha rosada embaixo.
     */
    olhos(
      y: number,
      z: number,
      sep: number,
      r: number,
      opcoes: { bochecha?: boolean; cor?: string; brilho?: number } = {},
    ) {
      for (const s of [-1, 1]) {
        api.bola(r, opcoes.cor ?? '#231a28', [0.85, 1.1, 0.5], [s * sep, y, z], {
          brilho: opcoes.brilho ?? 0.35,
        });
        api.bola(
          r * 0.32,
          '#ffffff',
          [1, 1, 0.5],
          [s * sep + r * 0.3, y + r * 0.45, z + r * 0.35],
          {
            brilho: 0.3,
          },
        );
        if (opcoes.bochecha !== false)
          api.bola(
            r * 0.7,
            '#ff9aa8',
            [1.4, 0.75, 0.3],
            [s * (sep + r * 1.1), y - r * 1.8, z - r * 0.2],
          );
      }
      return api;
    },
  };
  return api;
}

/** Patas da frente e de trás em diagonal (uma diagonal anda junto). */
export const DIAGONAL: Record<string, Papel> = {
  '1,1': 'perna0',
  '-1,1': 'perna1',
  '1,-1': 'perna1',
  '-1,-1': 'perna0',
};

/** Vaca malhada: branca com manchas marrons, focinho rosa, chifrinhos e cascos. */
function vaca(): PecaCriatura[] {
  const b = bicho(1.25);
  for (const [x, z] of [
    [-0.18, 0.24],
    [0.18, 0.24],
    [-0.18, -0.24],
    [0.18, -0.24],
  ]) {
    const papel = DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`];
    b.caixa([0.17, 0.3, 0.17], [x, 0.15, z], '#ffffff', 0.08, { papel });
    b.caixa([0.18, 0.06, 0.18], [x, 0.03, z], '#3b2a1e', 0.03, { papel });
  }
  b.caixa([0.56, 0.42, 0.82], [0, 0.5, 0], '#ffffff', 0.18);
  for (const [x, y, z, r] of [
    [0.27, 0.55, 0.1, 0.13],
    [-0.28, 0.45, -0.18, 0.1],
    [0.1, 0.7, -0.2, 0.12],
    [-0.12, 0.62, 0.25, 0.08],
  ])
    b.bola(r, '#3b2a1e', [1, 1, 1.1], [x, y, z]);
  // úbere rosa e o rabo com a pontinha marrom
  b.bola(0.1, '#ffb3c1', [1.2, 0.6, 1], [0, 0.28, -0.12]);
  b.caixa([0.05, 0.3, 0.05], [0, 0.52, -0.45], '#ffffff', 0.02, {
    papel: 'cauda',
    rot: [0.4, 0, 0],
  });
  b.bola(0.06, '#3b2a1e', [1, 1, 1], [0, 0.38, -0.52], { papel: 'cauda' });
  b.grupo([0, 0.82, 0.48], 'cabeca');
  b.caixa([0.5, 0.44, 0.42], [0, 0, 0], '#ffffff', 0.17);
  b.caixa([0.42, 0.2, 0.18], [0, -0.13, 0.2], '#ffb3c1', 0.08);
  for (const s of [-1, 1]) {
    b.bola(0.03, '#a85a6a', [1, 1, 1], [s * 0.08, -0.1, 0.3]);
    b.caixa([0.06, 0.16, 0.06], [s * 0.17, 0.28, 0], '#f4e2b8', 0.03, { rot: [0, 0, s * -0.5] });
    b.caixa([0.16, 0.08, 0.1], [s * 0.3, 0.1, 0], '#3b2a1e', 0.04);
  }
  // mancha marrom em volta de um olho, como no desenho de vaquinha
  b.bola(0.08, '#3b2a1e', [1.1, 1, 0.3], [0.13, 0.07, 0.205]);
  b.olhos(0.05, 0.21, 0.12, 0.055);
  return b.fim().pecas;
}

/** Galinha caipira: bolinha branca com asinhas, crista e barbela vermelhas e bico laranja. */
function galinha(): PecaCriatura[] {
  const b = bicho(1.25);
  for (const s of [-1, 1]) {
    const papel: Papel = s > 0 ? 'perna0' : 'perna1';
    b.caixa([0.04, 0.12, 0.04], [s * 0.07, 0.06, 0], '#ff9b2f', 0.02, { papel });
    b.caixa([0.09, 0.025, 0.1], [s * 0.07, 0.0125, 0.03], '#ff9b2f', 0.012, { papel });
  }
  b.bola(0.2, '#ffffff', [1, 0.9, 1.1], [0, 0.27, 0]);
  for (const s of [-1, 1]) b.bola(0.1, '#f4efe6', [0.4, 0.75, 1.2], [s * 0.18, 0.28, -0.02]);
  b.bola(0.1, '#ffffff', [0.6, 1.1, 0.6], [0, 0.42, -0.18], { papel: 'cauda', rot: [-0.5, 0, 0] });
  b.grupo([0, 0.5, 0.12], 'cabeca');
  b.bola(0.13, '#ffffff', [1, 1, 1], [0, 0, 0]);
  for (const [y, z] of [
    [0.13, 0.04],
    [0.15, -0.03],
    [0.13, -0.09],
  ])
    b.bola(0.045, '#ff5a4a', [1, 1, 1], [0, y, z]);
  b.bola(0.04, '#ff9b2f', [0.9, 0.7, 1.3], [0, -0.01, 0.14]);
  b.bola(0.035, '#ff5a4a', [0.7, 1.3, 0.7], [0, -0.09, 0.11]);
  b.olhos(0.03, 0.09, 0.07, 0.033, { bochecha: false });
  return b.fim().pecas;
}

/** Cachorro do sítio: caramelo escuro, orelhas caídas, focinho clarinho e coleira azul. */
function cachorro(): PecaCriatura[] {
  const corpo = '#8a5a3a';
  const escuro = '#5a3a26';
  const b = bicho(1.2);
  for (const [x, z] of [
    [-0.14, 0.18],
    [0.14, 0.18],
    [-0.14, -0.18],
    [0.14, -0.18],
  ])
    b.caixa([0.15, 0.22, 0.15], [x, 0.11, z], escuro, 0.07, {
      papel: DIAGONAL[`${Math.sign(x)},${Math.sign(z)}`],
    });
  b.caixa([0.42, 0.3, 0.6], [0, 0.34, 0], corpo, 0.14);
  b.bola(0.06, corpo, [1, 1, 2.6], [0, 0.5, -0.36], { papel: 'cauda', rot: [-0.7, 0, 0] });
  b.caixa([0.4, 0.06, 0.12], [0, 0.47, 0.22], '#4a6fd8', 0.03);
  b.bola(0.035, '#ffd45a', [1, 1, 0.5], [0, 0.42, 0.29]);
  b.grupo([0, 0.62, 0.32], 'cabeca');
  b.caixa([0.44, 0.38, 0.38], [0, 0, 0], corpo, 0.15);
  b.caixa([0.26, 0.17, 0.18], [0, -0.07, 0.2], '#f4e2c4', 0.07);
  b.bola(0.05, '#2a1f3a', [1.2, 0.9, 1], [0, -0.02, 0.3]);
  b.bola(0.04, '#ff8fa3', [0.9, 0.5, 1.2], [0, -0.15, 0.27]);
  for (const s of [-1, 1])
    b.caixa([0.1, 0.24, 0.08], [s * 0.22, 0.02, 0], escuro, 0.04, { rot: [0, 0, s * 0.35] });
  b.olhos(0.06, 0.19, 0.1, 0.05);
  return b.fim().pecas;
}

/** Tilápia do açude: prateada, barriga clarinha, barbatanas e boquinha. */
function tilapia(): PecaCriatura[] {
  const cor = '#a9b8c6';
  const b = bicho(0.8);
  b.grupo([0, 0.24, 0], undefined);
  b.bola(0.22, cor, [1, 0.75, 1.4], [0, 0, 0]);
  b.bola(0.16, '#e6edf3', [0.9, 0.5, 1.2], [0, -0.07, 0.02]);
  // listrinhas fracas nas costas
  for (const z of [-0.12, 0.02]) b.bola(0.05, '#93a3b3', [1.9, 0.5, 0.45], [0, 0.11, z]);
  b.caixa([0.04, 0.2, 0.16], [0, 0.02, -0.33], cor, 0.02, { papel: 'cauda', rot: [0.5, 0, 0] });
  b.caixa([0.04, 0.2, 0.16], [0, -0.02, -0.33], cor, 0.02, { papel: 'cauda', rot: [-0.5, 0, 0] });
  b.caixa([0.03, 0.1, 0.14], [0, 0.17, -0.02], '#93a3b3', 0.015);
  for (const s of [-1, 1])
    b.bola(0.05, '#c4d0db', [0.3, 0.6, 1], [s * 0.19, -0.05, 0.08], { rot: [0, s * 0.5, 0] });
  b.olhos(0.04, 0.18, 0.11, 0.04, { bochecha: false });
  b.bola(0.03, '#c0563a', [1.2, 0.6, 0.6], [0, -0.04, 0.3]);
  return b.fim().pecas;
}

/**
 * Coruja curiosa (a criatura da noite, mansa): ovinho marrom de barriga clara, tufinhos de
 * orelha, olhões amarelos que brilham no escuro, bochechas e asinhas que batem.
 */
function coruja(): PecaCriatura[] {
  const b = bicho(1.6);
  // voa baixinho: os pés ficam um pouco acima do chão
  b.grupo([0, 0.12, 0], undefined);
  b.bola(0.26, '#b88a5a', [1, 1.15, 0.95], [0, 0.32, 0]);
  b.bola(0.17, '#f4e0b8', [1, 1.1, 0.6], [0, 0.27, 0.12]);
  // pintinhas da barriga
  for (const [x, y] of [
    [-0.06, 0.3],
    [0.06, 0.3],
    [0, 0.22],
    [-0.08, 0.17],
    [0.08, 0.17],
  ])
    b.bola(0.018, '#c9a274', [1.4, 1, 0.4], [x, y, 0.215]);
  b.bola(0.12, '#9a6a44', [0.4, 0.9, 1], [0.25, 0.3, -0.02], { papel: 'asa0' });
  b.bola(0.12, '#9a6a44', [0.4, 0.9, 1], [-0.25, 0.3, -0.02], { papel: 'asa1' });
  b.caixa([0.05, 0.05, 0.08], [0.07, 0.025, 0.05], '#ff9b2f', 0.02, { papel: 'perna0' });
  b.caixa([0.05, 0.05, 0.08], [-0.07, 0.025, 0.05], '#ff9b2f', 0.02, { papel: 'perna1' });
  b.grupo([0, 0.12, 0], 'cabeca');
  for (const s of [-1, 1]) {
    b.bola(0.05, '#9a6a44', [1, 1.5, 0.8], [s * 0.14, 0.64, 0], { rot: [0, 0, s * -0.3] });
    // olhão amarelo que brilha (de dia, amarelo-sol; de noite, a luz própria da criatura)
    b.bola(0.09, '#ffe27a', [1, 1, 0.4], [s * 0.09, 0.46, 0.2], { brilho: 0.55 });
    b.bola(0.045, '#2a1f3a', [1, 1, 0.4], [s * 0.09, 0.46, 0.235], { brilho: 0.2 });
    b.bola(0.016, '#ffffff', [1, 1, 0.4], [s * 0.09 + 0.017, 0.48, 0.252], { brilho: 0.5 });
    b.bola(0.035, '#ff9aa8', [1.4, 0.75, 0.3], [s * 0.17, 0.38, 0.19]);
  }
  b.bola(0.035, '#ff9b2f', [1, 1.2, 0.8], [0, 0.39, 0.235]);
  return b.fim().pecas;
}

/**
 * Bichos do Rancho Alegre (mesmas caixas de colisão do jogo base), desenhados à mão como no
 * esboço aprovado: vaca, galinha, cachorro do sítio, tilápia e a coruja curiosa da noite.
 */
export const CRIATURAS_RANCHO: Record<TipoCriatura, PecaCriatura[]> = {
  cervo: vaca(),
  coelho: galinha(),
  peixe: tilapia(),
  espectro: coruja(),
  raposa: cachorro(),
};

export const MOVIMENTO_RANCHO: Record<TipoCriatura, MovimentoCriatura> = {
  // a vaca anda pesadona, balançando de leve
  cervo: { saltita: 0.015, flutua: 0, ginga: 0.07 },
  // a galinha cisca rebolando
  coelho: { saltita: 0.08, flutua: 0, ginga: 0.22 },
  peixe: { saltita: 0, flutua: 0, ginga: 0.1 },
  // a coruja paira batendo as asinhas
  espectro: { saltita: 0, flutua: 0.08, ginga: 0.08 },
  // o cachorro trota feliz
  raposa: { saltita: 0.05, flutua: 0, ginga: 0.06 },
};
