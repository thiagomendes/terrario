---
id: 039-moveis
title: 'Móveis e utensílios, parte 1: a cama nova de dois blocos, sentar e deitar, e os móveis de brincar, para todos os mundos'
status: APPROVED
base_branch: main
branch: feat/039-moveis
created_at: 2026-11-26T21:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
---

## Contexto
O dono, em 26 nov 2026, disse que "a casinha fica meio pobre" por dentro. Ele pediu:
- **móveis de verdade**, com relevo e no estilo dos nossos brinquedos, em vez de cubos pintados;
- **interativos:** cada toque faz uma coisa;
- **um conjunto geral, que vale em todos os mundos.** As versões temáticas ficam na "Riqueza nos mundos antigos".

A cama nova saiu da 038 e veio para cá. Sobre a cama de hoje, o dono disse: "o ícone fica bonitinho, mas na hora que você coloca é um terror".

**Em duas partes** (o dono decidiu em 26 nov, depois da revisão do engenheiro):
- **Parte 1 (esta spec):** a regra dos móveis de várias células, a cama nova (com a conversão das camas que já existem), sentar e deitar, e os móveis de brincar (sofá, cadeira, criado-mudo, abajur, tapete, pia e guarda-roupa), com as receitas e as abas do criativo.
- **Parte 2 (spec à parte, depois da rodada em família da parte 1):** fogão, geladeira, mesa, TV e aparelho de som. São os que guardam coisas ou que todos na sala veem junto. Leva o que a revisão apontou para eles: os contêineres próprios, o estado dos toques no núcleo e a mesa com várias crianças. O que o dono já decidiu para eles está em "Decisões do dono".

## O que existia
### O estudo e o esboço (26 nov 2026, branch `esboco/039-moveis`)
- O estudo está em `referencia/estudo-moveis.md`. Ele cobre os 13 móveis, a conta de proporção com o boneco, as receitas, o criativo, pôr e quebrar, e o desempenho.
- O esboço está em `src/esboco/moveis.ts` e `moveisPecas.ts`, ligado com `?esboco=moveis`. As duas voltas de fotos estão em `capturas-039/esboco/` e `volta2/`.

### O jogo hoje (`main` 4229a003, `VERSAO_REDE` 18)
- **A cama** (`CAMA`, id 56) é uma laje de uma célula com textura. Usar a cama marca o lugar de nascer. De noite, a criança pede para dormir, e a noite passa quando todos pedem dentro da janela `ESPERA_TODOS` (`nucleo.ts:2101-2120`). Hoje não se vê a criança deitada. O ícone e a mão já mostram uma cama comprida (`render/itensBrinquedo.ts`).
- **A porta** é o único bloco de duas células:
  - o `colocar` só aceita `extras` para ela (`nucleo.ts:1549-1559`);
  - quebrar uma metade leva a outra (`outraMetadeDaPorta`, `jogo/permissao.ts:189`);
  - o saneamento aceita no máximo 1 `extra` (`saneamento.ts:127`);
  - o `recusar` só devolve a célula de cima e a de baixo (`nucleo.ts:1283`, `2063`).
- **O parque** (`jogo/parque.ts`, `nucleo/parque.ts`): o núcleo já é dono de cadeiras, com quem está sentado em cada uma.
- **Os geradores:**
  - os povoados (`world/construcoes.ts:42`) e o sítio (`sitio.ts:81`, `117`, `140`) põem camas sem metadado: o `Pincel` só recebe o id, e o `metaGerada` só existe para as plantas `cidade`, `bairro` e `baile` (`world/chunk.ts:887-893`);
  - as plantas da Cidade Grande põem a cama com `B` na paleta (`plantas/paleta.ts:61`), e há um andar que se repete (`plantas/geminada.ts:115`).
- **A paridade 36/36** grava camas em duas sessões (`e2e/paridade.spec.ts:960-976` e `1061-1080`). Os hashes por tema incluem povoados e sítio.
- **As ferramentas do criativo:**
  - colar: `jogo/construcao.ts:138`;
  - preencher e espelho: `render/cena.ts:3330` e `7017-7070`;
  - o desfazer;
  - o `editarLote` (`nucleo.ts:1593`).
- **A luz é por id de bloco** (`world/luz.ts:11`), e o núcleo usa a luz para a lavoura crescer.
- **O livro de receitas** tem as categorias blocos, ferramentas, decoração, comida, materiais e luz (`receitas.ts:30`). O catálogo do criativo é uma grade só (`ui/inventario.ts`).
- **Os ids de bloco** vão até 127 (`CALDEIRAO`), e o limite é 255.

## Decisões do dono (26 nov 2026, pelas pranchas e pela aba de perguntas)
| Pergunta | Decisão |
|---|---|
| Os móveis | 13 no total. Parte 1: cama nova, sofá, cadeira, criado-mudo, abajur, tapete, pia e guarda-roupa. Parte 2: fogão, geladeira, mesa, TV e aparelho de som. |
| Os estilos | Os recomendados: a cama do ícone (madeira em degrau, cobertor vermelho de retalhos), o sofá gordinho coral e a TV de rack azul. |
| A escala | A da segunda volta, pela conta com o boneco: os assentos a 0,64, o colchão a 0,55, a bancada a 1,06, e o guarda-roupa até os dois blocos. |
| De onde vêm | No criativo, pelo inventário. Na sobrevivência, por receita na mesa de montar. Não custam moedinhas. |
| O criativo | Abas de ícone em cima do catálogo. |
| Os toques com regra | O guarda-roupa abre a troca de roupa (parte 1). O fogão cozinha, a geladeira guarda e a mesa junta para comer (parte 2). |
| O ferro | Os móveis de ferro pedem ferro de verdade. Na parte 1, só a pia tem ferro (a torneira). |
| A mesa (parte 2) | Uma comida posta alimenta todos sentados em volta, até 4. |
| As camas antigas | Viram a cama nova onde couber. Onde não couber, ficam como a "cama curtinha", com o desenho novo numa célula. Nada some. |
| Dividir | Duas partes, cada uma publicada. |

## Decisões do orquestrador (pequenas, contadas ao dono; ajustadas na revisão de 26 nov)
- **A âncora:** só a âncora viaja. As outras células saem sempre do núcleo.
- **A cama curtinha** é a mesma `CAMA` com a parte "curtinha" no metadado. Ela continua marcando o lugar de nascer e servindo para dormir. Nela, a criança deita encolhidinha, de lado, com o edredom: cabe numa célula.
- **O desenho pode passar da célula:** o encosto do sofá (1,35), a cabeceira (1,35) e o encosto da cadeira passam da altura de uma célula, só no desenho. A célula de cima continua livre. A colisão vai até 1,0, sem mudar o andador das plantas.
- **O tapete fica numa camada própria, rente ao chão** (decisão do dono, 27 nov: "sim, por cima").
  - Ele não é o bloco da célula: fica guardado à parte, pelo núcleo, por célula de chão, com dono e direção, e é salvo.
  - Por cima dele vão o sofá, a cadeira, a mesa e os blocos, como numa sala de verdade.
  - Ele não segura nada e não tem colisão.
  - Para tirá-lo, a criança quebra uma parte do tapete onde não há nada em cima. Sai o tapete inteiro, para a mochila do dono, com a proteção de quebrar.
  - O desenho do T01 e do T05 diz como ele vai na malha do pedaço.
- **O abajur e o criado-mudo acesos** são outro id de bloco (como a `FORNALHA_ACESA`), editados pelo núcleo e salvos. Assim a luz é a mesma para todos e para a lavoura.
- **A pia:** a água e as bolhas aparecem só na tela de quem está perto, sem salvar e sem núcleo. Um toque liga e outro desliga, ou ela desliga sozinha em 6 s.
- **O guarda-roupa:** as portas abrem só na tela de quem tocou e abrem a troca de roupa direto nas roupas, sem o botão "Jogar". As outras crianças veem as portas paradas.
- **Nascer na cama:** a criança nasce ao lado da cama, na célula livre mais perto, nunca em cima da cabeceira.
- **Fica para depois:** a estante de livros, a banheira, o berço do bichinho e o quadro de pintar.

## O que muda
### 1. A regra dos móveis de várias células (núcleo, aparelho e rede)
- **A tabela de cada móvel**, num arquivo só, puro, em `src/jogo/moveis.ts`, usado pelo núcleo, pela previsão e pelo desenho:

  | Móvel | Células (largura × fundo × altura) | Para onde cresce, a partir da âncora | Partes |
  |---|---|---|---|
  | Cama | 1 × 2 × 1 | para a frente de quem põe | 0 cabeceira (âncora), 1 pé; a curtinha é a parte 2, sozinha |
  | Sofá | 2 × 1 × 1 | para a direita de quem põe | 0 esquerda (âncora), 1 direita |
  | Cadeira | 1 × 1 × 1 | | 0 |
  | Criado-mudo | 1 × 1 × 1 | | 0 |
  | Abajur | 1 × 1 × 2 | para cima | 0 pé (âncora), 1 cúpula |
  | Tapete | 3 × 2 × 0 (rente) | para a direita e para a frente | 0 a 5, com a 0 de âncora |
  | Pia | 1 × 1 × 2 | para cima | 0 bancada (âncora), 1 torneira |
  | Guarda-roupa | 2 × 1 × 2 | para a direita e para cima | 0 a 3, com a 0 de âncora |
- **O metadado:** a direção fica nos bits 0 e 1, e o colar só gira esses (`construcao.ts:154-157`). A parte fica nos bits 2 a 4.
- **O `colocar`:**
  - o cliente manda só a âncora, com a parte 0;
  - o núcleo recusa o `colocar` com parte diferente de 0;
  - o núcleo calcula as células pela tabela e confere os `extras` contra a lista dele;
  - o limite de `extras` no saneamento sobe de 1 para 5;
  - todas as células têm de estar livres, com a proteção e a regra da 037 (nunca em cima de gente ou bicho, e apoiado);
  - o núcleo grava as partes ele mesmo;
  - o `recusar` devolve todas as células.
- **Quebrar** qualquer parte leva o móvel inteiro, que vira um item só. Uma função pura em `src/jogo/`, como a `outraMetadeDaPorta`, lê a peça, acha a âncora e só aceita as células com o mesmo bloco, a mesma direção, a parte esperada e o mesmo dono.
- **A peça solta** (parte sem âncora válida):
  - ao abrir o mundo, vira ar;
  - o `editarLote` e a previsão dele descartam as partes que não são âncora, e cada âncora vira o móvel inteiro, se couber, ou fica de fora;
  - assim, o colar, o espelho, o preencher e o desfazer funcionam sozinhos. Um teste prova que o colar girado mantém o sofá, o tapete e o guarda-roupa inteiros dentro da região;
  - quebrar uma peça solta não devolve item;
  - a função pura trata qualquer peça solta, inclusive a gerada cuja âncora foi apagada por uma edição antiga, como "não é móvel": sem desenho, sem colisão e sem item ao quebrar.
- **Do lado do aparelho:** a previsão de pôr, quebrar e usar com várias células (`cena.ts:3262-3345`); o fantasma do móvel inteiro, vermelho se não couber; o espelho do criativo, que repete o móvel inteiro.
- **A rede:** a `VERSAO_REDE` vai para **19**. A 039 vem antes no backlog e fica com ela. A 027, partes 2 e 3, passa para 20 e 21; o mesmo commit atualiza a `027/spec.md:219` e as `tasks.md` T29 e T36.
- **Não há volta:** depois que o servidor 19 converte um mundo, um servidor 18 leria cada metade como uma cama inteira. Por isso:
  - a sala de teste da nuvem é conferida antes do site;
  - o servidor publica antes do site, pelo passo do `CLAUDE.md`.

### 2. A cama nova e as camas que já existem
- **Nos geradores:** o `Pincel` e o `metasGeradasDoChunk` passam a valer para os povoados e o sítio (direção e parte), e as plantas da Cidade Grande também. A cama nova sai com as duas células. O núcleo e o aparelho leem o mesmo metadado, e um teste prova isso. O custo da geração é medido.
- **Nos mundos salvos**, a conversão roda **só no núcleo**, uma vez por mundo, ao abrir, sobre as edições de `CAMA`. Ela fica marcada em `extras` (`extras.camas: 2`).
  - O pé só entra em ar, sem comer flor nem água, com apoio, sem ninguém em cima, passando pela proteção do dono da cama.
  - O pé fica com o dono da cabeceira, sem evento de colocação e sem som.
  - A direção é a que a cama já tem; a cena grava a direção (`cena.ts:3628`).
  - Onde não couber, fica a cama curtinha.
- **Nas camas geradas**, se a célula do pé já tem edição de outro bloco, a edição fica e a cama vira curtinha. Regra: uma célula de estrutura com edição de outro bloco segue a regra da edição, porque ela não pode virar `USAVEL` e prender o bloco da criança.
- **As obras do canteiro** (`world/obras.ts:340-360`): se alguma planta de obra tiver cama, a colher põe as duas partes.
- **Teste:** um salvamento da `main` abre no aparelho e na sala de teste da nuvem, e todas as camas viram a nova ou a curtinha, sem nada sumir e com o lugar de nascer mantido.

### 3. Sentar e deitar (como as cadeiras do parque)
- **O núcleo é dono dos assentos:** o sofá tem 2, a cadeira 1 e a cama 1, cada um com um dono. A criança senta pelo `usar`, com alcance.
- **Ela levanta:**
  - ao andar ou pular;
  - ao morrer, ao teleportar ou ao "voltar para casa";
  - quando o móvel quebra;
  - ao sair da sala ou perder a conexão.
- **O sentado** não é salvo e vai no jogador visto, também para quem entra no meio. Quem está montado desce antes. Quem está comendo continua comendo sentado.
- **Deitar e dormir:** a cama passa a deitar a criança. A regra de dormir vira "todos deitados na cama, de noite".
  - Se alguém levanta antes de as outras deitarem, a espera continua para quem ficou deitado.
  - Como hoje, todos seguram a noite: ela só passa com **todos** deitados (decisão do dono, 27 nov).
- **A pose de sentar e a de deitar** valem para a criança e para os amigos, nas duas câmeras. Na cama, o corpo achata e o edredom vai do queixo ao pé, como na segunda volta.

### 4. O desenho
- **Os oito móveis da parte 1** saem do esboço, com a escala da segunda volta.
- **O desenho por pedaço:**
  - o corpo parado de todos os móveis de um pedaço vai numa malha só, mais uma de luzes, como as peças da Vila Neon;
  - a forma de cada móvel em cada direção é montada uma vez e copiada;
  - o desenho sai junto com a remalha do pedaço, nunca a colisão sem o desenho, e no máximo um pedaço por quadro (`render/vila/index.ts:6-8`).
- **O que mexe** (as portas do guarda-roupa, a água da pia, o edredom) só ganha malha própria quando é tocado ou com alguém deitado.
- **Os móveis só são desenhados até uma distância**, por exemplo 32 blocos.
- **O ícone e a mão** de cada móvel seguem o modelo.

### 5. As receitas e o criativo
- **As receitas dos oito móveis** são as do estudo (seção 8). A cama mantém a de hoje (`LLL` / `TTT`). Elas ficam numa categoria nova do livro, **Casa**, para onde a cama sai de "decoração". Nenhuma grade repete outra receita, e o teste das receitas confere.
- **As abas do criativo:**
  - são as mesmas categorias do livro: tudo, blocos, casa, comida, ferramentas, luz, decoração e materiais;
  - o item sem receita vai para a aba do seu tipo, por uma tabela;
  - a aba "casa" cabe sem rolar no celular em pé.

### 6. Os sons e o esboço
- **Os sons curtos** (sentar, deitar, as portas do guarda-roupa, a água, o clique do abajur) seguem a régua da 019. Toca no máximo um som de móvel por vez perto da criança.
- **O esboço sai do código.** O código da parte 2 fica guardado no ramo do esboço.

## Experiência medida (para não frustrar)
- **Pôr:** o fantasma mostra o móvel inteiro antes de pôr, e fica vermelho se não couber. Num toque, o móvel aparece em menos de 0,2 s.
- **O toque:** a resposta começa em menos de 0,15 s.
  - Sentar e deitar levam menos de 0,4 s.
  - O guarda-roupa abre a troca de roupa em menos de 0,5 s.
- **Desempenho**, no celular em pé com a CPU 4×, medido na placa:
  - numa casa com os oito móveis: no máximo +3 chamadas de desenho paradas e os quadros caindo no máximo 5% contra a casa vazia;
  - a Cidade Grande e um povoado vistos de longe, com as camas novas: os quadros caindo no máximo 5% contra a `main`.
- **Nada some:**
  - as camas antigas viram a nova ou a curtinha, e o lugar de nascer continua;
  - os móveis voltam ao recarregar, também num mundo da nuvem;
  - quebrar devolve o item, só um.
- **Com amigos:**
  - a amiga vê o móvel posto, a criança sentada ou deitada, e a luz do abajur;
  - a noite passa com todos deitados;
  - testado com de 2 a 4 jogadores, no modo nuvem (`confiar: false`).

## A paridade
- **As duas sessões que põem a cama** (`paridade.spec.ts:960-976`, `1061-1080`) são regravadas. Uma comparação prova que a única diferença é a célula do pé e o metadado.
- **As outras 24 sessões** conferem sem regravar. Se alguma mudar (por exemplo, o caminho dos moradores do sítio com o pé da cama), a causa é explicada antes de regravar.
- **Os hashes por tema que mudam** (o `paridade-base`, o `paridade-cinco` e o `paridade-povoados`) ficam listados. Um teste prova que a Vila Neon e a Festa não mudam, porque não têm cama.
- **Os nomes novos** saem do `hashTextos`, como a 027 fez (`paridade-cinco.test.ts:422`).

## Cuidados (crianças e legais; ver `.sdd/cuidados-legais.md`)
- **Nada que assuste:** nada de porta batendo nem de escuro total, e o criado-mudo acende devagar.
- **Originais:** os móveis não têm cara de outro jogo nem de marca.
- **Cores:** nada de arco-íris.

## Fora desta spec
- **A parte 2:** fogão, geladeira, mesa, TV e som.
- **Os móveis temáticos** de cada mundo.
- **Para depois:** a estante, a banheira, o berço do bichinho e o quadro.
- **O teto que some** ao entrar nas casas dos povoados.
