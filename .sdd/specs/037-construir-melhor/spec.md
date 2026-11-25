---
id: 037-construir-melhor
title: 'Construir melhor: primeira pessoa num botão, bloco nunca em cima de ninguém e bloco só encostado'
status: REVIEW
base_branch: main
branch: feat/037-construir-melhor
created_at: 2026-11-25T09:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
---

## Contexto
O filho mais velho do dono, de 4 para 5 anos, joga e compara com o jogo de blocos que ele conhece. Em 24 nov ele trouxe três queixas:
1. **Construir em terceira pessoa é difícil:** o boneco fica na frente.
2. **Bloco em cima de bicho ou amigo:** dá para pôr, e quem fica embaixo fica preso no mapa, "como se fosse um bug".
3. **Bloco flutuando:** dá para pôr bloco no ar, sem encostar em nada.

O dono pôs a 037 logo depois da lojinha (036) e antes das partes 2 e 3 da 027.

## O que existia
A investigação completa está em `referencia/investigacao-colocar.md` (engenheiro de núcleo e rede, 25 nov, com 11 testes de prova). O estudo da câmera está em `referencia/estudo-primeira-pessoa.md`, e o do braço, em `referencia/estudo-braco-primeira-pessoa.md`.

- **Câmera:** só terceira pessoa desde a 015 (10 nov). A mira sai da câmera (`mirarDaCamera`) e sempre encosta numa face.
- **Corpo na célula:** o `colocar` do núcleo (`src/nucleo/nucleo.ts`) só confere os jogadores, pela última posição que cada um mandou, que chega com 150 a 300 ms de atraso.
  - Não confere a metade de cima da porta, o lote do criativo (`editarLote`), quem entra num lugar já construído (`conectar`) nem o andaime da obra seguinte.
  - Bichos e moradores não entram na conta. Eles sobem para cima do bloco.
  - O peixe não sobe: com um bloco em cima dele na água, ele se debate e morre.
  - Quem fica dentro de um bloco não sai, porque a física do boneco não anda nem pula começando dentro de um sólido.
- **Apoio:** o núcleo não confere apoio nenhum. O bloco fica no ar por estes caminhos:
  - a face de algo que não é sólido: tocha, porta aberta, placa, poste, lavoura;
  - quebrar o bloco de baixo;
  - um bloco previsto pelo cliente e recusado pelo núcleo;
  - o fantasma da obra, como o miolo do telhado da casinha (obra 5), que só encosta pela quina;
  - as ferramentas do criativo no computador.
- **Recusa:** o que existe é o som `recusa`, o cadeado da proteção e o fantasma que treme na obra. Não há tremor de mão.

## Decisões do dono
| Data | Decisão |
|---|---|
| 24 nov | A ordem: logo depois da lojinha |
| 25 nov | O braço segue a recomendação do estudo (`referencia/estudo-braco-primeira-pessoa.md`): a câmera na altura dos olhos de verdade; o braço do próprio boneco, no tamanho dele, sem dobrar e sem esticar, girando num ombro fixo fora da beira direita; a mãozinha discreta com o item; os ângulos da terceira pessoa em escala menor |
| 24 nov | A câmera: um botão com olhinho troca entre a primeira e a terceira pessoa, com transição suave pela cabeça; a escolha fica guardada no aparelho; ao comprar ou vestir na lojinha, volta sozinha à terceira pessoa |
| 24 nov | A mão vazia não aparece andando: entra só para agir (tocar, colocar, acenar, comer) e sai. Com item, uma mão só, como na terceira pessoa (nada de duas mãos) |
| 24 nov | A câmera solta de hoje fica igual na primeira pessoa (arrastar para olhar, girar) |
| 24 nov | A mira de colocar é importante e tem que ficar clara e certeira na primeira pessoa |
| 25 nov | O olhinho de trocar a câmera vai para a roda (o menu em carrossel), e não fica um botão solto na tela: tela limpa |
| 25 nov | Na primeira pessoa, a mira segue o toque, não a câmera: no celular age onde o dedo tocou e no computador onde o mouse clicou, dentro do alcance de hoje, como na terceira pessoa. O pontinho do meio sai. Cada golpe tem um movimento de braço no ritmo do som. Todos os itens ficam de frente na mão, como a criança seguraria. A visão mostra à frente pelo menos o mesmo tanto que a terceira pessoa |
| 24 nov | O braço não pode parecer "de madeira" nem balançar de lado, o que não acontece num braço de verdade |
| 25 nov | Braço sem articulação, como na terceira pessoa (a opção 2 do esboço). Ele não pode parecer levantado nem solto do corpo, com a ponta do ombro à mostra. A forma final sai do estudo geométrico (`referencia/estudo-braco-primeira-pessoa.md`), feito a pedido do dono para parar de ajustar no chute |
| 24 nov | Bloco nunca em cima de corpo (é defeito); quem já ficou preso é solto |
| 24 nov | Bloco só encostado num bloco ou no chão, em todos os modos |
| 25 nov | Quebrar o bloco de baixo, ou o do lado que serviu de apoio, deixa o bloco que estava encostado onde está. A regra do apoio vale só na hora de colocar: um bloco novo nunca começa do nada, precisa encostar num bloco ou no chão. Depois de colocado, ele fica, mesmo que o apoio seja quebrado (como no outro jogo) |

## Decisões do orquestrador
- **As exceções do apoio:**
  - a célula da obra aberta e a do bolo, com o bloco certo, ficam liberadas: a planta é a regra, e o telhado da casinha não fecha de outro jeito. A mira prefere o fantasma apoiado;
  - o lote do criativo (colar, espelho, ferramentas de computador) fica sem a regra de apoio, mas com a regra de corpo para amigos e bichos;
  - os mundos salvos não são mexidos: os blocos que já estão no ar ficam.
- **A folga do amigo:**
  - a caixa do amigo cresce com a velocidade horizontal que ele mesmo informa, `0,3 + min(0,6; vel × 0,15)`, igual para todos os lados;
  - parado, ele não ganha folga nenhuma, para a criança poder construir uma parede colada nele;
  - a folga diminui o problema, mas não acaba com ele: o pulo e a queda não entram, e ela cobre uns 140 ms andando. O que sobrar, o soltar tira.
- **O cliente e o núcleo:** o cliente confere os corpos pelas posições do último retrato, não pelo boneco desenhado. Uma piscada rara (o cliente põe, o núcleo recusa) é aceita. O apoio dá igual nos dois lados.
- **Corpos que contam:** criança, amigos, bichos do mundo (menos o que está morrendo), moradores e peixes. Os bichos premium que seguem a criança e os da festa ficam fora, no núcleo e na previsão, porque o núcleo nem sabe deles.
- **A porta:** fechar uma porta ou porteira confere corpo, como o colocar. A planta da obra passa por cima da regra da porta (o fantasma enche meia porta por vez), mas não por cima da regra do corpo.
- **A mira na obra:** o fantasma apoiado só desempata entre os que o ímã do dedo pega. Ele nunca passa na frente do fantasma tocado.
- **A ordem da recusa:** a da proteção, com o cadeado e o motivo, vem antes da do corpo e do apoio.
- **A recusa visível:** além do som de recusa que já existe, o bloco na mão faz um "não" curtinho, um balanço rápido. Nas duas câmeras.
- **Soltar quem ficou preso:**
  - fica na física do cliente e vale só para bloco do mundo, não para os corpos macios;
  - quem começa um passo dentro de um sólido vai para o lugar livre mais perto: primeiro na mesma altura, a até 1 bloco; depois subindo, até 6 blocos, como os bichos;
  - também cobre o andaime da obra seguinte, que nasce em cima de quem estiver no lote;
  - o `conectar` passa a nascer numa célula livre, procurando da altura salva para cima, nunca do fundo nem do topo;
  - um teste da sala prova que o teleporte do servidor não desfaz o soltar.
- **Uma regra só:** uma função pura nova (por exemplo, `src/jogo/construir.ts`) diz se o bloco pode entrar. Ela é a mesma no núcleo e na previsão do cliente, para nada piscar.

## O que muda
### 1. Construir (núcleo e cliente)
- **Sem corpo na célula:** vale para as células do `colocar` e as da porta, para todo bloco sólido.
  - quem coloca: a caixa do corpo;
  - os amigos: a caixa com a folga pela velocidade;
  - bichos, moradores e peixes da população, cada um com o seu tamanho;
  - o `editarLote` confere amigos e bichos.
- **Apoio:** pelo menos um dos 6 vizinhos é sólido, ou a célula está na última camada do mundo. A porta exige chão sólido embaixo. Valem as exceções da seção anterior.
- **Soltar:** na física do cliente, e o `conectar` nasce em célula livre.
- **A previsão do cliente:** usa a mesma função, e a mira mostra o fantasma apoiado.
- **Protocolo:** não muda, e a recusa não ganha motivo novo. A `VERSAO_REDE` continua 18. O servidor sai antes, porque o núcleo muda. O site antigo com o servidor novo vê o bloco piscar, com o som; o site novo com o servidor antigo é mais restrito, sem estrago.

### 2. A primeira pessoa
O esboço `?esboco=primeira-pessoa` foi aprovado pelo dono no celular em 25 nov ("a mira, o bracinho, os movimentos e a jogabilidade, acertamos"). A spec leva o esboço para o jogo de verdade, com estas medidas (estudos em `referencia/`):
- **O olhinho:** fica na roda, como um item com o desenho do olho, e não na tela. A câmera entra pela cabeça em uns 0,7 s e sai do mesmo jeito.
- **A câmera:**
  - os olhos a 1,62 do chão, com a cabeça escondida, sempre dentro da caixa do corpo (no máximo 0,2 à frente do centro) ou recuando quando há bloco à frente: encostada na parede, a câmera nunca entra no bloco e a criança quebra e põe na parede da frente (e2e);
  - o raio do toque sai dos olhos do controle;
  - o campo vertical é o maior entre o da configuração e o que dá 42° na horizontal: em pé fica perto de 80°, e deitado e no computador, o da configuração (70° por padrão). O dono aceitou, no teste de 25 nov, ver umas 16 lajotas à frente em pé, contra 20 antes;
  - ao entrar, o olhar vai para a frente, com o horizonte no terço de cima;
  - não balança com a cabeça;
  - o arrastar para olhar é o de hoje.
- **O braço:**
  - o do próprio boneco, no tamanho dele, sem dobrar e sem esticar;
  - gira num ombro fixo fora da beira direita, no ponto que a conta dá para cada tela, sempre acima dos botões;
  - usa os ângulos da terceira pessoa em escala;
  - nunca mostra a ponta do ombro.
- **A mão:**
  - vazia, aparece só para agir;
  - com item, segura numa mão só;
  - cada golpe do jogo tem um golpe de braço e cada colocação um empurrão, no mesmo sinal do som.
- **Os itens na mão:** todos de frente, como a criança segura: o bloco de pé, a ferramenta com o cabo na mão e a ponta para a frente, a comida e a semente de pé. Acertos do teste do dono:
  - alguns itens ficam deslocados da mão (a sacola flutuando acima dela): cada item encosta na mão;
  - o ioiô e o pião aparecem;
  - a ferramenta fica menos alta na tela.
- **Voltar para a terceira pessoa:** o item da mão some da tela e volta para o boneco. No esboço ele ficava preso na tela, um defeito achado pelo dono.
- **A mira:** segue o toque ou o clique, como na terceira pessoa, pela mesma conta. O contorno fino aparece embaixo do dedo ou do ponteiro.
- **Guardar e voltar:** a escolha fica no aparelho. Ao comprar ou vestir na lojinha, volta para a terceira pessoa.
- **A sombra:** a do boneco aparece no chão na primeira pessoa.
- **Lugares com câmera própria:** neles a primeira pessoa sai sozinha e volta ao sair:
  - o modo foto da roleta;
  - a Casa anos 80 (telhado cortado);
  - sentada num brinquedo do parque;
  - montada (brinquedo de andar, patinete, skate, bicho);
  - dormindo e desmaiada.

  Cada um com teste.
- **Desempenho da conta do ombro:**
  - calculada fora do quadro e guardada por tamanho de tela;
  - recalculada quando a tela gira ou os botões mudam de lugar;
  - conferida por conta numa faixa de proporções de tela, não só em 3 telas;
  - sem solução, a mão some em vez de mostrar a ponta do braço;
  - nada de varrer a cena a cada quadro.
- **O esboço sai do código** quando a spec for feita.

## Experiência medida (para não frustrar)
- **Bloco onde a criança mira:** em 20 toques seguidos, nas duas câmeras e também na obra, nenhum cai em outra célula.
- **Ninguém preso:** em nenhum dos caminhos da investigação (amigo andando, correndo e pulando; porta; lote; quem entra; andaime) alguém fica preso mais de 1 s, porque o soltar tira; e nenhum peixe morre.
- **Entrar e sair da primeira pessoa:** em no máximo 0,8 s, sem quadro acima de 100 ms.
- **Fluidez:** a primeira pessoa cai no máximo 5% de quadros por segundo em relação à terceira, e soma no máximo +3 chamadas de desenho com o braço. Nem a entrada nem o giro da tela passam de 100 ms num quadro.
- **Construir com bicho junto:** uma parede de 5 blocos com a raposa domada seguindo a criança, com no máximo 2 recusas.
- **A mão no lugar:** a ponta do ombro nunca aparece na tela, nas 3 telas e em todas as poses (conferido por conta).

## Cuidados
- Nada que assuste: o peixe nunca morre por causa de um bloco.
- Nada que lembre o jogo famoso: nem a mão quadrada esticada nem o braço sempre erguido.

## Fora desta spec
- Bloco cair quando o apoio é quebrado: o dono decidiu que ele fica onde está.
- Mexer nos mundos salvos.
- A primeira pessoa no computador com mouse travado: aqui, o arrastar de hoje vale nas duas câmeras.
