import { describe, expect, it } from 'vitest';
import {
  ACESSORIOS,
  CORPOS,
  ESTILOS_CABELO,
  IDS_MODELOS,
  aparenciaPadrao,
  aplicarCorpo,
} from '../../src/personagem/aparencia';
import {
  planoBoneco,
  rotacoesDaPose,
  topoBoneco,
  type PlanoBoneco,
} from '../../src/personagem/boneco';
import { GESTOS, aplicarGesto } from '../../src/personagem/gestos';
import { calcularPose, type EntradaPose, type Pose } from '../../src/personagem/poses';
import { AMPLITUDE_ANDAR, AMPLITUDE_CORRER } from '../../src/personagem/vida';
import { moradorDeBrinquedo } from '../../src/render/moradorBoneco';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { generoDoMorador } from '../../src/temas/nomes';
import type { Profissao } from '../../src/world/povoado';
import {
  EH_ROSTO,
  FOLGA_MAXIMA,
  conferirEncaixe,
  conferirMembros,
  distanciaEntre,
  medirPeca,
  type GirosJuntas,
} from './encaixe';

/** Poses de teste: parado, a passada inteira andando e correndo, pulo, voo, golpe, comer e os 8 gestos. */
function posesDeTeste(): Array<{ nome: string; pose: Pose; olhar: number; segurando: boolean }> {
  const lista: Array<{ nome: string; pose: Pose; olhar: number; segurando: boolean }> = [];
  const entrada = (e: Partial<EntradaPose>): EntradaPose => ({
    andando: false,
    correndo: false,
    noAr: false,
    minerando: false,
    colocando: false,
    tempo: 0,
    ...e,
  });
  const por = (nome: string, e: Partial<EntradaPose>, olhar = 0, segurando = false) =>
    lista.push({ nome, pose: calcularPose(entrada(e)), olhar, segurando });
  por('parado', {});
  for (let i = 0; i < 12; i++) {
    const fase = (i / 12) * Math.PI * 2;
    por(`andar ${i}`, { andando: true, passo: { fase, amplitude: AMPLITUDE_ANDAR } });
    por(`correr ${i}`, {
      andando: true,
      correndo: true,
      passo: { fase, amplitude: AMPLITUDE_CORRER },
      inclina: 0.22,
      roll: i % 2 ? 0.2 : -0.2,
    });
  }
  por('pulo', { noAr: true, passo: { fase: 0, amplitude: 0 } });
  por('pulo antigo', { noAr: true });
  por('agachar', { agacha: 1, afundar: 1 });
  for (let t = 0; t < 4; t += 0.5) por(`voar ${t}`, { voando: true, tempo: t });
  for (const olhar of [-0.9, 0, 0.9])
    for (let i = 0; i < 10; i++)
      por(`minerar ${olhar} ${i}`, { minerando: true, tempo: i * 0.025 }, olhar, true);
  por('colocar', { colocando: true, progressoColocar: 0.5 }, 0, true);
  for (const c of [0.3, 0.6]) por(`comer ${c}`, { comendo: c, tempo: c }, 0, true);
  for (const g of GESTOS) {
    const dur = Number.isFinite(g.duracao) ? g.duracao : 1.5;
    for (let f = 0.2; f <= dur; f += 0.1) {
      const base = calcularPose(entrada({ tempo: f }));
      lista.push({
        nome: `${g.id} ${f.toFixed(1)}`,
        pose: aplicarGesto(base, g.id, f),
        olhar: 0,
        segurando: false,
      });
    }
  }
  return lista;
}

function girosDaPose(p: { pose: Pose; olhar: number; segurando: boolean }): GirosJuntas {
  const r = rotacoesDaPose(p.pose, p.olhar, p.segurando);
  return {
    corpo: r.corpo,
    tronco: r.tronco,
    cabeca: r.cabeca,
    topete: r.topete,
    bracoD: r.bracoD,
    bracoE: r.bracoE,
    pernaD: r.pernaD,
    pernaE: r.pernaE,
  };
}

/** Confere os membros de um plano em todas as poses de teste (pior vão de cada problema). */
function membrosSoltos(plano: PlanoBoneco, rotulo: string): string[] {
  const pior = new Map<string, { medida: number; pose: string }>();
  for (const p of posesDeTeste())
    for (const m of conferirMembros(plano, girosDaPose(p))) {
      const k = `${m.tipo} ${m.junta}`;
      if ((pior.get(k)?.medida ?? 0) < m.medida) pior.set(k, { medida: m.medida, pose: p.nome });
    }
  return [...pior].map(([k, v]) => `${rotulo}: ${k} ${v.medida.toFixed(3)} (${v.pose})`);
}

describe('encaixe dos acessórios (spec 017, T01)', () => {
  it('todo enfeite encosta na cabeça ou no corpo, sem tapar o rosto nem ser atravessado', () => {
    const falhas: string[] = [];
    // a cabeça é igual em todo corpo: guarda a conta pela forma das peças
    const ja = new Map<string, string[]>();
    let combinacoes = 0;
    for (const modelo of IDS_MODELOS)
      for (const corpo of CORPOS)
        for (let cabeloEstilo = 0; cabeloEstilo < ESTILOS_CABELO; cabeloEstilo++)
          for (const acessorio of ACESSORIOS) {
            const a = { ...aplicarCorpo(aparenciaPadrao(modelo), corpo), cabeloEstilo, acessorio };
            const plano = planoBoneco(a);
            combinacoes++;
            const chave = JSON.stringify([
              plano.juntas,
              plano.pecas.map((p) => [
                p.nome,
                p.junta,
                p.forma,
                p.tamanho,
                p.raio,
                p.pos,
                p.rot,
                p.apoio,
              ]),
            ]);
            let achados = ja.get(chave);
            if (!achados) {
              achados = conferirEncaixe(plano).map(
                (p) => `${p.tipo} ${p.peca}${p.outra ? `/${p.outra}` : ''} ${p.medida.toFixed(3)}`,
              );
              ja.set(chave, achados);
            }
            for (const f of achados)
              falhas.push(`${modelo} ${corpo} cabelo ${cabeloEstilo} ${acessorio}: ${f}`);
          }
    expect(combinacoes).toBe(IDS_MODELOS.length * 2 * ESTILOS_CABELO * ACESSORIOS.length);
    expect(falhas).toEqual([]);
  });

  it('os acessórios estão marcados com o apoio (cabeça, tronco ou mão)', () => {
    for (const acessorio of ACESSORIOS) {
      const plano = planoBoneco({ ...aparenciaPadrao(), acessorio });
      const enfeites = plano.pecas.filter((p) => p.apoio);
      if (acessorio === 'nenhum') expect(enfeites).toEqual([]);
      else expect(enfeites.length, acessorio).toBeGreaterThan(0);
    }
  });

  it('o chapéu do morador assenta no cabelo do boneco, sem cabelo atravessando', () => {
    const falhas: string[] = [];
    let chapeus = 0;
    for (const id of temasDisponiveis()) {
      const pov = obterTema(id).povoado;
      if (!pov) continue;
      for (const prof of Object.keys(pov.moradores) as Profissao[])
        for (let n = 0; n < 30; n++) {
          const m = moradorDeBrinquedo(
            pov.moradores[prof],
            n,
            generoDoMorador('p', n, prof),
            pov.acessorios?.[prof],
          );
          const plano = m.ajustar(planoBoneco(m.aparencia));
          const rotulo = `${id} ${prof} cabelo ${m.aparencia.cabeloEstilo}`;
          for (const p of conferirEncaixe(plano))
            if (p.tipo === 'cabelo') falhas.push(`${rotulo}: ${p.peca} ${p.medida.toFixed(3)}`);
          const chapeu = plano.pecas.filter((p) => p.nome.startsWith('chapeu-tema'));
          if (!chapeu.length) continue;
          chapeus++;
          // a peça mais perto do cabelo (a aba ou a borda da touca) encosta nele
          const cabeca = plano.pecas
            .filter((p) => !p.apoio && (p.junta === 'cabeca' || p.junta === 'topete'))
            .map((p) => medirPeca(plano, p));
          let folga = Infinity;
          for (const c of chapeu.map((p) => medirPeca(plano, p)))
            for (const s of cabeca) folga = Math.min(folga, distanciaEntre(c, s, folga));
          if (folga > FOLGA_MAXIMA) falhas.push(`${rotulo}: chapéu solto ${folga.toFixed(3)}`);
        }
    }
    expect(chapeus).toBeGreaterThan(0);
    expect(falhas).toEqual([]);
  });

  it('braços, pernas e cabeça ficam presos no tronco em todas as poses e gestos', () => {
    const falhas: string[] = [];
    for (const modelo of IDS_MODELOS)
      for (const corpo of CORPOS) {
        const plano = planoBoneco(aplicarCorpo(aparenciaPadrao(modelo), corpo));
        falhas.push(...membrosSoltos(plano, `${modelo} ${corpo}`));
      }
    expect(falhas).toEqual([]);
  });

  it('os moradores (o mesmo boneco com as peças do tema) também ficam inteiros', () => {
    const falhas: string[] = [];
    for (const id of temasDisponiveis()) {
      const pov = obterTema(id).povoado;
      if (!pov) continue;
      for (const prof of Object.keys(pov.moradores) as Profissao[]) {
        const m = moradorDeBrinquedo(
          pov.moradores[prof],
          1,
          generoDoMorador('p', 1, prof),
          pov.acessorios?.[prof],
        );
        falhas.push(...membrosSoltos(m.ajustar(planoBoneco(m.aparencia)), `${id} ${prof}`));
      }
    }
    expect(falhas).toEqual([]);
  });

  it('os enfeites dos moradores (visor, óculos, gravata, botões, antenas) encostam no boneco', () => {
    // todo tema × profissão × boneco sorteado (modelo, corpo, cabelo e rosto mudam com o número
    // do morador), nos dois gêneros
    const falhas = new Set<string>();
    let moradores = 0;
    let placas = 0;
    const poses = posesDeTeste().filter((_, i) => i % 3 === 0);
    for (const id of temasDisponiveis()) {
      const pov = obterTema(id).povoado;
      if (!pov) continue;
      for (const prof of Object.keys(pov.moradores) as Profissao[])
        for (const genero of ['f', 'm'] as const)
          for (let n = 0; n < 30; n++) {
            const m = moradorDeBrinquedo(pov.moradores[prof], n, genero, pov.acessorios?.[prof]);
            const plano = m.ajustar(planoBoneco(m.aparencia));
            moradores++;
            const rotulo = `${id} ${prof} ${m.aparencia.modelo}`;
            for (const p of conferirEncaixe(plano))
              falhas.add(
                `${rotulo}: ${p.tipo} ${p.peca}${p.outra ? `/${p.outra}` : ''} ${p.medida.toFixed(3)}`,
              );
            // toda peça do tema é um enfeite marcado (senão a régua não a mede)
            for (const p of plano.pecas)
              if (/^(extra|chapeu-tema)-/.test(p.nome) && !p.apoio)
                falhas.add(`${rotulo}: ${p.nome} sem apoio`);
            // a placa do rosto (pele atrás do visor, tela do robô): embutida na frente da
            // cabeça, e o rosto do boneco por cima dela, encostado e à mostra
            const placa = plano.pecas.find((p) => p.nome === 'rosto-tema');
            if (placa) {
              placas++;
              const mp = medirPeca(plano, placa);
              const cabeca = medirPeca(plano, plano.pecas.find((p) => p.nome === 'cabeca')!);
              const folga = distanciaEntre(mp, cabeca);
              if (folga > FOLGA_MAXIMA)
                falhas.add(`${rotulo}: placa do rosto solta ${folga.toFixed(3)}`);
              const rosto = plano.pecas.filter((p) => EH_ROSTO.test(p.nome));
              const medidasRosto = rosto.map((r) => medirPeca(plano, r));
              for (const mr of medidasRosto) {
                const r = mr.peca;
                // encosta na placa, na cabeça ou noutra peça do rosto (o brilho no olho)
                const d = Math.min(
                  distanciaEntre(mr, mp),
                  distanciaEntre(mr, cabeca),
                  ...medidasRosto.filter((o) => o !== mr).map((o) => distanciaEntre(mr, o, 0.05)),
                );
                if (d > FOLGA_MAXIMA)
                  falhas.add(`${rotulo}: ${r.nome} solto da placa ${d.toFixed(3)}`);
                const frente = Math.max(...mr.pontos.map((q) => q[2]));
                const bico = mr.pontos.filter((q) => q[2] > frente - 0.004);
                if (bico.some((q) => mp.distancia(q) < 0))
                  falhas.add(`${rotulo}: placa do rosto tapa ${r.nome}`);
              }
            }
            // a saia do tema fica no corpo (parada): continua encostada no quadril andando,
            // correndo, sentado e nos gestos
            const noCorpo = plano.pecas.filter((p) => p.apoio && p.junta === 'corpo');
            if (!noCorpo.length || n > 3) continue;
            for (const pose of poses) {
              const giros = girosDaPose(pose);
              const apoio = plano.pecas
                .filter((p) => !p.apoio && (p.junta === 'tronco' || p.junta.startsWith('perna')))
                .map((p) => medirPeca(plano, p, giros, 6));
              const medidas = noCorpo.map((p) => medirPeca(plano, p, giros, 6));
              // presos: o que encosta no tronco ou nas pernas, e o que encosta nos presos
              const presos = new Set(
                medidas.filter((e) => apoio.some((s) => distanciaEntre(e, s, 0.1) <= FOLGA_MAXIMA)),
              );
              for (let mudou = true; mudou; ) {
                mudou = false;
                for (const e of medidas)
                  if (
                    !presos.has(e) &&
                    [...presos].some((q) => distanciaEntre(e, q, 0.1) <= FOLGA_MAXIMA)
                  ) {
                    presos.add(e);
                    mudou = true;
                  }
              }
              for (const e of medidas)
                if (!presos.has(e))
                  falhas.add(`${rotulo}: ${e.peca.nome} solto na pose ${pose.nome}`);
            }
          }
    }
    expect(moradores).toBeGreaterThan(500);
    expect(placas).toBeGreaterThan(0);
    expect([...falhas]).toEqual([]);
  });

  it('a foto do editor enquadra até o alto do chapéu', () => {
    const a = { ...aparenciaPadrao(), acessorio: 'chapeu' as const };
    const semChapeu = topoBoneco({ ...a, acessorio: 'nenhum' });
    expect(topoBoneco(a)).toBeGreaterThan(semChapeu + 0.3);
  });
});
