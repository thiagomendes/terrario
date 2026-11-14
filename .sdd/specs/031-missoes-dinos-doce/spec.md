---
id: 031-missoes-dinos-doce
title: 'Missões da Era dos Dinos e do Doce Reino: ovinhos, capim, fósseis e bolo, com o guia da 030'
status: APPROVED
base_branch: main
branch: feat/031-missoes-dinos-doce
created_at: 2026-11-14T20:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
- name: build
  command: npm run build
  blocking: true
full_test_command: npx vitest run && scripts/e2e-gpu.sh
---
## Contexto e problema
A 023 deu missões, moedinhas, nível e banca só a dois mundos: a Cidade Grande (c1…c8) e o Rancho Alegre (r1…r7). A 030 fez a criança **chegar** ao lugar sem ler (trilha de pegadinhas, placa, selinho, brilho, mãozinha). Na Era dos Dinos e no Doce Reino a criança entra e não tem nada a buscar: o quadro de missões nem aparece na roda.

O esboço (`esboco/missoes-dinos-doce`, `?esboco=missoes`) rodou no jogo de verdade com a conta e as moedinhas só na página e o canto aplainado na hora. O dono aprovou com mudanças ("manda ver"); o consultor de experiência pediu os acertos listados abaixo.

## Objetivo
Uma criança de 3 a 4 anos, sem ler, entra na Era dos Dinos ou no Doce Reino, abre "Missões" na roda, toca no "brincar", **segue a trilha, faz a coisa e ganha as moedinhas** (de verdade, na carteira dela) sem ajuda de adulto, do mesmo jeito da Cidade e do Rancho. Poucas missões, bem acabadas.

## Decisões finais (dono, 14 nov 2026)
- **Três missões por mundo, só moedinhas.** Cortadas d4 (raptorzinho), e3 (passeio), e4 (confeiteiro) e as fantasias de prêmio (vêm depois, juntas).
- **15 moedinhas por mundo**, o prêmio só no fim de cada missão, mostrado antes: d1 4, d2 5, d3 6; e1 8, e2 7. (No Doce Reino só duas missões ficaram, então cada uma vale mais.)
- **Banca de cada mundo** como no esboço, só do tema, preço fixo, nada de várias cores juntas: Dinos — magnólias ×6 (3), tochas de resina ×6 (3), leque de ginkgo ×8 (4), ninho de folhas ×1 (4), âmbar que brilha ×4 (5); Doce — flor de confeito ×6 (3), velas ×4 (3), bolo com chantilly ×8 (4), arbusto de balinhas ×4 (4), pote de geleia que brilha ×4 (5).
- **O que é de cada missão volta só quando ela é escolhida de novo** (o "brincar"), nunca com o tempo: os 3 ovinhos, os 2 bichos sem comida, as 3 rochas de osso, a mesa limpa para outro bolo.

### As missões
| | Cartão: esquerda (o que fazer) → direita (o resultado) | Alvo do guia | No lugar | Conta (núcleo) |
| --- | --- | --- | --- | --- |
| **d1 Ovinhos do ninho** | ninho de gravetos com 3 ovinhos pintados em volta + selo da mãozinha → os ovinhos saindo da mochila | o ovinho mais perto ainda no chão | andar até ele: vem para a mochila sozinho, ✓ | `coletou:ovo:ninho` × 3 (só o ovinho que o canto pôs) |
| **d2 Capim para 2 pescoçudos** | pescoçudo + selo do capim-dourado → pescoçudo de olhinho feliz com coração | o pescoçudo do pasto ainda sem comida (anda) | ao chegar, o capim aparece na mão (pop + som); tocar no bicho: corações e ✓; a trilha pula para o outro | `criou:cervo` × 2 (a regra de 1 min da 023) |
| **d3 Fósseis na areia** | rocha com osso + selo do pincel → o osso fora da rocha partida, brilhando | a entrada da caixa de areia | um toque em cada rocha de osso (3): ela some num pó, ✓ | `escavou:fossil` × 3 |
| **e1 Bolo de aniversário** | o bolo em blocos azuis (os fantasmas) + selo do saco de confeitar → o bolo de chocolate e chantilly com a vela acesa | o prato do bolo, do lado de quem vem (chega a 1,2 bloco) | tocar nos fantasmas: 4 de chocolate, 4 de chantilly, a vela; **a mãozinha pula sozinha para o próximo bloco** depois de cada toque, de trás para a frente | `bolo:camada` × 3 (uma bolinha por camada: chocolate, chantilly, vela; para todos que puseram bloco nesta rodada) |
| **e2 Broto-doce para 2 ovelhas** | ovelha de marshmallow + selo do broto-doce → ovelha feliz com coração | a ovelha do pasto ainda sem comida | igual à d2, com o broto-doce | `criou:cervo` × 2 |

**Por que a mãozinha que pula (e não 5–6 toques):** o bolo de 2 × 2 × 2 com a vela é o que lê como bolo de aniversário; com menos blocos vira um pão comprido ou uma vela torta. Com a mãozinha mostrando o próximo bloco logo depois de cada toque (0,55 s), os 9 toques viram um ritmo só, sem procurar.

## Onde as missões moram: o canto das missões
Gerado com o mundo (puro, `src/world/cantoMissoes.ts`), sempre o mesmo para a mesma semente, a uns 12 blocos de onde a criança nasce (de 10 a 14 na primeira tentativa; até 17 em ilha pequena), à frente do olhar de quem nasce. É **parte do mundo, não um chão aplainado:** o lugar é escolhido onde o chão já é quase plano; só o chão debaixo de cada peça acerta até dois degraus, e o mato do canto sai (árvore nenhuma a 3 blocos). Cada chunk que o canto alcança fica só para ele (sem povoado nem estrutura rara).
- **Era dos Dinos, o acampamento-mirim:** o **ninho de gravetos** (modelo 3D nosso, trançado em três voltas, galhinhos e folhinhas, por cima de um fundo de leque de ginkgo) no meio de um chão plano de 5 × 5, os **3 ovinhos de dino** (modelo novo: ~0,6 bloco de altura, creme com pintas verdes de dois tons, com um brilhinho dourado em cima enquanto estão no chão) a ~2,2 blocos do ninho, no mesmo chão; a **caixa de areia** com a cova de 3 × 3 um degrau abaixo e as 3 rochas de osso, dentro da **cerquinha de gravetos** fechada com 2 blocos abertos do lado da trilha (os bichos não entram nem nascem ali); e o **pasto** com dois fardos de capim-dourado (os bichos do pasto moram ali perto).
- **Doce Reino, a confeitaria ao ar livre:** o **prato** de tablete de caramelo 4 × 4 rente ao chão dos quatro lados, com o **bolo em fantasmas** de 2 × 2 × 2 e a vela (os mesmos fantasmas da obra da 014), flores de confeito e arbustos de balinhas, e o **pasto das ovelhas**.
- **Proteção da 016:** o chão das peças e uma volta não se cavam; ninho, cova e o lugar dos ovinhos ficam vazios (ninguém põe bloco); as rochas de osso só saem para quem tem a d3; as células do bolo aceitam só o bloco certo e, cheias, não quebram.
- O canto muda a geração em volta do nascer dos mundos já salvos destes dois temas (árvores e mato somem ali). É o preço de as missões existirem em todo mundo; nada de jogador fica preso (o canto nunca cobre o nascer).

## O núcleo
- **Que mundo é:** `mundoAlmaDoEstilo` lê o estilo que o núcleo já recebe — a planta (cidade, sítio) e, para os dois novos, a **estrutura rara** que só eles usam (`ninho` na Era dos Dinos, `casinha` no Doce Reino). Nenhum campo novo no estilo, e os mundos já salvos na nuvem ganham as missões sem migrar nada.
- **O canto nunca cobre o que alguém construiu (pedido do dono):** o planejador oferece até 6 lugares bons, em ordem. Mundo novo: o melhor. Mundo salvo antes do canto: o primeiro sem nenhuma edição na caixa dele (com uma volta de 2); sem nenhum, o mundo fica sem canto. A escolha é gravada com o mundo (`extras.canto`) e o servidor da nuvem manda no "bem-vindo" (campo `canto`); a cena e os trabalhadores da malha geram o mesmo. Construção feita depois não muda o lugar. Tirar mato e árvore natural pode.
- **Rede:** `VERSAO_REDE` sobe para **7**. É preciso: o canto muda a geração da Era dos Dinos e do Doce Reino em volta do nascer, e um navegador de antes veria outro chão que o servidor (blocos, colisão, proteção); vem junto o campo `canto` do "bem-vindo".
- **Contas novas:** `coletou:ovo:ninho`, `escavou:fossil`, `bolo:bloco`, `bolo:feito` (com XP e habilidade, como as outras ações). Dar comida e `criou:cervo` já existiam.
- **O que o núcleo faz no canto:** ao escolher a missão (o comando `almaFixar` de sempre) e ao entrar com ela no selinho, põe de volta o que é dela (ovinhos parados e marcados, que não somem com o tempo; dois bichos do pasto sem comida; as rochas; a mesa limpa se o bolo de antes ficou pronto). A comida na mão perto do bicho (d2, e2) vem do núcleo, só para quem tem a missão no selinho, como os blocos da obra. A rocha de osso sai com um toque (comando `quebrar` de sempre) só para quem tem a d3. O bloco do bolo entra de graça (comando `colocar` de sempre) só para quem tem a e1.
- **Paridade:** o canto só existe com os povoados ligados (o teste de paridade desliga), então as 36 sessões gravadas ficam iguais.

## O guia (030) nos dois mundos
`alvoDaMissao` ganha o canto: o ovinho ainda no chão (chega a 1,3 bloco), o bicho do pasto sem comida (a 3 blocos; alvo que anda), a entrada da caixa de areia e o lado da mesa (dentro da caixa ou a 2,4 blocos). O resto da 030 não muda.

Acertos do consultor de experiência, para **todas** as missões (Cidade e Rancho também):
- A **placa some a ~4 blocos** do alvo e a mãozinha assume.
- **Nada de virar a câmera ao chegar** (regra da 030). Quando a mãozinha fica atrás do boneco, o boneco fica **~40% transparente**.
- **Toque generoso (alvo de 80 px):** com a missão no lugar, o toque pega a rocha de osso, o fantasma do bolo da camada de agora ou o bicho ainda sem comida que estiver no raio do dedo; o bicho que comeu ganha corações e sai andando contente (não segue a comida); a comida aparece na mão com um pop e som.
- **A mãozinha aparece em até 1,5 s** ao chegar (a da obra e a do bolo vêm a 1,2 s).

## O quadro
- O lado direito do cartão mostra o **resultado**, nunca o mesmo desenho do esquerdo; o selo da ação tem pelo menos 32 px.
- A **próxima missão aparece cortada**, na cor de sempre (sem cadeado, sem cinza), sumindo na beira, com uma setinha que balança uma vez (deitado, à direita; em pé, embaixo). Pelo menos 60 px do desenho dela ficam à vista, livres do X. Vale para todos os mundos.
- Com o quadro (ou o baú) aberto, a barra e o mapinha somem (o X nunca fica em cima do mapinha; nada do jogo aparece por baixo do painel).

## Experiência medida
- Cada missão em até 2 min no ritmo de criança, contando do "brincar"; trilha de 8 a 15 blocos.
- A mãozinha em até 1,5 s ao chegar; o toque onde ela mostrou funciona.
- O ovinho e a rocha de osso se veem de 10 blocos.
- Nada tapa o HUD nas três telas; a tela fica limpa (o selinho e a estrela).
- Rodada em família antes de publicar.

## Com amigos
Como a 030: trilha, placa, selinho e mãozinha só na tela de quem escolheu. Os ovinhos e as rochas são do mundo e voltam para quem escolher a missão; o bolo conta para quem pôs blocos nele (como a obra da 014). Os bichos do pasto são do mundo: alimentar o que o amigo já alimentou não conta de novo antes de 1 minuto (regra da 023).

## Cuidados legais (ver `.sdd/cuidados-legais.md`)
- **Sem pressão:** nada de prazo, contagem, estoque que gira ou prêmio sorteado; o prêmio é mostrado antes e chega só no fim. Nada volta sozinho com o tempo.
- **Sem dado novo:** nada sai do aparelho além do que a 023 já manda.
- **Arte e modelos originais, feitos aqui:** ninho, ovinho de dino (desenho e 3D), pescoçudo, capim-dourado, rocha com osso, pincel, osso achado, bolo fantasma, bolo aceso, ovelha, broto-doce (desenho e 3D, cor-de-rosa, diferente do capim). Nada de arco-íris.
- **Conteúdo do tema:** nada destes mundos vai para os outros (o capim e o broto-doce são o mesmo item por baixo, mas cada mundo mostra o seu; a colher de pedreiro continua só da cidade).

## Fora desta parte
- d4, e3, e4 e as fantasias de prêmio (próxima rodada, juntas).
- Os outros mundos (Bruma e Luz, Mata Encantada, Planeta Vivo, Lua, 026, 027, 028).
- A confeitaria completa da 018 (forno de doces, receitas).
