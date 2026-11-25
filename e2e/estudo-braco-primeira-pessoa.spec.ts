import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * Estudo da spec 037: o braço na primeira pessoa, a partir do boneco de verdade. Não muda o
 * jogo nem o esboço: abre `?esboco=primeira-pessoa` só para ter o gancho da câmera e o braço
 * do segundo boneco, e põe por cima, a cada quadro, a conta do estudo.
 *
 *   ESTUDO_BRACO=1
 *
 * 1. A primeira pessoa verdadeira: a câmera nos olhos do boneco de verdade (o ponto entre os
 *    olhos, logo atrás do rosto), a cabeça escondida e o resto do corpo e os dois braços de
 *    verdade, nas poses da terceira pessoa. Com o campo de visão de hoje (70°) e com 90° e 110°.
 *    Mede, nos mesmos quadros, as juntas do braço e onde ficam os olhos, o ombro e a mão.
 * 2. Os desenhos (de lado e de cima) gerados dessas medidas.
 * 3. A recomendação: o braço de verdade (tamanho e proporção do boneco), girando num ombro fixo
 *    fora da tela, com os ângulos de junta da terceira pessoa. Confere, quadro a quadro, que o
 *    ombro (com a grossura da manga) fica fora da tela, em pé, deitado e no computador.
 */
declare const process: { env: Record<string, string | undefined> };
const PASTA = 'capturas-037/estudo';
test.skip(!process.env.ESTUDO_BRACO, 'estudo do braço só com ESTUDO_BRACO');
test.describe.configure({ mode: 'serial' });
test.setTimeout(1_200_000);

/** As medidas do boneco (do plano, em blocos, já com a escala 1,15). */
const BONECO = {
  olhos: [0, 1.207, 0.38],
  centroCabeca: [0, 1.253, 0],
  cabeca: [0.828, 0.782, 0.747],
  ombroD: [0.322, 0.782, 0],
  ombroAteMao: 0.31,
  raioMao: 0.098,
  manga: [0.149, 0.299, 0.161],
  peito: { centroY: 0.632, tam: [0.529, 0.483, 0.391] },
  quadrilY: 0.391,
};

/**
 * A recomendação: o ombro do braço, fixo no espaço da câmera (x direita, y cima, z frente), por
 * forma de tela. Sai da conta em `.sdd/specs/037-construir-melhor/referencia/conta-braco.mjs`:
 * a maior distância (a menor mão) com a mão de segurar no canto de baixo à direita, acima dos
 * botões, e o ombro, com a grossura da manga, fora da tela e na frente do plano de corte.
 */
const OMBRO_REC: Record<string, [number, number, number]> = {
  emPe: [0.594, -0.307, 1.466],
  deitado: [1.3, -0.098, 0.778],
  computador: [1.15, -0.255, 0.83],
};
/** As juntas do braço na recomendação (rad, como no boneco: x leva para a frente, z abre). */
const JUNTAS_REC = {
  segurar: [-1.24, -0.69],
  acenar: [-2.2, -1.0],
  comer: [-1.8, -0.69],
};

async function abrir(browser: Browser, w: number, h: number, toque = true, hora = 0.42) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: toque,
    isMobile: toque,
    deviceScaleFactor: toque ? 2 : 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (err) => console.log('erro na página:', String(err)));
  await page.goto('/?esboco=primeira-pessoa');
  await page.waitForFunction(
    () => window.__brumaluz?.ready === true && !!window.__primeiraPessoa,
    undefined,
    { timeout: 180_000 },
  );
  await page.evaluate((hora) => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    document.body.classList.remove('tela-titulo');
    if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('toque-ativo');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = hora;
    e.definirClima?.('limpo');
    // (os botões de opção do esboço não entram nas fotos do estudo)
    const o = document.querySelector('.esb-pp-opcoes') as HTMLElement | null;
    if (o) o.style.display = 'none';
  }, hora);
  let antes = -1;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 10) break;
    antes = n;
  }
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    e.inventario!.definir(0, null);
    e.inventario!.definir(1, { item: 'bloco:7', qtd: 64 });
    e.inventario!.definir(2, { item: 'bloco:43', qtd: 64 });
    e.inventario!.definir(3, { item: 'maca', qtd: 8 });
    e.selecionarSlot!(0);
  });
  return { ctx, page };
}

/**
 * Instala o estudo por cima do quadro do esboço. `modo`: 'verdadeira' (a câmera nos olhos, o
 * corpo de verdade) ou 'recomendada' (a câmera nos olhos e o braço de verdade girando no ombro
 * fixo da recomendação). Tudo o que o estudo precisa do Babylon vem dos objetos da cena.
 */
async function instalar(p: Page) {
  await p.evaluate(() => {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const w = window as any;
    if (w.__estudo) return;
    const g = w.__brumaluz.primeiraPessoa;
    const scene = g.scene;
    const V = g.visao.position.constructor as any;
    const no = (n: string) => scene.getTransformNodeByName(n);
    // (o braço da frente do esboço sem a parte de cima: uma peça só, a do boneco; o esboço final
    // já não tem as opções, e este estudo fica como registro da conta)
    w.__primeiraPessoa.opcao?.('2');
    const est: any = {
      modo: 'nada',
      fov: 70,
      ombro: [0.428, -0.255, 0.962],
      juntas: { segurar: [-1.24, -0.69], acenar: [-2.3, -0.5], comer: [-1.5, -0.69] },
      vigia: { quadros: 0, menorFolgaPx: Infinity },
      medida: null as any,
    };
    w.__estudo = est;
    const original = g.quadro;
    /** O ponto entre os olhos, logo atrás do rosto (no espaço da cabeça, sem a escala). */
    const olhoNaCabeca = new V(0, -0.04, 0.3);
    const olhosDoBoneco = () => {
      const cab = no('personagem-junta-cabeca');
      cab.computeWorldMatrix(true);
      return V.TransformCoordinates(olhoNaCabeca, cab.getWorldMatrix());
    };
    const naFrente = (p: any) => {
      const j = g.jogador();
      const yaw = w.__brumaluz.yawBoneco();
      const d = p.subtract(new V(j.x, j.y, j.z));
      return [
        +(d.x * Math.cos(yaw) - d.z * Math.sin(yaw)).toFixed(3),
        +d.y.toFixed(3),
        +(d.x * Math.sin(yaw) + d.z * Math.cos(yaw)).toFixed(3),
      ];
    };
    est.medir = () => {
      const b = no('personagem-junta-bracoD');
      const m = no('personagem-junta-maoD');
      b.computeWorldMatrix(true);
      m?.computeWorldMatrix(true);
      // (a mão fundida no braço: a junta da mão pode não existir; a ponta fica 0,27 abaixo)
      const mao = m ? m.getAbsolutePosition() : V.TransformCoordinates(new V(0, -0.27, 0), b.getWorldMatrix());
      return {
        juntaBracoD: [b.rotation.x, b.rotation.y, b.rotation.z].map((x: number) => +x.toFixed(3)),
        olhos: naFrente(olhosDoBoneco()),
        ombro: naFrente(b.getAbsolutePosition()),
        mao: naFrente(mao),
        olhar: [+g.olhos.rotation.x.toFixed(3)],
      };
    };
    let antes = 0;
    g.quadro = (dt: number) => {
      original(dt);
      const modo = est.modo;
      if (modo === 'nada') {
        if (antes) {
          no('personagem-junta-cabeca')?.setEnabled(true);
          g.travarYaw(null);
        }
        antes = 0;
        return;
      }
      antes = 1;
      const tela = scene.getEngine().getRenderingCanvas().getBoundingClientRect();
      // a câmera nos olhos de verdade, com o corpo virado para onde ela olha
      g.travarYaw(g.olhos.rotation.y);
      g.visao.position.copyFrom(olhosDoBoneco());
      g.visao.rotation.x = g.olhos.rotation.x;
      g.visao.fov = (est.fov * Math.PI) / 180;
      g.personagem.definirOpacidade(1);
      if (modo === 'verdadeira') {
        // só a cabeça some; o corpo e os dois braços de verdade ficam
        no('personagem-junta-cabeca')?.setEnabled(false);
        no('personagem-junta-bracoD')?.setEnabled(true);
        no('personagem-junta-bracoE')?.setEnabled(true);
        return;
      }
      // recomendada: o braço da frente (o do segundo boneco, o mesmo do jogador) no tamanho de
      // verdade, girando no ombro fixo, com os ângulos de junta da terceira pessoa
      const osso = no('esb-pp-ossoD');
      if (!osso) return;
      const Q = osso.rotationQuaternion.constructor as any;
      const real = no('personagem-junta-bracoD');
      const v = g.vista();
      const gesto = g.gesto();
      const segurando = g.naMao().bloco !== null || g.naMao().item !== null;
      // o quanto a terceira pessoa se afasta do descanso (o passo, o empurrão de colocar, o pulo)
      const descansoX = segurando ? -0.32 : 0;
      const dx = real.rotation.x - descansoX;
      const dz = real.rotation.z - 0.09;
      let [x, z] = est.juntas.segurar;
      if (gesto) {
        // o aceno: o braço sobe para a frente e a mão abana com o mesmo balanço da terceira pessoa
        x = est.juntas.acenar[0];
        z = est.juntas.acenar[1] + (real.rotation.z - 2.6);
      } else if (v.comer !== null) {
        // comendo: os ângulos da terceira pessoa (o braço leva a comida para o meio)
        x = est.juntas.comer[0];
        z = est.juntas.comer[1];
      } else if (v.colocar !== null || v.golpe !== null) {
        x += dx * 0.35;
      } else {
        // o passo e o pulo vêm do corpo, bem menores (só um sobe e desce, nada de lado)
        x += dx * 0.12;
        z += Math.max(0, dz) * 0.25;
      }
      const peso = w.__primeiraPessoa.maos().direita;
      // entrando e saindo: o braço gira do ombro para baixo (a mão some pela beira de baixo)
      x = x + (0.2 - x) * (1 - peso);
      const ombro = est.ombro;
      osso.position.set(ombro[0], ombro[1], ombro[2]);
      osso.scaling.setAll(1.15);
      osso.rotationQuaternion = Q.RotationYawPitchRoll(0, x, z);
      // a mão e o item de pé (como na terceira pessoa, o bloco à frente da mão)
      const mao = no('esb-pp-junta-maoD');
      if (mao) mao.rotationQuaternion = Q.Inverse(osso.rotationQuaternion);
      const pega = no('esb-pp-pega');
      if (pega) pega.scaling.setAll(1);
      // a conferência: o ombro, com a grossura da manga (0,11), fora da tela
      if (peso > 0.02) {
        const tanV = Math.tan(g.visao.fov / 2);
        const tanH = tanV * (tela.width / tela.height);
        const sx = (tela.width / 2) * (1 + ombro[0] / (ombro[2] * tanH));
        const sy = (tela.height / 2) * (1 - ombro[1] / (ombro[2] * tanV));
        const rp = (0.11 / (ombro[2] * tanV)) * (tela.height / 2);
        const folga = Math.max(-sx, sx - tela.width, -sy, sy - tela.height) - rp;
        est.vigia.quadros++;
        est.vigia.menorFolgaPx = Math.min(est.vigia.menorFolgaPx, folga);
      }
    };
  });
}

const olhar = (p: Page, yaw: number, pitch: number) =>
  p.evaluate(([y, pi]) => window.__brumaluz!.apontar!(y, pi), [yaw, pitch] as const);
const rot = (p: Page) => p.evaluate(() => window.__brumaluz!.rotacao as [number, number]);
async function girar(p: Page, dyaw: number, dpitch: number, ms: number) {
  const [pi0, y0] = await rot(p);
  const passos = Math.max(1, Math.round(ms / 50));
  for (let i = 1; i <= passos; i++) {
    const k = i / passos;
    const s = k * k * (3 - 2 * k);
    await olhar(p, y0 + dyaw * s, pi0 + dpitch * s);
    await p.waitForTimeout(50);
  }
}
const mover = (p: Page, f: number) =>
  p.evaluate((f) => window.__brumaluz!.controleDireto!.mover(f, 0), f);
const slot = (p: Page, i: number) => p.evaluate((i) => window.__brumaluz!.selecionarSlot!(i), i);
const modo = (p: Page, m: string, fov = 70) =>
  p.evaluate(
    ([m, fov]) => {
      const e = (window as unknown as { __estudo: { modo: string; fov: number } }).__estudo;
      e.modo = m as string;
      e.fov = fov as number;
    },
    [m, fov] as const,
  );
const medir = (p: Page) =>
  p.evaluate(() => (window as unknown as { __estudo: { medir(): unknown } }).__estudo.medir());

type Momento = 'parado' | 'segurando' | 'andando' | 'pulando' | 'colocando' | 'acenando' | 'comendo';

/**
 * Leva o boneco a um momento (a partir de parado, olhando reto) e chama `foto` no meio dele.
 * Devolve as medidas do braço de verdade naquele quadro.
 */
async function momento(p: Page, m: Momento, foto: () => Promise<unknown>) {
  let medida: unknown = null;
  const agora = async () => {
    medida = await medir(p);
    await foto();
  };
  if (m === 'parado') {
    await slot(p, 0);
    await p.waitForTimeout(900);
    await agora();
  } else if (m === 'segurando') {
    await slot(p, 1);
    await p.waitForTimeout(1000);
    await agora();
  } else if (m === 'andando') {
    await slot(p, 1);
    await mover(p, 0.6);
    await p.waitForTimeout(900);
    await agora();
    await mover(p, 0);
    await p.waitForTimeout(900);
  } else if (m === 'pulando') {
    await slot(p, 1);
    await p.waitForTimeout(400);
    await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', true));
    await p.waitForTimeout(200);
    await p.evaluate(() => window.__brumaluz!.controleDireto!.tecla('pular', false));
    await p.waitForTimeout(40);
    await agora();
    await p.waitForTimeout(1200);
  } else if (m === 'colocando') {
    // (põe o bloco para o lado esquerdo: ele não fica na frente das outras fotos)
    await slot(p, 1);
    await girar(p, -1.3, 0.4, 600);
    await p.waitForTimeout(500);
    await p.evaluate(() => window.__brumaluz!.controleDireto!.usar());
    await p.waitForTimeout(60);
    await agora();
    await p.waitForTimeout(700);
    await girar(p, 1.3, -0.4, 600);
    await p.waitForTimeout(300);
  } else if (m === 'acenando') {
    await slot(p, 0);
    await p.waitForTimeout(700);
    await p.evaluate(() => window.__brumaluz!.gestos!.fazer('acenar'));
    await p.waitForTimeout(650);
    await agora();
    await p.waitForTimeout(1500);
  } else if (m === 'comendo') {
    await slot(p, 3);
    await p.waitForTimeout(900);
    await p.evaluate(() => window.__brumaluz!.comer!());
    await p.waitForTimeout(900);
    await agora();
    await p.waitForTimeout(2600);
  }
  return medida;
}

const MOMENTOS: Momento[] = ['parado', 'segurando', 'andando', 'pulando', 'colocando', 'acenando', 'comendo'];

test('estudo: a primeira pessoa verdadeira e as medidas do braço', async ({ browser }) => {
  mkdirSync(PASTA, { recursive: true });
  const { ctx, page: p } = await abrir(browser, 390, 844);
  await instalar(p);
  const medidas: Record<string, unknown> = {};
  // a terceira pessoa de cada momento (para a tabela e os desenhos): a câmera de hoje, de trás
  await olhar(p, 0.6, 0.05);
  for (const m of MOMENTOS)
    medidas[m] = await momento(p, m, () => p.screenshot({ path: `${PASTA}/terceira-${m}.png` }));
  // a primeira pessoa verdadeira, com o campo de visão de hoje e com mais dois
  await modo(p, 'verdadeira', 70);
  await olhar(p, 0.6, 0.05);
  await p.waitForTimeout(800);
  for (const m of MOMENTOS) await momento(p, m, () => p.screenshot({ path: `${PASTA}/verdadeira-70-${m}.png` }));
  for (const fov of [90, 110]) {
    await modo(p, 'verdadeira', fov);
    for (const m of ['segurando', 'acenando', 'comendo'] as Momento[])
      await momento(p, m, () => p.screenshot({ path: `${PASTA}/verdadeira-${fov}-${m}.png` }));
  }
  // olhando para baixo, com o campo de hoje: onde o braço de verdade está
  await modo(p, 'verdadeira', 70);
  await slot(p, 1);
  await girar(p, 0, 0.9, 600);
  await p.waitForTimeout(700);
  medidas['olhandoParaBaixo'] = await medir(p);
  await p.screenshot({ path: `${PASTA}/verdadeira-70-olhando-para-baixo.png` });
  await girar(p, 0, -0.9, 600);
  writeFileSync(`${PASTA}/medidas-terceira-pessoa.json`, JSON.stringify(medidas, null, 1));
  console.log('medidas', JSON.stringify(medidas));
  await ctx.close();
});

/** A recomendação nas três telas: as fotos e a conferência do ombro, quadro a quadro. */
test('estudo: a recomendação e a conferência do ombro', async ({ browser }) => {
  const telas: [string, number, number, boolean][] = [
    ['emPe', 390, 844, true],
    ['deitado', 844, 390, true],
    ['computador', 1280, 720, false],
  ];
  const vigias: Record<string, unknown> = {};
  for (const [nome, w, h, toque] of telas) {
    const { ctx, page: p } = await abrir(browser, w, h, toque);
    await instalar(p);
    await p.evaluate(
      ([o, j]) => {
        const e = (window as unknown as { __estudo: { ombro: unknown; juntas: unknown } }).__estudo;
        e.ombro = o;
        e.juntas = j;
      },
      [OMBRO_REC[nome], JUNTAS_REC] as const,
    );
    await olhar(p, 0.6, 0.05);
    await p.evaluate(() => window.__primeiraPessoa!.primeira(true));
    await modo(p, 'recomendada', 70);
    await p.waitForTimeout(1200);
    await p.evaluate(() => {
      const e = (window as unknown as { __estudo: { vigia: { quadros: number; menorFolgaPx: number } } }).__estudo;
      e.vigia = { quadros: 0, menorFolgaPx: Infinity };
    });
    const lista: Momento[] = nome === 'emPe' ? ['segurando', 'andando', 'pulando', 'colocando', 'acenando', 'comendo'] : ['segurando', 'colocando', 'acenando', 'comendo'];
    for (const m of lista)
      await momento(p, m, () =>
        nome === 'emPe' || m === 'segurando'
          ? p.screenshot({ path: `${PASTA}/recomendada-${nome}-${m}.png` })
          : Promise.resolve(),
      );
    // olhar em volta, para cima e para baixo
    await slot(p, 1);
    await girar(p, 1.2, 0.3, 900);
    await girar(p, -1.2, -0.6, 900);
    await girar(p, 0, 0.3, 400);
    const v = await p.evaluate(
      () => (window as unknown as { __estudo: { vigia: { quadros: number; menorFolgaPx: number } } }).__estudo.vigia,
    );
    vigias[nome] = { ...v, menorFolgaPx: Math.round(v.menorFolgaPx) };
    console.log('vigia do ombro', nome, JSON.stringify(vigias[nome]));
    expect(v.quadros).toBeGreaterThan(60);
    expect(v.menorFolgaPx).toBeGreaterThan(0);
    // de noite, segurando o bloco (só em pé)
    await ctx.close();
  }
  writeFileSync(`${PASTA}/conferencia-ombro.json`, JSON.stringify(vigias, null, 1));
  {
    const { ctx, page: p } = await abrir(browser, 390, 844, true, 0.95);
    await instalar(p);
    await olhar(p, 0.6, 0.05);
    await p.evaluate(() => window.__primeiraPessoa!.primeira(true));
    await modo(p, 'recomendada', 70);
    await slot(p, 1);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${PASTA}/recomendada-emPe-noite-segurando.png` });
    await ctx.close();
  }
});

/** Os desenhos (de lado e de cima) e a prancha final, montados das medidas e das fotos. */
test('estudo: os desenhos e a prancha', async ({ browser }) => {
  const medidas = JSON.parse(readFileSync(`${PASTA}/medidas-terceira-pessoa.json`, 'utf8')) as Record<
    string,
    { olhos: number[]; ombro: number[]; mao: number[]; juntaBracoD: number[]; olhar: number[] }
  >;
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await ctx.newPage();
  const png = async (html: string, nome: string) => {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
      body { margin: 0; padding: 16px; background: #faf7f0; font: 600 15px system-ui, sans-serif; color: #2a2f3a; }
      h1 { font-size: 20px; margin: 0 0 6px; } p { margin: 0 0 10px; font-weight: 500; }
      .g { display: grid; gap: 10px; } .c { background: #fff; border-radius: 10px; padding: 8px; }
      .c b { display: block; text-align: center; margin-bottom: 4px; }
      img { width: 100%; display: block; border-radius: 8px; }
      svg text { font: 500 11px system-ui, sans-serif; fill: #2a2f3a; }
    </style></head><body>${html}</body></html>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${PASTA}/${nome}.png`, fullPage: true });
  };
  // ---- desenho de um momento, de lado (z para a direita, y para cima) ou de cima (x, z)
  const cone = (o: number[], ang: number, meio: number, alcance: number, conv: (p: number[]) => string) => {
    const a = conv(o);
    const b = conv([o[0] + Math.cos(meio + ang) * alcance, o[1] + Math.sin(meio + ang) * alcance]);
    const c = conv([o[0] + Math.cos(meio - ang) * alcance, o[1] + Math.sin(meio - ang) * alcance]);
    return `<path d="M${a} L${b} L${c} Z" fill="rgba(255,200,60,0.22)" stroke="#e0a400" stroke-width="1"/>`;
  };
  const corpo = {
    lado: [
      // [z0, y0, z1, y1]: as pernas, o peito, a cabeça
      [-0.1, 0, 0.1, 0.39, '#4d6aa8'],
      [-0.196, 0.39, 0.196, 0.874, '#3f7be0'],
      [-0.374, 0.862, 0.374, 1.644, '#f0c9a0'],
    ],
    cima: [
      [-0.265, -0.196, 0.265, 0.196, '#3f7be0'],
      [-0.414, -0.374, 0.414, 0.374, 'rgba(240,201,160,0.6)'],
    ],
  };
  const desenho = (
    titulo: string,
    vista: 'lado' | 'cima',
    olho: number[],
    ombro: number[],
    mao: number[],
    olharPitch: number,
    fovV: number,
    aspecto: number,
    comCorpo = true,
  ) => {
    const W = 240;
    const H = 240;
    // (no espaço da câmera o braço fica mais longe: a escala do desenho é menor)
    const esc = comCorpo ? 120 : 95;
    const alcance = comCorpo ? 1.4 : 2.3;
    // lado: horizontal = z (frente), vertical = y; cima: horizontal = x, vertical = z
    // (no espaço da câmera, sem o corpo, a câmera fica na beira esquerda ou embaixo)
    const conv = (q: number[]) =>
      vista === 'lado'
        ? (comCorpo ? [W * 0.35 + q[0] * esc, H - 14 - q[1] * esc] : [W * 0.06 + q[0] * esc, H * 0.5 - q[1] * esc])
            .map((v) => v.toFixed(1))
            .join(',')
        : (comCorpo ? [W * 0.5 + q[0] * esc, H * 0.62 - q[1] * esc] : [W * 0.5 + q[0] * esc, H * 0.95 - q[1] * esc])
            .map((v) => v.toFixed(1))
            .join(',');
    let s = '';
    if (comCorpo)
      for (const [a0, b0, a1, b1, cor] of corpo[vista]) {
        const p0 = conv([a0 as number, b0 as number]).split(',').map(Number);
        const p1 = conv([a1 as number, b1 as number]).split(',').map(Number);
        s += `<rect x="${Math.min(p0[0], p1[0])}" y="${Math.min(p0[1], p1[1])}" width="${Math.abs(p1[0] - p0[0])}" height="${Math.abs(p1[1] - p0[1])}" rx="6" fill="${cor}" opacity="0.55"/>`;
      }
    const meiaV = ((fovV / 2) * Math.PI) / 180;
    const meiaH = Math.atan(Math.tan(meiaV) * aspecto);
    if (vista === 'lado') s += cone([olho[2], olho[1]], meiaV, -olharPitch, alcance, conv);
    else s += cone([olho[0], olho[2]], meiaH, Math.PI / 2, alcance, conv);
    const P = (q: number[]) => (vista === 'lado' ? [q[2], q[1]] : [q[0], q[2]]);
    const [so, ma, ol] = [conv(P(ombro)), conv(P(mao)), conv(P(olho))];
    s += `<line x1="${so.split(',')[0]}" y1="${so.split(',')[1]}" x2="${ma.split(',')[0]}" y2="${ma.split(',')[1]}" stroke="#1f3f8f" stroke-width="${(0.15 * esc).toFixed(1)}" stroke-linecap="round" opacity="0.85"/>`;
    s += `<circle cx="${ma.split(',')[0]}" cy="${ma.split(',')[1]}" r="${(0.098 * esc).toFixed(1)}" fill="#e8b48a" stroke="#7a4b2a"/>`;
    s += `<circle cx="${so.split(',')[0]}" cy="${so.split(',')[1]}" r="4" fill="#c0392b"/>`;
    s += `<circle cx="${ol.split(',')[0]}" cy="${ol.split(',')[1]}" r="4" fill="#111"/>`;
    return `<div class="c"><b>${titulo}</b><svg viewBox="0 0 ${W} ${H}" width="100%">${s}<text x="6" y="14">${vista === 'lado' ? 'de lado (frente →)' : 'de cima (frente ↑)'}</text></svg></div>`;
  };
  const nomes: Record<string, string> = {
    parado: 'Parado',
    segurando: 'Segurando o bloco',
    andando: 'Andando',
    pulando: 'Pulando',
    colocando: 'Colocando',
    acenando: 'Acenando',
    comendo: 'Comendo',
  };
  let celulas = '';
  for (const vista of ['lado', 'cima'] as const)
    for (const m of MOMENTOS) {
      const d = medidas[m];
      celulas += desenho(nomes[m], vista, d.olhos, d.ombro, d.mao, d.olhar[0], 70, 390 / 844);
    }
  await png(
    `<h1>A primeira pessoa verdadeira: o braço de verdade e o cone de visão (70°, celular em pé)</h1>
    <p>Medido no jogo, no corpo do boneco (blocos). Ponto preto: os olhos; vermelho: o ombro; o braço e a mão em azul e pele; amarelo: o que a câmera vê. A mão nunca entra no cone, a não ser comendo.</p>
    <div class="g" style="grid-template-columns: repeat(7, 1fr)">${celulas}</div>`,
    'desenho-verdadeira',
  );
  // ---- a recomendação, no espaço da câmera (a câmera na origem)
  const ombro = OMBRO_REC.emPe;
  const dirJ = (x: number, z: number) => [Math.sin(z), -Math.cos(z) * Math.cos(x), -Math.cos(z) * Math.sin(x)];
  const poseRec: [string, number, number][] = [
    ['Segurando', ...JUNTAS_REC.segurar] as [string, number, number],
    ['Colocando', JUNTAS_REC.segurar[0] - 0.32, JUNTAS_REC.segurar[1]],
    ['Acenando', ...JUNTAS_REC.acenar] as [string, number, number],
    ['Comendo', ...JUNTAS_REC.comer] as [string, number, number],
  ];
  let rec = '';
  for (const vista of ['lado', 'cima'] as const)
    for (const [t, x, z] of poseRec) {
      const d = dirJ(x, z);
      const mao = ombro.map((s, i) => s + d[i] * 0.31);
      // (no espaço da câmera: o "corpo" não entra; o olho é a origem)
      rec += desenho(t, vista, [0, 0, 0], ombro, mao, 0, 70, 390 / 844, false);
    }
  await png(
    `<h1>A recomendação, no espaço da câmera (celular em pé, 70°)</h1>
    <p>A câmera é o ponto preto. O ombro (vermelho) fica fixo fora do cone, pela direita (veja de cima), um tico abaixo do meio; o braço de verdade (0,31 bloco, mão de raio 0,098) gira nele com os ângulos de junta da terceira pessoa. A mão entra no cone; o ombro nunca.</p>
    <div class="g" style="grid-template-columns: repeat(4, 1fr)">${rec}</div>`,
    'desenho-recomendada',
  );
  // ---- a prancha final: a primeira pessoa verdadeira ao lado da recomendação
  const img = (n: string) =>
    existsSync(`${PASTA}/${n}.png`) ? `<img src="data:image/png;base64,${readFileSync(`${PASTA}/${n}.png`, 'base64')}">` : '<div>(sem foto)</div>';
  const cinco: [string, Momento][] = [
    ['Parado com o bloco', 'segurando'],
    ['Andando', 'andando'],
    ['Colocando', 'colocando'],
    ['Acenando', 'acenando'],
    ['Comendo', 'comendo'],
  ];
  await png(
    `<h1>Primeira pessoa: a verdadeira (em cima) e a recomendação (embaixo), celular em pé, 70°</h1>
    <div class="g" style="grid-template-columns: repeat(5, 1fr)">
      ${cinco.map(([t, m]) => `<div class="c"><b>${t}</b>${img(`verdadeira-70-${m}`)}</div>`).join('')}
      ${cinco.map(([t, m]) => `<div class="c"><b>${t}</b>${img(`recomendada-emPe-${m}`)}</div>`).join('')}
    </div>`,
    'prancha-verdadeira-e-recomendada',
  );
  await ctx.close();
});
