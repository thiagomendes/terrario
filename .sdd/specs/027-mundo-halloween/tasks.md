# 027 Noite das Fantasias: tarefas

Três partes, uma de cada vez, cada uma publicada inteira (ver "As três partes" na spec). As missões e as comidas abaixo são as recomendadas nas perguntas 1 e 4 da spec; se o dono escolher outra opção, mudam só as tarefas de missão e de comida.

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit `tipo(027-mundo-halloween): ...`, as fotos em `capturas-027/<parte>/<fase>/` e o aperitivo ao dono.

## Nomes no código
- Tema `noite-das-fantasias` (`src/temas/noite-das-fantasias/`), nome **Noite das Fantasias**.
- Planta do povoado `'baile'`; `mundoAlmaDaPlanta('baile') = 'noite-das-fantasias'` (`MundoAlma`).
- Planejador puro `src/world/noiteFantasias.ts` (o mapa, o chão, os prédios de blocos, os pontos de cada coisa).
- Peças que não são bloco em `src/render/baile/`, fundidas por pedaço e criadas só quando a malha do pedaço está pronta.
- Regras puras em `src/jogo/baile.ts`; o estado no núcleo em `src/nucleo/baile.ts` (`extras.baile`); o comando `baile`.
- Missões `n1` a `n10`. Blocos 117 a 127; os tiles deles numa lista depois de `TILES_PECAS`, a partir da célula 128.
- O esboço se lê com `git show esboco/027-noite-das-fantasias:src/esboco/<arquivo>`; nada dele é copiado sem passar pelas correções da spec.

# Parte 1: a vila da festa

## Fase 0: antes de mexer
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T00 | **Medidas de partida** | o tempo de carregar a Vila Neon no celular (CPU 4× mais lenta) e os quadros do pior caso dela, gravados em `capturas-027/partida/`; o atlas de hoje guardado para a comparação célula a célula; os hashes da 034 (`paridade-cinco`) e a paridade 36 de 36 conferidos verdes | a gravação existe e a suíte da 034 passa | P |

## Fase 1: o mundo e o chão
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T01 | **Tema registrado** | `IdTema`, `IDS_TEMAS`, `ORDEM_TEMAS` (logo depois da Vila), cartão, céu do esboço (entardecer o dia inteiro, noite roxa com lua, névoa baixa, sem arco-íris), água, partículas, textos e nomes, `DO_TEMA`, `NOMES_TEMAS`, as listas escritas à mão dos testes; nenhum "Halloween" na tela | `cobertura.test.ts`, `legibilidade.test.ts`, `listaE2e.test.ts`, teste de textos sem inglês | M |
| T02 | **Blocos 117 a 127 e o atlas de 16 linhas** | os onze blocos (telha roxa, tijolo torto, teia de barbante colorida, folhas laranja, tábua musgo, pedrinha lilás, tábua roxa, janela torta apagada e acesa, toldinho listrado, caldeirão); os tiles depois de `TILES_PECAS`, a partir da célula 128: a célula 127 está vazia, então a lista nova começa com um tile de enchimento na 127 (fora do hash) ou numa lista à parte em `NOMES_TILES` cuja contagem começa na 128, para o primeiro tile novo não cair na 127; os pintores do esboço apontando para os tiles próprios; os de base repintados; exclusivos `baile`; o `paridade-cinco` lendo só as 8 primeiras linhas do atlas e do emissivo, e os textos e o resto só pelas chaves de antes | **nenhum hash da 034 gravado de novo**; teste novo: as 128 primeiras células iguais pixel a pixel às da T00; `atlas.test.ts`; teste de exclusivos (nada do mundo nos outros, nada dos blocos de rua neste) | M |
| T03 | **Planejador** | `noiteFantasias.ts`: lugar em terra firme, chão plano, morrinhos de musgo e moldura de árvores do tema na beira; a praça de pedrinha lilás (palco, barracas, bancos, mesinhas), a rua com as cinco casinhas e a da Vovó, a loja, o castelinho com a torre, o bosque, a horta, todos os caminhos de pedrinha lilás, o gramado da festa com o lugar do trem (acabado, sem trilho ainda) | testes puros: determinismo, nada fora do lugar, **toda entrada de lugar a até 60 blocos de caminho da praça**, nascer de frente para a abóbora | G |
| T04 | **Geração, proteção e campo de visão** | `planta: 'baile'` no `estiloSeguro`, `chunk.ts`, `protecao.ts` (a vila é do mundo), `nucleo/mundo.ts`; fila de carregamento pela praça; cortina só com os 48 blocos prontos; sósias da torre do castelinho e da abóbora gigante; névoa até a ponta | `paridade-cinco` igual, paridade 36 de 36, teste de tela que anda pelo mundo e confere que nenhuma peça está sobre pedaço sem malha, foto do alto com a visão 8 nos quatro rumos sem bioma alheio | M |
| T05 | **Peças do mundo** | a abóbora gigante arredondada (rosto que acende de noite, pisca e ri no toque), o palco, as barracas **com o toldo de verdade**, lanternas de poste, campainhas, teias, a varanda da Vovó com o caldeirão e o porta-vassouras, a vitrine da loja só com cabides e chapéus, o castelinho por fora, a bancada da horta, a parreirinha, o canteiro de hortelã; a paleta fixa (roxo, laranja, musgo, dourado); tudo fundido e instanciado; as portas fechadas balançam no toque | fotos de cada lugar de dia e de noite; revisor novo: o toldo lê como cobertura | G |
| T06 | **O lampião arredondado em todos os mundos** | o lampião posto vira a peça arredondada, com o mesmo bloco 66; a peça lê o rosto do tema (o Rancho mantém a carinha de festa junina; este mundo e os outros, o sorriso de olhos redondos), também no ícone, na mão e no item caído; o lampião e o caldeirão postos instanciados por pedaço | testes: o lampião do Rancho continua aceso, com a mesma cor, o mesmo raio de luz e a carinha dele; cem lampiões e cem caldeirões postos num pedaço somam no máximo duas chamadas de desenho a mais; `paridade-cinco` igual; uma linha no boletim para o dono | P |
| T07 | **Parada para fotos** | fotos de dia e de noite, em pé, deitado e do alto | autocrítica e uma rodada de refazer; a conta da noite (chão acima de 0,25, nenhuma parte grande abaixo de 0,1); o orquestrador confere antes de seguir | P |

## Fase 2: gente, bichos e fantasias
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T08 | **O pelo do Bento, para o dono** | três versões lado a lado, todas verde-musgo (tufos grandes e redondos, a recomendada; tufos miúdos e cheios; mechas compridas), nas mesmas tomadas, de dia e de noite. **Se o dono não escolher no mesmo dia, segue a recomendada**, para a T10 e a T12 não pararem; trocar depois é só trocar a versão | o aperitivo enviado; a versão em uso registrada na Situação | P |
| T09 | **As peças de fantasia** | as que existem, com cor e símbolo (`varinha`, `chapeu-palha`, `capa` com a gola curva como variação, `capa-curta`, `mascara` de gatinho e de morceguinho, `macacao`, `camisa-xadrez`, `colete-lenco`); as novas só onde nenhuma serve: chapéu de bruxa, lençol de capuz (cúpula com abertura oval), macacão de tufos com chifrinhos e pezões | teste de encaixe em todos os modelos, corpos e cabelos | M |
| T10 | **Moradores com posto** | Vovó Zuleica, Conde Dudu (sem presas, lanterninha que brilha sem luz na roupa), Lulu, Bento (o pelo em uso), Seu Jerônimo (cabelo em mechas, lenço de festa e broche de abóbora), Tia Filó, Seu Olavo, os moradores das casinhas; as três profissões e as trocas do tema; `semTrocas` nos vendedores; nomes conferidos contra todos os povoados | `encaixe`, `moradorFundido`, `moradorPele`, `generoMoradores`; teste de nomes (nenhum nome novo em outro povoado); foto de noite: ΔE da calça do Dudu para a pele de pelo menos 20 | G |
| T11 | **O abraço do Bento** | a animação de dois corpos (o Bento se abaixa, envolve, balança 1,2 s e solta, coraçõezinhos); o evento do núcleo (quem, com qual morador; um abraço por vez); o amigo perto vê os dois abraçados; mexer no controle solta na hora | teste do núcleo (dois pedidos ao mesmo tempo, modo nuvem); fotos de frente e de lado sem nada atravessando; e2e com dois jogadores: o amigo vê o abraço | M |
| T12 | **Bichos** | Tufinho; abóbora saltitante, morceguinho (a silhueta legível de longe), sapinho de chapeuzinho (doma com uva), peixinho lilás, fantasminha de lençol manso (diferente do de alcaçuz do Doce); a corujinha de modelo próprio; vozes | `cobertura`, `encaixeBicho`, `juntasBicho`, `bichoBrinquedo`; foto a 15 blocos de noite: o morcego se reconhece; teste: fantasminha nunca surge a menos de 8 blocos atrás de parede ou árvore e flutua a no máximo 0,5 bloco por segundo | M |
| T13 | **Fantasias do tema** | Bruxinha/Bruxinho (com a varinha), Vampirinha/Vampirinho, Fantasminha, Monstrinho Peludo; a sugestão ao criar o mundo | `fantasias.test.ts` (uma por tema), encaixe | M |

## Fase 3: comprar, comer e a varinha
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T14 | **Comprar generalizado** | `compra.ts` e `vilaCompras.ts` leem os balcões pela planta; a Barraca dos Doces, a Barraca das Canecas e a Bancada da Horta; a fichinha da 032 | os testes da 032 sem mudança; testes novos dos balcões do baile; modo nuvem | M |
| T15 | **As comidas e o jeito da caneca** | brigadeiro, beijinho, cajuzinho e surpresa de uva (forminha com três), chocolate quente (gole de caneca, jeito novo), poção (canudinho), a sacola de doces (um docinho por mordida); no ícone, na mão e na boca; teste de que nenhuma comida deste mundo tem nome de comida de outro | fotos de frente e de lado das três mordidas, também com o chapéu de bruxa e o capuz da fantasminha; nada atravessa o rosto | M |
| T16 | **A varinha** | com a varinha na mão, o toque no chão (ou o clique) é a ação dela, a até 5 blocos: a mão sobe, a estrela brilha e sai o efeito da pergunta 5 (na recomendada, a florzinha que nasce e some em ~4 s, como evento do núcleo, sem estado salvo) | teste do núcleo (alcance, limite por segundo, modo nuvem); o amigo vê a flor; nada fica no mundo depois de 4 s | P |

## Fase 4: missões n1 a n5
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T17 | **Alma e banca** | `MundoAlma` `noite-das-fantasias`, n1 a n5 (5 + 4 + 4 + 5 + 4), contas, habilidades, a banca da pergunta 2 (`conferirBanca`), baú com a cor do mundo | `alma.test.ts` com o ritmo deste mundo (nível 2 até a segunda missão, camiseta em 2 sessões, unicórnio entre a 6ª e a 8ª) | M |
| T18 | **Núcleo, com o progresso de cada criança** | `extras.baile` e o comando `baile`, com a regra da spec (seção 10, "O progresso de cada criança"): as portas de cada criança; a lanterna já acesa que conta e pisca; a Lulu de cada criança (a cópia só na tela dela); a planta de cada criança e a porta que conta para quem está perto no último passo; o Tufinho que conta para quem está perto na entrega, e a cópia dele "fugida" na tela de quem está num passo anterior quando ele já está em casa; a uva da parreirinha colhida a qualquer hora; escolher de novo nunca apaga o que é do amigo; saneamento e limite por segundo; a previsão no cliente; `VERSAO_REDE` 18 | testes do núcleo de cada missão no aparelho e no modo nuvem (`confiar: false`); **testes de dois jogadores por missão** (os dois juntos, um adiantado e outro atrasado, um que escolhe de novo com o outro no meio; na n5, o Tufinho entregue por um amigo enquanto o outro está num passo anterior: a cópia fugida aparece só para ele e segue até a Vovó); mundo salvo no meio da missão volta certo | G |
| T19 | **Na tela e o guia** | as portas que abrem, a "travessura" de confete, as lanternas que acendem e piscam, a Lulu que espia e a risadinha que cresce, a horta que cresce, as três carinhas, as patinhas do Tufinho no lugar das pegadinhas na n5; `alvoDaMissao` e a busca de caminho deste mundo; os desenhos a 28 px | testes do guia (alvo de cada missão, uma trilha só na tela); o quadro não abre sozinho | G |
| T20 | **Testes de tela das missões** | `e2e/noite-fantasias.spec.ts`: n1 a n5 de ponta a ponta, deitado e em pé, com moedinhas de verdade; uma rodada com dois jogadores na n2 e na n5 | os cinco passam, cada um em até 3 minutos | M |

## Fase 5: música e sons
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T21 | **Trilha e sons** | a trilha em camadas da partitura aprovada, os sons aprovados e os que faltam da parte 1 (abraço, sapinho, varinha), o ambiente por lugar, créditos, o índice dos pacotes | `trilha.test.ts`, `vozesGravadas.test.ts`, a régua da 019; nenhum som acima de -12 LUFS momentâneo no arquivo e na saída do jogo (2 blocos da fonte e no meio da praça); tamanhos dentro das metas; **o hash `sons` dos cinco igual** | M |

## Fase 6: fechamento da parte 1
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T22 | **Desempenho** | o pior caso (a praça de noite com tudo) e os outros lugares, de dia e de noite; a foto do cartão | 45 quadros no pior caso e 60 nos lugares (celular, CPU 4× mais lenta), até 250 chamadas e 450 mil triângulos; carregar até 10% acima da Vila | M |
| T23 | **Nada voltou para trás** | Vitest inteiro, `npm run build`, paridade 36 de 36, a suíte e2e inteira em pedaços de 2 trabalhadores; o hash deste mundo gravado, valendo fora do lote de dentro da casa, da loja e do castelinho e do gramado da festa, com a lista do que muda de propósito na parte 2 | tudo verde ou conferido contra a `main` | M |
| T24 | **Portão visual e publicação** | as fotos de todos os lugares, moradores, bichos e momentos de missão (dia e noite; 390×844, 844×390, 1280×720), autocrítica e uma rodada, revisor novo só com as fotos (inclui: nenhum personagem conhecido, nada que assuste), conferência do orquestrador; o servidor antes do site; conferir no ar; vídeo e fotos ao dono | publicado e conferido no ar | M |

# Parte 2: por dentro

## Fase 7: os três lugares por dentro
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T25 | **Folha para o dono** | fachada e lado de dentro da Casa da Vovó, da Loja e do Castelinho, de dia e de noite, no padrão do jogo | o dono aprova (pergunta 3); mudança pedida entra aqui | P |
| T26 | **Casa da Vovó por dentro** | a sala, o sofá, o caldeirão grande, a vassoura na parede, os potinhos na paleta fixa, o Tufinho no sofá; sentar no sofá; a porta que abre | fotos; a conta da noite por dentro; teste de colisão; a câmera não atravessa parede | M |
| T27 | **Loja de Fantasias** | cabides por tipo (um toque veste), o provador, o espelho mágico (a câmera vira para a criança e volta) | teste de tela: vestir e tirar cada tipo; a peça vestida vai pela aparência que já existe | M |
| T28 | **Castelinho** | o órgão (canos na paleta fixa, notas afinadas para todos na sala), os quadros feitos com `render/fotoBoneco.ts` que piscam só ao toque e não seguem a criança com o olho, a escada da torre e o escorregador em espiral (trilho do núcleo, como a rampa de skate) | testes do núcleo do trilho (dois amigos, sair no meio); a conta da noite por dentro; foto e vídeo da descida | G |

## Fase 8: missões n6 a n8
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T29 | **Núcleo e alma** | n6 (frutas no caldeirão, o copo de poção), n7 (vestir, espelho, palco; sozinha com os moradores, com amigos todos no palco juntos), n8 (três instrumentos, cada um uma cópia na tela de cada criança; o show com todos dançando); `VERSAO_REDE` 19 | testes do núcleo e do modo nuvem; **testes de dois jogadores**: o desfile dá a missão aos dois, cada um com as suas moedinhas; na n6, as frutas de cada um; na n8, o instrumento que um pega não some para o outro; `alma.test.ts` | G |
| T30 | **Na tela, guia e testes de tela** | as bolhas na paleta fixa, a festa do desfile, a banda (o Bento no bumbo) e a dança; os alvos no guia; os desenhos; e2e das três, deitado e em pé | os três passam em até 3 minutos cada | M |

## Fase 9: fechamento da parte 2
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T31 | **Sons, desempenho, nada voltou, portão e publicação** | os sons de dentro (caldeirão, órgão, escorregador); os quadros dentro da casa, da loja e do castelinho e na banda tocando; a suíte inteira e a paridade; o hash do mundo regravado fora do gramado da festa, com a lista do que muda na parte 3; as fotos e o revisor novo; o servidor antes do site | os mesmos números da parte 1; o hash da parte 1 igual fora dos lotes listados | M |

# Parte 3: os passeios

## Fase 10: a vassoura e os brinquedos
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T32 | **Vassoura-patinete** | o porta-vassouras (um toque pega, outro devolve); "Guardar vassoura" na roda só enquanto está nela; a Bruxinha e o Bruxinho já com ela neste mundo (guardar tira só a vassoura); a pose do esboço, o rastro de estrelinhas; o deslize só na pedrinha lilás; a mão dentro das casas; `vassoura` na aparência com saneamento; some ao sair do mundo | velocidade igual à de andar; deslize 0,5 ± 0,1 s na pedrinha e nenhum fora dela; nunca cai; distância do núcleo até 0,3 bloco; vídeo de 3/4 de frente | M |
| T33 | **Sentar no brinquedo generalizado** | `jogo/parque.ts` e `nucleo/parque.ts` servindo a mais de um mundo; o trem como brinquedo de cadeiras num trilho; **conferir se a roda de gestos funciona com a criança sentada no trem** (se não funcionar, na n10 só o toque no fantasminha conta) | os testes do parque da Vila sem mudança; testes novos das cadeiras do baile; o resultado da conferência da roda registrado na Situação | M |
| T34 | **Trem das Risadas** | o laço cercado, a estação, a locomotiva de abóbora, os vagões, o túnel claro com os fantasminhas que acenam, a câmera a bordo sem raspar no túnel | o teste "FOLGA" contra o passageiro mais alto possível (0,5 bloco ou mais); vídeo a bordo, deitado e em pé | G |
| T35 | **Carrossel de morcegos e balanço de teia** | os dois, com sentar, sair e amigos juntos | testes do núcleo; fotos e vídeo | M |

## Fase 11: missões n9 e n10 e fechamento
| # | Tarefa | Entrega | Fecha com | Tamanho |
|---|---|---|---|---|
| T36 | **n9 e n10** | os três arcos de lanternas (o arco já aceso conta e pisca); na n10, tocar num fantasminha na passagem perto do túnel (ele acena de volta e conta), e o tchau da roda também conta se funcionar sentado (T33); a dica no túnel é desenho, nunca texto; três voltas; núcleo, alma, guia, desenhos; `VERSAO_REDE` 20 | testes do núcleo e do modo nuvem; **testes de dois jogadores** (o arco aceso por um conta para o outro; cada um com as voltas dele no mesmo trem); e2e das duas, deitado e em pé | M |
| T37 | **Sons, desempenho, nada voltou, portão e publicação** | apito, realejo, balanço; o pior caso com o trem passando na praça; a suíte inteira e a paridade; as fotos e o revisor novo; o servidor antes do site; o relatório visual do mundo inteiro | os números da spec; os hashes das partes 1 e 2 iguais fora dos lotes listados | M |

**Ordem:** uma fase por vez, na ordem acima. O esboço sai de vez quando a parte 3 fecha (o branch `esboco/027-noite-das-fantasias` fica só como histórico).

## Situação (21 nov 2026)
| Parte | Estado |
|---|---|
| Esboço | aprovado pelo dono em 20 nov (`esboco/027-noite-das-fantasias`; fotos, vídeos e sons em `capturas-027/esboco/`) |
| Spec | aprovada pelo dono em 21 nov (APPROVED), com as recomendadas nas seis perguntas |
| 1. A vila da festa (T00 a T24) | em andamento (ver "Parte 1, passo a passo") |
| 2. Por dentro (T25 a T31) | não começou |
| 3. Os passeios (T32 a T37) | não começou |

### Parte 1, passo a passo
- **T00 (21 nov): feita.** Medidas na placa de vídeo (`MEDIR_027=1`, `e2e/partida-027.spec.ts`), em `capturas-027/partida/`:
  - carregar a Vila Neon no celular em pé (390×844) com a CPU 4× mais lenta, do pedido do mundo até a cortina sair: 10,2 s, 12,0 s e 12,9 s; **mediana 12,0 s** (a meta da Noite das Fantasias é até 10% acima, medida na mesma rodada na T22);
  - o pior caso da Vila (meio do campo do festival, de noite, olhando o palco por cima do público, com a turma de 40 no show): **49 quadros, 237 chamadas, 357 mil triângulos** sem desacelerar; com a CPU 4× mais lenta, **29 quadros**, 238 chamadas (a própria Vila não chega a 45 com a CPU 4×: ver a dúvida ao orquestrador no relatório da fase 1);
  - o atlas dos cinco guardado (as 8 linhas de hoje e o mapa emissivo) em `tests/temas/atlas-antes/`, com a prova de que são os da 034 (os hashes do `paridade-cinco`), e o teste célula a célula `tests/temas/atlas-celulas.test.ts`;
  - `paridade-cinco` 6 de 6; paridade 36 de 36 (`PARIDADE=conferir`, 9,4 min).
- **T01 (21 nov): feita.** O tema `noite-das-fantasias` (`src/temas/noite-das-fantasias/`) registrado como o sexto, o cartão logo depois da Vila; o céu do esboço (entardecer o dia inteiro, noite roxa com a lua grande, piso de luz da noite 0,34, sem arco-íris nem relâmpago), a água lilás, a névoa clarinha, os vaga-lumes mornos; os textos sem inglês (o teste `tests/temas/noiteFantasias.test.ts`), `DO_TEMA` "da Festa", `NOMES_TEMAS`, as listas dos testes (`e2e/temas.ts`, registro, prévias, `soNaCidade` e o servidor). A planta `'baile'` no estilo (a geração vem na T04). `VERSAO_REDE` 18 já aqui (o servidor antigo recusaria o tema novo); a parte 1 sai inteira nesta versão, então a T18 não sobe de novo.
  - **Provisório até a tarefa dona:** os bichos (T12) e os moradores das profissões (T10) já têm uma primeira versão no padrão do jogo (o montador `bicho`, os desenhos do esboço); a uva é o item `frutinhas` com o nome do tema ("Uva"; a parreirinha é o arbusto de frutinhas), o que serve à T12 (o sapinho) sem item novo; a prévia do cartão é a foto aprovada da praça de noite do esboço até a T07 (o mundo de verdade) e a T22; a música é a reserva sintetizada até a T21.
  - Vitest 2086 de 2086.
- **T02 (21 nov): feita.** Os onze blocos 117 a 127 (`src/world/blocks.ts`; nomes na tela: telha roxa, tijolo torto, teia de barbante, folhas laranja, tábua verde-oliva, pedrinha lilás, tábua roxa, janela torta, janela torta acesa, toldinho listrado, caldeirão; "musgo" não pode aparecer em texto, a regra do Bruma e Luz, então a tábua musgo se chama "tábua verde-oliva" e o id é `TABUA_MUSGO`), com os 14 tiles desenhados na base (`pintoresDoBaile` em `src/art/atlas.ts`, do esboço; a teia de barbante roxa, laranja e creme, sem aranha; o toldinho roxo e laranja; a janela torta de caixilho torto).
  - **O atlas:** 16 linhas. A escolha foi a lista à parte: `TILES_027` depois de `TILES_PECAS`, com a contagem das células começando na 128 (`PRIMEIRA_CELULA_027`, `indiceDoTile` lê a célula de um mapa), sem tile de enchimento; a célula 127 continua vazia e nada mora nela.
  - **Nenhum hash da 034 gravado de novo:** o `paridade-cinco` passa com os mesmos valores (lê só as 8 primeiras linhas do atlas e do mapa emissivo, e os textos sem os nomes dos blocos 117+ e sem os itens só da festa). O `paridade-base` (o hash da 007) também lê só as 8 linhas, com os mesmos valores, e confere que as 8 de baixo só têm tiles de blocos exclusivos.
  - **Testes novos:** `atlas-celulas` (as 128 primeiras células dos cinco iguais às da T00 pixel a pixel, no atlas e no mapa emissivo; a 127 vazia nos seis; os 14 tiles a partir da 128); `exclusivos` (a festa lista os onze e nenhum bloco de rua da Cidade ou da Vila; nada da festa nos outros mundos, no criativo, nas trocas e nas receitas; a geração; o núcleo, no aparelho e na nuvem, recusa a telha roxa na Vila e o asfalto na festa). Os pares do mesmo bloco (topo e lado da telha e do toldinho) entraram nos parentes da legibilidade; a janela torta acesa entrou nos blocos que brilham sem espalhar luz.
  - Vitest 2092 de 2092.
- **T03 (21 nov): feita.** O planejador puro `src/world/noiteFantasias.ts` (124 × 112 blocos e a margem de 10, no caminho de `vilaNeon.ts`): o lugar em terra firme, o chão plano, a praça de pedrinha lilás com o palco de tábua roxa no norte, a abóbora gigante no meio, as duas barracas no oeste, mesinhas, bancos, mastros e bandeirolas; a rua ao norte com cinco casinhas tortas (tijolo torto e tábua verde-oliva, telhados roxos em degraus, cada lado num passo, chaminés tortas, janelas tortas em alturas diferentes, toldinho, campainha e lampião) e a Casa da Vovó no fim, de frente para a rua (a varanda coberta de toldinho, o caldeirão de bloco, o porta-vassouras, o banquinho do Tufinho, o telhado de chapéu de bruxa); a Loja a leste (vitrines de vidro, porta fechada); o gramado da festa ao sul (canteiros de abóbora e flor em roda, lampiões, mesinhas, a estaçãozinha marcada); o Bosque das Lanternas a sudoeste (o caminho sinuoso, as cinco lanternas da n2, o laguinho, o galho dos morceguinhos, o poleiro, o bosque fechado de laranja, dourado e cobre) e o Castelinho no fim dele (a torre de 19 blocos com o chapéu pontudo); a Horta a sudeste (a cerca, o portão, as leiras de aboboreira, a parreirinha de uva, o canteiro de hortelã, o canteiro marcado da n4, a bancada, o regador); a moldura de árvores. O relevo em volta: morrinhos de 1 bloco a cada 4 colunas na beira, o relevo de fora achatado a 30% até 140 blocos (a visão máxima) e de volta ao natural até 260.
  - **Testes puros** (`tests/world/noiteFantasias.test.ts`, 6): o mesmo plano para a mesma semente; nada fora da área plana nem da altura, e nenhum bloco de rua da Cidade ou da Vila; nascer na praça, no chão livre, de frente para a abóbora (a 14,5 blocos) com uma barraca a menos de 50° do olhar; **toda entrada a até 60 blocos de caminho da praça** (busca pela pedrinha lilás, nas 3 sementes; na 1337: rua 1, Vovó 30, loja 3, bosque 1, castelinho 52, horta 13, gramado 6; e as seis portas da rua); os lugares e os blocos da festa; o relevo em volta.
- **T04 (21 nov): feita.** A planta `'baile'` na geração (`chunk.ts`: `baileDoMundo`, o chão e a altura do planejador, os blocos da vila por chunk, os metadados, o nascer na praça de frente para a abóbora, nenhum povoado de região, canto nem estrutura rara até a visão máxima), na proteção (`protecao.ts`: a vila é do mundo; o chão e a margem não se cavam; o vão das portas fechadas e o ar da escadinha do palco ficam livres; o lugar `'festa'` no aviso) e no estilo da nuvem. **Nenhum bioma alheio à vista:** até 156 blocos da beira da vila (a visão máxima, 8 pedaços, e mais um), só o bosque e o campinho do tema (`biomaEm`), e o relevo achatado. Na tela: a névoa até a ponta do chão desenhado (como a Cidade e a Vila) e a fila de carregamento pela frente da câmera (a praça primeiro). A cortina já só sai com todo o chão pedido pronto (os 48 blocos). Os sósias de longe e o teste de tela que anda pela vila foram para a T05, junto com as peças que eles desenham.
  - Testes: `noiteFantasias.test.ts` (9: nascer na praça e o chão da vila no chunk em 3 sementes, nenhum povoado de região, só bosque e campinho em volta nos quatro rumos até 140 blocos, a proteção da praça e das paredes); a `cobertura` (os baús, minérios e comida da festa conferidos numa janela de 9 × 9 chunks depois do alcance dela, iguais aos do mundo de sempre) e a `protecao` (a festa fora da lista de povoados de região, como a Cidade e a Vila).
  - Vitest 2101 de 2101; `paridade-cinco` igual (os mesmos hashes); paridade 36 de 36.

A 035 já está na `main` (5996d11) e deixou a `VERSAO_REDE` em 17; esta spec é a próxima da fila. No criativo valem comprar, comer e as missões, como na Vila.

Falta sempre, ao fim de cada parte, a **rodada em família**.
