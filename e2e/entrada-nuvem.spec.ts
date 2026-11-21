import { expect, test, type Browser, type Page } from '@playwright/test';

/**
 * Spec 035 (e2e): a entrada na nuvem não trava e sair da nuvem abre o mundo do aparelho.
 * - B: a página da Bia joga fora a primeira mensagem com `"primeiro":true`; a rede de
 *   segurança ressincroniza uma vez e a Bia vê a Ana em até 3 s, sem aviso de queda.
 * - B, buraco: joga fora um quadro do meio, depois do `primeiro`; a Bia continua vendo a Ana.
 * - B2: joga fora todo `primeiro`; 2 ressincronizações, 1 recarregar, e na página nova mais 2,
 *   sem um segundo recarregar.
 * - C: a Ana sai da nuvem para um mundo novo do Rancho Alegre: o endereço perde a sala.
 * - D (T08): a internet da Bia cai, a Ana põe e tira um bloco, e a Bia volta vendo os dois
 *   (os blocos da volta, na cena de verdade).
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
  /** Quando a cena ficou pronta (o `ready`). */
  prontoEm?: number;
  /** A hora de cada bem-vindo e de cada mensagem jogada fora (para ver onde vai o tempo). */
  linha: string[];
  descartados: number;
  avisos: string[];
}

/**
 * O roteiro de início na página da Bia: o WebSocket joga fora as mensagens escolhidas, anota a
 * hora do bem-vindo e vigia o tempo todo o aviso de queda e o "Voltamos!". Conta as cargas da
 * página (o recarregar da rede de segurança) no `sessionStorage`.
 */
function roteiroDaBia(modo: 'primeiro' | 'buraco' | 'todo-primeiro') {
  const espia: Espia = { descartados: 0, avisos: [], linha: [] };
  const marcar = (o: string) => espia.linha.push(`${Math.round(performance.now())} ${o}`);
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
      marcar('bem-vindo');
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
                marcar('jogou fora');
                return;
              }
              f.call(this, ev);
            }
          : null,
      );
    },
  });
  let viuPronto = false;
  let viuRessinc = 0;
  const vigiar = () => {
    const d = (window as { __brumaluz?: { ready?: boolean; ressincronizacoes?: number } })
      .__brumaluz;
    if (d?.ready && !viuPronto) {
      viuPronto = true;
      espia.prontoEm = performance.now();
      marcar('pronto');
    }
    if ((d?.ressincronizacoes ?? 0) > viuRessinc) {
      viuRessinc = d!.ressincronizacoes!;
      marcar(`ressincronização ${viuRessinc}`);
    }
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

/**
 * D: a página da Bia pode perder a internet de verdade. `cortar()` fecha a conexão aberta, e
 * as tentativas de voltar vão para uma porta fechada (falham na hora) até o `voltar()`.
 */
function redeDaBia() {
  const Original = window.WebSocket;
  let semRede = false;
  const abertas: WebSocket[] = [];
  class ComRede extends Original {
    constructor(url: string | URL, protocolos?: string | string[]) {
      super(semRede ? 'ws://127.0.0.1:9/' : url, protocolos);
      abertas.push(this);
    }
  }
  window.WebSocket = ComRede;
  (window as unknown as { __e2eRede: { cortar(): void; voltar(): void } }).__e2eRede = {
    cortar() {
      semRede = true;
      for (const s of abertas.splice(0)) if (s.readyState <= Original.OPEN) s.close();
    },
    voltar() {
      semRede = false;
    },
  };
}

const pronto = (p: Page) =>
  p.waitForFunction(() => window.__brumaluz?.ready, null, { timeout: 180_000 });
const entrarNoJogo = (p: Page) =>
  p.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });
/** A tela de título (com o botão "Mundos") de volta, como quem pausa o jogo, e a lista aberta. */
const abrirLista = async (p: Page) => {
  await p.evaluate(() => document.querySelector('.entrada')?.removeAttribute('hidden'));
  await p.locator('[data-abrir-mundos]').click({ timeout: 20_000 });
};
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
  const [ate, depoisDoPronto] = await bia.evaluate(() => {
    const es = (window as unknown as { __e2e: Espia }).__e2e;
    const t = performance.now();
    return [t - es.bemvindoEm!, t - (es.prontoEm ?? es.bemvindoEm!)];
  });
  console.log(
    `B: do bem-vindo da Bia até ela ver a Ana: ${Math.round(ate)} ms ` +
      `(depois do mundo pronto: ${Math.round(depoisDoPronto)} ms)`,
  );
  const e = await espia(bia);
  console.log(`B: a linha do tempo da Bia (ms da página): ${e.linha.join(' | ')}`);
  expect(e.descartados, 'o roteiro jogou fora o primeiro').toBe(1);
  // A meta de 3 s conta a partir do mundo pronto: do bem-vindo ao pronto, a montagem da cena
  // sozinha leva uns 5 s nesta máquina (a linha do tempo mostra; a página só trata as mensagens
  // quando a montagem solta). A rede de segurança, do quadro jogado fora ao bem-vindo novo,
  // leva uns 200 ms.
  expect(depoisDoPronto, 'do mundo pronto até ver a Ana (meta de 3 s)').toBeLessThan(3000);
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
  const propria = () => ana.evaluate(() => [...window.__brumaluz!.posicao!]);
  const a1 = await propria();
  const p1 = await posAna();
  await bia.waitForTimeout(1500);
  const p2 = await posAna();
  const a2 = await propria();
  await ana.keyboard.up('KeyD');
  console.log(`B buraco: a Ana vista pela Bia ${JSON.stringify(p1)} → ${JSON.stringify(p2)}`);
  // a prova vale só se a Ana andou mesmo
  expect(Math.hypot(a2[0] - a1[0], a2[2] - a1[2]), 'a Ana anda na tela dela').toBeGreaterThan(0.5);
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
  await abrirLista(ana);
  const daSala = ana.locator('.cartao-mundo-item', {
    has: ana.locator('.chip.codigo', { hasText: codigo }),
  });
  // (suave: o resto do teste mostra também para onde a criança vai)
  await expect
    .soft(daSala.locator('button.primario'), 'o mundo desta sala mostra "Continuar"')
    .toHaveText('Continuar', { timeout: 10_000 });
  // na entrada normal, sozinha na sala, a rede de segurança não ressincronizou
  expect(await ressincronizacoes(ana), 'a Ana não ressincronizou').toBe(0);
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
  await abrirLista(ana);
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

test('D: a Bia cai, a Ana põe e tira um bloco, e a Bia volta vendo os dois', async ({
  browser,
}) => {
  test.setTimeout(400_000);
  const { ana, codigo } = await anaNaNuvem(browser, 'ana-e2e-d');
  const bia = await jogador(browser, 'bia-e2e-d', 'Bia');
  await bia.context().addInitScript(redeDaBia);
  await biaEntra(bia, codigo);
  await veAna(bia, 30_000);
  expect(await ressincronizacoes(bia), 'na entrada, nenhuma ressincronização').toBe(0);
  // perto da Ana: um bloco para tirar e, ao lado, um lugar vazio para pôr
  const cels = await ana.evaluate(() => {
    const e = window.__brumaluz!;
    const [x, y, z] = e.posicao!.map(Math.floor);
    for (let yy = y; yy > y - 6; yy--)
      if (e.bloco!(x + 1, yy, z) !== 0 && e.bloco!(x + 2, yy + 1, z) === 0)
        return { tirar: { x: x + 1, y: yy, z }, por: { x: x + 2, y: yy + 1, z } };
    return null;
  });
  expect(cels).not.toBeNull();
  const { tirar, por } = cels!;
  const naBia = () =>
    bia.evaluate(
      ([t, p]) => ({
        tirar: window.__brumaluz!.bloco!(t.x, t.y, t.z),
        por: window.__brumaluz!.bloco!(p.x, p.y, p.z),
      }),
      [tirar, por] as const,
    );
  const antes = await naBia();
  expect(antes.tirar, 'a Bia vê o bloco que a Ana vai tirar').not.toBe(0);
  expect(antes.por).toBe(0);

  // a internet da Bia cai (o aviso de queda aparece)
  await bia.evaluate(() =>
    (window as unknown as { __e2eRede: { cortar(): void } }).__e2eRede.cortar(),
  );
  await expect(bia.locator('body')).toContainText('A internet caiu', { timeout: 10_000 });
  // com a Bia fora, a Ana tira um bloco e põe outro
  await ana.evaluate(
    ([t, p]) => {
      const e = window.__brumaluz!;
      e.definirBloco!(t.x, t.y, t.z, 0);
      e.definirBloco!(p.x, p.y, p.z, 7);
    },
    [tirar, por] as const,
  );
  await ana.waitForTimeout(2000);
  expect(await naBia(), 'fora, a Bia ainda não viu nada').toEqual(antes);

  // a internet volta: a Bia reconecta sozinha e vê o que a Ana fez
  const t0 = Date.now();
  await bia.evaluate(() =>
    (window as unknown as { __e2eRede: { voltar(): void } }).__e2eRede.voltar(),
  );
  await bia.waitForFunction(
    ([t, p]) =>
      window.__brumaluz!.bloco!(t.x, t.y, t.z) === 0 &&
      window.__brumaluz!.bloco!(p.x, p.y, p.z) === 7,
    [tirar, por] as const,
    { timeout: 30_000 },
  );
  console.log(`D: da volta da internet até a Bia ver os blocos: ${Date.now() - t0} ms`);
  // o dono do bloco posto, na Bia, é o mesmo que na Ana (a Ana também é a dona do mundo, então
  // o bloco sem dono na tabela daria o mesmo: o dono de outro jogador é o teste de unidade,
  // tests/cliente/blocosDaVolta.test.ts)
  const anaId = await ana.evaluate(() => window.__brumaluz!.voce);
  const donoNaAna = await ana.evaluate((p) => window.__brumaluz!.donoDoBloco!(p.x, p.y, p.z), por);
  expect(donoNaAna).toBe(anaId);
  expect(
    await bia.evaluate((p) => window.__brumaluz!.donoDoBloco!(p.x, p.y, p.z), por),
    'o dono do bloco posto, na Bia',
  ).toBe(donoNaAna);
  await veAna(bia, 10_000);
  await bia.screenshot({ path: 'test-results/screens/entrada-nuvem-d-bia-volta.png' });
  console.log(`D: ressincronizações da Bia depois da queda: ${await ressincronizacoes(bia)}`);
});
