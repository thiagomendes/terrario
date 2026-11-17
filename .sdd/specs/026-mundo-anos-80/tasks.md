# 026 Vila Neon, parte 1: tarefas

Parte 1 (aprovada em 15 nov 2026, rodada 4): o bairro inteiro com a Rua anos 80, a pracinha onde a criança nasce (parquinho, letreiro VILA NEON, mural de recados), o rinque com os patins, o fliperama e o Festival Trovão com o Show da Vila. Os lotes do parque (parte 2), da casa e da rampa (parte 3) nascem como bairro acabado e cercado, sem placa e sem texto.

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit, as fotos em `scratchpad/026impl/<fase>/` e o aperitivo ao dono.

## Nomes no código
- Tema `vila-neon` (`src/temas/vila-neon/`), nome **Vila Neon**. O festival é a zona `Festival Trovão`.
- Planta do povoado `'bairro'` (`EstiloMundo.povoado.planta`), que o `estiloSeguro` aceita. É assim que o núcleo sabe que mundo é: `mundoAlmaDaPlanta('bairro') = 'vila-neon'`.
- Planejador puro `src/world/vilaNeon.ts` (o mapa do bairro, o chão, os prédios de blocos, os pontos de cada coisa), no caminho da cidade (`cidade.ts`).
- Peças que não são bloco em `src/render/vila/` (letreiros, palco e luzes, fliperama, parquinho, carros e bicicletas, sósias de longe), criadas só quando a malha do pedaço onde ficam está pronta.
- Regras puras do show em `src/jogo/show.ts`; o estado no núcleo (`extras.vila`).

## Fase 1: o terreno e o bairro
| # | Tarefa | Tamanho |
|---|---|---|
| T01 | **Tema registrado:** `IdTema`, cartão (nome, lema, convite, cores), céu de entardecer magenta e noite roxa, água, bruma, `ceu.pisoNoite` (o chão escurece de noite só aqui), textos e nomes; listas escritas à mão (`e2e/temas.ts`, `NOMES_TEMAS`, `DO_TEMA`, testes de cobertura e legibilidade) | M |
| T02 | **Blocos 103+** (até 14 texturas: piso de palco, caixa de som, treliça cromada, pista que acende, letreiro de neon, parede de pôster, reboco em quatro tons pastel, telha colonial, grade da plateia, faixa de neon, alambrado) e os da cidade repintados no jeito do bairro. Exclusivos por planta com dono em mais de uma planta (os blocos de rua valem na cidade e no bairro) | M |
| T03 | **Planejador do bairro:** lugar em terra firme, chão plano, rampa e moldura de árvores do jogo; avenida, rua da pracinha, rua de trás, calçadas, faixas; Rua anos 80 (banca, locadora, lanchonete de esquina com sobrado), casas com muro, portão e quintal; pracinha; fliperama; rinque; festival cercado de alambrado (portão, caminho, campo, grade, palco de blocos, torres, barracas, cercadinho das lhamas); lotes das partes 2 e 3 como bairro acabado. Testes puros (determinismo, nada fora do lugar, as distâncias da spec) | G |
| T04 | **Geração e proteção:** `chunk.ts` (altura, chão firme, sem mato, nascer, olhar), `protecao.ts` (o bairro é do mundo), `nucleo/mundo.ts`; paridade dos outros temas | M |
| T05 | **Peças do bairro** (visual, Fable): letreiros com nome, letreiro VILA NEON, mural, parquinho, orelhão, bicicletas, carros parados, lixeiras, varal de lâmpadas, pipa no fio, fliperama com as cinco máquinas, globo de espelhos, suporte dos patins, palco (luzes, amplificadores, bateria, teclado, pedestal), portão, barracas, rádio e fita gigantes, van da banda | G |
| T06 | **Campo de visão sem buracos:** fila de carregamento pela pracinha e pelo rumo da câmera; cortina só com o chão dos 48 blocos pronto; sósias de longe (a grade de luzes do palco e a placa do rinque) com o próprio chão; névoa até a ponta do chão; teste de tela que anda pelo bairro e confere que nenhuma peça visível está sobre pedaço sem malha | M |
| T07 | **Parada para revisão:** fotos de dia, entardecer e noite (deitado, em pé e de cima), Fable revisa | P |

## Fase 2: gente e bichos
| # | Tarefa | Tamanho |
|---|---|---|
| T08 | **Moradores com posto:** vocalista (ponta da passarela), roadie (construtor), guitarrista (ferreiro), moça do lanche (cozinheira), dançarina e patinador no rinque, moça da lanchonete, moço da banca; o look de cada um (cabelo nunca maior que o boneco); trocas do tema; o pôster do vocalista (uma vez por mundo) | G |
| T09 | **Bichos:** lhama de franja (segue o feno), coelhinho de topete, cachorrinho de bandana, peixinho-dourado, ouricinho do moicano (manso); vozes; o feno | M |

## Fase 3: o show no núcleo
| # | Tarefa | Tamanho |
|---|---|---|
| T10 | **Regras puras** (`show.ts`): o tempo da música, o encaixe do toque em 1/8 de compasso, o chamado do fim e o acorde final (sozinho em 4 s) | P |
| T11 | **Núcleo:** estojos no chão, instrumentos no palco, caixas, show, toque no palco, acorde final, caixas como brinquedo depois; comando `vila` com saneamento e limite por segundo; teste no modo nuvem; `extras.vila`; `VERSAO_REDE` 8 | G |
| T12 | **Na tela:** holofotes que varrem, siga-me, caixas que acendem, estrelinhas frias, confete só no acorde final, a plateia que pula, o palco que pisca chamando | G |

## Fase 4: missões e banca
| # | Tarefa | Tamanho |
|---|---|---|
| T13 | `MundoAlma` `vila-neon`, f1 a f3 (4 + 5 + 6), contas, habilidades, banca (`conferirBanca`), baú com a cor do mundo; o ritmo em `alma.test.ts` | M |
| T14 | **Mural de recados** como o canto das missões; guia da 030 (alvos, trilha no bairro); desenhos das missões a 28 px; o que é de cada missão volta só quando escolhida de novo | M |
| T15 | **Testes de tela** `e2e/vila-neon.spec.ts`: as três missões de ponta a ponta, deitado e em pé, com moedinhas de verdade | M |

## Fase 5: fantasias e patins
| # | Tarefa | Tamanho |
|---|---|---|
| T16 | Roqueira/Roqueiro do Palco (cabelo liso ligado por padrão), Dançarina/Dançarino do Neon, Patinadora/Patinador; encaixe em todos os modelos, corpos e cabelos | M |
| T17 | **Patins:** suporte (um toque calça, outro tira), remada, faíscas, deslize de 0,5 s só na pista, nunca cai; `patins` na aparência com saneamento; somem ao trocar de mundo | M |

## Fase 6: som e brinquedos de tocar
| # | Tarefa | Tamanho |
|---|---|---|
| T18 | Trilha do bairro em camadas (rua, rinque, festival) e as camadas do show, gravadas da nossa partitura; acorde final e aplauso; régua da 019 | G |
| T19 | Brinquedos de tocar: fliperama (8 bits e tela que anima), lápis da fita, rádio gigante, ladrilho que acende; sons de toque da rua (orelhão, campainha) | M |

## Fase 7: acabamento e fechamento
| # | Tarefa | Tamanho |
|---|---|---|
| T20 | Desempenho no meio do show, de noite (60 no computador, 45 no celular com a CPU 4× mais lenta); foto do cartão | M |
| T21 | Nada voltou para trás: alma, guia-missao, missoes-dinos-doce, menu-roda, campo de visão; paridade 36 de 36; suíte inteira; build | M |
| T22 | Vídeos: o bairro deitado; cada missão em pé; relatório visual | M |

**Ordem:** uma fase por vez, na ordem acima.

## Situação (15 nov 2026)
| Fase | Estado |
|---|---|
| 1. Terreno e bairro (T01–T07) | feito: tema, blocos, planejador, campo de visão sem buracos, peças do bairro (rodadas 1 e 2 do visual) |
| 2. Gente e bichos (T08–T09) | feito: moradores com posto e o look de cada um (vocalista de cabelo preto e liso, roadie de boné para trás e fone, guitarrista com a guitarra-raio na frente, dançarina de rosa, patinador de patins), trocas, pôster do vocalista |
| 3. O show (T10–T12) | feito: regras, núcleo (VERSAO_REDE 8), na tela (feixes que pousam no chão, siga-me, estrelinhas frias (sem fumaça, decisão do dono), clarão e estouro no acorde final, confete; a banda de frente para a plateia batendo cabeça) |
| 4. Missões e banca (T13–T15) | feito: f1 a f3 (4 + 5 + 6), banca, guia, desenhos; e2e das três missões deitado e em pé |
| 5. Fantasias e patins (T16–T17) | feito: Roqueira/Roqueiro do Palco (cabelão liso ligado, sai com um toque), Dançarina/Dançarino do Neon, Patinadora/Patinador (na Vila Neon já calça os patins); patins no boneco; encaixe em todos os modelos, corpos e cabelos |
| 6. Som e brinquedos (T18–T19) | feito: trilha e show gravados; fliperama (tela que anima), rádio (liga a batida, notinhas), fita (o lápis rebobina), ladrilho que acende sob o pé, rodinhas dos patins |
| 7. Fechamento (T20–T22) | feito: tsc limpo; Vitest 1777 de 1778 (o tempo da busca de 150 blocos só passa com a máquina quieta); e2e das três missões deitado e em pé (4 de 4, 15 moedinhas ou mais), alma, guia-missao, missoes-dinos-doce, menu-roda (o roqueiro na roda da Vila Neon) e o campo de visão; paridade 36 de 36; build; vídeos do passeio com o show e de cada missão em pé, com o som do jogo |

Medidas: peças no nascer, no celular, 39 826 triângulos (37 270 depois da rodada 1; os carros têm três versões, de perto, de longe e bem de longe). Sem fumaça no show (decisão do dono).

Mistura do show (dono, 15 nov: "a música da banda bem baixinha, até o passarinho mais alto"): o show soa 12 dB acima das caixas soltas (`REFORCO_SHOW_DB`), cheio em toda a plateia, da grade ao portão (`PALCO_CHEIO` 42, some em 72), e a natureza baixa 12 dB enquanto ele toca (`CALAR_NATUREZA_DB`, volta em ~3 s depois do aplauso); o acorde final +2 dB e o aplauso +4 dB. Medido na grade (ebur128, `VILA_SO=grade`): antes, meio do show -35,1 LUFS, igual à trilha e à natureza (-35,4 e -34,3); agora -27,6 LUFS (verso -29,4, refrão -26,1), 6,7 a 7,8 dB acima, e o acorde final -20,3 LUFS no pico. Os "Música" e "Natureza" das Configurações seguem valendo.

## O show só de noite e o público (dono, 15 nov, depois do fechamento)
| # | Tarefa | Estado |
|---|---|---|
| N1 | **Show só de noite no núcleo** (`noiteDeShow` em `src/jogo/show.ts`, `hora` no `CtxVila`): de dia as caixas são brinquedo e não contam a f3; o show que começou termina no dia; `tocou` opcional em `extras.vila` (mundo salvo no meio do show volta com a rodada aberta) | feito |
| N2 | **De dia:** passagem de som (banda afinando, toques baixinhos de bateria e guitarra, `GANHO_PASSAGEM`); a lua da f3 (`luaShow`) no cartão, no selinho e em cima do palco, sem trilha nem mãozinha; **a noite chega:** o palco aquece (6 s), o acorde macio (`GANHO_AQUECER`) e a trilha acende | feito |
| N3 | **O público, uns 20** (decisão do dono: todos com a cara dos bonecos do jogo; os 44 bonecos simplificados saíram): 20 moradores de verdade (`publicoVila.ts` + `cuidarDoPublico`), seis na grade, dois logo atrás e doze espalhados pelo campo no show, cinco rodinhas de noite, 4 de dia; chegam pelo portão quando alguém vê o lugar; caminho que dá a volta nas peças; oito com bastão de luz na mão (só de noite) | feito |
| N4 | ~~O povo de longe em instâncias~~ (44 bonecos simplificados): feito e tirado no mesmo dia (o dono: "cara de remendo"; ou todo mundo tem a cara dos bonecos do jogo, ou não existe). Os sósias de longe (`render/vila/sosias.ts`) são só o palco e a placa do rinque, sem gente | tirado |
| N5 | **A f2 em pé que falhava:** a lhama ficava para trás (2,2 b/s contra 4,3 da criança) e passava do `RAIO_SEGUIR` (12); agora apressa o passo quando fica para trás (`fatorSeguindo`, até 2,1x) | feito |
| N6 | Testes: núcleo (dia recusa, noite aceita, noite acaba no meio, mundo salvo, turma, f2 no passo da criança), guia (espera de dia), e2e da f3 com o relógio na noite, `e2e/vila-neon-noite.spec.ts` (fotos, medidas, vídeo) | feito |

| N7 | **O show sozinho, toda noite** (dono, 15 nov, no iPhone: "o show não começou nunca"; "eu toquei nas caixas"): as caixas acendem sozinhas uma a uma com alguém no festival (20 s de noite, 6 s perto; 35 s com a f3 aberta), um show por noite (`idDaNoite`, `extras.vila.noite`), as caixas se apagam quando a noite chega, a f3 fecha no show mesmo sem toque; o toque vale do palco e da plateia inteira (`alcancaOPalco`, antes 7 blocos no núcleo contra o palco inteiro na tela); de noite cada caixa que acende soa um acorde | feito |
| N8 | **Passarinho de noite** (todo mundo): `noiteDosBichos` (a noite dos bichos adiantada 0,06 à tarde) | feito |
| N9 | Testes: núcleo (o fluxo do dono sem tocar em nada, sem a f3, quem chega de noite, longe nada, um por noite, a f3 que espera e fecha igual, a grade alcança as três, mundo salvo com `tocou`), `show.test.ts` (a noite dos bichos), e2e `Vila Neon, deitado: ... o show começa sozinho` (as três `auto`, a turma de braço para o alto, a natureza baixa), vídeo `VILA_SO=sozinho` | feito |

Medidas no celular (em pé, placa de vídeo, `VILA_SO=medida`, com os 20 de verdade): no nascer, peças 39 826 triângulos e 148 chamadas de desenho de dia, 156 de noite, 60 quadros (o público é do festival: ninguém ali); na grade no meio do show, de frente para o palco, peças 44 738 triângulos, 268 mil na cena, 140 chamadas, 60 quadros; do meio do campo olhando o palco por cima do público (o pior caso), peças 50 144, 385 mil na cena, 224 chamadas, 49 quadros (o teste pede 45 ou mais). No computador, de cima do campo no meio do show (os 20 à vista): peças 87 214, 680 chamadas. Paridade 36 de 36.

Carros parados: modelos novos só deste mundo (`src/render/vila/carros.ts`): hatch em cunha, carrinho bolha, van pão de forma (a da banda grafite com o raio) e picape.

Colisão (dono, 15 nov: "o personagem atravessando objetos e bichos"):
- **Peças:** as peças que não são bloco ganham caixas tiradas do plano (`src/world/vilaSolidos.ts`), nunca da malha: o núcleo e o aparelho leem o mesmo mundo sólido (`comPecasDaVila`, o jeito dos veículos da 014, `comCaixasExtras`). Seguram: carros, van, picape, carrinho de pipoca, rádio e fita gigantes, máquinas do fliperama, suporte dos patins, bancos, lixeiras, floreiras, hidrante, caixas de correio, orelhão, ponto de ônibus (fundo, banco e plaquinha), bicicletas, parquinho, mural, mesinhas, casinha do cachorro, piscininha, vitrine e balcão da lanchonete, mesa de som, bateria e teclado, os postes do pórtico do rinque. De passagem: varais de lâmpadas, bandeirolas, pôsteres, letreiros no alto, holofotes, flâmulas, raios, globo, pipa, pedestal do microfone, toalhas, roupa do varal, banquinhos da lanchonete. A barraca e a banca já eram blocos. Peça em que o boneco já está dentro não segura (sai andando). A trilha do guia, a do achar o amigo e o pulo para perto dão a volta nelas (`comPecas`).
- **Bichos e moradores (todo tema):** corpos macios do desenho do tema, girados; o boneco que entra sai de lado, devagarinho (contorna), e no núcleo o bicho encostado dá passagem (3 b/s, sem cair de beirada nem encostar em carrinho). Num corredor sem saída, a lhama que seguiu o feno anda para trás e a criança sai.
- **Provas:** `tests/world/vilaSolidos.test.ts` (a caixa cobre o desenho e não passa dele), `tests/nucleo/vilaColisao.test.ts` (robô pelas ruas e para dentro de cada tipo de peça, bichos, corredor das lhamas), `tests/jogo/guiaVila.test.ts` (trilha fora das peças), `e2e/vila-colisao.spec.ts` (no jogo, com o vídeo `colisao.mp4`).

## O show separado das missões (dono, 16 nov 2026, depois de jogar o show de verdade)
| # | Tarefa | Estado |
|---|---|---|
| S1 | **Festival sem bichos soltos:** nenhum nasce nem entra (portão e alambrado são cerca para eles), quem está dentro sai a pé pelo portão; passam as lhamas do cercadinho, o bicho que segue a comida, os criados e os moradores (`zonaSemBichos`, `bichoSolto`, `populacao.ts`); no show, perto do festival, nenhum bicho nem morador chama e a natureza cala 30 dB | feito |
| S2 | **A banda fora do palco fora do show:** de dia na van, de noite na coxia; a rota dos degraus (o "desceu para subir e ficou presa"), o caminho feito uma vez e seguido, e quem está longe da coxia quando o show começa aparece nela no escuro da abertura | feito |
| S3 | **A tecladista** (n 62): coreografia (teclado, mão no alto nos refrões, teclado de pendurar no último refrão da m2), o look, o teclado que acende no tempo | feito |
| S4 | **O show sem missão:** começa sozinho toda noite, as caixas são brinquedo fora dele, sem acorde do toque e sem chamado (o acorde final vem sozinho); sai a passagem de som de dia | feito |
| S5 | **O público de 40** no show, com o boneco de verdade mais barato (esqueleto: 3 chamadas de desenho por boneco; bolinhas pequenas com menos gomos) | feito |
| S6 | **f4 Volta no rinque** (id novo, 6 moedinhas): os três arcos (peça, sólidos, aceso por jogador, o piscar e o "plim"), a conta `rinque:arco` no núcleo, o guia (suporte dos patins, depois os arcos), os desenhos; sai a f3, a lua e a espera da noite | feito |
| S7 | Testes: núcleo (`vila.test.ts`: banda de qualquer lugar, banda fora do palco, show só para ver, f4 sozinha, com amigos e mundo salvo; `vilaSemBichos.test.ts`), guia, e2e (as missões com a f4 deitado e em pé, a câmera no show, a noite, o campo, a colisão); `VERSAO_REDE` 10 | feito |

## Os acertos do dono depois do show publicado (16 nov 2026)
| # | Tarefa | Estado |
|---|---|---|
| A1 | **O bastão de luz não atravessa o corpo:** sai do brilho da cena e ganha a luz dele (o tubo de miolo claro e a casquinha de neon somada, com a profundidade de sempre); o corpo do teclado de pendurar, o da tecladista e o do vocalista tapam o friso de neon no mapa do brilho (`render/criaturas.ts`) | feito |
| A2 | **O convite não oferece missão já feita** (todo mundo com missões): `temMissaoNova`, o relógio do convite com `nova`; com tudo feito, nada; a missão de bis que acaba sai do selinho (`jogo/alma.ts`, `jogo/guia.ts`, `ui/alma/guia.ts`) | feito |
| A3 | **Os patins são uma escolha:** só o toque de verdade no suporte calça e tira (`foiToque`); "Tirar patins" na roda só de patins (os itens a mais da roda com `visivel`); ninguém entra no mundo de patins; a Patinadora não calça; a festinha de calçar e de tirar; fora da pista anda e corre como sempre (`player/fisica.ts`, `render/cena.ts`, `ui/alma/vila.ts`, `ui/menuRoda.ts`, `main.ts`) | feito |
| A4 | **Ninguém da turma some nem aparece à vista:** a ida para casa a pé (portão, calçada da avenida, calçada das casas, quintal), a chegada de onde ninguém vê (as paradas de três lados, em fila, pela faixa de pedestre), `alguemVe`, o caminho de fora (`caminhoDoPublico`), o corte para o ponto seguinte, a volta na criança parada, o caminho refeito em vez do anti-trava à vista; na tela, quem entra cresce e quem sai de repente encolhe (`world/publicoVila.ts`, `nucleo/vila.ts`, `render/criaturas.ts`) | feito |
| A5 | **A roda sem encosto:** `desenharRoda` (mede os nomes, abre a roda, oval quando a tela acaba, o nome em duas linhas, o aperto e o botão menor só em último caso) (`ui/roda.ts`) | feito |
| A6 | Testes: `tests/jogo/alma.test.ts` (o convite em cada mundo), `tests/player/patins.test.ts`, `tests/jogo/rinque.test.ts`, `tests/ui/roda.test.ts` (9 telas × 6 listas), `tests/nucleo/vilaSaida.test.ts`; e2e `vila-patins.spec.ts` (os patins e a roda em 8 telas), `convite-feitas.spec.ts` (Vila Neon e Rancho), `vila-ajustes.spec.ts` (as fotos do bastão e os vídeos dos patins e da saída) | feito |

`VERSAO_REDE` segue 10 (nenhum comando, evento ou campo novo).

Conferido (16 nov 2026, placa de vídeo): tsc limpo; Vitest 1900 de 1900 (183 arquivos); paridade 36 de 36 de primeira; e2e vila-neon (as missões deitado e em pé, 17 moedinhas, f4 em 50 s), vila-colisao, vila-neon-campo e vila-show-camera 10 de 10; vila-neon-noite (dia e noite) e a medida do celular (na grade 138 chamadas e 60 quadros; o pior caso, do meio do campo por cima do público, 245 chamadas e 48 quadros, igual a antes; o teste pede 45); alma, guia-missao, menu-roda e gestos 19 de 19; vila-patins 3 de 3 (a roda com 12 itens em 8 telas, nenhum encosto), convite-feitas 4 de 4, vila-ajustes 3 de 3 (no vídeo da saída, 7 saíram do mundo e nenhum dentro da tela). O vila-show-camera deitado reprovava também antes destes acertos com a máquina mais lenta (o acorde final sozinho caía dentro da espera do teste); o teste agora deixa esse acorde de fora da conta.

A ver com o dono: (1) o bis da 023 continua no quadro para quem abre "Missões" na roda (só o convite parou de oferecê-lo); (2) no computador com a distância de visão acima de 56 blocos ainda dá para ver, bem de longe, alguém da turma entrar ou sair do mundo (crescendo ou encolhendo, nunca piscando); (3) não achei no núcleo onde os bichos que saem do festival sumiam: eles saem andando e ficam no mundo (há o teste), e a tela agora não deixa nenhum piscar.

## Parte 2 (026b), etapa A: o Parque de diversões (16 nov 2026)
O lote do nordeste (que nasceu jardim) virou o parque, com o "sentar e ser levado". As missões do parque e os toques da Rua anos 80 ficam para a etapa B.

| # | Tarefa | Estado |
|---|---|---|
| P1 | **A planta do parque** (`src/world/vilaParque.ts`): a entrada com o arco de lâmpadas e a placa PARQUE ALEGRIA, o caminho e o passeio, a pista coberta do bate-bate (grade, colunas, teto de malha com a barra azul e branca), o cercado da roda-gigante, o pedestal do carrossel, as barracas de argola e de pescaria, a pipoca, o algodão-doce, os balões, os bancos, os postes, as árvores do jogo e a **fazendinha** (cercado de madeira com a entrada aberta, abrigo de telha, fardos de feno e cocho); o laguinho ficou, atrás da roda | feito |
| P2 | **A conta das cadeiras** (`src/jogo/parque.ts`, pura): a roda dá uma volta a cada 25 s, o carrossel a cada 18 s, os seis carrinhos rodam a pista a 1,3 bloco/s; onde está cada cadeira é conta do relógio do mundo (todos veem igual, sem mensagem por quadro); o empurrãozinho da roda (meia cadeira em 2,5 s, um por vez) | feito |
| P3 | **O núcleo é dono das cadeiras** (`src/nucleo/parque.ts`): `sentar` (alcance de 7 blocos, a cadeira livre), `sair`, `tum`, `roda`; a roda devolve a criança ao chão depois da volta inteira; quem some solta a cadeira; o lugar de descer vale no modo nuvem; as chaves `andou:roda`, `andou:carrossel` e `andou:bate` já contam (para o bilhete de três carimbos da etapa B); nada salvo; `VERSAO_REDE` 11 | feito |
| P4 | **Na tela** (`src/render/vila/parque.ts`, `pecasParque.ts`): a roda de gomos vermelhos e creme com as oito cadeirinhas sempre em pé, o carrossel de toldo vermelho e creme com os oito cavalinhos subindo e descendo, os seis carrinhos com a haste até a malha, a faísca e as estrelinhas do "tum"; cadeirinhas, cavalinhos, faróis, faíscas e estrelinhas em instâncias finas; tudo só com o chão de todos os pedaços desenhado; a roda de longe (sósia) | feito |
| P5 | **Sentar e ser levado** (`src/render/vila/passeio.ts`, `player/controle.ts`): o pulinho até a cadeira, a física descansa, a pose de sentado de cada brinquedo, o pulinho de descer; a câmera continua da criança (na roda ela vai para trás da cadeirinha, que olha ao longo da roda para o bairro); os amigos sentados aparecem na cadeira deles; "Sair do brinquedo" na roda do menu só sentada (`visivel`), e empurrar o controle por meio segundo desce do carrossel e do bate-bate | feito |
| P6 | **O toque** (`src/ui/alma/vila.ts`): o toque de verdade senta (arrastar por cima gira a câmera); sentada, cada toque é o "tum", o empurrãozinho da roda ou o realejo; os brinquedos de tocar: os balões sobem, a argola voa e cai no pino, o peixinho pula da tina, a pipoca estoura com o sininho, a cuba do algodão gira e a nuvem cresce; o pipoqueiro e a vendedora acenam | feito |
| P7 | **Moradores** (bonecos de verdade): Seu Chico, o pipoqueiro (cozinheiro: a troca da pipoca que já existia), Duda, o moço do bate-bate (construtor), Dona Flor, a vendedora de balões; duas lhamas na fazendinha | feito |
| P8 | **Sons** (`src/audio/realejo.ts`, `somParque.ts`), feitos na hora, nada no pacote: o realejo (valsa nossa de 16 compassos, em laço, no relógio do mundo, cheio a 7 blocos do carrossel e sumindo aos 34; a trilha do bairro cala com ele), o floreio, o "tum", a risada, o sininho, o estouro, o balão, a argola, a água, o algodão, a roda e o zumbido das lâmpadas de noite; na régua da 019 | feito |
| P9 | Testes: `tests/jogo/parque.test.ts`, `tests/nucleo/vilaParque.test.ts`, `tests/audio/realejo.test.ts`, `tests/audio/somParque.test.ts`; e2e `vila-parque.spec.ts` (deitado e em pé, com o dedo de verdade), `vila-parque-fotos.spec.ts`, `vila-parque-videos.spec.ts` (vídeos com o som e a medida do celular) | feito |

| P10 | **A dica de toque** (pedido do dono, 16 nov: no suporte dos patins "tem que adivinhar"; `src/ui/alma/dicaToque.ts`): perto do suporte, a mãozinha do jogo toca nele e o balãozinho mostra os patins com a setinha verde que entra ("Toque para calçar") ou a laranja que sai ("Toque para tirar"); nos três brinquedos de sentar, a cadeirinha e "Toque para andar". Uma por vez, só a até 4 blocos (5 nos brinquedos), meio segundo depois de chegar, longe dos botões; some quando a criança usa e só volta depois de ela se afastar 7 blocos. e2e `vila-dica-toque.spec.ts` (deitado e em pé) | feito |

**Conferido (16 nov 2026, placa de vídeo):** tsc limpo; Vitest 1956 de 1956 (188 arquivos); paridade 36 de 36 de primeira; e2e vila-parque 2 de 2, vila-dica-toque 2 de 2, vila-neon 5 de 5, vila-show-camera 2, vila-patins 3, convite-feitas 4, menu-roda 5, vila-colisao 1, vila-neon-campo 2 (a f2 em pé falhou uma vez numa rodada com a máquina ocupada e passou na seguinte).

**Medidas do celular** (em pé, `PARQUE_SO=medida`): na entrada, no passeio (o parque inteiro em volta) e no alto da roda-gigante, de dia e de noite, 60 quadros (123 a 166 chamadas de desenho, 294 a 338 mil triângulos). No festival (`VILA_SO=medida`): no nascer 60 de dia e de noite, na grade no show 60; o pior caso (do meio do campo por cima dos 40) deu 44, 51 e 41 em três rodadas, com as mesmas 245 chamadas e 457 mil triângulos de antes, e a versão publicada medida no mesmo dia deu 46: o caso já ficava na beira dos 45 e oscila de rodada para rodada. Uma conta cara que entrou no meio do caminho (o `info()` do som do show chamado a cada quadro) derrubava a grade de 60 para 38 e saiu.

**As lhamas (decisão da etapa A):** a fazendinha é um **segundo cercado**, com duas lhamas dela que moram ali e não saem (a entrada é aberta para a criança entrar). As duas da f2 continuam no cercadinho da beira do campo do festival, a 25 blocos da grade: levar as lhamas da fazendinha até o show seria atravessar o parque, a avenida e o portão (uns 120 blocos, cerca-viva e alambrado no caminho), quatro vezes mais longe do que a missão que já foi acertada para uma criança de 3 anos (N5).

**Fora do pedido, e por quê:** (1) sair andando do carrossel e do bate-bate (uma criança de 3 anos não acha a roda do menu; o "Sair" da roda continua lá); (2) os sósias de longe somem para quem está a mais de 6 blocos do chão (do alto da roda-gigante o palco de longe ficava solto no ar, com o pedaço de chão dele); (3) o poste e a árvore da calçada que ficavam na frente do arco foram para o lado.

## Parte 2 (026b), o bate-bate de guiar (16 nov 2026)
O dono, depois do vídeo da etapa A: "ele não toca... não bate de fato nos carrinhos. E também é um carrinho atrás do outro, fica uma impressão de carrossel... aumentar a pista do bate-bate, deixar maior para o usuário poder guiar o carrinho e bater no outro de fato." As escolhas estão nas decisões da spec (16 nov, "o bate-bate é de guiar").

| # | Tarefa | Estado |
|---|---|---|
| B1 | **A pista maior** (`src/world/vilaParque.ts`, `PISTA_BATE`): 24 × 13 blocos por dentro, a mureta de borracha em gomos (`muretaDoBate`), as colunas a cada cinco blocos, o teto de malha e as lâmpadas na volta toda, o tapete verde da saída; seis árvores do canto saíram, os dois canteiros da calçadinha foram um bloco para o sul | feito |
| B2 | **A conta dos carrinhos** (`src/jogo/bate.ts`, pura): guiar é apontar (sem ré, vira devagar), a batida elástica com teto entre carrinhos e na mureta, encostar sem "tum", o empurrãozinho de quem ficou preso, o morador que guia (desvia de criança parada, tira o pé com alguém na frente, se afasta depois de bater numa criança), o carrinho vazio que volta para a vaga, o quadro com três casas | feito |
| B3 | **O núcleo simula** (`src/nucleo/parque.ts`, `vila.ts`): oito carrinhos a cada passo com gente a menos de 80 blocos; `guiar` com número, fila de 4 e limite de 40 por segundo; `bateDe` (quem guia a cada passo, quem olha passo sim, passo não); o evento `parqueTum` com o lugar e a força; `andou:bate` com três batidas ou vinte segundos guiando; os quatro pilotos (vila:66 a 69) postos no carrinho a cada passo. `VERSAO_REDE` 12 | feito |
| B4 | **A previsão na tela** (`src/cliente/bate.ts`): quem guia anda o carrinho na hora com a mesma conta, refaz os controles que o núcleo ainda não usou a cada quadro dele e some a diferença devagar; quem olha vê entre dois quadros | feito |
| B5 | **Na tela** (`src/render/vila/parque.ts`, `passeio.ts`, `criaturas.ts`, `cena.ts`): os carrinhos no lugar de verdade, o balanço, as estrelinhas no ponto do toque, a faísca; os pilotos sentados no carrinho que a tela mostra; a câmera atrás do carrinho (o mais longe, a haste no canto do encosto); descer no tapete verde ou pelo "Sair" da roda | feito |
| B6 | **O toque e as dicas** (`src/ui/alma/vila.ts`, `dicaToque.ts`): o dedo pega o carrinho livre mais perto; "Toque para andar", "Empurre o controle para guiar" (ou "Use W, A, S e D para guiar") e "Pare aqui para sair", as duas últimas sem a mãozinha | feito |
| B7 | **O mastro do carrossel** (`pecasParque.ts`, `passeio.ts`): o mastro 0,8 à frente do assento, o cavalinho mais comprido na frente, a alça da sela nas duas mãos | feito |
| B8 | Testes: `tests/jogo/bate.test.ts` (20), `tests/nucleo/bateNucleo.test.ts` (7), `tests/cliente/bate.test.ts` (7), e os de `parque`, `vilaParque` e `passeio` acertados; e2e `vila-bate.spec.ts` (deitado e em pé, o dedo de verdade), `vila-bate-amigos.spec.ts` (dois navegadores na nuvem), `vila-bate-provas.spec.ts` (fotos, vídeo, medidas, retratos, o mastro) | feito |

**Conferido (16 nov 2026, placa de vídeo):** tsc limpo; Vitest 2003 de 2003 (192 arquivos); paridade 36 de 36 de primeira; e2e menu-roda 5, vila-bate 2, vila-bate-amigos 1, vila-dica-toque 2, vila-neon 5 (o "f2 em pé" não achou a festa em 40 s na rodada de vinte testes seguidos e passou sozinho em seguida, como já oscilava), vila-parque 2, vila-patins 3. Nos dois navegadores, o maior acerto da previsão foi de 0,02 bloco.

**Medidas do celular** (em pé, `BATE_SO=medida`): na pista, olhando da ponta do caminho, do canto e guiando no meio, de dia e de noite: 60 quadros nas seis (133 a 219 chamadas de desenho, 277 a 457 mil triângulos; a lógica do quadro, 0,7 a 0,8 ms). O que o bate-bate novo custa nas vistas do parque da etapa A (três rodadas): 165 a 197 chamadas (eram 123 a 166) e 310 a 429 mil triângulos (eram 294 a 338 mil); 60 quadros de dia; de noite, na entrada 56, 60 e 58 e no passeio 60, 59 e 58 (eram 60). O pior caso do festival não mudou: 245 chamadas, 454 mil triângulos, 48 quadros.

**Cortado, e por quê:** (1) o toque na tela dentro do carrinho não faz nada (a buzina pedia um som novo bem acabado); (2) o ronco do motor do carrinho (a mesma razão); (3) o boneco não balança junto com o carrinho na batida (só o carrinho balança).

**Os acertos da câmera e das hastes (16 nov 2026, noite, depois de o dono andar no parque; publicados com a `VERSAO_REDE` 12):**
- `77cd530`: no bate-bate, a haste do carrinho de quem guia não é desenhada (a câmera vai atrás dele); a de um carrinho a menos de uns 3,4 blocos da câmera afina até sumir; as lâmpadas do carrossel a menos de 3 blocos da câmera encolhem até sumir (de perto o cubinho aceso virava uma bola amarela na tela); a câmera do bate-bate olha um pouco mais de cima.
- `1fce97d`: no carrossel, a câmera vai junto do cavalinho, atrás e do lado de fora (a 6,8 blocos do meio, fora do toldo, baixa o bastante para ver por baixo da barra); antes ficava parada no mundo e, uma vez por volta, atravessava a coluna do meio. Se a criança arrasta o dedo, a câmera é dela (volta a seguir depois de 2,5 s) e, colada na coluna, a coluna some.

## Parte 2 (026b), etapa B: as missões do parque e os toques da Rua anos 80 (17 nov 2026)
O dono escolheu as quatro missões; as escolhas de quem implementou estão nas decisões da spec (17 nov).

| # | Tarefa | Estado |
|---|---|---|
| E1 | **As regras, puras** (`src/jogo/missoesParque.ts`): os ids `f5` a `f8`, os carimbos do bilhete e os passos da prenda (os "lugares" de cada missão), as chaves `pegou:balao` e `lanche:feno`, os alcances, o lugar de cada balão fugido (o do carrossel gira com o toldo, no relógio do mundo) e de onde a criança o alcança; as quatro missões em `alma.ts` (5 + 4 + 4 + 5 = 18 moedinhas; o mundo dá 33) | feito |
| E2 | **O núcleo** (`src/nucleo/vilaMissoes.ts`, `vila.ts`, `nucleo.ts`): o passeio inteiro carimba o bilhete de quem tem a f5 aberta; o toque no balão (missão aberta, alcance, no chão) conta e, no terceiro, o balão de presente (salvo com o mundo, até 64 crianças); o feno do fardo e o cocho (as duas lhamas da fazendinha vêm comer e pulam); a argola e a pescaria (sempre acerta), a pelúcia na mão e a entrega à vovó (é só chegar perto, com ou sem a pelúcia); a fita (uma) e a vitamina (até duas) da rua; cada criança com o progresso dela. O comando `vila` ganhou `balao`, `prenda`, `feno`, `cocho`, `fita` e `vitamina` (saneados); `VERSAO_REDE` 13 | feito |
| E3 | **A vovó** (`povoado.ts`, `vilaNeon.ts`): Vó Zezé, boneca de verdade (coque grisalho, óculos redondos, casaquinho lilás, saia comprida e avental), o morador 70 com o posto `avo` no portãozinho aberto da Casa anos 80, de frente para a calçada (na porta, o muro baixo do quintal tapava a cena); depois da entrega ela fica com a pelúcia nos braços; a parte 3 muda só o posto | feito |
| E4 | **A trilha do guia** (`src/jogo/guia.ts`): o brinquedo sem carimbo mais perto, o balão mais perto ainda preso, o fardo ou o cocho (com o feno na mão), a barraca mais perto e, com as duas, a vovó; a placa de cada lugar com o desenho dele | feito |
| E5 | **Na tela** (`src/render/vila/missoesParque.ts`, `cena.ts`): os três balões fugidos (vermelho, amarelo e azul, o balão facetado do maço da Dona Flor) só para quem tem a missão aberta; o balão que desce até a mão e volta para a Dona Flor, que acena; o balão de presente na mão (cópias finas: oito crianças, duas chamadas); o feno no cocho; a pelúcia que voa da barraca para a mão; os corações em volta da vovó, que comemora; os itens na mão (`itensBrinquedo.ts`) | feito |
| E6 | **Os desenhos** (`src/ui/alma/arteVila.ts`): os cartões das quatro missões (o bilhete com os carimbos, o balão preso na árvore, o cocho e a lhama comendo, a pelúcia e a vovó com a prenda), as bolinhas de cada lugar e as figuras das dicas de toque | feito |
| E7 | **O toque e as dicas** (`src/ui/alma/vila.ts`, `revista.ts`): o balão, o fardo, o cocho e as barracas respondem assim que o dedo desce; os da rua, só com o toque de verdade (arrastar por cima é da câmera); a dica de cada um ("Toque para pegar", "Toque para dar", "Toque para jogar", "Toque para pescar", "Toque para ligar", "Toque para pedir", "Toque para ver"); a revista da banca (quatro capas inventadas, sem nenhuma letra, um toque fecha); o que chega na mão aparece com o "pop" e já selecionado | feito |
| E8 | **Os sons, feitos na hora** (`src/audio/somRua.ts`, `vozBoba.ts`): o trim-trim do orelhão e a voz boba (seis falas por três formantes, na faixa de telefone, nunca a mesma duas vezes seguidas), a campainha, a fita, o liquidificador, a revista, o balão que desce e o de presente, o carimbo, o feno, o cocho, a lhama feliz, a prenda e a vovó; na régua da 019, nada novo no pacote | feito |
| E9 | Testes: `tests/nucleo/vilaMissoes.test.ts`, `tests/jogo/guiaVila.test.ts` (a trilha chega a cada lugar), `tests/render/missoesParque.test.ts`, `tests/ui/arteMissoes.test.ts`, `tests/audio/somRua.test.ts`; e2e `vila-missoes.spec.ts` (as quatro missões do "brincar" à festa, deitado e em pé, o dedo de verdade e as moedinhas de verdade) e `vila-rua.spec.ts` (os toques da rua, deitado e em pé) | feito |
| E10 | **A revisão das fotos** (de dia e de noite em pé, de dia deitado; uma rodada minha e uma de um revisor que só viu as fotos): a dica de toque longe do joystick e dos botões; o boneco meio transparente quando a coisa da dica fica atrás dele; a cadeirinha mais perto do dedo ganha do balão preso no pé da roda; a trilha do feno, do cocho e dos balões da árvore e da roda acaba a uns três blocos (de perto a coisa ficava atrás do boneco, e deitado a dica não vinha); as lhamas param com a cabeça em cima do cocho e soltam coraçõezinhos; a festa do balão, do lanche e da prenda espera o fim no mundo; o balão na mão puxa para o lado de fora da tela, com o fio fino (nunca cruza a cabeça); a vovó no portãozinho, com a pelúcia nos braços depois da entrega e seis corações (eram doze); as luzinhas da trilha encolhem coladas na câmera (viravam uma bola verde enorme); a mãozinha da dica do balão toca embaixo dele; o espaço da barra acende sem repetir o nome do item | feito |

**Conferido (17 nov 2026, placa de vídeo):** tsc limpo; Vitest 2046 de 2046 (196 arquivos); paridade 36 de 36 de primeira; e2e vila-missoes 4 de 4 de dia (em pé e deitado, as quatro missões, as moedinhas de verdade) e 2 de 2 de noite (em pé), vila-rua 2 de 2 de dia e 1 de 1 de noite; vila-neon 5, vila-parque 2, vila-bate 2, vila-bate-amigos 1, vila-dica-toque 2, vila-patins 3, menu-roda 5, convite-feitas 4, alma 5, guia-missao. Na rodada de 34 testes seguidos, o "f2 em pé" do vila-neon (de antes, já oscilava) e o baú do alma (a máquina ocupada: o botão pulsando não ficou "parado" para o toque) falharam e passaram sozinhos em seguida; o balão deitado também, uma vez (o guia sem alvo por 20 s), e passou na seguinte.

**Medidas do celular** (17 nov 2026, em pé, `PARQUE_SO=medida`, com a f5 e a f6 abertas, os balões fugidos à vista): 60 quadros nas seis vistas do parque (entrada, passeio e alto da roda, de dia e de noite), 142 a 191 chamadas de desenho, 319 a 422 mil triângulos. O festival (`VILA_SO=medida`): no nascer 60 de dia e de noite, na grade no show 60, o pior caso (do meio do campo por cima dos 40) 53 com 245 chamadas e 456 mil triângulos (antes 46 a 48).

**Cortado, e por quê:** o letreiro que pisca ao toque (os letreiros são luz assada na malha do pedaço); o orelhão, a bicicleta e o liquidificador não se mexem (também da malha): respondem com o som e os risquinhos de "trim".

Medidas (16 nov 2026, celular em pé, placa de vídeo, `VILA_SO=medida`, com os 40 no lugar): na grade no meio do show, 131 chamadas de desenho, 321 mil triângulos, 60 quadros; do meio do campo olhando o palco por cima do público (o pior caso), 232 chamadas, 436 mil triângulos, 48 quadros (o teste pede 45). Com os 40 e o boneco de antes eram 371 chamadas, 607 mil triângulos e 36 quadros; com o esqueleto, 229 chamadas e 45 a 52 quadros; com as bolinhas pequenas de menos gomos, 48. Paridade 36 de 36 (os dois casos de clima da bruma-e-luz falharam no `dia` com a máquina carregada e passaram sozinhos). Vitest 1820 de 1820. e2e: vila-neon 5 de 5 (f4 deitado em 49 s, as três missões 17 moedinhas), vila-show-camera 2, vila-colisao, vila-neon-campo 2, vila-neon-noite (dia e noite) 1.
