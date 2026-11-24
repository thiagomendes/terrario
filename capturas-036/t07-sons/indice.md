# Sons da 036 (aperitivo da T07)

Gravados em 24 nov 2026 pelo próprio `tocarSom` do jogo (`src/audio/sons.ts`), num `OfflineAudioContext` do Chromium do contêiner, com o ganho de cada grupo do jogo (os passos em 0,6). Cada som toca 2 vezes, com 0,45 s entre as duas. Entre um som e outro há 1,2 s de silêncio.

## Os dois arquivos para ouvir em sequência (no volume do jogo)
O volume de um som em relação ao outro é o do jogo. O primeiro de cada arquivo é o **passo**, que serve de régua: os sons dos tesouros ficam bem mais baixos que ele, de propósito.

1. `1-tesouros.wav` (22 s), na ordem:
   1. o passo (a régua);
   2. as rodinhas (patinete e carrinho);
   3. o pedal (bicicletinha e carrinho);
   4. a hélice do boné;
   5. a bolha da varinha;
   6. a fumacinha do foguete;
   7. a gotinha do guarda-chuva;
   8. a pipa no vento.
2. `2-montar.wav` (14 s), na ordem:
   1. o passo (a régua);
   2. o zum do patinete;
   3. a buzininha do carrinho;
   4. a campainha da bicicletinha;
   5. o fuf da nuvem.

## Um arquivo por som (no volume cheio, para ouvir o timbre)
- `1-passo.wav`, `1-rodinha.wav`, `1-pedal.wav`, `1-helice.wav`, `1-bolha.wav`, `1-foguete.wav`, `1-gotinha.wav`, `1-pipa.wav`;
- `2-zum.wav`, `2-buzininha.wav`, `2-campainha.wav`, `2-fuf.wav`.

No jogo, cada som pode sair um tico mais agudo ou mais grave a cada vez. Aqui sai sempre a mesma variação (a semente 1234).

Os picos no volume do jogo, com o passo em 0,90: a hélice fica em 0,06, a pipa em 0,09, o pedal e as rodinhas em 0,12, o foguete em 0,14, a gotinha em 0,23, a bolha e o fuf em 0,35, o zum em 0,36, a campainha em 0,42 e a buzininha em 0,43. A hélice e a pipa ficam quase sumidas debaixo da trilha: vale ouvir no aparelho.
