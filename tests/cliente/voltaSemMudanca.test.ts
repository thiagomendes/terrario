import { afterAll, describe, expect, it } from 'vitest';
import { criarGerenciador, type Canal } from '../../servidor/src/salas';
import { armazemMemoria } from '../../servidor/src/armazem';
import {
  ESTILO_PADRAO,
  TAM_X,
  TAM_Z,
  cidadeDoMundo,
  definirEstiloMundo,
  gerarChunk,
  indice,
} from '../../src/world/chunk';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import {
  celulasPlanejadas,
  definirObrasFeitas,
  mesmoBlocoDaObra,
  type CelulaPlanejada,
} from '../../src/world/obras';
import { blocoDe, criarEdicoes, indiceDonoDe, metaDe } from '../../src/world/edicoes';
import { COLHER_PEDREIRO } from '../../src/jogo/exclusivos';
import { VERSAO_REDE, type RespostaServidor } from '../../src/rede/protocolo';
import type { Mensagem } from '../../src/nucleo/protocolo';
import type { Conexao } from '../../src/cliente/conexao';
import { diferencaDasEdicoes } from '../../src/cliente/diferencaEdicoes';
import { nomesDaObra, obrasQueFicaramProntas } from '../../src/cliente/obrasDaVolta';
import { sanearObras } from '../../src/nucleo/saneamento';
import { ligarEstado } from './nuvemDeVerdade';

/**
 * Spec 035, seção 3, na Cidade Grande e no servidor de verdade (com o relógio dele trocado).
 *
 * A "tela" da Bia é montada como a cena faz: as edições e as obras do primeiro bem-vindo e,
 * depois, os blocos, os donos e o evento da obra feita de cada quadro (o estado do cliente de
 * verdade, por uma conexão de mentira ligada ao canal dela). Na volta, como `aplicarVolta`: as
 * obras que ficaram prontas com ela fora primeiro, depois os donos e só as células que mudaram.
 *
 * - A volta sem mudança: as edições que a tela montou pelos quadros são as do bem-vindo da
 *   volta, e nenhuma célula muda.
 * - A obra terminada com a Bia fora: o evento foi num quadro que ela não recebeu; a volta acha
 *   a obra pronta pelo bem-vindo, e o prédio fica (sem a obra, as células voltariam ao terreno
 *   gerado sem ela: o canteiro vazio).
 */
type BemVindo = Extract<RespostaServidor, { t: 'bemvindo' }>;

function canal(ip: string, aoMensagem?: (m: RespostaServidor) => void) {
  const recebidas: RespostaServidor[] = [];
  const c: Canal & { recebidas: RespostaServidor[] } = {
    ip,
    enviar: (t) => {
      const m = JSON.parse(t) as RespostaServidor;
      recebidas.push(m);
      aoMensagem?.(m);
    },
    fechar: () => undefined,
    recebidas,
  };
  return c;
}
const ident = (id: string) => ({
  id,
  chave: `chave-secreta-de-${id}-123`,
  apelido: id,
  aparencia: {},
});
const bemvindo = (c: ReturnType<typeof canal>) =>
  c.recebidas.find((m) => m.t === 'bemvindo') as BemVindo;

const CIDADE = obterTema('cidade-grande');
const SEMENTE = 1337;

/** O bloco do terreno gerado (sem edições), com as obras feitas que estiverem definidas. */
function blocoGerado(c: CelulaPlanejada): number {
  const cx = Math.floor(c.x / TAM_X);
  const cz = Math.floor(c.z / TAM_Z);
  return gerarChunk(cx, cz, SEMENTE)[indice(c.x - cx * TAM_X, c.y, c.z - cz * TAM_Z)];
}

async function montar() {
  let t = 0;
  const g = criarGerenciador({ armazem: armazemMemoria(), agora: () => t, depuracao: true });
  const avancar = async (ms: number) => {
    for (let i = 0; i < ms; i += 50) {
      t += 50;
      g.passo();
    }
    await g.manutencao();
  };
  const a = canal('1.2.3.4');
  await g.receber(
    a,
    JSON.stringify({
      t: 'entrar',
      versao: VERSAO_REDE,
      jogador: ident('ana'),
      criar: {
        nome: 'Cidade',
        semente: SEMENTE,
        tema: 'cidade-grande',
        modo: 'sobrevivencia',
        versaoMundo: 2,
        estilo: CIDADE.mundo,
      },
    }),
  );
  const codigo = bemvindo(a).sala.codigo;
  await avancar(300);
  const nucleo = g.ativas.get(codigo)!.nucleo;
  definirEstiloMundo(CIDADE.mundo);
  const plano = cidadeDoMundo(SEMENTE)!;
  const ana = nucleo.estado.jogadores.get('ana')!;
  ana.inventario.definir(0, { item: COLHER_PEDREIRO, qtd: 1 });
  let seq = 0;
  const por = async (c: { x: number; y: number; z: number; bloco: number }) => {
    ana.saltoPermitido = true;
    nucleo.comando('ana', {
      t: 'jogador',
      x: c.x + 0.5,
      y: c.y + 2,
      z: c.z + 0.5,
      yaw: 0,
      pitch: 0,
      olhos: c.y + 3.62,
      noChao: true,
      voando: false,
      vel: 0,
      correndo: false,
      submerso: false,
      quedas: [],
      pulos: 0,
      golpes: 0,
      slot: 0,
    } as never);
    await g.receber(a, JSON.stringify({ t: 'colocar', id: ++seq, ...c, meta: 0, slot: 0, seq }));
    await avancar(50);
  };

  // a tela da Bia, como a cena monta
  const tela = criarEdicoes(SEMENTE);
  const obrasDaBia = new Map<number, { nomes: string[]; feita: boolean }>();
  let ouvinte: ((m: Mensagem) => void) | null = null;
  const conexao: Conexao = {
    enviar: () => undefined,
    aoReceber: (f) => void (ouvinte = f),
    encerrar: () => undefined,
  };
  /** Como `eventoObra` e `obraFicouPronta` na cena: a obra feita sai das edições. */
  const obraPronta = (canteiro: number, nomes: string[]) => {
    obrasDaBia.set(canteiro, { nomes, feita: true });
    for (const c of celulasPlanejadas(plano, canteiro)) tela.remover?.(c.x, c.y, c.z);
  };
  const estado = ligarEstado(conexao as never, {
    aplicarBloco: (x, y, z, b, meta, dono) => tela.definir(x, y, z, b, meta, dono),
    aoQuadro: (q) => {
      if (q.donos) tela.donos.importar(q.donos);
      if (q.donosNovos) tela.donos.aplicar(q.donosNovos);
    },
    aoEvento: (e) => {
      if (e.e === 'obra' && e.feita) obraPronta(e.canteiro, e.nomes ?? []);
    },
  });
  let bvs = 0;
  const daBia = (m: RespostaServidor) => {
    if (m.t !== 'bemvindo') {
      ouvinte?.(m as Mensagem);
      return;
    }
    bvs++;
    if (bvs === 1) {
      // o primeiro bem-vindo: a cena nasce com as edições, os donos e as obras dele
      tela.importar(m.edicoes);
      tela.donos.importar(m.donos);
      for (const [k, o] of Object.entries(sanearObras(m.obras)))
        obrasDaBia.set(Number(k), { nomes: nomesDaObra(o), feita: !!o.feita });
    }
  };
  /** A volta, como `aplicarVolta` (e o `reconferir` de src/nuvem.ts depois da queda). */
  const voltar = (bv: BemVindo, comObras = true) => {
    const prontas = obrasQueFicaramProntas(obrasDaBia, bv.obras);
    if (comObras) for (const o of prontas) obraPronta(o.canteiro, o.nomes);
    tela.donos.importar(bv.donos);
    const mudancas = diferencaDasEdicoes(tela.exportar(), bv.edicoes, (x, y, z) =>
      estado.pendente(x, y, z),
    );
    for (const m of mudancas) {
      if (m.valor === undefined) tela.remover?.(m.x, m.y, m.z);
      else tela.definir(m.x, m.y, m.z, blocoDe(m.valor), metaDe(m.valor), indiceDonoDe(m.valor));
    }
    estado.reconferir();
    return { prontas, mudancas };
  };
  const entraBia = async () => {
    const b = canal('5.6.7.8', daBia);
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    return b;
  };
  return { g, avancar, nucleo, plano, por, tela, obrasDaBia, estado, entraBia, voltar };
}

describe('a volta na Cidade Grande, no servidor de verdade', () => {
  afterAll(() => {
    definirObrasFeitas([]);
    definirEstiloMundo(ESTILO_PADRAO);
  });

  it('sem mudança, com uma obra feita e outra pela metade: a tela montada pelos quadros é o bem-vindo da volta, e nenhuma célula muda', async () => {
    const m = await montar();
    // a Bia entra antes: a obra 1 inteira e meia obra 2 chegam a ela pelos quadros
    const b = await m.entraBia();
    await m.avancar(300);
    for (const c of celulasPlanejadas(m.plano, 1)) await m.por(c);
    expect(m.nucleo.obrasFeitas).toEqual([1]);
    const obra2 = celulasPlanejadas(m.plano, 2);
    for (const c of obra2.slice(0, Math.floor(obra2.length / 2))) await m.por(c);
    await m.avancar(500);
    expect(m.estado.quadrosRecebidos, 'a Bia recebeu os quadros').toBeGreaterThan(0);
    expect(m.obrasDaBia.get(1)?.feita, 'a Bia viu a obra 1 ficar pronta').toBe(true);

    // a Bia cai e volta antes dos 30 s, sem nada mudar
    m.g.caiu(b);
    await m.avancar(2000);
    const b2 = await m.entraBia();
    const depois = bemvindo(b2);
    expect(depois.obras, 'o bem-vindo traz as obras').toBeTruthy();
    expect(Object.keys(depois.edicoes).length).toBeGreaterThan(0);
    // o que a frase promete: as edições da tela, montadas pelos quadros, são as do bem-vindo
    expect(diferencaDasEdicoes(m.tela.exportar(), depois.edicoes)).toEqual([]);
    const { prontas, mudancas } = m.voltar(depois);
    expect(prontas).toEqual([]);
    // (os valores comparados levam o índice do dono junto com o bloco e o meta)
    expect(mudancas).toEqual([]);
  }, 60_000);

  it('a obra terminada com a Bia fora: a volta acha a obra pronta, e o prédio fica', async () => {
    const m = await montar();
    const b = await m.entraBia();
    await m.avancar(300);
    // a Ana faz a obra 1 quase toda com a Bia dentro
    const obra1 = celulasPlanejadas(m.plano, 1);
    for (const c of obra1.slice(0, -1)) await m.por(c);
    await m.avancar(500);
    expect(m.obrasDaBia.get(1)?.feita ?? false).toBe(false);
    const ultima = obra1[obra1.length - 1];
    expect(m.tela.obter(obra1[0].x, obra1[0].y, obra1[0].z), 'a Bia vê a obra subindo').toBe(
      obra1[0].bloco,
    );

    // a Bia cai; a Ana põe o último bloco e a obra fica pronta com ela fora
    m.g.caiu(b);
    await m.avancar(500);
    await m.por(ultima);
    expect(m.nucleo.obrasFeitas).toEqual([1]);
    await m.avancar(1500);
    expect(m.obrasDaBia.get(1)?.feita ?? false, 'fora, a Bia não viu o evento').toBe(false);
    const b2 = await m.entraBia();
    const depois = bemvindo(b2);

    // sem olhar as obras, a volta tiraria todas as células da obra feita (o canteiro vazio)
    const semObras = diferencaDasEdicoes(m.tela.exportar(), depois.edicoes);
    expect(semObras.length).toBeGreaterThan(0);
    expect(semObras.every((x) => x.valor === undefined)).toBe(true);

    const { prontas, mudancas } = m.voltar(depois);
    expect(prontas).toEqual([{ canteiro: 1, nomes: ['ana'] }]);
    expect(mudancas, 'com a obra pronta, nenhuma célula a acertar').toEqual([]);
    expect(diferencaDasEdicoes(m.tela.exportar(), depois.edicoes)).toEqual([]);
    expect(m.obrasDaBia.get(1)).toEqual({ nomes: ['ana'], feita: true });

    // o prédio: com as obras feitas da Bia, o terreno gerado tem a obra em cada célula dela
    definirObrasFeitas([...m.obrasDaBia].filter(([, o]) => o.feita).map(([n]) => n));
    for (const c of obra1)
      expect(mesmoBlocoDaObra(blocoGerado(c), c.bloco), `${c.x},${c.y},${c.z}`).toBe(true);
    // (sem a obra feita, o mesmo lugar é o canteiro vazio)
    definirObrasFeitas([]);
    expect(obra1.some((c) => !mesmoBlocoDaObra(blocoGerado(c), c.bloco))).toBe(true);
    definirObrasFeitas(m.nucleo.obrasFeitas);
  }, 60_000);
});
