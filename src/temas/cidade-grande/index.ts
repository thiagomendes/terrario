import type { Tema } from '../tipos';
import { construirRanchoAlegre } from '../rancho-alegre';
import { EXCLUSIVOS_CIDADE } from '../../jogo/exclusivos';
import { TEXTOS_CIDADE } from './textos';

/**
 * Cidade Grande (spec 014): ruas em grade, avenidas, um parque com lago no meio, prédios de 2
 * a 6 andares de visitar e o canteiro de obras. PROVISÓRIO até a T08: o céu, a água, a
 * música, os bichos e os moradores são os do Rancho Alegre (como no esboço aprovado); a
 * cidade já tem os nomes, os blocos e o que é só dela (`exclusivos`).
 */
export function construirCidadeGrande(): Tema {
  const r = construirRanchoAlegre();
  // a cidade não tem galo, mugido, cigarra nem sapo (o ambiente dela vem na T09)
  const { roca: _roca, ...natureza } = r.natureza;
  return {
    ...r,
    id: 'cidade-grande',
    nome: 'Cidade Grande',
    lema: 'Ajude o pedreiro a construir a cidade',
    convite: 'Prédios de visitar, ruas, um parque com lago e um canteiro de obras!',
    cores: {
      acento: '#ffcf3a',
      fundoTitulo: ['#1f2a3a', '#121a26'],
      lema: '#fff4d6',
      logo: {
        topo: [255, 244, 214],
        meio: [255, 207, 58],
        base: [216, 67, 58],
        extrusao: [58, 46, 40],
        bruma: [214, 226, 240],
      },
    },
    textos: TEXTOS_CIDADE,
    natureza,
    emissivos: [...r.emissivos, 'janela_acesa', 'poste'],
    povoado: r.povoado && { ...r.povoado, nome: 'Bairro da praça' },
    exclusivos: EXCLUSIVOS_CIDADE,
    primeiroCapitulo: undefined,
  };
}
