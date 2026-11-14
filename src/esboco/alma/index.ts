/**
 * Esboço da spec 023 "Alma do jogo", rodada 2 (só com `?esboco=alma`). O `main.ts` importa
 * este arquivo sob demanda: vira um pedaço à parte que o jogo nunca baixa.
 *
 * Roda por cima do jogo de verdade, na Cidade Grande e no Rancho Alegre:
 * - **da criança (universal):** a carteira, o nível com os presentinhos, as 5 habilidades, os
 *   premium e o que está vestido. Guardado no aparelho, ao lado da aparência
 *   (`terrario:alma-crianca`), como o dono pediu até as contas da 024;
 * - **do mundo:** as missões e os prêmios especiais, e a banca do mundo;
 * - **lojinha premium:** pela roda do menu ("Lojinha"), de qualquer mundo. Os três premium
 *   feitos (tênis-cometa, dragãozinho, unicórnio-pônei) aparecem no boneco de verdade e nos
 *   amigos, e o provador gira a câmera em volta da criança.
 *
 * As missões contam com os eventos que o jogo já manda. O que é de mentirinha: o estado mora
 * no aparelho e não no núcleo; comprar na banca não põe o pacote no inventário.
 */
import { tema } from '../../temas/ativo';
import { notificar } from '../../ui/interface';
import { EXTRAS_RODA } from '../../ui/menuRoda';
import { obraDoCanteiro, celulasDaObra } from '../../world/obras';
import { HABILIDADES, PREMIUM, missoesDoMundo, type MundoAlma } from './dados';
import {
  abertas,
  comprarBanca,
  comprarPremium,
  criancaVazia,
  definirProgresso,
  mundoVazio,
  normalizarCrianca,
  normalizarMundo,
  registrar,
  vestirPremium,
  type EstadoCrianca,
  type EstadoMundo,
  type EventoAlma,
} from './estado';
import { criarUiAlma } from './ui';
import { CAMISETA, celebrar, tlim } from './festa';
import { figura, desenhoDaFigurinha } from './figuras';
import { arte } from './arte';
import { registrarFantasiasAlma } from './fantasias';
import { criarPremium3d, type ItemPremium3d, type Premium3d } from './premium3d';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Camera } from '@babylonjs/core/Cameras/camera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';

interface ApiAlma {
  pronto: boolean;
  mundo: MundoAlma;
  crianca(): EstadoCrianca;
  mundoEst(): EstadoMundo;
  definir(parcial: { crianca?: Partial<EstadoCrianca>; mundo?: Partial<EstadoMundo> }): void;
  zerar(): void;
  registrar(chave: string, qtd?: number): void;
  progresso(id: string, valor: number): void;
  quadro(): void;
  abrir(aba: 'album' | 'nivel' | 'habilidades' | 'banca'): void;
  vitrine(): void;
  detalhe(id: string): void;
  provar(id: string): void;
  fechar(): void;
  festando(): boolean;
  /** Veste premium 3D em quem ('eu' ou o amigo de teste perto de x, z). */
  premium(quem: string, itens: string[], perto?: [number, number]): boolean;
}

declare global {
  interface Window {
    __alma?: ApiAlma;
  }
}

const CHAVE_CRIANCA = 'terrario:alma-crianca';

function ler(chave: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(chave) ?? 'null');
  } catch {
    return null;
  }
}
function gravar(chave: string, v: unknown): void {
  try {
    localStorage.setItem(chave, JSON.stringify(v));
  } catch {
    // sem armazenamento
  }
}

export function prepararEsbocoAlma(): void {
  const id = tema().id;
  if (id !== 'cidade-grande' && id !== 'rancho-alegre') {
    setTimeout(() => notificar('Esboço da 023: abra a Cidade Grande ou o Rancho Alegre'), 2500);
    return;
  }
  const mundo: MundoAlma = id;
  registrarFantasiasAlma();
  const chaveMundo = `terrario:esboco-alma:${mundo}:${new URL(location.href).searchParams.get('mundo') ?? 'padrao'}`;
  let c = normalizarCrianca(ler(CHAVE_CRIANCA));
  let e = normalizarMundo(ler(chaveMundo), mundo);
  const salvar = () => {
    gravar(CHAVE_CRIANCA, c);
    gravar(chaveMundo, e);
  };

  const vestirFantasia = (f: string | null) =>
    window.__brumaluz?.personagem?.definir({ fantasia: f ? { id: f, cor: 0 } : undefined } as never);

  // ---------------------------------------------------------------- premium no boneco
  let provando: string | null = null;
  function itensVestidos(extra: string | null): ItemPremium3d[] {
    const ids = new Set(Object.values(c.vestidos));
    if (extra) {
      const p = PREMIUM.find((x) => x.id === extra);
      if (p) {
        for (const q of PREMIUM) if (q.categoria === p.categoria) ids.delete(q.id);
        ids.add(extra);
      }
    }
    return [...ids].filter((x): x is ItemPremium3d => x === 'tenis-cometa' || x === 'dragao' || x === 'unicornio');
  }
  let dragaoAntes: unknown = null;
  function aplicarPremium(): void {
    const p = premium3d();
    const raiz = raizDe();
    if (!p || !raiz) return;
    const itens = itensVestidos(provando);
    // o dragãozinho é uma fantasia: a base vai na aparência, as asas no premium3d
    const ap = window.__brumaluz?.personagem?.aparencia?.() as { fantasia?: { id: string } } | undefined;
    if (itens.includes('dragao') && ap?.fantasia?.id !== 'dragao') {
      dragaoAntes = ap?.fantasia ?? null;
      vestirFantasia('dragao');
    } else if (!itens.includes('dragao') && ap?.fantasia?.id === 'dragao') {
      window.__brumaluz?.personagem?.definir({ fantasia: (dragaoAntes as never) ?? undefined } as never);
    }
    setTimeout(() => {
      const r = raizDe();
      if (r) p.vestir('eu', r, itens);
    }, 120);
  }

  // câmera do provador: gira devagar em volta da criança
  let orbita: { t0: number; bicho: boolean } | null = null;
  function ligarOrbita(): void {
    const cena = window.__brumaluz?.cenaBabylon?.();
    const w = window as unknown as { __almaOrbita?: boolean };
    if (!cena || w.__almaOrbita) return;
    w.__almaOrbita = true;
    cena.onBeforeCameraRenderObservable.add((cam: Camera) => {
      if (!orbita) return;
      const r = raizDe();
      if (!r) return;
      const t = (performance.now() - orbita.t0) / 1000;
      const yaw = r.rotation.y;
      const ang = yaw + 0.55 + t * 0.32;
      const R = orbita.bicho ? 4.3 : 3.1;
      const alvo = r.position.add(new Vector3(0, orbita.bicho ? 0.6 : 0.85, 0));
      const c2 = cam as unknown as {
        position: { set(...a: number[]): void };
        setTarget(v: unknown): void;
        getViewMatrix(f: boolean): unknown;
        getProjectionMatrix(f: boolean): unknown;
      };
      c2.position.set(alvo.x + Math.sin(ang) * R, alvo.y + (orbita.bicho ? 1.2 : 0.75), alvo.z + Math.cos(ang) * R);
      c2.setTarget(alvo);
      (cena as unknown as { setTransformMatrix(a: unknown, b: unknown): void }).setTransformMatrix(c2.getViewMatrix(true), c2.getProjectionMatrix(true));
    });
  }

  const ui = criarUiAlma({
    crianca: () => c,
    mundoEst: () => e,
    mundo,
    fixar: (m) => {
      e.fixada = m;
      salvar();
    },
    comprarPremium: (pid) => {
      const r = comprarPremium(c, pid);
      if (!r.ok) return false;
      salvar();
      const p = PREMIUM.find((x) => x.id === pid)!;
      ui.fechar();
      void celebrar({
        tipo: 'premium',
        premio: figura(p.desenho),
        moedas: 0,
        destino: () => ui.carteira.getBoundingClientRect(),
        voar: ui.voar,
        svg: ui.svgEl,
        depois: async () => {
          ui.renderHud();
          aplicarPremium();
          const raiz = raizDe();
          if (raiz) setTimeout(() => premium3d()?.festa(raiz), 300);
        },
      });
      return true;
    },
    comprarBanca: (bid) => {
      const r = comprarBanca(c, mundo, bid);
      if (r.ok) salvar();
      return r.ok;
    },
    vestirPremium: (pid, v) => {
      vestirPremium(c, pid, v);
      salvar();
      aplicarPremium();
    },
    experimentar: (pid) => {
      provando = pid;
      aplicarPremium();
      ligarOrbita();
      orbita = pid ? { t0: performance.now(), bicho: PREMIUM.find((x) => x.id === pid)?.categoria === 'bicho' } : null;
      if (pid) setTimeout(() => {
        const raiz = raizDe();
        if (raiz) premium3d()?.festa(raiz);
      }, 400);
    },
    aoAbrir: () => undefined,
    aoFechar: () => undefined,
  });
  ui.carteira.addEventListener('click', () => ui.abrir('album'));
  ui.cartao.addEventListener('click', () => ui.quadro());
  ui.renderHud();
  // a lojinha na roda do menu (de qualquer mundo)
  EXTRAS_RODA.push({ id: 'lojinha', nome: 'Lojinha', icone: arte('vitrine'), aoEscolher: () => ui.vitrine() });

  // ---------------------------------------------------------------- festas, uma de cada vez
  const fila: EventoAlma[][] = [];
  let festando = false;
  async function tratar(ev: EventoAlma[]): Promise<void> {
    if (!ev.length) return;
    salvar();
    if (ev.some((x) => x.tipo === 'progresso')) {
      ui.renderHud(true);
      ui.pulsarCartao();
      tlim(0);
    }
    if (!ev.some((x) => x.tipo === 'concluiu' || x.tipo === 'nivel')) {
      if (!festando) void ui.encherXp();
      return;
    }
    fila.push(ev);
    if (festando) return;
    festando = true;
    while (fila.length) {
      const lote = fila.shift()!;
      const fim = lote.find((x) => x.tipo === 'concluiu');
      const estrela = lote.filter((x) => x.tipo === 'estrela').pop();
      if (fim && fim.tipo === 'concluiu') {
        // na obra, a festa do mundo (fogos e ta-dá da 014) vem primeiro
        if (fim.missao.conta.tipo === 'obra') await esperar(2200);
        ui.fechar();
        let canto: HTMLElement | undefined;
        if (estrela && estrela.tipo === 'estrela') {
          const h = HABILIDADES.find((x) => x.id === estrela.habilidade)!;
          canto = document.createElement('div');
          const d = figura(h.desenho);
          d.style.cssText = `width:84px;height:84px;padding:10px;box-sizing:border-box;border-radius:50%;background:#fffaf0;box-shadow:0 0 0 6px ${h.cor},0 6px 0 6px rgba(120,60,10,0.3)`;
          const est = document.createElement('span');
          est.className = 'alma-estrelas';
          for (let i = 0; i < 5; i++) est.appendChild(ui.svgEl(i < estrela.estrelas ? 'estrela' : 'estrelaVazia'));
          canto.append(d, est);
        }
        const fant = fim.fantasia;
        await celebrar({
          tipo: 'missao',
          premio: figura(fant ? `fantasia:${fant}` : desenhoDaFigurinha(fim.missao)),
          figurinha: fant ? figura(desenhoDaFigurinha(fim.missao)) : undefined,
          moedas: fim.moedas,
          canto,
          extra: fant ? { rotulo: 'Vestir agora', desenho: CAMISETA, aoTocar: () => vestirFantasia(fant) } : undefined,
          destino: () => ui.carteira.getBoundingClientRect(),
          voar: ui.voar,
          svg: ui.svgEl,
          depois: async () => {
            await ui.contarMoedasAte(c.moedas - lote.filter((x) => x.tipo === 'nivel').reduce((s, x) => s + (x.tipo === 'nivel' ? (x.presente?.moedas ?? 0) : 0), 0), tlim);
            await ui.encherXp(Math.min(c.xp, xpAntesDoNivel(lote)));
          },
        });
      }
      for (const n of lote) {
        if (n.tipo !== 'nivel') continue;
        await celebrar({
          tipo: 'nivel',
          premio: document.createElement('span'),
          nivel: n.nivel,
          presente: n.presente ? figura(n.presente.desenho) : undefined,
          moedas: n.presente?.moedas ?? 0,
          destino: () => ui.nivelEl.getBoundingClientRect(),
          voar: ui.voar,
          svg: ui.svgEl,
          depois: async () => {
            await ui.encherXp();
            await ui.contarMoedasAte(c.moedas, tlim);
          },
        });
      }
    }
    festando = false;
    ui.renderHud();
  }
  /** XP no fim do nível de antes (o anel enche até a borda, e a festa do nível vira a página). */
  function xpAntesDoNivel(lote: EventoAlma[]): number {
    const n = lote.find((x) => x.tipo === 'nivel');
    if (!n || n.tipo !== 'nivel') return c.xp;
    return [0, 40, 100, 180, 280, 400, 540, 700, 880, 1080][n.nivel - 1] - 0.001;
  }
  const reg = (k: string, q = 1) => void tratar(registrar(c, e, mundo, k, q));

  // ---------------------------------------------------------------- os eventos do jogo
  const ouvir = (nome: string, f: (d: unknown) => void) =>
    window.addEventListener(`brumaluz:${nome}`, (ev) => f((ev as CustomEvent).detail));
  ouvir('colheu', (d) => {
    if ((d as { madura?: boolean })?.madura) reg('colheu');
  });
  ouvir('plantou', () => reg('plantou'));
  ouvir('criou', (t) => reg(`criou:${String(t)}`));
  ouvir('fabricou', (item) => reg(`fabricou:${String(item)}`));
  ouvir('fundiu', (p) => reg(`fundiu:${(p as { item: string }).item}`));
  ouvir('coletou', (p) => {
    const cc = p as { item: string; qtd: number };
    if (cc.item === 'ovo') reg('coletou:ovo', cc.qtd);
  });
  ouvir('trocou', (d) => reg(`trocou:${(d as { profissao: string }).profissao}`));
  ouvir('obra', (d) => {
    const o = d as { canteiro?: number; feita?: boolean };
    if (!o.feita) return;
    const m = missoesDoMundo(mundo).find((x) => x.conta.tipo === 'obra' && x.conta.canteiro === o.canteiro);
    if (m) void tratar(definirProgresso(c, e, mundo, m.id, 1));
  });

  const restantes = new Map<number, number>();
  const visitados = new Set<string>();
  setInterval(() => {
    const b = window.__brumaluz;
    if (!b?.ready || mundo !== 'cidade-grande') return;
    const perto = b.fantasmasPerto?.() ?? [];
    const porCanteiro = new Map<number, number>();
    for (const f of perto) porCanteiro.set(f.canteiro, (porCanteiro.get(f.canteiro) ?? 0) + 1);
    for (const [n, falta] of porCanteiro) {
      const antes = restantes.get(n);
      restantes.set(n, falta);
      if (antes !== undefined && falta < antes) reg('obra:bloco', antes - falta);
      const def = obraDoCanteiro(n);
      const m = abertas(e, mundo).find((x) => x.conta.tipo === 'obra' && x.conta.canteiro === n);
      if (def && m) {
        const fr = 1 - falta / celulasDaObra(def).length;
        if (fr < 1) void tratar(definirProgresso(c, e, mundo, m.id, fr));
      }
    }
    const p = b.posicao;
    const plano = b.cidade?.();
    if (p && plano) {
      const lote = plano.lotes.find((l) => p[0] >= l.x0 && p[0] < l.x0 + l.largura && p[2] >= l.z0 && p[2] < l.z0 + l.profundidade);
      if (lote && !visitados.has(lote.uso)) {
        visitados.add(lote.uso);
        reg('visitou:lugar');
        for (const m of abertas(e, mundo)) {
          if (m.conta.tipo !== 'lugares' || !m.conta.usos.includes(lote.uso)) continue;
          void tratar(definirProgresso(c, e, mundo, m.id, m.conta.usos.filter((u) => visitados.has(u)).length));
        }
      }
    }
  }, 400);

  // pronto: aplica os premium vestidos; primeira vez no mundo, o quadro de missões aparece
  const esperarPronto = () => {
    if (!window.__brumaluz?.ready) return void setTimeout(esperarPronto, 400);
    window.__brumaluz.barramento?.ouvir('colocacao', () => reg('colocou'));
    ui.renderHud();
    setTimeout(aplicarPremium, 600);
    if (!e.feitas.length && !e.fixada && !new URL(location.href).searchParams.has('semQuadro')) {
      const quando = () => {
        if (document.querySelector('.entrada:not([hidden])')) return void setTimeout(quando, 600);
        setTimeout(() => ui.quadro(), 1500);
      };
      quando();
    }
  };
  esperarPronto();

  window.__alma = {
    pronto: true,
    mundo,
    crianca: () => c,
    mundoEst: () => e,
    definir: (parcial) => {
      if (parcial.crianca) c = normalizarCrianca({ ...c, ...parcial.crianca });
      if (parcial.mundo) e = normalizarMundo({ ...e, ...parcial.mundo }, mundo);
      salvar();
      ui.renderHud();
      aplicarPremium();
    },
    zerar: () => {
      c = criancaVazia();
      e = mundoVazio();
      visitados.clear();
      salvar();
      ui.renderHud();
      aplicarPremium();
    },
    registrar: reg,
    progresso: (m, v) => void tratar(definirProgresso(c, e, mundo, m, v)),
    quadro: () => ui.quadro(),
    abrir: (aba) => ui.abrir(aba),
    vitrine: () => ui.vitrine(),
    detalhe: (pid) => {
      ui.vitrine();
      ui.detalhe(pid);
    },
    provar: (pid) => {
      ui.vitrine();
      ui.provar(pid);
    },
    fechar: () => {
      ui.sairProvador(false);
      ui.fechar();
    },
    festando: () => festando,
    premium: (quem, itens, perto) => {
      const p = premium3d();
      const raiz = raizDe(quem === 'eu' ? undefined : perto);
      if (!p || !raiz) return false;
      p.vestir(quem, raiz, itens as ItemPremium3d[]);
      return true;
    },
  };
}

let premiumFeito: Premium3d | null = null;
function premium3d(): Premium3d | null {
  const cena = window.__brumaluz?.cenaBabylon?.();
  if (!cena) return null;
  premiumFeito ??= criarPremium3d(cena);
  return premiumFeito;
}

/** O boneco de alguém: o da criança (o mais perto da posição dela) ou o mais perto de (x, z). */
function raizDe(perto?: [number, number]): TransformNode | null {
  const b = window.__brumaluz;
  const cena = b?.cenaBabylon?.();
  if (!b || !cena) return null;
  const [x, z] = perto ?? [b.posicao?.[0] ?? 0, b.posicao?.[2] ?? 0];
  let melhor: TransformNode | null = null;
  let d = Infinity;
  for (const n of cena.transformNodes)
    if (n.name === 'personagem' && !n.parent) {
      const dd = Math.hypot(n.position.x - x, n.position.z - z);
      if (dd < d) {
        d = dd;
        melhor = n;
      }
    }
  return melhor;
}

function esperar(ms: number): Promise<void> {
  return new Promise((ok) => setTimeout(ok, ms));
}
