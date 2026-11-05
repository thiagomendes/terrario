import { describe, expect, it } from 'vitest';
import { GRUPOS_MATERIAL, grupoDoBloco } from '../../src/audio/materiais';
import { Bloco, REGISTRO_BLOCOS } from '../../src/world/blocks';

describe('grupoDoBloco', () => {
  it('mapeia cada material', () => {
    expect(grupoDoBloco(Bloco.TERRA_MUSGOSA)).toBe('terra');
    expect(grupoDoBloco(Bloco.PEDRA_RACHADA)).toBe('pedra');
    expect(grupoDoBloco(Bloco.AREIA_BRUMA)).toBe('areia');
    expect(grupoDoBloco(Bloco.MADEIRA_RETORCIDA)).toBe('madeira');
    expect(grupoDoBloco(Bloco.TABUAS)).toBe('madeira');
    expect(grupoDoBloco(Bloco.FOLHAGEM)).toBe('folhagem');
    expect(grupoDoBloco(Bloco.GRAMA_ALTA)).toBe('folhagem');
    expect(grupoDoBloco(Bloco.FLOR)).toBe('folhagem');
    expect(grupoDoBloco(Bloco.COGUMELO_BRILHANTE)).toBe('folhagem');
    expect(grupoDoBloco(Bloco.CRISTAL_LUZ)).toBe('cristal');
    expect(grupoDoBloco(Bloco.AR)).toBeNull();
  });

  it('todo bloco sólido ou planta tem grupo e os 6 grupos aparecem', () => {
    const usados = new Set<string>();
    for (const b of REGISTRO_BLOCOS) {
      if (b.solido || b.planta) {
        const g = grupoDoBloco(b.id);
        expect(g, b.nome).not.toBeNull();
        usados.add(g as string);
      }
    }
    expect([...usados].sort()).toEqual([...GRUPOS_MATERIAL].sort());
  });
});
