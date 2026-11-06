---
id: 006-expansao
title: 'Brumaluz: expansão de funcionalidades (salvamento, inventário, crafting, biomas, criaturas, clima e mais)'
status: COMPLETED
base_branch: main
branch: feat/expansao
created_at: 2026-11-06T03:30:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
environment: docker
full_test_command: npx vitest run && npx playwright test
install_command: npm ci --no-audit --no-fund
---
## Contexto e Problema
Depois da revisão visual e sonora (commit `feat(visual)` no branch `feat/expansao`), o jogo tem visual bonito, mas poucas funcionalidades: sem salvamento do mundo, sem inventário, sem crafting, sem criaturas, sem biomas nem cavernas. O dono aprovou (2026-11-06) a lista completa de 26 itens abaixo, com modo padrão **criativo**, para implementar em sequência, com commit por funcionalidade e relatório com capturas ao final.

Regras que continuam valendo: identidade própria (nada de nomes, criaturas, arte ou música do Minecraft), arte e som 100% por código, lógica pura testável em Vitest, Babylon só em `src/render/`, `Math.random` proibido em lógica testável (gerador com semente), interface em pt-BR, UX e UI caprichadas.

## Ordem de execução (dependências primeiro)
| # | Tarefa | Item da lista |
|---|---|---|
| T01 | Salvamento do mundo (IndexedDB), vários mundos, semente, menu inicial | 1, 26 |
| T02 | Inventário com itens, coleta com drops, UI de inventário | 2 |
| T03 | Menu de pausa e configurações (áudio, controles, gráficos) | 3 |
| T04 | Modos criativo (voo) e sobrevivência (vida, fome, queda, afogamento) | 4 |
| T05 | Atlas 8x8 e registro de blocos ampliado (minérios, decorativos, utilitários) | base de 6, 7, 9, 12 |
| T06 | Iluminação por blocos (luz do céu e de tochas, cristais e lanternas) | 7 |
| T07 | Mundo com 128 de altura, cavernas e minérios | 6 |
| T08 | Crafting com mesa 3x3 e livro de receitas com busca | 10 |
| T09 | Ferramentas por nível com durabilidade e velocidade de mineração | 11 |
| T10 | Biomas (floresta, campos, deserto, taiga nevada, montanhas, pântano bioluminescente) | 5 |
| T11 | Árvores variadas e estruturas com baú | 9 |
| T12 | Água: nadar, câmera submersa | 8 |
| T13 | Blocos utilitários: fornalha, baú, porta, escada, laje, cerca, cama | 12 |
| T14 | Comida: frutas, cogumelos, cozinhar | 13 |
| T15 | Animais passivos originais | 14 |
| T16 | Criaturas noturnas hostis e combate | 15 |
| T17 | Companheiro raposa-lume | 16 |
| T18 | Clima dinâmico (chuva, tempestade, neve, neblina, arco-íris) | 17 |
| T19 | Estações do ano | 18 |
| T20 | Construção assistida (prévia fantasma, desfazer/refazer, preencher, espelho, blueprints) | 19 |
| T21 | Modo foto | 20 |
| T22 | Minimapa, mapa do mundo, marcadores e bússola | 21 |
| T23 | Diário com missões leves e conquistas | 22 |
| T24 | Música adaptativa | 23 |
| T25 | Touch, gamepad e acessibilidade | 24 |
| T26 | Extras gráficos (folhas balançando, god rays, mais distância) | 25 |

Cada tarefa: implementação, testes unitários de lógica pura, typecheck, build, captura de tela no container e commit próprio. O andamento fica em `tasks/` e o resultado final em `report.md`.
