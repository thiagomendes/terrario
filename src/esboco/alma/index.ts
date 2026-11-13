/**
 * Esboço da spec 023 "Alma do jogo" (só com `?esboco=alma`). O `main.ts` importa este arquivo
 * sob demanda: vira um pedaço à parte que o jogo nunca baixa.
 *
 * Roda por cima do jogo de verdade, na Cidade Grande e no Rancho Alegre: as missões contam com
 * os eventos que o jogo já manda (a obra do canteiro, colher, plantar, dar comida, fazer pão,
 * trocar com morador) e o HUD, o baú, o álbum, as habilidades e a lojinha são telas de verdade.
 * O que é de mentirinha: o estado mora no aparelho (localStorage) e não no núcleo, e comprar
 * enfeite não põe nada no inventário (o desenho do núcleo está no relatório do esboço).
 */
import { tema } from '../../temas/ativo';
import { notificar } from '../../ui/interface';
import { obraDoCanteiro, celulasDaObra } from '../../world/obras';
import { HABILIDADES, missoesDoMundo, type MundoAlma } from './dados';
import {
  abertas,
  comprar,
  definirProgresso,
  estadoVazio,
  normalizarEstado,
  registrar,
  type EstadoAlma,
  type EventoAlma,
} from './estado';
import { criarUiAlma } from './ui';
import { festejar, tlim } from './festa';
import { registrarFantasiasAlma } from './fantasias';

interface ApiAlma {
  pronto: boolean;
  mundo: MundoAlma;
  estado(): EstadoAlma;
  definir(parcial: Partial<EstadoAlma>): void;
  zerar(): void;
  registrar(chave: string, qtd?: number): void;
  progresso(id: string, valor: number): void;
  quadro(): void;
  abrir(aba: 'album' | 'habilidades' | 'loja', hab?: string): void;
  fechar(): void;
  /** Festas na fila ou na tela. */
  festando(): boolean;
}

declare global {
  interface Window {
    __alma?: ApiAlma;
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
  const chave = `terrario:esboco-alma:${mundo}:${new URL(location.href).searchParams.get('mundo') ?? 'padrao'}`;
  let e: EstadoAlma = estadoVazio();
  try {
    e = normalizarEstado(JSON.parse(localStorage.getItem(chave) ?? 'null'), mundo);
  } catch {
    // sem armazenamento
  }
  const salvar = () => {
    try {
      localStorage.setItem(chave, JSON.stringify(e));
    } catch {
      // sem armazenamento
    }
  };

  const vestir = (f: string) =>
    window.__brumaluz?.personagem?.definir({ fantasia: { id: f, cor: 0 } } as never);

  const ui = criarUiAlma({
    estado: () => e,
    mundo,
    fixar: (m) => {
      e.fixada = m;
      salvar();
    },
    comprar: (item) => {
      const r = comprar(e, mundo, item);
      if (r.ok) {
        salvar();
        ui.renderHud();
      }
      return r.ok;
    },
    vestir,
    aoAbrir: () => undefined,
    aoFechar: () => undefined,
  });
  ui.bau.addEventListener('click', () => ui.abrir('album'));
  ui.cartao.addEventListener('click', () => ui.quadro());
  ui.renderHud();

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
    if (!ev.some((x) => x.tipo === 'concluiu' || x.tipo === 'nivel')) return;
    fila.push(ev);
    if (festando) return;
    festando = true;
    while (fila.length) {
      const lote = fila.shift()!;
      const fim = lote.find((x) => x.tipo === 'concluiu');
      const niv = lote.filter((x) => x.tipo === 'nivel').pop();
      const nivel =
        niv && niv.tipo === 'nivel'
          ? { h: HABILIDADES[mundo].find((h) => h.id === niv.habilidade)!, nivel: niv.nivel }
          : undefined;
      if (fim && fim.tipo === 'concluiu') {
        // na obra, a festa do mundo (fogos e ta-dá da 014) vem primeiro
        if (fim.missao.conta.tipo === 'obra') await esperar(2200);
        ui.fechar();
        await festejar(ui, { missao: fim.missao, moedas: fim.moedas, fantasia: fim.fantasia, nivel }, vestir, e.moedas);
      } else if (nivel) {
        // só subiu de nível: a medalha brilha no baú
        ui.bau.classList.add('novidade');
        tlim(4);
      }
    }
    festando = false;
    ui.renderHud();
  }
  const reg = (k: string, q = 1) => void tratar(registrar(e, mundo, k, q));

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
    const c = p as { item: string; qtd: number };
    if (c.item === 'ovo') reg('coletou:ovo', c.qtd);
  });
  ouvir('trocou', (d) => reg(`trocou:${(d as { profissao: string }).profissao}`));
  ouvir('obra', (d) => {
    const o = d as { canteiro?: number; feita?: boolean };
    if (!o.feita) return;
    const m = missoesDoMundo(mundo).find((x) => x.conta.tipo === 'obra' && x.conta.canteiro === o.canteiro);
    if (m) void tratar(definirProgresso(e, mundo, m.id, 1));
  });

  // a obra enchendo (os fantasmas que faltam) e os lugares visitados: olhados de tempos em tempos
  const restantes = new Map<number, number>();
  const visitados = new Set<string>();
  setInterval(() => {
    const b = window.__brumaluz;
    if (!b?.ready) return;
    if (mundo === 'cidade-grande') {
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
          const total = celulasDaObra(def).length;
          const fr = 1 - falta / total;
          if (fr < 1) void tratar(definirProgresso(e, mundo, m.id, fr));
        }
      }
      // lugares: dentro do lote da padaria, da escola, da sorveteria...
      const p = b.posicao;
      const plano = b.cidade?.();
      if (p && plano) {
        const lote = plano.lotes.find(
          (l) => p[0] >= l.x0 && p[0] < l.x0 + l.largura && p[2] >= l.z0 && p[2] < l.z0 + l.profundidade,
        );
        if (lote && !visitados.has(lote.uso)) {
          visitados.add(lote.uso);
          contarLugar(lote.uso);
        }
      }
    }
  }, 400);
  function contarLugar(uso: string): void {
    reg('visitou:lugar');
    for (const m of abertas(e, mundo)) {
      if (m.conta.tipo !== 'lugares' || !m.conta.usos.includes(uso)) continue;
      const n = m.conta.usos.filter((u) => visitados.has(u)).length;
      void tratar(definirProgresso(e, mundo, m.id, n));
    }
  }

  // primeira vez neste mundo: o quadro de missões aparece sozinho, uma vez (o prêmio antes)
  const esperarPronto = () => {
    if (!window.__brumaluz?.ready) return void setTimeout(esperarPronto, 400);
    window.__brumaluz.barramento?.ouvir('colocacao', () => reg('colocou'));
    ui.renderHud();
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
    estado: () => e,
    definir: (parcial) => {
      e = normalizarEstado({ ...e, ...parcial }, mundo);
      salvar();
      ui.renderHud();
    },
    zerar: () => {
      e = estadoVazio();
      visitados.clear();
      salvar();
      ui.renderHud();
    },
    registrar: reg,
    progresso: (m, v) => void tratar(definirProgresso(e, mundo, m, v)),
    quadro: () => ui.quadro(),
    abrir: (aba, hab) => ui.abrir(aba, hab),
    fechar: () => ui.fechar(),
    festando: () => festando,
  };
}

function esperar(ms: number): Promise<void> {
  return new Promise((ok) => setTimeout(ok, ms));
}
