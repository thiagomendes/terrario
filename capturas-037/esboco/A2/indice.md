# Esboço 037: a variante A refinada (A2)

A variante A, que o dono escolheu em 24 nov, com os acertos que ele pediu. Celular em pé 390×844,
de dia, na Vila Neon. Sai de `e2e/esboco-primeira-pessoa.spec.ts` (`ESBOCO_PP=a2`).

## O que mudou da A

- **Braço menor e mais baixo:** a mão com o bloco fica perto da beira de baixo, à direita, logo
  acima do botão de pular, sem tapar o joystick nem os botões.
- **Braço com cotovelo:** são dois ossos, o antebraço com a mão do boneco e a parte de cima com a
  manga dele. O ombro fica parado fora da tela; a mão vai para cada pose (segurar, colocar,
  acenar, comer) e o cotovelo dobra sozinho. Nada estica nem sobe reto como uma tábua.
- **Sem balanço de lado.** No passo há só um sobe e desce bem leve. O braço tem mola: desce um
  tico ao começar a andar, sobe um tico no pulo, afunda e volta ao pousar.
- **Uma mão só:** os botões A, B e C saíram do esboço.
- **A mira de colocar:** um pontinho branco no meio da tela e, com bloco na mão, um contorno claro
  de gomos finos na célula onde o bloco vai entrar, que respira devagar. A conta é a mesma do
  toque (`preverToque`). Na célula onde a própria criança está, onde o bloco não pode entrar, o
  contorno não aparece.
- **A câmera solta, de dentro:** arrastar para os lados, para cima e para baixo funciona como na
  terceira pessoa, e a câmera continua entrando e saindo pela cabeça.

## Conferido na gravação

- Câmera solta (pitch, yaw): começou em (0,25; 0,6); arrastando para a direita foi a (0,25;
  1,22); para cima, (−0,15; 0,6); para baixo, (0,65; 0,6).
- Mira: em 2 toques no meio da tela, o bloco entrou exatamente na célula do contorno, ([59,76,256]
  e [59,76,255]). No terceiro, a célula era a da própria criança: o contorno não apareceu e nada
  entrou.

## Arquivos

| Arquivo | O que é |
|---|---|
| `variante-A2.webm` | Entra pela cabeça, arrasta para olhar (lados, cima, baixo), anda de mão vazia, acena, pega o bloco, anda, pula, mira e põe dois blocos, troca para a maçã, come, gira e sai pela cabeça |
| `A2-01-olhando-para-cima.png` | A câmera solta, de dentro, olhando para cima |
| `A2-02-olhando-para-baixo.png` | Olhando para baixo |
| `A2-03-acenando.png` | O aceno: a mão sobe com o cotovelo dobrado para fora |
| `A2-04-segurando-bloco.png` | Segurando o bloco, com o contorno da mira e o pontinho |
| `A2-05-mira-antes-do-toque.png` | Olhando para o chão da frente: o contorno onde o bloco vai entrar |
| `A2-06-colocando.png` | Logo depois do toque: o bloco entrou no contorno |

## O que ficou fraco

- A parte de cima do braço ainda aparece comprida na beira direita quando a mão sobe (aceno).
- O contorno da mira, bem perto, fica grande e um pouco borrado pelo desfoque da tela.
- Olhando para baixo continua como antes: a roupa e os sapatos atrás do joystick.
- Os vídeos não mostram o olhinho nem o pontinho (só a cena); as fotos mostram.
