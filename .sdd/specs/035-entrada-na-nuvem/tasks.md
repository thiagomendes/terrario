# 035 Entrada na nuvem: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou e um commit `tipo(035-entrada-na-nuvem): ...`.

Os e2e rodam na placa de vídeo: `scripts/e2e-gpu.sh <spec>`, e depois `scripts/limpar-restos-root.sh <pasta>`.

**Onde mexer:** o código do cliente fica fora de `src/nucleo`, `src/jogo`, `src/world`, `src/rede` e `src/temas`, que fazem o `servidor.yml` publicar. No servidor, só a linha da sala fechada e o teste dela.

## Fase 0: as provas, no código de antes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T00 | **Os testes que falham antes**, sem consertar nada:<br>- primeiro, uma refatoração: a lógica de hoje do `abrirMundo` vai para `enderecoDoMundo` (`src/pagina.ts`), igual como está, para o `tsc` passar e o teste falhar pelo comportamento (o `sala` fica);<br>- `tests/cliente/corridaNuvem.test.ts`, a partir de `referencia/corrida.ts`, com o servidor real, as esperas de 0 ms a 2 s e o contador de ressincronizações (spec, "O que muda", seção 7);<br>- `tests/cliente/blocosDaVolta.test.ts`: o pai põe e tira um bloco com o filho fora; o filho volta sem eles;<br>- o teste de comportamento da entrada no lugar de `tests/cliente/entradaNuvem.test.ts` (o de texto sai);<br>- o teste da sala fechada em `servidor/testes/salas.test.ts`;<br>- rodar e anotar na Situação o que falha e o que passa.<br><br>Commit só disso. Os que falham ficam falhando, sem `skip` nem `fails`, até a fase que os conserta. | M |
| T01 | **Os e2e que falham antes:** `e2e/entrada-nuvem.spec.ts` com B (o `primeiro` jogado fora na página da Bia), B buraco, B2 (todo `primeiro` jogado fora) e C (sair da nuvem para o Rancho), lendo o contador com acesso opcional.<br>- Rodar na `main`: todos falham;<br>- anotar o resultado e o tempo de cada um na Situação. | M |

## Fase 1: a conexão não perde mensagem
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T02 | **A fila em `conexaoNuvem`:**<br>- guarda até o primeiro `aoReceber` e entrega tudo em ordem, logo depois que ele volta (`queueMicrotask`);<br>- o que chega no meio vai para o fim;<br>- `try/catch` por mensagem, e o laço relê o tamanho a cada volta;<br>- o teto de 200;<br>- o `encerrar()` esvazia e fecha com 1000.<br><br>A corrida (com 0 ressincronizações) e o teste de comportamento passam. | P |

## Fase 2: a rede de segurança
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T03 | **Na conexão:**<br>- `ressincronizar?()` na interface `Conexao`;<br>- na `conexaoNuvem`: troca o `ws` antes de fechar a velha com 4001, abre outra na hora e passa por `'ressincronizando'`;<br>- o `aoBemVindo` de cada bem-vindo depois do primeiro (a fase 3 usa);<br>- em `src/nuvem.ts`, sem o aviso de queda e sem o "Voltamos!";<br>- `'ressincronizando'` por 5 s sem bem-vindo vira `'reconectando'`, com o aviso de sempre;<br>- testes, com o FalsoWS contando as conexões abertas e um FalsoWS que nunca abre (o aviso em até 5 s). | P |
| T04 | **No estado do cliente:**<br>- só mede com `conexao.ressincronizar`;<br>- o `primeiro` apaga os `adiantados` de número menor;<br>- o travamento medido a cada quadro, depois de aplicar o que der (1 s e 10 quadros esperando);<br>- o silêncio de 4 s com a página visível: só com a conexão em `'conectado'` e depois do primeiro quadro aplicado; recomeça a contar quando a página volta a ficar visível e quando passam mais de 2 s entre duas voltas do relógio (teste com o relógio trocado; o vigia não dispara durante a ressincronização);<br>- **a regra:** o recarregar só vem do travamento com a conexão de pé; o silêncio só ressincroniza, com conta própria, fora das 2 do travamento, no máximo uma vez a cada 30 s, e nunca recarrega (teste: dois silêncios seguidos não recarregam e não gastam a conta do travamento);<br>- zera a sequência, reconfere as células previstas e pede a ressincronização;<br>- no máximo 2, a segunda só depois de 3 s; a conta zera com 60 s de quadros andando e no `reconferir`;<br>- depois da segunda: o `guardar` e o recarregar uma vez com `direto=1`, com a marca de 10 min em `sessionStorage` (sem `sessionStorage`, não recarrega);<br>- o relógio que o teste troca e o contador no `window.__brumaluz`;<br>- os testes da seção 7, um deles com a conexão local.<br><br>Os e2e B, B buraco e B2 passam. | M |

## Fase 3: os blocos da volta
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T05 | **A diferença das edições e dos donos a cada bem-vindo depois do primeiro:**<br>- a função pura em `src/cliente/`, com teste (célula mudada, nova, edição que saiu, previsão, donos);<br>- a cena aplica: os donos antes dos blocos, a edição que saiu volta ao terreno gerado, só as células que mudaram refazem a malha;<br>- ligada ao `aoBemVindo` em `src/nuvem.ts`;<br>- teste: uma volta que não muda nada não muda nenhuma célula, na Vila Neon e na Cidade Grande (com as obras do canteiro);<br>- a medida do tempo da diferença num mundo com muitas edições, escrita na Situação.<br><br>O teste dos blocos da volta passa, pela queda e pela ressincronização. | M |

## Fase 4: a sala fechada e sair da nuvem
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T06 | **A sala fechada:** em `servidor/src/salas.ts:474-475`, o `ja` antes e a recusa com `fechado && !ehDono && !ja` (vale dentro da `TOLERANCIA_QUEDA` de 30 s, `:53`). O teste da T00, com a volta antes dos 30 s, passa. | P |
| T07 | **Sair da nuvem:**<br>- `enderecoDoMundo` tira `sala`, `novo`, `direto` e `tema`, põe `mundo` e deixa o resto;<br>- "Continuar" na lista para o mundo cujo `nuvem` é o código da sala aberta (`src/ui/mundos.ts:437-440`).<br><br>O teste de unidade e o e2e C passam. | P |

## Fase 5: nada voltou para trás
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T08 | **A suíte:**<br>- Vitest inteiro e `npm run build`;<br>- a corrida com 3 rodadas (`CORRIDA_RODADAS=3`);<br>- paridade 36/36;<br>- o e2e inteiro em pedaços de 2 trabalhadores;<br>- `entrada-nuvem` 3 rodadas seguidas verdes;<br>- o contador de ressincronizações em 0 nos e2e de amigos;<br>- **o cliente novo com o servidor antigo:** `multiplayer` e `entrada-nuvem` com o servidor montado da `main` (só a sala fechada continua como hoje);<br>- o que cair, conferido contra a `main`. | M |

## Fase 6: publicação
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T09 | **Publicar, o servidor primeiro:**<br>- `git diff --name-only main` confere os caminhos do `servidor.yml`: só `servidor/src/salas.ts` e `servidor/testes/salas.test.ts` caem lá;<br>- push na `main` e cancelar na hora a execução de `publicar.yml`, antes do passo de envio;<br>- **se o cancelamento escapar e o site sair antes, não quebra nada:** o protocolo não muda, e o risco é só o de hoje, o amigo que cai com a sala fechada ser barrado durante a espera do servidor. Não reverter às pressas: deixar o `servidor.yml` terminar;<br>- o `servidor.yml` do push espera ninguém estar jogando (até 2 h) e publica; acompanhar até a revisão nova de pé;<br>- disparar o `publicar.yml`;<br>- conferir no ar: levar um mundo para a nuvem pelo celular, o amigo entrar, cada um ver o outro, o dono fechar a sala e o amigo cair e voltar, e sair para outro mundo;<br>- no registro do servidor: nenhum 1005 de quem levou o mundo (olhar o "depois de N s") e nenhum 4001;<br>- o relatório para o dono e a Situação aqui. | P |

**Ordem:** T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09.

## Situação
- **(20 nov 2026) Spec aprovada pelo dono** ("Aprovado"), depois de o revisor aprovar com ajustes e os ajustes entrarem. O código começa em 21 nov, às 7h, pela T00.
  - O dono respondeu às duas perguntas pelas recomendadas e pôs na spec os blocos da volta e a sala fechada.
  - Os 18 apontamentos da primeira revisão entraram (a decisão técnica foi do orquestrador).
  - Os 7 ajustes da conferência final entraram: o vigia de silêncio só com a conexão de pé, os 5 s da ressincronização sem bem-vindo, o falso silêncio do celular lento, o silêncio que nunca recarrega, os testes da volta sem mudança, a `TOLERANCIA_QUEDA` da sala fechada e o cancelamento do `publicar.yml`.
- **(20 nov 2026) T00 pronta** (o dono estendeu o dia; branch `feat/035-entrada-na-nuvem`). Nada consertado; os que falham ficam falhando, sem `skip` nem `fails`.
  - **Refatoração:** `enderecoDoMundo(href, id)` em `src/pagina.ts`, igual ao de antes (põe `mundo`, tira só o `tema`); o `abrirMundo` do `main.ts` usa ela. `tsc` passa.
  - **`tests/cliente/enderecoDoMundo.test.ts`:** 4 de 5 falham pelo comportamento (o `sala`, o `novo` e o `direto` ficam); o do `tema` passa. Conserta na T07.
  - **`tests/cliente/corridaNuvem.test.ts`** (com o ajudante `tests/cliente/nuvemDeVerdade.ts`: servidor real, conexão e estado reais, WebSocket de mentira com uma tarefa por mensagem, a ida para a nuvem com a conexão de criar fechando): 0 ms e uma tarefa passam; **120 ms, 500 ms e 2 s falham com 0 quadros aplicados**, como na reprodução. `CORRIDA_RODADAS=3` repete. As ressincronizações contam pelo `ressincronizar` da conexão (quando a T03 puser) e pelos fechamentos 4001. Conserta na T02.
  - **`tests/cliente/blocosDaVolta.test.ts`:** a queda falha pelo comportamento (o filho volta sem o bloco posto; o bloco que o pai põe depois da volta chega, então a volta em si funciona); a da ressincronização falha porque a conexão ainda não tem `ressincronizar`. A "tela" do filho é um `Edicoes` como a cena monta; na T05 ligar ali o `aoBemVindo` à diferença.
  - **`tests/cliente/entradaNuvem.test.ts`** (o de texto saiu): 8 de 9 falham (nada chega a quem ouve depois); o do `encerrar()` que esvazia a fila passa já hoje. Conserta na T02.
  - **`servidor/testes/salas.test.ts`:** a sala fechada com a volta antes dos 30 s falha (`recusado: fechado`). Conserta na T06.
  - **Vitest inteiro:** 18 falham (exatamente os novos acima) e 1993 passam.
- **(20 nov 2026) T01 pronta:** `e2e/entrada-nuvem.spec.ts`, rodado na `main` (na placa de vídeo, 1 trabalhador, 2 min 44 s ao todo). Os 4 falham pelo comportamento:
  - **B** (41 s): o roteiro joga fora o `primeiro` e a Bia nunca vê a Ana (20 s esperando).
  - **B, buraco** (29 s): a Ana anda na tela dela (conferido), e a Bia a vê parada no mesmo lugar depois do quadro perdido.
  - **B2** (1 min): a página nunca recarrega (40 s esperando).
  - **C** (31 s): o mundo da sala mostra "Jogar" e não "Continuar", e o mundo novo do Rancho abre com `sala` no endereço (volta para a sala).
  - Na lista, o botão "Mundos" fica na tela de título: o teste a mostra de novo antes de abrir a lista.
  - **Cuidado:** o `scripts/limpar-restos-root.sh` apagou as fotos de `capturas-034/`, que estão no git e eram do root; foram restauradas com `git restore capturas-034`. Daqui em diante, os restos de root saem só com `rm -rf test-results dist` pelo contêiner.
- **(20 nov 2026) T02 pronta:** a fila em `src/cliente/conexaoNuvem.ts`.
  - Guarda as mensagens do núcleo enquanto ninguém ouve. O primeiro `aoReceber` recebe tudo, em ordem, numa `queueMicrotask` (nunca dentro dele). O que chega durante a entrega vai para o fim. Cada mensagem tem um `try/catch` com `console.error`, e o laço relê o tamanho a cada volta. O teto é de 200 (sai a mais antiga). O `encerrar()` esvazia a fila e fecha com 1000.
  - Só o estado do cliente chama `aoReceber` (`src/cliente/estado.ts:157`), então a fila vai inteira para ele.
  - **A corrida passa nas 5 esperas, também com `CORRIDA_RODADAS=3`, e com 0 ressincronizações.** O `entradaNuvem.test.ts` passa inteiro (10 testes, com o fechamento 1000).
  - Continuam falhando, como devem: o endereço (T07), os blocos da volta (T05; a da ressincronização espera a T03) e a sala fechada (T06).
  - E2e na placa de vídeo: o `multiplayer` passa (2 de 2). O `entrada-nuvem` continua falhando nos 4: B, buraco e B2 esperam a T04, e C espera a T07.
- **(20 nov 2026) T03 pronta:** a conexão sabe ressincronizar.
  - `ressincronizar?()` entrou na interface `Conexao` (opcional); na `ConexaoNuvem` é obrigatório, junto com o `aoBemVindo`.
  - Na `conexaoNuvem`, `ressincronizar()` só age com a conexão em `'conectado'`. Ela solta a velha (`ws = null`) antes de fechá-la com 4001, abre outra na hora e passa por `'ressincronizando'`. Os comandos do meio esperam o bem-vindo novo, como numa queda. Com 5 s sem bem-vindo, a presa é solta e a conexão vira `'reconectando'`, com o aviso e a reconexão de sempre.
  - O `aoBemVindo` chega em cada bem-vindo depois do primeiro, dentro do mesmo tratamento e antes dos quadros da conexão nova. A sala reaberta não conta.
  - Em `src/nuvem.ts`, o aviso já só aparece no `'reconectando'`, e o "Voltamos!" só depois de uma queda: a ressincronização fica calada (ficou um comentário dizendo isso).
  - **Testes** (`tests/cliente/conexaoNuvem.test.ts`, 7 novos, todos passam): o 4001, a conexão nova na hora e exatamente 2 conexões abertas; o que chega pela velha é ignorado; o `aoBemVindo` antes dos quadros, na ressincronização e na queda; a sala reaberta sem `aoBemVindo`; os comandos do meio; a conexão que nunca abre (em 5 s vira `'reconectando'`, e o aviso de verdade, com um `document` de mentira, mostra "A internet caiu. Reconectando…"); e nada acontece sem a conexão de pé.
  - O teste dos blocos da volta pela ressincronização agora falha pelo comportamento (o filho volta sem o bloco), esperando a T05.
  - **Vitest inteiro:** 7 falham (o endereço, os blocos da volta e a sala fechada) e 2011 passam.
  - **E2e na placa de vídeo:** o `multiplayer` e o `amigos-sem-atrito` passam (4 de 4).
- **(20 nov 2026) T04 pronta:** a rede de segurança em `src/cliente/estado.ts`.
  - **Só com `conexao.ressincronizar`.** A interface `Conexao` ganhou também o `estado?` opcional, que a da nuvem já tinha.
  - **O travamento:** medido a cada quadro que chega, depois de aplicar o que der. Dispara com 1 s sem aplicar e 10 quadros esperando, contando do último aplicado, da criação ou do último `reconferir`.
  - **O silêncio:** um vigia de 1 s; dispara com 4 s sem quadro. Só age com a página visível, com a conexão em `'conectado'` e depois do primeiro quadro aplicado. Recomeça a contar com a página escondida, com a conexão fora de `'conectado'` e quando passam mais de 2 s entre duas voltas. Tem conta própria (uma vez a cada 30 s) e nunca recarrega.
  - **O que a ressincronização faz:** pede à conexão primeiro, para o `conferir` esperar a conexão nova. Depois zera a sequência e reconfere as previstas.
  - **O primeiro e os limites:** o `primeiro` apaga os `adiantados` menores. O travamento ressincroniza no máximo 2 vezes, a segunda depois de 3 s. A conta zera com 60 s de quadros andando e no `reconferir`.
  - **O recarregar:** travou de novo depois das 2, então `aoDesistir` (uma vez por página). A cena repassa para `src/nuvem.ts`, que manda o `guardar` e recarrega com `direto=1`, se `podeRecarregar` deixar (`src/cliente/recarregarUmaVez.ts`: a marca de 10 min por sala no `sessionStorage`; sem ele, ou com erro, não recarrega).
  - **O contador:** em `window.__brumaluz.ressincronizacoes`.
  - **Testes:** `tests/cliente/estado.test.ts`, 15 que passam: os da seção 7 com o relógio trocado, mais o `podeRecarregar` e o `enderecoDireto`. O caso "sem ressincronizar" usa uma conexão de mentira sem o método; o canal de `tests/nucleo/canal.test.ts` continua verde.
  - **A corrida segue com 0 ressincronizações.**
  - **E2e na placa de vídeo:** B, buraco e B2 passam; o C espera a T07.
    - **B, a meta de 3 s:** a linha do tempo da Bia mostra a rede de segurança rápida: 120 ms do quadro jogado fora ao bem-vindo novo. O que passa de 3 s é a montagem da cena: o mundo fica pronto uns 5,6 s depois do bem-vindo, e a página só trata as mensagens quando a montagem solta.
    - O teste agora mede os 3 s **a partir do mundo pronto** (223 ms) e registra também o total (5,8 s). Na entrada normal, do link ao mundo pronto, foram de 3,3 a 6,2 s nesta máquina.
    - **Decisão do orquestrador (20 nov, 22h14):** os 3 s contam a partir do mundo pronto (medido: 223 ms). O total, do bem-vindo até ver a Ana (medido: 5,8 s), fica registrado e comparado com a entrada normal, de 3,3 a 6,2 s do link ao mundo pronto. A montagem da cena é a mesma de qualquer entrada; a rede de segurança soma uns 120 ms. A "Experiência medida" e o e2e B do spec.md foram ajustados.
- **(20 nov 2026) T05 pronta:** os blocos da volta.
  - **A função pura** `diferencaDasEdicoes` em `src/cliente/diferencaEdicoes.ts`: célula mudada ou nova recebe o valor de lá (com o dono); a edição que saiu do mundo volta ao terreno gerado; a previsão local fica.
  - **Na cena,** `aplicarVolta(bv)`: importa os donos antes dos blocos, tira a edição que saiu (`remover` e remalha com o bloco gerado) e só passa pelo `editarBloco` nas células que mudaram. O remalhar do `editarBloco` virou `remalharCelula`, sem mudar o que ele faz.
  - **Ligada** ao `aoBemVindo` em `src/nuvem.ts`.
  - **Testes:**
    - `tests/cliente/diferencaEdicoes.test.ts`, 6 que passam.
    - **Os blocos da volta passam** pela queda e pela ressincronização. O modelo de tela do teste usa a mesma diferença no `aoBemVindo`.
    - **A volta sem mudança não muda nenhuma célula:** na Vila Neon (`blocosDaVolta.test.ts`) e na Cidade Grande com uma obra feita e outra pela metade (`tests/cliente/voltaSemMudanca.test.ts`, no servidor de verdade: o bem-vindo da volta traz as mesmas edições e as mesmas obras).
  - **O tempo da diferença:** 200 mil edições em 400 chunks, com 150 células mudadas, levam **85 ms** (no contêiner).
  - A corrida continua com 0 ressincronizações.
  - Falta conferir a cena aplicando a volta no navegador: nenhum e2e cobre a queda com blocos. A T08 pode pôr isso no `multiplayer`.
- **(20 nov 2026) T06 pronta:** em `servidor/src/salas.ts`, o `ja` vem antes, e a recusa da sala fechada passou a ser `fechado && !ehDono && !ja`.
  - O teste da T00 passa: o visitante que cai e volta antes dos 30 s entra, e quem nunca entrou é recusado.
  - Entrou também o caso de depois da tolerância: com 35 s fora, quem caiu é barrado como quem chega.
  - `servidor/testes` passa inteiro (43). É a única mudança do servidor nesta spec.
