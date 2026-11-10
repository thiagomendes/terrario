---
id: 017-fantasias
title: 'Fantasias prontas: princesas, heróis e fantasias dos temas'
status: DRAFT
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

## Quando (decidido pelo dono em 10 nov 2026)
- Logo depois da 015 (terceira pessoa): a capa e a saia aproveitam o movimento novo do boneco, e é a parte que os filhos pediram. Depois, a 016 (construções protegidas) e a 014 (Cidade Grande).
