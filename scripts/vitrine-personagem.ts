/**
 * Vitrine do personagem em 3/4 (frente, lado direito e topo), sem abrir o jogo:
 *
 *   npx vite-node scripts/vitrine-personagem.ts <pasta-de-saida>
 *
 * Gera acessorios.png (um boneco por acessório, nos dois corpos) e temas.png
 * (a aparência sugerida de cada tema).
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import '../src/temas/todos';
import { obterTema, temasDisponiveis } from '../src/temas';
import { ACESSORIOS, aparenciaPadrao, type Aparencia } from '../src/personagem/aparencia';
import { montarPartes } from '../src/personagem/modelo';
import { gerarTexturaParte } from '../src/personagem/textura';
import { iso, novaImg, poligono, salvarPngEm, type Img, type V3 } from './iso';

const saida = process.argv[2] ?? 'vitrine-personagem';
/** Só estes acessórios (separados por vírgula), maiores: para olhar de perto. */
const so = process.argv[3]?.split(',');
mkdirSync(saida, { recursive: true });

/** Desenha o personagem com o centro dos pés em (cx, cy) na imagem. */
function desenhar(img: Img, a: Aparencia, cx: number, cy: number, w: number): void {
  const partes = montarPartes(a);
  // de trás para a frente: as caixas mais ao fundo primeiro
  const ordem = [...partes].sort(
    (p, q) =>
      p.posicao[0] + p.posicao[2] - (q.posicao[0] + q.posicao[2]) || p.posicao[1] - q.posicao[1],
  );
  for (const parte of ordem) {
    const t = gerarTexturaParte(a, parte);
    const [sx, sy, sz] = parte.tamanho;
    const b: V3 = [parte.posicao[0] - sx / 2, parte.posicao[1] - sy / 2, parte.posicao[2] - sz / 2];
    // faces na ordem da textura: frente, tras, direita, esquerda, topo, base
    const desenharFace = (indice: number, canto: (u: number, v: number) => V3, sombra: number) => {
      const r = t.faces[indice];
      for (let y = 0; y < r.h; y++)
        for (let x = 0; x < r.w; x++) {
          const k = (y * t.largura + r.x + x) * 4;
          if (t.pixels[k + 3] < 128) continue;
          const pts = [
            canto(x / r.w, y / r.h),
            canto((x + 1) / r.w, y / r.h),
            canto((x + 1) / r.w, (y + 1) / r.h),
            canto(x / r.w, (y + 1) / r.h),
          ];
          const m = canto((x + 0.5) / r.w, (y + 0.5) / r.h);
          // profundidade: o observador está em +x, +z e acima
          const prof = m[0] + m[2] + m[1] * 0.8;
          poligono(
            img,
            pts.map((p) => iso(p, w, cx, cy)),
            [t.pixels[k] * sombra, t.pixels[k + 1] * sombra, t.pixels[k + 2] * sombra, 255],
            prof,
          );
        }
    };
    // topo (y para trás), direita (+x, u de trás para a frente) e frente (+z)
    desenharFace(4, (u, v) => [b[0] + u * sx, b[1] + sy, b[2] + v * sz], 1);
    desenharFace(2, (u, v) => [b[0] + sx, b[1] + sy - v * sy, b[2] + sz - u * sz], 0.74);
    desenharFace(0, (u, v) => [b[0] + u * sx, b[1] + sy - v * sy, b[2] + sz], 0.9);
  }
}

{
  const lista = so ? ACESSORIOS.filter((a) => so.includes(a)) : ACESSORIOS;
  const e = so ? 2.5 : 1;
  const img = novaImg(lista.length * 150 * e, 2 * 260 * e, [110, 140, 180]);
  lista.forEach((acessorio, i) => {
    for (const [j, corpo] of (['feminino', 'masculino'] as const).entries()) {
      const a: Aparencia = {
        ...aparenciaPadrao(corpo === 'feminino' ? 'herbolaria' : 'andarilho'),
        acessorio,
      };
      desenhar(img, a, (75 + i * 150) * e, (230 + j * 260) * e, 110 * e);
    }
  });
  salvarPngEm(img, join(saida, 'acessorios.png'));
  console.log('colunas:', lista.join(', '));
}

{
  const temas = temasDisponiveis();
  const img = novaImg(temas.length * 170, 260, [110, 140, 180]);
  temas.forEach((id, i) => {
    const t = obterTema(id);
    desenhar(img, { ...aparenciaPadrao(), ...t.personagem }, 85 + i * 170, 230, 110);
  });
  salvarPngEm(img, join(saida, 'temas.png'));
  console.log('temas:', temas.join(', '));
}
