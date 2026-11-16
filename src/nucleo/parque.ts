/**
 * O Parque de diversões no núcleo (spec 026, parte 2): o núcleo é dono das cadeiras. Puro (sem
 * tela): `criarVila` passa o que este módulo precisa, e ele vale igual no aparelho e na nuvem.
 *
 * - **Sentar:** o toque no brinquedo pede uma cadeira; o núcleo confere que a criança alcança o
 *   brinquedo (`alcancaOBrinquedo`, a mesma conta da tela) e dá a cadeira livre (`escolherCadeira`).
 *   Cada cadeira tem um dono só; dois amigos andam juntos, cada um na sua.
 * - **Onde a cadeira está**, na roda-gigante e no carrossel, é conta do relógio do mundo
 *   (`src/jogo/parque.ts`): nada vai pela rede a cada quadro. O quadro leva só quem está sentado
 *   onde, e o empurrão da roda.
 * - **O bate-bate é guiado e simulado aqui** (dono, 16 nov 2026: "guiar o carrinho e bater no
 *   outro de fato"): a criança manda o controle (`guiar`: o rumo, numerado), o núcleo anda todos
 *   os carrinhos a cada passo (`src/jogo/bate.ts`) e devolve onde cada um está (`bateDe`), com o
 *   número do último controle que já usou (a tela prevê o carrinho dela e acerta por esse número).
 *   Os quatro primeiros carrinhos são dos moradores (guiam sozinhos, desviam de criança parada);
 *   os outros quatro são das crianças e, vazios, voltam para a vaga na beira da pista. Com
 *   ninguém perto do parque a pista descansa (nenhuma conta, nenhuma mensagem).
 * - **Descer:** na roda-gigante, sozinha, quando a cadeirinha volta embaixo depois da volta
 *   inteira; no carrossel e no bate-bate, quando a criança escolhe ("Sair", ou parar o carrinho
 *   no tapete da saída: a tela é que pede). Quem some do mundo (saiu, morreu, pulou para longe)
 *   solta a cadeira. O núcleo diz onde ela pisa ao descer.
 * - **A batida** ("tum") é do núcleo: dois carrinhos (ou um e a mureta) se encontraram com força;
 *   **o toque na roda** dá o empurrãozinho (um por vez, para todos).
 * - **Nada é salvo:** ao abrir o mundo todo mundo está em pé e os carrinhos nas vagas.
 * - **Para as missões da fase seguinte**, o núcleo já conta as chaves `andou:roda` (a volta
 *   inteira), `andou:carrossel` (uma volta) e `andou:bate` (o passeio de bate-bate: três batidas
 *   em outro carrinho, ou vinte segundos guiando; uma vez por passeio).
 */
import {
  BRINQUEDOS,
  CADEIRAS,
  SEM_IMPULSO,
  VOLTA_CARROSSEL,
  alcancaOBrinquedo,
  anguloDaCadeirinha,
  distanciaDoBrinquedo,
  empurrarRoda,
  escolherCadeira,
  fimDoPasseio,
  lugarDaCadeira,
  saidaDaCadeira,
  type Brinquedo,
  type ImpulsoRoda,
  type ParqueVila,
  type ParqueVista,
  type Sentado,
} from '../jogo/parque';
import {
  N_CARRINHOS,
  N_MORADORES_BATE,
  PASSO_BATE,
  acalmarPiloto,
  estacionar,
  guiaDaRede,
  guiaDoMorador,
  guiaParaAVaga,
  novoCarrinho,
  novoPiloto,
  passoBate,
  vistaDoBate,
  type Batida,
  type BateVista,
  type Carrinho,
  type Guia,
  type QuemGuia,
} from '../jogo/bate';

export interface JogadorParque {
  id: string;
  x: number;
  y: number;
  z: number;
  morto: boolean;
}

export interface CtxParque {
  parque: ParqueVila;
  /** Os pés no chão do bairro. */
  chao: number;
  agora(): number;
  jogadores(): JogadorParque[];
  jogador(id: string): JogadorParque | undefined;
  /** O próximo lugar que o jogador mandar vale mesmo longe do de antes (ele desceu do brinquedo). */
  soltar(id: string): void;
  evento(id: string, chave: string, qtd?: number): void;
  espalhar(e: EventoParque): void;
  sujar(): void;
}

export type EventoParque =
  /** Alguém sentou (o "puf" e o sininho, para todos). */
  | { e: 'parqueSentou'; quem: string; b: number; i: number }
  /** Alguém desceu: onde pisa (o próprio vai para lá) e se foi o fim da volta da roda. */
  | {
      e: 'parqueDesceu';
      quem: string;
      b: number;
      i: number;
      x: number;
      y: number;
      z: number;
      fim?: true;
    }
  /**
   * O "tum": o carrinho `de` bateu no `alvo` (-1: na mureta), em (x, z), com a força `f`
   * (blocos/s). `quem` é a criança de um dos dois ('' se nenhum tem criança).
   */
  | { e: 'parqueTum'; quem: string; de: number; alvo: number; x: number; z: number; f: number }
  /** O empurrãozinho na roda-gigante (as lâmpadas piscam). */
  | { e: 'parqueRoda'; quem: string };

export type ComandoParque =
  | { a: 'sentar'; b: number }
  | { a: 'sair' }
  | { a: 'roda' }
  /** O controle do carrinho: o rumo no mundo (-100 a 100) e o número dele (só cresce). */
  | { a: 'guiar'; x: number; z: number; n: number };

/** Longe da cadeira por mais que isto (blocos), depois da folga, a criança soltou a cadeira. */
export const LONGE_DA_CADEIRA = 6;
export const FOLGA_AO_SENTAR = 2;
/** Até onde (blocos) o toque na roda-gigante dá o empurrãozinho. */
export const ALCANCE_EMPURRAR = 14;
/** Até onde (blocos, do meio da pista) há gente perto: a pista anda e o quadro leva os carrinhos. */
export const PERTO_DO_BATE = 80;
/** O passeio de bate-bate conta com tantas batidas em outro carrinho, ou tantos segundos guiando. */
export const BATIDAS_DO_PASSEIO = 3;
export const SEGUNDOS_DO_PASSEIO = 20;
/** Os controles que a criança pode mandar por segundo e quantos esperam na fila. */
export const GUIAR_POR_SEGUNDO = 40;
export const FILA_DE_GUIAR = 4;
/** Sem controle novo por tantos passos, o carrinho para (a rede da criança travou). */
const PASSOS_SEM_CONTROLE = 12;
/** A mesma dupla só faz "tum" de novo depois disto (s). */
const ENTRE_BATIDAS = 0.4;

/** O controle de uma criança que guia: a fila dos que chegaram e o último usado. */
interface Volante {
  fila: { n: number; x: number; z: number }[];
  guia: { x: number; z: number };
  /** O número do último controle usado (vai no quadro) e o maior que já chegou. */
  ack: number;
  maior: number;
  /** Passos sem controle novo. */
  seco: number;
  /** O limite por segundo: o segundo de agora e quantos chegaram nele. */
  seg: number;
  qtd: number;
  /** O passeio: batidas em outro carrinho e segundos guiando. */
  batidas: number;
  guiou: number;
}

export function criarParqueNucleo(ctx: CtxParque) {
  const { parque } = ctx;
  const B = parque.bate;
  const sentados = new Map<string, Sentado>();
  /** Quem já contou a chave do passeio de agora (uma vez por passeio). */
  const contou = new Set<string>();
  let impulso: ImpulsoRoda = SEM_IMPULSO;

  // ---------------------------------------------------------------- o bate-bate
  const carros: Carrinho[] = Array.from({ length: N_CARRINHOS }, (_, i) => {
    const v = B.vagas[i] ?? [B.x, B.z, 0];
    return novoCarrinho(v[0], v[1], v[2]);
  });
  const pilotos = Array.from({ length: N_MORADORES_BATE }, (_, i) => novoPiloto(7919 * (i + 1)));
  const volantes = new Map<string, Volante>();
  /** Quem está perto da pista (conferido a cada meio segundo). */
  let perto = new Set<string>();
  let passos = 0;
  const ultimaBatida = new Map<number, number>();

  const ocupada = (b: Brinquedo) => (i: number) => {
    for (const s of sentados.values()) if (s.b === b && s.i === i) return true;
    return false;
  };
  const numero = (b: Brinquedo) => BRINQUEDOS.indexOf(b);
  /** A criança que guia o carrinho `i` ('' sem ninguém). */
  const criancaDo = (i: number): string => {
    for (const [id, s] of sentados) if (s.b === 'bate' && s.i === i) return id;
    return '';
  };
  const lugar = (s: Sentado, t: number) => lugarDaCadeira(parque, s.b, s.i, t, impulso, carros);

  function sentar(j: JogadorParque, nb: number): void {
    const b = BRINQUEDOS[nb];
    if (!b || sentados.has(j.id)) return;
    if (!alcancaOBrinquedo(parque, b, j.x, j.z) || Math.abs(j.y - ctx.chao) > 4) return;
    const t = ctx.agora();
    const i = escolherCadeira(parque, b, j.x, j.z, t, ocupada(b), impulso, carros);
    if (i < 0) return;
    const s: Sentado = { b, i, desde: t };
    if (b === 'roda') s.fim = fimDoPasseio(i, t, impulso);
    sentados.set(j.id, s);
    contou.delete(j.id);
    if (b === 'bate') {
      volantes.set(j.id, {
        fila: [],
        guia: { x: 0, z: 0 },
        ack: 0,
        maior: 0,
        seco: 0,
        seg: 0,
        qtd: 0,
        batidas: 0,
        guiou: 0,
      });
      perto.add(j.id);
    }
    ctx.espalhar({ e: 'parqueSentou', quem: j.id, b: nb, i });
    ctx.sujar();
  }

  function largar(id: string): void {
    sentados.delete(id);
    contou.delete(id);
    volantes.delete(id);
    ctx.sujar();
  }

  function descer(id: string, fim = false): void {
    const s = sentados.get(id);
    if (!s) return;
    const [x, y, z] = saidaDaCadeira(parque, s.b, s.i, ctx.agora(), ctx.chao, carros);
    largar(id);
    ctx.soltar(id);
    ctx.espalhar({
      e: 'parqueDesceu',
      quem: id,
      b: numero(s.b),
      i: s.i,
      x: Math.round(x * 100) / 100,
      y,
      z: Math.round(z * 100) / 100,
      ...(fim ? { fim: true as const } : {}),
    });
  }

  /** O controle do carrinho que chegou da criança (com limite por segundo e fila curta). */
  function guiar(id: string, c: { x: number; z: number; n: number }): void {
    const v = volantes.get(id);
    if (!v || sentados.get(id)?.b !== 'bate') return;
    const seg = Math.floor(ctx.agora());
    if (seg !== v.seg) {
      v.seg = seg;
      v.qtd = 0;
    }
    if (++v.qtd > GUIAR_POR_SEGUNDO) return;
    if (!Number.isInteger(c.n) || c.n <= v.maior) return;
    v.maior = c.n;
    v.fila.push({ n: c.n, ...guiaDaRede(c.x, c.z) });
    // a fila encheu (a rede soltou vários de uma vez): os mais velhos não valem mais
    while (v.fila.length > FILA_DE_GUIAR) v.fila.shift();
  }

  function contarPasseio(id: string): void {
    if (contou.has(id)) return;
    contou.add(id);
    ctx.evento(id, 'andou:bate');
  }

  /** Um passo dos carrinhos (a cada passo do núcleo, com gente perto). */
  function passoDoBate(): void {
    passos++;
    if (passos % 10 === 1) {
      const novo = new Set<string>();
      for (const j of ctx.jogadores())
        if (!j.morto && Math.hypot(j.x - B.x, j.z - B.z) <= PERTO_DO_BATE) novo.add(j.id);
      for (const id of volantes.keys()) novo.add(id);
      perto = novo;
    }
    if (!perto.size) return;
    const t = ctx.agora();
    const donos: string[] = [];
    for (let i = 0; i < N_CARRINHOS; i++) donos.push(i < N_MORADORES_BATE ? '' : criancaDo(i));
    const quem = (j: number): QuemGuia =>
      j < N_MORADORES_BATE ? 'morador' : donos[j] ? 'crianca' : 'vazio';
    const guias: Guia[] = [];
    for (let i = 0; i < N_CARRINHOS; i++) {
      const c = carros[i];
      if (i < N_MORADORES_BATE) {
        guias.push(guiaDoMorador(B, carros, i, pilotos[i], t, quem));
        continue;
      }
      const v = donos[i] ? volantes.get(donos[i]) : undefined;
      if (v) {
        const q = v.fila.shift();
        if (q) {
          v.guia = { x: q.x, z: q.z };
          v.ack = q.n;
          v.seco = 0;
        } else if (++v.seco > PASSOS_SEM_CONTROLE) v.guia = { x: 0, z: 0 };
        guias.push(v.guia);
        if (c.v > 1) v.guiou += PASSO_BATE;
        if (v.guiou >= SEGUNDOS_DO_PASSEIO) contarPasseio(donos[i]);
        continue;
      }
      // vazio: volta para a vaga e fica lá, de frente para a pista
      const vaga = B.vagas[i];
      const g = guiaParaAVaga(c, [vaga[0], vaga[1]]);
      if (!g) estacionar(c, [vaga[0], vaga[1]], vaga[2], PASSO_BATE);
      guias.push(g ?? { x: 0, z: 0 });
    }
    const batidas: Batida[] = [];
    passoBate(B, carros, guias, PASSO_BATE, batidas);
    for (const b of batidas) {
      const chave = b.a * 16 + (b.b < 0 ? 15 : b.b);
      if (t - (ultimaBatida.get(chave) ?? -1e9) < ENTRE_BATIDAS) continue;
      ultimaBatida.set(chave, t);
      const da = donos[b.a];
      const db = b.b >= 0 ? donos[b.b] : '';
      ctx.espalhar({
        e: 'parqueTum',
        quem: da || db,
        de: b.a,
        alvo: b.b,
        x: Math.round(b.x * 100) / 100,
        z: Math.round(b.z * 100) / 100,
        f: Math.round(b.f * 10) / 10,
      });
      if (b.b < 0) continue;
      for (const id of [da, db]) {
        const v = id ? volantes.get(id) : undefined;
        if (v && ++v.batidas >= BATIDAS_DO_PASSEIO) contarPasseio(id);
      }
      // o morador que bateu numa criança (ou levou a batida dela) vai para longe por uns segundos
      if (b.a < N_MORADORES_BATE && db) acalmarPiloto(B, pilotos[b.a], carros[b.a], b.b, carros[b.b], t);
      if (b.b < N_MORADORES_BATE && da) acalmarPiloto(B, pilotos[b.b], carros[b.b], b.a, carros[b.a], t);
    }
  }

  function empurrar(j: JogadorParque): void {
    const s = sentados.get(j.id);
    const pertoDaRoda =
      s?.b === 'roda' || distanciaDoBrinquedo(parque, 'roda', j.x, j.z) <= ALCANCE_EMPURRAR;
    if (!pertoDaRoda) return;
    const novo = empurrarRoda(impulso, ctx.agora());
    if (novo === impulso) return;
    impulso = novo;
    ctx.espalhar({ e: 'parqueRoda', quem: j.id });
    ctx.sujar();
  }

  return {
    comando(id: string, c: ComandoParque): void {
      const j = ctx.jogador(id);
      if (!j || j.morto) return;
      if (c.a === 'sentar') sentar(j, c.b);
      else if (c.a === 'sair') descer(id);
      else if (c.a === 'guiar') guiar(id, c);
      else if (c.a === 'roda') empurrar(j);
    },
    /** O controle do carrinho (fora do limite de toques: vem a cada passo, com limite próprio). */
    guiar,
    /** A cada passo do núcleo: os carrinhos do bate-bate. */
    passoDoBate,
    /** A cada passo do núcleo (umas 4 vezes por segundo basta). */
    passo(): void {
      if (!sentados.size) return;
      const t = ctx.agora();
      for (const [id, s] of [...sentados]) {
        const j = ctx.jogador(id);
        // saiu do mundo ou morreu: a cadeira fica livre (ele não está mais lá para descer)
        if (!j || j.morto) {
          largar(id);
          continue;
        }
        // foi para longe por outro caminho (pulou para um amigo, voltou para casa): soltou
        const l = lugar(s, t);
        if (
          t - s.desde > FOLGA_AO_SENTAR &&
          Math.hypot(j.x - l.x, j.y - l.y, j.z - l.z) > LONGE_DA_CADEIRA
        ) {
          largar(id);
          continue;
        }
        if (s.b === 'roda' && s.fim !== undefined) {
          // a volta inteira: a cadeirinha chegou embaixo de novo e a criança desce sozinha
          if (anguloDaCadeirinha(s.i, t, impulso) >= s.fim) {
            ctx.evento(id, 'andou:roda');
            descer(id, true);
          }
        } else if (s.b === 'carrossel' && !contou.has(id) && t - s.desde >= VOLTA_CARROSSEL) {
          contou.add(id);
          ctx.evento(id, 'andou:carrossel');
        }
      }
    },
    vista(): ParqueVista {
      const s: ParqueVista['s'] = {};
      for (const [id, q] of sentados)
        s[id] = [numero(q.b), q.i, Math.round(q.desde * 1000) / 1000, q.fim ?? 0];
      return { r: [impulso.d, impulso.ti], s };
    },
    /**
     * Os carrinhos para o quadro deste jogador (`null`: longe da pista, ou não é a vez dele): quem
     * guia recebe a cada passo; quem só olha, passo sim, passo não.
     */
    bateDe(id: string, n: number): BateVista | null {
      if (!perto.has(id)) return null;
      const v = volantes.get(id);
      if (!v && n % 2) return null;
      return vistaDoBate(carros, v?.ack ?? 0);
    },
    /** Os carrinhos de agora (os moradores que guiam ficam neles; testes). */
    carros: (): readonly Carrinho[] => carros,
    /** Testes: quem está sentado e o empurrão da roda. */
    sentados: () => new Map(sentados),
    impulso: () => impulso,
    cadeiras: CADEIRAS,
  };
}

export type ParqueNucleo = ReturnType<typeof criarParqueNucleo>;
