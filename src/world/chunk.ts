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
    continente: fbm2(wx / 420, wz / 420, semente + 303, 4),
    montanha: crista2(wx / 160, wz / 160, semente + 404, 4),
  };
}

/** Altura do terreno (y do bloco de superfície). */
export function alturaTerreno(wx: number, wz: number, semente: number): number {
  const c = clima(wx, wz, semente);
  const colinas = fbm2(wx / 48, wz / 48, semente, 4);
  const detalhe = fbm2(wx / 11, wz / 11, semente + 7, 2);
  // continente: abaixo de ~0.36 vira mar
  const base = 48 + Math.min(1, Math.max(0, (c.continente - 0.25) / 0.35)) * 20;
  let h = base + colinas * 12 + detalhe * 3;
  const m = Math.max(0, c.montanha - 0.55) / 0.45;
  h += m * m * 52 * Math.min(1, Math.max(0, (c.continente - 0.38) / 0.15));
  // pântanos são baixos e planos
  if (c.umidade > 0.62 && c.temperatura > 0.38) h = Math.min(h, NIVEL_MAR + 2 + detalhe * 2);
  return Math.floor(Math.min(ALTURA - 14, h));
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
      const h = alturaTerreno(wx, wz, semente);
      alturas[z * TAM_X + x] = h;
      const b = biomaEm(wx, wz, semente, h);
      biomas.push(b);
      const solo = b === 'deserto' ? 6 : 4;
      for (let y = 0; y <= h; y++) {
        let id: number;
        if (y === 0 || (y <= 2 && hash3(wx, y, wz, semente + 5) < 0.5)) id = Bloco.ROCHA_MATRIZ;
        else if (y > h - solo) id = superficie(b, y, h);
        else id = minerioEm(wx, y, wz, semente);
        // cavernas: túneis (cruzamento de duas superfícies) e salões no fundo
        if (id !== Bloco.ROCHA_MATRIZ && y > 3) {
          const proteger = h <= NIVEL_MAR + 3 ? y > h - 8 : y > h - 1;
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
      const r = hash2(wx, wz, semente + 5);
      const r2 = hash2(wx, wz, semente + 9);
      const margem = x >= 2 && x < TAM_X - 2 && z >= 2 && z < TAM_Z - 2;
      const pos = (id: number) => {
        blocos[indice(x, topo, z)] = id;
      };
      switch (b) {
        case 'floresta':
          if (margem && r < 0.03) {
            if (r2 < 0.3) arvoreBetula(blocos, x, h, z, r2);
            else if (r2 > 0.93) arvoreCarvalho(blocos, x, h, z, r2, Bloco.FOLHAS_OUTONO);
            else arvoreCarvalho(blocos, x, h, z, r2, Bloco.FOLHAGEM);
          } else if (r < 0.25) pos(Bloco.GRAMA_ALTA);
          else if (r < 0.28) pos(Bloco.FLOR);
          else if (r < 0.295) pos(Bloco.ARBUSTO_FRUTINHAS);
          else if (r < 0.305) pos(Bloco.COGUMELO_BRILHANTE);
          else if (r > 0.9985) pos(Bloco.CRISTAL_LUZ);
          break;
        case 'campos':
          if (margem && r < 0.004) arvoreCarvalho(blocos, x, h, z, r2, Bloco.FOLHAGEM);
          else if (r < 0.3) pos(Bloco.GRAMA_ALTA);
          else if (r < 0.4) pos(Bloco.FLOR);
          else if (r < 0.402) pos(Bloco.ABOBORA);
          break;
        case 'taiga':
          if (margem && r < 0.035) arvorePinho(blocos, x, h, z, r2);
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
          if (margem && r < 0.02) arvoreLanterna(blocos, x, h, z, r2);
          else if (r < 0.12) pos(Bloco.JUNCO);
          else if (r < 0.2) pos(Bloco.GRAMA_ALTA);
          else if (r < 0.24) pos(Bloco.COGUMELO_BRILHANTE);
          else if (r > 0.997) pos(Bloco.CRISTAL_LUZ);
          break;
        case 'montanhas':
          if (chao === Bloco.TERRA_MUSGOSA && margem && r < 0.01) arvorePinho(blocos, x, h, z, r2);
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
  return blocos;
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

/** Procura um ponto de nascimento em terra firme perto da origem. */
export function encontrarNascimento(semente: number): { x: number; z: number } {
  for (let raio = 0; raio < 400; raio += 4) {
    const passos = Math.max(1, Math.floor(raio / 2));
    for (let i = 0; i < passos; i++) {
      const a = (i / passos) * Math.PI * 2;
      const x = Math.round(8 + Math.cos(a) * raio);
      const z = Math.round(8 + Math.sin(a) * raio);
      const h = alturaTerreno(x, z, semente);
      const b = biomaEm(x, z, semente, h);
      if (h > NIVEL_MAR + 1 && h < 88 && b !== 'deserto') return { x: x + 0.5, z: z + 0.5 };
    }
  }
  return { x: 8.5, z: 8.5 };
}
