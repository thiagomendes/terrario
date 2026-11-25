---
id: 037-construir-melhor
title: 'Construir melhor: primeira pessoa num botão, bloco nunca em cima de ninguém e bloco só encostado'
status: DRAFT
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
- **A folga do amigo:** a caixa do amigo cresce com a velocidade que ele mesmo informa, `0,3 + min(0,6; vel × 0,15)`. Parado, ele não ganha folga nenhuma, para a criança poder construir uma parede colada no amigo.
- **A ordem da recusa:** a da proteção, com o cadeado e o motivo, vem antes da do corpo e do apoio.
- **A recusa visível:** além do som de recusa que já existe, o bloco na mão faz um "não" curtinho, um balanço rápido. Nas duas câmeras.
- **Soltar quem ficou preso:** fica na física do cliente. Quem começa um passo dentro de um sólido vai para o lugar livre mais perto: primeiro na mesma altura, a até 1 bloco; depois subindo, até 6 blocos, como os bichos. O `conectar` passa a nascer numa célula livre.
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
- **Protocolo:** não muda, e a `VERSAO_REDE` continua 18. O servidor sai antes, porque o núcleo muda.

### 2. A primeira pessoa
O detalhe vem do estudo do braço, a pedido do dono. Já está decidido:
- **O olhinho:** fica na roda, como um item com o desenho do olho, e não na tela. A câmera entra pela cabeça em uns 0,7 s e sai do mesmo jeito.
- **A mão:**
  - vazia, aparece só para agir;
  - com item, segura numa mão só;
  - o braço não tem articulação, segue a geometria do corpo e nunca mostra a ponta do ombro;
  - sem balanço de lado; no passo, no máximo um sobe e desce leve, e uma mola discreta no pulo.
- **Olhando para baixo:** o próprio corpo, a roupa, a fantasia e o brinquedo de andar ficam acima do joystick.
- **A mira:** segue o toque ou o clique, como na terceira pessoa. O contorno fino aparece embaixo do dedo ou do ponteiro, sem borrar de perto.
- **Guardar e voltar:** a escolha fica no aparelho. Ao comprar ou vestir na lojinha, volta para a terceira pessoa.
- **A sombra:** a do boneco aparece no chão na primeira pessoa.

## Experiência medida (para não frustrar)
- **Bloco onde a criança mira:** em 20 toques seguidos na mira, nenhum cai em outra célula.
- **Ninguém preso:** em nenhum dos caminhos da investigação um amigo, bicho ou peixe fica preso ou morre. Quem já estava preso sai em menos de 1 s.
- **Entrar e sair da primeira pessoa:** em no máximo 0,8 s, sem quadro acima de 100 ms.
- **Fluidez:** a primeira pessoa cai no máximo 5% de quadros por segundo em relação à terceira, e soma no máximo +3 chamadas de desenho com o braço.
- **A mão no lugar:** a ponta do ombro nunca aparece na tela, nas 3 telas e em todas as poses (conferido por conta).

## Cuidados
- Nada que assuste: o peixe nunca morre por causa de um bloco.
- Nada que lembre o jogo famoso: nem a mão quadrada esticada nem o braço sempre erguido.

## Fora desta spec
- Bloco cair quando o apoio é quebrado: o dono decidiu que ele fica onde está.
- Mexer nos mundos salvos.
- A primeira pessoa no computador com mouse travado: aqui, o arrastar de hoje vale nas duas câmeras.
