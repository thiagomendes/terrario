# Comer de dentro (primeira pessoa)

O conserto pedido pelo filho do dono: "o movimento não é de comer, só balança um pouquinho a
comida; não traz na boca e não saem farelinhos". A maçã, no jogo de verdade, com a interface à
vista. Saem do `e2e/t04-braco-primeira-pessoa.spec.ts` com `T04=comer`, que também confere: o
ombro nunca aparece (folga de 4 px ou mais em todo quadro), a mão vai para o meio na mordida e
volta, saem farelinhos, a comida diminui, e as migalhas do boneco de fora nunca ficam à vista.

## A sequência (prancha no lugar do vídeo)
Cada prancha tem 9 quadros: 1 segurando, 2 levando, 3 na 1ª mordida, 4 entre, 5 na 2ª, 6 entre,
7 na 3ª, 8 descendo, 9 no fim.
- `sequencia-empe-dia.jpg`: celular em pé (390×844), de dia.
- `sequencia-empe-noite.jpg`: celular em pé, de noite.
- `sequencia-deitado-dia.jpg`: celular deitado (844×390), de dia.
- `sequencia-computador-dia.jpg`: computador (1280×720), de dia.

## Os quadros soltos
- `empe-dia-1.jpg` a `-9.jpg`, `empe-noite-*`, `deitado-dia-*`, `computador-dia-*`: os mesmos 9
  quadros, em tamanho cheio.
- `medidas.json`: em cada quadro, onde a mão ficou (px), quantos farelinhos à vista, a escala da
  comida e a folga do ombro.
