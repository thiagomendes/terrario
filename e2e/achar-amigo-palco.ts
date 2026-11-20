import { expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * O palco dos testes da spec 021 "Achar o amigo": abre o jogo, vai para o Rancho com morros,
 * põe amigos de mentirinha (o gancho `amigosDeTeste`) e tira fotos conferindo que nenhuma
 * carinha tapa o HUD. Pasta: ACHAR_PASTA (padrão capturas-021, fora de test-results, que o Playwright limpa).
 */
declare const process: { env: Record<string, string | undefined> };
export const PASTA = process.env.ACHAR_PASTA ?? 'capturas-021';

/** Os 7 amigos (sala de 8): cada um com a fantasia e o cabelo dele. */
export const AMIGOS: Record<string, Record<string, unknown>> = {
  lia: { corpo: 'feminino', cabeloEstilo: 5, cabeloCor: 1, pele: 1, rosto: 1, fantasia: { id: 'fazendeira', cor: 0 } },
  // spec 034: o Theo era de Dino (saiu com a Era dos Dinos); agora é roqueiro da Vila
  theo: { corpo: 'masculino', cabeloEstilo: 0, cabeloCor: 0, pele: 2, fantasia: { id: 'roqueira-palco', cor: 0 } },
  bia: { corpo: 'feminino', cabeloEstilo: 2, cabeloCor: 3, pele: 0, fantasia: { id: 'realeza-flores', cor: 0 } },
  gui: { corpo: 'masculino', cabeloEstilo: 1, cabeloCor: 2, pele: 3, fantasia: { id: 'astronauta', cor: 0 } },
  nina: { corpo: 'feminino', cabeloEstilo: 7, cabeloCor: 4, pele: 2, fantasia: { id: 'heroi-coracao', cor: 1 } },
  davi: { corpo: 'masculino', cabeloEstilo: 4, cabeloCor: 1, pele: 1, fantasia: { id: 'vaqueira', cor: 0 } },
  malu: { corpo: 'feminino', cabeloEstilo: 3, cabeloCor: 0, pele: 4, fantasia: { id: 'confeiteira', cor: 0 } },
};

/** Rancho com morros e árvores soltas (achado pela sonda do esboço). */
export const MORROS: [number, number] = [642, -593];
export const MATA: [number, number] = [782, 807];

export interface Base {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export async function abrir(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem(
        'terrario:config',
        JSON.stringify({ distancia: 7, mostrarFps: true, qualidade: 'alta', mostrarAtalhos: false }),
      );
    } catch {
      // sem armazenamento
    }
  });
  page.on('pageerror', (err) => console.log('erro na página:', String(err)));
  page.on('console', (m) => {
    if (m.text().startsWith('achar')) console.log(m.text().slice(0, 1500));
  });
  await page.goto('/?tema=rancho-alegre');
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 180_000,
  });
  await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.42;
    e.definirClima?.('limpo');
    // os amigos de mentirinha seguem na tela (o quadro do núcleo local não traz ninguém)
    const w = window as unknown as { __amigosPostos?: unknown[] };
    setInterval(() => {
      if (w.__amigosPostos?.length) e.amigosDeTeste!(w.__amigosPostos as never);
    }, 300);
  });
}

export async function esperarChunks(page: Page) {
  let antes = -1;
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(1500);
    const n = await page.evaluate(() => window.__brumaluz!.chunksCarregados ?? 0);
    if (n === antes && n > 20) break;
    antes = n;
  }
}

/** Vai para perto de (x, z), num chão aberto, olhando para yaw. */
export async function irPara(page: Page, [x, z]: [number, number], yaw: number): Promise<Base> {
  await page.evaluate(([x, z]) => window.__brumaluz!.teleportar!(x, z), [x, z] as const);
  await esperarChunks(page);
  const b = await page.evaluate(
    ([x0, z0, yaw]) => {
      const e = window.__brumaluz!;
      const chao = (x: number, z: number) => {
        for (let y = 120; y > 2; y--) {
          const de = e.bloco!(Math.floor(x), y - 1, Math.floor(z));
          if (de && de !== 67 && ![5, 28, 30, 35, 55].includes(de) && !e.bloco!(Math.floor(x), y, Math.floor(z)) && !e.bloco!(Math.floor(x), y + 1, Math.floor(z)))
            return y;
        }
        return null;
      };
      for (let r = 0; r < 40; r += 2)
        for (let k = 0; k < 16; k++) {
          const x = Math.floor(x0 + Math.cos((k / 16) * Math.PI * 2) * r) + 0.5;
          const z = Math.floor(z0 + Math.sin((k / 16) * Math.PI * 2) * r) + 0.5;
          const y = chao(x, z);
          if (y === null) continue;
          let aberto = true;
          const raio = r < 16 ? 4 : 2;
          for (let dx = -raio; dx <= raio && aberto; dx++)
            for (let dz = -raio; dz <= raio && aberto; dz++)
              for (let dy = 0; dy < 3; dy++) {
                const bl = e.bloco!(Math.floor(x) + dx, y + dy, Math.floor(z) + dz);
                if (bl && bl !== 8 && bl !== 9 && bl !== 54) {
                  aberto = false;
                  break;
                }
              }
          if (!aberto) continue;
          e.teleportar!(x, z, y);
          e.apontar!(yaw, 0.18);
          return { x, y, z, yaw };
        }
      return null;
    },
    [x, z, yaw] as const,
  );
  if (!b) throw new Error('sem chão aberto');
  await page.waitForTimeout(800);
  return b;
}

export async function voltar(page: Page, b: Base) {
  await page.evaluate((b) => {
    const e = window.__brumaluz!;
    e.teleportar!(b.x, b.z, b.y);
    e.apontar!(b.yaw, 0.18);
  }, b);
  await page.waitForTimeout(700);
}

/** Amigos em volta: [id, ângulo em relação ao olhar (rad, + à direita), distância]. */
export async function porAmigos(page: Page, b: Base, lista: [string, number, number][]) {
  return page.evaluate(
    ({ b, lista, aparencias }) => {
      const e = window.__brumaluz!;
      const chao = (x: number, z: number) => {
        for (let y = 120; y > 2; y--) {
          const de = e.bloco!(Math.floor(x), y - 1, Math.floor(z));
          if (de && de !== 67 && ![5, 28, 30, 35, 55].includes(de) && !e.bloco!(Math.floor(x), y, Math.floor(z)) && !e.bloco!(Math.floor(x), y + 1, Math.floor(z)))
            return y;
        }
        return 70;
      };
      const postos = lista.map(([id, ang, d]) => {
        const x = Math.floor(b.x + Math.sin(b.yaw + ang) * d) + 0.5;
        const z = Math.floor(b.z + Math.cos(b.yaw + ang) * d) + 0.5;
        return {
          id,
          aparencia: aparencias[id],
          x,
          y: chao(x, z),
          z,
          yaw: Math.atan2(-Math.sin(b.yaw + ang), -Math.cos(b.yaw + ang)),
        };
      });
      (window as unknown as { __amigosPostos?: unknown[] }).__amigosPostos = postos;
      e.amigosDeTeste!(postos);
      return postos;
    },
    { b, lista, aparencias: AMIGOS },
  );
}

/** Procura, na frente, um lugar onde o amigo fica escondido (morro, árvore). */
export async function esconder(page: Page, b: Base, id: string, d0: number, d1: number) {
  for (let d = d0; d <= d1; d += 6)
    for (const ang of [0.05, -0.15, 0.25, -0.3, 0.4]) {
      await porAmigos(page, b, [[id, ang, d]]);
      await page.waitForTimeout(500);
      const t = await page.evaluate((id) => window.__brumaluz!.acharAmigo!.tapado(id), id);
      if (t) return [ang, d] as const;
    }
  return null;
}

/** Captura e confere que nenhuma carinha tapa o HUD. Devolve o que estava na borda. */
export async function foto(page: Page, nome: string, pasta = PASTA) {
  mkdirSync(pasta, { recursive: true });
  const r = await page.evaluate(() => {
    const am = window.__brumaluz!.acharAmigo!;
    const ps = am.proibidos();
    const tapa: string[] = [];
    const vistos = am.vistos();
    for (const v of vistos)
      for (const p of ps) {
        const cx = Math.max(p.x, Math.min(v.x, p.x + p.w));
        const cy = Math.max(p.y, Math.min(v.y, p.y + p.h));
        if (v.tipo !== 'montinho' && Math.hypot(v.x - cx, v.y - cy) < v.r)
          tapa.push(`${v.ids.join('+')} x ${p.nome}`);
      }
    return { tapa, vistos };
  });
  console.log(
    'achar foto',
    nome,
    JSON.stringify(r.vistos.map((v) => [v.ids.join('+'), v.tipo, Math.round(v.x), Math.round(v.y), Math.round(v.r)])),
    r.tapa.length ? 'TAPA: ' + r.tapa.join(', ') : '',
  );
  await page.screenshot({ path: `${pasta}/${nome}.jpg`, quality: 88 });
  expect(r.tapa, `${nome}: carinha em cima do HUD`).toEqual([]);
  return r.vistos;
}


/**
 * O robô que "vira para a trilha e anda" (controle de verdade, sem teleporte) até a fração
 * `ate` do caminho. Devolve quanto tempo levou (s).
 */
export async function andarTrilha(page: Page, ate: number, limite = 40) {
  return page.evaluate(
    async ([ate, limite]) => {
      const e = window.__brumaluz!;
      const am = e.acharAmigo!;
      const ctl = e.controleDireto!;
      const t0 = performance.now();
      ctl.tecla('rapido', false);
      for (;;) {
        const pts = am.caminho();
        if (!pts.length) break;
        const alvo = Math.floor((pts.length - 1) * ate);
        const [px, py, pz] = e.posicao!;
        void py;
        const j = e.jogadorPes!();
        let i = 0;
        let dmin = Infinity;
        for (let k = 0; k < pts.length; k++) {
          const d = Math.hypot(pts[k][0] - j[0], pts[k][2] - j[2]);
          if (d < dmin) {
            dmin = d;
            i = k;
          }
        }
        void px;
        void pz;
        if (i >= alvo || performance.now() - t0 > limite * 1000) break;
        const prox = pts[Math.min(pts.length - 1, i + 3)];
        const yaw = Math.atan2(prox[0] - j[0], prox[2] - j[2]);
        e.apontar!(yaw, 0.4);
        ctl.mover(1, 0);
        const sobe = pts[Math.min(pts.length - 1, i + 1)][1] > j[1] + 0.4;
        ctl.tecla('pular', sobe);
        await new Promise((r) => setTimeout(r, 60));
      }
      ctl.mover(0, 0);
      ctl.tecla('pular', false);
      return (performance.now() - t0) / 1000;
    },
    [ate, limite] as const,
  );
}
