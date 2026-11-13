---
id: 014-cidade-grande
title: 'Cidade Grande: prédios de visitar, ruas e praças, e o canteiro de obras'
status: APPROVED
approved_at: 2026-11-12
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

**Esboço aprovado em 12 nov 2026:** `referencia/cidade.html` e `referencia/veiculos.html` (rodada 2): o canteiro passo a passo, as plantas das obras, um prédio, uma quadra vista da calçada, o horizonte, os carrinhos no cruzamento e os sons para ouvir. As fotos do esboço são do motor de verdade, num palco só para isso: `src/esboco/cidade.ts` (carregado só com `?esboco=cidade`, num pedaço à parte que o jogo nunca baixa) e as capturas de `e2e/esboco-cidade.spec.ts` (`ESBOCO_CIDADE=1`, na GPU). Texturas e peças do palco são provisórias; as de verdade vêm da T02 em diante.

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
- **10 nov 2026:** sem Blender. **12 nov 2026:** sem MagicaVoxel também; as plantas são escritas em código, como as do sítio, e paramétricas (ver "Plantas dos prédios em código").
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
- **Recompensa:** na primeira obra, o **capacete amarelo de obra**; ao terminar as seis, festa maior com fogos de brinquedo e o **colete laranja**. As duas são peças de fantasia da 017, ganhas uma vez na cidade e usáveis em qualquer mundo, como um troféu (ver "Recompensas do canteiro"). Cada obra também cola uma figurinha no diário do mundo (capítulo novo "Obras da cidade", `src/jogo/diario.ts`).
- **A próxima obra:** o pedreiro anda até o próximo canteiro e acena de lá. Ficam dois canteiros abertos de cada vez, na ordem das plantas.

### As plantas das obras (6, da mais fácil para a maior)
| # | Obra | Tamanho | Blocos | Tempo de criança (1 bloco a cada 6 s) |
|---|---|---|---|---|
| 1 | Casinha do cachorro | 3 × 3 × 3 | 23 | ~2,5 min |
| 2 | Banca de frutas com toldo | 3 × 2 × 3 | ~16 | ~1,5 min |
| 3 | Ponto de ônibus (banco, teto, placa) | 4 × 2 × 4 | 20 | ~2 min |
| 4 | Sorveteria de esquina (com toldo) | 4 × 5 × 4 | 54 | ~5,5 min |
| 5 | Casinha com porta e janela | 5 × 5 × 5 | ~70 | ~7 min |
| 6 | Coreto da praça (para fazer junto) | 6 × 6 × 5 | ~60 | ~6 min |

As plantas usam blocos que já existem ou entram nesta spec (tijolo, tábua, vidro, laje, cerca, porta, toldo, placa). As contas das obras 1, 3 e 4 são as do esboço; as outras saem da T05.

### Recompensas do canteiro (decisão do dono, 12 nov 2026)
O capacete amarelo e o colete laranja viram **peças de fantasia da 017**: desbloqueiam uma vez, na cidade, e a criança veste em qualquer mundo, como um troféu. É só aparência, não é progresso: inventário e progresso continuam por mundo.
- **Onde fica gravado:** junto da aparência do personagem (`src/personagem/persistencia.ts`, chave `terrario:aparencia`), num campo novo `desbloqueios: string[]` (ids conhecidos, como `capacete-obra` e `colete-obra`; `normalizarAparencia` em `src/personagem/aparencia.ts` joga fora o que não conhece e limita a 16). Mundos e personagem continuam separados: apagar ou trocar de mundo não tira o desbloqueio.
- **Quando desbloqueia:** o núcleo do mundo da cidade manda o evento `obra` com `recompensa` para cada ajudante, quando a obra termina (no aparelho e na nuvem, o núcleo é quem decide). O cliente grava o desbloqueio na aparência e mostra a festa da 017 ("Ganhou o capacete de obra!").
- **No servidor:** o que vai pela rede é só o que está vestido, no comando `aparencia` de sempre, com o mesmo saneamento (`sanearAparencia` em `src/nucleo/saneamento.ts`: até 4096 caracteres e `normalizarAparencia`). As duas peças são peças conhecidas do catálogo e cabem com folga no limite (o teste `tests/nucleo/aparencia-limite.test.ts` ganha o caso com as duas). A lista de desbloqueios não viaja e o servidor não confere: é um enfeite, e o pior que pode acontecer é alguém vestir um capacete sem ter feito obra.
- **Na aba de fantasias, antes de ganhar:** as duas peças aparecem como silhueta cinza com um cadeadinho e um desenho do canteiro; tocar mostra "Ganhe no canteiro da cidade" (texto curto e o desenho, para quem não lê). Depois de ganhar, a silhueta vira a peça colorida, com um brilho na primeira vez.
- **Testes:** `normalizarAparencia` guarda os desbloqueios conhecidos e joga fora os outros; a aba só deixa vestir peça desbloqueada; o núcleo manda a recompensa para cada ajudante ao terminar a obra (local e nuvem); a aparência com as duas peças passa no saneamento e no limite; teste de tela: ganhar o capacete na cidade, abrir um mundo da Bruma e vestir.

### Quem é dono da obra (regras da 016)
- **A obra é da cidade, não de quem fez.** Enquanto está aberta, cada célula da planta é uma célula de **obra**: só aceita o bloco da planta (é o "conserto" que a 016 já prevê para a estrutura, `gerado`), e o bloco que entra já fica blindado. Ao terminar, a obra vira **estrutura do mundo**, protegida como qualquer prédio: ninguém quebra, nem quem construiu, nem o dono do mundo. As portas e o banco dela são usáveis por todos.
- **Por quê:** a criança não perde a obra por engano nem por um amigo, e a obra feita é igual às outras construções da cidade (a mesma máscara de proteção, o mesmo cadeadinho na mira). O crédito fica na placa e no diário.
- **Como fica gravado:** `extras.obras` (opcional) guarda, por canteiro, as células já cheias, os ajudantes e se terminou. A geração (`pintarEstruturas` em `src/world/chunk.ts`) pinta a obra terminada como parte da cidade (sem tapume nem andaime), do mesmo jeito que os povoados leem as regiões sem povoado hoje (`definirObrasFeitas(ids)`, ao lado de `definirRegioesSemPovoado` em `src/world/povoado.ts`). Ao terminar, as edições das células da obra deixam de ser necessárias e são limpas.
- **Proteção:** `src/world/protecao.ts` ganha a classe `OBRA` (célula da planta ainda vazia: aceita só o bloco da planta; cheia: não quebra) e a função `planejado(x, y, z)`; `src/jogo/permissao.ts` (`recusaColocar`, `recusaQuebrar`) usa as duas, no núcleo e no cliente. O andaime e o tapume são `ESTRUTURA` enquanto a obra está aberta. Aviso: "Essa obra é da cidade. Que tal ajudar a construir?".

## Carrinhos e ônibus (bloco de tarefas separado, pode ser cortado)
Pedido do dono em 12 nov 2026: carrinhos e ônibus de blocos, com rodas redondas, que ninguém quebra, que andam sozinhos certinho pelas ruas, param nos cruzamentos e para as pessoas, e com as colisões pensadas. "Se ficar complexo demais, revemos."

### Decidido no esboço dos veículos (rodada 2, 12 nov 2026)
- **Visual:** a versão 3 ("com carinha") de `referencia/veiculos.html`: carroceria arredondada de plástico de brinquedo, faróis que são olhinhos, sorriso cromado, bochechas. Sem chave de corda e sem tique-tique de corda.
- **A família:** táxi amarelo, carro de polícia (**preto e branco**, decisão do dono de 12 nov 2026; no esboço aparece branco e azul; de brinquedo: estrelinha na porta e giroflex que pisca macio, nada de bravo), carro comum (um modelo só, em 4 cores), dois ônibus (azul e branco com a faixa longa de janelas, e o verde), e o carrinho de sorvete, que estaciona na praça e toca uma musiquinha original.
- **Som do motor:** de verdade, a partir de gravações CC0 (marcha lenta de um carro a gasolina, um diesel para o ônibus, uma van para o sorvete), lidas com a rotação de uma curva de RPM: arrancar, trocar de marcha, rodar, soltar o pedal, reduzir e parar; freio a ar no ônibus. Bem baixinho, some com a distância, no máximo 3 motores ao mesmo tempo.
- **Polícia:** nada de sirene. Um "uí-uí" de brinquedo, curto e baixinho, raro (uma vez ao passar pela praça), e o giroflex piscando (pergunta ao dono na página dos veículos).
- **Carrinho de sorvete:** a musiquinha é composta por nós (caixinha de música), não lembra nenhuma música de carro de sorvete conhecida. Ao chegar à praça, toca inteira uma vez; parado, toca uma frase curta (uns 8 s) de vez em quando, no máximo a cada 90 a 120 s e só com uma criança a até uns 20 blocos. Some com a distância e fica sempre abaixo da trilha da cidade.

### Respostas do dono à rodada 2 (12 nov 2026)
1. **Polícia:** um "uí-uí" de brinquedo ao passar pela praça e o giroflex piscando.
2. **A polícia é preta e branca** (não branca e azul; o esboço não foi refeito).
3. **As quatro cores do carro comum** (coral, verde-água, lilás, laranja) estão aprovadas.
4. **Os dois ônibus rodam,** cada um na sua volta.
5. **Sons e volumes dos motores aprovados** como na rodada 2 ("agora ficou perfeito os sons"; o volume "no ponto, perfeito").
6. **Musiquinha do sorvete** (o dono deixou o detalhe conosco; decisão nossa): inteira uma vez ao chegar à praça; depois uma frase de uns 8 s de vez em quando, no máximo a cada 90 a 120 s, só com criança a até uns 20 blocos, sempre abaixo da trilha.

### Versão mínima proposta para a 014
- **A frota por cidade:** 2 táxis, 2 carros comuns, 1 polícia, 2 ônibus (cada um na sua volta) e 1 carrinho de sorvete (ele só vai e volta da praça). Cada um anda num **circuito fixo**: uma volta retangular em volta de um ou dois quarteirões, sempre pela mão da direita. O ônibus tem 3 paradas (uma delas é o ponto de ônibus da obra 3, quando estiver pronto).
- **Devagar:** 3 blocos por segundo no reto (a criança anda a 4,3 e corre a 7), freando e acelerando suave.
- **Cruzamento:** o cruzamento é reservado por um veículo de cada vez. Um veículo só entra se o cruzamento estiver livre **e** houver lugar para ele do outro lado (assim nunca para no meio e nunca dá nó). Na faixa de pedestre, para se tiver alguém nela.
- **Fila:** na mesma faixa, cada veículo mantém 2 blocos de distância do da frente.

### Só nas pistas (regra do dono, 12 nov 2026: muito importante)
Os veículos andam só nas pistas feitas para eles. Nunca na calçada, na praça, no parque, no gramado ou no canto da faixa de pedestre, e nunca cortando a esquina por cima do meio-fio.
- **Rotas só do grafo de pistas do planejador** (`src/world/cidade.ts`): o caminho é o centro da faixa, e as curvas são arcos que ficam dentro do asfalto do cruzamento (raio escolhido para a caixa do veículo inteira caber na faixa, inclusive o ônibus).
- **A caixa de colisão fica sempre dentro da faixa:** nas retas e nas curvas, com folga de pelo menos um quarto de bloco para o meio-fio.
- **Nada tira um veículo do caminho:** nem criança, nem bicho, nem outro veículo. Ele só para e espera; nunca é empurrado nem desvia para a calçada.
- **O carrinho de sorvete estaciona numa vaga pintada na rua**, na beira da praça (uma reentrância de asfalto do planejador), nunca dentro da praça.
- **Quando encalha** (60 s parado sem motivo), o veículo some e volta no começo de uma faixa, fora da vista da criança; nunca atravessa a calçada para voltar.
- **Ninguém constrói nas pistas:** o asfalto das faixas é `PASSAGEM` (016), então nenhum bloco entra ali.
- **Testes:** um teste de unidade percorre cada rota inteira (uma volta completa) em passos pequenos e confere que cada ponto do caminho e cada roda de cada veículo cai numa célula de asfalto dentro da faixa dele; e um teste de tela de um minuto de veículos andando confere o mesmo nas posições reais, quadro a quadro.

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
- **Modelos** (ver `referencia/veiculos.html`): o carro da família (táxi, polícia e carro comum são o mesmo modelo, com peças a mais e outra cor), os dois ônibus e o carrinho de sorvete. Faróis-olhinhos que acendem de noite, rodas redondas com calota.
- **Meta por modelo:** carro até 3.500 triângulos e ônibus até 4.500; carroceria fundida com a cor nos vértices (como a tinta das fantasias da 017), rodas em instâncias e faróis à parte: 3 chamadas de desenho por modelo, para todos os veículos daquele modelo. Os 8 veículos da frota: até uns 30 mil triângulos e 12 chamadas na cena; longe (mais de 30 blocos), uma versão simples de uns 400 triângulos.
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
- **Cor e névoa (decisão do dono, 12 nov 2026, T12):** de três variantes, a "forte": de dia as torres puxam para um ardósia azulado, com silhueta firme e as janelas à vista, sempre um pouco mais claras e azuis que os prédios de perto; no entardecer a névoa quente manda, de noite ficam as janelas acesas. A névoa das torres caiu de 0,8 para 0,34 da do mundo (com 0,8 elas sumiam no céu como fumaça).
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

**Só na cidade** (decisão do dono, 12 nov 2026; ver "Só na Cidade Grande"): os blocos e itens novos não aparecem nos outros temas.

## Só na Cidade Grande (decisão do dono, 12 nov 2026)
Tudo o que esta spec cria é da Cidade Grande e não vai para os outros mundos: prédios, veículos, blocos novos, o canteiro de obras, o horizonte, o carrinho de sorvete, os sons e a música da cidade. É a linha da 018: cada mundo com o seu tema e a sua atividade.
- **Como fica garantido:**
  - o tema diz o que é só dele: `TemaDef.exclusivos` (lista de blocos e itens), e o tema da cidade lista os blocos novos (84 em diante), a colher de pedreiro e as peças de brinquedo da cidade;
  - **geração:** só o planejador `planta: 'cidade'` põe esses blocos; os outros temas nunca os geram (a paridade dos sete temas continua bloco por bloco);
  - **trocas:** as trocas do construtor com tijolo, vidro, toldo e colher só existem no tema da cidade (`src/jogo/trocas.ts` filtra por `exclusivos`);
  - **criativo e receitas:** o inventário do criativo e o livro de receitas dos outros temas não mostram os exclusivos (`src/jogo/catalogo.ts` filtra pelo tema do mundo);
  - **nomes e texturas:** os outros temas não precisam nomear nem pintar os exclusivos (o teste `tests/temas/cobertura.test.ts` pula os exclusivos de outro tema);
  - **canteiro e veículos:** existem só no planejador e no núcleo do mundo da cidade (`planta: 'cidade'`).
- **Cada mundo é uma história separada** (decisão do dono, 12 nov 2026), como no Minecraft: inventário, sobrevivência, ponto de nascer e progresso são gravados por mundo (já é assim no núcleo, `src/nucleo/nucleo.ts`, e no mundo salvo). Nada passa de um mundo para outro, então um item da cidade nunca chega a outro mundo e não há regra para isso. Teste novo: depois de jogar na cidade com tijolo, colher e blocos novos no inventário, um mundo de outro tema abre sem nenhum deles, e o criativo e as trocas desse mundo não os mostram.
- **O que viaja entre mundos** continua sendo só o personagem: aparência, nome e fantasias (017). As recompensas do canteiro entram aí (ver "Recompensas do canteiro").

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

## Plantas dos prédios em código (decisão do dono, 12 nov 2026)
- **Sem MagicaVoxel e sem conversor:** as plantas (prédios e obras) são escritas em código, como as do sítio (`src/world/sitio.ts`), em `src/world/plantas/`.
- **Formato:** uma lista de camadas de texto por andar-tipo, uma letra por bloco (`T` tijolo, `J` janela, `P` porta, `E` escada, `.` ar...), e funções que montam o prédio a partir delas.
- **Paramétricas, para dar variedade:** número de andares (2 a 6, repetindo o andar-tipo), cor da porta e do toldo, espelhado (porta e escada de incêndio do outro lado), caixa d'água sim ou não, loja no térreo sim ou não. O planejador sorteia os parâmetros por lote (com `hash2`, determinístico e igual no servidor).
- **Testes:** cada modelo com cada combinação de parâmetros tem porta, escada até o terraço, interior de pelo menos 5 × 5 e nenhum bloco fora do lote; uma casa geminada de 3 andares de referência fica gravada como teste de regressão.

## Capricho na experiência (para não frustrar)
Medidas que precisam passar antes de fechar:
- **Ver o que fazer em 10 s:** ao nascer, o canteiro, os fantasmas e o pedreiro estão à vista (20 de 20 sementes testadas; captura automática).
- **Ganhar a colher sem ler:** a até 8 blocos do pedreiro ela chega sozinha na mão, em até 3 s (teste de tela, no computador e no toque).
- **Primeira obra em até 3 minutos** (casinha do cachorro, 23 blocos) num ritmo de criança (um toque a cada 6 s, 1,2 toque por bloco em média), e as três primeiras em até 15 minutos.
- **Nenhum toque perdido:** no toque, 100% dos toques a até meio bloco de um fantasma alcançável enchem um fantasma (teste com toques espalhados em volta de cada célula das 6 plantas).
- **Toda célula alcançável:** para as 6 plantas, cada célula fica ao alcance de algum lugar em pé (chão ou andaime). Teste de unidade.
- **Bloco errado nunca é gasto,** o balão do bloco certo aparece em até 200 ms e não se repete mais que uma vez a cada 3 s.
- **Sem texto obrigatório:** o caminho inteiro (ganhar a colher, encher, festa, próxima obra) funciona só com desenho, gesto e som; revisado jogando de verdade com o texto escondido.
- **Festa curta e que não trava:** até 6 s, o controle continua; o som da festa fica abaixo do teto da régua.
- **Duas crianças na mesma célula:** um bloco só, nada pisca (`tests/nucleo/canal.test.ts`), e as duas entram na lista de ajudantes se cada uma pôs algum bloco.
- **Carrinhos (se entrarem):** em 1 hora simulada com bots parados e andando na rua, nenhum veículo chega a menos de 1 bloco de ninguém, nenhum nó no cruzamento, nenhum fica parado sem motivo; buzina no máximo uma vez a cada 6 s por veículo.
- **Desempenho:** 45 quadros no centro no celular (ver "Desempenho").
  - **Medido na T11 (12 nov 2026, GPU, CPU 4× mais lenta, centro da cidade):** celular 56–59 parado e 51–58 girando; computador 53–55 parado. **Lacuna conhecida, aceita pelo coordenador:** o computador girando a câmera sem parar fica em 42 (meta 45); o que sobra em movimento é o mapa de sombras (refeito um quadro sim, um não) e o brilho de todos os chunks, e as saídas encontradas tiram algo da tela (sombra das plantas, raio de sombra menor, brilho só perto). Detalhes em `medidas.md` do relatório da T11.
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
15. **Veículos só nas pistas:** o teste de unidade das rotas (cada ponto e cada roda numa célula de asfalto da faixa, numa volta completa de cada rota, curvas incluídas) e o teste de tela de um minuto andando passam; o carrinho de sorvete para na vaga da rua; nenhum veículo é empurrado nem volta pela calçada.
16. **Só na cidade:** nenhum bloco, item, troca, receita, canteiro ou veículo da cidade aparece em outro tema (geração, criativo, trocas, receitas); teste de que um mundo de outro tema abre sem os itens da cidade que a criança tinha na cidade (cada mundo é uma história separada).
17. **Recompensas como fantasia:** capacete e colete desbloqueiam na cidade, ficam gravados na aparência e vestem em qualquer mundo; silhueta com cadeado antes; saneamento e limite da aparência na nuvem.

## Fases e tarefas
Ordem final para implementar (12 nov 2026): primeiro o planejador, os prédios e o coração do canteiro; o tema e o som em seguida; os veículos são o último bloco e podem ser cortados sem mexer no resto.

| # | Tarefa |
|---|---|
| T01 | Plantas paramétricas em código (`src/world/plantas/`): camadas em texto, parâmetros (andares, cores da porta e do toldo, espelho, caixa d'água, loja), a casa geminada de 3 andares de referência e os testes de forma |
| T02 | Blocos e itens da cidade (84 em diante, `src/world/blocks.ts`), texturas de verdade em `src/art/tiles.ts`, colher de pedreiro, peças de brinquedo (poste, placa, toldo, tapume); `TemaDef.exclusivos` e o filtro na geração, nas trocas, no criativo e nas receitas dos outros temas |
| T03 | Planejador `planta: 'cidade'` (`src/world/cidade.ts`, `povoado.ts`, `chunk.ts`): malha, zonas, lotes, terreno plano e rampa, nascimento ao lado do canteiro, estrutura rara, grafo de pistas e a vaga do sorvete; `estiloSeguro`; proteção da cidade (`protecao.ts`, pistas como `PASSAGEM`); paridade dos sete temas |
| T04 | Prédios: os 5 modelos com as plantas da T01, escadas, apartamentos, janelas acesas sem espalhar luz, caixa d'água, escada de incêndio, entrada do metrô; medida de malha e de quadros |
| T05 | Canteiro no núcleo: as 6 plantas de obra, classe `OBRA` e `planejado`, `permissao.ts`, colocar com a colher e com o bloco certo, `extras.obras`, `definirObrasFeitas`, ajudantes, evento `obra` com recompensa, saneamento, `VERSAO_REDE`; testes local e nuvem |
| T06 | Canteiro no cliente: fantasmas em instâncias, pulso da camada, bloco na mira, ímã de toque, bloco errado, progresso, festa, placa, obra que ganha vida, pedreiro que acena, entrega a colher e vai para a próxima obra |
| T07 | Diário ("Obras da cidade"), capacete e colete como peças de fantasia da 017 (desbloqueio na aparência, silhueta com cadeado, saneamento e limite), trocas do pedreiro |
| T08 | Tema Cidade Grande (`src/temas/cidade-grande/`): céu da cidade, água, terreno, nomes, moradores e bichos desenhados à mão, gato domado com peixe (`EstiloMundo.domar`), guaxinim manso, foto e cartão do tema (troca o céu e os moradores provisórios do Rancho) |
| T09 | Som da cidade: trilha em camadas, pacotes, vozes, ambiente (buzininha ao longe, passarinho, grilo), créditos, régua de volume |
| T10 | Horizonte de torres ao longe, com medida |
| T11 | Testes de tela e de regra da cidade: lista única de temas, canteiro no computador e no toque, duas crianças na nuvem, "só na cidade" e "cada mundo é uma história", fantasia ganha na cidade vestida noutro mundo, capturas |
| T12 | Fechamento da cidade: desempenho no celular, vitrine, auditoria independente, publicação (site e servidor juntos), rodada em família e relatório visual |
| T13 | **Veículos, núcleo** (bloco cortável): rotas do grafo de pistas com curvas em arco, simulação em `s`, reserva de cruzamento, olhar à frente, paradas dos dois ônibus, sorvete na vaga, evento `veiculo`, sala que dorme; teste das rotas só no asfalto; 1 hora simulada |
| T14 | **Veículos, cliente e sons** (bloco cortável): `src/jogo/veiculos.ts` compartilhado, a família da carinha (carro em 4 cores, táxi, polícia preta e branca, dois ônibus, sorvete), instâncias, perto e longe, faróis e giroflex, colisão com o boneco, motores com curva de RPM, buzinas, "uí-uí", musiquinha do sorvete com a regra de tocar |
| T15 | **Veículos, testes, medida e publicação** (bloco cortável): teste de tela de um minuto andando só nas pistas, bots na rua, celular e CPU 4× mais lenta, auditoria, publicação e relatório |

Se o bloco dos veículos for cortado ou adiado, a cidade fecha e é publicada na T12.

## O que o esboço tem de provisório (a implementação troca pelo de verdade)
- **Texturas pintadas por cima das lãs** (asfalto, faixa, zebra, pedra marrom, janela, pedra creme, friso dourado) e o cristal-luz como janela acesa: viram os blocos 84 em diante, com textura própria (T02).
- **Céu, luz e moradores do Rancho Alegre** (o pedreiro é o carpinteiro do Rancho de capacete; o cachorro é o do sítio; vacas e galinhas escondidas): viram o tema da cidade (T08).
- **Janelas acesas que espalham luz** pela fachada e pela rua: no jogo, a janela acesa brilha e não espalha luz (T04).
- **Peças do palco** (fantasmas, tapume, andaime, postes, toldos, escada de incêndio, placa, horizonte e veículos montados peça por peça): viram peças fundidas e instanciadas dentro do orçamento (T04, T06, T10, T14).
- **O palco em si** (`src/esboco/`, `?esboco=cidade` e `?esboco=veiculos`, `e2e/esboco-*.spec.ts`) não entra no jogo; pode ficar para regravar os esboços ou sair no fechamento.

## Riscos
- **Desempenho no celular** (o maior): prédios altos, muitas janelas e interiores. Orçamento e plano B em "Desempenho"; medir já na T04, antes do tema completo.
- **Câmera de terceira pessoa dentro dos prédios:** cômodos de 5 × 5 e pé-direito de 3 livres; captura dentro de cada modelo.
- **Terreno plano da cidade** mexe na geração só do tema da cidade; os outros sete conferidos bloco por bloco.
- **Obra no multijogador:** a célula de obra vale no núcleo e no cliente com a mesma regra (lição 5); duas crianças na mesma célula testadas no modo nuvem.
- **Muito trabalho de arte:** 17 texturas, 5 modelos de prédio, 6 obras, 3 moradores, 5 bichos, 2 veículos. Divide-se por tarefa.
- **Veículos** (ver "Complexidade"): é o pedaço mais arriscado e por isso é um bloco separado.
- **Propriedade intelectual** (020): nada de prédio famoso, marca, logotipo ou nome de verdade; conferido na auditoria.

## Perguntas ao dono (respondidas em 12 nov 2026)
O dono aceitou as nove recomendações do esboço, como estavam escritas:
1. A obra feita é da cidade (blindada, com o nome de quem fez na placa), e não da criança. **Sim.**
2. A colher de pedreiro enche os fantasmas sem gastar material, também na sobrevivência. **Sim.**
3. Carrinhos e ônibus entram na versão mínima (4 táxis e 1 ônibus em circuitos fixos), depois do canteiro, como bloco que pode ser cortado (na ordem final, T13 a T15). **Sim.** Depois a frota cresceu na rodada 2 (ver "Carrinhos e ônibus").
4. O horizonte de torres ao longe entra. **Sim.**
5. O rio com ponte fica para depois; nesta etapa, lago no parque. **Sim.**
6. Plantas dos prédios em texto em vez de MagicaVoxel, se a validação da T01 confirmar. **Mudou (12 nov 2026):** o dono tirou o MagicaVoxel de vez; plantas em código, paramétricas, sem validação nem conversor.
7. Os blocos novos aparecem nos outros temas com a mesma textura (só o nome muda). **Mudou (12 nov 2026):** o dono decidiu que tudo da cidade é só da cidade (ver "Só na Cidade Grande").
8. O gato de rua é domado com peixe, só na cidade (`EstiloMundo.domar`). **Sim.**
9. Sem elevador nesta etapa. **Sim.**

Esboços aprovados em 12 nov 2026; a spec passou a APPROVED.

## Decisões do dono
- 7 nov 2026: os nomes "Cidade Grande" e "Rancho Alegre"; começar pelo Rancho; bichos da noite fofos que não atacam.
- 10 nov 2026: a cidade nasce com a atividade dela; sem Blender, MagicaVoxel só se ajudar de verdade.
- 12 nov 2026: prédios de 2 a 6 andares; atividade = canteiro de obras; jeito de Manhattan sem copiar; carrinhos e ônibus, se não ficar complexo demais.
- 12 nov 2026: aceitou as nove recomendações do esboço (ver "Perguntas ao dono"): obra da cidade, colher sem gastar material, carrinhos na versão mínima e cortável, horizonte, rio depois, plantas em texto, mesma textura nos outros temas, gato com peixe, sem elevador. Pediu o esboço refeito no visual de brinquedo do jogo (motor de verdade) antes de aprovar a spec.
- 12 nov 2026 (rodada 2 dos veículos): versão 3 (com carinha) escolhida; sem chave de corda nem tique-tique; táxi, polícia de brinquedo, carro comum em cores, dois ônibus (azul e verde) e carrinho de sorvete com musiquinha original; motor com som de carro de verdade (gravações CC0 com curva de RPM); polícia sem sirene.
- 12 nov 2026: **tudo da cidade é só da cidade** (prédios, veículos, blocos novos, canteiro, horizonte, sorvete, sons e música); muda a resposta da pergunta 7.
- 12 nov 2026: **cada mundo é uma história separada**, com o seu inventário e o seu progresso; nada passa de um mundo para outro.
- 12 nov 2026: **capacete e colete do canteiro viram peças de fantasia da 017**, ganhas uma vez na cidade e usáveis em qualquer mundo (só aparência).
- 12 nov 2026: **sem MagicaVoxel**; plantas em código, paramétricas (andares, cores da porta, espelho); muda a resposta da pergunta 6 e a T01.
- 12 nov 2026: **veículos só nas pistas** (rotas do grafo de pistas, curvas dentro do asfalto, caixa sempre na faixa, nada os empurra, sorvete na vaga da rua, volta de encalhe pelo começo de uma faixa); com teste de unidade e de tela.
- 12 nov 2026: respostas à rodada 2 dos veículos (ver "Respostas do dono à rodada 2"): "uí-uí" uma vez na praça e giroflex; **polícia preta e branca**; as quatro cores aprovadas; os dois ônibus, cada um na sua volta; sons e volumes dos motores aprovados; a regra da musiquinha do sorvete ficou conosco.
- 12 nov 2026: **esboços aprovados** (a cidade com as capturas do motor e os veículos da rodada 2); spec APPROVED, com a ordem final das tarefas.
- 12 nov 2026 (T15, depois de ouvir as amostras do jogo): no equilíbrio do esboço o motor sumia debaixo da trilha; **o motor de um carrinho andando perto tem de se ouvir com a música**. A trilha abaixa 4 dB (com um vale de 3 dB nos graves-médios, em ~1 s) com um carrinho andando a até 6 blocos (some até 12) e o motor subiu 3 dB; a esquina da praça continua no nível do esboço e a musiquinha do sorvete abaixa junto com a trilha. Aprovado pelo dono ("Agora deu pra ouvir"). Medidas em `referencia/fontes/medidas-regua-rua.json`.
