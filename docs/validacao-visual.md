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

Identidade: a arte continua procedural, sem recursos de Minecraft e sem dependência nova.

## Ressalva do WebGL por software

As capturas rodam em Chromium sem GPU, com WebGL por software (SwiftShader). O FPS medido com SwiftShader é apenas informativo, não uma meta. Para avaliar o desempenho real, abra o jogo num navegador com aceleração por hardware.
