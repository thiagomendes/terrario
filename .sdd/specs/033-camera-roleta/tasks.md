# 033 Câmera do celular e roleta do menu: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez (pesa no computador do dono). Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit e capturas em `scratchpad/033impl/`.

## Fase 1: o esboço vira o jogo
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T01 | **Câmera:** `ZOOM_TOQUE_EM_PE` (5,06) e `ZOOM_TOQUE_DEITADO` (4,75), `zoomInicialToque`; a cena começa com a da tela e troca ao virar (se a pinça não mexeu); `preverToque` para os testes; sem `?esboco=033` | P |
| T02 | **Roleta:** `src/ui/roleta.ts` sem as variantes do esboço (lugar, tamanho, vizinho); a lista inteira em `data-itens`; o toque que escolhe sem clique fantasma; a rodinha que não mexe na câmera; o piparote só com o dedo em movimento | M |
| T03 | **Menu:** `menuRoda.ts` com a roleta; o pai de Gestos na plaquinha; `roda.ts` só com os tipos e as teclas (a roda em volta do boneco sai); `.roleta` nos toques generosos da alma | P |
| T04 | **Sem esboço:** `src/esboco/*033*` e a bandeira saem; as medidas do esboço viram `e2e/medidas-033-*.spec.ts` (fora da suíte) | P |

## Fase 2: os testes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T05 | **Ajudante** `e2e/roleta-palco.ts` (abrir, rolar até um item tocando no vizinho, tocar no meio, a plaquinha, pelo teclado); todos os testes que abriam a roda passam para a roleta | M |
| T06 | **Testes novos:** `e2e/roleta.spec.ts` (o dedo em pé e deitado; a câmera do começo e a pinça), `e2e/roleta-mundos.spec.ts` (cada mundo, cada item alcançado), o computador em `e2e/menu-roda.spec.ts` (mouse, rodinha, setas, Enter, Esc), "nada encosta" em `e2e/vila-patins.spec.ts` | M |
| T07 | **Nada voltou para trás:** Vitest inteiro, paridade 36/36, a suíte e2e inteira em pedaços de até 2 trabalhadores, a criança simulada da 022 e os quadros no celular | M |

## Fase 3: acabamento
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T08 | **Portão visual:** fotos em pé de dia e de noite e deitado, em 4 mundos (Vila Neon com o item do mundo), fechada, aberta, no arraste, Gestos, Voltar e Fechar, a câmera do começo; autocrítica, refazer, revisor novo só com as fotos, acertos | M |
| T09 | **Vídeo** de 30 quadros constantes para o dono; relatório | P |

**Ordem:** T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09.

## Situação
- (18 nov 2026) Em andamento.
