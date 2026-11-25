# Estudo: os tesouros da mão e o celular deitado na primeira pessoa (037)

**Por que este estudo.** O dono viu `em-pe-dia-tesouro-guarda-chuva-gotinhas.png` (t08b) e disse:
> "cabe uma análise de geometria, proporção e sentido para itens como o guarda-chuva em primeira pessoa... do jeito que vi no print, não parece fazer muito sentido querer mostrar ele todo assim".

Viu também `deitado-dia-pipoca-comendo.png`:
> "o braço ficou pequeno, diferente do tamanho nas demais imagens".

E deu uma ideia para o deitado:
> "talvez essa barra de coisas deveria ficar pra cima, junto com a bússola, e manter o personagem centralizado, independente de deitado o celular ou não".

**De onde vem cada número:**
- a conta dos tesouros: `conta-tesouros.mjs`, nesta pasta. Ela atira um raio por ponto da tela, de 4 em 4 px, contra as peças de verdade de cada tesouro. As peças estão na escala 1,15 do boneco, na mão que a conta do ombro dá em cada tela, com o olhar 0,1 rad para baixo, como nas fotos;
- a conta do deitado: `conta-deitado.mjs`, nesta pasta;
- as fotos: `e2e/estudo-tesouros-037.spec.ts`, no ramo `estudo/037-tesouros` (worktree `mb-037-estudo`), com `ESTUDO_TESOUROS=1`;
- as imagens e a prancha: `capturas-037/estudo-tesouros/` (`prancha.png` e `prancha.html`; `notas.json` traz as medidas tiradas no jogo).

**O jogo não mudou.** As opções só existem no ramo do estudo, ligadas por `globalThis.__estudoTesouros`, que o e2e põe na página.

## A resposta curta

1. **Guarda-chuva:**
   - de verdade, ele fica *em cima* da cabeça: o pano começa 1,33 acima da mão e tem 1,17 de raio;
   - de dentro, a mão está 0,42 abaixo dos olhos e 1,5 à frente (em pé), então o pano passa por cima dos olhos;
   - o que cai no quadro é o cabo subindo da mão e a **beira da frente do pano, com as pontinhas, como um telhadinho no alto da tela**;
   - mostrar o guarda-chuva inteiro e pequeno na frente do rosto (hoje, 0,38×) não acontece com ninguém. O dono tem razão.
2. **Varinha:**
   - a de hoje já está no tamanho de verdade (0,54 da mão ao aro) e cabe inteira, subindo da mão;
   - ela cobre 1,2% da tela e não toca a mira nem a interface. É a que faz sentido.
3. **Pipa:**
   - de verdade, ela voa atrás e no alto da criança (1,1 à esquerda, 1,2 acima dos olhos e 1,55 atrás);
   - de dentro, olhando para a frente, ela **não aparece nunca**; do fio, só um quarto entra no quadro;
   - para a criança entender que segura uma pipa, ela tem de estar no céu da frente, ligada à mão pelo fio. É a de hoje.
4. **Celular deitado:**
   - a mão de 24 px (t08b) é pequena porque a interface de hoje ocupa os dois cantos da direita;
   - o braço é rígido e curto (1,6 mão). Com o ombro fora da tela, a mão de 76 px (a do em pé) não chega à esquerda de x = 672 px;
   - **o espaço livre do meio (x 500 a 670) é inalcançável** sem esticar o braço;
   - à direita, a mão e o item só cabem fora da interface se o mapinha e a mochila saírem do canto da direita;
   - por isso, a recomendada é **a barra continuar embaixo e só o mapinha e a mochila irem para a esquerda**. A barra no alto (a ideia do dono) também serve, mas fica 20 a 36 mm mais longe do dedão.

## 1. A geometria de cada tesouro, no tamanho de verdade

**As medidas** (blocos, já na escala 1,15 do boneco):

| Tesouro | Peça | Medida |
|---|---|---|
| Guarda-chuva | cabo | 1,84 de comprimento, raio 0,023 |
| | pano | 8 gomos, raio 1,17, de 1,33 a 1,77 acima da mão |
| Varinha | cabo | 0,41, raio 0,029 |
| | aro | raio 0,115, a 0,54 da mão |
| Pipa | losango | 0,69 × 0,94 |
| | rabo | 4 lacinhos, 1 abaixo da ponta |
| | onde voa | de fora: 1,09 à esquerda, 2,82 acima dos pés (1,2 acima dos olhos) e 1,55 atrás |

**A mão de segurar** vem da conta do ombro aprovada, na câmera de cada tela:
- em pé: 0,42 à direita, 0,42 abaixo e 1,55 à frente, 76 px;
- computador: 0,85, −0,29 e 0,97, 103 px;
- deitado hoje: 24 px. Com a opção A do deitado, 0,93, −0,09 e 0,72, com 76 px.

**O que cada jeito cobre** (de `conta-tesouros.mjs`):
- **faixa de cima**: o quarto de cima da tela;
- **mira**: o meio da tela, 24 px;
- **interface**: os retângulos dos botões, da barra e do mapinha;
- **pontinhas**: as 8 pontas do pano que caem dentro do quadro.

| Jeito | Tela | Cobre da tela | Faixa de cima | Mira | Interface | No quadro |
|---|---|---|---|---|---|---|
| Guarda-chuva hoje (0,38×) | em pé | 3,7% | 0% | livre | 0% | pano inteiro, pequeno, na frente |
| Guarda-chuva de verdade, cabo em pé | em pé | 25,7% | 94% | livre | 6,6% | 2 de 8 pontinhas, cabo inteiro |
| **A**: de verdade, 8° para a frente e 8° para fora | em pé | 25,8% | 85% | livre | 6,3% | 3 de 8 pontinhas, cabo inteiro |
| **B**: de verdade, 32° para fora | em pé | 8,7% | 30% | livre | 4,6% | 1 de 8 pontinhas, 2 de 5 pontos do cabo |
| **A** | computador | 8,3% | 28% | livre | 1,4% | 3 de 8 pontinhas |
| **B** | computador | 7,9% | 24% | livre | 3,1% | 1 de 8 pontinhas |
| **A** | deitado A | 3,3% | 7,6% | livre | 0,7% | 2 de 8 pontinhas |
| Varinha de hoje (de verdade) | em pé / computador / deitado A | 1,2% / 1,2% / 1,8% | 0% / 0% / 1,4% | livre | 0% / 0% / 0,2% | o aro inteiro |
| Pipa de hoje (na frente, a 3,4) | em pé / computador | 2,8% / 1,0% | 6,4% / 2,6% | livre | 0% | a pipa e o fio inteiros |
| Pipa onde voa de fora | todas | 0% | 0% | livre | 0% | a pipa nunca; 0 a 1 de 4 pontos do fio |
| Pipa longe na frente (a 7) | em pé | 0,8% | 3,1% | livre | 0% | uma pipinha de 25 px |

**O que a conta mostra:**
- **Guarda-chuva:**
  - no tamanho de verdade, ele nunca tapa a mira: o pano fica todo acima do horizonte;
  - em pé, ele faz um telhado em 85 a 94% da faixa de cima. É o que se vê debaixo de um guarda-chuva: a beira na frente, com as pontinhas, emoldurando o céu;
  - passa atrás do mapinha e dos botões de cima (6% da tela);
  - no computador e no deitado, com a tela mais larga, é bem menos (3 a 8%).
- **Varinha:** a de hoje é de verdade e cabe toda. Não há o que corrigir na proporção.
- **Pipa:** de verdade, ela fica atrás. Só a pipa de hoje, no céu da frente, deixa a criança ver o que segura.

## 2. Como os jogos em primeira pessoa mostram o que se segura (o princípio)

Sem copiar nenhum jogo, o que se repete nos jogos em primeira pessoa:

1. **O item segurado é desenhado à parte do mundo**, por cima dele, num canto de baixo:
   - não entra na parede;
   - não tapa a mira;
   - a mão segura o item pelo lugar de verdade (a mão no cabo).
2. **O tamanho é o de verdade, mas o enquadramento é escolhido.**
   - O que é grande e fica por cima da cabeça aparece *cortado pela beira da tela*. Um guarda-chuva, um estandarte, uma tocha alta: só a parte que cairia no olho.
   - Nunca se mostra o objeto inteiro em miniatura, porque isso quebra a proporção com a mão. Foi o que o dono estranhou.
3. **O que está longe e preso por um fio** (pipa, balão) continua no mundo, longe:
   - o fio é o que liga o objeto à mão e conta a história;
   - para a pessoa ver o que segura, o objeto voa na frente e no alto, na direção do olhar, e não atrás.
4. **O efeito mostra a função.**
   - Gotas que param na beira do guarda-chuva, bolhas que saem do aro, o fio balançando.
   - É mais claro que mostrar o objeto inteiro.
5. **A interface manda no lugar da mão**, e não o contrário:
   - a mão fica no espaço que os botões deixam;
   - quando a tela muda de forma (deitada), o jogo reorganiza os botões para a mão continuar no mesmo canto e no mesmo tamanho.

## 3. As opções (fotos: `capturas-037/estudo-tesouros/`; a prancha: `prancha.png`)

### Guarda-chuva

**A (recomendada): de verdade, em pé na mão.**
- O cabo sobe da mão e a beira do pano faz um telhadinho no alto da tela, com as pontinhas.
- **O que a criança entende:** "estou debaixo do meu guarda-chuva", como na rua.
- **Proporção:** a de verdade (pano de raio 1,17, 12 mãos de largura); o cabo sai do punho.
- **O que cobre:** em pé, 26% da tela, quase toda a faixa de cima, e passa atrás do mapinha (6%). No computador e no deitado, 3 a 8%. A mira fica livre.
- **Cuidado:** de noite, o lado de baixo do pano é o que se vê. Ele já usa o "avesso claro", mas tem de ser conferido na foto de noite antes de implementar, para não pesar como teto.

**B: de verdade, inclinado para fora**, como quem leva o guarda-chuva de lado.
- **O que a criança entende:** um pedaço do pano no canto de cima, do lado da mão. Lê menos como guarda-chuva.
- **Proporção:** a de verdade.
- **O que cobre:** em pé, 9% da tela (30% da faixa de cima); só 1 das 8 pontinhas entra. A mira fica livre.

**O de hoje (0,38×)** sai: é o guarda-chuva inteiro e pequeno na frente do rosto.

### Varinha de bolhas

**A (recomendada): a de hoje.**
- De verdade, subindo da mão para a frente e para o meio, com o aro inteiro.
- **O que a criança entende:** "estou segurando a minha varinha".
- **Proporção:** a de verdade: o aro tem 1,2 mão de largura, a 2,8 mãos da mão.
- **O que cobre:** 1,2% da tela. A mira e a interface ficam livres.
- **A melhorar depois:** soltar as bolhas do aro de dentro, como de fora. Hoje, de dentro, elas não saem.

**B: em pé, bem no alto**, o aro por cima da mão.
- **O que a criança entende:** o mesmo, com a varinha erguida.
- **O que cobre:** 1,1 a 1,7%. O aro fica mais longe do meio, e a varinha lê menos como algo que ela usa.

### Pipa

**A (recomendada): a de hoje.**
- No céu da frente, presa à mão pelo fio, balançando no vento.
- **O que a criança entende:** "a minha pipa está voando e eu seguro o fio".
- **Proporção:** a pipa de verdade (0,69 × 0,94), a 3,4 blocos. Aparece maior que a de fora, que voa a 2,2 da cabeça, mas atrás.
- **O que cobre:** 1 a 2,8% da tela, longe da mira. Nada da interface.

**B: onde ela voa de fora** (atrás e no alto).
- **O que a criança entende:** um fio que sai da mão e some no alto da tela. Ela só vê a pipa olhando para cima e para trás (há uma foto disso).
- **O que cobre:** 0%. Para uma criança de 3 anos, um fio solto não conta a história.

## 4. O celular deitado

### O tamanho: os mesmos 76 px do em pé, no mesmo celular

| Tela | Mão | Ângulo da visão | Altura da tela |
|---|---|---|---|
| Em pé (aprovado) | 76 px | 8,6° | 9,0% |
| Computador (aprovado) | 103 px | 11,4° | 14,3% |
| Deitado antes (t08) | 59 px | 12,1° | 15,1% |
| Deitado hoje (t08b) | 24 px | 4,9° | 6,2% |
| **Deitado proposto** | **76 px** | 15,5° | 19,5% |

**A régua escolhida: o tamanho na tela do mesmo aparelho, em px CSS.**
- A criança segura o mesmo celular. Virar o celular não muda o tamanho dos dedos dela nem o da mão do boneco no vidro.
- Pelo ângulo da visão, a mão do deitado teria 42 px, pequena de novo, porque o campo do deitado é mais estreito em altura. E as duas telas aprovadas já não têm o mesmo ângulo (8,6° e 11,4°).
- Pela fração da altura, teria 35 px.
- Só a régua do vidro dá a mão que o dono reconhece como a mesma nas imagens.

### O lugar: a conta com a interface de verdade (`conta-deitado.mjs`)

1. **O espaço livre do meio não dá.**
   - O braço é rígido e tem 1,6 mão do ombro à mão. Com o ombro fora da tela, a mão de 76 px fica a no máximo uns 2 diâmetros da beira.
   - Com qualquer jeito de segurar, ela não chega à esquerda de **x = 672 px**.
   - O espaço livre do print (x 500 a 670, y 175 a 310) só se alcança com o braço esticado ou com a ponta do ombro aparecendo, os dois já recusados pelo dono no estudo do braço.
2. **O braço passando atrás da coluna de botões (opção C)** funciona para a mão: em (740, 232), a manga some atrás da coluna.
   - Mas com a interface de hoje **não há nenhum lugar** onde a mão e o item fiquem os dois fora do mapinha e da mochila.
   - Só cabe se o item puder passar atrás da mochila (32 lugares).
3. **O que libera a mão é a coluna da direita, e não a barra.**
   - Com o mapinha e a mochila na esquerda, o canto de baixo à direita fica só com correr e pular, como em pé.
   - A mão de 76 px cabe com o item fora de tudo, com a barra embaixo (opção A) ou no alto (opção B).
   - No jogo, a mão ficou em **(782, 233)** e **(781, 229)**, no mesmo canto e com o mesmo jeito do em pé.

### As opções do deitado (na prancha, ao lado do em pé e do computador)

**A (recomendada): a barra continua embaixo; só o mapinha e a mochila vão para a esquerda.**
- **O lugar de cada coisa:**
  - o mapinha vai para (10 a 104, 58 a 152), embaixo dos botões do alto à esquerda, que vão até 52;
  - a mochila fica do lado dele, em (110 a 158, 104 a 152);
  - o controle de andar continua em (14 a 126, 268 a 380). Sobra um vão de 116 px entre o mapinha e o controle; nada fica apertado.
- A direita fica só com correr e pular, como em pé. A mão e o item ficam no canto de baixo à direita, com os 76 px do em pé, sem nada atrás da interface.
- **A barra não muda:** o dedão continua alcançando os botões de sempre.
- **Muda a tela deitada também de fora**, mas só no lugar do mapinha e da mochila (`deitado-mapinha-na-esquerda-de-fora.png`). O boneco não muda de lugar.
- **Por que A e não B:** as duas deixam a mão igual à do em pé. A mexe só no mapinha e na mochila, que a criança toca pouco. B põe a barra, que ela toca toda hora, 20 a 36 mm mais longe do dedão.

**B: a barra no alto, junto da bússola, e o mapinha e a mochila na esquerda** (a ideia do dono).
- A mão e o item ficam no mesmo lugar e no mesmo tamanho do em pé, sem nada atrás da interface.
- **Muda a tela deitada também na terceira pessoa** (a foto `deitado-A-barra-no-alto-de-fora.png`; os arquivos desta opção se chamam `deitado-A-barra-no-alto-*`).
- **O que mede** (o `notas.json` traz o que o jogo deu):
  - **A barra (530 × 66) e a bússola cabem juntas no alto, sem apertar ninguém:**
    - a barra fica em (157 a 687, 6 a 72), encostada nos botões da esquerda (até 156);
    - a bússola desce para logo abaixo dela (272 a 572, 80 a 108), e a casinha da obra desce junto (390 a 454, 78 a 138);
    - o mapinha vai para a esquerda, embaixo dos botões (10 a 104, 58 a 152), com a mochila do lado (110 a 158, 104 a 152);
    - o alto da tela passa a ter 108 px de interface no meio, 28% da altura (hoje, 38 px no meio e 210 px à direita).
  - **Os botões da barra continuam com 52 × 52 px** (cerca de 9,4 mm no celular), tamanho de dedo de criança.
  - **O polegar alcança menos.** Com o celular deitado seguro pelas duas mãos, o polegar direito fica perto de (800, 350). Do polegar até o meio do botão:

    | Botão | Barra embaixo | Barra no alto |
    |---|---|---|
    | O mais perto (o 9) | 27 mm | 63 mm (+36 mm) |
    | O do meio (o 5) | 69 mm | 89 mm (+20 mm) |
    | O mais longe (o 1) | 111 mm | 125 mm |

    O polegar de uma criança de 3 a 4 anos alcança uns 40 a 50 mm. Na barra de hoje, só os 2 ou 3 últimos ficam ao alcance. No alto, nenhum: ela toca com o indicador, tirando a mão do controle de andar. É o preço desta opção.

**C: a interface de hoje, com o braço passando atrás da coluna de botões.**
- A mão de 76 px fica em (739, 229), com a manga sumindo atrás da coluna.
- **Mas o item passa atrás da mochila**, o mesmo defeito que o revisor apontou (alto 4), agora em tamanho maior.
- Os arquivos desta opção se chamam `deitado-B-braco-atras-dos-botoes-*`.

**A mão no espaço livre do meio.** Não é possível com o braço de verdade (item 1 do lugar). Fica de fora da prancha.

### O personagem centralizado

**Na terceira pessoa**, medido no jogo num lugar aberto (Doce Reino, numa laje), olhando 0,3 rad para baixo. A tabela dá o meio do corpo do boneco na tela, em frações da largura × altura (`centro-<tela>-de-fora.png`, e `centro-*` no `notas.json`):

| Tela | Meio do corpo | Cabeça |
|---|---|---|
| Em pé | **0,37** × 0,56 | 0,36 × 0,50 |
| Deitado | **0,47** × 0,56 | 0,47 × 0,50 |
| Computador | **0,46** × 0,66 | 0,45 × 0,59 |

- **Deitado, o boneco já está no meio da largura** (0,47).
- Quem fica fora do meio é o em pé (0,37). Pelo que mostra a foto, é a câmera de ombro da terceira pessoa (spec 015), que deixa a frente livre.
- A opção A não muda o boneco de lugar (`centro-deitado-de-fora-mapinha-na-esquerda.png`). A B também não, porque só mexe na interface.

**Na primeira pessoa:** a mira do meio e o centro da visão ficam no mesmo lugar, no meio da tela, nas três telas (a câmera olha pelo centro da tela). O que muda entre as telas é só a altura do horizonte (o terço de cima, da T03).

## 5. As medidas tiradas no jogo

**A mão, medida no jogo** (`primeiraPessoa.tela()`, no `notas.json`):

| Opção | Mão | Tamanho | Ombro na câmera |
|---|---|---|---|
| Deitado A, mapinha na esquerda | (782, 233) | 76 px | (1,12; −0,01; 0,49) |
| Deitado B, barra no alto | (781, 229) | 76 px | igual |
| Deitado C, braço atrás dos botões | (739, 229) | 76 px | (1,01; −0,01; 0,49) |
| Em pé (régua) | (332, 559) | 76 px | (0,55; −0,27; 1,32) |
| Computador (régua) | (1088, 513) | 103 px | (1,05; −0,21; 0,75) |

**Para a conta caber no deitado, o ramo do estudo afrouxa duas regras** (só lá):
- o aceno pode sair pela beira de cima;
- o comer (0,7 s) pode passar atrás da interface.

Sem isso, nenhuma mão de 76 px cabe deitada: o aceno sobe a mão acima da beira de cima da tela, que tem só 390 px. Se o dono escolher A ou B, essas duas regras entram junto.

**O que ficou fraco nas fotos do estudo:**
- **De fora, no lugar das fotos da Cidade**, a câmera fica apertada entre a parede e a obra. As medidas do boneco no meio da tela saíram do Doce Reino, num lugar aberto.
- **A pipa B olhando para trás** (`em-pe-pipa-lacinhos-B-olhando-para-tras.png`) mostra só o fio subindo. Com 0,8 rad para cima, a pipa ainda fica fora do quadro, o que confirma a conta: de dentro, ela quase nunca aparece.
- **Os tesouros deitados** foram fotografados com a interface da opção B. A opção A tem o guarda-chuva e a pipa à parte (`deitado-mapinha-na-esquerda-<tesouro>.png`); na mão, os dois ficam iguais.
- **O guarda-chuva A no deitado** quase só mostra o cabo. A mão de 76 px fica na altura dos olhos, e o pano, 1,33 acima, sai do quadro de 70°. É a geometria de verdade.
- **As gotinhas e as bolhas** não saem de dentro em nenhuma opção. Ficam para a implementação, depois da escolha.

## 6. Para depois da escolha do dono: a obra de dentro e os moradores colados (os médios do revisor)

Só propostas, sem fotos novas. A prioridade foram os tesouros e o deitado.

### A obra de dentro, a um ou dois passos

**O que acontece.**
- A planta da obra tem até 5 × 5 × 4 células.
- A um passo de distância, os fantasmas ocupam um cone de uns 110° da visão. Em pé (80° de altura), isso é a tela inteira.
- Cada fantasma desenha um miolo leitoso (alfa 0,38 a 0,68 na camada da vez, 0,32 nas de cima) e 12 barras brancas de 0,07.
- As barras de trás aparecem pelo miolo das da frente: a tela vira uma grade branca.
- De noite, o material não recebe luz (emissivo), então é a coisa mais clara da tela.

**A proposta, só de dentro:**
1. As camadas de cima perdem o miolo e ficam só com o contorno, a 0,25 de alfa.
2. A camada da vez fica com o miolo a 0,18 a 0,3 e o contorno a 0,6.
3. O contorno fica mais fino, de 0,07 para 0,035. A 1,5 bloco, isso dá uns 8 px em pé em vez de 16.
4. De noite, o miolo e o contorno acompanham a luz do lugar (com piso de 0,5), para não serem a coisa mais clara da tela.

**O próximo bloco no celular**, sem texto:
- o fantasma da camada da vez mais perto do meio da tela, e ao alcance, ganha o mesmo bloquinho girando e o contorno aceso que o computador mostra na mira do meio;
- muda quando a criança vira a câmera;
- tocar continua valendo em qualquer fantasma.

### Os moradores colados na câmera

**O que acontece.**
- Os moradores andam na calçada e passam a menos de 0,5 bloco dos olhos.
- De dentro, a cabeça deles (0,83 de largura) a 0,4 dos olhos ocupa uns 92° da visão: mais que a tela inteira em pé.
- Nas fotos, isso deu o cozinheiro cortado ao meio e o rosto escuro e enorme.

**A proposta, só de dentro:**
- a mesma régua dos fantasmas: pela distância dos olhos até a caixa do morador, ele some colado (0,3) e fica inteiro a 1,2, com o alfa do boneco;
- e o morador que vem andando desvia meio passo quando a criança está parada no caminho dele.
