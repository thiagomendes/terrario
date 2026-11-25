# Estudo: a escala da primeira pessoa (037)

**A queixa do dono** (jogando no celular, 25 nov): "o tamanho do bloco na tua frente, o que você coloca, está estranho; o campo de visão vai embora; precisa de uma análise geométrica melhor".

**A suspeita do orquestrador:** não é só o campo de visão, é a escala. Com os olhos a 1,21 e blocos de 1, o bloco da frente chega quase à altura dos olhos e o mundo parece de formiga.

**De onde vêm os números:**
- a conta: `conta-escala.mjs`, nesta pasta, que usa a conta de lajotas de `conta-visao.mjs`;
- a grade fotografada: `e2e/estudo-visao-primeira-pessoa.spec.ts` (`ESTUDO_VISAO=grade` e `final`);
- as imagens: `capturas-037/estudo-visao/`.

## A resposta curta

**A suspeita se confirma, com um detalhe que a conta mostra.**

O tamanho do bloco na tela não depende da altura dos olhos. A altura de um bloco de face plana, olhando para a frente, ocupa 1 ÷ (2 × distância × tan(meio campo)) da altura da tela. Isso só depende da distância e do campo de visão.

A altura decide outra coisa:
- **onde o bloco fica em relação ao horizonte;**
- **quanto da frente ele tapa.**

Com os olhos a 1,21, um bloco de 1 chega a 83% da altura dos olhos. O alto do bloco a 1,5 fica só 38 px abaixo do horizonte (celular em pé), e ele tapa a frente como uma caixa na altura do peito. No jogo de blocos de referência, com os olhos a 1,62, o bloco chega a 62% e o alto dele fica 126 px abaixo do horizonte: vê-se o tampo, e a frente por cima dele.

**E o campo de 90° esticava:**
- a beira de cima e a de baixo esticavam 2 vezes, e é aí que fica o bloco que a criança acabou de pôr;
- daí o campo que "vai embora".

## 1. Os números de hoje (olhos a 1,21)

O olhar entra com o horizonte no terço de cima da tela. Cada bloco está no chão, com a face a 1, 1,5, 2, 3 e 5 dos olhos. As células dão a altura e a largura do bloco, em % da tela.

| Tela | Campo vertical / horizontal | Esticada na beira (alto e baixo / lados) | Horizonte | Bloco a 1 | Bloco a 1,5 | Bloco a 2 | Bloco a 3 | Bloco a 5 |
|---|---|---|---|---|---|---|---|---|
| Em pé (390×844) | 90,5° / 50° | 2,02 / 1,22 | 281 px | 42 / 106 | 31 / 72 | 24 / 55 | 17 / 37 | 10 / 22 |
| Deitado (844×390) | 70° / 113° | 1,49 / 3,30 | 130 px | 63 / 32 | 45 / 22 | 35 / 17 | 24 / 11 | 15 / 7 |
| Computador (1280×720) | 70° / 102° | 1,49 / 2,55 | 240 px | 63 / 39 | 45 / 27 | 35 / 20 | 24 / 14 | 15 / 8 |

**O alto do bloco a 1,5:** fica 38 px abaixo do horizonte em pé, 24 px deitado e 45 px no computador.

## 2. A referência: o jogo de blocos

**Os números do jogo de blocos conhecido:**
- **olhos a 1,62 num corpo de 1,8**, com blocos de 1 (Minecraft Wiki, "Player": altura 1,8, largura 0,6, olhos a 1,62);
- **campo de 70° por padrão**, de 30° a 110° (Minecraft Wiki, "Options");
- o campo é **vertical**, e o horizontal sai da forma da tela ("Hor+"): 70° na vertical dão 102,4° na horizontal em 16:9 (fórmula e exemplo do artigo da Switchblade Gaming; o Hor+ na Wikipedia, "Field of view in video games"; o relato de jogadores de que o controle do Java só mexe no vertical).

**No celular:** o jogo se joga deitado. Não achei fonte que confirme um campo próprio para o celular, nem para a tela em pé (a busca não confirmou nenhum padrão diferente de 70° no Bedrock). Com a regra Hor+, a tela em pé daria só 36° na horizontal: o "zoom" que o dono reclamou na primeira rodada.

| | Campo vertical / horizontal | Horizonte | Bloco a 1 | Bloco a 1,5 | Bloco a 2 | Bloco a 3 | Bloco a 5 |
|---|---|---|---|---|---|---|---|
| Computador 16:9, olhos a 1,62, 70°, olhando reto | 70° / 102° | 360 px (o meio) | 94 / 40 | 59 / 27 | 43 / 20 | 28 / 13 | 16 / 8 |
| A mesma regra no celular em pé | 70° / 36° | 422 px | 94 / 155 | 59 / 103 | 43 / 77 | 28 / 52 | 16 / 31 |

**A conta da referência:**
- **No computador:** o alto do bloco a 1,5 fica 128 px abaixo do horizonte. A foto está em `referencia-computador-h1_62-fov70.png`, com o bloco a 1,5 medido na tela: 47% da altura e 25% da largura.
- **No celular em pé, a mesma proporção é impossível:** para o bloco a 1,5 ocupar a mesma fração da largura que no computador, o campo em pé teria de ser de 113° na vertical, e a beira esticaria 3,3 vezes. O celular em pé sempre mostra o bloco mais largo na tela, e o campo tem de ficar num meio-termo.

## 3. A grade (celular em pé, a mesma cena)

**A cena:** um bloco de tábuas no chão com a face a 1,5 dos olhos e uma parede de tijolos (3 de altura) a 3. O olhar entra com o horizonte no terço de cima.

**As medidas:**
- o tamanho do bloco a 1,5 foi medido na tela, pelos oito cantos projetados pela câmera que desenha;
- as lajotas e a esticada saem da conta.

A prancha está em `prancha-grade.png`, e as fotos em `grade-h*-fov*.png`.

| Olhos | Campo vertical / horizontal | Esticada (alto e baixo) | Bloco a 1,5 (% altura / % largura) | Alto do bloco abaixo do horizonte | Lajotas à frente, acima dos botões |
|---|---|---|---|---|---|
| 1,21 | 70° / 36° | 1,49 | 44 / 103 | 53 px | 12 |
| 1,21 | 80° / 42° | 1,70 | 37 / 87 | 45 px | 14 |
| 1,21 (hoje) | 90° / 50° | 2,00 | 31 / 73 | 39 px | 20 |
| 1,45 | 70° / 36° | 1,49 | 45 / 99 | 110 px | 12 |
| 1,45 | 80° / 42° | 1,70 | 37 / 82 | 93 px | 16 |
| 1,45 | 90° / 50° | 2,00 | 31 / 69 | 80 px | 20 |
| 1,62 | 70° / 36° | 1,49 | 45 / 95 | 149 px | 14 |
| **1,62** | **80° / 42°** | **1,70** | **37 / 79** | **126 px** | **16** |
| 1,62 | 90° / 50° | 2,00 | 31 / 67 | 108 px | 20 |

**A câmera da terceira pessoa** fica de 4 a 5 blocos atrás e de 2,3 a 3,7 acima do boneco. Ela não serve de primeira pessoa, por isso não entrou na grade. Os números dela estão no estudo da visão anterior (`capturas-037/esboco/final2/medidas.json`).

## 4. A recomendação

**Olhos a 1,62. Campo vertical de 80° no celular em pé (42° na horizontal) e 70° deitado e no computador. O olhar entra com o horizonte no terço de cima.**

**Por que os olhos a 1,62:**
- É a proporção do jogo de blocos conhecido: o bloco chega a 62% da altura dos olhos, e não a 83%. O alto do bloco a 1,5 passa de 39 para 126 px abaixo do horizonte, e a criança vê o tampo do bloco que põe e a frente por cima dele.
- É a altura dos olhos do controle, de onde o jogo mede o alcance. Agora o raio do dedo sai quase do mesmo ponto de onde o alcance é contado, o que antes era uma diferença de 0,41.
- Com a cabeça escondida, os olhos desenhados do boneco (a 1,21) não aparecem e não precisam mandar na câmera.
- A câmera mais alta vê mais chão: com 80°, 16 lajotas a 1,62 contra 14 a 1,21.

**Por que 80° em pé:**
- 90° esticava 2 vezes a beira de cima e a de baixo, onde fica o bloco que se acabou de pôr: era o campo que "vai embora". 80° estica 1,7.
- 70° volta ao "zoom" (36° na horizontal).
- **O que custa:** 16 lajotas à frente, contra as 20 de hoje, e o bloco a 1,5 um pouco maior (37% da altura, contra 31%). Em troca, ele fica bem abaixo do horizonte.
- **Deitado e no computador continua 70°,** como a referência: já dá de 102° a 113° na horizontal.

**Medido na recomendação aplicada:**
- celular em pé: bloco a 1,5 com 38% da altura e 80% da largura;
- deitado: 47% e 21%;
- computador: 47% e 25%, os mesmos números da referência.

**A mira e o alcance:** a regra do alcance não muda; ela sai dos olhos do controle, que estão a 1,62. A mira pelo toque foi provada de novo com a câmera nova:
- 20 toques de verdade em pontos diferentes da tela, em pé (6 no chão, 12 na parede, 2 na pilha): os 20 na célula embaixo do dedo;
- 10 cliques no computador: os 10 na célula embaixo do ponteiro.

**O braço não muda:**
- ele é medido no campo de 70° no espaço da câmera, e a altura dos olhos não entra na conta dele;
- o suporte compensa o campo de 80°;
- o ombro fora da tela foi conferido quadro a quadro no vídeo: menor folga de 5 px.

**As imagens da recomendação:**
- `recomendada-cena.png`: a mesma cena da grade;
- `recomendada-andando.png`, `recomendada-colocando.png` e `recomendada-depois-de-colocar.png`;
- `recomendada-deitado.png` e `recomendada-computador.png`;
- `recomendada-andando-e-colocando.webm`: o vídeo curto.

## 5. O que ficou fraco

- **A beira ainda estica:** a deformação de 1,7 na beira é a mais alta do conjunto. Deitado e no computador, os lados esticam mais (de 2,55 a 3,3), como no jogo de referência.
- **Menos chão que hoje:** a recomendação vê 16 lajotas, contra 20. É o preço de esticar menos.
- **O bloco ainda é largo:** em pé, o bloco a 1,5 ocupa 80% da largura da tela, e não tem jeito sem esticar mais. A tela em pé é estreita.
- **A câmera não é a dos olhos desenhados:** fica 0,41 acima deles, no alto da cabeça escondida. Olhando bem para baixo, o corpo aparece um pouco mais longe.
- **O ajuste de estudo:** as alturas e os campos da grade foram fotografados com o ajuste de estudo do esboço (`ajustarCamera`), que fica no esboço só para isso.

## Fontes

- Minecraft Wiki, "Player" (a altura do corpo e dos olhos): https://minecraft.wiki/w/Player
- Minecraft Wiki, "Options" (o campo de 70° por padrão, de 30° a 110°): https://minecraft.wiki/w/Options
- Switchblade Gaming, "Best FOV Settings for Gaming" (a fórmula do horizontal; 70° na vertical são 102,4° em 16:9), visto pelo resumo da busca: https://www.switchbladegaming.com/game-settings/best-fov-settings-explained/
- Wikipedia, "Field of view in video games" (o Hor+), visto pelo resumo da busca: https://en.wikipedia.org/wiki/Field_of_view_in_video_games
- Minecraft Feedback, o relato de que o controle do campo no Java só mexe no vertical, visto pelo resumo da busca: https://feedback.minecraft.net/hc/en-us/community/posts/360047701091/comments/360014133332
