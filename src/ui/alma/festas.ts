/**
 * Spec 023 (T08): a fila das festas. Missão, nível e premium passam uma depois da outra, nunca
 * uma por cima da outra. Enquanto a fila anda, a carteira espera: as moedinhas e o anel do
 * nível só sobem depois do voo de cada festa (o ganho já está no perfil; é só a vista).
 *
 * - **missão:** a fantasia no boneco de verdade (ou a figurinha), as moedinhas com o tlim, o
 *   selo da habilidade que ganhou estrela e, com fantasia, o "vestir agora";
 * - **nível:** a estrela grande com o número e o presentinho (e as moedinhas dele);
 * - **premium (pronta para a fase D, a lojinha):** veludo, holofote e pedestal.
 */
import {
  HABILIDADES,
  MOEDAS_BIS,
  missaoPorId,
  xpParaNivel,
  type MissaoMovida,
  type MudancaPerfil,
  type PerfilAlma,
} from '../../jogo/alma';
import { tocarSomInterface } from '../../audio/somInterface';
import { CAMISETA, celebrar } from './festa';
import { desenhoDaFigurinha, figura } from './figuras';
import { svgEl, type HudAlma } from './hud';

/** Um lote: o que um evento do núcleo trouxe (as missões concluídas e o que mudou no perfil). */
export interface LoteFesta {
  missoes: MissaoMovida[];
  mudanca: MudancaPerfil;
}

export interface OpcoesFestas {
  hud: HudAlma;
  perfil(): PerfilAlma;
  /** Veste a fantasia de prêmio agora (o botão da festa). */
  vestir(fantasia: string): void;
  /** A fila acabou: volta a prender o ponteiro no jogo (se nada mais estiver aberto). */
  aoFechar(): void;
}

/**
 * Enquanto a fila anda, a página fica "com painel" (a pausa não abre ao soltar o ponteiro),
 * mas a carteira continua à vista: as moedinhas voam para ela.
 */
export const OVERLAY_FESTA = 'alma-festa';

const esperar = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

export function criarFestas(op: OpcoesFestas) {
  const { hud } = op;
  type Item =
    | { tipo: 'lote'; lote: LoteFesta }
    | { tipo: 'premium'; arte: HTMLElement; depois?: () => void };
  const fila: Item[] = [];
  let festando = false;

  /** Um lote vira festa se acabou missão (com prêmio) ou subiu de nível. */
  function temFesta(l: LoteFesta): boolean {
    return l.missoes.some((m) => m.concluiu) || l.mudanca.niveis.length > 0;
  }

  function enfileirar(item: Item): void {
    fila.push(item);
    if (festando) return;
    festando = true;
    hud.segurar(true);
    if (!document.body.dataset.overlay) document.body.dataset.overlay = OVERLAY_FESTA;
    void andar();
  }

  async function andar(): Promise<void> {
    try {
      while (fila.length) {
        const item = fila.shift()!;
        // um painel aberto (o quadro, o baú) fecha antes da festa
        if (hud.aberto()) {
          hud.fechar();
          document.body.dataset.overlay ||= OVERLAY_FESTA;
        }
        if (item.tipo === 'premium') await festaPremium(item.arte, item.depois);
        else await festasDoLote(item.lote);
      }
    } finally {
      festando = false;
      hud.segurar(false);
      if (document.body.dataset.overlay === OVERLAY_FESTA) {
        delete document.body.dataset.overlay;
        op.aoFechar();
      }
      // o que sobrar (um ganho pequeno que chegou durante a festa) aparece agora
      await hud.mostrarGanho();
      hud.renderHud();
    }
  }

  /** As moedinhas do lote que são do presente de nível (contam na festa do nível). */
  const moedasDosNiveis = (l: LoteFesta) =>
    l.mudanca.niveis.reduce((s, n) => s + (n.presente?.moedas ?? 0), 0);

  async function festasDoLote(l: LoteFesta): Promise<void> {
    const p = op.perfil();
    // o perfil já tem tudo: a carteira mostra o "antes" e sobe a cada festa
    const moedasNoFim = p.moedas;
    const moedasDosLotesSeguintes = fila.reduce(
      (s, i) => s + (i.tipo === 'lote' ? i.lote.mudanca.moedas : 0),
      0,
    );
    const alvoFinal = moedasNoFim - moedasDosLotesSeguintes;
    const alvoMissao = alvoFinal - moedasDosNiveis(l);
    const primeiroNivel = l.mudanca.niveis[0]?.nivel;
    for (const mv of l.missoes.filter((m) => m.concluiu)) {
      const m = missaoPorId(mv.id);
      if (!m) continue;
      // na obra, a festa do mundo (fogos e o ta-dá da 014) vem primeiro
      if (m.conta.tipo === 'obra') await esperar(2200);
      // (spec 026, etapa B: o fim da missão acontece no mundo primeiro: a vovó, as lhamas)
      else if (m.festaEspera) await esperar(m.festaEspera);
      const estrela = l.mudanca.estrelas.filter((e) => e.habilidade === m.habilidade).pop();
      let canto: HTMLElement | undefined;
      if (estrela) {
        const h = HABILIDADES.find((x) => x.id === estrela.habilidade)!;
        canto = document.createElement('div');
        canto.setAttribute('data-alma-estrela', h.id);
        // spec 031: as missões com desenho próprio mostram o selo delas (o saco de confeitar, o
        // pincel...), na cor da habilidade; as de antes, o desenho da habilidade
        const d = figura(m.desenho.tipo === 'arte' ? m.desenho.selo : h.desenho);
        d.style.cssText = `width:84px;height:84px;padding:10px;box-sizing:border-box;border-radius:50%;background:#fffaf0;box-shadow:0 0 0 6px ${h.cor},0 6px 0 6px rgba(120,60,10,0.3)`;
        const est = document.createElement('span');
        est.className = 'alma-estrelas';
        for (let i = 0; i < 5; i++)
          est.appendChild(svgEl(i < estrela.estrelas ? 'estrela' : 'estrelaVazia'));
        canto.append(d, est);
      }
      const fant = mv.fantasia;
      const moedas = mv.bis ? MOEDAS_BIS : m.moedas;
      await celebrar({
        tipo: 'missao',
        missao: m.id,
        premio: figura(fant ? `fantasia:${fant}` : desenhoDaFigurinha(m)),
        figurinha: fant ? figura(desenhoDaFigurinha(m)) : undefined,
        moedas,
        canto,
        extra: fant
          ? { rotulo: 'Vestir agora', desenho: CAMISETA, aoTocar: () => op.vestir(fant) }
          : undefined,
        origem: origemMoedas?.(m.id) ?? null,
        destino: () => hud.carteira.getBoundingClientRect(),
        voar: hud.voar,
        svg: svgEl,
        depois: async () => {
          await hud.contarMoedasAte(alvoMissao);
          // o anel enche até a borda do nível de antes (a festa do nível vira a página)
          await hud.encherXp(primeiroNivel ? xpParaNivel(primeiroNivel) - 0.001 : p.xp);
        },
      });
    }
    for (const n of l.mudanca.niveis) {
      await celebrar({
        tipo: 'nivel',
        premio: document.createElement('span'),
        nivel: n.nivel,
        presente: n.presente ? figura(n.presente.desenho) : undefined,
        moedas: n.presente?.moedas ?? 0,
        destino: () => hud.nivelEl.getBoundingClientRect(),
        voar: hud.voar,
        svg: svgEl,
        depois: async () => {
          const ultimo = n === l.mudanca.niveis[l.mudanca.niveis.length - 1];
          await hud.encherXp(ultimo ? p.xp : xpParaNivel(n.nivel + 1) - 0.001);
          await hud.contarMoedasAte(ultimo ? alvoFinal : hud_moedasAte(n.nivel));
        },
      });
    }
    // sem missão nem nível (não deveria chegar aqui), só mostra
    if (!l.missoes.some((m) => m.concluiu) && !l.mudanca.niveis.length)
      await hud.contarMoedasAte(alvoFinal);

    function hud_moedasAte(nivel: number): number {
      // as moedinhas dos presentes até este nível
      let s = alvoMissao;
      for (const x of l.mudanca.niveis) {
        s += x.presente?.moedas ?? 0;
        if (x.nivel === nivel) break;
      }
      return s;
    }
  }

  async function festaPremium(arte: HTMLElement, depois?: () => void): Promise<void> {
    await celebrar({
      tipo: 'premium',
      premio: arte,
      moedas: 0,
      destino: () => hud.carteira.getBoundingClientRect(),
      voar: hud.voar,
      svg: svgEl,
      depois: async () => {
        await hud.contarMoedasAte(op.perfil().moedas);
        depois?.();
      },
    });
  }

  /** Spec 030: de onde vêm as moedinhas de cada missão (o lugar dela na tela). */
  let origemMoedas: ((missao: string) => { x: number; y: number } | null) | null = null;
  return {
    definirOrigemMoedas(f: (missao: string) => { x: number; y: number } | null) {
      origemMoedas = f;
    },
    /** O lote de um evento: vira festa (na fila) ou só a carteira subindo. */
    receber(l: LoteFesta): void {
      if (temFesta(l)) enfileirar({ tipo: 'lote', lote: l });
      else if (!festando) void hud.mostrarGanho();
    },
    /** Fase D (lojinha): a festa da compra premium, na mesma fila. */
    premium(arte: HTMLElement, depois?: () => void): void {
      enfileirar({ tipo: 'premium', arte, depois });
    },
    get festando() {
      return festando;
    },
    /** Testes: o som da festa já tocou? (as festas tocam pelo motor do jogo). */
    tocar: tocarSomInterface,
  };
}
export type FestasAlma = ReturnType<typeof criarFestas>;
