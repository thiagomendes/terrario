# 039 Móveis e utensílios, parte 1: tarefas

| Fase | Tarefa | Quem | O que entra | Pronto quando | Tam. |
|---|---|---|---|---|---|
| 0 | T00 **Medidas de antes** | `testador` | uma casa vazia; a Cidade Grande e um povoado de longe (em pé, CPU 4×), na `main`, com a suíte que a T08 repete | os números na Situação | P |
| 1 | T01 **A regra das várias células** | `engenheiro-nucleo-rede` | a tabela `jogo/moveis.ts`; o metadado; o `colocar` com a âncora; quebrar o móvel inteiro; a peça solta; o `editarLote`; o saneamento; o `recusar`; o tapete na camada própria; o abajur e o criado-mudo acesos (as células trocam de id juntas, e o toque na cúpula vai para a âncora); `VERSAO_REDE` 19, com a 027 renumerada | testes de unidade; os de 2 a 4 jogadores no modo nuvem | M |
| 1 | T02 **Revisão da T01** | `engenheiro-nucleo-rede` novo | a T01, antes de seguir | consenso | P |
| 2 | T03 **A cama nova e as camas antigas** | `engenheiro-nucleo-rede` (o da T01) | o `Pincel` e as metas geradas dos povoados e do sítio; a conversão no núcleo; a cama curtinha; o nascer ao lado; a paridade com os hashes listados | testes; o salvamento da `main` no aparelho e na nuvem de teste; paridade | M |
| 2 | T04 **Sentar e deitar** | `engenheiro-nucleo-rede` (o mesmo) | os assentos no núcleo, como no parque; o jogador visto; o dormir deitado | testes de 2 a 4 jogadores | M |
| 3 | T05 **O desenho** | `artista-voxel` | os oito móveis por pedaço e as partes que mexem; a distância; os ícones e a mão; as poses de sentar e deitar | fotos nas três telas, de dia e de noite, de fora e de dentro; o custo | G |
| 3 | T06 **O aparelho e a ligação** | `desenvolvedor-jogo` | a previsão, o fantasma e o espelho com várias células; as receitas e a categoria Casa; as abas do criativo; o guarda-roupa; a pia; os sons; o esboço sai | e2e: montar, pôr, sentar, deitar, quebrar e recarregar | M |
| 4 | T07 **Revisão do núcleo, da T03 e da T04** | `engenheiro-nucleo-rede` novo | a T03 e a T04 | consenso | P |
| 4 | T08 **Desempenho e conferência** | `testador` | a medida da T00; `node scripts/conferir.ts` com a paridade e a nuvem de teste | as metas e o tempo registrado | M |
| 4 | T09 **Portão visual e publicação** | `revisor-visual` novo, depois o orquestrador | as fotos; o servidor antes do site, com a sala de teste da nuvem conferida antes | publicado e conferido | P |

## Situação (27 nov 2026)
| Parte | Estado |
|---|---|
| Estudo e esboço | duas voltas em 26 nov; o dono decidiu tudo pela aba de perguntas |
| Spec | revisada por um `engenheiro-nucleo-rede` novo em 26 nov: 6 altos, 8 médios e 6 baixos. O dono decidiu dividir em duas partes. Esta é a parte 1, reescrita em 27 nov com os apontamentos que cabem nela; os da geladeira, do fogão, da mesa, da TV e do som ficam para a parte 2 |
| Releitura | o mesmo revisor aprovou em 27 nov com três ajustes, que entraram: o tapete, agora numa camada própria; o abajur na T01; e os baixos. O dono decidiu o tapete por cima e o dormir com todos deitados. **Aprovada em 27 nov** |
