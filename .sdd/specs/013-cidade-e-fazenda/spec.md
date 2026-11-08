---
id: 013-cidade-e-fazenda
title: 'Dois temas do mundo de verdade: Cidade Grande e Rancho Alegre'
status: DRAFT
base_branch: main
branch: feat/cidade-e-fazenda
created_at: 2026-11-07T22:00:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
environment: docker
full_test_command: npx vitest run && scripts/e2e-gpu.sh
install_command: npm ci --no-audit --no-fund
---
## Contexto e problema
Os seis temas de hoje são fantasiosos: espíritos, robôs, dinossauros, doces, planetas e a Lua. O dono quer dois mundos reconhecíveis do dia a dia:
- **cidade grande:** prédios altos que dá para visitar por dentro, com escadas, ruas e lugares onde as pessoas moram e trabalham;
- **fazenda:** plantação, bichos e o trabalho no campo.

O estilo continua o de brinquedo da 012: peças gordinhas, quinas redondas e juntas aparentes. Não é realismo fotográfico; é "de verdade" no assunto.

## Viabilidade (estudo de 7 nov 2026)
**Como um tema funciona hoje.** É uma "pele" sobre as mesmas regras. Os 68 blocos, os itens, as receitas, os 5 papéis de bicho (cervo, coelho, raposa, peixe e a criatura da noite), as 3 profissões dos moradores e os biomas são os mesmos em todo tema. O tema troca:
- nomes, texturas e cores;
- céu, água, sons e música;
- o desenho das árvores, da estrutura rara e das casas do povoado;
- o desenho dos bichos e dos moradores.

**O que já cabe sem mudar nada:**
- **Fazenda.** Fica quase toda como pele:
  - bichos: vaca, galinha, cachorro (o domável), peixe do açude e, à noite, uma coruja curiosa;
  - moradores: fazendeira, padeiro, carpinteira;
  - casinhas de duas águas, celeiro e silo como formas do povoado;
  - poço ou moinho de vento no meio do povoado;
  - árvores frutíferas e campos;
  - céu de interior e música de viola.
- **Cidade, só como pele.** Bichos (pombo, gato, cachorro), moradores (padeira, mecânico, pedreira), nomes e cores. Mas sem prédio grande: o povoado de hoje é feito de lotes de 7×7 com casas de um andar.

**O que falta, e por quê não pode ser gambiarra:**
1. **Prédios grandes com andares e escadas.** O gerador de povoados planeja lotes pequenos, todos na mesma altura. Uma cidade precisa de outro planejador:
   - quarteirões, ruas e calçadas;
   - prédios de 2 a 12 andares, com escada por dentro, janelas, portas e apartamentos;
   - praça e parque.

   O certo é um **planejador de cidade** ao lado do de povoado, escolhido pelo tema (`EstiloMundo.povoado.planta: 'vila' | 'cidade' | 'sitio'`), com o mesmo jeito determinístico por região que o povoado já usa. O mundo tem 128 blocos de altura e o mar fica em 62; com 3 blocos por andar, cabem prédios de até uns 15 andares.
2. **Plantar e colher.** Hoje não existem semente, enxada, terra arada nem planta que cresce. Uma fazenda sem plantação fica rasa. Isso é **mecânica nova do jogo**, e vale para todos os temas, cada um com o nome dele: trigo e milho na fazenda, cogumelo-lua na Lua, broto-doce no Doce Reino. Entra no núcleo como os blocos de hoje: semente, enxada, terra arada, planta em 4 estágios que cresce com o tempo e com luz, e colheita.
3. **Criar bichos.** Hoje só a raposa é domada (com frutinhas). Na fazenda, o natural é atrair qualquer bicho com a comida dele e ele seguir até o cercado. Isso também é geral (cada tema escolhe a comida de cada bicho). Filhotes ficam para depois.
4. **Blocos novos para os dois temas.** Entram no registro de todos, com nome e textura em cada tema (os outros temas podem reaproveitar um desenho parecido):
   - **cidade:** asfalto, faixa de rua, calçada, concreto, janela grande, poste de luz e placa;
   - **fazenda:** terra arada, plantas de lavoura em estágios, fardo de feno e colmeia.

   Mais blocos aumentam o atlas de texturas; ainda cabe no tamanho de hoje.
5. **Desempenho da cidade.** Prédios altos têm muito mais blocos à vista e muito vidro. É preciso medir no celular:
   - a janela vira bloco com recorte, não transparente;
   - o miolo dos prédios fecha (pisos inteiros não são desenhados por dentro);
   - a cidade fica limitada aos quarteirões próximos.

**Conclusão: viável e sem gambiarra,** desde que feito em duas camadas:
- **mecânicas novas que valem para todos os temas:** plantio, criação e o planejador de cidade e de sítio;
- **os dois temas como peles completas por cima.**

Fazer só as peles agora daria uma cidade sem prédios e uma fazenda sem plantação; não recomendo.

## Esboço do tema 1: Cidade Grande
Nome escolhido pelo dono em 7 nov 2026. Desenho de referência: `referencia/temas.html` (cenas em brinquedo, de dia e de noite).

- **Céu e clima:** azul limpo de dia e pôr do sol laranja atrás dos prédios. À noite, as janelas acesas e os postes desenham a cidade. A chuva é de gotas. Sem neve; tem arco-íris.
- **Terreno:** a cidade ocupa as regiões perto do nascimento. Entre elas ficam parques (gramado, lagos e árvores de rua como ipê e sibipiruna) e um rio com ponte. Longe da cidade, o mundo volta a ser natural (morros e praia), para dar onde minerar e construir.
- **Quarteirões:**
  - **ruas:** asfalto com faixa, calçada e poste;
  - **lotes por tipo:**

    | Lote | O que tem |
    |---|---|
    | Prédio de apartamentos | 4 a 12 andares, escada em caracol por dentro, apartamentos com cama, mesa e baú, e janelas |
    | Padaria | Fornalha |
    | Oficina mecânica | Mesa de trabalho |
    | Loja de construção | Baú com materiais |
    | Escola | Um andar, com pátio |
    | Praça | Fonte, bancos e árvores |
    | Prédio alto | No centro, com terraço no topo |

  - **acesso:** tudo dá para visitar, com porta no térreo e escada até o terraço.
- **Moradores** (as 3 profissões de hoje): cozinheiro vira padeira ou padeiro; ferreiro vira mecânica ou mecânico; construtor vira pedreira ou pedreiro (vende tijolo, vidro e escada). Eles moram nos apartamentos e trabalham nas lojas, e de dia andam pelas calçadas.
- **Bichos** (os 5 papéis):

  | Papel de hoje | Na cidade | Como é |
  |---|---|---|
  | cervo | cachorro grande | passeia nos parques |
  | coelho | pombo | saltita e voa curto |
  | raposa | gato de rua | domável com peixe |
  | peixe | carpa do lago do parque | |
  | da noite | guaxinim travesso | mexe nos baús, foge da luz; fofo, não assustador |

- **Estrutura rara:** a roda-gigante de um parque de diversões abandonado, com baú.
- **Sons:** buzininha distante de dia, passarinho de praça e grilo de jardim à noite. Música com piano e baixo de jazz leve.
- **Blocos com nome da cidade:** asfalto, concreto, calçada, tijolo aparente, vidro de janela, poste, placa e grama de praça.

## Esboço do tema 2: Rancho Alegre
Nome escolhido pelo dono em 7 nov 2026. Desenho de referência: `referencia/temas.html`.

- **Céu e clima:** amanhecer dourado e céu bem aberto. Chuva boa para a plantação (a lavoura cresce mais rápido na chuva), arco-íris e noite estrelada com vaga-lumes.
- **Terreno:** campos largos, morros suaves, açude e riacho, mata nos morros e um pomar perto das casas.
- **Sítios** (no lugar do povoado):
  - **casas:** casa da fazenda de duas águas com varanda, celeiro vermelho e silo;
  - **lugares de trabalho:** galinheiro, curral com cerca, horta e lavoura já plantada (trigo, milho, abóbora);
  - **no meio:** um moinho de vento ou um poço.
- **Moradores:** a fazendeira ou o fazendeiro (no lugar do cozinheiro, troca ovos, leite e pão); a carpinteira ou o carpinteiro (no lugar do construtor, troca cercas, portões e madeira); a ferreira ou o ferreiro (ferraduras e ferramentas, como hoje).
- **Bichos:**

  | Papel de hoje | Na fazenda | Como é |
  |---|---|---|
  | cervo | vaca | atraída com trigo, segue até o curral |
  | coelho | galinha | ciscando e saltitando |
  | raposa | cachorro do sítio | domável com osso ou carne |
  | peixe | tilápia do açude | |
  | da noite | coruja curiosa | olhos grandes que brilham; pia e foge, não ataca |

- **Plantação (mecânica nova, T02):** pegar sementes no mato alto ou no baú do celeiro, arar com a enxada, plantar, esperar crescer em 4 estágios (mais rápido com chuva e luz) e colher. O trigo vira pão na fornalha; o milho vira pipoca (comida).
- **Estrutura rara:** espantalho com baú no meio da plantação abandonada.
- **Sons:** galo de manhã, vaca ao longe, cigarra de tarde e sapo à noite. Música de viola caipira e sanfona leve.

## Experiência (para não frustrar)
- **Começo pela vitrine:** os temas novos aparecem na vitrine da tela inicial e no "Criar mundo novo", com miniatura.
- **Cidade:** o jogador nasce numa praça e vê prédios por perto em menos de 10 s. A primeira missão é subir até o terraço do prédio mais alto.
- **Fazenda:** o jogador nasce perto de um sítio. A primeira missão é plantar e colher (ensina a enxada).
- **Desempenho:** no celular, a cidade mantém pelo menos 45 fps em pé no centro (medido). Se não der, os prédios ficam mais baixos.
- **Mundos de hoje:** nada muda nos mundos existentes, que continuam abrindo iguais.

## Critérios de qualidade (definição de pronto)
1. **Plantio:** semente, enxada, terra arada, 4 estágios, colheita e receitas, em todos os temas e com nome próprio em cada um; testes no núcleo e no multijogador.
2. **Criação:** cada bicho segue quem tem a comida dele e fica no cercado; testes.
3. **Cidade:** quarteirões com ruas e prédios de vários andares, todos com porta e escada até o topo, determinísticos (mesma semente, mesma cidade) e iguais no servidor da nuvem.
4. **Sítio:** casas, celeiro, curral e lavoura plantada, determinísticos.
5. **Peles:** os dois temas com tudo o que um tema tem hoje (céu, água, sons, música, nomes, texturas, bichos e moradores de brinquedo desenhados à mão), cobertos pelos testes de tema (`cobertura.test.ts`).
6. **Desempenho medido** no computador e no celular, com a cidade cheia de prédios.
7. **Capturas** de dia e de noite nos dois temas, e a vitrine.
8. **Nada quebra:** os seis temas de hoje e os mundos salvos continuam iguais; todos os testes passam.
9. **Rodada em família** nos dois temas.
10. **Auditoria independente** ao fim.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Blocos novos (cidade e fazenda) no registro, com nome e textura nos 6 temas de hoje |
| T02 | Plantio: semente, enxada, terra arada, lavoura em 4 estágios, crescimento no núcleo, colheita e receitas |
| T03 | Criação: atrair bicho com a comida dele, seguir e cercado |
| T04 | Planejador de sítio (forma do povoado `planta: 'sitio'`) com celeiro, curral e lavoura |
| T05 | Planejador de cidade (`planta: 'cidade'`): quarteirões, ruas, prédios com andares e escadas, praça e parque |
| T06 | Tema "Rancho Alegre": céu, água, sons, música, nomes, texturas, bichos e moradores de brinquedo, missões |
| T07 | Tema "Cidade Grande": o mesmo, e as janelas acesas à noite |
| T08 | Desempenho da cidade (celular) e ajustes |
| T09 | e2e, capturas, vitrine, rodada em família, auditoria e relatório visual |

## Para o dono decidir antes de começar
- **A ordem:** recomendo a fazenda primeiro. Ela traz o plantio e a criação, que valem para todos, e tem menos risco. A cidade vem depois, com o planejador de prédios.
- **Altura dos prédios:** até 12 andares, ou mais baixos e mais largos (melhor no celular).
- **O bicho da noite:** guaxinim e coruja, que são fofos e não atacam, ou algo que dê um pouco de desafio.
