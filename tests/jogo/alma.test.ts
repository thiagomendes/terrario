import { describe, expect, it } from 'vitest';
import {
  mundoAlmaDoEstilo,
  BANCA,
  COMPRAS_POR_SESSAO,
  GANHO_DE_EVENTO,
  ganhoDaChave,
  MISSOES,
  MOEDAS_BIS,
  MUNDOS_ALMA,
  PREMIUM,
  PRESENTES_NIVEL,
  SESSAO,
  XP_MISSAO,
  abertas,
  almaMundoVazia,
  aplicarGanho,
  bancaDoMundo,
  comprarPremium,
  conferirBanca,
  conferirObrasFeitas,
  descontar,
  estrelasDe,
  fixar,
  listaAcabou,
  missaoDeBis,
  missaoDoHud,
  missoesDoMundo,
  moedasDoMundo,
  mundoAlmaDaPlanta,
  nivelDoXp,
  normalizarAlmaDoMundo,
  normalizarAlmaMundo,
  normalizarPerfilAlma,
  perfilAlmaVazio,
  registrarEvento,
  vestirPremium,
  saiAoVestir,
  temMissaoNova,
  visitarLugar,
  vistaAlmaMundo,
  type AlmaMundo,
  type Missao,
  type MundoAlma,
  type PerfilAlma,
  type ResultadoAlma,
} from '../../src/jogo/alma';
import { criarRelogioConvite } from '../../src/jogo/guia';
import { celulasDaObra, obraDoCanteiro } from '../../src/world/obras';
import { obterItem } from '../../src/jogo/itens';
import { registrarCatalogo } from '../../src/jogo/catalogo';

registrarCatalogo();

/** Faz a missão inteira com as ações do jeito que a criança faz (devolve o resultado somado). */
function fazer(e: AlmaMundo, mundo: MundoAlma, m: Missao, obras: Set<number>): ResultadoAlma {
  const total = {
    ganho: { moedas: 0, xp: 0, pontos: {} },
    missoes: [],
    mudouLista: false,
  } as ResultadoAlma;
  const soma = (r: ResultadoAlma) => {
    total.ganho.moedas += r.ganho.moedas;
    total.ganho.xp += r.ganho.xp;
    total.missoes.push(...r.missoes);
  };
  if (m.conta.tipo === 'obra') {
    const n = m.conta.canteiro;
    const blocos = celulasDaObra(obraDoCanteiro(n)!).length;
    // cada bloco da obra também é um bloco posto
    soma(registrarEvento(e, mundo, 'obra:bloco', blocos));
    soma(registrarEvento(e, mundo, 'colocou', blocos));
    obras.add(n);
    soma(
      conferirObrasFeitas(
        e,
        mundo,
        (k) => obras.has(k),
        () => true,
        () => blocos,
      ),
    );
  } else if (m.conta.tipo === 'lugares') {
    for (const u of m.conta.usos) soma(visitarLugar(e, mundo, u));
  } else {
    const k = m.conta.chave;
    for (let i = 0; i < m.conta.meta; i++) {
      soma(registrarEvento(e, mundo, k));
      // a colheita da roça própria também é colheita
      if (k === 'colheu:minha') soma(registrarEvento(e, mundo, 'colheu'));
      if (k === 'colheu') soma(registrarEvento(e, mundo, 'plantou'));
    }
  }
  return total;
}

describe('alma: os números da spec', () => {
  it('Cidade 8 missões e 30 moedinhas; Rancho 7 e 25; ids únicos', () => {
    expect(missoesDoMundo('cidade-grande')).toHaveLength(8);
    expect(missoesDoMundo('rancho-alegre')).toHaveLength(7);
    expect(moedasDoMundo('cidade-grande')).toBe(30);
    expect(moedasDoMundo('rancho-alegre')).toBe(25);
    expect(new Set(MISSOES.map((m) => m.id)).size).toBe(MISSOES.length);
  });
  it('prêmios especiais de cada mundo, na primeira e na última missão', () => {
    const c = missoesDoMundo('cidade-grande');
    const r = missoesDoMundo('rancho-alegre');
    expect(c[0].fantasia).toBe('capacete-obra');
    expect(c[7].fantasia).toBe('colete-obra');
    expect(r[0].fantasia).toBe('caipira');
    expect(r[6].fantasia).toBe('peao-campeao');
    expect(r[6].conta).toEqual({ tipo: 'evento', chave: 'colheu:minha', meta: 6 });
  });
  it('níveis 2 a 10 nos XP da spec, +200 depois do 10', () => {
    const marcos = [40, 100, 180, 280, 400, 540, 700, 880, 1080];
    marcos.forEach((xp, i) => {
      expect(nivelDoXp(xp - 0.01).nivel).toBe(i + 1);
      expect(nivelDoXp(xp).nivel).toBe(i + 2);
    });
    expect(nivelDoXp(1279).nivel).toBe(10);
    expect(nivelDoXp(1280).nivel).toBe(11);
    expect(nivelDoXp(1480).nivel).toBe(12);
    expect(nivelDoXp(0)).toEqual({ nivel: 1, fracao: 0, falta: 40 });
  });
  it('presentes dos níveis 2 a 10, com 2 a 5 moedinhas', () => {
    expect(PRESENTES_NIVEL.map((p) => p.nivel)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(PRESENTES_NIVEL.map((p) => p.moedas)).toEqual([2, 2, 2, 3, 3, 3, 3, 3, 5]);
  });
  it('estrelas nos 5, 15, 30, 50 e 80 pontos', () => {
    expect(estrelasDe(4.9).estrelas).toBe(0);
    expect(estrelasDe(5).estrelas).toBe(1);
    expect(estrelasDe(80).estrelas).toBe(5);
    expect(estrelasDe(500)).toEqual({ estrelas: 5, fracao: 1 });
  });
  it('XP das ações soltas da spec', () => {
    expect(GANHO_DE_EVENTO['obra:bloco'].xp).toBe(1);
    expect(GANHO_DE_EVENTO.colheu.xp).toBe(2);
    expect(GANHO_DE_EVENTO.plantou.xp).toBe(1);
    expect(GANHO_DE_EVENTO['criou:coelho'].xp).toBe(4);
    expect(GANHO_DE_EVENTO.cozinhou.xp).toBe(5);
    expect(ganhoDaChave('criou:dino')).toEqual(GANHO_DE_EVENTO['criou:coelho']);
    expect(ganhoDaChave('fundiu:carne_assada')).toEqual(GANHO_DE_EVENTO['fundiu:pipoca']);
    expect(ganhoDaChave('quebrou:pedra')).toBeUndefined();
    expect(GANHO_DE_EVENTO['visitou:lugar'].xp).toBe(5);
    expect(GANHO_DE_EVENTO['trocou:cozinheiro'].xp).toBe(3);
    expect(GANHO_DE_EVENTO.colocou.xp).toBe(0.2);
  });
  it('mundo da alma pela planta dos povoados', () => {
    expect(mundoAlmaDaPlanta('cidade')).toBe('cidade-grande');
    expect(mundoAlmaDaPlanta('sitio')).toBe('rancho-alegre');
    expect(mundoAlmaDaPlanta('vila')).toBeNull();
    expect(mundoAlmaDaPlanta(undefined)).toBeNull();
  });
});

describe('alma: missões', () => {
  it('2 abertas, na ordem; toda aberta conta, fixada ou não', () => {
    const e = almaMundoVazia();
    expect(abertas(e, 'rancho-alegre').map((m) => m.id)).toEqual(['r1', 'r2']);
    expect(fixar(e, 'rancho-alegre', 'r2')).toBe(true);
    expect(missaoDoHud(e, 'rancho-alegre')?.id).toBe('r2');
    // r1 conta mesmo com r2 fixada
    const r = registrarEvento(e, 'rancho-alegre', 'colheu');
    expect(r.missoes).toEqual([{ id: 'r1', feito: 1, meta: 5 }]);
    // fixar uma que não está aberta não muda nada
    expect(fixar(e, 'rancho-alegre', 'r5')).toBe(false);
    expect(e.fixada).toBe('r2');
    expect(fixar(e, 'rancho-alegre', null)).toBe(true);
    expect(e.fixada).toBeNull();
  });
  it('o prêmio sai igual ao mostrado (moedas, fantasia, 20 XP, 3 pontos), nunca premium', () => {
    const premium = new Set(PREMIUM.map((p) => p.id));
    for (const mundo of MUNDOS_ALMA) {
      const e = almaMundoVazia();
      const obras = new Set<number>();
      for (const m of missoesDoMundo(mundo)) {
        const r = fazer(e, mundo, m, obras);
        const c = r.missoes.find((x) => x.id === m.id && x.concluiu)!;
        expect(c, m.id).toBeTruthy();
        expect(c.fantasia).toBe(m.fantasia);
        if (c.fantasia) expect(premium.has(c.fantasia)).toBe(false);
        expect(e.livro.pontos[m.habilidade]).toBeGreaterThanOrEqual(3);
      }
      expect(e.feitas).toHaveLength(missoesDoMundo(mundo).length);
      expect(e.livro.moedas).toBe(moedasDoMundo(mundo));
      expect(e.livro.xp).toBeGreaterThanOrEqual(XP_MISSAO * missoesDoMundo(mundo).length);
    }
  });
  it('a devagar conta desde o começo, entra nas abertas ao começar e nunca falha', () => {
    const e = almaMundoVazia();
    const r = registrarEvento(e, 'rancho-alegre', 'coletou:ovo');
    expect(r.missoes).toEqual([{ id: 'r6', feito: 1, meta: 2 }]);
    expect(r.mudouLista).toBe(true);
    expect(abertas(e, 'rancho-alegre').map((m) => m.id)).toEqual(['r1', 'r2', 'r6']);
    const r2 = registrarEvento(e, 'rancho-alegre', 'coletou:ovo');
    expect(r2.missoes[0]).toMatchObject({ id: 'r6', concluiu: true });
    expect(r2.ganho.moedas).toBe(4);
  });
  it('obra feita: quem ajudou ganha; quem não ajudou passa sem prêmio, e a lista anda', () => {
    const feitas = new Set([1, 2]);
    const ajudou = almaMundoVazia();
    const r = conferirObrasFeitas(
      ajudou,
      'cidade-grande',
      (n) => feitas.has(n),
      () => true,
      () => 23,
    );
    expect(r.missoes.filter((m) => m.concluiu).map((m) => m.id)).toEqual(['c1', 'c2']);
    expect(r.ganho.moedas).toBe(6);
    expect(r.missoes[0].fantasia).toBe('capacete-obra');
    const visita = almaMundoVazia();
    const v = conferirObrasFeitas(
      visita,
      'cidade-grande',
      (n) => feitas.has(n),
      () => false,
      () => 23,
    );
    expect(v.ganho.moedas).toBe(0);
    expect(visita.puladas).toEqual(['c1', 'c2']);
    expect(abertas(visita, 'cidade-grande').map((m) => m.id)).toEqual(['c3', 'c4']);
  });
  it('passeio: lugares diferentes, cada um uma vez', () => {
    const e = almaMundoVazia();
    // as obras 1 e 2 (as primeiras abertas) já foram
    conferirObrasFeitas(
      e,
      'cidade-grande',
      (n) => n <= 2,
      () => true,
      () => 1,
    );
    expect(visitarLugar(e, 'cidade-grande', 'padaria').ganho.xp).toBe(5);
    expect(visitarLugar(e, 'cidade-grande', 'padaria').ganho.xp).toBe(0);
    visitarLugar(e, 'cidade-grande', 'praca');
    visitarLugar(e, 'cidade-grande', 'escola');
    const r = visitarLugar(e, 'cidade-grande', 'sorveteria');
    expect(r.missoes.find((m) => m.id === 'c3')?.concluiu).toBe(true);
  });
  it('passeio: o núcleo diz quais lugares já foram (a bolinha certa acende)', () => {
    const e = almaMundoVazia();
    conferirObrasFeitas(
      e,
      'cidade-grande',
      (n) => n <= 2,
      () => true,
      () => 1,
    );
    const r = visitarLugar(e, 'cidade-grande', 'sorveteria');
    expect(r.missoes.find((m) => m.id === 'c3')).toEqual({
      id: 'c3',
      feito: 1,
      meta: 3,
      usos: ['sorveteria'],
    });
    // a ordem é a da missão (padaria, escola, sorveteria), não a da visita
    const r2 = visitarLugar(e, 'cidade-grande', 'padaria');
    expect(r2.missoes.find((m) => m.id === 'c3')?.usos).toEqual(['padaria', 'sorveteria']);
    const v = vistaAlmaMundo(e, 'cidade-grande', () => null);
    expect(v.abertas.find((a) => a.id === 'c3')?.usos).toEqual(['padaria', 'sorveteria']);
    // as outras missões não levam o campo
    expect(v.abertas.find((a) => a.id !== 'c3')).not.toHaveProperty('usos');
  });
  it('bis: depois da lista, as de ação de novo, 2 moedinhas, metade do XP, sem fantasia', () => {
    const e = almaMundoVazia();
    const obras = new Set<number>();
    for (const m of missoesDoMundo('rancho-alegre')) fazer(e, 'rancho-alegre', m, obras);
    const bis = missaoDeBis(e, 'rancho-alegre')!;
    expect(bis.id).toBe('r1');
    expect(abertas(e, 'rancho-alegre').map((m) => m.id)).toEqual(['r1']);
    let r: ResultadoAlma | null = null;
    // (a última colheita da r7 já contou uma no bis)
    for (let i = 0; i < 5 && !r?.missoes.some((m) => m.concluiu); i++)
      r = registrarEvento(e, 'rancho-alegre', 'colheu');
    const c = r!.missoes.find((m) => m.concluiu)!;
    expect(c).toMatchObject({ id: 'r1', bis: true });
    expect(c.fantasia).toBeUndefined();
    expect(r!.ganho.moedas).toBe(MOEDAS_BIS);
    expect(r!.ganho.xp).toBe(XP_MISSAO / 2 + 2);
    expect(missaoDeBis(e, 'rancho-alegre')!.id).toBe('r2');
  });
  // dono, 16 nov 2026 (Vila Neon): "o jogo ficou oferecendo as missões que eu já tinha feito"
  for (const mundo of MUNDOS_ALMA)
    it(`${mundo}: o convite nunca é para missão já feita; com tudo feito, não convida para nada`, () => {
      const e = almaMundoVazia();
      const obras = new Set<number>();
      const vista = () => vistaAlmaMundo(e, mundo, () => null);
      const total = missoesDoMundo(mundo).length;
      expect(total).toBeGreaterThan(0);
      for (let k = 0; k < total + 2 && !listaAcabou(e, mundo); k++) {
        // enquanto falta alguma, há o que oferecer, e nada do que se oferece já foi feito
        const v = vista();
        expect(temMissaoNova(v)).toBe(true);
        for (const a of v.abertas) {
          expect(a.bis).toBeUndefined();
          expect(v.feitas).not.toContain(a.id);
        }
        // a criança escolhe pela estrela (o quadro) e faz
        const m = abertas(e, mundo)[0];
        fixar(e, mundo, m.id);
        fazer(e, mundo, m, obras);
        expect(e.fixada).toBeNull();
      }
      expect(listaAcabou(e, mundo)).toBe(true);
      // tudo feito: nada a oferecer, agora e depois de cada bis que ela quiser repetir
      for (let k = 0; k < 6; k++) {
        const v = vista();
        expect(temMissaoNova(v)).toBe(false);
        expect(v.abertas.every((a) => a.bis)).toBe(true);
        const bis = missaoDeBis(e, mundo);
        if (!bis) break;
        fixar(e, mundo, bis.id);
        fazer(e, mundo, bis, obras);
        // a que acabou sai do selinho (não volta sozinha)
        expect(e.fixada).toBeNull();
      }
      // e o relógio do convite, sem missão nova, nunca acende (nem depois de muito tempo)
      const relogio = criarRelogioConvite(2);
      let mostrou = 0;
      for (let i = 0; i < 600; i++)
        if (relogio.passo(0.1, { missao: false, noJogo: true, nova: temMissaoNova(vista()) }).mostra)
          mostrou++;
      expect(mostrou).toBe(0);
      expect(relogio.segundos).toBe(0);
    });
  it('o convite volta quando aparece missão nova (e só então)', () => {
    const relogio = criarRelogioConvite(2);
    for (let i = 0; i < 100; i++)
      expect(relogio.passo(0.1, { missao: false, noJogo: true, nova: false }).mostra).toBe(false);
    let acendeu = 0;
    for (let i = 0; i < 40; i++)
      if (relogio.passo(0.1, { missao: false, noJogo: true, nova: true }).acendeu) acendeu++;
    expect(acendeu).toBe(1);
    expect(temMissaoNova(null)).toBe(false);
    expect(temMissaoNova({ abertas: [{ id: 'r1', feito: 0, meta: 3 }], feitas: [] })).toBe(true);
    // (um quadro que chegue com uma feita entre as abertas também não vira convite)
    expect(temMissaoNova({ abertas: [{ id: 'r1', feito: 0, meta: 3 }], feitas: ['r1'] })).toBe(false);
    expect(
      temMissaoNova({ abertas: [{ id: 'r1', feito: 0, meta: 3, bis: true }], feitas: ['r1'] }),
    ).toBe(false);
  });
  it('a vista do quadro leva as abertas com o progresso (a obra pelo canteiro)', () => {
    const e = almaMundoVazia();
    const v = vistaAlmaMundo(e, 'cidade-grande', (n) =>
      n === 1 ? { cheias: 7, total: 23 } : null,
    );
    expect(v.abertas[0]).toEqual({ id: 'c1', feito: 7, meta: 23 });
    expect(v.abertas[1]).toEqual({ id: 'c2', feito: 0, meta: 1 });
  });
});

describe('alma: banca e premium', () => {
  it('banca só do tema; preços e quantidades da spec; itens que existem', () => {
    expect(bancaDoMundo('cidade-grande').map((i) => i.preco)).toEqual([3, 4, 4, 5, 5]);
    expect(bancaDoMundo('rancho-alegre').map((i) => i.preco)).toEqual([3, 3, 4, 4, 4, 6]);
    for (const b of BANCA) if (b.item) expect(obterItem(b.item), b.id).toBeTruthy();
    expect(conferirBanca('cidade-grande', 'feno', 99, 0, 99)).toEqual({
      ok: false,
      motivo: 'tema',
    });
    expect(conferirBanca(null, 'feno', 99, 0, 99)).toEqual({ ok: false, motivo: 'tema' });
    expect(conferirBanca('rancho-alegre', 'feno', 2, 0, 99)).toEqual({
      ok: false,
      motivo: 'saldo',
    });
    expect(conferirBanca('rancho-alegre', 'feno', 3, 0, 1.9)).toEqual({
      ok: false,
      motivo: 'espera',
    });
    expect(conferirBanca('rancho-alegre', 'feno', 3, COMPRAS_POR_SESSAO, 99)).toEqual({
      ok: false,
      motivo: 'limite',
    });
    expect(conferirBanca('rancho-alegre', 'feno', 3, 0, 2).ok).toBe(true);
    // sem bicho que não exista no tema
    expect(BANCA.some((b) => /gato|ponei/.test(b.id))).toBe(false);
  });
  it('lojinha: só os 6 de lançamento, de 15 a 80, nada de missão nem de nível', () => {
    expect(PREMIUM.map((p) => [p.id, p.preco])).toEqual([
      ['camiseta-aquario', 15],
      ['tenis-cometa', 20],
      ['capa-estrelas', 30],
      ['dragao', 55],
      ['pinguim', 60],
      ['unicornio', 80],
    ]);
    const ids = new Set(PREMIUM.map((p) => p.id));
    for (const m of MISSOES) expect(ids.has(m.fantasia ?? '')).toBe(false);
    for (const p of PRESENTES_NIVEL) expect(ids.has(p.desenho)).toBe(false);
  });
  it('comprar premium: preço fixo, um de cada, veste na hora; vestir e tirar', () => {
    const c = perfilAlmaVazio();
    c.moedas = 40;
    expect(comprarPremium(c, 'unicornio')).toEqual({ ok: false, motivo: 'faltam-moedas' });
    expect(comprarPremium(c, 'visor-estelar')).toEqual({ ok: false, motivo: 'nao-existe' });
    expect(comprarPremium(c, 'tenis-cometa')).toEqual({ ok: true });
    expect(c.moedas).toBe(20);
    expect(c.vestidos.roupa).toBe('tenis-cometa');
    expect(comprarPremium(c, 'tenis-cometa')).toEqual({ ok: false, motivo: 'ja-tem' });
    expect(comprarPremium(c, 'camiseta-aquario')).toEqual({ ok: true });
    expect(c.vestidos.roupa).toBe('camiseta-aquario');
    expect(vestirPremium(c, 'camiseta-aquario', false)).toBe(true);
    expect(c.vestidos.roupa).toBeUndefined();
    expect(vestirPremium(c, 'dragao', true)).toBe(false);
  });
  it('o dragãozinho e a capa dividem as costas: vestir um tira o outro, às claras', () => {
    const c = perfilAlmaVazio();
    c.moedas = 200;
    expect(comprarPremium(c, 'capa-estrelas')).toEqual({ ok: true });
    expect(comprarPremium(c, 'tenis-cometa')).toEqual({ ok: true });
    expect(saiAoVestir(c.vestidos, 'dragao')).toEqual(['capa-estrelas']);
    expect(saiAoVestir(c.vestidos, 'camiseta-aquario')).toEqual(['tenis-cometa']);
    expect(saiAoVestir(c.vestidos, 'unicornio')).toEqual([]);
    expect(comprarPremium(c, 'dragao')).toEqual({ ok: true });
    expect(c.vestidos).toEqual({ roupa: 'tenis-cometa', fantasia: 'dragao' });
    expect(saiAoVestir(c.vestidos, 'capa-estrelas')).toEqual(['dragao']);
    expect(vestirPremium(c, 'capa-estrelas', true)).toBe(true);
    expect(c.vestidos).toEqual({ roupa: 'tenis-cometa', costas: 'capa-estrelas' });
    // guardado antigo com as duas: fica a fantasia
    const n = normalizarPerfilAlma({
      ...c,
      vestidos: { costas: 'capa-estrelas', fantasia: 'dragao' },
    });
    expect(n.vestidos).toEqual({ fantasia: 'dragao' });
    for (const p of PREMIUM) expect(p.desenho).toBe(`premium:${p.id}`);
  });
});

describe('alma: perfil da criança', () => {
  it('aplica só o ganho; presentes de nível vêm do XP; estrelas', () => {
    const c = perfilAlmaVazio();
    const m = aplicarGanho(c, { moedas: 3, xp: 105, pontos: { construtor: 6 } }, ['capacete-obra']);
    expect(m.niveis.map((n) => n.nivel)).toEqual([2, 3]);
    expect(m.moedas).toBe(3 + 2 + 2);
    expect(c.moedas).toBe(7);
    expect(m.estrelas).toEqual([{ habilidade: 'construtor', estrelas: 1 }]);
    expect(c.fantasias).toEqual(['capacete-obra']);
    expect(aplicarGanho(c, { moedas: 0, xp: 0, pontos: {} }, ['capacete-obra']).fantasias).toEqual(
      [],
    );
    descontar(c, 4);
    expect(c.moedas).toBe(3);
    descontar(c, 99);
    expect(c.moedas).toBe(0);
    expect(c.gastou).toBe(7);
  });
  it('ganho estranho não estraga o perfil', () => {
    const c = perfilAlmaVazio();
    aplicarGanho(c, { moedas: -5, xp: NaN, pontos: { construtor: -1 } } as never);
    expect(c).toEqual(perfilAlmaVazio());
  });
  it('normalização do perfil: só ids do catálogo, vestido só se tem, números com teto', () => {
    const c = normalizarPerfilAlma({
      moedas: 1e12,
      xp: -3,
      pontos: { construtor: 7, magia: 9 },
      premium: ['unicornio', 'unicornio', 'visor-estelar', 3],
      vestidos: { bicho: 'unicornio', roupa: 'tenis-cometa', costas: 'unicornio' },
      fantasias: ['caipira', 5],
    });
    expect(c.moedas).toBe(99_999);
    expect(c.xp).toBe(0);
    expect(c.pontos).toEqual({ construtor: 7 });
    expect(c.premium).toEqual(['unicornio']);
    expect(c.vestidos).toEqual({ bicho: 'unicornio' });
    expect(c.fantasias).toEqual(['caipira']);
    expect(normalizarPerfilAlma('lixo')).toEqual(perfilAlmaVazio());
  });
  it('normalização do mundo: só missões do mundo, ids de jogador válidos', () => {
    const e = normalizarAlmaMundo(
      {
        feitas: ['c1', 'r1', 'c1'],
        puladas: ['c1', 'c2'],
        fixada: 'r2',
        progresso: { c3: 99, zz: 1 },
        bis: -2,
        lugares: ['padaria', 7],
        bau: [
          { item: 'bloco:9', qtd: 6 },
          { item: 'diamante', qtd: 64 },
        ],
        livro: { moedas: 3, compras: { flores: 1, x: 2 } },
      },
      'cidade-grande',
    );
    expect(e.feitas).toEqual(['c1']);
    expect(e.puladas).toEqual(['c2']);
    expect(e.fixada).toBeNull();
    expect(e.progresso).toEqual({ c3: 3 });
    expect(e.bis).toBe(0);
    expect(e.lugares).toEqual(['padaria']);
    expect(e.bau).toEqual([{ item: 'bloco:9', qtd: 6 }]);
    expect(e.livro.compras).toEqual({ flores: 1 });
    const todos = normalizarAlmaDoMundo(
      { ana: {}, 'a b': {}, ['x'.repeat(65)]: {} },
      'cidade-grande',
    );
    expect(Object.keys(todos)).toEqual(['ana']);
  });
});

/**
 * O ritmo da spec: 3 missões por sessão de 15 min (a regra de verdade, com as ações soltas que
 * cada missão pede), na ordem de um mundo e depois do outro, e o bis depois das duas listas.
 */
function simularSessoes(
  primeiro: MundoAlma,
  sessoes: number,
): { moedas: number[]; perfil: PerfilAlma; nivelNaSegunda: number } {
  const perfil = perfilAlmaVazio();
  const ordem: MundoAlma[] = [
    primeiro,
    primeiro === 'cidade-grande' ? 'rancho-alegre' : 'cidade-grande',
  ];
  const estados = new Map<MundoAlma, AlmaMundo>(ordem.map((m) => [m, almaMundoVazia()]));
  const obras = new Set<number>();
  const moedas: number[] = [];
  let feitas = 0;
  let nivelNaSegunda = 0;
  for (let s = 0; s < sessoes; s++) {
    for (let k = 0; k < SESSAO.missoes; k++) {
      const mundo =
        ordem.find(
          (m) => abertas(estados.get(m)!, m).length && missaoDeBis(estados.get(m)!, m) === null,
        ) ?? ordem[0];
      const e = estados.get(mundo)!;
      const m = missaoDoHud(e, mundo)!;
      const r = fazer(e, mundo, m, obras);
      aplicarGanho(
        perfil,
        r.ganho,
        r.missoes.flatMap((x) => (x.fantasia ? [x.fantasia] : [])),
      );
      if (++feitas === 2) nivelNaSegunda = nivelDoXp(perfil.xp).nivel;
    }
    moedas.push(perfil.moedas);
  }
  return { moedas, perfil, nivelNaSegunda };
}

describe('alma: o ritmo (experiência medida)', () => {
  for (const mundo of MUNDOS_ALMA) {
    it(`começando por ${mundo}: nível 2 até a segunda missão`, () => {
      expect(simularSessoes(mundo, 1).nivelNaSegunda).toBeGreaterThanOrEqual(2);
    });
    it(`começando por ${mundo}: a camiseta (15) em até 2 sessões`, () => {
      const { moedas } = simularSessoes(mundo, 2);
      expect(moedas[1]).toBeGreaterThanOrEqual(15);
    });
    it(`começando por ${mundo}: o unicórnio (80) entre a 6ª e a 8ª sessão`, () => {
      const { moedas } = simularSessoes(mundo, 8);
      const primeira = moedas.findIndex((m) => m >= 80) + 1;
      expect(primeira).toBeGreaterThanOrEqual(6);
      expect(primeira).toBeLessThanOrEqual(8);
    });
  }
  it('a média por missão da lista fica perto das 3,6 da spec', () => {
    const das = MISSOES.filter((m) => m.mundo === 'cidade-grande' || m.mundo === 'rancho-alegre');
    const media = (moedasDoMundo('cidade-grande') + moedasDoMundo('rancho-alegre')) / das.length;
    expect(Math.abs(media - SESSAO.moedasPorMissao)).toBeLessThan(0.2);
  });

  it('spec 031: a Era dos Dinos e o Doce Reino dão 15 moedinhas cada, sem fantasia', () => {
    expect(moedasDoMundo('era-dos-dinos')).toBe(15);
    expect(moedasDoMundo('doce-reino')).toBe(15);
    for (const m of MISSOES.filter(
      (x) => x.mundo === 'era-dos-dinos' || x.mundo === 'doce-reino',
    )) {
      expect(m.fantasia).toBeUndefined();
      // o lado direito do cartão (o resultado) nunca é o mesmo desenho do esquerdo
      if (m.desenho.tipo === 'arte') expect(m.desenho.resultado).not.toBe(m.desenho.principal);
    }
  });

  it('spec 031: o núcleo sabe o mundo pelo estilo (sem campo novo)', () => {
    expect(mundoAlmaDoEstilo({ estrutura: 'ninho' })).toBe('era-dos-dinos');
    expect(mundoAlmaDoEstilo({ estrutura: 'casinha' })).toBe('doce-reino');
    expect(mundoAlmaDoEstilo({ estrutura: 'ruina' })).toBeNull();
    expect(mundoAlmaDoEstilo({ estrutura: 'espantalho', povoado: { planta: 'sitio' } })).toBe(
      'rancho-alegre',
    );
  });
});
