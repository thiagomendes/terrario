# T08e: os consertos da 4ª rodada do portão (26 nov 2026)

Saem de `e2e/capturas-037.spec.ts` (`CAPTURAS_037=t08`, `CAPTURAS_037_PASTA=capturas-037/t08e`).
- Telas: em pé 390×844, deitado 844×390, computador 1280×720.
- Dia na hora 0,42, noite na hora 0,95.
- Só o jogo das três telas, que tem tudo o que mudou. A rodada antes desta fica em `t08d/`.

**O que mudou desde a `t08d`:**
1. **Os moradores na cena de comer.**
   - De dentro, o morador cuja caixa na tela cruza a caixa da mão e do item, a até 3 blocos, some inteiro, com suavidade (0,2 s).
   - Os outros continuam à vista.
   - Antes, a regra olhava só o meio da cabeça e ia clareando até 2,2: a 1,5 o morador ainda ficava a 70%.
2. **A cor da mão de noite.**
   - A luz a mais da noite vale sempre para a mão e para a manga.
   - Só as peças da ferramenta ficam sem ela; de dia, elas ficam com um tico menos de luz.
3. **A obra de dentro, em pé.** Com o próximo bloco a menos de 1,5 dos olhos, a marca vira só as quinas amarelas, com o bloquinho girando no meio. Deitado e no computador não muda.
4. **A lâmina da colher.** Passa a cinza-aço, com menos brilho; de perto, ela estourava em branco.
5. **As bolhas da varinha.** As que já foram soltas continuam no ar uns 3 a 4 s, como bolhas de verdade. Nas fotos, a varinha passou a ser a última dos tesouros.

## Nas três telas, de dia e de noite (Cidade Grande, perto do canteiro)
- `<tela>-<dia|noite>-pipoca-comendo.png`: a cena de comer, com os moradores.
- `<tela>-<dia|noite>-bloco-na-obra.png` e `-bloco-na-obra-perto.png`: a colher na mão e a marca do próximo bloco. Em pé, perto, as quinas.
- `<tela>-<dia|noite>-fantasma-colado.png` e `-fantasma-um-passo-atras.png`.
- `<tela>-<dia|noite>-picareta-golpe.png` e `-mao-vazia.png`: a cor da mão com a ferramenta.
- `<tela>-<dia|noite>-tesouro-guarda-chuva-gotinhas.png`, `-tesouro-pipa-lacinhos.png` e `-tesouro-varinha-bolhas.png`.
- `<tela>-noite-de-fora-pipoca-referencia.png`.

`notas.json`: as contas tiradas junto com as fotos.
