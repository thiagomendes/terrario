import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  areaDaSuite,
  arquivosDe,
  casa,
  ehSuite,
  fechoDoNucleo,
  grepDosItens,
  lerMapa,
  planejar,
} from '../scripts/areas';

/**
 * O mapa das áreas da conferência (e2e/areas.json, dono 22 nov 2026) não pode ficar para trás:
 * toda suíte e2e cai numa área, todo arquivo de src/ dispara alguma área (ou é comum), os
 * gatilhos e as suítes existem, e a fumaça e a quarentena apontam para testes de verdade.
 */
const RAIZ = join(__dirname, '..');
const mapa = lerMapa(RAIZ);
const suites = arquivosDe(RAIZ, 'e2e')
  .filter(ehSuite)
  .map((f) => f.slice('e2e/'.length));

describe('o mapa das áreas (e2e/areas.json)', () => {
  it('toda suíte e2e está em uma área só (a paridade fica fora)', () => {
    const contagem = new Map<string, number>();
    for (const a of Object.values(mapa.areas)) for (const s of a.suites) contagem.set(s, (contagem.get(s) ?? 0) + 1);
    const semArea = suites.filter((s) => s !== mapa.paridade.suite && !contagem.has(s));
    expect(semArea, 'suítes sem área: ponha cada uma numa área do e2e/areas.json').toEqual([]);
    expect([...contagem].filter(([, n]) => n > 1).map(([s]) => s), 'suítes em duas áreas').toEqual([]);
    expect(contagem.has(mapa.paridade.suite), 'a paridade tem gatilhos próprios, fora das áreas').toBe(false);
  });

  it('as suítes, os gatilhos, os comuns e o "tudo" existem', () => {
    const todas = [...Object.values(mapa.areas).flatMap((a) => a.suites), mapa.paridade.suite];
    expect(todas.filter((s) => !suites.includes(s)), 'suítes que não existem mais').toEqual([]);
    const caminhos = [
      ...Object.values(mapa.areas).flatMap((a) => a.gatilhos),
      ...mapa.comuns,
      ...mapa.tudo,
      ...mapa.paridade.gatilhos,
    ];
    expect(caminhos.filter((g) => !existsSync(join(RAIZ, g))), 'gatilhos que não existem mais').toEqual([]);
    for (const [id, a] of Object.entries(mapa.areas)) {
      expect(a.suites.length, `${id}: área sem suíte`).toBeGreaterThan(0);
      expect(a.gatilhos.length, `${id}: área sem gatilho`).toBeGreaterThan(0);
    }
  });

  it('todo arquivo de src/ dispara alguma área ou é comum', () => {
    const gatilhos = [...Object.values(mapa.areas).flatMap((a) => a.gatilhos), ...mapa.comuns];
    const soltos = arquivosDe(RAIZ, 'src').filter((f) => !gatilhos.some((g) => casa(g, f)));
    expect(soltos, 'arquivos de src/ sem área: ponha nos gatilhos de uma área do e2e/areas.json').toEqual([]);
  });

  it('a fumaça e a quarentena apontam para suítes do mapa, sem aspas simples no grep', () => {
    const daSuite = areaDaSuite(mapa);
    for (const it of [...mapa.fumaca, ...mapa.quarentena]) {
      expect(daSuite.has(it.suite), `${it.suite} não está em área nenhuma`).toBe(true);
      expect(`${it.suite} ${it.titulo ?? ''}`).not.toContain("'");
    }
    for (const q of mapa.quarentena) {
      expect(q.titulo, `${q.suite}: a quarentena é por teste, com o pedaço do título`).toBeTruthy();
      expect(q.motivo, `${q.suite}: a quarentena diz o motivo`).toBeTruthy();
    }
  });

  it('cada item da fumaça e da quarentena pega pelo menos um teste (a lista do Playwright)', () => {
    const r = spawnSync('npx', ['playwright', 'test', '--list', '--reporter=json'], {
      cwd: RAIZ,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    expect(r.status, r.stderr).toBe(0);
    type Suite = { title: string; specs?: { title: string }[]; suites?: Suite[] };
    const titulos: string[] = [];
    const andar = (s: Suite, pre: string[]) => {
      const caminho = s.title ? [...pre, s.title] : pre;
      for (const sp of s.specs ?? []) titulos.push(` ${[...caminho, sp.title].join(' ')}`);
      for (const f of s.suites ?? []) andar(f, caminho);
    };
    for (const s of (JSON.parse(r.stdout) as { suites: Suite[] }).suites) andar(s, []);
    expect(titulos.length).toBeGreaterThan(400);
    for (const it of [...mapa.fumaca, ...mapa.quarentena]) {
      const re = new RegExp(grepDosItens([it]));
      expect(titulos.filter((t) => re.test(t)).length, `${it.suite} ${it.titulo ?? ''}`).toBeGreaterThan(0);
    }
  }, 120_000);

  it('a escolha: só a lojinha mudou, roda a área dela, sem paridade', () => {
    const p = planejar(RAIZ, mapa, ['src/ui/alma/loja.ts']);
    expect(p.tudo).toBe(false);
    expect(p.areas).toEqual(['alma-lojinha']);
    expect(p.paridade).toBe(false);
  });

  it('a escolha: o núcleo e o que ele importa chamam a paridade; o package.json chama tudo', () => {
    expect(planejar(RAIZ, mapa, ['src/nucleo/nucleo.ts']).paridade).toBe(true);
    // o inventário é regra do núcleo: entra no fecho dos imports
    expect(fechoDoNucleo(RAIZ).has('src/jogo/inventario.ts')).toBe(true);
    expect(planejar(RAIZ, mapa, ['src/jogo/inventario.ts']).paridade).toBe(true);
    expect(planejar(RAIZ, mapa, ['src/ui/roleta.ts']).paridade).toBe(false);
    const t = planejar(RAIZ, mapa, ['package.json']);
    expect(t.tudo).toBe(true);
    expect(t.areas).toEqual(Object.keys(mapa.areas));
  });

  it('a escolha: a cena sozinha é comum (só a fumaça); o teste mudado roda ele mesmo, sem a área', () => {
    const c = planejar(RAIZ, mapa, ['src/render/cena.ts', '.sdd/backlog.md']);
    expect(c.areas).toEqual([]);
    expect(c.suitesAvulsas).toEqual([]);
    expect(c.soFumaca).toEqual(['src/render/cena.ts', '.sdd/backlog.md']);
    // o ajudante: as suítes que o importam (direto ou não)
    const g = planejar(RAIZ, mapa, ['e2e/achar-amigo-palco.ts']);
    expect(g.areas).toEqual([]);
    expect(g.suitesAvulsas).toEqual(expect.arrayContaining(['achar-amigo.spec.ts', 'achar-amigo-nuvem.spec.ts']));
    expect(g.suitesAvulsas).not.toContain('vila-neon.spec.ts');
    // a suíte mudada de uma área que já roda não entra duas vezes
    const s = planejar(RAIZ, mapa, ['src/ui/alma/loja.ts', 'e2e/lojinha.spec.ts', 'e2e/vozes.spec.ts']);
    expect(s.areas).toEqual(['alma-lojinha']);
    expect(s.suitesAvulsas).toEqual(['vozes.spec.ts']);
  });

  it('o grep do Playwright: o nome da suíte inteiro e o título como texto', () => {
    const re = new RegExp(grepDosItens([{ suite: 'lojinha.spec.ts', titulo: 'lojinha premium (empe)' }]));
    expect(re.test(' lojinha.spec.ts empe lojinha premium (empe)')).toBe(true);
    expect(re.test(' lojinha.spec.ts pc lojinha premium (pc)')).toBe(false);
    expect(new RegExp(grepDosItens([{ suite: 'audio.spec.ts' }])).test(' vila-audio.spec.ts x')).toBe(false);
    expect(readFileSync(join(RAIZ, 'e2e/areas.json'), 'utf8')).toContain('"fumaca"');
  });
});
