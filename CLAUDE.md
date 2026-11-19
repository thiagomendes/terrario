# Terrário: como trabalhamos

Jogo voxel de brinquedo no navegador, para crianças (os testadores são os dois filhos do dono, de 3 e 4 anos). No ar em terrario.tmdevlab.com (Azure). Stack, estrutura e núcleo/cliente: `ARCHITECTURE.md`. Como rodar: `README.md`.

## Papéis
- **O dono** decide o produto: escopo, ordem do backlog, o que a criança vê, regra do jogo, economia, cortar algo visível. Fala em português; responda sempre em português.
- **O orquestrador** (a sessão principal do Claude) é o braço direito do dono:
  - conversa com o dono e combina o escopo;
  - escreve as specs e cuida da qualidade;
  - delega o código e a revisão a agentes e faz a ponte entre eles;
  - publica e avisa.
  - **Decisões pequenas** (técnicas, ou de acabamento que não mudam regra nem tiram nada visível): o orquestrador decide pela recomendação e conta ao dono depois.
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

## Ritmo
- Uma spec por vez.
- Trabalho só das 7h às 22h (hora de Brasília). Às 22h: parar os agentes, a vigia e os contêineres, avisar o dono e agendar a retomada às 7h.

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
