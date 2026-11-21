# 027 Noite das Fantasias: tarefas

Três partes, uma de cada vez, cada uma publicada inteira (ver "As três partes" na spec). A lista de missões abaixo é a recomendada na pergunta 1 da spec; se o dono escolher outra, mudam só as tarefas de missão.

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit `tipo(027-mundo-halloween): ...`, as fotos em `capturas-027/<parte>/<fase>/` e o aperitivo ao dono.

## Nomes no código
- Tema `noite-das-fantasias` (`src/temas/noite-das-fantasias/`), nome **Noite das Fantasias**.
- Planta do povoado `'festa'`; `mundoAlmaDaPlanta('festa') = 'noite-das-fantasias'` (`MundoAlma`).
- Planejador puro `src/world/noiteFantasias.ts` (o mapa, o chão, os prédios de blocos, os pontos de cada coisa).
- Peças que não são bloco em `src/render/festa/`, fundidas por pedaço e criadas só quando a malha do pedaço está pronta.
- Regras puras em `src/jogo/festa.ts`; o estado no núcleo em `src/nucleo/festa.ts` (`extras.festa`); o comando `festa`.
- Missões `n1` a `n10`. Blocos a partir de 117.
- O esboço se lê com `git show esboco/027-noite-das-fantasias:src/esboco/<arquivo>`; nada dele é copiado sem passar pelas correções da spec.

# Parte 1: a vila da festa

## Fase 0: antes de mexer
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T00 | **Medidas de partida** | o tempo de carregar a Vila Neon no celular (CPU 4× mais lenta) e os quadros do pior caso dela, gravados em `capturas-027/partida/`; os hashes da 034 (`paridade-cinco`) e a paridade 36 de 36 conferidos verdes na `main` | a gravação existe e a suíte da 034 passa | P |

## Fase 1: o mundo e o chão
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T01 | **Tema registrado** | `IdTema`, `IDS_TEMAS`, `ORDEM_TEMAS` (logo depois da Vila), cartão (nome, lema, convite, cores), céu do esboço (entardecer o dia inteiro, noite roxa com lua, névoa baixa, sem arco-íris), água, partículas, textos e nomes, `DO_TEMA`, `NOMES_TEMAS`, as listas escritas à mão dos testes; nenhum "Halloween" na tela | `cobertura.test.ts`, `legibilidade.test.ts`, `listaE2e.test.ts`, teste de textos sem inglês | M |
| T02 | **Blocos 117+ e o atlas de 16 linhas** | telha roxa, tijolo torto, teia de barbante, folhas laranja, tábua musgo, pedrinha lilás, tábua roxa; os pintores do esboço apontando para os tiles próprios; os repintados de base (grama, folhas, pedregulho, janela, lanterna, o rosto redondo do `LAMPIAO_ABOBORA`); exclusivos `festa` | `atlas.test.ts` com as 128 células antigas iguais pixel a pixel; o hash de atlas da 034 gravado de novo com essa prova; teste de exclusivos (nada do mundo aparece nos outros) | M |
| T03 | **Planejador** | `noiteFantasias.ts`: lugar em terra firme, chão plano, morrinhos de musgo e moldura de árvores do tema na beira; a praça (palco, barracas, bancos, mesinhas), a rua com as cinco casinhas e a da Vovó, a loja, o castelinho com a torre, o bosque com o caminho e as lanternas, a horta, o gramado da festa com o lugar do trem (acabado, sem trilho ainda) | testes puros: determinismo, nada fora do lugar, toda entrada de lugar a até ~15 s a pé da praça, nascer de frente para a abóbora | G |
| T04 | **Geração, proteção e campo de visão** | `planta: 'festa'` no `estiloSeguro`, `chunk.ts` (altura, chão, nascer, olhar), `protecao.ts` (a vila é do mundo), `nucleo/mundo.ts`; fila de carregamento pela praça; cortina só com os 48 blocos prontos; sósias da torre do castelinho e da abóbora gigante; névoa até a ponta | `paridade-cinco` (terreno e povoado iguais), paridade 36 de 36, teste de tela que anda pelo mundo e confere que nenhuma peça está sobre pedaço sem malha, foto do alto com a visão 8 nos quatro rumos sem bioma alheio | M |
| T05 | **Peças do mundo** | a abóbora gigante arredondada (rosto que acende de noite, pisca e ri no toque), o palco, as barracas **com o toldo de verdade**, lanternas de poste, campainhas, toldinhos, teias, a varanda da Vovó com o caldeirão, a vitrine da loja, o castelinho por fora, a bancada da horta, a parreirinha, o canteiro de hortelã; tudo fundido e instanciado; as portas fechadas balançam no toque | fotos de cada lugar de dia e de noite; revisor novo: o toldo lê como cobertura | G |
| T06 | **Parada para fotos** | fotos de dia e de noite, em pé, deitado e do alto | autocrítica e uma rodada de refazer; o orquestrador confere antes de seguir | P |

## Fase 2: gente, bichos e fantasias
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T07 | **As peças de fantasia novas** | `TipoPeca` novos em `bonecoFantasia.ts`: chapéu de bruxa de aba mole, xale, óculos redondos, varinha, capa de gola alta (pano curvo, malha própria), lençol de capuz (cúpula com abertura oval, malha própria), macacão de tufos com chifrinhos e pezões, chapéu de palha de fita laranja, máscaras de gatinho e morceguinho | teste de encaixe em todos os modelos, corpos e cabelos | M |
| T08 | **O pelo do Bento, para o dono** | três versões lado a lado, nas mesmas tomadas, de dia e de noite | o dono escolhe (aperitivo); a escolhida fica, as outras saem do código | P |
| T09 | **Moradores com posto** | Vovó Zuleica, Conde Dudu (sem presas, lanterninha que brilha sem luz na roupa), Lulu, Bento (o pelo escolhido; o abraço), Seu Jerônimo (cabelo em mechas), Tia Rosinha, Seu Juca, os moradores das casinhas; as três profissões e as trocas do tema; `semTrocas` nos vendedores | `encaixe`, `moradorFundido`, `moradorPele`, `generoMoradores`; foto de noite: a calça do Dudu não chega à cor de pele | G |
| T10 | **Bichos** | Tufinho; abóbora saltitante, morceguinho (a silhueta legível de longe), gatinho de lacinho (doma com peixinho), peixinho lilás, fantasminha manso; a coruja; vozes | `cobertura`, `encaixeBicho`, `juntasBicho`, `bichoBrinquedo`; foto a 15 blocos de noite: o morcego se reconhece (revisor novo) | M |
| T11 | **Fantasias do tema** | Bruxinha/Bruxinho (com a varinha), Vampirinha/Vampirinho, Fantasminha, Monstrinho Peludo; a sugestão ao criar o mundo | `fantasias.test.ts` (uma por tema), encaixe | M |

## Fase 3: comprar e comer
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T12 | **Comprar generalizado** | `compra.ts` e `vilaCompras.ts` leem os balcões pela planta; a Barraca dos Doces, a Barraca das Canecas e a Bancada da Horta; a fichinha da 032 | os testes da 032 sem mudança; testes novos dos balcões da festa; modo nuvem | M |
| T13 | **As comidas e o jeito da caneca** | maçã do amor, brigadeiro (forminha com três), cocada, doce de abóbora (colherada), chocolate quente (gole de caneca, jeito novo), poção (canudinho), a sacola de doces (um docinho por mordida); no ícone, na mão e na boca | fotos de frente e de lado das três mordidas, também com o chapéu de bruxa e o capuz da fantasminha; nada atravessa o rosto | M |

## Fase 4: missões n1 a n5
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T14 | **Alma** | `MundoAlma` `noite-das-fantasias`, n1 a n5 (5 + 4 + 4 + 5 + 4), contas, habilidades, banca (`conferirBanca`), baú com a cor do mundo | `alma.test.ts` com o ritmo deste mundo (nível 2 até a segunda missão, camiseta em 2 sessões, unicórnio entre a 6ª e a 8ª) | M |
| T15 | **Núcleo** | `extras.festa` e o comando `festa`: campainhas e a sacola, lanternas do bosque, esconderijos da Lulu, plantar, regar, colher, escolher a carinha e pôr o lampião, o Tufinho que foge e segue; saneamento e limite por segundo; a previsão no cliente; `VERSAO_REDE` 18 | testes do núcleo de cada missão, no aparelho e no modo nuvem (`confiar: false`); mundo salvo no meio da missão volta certo | G |
| T16 | **Na tela e o guia** | as campainhas e as portas que abrem, a "travessura" de confete, as lanternas que acendem, a Lulu que espia e a risadinha que cresce, a horta que cresce, as três carinhas, as patinhas do Tufinho no lugar das pegadinhas na n5; `alvoDaMissao` e a busca de caminho deste mundo; os desenhos a 28 px | testes do guia (alvo de cada missão, uma trilha só na tela); o quadro não abre sozinho | G |
| T17 | **Testes de tela das missões** | `e2e/noite-fantasias.spec.ts`: n1 a n5 de ponta a ponta, deitado e em pé, com moedinhas de verdade e os tempos da spec | os cinco passam, cada um em até 3 minutos | M |

## Fase 5: música e sons
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T18 | **Trilha e sons** | a trilha em camadas da partitura aprovada, os sons aprovados e os que faltam da parte 1, o ambiente por lugar, créditos, o índice dos pacotes | `trilha.test.ts`, `vozesGravadas.test.ts`, a régua da 019 (`trilha-regua`, `vozes-regua`), nenhum som acima de -12 LUFS momentâneo, tamanhos dentro das metas | M |

## Fase 6: fechamento da parte 1
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T19 | **Desempenho** | o pior caso (a praça de noite com tudo) e os outros lugares, de dia e de noite; a foto do cartão | 45 quadros no pior caso e 60 nos lugares (celular, CPU 4× mais lenta), até 250 chamadas e 450 mil triângulos; carregar até 10% acima da Vila; a noite com o chão acima de 0,25 | M |
| T20 | **Nada voltou para trás** | Vitest inteiro, `npm run build`, paridade 36 de 36, a suíte e2e inteira em pedaços de 2 trabalhadores; o hash deste mundo gravado para as partes seguintes | tudo verde ou conferido contra a `main` | M |
| T21 | **Portão visual e publicação** | as fotos de todos os lugares, moradores, bichos e momentos de missão (dia e noite; 390×844, 844×390, 1280×720), autocrítica e uma rodada, revisor novo só com as fotos, conferência do orquestrador; o servidor antes do site; conferir no ar; vídeo e fotos ao dono | publicado e conferido no ar | M |

# Parte 2: por dentro

## Fase 7: os três lugares por dentro
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T22 | **Folha para o dono** | fachada e lado de dentro da Casa da Vovó, da Loja e do Castelinho, de dia e de noite, no padrão do jogo | o dono aprova (pergunta 3); mudança pedida entra aqui | P |
| T23 | **Casa da Vovó por dentro** | a sala, o sofá, o caldeirão grande que borbulha, a vassoura na parede, os potinhos, o Tufinho no sofá; sentar no sofá; a porta que abre | fotos; teste de colisão dentro da casa; a câmera não atravessa parede | M |
| T24 | **Loja de Fantasias** | cabides por tipo (um toque veste), o provador, o espelho mágico (a câmera vira para a criança e volta) | teste de tela: vestir e tirar cada tipo; a peça vestida vai pela aparência que já existe | M |
| T25 | **Castelinho** | o órgão (notas afinadas, para todos na sala), os quadros que piscam, a escada da torre e o escorregador em espiral (trilho do núcleo, como a rampa de skate) | testes do núcleo do trilho (dois amigos, sair no meio); foto e vídeo da descida | G |

## Fase 8: missões n6 a n8
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T26 | **Núcleo e alma** | n6 (frutas no caldeirão, o copo de poção), n7 (vestir, espelho, palco; sozinha com os moradores, com amigos todos no palco juntos), n8 (três instrumentos, o show com todos dançando); `VERSAO_REDE` 19 | testes do núcleo e do modo nuvem; o desfile com dois jogadores dá a missão aos dois, cada um com as suas moedinhas; `alma.test.ts` | G |
| T27 | **Na tela, guia e testes de tela** | as bolhas, a festa do desfile, a banda (o Bento no bumbo) e a dança; os alvos no guia; os desenhos; e2e das três, deitado e em pé | os três passam em até 3 minutos cada | M |

## Fase 9: fechamento da parte 2
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T28 | **Sons, desempenho, nada voltou, portão e publicação** | os sons de dentro (caldeirão, órgão, escorregador); os quadros dentro da casa, da loja e do castelinho e na banda tocando; a suíte inteira e a paridade; as fotos e o revisor novo; o servidor antes do site | os mesmos números da parte 1; o hash da parte 1 igual | M |

# Parte 3: os passeios

## Fase 10: a vassoura e os brinquedos
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T29 | **Vassoura-patinete** | o porta-vassouras (um toque pega, outro devolve), a Bruxinha já com ela, a pose do esboço, o rastro de estrelinhas, o deslize só nos caminhos de pedra, a mão dentro das casas; `vassoura` na aparência com saneamento; some ao sair do mundo | velocidade igual à de andar; deslize 0,5 ± 0,1 s; nunca cai; distância do núcleo até 0,3 bloco; vídeo de 3/4 de frente | M |
| T30 | **Sentar no brinquedo generalizado** | `jogo/parque.ts` e `nucleo/parque.ts` servindo a mais de um mundo; o trem como brinquedo de cadeiras num trilho | os testes do parque da Vila sem mudança; testes novos das cadeiras da festa | M |
| T31 | **Trem das Risadas** | o laço cercado, a estação, a locomotiva de abóbora, os vagões, o túnel claro com os fantasminhas que acenam, a câmera a bordo sem raspar no túnel | o teste "FOLGA" contra o passageiro mais alto possível (0,5 bloco ou mais); vídeo a bordo, deitado e em pé | G |
| T32 | **Carrossel de morcegos e balanço de teia** | os dois, com sentar, sair e amigos juntos | testes do núcleo; fotos e vídeo | M |

## Fase 11: missões n9 e n10 e fechamento
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T33 | **n9 e n10** | os três arcos de lanternas, o bilhete com três carimbos; núcleo, alma, guia, desenhos; `VERSAO_REDE` 20 | testes do núcleo e do modo nuvem; e2e das duas, deitado e em pé | M |
| T34 | **Sons, desempenho, nada voltou, portão e publicação** | apito, realejo, balanço; o pior caso com o trem passando na praça; a suíte inteira e a paridade; as fotos e o revisor novo; o servidor antes do site; o relatório visual do mundo inteiro | os números da spec; os hashes das partes 1 e 2 iguais | M |

**Ordem:** uma fase por vez, na ordem acima. O esboço sai de vez quando a parte 3 fecha (o branch `esboco/027-noite-das-fantasias` fica só como histórico).

## Situação (21 nov 2026)
| Parte | Estado |
|---|---|
| Esboço | aprovado pelo dono em 20 nov (`esboco/027-noite-das-fantasias`; fotos, vídeos e sons em `capturas-027/esboco/`) |
| Spec | rascunho (DRAFT): falta a revisão do revisor e as respostas do dono às quatro perguntas |
| 1. A vila da festa (T00 a T21) | não começou |
| 2. Por dentro (T22 a T28) | não começou |
| 3. Os passeios (T29 a T34) | não começou |

Na fila (`.sdd/backlog.md`), a 035 vem antes desta.

Falta sempre, ao fim de cada parte, a **rodada em família**.
