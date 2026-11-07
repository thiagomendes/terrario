import { expect, test, type Browser, type Page } from '@playwright/test';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

/**
 * Paridade (spec 009, T01): sessões roteirizadas gravadas no jogo de antes da separação
 * entre núcleo e desenho. Cada sessão começa num mundo novo (semente, tema e modo
 * conhecidos), age só pela API de depuração (`window.__brumaluz`) e por eventos da página,
 * e ao fim (e em algumas etapas) salva o mundo e lê o `DadosMundo` gravado no IndexedDB.
 * O retrato guarda só a parte determinística do salvamento (ver e2e/paridade/LEIAME.md).
 *
 * PARIDADE=gravar   roda cada sessão duas vezes, exige retratos iguais e grava o JSON
 * PARIDADE=conferir roda uma vez e compara com o JSON gravado (PARIDADE=1 também confere)
 * PARIDADE_SESSOES=construir,itens e PARIDADE_SEMENTES=42 limitam o que roda.
 */
declare const process: { env: Record<string, string | undefined> };
const modoParidade = process.env.PARIDADE;
const GRAVAR = modoParidade === 'gravar';
test.skip(!modoParidade, 'paridade só com PARIDADE=gravar ou PARIDADE=conferir');

const PASTA = 'e2e/paridade';
const ID_MUNDO = 'paridade';
const SEMENTES = (process.env.PARIDADE_SEMENTES ?? '1337,42,7').split(',').map(Number);
const TEMAS = (process.env.PARIDADE_TEMAS ?? 'bruma-e-luz,doce-reino').split(',');

type Modo = 'criativo' | 'sobrevivencia';
type Etapas = Record<string, unknown>;

// ---------------------------------------------------------------------------------------
// Ajudantes dentro da página (injetados antes do jogo carregar)
// ---------------------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Ajudantes {
  esperar(ms: number): Promise<void>;
  quadros(n: number): Promise<void>;
  /** Espera o jogador ficar parado (posição igual por algumas leituras seguidas). */
  assentar(maxMs?: number): Promise<number[]>;
  /** Aponta para o bloco (e a face, se pedida) e confere pelo alvo da mira. */
  mirar(x: number, y: number, z: number, normal?: number[]): Promise<boolean>;
  /** Mina o bloco mirado em passos curtos até quebrar; devolve o bloco quebrado ou -1. */
  quebrar(x: number, y: number, z: number, normal?: number[]): Promise<number>;
  /** Coloca o bloco do slot ativo em (x, y, z), mirando o topo do bloco de baixo. */
  colocar(x: number, y: number, z: number): Promise<boolean>;
  /** Mira e usa (clique direito) o bloco. */
  usarEm(x: number, y: number, z: number): Promise<boolean>;
  /** Espera não sobrar item no chão (ou o prazo acabar); devolve quantos sobraram. */
  coletar(maxMs?: number): Promise<number>;
  /** "Clique" de mouse num slot da interface (o mesmo caminho do pointerdown real). */
  clicarSlot(seletor: string, direito?: boolean): boolean;
  /** Índice do primeiro slot do inventário com o item (ou -1). */
  slotDe(item: string): number;
  /** Plataforma de pedra com borda de vidro acima do terreno, no ponto atual. */
  plataforma(raio: number): { cx: number; cz: number; y0: number };
  danos: { qtd: number; causa: string }[];
  eventos: string[];
}
declare global {
  interface Window {
    __par: Ajudantes;
  }
}

function instalarAjudantes(): void {
  const w = window as any;
  const e = () => w.__brumaluz;
  const par: any = {
    danos: [],
    eventos: [],
    esperar: (ms: number) => new Promise((r) => setTimeout(r, ms)),
    async quadros(n: number) {
      for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(() => r(0)));
    },
    async assentar(maxMs = 20_000) {
      const fim = performance.now() + maxMs;
      let antes = '';
      let iguais = 0;
      while (performance.now() < fim) {
        await par.quadros(2);
        const p = (e().posicao ?? []).map((v: number) => v.toFixed(3)).join(',');
        iguais = p === antes ? iguais + 1 : 0;
        antes = p;
        if (iguais >= 2) break;
      }
      return e().posicao;
    },
    async mirar(x: number, y: number, z: number, normal?: number[]) {
      for (let t = 0; t < 12; t++) {
        const [px, py, pz] = e().posicao;
        const n = normal ?? [0, 0, 0];
        const ax = x + 0.5 + n[0] * 0.45;
        const ay = y + 0.5 + n[1] * 0.45;
        const az = z + 0.5 + n[2] * 0.45;
        const dx = ax - px;
        const dy = ay - py;
        const dz = az - pz;
        e().apontar(Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
        await par.quadros(2);
        const a = e().alvo;
        if (a && a.x === x && a.y === y && a.z === z) {
          if (!normal) return true;
          if (a.normal.x === n[0] && a.normal.y === n[1] && a.normal.z === n[2]) return true;
        }
      }
      return false;
    },
    async quebrar(x: number, y: number, z: number, normal?: number[]) {
      if (!(await par.mirar(x, y, z, normal))) return -1;
      const b = e().bloco(x, y, z);
      for (let i = 0; i < 600; i++) {
        if (e().minerar(0.05).quebrou) return b;
      }
      return -1;
    },
    async colocar(x: number, y: number, z: number) {
      if (!(await par.mirar(x, y - 1, z, [0, 1, 0]))) return false;
      return e().interagir('colocar');
    },
    async usarEm(x: number, y: number, z: number) {
      if (!(await par.mirar(x, y, z))) return false;
      e().controleDireto.usar();
      await par.quadros(1);
      return true;
    },
    async coletar(maxMs = 15_000) {
      const fim = performance.now() + maxMs;
      await par.esperar(800);
      while (performance.now() < fim && (e().itensSoltos ?? 0) > 0) await par.esperar(300);
      return e().itensSoltos ?? 0;
    },
    clicarSlot(seletor: string, direito = false) {
      const el = document.querySelector(seletor);
      if (!el) return false;
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          pointerType: 'mouse',
          button: direito ? 2 : 0,
        }),
      );
      return true;
    },
    slotDe(item: string) {
      const slots = e().inventario.slots as ({ item: string } | null)[];
      return slots.findIndex((s) => s?.item === item);
    },
    plataforma(raio: number) {
      const [px, , pz] = e().posicao;
      const cx = Math.floor(px);
      const cz = Math.floor(pz);
      let topo = 0;
      for (let dx = -raio; dx <= raio; dx++) {
        for (let dz = -raio; dz <= raio; dz++) {
          for (let y = 127; y > 0; y--) {
            if (e().blocoGerado(cx + dx, y, cz + dz) !== 0) {
              topo = Math.max(topo, y);
              break;
            }
          }
        }
      }
      const y0 = topo + 8;
      for (let dx = -raio; dx <= raio; dx++) {
        for (let dz = -raio; dz <= raio; dz++) {
          e().definirBloco(cx + dx, y0, cz + dz, 2);
          if (Math.abs(dx) === raio || Math.abs(dz) === raio) {
            e().definirBloco(cx + dx, y0 + 1, cz + dz, 36);
            e().definirBloco(cx + dx, y0 + 2, cz + dz, 36);
          }
        }
      }
      e().teleportar(cx + 0.5, cz + 0.5, y0 + 1);
      return { cx, cz, y0 };
    },
  };
  w.__par = par;
  window.addEventListener('brumaluz:dano', (ev) => {
    const d = (ev as CustomEvent).detail;
    par.danos.push({ qtd: d.qtd, causa: d.causa });
  });
  for (const nome of ['morte', 'dormiu', 'povoado', 'comeu', 'domou', 'fundiu', 'trocou']) {
    window.addEventListener(`brumaluz:${nome}`, () => par.eventos.push(nome));
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------------------
// Mundo novo, salvamento e retrato normalizado
// ---------------------------------------------------------------------------------------

async function abrirMundo(
  browser: Browser,
  baseURL: string,
  semente: number,
  tema: string,
  modo: Modo,
): Promise<{ page: Page; erros: string[]; fechar: () => Promise<void> }> {
  const ctx = await browser.newContext({ baseURL, viewport: { width: 640, height: 400 } });
  const page = await ctx.newPage();
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  // uma página leve da mesma origem para gravar o mundo direto no banco do jogo
  await page.goto('/manifest.webmanifest');
  await page.evaluate(
    ({ id, semente, tema, modo }) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('brumaluz', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('kv', 'readwrite');
          const kv = tx.objectStore('kv');
          const agora = 1_700_000_000_000;
          kv.put(
            [
              {
                id,
                nome: 'Paridade',
                semente,
                modo,
                criadoEm: agora,
                jogadoEm: agora,
                versao: 2,
                tema,
              },
            ],
            'mundos',
          );
          kv.put({ versao: 1, edicoes: {}, jogador: null, hora: -1, extras: {} }, `mundo:${id}`);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    { id: ID_MUNDO, semente, tema, modo },
  );
  await page.addInitScript(instalarAjudantes);
  await page.goto(`/?mundo=${ID_MUNDO}`);
  await page.waitForFunction(() => window.__brumaluz?.ready === true, undefined, {
    timeout: 240_000,
  });
  const info = await page.evaluate(() => {
    document.querySelector('.entrada')?.setAttribute('hidden', '');
    const e = window.__brumaluz!;
    e.pausarDia = true;
    e.hora = 0.4;
    e.definirClima!('limpo');
    return { tema: e.tema, modo: e.modo, semente: e.mundo?.semente };
  });
  expect(info).toEqual({ tema, modo, semente });
  return { page, erros, fechar: () => ctx.close() };
}

/** Bloco que prende uma criatura (sólido): ar, plantas, água e tocha não prendem. */
const NAO_PRENDE = [0, 67, 8, 9, 10, 26, 33, 54, 37];

interface Retrato {
  edicoes: Record<string, [number, number][]>;
  inventario: unknown;
  conteineres: unknown;
  sobrevivencia: unknown;
  spawn: unknown;
  dia: unknown;
  clima: unknown;
  diario: unknown;
  hora?: number;
  itensSoltos: Record<string, number>;
  criaturas: { porTipo: Record<string, number>; todasEmLugarValido: boolean };
}

const r2 = (v: unknown) => (typeof v === 'number' ? Math.round(v * 100) / 100 : v);
function ordenarChaves<T>(o: Record<string, T> | undefined): Record<string, T> {
  const s: Record<string, T> = {};
  for (const k of Object.keys(o ?? {}).sort()) s[k] = o![k];
  return s;
}
function fornalhaNormal(f: Record<string, unknown>) {
  return {
    entrada: f.entrada ?? null,
    combustivel: f.combustivel ?? null,
    saida: f.saida ?? null,
    queima: r2(f.queima),
    queimaTotal: r2(f.queimaTotal),
    progresso: r2(f.progresso),
  };
}

/**
 * Salva o mundo e devolve o retrato determinístico do que foi gravado.
 * `posses`: depois do desmaio o inventário espalha no chão e, dependendo dos quadros, o
 * próprio corpo pega tudo de volta (ou não), em qualquer ordem. Aí o retrato junta
 * inventário e chão numa soma por item, e tira do diário os contadores `coletou:*`.
 * `contagem`: na sessão `itens`, a ordem em que dois itens seguidos chegam ao inventário
 * às vezes se inverte (a física dos itens anda com o quadro); compara a soma por item.
 */
const diario0 = (ex: any): { contadores?: Record<string, number>; concluidas?: string[] } =>
  ex.diario ?? {};

async function retrato(
  page: Page,
  opcoes: { hora?: boolean; posses?: boolean; contagem?: boolean } = {},
): Promise<Retrato> {
  const bruto = await page.evaluate(async (id) => {
    const e = window.__brumaluz!;
    const ok = await e.salvar!(false);
    const dados = await new Promise<any>((resolve, reject) => {
      const req = indexedDB.open('brumaluz', 1);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const db = req.result;
        const g = db.transaction('kv', 'readonly').objectStore('kv').get(`mundo:${id}`);
        g.onsuccess = () => {
          db.close();
          resolve(g.result);
        };
        g.onerror = () => reject(g.error);
      };
    });
    const raposas: { x: number; y: number; z: number }[] = dados?.extras?.criaturas?.raposas ?? [];
    const validas = raposas.map((c) => {
      const b = e.bloco!(Math.floor(c.x), Math.floor(c.y + 0.3), Math.floor(c.z));
      return b;
    });
    return { ok, dados, validas };
  }, ID_MUNDO);
  expect(bruto.ok, 'o salvamento falhou').toBe(true);
  const d = bruto.dados;
  const ex = d.extras ?? {};
  const edicoes: Record<string, [number, number][]> = {};
  for (const k of Object.keys(d.edicoes ?? {}).sort()) {
    edicoes[k] = [...(d.edicoes[k] as [number, number][])].sort((a, b) => a[0] - b[0]);
  }
  const s = ex.sobrevivencia ?? {};
  const inv = ex.inventario ?? {};
  let inventario: unknown = inv;
  const pilhas = (lista: unknown) =>
    ((lista ?? []) as ({ item: string; qtd: number; dur?: number } | null)[]).filter(
      (p): p is { item: string; qtd: number; dur?: number } => !!p,
    );
  if (opcoes.posses) {
    const soma: Record<string, number> = {};
    for (const p of [...pilhas(inv.slots), ...pilhas(ex.itensSoltos)]) {
      const k = p.dur === undefined || p.dur === null ? p.item : `${p.item}@${p.dur}`;
      soma[k] = (soma[k] ?? 0) + p.qtd;
    }
    inventario = { possesSomadas: ordenarChaves(soma) };
  } else if (opcoes.contagem) {
    const soma: Record<string, number> = {};
    for (const p of pilhas(inv.slots)) {
      const k = p.dur === undefined || p.dur === null ? p.item : `${p.item}@${p.dur}`;
      soma[k] = (soma[k] ?? 0) + p.qtd;
    }
    inventario = { contagem: ordenarChaves(soma), ativo: inv.ativo };
  }
  const baus: Record<string, unknown> = ordenarChaves(ex.conteineres?.baus);
  const fornalhas: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(ordenarChaves(ex.conteineres?.fornalhas)))
    fornalhas[k] = fornalhaNormal(f as Record<string, unknown>);
  const itensSoltos: Record<string, number> = {};
  if (!opcoes.posses)
    for (const it of pilhas(ex.itensSoltos))
      itensSoltos[it.item] = (itensSoltos[it.item] ?? 0) + it.qtd;
  const contadores: Record<string, number> = { ...(diario0(ex).contadores ?? {}) };
  if (opcoes.posses)
    for (const k of Object.keys(contadores)) if (k.startsWith('coletou:')) delete contadores[k];
  // biomas visitados: o diário olha a posição a cada 2 s de relógio real, então quem passa
  // pouco tempo perto de uma divisa (teleportes, raposa andando) às vezes conta e às vezes não
  for (const k of Object.keys(contadores)) if (k.startsWith('bioma:')) delete contadores[k];
  const porTipo: Record<string, number> = {};
  const raposas = (ex.criaturas?.raposas ?? []) as unknown[];
  if (raposas.length) porTipo.raposa = raposas.length;
  const diario = diario0(ex);
  const r: Retrato = {
    edicoes,
    inventario,
    conteineres: { baus, fornalhas },
    // exaustão sai: ela cresce com o tempo real parado (0,02 por segundo)
    sobrevivencia: {
      vida: r2(s.vida),
      fome: r2(s.fome),
      saturacao: r2(s.saturacao),
      ar: r2(s.ar),
      morto: s.morto ?? false,
      causa: s.causa ?? null,
    },
    spawn: ex.spawn ? { x: r2(ex.spawn.x), z: r2(ex.spawn.z) } : null,
    dia: ex.dia ?? null,
    clima: ex.clima?.tipo ?? null,
    diario: {
      contadores: ordenarChaves(contadores),
      concluidas: [...(diario.concluidas ?? [])].sort(),
    },
    itensSoltos: ordenarChaves(itensSoltos),
    criaturas: {
      porTipo,
      todasEmLugarValido: bruto.validas.every((b: number) => NAO_PRENDE.includes(b)),
    },
  };
  if (opcoes.hora) r.hora = r2(d.hora) as number;
  return r;
}

// ---------------------------------------------------------------------------------------
// Sessões
// ---------------------------------------------------------------------------------------

interface Sessao {
  modo: Modo;
  /** Roda a sessão numa página pronta; devolve os retratos por etapa e notas. */
  rodar(page: Page): Promise<{ etapas: Etapas; notas: Record<string, unknown> }>;
}

const SESSOES: Record<string, Sessao> = {
  /** Criativo: minerar materiais, colocar, porta, desfazer e refazer, domar raposa. */
  construir: {
    modo: 'criativo',
    async rodar(page) {
      const base = await page.evaluate(() => window.__par.plataforma(5));
      await page.evaluate(() => window.__par.assentar());
      const { cx, cz, y0 } = base;
      const y = y0 + 1;
      const materiais = [3, 4, 17, 6, 46];
      const minerados = await page.evaluate(
        async ({ cx, cz, y, materiais }) => {
          const e = window.__brumaluz!;
          materiais.forEach((b, i) => e.definirBloco!(cx + 1, y, cz - 2 + i, b));
          await window.__par.quadros(2);
          const out: number[] = [];
          for (let i = 0; i < materiais.length; i++)
            out.push(await window.__par.quebrar(cx + 1, y, cz - 2 + i, [-1, 0, 0]));
          // um bloco do chão da plataforma também
          out.push(await window.__par.quebrar(cx + 2, y - 1, cz + 2));
          return out;
        },
        { cx, cz, y, materiais },
      );
      expect(minerados).toEqual([...materiais, 2]);
      const colocou = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const inv = e.inventario!;
          inv.definir(0, { item: 'bloco:7', qtd: 1 });
          inv.definir(1, { item: 'bloco:57', qtd: 1 });
          inv.definir(2, { item: 'bloco:47', qtd: 1 });
          inv.definir(3, { item: 'frutinhas', qtd: 1 });
          inv.definir(4, { item: 'bloco:44', qtd: 1 });
          e.selecionarSlot!(0);
          const r: boolean[] = [];
          r.push(await window.__par.colocar(cx - 2, y, cz - 2));
          r.push(await window.__par.colocar(cx - 2, y + 1, cz - 2));
          e.selecionarSlot!(4);
          r.push(await window.__par.colocar(cx - 1, y, cz - 2));
          e.selecionarSlot!(2);
          r.push(await window.__par.colocar(cx - 1, y + 1, cz - 2));
          e.selecionarSlot!(1);
          r.push(await window.__par.colocar(cx - 2, y, cz + 1));
          return r;
        },
        { cx, cz, y },
      );
      expect(colocou).toEqual([true, true, true, true, true]);
      // porta: abre, fecha e abre de novo
      const porta = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const out: number[] = [e.bloco!(cx - 2, y, cz + 1), e.bloco!(cx - 2, y + 1, cz + 1)];
          for (let i = 0; i < 3; i++) {
            await window.__par.usarEm(cx - 2, y, cz + 1);
            await window.__par.quadros(1);
            out.push(e.bloco!(cx - 2, y, cz + 1));
          }
          return out;
        },
        { cx, cz, y },
      );
      expect(porta).toEqual([57, 57, 58, 57, 58]);
      const etapas: Etapas = { construido: await retrato(page) };
      // desfazer duas vezes (porta e lã), refazer com Ctrl+Shift+Z e com Ctrl+Y
      const historico = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const tecla = (code: string, shift = false) =>
            window.dispatchEvent(
              new KeyboardEvent('keydown', { code, ctrlKey: true, shiftKey: shift }),
            );
          const ler = () => [e.bloco!(cx - 2, y, cz + 1), e.bloco!(cx - 1, y + 1, cz - 2)];
          const out = [ler()];
          tecla('KeyZ');
          out.push(ler());
          tecla('KeyZ');
          out.push(ler());
          tecla('KeyZ', true);
          out.push(ler());
          tecla('KeyY');
          out.push(ler());
          await window.__par.quadros(2);
          return out;
        },
        { cx, cz, y },
      );
      etapas.desfeitoRefeito = await retrato(page);
      // raposa: invoca dentro da plataforma e dá frutinhas até confiar (no criativo não gasta)
      const domou = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          e.invocar!('raposa', cx + 3.5, y, cz - 2.5);
          e.selecionarSlot!(3);
          await e.sincronizar?.();
          // a raposa invocada (a mais perto da plataforma): no mundo em tempo real uma
          // selvagem pode ter nascido por perto
          const daPlataforma = () =>
            (e.criaturas!() ?? [])
              .filter((c) => c.tipo === 'raposa')
              .sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
          for (let t = 0; t < 60; t++) {
            const r = daPlataforma();
            if (!r) return false;
            if (r.domada) return true;
            const [ex, , ez] = e.posicao!;
            const dist = Math.hypot(r.x - ex, r.z - ez);
            if (dist > 2.2 || dist < 1) {
              const d = dist || 1;
              const tx = Math.min(cx + 4.4, Math.max(cx - 3.4, r.x - ((r.x - ex) / d) * 1.6));
              const tz = Math.min(cz + 4.4, Math.max(cz - 3.4, r.z - ((r.z - ez) / d) * 1.6));
              e.teleportar!(tx, tz, y);
              await window.__par.quadros(2);
            }
            const [px, py, pz] = e.posicao!;
            const agora = daPlataforma()!;
            const dx = agora.x - px;
            const dy = agora.y + 0.3 - py;
            const dz = agora.z - pz;
            e.apontar!(Math.atan2(dx, dz), -Math.atan2(dy, Math.hypot(dx, dz)));
            await window.__par.quadros(1);
            e.controleDireto!.usar();
            await window.__par.quadros(1);
          }
          return false;
        },
        { cx, cz, y },
      );
      expect(domou, 'a raposa não confiou no jogador').toBe(true);
      await page.evaluate(
        ({ cx, cz, y }) => window.__brumaluz!.teleportar!(cx + 0.5, cz + 0.5, y),
        { cx, cz, y },
      );
      await page.evaluate(() => window.__par.esperar(2500));
      etapas.final = await retrato(page);
      return { etapas, notas: { minerados, porta, historico } };
    },
  },

  /** Sobrevivência: quebrar e coletar, ferramenta que quebra, baú cheio que espalha. */
  itens: {
    modo: 'sobrevivencia',
    async rodar(page) {
      // cava dois blocos do terreno no nascimento, olhando para baixo
      const terreno = await page.evaluate(async () => {
        const e = window.__brumaluz!;
        // (quantos itens ainda estavam no chão ao fim da espera não entra: depende dos quadros)
        const out: { bloco: number }[] = [];
        for (let i = 0; i < 2; i++) {
          await window.__par.assentar();
          e.apontar!(0, 1.55);
          await window.__par.quadros(2);
          const a = e.alvo;
          if (!a) break;
          const bloco = await window.__par.quebrar(a.x, a.y, a.z);
          await window.__par.coletar();
          out.push({ bloco });
        }
        return out;
      });
      const base = await page.evaluate(() => window.__par.plataforma(5));
      await page.evaluate(() => window.__par.assentar());
      const { cx, cz, y0 } = base;
      const y = y0 + 1;
      // picareta com 3 de durabilidade e blocos de vários materiais, todos encostados
      const quebras = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const inv = e.inventario!;
          inv.adicionar('picareta_madeira', 1, 3);
          inv.adicionar('bloco:42', 1);
          inv.adicionar('carvao', 4);
          const blocos: [number, number, number, number][] = [
            // de cima para baixo: o item do bloco de baixo não pula contra o de cima
            [cx + 1, y + 1, cz, 2],
            [cx + 1, y, cz, 2],
            [cx, y + 1, cz + 1, 2],
            [cx, y, cz + 1, 2],
            [cx - 1, y + 1, cz, 3],
            [cx - 1, y, cz, 7],
            [cx, y + 1, cz - 1, 15],
            [cx, y, cz - 1, 5],
          ];
          for (const [x, yy, z, b] of blocos) e.definirBloco!(x, yy, z, b);
          await window.__par.quadros(2);
          e.selecionarSlot!(window.__par.slotDe('picareta_madeira'));
          const out: { bloco: number; picareta: number }[] = [];
          for (const [x, yy, z] of blocos) {
            const bloco = await window.__par.quebrar(x, yy, z, [
              Math.sign(cx - x),
              0,
              Math.sign(cz - z),
            ]);
            await e.sincronizar?.();
            const p = inv.slots[e.slotAtivo ?? 0] as { item: string; dur?: number } | null;
            out.push({ bloco, picareta: p?.item === 'picareta_madeira' ? (p.dur ?? -1) : 0 });
            await window.__par.coletar();
          }
          return out;
        },
        { cx, cz, y },
      );
      expect(quebras.map((q) => q.bloco)).toEqual([2, 2, 2, 2, 3, 7, 15, 5]);
      const etapas: Etapas = { coletado: await retrato(page, { contagem: true }) };
      // baú longe do jogador: enche pela interface, fecha e quebra (o conteúdo espalha no chão)
      const bau = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const par = window.__par;
          e.selecionarSlot!(par.slotDe('bloco:42'));
          const pos = [cx - 4, y, cz] as const;
          if (!(await par.colocar(...pos))) return 'não colocou';
          await par.quadros(2);
          if (!(await par.usarEm(...pos))) return 'não mirou';
          await par.esperar(500);
          const painel = document.querySelector<HTMLElement>('[data-painel-bau]');
          if (!painel || painel.hidden) return 'painel fechado';
          const mover = (item: string, destino: number) => {
            const i = par.slotDe(item);
            if (i < 0) return;
            par.clicarSlot(`.slot-inv[data-indice="${i}"]`);
            par.clicarSlot(`[data-externo="bau:${destino}"]`);
          };
          mover('carvao', 0);
          mover('bloco:12', 4);
          mover('bloco:3', 26);
          // botão direito: leva um só item de tábua
          const t = par.slotDe('bloco:7');
          if (t >= 0) {
            par.clicarSlot(`.slot-inv[data-indice="${t}"]`);
            par.clicarSlot('[data-externo="bau:13"]', true);
            par.clicarSlot(`.slot-inv[data-indice="${t}"]`);
          }
          (window as any).__inventarioUI.fechar();
          await par.quadros(2);
          return 'ok';
        },
        { cx, cz, y },
      );
      expect(bau).toBe('ok');
      etapas.bauCheio = await retrato(page, { contagem: true });
      const quebrouBau = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          e.selecionarSlot!(8);
          const b = await window.__par.quebrar(cx - 4, y, cz);
          // no mesmo instante vai para o outro lado da plataforma: os itens só podem ser
          // pegos depois de 0,45 s, então ficam todos no chão (a ordem de coleta de vários
          // itens juntos depende dos quadros)
          e.teleportar!(cx + 4.5, cz + 0.5, y);
          await window.__par.esperar(3000);
          return b;
        },
        { cx, cz, y },
      );
      expect(quebrouBau).toBe(42);
      etapas.final = await retrato(page, { contagem: true });
      return { etapas, notas: { terreno, quebras } };
    },
  },

  /** Sobrevivência: fornalha cheia pela interface, funde até apagar e a saída é retirada. */
  fornalha: {
    modo: 'sobrevivencia',
    async rodar(page) {
      const base = await page.evaluate(() => window.__par.plataforma(5));
      await page.evaluate(() => window.__par.assentar());
      const { cx, cz, y0 } = base;
      const y = y0 + 1;
      const r = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const par = window.__par;
          const inv = e.inventario!;
          inv.adicionar('bloco:41', 1);
          inv.adicionar('ferro_bruto', 1);
          inv.adicionar('graveto', 3);
          inv.adicionar('maca', 2);
          e.selecionarSlot!(par.slotDe('bloco:41'));
          if (!(await par.colocar(cx + 2, y, cz))) return 'não colocou';
          await par.quadros(2);
          if (!(await par.usarEm(cx + 2, y, cz))) return 'não mirou';
          await par.esperar(500);
          const painel = document.querySelector<HTMLElement>('[data-painel-fornalha]');
          if (!painel || painel.hidden) return 'painel fechado';
          par.clicarSlot(`.slot-inv[data-indice="${par.slotDe('ferro_bruto')}"]`);
          par.clicarSlot('[data-externo="forn:entrada"]');
          par.clicarSlot(`.slot-inv[data-indice="${par.slotDe('graveto')}"]`);
          par.clicarSlot('[data-externo="forn:comb"]');
          // maçã não é combustível nem funde: volta para o mesmo slot
          const m = par.slotDe('maca');
          par.clicarSlot(`.slot-inv[data-indice="${m}"]`);
          par.clicarSlot('[data-externo="forn:comb"]');
          par.clicarSlot('[data-externo="forn:entrada"]');
          par.clicarSlot(`.slot-inv[data-indice="${m}"]`);
          (window as any).__inventarioUI.fechar();
          // acende, funde (8 s) e apaga quando o último graveto acaba. Entre um graveto e
          // outro ela pisca apagada por um passo (250 ms): só conta apagada por 3 s seguidos
          let acendeu = false;
          let apagadaDesde = 0;
          const fim = performance.now() + 90_000;
          while (performance.now() < fim) {
            await par.esperar(250);
            const b = e.bloco!(cx + 2, y, cz);
            if (b === 62) {
              acendeu = true;
              apagadaDesde = 0;
            } else if (acendeu && b === 41) {
              apagadaDesde ||= performance.now();
              if (performance.now() - apagadaDesde > 3000) break;
            }
          }
          if (!acendeu) return 'não acendeu';
          if (e.bloco!(cx + 2, y, cz) !== 41) return 'não apagou';
          // tira o lingote pela interface e põe num slot vazio da mochila
          await par.usarEm(cx + 2, y, cz);
          await par.esperar(500);
          par.clicarSlot('[data-externo="forn:saida"]');
          par.clicarSlot('.slot-inv[data-indice="20"]');
          (window as any).__inventarioUI.fechar();
          await par.quadros(2);
          return 'ok';
        },
        { cx, cz, y },
      );
      expect(r).toBe('ok');
      return { etapas: { final: await retrato(page) }, notas: {} };
    },
  },

  /** Sobrevivência: vai ao povoado mais perto, chega, e faz as trocas das três profissões. */
  trocas: {
    modo: 'sobrevivencia',
    async rodar(page) {
      const p = await page.evaluate(() => window.__brumaluz!.povoados!()[0]);
      expect(p, 'nenhum povoado perto do nascimento').toBeTruthy();
      await page.evaluate((p) => window.__brumaluz!.teleportar!(p.cx + 2.5, p.cz + 2.5), p);
      await page.waitForFunction(
        (n) =>
          (window.__brumaluz!.criaturas?.() ?? []).filter((c) => c.tipo === 'morador').length === n,
        p.moradores,
        { timeout: 150_000 },
      );
      await page.waitForFunction(() => window.__par.eventos.includes('povoado'), undefined, {
        timeout: 60_000,
      });
      const itens: [string, number][] = [
        ['bloco:12', 30],
        ['carvao', 10],
        ['graveto', 10],
        ['ferro_bruto', 6],
        ['peixe_cru', 6],
        ['carne_crua', 6],
        ['bloco:10', 6],
        ['bloco:65', 2],
        ['frutinhas', 20],
        ['bloco:4', 8],
        ['bloco:3', 12],
        ['bloco:46', 8],
        ['bloco:7', 12],
      ];
      await page.evaluate((itens) => {
        const e = window.__brumaluz!;
        for (const [i, q] of itens) e.inventario!.adicionar(i, q);
        // carvão na mão: não é bloco nem comida, então "usar" no vazio não muda nada
        e.selecionarSlot!(1);
      }, itens);
      // abre as trocas mirando num morador, como no e2e do povoado (sem trocar: a
      // profissão de quem atende depende de quem está mais perto naquele quadro)
      const abriuMirando = await page.evaluate(async (p) => {
        const e = window.__brumaluz!;
        let abriu = false;
        for (let t = 0; t < 12 && !abriu; t++) {
          const [ex, , ez] = e.posicao!;
          const todos = (e.criaturas?.() ?? [])
            .filter((c) => c.tipo === 'morador')
            .sort((a, b) => Math.hypot(a.x - ex, a.z - ez) - Math.hypot(b.x - ex, b.z - ez));
          const m = todos[t % Math.max(1, todos.length)];
          if (!m) break;
          const d = Math.hypot(m.x - ex, m.z - ez) || 1;
          e.teleportar!(m.x - ((m.x - ex) / d) * 2, m.z - ((m.z - ez) / d) * 2, m.y);
          await window.__par.quadros(2);
          const [px, py, pz] = e.posicao!;
          e.apontar!(
            Math.atan2(m.x - px, m.z - pz),
            -Math.atan2(m.y + 1.1 - py, Math.hypot(m.x - px, m.z - pz)),
          );
          await window.__par.quadros(1);
          // mirando porta, cama, baú ou fornalha de uma casa, "usar" mexeria no povoado
          const a = e.alvo;
          if (a && [40, 41, 42, 56, 57, 58, 62].includes(e.bloco!(a.x, a.y, a.z))) continue;
          e.controleDireto!.usar();
          await window.__par.quadros(1);
          const painel = document.querySelector<HTMLElement>('[data-painel-trocas]');
          abriu = !!painel && !painel.hidden;
        }
        (window as any).__inventarioUI.fechar();
        e.teleportar!(p.cx + 2.5, p.cz + 2.5);
        await window.__par.esperar(3000);
        return abriu;
      }, p);
      const trocas = await page.evaluate(async () => {
        const out: Record<string, boolean[]> = {};
        const e = window.__brumaluz!;
        const perto = async (profissao: string) => {
          const m = (e.criaturas?.() ?? []).find((c: any) => c.profissao === profissao) as any;
          if (!m) return undefined;
          e.teleportar!(m.x + 1.2, m.z, m.y);
          await e.sincronizar?.();
          return m.id as number;
        };
        for (const profissao of ['ferreiro', 'cozinheiro', 'construtor']) {
          const criatura = await perto(profissao);
          window.dispatchEvent(
            new CustomEvent('brumaluz:trocar', {
              detail: { profissao, nome: 'Morador', criatura },
            }),
          );
          await window.__par.esperar(300);
          const botoes = [
            ...document.querySelectorAll<HTMLButtonElement>('[data-painel-trocas] button.fazer'),
          ];
          out[profissao] = [];
          for (const b of botoes) {
            const pode = b.getAttribute('aria-disabled') !== 'true';
            out[profissao].push(pode);
            await perto(profissao);
            b.click();
            await window.__par.quadros(1);
            await e.sincronizar?.();
          }
          (window as any).__inventarioUI.fechar();
          await window.__par.quadros(1);
        }
        const p0 = (e.povoados?.() ?? [])[0];
        if (p0 && e.sincronizar) {
          e.teleportar!(p0.cx + 2.5, p0.cz + 2.5);
          await window.__par.assentar();
        }
        return out;
      });
      // abrir mirando depende de quem está na frente naquele quadro: só aparece no log
      console.log(`trocas: abriu mirando num morador = ${abriuMirando}`);
      return {
        etapas: { final: await retrato(page) },
        notas: { povoado: p, trocas },
      };
    },
  },

  /** Sobrevivência: cama marca o renascer, queda, fome, comer, desmaiar e renascer. */
  sobrevivencia: {
    modo: 'sobrevivencia',
    async rodar(page) {
      const base = await page.evaluate(() => window.__par.plataforma(5));
      await page.evaluate(() => window.__par.assentar());
      const { cx, cz, y0 } = base;
      const y = y0 + 1;
      expect(y0 + 27, 'plataforma alta demais para a queda fatal').toBeLessThan(126);
      const cama = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const par = window.__par;
          e.inventario!.adicionar('bloco:56', 1);
          e.inventario!.adicionar('maca', 3);
          e.inventario!.adicionar('bloco:12', 5);
          e.selecionarSlot!(par.slotDe('bloco:56'));
          if (!(await par.colocar(cx + 2, y, cz))) return 'não colocou';
          await par.quadros(2);
          if (!(await par.usarEm(cx + 2, y, cz))) return 'não mirou';
          await par.esperar(500);
          return 'ok';
        },
        { cx, cz, y },
      );
      expect(cama).toBe('ok');
      // fome primeiro (com a barriga cheia a vida voltaria com o tempo real): 75 pulos
      // correndo gastam a saturação (5) e 10 de fome
      await page.evaluate(async () => {
        const s = window.__brumaluz!.sobrevivencia!;
        for (let i = 0; i < 75; i++) s.pulo(true);
        await window.__brumaluz!.sincronizar?.();
      });
      const etapas: Etapas = { faminto: await retrato(page) };
      // queda de 8,5 blocos: 5 de dano
      await page.evaluate(
        ({ cx, cz, y }) => window.__brumaluz!.teleportar!(cx + 0.5, cz + 0.5, y + 8.5),
        { cx, cz, y },
      );
      await page.waitForFunction(() => window.__par.danos.length > 0, undefined, {
        timeout: 30_000,
      });
      await page.evaluate(() => window.__par.assentar());
      etapas.caiu = await retrato(page);
      // come uma maçã olhando para o céu
      const comeu = await page.evaluate(async () => {
        const e = window.__brumaluz!;
        e.selecionarSlot!(window.__par.slotDe('maca'));
        e.apontar!(0, -1.3);
        await window.__par.quadros(2);
        e.controleDireto!.usar();
        await window.__par.quadros(2);
        await e.sincronizar?.();
        return window.__par.eventos.includes('comeu');
      });
      expect(comeu).toBe(true);
      etapas.comeu = await retrato(page);
      // queda fatal: o inventário espalha no chão da plataforma
      await page.evaluate(
        ({ cx, cz, y }) => window.__brumaluz!.teleportar!(cx + 0.5, cz + 0.5, y + 25.5),
        { cx, cz, y },
      );
      await page.waitForFunction(() => window.__par.eventos.includes('morte'), undefined, {
        timeout: 30_000,
      });
      await page.evaluate(() => window.__par.esperar(4000));
      etapas.desmaiou = await retrato(page, { posses: true });
      // renasce pelo botão da tela de desmaio: volta no chão, embaixo da cama
      await page.evaluate(() => document.querySelector<HTMLElement>('[data-renascer]')!.click());
      await page.evaluate(() => window.__par.assentar());
      await page.evaluate(() => window.__par.esperar(2500));
      etapas.final = await retrato(page, { posses: true });
      const danos = await page.evaluate(() => window.__par.danos);
      return { etapas, notas: { danos } };
    },
  },

  /** Criativo: clima, dia, estações, hora passando da meia-noite e dormir na cama. */
  clima: {
    modo: 'criativo',
    async rodar(page) {
      const base = await page.evaluate(() => window.__par.plataforma(5));
      await page.evaluate(() => window.__par.assentar());
      const { cx, cz, y0 } = base;
      const y = y0 + 1;
      const etapas: Etapas = {};
      await page.evaluate(async () => {
        const e = window.__brumaluz!;
        e.definirClima!('chuva');
        e.definirDia!(4);
        e.hora = 0.7;
        await window.__par.esperar(1500);
      });
      etapas.chuvaVerao = await retrato(page, { hora: true });
      // passa da meia-noite com o relógio parado: conta um dia
      await page.evaluate(async () => {
        const e = window.__brumaluz!;
        e.definirClima!('tempestade');
        e.hora = 0.95;
        await window.__par.quadros(3);
        e.hora = 0.05;
        await window.__par.quadros(3);
      });
      etapas.meiaNoite = await retrato(page, { hora: true });
      // dorme à noite numa cama: amanhece no dia seguinte e o renascer vai para a cama
      const dormiu = await page.evaluate(
        async ({ cx, cz, y }) => {
          const e = window.__brumaluz!;
          const par = window.__par;
          e.definirClima!('nublado');
          e.definirDia!(7);
          e.hora = 0.85;
          e.inventario!.definir(0, { item: 'bloco:56', qtd: 1 });
          e.selecionarSlot!(0);
          if (!(await par.colocar(cx + 2, y, cz))) return 'não colocou';
          const fim = performance.now() + 20_000;
          while ((e.atmosfera?.noite ?? 0) < 0.4 && performance.now() < fim) await par.quadros(1);
          if (!(await par.usarEm(cx + 2, y, cz))) return 'não mirou';
          const ate = performance.now() + 20_000;
          while (!par.eventos.includes('dormiu') && performance.now() < ate) await par.esperar(200);
          await par.quadros(2);
          return par.eventos.includes('dormiu') ? 'ok' : 'não dormiu';
        },
        { cx, cz, y },
      );
      expect(dormiu).toBe('ok');
      etapas.dormiu = await retrato(page, { hora: true });
      await page.evaluate(async () => {
        const e = window.__brumaluz!;
        e.definirClima!('neblina');
        e.definirDia!(9);
        e.hora = 0.5;
        await window.__par.quadros(3);
      });
      etapas.final = await retrato(page, { hora: true });
      return { etapas, notas: {} };
    },
  },
};

// ---------------------------------------------------------------------------------------
// Gravar e conferir
// ---------------------------------------------------------------------------------------

/**
 * JSON legível e curto: o que cabe em uma linha fica numa linha; listas longas de valores
 * simples (pares das edições, slots vazios) são quebradas em linhas de até 100 colunas.
 */
function formatar(v: unknown, recuo = ''): string {
  const inline = JSON.stringify(v);
  if (inline === undefined) return 'null';
  if (inline.length + recuo.length <= 100 || v === null || typeof v !== 'object') return inline;
  const dentro = recuo + '  ';
  if (Array.isArray(v)) {
    const partes = v.map((x) => JSON.stringify(x) ?? 'null');
    if (partes.every((p) => p.length <= 40)) {
      const linhas: string[] = [];
      let atual = '';
      for (const p of partes) {
        if (atual && dentro.length + atual.length + p.length + 2 > 100) {
          linhas.push(atual + ',');
          atual = '';
        }
        atual += (atual ? ', ' : '') + p;
      }
      linhas.push(atual);
      return `[\n${linhas.map((l) => dentro + l).join('\n')}\n${recuo}]`;
    }
    return `[\n${v.map((x) => dentro + formatar(x, dentro)).join(',\n')}\n${recuo}]`;
  }
  const pares = Object.entries(v as Record<string, unknown>).map(
    ([k, x]) => `${dentro}${JSON.stringify(k)}: ${formatar(x, dentro)}`,
  );
  return `{\n${pares.join(',\n')}\n${recuo}}`;
}

const filtroSessoes = process.env.PARIDADE_SESSOES?.split(',');
for (const [nome, sessao] of Object.entries(SESSOES)) {
  if (filtroSessoes && !filtroSessoes.includes(nome)) continue;
  for (const tema of TEMAS) {
    for (const semente of SEMENTES) {
      test(`paridade: ${nome} · semente ${semente} · ${tema}`, async ({ browser }, info) => {
        test.setTimeout(GRAVAR ? 900_000 : 480_000);
        const baseURL = String(info.project.use.baseURL);
        const arquivo = `${PASTA}/${nome}-${semente}-${tema}.json`;
        const rodar = async () => {
          const inicio = Date.now();
          const m = await abrirMundo(browser, baseURL, semente, tema, sessao.modo);
          const carregou = Date.now();
          try {
            const r = await sessao.rodar(m.page);
            expect(m.erros, 'erros na página').toEqual([]);
            if (process.env.PARIDADE_NOTAS) console.log(JSON.stringify(r.notas));
            console.log(
              `${nome} ${semente} ${tema}: carregar ${((carregou - inicio) / 1000).toFixed(0)} s, ` +
                `sessão ${((Date.now() - carregou) / 1000).toFixed(0)} s`,
            );
            return r;
          } finally {
            await m.fechar();
          }
        };
        const gravacao = await rodar();
        const conteudo = { sessao: nome, semente, tema, modo: sessao.modo, ...gravacao };
        if (GRAVAR) {
          // a sessão de novo, do zero: o retrato tem que sair igual
          const outra = await rodar();
          expect(outra, 'duas gravações da mesma sessão deram resultados diferentes').toEqual(
            gravacao,
          );
          mkdirSync(PASTA, { recursive: true });
          writeFileSync(arquivo, formatar(conteudo) + '\n');
        } else {
          expect(existsSync(arquivo), `sem gravação: ${arquivo} (rode com PARIDADE=gravar)`).toBe(
            true,
          );
          const gravado = JSON.parse(readFileSync(arquivo, 'utf8'));
          expect(JSON.parse(JSON.stringify(conteudo))).toEqual(gravado);
        }
      });
    }
  }
}
