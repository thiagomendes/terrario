---
id: 014-cidade-grande
title: 'Cidade Grande: prédios de visitar, ruas e praças, e o canteiro de obras'
status: DRAFT
base_branch: main
branch: feat/cidade-grande
created_at: 2026-11-07T23:30:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
environment: docker
full_test_command: npx vitest run && scripts/e2e-gpu.sh
install_command: npm ci --no-audit --no-fund
---
## Contexto
Separada da spec 013 em 7 nov 2026: o dono escolheu fazer o Rancho Alegre primeiro (013), que trouxe o plantio e a criação para todos os temas. A Cidade Grande vem depois, por cima do que a 013, a 015 (terceira pessoa e gestos), a 016 (construções protegidas), a 017 (fantasias) e a 019 (som gravado) deixaram prontos. O estudo de viabilidade está na spec 013 (seção "Viabilidade"). O desenho de referência do tema é `.sdd/specs/013-rancho-alegre/referencia/temas.html` (https://claude.ai/artifact/1YbkZd2Tv5TezzkkBzhVMd).

O dono pediu em 10 nov 2026 que a cidade já nasça com o jeito dela, em vez de herdar a roça dos outros temas (a 018 vem depois e cuida dos outros). Em 12 nov 2026 ele decidiu a atividade: **canteiro de obras**. No mesmo dia pediu o **jeito de Manhattan** (sem copiar nada de verdade) e **carrinhos e ônibus** andando sozinhos pelas ruas, "se não ficar complexo demais".

**Esboço para aprovar:** `referencia/cidade.html` (o canteiro passo a passo, as plantas das obras, um prédio, uma quadra vista da calçada, o horizonte, os carrinhos no cruzamento e os sons para ouvir). Nada é implementado antes da aprovação.

## Objetivo
- **Cidade Grande, o 8º tema**, com cara de cidade grande de brinquedo: ruas em grade, avenidas, um parque grande no meio, prédios de 2 a 6 andares que dá para visitar, lojinhas com toldo e moradores.
- **Canteiro de obras**, a atividade própria da cidade: o pedreiro mostra a planta de uma obra pequena em blocos fantasmas; a criança preenche, bloco por bloco; ao terminar, a obra vira parte da cidade, com festa.
- **Carrinhos e ônibus** (bloco de tarefas que pode ser cortado): poucos, de blocos e rodas redondas, andando sozinhos em circuitos, parando nos cruzamentos e para quem estiver na frente.
- **Som da cidade:** jazz leve de piano e baixo, suave como as outras trilhas; vozes gravadas dos bichos novos; buzininha de brinquedo ao longe.
- **Leve no celular:** 45 quadros no centro da cidade, sem baixar a nitidez abaixo da resolução de CSS.

## Fora de escopo (desta etapa)
- Andar de ônibus ou de carro, dirigir, semáforos de verdade, estacionar (ficam no backlog; ver "Carrinhos e ônibus").
- Elevador (os prédios têm escada; o elevador fica no backlog).
- Metrô de verdade: a entrada do metrô é só enfeite (escada que desce até um portão fechado).
- Rio com ponte (estava no esboço de 7 nov). Nesta etapa a cidade tem lago no parque; o rio muda o terreno fora da cidade e fica para depois (pergunta ao dono).
- A atividade própria dos outros temas (spec 018). A roça e a criação da 013 continuam valendo na cidade, como em todo tema.
- Obras livres desenhadas pela criança (a planta é sempre a do pedreiro).

## Decisões já tomadas
- **12 nov 2026:** prédios de 2 a 6 andares; atividade própria = canteiro de obras.
- **10 nov 2026:** sem Blender; MagicaVoxel só se ajudar de verdade, validado no começo com um prédio de teste; senão, plantas em código como as do sítio.
- **7 nov 2026:** bichos da noite fofos, que não atacam (o guaxinim usa a criatura da noite mansa da 013).

## Lições aplicadas (o que já deu bug antes e como esta spec evita)
1. **Comando novo sem caso no saneamento some na nuvem.** O canteiro não cria comando de colocar novo: usa o `colocar` de sempre (com a colher de pedreiro ou com o bloco certo). Os eventos novos (`obra`, `veiculo`) ganham caso em `src/nucleo/saneamento.ts` e teste no modo nuvem (`confiar: false`).
2. **Estilo do mundo filtrado no servidor.** `planta: 'cidade'` e os campos novos entram em `src/world/estiloSeguro.ts`, e o teste "estiloSeguro(estilo) == estilo" cobre os oito temas.
3. **Sorteios novos com gerador próprio** (`hash2`/`hash3` com chaves novas): a cidade não mexe nos sorteios de povoado, população, drops e clima de hoje, e a paridade gravada (`e2e/paridade`) dos sete temas não muda.
4. **Estado novo só dentro do `criarNucleo`** (obras, veículos): o servidor roda várias salas no mesmo processo.
5. **Uma regra só para prever e para conferir:** a mesma função diz o que a célula da obra aceita, no núcleo e no cliente (como `src/jogo/permissao.ts` na 016).
6. **Mundos salvos continuam abrindo:** ids de bloco só são acrescentados (84 em diante), chaves novas de `extras` são opcionais.
7. **Protocolo novo sobe `VERSAO_REDE`** (hoje 3, em `src/rede/protocolo.ts`); servidor publicado junto (ou antes) do site.
8. **Lista única de temas** (`e2e/temas.ts`, `TEMAS_E2E`): o 8º tema entra nela, e `tests/temas/listaE2e.test.ts` confere.
9. **Tudo pelo toque também:** encher a obra, falar com o pedreiro e a festa testados no celular.
10. **Sons curtos, nunca em laço, e música abaixo dos efeitos** (019): régua de volume (`e2e/trilha-regua.spec.ts`, `e2e/vozes-regua.spec.ts`) para a trilha e as vozes novas.
11. **Peças de brinquedo fundidas por parte que se mexe** (a queda de 60 para 42 quadros da 012): carrinho, ônibus, bichos e moradores.
12. **Interior apertado e câmera de terceira pessoa** (o vulto do boneco na casinha 3×3 da 015): cômodos de pelo menos 5×5 por dentro e pé-direito de 3 blocos livres.

## Jeito de Manhattan (sem copiar nada de verdade)
Pedido do dono em 12 nov 2026: a sensação de Manhattan, não uma cópia. **Nenhum prédio famoso, logotipo, marca ou nome de verdade** (a revisão de propriedade intelectual da 020 vale aqui): os táxis são só amarelos, o ônibus é genérico, a entrada do metrô tem um desenho de trenzinho e nenhum nome, as placas das lojas são desenhos (pão, chave inglesa, tijolo, sorvete).
- **Grade rígida:** avenidas largas num sentido e ruas transversais no outro, quarteirões compridos e retos.
- **Parque grande no meio:** um quarteirão duplo de gramado, lago, caminhos e árvores de rua (ipê e sibipiruna, do esboço de 7 nov).
- **Casas geminadas de pedra marrom** (2 a 4 andares): escadinha de pedra na frente da porta e escada de incêndio de grade de ferro na fachada (dá para subir até o terraço).
- **Prédios de esquina art déco** (5 e 6 andares): pedra creme, friso dourado e topo em degraus.
- **Caixa d'água de madeira** em cima de vários telhados (barril de tábuas com pernas).
- **Lojinhas no térreo com toldo** listrado: padaria (lanchonete de esquina), oficina mecânica, loja de construção, sorveteria.
- **Entrada de metrô** decorativa: escada que desce até um portão de grade fechado, com dois postes de globo verde.
- **Táxis amarelos e um ônibus** (ver "Carrinhos e ônibus").

## Planejador de cidade (`EstiloMundo.povoado.planta: 'cidade'`)
- **Uma cidade por mundo, em volta do nascimento**, determinística pela semente e igual no servidor (`src/world/cidade.ts`, novo, ao lado de `src/world/sitio.ts`). `PlantaPovoado` em `src/world/povoado.ts` passa a `'vila' | 'sitio' | 'cidade'`; o povoado de região de 128 continua para os outros temas.
- **Malha:** avenidas de 8 de largura (calçada 2, asfalto 4 com duas mãos de 2, calçada 2) a cada 40 blocos e ruas de 6 (calçada 1, asfalto 4, calçada 1) a cada 24. Quarteirão de 32 × 18 com 8 lotes de 8 × 9 (duas fileiras de 4, de costas uma para a outra, porta para a rua). A cidade tem 5 avenidas e 7 ruas: 4 × 6 quarteirões, uns 168 × 150 blocos. Faixa de pedestre (zebra) em todo cruzamento e meio-fio de calçada.
- **Zonas:** o parque ocupa 2 × 2 quarteirões no meio (as ruas de dentro viram caminhos); os prédios altos (5 e 6 andares, art déco) ficam nas esquinas em volta do parque; mais para fora, casas geminadas de 2 a 4 andares; nas pontas, lojas e a escola; no anel de fora, a cidade termina em calçada e gramado, e começa o mundo natural (morros e praia, para minerar e construir).
- **Lotes:** prédio de apartamentos (o mais comum), padaria (fornalha acesa: cozinheiro), oficina mecânica (fornalha: ferreiro), loja de construção (mesa de trabalho e baú: construtor), escola, sorveteria (enfeite), praça pequena (fonte, bancos, árvore) e **6 lotes de canteiro** (com tapume). O prédio mais alto do centro tem terraço com caixa d'água e baú.
- **Terreno plano:** o chão da cidade é uma altura só; em volta, uma rampa larga (1 bloco a cada 3 colunas, até 24 colunas) leva ao terreno natural. No tema da cidade, o relevo perto do nascimento é amaciado antes; os outros sete temas saem iguais bloco por bloco (`tests/temas/paridade-bruma.test.ts`, `tests/temas/paridade-povoados.test.ts`). Sem cavernas embaixo da cidade.
- **Nascimento:** na calçada da praça, ao lado do primeiro canteiro, olhando para ele. O pedreiro está a até 12 blocos (em 20 de 20 sementes testadas).
- **Estrutura rara** (fora da cidade): a roda-gigante de um parque de diversões abandonado, com baú (`FormaEstrutura` nova, `'roda-gigante'`, em `src/temas/tipos.ts`).
- **Proteção (016):** tudo o que o planejador põe é do mundo e blindado: prédios, lojas, calçadas, postes, caixa d'água, escada de incêndio. O asfalto das pistas e as faixas de pedestre são `PASSAGEM` (ninguém coloca bloco ali, então os carrinhos nunca encalham); as calçadas são `CHAO` (enfeitar pode, sem tapar porta nem escada). A margem de chão da cidade inteira entra em `src/world/protecao.ts` como a do povoado, com o lugar `'cidade'` no aviso.

## Prédios (2 a 6 andares)
- **Andar de 4 blocos** (piso + 3 livres). 6 andares = 24 blocos + terraço; cabe com folga em `ALTURA` 128.
- **Por dentro:** escada de dois lances (num poço de 2 × 6) do térreo ao terraço, com patamar em cada andar; cada andar tem 1 ou 2 apartamentos com cama, mesa e baú (como as casas do povoado: usáveis por todos, 016). Térreo com porta para a rua. O terraço tem parapeito de grade.
- **Por fora:** janelas grandes (bloco com recorte, não transparente) em fileiras; à noite parte delas fica acesa (bloco "janela acesa", que brilha mas não espalha luz, para não pesar no cálculo de `src/world/luz.ts`).
- **Cinco modelos** combinados pelo planejador (girados conforme a rua, como `noLote` faz no sítio): casa geminada de pedra marrom (2, 3 e 4 andares, escadinha e escada de incêndio), prédio de tijolo com loja e toldo no térreo (3 e 4), prédio de esquina art déco (5 e 6, topo em degraus), escola (2) e o prédio alto do centro (6, terraço). A altura sai do sorteio do lote e da zona.
- **Moradores** moram nos apartamentos e trabalham nas lojas. Até 12 por cidade (3 profissões em rodízio), para o celular.

## Canteiro de obras (a atividade da cidade)
### A ideia
O pedreiro mostra a planta de uma obra pequena em **blocos fantasmas**, azuis e meio apagados, no lugar onde ela vai ficar. A criança enche os fantasmas, bloco por bloco. Ao terminar, a obra vira parte da cidade, com festa. Dá para fazer sem ler nada.

### Como uma criança de 3 ou 4 anos começa
1. **Ela já nasce ao lado do primeiro canteiro.** O tapume laranja e branco, a placa com o desenho da obra e os fantasmas azuis já estão à vista.
2. **O pedreiro acena e vem até ela** quando ela chega a 8 blocos (gesto `acenar` da 015) e **dá a colher de pedreiro**: ela entra sozinha na barra e fica na mão, com um brilho e o som "plim". Nada de janela nem de botão para entender. Quem perder a colher toca no pedreiro e ganha outra (no diálogo de trocas dele também aparece um botão grande com o desenho da obra).
3. **A dica na mira** mostra a mãozinha tocando no fantasma, sem texto obrigatório (o texto "Toque no bloco azul" fica para quem lê).

### Os blocos fantasmas
- Cada célula da planta que ainda está vazia aparece como um cubo azul translúcido com contorno claro e com a cor do bloco bem leve por cima (vermelho do tijolo, amarelo do toldo), para a criança ver o desenho da obra.
- **A próxima camada pulsa** devagar (a de baixo que ainda falta); as de cima ficam mais apagadas. Pode encher em qualquer ordem, mas o pulso guia de baixo para cima.
- O fantasma na mira mostra o bloco de verdade, pequeno, girando no meio dele.
- Os fantasmas só aparecem perto do canteiro (até 24 blocos) e são desenhados de uma vez só por obra (instâncias finas, `thinInstance` do Babylon: uma malha de cubo e uma cor por instância).
- Não fazem colisão nem sombra; a câmera de terceira pessoa passa por eles.

### Encher
- **Com a colher de pedreiro na mão:** tocar (ou clicar) num fantasma põe o bloco certo ali. O material é da obra (não gasta nada do inventário, na sobrevivência e no criativo). É o caminho principal para os pequenos.
- **Com o bloco certo na mão** (tijolo, vidro, tábua...): também enche; na sobrevivência o bloco é gasto, como qualquer colocar.
- **Ímã de toque:** no toque, o dedo que cai a até meio bloco de um fantasma pega o fantasma mais perto (a mira de toque da 015 já projeta o bloco; aqui ela prefere o fantasma). Nenhum toque "erra" por pouco.
- **Alcance:** toda célula da planta fica ao alcance do chão ou do **andaime de tábuas** que vem com o canteiro (regra de `src/jogo/alcance.ts`, 8 blocos dos olhos). Obras de até 5 blocos de altura.
- **Cada bloco posto:** "plim" com uma nota que sobe conforme a obra avança (a obra toca uma escala), um sopro de poeirinha, e a barra de progresso (uma casinha que vai se enchendo, no alto, sem números) cresce. Ao fechar uma camada, um acorde curto de piano.

### Bloco errado
- Um bloco que não é o da planta **não entra** e **não é gasto**. O fantasma treme, e em cima dele aparece o balãozinho com o desenho do bloco certo; o pedreiro aponta (gesto `apontar`). Se a criança tem o bloco certo na barra, a casinha dele pisca; senão, quem pisca é a colher.
- O aviso não se repete a cada toque (fila de avisos da 015, no máximo um a cada 3 s). Para quem lê: "Aqui vai tijolo. Use a colher!".
- Nada de "errado" vermelho nem som de erro: o som é um "hum?" curto do pedreiro.
- Não existe desfazer na obra: só entra o bloco certo, então nunca há o que consertar.

### Várias crianças na mesma obra
- Todo mundo perto vê os mesmos fantasmas e enche qualquer um. O servidor decide quem chegou primeiro em cada célula; quem chegou depois não perde nada (a colher não gasta; o bloco da mão volta) e não vê nada piscar, porque a célula ficou com o mesmo bloco.
- O bloco posto na obra já fica blindado na hora (ninguém tira, nem quem pôs): uma criança não desmancha o que a outra fez.
- Quem pôs pelo menos um bloco entra na lista de ajudantes. A festa é para todos a até 32 blocos, e cada ajudante ganha a recompensa.
- No aparelho, sozinha, é igual: a criança é a única ajudante.

### Ao terminar: festa e recompensa
- **Festa (até 6 s, sem travar o controle):** confete de pedacinhos de tijolo e folhas, o "ta-dá" de piano com a buzininha, o pedreiro e os moradores perto batem palmas (gesto `aplaudir`), o tapume e o andaime somem num sopro de poeira.
- **A placa vira "Feita por Ana e Léo"** (os ajudantes, até 4 nomes; os pais leem, as crianças veem os nomes).
- **A obra ganha vida:** a casinha do cachorro ganha um cachorro morando nela; a banca ganha frutas; o ponto de ônibus passa a ser parada do ônibus (se os carrinhos entrarem); a sorveteria acende; a casinha acende a luz à noite; o coreto toca uma musiquinha quando alguém entra.
- **Recompensa:** na primeira obra, o **capacete amarelo de obra** (acessório da 017, para todos os temas). Cada obra cola uma figurinha no diário (capítulo novo "Obras da cidade", `src/jogo/diario.ts`). Ao terminar as seis, festa maior com fogos de brinquedo e o **colete laranja** (acessório).
- **A próxima obra:** o pedreiro anda até o próximo canteiro e acena de lá. Ficam dois canteiros abertos de cada vez, na ordem das plantas.

### As plantas das obras (6, da mais fácil para a maior)
| # | Obra | Tamanho | Blocos | Tempo de criança (1 bloco a cada 6 s) |
|---|---|---|---|---|
| 1 | Casinha do cachorro | 3 × 3 × 3 | ~14 | ~1,5 min |
| 2 | Banca de frutas com toldo | 3 × 2 × 3 | ~16 | ~2 min |
| 3 | Ponto de ônibus (banco, teto, placa) | 4 × 2 × 4 | ~18 | ~2 min |
| 4 | Sorveteria de esquina | 4 × 4 × 4 | ~40 | ~4 min |
| 5 | Casinha com porta e janela | 5 × 5 × 5 | ~55 | ~6 min |
| 6 | Coreto da praça (para fazer junto) | 6 × 6 × 5 | ~60 | ~6 min |

As plantas usam blocos que já existem ou entram nesta spec (tijolo, tábua, vidro, laje, cerca, porta, toldo, placa). As contas exatas saem da T05.

### Quem é dono da obra (regras da 016)
- **A obra é da cidade, não de quem fez.** Enquanto está aberta, cada célula da planta é uma célula de **obra**: só aceita o bloco da planta (é o "conserto" que a 016 já prevê para a estrutura, `gerado`), e o bloco que entra já fica blindado. Ao terminar, a obra vira **estrutura do mundo**, protegida como qualquer prédio: ninguém quebra, nem quem construiu, nem o dono do mundo. As portas e o banco dela são usáveis por todos.
- **Por quê:** a criança não perde a obra por engano nem por um amigo, e a obra feita é igual às outras construções da cidade (a mesma máscara de proteção, o mesmo cadeadinho na mira). O crédito fica na placa e no diário.
- **Como fica gravado:** `extras.obras` (opcional) guarda, por canteiro, as células já cheias, os ajudantes e se terminou. A geração (`pintarEstruturas` em `src/world/chunk.ts`) pinta a obra terminada como parte da cidade (sem tapume nem andaime), do mesmo jeito que os povoados leem as regiões sem povoado hoje (`definirObrasFeitas(ids)`, ao lado de `definirRegioesSemPovoado` em `src/world/povoado.ts`). Ao terminar, as edições das células da obra deixam de ser necessárias e são limpas.
- **Proteção:** `src/world/protecao.ts` ganha a classe `OBRA` (célula da planta ainda vazia: aceita só o bloco da planta; cheia: não quebra) e a função `planejado(x, y, z)`; `src/jogo/permissao.ts` (`recusaColocar`, `recusaQuebrar`) usa as duas, no núcleo e no cliente. O andaime e o tapume são `ESTRUTURA` enquanto a obra está aberta. Aviso: "Essa obra é da cidade. Que tal ajudar a construir?".

## Carrinhos e ônibus (bloco de tarefas separado, pode ser cortado)
Pedido do dono em 12 nov 2026: carrinhos e ônibus de blocos, com rodas redondas, que ninguém quebra, que andam sozinhos certinho pelas ruas, param nos cruzamentos e para as pessoas, e com as colisões pensadas. "Se ficar complexo demais, revemos."

### Versão mínima proposta para a 014
- **4 táxis amarelos e 1 ônibus** por cidade. Cada um anda num **circuito fixo**: uma volta retangular em volta de um ou dois quarteirões, sempre pela mão da direita. O ônibus tem 3 paradas (uma delas é o ponto de ônibus da obra 3, quando estiver pronto).
- **Devagar:** 3 blocos por segundo no reto (a criança anda a 4,3 e corre a 7), freando e acelerando suave.
- **Cruzamento:** o cruzamento é reservado por um veículo de cada vez. Um veículo só entra se o cruzamento estiver livre **e** houver lugar para ele do outro lado (assim nunca para no meio e nunca dá nó). Na faixa de pedestre, para se tiver alguém nela.
- **Fila:** na mesma faixa, cada veículo mantém 2 blocos de distância do da frente.

### Gente e bichos na rua
- **Nunca encosta em ninguém.** Antes de andar, o veículo olha a faixa à frente (4 blocos no reto, o cruzamento inteiro na curva). Tem criança, morador ou bicho ali: freia devagar e para a 1,5 bloco, sem tocar.
- **Criança parada na rua:** o carrinho espera o tempo que for. Dá um "fom-fom" de brinquedo (no máximo um a cada 6 s por veículo), o motorista acena e aparece um balãozinho com um sorriso. Nada de empurrar, nada de dano, nada de buzinar sem parar. Os de trás fazem fila. Quando ela sai, ele segue. (Ficar na frente do carrinho vira brincadeira, e tudo bem.)
- **Criança em cima do carro ou do ônibus:** o veículo é sólido como um bloco para o boneco (dá para subir no teto pelo pulo). Com alguém em cima, ele não anda. Ninguém é carregado.
- **Criança que anda contra o carro:** bate como num bloco, sem empurrão nem dano. O carro andando nunca vai para cima dela (a regra de olhar à frente).
- **Bichos:** os bichos da cidade preferem calçada e parque (a rua custa mais no passeio deles). Bicho parado na faixa por mais de 2 s ganha um novo destino fora dela.
- **Bloco na rua:** não acontece, porque a pista é `PASSAGEM` (016). Item solto na rua não segura o carro.
- **Nunca encalha:** se por algum defeito o veículo ficar 60 s parado sem ninguém na frente, ele some num sopro e reaparece no começo do circuito.

### Multijogador e núcleo autoritativo
- **Opções:** (a) calcular a posição só pelo relógio do mundo em cada aparelho: barato, mas não consegue parar para uma criança, porque cada aparelho veria uma coisa; (b) o servidor simular e mandar a posição em todo quadro: consistente, mas pesado na rede.
- **Recomendado (híbrido, barato e consistente):** o núcleo (`src/nucleo/nucleo.ts`, que roda no servidor e no modo local) simula cada veículo numa dimensão só, a distância `s` ao longo do circuito (poucos microssegundos por passo). Ele manda um evento `veiculo` só quando o veículo **muda de jeito** (começa a frear, para, sai): `{ id, s, v, a, t }`. O cliente calcula a posição entre um evento e outro com a mesma fórmula (`src/jogo/veiculos.ts`, compartilhado), então anda liso e igual para todo mundo. Na rede são alguns eventos por minuto por veículo.
- **Sala dormindo (nuvem) ou mundo fechado:** os veículos não andam. Ao acordar, cada um volta para o lugar que o relógio do mundo dá (espaçados no circuito).
- **Saneamento:** o cliente não manda nada sobre veículos (só lê), então não há comando novo. O evento entra no protocolo e `VERSAO_REDE` sobe.

### Inquebráveis e protegidos
- Veículo não é bloco: é uma peça como os bichos, sem vida e que não quebra. Bater nele só faz um "toc" de brinquedo e um "fom" do carrinho (uma vez a cada 3 s). Ninguém leva nem guarda no inventário.
- A pista e as faixas são `PASSAGEM` e as calçadas `CHAO` (016): o caminho dos carrinhos fica sempre livre.

### Desenho e desempenho
- **Táxi:** carroceria de blocos amarela (4 × 2 × 2 com a cabine), luzinha no teto sem palavra nenhuma, faróis que acendem de noite, 4 rodas redondas pretas com calota. **Ônibus:** 8 × 2 × 3, azul e branco (genérico), janelas em fila, porta que abre na parada.
- **Uma peça fundida por modelo** (carroceria) e as rodas à parte, todas como instâncias (`thinInstance`): 5 veículos dão **no máximo 4 chamadas de desenho** e menos de 10 mil triângulos.
- **Perto e longe:** a até 40 blocos as rodas giram e os faróis brilham; além disso as rodas param de girar; fora da névoa o veículo não é desenhado.
- **Teto medido:** veículos custam no máximo 0,3 ms por quadro no celular (CPU 4× mais lenta) e nada que apareça na medida das salas do servidor.

### Complexidade (avaliação honesta)
- **Média para alta.** É uma mecânica nova do tamanho de "criar bichos" da 013: simulação no núcleo, evento novo no protocolo, previsão no cliente, peça de brinquedo, sons e muitos testes (nó no cruzamento, criança na rua, sala que dorme).
- **O que mais pode dar errado:** nó nos cruzamentos (resolvido pela reserva com lugar do outro lado, testado em 1 hora simulada); criança presa entre carro e parede (o carro nunca anda para cima de ninguém e a calçada fica sempre livre); a câmera de terceira pessoa entrando no ônibus (o veículo entra na mesma conta de desvio da câmera); o celular perdendo quadros (instâncias e o teto acima).
- **Fica para depois:** andar de ônibus, dirigir, semáforos, mais tipos de carro, carros em todas as ruas, estacionar, ambulância e bombeiro.

## Horizonte da cidade grande (prédios altos ao longe)
- **A ideia:** um anel de torres altas bem longe, que não dá para alcançar, para a cidade parecer enorme sem pesar.
- **Como:** caixas simples de poucos triângulos, juntas numa malha só, com cor por vértice que se mistura na névoa, e janelinhas acesas de noite por uma textura pequena repetida (256 × 64). Ficam num anel de 260 a 320 blocos do centro da cidade; quem anda para fora vê o anel se afastar junto (nunca chega a menos de 120 blocos dele), e longe da cidade ele some na névoa.
- **Custo:** 1 chamada de desenho, uns 1.500 triângulos, uma textura de 64 KB, nada de CPU por quadro. É bem mais barato que um único prédio de verdade.
- **Veredito:** vale a pena e é barato. Fica no celular sempre (não sai no alívio de efeitos). Recomendo caixas de verdade (mudam um pouco de lugar quando a criança anda, o que dá profundidade) no lugar de um desenho chapado no céu.

## Blocos novos
Ids 84 em diante, nesta ordem; os nomes de cada tema e as texturas seguem a 013.

| Bloco | Forma | Para quê |
|---|---|---|
| asfalto | cubo | pista |
| faixa de rua (amarela) | cubo | meio da pista |
| faixa de pedestre | cubo | zebra dos cruzamentos |
| calçada | cubo | calçadas, com meio-fio |
| concreto | cubo | prédios e muros |
| pedra marrom | cubo | casas geminadas |
| escadinha de pedra marrom | escada | a escadinha da frente das casas |
| pedra creme | cubo | prédios art déco |
| friso dourado | cubo | enfeite dos prédios art déco |
| janela grande | cubo com recorte | janelas dos prédios |
| janela acesa | cubo com recorte, brilha | janelas de noite (sem espalhar luz) |
| grade de ferro | cerca | escada de incêndio, parapeito, portão do metrô |
| laje de grade | laje | patamares da escada de incêndio |
| poste de luz | peça (como a tocha), luz 14 | ruas e parque |
| placa | peça | placas de rua, de loja (só desenho) e da obra |
| toldo vermelho e toldo verde | laje | toldos das lojas e da banca |
| tapume | cerca | cerca laranja e branca do canteiro |

Também entram o item **colher de pedreiro** (ferramenta que não gasta) e os acessórios **capacete de obra** e **colete laranja** (017). O atlas (`src/art/atlas.ts`, 16 × 8) tem 89 de 128 lugares usados; entram 17 texturas novas (106 de 128).

**Nos outros temas:** os blocos novos aparecem no criativo de todos os temas com a mesma textura e um nome do tema (pergunta ao dono: recomendo assim, mais barato que pintar sete vezes).

## Moradores e bichos
- **Moradores** (desenhados à mão como no esboço de 7 nov): padeira ou padeiro (cozinheiro), mecânica ou mecânico (ferreiro), **pedreira ou pedreiro** (construtor; dono do canteiro, de capacete amarelo; troca tijolo, vidro, escada e toldo). Moram nos apartamentos, trabalham nas lojas, e o pedreiro passa o dia no canteiro aberto.
- **Bichos:** cachorro grande (cervo), pombo (coelho), gato de rua (raposa), carpa do lago do parque (peixe) e guaxinim travesso à noite (criatura da noite **mansa** da 013: olhos que brilham, faz "trrr" e foge, nunca ataca).
- **Gato domado com peixe:** hoje a raposa de todo tema é domada com frutinhas. Na cidade, o tema diz a comida de domar (`EstiloMundo.domar?: 'frutinhas' | 'peixe'`, passa pelo `estiloSeguro`); sem o campo, frutinhas como hoje. Pergunta ao dono (recomendo; é pequeno e não muda os outros temas).
- **Bichos preferem calçada e parque** (a rua custa mais no passeio), e moradores atravessam na faixa.

## Som e música (o caminho da 019)
- **Trilha:** jazz leve de piano e baixo acústico, com vassourinha bem baixinha, composta por nós e gravada do mesmo jeito da 019 (partitura em código → FluidSynth com FluidR3_GM, licença MIT → MP3 64 kbps mono). Camadas como os outros temas: base (baixo andando, vassourinha, piano acompanhando), dia (melodia de piano, duas versões), entardecer (vibrafone em sextas), noite (piano e vibrafone, mais lento), amigos (estalo de dedos e chimbal), andar (escovinha), chuva (piano agudo, gotinhas). Sem camada de perigo (o guaxinim é manso).
- **Volume:** a régua da 019: mistura "dia" em -24,6 dBFS RMS, noite perto de -27,5, sempre abaixo dos efeitos e das vozes. A amostra do esboço mede -25,9 LUFS contra -25,5 do Rancho de hoje (a cidade fica um pouco mais baixa). O controle "Música" de Configurações continua valendo.
- **Vozes gravadas** (CC0 e domínio público, régua de -23 dB): pombo, gato, cachorro grande, guaxinim (não há gravação livre de guaxinim: chilreio de porquinho-da-índia mais grave com um trinado nosso), carpa (bolhas), moradores da cidade, o "hum?" e o "ta-dá" do pedreiro.
- **Ambiente:** passarinho de praça de dia, grilo de jardim à noite, buzininha de brinquedo ao longe (síntese nossa, rara: uma a cada 40 a 90 s), o "fom-fom" dos carrinhos perto. Tudo curto, nunca em laço.
- **Pacotes:** `public/sons/pacotes/cidade-grande-musica.mp3` e `cidade-grande-vozes.mp3`, com a entrada em `public/sons/indice.json`; metas da 019 (menos de 15 MB de memória e 2 MB de download para a música, baixa só ao entrar no tema, o mundo nunca espera). Fontes e scripts em `referencia/fontes/` (os da amostra já estão lá, com `creditos.json`).

## Desempenho (orçamento)
- **Meta:** 45 quadros no celular no centro da cidade (esquina do parque, de dia e de noite), 60 no computador, e pelo menos 45 com a CPU 4× mais lenta.
- **Regra do celular** (`src/render/resolucao.ts`, correção de 12 nov): a nitidez nunca cai abaixo da resolução de CSS; sem folga, primeiro saem os efeitos (bloom, brilho, sombra fina). A cidade tem que caber nisso: não pode contar com a imagem borrada para chegar aos 45.
- **Orçamento à vista no centro (raio de 3 chunks, o padrão):** até 250 mil triângulos, até 120 chamadas de desenho, malha de um chunk de prédios em até 12 ms no trabalhador.
- **Como cabe:** janela é bloco com recorte, nunca transparência; o miolo dos prédios é fechado (paredes e pisos opacos escondem o que está atrás, e a malha não desenha face entre dois blocos opacos); prédios de 6 andares só nas esquinas do parque (no máximo 8 por cidade); janela acesa brilha sem espalhar luz; fantasmas da obra, veículos e horizonte em instâncias; árvores de rua com peças fundidas.
- **Se não couber:** primeiro os andares de cima dos prédios altos viram "fechados" (só a escada e o terraço visitáveis); depois a cidade encolhe para 4 × 4 quarteirões; por último, a altura máxima vira 5 andares (só com o dono).
- **Medido:** `e2e/desempenho-brinquedo.spec.ts` ganha a cidade (centro de dia, de noite, com 5 veículos e um canteiro aberto), na GPU (`scripts/e2e-gpu.sh`) e com a CPU 4× mais lenta; e conferência no iPhone do dono.

## Ferramenta para os prédios: MagicaVoxel ou plantas em código (T01)
- **O formato do jogo é um só:** cada planta (prédio ou obra) é uma lista de camadas de texto, uma por altura, com uma letra por bloco (`T` tijolo, `J` janela, `.` ar...), em `src/world/plantas/`. O planejador gira e combina as plantas. Os blocos são de verdade e iguais no servidor.
- **A validação:** fazer a mesma casa geminada de 3 andares das duas formas: (a) em texto, à mão; (b) no MagicaVoxel (pelo dono ou por quem tiver o programa), com um script `scripts/vox-para-planta.ts` que lê o arquivo `.vox` (formato aberto, simples de ler) e escreve a planta em texto, com uma paleta que liga cor a bloco.
- **Comparar:** tempo para fazer, tempo para mudar (trocar uma janela, subir um andar), se dá para revisar a mudança lendo o código, e se a planta convertida sai igual à escrita.
- **Recomendação:** plantas em texto. São 5 modelos de prédio e 6 obras pequenas, com regras (escada, porta, janelas) que o código repete melhor que o desenho, e o MagicaVoxel só ajuda se o dono quiser desenhar. Se ele preferir desenhar, o conversor fica e as plantas desenhadas viram texto do mesmo jeito.

## Capricho na experiência (para não frustrar)
Medidas que precisam passar antes de fechar:
- **Ver o que fazer em 10 s:** ao nascer, o canteiro, os fantasmas e o pedreiro estão à vista (20 de 20 sementes testadas; captura automática).
- **Ganhar a colher sem ler:** a até 8 blocos do pedreiro ela chega sozinha na mão, em até 3 s (teste de tela, no computador e no toque).
- **Primeira obra em até 2 minutos** (casinha do cachorro) num ritmo de criança (um toque a cada 6 s, 1,2 toque por bloco em média), e as três primeiras em até 15 minutos.
- **Nenhum toque perdido:** no toque, 100% dos toques a até meio bloco de um fantasma alcançável enchem um fantasma (teste com toques espalhados em volta de cada célula das 6 plantas).
- **Toda célula alcançável:** para as 6 plantas, cada célula fica ao alcance de algum lugar em pé (chão ou andaime). Teste de unidade.
- **Bloco errado nunca é gasto,** o balão do bloco certo aparece em até 200 ms e não se repete mais que uma vez a cada 3 s.
- **Sem texto obrigatório:** o caminho inteiro (ganhar a colher, encher, festa, próxima obra) funciona só com desenho, gesto e som; revisado jogando de verdade com o texto escondido.
- **Festa curta e que não trava:** até 6 s, o controle continua; o som da festa fica abaixo do teto da régua.
- **Duas crianças na mesma célula:** um bloco só, nada pisca (`tests/nucleo/canal.test.ts`), e as duas entram na lista de ajudantes se cada uma pôs algum bloco.
- **Carrinhos (se entrarem):** em 1 hora simulada com bots parados e andando na rua, nenhum veículo chega a menos de 1 bloco de ninguém, nenhum nó no cruzamento, nenhum fica parado sem motivo; buzina no máximo uma vez a cada 6 s por veículo.
- **Desempenho:** 45 quadros no centro no celular (ver "Desempenho").
- **Rodada em família** na cidade, no computador e no celular, antes de fechar.

## Critérios de qualidade (definição de pronto)
1. **Planejador da cidade** determinístico e igual no servidor; grade, parque, zonas, lotes com porta e escada até o terraço; terreno plano; nascimento ao lado do primeiro canteiro; os sete temas de hoje sem nenhum bloco diferente.
2. **Prédios** dos 5 modelos, de 2 a 6 andares, todos visitáveis; interiores de pelo menos 5 × 5; câmera de terceira pessoa sem vulto.
3. **Canteiro** no núcleo e no cliente: células de obra, colher, bloco certo e errado, ímã de toque, progresso, festa, placa com os nomes, obra que ganha vida, recompensas, próxima obra; salvar e reabrir; mundos antigos; testes de núcleo, multijogador (modo nuvem, duas crianças na mesma célula, sala que dorme e acorda igual, `servidor/testes/salas.test.ts`) e de tela.
4. **Proteção (016):** a obra aberta só aceita o bloco da planta; a feita é estrutura do mundo; a pista não aceita bloco; avisos e cadeado.
5. **Pele completa** do tema coberta pelos testes de tema (`tests/temas/cobertura.test.ts` e os demais): céu, água, nomes, texturas, bichos, moradores, música, vozes.
6. **Som:** trilha e vozes gravadas no pacote do tema, na régua de volume da 019; créditos com as licenças.
7. **Carrinhos e ônibus** (se o bloco entrar): simulação no núcleo, evento e previsão, as regras de gente e bicho na rua, 1 hora simulada sem nó, desempenho medido.
8. **Horizonte** desenhado e medido.
9. **Desempenho medido** no centro (computador, CPU 4× mais lenta e celular) dentro do orçamento.
10. **Capturas** de dia e de noite, de perto (moradores, bichos, carrinhos, obras), a vitrine e a foto do tema.
11. **Nada quebra:** os sete temas e os mundos salvos continuam iguais; todos os testes passam (vitest e e2e na GPU); paridade gravada sem mudança.
12. **Auditoria independente** ao fim, com os achados corrigidos (inclui a revisão de nomes e marcas da 020).
13. **Rodada em família** na cidade.
14. **Relatório visual** publicado ao fechar.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Validação MagicaVoxel × plantas em texto com uma casa geminada de 3 andares (`src/world/plantas/`, `scripts/vox-para-planta.ts` se valer); decisão anotada aqui |
| T02 | Blocos e itens novos: registro em `src/world/blocks.ts` (84 em diante), texturas em `src/art/tiles.ts`, nomes nos 7 temas de hoje, colher de pedreiro, peças de brinquedo (poste, placa), ícones, mão e chão |
| T03 | Planejador `planta: 'cidade'` (`src/world/cidade.ts`, `src/world/povoado.ts`, `src/world/chunk.ts`): malha, zonas, lotes, terreno plano e rampa, nascimento, estrutura rara; `estiloSeguro`; proteção da cidade em `src/world/protecao.ts`; paridade dos sete temas |
| T04 | Prédios: os 5 modelos em plantas, escadas, apartamentos, janelas acesas, caixa d'água, escada de incêndio, entrada do metrô; medida de malha e de quadros já aqui |
| T05 | Canteiro no núcleo: as 6 plantas de obra, classe `OBRA` e `planejado`, `permissao.ts`, colocar com a colher e com o bloco certo, `extras.obras`, `definirObrasFeitas`, ajudantes, evento `obra`, saneamento, `VERSAO_REDE`; testes local e nuvem |
| T06 | Canteiro no cliente: fantasmas em instâncias, pulso da camada, bloco na mira, ímã de toque, bloco errado (balão, pisca da barra), progresso, festa, placa, obra que ganha vida, pedreiro que acena, entrega a colher e vai para a próxima obra |
| T07 | Diário ("Obras da cidade"), recompensas (capacete e colete, 017), trocas do pedreiro |
| T08 | Tema Cidade Grande (`src/temas/cidade-grande/`, registrado em `src/temas/todos.ts`): céu (pôr do sol atrás dos prédios, janelas acesas), água, terreno, nomes, texturas, moradores e bichos desenhados à mão, gato domado com peixe (`EstiloMundo.domar`), guaxinim manso, foto e cartão do tema |
| T09 | Som: partitura em camadas, gravação, pacotes, vozes, ambiente (buzininha ao longe, passarinho, grilo), créditos, régua de volume |
| T10 | Horizonte de torres ao longe, com medida |
| T11 | Testes de tela: lista única de temas, canteiro no computador e no toque, duas crianças na nuvem, capturas |
| T12 | **Veículos, núcleo** (bloco cortável): circuitos do planejador, simulação em `s`, reserva de cruzamento, olhar à frente, paradas do ônibus, evento `veiculo`, sala que dorme; 1 hora simulada |
| T13 | **Veículos, cliente** (bloco cortável): `src/jogo/veiculos.ts` compartilhado, peças de táxi e ônibus, rodas, instâncias, perto e longe, colisão com o boneco, buzina e aceno, câmera |
| T14 | **Veículos, testes e medida** (bloco cortável): bots na rua, celular, CPU 4× mais lenta |
| T15 | Desempenho final, vitrine, auditoria independente, publicação (site e servidor juntos), rodada em família e relatório visual |

Ordem: T01 primeiro (decide a ferramenta); T02 a T04 abrem a cidade; T05 a T07 são o coração (o canteiro); T08 a T11 completam o tema. O bloco T12 a T14 vem depois do canteiro pronto e pode ser cortado ou adiado sem mexer no resto.

## Riscos
- **Desempenho no celular** (o maior): prédios altos, muitas janelas e interiores. Orçamento e plano B em "Desempenho"; medir já na T04, antes do tema completo.
- **Câmera de terceira pessoa dentro dos prédios:** cômodos de 5 × 5 e pé-direito de 3 livres; captura dentro de cada modelo.
- **Terreno plano da cidade** mexe na geração só do tema da cidade; os outros sete conferidos bloco por bloco.
- **Obra no multijogador:** a célula de obra vale no núcleo e no cliente com a mesma regra (lição 5); duas crianças na mesma célula testadas no modo nuvem.
- **Muito trabalho de arte:** 17 texturas, 5 modelos de prédio, 6 obras, 3 moradores, 5 bichos, 2 veículos. Divide-se por tarefa.
- **Veículos** (ver "Complexidade"): é o pedaço mais arriscado e por isso é um bloco separado.
- **Propriedade intelectual** (020): nada de prédio famoso, marca, logotipo ou nome de verdade; conferido na auditoria.

## Perguntas ao dono (antes de começar)
1. A obra feita é da cidade (blindada, com o nome de quem fez na placa) e não da criança. Pode ser assim?
2. A colher de pedreiro enche os fantasmas sem gastar material, também na sobrevivência. Pode?
3. Carrinhos e ônibus: entrar na versão mínima (4 táxis e 1 ônibus em circuitos fixos, depois do canteiro, bloco cortável) ou deixar para uma spec própria?
4. Horizonte de torres ao longe: entra?
5. Rio com ponte fica para depois (nesta etapa, lago no parque)?
6. Plantas em texto em vez de MagicaVoxel, se a validação da T01 confirmar?
7. Blocos novos com a mesma textura nos outros temas (só o nome muda)?
8. Gato domado com peixe só na cidade?
9. Sem elevador nesta etapa?

## Decisões do dono
- 7 nov 2026: os nomes "Cidade Grande" e "Rancho Alegre"; começar pelo Rancho; bichos da noite fofos que não atacam.
- 10 nov 2026: a cidade nasce com a atividade dela; sem Blender, MagicaVoxel só se ajudar de verdade.
- 12 nov 2026: prédios de 2 a 6 andares; atividade = canteiro de obras; jeito de Manhattan sem copiar; carrinhos e ônibus, se não ficar complexo demais.
