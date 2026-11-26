import { expect, test, type Browser, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * Conserto da 037 (olhar para baixo de dentro), com amigos: o corpo e a cabeça que somem de dentro
 * são os da própria criança, achados na raiz dela, e nunca os de um amigo (os dois bonecos usam o
 * mesmo prefixo "personagem"; uma busca pelo nome na cena podia pegar o do amigo).
 *
 * Duas crianças no servidor local: a Ana leva o mundo para a nuvem e a Bia entra pelo código. A
 * Ana troca de roupa depois de a Bia chegar (o boneco dela é refeito: as juntas dela passam a vir
 * depois das da Bia na cena) e entra na primeira pessoa olhando para a Bia: a Ana vê a Bia
 * inteira, com cabeça e corpo, e não vê o próprio corpo.
 *
 *   E2E_ENV="-u 1000:1000 -e HOME=/tmp" scripts/e2e-gpu.sh e2e/olhar-baixo-amigos-037.spec.ts --workers 1 --trace off
 */
async function jogador(browser: Browser, id: string, apelido: string): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem('terrario:identidade', JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }));
    },
    [id, apelido],
  );
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}
const pronto = (p: Page) => p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });

test('com uma amiga na sala: de dentro, a Ana vê a Bia inteira e não vê o próprio corpo', async ({ browser }) => {
  test.setTimeout(600_000);
  const ana = await jogador(browser, 'ana-olhar', 'Ana');
  await ana.goto('/');
  await pronto(ana);
  await ana.locator('[data-abrir-mundos]').click();
  await ana.locator('.cartao-tema[data-tema="doce-reino"]').click();
  await ana.locator('button[data-modo="criativo"]').click();
  await ana.locator('[data-novo-nome]').fill('Mundo da Ana');
  await ana.locator('[data-criar-mundo]').click();
  await ana.waitForURL(/mundo=/);
  await pronto(ana);
  await entrarNoJogo(ana);
  await ana.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
  await ana.locator('[data-abrir-para-amigos]').click();
  await ana.waitForURL(/sala=/, { timeout: 60_000 });
  await pronto(ana);
  await entrarNoJogo(ana);
  const codigo = await ana.locator('[data-codigo-mundo]').getAttribute('data-codigo-mundo', { timeout: 30_000 });
  await ana.keyboard.press('Escape');

  const bia = await jogador(browser, 'bia-olhar', 'Bia');
  await bia.goto(`/?sala=${codigo}`);
  await bia.locator('[data-entrar-mundo]').click({ timeout: 60_000 });
  await pronto(bia);
  await entrarNoJogo(bia);
  await ana.waitForFunction(() => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Bia'), null, { timeout: 30_000 });

  // a Bia fica três passos à frente da Ana (+z), de frente para ela
  const [ax, ay, az] = await ana.evaluate(() => window.__brumaluz!.posicao!);
  await bia.evaluate(
    ([x, y, z]) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x, z + 3, y - 1.62);
      e.apontar!(Math.PI, 0.1);
    },
    [ax, ay, az] as const,
  );
  await ana.waitForFunction(
    (az) => {
      const b = (window.__brumaluz!.outrosJogadores?.() ?? []).find((o) => o.apelido === 'Bia');
      return !!b && Math.abs(b.z - (az + 3)) < 0.6;
    },
    az,
    { timeout: 30_000 },
  );
  // a Ana troca de roupa (o boneco dela é refeito depois do da Bia) e entra na primeira pessoa,
  // olhando para a Bia
  await ana.evaluate(() => {
    const e = window.__brumaluz!;
    e.personagem!.definir({ roupaCor: (e.personagem!.aparencia().roupaCor + 1) % 4 });
    e.apontar!(0, 0.15);
    e.primeiraPessoa!.ligar(true);
  });
  await ana.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.fracao() >= 1, undefined, { timeout: 15_000 });
  await ana.waitForTimeout(800);
  /** Os dois bonecos "personagem" na tela da Ana: quem é quem pelo lugar, e o que está aceso. */
  const ver = () =>
    ana.evaluate(() => {
      const e = window.__brumaluz!;
      const cena = e.cenaBabylon!();
      const [px, , pz] = e.posicao!;
      const bia = (e.outrosJogadores?.() ?? []).find((o) => o.apelido === 'Bia')!;
      const corpos = cena.transformNodes.filter((n) => n.name === 'personagem-junta-corpo');
      return corpos.map((corpo) => {
        corpo.computeWorldMatrix(true);
        const p = corpo.getAbsolutePosition();
        const deQuem = Math.hypot(p.x - px, p.z - pz) < Math.hypot(p.x - bia.x, p.z - bia.z) ? 'ana' : 'bia';
        const cabeca = corpo.getChildTransformNodes(false, (n) => n.name === 'personagem-junta-cabeca')[0];
        const malhas = corpo.getChildMeshes(false).filter((m) => m.isEnabled() && m.isVisible && m.getTotalVertices() > 0).length;
        return { deQuem, corpo: corpo.isEnabled(), cabeca: !!cabeca && cabeca.isEnabled(), malhas };
      });
    });
  const dentro = await ver();
  mkdirSync('capturas-037/olhar-baixo', { recursive: true });
  await ana.screenshot({ path: 'capturas-037/olhar-baixo/amigos-ana-de-dentro-vendo-a-bia.png' });
  // olhando para baixo também (o corpo dela continua escondido; a Bia continua inteira)
  await ana.evaluate(() => window.__brumaluz!.apontar!(0, 1.2));
  await ana.waitForTimeout(500);
  const baixo = await ver();
  // e, de volta para fora, a Ana volta inteira
  await ana.evaluate(() => window.__brumaluz!.primeiraPessoa!.ligar(false));
  await ana.waitForFunction(() => window.__brumaluz!.primeiraPessoa!.fracao() <= 0, undefined, { timeout: 15_000 });
  await ana.waitForTimeout(300);
  const fora = await ver();
  console.log(`amigos: ${JSON.stringify({ dentro, baixo, fora })}`);
  await ana.context().close();
  await bia.context().close();
  for (const visto of [dentro, baixo]) {
    expect(visto.map((v) => v.deQuem).sort()).toEqual(['ana', 'bia']);
    const daBia = visto.find((v) => v.deQuem === 'bia')!;
    const daAna = visto.find((v) => v.deQuem === 'ana')!;
    expect(daBia.corpo && daBia.cabeca, 'a Bia inteira, com cabeça e corpo').toBe(true);
    expect(daBia.malhas).toBeGreaterThan(5);
    expect(daAna.corpo, 'o corpo da Ana some de dentro').toBe(false);
  }
  for (const v of fora) expect(v.corpo && v.cabeca, `fora, ${v.deQuem} inteira`).toBe(true);
});
