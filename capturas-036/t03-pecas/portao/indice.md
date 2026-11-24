# 036, portão visual: os acertos das peças

Pedidos do revisor (só com as fotos). Celular em pé (390x844), Vila Neon, de dia e de noite, de
três-quartos, de frente e de costas. `antes/` e `depois/` com os mesmos nomes e os mesmos ângulos.
As fotos de `antes/` são as da rodada anterior de cada peça (o mesmo desenho do a12e065).
`1a-volta/`: o guarda-chuva da primeira volta do portão (36d57e6), com o pano todo de lado.

| Peça | Fotos | O que mudou |
|---|---|---|
| guarda-chuva (grave) | `guardachuva-*` | A mão levanta ao lado da cabeça, um pouco acima do ombro, um tico para a frente, e o cabo sai dela pela beira de fora do punho. O cabo tomba para dentro o quanto a cabeça deixa: o perfil da cabeça com o cabelo (a largura em cada altura) diz até onde ele vai sem encostar, do punho até o alto do cabelo; daí para cima segue reto, na mesma inclinação, e o pano tomba junto. Nas cabeças de cabelo curto, uns 11 graus, e o centro do pano fica a uns 0,3 do eixo da cabeça (na 1ª volta, 0,6); nos cabelos compridos dos lados e no volumoso, menos. O pano ficou maior (raio 0,82 para 1,02) e o cabo mais comprido; o lado de baixo do pano tem a luz de cima (na cor do pano, sem o cinza-escuro); o punho ficou menor, rente à mão. |
| boné de hélice | `bone-*` | Copa em bloco, justa por cima da tampa de cabelo (para acima das sobrancelhas), com cantos redondos e um domo baixo em cima; aba curta, larga e grossa, colada na beira da frente e um tico para baixo; a estrela azul na testa da copa. O topete sai debaixo do boné e o coque e os cachos do alto se ajeitam como debaixo dos chapéus do jogo. |
| pijama de nuvem | `pijama-*` | Saiu a nuvenzinha das pernas: espremida entre o calção e a barra, de frente e à noite, lia como um retângulo cinza na canela. |
| mochila-foguete (detalhe) | `foguete-*` | Duas escotilhas pequenas, uma em cima da outra e de tamanhos diferentes, sem o brilho no meio (a janelinha redonda lia como um olho). |
| asas de borboleta (detalhe) | `borboleta-*` | As bolinhas só no lado de trás das asas: de frente, ao lado do corpo, elas pareciam soltas. |

`figuras/`: os cartões da lojinha (todos os tesouros novos, cada um na aba dele) e a vitrine,
antes e depois.

## Provas em teste

- `tests/render/guardaChuvaCabeca.test.ts`: o boneco de verdade, parado, andando e correndo, nos 9
  penteados dos dois corpos:
  - nenhuma parte do guarda-chuva fica dentro do contorno da cabeça (com o cabelo) visto de frente
    e de costas, na altura e no fundo em que está (o que passa atrás ou na frente dela, a até um
    palmo, conta), com 3 cm de folga; a menor folga medida: 3,7 cm;
  - o pano cobre o meio da cabeça;
  - nas cabeças de até 0,40 de meia largura (6 dos 9 penteados), o centro do pano fica a menos de
    0,36 do eixo da cabeça, de frente (medido: 0,31 a 0,33).
- `tests/personagem/boneCabelo.test.ts`: com o boné, o cabelo de cima fica todo dentro da copa nos
  9 penteados dos dois corpos (o rabo de cavalo sai por trás, como num boné de verdade).

## O limite do guarda-chuva

O pedido era o centro do pano a menos de 0,15 do eixo da cabeça. Com um cabo reto que sai da mão,
isso não cabe sem o cabo entrar na cabeça: o braço do boneco alcança só uns 0,53 para o lado, a
cabeça com o cabelo tem 0,37 de meia largura (até 0,50 no cabelo volumoso) e o alto do cabelo fica
uns 0,7 acima da mão. Até ali, o cabo pode tombar uns 11 graus; para o centro chegar a 0,15, o cabo
teria de ter uns 2,2 de comprimento, mais que o boneco inteiro.
