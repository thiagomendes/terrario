import { Bloco, obterBloco } from '../world/blocks';
import { idDoBloco } from './itens';
import type { Gerador } from '../audio/variacao';

export interface Drop {
  item: string;
  qtd: number;
}

/** O que um bloco quebrado solta (sobrevivência). */
export function dropsDoBloco(bloco: number, rng: Gerador, coleta = true): Drop[] {
  if (!coleta) return [];
  const um = (b: number): Drop[] => [{ item: idDoBloco(b), qtd: 1 }];
  switch (bloco) {
    case Bloco.GRAMA_ALTA:
      return rng() < 0.12 ? [{ item: 'fibra', qtd: 1 }] : [];
    case Bloco.ARBUSTO_SECO:
      return rng() < 0.5 ? [{ item: 'graveto', qtd: 1 + Math.floor(rng() * 2) }] : [];
    case Bloco.ARBUSTO_FRUTINHAS:
      return [{ item: 'frutinhas', qtd: 1 + Math.floor(rng() * 3) }];
    case Bloco.MINERIO_CARVAO:
      return [{ item: 'carvao', qtd: 1 }];
    case Bloco.MINERIO_COBRE:
      return [{ item: 'cobre_bruto', qtd: 1 + Math.floor(rng() * 2) }];
    case Bloco.MINERIO_FERRO:
      return [{ item: 'ferro_bruto', qtd: 1 }];
    case Bloco.MINERIO_OURO:
      return [{ item: 'ouro_bruto', qtd: 1 }];
    case Bloco.MINERIO_LUZITA:
      return [{ item: 'luzita', qtd: 1 }];
    case Bloco.AR:
    case Bloco.VIDRO:
    case Bloco.GELO:
    case Bloco.ROCHA_MATRIZ:
      return [];
    case Bloco.PEDRA_RACHADA:
      return um(Bloco.PEDREGULHO);
    case Bloco.TERRA_MUSGOSA:
    case Bloco.TERRA_NEVADA:
      return um(Bloco.TERRA);
    case Bloco.MUSGO_PANTANO:
      return um(Bloco.LAMA);
    case Bloco.TERRA_ARADA:
      return um(Bloco.TERRA);
    case Bloco.PORTA_ABERTA:
      return um(Bloco.PORTA);
    case Bloco.PORTEIRA_ABERTA:
      return um(Bloco.PORTEIRA);
    case Bloco.FORNALHA_ACESA:
      return um(Bloco.FORNALHA);
    case Bloco.FOLHAGEM:
    case Bloco.FOLHAS_BETULA:
    case Bloco.FOLHAS_PINHO:
    case Bloco.FOLHAS_LANTERNA:
    case Bloco.FOLHAS_OUTONO: {
      const r = rng();
      if (r < 0.06) return [{ item: 'maca', qtd: 1 }];
      if (r < 0.14) return [{ item: 'graveto', qtd: 1 }];
      return [];
    }
    default:
      // o que não vira item (estágios da lavoura) não solta a si mesmo: a colheita é à parte
      return obterBloco(bloco)?.semItem ? [] : um(bloco);
  }
}

export interface ItemSolto {
  id: number;
  item: string;
  qtd: number;
  dur?: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  idade: number;
  /** Quem jogou no chão (de propósito): ele só pega de volta depois de TEMPO_DONO_RECOLHER. */
  de?: string;
  /**
   * Spec 031: posto pelo mundo num lugar certo (o ovinho do ninho do canto): não envelhece, não
   * junta com outro e quem pega leva a marca junto (o núcleo conta a missão por ela).
   */
  marca?: string;
}

/** Opções de um item jogado no chão de propósito (dar a um amigo, como no Minecraft). */
export interface Arremesso {
  /** Id de quem jogou. */
  de: string;
  /** Velocidade inicial (para a frente do boneco). */
  vx: number;
  vy: number;
  vz: number;
}

export const RAIO_ATRACAO = 2.6;
export const RAIO_COLETA = 0.8;
export const TEMPO_ANTES_DE_COLETAR = 0.45;
/** Quem jogou o item no chão só pega de volta depois disto (os outros, logo). */
export const TEMPO_DONO_RECOLHER = 2;
export const VIDA_ITEM = 300;
export const MAX_ITENS_SOLTOS = 200;
const GRAVIDADE = 18;
const MEIA_ALTURA = 0.125;

export interface MundoDeItens {
  readonly itens: readonly ItemSolto[];
  soltar(
    item: string,
    qtd: number,
    x: number,
    y: number,
    z: number,
    rng: Gerador,
    dur?: number,
    arremesso?: Arremesso,
  ): void;
  /**
   * Spec 031: põe o item parado num lugar certo, com uma marca (não pula, não some com o
   * tempo, não junta). Não sorteia nada (a sequência dos drops de sempre fica igual).
   */
  pousar(item: string, qtd: number, x: number, y: number, z: number, marca: string): void;
  /** Spec 031: tira do chão os itens com esta marca (devolve quantos tirou). */
  tirarMarca(marca: string): number;
  /** Itens no chão para o salvamento. */
  salvar(): { item: string; qtd: number; dur?: number; x: number; y: number; z: number }[];
  carregar(dados: unknown): void;
  /**
   * Avança a física; `coletar` devolve quanto não coube. Com vários jogadores, cada item
   * vai para o mais perto (`quem` é o índice dele). Devolve os itens coletados no passo.
   */
  atualizar(
    dt: number,
    jogador: PosColetor | readonly PosColetor[],
    coletar: (item: string, qtd: number, dur: number | undefined, quem: number) => number,
  ): (Drop & { quem: number; marca?: string })[];
}

/** Quem pode pegar itens: a posição e (com vários jogadores) o id. */
export type PosColetor = { x: number; y: number; z: number; id?: string };

export function criarMundoDeItens(
  solido: (x: number, y: number, z: number) => boolean,
): MundoDeItens {
  let itens: ItemSolto[] = [];
  let proximo = 1;
  /** Gravidade, paredes e chão (o item não está sendo puxado por ninguém). */
  function cair(it: ItemSolto, dt: number): void {
    it.vy -= GRAVIDADE * dt;
    const nx = it.x + it.vx * dt;
    const nz = it.z + it.vz * dt;
    if (!solido(Math.floor(nx), Math.floor(it.y), Math.floor(it.z))) it.x = nx;
    else it.vx = 0;
    if (!solido(Math.floor(it.x), Math.floor(it.y), Math.floor(nz))) it.z = nz;
    else it.vz = 0;
    const ny = it.y + it.vy * dt;
    if (it.vy < 0 && solido(Math.floor(it.x), Math.floor(ny - MEIA_ALTURA), Math.floor(it.z))) {
      it.y = Math.floor(ny - MEIA_ALTURA) + 1 + MEIA_ALTURA;
      it.vy = 0;
      it.vx *= 0.5;
      it.vz *= 0.5;
    } else {
      it.y = ny;
    }
    if (it.y < -10) it.qtd = 0;
  }
  return {
    get itens() {
      return itens;
    },
    soltar(item, qtd, x, y, z, rng, dur, arremesso) {
      if (!(qtd > 0)) return;
      // perto de um igual (sem durabilidade): junta na mesma pilha em vez de lotar o chão
      // (o jogado de propósito só junta com o que o mesmo jogador jogou)
      if (dur === undefined) {
        const igual = itens.find(
          (o) =>
            o.item === item &&
            o.dur === undefined &&
            !o.marca &&
            o.de === arremesso?.de &&
            Math.hypot(o.x - x, o.y - y, o.z - z) < 1.5,
        );
        if (igual) {
          igual.qtd += qtd;
          if (arremesso) igual.idade = 0;
          return;
        }
      }
      if (arremesso) {
        const { de, vx, vy, vz } = arremesso;
        itens.push({ id: proximo++, item, qtd, dur, x, y, z, vx, vy, vz, idade: 0, de });
        if (itens.length > MAX_ITENS_SOLTOS) itens.splice(0, itens.length - MAX_ITENS_SOLTOS);
        return;
      }
      const a = rng() * Math.PI * 2;
      itens.push({
        id: proximo++,
        item,
        qtd,
        dur,
        x,
        y,
        z,
        vx: Math.cos(a) * 1.4,
        vy: 3.5 + rng() * 1.5,
        vz: Math.sin(a) * 1.4,
        idade: 0,
      });
      if (itens.length > MAX_ITENS_SOLTOS) itens.splice(0, itens.length - MAX_ITENS_SOLTOS);
    },
    pousar(item, qtd, x, y, z, marca) {
      if (!(qtd > 0)) return;
      itens.push({
        id: proximo++,
        item,
        qtd,
        x,
        y,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        idade: TEMPO_ANTES_DE_COLETAR + 0.05,
        marca,
      });
      if (itens.length > MAX_ITENS_SOLTOS) itens.splice(0, itens.length - MAX_ITENS_SOLTOS);
    },
    tirarMarca(marca) {
      const antes = itens.length;
      itens = itens.filter((i) => i.marca !== marca);
      return antes - itens.length;
    },
    salvar() {
      return itens.map((i) => ({ item: i.item, qtd: i.qtd, dur: i.dur, x: i.x, y: i.y, z: i.z }));
    },
    carregar(dados) {
      if (!Array.isArray(dados)) return;
      itens = [];
      for (const d of dados.slice(0, MAX_ITENS_SOLTOS)) {
        const o = d as Partial<ItemSolto>;
        if (typeof o.item !== 'string' || !(Number(o.qtd) > 0)) continue;
        if (![o.x, o.y, o.z].every((v) => Number.isFinite(v))) continue;
        itens.push({
          id: proximo++,
          item: o.item,
          qtd: Number(o.qtd),
          dur: typeof o.dur === 'number' ? o.dur : undefined,
          x: o.x!,
          y: o.y!,
          z: o.z!,
          vx: 0,
          vy: 0,
          vz: 0,
          // já assentado: pode ser coletado assim que o jogador chegar
          idade: TEMPO_ANTES_DE_COLETAR + 1,
        });
      }
    },
    atualizar(jogadoresDt, jj, coletar) {
      const dt = jogadoresDt;
      const coletados: (Drop & { quem: number; marca?: string })[] = [];
      if (!(dt > 0)) return coletados;
      const js: readonly PosColetor[] = Array.isArray(jj) ? jj : [jj as PosColetor];
      if (js.length === 0) return coletados;
      for (const it of itens) {
        it.idade += dt;
        // passado o tempo, o dono pode pegar como qualquer um (e junta com os outros)
        if (it.de !== undefined && it.idade > TEMPO_DONO_RECOLHER) it.de = undefined;
        // o jogador mais perto (com um só, é ele); quem jogou de propósito espera um pouco
        let quem = -1;
        let melhor = Infinity;
        const donoEspera = it.de !== undefined && it.idade <= TEMPO_DONO_RECOLHER;
        for (let q = 0; q < js.length; q++) {
          if (donoEspera && js[q].id === it.de) continue;
          const dq = Math.hypot(js[q].x - it.x, js[q].y + 0.7 - it.y, js[q].z - it.z);
          if (dq < melhor) {
            melhor = dq;
            quem = q;
          }
        }
        const j = quem >= 0 ? js[quem] : undefined;
        if (!j) {
          cair(it, dt);
          continue;
        }
        const alvoY = j.y + 0.7;
        const dx = j.x - it.x;
        const dy = alvoY - it.y;
        const dz = j.z - it.z;
        const d = Math.hypot(dx, dy, dz);
        const pronto = it.idade > TEMPO_ANTES_DE_COLETAR;
        if (pronto && d < RAIO_COLETA) {
          const resto = coletar(it.item, it.qtd, it.dur, quem);
          if (resto < it.qtd)
            coletados.push({
              item: it.item,
              qtd: it.qtd - resto,
              quem,
              ...(it.marca ? { marca: it.marca } : {}),
            });
          it.qtd = resto;
          if (resto > 0) it.idade = 0;
          continue;
        }
        if (pronto && d < RAIO_ATRACAO) {
          const f = 22 / Math.max(d, 0.3);
          it.vx += dx * f * dt;
          it.vy += dy * f * dt;
          it.vz += dz * f * dt;
          const amort = Math.exp(-dt * 6);
          it.vx *= amort;
          it.vy *= amort;
          it.vz *= amort;
          it.x += it.vx * dt;
          it.y += it.vy * dt;
          it.z += it.vz * dt;
          continue;
        }
        cair(it, dt);
      }
      // junta itens iguais próximos e remove os vazios ou velhos
      for (let a = 0; a < itens.length; a++) {
        const A = itens[a];
        if (A.qtd <= 0 || A.dur !== undefined) continue;
        for (let b = a + 1; b < itens.length; b++) {
          const B = itens[b];
          if (B.qtd <= 0 || B.item !== A.item || B.dur !== undefined || B.de !== A.de) continue;
          if (A.marca || B.marca) continue;
          if (Math.hypot(A.x - B.x, A.y - B.y, A.z - B.z) < 0.6) {
            A.qtd += B.qtd;
            B.qtd = 0;
          }
        }
      }
      itens = itens.filter((it) => it.qtd > 0 && (it.idade < VIDA_ITEM || !!it.marca));
      return coletados;
    },
  };
}
