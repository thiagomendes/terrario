import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import type { Comando } from '../../src/nucleo/protocolo';
import { publicoDaVila, zonaSemBichos } from '../../src/world/publicoVila';
import type { Criatura } from '../../src/jogo/criaturas';

/**
 * Spec 026 (o dono, 16 nov 2026: "os bichos invadem o show e o passarinho canta por cima da
 * música"): o festival da Vila Neon fica sem bichos soltos, sempre. Quem está fora não entra
 * (nem pelo portão), quem já estava dentro sai andando pelo portão; as lhamas do cercadinho e o
 * bicho que segue a comida na mão da criança passam.
 */
const VILA = obterTema('vila-neon').mundo;
const SEMENTE = 4242;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function abrir(): Nucleo {
  definirEstiloMundo(VILA);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: 'ana',
  });
  n.conectar('ana', { perfil: { apelido: 'ana', aparencia: {} } });
  return n;
}
function ir(n: Nucleo, x: number, y: number, z: number, slot = 0): void {
  n.estado.jogadores.get('ana')!.saltoPermitido = true;
  n.comando('ana', {
    t: 'jogador',
    x,
    y,
    z,
    yaw: 0,
    pitch: 0,
    olhos: y + 1.62,
    noChao: true,
    voando: false,
    vel: 0,
    correndo: false,
    submerso: false,
    quedas: [],
    pulos: 0,
    golpes: 0,
    slot,
  } as Comando);
}
const passos = (n: Nucleo, k: number) => {
  for (let i = 0; i < k; i++) n.passo();
};

describe('spec 026: o festival da Vila Neon sem bichos soltos', () => {
  it('quem vem de fora não entra (nem pelo portão), e ninguém nasce lá dentro', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    const zona = zonaSemBichos(p);
    // a criança no meio do campo: os bichos nascem em volta dela por 3 minutos
    ir(n, pub.meio[0], p.h + 1, pub.meio[1]);
    passos(n, 20);
    // e um bando na calçada do portão, de frente para ele, querendo entrar
    const fora: Criatura[] = [];
    for (let i = 0; i < 6; i++)
      fora.push(
        n.estado.populacao.adicionar(
          i % 2 ? 'coelho' : 'cervo',
          pub.portao[0] - 3 + i,
          p.h + 1,
          p.zonas.festival.z0 - 2.5,
        ),
      );
    for (const c of fora) {
      c.estado = 'vagar';
      c.alvoX = pub.portao[0];
      c.alvoZ = pub.portao[2] + 10;
      c.tempoEstado = 30;
    }
    let entrou = 0;
    for (let k = 0; k < 180 * 20; k++) {
      n.passo();
      if (k % 10) continue;
      for (const c of n.estado.populacao.lista)
        if (c.tipo !== 'morador' && !c.casa && zona.dentro(c.x, c.z)) entrou++;
    }
    expect(entrou).toBe(0);
  });

  it('quem já estava dentro (o coelhinho que seguia o feno e parou) sai andando pelo portão', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const pub = publicoDaVila(p);
    const zona = zonaSemBichos(p);
    ir(n, pub.meio[0] + 4, p.h + 1, pub.meio[1] - 4);
    passos(n, 20);
    const dentro = [
      n.estado.populacao.adicionar('coelho', pub.meio[0], p.h + 1, pub.meio[1]),
      n.estado.populacao.adicionar('cervo', pub.grade[0][0], p.h + 1, pub.grade[0][2]),
      n.estado.populacao.adicionar('coelho', p.ox + 45, p.h + 1, p.oz + 80),
    ];
    let k = 0;
    while (k < 120 * 20 && dentro.some((c) => zona.dentro(c.x, c.z))) {
      n.passo();
      k++;
    }
    for (const c of dentro) expect(zona.dentro(c.x, c.z), `${c.tipo} em ${c.x},${c.z}`).toBe(false);
    // e não volta
    passos(n, 30 * 20);
    for (const c of dentro) expect(zona.dentro(c.x, c.z)).toBe(false);
  });

  it('as lhamas do cercadinho ficam (moram ali) e o bicho que segue a comida entra com a criança', () => {
    const n = abrir();
    const p = vilaDoMundo(SEMENTE)!;
    const zona = zonaSemBichos(p);
    const c = p.pontos.cercado;
    const mx = (c.x0 + c.x1 + 1) / 2;
    const mz = (c.z0 + c.z1 + 1) / 2;
    ir(n, mx, p.h + 1, mz + 1);
    passos(n, 60);
    const lh = n.estado.vila!.lhamas().todas;
    expect(lh).toHaveLength(2);
    for (const id of lh) {
      const l = n.estado.populacao.lista.find((q) => q.id === id)!;
      expect(zona.dentro(l.x, l.z)).toBe(true);
    }
    // um coelhinho de fora segue a semente na mão da criança, porta adentro
    const pub = publicoDaVila(p);
    const j = n.estado.jogadores.get('ana')!;
    j.inventario.definir(0, { item: 'semente_trigo', qtd: 8 });
    const zf = p.zonas.festival.z0 - 2;
    const coelho = n.estado.populacao.adicionar('coelho', pub.portao[0], p.h + 1, zf - 1.5);
    for (let k = 0; k <= 60; k++) {
      ir(n, pub.portao[0], p.h + 1, zf + k * 0.12, 0);
      passos(n, 2);
    }
    passos(n, 40);
    expect(coelho.estado).toBe('seguir');
    expect(zona.dentro(coelho.x, coelho.z)).toBe(true);
  });
});
