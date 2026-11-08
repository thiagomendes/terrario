import type { Gerador } from '../audio/variacao';
import type { Bioma } from '../world/chunk';
import { colideCorpo } from '../player/fisica';
import {
  assentarCriatura,
  CRIATURAS,
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
import {
  botaOvo,
  comeEsse,
  LIMITE_CRIADOS,
  primeiraEsperaOvo,
  RAIO_ATRAIR,
  SEGUNDOS_OVO,
  viraCriado,
} from './criacao';

/** Bichos por cercado do sítio (spec 013). */
export const BICHOS_POR_CERCADO = 3;

export interface MundoPopulacao extends Mundo {
  bioma(x: number, z: number): Bioma;
  /** y do primeiro bloco livre acima do chão na coluna (ou null). */
  superficie(x: number, z: number): number | null;
  nivelMar: number;
  /** Povoados a até `raio` blocos (para os moradores aparecerem). */
  povoados?(x: number, z: number, raio: number): readonly PlanoPovoado[];
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
}

export interface OpcoesPopulacao {
  /** Spec 013: a criatura da noite do mundo (do estilo do tema). Sem o campo, assusta. */
  noite?: 'assusta' | 'mansa';
}

const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Papéis que seguem a comida (os outros nem procuram quem a segura). */
const COMEM: ReadonlySet<TipoSer> = new Set(['cervo', 'coelho']);

export function criarPopulacao(rng: Gerador, salvo?: unknown, opcoes: OpcoesPopulacao = {}) {
  const lista: Criatura[] = [];
  const mansa = opcoes.noite === 'mansa';
  let proximo = 1;
  let tempoSpawn = 0;
  // raposas domadas persistem
  const s = salvo as
    | { raposas?: { x: number; y: number; z: number; vida: number }[]; criados?: unknown }
    | undefined;
  for (const r of s?.raposas ?? []) {
    const c = novaCriatura(proximo++, 'raposa', r.x, r.y, r.z);
    c.domada = true;
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
      c.vida = num(b.vida) && b.vida > 0 ? Math.min(b.vida, CRIATURAS[b.tipo].vida) : c.vida;
      c.casa =
        Array.isArray(b.casa) && num(b.casa[0]) && num(b.casa[1]) ? [b.casa[0], b.casa[1]] : [b.x, b.z];
      if (botaOvo(b.tipo))
        c.ovo = num(b.ovo) && b.ovo >= 0 ? Math.min(b.ovo, SEGUNDOS_OVO) : SEGUNDOS_OVO;
      if (typeof b.curral === 'string' && Array.isArray(b.cerca) && b.cerca.length === 4 && b.cerca.every(num)) {
        c.curral = b.curral;
        c.cerca = [b.cerca[0], b.cerca[1], b.cerca[2], b.cerca[3]];
      }
      lista.push(c);
    }

  const hostis: Criatura[] = [];

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
    if (m.agua(x, sy, z)) return;
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
      for (const c of lista) {
        let [j, dist] = maisPerto(c);
        // longe demais: sem IA, só assenta no chão (não fica congelada no ar)
        if (dist > 56 && !c.domada) {
          assentarCriatura(c, dt, m);
          continue;
        }
        // o bicho segue quem segura a comida dele, mesmo que outro esteja mais perto
        if (comComida && !comeEsse(c.tipo, j.mao) && COMEM.has(c.tipo)) {
          let d = Infinity;
          for (const o of js) {
            const di = Math.hypot(c.x - o.x, c.z - o.z);
            if (comeEsse(c.tipo, o.mao) && di < RAIO_ATRAIR + 4 && di < d) {
              d = di;
              j = o;
            }
          }
        }
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
      // remove as dissolvidas e as que ficaram longe de todos, compactando no lugar
      let n = 0;
      for (const c of lista) {
        if (c.estado === 'morrendo' && c.dissolver >= 1) continue;
        if (!c.domada && !c.criado && maisPerto(c)[1] > 80) continue;
        lista[n++] = c;
      }
      lista.length = n;
      return ev;
    },
    ferir(c: Criatura, dano: number, deX: number, deZ: number): EventoCriatura[] {
      return ferir(c, dano, rng, deX, deZ);
    },
    domar(c: Criatura): boolean {
      if (c.tipo !== 'raposa' || c.domada) return false;
      if (rng() < 0.45) {
        c.domada = true;
        c.vida = CRIATURAS.raposa.vida;
        return true;
      }
      return false;
    },
    /** Quantos bichos criados há no mundo (o limite é por mundo). */
    get criados(): number {
      let n = 0;
      for (const c of lista) if (c.criado && c.estado !== 'morrendo') n++;
      return n;
    },
    /**
     * Dar comida (spec 013): o bicho passa a ser criado, com casa onde está. Já criado, só
     * muda a casa para aqui. Devolve 'novo', 'ja' ou o motivo da recusa.
     */
    criar(c: Criatura): 'novo' | 'ja' | 'limite' | 'nao' {
      if (!viraCriado(c.tipo) || c.estado === 'morrendo' || c.morador) return 'nao';
      if (c.criado) {
        c.casa = [c.x, c.z];
        return 'ja';
      }
      if (this.criados >= LIMITE_CRIADOS) return 'limite';
      c.criado = true;
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
          .map((c) => ({ x: c.x, y: c.y, z: c.z, vida: c.vida })),
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
            };
          }),
      };
    },
  };
}
export type Populacao = ReturnType<typeof criarPopulacao>;
