/**
 * Esboço da spec 014 (Cidade Grande) com o motor de verdade. Só roda com `?esboco=cidade`:
 * o `main.ts` importa este arquivo sob demanda, então ele vira um pedaço à parte que o jogo
 * nunca baixa. Nada aqui é a cidade de verdade (essa vem nas tarefas da spec); é um palco
 * para as capturas do esboço (`e2e/esboco-cidade.spec.ts`).
 *
 * - Texturas PROVISÓRIAS: lãs que o palco não usa são repintadas no estilo do atlas (asfalto,
 *   faixa, zebra, pedra marrom, janela, pedra creme, friso dourado) e o cristal-luz vira a
 *   janela acesa de noite. Os blocos novos de verdade (ids 84 em diante) entram na T02.
 * - Peças de brinquedo PROVISÓRIAS (o plástico do jogo, `criarPlasticos`): blocos fantasmas,
 *   táxi e ônibus, toldos, escada de incêndio, tapume, placa, capacete, confete e o horizonte.
 */
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera';
import { tema } from '../temas/ativo';
import type { Pintor, Px } from '../temas/tipos';
import { hash2 } from '../world/noise';
import { Bloco } from '../world/blocks';
import { caixaArredondada, cilindro, criarPlasticos, esfera } from '../render/formas';

// ------------------------------------------------------------------ texturas provisórias
const rgb = (h: string): [number, number, number] => {
  const n = parseInt(h.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const com = (h: string, f = 1): Px => {
  const [r, g, b] = rgb(h);
  return [r * f, g * f, b * f, 255];
};
const grao =
  (cores: string[]): Pintor =>
  (x, y, s) => {
    const t = hash2(x, y, s) * 0.6 + hash2(x >> 2, y >> 2, s + 9) * 0.4;
    return com(cores[Math.min(cores.length - 1, Math.floor(t * cores.length))]);
  };
const asfalto = grao(['#36383e', '#3d3f46', '#44464d', '#3a3c42']);
const PINTORES_ESBOCO: Record<string, Pintor> = {
  // asfalto (lã preta)
  la_preta: asfalto,
  // faixa amarela tracejada (lã amarela): asfalto com um traço no meio
  la_amarela: (x, y, s) =>
    x >= 5 && x <= 10 && y >= 5 && y <= 10 ? com('#f1c232') : asfalto(x, y, s),
  // zebra da faixa de pedestre (lã branca)
  la_branca: (x, y, s) =>
    (x >> 2) % 2 === 0 ? com('#f0efe9', 0.97 + hash2(x, y, s) * 0.03) : asfalto(x, y, s),
  // pedra marrom das casas geminadas (lã roxa), com junta a cada 8
  la_roxa: (x, y, s) =>
    y % 8 === 7 || (x + (y >> 3) * 4) % 16 === 15
      ? com('#5a3424')
      : grao(['#734430', '#7b4a35', '#82503a'])(x, y, s),
  // janela grande (lã azul): moldura creme, vidro azul com reflexo, travessa no meio
  la_azul: (x, y) => {
    if (x <= 1 || x >= 14 || y <= 1 || y >= 14 || x === 7 || x === 8) return com('#efe6d2');
    return x + y < 11 ? com('#bfe4f6') : com('#7fb9db');
  },
  // pedra creme do art déco (lã laranja)
  la_laranja: (x, y, s) =>
    y % 8 === 7 ? com('#cdbb98') : grao(['#e6d7b8', '#eadcbf', '#e0cfad'])(x, y, s),
  // friso dourado (lã verde), com chevron
  la_verde: (x, y) => ((Math.abs(x - 7.5) + y) % 6 < 2 ? com('#b8892c') : com('#d8aa45')),
  // janela acesa (cristal-luz, que já brilha no mapa emissivo)
  cristal: (x, y) => {
    if (x <= 1 || x >= 14 || y <= 1 || y >= 14 || x === 7 || x === 8) return com('#d9c9a4');
    return com(x + y < 11 ? '#ffe7a3' : '#ffcf5e');
  },
};

/** Antes da cena: repinta os tiles provisórios no tema ativo (o atlas lê `tema().pintores`). */
export function prepararEsbocoCidade(): void {
  const t = tema();
  Object.assign(t.pintores, PINTORES_ESBOCO);
  const esperar = () => {
    const e = window.__brumaluz;
    if (e?.ready && e.cenaBabylon) ligar(e.cenaBabylon() as Scene);
    else setTimeout(esperar, 200);
  };
  esperar();
}

// ------------------------------------------------------------------ o palco
type Lote = { x: number; y: number; z: number; v: number }[];

interface EsbocoCidade {
  /** Monta a cidade em volta de onde o jogador está (devolve a origem e o chão). */
  montar(): { ox: number; oz: number; y: number };
  /** Câmera fixa (ou null para voltar a do jogo). */
  camera(
    pos: [number, number, number] | null,
    alvo?: [number, number, number],
    fovGraus?: number,
  ): void;
  /** Canteiro: 0 só fantasmas, 1 metade, 2 pronto com festa. */
  canteiro(fase: 0 | 1 | 2): void;
  noite(ligada: boolean): void;
  /** Põe a criança (o jogador) num lugar, olhando para um ponto, com a colher na mão. */
  crianca(x: number, z: number, olhar: [number, number], colher?: boolean): void;
  pontos: Record<string, [number, number, number]>;
}

declare global {
  interface Window {
    __esboco?: EsbocoCidade;
  }
}

function ligar(scene: Scene): void {
  const e = window.__brumaluz!;
  const pl = criarPlasticos(scene, 'esboco');
  const lote: Lote = [];
  const por = (x: number, y: number, z: number, b: number, meta = 0) => {
    if (!soPecas) lote.push({ x, y, z, v: b | (meta << 8) });
  };
  const enviar = () => {
    e.editarLote!(lote.splice(0));
  };
  let O = { ox: 0, oz: 0, y: 64 };
  const janelas: [number, number, number][] = [];
  const pecas: Mesh[] = [];
  // as peças só nascem depois que as edições de bloco foram (criadas antes, elas sumiam do
  // desenho); na primeira passada as construções só põem blocos
  let soBlocos = false;
  let soPecas = false;
  const FALSO = {
    position: { set() {}, copyFrom() {} },
    rotation: {},
    scaling: { set() {} },
  } as unknown as Mesh;
  const peca = (m: Mesh) => {
    if (m === FALSO) return m;
    m.receiveShadows = true;
    pecas.push(m);
    return m;
  };
  const cil = (...a: Parameters<typeof cilindro>) => (soBlocos ? FALSO : cilindro(...a));
  const esf = (...a: Parameters<typeof esfera>) => (soBlocos ? FALSO : esfera(...a));
  const caixa = (
    nome: string,
    w: number,
    h: number,
    d: number,
    cor: string,
    x: number,
    y: number,
    z: number,
    r = 0.08,
    alfa = 1,
  ) => {
    if (soBlocos) return FALSO;
    const m = caixaArredondada(
      nome,
      scene,
      w,
      h,
      d,
      Math.min(r, w / 2, h / 2, d / 2),
      pl.cor(cor, 0.3, alfa),
      3,
    );
    m.position.set(x, y, z);
    return peca(m);
  };

  // ---------------------------------------------------------------- construções em blocos
  /** Casa geminada (frente para +z ou -z), 7 de largura. */
  function geminada(x0: number, z0: number, andares: number, frente: 1 | -1, caixaDagua: boolean) {
    const w = 7,
      d = 9,
      H = andares * 4,
      Y = O.y + 1;
    const zf = frente === 1 ? z0 + d - 1 : z0;
    for (let y = 0; y < H; y++)
      for (let x = x0; x < x0 + w; x++)
        for (let z = z0; z < z0 + d; z++) {
          const borda = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
          if (!borda && y > 0) continue;
          let b: number = y === 0 && !borda ? Bloco.TABUAS : Bloco.LA_ROXA;
          const k = y % 4;
          const dx = x - x0;
          if (
            z === zf &&
            y >= 4 &&
            (k === 2 || k === 3) &&
            (dx === 1 || dx === 2 || dx === 4 || dx === 5)
          ) {
            b = Bloco.LA_AZUL;
            if (!soPecas) janelas.push([x, Y + y, z]);
          }
          if (z === zf && y === 1 && (dx === 1 || dx === 5)) b = Bloco.LA_AZUL;
          por(x, Y + y, z, b);
        }
    // porta no andar de cima da escadinha
    por(x0 + 3, Y + 2, zf, Bloco.PORTA);
    por(x0 + 3, Y + 3, zf, Bloco.PORTA);
    por(x0 + 3, Y + 1, zf, Bloco.LA_ROXA);
    // escadinha de pedra (provisória: laje e pedra lisa)
    por(x0 + 3, Y + 1, zf + frente, Bloco.LAJE);
    por(x0 + 3, Y, zf + frente, Bloco.PEDRA_LISA);
    por(x0 + 3, Y, zf + 2 * frente, Bloco.LAJE);
    // cornija e parapeito
    for (let x = x0; x < x0 + w; x++) por(x, Y + H, zf, Bloco.LAJE);
    for (let x = x0; x < x0 + w; x++) por(x, Y + H - 1, zf + frente, Bloco.LAJE);
    if (caixaDagua) tanque(x0 + 2, Y + H, z0 + 3);
    // corrimão da escadinha (peça)
    caixa(
      'corrimao',
      0.08,
      0.08,
      2.2,
      '#2b2e35',
      x0 + 2.55,
      Y + 1.35,
      zf + frente * 1.4 + 0.5,
      0.03,
    );
    caixa(
      'corrimao',
      0.08,
      0.08,
      2.2,
      '#2b2e35',
      x0 + 4.45,
      Y + 1.35,
      zf + frente * 1.4 + 0.5,
      0.03,
    );
  }
  /** Caixa d'água de madeira no telhado: pernas de cerca, barril de tábuas e chapéu. */
  function tanque(x0: number, y0: number, z0: number) {
    for (const [dx, dz] of [
      [0, 0],
      [2, 0],
      [0, 2],
      [2, 2],
    ])
      por(x0 + dx, y0, z0 + dz, Bloco.CERCA);
    for (let k = 1; k <= 3; k++)
      for (let dx = 0; dx < 3; dx++)
        for (let dz = 0; dz < 3; dz++)
          por(x0 + dx, y0 + k, z0 + dz, k === 2 ? Bloco.TABUAS_PINHO : Bloco.TABUAS);
    const tampa = cil('tampa-caixa', scene, 1.1, 1.7, 0.15, pl.cor('#7a5532', 0.2));
    tampa.position.set(x0 + 1.5, y0 + 4.55, z0 + 1.5);
    peca(tampa);
  }
  /** Prédio de tijolo de 5 andares com padaria de toldo e escada de incêndio (frente +z). */
  function tijolo(x0: number, z0: number) {
    const w = 12,
      d = 10,
      H = 20,
      Y = O.y + 1;
    const zf = z0 + d - 1;
    for (let y = 0; y < H; y++)
      for (let x = x0; x < x0 + w; x++)
        for (let z = z0; z < z0 + d; z++) {
          const borda = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1;
          if (!borda && y > 0) continue;
          let b: number = Bloco.TIJOLOS;
          const dx = x - x0,
            k = y % 4;
          if (z === zf && y >= 4 && (k === 1 || k === 2) && dx % 3 !== 0) {
            b = Bloco.LA_AZUL;
            if (!soPecas) janelas.push([x, Y + y, z]);
          }
          if (z === zf && y < 3 && y > 0 && dx >= 1 && dx <= 7)
            b = y === 1 || y === 2 ? Bloco.LA_AZUL : b;
          por(x, Y + y, z, b);
        }
    por(x0 + 9, Y + 1, zf, Bloco.PORTA);
    por(x0 + 9, Y + 2, zf, Bloco.PORTA);
    for (let x = x0; x < x0 + w; x++) por(x, Y + H, zf, Bloco.LAJE);
    tanque(x0 + 7, Y + H, z0 + 3);
    // toldo listrado da padaria
    for (let k = 0; k < 8; k++)
      caixa(
        'toldo',
        1.0,
        0.14,
        1.5,
        k % 2 ? '#f5f1e6' : '#d8433a',
        x0 + 1.5 + k,
        Y + 3.25,
        zf + 1.6,
        0.05,
      ).rotation.x = -0.35;
    // placa da padaria: um pão de brinquedo
    const pao = esf('pao', scene, 0.45, pl.cor('#c98a3e', 0.35), [1.6, 0.7, 0.9]);
    pao.position.set(x0 + 10.6, Y + 3.6, zf + 1.1);
    peca(pao);
    // escada de incêndio de grade (do 2º andar ao telhado)
    const ferro = '#2b2e35';
    for (let a = 1; a < 5; a++) {
      const y = Y + a * 4;
      caixa('patamar', 7.2, 0.12, 1.2, ferro, x0 + 5.2, y - 0.02, zf + 1.1, 0.03);
      caixa('grade', 7.2, 0.07, 0.07, ferro, x0 + 5.2, y + 0.95, zf + 1.68, 0.02);
      for (let k = 0; k <= 7; k++)
        caixa('balaustre', 0.06, 0.95, 0.06, ferro, x0 + 1.7 + k, y + 0.48, zf + 1.68, 0.02);
      if (a < 4) {
        // lance de escada entre um patamar e o de cima, encostado na fachada
        const esc = caixa(
          'escada-incendio',
          4.9,
          0.1,
          0.5,
          ferro,
          x0 + (a % 2 ? 7.2 : 3.4),
          y + 2,
          zf + 0.9,
          0.02,
        );
        esc.rotation.z = a % 2 ? 0.68 : -0.68;
        for (let k = -2; k <= 2; k++) {
          const d = caixa('degrau', 0.08, 0.06, 0.5, '#4a4f58', 0, 0, 0, 0.01);
          d.parent = esc;
          d.position.set(k * 0.9, 0.07, 0);
        }
      }
    }
  }
  /** Esquina art déco de 6 andares, topo em degraus (frente +z, lado +x). */
  function deco(x0: number, z0: number) {
    const w = 11,
      d = 11,
      H = 24,
      Y = O.y + 1;
    const zf = z0 + d - 1,
      xf = x0 + w - 1;
    for (let y = 0; y < H; y++)
      for (let x = x0; x < x0 + w; x++)
        for (let z = z0; z < z0 + d; z++) {
          const borda = x === x0 || x === xf || z === z0 || z === zf;
          if (!borda && y > 0) continue;
          const k = y % 4;
          const dx = x - x0,
            dz = z - z0;
          let b: number = k === 0 && y > 0 ? Bloco.LA_VERDE : Bloco.LA_LARANJA;
          const fachada =
            (z === zf && dx % 3 !== 0 && dx > 0 && dx < w - 1) ||
            (x === xf && dz % 3 !== 0 && dz > 0 && dz < d - 1);
          if (y >= 4 && (k === 1 || k === 2 || k === 3) && fachada) {
            b = Bloco.LA_AZUL;
            if (!soPecas) janelas.push([x, Y + y, z]);
          }
          if (y >= 1 && y <= 2 && fachada) b = Bloco.LA_AZUL;
          por(x, Y + y, z, b);
        }
    por(xf, Y + 1, zf - 2, Bloco.PORTA);
    por(xf, Y + 2, zf - 2, Bloco.PORTA);
    // degraus do topo
    let y = Y + H;
    for (const [o, h] of [
      [1, 3],
      [2, 3],
      [3, 3],
    ] as const) {
      for (let k = 0; k < h; k++)
        for (let x = x0 + o; x <= xf - o; x++)
          for (let z = z0 + o; z <= zf - o; z++) {
            const borda = x === x0 + o || x === xf - o || z === z0 + o || z === zf - o;
            if (!borda && k < h - 1) continue;
            por(x, y + k, z, k === h - 1 ? Bloco.LA_VERDE : Bloco.LA_LARANJA);
          }
      y += h;
    }
    por(x0 + 5, y, z0 + 5, Bloco.LA_VERDE);
    por(x0 + 5, y + 1, z0 + 5, Bloco.LA_VERDE);
    const ponta = cil('agulha', scene, 2.4, 0.12, 0.02, pl.cor('#e2b752', 0.6));
    ponta.position.set(x0 + 5.5, y + 3.2, z0 + 5.5);
    peca(ponta);
    // toldos verdes na frente e no lado
    for (let k = 1; k < w - 1; k++)
      caixa(
        'toldo',
        1.0,
        0.14,
        1.4,
        k % 2 ? '#f5f1e6' : '#3f8f5a',
        x0 + k + 0.5,
        Y + 3.25,
        zf + 1.55,
        0.05,
      ).rotation.x = -0.35;
    for (let k = 1; k < d - 3; k++) {
      const t = caixa(
        'toldo',
        1.4,
        0.14,
        1.0,
        k % 2 ? '#f5f1e6' : '#3f8f5a',
        xf + 1.55,
        Y + 3.25,
        z0 + k + 0.5,
        0.05,
      );
      t.rotation.z = 0.35;
    }
  }
  const globos: Mesh[] = [];
  function poste(x: number, z: number, lado: 1 | -1) {
    const Y = O.y + 1;
    const ferro = '#2b2e35';
    const haste = cil('poste', scene, 3.8, 0.09, 0.07, pl.cor(ferro, 0.4));
    haste.position.set(x + 0.5, Y + 1.9, z + 0.5);
    peca(haste);
    caixa('poste-braco', 0.1, 0.1, 0.9, ferro, x + 0.5, Y + 3.8, z + 0.5 + lado * 0.4, 0.03);
    const g = esf('poste-globo', scene, 0.24, pl.cor('#fff4cf', 0.6));
    g.position.set(x + 0.5, Y + 3.58, z + 0.5 + lado * 0.8);
    peca(g);
    globos.push(g);
  }
  function arvore(x: number, z: number, folha: number) {
    const Y = O.y + 1;
    for (let k = 0; k < 4; k++) por(x, Y + k, z, Bloco.MADEIRA_RETORCIDA);
    for (let dx = -2; dx <= 2; dx++)
      for (let dz = -2; dz <= 2; dz++)
        for (let k = 3; k <= 5; k++) {
          if (Math.abs(dx) + Math.abs(dz) + Math.abs(k - 4) > 3) continue;
          if (dx === 0 && dz === 0 && k < 4) continue;
          por(x + dx, Y + k, z + dz, folha);
        }
  }

  // ---------------------------------------------------------------- obras
  type Cel = [number, number, number, number];
  const casinhaCachorro = (): Cel[] => {
    const c: Cel[] = [];
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 3; x++)
        for (let z = 0; z < 3; z++) {
          if (!(x === 0 || x === 2 || z === 0 || z === 2)) continue;
          if (z === 2 && x === 1) continue;
          c.push([x, y, z, Bloco.TABUAS]);
        }
    for (let x = 0; x < 3; x++) for (let z = 0; z < 3; z++) c.push([x, 2, z, Bloco.LA_VERMELHA]);
    return c;
  };
  const pontoOnibus = (): Cel[] => {
    const c: Cel[] = [];
    for (let y = 0; y < 3; y++) {
      c.push([0, y, 1, Bloco.CERCA]);
      c.push([3, y, 1, Bloco.CERCA]);
      c.push([1, y, 1, Bloco.VIDRO]);
      c.push([2, y, 1, Bloco.VIDRO]);
    }
    for (let x = 0; x < 4; x++) for (let z = 0; z < 2; z++) c.push([x, 3, z, Bloco.LAJE]);
    c.push([1, 0, 0, Bloco.LAJE]);
    c.push([2, 0, 0, Bloco.LAJE]);
    return c;
  };
  const sorveteria = (): Cel[] => {
    const c: Cel[] = [];
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 4; x++)
        for (let z = 0; z < 4; z++) {
          if (!(x === 0 || x === 3 || z === 0 || z === 3)) continue;
          if (z === 0 && x === 2 && y < 2) continue;
          const vitrine = y === 1 && ((z === 0 && x === 1) || (x === 3 && (z === 1 || z === 2)));
          c.push([x, y, z, vitrine ? Bloco.LA_AZUL : Bloco.TABUAS_BETULA]);
        }
    for (let x = 0; x < 4; x++)
      for (let z = 0; z < 4; z++)
        c.push([x, 3, z, (x + z) % 2 ? Bloco.LA_VERMELHA : Bloco.TABUAS_BETULA]);
    return c;
  };

  const pontos: Record<string, [number, number, number]> = {};
  let canteiroOrigem: [number, number, number] = [0, 0, 0];
  const fantasmas: Mesh[] = [];
  const festa: Mesh[] = [];
  const obraCasinha = casinhaCachorro().sort((a, b) => a[1] - b[1]);
  const matFantasma = pl.cor('#5aa7ff', 0.5, 0.42);
  let pulsoT = 0;
  let quadro = 0;
  scene.onBeforeRenderObservable.add(() => {
    if (quadro++ % 10 === 0)
      for (const n of scene.transformNodes)
        if (/^criatura-\d+$/.test(n.name) && n.isEnabled()) n.setEnabled(false);
    pulsoT += scene.getEngine().getDeltaTime() / 1000;
    const camadaBaixa = Math.min(
      ...fantasmas.filter((f) => f.isEnabled()).map((f) => f.metadata as number),
      99,
    );
    for (const f of fantasmas)
      if (f.isEnabled())
        f.visibility = f.metadata === camadaBaixa ? 0.6 + 0.4 * Math.sin(pulsoT * 4) : 0.55;
  });

  function canteiro(fase: 0 | 1 | 2) {
    const [cx, cy, cz] = canteiroOrigem;
    for (const f of fantasmas) f.dispose();
    fantasmas.length = 0;
    for (const m of festa) m.dispose();
    festa.length = 0;
    const cheios =
      fase === 0 ? 0 : fase === 1 ? Math.floor(obraCasinha.length * 0.55) : obraCasinha.length;
    obraCasinha.forEach(([x, y, z, b], i) => {
      if (i < cheios) por(cx + x, cy + y, cz + z, b);
      else {
        por(cx + x, cy + y, cz + z, Bloco.AR);
        const f = caixaArredondada('fantasma', scene, 0.96, 0.96, 0.96, 0.1, matFantasma, 3);
        f.position.set(cx + x + 0.5, cy + y + 0.5, cz + z + 0.5);
        f.metadata = y;
        fantasmas.push(f);
      }
    });
    enviar();
    // tapume e andaime só com a obra aberta
    tapume.forEach((m) => m.setEnabled(fase < 2));
    if (fase === 2) {
      // placa com o nome de quem fez
      const tex = new DynamicTexture('placa-obra', { width: 256, height: 128 }, scene, true);
      const g = tex.getContext() as unknown as CanvasRenderingContext2D;
      g.fillStyle = '#fffaf0';
      g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#3b2a1e';
      g.font = '700 30px sans-serif';
      g.textAlign = 'center';
      g.fillText('Feita por', 128, 52);
      g.fillText('Ana e Léo', 128, 96);
      tex.update();
      const mp = new StandardMaterial('placa-obra', scene);
      mp.diffuseTexture = tex;
      mp.emissiveColor = new Color3(0.55, 0.55, 0.55);
      mp.specularColor = Color3.Black();
      const placa = MeshBuilder.CreatePlane('placa-obra', { width: 1.6, height: 0.8 }, scene);
      placa.material = mp;
      placa.position.set(cx + 4.4, cy + 1.6, cz + 3.05);
      placa.rotation.y = Math.PI;
      festa.push(placa);
      const poste1 = caixa(
        'poste-placa',
        0.12,
        1.3,
        0.12,
        '#7a5532',
        cx + 3.75,
        cy + 0.65,
        cz + 3.1,
        0.03,
      );
      const poste2 = caixa(
        'poste-placa',
        0.12,
        1.3,
        0.12,
        '#7a5532',
        cx + 5.05,
        cy + 0.65,
        cz + 3.1,
        0.03,
      );
      festa.push(poste1, poste2);
      // confete de pecinhas
      const cores = ['#f4c20d', '#d94848', '#4c9a5c', '#2f6fb5', '#f28b2c', '#f7a8c4', '#ffffff'];
      for (let i = 0; i < 140; i++) {
        const c = caixa(
          'confete',
          0.14,
          0.03,
          0.09,
          cores[i % cores.length],
          cx - 1 + hash2(i, 1, 7) * 6,
          cy + 0.6 + hash2(i, 2, 7) * 4.2,
          cz - 1 + hash2(i, 3, 7) * 6,
          0.01,
        );
        c.rotation.set(hash2(i, 4, 7) * 6, hash2(i, 5, 7) * 6, hash2(i, 6, 7) * 6);
        festa.push(c);
      }
    }
  }
  const tapume: Mesh[] = [];

  // ---------------------------------------------------------------- veículos de brinquedo
  function roda(x: number, y: number, z: number) {
    const r = cil('roda', scene, 0.32, 0.4, 0.4, pl.cor('#202127', 0.15));
    r.rotation.x = Math.PI / 2;
    r.position.set(x, y, z);
    const c = cil('calota', scene, 0.34, 0.17, 0.17, pl.cor('#c9ccd2', 0.6));
    c.rotation.x = Math.PI / 2;
    c.position.set(x, y, z);
    peca(r);
    peca(c);
  }
  /** Táxi ao longo de x (frente para +x se dir = 1). */
  function taxi(x: number, z: number, dir: 1 | -1) {
    const y = O.y + 1;
    caixa('taxi', 3.7, 0.75, 1.8, '#f4c20d', x, y + 0.75, z, 0.18);
    caixa('taxi-cabine', 2.0, 0.7, 1.62, '#9fd2ee', x - dir * 0.25, y + 1.42, z, 0.14);
    caixa('taxi-teto', 2.1, 0.14, 1.7, '#f4c20d', x - dir * 0.25, y + 1.8, z, 0.06);
    caixa('taxi-luz', 0.6, 0.22, 0.3, '#fff6c8', x - dir * 0.25, y + 1.97, z, 0.06);
    caixa('taxi-xadrez', 3.72, 0.12, 1.82, '#2b2e35', x, y + 0.85, z, 0.04);
    caixa('farol', 0.08, 0.2, 0.35, '#fff1a8', x + dir * 1.86, y + 0.82, z - 0.55, 0.04);
    caixa('farol', 0.08, 0.2, 0.35, '#fff1a8', x + dir * 1.86, y + 0.82, z + 0.55, 0.04);
    for (const dx of [-1.15, 1.15]) for (const dz of [-0.85, 0.85]) roda(x + dx, y + 0.4, z + dz);
  }
  function onibus(x: number, z: number) {
    const y = O.y + 1;
    caixa('onibus', 7.8, 1.0, 1.95, '#2f6fb5', x, y + 0.9, z, 0.18);
    caixa('onibus-vidros', 7.7, 0.85, 1.9, '#9fd2ee', x, y + 1.85, z, 0.12);
    for (let k = 0; k < 7; k++)
      caixa('coluna', 0.12, 0.86, 1.96, '#f2f2ee', x - 3.6 + k * 1.2, y + 1.85, z, 0.03);
    caixa('onibus-teto', 7.8, 0.45, 1.95, '#f2f2ee', x, y + 2.5, z, 0.16);
    caixa('porta-onibus', 0.9, 1.6, 0.06, '#cfd8e3', x + 2.4, y + 1.3, z + 0.99, 0.03);
    for (const dx of [-2.6, 2.6]) for (const dz of [-0.95, 0.95]) roda(x + dx, y + 0.4, z + dz);
  }

  // ---------------------------------------------------------------- horizonte ao longe
  let horizonte: Mesh[] = [];
  let matHorizonte: StandardMaterial | null = null;
  let texJanelas: DynamicTexture | null = null;
  function montarHorizonte(cx: number, cz: number) {
    matHorizonte = new StandardMaterial('horizonte', scene);
    matHorizonte.fogEnabled = false;
    matHorizonte.specularColor = Color3.Black();
    matHorizonte.diffuseColor = Color3.FromHexString('#1e2832');
    texJanelas = new DynamicTexture('horizonte-janelas', { width: 128, height: 256 }, scene, true);
    matHorizonte.emissiveColor = Color3.FromHexString('#c6d8e6');
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2 + hash2(i, 0, 3) * 0.08;
      const r = 250 + hash2(i, 1, 3) * 70;
      const h = 55 + hash2(i, 2, 3) * 110;
      const w = 14 + hash2(i, 3, 3) * 16;
      const b = MeshBuilder.CreateBox('torre', { width: w, depth: w, height: h }, scene);
      b.position.set(cx + Math.cos(a) * r, O.y + h / 2 - 4, cz + Math.sin(a) * r);
      b.rotation.y = -a;
      b.material = matHorizonte;
      b.isPickable = false;
      horizonte.push(b);
      if (hash2(i, 4, 3) > 0.55) {
        const t = MeshBuilder.CreateBox(
          'torre-topo',
          { width: w * 0.55, depth: w * 0.55, height: 16 },
          scene,
        );
        t.position.set(b.position.x, O.y + h + 4, b.position.z);
        t.rotation.y = -a;
        t.material = matHorizonte;
        horizonte.push(t);
      }
    }
  }
  const janelinhas: Mesh[] = [];
  function corHorizonte(noite: boolean) {
    if (noite && !janelinhas.length) {
      const mat = new StandardMaterial('horizonte-janelinha', scene);
      mat.disableLighting = true;
      mat.fogEnabled = false;
      mat.emissiveColor = Color3.FromHexString('#ffd46a');
      mat.backFaceCulling = false;
      for (const t of horizonte) {
        const bb = t.getBoundingInfo().boundingBox;
        const ext = bb.extendSize;
        const dir = t.position
          .subtract(new Vector3(O.ox + 60, t.position.y, O.oz + 40))
          .normalize();
        for (let i = 0; i < 26; i++) {
          if (hash2(i, Math.round(t.position.x), 4) < 0.45) continue;
          const j = MeshBuilder.CreatePlane('janelinha', { size: 1.6 }, scene);
          j.material = mat;
          const lado = (hash2(i, 2, Math.round(t.position.z)) - 0.5) * ext.x * 1.6;
          const alt = (hash2(i, 3, Math.round(t.position.x)) - 0.5) * ext.y * 1.8;
          j.position.set(
            t.position.x - dir.x * (ext.x + 0.2) - dir.z * lado,
            t.position.y + alt,
            t.position.z - dir.z * (ext.x + 0.2) + dir.x * lado,
          );
          j.lookAt(new Vector3(O.ox + 60, j.position.y, O.oz + 40));
          j.rotation.y += Math.PI;
          janelinhas.push(j);
        }
      }
    }
    if (!matHorizonte || !texJanelas) return;
    matHorizonte.emissiveColor = Color3.FromHexString(noite ? '#22204a' : '#c2d5e4');
    matHorizonte.diffuseColor = Color3.FromHexString(noite ? '#000000' : '#1e2832');
    if (noite) {
      const g = texJanelas.getContext() as unknown as CanvasRenderingContext2D;
      g.fillStyle = '#3a3866';
      g.fillRect(0, 0, 128, 256);
      for (let i = 0; i < 260; i++) {
        if (hash2(i, 9, 1) < 0.5) continue;
        g.fillStyle = '#ffd46a';
        g.fillRect(
          Math.floor(hash2(i, 1, 1) * 30) * 4 + 1,
          Math.floor(hash2(i, 2, 1) * 62) * 4 + 1,
          2,
          2,
        );
      }
      texJanelas.update();
    }
    for (const j of janelinhas) j.setEnabled(noite);
  }

  // ---------------------------------------------------------------- montar tudo
  function montar() {
    const eb = e.bloco!;
    // chão: o primeiro sólido de cima para baixo no meio do palco
    const [px, , pz] = e.posicao!;
    const ox = Math.floor(px) - 60;
    const oz = Math.floor(pz) - 40;
    const W = 120,
      D = 80,
      M = 22;
    // chão do palco: a mediana das alturas do terreno (sem contar árvore)
    const arvoreOuMato = new Set<number>([
      Bloco.FOLHAGEM,
      Bloco.FOLHAS_BETULA,
      Bloco.FOLHAS_PINHO,
      Bloco.FOLHAS_LANTERNA,
      Bloco.FOLHAS_OUTONO,
      Bloco.MADEIRA_RETORCIDA,
      Bloco.TRONCO_BETULA,
      Bloco.TRONCO_PINHO,
      Bloco.TRONCO_LANTERNA,
      Bloco.GRAMA_ALTA,
      Bloco.FLOR,
      Bloco.ARBUSTO_FRUTINHAS,
      Bloco.NEVE,
    ]);
    const alturas: number[] = [];
    for (let x = ox; x < ox + W; x += 4)
      for (let z = oz; z < oz + D; z += 4)
        for (let y = 120; y > 1; y--) {
          const b = eb(x, y, z);
          if (b && !arvoreOuMato.has(b)) {
            alturas.push(y);
            break;
          }
        }
    alturas.sort((a, b) => a - b);
    const Y = Math.max(63, alturas[Math.floor(alturas.length / 2)] ?? 64);
    O = { ox, oz, y: Y };
    // aplaina: o que está acima sai, o que falta embaixo vira terra (com margem de grama)
    for (let x = ox - M; x < ox + W + M; x++)
      for (let z = oz - M; z < oz + D + M; z++) {
        for (let y = Y + 1; y < Math.min(127, Y + 70); y++) if (eb(x, y, z)) por(x, y, z, Bloco.AR);
        for (let y = Y - 1; y > Y - 30; y--) {
          const b = eb(x, y, z);
          if (b && b !== Bloco.AGUA && !arvoreOuMato.has(b)) break;
          por(x, y, z, Bloco.TERRA);
        }
        por(x, Y, z, Bloco.TERRA_MUSGOSA);
      }
    let pox = 0,
      poz = 0,
      sox = 0,
      soz = 0;
    const construir = () => {
      const L = (x: number, z: number) => [ox + x, oz + z] as const;
      const chao = (x0: number, z0: number, w: number, d: number, b: number) => {
        for (let x = x0; x < x0 + w; x++)
          for (let z = z0; z < z0 + d; z++) por(ox + x, Y, oz + z, b);
      };
      // avenida (leste-oeste): calçada 28..31, asfalto 32..35, calçada 36..39
      chao(0, 28, W, 4, Bloco.PEDRA_LISA);
      chao(0, 32, W, 4, Bloco.LA_PRETA);
      chao(0, 36, W, 4, Bloco.PEDRA_LISA);
      for (let x = 0; x < W; x += 4) {
        por(ox + x, Y, oz + 33, Bloco.LA_AMARELA);
        por(ox + x + 1, Y, oz + 33, Bloco.LA_AMARELA);
      }
      // rua (norte-sul): calçada 60, asfalto 61..64, calçada 65
      chao(59, 0, 1, D, Bloco.PEDRA_LISA);
      chao(60, 0, 1, D, Bloco.PEDRA_LISA);
      chao(61, 0, 4, D, Bloco.LA_PRETA);
      chao(65, 0, 2, D, Bloco.PEDRA_LISA);
      for (let z = 0; z < D; z += 4)
        if (z < 28 || z > 39) {
          por(ox + 62, Y, oz + z, Bloco.LA_AMARELA);
          por(ox + 62, Y, oz + z + 1, Bloco.LA_AMARELA);
        }
      chao(61, 32, 4, 4, Bloco.LA_PRETA);
      // zebras em volta do cruzamento
      chao(57, 32, 2, 4, Bloco.LA_BRANCA);
      chao(67, 32, 2, 4, Bloco.LA_BRANCA);
      chao(61, 29, 4, 2, Bloco.LA_BRANCA);
      chao(61, 37, 4, 2, Bloco.LA_BRANCA);
      // quadra norte: casas geminadas, prédio de tijolo, praça e a esquina art déco
      chao(0, 16, 59, 12, Bloco.PEDRA_LISA);
      geminada(ox + 2, oz + 19, 4, 1, true);
      geminada(ox + 9, oz + 19, 3, 1, false);
      geminada(ox + 16, oz + 19, 4, 1, true);
      tijolo(ox + 24, oz + 18);
      geminada(ox + 37, oz + 19, 3, 1, false);
      arvore(ox + 46, oz + 24, Bloco.FOLHAS_OUTONO);
      deco(ox + 48, oz + 17);
      // parque grande do outro lado da rua
      chao(67, 0, W - 67, 28, Bloco.TERRA_MUSGOSA);
      for (let x = 88; x < 104; x++)
        for (let z = 6; z < 20; z++) {
          const dx = (x - 96) / 8,
            dz = (z - 13) / 7;
          if (dx * dx + dz * dz < 1) {
            por(ox + x, Y, oz + z, Bloco.AGUA);
            por(ox + x, Y - 1, oz + z, Bloco.AGUA);
          }
        }
      chao(67, 24, W - 67, 2, Bloco.CASCALHO);
      chao(78, 0, 2, 24, Bloco.CASCALHO);
      for (const [x, z, f] of [
        [72, 8, Bloco.FOLHAS_OUTONO],
        [72, 18, Bloco.FOLHAGEM],
        [84, 4, Bloco.FOLHAGEM],
        [108, 6, Bloco.FOLHAS_OUTONO],
        [110, 18, Bloco.FOLHAGEM],
        [86, 21, Bloco.FOLHAGEM],
        [100, 23, Bloco.FOLHAS_OUTONO],
      ] as const)
        arvore(ox + x, oz + z, f);
      // quadra sul: canteiro, ponto de ônibus, sorveteria e mais casas
      chao(0, 40, 59, 40, Bloco.PEDRA_LISA);
      chao(0, 58, 59, 22, Bloco.TERRA_MUSGOSA);
      geminada(ox + 1, oz + 41, 3, -1, true);
      geminada(ox + 44, oz + 41, 4, -1, false);
      geminada(ox + 51, oz + 41, 3, -1, true);
      for (const [x, z, f] of [
        [8, 66, Bloco.FOLHAGEM],
        [30, 68, Bloco.FOLHAS_OUTONO],
        [48, 64, Bloco.FOLHAGEM],
      ] as const)
        arvore(ox + x, oz + z, f);
      chao(16, 42, 11, 9, Bloco.TERRA);
      canteiroOrigem = [ox + 20, Y + 1, oz + 45];
      [pox, poz] = L(10, 37);
      for (const [x, y, z, b] of pontoOnibus()) por(pox + x, Y + 1 + y, poz + z, b);
      [sox, soz] = L(38, 42);
      for (const [x, y, z, b] of sorveteria()) por(sox + x, Y + 1 + y, soz + z, b);
      for (let k = 0; k < 4; k++)
        caixa(
          'toldo',
          1.0,
          0.14,
          1.3,
          k % 2 ? '#fff5f8' : '#f08fb4',
          sox + k + 0.5,
          Y + 3.3,
          soz - 0.45,
          0.05,
        ).rotation.x = 0.35;
      const casquinha = cil('casquinha', scene, 0.9, 0.08, 0.32, pl.cor('#d9a35b', 0.3));
      casquinha.position.set(sox + 2, Y + 5.0, soz + 2);
      casquinha.rotation.x = Math.PI;
      peca(casquinha);
      const bola = esf('bola-sorvete', scene, 0.4, pl.cor('#f7a8c4', 0.5));
      bola.position.set(sox + 2, Y + 5.6, soz + 2);
      peca(bola);
      // placa do ponto: um ônibus desenhado (sem palavras)
      caixa('placa-ponto-poste', 0.1, 2.6, 0.1, '#2b2e35', pox - 0.6, Y + 2.3, poz + 0.3, 0.03);
      caixa('placa-ponto', 0.75, 0.75, 0.08, '#2f6fb5', pox - 0.6, Y + 3.5, poz + 0.3, 0.1);
      caixa('placa-ponto-desenho', 0.45, 0.25, 0.1, '#f2f2ee', pox - 0.6, Y + 3.5, poz + 0.3, 0.05);
      geminada(ox + 66, oz + 40, 3, -1, true);
      geminada(ox + 73, oz + 40, 4, -1, false);
      geminada(ox + 80, oz + 40, 3, -1, true);
      geminada(ox + 87, oz + 40, 4, -1, false);
      chao(66, 40, 54, 40, Bloco.PEDRA_LISA);
      // postes nas calçadas
      for (let x = 4; x < W; x += 12) {
        if (x > 54 && x < 70) continue;
        poste(ox + x, oz + 31, 1);
        poste(ox + x, oz + 36, -1);
      }
    };
    soBlocos = true;
    construir();
    soBlocos = false;
    enviar();
    const [cx, cy, cz] = canteiroOrigem;
    pontos.canteiro = [cx, cy, cz];
    pontos.zebra = [ox + 58, Y + 1, oz + 35];
    pontos.ponto = [pox, Y + 1, poz];
    pontos.sorveteria = [sox, Y + 1, soz];
    pontos.geminada = [ox + 2, Y + 1, oz + 19];
    pontos.deco = [ox + 48, Y + 1, oz + 17];
    pontos.origem = [ox, Y, oz];
    setTimeout(() => {
      soPecas = true;
      construir();
      soPecas = false;
      // tapume (laranja e branco) em volta do canteiro, com uma passagem na frente
      for (let k = 0; k < 9; k++) {
        tapume.push(
          caixa(
            'tapume',
            0.98,
            1.1,
            0.12,
            k % 2 ? '#f5f1e6' : '#f28b2c',
            cx - 3 + k + 0.5,
            cy + 0.55,
            cz - 2,
            0.04,
          ),
        );
        if (k < 7)
          tapume.push(
            caixa(
              'tapume',
              0.12,
              1.1,
              0.98,
              k % 2 ? '#f5f1e6' : '#f28b2c',
              cx - 3,
              cy + 0.55,
              cz - 1.5 + k + 0.5,
              0.04,
            ),
          );
      }
      // andaime de tábuas ao lado da obra
      for (const ax of [0.1, 2.9])
        for (const az of [-1.25, -0.35])
          tapume.push(
            caixa('andaime', 0.09, 3.0, 0.09, '#9a6634', cx + ax, cy + 1.5, cz + az, 0.03),
          );
      for (const ay of [1.05, 2.1])
        tapume.push(caixa('andaime', 3.0, 0.1, 1.0, '#c3894a', cx + 1.5, cy + ay, cz - 0.8, 0.03));
      tapume.push(
        caixa('andaime', 3.0, 0.07, 0.07, '#9a6634', cx + 1.5, cy + 2.95, cz - 1.25, 0.02),
      );
      canteiro(0);
      // veículos parados
      taxi(ox + 30, oz + 35, 1);
      onibus(ox + 14, oz + 33);
      taxi(ox + 54.6, oz + 35, 1);
      taxi(ox + 63, oz + 50, -1);
      montarHorizonte(ox + 60, oz + 40);
      // o pedreiro (morador construtor) ao lado da obra, de capacete amarelo
      const antes = new Set(scene.meshes);
      const [mx, mz] = [cx - 1.6, cz + 3.4];
      e.estatua!('morador', mx, cy, mz, Math.PI / 2 + 0.6, { profissao: 'construtor', n: 2 });
      setTimeout(() => {
        const novas = scene.meshes.filter((m) => !antes.has(m));
        // o chapéu do morador do tema sai; o capacete fica no alto da cabeça
        let cabeca = cy + 1.2;
        let chapeu: Mesh | null = null;
        let larg = 0;
        for (const m of novas) {
          if (!/morador/.test(m.name)) continue;
          m.computeWorldMatrix(true);
          const topo = m.getBoundingInfo().boundingBox.maximumWorld.y;
          if (/cabeca/.test(m.name) && topo > larg) {
            larg = topo;
            chapeu = m as Mesh;
          }
        }
        // o chapéu do tema é a peça da cabeça que chega mais alto; sai, e o capacete fica no
        // alto do que sobrou (cabelo e cabeça)
        if (chapeu) chapeu.setEnabled(false);
        for (const m of novas)
          if (m !== chapeu && /morador.*cabeca/.test(m.name))
            cabeca = Math.max(cabeca, m.getBoundingInfo().boundingBox.maximumWorld.y);
        const casco = esf('capacete', scene, 0.3, pl.cor('#ffcc1a', 0.55), [1.05, 0.7, 1.05]);
        casco.position.set(mx, cabeca - 0.02, mz);
        const aba = cil('capacete-aba', scene, 0.05, 0.42, 0.42, pl.cor('#ffcc1a', 0.55));
        aba.position.set(mx, cabeca - 0.1, mz);
        peca(casco);
        peca(aba);
      }, 600);
    }, 2500);
    return O;
  }

  // ---------------------------------------------------------------- câmera, noite, criança
  let fixa: { p: Vector3; a: Vector3 } | null = null;
  scene.onBeforeCameraRenderObservable.add((cam) => {
    if (!fixa) return;
    const c = cam as TargetCamera;
    c.position.copyFrom(fixa.p);
    c.setTarget(fixa.a);
    c.maxZ = 900;
    // a escolha do que entra no desenho usa a vista do quadro: refaz com a câmera nova
    c.getViewMatrix(true);
    scene.updateTransformMatrix(true);
  });
  let colher: Mesh[] = [];
  let matAcesa: StandardMaterial | null = null;
  const acesa = () => {
    if (!matAcesa) {
      matAcesa = new StandardMaterial('globo-aceso', scene);
      matAcesa.disableLighting = true;
      matAcesa.emissiveColor = Color3.FromHexString('#ffe7a0');
    }
    return matAcesa;
  };
  const api: EsbocoCidade = {
    montar,
    pontos,
    canteiro: (f) => {
      canteiro(f);
      if (f === 2)
        e.estatua!(
          'raposa',
          canteiroOrigem[0] + 1.5,
          canteiroOrigem[1],
          canteiroOrigem[2] + 3.4,
          Math.PI,
          undefined,
        );
    },
    camera(pos, alvo, fov) {
      fixa = pos && alvo ? { p: new Vector3(...pos), a: new Vector3(...alvo) } : null;
      if (fov && scene.activeCamera) scene.activeCamera.fov = (fov * Math.PI) / 180;
    },
    noite(ligada) {
      e.pausarDia = true;
      e.hora = ligada ? 0.97 : 0.4;
      for (const [x, y, z] of janelas)
        if (hash2(x * 3 + y, z, 5) < 0.3) por(x, y, z, ligada ? Bloco.CRISTAL_LUZ : Bloco.LA_AZUL);
      enviar();
      for (const g of globos) g.material = ligada ? acesa() : pl.cor('#fff4cf', 0.6);
      corHorizonte(ligada);
    },
    crianca(x, z, olhar, comColher = true) {
      e.teleportar!(x, z, O.y + 1);
      const yaw = Math.atan2(olhar[0] - x, olhar[1] - z);
      e.apontar!(yaw, 0.15);
      for (const m of colher) m.dispose();
      colher = [];
      if (!comColher) return;
      e.selecionarSlot!(8);
      e.inventario!.definir(8, null);
      const pega = scene.getTransformNodeByName('personagem-pega');
      if (!pega) return;
      const cabo = cil('colher-cabo', scene, 0.5, 0.07, 0.07, pl.cor('#8a5a2b', 0.3));
      cabo.parent = pega;
      cabo.position.set(0, 0, 0);
      const lamina = caixaArredondada(
        'colher-lamina',
        scene,
        0.06,
        0.62,
        0.44,
        0.02,
        pl.cor('#d7dbe2', 0.9),
        2,
      );
      lamina.parent = pega;
      lamina.position.set(0, 0.55, 0.02);
      colher = [cabo, lamina];
    },
  };
  window.__esboco = api;
}
