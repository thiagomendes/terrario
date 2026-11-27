# 039b Móveis e utensílios, parte 2: tarefas

| Fase | Tarefa | Quem | O que entra | Pronto quando | Tam. |
|---|---|---|---|---|---|
| 0 | T00 **Medidas de antes** | `testador` | a casa da parte 1 com os oito móveis, em pé, CPU 4×, com a suíte que a T05 repete (as chamadas de desenho) | os números na Situação | P |
| 1 | T01a **Os blocos e os contêineres** | `engenheiro-nucleo-rede` | os cinco blocos; a geladeira e o fogão (a âncora, o filtro, o XP, o salvamento, o saneamento, o visitante, o `j.conteiner`); `VERSAO_REDE` 20, com a 027 renumerada | testes de unidade; o modo nuvem; `servidor/testes/moveis.test.ts` (a sala que dorme e acorda com a geladeira cheia e o fogão no meio); paridade | M |
| 1 | T01b **A mesa e o estado dos móveis** | `engenheiro-nucleo-rede` (o mesmo) | a mesa (assentos em volta, a cadeira que vira, quem come, o `slot` no `usar`, o prato); o `moveisLigados` (TV, som, fogão cozinhando, geladeira aberta); a cadeira vira para a mesa só no `colocar` (no lote, no colar e no espelho a direção fica como veio, com teste do colar com cadeira e mesa); na mesa só conta quem já chegou ao assento (`sentado.chegou`) | testes de 2 a 4 jogadores e de 5 sentados; quem entra no meio vê a TV; quem cai e volta | M |
| 1 | T02 **Revisão da T01a e da T01b** | `engenheiro-nucleo-rede` novo | as duas | consenso | P |
| 2 | T03 **O desenho** | `artista-voxel` | os cinco móveis; o que mexe, lendo o `moveisLigados`; os quatro desenhos da TV; os ícones; o prato | fotos nas três telas, de dia e de noite, de fora e de dentro; as chamadas | M |
| 2 | T04 **A tela e os sons** | `desenvolvedor-jogo` | os painéis; as receitas; os sons e a musiquinha; o toque ligado; só as duas TVs e os dois sons mais perto tocando | e2e: montar, pôr, tocar, cozinhar, guardar, comer junto, recarregar | M |
| 3 | T05 **Desempenho e conferência** | `testador` | a medida da T00; `node scripts/conferir.ts` com a paridade; a nuvem de teste antes do site | as metas e o tempo | M |
| 3 | T06 **Portão visual e publicação** | `revisor-visual` novo, depois o orquestrador | as fotos; o servidor antes do site | publicado e conferido | P |

## Situação (27 nov 2026)
| Parte | Estado |
|---|---|
| Spec | Revisada em 27 nov por um `engenheiro-nucleo-rede` novo, com 2 altos (o canal do estado dos móveis; a cadeira "de frente" quase nunca acontecia), 6 médios e 7 baixos, todos ajustados no texto. O dono decidiu o fogão sem carvão e com XP. Falta a releitura |
| Releitura | o mesmo revisor aprovou em 27 nov; os dois baixos entraram na T01b. **Aprovada em 27 nov** |
