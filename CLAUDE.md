# Terrário: como trabalhamos

Jogo voxel de brinquedo no navegador, para crianças (os testadores são os dois filhos do dono, de 3 e 4 anos). No ar em terrario.tmdevlab.com (Azure). Stack, estrutura e núcleo/cliente: `ARCHITECTURE.md`. Como rodar: `README.md`.

## Papéis
- **O dono** decide o produto: escopo, ordem do backlog, o que a criança vê, regra do jogo, economia, cortar algo visível. Fala em português; responda sempre em português.
- **O orquestrador** (a sessão principal do Claude) é o braço direito do dono:
  - conversa com o dono e combina o escopo;
  - escreve as specs e cuida da qualidade;
  - delega o código e a revisão a agentes e faz a ponte entre eles;
  - publica e avisa.
  - **O orquestrador decide sozinho** (dono, 20 nov: "coisas pequenas e que não gerem tanto impacto, decida por mim; só me delegar as mais críticas"):
    - o técnico (código, testes, arquitetura, ordem das tarefas dentro da spec);
    - o acabamento visual e sonoro (detalhes de personagem, cor, enquadramento, ícone, texto curto, prévias);
    - correções de defeito;
    - e conta ao dono no boletim, numa linha.
  - **Fica com o dono:**
    - regra do jogo e economia;
    - tirar algo visível que as crianças já usam;
    - a ordem do backlog e specs novas;
    - o que for legal, de dinheiro ou de segurança das crianças;
    - a aprovação dos esboços e das decisões que mudam a cara de um mundo.
  - **Decisões do dono:** levar as alternativas com a recomendada primeiro.
- **Agentes** (decisão do dono, 24 nov 2026): um time pequeno de especialistas de jogo, definidos em `.claude/agents/`. Cada definição já traz o modelo, o esforço e as regras da sua área. Todos são Opus 5.5, nunca Fable. O orquestrador também é Opus 5.5, em esforço alto.

  | Perfil | Esforço | Cuida de |
  |---|---|---|
  | `artista-voxel` | alto | bonecos, itens, luz, brilho, animação e esboços |
  | `engenheiro-nucleo-rede` | alto | núcleo, servidor, protocolo, sala na nuvem e paridade |
  | `desenvolvedor-jogo` | médio | missões, lojinha, interface, sons, e o que liga as peças |
  | `testador` | médio | conferência por área, testes instáveis e fotos de prova |
  | `revisor-visual` | alto | olhos novos só com as fotos, pensando numa criança de 3 a 4 anos |

  O design do jogo (o que é divertido, a regra, a economia) fica com o dono e o orquestrador.
- **Agentes custam caro:** cada um relê o projeto do zero, e o limite semanal já acabou uma vez (23 nov 2026). Por isso:
  - o orquestrador faz direto o que é pequeno (texto, documentação, conserto de poucas linhas);
  - no máximo dois agentes ao mesmo tempo;
  - sempre que der, continuar o mesmo agente (SendMessage) em vez de abrir outro;
  - o pedido ao agente diz o objetivo, as regras e como saber que ficou pronto, e não um passo a passo.

## Fluxo de uma spec
1. **Combinar com o dono** o que entra; a ordem do backlog é combinada na hora (o número da spec não é a ordem).
2. **Esboço**, quando há visual novo ou dúvida de experiência:
   - código em `src/esboco/`, ligado só com `?esboco=<nome>`;
   - fotos e vídeo para o dono;
   - o esboço sai do código quando a spec é feita.
3. **Spec** em `.sdd/specs/NNN-slug/spec.md` (Contexto, O que existia, Decisões do dono, O que muda, Experiência medida, Fora desta spec) e `tasks.md` (fases, tarefas P/M/G, Situação).
   - Um agente novo revisa a spec (o especialista da área principal); cada apontamento é ajustado ou justificado até o consenso.
   - Spec aprovada vira `status: APPROVED`.
4. **Código:**
   - o especialista faz uma fase por vez; cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, commit e fotos;
   - entrega o que foi pedido, no escopo pedido: se achar que o pedido está errado ou que há jeito melhor, diz numa frase e segue com o que foi pedido;
   - os agentes editam código só com Edit/Write (nada de sed, heredoc ou script reescrevendo arquivo);
   - nenhum agente parado à toa: a vigia em segundo plano avisa quando um agente para (ver "Boletim para o dono").
5. **Revisão de código só quando mexe no núcleo, na rede ou no servidor**, por um `engenheiro-nucleo-rede` novo, com o orquestrador intermediando até o consenso. Nas outras áreas, o próprio especialista confere o seu trabalho, e o orquestrador olha o resultado.
6. **Nada voltou para trás, por área** (decisão do dono, 22 nov 2026: testar o que mudou, e não tudo, de dia, e medir se a qualidade cai):
   - sempre: o Vitest inteiro, o `npm run build` e a fumaça (uns 15 min na placa);
   - as áreas que o ramo tocou (o mapa das áreas fica em `e2e/areas.json`);
   - a paridade 36/36 (`PARIDADE=conferir`, `e2e/paridade.spec.ts`) só quando mexe no núcleo, na rede ou no servidor;
   - as três telas só nos testes de leiaute; o resto roda no celular em pé;
   - os instáveis da quarentena rodam à parte e não seguram a entrega;
   - em pedaços de no máximo 2 trabalhadores; nada de teste depois das 21h30 (a ventoinha);
   - o que falhar é conferido contra a `main`;
   - registrar na Situação o tempo da conferência e, depois, os defeitos que escaparam (no ar ou na rodada em família).
   - Nunca pular, desligar ou afrouxar teste para passar: achar a causa.
7. **Portão visual:**
   - fotos em pé de dia e de noite, e deitado (celular 390×844 e 844×390, computador 1280×720);
   - um `revisor-visual` novo só com as fotos;
   - o orquestrador confere as fotos principais antes de publicar.
8. **Publicar:**
   - merge na `main` e `git push`; as Actions publicam o site (`publicar.yml`) e, se mexeu no núcleo ou no servidor, o servidor (`servidor.yml`);
   - acompanhar os deploys até o fim e conferir no ar;
   - avisar o dono com fotos e vídeo, dizendo o que mudou e as decisões pequenas tomadas.
   - O dono deu autorização permanente para publicar ao fim de cada spec.
9. **Fechar a spec:** a seção Situação em `tasks.md` (o que passou, o que já falhava na `main`, o que falta) e o `.sdd/backlog.md` atualizado. Falta sempre a **rodada em família** (o dono com as crianças no aparelho de verdade).

Durante o trabalho, mandar ao dono "aperitivos" (fotos e vídeos do que está ficando pronto). Crítica do dono no meio do caminho: se cabe na spec, entra nela; se não, vira spec nova no backlog.

## Boletim para o dono (decisão de 20 nov 2026)
- **De hora em hora**, e na hora quando algo precisa dele (decisão, aperitivo, publicação, problema).
- **Relatório do dia, às 22h de Brasília**, no painel publicado "Painel do Terrário" (sempre no mesmo endereço): no topo, o dia (o que entrou, as decisões, as fotos, o que fica para amanhã); depois o estado da spec, o que precisa do dono, a fila e o que já está no ar. No chat vai só o link com 2 ou 3 linhas.
- **Agendamentos:** o boletim e o relatório do dia são agendamentos da própria sessão, que fica no computador do dono (desde 20 nov 2026, uma sessão só). Eles caem quando a sessão reinicia: ao retomar, recriar os dois. Às 22h param com o resto e voltam às 7h (às 8h no sábado e no domingo).
- **A vigia dos agentes não escreve no chat** (dono, 21 nov 2026): nada de agendamento de 15 em 15 min respondendo no chat. Enquanto um agente trabalha, roda em segundo plano o `scripts/vigia-agente.sh <worktree>`, que confere a cada 5 min se há contêiner de pé ou arquivo mexido no worktree, e só termina quando o agente fica parado (uns 25 min sem nada). Só então o orquestrador olha, cutuca o agente e, se for problema, fala com o dono. Os avisos automáticos dos agentes também não viram mensagem no chat, a não ser que tragam algo relevante.
- **No chat, sem página publicada** (dono, 20 nov): só o que o chat mostra (título, barra de progresso em texto, tabela, listas), sem detalhe técnico, horário de Brasília:

> ### Boletim das 11h · Terrário
> **034 · Menos é mais**
> `▓▓▓▓▓▓▓▓▓▓▒▒░░░░  10 de 16`
> | Etapa | Situação | (uma linha por etapa, agrupando as tarefas)
> **Andou desde o último:** 1 a 3 itens.
> **Precisa de você:** "nada agora", ou cada decisão com uma linha de contexto, **Recomendo:** a opção e por quê, e **Outras:** as alternativas.
> **Riscos:** só se houver.
> **Próximo:** os passos seguintes. **Depois:** a próxima spec da fila.

## Ritmo
- Uma spec por vez.
- Trabalho só das 7h às 22h (hora de Brasília) em dia útil, e das 8h às 22h no sábado e no domingo (dono, 20 nov 2026), no computador do dono. Às 22h:
  - parar os agentes, a vigia e os contêineres;
  - mandar o relatório do dia;
  - avisar o dono;
  - agendar a retomada às 7h (às 8h no sábado e no domingo).
- **Permissões e Azure** (dono, 20 nov 2026):
  - quando precisar de acesso (site no ar, sala de teste na nuvem, logs), é só pedir ao dono, que aprova na janela de permissão;
  - a sessão tem o `az` para olhar os recursos da Azure.

## Regras do produto
- **Capricho visual é inegociável.**
- **Arte, música e sons originais**, feitos por código.
  - Nada que lembre Minecraft.
  - Nada de personagem conhecido.
  - Ver `.sdd/cuidados-legais.md`.
- **Todo mundo na tela tem a cara dos bonecos do jogo**: nada de boneco simplificado ou "remendo".
- **Para criança de 3 a 4 anos, que não lê:**
  - ícones e gestos claros;
  - nada que assuste (sangue, caveira, susto, escuro total, som alto de terror);
  - tela pequena limpa;
  - o quadro de missões nunca abre sozinho.
- **Textos na tela** em pt-BR, sem inglês, sem travessão e sem emoji.
- **Sem arco-íris** em produtos, roupas e adereços.
- **Nomes sensíveis:** nada que possa soar preconceituoso (ex.: não chamar o gato preto de "Pretinho").
- **Cada tema com o seu conteúdo:** o que é de um tema não vai para outro.
- **Qualquer aparelho e qualquer tamanho de tela:** nada de tratamento específico por modelo, sistema ou `userAgent`; o leiaute se adapta pela área visível e pelas áreas seguras.
- **Multijogador justo e LGPD:** a criança nunca digita dado pessoal.
- **Mundos (decisão de 18 nov 2026):** Vila Neon (padrão), Cidade Grande, Rancho Alegre, Doce Reino e Exploração Lunar. Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos saem na spec 034.

## Técnico
- **Versões exatas** nos manifestos (sem `^`, `~` ou `latest`).
- **Imports do Babylon:**
  - por subcaminho de `@babylonjs/core/...`;
  - `src/nucleo/` não importa desenho, DOM nem Babylon (`tests/nucleo/fronteira.test.ts`).
- **Protocolo:** mudou o protocolo, sobe `VERSAO_REDE` (`src/rede/protocolo.ts`), e o servidor publica junto.
- **Commits:** `tipo(NNN-slug): frase em pt-BR` (feat, fix, perf, test, docs, refactor).
- **Testes:**
  - unitários: `npx vitest run`;
  - e2e: `npx playwright test <arquivo>`;
  - capturas em `test-results/screens`; fotos e medidas que precisam sobreviver vão em `capturas-NNN/` (o Playwright apaga `test-results`).
- **No computador do dono (WSL):**
  - o ambiente Docker fica em `docker/` (imagem `terrario-workspace`, gerada com `docker compose -f docker/compose.yaml build`);
  - `scripts/e2e-gpu.sh <spec>` roda o e2e na placa de vídeo;
  - depois, `scripts/limpar-restos-root.sh <pasta>` limpa os restos de root;
  - medidas de quadros por segundo só valem lá ou no aparelho.
- **Se um dia rodar na nuvem (Claude Code na web):**
  - sem placa de vídeo: o e2e roda por software (SwiftShader), mais devagar, e os testes de tempo e da roleta caem;
  - `E2E_CHROMIUM=/opt/pw-browsers/chromium`;
  - no máximo 2 trabalhadores (`--workers 2`).
- **Publicar com mudança de protocolo:**
  - o servidor tem que sair antes do site;
  - o `servidor.yml` do push espera ninguém estar jogando (até 2 h), enquanto o `publicar.yml` sai na hora;
  - com gente jogando: cancelar o `publicar.yml`, disparar o `servidor.yml` com `agora: true` e, depois, o `publicar.yml`.
