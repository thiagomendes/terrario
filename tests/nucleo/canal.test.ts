import { preencherKit, SLOTS, KIT_EXTRA } from '../../src/player/hotbar';
import { describe, expect, it } from 'vitest';
import { conexaoNaMesmaThread } from '../../src/cliente/conexao';
import { criarEstadoCliente } from '../../src/cliente/estado';
import { criarEdicoes } from '../../src/world/edicoes';
import { criarInventario } from '../../src/jogo/inventario';
import { estadoInicial } from '../../src/jogo/sobrevivencia';
import { encontrarNascimento, alturaTerreno, ESTILO_PADRAO } from '../../src/world/chunk';
import { Bloco } from '../../src/world/blocks';
import { podeArar, podePlantar } from '../../src/jogo/plantio';
import { PASSO, VERSAO_PROTOCOLO, type Comando } from '../../src/nucleo/protocolo';

/**
 * Spec 009, critério 8: o protocolo aguenta a rede. Mensagens passam por JSON, chegam
 * 150 ms depois e fora de ordem; no fim, cliente e núcleo concordam em tudo.
 */
const SEMENTE = 1337;

function partida(
  modo: 'criativo' | 'sobrevivencia',
  canal = { atrasoMs: 150, embaralhar: 7 },
  aoQuadro?: () => void,
) {
  const conexao = conexaoNaMesmaThread(
    {
      t: 'inicio',
      versao: VERSAO_PROTOCOLO,
      semente: SEMENTE,
      modo,
      versaoMundo: 2,
      estilo: ESTILO_PADRAO,
    },
    { serializar: true, ...canal },
  );
  const edicoes = criarEdicoes();
  // mundo novo: a barra começa vazia nos dois modos
  const inv = criarInventario();
  const cliente = criarEstadoCliente({
    conexao,
    inventario: inv,
    aplicarBloco: (x, y, z, b, meta) => edicoes.definir(x, y, z, b, meta),
    aoQuadro: () => aoQuadro?.(),
    hora: 0.3,
    dia: 0,
    clima: { tipo: 'limpo', nuvens: 0, chuva: 0, neblina: 0, raios: 0, arco: 0 } as never,
    sobrevivencia: estadoInicial(),
  });
  const p = encontrarNascimento(SEMENTE);
  const x = Math.floor(p.x);
  const z = Math.floor(p.z);
  const y = alturaTerreno(x, z, SEMENTE) + 1;
  const tel = (): Comando => ({
    t: 'jogador',
    x: x + 0.5,
    y,
    z: z + 0.5,
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
  });
  let tempo = 0;
  /** Avança o relógio em ms: passos do núcleo a cada 50 ms e entrega do canal. */
  function avancar(ms: number) {
    for (let t = 0; t < ms; t += 10) {
      tempo += 10;
      if (tempo % (PASSO * 1000) === 0) conexao.anfitriao.passo();
      conexao.avancar(10);
    }
  }
  cliente.enviar(tel());
  avancar(400);
  return { conexao, cliente, edicoes, inv, x, y, z, tel, avancar };
}

describe('protocolo num canal ruim', () => {
  it('blocos previstos, recusados e confirmados acabam iguais ao núcleo', () => {
    const { conexao, cliente, edicoes, x, y, z, avancar, tel } = partida('criativo');
    const nucleo = conexao.anfitriao.nucleo;
    // uma torre ao lado, uma quebra no chão e um bloco dentro do jogador (recusado)
    for (let i = 0; i < 6; i++) {
      const id = cliente.proximoId();
      cliente.prever(id, x + 3, y + i, z, Bloco.TABUAS);
      cliente.enviar({
        t: 'colocar',
        id,
        x: x + 3,
        y: y + i,
        z,
        bloco: Bloco.TABUAS,
        meta: 0,
        slot: 0,
      });
      avancar(30);
    }
    const q = cliente.proximoId();
    cliente.prever(q, x + 1, y - 1, z, Bloco.AR);
    cliente.enviar({ t: 'quebrar', id: q, x: x + 1, y: y - 1, z, slot: 0 });
    const dentro = cliente.proximoId();
    cliente.prever(dentro, x, y, z, Bloco.TABUAS);
    cliente.enviar({ t: 'colocar', id: dentro, x, y, z, bloco: Bloco.TABUAS, meta: 0, slot: 0 });
    cliente.enviar(tel());
    avancar(1500);
    // o bloco que se vê em cada célula mexida é o mesmo dos dois lados
    const celulas = [
      ...Array.from({ length: 6 }, (_, i) => [x + 3, y + i, z]),
      [x + 1, y - 1, z],
      [x, y, z],
    ];
    for (const [cx, cy, cz] of celulas) {
      const doCliente = edicoes.obter(cx, cy, cz) ?? nucleo.estado.mundo.gerado(cx, cy, cz);
      expect(doCliente, `${cx},${cy},${cz}`).toBe(nucleo.estado.mundo.bloco(cx, cy, cz));
    }
    // e tudo o que o núcleo editou o cliente também tem
    for (const [k, lista] of Object.entries(nucleo.salvar().edicoes))
      for (const [i, v] of lista)
        expect(
          edicoes
            .doChunk(...(k.split(',').map(Number) as [number, number]))
            .find((e) => e[0] === i)?.[1],
        ).toBe(v);
    expect(nucleo.estado.mundo.bloco(x, y, z)).not.toBe(Bloco.TABUAS);
    expect(edicoes.obter(x, y, z)).not.toBe(Bloco.TABUAS);
    expect(cliente.pendente(x, y, z)).toBe(false);
  });

  it('o inventário mexido pela tela chega igual, sem piscar nem perder item', () => {
    const { conexao, cliente, inv, avancar } = partida('criativo');
    const nucleo = conexao.anfitriao.nucleo;
    // o kit de blocos posto no núcleo (o mundo novo começa com a barra vazia)
    const oficialJ = nucleo.estado.jogadores.get('local')! as unknown as {
      inventario: Parameters<typeof preencherKit>[0];
      inventarioSujo: boolean;
    };
    preencherKit(oficialJ.inventario, [...SLOTS.map((s) => s.bloco), ...KIT_EXTRA]);
    oficialJ.inventarioSujo = true;
    avancar(1000);
    expect(inv.slots.filter(Boolean).length).toBe(9);
    // várias mudanças seguidas antes de qualquer confirmação voltar
    for (let i = 0; i < 8; i++) {
      const a = inv.obter(i);
      inv.definir(i, inv.obter(20 + i));
      inv.definir(20 + i, a);
      cliente.sincronia.verificar();
      avancar(20);
      // enquanto as confirmações não chegam, a tela mostra o que o jogador fez
      expect(inv.obter(20 + i)).toEqual(a);
    }
    avancar(1500);
    const oficial = nucleo.estado.jogadores.get('local')!.inventario.slots;
    expect(inv.slots).toEqual(oficial);
    expect(inv.slots.filter(Boolean).length).toBe(9);
  });

  it('criaturas, dia e clima do cliente seguem o núcleo', () => {
    const { conexao, cliente, avancar } = partida('sobrevivencia');
    const nucleo = conexao.anfitriao.nucleo;
    avancar(4000);
    const ids = (l: readonly { id: number }[]) => l.map((c) => c.id).sort((a, b) => a - b);
    // o último quadro entregue é de no máximo 300 ms atrás: mesmas criaturas (ou quase)
    const doNucleo = ids(nucleo.estado.populacao.lista);
    const doCliente = ids(cliente.criaturas.vistas);
    const comuns = doCliente.filter((id) => doNucleo.includes(id));
    expect(doCliente.length).toBeGreaterThan(0);
    expect(comuns.length).toBeGreaterThanOrEqual(doNucleo.length - 2);
    expect(cliente.ambiente.hora).toBeCloseTo(nucleo.estado.hora, 3);
    expect(cliente.ambiente.dia).toBe(nucleo.estado.dia);
  });

  it('sem atraso nem embaralho, a confirmação chega no passo seguinte', () => {
    const { cliente, edicoes, x, y, z, avancar } = partida('criativo', {
      atrasoMs: 0,
      embaralhar: 0,
    });
    const id = cliente.proximoId();
    cliente.prever(id, x + 3, y, z, Bloco.TABUAS);
    cliente.enviar({ t: 'colocar', id, x: x + 3, y, z, bloco: Bloco.TABUAS, meta: 0, slot: 0 });
    expect(edicoes.obter(x + 3, y, z)).toBe(Bloco.TABUAS);
    avancar(60);
    expect(cliente.pendente(x + 3, y, z)).toBe(false);
  });

  it('arar e plantar previstos chegam iguais, sem piscar (spec 013)', () => {
    let olhar: () => void = () => undefined;
    const { conexao, cliente, edicoes, x, y, z, avancar, tel } = partida(
      'criativo',
      undefined,
      () => olhar(),
    );
    const nucleo = conexao.anfitriao.nucleo;
    const oficial = nucleo.estado.jogadores.get('local')!;
    oficial.inventario.definir(0, { item: 'enxada_madeira', qtd: 1, dur: 60 });
    oficial.inventario.definir(1, { item: 'semente_trigo', qtd: 8 });
    // a terra na frente: grama com grama alta em cima (posta pelo próprio cliente)
    const F = { x: x + 2, y: y - 1, z };
    const C = { x: x + 2, y, z };
    const lote = [
      { ...F, v: Bloco.TERRA_MUSGOSA },
      { ...C, v: Bloco.GRAMA_ALTA },
      { x: x + 2, y: y + 1, z, v: Bloco.AR },
    ];
    const idLote = cliente.proximoId();
    for (const e of lote) cliente.prever(idLote, e.x, e.y, e.z, e.v);
    cliente.enviar({ t: 'editar', id: idLote, lote });
    cliente.enviar(tel());
    avancar(1500);
    const ver = (p: { x: number; y: number; z: number }) =>
      edicoes.obter(p.x, p.y, p.z) ?? nucleo.estado.mundo.gerado(p.x, p.y, p.z);
    // a mesma regra que o núcleo usa decide a previsão
    expect(podeArar(ver(F), ver(C))).toBe(true);
    const idArar = cliente.proximoId();
    cliente.prever(idArar, F.x, F.y, F.z, Bloco.TERRA_ARADA);
    cliente.prever(idArar, C.x, C.y, C.z, Bloco.AR);
    cliente.enviar({ t: 'arar', id: idArar, ...F, slot: 0 });
    // a semente vai logo depois, antes da confirmação voltar
    avancar(20);
    expect(podePlantar(ver(F), ver(C))).toBe(true);
    const idPlantar = cliente.proximoId();
    cliente.prever(idPlantar, C.x, C.y, C.z, Bloco.TRIGO_0);
    cliente.enviar({ t: 'colocar', id: idPlantar, ...C, bloco: Bloco.TRIGO_0, meta: 0, slot: 1 });
    // a cada quadro aplicado, o que a tela mostra nas duas células nunca volta atrás
    const vistos: [number, number][] = [];
    olhar = () => vistos.push([ver(F), ver(C)]);
    cliente.enviar(tel());
    avancar(1500);
    expect(vistos.length).toBeGreaterThan(5);
    for (const v of vistos) expect(v).toEqual([Bloco.TERRA_ARADA, Bloco.TRIGO_0]);
    expect(nucleo.estado.mundo.bloco(F.x, F.y, F.z)).toBe(Bloco.TERRA_ARADA);
    expect(nucleo.estado.mundo.bloco(C.x, C.y, C.z)).toBe(Bloco.TRIGO_0);
    expect(cliente.pendente(C.x, C.y, C.z)).toBe(false);
    // semente ao lado, na grama sem arar: a regra diz não, nada é previsto nem pedido
    expect(podePlantar(ver({ x: x + 3, y: y - 1, z }), ver({ x: x + 3, y, z }))).toBe(false);
  });
  it('dar comida no canal ruim: o cliente vê o bicho criado e o trigo gasto (spec 013)', () => {
    const { conexao, cliente, inv, x, y, z, avancar } = partida('sobrevivencia');
    const nucleo = conexao.anfitriao.nucleo;
    nucleo.estado.jogadores.get('local')!.inventario.definir(0, { item: 'trigo', qtd: 5 });
    cliente.enviar({ t: 'depurar', d: { f: 'invocar', tipo: 'cervo', x: x + 2.5, y, z: z + 0.5 } });
    avancar(800);
    expect(inv.obter(0)).toEqual({ item: 'trigo', qtd: 5 });
    const vaca = cliente.criaturas.vistas.find(
      (c) => c.tipo === 'cervo' && Math.hypot(c.x - x - 2.5, c.z - z - 0.5) < 3,
    )!;
    expect(vaca.criado).toBeFalsy();
    cliente.enviar({ t: 'alimentar', criatura: vaca.id, slot: 0 });
    avancar(1000);
    expect(nucleo.estado.populacao.lista.find((c) => c.id === vaca.id)?.criado).toBe(true);
    expect(cliente.criaturas.vistas.find((c) => c.id === vaca.id)?.criado).toBe(true);
    expect(cliente.criaturas.lista.find((c) => c.id === vaca.id)?.criado).toBe(true);
    expect(inv.obter(0)).toEqual({ item: 'trigo', qtd: 4 });
  });
});
