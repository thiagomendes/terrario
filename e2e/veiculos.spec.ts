import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PASTA_CAPTURAS } from '../playwright.config';

/**
 * Spec 014, T14 e T15: os carrinhos e ônibus da Cidade Grande no jogo de verdade.
 *
 * - **Só nas pistas:** um minuto inteiro de veículos andando; a cada quadro desenhado, cada
 *   canto da caixa e cada roda de cada veículo caem numa célula de pista (asfalto, faixa,
 *   zebra ou a vaga). E os motores tocam (o pacote dos veículos chegou e os mais perto soam).
 * - **Duas telas, os mesmos veículos:** duas crianças no mesmo mundo da nuvem (o servidor de
 *   salas de verdade) veem cada veículo no mesmo lugar.
 * - **Régua da rua** (VEICULOS_REGUA=1): grava o som do jogo na calçada da praça com e sem os
 *   veículos (PCM em `<pasta>/regua-*.pcm`; o LUFS sai do ffmpeg fora daqui).
 * - **Capturas e vídeos** (VEICULOS_CAPTURAS=1): cada veículo de dia e de noite, no computador e
 *   no celular; o ônibus no ponto com a porta aberta; o sorvete na vaga com uma criança perto; a
 *   polícia passando na praça; um carro parado para a criança na zebra; vídeos do trânsito com
 *   o som gravado do jogo ao lado.
 *
 * Câmera fixa das capturas: atrás e ao lado do veículo, por cima da outra mão da rua, conferida
 * livre de blocos no caminho até o veículo; a cena é recortada com a vista dela (6b32d1e). A
 * criança voa bem acima do veículo (o desenho perto e o som cheio), sem segurar o veículo.
 */
declare const process: { env: Record<string, string | undefined> };
test.setTimeout(900_000);

const PASTA = process.env.VEICULOS_PASTA ?? `${PASTA_CAPTURAS}/veiculos`;
type V3 = [number, number, number];
interface Na {
  id: number;
  tipo: string;
  x: number;
  z: number;
  yaw: number;
  s: number;
  v: number;
  a: number;
  k?: string;
  ativo: boolean;
  visivel: boolean;
  perto: boolean;
}

const IPHONE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
};

async function configurar(ctx: BrowserContext | Page) {
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 3, mostrarFps: false, mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
}

/** Prepara a câmera fixa (segue um veículo ou fica num ponto) e o recorte com a vista dela. */
async function prepararCamera(page: Page) {
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const w = window as unknown as {
      __camFixa: { p: number[]; a: number[] } | null;
      __seguir: { id: number; f: number; l: number; y: number; ay: number; af: number } | null;
    };
    w.__camFixa = null;
    w.__seguir = null;
    const scene = e.cenaBabylon!();
    const H = e.cidade!()!.h + 1;
    scene.onBeforeCameraRenderObservable.add((c) => {
      let f = w.__camFixa;
      const sg = w.__seguir;
      if (sg) {
        const ve = e.veiculos!().find((v) => v.id === sg.id);
        if (ve) {
          const hx = Math.cos(ve.yaw);
          const hz = -Math.sin(ve.yaw);
          // esquerda de quem anda em (hx, hz): (-hz, hx)
          f = {
            p: [ve.x + hx * sg.f - hz * sg.l, H + sg.y, ve.z + hz * sg.f + hx * sg.l],
            a: [ve.x + hx * sg.af, H + sg.ay, ve.z + hz * sg.af],
          };
        }
      }
      if (!f) return;
      const cam = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
      };
      cam.position.set(...f.p);
      const alvo = cam.position.clone();
      alvo.set(...f.a);
      cam.setTarget(alvo);
      // o Babylon já recortou a cena com a vista da câmera do jogo: refaz com a da câmera fixa
      (
        c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }
      ).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
  });
}

async function abrir(page: Page) {
  page.on('pageerror', (e) => console.log(`erro na página: ${String(e)}`));
  await configurar(page);
  await page.goto('/?tema=cidade-grande');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
  });
  await prepararCamera(page);
}

async function ligarSom(page: Page) {
  const entrada = page.locator('.entrada');
  if (await entrada.isVisible().catch(() => false)) await entrada.click();
  else await page.evaluate(() => document.dispatchEvent(new Event('keydown')));
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.audio!.estado), { timeout: 15_000 })
    .toBe('ativo');
  await page.evaluate(() =>
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', ''),
  );
  await expect
    .poll(() => page.evaluate(() => window.__brumaluz!.somVeiculos?.().pronto ?? false), {
      timeout: 60_000,
    })
    .toBe(true);
}

async function assentar(page: Page, minimo = 12) {
  let antes = -1;
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1200);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n >= minimo) break;
    antes = n;
  }
  await page.waitForTimeout(800);
}

const lista = (page: Page): Promise<Na[]> =>
  page.evaluate(() => (window.__brumaluz!.veiculos?.() ?? []) as Na[]);

const plano = (page: Page) =>
  page.evaluate(() => {
    const p = window.__brumaluz!.cidade!()!;
    const l = p.lotes.find((l) => l.uso === 'praca')!;
    // um pouco para dentro da praça, de frente para a rua (a polícia e o sorvete passam ali)
    const praca = {
      x: l.x0 + l.largura / 2,
      z: l.porta === 'n' ? l.z0 + 1.2 : l.z0 + l.profundidade - 1.2,
      yaw: l.porta === 'n' ? Math.PI : 0,
      rua: l.porta === 'n' ? -1 : 1,
    };
    return { h: p.h, praca, vaga: p.vaga, parque: p.parque, nascimento: p.nascimento };
  });

/** A criança voa bem acima de (x, z): o veículo fica perto (desenho e som), ela fora da foto. */
async function pairar(page: Page, x: number, z: number, alto = 14) {
  await page.evaluate(
    ([x, z, alto]) => {
      const e = window.__brumaluz!;
      e.voar?.(true);
      e.teleportar!(x, z, e.cidade!()!.h + 1 + alto);
    },
    [x, z, alto] as const,
  );
}

/** Põe a criança de pé num ponto do chão da cidade (calçada, zebra...). */
async function dePe(page: Page, x: number, z: number, yaw?: number) {
  await page.evaluate(
    ([x, z, yaw]) => {
      const e = window.__brumaluz!;
      e.voar?.(false);
      e.teleportar!(x, z, e.cidade!()!.h + 1.02);
      if (yaw !== null) e.apontar!(yaw, 0.1);
    },
    [x, z, yaw ?? null] as const,
  );
}

/**
 * Segue o veículo com a câmera fixa num dos lados candidatos que estiver livre de blocos até
 * ele (confere no mundo gerado). Devolve o lado usado ou null.
 */
async function seguir(
  page: Page,
  id: number,
  op: {
    f?: number;
    l?: number[];
    y?: number;
    ay?: number;
    af?: number;
    /** Pontos candidatos (frente, lado, altura), no lugar de `l`. */
    cands?: [number, number, number][];
  } = {},
): Promise<number | null> {
  return page.evaluate(
    ([id, op]) => {
      const e = window.__brumaluz!;
      const w = window as unknown as { __seguir: unknown; __camFixa: unknown };
      const ve = e.veiculos!().find((v) => v.id === id);
      if (!ve) return null;
      const H = e.cidade!()!.h + 1;
      const hx = Math.cos(ve.yaw);
      const hz = -Math.sin(ve.yaw);
      const cands =
        op.cands ?? (op.l ?? [2.6, 3.2, -2.2, 2]).map((l) => [op.f ?? 5, l, op.y ?? 2.2]);
      for (const [f, l, y] of cands) {
        const px = ve.x + hx * f - hz * l;
        const pz = ve.z + hz * f + hx * l;
        // livre: a câmera e o caminho até o veículo (10 pontos), em volta de cada um
        let livre = true;
        for (let k = 0; k <= 10 && livre; k++) {
          const u = k / 10;
          const x = px + (ve.x - px) * u * 0.8;
          const z = pz + (ve.z - pz) * u * 0.8;
          const yy = H + y + (0.8 - y) * u * 0.8;
          for (const [dx, dz] of [
            [0, 0],
            [0.3, 0],
            [-0.3, 0],
            [0, 0.3],
            [0, -0.3],
          ])
            if (
              (e.blocoGerado?.(Math.floor(x + dx), Math.floor(yy), Math.floor(z + dz)) ?? 0) !== 0
            )
              livre = false;
          // as árvores e os postes da calçada são peças, não blocos
          for (const [ax, az, r] of e.cidade!()!.arvores)
            if (yy < H + 6.5 && Math.hypot(x - ax, z - az) < (yy < H + 2 ? 0.5 : r + 0.6))
              livre = false;
          for (const [ax, az] of e.cidade!()!.postes)
            if (Math.hypot(x - ax, z - az) < 0.6) livre = false;
        }
        if (!livre) continue;
        w.__camFixa = null;
        w.__seguir = { id, f, l, y, ay: op.ay ?? 0.9, af: op.af ?? 0 };
        return l;
      }
      return null;
    },
    [id, op] as const,
  );
}

async function soltarCamera(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __seguir: unknown; __camFixa: unknown };
    w.__seguir = null;
    w.__camFixa = null;
  });
}

async function foto(page: Page, nome: string) {
  mkdirSync(PASTA, { recursive: true });
  await page.evaluate(() => {
    const cena = document.getElementById('cena')!;
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== cena && !el.contains(cena)) el.style.visibility = 'hidden';
  });
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, quality: 86 });
  await page.evaluate(() => {
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      el.style.visibility = '';
  });
  console.log(`CAPTURA ${nome}`);
}

/** Espera um veículo ficar num estado (pela lista desenhada). */
async function esperarVeiculo(
  page: Page,
  cond: (v: Na) => boolean,
  ms: number,
  acompanhar?: (v: Na) => Promise<void>,
): Promise<Na | null> {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    const l = await lista(page);
    const v = l.find(cond);
    if (v) return v;
    if (acompanhar) {
      const alvo = l.find((x) => x.ativo);
      if (alvo) await acompanhar(alvo);
    }
    await page.waitForTimeout(400);
  }
  return null;
}

/** RMS robusto (dB) de um PCM gravado: janelas de 100 ms que soam, sem as 5% mais altas. */
const rmsGravado = new Map<string, number>();
function rmsRobusto(out: Buffer, taxa: number): number {
  const n = out.length / 4;
  const w = Math.round(taxa / 10);
  const jan: number[] = [];
  for (let i = 0; i + w <= n; i += w) {
    let p = 0;
    for (let k = i; k < i + w; k++) {
      const l = out.readInt16LE(k * 4) / 32768;
      const r = out.readInt16LE(k * 4 + 2) / 32768;
      p += (l * l + r * r) / 2;
    }
    const db = 10 * Math.log10(p / w + 1e-18);
    if (db > -65) jan.push(db);
  }
  if (!jan.length) return -Infinity;
  jan.sort((a, b) => a - b);
  const q = jan.slice(0, Math.max(1, Math.floor(jan.length * 0.95)));
  return 10 * Math.log10(q.reduce((s, d) => s + 10 ** (d / 10), 0) / q.length);
}

/** Grava o som do jogo e salva como PCM 16 bits estéreo intercalado. */
async function gravar(page: Page, segundos: number, nome: string): Promise<number> {
  const r = await page.evaluate((s) => window.__brumaluz!.gravarSom!(s), segundos);
  if (!r) throw new Error('sem som para gravar');
  const l = Buffer.from(r.l, 'base64');
  const d = Buffer.from(r.r, 'base64');
  const n = l.length / 2;
  const out = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i++) {
    out.writeInt16LE(l.readInt16LE(i * 2), i * 4);
    out.writeInt16LE(d.readInt16LE(i * 2), i * 4 + 2);
  }
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(`${PASTA}/${nome}.pcm`, out as unknown as string);
  const db = rmsRobusto(out, r.taxa);
  rmsGravado.set(nome, db);
  console.log(`SOM ${nome} ${r.taxa} Hz ${segundos} s, ${db.toFixed(1)} dB`);
  return r.taxa;
}

// ------------------------------------------------------------------ só nas pistas

test('um minuto de veículos andando, sempre na pista, com os motores tocando', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page);
  await ligarSom(page);
  const p = await plano(page);
  // na calçada da praça (a polícia, o sorvete e um ônibus passam por ali)
  const pr = p.praca;
  await dePe(page, pr.x, pr.z, pr.yaw);
  await assentar(page);
  // confere a cada quadro desenhado, por um minuto
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const w = window as unknown as {
      __pistas: { quadros: number; fora: string[]; ativos: number; andou: Record<number, number> };
    };
    const reg = {
      quadros: 0,
      fora: [] as string[],
      ativos: 0,
      andou: {} as Record<number, number>,
    };
    w.__pistas = reg;
    const antes = new Map<number, { x: number; z: number }>();
    e.cenaBabylon!().onAfterRenderObservable.add(() => {
      reg.quadros++;
      const f = e.veiculosForaDaPista?.() ?? [];
      if (f.length && reg.fora.length < 50) reg.fora.push(...f);
      const l = e.veiculos!();
      reg.ativos = Math.max(reg.ativos, l.filter((v) => v.ativo).length);
      for (const v of l) {
        const a = antes.get(v.id);
        if (a) reg.andou[v.id] = (reg.andou[v.id] ?? 0) + Math.hypot(v.x - a.x, v.z - a.z);
        antes.set(v.id, { x: v.x, z: v.z });
      }
    });
  });
  const motores = new Set<string>();
  let rpmMax = 0;
  for (let i = 0; i < 60; i++) {
    await page.waitForTimeout(1000);
    const s = await page.evaluate(() => window.__brumaluz!.somVeiculos!());
    for (const m of s.motores) {
      motores.add(m.tipo);
      rpmMax = Math.max(rpmMax, m.rpm);
    }
    if (i === 30) {
      // a outra metade do minuto do outro lado da cidade (outras voltas)
      await dePe(page, p.nascimento.x, p.nascimento.z);
    }
  }
  const r = await page.evaluate(
    () =>
      (
        window as unknown as {
          __pistas: {
            quadros: number;
            fora: string[];
            ativos: number;
            andou: Record<number, number>;
          };
        }
      ).__pistas,
  );
  const som = await page.evaluate(() => window.__brumaluz!.somVeiculos!());
  console.log(
    `PISTAS ${JSON.stringify({ quadros: r.quadros, fora: r.fora.slice(0, 5), ativos: r.ativos, andou: r.andou })}`,
  );
  console.log(
    `MOTORES ${JSON.stringify({ tipos: [...motores], rpmMax, tocados: som.tocados.slice(-20) })}`,
  );
  // a cada quadro desenhado (com 3 navegadores na mesma placa, bem menos de 60 por segundo)
  expect(r.quadros).toBeGreaterThan(100);
  expect(r.fora).toEqual([]);
  expect(r.ativos).toBe(10);
  // todos andaram (o sorvete pode estar parado na vaga o minuto inteiro)
  const andaram = Object.entries(r.andou).filter(([, d]) => d > 5).length;
  expect(andaram).toBeGreaterThanOrEqual(8);
  expect(motores.size).toBeGreaterThan(0);
  expect(rpmMax).toBeGreaterThan(1.3);
});

// ------------------------------------------------------------------ duas telas

async function jogador(browser: Browser, id: string, apelido: string, celular = false) {
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

test('duas crianças na nuvem veem os mesmos veículos no mesmo lugar', async ({ browser }) => {
  const sufixo = Date.now().toString(36);
  const pronto = (p: Page) =>
    p.waitForFunction(() => window.__brumaluz?.ready === true, null, { timeout: 240_000 });
  const ana = await jogador(browser, `ana-v-${sufixo}`, 'Ana');
  await ana.goto('/');
  await pronto(ana);
  await ana.locator('[data-abrir-mundos]').click();
  await ana.locator('.form-novo [data-tema="cidade-grande"]').click();
  await ana.locator('[data-novo-nome]').fill('Cidade dos Carrinhos');
  await ana.locator('[data-com-amigos]').check();
  await ana.locator('[data-novo-apelido]').fill('Ana');
  await ana.locator('[data-criar-mundo]').click();
  const codigo = await ana
    .locator('[data-painel-amigos] [data-codigo-mundo]')
    .getAttribute('data-codigo-mundo', { timeout: 120_000 });
  await pronto(ana);
  const bia = await jogador(browser, `bia-v-${sufixo}`, 'Bia', true);
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
    await p.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
    });
    await expect
      .poll(
        () =>
          p.evaluate(() => (window.__brumaluz!.veiculos?.() ?? []).filter((v) => v.ativo).length),
        {
          timeout: 60_000,
        },
      )
      .toBe(10);
  }
  // cinco vezes, as duas telas ao mesmo tempo: cada veículo no mesmo lugar (o relógio da página
  // de cada uma anda um tiquinho diferente: até 1 bloco a 3 blocos/s)
  let pior = 0;
  for (let k = 0; k < 5; k++) {
    const [a, b] = await Promise.all([lista(ana), lista(bia)]);
    for (const va of a) {
      const vb = b.find((v) => v.id === va.id)!;
      const d = Math.hypot(va.x - vb.x, va.z - vb.z);
      pior = Math.max(pior, d);
      expect(d, `${va.tipo}#${va.id}`).toBeLessThan(1.0);
    }
    await ana.waitForTimeout(3000);
  }
  console.log(`DUAS-TELAS pior diferença ${pior.toFixed(3)} blocos`);
  // as duas olham o mesmo veículo (um táxi) da mesma câmera
  for (const p of [ana, bia]) await prepararCamera(p);
  const taxi = (await lista(ana)).find((v) => v.tipo === 'taxi')!;
  for (const p of [ana, bia]) await pairar(p, taxi.x, taxi.z);
  await ana.waitForTimeout(1500);
  const lado = await seguir(ana, taxi.id);
  if (lado !== null) await seguir(bia, taxi.id, { l: [lado] });
  await ana.waitForTimeout(1500);
  await Promise.all([foto(ana, 'duas-telas-ana'), foto(bia, 'duas-telas-bia')]);
  await ana.context().close();
  await bia.context().close();
});

// ------------------------------------------------------------------ régua da rua

/**
 * Grava as três medidas de um lugar: só a trilha (veículos calados), só a rua (trilha calada) e
 * as duas juntas. A natureza (vento, pardais) fica calada nas três: a comparação é rua contra
 * trilha, como no esboço.
 */
async function tresMedidas(page: Page, nome: string, s: number) {
  const vol = (m: number | null) =>
    page.evaluate((m) => window.__brumaluz!.volumesAmbiente!(m, 0, 0), m);
  const calar = (b: boolean) => page.evaluate((b) => window.__brumaluz!.calarVeiculos!(b), b);
  await calar(true);
  await vol(null);
  await page.waitForTimeout(400);
  await gravar(page, s, `regua-${nome}-trilha`);
  await calar(false);
  await vol(0);
  await page.waitForTimeout(400);
  await gravar(page, s, `regua-${nome}-rua`);
  await vol(null);
  await page.waitForTimeout(400);
  await gravar(page, s, `regua-${nome}-juntas`);
}

test('régua da rua: a rua e a musiquinha contra a trilha', async ({ page }) => {
  test.skip(!process.env.VEICULOS_REGUA, 'só com VEICULOS_REGUA');
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page);
  await ligarSom(page);
  const p = await plano(page);
  const pr = p.praca;
  // a esquina da praça (calçada, de frente para a rua)
  await dePe(page, pr.x, pr.z, pr.yaw);
  await assentar(page);
  // a música gravada já tocando
  await page.waitForTimeout(12_000);
  const s = Number(process.env.VEICULOS_REGUA_S ?? 30);
  await tresMedidas(page, 'praca', s);
  // acompanhando um táxi de perto (o motor dele cheio o tempo todo)
  const taxi = (await lista(page)).find((v) => v.tipo === 'taxi')!;
  let parar = false;
  const acompanhar = (async () => {
    while (!parar) {
      const v = (await lista(page)).find((x) => x.id === taxi.id);
      if (v) await pairar(page, v.x, v.z, 4.5);
      await page.waitForTimeout(250);
    }
  })();
  await page.waitForTimeout(3000);
  await tresMedidas(page, 'taxi', 15);
  parar = true;
  await acompanhar;
  // a frase da musiquinha, de perto do carrinho de sorvete, contra a trilha
  const sv = (await lista(page)).find((v) => v.tipo === 'sorvete')!;
  await pairar(page, sv.x, sv.z, 3);
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    window.__brumaluz!.calarVeiculos!(true);
    window.__brumaluz!.volumesAmbiente!(0, 0, 0);
    window.__brumaluz!.tocarSorvete!('frase');
  });
  await page.waitForTimeout(150);
  await gravar(page, 7.5, 'regua-sorvete-frase');
  await page.evaluate(() => window.__brumaluz!.volumesAmbiente!(null, 0, 0));
  await page.waitForTimeout(400);
  await gravar(page, 7.5, 'regua-sorvete-trilha');
  await page.evaluate(() => {
    window.__brumaluz!.tocarSorvete!('frase');
  });
  await page.waitForTimeout(150);
  await gravar(page, 7.5, 'regua-sorvete-juntas');
  await page.evaluate(() => {
    window.__brumaluz!.calarVeiculos!(false);
    window.__brumaluz!.volumesAmbiente!(null, null);
  });
  console.log(
    `REGUA ${JSON.stringify(await page.evaluate(() => window.__brumaluz!.somVeiculos!()))}`,
  );
  // os alvos (spec 014, T15, depois de o dono ouvir): o motor de um carrinho andando perto se
  // ouve com a música (a trilha abaixa 4 dB e o motor fica no nível dela ou acima); na esquina da
  // praça a rua inteira não sobe mais que 0,9 dB sobre a trilha (o esboço: +0,4); a musiquinha
  // fica 3 dB ou mais abaixo da trilha
  const g = (k: string) => rmsGravado.get(k)!;
  const dif = (a: string, b: string) => (g(a) - g(b)).toFixed(1);
  console.log(
    `ALVOS taxi rua-trilha ${dif('regua-taxi-rua', 'regua-taxi-trilha')}, juntas-trilha ${dif('regua-taxi-juntas', 'regua-taxi-trilha')}; praça juntas-trilha ${dif('regua-praca-juntas', 'regua-praca-trilha')}; sorvete frase-trilha ${dif('regua-sorvete-frase', 'regua-sorvete-trilha')}`,
  );
  expect(g('regua-taxi-rua')).toBeGreaterThan(g('regua-taxi-trilha') - 1.5);
  expect(g('regua-praca-juntas')).toBeLessThan(g('regua-praca-trilha') + 0.9);
  expect(g('regua-sorvete-frase')).toBeLessThan(g('regua-sorvete-trilha') - 3);
});

/**
 * Amostra para ouvir o motor (VEICULOS_REGUA=1): um táxi para por causa da criança na faixa
 * dele, ela sai voando e fica logo acima, e o táxi arranca trocando de marcha. Duas vezes: com o
 * som do jogo inteiro e só a rua (trilha, natureza e falas caladas).
 */
test('amostra do motor: um táxi arrancando e trocando de marcha', async ({ page }) => {
  test.skip(!process.env.VEICULOS_REGUA, 'só com VEICULOS_REGUA');
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page);
  await ligarSom(page);
  await assentar(page);
  await page.waitForTimeout(8000);
  const taxi = (await lista(page)).find((v) => v.tipo === 'taxi')!;
  for (const modo of ['jogo', 'rua'] as const)
    for (let vez = 0; vez < 3; vez++) {
      await page.evaluate((m) => {
        const e = window.__brumaluz!;
        e.calarVeiculos!(false);
        if (m === 'rua') e.volumesAmbiente!(0, 0, 0);
        else e.volumesAmbiente!(null, null, null);
      }, modo);
      // a criança de pé na faixa, uns 7 blocos à frente (numa reta)
      let parado = false;
      for (let tentativa = 0; tentativa < 8 && !parado; tentativa++) {
        const alvo = await page.evaluate((id) => {
          const e = window.__brumaluz!;
          const ve = e.veiculos!().find((v) => v.id === id)!;
          const a = e.poseVeiculo!(id, ve.s + 7);
          const b = e.poseVeiculo!(id, ve.s + 8);
          return Math.abs(a.yaw - b.yaw) < 0.01 ? { x: a.x, z: a.z } : null;
        }, taxi.id);
        if (!alvo) {
          await page.waitForTimeout(1500);
          continue;
        }
        await dePe(page, alvo.x, alvo.z);
        parado = !!(await esperarVeiculo(page, (v) => v.id === taxi.id && v.v === 0, 12_000));
      }
      if (!parado) throw new Error('o táxi não parou');
      await page.waitForTimeout(1500);
      const v0 = (await lista(page)).find((v) => v.id === taxi.id)!;
      await pairar(page, v0.x, v0.z, 4.5);
      let parar = false;
      const acompanhar = (async () => {
        while (!parar) {
          const v = (await lista(page)).find((x) => x.id === taxi.id);
          if (v) await pairar(page, v.x, v.z, 4.5);
          await page.waitForTimeout(200);
        }
      })();
      const marchas: string[] = [];
      const olhar = (async () => {
        while (!parar) {
          const m = (await page.evaluate(() => window.__brumaluz!.somVeiculos!())).motores.find(
            (x) => x.tipo === 'taxi',
          );
          if (m) marchas.push(`${m.marcha}:${m.rpm.toFixed(2)}`);
          await page.waitForTimeout(500);
        }
      })();
      await gravar(page, 15, `amostra-taxi-${modo}`);
      parar = true;
      await acompanhar;
      await olhar;
      console.log(`MARCHAS ${modo} ${marchas.join(' ')}`);
      // o táxi tem de ter arrancado até a terceira (senão ficou na fila: de novo)
      if (marchas.some((m) => m.startsWith('2:'))) break;
    }
  await page.evaluate(() => window.__brumaluz!.volumesAmbiente!(null, null, null));
});

// ------------------------------------------------------------------ capturas

const DIA = 0.42;
const NOITE = 0.96;

async function hora(page: Page, h: number) {
  await page.evaluate((h) => {
    window.__brumaluz!.hora = h;
  }, h);
  await page.waitForTimeout(1500);
}

/** Cada veículo de dia (e um de cada tipo de noite), de perto, andando. */
async function cadaVeiculo(page: Page, sufixo: string, noites: boolean) {
  const todos = await lista(page);
  const vistos = new Set<string>();
  for (const ve of todos) {
    const chave = ve.tipo;
    await pairar(page, ve.x, ve.z);
    await page.waitForTimeout(1200);
    // anda junto um pouco (a criança acompanha o veículo lá de cima)
    for (let k = 0; k < 3; k++) {
      const v = (await lista(page)).find((x) => x.id === ve.id)!;
      await pairar(page, v.x, v.z);
      await page.waitForTimeout(400);
    }
    const lado = await seguir(page, ve.id, { f: 4.6, l: [2.4, 3, 2], y: 1.9, ay: 0.9 });
    if (lado === null) {
      console.log(`sem câmera livre para ${ve.tipo}#${ve.id}`);
      continue;
    }
    await page.waitForTimeout(900);
    await hora(page, DIA);
    await foto(page, `${sufixo}-${ve.tipo}-${ve.id}-dia`);
    if (noites && !vistos.has(chave)) {
      await hora(page, NOITE);
      await foto(page, `${sufixo}-${ve.tipo}-${ve.id}-noite`);
      await hora(page, DIA);
    }
    vistos.add(chave);
    await soltarCamera(page);
  }
}

test('capturas dos veículos (computador)', async ({ page }) => {
  test.skip(!process.env.VEICULOS_CAPTURAS, 'só com VEICULOS_CAPTURAS');
  await page.setViewportSize({ width: 1280, height: 720 });
  await abrir(page);
  await ligarSom(page);
  const p = await plano(page);
  await assentar(page);
  await cadaVeiculo(page, 'pc', true);

  // o ônibus no ponto com a porta aberta (do lado da calçada, um pouco à frente)
  const onibus = await esperarVeiculo(
    page,
    (v) => v.tipo.startsWith('onibus') && v.k === 'ponto',
    240_000,
    async () => {
      const b = (await lista(page)).find((v) => v.tipo === 'onibusAzul')!;
      await pairar(page, b.x, b.z);
    },
  );
  if (onibus) {
    await pairar(page, onibus.x, onibus.z);
    await page.waitForTimeout(600);
    // do lado da calçada (a porta) ou, se a calçada estiver tomada, da frente pela direita
    const l = await seguir(page, onibus.id, {
      ay: 1.1,
      af: -1,
      cands: [
        // do alto, por cima das copas da calçada, olhando o lado da porta
        [1, -2.4, 7.5],
        [0, -2.8, 7.5],
        // rente à calçada, na frente do ônibus, olhando o lado da porta
        [4.5, -1.9, 1.7],
        [3.5, -1.9, 1.7],
        [5.5, -1.9, 1.8],
        [6.5, -2.1, 2],
        [3.5, -3, 2.4],
        [7, -0.6, 3.4],
      ],
    });
    console.log(`ônibus no ponto: ${onibus.tipo}#${onibus.id} lado ${l}`);
    await page.waitForTimeout(700);
    await foto(page, 'pc-onibus-no-ponto-porta-aberta');
    await soltarCamera(page);
  } else console.log('o ônibus não parou no ponto a tempo');

  // o sorvete na vaga com uma criança perto (na calçada da praça, ao lado dele)
  const sorvete = await esperarVeiculo(
    page,
    (v) => v.tipo === 'sorvete' && v.k === 'vaga',
    300_000,
  );
  if (sorvete) {
    const hx = Math.cos(sorvete.yaw);
    const hz = -Math.sin(sorvete.yaw);
    // a calçada fica à direita de quem anda: (hz, -hx)
    await dePe(page, sorvete.x + hz * 2.6 + hx * 1.5, sorvete.z - hx * 2.6 + hz * 1.5, sorvete.yaw);
    await page.waitForTimeout(1500);
    await seguir(page, sorvete.id, { f: 5.5, l: [3, 2.6, 2.2], y: 2.3, ay: 1.0, af: 0.5 });
    await page.waitForTimeout(800);
    await foto(page, 'pc-sorvete-na-vaga-com-crianca');
    await hora(page, NOITE);
    await foto(page, 'pc-sorvete-na-vaga-noite');
    await hora(page, DIA);
    await soltarCamera(page);
  } else console.log('o sorvete não chegou à vaga a tempo');

  // a polícia passando na frente da praça ("uí-uí": só com criança perto)
  const pr = p.praca;
  await dePe(page, pr.x, pr.z, pr.yaw);
  const ev0 = await page.evaluate(() => window.__brumaluz!.eventosVeiculos?.length ?? 0);
  let uiui = false;
  for (let k = 0; k < 400 && !uiui; k++) {
    await page.waitForTimeout(500);
    uiui = await page.evaluate(
      (n) => (window.__brumaluz!.eventosVeiculos ?? []).slice(n).some((e) => e.o === 'uiui'),
      ev0,
    );
  }
  if (uiui) {
    const pol = (await lista(page)).find((v) => v.tipo === 'policia')!;
    await seguir(page, pol.id, { f: 5, l: [2.6, 3, 2.2], y: 2.2 });
    await page.waitForTimeout(300);
    await foto(page, 'pc-policia-passando-na-praca');
    await soltarCamera(page);
    const som = await page.evaluate(() => window.__brumaluz!.somVeiculos!().tocados);
    console.log(`uí-uí tocou: ${som.includes('uiui')}`);
  } else console.log('a polícia não passou pela praça a tempo');

  // um carro parado para a criança na zebra
  const carros = (await lista(page)).filter((v) => v.tipo === 'taxi' || v.tipo === 'civil');
  let parou = false;
  for (const c of carros) {
    const zebra = await page.evaluate((id) => {
      const e = window.__brumaluz!;
      const ve = e.veiculos!().find((v) => v.id === id)!;
      const H = e.cidade!()!.h;
      for (let d = 7; d < 16; d += 0.5) {
        const q = e.poseVeiculo!(id, ve.s + d);
        if (e.blocoGerado?.(Math.floor(q.x), H, Math.floor(q.z)) === 86)
          return { x: q.x, z: q.z, yaw: q.yaw };
      }
      return null;
    }, c.id);
    if (!zebra) continue;
    await dePe(page, zebra.x, zebra.z, zebra.yaw + Math.PI);
    const v = await esperarVeiculo(
      page,
      (x) => x.id === c.id && x.v === 0 && Math.hypot(x.x - zebra.x, x.z - zebra.z) < 5,
      20_000,
    );
    if (!v) continue;
    await seguir(page, c.id, { f: 7, l: [2.8, 3.2, 2.2], y: 2.6, ay: 0.9, af: 2 });
    await page.waitForTimeout(2500);
    await foto(page, `pc-${c.tipo}-parado-para-a-crianca-na-zebra`);
    await soltarCamera(page);
    parou = true;
    break;
  }
  if (!parou) console.log('nenhum carro parou na zebra a tempo');
});

test('capturas dos veículos (celular)', async ({ browser }) => {
  test.skip(!process.env.VEICULOS_CAPTURAS, 'só com VEICULOS_CAPTURAS');
  const ctx = await browser.newContext(IPHONE);
  const page = await ctx.newPage();
  await page.addInitScript(() => document.documentElement?.classList.add('toque'));
  await abrir(page);
  await assentar(page);
  await cadaVeiculo(page, 'celular', true);
  await ctx.close();
});

test('vídeos do trânsito com o som do jogo', async ({ browser }) => {
  test.skip(!process.env.VEICULOS_CAPTURAS, 'só com VEICULOS_CAPTURAS');
  mkdirSync(`${PASTA}/videos`, { recursive: true });
  const cenas: { nome: string; montar: (page: Page) => Promise<void> }[] = [
    {
      // da calçada da praça: o trânsito passando
      nome: 'video-praca',
      montar: async (page) => {
        const p = await plano(page);
        const pr = p.praca;
        await dePe(page, pr.x, pr.z, pr.yaw);
        await page.evaluate(
          ([x, y, z, ax, az]) => {
            (window as unknown as { __camFixa: unknown }).__camFixa = {
              p: [x, y, z],
              a: [ax, y - 1.2, az],
            };
          },
          [pr.x + 8, p.h + 3.4, pr.z - pr.rua * 0.5, pr.x - 4, pr.z + pr.rua * 5] as const,
        );
      },
    },
    {
      // atrás de um táxi pela cidade
      nome: 'video-taxi',
      montar: async (page) => {
        const t = (await lista(page)).find((v) => v.tipo === 'taxi')!;
        await pairar(page, t.x, t.z, 12);
        await page.waitForTimeout(800);
        await seguir(page, t.id, { f: -6, l: [1.6, 2.2, 0], y: 3.2, ay: 1, af: 3 });
      },
    },
    {
      // atrás do ônibus azul
      nome: 'video-onibus',
      montar: async (page) => {
        const b = (await lista(page)).find((v) => v.tipo === 'onibusAzul')!;
        await pairar(page, b.x, b.z, 12);
        await page.waitForTimeout(800);
        await seguir(page, b.id, { f: -8, l: [1.6, 2.2, 0], y: 3.6, ay: 1.2, af: 3 });
      },
    },
  ];
  for (const c of cenas) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: `${PASTA}/videos/${c.nome}`, size: { width: 1280, height: 720 } },
    });
    const t0 = Date.now();
    const page = await ctx.newPage();
    await abrir(page);
    await ligarSom(page);
    await assentar(page);
    await c.montar(page);
    await page.waitForTimeout(2000);
    // o vídeo da página começa em t0: o som começa agora (o atraso vai no nome)
    const atraso = Date.now() - t0;
    const segue = c.nome !== 'video-praca';
    let parar = false;
    const acompanhar = segue
      ? (async () => {
          const id = await page.evaluate(
            () => (window as unknown as { __seguir?: { id: number } }).__seguir?.id ?? -1,
          );
          while (!parar && id >= 0) {
            const v = (await lista(page)).find((x) => x.id === id);
            if (v) await pairar(page, v.x, v.z, 12);
            await page.waitForTimeout(500);
          }
        })()
      : Promise.resolve();
    await gravar(page, 24, `videos/${c.nome}-som-${atraso}ms`);
    parar = true;
    await acompanhar;
    await ctx.close();
  }
});
