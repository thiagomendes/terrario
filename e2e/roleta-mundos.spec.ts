import { expect, test, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { abrirMundo, assentar } from './guia-palco';
import { escolherNaRoleta, esperarItem, itensDaRoleta, meioDaRoleta, rolarAte } from './roleta-palco';

/**
 * Spec 033: nada da roda de antes se perdeu na roleta, em nenhum mundo. Em cada tema, no
 * celular em pé e com o dedo: a lista do menu (os itens de sempre, os extras do mundo e, na
 * Vila Neon, os que só aparecem quando servem) e a dos gestos (com os presentes de nível e o
 * do mundo), e cada item alcançado de verdade, rolando até o meio. A lista de cada mundo vai
 * para capturas-033/itens-<tema>.json (o relatório da spec).
 */
test.setTimeout(900_000);
test.use({ actionTimeout: 30_000 });
const PASTA = 'capturas-033';

const TEMAS = [
  'padrao',
  'planeta-vivo',
  'mata-encantada',
  'doce-reino',
  'era-dos-dinos',
  'exploracao-lunar',
  'rancho-alegre',
  'cidade-grande',
  'vila-neon',
];

/** O menu de sempre (a ordem da roda da 015; "Tela cheia" só onde o navegador deixa). */
const SEMPRE = ['mapa', 'diario', 'personagem', 'foto', 'gestos', 'casa', 'pausa'];
const GESTOS_SEMPRE = ['acenar', 'cumprimentar', 'chamar', 'comemorar', 'aplaudir', 'dancar', 'apontar', 'sentar'];

/** Rola até cada item (o alcance de verdade) e volta ao primeiro. */
async function alcancarTodos(page: Page, itens: string[]) {
  for (const id of itens) {
    await rolarAte(page, id);
    expect(await meioDaRoleta(page)).toBe(id);
  }
}

const resultado: Record<string, { menu: string[]; gestos: string[]; extras?: Record<string, string[]> }> = {};

for (const tema of TEMAS)
  test(`roleta em ${tema}: todos os itens e gestos alcançáveis`, async ({ browser }) => {
    mkdirSync(PASTA, { recursive: true });
    const page = await abrirMundo(browser, { id: `roleta-mundo-${tema}`, tema, tamanho: 'empe' });
    await page.evaluate(() => document.body.classList.add('toque-ativo'));
    await assentar(page, 8);
    // no nível 10 (os dois gestos de presente)
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('brumaluz:almaNivel', { detail: { nivel: 10 } })),
    );
    await page.waitForTimeout(500);
    await escolherNaRoleta(page);
    const menu = await itensDaRoleta(page);
    for (const id of [...SEMPRE, 'bau', 'lojinha']) expect(menu, id).toContain(id);
    await alcancarTodos(page, menu);
    await escolherNaRoleta(page, 'gestos');
    const gestos = await itensDaRoleta(page);
    for (const id of [...GESTOS_SEMPRE, 'pulo-estrela', 'reverencia']) expect(gestos, id).toContain(id);
    expect(gestos.includes('roqueiro')).toBe(tema === 'vila-neon');
    await alcancarTodos(page, gestos);
    await page.keyboard.press('Escape');
    const r: (typeof resultado)[string] = { menu, gestos };
    // Vila Neon: "Tirar patins" e "Guardar skate" só quando servem
    if (tema === 'vila-neon') {
      r.extras = {};
      await page.evaluate(() => window.__brumaluz!.vilaPatins!(true));
      await page.waitForTimeout(600);
      await escolherNaRoleta(page);
      await esperarItem(page, 'tirar-patins');
      r.extras.dePatins = await itensDaRoleta(page);
      await rolarAte(page, 'tirar-patins');
      await page.keyboard.press('Escape');
      await page.evaluate(() => window.__brumaluz!.vilaPatins!(false));
      await page.evaluate(() => window.__brumaluz!.vilaSkate?.(true));
      await page.waitForTimeout(600);
      await escolherNaRoleta(page);
      await esperarItem(page, 'guardar-skate');
      r.extras.deSkate = await itensDaRoleta(page);
      await rolarAte(page, 'guardar-skate');
      await page.keyboard.press('Escape');
    }
    resultado[tema] = r;
    console.log(`ITENS ${tema} ${JSON.stringify(r)}`);
    writeFileSync(`${PASTA}/itens-${tema}.json`, JSON.stringify(r, null, 1));
    await page.context().close();
  });
