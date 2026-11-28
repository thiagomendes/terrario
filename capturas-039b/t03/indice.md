# 039b · T03: o desenho da parte 2 (o fogão, a geladeira, a mesa, a TV e o som)

Fotos do spec `e2e/capturas-039b-t03.spec.ts` (`FOTOS_039B_T03=empe|deitado|pc|prancha`), na
placa de vídeo. Celular em pé 390×844 (`empe/`), deitado 844×390 (`deitado/`) e computador
1280×720 (`computador/`). A prancha: `00-prancha.jpg`.

A casa da parte 1 ao sul da Vila Neon, agora com os treze móveis: na sala, a TV de frente para o
sofá e o som; no meio, a cozinha (o fogão, a pia e a geladeira) e a mesa com quatro cadeiras; o
quarto como era. Sem o teto nas fotos de fora (como uma casa de bonecas); com o teto, de dentro,
na primeira pessoa. O que está ligado vem do núcleo (`moveisLigados`, pelo toque da T04); nas fotos,
cada estado é mostrado pelo `forcarLigados` do desenho.

| Foto | O que mostra |
|---|---|
| `casa-dia`, `casa-noite` | a casa com os treze móveis; de noite, com tudo ligado |
| `sala-dia`, `sala-noite`, `cozinha-dia`, `cozinha-noite` | os cômodos, de fora |
| `tv-0-desligada` … `tv-4-desenho-3`, `tv-5-desligou` | a TV: desligada, os quatro desenhos (a joaninha, o barquinho, o trenzinho e as ovelhinhas) e o quinto toque, que desliga |
| `geladeira-0-fechada`, `-1-abrindo`, `-2-aberta`, `-3-aberta-de-lado` | a porta abrindo, com a luz de dentro, as prateleiras e a comidinha |
| `fogao-0-desligado`, `-1-cozinhando`, `-2-cozinhando` | o anel laranja manso nas bocas e o vapor de cubinhos |
| `som-0-parado`, `-1-tocando`, `-2-tocando` | os cones pulando, a luzinha e as notinhas subindo |
| `mesa-0-sentada`, `mesa-1-prato` | a criança à mesa e os pratinhos com a comida (o evento `prato`, 2 que comem) |
| `sala-dentro-*`, `cozinha-dentro-*` | de dentro, de dia e de noite, com a TV, o fogão e a geladeira ligados |
| `vitrine-*` e `vitrine-*-costas` (deitado e computador) | os cinco nas quatro direções, de frente e de costas |
| `barra-e-mao` | os cinco ícones na barra e a TV na mão |
| `custo-parado.json`, `custo-ligados.json` | os pedaços, as malhas e os triângulos dos móveis (o ligado também acende o abajur e a lua: +2 malhas de luz que não são da parte 2) |
