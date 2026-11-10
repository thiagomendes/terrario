import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  gerarChunk,
  definirEstiloMundo,
  ESTILO_PADRAO,
  indice,
  TAM_X,
  TAM_Z,
  ALTURA,
  NIVEL_MAR,
  TERRENO_NATURAL,
  biomaEm,
  encontrarNascimento,
  olharDoNascimento,
} from '../../src/world/chunk';
import { criarNucleo } from '../../src/nucleo/nucleo';
import {
  planoDaRegiao,
  frenteDaPorta,
  dentroDaCasa,
  limparPovoados,
  noLote,
  REGIAO_POVOADO,
  type PlanoPovoado,
  type UsoSitio,
} from '../../src/world/povoado';
import { Bloco, obterBloco } from '../../src/world/blocks';
import { estiloSeguro } from '../../src/world/estiloSeguro';
import { criarMundoSolido } from '../../src/world/solido';
import { conteudoGerado } from '../../src/jogo/conteineres';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { criarPopulacao, BICHOS_POR_CERCADO, type MundoPopulacao } from '../../src/jogo/populacao';
import { criarGerador } from '../../src/audio/variacao';
import type { EstiloMundo } from '../../src/temas/tipos';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';

/** Estilo de teste: o do Bruma e Luz com o sítio, o moinho e o espantalho (spec 013). */
const SITIO: EstiloMundo = {
  ...obterTema('bruma-e-luz').mundo,
  povoado: {
    casa: 'duas-aguas',
    oficina: 'duas-aguas',
    deposito: 'duas-aguas',
    marco: 'moinho',
    planta: 'sitio',
  },
  estrutura: 'espantalho',
  noite: 'mansa',
};
const SEMENTE = 1337;

beforeAll(() => {
  registrarCatalogo();
  definirEstiloMundo(SITIO);
  limparPovoados();
});
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

/** Sítios das regiões perto da origem. */
function sitios(semente = SEMENTE, raio = 2): PlanoPovoado[] {
  const r: PlanoPovoado[] = [];
  for (let rx = -raio; rx <= raio; rx++)
    for (let rz = -raio; rz <= raio; rz++) {
      const p = planoDaRegiao(rx, rz, semente, TERRENO_NATURAL);
      if (p) r.push(p);
    }
  return r;
}

function mundo(semente = SEMENTE) {
  const cache = new Map<string, Uint8Array>();
  return (x: number, y: number, z: number): number => {
    if (y < 0 || y >= ALTURA) return Bloco.AR;
    const cx = Math.floor(x / TAM_X);
    const cz = Math.floor(z / TAM_Z);
    const k = `${cx},${cz}`;
    let c = cache.get(k);
    if (!c) {
      c = gerarChunk(cx, cz, semente);
      cache.set(k, c);
    }
    return c[indice(x - cx * TAM_X, y, z - cz * TAM_Z)];
  };
}

const lote = (p: PlanoPovoado, uso: UsoSitio) => p.lotes.find((l) => l.uso === uso)!;

describe('sítio: estilo e servidor', () => {
  it('estiloSeguro deixa passar planta, moinho, espantalho e noite', () => {
    expect(estiloSeguro(SITIO)).toEqual(SITIO);
    expect(estiloSeguro(JSON.parse(JSON.stringify(SITIO)))).toEqual(SITIO);
    expect(estiloSeguro({ ...SITIO, noite: 'brava' }).noite).toBeUndefined();
    expect(estiloSeguro({ povoado: { planta: 'cidade' } }).povoado?.planta).toBeUndefined();
  });

  it('o servidor (estilo filtrado) gera o mesmo sítio, o mesmo nascimento e os mesmos blocos', () => {
    const [p] = sitios();
    const chunks = (e: EstiloMundo) => {
      definirEstiloMundo(e);
      limparPovoados();
      const out: number[] = [];
      const n = encontrarNascimento(SEMENTE);
      out.push(n.x, n.z);
      for (let cx = Math.floor(p.minX / 16); cx <= Math.floor(p.maxX / 16); cx++)
        for (let cz = Math.floor(p.minZ / 16); cz <= Math.floor(p.maxZ / 16); cz++)
          out.push(...gerarChunk(cx, cz, SEMENTE));
      return out;
    };
    const cliente = chunks(SITIO);
    const servidor = chunks(estiloSeguro(JSON.parse(JSON.stringify(SITIO))));
    expect(servidor.length).toBe(cliente.length);
    expect(servidor.every((v, i) => v === cliente[i])).toBe(true);
    definirEstiloMundo(SITIO);
  });
});

describe('sítio: planejamento', () => {
  it('tem todos os lotes da roça, três moradores e dois cercados', () => {
    const ps = sitios();
    expect(ps.length).toBeGreaterThanOrEqual(3);
    for (const p of ps) {
      const usos = p.lotes.map((l) => l.uso);
      for (const u of ['fazenda', 'celeiro', 'ferraria', 'silo', 'lavoura', 'curral', 'galinheiro'])
        expect(usos, p.id).toContain(u);
      expect(p.moradores.map((m) => m.profissao).sort()).toEqual([
        'construtor',
        'cozinheiro',
        'ferreiro',
      ]);
      const onde = Object.fromEntries(p.moradores.map((m) => [m.profissao, p.lotes[m.casa].uso]));
      expect(onde).toEqual({ cozinheiro: 'fazenda', construtor: 'celeiro', ferreiro: 'ferraria' });
      expect(p.currais?.map((c) => c.bicho).sort()).toEqual(['cervo', 'coelho']);
      // cabe na região (os chunks de outra região não sabem dele)
      const rx = Math.floor(p.cx / REGIAO_POVOADO);
      const rz = Math.floor(p.cz / REGIAO_POVOADO);
      expect(Math.floor(p.minX / REGIAO_POVOADO)).toBe(rx);
      expect(Math.floor(p.maxX / REGIAO_POVOADO)).toBe(rx);
      expect(Math.floor(p.minZ / REGIAO_POVOADO)).toBe(rz);
      expect(Math.floor(p.maxZ / REGIAO_POVOADO)).toBe(rz);
    }
  });

  it('é determinístico: mesmo plano e mesmos blocos depois de limpar o cache', () => {
    const json = () => JSON.stringify(sitios().map((p) => ({ ...p, caminho: [...p.caminho] })));
    const a = json();
    const [p] = sitios();
    const ida = gerarChunk(Math.floor(p.cx / 16), Math.floor(p.cz / 16), SEMENTE);
    limparPovoados();
    expect(json()).toBe(a);
    const volta = gerarChunk(Math.floor(p.cx / 16), Math.floor(p.cz / 16), SEMENTE);
    expect(volta.every((v, i) => v === ida[i])).toBe(true);
  });

  it('o povoado de sempre não muda de cache com o sítio (chaves separadas)', () => {
    const sitio = sitios().map((p) => p.id);
    definirEstiloMundo(ESTILO_PADRAO);
    const vila = sitios();
    for (const p of vila) expect(p.currais).toBeUndefined();
    definirEstiloMundo(SITIO);
    expect(sitios().map((p) => p.id)).toEqual(sitio);
    for (const p of sitios()) expect(p.currais).toBeDefined();
  });
});

describe('sítio: construções', () => {
  it('toda porta tem passagem de dois blocos e chão na frente, e o miolo da casa é livre', () => {
    for (const sem of [SEMENTE, 1, 2]) {
      const bloco = mundo(sem);
      for (const p of sitios(sem, 1))
        for (const l of p.lotes) {
          const [fx, fz] = frenteDaPorta(l);
          const ctx = `${sem} ${p.id} ${l.uso} ${l.porta}`;
          expect(bloco(fx, l.h + 1, fz), ctx).toBe(Bloco.AR);
          expect(bloco(fx, l.h + 2, fz), ctx).toBe(Bloco.AR);
          expect(bloco(fx, l.h, fz), ctx).not.toBe(Bloco.AR);
          if (l.uso === 'lavoura' || l.uso === 'curral' || l.uso === 'galinheiro') continue;
          // do miolo até a frente, em linha reta no eixo da porta
          for (let f = 3; f >= -1; f--) {
            const [x, z] = noLote(l, 3, f);
            expect(bloco(x, l.h + 1, z), `${ctx} f=${f}`).toBe(Bloco.AR);
            expect(bloco(x, l.h + 2, z), `${ctx} f=${f} alto`).toBe(Bloco.AR);
          }
          const [dx, dz] = dentroDaCasa(l);
          expect(bloco(dx, l.h + 1, dz), `${ctx} miolo`).toBe(Bloco.AR);
        }
    }
  });

  it('cada morador tem cama e bloco de trabalho no lote dele; o silo tem baú', () => {
    const bloco = mundo();
    const conta = (l: { x0: number; z0: number; h: number }, id: number) => {
      let n = 0;
      for (let x = l.x0; x < l.x0 + 7; x++)
        for (let z = l.z0; z < l.z0 + 7; z++)
          for (let y = l.h; y <= l.h + 10; y++) if (bloco(x, y, z) === id) n++;
      return n;
    };
    for (const p of sitios()) {
      expect(conta(lote(p, 'fazenda'), Bloco.CAMA)).toBe(1);
      expect(conta(lote(p, 'fazenda'), Bloco.FORNALHA_ACESA)).toBe(1);
      expect(conta(lote(p, 'celeiro'), Bloco.CAMA)).toBe(1);
      expect(conta(lote(p, 'celeiro'), Bloco.MESA_TRABALHO)).toBe(1);
      expect(conta(lote(p, 'celeiro'), Bloco.BAU)).toBe(1);
      expect(conta(lote(p, 'ferraria'), Bloco.CAMA)).toBe(1);
      expect(conta(lote(p, 'ferraria'), Bloco.FORNALHA)).toBe(1);
      expect(conta(lote(p, 'silo'), Bloco.BAU)).toBe(1);
      // o baú do celeiro está onde o plano diz
      const [x, y, z] = p.bauCeleiro!;
      expect(bloco(x, y, z)).toBe(Bloco.BAU);
    }
  });

  it('o baú do celeiro tem enxada e as três sementes; o do silo, o tesouro de sempre', () => {
    const [p] = sitios();
    const [x, y, z] = p.bauCeleiro!;
    const itens = conteudoGerado(x, y, z, SEMENTE)
      .filter((s) => !!s)
      .map((s) => s!.item);
    expect(itens).toEqual(['enxada_madeira', 'semente_trigo', 'semente_milho', 'semente_abobora']);
    expect(conteudoGerado(x, y, z, SEMENTE)).toEqual(conteudoGerado(x, y, z, SEMENTE));
    const silo = lote(p, 'silo');
    const [sx, sz] = noLote(silo, 3, 4);
    expect(
      conteudoGerado(sx, silo.h + 1, sz, SEMENTE).some((s) => s?.item === 'enxada_madeira'),
    ).toBe(false);
  });

  it('a lavoura está plantada e madura, sobre terra arada', () => {
    const bloco = mundo();
    const maduras = [Bloco.TRIGO_3, Bloco.MILHO_3, Bloco.ABOBOREIRA_3] as number[];
    for (const p of sitios())
      for (const l of p.lotes.filter((q) => q.uso === 'lavoura')) {
        let plantas = 0;
        for (let x = l.x0; x < l.x0 + 7; x++)
          for (let z = l.z0; z < l.z0 + 7; z++) {
            const b = bloco(x, l.h + 1, z);
            if (!maduras.includes(b)) continue;
            plantas++;
            expect(bloco(x, l.h, z)).toBe(Bloco.TERRA_ARADA);
          }
        expect(plantas, p.id).toBe(20);
      }
  });

  it('curral e galinheiro fechados: cerca em volta e uma porteira (não a porta da casa)', () => {
    const bloco = mundo();
    const solido = criarMundoSolido(SEMENTE);
    for (const p of sitios())
      for (const c of p.currais!) {
        const l = p.lotes[c.lote];
        for (let x = l.x0; x < l.x0 + 7; x++)
          for (let z = l.z0; z < l.z0 + 7; z++) {
            const borda = x === l.x0 || x === l.x0 + 6 || z === l.z0 || z === l.z0 + 6;
            if (!borda) continue;
            const porteira = x === c.portao[0] && z === c.portao[1];
            expect(bloco(x, l.h + 1, z), `${p.id} ${l.uso} ${x},${z}`).toBe(
              porteira ? Bloco.PORTEIRA : Bloco.CERCA,
            );
            expect(bloco(x, l.h + 1, z)).not.toBe(Bloco.PORTA);
            // um bloco só de altura: nada de porta de casa em cima
            if (porteira) expect(bloco(x, l.h + 2, z)).toBe(Bloco.AR);
          }
        // a porteira fica num lado de z constante (a porteira gerada, sem metadado, corre em x)
        expect([l.z0, l.z0 + 6]).toContain(c.portao[1]);
        // fechada de verdade: segura como a cerca e atravessa a célula em x (na linha da cerca)
        const [caixa] = solido.caixas!(c.portao[0], l.h + 1, c.portao[1])!;
        expect(solido(c.portao[0], l.h + 1, c.portao[1])).toBe(true);
        expect(caixa[4]).toBe(1.5);
        expect([caixa[0], caixa[3]]).toEqual([0, 1]);
        // dá para chegar: a célula de fora tem chão e dois de ar
        expect(bloco(c.fora[0], l.h + 1, c.fora[1])).toBe(Bloco.AR);
        expect(bloco(c.fora[0], l.h + 2, c.fora[1])).toBe(Bloco.AR);
        expect(bloco(c.fora[0], l.h, c.fora[1])).not.toBe(Bloco.AR);
      }
  });

  it('moinho na praça, acima da cabeça de quem passa no anel dos moradores', () => {
    const bloco = mundo();
    for (const p of sitios()) {
      expect(bloco(p.cx, p.h + 4, p.cz)).toBe(Bloco.LA_BRANCA);
      expect(bloco(p.cx, p.h + 7, p.cz - 2)).toBe(Bloco.MADEIRA_RETORCIDA);
      for (let dx = -4; dx <= 4; dx++)
        for (let dz = -4; dz <= 4; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) < 3) continue;
          if (Math.abs(dx) === 4 && Math.abs(dz) === 4) continue;
          for (const y of [1, 2])
            expect(bloco(p.cx + dx, p.h + y, p.cz + dz), `${dx},${dz},${y}`).toBe(Bloco.AR);
        }
    }
  });
});

describe('sítio: nascimento e espantalho', () => {
  it('o jogador nasce com um sítio a até 60 blocos (18 de 20 sementes) e nunca dentro de um', () => {
    let perto = 0;
    for (let s = 1; s <= 20; s++) {
      const n = encontrarNascimento(s);
      const rx = Math.floor(n.x / REGIAO_POVOADO);
      const rz = Math.floor(n.z / REGIAO_POVOADO);
      let melhor = Infinity;
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const p = planoDaRegiao(rx + dx, rz + dz, s, TERRENO_NATURAL);
          if (!p) continue;
          melhor = Math.min(melhor, Math.hypot(p.cx - n.x, p.cz - n.z));
          const dentro = n.x >= p.minX && n.x <= p.maxX && n.z >= p.minZ && n.z <= p.maxZ;
          expect(dentro, `semente ${s}`).toBe(false);
        }
      if (melhor <= 60) perto++;
    }
    expect(perto).toBeGreaterThanOrEqual(18);
  });

  it('no Rancho Alegre de verdade: sítio a até 60 blocos do nascimento (18 de 20 sementes)', () => {
    const rancho = obterTema('rancho-alegre').mundo;
    expect(rancho.povoado?.planta).toBe('sitio');
    expect(estiloSeguro(rancho)).toEqual(rancho);
    definirEstiloMundo(rancho);
    let perto = 0;
    for (let s = 1; s <= 20; s++) {
      const n = encontrarNascimento(s);
      let melhor = Infinity;
      for (let rx = -3; rx <= 3; rx++)
        for (let rz = -3; rz <= 3; rz++) {
          const p = planoDaRegiao(rx, rz, s, TERRENO_NATURAL);
          if (p) melhor = Math.min(melhor, Math.hypot(p.cx - n.x, p.cz - n.z));
        }
      if (melhor <= 60) perto++;
    }
    definirEstiloMundo(SITIO);
    expect(perto).toBeGreaterThanOrEqual(18);
  });

  it('o jogador nasce olhando para o sítio mais perto (no aparelho e na nuvem)', () => {
    for (let s = 1; s <= 20; s++) {
      const n = encontrarNascimento(s);
      const yaw = olharDoNascimento(s);
      expect(yaw, `semente ${s}`).toBeTypeOf('number');
      // o sítio mais perto do nascimento
      let melhor: PlanoPovoado | null = null;
      for (let rx = -3; rx <= 3; rx++)
        for (let rz = -3; rz <= 3; rz++) {
          const p = planoDaRegiao(rx, rz, s, TERRENO_NATURAL);
          if (
            p &&
            (!melhor ||
              Math.hypot(p.cx - n.x, p.cz - n.z) < Math.hypot(melhor.cx - n.x, melhor.cz - n.z))
          )
            melhor = p;
        }
      if (!melhor || Math.hypot(melhor.cx - n.x, melhor.cz - n.z) > 60) continue;
      // a frente da câmera (seno, cosseno do yaw) aponta para ele
      const d = Math.hypot(melhor.cx - n.x, melhor.cz - n.z);
      const frente = (Math.sin(yaw!) * (melhor.cx - n.x) + Math.cos(yaw!) * (melhor.cz - n.z)) / d;
      expect(frente, `semente ${s}`).toBeGreaterThan(0.99);
      // determinístico
      expect(olharDoNascimento(s)).toBe(yaw);
    }
    // na nuvem: quem chega pela primeira vez já vem virado para o sítio
    const nu = criarNucleo({ semente: SEMENTE, modo: 'sobrevivencia', versaoMundo: 2 });
    nu.conectar('ana', {});
    expect(nu.estado.jogadores.get('ana')!.tel.yaw).toBe(olharDoNascimento(SEMENTE));
    // os outros temas não mudam
    definirEstiloMundo(ESTILO_PADRAO);
    try {
      expect(olharDoNascimento(SEMENTE)).toBeUndefined();
      const nb = criarNucleo({ semente: SEMENTE, modo: 'sobrevivencia', versaoMundo: 2 });
      nb.conectar('ana', {});
      expect(nb.estado.jogadores.get('ana')!.tel.yaw).toBe(0);
    } finally {
      definirEstiloMundo(SITIO);
    }
  });

  it('espantalho: lavoura abandonada, espantalho e baú com sementes', () => {
    // procura um chunk com o espantalho perto da origem
    let achou: [number, number, number] | null = null;
    for (let cx = -20; cx <= 20 && !achou; cx++)
      for (let cz = -20; cz <= 20 && !achou; cz++) {
        const c = gerarChunk(cx, cz, SEMENTE);
        for (let y = 60; y < 110; y++)
          if (c[indice(8, y, 9)] === Bloco.ABOBORA && c[indice(8, y - 1, 9)] === Bloco.LA_AZUL) {
            expect(c[indice(8, y - 3, 8)]).toBe(Bloco.BAU);
            let arada = 0;
            for (let x = 5; x <= 11; x++)
              for (let z = 5; z <= 11; z++)
                if (c[indice(x, y - 4, z)] === Bloco.TERRA_ARADA) arada++;
            expect(arada).toBeGreaterThan(10);
            achou = [cx * 16 + 8, y - 3, cz * 16 + 8];
            break;
          }
      }
    expect(achou).not.toBeNull();
    const itens = conteudoGerado(...achou!, SEMENTE).map((s) => s?.item);
    expect(itens).toContain('semente_trigo');
  });
});

describe('sítio: bichos nos cercados', () => {
  function mundoReal(p: PlanoPovoado, semente = SEMENTE): MundoPopulacao {
    const bloco = mundo(semente);
    const solido = criarMundoSolido(semente);
    return {
      solido,
      agua: (x, y, z) => bloco(x, y, z) === Bloco.AGUA,
      luzBloco: () => 12,
      ceuAberto: () => true,
      bioma: (x, z) => biomaEm(x, z, semente),
      superficie: (x, z) => {
        for (let y = ALTURA - 2; y > 0; y--) if (obterBloco(bloco(x, y, z))?.solido) return y + 1;
        return null;
      },
      nivelMar: NIVEL_MAR,
      povoados: (x, z, r) => (Math.hypot(p.cx - x, p.cz - z) <= r ? [p] : []),
    };
  }

  it.each([SEMENTE, 1, 2, 42])('semente %i: 3 por cercado, que não fogem em 5 minutos', (sem) => {
    const [p] = sitios(sem);
    const m = mundoReal(p, sem);
    const pop = criarPopulacao(criarGerador(5));
    const c0 = p.currais![0];
    const j = { x: c0.fora[0] + 0.5, y: p.h + 1, z: c0.fora[1] + 0.5, vivo: true, criativo: true };
    for (let i = 0; i < 3000; i++) {
      pop.atualizar(0.1, m, j, 0);
      if (i % 100 !== 99) continue;
      p.currais!.forEach((c, k) => {
        const bichos = pop.lista.filter((b) => b.curral === `${p.id}:${k}`);
        expect(bichos.length, `cercado ${k}`).toBe(BICHOS_POR_CERCADO);
        const l = p.lotes[c.lote];
        for (const b of bichos) {
          expect(b.tipo).toBe(c.bicho);
          const dentro = b.x > l.x0 && b.x < l.x0 + 7 && b.z > l.z0 && b.z < l.z0 + 7;
          expect(
            dentro,
            `${b.tipo} em ${b.x.toFixed(2)},${b.y.toFixed(2)},${b.z.toFixed(2)} lote ${l.uso} ${l.x0},${l.z0},${l.h} ${l.porta} portao ${c.portao} (minuto ${i / 600})`,
          ).toBe(true);
        }
      });
    }
  });

  it('somem quando o jogador vai longe e voltam com o sítio, sem passar de 3', () => {
    const [p] = sitios();
    const m = mundoReal(p);
    const pop = criarPopulacao(criarGerador(9));
    const perto = { x: p.cx + 0.5, y: p.h + 1, z: p.cz + 0.5, vivo: true, criativo: true };
    const longe = { ...perto, x: p.cx + 300 };
    const conta = () => pop.lista.filter((b) => b.curral).length;
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, perto, 0);
    expect(conta()).toBe(2 * BICHOS_POR_CERCADO);
    // um bicho morre: não renasce enquanto o jogador está ali
    const b = pop.lista.find((c) => c.curral)!;
    b.estado = 'morrendo';
    b.dissolver = 1;
    for (let i = 0; i < 50; i++) pop.atualizar(0.1, m, perto, 0);
    expect(conta()).toBe(2 * BICHOS_POR_CERCADO - 1);
    // vai longe: somem todos; volta: os 6 de novo
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, longe, 0);
    expect(conta()).toBe(0);
    for (let i = 0; i < 30; i++) pop.atualizar(0.1, m, perto, 0);
    expect(conta()).toBe(2 * BICHOS_POR_CERCADO);
  });
});
