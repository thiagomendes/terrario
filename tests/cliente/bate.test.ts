import { describe, expect, it } from 'vitest';
import { criarReplicaBate } from '../../src/cliente/bate';
import {
  PASSO_BATE,
  RAIO_CARRINHO,
  VEL_GUIAR,
  guiaDaRede,
  novoCarrinho,
  passoBate,
  vistaDoBate,
  type Batida,
  type Carrinho,
  type Guia,
  type PistaBate,
} from '../../src/jogo/bate';

/**
 * Spec 026 (parte 2): o que a tela mostra do bate-bate. Um núcleo de mentira anda os carrinhos
 * com a conta de verdade e a rede atrasa tudo; a tela de quem guia tem de responder na hora,
 * concordar com o núcleo e nunca dar pulo.
 */
const PISTA: PistaBate = { x0: 0, z0: 0, x1: 24, z1: 13 };
const QUADRO = 1 / 60;

/** O núcleo e a rede: `atraso` (s) de ida e de volta; `outros` guia os carrinhos que não são o dela. */
function montar(
  atraso: number,
  carros: Carrinho[],
  meu: number,
  outros: (t: number, i: number) => Guia = () => ({ x: 0, z: 0 }),
) {
  const r = criarReplicaBate(PISTA);
  let t = 0;
  let passo = 0;
  const chegando: { em: number; x: number; z: number; n: number }[] = [];
  const voltando: { em: number; v: number[]; t: number }[] = [];
  const fila: { x: number; z: number; n: number }[] = [];
  let guia = { x: 0, z: 0 };
  let ack = 0;
  const batidasNucleo: Batida[] = [];
  const batidasTela: Batida[] = [];
  let controle = { x: 0, z: 0 };
  const umQuadro = () => {
    t += QUADRO;
    // o núcleo: um passo a cada 0,05 s, com o controle que já chegou
    while ((passo + 1) * PASSO_BATE <= t + 1e-9) {
      passo++;
      const agora = passo * PASSO_BATE;
      for (let k = 0; k < chegando.length; )
        if (chegando[k].em <= agora) fila.push(...chegando.splice(k, 1));
        else k++;
      const q = fila.shift();
      if (q) {
        guia = guiaDaRede(q.x, q.z);
        ack = q.n;
      }
      const guias: Guia[] = carros.map((_, i) => (i === meu ? guia : outros(agora, i)));
      passoBate(PISTA, carros, guias, PASSO_BATE, batidasNucleo);
      voltando.push({ em: agora + atraso, v: vistaDoBate(carros, meu >= 0 ? ack : 0), t: agora });
    }
    for (let k = 0; k < voltando.length; )
      if (voltando[k].em <= t) {
        const [q] = voltando.splice(k, 1);
        r.receber(q.v, q.t, t);
      } else k++;
    r.guiar(controle.x, controle.z);
    r.quadro(
      QUADRO,
      t,
      (x, z, n) => chegando.push({ em: t + atraso, x, z, n }),
      (b) => batidasTela.push(b),
    );
  };
  const andar = (seg: number, cada?: () => void) => {
    for (let k = 0; k < Math.round(seg / QUADRO); k++) {
      umQuadro();
      cada?.();
    }
  };
  return {
    r,
    andar,
    carros,
    agora: () => t,
    guiar: (x: number, z: number) => (controle = { x, z }),
    batidasNucleo,
    batidasTela,
    naTela: (i: number) => r.carros(t)![i],
  };
}

describe('spec 026 (parte 2): o bate-bate na tela (a previsão de quem guia)', () => {
  for (const atraso of [0.02, 0.12, 0.3])
    it(`com ${atraso * 1000} ms de rede: o carrinho responde na hora, concorda com o núcleo e não dá pulo`, () => {
      const m = montar(atraso, [novoCarrinho(4, 6, Math.PI / 2), novoCarrinho(20, 3, 0)], 0);
      m.andar(1);
      m.r.definirMeu(0);
      m.andar(0.5);
      const x0 = m.naTela(0).x;
      // empurra o controle para o leste: em menos de um décimo de segundo já saiu do lugar
      m.guiar(1, 0);
      m.andar(0.1);
      expect(m.naTela(0).x).toBeGreaterThan(x0 + 0.005);
      let antes = m.naTela(0);
      let maiorPasso = 0;
      let paraTras = 0;
      m.andar(2.5, () => {
        const c = m.naTela(0);
        const d = Math.hypot(c.x - antes.x, c.z - antes.z);
        maiorPasso = Math.max(maiorPasso, d);
        if (c.x < antes.x - 1e-6) paraTras++;
        antes = c;
      });
      // liso: nunca anda num quadro mais que a velocidade (com uma folguinha) e nunca volta
      expect(maiorPasso).toBeLessThan(VEL_GUIAR * QUADRO * 1.6);
      expect(paraTras).toBe(0);
      // a previsão é a conta do núcleo: o acerto é de milésimos
      expect(m.r.info().maiorErro).toBeLessThan(0.02);
      // adiantado em relação ao núcleo (é a previsão): quanto mais rede, mais adiantado
      expect(m.naTela(0).x).toBeGreaterThan(m.carros[0].x - 0.01);
      // para: a tela e o núcleo acabam no mesmo lugar
      m.guiar(0, 0);
      m.andar(1.5);
      expect(m.naTela(0).x).toBeCloseTo(m.carros[0].x, 2);
      expect(m.naTela(0).z).toBeCloseTo(m.carros[0].z, 2);
      expect(m.r.info().pendentes).toBeLessThanOrEqual(Math.ceil((2 * atraso) / PASSO_BATE) + 2);
    });

  it('a batida num carrinho parado aparece na hora na tela (os para-choques se tocam) e o núcleo confirma a mesma', () => {
    const m = montar(0.12, [novoCarrinho(4, 6, Math.PI / 2), novoCarrinho(12, 6, 0)], 0);
    m.andar(0.5);
    m.r.definirMeu(0);
    m.guiar(1, 0);
    let menor = Infinity;
    let quandoTela = -1;
    let quandoNucleo = -1;
    m.andar(4, () => {
      const a = m.naTela(0);
      const b = m.naTela(1);
      menor = Math.min(menor, Math.hypot(b.x - a.x, b.z - a.z));
      if (quandoTela < 0 && m.batidasTela.length) quandoTela = m.agora();
      if (quandoNucleo < 0 && m.batidasNucleo.length) quandoNucleo = m.agora();
    });
    // na tela os dois se tocam de verdade: nunca um dentro do outro, nunca um vão entre eles
    expect(menor).toBeGreaterThan(2 * RAIO_CARRINHO - 0.12);
    expect(menor).toBeLessThan(2 * RAIO_CARRINHO + 0.12);
    expect(m.batidasTela.length).toBeGreaterThanOrEqual(1);
    expect(m.batidasTela[0]).toMatchObject({ a: 0, b: 1 });
    // a tela mostrou a batida antes de o núcleo fazê-la (a previsão), e as duas são a mesma
    expect(quandoTela).toBeLessThanOrEqual(quandoNucleo);
    expect(m.batidasNucleo[0].f).toBeCloseTo(m.batidasTela[0].f, 1);
    // o outro carrinho foi empurrado na tela também
    expect(m.naTela(1).x).toBeGreaterThan(12.2);
    m.guiar(0, 0);
    m.andar(1.5);
    for (const i of [0, 1]) expect(m.naTela(i).x).toBeCloseTo(m.carros[i].x, 1);
  });

  it('com outros carrinhos andando e virando (o que a tela não adivinha), nada dá pulo', () => {
    const outros = (t: number, i: number): Guia => {
      const a = t * 0.9 + i * 2.1;
      return { x: Math.sin(a) * 0.7, z: Math.cos(a * 1.3) * 0.7 };
    };
    const carros = [
      novoCarrinho(12, 6, 0),
      novoCarrinho(5, 4, 1),
      novoCarrinho(18, 4, 2),
      novoCarrinho(8, 9, 3),
      novoCarrinho(17, 9, 4),
    ];
    const m = montar(0.12, carros, 0, outros);
    m.andar(1);
    m.r.definirMeu(0);
    let antes = m.r.carros(m.agora())!.map((c) => ({ ...c }));
    let maior = 0;
    let k = 0;
    m.andar(40, () => {
      // ela guia em roda pela pista, atrás de quem estiver perto
      const a = (k++ * QUADRO) / 2.5;
      m.guiar(Math.sin(a), Math.cos(a));
      const agora = m.r.carros(m.agora())!;
      agora.forEach((c, i) => {
        maior = Math.max(maior, Math.hypot(c.x - antes[i].x, c.z - antes[i].z));
      });
      antes = agora.map((c) => ({ ...c }));
    });
    // bateram de verdade várias vezes, e mesmo assim nenhum carrinho pulou na tela
    expect(m.batidasNucleo.length).toBeGreaterThan(5);
    expect(maior).toBeLessThan(0.3);
    // a tela nunca fica longe do núcleo
    carros.forEach((c, i) => {
      expect(Math.hypot(m.naTela(i).x - c.x, m.naTela(i).z - c.z)).toBeLessThan(1.2);
    });
  });

  it('quem só olha vê os carrinhos lisos, um pouquinho atrasados, sem prever nada', () => {
    const m = montar(0.1, [novoCarrinho(3, 6, Math.PI / 2)], -1, () => ({ x: 1, z: 0 }));
    m.andar(1.5);
    let antes = m.naTela(0);
    let maior = 0;
    let menor = Infinity;
    m.andar(2, () => {
      const c = m.naTela(0);
      const d = c.x - antes.x;
      maior = Math.max(maior, d);
      menor = Math.min(menor, d);
      antes = c;
    });
    // velocidade quase constante na tela (o núcleo anda a 3,4 blocos/s)
    expect(maior).toBeLessThan(VEL_GUIAR * QUADRO * 1.5);
    expect(menor).toBeGreaterThan(VEL_GUIAR * QUADRO * 0.5);
    // atrás do núcleo, mas pouco
    expect(m.carros[0].x - m.naTela(0).x).toBeGreaterThan(0);
    expect(m.carros[0].x - m.naTela(0).x).toBeLessThan(VEL_GUIAR * 0.45);
    expect(m.r.info().seq).toBe(0);
  });

  it('sentar e descer não dão pulo; sem quadro do núcleo há tempo, os carrinhos não valem', () => {
    const m = montar(0.1, [novoCarrinho(3, 6, Math.PI / 2), novoCarrinho(9, 9, 0)], -1, (_t, i) =>
      i === 1 ? { x: 0.6, z: 0 } : { x: 0, z: 0 },
    );
    expect(m.r.carros(0)).toBeNull();
    m.andar(1);
    const a = m.naTela(1);
    m.r.definirMeu(0);
    m.andar(QUADRO);
    expect(Math.hypot(m.naTela(1).x - a.x, m.naTela(1).z - a.z)).toBeLessThan(0.08);
    m.andar(1);
    const b = m.naTela(1);
    m.r.definirMeu(-1);
    m.andar(QUADRO);
    // (de volta ao atraso de quem olha: o carrinho dos outros hesita um instante, sem pulo)
    expect(Math.hypot(m.naTela(1).x - b.x, m.naTela(1).z - b.z)).toBeLessThan(0.12);
    expect(m.r.carros(m.agora() + 5)).toBeNull();
  });
});
