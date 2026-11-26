# 038 · Retoques e a moto dourada: o esboço (26 nov 2026)

Ramo `esboco/038-retoques-moto`, código em `src/esboco/retoques.ts` e `retoquesPecas.ts`, ligado só com `?esboco=retoques`. As fotos saem do `e2e/esboco-retoques.spec.ts` na placa (`ESBOCO_038=empe,deitado,pc`). O boneco é o do jogo (`criarBoneco`, com as malhas juntas como no jogo), num gramado ao sul da Vila Neon.

- **Prancha para escolher pelo celular:** `00-prancha.jpg` (a recomendada de cada item tem a borda dourada).
- **Vídeos (computador):** `video-moto-andando.mp4` (a motoquinha e a motoca de pedal andando, de três-quartos e de lado, e a motoquinha de noite) e `video-pes-pedalando.mp4` (a bicicletinha hoje e nova, o carrinho hoje e novo com a lataria clarinha, e a motoca de pedal).
- **Pastas:** `empe/` (390×844: parada e andando, de dia e de noite, de lado, os pés, de perto e de dentro), `deitado/` (844×390) e `computador/` (1280×720), estes dois com andando de dia, parada de noite e de dentro.
- **Medidas:** `medida-pe-pedal.json` (72 amostras numa volta inteira do pedal) e `custo.json` (malhas e triângulos de cada boneco).

## 1. A moto dourada (pedido do filho)
Só enfeite, como os quatro da 036: a mesma velocidade, o mesmo pulo, comprar já monta, as mãos no guidão.

| Versão | Preço proposto | Por quê | Fotos |
|---|---|---|---|
| **Motoquinha dourada (recomendada)** | **140** | A moto de brinquedo que a criança reconhece de longe: tanque gordinho com estrela, farol redondo, guidão alto e escapamento curtinho, baixa e com rodinhas de apoio de criança. Os pés descansam nos apoios (o joelho dobra). Original: nenhum desenho de marca ou modelo. | `empe/moto-motoca-*` |
| Motoca de pedal | 120 | A motoca de três rodas das crianças pequenas, com a frente de moto (carenagem dourada, farol e estrela). A criança pedala de verdade na roda da frente. Fica menor perto do boneco e lê menos como moto. | `empe/moto-triciclo-*` |

**Por que esses preços:** os de andar custam 110 (patinete), 120 (bicicletinha), 140 (carrinho) e 150 (nuvem). A motoquinha é do porte do carrinho (sentada, farol, mais peças), então 140; não passa da nuvem, que é a mágica, e o dourado não vira degrau de luxo. A motoca de pedal é do jeito da bicicletinha (pedal na roda), então 120. A decisão é do dono.

**O dourado:** um amarelo quente e fundo com o ouro escuro nas partes de baixo e o reflexo lustroso do plástico. Nada acende além do farol (a mesma luz mansa do farol do carrinho), nada entra no brilho que borra: de noite o ouro continua claro, sem halo (`empe/moto-motoca-andando-noite.jpg`). Sem arco-íris: ouro, creme e o pneu grafite.

**De frente e de costas:** conferido (o guidão, o farol e as rodinhas de apoio; nada com forma estranha). Os espelhinhos saíram: de frente, as bolinhas deles pareciam dragonas nos ombros.

**De dentro:** `*-dentro-dia.jpg` mostra o guidão, as mãos e o farol vistos dos olhos. Hoje o jogo sai da primeira pessoa quando a criança monta (regra da 037); a foto é só para o dono ver como ficaria.

## 2. A camiseta de aquário (15 moedinhas)
Quem já comprou continua com ela; só o desenho muda (o aquário é uma textura só, desenhada no aparelho).

| Versão | Por quê | Fotos |
|---|---|---|
| Hoje | O peixe laranja de listras brancas na frente do peito pode lembrar um personagem de filme. | `empe/camiseta-hoje-*` |
| **Peixinhos de bolinhas (recomendada)** | O mesmo aquário (água, sol, algas, areia, bolhas); sai o de listras e entra um amarelinho de bolinhas brancas; nenhum peixe tem listra. Muda o mínimo para quem já tem. | `empe/camiseta-bolinhas-*` |
| Cavalinho-marinho | O mesmo aquário com um cavalinho-marinho coral de barriga creme na frente do peito e um cardume de peixinhos redondos. Mais novo, mas o cavalinho pequeno lê menos de longe. | `empe/camiseta-cavalinho-*` |

## 3. O tênis de 20 moedinhas (tênis-cometa)
| Versão | Por quê | Fotos |
|---|---|---|
| Hoje | O cano do violeta ao rosa, a língua amarela, a faixa do ouro ao azul e a cauda amarela e azul: perto de arco-íris. | `empe/tenis-hoje-*` |
| **Violeta e ouro (recomendada)** | O mesmo tênis que a criança comprou, com duas cores só: o cano violeta inteiro e o ouro na faixa de luz (o ouro manso que já existe), na estrela e na cauda. | `empe/tenis-violeta-*` |
| Azul-noite e prata | O cometa numa noite: o cano azul-noite, a estrela e a cauda de prata e a faixa de luz creme. | `empe/tenis-noite-*` |

As pegadas de luz do tênis (hoje ouro e azul) iriam junto, nas cores da versão escolhida.

## 4. Os pés no pedal
**O que acontecia:** a perna do boneco é uma peça só, do quadril ao sapato. Apontar a perna para o pedal (como foi feito com o braço no guidão) não basta: numa volta do pedal a distância do quadril até ele muda o dobro do raio da pedivela, e a perna não estica. Na bicicletinha de hoje o pé fica de 0,09 a 0,43 bloco longe do pedal; no carrinho não há pedal, e os sapatos saem por cima do capô.

**O conserto do esboço:**
- **o joelho:** a canela e o sapato passam para um nó dentro da perna, no joelho, e a caixa da perna vira duas que se cruzam (esticada, é a mesma perna de antes). A cada quadro a perna e o joelho apontam para o alto do pedal, numa conta exata. Só os brinquedos com pedal ou apoio levam o joelho;
- **a bicicletinha** mede o que o pé alcança: o selim um tico mais baixo, o eixo do pedal mais alto e mais perto, a pedivela mais curta e o pedal redondo (fica igual em qualquer ponto da volta). As cores e os detalhes são os mesmos;
- **o carrinho** ganha os pedais de verdade embaixo do painel (o capô um tico mais curto e o volante um tico mais alto). Os joelhos dobram para cima e os sapatos ficam dentro, sem sair pelo capô.

**A medida pé–pedal** (a sola até o alto do pedal, 72 amostras numa volta inteira, a criança andando):

| | Pé esquerdo (mín. / máx. / média) | Pé direito |
|---|---|---|
| Bicicletinha hoje | 0,087 / 0,430 / 0,277 bloco | 0,087 / 0,430 / 0,277 bloco |
| Bicicletinha nova | 0,0000 / 0,0000 / 0,0000 (menos de 0,1 mm) | igual |
| Carrinho novo | 0,0000 / 0,0000 / 0,0000 | igual |
| Motoca de pedal | 0,0000 / 0,0000 / 0,0000 | igual |
| Carrinho hoje | sem pedal (o pé fica no capô) | |

Fotos: `empe/pedal-bici-hoje-pes-dia.jpg` e `empe/pedal-bici-pes-dia.jpg` (de lado), `empe/pedal-carrinho-hoje-andando-dia.jpg` e `empe/pedal-carrinho-andando-dia.jpg` (de três-quartos), `empe/pedal-carrinho-pes-dia.jpg` (de lado, com a lataria clarinha), e o vídeo.

## O custo (`custo.json`, malhas acesas = chamadas de desenho do boneco)
- A pé: 11 malhas, 11,2 mil triângulos.
- O joelho: +2 malhas (+0,4 mil triângulos), só com brinquedo de pedal ou apoio vestido.
- Motoquinha: 8 malhas do brinquedo e 16,8 mil triângulos; motoca de pedal: 8 malhas e 13 mil. **Passa da régua da 036** (uns 5 por boneco): na spec, o brinquedo inteiro num brilho só por nó (o ouro lustroso para tudo) e menos gomos nas rodas.
- Bicicletinha nova: 6 malhas do brinquedo (hoje 5) e 15,6 mil triângulos (hoje 9,5 mil); carrinho novo: 5 (hoje 4).
- Tênis: violeta e ouro tem 4 malhas a menos que o de hoje (a faixa e a estrela na mesma luz).

## O que ficou fraco
- A motoca de pedal fica pequena perto do boneco e lê menos como moto.
- Os pés no carrinho quase não aparecem: ficam embaixo do painel, como num carrinho de verdade. A foto de lado com a lataria clarinha é só para provar.
- De dentro, com a criança a pé, a camiseta e o tênis quase não aparecem (só a gola e a ponta do tênis), como no jogo.
- A coxa é curta (o boneco tem perna curta): na bicicletinha, de lado, o joelho fica escondido debaixo da camisa.
- A camiseta do cavalinho: o cavalinho é pequeno de longe.
