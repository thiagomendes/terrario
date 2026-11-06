---
id: 002-edicao-e-refino-visual
title: 'Brumaluz: seleção, quebra e colocação de blocos e refino visual'
status: COMPLETED
base_branch: main
created_at: 2026-11-05T15:30:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174/
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
formatters:
- name: prettier
  command: npx prettier --write .
  workdir: .
  paths:
  - '**'
failure_artifacts:
- test-results/**/error-context.md
screenshots:
- test-results/screens/**/*.png
environment: docker
full_test_command: npx vitest run && npx playwright test
install_command: npm ci --no-audit --no-fund
lockfiles:
- package-lock.json
---
## Contexto e Problema
A spec 001 entregou a cena de validação de Brumaluz: terreno em chunks, atlas procedural, céu, névoa, sombras, vegetação, física e HUD. O mundo ainda é só para olhar. Esta etapa tem duas metas: (1) refinar a direção visual com melhorias específicas de iluminação, materiais, vegetação e legibilidade; (2) deixar o jogador selecionar, quebrar e colocar blocos, com destaque visual do bloco apontado e uma barra simples de 6 tipos. Fora do escopo: crafting, multiplayer, inventário com contagem, coleta, criaturas, ciclo dia e noite e salvamento.

## Abordagem Técnica
Mesma stack (TypeScript, Vite, Babylon.js 7.31.0, Vitest, Playwright), sem dependência nova e sem arquivos de arte externos.

### Contrato de edição de blocos
- Edições vivem num registro puro (`src/world/edicoes.ts`), por coordenada de mundo, agrupado por chunk `"cx,cz"` como pares `[indiceLocal, bloco]`, serializável em JSON (base para um salvamento futuro).
- O chunk editado é gerado por `gerarChunkEditado(cx, cz, semente, edicoes)`: terreno determinístico mais edições aplicadas por cima.
- Cada alteração incrementa a versão do chunk. O worker recebe as edições do chunk e dos 4 vizinhos (a borda altera a visibilidade de faces vizinhas). Respostas com versão antiga são descartadas.
- Editar enfileira a remalha do chunk e dos vizinhos afetados. A fila aplica no máximo 2 malhas por quadro, com os chunks editados na frente.
- `criarMundoSolido` consulta as edições, então a colisão acompanha o que o jogador quebra e coloca.
- A camada y=0 não pode virar ar. Coordenadas fora de 0 a 63 em y são recusadas.

### Contrato de interação
- Raycast de voxel (DDA) a partir do olho, alcance 5 blocos. Qualquer bloco diferente de ar é alvo (inclui plantas).
- Botão esquerdo (com pointer lock) quebra o alvo. Botão direito coloca o bloco do slot ativo na face apontada, a menos que o bloco colida com a caixa do jogador. O menu de contexto é suprimido.
- Barra de 6 slots, blocos ilimitados (sem inventário): terra musgosa, pedra rachada, areia-bruma, madeira retorcida, tábuas, cristal-luz. Teclas 1 a 6 e roda do mouse (com volta ao início e ao fim) trocam o slot.
- O bloco apontado ganha um contorno de arestas cor âmbar e há uma mira central discreta.
- Ganchos de teste em `window.__brumaluz` (além de `ready`, `fps`, `chunksCarregados`, `escalaResolucao`, `posicao`, `rotacao`): `interagir('quebrar' | 'colocar')` devolve boolean (funciona sem pointer lock), `selecionarSlot(i)`, `apontar(yaw, pitch)`, `bloco(x, y, z)`, `slotAtivo`, `alvo` (`{x,y,z,normal}` ou null), `destaqueVisivel`, `malhasAtivas`, `remalhasConcluidas`, `remalhaMs`, `aplicadasNoUltimoQuadro`.
- Marcação da barra: `[role="toolbar"]` com aria-label "Barra de blocos", 6 botões `[data-slot]` com nome em pt-BR e `aria-pressed` no ativo. A mira é `.mira`.

### Refino visual (preserva o crepúsculo âmbar e violeta e a flora bioluminescente)
- Iluminação: luz hemisférica de preenchimento azul-petróleo para as sombras não ficarem pretas, névoa mais rala para a legibilidade a distância, glow mais presente só nos emissivos, sombras em 2 cascatas como antes.
- Materiais: tiles por face (topo, lado, base). Terra musgosa com musgo no topo e borda pingando nas laterais; madeira com anéis no topo. O atlas continua com 12 células (4x3).
- Vegetação: altura e escala variadas por posição (determinístico), variação de tom por vértice e balanço só no ápice (peso no canal alfa da cor de vértice).

### Desempenho
- Fila de remalha com limite por quadro, malhas por chunk inalteradas (uma sólida e uma de plantas), métricas expostas e anexadas ao relatório do Playwright. FPS no SwiftShader é informativo.

## Decisões
- Salvamento local fica para a próxima etapa; o registro de edições já é serializável (spec 002).
- Sem coleta nem contagem: blocos ilimitados na barra, para não ampliar o escopo (spec 002).
- Entrada continua só teclado e mouse. Os ganchos de `__brumaluz` permitem testar sem pointer lock (spec 002).
- Contorno do alvo feito com linhas Babylon (12 arestas), sem pós-processamento (spec 002).
- A pendência conhecida de chunk descartado aplicado duas vezes é corrigida na T03, pois a remalha a agravaria. A pendência do spawn em árvore fica fora desta etapa.

## Premissas
- Mantidos nome Brumaluz, interface em pt-BR, tecnologia e arte 100% procedural.
- Seis tipos na barra, sem inventário. Salvamento, coleta e criaturas ficam para depois.
- Sem dependência nova; o `package.json` mantém versões exatas.
- Docker e portas inalterados (`.nants/` não muda); app na porta 5174.

## Critérios de Aceitação Globais
- [ ] O `test_command` passa e as checagens `typecheck` e `build` passam, sem dependência nova.
- [ ] O jogador aponta, quebra e coloca blocos, e a colisão e a malha refletem a mudança.
- [ ] A barra de 6 blocos mostra o slot ativo e muda por teclas 1 a 6 e roda do mouse.
- [ ] Iluminação, materiais, vegetação e legibilidade têm melhorias comprovadas por testes de constantes e de geometria.
- [ ] Qualidade visual conferida pelas capturas em desktop, tablet e celular: barra com ícones do atlas e slot ativo evidente, contorno do alvo legível sobre o terreno, mira discreta, sem rolagem lateral nem elementos cortados no celular, contraste legível, uso da largura no desktop.
- [ ] Desempenho: remalha limitada por quadro, número de malhas estável após edições e métricas por viewport anexadas ao relatório.
- [ ] Os testes e2e rodam sem `pageerror` nem `console.error` e gravam capturas dos três viewports.
- [ ] Identidade preservada: arte procedural, sem recurso de Minecraft, versões exatas nos manifestos.
- [ ] README.md e o relatório de validação descrevem a nova etapa, com comandos de executar e testar.

## Orientações por papel
### Desenvolvedor
- Lógica nova (edições, raycast, hotbar, fila, arestas) é pura, sem Babylon, em Vitest ambiente node. Não há jsdom: não teste DOM no Vitest, deixe para o Playwright.
- Teste colisão e edição com o mundo real (`criarMundoSolido`, `gerarChunkEditado`), não com sólidos sintéticos.
- Coordenadas negativas: use `Math.floor` e módulo positivo ao achar chunk e índice local.
- Ao remalhar, libere (`dispose`) a malha anterior e ignore respostas do worker com versão antiga.
- O balanço lê o canal alfa da cor de vértice: confirme que o material não ativa transparência por alfa de vértice.
- `cena.ts` é compartilhado por várias tarefas: siga a ordem das dependências.

### Revisor
- Confira o uso do mundo real nos testes de interação e que `y=0` nunca vira ar.
- Procure vazamento de malhas na remalha (dispose) e aplicação duplicada de resposta obsoleta.
- Confira que nenhum ganho visual veio de luz dinâmica extra, sombra nova ou textura externa.
- Nas capturas, a barra e o contorno devem estar visíveis e inteiros nos três viewports.

## Persistência da instalação
- Conferência da instalação (`npm ci --no-audit --no-fund`, código 0): 0 entradas gravadas fora de /work, em 8 s (aviso acima de 10 entradas).

## Decisões de Arbitragem
- Revisão 2, T09 F-02 (mantido, obrigatório): O Desenvolvedor deixou o aviso 1 e o Revisor o refutou: O material de plantas pode estar usando o alfa de vértice como …. Motivo: A contestação não resolve o apontamento. Ele diz que o código não tem defeito, e eu confirmei isso em src/render/cena.ts:223-225: a transparência vem só da textura difusa e nenhuma malha define hasVertexAlpha. Então o aviso do Desenvolvedor sobre o alfa de vértice é infundado e deve ser retirado. Nenhum critério muda.
