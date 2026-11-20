# 035 Entrada na nuvem: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou e um commit `tipo(035-entrada-na-nuvem): ...`.

Os e2e rodam na placa de vídeo: `scripts/e2e-gpu.sh <spec>`, e depois `scripts/limpar-restos-root.sh <pasta>`.

## Fase 0: as provas, no código de antes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T00 | **Os testes que falham antes**, sem mexer no jogo:<br>- `tests/cliente/corridaNuvem.test.ts`, a partir de `referencia/corrida.ts`, com o servidor real e as esperas de 0 ms, uma tarefa, 120 ms, 500 ms e 2 s (spec, "O que muda", seção 5);<br>- o teste de comportamento da entrada no lugar de `tests/cliente/entradaNuvem.test.ts` (o de texto sai);<br>- o teste de `enderecoDoMundo` escrito contra a lógica de hoje do `abrirMundo` (falha: o `sala` fica);<br>- rodar e anotar na Situação o que falha e o que passa.<br><br>Commit só disso. Os que falham ficam falhando, sem `skip` nem `fails`, até a fase que os conserta. | M |
| T01 | **Os e2e que falham antes:** `e2e/entrada-nuvem.spec.ts` com A (IndexedDB da Ana lento), B (o primeiro quadro jogado fora) e C (sair da nuvem para o Rancho).<br>- Rodar na `main`: A passa, B e C falham;<br>- anotar o resultado e o tempo de cada um na Situação. | M |

## Fase 1: a conexão não perde mensagem
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T02 | **A fila em `conexaoNuvem`:**<br>- guarda até o primeiro `aoReceber` e entrega tudo em ordem, logo depois que ele volta (`queueMicrotask`);<br>- o que chega no meio vai para o fim;<br>- o teto de 200;<br>- o `encerrar()` esvazia e fecha com 1000.<br><br>A corrida e o teste de comportamento passam; o e2e A continua verde. | P |

## Fase 2: a rede de segurança
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T03 | **Na conexão:**<br>- `ressincronizar?()` na interface `Conexao`;<br>- na `conexaoNuvem`: fecha com 4001, abre outra na hora e passa por `'ressincronizando'`;<br>- em `src/nuvem.ts`, sem o aviso de queda e sem o "Voltamos!" (ou o que o dono decidir na pergunta 1);<br>- testes. | P |
| T04 | **No estado do cliente:**<br>- o travamento medido a cada quadro (1 s e 10 quadros esperando, sem aplicar nenhum);<br>- zera a sequência, reconfere as células previstas e pede a ressincronização;<br>- no máximo 2, a segunda só depois de 3 s; a conta zera com 60 s de quadros andando e no `reconferir`;<br>- depois da segunda, a decisão da pergunta 2 (na recomendada: recarregar uma vez com `direto=1`, com a marca de 10 min em `sessionStorage`);<br>- o relógio que o teste troca e o contador no `window.__brumaluz`;<br>- os testes da seção 5.<br><br>O e2e B passa. | M |

## Fase 3: sair da nuvem
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T05 | **`enderecoDoMundo` e o `abrirMundo`:** tira `sala`, `novo`, `direto` e `tema`, põe `mundo` e deixa o resto.<br>O teste de unidade e o e2e C passam. | P |

## Fase 4: nada voltou para trás
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T06 | **A suíte:**<br>- Vitest inteiro e `npm run build`;<br>- paridade 36/36;<br>- o e2e inteiro em pedaços de 2 trabalhadores;<br>- `entrada-nuvem` 3 rodadas seguidas verdes;<br>- o contador de ressincronizações em 0 nos e2e de amigos;<br>- o que cair, conferido contra a `main`. | M |

## Fase 5: publicação
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T07 | **Publicar:**<br>- o protocolo não mudou: push na `main`, e só o `publicar.yml` sai (o servidor não muda);<br>- conferir no ar: levar um mundo para a nuvem pelo celular, o amigo entrar, cada um ver o outro, e sair para outro mundo;<br>- no registro do servidor, nenhum 1005 de quem levou o mundo e nenhum 4001;<br>- o relatório para o dono e a Situação aqui. | P |

**Ordem:** T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07. A T04 espera as respostas do dono (perguntas 1 e 2 da spec); a T05 não depende delas e pode vir antes, se for preciso esperar.

## Situação
- **(20 nov 2026) Rascunho, falta revisão.**
