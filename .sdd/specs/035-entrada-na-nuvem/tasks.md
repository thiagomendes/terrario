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
