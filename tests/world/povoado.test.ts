import { describe, expect, it } from 'vitest';
import {
  gerarChunk,
  definirEstiloMundo,
  ESTILO_PADRAO,
  indice,
  TAM_X,
  TAM_Z,
  ALTURA,
  TERRENO_NATURAL,
  alturaTerreno,
  encontrarNascimento,
} from '../../src/world/chunk';
import {
  planoDaRegiao,
  frenteDaPorta,
  limparPovoados,
  definirRegioesSemPovoado,
  regiaoDoChunk,
  REGIAO_POVOADO,
  type FormaCasa,
  type FormaMarco,
  type PlanoPovoado,
} from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';

const SEMENTE = 1337;

/** Primeiros povoados perto da origem. */
function povoados(n: number, semente = SEMENTE): PlanoPovoado[] {
  const r: PlanoPovoado[] = [];
  for (let raio = 0; raio < 8 && r.length < n; raio++)
    for (let rz = -raio; rz <= raio; rz++)
      for (let rx = -raio; rx <= raio; rx++) {
        if (Math.max(Math.abs(rx), Math.abs(rz)) !== raio) continue;
        const p = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
        if (p && r.length < n) r.push(p);
      }
  return r;
}

/** Leitor de blocos em coordenadas de mundo, gerando chunks sob demanda. */
function mundo() {
  const cache = new Map<string, Uint8Array>();
  return (x: number, y: number, z: number): number => {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    let c = cache.get(k);
    if (!c) {
      c = gerarChunk(cx, cz, SEMENTE);
      cache.set(k, c);
    }
    return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  };
}

/** Contagem dos blocos funcionais dentro da caixa do povoado. */
function funcionais(p: PlanoPovoado, bloco: (x: number, y: number, z: number) => number) {
  const n: Record<string, number> = {};
  const conta = [
    Bloco.CAMA,
    Bloco.BAU,
    Bloco.MESA_TRABALHO,
    Bloco.FORNALHA,
    Bloco.FORNALHA_ACESA,
    Bloco.TOCHA,
    Bloco.LANTERNA,
  ];
  for (let x = p.minX; x <= p.maxX; x++)
    for (let z = p.minZ; z <= p.maxZ; z++)
      for (let y = p.h - 2; y <= p.h + 12; y++) {
        const b = bloco(x, y, z);
        if (conta.includes(b as never)) n[b] = (n[b] ?? 0) + 1;
      }
  return n;
}

describe('povoados: planejamento', () => {
  it('há povoados perto da origem, com as 3 oficinas, o depósito e casas', () => {
    const ps = povoados(3);
    expect(ps.length).toBeGreaterThanOrEqual(2);
    for (const p of ps) {
      const tipos = p.lotes.map((l) => `${l.tipo}${l.tipo === 'oficina' ? '/' + l.profissao : ''}`);
      expect(tipos).toContain('oficina/ferreiro');
      expect(tipos).toContain('oficina/cozinheiro');
      expect(tipos).toContain('oficina/construtor');
      expect(tipos.filter((t) => t === 'deposito').length).toBe(1);
      const casas = p.lotes.filter((l) => l.tipo === 'casa').length;
      expect(casas).toBeGreaterThanOrEqual(2);
      expect(casas).toBeLessThanOrEqual(6);
      expect(p.moradores.length).toBe(casas);
      // o povoado cabe na própria região
      const rx = Math.floor(p.cx / REGIAO_POVOADO);
      const rz = Math.floor(p.cz / REGIAO_POVOADO);
      expect(Math.floor(p.minX / REGIAO_POVOADO)).toBe(rx);
      expect(Math.floor(p.maxX / REGIAO_POVOADO)).toBe(rx);
      expect(Math.floor(p.minZ / REGIAO_POVOADO)).toBe(rz);
      expect(Math.floor(p.maxZ / REGIAO_POVOADO)).toBe(rz);
    }
  });

  it('é determinístico: mesmo plano depois de limpar o cache', () => {
    const a = JSON.stringify(povoados(2).map((p) => ({ ...p, caminho: [...p.caminho] })));
    limparPovoados();
    const b = JSON.stringify(povoados(2).map((p) => ({ ...p, caminho: [...p.caminho] })));
    expect(b).toBe(a);
  });

  it('chunks gerados em qualquer ordem dão o mesmo povoado', () => {
    const [p] = povoados(1);
    const cxs: [number, number][] = [];
    for (let cx = Math.floor(p.minX / 16); cx <= Math.floor(p.maxX / 16); cx++)
      for (let cz = Math.floor(p.minZ / 16); cz <= Math.floor(p.maxZ / 16); cz++)
        cxs.push([cx, cz]);
    const ida = cxs.map(([cx, cz]) => gerarChunk(cx, cz, SEMENTE));
    limparPovoados();
    const volta = [...cxs]
      .reverse()
      .map(([cx, cz]) => gerarChunk(cx, cz, SEMENTE))
      .reverse();
    ida.forEach((c, i) => expect(volta[i].every((v, k) => v === c[k])).toBe(true));
  });
});

describe('povoados: terreno e construções', () => {
  it('nenhum degrau maior que um bloco em volta dos lotes e da praça (6 sementes)', () => {
    const todos: [PlanoPovoado, number][] = [];
    for (const s of [1, 2, 3, 7, 42, SEMENTE]) for (const p of povoados(4, s)) todos.push([p, s]);
    expect(todos.length).toBeGreaterThan(10);
    for (const [p, SEMENTE] of todos) {
      const degraus: string[] = [];
      for (let x = p.minX; x < p.maxX; x++)
        for (let z = p.minZ; z < p.maxZ; z++) {
          const h = alturaTerreno(x, z, SEMENTE);
          for (const [dx, dz] of [
            [1, 0],
            [0, 1],
          ]) {
            const h2 = alturaTerreno(x + dx, z + dz, SEMENTE);
            // só dentro da área mexida pelo povoado (o resto é o relevo natural)
            const natural = TERRENO_NATURAL.altura(x, z, SEMENTE);
            const natural2 = TERRENO_NATURAL.altura(x + dx, z + dz, SEMENTE);
            if (h === natural && h2 === natural2) continue;
            // degrau acima de 1 só onde o relevo natural já tinha um degrau desse tamanho
            if (Math.abs(h - h2) > Math.max(1, Math.abs(natural - natural2)))
              degraus.push(`${x},${z} ${h}->${h2}`);
          }
        }
      expect(degraus, p.id).toEqual([]);
    }
  });

  it('em toda forma, a porta tem passagem livre do miolo da casa até a frente', () => {
    const [p] = povoados(1);
    for (const casa of ['duas-aguas', 'cupula', 'tenda', 'redonda', 'modulo'] as FormaCasa[]) {
      definirEstiloMundo({
        ...ESTILO_PADRAO,
        povoado: { casa, oficina: casa, deposito: casa, marco: 'poco' },
      });
      const bloco = mundo();
      for (const l of p.lotes) {
        const [fx, fz] = frenteDaPorta(l);
        const cx = l.x0 + 3;
        const cz = l.z0 + 3;
        // do centro do lote até a frente da porta, em linha reta no eixo da porta
        const passos = Math.max(Math.abs(fx - cx), Math.abs(fz - cz));
        for (let k = 0; k <= passos; k++) {
          const x = cx + Math.sign(fx - cx) * k;
          const z = cz + Math.sign(fz - cz) * k;
          expect(bloco(x, l.h + 1, z), `${casa} ${l.tipo} ${l.porta} passo ${k}`).toBe(Bloco.AR);
          expect(bloco(x, l.h + 2, z), `${casa} ${l.tipo} ${l.porta} passo ${k} alto`).toBe(
            Bloco.AR,
          );
        }
      }
    }
    definirEstiloMundo(ESTILO_PADRAO);
  });

  it('toda porta tem passagem livre de dois blocos e chão na frente', () => {
    const bloco = mundo();
    for (const p of povoados(3))
      for (const l of p.lotes) {
        const [fx, fz] = frenteDaPorta(l);
        expect(bloco(fx, l.h + 1, fz), `${p.id} ${l.tipo} frente`).toBe(Bloco.AR);
        expect(bloco(fx, l.h + 2, fz), `${p.id} ${l.tipo} frente alto`).toBe(Bloco.AR);
        expect(bloco(fx, l.h, fz), `${p.id} ${l.tipo} chão`).not.toBe(Bloco.AR);
      }
  });

  it('cada casa tem cama, cada oficina o bloco da profissão, o depósito um baú', () => {
    const bloco = mundo();
    for (const p of povoados(2)) {
      const n = funcionais(p, bloco);
      const casas = p.lotes.filter((l) => l.tipo === 'casa').length;
      expect(n[Bloco.CAMA]).toBe(casas);
      expect(n[Bloco.BAU]).toBe(1);
      expect(n[Bloco.MESA_TRABALHO]).toBe(1);
      expect(n[Bloco.FORNALHA]).toBe(1);
      expect(n[Bloco.FORNALHA_ACESA]).toBe(1);
      expect(n[Bloco.TOCHA]).toBe(p.lotes.length);
      // 4 postes da praça e o marco
      expect(n[Bloco.LANTERNA]).toBe(5);
    }
  });

  it('todas as formas dão a mesma mecânica (blocos funcionais iguais)', () => {
    const [p] = povoados(1);
    const casas: FormaCasa[] = ['duas-aguas', 'cupula', 'tenda', 'redonda', 'modulo'];
    const marcos: FormaMarco[] = ['poco', 'fonte', 'antena', 'totem', 'esqueleto'];
    let ref: string | null = null;
    casas.forEach((casa, i) => {
      definirEstiloMundo({
        ...ESTILO_PADRAO,
        povoado: { casa, oficina: casa, deposito: casa, marco: marcos[i] },
      });
      const n = JSON.stringify(funcionais(p, mundo()));
      if (ref === null) ref = n;
      expect(n, casa).toBe(ref);
    });
    definirEstiloMundo(ESTILO_PADRAO);
  });
});

describe('povoados: robustez', () => {
  it('o jogador nunca nasce dentro de um povoado (30 sementes)', () => {
    for (let s = 1; s <= 30; s++) {
      const n = encontrarNascimento(s);
      const rx = Math.floor(n.x / REGIAO_POVOADO);
      const rz = Math.floor(n.z / REGIAO_POVOADO);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const p = planoDaRegiao(rx + dx, rz + dz, s, TERRENO_NATURAL);
          if (!p) continue;
          const dentro = n.x >= p.minX && n.x <= p.maxX && n.z >= p.minZ && n.z <= p.maxZ;
          expect(dentro, `semente ${s}`).toBe(false);
        }
    }
  });

  it('mundo antigo: região com edição do jogador não ganha povoado', () => {
    const [p] = povoados(1);
    const rx = Math.floor(p.cx / REGIAO_POVOADO);
    const rz = Math.floor(p.cz / REGIAO_POVOADO);
    const cx = Math.floor(p.cx / 16);
    const cz = Math.floor(p.cz / 16);
    expect(regiaoDoChunk(cx, cz)).toBe(`${rx},${rz}`);
    definirRegioesSemPovoado([regiaoDoChunk(cx, cz)]);
    expect(planoDaRegiao(rx, rz, SEMENTE, TERRENO_NATURAL)).toBeNull();
    // e o terreno ali volta a ser o natural
    expect(alturaTerreno(p.cx, p.cz, SEMENTE)).toBe(TERRENO_NATURAL.altura(p.cx, p.cz, SEMENTE));
    definirRegioesSemPovoado([]);
    expect(planoDaRegiao(rx, rz, SEMENTE, TERRENO_NATURAL)).not.toBeNull();
  });
});
