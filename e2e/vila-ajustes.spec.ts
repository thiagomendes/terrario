import { expect, test } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { comecarGravacao, pararGravacao } from './gravarCena';
import { abrirMundo, andarPelaTrilha, assentar, escolherNaRoda, tocar } from './guia-palco';
import { APLAUSO, CHAMADO, ESPERA_FINAL } from '../src/jogo/show';
import {
  PASTA,
  abrir,
  acender,
  ate,
  camera,
  esconderJogador,
  foto,
  hora,
  ir,
  passo,
  plano,
  type V3,
} from './vila-noite-palco';

/**
 * Spec 026 (os acertos do dono, 16 nov 2026, depois de jogar o show publicado): as fotos e os
 * vídeos de prova (só com VILA_FOTOS=1, na placa de vídeo: scripts/e2e-gpu.sh).
 * `VILA_SO=bastao,patins,saida` escolhe as partes.
 *
 * - bastao: o bastão de luz na mão da turma visto por trás (o corpo tapa o bastão e a luz dele);
 * - patins: o vídeo de calçar no suporte, a volta nos arcos (f4) e tirar pela roda;
 * - saida: o vídeo da turma indo para casa a pé depois do show, sem sumir à vista.
 *
 * (A roda sem encosto e os patins têm os testes deles em vila-patins.spec.ts; o convite sem
 * missão já feita, em convite-feitas.spec.ts.)
 */
declare const process: { env: Record<string, string | undefined> };
test.skip(!process.env.VILA_FOTOS, 'só com VILA_FOTOS');
test.setTimeout(1_500_000);
test.use({ actionTimeout: 30_000 });

const SO = (process.env.VILA_SO ?? '').split(',').filter(Boolean);
const quer = (s: string) => !SO.length || SO.includes(s);
const NOITE = 0.96;
/** O nome das fotos (antes ou depois do acerto). */
const MARCA = process.env.VILA_MARCA ?? 'depois';

test('o bastão de luz visto por trás (fotos)', async ({ browser }) => {
  test.skip(!quer('bastao'), 'fora do VILA_SO');
  const page = await abrir(browser, 'vila-ajustes-bastao', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
  await hora(page, NOITE);
  await page.waitForTimeout(20_000);
  await acender(page);
  await page.evaluate(() => window.__brumaluz!.pularShow!(60));
  // (a turma chega e se ajeita no lugar dela)
  await ate(page, 92);
  await esconderJogador(page, true);
  // os bastões acesos e o dono de cada um (a turma olha para o palco: atrás é o lado do portão)
  const alvos = await page.evaluate(() => {
    const e = window.__brumaluz!;
    const cena = e.cenaBabylon!();
    const turma = e.criaturas!();
    const lista: { id: number; x: number; y: number; z: number; bx: number; bz: number }[] = [];
    for (const m of cena.meshes) {
      const r = /^morador-(\d+)-bastao$/.exec(m.name);
      if (!r || !m.isEnabled()) continue;
      const c = turma.find((t) => t.id === Number(r[1]));
      const b = (
        m as unknown as { getAbsolutePosition(): { x: number; z: number } }
      ).getAbsolutePosition();
      if (c) lista.push({ id: c.id, x: c.x, y: c.y, z: c.z, bx: b.x, bz: b.z });
    }
    return lista;
  });
  console.log(`BASTOES ${alvos.length}`);
  expect(alvos.length).toBeGreaterThanOrEqual(4);
  const pass = p.pontos.passarela;
  let k = 0;
  // os mais perto do palco (parados na grade, de costas para quem chega)
  alvos.sort((a, b) => Math.hypot(a.x - pass[0], a.z - pass[2]) - Math.hypot(b.x - pass[0], b.z - pass[2]));
  for (const a of alvos.slice(0, 4)) {
    // a câmera do lado oposto ao bastão: o corpo fica bem no meio, entre ela e o bastão
    const dx = a.x - a.bx;
    const dz = a.z - a.bz;
    const d = Math.hypot(dx, dz) || 1;
    const ux = dx / d;
    const uz = dz / d;
    for (const [nome, dist, lado, alt] of [
      ['perto', 1.5, 0, 1.15],
      ['meio', 2.6, 0.25, 1.45],
    ] as const) {
      const cam: V3 = [a.x + ux * dist - uz * lado, a.y + alt, a.z + uz * dist + ux * lado];
      await camera(page, cam, [a.x - ux * 1.5, a.y + 0.85, a.z - uz * 1.5]);
      await page.waitForTimeout(700);
      await foto(page, `bastao-${MARCA}-${k}-${nome}`);
    }
    k++;
  }
  // e de frente (do lado do bastão): o tubo de miolo claro e a luz dele em volta
  for (const a of alvos.slice(0, 2)) {
    const dx = a.bx - a.x;
    const dz = a.bz - a.z;
    const d = Math.hypot(dx, dz) || 1;
    await camera(page, [a.bx + (dx / d) * 1.6, a.y + 1.2, a.bz + (dz / d) * 1.6], [a.x, a.y + 0.9, a.z]);
    await page.waitForTimeout(700);
    await foto(page, `bastao-${MARCA}-frente-${alvos.indexOf(a)}`);
  }
  passo('bastão fotografado');
});

/**
 * O vídeo dos patins (celular deitado, com a interface): a criança escolhe a volta no rinque, as
 * pegadinhas levam ao suporte, o toque nele calça (o pulinho, as faíscas), as pegadinhas passam
 * por dentro dos três arcos, e fora do rinque ela tira os patins pela roda. O vídeo sai das
 * fotos da página inteira (`patins-quadros/`, com a `lista.txt` para o ffmpeg).
 */
test('patins: calçar no suporte, a volta nos arcos e tirar pela roda (vídeo)', async ({
  browser,
}) => {
  test.skip(!quer('patins'), 'fora do VILA_SO');
  mkdirSync(PASTA, { recursive: true });
  const t0 = Date.now();
  const s = () => ((Date.now() - t0) / 1000).toFixed(1);
  const page = await abrirMundo(browser, {
    id: 'vila-ajustes-patins',
    tema: 'vila-neon',
    tamanho: 'deitado',
    extras: { alma: { local: { feitas: ['f1', 'f2'] } } },
  });
  await page.addStyleTag({ content: '.dica-mira { display: none !important; }' });
  await assentar(page);
  await page.waitForFunction(() => !!window.__guia && !!window.__vila, undefined, {
    timeout: 30_000,
  });
  // perto da entrada do rinque, sem patins (ninguém entra no mundo calçado)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const p = e.vila!()!;
    const [x, , z] = p.pontos.patins;
    e.teleportar!(x - 1.5, z - 6.5, p.h + 1.2);
    e.apontar!(0.15, 0.3);
  });
  await assentar(page);
  expect(await page.evaluate(() => !!window.__brumaluz!.personagem?.aparencia().patins)).toBe(false);
  await escolherNaRoda(page, 'missoes');
  await page.waitForSelector('[data-alma-quadro]', { timeout: 20_000 });
  await page.waitForTimeout(600);
  // o vídeo com a interface: uma foto da página atrás da outra, cada uma com a hora dela (o
  // vídeo de página do navegador de teste corta a parte de baixo da tela na placa de vídeo)
  const pastaQuadros = `${PASTA}/patins-quadros`;
  mkdirSync(pastaQuadros, { recursive: true });
  const quadros: { f: string; t: number }[] = [];
  let gravando = true;
  const laco = (async () => {
    for (let i = 0; gravando; i++) {
      const f = `q${String(i).padStart(5, '0')}.jpg`;
      const t = Date.now();
      const ok = await page
        .screenshot({ path: `${pastaQuadros}/${f}`, type: 'jpeg', quality: 74, scale: 'css' })
        .then(() => true)
        .catch(() => false);
      if (ok) quadros.push({ f, t });
    }
  })();
  console.log(`MARCA patins inicio ${s()}`);
  await page.waitForTimeout(1000);
  await tocar(page, '[data-alma-jogar="f4"]');
  await page.waitForTimeout(2000);
  let arcos = 0;
  for (let volta = 0; volta < 14; volta++) {
    if (await page.locator('[data-alma-festa]').count()) break;
    const r = await andarPelaTrilha(page, 40_000);
    console.log(`PATINS ${s()} trilha ${r.alvo} chegou=${r.chegou}`);
    if (r.alvo === 'patins') {
      await page.waitForTimeout(700);
      if (await page.evaluate(() => !!window.__brumaluz!.personagem?.aparencia().patins)) continue;
      const t = await page.evaluate(() => {
        const e = window.__brumaluz!;
        const [x, y, z] = e.vila!()!.pontos.patins;
        return e.telaDoPonto!(x, y + 1, z);
      });
      await page.touchscreen.tap(t!.x, t!.y);
      await page.waitForFunction(() => !!window.__brumaluz!.personagem?.aparencia().patins);
      console.log(`MARCA patins calcou ${s()}`);
      await page.waitForFunction(() => window.__guia!.alvo()?.chave !== 'patins', undefined, {
        timeout: 8000,
      });
      await page.waitForTimeout(900);
    } else {
      if (r.alvo?.startsWith('arco')) arcos++;
      await page.waitForTimeout(1600);
    }
  }
  console.log(`MARCA patins festa ${s()} arcos ${arcos}`);
  await page.waitForTimeout(2500);
  for (let k = 0; k < 20 && (await page.locator('[data-alma-festa]').count()); k++) {
    const ok = page.locator('[data-alma-festa] [data-alma-oba], [data-alma-festa] button');
    if (await ok.count())
      await ok
        .first()
        .tap()
        .catch(() => undefined);
    await page.waitForTimeout(700);
  }
  // sai do rinque de patins (a escolha foi dela: continuam no pé) e tira pela roda
  expect(await page.evaluate(() => !!window.__brumaluz!.personagem?.aparencia().patins)).toBe(true);
  const fora = await page.evaluate(() => {
    const p = window.__brumaluz!.vila!()!;
    const [x, , z] = p.pontos.patins;
    return [x - 3, z - 7] as [number, number];
  });
  await page.evaluate(
    ([x, z]) =>
      new Promise<void>((ok) => {
        const e = window.__brumaluz!;
        const ctl = e.controleDireto!;
        const ini = performance.now();
        const passo = () => {
          const pes = e.jogadorPes!();
          const dx = x - pes[0];
          const dz = z - pes[2];
          if (Math.hypot(dx, dz) < 0.8 || performance.now() - ini > 5500) {
            ctl.mover(0, 0);
            ok();
            return;
          }
          const yaw = e.rotacao![1];
          const alvo = Math.atan2(dx, dz);
          const d = Math.atan2(Math.sin(alvo - yaw), Math.cos(alvo - yaw));
          e.apontar!(yaw + Math.max(-0.12, Math.min(0.12, d)), 0.34);
          ctl.mover(Math.cos(d), Math.sin(d));
          setTimeout(passo, 40);
        };
        passo();
      }),
    fora,
  );
  console.log(`MARCA patins fora ${s()}`);
  await page.waitForTimeout(600);
  await page.locator('.menu-hud.botao-roda').tap();
  const tirar = page.locator('.roda.aberta button.ativo[data-item="tirar-patins"]');
  await tirar.waitFor({ state: 'visible' });
  await page.waitForTimeout(1400);
  await tirar.tap();
  await page.waitForFunction(() => !window.__brumaluz!.personagem?.aparencia().patins);
  await page.waitForTimeout(2200);
  console.log(`MARCA patins fim ${s()}`);
  expect(arcos).toBeGreaterThanOrEqual(3);
  gravando = false;
  await laco;
  // a lista para o ffmpeg (cada foto dura até a seguinte)
  const lista = quadros
    .map((q, i) => {
      const dur = ((quadros[i + 1]?.t ?? q.t + 100) - q.t) / 1000;
      return `file '${q.f}'\nduration ${dur.toFixed(3)}`;
    })
    .join('\n');
  writeFileSync(`${pastaQuadros}/lista.txt`, `ffconcat version 1.0\n${lista}\n`);
  const seg = (quadros[quadros.length - 1].t - quadros[0].t) / 1000;
  console.log(`VIDEO patins ${quadros.length} fotos em ${seg.toFixed(1)} s`);
  await page.context().close();
});

/**
 * O vídeo da saída (computador, só a cena): o show acaba, e a criança olha a turma ir embora: do
 * campo até o portão, do portão pela calçada da avenida, e da calçada das casas até os quintais.
 * A página vigia a turma o tempo todo: ninguém pode sair do mundo dentro da tela.
 */
test('saída: depois do show a turma vai para casa a pé, sem sumir à vista (vídeo)', async ({
  browser,
}) => {
  test.skip(!quer('saida'), 'fora do VILA_SO');
  mkdirSync(PASTA, { recursive: true });
  const page = await abrir(browser, 'vila-ajustes-saida', 'pc', 6);
  const p = await plano(page);
  const H = p.h + 1;
  const o = (u: number, alt: number, v: number): V3 => [p.ox + u, H + alt, p.oz + v];
  await ir(page, p.ox + 60.5, p.oz + 86.5, H + 0.2);
  await hora(page, NOITE);
  await page.waitForTimeout(8000);
  await acender(page);
  await page.evaluate(() => window.__brumaluz!.apontar!(0, 0));
  // a turma chega andando e acha o lugar
  await ate(page, 70);
  const noShow = await page.evaluate(
    () => window.__brumaluz!.criaturas!().filter((c) => c.profissao === 'cozinheiro').length,
  );
  console.log(`SAIDA turma no show ${noShow}`);
  expect(noShow).toBeGreaterThanOrEqual(40);
  // quem sai do mundo dentro da tela (o teste falha se acontecer)
  await page.evaluate(() => {
    const e = window.__brumaluz!;
    const cena = e.cenaBabylon!() as unknown as {
      frustumPlanes: { normal: { x: number; y: number; z: number }; d: number }[];
      activeCamera: { globalPosition: { x: number; y: number; z: number } };
    };
    const w = window as unknown as {
      __vigia: { sumiram: number; naTela: string[]; saltos: string[] };
    };
    w.__vigia = { sumiram: 0, naTela: [], saltos: [] };
    let antes = new Map<number, { x: number; y: number; z: number }>();
    setInterval(() => {
      const agora = new Map<number, { x: number; y: number; z: number }>();
      for (const c of e.criaturas!())
        if (c.profissao && c.estado !== 'morrendo') agora.set(c.id, { x: c.x, y: c.y, z: c.z });
      const cam = cena.activeCamera.globalPosition;
      const naTela = (c: { x: number; y: number; z: number }) =>
        Math.hypot(c.x - cam.x, c.z - cam.z) < 56 &&
        cena.frustumPlanes.every(
          (pl) => pl.normal.x * c.x + pl.normal.y * (c.y + 1) + pl.normal.z * c.z + pl.d > -0.6,
        );
      for (const [id, c] of antes) {
        const d = agora.get(id);
        if (!d) {
          w.__vigia.sumiram++;
          if (naTela(c)) w.__vigia.naTela.push(`${id} em ${c.x.toFixed(1)},${c.z.toFixed(1)}`);
        } else if (Math.hypot(d.x - c.x, d.z - c.z) > 2.5 && (naTela(c) || naTela(d)))
          w.__vigia.saltos.push(`${id}`);
      }
      antes = agora;
    }, 100);
  });
  await esconderJogador(page, true);
  // o acorde final e o aplauso; o vídeo começa nos últimos segundos do aplauso
  await page.evaluate((x) => window.__brumaluz!.pularShow!(x), CHAMADO + ESPERA_FINAL - 1);
  await page.waitForFunction(() => !!window.__brumaluz!.vilaEstado!()?.show?.final, undefined, {
    timeout: 20_000,
    polling: 100,
  });
  /** A criança (escondida) no lugar da câmera, olhando para onde a câmera olha. */
  const cena = async (u: number, v: number, alt: number, para: V3) => {
    const de = o(u, alt, v);
    await ir(page, de[0], de[2], H + 0.2);
    await page.evaluate(([yaw]) => window.__brumaluz!.apontar!(yaw, 0.1), [
      Math.atan2(para[0] - de[0], para[2] - de[2]),
    ]);
    await camera(page, de, para);
  };
  await cena(61.5, 97.5, 4.2, o(60.5, 0.6, 76));
  // (o aplauso acaba, a turma dá as costas ao palco; o vídeo começa com ela já a caminho)
  await page.waitForFunction(() => !window.__brumaluz!.vilaEstado!()?.show, undefined, {
    timeout: (APLAUSO + 20) * 1000,
    polling: 100,
  });
  const fim = Date.now();
  const desdeOFim = () => (Date.now() - fim) / 1000;
  const aos = async (seg: number) => page.waitForTimeout(Math.max(0, seg - desdeOFim()) * 1000);
  const gravador = (o: 'pause' | 'resume') =>
    page.evaluate(
      (o) => (window as unknown as { __gravacao: { rec: MediaRecorder } }).__gravacao.rec[o](),
      o,
    );
  await aos(5);
  await comecarGravacao(page, 30);
  // 1 (8 s): do fundo do campo, a turma vai para o portão e sai por ele
  await aos(13);
  await foto(page, 'saida-1-campo');
  // 2 (13 s): da calçada da avenida, olhando o portão e a calçada por onde eles vão
  await cena(67.5, 66.5, 3.4, o(44, 0.4, 70.5));
  await aos(26);
  await foto(page, 'saida-2-avenida');
  // (um corte no vídeo: a caminhada pela avenida até a esquina das casas leva uns 15 s)
  await gravador('pause');
  // 3 (18 s): da calçada das casas, eles viram a esquina, descem a calçada e entram nos quintais
  await cena(23.2, 91.5, 4.6, o(21.5, 0.4, 73));
  await aos(43);
  await gravador('resume');
  await aos(61);
  await foto(page, 'saida-3-casas');
  await pararGravacao(page, `${PASTA}/saida.webm`);
  console.log(`SAIDA video até ${desdeOFim().toFixed(0)} s depois do show`);
  // de perto, os que chegaram em casa: de papo no quintal (ninguém some com a criança olhando)
  await cena(22.8, 83.5, 3.4, o(17.5, 0.6, 79));
  await aos(72);
  await foto(page, 'saida-4-quintal');
  const v = await page.evaluate(
    () =>
      (window as unknown as { __vigia: { sumiram: number; naTela: string[]; saltos: string[] } })
        .__vigia,
  );
  console.log(`SAIDA vigia ${JSON.stringify(v)}`);
  expect(v.naTela).toEqual([]);
  expect(v.saltos).toEqual([]);
  await page.context().close();
});
