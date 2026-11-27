# Sessões de paridade (spec 009, T01)

Gravadas no jogo **antes** da separação entre núcleo e desenho. Depois da separação, as
mesmas sessões precisam dar o mesmo estado salvo.

```sh
# grava (cada sessão roda duas vezes e as duas têm que sair iguais)
docker compose -f docker/compose.yaml run --rm workspace sh -lc 'PARIDADE=gravar npx playwright test e2e/paridade.spec.ts --workers=1 --reporter=list'
# confere com o que está gravado
docker compose -f docker/compose.yaml run --rm workspace sh -lc 'PARIDADE=conferir npx playwright test e2e/paridade.spec.ts --workers=1 --reporter=list'
```

Na nuvem (Claude Code na web, sem Docker e sem placa de vídeo), com o Chromium do ambiente:

```sh
E2E_CHROMIUM=/opt/pw-browsers/chromium PARIDADE=conferir npx playwright test e2e/paridade.spec.ts --workers=1 --reporter=line --trace off
```

`PARIDADE_SESSOES=construir,itens`, `PARIDADE_SEMENTES=42` e `PARIDADE_TEMAS=doce-reino`
limitam o que roda. Um arquivo por sessão × semente × tema: `<sessão>-<semente>-<tema>.json`
(sementes 1337, 42 e 7; temas `rancho-alegre` e `doce-reino`; até a spec 034 eram
`bruma-e-luz` e `doce-reino`).

## Como cada sessão começa

- Mundo novo gravado direto no IndexedDB do jogo (semente, tema e modo conhecidos), aberto por `?mundo=paridade`.
- Spec 034: logo que a cena liga o núcleo, o atalho de teste `relogioCansa(false)` desliga o
  cansaço que vem do relógio na sobrevivência (ver "Regravações"). Pulos, golpes, danos e a
  cura continuam cansando.
- Assim que fica pronto: tela de título escondida, `pausarDia = true`, `hora = 0,4` e clima `limpo`.
- Quase tudo acontece numa **plataforma** de pedra (11 × 11, borda de vidro com 2 de altura),
  8 blocos acima do ponto mais alto do terreno em volta do nascimento. Assim árvores, água e
  relevo de cada semente não atrapalham a mira, e itens e criaturas não caem.
- Só a API de depuração (`window.__brumaluz`), eventos `brumaluz:*`, `window.__inventarioUI`
  e cliques nos slots da interface (o mesmo `pointerdown` do mouse).

## Sessões

| Sessão          | Modo          | O que faz                                                                                                                                                                                                                                                                                   | Etapas gravadas                                 |
| --------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `construir`     | criativo      | mina 5 materiais e um bloco do chão com `minerar`; coloca 5 blocos com `interagir('colocar')`, uma porta; abre, fecha e abre a porta; Ctrl+Z duas vezes, Ctrl+Shift+Z e Ctrl+Y; invoca uma raposa e dá frutinhas até ela confiar                                                            | `construido`, `desfeitoRefeito`, `final`        |
| `itens`         | sobrevivência | cava 2 blocos do terreno no nascimento e coleta; picareta de madeira com 3 de durabilidade quebra pedras até quebrar; mina tábua, areia, folhagem e minério sem ferramenta; põe um baú longe, enche pela interface (inclusive botão direito), fecha e quebra o baú: o conteúdo fica no chão | `coletado`, `bauCheio`, `final`                 |
| `fornalha`      | sobrevivência | coloca uma fornalha, põe 1 ferro bruto e 3 gravetos pela interface (e tenta pôr maçã, que é recusada), espera acender, fundir e apagar, e tira o lingote pela interface                                                                                                                     | `final`                                         |
| `trocas`        | sobrevivência | vai ao povoado mais perto, espera os moradores e o aviso de chegada, tenta abrir as trocas mirando num morador (sem trocar; o resultado só vai para o log), e faz cada troca das três profissões pelo evento `brumaluz:trocar`                                                              | `final`                                         |
| `sobrevivencia` | sobrevivência | cama marca o renascer; 75 pulos correndo dão fome; queda de 8,5 blocos (5 de dano); come uma maçã; queda fatal; renasce pelo botão da tela de desmaio                                                                                                                                       | `faminto`, `caiu`, `comeu`, `desmaiou`, `final` |
| `clima`         | criativo      | chuva no verão, tempestade e hora passando da meia-noite, dormir numa cama à noite no outono, neblina                                                                                                                                                                                       | `chuvaVerao`, `meiaNoite`, `dormiu`, `final`    |

Cada arquivo também tem `notas`: o que a sessão viu no caminho (blocos minerados, estados
da porta, povoado escolhido, danos recebidos...). As notas também são comparadas.

## O que é comparado em cada etapa

O mundo é salvo com `__brumaluz.salvar()` e o `DadosMundo` é lido do IndexedDB. Do
salvamento entra só a parte determinística:

- `edicoes`: as chaves de chunk em ordem e os pares `[índice, valor]` em ordem de índice;
- `extras.inventario`: slots e slot ativo;
- `extras.conteineres`: baús e fornalhas, com números arredondados a 2 casas;
- `extras.sobrevivencia`: vida, fome, saturação, ar, desmaio e causa, arredondados a 2 casas;
- `extras.spawn` (2 casas), `extras.dia`, `extras.clima.tipo` e `extras.diario` (contadores e missões concluídas em ordem);
- `hora` (2 casas), só na sessão `clima`, que mexe na hora com o relógio parado;
- `extras.itensSoltos`: só a soma de cada item no chão;
- `extras.criaturas`: só quantas há de cada tipo e se todas estão numa célula livre.

## O que foi deixado de fora, e por quê

- **Exaustão:** cresce com o tempo real parado (0,02 por segundo), então depende de quanto a
  sessão demorou. Desde a spec 034 o cansaço do relógio fica desligado nas sessões (a sessão
  `sobrevivencia` confere, parada 6 s logo depois de abrir, que a exaustão gravada não sobe;
  ela pode já começar com 0,2 de um passo de pulo no nascer). A exaustão que sobra vem de
  pulos, golpes, danos e da cura natural; a cura ainda anda com o relógio (1 de vida a cada
  3 s ferido de barriga cheia, cansando 1,5 cada), mas é limitada pelo dano: não passa da vida
  que faltava. Então ela não é estritamente igual em toda rodada, só limitada; continua fora
  do retrato, mas a saturação e a fome que ela derruba entram.
- **Posição e velocidade de itens no chão:** a física dos itens anda com o quadro; só a soma por item é estável.
- **Posição do jogador e das criaturas:** dependem dos quadros; das criaturas entra só a contagem e se estão em lugar livre.
- **Progresso e queima da fornalha:** andam com o tempo real; a sessão espera a fornalha apagar, quando os dois voltam a 0.
- **Inventário e chão depois do desmaio** (`desmaiou` e `final` da sessão `sobrevivencia`):
  o inventário espalha no chão e, conforme os quadros, o próprio corpo pega tudo de volta
  (ou não), em qualquer ordem. Ali o retrato soma inventário e chão por item
  (`possesSomadas`) e tira do diário os contadores `coletou:*`.
- **Arrumação do inventário na sessão `itens`:** dois itens coletados um depois do outro às vezes chegam em ordem trocada (física dos itens); ali o inventário vira a soma por item (`contagem`) mais o slot ativo.
- **Biomas do diário (`bioma:*`):** o diário lê a posição a cada 2 s de relógio real; perto de uma divisa de biomas, teleportes curtos às vezes contam e às vezes não. Saem de todas as etapas.
- **Profissão de quem atende quando se mira num morador:** depende de quem está mais perto naquele quadro; por isso as trocas que contam são as abertas pelo evento `brumaluz:trocar`.

## Regravações

- **Spec 013 (fecho), sessões `construir` e `clima` (as 12 gravações, 3 sementes × 2 temas):**
  a spec 012 (commit 2d992f7) fez o mundo novo começar com a barra vazia também no criativo,
  e essas duas sessões, as únicas no criativo, tinham sido gravadas com a barra cheia (nove
  pilhas de 64 blocos). Conferido no código de antes da 013 (8edab94): todas as 12 falhavam
  só no `extras.inventario.slots`, nada mais. Regravadas com `PARIDADE=gravar`; a diferença é
  só essa (as nove pilhas viraram `null`; as frutinhas e a porta da sessão `construir` ficam).
  A correção do espectro que não sumia ao amanhecer (no mesmo fecho) não mudou nenhuma
  gravação.
- **Spec 013 (fecho), sessão `trocas` (6 gravações):** a troca nova da porteira com o
  construtor (commit 8bcd00a, depois da regravação das trocas em 8d0d9ab) é feita pela
  sessão: uma troca a mais do construtor (`trocou` 17 → 18), uma porteira (`bloco:82`) no
  inventário e 4 tábuas a menos. Mudança de propósito da mecânica nova; nada mais mudou.

- **Spec 015 (junta), semente 1337 (as 12 gravações, 6 sessões × 2 temas):** a correção
  da 013 que tira o nascimento de cima de árvore, cristal e ruína (commit d0bb0be,
  `pontoDeNascer`) muda o ponto de nascer da 1337 de (50,5; 81,5) para (50,5; 82,5): ali
  havia árvore possível. As sementes 42 e 7 não mudam (o nascimento já era livre). Conferido
  com `PARIDADE_OBTIDO` (guarda o que saiu ao conferir) e comparando em coordenadas do mundo:
  as edições são as mesmas, deslocadas 1 bloco em z (`spawn`, baús e fornalhas junto). A única
  outra diferença vem do terreno do novo ponto: na sessão `itens` os 2 blocos cavados no
  nascimento são grama alta e terra musgosa (antes terra musgosa e terra), e a grama alta
  solta uma maçã (`coletou:maca`, um `bloco:11` a menos). Uma conferência deu `dia` 4 em
  vez de 5 na etapa `meiaNoite` do `clima` (doce-reino), mas a gravação (duas rodadas iguais)
  e a conferência seguinte deram 5: é a virada da meia-noite caindo depois do retrato, não
  o nascimento. Regravadas com `PARIDADE=gravar PARIDADE_SEMENTES=1337`.

- **Spec 034 (T00), as 36 regravadas, com o Rancho Alegre no lugar do Bruma e Luz:**
  - **O Bruma sai:** o Bruma e Luz sai do jogo na 034, e as 18 sessões dele saem junto (os
    `*-bruma-e-luz.json`). No lugar entra o Rancho Alegre, que tem a raposa (o cachorro do
    sítio) domada com frutinhas e as três profissões no sítio, o povoado mais perto do nascer.
  - **A causa da regravação:** na nuvem, sem placa de vídeo, o jogo roda a cerca de 1 quadro
    por segundo e as sessões duram bem mais tempo de verdade. A exaustão crescia com o relógio
    (0,02 por segundo parado, 0,05 andando) e a saturação cai 1 a cada 4 de exaustão: as
    sessões `itens` e `trocas` ficavam na beira dessa queda e o retrato virava com a
    velocidade da máquina. Medido no código de antes: as 18 gravações do Doce, conferidas
    aqui, deram 13 de 18 (as 5 falhas eram só `saturacao` 5 → 4), e o Rancho e a Lua não
    gravavam iguais duas vezes (`trocas` 1337 do Rancho e `itens` 7 da Lua, 4 numa rodada e 5
    na outra).
  - **O conserto:** o atalho de teste `relogioCansa` (`depurar`, só com os atalhos de
    depuração ligados; nada muda para o jogador) desliga só o cansaço do relógio, logo que a
    cena liga o núcleo. A regra do jogo fica nos testes de unidade
    (`tests/jogo/sobrevivencia.test.ts`, "o relógio cansa", e `tests/nucleo/nucleo.test.ts`,
    "o relógio cansa na sobrevivência").
  - **A raposa de `construir`:** às vezes acabavam as 60 frutinhas sem ela confiar ("a raposa
    não confiou no jogador", em sementes e temas variados). A raposa selvagem é curiosa e para
    a uns 2,75 blocos do jogador (de 2,25 a 3,25); a sessão punha o jogador a 1,6 dela, ela
    corria para trás (4,2 blocos por segundo) enquanto a mira virava, e a 1 quadro por segundo
    quase toda frutinha errava. Agora o jogador fica a 2,5 dela (onde ela para), a frutinha só
    vai com a raposa parada, e só conta a raposa em cima da plataforma (não uma selvagem
    embaixo). O que se confere não mudou: no máximo 60 frutinhas, e cada uma que chega confia
    com 45% no núcleo. Medido aqui: confiou com 1 a 5 frutinhas nas 18 vezes medidas (as 6
    sessões `construir`, numa rodada de prova e nas duas conferências).
  - **Regravadas** com `PARIDADE=gravar` (as 18 do Rancho e as 18 do Doce), no código de antes
    da 034 com só o atalho a mais, e conferidas 36/36 duas vezes seguidas. As 18 do Doce saíram
    iguais, byte a byte, às gravadas antes com placa de vídeo: lá as sessões eram rápidas e o
    relógio não chegava a derrubar a saturação.
- **Spec 039 (T03), sessões `sobrevivencia` e `clima` (as 12 gravações, 3 sementes × 2
  temas):** a cama nova tem duas células e quem usa a cama nasce ao lado dela. As duas sessões
  são as únicas que põem cama. Conferidas no código da 039 antes de regravar, as 24 das outras
  sessões passaram iguais (`construir`, `itens`, `fornalha`, `trocas`, essa no povoado que agora
  tem a cama de duas células) e as 12 destas falharam. Regravadas com `PARIDADE=gravar`
  (`PARIDADE_SESSOES=sobrevivencia,clima`, cada uma duas vezes iguais); a comparação com a
  gravação de antes (`capturas-039/t03-paridade-comparacao.txt`) dá, em todas as etapas, só duas
  diferenças: a edição nova do pé da cama (bloco 56, metadado 5: a direção 1 e a parte 1, ao lado
  da cabeceira) e o `spawn`, que anda uma célula (ao lado da cabeceira, e não em cima dela). Nada
  mais mudou: a vida, a fome, o inventário, a hora e o diário são os de antes.

`PARIDADE_OBTIDO=pasta` (com `PARIDADE=conferir`) grava o retrato de cada sessão conferida
nessa pasta, para comparar com a gravação quando falha.

Depois dessas regravações, `PARIDADE=conferir` passa nas 36.
