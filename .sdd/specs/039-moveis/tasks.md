# 039 Móveis e utensílios: tarefas

| Fase | Tarefa | Quem | O que entra | Pronto quando | Tam. |
|---|---|---|---|---|---|
| 0 | T00 **Medidas de antes** | `testador` | quadros e chamadas numa casa vazia e numa casa com blocos, em pé, CPU 4× | os números na Situação | P |
| 1 | T01 **O núcleo dos móveis** | `engenheiro-nucleo-rede` | os 13 blocos; o `colocar` com as células; quebrar leva o móvel; o sentar e o deitar no estado; o fogão, a geladeira e a mesa no núcleo; a conversão das camas antigas e os geradores; `VERSAO_REDE` 19 | testes de unidade; paridade com os hashes novos | G |
| 2 | T02 **O desenho dos móveis** | `artista-voxel` | os 13 móveis no jogo, na malha por pedaço, com as partes que mexem; ícones e mão; a pose de sentar e a de deitar | fotos nas três telas, de dia e de noite, de fora e de dentro; o custo medido | G |
| 2 | T03 **Receitas, criativo e sons** | `desenvolvedor-jogo` | as 13 receitas na categoria Casa; as abas do criativo; os sons e a musiquinha; o guarda-roupa direto nas roupas; os toques de brincadeira ligados | e2e: montar, pôr, tocar, quebrar e recarregar; a aba "casa" sem rolar | M |
| 3 | T04 **Desempenho** | `testador` | a medida da T00 com a casa cheia | as metas | P |
| 3 | T05 **Conferência por área** | `testador` | `node scripts/conferir.ts` com a paridade e a nuvem de teste | o tempo registrado | M |
| 3 | T06 **Revisão do núcleo** | `engenheiro-nucleo-rede` novo | a T01 | consenso | P |
| 3 | T07 **Portão visual e publicação** | `revisor-visual` novo, depois o orquestrador | as fotos; o servidor antes do site | publicado e conferido | P |

## Situação (26 nov 2026)
| Parte | Estado |
|---|---|
| Estudo e esboço | duas voltas em 26 nov; o dono aprovou e decidiu tudo pela aba de perguntas (estilos, escala, origem, criativo, toques, ferro, mesa e camas antigas) |
| Spec | rascunho em 26 nov, à noite; a revisão por um `engenheiro-nucleo-rede` novo fica para 27 nov |
