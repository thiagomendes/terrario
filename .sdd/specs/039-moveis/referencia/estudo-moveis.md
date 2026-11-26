# 039 · Móveis e utensílios: o estudo (26 nov 2026)

Pedido do dono (26 nov): "a casinha fica meio pobre por dentro". Móveis de verdade, com relevo, no estilo dos nossos brinquedos (nada de cubo pintado), todos interativos (um toque e o móvel faz uma coisa), um conjunto geral que vale em todos os mundos, e a cama nova de dois blocos com a cara do ícone da barra.

O esboço que acompanha este estudo está em `src/esboco/moveis.ts` e `moveisPecas.ts` (`?esboco=moveis`), com as fotos e a prancha em `capturas-039/esboco/`.

## 1. O que existe hoje

### 1.1 Os blocos de casa
| Bloco | Forma | Desenho no mundo | O que faz ao toque |
|---|---|---|---|
| Cama (`CAMA`, id 56) | `cama`: uma laje de 9/16 de altura numa célula | a caixa com a textura `cama_topo` e `cama_lado` do atlas (`src/art/atlas.ts`) | marca o lugar de nascer e, de noite, dorme (a noite passa quando todos estão deitados) |
| Porta (`PORTA` e `PORTA_ABERTA`) | `porta`: um painel de 3/16 que gira 90° | caixa texturizada; duas células de altura | abre e fecha (núcleo, `world/portas.ts`) |
| Mesa de trabalho (`MESA_TRABALHO`) | cubo com a face da frente | cubo texturizado | abre a mesa de montar (receitas) |
| Fornalha e fornalha acesa | cubo com a frente | cubo texturizado | abre a fornalha (assa carne e peixe crus) |
| Baú | cubo com a frente | cubo texturizado | abre o baú (o do mundo vem com tesouro) |
| Tocha, poste | `tocha` | **pecinha de brinquedo no buffer das plantas** (`mesh/plantasBrinquedo.ts`): modelo com relevo, fundido na malha do pedaço | nada |
| Flores, matinhos | `cruz` | pecinha de brinquedo no buffer das plantas | nada |
| Cerca, porteira, escada, laje, placa | caixas parciais (`world/formas.ts`) | caixas texturizadas; a porteira tem a diagonal em degraus | a porteira abre |

Não existe mesa de comer, cadeira, sofá, armário, geladeira, fogão nem TV como bloco. "Mesa" no jogo é só a mesa de trabalho (um cubo).

**Como a cama aparece hoje:**
- no ícone da barra e na mão: um modelinho de verdade (`render/itensBrinquedo.ts`, `forma === 'cama'`): dois blocos de comprimento, o lençol claro, o cobertor vermelho (`#d9504a`), o travesseiro branco e a cabeceira de madeira (`#8a5a34`). É dele que o dono gosta;
- no mundo: a laje de uma célula com a textura de cima e do lado. É o "terror" de que o dono fala: o ícone promete uma cama comprida e aparece um cubo baixo pintado.

### 1.2 As casas prontas dos mundos
- **Povoados (todos os temas):** cada casa tem uma cama e uma tocha (`world/construcoes.ts`, `mobilia`), a oficina tem o bloco de trabalho e o depósito o baú. O miolo de 3 × 3 fica vazio.
- **Sítio do Rancho Alegre (`world/sitio.ts`):** a casa da fazenda com três camas, a ferraria com a fornalha, o celeiro com o baú.
- **Cidade Grande (`world/plantas/`):** as plantas dos prédios usam a cama (`B` na paleta) e a fornalha acesa (`F`).
- **Vila Neon, as casas da rua (`world/vilaNeon.ts`):** paredes, janelas acesas, porta e chão de tábua; por dentro, vazias.
- **Vila Neon, a Casa anos 80 (spec 026, `world/vilaCasa.ts`, `render/vila/casa.ts`, `pecasCasa.ts`, `nucleo/casa.ts`):** o único interior mobiliado do jogo e o melhor modelo para esta spec. A TV de tubo com antena (quatro desenhos nossos em `render/vila/desenhosTv.ts` e o filme da fita), o sofá xadrez, o tapete, o toca-discos (a musiquinha em `audio/somCasa.ts`), a estante de fitas, o abajur, o telefone de disco, o relógio, a planta e o quarto de brinquedos. São **peças desenhadas pela tela** (o `Ref` de `render/vila/ref.ts`: caixas de quina macia, barras, prismas facetados), não blocos: não se põem nem se quebram. O toque na TV e no disco é do núcleo (todos na sala veem o mesmo canal), com uma esperinha entre dois toques. A casa tem a câmera de casa de bonecas (o telhado some quando a criança entra).

### 1.3 Como se desenha um bloco com forma própria
Três caminhos já existem:
1. **Caixas texturizadas** (`caixasDoBloco` e `caixasDaMalha`, `world/formas.ts`): a porta, a cerca, a escada, a laje, a cama. Entram na malha do pedaço (zero chamada de desenho a mais), mas são caixas com a textura do atlas: é o "cubo pintado".
2. **Pecinha de brinquedo no buffer das plantas** (`mesh/plantasBrinquedo.ts`): a tocha, o poste e as flores. Um modelinho de relevo com a cor nos vértices, fundido na malha do pedaço. Zero chamada a mais, triângulos contados por peça.
3. **Peças da Vila Neon** (`render/vila/index.ts`): o desenho do `Ref` de todas as peças de um pedaço vira uma malha de corpo e uma de luzes (duas chamadas por pedaço, não por peça). O que mexe (a tela da TV, o prato do disco) é uma malha à parte, perto.

**A proposta é o caminho 3 com a regra do 2:** cada móvel é um bloco do jogo (põe, quebra, vai para a mochila), mas é desenhado com o `Ref`, como as peças da Casa anos 80, e o corpo parado de todos os móveis do pedaço vai numa malha só (mais uma de luzes). O que mexe (a porta da geladeira, a tela da TV, o cobertor, as notinhas) só ganha malha própria quando é tocado ou quando a criança está perto. A colisão continua por caixas (`caixasDoBloco`), com o tamanho do móvel.

### 1.4 Como a porta ocupa duas células
- O cliente manda o `colocar` com `extras`: a célula de cima.
- O núcleo (`nucleo/nucleo.ts`, perto da linha 1549) só aceita `extras` para a porta, e só a célula logo acima, livre (ar, planta baixa ou água), com a mesma proteção e a mesma regra de não prender ninguém (spec 037).
- As duas metades são o mesmo bloco com o mesmo metadado (a direção).
- Quebrar uma metade leva a outra (`outraMetadeDaPorta`).
- Abrir e fechar troca as duas (`alternado`).

### 1.5 O dormir
- Usar a cama marca o lugar de nascer.
- Antes do anoitecer: o evento `sono` com `dormiu: false` (a tela mostra que ainda não dá).
- De noite: a criança fica esperando até todos estarem deitados (`sonoEspera`); aí a noite passa para todos, a tela escurece e a criança acorda de dia.
- A câmera tem o lugar próprio `dormindo` (`render/primeiraPessoa.ts`).
- Hoje não se vê a criança deitada na cama: a tela só escurece.

## 2. O catálogo proposto (13 móveis)

Tudo nas cores da casinha de brinquedo: mel, creme, coral, menta, azul e manteiga, duas ou três por móvel, nada de arco-íris. O custo é o do esboço, com tudo ligado (`capturas-039/esboco/custo.json`). As malhas do esboço são uma por parte. No jogo, o corpo parado entra na malha das peças do pedaço; a coluna "a mais" é o que sobra fora dela.

| Cômodo | Móvel | Células (L × F × A) | O toque (uma coisa, sem texto) | Liga com o que existe (proposta; a regra é do dono) | Triângulos | Chamadas a mais no jogo |
|---|---|---|---|---|---|---|
| Sala | **Sofá** | 2 × 1 × 1 | a criança senta (o boneco senta de verdade) | nenhum; só brincar | 1.384 | 0 |
| Sala | **TV** | 2 × 1 × 2 (rack e tela) | liga: a luz abre do meio e aparece o desenho; outro toque troca o desenho; a TV desliga sozinha depois de um tempo | os desenhos da TV da Casa anos 80 são da Vila Neon; a TV geral ganha os dela (proposta: quatro desenhos novos, um por toque) | 1.034 | 1 (a tela, só ligada) |
| Sala | **Aparelho de som** | 1 × 1 × 1 | toca uma musiquinha do jogo; os alto-falantes pulam e três notinhas sobem; outro toque para | a musiquinha nova, curta e mansa, feita em código como as outras; com amigos, todos ouvem (como o disco da Casa 80) | 1.024 | 1 (cones e notinhas, só tocando) |
| Sala | **Tapete de pista** | 3 × 2 × 0 (rente ao chão, não segura nada) | o carrinho dá uma volta na estrada | nenhum | 732 | 1 (o carrinho) |
| Sala | **Abajur** | 1 × 1 × 2 | acende e apaga (a cúpula fica morna) | ilumina como a tocha (luz 12) quando aceso | 196 | 0 |
| Cozinha | **Fogão** | 1 × 1 × 1 | as bocas acendem em anel, a tampa da panela pula e sai um vapor de cubinhos | proposta: **cozinha** como a fornalha (carne e peixe crus viram assados), sem precisar de carvão; a fornalha continua para os minérios | 1.608 | 1 (a tampa e o vapor, só aceso) |
| Cozinha | **Geladeira** | 1 × 1 × 2 | a porta abre, a luz de dentro acende e aparece a comidinha | proposta A: **guarda comida** (um baú só de comida, 9 lugares, a comida não estraga); proposta B: dá um lanchinho (uma frutinha) uma vez por dia | 1.540 | 1 (a porta) |
| Cozinha | **Pia** | 1 × 1 × 2 (o tampo e a torneira) | a água cai na cuba e fazem-se bolhinhas | proposta: só brincar (lavar as mãos); mais tarde, encher o balde | 1.276 | 1 (a água, só aberta) |
| Cozinha | **Mesa** | 2 × 1 × 1 | põe a mesa: os pratinhos, os copos e a fruteira aparecem | proposta: com comida na mão, a criança põe o prato na mesa e todo mundo em volta come junto (um coraçãozinho) | 1.096 | 0 |
| Cozinha | **Cadeira** | 1 × 1 × 1 | a criança senta, de frente para onde a cadeira olha | nenhum | 600 | 0 |
| Quarto | **Cama nova** | 1 × 2 × 1 | a criança deita debaixo do cobertor; de noite, dorme (a regra de hoje) | a mesma cama de hoje (lugar de nascer e dormir), agora com a criança deitada de verdade | 1.496 (mais o edredom, com alguém deitado) | 1 (o cobertor, só com alguém deitado) |
| Quarto | **Guarda-roupa** | 2 × 1 × 2 | as duas portas abrem e mostram as roupinhas no cabide | proposta: **abre o provador** (a troca da aparência, a mesma da tela de criar a criança) | 1.788 | 1 (as portas) |
| Quarto | **Criado-mudo** | 1 × 1 × 1 | a luminária de lua acende devagar | ilumina pouquinho (luz 7), boa para a noite; nunca escuro total | 704 | 0 |

A casinha do esboço tem os 13 móveis, com três cadeiras. Com tudo ligado, ela soma 15.678 triângulos em 39 malhas. As 39 malhas são do esboço, uma por parte; no jogo seriam 2 malhas por pedaço, mais as partes que mexem.

**Por que esse conjunto:** é o que uma criança de 3 a 4 anos reconhece numa casa e numa casa de brinquedo, e cada um tem um toque que se vê de longe e na tela do celular: a luz acende, a porta abre, a água cai, a música toca, a criança senta ou deita. Nenhum toque assusta (nada de fogo de verdade, de barulho alto, de porta batendo): o fogão é de brinquedo (o anel laranja manso), a TV abre devagar e o som começa baixinho.

**Pensar fora da caixa (o dono pediu):** o tapete de pista (o carrinho dá a volta), o guarda-roupa que abre o provador, a geladeira que guarda comida e a mesa onde todos comem juntos. Ficaram de fora, para uma rodada depois: a estante de livros (abre um livrinho de figuras), a banheira de patinho, o berço do bichinho de estimação e o quadro na parede que a criança pinta.

### 2.1 Os estilos do esboço (a recomendada primeiro)
- **Cama:** A, a cama do ícone (madeira escura em degrau, o cobertor vermelho de retalhos, o lençol dobrado, o travesseiro gordinho); B, a cama de estrelas (azul, a cabeceira de três montinhos com estrelinhas, o cobertor azul-noite com estrelinhas). Recomendo a A: é exatamente o que o ícone promete.
- **Sofá:** A, o sofá gordinho coral (almofadas fofas, rolos nos braços, botõezinhos); B, o sofá de blocos menta (baixo, capitonê, pés redondos). Recomendo o A: lê como sofá de longe e de qualquer lado.
- **TV:** A, a TV de rack (tela larga de moldura azul gordinha, o rack de duas portas, os alto-falantes redondos); B, a TV caixote de pezinhos (manteiga, um bloco só). Recomendo a A: não lembra a TV de tubo da Casa anos 80 (que é da Vila Neon) e a tela é grande o bastante para o desenho se ler no celular.

## 3. De onde a criança tira os móveis

1. **Recomendado: a "Loja de móveis" na banca de cada mundo, com moedinhas, e todos no criativo.**
   - Os móveis entram na banca do mundo (a mesma de `BANCA` em `jogo/alma.ts`, preço fixo e entregue pelo núcleo). Mas, por serem gerais, valem em todas as bancas: cada uma vende o conjunto todo.
   - Preço proposto: 3 a 6 moedinhas, como os outros itens da banca. Cadeira, criado-mudo e abajur custam 3; mesa, pia, tapete e fogão, 4; sofá, som e guarda-roupa, 5; TV e geladeira, 6.
   - No criativo, todos aparecem no catálogo, como os blocos.
   - A cama continua também na mesa de montar (a receita de hoje), para não tirar o que as crianças já sabem.
   - Por quê: a criança junta moedinhas nas missões e já sabe comprar na banca; mobiliar a casa vira um objetivo bom e sem pressa. E não é premium: nada de pressão.
2. **Pela mesa de montar (receitas), como a cama e a porta hoje.** Ex.: a cadeira com tábuas, o sofá com lã e tábuas, a geladeira com ferro. É o jeito "de jogo de sobrevivência"; mas a criança de 3 a 4 anos não lê receita e ficaria sem os móveis no sobrevivência.
3. **Só no criativo**, sem comprar nem montar. É o mais simples e o mais rápido de fazer, mas no sobrevivência a casa continua pobre.

## 4. Pôr e quebrar o móvel de mais de uma célula

**A regra proposta (a mesma ideia da porta, generalizada):**
- **A célula de pé** é a do toque. As outras saem do tamanho do móvel e da direção para onde a criança olha (a cama de dois blocos vai "para a frente" de quem põe; o sofá e a mesa, para a direita; a geladeira e o guarda-roupa, para cima). Isso cabe na regra do núcleo se o `extras` do `colocar` passar a aceitar as células do móvel (e só elas, exatamente). **Muda o protocolo:** sobe a `VERSAO_REDE` e o servidor publica junto.
- **Todas as células têm de estar livres**, com a mesma proteção e a mesma regra da 037 (nunca em cima de gente ou bicho, e encostado no chão). Se alguma não estiver livre, o fantasma do móvel fica vermelho e nada acontece (o "não" curtinho da 037).
- **Cada célula guarda o mesmo bloco**, com o metadado da direção e de qual pedaço ela é (a de pé, a da cabeceira, a de cima). O desenho sai só na célula de pé; as outras só seguram (colisão) e passam o toque para a de pé.
- **Quebrar qualquer pedaço leva o móvel inteiro**, como a porta; vira um item só.
- Com amigos: quem pôs é o dono do móvel (spec 016); a proteção vale para todas as células.

**As camas de um bloco que já estão nos mundos:**
- **Recomendado: viram a cama nova onde couber.** Ao carregar o pedaço, a cama de uma célula com a célula da frente livre vira a cama de dois blocos (a cabeceira na célula onde estava). Onde não couber (encostada na parede, entre dois blocos), fica a **cama curtinha**: a mesma cama nova, desenhada em uma célula (a cabeceira, o travesseiro e o cobertor dobrado, sem o comprimento). Nada some das casas das crianças, e as casas dos povoados e do sítio ganham a cama nova.
- Outra: trocar só o desenho, todas as camas viram a "cama curtinha" de uma célula, e a de dois blocos é um bloco novo. Mais simples, mas o mundo continua com camas curtas.
- As camas dos povoados, do sítio e das plantas da Cidade Grande saem do gerador: basta o gerador pôr a cama nova com as duas células (todas cabem: o miolo das casas é de 3 × 3).

## 5. Desempenho
- No jogo, o corpo parado de todos os móveis de um pedaço vai numa malha só (mais uma de luzes), como as peças da Vila Neon. As partes que mexem só ganham malha quando tocadas, ou com a criança perto.
- A conta do esboço (cada parte numa malha, tudo ligado) está em `capturas-039/esboco/custo.json`. A meta proposta para a spec:
  - uma casa cheia (os 13 móveis) soma no máximo 4 chamadas de desenho paradas e uns 16 mil triângulos. O esboço mediu 15.678 com tudo ligado. Os prismas facetados e o bisel de cada caixa são o que mais pesa; é por aí que se corta, se a medida na placa pedir;
  - medido na placa (`scripts/e2e-gpu.sh`), sem perder quadro no celular.

## 6. O que fica para a spec (perguntas ao dono)
1. A regra de cada toque que liga com o jogo: o fogão cozinha? A geladeira guarda comida? O guarda-roupa abre o provador? A mesa junta todos para comer?
2. De onde vêm os móveis: a banca de cada mundo com moedinhas e o criativo (recomendado), a mesa de montar ou só o criativo.
3. Os estilos: a cama, o sofá e a TV (A recomendados).
4. As camas que já estão nos mundos: viram a de dois blocos onde couber (recomendado) ou ficam curtinhas.
