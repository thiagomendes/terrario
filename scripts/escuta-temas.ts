/**
 * Página de escuta dos temas, sem abrir o jogo: renderiza em WAV as vozes das
 * criaturas, trechos da música por contexto e os sons de material de cada tema.
 *
 *   npx vite-node scripts/escuta-temas.ts <pasta-de-saida>
 *
 * A síntese aqui reproduz a do jogo (src/audio/sons.ts) em PCM: mesmas notas,
 * ondas, filtros e envelopes, em versão simplificada para ouvir e comparar.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import '../src/temas/todos';
import { obterTema, temasDisponiveis } from '../src/temas';
import { definirTemaAtivo } from '../src/temas/ativo';
import { PALETAS_MUSICAIS } from '../src/audio/sons';
import { sintetizarAmostra } from '../src/audio/amostras';
import type { GrupoMaterial } from '../src/audio/materiais';
import type { PioCriatura, Tema, ContextoMusicalTema } from '../src/temas/tipos';

const saida = process.argv[2] ?? 'escuta';
const TAXA = 22050;
mkdirSync(saida, { recursive: true });

function wav(dados: Float32Array, caminho: string): void {
  const n = dados.length;
  const b = new DataView(new ArrayBuffer(44 + n * 2));
  const str = (o: number, s: string) =>
    [...s].forEach((c, i) => b.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF');
  b.setUint32(4, 36 + n * 2, true);
  str(8, 'WAVEfmt ');
  b.setUint32(16, 16, true);
  b.setUint16(20, 1, true);
  b.setUint16(22, 1, true);
  b.setUint32(24, TAXA, true);
  b.setUint32(28, TAXA * 2, true);
  b.setUint16(32, 2, true);
  b.setUint16(34, 16, true);
  str(36, 'data');
  b.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++)
    b.setInt16(44 + i * 2, Math.max(-1, Math.min(1, dados[i])) * 32767, true);
  writeFileSync(caminho, new Uint8Array(b.buffer));
}

function onda(tipo: string, fase: number): number {
  const f = fase - Math.floor(fase);
  switch (tipo) {
    case 'square':
      return f < 0.5 ? 0.7 : -0.7;
    case 'sawtooth':
      return (2 * f - 1) * 0.7;
    case 'triangle':
      return 1 - 4 * Math.abs(f - 0.5);
    default:
      return Math.sin(2 * Math.PI * f);
  }
}

/** Passa-baixa de um polo (suficiente para o "brilho" do timbre). */
function passaBaixa(x: Float32Array, freq: number): void {
  const a = 1 - Math.exp((-2 * Math.PI * freq) / TAXA);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += a * (x[i] - y);
    x[i] = y;
  }
}

function normalizar(x: Float32Array, pico = 0.85): Float32Array {
  let m = 0;
  for (const v of x) m = Math.max(m, Math.abs(v));
  if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= pico / m;
  return x;
}

let semente = 1;
const rng = () => {
  semente = (semente * 16807) % 2147483647;
  return semente / 2147483647;
};

function voz(p: PioCriatura): Float32Array {
  const total = p.repeticoes * p.dur + (p.repeticoes - 1) * p.intervalo + 0.1;
  const s = new Float32Array(Math.ceil(total * TAXA));
  for (let r = 0; r < p.repeticoes; r++) {
    const t0 = r * (p.dur + p.intervalo);
    let fase = 0;
    const n = Math.floor(p.dur * TAXA);
    const ini = Math.floor(t0 * TAXA);
    for (let i = 0; i < n; i++) {
      const u = i / n;
      let f = p.de * Math.pow(p.ate / p.de, u);
      if (p.vibrato) f *= 1 + 0.025 * Math.sin(2 * Math.PI * p.vibrato * (i / TAXA));
      fase += f / TAXA;
      const env = Math.min(1, u / 0.12) * (u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1);
      const ruido = p.ruido ? (rng() * 2 - 1) * p.ruido * 0.6 : 0;
      s[ini + i] += (onda(p.onda, fase) + ruido) * env * (p.ganho ?? 1);
    }
  }
  return normalizar(s, 0.7);
}

const nota = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const midiDe = (f: number) => 69 + 12 * Math.log2(f / 440);

function musica(t: Tema, ctx: ContextoMusicalTema, segundos: number): Float32Array {
  const k = Math.pow(2, t.musica.transporte / 12);
  const dt = t.musica.paletas?.[ctx];
  const base = PALETAS_MUSICAIS[ctx];
  const acordes = dt
    ? dt.acordes.map((a) => a.map((m) => nota(m) * k))
    : base.acordes.map((a) => a.map((f) => f * k));
  const melodia = dt ? dt.melodia.map((m) => nota(m) * k) : base.melodia.map((f) => f * k);
  const intervalo = dt?.intervalo ?? base.intervalo;
  const chance = dt?.chanceNota ?? base.chanceNota;
  const tm = t.musica.timbre;
  const n = Math.floor(segundos * TAXA);
  const pad = new Float32Array(n);
  const sinos = new Float32Array(n);
  // acordes: duas vozes desafinadas por nota, ataque lento
  for (let a = 0, t0 = 0; t0 < segundos; a++, t0 += intervalo) {
    const ac = acordes[a % acordes.length];
    const dur = intervalo + 1;
    for (const f of ac)
      for (const cents of [-5 - tm.coro, 5 + tm.coro]) {
        const ff = f * Math.pow(2, cents / 1200);
        const ini = Math.floor(t0 * TAXA);
        const fim = Math.min(n, ini + Math.floor(dur * TAXA));
        let fase = rng();
        for (let i = ini; i < fim; i++) {
          const u = (i - ini) / TAXA;
          const env =
            Math.min(1, u / 2.5) *
            (u > dur * 0.6
              ? Math.max(0, 1 - (u - dur * 0.6) / (dur * 0.4)) * 0.7
              : u > 2.5
                ? 0.7 + 0.3 * (1 - (u - 2.5) / (dur * 0.6 - 2.5))
                : 1);
          fase += ff / TAXA;
          pad[i] += onda(tm.onda, fase) * env * 0.05;
        }
      }
  }
  passaBaixa(pad, 1400 * tm.brilho);
  // sinos da melodia
  for (let t0 = 0.5; t0 < segundos; t0 += 1.5 + rng() * 2.5) {
    if (rng() > chance) continue;
    const f = melodia[Math.floor(rng() * melodia.length)];
    for (const [atraso, ganho] of [
      [0, 0.06],
      [0.375, 0.025],
    ]) {
      const ini = Math.floor((t0 + atraso) * TAXA);
      const dur = 2.2 * tm.sustentacao;
      let fase = 0;
      for (let i = ini; i < Math.min(n, ini + dur * TAXA); i++) {
        const u = (i - ini) / TAXA;
        fase += f / TAXA;
        const amp = tm.sino && tm.sino !== 'sine' ? (tm.sino === 'triangle' ? 0.8 : 0.35) : 1;
        sinos[i] +=
          (onda(tm.sino ?? 'sine', fase) * amp + Math.sin(2 * Math.PI * fase * 3) * 0.12) *
          ganho *
          Math.exp(-u / (dur / 5));
      }
    }
  }
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = pad[i] + sinos[i];
  void midiDe;
  return normalizar(s, 0.6);
}

function material(t: Tema, g: GrupoMaterial): Float32Array {
  const aj = t.materiais[g];
  const tom = Math.max(0.5, Math.min(2, aj?.tom ?? 1));
  const partes: Float32Array[] = [];
  for (let v = 0; v < 3; v++) {
    const a = sintetizarAmostra('quebra', aj?.base ?? g, v, Math.round(TAXA / tom));
    partes.push(a, new Float32Array(Math.floor(TAXA * 0.15)));
  }
  const total = new Float32Array(partes.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of partes) {
    total.set(p, o);
    o += p.length;
  }
  return total;
}

const MATERIAIS: GrupoMaterial[] = ['pedra', 'terra', 'areia', 'madeira', 'folhagem', 'cristal'];
const CONTEXTOS: ContextoMusicalTema[] = ['dia', 'noite', 'caverna'];
const indice: Record<string, unknown> = {};
for (const id of temasDisponiveis()) {
  const t = obterTema(id);
  definirTemaAtivo(t);
  const pasta = join(saida, id);
  mkdirSync(pasta, { recursive: true });
  const arquivos: Record<string, string> = {};
  for (const [tipo, v] of Object.entries(t.vozes))
    for (const momento of ['chamado', 'susto', 'contente'] as const) {
      const nome = `voz-${tipo}-${momento}.wav`;
      wav(voz(v[momento]), join(pasta, nome));
      arquivos[nome] = `${t.textos.criaturas[tipo as keyof typeof t.textos.criaturas]}: ${momento}`;
    }
  for (const c of CONTEXTOS) {
    const nome = `musica-${c}.wav`;
    wav(musica(t, c, 14), join(pasta, nome));
    arquivos[nome] = `Música: ${c}`;
  }
  for (const g of MATERIAIS) {
    const nome = `material-${g}.wav`;
    wav(material(t, g), join(pasta, nome));
    arquivos[nome] = `Quebrar: ${g}`;
  }
  indice[id] = {
    nome: t.nome,
    acento: t.cores.acento,
    lema: t.lema,
    criaturas: t.textos.criaturas,
    arquivos,
  };
  console.log('pronto', id);
}
writeFileSync(join(saida, 'indice.json'), JSON.stringify(indice, null, 1));
