import type { Tema } from '../tipos';
import { CEU_LUA, QUADROS_CEU_LUA } from './ceu';
import { CRIATURAS_LUNARES, MOVIMENTO_LUNAR } from './criaturas';
import { MUSICA_LUA } from './musica';
import { EMISSIVOS_LUNARES, PINTORES_LUNARES } from './pintores';
import { FORMAS_POVOADO_LUNAR, POVOADO_LUNAR } from './povoado';
import { TEXTOS_LUNARES } from './textos';
import { VOZES_LUNARES } from './vozes';

let tema: Tema | null = null;

/**
 * Exploração Lunar: uma base de pequenos astronautas na Lua. Regolito cinza, mares de
 * basalto, terras altas claras, crateras com gelo, formações de cristal no lugar de
 * árvores, céu negro com estrelas de dia e a Terra no horizonte.
 */
export function construirExploracaoLunar(): Tema {
  if (tema) return tema;
  tema = {
    id: 'exploracao-lunar',
    nome: 'Exploração Lunar',
    lema: 'Pise na Lua, colete cristais e monte sua base sob as estrelas',
    convite: 'Pule alto na Lua, veja a Terra no céu e faça amizade com robôs e coelhos lunares.',
    cores: {
      acento: '#7cc8ff',
      fundoTitulo: ['#0a0d18', '#000000'],
      lema: '#e6ecff',
      logo: {
        topo: [242, 244, 250],
        meio: [196, 200, 212],
        base: [128, 134, 150],
        extrusao: [44, 48, 64],
        bruma: [110, 170, 255],
      },
    },
    textos: TEXTOS_LUNARES,
    pintores: PINTORES_LUNARES,
    emissivos: EMISSIVOS_LUNARES,
    quadrosCeu: QUADROS_CEU_LUA,
    ceu: CEU_LUA,
    // água de degelo: azul-gelo claro, bem diferente do regolito cinza
    agua: {
      fundoDia: [0.18, 0.52, 0.72],
      fundoNoite: [0.03, 0.08, 0.13],
      tinta: [0.75, 0.92, 1.0],
      opacidade: 0.64,
    },
    // no vácuo não há bruma; só um véu de poeira quase invisível
    bruma: { cor: [0.8, 0.82, 0.9], forca: 0.05 },
    particulas: {
      vagalumeNoite: [0.7, 0.88, 1],
      vagalumeDia: [0.92, 0.95, 1],
      chuva: [0.66, 0.65, 0.63],
      neve: [0.85, 0.92, 1],
      folhas: [0.64, 0.56, 0.88],
      poeira: [0.6, 0.59, 0.57],
    },
    climaVisual: { chuva: 'poeira', neve: false, relampago: false, arcoIris: false },
    criaturas: CRIATURAS_LUNARES,
    movimento: MOVIMENTO_LUNAR,
    vozes: VOZES_LUNARES,
    povoado: POVOADO_LUNAR,
    mundo: {
      arvores: {
        floresta: ['cristal', 'cristal', 'pinho'],
        campos: ['cristal'],
        taiga: ['pinho', 'cristal'],
        montanhas: ['cristal'],
        pantano: ['cristal', 'lanterna'],
        praia: ['cristal'],
      },
      estrutura: 'cupula',
      crateras: 0.8,
      flora: 0.3,
      povoado: FORMAS_POVOADO_LUNAR,
    },
    musica: MUSICA_LUA,
    materiais: {
      terra: { tom: 0.8, base: 'areia' },
      areia: { tom: 0.75 },
      pedra: { tom: 1.2 },
      madeira: { tom: 1.45, base: 'pedra' },
      folhagem: { tom: 1.3, base: 'cristal' },
      cristal: { tom: 1.15 },
    },
    natureza: { passaros: 0, grilos: 0, tom: 1, bipes: true, vento: 0 },
    personagem: { acessorio: 'capacete', roupaEstilo: 2, roupaCor: 7, calcaCor: 6 },
  };
  return tema;
}
