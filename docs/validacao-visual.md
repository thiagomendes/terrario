# Validação visual do Brumaluz

Relatório para a revisão antes da spec 2.

## Direção Brumaluz

- Crepúsculo âmbar e violeta, com sombras azul-petróleo.
- Flora bioluminescente: cristal-luz, flores e cogumelos que brilham.
- Texturas de 32x32 por bloco, geradas por código (ruído e pinceladas) e reunidas num atlas único, sem arquivos de textura externos.
- Céu procedural e névoa exponencial que esconde o corte do raio de visão.

## Compromissos de desempenho

- Chunks: 16x16x64, uma malha por chunk, só faces visíveis e oclusão ambiente por vértice. Raio de visão limitado.
- Worker: a geração do terreno e a malha rodam em Web Worker, para não travar a thread principal.
- Sombras: só do sol, em 2 cascatas, perto do jogador.
- Glow: os emissivos brilham por camada de glow, sem luz dinâmica.
- Resolução adaptativa: a escala de renderização (hardware scaling) muda conforme o tamanho da tela e o FPS.

Métricas de depuração em `window.__brumaluz`: `ready`, `fps`, `chunksCarregados` e `escalaResolucao`.

## Onde ficam as capturas

Os testes e2e gravam em `test-results/screens`, no tamanho do viewport:

- `entrada-desktop.png`, `entrada-tablet.png`, `entrada-celular.png`: tela de entrada.
- `cena-*.png`: cena sem a tela de entrada.
- `cena-movida-*.png`: cena após andar, correr e olhar.

As métricas de cada viewport são anexadas ao relatório do Playwright.

## Etapa 002: edição e refino visual

Melhorias, todas preservando o crepúsculo âmbar e violeta e a flora bioluminescente:

- Iluminação: luz hemisférica de preenchimento azul-petróleo (sombras não ficam pretas), névoa mais rala, glow mais presente só nos emissivos, sombras do sol em 2 cascatas.
- Materiais: tiles por face (topo, lado, base); terra musgosa com musgo no topo e borda pingando nas laterais; madeira com anéis no topo. O atlas segue com 12 células (4x3).
- Vegetação: altura e escala variadas por posição (determinístico), variação de tom por vértice e balanço só no ápice (peso no canal alfa da cor de vértice).
- Legibilidade: contorno âmbar no bloco apontado, mira central discreta e barra de 6 blocos com ícones do atlas e slot ativo evidente.

Capturas novas em `test-results/screens` (sufixos `-desktop`, `-tablet` e `-celular`):

- `barra-*.png`: barra de blocos.
- `alvo-destacado-*.png`: contorno do bloco apontado.
- `bloco-colocado-*.png`: bloco colocado.
- `vegetacao-*.png`: vegetação refinada.

Desempenho: a remalha é limitada a 2 malhas por quadro, com uma malha sólida e uma de plantas por chunk. As métricas de cada viewport são anexadas ao relatório do Playwright (`desempenho-*`).

Identidade: a arte continua procedural, sem recursos externos e sem dependência nova.

## Etapa 003: cristal sem estouro

Causa: o cristal-luz era quase branco no atlas, o mapa emissivo copiava a cor cheia (emissivo mais difuso passava de 1.0) e o glow forte somava um halo, com dois cristais empilhados por ponto do gerador. Resultado: blocos e halos brancos chapados.

Correção, na arte e no mapa emissivo, sem esconder o glow:

- Cristal e haste do cogumelo com cores saturadas e mais escuras no atlas.
- `construirMapaEmissivo` (`src/render/emissivo.ts`) limita a luminância a 0.45, preservando o matiz.
- `INTENSIDADE_GLOW` em 0.5, só nos emissivos; um cristal por ponto.

Validação: `e2e/cristal.spec.ts` coloca cristais diante da câmera e exige no máximo 1% de pixels com R, G e B maiores ou iguais a 245, nos três viewports. Capturas em `test-results/screens/cristal-diante-da-camera-desktop.png`, `-tablet.png` e `-celular.png`: o cristal aparece azul, com facetas e halo suave.

Métricas medidas (também anexadas ao relatório do Playwright como `cristal-*`):

| Viewport | FPS | Chunks carregados | Escala de resolução | Pixels estourados |
| -------- | --- | ----------------- | ------------------- | ----------------- |
| desktop  | 3,9 | 29                | 2,25                | 0,03%             |
| tablet   | 5,0 | 29                | 1,75                | 0,09%             |
| celular  | 9,5 | 29                | 1,5                 | 0,11%             |

Não há FPS mínimo: o WebGL por software é informativo.

## Etapa 004: mineração, efeitos e áudio

Mineração por segurar o botão esquerdo. Durações de mineração contínua (constantes nomeadas em `src/player/mineracao.ts`):

| Material                             | Duração (s)     |
| ------------------------------------ | --------------- |
| Plantas (grama alta, flor, cogumelo) | 0 (instantânea) |
| Folhagem                             | 0,3             |
| Terra musgosa                        | 0,5             |
| Areia-bruma                          | 0,5             |
| Tábuas                               | 0,9             |
| Madeira retorcida                    | 1,1             |
| Cristal-luz                          | 1,4             |
| Pedra rachada                        | 1,6             |

O dano parcial decai linearmente: progresso 1 some em 1 s sem golpes. Colocar tem intervalo mínimo de 0,15 s. Os ganchos `interagir('quebrar')` e `interagir('colocar')` seguem instantâneos.

Limites:

- Partículas vivas: 64, com pool reaproveitado (10 por quebra, 2 por golpe, 4 de poeira ao colocar).
- Vozes de áudio simultâneas: 12, descartando a mais antiga.
- Ambiente de crepúsculo: ganho máximo 0,08.

Efeitos: rachadura de 5 estágios, fragmentos com a cor média do tile e pulso no contorno ao colocar. Nenhum é emissivo nem entra no glow.

Métricas por viewport. O FPS vem da execução real de `e2e/cristal.spec.ts` (tabela da etapa 003, mesma cena e mesmo build). Partículas vivas não foram medidas nesta rodada, pois os e2e de mineração não as anexam; vale o limite de 64. Para consultá-las, leia `window.__brumaluz.fx` no navegador.

| Viewport | FPS (cristal.spec) | Partículas vivas        | Limite |
| -------- | ------------------ | ----------------------- | ------ |
| desktop  | 3,9                | não medido nesta rodada | 64     |
| tablet   | 5,0                | não medido nesta rodada | 64     |
| celular  | 9,5                | não medido nesta rodada | 64     |

Ressalva: em SwiftShader (WebGL por software) o FPS é só informativo e não é meta.

Capturas em `test-results/screens`: rachadura, fragmentos e colocação, nos três viewports.

Não há dependência nova nem arquivo de áudio ou textura externo: som, rachaduras e partículas são gerados por código.

Conferência auditiva: (manual) abra o jogo, clique para jogar e confirme golpes, quebra, colocação, passos, pulo, aterrissagem, troca de slot e ambiente, com variação entre repetições. A tecla M deve alternar "Som: ligado" e "Som: mudo". O áudio real não é verificável no sandbox.

## Ressalva do WebGL por software

As capturas rodam em Chromium sem GPU, com WebGL por software (SwiftShader). O FPS medido com SwiftShader é apenas informativo, não uma meta. Para avaliar o desempenho real, abra o jogo num navegador com aceleração por hardware.
