import { describe, expect, it } from 'vitest';
import { lerBytes, lerTexto } from './arquivos';
import {
  ATRASO_APLAUSO,
  ESCALA_LADRILHO,
  GANHO_BRINQUEDO,
  GANHO_CAIXAS,
  GANHO_SHOW,
  REFORCO_APLAUSO_DB,
  REFORCO_FINAL_DB,
  REFORCO_SHOW_DB,
  PALCO_CHEIO,
  PALCO_SOME,
  RelogioVila,
  ambienteDaZona,
  corteDoShow,
  criarSomVila,
  ehPedidoBrinquedoVila,
  lerIndiceShow,
  momentoDoAcorde,
  momentoDoFinal,
  posicaoNoLaco,
  proximoTempo,
  segmentosDoShow,
  volumeNaDistancia,
  type BufferVila,
} from '../../src/audio/somVila';
import { criarMotorAudio } from '../../src/audio/motor';
import {
  CALAR_NATUREZA_DB,
  CALAR_TRILHA_DB,
  GANHO_MAXIMO_AMBIENTE,
  ganhoCalar,
  ganhoCalarNatureza,
} from '../../src/audio/sons';
import { GANHO_TRILHA_GRAVADA, nivelTrilha } from '../../src/audio/trilha';
import { criarVozesGravadas } from '../../src/audio/vozesGravadas';
import {
  ACORDES_SHOW,
  ACORDE_FINAL,
  BPM,
  CHAMADO,
  COMPASSO,
  COMPASSOS_SHOW,
  CONTAGEM,
  ESPERA_FINAL,
  OITAVO,
  encaixarToque,
} from '../../src/jogo/show';
import type { VilaVista } from '../../src/nucleo/vila';
import type { PlanoVila } from '../../src/world/vilaNeon';

const JSON_INDICE = JSON.parse(lerTexto('public/sons/indice.json')) as {
  temas: Record<string, Record<string, unknown>>;
  tamanhos: Record<string, number>;
  ordem: string[];
};
const IND = lerIndiceShow(JSON_INDICE)!;
const FONTES = '.sdd/specs/026-mundo-anos-80/referencia/fontes/scripts-pacote';

describe('o pacote do show no índice', () => {
  it('existe só na Vila Neon e cobre o pacote sem buraco, cada fatia começando num MP3', () => {
    expect(IND).not.toBeNull();
    for (const [id, t] of Object.entries(JSON_INDICE.temas))
      if (id !== 'vila-neon') expect(t, id).not.toHaveProperty('show');
    const pacote = lerBytes(`public/sons/pacotes/${IND.pacote}`);
    expect(JSON_INDICE.tamanhos[IND.pacote]).toBe(pacote.byteLength);
    const ordem = Object.entries(IND.clips).sort((a, b) => a[1].o[0] - b[1].o[0]);
    let fim = 0;
    for (const [id, c] of ordem) {
      expect(c.o[0], id).toBe(fim);
      fim = c.o[0] + c.o[1];
      const f = pacote.subarray(c.o[0], c.o[0] + 2);
      expect(f[0] === 0xff && (f[1] & 0xe0) === 0xe0, id).toBe(true);
    }
    expect(fim).toBe(pacote.byteLength);
  });

  it('metas: baixa < 1,5 MB e, tudo aberto a 22 050 Hz, < 12 MB (o jogo só abre o que toca)', () => {
    expect(JSON_INDICE.tamanhos[IND.pacote]).toBeLessThan(1.5 * 1024 * 1024);
    const amostras = Object.values(IND.clips).reduce((s, c) => s + c.arquivo, 0);
    expect((amostras * 4) / 1048576).toBeLessThan(12);
    // a música do bairro continua na meta da 019
    expect(JSON_INDICE.tamanhos['vila-neon-musica.mp3']).toBeLessThan(2 * 1024 * 1024);
  });

  it('no tempo das regras do show: 120 batidas, compasso de 2 s, 20 compassos sem buraco', () => {
    expect(IND.tempo).toBe(BPM);
    expect(IND.amostrasCompasso / IND.taxa).toBeCloseTo(COMPASSO, 9);
    expect(IND.compassos).toBe(COMPASSOS_SHOW);
    let c = 0;
    for (const f of IND.forma) {
      expect(f.compassoInicio).toBe(c);
      c += f.compassos;
    }
    expect(c).toBe(COMPASSOS_SHOW);
    for (const cam of IND.camadas)
      for (const f of IND.forma) {
        const clip = IND.clips[`${cam}_${f.pedaco}`];
        expect(clip, `${cam}_${f.pedaco}`).toBeDefined();
        // o verso é laço de 4 compassos (2 voltas no show); refrão e subida, 4 compassos + cauda
        if (clip.laco) expect(clip.laco).toBe(4 * IND.amostrasCompasso);
        else expect(clip.n).toBeGreaterThan(4 * IND.amostrasCompasso);
      }
    expect(IND.camadas).toEqual(['bateria', 'guitarra', 'teclado']);
  });

  it('um acorde por acorde do show, a partitura com as mesmas notas do núcleo', () => {
    expect(IND.acordes.length).toBe(ACORDES_SHOW.length);
    ACORDES_SHOW.forEach((a, i) =>
      ACORDES_SHOW.forEach((b, j) => {
        if (a.join() === b.join()) expect(IND.acordes[i]).toBe(IND.acordes[j]);
      }),
    );
    const py = lerTexto(`${FONTES}/show_compor.py`);
    const notas = (nome: string) =>
      JSON.parse(new RegExp(`^${nome} = (\\[.*\\])$`, 'm').exec(py)![1]) as unknown;
    expect(notas('ACORDES_SHOW')).toEqual(ACORDES_SHOW);
    expect(notas('ACORDE_FINAL')).toEqual(ACORDE_FINAL);
    for (const k of ['contagem', 'final', 'aplauso', 'uhuu', 'batida', 'neon'])
      expect(IND.clips[k], k).toBeDefined();
    expect(IND.clips.batida.laco).toBe(2 * IND.amostrasCompasso);
    expect(IND.fliperama.length).toBe(3);
  });

  it('os brinquedos têm o som e o ganho do roteiro (ganhos_toque.json)', () => {
    const roteiro = JSON.parse(lerTexto(`${FONTES}/ganhos_toque.json`)) as Record<string, number>;
    expect(GANHO_BRINQUEDO).toEqual(roteiro);
    for (const k of [
      'fita',
      'ladrilho',
      'rodinhas',
      'estojo',
      'tum',
      'lhama',
      'campainha',
      'orelhao',
      'radio_liga',
      'radio_desliga',
    ])
      expect(IND.clips[k], k).toBeDefined();
    // nada mais alto que o estojo achado; o que se repete muito, bem baixinho
    for (const v of Object.values(GANHO_BRINQUEDO)) expect(v).toBeLessThanOrEqual(-4);
    expect(GANHO_BRINQUEDO.rodinhas).toBeLessThan(GANHO_BRINQUEDO.estojo);
    expect(GANHO_BRINQUEDO.ladrilho).toBeLessThan(GANHO_BRINQUEDO.estojo);
    // as caixas soltas seguem o caminho da trilha gravada (o ambiente da zona)
    expect(GANHO_CAIXAS).toBeCloseTo(GANHO_MAXIMO_AMBIENTE * 0.6 * GANHO_TRILHA_GRAVADA, 9);
    // o show é a música mais alta do jogo (o dono: "até o passarinho tá saindo mais alto"):
    // medido na grade, 6 a 9 dB acima da trilha e da natureza de sempre
    expect(20 * Math.log10(GANHO_SHOW / GANHO_CAIXAS)).toBeCloseTo(REFORCO_SHOW_DB, 9);
    expect(REFORCO_SHOW_DB).toBeGreaterThanOrEqual(9);
    expect(REFORCO_SHOW_DB).toBeLessThanOrEqual(15);
    // o acorde final e o aplauso por cima: o pico
    expect(REFORCO_FINAL_DB).toBeGreaterThan(0);
    expect(REFORCO_APLAUSO_DB).toBeGreaterThan(0);
    // e a natureza (passarinhos, grilos, vento) baixa uns 12 dB no show, e volta inteira
    expect(ganhoCalarNatureza(0)).toBe(1);
    expect(20 * Math.log10(ganhoCalarNatureza(1))).toBeCloseTo(-CALAR_NATUREZA_DB, 9);
    expect(CALAR_NATUREZA_DB).toBeGreaterThanOrEqual(10);
    expect(CALAR_NATUREZA_DB).toBeLessThanOrEqual(15);
    // uma música por vez: com o show perto, a trilha do bairro some (e volta inteira)
    expect(ganhoCalar(0)).toBe(1);
    expect(20 * Math.log10(ganhoCalar(1))).toBeCloseTo(-CALAR_TRILHA_DB, 9);
    expect(CALAR_TRILHA_DB).toBeGreaterThanOrEqual(18);
  });
});

describe('o tempo do show (puro)', () => {
  it('relógio do núcleo -> AudioContext: segue devagar e aceita um salto grande', () => {
    const r = new RelogioVila();
    r.medir(5, 100);
    expect(r.audio(101)).toBe(6);
    expect(r.nucleo(6)).toBe(101);
    // tremidinho de 10 ms: quase nada
    r.medir(5.01, 100);
    expect(r.dif).toBeCloseTo(-95 + 0.0005, 6);
    // a aba voltou: salto de 2 s aceito na hora
    r.medir(7.5, 100.5);
    expect(r.dif).toBe(-93);
  });

  it('a contagem em `inicio`; as camadas a partir do primeiro tempo; tudo para no final sozinho', () => {
    const T = 1000;
    const s = segmentosDoShow(IND, T, null);
    const cont = s.find((x) => x.clip === 'contagem')!;
    expect(cont.ini).toBe(T);
    for (let i = 0; i < 3; i++) {
      const cam = s.filter((x) => x.camada === i);
      expect(cam.map((x) => x.clip.split('_')[1])).toEqual(['verso', 'refrao', 'refrao', 'subida']);
      expect(cam[0].ini).toBe(T + CONTAGEM);
      expect(cam[0].laco).toBe(true);
      expect(cam[0].fim).toBe(T + CONTAGEM + 8 * COMPASSO);
      expect(cam[1].ini).toBe(T + CONTAGEM + 8 * COMPASSO);
      expect(cam[2].ini).toBe(T + CONTAGEM + 12 * COMPASSO);
      expect(cam[3].ini).toBe(T + CONTAGEM + 16 * COMPASSO);
      // o acorde final sozinho vem no último compasso: as camadas param ali
      expect(cam[3].fim).toBe(T + CHAMADO + ESPERA_FINAL);
    }
    expect(corteDoShow(T, null)).toBe(T + CHAMADO + ESPERA_FINAL);
  });

  it('o toque no chamado corta tudo na hora dele', () => {
    const T = 50;
    const fim = T + CHAMADO + 1.3;
    const s = segmentosDoShow(IND, T, fim);
    expect(Math.max(...s.map((x) => x.fim))).toBeLessThanOrEqual(fim);
    expect(s.every((x) => x.ini < fim)).toBe(true);
  });

  it('o acorde do toque soa em `quando` (encaixado pelo núcleo), ou no próximo oitavo se chegou tarde', () => {
    const show = { inicio: 10, final: null };
    const { quando } = encaixarToque(show, 15.3);
    // relógios: AudioContext = núcleo + 2
    const qa = quando + 2;
    expect(momentoDoAcorde(qa, 15.3 + 2 + 0.08, 12 + 2)).toBe(qa);
    const tarde = momentoDoAcorde(qa, qa + 0.03, 12 + 2);
    expect(tarde).toBeGreaterThan(qa + 0.03);
    expect(tarde - qa).toBeCloseTo(OITAVO, 9);
    // sempre na grade do show
    const k = (tarde - 14) / OITAVO;
    expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-9);
  });

  it('o acorde final entra em até 100 ms do evento (e na hora certa quando vem sozinho)', () => {
    // o toque foi há 80 ms (rede): soa já
    expect(momentoDoFinal(9.92, 10) - 10).toBeLessThanOrEqual(0.1);
    expect(momentoDoFinal(9.92, 10)).toBeGreaterThanOrEqual(10);
    // agendado de antemão (o sozinho): na hora dele
    expect(momentoDoFinal(12, 10)).toBe(12);
  });

  it('distância do palco, laço, grade, zonas e a escala do ladrilho', () => {
    expect(volumeNaDistancia(0, PALCO_CHEIO, PALCO_SOME)).toBe(1);
    expect(volumeNaDistancia(PALCO_CHEIO, PALCO_CHEIO, PALCO_SOME)).toBe(1);
    // cheio em toda a plateia: da grade (12,5 blocos do meio do palco) ao portão do festival (40,5)
    expect(volumeNaDistancia(12.5, PALCO_CHEIO, PALCO_SOME)).toBe(1);
    expect(volumeNaDistancia(40.5, PALCO_CHEIO, PALCO_SOME)).toBe(1);
    // e some só depois, fora do alambrado
    const fora = volumeNaDistancia(55, PALCO_CHEIO, PALCO_SOME);
    expect(fora).toBeGreaterThan(0);
    expect(fora).toBeLessThan(0.5);
    expect(volumeNaDistancia(PALCO_SOME, PALCO_CHEIO, PALCO_SOME)).toBe(0);
    expect(posicaoNoLaco(9, 0, 8)).toBe(1);
    expect(posicaoNoLaco(-1, 0, 8)).toBe(7);
    expect(proximoTempo(10.1, 0)).toBe(10.5);
    expect(proximoTempo(10, 0)).toBe(10);
    expect(ambienteDaZona('rinque', 0)).toBe('batida');
    expect(ambienteDaZona('rua', 0)).toBeNull();
    expect(ambienteDaZona('rua', 1)).toBe('neon');
    expect(ambienteDaZona('festival', 1)).toBeNull();
    expect(ambienteDaZona(null, 1)).toBeNull();
    expect(Math.max(...ESCALA_LADRILHO)).toBe(2);
    expect(ehPedidoBrinquedoVila({ qual: 'fliperama', i: 2 })).toBe(true);
    expect(ehPedidoBrinquedoVila({ qual: 'canhao' })).toBe(false);
  });
});

// ------------------------------------------------------------------ o tocador num contexto falso

interface Ponto {
  t: string;
  v: number;
  em: number;
}
class Param {
  value = 1;
  pontos: Ponto[] = [];
  setValueAtTime(v: number, em: number) {
    this.pontos.push({ t: 'set', v, em });
  }
  setTargetAtTime(v: number, em: number) {
    this.pontos.push({ t: 'alvo', v, em });
  }
  linearRampToValueAtTime(v: number, em: number) {
    this.pontos.push({ t: 'rampa', v, em });
  }
  cancelScheduledValues() {}
}
class No {
  gain = new Param();
  ligados: unknown[] = [];
  connect(d: unknown) {
    this.ligados.push(d);
    return d;
  }
  disconnect() {}
}
class Fonte extends No {
  buffer: BufferVila | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate = new Param();
  onended: (() => void) | null = null;
  inicio: [number, number] | null = null;
  paradaEm: number | null = null;
  start(t = 0, off = 0) {
    this.inicio = [t, off];
  }
  stop(t = 0) {
    this.paradaEm = t;
  }
}
class Ctx {
  destination = {};
  currentTime = 0;
  state = 'running';
  fontes: Fonte[] = [];
  resume() {
    return Promise.resolve();
  }
  createGain() {
    return new No();
  }
  createDynamicsCompressor() {
    return new No();
  }
  createBufferSource() {
    const f = new Fonte();
    this.fontes.push(f);
    return f;
  }
}

const PLANO = {
  pontos: { palco: { x0: 0, z0: 0, x1: 10, z1: 10, y: 4 } },
  zonas: {
    festival: { x0: -40, z0: -40, x1: 40, z1: 40 },
    rinque: { x0: 200, z0: 0, x1: 220, z1: 20 },
    rua: { x0: 300, z0: 0, x1: 400, z1: 50 },
  },
} as unknown as PlanoVila;
const PERTO = { x: 5, z: 5 };
const IDS = Object.keys(IND.clips);

async function montar(volumes?: () => { musica: number; natureza: number }) {
  const ctx = new Ctx();
  const motor = criarMotorAudio(() => ctx as never, { maxVozes: 40 });
  await motor.ativar();
  ctx.fontes.length = 0;
  const pedidos: string[] = [];
  const calar: number[] = [];
  const calarNatureza: number[] = [];
  const tocados: string[] = [];
  const som = criarSomVila({
    motor,
    plano: PLANO,
    carregarIndice: async (u) => {
      pedidos.push(u);
      return JSON_INDICE;
    },
    // o pacote falso tem, no começo de cada fatia, o número do clipe
    baixar: async (u) => {
      pedidos.push(u);
      const b = new ArrayBuffer(JSON_INDICE.tamanhos['vila-neon-show.mp3']);
      const d = new DataView(b);
      IDS.forEach((id, k) => d.setUint32(IND.clips[id].o[0], k));
      return b;
    },
    // a fatia decodificada dura o que o índice diz (com a folga)
    decodificar: async (b) => {
      const id = IDS[new DataView(b).getUint32(0)];
      return { duration: IND.clips[id].arquivo / IND.taxa, id } as BufferVila;
    },
    aoCalarTrilha: (f) => calar.push(f),
    aoCalarNatureza: (f) => calarNatureza.push(f),
    volumes,
    aoTocar: (id) => tocados.push(id),
    rng: () => 0.5,
  });
  som.carregar();
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
  /** Relógios: núcleo = AudioContext + 100. */
  const D = 100;
  const vista = (p: Partial<VilaVista> = {}): VilaVista => ({
    t: ctx.currentTime + D,
    ins: [true, true, true],
    cx: [false, false, false],
    show: null,
    lhamas: [],
    ...p,
  });
  const passo = async (t: number, v: VilaVista, ouvinte = PERTO) => {
    ctx.currentTime = t;
    som.quadro(v, t + D, ouvinte, 0);
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 0));
  };
  const fonteDe = (id: string) =>
    ctx.fontes.filter((f) => (f.buffer as { id?: string } | null)?.id === id && f.inicio !== null);
  return { ctx, som, pedidos, calar, calarNatureza, tocados, vista, passo, fonteDe, D };
}

describe('o tocador do show (contexto falso)', () => {
  it('só baixa o índice e o pacote do show; uma caixa acesa toca o verso dela, no tempo, e cala a trilha', async () => {
    const { som, pedidos, calar, tocados, vista, passo, fonteDe } = await montar();
    expect(pedidos).toEqual(['/sons/indice.json', '/sons/pacotes/vila-neon-show.mp3']);
    expect(som.info().pronto).toBe(true);
    await passo(10.1, vista({ cx: [true, false, false] }));
    await passo(10.15, vista({ cx: [true, false, false] }));
    expect(tocados).toContain('bateria_verso');
    const [f] = fonteDe('bateria_verso');
    expect(f.loop).toBe(true);
    // entra no próximo tempo da grade do núcleo (meio segundo) e na fase do relógio
    const tN = f.inicio![0] + 100;
    expect(Math.abs(tN * 2 - Math.round(tN * 2))).toBeLessThan(1e-6);
    const P = IND.folga / IND.taxa;
    expect(f.inicio![1] - P).toBeCloseTo(posicaoNoLaco(tN, 0, 8), 6);
    expect(calar[calar.length - 1]).toBe(1);
    expect(som.info().camadas).toEqual([true, false, false]);
    // longe do palco: a caixa cala e a trilha volta
    await passo(11, vista({ cx: [true, false, false] }), { x: 500, z: 500 });
    expect(calar[calar.length - 1]).toBe(0);
  });

  it('o show: contagem em `inicio`, camadas no primeiro tempo, acorde no `quando` e o final na hora', async () => {
    const { ctx, som, vista, passo, fonteDe, D } = await montar();
    const T = 20 + D; // o show começa no núcleo em 120 (AudioContext 20)
    const show = { inicio: T, final: null as number | null };
    // duas caixas acesas: a contagem e os versos já ficam abertos
    await passo(19.0, vista({ cx: [true, true, false] }));
    await passo(19.5, vista({ cx: [true, true, false] }));
    await passo(19.95, vista({ cx: [true, true, true], show }));
    await passo(20.0, vista({ cx: [true, true, true], show }));
    const cont = fonteDe('contagem');
    expect(cont).toHaveLength(1);
    expect(cont[0].inicio![0]).toBeCloseTo(20, 6);
    // as camadas são agendadas antes (até 0,8 s antes do primeiro tempo)
    await passo(21.4, vista({ cx: [true, true, true], show }));
    for (const cam of ['bateria', 'guitarra', 'teclado']) {
      const f = fonteDe(`${cam}_verso`).at(-1)!;
      expect(f, cam).toBeDefined();
      expect(f.inicio![0]).toBeCloseTo(22, 6);
      expect(f.inicio![1]).toBeCloseTo(IND.folga / IND.taxa, 6);
    }
    // um toque no palco: o núcleo encaixou em `quando`; o acorde soa ali (mesmo compasso)
    await passo(25.0, vista({ cx: [true, true, true], show }));
    const { quando, acorde } = encaixarToque(show, 25.05 + D);
    ctx.currentTime = 25.1;
    som.evento({ e: 'vilaAcorde', quando, acorde, quem: 'ana' }, 25.1 + D);
    await new Promise((r) => setTimeout(r, 0));
    const ac = som.info().acordes;
    expect(ac).toHaveLength(1);
    expect(ac[0].quando).toBeCloseTo(quando - D, 6);
    // o refrão entra no compasso 8 (2 + 16 s)
    await passo(37.5, vista({ cx: [true, true, true], show }));
    expect(fonteDe('guitarra_refrao')[0].inicio![0]).toBeCloseTo(38, 6);
    // o chamado; a criança toca em 57,2 (núcleo 157,2) e o evento chega 80 ms depois
    await passo(57.0, vista({ cx: [true, true, true], show }));
    ctx.currentTime = 57.28;
    som.evento({ e: 'vilaFinal', quando: 57.2 + D, quem: 'ana' }, 57.28 + D);
    const fin = fonteDe('final');
    expect(fin).toHaveLength(1);
    expect(fin[0].inicio![0] - 57.28).toBeLessThanOrEqual(0.1);
    expect(fin[0].inicio![0]).toBeGreaterThanOrEqual(57.28);
    const apl = fonteDe('aplauso');
    expect(apl[0].inicio![0]).toBeCloseTo(fin[0].inicio![0] + ATRASO_APLAUSO, 6);
    // as camadas param no acorde final
    for (const cam of ['bateria', 'guitarra', 'teclado'])
      for (const f of fonteDe(`${cam}_subida`))
        expect(f.paradaEm!).toBeLessThanOrEqual(fin[0].inicio![0] + 0.2);
    // o mesmo final pelo estado: não toca de novo
    await passo(57.4, vista({ cx: [true, true, true], show: { inicio: T, final: 57.2 + D } }));
    expect(fonteDe('final')).toHaveLength(1);
    expect(som.info().calar).toBe(1);
  });

  it('sem toque, o acorde final vem sozinho exatamente no último compasso, e o evento não repete', async () => {
    const { ctx, som, vista, passo, fonteDe, D } = await montar();
    const show = { inicio: 30 + D, final: null };
    await passo(29.5, vista({ cx: [true, true, false] }));
    for (let t = 29.9; t < 69.9; t += 0.25) await passo(t, vista({ cx: [true, true, true], show }));
    const fin = fonteDe('final');
    expect(fin).toHaveLength(1);
    expect(fin[0].inicio![0]).toBeCloseTo(30 + CHAMADO + ESPERA_FINAL, 6);
    expect(som.info().final?.sozinho).toBe(true);
    // o evento do núcleo chega depois: é o mesmo final
    ctx.currentTime = 70.1;
    som.evento({ e: 'vilaFinal', quando: 70 + D, quem: 'auto' }, 70.1 + D);
    expect(fonteDe('final')).toHaveLength(1);
  });

  it('eventos e brinquedos: plim, tum, bé, fliperama, rádio que para sozinho, ladrilho subindo', async () => {
    const { som, tocados, vista, passo, fonteDe } = await montar();
    await passo(5, vista());
    som.evento({ e: 'vilaEstojo', i: 0, quem: 'ana' }, 105);
    som.evento({ e: 'vilaCaixa', i: 0, acesa: true, quem: 'ana' }, 105);
    som.evento({ e: 'vilaLhama', criatura: 3, quem: 'ana' }, 105);
    expect(tocados).toEqual(expect.arrayContaining(['estojo', 'tum', 'lhama']));
    await passo(6, vista());
    // o fliperama abre na hora do toque; tocado de novo, troca de musiquinha sem sobrepor
    som.tocarBrinquedo('fliperama', 1);
    await passo(6.1, vista());
    expect(som.tocarBrinquedo('fliperama', 1)).toBe(true);
    expect(som.tocarBrinquedo('fliperama', 2)).toBe(true);
    const f1 = fonteDe('fliperama_1');
    expect(f1[f1.length - 1].paradaEm).not.toBeNull();
    // o rádio: liga (a batida no tempo), e para sozinho depois de 8 compassos
    expect(som.tocarBrinquedo('radio')).toBe(true);
    await passo(6.5, vista());
    expect(som.info().radio).toBe(true);
    const [b] = fonteDe('batida');
    expect(b.paradaEm! - b.inicio![0]).toBeCloseTo(8 * COMPASSO + 0.06, 6);
    await passo(6.5 + 8 * COMPASSO + 0.5, vista());
    expect(som.info().radio).toBe(false);
    // ligado de novo e desligado no toque seguinte
    expect(som.tocarBrinquedo('radio')).toBe(true);
    await passo(24, vista());
    expect(som.info().radio).toBe(true);
    expect(som.tocarBrinquedo('radio')).toBe(true);
    expect(som.info().radio).toBe(false);
    // o ladrilho sobe a escala, e não vira metralhadora
    som.tocarBrinquedo('ladrilho');
    await passo(30, vista());
    const antes = tocados.filter((x) => x === 'ladrilho').length;
    expect(som.tocarBrinquedo('ladrilho')).toBe(true);
    expect(som.tocarBrinquedo('ladrilho')).toBe(false);
    await passo(30.2, vista());
    expect(som.tocarBrinquedo('ladrilho')).toBe(true);
    expect(tocados.filter((x) => x === 'ladrilho').length).toBe(antes + 2);
    const taxas = fonteDe('ladrilho').map((f) => f.playbackRate.value);
    expect(new Set(taxas).size).toBeGreaterThan(1);
  });

  it('a mistura do show: mais alto que as caixas soltas, a natureza baixa e volta, o "Música" vale', async () => {
    const v = { musica: 0.6, natureza: 0.8 };
    const { ctx, som, calarNatureza, vista, passo, fonteDe, D } = await montar(() => v);
    const nivel = nivelTrilha('vila-neon', 'dia');
    // as caixas soltas: o barramento no show, cada laço com GANHO_CAIXAS / GANHO_SHOW; a
    // natureza segue (as caixas são o ambiente da zona)
    await passo(10.1, vista({ cx: [true, false, false] }));
    await passo(10.15, vista({ cx: [true, false, false] }));
    expect(som.info().ganhoShow).toBeCloseTo(GANHO_SHOW * 0.6 * nivel, 9);
    const [solta] = fonteDe('bateria_verso');
    const g = (solta.ligados[0] as No).gain;
    const alvo = g.pontos.find((x) => x.t === 'alvo')?.v ?? g.value;
    expect(alvo * GANHO_SHOW).toBeCloseTo(GANHO_CAIXAS, 9);
    expect(som.info().calarNatureza).toBe(0);
    // o show: a natureza baixa inteira em toda a plateia (até o portão)
    const show = { inicio: 20 + D, final: null as number | null };
    for (let t = 19.95; t < 30; t += 0.5) await passo(t, vista({ cx: [true, true, true], show }));
    expect(som.info().calarNatureza).toBe(1);
    expect(calarNatureza.at(-1)).toBe(1);
    const camada = fonteDe('bateria_verso').at(-1)!;
    expect((camada.ligados[0] as No).gain.pontos.find((x) => x.t === 'alvo')?.v ?? 1).toBe(1);
    await passo(30.5, vista({ cx: [true, true, true], show }), { x: 5, z: 5 - 40 });
    expect(som.info().calarNatureza).toBe(1);
    expect(som.info().festival).toBe(1);
    // o "Música" das Configurações vale para o show
    v.musica = 0.3;
    await passo(31, vista({ cx: [true, true, true], show }));
    expect(som.info().ganhoShow).toBeCloseTo(GANHO_SHOW * 0.3 * nivel, 9);
    v.musica = 0.6;
    // o acorde final e o aplauso entram por cima
    await passo(57.0, vista({ cx: [true, true, true], show }));
    ctx.currentTime = 57.28;
    som.evento({ e: 'vilaFinal', quando: 57.2 + D, quem: 'ana' }, 57.28 + D);
    const fin = fonteDe('final')[0];
    const apl = fonteDe('aplauso')[0];
    expect((fin.ligados[0] as No).gain.value).toBeCloseTo(10 ** (REFORCO_FINAL_DB / 20), 9);
    expect((apl.ligados[0] as No).gain.value).toBeCloseTo(10 ** (REFORCO_APLAUSO_DB / 20), 9);
    // durante o aplauso a natureza segue baixa; depois dele, volta (as caixas seguem acesas)
    const fim = { inicio: 20 + D, final: 57.2 + D };
    await passo(60, vista({ cx: [true, true, true], show: fim }));
    expect(som.info().calarNatureza).toBe(1);
    await passo(62.4, vista({ cx: [true, true, true], show: fim }));
    await passo(62.6, vista({ cx: [true, true, true], show: fim }));
    expect(som.info().calarNatureza).toBe(0);
    expect(calarNatureza.at(-1)).toBe(0);
  });

  it('o ambiente da zona: a batida no rinque, o neon na rua de noite, um por vez', async () => {
    const { som, vista, passo } = await montar();
    await passo(5, vista(), { x: 210, z: 10 });
    await passo(5.1, vista(), { x: 210, z: 10 });
    expect(som.info().zona).toBe('rinque');
    expect(som.info().ambiente).toBe('batida');
    // de noite na rua: o neon (a batida sai em cruz)
    som.quadro(vista(), 106, { x: 350, z: 10 }, 1);
    await new Promise((r) => setTimeout(r, 0));
    som.quadro(vista(), 106.1, { x: 350, z: 10 }, 1);
    expect(som.info().ambiente).toBe('neon');
    await passo(7, vista(), PERTO);
    expect(som.info().ambiente).toBeNull();
  });
});

describe('vozes da Vila Neon', () => {
  it('sem pacote de vozes no índice: não baixa nada e fica na voz sintetizada', async () => {
    expect(JSON_INDICE.ordem).not.toContain('vila-neon');
    const ctx = new Ctx();
    const motor = criarMotorAudio(() => ctx as never);
    await motor.ativar();
    const baixados: string[] = [];
    const v = criarVozesGravadas({
      motor,
      tema: 'vila-neon',
      reserva: { bicho: () => undefined, morador: () => undefined, golpe: () => undefined },
      carregarIndice: async () => JSON_INDICE as never,
      baixar: async (u) => {
        baixados.push(u);
        return new ArrayBuffer(10);
      },
    });
    v.carregar();
    for (let i = 0; i < 4; i++) await new Promise((r) => setTimeout(r, 0));
    expect(baixados).toEqual([]);
    expect(v.falhou).toBe(true);
  });
});
