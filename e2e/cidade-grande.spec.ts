import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 014, T11: as regras da Cidade Grande na tela, no jogo de verdade (núcleo no trabalhador
 * ou na nuvem, cena e malha).
 * - duas crianças na nuvem enchem a mesma obra, cada uma com a sua colher: a casinha fica
 *   pronta nas duas telas e as duas ganham o capacete;
 * - cada mundo é uma história: a criança faz a casinha num mundo da cidade, junta tijolo,
 *   concreto e asfalto; num mundo do Rancho Alegre nada disso aparece (mochila, criativo),
 *   mas o capacete ganho na cidade continua dela e veste lá; de volta à cidade, tudo como
 *   estava.
 */
test.setTimeout(900_000);
const PASTA = `${PASTA_CAPTURAS}/cidade-grande`;

type Fantasma = { x: number; y: number; z: number; bloco: number; canteiro: number };

async function jogador(
  browser: Browser,
  id: string,
  apelido: string,
  celular = false,
): Promise<Page> {
  const ctx = await browser.newContext(
    celular
      ? { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }
      : { viewport: { width: 1280, height: 720 } },
  );
  await ctx.addInitScript(
    ([i, a]) => {
      try {
        if (!localStorage.getItem('terrario:identidade'))
          localStorage.setItem(
            'terrario:identidade',
            JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
          );
        localStorage.setItem(
          'terrario:config',
          JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
        );
      } catch {
        // sem armazenamento
      }
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}

const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, null, { timeout: 240_000 });

async function noJogo(p: Page) {
  await p.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
}

async function foto(p: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await p.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 82 });
}

/** A colher do pedreiro na mão (ela chega sozinha perto dele). */
async function colherNaMao(p: Page) {
  await p.waitForFunction(
    () => {
      const i = window.__brumaluz!.inventario as unknown as {
        obter(i: number): { item: string } | null;
      };
      for (let k = 0; k < 36; k++) if (i.obter(k)?.item === 'colher_pedreiro') return true;
      return false;
    },
    undefined,
    { timeout: 30_000 },
  );
  await p.evaluate(() => {
    const e = window.__brumaluz!;
    const i = e.inventario as unknown as { obter(i: number): { item: string } | null };
    for (let k = 0; k < 9; k++) if (i.obter(k)?.item === 'colher_pedreiro') e.selecionarSlot!(k);
  });
}

const fantasmas = (p: Page, n: number): Promise<Fantasma[]> =>
  p.evaluate(
    (n) => (window.__brumaluz!.fantasmasPerto?.() ?? []).filter((f) => f.canteiro === n),
    n,
  );

/**
 * Voa ao lado de um fantasma até a mira pegar e enche com o clique direito; devolve se encheu.
 *
 * Spec 037 (o mesmo conserto do canteiro, c55fc51): o boneco que o teleporte põe dentro do
 * tapume, do andaime ou de um bloco da obra é solto para o lugar livre mais perto, e a mira que
 * nascia dentro de um bloco passava pelas paredes. Então a mira é feita depois que ele assenta,
 * no meio do fantasma ou perto de uma face, e primeiro só vale o fantasma visado (de baixo para
 * cima), para nenhum de baixo ficar fechado entre os de cima já cheios.
 */
async function encherUm(p: Page, lista: Fantasma[]): Promise<boolean> {
  for (const soOVisado of [true, false])
    for (const f of lista.slice(0, 6))
      for (const [dx, dz, dy] of [
        [0, -2.6, 1.2],
        [0, 2.6, 1.2],
        [-2.6, 0, 1.2],
        [2.6, 0, 1.2],
        [0, -1.8, 2.8],
        [0, 1.8, 2.8],
        [-1.8, 0, 2.8],
        [1.8, 0, 2.8],
      ]) {
        await p.evaluate(
          ([f, dx, dz, dy]) => {
            const e = window.__brumaluz!;
            e.voar?.(true);
            e.teleportar!(f.x + 0.5 + dx, f.z + 0.5 + dz, f.y + dy);
          },
          [f, dx, dz, dy] as const,
        );
        await p.waitForTimeout(60);
        const ok = await p.evaluate(
          ([f, so]) => {
            const e = window.__brumaluz!;
            const pontos = [
              [0, 0, 0],
              [-0.45, -0.3, 0],
              [0.45, -0.3, 0],
              [0, -0.3, -0.45],
              [0, -0.3, 0.45],
              [0, 0.45, 0],
            ];
            for (const [px, py, pz] of pontos) {
              e.mirarPonto!(f.x + 0.5 + px, f.y + 0.5 + py, f.z + 0.5 + pz);
              const m = e.fantasmaNaMira?.() as { x: number; y: number; z: number } | null;
              if (m && (!so || (m.x === f.x && m.y === f.y && m.z === f.z))) return true;
            }
            return false;
          },
          [f, soOVisado] as const,
        );
        if (!ok) continue;
        const antes = (await fantasmas(p, f.canteiro)).length;
        await p.evaluate(() => window.__brumaluz!.usarOuColocar!());
        // na nuvem o bloco volta no quadro do servidor
        for (let i = 0; i < 12; i++) {
          await p.waitForTimeout(120);
          if ((await fantasmas(p, f.canteiro)).length < antes) return true;
        }
      }
  return false;
}

const desbloqueios = (p: Page) =>
  p.evaluate(
    () => (window as unknown as { __desbloqueios?: () => string[] }).__desbloqueios?.() ?? [],
  );

test('duas crianças na nuvem ajudam na mesma obra e as duas ganham o capacete', async ({
  browser,
}) => {
  const sufixo = Date.now().toString(36);
  const ana = await jogador(browser, `ana-${sufixo}`, 'Ana');
  await ana.goto('/');
  await pronto(ana);
  await ana.locator('[data-abrir-mundos]').click();
  await ana.locator('.form-novo [data-tema="cidade-grande"]').click();
  await ana.locator('[data-novo-nome]').fill('Cidade da Ana');
  await ana.locator('[data-com-amigos]').check();
  await ana.locator('[data-novo-apelido]').fill('Ana');
  await ana.locator('[data-criar-mundo]').click();
  const codigo = await ana
    .locator('[data-painel-amigos] [data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 120_000 });
  expect(codigo).toMatch(/^[A-Z]+-[A-Z]+-\d\d$/);
  await pronto(ana);

  // a Bia entra pelo link, no celular
  const bia = await jogador(browser, `bia-${sufixo}`, 'Bia', true);
  await bia.goto(`/?sala=${codigo}`);
  await expect(bia.locator('[data-tela-entrar]')).toContainText('Cidade Grande', {
    timeout: 60_000,
  });
  await bia.locator('[data-entrar-apelido]').fill('Bia');
  await bia.locator('[data-entrar-mundo]').tap();
  await pronto(bia);
  await expect(ana.locator('[data-lista-jogadores] li')).toHaveCount(2, { timeout: 30_000 });
  await ana.locator('[data-comecar-a-jogar]').click();
  for (const p of [ana, bia]) {
    await noJogo(p);
    expect(await p.evaluate(() => window.__brumaluz!.tema)).toBe('cidade-grande');
  }
  // as duas nascem ao lado do canteiro: cada uma ganha a sua colher do pedreiro
  await colherNaMao(ana);
  await colherNaMao(bia);
  const total = (await fantasmas(ana, 1)).length;
  expect(total).toBe(23);
  expect((await fantasmas(bia, 1)).length).toBe(23);

  // uma de cada vez, um bloco cada: as duas enchem a mesma obra
  const postos = { Ana: 0, Bia: 0 };
  for (let volta = 0; volta < 120; volta++) {
    const quem = volta % 2 ? bia : ana;
    const lista = await fantasmas(quem, 1);
    if (!lista.length) break;
    // a outra tela vê o mesmo bloco chegar
    if (await encherUm(quem, lista)) postos[volta % 2 ? 'Bia' : 'Ana']++;
    if (volta === 10) {
      await foto(ana, 'nuvem-ana-meio');
      await foto(bia, 'nuvem-bia-meio');
    }
  }
  console.log(`blocos postos: ${JSON.stringify(postos)}`);
  expect(postos.Ana).toBeGreaterThan(0);
  expect(postos.Bia).toBeGreaterThan(0);
  for (const p of [ana, bia])
    await p.waitForFunction(() => (window.__brumaluz!.obrasFeitas ?? []).includes(1), undefined, {
      timeout: 30_000,
    });
  // as duas ganharam o capacete (cada uma no personagem dela)
  for (const p of [ana, bia])
    await expect.poll(() => desbloqueios(p), { timeout: 15_000 }).toContain('capacete-obra');
  expect(await fantasmas(ana, 1)).toEqual([]);
  expect(await fantasmas(bia, 1)).toEqual([]);
  await ana.waitForTimeout(1500);
  await foto(ana, 'nuvem-ana-pronta');
  await foto(bia, 'nuvem-bia-pronta');
  await ana.context().close();
  await bia.context().close();
});

/** Abre o mundo novo de um tema pela tela de título (sem amigos). */
async function criarMundo(p: Page, tema: string, nome: string) {
  await p.goto('/');
  await pronto(p);
  await p.locator('[data-abrir-mundos]').click();
  await p.locator(`.form-novo [data-tema="${tema}"]`).click();
  await p.locator('[data-novo-nome]').fill(nome);
  await p.locator('[data-criar-mundo]').click();
  await p.waitForURL(/mundo=/);
  await pronto(p);
  await noJogo(p);
  expect(await p.evaluate(() => window.__brumaluz!.tema)).toBe(tema);
  return new URL(p.url()).searchParams.get('mundo')!;
}

const DA_CIDADE = ['colher_pedreiro', 'bloco:88', 'bloco:84', 'bloco:93', 'bloco:96'];

/** O que a criança tem (mochila e barra), por item. */
const mochila = (p: Page) =>
  p.evaluate(() => {
    const i = window.__brumaluz!.inventario as unknown as {
      obter(i: number): { item: string; qtd: number } | null;
    };
    const r: Record<string, number> = {};
    for (let k = 0; k < 36; k++) {
      const s = i.obter(k);
      if (s) r[s.item] = (r[s.item] ?? 0) + s.qtd;
    }
    return r;
  });

test('cada mundo é uma história: o da cidade fica na cidade, o capacete vai junto', async ({
  browser,
}) => {
  const p = await jogador(browser, `cris-${Date.now().toString(36)}`, 'Cris');
  const cidade = await criarMundo(p, 'cidade-grande', 'Minha cidade');
  await colherNaMao(p);
  // a casinha do cachorro, bloco por bloco
  for (let volta = 0; volta < 90; volta++) {
    const lista = await fantasmas(p, 1);
    if (!lista.length) break;
    await encherUm(p, lista);
  }
  await p.waitForFunction(() => (window.__brumaluz!.obrasFeitas ?? []).includes(1), undefined, {
    timeout: 30_000,
  });
  await expect.poll(() => desbloqueios(p), { timeout: 15_000 }).toContain('capacete-obra');
  // tijolo, concreto e asfalto na mochila (o que a criança juntaria brincando)
  await p.evaluate(() => {
    const e = window.__brumaluz!;
    e.voar?.(false);
    const [x, y, z] = e.posicao!;
    e.soltarItem!('bloco:43', 12, x, y, z);
    e.soltarItem!('bloco:88', 8, x, y, z);
    e.soltarItem!('bloco:84', 4, x, y, z);
  });
  await expect
    .poll(
      async () => {
        const m = await mochila(p);
        return [m['bloco:43'] ?? 0, m['bloco:88'] ?? 0, m['bloco:84'] ?? 0];
      },
      { timeout: 20_000 },
    )
    .toEqual([12, 8, 4]);
  const naCidade = await mochila(p);
  expect(naCidade['colher_pedreiro']).toBe(1);
  expect(await p.evaluate(() => window.__brumaluz!.salvar!())).toBe(true);

  // um mundo do Rancho Alegre: nada da cidade
  await criarMundo(p, 'rancho-alegre', 'Meu sítio');
  const noRancho = await mochila(p);
  console.log(`mochila no rancho: ${JSON.stringify(noRancho)}`);
  for (const i of [...DA_CIDADE, 'bloco:43']) expect(noRancho[i] ?? 0, i).toBe(0);
  expect(await p.evaluate(() => window.__brumaluz!.obrasFeitas ?? [])).toEqual([]);
  expect(await p.evaluate(() => window.__brumaluz!.cidade?.() ?? null)).toBeNull();
  // o criativo do rancho não mostra os blocos nem a colher da cidade
  await p.keyboard.press('KeyE');
  await expect(p.locator('[data-catalogo]').first()).toBeVisible({ timeout: 10_000 });
  const catalogo = await p
    .locator('[data-catalogo]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.catalogo!));
  expect(catalogo.length).toBeGreaterThan(50);
  for (const i of DA_CIDADE) expect(catalogo, i).not.toContain(i);
  await foto(p, 'rancho-criativo-sem-cidade');
  await p.keyboard.press('Escape');
  // o capacete ganho na cidade é do personagem: continua desbloqueado e veste no rancho
  expect(await desbloqueios(p)).toContain('capacete-obra');
  await p.evaluate(() =>
    window.__brumaluz!.personagem!.definir({ fantasia: { id: 'capacete-obra', cor: 0 } } as never),
  );
  await p.waitForTimeout(1200);
  await foto(p, 'rancho-com-capacete');

  // de volta à cidade: a casinha feita e a mochila de antes
  await p.goto(`/?mundo=${cidade}`);
  await pronto(p);
  await noJogo(p);
  expect(await p.evaluate(() => window.__brumaluz!.obrasFeitas ?? [])).toContain(1);
  // a casinha é da cidade: nenhum fantasma da obra 1, e a obra 2 aberta
  expect(await fantasmas(p, 1)).toEqual([]);
  const deVolta = await mochila(p);
  expect(deVolta['bloco:43']).toBe(12);
  expect(deVolta['bloco:88']).toBe(8);
  expect(deVolta['colher_pedreiro']).toBe(1);
  await p.context().close();
});
