# Sessões de paridade (spec 009, T01)

Gravadas no jogo **antes** da separação entre núcleo e desenho. Depois da separação, as
mesmas sessões precisam dar o mesmo estado salvo.

```sh
# grava (cada sessão roda duas vezes e as duas têm que sair iguais)
docker compose -f .nants/compose.yaml run --rm workspace sh -lc 'PARIDADE=gravar npx playwright test e2e/paridade.spec.ts --workers=1 --reporter=list'
# confere com o que está gravado
docker compose -f .nants/compose.yaml run --rm workspace sh -lc 'PARIDADE=conferir npx playwright test e2e/paridade.spec.ts --workers=1 --reporter=list'
```

`PARIDADE_SESSOES=construir,itens`, `PARIDADE_SEMENTES=42` e `PARIDADE_TEMAS=doce-reino`
limitam o que roda. Um arquivo por sessão × semente × tema: `<sessão>-<semente>-<tema>.json`
(sementes 1337, 42 e 7; temas `bruma-e-luz` e `doce-reino`).

## Como cada sessão começa

- Mundo novo gravado direto no IndexedDB do jogo (semente, tema e modo conhecidos), aberto por `?mundo=paridade`.
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

- **Exaustão:** cresce com o tempo real parado (0,02 por segundo), então depende de quanto a sessão demorou.
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
