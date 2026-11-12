import { expect, test, type Page } from '@playwright/test';

/**
 * A trilha gravada no iPhone (spec 019, T03): abre um mundo, toca a música, troca de mundo
 * duas vezes pelo painel e confere que, a cada saída, a música do tema foi solta (nenhum
 * clipe aberto nem pacote guardado). Roda no WebKit com um iPhone emulado
 * (scripts/e2e-webkit.sh, sem a ponte da placa de vídeo). No Chromium de mesa o toque no fundo
 * do título entra no jogo (não é toque), então lá ele fica de fora.
 */
test.skip(({ browserName }) => browserName !== 'webkit', 'só no iPhone emulado (WebKit)');
const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 240_000 });

const info = (page: Page) => page.evaluate(() => window.__brumaluz!.trilha!.info());

interface Saida {
  tema: string;
  antes: { abertos: number; bytesDecodificados: number; bytesBaixados: number };
  depois: { abertos: number; bytesDecodificados: number; bytesBaixados: number };
}

/** Liga o som e espera a música tocar (ou, sem áudio no navegador de teste, abre tudo). */
async function tocar(page: Page): Promise<{ gravada: boolean; mb: number; kb: number }> {
  // um toque no fundo do título é gesto (liga o som) e, no toque, não entra no jogo nem
  // abre painel (só o botão Jogar entra)
  await page.locator('.entrada').click({ position: { x: 4, y: 4 }, timeout: 20_000 });
  const estado = await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 15_000 })
    .toMatch(/^(ativo|bloqueado)$/)
    .then(() => page.evaluate(() => window.__brumaluz!.audio!.estado));
  let gravada = false;
  if (estado === 'ativo') {
    await expect.poll(async () => (await info(page)).gravada, { timeout: 120_000 }).toBe(true);
    gravada = true;
  }
  // o pior caso do tema: tudo aberto
  await page.evaluate(() => window.__brumaluz!.trilha!.abrirTudo());
  const m = (await info(page)).medidas;
  expect(m.abertos).toBe(m.total);
  return { gravada, mb: m.picoDecodificados / 1048576, kb: m.bytesBaixados / 1024 };
}

async function saidaAnterior(page: Page): Promise<Saida> {
  const s = await page.evaluate(() => sessionStorage.getItem('terrario:trilha-saida'));
  expect(s).not.toBeNull();
  return JSON.parse(s!) as Saida;
}

test('trocar de mundo solta a música do tema (duas vezes)', async ({ page }, ti) => {
  test.setTimeout(900_000);
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  await page.goto('/');
  await expect(page.locator('.entrada')).toBeVisible({ timeout: 180_000 });
  await pronto(page);
  const medidas: unknown[] = [];
  medidas.push({ mundo: 1, ...(await tocar(page)) });

  // 1ª troca: cria um mundo novo pelo painel (a página vai para o endereço dele)
  await page.locator('[data-abrir-mundos]').click({ timeout: 30_000 });
  await page.locator('[data-novo-nome]').fill('Ilha da música');
  await page.locator('[data-criar-mundo]').click();
  await page.waitForURL(/mundo=/);
  await pronto(page);
  const s1 = await saidaAnterior(page);
  expect(s1.antes.abertos).toBeGreaterThan(0);
  expect(s1.depois).toMatchObject({ abertos: 0, bytesDecodificados: 0, bytesBaixados: 0 });
  medidas.push({ mundo: 2, ...(await tocar(page)) });

  // 2ª troca: volta ao primeiro mundo
  await page.evaluate(() => sessionStorage.removeItem('terrario:trilha-saida'));
  await page.locator('[data-abrir-mundos]').click({ timeout: 30_000 });
  await page
    .locator('[data-painel-mundos] [data-mundo]', { hasText: 'Meu primeiro mundo' })
    .getByRole('button', { name: 'Jogar', exact: true })
    .click();
  await expect(page.locator('[data-mundo-atual]')).toContainText('Meu primeiro mundo', {
    timeout: 180_000,
  });
  await pronto(page);
  const s2 = await saidaAnterior(page);
  expect(s2.antes.abertos).toBeGreaterThan(0);
  expect(s2.depois).toMatchObject({ abertos: 0, bytesDecodificados: 0, bytesBaixados: 0 });
  // o mundo novo começa sem nada da música aberto (só abre quando o som liga)
  expect((await info(page)).medidas.abertos).toBe(0);

  await ti.attach('trilha-iphone', {
    body: JSON.stringify({ medidas, saidas: [s1, s2] }, null, 2),
    contentType: 'application/json',
  });
  console.log(JSON.stringify({ medidas, saidas: [s1, s2] }));
  for (const m of medidas as { mb: number; kb: number }[]) {
    expect(m.mb).toBeLessThan(15);
    expect(m.kb).toBeLessThan(2048);
  }
  expect(erros, erros.join('\n')).toEqual([]);
});
