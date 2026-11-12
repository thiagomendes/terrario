/** Missões leves que ensinam o jogo; cada uma concluída vira conquista. */
export interface Missao {
  id: string;
  capitulo: string;
  titulo: string;
  descricao: string;
  /** Contador observado e meta. */
  contador: string;
  meta: number;
  /** 'item:<id>' usa o ícone do item; senão, nome de um pixícone da interface. */
  icone: string;
}

export const MISSOES: readonly Missao[] = [
  {
    id: 'madeira',
    capitulo: 'Primeiros passos',
    titulo: 'Lenhador',
    descricao: 'Quebre 4 troncos de árvore',
    contador: 'quebrou:tronco',
    meta: 4,
    icone: 'item:bloco:4',
  },
  {
    id: 'tabuas',
    capitulo: 'Primeiros passos',
    titulo: 'Carpintaria',
    descricao: 'Transforme troncos em tábuas',
    contador: 'fabricou:tabuas',
    meta: 1,
    icone: 'item:bloco:7',
  },
  {
    id: 'mesa',
    capitulo: 'Primeiros passos',
    titulo: 'Oficina',
    descricao: 'Fabrique uma mesa de trabalho',
    contador: 'fabricou:mesa',
    meta: 1,
    icone: 'item:bloco:40',
  },
  {
    id: 'picareta',
    capitulo: 'Primeiros passos',
    titulo: 'Ferramenta na mão',
    descricao: 'Faça uma picareta de madeira',
    contador: 'fabricou:picareta_madeira',
    meta: 1,
    icone: 'item:picareta_madeira',
  },
  {
    id: 'pedra',
    capitulo: 'Fundo da terra',
    titulo: 'Pedreiro',
    descricao: 'Minere 10 blocos de pedra',
    contador: 'quebrou:pedra',
    meta: 10,
    icone: 'item:bloco:2',
  },
  {
    id: 'fornalha',
    capitulo: 'Fundo da terra',
    titulo: 'Fogo controlado',
    descricao: 'Fabrique uma fornalha',
    contador: 'fabricou:fornalha',
    meta: 1,
    icone: 'item:bloco:41',
  },
  {
    id: 'tochas',
    capitulo: 'Fundo da terra',
    titulo: 'Luz na escuridão',
    descricao: 'Coloque 5 tochas',
    contador: 'colocou:tocha',
    meta: 5,
    icone: 'item:bloco:37',
  },
  {
    id: 'ferro',
    capitulo: 'Fundo da terra',
    titulo: 'Idade do ferro',
    descricao: 'Retire um lingote de ferro da fornalha',
    contador: 'fundiu:lingote_ferro',
    meta: 1,
    icone: 'item:lingote_ferro',
  },
  {
    id: 'luzita',
    capitulo: 'Fundo da terra',
    titulo: 'Coração de cristal',
    descricao: 'Encontre um pedaço de luzita',
    contador: 'coletou:luzita',
    meta: 1,
    icone: 'item:luzita',
  },
  {
    id: 'comer',
    capitulo: 'Sobreviver',
    titulo: 'Barriga cheia',
    descricao: 'Coma alguma coisa',
    contador: 'comeu',
    meta: 1,
    icone: 'item:maca',
  },
  {
    id: 'dormir',
    capitulo: 'Sobreviver',
    titulo: 'Bons sonhos',
    descricao: 'Durma numa cama durante a noite',
    contador: 'dormiu',
    meta: 1,
    icone: 'item:bloco:56',
  },
  {
    id: 'espectro',
    capitulo: 'Sobreviver',
    titulo: 'Caçador da bruma',
    descricao: 'Derrote um espectro da bruma',
    contador: 'derrotou:espectro',
    meta: 1,
    icone: 'espectro',
  },
  {
    id: 'raposa',
    capitulo: 'Sobreviver',
    titulo: 'Amizade luminosa',
    descricao: 'Dome uma raposa-lume com frutinhas',
    contador: 'domou',
    meta: 1,
    icone: 'raposa',
  },
  {
    id: 'pantano',
    capitulo: 'Explorar',
    titulo: 'Onde a bruma brilha',
    descricao: 'Encontre o pântano bioluminescente',
    contador: 'bioma:pantano',
    meta: 1,
    icone: 'item:bloco:31',
  },
  {
    id: 'deserto',
    capitulo: 'Explorar',
    titulo: 'Areias douradas',
    descricao: 'Chegue a um deserto',
    contador: 'bioma:deserto',
    meta: 1,
    icone: 'item:bloco:25',
  },
  {
    id: 'taiga',
    capitulo: 'Explorar',
    titulo: 'Terra do gelo',
    descricao: 'Chegue à taiga nevada',
    contador: 'bioma:taiga',
    meta: 1,
    icone: 'item:bloco:21',
  },
  {
    id: 'mergulho',
    capitulo: 'Explorar',
    titulo: 'Mergulhador',
    descricao: 'Mergulhe debaixo d’água',
    contador: 'mergulhou',
    meta: 1,
    icone: 'onda',
  },
  {
    id: 'marcador',
    capitulo: 'Explorar',
    titulo: 'Cartógrafo',
    descricao: 'Crie um marcador no mapa (tecla K)',
    contador: 'marcou',
    meta: 1,
    icone: 'marcador',
  },
  {
    id: 'construtor',
    capitulo: 'Criar',
    titulo: 'Arquiteto',
    descricao: 'Coloque 100 blocos',
    contador: 'colocou',
    meta: 100,
    icone: 'martelo',
  },
  {
    id: 'foto',
    capitulo: 'Criar',
    titulo: 'Olhar de artista',
    descricao: 'Tire uma foto no modo foto (tecla P)',
    contador: 'foto',
    meta: 1,
    icone: 'foto',
  },
  {
    id: 'povoado',
    capitulo: 'Explorar',
    titulo: 'Vizinhos',
    descricao: 'Encontre um povoado',
    contador: 'visitou:povoado',
    meta: 1,
    icone: 'pessoa',
  },
  {
    id: 'trocas',
    capitulo: 'Explorar',
    titulo: 'Bom negócio',
    descricao: 'Faça 3 trocas com moradores',
    contador: 'trocou',
    meta: 3,
    icone: 'item:bloco:42',
  },
  {
    id: 'ferreiro',
    capitulo: 'Explorar',
    titulo: 'Ferramenta nova',
    descricao: 'Faça uma troca com quem faz ferramentas',
    contador: 'trocou:ferreiro',
    meta: 1,
    icone: 'item:picareta_pedra',
  },
  // spec 013: plantio e criação (todos os temas)
  {
    id: 'arar',
    capitulo: 'Roça',
    titulo: 'Mão na enxada',
    descricao: 'Are a terra com a enxada',
    contador: 'arou',
    meta: 1,
    icone: 'item:enxada_madeira',
  },
  {
    id: 'plantar',
    capitulo: 'Roça',
    titulo: 'Semente na terra',
    descricao: 'Plante uma semente na terra arada',
    contador: 'plantou',
    meta: 1,
    icone: 'item:semente_trigo',
  },
  {
    id: 'colher',
    capitulo: 'Roça',
    titulo: 'Primeira colheita',
    descricao: 'Colha uma planta madura',
    contador: 'colheu',
    meta: 1,
    icone: 'item:trigo',
  },
  {
    id: 'pao',
    capitulo: 'Roça',
    titulo: 'Pão quentinho',
    descricao: 'Faça um pão com 3 trigos',
    contador: 'fabricou:pao',
    meta: 1,
    icone: 'item:pao',
  },
  {
    id: 'criar',
    capitulo: 'Roça',
    titulo: 'Amigo de pelo',
    descricao: 'Dê trigo a um cervo-musgo (ou sementes a um coelho-bruma)',
    contador: 'criou',
    meta: 1,
    icone: 'coracao',
  },
];

/**
 * Spec 014: o capítulo das obras do canteiro, só nos mundos da Cidade Grande (uma figurinha por
 * obra terminada). Fica fora de MISSOES: nos outros temas o diário continua igualzinho, e os
 * temas não precisam renomear estas missões.
 */
export const CAPITULO_OBRAS = 'Obras da cidade';
const OBRAS: ReadonlyArray<[string, string, string]> = [
  ['Casinha do cachorro', 'Ajude a construir a casinha do cachorro', 'item:bloco:43'],
  ['Banca de frutas', 'Ajude a construir a banca de frutas', 'item:maca'],
  ['Ponto de ônibus', 'Ajude a construir o ponto de ônibus', 'item:bloco:98'],
  ['Sorveteria', 'Ajude a construir a sorveteria', 'item:bloco:99'],
  ['Casinha', 'Ajude a construir a casinha', 'casa'],
  ['Coreto da praça', 'Construa o coreto junto com os amigos', 'trofeu'],
];
export const MISSOES_OBRAS: readonly Missao[] = OBRAS.map(([titulo, descricao, icone], i) => ({
  id: `obra-${i + 1}`,
  capitulo: CAPITULO_OBRAS,
  titulo,
  descricao,
  contador: `obra:${i + 1}`,
  meta: 1,
  icone,
}));

export type Contadores = Record<string, number>;

/** Capítulo de cada missão como está aqui (o tema renomeia `capitulo` ao ativar). */
const CAPITULO_ORIGINAL = new Map(MISSOES.map((m) => [m.id, m.capitulo]));

/**
 * As missões na ordem em que o diário guia: com `primeiroCapitulo` (o nome do capítulo
 * nesta lista, antes do tema renomear), esse capítulo vem antes e o resto segue na ordem
 * de sempre (o Rancho Alegre começa pela Roça).
 */
export function ordemMissoes(primeiroCapitulo?: string): readonly Missao[] {
  const doCapitulo = (m: Missao) => CAPITULO_ORIGINAL.get(m.id) === primeiroCapitulo;
  if (!primeiroCapitulo || !MISSOES.some(doCapitulo)) return MISSOES;
  return [...MISSOES.filter(doCapitulo), ...MISSOES.filter((m) => !doCapitulo(m))];
}

export interface OpcoesDiario {
  /** Capítulo que o diário guia primeiro (dado do tema; sem ele, a ordem de sempre). */
  primeiroCapitulo?: string;
  /** Spec 014: mundo da Cidade Grande: o capítulo "Obras da cidade" entra no fim. */
  obras?: boolean;
}

/** Spec 014: o tema tem o canteiro de obras (a cidade)? Lê a planta do povoado do tema. */
export function temObras(t: { mundo?: { povoado?: { planta?: string } } }): boolean {
  return t.mundo?.povoado?.planta === 'cidade';
}

export function criarDiario(salvo?: unknown, opcoes: OpcoesDiario = {}) {
  const base = ordemMissoes(opcoes.primeiroCapitulo);
  // sem obras, a mesma lista de sempre (nem uma cópia: tudo igual nos outros temas)
  const ordem: readonly Missao[] = opcoes.obras ? [...base, ...MISSOES_OBRAS] : base;
  const todas: readonly Missao[] = opcoes.obras ? [...MISSOES, ...MISSOES_OBRAS] : MISSOES;
  const s = (salvo ?? {}) as { contadores?: Contadores; concluidas?: string[] };
  const contadores: Contadores = { ...(s.contadores ?? {}) };
  const concluidas = new Set<string>(s.concluidas ?? []);
  const ouvintes = new Set<(m: Missao) => void>();
  return {
    /** Registra um evento; devolve as missões concluídas agora. */
    registrar(chave: string, qtd = 1): Missao[] {
      contadores[chave] = (contadores[chave] ?? 0) + qtd;
      // tábuas de bétula, pinho e lanterna contam como tábuas
      if (chave.startsWith('fabricou:tabuas_')) {
        contadores['fabricou:tabuas'] = (contadores['fabricou:tabuas'] ?? 0) + qtd;
      }
      const novas: Missao[] = [];
      for (const m of todas) {
        if (concluidas.has(m.id)) continue;
        if ((contadores[m.contador] ?? 0) >= m.meta) {
          concluidas.add(m.id);
          novas.push(m);
          for (const f of ouvintes) f(m);
        }
      }
      return novas;
    },
    progresso(m: Missao): number {
      return Math.min(1, (contadores[m.contador] ?? 0) / m.meta);
    },
    concluida: (id: string) => concluidas.has(id),
    /** Primeira missão em aberto (a "missão atual"), na ordem do tema. */
    atual(): Missao | null {
      return ordem.find((m) => !concluidas.has(m.id)) ?? null;
    },
    /** Todas as missões, na ordem em que o diário guia. */
    get missoes(): readonly Missao[] {
      return ordem;
    },
    get total() {
      return concluidas.size;
    },
    ouvir(f: (m: Missao) => void): () => void {
      ouvintes.add(f);
      return () => ouvintes.delete(f);
    },
    salvar() {
      return { contadores: { ...contadores }, concluidas: [...concluidas] };
    },
  };
}
export type Diario = ReturnType<typeof criarDiario>;
