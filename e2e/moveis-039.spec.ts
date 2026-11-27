import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { Bloco } from '../src/world/blocks';
import { celulasDoMovel, metaDoMovel } from '../src/jogo/moveis';
import { abrirMundo, type Tamanho } from './guia-palco';

/**
 * Spec 039 (T06): os móveis no aparelho, no celular em pé (a aba "casa" também deitado).
 *
 * - **Pôr à mão:** os oito móveis pelo toque de colocar; logo depois do toque (antes de o núcleo
 *   responder), a cópia da tela já tem o móvel inteiro, sem peça solta; o fantasma mostra o móvel
 *   inteiro e fica vermelho onde não cabe (e nada é posto ali).
 * - **Nada some:** o salvamento da saída (o da cópia da tela, antes da correção do núcleo) grava
 *   o móvel inteiro, com o mesmo dono em todas as células, e ele volta ao recarregar; o tapete
 *   também.
 * - **Os toques:** o abajur e o criado-mudo acendem inteiros, na hora; a pia abre e fecha a água
 *   (sozinha em 6 s); o guarda-roupa abre as portas e a troca de roupa direto nas roupas, sem o
 *   "Jogar"; o sofá, a cadeira e a cama: a tela leva o boneco até o lugar sem pular, em menos de
 *   0,4 s, e andar levanta.
 * - **Montar na mesa:** na sobrevivência, o sofá pela aba "casa" do livro, posto e quebrado (volta
 *   um sofá só).
 * - **A aba "casa"** do criativo mostra os oito móveis sem rolar.
 *
 * Fotos em capturas-039/t06/.
 */
/** (as da T06 ficam em capturas-039/t06; as do conserto do portão visual, aqui) */
const PASTA = 'capturas-039/t09/tela';
mkdirSync(PASTA, { recursive: true });

type P = { x: number; y: number; z: number };
const T0 = Date.now();
const passo = (o: string) => console.log(`PASSO ${((Date.now() - T0) / 1000).toFixed(0)} s ${o}`);
const CIMA = { x: 0, y: 1, z: 0 };

async function mundo(browser: Browser, id: string, tamanho: Tamanho = 'empe', modo: 'criativo' | 'sobrevivencia' = 'criativo') {
  const page = await abrirMundo(browser, { id, tema: 'doce-reino', tamanho, modo });
  await page.waitForTimeout(1500);
  return page;
}

/** Uma laje de pedra (15 × 15) acima do terreno, com o ar limpo em cima (o chão é Y). */
async function plataforma(p: Page): Promise<{ cx: number; cz: number; Y: number }> {
  const r = await p.evaluate((pedra) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!;
    const cx = Math.floor(px);
    const cz = Math.floor(pz);
    let alto = 0;
    for (let dx = -9; dx <= 9; dx++)
      for (let dz = -9; dz <= 9; dz++) {
        let y = 120;
        while (y > 2 && e.bloco!(cx + dx, y, cz + dz) === 0) y--;
        alto = Math.max(alto, y);
      }
    const Y = alto + 6;
    const lote: { x: number; y: number; z: number; v: number }[] = [];
    for (let dx = -7; dx <= 7; dx++)
      for (let dz = -7; dz <= 7; dz++) {
        lote.push({ x: cx + dx, y: Y, z: cz + dz, v: pedra });
        for (let dy = 1; dy <= 4; dy++) lote.push({ x: cx + dx, y: Y + dy, z: cz + dz, v: 0 });
      }
    e.editarLote!(lote);
    return { cx, cz, Y };
  }, Bloco.PEDRA_LISA);
  await expect
    .poll(() => p.evaluate((r) => window.__brumaluz!.bloco!(r.cx + 7, r.Y, r.cz + 7), r))
    .toBe(Bloco.PEDRA_LISA);
  await ir(p, r.cx + 0.5, r.cz - 5.5, r.Y + 1);
  await p.waitForTimeout(800);
  return r;
}

const ir = (p: Page, x: number, z: number, y?: number) =>
  p.evaluate(({ x, y, z }) => window.__brumaluz!.teleportar!(x, z, y), { x, y, z });
const mirar = (p: Page, b: P, normal?: P) =>
  p.evaluate(({ b, n }) => window.__brumaluz!.mirarBloco!(b.x, b.y, b.z, n), { b, n: normal });
async function mirarAte(p: Page, b: P, normal?: P) {
  await expect.poll(() => mirar(p, b, normal), { timeout: 15_000 }).toBe(true);
  await p.waitForTimeout(200);
}
const naMao = (p: Page, bloco: number) =>
  p.evaluate((b) => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, { item: `bloco:${b}`, qtd: 64 });
    e.selecionarSlot!(0);
  }, bloco);
/** As células (bloco, metadado) do móvel como a tela as vê. */
const celulas = (p: Page, cs: P[]) =>
  p.evaluate(
    (cs) => cs.map((c) => [window.__brumaluz!.bloco!(c.x, c.y, c.z), window.__brumaluz!.meta!(c.x, c.y, c.z)]),
    cs,
  );
const esperado = (b: number, d: number, cs: { parte: number }[]) => cs.map((c) => [b, metaDoMovel(d, c.parte)]);
/** As peças soltas da tela em volta da laje. */
const soltas = (p: Page, r: { cx: number; cz: number; Y: number }) =>
  p.evaluate((r) => window.__brumaluz!.pecasSoltas!(r.cx - 7, r.Y + 1, r.cz - 7, r.cx + 7, r.Y + 3, r.cz + 7), r);

/**
 * Põe à mão o móvel `b` com a âncora em `a`, olhando para +z (a criança atrás dele): devolve as
 * peças soltas da cópia da tela logo depois do toque, no mesmo passo (antes da resposta do núcleo).
 */
async function porAMao(p: Page, b: number, a: P): Promise<{ posto: boolean; soltas: string[]; d: number }> {
  await naMao(p, b);
  await ir(p, a.x + 0.5, a.z - 2.5, a.y);
  await p.waitForTimeout(300);
  await mirarAte(p, { ...a, y: a.y - 1 }, CIMA);
  return p.evaluate(
    ({ a }) => {
      const e = window.__brumaluz!;
      const d = e.fantasmaMovel?.d ?? -1;
      // (mira de novo no mesmo passo: a câmera pode ter assentado depois da primeira mira)
      const mirou = e.mirarBloco!(a.x, a.y - 1, a.z, { x: 0, y: 1, z: 0 } as never);
      const posto = mirou && (e.interagir!('colocar') as unknown as boolean);
      return { posto, soltas: e.pecasSoltas!(a.x - 4, a.y, a.z - 4, a.x + 4, a.y + 2, a.z + 4), d };
    },
    { a },
  );
}

/**
 * A troca de roupa aberta pelo guarda-roupa: a fileira das roupas inteira na tela, sem rolar, e
 * um fundo por trás (o boneco do mundo não atravessa a prévia). Tira a foto.
 */
async function conferirProvador(p: Page, tamanho: Tamanho) {
  await p.waitForTimeout(700);
  const m = await p.evaluate(() => {
    const painel = document.querySelector<HTMLElement>('.painel-personagem [data-aba-painel="roupa"]')!;
    const primeira = painel.querySelector<HTMLElement>('button.miniatura')!.getBoundingClientRect();
    const entrada = document.querySelector<HTMLElement>('.entrada')!;
    const tela = document.querySelector<HTMLElement>('.tela-personagem.provador')!;
    const fundo = getComputedStyle(tela).backgroundImage;
    const r = tela.getBoundingClientRect();
    // a prévia não passa por cima do painel
    const c = document.querySelector<HTMLElement>('[data-previa-personagem]')!.getBoundingClientRect();
    const pa = document.querySelector<HTMLElement>('.painel-personagem')!.getBoundingClientRect();
    const sobrepoe = c.right > pa.left + 1 && c.left < pa.right - 1 && c.bottom > pa.top + 1 && c.top < pa.bottom - 1;
    return {
      sobrepoe,
      roupaNaTela: primeira.top >= 0 && primeira.bottom <= innerHeight && primeira.right <= innerWidth,
      rolou: entrada.scrollTop,
      fundo: fundo !== 'none',
      cobre: r.left <= 0 && r.top <= 0 && r.right >= innerWidth && r.bottom >= innerHeight - 1,
    };
  });
  expect(m).toEqual({ sobrepoe: false, roupaNaTela: true, rolou: 0, fundo: true, cobre: true });
  await p.screenshot({ path: `${PASTA}/troca-de-roupa-pelo-guarda-roupa-${tamanho}.png` });
}

test.describe.configure({ mode: 'parallel' });

test('pôr à mão: os oito móveis inteiros na hora, o fantasma vermelho onde não cabe, e nada some no salvamento da saída', async ({ browser }) => {
  test.setTimeout(420_000);
  const p = await mundo(browser, 'moveis-t06-por');
  const erros: string[] = [];
  p.on('pageerror', (e) => {
    erros.push(String(e));
    console.log(`PILHA ${e.stack}`);
  });
  const r = await plataforma(p);
  const { cx, cz, Y } = r;
  const fila: { b: number; a: P }[] = [
    { b: Bloco.SOFA, a: { x: cx - 6, y: Y + 1, z: cz - 2 } },
    { b: Bloco.CADEIRA, a: { x: cx - 3, y: Y + 1, z: cz - 2 } },
    { b: Bloco.CRIADO_MUDO, a: { x: cx - 1, y: Y + 1, z: cz - 2 } },
    { b: Bloco.ABAJUR, a: { x: cx + 1, y: Y + 1, z: cz - 2 } },
    { b: Bloco.PIA, a: { x: cx + 3, y: Y + 1, z: cz - 2 } },
    { b: Bloco.GUARDA_ROUPA, a: { x: cx - 6, y: Y + 1, z: cz + 3 } },
    { b: Bloco.CAMA, a: { x: cx - 3, y: Y + 1, z: cz + 3 } },
  ];
  for (const { b, a } of fila) {
    const r1 = await porAMao(p, b, a);
    expect(r1.posto, `pôs ${b}`).toBe(true);
    expect(r1.d, `${b} olha para +z`).toBe(0);
    // logo depois do toque, antes do núcleo: a cópia da tela já tem o móvel inteiro
    expect(r1.soltas, `${b} sem peça solta na hora`).toEqual([]);
    const cs = celulasDoMovel(b, a.x, a.y, a.z, 0);
    expect(await celulas(p, cs), `${b} inteiro na hora`).toEqual(esperado(b, 0, cs));
  }
  passo('os sete à mão');
  // o tapete, na camada rente ao chão
  const T = { x: cx, y: Y + 1, z: cz + 3 };
  const rt = await porAMao(p, Bloco.TAPETE, T);
  expect(rt.posto).toBe(true);
  // o núcleo confirma tudo igual
  await p.waitForTimeout(1500);
  for (const { b, a } of fila) {
    const cs = celulasDoMovel(b, a.x, a.y, a.z, 0);
    expect(await celulas(p, cs), `${b} confirmado`).toEqual(esperado(b, 0, cs));
  }
  expect(await soltas(p, r)).toEqual([]);
  const tapetes = await p.evaluate(() => window.__brumaluz!.moveis!.contagem().tapetes);
  expect(tapetes).toBeGreaterThanOrEqual(1);

  passo('confirmados');
  // o fantasma vermelho: o sofá encostado numa pedra não cabe (e nada é posto)
  const pedra = { x: cx + 6, y: Y + 1, z: cz - 2 };
  await p.evaluate(({ c, b }) => window.__brumaluz!.definirBloco!(c.x, c.y, c.z, b), { c: pedra, b: Bloco.PEDRA_LISA });
  await expect.poll(() => p.evaluate((c) => window.__brumaluz!.bloco!(c.x, c.y, c.z), pedra)).toBe(Bloco.PEDRA_LISA);
  await naMao(p, Bloco.SOFA);
  const N = { x: cx + 5, y: Y + 1, z: cz - 2 };
  await ir(p, N.x + 0.5, N.z - 2.5, N.y);
  await mirarAte(p, { ...N, y: Y }, CIMA);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.fantasmaMovel)).toMatchObject({ bloco: Bloco.SOFA, x: N.x, z: N.z, cabe: false });
  await p.screenshot({ path: `${PASTA}/fantasma-vermelho-empe.png` });
  expect(await p.evaluate(() => window.__brumaluz!.interagir!('colocar'))).toBe(false);
  await p.waitForTimeout(600);
  expect(await p.evaluate((c) => window.__brumaluz!.bloco!(c.x, c.y, c.z), N)).toBe(Bloco.AR);
  // a cama com uma pedra no pé: vermelha também
  const pedraPe = { x: N.x, y: N.y, z: N.z + 1 };
  await p.evaluate(({ c, b }) => window.__brumaluz!.definirBloco!(c.x, c.y, c.z, b), { c: pedraPe, b: Bloco.PEDRA_LISA });
  await naMao(p, Bloco.CAMA);
  await mirarAte(p, { ...N, y: Y }, CIMA);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.fantasmaMovel)).toMatchObject({ bloco: Bloco.CAMA, cabe: false });
  await p.screenshot({ path: `${PASTA}/fantasma-cama-nao-cabe-empe.png` });
  // onde cabe, o fantasma é neutro (branco-azulado), no sofá e na cama
  // (a cama cresce para a frente: o pé fica em cz + 7, ainda na laje)
  const L = { x: cx + 1, y: Y + 1, z: cz + 6 };
  await ir(p, L.x + 0.5, L.z - 2.5, L.y);
  await mirarAte(p, { ...L, y: Y }, CIMA);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.fantasmaMovel?.cabe)).toBe(true);
  await p.screenshot({ path: `${PASTA}/fantasma-cama-cabe-empe.png` });
  await naMao(p, Bloco.SOFA);
  await mirarAte(p, { ...L, y: Y }, CIMA);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.fantasmaMovel)).toMatchObject({ bloco: Bloco.SOFA, cabe: true });
  await p.waitForTimeout(200);
  await p.screenshot({ path: `${PASTA}/fantasma-cabe-empe.png` });

  passo('fantasmas');
  // nada some: o salvamento da saída grava a cópia da tela como ela está (`edicoes.exportar()`),
  // antes da correção do núcleo. Logo depois do toque, no mesmo passo, a cópia já tem o móvel
  // inteiro: as quatro células com as partes, e um dono só (senão, ao abrir, viravam peça solta)
  const S = { x: cx + 3, y: Y + 1, z: cz + 3 };
  await naMao(p, Bloco.GUARDA_ROUPA);
  await ir(p, S.x + 0.5, S.z - 2.5, S.y);
  await mirarAte(p, { ...S, y: Y }, CIMA);
  const csG = celulasDoMovel(Bloco.GUARDA_ROUPA, S.x, S.y, S.z, 0);
  const naHora = await p.evaluate((cs) => {
    const e = window.__brumaluz!;
    // (mira de novo no mesmo passo: a câmera pode ter assentado depois da primeira mira)
    const c0 = cs[0];
    const mirou = e.mirarBloco!(c0.x, c0.y - 1, c0.z, { x: 0, y: 1, z: 0 } as never);
    const ok = mirou && (e.interagir!('colocar') as unknown as boolean);
    return {
      ok,
      cel: cs.map((c) => [e.bloco!(c.x, c.y, c.z), e.meta!(c.x, c.y, c.z)]),
      donos: [...new Set(cs.map((c) => String(e.donoDoBloco!(c.x, c.y, c.z))))],
    };
  }, csG);
  expect(naHora.ok).toBe(true);
  expect(naHora.cel).toEqual(esperado(Bloco.GUARDA_ROUPA, 0, csG));
  expect(naHora.donos).toHaveLength(1);
  passo('guarda-roupa na hora');
  const lerGravado = () => p.evaluate(
    ({ cs }) =>
      new Promise<number[][]>((ok) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onsuccess = () => {
          const g = req.result.transaction('kv').objectStore('kv').get('mundo:moveis-t06-por');
          g.onsuccess = () => {
            const ed = (g.result?.edicoes ?? {}) as Record<string, [number, number][]>;
            const mapas = new Map(Object.entries(ed).map(([k, v]) => [k, new Map(v)]));
            ok(
              cs.map((c) => {
                const ccx = Math.floor(c.x / 16);
                const ccz = Math.floor(c.z / 16);
                const i = (c.y * 16 + (c.z - ccz * 16)) * 16 + (c.x - ccx * 16);
                const v = mapas.get(`${ccx},${ccz}`)?.get(i) ?? -1;
                return [v & 255, (v >> 8) & 255, v >>> 16];
              }),
            );
          };
        };
      }),
    { cs: csG },
  );
  // o salvamento de sempre grava o guarda-roupa inteiro, com um dono só
  await p.waitForTimeout(800);
  expect(await p.evaluate(() => window.__brumaluz!.salvar!(false))).toBe(true);
  const gravado = await lerGravado();
  expect(gravado.map(([b, m]) => [b, m])).toEqual(esperado(Bloco.GUARDA_ROUPA, 0, csG));
  expect(new Set(gravado.map(([, , dono]) => dono)).size).toBe(1);

  passo('recarregar');
  // recarregar: tudo volta (os móveis e o tapete)
  expect(await p.evaluate(() => window.__brumaluz!.salvar!(false))).toBe(true);
  await p.reload();
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });
  await p.evaluate(() => document.querySelector('.entrada')?.setAttribute('hidden', ''));
  for (const { b, a } of [...fila, { b: Bloco.GUARDA_ROUPA, a: S }]) {
    const cs = celulasDoMovel(b, a.x, a.y, a.z, 0);
    await expect.poll(() => celulas(p, cs), { timeout: 30_000, message: `${b} voltou` }).toEqual(esperado(b, 0, cs));
  }
  await ir(p, T.x + 1.5, T.z - 2.5, T.y);
  await expect
    .poll(() => p.evaluate(() => window.__brumaluz!.moveis!.contagem().tapetes), { timeout: 30_000 })
    .toBeGreaterThanOrEqual(1);
  expect(await soltas(p, r)).toEqual([]);
  expect(erros).toEqual([]);
  await p.context().close();
});

test('os toques: o abajur e o criado-mudo acendem inteiros, a pia, o guarda-roupa com a troca de roupa, sentar e deitar', async ({ browser }) => {
  test.setTimeout(420_000);
  const p = await mundo(browser, 'moveis-t06-toques');
  const erros: string[] = [];
  p.on('pageerror', (e) => erros.push(String(e)));
  const r = await plataforma(p);
  const { cx, cz, Y } = r;
  const y = Y + 1;
  const M = {
    abajur: { x: cx - 5, y, z: cz },
    criado: { x: cx - 3, y, z: cz },
    pia: { x: cx - 1, y, z: cz },
    guarda: { x: cx + 1, y, z: cz },
    sofa: { x: cx - 5, y, z: cz + 4 },
    cadeira: { x: cx - 1, y, z: cz + 4 },
    cama: { x: cx + 2, y, z: cz + 3 },
  };
  const lote = [
    [Bloco.ABAJUR, M.abajur],
    [Bloco.CRIADO_MUDO, M.criado],
    [Bloco.PIA, M.pia],
    [Bloco.GUARDA_ROUPA, M.guarda],
    [Bloco.SOFA, M.sofa],
    [Bloco.CADEIRA, M.cadeira],
    [Bloco.CAMA, M.cama],
  ] as const;
  // só a âncora (olhando para quem está em -z: d = 2, a frente para a criança); o núcleo monta o resto
  await p.evaluate(
    (l) => window.__brumaluz!.editarLote!(l.map(([b, c]) => ({ ...c, v: b | (2 << 8) }))),
    lote.map(([b, c]) => [b, c] as [number, P]),
  );
  for (const [b, c] of lote) {
    const cs = celulasDoMovel(b, c.x, c.y, c.z, 2);
    await expect.poll(() => celulas(p, cs), { message: `${b}` }).toEqual(esperado(b, 2, cs));
  }
  const tocar = async (c: P, de: P) => {
    await ir(p, de.x, de.z, y);
    await p.waitForTimeout(250);
    await mirarAte(p, c);
    await p.evaluate(() => window.__brumaluz!.usarOuColocar!());
  };

  // o abajur: o toque na cúpula acende o abajur inteiro, na hora (as duas células juntas)
  const cupula = { ...M.abajur, y: y + 1 };
  await ir(p, M.abajur.x + 0.5, M.abajur.z - 2.5, y);
  await mirarAte(p, cupula);
  const acendeu = await p.evaluate(
    ({ a, r }) => {
      const e = window.__brumaluz!;
      e.usarOuColocar!();
      return {
        ids: [e.bloco!(a.x, a.y, a.z), e.bloco!(a.x, a.y + 1, a.z)],
        soltas: e.pecasSoltas!(r.cx - 7, r.Y + 1, r.cz - 7, r.cx + 7, r.Y + 3, r.cz + 7),
      };
    },
    { a: M.abajur, r },
  );
  expect(acendeu).toEqual({ ids: [Bloco.ABAJUR_ACESO, Bloco.ABAJUR_ACESO], soltas: [] });
  await p.waitForTimeout(800);
  expect(await celulas(p, [M.abajur, cupula])).toEqual([
    [Bloco.ABAJUR_ACESO, metaDoMovel(2, 0)],
    [Bloco.ABAJUR_ACESO, metaDoMovel(2, 1)],
  ]);
  // o criado-mudo
  await tocar(M.criado, { x: M.criado.x + 0.5, y, z: M.criado.z - 2.5 });
  await expect.poll(() => p.evaluate((c) => window.__brumaluz!.bloco!(c.x, c.y, c.z), M.criado)).toBe(Bloco.CRIADO_MUDO_ACESO);
  // de novo: apaga
  await tocar(M.criado, { x: M.criado.x + 0.5, y, z: M.criado.z - 2.5 });
  await expect.poll(() => p.evaluate((c) => window.__brumaluz!.bloco!(c.x, c.y, c.z), M.criado)).toBe(Bloco.CRIADO_MUDO);

  // a pia: abre a água, outro toque fecha; sozinha, fecha em 6 s
  const pia = `${M.pia.x},${M.pia.y},${M.pia.z}`;
  await tocar(M.pia, { x: M.pia.x + 0.5, y, z: M.pia.z - 2.5 });
  expect((await p.evaluate(() => window.__brumaluz!.moveisTela!())).agua).toEqual([pia]);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${PASTA}/pia-com-agua-empe.png` });
  await tocar(M.pia, { x: M.pia.x + 0.5, y, z: M.pia.z - 2.5 });
  expect((await p.evaluate(() => window.__brumaluz!.moveisTela!())).agua).toEqual([]);
  await tocar(M.pia, { x: M.pia.x + 0.5, y, z: M.pia.z - 2.5 });
  const abriu = Date.now();
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.moveisTela!().agua.length), { timeout: 9000 }).toBe(0);
  expect(Date.now() - abriu).toBeGreaterThan(5000);

  // o guarda-roupa: as portas abrem e a troca de roupa vem direto nas roupas, sem o "Jogar"
  await ir(p, M.guarda.x + 1, M.guarda.z - 2.5, y);
  await p.waitForTimeout(250);
  await mirarAte(p, M.guarda);
  const t0 = Date.now();
  await p.evaluate(() => window.__brumaluz!.usarOuColocar!());
  expect((await p.evaluate(() => window.__brumaluz!.moveisTela!())).portas).toBe(`${M.guarda.x},${M.guarda.y},${M.guarda.z}`);
  await expect(p.locator('.tela-personagem.provador')).toBeVisible({ timeout: 3000 });
  const abriuEm = Date.now() - t0;
  expect(abriuEm, 'a troca de roupa abre em menos de 0,5 s (mais a folga do teste)').toBeLessThan(1500);
  await expect(p.locator('.painel-personagem [data-aba="roupa"]')).toHaveAttribute('aria-selected', 'true');
  await expect(p.locator('.painel-personagem [data-jogar]')).toBeHidden();
  await conferirProvador(p, 'empe');
  await p.locator('[data-voltar-titulo]').click();
  await expect(p.locator('.tela-personagem.provador')).toHaveCount(0);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.moveisTela!().portas)).toBeNull();
  await expect(p.locator('.entrada')).toBeHidden();

  // sentar no sofá: a tela leva o boneco até o assento, sem pular, em menos de 0,4 s
  const sentar = async (c: P, de: P) => {
    await ir(p, de.x, de.z, y);
    await p.waitForTimeout(300);
    await mirarAte(p, c);
    return p.evaluate(async (c) => {
      const e = window.__brumaluz!;
      // (mira de novo no mesmo passo: a câmera que volta sozinha para trás depois de andar)
      e.mirarBloco!(c.x, c.y, c.z);
      const t0 = performance.now();
      let ys: number[] = [];
      const antes = JSON.stringify({ alvo: e.alvo, b: e.alvo ? e.bloco!(e.alvo.x, e.alvo.y, e.alvo.z) : -1, m: e.moveisTela!() });
      e.usarOuColocar!();
      let sentou = -1;
      for (let i = 0; i < 200 && sentou < 0; i++) {
        await new Promise((r) => requestAnimationFrame(r));
        const m = e.moveisTela!();
        ys.push(m.jogador[1]);
        if (m.assento) sentou = performance.now() - t0;
      }
      ys = ys.slice(0, 40);
      // sem pulo: a altura nunca passa do assento mais um tico
      return { sentou, maiorY: Math.max(...ys), m: e.moveisTela!(), antes };
    }, c).then((r) => {
      if (r.sentou < 0) console.log(`SENTAR não sentou: ${r.antes} depois ${JSON.stringify(r.m)}`);
      return r;
    });
  };
  const sofa = await sentar(M.sofa, { x: M.sofa.x + 0.5, y, z: M.sofa.z - 2.5 });
  expect(sofa.sentou, 'sentou').toBeGreaterThan(0);
  // (o pedido vai ao núcleo do aparelho e volta; 0,3 s de deslize)
  expect(sofa.sentou, 'sentou em menos de 0,4 s (mais a ida ao núcleo)').toBeLessThan(900);
  expect(sofa.maiorY).toBeLessThan(y + 0.7);
  expect(sofa.m.assento!.deitado ?? false).toBe(false);
  expect(Math.hypot(sofa.m.jogador[0] - sofa.m.assento!.px, sofa.m.jogador[2] - sofa.m.assento!.pz)).toBeLessThan(0.05);
  // fica sentado (o núcleo não levanta quem chegou)
  await p.waitForTimeout(3500);
  expect((await p.evaluate(() => window.__brumaluz!.moveisTela!())).assento).not.toBeNull();
  await p.screenshot({ path: `${PASTA}/sentada-no-sofa-empe.png` });
  // andar levanta (a tela desliza para fora e solta)
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(1, 0));
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.moveisTela!().assento)).toBeNull();
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await p.waitForTimeout(800);

  // a cadeira
  const cadeira = await sentar(M.cadeira, { x: M.cadeira.x + 0.5, y, z: M.cadeira.z - 2.5 });
  expect(cadeira.sentou).toBeGreaterThan(0);
  expect(cadeira.maiorY).toBeLessThan(y + 0.7);
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 1));
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.moveisTela!().assento)).toBeNull();
  await p.evaluate(() => window.__brumaluz!.controleDireto!.mover(0, 0));
  await p.waitForTimeout(800);

  // a cama: deitada no meio dela
  const cama = await sentar(M.cama, { x: M.cama.x + 2.5, y, z: M.cama.z + 0.5 });
  expect(cama.sentou).toBeGreaterThan(0);
  expect(cama.m.assento!.deitado).toBe(true);
  expect(cama.maiorY).toBeLessThan(y + 0.7);
  await p.waitForTimeout(3500);
  expect((await p.evaluate(() => window.__brumaluz!.moveisTela!())).assento).not.toBeNull();
  await p.screenshot({ path: `${PASTA}/deitada-na-cama-empe.png` });
  expect(erros).toEqual([]);
  await p.context().close();
});

/** O centro de um elemento na tela. */
const centro = async (p: Page, sel: string) => {
  const b = (await p.locator(sel).first().boundingBox())!;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
};
async function dedo(p: Page) {
  const cdp = await p.context().newCDPSession(p);
  const toque = (type: string, pt?: { x: number; y: number }) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: pt ? [{ x: pt.x, y: pt.y, id: 1, radiusX: 4, radiusY: 4, force: 1 }] : [],
    } as never);
  return {
    async arrastar(de: { x: number; y: number }, ate: { x: number; y: number }) {
      await toque('touchStart', de);
      const n = Math.max(2, Math.min(12, Math.ceil(Math.hypot(ate.x - de.x, ate.y - de.y) / 18)));
      for (let i = 1; i <= n; i++) {
        await toque('touchMove', { x: de.x + ((ate.x - de.x) * i) / n, y: de.y + ((ate.y - de.y) * i) / n });
        await p.waitForTimeout(16);
      }
      await toque('touchEnd');
    },
  };
}

test('montar na mesa: o sofá pela aba casa do livro, posto e quebrado (volta um sofá só)', async ({ browser }) => {
  test.setTimeout(420_000);
  const p = await mundo(browser, 'moveis-t06-mesa', 'empe', 'sobrevivencia');
  const erros: string[] = [];
  p.on('pageerror', (e) => erros.push(String(e)));
  await p.evaluate(() => document.body.classList.add('toque-ativo'));
  // os materiais: 5 lãs e 3 tábuas, e o ferro e as pedras da pia
  await p.evaluate(
    ({ la, tab, ped }) => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      e.soltarItem!(`bloco:${la}`, 5, x, y - 1, z);
      e.soltarItem!(`bloco:${tab}`, 3, x, y - 1, z);
      e.soltarItem!('lingote_ferro', 1, x, y - 1, z);
      e.soltarItem!(`bloco:${ped}`, 3, x, y - 1, z);
    },
    { la: Bloco.LA_BRANCA, tab: Bloco.TABUAS, ped: Bloco.PEDREGULHO },
  );
  await expect
    .poll(() => p.evaluate((la) => window.__brumaluz!.inventario!.contar(`bloco:${la}`), Bloco.LA_BRANCA), { timeout: 20_000 })
    .toBe(5);
  await expect.poll(() => p.evaluate(() => window.__brumaluz!.inventario!.contar('lingote_ferro'))).toBe(1);
  // a mesa de montar
  await p.evaluate((mesa) => {
    window.dispatchEvent(new CustomEvent('brumaluz:usar', { detail: { bloco: mesa, x: 0, y: 0, z: 0 } }));
  }, Bloco.MESA_TRABALHO);
  await expect.poll(() => p.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
  await p.locator('[data-livro]').tap();
  await p.locator('.livro [data-aba-categoria="casa"]').tap();
  // a aba casa: só os oito móveis, e o sofá e a pia (que dá para fazer) vêm primeiro
  const receitas = await p.locator('.livro [data-receita]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.receita));
  expect(new Set(receitas)).toEqual(new Set(['cama', 'sofa', 'cadeira', 'tapete', 'abajur', 'criado_mudo', 'guarda_roupa', 'pia']));
  // o que dá para fazer com o que ela tem vem marcado (o abajur pede a tocha: não)
  await expect(p.locator('.livro [data-receita="sofa"].disponivel')).toHaveCount(1);
  await expect(p.locator('.livro [data-receita="pia"].disponivel')).toHaveCount(1);
  await expect(p.locator('.livro [data-receita="abajur"].bloqueada')).toHaveCount(1);
  await p.locator('.livro [data-receita="sofa"]').tap();
  await expect.poll(() => p.evaluate(() => document.querySelector<HTMLElement>('[data-resultado-criacao]')?.dataset.item)).toBe(`bloco:${Bloco.SOFA}`);
  await p.waitForTimeout(4000);
  // o resultado mostra o modelo do sofá (o mesmo ícone do livro e da barra), e não o cubo de pixel
  const icones = () =>
    p.evaluate(() => ({
      resultado: document.querySelector<HTMLImageElement>('[data-resultado-criacao] img')?.src,
      livro: document.querySelector<HTMLImageElement>('.livro [data-receita="sofa"] img')?.src,
    }));
  await expect.poll(async () => { const i = await icones(); return i.resultado === i.livro; }, { timeout: 20_000 }).toBe(true);
  await p.screenshot({ path: `${PASTA}/mesa-de-montar-casa-empe.png` });
  const d = await dedo(p);
  await d.arrastar(await centro(p, '[data-resultado-criacao]'), await centro(p, '.inventario .slot-inv[data-indice="8"]'));
  await expect.poll(() => p.evaluate((s) => window.__brumaluz!.inventario!.contar(`bloco:${s}`), Bloco.SOFA)).toBe(1);
  // a pia, com o ferro de verdade
  await p.locator('.livro [data-receita="pia"]').tap();
  await expect.poll(() => p.evaluate(() => document.querySelector<HTMLElement>('[data-resultado-criacao]')?.dataset.item)).toBe(`bloco:${Bloco.PIA}`);
  await d.arrastar(await centro(p, '[data-resultado-criacao]'), await centro(p, '.inventario .slot-inv[data-indice="7"]'));
  await expect.poll(() => p.evaluate((s) => window.__brumaluz!.inventario!.contar(`bloco:${s}`), Bloco.PIA)).toBe(1);
  await p.locator('.inventario > [data-fechar]').tap();
  await expect.poll(() => p.evaluate(() => document.body.dataset.overlay ?? '')).toBe('');

  // pôr o sofá à mão (na sobrevivência) e quebrar: volta um sofá só
  const chao = await p.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!;
    return { x: Math.floor(x), y: Math.floor(y - 1.6), z: Math.floor(z) };
  });
  const slotSofa = await p.evaluate((s) => window.__brumaluz!.inventario!.slots.findIndex((x) => x?.item === `bloco:${s}`), Bloco.SOFA);
  await p.evaluate((i) => window.__brumaluz!.selecionarSlot!(i < 9 ? i : 0), slotSofa);
  if (slotSofa >= 9) throw new Error('o sofá foi para fora da barra');
  // procura um lugar plano à frente (duas células livres com chão)
  const A = await p.evaluate((c) => {
    const e = window.__brumaluz!;
    for (let dz = 2; dz <= 6; dz++)
      for (let dx = -3; dx <= 3; dx++)
        for (let dy = 3; dy >= -3; dy--) {
          const x = c.x + dx;
          const y = c.y + dy;
          const z = c.z + dz;
          const livre = (xx: number) => e.bloco!(xx, y, z) === 0 && e.bloco!(xx, y + 1, z) === 0;
          const solido = (xx: number) => ![0, 8].includes(e.bloco!(xx, y - 1, z));
          if (livre(x) && livre(x + 1) && solido(x) && solido(x + 1)) return { x, y, z };
        }
    return null;
  }, chao);
  expect(A).not.toBeNull();
  await ir(p, A!.x + 0.5, A!.z - 2.5);
  await p.waitForTimeout(400);
  await mirarAte(p, { ...A!, y: A!.y - 1 }, CIMA);
  expect(await p.evaluate(() => window.__brumaluz!.interagir!('colocar'))).toBe(true);
  const csS = celulasDoMovel(Bloco.SOFA, A!.x, A!.y, A!.z, 0);
  await expect.poll(() => celulas(p, csS)).toEqual(esperado(Bloco.SOFA, 0, csS));
  await expect.poll(() => p.evaluate((s) => window.__brumaluz!.inventario!.contar(`bloco:${s}`), Bloco.SOFA)).toBe(0);
  // quebra pela parte da direita: sai o sofá inteiro, e volta um sofá só
  const direita = csS[1];
  await mirarAte(p, direita);
  await p.evaluate(async () => {
    const e = window.__brumaluz!;
    e.controleDireto!.quebrar(true);
    await new Promise((r) => setTimeout(r, 3500));
    e.controleDireto!.quebrar(false);
  });
  await expect.poll(() => celulas(p, csS), { timeout: 15_000 }).toEqual([[0, 0], [0, 0]]);
  // o sofá cai no chão, onde estava: a criança vai até ele e pega
  await ir(p, A!.x + 1, A!.z + 0.5, A!.y);
  await expect
    .poll(() => p.evaluate((s) => window.__brumaluz!.inventario!.contar(`bloco:${s}`), Bloco.SOFA), { timeout: 15_000 })
    .toBe(1);
  await p.waitForTimeout(2000);
  expect(await p.evaluate((s) => window.__brumaluz!.inventario!.contar(`bloco:${s}`), Bloco.SOFA)).toBe(1);
  expect(erros).toEqual([]);
  await p.context().close();
});

test('a troca de roupa pelo guarda-roupa, deitado: as roupas sem rolar, com o fundo por trás', async ({ browser }) => {
  test.setTimeout(300_000);
  const p = await mundo(browser, 'moveis-t06-provador-deitado', 'deitado');
  const erros: string[] = [];
  p.on('pageerror', (e) => erros.push(String(e)));
  const { cx, cz, Y } = await plataforma(p);
  const G = { x: cx, y: Y + 1, z: cz };
  await p.evaluate((c) => window.__brumaluz!.editarLote!([{ ...c.g, v: c.b | (2 << 8) }]), { g: G, b: Bloco.GUARDA_ROUPA });
  const cs = celulasDoMovel(Bloco.GUARDA_ROUPA, G.x, G.y, G.z, 2);
  await expect.poll(() => celulas(p, cs)).toEqual(esperado(Bloco.GUARDA_ROUPA, 2, cs));
  await ir(p, G.x, G.z - 2.5, G.y);
  await p.waitForTimeout(300);
  await mirarAte(p, G);
  await p.evaluate(() => window.__brumaluz!.usarOuColocar!());
  await expect(p.locator('.tela-personagem.provador')).toBeVisible({ timeout: 3000 });
  await conferirProvador(p, 'deitado');
  expect(erros).toEqual([]);
  await p.context().close();
});

for (const tamanho of ['empe', 'deitado'] as const)
  test(`a aba casa do criativo: os oito móveis sem rolar (${tamanho})`, async ({ browser }) => {
    test.setTimeout(300_000);
    const p = await mundo(browser, `moveis-t06-aba-${tamanho}`, tamanho);
    const erros: string[] = [];
    p.on('pageerror', (e) => erros.push(String(e)));
    await p.evaluate(() => document.body.classList.add('toque-ativo'));
    await p.locator('[data-botao-mochila]').dispatchEvent('click');
    await expect.poll(() => p.evaluate(() => document.body.dataset.overlay)).toBe('inventario');
    const abas = await p.locator('.catalogo [data-aba-categoria]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.abaCategoria));
    expect(abas).toEqual(['tudo', 'blocos', 'casa', 'comida', 'ferramentas', 'luz', 'decoracao', 'materiais']);
    await p.locator('.catalogo [data-aba-categoria="casa"]').tap();
    const itens = await p.locator('.catalogo [data-catalogo]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.catalogo));
    expect(new Set(itens)).toEqual(
      new Set([Bloco.CAMA, Bloco.SOFA, Bloco.CADEIRA, Bloco.CRIADO_MUDO, Bloco.ABAJUR, Bloco.TAPETE, Bloco.PIA, Bloco.GUARDA_ROUPA].map((b) => `bloco:${b}`)),
    );
    // sem rolar: a grade da aba não rola, e todos os móveis estão dentro da tela
    const medida = await p.evaluate(() => {
      const g = document.querySelector<HTMLElement>('.catalogo .grade-slots')!;
      const vis = [...g.querySelectorAll<HTMLElement>('[data-catalogo]')].every((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
      });
      return { rola: g.scrollHeight > g.clientHeight + 1, vis };
    });
    expect(medida).toEqual({ rola: false, vis: true });
    // as abas cabem na largura (nenhuma fica escondida na rolagem)
    const cabem = await p.evaluate(() => {
      const a = document.querySelector<HTMLElement>('.catalogo .abas-categoria')!;
      return a.scrollWidth <= a.clientWidth + 1;
    });
    expect(cabem).toBe(true);
    // (os ícones de brinquedo dos móveis chegam aos poucos depois de abrir o mundo)
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${PASTA}/aba-casa-criativo-${tamanho}.png` });
    // a aba tudo volta a mostrar tudo
    await p.locator('.catalogo [data-aba-categoria="tudo"]').tap();
    expect(await p.locator('.catalogo [data-catalogo]').count()).toBeGreaterThan(40);
    expect(erros).toEqual([]);
    await p.context().close();
  });
