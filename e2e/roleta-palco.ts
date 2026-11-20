import { expect, type Page } from '@playwright/test';

/**
 * Spec 033: a roleta do menu (src/ui/roleta.ts) nos testes. Só 5 a 7 botões existem de cada
 * vez, então escolher um item é como a criança faz: tocar no vizinho até ele chegar no meio e
 * tocar no meio. No celular é toque de verdade; no computador, clique.
 */

export const ROLETA = '[data-roleta]';
export const ROLETA_ABERTA = '[data-roleta].aberta';

const modulo = (i: number, n: number) => ((i % n) + n) % n;

/** Os ids da lista aberta (a inteira, não só os botões à vista); vazia se fechada. */
export function itensDaRoleta(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLElement>('[data-roleta].aberta');
    return el ? (el.dataset.itens ?? '').split(' ').filter(Boolean) : [];
  });
}

/** O id do item no meio agora ('' se fechada). */
export function meioDaRoleta(page: Page): Promise<string> {
  return page.evaluate(
    () => document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.meio ?? '',
  );
}

/** A roleta está aberta? */
export function roletaAberta(page: Page): Promise<boolean> {
  return page.evaluate(() => !!document.querySelector('[data-roleta].aberta'));
}

/** Espera a fileira assentar (sem arraste e sem animação). */
export async function esperarAssentar(page: Page): Promise<void> {
  await page.waitForFunction(
    () => document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.parada !== undefined,
    undefined,
    { timeout: 10_000 },
  );
}

async function ehToque(page: Page): Promise<boolean> {
  return page.evaluate(() => matchMedia('(pointer: coarse)').matches);
}

/**
 * Spec 034 (T14): um toque (ou clique) rápido de verdade no meio do elemento, que não depende
 * do relógio da máquina. A roleta trata como toque o que leva menos de 600 ms entre encostar e
 * soltar, e o botão da roda abre os gestos quando o dedo fica 450 ms (`performance.now` e
 * `setTimeout` da página). O `tap()` e o `click()` do Playwright mandam o encostar e o soltar
 * em mensagens separadas: com o navegador carregado (a nuvem, sem placa de vídeo, a 1 quadro
 * por segundo), o soltar chegava mais de 600 ms depois, o toque virava "arraste parado" (a
 * fileira não andava) ou "segurar" (abria os gestos no lugar do menu). Aqui a sequência inteira
 * (pointerdown, touchstart, pointerup, touchend, e o clique de compatibilidade se ninguém o
 * cancelou; no mouse, mousedown, mouseup e click) sai num passo só, no elemento que está de
 * fato por cima naquele ponto (como o dedo acharia), e quem o jogo escolhe é o mesmo de um
 * toque de verdade. Se outro elemento tapa o ponto, o teste cai aqui.
 */
export async function toqueRapido(page: Page, seletor: string): Promise<void> {
  const el = page.locator(seletor).first();
  await el.waitFor({ state: 'visible', timeout: 20_000 });
  await el.scrollIntoViewIfNeeded();
  const toque = await ehToque(page);
  const r = await el.evaluate((alvo: Element, toque: boolean) => {
    const c = alvo.getBoundingClientRect();
    const x = c.left + c.width / 2;
    const y = c.top + c.height / 2;
    const topo = document.elementFromPoint(x, y);
    if (!topo || !(topo === alvo || alvo.contains(topo)))
      return `tapado por ${topo ? (topo as HTMLElement).outerHTML.slice(0, 120) : 'nada'}`;
    const base = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y };
    const ponteiro = {
      ...base,
      pointerId: toque ? 7 : 1,
      pointerType: toque ? 'touch' : 'mouse',
      isPrimary: true,
      button: 0,
    };
    topo.dispatchEvent(new PointerEvent('pointerdown', { ...ponteiro, buttons: 1 }));
    let compat = true;
    if (toque) {
      const t = new Touch({ identifier: 7, target: topo, clientX: x, clientY: y });
      topo.dispatchEvent(
        new TouchEvent('touchstart', {
          ...base,
          touches: [t],
          targetTouches: [t],
          changedTouches: [t],
        }),
      );
      topo.dispatchEvent(new PointerEvent('pointerup', { ...ponteiro, buttons: 0 }));
      compat = topo.dispatchEvent(
        new TouchEvent('touchend', {
          ...base,
          touches: [],
          targetTouches: [],
          changedTouches: [t],
        }),
      );
    } else {
      topo.dispatchEvent(
        new MouseEvent('mousedown', { ...base, button: 0, buttons: 1, detail: 1 }),
      );
      if (topo instanceof HTMLElement) topo.focus({ preventScroll: true });
      topo.dispatchEvent(new PointerEvent('pointerup', { ...ponteiro, buttons: 0 }));
      topo.dispatchEvent(new MouseEvent('mouseup', { ...base, button: 0, detail: 1 }));
    }
    if (compat) topo.dispatchEvent(new MouseEvent('click', { ...base, button: 0, detail: 1 }));
    return '';
  }, toque);
  if (r) throw new Error(`o toque em ${seletor} não chegou: ${r}`);
}

/** Toca (ou clica) num seletor, à vista. */
async function tocarSeletor(page: Page, seletor: string): Promise<void> {
  await toqueRapido(page, seletor);
}

/** Abre o menu pelo botão de cima (se ainda fechado). */
export async function abrirRoleta(page: Page): Promise<void> {
  if (await roletaAberta(page)) return;
  await tocarSeletor(page, '[data-botao-roda]');
  await page.waitForSelector(ROLETA_ABERTA, { timeout: 10_000 });
  await esperarAssentar(page);
}

/** Rola até `id` ficar no meio, tocando no vizinho do lado mais curto. */
export async function rolarAte(page: Page, id: string): Promise<void> {
  const itens = await itensDaRoleta(page);
  const n = itens.length;
  const i = itens.indexOf(id);
  if (i < 0) throw new Error(`a roleta não tem "${id}" (tem: ${itens.join(', ')})`);
  for (let volta = 0; volta <= n; volta++) {
    await esperarAssentar(page);
    const meio = await meioDaRoleta(page);
    if (meio === id) return;
    const m = itens.indexOf(meio);
    const d = modulo(i - m, n);
    const lado = d <= n / 2 ? 1 : -1;
    const vizinho = itens[modulo(m + lado, n)];
    await tocarSeletor(page, `${ROLETA_ABERTA} .item[data-item="${vizinho}"]`);
    await page.waitForFunction(
      (v) => document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.meio === v,
      vizinho,
      { timeout: 10_000 },
    );
  }
  throw new Error(`a roleta não chegou em "${id}"`);
}

/** Toca no item do meio (escolhe). */
export async function tocarNoMeio(page: Page): Promise<void> {
  await esperarAssentar(page);
  await tocarSeletor(page, `${ROLETA_ABERTA} .item.meio`);
}

/**
 * Abre o menu (se fechado) e escolhe o caminho: `escolherNaRoleta(page, 'mapa')`, ou
 * `escolherNaRoleta(page, 'gestos', 'dancar')` (entra em Gestos e escolhe Dançar).
 */
export async function escolherNaRoleta(page: Page, ...caminho: string[]): Promise<void> {
  await abrirRoleta(page);
  for (let k = 0; k < caminho.length; k++) {
    await rolarAte(page, caminho[k]);
    await tocarNoMeio(page);
    const prox = caminho[k + 1];
    if (prox)
      await page.waitForFunction(
        (p) =>
          (document.querySelector<HTMLElement>('[data-roleta].aberta')?.dataset.itens ?? '')
            .split(' ')
            .includes(p),
        prox,
        { timeout: 10_000 },
      );
  }
}

/**
 * No computador, pelo teclado (com o menu já aberto): as setas andam até `id` pelo lado mais
 * curto e Enter escolhe. Serve com o mouse preso na câmera.
 */
export async function escolherPeloTeclado(page: Page, id: string): Promise<void> {
  await page.waitForSelector(ROLETA_ABERTA, { timeout: 10_000 });
  const itens = await itensDaRoleta(page);
  const n = itens.length;
  const i = itens.indexOf(id);
  if (i < 0) throw new Error(`a roleta não tem "${id}" (tem: ${itens.join(', ')})`);
  await esperarAssentar(page);
  const m = itens.indexOf(await meioDaRoleta(page));
  const d = modulo(i - m, n);
  const passos = d <= n / 2 ? d : d - n;
  for (let k = 0; k < Math.abs(passos); k++)
    await page.keyboard.press(passos > 0 ? 'ArrowRight' : 'ArrowLeft');
  await esperarAssentar(page);
  await expect.poll(() => meioDaRoleta(page)).toBe(id);
  await page.keyboard.press('Enter');
}

/** A plaquinha de sair: "Voltar" dentro de uma lista, "Fechar" na de cima. */
export async function tocarNaPlaquinha(page: Page): Promise<void> {
  // a plaquinha ignora o toque logo que aparece (o mesmo toque que abriu a lista cairia nela)
  await page.waitForTimeout(500);
  await tocarSeletor(page, `${ROLETA_ABERTA} .voltar.ativo`);
}

/** Confere que a lista aberta tem (ou não tem) o item. */
export async function esperarItem(page: Page, id: string, tem = true): Promise<void> {
  await expect.poll(async () => (await itensDaRoleta(page)).includes(id)).toBe(tem);
}
