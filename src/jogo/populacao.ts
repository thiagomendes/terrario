import type { Gerador } from '../audio/variacao';
import type { Bioma } from '../world/chunk';
import {
  CRIATURAS,
  ferir,
  novaCriatura,
  passoCriatura,
  type Criatura,
  type EventoCriatura,
  type Jogador,
  type Mundo,
  type TipoCriatura,
} from './criaturas';

export interface MundoPopulacao extends Mundo {
  bioma(x: number, z: number): Bioma;
  /** y do primeiro bloco livre acima do chão na coluna (ou null). */
  superficie(x: number, z: number): number | null;
  nivelMar: number;
}

export const LIMITES: Record<TipoCriatura, number> = {
  cervo: 6,
  coelho: 6,
  peixe: 8,
  espectro: 6,
  raposa: 1,
};

const BIOMAS: Partial<Record<TipoCriatura, Bioma[]>> = {
  cervo: ['floresta', 'campos', 'taiga'],
  coelho: ['campos', 'floresta', 'taiga', 'deserto'],
  raposa: ['floresta', 'taiga'],
};

export function criarPopulacao(rng: Gerador, salvo?: unknown) {
  let lista: Criatura[] = [];
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

  function tentarSpawn(m: MundoPopulacao, j: Jogador, noite: number): void {
    const contar = (t: TipoCriatura) => lista.filter((c) => c.tipo === t && !c.domada).length;
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
      const hostis = lista.filter((c) => CRIATURAS[c.tipo].comportamento === 'hostil');
      for (const c of lista) {
        const dist = Math.hypot(c.x - j.x, c.z - j.z);
        // longe demais: só atualiza as próximas (as outras ficam paradas)
        if (dist > 56 && !c.domada) continue;
        ev.push(...passoCriatura(c, dt, m, j, rng, hostis, noite));
      }
      lista = lista.filter((c) => {
        if (c.estado === 'morrendo' && c.dissolver >= 1) return false;
        if (!c.domada && Math.hypot(c.x - j.x, c.z - j.z) > 80) return false;
        return true;
      });
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
    adicionar(t: TipoCriatura, x: number, y: number, z: number): Criatura {
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
