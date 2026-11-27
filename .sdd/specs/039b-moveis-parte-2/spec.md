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
A parte 1 da 039 foi publicada em 27 nov 2026. Ela trouxe a regra dos móveis de várias células, a cama nova, sentar e deitar, e os móveis de brincar. A parte 2 traz os cinco móveis que guardam coisas ou que todos na sala veem juntos. O dono escolheu fazê-la logo depois, enquanto a família joga a parte 1. Os ajustes que a rodada em família trouxer entram antes.

## O que existia
- **A parte 1** (`.sdd/specs/039-moveis/`):
  - a tabela `src/jogo/moveis.ts` (tamanho, direção e partes);
  - a âncora e a peça solta;
  - o `colocar` com as células;
  - quebrar leva o móvel inteiro;
  - os assentos no núcleo (o sofá, a cadeira e a cama, com o `sentado` no jogador visto);
  - o desenho por pedaço em `src/render/moveis/`;
  - a categoria Casa e as abas;
  - `VERSAO_REDE` 19.
- **O estudo e o esboço** (`.sdd/specs/039-moveis/referencia/estudo-moveis.md`, as pranchas em `capturas-039/esboco/`) já têm os cinco móveis desenhados:
  - o fogão de brinquedo, com o anel laranja manso e o vapor de cubinhos;
  - a geladeira menta, com a porta e a comidinha;
  - a mesa com a toalha xadrez;
  - a TV de rack com moldura azul;
  - o aparelho de som amarelo.

  As fotos dos toques estão em sequência, e o código do esboço saiu na parte 1. Ele está no histórico do ramo `esboco/039-moveis` (e18157f e 0e1cb88).
- **A fornalha** (`jogo/fornalha.ts`) e **o baú** (`jogo/conteineres.ts`) são contêineres do núcleo:
  - o `usar` abre pela célula tocada (`nucleo.ts`, perto da linha 2080);
  - o visitante não abre (`nucleo.ts:2085`);
  - quebrar espalha o que tem dentro;
  - ao carregar, o baú volta com `TAMANHO_BAU` lugares.
- **A Casa anos 80** (026, `nucleo/casa.ts`) é uma peça fixa da Vila Neon. O toque na TV e no disco é do núcleo, com uma esperinha, e todos na sala veem o mesmo canal.
- **Comer** (032 e `nucleo.ts:2562`): uma refeição por vez. O evento `comeu` conta no diário (`diario.ts:101`).
- **A revisão da spec da 039, em 26 nov,** já apontou o que vale aqui:
  - os contêineres de duas células;
  - o estado dos toques no núcleo (a TV e o som não podem ir no metadado, porque cada toque remalharia o pedaço e os vizinhos);
  - as regras finas da mesa.

## Decisões do dono (26 e 27 nov 2026)
| Pergunta | Decisão |
|---|---|
| Os móveis | Fogão, geladeira, mesa, TV e aparelho de som, nos estilos do esboço; a TV é a de rack, com moldura azul. |
| O fogão | Cozinha como a fornalha. |
| A geladeira | Guarda comida. |
| A mesa | Junta para comer: uma comida posta na mesa alimenta todos os sentados em volta, até 4. |
| O ferro | A geladeira, o fogão, a TV e o som pedem ferro de verdade nas receitas. |
| De onde vêm | Do criativo, pelo inventário; na sobrevivência, por receita na mesa de montar. Não custam moedinhas. |
| Para todos os mundos | Sim. Os temáticos ficam para a riqueza dos mundos. |

## Decisões do orquestrador (pequenas; a revisar)
- **O fogão:**
  - **Uso:** cozinha sem carvão, só as receitas de comida da fornalha (`FUNDICAO`, carne e peixe crus). Os minérios continuam na fornalha.
  - **Toque:** abre o painel de cozinhar, igual ao da fornalha, só com comida. Cozinhando, o anel laranja e o vapor aparecem para todos.
- **A geladeira:**
  - **Capacidade:** 9 lugares, só de comida.
  - **Dono:** como o baú, só o dono e a dona do mundo abrem. Quebrar espalha a comida.
  - **Toque:** abre a porta (que só os amigos perto veem abrindo) e o painel da geladeira.
- **A mesa:**
  - **Por em volta:** em volta dela, as cadeiras (a parte 1 já tem a cadeira); uma cadeira conta quando está colada à mesa, de frente para ela.
  - **Quem põe:** quem está sentado ou em pé ao lado, com comida na mão, toca na mesa e põe o prato.
  - **Quem come:** todos os sentados em volta (até 4) comem juntos, cada um uma refeição inteira (a fome e a saciedade), com um coraçãozinho. Quem já está comendo termina a sua e não entra na conta.
  - **O que não dá:** a mesa não dá moedinha nem missão além do que comer já dá. Uma comida rende no máximo 4 refeições.
  - **No criativo:** come do mesmo jeito.
- **A TV:**
  - **Toque:** liga com a luz abrindo do meio e quatro desenhos novos, nossos e mansos (os da Casa anos 80 são da Vila Neon); outro toque troca o desenho.
  - **Desligar:** desliga sozinha depois de 3 minutos sem ninguém perto.
  - **Com amigos:** todos perto veem o mesmo desenho, com uma esperinha entre dois toques.
- **O aparelho de som:**
  - **Toque:** toca uma musiquinha nova, curta e mansa, feita em código; os alto-falantes pulam e as notinhas sobem. Outro toque para.
  - **Com amigos:** todos perto ouvem.
  - **Volume:** toca no máximo um som de móvel por vez perto da criança, e o volume vem pela distância.
- **O estado da TV e do som:** vive no núcleo, guardado pela âncora. Não é salvo (ao reabrir, tudo começa desligado). Vai para quem está perto e para quem volta depois de cair (035).

## O que muda
### 1. O núcleo e a rede
- **Os cinco blocos novos** e as linhas deles na tabela `jogo/moveis.ts`:

  | Móvel | Células (L × F × A) | Cresce para | Partes |
  |---|---|---|---|
  | Fogão | 1 × 1 × 1 | | 0 |
  | Geladeira | 1 × 1 × 2 | cima | 0 (âncora), 1 |
  | Mesa | 2 × 1 × 1 | direita | 0 (âncora), 1 |
  | TV | 2 × 1 × 2 | direita e cima | 0 a 3 |
  | Som | 1 × 1 × 1 | | 0 |
- **Os contêineres:**
  - **Mapas:** a geladeira e o fogão têm mapas próprios em `extras.conteineres`, guardados pela âncora e conferidos no `sanearExtras`.
  - **Uso:** o `usar` e o quebrar vão para a âncora a partir de qualquer parte. O filtro "só comida" fica na transação do núcleo.
  - **Regras do baú:** valem para os dois, com o `recusaConteiner` conferindo o dono. A geladeira volta com 9 lugares ao recarregar.
- **A mesa no núcleo:** quem está sentado em volta, quem põe a comida, quem come e o evento `comeu` para cada um.
- **O estado da TV e do som:** o desenho ou a música, a hora do último toque e o desligar sozinho. Vai no quadro só para quem está perto.
- **A rede:** a `VERSAO_REDE` sobe para **20**, e a 027 passa para 21 e 22 no mesmo commit. O servidor publica antes do site.

### 2. O desenho
- Os cinco móveis saem do esboço para o desenho por pedaço da parte 1, com a escala da segunda volta.
- **O que mexe:** a porta da geladeira, a tela da TV, o vapor e o anel do fogão, e os alto-falantes e as notinhas do som. Ganham malha própria só quando ligados.
- **Os quatro desenhos da TV** são feitos em código, sem personagem conhecido nem susto.
- **Os ícones e a mão** de cada um.

### 3. A tela e os sons
- **Os painéis:** o fogão e a geladeira usam o painel dos contêineres de hoje, com o ícone do móvel.
- **A comida na mesa:** o prato e a comida aparecem, e quem come recebe o coraçãozinho.
- **As receitas** dos cinco ficam na categoria Casa, com o ferro de verdade, e nenhuma grade repete outra.
- **Os sons:**
  - a porta da geladeira, o fogão cozinhando, a TV ligando e o comer junto, pela régua da 019;
  - a musiquinha do som, nova.

## Experiência medida (para não frustrar)
- **O toque:** a resposta começa em menos de 0,15 s. A TV liga em menos de 0,5 s, e o som começa em menos de 0,3 s.
- **Com amigos:**
  - a TV e o som ficam iguais para todos perto, com no máximo 0,3 s de diferença;
  - quem chega depois vê o desenho que está passando.
- **A mesa:** de 2 a 4 sentados comem juntos num toque. Isso é testado de 2 a 4 jogadores no modo nuvem (`confiar: false`).
- **Nada some:** a comida da geladeira volta ao recarregar, também na nuvem. Quebrar a geladeira espalha a comida, sem duplicar nem sumir.
- **Desempenho:** numa casa com os 13 móveis, com a TV e o som ligados, no celular em pé com a CPU 4×, os quadros caem no máximo 5% contra a mesma casa da parte 1.
- **O som:** nunca alto, e nunca dois sons de móvel ao mesmo tempo perto da criança.

## Cuidados (crianças e legais)
- **O fogão** é de brinquedo: sem fogo de verdade, sem fumaça escura e sem perigo.
- **A TV** tem desenhos nossos, mansos e sem texto.
- **A música** é nossa, curta e baixa.
- **Os móveis** não têm cara de marca de eletrodoméstico.

## Fora desta spec
- **Os móveis temáticos de cada mundo**, que ficam com a riqueza dos mundos.
- **A estante, a banheira, o berço do bichinho e o quadro.**
- **A geladeira dar lanchinho todo dia:** era uma proposta, e o dono escolheu "guarda comida".
