# Brumaluz

## Visão geral
Jogo 3D de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Identidade própria: crepúsculo eterno e brumoso, blocos pintados por código e flora bioluminescente. Interface em português do Brasil. Não usa nenhum recurso, nome ou marca de Minecraft.

A spec 001-cena-validacao entregou uma cena jogável de validação visual: terreno em streaming de chunks, ambiente completo, jogador com física e controles, HUD, resolução adaptativa, testes e2e com capturas em três viewports e relatório em `docs/validacao-visual.md`.

A spec 002-edicao-e-refino-visual (concluída) acrescentou seleção do bloco apontado com contorno e mira, quebra e colocação de blocos, barra de 6 tipos, fila de remalha com métricas e o refino de iluminação, materiais com tiles por face e vegetação. O README e o relatório de validação foram atualizados.

## Stack
- TypeScript 5.6.3, Vite 5.4.10, Babylon.js (`@babylonjs/core` 7.31.0, imports por módulo para tree-shaking).
- Vitest 2.1.4 para a lógica pura (ambiente node, sem jsdom); Playwright 1.48.2 (Chromium) para e2e e capturas; Prettier 3.3.3.
- Docker: imagem base `mcr.microsoft.com/playwright:v1.48.2-noble` (traz Node e navegadores), via `.nants/Dockerfile` e `.nants/compose.yaml` (serviço `workspace`, porta 5174).

## Estrutura
- `src/main.ts`: ponto de entrada; `index.html` na raiz.
- `src/world/`: `blocks.ts`, `noise.ts`, `chunk.ts` (blocos, ruído, geração de chunks; lógica pura, sem Babylon) e `edicoes.ts` (registro puro de edições).
- `src/mesh/malha.ts`: malha de chunk (faces visíveis, AO por vértice, tiles por face, vegetação em quads cruzados).
- `src/art/atlas.ts`: atlas de texturas procedural (buffer RGBA puro, envolvido por canvas no navegador).
- `src/workers/chunk.worker.ts`: geração, aplicação de edições e malha de chunks em Web Worker.
- `src/render/`: `cena.ts`, `gerenciador.ts` (streaming), `atmosfera.ts`, `balanco.ts`, `resolucao.ts`, `remalha.ts`, `fila.ts` (fila de remalha), `destaque.ts` (contorno do bloco apontado).
- `src/player/`: `fisica.ts`, `controle.ts`, `entrada.ts`, `alvo.ts` (raycast de voxel e regra de colocação), `hotbar.ts` (estado da barra), `interacao.ts` (quebrar, colocar, trocar de bloco).
- `src/ui/`: `interface.ts` (HUD e tela de entrada) e `barra.ts` (barra de blocos).
- `tests/` (Vitest, por área: `mesh`, `player`, `render`, `world`) e `e2e/` (Playwright: `fumaca.spec.ts`, `interacao.spec.ts`, `barra.spec.ts`, `visual.spec.ts`).
- `docs/validacao-visual.md`: relatório de validação visual e desempenho.
- Configs na raiz: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`.

## Comandos (instalar, testar, executar)
- Instalar: `npm ci --no-audit --no-fund`
- Testes rápidos: `npx vitest run` (ou `npm test`); completos: `npx vitest run && npx playwright test`
- Build: `npm run build`; preview: `npm run preview`
- Executar: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`
- Via Docker (sem runtime no host): `docker compose -f .nants/compose.yaml run --rm --service-ports workspace sh -lc '<comando>'`
- O Playwright sobe sozinho `npm run build` e o preview em `127.0.0.1:4173`. Capturas em `test-results/screens`.

## Padrões e convenções
- Lógica de mundo, malha, edição, raycast, hotbar e fila é pura e determinística (semente), testável sem GPU. Decisões de render que valem teste (ex.: mostrar e posicionar o contorno) ficam em funções puras separadas do Babylon.
- Um material de atlas único e uma malha por chunk (16x16x64).
- Sombras só do sol, 2 cascatas, perto do jogador; emissivos via glow, nunca luz dinâmica (só o preenchimento hemisférico).
- Versões exatas nos manifestos.
- A página expõe `window.__brumaluz` (inclui `ready`) para os testes e2e, com ganchos de interação (`interagir`, `selecionarSlot`, `apontar`, `bloco`, `alvo` e métricas de desempenho).
- Testes de colisão, física e edição usam o mundo real (`criarMundoSolido`) e a tabela de blocos, não sólidos sintéticos.
- Testes de escala e variação da vegetação verificam os valores gerados, não só a altura ou a igualdade entre gerações.

## Decisões
- Babylon.js escolhido por sombras em cascata, névoa, céu procedural, glow e DynamicTexture integrados (spec 001-cena-validacao).
- Arte 100% procedural por código, sem arquivos de textura externos (spec 001-cena-validacao).
- Entrada só teclado e mouse nesta fase (spec 001-cena-validacao).
- Geração e malha de chunks em Web Worker (spec 001-cena-validacao).
- 2026-11-05: e2e roda sobre build de produção servido por `vite preview` (porta 4173), com WebGL por SwiftShader (spec 001-cena-validacao).
- 2026-11-05: capturas em três viewports gravadas em `test-results/screens` (spec 001-cena-validacao).
- 2026-11-05: edições de blocos num registro puro e serializável, aplicadas por cima do terreno determinístico e também no worker e na colisão, com remalha limitada por quadro por uma fila; salvamento fica para depois (spec 002-edicao-e-refino-visual).
- 2026-11-05: barra de 6 blocos ilimitados, sem inventário nem coleta (spec 002-edicao-e-refino-visual).
- 2026-11-05: contorno do bloco apontado com linhas Babylon, sem pós-processamento (spec 002-edicao-e-refino-visual).
- 2026-11-05: materiais com tiles por face no atlas único e refino de iluminação e vegetação, mantendo um material e uma malha por chunk (spec 002-edicao-e-refino-visual).
- 2026-11-05: capturas e métricas de desempenho nos três viewports em `e2e/visual.spec.ts`, registradas em `docs/validacao-visual.md` (spec 002-edicao-e-refino-visual).

## Restrições
- Sem recursos protegidos de Minecraft.
- Capturas e2e rodam com WebGL por software (SwiftShader): o FPS medido ali é informativo, não meta.
- Edições não são salvas: somem ao recarregar a página.
- Pendência conhecida: o spawn do jogador (`src/player/controle.ts`) pode cair dentro de árvore ou cristal sólido, pois usa só a altura do terreno. Confirme antes de agir, pois a busca por "spawn" não achou o termo literal no arquivo.
- A pendência do chunk descartado aplicado duas vezes foi tratada na spec 002 (T03).
- Ponto de atenção: o material de plantas pode usar o alfa de vértice como transparência (`src/render/cena.ts`); revisar se surgir artefato visual.
