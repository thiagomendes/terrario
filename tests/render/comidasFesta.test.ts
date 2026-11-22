import { describe, expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import '../../src/temas/todos';
import { obterTema, temasDisponiveis } from '../../src/temas';
import { registrarCatalogo } from '../../src/jogo/catalogo';
import { obterItem } from '../../src/jogo/itens';
import { textosOriginais } from '../../src/temas/originais';
import { ativarTemaPuro } from '../../src/temas/ativarPuro';
import { temaBase } from '../../src/temas/base';
import { definirTemaAtivo } from '../../src/temas/ativo';
import { criarPlasticos } from '../../src/render/formas';
import { montarComidaMordida } from '../../src/render/refeicao';
import { docinhosNaSacola, modeloNaMao } from '../../src/render/itensBrinquedo';
import { jeitoDeComer } from '../../src/jogo/refeicao';
import {
  BEIJINHO,
  BRIGADEIRO,
  CAJUZINHO,
  CHOCOLATE_QUENTE,
  EXCLUSIVOS_BAILE,
  POCAO_UVA,
  SURPRESA_UVA,
} from '../../src/jogo/exclusivos';

/**
 * Spec 027 (T15): as comidas da festa. Nenhuma tem nome de comida de outro mundo; cada uma do
 * seu jeito (os docinhos da forminha, um por mordida; o chocolate quente no gole de caneca; a
 * poção de canudinho), com o modelo de brinquedo na mão.
 */
const DOCINHOS = [BRIGADEIRO, BEIJINHO, CAJUZINHO, SURPRESA_UVA];
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

function cena() {
  registrarCatalogo();
  const scene = new Scene(new NullEngine());
  new FreeCamera('c', new Vector3(0, 0, -5), scene);
  return scene;
}

describe('spec 027 (T15): as comidas da festa', () => {
  it('nenhuma comida deste mundo tem o nome de uma comida (ou de um bloco) de outro mundo', () => {
    registrarCatalogo();
    const festa = obterTema('noite-das-fantasias');
    const nossos = new Set(EXCLUSIVOS_BAILE.itens.map((i) => norm(festa.textos.itens[i] ?? '')));
    expect(nossos.size).toBe(EXCLUSIVOS_BAILE.itens.length);
    const orig = textosOriginais();
    for (const id of temasDisponiveis()) {
      if (id === 'noite-das-fantasias') continue;
      const t = obterTema(id);
      ativarTemaPuro(t);
      const nomes = [
        ...Object.entries(t.textos.itens).filter(([i]) => obterItem(i)?.tipo === 'comida').map(([, n]) => n),
        ...Object.values(t.textos.blocos),
      ];
      for (const n of nomes) expect(nossos.has(norm(n)), `${id}: ${n}`).toBe(false);
    }
    ativarTemaPuro(temaBase());
    for (const [i, n] of Object.entries(orig.itens))
      if (obterItem(i)?.tipo === 'comida' && !EXCLUSIVOS_BAILE.itens.includes(i))
        expect(nossos.has(norm(n)), n).toBe(false);
  });

  it('cada uma do seu jeito', () => {
    for (const d of DOCINHOS) expect(jeitoDeComer(d)).toBe('pipoca');
    expect(jeitoDeComer(CHOCOLATE_QUENTE)).toBe('caneca');
    expect(jeitoDeComer(POCAO_UVA)).toBe('canudinho');
  });

  it('a forminha perde um docinho a cada mordida, e o da vez fica do lado da boca', () => {
    const scene = cena();
    for (const d of DOCINHOS) {
      const c = montarComidaMordida(scene, criarPlasticos(scene, 't'), d, `f-${d}`)!;
      const docinhos = () =>
        c.modelo.malhas.filter((m) => /-docinho\d$/.test(m.name) && m.isEnabled());
      for (let k = 0; k <= 3; k++) {
        c.estagio(k);
        expect(docinhos().length, `${d} ${k}`).toBe(3 - k);
        // o da vez é o que está mais no +x (o lado da boca)
        if (k < 3) {
          const maisX = docinhos().reduce((a, b) => (b.position.x > a.position.x ? b : a));
          expect(maisX.position.x).toBeGreaterThan(0.03);
          expect(maisX.name.endsWith(`docinho${k}`)).toBe(true);
        }
      }
      c.descartar();
    }
  });

  it('acabamento da n1: a sacola de doces mostra quantos restam (3 ou mais, 2, 1) e cada refeição come um só', () => {
    const scene = cena();
    const doces = (m: { malhas: { name: string; isEnabled(): boolean }[] }) =>
      m.malhas.filter((q) => /-docinho\d$/.test(q.name) && q.isEnabled()).length;
    for (const [qtd, n] of [
      [8, 3],
      [3, 3],
      [2, 2],
      [1, 1],
    ] as const) {
      const m = modeloNaMao(scene, criarPlasticos(scene, 't'), null, 'sacola_doces', `s-${qtd}`, qtd)!;
      expect(doces(m), `${qtd} na pilha`).toBe(n);
      expect(docinhosNaSacola(qtd)).toBe(n);
      for (const q of m.malhas) q.dispose();
      // a refeição: o docinho da beira (o do lado da boca) some nas três mordidas; os outros ficam
      const c = montarComidaMordida(scene, criarPlasticos(scene, 't'), 'sacola_doces', `sc-${qtd}`, qtd)!;
      const vivos = () => c.modelo.malhas.filter((q) => /-docinho\d$/.test(q.name) && q.isEnabled());
      c.estagio(1);
      expect(vivos()).toHaveLength(n);
      c.estagio(3);
      expect(vivos()).toHaveLength(n - 1);
      expect(vivos().some((q) => q.name.endsWith('docinho0'))).toBe(false);
      c.descartar();
    }
    // sem a pilha (o amigo, o ícone), as três de sempre
    expect(docinhosNaSacola()).toBe(3);
  });

  it('a "Uva" deste mundo é um cachinho roxo de seis uvas, duas por mordida (nos outros, as três frutinhas)', () => {
    const scene = cena();
    const frutas = (c: NonNullable<ReturnType<typeof montarComidaMordida>>) =>
      c.modelo.malhas.filter((m) => /-fruta/.test(m.name) && m.isEnabled());
    definirTemaAtivo(obterTema('noite-das-fantasias'));
    const uva = montarComidaMordida(scene, criarPlasticos(scene, 't'), 'frutinhas', 'uva')!;
    expect(frutas(uva).length).toBe(6);
    for (const m of frutas(uva)) {
      const cor = (m.material as unknown as { diffuseColor: { r: number; g: number; b: number } }).diffuseColor;
      // roxo: o azul e o vermelho acima do verde
      expect(cor.b).toBeGreaterThan(cor.g);
      expect(cor.r).toBeGreaterThan(cor.g);
    }
    uva.estagio(1);
    expect(frutas(uva).length).toBe(4);
    uva.estagio(3);
    expect(frutas(uva).length).toBe(0);
    definirTemaAtivo(obterTema('rancho-alegre'));
    const outra = montarComidaMordida(scene, criarPlasticos(scene, 't'), 'frutinhas', 'fr')!;
    expect(frutas(outra).length).toBe(3);
    outra.estagio(1);
    expect(frutas(outra).length).toBe(2);
  });

  it('o chocolate desce na caneca e a poção desce no copo a cada gole', () => {
    const scene = cena();
    const choco = montarComidaMordida(scene, criarPlasticos(scene, 't'), CHOCOLATE_QUENTE, 'ch')!;
    const nivel = (n: string) => choco.modelo.malhas.find((m) => m.name.endsWith(`-${n}`))!.position.y;
    const ys = [0, 1, 2, 3].map((k) => {
      choco.estagio(k);
      return nivel('chocolate');
    });
    for (let k = 1; k < 4; k++) expect(ys[k]).toBeLessThan(ys[k - 1] - 0.01);
    const pocao = montarComidaMordida(scene, criarPlasticos(scene, 't'), POCAO_UVA, 'po')!;
    const liq = pocao.modelo.malhas.find((m) => m.name.endsWith('-pocao'))!;
    pocao.estagio(0);
    const h0 = liq.scaling.y;
    pocao.estagio(2);
    expect(liq.scaling.y).toBeLessThan(h0 - 0.3);
  });
});
