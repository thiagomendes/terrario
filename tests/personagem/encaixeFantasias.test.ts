import { describe, expect, it } from 'vitest';
import {
  CORPOS,
  ESTILOS_CABELO,
  ESTILOS_ROSTO,
  IDS_MODELOS,
  aparenciaPadrao,
  aplicarCorpo,
  vestirFantasia,
  type Aparencia,
} from '../../src/personagem/aparencia';
import { planoBoneco, type PlanoBoneco } from '../../src/personagem/boneco';
import { FANTASIAS, type TipoPeca } from '../../src/personagem/fantasias';
import {
  EH_CABELO,
  conferirEncaixe,
  conferirMembros,
  girosDaPose,
  medirPeca,
  posesDeTeste,
} from './encaixe';

/** A criança com a fantasia vestida (inteira, ou sem as peças opcionais). */
function vestido(base: Aparencia, id: string, semOpcionais = false): Aparencia {
  const a = vestirFantasia(base, id);
  if (!semOpcionais || !a.fantasia) return a;
  const def = FANTASIAS.find((f) => f.id === id)!;
  const sem = def.visual[a.corpo].pecas.filter((p) => p.opcional).map((p) => p.tipo);
  return { ...a, fantasia: { ...a.fantasia, sem: sem as TipoPeca[] } };
}

function chaveDoPlano(plano: PlanoBoneco): string {
  return JSON.stringify([
    plano.juntas,
    plano.pecas.map((p) => [p.nome, p.junta, p.forma, p.tamanho, p.raio, p.pos, p.rot, p.apoio]),
  ]);
}

describe('fantasias no boneco (spec 017, T03)', () => {
  it('toda peça da fantasia encosta no boneco, sem tapar o rosto nem cabelo atravessando', () => {
    const falhas: string[] = [];
    const ja = new Map<string, string[]>();
    let combinacoes = 0;
    // a cabeça é igual em todo modelo: todos os cabelos num modelo, e todos os modelos (o
    // tronco, os braços e as pernas mudam) com o cabelo curto e o comprido
    const casos: Array<[string, number]> = [
      ...[...Array(ESTILOS_CABELO).keys()].map((c) => ['andarilho', c] as [string, number]),
      ...IDS_MODELOS.filter((m) => m !== 'andarilho').flatMap((m) => [
        [m, 0] as [string, number],
        [m, 2] as [string, number],
      ]),
    ];
    for (const f of FANTASIAS)
      for (const [modelo, cabeloEstilo] of casos)
        for (const corpo of CORPOS)
          for (const semOpcionais of [false, true]) {
            const base = {
              ...aplicarCorpo(aparenciaPadrao(modelo as (typeof IDS_MODELOS)[number]), corpo),
              cabeloEstilo,
            };
            const plano = planoBoneco(vestido(base, f.id, semOpcionais));
            combinacoes++;
            const chave = chaveDoPlano(plano);
            let achados = ja.get(chave);
            if (!achados) {
              achados = conferirEncaixe(plano).map(
                (p) => `${p.tipo} ${p.peca}${p.outra ? `/${p.outra}` : ''} ${p.medida.toFixed(3)}`,
              );
              ja.set(chave, achados);
            }
            for (const x of achados)
              falhas.push(
                `${f.id}${semOpcionais ? ' (sem opcionais)' : ''} ${modelo} ${corpo} cabelo ${cabeloEstilo}: ${x}`,
              );
          }
    expect(combinacoes).toBe(FANTASIAS.length * casos.length * 2 * 2);
    expect(falhas.slice(0, 40)).toEqual([]);
  });

  it('as peças novas estão marcadas com o apoio, e a fantasia não troca quem a criança é', () => {
    for (const f of FANTASIAS)
      for (const corpo of CORPOS) {
        const base = aplicarCorpo(aparenciaPadrao('tecela'), corpo);
        const sem = planoBoneco(base);
        const com = planoBoneco(vestido(base, f.id));
        const antes = new Set(sem.pecas.map((p) => p.nome));
        const novas = com.pecas.filter((p) => !antes.has(p.nome) && !EH_CABELO.test(p.nome));
        expect(novas.length, `${f.id} ${corpo}`).toBeGreaterThan(0);
        for (const p of novas) expect(p.apoio, `${f.id} ${corpo} ${p.nome}`).toBeTruthy();
        // pele, rosto e cabelo continuam os dela
        expect(com.cores.pele).toBe(sem.cores.pele);
        expect(com.cores.cabelo).toBe(sem.cores.cabelo);
        const cabeca = (pl: PlanoBoneco) =>
          pl.pecas.filter((p) => p.nome === 'cabeca' || /^(boca|bochecha)/.test(p.nome));
        expect(cabeca(com)).toEqual(cabeca(sem));
      }
  });

  it('a princesa tem saia e o príncipe não; a heroína continua com o cabelo dela', () => {
    for (const f of FANTASIAS.filter((x) => x.grupo === 'realeza')) {
      const menina = planoBoneco(vestido(aplicarCorpo(aparenciaPadrao(), 'feminino'), f.id));
      const menino = planoBoneco(vestido(aplicarCorpo(aparenciaPadrao(), 'masculino'), f.id));
      expect(menina.pecas.some((p) => p.junta === 'saia')).toBe(true);
      expect(menino.pecas.some((p) => p.junta === 'saia')).toBe(false);
      expect(menino.pecas.some((p) => p.nome === 'casaco')).toBe(true);
      expect(menino.pecas.some((p) => p.nome.startsWith('coroa'))).toBe(true);
    }
    // rabo de cavalo e cílios na heroína
    const heroina = planoBoneco(
      vestido(
        { ...aplicarCorpo(aparenciaPadrao(), 'feminino'), cabeloEstilo: 5, rosto: 1 },
        'heroi-estrela',
      ),
    );
    expect(heroina.pecas.some((p) => p.nome === 'rabo')).toBe(true);
    expect(heroina.pecas.some((p) => p.nome.startsWith('cilio'))).toBe(true);
    // no capuz de dino o rabo de cavalo sai por baixo
    const dino = planoBoneco(
      vestido({ ...aplicarCorpo(aparenciaPadrao(), 'feminino'), cabeloEstilo: 5 }, 'dino'),
    );
    expect(dino.pecas.some((p) => p.nome === 'rabo')).toBe(true);
  });

  it('dentro do capacete de bolha cabe o cabelo e o rosto inteiros (todo cabelo e rosto)', () => {
    const falhas: string[] = [];
    for (const corpo of CORPOS)
      for (let cabeloEstilo = 0; cabeloEstilo < ESTILOS_CABELO; cabeloEstilo++)
        for (let rosto = 0; rosto < ESTILOS_ROSTO; rosto++) {
          const plano = planoBoneco(
            vestido(
              { ...aplicarCorpo(aparenciaPadrao(), corpo), cabeloEstilo, rosto },
              'astronauta',
            ),
          );
          const bolha = plano.pecas.find((p) => p.nome === 'bolha')!;
          const vidro = medirPeca(plano, bolha);
          for (const p of plano.pecas.filter((p) => p.junta === 'cabeca' && !p.apoio)) {
            const pior = Math.max(
              ...medirPeca(plano, p, {}, 8).pontos.map((q) => vidro.distancia(q)),
            );
            if (pior > 0)
              falhas.push(
                `${corpo} cabelo ${cabeloEstilo} rosto ${rosto}: ${p.nome} ${pior.toFixed(3)}`,
              );
          }
        }
    expect(falhas).toEqual([]);
  });

  it('com fantasia, braços, pernas e cabeça continuam presos em todas as poses', () => {
    const poses = posesDeTeste();
    const falhas: string[] = [];
    for (const f of FANTASIAS)
      for (const corpo of CORPOS) {
        const plano = planoBoneco(vestido(aplicarCorpo(aparenciaPadrao(), corpo), f.id));
        for (const p of poses)
          for (const x of conferirMembros(plano, girosDaPose(p)))
            falhas.push(
              `${f.id} ${corpo}: ${x.tipo} ${x.junta} ${x.medida.toFixed(3)} (${p.nome})`,
            );
      }
    expect(falhas.slice(0, 20)).toEqual([]);
  });
});
