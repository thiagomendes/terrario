---
id: 039-moveis
title: 'Móveis e utensílios: 13 móveis de verdade e interativos, para todos os mundos, com a cama nova de dois blocos'
status: DRAFT
base_branch: main
branch: feat/039-moveis
created_at: 2026-11-26T21:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
---

## Contexto
O dono, em 26 nov 2026, sobre a casa por dentro: "a casinha fica meio pobre". Ele pediu:
- móveis de verdade, com relevo e no estilo dos nossos brinquedos, e não cubos pintados;
- cozinha, sala, TV e aparelho de som, "pensando fora da caixa";
- móveis interativos, em que um toque faz alguma coisa;
- **um conjunto geral, que vale em todos os mundos.** As versões temáticas (sofá de bolo, cama-cápsula, fogão a lenha) ficam na "Riqueza nos mundos antigos" do backlog.

A cama nova saiu da 038 e veio para cá. Sobre a de hoje, o dono disse: "o ícone fica bonitinho, mas na hora que você coloca é um terror".

## O que existia
### O estudo e o esboço (26 nov 2026, branch `esboco/039-moveis`)
- O estudo está em `referencia/estudo-moveis.md`. Ele cobre:
  - o que existe hoje;
  - os 13 móveis;
  - a conta de proporção com o boneco;
  - as receitas;
  - o criativo;
  - pôr e quebrar;
  - o desempenho.
- O código do esboço está em `src/esboco/moveis.ts` e `moveisPecas.ts`, ligado com `?esboco=moveis`. As fotos e as duas pranchas estão em `capturas-039/esboco/` e `volta2/`.
- O esboço mediu 15.678 triângulos para os 13 móveis com tudo ligado, desenhados com o `Ref` das peças da Casa anos 80.

### O jogo hoje (`main` 6a47f14, `VERSAO_REDE` 18)
- **A cama** (`CAMA`, id 56) é uma laje de uma célula com textura (`cama_topo` e `cama_lado` em `src/art/atlas.ts`). Ela marca o lugar de nascer e serve para dormir; a noite passa quando todos dormem. O ícone e a mão já mostram uma cama comprida e bonita (`render/itensBrinquedo.ts`).
- **A porta** ocupa duas células: o núcleo só aceita `extras` no `colocar` para ela, e quebrar uma metade leva a outra.
- **A Casa anos 80** (026) é o único interior mobiliado do jogo. As peças dela são desenhadas com o `Ref` (`render/vila/`), numa malha de corpo e numa de luzes por pedaço. O toque na TV e no disco é do núcleo, e todos na sala veem o mesmo.
- **Os povoados, o sítio e as plantas da Cidade Grande** põem camas de uma célula nas casas prontas.
- **O criativo** tem um catálogo numa grade só (`ui/inventario.ts`). **A mesa de montar** tem o livro de receitas por ícone (`ui/criacao.ts`).

## Decisões do dono (26 nov 2026, pelas pranchas do esboço)
| Pergunta | Decisão |
|---|---|
| Os móveis | Os 13 do estudo:<br>- **sala:** sofá, TV, aparelho de som, tapete de pista e abajur;<br>- **cozinha:** fogão, geladeira, pia, mesa e cadeira;<br>- **quarto:** cama nova de dois blocos, guarda-roupa e criado-mudo. |
| Os estilos | Os recomendados: a cama do ícone (madeira em degrau, cobertor vermelho de retalhos), o sofá gordinho coral e a TV de rack com moldura azul. |
| A escala | A da segunda volta, pela conta de proporção com o boneco: a bancada entre o queixo e os olhos, a mesa no peito de quem está sentado, a cama cabe a criança inteira. |
| De onde vêm | No criativo, no inventário. Na sobrevivência, com receitas na mesa de montar. **Não custam moedinhas.** |
| O criativo | Uma fileira de abas de ícone em cima do catálogo: tudo, blocos, casa, comida, ferramentas e luz. |
| Os toques com regra | Os quatro:<br>- o fogão cozinha como a fornalha;<br>- a geladeira guarda comida;<br>- o guarda-roupa abre a troca de roupa;<br>- a mesa junta para comer. |
| O ferro | Os cinco móveis de ferro (geladeira, fogão, pia, TV e som) pedem ferro de verdade, depois da caverna. |
| A mesa | Uma comida posta na mesa alimenta todo mundo sentado em volta, até 4. |
| As camas antigas | Viram a cama nova de dois blocos onde couber. Onde não couber, viram a "cama curtinha", com o desenho novo numa célula. Nada some. |

## Decisões do orquestrador (pequenas, contadas ao dono)
- **O fogão** cozinha sem carvão. A fornalha continua para os minérios.
- **A geladeira** tem 9 lugares, só de comida, e a comida não estraga.
- **O guarda-roupa** abre a troca de roupa direto nas roupas, sem o botão "Jogar" da tela de criar a criança.
- **Os toques de brincadeira:**
  - a TV liga e troca de desenho, com 4 desenhos novos e nossos (os da Casa anos 80 são da Vila Neon) e desliga sozinha;
  - o som toca uma musiquinha nova, curta e mansa;
  - a pia faz água e bolhas;
  - o abajur e o criado-mudo acendem;
  - o tapete faz o carrinho dar a volta;
  - o sofá, a cadeira e a cama fazem a criança sentar ou deitar de verdade.
- **Com amigos:** a TV e o som tocam o mesmo para todos, como na Casa anos 80, com uma esperinha entre dois toques.
- **A criança deitada:** só na cama, o corpo achata e o edredom vai do queixo ao pé, como na segunda volta. Hoje a tela só escurece; daqui para a frente, vê-se a criança deitada.
- **Fica para depois:** a estante de livros, a banheira, o berço do bichinho e o quadro de pintar.

## O que muda
### 1. O núcleo e a rede: móveis de mais de uma célula
- **Os 13 blocos novos**, com a forma e o tamanho em células de cada um. A cama nova usa o mesmo `CAMA`.
- **O `colocar` aceita `extras`** com as células do móvel, só elas e exatamente elas.
  - A célula de pé é a do toque.
  - As outras saem do tamanho do móvel e da direção do olhar: a cama vai para a frente; o sofá, a mesa, a TV e o guarda-roupa, para a direita; a geladeira e o abajur, para cima.
  - Todas as células têm de estar livres, com a proteção e a regra da 037 (nada em cima de gente ou bicho, e apoiado).
  - Cada célula guarda o bloco, com a direção e qual parte ela é. Quebrar qualquer parte leva o móvel inteiro, que vira um item só.
- **Muda o protocolo: `VERSAO_REDE` vai para 19.** A 027 parte 2 tinha reservado a 19; a que sair primeiro fica com ela, e a outra sobe. O servidor publica antes do site, pelo passo do `CLAUDE.md`.
- **Os toques com regra no núcleo:**
  - o fogão cozinha;
  - a geladeira guarda (como um baú só de comida);
  - a mesa alimenta quem está sentado em volta.
- **O sentar e o deitar** viram um estado da criança, como o `montado` da 036, para os amigos verem.
- **As camas antigas:**
  - nos mundos já salvos, a conversão roda ao carregar o pedaço;
  - nos geradores (povoados, sítio, Cidade Grande), a cama nova já sai com as duas células;
  - a paridade de cada tema muda de propósito, com os hashes novos registrados.

### 2. O desenho
- **Os móveis** saem do esboço para o jogo. O corpo parado de todos os móveis de um pedaço fica numa malha só, mais uma de luzes, como as peças da Vila Neon. O que mexe (portas, tela, cobertor, notinhas, água, vapor) só ganha malha quando é tocado ou quando a criança está perto.
- **A colisão** é por caixas, com o tamanho de cada móvel.
- **O ícone e a mão** de cada móvel seguem o modelo, como o ícone da cama de hoje.
- **A pose de sentar e a de deitar** valem para a criança e os amigos, nas duas câmeras (na primeira pessoa, "dormindo" já tem câmera própria).

### 3. As receitas e o criativo
- **As 13 receitas** do estudo, com o ferro de verdade, numa categoria nova do livro: **Casa**. Nenhuma grade repete outra receita, e o teste das receitas confere isso.
- **As abas de ícone** em cima do catálogo do criativo: tudo, blocos, casa, comida, ferramentas e luz. Os ícones são os mesmos do livro. A aba "casa" cabe sem rolar no celular em pé.

### 4. Os sons e a ligação
- **Os sons curtos** de cada toque, pela régua da 019: as portas, a TV ligando, a água, o fogão e o sentar.
- **A musiquinha nova do aparelho de som**, feita em código.
- **A troca de roupa** do guarda-roupa, direto nas roupas.

### 5. O esboço sai
`src/esboco/moveis.ts`, `moveisPecas.ts` e o e2e do esboço saem quando a spec ficar pronta. As fotos ficam.

## Experiência medida (para não frustrar)
- **Pôr um móvel:** o fantasma mostra o móvel inteiro, em todas as células, antes de pôr. Se alguma célula não couber, ele fica vermelho e nada acontece. Num toque, o móvel aparece em menos de 0,2 s.
- **O toque:** a resposta começa em menos de 0,15 s, e a TV, a geladeira e o guarda-roupa abrem em menos de 0,5 s.
- **Desempenho:** no celular em pé, com a CPU 4× mais lenta, numa casa com os 13 móveis:
  - no máximo +4 chamadas de desenho paradas;
  - uns 16 mil triângulos;
  - os quadros não caem mais de 5% contra a casa vazia.
- **Nada some:**
  - as camas antigas viram a nova sem perder o lugar de nascer;
  - os móveis voltam ao recarregar, também num mundo da nuvem;
  - quebrar devolve o item.
- **Com amigos:** a amiga vê o móvel posto, a TV no mesmo desenho, a criança sentada ou deitada e a mesa comendo junto.

## Cuidados (crianças e legais; ver `.sdd/cuidados-legais.md`)
- **O fogão** é de brinquedo: um anel laranja manso, sem fogo de verdade, sem fumaça escura e sem barulho alto.
- **A TV** tem desenhos nossos, mansos, sem personagem conhecido e sem susto.
- **Nada de porta batendo nem de escuro total.** O criado-mudo acende devagar.
- **Os móveis são originais**, sem cara de outro jogo nem de marca de móvel ou de eletrodoméstico.
- **Nada de arco-íris.**

## Fora desta spec
- Os móveis temáticos de cada mundo, que ficam na "Riqueza nos mundos antigos".
- A estante de livros, a banheira, o berço do bichinho e o quadro de pintar.
- O teto que some ao entrar nas casas dos povoados, como a câmera de casa de bonecas da Casa anos 80.
