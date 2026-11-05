# Brumaluz

## Visão geral
Jogo 3D de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Identidade própria: crepúsculo eterno e brumoso, blocos pintados por código e flora bioluminescente. Interface em português do Brasil. Não usa nenhum recurso, nome ou marca de Minecraft.

## Stack
- TypeScript, Vite, Babylon.js (`@babylonjs/core`, imports por módulo para tree-shaking).
- Vitest para a lógica pura; Playwright (Chromium) para e2e e capturas.
- Docker: imagem base oficial do Playwright (traz Node e navegadores).

## Estrutura
- `src/world/`: blocos, ruído, geração de chunks (lógica pura, sem Babylon).
- `src/mesh/`: malhas de chunk (faces visíveis, AO por vértice, vegetação em quads cruzados).
- `src/art/`: atlas de texturas procedural (buffer RGBA puro, envolvido por canvas no navegador).
- `src/render/`: cena Babylon (céu, névoa, sol, sombras, glow, material do atlas, resolução adaptativa).
- `src/player/`: física e entrada (pointer lock).
- `src/ui/`: HUD e tela de entrada.
- `tests/` (Vitest) e `e2e/` (Playwright).

## Comandos (instalar, testar, executar)
- Instalar: `npm ci --no-audit --no-fund`
- Testes rápidos: `npx vitest run`; completos: `npx vitest run && npx playwright test`
- Executar: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`

## Padrões e convenções
- Lógica de mundo e malha é pura e determinística (semente), testável sem GPU.
- Um material de atlas único e uma malha por chunk (16x16x64).
- Sombras só do sol, 2 cascatas, perto do jogador; emissivos via glow, nunca luz dinâmica.
- Versões exatas nos manifestos.

## Decisões
- Babylon.js escolhido por sombras em cascata, névoa, céu procedural, glow e DynamicTexture integrados (spec 001-cena-validacao).
- Arte 100% procedural por código, sem arquivos de textura externos (spec 001-cena-validacao).
- Entrada só teclado e mouse nesta fase (spec 001-cena-validacao).
- Geração e malha de chunks em Web Worker (spec 001-cena-validacao).

## Restrições
- Sem recursos protegidos de Minecraft.
- Capturas e2e rodam com WebGL por software (SwiftShader): o FPS medido ali é informativo, não meta.
