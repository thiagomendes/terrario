# Brumaluz

## Visão geral
Jogo 3D de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Identidade própria: crepúsculo eterno e brumoso, blocos pintados por código e flora bioluminescente. Interface em português do Brasil. Não usa nenhum recurso, nome ou marca de Minecraft.

A spec 001-cena-validacao entregou uma cena jogável de validação visual: terreno em streaming de chunks, ambiente completo, jogador com física e controles, HUD, resolução adaptativa, testes e2e com capturas em três viewports e relatório em `docs/validacao-visual.md`.

A spec 002-edicao-e-refino-visual (concluída) acrescentou seleção do bloco apontado com contorno e mira, quebra e colocação de blocos, barra de 6 tipos, fila de remalha com métricas e o refino de iluminação, materiais com tiles por face e vegetação.

A spec 003-cristal-sem-estouro (concluída) corrigiu os blocos e halos brancos chapados do cristal-luz (arte saturada, mapa emissivo com teto de luminância, glow mais suave e um cristal por ponto).

A spec 004-feedback-mineracao-audio (concluída) trocou a quebra instantânea por mineração com resistência por material (segurar o botão), com rachaduras, fragmentos e efeito de colocação, e adicionou áudio procedural por material e evento (passos, pulo, aterrissagem, mineração, colocação, ambiente), com tecla M para mudo e indicador no HUD.

A spec 005-camera-personagem (planejada) acrescenta braço e mão em primeira pessoa, câmera de terceira pessoa (tecla V) e um personagem voxel original com 4 modelos e personalização (painel na tela de entrada, tecla C), salvando só a aparência em `localStorage`.

## Stack
- TypeScript 5.6.3, Vite 5.4.10, Babylon.js (`@babylonjs/core` 7.31.0, imports por módulo para tree-shaking).
- Vitest 2.1.4 para a lógica pura (ambiente node, sem jsdom); Playwright 1.48.2 (Chromium) para e2e e capturas; Prettier 3.3.3.
- Áudio: Web Audio API do navegador, sintetizado por código, sem biblioteca e sem arquivos.
- Docker: imagem base `mcr.microsoft.com/playwright:v1.48.2-noble` (traz Node e navegadores), via `.nants/Dockerfile` e `.nants/compose.yaml` (serviço `workspace`, porta 5174).

## Estrutura
- `src/main.ts`: ponto de entrada; `index.html` na raiz.
- `src/world/`: `blocks.ts`, `noise.ts`, `chunk.ts` (blocos, ruído, geração de chunks, um cristal por ponto; lógica pura, sem Babylon) e `edicoes.ts` (registro puro de edições).
- `src/mesh/malha.ts`: malha de chunk (faces visíveis, AO por vértice, tiles por face, vegetação em quads cruzados).
- `src/art/atlas.ts`: atlas de texturas procedural (buffer RGBA puro, envolvido por canvas no navegador).
- `src/workers/chunk.worker.ts`: geração, aplicação de edições e malha de chunks em Web Worker.
- `src/render/`: `cena.ts`, `gerenciador.ts` (streaming), `atmosfera.ts`, `balanco.ts`, `resolucao.ts`, `remalha.ts`, `fila.ts`, `destaque.ts`, `emissivo.ts` e `efeitos.ts` (rachadura, fragmentos e pulso de colocação). Spec 005: `personagem.ts` (corpo em terceira pessoa) e `braco.ts` (braço e bloco na mão).
- `src/player/`: `fisica.ts`, `controle.ts`, `entrada.ts`, `alvo.ts`, `hotbar.ts`, `interacao.ts`, `mineracao.ts` (dureza por material e estado puro de danos), `minerador.ts` (controlador de segurar/soltar/trocar slot), `eventos.ts` (barramento puro) e `movimento.ts` (detector de passos, pulo e aterrissagem). Spec 005: `camera.ts` (modo, tecla V, colisão da terceira pessoa).
- `src/personagem/` (spec 005, lógica pura): `aparencia.ts` (4 modelos, paletas, validador), `persistencia.ts`, `modelo.ts` e `textura.ts` (partes em caixas e textura procedural), `poses.ts` e `mao.ts`.
- `src/fx/`: `particulas.ts` (pool com limite), `cores.ts` (cor média por bloco) e `rachadura.ts` (texturas de rachadura); lógica pura.
- `src/audio/`: `motor.ts` (contexto injetável, estados, vozes, mudo), `sons.ts` (banco de sons procedurais por material e evento), `materiais.ts` (grupos de material), `variacao.ts` (variação com semente) e `ligador.ts` (liga eventos ao áudio e ativa no primeiro gesto).
- `src/ui/`: `interface.ts` (HUD, tela de entrada e indicador de áudio) e `barra.ts` (barra de blocos). Spec 005: `personagem.ts` (painel de personalização).
- `tests/` (Vitest, por área: `mesh`, `player`, `render`, `world`, `art`, `fx`, `audio`, e na spec 005 `personagem` e `ui`; `tests/audio/falso.ts` traz o `AudioContext` falso) e `e2e/` (Playwright: `visual`, `interacao`, `barra`, `cristal`, `fumaca`, `mineracao`, `audio`, e na spec 005 `personagem`).
- `docs/validacao-visual.md`: relatório de validação visual e desempenho (inclui a seção da spec 004).
- Configs na raiz: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`.

## Comandos (instalar, testar, executar)
- Instalar: `npm ci --no-audit --no-fund`
- Testes rápidos: `npx vitest run` (ou `npm test`); completos: `npx vitest run && npx playwright test`
- Build: `npm run build`; preview: `npm run preview`
- Executar: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`
- Via Docker (sem runtime no host): `docker compose -f .nants/compose.yaml run --rm --service-ports workspace sh -lc '<comando>'`
- O Playwright sobe sozinho `npm run build` e o preview em `127.0.0.1:4173`. Capturas em `test-results/screens`.

## Padrões e convenções
- Lógica de mundo, malha, edição, raycast, hotbar, fila, mineração, pool de partículas, detector de movimento, ligador de áudio, câmera, poses e aparência é pura e determinística (semente), testável sem GPU e sem Web Audio. Decisões de render que valem teste ficam em funções puras separadas do Babylon.
- Um material de atlas único e uma malha por chunk (16x16x64).
- Sombras só do sol, 2 cascatas, perto do jogador; emissivos via glow, nunca luz dinâmica.
- Versões exatas nos manifestos.
- A página expõe `window.__brumaluz` (inclui `ready`) para os e2e, com ganchos `interagir`, `selecionarSlot`, `apontar`, `bloco`, `alvo`, métricas, `minerar`, `mineracao`, `rachadura`, `fx` e `audio` (spec 005: `camera` e `personagem`). `interagir` segue instantâneo.
- Toda troca de slot (teclas 1-6, roda, clique na barra) deve interromper a mineração em curso, não só o evento de teste `brumaluz:slot`.
- Tiles emissivos têm cor saturada e o mapa emissivo limita a luminância a `TETO_LUMINANCIA_EMISSIVA` (0.45). Efeitos novos (partículas, rachadura, personagem, braço) não são emissivos nem entram no glow.
- Áudio: o `AudioContext` só nasce no primeiro gesto do jogador, vem de uma fábrica injetada, e falha vira estado `bloqueado` sem exceção. Limites: 12 vozes e 64 partículas.
- Sem `Math.random` em efeitos, áudio e personagem: gerador com semente injetado.
- A `camera` existente são os olhos do jogador e alimenta raycast, chunks, mineração e áudio; a câmera de visão (`cameraVisao`) é separada e só muda o que é desenhado.
- Armazenamento (`localStorage`) sempre injetado, com fallback sem exceção.
- Testes devem usar dados reais (mundo, atlas, tabela de blocos) e asserções que possam falhar; e2e não pode passar em vacuidade (sem `if` que pule a verificação quando a busca não acha o alvo).
- Textos de docs e relatório não citam Minecraft.

## Decisões
- Babylon.js escolhido por sombras em cascata, névoa, céu procedural, glow e DynamicTexture integrados (spec 001-cena-validacao).
- Arte 100% procedural por código, sem arquivos de textura externos (spec 001-cena-validacao).
- Entrada só teclado e mouse nesta fase (spec 001-cena-validacao).
- Geração e malha de chunks em Web Worker (spec 001-cena-validacao).
- 2026-11-05: e2e roda sobre build de produção servido por `vite preview` (porta 4173), com WebGL por SwiftShader (spec 001-cena-validacao).
- 2026-11-05: edições de blocos num registro puro e serializável, com remalha limitada por quadro por uma fila; salvamento do mundo fica para depois (spec 002-edicao-e-refino-visual).
- 2026-11-05: barra de 6 blocos ilimitados, sem inventário nem coleta (spec 002-edicao-e-refino-visual).
- 2026-11-05: contorno do bloco apontado com linhas Babylon, sem pós-processamento (spec 002-edicao-e-refino-visual).
- 2026-11-05: brancos estourados vinham do cristal-luz emissivo sem teto e glow forte; correção na arte, no mapa emissivo com teto 0.45 e no glow (intensidade 0.5) (spec 003-cristal-sem-estouro).
- 2026-11-05: áudio sintetizado por código (Web Audio), sem arquivos e sem licença externa; motor com contexto injetável para testar em Vitest (spec 004-feedback-mineracao-audio).
- 2026-11-05: mineração por segurar, com dureza por material (0 a 1,6 s, plantas instantâneas), dano guardado por bloco com decaimento linear de 1 s e colocação com intervalo de 0,15 s (spec 004-feedback-mineracao-audio).
- 2026-11-05: barramento de eventos puro entre jogabilidade, efeitos e áudio; tecla M para mudo (spec 004-feedback-mineracao-audio).
- 2026-11-05: partículas em pool com limite de 64 e áudio com no máximo 12 vozes, sem `Math.random` (gerador com semente), para manter desempenho e testes determinísticos (spec 004-feedback-mineracao-audio).
- 2026-11-05: o contexto de áudio só é criado e retomado no primeiro gesto do jogador (política de autoplay), com falha tratada como estado `bloqueado` (spec 004-feedback-mineracao-audio).
- 2026-11-05: `camera` dos olhos preservada e `cameraVisao` separada para a terceira pessoa, de modo que alvo e ações não mudam entre os modos (spec 005-camera-personagem).
- 2026-11-05: braço em primeira pessoa em grupo de renderização próprio, segurando o bloco selecionado (sem ferramenta); a mesma função de poses anima braço e corpo (spec 005-camera-personagem).
- 2026-11-05: personagem voxel procedural com 4 modelos e opções por índice de paletas fixas; só a aparência é salva em `localStorage`, painel na tela de entrada com tecla C (spec 005-camera-personagem).

## Restrições
- Sem recursos protegidos de Minecraft.
- Capturas e2e rodam com WebGL por software (SwiftShader): o FPS medido ali é informativo, não meta.
- Edições do mundo não são salvas: somem ao recarregar a página. Só a aparência do personagem é salva (spec 005).
- O áudio real não é verificável no sandbox: testes usam `AudioContext` falso e o estado exposto; a escuta é conferência manual.
- Pendência conhecida: o spawn do jogador (`src/player/controle.ts`) pode cair dentro de árvore ou cristal sólido, pois usa só a altura do terreno. Confirme antes de agir.
- Ponto de atenção: o material de plantas pode usar o alfa de vértice como transparência (`src/render/cena.ts`); revisar se surgir artefato visual.
