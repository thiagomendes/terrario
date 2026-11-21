import { describe, expect, it } from 'vitest';
import { Bloco, REGISTRO_BLOCOS } from '../../src/world/blocks';
import {
  ALTURA,
  SEMENTE_PADRAO,
  TAM_X,
  TAM_Z,
  encontrarNascimento,
  gerarChunk,
} from '../../src/world/chunk';

describe('registro', () => {
  it('índice igual ao id, plantas em cruz e emissivos com luz', () => {
    REGISTRO_BLOCOS.forEach((b, i) => expect(b.id, b.nome).toBe(i));
    expect(new Set(REGISTRO_BLOCOS.map((b) => b.nome)).size).toBe(REGISTRO_BLOCOS.length);
    expect(REGISTRO_BLOCOS.filter((b) => b.planta).length).toBeGreaterThanOrEqual(3);
    for (const b of REGISTRO_BLOCOS.filter((x) => x.planta)) expect(b.forma).toBe('cruz');
    expect(REGISTRO_BLOCOS[Bloco.CRISTAL_LUZ].emissivo).toBe(true);
    // a janela acesa da cidade (spec 014), os neons do bairro (spec 026) e a janela torta acesa
    // da festa (spec 027) brilham sem espalhar luz: são os únicos
    const semLuz: number[] = [
      Bloco.JANELA_ACESA,
      Bloco.PISTA_NEON,
      Bloco.LETREIRO_NEON,
      Bloco.FAIXA_NEON,
      Bloco.JANELA_TORTA_ACESA,
    ];
    for (const b of REGISTRO_BLOCOS.filter((x) => x.emissivo && !semLuz.includes(x.id))) {
      expect(b.luz ?? 0, b.nome).toBeGreaterThan(0);
    }
    for (const id of semLuz) {
      expect(REGISTRO_BLOCOS[id].emissivo, REGISTRO_BLOCOS[id].nome).toBe(true);
      expect(REGISTRO_BLOCOS[id].luz ?? 0, REGISTRO_BLOCOS[id].nome).toBe(0);
    }
    expect(REGISTRO_BLOCOS[Bloco.TOCHA].luz).toBe(14);
  });
});

describe('gerarChunk', () => {
  it('é determinístico e varia com a semente', () => {
    expect(gerarChunk(2, 3, 5)).toEqual(gerarChunk(2, 3, 5));
    expect(gerarChunk(2, 3, 5)).not.toEqual(gerarChunk(2, 3, 6));
  });

  it('tem 16x16x64 e só blocos do registro', () => {
    const c = gerarChunk(0, 0);
    expect(c.length).toBe(TAM_X * ALTURA * TAM_Z);
    expect(c.every((b) => b < REGISTRO_BLOCOS.length)).toBe(true);
  });

  it('chunks em volta do nascimento têm areia, árvores, vegetação e cristal', () => {
    const contagem = new Map<number, number>();
    const n = encontrarNascimento(SEMENTE_PADRAO);
    const ncx = Math.floor(n.x / TAM_X);
    const ncz = Math.floor(n.z / TAM_Z);
    for (let cz = ncz - 3; cz <= ncz + 3; cz++) {
      for (let cx = ncx - 3; cx <= ncx + 3; cx++) {
        for (const b of gerarChunk(cx, cz)) contagem.set(b, (contagem.get(b) ?? 0) + 1);
      }
    }
    for (const id of [
      Bloco.AREIA_BRUMA,
      Bloco.MADEIRA_RETORCIDA,
      Bloco.FOLHAGEM,
      Bloco.GRAMA_ALTA,
      Bloco.FLOR,
      Bloco.CRISTAL_LUZ,
    ]) {
      expect(contagem.get(id) ?? 0).toBeGreaterThan(0);
    }
  });

  it('nunca empilha dois cristais', () => {
    let cristais = 0;
    for (let cz = -3; cz <= 3; cz++) {
      for (let cx = -3; cx <= 3; cx++) {
        const c = gerarChunk(cx, cz, 7);
        for (let i = 0; i < c.length; i++) {
          if (c[i] !== Bloco.CRISTAL_LUZ) continue;
          cristais++;
          expect(c[i + TAM_X * TAM_Z]).not.toBe(Bloco.CRISTAL_LUZ);
          expect(c[i - TAM_X * TAM_Z]).not.toBe(Bloco.CRISTAL_LUZ);
        }
      }
    }
    expect(cristais).toBeGreaterThan(0);
  });
});
