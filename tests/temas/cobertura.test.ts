import { beforeAll, describe, expect, it } from 'vitest';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis, TEMA_PADRAO } from '../../src/temas';
import { ativarTemaPuro } from '../../src/temas/ativarPuro';
import { textosOriginais } from '../../src/temas/originais';
import { gerarAtlas, PINTORES } from '../../src/art/atlas';
import { NOMES_TILES } from '../../src/art/tiles';
import { REGISTRO_BLOCOS } from '../../src/world/blocks';
import { CRIATURAS, TIPOS_ANIMAIS, type TipoCriatura } from '../../src/jogo/criaturas';
import { todosItens } from '../../src/jogo/itens';
import { MISSOES } from '../../src/jogo/diario';
import { RECEITAS } from '../../src/jogo/receitas';
import { gerarChunk, ESTILO_PADRAO, definirEstiloMundo } from '../../src/world/chunk';
import { normalizarAparencia, aparenciaPadrao } from '../../src/personagem/aparencia';
import type { Tema } from '../../src/temas/tipos';
import { PROFISSOES } from '../../src/world/povoado';

/**
 * Regras que todo tema cumpre (spec 007): cobertura completa de nomes e tiles,
 * mecânica intocada, contraste legível e nada vazando de outro tema.
 */
const base = obterTema(TEMA_PADRAO);
const orig = textosOriginais();
const temas = temasDisponiveis().map((id) => obterTema(id));
const outros = temas.filter((t) => t.id !== TEMA_PADRAO);

/** Palavras que só fazem sentido no Bruma e Luz (não podem aparecer nos outros). */
const ASSINATURA_BRUMA = ['bruma', 'brumal', 'lume', 'luzita', 'musgo', 'retorcid', 'espectro'];

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** Retrato da mecânica: tudo dos registros menos os nomes. */
function mecanica(): string {
  const semNome = <T extends object>(o: T) => {
    const c = { ...o } as Record<string, unknown>;
    delete c.nome;
    return c;
  };
  return JSON.stringify({
    blocos: REGISTRO_BLOCOS.map(semNome),
    itens: todosItens().map(semNome),
    criaturas: Object.values(CRIATURAS).map(semNome),
    receitas: RECEITAS,
    missoes: MISSOES.map((m) => ({ id: m.id, contador: m.contador, meta: m.meta, icone: m.icone })),
  });
}

describe.each(temas.map((t) => [t.id, t] as [string, Tema]))('tema %s', (_id, t) => {
  beforeAll(() => ativarTemaPuro(t));

  it('dá nome a todos os blocos, itens, criaturas, biomas, climas e estações', () => {
    for (const id of Object.keys(orig.blocos)) {
      const n = t.textos.blocos[Number(id)];
      expect(n, `bloco ${id} (${orig.blocos[Number(id)]})`).toBeTruthy();
      expect(n.length, `bloco ${id}: "${n}" longo demais`).toBeLessThanOrEqual(26);
      expect(n, `bloco ${id} sem espaço sobrando`).toBe(n.trim());
    }
    for (const id of Object.keys(orig.itens)) {
      const n = t.textos.itens[id];
      expect(n, `item ${id}`).toBeTruthy();
      expect(n.length, `item ${id}: "${n}" longo demais`).toBeLessThanOrEqual(26);
    }
    for (const k of Object.keys(orig.criaturas))
      expect(t.textos.criaturas[k as TipoCriatura]).toBeTruthy();
    for (const k of Object.keys(orig.biomas))
      expect(t.textos.biomas[k as keyof typeof orig.biomas]).toBeTruthy();
    for (const k of Object.keys(orig.climas))
      expect(t.textos.climas[k as keyof typeof orig.climas]).toBeTruthy();
    for (const k of Object.keys(orig.estacoes))
      expect(t.textos.estacoes[k as keyof typeof orig.estacoes]).toBeTruthy();
    for (const k of Object.keys(orig.capitulos))
      expect(t.textos.capitulos[k], `capítulo ${k}`).toBeTruthy();
    for (const k of ['diario', 'boasVindas', 'morte'] as const) expect(t.textos[k]).toBeTruthy();
    expect(t.textos.legendas.trovao).toBeTruthy();
    expect(t.textos.legendas.criaturaNoturna).toBeTruthy();
    expect(t.nome && t.lema && t.convite).toBeTruthy();
  });

  it('nomes de bloco não se repetem (o jogador distingue cada um)', () => {
    const vistos = new Map<string, number>();
    for (const [id, n] of Object.entries(t.textos.blocos)) {
      const k = n.toLowerCase();
      expect(vistos.has(k), `"${n}" repetido nos blocos ${vistos.get(k)} e ${id}`).toBe(false);
      vistos.set(k, Number(id));
    }
  });

  it('missões: título e descrição, com os mesmos números e teclas da original', () => {
    for (const m of Object.keys(orig.missoes)) {
      const tm = t.textos.missoes[m];
      expect(tm?.titulo, `missão ${m}`).toBeTruthy();
      expect(tm?.descricao, `missão ${m}`).toBeTruthy();
      const numeros = orig.missoes[m].descricao.match(/\d+/g) ?? [];
      for (const n of numeros)
        expect(tm.descricao, `missão ${m} perdeu o número ${n}`).toContain(n);
      const tecla = orig.missoes[m].descricao.match(/\(tecla .\)/);
      if (tecla) expect(tm.descricao).toContain(tecla[0]);
    }
  });

  it('o atlas tem todos os tiles e os blocos sólidos não têm buracos', () => {
    const atlas = gerarAtlas(1337);
    expect(atlas.tiles.length).toBe(NOMES_TILES.length);
    const opacos = new Set<string>();
    for (const b of REGISTRO_BLOCOS)
      if (b.opaco && !b.recorte && !b.folhas && !b.planta && !b.forma)
        for (const n of [b.tiles.topo, b.tiles.lado, b.tiles.base, b.tiles.frente])
          if (n) opacos.add(n);
    // só os tiles que já são inteiros no tema base (o topo do cacto tem cantos vazados)
    const inteiro = (nome: string) => {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) if (PINTORES[nome](x, y, 1234)[3] < 250) return false;
      return true;
    };
    for (const nome of opacos) {
      if (!inteiro(nome)) continue;
      const p = t.pintores[nome] ?? PINTORES[nome];
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const px = p(x, y, 1234);
          expect(px.length).toBe(4);
          expect(px[3], `tile ${nome} transparente em ${x},${y}`).toBeGreaterThanOrEqual(250);
        }
    }
  });

  it('modelos de criatura: as cinco, com cabeça e pernas que animam', () => {
    for (const tipo of TIPOS_ANIMAIS) {
      const pecas = t.criaturas[tipo];
      expect(pecas?.length, tipo).toBeGreaterThan(2);
      const papeis = new Set(pecas.map((p) => p.papel));
      const papeisBase = new Set(base.criaturas[tipo].map((p) => p.papel));
      // cabeça sempre; pernas podem virar rodas ou asas; cauda é opcional
      if (papeisBase.has('cabeca')) expect(papeis.has('cabeca'), `${tipo} sem cabeça`).toBe(true);
      const anda =
        (papeis.has('perna0') && papeis.has('perna1')) ||
        papeis.has('roda') ||
        (papeis.has('asa0') && papeis.has('asa1'));
      if (papeisBase.has('perna0')) expect(anda, `${tipo} sem pernas, rodas ou asas`).toBe(true);
      for (const p of pecas) {
        expect(/^#[0-9a-f]{6}$/i.test(p.cor), `${tipo}: cor ${p.cor}`).toBe(true);
        expect(Math.min(...p.t), `${tipo}: peça sem volume`).toBeGreaterThan(0);
      }
      // cabe na caixa de colisão (com folga para orelhas, chifres e cauda)
      const d = CRIATURAS[tipo];
      const topo = Math.max(...pecas.map((p) => p.p[1] + p.t[1] / 2));
      expect(topo, `${tipo} alto demais`).toBeLessThanOrEqual(d.alt * 1.7 + 0.1);
      const largura = Math.max(...pecas.map((p) => Math.max(Math.abs(p.p[0]) + p.t[0] / 2, 0)));
      expect(largura, `${tipo} largo demais`).toBeLessThanOrEqual(d.mw * 2.6 + 0.1);
      // pés no chão (peixe e criatura noturna flutuam)
      if (tipo !== 'peixe' && tipo !== 'espectro') {
        const pe = Math.min(...pecas.map((p) => p.p[1] - p.t[1] / 2));
        expect(Math.abs(pe), `${tipo} não encosta no chão`).toBeLessThanOrEqual(0.06);
      }
    }
  });

  it('cada criatura tem jeito de andar e vozes audíveis e curtas', () => {
    for (const tipo of TIPOS_ANIMAIS) {
      const m = t.movimento[tipo];
      expect(m, tipo).toBeTruthy();
      expect(m.saltita >= 0 && m.saltita <= 0.4).toBe(true);
      expect(m.flutua >= 0 && m.flutua <= 0.25).toBe(true);
      expect(m.ginga >= 0 && m.ginga <= 0.3).toBe(true);
      for (const momento of ['chamado', 'susto', 'contente'] as const) {
        const v = t.vozes[tipo]?.[momento];
        expect(v, `${tipo} ${momento}`).toBeTruthy();
        for (const f of [v.de, v.ate])
          expect(f >= 60 && f <= 6000, `${tipo} ${momento}: ${f} Hz`).toBe(true);
        expect(v.dur >= 0.03 && v.dur <= 1.5).toBe(true);
        expect(v.repeticoes >= 1 && v.repeticoes <= 6).toBe(true);
        const total = v.repeticoes * v.dur + (v.repeticoes - 1) * v.intervalo;
        expect(total, `${tipo} ${momento} longo demais`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('povoado do tema: nomes, profissões, moradores, vozes, textos e formas', () => {
    const pv = t.povoado;
    expect(pv, 'sem seção povoado').toBeTruthy();
    if (!pv) return;
    if (t.id !== TEMA_PADRAO) expect(pv, 'usa o povoado do Bruma e Luz').not.toBe(base.povoado);
    expect(pv.nome).toBeTruthy();
    for (const p of PROFISSOES) expect(pv.profissoes[p], `profissão ${p}`).toBeTruthy();
    expect(new Set(pv.nomes).size, 'nomes de moradores').toBeGreaterThanOrEqual(8);
    for (const n of pv.nomes) expect(n.length).toBeLessThanOrEqual(16);
    for (const p of PROFISSOES) {
      const pecas = pv.moradores[p];
      expect(pecas?.length, `morador ${p}`).toBeGreaterThan(4);
      const papeis = new Set(pecas.map((q) => q.papel));
      expect(
        papeis.has('cabeca') && papeis.has('perna0') && papeis.has('perna1'),
        `morador ${p} anima`,
      ).toBe(true);
      const topo = Math.max(...pecas.map((q) => q.p[1] + q.t[1] / 2));
      expect(topo, `morador ${p} alto demais`).toBeLessThanOrEqual(2.3);
      const pe = Math.min(...pecas.map((q) => q.p[1] - q.t[1] / 2));
      expect(Math.abs(pe), `morador ${p} sem pé no chão`).toBeLessThanOrEqual(0.06);
      for (const q of pecas) expect(/^#[0-9a-f]{6}$/i.test(q.cor)).toBe(true);
    }
    for (const momento of ['chamado', 'susto', 'contente', 'obrigado'] as const) {
      const v = pv.vozes[momento];
      expect(v, momento).toBeTruthy();
      for (const f of [v.de, v.ate]) expect(f >= 60 && f <= 6000).toBe(true);
    }
    for (const k of ['trocas', 'trocar', 'faltam', 'chegou'] as const)
      expect(pv.textos[k], k).toBeTruthy();
    const f = t.mundo.povoado;
    if (t.id !== TEMA_PADRAO) expect(f, 'formas das construções').toBeTruthy();
    if (f) {
      for (const k of ['casa', 'oficina', 'deposito'] as const)
        expect(['duas-aguas', 'cupula', 'tenda', 'redonda', 'modulo']).toContain(f[k]);
      expect(['poco', 'fonte', 'antena', 'totem', 'esqueleto']).toContain(f.marco);
    }
  });

  it('ciclo do dia: quadros em ordem de 0 a 1 e cores válidas', () => {
    const q = t.quadrosCeu;
    expect(q.length).toBeGreaterThanOrEqual(6);
    expect(q[0].h).toBe(0);
    expect(q[q.length - 1].h).toBe(1);
    for (let i = 1; i < q.length; i++) expect(q[i].h).toBeGreaterThan(q[i - 1].h);
    for (const f of q)
      for (const c of [f.zen, f.meio, f.hor, f.luz, f.ceu, f.chao, f.amb])
        for (const v of c) expect(v >= 0 && v <= 1.6).toBe(true);
    // a primeira e a última hora são a mesma (sem salto à meia-noite)
    expect(q[0].zen).toEqual(q[q.length - 1].zen);
  });

  it('cores da interface legíveis', () => {
    // acento sobre o painel escuro do jogo e lema sobre o fundo do título
    expect(contraste(t.cores.acento, '#1d1924')).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.cores.lema, t.cores.fundoTitulo[0])).toBeGreaterThanOrEqual(4.5);
    expect(contraste(t.cores.lema, t.cores.fundoTitulo[1])).toBeGreaterThanOrEqual(4.5);
  });

  it('aparência sugerida é válida', () => {
    const a = { ...aparenciaPadrao(), ...t.personagem };
    expect(normalizarAparencia(a)).toEqual(a);
  });

  it('formas de árvore e estrutura geram terreno sem erro', () => {
    definirEstiloMundo(t.mundo);
    for (let cx = -3; cx <= 3; cx++) for (let cz = -3; cz <= 3; cz++) gerarChunk(cx, cz, 1337);
    definirEstiloMundo(ESTILO_PADRAO);
  });
});

describe('temas não mudam a mecânica', () => {
  it('blocos, itens, criaturas, receitas e missões iguais em todos os temas', () => {
    ativarTemaPuro(base);
    const ref = mecanica();
    for (const t of outros) {
      ativarTemaPuro(t);
      expect(mecanica(), t.id).toBe(ref);
    }
    ativarTemaPuro(base);
  });

  it('voltar ao tema base devolve os nomes originais', () => {
    for (const t of outros) ativarTemaPuro(t);
    ativarTemaPuro(base);
    for (const b of REGISTRO_BLOCOS) if (b.id) expect(b.nome).toBe(orig.blocos[b.id]);
    for (const m of MISSOES) expect(m.titulo).toBe(orig.missoes[m.id].titulo);
  });

  it('baús e minérios no mesmo lugar (mesma exploração em todo tema)', () => {
    const contar = () => {
      const r = { bau: 0, minerios: 0, comida: 0 };
      for (let cx = -8; cx <= 8; cx++)
        for (let cz = -8; cz <= 8; cz++) {
          const c = gerarChunk(cx, cz, 1337);
          for (let i = 0; i < c.length; i++) {
            if (c[i] === 42) r.bau++;
            else if (c[i] >= 15 && c[i] <= 19) r.minerios++;
            // frutinhas, abóbora, cogumelo e cristal de luz: comida e luz iguais em todo tema
            else if (c[i] === 54 || c[i] === 65 || c[i] === 10 || c[i] === 6) r.comida++;
          }
        }
      return r;
    };
    definirEstiloMundo(ESTILO_PADRAO);
    const ref = contar();
    for (const t of outros) {
      definirEstiloMundo(t.mundo);
      const r = contar();
      expect(r.bau, t.id).toBe(ref.bau);
      expect(
        Math.abs(r.comida - ref.comida) / ref.comida,
        `${t.id}: comida e luz no mundo`,
      ).toBeLessThan(0.1);
      // crateras mudam a superfície: os minérios variam pouco
      expect(Math.abs(r.minerios - ref.minerios) / ref.minerios, t.id).toBeLessThan(0.1);
    }
    definirEstiloMundo(ESTILO_PADRAO);
  });
});

describe('cada tema é ele mesmo', () => {
  it.each(outros.map((t) => [t.id, t] as [string, Tema]))(
    '%s repinta os tiles e não usa nomes do Bruma e Luz',
    (_id, t) => {
      const iguais = t.mesmoQueBase ?? [];
      expect(iguais.length, 'tiles iguais ao base demais').toBeLessThanOrEqual(
        Math.ceil(NOMES_TILES.length * 0.1),
      );
      for (const nome of NOMES_TILES) {
        if (iguais.includes(nome)) continue;
        expect(t.pintores[nome], `tile ${nome} não repintado`).toBeTypeOf('function');
        // e de fato diferente do base
        let dif = 0;
        for (let y = 0; y < 16; y++)
          for (let x = 0; x < 16; x++) {
            const a = t.pintores[nome](x, y, 777);
            const b = PINTORES[nome](x, y, 777);
            dif +=
              Math.abs(a[0] - b[0]) +
              Math.abs(a[1] - b[1]) +
              Math.abs(a[2] - b[2]) +
              Math.abs(a[3] - b[3]);
          }
        expect(dif, `tile ${nome} igual ao base`).toBeGreaterThan(0);
      }
      const textos = [
        ...Object.values(t.textos.blocos),
        ...Object.values(t.textos.itens),
        ...Object.values(t.textos.criaturas),
        ...Object.values(t.textos.biomas),
        ...Object.values(t.textos.missoes).flatMap((m) => [m.titulo, m.descricao]),
        ...Object.values(t.textos.capitulos),
        t.textos.boasVindas,
        t.textos.morte,
        t.textos.legendas.criaturaNoturna,
        t.lema,
        t.convite,
        ...(t.povoado
          ? [
              t.povoado.nome,
              ...Object.values(t.povoado.profissoes),
              ...t.povoado.nomes,
              ...Object.values(t.povoado.textos),
            ]
          : []),
      ].map((s) => s.toLowerCase());
      for (const p of ASSINATURA_BRUMA)
        for (const s of textos)
          expect(s.includes(p), `"${s}" lembra o Bruma e Luz (${p})`).toBe(false);
    },
  );

  it('temas diferentes não se parecem entre si nos nomes principais', () => {
    for (const a of temas)
      for (const b of temas) {
        if (a.id >= b.id) continue;
        const iguais = Object.keys(a.textos.criaturas).filter(
          (k) => a.textos.criaturas[k as TipoCriatura] === b.textos.criaturas[k as TipoCriatura],
        );
        expect(iguais, `${a.id} e ${b.id} com criaturas de mesmo nome`).toEqual([]);
        expect(a.textos.blocos[1], `${a.id} e ${b.id}: mesmo nome para o chão`).not.toBe(
          b.textos.blocos[1],
        );
      }
  });
});

describe('robustez do registro', () => {
  it('tema desconhecido ou ausente cai no Bruma e Luz', () => {
    expect(obterTema('nao-existe').id).toBe(TEMA_PADRAO);
    expect(obterTema(undefined).id).toBe(TEMA_PADRAO);
    expect(obterTema(null).id).toBe(TEMA_PADRAO);
  });

  it('gerar o atlas de cada tema leva menos de 150 ms', () => {
    for (const t of temas) {
      ativarTemaPuro(t);
      gerarAtlas(1337); // aquece
      const t0 = performance.now();
      gerarAtlas(1337);
      expect(performance.now() - t0, t.id).toBeLessThan(150);
    }
    ativarTemaPuro(base);
  });
});
