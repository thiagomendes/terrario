---
id: 029-webgpu
title: 'WebGPU: desenhar mais rápido nos aparelhos que suportam, com o modo de hoje de reserva'
status: DRAFT
base_branch: main
created_at: 2026-11-13T19:00:00Z
---
## Contexto
O dono, em 13 nov 2026, perguntou quanto se aproveita e o que se ganha trocando para o WebGPU. A decisão dele: um teste de medida logo depois da câmera (022). Se o teste for positivo, isto vira spec e é feito em seguida, **antes** da alma do jogo e das lojas: "um passo importante". Não precisa da casca nativa (020), porque o WebGPU funciona no navegador de hoje.

## O que se aproveita (levantado em 13 nov 2026)
- **Cerca de 95% do código fica igual:** regras (núcleo), servidor, multijogador, interface, sons, mundos, bonecos, bichos e veículos. O Babylon 7 tem o `WebGPUEngine` na mesma versão.
- **O que muda:**
  - a criação do motor, com escolha automática: WebGPU se houver, o WebGL2 de hoje se não houver;
  - os efeitos escritos à mão em GLSL, em cerca de 10 de 167 arquivos de `src`: `agua.ts`, `ceu.ts`, `horizonte.ts`, `materialMundo.ts`, `balanco.ts`, `formas.ts`, `fotoBoneco.ts` (as carinhas da 021), `modoFoto.ts`, `iconesBrinquedo.ts` e os pós-processos em `cena.ts`. Eles podem ser convertidos sozinhos pelo Babylon, o que exige baixar um conversor de 1 a 2 MB a mais, ou reescritos em WGSL, que é o caminho recomendado;
  - as leituras de imagem (fotos e capturas), que no WebGPU são assíncronas;
  - os testes de tela: o navegador no Docker (Mesa d3d12) pode não ter WebGPU, e talvez seja preciso outro caminho para os testes.

## Benefícios esperados (a medir)
- **Menos processador por objeto desenhado.** Nas medidas de celular com CPU 4× mais lenta, o jogo costuma ser limitado pelo processador.
- **"Snapshot rendering" do Babylon**, que só existe no WebGPU: grava o desenho do que é parado, como os pedaços do mundo, e não recalcula a cada quadro. Pode ser o maior ganho num jogo de blocos.
- **Portas abertas:** cálculos na placa de vídeo (água, partículas) e mais coisas na tela.
- **O que não melhora:** onde o limite é pintar pixels (tela grande e nitidez alta), o ganho é pequeno.
- **Expectativa honesta:** de 0% a 50%, conforme o aparelho. Só a medida diz.

## Etapa 1: o teste de medida (depois da 022)
- Uma página escondida (por exemplo `?medir=webgpu`) com a cena mais pesada: o centro da Cidade Grande com veículos e moradores, a câmera girando.
- Ela mostra se o aparelho tem WebGPU e roda a mesma cena nos dois modos, mostrando quadros por segundo e tempo por quadro lado a lado.
- Os efeitos à mão entram pela conversão automática, que basta para medir.
- O dono abre no iPhone dele e nos tablets das crianças e manda os números (ou uma foto da tela).
- **Critério:** a spec segue se os aparelhos da família com WebGPU ganharem de forma clara, digamos 15% ou mais de quadros, ou menos tempo por quadro, sem defeito visual.

## Etapa 2: a troca (se o teste for positivo)
- WebGPU como padrão onde houver, com o WebGL2 de reserva, escolhido sozinho e com chave nas configurações para forçar um ou outro.
- Os efeitos reescritos em WGSL, sem o conversor.
- Snapshot rendering nos pedaços do mundo.
- Testes nos dois modos, medidas antes e depois no celular e no computador, e fotos comparando para garantir que nada mudou de aparência.

## Cuidados
- Ninguém pode ficar sem jogar: aparelho sem WebGPU, ou com WebGPU com defeito, cai no modo de hoje sem a criança perceber.
- Nada de dados novos coletados. As medidas ficam no aparelho, e o dono manda por conta dele.

## Decisões do dono
- 13 nov 2026: teste logo depois da 022; se positivo, a spec é feita em seguida, antes da 023 e das lojas.
