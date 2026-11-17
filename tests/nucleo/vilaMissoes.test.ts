import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { definirEstiloMundo, ESTILO_PADRAO, vilaDoMundo } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import { sanear } from '../../src/nucleo/saneamento';
import { PASSO, type Comando, type EventoNucleo } from '../../src/nucleo/protocolo';
import { almaMundoVazia, missoesDoMundo, moedasDoMundo, temMissaoNova } from '../../src/jogo/alma';
import {
  VOLTA_CARROSSEL,
  VOLTA_RODA,
  impulsoDaVista,
  lugarDaCadeira,
  sentadoNaVista,
} from '../../src/jogo/parque';
import {
  ALCANCE_BALAO,
  CARIMBOS,
  F_BALOES,
  F_BILHETE,
  F_LANCHE,
  F_PRENDA,
  PRENDAS,
  alcancaOBalao,
  chaoDoBalao,
  lugarDoBalao,
} from '../../src/jogo/missoesParque';
import { FITA_VIDEO, PELUCIA, VITAMINA } from '../../src/jogo/exclusivos';
import { AVO, POVOADO_VILA } from '../../src/nucleo/vila';
import { VERSAO_REDE } from '../../src/rede/protocolo';

/**
 * Spec 026 (parte 2, etapa B): as quatro missões do parque e os toques da Rua anos 80 no núcleo.
 * Cada criança tem o progresso dela; o núcleo confere a missão aberta e o alcance; as moedinhas
 * só vêm no fim da missão.
 */
const VILA = obterTema('vila-neon').mundo;
const SEMENTE = 4242;
afterAll(() => {
  definirEstiloMundo(ESTILO_PADRAO);
  limparPovoados();
});

function tel(x: number, y: number, z: number): Comando {
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
    slot: 0,
  };
}
function abrir(quem: string[] = ['ana'], extras?: Record<string, unknown>) {
  definirEstiloMundo(VILA);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: true,
    depuracao: true,
    dono: quem[0],
    ...(extras ? { dados: { extras } as never } : {}),
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
type Ev = EventoNucleo;
/** Anda `k` passos; quem está sentado manda o lugar da cadeira, como o aparelho faz. */
function passos(n: Nucleo, k = 1, quem = 'ana'): Ev[] {
  const pq = vilaDoMundo(SEMENTE)!.pontos.parque;
  const r: Ev[] = [];
  for (let i = 0; i < k; i++) {
    const v = n.estado.vila!.vista().parque!;
    const t = n.estado.vila!.vista().t;
    for (const id of Object.keys(v.s)) {
      const s = sentadoNaVista(v, id)!;
      const l = lugarDaCadeira(pq, s.b, s.i, t, impulsoDaVista(v), n.estado.vila!.parque.carros());
      n.comando(id, tel(l.x, l.y, l.z));
    }
    n.passo();
    for (const [q, f] of n.quadros()) if (q === quem) r.push(...(f.eventos ?? []));
  }
  return r;
}
function ir(n: Nucleo, quem: string, x: number, y: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}
const plano = () => vilaDoMundo(SEMENTE)!;
const Y = () => plano().h + 1;
const alma = (n: Nucleo, quem: string) => {
  let e = n.estado.almas.get(quem);
  if (!e) n.estado.almas.set(quem, (e = almaMundoVazia()));
  return e;
};
/** As missões de antes já feitas: as do parque ficam abertas. */
function fez(n: Nucleo, quem: string, ...ids: string[]): void {
  alma(n, quem).feitas.push(...ids);
}
const inv = (n: Nucleo, quem: string) => n.estado.jogadores.get(quem)!.inventario;
const vila = (n: Nucleo, a: string, extra: Record<string, unknown> = {}) =>
  ({ t: 'vila', a, ...extra }) as unknown as Comando;
/** As missões que andaram nos eventos. */
const movidas = (evs: Ev[]) => evs.flatMap((e) => (e.e === 'alma' ? e.missoes : []));
const moedas = (evs: Ev[]) => evs.reduce((s, e) => s + (e.e === 'alma' ? e.ganho.moedas : 0), 0);

describe('spec 026 (parte 2, etapa B): as missões do parque no núcleo', () => {
  it('a rede subiu para 13 e os comandos novos passam a limpo', () => {
    expect(VERSAO_REDE).toBe(13);
    expect(sanear({ t: 'vila', a: 'balao', i: 2, lixo: 1 })).toEqual({ t: 'vila', a: 'balao', i: 2 });
    expect(sanear({ t: 'vila', a: 'balao', i: 3 })).toBeNull();
    expect(sanear({ t: 'vila', a: 'balao' })).toBeNull();
    expect(sanear({ t: 'vila', a: 'prenda', i: 1 })).toEqual({ t: 'vila', a: 'prenda', i: 1 });
    expect(sanear({ t: 'vila', a: 'prenda', i: 2 })).toBeNull();
    for (const a of ['feno', 'cocho', 'fita', 'vitamina'])
      expect(sanear({ t: 'vila', a, i: 9, x: 1 })).toEqual({ t: 'vila', a });
    expect(sanear({ t: 'vila', a: 'pelucia' })).toBeNull();
  });

  it('as quatro missões: 18 moedinhas (o mundo dá 33), sem fantasia, sem pressa', () => {
    const lista = missoesDoMundo('vila-neon');
    expect(lista.map((m) => m.id)).toEqual(['f1', 'f2', 'f4', 'f5', 'f6', 'f7', 'f8']);
    expect(lista.slice(3).map((m) => m.moedas)).toEqual([5, 4, 4, 5]);
    expect(moedasDoMundo('vila-neon')).toBe(33);
    for (const m of lista.slice(3)) {
      expect(m.fantasia).toBeUndefined();
      if (m.desenho.tipo === 'arte') expect(m.desenho.resultado).not.toBe(m.desenho.principal);
    }
    const [f5, , , f8] = lista.slice(3);
    expect(f5.conta).toEqual({ tipo: 'lugares', usos: [...CARIMBOS] });
    expect(f8.conta).toEqual({ tipo: 'lugares', usos: [...PRENDAS] });
  });

  it('f5 bilhete: o passeio inteiro carimba (só com a missão aberta), cada carimbo no lugar dele', () => {
    const n = abrir(['ana', 'bia']);
    const pq = plano().pontos.parque;
    // a Bia ainda não tem a missão (as duas primeiras do mundo estão abertas): o passeio não carimba
    fez(n, 'ana', 'f1', 'f2', 'f4');
    for (const q of ['ana', 'bia']) ir(n, q, pq.carrossel.x + pq.carrossel.beira + 2, Y(), pq.carrossel.z);
    passos(n, 2);
    n.comando('ana', vila(n, 'sentar', { b: 1 }));
    n.comando('bia', vila(n, 'sentar', { b: 1 }));
    const evs = passos(n, Math.round((VOLTA_CARROSSEL + 2) / PASSO));
    expect(movidas(evs)).toContainEqual({
      id: F_BILHETE,
      feito: 1,
      meta: 3,
      usos: [CARIMBOS[1]],
    });
    expect(alma(n, 'bia').lugares).toEqual([]);
    expect(moedas(evs)).toBe(0);
    n.comando('ana', vila(n, 'sair'));
    passos(n, 3);
    // a roda-gigante: a volta inteira
    ir(n, 'ana', pq.roda.saida[0], Y(), pq.roda.saida[2]);
    passos(n, 2);
    n.comando('ana', vila(n, 'sentar', { b: 0 }));
    const evs2 = passos(n, Math.round((VOLTA_RODA + 5) / PASSO));
    expect(movidas(evs2).find((m) => m.id === F_BILHETE)).toMatchObject({
      feito: 2,
      usos: [CARIMBOS[0], CARIMBOS[1]],
    });
    // o mesmo brinquedo de novo não carimba duas vezes
    n.estado.vila!.missoes.passeio('ana', 'andou:roda');
    expect(alma(n, 'ana').progresso[F_BILHETE]).toBe(2);
    // o bate-bate fecha o bilhete: as 5 moedinhas só agora
    n.estado.vila!.missoes.passeio('ana', 'andou:bate');
    const evs3 = passos(n, 2);
    expect(movidas(evs3).find((m) => m.id === F_BILHETE)).toMatchObject({ concluiu: true });
    expect(moedas(evs3)).toBe(5);
    expect(alma(n, 'ana').feitas).toContain(F_BILHETE);
  });

  it('f6 balões: o toque de perto pega (cada criança os dela); o terceiro dá o balão de presente', () => {
    const n = abrir(['ana', 'bia']);
    const pq = plano().pontos.parque;
    fez(n, 'ana', 'f1', 'f2', 'f4', 'f5');
    fez(n, 'bia', 'f1', 'f2', 'f4', 'f5');
    const v = n.estado.vila!;
    // de longe o toque não pega
    ir(n, 'ana', pq.roda.x + 40, Y(), pq.roda.z);
    passos(n, 2);
    n.comando('ana', vila(n, 'balao', { i: 0 }));
    expect(movidas(passos(n, 2))).toEqual([]);
    expect(v.vistaDe('ana').bal).toEqual([false, false, false]);
    let total = 0;
    for (let i = 0; i < 3; i++) {
      const [x, y, z] = chaoDoBalao(pq, Y(), i);
      // onde a trilha leva, o balão está ao alcance (o do carrossel gira com ele)
      for (const t of [0, 3, 7, 12, 17]) {
        const b = lugarDoBalao(pq, Y(), i, t);
        expect(alcancaOBalao(pq, Y(), i, t, x, z)).toBe(true);
        if (i < 2) expect(Math.hypot(b.x - x, b.z - z)).toBeLessThan(ALCANCE_BALAO - 2);
        expect(b.y - Y()).toBeGreaterThan(2.4);
        expect(b.y - Y()).toBeLessThan(5.5);
      }
      ir(n, 'ana', x, y, z);
      passos(n, 2);
      n.comando('ana', vila(n, 'balao', { i }));
      const evs = passos(n, 22);
      const ev = evs.find((e) => e.e === 'vilaBalao');
      expect(ev).toMatchObject({ i, quem: 'ana' });
      if (ev?.e === 'vilaBalao') expect(ev.presente).toBe(i === 2 ? true : undefined);
      // tocar de novo no mesmo balão não conta outra vez
      n.comando('ana', vila(n, 'balao', { i }));
      const de_novo = passos(n, 22);
      expect(de_novo.some((e) => e.e === 'vilaBalao')).toBe(false);
      total += moedas(evs) + moedas(de_novo);
      expect(total).toBe(i === 2 ? 4 : 0);
    }
    expect(alma(n, 'ana').feitas).toContain(F_BALOES);
    // a Bia não pegou nenhum (o progresso é de cada uma) e só a Ana leva o balão
    expect(v.vistaDe('bia').bal).toEqual([false, false, false]);
    expect(alma(n, 'bia').progresso[F_BALOES]).toBeUndefined();
    expect(v.vista().balao).toEqual(['ana']);
    // o balão de presente vai salvo com o mundo e volta
    const salvo = n.salvar().extras as { vila: { balao: string[] } };
    expect(salvo.vila.balao).toEqual(['ana']);
    const n2 = abrir(['ana'], salvo as unknown as Record<string, unknown>);
    passos(n2, 2);
    expect(n2.estado.vila!.vista().balao).toEqual(['ana']);
  });

  it('f7 lanche: o feno do fardo no cocho, duas vezes; as lhamas vêm comer e pulam', () => {
    const n = abrir();
    const pq = plano().pontos.parque;
    fez(n, 'ana', 'f1', 'f2', 'f4', 'f5', 'f6');
    const v = n.estado.vila!;
    ir(n, 'ana', pq.fardo[0], Y(), pq.fardo[2] + 1.4);
    passos(n, 60);
    expect(v.lhamas().fazendinha).toHaveLength(2);
    // sem feno o cocho não conta
    n.comando('ana', vila(n, 'cocho'));
    expect(movidas(passos(n, 22))).toEqual([]);
    let pulou = false;
    for (let k = 0; k < 2; k++) {
      ir(n, 'ana', pq.fardo[0], Y(), pq.fardo[2] + 1.4);
      passos(n, 2);
      n.comando('ana', vila(n, 'feno'));
      passos(n, 22);
      expect(inv(n, 'ana').contar('trigo')).toBe(1);
      // outro toque no fardo com o feno na mão não dá mais feno
      n.comando('ana', vila(n, 'feno'));
      passos(n, 22);
      expect(inv(n, 'ana').contar('trigo')).toBe(1);
      // do fardo o cocho está longe: o toque não vale
      n.comando('ana', vila(n, 'cocho'));
      expect(passos(n, 22).some((e) => e.e === 'vilaLanche')).toBe(false);
      ir(n, 'ana', pq.cocho[0] - 0.3, Y(), pq.cocho[2] - 1.6);
      passos(n, 2);
      n.comando('ana', vila(n, 'cocho'));
      const evs = passos(n, 3);
      const ev = evs.find((e) => e.e === 'vilaLanche');
      expect(ev).toMatchObject({ quem: 'ana' });
      if (ev?.e === 'vilaLanche') expect(ev.fim).toBe(k === 1 ? true : undefined);
      expect(inv(n, 'ana').contar('trigo')).toBe(0);
      expect(moedas(evs)).toBe(k === 1 ? 4 : 0);
      // as lhamas foram chamadas para o cocho e pulam (nunca saem da fazendinha)
      const ids = v.lhamas().fazendinha;
      for (let i = 0; i < 140; i++) {
        passos(n, 1);
        for (const c of n.estado.populacao.lista)
          if (ids.includes(c.id) && c.vy > 3) pulou = true;
      }
      const f = pq.fazendinha;
      for (const c of n.estado.populacao.lista.filter((q) => ids.includes(q.id))) {
        expect(Math.hypot(c.x - pq.cocho[0], c.z - pq.cocho[2])).toBeLessThan(4.5);
        expect(c.x).toBeGreaterThan(f.x0 - 0.5);
        expect(c.x).toBeLessThan(f.x1 + 1.5);
        expect(c.z).toBeGreaterThan(f.z0 - 0.5);
        expect(c.z).toBeLessThan(f.z1 + 1.5);
      }
    }
    expect(pulou).toBe(true);
    expect(alma(n, 'ana').feitas).toContain(F_LANCHE);
  });

  it('f8 prenda: a argola e a pescaria dão a pelúcia; a vovó, na porta da casa, recebe', () => {
    const n = abrir();
    const p = plano().pontos;
    const pq = p.parque;
    fez(n, 'ana', 'f1', 'f2', 'f4', 'f5', 'f6', 'f7');
    // a vovó sem a prenda não recebe nada
    const avo = p.postos.avo;
    ir(n, 'ana', avo[0] + 0.8, Y(), avo[2] + 1.5);
    const chegou = passos(n, 60);
    expect(chegou.some((e) => e.e === 'vilaVovo')).toBe(false);
    // ela é uma moradora de verdade, na porta da Casa anos 80 (dentro do lote da casa)
    const vovo = n.estado.populacao.lista.find(
      (c) => c.morador?.povoado === POVOADO_VILA && c.morador.n === AVO,
    )!;
    expect(vovo).toBeTruthy();
    const casa = plano().zonas.casa80;
    expect(vovo.x).toBeGreaterThan(casa.x0);
    expect(vovo.x).toBeLessThan(casa.x1 + 1);
    expect(vovo.z).toBeGreaterThan(casa.z0);
    expect(vovo.z).toBeLessThan(casa.z1 + 1);
    // as barracas: de longe não vale; de perto, uma bolinha cada (a segunda dá a pelúcia)
    n.comando('ana', vila(n, 'prenda', { i: 0 }));
    expect(passos(n, 22).some((e) => e.e === 'vilaPrenda')).toBe(false);
    ir(n, 'ana', pq.pescaria[0], Y(), pq.pescaria[2] - 2.5);
    passos(n, 2);
    n.comando('ana', vila(n, 'prenda', { i: 1 }));
    const e1 = passos(n, 22);
    expect(e1.find((e) => e.e === 'vilaPrenda')).toEqual({ e: 'vilaPrenda', i: 1, quem: 'ana' });
    expect(movidas(e1).find((m) => m.id === F_PRENDA)).toMatchObject({
      feito: 1,
      usos: [PRENDAS[1]],
    });
    expect(inv(n, 'ana').contar(PELUCIA)).toBe(0);
    ir(n, 'ana', pq.argola[0], Y(), pq.argola[2] - 2.5);
    passos(n, 2);
    n.comando('ana', vila(n, 'prenda', { i: 0 }));
    const e2 = passos(n, 22);
    expect(e2.find((e) => e.e === 'vilaPrenda')).toMatchObject({ i: 0, pelucia: true });
    expect(inv(n, 'ana').contar(PELUCIA)).toBe(1);
    // de novo na barraca: nada (uma prenda só)
    n.comando('ana', vila(n, 'prenda', { i: 0 }));
    expect(passos(n, 22).some((e) => e.e === 'vilaPrenda')).toBe(false);
    expect(inv(n, 'ana').contar(PELUCIA)).toBe(1);
    expect(moedas([...e1, ...e2])).toBe(0);
    // levar à vovó: é só chegar perto
    ir(n, 'ana', avo[0] + 0.8, Y(), avo[2] + 1.5);
    const e3 = passos(n, 12);
    expect(e3.find((e) => e.e === 'vilaVovo')).toEqual({ e: 'vilaVovo', quem: 'ana' });
    expect(inv(n, 'ana').contar(PELUCIA)).toBe(0);
    expect(movidas(e3).find((m) => m.id === F_PRENDA)).toMatchObject({ concluiu: true });
    expect(moedas(e3)).toBe(5);
    // tudo feito: nada novo para convidar
    const quadro = e3.flatMap((e) => (e.e === 'alma' && e.quadro ? [e.quadro] : [])).pop();
    expect(quadro && temMissaoNova(quadro)).toBe(false);
  });

  it('a rua: a fita da locadora (uma) e a vitamina da lanchonete (até duas), só de perto', () => {
    const n = abrir();
    const rua = plano().pontos.rua;
    n.comando('ana', vila(n, 'fita'));
    n.comando('ana', vila(n, 'vitamina'));
    passos(n, 22);
    expect(inv(n, 'ana').contar(FITA_VIDEO)).toBe(0);
    expect(inv(n, 'ana').contar(VITAMINA)).toBe(0);
    ir(n, 'ana', rua.fitas[0], Y(), rua.fitas[2] + 3);
    passos(n, 2);
    for (let k = 0; k < 3; k++) {
      n.comando('ana', vila(n, 'fita'));
      passos(n, 22);
    }
    expect(inv(n, 'ana').contar(FITA_VIDEO)).toBe(1);
    ir(n, 'ana', rua.balcao[0], Y(), rua.balcao[2] + 2.5);
    passos(n, 2);
    for (let k = 0; k < 4; k++) {
      n.comando('ana', vila(n, 'vitamina'));
      passos(n, 22);
    }
    expect(inv(n, 'ana').contar(VITAMINA)).toBe(2);
  });
});
