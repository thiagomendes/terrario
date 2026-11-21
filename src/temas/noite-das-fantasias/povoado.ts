import type { Profissao } from '../../world/povoado';
import { corpoDeMorador } from '../base/povoado';
import type { PecaCriatura, PovoadoTema } from '../tipos';
import { pio } from '../rancho-alegre/vozes';
import { COR_BAILE } from './criaturas';

/**
 * A turma da Noite das Fantasias (spec 027). As três profissões de sempre ganham nome e desenho
 * da festa: a confeiteira (cozinheiro), o marceneiro das casinhas tortas (construtor) e o
 * lanterneiro (ferreiro), que faz as lanternas do bosque. Os moradores de posto (a Vovó Zuleica,
 * o Conde Dudu, a Lulu, o Bento, o Seu Jerônimo, a Tia Filó e o Seu Olavo) entram com o posto
 * deles (T10); aqui ficam o corpo e o chapéu de festa de cada profissão.
 *
 * Os nomes do sorteio são só deste mundo (nenhum está em outro povoado nem perto de um).
 */

/** Peças acima da cabeça (chapéu) ficam com o centro acima de 1,93 (`moradorBoneco`). */
const ACIMA = 1.935;

const MORADORES: Record<Profissao, PecaCriatura[]> = {
  // a confeiteira: vestido laranja, avental creme e o lenço roxo na cabeça
  cozinheiro: [
    ...corpoDeMorador({
      pele: '#e0a882',
      roupa: COR_BAILE.laranja,
      calca: COR_BAILE.roxoEscuro,
      sapato: '#3a2a4c',
      cabelo: '#4a2a1a',
    }),
    { t: [0.46, 0.1, 0.44], p: [0, ACIMA, 0], cor: COR_BAILE.roxo, papel: 'cabeca' },
    { t: [0.44, 0.5, 0.04], p: [0, 1.0, 0.155], cor: COR_BAILE.creme },
  ],
  // o marceneiro: camisa verde-oliva, macacão roxo e o chapéu de bruxo baixinho, de aba larga
  construtor: [
    ...corpoDeMorador({
      pele: '#b9825c',
      roupa: COR_BAILE.oliva,
      calca: COR_BAILE.roxo,
      sapato: '#3a2a20',
      cabelo: '#2e2018',
    }),
    { t: [0.56, 0.05, 0.54], p: [0, ACIMA, 0], cor: COR_BAILE.roxoEscuro, papel: 'cabeca' },
    { t: [0.32, 0.16, 0.32], p: [0, ACIMA + 0.1, 0], cor: COR_BAILE.roxoEscuro, papel: 'cabeca' },
    { t: [0.34, 0.04, 0.34], p: [0, ACIMA + 0.04, 0], cor: COR_BAILE.laranja, papel: 'cabeca' },
  ],
  // o lanterneiro: colete dourado sobre a camisa creme, calça oliva e a cartola baixa laranja
  ferreiro: [
    ...corpoDeMorador({
      pele: '#f0c8a0',
      roupa: COR_BAILE.creme,
      calca: COR_BAILE.olivaEscuro,
      sapato: '#3a2a4c',
      cabelo: '#8a5a2a',
    }),
    { t: [0.46, 0.5, 0.3], p: [0, 1.05, 0], cor: '#d8a53a' },
    { t: [0.5, 0.04, 0.48], p: [0, ACIMA, 0], cor: COR_BAILE.laranjaEscuro, papel: 'cabeca' },
    { t: [0.34, 0.2, 0.34], p: [0, ACIMA + 0.12, 0], cor: COR_BAILE.laranja, papel: 'cabeca' },
  ],
};

export const POVOADO_FANTASIAS: PovoadoTema = {
  nome: 'Turma da festa',
  profissoes: {
    cozinheiro: 'Confeiteira',
    construtor: 'Marceneiro',
    ferreiro: 'Lanterneiro',
  },
  nomes: ['Dalva', 'Odete', 'Celeste', 'Dorinha', 'Otávio', 'Abel', 'Lauro', 'Quinzinho', 'Nonô'],
  moradores: MORADORES,
  movimento: { saltita: 0.03, flutua: 0, ginga: 0.08 },
  vozes: {
    chamado: pio('triangle', 520, 640, 0.12, 2, 0.08, { vibrato: 6, ganho: 0.5 }),
    susto: pio('triangle', 760, 980, 0.1, 1, 0, { ganho: 0.5 }),
    contente: pio('sine', 620, 820, 0.08, 3, 0.06, { ganho: 0.5 }),
    obrigado: pio('sine', 700, 900, 0.12, 2, 0.08, { vibrato: 5, ganho: 0.5 }),
  },
  textos: {
    trocas: 'Trocas da festa',
    trocar: 'Trocar',
    faltam: 'Faltam coisinhas para essa troca',
    chegou: 'Você chegou à festa à fantasia!',
  },
};
