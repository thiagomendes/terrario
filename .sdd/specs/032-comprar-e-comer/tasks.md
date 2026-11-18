# 032 Comprar e comer: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez (pesa no computador do dono). Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit e capturas em `scratchpad/032impl/`.

## Fase 1: o núcleo e a rede
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T01 | **Regras puras** `src/jogo/compra.ts`: as barracas e os lanches, o pagamento isolado (`PAGAMENTO`, `pagar`), o tempo da entrega, o máximo por lanche, o lugar na barrinha (`lugarNaBarra`); `src/jogo/refeicao.ts`: o jeito de cada comida e os tempos das mordidas; testes | P |
| T02 | **Item novo** `algodao_doce` (só da Vila): catálogo, desenho 16×16, nome no tema | P |
| T03 | **Núcleo:** o comando `vila` `comprar` (alcance, uma por vez, os 3, a barrinha), a entrega na hora certa, o evento `vilaCompra`; a Dona Cida (`vila:73`, posto `pracinha`); as trocas de comida "de graça" saem | M |
| T04 | **Núcleo:** comer no criativo e de barriga cheia, uma refeição por vez, o `come` no jogador visto; `VERSAO_REDE` 16; saneamento; testes | P |

## Fase 2: o comer na tela (todos os mundos)
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T05 | **A comida mordida** `src/render/refeicao.ts`: o modelo da comida em quatro estados por jeito (recorte de mordida, pipocas, nível do copo, tufos), feito uma vez e guardado; migalhas e gotinhas; corações | G |
| T06 | **O boneco come:** a pose de 2,6 s (leva, três "nhacs", desce), os olhos sorrindo, a comida na frente da boca; o mesmo para os amigos (`come`) | M |
| T07 | **Sons** por jeito: mordida, pipoca, canudinho, colherada, nuvem | P |
| T08 | **Toque e dica:** tocar com comida come (criativo e sobrevivência); a dica "Toque para comer" na comida da mão; a dica de texto antiga sai do toque | P |

## Fase 3: comprar na Vila
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T09 | **Toques das barracas** (`ui/alma/vila.ts`): os três lanches da Bia, a lanchonete, os dois carrinhos de pipoca e o algodão-doce; "Toque para comprar"; os desenhos das dicas | M |
| T10 | **A entrega na tela:** a fichinha, o preparo de cada barraca, a vendedora com o lanche na mão e o braço esticado, o pulinho até a mão, o aceno; a barrinha cheia | G |
| T11 | **Parada para revisão:** fotos de cada barraca antes, no meio e depois, de cada comida na mão e de cada mordida; aperitivo e vídeo curto para o dono | P |

## Fase 4: fechamento
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T12 | **Testes de tela** `e2e/comprar-comer.spec.ts`: comprar cada lanche com o dedo (em pé e deitado), comer no criativo e na sobrevivência (a fome sobe), dois jogadores (um vê o outro comer), barrinha cheia | M |
| T13 | **Nada voltou para trás:** a bateria da Vila, alma, guia-missao, menu-roda, convite-feitas, o que come e a sobrevivência; paridade 36/36; Vitest inteiro; medida de quadros no celular | M |
| T14 | **Portão visual:** fotos dia/noite em pé e uma deitado, autocrítica, refazer, revisor novo só com as fotos, acertos | M |

**Ordem:** T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 (parada) → T12 → T13 → T14.

## Situação
- (18 nov 2026) Spec escrita; fases 1 a 3 feitas (núcleo, rede 16, o comer em todo mundo, as barracas da Vila). Portão visual e bateria em curso.
