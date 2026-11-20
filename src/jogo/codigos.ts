/**
 * Códigos de sala: duas palavras e dois números (LUA-COMETA-48). Fáceis de uma criança
 * ditar para outra, sem acento nem letra que confunda. 201 × 200 × 100 = 4,02 milhões de
 * combinações; o servidor ainda limita as tentativas por endereço.
 */

/**
 * Spec 034 (decisão do dono, 20 nov 2026): palavras que não saem mais no sorteio, mas que a
 * leitura ainda aceita, para as salas que já existem com elas continuarem entrando. "BRUMA"
 * lembrava o mundo Bruma e Luz, que saiu do jogo.
 */
export const PALAVRAS_SO_DE_LEITURA: readonly string[] = ['BRUMA'];

/** Palavras curtas, concretas e gentis (sem acento: o teclado do celular agradece). */
export const PALAVRAS: readonly string[] = [
  'ABELHA',
  'ABACAXI',
  'AGUIA',
  'ALCE',
  'AMORA',
  'ANCORA',
  'ANJO',
  'ARARA',
  'ARCO',
  'AREIA',
  'ASA',
  'ATLAS',
  'AVIAO',
  'AZUL',
  'BAIA',
  'BALAO',
  'BALEIA',
  'BAMBU',
  'BANANA',
  'BARCO',
  'BAU',
  'BEIJU',
  'BICHO',
  'BISCOITO',
  'BOLA',
  'BOLHA',
  'BOLO',
  'BONECO',
  'BOTA',
  'BRISA',
  'BUSSOLA',
  'CABRA',
  'CACAU',
  'CACTO',
  'CAJU',
  'CAMELO',
  'CAMPO',
  'CANOA',
  'CAPIM',
  'CARACOL',
  'CASTELO',
  'CAVALO',
  'CEREJA',
  'CHAVE',
  'CHUVA',
  'CIPO',
  'COCO',
  'COELHO',
  'COMETA',
  'CORAL',
  'CORUJA',
  'COROA',
  'CRISTAL',
  'CUBO',
  'DADO',
  'DELTA',
  'DINO',
  'DOCE',
  'DUNA',
  'ECO',
  'ESCADA',
  'ESPIGA',
  'ESTRELA',
  'FADA',
  'FAROL',
  'FAVO',
  'FENIX',
  'FIGO',
  'FLAUTA',
  'FLOR',
  'FOCA',
  'FOGUETE',
  'FOLHA',
  'FONTE',
  'FORMIGA',
  'FUBA',
  'GALAXIA',
  'GALO',
  'GATO',
  'GELO',
  'GIRAFA',
  'GIZ',
  'GOIABA',
  'GOTA',
  'GRILO',
  'GRUTA',
  'GUARDA',
  'HIPO',
  'ILHA',
  'IMA',
  'IOIO',
  'JACA',
  'JARDIM',
  'JIPE',
  'JOANINHA',
  'JUBA',
  'KIWI',
  'LAGO',
  'LAMPIAO',
  'LANTERNA',
  'LAPIS',
  'LEAO',
  'LEQUE',
  'LIMAO',
  'LINCE',
  'LONTRA',
  'LOBO',
  'LUA',
  'LUPA',
  'MACA',
  'MAGO',
  'MANGA',
  'MAPA',
  'MAR',
  'MEL',
  'MELANCIA',
  'METEORO',
  'MILHO',
  'MOINHO',
  'MORANGO',
  'MUSGO',
  'NAVE',
  'NEVE',
  'NINHO',
  'NOZ',
  'NUVEM',
  'OASIS',
  'ONDA',
  'ORCA',
  'OSSO',
  'OVO',
  'PANDA',
  'PAPAGAIO',
  'PATO',
  'PAVAO',
  'PEDRA',
  'PEIXE',
  'PENA',
  'PERA',
  'PIAO',
  'PICOLE',
  'PINGUIM',
  'PIPA',
  'PIRATA',
  'PLANETA',
  'POLVO',
  'PONTE',
  'PORTA',
  'POTE',
  'PRAIA',
  'PUDIM',
  'PULGA',
  'QUEIJO',
  'RAIO',
  'RAPOSA',
  'REMO',
  'RIO',
  'ROBO',
  'ROCHA',
  'RODA',
  'ROSA',
  'SAPO',
  'SELVA',
  'SINO',
  'SOL',
  'SONHO',
  'TAMBOR',
  'TATU',
  'TENDA',
  'TERRA',
  'TIGRE',
  'TOCHA',
  'TOMATE',
  'TORRE',
  'TREM',
  'TREVO',
  'TRIGO',
  'TROMPA',
  'TROVAO',
  'TUCANO',
  'TULIPA',
  'UNICORNIO',
  'URSO',
  'UVA',
  'VAGALUME',
  'VELA',
  'VENTO',
  'VULCAO',
  'XADREZ',
  'ZEBRA',
  'ZINCO',
  'ZUMBIDO',
  'ALGA',
  'BAGRE',
  'CANGURU',
  'DUENDE',
  'ESQUILO',
  'GAIVOTA',
  'MARUJO',
  'ORVALHO',
  'QUINTAL',
];

export interface PartesCodigo {
  a: string;
  b: string;
  n: number;
}

/** Sorteia um código novo (gerador de 0 a 1). */
export function gerarCodigo(sorteio: () => number): string {
  const a = PALAVRAS[Math.floor(sorteio() * PALAVRAS.length)];
  let b = PALAVRAS[Math.floor(sorteio() * PALAVRAS.length)];
  if (b === a) b = PALAVRAS[(PALAVRAS.indexOf(a) + 1) % PALAVRAS.length];
  const n = Math.floor(sorteio() * 100);
  return `${a}-${b}-${String(n).padStart(2, '0')}`;
}

/**
 * Lê o que a pessoa digitou (minúsculas, acentos, espaços ou hífens no lugar errado)
 * e devolve o código no formato oficial, ou null se não é um código possível.
 */
export function normalizarCodigo(texto: string): string | null {
  const limpo = texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
  const m = /^([A-Z]+) ?([A-Z]+) ?(\d{1,2})$/.exec(limpo);
  if (!m) return null;
  const [, a, b, n] = m;
  const conhecida = (p: string) => PALAVRAS.includes(p) || PALAVRAS_SO_DE_LEITURA.includes(p);
  if (!conhecida(a) || !conhecida(b)) return null;
  return `${a}-${b}-${n.padStart(2, '0')}`;
}

/** Quantos códigos diferentes existem. */
export const TOTAL_CODIGOS = PALAVRAS.length * (PALAVRAS.length - 1) * 100;
