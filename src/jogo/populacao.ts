import type { Gerador } from '../audio/variacao';
import type { Bioma } from '../world/chunk';
import { ALTURA_JOGADOR, colideCorpo, MEIA_LARGURA } from '../player/fisica';
import { contatoComCorpo, CORPO_DO_SER, FOLGA_PASSAGEM, VEL_DAR_PASSAGEM } from './contato';
import {
  assentarCriatura,
  bichoSolto,
  CRIATURAS,
  FOLGA_VEICULO,
  ferir,
  novaCriatura,
  passoCriatura,
  type Criatura,
  type EventoCriatura,
  type Jogador,
  type Mundo,
  type TipoCriatura,
  type TipoSer,
} from './criaturas';
import { dentroDaCasa, frenteDaPorta, type PlanoPovoado } from '../world/povoado';
import { RAIO_CHAMAR, TEMPO_CHAMADO } from '../personagem/gestos';
import { podeLevarBicho } from './permissao';
import {
  botaOvo,
  comeEsse,
  LIMITE_CRIADOS,
  primeiraEsperaOvo,
  RAIO_ATRAIR,
  SEGUNDOS_OVO,
  viraCriado,
} from './criacao';

/** Além disto de todos os jogadores, o bicho de sempre some e o criado fica parado. */
const LONGE_SOME = 80;

/** Bichos por cercado do sítio (spec 013). */
export const BICHOS_POR_CERCADO = 3;

export interface MundoPopulacao extends Mundo {
  bioma(x: number, z: number): Bioma;
  /** y do primeiro bloco livre acima do chão na coluna (ou null). */
  superficie(x: number, z: number): number | null;
  nivelMar: number;
  /** Povoados a até `raio` blocos (para os moradores aparecerem). */
  povoados?(x: number, z: number, raio: number): readonly PlanoPovoado[];
  /**
   * Spec 014 (T08): o chão da Cidade Grande na coluna e a altura dos pés nele (null fora da
   * cidade). Na cidade os bichos nascem só no chão (nunca num telhado nem no meio da rua): o
   * pombo e o gato na calçada e no parque, o cachorro grande no parque.
   */
  chaoDaCidade?(
    x: number,
    z: number,
  ): { chao: 'rua' | 'calcada' | 'parque' | 'lote' | 'lago'; y: number } | null;
}

export const LIMITES: Record<TipoSer, number> = {
  cervo: 6,
  coelho: 6,
  peixe: 8,
  espectro: 6,
  raposa: 1,
  // moradores não nascem ao acaso: um por casa, quando o povoado está perto
  morador: 0,
};

const BIOMAS: Partial<Record<TipoCriatura, Bioma[]>> = {
  cervo: ['floresta', 'campos', 'taiga'],
  coelho: ['campos', 'floresta', 'taiga', 'deserto'],
  raposa: ['floresta', 'taiga'],
};

/** Bicho criado como vai no salvamento (`extras.criaturas.criados`, spec 013). */
export interface CriadoSalvo {
  tipo: 'cervo' | 'coelho';
  x: number;
  y: number;
  z: number;
  vida: number;
  casa: [number, number];
  /** Galinha: segundos até o próximo ovo. */
  ovo?: number;
  /** Ainda é do cercado do sítio ("povoado:cercado") e o miolo dele. */
  curral?: string;
  cerca?: [number, number, number, number];
  /** Spec 016: quem criou (sem o campo: o dono do mundo). */
  dono?: string;
}

export interface OpcoesPopulacao {
  /** Spec 013: a criatura da noite do mundo (do estilo do tema). Sem o campo, assusta. */
  noite?: 'assusta' | 'mansa';
  /** Spec 016: id do dono do mundo (chama e leva todos os bichos criados). */
  donoDoMundo?: string | null;
}

/** Spec 016: id de quem criou, como vai no salvamento (texto curto ou nada). */
const donoSalvo = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 && v.length <= 64 ? v : undefined;

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Papéis que seguem a comida (os outros nem procuram quem a segura). */
const COMEM: ReadonlySet<TipoSer> = new Set(['cervo', 'coelho']);

export function criarPopulacao(rng: Gerador, salvo?: unknown, opcoes: OpcoesPopulacao = {}) {
  const lista: Criatura[] = [];
  const mansa = opcoes.noite === 'mansa';
  const donoDoMundo = opcoes.donoDoMundo ?? null;
  /** Spec 016: o jogador pode levar o bicho? (sem id: o jogo de um só, como antes) */
  const leva = (c: Criatura, j: Jogador) =>
    j.id === undefined || podeLevarBicho(j.id, c, donoDoMundo);
  /** Quem não pode levar o bicho é visto por ele sem comida na mão (o mesmo objeto sempre). */
  const semComida: Jogador = { x: 0, y: 0, z: 0, vivo: true, criativo: false, mao: null };
  const comoVisto = (j: Jogador): Jogador => {
    semComida.x = j.x;
    semComida.y = j.y;
    semComida.z = j.z;
    semComida.vivo = j.vivo;
    semComida.criativo = j.criativo;
    semComida.id = j.id;
    return semComida;
  };
  let proximo = 1;
  let tempoSpawn = 0;
  // raposas domadas persistem
  const s = salvo as
    | {
        raposas?: { x: number; y: number; z: number; vida: number; dono?: unknown }[];
        criados?: unknown;
      }
    | undefined;
  for (const r of s?.raposas ?? []) {
    const c = novaCriatura(proximo++, 'raposa', r.x, r.y, r.z);
    c.domada = true;
    const dr = donoSalvo(r.dono);
    if (dr) c.dono = dr;
    c.vida = r.vida || CRIATURAS.raposa.vida;
    lista.push(c);
  }
  // spec 013: os bichos criados também (mundos de antes não têm a chave)
  if (Array.isArray(s?.criados))
    for (const b of (s.criados as Partial<CriadoSalvo>[]).slice(0, LIMITE_CRIADOS)) {
      if (!b || (b.tipo !== 'cervo' && b.tipo !== 'coelho')) continue;
      if (!num(b.x) || !num(b.y) || !num(b.z)) continue;
      const c = novaCriatura(proximo++, b.tipo, b.x, b.y, b.z);
      c.criado = true;
      const db = donoSalvo(b.dono);
      if (db) c.dono = db;
      c.vida = num(b.vida) && b.vida > 0 ? Math.min(b.vida, CRIATURAS[b.tipo].vida) : c.vida;
      c.casa =
        Array.isArray(b.casa) && num(b.casa[0]) && num(b.casa[1])
          ? [b.casa[0], b.casa[1]]
          : [b.x, b.z];
      if (botaOvo(b.tipo))
        c.ovo = num(b.ovo) && b.ovo >= 0 ? Math.min(b.ovo, SEGUNDOS_OVO) : SEGUNDOS_OVO;
      if (
        typeof b.curral === 'string' &&
        Array.isArray(b.cerca) &&
        b.cerca.length === 4 &&
        b.cerca.every(num)
      ) {
        c.curral = b.curral;
        c.cerca = [b.cerca[0], b.cerca[1], b.cerca[2], b.cerca[3]];
      }
      lista.push(c);
    }

  const hostis: Criatura[] = [];

  /** Spec 026: o caminho de saída do festival de cada bicho solto que está dentro dele. */
  const saidas = new Map<number, [number, number][]>();
  const antes = new Map<number, [number, number]>();
  /**
   * Spec 026 (o festival da Vila Neon sem bichos): o bicho solto que acabou de entrar volta para
   * onde estava (o portão e o alambrado ficam fechados para ele, como uma cerca); o que já estava
   * dentro (o bicho que seguia a comida e parou ali) sai andando pelo portão, sem pressa. Quem
   * segue a comida de alguém agora passa (a criança pode levar o coelhinho ao show).
   */
  function foraDoFestival(m: MundoPopulacao, c: Criatura, antesX: number, antesZ: number): void {
    const z = m.semBichos;
    if (!z) return;
    const seguindo = c.estado === 'seguir' && COMEM.has(c.tipo);
    if (!bichoSolto(c) || seguindo || !z.dentro(c.x, c.z)) {
      saidas.delete(c.id);
      return;
    }
    if (!z.dentro(antesX, antesZ)) {
      c.x = antesX;
      c.z = antesZ;
      c.vx = 0;
      c.vz = 0;
      c.tempoEstado = 0;
      saidas.delete(c.id);
      return;
    }
    let pts = saidas.get(c.id);
    if (!pts) saidas.set(c.id, (pts = z.saida(c.x, c.z)));
    while (pts.length > 1 && Math.hypot(pts[0][0] - c.x, pts[0][1] - c.z) < 0.9) pts.shift();
    c.estado = 'vagar';
    c.alvoX = pts[0][0];
    c.alvoZ = pts[0][1];
    c.tempoEstado = Math.max(c.tempoEstado, 1);
    c.satisfeito = undefined;
  }

  let tempoPovoado = 0;
  /** De quem é a vez de ganhar uma tentativa de nascer criatura por perto. */
  let vezSpawn = -1;
  /**
   * Chama os moradores dos povoados perto (a até 50 blocos do centro, para nenhum nascer
   * já fora do alcance da simulação). Quem faltar (porque ficou longe e saiu da lista) é
   * recriado; nenhum morador é duplicado.
   */
  function chamarMoradores(m: MundoPopulacao, j: Jogador): void {
    if (!m.povoados) return;
    for (const p of m.povoados(j.x, j.z, 50)) {
      // só com o chão do povoado já carregado
      if (m.superficie(p.cx, p.cz) === null) continue;
      const vivos = new Set<number>();
      for (const c of lista) if (c.morador?.povoado === p.id) vivos.add(c.morador.n);
      chamarBichosDoSitio(m, p);
      if (vivos.size === p.moradores.length) continue;
      const y = p.h + 1;
      const centro = (x: number, z: number): [number, number, number] => [x + 0.5, y, z + 0.5];
      // pontos livres no anel interno da praça (a 3 do centro: fora do marco, longe da
      // beirada e dos postes), conferidos no mundo
      const livres: [number, number][] = [];
      for (let dx = -3; dx <= 3; dx++)
        for (let dz = -3; dz <= 3; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== 3) continue;
          const x = p.cx + dx;
          const z = p.cz + dz;
          if (!m.solido(x, y, z) && !m.solido(x, y + 1, z) && m.solido(x, y - 1, z))
            livres.push([x, z]);
        }
      if (livres.length === 0) livres.push([p.cx + 3, p.cz]);
      for (const mo of p.moradores) {
        if (vivos.has(mo.n)) continue;
        const casa = p.lotes[mo.casa];
        const oficina = p.lotes[mo.oficina];
        const fora = centro(...frenteDaPorta(casa));
        const [lx, lz] = livres[(mo.n * 5) % livres.length];
        const c = novaCriatura(proximo++, 'morador', fora[0], fora[1], fora[2]);
        c.morador = {
          povoado: p.id,
          n: mo.n,
          profissao: mo.profissao,
          fora,
          dentro: centro(...dentroDaCasa(casa)),
          oficina: centro(...frenteDaPorta(oficina)),
          praca: centro(lx, lz),
          rotaCasa: casa.rota.map(([x, z]) => [x + 0.5, z + 0.5] as [number, number]),
          rotaOficina: oficina.rota.map(([x, z]) => [x + 0.5, z + 0.5] as [number, number]),
          centro: [p.cx + 0.5, p.cz + 0.5],
        };
        lista.push(c);
      }
    }
  }

  /**
   * Cercados do sítio já povoados nesta visita. O cercado só ganha bichos de novo depois
   * que todos os dele sumiram e nenhum jogador está perto (volta com o sítio, como os
   * moradores): nunca passa de 3, nem recarregando o mundo (os bichos não são salvos).
   */
  const cercadosChamados = new Set<string>();
  const centrosCercados = new Map<string, [number, number]>();

  /**
   * Põe até 3 bichos em cada cercado do sítio, em pontos fixos do miolo (sem sorteio: os
   * geradores de hoje continuam com a mesma sequência).
   */
  function chamarBichosDoSitio(m: MundoPopulacao, p: PlanoPovoado): void {
    if (!p.currais) return;
    p.currais.forEach((cc, k) => {
      const chave = `${p.id}:${k}`;
      if (cercadosChamados.has(chave)) return;
      const def = CRIATURAS[cc.bicho];
      const y = p.h + 1;
      const livres: [number, number][] = [];
      for (let z = cc.z0; z <= cc.z1; z++)
        for (let x = cc.x0; x <= cc.x1; x++)
          if (
            m.solido(x, y - 1, z) &&
            !m.agua(x, y - 1, z) &&
            !colideCorpo(m.solido, x + 0.5, y, z + 0.5, def.mw, def.alt)
          )
            livres.push([x, z]);
      if (livres.length === 0) return;
      cercadosChamados.add(chave);
      centrosCercados.set(chave, [(cc.x0 + cc.x1) / 2 + 0.5, (cc.z0 + cc.z1) / 2 + 0.5]);
      let ja = 0;
      for (const c of lista) if (c.curral === chave && c.estado !== 'morrendo') ja++;
      for (let i = ja; i < BICHOS_POR_CERCADO; i++) {
        // espalhados pelo miolo: 1/6, 3/6 e 5/6 da lista de pontos livres
        const [x, z] = livres[Math.floor(((2 * i + 1) * livres.length) / (2 * BICHOS_POR_CERCADO))];
        const c = novaCriatura(proximo++, cc.bicho, x + 0.5, y, z + 0.5);
        c.curral = chave;
        // passeia só no miolo do cercado (não sai pela porteira)
        c.cerca = [cc.x0, cc.z0, cc.x1, cc.z1];
        c.yaw = c.yawAlvo = (k + i) * 2.1;
        lista.push(c);
      }
    });
  }

  /** Libera os cercados vazios e longe de todos (para renascerem na próxima visita). */
  function liberarCercados(js: readonly Jogador[]): void {
    if (cercadosChamados.size === 0) return;
    const vivos = new Set<string>();
    // o bicho criado não some: só os do sítio seguram o cercado (o criado ainda conta nos 3)
    for (const c of lista) if (c.curral && !c.criado) vivos.add(c.curral);
    for (const chave of cercadosChamados) {
      if (vivos.has(chave)) continue;
      const [x, z] = centrosCercados.get(chave)!;
      if (js.some((j) => Math.hypot(j.x - x, j.z - z) < 70)) continue;
      cercadosChamados.delete(chave);
      centrosCercados.delete(chave);
    }
  }

  /**
   * Spec 026 (o dono: "o personagem atravessando bichos"): o bicho ou morador encostado numa
   * criança dá passagem, saindo devagar para o lado de lá (se o chão deixa). Ninguém atravessa
   * ninguém e ninguém prende ninguém: a tela tira o boneco de dentro e o bicho abre espaço.
   */
  function darPassagem(m: MundoPopulacao, js: readonly Jogador[], dt: number): void {
    for (const c of lista) {
      if (c.estado === 'morrendo' || c.tipo === 'peixe') continue;
      const def = CRIATURAS[c.tipo];
      const [frente, lado] = CORPO_DO_SER[c.tipo];
      for (const j of js) {
        if (!j.vivo || Math.abs(j.x - c.x) > 2.5 || Math.abs(j.z - c.z) > 2.5) continue;
        if (j.y >= c.y + def.alt || j.y + ALTURA_JOGADOR <= c.y) continue;
        const k = contatoComCorpo(j.x, j.z, MEIA_LARGURA, {
          x: c.x,
          y: c.y,
          z: c.z,
          alt: def.alt,
          frente: frente + FOLGA_PASSAGEM,
          lado: lado + FOLGA_PASSAGEM,
          yaw: c.yaw,
        });
        if (!k) continue;
        const passo = Math.min(k.pen, VEL_DAR_PASSAGEM * dt);
        const nx = c.x - k.nx * passo;
        const nz = c.z - k.nz * passo;
        // encostado numa parede, escorrega ao longo dela (o pedaço que não entra na parede),
        // nunca para perto de um carrinho da cidade (a mesma folga do passo do bicho)
        const antes = m.folgaVeiculo?.(c.x, c.y, c.z, c.yaw, c.tipo) ?? Infinity;
        // (nem cai da beirada: do palco, da calçada alta, no lago)
        const livre = (x: number, z: number) => {
          if (colideCorpo(m.solido, x, c.y, z, def.mw, def.alt)) return false;
          if (!colideCorpo(m.solido, x, c.y - 0.3, z, def.mw * 0.5, 0.25)) return false;
          const la = m.folgaVeiculo?.(x, c.y, z, c.yaw, c.tipo) ?? Infinity;
          return la >= FOLGA_VEICULO || la >= antes;
        };
        if (livre(nx, nz)) {
          c.x = nx;
          c.z = nz;
        } else if (livre(nx, c.z)) c.x = nx;
        else if (livre(c.x, nz)) c.z = nz;
      }
    }
  }

  /** Repulsão simples entre criaturas sobrepostas: não se atravessam nem se empilham. */
  function separar(m: MundoPopulacao, dt: number): void {
    const k = Math.min(1, dt * 10);
    for (let i = 0; i < lista.length; i++) {
      const a = lista[i];
      if (a.estado === 'morrendo') continue;
      const da = CRIATURAS[a.tipo];
      for (let q = i + 1; q < lista.length; q++) {
        const b = lista[q];
        if (b.estado === 'morrendo') continue;
        const db = CRIATURAS[b.tipo];
        const min = da.mw + db.mw;
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        if (Math.abs(dx) >= min || Math.abs(dz) >= min) continue;
        if (a.y + da.alt <= b.y || b.y + db.alt <= a.y) continue;
        let d = Math.hypot(dx, dz);
        if (d >= min) continue;
        if (d < 1e-4) {
          // no mesmo ponto: separa numa direção fixa pelo id
          const ang = (a.id * 2.399 + b.id) % (Math.PI * 2);
          dx = Math.sin(ang);
          dz = Math.cos(ang);
          d = 1;
        }
        const empurra = (min - d) * 0.5 * k;
        const ux = (dx / d) * empurra;
        const uz = (dz / d) * empurra;
        if (!colideCorpo(m.solido, a.x - ux, a.y, a.z - uz, da.mw, da.alt)) {
          a.x -= ux;
          a.z -= uz;
        }
        if (!colideCorpo(m.solido, b.x + ux, b.y, b.z + uz, db.mw, db.alt)) {
          b.x += ux;
          b.z += uz;
        }
      }
    }
  }

  /**
   * Spec 014 (T08): bichos da Cidade Grande, sem bioma: o pombo (papel coelho) em bandinho na
   * calçada e no parque, o gato de rua (papel raposa) sozinho e o cachorro grande (papel cervo)
   * só no parque. Só nos mundos da cidade (os outros temas sorteiam como sempre).
   */
  function nascerNaCidade(m: MundoPopulacao, x: number, z: number, sy: number, chao: string): void {
    const contar = (t: TipoCriatura) => {
      let n = 0;
      for (const c of lista) if (c.tipo === t && !c.domada && !c.curral && !c.criado && !c.lar) n++;
      return n;
    };
    const r = rng();
    const t: TipoCriatura = r < 0.55 ? 'coelho' : r < 0.8 ? 'raposa' : 'cervo';
    if (t === 'cervo' && chao !== 'parque') return;
    if (contar(t) >= LIMITES[t]) return;
    const n = t === 'coelho' ? 2 + Math.floor(rng() * 3) : 1;
    const def = CRIATURAS[t];
    for (let i = 0; i < n; i++) {
      const cx = x + 0.5 + (i === 0 ? 0 : (rng() - 0.5) * 3);
      const cz = z + 0.5 + (i === 0 ? 0 : (rng() - 0.5) * 3);
      const ch = m.chaoDaCidade?.(Math.floor(cx), Math.floor(cz));
      if (!ch || ch.chao === 'rua' || ch.chao === 'lote' || ch.chao === 'lago') continue;
      if (colideCorpo(m.solido, cx, sy + 0.1, cz, def.mw, def.alt)) continue;
      lista.push(novaCriatura(proximo++, t, cx, sy + 0.1, cz));
    }
  }

  function tentarSpawn(m: MundoPopulacao, j: Jogador, noite: number): void {
    const contar = (t: TipoCriatura) => {
      let n = 0;
      for (const c of lista) if (c.tipo === t && !c.domada && !c.curral && !c.criado) n++;
      return n;
    };
    const a = rng() * Math.PI * 2;
    const r = 18 + rng() * 22;
    const x = Math.floor(j.x + Math.cos(a) * r);
    const z = Math.floor(j.z + Math.sin(a) * r);
    // spec 026: nenhum bicho nasce dentro do festival da Vila Neon
    if (m.semBichos?.dentro(x + 0.5, z + 0.5)) return;
    const sy = m.superficie(x, z);
    if (sy === null) return;
    const bioma = m.bioma(x, z);
    const subterraneo = j.y < m.nivelMar - 12;
    // peixes nos lagos e no mar
    if (m.agua(x, m.nivelMar, z) && contar('peixe') < LIMITES.peixe) {
      const fundo = sy;
      const y = fundo + rng() * Math.max(0.5, m.nivelMar - fundo - 0.5);
      lista.push(novaCriatura(proximo++, 'peixe', x + 0.5, y, z + 0.5));
      return;
    }
    // spec 014: na cidade, só no chão da calçada e do parque (e a cidade escolhe os bichos);
    // as carpas no lago do parque (ele fica acima do nível do mar)
    const cidade = m.chaoDaCidade?.(x, z) ?? null;
    if (cidade?.chao === 'lago' && m.agua(x, sy, z) && contar('peixe') < LIMITES.peixe) {
      lista.push(novaCriatura(proximo++, 'peixe', x + 0.5, sy + 0.2 + rng() * 0.6, z + 0.5));
      return;
    }
    if (m.agua(x, sy, z)) return;
    if (cidade && (cidade.chao === 'rua' || cidade.chao === 'lote' || sy !== cidade.y)) return;
    // espectros: noite na superfície escura ou cavernas
    if ((noite > 0.6 || subterraneo) && contar('espectro') < LIMITES.espectro && rng() < 0.6) {
      let y = sy;
      if (subterraneo) {
        // procura ar perto da altura do jogador
        y = Math.floor(j.y) + Math.floor((rng() - 0.5) * 8);
        if (m.solido(x, y, z) || m.solido(x, y + 1, z) || !m.solido(x, y - 1, z)) return;
      }
      if (m.luzBloco(x, y, z) < 6)
        lista.push(novaCriatura(proximo++, 'espectro', x + 0.5, y, z + 0.5));
      return;
    }
    if (noite > 0.7) return;
    if (cidade) {
      nascerNaCidade(m, x, z, sy, cidade.chao);
      return;
    }
    const tipos: TipoCriatura[] = ['cervo', 'coelho', 'raposa'];
    const t = tipos[Math.floor(rng() * tipos.length)];
    if (t === 'raposa' && rng() > 0.25) return;
    if (!BIOMAS[t]!.includes(bioma) || contar(t) >= LIMITES[t]) return;
    const n = t === 'raposa' ? 1 : 1 + Math.floor(rng() * 3);
    const def = CRIATURAS[t];
    for (let i = 0; i < n; i++) {
      // cada um do grupo nasce no chão da própria coluna, e só se o corpo inteiro couber
      // (antes todos ficavam na altura do centro e nasciam dentro de barrancos e árvores)
      const cx = x + 0.5 + (rng() - 0.5) * 3;
      const cz = z + 0.5 + (rng() - 0.5) * 3;
      if (m.semBichos?.dentro(cx, cz)) continue;
      const syi = m.superficie(Math.floor(cx), Math.floor(cz));
      if (syi === null || m.agua(Math.floor(cx), syi, Math.floor(cz))) continue;
      if (colideCorpo(m.solido, cx, syi + 0.1, cz, def.mw, def.alt)) continue;
      lista.push(novaCriatura(proximo++, t, cx, syi + 0.1, cz));
    }
  }

  return {
    get lista(): readonly Criatura[] {
      return lista;
    },
    /**
     * Avança as criaturas. Com vários jogadores, cada criatura reage ao mais perto, as
     * que nascem se revezam em volta de cada um e só somem longe de todos. Com um só, é
     * exatamente o que era (mesmos sorteios na mesma ordem).
     */
    atualizar(
      dt: number,
      m: MundoPopulacao,
      jogadores: Jogador | readonly Jogador[],
      noite: number,
    ): EventoCriatura[] {
      const js = Array.isArray(jogadores) ? jogadores : [jogadores as Jogador];
      const ev: EventoCriatura[] = [];
      if (js.length === 0) return ev;
      tempoSpawn -= dt;
      if (tempoSpawn <= 0) {
        tempoSpawn = 0.7;
        vezSpawn = (vezSpawn + 1) % js.length;
        tentarSpawn(m, js[vezSpawn], noite);
      }
      tempoPovoado -= dt;
      if (tempoPovoado <= 0) {
        tempoPovoado = 1;
        liberarCercados(js);
        for (const j of js) chamarMoradores(m, j);
      }
      // reaproveita o vetor de hostis: nada de filter por quadro
      hostis.length = 0;
      // a criatura da noite mansa não é inimiga: a raposa domada não vai atrás dela
      if (!mansa)
        for (const c of lista) if (CRIATURAS[c.tipo].comportamento === 'hostil') hostis.push(c);
      // alguém segura comida de bicho? (sem isso, nada muda: é o de sempre)
      const comComida = js.some((j) => !!j.mao);
      const maisPerto = (c: Criatura): [Jogador, number] => {
        let melhor = js[0];
        let d = Math.hypot(c.x - melhor.x, c.z - melhor.z);
        for (let i = 1; i < js.length; i++) {
          const di = Math.hypot(c.x - js[i].x, c.z - js[i].z);
          if (di < d) {
            d = di;
            melhor = js[i];
          }
        }
        return [melhor, d];
      };
      // spec 026: onde cada um estava antes do passo (a cerca do festival da Vila Neon)
      if (m.semBichos) {
        antes.clear();
        for (const c of lista) antes.set(c.id, [c.x, c.z]);
      }
      for (const c of lista) {
        let [j, dist] = maisPerto(c);
        // o bicho criado longe de todos (onde o bicho de sempre já teria sumido) fica parado
        // onde está, sem IA e sem assentar: nada de gerar terreno lá a cada passo (é salvo
        // e volta a andar quando alguém chega perto)
        if (c.criado && dist > LONGE_SOME) continue;
        // longe demais: sem IA, só assenta no chão (não fica congelada no ar)
        if (dist > 56 && !c.domada) {
          assentarCriatura(c, dt, m);
          continue;
        }
        // spec 016: o bicho criado (ou a raposa domada) é de quem criou: segue só ele e o
        // dono do mundo; os outros ele vê sem comida na mão, e fica onde está
        const deAlguem = c.criado || c.domada;
        // o bicho segue quem segura a comida dele, mesmo que outro esteja mais perto
        if (
          comComida &&
          COMEM.has(c.tipo) &&
          !(comeEsse(c.tipo, j.mao) && (!deAlguem || leva(c, j)))
        ) {
          let d = Infinity;
          for (const o of js) {
            const di = Math.hypot(c.x - o.x, c.z - o.z);
            if (
              comeEsse(c.tipo, o.mao) &&
              di < RAIO_ATRAIR + 4 &&
              di < d &&
              (!deAlguem || leva(c, o))
            ) {
              d = di;
              j = o;
            }
          }
        }
        // a raposa domada acompanha quem a domou (ou o dono do mundo); sem nenhum deles
        // por perto, fica onde está
        if (c.domada && c.tipo === 'raposa' && !leva(c, j)) {
          let d = Infinity;
          let melhor: Jogador | null = null;
          for (const o of js) {
            const di = Math.hypot(c.x - o.x, c.z - o.z);
            if (di < d && leva(c, o)) {
              d = di;
              melhor = o;
            }
          }
          if (melhor) j = melhor;
          else {
            j = comoVisto(j);
            // parada: "o jogador" está nela (nada de seguir nem reaparecer longe)
            j.x = c.x;
            j.y = c.y;
            j.z = c.z;
          }
        } else if (deAlguem && j.mao && !leva(c, j)) j = comoVisto(j);
        const evc = passoCriatura(c, dt, m, j, rng, hostis, noite, mansa);
        for (const e of evc) {
          if (e.tipo === 'ataque' || e.tipo === 'espantada') e.jogador = j;
          ev.push(e);
        }
        // a galinha criada bota ovo perto de casa (relógio dela, salvo; sem sorteio)
        if (c.criado && c.ovo !== undefined && c.estado !== 'morrendo') {
          c.ovo -= dt;
          if (c.ovo <= 0) {
            c.ovo = SEGUNDOS_OVO;
            ev.push({ tipo: 'ovo', criatura: c });
          }
        }
      }
      separar(m, dt);
      darPassagem(m, js, dt);
      if (m.semBichos)
        for (const c of lista) {
          const a = antes.get(c.id);
          if (a) foraDoFestival(m, c, a[0], a[1]);
        }
      // remove as dissolvidas e as que ficaram longe de todos, compactando no lugar
      let n = 0;
      for (const c of lista) {
        if (c.estado === 'morrendo' && c.dissolver >= 1) continue;
        if (!c.domada && !c.criado && maisPerto(c)[1] > LONGE_SOME) continue;
        lista[n++] = c;
      }
      lista.length = n;
      return ev;
    },
    ferir(c: Criatura, dano: number, deX: number, deZ: number): EventoCriatura[] {
      return ferir(c, dano, rng, deX, deZ);
    },
    /** Spec 016: `dono` é quem domou (sem ele: o dono do mundo). */
    domar(c: Criatura, dono?: string): boolean {
      if (c.tipo !== 'raposa' || c.domada) return false;
      if (rng() < 0.45) {
        c.domada = true;
        if (dono !== undefined) c.dono = dono;
        c.vida = CRIATURAS.raposa.vida;
        return true;
      }
      return false;
    },
    /**
     * Spec 015, gesto de chamar em (x, y, z): a raposa domada e os bichos criados até
     * `RAIO_CHAMAR` blocos vêm até perto. Spec 016: com `quem`, só os que ele pode levar
     * (os dele e, para o dono do mundo, todos). Devolve quantos vêm e o primeiro bicho de
     * outra pessoa que ficou (para o aviso).
     */
    chamar(
      x: number,
      y: number,
      z: number,
      quem?: string,
    ): { vem: number; deOutro: Criatura | null } {
      let vem = 0;
      let deOutro: Criatura | null = null;
      for (const c of lista) {
        if (c.estado === 'morrendo' || !(c.criado || (c.domada && c.tipo === 'raposa'))) continue;
        if (Math.abs(c.y - y) > 6 || Math.hypot(c.x - x, c.z - z) > RAIO_CHAMAR) continue;
        if (quem !== undefined && !podeLevarBicho(quem, c, donoDoMundo)) {
          deOutro ??= c;
          continue;
        }
        c.chamado = { x, z, t: TEMPO_CHAMADO };
        vem++;
      }
      return { vem, deOutro };
    },
    /** Quantos bichos criados há no mundo (o limite é por mundo). */
    get criados(): number {
      let n = 0;
      for (const c of lista) if (c.criado && c.estado !== 'morrendo') n++;
      return n;
    },
    /**
     * Dar comida (spec 013): o bicho passa a ser criado, com casa onde está. Já criado, só
     * muda a casa para aqui. Devolve 'novo', 'ja' ou o motivo da recusa. Spec 016: `dono` é
     * quem criou (sem ele: o dono do mundo); o bicho de outra pessoa ganha carinho
     * (`mudaCasa` falso) mas continua morando onde mora.
     */
    criar(c: Criatura, dono?: string, mudaCasa = true): 'novo' | 'ja' | 'limite' | 'nao' {
      if (!viraCriado(c.tipo) || c.estado === 'morrendo' || c.morador) return 'nao';
      if (c.criado) {
        if (mudaCasa) c.casa = [c.x, c.z];
        return 'ja';
      }
      if (this.criados >= LIMITE_CRIADOS) return 'limite';
      c.criado = true;
      if (dono !== undefined) c.dono = dono;
      c.casa = [c.x, c.z];
      if (botaOvo(c.tipo)) c.ovo = primeiraEsperaOvo(c.x, c.z);
      if (c.estado === 'fugir') {
        c.estado = 'parado';
        c.tempoEstado = 2;
      }
      return 'novo';
    },
    adicionar(t: TipoSer, x: number, y: number, z: number): Criatura {
      const c = novaCriatura(proximo++, t, x, y, z);
      lista.push(c);
      return c;
    },
    salvar() {
      return {
        raposas: lista
          .filter((c) => c.domada && c.estado !== 'morrendo')
          .map((c) => ({
            x: c.x,
            y: c.y,
            z: c.z,
            vida: c.vida,
            ...(c.dono !== undefined ? { dono: c.dono } : {}),
          })),
        criados: lista
          .filter((c) => c.criado && c.estado !== 'morrendo')
          .map((c): CriadoSalvo => {
            const r2 = (v: number) => Math.round(v * 100) / 100;
            return {
              tipo: c.tipo as CriadoSalvo['tipo'],
              x: r2(c.x),
              y: c.y,
              z: r2(c.z),
              vida: c.vida,
              casa: [r2(c.casa?.[0] ?? c.x), r2(c.casa?.[1] ?? c.z)],
              ...(c.ovo !== undefined ? { ovo: Math.round(c.ovo) } : {}),
              ...(c.curral && c.cerca ? { curral: c.curral, cerca: c.cerca } : {}),
              ...(c.dono !== undefined ? { dono: c.dono } : {}),
            };
          }),
      };
    },
  };
}
export type Populacao = ReturnType<typeof criarPopulacao>;
