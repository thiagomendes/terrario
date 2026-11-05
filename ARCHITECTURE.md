# Brumaluz

## Visão geral
Jogo 3D de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Identidade própria: crepúsculo eterno e brumoso, blocos pintados por código e flora bioluminescente. Interface em português do Brasil. Não usa nenhum recurso, nome ou marca de Minecraft.

A spec 001-cena-validacao entregou uma cena jogável de validação visual: terreno em streaming de chunks, ambiente completo, jogador com física e controles, HUD, resolução adaptativa, testes e2e com capturas em três viewports e relatório em `docs/validacao-visual.md`. A spec 002-edicao-e-refino-visual (planejada) acrescenta seleção, quebra e colocação de blocos com barra de 6 tipos e refina iluminação, materiais e vegetação.

## Stack
- TypeScript 5.6.3, Vite 5.4.10, Babylon.js (`@babylonjs/core` 7.31.0, imports por módulo para tree-shaking).
- Vitest 2.1.4 para a lógica pura (ambiente node, sem jsdom); Playwright 1.48.2 (Chromium) para e2e e capturas; Prettier 3.3.3.
- Docker: imagem base `mcr.microsoft.com/playwright:v1.48.2-noble` (traz Node e navegadores), via `.nants/Dockerfile` e `.nants/compose.yaml`.

## Estrutura
- `src/main.ts`: ponto de entrada; `index.html` na raiz.
- `src/world/`: `blocks.ts`, `noise.ts`, `chunk.ts` (blocos, ruído, geração de chunks; lógica pura, sem Babylon) e `edicoes.ts` (registro de edições, spec 002).
- `src/mesh/malha.ts`: malha de chunk (faces visíveis, AO por vértice, vegetação em quads cruzados).
- `src/art/atlas.ts`: atlas de texturas procedural (buffer RGBA puro, envolvido por canvas no navegador).
- `src/workers/chunk.worker.ts`: geração e malha de chunks em Web Worker.
- `src/render/`: `cena.ts`, `gerenciador.ts` (streaming), `atmosfera.ts`, `balanco.ts`, `resolucao.ts`; spec 002: `remalha.ts`, `fila.ts`, `destaque.ts`.
- `src/player/`: `fisica.ts`, `controle.ts`, `entrada.ts`; spec 002: `alvo.ts` (raycast), `hotbar.ts`, `interacao.ts`.
- `src/ui/`: `interface.ts` (HUD e tela de entrada); spec 002: `barra.ts`.
- `tests/` (Vitest, por área) e `e2e/` (Playwright: `fumaca.spec.ts`; spec 002: `interacao.spec.ts` e `visual.spec.ts`).
- `docs/validacao-visual.md`: relatório de validação visual.
- Configs na raiz: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`.

## Comandos (instalar, testar, executar)
- Instalar: `npm ci --no-audit --no-fund`
- Testes rápidos: `npx vitest run` (ou `npm test`); completos: `npx vitest run && npx playwright test`
- Build: `npm run build`; preview: `npm run preview`
- Executar: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`
- Via Docker (sem runtime no host): `docker compose -f .nants/compose.yaml run --rm --service-ports workspace sh -lc '<comando>'`
- O Playwright sobe sozinho `npm run build` e o preview em `127.0.0.1:4173`. Capturas em `test-results/screens`.

## Padrões e convenções
- Lógica de mundo, malha, edição, raycast, hotbar e fila é pura e determinística (semente), testável sem GPU.
- Um material de atlas único e uma malha por chunk (16x16x64).
- Sombras só do sol, 2 cascatas, perto do jogador; emissivos via glow, nunca luz dinâmica (só o preenchimento hemisférico).
- Versões exatas nos manifestos.
- A página expõe `window.__brumaluz` (inclui `ready`) para os testes e2e; a spec 002 acrescenta ganchos de interação (`interagir`, `selecionarSlot`, `apontar`, `bloco`, `alvo` e métricas).
- Testes de colisão, física e edição usam o mundo real (`criarMundoSolido`) e a tabela de blocos, não sólidos sintéticos.

## Decisões
- Babylon.js escolhido por sombras em cascata, névoa, céu procedural, glow e DynamicTexture integrados (spec 001-cena-validacao).
- Arte 100% procedural por código, sem arquivos de textura externos (spec 001-cena-validacao).
- Entrada só teclado e mouse nesta fase (spec 001-cena-validacao).
- Geração e malha de chunks em Web Worker (spec 001-cena-validacao).
- 2026-11-05: e2e roda sobre build de produção servido por `vite preview` (porta 4173), com WebGL por SwiftShader (spec 001-cena-validacao).
- 2026-11-05: capturas em três viewports gravadas em `test-results/screens` (spec 001-cena-validacao).
- Edições de blocos num registro puro e serializável, aplicadas por cima do terreno determinístico, com remalha limitada por quadro; salvamento fica para depois (spec 002-edicao-e-refino-visual).
- Barra de 6 blocos ilimitados, sem inventário nem coleta (spec 002-edicao-e-refino-visual).
- Contorno do bloco apontado com linhas Babylon, sem pós-processamento (spec 002-edicao-e-refino-visual).

## Restrições
- Sem recursos protegidos de Minecraft.
- Capturas e2e rodam com WebGL por software (SwiftShader): o FPS medido ali é informativo, não meta.
- Pendência conhecida: o spawn em `src/player/controle.ts` usa só a altura do terreno e pode cair dentro de árvore ou cristal sólido. A pendência do chunk descartado aplicado duas vezes é tratada na spec 002 (T03).
