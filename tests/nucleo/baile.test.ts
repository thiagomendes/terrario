import { afterAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { criarNucleo, type Nucleo } from '../../src/nucleo/nucleo';
import { baileDoMundo, definirEstiloMundo, ESTILO_PADRAO } from '../../src/world/chunk';
import { limparPovoados } from '../../src/world/povoado';
import type { Comando } from '../../src/nucleo/protocolo';
import { MORADORES_BAILE, PROFISSOES_DA_RUA } from '../../src/nucleo/baile';
import { ABRACO, DURACAO_ABRACO, N_BAILE, POVOADO_BAILE, VIZINHOS_DA_RUA } from '../../src/jogo/baile';
import { PASSO } from '../../src/nucleo/protocolo';
import { trocasDoMundo } from '../../src/jogo/trocas';
import { definirTemaAtivo } from '../../src/temas/ativo';
import { nomeDoMorador } from '../../src/temas/nomes';

/**
 * Spec 027 (T10): os moradores com posto da Noite das Fantasias no núcleo. Cada um aparece no
 * seu lugar quando alguém chega perto, nos dois modos (no aparelho e na nuvem), e os nomes são
 * só deste mundo.
 */
const BAILE = obterTema('noite-das-fantasias');
const SEMENTE = 1337;
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
function abrir(quem: string[] = ['ana'], confiar = true): Nucleo {
  definirEstiloMundo(BAILE.mundo);
  limparPovoados();
  const n = criarNucleo({
    semente: SEMENTE,
    modo: 'criativo',
    versaoMundo: 2,
    confiarNoCliente: confiar,
    depuracao: true,
    dono: quem[0],
  });
  for (const q of quem) n.conectar(q, { perfil: { apelido: q, aparencia: {} } });
  return n;
}
function ir(n: Nucleo, quem: string, x: number, y: number, z: number): void {
  n.estado.jogadores.get(quem)!.saltoPermitido = true;
  n.comando(quem, tel(x, y, z));
}
function passos(n: Nucleo, k = 1): void {
  for (let i = 0; i < k; i++) {
    n.passo();
    n.quadros();
  }
}

/** Sem acento, sem "Seu", "Tia", "Vovó", "Conde", "Dona", "Vó" (o nome de verdade). */
function nomeProprio(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/^(seu|tia|tio|vovo|vovo|vo|conde|dona|dom)\s+/, '')
    .trim();
}

describe('spec 027 (T10): os moradores com posto da festa', () => {
  for (const confiar of [true, false])
    it(`cada um aparece no seu posto quando alguém chega perto (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(['ana'], confiar);
      const p = baileDoMundo(SEMENTE)!;
      expect(n.estado.baile).not.toBeNull();
      const lugares = n.estado.baile!.lugares();
      expect(lugares.length).toBe(MORADORES_BAILE.length + VIZINHOS_DA_RUA);
      expect(p.pontos.vizinhos.length).toBe(VIZINHOS_DA_RUA);
      // a criança passeia pela vila, de morador em morador (a dois blocos e meio de cada um)
      for (const l of lugares) {
        const [x, y, z] = l.posto;
        ir(n, 'ana', x + 2, y, z + 1.5);
        passos(n, 200);
        const vistos = n.estado.baile!.moradores();
        const c = vistos.find((q) => q.morador!.n === l.n);
        expect(c, `morador ${l.n}`).toBeTruthy();
        expect(c!.morador!.povoado).toBe(POVOADO_BAILE);
        expect(c!.morador!.profissao).toBe(l.profissao);
        // fica no posto, de pé no chão (nada em cima de poste, cerca ou toldo)
        expect(Math.hypot(c!.x - l.posto[0], c!.z - l.posto[2]), `morador ${l.n}`).toBeLessThan(1.5);
        expect(Math.abs(c!.y - l.posto[1]), `morador ${l.n}`).toBeLessThan(0.3);
        // ninguém em dobro
        expect(new Set(vistos.map((q) => q.morador!.n)).size).toBe(vistos.length);
      }
    });

  it('os vizinhos da rua moram nas casinhas (um por porta, fora a da Vovó), de frente para a rua', () => {
    const p = baileDoMundo(SEMENTE) ?? (definirEstiloMundo(BAILE.mundo), baileDoMundo(SEMENTE)!);
    const portas = p.pontos.portas.filter((q) => !q.vovo);
    expect(p.pontos.vizinhos.length).toBe(portas.length);
    expect(portas.length).toBe(VIZINHOS_DA_RUA);
    p.pontos.vizinhos.forEach((v, i) => {
      // ao lado da porta dele (a uns dois blocos e meio), olhando para a rua (o lado da porta
      // que dá para fora)
      const d = Math.hypot(v.x - portas[i].x, v.z - portas[i].z);
      expect(d).toBeGreaterThan(1.5);
      expect(d).toBeLessThan(3.5);
    });
    expect(PROFISSOES_DA_RUA.length).toBe(VIZINHOS_DA_RUA);
  });

  it('todo morador de posto tem nome, gênero e roupa; o Bento é o grandão', () => {
    const pov = BAILE.povoado!;
    const chaves = [
      ...MORADORES_BAILE.map((m) => m.n),
      ...Array.from({ length: VIZINHOS_DA_RUA }, (_, i) => N_BAILE.rua + i),
    ].map((k) => `${POVOADO_BAILE}:${k}`);
    for (const k of chaves) {
      const m = pov.porMorador?.[k];
      expect(m, k).toBeTruthy();
      expect(m!.nome.length).toBeGreaterThan(2);
      expect(m!.pecas?.length ?? 0).toBeGreaterThan(0);
    }
    expect(pov.porMorador![`${POVOADO_BAILE}:${N_BAILE.bento}`].escala).toBeCloseTo(1.3, 5);
    // só o Bento é maior
    for (const [k, m] of Object.entries(pov.porMorador!))
      if (k !== `${POVOADO_BAILE}:${N_BAILE.bento}`) expect(m.escala ?? 1).toBe(1);
    // os vendedores não abrem a janela de trocas; as três profissões da rua, sim
    for (const k of ['vovo', 'dudu', 'lulu', 'bento', 'jeronimo', 'filo', 'olavo'] as const)
      expect(pov.porMorador![`${POVOADO_BAILE}:${N_BAILE[k]}`].semTrocas, k).toBe(true);
    const comTrocas = Object.entries(pov.porMorador!).filter(([, m]) => !m.semTrocas);
    expect(comTrocas.map(([, m]) => m.titulo).sort()).toEqual(['Confeiteira', 'Lanterneiro', 'Marceneiro']);
  });

  it('a Vovó é uma senhora: o cabelo grisalho, os óculos redondos e o vestido comprido', () => {
    const vovo = BAILE.povoado!.porMorador![`${POVOADO_BAILE}:${N_BAILE.vovo}`];
    // o cabelo do corpo (a segunda peça da cabeça) é o grisalho claro das vovós
    const cabelo = vovo.pecas!.filter((q) => q.papel === 'cabeca')[1].cor;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(cabelo.slice(i, i + 2), 16));
    expect(Math.min(r, g, b)).toBeGreaterThan(180);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(30);
    expect(vovo.fantasia?.id).toBe('vovo-zuleica');
    // o vestido: uma saia comprida que desce até perto dos pés
    expect(vovo.pecas!.some((q) => !q.papel && q.p[1] < 0.6 && q.t[1] >= 0.45)).toBe(true);
  });

  it('o marceneiro troca os blocos das casinhas tortas só na festa', () => {
    const festa = trocasDoMundo('construtor', BAILE.mundo).map((t) => t.id);
    expect(festa).toEqual(expect.arrayContaining(['tabua-roxa', 'tabua-musgo', 'tijolo-torto', 'pedrinha-lilas', 'janela-torta']));
    for (const id of temasDisponiveis()) {
      if (id === 'noite-das-fantasias') continue;
      const outras = trocasDoMundo('construtor', obterTema(id).mundo).map((t) => t.id);
      expect(outras.some((t) => ['tabua-roxa', 'tabua-musgo', 'tijolo-torto', 'pedrinha-lilas', 'janela-torta'].includes(t)), id).toBe(false);
    }
  });

  for (const confiar of [true, false])
    it(`T11: o abraço do Bento, um por vez, para todos verem (${confiar ? 'aparelho' : 'nuvem'})`, () => {
      const n = abrir(['ana', 'bia'], confiar);
      const p = baileDoMundo(SEMENTE)!;
      const [bx, by, bz] = p.pontos.postos.bento;
      // as duas no palco, uma de cada lado do Bento
      ir(n, 'ana', bx - 1.2, by, bz + 1);
      ir(n, 'bia', bx + 1.2, by, bz + 1);
      const evs: Record<string, { e: string; quem?: string }[]> = { ana: [], bia: [] };
      const andar = (k: number) => {
        for (let i = 0; i < k; i++) {
          n.passo();
          for (const [q, f] of n.quadros())
            if (q in evs) evs[q].push(...((f.eventos ?? []).filter((e) => e.e.startsWith('baile')) as never[]));
        }
      };
      andar(200);
      const bento = n.estado.baile!.moradores().find((c) => c.morador!.n === N_BAILE.bento)!;
      expect(bento).toBeTruthy();
      // as duas pedem o abraço no mesmo passo: só a primeira ganha
      n.comando('ana', { t: 'falar', criatura: bento.id });
      n.comando('bia', { t: 'falar', criatura: bento.id });
      andar(1);
      expect(n.estado.baile!.abraco()?.quem).toBe('ana');
      // as duas veem o mesmo abraço (quem, com qual morador)
      for (const q of ['ana', 'bia'])
        expect(evs[q].filter((e) => e.e === 'baileAbraco').map((e) => e.quem)).toEqual(['ana']);
      // no meio do abraço, a Bia toca de novo: espera
      andar(10);
      n.comando('bia', { t: 'falar', criatura: bento.id });
      andar(1);
      expect(n.estado.baile!.abraco()?.quem).toBe('ana');
      // acaba sozinho (2 s depois do começo, que foi há 12 passos), sem "soltou"
      andar(Math.ceil(DURACAO_ABRACO / PASSO) - 12);
      expect(n.estado.baile!.abraco()).toBeNull();
      expect(evs.bia.some((e) => e.e === 'baileSolta')).toBe(false);
      // logo depois do fim (menos de 0,3 s), ainda não
      n.comando('bia', { t: 'falar', criatura: bento.id });
      andar(1);
      expect(n.estado.baile!.abraco()).toBeNull();
      // depois dos 0,3 s, a vez da Bia
      andar(Math.ceil(ABRACO.espera / PASSO) + 1);
      n.comando('bia', { t: 'falar', criatura: bento.id });
      andar(1);
      expect(n.estado.baile!.abraco()?.quem).toBe('bia');
      // a Bia mexe no controle: solta na hora, e as duas recebem o "soltou"
      ir(n, 'bia', bx + 2.4, by, bz + 1);
      andar(1);
      expect(n.estado.baile!.abraco()).toBeNull();
      for (const q of ['ana', 'bia'])
        expect(evs[q].filter((e) => e.e === 'baileSolta').map((e) => e.quem)).toEqual(['bia']);
    });

  it('T11: longe do Bento, ou em outro morador, não tem abraço', () => {
    const n = abrir(['ana']);
    const p = baileDoMundo(SEMENTE)!;
    const [bx, by, bz] = p.pontos.postos.bento;
    ir(n, 'ana', bx, by, bz + 2);
    passos(n, 200);
    const bento = n.estado.baile!.moradores().find((c) => c.morador!.n === N_BAILE.bento)!;
    // longe (5 blocos)
    ir(n, 'ana', bx, by, bz + 5);
    passos(n, 2);
    n.comando('ana', { t: 'falar', criatura: bento.id });
    passos(n, 1);
    expect(n.estado.baile!.abraco()).toBeNull();
    // embaixo do palco (outro chão), perto em linha reta
    ir(n, 'ana', bx, by - 1, bz + 2.5);
    passos(n, 2);
    n.comando('ana', { t: 'falar', criatura: bento.id });
    passos(n, 1);
    expect(n.estado.baile!.abraco()).toBeNull();
    // outro morador (a Lulu): nada
    const [lx, ly, lz] = p.pontos.postos.lulu;
    ir(n, 'ana', lx + 1, ly, lz + 1);
    passos(n, 200);
    const lulu = n.estado.baile!.moradores().find((c) => c.morador!.n === N_BAILE.lulu)!;
    n.comando('ana', { t: 'falar', criatura: lulu.id });
    passos(n, 1);
    expect(n.estado.baile!.abraco()).toBeNull();
  });

  it('nenhum nome novo da festa está em outro povoado (nem um parecido)', () => {
    const pov = BAILE.povoado!;
    // os da festa: os de posto, os vizinhos e o sorteio das profissões
    const daFesta = new Set(
      [...Object.values(pov.porMorador ?? {}).map((m) => m.nome), ...pov.nomes].map(nomeProprio),
    );
    // Lulu, Bento e Dudu ficam (aprovados pelo dono: os da plateia da Vila e do sorteio do
    // Rancho não são falados nem lidos pela criança)
    for (const x of ['lulu', 'bento', 'dudu']) daFesta.delete(x);
    const deFora = new Map<string, string>();
    for (const id of temasDisponiveis()) {
      if (id === 'noite-das-fantasias') continue;
      const t = obterTema(id);
      const p = t.povoado;
      if (!p) continue;
      definirTemaAtivo(t);
      const nomes = [
        ...p.nomes,
        ...Object.values(p.porMorador ?? {}).map((m) => m.nome),
        // os sorteados de verdade em alguns povoados
        ...(['cozinheiro', 'construtor', 'ferreiro'] as const).flatMap((prof) =>
          Array.from({ length: 12 }, (_, k) => nomeDoMorador('3,-7', k, prof)),
        ),
      ];
      for (const x of nomes) deFora.set(nomeProprio(x), `${id}: ${x}`);
    }
    definirTemaAtivo(BAILE);
    const iguais: string[] = [];
    for (const nome of daFesta)
      for (const [fora, onde] of deFora) {
        // igual, ou com as quatro primeiras letras iguais (Dalva e Dalvina, Abel e Abelardo)
        const parecido = nome === fora || (nome.length >= 4 && fora.length >= 4 && nome.slice(0, 4) === fora.slice(0, 4));
        if (parecido) iguais.push(`${nome} ~ ${onde}`);
      }
    expect(iguais).toEqual([]);
  });
});
