export const Bloco = {
  AR: 0,
  TERRA_MUSGOSA: 1,
  PEDRA_RACHADA: 2,
  AREIA_BRUMA: 3,
  MADEIRA_RETORCIDA: 4,
  FOLHAGEM: 5,
  CRISTAL_LUZ: 6,
  TABUAS: 7,
  GRAMA_ALTA: 8,
  FLOR: 9,
  COGUMELO_BRILHANTE: 10,
} as const;

export interface DefinicaoBloco {
  id: number;
  nome: string;
  solido: boolean;
  opaco: boolean;
  emissivo: boolean;
  planta: boolean;
}

function def(
  id: number,
  nome: string,
  opcoes: Partial<Omit<DefinicaoBloco, 'id' | 'nome'>> = {},
): DefinicaoBloco {
  return { id, nome, solido: true, opaco: true, emissivo: false, planta: false, ...opcoes };
}

function planta(id: number, nome: string, emissivo = false): DefinicaoBloco {
  return def(id, nome, { solido: false, opaco: false, emissivo, planta: true });
}

export const REGISTRO_BLOCOS: readonly DefinicaoBloco[] = [
  def(Bloco.AR, 'ar', { solido: false, opaco: false }),
  def(Bloco.TERRA_MUSGOSA, 'terra musgosa'),
  def(Bloco.PEDRA_RACHADA, 'pedra rachada'),
  def(Bloco.AREIA_BRUMA, 'areia-bruma'),
  def(Bloco.MADEIRA_RETORCIDA, 'madeira retorcida'),
  def(Bloco.FOLHAGEM, 'folhagem', { opaco: false }),
  def(Bloco.CRISTAL_LUZ, 'cristal-luz', { emissivo: true }),
  def(Bloco.TABUAS, 'tábuas'),
  planta(Bloco.GRAMA_ALTA, 'grama alta'),
  planta(Bloco.FLOR, 'flor', true),
  planta(Bloco.COGUMELO_BRILHANTE, 'cogumelo brilhante', true),
];

export function obterBloco(id: number): DefinicaoBloco | undefined {
  return REGISTRO_BLOCOS[id];
}
