# Esboço 037: a primeira pessoa (`?esboco=primeira-pessoa`)

> O esboço de hoje é o final, a recomendação do estudo do braço: está em `final/`. As rodadas
> antigas ficam como registro: as duas opções de braço em `opcoes/` e, nesta página, a primeira
> rodada (as variantes A, B e C). Os botões A, B, C, 1 e 2 já saíram do esboço, e o e2e de hoje
> não refaz estas fotos.

Celular em pé 390×844, de dia, na Vila Neon, e uma foto deitado 844×390. Saem de
`e2e/esboco-primeira-pessoa.spec.ts` (`ESBOCO_PP=tudo`). O estudo que guiou o esboço está em
`.sdd/specs/037-construir-melhor/referencia/estudo-primeira-pessoa.md`.

Como jogar: abrir o jogo com `?esboco=primeira-pessoa`. O **olhinho** amarelo na beira direita
entra e sai da primeira pessoa; os botões **A B C** (só no esboço) trocam a variante.

## As variantes

- **A: mão só para agir.** Mão vazia não aparece; entra para tocar, colocar, acenar e comer, e sai.
  Com bloco ou item, a mão aparece segurando, baixa e de lado. Olhando para baixo, o corpo.
- **B: igual à A, mais a mão vazia relaxada.** Andando de mão vazia, a mão aparece baixinha na
  beira de baixo, balançando no passo; parada, some.
- **C: as duas mãos.** O bloco vem seguro com as duas mãos, embaixo e mais perto do meio (como uma
  criança segura um brinquedo); para colocar, as duas empurram juntas. Item que não é bloco (a
  maçã) fica numa mão só.

Em todas: a câmera entra e sai pela cabeça deslizando (0,7 s), o balanço pequeno do passo, a
câmera que abaixa um pouco ao pousar de um pulo, a sombra no chão e, ao trocar de item, a mão
desce e sobe com o novo.

## Arquivos

| Arquivo | O que é |
|---|---|
| `prancha.png` | As três variantes lado a lado, nos seis momentos principais |
| `variante-A.webm`, `variante-B.webm`, `variante-C.webm` | O vídeo de cada variante (só a cena, sem os botões): entra pela cabeça, anda de mão vazia, olha para baixo, acena, pega o bloco, anda com ele, coloca dois blocos, troca para o tijolo e para a maçã, come, pula, gira a câmera e sai pela cabeça |
| `X-01-entrando.png` | No meio da entrada pela cabeça |
| `X-02-dentro-mao-vazia.png` | Dentro, parada, de mão vazia |
| `X-03-andando-mao-vazia.png` | Andando de mão vazia (na B, a mão relaxada) |
| `X-04-olhando-para-baixo.png` | Olhando para baixo: a roupa e os pés |
| `X-05-acenando.png` | O aceno (a mão entra, abana e sai) |
| `X-06-segurando-bloco.png` | Parada, segurando o bloco de tábuas |
| `X-07-andando-com-bloco.png` | Andando com o bloco |
| `X-08-colocando.png` | No meio do colocar (a mão vai até o lugar) |
| `X-09-trocando.png` | No meio da troca (a mão desceu) |
| `X-10-segurando-maca.png` | Segurando a maçã |
| `X-11-comendo.png` | Comendo a maçã |
| `X-12-saindo.png` | No meio da saída pela cabeça |
| `deitado-A-segurando-bloco.png`, `deitado-A-olhando-para-baixo.png` | Celular deitado, variante A |
| `medidas.json` | O que o esboço soma de malhas e triângulos (segurando o bloco) |

(X é A, B ou C.) As três variantes começam no mesmo lugar da Vila Neon, perto do balanço.

## Custo (segurando o bloco)

- A e B: 10 malhas a mais (o braço da frente sem fundir, a mão, o item e a sombra), ~1,8 mil
  triângulos. C: 14 malhas, ~3,6 mil triângulos (os dois braços).
- No esboço o braço da frente não é fundido (a mão precisa de junta própria para a manga esticar
  sem esticar a mão). Na spec, as peças da manga e da mão viram uma malha por material (2 ou 3
  chamadas de desenho), como no boneco do jogo.
- Medido na placa só de passagem (o FPS da foto, 45 a 60 no celular em pé simulado); a medida
  de verdade fica para a spec.

## O que ficou fraco

- **Olhando para baixo:** aparecem a roupa (azul) e os sapatos, mas atrás do joystick e dos
  botões, na faixa de baixo da tela. Dá para ver "sou eu", mas pouco. A fantasia e o brinquedo
  de andar não foram fotografados (o boneco de teste está de roupa comum).
- **Colocando:** o impulso da mão até o lugar dura 0,45 s e a foto não pega o meio dele (a mão
  aparece quase onde segura); no vídeo se vê melhor, mas ainda é curto e discreto.
- Os blocos que a variante A põe ficam no mundo: na B e na C eles aparecem grandes na frente
  ("Colocando" e "Comendo").
- **Acenando:** a manga esticada aparece comprida, como um tubo, quando a mão sobe.
- **Deitado:** a mão fica perto do meio, logo acima da barra de itens; funciona, mas pede ajuste
  fino na spec.
- Os vídeos são só a cena (o olhinho e os botões A B C não aparecem neles; aparecem nas fotos).
- A sombra no chão aparece pouco nas fotos (o próprio corpo a tapa olhando para baixo).
