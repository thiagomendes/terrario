---
id: 032-comprar-e-comer
title: 'Comprar e comer: a barraca entrega na mão e a criança come de verdade, em três mordidas'
status: APPROVED
base_branch: main
branch: feat/032-comprar-e-comer
created_at: 2026-11-18T12:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
- name: build
  command: npm run build
  blocking: true
full_test_command: npx vitest run && scripts/e2e-gpu.sh
---
## Contexto
O dono, em 16 nov 2026, pediu "trocas realistas em vez de troca de inventário estilo Minecraft": tocar na barraca tem de ser **comprar** um cachorro-quente ou uma pipoca, e a coisa vai para a mão e para a barrinha de baixo. Pediu também a ação de **comer**, inclusive no criativo. Tudo com capricho: vivo e de verdade, nada com cara de Minecraft.

A 026 deixou escrito (decisões de 17 nov, parte 2B, item 8): "comprar e comer de verdade fica para a spec seguinte". É esta.

## O que existe hoje (18 nov 2026, `VERSAO_REDE` 15)
**Comida na Vila Neon** (só deste mundo, sem roça):
| Onde | Quem | Hoje |
| --- | --- | --- |
| Barraca do lanche do festival (balcão com pipocas, dois cachorros-quentes e o copo de suco) | Bia, a moça do lanche (`vila:3`, cozinheira) | nada se toca no balcão; tocar na Bia abre a **janela de trocas** com pipoca ×2, cachorro-quente e suco "de graça" (`trocas.ts`, `planta: 'bairro'`) |
| Lanchonete Dois Canudos (balcão, liquidificador, vitaminas) | Tati, a moça da lanchonete (`vila:6`) | "Toque para pedir": o liquidificador, a Tati acena e a vitamina vai **direto para a mochila** (até duas) |
| Carrinho de pipoca do parque | Seu Chico, o pipoqueiro (`vila:63`) | o toque faz a pipoca estourar e ele acena; **nada vem para a mão** |
| Algodão-doce do parque | (o Seu Chico, ao lado) | a cuba gira e a nuvem cresce; **não existe o item** algodão-doce |
| Carrinho de pipoca da pracinha (ao lado de onde a criança nasce) | ninguém | é só cenário |
| Mesinhas da calçada (copos de enfeite) | — | cenário |

**Comer, em todos os mundos:**
- Só na **sobrevivência** (`nucleo.ts`, `comer`: `if (modo !== 'sobrevivencia') return`). No criativo a comida na mão não faz nada.
- No toque, **segurar o dedo** 1,1 s mastiga e come (`comecarAComer`); tocar também come, mas sem animação nenhuma antes do "nhac". De barriga cheia: "Você está sem fome" e nada acontece.
- A animação `comer` (`animacao.ts`, 1,1 s) leva o braço à boca e mastiga; **a comida na mão continua inteira**, e some de uma vez quando o núcleo tira da mochila. Sem migalha, sem carinha feliz, sem som por comida.
- Os amigos veem o braço subir (`acoes[2]`), mas não sabem o que foi comido.
- A dica é o texto perto da mira "Segure o dedo na tela para comer", que uma criança de 3 anos não lê.
- O que é comida hoje: maçã, frutinhas, carne, peixe, sopinha, torta, pão, pipoca, ovo cozido e, só na Vila, cachorro-quente, suco, vitamina e a fatia de bolo de fubá da vovó (a f12).

**Missões que dão comida:** a f12 (Bolo da vovó) pede a vitamina na mochila e a vovó dá a fatia de bolo de fubá; a f7 (Lanche das lhamas) é feno para as lhamas, não comida de criança.

## Objetivo
Uma criança de 3 a 4 anos, sem ler, chega numa barraca da Vila Neon, toca nela e **vê a compra acontecer**: entrega a fichinha, a moça prepara e entrega, ela estica a mão e o lanche chega na mão e na barrinha. Depois toca na tela e **come de verdade**, em três mordidas que se veem, com migalhas, som e carinha feliz. Em qualquer mundo, criativo ou sobrevivência, e o amigo vê.

## Comprar (Vila Neon)
### As barracas
| Barraca | Quem entrega | O que vende | Onde o dedo pega |
| --- | --- | --- | --- |
| **Barraca do lanche** (festival) | Bia | pipoca, cachorro-quente e suco de laranja (o "refresco") | cada lanche **no balcão, onde ele está**: as pipocas à esquerda, os cachorros-quentes no meio, o copo de suco à direita |
| **Lanchonete Dois Canudos** (rua) | Tati | vitamina de morango | o balcão |
| **Carrinho de pipoca do parque** | Seu Chico | pipoca | o carrinho |
| **Algodão-doce do parque** | Seu Chico (vai até a cuba ao lado) | algodão-doce (item novo, só da Vila) | a cuba |
| **Carrinho de pipoca da pracinha** | **Dona Cida, pipoqueira nova** (`vila:73`), atrás do carrinho | pipoca | o carrinho |

A Dona Cida existe porque o carrinho da pracinha é a primeira barraca que a criança vê ao nascer, e um carrinho que vende sozinho não é de verdade. Boneca do jogo (a mesma estética), camisa branca, avental de listras azuis e chapéu de papel azul (o Seu Chico é vermelho).

### O que acontece no toque (≈ 1,6 s, e o aceno)
"**Toque para comprar**", com a mãozinha e o desenho do lanche (a dica de toque de sempre).
1. **0,0 – 0,5 s, a fichinha:** a criança estica o braço e uma **fichinha dourada com estrela** pula da mão dela para a mão da vendedora ("plim").
2. **0,5 – 1,1 s, o preparo:** cada barraca do seu jeito — o carrinho estoura a pipoca com o sininho, a cuba gira e a nuvem cresce no palito, o liquidificador bate, a Bia pega o cachorro-quente ou o suco do balcão. O lanche aparece na mão da vendedora.
3. **1,1 – 1,55 s, a entrega:** a vendedora estica o braço com o lanche, a criança estica o dela, e o lanche dá um pulinho curto até a mão da criança.
4. **1,55 s, chegou:** na mão e na barrinha (o espaço acende com o "pop"), o som alegre, e a vendedora acena.

### Pagamento (isolado, fácil de trocar)
- **Agora: a fichinha de mentirinha, de graça.** Nenhuma moedinha sai: as moedinhas são da progressão (023) e não podem escorrer.
- O passo de pagar mora num lugar só (`src/jogo/compra.ts`, `PAGAMENTO` e `pagar`), com o mesmo desenho da fichinha na tela. Trocar para moedinhas (ou outra coisa) depois é mudar esse passo, sem mexer no resto.

### Regras (sem pressa e sem erro)
- **Uma compra por vez por criança** (o tempo da entrega, 2,2 s). Outro toque nesse meio tempo não faz nada.
- **No máximo 3 de cada lanche** com a criança. Com 3, a dica não chama, e o toque só faz a vendedora acenar.
- **Barrinha cheia** (os 9 espaços ocupados e nenhum com o mesmo lanche): a compra não acontece, **a vendedora mostra as mãos vazias**, a barrinha balança de leve e um balãozinho com o desenho da barrinha cheia aparece em cima dela por 2,5 s ("A barrinha está cheia"). Nada se perde, nada some.
- Nenhum tempo, nenhuma falha, nada de "acabou o estoque".
- Na nuvem o núcleo decide: alcance, uma compra por vez, os 3 e a barrinha; quem vê, vê a mesma entrega (a vendedora entrega para quem comprou).

### As trocas antigas
Saem as três trocas "de graça" de comida da janela de trocas na Vila (pipoca, cachorro-quente e suco): agora se compra na barraca, que é a coisa de verdade. Os outros moradores e os outros mundos não mudam.

### As missões
- **f12 Bolo da vovó:** a vitamina vem da compra na lanchonete (o mesmo balcão e a mesma dica de antes, agora "Toque para comprar"); a primeira bolinha acende quando a vitamina chega na mão, a vovó recebe e dá a fatia, e a fatia de bolo de fubá **se come como qualquer comida**. Cartão, moedinhas e testes como antes.
- **f7 Lanche das lhamas:** é feno, não comida de criança; não muda.
- Nenhuma missão nova; nenhuma moedinha por comprar ou comer.

## Comer (todos os mundos, criativo e sobrevivência)
### Como a criança descobre
- **Qualquer comida na mão se come**, com a ação de sempre do item na mão: no toque, **tocar** na tela (ou segurar, como hoje); no computador, o clique direito (ou F).
- Com comida na mão, parada, aparece a **dica de toque "Toque para comer"**: a mãozinha toca na comida, na mão do boneco, e o balãozinho mostra a carinha mordendo um biscoito. Some quando ela come, e só volta com outra comida na mão. Nada fica fixo na tela; nunca em cima do joystick; a dica de uma barraca da Vila, quando houver, vem antes.
- O que estava na frente continua na frente: o morador (trocar), o bicho que come aquilo (dar a comida), a porta e o baú.

### O momento de comer (2,6 s)
1. **Leva à boca** (0,35 s): o braço sobe e a comida para **na frente da boca**, sem entrar no rosto.
2. **Três mordidas** (0,6 s, 1,2 s e 1,85 s): a boca abre antes, fecha na mordida, a cabeça dá um "nhac" para a frente; **a comida perde um pedaço com a marca da mordida** (o recorte redondo de dentinhos, não encolher), e saem migalhas (ou gotinhas, nos copos) da cor da comida.
3. **Carinha feliz** (2,0 – 3,2 s): os olhos fecham sorrindo e dois ou três coraçõezinhos sobem da cabeça; o braço desce.

**Cada comida do seu jeito:**
| Jeito | Comidas | Mordida | Som |
| --- | --- | --- | --- |
| **mordida** | cachorro-quente, fatia de bolo, pão, maçã, carne, peixe, torta, ovo cozido, frutinhas | o recorte de mordida na ponta, maior a cada vez; migalhas | "crec" crocante |
| **pipoca** | pipoca | as pipocas de cima somem, poucas por vez, o balde fica | "crunch" miudinho |
| **canudinho** | suco, vitamina | **um gole de canudinho**: o nível do copo desce a cada gole; gotinhas | "slurp" de canudo |
| **colherada** | sopinha | o nível da tigela desce | "slurp" de colher |
| **nuvem** | algodão-doce | um tufo da nuvem some a cada mordida, o palito fica; fiapos cor-de-rosa | "fofo" macio |

No fim, o que sobrou (o balde, o copo, o palito) some com um brilhinho enquanto o braço desce.

### O que conta
- **Sobrevivência:** recupera a fome como hoje (a mesma conta de cada comida). **De barriga cheia, come do mesmo jeito** e a fome fica no máximo: para uma criança de 3 anos, a comida que não se come é falha.
- **Criativo:** é brincadeira, sem conta nenhuma. **A comida acaba** quando é comida (no criativo os blocos não acabam, mas um lanche que volta inteiro depois das mordidas não é de verdade; na Vila se compra outro, e o catálogo do criativo continua dando de tudo).
- O núcleo come **no começo** (tira da mochila e conta a fome), e não aceita outra refeição antes de 2,6 s. A animação é da tela.

### Com amigos
- O amigo vê a criança comer: o braço, as três mordidas na comida certa, as migalhas e os corações. O núcleo passa **o que** ela está comendo junto com o número de refeições de sempre.
- Justo: cada um come o que é seu; ninguém come da mão do outro.

## Os outros mundos depois
Comer já vale em todos os mundos nesta spec, com as comidas que cada um tem. **Comprar**, nesta spec, só na Vila Neon. Cada tema ganha as barracas e as comidas dele em etapas próprias, sem levar nada de um tema para outro (a regra de conteúdo por tema):
- **Cidade Grande:** o carrinho de sorvete e a padaria (sorvete de casquinha, pão francês);
- **Rancho Alegre:** a venda da fazenda (milho cozido, queijo, leite);
- **Doce Reino:** a confeitaria (bolo, pirulito, que já são do tema);
- **Era dos Dinos:** a fogueira do acampamento (espetinho de fruta);
- **Lua, Planeta Vivo, Mata Encantada, Bruma e Luz:** cada um com a sua ideia, decidida com o dono.

O desenho da compra (fichinha, preparo, entrega, chegou) e o do comer (três mordidas pelo jeito) são os mesmos; cada etapa só põe a barraca, a vendedora e as comidas do tema.

## Rede
`VERSAO_REDE` **16**: o comando `vila` ganha `comprar` (com `qual`, a barraca e o lanche); o evento `vilaCompra` (quem, o quê, de qual barraca; ou `cheia`); o jogador visto ganha `come` (o que está comendo, durante a refeição); o comer vale no criativo; a Dona Cida (`vila:73`); o item `algodao_doce`. O comando `vila` `vitamina` sai (virou `comprar`). A paridade (36 sessões, sem Vila Neon) tem de continuar 36 de 36: a única sessão que come (sobrevivência) come com fome, e comer no começo dá o mesmo estado salvo.

## Experiência medida (para não frustrar)
- **Achar onde comprar:** a dica "Toque para comprar" em até 1 s parada a 4 blocos de qualquer barraca, nas três telas (1280×720, 844×390, 390×844), nunca em cima do joystick.
- **Toque generoso:** alvo de pelo menos 80 px em cada lanche do balcão da Bia de 3 a 5 blocos; o toque pega o lanche mais perto do dedo.
- **A compra se vê:** 1,6 ± 0,2 s do toque até a mão; a fichinha, o lanche na mão da vendedora e o pulinho visíveis em fotos tiradas no meio (de dia e de noite).
- **Comer:** a dica "Toque para comer" em até 1,5 s com comida na mão e parada; do toque ao primeiro "nhac", 0,6 s; três mordidas que se veem em fotos (a forma muda a cada uma); a comida nunca atravessa o rosto (conferido nas fotos de frente e de lado).
- **Nada se perde:** barrinha cheia nunca tira nada da mão; um toque a mais no meio da compra não compra duas vezes.
- **Desempenho:** as zonas da Vila seguram 60 quadros no celular; o pior momento do festival não piora (hoje ~50 nesta máquina; 52 no build anterior). As migalhas são poucas partículas e somem em 0,6 s.
- **Rodada em família** antes de publicar.

## Cuidados legais (ver `.sdd/cuidados-legais.md`)
- **Sem dinheiro de verdade e sem pressão:** a fichinha é de mentirinha e de graça; nada de preço, contagem, estoque ou "última unidade".
- **Arte original:** a fichinha, o algodão-doce (desenho e 3D), as mordidas, as migalhas, os desenhos das dicas e a Dona Cida, tudo feito aqui, em código. Sem marca nenhuma nos copos, baldes e saquinhos.
- **Sem arco-íris** em comida, copo, balde ou roupa.
- **Conteúdo do tema:** o algodão-doce, o cachorro-quente, o suco, a vitamina e a Dona Cida só existem na Vila Neon.

## Riscos
- **A comida perto do rosto:** cada formato de comida e de boneco (fantasias com capacete, capuz) pode atravessar o rosto; a posição na boca é ajustada pelas fotos de frente e de lado.
- **O recorte da mordida** é feito uma vez por comida e guardado (não a cada refeição); se pesar no celular, as mordidas viram peças prontas.
- **A entrega da Bia de dentro da barraca:** o balcão fica entre as duas; o pulinho do lanche passa por cima dele.

## Fora desta spec
- Comprar nos outros mundos (etapas próprias, uma por tema).
- Pagar com moedinhas (espera a resposta do dono).
- Beber de verdade no copo da mesinha da calçada, dividir lanche com o amigo, dar lanche para morador.

## Dúvidas para o dono
1. **Como se paga?** Hoje é a **fichinha de mentirinha, de graça** (a criança entrega uma fichinha dourada, e nada sai da carteira). Outras opções: (a) **uma moedinha** por lanche; (b) a fichinha que se **ganha** fazendo missões. **Recomendo ficar com a fichinha de graça:** as moedinhas são o caminho para a lojinha e o nível (023), e comida que gasta moedinha vira escassez para uma criança de 3 anos (ela come, a lojinha fica mais longe). Brincar de pagar já dá o "de verdade" que o pedido quer. Se o dono preferir moedinha, a troca é num lugar só.
2. **Comer de barriga cheia na sobrevivência:** deixei comer (a fome fica no máximo). Está bom, ou prefere o "Você está sem fome" de antes?
3. **A comida acaba no criativo:** deixei acabar (é o "de verdade"). Está bom?

## Decisões de quem implementou (18 nov 2026), para o dono conferir
1. **A comida vai para a frente da boca, não fica na mão.** O braço do boneco sobe, mas a mão do boneco de cabeção fica do lado do rosto; com a comida presa na mão ela entrava na cabeça (as primeiras fotos não mostravam comida nenhuma). Agora a comida sai da mão, vai para a frente dos lábios (o ponto que se morde encostado neles, 1 cm à frente) e volta para a mão quando o braço desce. As compridas (cachorro-quente, pão, peixe, carne) ficam de través, a ponta de fora para o lado da mão; as outras em pé, com o lado que se morde virado para a boca (o canudo, a beira do balde, a ponta da fatia). Na boca a comida fica 25% maior, para ler na câmera de trás.
2. **Entre uma mordida e outra a comida sai um tiquinho da boca** (mastigando): a marca da mordida aparece, e volta para a próxima.
3. **A mordida é um recorte de verdade**, não encolher: os vértices dentro dos três "dentinhos" de cada mordida andam até a borda deles (a malha continua fechada) e ganham a cor do miolo; a fatia de bolo e a torta são recortadas no contorno, vistas de cima. As formas são feitas uma vez por comida e guardadas.
4. **Os copos viraram transparentes** (o suco e a vitamina): o nível desce a cada gole e se vê de qualquer lado.
5. **A Dona Cida** (pipoqueira nova, `vila:73`) fica do lado do carrinho da pracinha, não atrás dele: atrás da vitrine ela sumia.
6. **A Bia, a Tati e o Seu Chico não abrem mais a janela de trocas** (`semTrocas`): o que eles têm se compra na barraca. As outras trocas de cozinheiro, de outros mundos, não faziam sentido no bairro sem roça.
7. **No toque, tocar com comida na mão come** (antes, no criativo, nada acontecia); segurar também come. Com comida na mão, segurar não quebra bloco (no criativo, para quebrar, troca o item da mão).
8. **A dica de comer espera perto das barracas** (a de comprar vem antes, e a tela fica limpa durante a entrega), e some depois que ela come, até outra comida chegar na mão.
9. **A dica da barraca não volta logo depois da compra**: só depois de a criança se afastar (como os outros toques da Vila).
10. **Na Vila Neon inteira a criança nunca fica transparente** (pedido do coordenador ao ver as fotos): nem com a coisa da dica atrás dela, nem com a câmera perto. Com a câmera espremida contra uma parede (a barraca das camisetas logo atrás de quem compra na da Bia), ela sobe devagar e olha de cima.
11. **Tocar num bicho com comida na mão não come** (a comida é para dar a ele); foi o que manteve a paridade em 36 de 36 (a raposa já mansa comia as frutinhas no criativo).
12. **A dica dos carrinhos do parque só aparece bem de perto** (3,6 blocos): do lado dos brinquedos, a de andar no brinquedo vem antes.
13. **A revisão das fotos (revisor novo)**: a marca da mordida ficava virada para a boca (agora a comida sai um pouco e vira de lado entre as mordidas; no canudinho o canudo fica na boca), a fichinha não se via (maior, mais tempo na mão), o lanche ficava de cabeça para baixo na mão esticada da vendedora (agora em pé), o brilhinho do fim parecia farelo nos olhos (agora sai com o braço embaixo), a carinha feliz acabava cedo (até 3,5 s), a mão entrava no queixo (mais baixa, embaixo da comida).

## Decisões do dono
(a preencher)
