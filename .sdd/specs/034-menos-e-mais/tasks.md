# 034 Menos é mais: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit `tipo(034-menos-e-mais): ...` e fotos em `capturas-034/` quando há o que ver.

Na nuvem (Claude Code na web), o e2e roda com `E2E_CHROMIUM=/opt/pw-browsers/chromium npx playwright test <arquivo> --workers 2 --trace off`.

## Fase 0: antes de mexer
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T00 | **Paridade nova gravada no código de antes:**<br>- escolher o tema que substitui o Bruma nas 18 sessões (Rancho Alegre, se tiver raposa e o que as sessões usam);<br>- trocar só o tema em `e2e/paridade.spec.ts` e gravar (`PARIDADE=gravar`) ainda sem nenhuma outra mudança;<br>- conferir 36/36;<br>- commit só disso.<br><br>**Fotos de antes:** o nascer de cada um dos cinco mundos que ficam, a 390×844 e a 1280×720, em `capturas-034/antes/`. | P |

## Fase 1: quatro mundos saem, a base fica
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T01 | **A base com nome de base:**<br>- `temaBase` e o tema neutro de antes da ativação vão para `src/temas/base/`;<br>- os ajudantes de morador (`corpoDeMorador`, `naCabeca`) vão para um módulo comum;<br>- os povoados importam dali.<br><br>Os hashes dos cinco que ficam não mudam; o teste do Bruma vira o da base. | M |
| T02 | **`IdTema` com os cinco:**<br>- `TEMA_PADRAO = 'vila-neon'`;<br>- ordem explícita dos cartões;<br>- "Meu primeiro mundo" e todo mundo novo com o tema gravado;<br>- as reservas `?? 'bruma-e-luz'` saem. | P |
| T03 | **Sai o que é só dos quatro:**<br>- as pastas;<br>- as formas de mundo e o saneamento;<br>- o segundo sol;<br>- a alma: d1 a d3, a banca, o canto do ninho, as chaves de XP, `mundoAlmaDoEstilo` e as habilidades;<br>- as fantasias, as peças e os desenhos delas;<br>- nomes, `DO_TEMA`, `NOMES_TEMAS`, os níveis de som, os pacotes de som, o índice e os créditos;<br>- as prévias.<br><br>O Doce Reino com as missões e o canto iguais. | G |
| T04 | **Sem rastro:**<br>- limpeza das chaves do aparelho com ids de fantasia ou mundo removidos;<br>- testes de cada limpeza;<br>- conferir que a fantasia vestida e o baú já caem sozinhos (teste). | P |
| T05 | **Os testes de unidade** que usavam os quatro: adaptar mantendo o que protegem (a Mata como "sem missões" vira a Lua etc.).<br><br>Docs: `README.md`, `ARCHITECTURE.md`, `e2e/paridade/LEIAME.md`. | M |

## Fase 2: os mundos salvos
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T06 | **No aparelho:**<br>- a limpeza na abertura (tema removido ou sem tema; a entrada da nuvem com tema removido), idempotente;<br>- o mundo aberto que sumiu dá lugar ao próximo;<br>- testes com armazém em memória (nove temas, sem tema, nuvem). | P |
| T07 | **Na nuvem:**<br>- `Armazem` lista salas e mundos (Azure e memória);<br>- a varredura ao subir, só com o tema gravado exatamente igual a um dos quatro, apagando a pasta do mundo e as salas dele, com o log;<br>- o servidor não abre nem grava mundo de tema removido;<br>- criar só aceita os cinco;<br>- `VERSAO_REDE` 17;<br>- os testes de "O que muda", seção 2. | M |

## Fase 3: prévias e ícones
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T08 | **Prévias:**<br>- `capturas-temas.spec.ts` cobre todos os temas, com o enquadramento de cada um;<br>- a Vila Neon nova, a Lua e o Rancho refeitos;<br>- a Cidade e o Doce conferidos;<br>- o teste de unidade "todo tema tem prévia";<br>- fotos do cartão nos três tamanhos. | M |
| T09 | **Ícones dos gestos, a folha:** as duas direções (A: SVG novo; B: foto do boneco), os 11 gestos e a carinha, no tamanho real da roleta e do balão, em `capturas-034/gestos/`.<br><br>**Para aqui:** o orquestrador leva ao dono. | M |
| T10 | **Ícones dos gestos, a escolhida:** no jogo; a roleta de Gestos e o balão em pé e deitado; os e2e de gestos e da roleta passando. | P |

## Fase 4: a faixa azul do iPhone
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T11 | **Causa e correção:**<br>- o jogo cobre a área segura de baixo, com os botões dentro dela;<br>- o teste e2e da área segura;<br>- as fotos de antes e depois nos três tamanhos, iguais. | P |

## Fase 5: os testes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T12 | **Os e2e que dependiam do Bruma:**<br>- rodar todos;<br>- os que caírem pela troca para a Vila Neon recebem o tema que faz sentido para o que protegem, escrito no teste;<br>- `e2e/temas.ts`, `temas.spec.ts`, `alma.spec.ts`, `roleta-mundos`, `fantasias-aba`, `capturas-fantasias`, os palcos de achar-amigo (fantasia `dino`) e os outros da lista do mapa. | G |
| T13 | **Os que já falhavam e os instáveis:**<br>- causa de cada um e conserto (do jogo ou do teste, dito no registro);<br>- 3 rodadas seguidas verdes cada. | M |
| T14 | **Nada voltou para trás:**<br>- Vitest inteiro;<br>- `npm run build`;<br>- paridade 36/36 contra a gravação da T00;<br>- o e2e inteiro em pedaços de 2 trabalhadores;<br>- a busca no `dist/` pelos nomes dos quatro;<br>- as fotos de depois do nascer dos cinco contra as de antes. | M |

## Fase 6: acabamento
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T15 | **Portão visual:**<br>- a escolha de mundos (cartões e prévias), os gestos e o iPhone, em pé de dia e de noite, e deitado;<br>- autocrítica e refazer;<br>- o revisor novo só com as fotos;<br>- acertos. | M |
| T16 | **Relatório para o dono e a Situação aqui.** | P |

**Ordem:** T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 (o dono escolhe) → T11 → T10 → T12 → T13 → T14 → T15 → T16.

## Situação
- (19 nov 2026) Spec escrita; em revisão.
- Linha de base nesta máquina (nuvem, sem placa de vídeo):
  - Vitest 204 arquivos, 2044 de 2044;
  - os e2e precisam de `E2E_CHROMIUM` (o Chromium do Playwright 1.48 não vem no ambiente).
