# 036 T02: o Unicórnio-pônei consertado (antes e depois)

Jogo de verdade (não o esboço), num gramado aplainado ao sul do bairro da Vila Neon, mundo
criativo. Celular em pé (390×844, tela 2×); o vídeo no computador (1280×720). Feito com
`e2e/capturas-036.spec.ts` (`CAPTURAS_036=t02`, `T02_FASE=antes|depois`).

As pastas `antes/` e `depois/` têm as mesmas fotos:

| Foto | O que mostra |
|---|---|
| `parado-dia.jpg`, `parado-noite.jpg` | a criança parada e o unicórnio do lado (câmera de três-quartos) |
| `perto-dia.jpg`, `perto-noite.jpg` | o unicórnio de perto: a borda do corpo e o brilho do chifre |
| `trotando-dia.jpg`, `trotando-noite.jpg` | a criança andando e ele trotando atrás (câmera do jogo) |
| `pulando-dia.jpg`, `pulando-noite.jpg` | os dois pulando juntos |
| `voando-dia.jpg`, `voando2-*.jpg` | a criança voando de lado, uns 10 blocos acima do chão (câmera do jogo) |
| `voando-perto-*.jpg` | só em `depois/`: parada no ar, o unicórnio voando do lado dela |
| `voando.webm` | o vídeo: trota, sobe voando, vai de lado e volta, desce e pousa |
| `tremor.json` | a medida do tremor voando, quadro a quadro, por 3 s |

## As três queixas, a causa e o conserto

- **A borda estranha.** Duas causas juntas:
  - o unicórnio ficava no mapa do brilho da cena (o `GlowLayer`), que pinta o piso de luz do
    plástico por toda a silhueta e borra. De noite isso vira um halo branco em volta do corpo
    inteiro (`antes/perto-noite.jpg`);
  - por cima, o contorno claro (`renderOutline`) fazia a linha branca da borda
    (`antes/perto-dia.jpg`).

  As malhas do bicho agora levam o nome do boneco (`personagem-`), que a cena deixa fora do
  brilho, como a criança e os amigos, e o contorno saiu. O pinguim usa a mesma montagem e
  ganhou o mesmo conserto.
- **O brilho forte.**
  - O chifre ia de 1,45 a 1,75 de luz, acima do limiar do bloom (1,0), e ainda entrava no
    brilho da cena: virava uma chama borrada. Agora fica entre 0,74 e 0,86, respirando devagar.
  - Os brilhinhos e os coraçõezinhos também saíram do mapa do brilho (cada um virava uma
    mancha branca).
  - O unicórnio solta menos: um brilhinho a cada 0,3 a 0,4 s trotando (antes 0,12 a 0,2 s),
    menores, e 4 corações em vez de 5.
- **O tremor ao voar.**
  - Com a criança voando a mais de uns 7 blocos do chão, a procura do chão debaixo dele não
    achava nada e devolvia a própria altura procurada. Ele via um "degrau" meio bloco acima a
    cada quadro, pulava e pousava nele, subindo aos trancos até passar 8 blocos de diferença.
    Aí era jogado de volta para perto num puf de brilho, e recomeçava.
  - Voando mais depressa do que ele trota (11 e 20 blocos por segundo contra 6,5), ficava para
    trás e reaparecia num puf a cada um ou dois segundos.
  - Agora, com a criança no alto, ele voa junto: segue o lugar dele (atrás e do lado) numa mola
    crítica, com a conta exata (não passa do ponto, não depende do tamanho do quadro). O lugar
    vai adiantado pela velocidade da criança, então ele não fica para trás. No ar, as patas da
    frente dobram e as de trás esticam, num galope lento. Ao descer, plana até o chão pela mesma
    mola.
  - Sem chão achado, o bicho do chão (o pinguim) espera embaixo em vez de pular.
  - A medida, 3 s voando de lado:

    | | antes | depois |
    |---|---|---|
    | saltos (mais de 1 bloco num quadro) | 8 e 11 | 0 e 0 |
    | maior passo num quadro | 8,1 blocos | 0,56 bloco |

## O que ficou fraco
- A foto `trotando` pega o unicórnio cortado na beira (a câmera do jogo vira com a criança). O
  vídeo mostra melhor.
- O vídeo sai em `.webm` (não há `ffmpeg` no computador para o `.mp4`).
