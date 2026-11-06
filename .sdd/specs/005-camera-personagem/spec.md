---
id: 005-camera-personagem
title: 'Brumaluz: braço em primeira pessoa, terceira pessoa e personagem personalizável'
status: COMPLETED
base_branch: main
created_at: 2026-11-05T19:45:00Z
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
O jogo (specs 001 a 004) tem uma única câmera nos olhos do jogador, sem corpo, sem braço e sem salvamento de qualquer tipo. Esta spec acrescenta: braço e mão em primeira pessoa com animações coerentes, câmera de terceira pessoa atrás do jogador, um personagem voxel original com 4 modelos predefinidos e personalização modular, e o salvamento só da aparência.

Estado verificado no código: `src/render/cena.ts` cria uma `UniversalCamera` (`camera`) e `src/player/controle.ts` copia posição e rotação do jogador para ela a cada quadro. O raycast, o streaming de chunks e o contorno do alvo leem `camera.position` e `camera.rotation`. O barramento de eventos (`src/player/eventos.ts`) tem `golpe`, `quebra`, `colocacao`, `recusa` e `slot`; `src/player/movimento.ts` gera `passo`, `pulo` e `aterrissagem`. Não há `localStorage` no projeto, nem ferramentas, nem inventário: só a barra de 6 blocos.

## Abordagem Técnica
Sem dependência nova e sem arquivos de arte: tudo por código, como as specs anteriores. Lógica pura em `src/personagem/` e `src/player/`, Babylon em `src/render/`.

- **Câmera dos olhos preservada:** a `camera` existente continua sendo os olhos (posição e rotação do jogador). Raycast, alvo, streaming de chunks, mineração e áudio seguem lendo-a, então as ações não mudam entre os modos. Uma segunda câmera, `cameraVisao`, vira a `scene.activeCamera`: em primeira pessoa copia a pose dos olhos; em terceira fica atrás, calculada por função pura com colisão voxel.
- **Aparência (`src/personagem/aparencia.ts`):** tipo, 4 modelos, paletas fixas e validador puro.
- **Modelo (`src/personagem/modelo.ts`, `textura.ts`):** descrição pura das partes em caixas e textura procedural (buffer RGBA) por aparência. Um material único não emissivo para o corpo.
- **Poses (`src/personagem/poses.ts`):** função pura (estado, tempo) para pose; o mesmo cálculo anima o braço da primeira pessoa e o corpo da terceira.
- **Render (`src/render/personagem.ts`, `src/render/braco.ts`):** o corpo fica no grupo de renderização 0; o braço da primeira pessoa fica em `renderingGroupId` 1 com depth limpo, para não atravessar o terreno. Nenhum dos dois é pickable, projeta sombra nem entra no glow.
- **Persistência (`src/personagem/persistencia.ts`):** só a aparência, em `localStorage`, com armazenamento injetado.

## Contrato de câmera
- Modos: `primeira` (padrão) e `terceira`. A tecla `V` (`KeyV`) alterna, sem repetir ao segurar, e é ignorada com o painel de personagem aberto.
- Terceira pessoa: câmera atrás e um pouco acima dos olhos, a 3,5 blocos de distância, na direção oposta à mira (yaw e pitch do jogador). A função pura `posicaoTerceiraPessoa(olhos, yaw, pitch, solido)` avança em passos de 0,1 bloco e para antes do primeiro bloco sólido; a distância mínima é 0,6 bloco, nunca dentro de um bloco.
- Visibilidade por modo (`visibilidadePorModo`): em `primeira`, só o braço; em `terceira`, só o corpo inteiro.
- A mira central e o contorno do alvo continuam iguais nos dois modos, e o alvo vem sempre dos olhos: o mesmo bloco é apontado, minerado e colocado em ambos.
- Indicador no HUD `[data-camera-indicador]`, com o texto "Câmera: 1ª pessoa (V)" ou "Câmera: 3ª pessoa (V)", sem sobrepor a barra de blocos nem o indicador de som.

## Regras do braço em primeira pessoa
- Braço direito e mão no canto inferior direito, ocupando pouco da tela, longe da mira central. Usa a aparência escolhida (pele e manga da roupa).
- A mão segura o bloco selecionado na barra, em miniatura (cubo pequeno com os tiles do atlas procedural). O cristal-luz na mão usa cor saturada, sem emissivo. Sem ferramenta nova.
- A miniatura troca ao trocar de slot e aparece só em primeira pessoa.
- O braço não participa do raycast, não projeta sombra, não é emissivo e não entra no glow.

## Poses de animação
- Entrada: `{andando, correndo, noAr, minerando, colocando, tempo}`. Saída: ângulos de braço direito e esquerdo, de pernas, deslocamento vertical do tronco e inclinação da cabeça, todos finitos.
- Parado: pose neutra (todos os ângulos de balanço em 0). Andar: balanço oposto de braços e pernas; correr tem amplitude maior que andar.
- Minerar: golpe periódico do braço direito a cada 0,25 s, no ritmo dos golpes da mineração. Colocar: empurrão curto do braço direito (cerca de 0,2 s). Pulo e aterrissagem: leve afundar do tronco (cerca de 0,25 s).
- Os eventos `golpe`, `colocacao`, `pulo` e `aterrissagem` ligam os estados; `andando` e `correndo` vêm do movimento do jogador.

## Personagem e aparência
- Original, em caixas: cabeça, tronco, 2 braços, 2 pernas, cabelo e acessório; altura total 1,8 bloco para não mexer na física. Cada parte com textura procedural pequena, num material único.
- 4 modelos predefinidos, com paleta e proporção distintas (largura do tronco e comprimento das pernas em constantes), ligados ao crepúsculo: `andarilho`, `herbolaria`, `lanterneiro` e `musgueira`. Escolher um modelo aplica as opções dele, mantendo o nome.
- Campos da aparência: `nome` (até 16 caracteres, sem espaços nas pontas), `modelo`, `pele` (5 cores), `cabeloEstilo` (3), `cabeloCor` (6 cores), `roupaEstilo` (3), `roupaCor` (6 cores), `calcaCor` (4 cores) e `acessorio` (`nenhum`, `capuz` ou `lanterna`). Cores vêm só de paletas fixas, guardadas por índice.
- A lanterna usa cor saturada e não é emissiva: segue `TETO_LUMINANCIA_EMISSIVA` e não entra no glow.
- Validador `normalizarAparencia(entrada)`: aceita qualquer valor, devolve sempre uma aparência válida; nome limpo e cortado, índices e ids fora da lista voltam ao padrão do modelo.
- A mesma aparência alimenta o braço e o corpo: trocar uma opção muda os dois.

## Persistência da aparência
- Chave `brumaluz:aparencia`, valor JSON `{versao: 1, aparencia}`. Só a aparência é salva; o mundo continua sem salvamento (decisão da spec 002).
- Leitura com dado ausente, JSON inválido, versão desconhecida ou armazenamento indisponível (exceção ao ler ou gravar) devolve a aparência padrão sem lançar erro.
- Salva a cada mudança confirmada no painel; carrega ao iniciar a página.

## Painel de personalização
- Dentro da tela de entrada (que já existe e libera o ponteiro), com a tecla `C` para reabri-la durante o jogo (libera o ponteiro e mostra o painel). Raiz `[data-painel-personagem]`.
- Controles com estilo próprio (sem aparência crua do navegador): campo de nome `[data-campo="nome"]` e grupos de botões de opção para `modelo`, `pele`, `cabeloEstilo`, `cabeloCor`, `roupaEstilo`, `roupaCor`, `calcaCor` e `acessorio`, cada botão com `data-campo` e `data-valor`, nome em pt-BR e `aria-pressed` no escolhido.
- Cliques e digitação no painel não pedem pointer lock nem acionam teclas do jogo (`V`, `M`, 1 a 6, WASD); o jogo só reentra ao clicar no botão "Jogar" do painel (`[data-jogar]`).
- Pré-visualização: o corpo é o mesmo da terceira pessoa; o painel não exige uma cena separada. O nome aparece no painel e no HUD (`[data-nome-jogador]`), nunca sobre o personagem.
- No celular, o painel rola na vertical dentro da tela de entrada, sem rolagem lateral.

## Contrato de ganchos de teste
`window.__brumaluz` ganha, sem remover os atuais:
- `camera`: `{modo(): 'primeira'|'terceira', alternar(), definir(modo)}`.
- `personagem`: `{aparencia(), definir(parcial), visivel(): {braco: boolean, corpo: boolean}, malhas(): number, pose(): Pose, maoBloco(): number | null, nomeExibido(): string}`.
Os e2e não usam pointer lock; a tecla `V` é pressionada com `page.keyboard.press('KeyV')`, e `ready` continua sendo aguardado.

## Desempenho
O personagem e o braço somam no máximo 20 malhas e 2 materiais. O personagem não cria luz, sombra nem pós-processamento. O FPS em SwiftShader é só informativo e vai ao relatório com as malhas do personagem.

## Critérios de Aceitação Globais
- [ ] A tecla V alterna entre primeira e terceira pessoa de forma idempotente, com o indicador `[data-camera-indicador]` e o modo exposto em `window.__brumaluz.camera`.
- [ ] Em primeira pessoa só o braço aparece, com a mão segurando o bloco selecionado, e o braço anima ao andar, minerar, colocar, pular e aterrissar, sem cobrir a mira.
- [ ] Em terceira pessoa a câmera fica atrás com colisão voxel, só o corpo aparece e ele usa as mesmas animações.
- [ ] Há 4 modelos predefinidos e personalização de nome, pele, cabelo, roupa, calça e acessório, e a aparência escolhida é a mesma no braço e no corpo.
- [ ] A aparência é salva em localStorage e restaurada ao recarregar, com fallback para o padrão se o dado estiver ausente, corrompido ou o armazenamento indisponível.
- [ ] O alvo, a mineração, a colocação, a física e o áudio se comportam igual nas duas câmeras, e o braço e o corpo não são pickable, não projetam sombra, não são emissivos e não entram no glow.
- [ ] Nenhuma dependência nova, nenhum arquivo de arte externo, no máximo 20 malhas de personagem e braço, e os testes, o typecheck e o build passam.
- [ ] Qualidade visual conferida pelas capturas nos três viewports: o braço legível sem cobrir a mira, o corpo na terceira pessoa com cores coerentes com o crepúsculo e sem branco estourado, o painel com controles estilizados e contraste legível, indicadores sem sobreposição e nada cortado nem rolagem lateral no celular.
- [ ] README e relatório de validação descrevem as câmeras, o personagem, a personalização, a tecla C, os comandos de executar e testar e as métricas.

## Premissas
- Painel na tela de entrada, com tecla C para reabrir (resposta do usuário).
- Só câmera de terceira pessoa atrás do jogador (resposta do usuário).
- A mão segura o bloco selecionado na barra, sem ferramenta nova (resposta do usuário).
- Salvar só a aparência em localStorage (resposta do usuário).
- Entrada só teclado e mouse; sem criaturas, multiplayer nem animação de corpo além das poses descritas.
- O nome é só rótulo de interface: aparece no painel e no HUD.
- Valores de distância, tempos e proporções são iniciais, em constantes nomeadas.
- Corpo sem sombra projetada nesta fase, para poupar desempenho.

## Decisões
- Manter a `camera` atual como os olhos e criar `cameraVisao` separada: raycast, mineração, streaming e áudio não mudam entre os modos.
- Braço da primeira pessoa em grupo de renderização próprio com depth limpo: não atravessa o terreno.
- A mesma função pura de poses anima braço e corpo: consistência entre as câmeras e teste sem Babylon.
- Aparência por índices de paletas fixas e validador único: dado salvo ou digitado nunca gera estado inválido.
- Painel dentro da tela de entrada, em vez de uma tela nova: reaproveita a liberação do ponteiro.

## Orientações por papel
### Desenvolvedor
- Importe Babylon por subcaminho de `@babylonjs/core/...`. Nada em `src/personagem/` e em `src/player/camera.ts` importa Babylon, `window` ou `localStorage` globais: injete o armazenamento e o predicado de solidez.
- Não troque a `camera` dos olhos: leituras de posição e rotação dela alimentam raycast e chunks. Só `scene.activeCamera` aponta para `cameraVisao`. Confira que o CSM e o glow aceitam a câmera ativa.
- Braço: `renderingGroupId = 1`, `scene.setRenderingAutoClearDepthStencil(1, true, true, false)`, `isPickable = false`, fora do `shadowGenerator` e `glowLayer.addExcludedMesh`.
- Sem `Math.random` em código de produção do personagem. Textos pt-BR sem travessão nem emoji.
- A tela de entrada hoje reage a qualquer clique pedindo pointer lock: o painel deve interromper a propagação dos cliques e das teclas dentro dele.
- Os e2e já existentes não podem quebrar: o painel não pode cobrir nem mudar a tela de entrada atual além de acrescentar o bloco do personagem.

### Revisor
- Confirme que o alvo e a mineração saem dos olhos nos dois modos, e que o braço e o corpo não são pickable, não projetam sombra e não entram no glow.
- Confirme que o validador nunca lança e que a persistência tolera JSON inválido e armazenamento indisponível.
- Confirme que os testes têm asserções que podem falhar (sem comparar valor com ele mesmo) e que o e2e não passa em vacuidade.
- Confirme textos pt-BR sem travessão nem emoji e nenhuma referência a Minecraft.

## Fontes consultadas
Nenhuma consulta externa nesta spec: tudo se apoia no código e nas dependências já fixadas.

## Renumeração

Na aprovação, as tarefas foram renumeradas na ordem de execução: T12→T09, T09→T10, T10→T11, T13→T12, T14→T13, T11→T14. Os registros do planejamento (usage.jsonl, tools.jsonl, .context.jsonl e .chat.jsonl) mantêm os ids antigos, e este mapa explica a correspondência.

## Persistência da instalação
- Conferência da instalação (`npm ci --no-audit --no-fund`, código 0): 0 entradas gravadas fora de /work, em 11 s (aviso acima de 10 entradas).

## Decisões de Arbitragem
- Revisão 2, T06 F-01 (critério ajustado ao que o ambiente prova): A tarefa não traz nenhum teste de criarPersonagem. Motivo: O escopo da tarefa é só src/render/personagem.ts, então o teste não pode ser criado aqui. Nenhum critério atual exige teste, e não encontrei outra tarefa que o peça. Os critérios passam a ser provados por tsc, build e leitura do código, sem cobrança de tests/render/personagem.test.ts nesta tarefa.
