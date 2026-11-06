---
id: 009-servidor-local
title: 'Servidor local: separar a simulação do mundo do desenho, rodando em segundo plano no navegador'
status: IN_PROGRESS
base_branch: main
branch: feat/servidor-local
created_at: 2026-11-06T21:30:00Z
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
full_test_command: npx vitest run && npx playwright test
install_command: npm ci --no-audit --no-fund
---
## Contexto e problema
O dono quer o Terrário online, com mundos na nuvem e várias pessoas jogando juntas (spec 010). Hoje o jogo inteiro vive num programa só: `src/render/cena.ts` tem mais de 2.600 linhas e mistura o estado do mundo com o desenho na tela. Edições de blocos, baús, fornalhas, itens no chão, criaturas, moradores, vida e fome, dia e clima são alterados direto pelo código que desenha. Desse jeito não existe um lugar único que seja "o mundo" e que possa morar num servidor.

## Objetivo
Separar o jogo em duas partes que conversam só por mensagens:
- **Núcleo (simulação):** o mundo e as regras, em TypeScript puro, sem tela, sem Babylon e sem DOM. Roda igual no navegador e no Node.
- **Cliente:** desenho, sons, controles, interface e a física do próprio jogador (para o movimento responder na hora).

Nesta etapa o núcleo roda como **servidor local**, num Web Worker. Para quem joga **nada muda**: o mesmo jogo, offline, salvo no aparelho. Essa é a fundação da spec 010, em que o mesmo núcleo roda num servidor na Azure.

## Fora de escopo (desta etapa)
- Rede, servidor na nuvem, salas, códigos e mais de um jogador (spec 010).
- Mudanças de jogabilidade, de visual ou de som.
- Reescrever a geração de terreno, que já é pura e roda no worker de chunks.

## Regra central
**Paridade total.** Toda mudança de estado do mundo passa pelo núcleo, e nada no cliente altera o mundo direto. O jogador não percebe a troca: os mesmos mundos abrem, as mesmas ações dão os mesmos resultados e o desempenho não piora.

## Arquitetura
- **`src/nucleo/`:** módulo puro com o estado do mundo e as regras:
  - edições de blocos e regras de colocar e quebrar;
  - baús, fornalhas e itens no chão;
  - inventário, receitas, ferramentas e durabilidade;
  - trocas com moradores;
  - população (criaturas e moradores);
  - sobrevivência (vida, fome, ar, queda e desmaio);
  - dia, clima e estações;
  - contadores do diário;
  - povoados (regiões congeladas).

  O módulo não importa nada de `render/`, `ui/` nem `audio/`. Um teste confere essa regra.
- **Relógio fixo:** o núcleo avança em passos fixos de 50 ms (20 por segundo), com sorteios pela semente. Os mesmos comandos dão sempre o mesmo estado, e isso permite testar e reproduzir problemas.
- **Protocolo:** mensagens tipadas e serializáveis, já pensadas para a rede:
  - do cliente para o núcleo vão **comandos**: posição e olhar do jogador, quebrar, colocar, usar, abrir baú, mover item, craftar, trocar, dormir, comer e assim por diante;
  - do núcleo para o cliente vão **eventos e estado**: bloco mudou, baú mudou, item caiu, criaturas (posição, estado, animação), vida e fome, dia e clima, avisos do diário e sons a tocar.

  Tudo é identificado por id e tem número de versão. O núcleo manda só o que interessa à região perto do jogador.
- **Resposta imediata:** ações do próprio jogador (colocar e quebrar bloco, mexer no inventário) aparecem na hora no cliente e são confirmadas ou desfeitas pelo núcleo, como no Minecraft. Localmente a confirmação chega no quadro seguinte.
- **Persistência por adaptador:** o núcleo salva e carrega por uma interface (`Armazem`). Nesta etapa a implementação é o IndexedDB de hoje; na 010 entra a da nuvem. O formato salvo atual continua válido.
- **Geração de terreno:** continua no worker de chunks e pela semente. O núcleo usa a mesma função pura para colisão, criaturas e regras.

## Critérios de qualidade (definição de pronto)
1. **Paridade por sessão gravada:** antes de mexer em qualquer coisa, gravar sessões roteirizadas no `main` atual, com o estado salvo ao fim de cada uma:
   - minerar, construir, craftar e usar fornalha;
   - baús e trocas;
   - sobrevivência com dano, fome e cama;
   - criaturas e moradores por 10 dias;
   - clima e estações.

   Depois da separação, as mesmas sessões precisam dar o mesmo estado salvo, em pelo menos 3 sementes e 2 temas.
2. **Fronteira limpa:** um teste falha se `src/nucleo/` importar algo de `render/`, `ui/`, `audio/`, `@babylonjs` ou do DOM. O núcleo roda num teste em Node puro.
3. **Determinismo:** os mesmos comandos, na mesma semente, dão estado idêntico em duas execuções, com o hash comparado a cada 100 passos.
4. **Nenhuma regressão:** todos os testes unitários e e2e atuais passam, incluindo o robô de exploração nos 6 temas e as capturas.
5. **Mundos antigos:** mundos salvos antes desta etapa abrem iguais (teste com saves gravados dos mundos de hoje).
6. **Resposta:** colocar e quebrar bloco aparece no mesmo quadro do clique; a confirmação do núcleo chega em até 2 quadros.
7. **Desempenho:** no desktop e no celular simulado, o tempo da linha principal por quadro não piora, e deve melhorar, porque a simulação sai dela. Medido antes e depois na mesma cena.
8. **Protocolo pronto para rede:** todas as mensagens passam por serialização. Um teste roda o núcleo atrás de um canal que serializa, atrasa 150 ms e embaralha a ordem de entrega dentro da mesma janela, e o jogo continua consistente.
9. **Auditoria independente** ao fim, com os achados verificados e corrigidos.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Gravador de sessões e sessões de paridade no `main` atual (critério 1), antes de qualquer mudança |
| T02 | Protocolo de mensagens (comandos, eventos, estado), serialização e versão |
| T03 | Núcleo: blocos e edições, regras de colocar e quebrar, regiões de povoado |
| T04 | Núcleo: inventário, receitas, ferramentas, baús, fornalhas e itens no chão |
| T05 | Núcleo: população (criaturas e moradores), trocas e sobrevivência |
| T06 | Núcleo: dia, clima, estações, diário e salvamento pelo adaptador `Armazem` |
| T07 | Servidor local em Web Worker com relógio fixo; cliente passa a só enviar comandos e aplicar eventos |
| T08 | Resposta imediata com confirmação ou desfazer; interpolação das criaturas no cliente |
| T09 | Enxugar `cena.ts` (desenho e entrada separados em módulos), fronteira, determinismo e canal com atraso (critérios 2, 3 e 8) |
| T10 | Paridade, mundos antigos, desempenho, e2e completo, auditoria e relatório |

## Riscos
- **Regressões escondidas:** é uma mudança grande em código que funciona. Mitigação: sessões gravadas antes (T01), paridade obrigatória e migração por partes, com o jogo sempre funcionando entre uma tarefa e outra.
- **Atraso nas ações:** a ida e volta ao worker pode atrasar o jogo. Mitigação: resposta imediata no cliente (T08) e medição (critério 6).
- **Criaturas tremendo:** o núcleo a 20 passos por segundo contra o desenho a 60 quadros por segundo. Mitigação: interpolação no cliente.
- **Celular:** um worker a mais. Mitigação: medir (critério 7); o worker tira trabalho da linha principal.

## Decisões do dono (2026-11-06)
- Mundo na nuvem com multiplayer; pode rever a arquitetura e mandar o que for preciso para o servidor.
- Separar primeiro a simulação (esta etapa) e depois pôr em rede (spec 010).
