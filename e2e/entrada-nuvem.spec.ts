import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Spec 035 (e2e): a entrada na nuvem não trava e sair da nuvem abre o mundo do aparelho.
 * - B: a página da Bia joga fora a primeira mensagem com `"primeiro":true`; a rede de
 *   segurança ressincroniza uma vez e a Bia vê a Ana em até 3 s, sem aviso de queda.
 * - B, buraco: joga fora um quadro do meio, depois do `primeiro`; a Bia continua vendo a Ana.
 * - B2: joga fora todo `primeiro`; 2 ressincronizações, 1 recarregar, e na página nova mais 2,
 *   sem um segundo recarregar.
 * - C: a Ana sai da nuvem para um mundo novo do Rancho Alegre: o endereço perde a sala.
 * O contador é lido com acesso opcional, para rodar também no código de antes (onde falham:
 * B, buraco e B2 até a T04; C até a T07).
 */
async function jogador(
  browser: Browser,
  id: string,
  apelido: string,
  descartar?: 'primeiro' | 'buraco' | 'todo-primeiro',
): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 960, height: 540 } });
  await ctx.addInitScript(
    ([i, a]) => {
      localStorage.setItem(
        'terrario:identidade',
        JSON.stringify({ id: i, chave: `chave-de-teste-${i}-0123456789abcdef`, apelido: a }),
      );
    },
    [id, apelido],
  );
  if (descartar) await ctx.addInitScript(roteiroDaBia, descartar);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log(`[${apelido}] erro: ${String(e)}`));
  return p;
}

interface Espia {
  bemvindoEm?: number;
  descartados: number;
  avisos: string[];
}

/**
 * O roteiro de início na página da Bia: o WebSocket joga fora as mensagens escolhidas, anota a
 * hora do bem-vindo e vigia o tempo todo o aviso de queda e o "Voltamos!". Conta as cargas da
 * página (o recarregar da rede de segurança) no `sessionStorage`.
 */
function roteiroDaBia(modo: 'primeiro' | 'buraco' | 'todo-primeiro') {
  const espia: Espia = { descartados: 0, avisos: [] };
  (window as unknown as { __e2e: Espia }).__e2e = espia;
  try {
    const n = Number(sessionStorage.getItem('e2e:cargas') ?? 0) + 1;
    sessionStorage.setItem('e2e:cargas', String(n));
  } catch {
    // sem sessionStorage o teste B2 não roda
  }
  let jaDescartou = false;
  let depoisDoPrimeiro = -1;
  const jogaFora = (texto: string): boolean => {
    if (texto.includes('"t":"bemvindo"')) {
      espia.bemvindoEm ??= performance.now();
      return false;
    }
    if (!texto.includes('"t":"quadro"')) return false;
    const primeiro = texto.includes('"primeiro":true');
    if (modo === 'todo-primeiro') return primeiro;
    if (modo === 'primeiro') {
      if (primeiro && !jaDescartou) return (jaDescartou = true);
      return false;
    }
    // buraco: o 20º quadro depois do primeiro (uma vez)
    if (primeiro) {
      depoisDoPrimeiro = 0;
      return false;
    }
    if (depoisDoPrimeiro < 0 || jaDescartou) return false;
    depoisDoPrimeiro++;
    if (depoisDoPrimeiro === 20) return (jaDescartou = true);
    return false;
  };
  // a conexão ouve pelo `onmessage`: ele passa a filtrar antes de entregar
  const desc = Object.getOwnPropertyDescriptor(WebSocket.prototype, 'onmessage')!;
  Object.defineProperty(WebSocket.prototype, 'onmessage', {
    configurable: true,
    enumerable: desc.enumerable,
    get(this: WebSocket) {
      return desc.get!.call(this);
    },
    set(this: WebSocket, f: ((this: WebSocket, ev: MessageEvent) => void) | null) {
      desc.set!.call(
        this,
        f
          ? function (this: WebSocket, ev: MessageEvent) {
              if (typeof ev.data === 'string' && jogaFora(ev.data)) {
                espia.descartados++;
                return;
              }
              f.call(this, ev);
            }
          : null,
      );
    },
  });
  const vigiar = () => {
    const t = document.body?.textContent ?? '';
    if (t.includes('A internet caiu') && !espia.avisos.includes('queda')) espia.avisos.push('queda');
    if (t.includes('Voltamos!') && !espia.avisos.includes('voltamos'))
      espia.avisos.push('voltamos');
  };
  new MutationObserver(vigiar).observe(document, {
    subtree: true,
    childList: true,
    characterData: true,
  });
  setInterval(vigiar, 100);
}

const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });
const ressincronizacoes = (p: Page) =>
  p.evaluate(
    () =>
      (window.__brumaluz as { ressincronizacoes?: number } | undefined)?.ressincronizacoes ?? 0,
  );
const espia = (p: Page) => p.evaluate(() => (window as unknown as { __e2e: Espia }).__e2e);
const cargas = (p: Page) =>
  p.evaluate(() => {
    try {
      return Number(sessionStorage.getItem('e2e:cargas') ?? 0);
    } catch {
      return -1;
    }
  });
const veAna = (p: Page, timeout: number) =>
  p.waitForFunction(
    () => (window.__brumaluz!.outrosJogadores?.() ?? []).some((o) => o.apelido === 'Ana'),
    null,
    { timeout },
  );

/** Ana cria um mundo do Doce Reino e leva para a nuvem (como no `multiplayer`). Devolve o código. */
async function anaNaNuvem(browser: Browser, id: string): Promise<{ ana: Page; codigo: string }> {
  const ana = await jogador(browser, id, 'Ana');
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
  const codigo = await ana
    .locator('[data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 30_000 });
  expect(codigo).toMatch(/^[A-Z]+-[A-Z]+-\d\d$/);
  await ana.keyboard.press('Escape');
  return { ana, codigo: codigo! };
}

/** Bia entra pelo link, com a Ana já na sala. */
async function biaEntra(bia: Page, codigo: string): Promise<void> {
  await bia.goto(`/?sala=${codigo}`);
  await expect(bia.locator('[data-tela-entrar] h2')).toHaveText('Entrar no mundo de Ana', {
    timeout: 60_000,
  });
  await bia.locator('[data-entrar-mundo]').click();
  await pronto(bia);
  await entrarNoJogo(bia);
}

test('B: o primeiro quadro perdido, uma ressincronização e a Bia vê a Ana em até 3 s', async ({
  browser,
}) => {
  test.setTimeout(400_000);
  const { codigo } = await anaNaNuvem(browser, 'ana-e2e-b');
  const bia = await jogador(browser, 'bia-e2e-b', 'Bia', 'primeiro');
  await biaEntra(bia, codigo);
  await veAna(bia, 20_000);
  const ate = await bia.evaluate(
    () => performance.now() - (window as unknown as { __e2e: Espia }).__e2e.bemvindoEm!,
  );
  console.log(`B: do bem-vindo da Bia até ela ver a Ana: ${Math.round(ate)} ms`);
  const e = await espia(bia);
  expect(e.descartados, 'o roteiro jogou fora o primeiro').toBe(1);
  expect(ate, 'do bem-vindo até ver a Ana (meta de 3 s)').toBeLessThan(3000);
  expect(await ressincronizacoes(bia)).toBe(1);
  // o aviso de queda e o "Voltamos!" não aparecem nunca (o roteiro vigia o tempo todo)
  await bia.waitForTimeout(2000);
  expect((await espia(bia)).avisos).toEqual([]);
});

test('B, buraco: um quadro do meio perdido, e a Bia continua vendo a Ana andar', async ({
  browser,
}) => {
  test.setTimeout(400_000);
  const { ana, codigo } = await anaNaNuvem(browser, 'ana-e2e-buraco');
  const bia = await jogador(browser, 'bia-e2e-buraco', 'Bia', 'buraco');
  await biaEntra(bia, codigo);
  await veAna(bia, 30_000);
  await bia.waitForFunction(
    () => (window as unknown as { __e2e: Espia }).__e2e.descartados === 1,
    null,
    { timeout: 20_000 },
  );
  // a Ana anda de lado; a Bia vê a posição dela mudar depois do buraco
  await ana.evaluate(() => window.__brumaluz!.apontar!(0, 0.3));
  await ana.keyboard.down('KeyD');
  await bia.waitForTimeout(2500);
  const posAna = () =>
    bia.evaluate(() => {
      const a = (window.__brumaluz!.outrosJogadores?.() ?? []).find((o) => o.apelido === 'Ana');
      return a ? { x: a.x, z: a.z } : null;
    });
  const p1 = await posAna();
  await bia.waitForTimeout(1500);
  const p2 = await posAna();
  await ana.keyboard.up('KeyD');
  console.log(`B buraco: a Ana vista pela Bia ${JSON.stringify(p1)} → ${JSON.stringify(p2)}`);
  expect(p1).not.toBeNull();
  expect(p2).not.toBeNull();
  expect(Math.hypot(p2!.x - p1!.x, p2!.z - p1!.z), 'a Bia vê a Ana andar').toBeGreaterThan(0.5);
  expect(await ressincronizacoes(bia)).toBe(1);
  expect((await espia(bia)).avisos).toEqual([]);
});

test('B2: nada se acerta, 2 ressincronizações, 1 recarregar e mais 2, sem outro recarregar', async ({
  browser,
}) => {
  test.setTimeout(400_000);
  const { codigo } = await anaNaNuvem(browser, 'ana-e2e-b2');
  const bia = await jogador(browser, 'bia-e2e-b2', 'Bia', 'todo-primeiro');
  await biaEntra(bia, codigo);
  const antes = await cargas(bia);
  expect(antes, 'o sessionStorage funciona').toBeGreaterThan(0);
  // a página recarrega uma vez (depois da segunda ressincronização)
  await bia.waitForFunction(
    (n) => Number(sessionStorage.getItem('e2e:cargas') ?? 0) === n + 1,
    antes,
    { timeout: 40_000 },
  );
  await pronto(bia);
  await bia.waitForFunction(
    () =>
      ((window.__brumaluz as { ressincronizacoes?: number } | undefined)?.ressincronizacoes ??
        0) >= 2,
    null,
    { timeout: 30_000 },
  );
  // e não recarrega de novo (a marca de 10 min)
  await bia.waitForTimeout(10_000);
  expect(await cargas(bia), 'um recarregar só').toBe(antes + 1);
  expect(await ressincronizacoes(bia), 'na página nova, 2 ressincronizações').toBe(2);
});

test('C: sair da nuvem para um mundo do aparelho, e de lá para outro', async ({ browser }) => {
  test.setTimeout(400_000);
  const { ana, codigo } = await anaNaNuvem(browser, 'ana-e2e-c');
  // na lista, o mundo desta sala mostra "Continuar"
  await ana.locator('[data-abrir-mundos]').click();
  const daSala = ana.locator('.cartao-mundo-item', {
    has: ana.locator('.chip.codigo', { hasText: codigo }),
  });
  // (suave: o resto do teste mostra também para onde a criança vai)
  await expect
    .soft(daSala.locator('button.primario'), 'o mundo desta sala mostra "Continuar"')
    .toHaveText('Continuar', { timeout: 10_000 });
  // dali, cria um mundo do Rancho Alegre
  await ana.locator('.cartao-tema[data-tema="rancho-alegre"]').click();
  await ana.locator('button[data-modo="criativo"]').click();
  await ana.locator('[data-novo-nome]').fill('Rancho da Ana');
  const naSala = ana.url();
  await ana.locator('[data-criar-mundo]').click();
  await ana.waitForURL((u) => u.toString() !== naSala, { timeout: 60_000 });
  await pronto(ana);
  const p = new URL(ana.url()).searchParams;
  expect(p.get('mundo')).toBeTruthy();
  expect(p.has('sala'), 'sem sala no endereço').toBe(false);
  expect(p.has('novo')).toBe(false);
  expect(p.has('direto')).toBe(false);
  // o mundo que abriu é o do aparelho: sem o botão dos amigos (só existe na nuvem)
  await ana.waitForTimeout(1500);
  await expect(ana.locator('[data-botao-amigos]')).toHaveCount(0);
  const rancho = p.get('mundo')!;
  // de volta à lista, "Jogar" num terceiro mundo do aparelho também abre ele
  await entrarNoJogo(ana);
  await ana.locator('[data-abrir-mundos]').click();
  const terceiro = ana
    .locator('.cartao-mundo-item:not(.atual)', { hasNot: ana.locator('.chip.codigo') })
    .first();
  const idTerceiro = await terceiro.getAttribute('data-mundo');
  expect(idTerceiro).toBeTruthy();
  expect(idTerceiro).not.toBe(rancho);
  await terceiro.locator('button.primario').click();
  await ana.waitForURL((u) => u.searchParams.get('mundo') === idTerceiro, { timeout: 60_000 });
  await pronto(ana);
  expect(new URL(ana.url()).searchParams.has('sala')).toBe(false);
  await expect(ana.locator('[data-botao-amigos]')).toHaveCount(0);
});
