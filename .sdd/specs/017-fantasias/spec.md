---
id: 017-fantasias
title: 'Fantasias prontas: princesas, heróis e fantasias dos temas'
status: IN_PROGRESS
base_branch: main
branch: feat/fantasias
created_at: 2026-11-10T16:00:00Z
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
full_test_command: npx vitest run && scripts/e2e-gpu.sh
install_command: npm ci --no-audit --no-fund
---
## Contexto
Pedido dos filhos do dono (10 nov 2026): a filha (3 anos) quer roupinhas de princesa; o filho (4 anos), roupas de herói. Além de personalizar peça por peça, looks prontos que vestem o boneco num toque. Esboço: `referencia/fantasias.html`, https://claude.ai/artifact/F9fUhyR1B2J5jb8QoVf6sH.

## Objetivo
- Um toque veste uma fantasia inteira (Realeza, Heróis, Dos temas), sem trocar quem o personagem é.
- Peças novas bonitas e encaixadas, que se mexem com o boneco da 015 (capa e saia balançam).
- Os amigos veem a fantasia no multijogador.
- Os enfeites de hoje (chapéus, coroa de flores, capuz...) assentam na cabeça, sem vão, em todos os modelos, corpos e cabelos.

## Fora de escopo
- Fantasias novas por conquista ou loja (todas vêm liberadas).
- Peças com física de verdade (a capa e a saia balançam por animação, sem colisão).
- Itens que as fantasias "fazem" (a varinha é de enfeite, não solta magia).

## Como no esboço
- **Aba "Fantasias"** no editor de personagem, antes das peças: Princesas (Flores, Estrelas, Mar, Neve), Heróis (Relâmpago, Estrela, Coração, Mata) e Dos temas (fazendeira e vaqueira no Rancho; astronauta, dino, confeiteira, cientista, guardiã da mata, lanterneira...). Um toque veste tudo; depois dá para trocar a cor principal e voltar a personalizar peça por peça; "Tirar fantasia" volta ao look de antes.
- **Peças novas:** saia rodada em camadas, mangas bufantes, coroa, tiara, varinha; capa que balança, máscara, emblema no peito, cinto, botas; macacão, colete com lenço, jaleco, traje espacial com capacete de bolha, capuz de dino com rabo, capa de folhas.
- **Fantasias dos temas são livres** (decisão do dono, 10 nov 2026): servem em qualquer mundo, sem amarração ao mundo, para nada precisar ser restaurado ao trocar de mundo. Ao criar um mundo, o jogo só sugere "Quer vestir a fantasia do Rancho Alegre?" (Sim ou Agora não).
- **Direitos:** nomes, cores e símbolos próprios; nada que lembre personagem de filme ou desenho conhecido (sem letra no peito, teia, morcego, vestido igual ao de filme).
- **Multijogador:** a fantasia viaja com a aparência (comando `aparencia` já existente), com saneamento.

## Capricho (pedido do dono)
- **Tudo encaixado:** chapéu, coroa, tiara, capuz e capa assentam no boneco como peça de montar, sem vão. O dono notou chapéus soltos da cabeça em alguns personagens do jogo de hoje: conferir e corrigir os acessórios atuais nesta mesma spec, com um teste que mede a distância entre cada enfeite e a cabeça (ou o corpo) em todos os modelos, corpos e cabelos.
- Peças fundidas por parte que se mexe (desempenho no celular).

## Feminino e masculino (observação do dono, 10 nov 2026)
No esboço a "Heroína Estrela" saiu com cara de menino. Regra:
- **A fantasia veste o personagem da criança**, sem trocar quem ele é: corpo, pele, rosto e cabelo continuam os dela. Uma personagem feminina de herói é uma heroína, com o cabelo dela.
- **Nomes acompanham o corpo escolhido**, como os modelos da 012 (Aventureiro/Aventureira): "Herói Relâmpago" / "Heroína Relâmpago".
- **Princesa é sempre feminina.** No corpo masculino a mesma aba mostra a versão de príncipe (casaco com faixa, capa curta e coroa, sem saia): "Príncipe das Estrelas". A aba se chama "Realeza".

## Ordem na tela (recomendação apresentada ao dono)
- Abas sempre na mesma ordem: **Realeza · Heróis · Dos temas** (criança aprende o lugar das coisas; nada muda de lugar pelo corpo escolhido).
- Em "Dos temas", o tema do mundo aberto vem primeiro.
- Ao abrir: a aba usada da última vez; vindo da sugestão de criar mundo, já abre em "Dos temas".

## Capricho na experiência (para não frustrar)
- **Vestir é instantâneo:** um toque e o boneco da prévia já aparece vestido (menos de 100 ms no computador, sem piscar).
- **Desfazer sem medo:** "Tirar fantasia" volta exatamente ao look de antes, mesmo depois de fechar e abrir o jogo.
- **Cor principal num toque:** 3 a 5 bolinhas por fantasia, combinadas de propósito (nada de cor que deixe a fantasia feia).
- **Nomes curtos e certos:** "Heroína Relâmpago" no corpo feminino, "Herói Relâmpago" no masculino; "Princesa das Estrelas" / "Príncipe das Estrelas". Sem texto difícil.
- **Festa ao vestir:** um brilho rápido e o boneco da prévia faz uma pose (comemorar) ao trocar de fantasia.
- **Nada solto e nada atravessando:** capa e saia não entram nas pernas correndo, pulando, sentando ou nos 8 gestos; capacete de bolha não corta o cabelo volumoso (o cabelo é escondido ou achatado por baixo, como no capuz).
- **Medido:** 60 fps no computador e pelo menos 45 com CPU 4× mais lenta, com 4 amigos fantasiados (capa e saia) na tela; trocar de fantasia não cria malhas novas a cada quadro.
- **Revisão jogando de verdade** antes de fechar, no computador e no celular, comparando com o esboço.

## Critérios de qualidade (definição de pronto)
1. Aba Fantasias no editor como no esboço aprovado, nas três abas na ordem fixa; vestir, trocar a cor, personalizar peça por peça e "Tirar fantasia" funcionam e são salvos.
2. Fantasia veste o personagem da criança (corpo, pele, rosto e cabelo dela); nomes pelo corpo; Realeza com príncipe no corpo masculino.
3. Todas as peças novas encaixadas, fundidas por parte que se mexe; capa e saia acompanham o movimento e os gestos sem atravessar.
4. Teste de encaixe: distância entre cada enfeite e a cabeça (ou o corpo) dentro do limite em todos os modelos × corpos × cabelos × fantasias; os chapéus soltos de hoje corrigidos.
5. Multijogador: a fantasia chega ao amigo pelo comando `aparencia`, com saneamento (id desconhecido vira "sem fantasia", cor fora da paleta vira a padrão); aparências antigas abrem iguais.
6. Sugestão ao criar mundo ("Quer vestir a fantasia do Rancho Alegre?") com Sim / Agora não, sem repetir no mesmo mundo.
7. Desempenho medido; capturas lado a lado com o esboço; testes de tela no computador e no celular.
8. Nada quebra: todos os testes passam; auditoria independente; relatório visual.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Encaixe: teste de distância enfeite↔cabeça/corpo no plano do boneco (todos os modelos, corpos, cabelos e acessórios) e correção dos chapéus soltos de hoje |
| T02 | Modelo das fantasias: catálogo (grupo, nomes por corpo, peças, cores), campo na aparência com o look de antes, persistência, saneamento e multijogador |
| T03 | Peças novas no boneco, fundidas por parte que se mexe; capa e saia com balanço ligado ao movimento e aos gestos; versão de príncipe |
| T04 | Aba Fantasias no editor (Realeza · Heróis · Dos temas), cor principal, personalizar a partir da fantasia, "Tirar fantasia", festa ao vestir |
| T05 | Sugestão ao criar mundo e ordem "tema do mundo primeiro" |
| T06 | Desempenho, capturas com o esboço, testes de tela, auditoria, publicação e relatório visual |

## Quando (decidido pelo dono em 10 nov 2026)
- Logo depois da 015 (terceira pessoa): a capa e a saia aproveitam o movimento novo do boneco, e é a parte que os filhos pediram. Depois, a 016 (construções protegidas) e a 014 (Cidade Grande).
