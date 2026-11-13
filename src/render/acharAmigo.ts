/**
 * Spec 021 "Achar o amigo", do lado do jogo: onde cada amigo cai na tela (uma projeção por
 * amigo por quadro), quem está escondido por morro, árvore ou casa (um raio pelos blocos a
 * cada 0,3 s, só para quem está dentro da vista), quem está escolhido e quem chamou. A conta
 * da borda é de `disporCarinhas`; o desenho e os toques, de `ui/carinhasAmigos`.
 */
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import {
  DURA_CHAMADO,
  MAX_CARINHAS,
  PERTO_AMIGO,
  disporCarinhas,
  type AmigoNaTela,
} from '../jogo/acharAmigo';
import { corDoAmigo } from '../ui/mapa';
import { criarCarinhas, type AmigoDaCarinha, type Carinhas } from '../ui/carinhasAmigos';
import { obterBloco, Bloco } from '../world/blocks';
import {
  espalharEstrelas,
  maisPertoDoCaminho,
  procurarCaminho,
  type LeitorCaminho,
  type V3,
} from '../jogo/caminho';
import { DURA_TRILHA, ESPERA_CHAMAR, ESPERA_PULO } from '../jogo/acharAmigo';
import { criarEstrelinhas } from './estrelinhas';

export interface AmigoNoMundo {
  id: string;
  x: number;
  /** Pés. */
  y: number;
  z: number;
  /** A aparência passada a limpo, em texto. */
  aparencia: string;
}

export interface FonteAcharAmigo {
  scene: Scene;
  /** Os pés do jogador. */
  jogador(): { x: number; y: number; z: number };
  amigos(): readonly AmigoNoMundo[];
  bloco(x: number, y: number, z: number): number;
  /** O aparelho tem os blocos desta coluna (o pedaço do mundo já chegou)? */
  conhecido(x: number, z: number): boolean;
  /** Manda o pedido de pulo ao núcleo (com a posição de agora antes). */
  pedirPulo(alvo: string): void;
  /** Leva o jogador (pés em y) e o vira para (yaw), com a câmera de lado. */
  levar(x: number, y: number, z: number, yaw: number): void;
  /** Desmaiado: nada de pulo. */
  morto(): boolean;
  /** O jogador acena (gesto da 015). */
  acenar(): void;
  som(qual: 'puf' | 'sininho'): void;
  /** O gesto "chamar" e o pedido ao núcleo ("vem cá!" para a sala toda). */
  chamar(): void;
  /** A camada pode aparecer agora (sem tela por cima, sem modo foto, vivo)? */
  pode(): boolean;
}

/** Entre duas conferências do "escondido" (s). */
const INTERVALO_TAPADO = 0.3;

export function criarAcharAmigo(f: FonteAcharAmigo) {
  const { scene } = f;
  let escolhido: string | null = null;
  let chamando: { id: string; ate: number } | null = null;
  const tapados = new Map<string, boolean>();
  let ultimoTapado = -Infinity;
  const mapa = new Map<string, AmigoDaCarinha>();
  const naTela: AmigoNaTela[] = [];
  /** Custo da camada por quadro (ms, média móvel), para a régua de desempenho. */
  let custoMs = 0;
  const ouvintes = {
    tocar: (_id: string) => {},
    pular: (_id: string) => {},
  };
  const carinhas: Carinhas = criarCarinhas({
    tocar: (id) => ouvintes.tocar(id),
    pular: (id) => ouvintes.pular(id),
    // o montinho abre a bandeja, e lá a criança toca na cara que quer
    montinho: () => carinhas.abrirBandeja(true),
    // tocar de novo no escolhido, na bandeja, desfaz a escolha
    escolher: (id) => {
      escolhido = escolhido === id ? null : id;
    },
    chamar: () => chamar(),
  });
  let ultimoChamar = -Infinity;
  let chamadas = 0;
  function chamar(): void {
    const agora = performance.now() / 1000;
    if (f.morto() || agora - ultimoChamar < ESPERA_CHAMAR) return;
    ultimoChamar = agora;
    chamadas++;
    f.chamar();
    f.som('sininho');
    carinhas.chamou(ESPERA_CHAMAR);
  }

  const solido = (x: number, y: number, z: number) => {
    const b = f.bloco(Math.floor(x), Math.floor(y), Math.floor(z));
    if (b === Bloco.AR) return false;
    const d = obterBloco(b);
    return !!d && d.solido && !d.liquido;
  };

  // ------------------------------------------------------------------ a trilha de estrelinhas
  const estrelinhas = criarEstrelinhas(scene);
  const leitor: LeitorCaminho = { bloco: f.bloco, conhecido: f.conhecido };
  let trilha: {
    alvo: string;
    brutos: V3[];
    completo: boolean;
    nasceu: number;
    /** Onde o jogador e o amigo estavam quando o caminho foi procurado. */
    ax: number;
    az: number;
    em: number;
  } | null = null;
  let ultimoCaminhoMs = 0;

  function procurar(id: string): { brutos: V3[]; completo: boolean; a: AmigoNoMundo } | null {
    const a = f.amigos().find((x) => x.id === id);
    if (!a) return null;
    const p = f.jogador();
    const t0 = performance.now();
    const c = procurarCaminho(leitor, [p.x, p.y, p.z], [a.x, a.y, a.z]);
    ultimoCaminhoMs = performance.now() - t0;
    return { brutos: c.pts, completo: c.completo, a };
  }

  /** Acende a trilha até o amigo. Devolve quantos passos tem o caminho (0: nenhum). */
  function acenderTrilha(id: string): number {
    const r = procurar(id);
    const agora = performance.now() / 1000;
    if (!r || !r.brutos.length) {
      // nem um passo a pé: a carinha sugere o pulo
      trilha = null;
      estrelinhas.tirar();
      carinhas.sugerirPulo(r ? id : null);
      return 0;
    }
    trilha = {
      alvo: id,
      brutos: r.brutos,
      completo: r.completo,
      nasceu: agora,
      ax: r.a.x,
      az: r.a.z,
      em: agora,
    };
    estrelinhas.trilha(espalharEstrelas(r.brutos), r.completo, agora);
    // sem caminho inteiro (morro alto, rio): o anel pisca, "segure para pular"
    carinhas.sugerirPulo(r.completo ? null : id);
    return r.brutos.length;
  }

  function apagarTrilha(): void {
    trilha = null;
    estrelinhas.tirar();
    carinhas.sugerirPulo(null);
  }

  function quadroTrilha(agora: number, amigos: readonly AmigoNoMundo[]): void {
    let perto = 0;
    if (trilha) {
      const p = f.jogador();
      const a = amigos.find((x) => x.id === trilha!.alvo);
      if (!a) apagarTrilha();
      else {
        const estrelas = estrelinhas.pontos();
        const mp = maisPertoDoCaminho(estrelas, p.x, p.z);
        perto = Math.max(0, mp.i);
        if (!estrelinhas.apagando) {
          // chegou perto do amigo, ou o tempo acabou: apaga
          if (Math.hypot(a.x - p.x, a.z - p.z) < 3 || agora - trilha.nasceu > DURA_TRILHA) {
            estrelinhas.apagar(agora);
            carinhas.sugerirPulo(null);
          } else if (
            agora - trilha.em > 1 &&
            (mp.d > 6 || Math.hypot(a.x - trilha.ax, a.z - trilha.az) > 6)
          ) {
            // a criança saiu da trilha (ou o amigo andou): procura de novo, sem nascer outra vez
            const r = procurar(trilha.alvo);
            trilha.em = agora;
            if (r && r.brutos.length) {
              trilha.brutos = r.brutos;
              trilha.completo = r.completo;
              trilha.ax = r.a.x;
              trilha.az = r.a.z;
              estrelinhas.trocarPontos(espalharEstrelas(r.brutos), r.completo);
              carinhas.sugerirPulo(r.completo ? null : trilha.alvo);
            }
          }
        }
      }
    }
    estrelinhas.quadro(agora, perto);
    if (trilha && !estrelinhas.acesa) {
      trilha = null;
      // com poucos amigos, a escolha dura o tempo da trilha
      if (mapa.size <= MAX_CARINHAS) escolhido = null;
    }
  }

  // ------------------------------------------------------------------ pular para perto
  let pedido: { id: string; em: number } | null = null;
  let ultimoPulo = -Infinity;
  let pulos = 0;
  ouvintes.pular = (id) => {
    const agora = performance.now() / 1000;
    // o núcleo recusaria: a carinha já diz "não" (sem esperar a rede)
    if (f.morto() || agora - ultimoPulo < ESPERA_PULO || pedido) {
      carinhas.nao(id);
      return;
    }
    pedido = { id, em: agora };
    f.pedirPulo(id);
  };
  /** O núcleo levou: puf onde estava, vai, puf onde chegou, virado para o amigo, e acena. */
  function pulou(x: number, y: number, z: number, alvo: string): void {
    pedido = null;
    ultimoPulo = performance.now() / 1000;
    pulos++;
    const p = f.jogador();
    estrelinhas.puf(p.x, p.y, p.z, performance.now() / 1000);
    f.som('puf');
    carinhas.sugerirPulo(null);
    setTimeout(() => {
      const a = f.amigos().find((o) => o.id === alvo);
      const yaw = a ? Math.atan2(a.x - x, a.z - z) : 0;
      f.levar(x, y, z, yaw);
      estrelinhas.puf(x, y, z, performance.now() / 1000);
      apagarTrilha();
      setTimeout(() => f.acenar(), 450);
    }, 260);
  }
  /** O núcleo recusou (sem lugar seguro, intervalo, combate): a carinha balança "não". */
  function recusado(): void {
    if (pedido) carinhas.nao(pedido.id);
    pedido = null;
  }

  ouvintes.tocar = (id) => {
    escolhido = id;
    acenderTrilha(id);
  };

  const pv = new Vector3();
  const proj = new Vector3();
  const alvo = new Vector3();

  function conferirTapados(
    agora: number,
    vistos: readonly AmigoNaTela[],
    amigos: readonly AmigoNoMundo[],
  ): void {
    if (agora - ultimoTapado < INTERVALO_TAPADO) return;
    ultimoTapado = agora;
    const cam = scene.activeCamera;
    if (!cam) return;
    const o = cam.globalPosition;
    for (const a of vistos) {
      // só quem está dentro da vista (o resto já vai para a borda)
      if (!a.frente || a.d < PERTO_AMIGO) {
        tapados.set(a.id, false);
        continue;
      }
      const am = amigos.find((x) => x.id === a.id);
      if (!am) continue;
      const ax = am.x;
      const ay = am.y + 1.4;
      const az = am.z;
      const d = Math.hypot(ax - o.x, ay - o.y, az - o.z);
      let tapado = false;
      for (let s = 1.5; s < d - 1; s += 0.5) {
        const k = s / d;
        if (solido(o.x + (ax - o.x) * k, o.y + (ay - o.y) * k, o.z + (az - o.z) * k)) {
          tapado = true;
          break;
        }
      }
      tapados.set(a.id, tapado);
    }
  }

  function quadro(): void {
    const t0 = performance.now();
    const agora = t0 / 1000;
    const cam = scene.activeCamera;
    const amigos = f.amigos();
    // a lista de quem está na sala (cor e aparência para as fotos)
    for (const id of mapa.keys()) if (!amigos.some((a) => a.id === id)) mapa.delete(id);
    for (const a of amigos) {
      const m = mapa.get(a.id);
      if (!m) mapa.set(a.id, { id: a.id, cor: corDoAmigo(a.id), aparencia: a.aparencia });
      else if (m.aparencia !== a.aparencia) m.aparencia = a.aparencia;
    }
    if (escolhido && !mapa.has(escolhido)) escolhido = null;
    if (chamando && (agora > chamando.ate || !mapa.has(chamando.id))) chamando = null;
    const p = f.jogador();
    const bandeja = amigos
      .map((a) => ({ id: a.id, d: Math.hypot(a.x - p.x, a.z - p.z) }))
      .sort((a, b) => a.d - b.d)
      .map((a) => ({ id: a.id, perto: a.d < PERTO_AMIGO }));
    carinhas.botoes(bandeja, escolhido, mapa.size > MAX_CARINHAS, mapa);
    quadroTrilha(agora, amigos);
    // a resposta do núcleo sumiu (caiu a rede): solta o pedido
    if (pedido && agora - pedido.em > 4) pedido = null;
    if (!cam || !amigos.length || !f.pode()) {
      carinhas.desenhar([], mapa);
      return;
    }
    const W = window.innerWidth;
    const H = window.innerHeight;
    const motor = scene.getEngine();
    const larg = motor.getRenderWidth();
    const alt = motor.getRenderHeight();
    const vista = cam.viewport.toGlobal(larg, alt);
    const view = cam.getViewMatrix();
    const transf = scene.getTransformMatrix();
    naTela.length = 0;
    for (const a of amigos) {
      alvo.set(a.x, a.y + 1.5, a.z);
      Vector3.TransformCoordinatesToRef(alvo, view, pv);
      Vector3.ProjectToRef(alvo, Matrix.IdentityReadOnly, transf, vista, proj);
      naTela.push({
        id: a.id,
        d: Math.hypot(a.x - p.x, a.z - p.z),
        sx: (proj.x / larg) * W,
        sy: (proj.y / alt) * H,
        frente: pv.z > 0.3,
        vx: pv.x,
        vy: pv.y,
        vz: pv.z,
        tapado: tapados.get(a.id) ?? false,
      });
    }
    conferirTapados(agora, naTela, amigos);
    const itens = disporCarinhas({
      W,
      H,
      celular: Math.min(W, H) <= 560,
      amigos: naTela,
      proibidos: carinhas.proibidos(),
      escolhido,
      chamando: chamando?.id ?? null,
      total: amigos.length,
    });
    carinhas.desenhar(itens, mapa);
    custoMs += (performance.now() - t0 - custoMs) * 0.05;
  }

  function recebeuChamado(id: string): void {
    chamando = { id, ate: performance.now() / 1000 + DURA_CHAMADO };
    f.som('sininho');
  }

  /** Para os testes de tela e as capturas. */
  const api = {
    vistos: () => carinhas.vistos(),
    proibidos: () => carinhas.proibidos(true).map((c) => ({ ...c })),
    escolher: (id: string | null) => {
      escolhido = id;
    },
    escolhido: () => escolhido,
    chamado: (id: string) => recebeuChamado(id),
    chamar: () => chamar(),
    chamadas: () => chamadas,
    chamando: () => chamando?.id ?? null,
    tapado: (id: string) => tapados.get(id) ?? false,
    segurar: (id: string | null, fracao?: number) => carinhas.segurar(id, fracao),
    custoMs: () => custoMs,
    bandeja: (aberta: boolean) => carinhas.abrirBandeja(aberta),
    /** Trilha até o amigo (null apaga). Devolve quantos passos tem o caminho. */
    trilha: (id: string | null) => {
      if (!id) {
        apagarTrilha();
        return 0;
      }
      escolhido = id;
      return acenderTrilha(id);
    },
    caminho: () => trilha?.brutos.map((p) => [...p] as V3) ?? [],
    trilhaCompleta: () => trilha?.completo ?? null,
    estrelas: () => estrelinhas.medida(),
    caminhoMs: () => ultimoCaminhoMs,
    /** Segurou até o fim (como o dedo de verdade). */
    pular: (id: string) => ouvintes.pular(id),
    pulos: () => pulos,
    /** Só o puf (capturas). */
    puf: () => {
      const p = f.jogador();
      estrelinhas.puf(p.x, p.y, p.z, performance.now() / 1000);
      f.som('puf');
    },
  };

  return {
    quadro,
    carinhas,
    api,
    pulou,
    recusado,
    ouvintes,
    get escolhido() {
      return escolhido;
    },
    escolher(id: string | null): void {
      escolhido = id;
    },
    /** Com mais de MAX_CARINHAS amigos há montinho, bandeja e pontinhos. */
    get muitos() {
      return mapa.size > MAX_CARINHAS;
    },
    /** Um amigo chamou: a carinha dele vem para a frente por DURA_CHAMADO s e o sininho toca. */
    chamado: (id: string) => recebeuChamado(id),
    get chamandoAgora() {
      return chamando?.id ?? null;
    },
    tapado: (id: string) => tapados.get(id) ?? false,
    get custoMs() {
      return custoMs;
    },
    amigosDaSala: () => mapa,
  };
}

export type AcharAmigo = ReturnType<typeof criarAcharAmigo>;
export type ApiAcharAmigo = AcharAmigo['api'];
