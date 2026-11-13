/**
 * O trânsito da Cidade Grande no núcleo (spec 014, T13): cada veículo da frota anda pela
 * volta dele em uma dimensão (`s`), num plano de aceleração constante (`PlanoVeiculo`). A cada
 * passo ele olha o caminho à frente e decide se segue, freia ou para:
 *
 * - **gente na frente** (criança, morador ou bicho a até 5 blocos, o cruzamento inteiro na
 *   curva): freia devagar e para a 1,5 bloco, sem tocar. Alguém encostado nele ou em cima
 *   dele: não anda. Esperando uma criança, dá um "fom-fom" (o primeiro depois de 1,5 s, no
 *   máximo um a cada 8 s e três por espera);
 * - **veículo na frente:** fila, 2 blocos de distância;
 * - **cruzamento:** é de um veículo por vez. Só entra com ele livre, com lugar do outro lado
 *   e com as faixas de pedestre que vai cruzar vazias (assim nunca para no meio, nunca dá nó
 *   e nunca passa por cima de ninguém na zebra);
 * - **curvas:** reduz antes (1,1 bloco/s na curva à direita, 1,8 na da esquerda);
 * - **paradas:** o ônibus para 6 s em cada ponto (o da obra 3 só com a obra feita); o
 *   sorvete fica 150 s na vaga da beira do parque e dá a volta do quarteirão;
 * - **encalhado** (60 s parado sem criança perto): some num sopro e volta no começo de uma
 *   faixa da volta dele, longe de todas as crianças.
 *
 * Nada tira um veículo do caminho: ele só para e espera. Os planos mudam poucas vezes por
 * volta; o núcleo manda só os que mudaram (`mudados`), e o cliente faz a mesma conta.
 */
import type { TipoSer } from './criaturas';
import type { PlanoCidade } from '../world/cidade';
import { soloDaCidade, soloDePista } from '../world/cidade';
import {
  ACELERACAO,
  arred,
  FREADA,
  FROTA,
  MEDIDAS,
  MODELO_DO_TIPO,
  naVolta,
  noPlano,
  poseDoVeiculo,
  poseNaRota,
  rotaDoVeiculo,
  trechoEm,
  VEL_RETA,
  type DefVeiculo,
  type EstadoVeiculo,
  type MedidasVeiculo,
  type PlanoVeiculo,
  type Pose,
  type Rota,
  type Trecho,
} from './veiculos';

/** Alguém que anda pela cidade (os veículos param para todos). */
export interface PessoaNaRua {
  x: number;
  /** Altura dos pés. */
  y: number;
  z: number;
  /** Criança (jogador): conta para a buzina, o encalhe e o "uí-uí". */
  crianca: boolean;
  /**
   * O corpo no chão de um bicho comprido (o cachorro grande tem quase 2 blocos do focinho ao
   * rabo): meia frente, meio lado e para onde aponta (yaw do jogo: a frente é (sen, cos)).
   * Sem o campo, um boneco (raio 0,3).
   */
  corpo?: CorpoNaRua;
}

export interface CorpoNaRua {
  frente: number;
  lado: number;
  yaw: number;
}

/**
 * Meia frente e meio lado do desenho de cada bicho da cidade (do focinho ao rabo e de orelha a
 * orelha, um pouco de folga): a caixa de colisão do jogo base é bem menor que o desenho, e é o
 * desenho que a criança vê encostar no carro. Conferido com os desenhos no teste.
 */
export const CORPO_NA_RUA: Record<TipoSer, [number, number]> = {
  cervo: [1.12, 0.44],
  coelho: [0.4, 0.26],
  peixe: [0.4, 0.2],
  espectro: [0.8, 0.32],
  raposa: [0.55, 0.24],
  morador: [0.3, 0.3],
};

export function corpoNaRua(tipo: TipoSer, yaw: number): CorpoNaRua | undefined {
  if (tipo === 'morador') return undefined;
  const [frente, lado] = CORPO_NA_RUA[tipo];
  return { frente, lado, yaw };
}

/**
 * Até onde o corpo de quem anda vai na direção (dx, dz) (unitária) a partir do centro dele:
 * o boneco é um círculo; o bicho, o retângulo do desenho girado.
 */
export function alcanceDoCorpo(p: PessoaNaRua, dx: number, dz: number): number {
  const c = p.corpo;
  if (!c) return RAIO_PESSOA;
  const fx = Math.sin(c.yaw);
  const fz = Math.cos(c.yaw);
  return Math.abs(dx * fx + dz * fz) * c.frente + Math.abs(dx * fz - dz * fx) * c.lado;
}

export type OcorrenciaVeiculo =
  | 'buzina'
  | 'ponto'
  | 'saiu'
  | 'chegou'
  | 'sopro'
  | 'uiui'
  /** 014c: a sirene macia da ambulância e dos bombeiros (rara, com criança perto). */
  | 'sirene';

export interface EventoVeiculo {
  id: number;
  o: OcorrenciaVeiculo;
  /** Onde aconteceu (o sopro: de onde sumiu). */
  x: number;
  z: number;
}

export interface OpcoesTransito {
  plano: PlanoCidade;
  /** Segundos de mundo já vividos (dia e hora): onde cada veículo começa. */
  relogioMundo: number;
  /** A obra do canteiro n está feita? (o ponto de ônibus da obra 3) */
  obraFeita?: (n: number) => boolean;
  /** Só parte da frota (testes). */
  frota?: readonly DefVeiculo[];
}

/** Até onde olha gente na frente (a partir do para-choque) e quanto para antes dela. */
export const OLHAR_GENTE = 5;
export const DISTANCIA_GENTE = 1.5;
/** Até onde olha outro veículo e a distância da fila. */
export const OLHAR_VEICULO = 10;
export const DISTANCIA_FILA = 2;
/** Raio do corpo de quem anda (o boneco tem meia largura 0,3) e a folga do olhar. */
const RAIO_PESSOA = 0.3;
const FOLGA_OLHAR = 0.2;
/** Quanto antes da zebra o veículo para esperando o cruzamento (era 0,25). */
export const RECUO_LINHA = 1.4;
/** Tempo parado no ponto, na vaga e até sumir encalhado. */
export const TEMPO_PONTO = 6;
export const TEMPO_VAGA = 150;
export const TEMPO_ENCALHE = 60;
/** Buzina: a primeira depois de tanto esperando, o intervalo e quantas por espera. */
const BUZINA_ESPERA = 1.5;
export const BUZINA_INTERVALO = 8;
const BUZINAS_POR_ESPERA = 3;
/** "Uí-uí" da polícia na frente da praça: no máximo um a cada tanto. */
export const UIUI_INTERVALO = 150;
/** Criança a até tanto do veículo: ele não some encalhado (pode estar brincando na frente). */
const PERTO_CRIANCA = 20;

interface Veic {
  def: DefVeiculo;
  m: MedidasVeiculo;
  r: Rota;
  plano: PlanoVeiculo;
  /** Parado num ponto ou na vaga até `ate` (o índice da parada e em que volta). */
  parada: { i: number; volta: number; ate: number; k: EstadoVeiculo } | null;
  /** Paradas já feitas (`volta:i`). */
  feitas: Set<string>;
  /** Cruzamento reservado e onde solta (s do centro). */
  reserva: number | null;
  solta: number;
  /** Parado desde (relógio) e se é esperando criança. */
  paradoDesde: number;
  esperandoCrianca: boolean;
  esperaDesde: number;
  buzinaEm: number;
  buzinas: number;
  /** Encalhe: segundos parado sem criança perto. */
  encalhe: number;
  uiuiEm: number;
  pose: Pose;
  /** Por que parou ou freou por último (depuração e testes). */
  motivo: string;
}

/** Ponto até o retângulo (centro, frente unitária, meias medidas): distância; 0 dentro. */
function distRet(
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  mf: number,
  ml: number,
  x: number,
  z: number,
): number {
  const dx = x - cx;
  const dz = z - cz;
  const f = dx * hx + dz * hz;
  const l = -dx * hz + dz * hx;
  return Math.hypot(Math.max(Math.abs(f) - mf, 0), Math.max(Math.abs(l) - ml, 0));
}
const cantosTmp: number[] = new Array(16).fill(0);
/** Os 4 cantos de um retângulo em `out` a partir de `k` (x, z, x, z...). */
function cantos(
  out: number[],
  k: number,
  cx: number,
  cz: number,
  hx: number,
  hz: number,
  mf: number,
  ml: number,
): void {
  let i = k;
  for (const a of [-1, 1])
    for (const b of [-1, 1]) {
      out[i++] = cx + hx * mf * a - hz * ml * b;
      out[i++] = cz + hz * mf * a + hx * ml * b;
    }
}

/**
 * Quanto falta do corpo de quem anda até o retângulo do veículo (no chão, a distância de
 * verdade entre os dois): negativo, encostado ou dentro (quanto mais dentro, mais negativo).
 */
export function folgaAoVeiculo(pose: Pose, m: MedidasVeiculo, p: PessoaNaRua): number {
  const c = p.corpo;
  if (!c)
    return (
      distRet(pose.x, pose.z, pose.hx, pose.hz, m.meioComp, m.meiaLarg, p.x, p.z) - RAIO_PESSOA
    );
  const fx = Math.sin(c.yaw);
  const fz = Math.cos(c.yaw);
  const C = cantosTmp;
  cantos(C, 0, pose.x, pose.z, pose.hx, pose.hz, m.meioComp, m.meiaLarg);
  cantos(C, 8, p.x, p.z, fx, fz, c.frente, c.lado);
  // separados por algum eixo (os lados dos dois)? então a distância é de canto a retângulo
  let sobra = Infinity;
  for (const [ax, az] of [
    [pose.hx, pose.hz],
    [-pose.hz, pose.hx],
    [fx, fz],
    [-fz, fx],
  ]) {
    let a0 = Infinity;
    let a1 = -Infinity;
    let b0 = Infinity;
    let b1 = -Infinity;
    for (let i = 0; i < 8; i += 2) {
      const pa = C[i] * ax + C[i + 1] * az;
      const pb = C[i + 8] * ax + C[i + 9] * az;
      a0 = Math.min(a0, pa);
      a1 = Math.max(a1, pa);
      b0 = Math.min(b0, pb);
      b1 = Math.max(b1, pb);
    }
    const sep = Math.max(b0 - a1, a0 - b1);
    if (sep > 0) {
      let d = Infinity;
      for (let i = 0; i < 8; i += 2) {
        d = Math.min(
          d,
          distRet(pose.x, pose.z, pose.hx, pose.hz, m.meioComp, m.meiaLarg, C[i + 8], C[i + 9]),
          distRet(p.x, p.z, fx, fz, c.frente, c.lado, C[i], C[i + 1]),
        );
      }
      return d;
    }
    // sobreposto neste eixo: quanto (o menor de todos é o quanto está dentro)
    sobra = Math.min(sobra, -sep);
  }
  return -sobra;
}

/** Ponto até o retângulo do veículo (distância no chão; 0 dentro). */
function distanciaAoVeiculo(p: Pose, m: MedidasVeiculo, x: number, z: number): number {
  const dx = x - p.x;
  const dz = z - p.z;
  const f = dx * p.hx + dz * p.hz;
  const l = -dx * p.hz + dz * p.hx;
  return Math.hypot(Math.max(Math.abs(f) - m.meioComp, 0), Math.max(Math.abs(l) - m.meiaLarg, 0));
}

export type Transito = ReturnType<typeof criarTransito>;

export function criarTransito(op: OpcoesTransito) {
  const plano = op.plano;
  const chao = plano.h + 1;
  const obraFeita = op.obraFeita ?? (() => false);
  const frota = op.frota ?? FROTA;
  let T = 0;
  let mudados: PlanoVeiculo[] = [];
  let eventos: EventoVeiculo[] = [];
  /** Cruzamento → quem reservou. */
  const reservas = new Map<number, number>();
  const tmpPose: Pose = { x: 0, z: 0, hx: 0, hz: 0, yaw: 0 };
  const tmpPose2: Pose = { x: 0, z: 0, hx: 0, hz: 0, yaw: 0 };

  const veics: Veic[] = frota.map((def) => {
    const m = MEDIDAS[MODELO_DO_TIPO[def.tipo]];
    const r = rotaDoVeiculo(plano, def);
    return {
      def,
      m,
      r,
      plano: { id: def.id, t0: 0, s0: 0, v0: 0, a: 0, vf: 0 },
      parada: null,
      feitas: new Set(),
      reserva: null,
      solta: 0,
      paradoDesde: 0,
      esperandoCrianca: false,
      esperaDesde: -1,
      buzinaEm: -Infinity,
      buzinas: 0,
      encalhe: 0,
      uiuiEm: -Infinity,
      pose: { x: 0, z: 0, hx: 0, hz: 0, yaw: 0 },
      motivo: '',
    };
  });

  // ------------------------------------------------------------------ onde começa
  /** Começo de uma faixa (reta) da volta, com o carro todo dentro dela. */
  function comecoDeFaixa(v: Veic, t: Trecho): number {
    return t.s0 + v.m.meioComp + 1;
  }
  function retasDaVolta(v: Veic): Trecho[] {
    return v.r.trechos.filter((t) => t.tipo === 'reta' && t.pista !== undefined && t.comp > 8);
  }
  function colocarPeloRelogio(): void {
    const rel = Math.max(0, op.relogioMundo);
    const ocupados: { v: Veic; s: number }[] = [];
    for (const v of veics) {
      const retas = retasDaVolta(v);
      let s: number;
      if (v.def.tipo === 'sorvete') {
        // o sorvete começa parado na vaga, com o resto da espera pelo relógio
        const p = v.r.paradas.find((q) => q.vaga)!;
        s = p.s;
        v.parada = {
          i: v.r.paradas.indexOf(p),
          volta: 0,
          ate: TEMPO_VAGA - (rel % TEMPO_VAGA),
          k: 'vaga',
        };
        v.plano = { id: v.def.id, t0: 0, s0: arred(s), v0: 0, a: 0, vf: 0, k: 'vaga' };
        ocupados.push({ v, s });
        continue;
      }
      // a fase da frota mais o relógio (devagar, como quem anda e espera), no meio de uma reta
      const bruto = naVolta(v.r, v.def.fase * v.r.comp + rel * VEL_RETA * 0.6);
      let k = retas.findIndex((t) => t.s0 + t.comp > bruto);
      if (k < 0) k = 0;
      // sem encostar em ninguém: anda de reta em reta até achar lugar
      for (let tent = 0; tent < retas.length * 3; tent++) {
        const t = retas[(k + Math.floor(tent / 3)) % retas.length];
        const frac = [0.5, 0.25, 0.75][tent % 3];
        s = t.s0 + v.m.meioComp + 1 + (t.comp - 2 * v.m.meioComp - 2) * frac;
        const pose = poseDoVeiculo(v.r, v.m, s, tmpPose);
        const livre = ocupados.every((o) => {
          const po = poseDoVeiculo(o.v.r, o.v.m, o.s);
          return Math.hypot(po.x - pose.x, po.z - pose.z) > o.v.m.meioComp + v.m.meioComp + 3;
        });
        if (livre) break;
      }
      v.plano = { id: v.def.id, t0: 0, s0: arred(s!), v0: 0, a: 0, vf: 0 };
      ocupados.push({ v, s: s! });
    }
  }
  colocarPeloRelogio();
  for (const v of veics) poseDoVeiculo(v.r, v.m, noPlano(v.plano, 0).s, v.pose);

  // ------------------------------------------------------------------ o passo
  function novoPlano(
    v: Veic,
    s: number,
    vel: number,
    a: number,
    vf: number,
    k?: EstadoVeiculo,
  ): void {
    const p: PlanoVeiculo = {
      id: v.def.id,
      t0: arred(T),
      s0: arred(s),
      v0: arred(Math.max(0, vel)),
      a: arred(a, 4),
      vf: arred(Math.max(0, vf)),
    };
    if (k) p.k = k;
    v.plano = p;
    mudados = mudados.filter((q) => q.id !== p.id);
    mudados.push(p);
  }

  /** Os cruzamentos ainda à frente: o próximo trecho que atravessa uma caixa. */
  function proximoCruzamento(
    v: Veic,
    s: number,
  ): { t: Trecho; s0: number; zebraIn: number; zebraOut: number; retaIni: number } | null {
    const base = Math.floor(s / v.r.comp) * v.r.comp;
    const u = s - base;
    const ts = v.r.trechos;
    let i = ts.indexOf(trechoEm(v.r, u));
    for (let n = 0; n < ts.length; n++, i++) {
      const t = ts[i % ts.length];
      const volta = base + (i >= ts.length ? v.r.comp : 0);
      if (t.cruzamento === undefined) continue;
      const s0 = volta + t.s0;
      if (s0 + t.comp < s - v.m.meioComp) continue;
      const antes = ts[(i - 1 + ts.length) % ts.length];
      const depois = ts[(i + 1) % ts.length];
      return {
        t,
        s0,
        zebraIn: antes.zebra ?? 0,
        zebraOut: depois.zebra ?? 0,
        retaIni: s0 - antes.comp,
      };
    }
    return null;
  }

  /**
   * Retângulo (mundo, contínuo) de uma faixa de pedestre: a rua toda de largura (4 de asfalto,
   * a faixa de quem anda do lado direito) e de `ini` a `fim` blocos na direção (hx, hz) a
   * partir do ponto (x, z) do meio da faixa na borda da caixa.
   */
  function faixaDePedestre(
    x: number,
    z: number,
    hx: number,
    hz: number,
    ini: number,
    fim: number,
  ): [number, number, number, number] {
    const rx = hz;
    const rz = -hx;
    const xs = [x + hx * ini + rx * -3, x + hx * fim + rx * 1];
    const zs = [z + hz * ini + rz * -3, z + hz * fim + rz * 1];
    return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)];
  }

  /** O corpo de quem anda (alcance fx em x e fz em z) toca o retângulo? */
  const dentro = (
    r: [number, number, number, number],
    x: number,
    z: number,
    fx: number,
    fz: number,
  ) => x >= r[0] - fx && x <= r[2] + fx && z >= r[1] - fz && z <= r[3] + fz;

  function passo(dt: number, pessoas: readonly PessoaNaRua[]): void {
    T += dt;
    const estados = veics.map((v) => noPlano(v.plano, T));
    for (let i = 0; i < veics.length; i++)
      poseDoVeiculo(veics[i].r, veics[i].m, estados[i].s, veics[i].pose);
    for (let i = 0; i < veics.length; i++)
      cuidar(veics[i], estados[i].s, estados[i].v, pessoas, dt);
  }

  function cuidar(
    v: Veic,
    s: number,
    vel: number,
    pessoas: readonly PessoaNaRua[],
    dt: number,
  ): void {
    const { m, r } = v;
    const hl = m.meioComp;
    const pose = v.pose;
    const perto = pessoas.filter((p) => Math.abs(p.x - pose.x) < 16 && Math.abs(p.z - pose.z) < 16);
    const criancaPerto = pessoas.some(
      (p) => p.crianca && Math.hypot(p.x - pose.x, p.z - pose.z) < PERTO_CRIANCA,
    );

    // solta o cruzamento quando a traseira passou da zebra do outro lado
    if (v.reserva !== null && s >= v.solta) {
      if (reservas.get(v.reserva) === v.def.id) reservas.delete(v.reserva);
      v.reserva = null;
    }

    // parado num ponto ou na vaga: espera o tempo dele
    if (v.parada) {
      if (T < v.parada.ate) {
        v.encalhe = 0;
        return;
      }
      v.feitas.add(`${v.parada.volta}:${v.parada.i}`);
      v.parada = null;
      if (v.def.tipo !== 'sorvete') eventos.push({ id: v.def.id, o: 'saiu', x: pose.x, z: pose.z });
    }

    // alguém encostado ou em cima: não anda
    let segura = false;
    let seguraCrianca = false;
    for (const p of perto) {
      const d = distanciaAoVeiculo(pose, m, p.x, p.z);
      // em cima: no teto ou pulando nele (quem voa bem mais alto não segura o veículo)
      const emCima = p.y > chao + 0.6;
      if (emCima && p.y > chao + m.altura + 1.5) continue;
      if (emCima ? d <= 0 : p.y < chao + 2.2 && folgaAoVeiculo(pose, m, p) < 0.05) {
        segura = true;
        if (p.crianca) seguraCrianca = true;
      }
    }

    // ---- o que tem à frente
    let pare = Infinity; // onde o centro tem que parar (s)
    let porGente = false;
    let porCrianca = false;
    const limites: [number, number][] = []; // [s, v]
    // trechos à frente: velocidade da curva (a roda da frente entra nela)
    let vAqui = VEL_RETA;
    {
      const base = Math.floor(s / r.comp) * r.comp;
      const ts = r.trechos;
      let i = ts.indexOf(trechoEm(r, s - base));
      for (let n = 0; n < ts.length + 1; n++, i++) {
        const t = ts[i % ts.length];
        const s0 = base + t.s0 + (i >= ts.length ? r.comp : 0);
        if (s0 > s + hl + 12) break;
        const s1 = s0 + t.comp;
        if (t.vmax >= VEL_RETA) continue;
        // a carroceria toca o trecho: vale já
        if (s0 <= s + hl && s1 >= s - hl) vAqui = Math.min(vAqui, t.vmax);
        else if (s0 > s) limites.push([s0 - hl, t.vmax]);
      }
    }
    // gente e veículos no caminho
    const frente = s + hl;
    /** Onde para por causa de outro veículo (a fila). */
    let pareFila = Infinity;
    const cruz = proximoCruzamento(v, s);
    let olharGente = OLHAR_GENTE;
    if (cruz && cruz.s0 - frente < OLHAR_GENTE)
      olharGente = Math.max(olharGente, cruz.s0 + cruz.t.comp + cruz.zebraOut - frente + 0.5);
    for (let u = frente; u <= frente + OLHAR_VEICULO; u += 0.35) {
      const pt = poseNaRota(r, u, tmpPose);
      if (u - frente <= olharGente && !porGente)
        for (const p of perto) {
          if (p.y > chao + 0.6 && distanciaAoVeiculo(pose, m, p.x, p.z) <= 0) continue;
          if (p.y > chao + 2.2) continue;
          let pg: number | null = null;
          if (p.corpo) {
            // o bicho: o retângulo do desenho contra a faixa que o veículo varre (no rumo do
            // caminho aqui); para a 1,5 bloco do corpo dele, não do centro
            const dx = p.x - pt.x;
            const dz = p.z - pt.z;
            const f = dx * pt.hx + dz * pt.hz;
            const l = -dx * pt.hz + dz * pt.hx;
            const ef = alcanceDoCorpo(p, pt.hx, pt.hz);
            const el = alcanceDoCorpo(p, -pt.hz, pt.hx);
            if (Math.abs(f) <= ef + 0.2 && Math.abs(l) < m.meiaLarg + el + FOLGA_OLHAR)
              pg = u + f - ef - hl - DISTANCIA_GENTE;
          } else if (Math.hypot(p.x - pt.x, p.z - pt.z) < m.meiaLarg + RAIO_PESSOA + FOLGA_OLHAR) {
            // onde ela está ao longo do caminho (o ponto do caminho mais perto dela)
            let uMin = u;
            let dMin = Infinity;
            for (let w = u; w <= u + m.meiaLarg + 1.2; w += 0.05) {
              const q = poseNaRota(r, w, tmpPose2);
              const dq = Math.hypot(p.x - q.x, p.z - q.z);
              if (dq < dMin) {
                dMin = dq;
                uMin = w;
              }
            }
            pg = uMin - hl - DISTANCIA_GENTE - RAIO_PESSOA;
          }
          if (pg !== null) {
            if (pg < pare) {
              pare = pg;
              v.motivo = p.crianca ? 'crianca' : 'gente';
            }
            porGente = true;
            if (p.crianca) porCrianca = true;
            break;
          }
        }
      if (pare <= u - hl - DISTANCIA_FILA) break;
      for (const o of veics) {
        if (o === v) continue;
        if (Math.abs(o.pose.x - pt.x) > 6 || Math.abs(o.pose.z - pt.z) > 6) continue;
        if (distanciaAoVeiculo(o.pose, o.m, pt.x, pt.z) < m.meiaLarg + FOLGA_OLHAR) {
          const pv = u - hl - DISTANCIA_FILA;
          pareFila = Math.min(pareFila, pv);
          if (pv < pare) {
            pare = pv;
            v.motivo = `veiculo ${o.def.id}`;
          }
          break;
        }
      }
    }
    // o cruzamento: reserva, ou para antes da zebra
    if (cruz && v.reserva !== cruz.t.cruzamento) {
      // espera um pouco antes da zebra: o carro maior (014, ajustes) que vira à direita na
      // frente dele abre a ponta por cima da faixa de lá
      // (sem passar para trás do começo da faixa: o carro saindo de uma curva não fica parado
      // no meio dela, segurando o cruzamento de trás)
      const linha = Math.min(
        cruz.s0 - cruz.zebraIn - hl - 0.25,
        Math.max(cruz.s0 - cruz.zebraIn - hl - RECUO_LINHA, cruz.retaIni + hl + 0.3),
      );
      if (linha - s < 9) {
        const id = cruz.t.cruzamento!;
        const dono = reservas.get(id);
        // nunca na frente de quem já está na fila do mesmo cruzamento: com outro veículo
        // entre ele e a faixa de parar, espera (senão o de trás reserva e o da frente trava)
        let pode = dono === undefined && pareFila >= linha - 0.05;
        if (pode) {
          // lugar do outro lado: ninguém (veículo) entre a saída e um carro e meio depois dela
          const s1 = cruz.s0 + cruz.t.comp;
          for (let u = s1; u <= s1 + cruz.zebraOut + 2 * hl + DISTANCIA_FILA && pode; u += 0.35) {
            const pt = poseNaRota(r, u, tmpPose);
            for (const o of veics)
              if (
                o !== v &&
                distanciaAoVeiculo(o.pose, o.m, pt.x, pt.z) < m.meiaLarg + FOLGA_OLHAR
              ) {
                pode = false;
                break;
              }
          }
        }
        if (pode) {
          // as faixas de pedestre que cruza (a de cá e a de lá) e a caixa: sem ninguém
          const ein = poseNaRota(r, cruz.s0, tmpPose);
          const hix = Math.round(ein.hx);
          const hiz = Math.round(ein.hz);
          const zin = faixaDePedestre(ein.x, ein.z, hix, hiz, -cruz.zebraIn, 0);
          const sai = poseNaRota(r, cruz.s0 + cruz.t.comp, tmpPose);
          const zout = faixaDePedestre(
            sai.x,
            sai.z,
            Math.round(sai.hx),
            Math.round(sai.hz),
            0,
            cruz.zebraOut,
          );
          const c = plano.cruzamentos[id].caixa;
          const caixa: [number, number, number, number] = [c.x0, c.z0, c.x1 + 1, c.z1 + 1];
          for (const p of perto) {
            if (p.y > chao + 2.2) continue;
            const fx = alcanceDoCorpo(p, 1, 0);
            const fz = alcanceDoCorpo(p, 0, 1);
            if (
              dentro(zin, p.x, p.z, fx, fz) ||
              dentro(zout, p.x, p.z, fx, fz) ||
              dentro(caixa, p.x, p.z, fx, fz)
            ) {
              pode = false;
              porGente = true;
              if (p.crianca) porCrianca = true;
              break;
            }
          }
        }
        if (pode) {
          reservas.set(id, v.def.id);
          v.reserva = id;
          v.solta = cruz.s0 + cruz.t.comp + cruz.zebraOut + hl + 0.3;
        } else {
          const pc = Math.max(linha, s - 1e-3 > linha ? s : linha);
          if (pc < pare) {
            pare = pc;
            v.motivo = `cruzamento ${id} (${dono === undefined ? 'livre' : `de ${dono}`})`;
          }
        }
      }
    }
    // paradas (ônibus e sorvete)
    let paradaAqui: { i: number; volta: number; k: EstadoVeiculo; sp: number } | null = null;
    r.paradas.forEach((p, i) => {
      if (p.obra !== undefined && !obraFeita(p.obra)) return;
      const volta0 = Math.floor(s / r.comp);
      for (const volta of [volta0, volta0 + 1]) {
        const sp = volta * r.comp + p.s;
        if (v.feitas.has(`${volta}:${i}`)) continue;
        if (sp < s - 0.05) continue;
        if (sp - s > 14) continue;
        if (sp < pare) {
          pare = sp;
          v.motivo = 'parada';
          paradaAqui = { i, volta, k: p.vaga ? 'vaga' : 'ponto', sp };
        }
      }
    });

    // ---- espera de criança: buzina e não some
    const esperandoCrianca = (porCrianca || seguraCrianca) && vel < 0.05;
    if (esperandoCrianca) {
      if (v.esperaDesde < 0) {
        v.esperaDesde = T;
        v.buzinas = 0;
      }
      if (
        T - v.esperaDesde >= BUZINA_ESPERA &&
        T - v.buzinaEm >= BUZINA_INTERVALO &&
        v.buzinas < BUZINAS_POR_ESPERA
      ) {
        v.buzinaEm = T;
        v.buzinas++;
        eventos.push({ id: v.def.id, o: 'buzina', x: pose.x, z: pose.z });
      }
    } else if (vel > 0.3) v.esperaDesde = -1;

    // ---- o plano
    const k: EstadoVeiculo | undefined = esperandoCrianca ? 'espera' : undefined;
    const d = pare - s;
    if (segura || d <= 0.02) {
      // para já (ou fica parado): só manda plano novo se mudou
      if (v.plano.v0 !== 0 || v.plano.a !== 0 || vel > 0 || v.plano.k !== k)
        novoPlano(v, s, 0, 0, 0, k);
    } else {
      let vCap = vAqui;
      for (const [sl, vl] of limites)
        vCap = Math.min(vCap, Math.sqrt(vl * vl + 2 * FREADA * Math.max(0, sl - s)));
      vCap = Math.min(vCap, Math.sqrt(2 * FREADA * d));
      if (vel > vCap + 0.05) {
        // freia: a conta que chega certinho no ponto mais apertado (parar ou entrar na curva)
        let req = Number.isFinite(d) ? (vel * vel) / (2 * d) : 0;
        let alvo = 0;
        for (const [sl, vl] of limites) {
          if (vel <= vl) continue;
          const dd = sl - s;
          const q = dd > 0.01 ? (vel * vel - vl * vl) / (2 * dd) : 8;
          if (q > req) {
            req = q;
            alvo = vl;
          }
        }
        if (vel > vAqui + 0.05) {
          const q = Math.max(FREADA, (vel - vAqui) / 0.6);
          if (q > req) {
            req = q;
            alvo = vAqui;
          }
        }
        const ja = v.plano.a < 0 && v.plano.a <= -req + 0.02 && v.plano.vf <= alvo + 0.01;
        if (!ja) novoPlano(v, s, vel, -Math.max(req, 0.05), alvo, k);
      } else if (vel < vCap - 0.3 && (v.plano.a >= 0 || vel < vCap - 0.8)) {
        const alvo = Math.min(VEL_RETA, vAqui);
        if (!(v.plano.a > 0 && v.plano.vf === alvo)) novoPlano(v, s, vel, ACELERACAO, alvo);
      } else if (v.plano.k !== k && k === undefined && v.plano.k === 'espera')
        novoPlano(v, s, vel, v.plano.a, v.plano.vf);
    }

    // chegou na parada: fica
    const pa = paradaAqui as { i: number; volta: number; k: EstadoVeiculo; sp: number } | null;
    if (pa && Math.abs(pa.sp - s) < 0.03 && vel < 0.02 && !segura) {
      v.parada = {
        i: pa.i,
        volta: pa.volta,
        k: pa.k,
        ate: T + (pa.k === 'vaga' ? TEMPO_VAGA : TEMPO_PONTO),
      };
      novoPlano(v, s, 0, 0, 0, pa.k);
      eventos.push({ id: v.def.id, o: pa.k === 'vaga' ? 'chegou' : 'ponto', x: pose.x, z: pose.z });
    }

    // "uí-uí" da polícia passando na frente da praça (com criança perto, raro)
    if (v.def.tipo === 'policia' && vel > 0.5 && T - v.uiuiEm > UIUI_INTERVALO && naPraca(pose)) {
      if (pessoas.some((p) => p.crianca && Math.hypot(p.x - pose.x, p.z - pose.z) < 30)) {
        v.uiuiEm = T;
        eventos.push({ id: v.def.id, o: 'uiui', x: pose.x, z: pose.z });
      }
    }

    // 014c: a sirene macia da ambulância e dos bombeiros, rara (como o uí-uí), com criança perto
    if (
      (v.def.tipo === 'ambulancia' || v.def.tipo === 'bombeiros') &&
      vel > 0.5 &&
      T - v.uiuiEm > UIUI_INTERVALO &&
      pessoas.some((p) => p.crianca && Math.hypot(p.x - pose.x, p.z - pose.z) < 25)
    ) {
      v.uiuiEm = T;
      eventos.push({ id: v.def.id, o: 'sirene', x: pose.x, z: pose.z });
    }

    // encalhe: parado sem criança perto, fora de ponto e vaga
    const parado = noPlano(v.plano, T).v < 0.02 && v.plano.vf === 0;
    if (parado && !criancaPerto && !v.parada) v.encalhe += dt;
    else if (!parado || criancaPerto) v.encalhe = 0;
    if (v.encalhe >= TEMPO_ENCALHE) reaparecer(v, s, pessoas);
  }

  /** A praça do nascimento: a rua na frente dela (só a polícia passa por ali na mão de cá). */
  const praca = plano.lotes.find((l) => l.uso === 'praca');
  function naPraca(p: Pose): boolean {
    if (!praca) return false;
    const mx = praca.x0 + praca.largura / 2;
    return Math.abs(p.x - mx) < 3 && p.z > praca.z0 && p.z < praca.z0 + praca.profundidade + 8;
  }

  function reaparecer(v: Veic, s: number, pessoas: readonly PessoaNaRua[]): void {
    const base = Math.floor(s / v.r.comp) * v.r.comp;
    for (const t of retasDaVolta(v)) {
      let sn = base + comecoDeFaixa(v, t);
      if (sn < s) sn += v.r.comp;
      const p = poseDoVeiculo(v.r, v.m, sn);
      if (pessoas.some((q) => q.crianca && Math.hypot(q.x - p.x, q.z - p.z) < 32)) continue;
      if (
        veics.some(
          (o) =>
            o !== v && Math.hypot(o.pose.x - p.x, o.pose.z - p.z) < o.m.meioComp + v.m.meioComp + 4,
        )
      )
        continue;
      eventos.push({ id: v.def.id, o: 'sopro', x: v.pose.x, z: v.pose.z });
      if (v.reserva !== null && reservas.get(v.reserva) === v.def.id) reservas.delete(v.reserva);
      v.reserva = null;
      v.encalhe = 0;
      novoPlano(v, sn, 0, 0, 0);
      poseDoVeiculo(v.r, v.m, sn, v.pose);
      return;
    }
  }

  return {
    passo,
    /** Relógio dos veículos (s desde que o núcleo abriu). */
    get relogio() {
      return T;
    },
    /** Os planos de agora (o primeiro quadro de quem chega). */
    planos(): PlanoVeiculo[] {
      return veics.map((v) => v.plano);
    },
    /** Os planos que mudaram desde a última vez (e esquece). */
    tirarMudados(): PlanoVeiculo[] {
      const r = mudados;
      mudados = [];
      return r;
    },
    tirarEventos(): EventoVeiculo[] {
      const r = eventos;
      eventos = [];
      return r;
    },
    /** Leitura para testes. */
    get veiculos() {
      return veics.map((v) => {
        const e = noPlano(v.plano, T);
        return {
          id: v.def.id,
          tipo: v.def.tipo,
          s: e.s,
          v: e.v,
          pose: { ...v.pose },
          m: v.m,
          r: v.r,
          parada: v.parada?.k ?? null,
          reserva: v.reserva,
          encalhe: v.encalhe,
          plano: v.plano,
          motivo: v.motivo,
        };
      });
    },
    /**
     * Quanto falta do corpo de quem anda até o veículo mais perto (os bichos não encostam: o
     * passo que chegaria mais perto que isto não é dado). Quem está bem acima do teto não conta.
     */
    folga(p: PessoaNaRua): number {
      let menor = Infinity;
      for (const v of veics) {
        if (Math.abs(v.pose.x - p.x) > 8 || Math.abs(v.pose.z - p.z) > 8) continue;
        if (p.y > chao + v.m.altura + 0.3) continue;
        const f = folgaAoVeiculo(v.pose, v.m, p);
        if (f < menor) menor = f;
      }
      return menor;
    },
    /** Algum veículo andando a até `raio` blocos (os bichos saem da rua na hora). */
    andandoPerto(x: number, z: number, raio: number): boolean {
      return veics.some(
        (v) => noPlano(v.plano, T).v > 0.05 && Math.hypot(v.pose.x - x, v.pose.z - z) < raio,
      );
    },
    /** A célula é de pista (os bichos saem dela). */
    pista(x: number, z: number): boolean {
      return soloDePista(soloDaCidade(plano, Math.floor(x), Math.floor(z)));
    },
  };
}
