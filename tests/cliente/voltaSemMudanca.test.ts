import { afterAll, describe, expect, it } from 'vitest';
import { criarGerenciador, type Canal } from '../../servidor/src/salas';
import { armazemMemoria } from '../../servidor/src/armazem';
import { ESTILO_PADRAO, cidadeDoMundo, definirEstiloMundo } from '../../src/world/chunk';
import '../../src/temas/todos';
import { obterTema } from '../../src/temas';
import { celulasPlanejadas, definirObrasFeitas } from '../../src/world/obras';
import { COLHER_PEDREIRO } from '../../src/jogo/exclusivos';
import { VERSAO_REDE, type RespostaServidor } from '../../src/rede/protocolo';
import { diferencaDasEdicoes } from '../../src/cliente/diferencaEdicoes';

/**
 * Spec 035, seção 3: uma volta que não muda nada não muda nenhuma célula. No servidor de
 * verdade, com a Cidade Grande e as obras do canteiro (uma feita, cujas células saem das
 * edições, e outra pela metade): o bem-vindo da volta traz as mesmas edições do de antes.
 */
type BemVindo = Extract<RespostaServidor, { t: 'bemvindo' }>;

function canal(ip = '1.2.3.4') {
  const recebidas: RespostaServidor[] = [];
  const c: Canal & { recebidas: RespostaServidor[] } = {
    ip,
    enviar: (t) => recebidas.push(JSON.parse(t) as RespostaServidor),
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

describe('a volta sem mudança, no servidor de verdade', () => {
  afterAll(() => {
    definirObrasFeitas([]);
    definirEstiloMundo(ESTILO_PADRAO);
  });

  it('na Cidade Grande, com uma obra feita e outra pela metade: nenhuma célula muda', async () => {
    let t = 0;
    const g = criarGerenciador({ armazem: armazemMemoria(), agora: () => t, depuracao: true });
    const avancar = async (ms: number) => {
      for (let i = 0; i < ms; i += 50) {
        t += 50;
        g.passo();
      }
      await g.manutencao();
    };
    const CIDADE = obterTema('cidade-grande');
    const semente = 1337;
    const a = canal();
    await g.receber(
      a,
      JSON.stringify({
        t: 'entrar',
        versao: VERSAO_REDE,
        jogador: ident('ana'),
        criar: {
          nome: 'Cidade',
          semente,
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
    const plano = cidadeDoMundo(semente)!;
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
    for (const c of celulasPlanejadas(plano, 1)) await por(c);
    expect(nucleo.obrasFeitas).toEqual([1]);
    const obra2 = celulasPlanejadas(plano, 2);
    for (const c of obra2.slice(0, Math.floor(obra2.length / 2))) await por(c);
    await avancar(300);

    // a Bia entra (o primeiro bem-vindo), cai e volta antes dos 30 s, sem nada mudar
    const b = canal('5.6.7.8');
    await g.receber(
      b,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    const antes = bemvindo(b);
    expect(antes.obras, 'o bem-vindo traz as obras').toBeTruthy();
    expect(Object.keys(antes.edicoes).length).toBeGreaterThan(0);
    await avancar(500);
    g.caiu(b);
    await avancar(2000);
    const b2 = canal('5.6.7.8');
    await g.receber(
      b2,
      JSON.stringify({ t: 'entrar', versao: VERSAO_REDE, jogador: ident('bia'), codigo }),
    );
    const depois = bemvindo(b2);
    expect(diferencaDasEdicoes(antes.edicoes, depois.edicoes)).toEqual([]);
    expect(depois.obras).toEqual(antes.obras);
  }, 60_000);
});
