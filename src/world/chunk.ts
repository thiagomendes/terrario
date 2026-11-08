import type { EstiloMundo, FormaArvore } from '../temas/tipos';
import {
  ajusteDaColuna,
  FORMAS_PADRAO,
  planoDaRegiao,
  planoSemBloqueio,
  REGIAO_POVOADO,
  type PlanoPovoado,
  type TerrenoNatural,
  versaoDosPovoados,
} from './povoado';
import { construirPovoado } from './construcoes';
import { Bloco } from './blocks';
import { crista2, fbm2, hash2, hash3, ruido3 } from './noise';

export const TAM_X = 16;
export const TAM_Z = 16;
export const ALTURA = 128;
export const SEMENTE_PADRAO = 1337;
/** Nível do mar: água preenche colunas abaixo dele. */
export const NIVEL_MAR = 62;
/** Compatibilidade: antigo nível dos lagos. */
export const NIVEL_LAGO = NIVEL_MAR;

/** Estilo do tema (só forma: árvores, estrutura, crateras, flora). Padrão = Bruma e Luz. */
export const ESTILO_PADRAO: EstiloMundo = {
  arvores: {},
  estrutura: 'ruina',
  crateras: 0,
  flora: 1,
};
let estilo: EstiloMundo = ESTILO_PADRAO;

/** Define o estilo do mundo (thread principal e workers, antes de gerar qualquer chunk). */
export function definirEstiloMundo(e: EstiloMundo): void {
  estilo = e;
}

export function estiloMundo(): EstiloMundo {
  return estilo;
}

export type Bioma =
  | 'oceano'
  | 'praia'
  | 'floresta'
  | 'campos'
  | 'deserto'
  | 'taiga'
  | 'montanhas'
  | 'pantano';

export const NOMES_BIOMA: Record<Bioma, string> = {
  oceano: 'Oceano',
  praia: 'Praia',
  floresta: 'Floresta',
  campos: 'Campos floridos',
  deserto: 'Deserto',
  taiga: 'Taiga nevada',
  montanhas: 'Montanhas',
  pantano: 'Pântano bioluminescente',
};

export function indice(x: number, y: number, z: number): number {
  return (y * TAM_Z + z) * TAM_X + x;
}

interface Clima {
  temperatura: number;
  umidade: number;
  continente: number;
  montanha: number;
}

function clima(wx: number, wz: number, semente: number): Clima {
  return {
    temperatura: fbm2(wx / 300 + 40, wz / 300, semente + 101, 3),
    umidade: fbm2(wx / 260, wz / 260 + 70, semente + 202, 3),
    continente: Math.min(
      1,
      Math.max(0, (fbm2(wx / 420, wz / 420, semente + 303, 4) - 0.5) * 1.7 + 0.56),
    ),
    montanha: crista2(wx / 160, wz / 160, semente + 404, 4),
  };
}

/** Altura do terreno (y do bloco de superfície). */
/** Altura do terreno com os povoados aplainados (o que o jogo de fato gera). */
export function alturaTerreno(wx: number, wz: number, semente: number): number {
  const natural = alturaNatural(wx, wz, semente);
  const p = povoadosLigados ? povoadoNaColuna(wx, wz, semente) : null;
  if (!p) return natural;
  return ajusteDaColuna(p, wx, wz, natural)?.h ?? natural;
}

/** Terreno natural, sem povoados (é o que o planejamento do povoado consulta). */
export const TERRENO_NATURAL: TerrenoNatural = {
  altura: (wx, wz, s) => alturaNatural(wx, wz, s),
  bioma: (wx, wz, s, h) => biomaEm(wx, wz, s, h),
  nivelMar: NIVEL_MAR,
  nascimento: (s) => encontrarNascimento(s),
  get planta() {
    return estilo.povoado?.planta ?? 'vila';
  },
};

let povoadosLigados = true;
/** Liga ou desliga os povoados (o teste de paridade com o jogo antigo desliga). */
export function definirPovoados(ligado: boolean): void {
  povoadosLigados = ligado;
}

/** Povoado que alcança a coluna, com memória da última região consultada (rápido por coluna). */
let ultimaRegiao = '';
let ultimoPlano: PlanoPovoado | null = null;
export function povoadoNaColuna(wx: number, wz: number, semente: number): PlanoPovoado | null {
  const rx = Math.floor(wx / REGIAO_POVOADO);
  const rz = Math.floor(wz / REGIAO_POVOADO);
  const k = `${rx},${rz},${semente},${versaoDosPovoados()},${TERRENO_NATURAL.planta}`;
  if (k !== ultimaRegiao) {
    ultimaRegiao = k;
    ultimoPlano = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
  }
  const p = ultimoPlano;
  if (!p || wx < p.minX || wx > p.maxX || wz < p.minZ || wz > p.maxZ) return null;
  return p;
}

function alturaNatural(wx: number, wz: number, semente: number): number {
  const c = clima(wx, wz, semente);
  const colinas = fbm2(wx / 48, wz / 48, semente, 4);
  const detalhe = fbm2(wx / 11, wz / 11, semente + 7, 2);
  // continente: abaixo de ~0.36 vira mar
  const base = 36 + Math.min(1, Math.max(0, (c.continente - 0.12) / 0.42)) * 32;
  let h = base + colinas * 12 + detalhe * 3;
  const m = Math.max(0, c.montanha - 0.55) / 0.45;
  h += m * m * 52 * Math.min(1, Math.max(0, (c.continente - 0.38) / 0.15));
  // pântanos são baixos e planos
  if (c.umidade > 0.62 && c.temperatura > 0.38) h = Math.min(h, NIVEL_MAR + 2 + detalhe * 2);
  // crateras somem aos poucos perto do mar (sem degrau na curva de nível nem fundo alagado)
  if (estilo.crateras > 0) {
    const perto = Math.min(1, Math.max(0, (h - (NIVEL_MAR + 1)) / 6));
    if (perto > 0) h += relevoCrateras(wx, wz, semente, estilo.crateras) * perto;
  }
  return Math.floor(Math.min(ALTURA - 14, h));
}

/** Plantas só de enfeite, que o estilo `flora` do tema pode rarear. */
const DECORATIVAS: ReadonlySet<number> = new Set([
  Bloco.GRAMA_ALTA,
  Bloco.FLOR,
  Bloco.JUNCO,
  Bloco.ARBUSTO_SECO,
]);

/** Tamanho da célula de crateras (uma cratera no máximo por célula). */
const CELULA_CRATERA = 56;

/**
 * Crateras de impacto: tigela rebaixada com borda levantada. Cada célula de 56 blocos
 * pode ter uma, com centro e raio sorteados; as células vizinhas também contam.
 */
export function relevoCrateras(wx: number, wz: number, semente: number, forca: number): number {
  const gx = Math.floor(wx / CELULA_CRATERA);
  const gz = Math.floor(wz / CELULA_CRATERA);
  let d = 0;
  for (let j = -1; j <= 1; j++)
    for (let i = -1; i <= 1; i++) {
      const cx = gx + i;
      const cz = gz + j;
      if (hash2(cx, cz, semente + 8801) > 0.55 * forca + 0.1) continue;
      const r = 6 + hash2(cx, cz, semente + 8802) * 16;
      const ox = (cx + 0.2 + hash2(cx, cz, semente + 8803) * 0.6) * CELULA_CRATERA;
      const oz = (cz + 0.2 + hash2(cx, cz, semente + 8804) * 0.6) * CELULA_CRATERA;
      const q = Math.hypot(wx - ox, wz - oz) / r;
      if (q > 1.5) continue;
      const fundo = r * 0.32;
      if (q < 1) d -= fundo * (1 - q * q);
      d += r * 0.12 * Math.exp(-(((q - 1) / 0.2) ** 2));
    }
  return d;
}

export function biomaEm(wx: number, wz: number, semente: number, h?: number): Bioma {
  const altura = h ?? alturaTerreno(wx, wz, semente);
  const c = clima(wx, wz, semente);
  if (altura < NIVEL_MAR - 1) return 'oceano';
  if (altura >= 90) return 'montanhas';
  if (c.temperatura < 0.36) return 'taiga';
  if (c.temperatura > 0.6 && c.umidade < 0.42) return 'deserto';
  if (c.umidade > 0.62 && c.temperatura > 0.38) return 'pantano';
  if (altura <= NIVEL_MAR + 1) return 'praia';
  if (c.umidade < 0.44) return 'campos';
  return 'floresta';
}

/** Densidade de cavernas numa grade de 4 em 4 blocos, interpolada. */
function grade3(
  cx: number,
  cz: number,
  semente: number,
  f: (x: number, y: number, z: number) => number,
) {
  const nx = TAM_X / 4 + 1;
  const ny = ALTURA / 4 + 1;
  const nz = TAM_Z / 4 + 1;
  const g = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++)
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++)
        g[(j * nz + k) * nx + i] = f(cx * TAM_X + i * 4, j * 4, cz * TAM_Z + k * 4);
  return (x: number, y: number, z: number) => {
    const fx = x / 4;
    const fy = y / 4;
    const fz = z / 4;
    const i = Math.min(nx - 2, Math.floor(fx));
    const j = Math.min(ny - 2, Math.floor(fy));
    const k = Math.min(nz - 2, Math.floor(fz));
    const tx = fx - i;
    const ty = fy - j;
    const tz = fz - k;
    const v = (a: number, b: number, c: number) => g[((j + b) * nz + (k + c)) * nx + (i + a)];
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(
      l(l(v(0, 0, 0), v(1, 0, 0), tx), l(v(0, 1, 0), v(1, 1, 0), tx), ty),
      l(l(v(0, 0, 1), v(1, 0, 1), tx), l(v(0, 1, 1), v(1, 1, 1), tx), ty),
      tz,
    );
  };
}

function superficie(b: Bioma, y: number, h: number): number {
  const topo = y === h;
  switch (b) {
    case 'deserto':
      return y >= h - 3 ? Bloco.AREIA_DESERTO : Bloco.ARENITO;
    case 'praia':
    case 'oceano':
      return y >= h - 3
        ? b === 'oceano' && h < NIVEL_MAR - 6
          ? Bloco.CASCALHO
          : Bloco.AREIA_BRUMA
        : Bloco.PEDRA_RACHADA;
    case 'taiga':
      return topo ? Bloco.TERRA_NEVADA : Bloco.TERRA;
    case 'pantano':
      return topo ? Bloco.MUSGO_PANTANO : Bloco.LAMA;
    case 'montanhas':
      if (h >= 104) return topo ? Bloco.NEVE : Bloco.PEDRA_RACHADA;
      return topo && h < 96 ? Bloco.TERRA_MUSGOSA : Bloco.PEDRA_RACHADA;
    default:
      return topo ? Bloco.TERRA_MUSGOSA : Bloco.TERRA;
  }
}

function minerioEm(wx: number, y: number, wz: number, s: number): number {
  const bx = Math.floor(wx / 2);
  const by = Math.floor(y / 2);
  const bz = Math.floor(wz / 2);
  const r = hash3(bx, by, bz, s + 900);
  const forma = hash3(wx, y, wz, s + 901) < 0.65;
  if (!forma) return Bloco.PEDRA_RACHADA;
  if (y < 18 && r < 0.004) return Bloco.MINERIO_LUZITA;
  if (y < 30 && r < 0.012) return Bloco.MINERIO_OURO;
  if (y < 60 && r < 0.03) return Bloco.MINERIO_FERRO;
  if (y > 25 && y < 85 && r < 0.045) return Bloco.MINERIO_COBRE;
  if (r < 0.075) return Bloco.MINERIO_CARVAO;
  return Bloco.PEDRA_RACHADA;
}

export function gerarChunk(cx: number, cz: number, semente: number = SEMENTE_PADRAO): Uint8Array {
  const blocos = new Uint8Array(TAM_X * ALTURA * TAM_Z);
  const alturas = new Int32Array(TAM_X * TAM_Z);
  /** 1 = piso do povoado (sem plantas), 2 = dentro da área do povoado (sem árvores). */
  const ocupadas = new Uint8Array(TAM_X * TAM_Z);
  const biomas: Bioma[] = [];
  const tuneis = grade3(cx, cz, semente, (x, y, z) =>
    ruido3(x / 22, y / 13, z / 22, semente + 1001),
  );
  const tuneis2 = grade3(cx, cz, semente, (x, y, z) =>
    ruido3(x / 22, y / 13, z / 22, semente + 1002),
  );
  const salas = grade3(cx, cz, semente, (x, y, z) =>
    ruido3(x / 34, y / 18, z / 34, semente + 1003),
  );

  for (let z = 0; z < TAM_Z; z++) {
    for (let x = 0; x < TAM_X; x++) {
      const wx = cx * TAM_X + x;
      const wz = cz * TAM_Z + z;
      const natural = alturaNatural(wx, wz, semente);
      const plano = povoadosLigados ? povoadoNaColuna(wx, wz, semente) : null;
      const ajuste = plano ? ajusteDaColuna(plano, wx, wz, natural) : null;
      const h = ajuste?.h ?? natural;
      alturas[z * TAM_X + x] = h;
      ocupadas[z * TAM_X + x] = ajuste?.ocupada ? 1 : plano ? 2 : 0;
      const b = biomaEm(wx, wz, semente, h);
      biomas.push(b);
      const solo = b === 'deserto' ? 6 : 4;
      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0 || (y <= 2 && hash3(wx, y, wz, semente + 5) < 0.5)) id = Bloco.ROCHA_MATRIZ;
        else if (y === h && ajuste?.piso) id = ajuste.piso;
        else if (y > h - solo) id = superficie(b, y, h);
        else id = minerioEm(wx, y, wz, semente);
        // cavernas: túneis (cruzamento de duas superfícies) e salões no fundo
        if (id !== Bloco.ROCHA_MATRIZ && y > 3) {
          // embaixo do povoado o chão é firme (nenhum buraco abre sob as casas)
          const proteger = plano ? y > h - 10 : h <= NIVEL_MAR + 3 ? y > h - 8 : y > h - 1;
          if (!proteger) {
            const a = Math.abs(tuneis(x, y, z) - 0.5);
            const c = Math.abs(tuneis2(x, y, z) - 0.5);
            const sala = y < 48 && salas(x, y, z) > 0.7;
            if ((a < 0.045 && c < 0.045) || sala) id = Bloco.AR;
          }
        }
        blocos[indice(x, y, z)] = id;
      }
      // água até o nível do mar (gelo em cima na taiga)
      for (let y = h + 1; y <= NIVEL_MAR; y++) {
        blocos[indice(x, y, z)] = b === 'taiga' && y === NIVEL_MAR ? Bloco.GELO : Bloco.AGUA;
      }
    }
  }

  // cristais no chão das cavernas
  for (let z = 0; z < TAM_Z; z++)
    for (let x = 0; x < TAM_X; x++) {
      const wx = cx * TAM_X + x;
      const wz = cz * TAM_Z + z;
      for (let y = 4; y < alturas[z * TAM_X + x] - 3; y++) {
        if (blocos[indice(x, y, z)] !== Bloco.AR) continue;
        const abaixo = blocos[indice(x, y - 1, z)];
        if (
          abaixo === Bloco.AR ||
          abaixo === Bloco.AGUA ||
          abaixo === Bloco.CRISTAL_LUZ ||
          abaixo === Bloco.COGUMELO_BRILHANTE
        )
          continue;
        const r = hash3(wx, y, wz, semente + 77);
        if (r < 0.012) blocos[indice(x, y, z)] = Bloco.CRISTAL_LUZ;
        else if (r < 0.03) blocos[indice(x, y, z)] = Bloco.COGUMELO_BRILHANTE;
      }
    }

  // vegetação e árvores na superfície
  for (let z = 0; z < TAM_Z; z++) {
    for (let x = 0; x < TAM_X; x++) {
      const wx = cx * TAM_X + x;
      const wz = cz * TAM_Z + z;
      const h = alturas[z * TAM_X + x];
      const b = biomas[z * TAM_X + x];
      const topo = h + 1;
      if (h < NIVEL_MAR || topo >= ALTURA - 12) continue;
      const chao = blocos[indice(x, h, z)];
      if (chao === Bloco.AR || chao === Bloco.AGUA || chao === Bloco.GELO) continue;
      // piso do povoado: nada nasce; na área dele (rampas), plantas sim, árvores não
      const oc = ocupadas[z * TAM_X + x];
      if (oc === 1) continue;
      const r = hash2(wx, wz, semente + 5);
      const r2 = hash2(wx, wz, semente + 9);
      const margem = oc === 0 && x >= 2 && x < TAM_X - 2 && z >= 2 && z < TAM_Z - 2;
      // flora do tema: parte das plantas some (Lua: quase nada); árvores e cactos ficam
      const pos = (id: number) => {
        // só plantas de enfeite somem; comida e luz (frutinhas, abóbora, cogumelo,
        // cristal) ficam em todo tema: a mecânica é a mesma
        if (estilo.flora < 1 && DECORATIVAS.has(id) && hash2(wx, wz, semente + 13) > estilo.flora)
          return;
        blocos[indice(x, topo, z)] = id;
      };
      const arv = (tronco: number, folha: number, padrao: () => void) =>
        plantarArvore(blocos, x, h, z, r2, b, tronco, folha, padrao);
      switch (b) {
        case 'floresta':
          if (margem && r < 0.03) {
            if (r2 < 0.3)
              arv(Bloco.TRONCO_BETULA, Bloco.FOLHAS_BETULA, () =>
                arvoreBetula(blocos, x, h, z, r2),
              );
            else if (r2 > 0.93)
              arv(Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAS_OUTONO, () =>
                arvoreCarvalho(blocos, x, h, z, r2, Bloco.FOLHAS_OUTONO),
              );
            else
              arv(Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAGEM, () =>
                arvoreCarvalho(blocos, x, h, z, r2, Bloco.FOLHAGEM),
              );
          } else if (r < 0.25) pos(Bloco.GRAMA_ALTA);
          else if (r < 0.28) pos(Bloco.FLOR);
          else if (r < 0.295) pos(Bloco.ARBUSTO_FRUTINHAS);
          else if (r < 0.305) pos(Bloco.COGUMELO_BRILHANTE);
          else if (r > 0.9985) pos(Bloco.CRISTAL_LUZ);
          break;
        case 'campos':
          if (margem && r < 0.004)
            arv(Bloco.MADEIRA_RETORCIDA, Bloco.FOLHAGEM, () =>
              arvoreCarvalho(blocos, x, h, z, r2, Bloco.FOLHAGEM),
            );
          else if (r < 0.3) pos(Bloco.GRAMA_ALTA);
          else if (r < 0.4) pos(Bloco.FLOR);
          else if (r < 0.402) pos(Bloco.ABOBORA);
          break;
        case 'taiga':
          if (margem && r < 0.035)
            arv(Bloco.TRONCO_PINHO, Bloco.FOLHAS_PINHO, () => arvorePinho(blocos, x, h, z, r2));
          else if (r < 0.06) pos(Bloco.GRAMA_ALTA);
          else if (r < 0.07) pos(Bloco.ARBUSTO_FRUTINHAS);
          break;
        case 'deserto':
          if (r < 0.006) {
            const alt = 1 + Math.floor(r2 * 3);
            for (let i = 0; i < alt; i++) blocos[indice(x, topo + i, z)] = Bloco.CACTO;
          } else if (r < 0.014) pos(Bloco.ARBUSTO_SECO);
          break;
        case 'pantano':
          if (margem && r < 0.02)
            arv(Bloco.TRONCO_LANTERNA, Bloco.FOLHAS_LANTERNA, () =>
              arvoreLanterna(blocos, x, h, z, r2),
            );
          else if (r < 0.12) pos(Bloco.JUNCO);
          else if (r < 0.2) pos(Bloco.GRAMA_ALTA);
          else if (r < 0.24) pos(Bloco.COGUMELO_BRILHANTE);
          else if (r > 0.997) pos(Bloco.CRISTAL_LUZ);
          break;
        case 'montanhas':
          if (chao === Bloco.TERRA_MUSGOSA && margem && r < 0.01)
            arv(Bloco.TRONCO_PINHO, Bloco.FOLHAS_PINHO, () => arvorePinho(blocos, x, h, z, r2));
          else if (chao === Bloco.TERRA_MUSGOSA && r < 0.15) pos(Bloco.GRAMA_ALTA);
          break;
        case 'praia':
          if (chao !== Bloco.AREIA_BRUMA && r < 0.1) pos(Bloco.GRAMA_ALTA);
          break;
        default:
          break;
      }
    }
  }
  // povoado da região, se alcançar este chunk (e então sem ruína)
  const plano = povoadosLigados
    ? planoDaRegiao(
        Math.floor((cx * TAM_X) / REGIAO_POVOADO),
        Math.floor((cz * TAM_Z) / REGIAO_POVOADO),
        semente,
        TERRENO_NATURAL,
      )
    : null;
  const x0 = cx * TAM_X;
  const z0 = cz * TAM_Z;
  const tocaPlano =
    !!plano &&
    plano.maxX >= x0 &&
    plano.minX < x0 + TAM_X &&
    plano.maxZ >= z0 &&
    plano.minZ < z0 + TAM_Z;
  if (plano && tocaPlano) {
    construirPovoado(plano, estilo.povoado ?? FORMAS_PADRAO, (wx, y, wz, id) => {
      const x = wx - x0;
      const z = wz - z0;
      if (x < 0 || x >= TAM_X || z < 0 || z >= TAM_Z || y < 1 || y >= ALTURA) return;
      blocos[indice(x, y, z)] = id;
    });
  } else construirRuina(blocos, cx, cz, semente, alturas, biomas);
  return blocos;
}

/** Ruína rara: paredes quebradas, piso e um baú com tesouro no centro. */
function construirRuina(
  blocos: Uint8Array,
  cx: number,
  cz: number,
  semente: number,
  alturas: Int32Array,
  biomas: Bioma[],
): void {
  if (hash2(cx, cz, semente + 6060) > 0.035) return;
  const c = 8 * TAM_X + 8;
  const b = biomas[c];
  if (b === 'oceano' || b === 'praia' || b === 'pantano' || b === 'montanhas') return;
  const h = alturas[c];
  if (h <= NIVEL_MAR + 1 || h > ALTURA - 20) return;
  const parede = b === 'deserto' ? Bloco.ARENITO : Bloco.TIJOLOS_PEDRA;
  const resto = b === 'deserto' ? Bloco.AREIA_DESERTO : Bloco.PEDREGULHO;
  if (estilo.estrutura !== 'ruina') {
    construirEstrutura(blocos, h, semente, parede, resto, estilo.estrutura);
    return;
  }
  for (let dz = -3; dz <= 3; dz++)
    for (let dx = -3; dx <= 3; dx++) {
      const x = 8 + dx;
      const z = 8 + dz;
      // piso nivelado
      blocos[indice(x, h, z)] = hash2(x, z, semente + 61) < 0.3 ? resto : Bloco.PEDRA_LISA;
      for (let y = h + 1; y < h + 5; y++) blocos[indice(x, y, z)] = Bloco.AR;
      const borda = Math.abs(dx) === 3 || Math.abs(dz) === 3;
      if (!borda) continue;
      const alt = Math.floor(hash2(x, z, semente + 62) * 4);
      for (let y = 1; y <= alt; y++) {
        const r = hash2(x * 7 + y, z, semente + 63);
        blocos[indice(x, h + y, z)] = r < 0.25 ? resto : r < 0.3 ? Bloco.FOLHAGEM : parede;
      }
    }
  blocos[indice(8, h + 1, 8)] = Bloco.BAU;
  blocos[indice(6, h + 1, 6)] = Bloco.COGUMELO_BRILHANTE;
}

/**
 * Estruturas raras dos temas: o mesmo terreno aplainado, os mesmos blocos (parede,
 * resto, pedra lisa, folhagem), o baú no centro e um cogumelo de luz — só o desenho muda.
 */
function construirEstrutura(
  blocos: Uint8Array,
  h: number,
  semente: number,
  parede: number,
  resto: number,
  forma: Exclude<EstiloMundo['estrutura'], 'ruina'>,
): void {
  const em = (x: number, y: number, z: number, id: number) => {
    if (x < 0 || x >= TAM_X || z < 0 || z >= TAM_Z || y < 1 || y >= ALTURA) return;
    blocos[indice(x, y, z)] = id;
  };
  const gasto = (x: number, y: number, z: number) =>
    hash2(x * 7 + y, z, semente + 63) < 0.18 ? resto : parede;
  // piso e espaço livre (como a ruína)
  for (let dz = -3; dz <= 3; dz++)
    for (let dx = -3; dx <= 3; dx++) {
      const x = 8 + dx;
      const z = 8 + dz;
      em(x, h, z, hash2(x, z, semente + 61) < 0.3 ? resto : Bloco.PEDRA_LISA);
      for (let y = h + 1; y < h + 6; y++) em(x, y, z, Bloco.AR);
    }
  switch (forma) {
    case 'cupula':
      // cúpula baixa com porta voltada para +z e uma janela no topo
      for (let dz = -3; dz <= 3; dz++)
        for (let dx = -3; dx <= 3; dx++)
          for (let dy = 1; dy <= 4; dy++) {
            const r = Math.hypot(dx, dz, (dy - 0.5) * 1.15);
            if (r < 2.6 || r > 3.5) continue;
            if (dz >= 2 && Math.abs(dx) <= 0 && dy <= 2) continue;
            em(
              8 + dx,
              h + dy,
              8 + dz,
              dy === 4 && dx === 0 && dz === 0 ? Bloco.AR : gasto(dx, dy, dz),
            );
          }
      break;
    case 'circulo':
      // círculo de pedras em pé, de alturas diferentes, com musgo no alto
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2;
        const x = Math.round(8 + Math.cos(a) * 3);
        const z = Math.round(8 + Math.sin(a) * 3);
        const alt = 2 + Math.floor(hash2(k, 3, semente + 64) * 3);
        for (let y = 1; y <= alt; y++) em(x, h + y, z, parede);
        if (hash2(k, 5, semente + 65) < 0.5) em(x, h + alt + 1, z, Bloco.FOLHAGEM);
      }
      break;
    case 'arcos':
      // três arcos alinhados (costelas de um gigante de pedra)
      for (const dz of [-2, 0, 2])
        for (let dx = -3; dx <= 3; dx++) {
          const alt = Math.round(4 - (dx * dx) / 3);
          if (Math.abs(dx) === 3)
            for (let y = 1; y <= alt; y++) em(8 + dx, h + y, 8 + dz, gasto(dx, y, dz));
          else em(8 + dx, h + alt, 8 + dz, gasto(dx, alt, dz));
        }
      break;
    case 'casinha':
      // casinha de paredes baixas, telhado em duas águas e porta na frente
      for (let dz = -2; dz <= 2; dz++)
        for (let dx = -2; dx <= 2; dx++) {
          const borda = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          if (borda)
            for (let y = 1; y <= 2; y++) {
              if (dz === 2 && dx === 0) continue;
              em(8 + dx, h + y, 8 + dz, gasto(dx, y, dz));
            }
          em(
            8 + dx,
            h + 3 + (2 - Math.abs(dx)),
            8 + dz,
            Math.abs(dx) === 0 ? Bloco.FOLHAGEM : parede,
          );
          if (Math.abs(dx) === 2 || dz === -2 || dz === 2)
            for (let y = 3; y < 3 + (2 - Math.abs(dx)); y++)
              if (Math.abs(dz) === 2) em(8 + dx, h + y, 8 + dz, parede);
        }
      break;
    case 'ninho':
      // ninho raso: anel de pedras de dois andares em volta do baú, com ovos de pedra lisa
      for (let dz = -3; dz <= 3; dz++)
        for (let dx = -3; dx <= 3; dx++) {
          const d = Math.hypot(dx, dz);
          if (d > 3.4 || d < 2.2) continue;
          em(8 + dx, h + 1, 8 + dz, gasto(dx, 1, dz));
          if (d > 2.8 && hash2(dx, dz, semente + 66) < 0.6)
            em(8 + dx, h + 2, 8 + dz, gasto(dx, 2, dz));
        }
      for (const [dx, dz] of [
        [1, 1],
        [-1, 1],
        [1, -1],
      ])
        em(8 + dx, h + 1, 8 + dz, Bloco.PEDRA_LISA);
      break;
    case 'espantalho': {
      // spec 013: lavoura abandonada (terra arada com umas plantas maduras, grama tomando
      // conta) e um espantalho de chapéu de abóbora atrás do baú
      const maduras = [Bloco.TRIGO_3, Bloco.MILHO_3, Bloco.ABOBOREIRA_3];
      for (let dz = -3; dz <= 3; dz++)
        for (let dx = -3; dx <= 3; dx++) {
          const x = 8 + dx;
          const z = 8 + dz;
          const r = hash2(x, z, semente + 67);
          if (r < 0.6) {
            em(x, h, z, Bloco.TERRA_ARADA);
            if (r < 0.22) em(x, h + 1, z, maduras[Math.floor(hash2(z, x, semente + 68) * 3)]);
          } else {
            em(x, h, z, Bloco.TERRA_MUSGOSA);
            if (r > 0.75) em(x, h + 1, z, Bloco.GRAMA_ALTA);
          }
        }
      for (let y = 1; y <= 3; y++) em(8, h + y, 9, y < 3 ? Bloco.CERCA : Bloco.LA_AZUL);
      em(7, h + 3, 9, Bloco.CERCA);
      em(9, h + 3, 9, Bloco.CERCA);
      em(8, h + 4, 9, Bloco.ABOBORA);
      break;
    }
    case 'torre':
      // torre fina e torta com uma plataforma no alto
      for (let y = 1; y <= 5; y++) {
        const ox = y > 3 ? 1 : 0;
        for (const [dx, dz] of [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ])
          em(8 + dx + ox, h + y, 8 + dz, gasto(dx, y, dz));
      }
      for (let dz = -1; dz <= 1; dz++)
        for (let dx = -1; dx <= 2; dx++) em(8 + dx, h + 6, 8 + dz, Bloco.PEDRA_LISA);
      break;
  }
  em(8, h + 1, 8, Bloco.BAU);
  em(6, h + 1, 6, Bloco.COGUMELO_BRILHANTE);
}

function por(
  blocos: Uint8Array,
  x: number,
  y: number,
  z: number,
  id: number,
  sobrescrever = false,
) {
  if (x < 0 || x >= TAM_X || z < 0 || z >= TAM_Z || y < 0 || y >= ALTURA) return;
  const i = indice(x, y, z);
  if (sobrescrever || blocos[i] === Bloco.AR || blocos[i] === Bloco.GRAMA_ALTA) blocos[i] = id;
}

function arvoreCarvalho(
  blocos: Uint8Array,
  x: number,
  h: number,
  z: number,
  r: number,
  folha: number,
): void {
  const tronco = 4 + Math.floor(r * 3);
  for (let i = 1; i <= tronco; i++) por(blocos, x, h + i, z, Bloco.MADEIRA_RETORCIDA, true);
  const topo = h + tronco;
  for (let dy = -2; dy <= 1; dy++) {
    const raio = dy >= 0 ? 1 : 2;
    for (let dz = -raio; dz <= raio; dz++)
      for (let dx = -raio; dx <= raio; dx++) {
        const canto = Math.abs(dx) === raio && Math.abs(dz) === raio;
        if (canto && (raio === 2 || dy === 1)) continue;
        por(blocos, x + dx, topo + dy, z + dz, folha);
      }
  }
  por(blocos, x, topo + 2, z, folha);
}

function arvoreBetula(blocos: Uint8Array, x: number, h: number, z: number, r: number): void {
  const tronco = 5 + Math.floor(r * 4);
  for (let i = 1; i <= tronco; i++) por(blocos, x, h + i, z, Bloco.TRONCO_BETULA, true);
  const topo = h + tronco;
  for (let dy = -2; dy <= 1; dy++) {
    const raio = dy >= 0 ? 1 : 2;
    for (let dz = -raio; dz <= raio; dz++)
      for (let dx = -raio; dx <= raio; dx++) {
        if (Math.abs(dx) === raio && Math.abs(dz) === raio) continue;
        por(blocos, x + dx, topo + dy, z + dz, Bloco.FOLHAS_BETULA);
      }
  }
  por(blocos, x, topo + 2, z, Bloco.FOLHAS_BETULA);
}

function arvorePinho(blocos: Uint8Array, x: number, h: number, z: number, r: number): void {
  const tronco = 6 + Math.floor(r * 4);
  for (let i = 1; i <= tronco; i++) por(blocos, x, h + i, z, Bloco.TRONCO_PINHO, true);
  const topo = h + tronco;
  // camadas cônicas alternadas
  let raio = 1;
  for (let y = topo + 1; y >= h + 3; y--) {
    const d = topo + 1 - y;
    raio =
      d === 0
        ? 0
        : d % 2 === 1
          ? Math.min(2, 1 + Math.floor(d / 4))
          : Math.max(1, Math.min(2, Math.floor(d / 3)));
    for (let dz = -raio; dz <= raio; dz++)
      for (let dx = -raio; dx <= raio; dx++) {
        if (raio === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
        por(blocos, x + dx, y, z + dz, Bloco.FOLHAS_PINHO);
      }
  }
  por(blocos, x, topo + 2, z, Bloco.FOLHAS_PINHO);
}

function arvoreLanterna(blocos: Uint8Array, x: number, h: number, z: number, r: number): void {
  const tronco = 5 + Math.floor(r * 4);
  for (let i = 1; i <= tronco; i++) por(blocos, x, h + i, z, Bloco.TRONCO_LANTERNA, true);
  const topo = h + tronco;
  for (let dy = -1; dy <= 2; dy++) {
    const raio = dy === 2 ? 1 : 2;
    for (let dz = -raio; dz <= raio; dz++)
      for (let dx = -raio; dx <= raio; dx++) {
        if (Math.hypot(dx, dz, dy * 0.8) > 2.6) continue;
        por(blocos, x + dx, topo + dy, z + dz, Bloco.FOLHAS_LANTERNA);
      }
  }
  // cipós luminosos pendurados
  for (const [dx, dz] of [
    [2, 0],
    [-2, 0],
    [0, 2],
    [0, -2],
  ]) {
    const n = 1 + Math.floor(hash2(x + dx, z + dz, 3) * 3);
    for (let i = 1; i <= n; i++) por(blocos, x + dx, topo - 1 - i, z + dz, Bloco.FOLHAS_LANTERNA);
  }
}

/**
 * Árvore no estilo do tema. Sem forma definida para o bioma, usa a árvore de sempre;
 * com forma, monta o desenho com o mesmo tronco e as mesmas folhas do bioma.
 */
function plantarArvore(
  blocos: Uint8Array,
  x: number,
  h: number,
  z: number,
  r: number,
  b: Bioma,
  tronco: number,
  folha: number,
  padrao: () => void,
): void {
  const formas = estilo.arvores[b];
  if (!formas || formas.length === 0) return padrao();
  const forma =
    formas[Math.floor(hash2(x * 31 + h, z, 4441 + Math.floor(r * 1000)) * formas.length)];
  arvoreDaForma(blocos, x, h, z, r, forma, tronco, folha);
}

export function arvoreDaForma(
  blocos: Uint8Array,
  x: number,
  h: number,
  z: number,
  r: number,
  forma: FormaArvore,
  tronco: number,
  folha: number,
): void {
  const coluna = (n: number) => {
    for (let i = 1; i <= n; i++) por(blocos, x, h + i, z, tronco, true);
    return h + n;
  };
  switch (forma) {
    case 'carvalho':
    case 'betula':
    case 'pinho':
    case 'lanterna': {
      // as formas clássicas, com os blocos do bioma
      const t = coluna(forma === 'pinho' ? 6 + Math.floor(r * 4) : 4 + Math.floor(r * 4));
      if (forma === 'pinho') {
        for (let y = t + 1, d = 0; y >= h + 3; y--, d++) {
          const raio = d === 0 ? 0 : d % 2 === 1 ? Math.min(2, 1 + Math.floor(d / 4)) : 1;
          for (let dz = -raio; dz <= raio; dz++)
            for (let dx = -raio; dx <= raio; dx++)
              if (!(raio === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2))
                por(blocos, x + dx, y, z + dz, folha);
        }
        por(blocos, x, t + 2, z, folha);
      } else {
        for (let dy = -2; dy <= 1; dy++) {
          const raio = dy >= 0 ? 1 : 2;
          for (let dz = -raio; dz <= raio; dz++)
            for (let dx = -raio; dx <= raio; dx++)
              if (!(Math.abs(dx) === raio && Math.abs(dz) === raio))
                por(blocos, x + dx, t + dy, z + dz, folha);
        }
        por(blocos, x, t + 2, z, folha);
      }
      break;
    }
    case 'palmeira': {
      // tronco alto e fino, folhas em cruz caindo nas pontas
      const t = coluna(6 + Math.floor(r * 3));
      por(blocos, x, t + 1, z, folha);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        por(blocos, x + dx, t + 1, z + dz, folha);
        por(blocos, x + dx * 2, t, z + dz * 2, folha);
        por(blocos, x + dx * 2, t - 1, z + dz * 2, folha);
      }
      for (const [dx, dz] of [
        [1, 1],
        [-1, 1],
        [1, -1],
        [-1, -1],
      ])
        por(blocos, x + dx, t, z + dz, folha);
      break;
    }
    case 'fungo': {
      // cogumelo gigante: talo grosso de um bloco e chapéu largo e achatado
      const t = coluna(4 + Math.floor(r * 3));
      for (let dz = -2; dz <= 2; dz++)
        for (let dx = -2; dx <= 2; dx++) {
          const canto = Math.abs(dx) === 2 && Math.abs(dz) === 2;
          if (canto) continue;
          const borda = Math.abs(dx) === 2 || Math.abs(dz) === 2;
          por(blocos, x + dx, borda ? t : t + 1, z + dz, folha);
        }
      por(blocos, x, t + 2, z, folha);
      break;
    }
    case 'pirulito': {
      // haste fina e uma bola redonda no alto
      const t = coluna(3 + Math.floor(r * 3));
      for (let dy = 0; dy <= 4; dy++)
        for (let dz = -2; dz <= 2; dz++)
          for (let dx = -2; dx <= 2; dx++)
            if (Math.hypot(dx, dz, dy - 2) <= 2.3) por(blocos, x + dx, t + 1 + dy, z + dz, folha);
      break;
    }
    case 'samambaia': {
      // samambaia-árvore: tronco curto e frondes longas em X, arqueadas
      const t = coluna(3 + Math.floor(r * 3));
      por(blocos, x, t + 1, z, folha);
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
        [1, 1],
        [-1, -1],
        [1, -1],
        [-1, 1],
      ]) {
        por(blocos, x + dx, t + 1, z + dz, folha);
        if (dx === 0 || dz === 0) por(blocos, x + dx * 2, t, z + dz * 2, folha);
      }
      break;
    }
    case 'araucaria': {
      // tronco alto e nu, copa achatada em andares no alto (guarda-chuva)
      const t = coluna(7 + Math.floor(r * 3));
      for (const [dy, raio] of [
        [-1, 2],
        [0, 2],
        [1, 1],
      ] as const)
        for (let dz = -raio; dz <= raio; dz++)
          for (let dx = -raio; dx <= raio; dx++) {
            if (raio === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            // o andar de baixo é só a borda: dá a cara de guarda-chuva
            if (dy === -1 && Math.abs(dx) < 2 && Math.abs(dz) < 2) continue;
            por(blocos, x + dx, t + dy, z + dz, folha);
          }
      // um andar menor no meio do tronco
      for (const [dx, dz] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        por(blocos, x + dx, t - 3, z + dz, folha);
      break;
    }
    case 'cristal': {
      // formação de cristal: base curta e pontas de alturas diferentes
      const t = coluna(1 + Math.floor(r * 2));
      const altC = 3 + Math.floor(r * 3);
      for (let i = 1; i <= altC; i++) por(blocos, x, t + i, z, folha);
      for (const [dx, dz, k] of [
        [1, 0, 0.7],
        [-1, 0, 0.45],
        [0, 1, 0.6],
        [0, -1, 0.35],
      ] as const) {
        const n = Math.max(1, Math.round(altC * k));
        for (let i = 0; i < n; i++) por(blocos, x + dx, t + i, z + dz, folha);
      }
      break;
    }
  }
}

/** Procura um ponto de nascimento em terra firme perto da origem. */
/** Nascimento pelo terreno natural (povoados nunca cobrem este ponto). */
const nascimentos = new Map<string, { x: number; z: number }>();
export function encontrarNascimento(semente: number): { x: number; z: number } {
  const sitio = TERRENO_NATURAL.planta === 'sitio';
  const k = sitio ? `${semente},sitio` : `${semente}`;
  let n = nascimentos.get(k);
  if (!n) {
    n = sitio ? nascimentoPertoDoSitio(semente) : procurarNascimento(semente);
    nascimentos.set(k, n);
  }
  return n;
}

function bomParaNascer(x: number, z: number, semente: number): boolean {
  const h = alturaNatural(x, z, semente);
  const b = biomaEm(x, z, semente, h);
  return h > NIVEL_MAR + 1 && h < 88 && b !== 'deserto';
}

function procurarNascimento(
  semente: number,
  livre: (x: number, z: number) => boolean = () => true,
): { x: number; z: number } {
  for (let raio = 0; raio < 400; raio += 4) {
    const passos = Math.max(1, Math.floor(raio / 2));
    for (let i = 0; i < passos; i++) {
      const a = (i / passos) * Math.PI * 2;
      const x = Math.round(8 + Math.cos(a) * raio);
      const z = Math.round(8 + Math.sin(a) * raio);
      if (bomParaNascer(x, z, semente) && livre(x, z)) return { x: x + 0.5, z: z + 0.5 };
    }
  }
  return { x: 8.5, z: 8.5 };
}

/**
 * Spec 013 (Rancho Alegre): o jogador nasce com o sítio à vista. Procura o sítio mais perto
 * da origem e um ponto em terra firme logo fora dele (e de qualquer outro), voltado para a
 * origem. É puro (só semente e estilo): o servidor acha o mesmo ponto.
 */
function nascimentoPertoDoSitio(semente: number): { x: number; z: number } {
  const plano = (rx: number, rz: number) => planoSemBloqueio(rx, rz, semente, TERRENO_NATURAL);
  const livre = (x: number, z: number) => {
    const rx = Math.floor(x / REGIAO_POVOADO);
    const rz = Math.floor(z / REGIAO_POVOADO);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const p = plano(rx + dx, rz + dz);
        if (p && x >= p.minX - 2 && x <= p.maxX + 2 && z >= p.minZ - 2 && z <= p.maxZ + 2)
          return false;
      }
    return true;
  };
  const sitios: PlanoPovoado[] = [];
  for (let rx = -2; rx <= 2; rx++)
    for (let rz = -2; rz <= 2; rz++) {
      const p = plano(rx, rz);
      if (p) sitios.push(p);
    }
  const dist = (p: PlanoPovoado) => Math.hypot(p.cx - 8, p.cz - 8);
  sitios.sort((a, b) => dist(a) - dist(b) || a.cx - b.cx || a.cz - b.cz);
  for (const p of sitios.slice(0, 4)) {
    const virado = Math.atan2(8 - p.cz, 8 - p.cx);
    for (let d = 30; d <= 56; d += 2)
      for (let k = 0; k < 24; k++) {
        const a = virado + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * ((Math.PI * 2) / 24);
        const x = Math.round(p.cx + Math.cos(a) * d);
        const z = Math.round(p.cz + Math.sin(a) * d);
        if (bomParaNascer(x, z, semente) && livre(x, z)) return { x: x + 0.5, z: z + 0.5 };
      }
  }
  return procurarNascimento(semente, livre);
}
