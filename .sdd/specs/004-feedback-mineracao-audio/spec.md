---
id: 004-feedback-mineracao-audio
title: 'Brumaluz: mineração com resistência, rachaduras, fragmentos e áudio'
status: COMPLETED
base_branch: main
created_at: 2026-11-05T18:00:00Z
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
O jogo já tem seleção, quebra e colocação de blocos (spec 002), mas a quebra é instantânea, sem resistência, sem feedback visual de dano, sem fragmentos e sem nenhum som. Esta spec adiciona: mineração por resistência de material (segurar o botão esquerdo), rachaduras progressivas, fragmentos ao quebrar, efeito discreto ao colocar e áudio procedural coerente com o mundo, tratando as restrições de áudio dos navegadores.

Estado verificado no código: não há áudio, partículas nem rachaduras. `executarInteracao('quebrar')` troca o alvo por ar a cada `mousedown`. Os materiais existentes são terra musgosa, pedra rachada, areia-bruma, madeira retorcida, folhagem, cristal-luz, tábuas e três plantas (grama alta, flor, cogumelo brilhante). Eventos existentes: quebrar, colocar, recusa (colisão com o jogador ou y=0), troca de slot, clique de entrada, andar, correr, pular e tocar o chão.

## Abordagem Técnica
Sem nova dependência e sem arquivos de áudio ou textura: tudo por código, como a arte da spec 001.

- **Mineração (lógica pura, `src/player/`):** tabela de dureza em segundos por bloco e um estado de danos por bloco, com decaimento linear. Um controlador puro liga botão, alvo e slot ao estado e publica eventos num barramento puro.
- **Efeitos (`src/fx/` puro e `src/render/efeitos.ts` com Babylon):** overlay de rachadura de 5 estágios (textura RGBA gerada por código, caixa um pouco maior que o bloco), pool de partículas com limite global e cor média do tile do bloco. Nada disso toca o atlas nem a malha do chunk. Os efeitos ficam fora do glow e nunca são emissivos, para não repetir o branco estourado da spec 003.
- **Áudio (`src/audio/`, Web Audio):** motor com `AudioContext` injetável (fábrica), bus mestre com compressor e três grupos (efeitos, passos, ambiente), limite de vozes, variação com semente injetável e banco de sons sintetizados (ruído filtrado, ressonâncias e envelopes) por grupo de material.
- **Ligação:** um ligador puro traduz eventos do jogo em sons. O detector de movimento (passo, pulo, aterrissagem) também é puro. A cena apenas conecta as peças.

## Regras de mineração
- Durações (segundos de mineração contínua): plantas 0 (instantâneas), folhagem 0,3, terra musgosa 0,5, areia-bruma 0,5, tábuas 0,9, madeira retorcida 1,1, cristal-luz 1,4, pedra rachada 1,6. Nenhuma passa de 1,6 s. Ar não é minerável e y=0 continua protegido.
- Segurar o botão esquerdo no mesmo bloco acumula progresso (fração 0 a 1). O golpe repetido é periódico (a cada 0,25 s), com som e partículas leves por golpe. Planta quebra no primeiro golpe.
- A quebra só ocorre quando o progresso chega a 1.
- Cancelar: soltar o botão, perder o pointer lock, trocar de slot, mirar outro bloco ou sair do alcance interrompem a mineração.
- Dano parcial decai linearmente: um progresso de 1 some em 1 s sem golpes. O dano é guardado por bloco, então mirar outro bloco deixa o anterior decaindo em segundo plano, e voltar a ele a tempo continua do valor decaído. Se o bloco do alvo mudou (editado ou virou ar), o dano dele é descartado.
- Colocar continua instantâneo, com intervalo mínimo de 0,15 s entre colocações pelo mouse.
- Os ganchos de teste `interagir('quebrar')` e `interagir('colocar')` continuam instantâneos, para os e2e existentes.

## Regras de áudio
- Grupos de material: terra (terra musgosa), pedra, areia, madeira (madeira e tábuas), folhagem (folhagem e as três plantas) e cristal.
- Eventos: golpe, quebra, colocar, passo, pulo, aterrissagem, troca de slot, recusa, clique de entrada e ambiente de crepúsculo em loop baixo.
- Variação: 4 variações por evento e grupo, com tom, filtro e volume sorteados por semente, nunca a mesma variação duas vezes seguidas.
- Mistura: bus mestre com compressor; efeitos mais altos que passos; ambiente bem baixo (ganho máximo 0,08). Limite de 12 vozes simultâneas: ao estourar, descarta a mais antiga sem prioridade alta.
- Navegador: o `AudioContext` só é criado e retomado no primeiro gesto do jogador (clique da tela de entrada, com `pointerdown` e `keydown` como reserva). Antes disso, eventos de som são ignorados sem erro e sem fila. Se criar ou `resume()` falhar, o estado vira `bloqueado` e o jogo segue mudo, sem exceção.
- Tecla `M` liga e desliga o som, com indicador discreto no HUD (textos: "Som: ativa ao clicar", "Som: ligado", "Som: mudo", "Som: indisponível").

## Efeitos visuais
- Rachadura: 5 estágios conforme o progresso, visíveis só no bloco minerado, sumindo ao cancelar e ao decair a zero.
- Fragmentos ao quebrar: 10 partículas com a cor média do tile do bloco, vida de cerca de 0,6 s e gravidade; golpes soltam 2. Colocar: pulso curto de escala e opacidade no contorno e 4 partículas de poeira.
- Limite global de 64 partículas vivas, com pool reaproveitado.

## Critérios de Aceitação Globais
- [ ] A quebra por mineração só ocorre ao completar a duração do material, com plantas instantâneas e nenhum bloco acima de 1,6 s.
- [ ] Soltar, trocar de slot, mirar outro bloco ou sair do alcance interrompe a mineração, e o dano parcial decai em cerca de 1 s sem sobrar dano inesperado.
- [ ] A mineração mostra rachaduras em 5 estágios, a quebra solta fragmentos com a cor do material e o colocar tem um efeito discreto, com no máximo 64 partículas vivas.
- [ ] Há sons distintos por grupo de material e por evento (golpe, quebra, colocar, passo, pulo, aterrissagem, troca de slot, recusa, entrada e ambiente), com variação sem repetição imediata e no máximo 12 vozes simultâneas.
- [ ] Com o áudio inativo ou bloqueado o jogo não lança erro nem acumula fila, o áudio ativa no primeiro gesto, e a tecla M alterna o mudo com indicador visível.
- [ ] Nenhuma dependência nova, nenhum arquivo de áudio ou textura externo, e os testes, o typecheck e o build passam.
- [ ] Qualidade visual conferida pelas capturas nos três viewports: rachaduras e fragmentos legíveis sem poluir a tela, nenhum branco estourado, indicador de som sem sobrepor a barra de blocos, nada cortado nem rolagem lateral no celular, contraste legível.
- [ ] README e relatório de validação descrevem a mineração, o áudio, a tecla M, os comandos de executar e testar e as métricas.

## Premissas
- Áudio sintetizado por código (resposta do usuário): sem arquivos e sem licença externa.
- Dano parcial decai em cerca de 1 s (resposta do usuário).
- Plantas quebram de forma instantânea (resposta do usuário).
- Tecla M com indicador para o mudo (resposta do usuário).
- Entrada só teclado e mouse; mineração é segurar o botão esquerdo.
- Sem ferramentas, inventário, coleta ou itens soltos: a quebra só remove o bloco, como na spec 002.
- Valores de dureza e tempos são iniciais, validados por testes de balanço; podem ser ajustados em constantes nomeadas.
- Em SwiftShader o FPS medido é só informativo. O áudio real não é verificável no sandbox: ele é testado com `AudioContext` falso e pelo estado exposto em `window.__brumaluz.audio`; a qualidade auditiva é item `(manual)`.

## Decisões
- Estado de dano guardado por bloco com decaimento linear, em vez de um único alvo: uniformiza soltar, trocar de alvo e tremor de mira.
- Barramento de eventos puro entre a jogabilidade e os efeitos e o áudio: evita acoplamento e permite teste sem Babylon nem Web Audio.
- Motor de áudio recebe a fábrica de `AudioContext`: testável em Vitest (node, sem Web Audio).
- Efeitos fora do glow e não emissivos: lição da spec 003.

## Orientações por papel
### Desenvolvedor
- Importe Babylon por subcaminho de `@babylonjs/core/...`. Lógica de mineração, pool, cores, detector de movimento, ligador e motor de áudio não importam Babylon e nem usam `window`/`AudioContext` global (injete).
- No código de produção não use `Math.random` nos efeitos e no áudio: receba um gerador com semente.
- Navegadores só liberam o `AudioContext` após gesto: nunca crie o contexto no carregamento. Trate `resume()` rejeitado com `catch`.
- Pare e desconecte cada voz ao terminar (`onended`) para não vazar nós.
- Os e2e não usam pointer lock: use os ganchos `minerar`, `mineracao`, `rachadura`, `fx` e `audio` de `window.__brumaluz`.
- Capturas do tamanho do viewport, com nomes descritivos, aguardando `ready`.

### Revisor
- Confirme que nenhum efeito é emissivo nem entra no glow e que o limite de 64 partículas e de 12 vozes está em constantes testadas.
- Confirme que áudio inativo ou bloqueado nunca lança e nunca enfileira.
- Confirme que `interagir('quebrar')` segue instantâneo e que a quebra pelo mouse só ocorre ao completar a duração.
- Confirme textos pt-BR sem travessão nem emoji e ausência de referências a Minecraft.
- Nos testes, procure asserções que podem falhar (a revisão da spec 003 apontou testes tautológicos).

## Renumeração

Na aprovação, as tarefas foram renumeradas na ordem de execução: T12→T10, T10→T11, T11→T12. Os registros do planejamento (usage.jsonl, tools.jsonl, .context.jsonl e .chat.jsonl) mantêm os ids antigos, e este mapa explica a correspondência.

## Persistência da instalação
- Conferência da instalação (`npm ci --no-audit --no-fund`, código 0): 0 entradas gravadas fora de /work, em 11 s (aviso acima de 10 entradas).
