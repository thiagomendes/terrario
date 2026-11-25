# Esboço 037: as duas opções de braço (`?esboco=primeira-pessoa`)

A variante A que o dono escolheu (a mão vazia some e só entra para agir; com item, uma mão só),
agora com o braço na proporção do boneco, em duas opções para comparar. Os botões **1** e **2**
(no alto, à esquerda, só no esboço) trocam a opção; o **olhinho** amarelo entra e sai da primeira
pessoa. Saem de `e2e/esboco-primeira-pessoa.spec.ts` (`ESBOCO_PP=opcoes`, `extras` e `ajuste`).

## As opções

- **1, articulação leve.** O antebraço é o braço do boneco, do tamanho dele (a manga, o punho e a
  mão); a parte de cima é a manga do outro braço, sem esticar e sem o punho. O cotovelo dobra pouco
  (de 17 a 26 graus) e macio: a bolinha do ombro do boneco cobre a junta, sem dobra marcada. O
  cotovelo aparece perto da beira direita e a parte de cima sai da tela. Como dobra, a mão alcança
  mais perto do meio ao colocar e ao comer.
- **2, sem articulação.** Só o braço do boneco, inteiro e do tamanho dele, girando do ombro, que
  fica fora da tela, à direita. A mão fica um pouco mais para a direita.

Nas duas: a mão e a manga têm a mesma proporção do boneco em terceira pessoa (a mesma escala nas
três direções, nada esticado); o braço sai pela beira direita, acima dos botões, sem tapar o
joystick; a mão e o item ficam de pé na tela (o item não deita com o braço); a mola discreta (desce
um tico ao começar a andar, sobe no pulo, afunda e volta ao pousar); no passo, só um sobe e desce
leve, e a câmera também só sobe e desce (o balanço de lado saiu).

## O que ficou da A2

- A mira: o pontinho no meio e o contorno da célula onde o bloco entra. Agora o gomo do contorno
  acompanha a distância (uns 2 px de perto ou de longe), fica fora do brilho da tela (não borra) e,
  de perto, o miolo claro some (não vela meia tela).
- A câmera solta (arrastar para olhar) e a entrada e a saída pela cabeça.
- O braço e o item também ficaram fora do brilho da tela (o halo borrava a beira da mão) e, de
  noite, recebem a mesma luz do boneco (antes ficavam claros de dia no escuro).

## Arquivos

| Arquivo | O que é |
|---|---|
| `prancha.png` | 1 contra 2 em cinco momentos: andando com o bloco, pulando, colocando, acenando, comendo a maçã |
| `opcao-1.webm`, `opcao-2.webm` | O mesmo roteiro nas duas (só a cena): entra pela cabeça com o bloco, anda, pula, olha o chão e põe dois blocos, vira, acena de mão vazia, come a maçã, olha em volta e sai pela cabeça |
| `N-00-parado-com-bloco.png` | Parada, segurando o bloco (N é 1 ou 2) |
| `N-01-andando-com-bloco.png` | Andando com o bloco |
| `N-02-pulando.png` | No ar, logo depois de pular |
| `N-03-mira.png` | Olhando o chão: o contorno onde o bloco vai entrar |
| `N-04-colocando.png` | Logo depois do toque: a mão vai até o lugar e o bloco entrou |
| `N-05-acenando.png` | O aceno de mão vazia (a mão entra, abana e sai) |
| `N-06-comendo.png` | Comendo a maçã |
| `N-07-olhando-em-volta.png` | Girando a câmera solta |
| `ajuste/N-POSE.png` | As poses paradas de cada opção (segurar, colocar, acenar, comer) |
| `extra-olhando-para-baixo.png` | Olhando bem para baixo: a camiseta, o cinto e os sapatos acima do joystick |
| `extra-olhando-para-baixo-meio.png` | No meio do olhar para baixo (só o chão; o braço da frente já saiu) |
| `extra-deitado-N-segurando-bloco.png` | Celular deitado (844×390), segurando o bloco |
| `extra-noite-N-segurando-bloco.png` | De noite, segurando o bloco |
| `andando-quadro-a-quadro.json` | A mão andando, medida quadro a quadro (2 s) |
| `medidas.json` | O que o esboço soma de malhas e triângulos, segurando o bloco |

As duas opções começam no mesmo lugar da Vila Neon, perto do balanço, de dia, no celular em pé
(390×844). Nos dois roteiros os dois blocos entraram exatamente na célula do contorno.

## Medidas

- **Nada treme** (andando com o bloco, 2 s, ~120 quadros): de lado, 0 px na opção 1 e 6 px na 2 (o
  arco do braço girando no ombro); sobe e desce, 21 px e 15 px no todo (o passo mais a mola do
  começo); o maior tranco de um quadro para o outro, 3 px (só o arredondamento).
- **Custo, segurando o bloco** (o braço, o item, a sombra e a mira): opção 1, 12 malhas e ~2,7 mil
  triângulos; opção 2, 10 malhas e ~1,8 mil. No esboço as peças do braço não são fundidas; na
  spec, o braço vira uma malha por material (2 ou 3 chamadas de desenho), como o boneco do jogo. A
  medida na placa fica para a spec.

## O que ficou fraco

- **Colocando:** o impulso da mão é curto (0,45 s) e discreto; na foto aparece mais o bloco que
  entrou do que o gesto. A nuvenzinha branca ao lado da mão é o efeito de pôr bloco do jogo.
- **Olhando bem para baixo:** os sapatos e o cinto sobem para o meio da tela, mas a camiseta ainda
  enche a faixa de baixo, atrás do joystick (o peito do boneco é largo e fica perto dos olhos).
  No meio do caminho só aparece o chão.
- **Deitado:** o braço fica um pouco maior (na mesma proporção) para sair pela beira direita; a mão
  fica logo abaixo do olhinho. Funciona, mas pede ajuste fino na spec.
- **Opção 1 parada:** o cotovelo fica na beira, então a dobra quase não aparece segurando o bloco;
  aparece no aceno, no colocar e no comer.
- Os vídeos são só a cena (o olhinho, os botões e o pontinho aparecem nas fotos).
