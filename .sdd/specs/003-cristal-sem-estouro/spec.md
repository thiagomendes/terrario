---
id: 003-cristal-sem-estouro
title: 'Brumaluz: corrigir os blocos brancos estourados do cristal-luz'
status: COMPLETED
base_branch: main
created_at: 2026-11-05T17:30:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
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
As capturas enviadas pelo usuário mostram blocos e halos brancos chapados no cenário, em pilares de dois blocos, sem cor nem textura. Não há partículas, fumaça, nuvem nem disco solar no código. A causa é o cristal-luz estourando em branco, por três fatores somados:

1. O tile de cristal no atlas (`src/art/atlas.ts`) mistura azul claro com `[235,250,255]`, quase branco.
2. Em `src/render/cena.ts`, o mapa emissivo copia esse tile com a cor cheia e o material usa `emissiveColor` branco: emissivo mais difuso iluminado passam de 1.0 e saturam.
3. O `GlowLayer` (kernel 24, `INTENSIDADE_GLOW` 0.85) soma um halo por cima, e o gerador empilha dois cristais (`topo` e `topo + 1` em `src/world/chunk.ts`), dobrando a mancha.

Fator secundário: a haste do cogumelo brilhante (`[200,210,190]`) também é emissiva e quase branca. Plantas (`alphaCutOff`) e areia-bruma não são a causa das manchas enviadas e ficam fora desta spec.

## Abordagem Técnica
Corrigir na causa, sem esconder o glow:
- Cristal e haste do cogumelo ganham cores saturadas e mais escuras no atlas (azul-ciano profundo, haste verde-acinzentada).
- O mapa emissivo passa a vir de uma função pura, `construirMapaEmissivo`, em `src/render/emissivo.ts`, que limita a luminância de cada pixel a `TETO_LUMINANCIA_EMISSIVA` preservando o matiz. A cena usa essa função em vez da cópia direta.
- `INTENSIDADE_GLOW` cai para 0.5, mantendo o glow restrito aos emissivos. Sem luz dinâmica nova, sem material novo.
- O gerador coloca um único cristal por ponto, não dois empilhados.
- Validação por e2e: coloca um cristal diante da câmera pelos ganchos existentes de `window.__brumaluz` e mede a fração de pixels brancos estourados na captura.

## Decisões
- Constantes em `src/render/emissivo.ts`: `TETO_LUMINANCIA_EMISSIVA = 0.45` (luminância relativa de 0 a 1, pesos 0.2126, 0.7152 e 0.0722 sobre canais de 0 a 255 divididos por 255).
- Pixel "branco estourado" no e2e: os três canais RGB maiores ou iguais a 245.
- Limite do e2e: no máximo 1% dos pixels do viewport estourados, por viewport.
- Não alterar plantas, areia-bruma, névoa nem sombras nesta spec.
- O ambiente Docker existente (`.nants/Dockerfile` e `.nants/compose.yaml`, serviço `workspace`, porta 5174) é mantido sem mudanças.

## Critérios de Aceitação Globais
- [ ] O tile de cristal-luz do atlas é azul saturado: nenhum pixel com os três canais acima de 230 e azul médio acima do vermelho médio em pelo menos 40.
- [ ] Nenhum pixel do mapa emissivo passa de `TETO_LUMINANCIA_EMISSIVA` de luminância, e a cena usa `construirMapaEmissivo`.
- [ ] `INTENSIDADE_GLOW` fica entre 0.4 e 0.6 e o glow continua só nos emissivos, sem luz pontual nem spot.
- [ ] O gerador de chunks nunca coloca dois cristais verticalmente adjacentes, e o mundo continua determinístico por semente.
- [ ] No e2e, com um cristal-luz diante da câmera, no máximo 1% dos pixels do viewport são brancos estourados, nos três viewports.
- [ ] Qualidade visual conferida pelas capturas: o cristal mostra cor azul e facetas legíveis com halo suave, sem mancha chapada; contraste legível entre cristal, chão e céu; nada cortado nem rolagem lateral no celular.
- [ ] As métricas de desempenho (fps, chunks carregados, escala de resolução) dos três viewports ficam registradas em `docs/validacao-visual.md`, e o README descreve o teste de brancos estourados.

## Premissas
- Os elementos brancos são os das imagens anexadas (cristal-luz); o usuário os chamou de "elementos brancos" sem dizer que são fumaça.
- A direção de arte Brumaluz (crepúsculo âmbar e violeta, flora bioluminescente) não muda; o cristal continua brilhando, só deixa de estourar.
- O FPS no e2e usa WebGL por software (SwiftShader), então é informativo, sem limite mínimo.
- Os três viewports são os mesmos de `e2e/visual.spec.ts`.

## Orientações por papel
### Desenvolvedor
- No código de produção, mantenha a lógica pura (`emissivo.ts`) sem importar Babylon; a cena só chama a função e envolve o resultado em `RawTexture`.
- Atlas: preserve o tamanho das células e os índices dos tiles, só mude as cores.
- Nos testes, use `gerarAtlas()` real e `atlas.tiles`, não buffers sintéticos.
- Ao tirar o cristal empilhado em `chunk.ts`, mantenha a semente determinística e ajuste só o que os testes de mundo exigirem.
- No e2e, registre `pageerror` e `console.error` e inclua na mensagem de falha; capture o tamanho do viewport, com o cristal à vista.
### Revisor
- Confira que a correção está na arte e no mapa emissivo, não em esconder o glow ou desligar o emissivo.
- Confira que não surgiu luz dinâmica, material novo nem dependência nova.
- Nas capturas, o cristal deve ser azul com facetas, não branco chapado.

## Fontes consultadas
Nenhuma fonte externa; a análise veio do código do projeto e das capturas anexadas.

## Persistência da instalação
- Conferência da instalação (`npm ci --no-audit --no-fund`, código 0): 0 entradas gravadas fora de /work, em 10 s (aviso acima de 10 entradas).
