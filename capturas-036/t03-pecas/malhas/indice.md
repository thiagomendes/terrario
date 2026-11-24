# 036, desempenho: as malhas dos tesouros novos juntadas

Depois da T08 (com 4 amigos, os itens novos somavam de +39 a +47 chamadas de desenho). As peças do
mesmo nó e do mesmo material agora vão numa malha só (`juntarMalhas` em
`src/personagem/bonecoPremiumLojinha.ts`):

- presas ao corpo (boné, mochila-foguete, varinha, pijama): no brilho do corpo, entram na malha
  que a junta já tinha;
- num nó próprio (hélice, asas de borboleta, guarda-chuva, pipa, passarinho): todas no mesmo
  degrau de brilho, uma malha por nó; nas asas de borboleta, a borda e as bolinhas vão na mesma
  tinta do degradê;
- as duas asinhas do passarinho num nó só, batendo pelo vaivém do nó (esticar e encolher), em vez
  de um nó girando para cada asa;
- ficam como estavam: a luz própria (a chaminha), a película de sabão (transparente) e os
  brinquedos de andar (já juntados na T05).

## Malhas por peça (cada malha é uma chamada de desenho)

Contado no boneco do jogo (`criarBoneco`, corpo feminino; o masculino dá o mesmo). O teto de cada
uma fica preso em `tests/render/malhasTesouros.test.ts`.

| Peça | Antes (0777dcf) | Depois | Triângulos (iguais antes e depois) |
|---|---|---|---|
| boné de hélice | +2 | +1 (a hélice) | +1392 |
| pijama de nuvem | +0 | +0 | +5796 |
| asas de borboleta | +4 | +2 (uma por asa) | +6184 |
| mochila-foguete | +3 | +1 (a chaminha) | +2130 |
| varinha de bolhas | +2 | +1 (a película) | +1418 |
| guarda-chuva | +1 | +1 (o nó em pé) | +2716 |
| pipa de lacinhos | +4 | +2 (a pipa e o rabo) | +1804 |
| passarinho de ombro | +3 | +2 (o corpo e as asinhas) | +4832 |

Os efeitos já eram uma malha por tipo para todos os bonecos (fumaça, bolhas, gotas, linha da pipa):
não mudaram.

A sombra: os bonecos não projetam sombra no mapa (só os pedaços do mundo perto da câmera entram em
`sombras.addShadowCaster`, em `src/render/cena.ts`), então não há passada de sombra a cortar; a
conta abaixo bate com uma chamada por malha.

## Chamadas de desenho com 4 amigos (placa, `e2e/desempenho-036.spec.ts`)

`MEDIR_DESEMPENHO=1 E2E_SEM_VSYNC=1 DESEMPENHO_036=cena RODADAS=2`, Vila Neon de dia, celular em pé.
Os quadros por segundo não valem (placa dividida); as chamadas valem.

| Cenário | Antes (rodadas) | Antes, a mais que "nada" | Depois (rodadas) | Depois, a mais que "nada" |
|---|---|---|---|---|
| nada | 182, 188 | | 183, 182 | |
| hoje (os 6 da 023) | 235, 244 | +55 | 237, 238 | +55 |
| andar (só os brinquedos) | 200, 204 | +17 | 204, 205 | +22 |
| montados | 232, 230 | +46 | 219, 219 | +36 |
| mão | 221, 222 | +37 | 202, 208 | +22 |

- **mão** chegou perto da meta (+22).
- **montados** ficou em +36: os brinquedos sozinhos já dão de +17 a +22 (a medida do "andar"), e as
  peças por cima somam agora 15 (eram 28). Para chegar a +20 seria preciso juntar também as asas de
  borboleta num nó só ou cortar nó do passarinho ou da hélice, e isso muda o bater e o girar que se
  vê; ficou de fora.

## Fotos (celular em pé, 390x844)

`antes/` e `depois/`: boné, borboleta, foguete e passarinho; 3/4, frente e costas; dia e noite. Os
mesmos ângulos nas duas pastas. As fotos de "antes" são as da T03 (o boné) e dos acertos da T03 (os
outros três), o mesmo desenho do 0777dcf. `depois/custo.md` é a conta de malhas e triângulos na
cena do jogo.
