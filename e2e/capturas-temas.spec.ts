import { test, type Page } from '@playwright/test';
import { temasPedidos } from './temas';

/**
 * Matriz de capturas por tema (spec 007, critério 5) e prévias dos cartões de tema
 * (public/temas/<id>.jpg). Pesado: só roda com CAPTURAS_TEMAS=1.
 *   CAPTURAS_TEMAS=1 npx playwright test e2e/capturas-temas.spec.ts
 * CAPTURAS_TEMAS=<id> roda só um tema.
 */
declare const process: { env: Record<string, string | undefined> };
const pedido = process.env.CAPTURAS_TEMAS;
const TEMAS = temasPedidos(pedido);
// fora de test-results: o Playwright limpa aquela pasta a cada rodada
const PASTA = 'capturas-temas';
const AGUA = 67;
const TOCHA = 37;

test.skip(!pedido, 'capturas de tema só com CAPTURAS_TEMAS');

async function abrir(page: Page, id: string) {
  // a cidade vista do alto: o outro lado do parque precisa estar carregado no cartão
  if (id === 'cidade-grande')
    await page.addInitScript(() => {
      try {
        localStorage.setItem('terrario:config', JSON.stringify({ distancia: 5 }));
      } catch {
        // sem armazenamento
      }
    });
  await page.goto(`/?tema=${id}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
}

async function entrarNoJogo(page: Page) {
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    window.__brumaluz!.pausarDia = true;
  });
}

// convenção da câmera: yaw 0 olha para +z, pitch positivo olha para baixo
async function cena(page: Page, hora: number, clima = 'limpo', espera = 2500) {
  await page.evaluate(
    ({ hora, clima }) => {
      window.__brumaluz!.hora = hora;
      window.__brumaluz!.definirClima!(clima as never);
    },
    { hora, clima },
  );
  await page.waitForTimeout(espera);
}

async function semHud(page: Page, sim: boolean) {
  await page.evaluate((sim) => {
    const f = window.__brumaluz!.modoFoto!;
    if (f.ativo() !== sim) f.alternar();
    // a foto da vitrine sai sem nada por cima: nem o HUD (o modo foto esconde) nem o
    // painel do próprio modo foto
    const painel = document.querySelector<HTMLElement>('.painel-foto');
    if (painel) painel.style.visibility = sim ? 'hidden' : '';
  }, sim);
  await page.waitForTimeout(300);
}

async function foto(page: Page, nome: string) {
  // JPEG: a matriz inteira cabe numa página de revisão
  await page.screenshot({ path: `${PASTA}/${nome}.jpg`, type: 'jpeg', quality: 78 });
}

type V3 = [number, number, number];

/**
 * Spec 014 (T12): o cartão da Cidade Grande, de uma câmera parada um pouco alta na esquina de
 * fora do parque: o gramado e as árvores, as faixas amarelas da avenida, a torre art déco da
 * esquina e as casas de tijolo, e as torres do horizonte atrás; a criança pequena, fora do
 * meio, com o cachorro e o pedreiro ao lado. Sem andaime, tapume nem fantasma na frente.
 */
async function cartaoDaCidade(page: Page) {
  await cena(page, 0.4, 'limpo', 500);
  await page.setViewportSize({ width: 960, height: 540 });
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.cidade!()!;
    const P = p.parque;
    const H = p.h;
    const cam: V3 = [P.x1 + 5, H + 11, P.z0 - 5];
    const alvo: V3 = [P.x1 - 30, H + 6, P.z1 - 10];
    const dx = alvo[0] - cam[0];
    const dz = alvo[2] - cam[2];
    const n = Math.hypot(dx, dz);
    const bx = cam[0] + (dx / n) * 16 + (dz / n) * 4;
    const bz = cam[2] + (dz / n) * 16 - (dx / n) * 4;
    e.voar?.(false);
    e.teleportar!(bx, bz, H + 1);
    e.apontar!(Math.atan2(-dx, -dz), 0);
    e.invocar!('cervo', bx + (dz / n) * 1.6, H + 1, bz - (dx / n) * 1.6);
    e.estatua!(
      'morador',
      bx - (dz / n) * 1.8 + (dx / n) * 1.2,
      H + 1,
      bz + (dx / n) * 1.8 + (dz / n) * 1.2,
      Math.atan2(-dx, -dz),
      { profissao: 'construtor', n: 0 },
    );
    const w = window as unknown as { __cartao?: () => void };
    const obs = e.cenaBabylon!().onBeforeCameraRenderObservable.add((c) => {
      const camera = c as unknown as {
        position: { set(...a: number[]): void; clone(): { set(...a: number[]): unknown } };
        setTarget(v: unknown): void;
      };
      camera.position.set(...cam);
      const a = camera.position.clone();
      a.set(...alvo);
      camera.setTarget(a);
      // o Babylon já recortou a cena com a vista da câmera do jogo: refaz com a da câmera fixa
      (
        c.getScene() as unknown as { setTransformMatrix(a: unknown, b: unknown): void }
      ).setTransformMatrix(
        (c as unknown as { getViewMatrix(f: boolean): unknown }).getViewMatrix(true),
        (c as unknown as { getProjectionMatrix(f: boolean): unknown }).getProjectionMatrix(true),
      );
    });
    const tela = document.getElementById('cena')!;
    const escondidos: HTMLElement[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*')))
      if (el !== tela && !el.contains(tela) && el.style.visibility !== 'hidden') {
        el.style.visibility = 'hidden';
        escondidos.push(el);
      }
    w.__cartao = () => {
      e.cenaBabylon!().onBeforeCameraRenderObservable.remove(obs);
      for (const el of escondidos) el.style.visibility = '';
    };
  });
  // os chunks do outro lado do parque chegam
  await page.waitForTimeout(8000);
  await page.screenshot({ path: 'public/temas/cidade-grande.jpg', type: 'jpeg', quality: 80 });
  await page.evaluate(() => (window as unknown as { __cartao?: () => void }).__cartao?.());
  await page.setViewportSize({ width: 1280, height: 720 });
}

for (const id of TEMAS) {
  test(`matriz de capturas: ${id}`, async ({ page }) => {
    test.setTimeout(900_000);
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(String(e)));
    await page.setViewportSize({ width: 1280, height: 720 });
    await abrir(page, id);
    await page.waitForTimeout(1500);
    await foto(page, `${id}-titulo`);
    await entrarNoJogo(page);
    // com astro fixo no céu (Terra, gigante com anéis), a câmera olha para ele
    const vista = await page.evaluate(() => {
      const e = window.__brumaluz!;
      const a = e.astro;
      // mundo de sítio (Rancho Alegre): olha para o sítio mais perto, como ao nascer
      const sitio = e.tema === 'rancho-alegre' ? e.povoados!()[0] : undefined;
      if (!a && sitio) {
        const [x, , z] = e.posicao!;
        return { yaw: Math.atan2(sitio.cx - x, sitio.cz - z), pitch: -0.12, ceu: -0.55 };
      }
      if (!a) return { yaw: 0.6, pitch: -0.12, ceu: -0.55 };
      const n = Math.hypot(a[0], a[1], a[2]);
      const yaw = Math.atan2(a[0], a[2]);
      const pitch = -Math.asin(a[1] / n);
      return { yaw, pitch: Math.min(-0.12, pitch * 0.6), ceu: pitch };
    });
    await page.evaluate((v) => window.__brumaluz!.apontar!(v.yaw, v.pitch), vista);

    // prévia do cartão do tema: manhã clara, sem interface
    if (id === 'cidade-grande') await cartaoDaCidade(page);
    else {
      await semHud(page, true);
      await cena(page, 0.36, 'limpo', 4000);
      await page.setViewportSize({ width: 960, height: 540 });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `public/temas/${id}.jpg`, type: 'jpeg', quality: 80 });
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    // o modo foto tem câmera própria (não segue teleportes): a matriz usa a câmera do jogo
    await semHud(page, false);
    await page.waitForTimeout(800);

    // dia, crepúsculo e noite olhando o horizonte e o céu
    for (const [nome, hora] of [
      ['dia', 0.45],
      ['crepusculo', 0.76],
      ['noite', 0.02],
    ] as const) {
      await cena(page, hora);
      await foto(page, `${id}-${nome}`);
    }
    await page.evaluate((v) => window.__brumaluz!.apontar!(v.yaw, v.ceu), vista);
    await cena(page, 0.45);
    await foto(page, `${id}-ceu`);
    await page.evaluate((v) => window.__brumaluz!.apontar!(v.yaw, v.pitch), vista);

    // chuva e inverno
    await cena(page, 0.42, 'chuva', 4000);
    await foto(page, `${id}-chuva`);
    await page.evaluate(() => window.__brumaluz!.definirDia!(9));
    await cena(page, 0.45, 'limpo', 3000);
    await foto(page, `${id}-inverno`);
    await page.evaluate(() => window.__brumaluz!.definirDia!(0));

    // as cinco criaturas lado a lado na frente da câmera, de dia
    await cena(page, 0.4);
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      const tipos = ['cervo', 'coelho', 'raposa', 'espectro'] as const;
      tipos.forEach((t, i) => {
        const gx = Math.floor(x + 4 + i * 0.2);
        const gz = Math.floor(z - 3 + i * 2);
        let gy = Math.floor(y) + 3;
        while (gy > 2 && e.bloco!(gx, gy - 1, gz) === 0) gy--;
        e.invocar!(t as never, gx + 0.5, gy, gz + 0.5);
      });
      // yaw pi/2 olha para +x (onde estão as criaturas); pitch positivo olha para baixo
      e.apontar!(Math.PI / 2, 0.12);
    });
    await page.waitForTimeout(1500);
    await foto(page, `${id}-criaturas`);

    // inventário (interface do tema)
    await page.keyboard.press('KeyE');
    await page.waitForTimeout(900);
    await foto(page, `${id}-inventario`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);

    // caverna com tocha: uma salinha escavada embaixo do nascimento
    await page.evaluate(
      ({ TOCHA }) => {
        const e = window.__brumaluz!;
        const [x0, y0, z0] = e.posicao!.map(Math.floor);
        const y = y0 - 14;
        for (let dx = -3; dx <= 3; dx++)
          for (let dz = -3; dz <= 3; dz++)
            for (let dy = 0; dy <= 3; dy++) e.definirBloco!(x0 + dx, y + dy, z0 + dz, 0);
        e.definirBloco!(x0 + 3, y, z0 + 1, TOCHA);
        e.teleportar!(x0 + 0.5, z0 + 0.5, y);
        e.apontar!(1.2, -0.1);
      },
      { TOCHA },
    );
    await cena(page, 0.02, 'limpo', 3500);
    await foto(page, `${id}-caverna`);

    // debaixo d'água: procura um mar perto do nascimento
    const achou = await page.evaluate(
      ({ AGUA }) => {
        const e = window.__brumaluz!;
        const [x0, , z0] = e.posicao!.map(Math.floor);
        for (let r = 8; r < 400; r += 6)
          for (let a = 0; a < 24; a++) {
            const x = Math.round(x0 + Math.cos((a / 24) * Math.PI * 2) * r);
            const z = Math.round(z0 + Math.sin((a / 24) * Math.PI * 2) * r);
            if (e.blocoGerado!(x, 61, z) === AGUA && e.blocoGerado!(x, 55, z) === AGUA) {
              e.teleportar!(x + 0.5, z + 0.5, 57);
              e.apontar!(0.3, -0.05);
              // um peixe para conferir a pele
              e.invocar!('peixe' as never, x + 0.5, 57.5, z + 2.5);
              return true;
            }
          }
        return false;
      },
      { AGUA },
    );
    if (achou) {
      await cena(page, 0.42, 'limpo', 6000);
      await foto(page, `${id}-agua`);
    }
    // povoado: de dia visto de cima de um canto, à noite e a tela de trocas
    const pv = await page.evaluate(() => window.__brumaluz!.povoados?.()[0] ?? null);
    if (pv) {
      await page.evaluate((p) => {
        const e = window.__brumaluz!;
        // um bloco de apoio no alto: o jogador não voa e cairia (a foto sairia do chão)
        e.definirBloco!(Math.floor(p.cx - 14.5), p.h + 8, Math.floor(p.cz - 14.5), 45);
        e.teleportar!(p.cx - 14.5, p.cz - 14.5, p.h + 9);
        e.apontar!(Math.atan2(14.5, 14.5), 0.42);
      }, pv);
      await cena(page, 0.42, 'limpo', 7000);
      await foto(page, `${id}-povoado`);
      await cena(page, 0.02, 'limpo', 3000);
      await foto(page, `${id}-povoado-noite`);
      await cena(page, 0.42, 'limpo', 1500);
      const abriu = await page.evaluate(async () => {
        const e = window.__brumaluz!;
        for (let t = 0; t < 15; t++) {
          const [ex, , ez] = e.posicao!;
          const m = (e.criaturas?.() ?? [])
            .filter((c) => c.tipo === 'morador')
            .sort((a, b) => Math.hypot(a.x - ex, a.z - ez) - Math.hypot(b.x - ex, b.z - ez))[0];
          if (!m) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          const d = Math.hypot(m.x - ex, m.z - ez) || 1;
          e.teleportar!(m.x - ((m.x - ex) / d) * 2, m.z - ((m.z - ez) / d) * 2, m.y);
          await new Promise((r) => setTimeout(r, 400));
          const [px, py, pz] = e.posicao!;
          e.mirarPonto!(m.x, m.y + 1.1, m.z);
          await new Promise((r) => setTimeout(r, 400));
          e.controleDireto!.usar();
          await new Promise((r) => setTimeout(r, 300));
          if (!document.querySelector<HTMLElement>('[data-painel-trocas]')?.hidden) return true;
        }
        return false;
      });
      if (abriu) {
        await page.waitForTimeout(600);
        await foto(page, `${id}-trocas`);
        await page.keyboard.press('Escape');
      }
    }
    if (erros.length) throw new Error(erros.join('\n'));
  });
}

test.describe('celular', () => {
  test.use({ isMobile: true, hasTouch: true });
  for (const id of TEMAS) {
    test(`celular: ${id}`, async ({ page }) => {
      test.setTimeout(600_000);
      await page.setViewportSize({ width: 390, height: 844 });
      await abrir(page, id);
      await page.waitForTimeout(1200);
      await foto(page, `${id}-celular-titulo`);
      await entrarNoJogo(page);
      await page.evaluate(() => window.__brumaluz!.apontar!(0.6, -0.1));
      await cena(page, 0.45, 'limpo', 3000);
      await foto(page, `${id}-celular-dia`);
      await page.setViewportSize({ width: 844, height: 390 });
      await page.waitForTimeout(2000);
      await foto(page, `${id}-celular-paisagem`);
    });
  }
});
