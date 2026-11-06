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

export function criarPopulacao(rng: Gerador, salvo?: unknown) {
  const lista: Criatura[] = [];
  let proximo = 1;
  let tempoSpawn = 0;
  // raposas domadas persistem
  const s = salvo as { raposas?: { x: number; y: number; z: number; vida: number }[] } | undefined;
  for (const r of s?.raposas ?? []) {
    const c = novaCriatura(proximo++, 'raposa', r.x, r.y, r.z);
    c.domada = true;
    c.vida = r.vida || CRIATURAS.raposa.vida;
    lista.push(c);
  }

  const hostis: Criatura[] = [];

  let tempoPovoado = 0;
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
      for (const c of lista) if (c.tipo === t && !c.domada) n++;
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
    for (let i = 0; i < n; i++) {
      lista.push(
        novaCriatura(
          proximo++,
          t,
          x + 0.5 + (rng() - 0.5) * 3,
          sy + 0.1,
          z + 0.5 + (rng() - 0.5) * 3,
        ),
      );
    }
  }

  return {
    get lista(): readonly Criatura[] {
      return lista;
    },
    atualizar(dt: number, m: MundoPopulacao, j: Jogador, noite: number): EventoCriatura[] {
      const ev: EventoCriatura[] = [];
      tempoSpawn -= dt;
      if (tempoSpawn <= 0) {
        tempoSpawn = 0.7;
        tentarSpawn(m, j, noite);
      }
      tempoPovoado -= dt;
      if (tempoPovoado <= 0) {
        tempoPovoado = 1;
        chamarMoradores(m, j);
      }
      // reaproveita o vetor de hostis: nada de filter por quadro
      hostis.length = 0;
      for (const c of lista) if (CRIATURAS[c.tipo].comportamento === 'hostil') hostis.push(c);
      for (const c of lista) {
        const dist = Math.hypot(c.x - j.x, c.z - j.z);
        // longe demais: sem IA, só assenta no chão (não fica congelada no ar)
        if (dist > 56 && !c.domada) {
          assentarCriatura(c, dt, m);
          continue;
        }
        const evc = passoCriatura(c, dt, m, j, rng, hostis, noite);
        for (const e of evc) ev.push(e);
      }
      separar(m, dt);
      // remove as dissolvidas e as que ficaram longe, compactando no lugar
      let n = 0;
      for (const c of lista) {
        if (c.estado === 'morrendo' && c.dissolver >= 1) continue;
        if (!c.domada && Math.hypot(c.x - j.x, c.z - j.z) > 80) continue;
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
      };
    },
  };
}
export type Populacao = ReturnType<typeof criarPopulacao>;
