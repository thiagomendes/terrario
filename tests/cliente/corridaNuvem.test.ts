import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  contarRessincronizacoes,
  criarNuvem,
  espera,
  ligarEstado,
} from './nuvemDeVerdade';

/**
 * Spec 035, seção 7 (a reprodução de `referencia/corrida.ts`): a criança leva o mundo para a
 * nuvem, a página nova entra pelo código e só liga o estado do cliente depois de uma espera.
 * Antes do conserto, os quadros que chegam nessa espera se perdem (o `primeiro` entre eles) e o
 * filho nunca mais aplica nenhum: não vê o pai. Falha até a T02 (com 120 ms, 0 quadros).
 * `CORRIDA_RODADAS=3` roda cada espera 3 vezes.
 */
const RODADAS = Math.max(1, Number(process.env['CORRIDA_RODADAS'] ?? 1) || 1);

type Espera = { nome: string; antes: () => Promise<void> | void };
const ESPERAS: Espera[] = [
  { nome: '0 ms', antes: () => undefined },
  { nome: 'uma tarefa', antes: () => espera(0) },
  { nome: '120 ms', antes: () => espera(120) },
  { nome: '500 ms', antes: () => espera(500) },
  { nome: '2 s', antes: () => espera(2000) },
];

let ipSeguinte = 1;

async function rodada(e: Espera, n: number) {
  const nuvem = criarNuvem(`10.0.${ipSeguinte}.${n}`);
  ipSeguinte++;
  try {
    // 1) o filho cria a sala (subirParaNuvem) e fecha essa conexão
    const codigo = await nuvem.criarSala('filho');
    // 2) a página nova (?sala=…&novo=1&direto=1) entra pelo código
    const c2 = nuvem.conectar('filho', { codigo });
    const ressinc2 = contarRessincronizacoes(c2);
    await c2.pronta;
    await e.antes(); // <- o que a página espera entre o bem-vindo e a cena
    let aplicados = 0;
    let viuPai = false;
    ligarEstado(c2, {
      aoQuadro: (q) => {
        aplicados++;
        if (q.jogadores?.some((o) => o.id === 'pai')) viuPai = true;
      },
    });
    // 3) o pai entra pelo link
    const c3 = nuvem.conectar('pai', { codigo });
    const ressinc3 = contarRessincronizacoes(c3);
    await c3.pronta;
    let paiViuFilho = false;
    ligarEstado(c3, {
      aoQuadro: (q) => {
        if (q.jogadores?.some((o) => o.id === 'filho')) paiViuFilho = true;
      },
    });
    await espera(1500);
    const pedidas = ressinc2() + ressinc3() + nuvem.fechamentos.filter((c) => c === 4001).length;
    c2.encerrar();
    c3.encerrar();
    return {
      aplicados,
      viuPai,
      paiViuFilho,
      ressincronizacoes: pedidas,
      // a página nova abriu uma conexão só (fora a de criar)
      conexoesDoFilho: nuvem.abertas.get('filho'),
    };
  } finally {
    nuvem.parar();
  }
}

describe('a corrida da entrada na nuvem, com o servidor de verdade', () => {
  afterEach(() => vi.restoreAllMocks());

  for (const e of ESPERAS) {
    it(
      `espera de ${e.nome} entre o bem-vindo e a cena: o filho vê o pai, sem ressincronizar`,
      async () => {
        // o "erro do núcleo" e os registros do servidor não interessam aqui
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        for (let n = 0; n < RODADAS; n++) {
          const r = await rodada(e, n);
          const rotulo = `rodada ${n + 1} de ${RODADAS}`;
          expect(r.aplicados, `${rotulo}: quadros aplicados no filho`).toBeGreaterThan(0);
          expect(r.viuPai, `${rotulo}: o filho vê o pai`).toBe(true);
          expect(r.paiViuFilho, `${rotulo}: o pai vê o filho`).toBe(true);
          expect(r.ressincronizacoes, `${rotulo}: ressincronizações`).toBe(0);
          expect(r.conexoesDoFilho, `${rotulo}: conexões do filho (criar + página nova)`).toBe(2);
        }
      },
      RODADAS * 8000 + 5000,
    );
  }
});
