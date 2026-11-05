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

## Ressalva do WebGL por software

As capturas rodam em Chromium sem GPU, com WebGL por software (SwiftShader). O FPS medido ali é apenas informativo, não uma meta. Para avaliar o desempenho real, abra o jogo num navegador com aceleração por hardware.
