/**
 * As peças da Noite das Fantasias na tela (spec 027): tudo o que não é bloco (a abóbora gigante,
 * as barracas, as portas, as lanternas do bosque, a vitrine...) e os sósias de longe da torre do
 * castelinho e da abóbora gigante.
 *
 * A regra do campo de visão (a mesma da Vila Neon, `render/vila/index.ts`):
 * - as peças de um chunk só nascem quando a malha dele está desenhada, e saem com ela; cada chunk
 *   vira poucas malhas (o corpo com a cor nos vértices, as luzes, o que só aparece de dia e o que
 *   só aparece de noite), nascidas no máximo uma (no celular) por quadro;
 * - os marcos altos têm sósia de longe com o próprio pedaço de chão, que só aparece enquanto
 *   nenhum chunk do marco está desenhado (`sosias.ts`).
 *
 * As lanternas brilham sem espalhar luz (o material aceso, sem luz pontual: nada soma na roupa de
 * quem passa perto). O que é tocado (a abóbora gigante pisca e ri; a porta fechada balança) é
 * desenho só desta tela: nenhum estado novo.
 */
import type { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreatePlane } from '@babylonjs/core/Meshes/Builders/planeBuilder';
import { criarPlasticos } from '../formas';
import { Pecas } from '../solidos';
import type { PecaBaile, PlanoBaile } from '../../world/noiteFantasias';
import { desenharPecaBaile, type DesenhoBaile } from './pecas';
import { criarSosiasBaile, type SosiasBaile } from './sosias';
import { criarPaletaLuz } from '../vila/luzes';
import { criarBichosBaile, type BichosBaile } from './bichos';
import { criarMissoesNaTela, type MissoesNaTela, type OpcoesMissoesNaTela } from './missoes';

export interface OpcoesRenderBaile {
  /** A malha do chunk está desenhada? */
  temMalha(cx: number, cz: number): boolean;
  /** A malha brilha no glow (as lanternas, o rosto aceso). */
  brilha?(m: Mesh): void;
  /** A malha não brilha mas tapa o brilho do que fica atrás. */
  tapaOGlow?(m: Mesh): void;
  /** Uma peça por quadro no celular; no computador, até 2. */
  porQuadro?: number;
  /** T19: a lanterna `i` do bosque está acesa (o mundo, ou a previsão do toque)? */
  lanternaAcesa?(i: number): boolean;
  /** T19: o que as missões leem da tela (a vista desta criança, as missões abertas, os pés). */
  missoes?: Omit<OpcoesMissoesNaTela, 'scene' | 'plano' | 'mat' | 'luz' | 'temMalha' | 'tapaOGlow' | 'brilha'>;
}

/** T19: quanto tempo a porta fica aberta (s) e quanto a folha abre (radianos). */
const PORTA_ABERTA = 2;
const ABRE = 1.25;

/** O que se toca nas peças da festa (desenho só desta tela). */
export type ToqueBaile = { a: 'abobora' } | { a: 'porta'; i: number };

export interface RenderBaile {
  /** Uma vez por quadro: nasce ou some o que mudou, e anima. */
  quadro(t: number, x: number, z: number, noite: number, alto?: number): void;
  /** Peças visíveis em chunk sem malha (teste do campo de visão; sempre 0). */
  semChao(): number;
  /** Quantos chunks e malhas vivos (medida). */
  contagem(): { chunks: number; malhas: number; triangulos: number; sosias: number };
  sosias: SosiasBaile;
  /** As portas fechadas (o meio da frente de cada uma), para o toque. */
  portas(): { x: number; y: number; z: number }[];
  /** O toque: a abóbora pisca e ri, a porta balança. */
  tocar(t: ToqueBaile): void;
  /** O que está animando agora (testes). */
  animando(): { abobora: number; portas: number[] };
  /** T19: a porta `i` (de `portas()`) abre para a rua e fecha sozinha (a campainha da n1). */
  abrirPorta(i: number): void;
  /** T19: a lanterna `i` do bosque pisca (a já acesa que contou de novo). */
  piscarLanterna(i: number): void;
  /** T19: a porta da tela (índice de `portas()`) em (x, z), ou -1. */
  portaDaRua(x: number, z: number): number;
  /** T19 (testes): as portas abertas, as luzes de dentro e as lanternas piscando. */
  estadoPortas(): { abertas: number[]; dentro: number; piscando: number[] };
  /** T12: o Tufinho no banquinho e a corujinha no poleiro. */
  bichos: BichosBaile;
  /** T19: os momentos das missões nesta tela (null sem as opções das missões). */
  missoes: MissoesNaTela | null;
  descartar(): void;
}

interface ChunkVivo {
  cx: number;
  cz: number;
  malhas: Mesh[];
  dia: Mesh[];
  noite: Mesh[];
  /** As portas (cada uma uma malha à parte, para balançar). */
  portas: { i: number; malha: Mesh }[];
  /** A abóbora gigante (o rosto que pisca: a malha do dia e a da noite). */
  abobora: Mesh[];
  /** T19: o vidro aceso de cada lanterna do bosque (o número dela na n2). */
  lanternas: { i: number; luz: Mesh }[];
}

const chave = (cx: number, cz: number) => `${cx},${cz}`;
/** Os tipos de porta fechada (balançam no toque). */
const PORTAS = new Set(['porta', 'porta-vovo', 'porta-loja', 'porta-castelo']);

/** Os chunks de uma peça: a de duas pontas (as bandeirolas) entra em todos os que atravessa. */
function chunksDaPeca(p: PecaBaile): string[] {
  if (!p.ate) return [chave(Math.floor(p.x / 16), Math.floor(p.z / 16))];
  const out: string[] = [];
  for (let cx = Math.floor(Math.min(p.x, p.ate[0]) / 16); cx <= Math.floor(Math.max(p.x, p.ate[0]) / 16); cx++)
    for (let cz = Math.floor(Math.min(p.z, p.ate[2]) / 16); cz <= Math.floor(Math.max(p.z, p.ate[2]) / 16); cz++)
      out.push(chave(cx, cz));
  return out;
}

export function criarRenderBaile(
  scene: Scene,
  plano: PlanoBaile,
  opcoes: OpcoesRenderBaile,
): RenderBaile {
  const pl = criarPlasticos(scene, 'baile');
  const matCorpo = pl.corVertice(0.3) ?? pl.cor('#ffffff', 0.3);
  const paleta = criarPaletaLuz(scene, 'baile-luz');
  const matLuz = paleta.material;
  const porChunk = new Map<string, PecaBaile[]>();
  /** O índice de cada porta fechada no plano (o toque e o balanço). */
  const indicePorta = new Map<PecaBaile, number>();
  const listaPortas: { x: number; y: number; z: number }[] = [];
  const dadosPorta: PecaBaile[] = [];
  for (const p of plano.pecas) {
    if (PORTAS.has(p.tipo)) {
      indicePorta.set(p, listaPortas.length);
      listaPortas.push({ x: p.x, y: p.y + 1, z: p.z });
      dadosPorta.push(p);
    }
    for (const k of chunksDaPeca(p)) {
      const l = porChunk.get(k);
      if (l) l.push(p);
      else porChunk.set(k, [p]);
    }
  }
  /**
   * Os chunks que precisam estar desenhados junto (a abóbora gigante passa de um chunk: ela só
   * nasce com todo o chão dela pronto, e sai se qualquer pedaço sair).
   */
  const depende = new Map<string, string[]>();
  for (const p of plano.pecas) {
    if (p.tipo !== 'abobora-gigante') continue;
    const L = (p.n ?? 12) * 0.62;
    const ks: string[] = [];
    for (let cx = Math.floor((p.x - L) / 16); cx <= Math.floor((p.x + L) / 16); cx++)
      for (let cz = Math.floor((p.z - L) / 16); cz <= Math.floor((p.z + L) / 16); cz++) ks.push(chave(cx, cz));
    depende.set(chave(Math.floor(p.x / 16), Math.floor(p.z / 16)), ks);
  }
  const comChao = (k: string, cx: number, cz: number) =>
    opcoes.temMalha(cx, cz) &&
    (depende.get(k) ?? []).every((d) => {
      const [a, b] = d.split(',').map(Number);
      return opcoes.temMalha(a, b);
    });
  const vivos = new Map<string, ChunkVivo>();
  const porQuadro = opcoes.porQuadro ?? 1;
  let noiteAgora = 0;
  let acesoDeNoite = false;
  /** O balanço das portas (quando começou) e a piscadinha da abóbora. */
  const balanco = new Map<number, number>();
  /** T19: as portas abertas (a campainha da n1) e as lanternas que piscam (quando começou). */
  const abertas = new Map<number, number>();
  const piscadas = new Map<number, number>();
  /** O quanto a folha está aberta (radianos; para fora, para a rua). */
  const aberturaDaPorta = (i: number, t: number): number => {
    const t0 = abertas.get(i);
    if (t0 === undefined) return 0;
    const b = t - t0;
    const suave = (x: number) => {
      const c = Math.min(1, Math.max(0, x));
      return c * c * (3 - 2 * c);
    };
    const f = b < 0.35 ? suave(b / 0.35) : b < PORTA_ABERTA - 0.35 ? 1 : 1 - suave((b - (PORTA_ABERTA - 0.35)) / 0.35);
    return -ABRE * f;
  };
  /** A luz quentinha de dentro, no vão da porta aberta (o lado de dentro nunca é breu). */
  const matDentro = new StandardMaterial('baile-luz-dentro', scene);
  matDentro.disableLighting = true;
  matDentro.emissiveColor = Color3.FromHexString('#ffcf86');
  matDentro.diffuseColor = Color3.Black();
  matDentro.specularColor = Color3.Black();
  matDentro.backFaceCulling = false;
  const dentro = new Map<number, Mesh>();
  function luzesDeDentro(t: number): void {
    for (const [i, m] of dentro)
      if (!abertas.has(i)) {
        m.dispose();
        dentro.delete(i);
      }
    for (const [i, t0] of abertas) {
      if (dentro.has(i)) continue;
      const q = dadosPorta[i];
      if (!q || t - t0 < 0) continue;
      const vovo = q.tipo === 'porta-vovo';
      const m = CreatePlane(`baile-dentro-${i}`, { width: vovo ? 2.0 : 0.94, height: vovo ? 2.6 : 1.96 }, scene);
      const a = ((q.dir & 3) * Math.PI) / 2;
      // um tico para dentro da parede (atrás da folha fechada), de frente para a rua
      const fundo = vovo ? -0.1 : -0.22;
      m.position.set(q.x + fundo * Math.sin(a), q.y + (vovo ? 1.32 : 1.0), q.z + fundo * Math.cos(a));
      m.rotation.y = a;
      m.material = matDentro;
      m.isPickable = false;
      dentro.set(i, m);
    }
  }
  let piscouEm = -1e9;
  let relogio = 0;

  const novoDesenho = (ox: number, oz: number): DesenhoBaile => ({
    corpo: new Pecas(),
    luz: new Pecas(),
    noite: new Pecas(),
    dia: new Pecas(),
    vidro: new Pecas(),
    quadros: [],
    ox,
    oz,
    chao: plano.h + 1,
    recorte: { x0: ox, z0: oz, x1: ox + 16, z1: oz + 16 },
  });

  function montar(cx: number, cz: number, lista: readonly PecaBaile[]): ChunkVivo {
    const ox = cx * 16;
    const oz = cz * 16;
    const d = novoDesenho(ox, oz);
    const vivo: ChunkVivo = { cx, cz, malhas: [], dia: [], noite: [], portas: [], abobora: [], lanternas: [] };
    const fazer = (pecas: Pecas, nome: string, mat: StandardMaterial, x = ox, z = oz) => {
      if (!pecas.partes.length) return null;
      const m = new Mesh(nome, scene);
      const vd = pecas.juntar();
      if (mat === matLuz) paleta.aplicar(vd);
      vd.applyToMesh(m);
      m.material = mat;
      m.position.set(x, 0, z);
      m.isPickable = false;
      m.hasVertexAlpha = false;
      vivo.malhas.push(m);
      return m;
    };
    for (const p of lista) {
      // a porta, a abóbora gigante e as lanternas do bosque vão em malhas à parte (a porta abre
      // e balança, a abóbora pisca, a lanterna acende no toque); o meio delas na origem da malha,
      // para girar em volta do próprio eixo
      const lanterna = p.tipo === 'lanterna-bosque';
      const sozinha = PORTAS.has(p.tipo) || p.tipo === 'abobora-gigante' || lanterna;
      if (!sozinha) {
        desenharPecaBaile(p, d);
        continue;
      }
      const s = novoDesenho(p.x, p.z);
      // (o batente da porta fica parado quando a folha abre)
      if (PORTAS.has(p.tipo)) s.fixo = new Pecas();
      // (desenhada na origem da peça: a malha fica em p.x, p.z)
      desenharPecaBaile({ ...p }, { ...s, ox: p.x, oz: p.z });
      const nome = `baile-${p.tipo}-${cx},${cz}`;
      const mc = fazer(s.corpo, nome, matCorpo, p.x, p.z);
      const ml = fazer(s.luz, `${nome}-luz`, matLuz, p.x, p.z);
      const md = fazer(s.dia, `${nome}-dia`, matCorpo, p.x, p.z);
      const mn = fazer(s.noite, `${nome}-noite`, matLuz, p.x, p.z);
      const mf = s.fixo ? fazer(s.fixo, `${nome}-batente`, matCorpo, p.x, p.z) : null;
      for (const m of [mc, md, mf]) if (m) opcoes.tapaOGlow?.(m);
      for (const m of [ml, mn]) if (m) opcoes.brilha?.(m);
      if (mc) mc.receiveShadows = true;
      if (md) vivo.dia.push(md);
      if (lanterna) {
        // T19: o vidro aceso da lanterna é da missão (acende no toque, de dia e de noite)
        if (mn) {
          // (a piscadinha cresce em volta do vidro, não do pé do poste)
          mn.setPivotPoint(new Vector3(0, 2.55, 0));
          vivo.lanternas.push({ i: p.n ?? 0, luz: mn });
        }
        continue;
      }
      if (mn) vivo.noite.push(mn);
      if (PORTAS.has(p.tipo)) {
        const i = indicePorta.get(p) ?? -1;
        // a dobradiça na beira da folha (a folha gira em volta dela quando abre)
        const meia = p.tipo === 'porta-vovo' ? 1.0 : 0.47;
        const a = ((p.dir & 3) * Math.PI) / 2;
        const piv = new Vector3(-meia * Math.cos(a), 0, meia * Math.sin(a));
        for (const m of [mc, ml])
          if (m) {
            m.setPivotPoint(piv);
            vivo.portas.push({ i, malha: m });
          }
      } else vivo.abobora.push(...[mc, md, mn, ml].filter((m): m is Mesh => !!m));
    }
    const mc = fazer(d.corpo, `baile-pecas-${cx},${cz}`, matCorpo);
    if (mc) {
      mc.receiveShadows = true;
      opcoes.tapaOGlow?.(mc);
    }
    const ml = fazer(d.luz, `baile-luzes-${cx},${cz}`, matLuz);
    if (ml) opcoes.brilha?.(ml);
    const md = fazer(d.dia, `baile-dia-${cx},${cz}`, matCorpo);
    if (md) {
      opcoes.tapaOGlow?.(md);
      vivo.dia.push(md);
    }
    const mn = fazer(d.noite, `baile-noite-${cx},${cz}`, matLuz);
    if (mn) {
      opcoes.brilha?.(mn);
      vivo.noite.push(mn);
    }
    for (const m of vivo.dia) m.setEnabled(!acesoDeNoite);
    for (const m of vivo.noite) m.setEnabled(acesoDeNoite);
    for (const m of vivo.malhas)
      if (!vivo.portas.some((q) => q.malha === m) && !vivo.abobora.includes(m) && !vivo.lanternas.some((q) => q.luz === m))
        m.freezeWorldMatrix();
    return vivo;
  }

  function soltar(v: ChunkVivo): void {
    for (const m of v.malhas) m.dispose();
  }

  const sosias = criarSosiasBaile(scene, plano, opcoes);
  // T19: os momentos das missões nesta tela (a plantinha, a Lulu, o docinho, a travessura...)
  const missoes = opcoes.missoes
    ? criarMissoesNaTela({
        ...opcoes.missoes,
        scene,
        plano,
        mat: matCorpo,
        luz: paleta,
        temMalha: opcoes.temMalha,
        tapaOGlow: opcoes.tapaOGlow,
        brilha: opcoes.brilha,
      })
    : null;
  // T12: o Tufinho e a corujinha (no plástico das peças, com a cor nos vértices); T19: o
  // Tufinho sai do banquinho na n5
  const bichos = criarBichosBaile(
    scene,
    plano,
    matCorpo,
    opcoes.temMalha,
    (m) => opcoes.tapaOGlow?.(m),
    missoes ? (t, dt) => missoes.tufinho(t, dt) : undefined,
  );
  let semChao = 0;
  let ultimoT = -1;
  let luzAtual = 1;

  return {
    sosias,
    bichos,
    missoes,
    quadro(t, x, z, noite, alto = 0) {
      const passo = ultimoT < 0 ? 0 : Math.min(0.1, Math.max(0, t - ultimoT));
      ultimoT = t;
      missoes?.quadro(t, passo);
      relogio = t;
      noiteAgora = noite;
      for (const [k, v] of vivos)
        if (!comChao(k, v.cx, v.cz)) {
          soltar(v);
          vivos.delete(k);
        }
      const faltam: [number, string, number, number][] = [];
      for (const k of porChunk.keys()) {
        if (vivos.has(k)) continue;
        const [cx, cz] = k.split(',').map(Number);
        if (!comChao(k, cx, cz)) continue;
        faltam.push([Math.hypot(cx * 16 + 8 - x, cz * 16 + 8 - z), k, cx, cz]);
      }
      faltam.sort((a, b) => a[0] - b[0]);
      for (const [, k, cx, cz] of faltam.slice(0, porQuadro)) vivos.set(k, montar(cx, cz, porChunk.get(k)!));
      sosias.quadro(t, x, z, noiteAgora, alto);
      bichos.quadro(t);
      // de noite o plástico escurece um pouco com o chão (nunca escuro: a noite é mansa aqui)
      const luzPecas = 1 - 0.38 * noite;
      if (Math.abs(luzPecas - luzAtual) > 0.01) {
        luzAtual = luzPecas;
        pl.definirLuz(luzPecas);
      }
      // o rosto da abóbora e as janelinhas acendem ao escurecer (com folga: sem pisca)
      const acender = acesoDeNoite ? noite > 0.3 : noite > 0.42;
      if (acender !== acesoDeNoite) {
        acesoDeNoite = acender;
        for (const v of vivos.values()) {
          for (const m of v.dia) m.setEnabled(!acender);
          for (const m of v.noite) m.setEnabled(acender);
        }
      }
      // a piscadinha da abóbora: o rosto achata e volta (0,35 s), depois o risinho (sobe e desce)
      const dt = t - piscouEm;
      const pisca = dt >= 0 && dt < 0.35 ? Math.sin((dt / 0.35) * Math.PI) : 0;
      const ri = dt >= 0.2 && dt < 1.4 ? Math.sin(((dt - 0.2) / 1.2) * Math.PI * 3) * (1 - (dt - 0.2) / 1.2) : 0;
      for (const v of vivos.values()) {
        for (const m of v.abobora) {
          m.scaling.set(1 + 0.04 * ri, 1 - 0.06 * pisca + 0.05 * Math.abs(ri), 1 + 0.04 * ri);
          m.rotation.z = 0.03 * ri;
        }
        for (const q of v.portas) {
          const t0 = balanco.get(q.i);
          const b = t0 === undefined ? 0 : t - t0;
          const ang = b >= 0 && b < 0.9 ? Math.sin(b * 22) * 0.12 * (1 - b / 0.9) : 0;
          q.malha.rotation.y = ang + aberturaDaPorta(q.i, t);
        }
        // T19: a lanterna acesa (do mundo, ou a previsão do toque) e a piscadinha dela
        for (const q of v.lanternas) {
          const acesa = opcoes.lanternaAcesa?.(q.i) ?? false;
          if (q.luz.isEnabled() !== acesa) q.luz.setEnabled(acesa);
          const t0 = piscadas.get(q.i);
          const b = t0 === undefined ? 1 : (t - t0) / 0.9;
          const k = b >= 0 && b < 1 ? 1 + 0.22 * Math.sin(b * Math.PI * 3) * (1 - b) : 1;
          q.luz.scaling.set(k, k, k);
        }
      }
      for (const [i, t0] of balanco) if (t - t0 > 1) balanco.delete(i);
      for (const [i, t0] of piscadas) if (t - t0 > 1) piscadas.delete(i);
      for (const [i, t0] of abertas) if (t - t0 > PORTA_ABERTA) abertas.delete(i);
      luzesDeDentro(t);
      semChao = 0;
      for (const [k, v] of vivos)
        if (!comChao(k, v.cx, v.cz)) semChao += v.malhas.filter((m) => m.isEnabled()).length;
    },
    semChao: () => semChao,
    contagem() {
      let malhas = 0;
      let triangulos = 0;
      for (const v of vivos.values())
        for (const m of v.malhas) {
          if (!m.isEnabled()) continue;
          malhas++;
          triangulos += (m.getTotalIndices() / 3) | 0;
        }
      return { chunks: vivos.size, malhas, triangulos, sosias: sosias.visiveis() };
    },
    portas: () => listaPortas,
    tocar(q) {
      if (q.a === 'abobora') piscouEm = relogio;
      else balanco.set(q.i, relogio);
    },
    abrirPorta(i) {
      // (já aberta: fica aberta mais um pouco, sem fechar e abrir de novo)
      const t0 = abertas.get(i);
      if (t0 !== undefined && relogio - t0 < PORTA_ABERTA - 0.35) abertas.set(i, Math.min(t0 + 0.5, relogio - 0.35));
      else abertas.set(i, relogio);
    },
    piscarLanterna(i) {
      piscadas.set(i, relogio);
    },
    portaDaRua: (x, z) => listaPortas.findIndex((q) => Math.hypot(q.x - x, q.z - z) < 1.6),
    estadoPortas: () => ({ abertas: [...abertas.keys()], dentro: dentro.size, piscando: [...piscadas.keys()] }),
    animando: () => ({
      abobora: relogio - piscouEm < 1.4 ? 1 : 0,
      portas: [...balanco.keys()],
    }),
    descartar() {
      for (const v of vivos.values()) soltar(v);
      vivos.clear();
      sosias.descartar();
      bichos.descartar();
      missoes?.descartar();
      for (const m of dentro.values()) m.dispose();
      matDentro.dispose();
      paleta.descartar();
      pl.descartar();
    },
  };
}
