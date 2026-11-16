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
 * - **o feno na mão (f2):** o "pop" do feno que aparece perto das lhamas, já selecionado.
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
import { alcancaOBrinquedo, distanciaDoBrinquedo, type Brinquedo } from '../../jogo/parque';
import { boaParaDica, criarDicaToque } from './dicaToque';
import { arte as arteAlma } from './arte';
import { CSS_CANTO } from './canto';

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
  const DE_SENTAR: {
    b: number;
    nome: Brinquedo;
    alvos: [number, number, number][];
    raio: number;
  }[] = [
    {
      b: 0,
      nome: 'roda',
      alvos: [
        [pq.roda.x, chaoVila + 1.6, pq.roda.z],
        [pq.roda.x, pq.roda.y, pq.roda.z],
        [pq.roda.x, pq.roda.y - pq.roda.raio * 0.5, pq.roda.z],
      ],
      raio: RAIO_TOQUE * 2.2,
    },
    {
      b: 1,
      nome: 'carrossel',
      alvos: [[pq.carrossel.x, chaoVila + 3, pq.carrossel.z]],
      raio: RAIO_TOQUE * 2.8,
    },
    {
      b: 2,
      nome: 'bate',
      alvos: [[pq.bate.x, chaoVila + 1.2, pq.bate.z]],
      raio: RAIO_TOQUE * 2.8,
    },
  ];
  /** Até onde (blocos) o toque num brinquedo de sentar ainda faz alguma coisa (a roda pisca). */
  const LONGE_DE_SENTAR = 14;
  function brinquedoDeSentarNoDedo(x: number, y: number): (typeof DE_SENTAR)[number] | null {
    const pes = e.jogadorPes?.();
    if (!pes) return null;
    let melhor: { d: number; q: (typeof DE_SENTAR)[number] } | null = null;
    for (const q of DE_SENTAR) {
      const dist = distanciaDoBrinquedo(pq, q.nome, pes[0], pes[2]);
      if (dist > LONGE_DE_SENTAR) continue;
      for (const a of q.alvos) {
        const t = tela(a[0], a[1], a[2]);
        if (!t) continue;
        const raio = q.raio * Math.max(1, 5 / Math.max(1, dist + 2));
        const d = Math.hypot(t.x - x, t.y - y);
        if (d <= raio && (!melhor || d < melhor.d)) melhor = { d, q };
      }
    }
    return melhor?.q ?? null;
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
    if (alcancaOBrinquedo(pq, q.nome, pes[0], pes[2])) e.vilaParque?.sentar(q.b);
    // de mais longe (ou com tudo ocupado) a roda pisca e o carrossel toca o realejo
    else if (q.nome !== 'bate') e.vilaParque?.tocar(q.nome);
  }
  window.addEventListener('pointerup', soltouNoBrinquedo, { capture: true });
  window.addEventListener('pointercancel', soltouNoBrinquedo, { capture: true });

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
          if (pes && alcancaOBrinquedo(pq, deSentar.nome, pes[0], pes[2]))
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
    if (d.item !== 'trigo' || missao() !== 'f2') return;
    for (let i = 0; i < 9; i++)
      if (e.inventario?.obter(i)?.item === 'trigo') {
        e.selecionarSlot?.(i);
        break;
      }
    const pes = e.jogadorPes?.();
    const de = pes ? tela(pes[0], pes[1] + 1.1, pes[2]) : null;
    if (!de) return;
    const el = document.createElement('div');
    el.className = 'canto-pop';
    el.appendChild(figura('item:trigo'));
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
  scene.onBeforeRenderObservable.add(() => {
    const pes = e.jogadorPes?.();
    const sentada = e.vilaParque?.sentado();
    if (sentada) dicaUsada = `sentar-${DE_SENTAR.find((q) => q.nome === sentada.b)?.b}`;
    if (!pes || !noJogo() || sentada || showTocando()) {
      pertoDe = null;
      return dica.mostrar(null);
    }
    const [sx, sy, sz] = p.patins;
    const lugares: { base: string; dist: number; ponto: [number, number, number] }[] = [
      { base: 'patins', dist: Math.hypot(pes[0] - sx, pes[2] - sz), ponto: [sx, sy + 1, sz] },
      ...DE_SENTAR.map((q) => ({
        base: `sentar-${q.b}`,
        dist: distanciaDoBrinquedo(pq, q.nome, pes[0], pes[2]),
        ponto: q.alvos[0],
      })),
    ];
    // usou (calçou, tirou, andou no brinquedo): a dica só volta depois de ela se afastar
    if (dicaUsada && (lugares.find((l) => l.base === dicaUsada)?.dist ?? 99) > LONGE_DA_DICA)
      dicaUsada = null;
    const perto = lugares
      // (os brinquedos são grandes: a dica vem um pouco antes)
      .filter(
        (l) => l.dist <= PERTO_DA_DICA + (l.base === 'patins' ? 0 : 1) && l.base !== dicaUsada,
      )
      .sort((a, b) => a.dist - b.dist)[0];
    const agora = performance.now() / 1000;
    if (!perto) {
      pertoDe = null;
      return dica.mostrar(null);
    }
    if (pertoDe?.base !== perto.base) pertoDe = { base: perto.base, desde: agora };
    const t = tela(perto.ponto[0], perto.ponto[1], perto.ponto[2]);
    if (!t || agora - pertoDe.desde < ESPERA_DA_DICA || !boaParaDica(t, innerWidth, innerHeight))
      return dica.mostrar(null);
    if (perto.base === 'patins') {
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

  // testes: as caixas na tela e o show
  window.__vila = {
    plano: () => plano,
    dica: () => dica.estado(),
    caixas: () => caixasNaTela(),
    show: () => showTocando(),
    parque: () => ({
      sentar: DE_SENTAR.map((q) => ({
        b: q.b,
        t: tela(q.alvos[0][0], q.alvos[0][1], q.alvos[0][2]),
      })),
      tocar: DE_TOCAR.map((q) => ({
        qual: q.qual,
        i: q.i,
        t: tela(q.p[0], q.p[1] + q.alt, q.p[2]),
      })),
    }),
  };
}
