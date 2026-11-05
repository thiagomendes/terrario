# Brumaluz

## Visão geral
Jogo 3D de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Identidade própria: crepúsculo eterno e brumoso, blocos pintados por código e flora bioluminescente. Interface em português do Brasil. Não usa nenhum recurso, nome ou marca de Minecraft.

A spec 001-cena-validacao entregou uma cena jogável de validação visual: terreno em streaming de chunks, ambiente completo, jogador com física e controles, HUD, resolução adaptativa, testes e2e com capturas em três viewports (desktop, tablet e celular) e relatório em `docs/validacao-visual.md`.

## Stack
- TypeScript 5.6.3, Vite 5.4.10, Babylon.js (`@babylonjs/core` 7.31.0, imports por módulo para tree-shaking).
- Vitest 2.1.4 para a lógica pura; Playwright 1.48.2 (Chromium) para e2e e capturas; Prettier 3.3.3.
- Docker: imagem base `mcr.microsoft.com/playwright:v1.48.2-noble` (traz Node e navegadores), via `.nants/Dockerfile` e `.nants/compose.yaml`.

## Estrutura
- `src/main.ts`: ponto de entrada; `index.html` na raiz.
- `src/world/`: `blocks.ts`, `noise.ts`, `chunk.ts` (blocos, ruído, geração de chunks; lógica pura, sem Babylon).
- `src/mesh/malha.ts`: malha de chunk (faces visíveis, AO por vértice, vegetação em quads cruzados).
- `src/art/atlas.ts`: atlas de texturas procedural (buffer RGBA puro, envolvido por canvas no navegador).
- `src/workers/chunk.worker.ts`: geração e malha de chunks em Web Worker.
- `src/render/`: `cena.ts` (cena Babylon), `gerenciador.ts` (streaming de chunks), `atmosfera.ts` (céu, névoa, sol, sombras, glow), `balanco.ts` (balanço da vegetação), `resolucao.ts` (resolução adaptativa).
- `src/player/`: `fisica.ts`, `controle.ts`, `entrada.ts` (física, controles, pointer lock).
- `src/ui/interface.ts`: HUD e tela de entrada.
- `tests/` (Vitest, por área: world, mesh, art, render, player) e `e2e/` (Playwright, `fumaca.spec.ts`).
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
- Lógica de mundo e malha é pura e determinística (semente), testável sem GPU.
- Um material de atlas único e uma malha por chunk (16x16x64).
- Sombras só do sol, 2 cascatas, perto do jogador; emissivos via glow, nunca luz dinâmica.
- Versões exatas nos manifestos.
- A página expõe `window.__brumaluz` (inclui `ready`) para os testes e2e esperarem o carregamento.
- Testes de colisão e física devem usar o mundo real (`criarMundoSolido`) e a tabela de blocos, não sólidos sintéticos.

## Decisões
- Babylon.js escolhido por sombras em cascata, névoa, céu procedural, glow e DynamicTexture integrados (spec 001-cena-validacao).
- Arte 100% procedural por código, sem arquivos de textura externos (spec 001-cena-validacao).
- Entrada só teclado e mouse nesta fase (spec 001-cena-validacao).
- Geração e malha de chunks em Web Worker (spec 001-cena-validacao).
- 2026-11-05: e2e roda sobre build de produção servido por `vite preview` (porta 4173), com WebGL por SwiftShader, para validar o que será entregue (spec 001-cena-validacao).
- 2026-11-05: capturas em três viewports gravadas em `test-results/screens` (spec 001-cena-validacao).

## Restrições
- Sem recursos protegidos de Minecraft.
- Capturas e2e rodam com WebGL por software (SwiftShader): o FPS medido ali é informativo, não meta.
- Pendências conhecidas (observações de revisão, não corrigidas): em `src/render/cena.ts` um chunk descartado ainda pendente pode ser aplicado duas vezes e vazar malhas; o spawn em `src/player/controle.ts` usa só a altura do terreno e pode cair dentro de árvore ou cristal sólido.
