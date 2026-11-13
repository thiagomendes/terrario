/**
 * Juntas e passo dos bichos de brinquedo (refino da Cidade Grande, 014c).
 *
 * As juntas: cada pata gira inteira do quadril (a perna e o pezinho juntos, antes o pezinho
 * girava em volta do próprio topo e ficava parado no chão enquanto a perna ia embora), o rabo
 * inteiro abana da base (antes cada bolinha do rabo girava no próprio centro e o rabo listrado
 * do guaxinim nem se mexia) e cada asa bate da borda de dentro, inteira.
 *
 * O passo: o ritmo das patas sai da rapidez de verdade e do comprimento da perna, para o pé no
 * chão acompanhar o chão (antes o ritmo era o mesmo para todo bicho, e os de perna curta, como
 * o gato, o pombo e o guaxinim, deslizavam). Puro: sem Babylon, para os testes.
 */
import type { PecaCriatura } from '../temas/tipos';

type V3 = [number, number, number];
type Papel = PecaCriatura['papel'];

export interface Junta<P extends PecaCriatura = PecaCriatura> {
  pivo: V3;
  papel: Papel;
  pecas: P[];
}

/** Peças de perna mais perto que isso (no chão, em x e z) são a mesma pata. */
const MESMA_PATA = 0.07;

const vol = (p: PecaCriatura) => p.t[0] * p.t[1] * p.t[2];

/** Agrupa as peças do bicho pelo que se mexe junto, cada grupo com o pivô da junta. */
export function juntasDoBicho<P extends PecaCriatura>(pecas: readonly P[]): Junta<P>[] {
  // a cabeça acena inteira em volta do pescoço (a base da maior peça de cabeça)
  const cabecaMaior = pecas
    .filter((q) => q.papel === 'cabeca')
    .sort((a, b) => vol(b) - vol(a))[0];
  const pescoco: V3 | null = cabecaMaior
    ? [cabecaMaior.p[0], cabecaMaior.p[1] - cabecaMaior.t[1] * 0.4, cabecaMaior.p[2]]
    : null;
  // o centro do corpo (a maior peça sem papel): o rabo abana do ponto dele mais perto daqui
  const corpo = pecas.filter((q) => !q.papel).sort((a, b) => vol(b) - vol(a))[0];
  const centro: V3 = corpo ? [corpo.p[0], corpo.p[1], corpo.p[2]] : [0, 0, 0];

  const juntas: Junta<P>[] = [];
  const porChave = new Map<string, Junta<P>>();
  const em = (chave: string, pivo: V3, papel: Papel, peca: P) => {
    let j = porChave.get(chave);
    if (!j) {
      j = { pivo, papel, pecas: [] };
      porChave.set(chave, j);
      juntas.push(j);
    }
    j.pecas.push(peca);
  };

  // patas: as peças de perna do mesmo lado do passo e no mesmo lugar do chão são uma pata só,
  // com o pivô no topo da peça mais alta (o quadril)
  const patas: { papel: Papel; x: number; z: number; topo: number; pecas: P[] }[] = [];
  for (const peca of pecas) {
    if (!peca.papel?.startsWith('perna')) continue;
    // a bolinha da junta (encaixe) fica no quadril: não muda o pivô
    const topo = (peca as { junta?: boolean }).junta ? -Infinity : peca.p[1] + peca.t[1] / 2;
    let pata = patas.find(
      (q) =>
        q.papel === peca.papel &&
        Math.abs(q.x - peca.p[0]) <= MESMA_PATA &&
        Math.abs(q.z - peca.p[2]) <= MESMA_PATA,
    );
    if (!pata) {
      pata = { papel: peca.papel, x: peca.p[0], z: peca.p[2], topo, pecas: [] };
      patas.push(pata);
    }
    pata.topo = Math.max(pata.topo, topo);
    pata.pecas.push(peca);
  }

  // rabo: a caixa de todas as peças de rabo; a junta é o ponto dela mais perto do corpo
  const rabo = pecas.filter((q) => q.papel === 'cauda');
  let baseRabo: V3 = [0, 0, 0];
  if (rabo.length) {
    const min: V3 = [Infinity, Infinity, Infinity];
    const max: V3 = [-Infinity, -Infinity, -Infinity];
    for (const q of rabo)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], q.p[k] - q.t[k] / 2);
        max[k] = Math.max(max[k], q.p[k] + q.t[k] / 2);
      }
    baseRabo = [0, 1, 2].map((k) => Math.min(max[k], Math.max(min[k], centro[k]))) as V3;
  }

  // asas: a borda de dentro da maior peça de cada asa
  const asaMaior = new Map<Papel, P>();
  for (const q of pecas)
    if (q.papel?.startsWith('asa')) {
      const a = asaMaior.get(q.papel);
      if (!a || vol(q) > vol(a)) asaMaior.set(q.papel, q);
    }

  for (const peca of pecas) {
    const papel = peca.papel;
    if (!papel) em('corpo', [0, 0, 0], papel, peca);
    else if (papel === 'cabeca' && pescoco) em('cabeca', pescoco, papel, peca);
    else if (papel.startsWith('perna')) {
      const pata = patas.find((q) => q.pecas.includes(peca))!;
      em(`pata|${patas.indexOf(pata)}`, [0, pata.topo, pata.z], papel, peca);
    } else if (papel === 'cauda') em('cauda', baseRabo, papel, peca);
    else if (papel.startsWith('asa')) {
      const a = asaMaior.get(papel)!;
      const lado = Math.sign(a.p[0] || (papel === 'asa0' ? 1 : -1));
      em(papel, [a.p[0] - lado * (a.t[0] / 2), a.p[1], a.p[2]], papel, peca);
    } else if (papel === 'antena') {
      // cada antena gira da própria base
      const pivo: V3 = [peca.p[0], peca.p[1] - peca.t[1] / 2, peca.p[2]];
      em(`antena|${pivo.map((v) => v.toFixed(3)).join(',')}`, pivo, papel, peca);
    } else {
      const pivo: V3 = [peca.p[0], peca.p[1], peca.p[2]];
      em(`${papel}|${pivo.map((v) => v.toFixed(3)).join(',')}`, pivo, papel, peca);
    }
  }
  return juntas;
}

/** A perna mais comprida (o quadril mais alto acima dos pés): 0 para bicho sem pernas. */
export function alturaDoQuadril(juntas: readonly Junta[]): number {
  let h = 0;
  for (const j of juntas) if (j.papel?.startsWith('perna')) h = Math.max(h, j.pivo[1]);
  return h;
}

/** Quanto a pata que vai para a frente sobe no passo (blocos). */
export function ergueDaPata(quadril: number | readonly Junta[]): number {
  const q = typeof quadril === 'number' ? quadril : alturaDoQuadril(quadril);
  return Math.min(0.06, q * 0.18);
}

/** Ritmo mais rápido das patas (rad/s), maior para perna curta (como um pêndulo). */
export function ritmoMaximo(perna: number): number {
  return Math.min(40, Math.max(20, 27 * Math.sqrt(0.3 / Math.max(0.05, perna))));
}

/** Abertura do passo (rad) que o bicho quer nesta rapidez: passo curto parado, largo correndo. */
export function aberturaDoPasso(rapidez: number): number {
  if (rapidez <= 0.02) return 0;
  return Math.min(1, rapidez / 0.35) * Math.min(0.62, 0.3 + rapidez * 0.09);
}

/**
 * O ritmo das patas (rad/s) e a abertura que fazem o pé no chão andar para trás na rapidez do
 * chão: em meia volta do passo o pé percorre 2·perna·sen(abertura). Acima do ritmo máximo o
 * passo abre mais (galope), até 0,8 rad.
 */
export function passoSemDeslizar(
  rapidez: number,
  perna: number,
  abertura: number,
): { ritmo: number; abertura: number } {
  if (perna <= 0.01) return { ritmo: rapidez * 3.2, abertura };
  const a = Math.max(0.18, abertura);
  const ritmo = (Math.PI * rapidez) / (2 * perna * Math.sin(a));
  const teto = ritmoMaximo(perna);
  if (ritmo <= teto) return { ritmo, abertura };
  const s = Math.min(1, (Math.PI * rapidez) / (2 * perna * teto));
  return { ritmo: teto, abertura: Math.max(abertura, Math.min(0.8, Math.asin(s))) };
}
