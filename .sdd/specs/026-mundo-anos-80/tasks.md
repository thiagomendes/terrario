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
