/**
 * A conferência de "nada voltou para trás" por área (dono, 22 nov 2026).
 *
 *   node scripts/conferir.ts                 # pelo que mudou no ramo (git diff origin/main...HEAD)
 *   node scripts/conferir.ts --areas som,personagem   # e mais estas áreas
 *   node scripts/conferir.ts --tudo          # o regime antigo: tudo, nas três telas
 *   node scripts/conferir.ts --seco          # só mostra o plano, não roda nada
 *
 * Outras opções: --base <ref> (padrão origin/main), --lote <n> (arquivos por rodada do e2e,
 * padrão 12), --sem-quarentena, --sem-vitest, --so-fumaca, --mudados a,b (no lugar do diff,
 * para simular uma mudança).
 *
 * Roda, nesta ordem: o Vitest inteiro e o build (sempre); a fumaça (sempre); as áreas que o
 * ramo tocou (o mapa é o e2e/areas.json); a paridade, se mexeu no núcleo, na rede, no
 * servidor ou no que o núcleo importa; e, à parte, a quarentena, que não bloqueia. O e2e vai
 * na placa de vídeo pelo scripts/e2e-gpu.sh, no máximo 2 trabalhadores por rodada. No fim, o
 * tempo de cada parte e o resultado, para o registro de qualidade da spec.
 *
 * E2E_ENV vale como no e2e-gpu.sh (padrão "-u 1000:1000 -e HOME=/tmp").
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { areaDaSuite, grepDosItens, lerMapa, planejar, type ItemDeTeste } from './areas.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
process.chdir(RAIZ);

// ------------------------------------------------------------------------------- argumentos
const args = process.argv.slice(2);
const valor = (nome: string) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};
const tem = (nome: string) => args.includes(nome);
if (tem('--ajuda') || tem('-h')) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0]);
  process.exit(0);
}
const BASE = valor('--base') ?? 'origin/main';
const LOTE = Number(valor('--lote') ?? 12);
const TUDO = tem('--tudo');
const SECO = tem('--seco');
const forcadas = (valor('--areas') ?? '').split(',').filter(Boolean);

// ------------------------------------------------------------------------------- o que mudou
const git = (...a: string[]) => {
  const r = spawnSync('git', a, { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${a.join(' ')}: ${r.stderr}`);
  return r.stdout.split('\n').filter(Boolean);
};
// --mudados a,b: no lugar do diff, estes arquivos (para simular uma mudança e medir)
const simulados = valor('--mudados');
const mudados = simulados
  ? simulados.split(',').filter(Boolean)
  : [
      ...new Set([
        ...git('diff', '--name-only', `${BASE}...HEAD`),
        // e o que ainda não foi para commit (mudado ou novo)
        ...git('diff', '--name-only', 'HEAD'),
        ...git('ls-files', '--others', '--exclude-standard'),
      ]),
    ].sort();

const mapa = lerMapa(RAIZ);
const plano = planejar(RAIZ, mapa, mudados, { forcadas, tudo: TUDO });
const daSuite = areaDaSuite(mapa);

// o que roda em cada parte
const naArea = (it: ItemDeTeste) => plano.areas.includes(daSuite.get(it.suite) ?? '');
const quarentena = mapa.quarentena.filter((q) => plano.tudo || naArea(q));
const suitesDasAreas = [...plano.areas.flatMap((a) => mapa.areas[a].suites), ...plano.suitesAvulsas].sort();
const suitesTudo = Object.values(mapa.areas)
  .flatMap((a) => a.suites)
  .sort();

console.log(`\n== conferência (${plano.tudo ? 'regime antigo, tudo' : 'por área'}) ==`);
console.log(`base: ${BASE}; ${mudados.length} arquivo(s) mudado(s)`);
if (plano.tudo) console.log(`tudo por causa de: ${plano.porqueTudo}`);
for (const a of plano.areas)
  console.log(`  área ${a} (${mapa.areas[a].suites.length} suítes): ${(plano.porque[a] ?? ['--tudo']).slice(0, 4).join(', ')}${(plano.porque[a]?.length ?? 0) > 4 ? ', ...' : ''}`);
if (plano.suitesAvulsas.length)
  console.log(`  e mais ${plano.suitesAvulsas.length} suítes pelo teste mudado: ${plano.suitesAvulsas.slice(0, 6).join(', ')}${plano.suitesAvulsas.length > 6 ? ', ...' : ''}`);
console.log(`  paridade: ${plano.paridade ? `sim (${plano.porqueParidade.slice(0, 4).join(', ') || '--tudo'})` : 'não'}`);
if (plano.soFumaca.length) console.log(`  só a fumaça: ${plano.soFumaca.slice(0, 8).join(', ')}${plano.soFumaca.length > 8 ? ', ...' : ''}`);
console.log(`  fumaça: ${mapa.fumaca.length} itens; quarentena: ${quarentena.length} itens`);
if (SECO) process.exit(0);

// ------------------------------------------------------------------------------- rodar
const PASTA = join(tmpdir(), `terrario-conferir-${new Date().toISOString().replace(/[:.]/g, '-')}`);
mkdirSync(PASTA, { recursive: true });
const ENV_BASE = process.env.E2E_ENV ?? '-u 1000:1000 -e HOME=/tmp';

interface Parte {
  nome: string;
  s: number;
  ok: boolean;
  bloqueia: boolean;
  resumo: string;
}
const partes: Parte[] = [];

function rodar(cmd: string, a: string[], env: NodeJS.ProcessEnv, log: string): Promise<number> {
  return new Promise((ok) => {
    const filho = spawn(cmd, a, { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] });
    const saida: Buffer[] = [];
    const guardar = (b: Buffer) => {
      saida.push(b);
      process.stdout.write(b);
    };
    filho.stdout.on('data', guardar);
    filho.stderr.on('data', guardar);
    filho.on('close', (c) => {
      writeFileSync(log, Buffer.concat(saida));
      ok(c ?? 1);
    });
  });
}

async function passo(nome: string, bloqueia: boolean, f: () => Promise<{ ok: boolean; resumo: string }>) {
  const t0 = Date.now();
  console.log(`\n== ${nome} ==`);
  const r = await f();
  partes.push({ nome, s: (Date.now() - t0) / 1000, ok: r.ok, bloqueia, resumo: r.resumo });
}

interface Contagem {
  passou: number;
  falhou: number;
  instavel: number;
  pulou: number;
  falhas: string[];
}
const somar = (a: Contagem, b: Contagem): Contagem => ({
  passou: a.passou + b.passou,
  falhou: a.falhou + b.falhou,
  instavel: a.instavel + b.instavel,
  pulou: a.pulou + b.pulou,
  falhas: [...a.falhas, ...b.falhas],
});
const ZERO: Contagem = { passou: 0, falhou: 0, instavel: 0, pulou: 0, falhas: [] };

/** Lê o relatório JSON do Playwright (as suítes aninhadas, cada teste com o seu resultado). */
function contar(arquivo: string): Contagem | null {
  if (!existsSync(arquivo)) return null;
  const c: Contagem = { ...ZERO, falhas: [] };
  type Suite = { title: string; file?: string; specs?: { title: string; line: number; file: string; tests: { status: string }[] }[]; suites?: Suite[] };
  const andar = (s: Suite) => {
    for (const sp of s.specs ?? [])
      for (const t of sp.tests) {
        if (t.status === 'expected') c.passou++;
        else if (t.status === 'skipped') c.pulou++;
        else if (t.status === 'flaky') c.instavel++;
        else {
          c.falhou++;
          c.falhas.push(`${sp.file}:${sp.line} ${sp.title}`);
        }
      }
    for (const f of s.suites ?? []) andar(f);
  };
  for (const s of (JSON.parse(readFileSync(arquivo, 'utf8')) as { suites: Suite[] }).suites) andar(s);
  return c;
}

/** Uma rodada do e2e na placa: estes arquivos, com grep e grep-invert, 2 trabalhadores. */
async function e2e(
  rotulo: string,
  arquivos: string[],
  op: { grep?: string; inverso?: string; env?: string[] } = {},
): Promise<Contagem> {
  const json = `${rotulo}.json`;
  const env = [
    ENV_BASE,
    `-v ${PASTA}:/conferir`,
    `-e PLAYWRIGHT_JSON_OUTPUT_NAME=/conferir/${json}`,
    ...(op.env ?? []).map((e) => `-e ${e}`),
  ].join(' ');
  // o e2e-gpu.sh junta os argumentos num `sh -lc`: o grep vai entre aspas simples
  const a = [
    ...arquivos.map((f) => `e2e/${f}`),
    '--workers',
    '2',
    '--trace',
    'off',
    '--reporter=list,json',
    '--pass-with-no-tests',
    ...(op.grep ? [`--grep='${op.grep}'`] : []),
    ...(op.inverso ? [`--grep-invert='${op.inverso}'`] : []),
  ];
  const codigo = await rodar('scripts/e2e-gpu.sh', a, { E2E_ENV: env }, join(PASTA, `${rotulo}.log`));
  const c = contar(join(PASTA, json));
  if (!c) return { ...ZERO, falhou: 1, falhas: [`${rotulo}: a rodada não terminou (código ${codigo}); log em ${PASTA}/${rotulo}.log`] };
  return c;
}

const lotes = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const texto = (c: Contagem) =>
  `${c.passou} passaram, ${c.falhou} falharam${c.instavel ? `, ${c.instavel} instáveis` : ''}${c.pulou ? `, ${c.pulou} pulados` : ''}`;

async function lotesE2e(nome: string, suites: string[], op: { inverso?: string; env?: string[] }): Promise<{ ok: boolean; resumo: string }> {
  let c = ZERO;
  const ls = lotes(suites, LOTE);
  for (const [i, l] of ls.entries()) {
    console.log(`-- ${nome}: rodada ${i + 1} de ${ls.length} (${l.length} arquivos)`);
    c = somar(c, await e2e(`${nome}-${i + 1}`, l, op));
  }
  return { ok: c.falhou === 0, resumo: texto(c) + (c.falhas.length ? `\n      ${c.falhas.join('\n      ')}` : '') };
}

const T0 = Date.now();
if (!tem('--sem-vitest'))
  await passo('Vitest', true, async () => {
    const c = await rodar('npx', ['vitest', 'run'], {}, join(PASTA, 'vitest.log'));
    const log = readFileSync(join(PASTA, 'vitest.log'), 'utf8');
    return { ok: c === 0, resumo: (log.match(/Tests\s+[^\n]+/)?.[0] ?? `código ${c}`).replace(/\s+/g, ' ') };
  });
let buildOk = true;
await passo('build', true, async () => {
  const c = await rodar('npm', ['run', 'build'], {}, join(PASTA, 'build.log'));
  buildOk = c === 0;
  return { ok: buildOk, resumo: buildOk ? 'ok' : `código ${c}` };
});

if (buildOk) {
  const semQuarentena = quarentena.length ? grepDosItens(quarentena) : undefined;
  const telas = plano.tudo ? ['E2E_TELAS=todas'] : [];
  if (!plano.tudo) {
    await passo('fumaça', true, async () => {
      const c = await e2e('fumaca', [...new Set(mapa.fumaca.map((f) => f.suite))], {
        grep: grepDosItens(mapa.fumaca),
        inverso: semQuarentena,
      });
      return { ok: c.falhou === 0, resumo: texto(c) + (c.falhas.length ? `\n      ${c.falhas.join('\n      ')}` : '') };
    });
    if (!tem('--so-fumaca') && suitesDasAreas.length)
      await passo(`áreas (${[...plano.areas, ...(plano.suitesAvulsas.length ? [`+${plano.suitesAvulsas.length} suítes`] : [])].join(', ')})`, true, () =>
        // o que a fumaça já rodou não roda de novo
        lotesE2e('areas', suitesDasAreas, { inverso: [grepDosItens(mapa.fumaca), semQuarentena].filter(Boolean).join('|') }),
      );
  } else {
    await passo('e2e inteiro (três telas)', true, () => lotesE2e('tudo', suitesTudo, { inverso: semQuarentena, env: telas }));
  }
  if (plano.paridade && !tem('--so-fumaca'))
    await passo('paridade', true, async () => {
      const c = await e2e('paridade', [mapa.paridade.suite], { env: ['PARIDADE=conferir'] });
      return { ok: c.falhou === 0 && c.passou > 0, resumo: texto(c) + (c.falhas.length ? `\n      ${c.falhas.join('\n      ')}` : '') };
    });
  if (quarentena.length && !tem('--sem-quarentena') && !tem('--so-fumaca'))
    await passo('quarentena (não bloqueia)', false, async () => {
      const c = await e2e('quarentena', [...new Set(quarentena.map((q) => q.suite))], {
        grep: grepDosItens(quarentena),
        env: telas,
      });
      return { ok: c.falhou === 0, resumo: `${c.passou} de ${c.passou + c.falhou + c.instavel} passaram` + (c.falhas.length ? `\n      ${c.falhas.join('\n      ')}` : '') };
    });
}

// ------------------------------------------------------------------------------- o registro
const min = (s: number) => `${Math.floor(s / 60)} min ${String(Math.round(s % 60)).padStart(2, '0')} s`;
const bloqueou = partes.filter((p) => p.bloqueia && !p.ok);
const linhas = [
  '',
  `== registro da conferência (${plano.tudo ? 'tudo' : 'por área'}) ==`,
  `ramo: ${git('rev-parse', '--abbrev-ref', 'HEAD')[0]} @ ${git('rev-parse', '--short', 'HEAD')[0]}; base ${BASE}`,
  `áreas: ${plano.tudo ? 'todas' : plano.areas.join(', ') || 'nenhuma (só a fumaça)'}; paridade: ${plano.paridade ? 'sim' : 'não'}`,
  ...partes.map((p) => `  ${p.ok ? 'ok   ' : p.bloqueia ? 'FALHA' : 'aviso'}  ${p.nome.padEnd(34)} ${min(p.s).padStart(12)}   ${p.resumo}`),
  `  total ${min((Date.now() - T0) / 1000)}; ${bloqueou.length ? `FALHOU: ${bloqueou.map((p) => p.nome).join(', ')}` : 'nada voltou para trás'}`,
  `  logs em ${PASTA}`,
];
console.log(linhas.join('\n'));
writeFileSync(join(PASTA, 'registro.txt'), linhas.join('\n') + '\n');
process.exit(bloqueou.length ? 1 : 0);
