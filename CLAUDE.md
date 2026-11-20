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
- **Agentes**: todos Opus 5.5 em esforço high, nunca Fable.
  - **Desenvolvedor:** implementa por fases.
  - **Revisor:** revisa specs e código; para o portão visual, um revisor novo que só vê as fotos.

## Fluxo de uma spec
1. **Combinar com o dono** o que entra; a ordem do backlog é combinada na hora (o número da spec não é a ordem).
2. **Esboço**, quando há visual novo ou dúvida de experiência:
   - código em `src/esboco/`, ligado só com `?esboco=<nome>`;
   - fotos e vídeo para o dono;
   - o esboço sai do código quando a spec é feita.
3. **Spec** em `.sdd/specs/NNN-slug/spec.md` (Contexto, O que existia, Decisões do dono, O que muda, Experiência medida, Fora desta spec) e `tasks.md` (fases, tarefas P/M/G, Situação).
   - O revisor revisa a spec; cada apontamento é ajustado ou justificado até o consenso.
   - Spec aprovada vira `status: APPROVED`.
4. **Código:**
   - o desenvolvedor faz uma fase por vez; cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, commit e fotos;
   - os agentes editam código só com Edit/Write (nada de sed, heredoc ou script reescrevendo arquivo);
   - nenhum agente parado à toa: vigiar a cada ~15 min enquanto um agente trabalha.
5. **Revisão de código** pelo revisor, com o orquestrador intermediando até o consenso.
6. **Nada voltou para trás:**
   - Vitest inteiro e `npm run build`;
   - paridade 36/36 (`PARIDADE=conferir`, `e2e/paridade.spec.ts`);
   - a suíte e2e inteira, em pedaços de no máximo 2 trabalhadores;
   - o que falhar é conferido contra a `main`.
   - Nunca pular, desligar ou afrouxar teste para passar: achar a causa.
7. **Portão visual:**
   - fotos em pé de dia e de noite, e deitado (celular 390×844 e 844×390, computador 1280×720);
   - autocrítica e uma rodada de refazer;
   - um revisor novo só com as fotos;
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
- **Agendamentos:** o boletim, o relatório do dia e a vigia são agendamentos da própria sessão (as tarefas agendadas do claude.ai foram recusadas nesta sessão, que fala com o computador do dono). Eles caem quando a máquina da nuvem reinicia: depois de um reinício, recriar os três.
- **A vigia dos agentes é silenciosa:** a cada ~15 min, só fala com o dono se houver problema.
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
- No computador do dono, trabalho só das 7h às 22h (hora de Brasília); às 22h: parar os agentes, a vigia e os contêineres, avisar o dono e agendar a retomada às 7h. Na nuvem (Claude Code na web) não há pausa das 22h (decisão do dono, 19 nov 2026).

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
- **Na nuvem (Claude Code na web):**
  - sem placa de vídeo: o e2e roda por software (SwiftShader), mais devagar;
  - máquina de 4 núcleos: no máximo 2 trabalhadores (`--workers 2`).
