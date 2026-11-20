# Terrário (antes Brumaluz)

## Visão geral

Jogo 3D de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Identidade própria: crepúsculo eterno e brumoso, blocos pintados por código e flora bioluminescente. Interface em português do Brasil. Não usa nenhum recurso, nome ou marca de Minecraft.

A spec 001-cena-validacao entregou uma cena jogável de validação visual: terreno em streaming de chunks, ambiente completo, jogador com física e controles, HUD, resolução adaptativa, testes e2e com capturas em três viewports e relatório em `docs/validacao-visual.md`.

A spec 002-edicao-e-refino-visual (concluída) acrescentou seleção do bloco apontado com contorno e mira, quebra e colocação de blocos, barra de 6 tipos, fila de remalha com métricas e o refino de iluminação, materiais com tiles por face e vegetação.

A spec 003-cristal-sem-estouro (concluída) corrigiu os blocos e halos brancos chapados do cristal-luz (arte saturada, mapa emissivo com teto de luminância, glow mais suave e um cristal por ponto).

A spec 004-feedback-mineracao-audio (concluída) trocou a quebra instantânea por mineração com resistência por material (segurar o botão), com rachaduras, fragmentos e efeito de colocação, e adicionou áudio procedural por material e evento (passos, pulo, aterrissagem, mineração, colocação, ambiente), com tecla M para mudo e indicador no HUD.

A spec 005-camera-personagem (concluída) acrescentou braço e mão em primeira pessoa segurando o bloco selecionado, câmera de terceira pessoa (tecla V, com indicador no HUD e colisão da câmera) e um personagem voxel original com 4 modelos e personalização (painel na tela de entrada, tecla C), salvando só a aparência em `localStorage`. Entregou também e2e de câmeras, alvo, mão, personagem e persistência, e capturas do painel e das câmeras nos 3 viewports.

A revisão visual e sonora (sem spec numerada, 2026-11-06) trocou a direção de arte para pixel-art natural de 16x16 com iluminação moderna: ciclo de dia e noite puro (`atmosfera.ts`), céu em shader (`ceu.ts`), água em plano com reflexo (`agua.ts`), bruma de vale e variação de tom por bloco (`materialMundo.ts`), vagalumes (`vagalumes.ts`), pós-processamento, personagem com textura por face e braço em primeira pessoa como viewmodel, e áudio com receitas por material e paisagem sonora.

A spec 006-expansao (branch `feat/expansao`, 2026-11-06) transformou a cena em jogo completo: mundos salvos, inventário, crafting, ferramentas, modos criativo e sobrevivência, mundo de 128 de altura com biomas, cavernas e minérios, iluminação por blocos, água como bloco, blocos utilitários (fornalha, baú, porta, cama, escada, laje, cerca), criaturas (passivas, hostis e companheira), clima e estações, construção assistida, modo foto, mapas, diário de missões, música adaptativa, toque, gamepad e legendas. Detalhes em `.sdd/specs/006-expansao/report.md`.

A spec 007-terrario-temas deu o nome Terrário ao jogo e criou os seis temas de mundo (só aparência, nomes e sons; a mecânica é a mesma). A spec 008-povoados trouxe vilas com moradores, profissões e trocas, na cara de cada tema.

A spec 034-menos-e-mais deixou cinco temas: Vila Neon (o padrão), Cidade Grande, Rancho Alegre, Doce Reino e Exploração Lunar; saíram Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos, com o que era só deles. O registro fica em `src/temas/index.ts` (`TEMA_PADRAO`, a ordem dos cartões em `temasDisponiveis`, `obterTema`), e os construtores se registram em `src/temas/todos.ts`. A base (`src/temas/base/`: `temaBase()`, `corpoDeMorador`, `naCabeca` e a reserva genérica de criaturas, vozes e povoado) é o tema de antes de qualquer ativação e a reserva de quem não importa `todos.ts`; ela não se escolhe. O resto da base (pintores e atlas, `PALETAS_MUSICAIS`, `ESTILO_PADRAO`, `FORMAS_PADRAO`, `textosOriginais`) fica onde sempre esteve. `tests/temas/paridade-cinco.test.ts` guarda os hashes dos cinco (e do canto do Doce) de antes da 034, e `paridade-base.test.ts` os da base.

A spec 009-servidor-local separou o mundo do desenho. O **núcleo** (`src/nucleo/`) é o dono do mundo e das regras, puro, sem tela nem DOM: blocos e edições, baús e fornalhas, itens no chão, criaturas e moradores, inventário, sobrevivência, dia, clima e estações, em passos fixos de 50 ms. Ele roda num Web Worker (servidor local) e, na spec 010, roda igual no Node de um servidor na nuvem. O **cliente** (`src/render/`, `src/ui/`, `src/cliente/`) desenha, toca os sons, lê os controles e faz a física do próprio jogador; ele manda comandos e aplica os quadros que o núcleo devolve. Ações do jogador aparecem na hora (previsão) e são confirmadas ou desfeitas pelo núcleo.

## Núcleo e cliente (spec 009)

- `src/nucleo/protocolo.ts`: todas as mensagens (comandos, quadros, eventos, salvamento), serializáveis e com versão.
- `src/nucleo/nucleo.ts`: o mundo e as regras; `mundo.ts`: terreno pela semente, edições, luz, céu e superfície para as criaturas.
- `src/nucleo/anfitriao.ts`: roda o núcleo no relógio fixo e aplica os comandos na ordem de `seq`; `servidorLocal.worker.ts` é o Web Worker.
- `src/cliente/conexao.ts`: a conexão com o núcleo (worker; na mesma thread para testes, com serialização, atraso e entrega embaralhada).
- `src/cliente/estado.ts`: o que o cliente sabe do mundo, sem tela: previsões com confirmação, quadros em ordem, itens, criaturas, vida, dia e clima.
- `src/cliente/replica.ts`: inventário e contêiner por transações (slot antes → depois) reaplicadas por cima do estado oficial; criaturas e itens com movimento suave.
- Regra: nada em `src/nucleo/` importa desenho, interface, áudio de verdade, Babylon ou DOM (`tests/nucleo/fronteira.test.ts`).
- Salvamento: o núcleo devolve a parte do mundo; a cena junta a câmera, o slot na mão, o diário e os marcadores e grava no IndexedDB, no mesmo formato de antes (mundos antigos abrem iguais).

## Stack

- TypeScript 5.6.3, Vite 5.4.10, Babylon.js (`@babylonjs/core` 7.31.0, imports por módulo para tree-shaking).
- Vitest 2.1.4 para a lógica pura (ambiente node, sem jsdom); Playwright 1.48.2 (Chromium) para e2e e capturas; Prettier 3.3.3.
- Áudio: Web Audio API do navegador, sintetizado por código, sem biblioteca e sem arquivos.
- Docker: imagem base `mcr.microsoft.com/playwright:v1.48.2-noble` (traz Node e navegadores), via `docker/Dockerfile` e `docker/compose.yaml` (serviço `workspace`, porta 5174).

## Estrutura

- `src/main.ts`: ponto de entrada (carrega o mundo do IndexedDB, cria interface e cena e liga inventário, pausa, mapas, diário, foto, toque e gamepad); `index.html` na raiz.
- `src/jogo/` (lógica pura, Vitest): `mundos.ts` (repositório de mundos sobre armazém chave-valor) e `indexeddb.ts`; `itens.ts`, `catalogo.ts` (materiais, ferramentas, comidas), `inventario.ts`, `drops.ts` (itens soltos com física e coleta), `receitas.ts` (receitas com tags, fundição e combustíveis), `ferramentas.ts` (velocidade e coleta por nível), `fornalha.ts`, `conteineres.ts` (baús, fornalhas e tesouro), `sobrevivencia.ts`, `config.ts`, `criaturas.ts` e `populacao.ts`, `clima.ts` (clima e estações), `construcao.ts` (histórico, formas, blueprints, espelho), `mapa.ts` e `diario.ts`.
- `src/world/`: `blocks.ts` (67 blocos com luz, forma, ferramenta, tiles por face), `noise.ts` (2D, 3D, cristas), `chunk.ts` (altura 128, biomas, cavernas, minérios, água, árvores, ruínas, nascimento), `luz.ts` (luz do céu e de blocos), `formas.ts` (caixas de blocos parciais e direções) (blocos, ruído, geração de chunks, um cristal por ponto; lógica pura, sem Babylon) e `edicoes.ts` (registro puro de edições).
- `src/mesh/malha.ts`: malha de chunk (faces visíveis, AO por vértice, tiles por face, vegetação em quads cruzados).
- `src/art/atlas.ts` e `tiles.ts`: atlas 16x8 de tiles 16x16 nomeados (buffer RGBA puro); `itens.ts`: ícones pixel-art de itens.
- `src/workers/chunk.worker.ts`: geração, aplicação de edições e malha de chunks em Web Worker.
- `src/render/`: `atmosfera.ts` (paleta de referência e ciclo de dia puro, `atmosferaNaHora`), `ceu.ts` (shader do céu: gradiente, sol, lua, nuvens, estrelas; GLSL compartilhado com a água), `agua.ts` (plano de água em `ALTURA_AGUA`, segue a câmera), `materialMundo.ts` (plugin: tom por bloco, bioma e bruma de vale), `vagalumes.ts` (partículas), `cena.ts`, `gerenciador.ts` (streaming), `atmosfera.ts`, `balanco.ts`, `resolucao.ts`, `remalha.ts`, `fila.ts`, `destaque.ts`, `emissivo.ts` e `efeitos.ts` (rachadura, fragmentos e pulso de colocação), `personagem.ts` (corpo em terceira pessoa em Babylon) e `braco.ts` (braço e bloco na mão).
- `src/player/`: `fisica.ts`, `controle.ts`, `entrada.ts`, `alvo.ts`, `hotbar.ts`, `interacao.ts`, `mineracao.ts` (dureza por material e estado puro de danos), `minerador.ts` (controlador de segurar/soltar/trocar slot), `eventos.ts` (barramento puro), `movimento.ts` (detector de passos, pulo e aterrissagem), `camera.ts` (modo de câmera, tecla V, colisão da terceira pessoa) e `animacao.ts` (estado de animação puro que produz poses).
- `src/personagem/` (lógica pura): `aparencia.ts` (4 modelos, paletas, validador), `persistencia.ts` (armazenamento injetado), `modelo.ts` e `textura.ts` (partes em caixas e textura procedural), `poses.ts` e `mao.ts` (bloco na mão).
- `src/fx/`: `particulas.ts` (pool com limite), `cores.ts` (cor média por bloco) e `rachadura.ts` (texturas de rachadura); lógica pura.
- `src/audio/`: `motor.ts` (contexto injetável, estados, vozes, mudo), `sons.ts` (banco de sons procedurais por material e evento), `materiais.ts` (grupos de material), `variacao.ts` (variação com semente) e `ligador.ts` (liga eventos ao áudio e ativa no primeiro gesto).
- `src/ui/`: `interface.ts` (HUD, tela de título, pausa, toasts), `barra.ts` (9 slots), `personagem.ts`, `mundos.ts` (painel de mundos e modal genérico), `configuracoes.ts`, `pausa.ts`, `inventario.ts`, `criacao.ts` (grade e livro de receitas), `conteiner.ts` (baú e fornalha), `icones.ts`, `status.ts` (vida, fome, ar, desmaio), `foto.ts`, `mapa.ts` (minimapa, bússola, mapa), `diario.ts`, `toque.ts` (toque, gamepad, legendas).
- `tests/` (Vitest, por área: `mesh`, `player`, `render`, `world`, `art`, `fx`, `audio`, `personagem`, `ui`; `tests/audio/falso.ts` traz o `AudioContext` falso) e `e2e/` (Playwright: `visual`, `interacao`, `barra`, `cristal`, `fumaca`, `mineracao`, `audio`, `personagem`, `persistencia-personagem`, `capturas-personagem`).
- `docs/validacao-visual.md`: relatório de validação visual e desempenho (inclui as seções das specs 004 e 005).
- Configs na raiz: `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`.

## Comandos (instalar, testar, executar)

- Instalar: `npm ci --no-audit --no-fund`
- Testes rápidos: `npx vitest run` (ou `npm test`); completos: `npx vitest run && npx playwright test`
- Build: `npm run build`; preview: `npm run preview`
- Executar: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`
- Via Docker (sem runtime no host): `docker compose -f docker/compose.yaml run --rm --service-ports workspace sh -lc '<comando>'`
- O Playwright sobe sozinho `npm run build` e o preview em `127.0.0.1:4173`. Capturas em `test-results/screens`.

## Padrões e convenções

- Lógica de mundo, malha, edição, raycast, hotbar, fila, mineração, pool de partículas, detector de movimento, ligador de áudio, câmera, poses, animação e aparência é pura e determinística (semente), testável sem GPU e sem Web Audio. Decisões de render que valem teste ficam em funções puras separadas do Babylon.
- Um material de atlas único e uma malha por chunk (16x16x64).
- Sombras só do sol, 2 cascatas, perto do jogador; emissivos via glow, nunca luz dinâmica.
- Versões exatas nos manifestos.
- A página expõe `window.__brumaluz` (inclui `ready`) para os e2e, com ganchos `interagir`, `selecionarSlot`, `apontar`, `bloco`, `alvo`, métricas, `minerar`, `mineracao`, `rachadura`, `fx` e `audio`, mais `camera` e `personagem` (spec 005). `interagir` segue instantâneo.
- Toda troca de slot (teclas 1-6, roda, clique na barra) deve interromper a mineração em curso, não só o evento de teste `brumaluz:slot`.
- Tiles emissivos têm cor saturada e o mapa emissivo limita a luminância a `TETO_LUMINANCIA_EMISSIVA` (0.45). Efeitos novos (partículas, rachadura, personagem, braço) não são emissivos nem entram no glow.
- Áudio: o `AudioContext` só nasce no primeiro gesto do jogador, vem de uma fábrica injetada, e falha vira estado `bloqueado` sem exceção. Limites: 12 vozes e 64 partículas.
- Sem `Math.random` em efeitos, áudio e personagem: gerador com semente injetado.
- A `camera` existente são os olhos do jogador e alimenta raycast, chunks, mineração e áudio; a câmera de visão (`cameraVisao`) é separada e só muda o que é desenhado.
- Visibilidade de braço e corpo por modo de câmera vem de `visibilidadePorModo` (`src/player/camera.ts`), usada em `cena.ts`.
- Armazenamento (`localStorage`) sempre injetado, com fallback sem exceção.
- Evitar trabalho por quadro que recria recursos (ex.: reaplicar faces do bloco na mão só quando o slot muda); `aplicarAparencia` recria as partes do corpo.
- Testes devem usar dados reais (mundo, atlas, tabela de blocos) e asserções que possam falhar, evitando testes tautológicos (que calculam o esperado pela mesma função); e2e não pode passar em vacuidade (sem `if` que pule a verificação quando a busca não acha o alvo).
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
- 2026-11-06: distância da câmera de terceira pessoa com colisão, nunca abaixo do mínimo de 0,6 e sem terminar em ponto sólido; corrigido na revisão da T03 (spec 005-camera-personagem).
- 2026-11-06: altura total do corpo do personagem em 1,8 incluindo cabelo e capuz, conferida em teste (spec 005-camera-personagem).
- 2026-11-06: persistência da aparência com armazenamento injetado, para testar em Vitest sem `localStorage` real (spec 005-camera-personagem).

- 2026-11-06: atlas 4x4 de tiles 16x16 com borda de 8 px, mipmaps (`NEAREST_NEAREST_MIPLINEAR`) e anisotropia; ruído periódico por tile (sem costura). Terra musgosa coberta usa o tile `TILE_TERRA`; folhas usam alpha test e mostram faces internas.
- 2026-11-06: UV da malha por orientação da face (topo da textura no topo do bloco); antes os lados saíam girados.
- 2026-11-06: ciclo de dia de 20 min (`DURACAO_DIA`), luz direcional alterna sol e lua e nunca fica rasante (elevação mínima 0.22). `__brumaluz.hora`, `pausarDia` e `teleportar` existem para testes e capturas.
- 2026-11-06: pós-processamento por `DefaultRenderingPipeline` (HDR, ACES, bloom 0.22, vinheta, FXAA, curvas de cor), mantendo o glow só para emissivos. Shaders GLSL só com ASCII (acentos quebram a compilação).
- 2026-11-06: personagem com uma textura por parte e 6 faces (`gerarTexturaParte`, 40 px por bloco); o UV antigo era espelhado na vertical. Corpo suavizado no render, cabeça segue o pitch da câmera, tronco inclina ao correr.
- 2026-11-06: braço em primeira pessoa como viewmodel com pivô no ombro (`Animador.vista()`): repouso discreto, golpe e colocação avançam, balanço, respiração, atraso de câmera e troca de slot.
- 2026-11-06: áudio com receitas por material, paisagem sonora numa única voz de prioridade alta (agendador injetável) e ganho do grupo `ambiente` em 0.7 (antes 0.08 x 0.08, inaudível).

- 2026-11-06 (006): salvamento em IndexedDB por mundo (edições com metadado, jogador, hora e `extras` de cada sistema registrado via `registrarSalvavel`); a URL `?mundo=<id>` abre um mundo; sem parâmetro abre o último.
- 2026-11-06 (006): edições guardam `bloco | meta << 8` (direção nos bits 0-1); `metasDoChunk` leva o metadado ao worker.
- 2026-11-06 (006): água é bloco (`Bloco.AGUA`, líquido) com malha própria e o shader de água; a mira e a colisão a ignoram.
- 2026-11-06 (006): luz calculada no worker numa região com margem de 14 blocos e os 4 vizinhos, em buffers reaproveitados; vai por vértice num atributo `luz` lido pelo `PluginMundo`.
- 2026-11-06 (006): edição remalha o chunk e os 4 vizinhos (luz), agrupando os pedidos por quadro; o worker guarda em cache os chunks gerados.
- 2026-11-06 (006): modo padrão criativo; distância padrão 3 chunks (ajustável de 2 a 8). Mapa do mundo no Tab porque M continua sendo o mudo.
- 2026-11-06 (006): criaturas são lógica pura com IA por comportamento; o render monta modelos voxel por peças; luz aproximada para hostis por varredura de fontes com cache.

## Restrições

- Sem recursos protegidos de Minecraft.
- Capturas e2e rodam com WebGL por software (SwiftShader): o FPS medido ali é informativo, não meta.
- Edições do mundo não são salvas: somem ao recarregar a página. Só a aparência do personagem é salva (spec 005).
- O áudio real não é verificável no sandbox: testes usam `AudioContext` falso e o estado exposto; a escuta é conferência manual.
- Pendência conhecida: o spawn do jogador (`src/player/controle.ts`) pode cair dentro de árvore ou cristal sólido, pois usa só a altura do terreno. Confirme antes de agir.
- Ponto de atenção: o material de plantas pode usar o alfa de vértice como transparência (`src/render/cena.ts`); revisar se surgir artefato visual.
- Pontos de atenção da spec 005 (não bloquearam): ao mudar a aparência com o personagem em movimento, braços e pernas voltam à pose neutra até a próxima pose aplicada; a lanterna do personagem é identificada por heurística de posição em `src/render/personagem.ts`; o mapeamento de manga e pele no braço (`src/render/braco.ts`) usa o mesmo UV nas 6 faces e pode esticar nas extremidades.
