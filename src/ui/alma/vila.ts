/**
 * Spec 026: a Vila Neon no aparelho (o que a criança toca). O núcleo decide tudo (estojos,
 * caixas, show, lhamas, arcos, moedinhas); aqui fica o toque generoso:
 *
 * - **as três caixas do palco** (brinquedo livre fora do show): com a criança perto (no palco, no
 *   pé dele ou na plateia), o dedo pega a caixa que estiver perto dele (alvo de 80 px, como a 031);
 * - **o show é só para ver e dançar** (o dono, 16 nov 2026): nenhum toque toca acorde nem
 *   dispara o fim; o dedo é todo do jogo (o arrastar gira a câmera o show inteiro);
 * - **o suporte dos patins** (um toque calça, outro tira; arrastar o dedo por cima dele não
 *   calça) e os brinquedos de tocar;
 * - **o feno na mão (f2):** o "pop" do feno que aparece perto das lhamas, já selecionado;
 * - **as missões do parque (parte 2, etapa B):** o balão fugido (um toque de perto, de baixo), o
 *   fardo de feno e o cocho, as barracas de prendas; a prenda, o feno, a fita e a vitamina que
 *   chegam aparecem na mão com o "pop";
 * - **os toques da Rua anos 80:** o orelhão, a parede de fitas da locadora, o balcão da
 *   lanchonete, as revistas da banca e a campainha das bicicletas (o toque de verdade: arrastar o
 *   dedo por cima continua da câmera).
 *
 * Cada coisa que se toca tem a dica de toque (a mãozinha e o balãozinho com o desenho).
 */
import type { Scene } from '@babylonjs/core/scene';
import type { EstadoDepuracao } from '../../render/cena';
import type { GuiaMissao } from '../../render/guiaMissao';
import type { AlmaUi } from './index';
import { missaoFixada } from './hud';
import { figura } from './figuras';
import { tocarSomInterface } from '../../audio/somInterface';
import { alcancaOPalco, faseDoShow, type FaseShow } from '../../jogo/show';
import { foiToque } from '../../jogo/rinque';
import {
  alcancaOBrinquedo,
  distanciaDoBrinquedo,
  noTapete,
  type Brinquedo,
} from '../../jogo/parque';
import { boaParaDica, criarDicaToque } from './dicaToque';
import { arte as arteAlma } from './arte';
import { CSS_CANTO, maoAtrasDoBoneco } from './canto';
import { criarRevista } from './revista';
import {
  ALCANCE_COCHO,
  ALCANCE_FARDO,
  ALCANCE_LOJA,
  F_BALOES,
  F_LANCHE,
  F_PRENDA,
  MAX_FITAS,
  MAX_VITAMINAS,
  N_BALOES,
  PRENDAS,
  alcancaOBalao,
  fenoNaMochila,
  lugarDoBalao,
} from '../../jogo/missoesParque';
import {
  CUBO_CORES,
  FATIA_BOLO,
  FENO,
  FITA_VIDEO,
  IOIO,
  PELUCIA,
  PIAO,
  VITAMINA,
} from '../../jogo/exclusivos';
import { ALCANCE_ESPALHADO, ESPALHADOS, F_QUARTO, QUARTO } from '../../jogo/missoesCasa';
import {
  ALCANCE_DISCOS,
  alcancaATv,
  alcancaOBau,
  dentroDaCasa,
  naSala,
  passaFilme,
  proximoDoBau,
} from '../../jogo/casa';

declare global {
  interface Window {
    /** Spec 026 (testes de tela): as caixas na tela e a fase do show. */
    __vila?: {
      plano(): unknown;
      caixas(): { i: number; t: { x: number; y: number } }[];
      show(): FaseShow | null;
      /** A dica de toque à vista (o suporte dos patins, um brinquedo de sentar), ou null. */
      dica(): { chave: string; texto: string; t: { x: number; y: number } } | null;
      /** Spec 026 (parte 2): onde ficam na tela os brinquedos do parque (null: fora da tela). */
      parque(): {
        sentar: { b: number; t: { x: number; y: number } | null }[];
        tocar: { qual: string; i: number; t: { x: number; y: number } | null }[];
      };
      /**
       * Etapa B: o que se toca agora nas missões do parque e na rua (a chave, se a criança está
       * ao alcance e onde fica na tela; null: fora da tela).
       */
      toques(): {
        chave: string;
        perto: boolean;
        /** Onde fica no mundo e na tela. */
        p: [number, number, number];
        t: { x: number; y: number } | null;
      }[];
      /** Etapa B: a revista da banca está aberta na tela? */
      revista(): boolean;
    };
  }
}

/** Raio do toque na caixa (px): o alvo generoso da 031 (80 px de diâmetro). */
const RAIO_TOQUE = 40;

type Tela = { x: number; y: number };

export function ligarVilaNeon(
  e: EstadoDepuracao,
  ui: AlmaUi,
  guia: GuiaMissao,
  scene: Scene,
): void {
  const plano = e.vila?.();
  if (!plano) return;
  const p = plano.pontos;
  const st = document.createElement('style');
  st.textContent = CSS_CANTO;
  document.head.appendChild(st);
  const tela = (x: number, y: number, z: number) => e.telaDoPonto?.(x, y, z) ?? null;
  const missao = () => missaoFixada(ui.vista())?.m.id ?? null;
  const noJogo = () => {
    const b = document.body;
    return (
      !b.dataset.overlay &&
      !b.classList.contains('modo-foto') &&
      !b.classList.contains('tela-titulo')
    );
  };
  /**
   * A criança está no palco, no pé dele ou na plateia (as caixas ao alcance do dedo): a mesma
   * conta do núcleo (`alcancaOPalco`), para todo toque que a tela aceita valer lá também.
   */
  const pertoDoPalco = () => {
    const pes = e.jogadorPes?.();
    return !!pes && alcancaOPalco(p.palco, pes[0], pes[2]);
  };
  /** O show acontecendo agora (da abertura ao aplauso), e a criança perto o bastante: a fase. */
  const showTocando = (): FaseShow | null => {
    const v = e.vilaEstado?.();
    if (!v?.show) return null;
    const fase = faseDoShow(v.show, e.vilaTempo?.() ?? v.t);
    if (fase === 'acabou') return null;
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    const r = p.palco;
    const g = p.plateia;
    const naPlateia =
      pes[0] >= g.x0 - 2 && pes[0] <= g.x1 + 2 && pes[2] >= g.z0 - 4 && pes[2] <= r.z1 + 2;
    return pertoDoPalco() || naPlateia ? fase : null;
  };
  /** As caixas à vista (o centro na tela de cada uma). */
  function caixasNaTela(): { i: number; t: Tela }[] {
    if (!noJogo() || !pertoDoPalco()) return [];
    const r: { i: number; t: Tela }[] = [];
    p.caixas.forEach(([x, y, z], i) => {
      const t = tela(x + 0.5, y + 1, z + 0.5);
      if (t) r.push({ i, t });
    });
    return r;
  }

  /**
   * O brinquedo de tocar perto do dedo: as máquinas (a tela), o rádio e a fita gigantes (o meio
   * da peça, com o alvo do tamanho dela). Só com a criança perto (nada toca do outro lado da rua).
   */
  type QualBrinquedo = 'fliperama' | 'radio' | 'fita';
  const BRINQUEDOS: {
    qual: QualBrinquedo;
    i: number;
    p: [number, number, number];
    alt: number;
    perto: number;
    raio: number;
  }[] = [
    ...plano.pecas
      .filter((q) => q.tipo === 'maquina')
      .sort((a, b) => (a.n ?? 0) - (b.n ?? 0))
      .map((q, i) => ({
        qual: 'fliperama' as const,
        i,
        p: [q.x, q.y, q.z] as [number, number, number],
        alt: 1.9,
        perto: 6,
        raio: RAIO_TOQUE * 1.2,
      })),
    { qual: 'radio', i: 0, p: p.radio, alt: 1.4, perto: 9, raio: RAIO_TOQUE * 2.6 },
    { qual: 'fita', i: 0, p: p.fita, alt: 1.6, perto: 9, raio: RAIO_TOQUE * 2.4 },
  ];
  function brinquedoNoDedo(x: number, y: number): { qual: QualBrinquedo; i: number } | null {
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    let melhor: { d: number; qual: QualBrinquedo; i: number } | null = null;
    for (const b of BRINQUEDOS) {
      const dist = Math.hypot(pes[0] - b.p[0], pes[2] - b.p[2]);
      if (dist > b.perto) continue;
      const t = tela(b.p[0], b.p[1] + b.alt, b.p[2]);
      if (!t) continue;
      // de perto a peça fica grande na tela: o alvo cresce junto
      const raio = b.raio * Math.max(1, 4 / Math.max(1, dist));
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= raio && (!melhor || d < melhor.d)) melhor = { d, qual: b.qual, i: b.i };
    }
    return melhor;
  }

  /** A dica de toque que a criança já usou (o suporte dos patins, um brinquedo): some até ela se afastar. */
  let dicaUsada: string | null = null;
  // ---------------------------------------------------------------- o parque (parte 2)
  const pq = p.parque;
  const chaoVila = plano.h + 1;
  /**
   * Os três brinquedos de sentar: onde o dedo pega cada um (a cadeirinha de baixo e o miolo da
   * roda; o meio do carrossel; o meio da pista), com o alvo grande de quem tem 3 anos.
   */
  /** O carrinho livre do bate-bate que a criança pegaria agora (null: nenhum ao alcance). */
  const carrinhoLivre = (): [number, number, number] | null => {
    const i = e.vilaParque?.carrinhoLivre() ?? -1;
    if (i < 0) return null;
    const c = e.vilaParque?.carros()?.[i];
    const v = pq.bate.vagas[i];
    return c ? [c.x, chaoVila + 0.9, c.z] : v ? [v[0], chaoVila + 0.9, v[1]] : null;
  };
  const DE_SENTAR: {
    b: number;
    nome: Brinquedo;
    alvos(): [number, number, number][];
    raio: number;
  }[] = [
    {
      b: 0,
      nome: 'roda',
      alvos: () => [
        [pq.roda.x, chaoVila + 1.6, pq.roda.z],
        [pq.roda.x, pq.roda.y, pq.roda.z],
        [pq.roda.x, pq.roda.y - pq.roda.raio * 0.5, pq.roda.z],
      ],
      raio: RAIO_TOQUE * 2.2,
    },
    {
      b: 1,
      nome: 'carrossel',
      alvos: () => [[pq.carrossel.x, chaoVila + 3, pq.carrossel.z]],
      raio: RAIO_TOQUE * 2.8,
    },
    {
      // (o bate-bate é de guiar: o dedo pega o carrinho livre mais perto da criança)
      b: 2,
      nome: 'bate',
      alvos: () => {
        const c = carrinhoLivre();
        return c ? [c] : [];
      },
      raio: RAIO_TOQUE * 2.2,
    },
  ];
  /** A criança alcança o brinquedo para sentar? (No bate-bate: há um carrinho livre ao alcance.) */
  const alcanca = (nome: Brinquedo, x: number, z: number) =>
    nome === 'bate' ? !!carrinhoLivre() : alcancaOBrinquedo(pq, nome, x, z);
  /** Até onde (blocos) o toque num brinquedo de sentar ainda faz alguma coisa (a roda pisca). */
  const LONGE_DE_SENTAR = 14;
  function brinquedoDeSentarNoDedo(x: number, y: number): (typeof DE_SENTAR)[number] | null {
    return sentarNoDedo(x, y)?.q ?? null;
  }
  /** A cadeira de brinquedo mais perto do dedo e a que distância dele (px). */
  function sentarNoDedo(
    x: number,
    y: number,
  ): { d: number; q: (typeof DE_SENTAR)[number] } | null {
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    let melhor: { d: number; q: (typeof DE_SENTAR)[number] } | null = null;
    for (const q of DE_SENTAR) {
      const dist = distanciaDoBrinquedo(pq, q.nome, pes[0], pes[2]);
      if (dist > LONGE_DE_SENTAR) continue;
      for (const a of q.alvos()) {
        const t = tela(a[0], a[1], a[2]);
        if (!t) continue;
        const raio = q.raio * Math.max(1, 5 / Math.max(1, dist + 2));
        const d = Math.hypot(t.x - x, t.y - y);
        if (d <= raio && (!melhor || d < melhor.d)) melhor = { d, q };
      }
    }
    return melhor;
  }
  /** Os brinquedos de tocar do parque (os balões, as barracas, a pipoca, o algodão-doce). */
  const DE_TOCAR: {
    qual: 'baloes' | 'argola' | 'pescaria' | 'pipoca' | 'algodao';
    i: number;
    p: [number, number, number];
    alt: number;
    perto: number;
    raio: number;
  }[] = [
    { qual: 'baloes', i: 0, p: pq.baloes, alt: 3.3, perto: 9, raio: RAIO_TOQUE * 1.7 },
    { qual: 'argola', i: 0, p: pq.argola, alt: 1.5, perto: 8, raio: RAIO_TOQUE * 2.2 },
    { qual: 'pescaria', i: 0, p: pq.pescaria, alt: 1.3, perto: 8, raio: RAIO_TOQUE * 2.2 },
    { qual: 'algodao', i: 0, p: pq.algodao, alt: 1.4, perto: 7, raio: RAIO_TOQUE * 1.5 },
    ...plano.pecas
      .filter((q) => q.tipo === 'pipoca')
      .map((q, i) => ({
        qual: 'pipoca' as const,
        i,
        p: [q.x, q.y, q.z] as [number, number, number],
        alt: 1.4,
        perto: 7,
        raio: RAIO_TOQUE * 1.5,
      })),
  ];
  function brinquedoDoParqueNoDedo(x: number, y: number): (typeof DE_TOCAR)[number] | null {
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    let melhor: { d: number; q: (typeof DE_TOCAR)[number] } | null = null;
    for (const b of DE_TOCAR) {
      const dist = Math.hypot(pes[0] - b.p[0], pes[2] - b.p[2]);
      if (dist > b.perto) continue;
      const t = tela(b.p[0], b.p[1] + b.alt, b.p[2]);
      if (!t) continue;
      const raio = b.raio * Math.max(1, 4 / Math.max(1, dist));
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= raio && (!melhor || d < melhor.d)) melhor = { d, q: b };
    }
    return melhor?.q ?? null;
  }
  /**
   * O dedo que desceu em cima de um brinquedo de sentar: como no suporte dos patins, só o toque
   * de verdade vale (desce e sobe no mesmo lugar); arrastar por cima continua da câmera.
   */
  let noBrinquedo: { id: number; x: number; y: number; t: number; b: number } | null = null;
  function soltouNoBrinquedo(ev: PointerEvent): void {
    const d = noBrinquedo;
    if (!d || ev.pointerId !== d.id) return;
    noBrinquedo = null;
    if (ev.type !== 'pointerup' || !noJogo()) return;
    if (!foiToque(ev.clientX - d.x, ev.clientY - d.y, performance.now() - d.t)) return;
    const q = DE_SENTAR[d.b];
    const pes = e.jogadorPes?.();
    if (!q || !pes) return;
    if (alcanca(q.nome, pes[0], pes[2])) e.vilaParque?.sentar(q.b);
    // de mais longe (ou com tudo ocupado) a roda pisca e o carrossel toca o realejo
    else if (q.nome !== 'bate') e.vilaParque?.tocar(q.nome);
  }
  window.addEventListener('pointerup', soltouNoBrinquedo, { capture: true });
  window.addEventListener('pointercancel', soltouNoBrinquedo, { capture: true });

  // ---------------------------------------------------------------- etapa B: as missões e a rua
  const revista = criarRevista();
  const rua = p.rua;
  /** A missão está aberta para a criança agora (uma das da vez, ou o bis)? */
  const aberta = (id: string) => !!ui.vista()?.abertas.some((a) => a.id === id);
  /** Os passos já feitos de uma missão de lugares (a argola, a pescaria). */
  const usosDe = (id: string) => ui.vista()?.abertas.find((a) => a.id === id)?.usos ?? [];
  /** Parte 3B (f10): o brinquedo espalhado `i` ainda está no chão para esta criança? */
  const espalhadoNoChao = (i: number) =>
    aberta(F_QUARTO) && !usosDe(F_QUARTO).includes(QUARTO[i]) && !e.vilaEstado?.()?.qto?.[i];
  /** Quantos deste item a criança tem na mochila. */
  const tem = (item: string): number => {
    const inv = e.inventario;
    if (!inv) return 0;
    let n = 0;
    for (let i = 0; i < 36; i++) {
      const s = inv.obter(i);
      if (s?.item === item) n += s.qtd;
    }
    return n;
  };
  const tNucleo = () => e.vilaTempo?.() ?? e.vilaEstado?.()?.t ?? 0;
  const pertoDoPonto = (q: readonly number[], alcance: number) => (x: number, z: number) =>
    Math.hypot(q[0] - x, q[2] - z) <= alcance;
  /**
   * Uma coisa que se toca nas missões do parque ou na rua: onde o dedo a pega, de onde a criança
   * a alcança (a mesma conta do núcleo), o que o toque faz e a dica de toque.
   */
  interface ToqueB {
    chave: string;
    /** Vale agora (a missão aberta, o balão ainda preso, o feno na mão)? */
    ativo(): boolean;
    /** Onde fica (mundo): o dedo pega ali, e a mãozinha da dica aponta ali. */
    ponto(): [number, number, number];
    alcanca(x: number, z: number): boolean;
    /** O raio do alvo na tela (px). */
    raio: number;
    /** Responde assim que o dedo desce (as missões); sem isto, só o toque de verdade vale. */
    naHora?: boolean;
    tocar(): void;
    /** A dica: o desenho, as palavras e até onde (blocos) ela aparece. */
    dica?: { figura: string; texto: string; ate?: number };
    /** A dica aparece agora? (A fita que ela já tem não chama de novo.) */
    comDica?(): boolean;
  }
  const comando = (c: Parameters<NonNullable<EstadoDepuracao['vilaMissoes']>['comando']>[0]) =>
    e.vilaMissoes?.comando(c);
  const TOQUES_B: ToqueB[] = [
    // f6: os três balões fugidos (o do carrossel gira com o toldo: o alvo vai junto)
    ...Array.from({ length: N_BALOES }, (_, i): ToqueB => ({
      chave: `balao-${i}`,
      ativo: () => aberta(F_BALOES) && !e.vilaEstado?.()?.bal?.[i],
      ponto: () => {
        // (a ponta do dedo embaixo do balão: a mãozinha da dica não o cobre)
        const b = lugarDoBalao(pq, chaoVila, i, tNucleo());
        return [b.x, b.y - 0.55, b.z];
      },
      alcanca: (x, z) => alcancaOBalao(pq, chaoVila, i, tNucleo(), x, z),
      raio: RAIO_TOQUE * 2.4,
      naHora: true,
      tocar: () => comando({ a: 'balao', i }),
      dica: { figura: 'dicaPegarBalao', texto: 'Toque para pegar', ate: 7.5 },
    })),
    // f7: o fardo (sem feno na mão) e o cocho (com o feno)
    {
      chave: 'fardo',
      ativo: () => aberta(F_LANCHE) && fenoNaMochila(tem) < 1,
      ponto: () => [pq.fardo[0], pq.fardo[1] - 0.6, pq.fardo[2]],
      alcanca: pertoDoPonto(pq.fardo, ALCANCE_FARDO),
      raio: RAIO_TOQUE * 2.2,
      naHora: true,
      tocar: () => comando({ a: 'feno' }),
      dica: { figura: 'dicaFeno', texto: 'Toque para pegar' },
    },
    {
      chave: 'cocho',
      ativo: () => aberta(F_LANCHE) && fenoNaMochila(tem) > 0,
      ponto: () => [pq.cocho[0], pq.cocho[1] + 0.7, pq.cocho[2]],
      alcanca: pertoDoPonto(pq.cocho, ALCANCE_COCHO),
      raio: RAIO_TOQUE * 2.4,
      naHora: true,
      tocar: () => comando({ a: 'cocho' }),
      dica: { figura: 'dicaCocho', texto: 'Toque para dar' },
    },
    // f8: as barracas de prendas (com a missão aberta, o toque conta; sem ela, é só brinquedo)
    ...(['argola', 'pescaria'] as const).map(
      (qual, i): ToqueB => ({
        chave: qual,
        ativo: () => aberta(F_PRENDA) && !usosDe(F_PRENDA).includes(PRENDAS[i]),
        ponto: () => [pq[qual][0], pq[qual][1] + (i ? 1.3 : 1.5), pq[qual][2]],
        alcanca: pertoDoPonto(pq[qual], 8),
        raio: RAIO_TOQUE * 2.2,
        naHora: true,
        tocar: () => {
          e.vilaParque?.tocar(qual);
          comando({ a: 'prenda', i });
        },
        dica: { figura: i ? 'dicaPescaria' : 'dicaArgola', texto: i ? 'Toque para pescar' : 'Toque para jogar', ate: 5.5 },
      }),
    ),
    // a Rua anos 80
    {
      chave: 'orelhao',
      ativo: () => true,
      ponto: () => [rua.orelhao[0], rua.orelhao[1] + 1.4, rua.orelhao[2]],
      alcanca: pertoDoPonto(rua.orelhao, 5),
      raio: RAIO_TOQUE * 1.7,
      tocar: () => e.vilaMissoes?.rua('orelhao'),
      dica: { figura: 'dicaTelefone', texto: 'Toque para ligar' },
    },
    {
      chave: 'fitas',
      ativo: () => true,
      ponto: () => [rua.fitas[0], rua.fitas[1] + 1.2, rua.fitas[2]],
      alcanca: pertoDoPonto(rua.fitas, ALCANCE_LOJA),
      raio: RAIO_TOQUE * 2.4,
      tocar: () => {
        if (tem(FITA_VIDEO) < MAX_FITAS) comando({ a: 'fita' });
        e.vilaMissoes?.rua('fita');
      },
      dica: { figura: 'dicaFita', texto: 'Toque para pegar', ate: 5 },
      comDica: () => tem(FITA_VIDEO) < MAX_FITAS,
    },
    {
      chave: 'vitamina',
      ativo: () => true,
      ponto: () => [rua.balcao[0], rua.balcao[1] + 1.2, rua.balcao[2]],
      alcanca: pertoDoPonto(rua.balcao, ALCANCE_LOJA),
      raio: RAIO_TOQUE * 2.6,
      tocar: () => {
        if (tem(VITAMINA) < MAX_VITAMINAS) comando({ a: 'vitamina' });
        e.vilaMissoes?.rua('vitamina');
      },
      dica: { figura: 'dicaVitamina', texto: 'Toque para pedir', ate: 5 },
      comDica: () => tem(VITAMINA) < MAX_VITAMINAS,
    },
    {
      chave: 'revista',
      ativo: () => true,
      ponto: () => [rua.revistas[0], rua.revistas[1] + 1.5, rua.revistas[2]],
      alcanca: pertoDoPonto(rua.revistas, 5.5),
      raio: RAIO_TOQUE * 2.2,
      tocar: () => {
        e.vilaMissoes?.rua('revista');
        revista.abrir();
      },
      dica: { figura: 'dicaRevista', texto: 'Toque para ver', ate: 5 },
    },
    // a campainha das bicicletas (sem dica: são muitas, e a tela fica limpa)
    ...rua.bicicletas.map(
      (b, i): ToqueB => ({
        chave: `bici-${i}`,
        ativo: () => true,
        ponto: () => [b[0], b[1] + 0.9, b[2]],
        alcanca: pertoDoPonto(b, 4),
        raio: RAIO_TOQUE * 1.3,
        tocar: () => e.vilaMissoes?.rua('campainha', i),
      }),
    ),
    ...toquesDaCasa(),
  ];
  /**
   * Parte 3: o que se toca na Casa anos 80 (a TV, o videocassete com a fita da locadora, o
   * toca-discos, o telefone de disco, o sofá, os brinquedos do quarto e o baú) e o suporte dos
   * skates da pista. Só o toque de verdade vale (arrastar o dedo por cima é da câmera).
   */
  function toquesDaCasa(): ToqueB[] {
    const c = p.casa;
    const Yc = c.y;
    const sala = () => e.vilaCasa?.sala() ?? null;
    const filme = () => {
      const s = sala();
      return !!s && passaFilme(s, tNucleo());
    };
    const naSalaPerto = (q: readonly number[], alcance: number) => (x: number, z: number) =>
      naSala(c, x, z) && Math.hypot(q[0] - x, q[2] - z) <= alcance;
    /** A criança já está sentada num assento do sofá? */
    const noSofa = () => {
      const pes = e.jogadorPes?.();
      return (
        !!pes &&
        c.sofa.assentos.some(
          (a) => Math.hypot(a.x - pes[0], a.z - pes[2]) < 0.45 && Math.abs(a.y - pes[1]) < 0.3,
        )
      );
    };
    const espalhadoAVista = espalhadoNoChao;
    /** Com a f10 aberta e um brinquedo espalhado na mão: o baú guarda. */
    const guardaNoBau = () =>
      aberta(F_QUARTO) &&
      QUARTO.some((u, i) => !!e.vilaEstado?.()?.qto?.[i] && !usosDe(F_QUARTO).includes(u));
    const vcr: [number, number, number] = [c.tv[0] - 0.5, Yc + 0.27, c.tv[2] + 0.34];
    const assento = c.sofa.assentos[1];
    const brinquedo = (
      chave: 'ioio' | 'piao' | 'cubo' | 'robo' | 'bola',
      q: readonly number[],
      alt: number,
      figura?: string,
    ): ToqueB => ({
      chave,
      ativo: () => true,
      ponto: () => [q[0], q[1] + alt, q[2]],
      alcanca: (x, z) => dentroDaCasa(c, x, z) && Math.hypot(q[0] - x, q[2] - z) <= 3.6,
      raio: RAIO_TOQUE * 1.7,
      tocar: () => e.vilaCasa?.tocar(chave),
      ...(figura ? { dica: { figura, texto: 'Toque para brincar', ate: 3.2 } } : {}),
    });
    const sk = p.skate.suporte;
    const deSkate = () => !!e.personagem?.aparencia().skate;
    return [
      {
        chave: 'tv',
        ativo: () => !filme(),
        ponto: () => [c.tela[0], c.tela[1], c.tela[2]],
        alcanca: (x, z) => alcancaATv(c, x, z),
        raio: RAIO_TOQUE * 2.4,
        tocar: () => e.vilaCasa?.tocar('tv'),
        dica: { figura: 'dicaTv', texto: 'Toque para trocar o canal', ate: 5.5 },
        // (com a fita na mochila, a dica é a do videocassete)
        comDica: () => tem(FITA_VIDEO) < 1,
      },
      {
        chave: 'videocassete',
        ativo: () => tem(FITA_VIDEO) > 0 && !filme(),
        ponto: () => vcr,
        alcanca: (x, z) => alcancaATv(c, x, z),
        raio: RAIO_TOQUE * 1.8,
        tocar: () => e.vilaCasa?.tocar('videocassete'),
        dica: { figura: 'dicaVideocassete', texto: 'Toque para pôr a fita', ate: 5.5 },
      },
      {
        chave: 'disco',
        ativo: () => true,
        ponto: () => [c.prato[0], c.prato[1] + 0.05, c.prato[2]],
        alcanca: naSalaPerto(c.discos, ALCANCE_DISCOS),
        raio: RAIO_TOQUE * 2,
        tocar: () => e.vilaCasa?.tocar('disco'),
        dica: { figura: 'dicaDisco', texto: 'Toque para ouvir', ate: 4.2 },
        // (tocando, a dica sai: quem quiser parar toca de novo)
        comDica: () => (sala()?.disco ?? -1) < 0,
      },
      {
        chave: 'telefone',
        ativo: () => true,
        ponto: () => [c.fone[0], c.fone[1] + 0.05, c.fone[2]],
        alcanca: naSalaPerto(c.telefone, 4),
        raio: RAIO_TOQUE * 1.8,
        tocar: () => e.vilaCasa?.tocar('telefone'),
        dica: { figura: 'dicaTelefone', texto: 'Toque para ligar', ate: 3.2 },
      },
      {
        chave: 'sofa',
        ativo: () => !noSofa(),
        ponto: () => [assento.x, assento.y + 0.35, assento.z],
        alcanca: naSalaPerto([c.sofa.x, 0, c.sofa.z], 3.6),
        raio: RAIO_TOQUE * 2.4,
        tocar: () => void e.vilaCasa?.sentar(),
        dica: { figura: 'dicaSofa', texto: 'Toque para sentar', ate: 3.2 },
      },
      brinquedo('ioio', c.ioio, 0.95, 'dicaIoio'),
      brinquedo('piao', c.piao, 0.22, 'dicaPiao'),
      brinquedo('cubo', c.cubo, 0.3, 'dicaCubo'),
      brinquedo('robo', c.robo, 0.6, 'dicaRobo'),
      brinquedo('bola', c.bola, 0.3),
      // parte 3B (f10): os brinquedos espalhados (um toque pega) e o baú que guarda
      ...ESPALHADOS.map(
        (_, i): ToqueB => ({
          chave: `espalhado-${i}`,
          ativo: () => espalhadoAVista(i),
          ponto: () => {
            const q = c.espalhados[i];
            return [q[0], q[1] + 0.25, q[2]];
          },
          alcanca: (x, z) =>
            Math.hypot(c.espalhados[i][0] - x, c.espalhados[i][2] - z) <= ALCANCE_ESPALHADO,
          raio: RAIO_TOQUE * 1.9,
          naHora: true,
          tocar: () => comando({ a: 'brinquedo', i }),
          dica: {
            figura: ['dicaIoio', 'dicaPiao', 'dicaCubo'][i],
            texto: 'Toque para pegar',
            ate: 4.4,
          },
        }),
      ),
      {
        chave: 'bau-guardar',
        ativo: () => guardaNoBau(),
        ponto: () => [c.bau[0], c.bau[1] + 0.62, c.bau[2]],
        alcanca: (x, z) => alcancaOBau(c, x, z),
        raio: RAIO_TOQUE * 2.2,
        naHora: true,
        tocar: () => e.vilaCasa?.tocar('bau'),
        dica: { figura: 'dicaGuardar', texto: 'Toque para guardar', ate: 3.6 },
      },
      {
        chave: 'bau',
        // (com a f10 aberta o baú só guarda)
        ativo: () => proximoDoBau(tem) !== null && !aberta(F_QUARTO),
        ponto: () => [c.bau[0], c.bau[1] + 0.62, c.bau[2]],
        alcanca: (x, z) => alcancaOBau(c, x, z),
        raio: RAIO_TOQUE * 2,
        tocar: () => e.vilaCasa?.tocar('bau'),
        dica: { figura: 'dicaBau', texto: 'Toque para pegar', ate: 3.4 },
      },
      // o suporte dos skates: um toque pega (ou guarda, de skate)
      ...[false, true].map(
        (guardar): ToqueB => ({
          chave: guardar ? 'skate-guardar' : 'skate',
          ativo: () => deSkate() === guardar,
          ponto: () => [sk[0], sk[1] + 0.95, sk[2]],
          alcanca: pertoDoPonto(sk, 4),
          raio: RAIO_TOQUE * 1.9,
          tocar: () => e.vilaSkate?.(!guardar),
          dica: guardar
            ? { figura: 'guardarSkate', texto: 'Toque para guardar', ate: 4 }
            : { figura: 'pegarSkate', texto: 'Toque para pegar', ate: 4 },
        }),
      ),
    ];
  }
  /** O toque da etapa B perto do dedo (o mais perto, entre os que valem e que ela alcança). */
  function toqueBNoDedo(x: number, y: number): ToqueB | null {
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    let melhor: { d: number; q: ToqueB } | null = null;
    for (const q of TOQUES_B) {
      if (!q.ativo() || !q.alcanca(pes[0], pes[2])) continue;
      const a = q.ponto();
      const t = tela(a[0], a[1], a[2]);
      if (!t) continue;
      const dist = Math.hypot(pes[0] - a[0], pes[2] - a[2]);
      const raio = q.raio * Math.max(1, 4 / Math.max(1, dist));
      const d = Math.hypot(t.x - x, t.y - y);
      if (d <= raio && (!melhor || d < melhor.d)) melhor = { d, q };
    }
    if (!melhor) return null;
    // (a cadeira de um brinquedo mais perto do dedo ganha: o balão preso no pé da roda-gigante
    // não rouba o toque de quem quer sentar na cadeirinha ao lado)
    const cadeira = e.vilaParque?.sentado() ? null : sentarNoDedo(x, y);
    if (cadeira && cadeira.d < melhor.d) return null;
    return melhor.q;
  }
  /** O dedo que desceu num toque da rua: só o toque de verdade vale (desce e sobe no lugar). */
  let noToqueB: { id: number; x: number; y: number; t: number; q: ToqueB } | null = null;
  function soltouNoToqueB(ev: PointerEvent): void {
    const d = noToqueB;
    if (!d || ev.pointerId !== d.id) return;
    noToqueB = null;
    if (ev.type !== 'pointerup' || !noJogo()) return;
    if (!foiToque(ev.clientX - d.x, ev.clientY - d.y, performance.now() - d.t)) return;
    d.q.tocar();
    dicaUsada = d.q.chave;
  }
  window.addEventListener('pointerup', soltouNoToqueB, { capture: true });
  window.addEventListener('pointercancel', soltouNoToqueB, { capture: true });

  // ---------------------------------------------------------------- o toque generoso
  let engoliuAte = 0;
  /**
   * O dedo que desceu em cima do suporte dos patins (dono, 16 nov 2026: "entrar no rinque calça
   * os patins sozinho"): antes, qualquer dedo que descia perto do suporte calçava, e o suporte
   * fica na entrada do rinque, onde a criança arrasta o dedo para virar a câmera. Agora só o
   * toque de verdade vale: o dedo desce e sobe no mesmo lugar, sem arrastar e sem demorar.
   */
  let noSuporte: { id: number; x: number; y: number; t: number } | null = null;
  function soltouNoSuporte(ev: PointerEvent): void {
    const d = noSuporte;
    if (!d || ev.pointerId !== d.id) return;
    noSuporte = null;
    if (ev.type !== 'pointerup' || !noJogo()) return;
    if (!foiToque(ev.clientX - d.x, ev.clientY - d.y, performance.now() - d.t)) return;
    e.vilaPatins?.(!e.personagem?.aparencia().patins);
    dicaUsada = 'patins';
  }
  // (antes dos que engolem o resto do toque, logo abaixo)
  window.addEventListener('pointerup', soltouNoSuporte, { capture: true });
  window.addEventListener('pointercancel', soltouNoSuporte, { capture: true });
  window.addEventListener(
    'pointerdown',
    (ev) => {
      const alvo = ev.target as HTMLElement | null;
      if (
        alvo?.closest?.('button, .alma-fundo, .roda, .barra, .joystick, .menu-hud, .controle-toque')
      )
        return;
      if (!noJogo()) return;
      const preso = !!document.pointerLockElement;
      const x = preso ? innerWidth / 2 : ev.clientX;
      const y = preso ? innerHeight / 2 : ev.clientY;
      let feito = false;
      // sentado num brinquedo do parque, o dedo é do brinquedo. No toque da tela quem cuida é o
      // controle (o toque dá o "tum"; o arrastar continua girando a câmera); com o mouse preso,
      // o clique vale aqui
      if (e.vilaParque?.sentado()) {
        if (!preso || ev.button !== 0) return;
        e.vilaParque.toqueSentado();
        engoliuAte = performance.now() + 300;
        ev.stopImmediatePropagation();
        ev.preventDefault();
        return;
      }
      // etapa B: as missões do parque respondem na hora; os toques da rua, quando o dedo sobe
      const toqueB = toqueBNoDedo(x, y);
      if (toqueB) {
        if (toqueB.naHora || preso) {
          toqueB.tocar();
          dicaUsada = toqueB.chave;
        } else
          noToqueB = {
            id: ev.pointerId,
            x: ev.clientX,
            y: ev.clientY,
            t: performance.now(),
            q: toqueB,
          };
        engoliuAte = performance.now() + 300;
        ev.stopImmediatePropagation();
        ev.preventDefault();
        return;
      }
      // os brinquedos do parque: os de tocar respondem na hora; os de sentar, quando o dedo sobe
      const doParque = brinquedoDoParqueNoDedo(x, y);
      const deSentar = doParque ? null : brinquedoDeSentarNoDedo(x, y);
      if (doParque) {
        e.vilaParque?.tocar(doParque.qual, doParque.i);
        feito = true;
      } else if (deSentar) {
        if (preso) {
          // (com o mouse preso não há arrastar: o clique já vale)
          const pes = e.jogadorPes?.();
          if (pes && alcanca(deSentar.nome, pes[0], pes[2]))
            e.vilaParque?.sentar(deSentar.b);
          else if (deSentar.nome !== 'bate') e.vilaParque?.tocar(deSentar.nome);
        } else
          noBrinquedo = {
            id: ev.pointerId,
            x: ev.clientX,
            y: ev.clientY,
            t: performance.now(),
            b: deSentar.b,
          };
        feito = true;
      }
      if (feito) {
        engoliuAte = performance.now() + 300;
        ev.stopImmediatePropagation();
        ev.preventDefault();
        return;
      }
      // a caixa perto do dedo (fora do show: acende e apaga)
      let melhor: { d: number; i: number } | null = null;
      for (const c of caixasNaTela()) {
        const d = Math.hypot(c.t.x - x, c.t.y - y);
        if (d <= RAIO_TOQUE && (!melhor || d < melhor.d)) melhor = { d, i: c.i };
      }
      // o suporte dos patins: perto dele, o toque calça (ou tira) os patins
      const pes = e.jogadorPes?.();
      const [sx, sy, sz] = p.patins;
      const ts = pes && Math.hypot(pes[0] - sx, pes[2] - sz) < 4 ? tela(sx, sy + 1, sz) : null;
      // os brinquedos de tocar (fliperama, rádio e fita): perto deles, o dedo na peça toca
      const brinquedo = showTocando() ? null : brinquedoNoDedo(x, y);
      if (brinquedo) {
        e.vilaBrinquedo?.(brinquedo.qual, brinquedo.i);
        feito = true;
      } else if (ts && Math.hypot(ts.x - x, ts.y - y) <= RAIO_TOQUE * 1.5) {
        // (calçar é uma escolha: só vale quando o dedo sobe no mesmo lugar; ver `soltouNoSuporte`)
        noSuporte = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now() };
        feito = true;
      } else if (melhor && !showTocando()) {
        e.vilaComando?.({ a: 'caixa', i: melhor.i });
        tocarSomInterface('plim');
        feito = true;
      }
      // (no show o dedo é todo do jogo: nenhum toque muda o show, e o arrastar gira a câmera)
      if (!feito) return;
      engoliuAte = performance.now() + 300;
      ev.stopImmediatePropagation();
      ev.preventDefault();
    },
    { capture: true },
  );
  for (const tipo of ['pointerup', 'mousedown', 'mouseup', 'touchstart', 'touchend', 'click'])
    window.addEventListener(
      tipo,
      (ev) => {
        if (performance.now() < engoliuAte) {
          ev.stopImmediatePropagation();
          if (ev.cancelable) ev.preventDefault();
        }
      },
      { capture: true, passive: false },
    );

  // ---------------------------------------------------------------- o feno na mão (f2)
  window.addEventListener('brumaluz:coletou', (ev) => {
    const d = (ev as CustomEvent<{ item: string; qtd: number }>).detail;
    // (etapa B: o feno do fardo, a pelúcia de prenda, a fita e a vitamina também vêm para a mão)
    // (parte 3: os brinquedos do baú da Casa anos 80 também; parte 3B: o feno é item próprio, só
    // das lhamas, e vai sempre para a mão; antes era o trigo, só com a f2 ou a f7 na vez)
    const naMao = [FENO, PELUCIA, FITA_VIDEO, VITAMINA, IOIO, PIAO, CUBO_CORES, FATIA_BOLO];
    if (!naMao.includes(d.item)) return;
    for (let i = 0; i < 9; i++)
      if (e.inventario?.obter(i)?.item === d.item) {
        e.selecionarSlot?.(i);
        break;
      }
    const pes = e.jogadorPes?.();
    const de = pes ? tela(pes[0], pes[1] + 1.1, pes[2]) : null;
    if (!de) return;
    const el = document.createElement('div');
    el.className = 'canto-pop';
    el.appendChild(figura(`item:${d.item}`));
    el.style.left = `${de.x + 34}px`;
    el.style.top = `${de.y - 40}px`;
    el.style.setProperty('--dx', '-30px');
    el.style.setProperty('--dy', '34px');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
    tocarSomInterface('mochila');
    setTimeout(() => tocarSomInterface('plim'), 180);
  });

  void guia;

  // ---------------------------------------------------------------- a dica de toque
  // (dono, 16 nov 2026: no suporte dos patins "tem que adivinhar") perto do suporte dos patins
  // ou de um brinquedo de sentar, a mãozinha toca nele e o balãozinho mostra o que o toque faz
  const dica = criarDicaToque();
  /** Até onde (blocos) a dica aparece, e quanto a criança tem de se afastar para ela voltar. */
  const PERTO_DA_DICA = 4;
  const LONGE_DA_DICA = 7;
  /** Chegou perto há este tanto (s): quem só passa andando não vê a dica piscar. */
  const ESPERA_DA_DICA = 0.5;
  let pertoDe: { base: string; desde: number } | null = null;
  /** No carrinho do bate-bate: de onde ela saiu e se já guiou (a dica de guiar some). */
  let saiuDe: { x: number; z: number; guiou: boolean } | null = null;
  scene.onBeforeRenderObservable.add(() => {
    // etapa B: os balões fugidos só aparecem para quem tem a missão deles aberta
    e.vilaMissoes?.baloesAVista(aberta(F_BALOES));
    // parte 3B: os brinquedos espalhados só para quem tem a f10 aberta e ainda não pegou
    e.vilaMissoes?.espalhados([espalhadoNoChao(0), espalhadoNoChao(1), espalhadoNoChao(2)]);
    const pes = e.jogadorPes?.();
    const sentada = e.vilaParque?.sentado();
    if (sentada) dicaUsada = `sentar-${DE_SENTAR.find((q) => q.nome === sentada.b)?.b}`;
    // no carrinho do bate-bate: como guiar (até ela sair do lugar) e, em cima do tapete verde,
    // como descer. Somem sozinhas: nada fica na tela enquanto ela brinca
    const noCarrinho =
      sentada?.b === 'bate' ? (e.vilaParque?.carros()?.[sentada.i] ?? null) : null;
    if (!noCarrinho) saiuDe = null;
    else if (pes && noJogo()) {
      saiuDe ??= { x: noCarrinho.x, z: noCarrinho.z, guiou: false };
      if (Math.hypot(noCarrinho.x - saiuDe.x, noCarrinho.z - saiuDe.z) > 1.5) saiuDe.guiou = true;
      const t = tela(noCarrinho.x, chaoVila + 2.3, noCarrinho.z);
      pertoDe = null;
      if (!t || !boaParaDica(t, innerWidth, innerHeight)) return dica.mostrar(null);
      if (!saiuDe.guiou)
        return dica.mostrar({
          chave: 'bate-guiar',
          t,
          semMao: true,
          figura: arteAlma('sentarBrinquedo'),
          texto: document.body.classList.contains('toque-ativo')
            ? 'Empurre o controle para guiar'
            : 'Use W, A, S e D para guiar',
        });
      if (noTapete(pq.bate, noCarrinho.x, noCarrinho.z))
        return dica.mostrar({
          chave: 'bate-sair',
          t,
          semMao: true,
          figura: arteAlma('sairBrinquedo'),
          texto: 'Pare aqui para sair',
        });
      return dica.mostrar(null);
    }
    if (!pes || !noJogo() || sentada || showTocando()) {
      pertoDe = null;
      return dica.mostrar(null);
    }
    const [sx, sy, sz] = p.patins;
    const lugares: {
      base: string;
      dist: number;
      ponto: [number, number, number] | undefined;
      /** Etapa B: a dica desta coisa e até onde ela aparece. */
      b?: ToqueB;
    }[] = [
      // etapa B: o que se toca nas missões do parque e na rua (só o que vale e ela alcança)
      ...TOQUES_B.filter(
        (q) => q.dica && q.ativo() && (q.comDica?.() ?? true) && q.alcanca(pes[0], pes[2]),
      ).map((q) => {
        const ponto = q.ponto();
        return {
          base: q.chave,
          dist: Math.hypot(pes[0] - ponto[0], pes[2] - ponto[2]),
          ponto,
          b: q,
        };
      }),
      { base: 'patins', dist: Math.hypot(pes[0] - sx, pes[2] - sz), ponto: [sx, sy + 1, sz] },
      ...DE_SENTAR.map((q) => {
        const ponto = q.alvos()[0] as [number, number, number] | undefined;
        return {
          base: `sentar-${q.b}`,
          // (no bate-bate a dica é do carrinho livre: perto dele, não da pista inteira)
          dist:
            q.nome !== 'bate'
              ? distanciaDoBrinquedo(pq, q.nome, pes[0], pes[2])
              : ponto
                ? Math.max(0, Math.hypot(pes[0] - ponto[0], pes[2] - ponto[2]) - 2.5)
                : 99,
          ponto,
        };
      }),
    ];
    // usou (calçou, tirou, andou no brinquedo): a dica só volta depois de ela se afastar
    if (dicaUsada && (lugares.find((l) => l.base === dicaUsada)?.dist ?? 99) > LONGE_DA_DICA)
      dicaUsada = null;
    const perto = lugares
      // (os brinquedos são grandes: a dica vem um pouco antes)
      .filter(
        (l) =>
          l.dist <= (l.b?.dica?.ate ?? PERTO_DA_DICA + (l.base === 'patins' ? 0 : 1)) &&
          l.base !== dicaUsada,
      )
      // (o toque de uma missão aberta vem antes do brinquedo ao lado: o balão preso no carrossel
      // antes do "Toque para andar")
      .sort((a, b) => Number(!!b.b?.naHora) - Number(!!a.b?.naHora) || a.dist - b.dist)[0];
    const agora = performance.now() / 1000;
    if (!perto) {
      pertoDe = null;
      return dica.mostrar(null);
    }
    if (pertoDe?.base !== perto.base) pertoDe = { base: perto.base, desde: agora };
    const t = perto.ponto ? tela(perto.ponto[0], perto.ponto[1], perto.ponto[2]) : null;
    if (!t || agora - pertoDe.desde < ESPERA_DA_DICA || !boaParaDica(t, innerWidth, innerHeight))
      return dica.mostrar(null);
    if (perto.b?.dica)
      dica.mostrar({
        chave: perto.base,
        t,
        figura: arteAlma(perto.b.dica.figura),
        texto: perto.b.dica.texto,
      });
    else if (perto.base === 'patins') {
      const calcada = !!e.personagem?.aparencia().patins;
      dica.mostrar({
        chave: calcada ? 'patins-tirar' : 'patins-calcar',
        t,
        figura: arteAlma(calcada ? 'tirarPatins' : 'calcarPatins'),
        texto: calcada ? 'Toque para tirar' : 'Toque para calçar',
      });
    } else
      dica.mostrar({
        chave: perto.base,
        t,
        figura: arteAlma('sentarBrinquedo'),
        texto: 'Toque para andar',
      });
  });

  // a coisa da dica atrás do boneco (o fardo, o cocho, a barraca bem na frente dela): o boneco
  // fica meio transparente e a coisa aparece através dele, como no canto das missões
  let transparente = false;
  scene.onBeforeRenderObservable.add(() => {
    const d = dica.estado();
    // (parte 3B: na Casa anos 80, no quintal dela e nos brinquedos espalhados, a criança nunca
    // some: a câmera de casinha de bonecas olha de cima e a trilha acaba longe o bastante para a
    // coisa ficar acima da cabeça; meio apagada, a criança de 3 anos via uma boneca desbotada)
    const pes = e.jogadorPes?.();
    const naCasa =
      !!d &&
      (d.chave.startsWith('espalhado-') || (!!pes && dentroDaCasa(p.casa, pes[0], pes[2], 4.5)));
    const quer = !!d && !naCasa && !d.chave.startsWith('bate-') && maoAtrasDoBoneco(e, d.t);
    if (quer === transparente) return;
    transparente = quer;
    e.limiteOpacidade = quer ? 0.6 : 1;
  });
  // a casa anos 80 não some com o móvel da dica de agora (a coisa que a criança vai tocar)
  e.dicaVila = () => dica.estado()?.chave ?? null;

  // testes: as caixas na tela e o show
  window.__vila = {
    plano: () => plano,
    dica: () => dica.estado(),
    caixas: () => caixasNaTela(),
    show: () => showTocando(),
    parque: () => ({
      sentar: DE_SENTAR.map((q) => {
        const a = q.alvos()[0] as [number, number, number] | undefined;
        return { b: q.b, t: a ? tela(a[0], a[1], a[2]) : null };
      }),
      tocar: DE_TOCAR.map((q) => ({
        qual: q.qual,
        i: q.i,
        t: tela(q.p[0], q.p[1] + q.alt, q.p[2]),
      })),
    }),
    toques: () => {
      const pes = e.jogadorPes?.();
      return TOQUES_B.filter((q) => q.ativo()).map((q) => {
        const a = q.ponto();
        return {
          chave: q.chave,
          perto: !!pes && q.alcanca(pes[0], pes[2]),
          p: a,
          t: tela(a[0], a[1], a[2]),
        };
      });
    },
    revista: () => revista.aberta(),
  };
}
