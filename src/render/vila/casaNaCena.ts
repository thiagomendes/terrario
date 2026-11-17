/**
 * A Casa anos 80 e a rampa de skate ligadas na cena (spec 026, parte 3): a cola entre o núcleo,
 * a tela, a câmera e o som. A cena chama isto em três momentos do quadro (antes da física, depois
 * da física e na atmosfera); o desenho mora em `casa.ts`, o trilho em `trilhoSkate.ts`, o som em
 * `audio/somCasa.ts`.
 *
 * - **Dentro da casa o telhado some e a câmera sobe** (o risco maior da parte 3: a câmera nunca
 *   dentro de uma parede, nunca o vazio): com a criança lá dentro, os blocos do telhado encolhem
 *   até sumir (no desenho dos blocos) e deixam de segurar a câmera e o dedo; a câmera vai devagar
 *   para cima, olhando a casa de cima como uma casinha de bonecas (a distância e a inclinação de
 *   lá de dentro), e volta ao jeito dela na saída. Sem telhado, a sala tem a luz do dia.
 * - **Sentar no sofá:** o pulinho até o assento livre (o da vovó nunca), de frente para a TV, e o
 *   gesto de sentar da 015; andar desce.
 * - **A sala de todos:** os toques mandam ao núcleo; o que muda no quadro (o canal, o filme, o
 *   disco) faz o som do botão, da fita e da agulha para quem está perto.
 */
import type { Scene } from '@babylonjs/core/scene';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { PlanoVila } from '../../world/vilaNeon';
import type { VilaVista } from '../../nucleo/vila';
import {
  DURA_FILME,
  casaDaRede,
  dentroDaCasa,
  passaFilme,
  type EstadoCasa,
} from '../../jogo/casa';
import type { NoTrilho } from '../../jogo/rampa';
import { criarCasaVila, type CasaVila, type ToqueCasa } from './casa';
import { criarTrilhoSkate, lugarDoAmigoNoTrilho, JUNTAS_NA_RAMPA } from './trilhoSkate';
import type { SalaNoSom, SomCasa, ToqueCasa as SomToque } from '../../audio/somCasa';
import type { PluginMundo } from '../materialMundo';
import { aplicarJuntas, type Juntas } from '../../personagem/gestos';
import type { Pose } from '../../personagem/poses';

/** Dentro da casa: a câmera de cima (a distância e a inclinação) e quanto ela leva para chegar. */
export const ZOOM_NA_CASA = 6.2;
export const PITCH_NA_CASA = 0.92;
/** A inclinação mais baixa lá dentro (mais baixo que isso a câmera bateria nas paredes). */
export const PITCH_MINIMO_NA_CASA = 0.55;
const VIRA_NA_CASA = 2.4;
/** O telhado some (e volta) neste tempo (s). */
const DURA_CORTE = 0.35;
/** O pulinho até o sofá (s). */
const DURA_PULO_SOFA = 0.42;

/** A pose de sentado no sofá (a mesma do gesto de sentar da 015, encaixada no assento). */
export const JUNTAS_SOFA: Juntas = {
  pernaD: -1.45,
  pernaE: -1.45,
  corpoY: -0.24,
  beX: -0.3,
  bdX: -0.3,
};

export interface DepsCasaNaCena {
  scene: Scene;
  plano: PlanoVila;
  voce: string;
  temMalha(cx: number, cz: number): boolean;
  brilha(m: Mesh): void;
  tapaOGlow(m: Mesh): void;
  vista(): VilaVista | null;
  tempoNucleo(): number;
  jogador: { x: number; y: number; z: number; vy: number; noChao: boolean };
  /** O rumo do controle de andar no chão (pela câmera); 0 solto. */
  rumo(): { x: number; z: number };
  deSkate(): boolean;
  enviar(c: { a: 'tv' | 'videocassete' | 'disco' | 'bau' } | { a: 'rampa'; l: 1 | -1 }): void;
  camera: {
    yaw(): number;
    pitch(): number;
    apontar(yaw: number, pitch: number): void;
    mexeuEm(): number;
    zoom(): number;
    definirZoom(d: number): void;
  };
  /** Os materiais dos blocos (o corte do telhado e a luz de dentro). */
  plugins: PluginMundo[];
  /** O gesto de sentar da 015 (a cena faz e manda aos amigos). */
  sentar(): void;
  /** Os outros jogadores (onde estão), para achar o assento livre do sofá. */
  outros(): readonly { x: number; y: number; z: number }[];
  som(): SomCasa | null;
  /** O orelhão da rua (o telefone da sala usa a mesma voz). */
  telefone(): void;
}

export function ligarCasaNaCena(d: DepsCasaNaCena) {
  const pc = d.plano.pontos.casa;
  const rampa = d.plano.pontos.skate.rampa;
  const render: CasaVila = criarCasaVila(d.scene, d.plano, {
    temMalha: d.temMalha,
    brilha: d.brilha,
    tapaOGlow: d.tapaOGlow,
  });
  const trilho = criarTrilhoSkate({
    rampa,
    voce: d.voce,
    vista: () => d.vista()?.rampa,
    tempoNucleo: d.tempoNucleo,
    jogador: d.jogador,
    controle: d.rumo,
    deSkate: d.deSkate,
    pedir: (l) => d.enviar({ a: 'rampa', l }),
    camera: d.camera,
    aoClac: () => d.som()?.tocar('clac', { x: d.jogador.x, z: d.jogador.z }),
  });

  // ------------------------------------------------------------------ a caixa de dentro e o corte
  const Y = pc.y;
  const dentroMundo = [pc.dentro.x0 - 0.02, pc.dentro.z0 - 0.02, pc.dentro.x1 + 1.02, pc.dentro.z1 + 1.02];
  const corte = pc.corte;
  for (const p of d.plugins) {
    p.casaDentro.set(dentroMundo);
    p.casaCorte.set([corte.x0, corte.z0, corte.x1 + 1, corte.z1 + 1]);
    p.casaY[0] = Y - 0.02;
    p.casaY[1] = corte.y;
    pc.paredes.forEach((r, i) => p.casaParede.set([r.x0, r.z0, r.x1 + 1, r.z1 + 1], i * 4));
  }
  /** Quanto do corte já valeu (0 o telhado inteiro, 1 sumido). */
  let k = 0;
  /** Quanto cada parede já sumiu (sul, norte, oeste, leste, meio). */
  const kParede = [0, 0, 0, 0, 0];
  let naCasa = false;
  /** A câmera de antes de entrar (volta na saída). */
  let antes: { zoom: number; pitch: number } | null = null;
  let entrouEm = -Infinity;

  /** A célula é do telhado cortado ou de uma parede que sumiu (não segura a câmera nem o dedo)? */
  function cortado(x: number, y: number, z: number): boolean {
    if (k > 0.5 && y >= corte.y && x >= corte.x0 && x <= corte.x1 && z >= corte.z0 && z <= corte.z1)
      return true;
    if (y < Y + 1 || y >= corte.y) return false;
    for (let i = 0; i < 5; i++) {
      const r = pc.paredes[i];
      if (kParede[i] > 0.5 && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return true;
    }
    return false;
  }
  /**
   * O que segura a câmera com a criança lá dentro: a câmera fica sempre dentro da casa (por cima
   * dela, sem telhado), nunca do lado de fora das paredes (de lá, por cima da parede, ela via o
   * avesso do telhado e da parede, o "vazio"). Devolve true (segura), false (o telhado e as paredes
   * que sumiram não seguram) ou undefined (a conta de sempre).
   */
  function seguraCamera(x: number, y: number, z: number): boolean | undefined {
    if (k <= 0.5) return undefined;
    const dentroDaCaixa =
      x >= corte.x0 - 1 && x <= corte.x1 + 1 && z >= corte.z0 - 1 && z <= corte.z1 + 1;
    if (!dentroDaCaixa || y < Y) return undefined;
    const r = pc.dentro;
    const noMiolo = x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
    if (!noMiolo) return true;
    return cortado(x, y, z) ? false : undefined;
  }
  /**
   * Quais paredes ficam entre a câmera e a criança (somem): a câmera de cima fica atrás dela, a
   * uns blocos; a parede de fora que fica desse lado (ou perto dele) sai, e a do meio sai quando
   * a câmera está do outro lado dela.
   */
  function paredesNaFrente(): boolean[] {
    const j = d.jogador;
    const yaw = d.camera.yaw();
    const atras = Math.cos(d.camera.pitch()) * d.camera.zoom() + 1.2;
    const cx = j.x - Math.sin(yaw) * atras;
    const cz = j.z - Math.cos(yaw) * atras;
    const [S, N, W, E, M] = pc.paredes;
    const meio = M.x0 + 0.5;
    return [
      cz > S.z0 - 0.4,
      cz < N.z1 + 1.4,
      cx < W.x1 + 1.4,
      cx > E.x0 - 0.4,
      j.x < meio !== cx < meio || Math.abs(cx - meio) < 0.8,
    ];
  }

  // ------------------------------------------------------------------ o sofá
  let pulo: { de: [number, number, number]; ate: [number, number, number]; em: number } | null =
    null;
  let agora = 0;
  function assentoLivre(): number {
    const outros = d.outros();
    const j = d.jogador;
    let melhor = -1;
    let dm = Infinity;
    // (o assento 0 é da vovó)
    pc.sofa.assentos.forEach((a, i) => {
      if (i === 0) return;
      if (outros.some((o) => Math.hypot(o.x - a.x, o.z - a.z) < 0.6 && Math.abs(o.y - a.y) < 0.8))
        return;
      const dd = Math.hypot(a.x - j.x, a.z - j.z);
      if (dd < dm) {
        dm = dd;
        melhor = i;
      }
    });
    return melhor;
  }

  // ------------------------------------------------------------------ a sala no som
  let salaVista: EstadoCasa = casaDaRede(null);
  let canalVisto = -1;
  let trocouVisto = Number.NaN;
  let filmeVisto = 0;
  let discoVisto = -1;
  const sala = (): EstadoCasa => {
    const q = d.vista()?.casa;
    salaVista = q ? casaDaRede(q) : salaVista;
    return salaVista;
  };

  return {
    render,
    trilho,
    cortado,
    seguraCamera,
    /** Está dentro da casa agora? */
    dentro: () => naCasa,
    /** O lugar do boneco agora (o trilho da rampa ou o pulinho do sofá), ou null. */
    lugar(): { x: number; y: number; z: number; yaw?: number } | null {
      const l = trilho.lugar();
      if (l) return l;
      if (pulo) {
        const u = Math.min(1, (agora - pulo.em) / DURA_PULO_SOFA);
        const s = u * u * (3 - 2 * u);
        return {
          x: pulo.de[0] + (pulo.ate[0] - pulo.de[0]) * s,
          y: pulo.de[1] + (pulo.ate[1] - pulo.de[1]) * s + Math.sin(u * Math.PI) * 0.55,
          z: pulo.de[2] + (pulo.ate[2] - pulo.de[2]) * s,
          yaw: pc.sofa.yaw,
        };
      }
      return null;
    },
    /** O trilho de agora (a inclinação da prancha e o rumo), ou null. */
    noTrilho: (): NoTrilho | null => trilho.lugar(),
    /** A pose do boneco no trilho (os joelhos e os braços). */
    pose(pose: Pose): Pose {
      return trilho.lugar() ? aplicarJuntas(pose, JUNTAS_NA_RAMPA, 1) : pose;
    },
    /** Onde um amigo está no trilho (na tela de quem olha), com a pose. */
    amigo(id: string) {
      const l = lugarDoAmigoNoTrilho(rampa, d.vista()?.rampa, id, d.tempoNucleo());
      return l ? { ...l, juntas: JUNTAS_NA_RAMPA, inclina: l.inclina } : null;
    },
    /** Sentar no sofá: o pulinho até o assento livre e o gesto. Devolve se sentou. */
    sentar(): boolean {
      const i = assentoLivre();
      if (i < 0 || pulo) return false;
      const a = pc.sofa.assentos[i];
      const j = d.jogador;
      pulo = { de: [j.x, j.y, j.z], ate: [a.x, a.y, a.z], em: agora };
      d.som()?.tocar('sofa', { x: a.x, z: a.z });
      return true;
    },
    /** Um toque na sala ou no quarto (o que vai ao núcleo vai; o resto é da tela). */
    tocar(qual: 'tv' | 'videocassete' | 'disco' | 'bau' | 'telefone' | ToqueCasa): void {
      if (qual === 'tv' || qual === 'videocassete' || qual === 'disco' || qual === 'bau') {
        d.enviar({ a: qual });
        if (qual === 'bau') d.som()?.tocar('bau', { x: pc.bau[0], z: pc.bau[2] });
        return;
      }
      render.tocar(qual);
      if (qual === 'telefone') d.telefone();
      else {
        const onde = { ioio: pc.ioio, piao: pc.piao, cubo: pc.cubo, robo: pc.robo, bola: pc.bola }[qual];
        d.som()?.tocar(qual as SomToque, { x: onde[0], z: onde[2] });
      }
    },
    /** Antes da física: o trilho da rampa e o pulinho do sofá. */
    antesDaFisica(t: number, dt: number): void {
      agora = t;
      trilho.quadro(t, dt);
      if (pulo && t - pulo.em >= DURA_PULO_SOFA) {
        // chegou no assento: a física volta (de pé em cima da almofada) e o gesto de sentar
        const j = d.jogador;
        [j.x, j.y, j.z] = pulo.ate;
        j.vy = 0;
        j.noChao = true;
        pulo = null;
        d.camera.apontar(pc.sofa.yaw, Math.max(0.55, d.camera.pitch()));
        d.sentar();
      }
    },
    /** Depois da física: dentro ou fora da casa (o telhado e a câmera), o desenho e o som. */
    depois(q: { t: number; dt: number; noite: number; hora: number; cam: { x: number; z: number } }) {
      const j = d.jogador;
      const agoraDentro =
        dentroDaCasa(pc, j.x, j.z) && j.y > Y - 0.5 && j.y < corte.y - 0.5;
      if (agoraDentro !== naCasa) {
        naCasa = agoraDentro;
        if (naCasa) {
          antes = { zoom: d.camera.zoom(), pitch: d.camera.pitch() };
          entrouEm = q.t;
          d.camera.definirZoom(Math.max(antes.zoom, ZOOM_NA_CASA));
        } else if (antes) {
          d.camera.definirZoom(antes.zoom);
          d.camera.apontar(d.camera.yaw(), Math.min(d.camera.pitch(), Math.max(0.2, antes.pitch)));
          antes = null;
        }
      }
      // o telhado encolhe (ou volta) devagar, e as paredes da frente da câmera também
      const alvo = naCasa ? 1 : 0;
      const passo = q.dt / DURA_CORTE;
      k += Math.sign(alvo - k) * Math.min(Math.abs(alvo - k), passo);
      const frente = naCasa ? paredesNaFrente() : [false, false, false, false, false];
      for (let i = 0; i < 5; i++) {
        const a = frente[i] ? 1 : 0;
        kParede[i] += Math.sign(a - kParede[i]) * Math.min(Math.abs(a - kParede[i]), passo);
      }
      for (const p of d.plugins) {
        p.casaY[2] = k;
        p.casaY[3] = q.noite;
        p.casaParedeK.set(kParede.slice(0, 4), 0);
        p.casaParedeK[4] = kParede[4];
      }
      render.paredes(kParede);
      // a câmera de cima: chega devagar logo depois de entrar; depois, nunca mais baixa que o
      // mínimo (abaixo disso ela bateria nas paredes e ficaria colada na criança)
      if (naCasa) {
        const p = d.camera.pitch();
        if (q.t - entrouEm < 1.6 && d.camera.mexeuEm() < entrouEm)
          d.camera.apontar(d.camera.yaw(), p + (PITCH_NA_CASA - p) * Math.min(1, q.dt * VIRA_NA_CASA));
        else if (p < PITCH_MINIMO_NA_CASA)
          d.camera.apontar(d.camera.yaw(), p + (PITCH_MINIMO_NA_CASA - p) * Math.min(1, q.dt * 4));
      }
      // a casa na tela e o som da sala
      const s = sala();
      render.quadro({ t: q.t, tNucleo: d.tempoNucleo(), noite: q.noite, hora: q.hora, sala: s, cam: q.cam });
      const som = d.som();
      const tn = d.tempoNucleo();
      if (som) {
        const filme = passaFilme(s, tn);
        const naSalaSom: SalaNoSom = {
          tv: filme
            ? { id: 'filme', desde: s.filme - DURA_FILME }
            : { id: `canal${s.canal}` as SalaNoSom['tv']['id'], desde: 0 },
          disco: s.disco >= 0 ? s.disco : null,
        };
        som.quadro(j, tn, naSalaSom, naCasa);
        // o que mudou na sala: o botão da TV, a fita entrando, a agulha no disco
        const tv = { x: pc.tv[0], z: pc.tv[2] };
        if (!Number.isNaN(trocouVisto)) {
          if (s.filme !== filmeVisto && s.filme > 0) som.tocar('fita', tv);
          else if (s.canal !== canalVisto || s.trocou !== trocouVisto) som.tocar('canal', tv);
          if ((s.disco >= 0) !== (discoVisto >= 0))
            som.tocar('agulha', { x: pc.discos[0], z: pc.discos[2] });
        }
      }
      canalVisto = s.canal;
      trocouVisto = s.trocou;
      filmeVisto = s.filme;
      discoVisto = s.disco;
    },
    /** A sala de agora (testes e a interface). */
    sala,
    descartar(): void {
      render.descartar();
    },
  };
}

export type CasaNaCena = ReturnType<typeof ligarCasaNaCena>;
