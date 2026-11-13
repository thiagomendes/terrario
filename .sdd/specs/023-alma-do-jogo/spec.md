---
id: 023-alma-do-jogo
title: 'Alma do jogo: objetivos, progresso, moedinhas e o jeito de cada mundo'
status: DRAFT
base_branch: main
created_at: 2026-11-13T17:00:00Z
---
## Contexto
O dono, em 13 nov 2026:
- **O que ele viu com o filho:** "quando ele descobriu na cidade que ele podia construir e ele ganhava uma roupa ali... ficou jogando até ele conseguir aquilo. Quando não tinha isso, ele entrava rapidinho, em 5 minutos já saía."
- **A referência dele:** os RP do GTA 5, que sobem conforme as ações (mira, corrida, direção), e o dinheiro do jogo para comprar coisas. Quando os objetivos acabaram, ele perdeu o interesse.
- **O que ele quer:** descolar do Minecraft, que acha "meio sem objetivo".

**Esta spec junta a antiga 018 ("cada mundo com seu jeito"), por decisão do dono em 13 nov 2026.** A atividade própria de cada mundo é o lugar natural dos objetivos. O texto da 018 fica em `.sdd/specs/018-cada-mundo-seu-jeito/spec.md` como referência:
- a roça completa é a marca do Rancho;
- a Lua tem estufa;
- o Doce Reino tem confeitaria;
- o Planeta Vivo tem pesquisa;
- a Cidade tem o canteiro de obras.

## Direção (a esboçar)
- **Objetivos curtos e visíveis.** Para uma criança de 3 a 4 anos, um número abstrato não prende. O que prende é ver o prêmio chegando.
  - Missõezinhas de poucos minutos, com o prêmio mostrado antes, como a roupa da obra.
  - Um álbum de figurinhas ou um baú de prêmios que vai enchendo.
- **Progresso por jeito de brincar,** no lugar dos RP:
  - habilidades como construtor, explorador, amigo dos bichos, fazendeiro e confeiteiro, que sobem de nível com as ações;
  - cada nível libera algo visível: roupa, enfeite, item de casa, bicho novo ou um lugar do mundo;
  - a regra do jogo justo continua: o progresso é de cada mundo (cada mundo é uma história), e o personagem e as fantasias acompanham a criança.
- **Moedinhas do jogo:**
  - ganhas nas missões e nas atividades;
  - trocadas numa lojinha do jogo por roupas, enfeites e itens;
  - o servidor confere tudo, como já confere hoje.
  - A compra com dinheiro de verdade é outra spec (a 025) e só vem depois das contas e das lojas.
- **O jeito de cada mundo (a antiga 018):** cada tema tem a sua atividade, as suas missões e os seus prêmios, e o que é de um tema não vai para os outros (princípio da 014).

## Cuidados (ver `.sdd/cuidados-legais.md`)
- Sem truques de retenção que pressionem a criança: nada de "volte em 2 horas senão perde", sequências que punem quem falta, notificações insistentes. Recompensa por brincar, nunca castigo por não brincar.
- Nada de prêmio aleatório que pareça sorteio (as caixas de recompensa do ECA Digital). O prêmio é sempre conhecido antes.
- As moedinhas não podem ser trocadas entre jogadores nem viram dinheiro.

## Antes de implementar
- Esboço:
  - o laço de uma missão do começo ao prêmio, em um mundo;
  - o álbum ou baú;
  - a tela de habilidades em forma de figura, sem texto, legível por quem não lê;
  - a lojinha de moedinhas.
- Medida de sucesso: o tempo de sessão das crianças antes e depois. O dono observa a rodada em família.
- Fazer por partes. Primeiro o laço de missões e prêmios com a Cidade e o Rancho, que já têm atividade; depois os outros mundos, cada um com o seu esboço.

## Decisões do dono
- 13 nov 2026: junta a 018. Fica logo depois da câmera (022), na ordem 022 → 023 → 024 → 020 → 025, com os mundos novos (026 e 027) intercalados.
