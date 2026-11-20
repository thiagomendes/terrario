import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import {
  candidatosDoCanto,
  cantoDoMundo,
  definirEscolhaDoCanto,
  definirEstiloMundo,
  ESTILO_PADRAO,
  indice,
} from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { Bloco } from '../../src/world/blocks';
import { empacotar } from '../../src/world/edicoes';
import type { Comando, EventoNucleo } from '../../src/nucleo/protocolo';
import type { EstiloMundo } from '../../src/temas/tipos';

/**
 * Spec 031: o canto das missões no núcleo (spec 034: só o do Doce Reino). Cada missão de ponta
 * a ponta com as moedinhas de verdade; o que é de cada missão volta só quando ela é escolhida
 * de novo; e o canto nunca cobre o que alguém construiu num mundo salvo antes.
 */
const DOCE = obterTema('doce-reino').mundo;
const SEMENTE = 1337;
afterAll(() => {
  definirEscolhaDoCanto(0);
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

let ids = 9000;
const id = () => ++ids;
function tel(x: number, y: number, z: number, slot = 0): Comando {
  return {
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
  };
}
function ir(n: Nucleo, quem: string, x: number, y: number, z: number, slot = 0): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z, slot));
}
function abrir(
  estilo: EstiloMundo,
  quem: string[] = ['ana'],
  dados?: Parameters<typeof criarNucleo>[0]['dados'],
) {
  definirEstiloMundo(estilo);
  limparPovoados();
  definirEscolhaDoCanto(0);
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: quem[0],
    dados,
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
/** Passos e os eventos `alma` de quem pediu. */
function passos(n: Nucleo, k = 1, quem = 'ana'): Extract<EventoNucleo, { e: 'alma' }>[] {
  const r: Extract<EventoNucleo, { e: 'alma' }>[] = [];
  for (let i = 0; i < k; i++) {
    n.passo();
    for (const [q, f] of n.quadros())
      if (q === quem)
        r.push(
          ...(f.eventos ?? []).filter(
            (e): e is Extract<EventoNucleo, { e: 'alma' }> => e.e === 'alma',
          ),
        );
  }
  return r;
}
const moedas = (evs: Extract<EventoNucleo, { e: 'alma' }>[]) =>
  evs.reduce((s, e) => s + e.ganho.moedas, 0);

describe('spec 031: as missões do canto no núcleo', () => {
  it('spec 034: um mundo salvo da Era dos Dinos (o estilo do ninho) não tem missões nem canto', () => {
    const n = abrir({ ...DOCE, estrutura: 'ninho' as 'ruina' });
    expect(n.estado.mundoAlma).toBeNull();
    expect(cantoDoMundo(SEMENTE)).toBeNull();
  });

  it('e1: o bolo em três camadas (uma bolinha por camada) com a mão vazia; 8 moedinhas', () => {
    const n = abrir(DOCE);
    expect(n.estado.mundoAlma).toBe('doce-reino');
    const p = cantoDoMundo(SEMENTE)!;
    passos(n);
    n.comando('ana', { t: 'almaFixar', missao: 'e1' });
    const m = p.mesa!;
    ir(n, 'ana', m.x0 - 0.5, m.y + 1, m.z0 - 0.5);
    passos(n);
    let ganho = 0;
    const feitos: number[] = [];
    for (const c of p.bolo) {
      n.comando('ana', {
        t: 'colocar',
        id: id(),
        x: c.x,
        y: c.y,
        z: c.z,
        bloco: c.bloco,
        meta: 0,
        slot: 0,
      });
      const evs = passos(n);
      ganho += moedas(evs);
      for (const ev of evs) for (const mv of ev.missoes) if (mv.id === 'e1') feitos.push(mv.feito);
      expect(n.estado.mundo.bloco(c.x, c.y, c.z)).toBe(c.bloco);
    }
    expect(feitos).toEqual([1, 2, 3]);
    expect(ganho).toBe(8);
    // bloco errado não entra no bolo
    const n2 = abrir(DOCE);
    passos(n2);
    n2.comando('ana', { t: 'almaFixar', missao: 'e1' });
    ir(n2, 'ana', m.x0 - 0.5, m.y + 1, m.z0 - 0.5);
    passos(n2);
    const c0 = p.bolo[0];
    n2.comando('ana', {
      t: 'colocar',
      id: id(),
      x: c0.x,
      y: c0.y,
      z: c0.z,
      bloco: Bloco.TERRA_NEVADA,
      meta: 0,
      slot: 0,
    });
    passos(n2);
    expect(n2.estado.mundo.bloco(c0.x, c0.y, c0.z)).toBe(Bloco.AR);
  });

  it('e2: dois bichos do pasto sem comida; a comida aparece na mão perto deles; 7 moedinhas', () => {
    const n = abrir(DOCE);
    const p = cantoDoMundo(SEMENTE)!;
    passos(n);
    n.comando('ana', { t: 'almaFixar', missao: 'e2' });
    passos(n);
    const [px, py, pz] = p.pasto;
    const bichos = () =>
      n.estado.populacao.lista.filter(
        (c) => c.tipo === 'cervo' && !c.criado && Math.hypot(c.x - px, c.z - pz) < 10,
      );
    expect(bichos().length).toBeGreaterThanOrEqual(2);
    const ana = n.estado.jogadores.get('ana')!;
    expect(ana.inventario.contar('trigo')).toBe(0);
    let ganho = 0;
    for (let k = 0; k < 2; k++) {
      const b = bichos()[0];
      ir(n, 'ana', b.x + 1, py, b.z);
      passos(n, 6);
      expect(ana.inventario.contar('trigo')).toBeGreaterThan(0);
      const slot = ana.inventario.slots.findIndex((q) => q?.item === 'trigo');
      n.comando('ana', { t: 'alimentar', criatura: b.id, slot });
      ganho += moedas(passos(n, 2));
      expect(b.criado).toBeTruthy();
      expect(b.satisfeito).toBeGreaterThan(0);
    }
    ganho += moedas(passos(n, 2));
    expect(ganho).toBe(7);
  });
});

describe('spec 031: o canto nunca cobre o que alguém construiu', () => {
  for (const [nome, estilo] of [['Doce Reino', DOCE]] as const)
    it(`${nome}: um mundo salvo com construção no lugar do canto ganha o canto em outro lugar`, () => {
      definirEstiloMundo(estilo);
      limparPovoados();
      definirEscolhaDoCanto(0);
      const lista = candidatosDoCanto(SEMENTE);
      expect(lista.length).toBeGreaterThan(1);
      // uma "casinha" de quem jogava antes bem no meio do primeiro lugar
      const c = lista[0];
      const x = Math.floor(c.x);
      const z = Math.floor(c.z);
      const cx = Math.floor(x / 16);
      const cz = Math.floor(z / 16);
      const y = 80;
      const edicoes = {
        [`${cx},${cz}`]: [[indice(x - cx * 16, y, z - cz * 16), empacotar(Bloco.TIJOLOS, 0)]],
      } as Record<string, [number, number][]>;
      const n = abrir(estilo, ['ana'], { versao: 1, edicoes, jogador: null, hora: -1, extras: {} });
      expect(n.escolhaCanto).toBe(1);
      expect(n.estado.mundo.bloco(x, y, z)).toBe(Bloco.TIJOLOS);
      const outro = cantoDoMundo(SEMENTE)!;
      expect([outro.x, outro.z]).toEqual([lista[1].x, lista[1].z]);
      expect(x >= outro.x0 - 2 && x <= outro.x1 + 2 && z >= outro.z0 - 2 && z <= outro.z1 + 2).toBe(
        false,
      );
      // gravado com o mundo: reaberto com a casinha ainda lá, o canto fica onde estava
      const salvo = n.salvar();
      expect(salvo.extras['canto']).toEqual({ escolha: 1 });
      const n2 = abrir(estilo, ['ana'], {
        versao: 1,
        edicoes: salvo.edicoes,
        jogador: null,
        hora: -1,
        extras: salvo.extras,
      });
      expect(n2.escolhaCanto).toBe(1);
    });

  it('um mundo novo usa o melhor lugar (e uma construção feita depois não muda nada)', () => {
    const n = abrir(DOCE);
    expect(n.escolhaCanto).toBe(0);
    const salvo = n.salvar();
    expect(salvo.extras['canto']).toEqual({ escolha: 0 });
  });
});
