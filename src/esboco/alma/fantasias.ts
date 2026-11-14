/**
 * Esboço da spec 023: as fantasias de prêmio e da lojinha, montadas com as peças que o boneco
 * já sabe desenhar (017). Nada de peça nova neste esboço: se o dono aprovar, cada uma ganha o
 * capricho dela na implementação (ex.: o bordado da festa junina, o chapéu dourado).
 */
import { registrarFantasiaDeEsboco, type FantasiaDef, type Visual } from '../../personagem/fantasias';

const mesmo = (v: Visual) => ({ feminino: v, masculino: v });

export const FANTASIAS_ALMA: readonly FantasiaDef[] = [
  // Rancho: prêmio da 1ª missão (colheita) - caipira de festa junina
  {
    id: 'caipira',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Caipira da festa', masculino: 'Caipira da festa' },
    cores: ['#e8402f', '#2f7fe8', '#f2a31a'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#3f6fb8', sapato: '#6a4426' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'camisa-xadrez', cor: '#ffffff' },
        { tipo: 'colete-lenco', cor: '#f2c64a' },
        { tipo: 'chapeu-palha', cor: '#f5d77a' },
      ],
    }),
  },
  // Rancho: prêmio da última missão - peão campeão (dourado)
  {
    id: 'peao-campeao',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Peoa campeã', masculino: 'Peão campeão' },
    cores: ['#c9a03a'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: '#fff3d6', manga: '#fff3d6', calca: '#2f5a9a', sapato: '#7a4826' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'colete-lenco', cor: '#c9302f' },
        { tipo: 'emblema', cor: 'emblema', simbolo: 'estrela' },
        { tipo: 'cinto', cor: '#ffd45a' },
        { tipo: 'botas', cor: '#7a4826' },
        { tipo: 'chapeu-vaqueiro', cor: '#e8b83a' },
      ],
    }),
  },
  {
    id: 'fazendeira-domingo',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Roupa de domingo', masculino: 'Roupa de domingo' },
    cores: ['#e06a9a'],
    corEmblema: '#ffffff',
    visual: mesmo({
      roupa: { camisa: '#ffffff', manga: '#ffffff', calca: 'principal', sapato: '#5a3a26' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'macacao', cor: 'principal' },
        { tipo: 'emblema', cor: '#ffffff', simbolo: 'flor' },
        { tipo: 'chapeu-palha', cor: '#f5d77a' },
      ],
    }),
  },
  {
    id: 'cozinheira-roca',
    grupo: 'temas',
    tema: 'rancho-alegre',
    nomes: { feminino: 'Cozinheira da roça', masculino: 'Cozinheiro da roça' },
    cores: ['#d9483b'],
    corEmblema: '#ffffff',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#5a4a3a', sapato: '#5a3a26' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'camisa-xadrez', cor: '#ffffff' },
        { tipo: 'avental-doce', cor: '#fff6e4' },
        { tipo: 'touca-chef', cor: '#ffffff' },
      ],
    }),
  },
  // premium (lojinha universal): a base da fantasia do dragãozinho; as asas, a placa de escamas
  // e os chifres são do premium3d.ts
  {
    id: 'dragao',
    grupo: 'temas',
    nomes: { feminino: 'Dragãozinho', masculino: 'Dragãozinho' },
    cores: ['#22b597'],
    corEmblema: '#dcfbec',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: 'principal', sapato: '#8a6aff' },
      cabeca: 'capuz',
      pecas: [
        { tipo: 'capuz-dino', cor: 'principal' },
        { tipo: 'luvas', cor: '#8a6aff' },
      ],
    }),
  },
  // Cidade
  {
    id: 'capacete-dourado',
    grupo: 'temas',
    tema: 'cidade-grande',
    nomes: { feminino: 'Pedreira de ouro', masculino: 'Pedreiro de ouro' },
    cores: ['#3f6fb8'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#36507a', sapato: '#6a4426' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'colete-obra', cor: '#ff7a1a' },
        { tipo: 'botas', cor: '#7a4826' },
        { tipo: 'capacete-obra', cor: '#ffd45a' },
      ],
    }),
  },
  {
    id: 'bone-cidade',
    grupo: 'temas',
    tema: 'cidade-grande',
    nomes: { feminino: 'Boné da cidade', masculino: 'Boné da cidade' },
    cores: ['#2f7fe8'],
    corEmblema: '#ffd45a',
    visual: mesmo({
      roupa: { camisa: '#ffffff', manga: 'principal', calca: '#36507a', sapato: '#f2f4f8' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'emblema', cor: 'principal', simbolo: 'estrela' },
        { tipo: 'bone', cor: 'principal' },
      ],
    }),
  },
  {
    id: 'turista',
    grupo: 'temas',
    tema: 'cidade-grande',
    nomes: { feminino: 'Turista', masculino: 'Turista' },
    cores: ['#ffb02e'],
    corEmblema: '#2fb07a',
    visual: mesmo({
      roupa: { camisa: 'principal', manga: 'principal', calca: '#2fb0a0', sapato: '#ffffff' },
      cabeca: 'chapeu',
      pecas: [
        { tipo: 'emblema', cor: '#2fb07a', simbolo: 'flor' },
        { tipo: 'oculos', cor: '#2a2026' },
        { tipo: 'bone', cor: '#e8402f' },
      ],
    }),
  },
];

let registradas = false;
export function registrarFantasiasAlma(): void {
  if (registradas) return;
  registradas = true;
  for (const f of FANTASIAS_ALMA) registrarFantasiaDeEsboco(f);
}
