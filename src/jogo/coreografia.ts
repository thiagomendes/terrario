/**
 * A coreografia da banda no Show da Vila (spec 026, o show de verdade: o dono, 16 nov 2026, "a
 * banda entra no palco" e "os músicos andam pelo palco"). Pura e igual no núcleo e na tela: o
 * núcleo põe cada músico onde a coreografia manda (a posição vale para todos, quem chega no meio
 * vê o momento certo) e a tela tira dela o gesto de cada instante.
 *
 * Tudo no referencial do palco: `a` = x − `palco.x0` e `b` = z − `palco.z0` (blocos). O tablado vai
 * de a 0 a 33 e de b 5 a 20; a passarela, de a 14 a 20 e de b 0 a 5 (a ponta, onde o vocalista
 * canta, fica em b ≈ 1); a escadinha, no lado leste (a 33 a 36, b 7 a 9), sobe para o oeste; o
 * praticável da bateria, de a 13 a 21 e de b 16 a 19, um bloco acima do tablado; o teclado, em
 * a ≈ 26,5 e b ≈ 14,5 (quem toca fica atrás dele, de frente para o povo); a coxia (onde a banda
 * espera de noite) é o chão do lado leste do palco, e a van da banda fica atrás dele.
 *
 * - **Fora do show a banda nunca fica no palco** (o dono, 16 nov 2026: "a banda estava em pé no
 *   palco e, quando o show começou, desceu para subir de novo e ficou presa"): de dia ela fica de
 *   papo na frente da van; quando a noite do show chega, vai a pé para a coxia e espera ali.
 * - **Na entrada** cada um sobe a escadinha (um depois do outro) e vai para o lugar; o vocalista
 *   chega na ponta da passarela e acena; a tecladista vai para trás do teclado.
 * - **Nas músicas** o vocalista anda pela frente do palco de um lado ao outro no refrão, levanta o
 *   braço do microfone e bate cabeça; a guitarrista vai para a ponta no solo; guitarrista e
 *   baixista tocam de costas uma para o outro na ponte, e andam juntas no refrão da última; o
 *   baterista toca sentado.
 * - **A tecladista** balança tocando o teclado (as camadas do sintetizador da música), levanta a
 *   mão no começo dos refrões e, no último refrão da segunda música (a do gancho no
 *   sintetizador), pega o teclado de pendurar e vai para a frente do palco.
 * - **Nas pausas** a banda acena; o baterista levanta as baquetas e conta a próxima.
 * - **No fim** todos pulam no acorde final, vêm para a frente, fazem a reverência, acenam e saem
 *   pela escadinha de volta para a coxia.
 */
import { APLAUSO, INTRO, PAUSA, ROTEIRO, type MusicaNoShow, type Show } from './show';

export type PapelBanda =
  | 'vocalista'
  | 'guitarrista'
  | 'baixista'
  | 'baterista'
  | 'tecladista'
  | 'roadie';
export const PAPEIS_BANDA: readonly PapelBanda[] = [
  'vocalista',
  'guitarrista',
  'baixista',
  'baterista',
  'tecladista',
  'roadie',
];

/** O que o músico faz (a tela tira o gesto daqui). */
export type AcaoBanda =
  | 'esperar'
  | 'cantar'
  | 'bracoAlto'
  | 'tocar'
  | 'baterCabeca'
  | 'balancar'
  | 'solo'
  | 'palmas'
  | 'acenar'
  | 'apontar'
  | 'pulo'
  | 'reverencia'
  | 'bateria'
  | 'contagem'
  | 'baquetasAlto'
  | 'sentado'
  /** A tecladista: as duas mãos nas teclas, balançando no tempo. */
  | 'teclado'
  /** Uma mão nas teclas e a outra no alto, chamando o povo. */
  | 'tecladoMao'
  /** O teclado de pendurar (o keytar) no peito, tocando e balançando na frente do palco. */
  | 'keytar';

export type Ponto = readonly [number, number];

export interface PosturaBanda {
  a: number;
  b: number;
  /** A altura dos pés acima do chão do campo (blocos): 0 no chão, 3 no tablado, 4 no praticável. */
  altura: number;
  /** Para onde olha (o giro do núcleo: atan2(dx, dz)). */
  giro: number;
  andando: boolean;
  acao: AcaoBanda;
  /** s desde que a ação começou (a fase do gesto). */
  desde: number;
}

/** A altura do tablado (blocos acima do chão) e a do praticável da bateria. */
export const ALTURA_PALCO = 3;
const ALTURA_PRATICAVEL = 4;
/** O baterista sentado no banquinho (os pés ficam no praticável; o corpo, na altura do banco). */
export const ALTURA_BANCO = ALTURA_PRATICAVEL + 0.95;

/** De frente para o povo (−z). */
export const PARA_O_POVO = Math.PI;
const PARA_OESTE = -Math.PI / 2;
const PARA_LESTE = Math.PI / 2;

// ------------------------------------------------------------------ os lugares
export const PONTA: Ponto = [17, 0.95];
const FRENTE: Ponto = [17, 6.2];
const FRENTE_ESQ: Ponto = [8.6, 6.3];
const FRENTE_DIR: Ponto = [25.2, 6.3];
/** O desvio do pedestal do microfone, no caminho da frente para a ponta. */
const DESVIO_PONTA: Ponto = [15.6, 2.1];
export const BANCO: Ponto = [17, 18.5];
const SAIDA_PRATICAVEL: Ponto = [21.5, 18.4];
const CANTO_PRATICAVEL: Ponto = [22.5, 16.0];
const DESVIO_TECLADO: Ponto = [23.5, 12.0];
export const TOPO_ESCADA: Ponto = [32.4, 8.0];
/** Do alto da escadinha para a frente do palco (na frente da caixa do leste) ou para o meio. */
const ENTRA_FRENTE: Ponto = [28.4, 6.3];
const ENTRA_MEIO: Ponto = [29.6, 8.7];
export const PE_ESCADA: Ponto = [37.0, 8.0];
/** O teclado (o meio dele) e o canto de trás dele, onde a tecladista toca. */
export const TECLADO: Ponto = [26.5, 14.5];
/** Os dois lados de trás do teclado (para chegar ao lugar de quem toca sem passar por ele). */
const TECLADO_LESTE: Ponto = [28.7, 15.4];
const TECLADO_OESTE: Ponto = [24.3, 15.4];
/** A frente do palco no momento do teclado de pendurar (um pouco atrás da linha do vocalista). */
export const FRENTE_KEYTAR: Ponto = [17, 7.7];

/** Onde cada um fica na banda (o lugar de tocar). */
export const LUGAR: Record<PapelBanda, Ponto> = {
  vocalista: PONTA,
  guitarrista: [10.5, 9.8],
  baixista: [24.4, 10.2],
  baterista: BANCO,
  tecladista: [TECLADO[0], 15.35],
  roadie: [30.8, 14.6],
};
/**
 * A coxia: de noite, antes e depois do show, a banda espera no chão do lado leste do palco, perto
 * do pé da escadinha (a roadie fica ali sempre: é onde ela cuida do palco e faz as trocas).
 */
export const COXIA: Record<PapelBanda, Ponto> = {
  vocalista: [37.7, 13.4],
  guitarrista: [38.7, 11.9],
  baixista: [38.7, 15.1],
  baterista: [37.7, 16.6],
  tecladista: [40.0, 13.6],
  roadie: [36.4, 10.6],
};
/** O meio da roda da banda na frente da van (de dia). */
export const RODA_VAN: Ponto = [38.6, 21.5];
/**
 * De dia a banda fica de papo na frente da van, atrás do palco (o palco fica vazio: o show é de
 * noite); a roadie, na coxia.
 */
export const VAN: Record<PapelBanda, Ponto> = {
  vocalista: [37.0, 20.5],
  guitarrista: [38.7, 19.9],
  baixista: [40.3, 20.6],
  baterista: [40.3, 22.5],
  tecladista: [36.9, 22.5],
  roadie: COXIA.roadie,
};

// ------------------------------------------------------------------ o chão do palco
const noTablado = (a: number, b: number) => a >= 0 && a <= 33 && b >= 5 && b <= 20;
const naPassarela = (a: number, b: number) => a >= 14 && a <= 20 && b >= 0 && b <= 5;
export const noPalco = (a: number, b: number) => noTablado(a, b) || naPassarela(a, b);
const noPraticavel = (a: number, b: number) => a >= 13 && a < 21 && b >= 16 && b < 19;
/** Na escadinha (os degraus, do pé ao topo). */
const naEscada = (a: number, b: number) => b >= 6.4 && b <= 9.6 && a > 32.4 && a < 37.4;
/** Atrás do teclado, no canto de quem toca. */
const noCantoDoTeclado = (a: number, b: number) =>
  Math.abs(a - TECLADO[0]) < 2 && b > 14.85 && b < 16.6;

/** A altura dos pés em (a, b): o chão, a escadinha (rampa), o tablado ou o praticável. */
export function alturaEm(a: number, b: number): number {
  if (b >= 6.6 && b <= 9.4 && a > 32.6 && a < 36.8) {
    // a escadinha: três degraus de um bloco, do chão (a 36) ao tablado (a 33)
    const k = Math.min(1, Math.max(0, (36.6 - a) / 3.4));
    return ALTURA_PALCO * k;
  }
  if (!noPalco(a, b)) return 0;
  // o praticável (com uma rampinha de meio bloco na beira, para o passo não dar pulo)
  if (a >= 12.8 && a < 21.3 && b >= 15.8 && b < 19) {
    const borda = Math.min(a - 12.8, 21.3 - a, b - 15.8) / 0.3;
    return ALTURA_PALCO + Math.min(1, Math.max(0, borda));
  }
  return ALTURA_PALCO;
}

/**
 * O caminho de um lugar a outro (os pontos depois do de partida): pela escadinha entre o chão e o
 * palco, pela beira do praticável até o banquinho, e pelo lado do pedestal até a ponta.
 */
export function rota(de: Ponto, para: Ponto): Ponto[] {
  const out: Ponto[] = [];
  let atual = de;
  const ir = (p: Ponto) => {
    out.push(p);
    atual = p;
  };
  // na escadinha conta como chão quem vai descer e como palco quem vai subir: segue nos degraus
  // para o lado de onde vai (antes, quem estava nos degraus subindo voltava ao pé dela a cada
  // passo e ficava preso entre o pé e o primeiro degrau)
  const paraChao = !noPalco(para[0], para[1]) && !naEscada(para[0], para[1]);
  const deEscada = naEscada(de[0], de[1]);
  const deChao = deEscada ? !paraChao : !noPalco(de[0], de[1]);
  // sai do canto do teclado pelo lado de onde vai
  if (noCantoDoTeclado(atual[0], atual[1]) && !noCantoDoTeclado(para[0], para[1]))
    ir(para[0] < TECLADO[0] && !paraChao ? TECLADO_OESTE : TECLADO_LESTE);
  // sai do banquinho pela beira do praticável
  if (noPraticavel(atual[0], atual[1]) && !noPraticavel(para[0], para[1])) {
    ir(SAIDA_PRATICAVEL);
    ir(CANTO_PRATICAVEL);
    if (para[0] > 23 || paraChao) ir(DESVIO_TECLADO);
  }
  // sai da ponta pelo lado do pedestal
  if (atual[1] < 2.6 && para[1] >= 2.6 && naPassarela(atual[0], atual[1])) ir(DESVIO_PONTA);
  if (deChao && !paraChao) {
    if (!deEscada) ir(PE_ESCADA);
    ir(TOPO_ESCADA);
    // da escadinha, pela frente ou por trás da caixa do lado leste
    ir(para[1] < 7.5 ? ENTRA_FRENTE : ENTRA_MEIO);
  } else if (!deChao && paraChao) {
    if (!deEscada) {
      if (atual[0] < 24 && atual[1] > 11) ir(DESVIO_TECLADO);
      ir(atual[1] < 7.5 ? ENTRA_FRENTE : ENTRA_MEIO);
      ir(TOPO_ESCADA);
    }
    ir(PE_ESCADA);
  }
  if (noPraticavel(para[0], para[1]) && !noPraticavel(atual[0], atual[1])) {
    if (atual[0] > 23 && atual[1] < 13) ir(DESVIO_TECLADO);
    ir(CANTO_PRATICAVEL);
    ir(SAIDA_PRATICAVEL);
  }
  if (para[1] < 2.6 && atual[1] >= 2.6 && naPassarela(para[0], para[1])) {
    if (Math.abs(atual[0] - FRENTE[0]) > 1 || atual[1] > 7) ir(FRENTE);
    ir(DESVIO_PONTA);
  }
  // entra no canto do teclado pelo lado de onde vem (nunca através dele)
  if (noCantoDoTeclado(para[0], para[1]) && !noCantoDoTeclado(atual[0], atual[1])) {
    if (atual[0] < TECLADO[0] && atual[1] < 14.85) ir(DESVIO_TECLADO);
    ir(atual[0] < TECLADO[0] ? TECLADO_OESTE : TECLADO_LESTE);
  }
  ir(para);
  return out;
}

// ------------------------------------------------------------------ o roteiro de cada um
interface Passo {
  /** Quando sai (s desde o começo do show). */
  t: number;
  /** Para onde vai (sem caminho: fica onde está). */
  para?: Ponto;
  /** Blocos por segundo. */
  vel?: number;
  /** O que faz andando e depois de chegar. */
  andar?: AcaoBanda;
  acao: AcaoBanda;
  giro?: number;
}

const VEL = 2.5;
const VEL_ENTRADA = 2.7;

/** As partes de todas as músicas, com o tempo de fim. */
interface ParteNoShow {
  m: MusicaNoShow;
  pedaco: string;
  vez: number;
  ini: number;
  fim: number;
  compassos: number;
}
const PARTES: ParteNoShow[] = ROTEIRO.flatMap((m) =>
  m.partes.map((p) => ({
    m,
    pedaco: p.pedaco,
    vez: p.vez,
    ini: p.ini,
    fim: p.ini + p.compassos * m.compasso,
    compassos: p.compassos,
  })),
);

/** A saída de cada um na entrada (s desde o começo): o baterista primeiro, o vocalista por último. */
const SAI_NA_ENTRADA: Record<PapelBanda, number> = {
  baterista: INTRO + 0.4,
  baixista: INTRO + 2.0,
  tecladista: INTRO + 3.0,
  guitarrista: INTRO + 4.0,
  vocalista: INTRO + 5.4,
  roadie: 0.5,
};
/** A tecladista levanta a mão por tanto tempo no começo de cada refrão (compassos). */
const MAO_NO_REFRAO = 2;

function roteiroBase(papel: PapelBanda): Passo[] {
  const ps: Passo[] = [];
  const casa = LUGAR[papel];
  const passo = (p: Passo) => ps.push(p);
  // a abertura: na coxia (a roadie vai para a beira do palco)
  if (papel === 'roadie') passo({ t: 0, acao: 'esperar' });
  else passo({ t: 0, acao: 'esperar', giro: PARA_OESTE });
  // a entrada
  const sai = SAI_NA_ENTRADA[papel];
  if (papel === 'vocalista')
    passo({ t: sai, para: casa, vel: 2.9, andar: 'bracoAlto', acao: 'acenar', giro: PARA_O_POVO });
  else if (papel === 'baterista')
    passo({ t: sai, para: casa, vel: VEL_ENTRADA, acao: 'sentado', giro: PARA_O_POVO });
  else if (papel === 'roadie') passo({ t: sai, para: casa, vel: 2, acao: 'palmas', giro: -2.4 });
  else if (papel === 'tecladista')
    passo({ t: sai, para: casa, vel: VEL_ENTRADA, acao: 'teclado', giro: PARA_O_POVO });
  else passo({ t: sai, para: casa, vel: VEL_ENTRADA, acao: 'tocar', giro: PARA_O_POVO });

  let lado = 0;
  ROTEIRO.forEach((m, k) => {
    const ultimaMusica = k === ROTEIRO.length - 1;
    // a contagem: o baterista conta com as baquetas no alto; o vocalista levanta o braço
    if (papel === 'baterista') passo({ t: m.contagem, acao: 'contagem' });
    if (papel === 'vocalista') passo({ t: m.contagem, acao: 'bracoAlto' });
    for (const p of PARTES.filter((q) => q.m === m)) {
      const meio = p.ini + Math.floor(p.compassos / 2) * m.compasso;
      switch (papel) {
        case 'vocalista':
          if (p.pedaco === 'verso')
            passo({
              t: p.ini,
              para: p.vez === 0 ? PONTA : FRENTE,
              vel: VEL,
              acao: 'cantar',
              giro: PARA_O_POVO,
            });
          else if (p.pedaco === 'refrao') {
            // de um lado ao outro da frente do palco, o braço do microfone no alto
            const l1 = lado++ % 2 ? FRENTE_DIR : FRENTE_ESQ;
            passo({
              t: p.ini,
              para: l1,
              vel: 2.8,
              andar: 'bracoAlto',
              acao: 'baterCabeca',
              giro: PARA_O_POVO,
            });
            if (p.compassos >= 8) {
              const l2 = lado++ % 2 ? FRENTE_DIR : FRENTE_ESQ;
              passo({
                t: meio,
                para: l2,
                vel: 2.8,
                andar: 'bracoAlto',
                acao: 'cantar',
                giro: PARA_O_POVO,
              });
            }
          } else if (p.pedaco === 'solo')
            // a ponta é da guitarrista: ele vai para o lado e puxa as palmas do povo
            passo({ t: p.ini, para: [7.5, 6.6], vel: 2.8, acao: 'palmas', giro: PARA_O_POVO });
          else if (p.pedaco === 'ponte')
            // a ponte é das duas (de costas no meio): ele vai para o lado e puxa as palmas
            passo({ t: p.ini, para: FRENTE_DIR, vel: 2.8, acao: 'palmas', giro: PARA_O_POVO });
          else if (p.pedaco === 'subida')
            passo({
              t: p.ini,
              para: PONTA,
              vel: 2.8,
              andar: 'bracoAlto',
              acao: 'bracoAlto',
              giro: PARA_O_POVO,
            });
          else if (p.pedaco === 'intro')
            passo({ t: p.ini, para: FRENTE, vel: VEL, acao: 'balancar', giro: PARA_O_POVO });
          else if (p.pedaco === 'fim')
            passo({ t: p.ini, para: FRENTE, vel: 2.8, acao: 'pulo', giro: PARA_O_POVO });
          else if (p.pedaco === 'chamado')
            passo({ t: p.ini - 3.6, para: PONTA, vel: 3, acao: 'apontar', giro: PARA_O_POVO });
          break;
        case 'guitarrista':
          if (p.pedaco === 'solo')
            // o solo na ponta da passarela, com o siga-me
            passo({ t: p.ini - 3.2, para: [17, 1.2], vel: 3, acao: 'solo', giro: PARA_O_POVO });
          else if (p.pedaco === 'ponte') {
            // de costas com a baixista no meio do palco
            passo({ t: p.ini, para: [16.35, 7.1], vel: 2.6, acao: 'balancar', giro: -1.95 });
          } else if (p.pedaco === 'refrao' && p.vez === 1 && ultimaMusica)
            // as duas andam juntas até a frente e tocam lado a lado
            passo({
              t: p.ini,
              para: [14.6, 6.8],
              vel: 2.2,
              acao: 'baterCabeca',
              giro: PARA_O_POVO,
            });
          else if (p.pedaco === 'chamado')
            passo({
              t: p.ini - 1.4,
              para: [11.5, 6.8],
              vel: 3,
              acao: 'baterCabeca',
              giro: PARA_O_POVO,
            });
          else if (p.pedaco === 'verso' || p.pedaco === 'intro')
            passo({ t: p.ini, para: casa, vel: VEL, acao: 'tocar', giro: PARA_O_POVO });
          else if (p.pedaco === 'refrao')
            passo({
              t: p.ini,
              para: casa,
              vel: VEL,
              acao: k === 1 ? 'balancar' : 'baterCabeca',
              giro: PARA_O_POVO,
            });
          else passo({ t: p.ini, para: casa, vel: VEL, acao: 'baterCabeca', giro: PARA_O_POVO });
          break;
        case 'baixista':
          if (p.pedaco === 'ponte')
            passo({ t: p.ini, para: [17.65, 7.1], vel: 2.6, acao: 'balancar', giro: 1.95 });
          else if (p.pedaco === 'refrao' && p.vez === 1 && ultimaMusica)
            passo({
              t: p.ini,
              para: [19.4, 6.8],
              vel: 2.2,
              acao: 'baterCabeca',
              giro: PARA_O_POVO,
            });
          else if (p.pedaco === 'refrao' && p.vez === 1 && k === 0)
            // no segundo refrão da primeira ela vem para a frente, do lado dela
            passo({
              t: p.ini,
              para: [25.4, 7.0],
              vel: 2.6,
              acao: 'baterCabeca',
              giro: PARA_O_POVO,
            });
          else if (p.pedaco === 'solo' || p.pedaco === 'chamado')
            passo({
              t: p.ini - 0.6,
              para: [21.2, 7.0],
              vel: 2.8,
              acao: 'baterCabeca',
              giro: PARA_O_POVO,
            });
          else if (p.pedaco === 'refrao')
            passo({ t: p.ini, para: casa, vel: VEL, acao: 'baterCabeca', giro: PARA_O_POVO });
          else passo({ t: p.ini, para: casa, vel: VEL, acao: 'balancar', giro: PARA_O_POVO });
          break;
        case 'baterista':
          passo({ t: p.ini, acao: 'bateria' });
          break;
        case 'roadie':
          if (p.pedaco === 'refrao' || p.pedaco === 'solo' || p.pedaco === 'chamado')
            passo({ t: p.ini, acao: 'palmas' });
          else passo({ t: p.ini, acao: 'balancar' });
          break;
        case 'tecladista': {
          const keytar = k === 1 && p.pedaco === 'refrao' && p.vez === 2;
          if (keytar) {
            // o gancho da segunda no último refrão: pega o teclado de pendurar e vai para a
            // frente do palco; volta para o teclado no fim da música
            passo({
              t: p.ini - 2.2,
              para: FRENTE_KEYTAR,
              vel: 3,
              andar: 'keytar',
              acao: 'keytar',
              giro: PARA_O_POVO,
            });
            passo({
              t: p.ini + p.compassos * m.compasso,
              para: casa,
              vel: 3,
              andar: 'keytar',
              acao: 'teclado',
              giro: PARA_O_POVO,
            });
          } else if (p.pedaco === 'fim' && k === 1) {
            // (voltando do teclado de pendurar: o passo de antes segue)
          } else if (p.pedaco === 'refrao' || p.pedaco === 'subida') {
            // a mão no alto no começo do refrão (chamando o povo), depois as duas nas teclas
            passo({ t: p.ini, para: casa, vel: VEL, acao: 'tecladoMao', giro: PARA_O_POVO });
            if (p.compassos > MAO_NO_REFRAO)
              passo({ t: p.ini + MAO_NO_REFRAO * m.compasso, acao: 'teclado' });
          } else if (p.pedaco === 'chamado')
            passo({ t: p.ini, para: casa, vel: VEL, acao: 'tecladoMao', giro: PARA_O_POVO });
          else passo({ t: p.ini, para: casa, vel: VEL, acao: 'teclado', giro: PARA_O_POVO });
          break;
        }
      }
    }
    // a pausa depois da música: todos acenam; o baterista levanta as baquetas
    if (!ultimaMusica) {
      if (papel === 'baterista') {
        passo({ t: m.fim, acao: 'baquetasAlto' });
        passo({ t: m.fim + 4.5, acao: 'sentado' });
      } else if (papel === 'vocalista') {
        passo({ t: m.fim + 0.3, para: FRENTE, vel: 2.6, acao: 'acenar', giro: PARA_O_POVO });
        passo({ t: m.fim + PAUSA - 2.5, acao: 'esperar' });
      } else if (papel === 'roadie') passo({ t: m.fim, acao: 'acenar' });
      else if (papel === 'tecladista') {
        passo({ t: m.fim, acao: 'acenar' });
        passo({ t: m.fim + PAUSA - 2.5, acao: 'teclado' });
      } else {
        passo({ t: m.fim, para: casa, vel: VEL, acao: 'acenar', giro: PARA_O_POVO });
        passo({ t: m.fim + PAUSA - 2.5, acao: 'tocar' });
      }
    }
  });
  return ps;
}

/** O fim (s depois do acorde final): a festa, a fila da frente, a reverência, o aceno e a saída. */
const FILA: Record<PapelBanda, Ponto> = {
  vocalista: [17, 6.0],
  guitarrista: [13.6, 6.0],
  baixista: [20.4, 6.0],
  baterista: [23.8, 6.1],
  tecladista: [27.2, 6.1],
  roadie: [30.8, 14.6],
};
export const VEM_PARA_A_FRENTE = 3;
export const REVERENCIA = 9.4;
export const ACENO_FINAL = 11.6;
export const SAI_DO_PALCO = 13.4;

function roteiroFinal(papel: PapelBanda, f: number): Passo[] {
  const ps: Passo[] = [];
  ps.push({ t: f, acao: papel === 'baterista' ? 'baquetasAlto' : 'pulo' });
  if (papel === 'roadie') {
    ps.push({ t: f + VEM_PARA_A_FRENTE, acao: 'palmas' });
    ps.push({ t: f + ACENO_FINAL, acao: 'acenar' });
    // e desce para a coxia logo depois da banda (o palco fica vazio)
    ps.push({
      t: f + SAI_DO_PALCO + 2.2,
      para: COXIA.roadie,
      vel: 2.8,
      acao: 'esperar',
      giro: PARA_OESTE,
    });
    return ps;
  }
  ps.push({
    t: f + VEM_PARA_A_FRENTE,
    para: FILA[papel],
    vel: papel === 'baterista' ? 2.9 : 2.4,
    acao: 'acenar',
    giro: PARA_O_POVO,
  });
  ps.push({ t: f + REVERENCIA, acao: 'reverencia' });
  ps.push({ t: f + ACENO_FINAL, acao: 'acenar' });
  // saem um depois do outro, do que está mais perto da escadinha ao vocalista
  const ordem: Record<PapelBanda, number> = {
    baterista: 0,
    tecladista: 0.2,
    baixista: 0.5,
    vocalista: 1.1,
    guitarrista: 1.6,
    roadie: 0,
  };
  ps.push({
    t: f + SAI_DO_PALCO + ordem[papel],
    para: COXIA[papel],
    vel: 2.8,
    andar: papel === 'vocalista' ? 'acenar' : undefined,
    acao: 'esperar',
    giro: PARA_OESTE,
  });
  return ps;
}

const BASE: Record<PapelBanda, Passo[]> = Object.fromEntries(
  PAPEIS_BANDA.map((p) => [p, roteiroBase(p)]),
) as Record<PapelBanda, Passo[]>;

/** Onde cada um começa o show (de noite, na coxia). */
export const INICIO_DO_SHOW: Record<PapelBanda, Ponto> = COXIA;

/** O caminho de um passo já com os pontos de passagem e o tempo de cada trecho. */
interface Trecho {
  t0: number;
  pontos: Ponto[];
  /** O comprimento acumulado até cada ponto. */
  acum: number[];
  vel: number;
}
function trecho(t0: number, de: Ponto, para: Ponto, vel: number): Trecho {
  const pontos = [de, ...rota(de, para)];
  const acum = [0];
  for (let i = 1; i < pontos.length; i++)
    acum.push(
      acum[i - 1] + Math.hypot(pontos[i][0] - pontos[i - 1][0], pontos[i][1] - pontos[i - 1][1]),
    );
  return { t0, pontos, acum, vel };
}
const fimDoTrecho = (tr: Trecho) => tr.t0 + tr.acum[tr.acum.length - 1] / tr.vel;
function noTrecho(tr: Trecho, t: number): { p: [number, number]; dir: number | null } {
  const s = Math.max(0, (t - tr.t0) * tr.vel);
  const total = tr.acum[tr.acum.length - 1];
  if (s >= total || total < 1e-6) {
    const u = tr.pontos[tr.pontos.length - 1];
    return { p: [u[0], u[1]], dir: null };
  }
  let i = 1;
  while (i < tr.acum.length - 1 && tr.acum[i] < s) i++;
  const a = tr.pontos[i - 1];
  const b = tr.pontos[i];
  const L = tr.acum[i] - tr.acum[i - 1] || 1;
  const k = (s - tr.acum[i - 1]) / L;
  return {
    p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k],
    dir: Math.atan2(b[0] - a[0], b[1] - a[1]),
  };
}

/** Os trechos já calculados de um roteiro (o começo de cada um vem de onde o anterior deixou). */
interface Linha {
  passo: Passo;
  /** O caminho deste passo, ou o do anterior que ainda não chegou. */
  trecho: Trecho | null;
  andar: AcaoBanda | undefined;
  /** Onde está quando o passo começa. */
  de: Ponto;
}
function linhas(passos: Passo[], de: Ponto): Linha[] {
  const out: Linha[] = [];
  let pos: Ponto = de;
  for (const p of passos) {
    const ant = out[out.length - 1];
    if (ant?.trecho) pos = noTrecho(ant.trecho, p.t).p;
    // sem caminho novo, quem ainda anda segue andando (e faz a ação nova quando chegar)
    const segue = !p.para && ant?.trecho && fimDoTrecho(ant.trecho) > p.t ? ant : null;
    const tr = p.para ? trecho(p.t, pos, p.para, p.vel ?? VEL) : (segue?.trecho ?? null);
    out.push({ passo: p, trecho: tr, andar: p.para ? p.andar : segue?.andar, de: pos });
  }
  return out;
}
const LINHAS: Record<PapelBanda, Linha[]> = Object.fromEntries(
  PAPEIS_BANDA.map((p) => [p, linhas(BASE[p], INICIO_DO_SHOW[p])]),
) as Record<PapelBanda, Linha[]>;

/** O último giro parado antes do passo `i` (para quem não tem giro novo). */
function giroAte(ls: Linha[], i: number): number {
  for (let k = i; k >= 0; k--) {
    const g = ls[k].passo.giro;
    if (g !== undefined) return g;
  }
  return PARA_O_POVO;
}

function postura(ls: Linha[], dShow: number): PosturaBanda {
  let i = 0;
  while (i + 1 < ls.length && ls[i + 1].passo.t <= dShow) i++;
  const l = ls[i];
  let p: [number, number] = [l.de[0], l.de[1]];
  let andando = false;
  let giro = giroAte(ls, i);
  let acao = l.passo.acao;
  // a mesma ação seguida (o baterista tocando parte após parte) não recomeça o gesto
  let k = i;
  while (k > 0 && !ls[k].trecho && ls[k - 1].passo.acao === acao && !ls[k - 1].trecho) k--;
  let desde = dShow - ls[k].passo.t;
  if (l.trecho) {
    const r = noTrecho(l.trecho, dShow);
    p = r.p;
    if (r.dir !== null) {
      andando = true;
      giro = r.dir;
      acao = l.andar ?? 'esperar';
    } else desde = Math.min(desde, dShow - fimDoTrecho(l.trecho));
  }
  return { a: p[0], b: p[1], altura: altura(p[0], p[1], acao), giro, andando, acao, desde };
}

const altura = (a: number, b: number, acao: AcaoBanda) => {
  const h = alturaEm(a, b);
  // sentado no banquinho da bateria (o corpo na altura do banco)
  const sentado =
    acao === 'sentado' || acao === 'bateria' || acao === 'contagem' || acao === 'baquetasAlto';
  return sentado && Math.hypot(a - BANCO[0], b - BANCO[1]) < 0.3 ? ALTURA_BANCO : h;
};

/**
 * A postura de um músico no show em `t` (o relógio do show). Antes do acorde final, o roteiro
 * base; depois dele, o fim (a partir de onde cada um estava quando o acorde veio).
 */
export function posturaNaBanda(papel: PapelBanda, s: Show, t: number): PosturaBanda {
  const d = t - s.inicio;
  const base = LINHAS[papel];
  if (s.final === null || t < s.final) return postura(base, d);
  const f = s.final - s.inicio;
  const onde = postura(base, f);
  const fim = linhas(roteiroFinal(papel, f), [onde.a, onde.b]);
  const r = postura(fim, d);
  // o primeiro passo do fim (o pulo) não tem giro: mantém o de antes
  if (!r.andando && fim[0] && d < f + VEM_PARA_A_FRENTE) r.giro = onde.giro;
  return r;
}

/** Quanto o fim leva até a banda chegar na coxia (s depois do acorde final). */
export const FIM_DA_SAIDA = APLAUSO;

/**
 * O lugar de descanso fora do show, sempre fora do palco: de dia de papo na frente da van; de
 * noite (a noite do show) na coxia, pronta para subir.
 */
export function lugarDeDescanso(papel: PapelBanda, dia: boolean): Ponto {
  return dia ? VAN[papel] : COXIA[papel];
}
/** Para onde olha quem está no descanso: de dia para o meio da roda, de noite para o palco. */
export function giroDoDescanso(papel: PapelBanda, dia: boolean): number {
  if (!dia || papel === 'roadie') return PARA_OESTE;
  const q = VAN[papel];
  return Math.atan2(RODA_VAN[0] - q[0], RODA_VAN[1] - q[1]);
}

/** Para o mundo: (a, b) → (x, z), e a altura dos pés. */
export function paraOMundo(
  palco: { x0: number; z0: number; y: number },
  a: number,
  b: number,
  altura: number,
): [number, number, number] {
  // o chão do campo fica `ALTURA_PALCO` abaixo do tablado (o tablado é palco.y + 1)
  return [palco.x0 + a, palco.y + 1 - ALTURA_PALCO + altura, palco.z0 + b];
}

/** Do mundo para o palco. */
export function doMundo(palco: { x0: number; z0: number }, x: number, z: number): Ponto {
  return [x - palco.x0, z - palco.z0];
}
