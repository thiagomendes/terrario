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
import {
  ajeitarCabeloDebaixo,
  type Junta,
  type Peca,
  type PlanoBoneco,
} from '../personagem/boneco';
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

type V3 = [number, number, number];

/** Sobra de encaixe: o enfeite entra este tanto no apoio (encostado, sem fresta). */
const SOBRA = 0.006;

/** Peça do boneco onde um enfeite do tema se apoia, já no espaço da junta do enfeite. */
interface Apoio {
  peca: Peca;
  centro: V3;
}

/** Distância (com sinal) de um ponto até a superfície da peça (caixa redonda ou esfera). */
function distancia(a: Apoio, q: V3): number {
  let x = q[0] - a.centro[0];
  let y = q[1] - a.centro[1];
  let z = q[2] - a.centro[2];
  const p = a.peca;
  if (p.rot) {
    // desfaz o giro da peça (o Babylon gira em z, depois x, depois y)
    const [rx, ry, rz] = p.rot;
    [x, z] = [x * Math.cos(ry) - z * Math.sin(ry), x * Math.sin(ry) + z * Math.cos(ry)];
    [y, z] = [y * Math.cos(rx) + z * Math.sin(rx), -y * Math.sin(rx) + z * Math.cos(rx)];
    [x, y] = [x * Math.cos(rz) + y * Math.sin(rz), -x * Math.sin(rz) + y * Math.cos(rz)];
  }
  if (p.forma === 'esfera') {
    const [ra, rb, rc] = p.tamanho;
    const k0 = Math.hypot(x / ra, y / rb, z / rc);
    const k1 = Math.hypot(x / (ra * ra), y / (rb * rb), z / (rc * rc));
    return k1 === 0 ? -Math.min(ra, rb, rc) : (k0 * (k0 - 1)) / k1;
  }
  const meio = p.tamanho.map((t) => t / 2);
  const r = Math.max(0, Math.min(p.raio ?? 0.05, ...meio));
  const d = [Math.abs(x) - meio[0] + r, Math.abs(y) - meio[1] + r, Math.abs(z) - meio[2] + r];
  const fora = Math.hypot(Math.max(d[0], 0), Math.max(d[1], 0), Math.max(d[2], 0));
  return fora + Math.min(Math.max(d[0], d[1], d[2]), 0) - r;
}

/** Pontos na superfície da peça (em volta do centro dela). */
function superficie(p: Peca, n = 3): V3[] {
  const pts: V3[] = [];
  if (p.forma === 'esfera') {
    const [a, b, c] = p.tamanho;
    for (let i = 0; i <= n; i++) {
      const fi = (i / n) * Math.PI - Math.PI / 2;
      for (let j = 0; j < 2 * n; j++) {
        const te = (j / (2 * n)) * Math.PI * 2;
        pts.push([
          a * Math.cos(fi) * Math.cos(te),
          b * Math.sin(fi),
          c * Math.cos(fi) * Math.sin(te),
        ]);
      }
    }
    return pts;
  }
  const meio = p.tamanho.map((t) => t / 2) as V3;
  const r = Math.max(0, Math.min(p.raio ?? 0.05, ...meio));
  const dentro = meio.map((m) => m - r);
  for (let eixo = 0; eixo < 3; eixo++)
    for (const s of [-1, 1])
      for (let i = 0; i <= n; i++)
        for (let j = 0; j <= n; j++) {
          const u = (eixo + 1) % 3;
          const v = (eixo + 2) % 3;
          const c: V3 = [0, 0, 0];
          c[eixo] = s * meio[eixo];
          c[u] = (i / n) * 2 * meio[u] - meio[u];
          c[v] = (j / n) * 2 * meio[v] - meio[v];
          // os cantos redondos: o ponto desce para a superfície de verdade
          const q = c.map((x, k) => Math.max(-dentro[k], Math.min(dentro[k], x))) as V3;
          const d: V3 = [c[0] - q[0], c[1] - q[1], c[2] - q[2]];
          const l = Math.hypot(...d);
          pts.push(
            l < 1e-9 ? c : [q[0] + (d[0] / l) * r, q[1] + (d[1] / l) * r, q[2] + (d[2] / l) * r],
          );
        }
  return pts;
}

/**
 * Menor distância entre um grupo de peças (deslocado `s` ao longo do eixo, na direção do
 * apoio) e os apoios: negativa quando o grupo entra neles.
 */
function folgaDoGrupo(pontos: V3[], apoios: Apoio[], eixo: number, passo: number): number {
  let d = Infinity;
  for (const q0 of pontos) {
    const q: V3 = [q0[0], q0[1], q0[2]];
    q[eixo] += passo;
    for (const a of apoios) d = Math.min(d, distancia(a, q));
  }
  return d;
}

/**
 * Encosta um enfeite do tema (com as peças grudadas nele) no apoio (spec 017, pedido do dono:
 * nada solto). As medidas do morador de blocos não batem com as do boneco, e o enfeite ficava
 * no ar na frente do rosto ou do peito. Ele anda em linha reta, na direção do apoio, até
 * entrar SOBRA nele. Peça que já encosta fica onde está.
 */
function encostar(grupo: Peca[], apoios: Apoio[], principal: Apoio): void {
  const pontos = grupo.flatMap((p) =>
    superficie(p).map((q) => [q[0] + p.pos[0], q[1] + p.pos[1], q[2] + p.pos[2]] as V3),
  );
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const q of pontos)
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], q[k]);
      max[k] = Math.max(max[k], q[k]);
    }
  // só os apoios ao alcance do caminho (a conta fica leve: o morador é montado no jogo)
  const perto = apoios.filter((a) => {
    const r = Math.hypot(...a.peca.tamanho) / (a.peca.forma === 'esfera' ? 1 : 2);
    let d = 0;
    for (let k = 0; k < 3; k++) d = Math.max(d, min[k] - a.centro[k], a.centro[k] - max[k]);
    return d <= r + 0.62;
  });
  if (folgaDoGrupo(pontos, perto, 0, 0) <= 0.008) return;
  apoios = perto;
  // a direção: do centro do apoio principal para o meio do grupo (o eixo mais afastado)
  let eixo = 0;
  let maior = -Infinity;
  for (let k = 0; k < 3; k++) {
    const meio = principal.peca.tamanho[k] / 2;
    const n = Math.abs((min[k] + max[k]) / 2 - principal.centro[k]) / meio;
    if (n > maior) {
      maior = n;
      eixo = k;
    }
  }
  const sinal = (min[eixo] + max[eixo]) / 2 > principal.centro[eixo] ? -1 : 1;
  // anda o tanto da folga de cada vez (nenhum ponto chega mais perto que isso num passo)
  const alvo = -SOBRA;
  let b = 0;
  let folga = folgaDoGrupo(pontos, apoios, eixo, 0);
  for (let i = 0; i < 40 && folga > alvo + 0.0005; i++) {
    b += Math.max(folga - alvo, 0.001);
    if (b > 0.6) return;
    folga = folgaDoGrupo(pontos, apoios, eixo, sinal * b);
  }
  if (folga > alvo + 0.0005) return;
  for (const p of grupo) {
    const pos: V3 = [p.pos[0], p.pos[1], p.pos[2]];
    pos[eixo] += sinal * b;
    p.pos = pos;
  }
}

/** A peça some inteira dentro dos apoios (o pescoço do tema dentro do tronco do boneco). */
function escondida(p: Peca, apoios: Apoio[]): boolean {
  return superficie(p).every((q) =>
    apoios.some((a) => distancia(a, [q[0] + p.pos[0], q[1] + p.pos[1], q[2] + p.pos[2]]) < -0.002),
  );
}

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
  /** Spec 014 (T11): a fantasia que o tema dá à profissão (o capacete de obra do pedreiro). */
  fantasia?: Aparencia['fantasia'],
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
  // o rosto do tema (spec 017): olhos, boca, bochechas, a tela do robô, a pele atrás do visor
  // e o próprio visor são peças finas coladas na frente da cabeça de blocos. O boneco tem o
  // rosto dele; essas peças ficavam soltas na frente dele (ou tapando os olhos). A pele atrás
  // do visor e a tela do robô viram a placa do rosto, onde o rosto do boneco se apoia.
  const frenteTema = cabeca ? cabeca.p[2] + cabeca.t[2] / 2 : CABECA_T / 2;
  const baseTema = cabeca ? cabeca.p[1] - cabeca.t[1] / 2 : CABECA_Y - CABECA_T / 2;
  const rostoTema = cabecas.filter(
    (p) =>
      !usadas.has(p) &&
      p.p[1] - p.t[1] / 2 < CABECA_Y + CABECA_T / 2 - 0.04 &&
      p.t[2] <= 0.06 &&
      p.p[2] >= frenteTema - 0.03 &&
      p.p[1] - p.t[1] / 2 >= baseTema - 0.01 &&
      p.p[1] + p.t[1] / 2 <= topo + 0.01,
  );
  for (const p of rostoTema) usadas.add(p);
  const areaRosto = cabeca ? cabeca.t[0] * cabeca.t[1] : CABECA_T * CABECA_T;
  const placa = rostoTema
    .filter((p) => p.alfa === undefined && p.cor !== cabeca?.cor)
    .sort((a, b) => b.t[0] * b.t[1] - a.t[0] * a.t[1])
    .find((p) => p.t[0] * p.t[1] >= areaRosto * 0.3);
  // na tela escura do robô, os olhos e a boca do boneco acendem na cor do rosto dele
  const luzRosto = rostoTema
    .filter((p) => (p.brilho ?? 0) >= 0.8)
    .sort((a, b) => (b.brilho ?? 0) - (a.brilho ?? 0))[0];

  const modelos = MODELOS.filter((m) => !genero || (genero === 'f') === FEMININOS.includes(m));
  const a = aparenciaPadrao(modelos[Math.floor(hash(id, 1) * modelos.length)]);
  a.cabeloEstilo = Math.floor(hash(id, 2) * ESTILOS_CABELO);
  // rosto no gênero do morador: cílios e sardas para elas; barba e bigode só para eles
  const rostos = genero === 'f' ? [0, 1, 2, 3] : genero === 'm' ? [0, 2, 4, 5] : [0, 1, 2, 3, 4, 5];
  a.rosto = rostos[Math.floor(hash(id, 3) * rostos.length)];
  a.acessorio = acessorio ?? 'nenhum';
  if (fantasia) a.fantasia = { ...fantasia };
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
    // o tronco do tema dá a régua (o alienígena tem o tronco mais baixo que o morador comum)
    const trT = tronco?.t ?? TRONCO_T;
    const baseTronco = (tronco?.p[1] ?? TRONCO_Y) - trT[1] / 2;
    const kTronco: [number, number, number] = [larg / trT[0], troncoH / trT[1], 0.34 / trT[2]];
    const quadril = plano.juntas.tronco.pos[1];
    /** Peças do chapéu do tema (assentam no cabelo do boneco no fim). */
    const chapeu: Peca[] = [];
    /** Os outros enfeites do tema, com a peça de blocos de onde vieram (para os grupos). */
    const enfeites: Array<{ tema: PecaCriatura; peca: Peca }> = [];
    // a saia rodada do tema (abaixo do tronco) e a estampa dela ficam juntas, paradas no corpo
    const saias = extras.filter((e) => e.p[1] < baseTronco - 0.1);
    const naSaia = (e: PecaCriatura) =>
      e.p[1] < baseTronco &&
      saias.some((s) =>
        [0, 1, 2].every((k) => Math.abs(e.p[k] - s.p[k]) <= (e.t[k] + s.t[k]) / 2 + 0.01),
      );
    extras.forEach((e, i) => {
      let junta: Junta;
      let apoio: Peca['apoio'];
      /** Chapéu, touca ou capacete do tema: assenta no cabelo do boneco. */
      let ehChapeu = false;
      let pos: [number, number, number];
      let t: [number, number, number];
      const topoTema = CABECA_Y + CABECA_T / 2;
      if (e.papel !== 'antena' && e.p[1] - e.t[1] / 2 >= topoTema - 0.04) {
        // chapéu, touca, capacete: assenta em cima da cabeça do boneco (e do cabelo dele)
        junta = 'cabeca';
        apoio = 'cabeca';
        ehChapeu = true;
        t = [e.t[0] * kCab, e.t[1] * kCab * 0.8, e.t[2] * kCab];
        const base = (e.p[1] - e.t[1] / 2 - topoTema) * kCab * 0.8;
        pos = [e.p[0] * kCab, 0.34 + 0.05 + base + t[1] / 2, e.p[2] * kCab];
      } else if (e.papel === 'antena' || e.p[1] >= CABECA_Y - 0.1) {
        junta = 'cabeca';
        apoio = 'cabeca';
        pos = [e.p[0] * kCab, (e.p[1] - CABECA_Y) * kCab, e.p[2] * kCab];
        t = [e.t[0] * kCab, e.t[1] * kCab, e.t[2] * kCab];
      } else if (e.p[1] >= baseTronco - 0.1 && !naSaia(e)) {
        junta = 'tronco';
        apoio = 'tronco';
        // lenço e gola (entre o tronco e a cabeça): no alto do tronco, sem cobrir o rosto
        const y = Math.min(troncoH + 0.02, (e.p[1] - baseTronco) * kTronco[1]);
        pos = [e.p[0] * kTronco[0], y, e.p[2] * kTronco[2] + 0.02];
        t = [e.t[0] * kTronco[0], e.t[1] * kTronco[1], Math.max(0.04, e.t[2] * kTronco[2])];
      } else {
        // saia rodada do tema: fica parada no corpo, em volta do quadril
        junta = 'corpo';
        apoio = 'tronco';
        pos = [e.p[0], (e.p[1] / QUADRIL_Y) * quadril, e.p[2]];
        t = [e.t[0], e.t[1] * (quadril / QUADRIL_Y), e.t[2]];
      }
      const maior = Math.max(...t);
      const menor = Math.min(...t);
      pecasNovas.push(
        // bolinhas pequenas e as peças desenhadas como bola (aba redonda do chapéu de palha)
        maior <= 0.12 || e.forma === 'bola'
          ? {
              nome: ehChapeu ? `chapeu-tema-${i}` : `extra-${i}`,
              junta,
              forma: 'esfera',
              tamanho: [t[0] / 2, t[1] / 2, t[2] / 2],
              pos,
              cor: e.cor,
              brilho: e.brilho,
              apoio,
            }
          : {
              nome: ehChapeu ? `chapeu-tema-${i}` : `extra-${i}`,
              junta,
              forma: 'caixa',
              tamanho: t,
              raio: Math.min(0.1, menor * 0.4),
              pos,
              cor: e.cor,
              brilho: e.brilho,
              apoio,
            },
      );
      if (ehChapeu) chapeu.push(pecasNovas[pecasNovas.length - 1]);
      else enfeites.push({ tema: e, peca: pecasNovas[pecasNovas.length - 1] });
    });
    // o chapéu do tema assenta no cabelo do boneco (spec 017): o cabelo de blocos do tema
    // tinha outra altura, e o chapéu ficava solto em cima do cabelo raspado ou do liso
    const tampa = pecasNovas.find((p) => p.nome === 'cabelo' && p.junta === 'cabeca');
    if (chapeu.length && tampa) {
      const altura = (p: Peca) => (p.forma === 'esfera' ? p.tamanho[1] : p.tamanho[1] / 2);
      const topoTampa = tampa.pos[1] + tampa.tamanho[1] / 2;
      // a tampa tem cantos redondos: perto da borda o alto dela é mais baixo (a antena de
      // lado encosta onde a tampa já faz a curva)
      const r = Math.min(tampa.raio ?? 0.05, tampa.tamanho[1] / 2);
      const alturaTampa = (x: number, z: number) => {
        const dx = Math.max(0, Math.abs(x) - (tampa.tamanho[0] / 2 - r));
        const dz = Math.max(0, Math.abs(z) - (tampa.tamanho[2] / 2 - r));
        const d = Math.min(r, Math.hypot(dx, dz));
        return topoTampa - (r - Math.sqrt(r * r - d * d));
      };
      const baixa = chapeu.reduce((a, p) => (p.pos[1] - altura(p) < a.pos[1] - altura(a) ? p : a));
      const dy = alturaTampa(baixa.pos[0], baixa.pos[2]) - 0.005 - (baixa.pos[1] - altura(baixa));
      for (const p of chapeu) p.pos = [p.pos[0], p.pos[1] + dy, p.pos[2]];
      // enfeite da frente de um gorro do tema que virou o cabelo do boneco (glacê, estampa):
      // gruda na frente da tampa de cabelo, em vez de ficar no ar diante dela
      const frente = tampa.pos[2] + tampa.tamanho[2] / 2;
      for (const p of chapeu) {
        const meiaProf = p.forma === 'esfera' ? p.tamanho[2] : p.tamanho[2] / 2;
        if (p.pos[2] - meiaProf < frente - 0.01) continue;
        const y = Math.min(p.pos[1], topoTampa - 0.08);
        const canto = Math.min(
          r,
          Math.max(0, Math.abs(y - tampa.pos[1]) - (tampa.tamanho[1] / 2 - r)),
        );
        const z = frente - (r - Math.sqrt(r * r - canto * canto)) + meiaProf - 0.005;
        p.pos = [p.pos[0], y, z];
      }
      ajeitarCabeloDebaixo(pecasNovas, 'chapeu', topoTampa, { w: 0.72, h: 0.68, d: 0.65 });
    }
    // a saia rodada do tema veste por cima: a saia do boneco por baixo esconderia a estampa
    if (saias.length) {
      const i = pecasNovas.findIndex((p) => p.nome === 'saia');
      if (i >= 0) pecasNovas.splice(i, 1);
    }
    if (placa) colocarPlaca(pecasNovas, placa, kCab, luzRosto);
    encostarEnfeites(plano, pecasNovas, enfeites);
    return {
      ...plano,
      pecas: pecasNovas,
      cores: { ...plano.cores, pele: pele ?? plano.cores.pele },
    };
  };
  return { aparencia: a, ajustar };
}

/**
 * A placa do rosto (a pele atrás do visor do astronauta, a tela do robô): uma placa fina e
 * redonda nos cantos, embutida na frente da cabeça do boneco. O rosto do boneco (olhos, boca,
 * bochechas, bigode, barba) vem para a frente e se apoia nela. Na tela escura, os olhos e a
 * boca acendem na cor do rosto do tema.
 */
function colocarPlaca(
  pecas: Peca[],
  placa: PecaCriatura,
  kCab: number,
  luz: PecaCriatura | undefined,
): void {
  const cab = pecas.find((p) => p.nome === 'cabeca' && p.junta === 'cabeca');
  if (!cab) return;
  const [w, h, d] = cab.tamanho;
  const larg = Math.min(placa.t[0] * kCab, w * 0.78);
  const alt = Math.min(placa.t[1] * kCab, h * 0.62);
  const esp = 0.05;
  /** A placa sai este tanto da frente da cabeça (o resto fica embutido nos cantos redondos). */
  const sai = 0.018;
  const y = Math.max(-0.07, Math.min(0, (placa.p[1] - CABECA_Y) * kCab));
  pecas.push({
    nome: 'rosto-tema',
    junta: 'cabeca',
    forma: 'caixa',
    tamanho: [larg, alt, esp],
    raio: 0.06,
    pos: [0, y, d / 2 + sai - esp / 2],
    cor: placa.cor,
    brilho: placa.brilho,
  });
  const escura = luminancia(placa.cor) < 0.3;
  for (const p of pecas) {
    if (
      p.junta !== 'cabeca' ||
      !/^(olho|brilho|cilio|boca|bochecha|sarda|bigode|barba)/.test(p.nome)
    )
      continue;
    if (Math.abs(p.pos[0]) > larg / 2 || Math.abs(p.pos[1] - y) > alt / 2) continue;
    p.pos = [p.pos[0], p.pos[1], p.pos[2] + sai];
    if (escura && luz && /^(olho|boca|cilio|bigode)/.test(p.nome)) {
      p.cor = luz.cor;
      p.brilho = Math.max(p.brilho ?? 0, 1);
    }
  }
}

/** Luminância de uma cor #rrggbb (0 escuro, 1 claro). */
function luminancia(cor: string): number {
  const n = parseInt(cor.slice(1, 7), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/**
 * Enfeites do tema encostados no boneco (spec 017): cada grupo de peças que se tocam no
 * morador de blocos (o avental e o bolso dele, a haste e a bolinha da antena, o painel do
 * peito e as luzinhas) anda junto até encostar na cabeça ou no tronco. A peça que sumiria
 * inteira dentro do boneco (o pescoço fininho do alienígena) sai.
 */
function encostarEnfeites(
  plano: PlanoBoneco,
  pecas: Peca[],
  enfeites: Array<{ tema: PecaCriatura; peca: Peca }>,
): void {
  const apoiosDe = (junta: Junta): Apoio[] => {
    const lista: Apoio[] = [];
    for (const p of pecas) {
      if (p.apoio || (p.forma !== 'caixa' && p.forma !== 'esfera')) continue;
      if (p.nome.startsWith('extra-')) continue;
      if (p.junta === junta) lista.push({ peca: p, centro: p.pos });
      else if (junta === 'cabeca' && p.junta === 'topete') {
        const o = plano.juntas.topete.pos;
        lista.push({ peca: p, centro: [p.pos[0] + o[0], p.pos[1] + o[1], p.pos[2] + o[2]] });
      }
    }
    return lista;
  };
  const apoios: Partial<Record<Junta, Apoio[]>> = {};
  const toca = (a: PecaCriatura, b: PecaCriatura) =>
    [0, 1, 2].every((k) => Math.abs(a.p[k] - b.p[k]) <= (a.t[k] + b.t[k]) / 2 + 0.01);
  // grupos: as peças que se tocam no morador de blocos e foram para a mesma junta
  const grupoDe = enfeites.map((_, i) => i);
  const raiz = (i: number): number => (grupoDe[i] === i ? i : (grupoDe[i] = raiz(grupoDe[i])));
  for (let i = 0; i < enfeites.length; i++)
    for (let j = 0; j < i; j++)
      if (
        enfeites[i].peca.junta === enfeites[j].peca.junta &&
        toca(enfeites[i].tema, enfeites[j].tema)
      )
        grupoDe[raiz(i)] = raiz(j);
  const grupos = new Map<number, Peca[]>();
  enfeites.forEach((e, i) => {
    const g = grupos.get(raiz(i));
    if (g) g.push(e.peca);
    else grupos.set(raiz(i), [e.peca]);
  });
  const fora = new Set<Peca>();
  for (const grupo of grupos.values()) {
    const junta = grupo[0].junta;
    if (junta !== 'cabeca' && junta !== 'tronco') continue;
    const lista = (apoios[junta] ??= apoiosDe(junta));
    const principal = lista.find((a) => a.peca.nome === (junta === 'cabeca' ? 'cabeca' : 'peito'));
    if (!principal) continue;
    for (const p of grupo) if (escondida(p, lista)) fora.add(p);
    const visiveis = grupo.filter((p) => !fora.has(p));
    if (visiveis.length) encostar(visiveis, lista, principal);
  }
  for (let i = pecas.length - 1; i >= 0; i--) if (fora.has(pecas[i])) pecas.splice(i, 1);
}
