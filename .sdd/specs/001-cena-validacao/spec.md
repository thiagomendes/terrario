---
id: 001-cena-validacao
title: 'Brumaluz: cena jogável de validação visual'
status: COMPLETED
base_branch: main
created_at: 2026-11-05T14:30:27Z
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
Queremos um jogo voxel de exploração, construção e sobrevivência no navegador, chamado Brumaluz, com identidade própria. Antes de construir sistemas grandes, esta spec entrega só uma pequena cena jogável para validar o visual em vários tamanhos de tela e os compromissos de desempenho. A jogabilidade (colocar e remover blocos, inventário, salvamento, ciclo de dia e noite, criaturas) fica para a spec 2, depois da revisão do usuário.

## Abordagem Técnica
- TypeScript, Vite, Babylon.js (`@babylonjs/core`), Vitest, Playwright, tudo em Docker (imagem do Playwright).
- Direção de arte Brumaluz: crepúsculo âmbar e violeta, sombras azul-petróleo, flora bioluminescente. Texturas 32x32 por bloco geradas por código (ruído e pinceladas), montadas num atlas único.
- Chunks 16x16x64, uma malha por chunk, só faces visíveis, AO por vértice. Geração e malha em Web Worker, raio de visão limitado, névoa escondendo o corte.
- Céu procedural, névoa exponencial, sol com sombras em 2 cascatas perto do jogador, glow nos emissivos, vegetação em quads cruzados com balanço no shader.
- Resolução adaptativa (hardware scaling) por tamanho de tela e FPS.
- Controles: teclado e mouse com pointer lock.
- Depuração: `window.__brumaluz` expõe `ready`, `fps`, `chunksCarregados`, `escalaResolucao`.

## Contrato da cena
- Blocos: terra musgosa, pedra rachada, areia-bruma, madeira retorcida, folhagem, cristal-luz (emissivo), tábuas. Vegetação em quads: grama alta, flor e cogumelo brilhante.
- Mundo: semente fixa por padrão, terreno com colinas, uma praia/lago de areia-bruma, árvores, vegetação e cristais.
- Jogador: WASD, espaço pula, mouse olha, shift corre; colisão com blocos sólidos.
- Interface em pt-BR: tela de entrada "Brumaluz" com instrução "Clique para jogar" e HUD discreto com mira e FPS.

## Decisões
- Babylon.js mantido como tecnologia principal (sombras em cascata, névoa, céu, glow e DynamicTexture integrados).
- Sem geração de imagens: toda a arte é procedural por código.
- O jogo é um app web servido pelo Vite, então roda no sandbox; não há `not_in_sandbox`.
- Capturas e2e usam WebGL por software (SwiftShader); o FPS ali é informativo.
- Versões iniciais sugeridas (confirmar e fixar exatas pelo que a instalação resolver): `@babylonjs/core` 7.31.0, `vite` 5.4.10, `typescript` 5.6.3, `vitest` 2.1.4, `@playwright/test` 1.48.2 (igual à imagem Docker), `prettier` 3.3.3.

## Premissas
- Direção de arte Brumaluz, nome Brumaluz, interface em pt-BR, entrada só teclado e mouse (escolhas do usuário).
- Sem salvamento, inventário, quebra e colocação de blocos nesta spec.
- Sem criaturas e sem ciclo de dia e noite nesta spec; o céu fica em crepúsculo fixo.
- A revisão do usuário acontece ao fim desta spec, antes de qualquer expansão.

## Critérios de Aceitação Globais
- [ ] G1: `npx vitest run`, `npx tsc --noEmit` e `npm run build` passam.
- [ ] G2: terreno determinístico por semente, gerado em chunks 16x16x64 com uma malha por chunk, só faces visíveis e AO por vértice.
- [ ] G3: o atlas de 7 blocos e 3 plantas é gerado por código, sem arquivos de textura externos.
- [ ] G4: a cena tem céu, névoa, sol com sombras em 2 cascatas, glow nos emissivos e vegetação com balanço.
- [ ] G5: o jogador anda, corre, pula e colide com o terreno por teclado e mouse (pointer lock).
- [ ] G6: a resolução se adapta ao tamanho de tela e ao FPS, e `window.__brumaluz` expõe as métricas.
- [ ] G7: testes e2e gravam capturas do tamanho do viewport em desktop, tablet e celular, e falham com erros de página.
- [ ] G8: qualidade visual conferida pelas capturas: texturas não chapadas e com variação, bruma e brilho legíveis, HUD e tela de entrada com tipografia hierárquica e contraste, layout sem corte nem rolagem lateral no celular e uso da largura no desktop.
- [ ] G9: README.md com pré-requisitos, comando de executar, URL, comando de testar e resultado esperado; relatório de desempenho em `docs/validacao-visual.md`.
- [ ] G10: nenhum nome, textura, criatura ou marca de Minecraft; textos visíveis em pt-BR.

## Orientações por papel
### Desenvolvedor
- Lógica de mundo, malha e atlas é pura (typed arrays) e testada com Vitest sem GPU; Babylon só em `src/render/`.
- Imports de `@babylonjs/core` por subcaminho. Atlas com NEAREST e padding entre tiles.
- Rode os e2e com `run_browser_tests`; Chromium com flags de SwiftShader se o WebGL falhar.
- Fixe versões exatas após `npm install` no container.

### Revisor
- Confira imports por subcaminho, ausência de texturas externas e de luz dinâmica para emissivos.
- Nos e2e, veja as capturas: nada de cubos de cor chapada; bruma, sombras e brilho visíveis.
- Procure referências a Minecraft e manifestos com `^`, `~` ou `latest`.

## Persistência da instalação
- Conferência da instalação (`npm ci --no-audit --no-fund`, código 0): 0 entradas gravadas fora de /work, em 5 s (aviso acima de 10 entradas).

## Decisões de Arbitragem
- Revisão 2, T05 F-01 (mantido, obrigatório): Nada prova que `window.__brumaluz.ready` vira true nem que os chunks entram na cena. Motivo: A contestação não procede. O critério `window.__brumaluz.ready` vira true quando os chunks iniciais estão na cena. O e2e atual só confere o título e captura de imediato, então nada prova isso. Estar fora do allowed_scope não basta para dispensar um critério que a tarefa pede. Falta `waitForFunction` em `ready`, afirmar `chunksCarregados > 0` e só então capturar.
- Revisão 2, T08 F-01 (critério ajustado ao que o ambiente prova): O Desenvolvedor deixou o aviso 1 e o Revisor o refutou: O e2e existente não foi alterado nem rodado. Motivo: O apontamento era só uma suposição sobre o e2e, e a própria evidência mostra que o e2e passou (1 passed) com o h1 'Brumaluz' no novo layout. Nenhum critério pede mais nada sobre isso. Mantive os critérios e acrescentei um que torna explícito que o e2e existente continua passando.
