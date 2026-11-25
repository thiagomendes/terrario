# Estudo: o braço na primeira pessoa (037)

**Por que este estudo.** O dono rejeitou as tentativas de braço da primeira pessoa:
- o braço parecia levantado;
- apontava para outro lugar e ficava torto;
- a ponta do ombro aparecia solta, "desconectada de qualquer corpo";
- a A2 ficou desproporcional.

Ele escolheu a direção sem articulação, porque o braço do boneco não dobra na terceira pessoa. Mas a geometria tem de nascer do corpo, e não de ajuste de tela.

Aqui está, em ordem:
1. as medidas do boneco de verdade;
2. o que a criança veria de dentro dele;
3. os desenhos da conta;
4. como os outros jogos fazem;
5. uma recomendação, com o porquê de cada número.

**De onde vem cada parte:**
- As fotos e as medidas saem de `e2e/estudo-braco-primeira-pessoa.spec.ts` (`ESTUDO_BRACO=1`).
- A conta sai de `conta-braco.mjs`, nesta pasta (`node .sdd/specs/037-construir-melhor/referencia/conta-braco.mjs`).
- As imagens ficam em `capturas-037/estudo/`.
- O jogo e o esboço jogável não mudaram.

## 1. As medidas do boneco de verdade

**De onde saem:**
- do plano do boneco (`planoBoneco` em `src/personagem/boneco.ts`, já com a escala de 1,15), em blocos;
- os pés ficam na origem, x aponta para a direita do boneco e z para a frente dele.

| Medida | Masculino | Feminino |
|---|---|---|
| Altura do boneco | 1,644 | 1,644 |
| Centro da cabeça (altura) | 1,253 | 1,253 |
| Cabeça (largura × altura × fundo) | 0,83 × 0,78 × 0,75 | igual |
| Olhos (altura; à frente do centro do corpo) | 1,207; 0,38 (na cara da cabeça) | igual |
| Câmera do jogo hoje (`ALTURA_OLHOS`) | 1,62: **0,41 acima dos olhos do boneco**, no alto da cabeça | igual |
| Ombro direito (lado; altura; frente) | 0,322; 0,782; 0 | 0,299; 0,782; 0 |
| Ombro em relação aos olhos | 0,32 ao lado, **0,43 abaixo, 0,38 atrás** | 0,30 ao lado, igual |
| Do ombro à junta da mão | 0,31 | 0,31 |
| Mão (bola) | raio 0,098 (diâmetro 0,196) | igual |
| Manga (largura × comprimento × fundo) | 0,149 × 0,299 × 0,161 | igual |
| Peito (largura × altura × fundo) | 0,53 × 0,48 × 0,39 | 0,48 × 0,48 × 0,39 |

**A proporção que manda em tudo:**
- o braço do boneco, do ombro ao meio da mão, mede **1,6 diâmetro de mão**;
- numa pessoa, são uns 7;
- a cabeça é maior que o braço inteiro.

**Os ângulos do braço em cada pose:**
- medidos no jogo, na junta `bracoD`, nos quadros das fotos (`capturas-037/estudo/medidas-terceira-pessoa.json`);
- x leva o braço para a frente (negativo é para a frente);
- z abre o braço para fora (negativo leva para dentro, para o meio do corpo).

| Pose (terceira pessoa) | Junta x | Junta z | Em graus | Mão em relação aos olhos |
|---|---|---|---|---|
| Parado, mão vazia | 0 | 0,10 | pendurado, 6° para fora | 0,74 abaixo, **0,33 atrás** |
| Segurando bloco | −0,32 | 0,07 | 18° para a frente | 0,72 abaixo, **0,23 atrás** |
| Andando | ±0,49 em torno do segurar | 0,06 | ±28° para a frente e para trás | 0,62 abaixo, 0,19 atrás |
| Pulando | −0,32 | 0,55 | abre 32° para fora | 0,70 abaixo, 0,26 atrás |
| Colocando | até −1,22 (pico) | 0,06 | empurra até 70° para a frente | 0,21 atrás no começo |
| Acenando | 0 | 2,6 ± 0,35 | levantado de lado, 149° ± 20° | 0,14 abaixo, 0,35 atrás, 0,45 ao lado |
| Comendo | −1,80 | −0,69 | 103° para a frente, 40° para dentro | 0,34 abaixo, **0,09 atrás** |

**A conclusão da tabela:** em todas as poses, a mão do boneco fica **atrás do plano dos olhos**. Com a mão atrás dos olhos, nenhum campo de visão a mostra, nem o mais aberto.

## 2. A primeira pessoa verdadeira

**Como foi feito:**
- a câmera vai para os olhos do boneco de verdade, no ponto entre os olhos, logo atrás do rosto;
- o corpo vira para onde a câmera olha;
- só a cabeça some; o corpo e os **dois braços de verdade** ficam, nas poses que a terceira pessoa já usa;
- nada de peça à parte.

**O que se vê, com 70° (o de hoje), 90° e 110°:**

| Pose | 70° | 90° | 110° |
|---|---|---|---|
| Segurando o bloco | nada da mão nem do bloco | nada | nada |
| Andando, pulando, colocando | nada | — | — |
| Acenando | nada (a mão sobe do lado, atrás dos olhos) | nada | nada |
| Comendo | só a beirada da maçã, no canto de baixo à direita | a maçã, no canto | a maçã grande, embaixo à direita |
| Olhando bem para baixo | só o chão: o peito fica atrás da vertical dos olhos | — | — |

**As fotos:**
- `verdadeira-70-*.png` (as sete poses e olhando para baixo);
- `verdadeira-90-*.png` e `verdadeira-110-*.png` (segurando, acenando e comendo);
- e, para comparar, a terceira pessoa de cada momento em `terceira-*.png`.

**O porquê, nas medidas:**
- **O braço é curto e fica atrás dos olhos.** O ombro está 0,38 atrás dos olhos, e o braço mede 0,31. Mesmo esticado para a frente, a mão para 0,07 atrás do rosto.
- **Os olhos estão na frente do peito.** A cabeça é funda (0,75), e os olhos ficam na cara dela. Olhando para baixo, o peito e os pés ficam atrás da vertical, e ninguém se vê.
- **A câmera de hoje fica no alto da cabeça.** Ela está 0,41 acima dos olhos do boneco (1,62 contra 1,21) e 0,85 acima dos ombros. O ombro fica ainda mais longe do campo de visão.
- **O celular em pé é estreito.** O campo de visão é de 70° na vertical, mas só de 36° na horizontal. Um braço que vem do lado do corpo (0,32 para fora) só entra na tela bem longe na frente.

**Conclusão:** a primeira pessoa verdadeira do nosso boneco não mostra a mão. Só a comida aparece, num canto, quando ele come. Para a criança ver o que segura, o braço precisa de um lugar próprio na frente da câmera. É o que todos os jogos fazem (seção 4).

## 3. Os desenhos da conta

**`desenho-verdadeira.png`:**
- as sete poses, de lado e de cima, desenhadas das medidas do jogo;
- os olhos (preto), o ombro (vermelho), o braço e a mão, e o cone de visão de 70° no celular em pé (amarelo);
- em nenhuma pose a mão entra no cone. De lado, o braço fica todo debaixo dos olhos; de cima, atrás deles.

**`desenho-recomendada.png`:**
- a recomendação no espaço da câmera, de lado e de cima, segurando, colocando, acenando e comendo;
- o ombro fica fixo fora do cone, pela direita;
- o braço gira nele e só a mão e o antebraço entram no cone.

## 4. Como os outros jogos fazem

**Jogos de boneco de bloco:**
- **Minecraft.** Na primeira pessoa aparece só o braço da mão principal, com a pele do próprio jogador; a outra mão só aparece segurando algo. O campo de visão padrão é 70° (de 30° a 110°), e a "View Bobbing" balança a câmera ao andar. A mão e o item também se mexem no passo e na queda, e há relatos de que esticam e saem do lugar com campos de visão diferentes.
- **Roblox.** Na primeira pessoa, os scripts do próprio Roblox deixam o corpo do jogador transparente. Os braços não aparecem por padrão. Quem quer os braços força a transparência de volta a 0 a cada quadro, ou faz "braços de mentira" (viewmodel) presos aos de verdade.

**Corpo inteiro ("full body awareness"):**
- A câmera fica presa à cabeça do esqueleto animado, e a animação do corpo move a câmera.
- Os problemas conhecidos são:
  - o atraso de um quadro;
  - a rotação dobrada da cabeça;
  - o enjoo com o balanço da cabeça, contornado prendendo a cabeça num ponto distante.
- Dark Messiah é o exemplo citado de corpo inteiro visível olhando para baixo.
- Muitos jogos escondem o corpo porque, com o campo de visão largo dos jogos, ele fica feio e esquisito na perspectiva.

**Braço de câmera (viewmodel):**
- O braço e o item são desenhados à parte, com campo de visão e escala próprios, e não atravessam a parede.
- **Unreal** tem isso pronto ("First Person Rendering"):
  - as peças marcadas usam o "First Person Field of View";
  - uma "First Person Scale" encolhe essas peças até a câmera, para não atravessarem nada;
  - elas não fazem sombra na cena, e um corpo à parte faz a sombra.
- **Team Fortress 2** desenha o viewmodel com campo de visão de 54° por padrão (de 54° a 70° no menu).
- Pedidos de jogadores mostram o motivo: querem o braço num campo e o mundo noutro.

**O que se aproveita para o Terrário:**
- Os jogos de bloco mostram **um braço só, a mão principal, do mesmo jeito do corpo**.
- O braço é sempre um **braço de câmera**: ancorado na câmera, com a ponta do ombro fora da tela.
- **Ninguém mostra o braço anatômico de dentro da cabeça.** No nosso boneco, de cabeça grande e braço curto, a seção 2 mostra o porquê.
- O passo e a queda mexem a mão de leve. O campo de visão do braço é uma alavanca conhecida, mas deforma perto das beiradas.

## 5. A conta da troca

**O que a conta tem de fazer ao mesmo tempo:**
- usar o braço de verdade (1,6 mão de comprimento), rígido;
- deixar o ombro, com a grossura da manga, fora da tela;
- deixar a mão e o bloco acima dos botões (celular em pé).

Sobra uma troca: **quanto mais o braço aponta para a frente (para dentro da tela), maior a mão tem de ficar**. Para frente, o ombro fica "atrás" da mão na tela; para ele sair pela beira, a mão tem de estar perto e grande.

**A menor mão possível (diâmetro em px), por ângulo do braço para dentro:**
- 0° é para a frente, longe da câmera;
- "—" é impossível sem tapar os botões ou mostrar o ombro.

| Tela, campo de visão | 0° | 10° | 20° | 30° | 40° | 50° |
|---|---|---|---|---|---|---|
| Em pé (390×844), 70° | — | — | — | 106 | 85 | 73 |
| Em pé, 90° só no braço | — | — | 107 | 83 | 71 | 64 |
| Deitado (844×390), 70° | — | — | 68 | 65 | 66 | 69 |
| Computador (1280×720), 70° | 161 | 138 | 124 | 118 | 116 | 119 |

**O que a tabela explica nas tentativas anteriores:**
- **A opção 2 do esboço:** o braço vinha de baixo e **subia 25°** até a mão, 45° para dentro. Era o jeito de a mão ficar pequena, mas leu como "braço levantado" e "torto".
- **A A2:** esticava a manga, outro jeito de a mão ficar pequena, e leu como "desproporcional".
- **Com o braço para a frente, de verdade, no celular em pé:** a mão teria de ter mais de 170 px (quase meia tela), ou passar por cima dos botões.

## 6. A recomendação

**Um braço de câmera ancorado num ombro fixo fora da beira direita, com o braço de verdade e os ângulos de junta da terceira pessoa.**

### Onde fica a câmera

- Nos olhos de verdade do boneco: o ponto entre os olhos, logo atrás do rosto, a 1,21 do chão. Hoje ela fica a 1,62, no alto da cabeça.
- A cabeça some; o resto do corpo fica.
- O campo de visão é o de hoje, 70°, igual para o mundo e para o braço. Nada fica deformado e a proporção da mão e da manga é a do boneco.

### O braço

- É o braço inteiro do boneco, a mesma peça e a mesma roupa, no tamanho de verdade (0,31 do ombro à mão, mão de 0,196), sem dobra e sem esticar.
- Ele desenha por cima do mundo (não entra na parede).
- A mão e o item ficam de pé, como na terceira pessoa, com o bloco na frente da mão.

### Onde fica o ombro

- **O ombro fica fixo no espaço da câmera, fora da beira direita, um tico abaixo do meio.**
- Medidas (x direita, y cima, z frente):
  - em pé: (0,59; −0,31; 1,47);
  - deitado: (1,30; −0,10; 0,78);
  - computador: (1,15; −0,26; 0,83).
- Esses números não são de olho. Saem da conta em `conta-braco.mjs`: entre os lugares em que o ombro fica fora da tela e na frente do plano de corte, e em que a mão de segurar cai no canto de baixo à direita com o bloco acima dos botões, é o de mão menor.
- Na spec, a mesma conta roda quando a tela muda de tamanho.

### Para onde o braço aponta

- **Segurando:** os ângulos de **comer** da terceira pessoa (para a frente e 40° para dentro, para o meio do corpo), baixados 15° (junta x = −1,24, z = −0,69).
  - O braço desce um pouco do ombro até a mão; nunca sobe.
  - Ele aponta para o meio do corpo, onde a criança leva as coisas.
- **Andando:** o mesmo balanço da terceira pessoa, no mesmo ritmo do passo, em 12%. São ±3,4°, um sobe e desce de poucos px, nada de lado.
- **Pulando:** o "abre" da terceira pessoa, em 25%.
- **Colocando:** o empurrão da terceira pessoa (até −0,9), em 35%. A mão vai para a frente e para cima, para onde o bloco entra.
- **Acenando:**
  - o braço sobe para a frente (x = −2,2);
  - a mão abana com o mesmo ±0,35 (±20°) da terceira pessoa;
  - o abano fica em volta de 57° para dentro (z = −1,0), para a mão não sair pela direita.
- **Comendo:** os ângulos de comer da terceira pessoa (x = −1,80, z = −0,69).
- **Entrando e saindo** (variante A, a mão vazia some): o braço gira no ombro para baixo e a mão some pela beira de baixo.

### Por que a ponta nunca aparece

- O braço só gira em torno do ombro, e o ombro não se mexe. A ponta do braço é o próprio ombro, que fica parado fora da tela.
- O e2e mede isso quadro a quadro: a projeção do ombro, com a grossura da manga, contra o retângulo da tela, durante o roteiro inteiro (segurar, andar, pular, colocar, acenar, comer, olhar em volta, para cima e para baixo):

| Tela | Quadros conferidos | Menor folga (px) |
|---|---|---|
| Em pé | 1054 | 4 |
| Deitado | 749 | 4 |
| Computador | 703 | 4 |

- Os números estão em `capturas-037/estudo/conferencia-ombro.json`.

### Tamanho na tela

A mão de segurar fica com uns 70 px de diâmetro em pé, 54 deitado e 95 no computador.

### As imagens

- **Em pé, com o modelo real:** `recomendada-emPe-segurando.png`, `-andando`, `-colocando`, `-acenando`, `-comendo`, e também `-pulando`.
- **Deitado e computador:** `recomendada-deitado-segurando.png` e `recomendada-computador-segurando.png`.
- **De noite:** `recomendada-emPe-noite-segurando.png`.
- **A prancha final:** `prancha-verdadeira-e-recomendada.png`, com a primeira pessoa verdadeira (em cima) ao lado da recomendação (embaixo), nos cinco momentos.

### O que fica para decidir na spec

- **A altura da câmera.** Nos olhos do boneco (1,21), o mundo parece maior e a mira desce. A recomendação usa os olhos de verdade, mas mexe no alcance e na mira, e isso tem de ser medido.
- **O tamanho da mão.** Com 70 px, aparecem a mão, o punho e um pedaço da manga saindo da beira. Para mostrar mais antebraço, a conta dá o preço: a mão cresce (85 px com o braço 40° para dentro, 106 com 30°).
- **O campo de visão do braço.** Um campo só para o braço (90°) diminui a mão uns 20%, mas deforma a manga perto da beira. A recomendação fica com o campo de hoje.

## 7. O que ficou fraco

- **Acenando e comendo:** o braço fica longe da câmera (o ombro está a 1,5 bloco), então a mão se mexe pouco na tela. O aceno lê como "a mão sobe um tico", e a maçã não chega perto da boca como na verdadeira com 110°.
- **Colocando:** nas fotos aparece mais o bloco que entrou do que o empurrão.
- **A primeira pessoa verdadeira:** a foto de colocar pegou o começo do empurrão (x = −0,42), não o pico (−1,22). O pico está na tabela, tirado do código.
- **Em pé:** o bloco na mão fica um pouco atrás da mão, e a mão quase encosta na beira direita.
- **A sombra:** o braço de câmera não faz sombra no chão; a do corpo é a de sempre.

## Fontes

Li a página inteira:
- Unreal Engine, "First Person Rendering": https://dev.epicgames.com/documentation/en-us/unreal-engine/first-person-rendering
- Team Fortress 2 Wiki, "Viewmodel": https://wiki.teamfortress.com/wiki/Viewmodel
- Game Developer, "True First-Person Camera in Unreal Engine 4": https://gamedeveloper.com/programming/true-first-person-camera-in-unreal-engine-4
- Game Developer, "Making the most out of the first-person perspective": https://gamedeveloper.com/design/making-the-most-out-of-the-first-person-perspective
- Minecraft Wiki, "Options" (FOV e View Bobbing): https://minecraft.wiki/w/Options
- Roblox DevForum, "Make arms visible in first person": https://devforum.roblox.com/t/make-arms-visible-in-first-person/495259

Vi só pelo resumo da busca:
- Minecraft Wiki, "Skin" (a camada do braço direito na primeira pessoa): https://minecraft.wiki/w/Skin
- Minecraft Wiki, "Dual wielding" (a outra mão some vazia): https://minecraft.wiki/w/Dual_wielding
- Mojira MC-301174 (a mão atrasada no passo): https://mojira.dev/MC-301174
- Mojira MCPE-170832 (a mão estica com o campo de visão): https://bugs.mojang.com/browse/MCPE-170832
- Unreal Forums, "Render your first person arms/weapons at a separate FOV": https://forums.unrealengine.com/t/render-your-first-person-arms-weapons-at-a-separate-fov-than-your-camera-fov/237944
- Giant Bomb, "Full Body Awareness": https://www.giantbomb.com/full-body-awareness/92-1692/
- Roblox DevForum, "Adding arms in FP view": https://devforum.roblox.com/t/adding-arms-in-fp-view/3396093

Só o jeito de fazer foi aproveitado; nenhuma arte foi copiada.
