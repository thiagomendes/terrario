import { test, type Page } from '@playwright/test';
import { IDS_TEMAS } from './temas';
import { Bloco } from '../src/world/blocks';

/**
 * Capturas do visual de brinquedo (spec 012) nos enquadramentos dos esboços de referência
 * (.sdd/specs/012-visual-brinquedo/referencia), em terceira pessoa (o jogo só tem ela desde a
 * spec 015): picareta, minerando, comendo, a selfie do modo foto e o editor de personagem.
 * Pesado: só roda com CAPTURAS_BRINQUEDO=1.
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.CAPTURAS_BRINQUEDO, 'capturas só com CAPTURAS_BRINQUEDO');
const PASTA = 'capturas-temas';

const pronto = async (p: Page) => {
  await p.waitForFunction(() => window.__brumaluz?.ready === true, undefined, { timeout: 180_000 });
  // as fotos mostram a barra com blocos (o mundo novo começa com ela vazia)
  await p.evaluate(() => window.__brumaluz!.darKit?.());
  await p.waitForFunction(() => !!window.__brumaluz!.inventario?.obter(1));
};
const foto = (p: Page, nome: string) =>
  p.screenshot({ path: `${PASTA}/brinquedo-${nome}.jpg`, type: 'jpeg', quality: 82 });

test('boneco de brinquedo nos enquadramentos dos esboços', async ({ page }) => {
  test.setTimeout(400_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await pronto(page);
  await page.locator('[data-abrir-personagem]').click();
  await page.waitForTimeout(1500);
  await foto(page, 'editor');
  await page.evaluate(async () => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    document.querySelector<HTMLElement>('[data-painel-personagem]')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    e.inventario!.definir(0, { item: 'picareta_ferro', qtd: 1 });
    e.inventario!.definir(1, { item: 'maca', qtd: 3 });
    e.selecionarSlot!(0);
    e.apontar!(0, 0.35);
  });
  await page.waitForTimeout(1500);
  await foto(page, '1a-pessoa-picareta');
  // golpe em curso: o meio do preparo
  const golpear = async (nome: string, espera: number) => {
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.animar!('golpe');
    });
    await page.waitForTimeout(espera);
    await foto(page, nome);
  };
  await golpear('1a-pessoa-minerando', 60);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(1);
  });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__brumaluz!.animar!('comer'));
  await page.waitForTimeout(500);
  await foto(page, '1a-pessoa-comendo');
  // efeito de quebrar: pecinhas de plástico e confete (o bloco à frente, no chão)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(0);
    e.apontar!(0, 0.5);
  });
  await page.waitForTimeout(400);
  const quebrar = () =>
    page.evaluate(() => {
      const e = window.__brumaluz!;
      const [x, y, z] = e.posicao!;
      for (const dx of [-1, 1])
        e.barramento!.emitir('quebra', {
          x: Math.floor(x) + dx,
          y: Math.floor(y) - 2,
          z: Math.floor(z) + 2,
          bloco: e.bloco!(Math.floor(x), Math.floor(y) - 2, Math.floor(z) + 2) || 1,
        });
    });
  await quebrar();
  await page.waitForTimeout(140);
  await foto(page, 'quebrar-1');
  await quebrar();
  await page.waitForTimeout(450);
  await foto(page, 'quebrar-2');
  // terceira pessoa por cima do ombro, minerando
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.selecionarSlot!(0);
    e.apontar!(0, 0.25);
  });
  await page.waitForTimeout(1200);
  await foto(page, '3a-pessoa');
  await page
    .locator('[data-minimapa]')
    .screenshot({ path: `${PASTA}/brinquedo-minimapa.png`, scale: 'device' });
  await golpear('3a-pessoa-minerando', 60);
  // de frente
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    // a câmera de frente agora é a selfie do modo foto (spec 015)
    if (!e.modoFoto!.ativo()) e.modoFoto!.alternar();
    e.modoFoto!.selfie();
  });
  await page.waitForTimeout(1500);
  await foto(page, 'frente');
  await page.evaluate(() => window.__brumaluz!.animar!('pulo'));
  await page.waitForTimeout(90);
  await foto(page, 'frente-pulo');
  // ícones de brinquedo (desenhados dos modelos 3D) na barra e no inventário
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    if (e.modoFoto!.ativo()) e.modoFoto!.alternar();
    const itens = [
      'machado_cobre',
      'pa_cristal',
      'espada_ferro',
      'carne_assada',
      'peixe_cru',
      'torta_abobora',
      'lingote_ouro',
    ];
    itens.forEach((it, i) => e.inventario!.definir(2 + i, { item: it, qtd: 1 }));
  });
  await page.waitForTimeout(2500);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(900);
  await foto(page, 'inventario');
  await page.keyboard.press('Escape');
});

const TEMAS = IDS_TEMAS;
for (const id of TEMAS) {
  test(`bichos e moradores de brinquedo: ${id}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/?tema=${id}`);
    await pronto(page);
    // os bichos do tema em fila, na frente do jogador (cervo, coelho, raposa e a noturna)
    await page.evaluate(async () => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
      e.definirClima?.('limpo');
      const [x, , z] = e.posicao!;
      const tipos = ['cervo', 'coelho', 'raposa', 'espectro'] as const;
      tipos.forEach((t, i) => e.invocar!(t, x - 3 + i * 2, 90, z + 5));
      e.apontar!(0, 0.3);
    });
    await page.waitForTimeout(4000);
    await foto(page, `bichos-${id}`);
    // o mesmo lugar à noite
    await page.evaluate(() => {
      window.__brumaluz!.hora = 0.92;
    });
    await page.waitForTimeout(2500);
    await foto(page, `noite-${id}`);
    await page.evaluate(() => {
      window.__brumaluz!.hora = 0.42;
    });
    // um povoado: os moradores das três profissões
    const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
    if (!p) return;
    await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
    await page.waitForFunction(
      () => (window.__brumaluz!.criaturas?.() ?? []).some((c) => c.tipo === 'morador'),
      undefined,
      { timeout: 120_000 },
    );
    await page.evaluate(async () => {
      const e = window.__brumaluz!;
      const m = (e.criaturas?.() ?? []).find((c) => c.tipo === 'morador')!;
      const [px, , pz] = e.posicao!;
      const d = Math.hypot(m.x - px, m.z - pz) || 1;
      e.teleportar!(m.x - ((m.x - px) / d) * 3, m.z - ((m.z - pz) / d) * 3, m.y);
      await new Promise((r) => setTimeout(r, 400));
      const [qx, qy, qz] = e.posicao!;
      e.apontar!(
        Math.atan2(m.x - qx, m.z - qz),
        -Math.atan2(m.y + 0.9 - qy, Math.hypot(m.x - qx, m.z - qz)),
      );
    });
    await page.waitForTimeout(2500);
    await foto(page, `morador-${id}`);
  });
}

test('telas de brinquedo: inicial, jogo, pausa', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await pronto(page);
  await page.waitForTimeout(2500);
  await foto(page, 'tela-inicial');
  await page.locator('[data-jogar-titulo]').click();
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.apontar!(0, 0.3);
  });
  await page.waitForTimeout(1500);
  await foto(page, 'tela-jogo');
  await page.evaluate(() =>
    document.querySelector<HTMLElement>('.barra-atalhos [data-funcao="Pausa"]')?.click(),
  );
  await page.waitForTimeout(800);
  await foto(page, 'tela-pausa');
});

test('água de brinquedo: beira e debaixo dela', async ({ page }) => {
  test.setTimeout(300_000);
  const ID_AGUA = Bloco.AGUA;
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.45;
  });
  const agua = await page.evaluate((AGUA_ID) => {
    const e = window.__brumaluz!;
    const [px, , pz] = e.posicao!.map(Math.floor);
    const ehAgua = (x: number, y: number, z: number) => e.bloco!(x, y, z) === AGUA_ID;
    for (let raio = 1; raio < 50; raio++)
      for (let dx = -raio; dx <= raio; dx++)
        for (let dz = -raio; dz <= raio; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== raio) continue;
          const x = px + dx,
            z = pz + dz;
          for (let y = 75; y > 50; y--) {
            const b = e.bloco!(x, y, z);
            if (b === 0) continue;
            if (ehAgua(x, y, z) && e.bloco!(x + 1, y, z) !== 0 && !ehAgua(x + 1, y, z))
              return { x, y, z };
            break;
          }
        }
    return null;
  }, ID_AGUA);
  if (agua) {
    await page.evaluate(({ x, y, z }) => {
      const e = window.__brumaluz!;
      e.teleportar!(x + 1.5, z - 3.5, y + 3);
    }, agua);
    await page.waitForTimeout(1500);
    await page.evaluate(({ x, y, z }) => {
      const e = window.__brumaluz!;
      const [qx, qy, qz] = e.posicao!;
      e.apontar!(
        Math.atan2(x + 0.5 - qx, z + 0.5 - qz),
        Math.atan2(qy - y, Math.hypot(x - qx, z - qz)),
      );
    }, agua);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${PASTA}/brinquedo-agua-beira.jpg`, type: 'jpeg', quality: 82 });
    // respingo: gotinhas redondas e roda de ondinhas
    await page.evaluate(
      ({ x, y, z }) => window.__brumaluz!.respingo!(x - 1.5, y + 0.875, z + 1.5, 1),
      agua,
    );
    await page.waitForTimeout(180);
    await page.screenshot({
      path: `${PASTA}/brinquedo-agua-respingo.jpg`,
      type: 'jpeg',
      quality: 82,
    });
    // debaixo d'água: uma coluna funda (5 blocos de água) perto dali
    const fundo = await page.evaluate(
      ({ x, y, z, A }) => {
        const e = window.__brumaluz!;
        for (let r = 1; r < 40; r++)
          for (let dx = -r; dx <= r; dx++)
            for (let dz = -r; dz <= r; dz++) {
              if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
              let n = 0;
              while (n < 5 && e.bloco!(x + dx, y - n, z + dz) === A) n++;
              if (n >= 5) return { x: x + dx, y, z: z + dz };
            }
        return null;
      },
      { ...agua, A: ID_AGUA },
    );
    if (fundo) {
      await page.evaluate(({ x, y, z }) => {
        const e = window.__brumaluz!;
        e.teleportar!(x + 0.5, z + 0.5, y - 3.5);
        e.apontar!(0.6, -0.1);
      }, fundo);
      await page.waitForTimeout(700);
    }
    await page.screenshot({
      path: `${PASTA}/brinquedo-agua-debaixo.jpg`,
      type: 'jpeg',
      quality: 82,
    });
  }
});

test('chuva de brinquedo: de dia e à noite', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.45;
    e.definirClima?.('chuva');
    e.apontar!(0.4, 0.25);
  });
  await page.waitForTimeout(14000);
  await foto(page, 'chuva-dia');
  await page.evaluate(() => {
    window.__brumaluz!.hora = 0.9;
  });
  await page.waitForTimeout(3000);
  await foto(page, 'chuva-noite');
});

test('qualidade automática: detalhe baixo (celular) e alto', async ({ page }) => {
  test.setTimeout(300_000);
  for (const d of ['baixo', 'alto']) {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/?detalhe=${d}`);
    await pronto(page);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
      e.apontar!(0, 0.25);
    });
    await page.waitForTimeout(2500);
    await foto(page, `detalhe-${d}`);
  }
});

for (const [nomeVp, vp] of [
  ['celular', { width: 390, height: 844 }],
  ['desktop', { width: 1280, height: 720 }],
] as const) {
  test(`painéis de brinquedo: ${nomeVp}`, async ({ browser }) => {
    test.setTimeout(400_000);
    const ctx = await browser.newContext({
      viewport: vp,
      ...(nomeVp === 'celular' ? { hasTouch: true, isMobile: true, deviceScaleFactor: 2 } : {}),
    });
    const page = await ctx.newPage();
    await page.goto('/');
    await pronto(page);
    const tirar = (n: string) =>
      page.screenshot({
        path: `${PASTA}/brinquedo-painel-${nomeVp}-${n}.jpg`,
        type: 'jpeg',
        quality: 80,
      });
    // o X do painel que está à vista (há um por painel, os outros escondidos)
    const fecharX = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll<HTMLElement>('.botao-fechar'))
          .find((b) => b.offsetParent !== null)
          ?.click(),
      );
    const fechar = async () => {
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);
    };
    // mundos, personagem e configurações a partir da tela inicial
    for (const [attr, n] of [
      ['data-abrir-mundos', 'mundos'],
      ['data-abrir-personagem', 'personagem'],
      ['data-abrir-config', 'config'],
    ] as const) {
      await page.locator(`[${attr}]`).first().click();
      await page.waitForTimeout(800);
      await tirar(n);
      await fechar();
      // o editor de personagem não fecha com Esc nem tem o X: sai pelo «Voltar»
      await page.evaluate(() => {
        const visivel = (el: HTMLElement | null) => !!el && el.offsetParent !== null;
        const voltar = document.querySelector<HTMLElement>('[data-voltar-titulo]');
        if (visivel(voltar)) voltar!.click();
        else
          Array.from(document.querySelectorAll<HTMLElement>('.botao-fechar'))
            .find((b) => b.offsetParent !== null)
            ?.click();
      });
      await page.waitForTimeout(300);
    }
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
    });
    await page.waitForTimeout(800);
    const abrirInv = () =>
      page.evaluate(() => document.querySelector<HTMLElement>('[data-funcao="KeyE"]')?.click());
    await abrirInv();
    await page.waitForTimeout(600);
    await tirar('inventario');
    await page.evaluate(() => document.querySelector<HTMLElement>('[data-livro]')?.click());
    await page.waitForTimeout(600);
    await tirar('livro');
    await fecharX();
    await page.waitForTimeout(400);
    // baú com alguns itens
    await page.evaluate(() => {
      const slots = Array.from({ length: 27 }, (_, i) =>
        i === 4 ? { item: 'carvao', qtd: 12 } : i === 10 ? { item: 'maca', qtd: 3 } : null,
      );
      window.dispatchEvent(
        new CustomEvent('brumaluz:conteiner', {
          detail: { conteiner: { tipo: 'bau', slots }, novo: true },
        }),
      );
    });
    await page.waitForTimeout(700);
    await tirar('bau');
    await fecharX();
    await page.waitForTimeout(400);
    // trocas com um morador
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('brumaluz:trocar', {
          detail: { profissao: 'ferreiro', nome: 'Tonho', criatura: 0 },
        }),
      ),
    );
    await page.waitForTimeout(700);
    await tirar('trocas');
    await fecharX();
    await page.waitForTimeout(400);
    // fornalha fundindo
    await page.evaluate(() =>
      window.dispatchEvent(
        new CustomEvent('brumaluz:conteiner', {
          detail: {
            conteiner: {
              tipo: 'fornalha',
              fornalha: {
                entrada: { item: 'ferro_bruto', qtd: 3 },
                combustivel: { item: 'carvao', qtd: 5 },
                saida: null,
                queima: 6,
                queimaTotal: 10,
                progresso: 0.45,
              },
            },
            novo: true,
          },
        }),
      ),
    );
    await page.waitForTimeout(700);
    await tirar('fornalha');
    await fecharX();
    await page.waitForTimeout(400);
    // jogar com amigos e entrar com código
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:amigos')));
    await page.waitForTimeout(700);
    await tirar('amigos');
    await fechar();
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:entrarCodigo')));
    await page.waitForTimeout(700);
    await tirar('codigo');
    await fechar();
    // pausa, modo foto e a tela de morte
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('brumaluz:pausar')));
    await page.waitForTimeout(700);
    await tirar('pausa');
    await page.evaluate(() =>
      document.querySelector<HTMLElement>('[data-pausa-continuar]')?.click(),
    );
    await page.waitForTimeout(400);
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' })));
    await page.waitForTimeout(800);
    await tirar('foto');
    await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyP' })));
    await page.waitForTimeout(400);
    await page.evaluate(() =>
      window.dispatchEvent(new CustomEvent('brumaluz:morte', { detail: 'queda' })),
    );
    await page.waitForTimeout(900);
    await tirar('morte');
    await page.evaluate(() => document.querySelector<HTMLElement>('[data-renascer]')?.click());
    await page.waitForTimeout(400);
    // diário e mapa grande
    await page.evaluate(() => document.querySelector<HTMLElement>('[data-funcao="KeyJ"]')?.click());
    await page.waitForTimeout(700);
    await tirar('diario');
    await fechar();
    await fecharX();
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector<HTMLElement>('[data-funcao="Tab"]')?.click());
    await page.waitForTimeout(900);
    await tirar('mapa');
    await ctx.close();
  });
}

for (const id of TEMAS) {
  test(`bichos de perto: ${id}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 960, height: 640 });
    await page.goto(`/?tema=${id}`);
    await pronto(page);
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.45;
      e.definirClima?.('limpo');
    });
    await page.waitForTimeout(1500);
    const inicio = await page.evaluate(() => window.__brumaluz!.posicao!);
    const tipos = ['cervo', 'coelho', 'raposa', 'espectro'] as const;
    for (const [n, tipo] of tipos.entries()) {
      // cada bicho numa direção (o anterior fica fora do quadro), no mesmo ponto em terra
      const yaw = (n * Math.PI) / 2;
      await page.evaluate(
        ({ tipo, yaw, inicio }) => {
          const e = window.__brumaluz!;
          e.hora = tipo === 'espectro' ? 0.92 : 0.45;
          e.teleportar!(inicio[0], inicio[2]);
          const [x, y, z] = e.posicao!;
          e.invocar!(tipo, x + Math.sin(yaw) * 2.4, y + 0.3, z + Math.cos(yaw) * 2.4);
          e.apontar!(yaw, 0.3);
        },
        { tipo, yaw, inicio },
      );
      await page.waitForTimeout(450);
      await foto(page, `perto-${id}-${tipo}`);
    }
  });
}

// fotos da vitrine dos temas (public/temas/<id>.jpg): manhã clara, sem interface
for (const id of TEMAS) {
  test(`vitrine do tema: ${id}`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 960, height: 540 });
    await page.goto(`/?tema=${id}`);
    await pronto(page);
    await page.evaluate(() => {
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.36;
      e.definirClima?.('limpo');
      const a = e.astro;
      if (!a) e.apontar!(0.6, -0.12);
      else {
        const n = Math.hypot(a[0], a[1], a[2]);
        e.apontar!(Math.atan2(a[0], a[2]), Math.min(-0.12, -Math.asin(a[1] / n) * 0.6));
      }
      // só o mundo: toda a interface some (o braço da vista também)
      const st = document.createElement('style');
      st.textContent =
        '#app > :not(canvas), body > :not(#app):not(script) { display: none !important; }';
      document.head.appendChild(st);
    });
    await page.waitForTimeout(4500);
    await page.screenshot({ path: `public/temas/${id}.jpg`, type: 'jpeg', quality: 80 });
  });
}

test('itens soltos de brinquedo', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto('/');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.45;
    const [x, y, z] = e.posicao!;
    const itens = ['picareta_ferro', 'maca', 'lingote_ouro', 'bloco:1', 'carvao', 'bloco:9'];
    itens.forEach((it, i) =>
      e.soltarItem?.(it, 1, x - 1.4 + (i % 3) * 1.4, y + 0.6, z + 4.2 + Math.floor(i / 3) * 1.2),
    );
    e.apontar!(0, 0.38);
  });
  await page.waitForTimeout(2500);
  await foto(page, 'itens-soltos');
});

test('tochas de brinquedo à noite', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto('/');
  await pronto(page);
  await page.evaluate(async () => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.9;
    const [x, y, z] = e.posicao!.map(Math.floor);
    for (const [dx, dz] of [
      [-1, 3],
      [1, 3],
      [0, 5],
    ])
      e.definirBloco!(x + dx, y, z + dz, 37);
    e.apontar!(0, 0.3);
  });
  await page.waitForTimeout(3000);
  await foto(page, 'tochas-noite');
});

for (const id of IDS_TEMAS) {
  test(`vitrine dos bichos: ${id}`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/?tema=${id}`);
    await pronto(page);
    await page.evaluate(async () => {
      document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
      const s = document.createElement('style');
      s.textContent =
        '#hud, .hud, [data-hud], .barra, .minimapa, .bussola { display: none !important; }';
      document.head.appendChild(s);
      const e = window.__brumaluz!;
      e.pausarDia = true;
      e.hora = 0.42;
      e.definirClima?.('limpo');
      const [x0, , z0] = e.posicao!.map(Math.floor);
      const y = 110;
      for (let dx = -6; dx <= 6; dx++)
        for (let dz = -2; dz <= 7; dz++) e.definirBloco!(x0 + dx, y, z0 + dz, 4);
      e.teleportar!(x0 + 0.5, z0 + 0.5, y + 1);
      await new Promise((r) => setTimeout(r, 800));
      const tipos = ['cervo', 'coelho', 'raposa', 'espectro', 'peixe'] as const;
      // de três quartos, virados para o jogador, um ao lado do outro
      tipos.forEach((t, i) =>
        e.estatua!(t, x0 + 0.5 - 4.4 + i * 2.2, y + 1, z0 + 6, Math.PI - 0.5),
      );
      e.apontar!(0, 0.22);
    });
    await page.waitForTimeout(3000);
    await foto(page, `vitrine-${id}`);
    await page.evaluate(() => {
      window.__brumaluz!.hora = 0.92;
    });
    await page.waitForTimeout(2500);
    await foto(page, `vitrine-noite-${id}`);
  });
}

test('flor e cogumelo na mão', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto('/');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.apontar!(0, 0.1);
  });
  await page.keyboard.press('Digit8');
  await page.waitForTimeout(1500);
  await foto(page, 'mao-flor');
  await page.keyboard.press('Digit9');
  await page.waitForTimeout(1200);
  await foto(page, 'mao-cogumelo');
  await page.keyboard.press('Digit8');
  await page.evaluate(() => {
    const f = window.__brumaluz!.modoFoto!;
    if (!f.ativo()) f.alternar();
    f.selfie();
  });
  await page.waitForTimeout(1500);
  await foto(page, 'mao-flor-selfie');
});

test('blocos com forma na mão', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 960, height: 600 });
  await page.goto('/');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    [56, 57, 59, 60, 61, 37, 36].forEach((b, i) =>
      e.inventario!.definir(i, { item: `bloco:${b}`, qtd: 1 }),
    );
    e.apontar!(0, 0.1);
  });
  for (const [i, nome] of [
    'cama',
    'porta',
    'escada',
    'laje',
    'cerca',
    'tocha',
    'vidro',
  ].entries()) {
    await page.evaluate((i) => window.__brumaluz!.selecionarSlot!(i), i);
    await page.waitForTimeout(900);
    await foto(page, `mao-forma-${nome}`);
  }
  await page.evaluate(() => {
    window.__brumaluz!.selecionarSlot!(1);
    const f = window.__brumaluz!.modoFoto!;
    if (!f.ativo()) f.alternar();
    f.selfie();
  });
  await page.waitForTimeout(1500);
  await foto(page, 'mao-forma-porta-selfie');
});

test('celular em pé: informações recolhidas num botão', async ({ browser }) => {
  test.setTimeout(240_000);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.goto('/');
  await pronto(page);
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
  });
  await page.touchscreen.tap(195, 420);
  await page.waitForTimeout(1500);
  await foto(page, 'celular-em-pe-recolhido');
  await page.locator('[data-hud-info]').tap();
  await page.waitForTimeout(400);
  await foto(page, 'celular-em-pe-aberto');
  await ctx.close();
});
