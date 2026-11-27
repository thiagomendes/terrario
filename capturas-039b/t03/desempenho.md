# 039b · T03: as chamadas de desenho (27 nov, na placa)

`e2e/desempenho-039.spec.ts` com `DESEMPENHO_039=casa2`, `RODADAS=2`, celular em pé, CPU 4×,
sem vsync. A mesma casa de blocos: a `casa-mobiliada` (os oito da parte 1), a `casa-parte2` (os
treze, tudo desligado) e a `casa-parte2-ligada` (a TV, o som, o fogão e a geladeira ligados, pelo
`forcarLigados` do desenho). Medianas:

| Cenário | chamadas paradas | chamadas girando | quadros/s (só referência) |
|---|---|---|---|
| casa-mobiliada (parte 1) | 119 | 110 | 62,8 |
| casa-parte2, desligada | 119 (+0) | 110 (+0) | 64,1 |
| casa-parte2, ligada | 122 (+3) | 113 (+3) | 58,3 |

A meta: até +2 desligada e até +4 ligada. Cada móvel ligado é uma malha só (a TV, só a tela);
desligado, ele está na malha do pedaço. Os quadros por segundo nesta máquina variam muito (a
mesma cena de 53 a 64); ficam para conferir no aparelho.
