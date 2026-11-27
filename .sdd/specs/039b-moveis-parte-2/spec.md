---
id: 039b-moveis-parte-2
title: 'Móveis e utensílios, parte 2: o fogão que cozinha, a geladeira que guarda, a mesa onde todos comem, a TV e o aparelho de som'
status: DRAFT
base_branch: main
branch: feat/039b-moveis-parte-2
created_at: 2026-11-27T15:15:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
---

## Contexto
A parte 1 da 039 foi publicada em 27 nov 2026. Ela trouxe:
- a regra dos móveis de várias células;
- a cama nova;
- sentar e deitar;
- sete móveis de brincar.

A parte 2 traz cinco móveis: os que guardam coisas e os que todos na sala veem juntos. O dono escolheu fazê-la logo depois, enquanto a família joga a parte 1. Os ajustes que a rodada em família trouxer entram antes.

## O que existia
- **A parte 1** (`.sdd/specs/039-moveis/`, na `main` a52b8ddf):
  - a tabela `src/jogo/moveis.ts` (tamanho, direção e partes);
  - a âncora e a peça solta;
  - o `colocar` com as células;
  - quebrar leva o móvel inteiro;
  - os assentos no núcleo (sofá, cadeira e cama), com o `sentado` no jogador visto e o `cuidarDosAssentos` (`nucleo.ts:2549`);
  - o desenho por pedaço em `src/render/moveis/`;
  - a categoria Casa e as abas;
  - `VERSAO_REDE` 19.
- **O estudo e o esboço** (`.sdd/specs/039-moveis/referencia/estudo-moveis.md`, com as pranchas em `capturas-039/esboco/`) já têm os cinco móveis desenhados e os toques em fotos seguidas. O código do esboço está no histórico do ramo `esboco/039-moveis` (e18157f e 0e1cb88).
- **A fornalha e o baú são contêineres do núcleo** (`jogo/fornalha.ts`, `jogo/conteineres.ts`):
  - a transação reconhece só `'bau'` e `'forn'` (`nucleo.ts:2645` e `2664`);
  - o bloqueio do visitante usa uma lista fixa de blocos (`nucleo.ts:2344`);
  - o XP do cozinheiro (`fundiu:`) e o desconto do `postoNaSaida` olham só `'forn'` (`nucleo.ts:2689-2706` e `3627-3636`);
  - a fornalha acesa troca o id do bloco (`nucleo.ts:3578-3584`);
  - o `j.conteiner` só fecha no `fecharConteiner`.
- **A Casa anos 80** (026, `nucleo/casa.ts` e `jogo/casa.ts`, com o `trocarCanal` e o `ESPERA_CANAL`) é uma peça fixa da Vila Neon. Todos na sala veem o mesmo canal. O `q.vila` vai no quadro a cada 20 passos.
- **Comer** (032 e `nucleo.ts:2562`): uma refeição por vez, com o `j.comendo`, o `acoes[2]` e o evento `comeu`, que conta no diário (`diario.ts:101`).
- **O `usar`** (`nucleo/protocolo.ts:133`) não leva o lugar da mochila. A sala tem no máximo 8 crianças (`rede/protocolo.ts:97`).

## Decisões do dono (26 e 27 nov 2026)
| Pergunta | Decisão |
|---|---|
| Os móveis | fogão, geladeira, mesa, TV e aparelho de som, nos estilos do esboço; a TV é a de rack, com moldura azul |
| O fogão | cozinha como a fornalha, **sem carvão**, e dá o mesmo XP de cozinheiro (4 por comida) (27 nov) |
| A geladeira | guarda comida |
| A mesa | junta para comer: uma comida posta alimenta todos os que estão sentados em volta, até 4 |
| O ferro | a geladeira, o fogão, a TV e o som pedem ferro de verdade |
| De onde vêm | no criativo, pelo inventário; na sobrevivência, por receita na mesa de montar; sem moedinhas |
| Para todos os mundos | sim; os temáticos ficam para a riqueza dos mundos |

## Decisões do orquestrador (ajustadas na revisão de 27 nov)
- **O fogão:**
  - cozinha as receitas de comida da `FUNDICAO`: carne e peixe crus viram assados, o milho vira pipoca e o ovo vira ovo cozido;
  - tem só entrada e saída, sem lugar de carvão, e a saída não aceita item posto;
  - o toque abre o painel de cozinhar, igual ao da fornalha, só com comida;
  - enquanto cozinha, o anel laranja e o vapor aparecem para todos perto;
  - os minérios continuam na fornalha.
- **A geladeira:**
  - tem 9 lugares, só de comida;
  - como o baú, só o dono e a dona do mundo abrem, o visitante não, e quebrar espalha a comida;
  - o toque abre o painel, e a porta aparece aberta para todos perto enquanto alguém a usa.
- **A mesa:**
  - **Quem conta em volta:** toda cadeira encostada num lado da mesa, no mesmo andar, em qualquer direção. Também conta o lugar do sofá encostado. Quem está deitado no sofá não conta.
  - **A cadeira posta colada à mesa** vira de frente para ela sozinha, por uma função pura usada pelo núcleo e pela previsão.
  - **Pôr a comida:** quem está sentado em volta ou em pé ao lado, com comida na mão, toca na mesa e põe o prato. O `usar` leva o lugar da mochila.
  - **Quem come:** todos os sentados em volta comem juntos, até 4, cada um uma refeição inteira, com um coraçãozinho. Quem põe e está sentado em volta também come.
  - **Quem fica de fora:** quem já está comendo termina a sua refeição e fica fora da conta. Com mais de 4 sentados, comem quem pôs e depois os outros na ordem fixa das células dos assentos.
  - **Sem ninguém para comer**, nada sai da mochila e a criança ouve o "não" curtinho.
  - **O que a mesa não faz:** não dá moedinha nem missão além do que comer já dá. Uma comida rende no máximo 4 refeições.
  - **Também vale:** para o visitante e no criativo.
- **A TV:**
  - cada toque passa para o próximo dos quatro desenhos novos, nossos e mansos, e o quinto toque desliga;
  - desliga sozinha depois de 3 minutos sem ninguém perto;
  - entre dois toques há uma esperinha, como na Casa anos 80;
  - a TV ligada não ilumina o mundo, porque a luz é por id de bloco.
- **O aparelho de som:**
  - um toque toca a musiquinha nova, curta e mansa, uma vez só, por uns 20 s, e para;
  - outro toque, enquanto toca, para antes;
  - todos perto ouvem, pela distância;
  - toca no máximo um som de móvel por vez perto da criança.
- **Na tela, só as duas TVs e os dois sons mais perto** animam e tocam; os outros ficam na imagem parada.

## O que muda
### 1. O núcleo e a rede: os blocos e os contêineres (T01a)
- **Os cinco blocos novos** e as linhas deles na tabela `jogo/moveis.ts`:

  | Móvel | Células (L × F × A) | Para onde cresce | Partes |
  |---|---|---|---|
  | Fogão | 1 × 1 × 1 | — | 0 |
  | Geladeira | 1 × 1 × 2 | cima | 0 (âncora), 1 |
  | Mesa | 2 × 1 × 1 | direita | 0 (âncora), 1 |
  | TV | 2 × 1 × 2 | direita e cima | 0 a 3 |
  | Som | 1 × 1 × 1 | — | 0 |
- **Os contêineres da geladeira e do fogão:**
  - têm mapas próprios em `extras.conteineres`, guardados pela âncora e conferidos no `sanearExtras`;
  - o `usar` e o quebrar vão para a âncora a partir de qualquer parte;
  - uma função só ("é lugar de contêiner") serve ao `noConteiner` da transação, ao aviso aos outros e ao bloqueio do visitante; o `ehConteiner` e o `motivoDoBloco` cobrem os blocos novos;
  - **o filtro:** na geladeira, todo item tem de ser comida; na entrada do fogão, só as chaves de comida da `FUNDICAO`;
  - **o XP do fogão** (`fundiu:`) segue a regra da fornalha, com o desconto do `postoNaSaida`, para que pôr comida assada na saída e tirar de novo não dê XP;
  - **ao abrir o mundo**, depois da peça solta, sai a entrada cuja âncora não é mais o bloco certo, e a geladeira volta com 9 lugares;
  - os mapas novos só vão para o salvamento quando não estão vazios, então um mundo sem geladeira grava igual a antes;
  - **o `j.conteiner`** fecha quando a criança sai do alcance (conferido uma vez por segundo) e no `reiniciarQuadros`;
  - o `vistaConteiner` ganha `'geladeira'` e `'fogao'`.
- **A rede:**
  - a `VERSAO_REDE` vai para 20, com as uniões novas listadas (`ConteinerVisto`, `LocalSlot` e o motivo da recusa);
  - o teste que prende o 19 vira um teste da 20;
  - a 027 passa para 21 e 22 (`027/spec.md`, as T29 e T36 do `tasks.md` e a linha 478, que estava velha);
  - o servidor publica antes do site;
  - a sala de teste da nuvem é conferida antes do site, com a geladeira cheia voltando depois de a sala dormir;
  - não há volta para o 19 depois da publicação, porque os ids novos seriam desconhecidos.

### 2. O núcleo: a mesa e o estado dos móveis (T01b)
- **A mesa:** os assentos em volta, quem põe, quem come, a ordem, o `j.comendo`, o `acoes[2]++` e o `comeu` de cada um, como nas decisões acima. O `usar` ganha um `slot` opcional, saneado. O prato vai num evento geral para quem está perto, sem estado e sem salvar.
- **O canal do estado dos móveis** (`moveisLigados` no quadro):
  - leva a âncora, o tipo, o programa (o desenho da TV ou a música) e o "desde", no relógio do núcleo;
  - leva também o fogão cozinhando (a receita e o progresso, tirados a cada passo do mapa do fogão) e a geladeira aberta (de quem está com ela aberta);
  - vai no primeiro quadro, em toda mudança e de novo a cada 20 passos, para quem está até a distância de desenho dos móveis (32 blocos), com no máximo as 16 entradas mais perto;
  - a entrada sai quando `movelEm` na âncora deixa de dar o mesmo bloco, a mesma direção e a mesma âncora (a regra do `cuidarDosAssentos`);
  - não é salvo: ao reabrir, tudo começa desligado;
  - quem cai e volta, ou entra no meio, recebe no primeiro quadro;
  - a esperinha e o "o que passa agora" usam as funções puras de `jogo/casa.ts`;
  - o fogão e a geladeira **não** trocam o id do bloco, para não remalhar o pedaço.

### 3. O desenho (T03)
- **Os cinco móveis** saem do esboço para o desenho por pedaço da parte 1, com a escala da segunda volta.
- **O que mexe** ganha malha própria só quando está ligado, lendo o `moveisLigados`: a porta da geladeira, a tela da TV, o vapor e o anel do fogão, os alto-falantes e as notinhas do som.
- **Os quatro desenhos da TV** são feitos em código, sem personagem conhecido nem susto.
- **Os ícones e a mão** de cada móvel.
- **O prato da mesa** e a comida aparecendo para todos.

### 4. A tela e os sons (T04)
- **Os painéis:** o fogão e a geladeira usam o painel dos contêineres de hoje, com o ícone do móvel.
- **As receitas**, na categoria Casa:

  | Móvel | Receita |
  |---|---|
  | Geladeira | `FF` / `F` baú / `FF` |
  | Fogão | `FFF` / `F` fornalha `F` |
  | Mesa | `TTT` / `G G` |
  | TV | `FVF` / `TTT` |
  | Som | `TFT` / `TFT` |

  Nenhuma grade repete outra, e o teste das receitas confere.
- **Os sons:** a porta da geladeira, o fogão cozinhando, a TV ligando e o comer junto, pela régua da 019, mais a musiquinha nova do som.
- **O toque** fica ligado em cada um, e o `usar` da mesa leva o lugar da mochila.

## Experiência medida (para não frustrar)
- **O toque:** a resposta começa em menos de 0,15 s; a TV liga em menos de 0,5 s; o som começa em menos de 0,3 s.
- **Com amigos:**
  - a TV e o som ficam iguais para todos perto, com no máximo 0,3 s de diferença;
  - quem chega depois vê o desenho que está passando;
  - o fogão cozinhando e a geladeira aberta aparecem para todos perto.
- **A mesa:** de 2 a 4 sentados comem juntos num toque. É testada com 2 a 4 jogadores e com 5 sentados, com alguém já comendo, sem ninguém sentado e no criativo, no modo nuvem (`confiar: false`).
- **A segurança:** mexer na geladeira de outra pessoa de longe, ou como visitante, é recusado. A comida posta na saída do fogão não dá XP.
- **Nada some:**
  - a comida da geladeira volta ao recarregar, também na nuvem, e depois de a sala dormir e acordar;
  - quebrar a geladeira espalha a comida, sem duplicar nem sumir.
- **O desempenho**, contra a casa da parte 1, pelas chamadas de desenho, que são estáveis:
  - até +2 paradas com tudo desligado;
  - até +4 com a TV e o som ligados, o fogão cozinhando e a geladeira aberta.

  Os quadros por segundo ficam para conferir no aparelho, porque nesta máquina a mesma cena vai de 31 a 69.
- **O som:** nunca alto, e nunca dois sons de móvel ao mesmo tempo perto da criança.

## A paridade
- **A meta:** 36 de 36 sem regravar, e nenhum hash por tema mudando. Os ids novos passam do `PRIMEIRO_BLOCO_027`, que fica fora do hash dos textos.
- **A sessão `fornalha`** (`e2e/paridade.spec.ts:737`) passa pelos contêineres. Mundo sem geladeira grava igual a antes.
- Qualquer diferença é explicada antes de regravar.

## Cuidados (crianças e legais)
- **O fogão:** de brinquedo, sem fogo de verdade, sem fumaça escura e sem perigo.
- **A TV:** desenhos nossos, mansos e sem texto.
- **A música:** nossa, curta e baixa.
- **Os móveis:** sem cara de marca de eletrodoméstico.

## Fora desta spec
- **Os móveis temáticos** de cada mundo.
- **Outros móveis:** a estante, a banheira, o berço do bichinho e o quadro.
- **A geladeira que dá um lanchinho por dia:** era uma proposta, e o dono escolheu "guarda comida".
