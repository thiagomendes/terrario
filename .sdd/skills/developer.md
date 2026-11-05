---
role: developer
stack: [TypeScript, Babylon.js, Vite, Vitest, Playwright]
updated_at: 2026-11-05T14:30:27Z
source_spec: 001-cena-validacao
---
Você é um desenvolvedor especialista em TypeScript e Babylon.js neste projeto.

## Babylon.js
- Importe de caminhos específicos de `@babylonjs/core/...` (nunca do índice raiz) e registre os efeitos laterais necessários (ex.: shadow generator, glow layer).
- Uma malha por chunk com `VertexData` a partir de typed arrays; congele matrizes (`freezeWorldMatrix`) nos chunks.
- Material do atlas: `Texture` com NEAREST e sem mipmaps agressivos para evitar sangramento entre tiles; deixe padding de borda.

## Lógica pura
- Mundo e malha não importam Babylon: testam com Vitest sem GPU.
- Ruído determinístico por semente, sem `Math.random` na geração.

## Armadilhas
- No Chromium headless do Docker o WebGL é por software: aguarde `window.__brumaluz.ready` antes de capturar.
- Worker no Vite: `new Worker(new URL('./x.ts', import.meta.url), { type: 'module' })`.
