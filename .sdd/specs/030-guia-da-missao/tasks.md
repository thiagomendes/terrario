# 030 Guia da missão: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez (pesa no computador do dono). Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit e uma captura em `scratchpad/030impl/`.

## Fase 1: a trilha, a placa e o canto (o que aparece na tela)
| # | Tarefa | Tamanho |
|---|---|---|
| T01 | **Peça pura** `src/jogo/guia.ts`: `alvoDaMissao` (cidade e sítio, alvo mantido até acabar), trilha nos pés (ligação), pegadas, alisamento no sítio (sem roça, sem raspar na cerca), a ondinha, o relógio do convite; testes de unidade | M |
| T02 | **Desenho** `src/render/guiaMissao.ts`: pegadas (2 chamadas, borda clara e escura), placa do alvo, brilho no chão; busca em fatias; virada macia só sem dedo na câmera | M |
| T03 | **Canto e roda:** a estrela e o selinho (sem o cartão), o convite do baú com "?", "Missões" e "Baú" na roda, o quadro nunca abre sozinho; c3 com o desenho do passeio; pedreiro fora do tapume | M |
| T04 | **Parada para revisão:** capturas no celular deitado e em pé, na Cidade e no Rancho | P |

## Fase 2: chegar, o ✓ e as moedinhas
| # | Tarefa | Tamanho |
|---|---|---|
| T05 | **Chegar:** brilho no lugar e o som da chegada pelo motor de som (segue volume e mudo); ✓ pelo evento `alma` do núcleo (todo tipo); a trilha pula para o próximo lugar do passeio | M |
| T06 | **Mãozinha da obra:** só a camada de baixo, só onde o raio do dedo pega o bloco; volta com calma depois de ~8 s parada | P |
| T07 | **Moedinhas:** na festa, voam do lugar para o canto, que abre de lado e conta | P |
| T08 | **c5 e Rancho:** a padeira para e espera, a placa na cabeça dela, refaz só depois de 4 blocos; alvos do sítio em jogo de verdade | M |

## Fase 3: testes de tela, vídeos e fechamento
| # | Tarefa | Tamanho |
|---|---|---|
| T09 | **Testes de tela** (`e2e/guia-missao.spec.ts`): c3 inteira, c6 com 2 blocos na mãozinha, r1 no Rancho, nada abre ao entrar, convite, selinho, 300 ms, caixas nas três telas, amigos; `alma.spec.ts` e `passeio-c3.spec.ts` com o selinho no lugar do cartão | M |
| T10 | **Fechamento:** paridade 36 de 36, suíte inteira, build; vídeo de ~1 min no celular deitado com som (c3) e um no Rancho; relatório visual | M |

**Ordem:** T01 → T02 → T03 → T04 (parada) → T05 → T06 → T07 → T08 → T09 → T10.
