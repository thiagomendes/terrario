/**
 * Morador de brinquedo (spec 012, A2): o morador do tema vira o boneco B. As cores vêm das
 * peças do tema (pele da cabeça, roupa do tronco, calça das pernas, cabelo), e as peças próprias
 * da profissão (avental, touca, chapéu, lanterna, antenas) são encaixadas nas juntas do boneco,
 * reescaladas para as medidas dele. O rosto, as mãos e o andar são os do boneco.
 */
import {
  aparenciaPadrao,
  ESTILOS_CABELO,
  type Aparencia,
  type ModeloId,
} from '../personagem/aparencia';
import type { Junta, Peca, PlanoBoneco } from '../personagem/boneco';
import type { PecaCriatura } from '../temas/tipos';

/** Medidas do morador de blocos dos temas (corpoDeMorador): centro da cabeça e do tronco. */
const CABECA_Y = 1.66;
const CABECA_T = 0.42;
const TRONCO_Y = 1.11;
const TRONCO_T: [number, number, number] = [0.5, 0.66, 0.28];
const QUADRIL_Y = 0.78;

const MODELOS: ModeloId[] = [
  'andarilho',
  'herbolaria',
  'lanterneiro',
  'musgueira',
  'exploradora',
  'tecela',
  'ferreiro',
];
const FEMININOS: ModeloId[] = ['herbolaria', 'musgueira', 'exploradora', 'tecela'];

const volume = (p: PecaCriatura) => p.t[0] * p.t[1] * p.t[2];
const hash = (n: number, s: number) => {
  let h = (n * 374761393 + s * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

export interface Morador {
  aparencia: Aparencia;
  ajustar: (p: PlanoBoneco) => PlanoBoneco;
}

/** Aparência e ajuste do plano do boneco para um morador do tema. */
export function moradorDeBrinquedo(
  pecas: readonly PecaCriatura[],
  id: number,
  /** O corpo do boneco combina com o nome e a profissão do morador. */
  genero?: 'f' | 'm',
  /** Acessório do boneco que o tema dá à profissão (chapéu de palha da fazendeira). */
  acessorio?: Aparencia['acessorio'],
): Morador {
  const cabecas = pecas.filter((p) => p.papel === 'cabeca');
  const cabeca = [...cabecas].sort((a, b) => volume(b) - volume(a))[0];
  const pernas = pecas.filter((p) => p.papel === 'perna0' || p.papel === 'perna1');
  const perna = [...pernas]
    .filter((p) => Math.abs(p.p[0]) < 0.25)
    .sort((a, b) => b.t[1] - a.t[1])[0];
  const sapato = [...pernas]
    .filter((p) => Math.abs(p.p[0]) < 0.25)
    .sort((a, b) => a.p[1] - b.p[1])[0];
  const soltas = pecas.filter((p) => !p.papel);
  const tronco = [...soltas]
    .filter((p) => p.p[1] > QUADRIL_Y && p.p[1] < CABECA_Y - 0.2)
    .sort((a, b) => volume(b) - volume(a))[0];
  // cabelo: peças da cabeça no alto (até um pouco acima do topo) que não são pele nem olho
  const topo = cabeca ? cabeca.p[1] + cabeca.t[1] / 2 : CABECA_Y + CABECA_T / 2;
  const cabelos = cabecas.filter(
    (p) =>
      p !== cabeca &&
      p.cor !== cabeca?.cor &&
      Math.max(...p.t) > 0.1 &&
      p.p[1] > (cabeca?.p[1] ?? CABECA_Y) &&
      p.p[1] < topo + 0.06,
  );
  const usadas = new Set<PecaCriatura>(
    [cabeca, tronco, ...cabelos].filter(Boolean) as PecaCriatura[],
  );
  // pernas, braços, mãos e sapatos: o boneco tem os dele
  for (const p of pernas) usadas.add(p);
  // olhos (peças pequenas e escuras na frente da cabeça): o boneco tem os dele
  for (const p of cabecas)
    if (Math.max(...p.t) <= 0.09 && p.p[2] > 0.15 && p.p[1] < topo) usadas.add(p);

  const modelos = MODELOS.filter((m) => !genero || (genero === 'f') === FEMININOS.includes(m));
  const a = aparenciaPadrao(modelos[Math.floor(hash(id, 1) * modelos.length)]);
  a.cabeloEstilo = Math.floor(hash(id, 2) * ESTILOS_CABELO);
  // rosto no gênero do morador: cílios e sardas para elas; barba e bigode só para eles
  const rostos = genero === 'f' ? [0, 1, 2, 3] : genero === 'm' ? [0, 2, 4, 5] : [0, 1, 2, 3, 4, 5];
  a.rosto = rostos[Math.floor(hash(id, 3) * rostos.length)];
  a.acessorio = acessorio ?? 'nenhum';
  const pele = cabeca?.cor;
  const roupa = tronco?.cor;
  const calca = perna?.cor;
  const cabelo = cabelos[0]?.cor ?? pele;
  const extras = pecas.filter((p) => !usadas.has(p));

  const ajustar = (plano: PlanoBoneco): PlanoBoneco => {
    const troca = new Map<string, string>();
    if (pele) troca.set(plano.cores.pele, pele);
    if (roupa) {
      troca.set(plano.cores.roupa, roupa);
      if (plano.cores.punho !== plano.cores.pele) troca.set(plano.cores.punho, roupa);
    }
    if (calca) troca.set(plano.cores.calca, calca);
    if (cabelo) troca.set(plano.cores.cabelo, cabelo);
    const sapatoCor = sapato?.cor;
    const pecasNovas: Peca[] = plano.pecas.map((p) => {
      let cor = troca.get(p.cor) ?? p.cor;
      if (sapatoCor && /sapato|bota|pe[ED]?$/.test(p.nome)) cor = sapatoCor;
      return { ...p, cor };
    });
    // medidas do boneco para reescalar as peças do tema
    const kCab = 0.72 / CABECA_T;
    const troncoH = plano.juntas.cabeca.pos[1] - 0.33;
    const larg = Math.abs(plano.juntas.bracoD.pos[0] - 0.06) * 2;
    const kTronco: [number, number, number] = [
      larg / TRONCO_T[0],
      troncoH / TRONCO_T[1],
      0.34 / TRONCO_T[2],
    ];
    const quadril = plano.juntas.tronco.pos[1];
    extras.forEach((e, i) => {
      let junta: Junta;
      let pos: [number, number, number];
      let t: [number, number, number];
      const topoTema = CABECA_Y + CABECA_T / 2;
      if (e.papel !== 'antena' && e.p[1] - e.t[1] / 2 >= topoTema - 0.04) {
        // chapéu, touca, capacete: assenta em cima da cabeça do boneco (e do cabelo dele)
        junta = 'cabeca';
        t = [e.t[0] * kCab, e.t[1] * kCab * 0.8, e.t[2] * kCab];
        const base = (e.p[1] - e.t[1] / 2 - topoTema) * kCab * 0.8;
        pos = [e.p[0] * kCab, 0.34 + 0.05 + base + t[1] / 2, e.p[2] * kCab];
      } else if (e.papel === 'antena' || e.p[1] >= CABECA_Y - 0.1) {
        junta = 'cabeca';
        pos = [e.p[0] * kCab, (e.p[1] - CABECA_Y) * kCab, e.p[2] * kCab];
        t = [e.t[0] * kCab, e.t[1] * kCab, e.t[2] * kCab];
      } else if (e.p[1] >= QUADRIL_Y - 0.1) {
        junta = 'tronco';
        // lenço e gola (entre o tronco e a cabeça): no alto do tronco, sem cobrir o rosto
        const y = Math.min(troncoH + 0.02, troncoH / 2 + (e.p[1] - TRONCO_Y) * kTronco[1]);
        pos = [e.p[0] * kTronco[0], y, e.p[2] * kTronco[2] + 0.02];
        t = [e.t[0] * kTronco[0], e.t[1] * kTronco[1], Math.max(0.04, e.t[2] * kTronco[2])];
      } else {
        junta = 'corpo';
        pos = [e.p[0], (e.p[1] / QUADRIL_Y) * quadril, e.p[2]];
        t = [e.t[0], e.t[1] * (quadril / QUADRIL_Y), e.t[2]];
      }
      const maior = Math.max(...t);
      const menor = Math.min(...t);
      pecasNovas.push(
        // bolinhas pequenas e as peças desenhadas como bola (aba redonda do chapéu de palha)
        maior <= 0.12 || e.forma === 'bola'
          ? {
              nome: `extra-${i}`,
              junta,
              forma: 'esfera',
              tamanho: [t[0] / 2, t[1] / 2, t[2] / 2],
              pos,
              cor: e.cor,
              brilho: e.brilho,
            }
          : {
              nome: `extra-${i}`,
              junta,
              forma: 'caixa',
              tamanho: t,
              raio: Math.min(0.1, menor * 0.4),
              pos,
              cor: e.cor,
              brilho: e.brilho,
            },
      );
    });
    return {
      ...plano,
      pecas: pecasNovas,
      cores: { ...plano.cores, pele: pele ?? plano.cores.pele },
    };
  };
  return { aparencia: a, ajustar };
}
