# 034 Menos é mais: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit `tipo(034-menos-e-mais): ...` e fotos em `capturas-034/` quando há o que ver.

Na nuvem (Claude Code na web), o e2e roda com `E2E_CHROMIUM=/opt/pw-browsers/chromium npx playwright test <arquivo> --workers 2 --trace off`.

## Fase 0: as provas, no código de antes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T00 | **Antes de qualquer outra mudança** (spec, "O que muda", seção 0):<br>- `tests/temas/paridade-cinco.test.ts` com os hashes dos cinco (atlas; terreno com povoados em 3 sementes; criaturas, movimento, vozes, povoado, céu e mundo);<br>- o hash do canto do Doce;<br>- a paridade e2e com o Rancho no lugar do Bruma, gravada e conferida 36/36;<br>- as fotos de antes do nascer dos cinco;<br>- commit só disso. | M |
| T01 | ~~O painel de medida da janela~~: feita (65c6e2d) e desfeita quando a faixa azul saiu da spec (dono, 19 nov). | — |

## Fase 1: quatro mundos saem, a base fica
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T02 | **A base:**<br>- `src/temas/base/` com `temaBase()` completo e neutro, mais `corpoDeMorador` e `naCabeca`;<br>- os povoados importam dali;<br>- o resto da base fica onde está, com os comentários trocados;<br>- `paridade-bruma` vira `paridade-base`, com os mesmos hashes. | M |
| T03 | **Os cinco temas:**<br>- `IdTema` com os cinco e `TEMA_PADRAO = 'vila-neon'`;<br>- `obterTema` cai na base;<br>- a ordem explícita dos cartões;<br>- "Meu primeiro mundo" e todo mundo novo com o tema gravado;<br>- as reservas `?? 'bruma-e-luz'` saem. | P |
| T04 | **Sai o que é só dos quatro** (a lista da spec, completada pela busca):<br>- pastas, formas e listas do saneamento, segundo sol;<br>- a alma (d1 a d3, banca, chaves de XP, `mundoAlmaDoEstilo`, habilidades);<br>- o ramo `'dinos'` do canto, sem tocar no Doce nem no caminho do e2;<br>- fantasias, peças e desenhos;<br>- nomes, `DO_TEMA`, `NOMES_TEMAS` e os níveis de som;<br>- o gemido do espectro;<br>- os pacotes de som, o índice recalculado e os 16 créditos (mais o teste "todo som tem crédito");<br>- as prévias e a imagem de compartilhar (fica para a T09).<br><br>Os hashes da T00 continuam iguais. | G |
| T05 | **Textos e rastros:**<br>- nenhum texto com "bruma" ou com os nomes dos quatro nos cinco (teste por tema);<br>- a limpeza das chaves do aparelho e a regravação de `terrario:aparencia` e `terrario:trilha-saida`;<br>- testes de cada limpeza;<br>- moedinhas, XP e nível ficam. | P |
| T06 | **Testes de unidade e docs:**<br>- os testes de unidade que usavam os quatro, adaptados sem perder o que protegem;<br>- servidor e scripts (`salas.test.ts`, `carga.mjs`, `escuta-temas`, `vitrine-*`);<br>- `README.md`, `ARCHITECTURE.md` e `e2e/paridade/LEIAME.md`. | M |

## Fase 2: os mundos salvos
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T07 | **No aparelho:**<br>- a limpeza depois de `prepararFormato`, primeiro o índice e depois os dados;<br>- o tema desconhecido fica;<br>- o mundo aberto que saiu dá lugar ao próximo;<br>- testes com armazém em memória. | P |
| T08 | **Na nuvem:**<br>- `Armazem` lista mundos e salas e apaga a pasta do mundo (Azure e memória);<br>- a varredura pelos mundos depois do `listen`, e de novo em ~10 min;<br>- a remoção na leitura;<br>- o log sem nome;<br>- `recusar('versao')` para tema removido;<br>- `VERSAO_REDE` 17;<br>- os testes da seção 2.<br><br>**Investigar:** as memórias de `encontrarNascimento` e dos planos de povoado são chaveadas só pela semente. No servidor, que abre mundos de temas diferentes no mesmo processo, dois mundos com a mesma semente (ex.: 1337) e temas diferentes podem trocar de plano. Se for verdade, a chave passa a levar o tema, com teste. | M |

## Fase 3: prévias e ícones
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T09 | **Prévias:**<br>- o roteiro cobre todos os temas, com enquadramento por tema;<br>- a Vila Neon nova, a Lua e o Rancho refeitos;<br>- a Cidade e o Doce conferidos;<br>- a imagem de compartilhar;<br>- o teste "todo tema tem prévia";<br>- fotos do cartão nos três tamanhos. | M |
| T10 | **Ícones dos gestos, a folha:** as direções A e B com o boneco do jogo, os 11 gestos e a carinha, no tamanho real da roleta e do balão.<br><br>**Para aqui:** o orquestrador leva ao dono. | M |
| T11 | **Ícones dos gestos, a escolhida:** no jogo, na roleta, no balão e nas carinhas, em pé e deitado; os e2e de gestos e da roleta passando. | M |

## Fase 4: a faixa azul do iPhone
Saiu da spec (dono, 19 nov): vai com a casca nativa (020). A T12 não existe mais.

## Fase 5: os testes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T13 | **Os e2e que dependiam dos quatro:**<br>- rodar todos;<br>- os que caírem pela troca para a Vila Neon recebem o tema que faz sentido, escrito no teste;<br>- `e2e/temas.ts`, `temas.spec.ts`, `alma.spec.ts`, `roleta-mundos`, `fantasias-aba`, `capturas-fantasias`, os palcos de achar-amigo, `missoes-dinos-doce` (a parte do Doce) e os outros da lista do mapa. | G |
| T14 | **Os que já falhavam e os instáveis:** a causa de cada um e o conserto (do jogo ou do teste, dito no registro); 3 rodadas seguidas verdes. | M |
| T15 | **Nada voltou para trás:**<br>- Vitest inteiro;<br>- `npm run build`;<br>- os hashes da T00;<br>- paridade 36/36;<br>- o e2e inteiro em pedaços de 2 trabalhadores;<br>- a busca no `dist/`;<br>- as fotos de depois contra as de antes. | M |

## Fase 6: acabamento e publicação
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T16 | **Portão visual:**<br>- a escolha de mundos e os gestos, em pé de dia e de noite, e deitado;<br>- autocrítica e refazer;<br>- o revisor novo só com as fotos;<br>- acertos. | M |
| T17 | **Publicar:**<br>- push na `main` e cancelar na hora a execução de `publicar.yml`;<br>- disparar `servidor.yml` com `agora: true`;<br>- a revisão nova de pé e o log da varredura;<br>- disparar `publicar.yml` de novo;<br>- conferir no ar;<br>- o relatório para o dono e a Situação aqui. | P |

**Ordem:** T00 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 (o dono escolhe) → T11 → T13 → T14 → T15 → T16 → T17.

## Situação
- **(19 nov 2026) Spec aprovada.** O revisor aprovou com ajustes; os ajustes entraram (ver "Revisão da spec") e ele conferiu a versão final.
- **Linha de base nesta máquina** (nuvem, sem placa de vídeo):
  - Vitest: 204 arquivos, 2044 de 2044;
  - os e2e precisam de `E2E_CHROMIUM`; `fumaca` passa 3 de 3.
- **(20 nov 2026) T00 feita** (501f256, f0a26d8, a65117b):
  - hashes dos cinco (atlas, terreno com povoados em 3 sementes, plano urbano e metas, sons, dados e resto do tema) e do canto do Doce;
  - fotos de antes com `escala=1`.
  - A paridade agora é Rancho + Doce, 36/36 conferida duas vezes nesta máquina.
  - Na nuvem a paridade não fechava com tema nenhum: a saturação caía 5→4 conforme a duração em tempo real, a ~1 FPS. O atalho de teste `relogioCansa` desliga só o cansaço do relógio durante a paridade; o servidor de produção não aceita `depurar`. A queda pela exaustão ficou coberta por testes de unidade.
  - O roteiro da raposa na paridade estava errado: ela é curiosa e para a ~2,75 blocos, e o jogador ficava a 1,6.
- **T01 feita e desfeita** (65c6e2d, 947ba23): a faixa azul saiu da spec.
