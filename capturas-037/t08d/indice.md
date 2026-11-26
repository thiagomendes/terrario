# T08d: os consertos da 3ª rodada do portão (26 nov 2026)

Saem de `e2e/capturas-037.spec.ts` (`CAPTURAS_037=t08,extras,defora`, `CAPTURAS_037_PASTA=capturas-037/t08d`).
- Telas: em pé 390×844, deitado 844×390, computador 1280×720.
- Dia na hora 0,42, noite na hora 0,95.
- A rodada antes desta, para comparar, fica em `t08c/`.

**O que mudou desde a `t08c`:**
1. **Guarda-chuva no celular deitado:**
   - o cabo inclina 50° para fora e 16° para a frente;
   - o pano desce pelo canto de cima à direita, com 3 das 8 pontinhas à vista, longe da mira e da bússola;
   - a conta está em `referencia/conta-guarda-deitado.mjs`.
   - Em pé e no computador, ele não muda.
2. **A obra de dentro:**
   - a marca do próximo bloco clareia de perto como os outros fantasmas e não lava mais a tela;
   - a beira dela some quando fica colada nos olhos;
   - os contornos de dentro ficam mais fracos;
   - de noite, a marca continua amarelo claro.
3. **A pipa** sobe para o céu e fica mais longe, abaixo dos botões do alto. Na tela larga, vai mais para a esquerda, longe da bússola.
4. **As listras do balde de pipoca** seguem a parede do balde, de borda a borda, com as pontas retas.
5. **A colher do pedreiro** não ganha a luz a mais da noite: com uma ferramenta na mão, ela fica em 0,1.
6. **A dica do computador** diz "Clique direito: pôr no bloco marcado"; a do toque, "Toque no bloco marcado".
7. **Os moradores na cena de comer:** de dentro, quem cai atrás da mão e do item na tela some mais longe, até 2,2 blocos.

## Nas três telas, de dia e de noite (Cidade Grande, perto do canteiro)
- `<tela>-<dia|noite>-bloco-na-obra.png` e `-bloco-na-obra-perto.png`: a obra de dentro, com a marca do próximo bloco; o recorte do meio da tela.
- `<tela>-<dia|noite>-fantasma-colado.png` e `-fantasma-um-passo-atras.png`.
- `<tela>-<dia|noite>-mao-vazia.png` e `-picareta-golpe.png`.
- `<tela>-noite-de-fora-pipoca-referencia.png` e `<tela>-<dia|noite>-pipoca-comendo.png`.
- `<tela>-<dia|noite>-tesouro-varinha-bolhas.png`, `-tesouro-guarda-chuva-gotinhas.png` e `-tesouro-pipa-lacinhos.png`.

## De fora, num lugar aberto (Doce Reino, numa laje)
- `<tela>-<dia|noite>-de-fora.png`: o boneco e a interface. No deitado, o mapinha e a mochila ficam na esquerda.

## Em pé, de dia (Doce Reino)
- `em-pe-dia-roda-ver-de-dentro.png`, `em-pe-dia-roda-ver-de-fora.png` e `em-pe-dia-volta-para-terceira.png`.
- `em-pe-dia-recusa-no-ar-antes.png`, `-1.png` a `-5.png` e `em-pe-dia-recusa-no-ar.webm`: o "não".
- `em-pe-dia-recusa-em-cima-dela-mesma-de-fora.png`.
- `em-pe-dia-encostada-na-parede.png` e `-de-lado.png`.

`notas.json`: as contas tiradas junto com as fotos.
