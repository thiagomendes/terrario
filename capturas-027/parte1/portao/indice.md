# Portão visual da parte 1 (T24, 22 nov 2026)

Todas as fotos foram tiradas na placa de vídeo (`scripts/e2e-gpu.sh`), no mundo de verdade (semente 1337), depois dos acabamentos, da T22 e da rodada de refazer desta tarefa. Entardecer é a hora 0,7 (o "dia" da festa) e noite é a hora 0,85 ou 0,86. As telas são `pc` (1280×720), `deitado` (844×390) e `empe` (390×844).

## lugares/

`noite-fantasias-fotos.spec.ts`, com `FOTOS_027=1 FOTOS_PASTA=capturas-027/parte1/portao/lugares`.

- `<lugar>-<entardecer|noite>-<pc|deitado|empe>.jpg`: praça (`praca`), barracas, rua das casinhas tortas (`rua`), Casa da Vovó (`vovo`), Loja de Fantasias (`loja`), bosque das lanternas (`bosque`), castelinho (`castelo`), horta e gramado da festa (`gramado`, vazio até a parte 3).
- `alto-<norte|leste|sul|oeste>-pc.jpg`: do alto do meio da vila, com a visão 8, olhando para fora (nenhum bioma de outro mundo); `alto-mapa-pc.jpg`: o mapa visto de cima.
- `noite-<tela>.json`: a conta da noite de cada foto (a mediana da luz do chão e o quadrado mais escuro).

## moradores/

`moradores-027.spec.ts` (`MORADORES_027=1`): os 12 moradores de posto, cada um no seu lugar, de frente e de lado, no entardecer e de noite. A Vovó Zuleica, o Conde Dudu, a Lulu, o Bento, o Seu Jerônimo, a Tia Filó, o Seu Olavo e os cinco vizinhos da rua (`vizinha-gatinho` é a Celeste, `vizinho-morceguinho` é o Nestor). `medidas.json`: a conta da calça do Dudu de noite.

## longe-festa/

`outros-mundos-027.spec.ts` (`OUTROS_027=1 OUTROS_SO=noite-das-fantasias`), de dia (0,42): um morador e um bicho da festa **a 22 blocos**, já com o desenho de longe da T22 (`outros.json` confirma a troca em cada foto):

- `*-longe-lente.jpg`: com a lente fechada, de 12 blocos acima, o bicho ou o morador enche a foto (onde a diferença dos gomos apareceria);
- `*-longe-jogo.jpg`: com a lente do jogo, de 6 blocos acima, como a criança vê;
- `*-perto.jpg`: a 4 blocos.

## bichos/

`bichos-027.spec.ts` (`BICHOS_027=1`): a fila dos cinco bichos parados e cada um de perto (`cervo` é a abóbora saltitante, `coelho` o morceguinho, `raposa` o sapinho, `peixe` o peixinho lilás, `espectro` a fantasminha de lençol), no entardecer e de noite; `morceguinho-15-blocos-noite-pc.jpg` (a silhueta no céu); o Tufinho no banquinho da varanda da Vovó e a corujinha no poleiro do bosque. A rodada não mexeu neles: são as da primeira passada.

## missoes/

`noite-fantasias.spec.ts -g T19`, na tela do computador, no entardecer e de noite (`t19-<missão>-<momento>-<hora>.jpg`):

- n1 doces ou travessuras: a porta abrindo, a sacola na mão, com 1 e 2 docinhos, comendo da sacola, a travessura;
- n2 as lanternas do bosque;
- n3 a Lulu: escondida (vista da praça e do palco), espiando e achada;
- n4 a horta: o broto, crescendo, a abóbora pronta, a mesa das carinhas, o lampião na porta da Vovó;
- n5 o Tufinho: as patinhas, na horta, seguindo a criança e em casa.
- `t19-desenhos-28px.png`: os desenhos das cinco missões (o principal, o selo, o resultado e a placa), grandes e a 28 px, o tamanho do quadro (`arte-vila-fotos.spec.ts`, `ARTE_FOTOS=1 ARTE_PASTA=capturas-027/parte1/portao/missoes`).
- `t20-empe-*.jpg`: no celular em pé (390 × 844), com a interface, no T20 de ponta a ponta (`-g "ponta.*empe"`): a sacola com o "+1" (`n1-sacola-mais-um`), a lanterna da n2, a Lulu achada e o Tufinho seguindo com o selinho.

A rodada do revisor visual (22 nov, à noite) refez com o mesmo nome as fotos do que mudou: o Nestor, a confeiteira, o lanterneiro, o Bento, o Seu Olavo, a Celeste e a Lulu (`moradores/`); o sapinho e os bichos (`bichos/`); a praça, as barracas e o castelinho (`lugares/`); o comer; as missões do T19; o cartão. O antes de cada uma está no commit 072d7a9.

## fantasias-crianca/

`fantasias-027.spec.ts` (`FANTASIAS_027=1`): as quatro fantasias da criança (Bruxinha com a varinha, Vampirinho, Fantasminha e Monstrinho Peludo), na menina e no menino, a fila inteira e cada par de frente e de lado, no entardecer e de noite.

## comer/ e comer-noite/

`comer-027.spec.ts -g as.fotos` (`COMER_027=1`, e `COMER_HORA=noite` para a pasta da noite): cada comida da festa (brigadeiro, beijinho, cajuzinho, surpresa de uva, chocolate quente, poção de uva e a uva) nas três mordidas (`-1`, `-2`, `-3`), de frente e de lado, sem fantasia, com o chapéu de bruxa e com o capuz da fantasminha.

## varinha/

`varinha-027.spec.ts` (`VARINHA_027=1`), duas amigas na nuvem: a Ana de bruxinha toca no chão, a flor nascendo e a flor aberta, e a mesma flor vista pela tela da Bia, no entardecer e de noite.

## outros-mundos/

A T22 mexeu em código de todos os mundos. Pares lado a lado, `main` (antes, eab8b8b) à esquerda e o ramo da 027 à direita, no mesmo mundo (semente 1337), de dia:

- `<mundo>-bicho-*.jpg` e `<mundo>-morador-*.jpg` para a Vila Neon, a Cidade Grande, o Rancho Alegre, o Doce Reino e a Exploração Lunar: o bicho (o cervo de cada tema, invocado perto do morador) e o morador mais perto, a 22 blocos com a lente fechada (`longe-lente`) e com a lente do jogo (`longe-jogo`), e a 4 blocos (`perto`). O bicho anda e vira: o enquadramento é o mesmo em relação a ele, a pose muda.
- `lampiao-rancho-<dia|noite>-pc.jpg`: três lampiões postos no Rancho. Na `main` o lampião era o bloco aceso; no ramo é a abóbora arredondada com a carinha (T06 e T22).

## cartao/

`noite-das-fantasias.jpg`: a prévia do cartão do mundo (`public/temas/`), refeita nesta rodada com a criança de bruxinha e uma abóbora saltitante ao lado.

## antes-da-rodada/

As fotos do que a autocrítica achou, antes do conserto, para comparar:

- `fantasminha-capuz-pontudo-lado-noite-pc.jpg`: o capuz branco pontudo da fantasminha;
- `vizinha-gatinho-mascarada-frente-noite-pc.jpg`: a vizinha de gatinha de grafite e máscara de pontinhas;
- `n4-carinhas-com-dica-de-comprar-noite.jpg`: o "Toque para comprar" da uva na mesa das carinhas da n4;
- `barracas-noite-empe-camera-na-abobora.jpg`: a foto das barracas em pé, com a câmera dentro da abóbora gigante;
- `castelo-noite-pc-torre-torta.jpg`: a torre do castelinho, de perto e de baixo, parecendo torta;
- `cartao-sem-fantasia.jpg`: o cartão de antes, com a criança de roupa comum.
