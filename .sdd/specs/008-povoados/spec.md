---
id: 008-povoados
title: 'Povoados: vilas com moradores, profissões e trocas, na cara de cada tema'
status: IN_PROGRESS
base_branch: feat/terrario
branch: feat/povoados
created_at: 2026-11-06T18:00:00Z
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
## Contexto e problema
O mundo do Terrário tem biomas, cavernas, criaturas e uma estrutura rara com baú, mas ninguém mora nele. No Minecraft, as vilas com seus moradores são um dos momentos mais marcantes da exploração ("achei alguém aqui!") e dão um motivo para viajar, trocar e construir perto. O dono pediu o equivalente no Terrário, com construções e "civilizações" que tenham relação com o tema de cada mundo.

## Objetivo
Gerar **povoados** no mundo: um conjunto de construções em volta de uma praça, com **moradores** que andam de dia, voltam para casa à noite e fazem **trocas** simples de itens. A mecânica é a mesma em todos os temas (mesmas construções, profissões, trocas e regras); o tema muda só a aparência, os nomes e as vozes — exatamente a regra da spec 007.

## Fora de escopo (desta etapa)
- Moradores que se reproduzem, ganham nível, mudam de profissão ou são atacados por hostis (cerco, saque).
- Moeda, economia dinâmica, preços que variam, reputação.
- Construções feitas pelos moradores, crescimento do povoado.
- Missões dadas por moradores com diálogo (fica para uma etapa futura).

## Regra central
Igual à spec 007: **ids estáveis e mecânica igual em todo tema**. O povoado usa blocos que já existem; o morador é um novo tipo de criatura (`morador`) com caixa de colisão e IA únicas; as profissões e trocas são as mesmas em todos os temas. O pacote de tema ganha uma seção `povoado` só com formas, pele, nomes e vozes.

## Povoado (geração)
- **Onde:** no máximo um povoado por região de 8×8 chunks (128×128 blocos), sorteado pela semente, só em biomas habitáveis (floresta, campos, deserto, taiga, praia larga; nunca oceano, montanha íngreme ou pântano fundo). O mesmo mundo e semente sempre têm os povoados no mesmo lugar.
- **Planejamento por região:** o povoado é planejado uma vez para a região inteira (centro, lotes, caminhos), de forma determinística, e cada chunk aplica só a parte que cai nele. O worker e a thread principal chegam ao mesmo resultado.
- **Terreno:** cada lote é aplainado na altura mediana do terreno em volta, com rampa suave de no máximo um bloco por passo até o terreno natural (sem paredões nem buracos). Lotes que exigiriam mexer mais de 4 blocos de altura são descartados.
- **Construções (mesmas em todo tema):** praça central com um marco (poço, fonte, totem ou antena, conforme o tema), 3 a 6 casas, 1 oficina por profissão presente, 1 depósito com baú, caminhos ligando tudo à praça, iluminação (tochas ou lanternas) para os hostis não nascerem dentro.
- **Formas por tema:** cada tema escolhe, para cada tipo de construção, uma de várias formas já prontas no motor (casa de telhado em duas águas, cúpula, tenda, casa redonda, módulo com janela redonda, casa sobre palafitas). Os blocos usados são os mesmos em todos os temas — tábuas, tijolos, pedra lisa, vidro, lã, portas, camas, mesas, fornalhas e baús — e aparecem com a pintura do tema.
- **Baú do depósito:** o mesmo tesouro em todo tema (ferramentas básicas, comida, sementes de construção).

## Moradores
- **Novo tipo de criatura `morador`**, pacífico, com a altura do jogador. Nasce com o povoado (1 por casa, até 8), guarda a casa e a profissão, e é salvo com o mundo.
- **Rotina:** de dia anda pela praça e pela oficina; ao entardecer volta para a porta de casa e entra; à noite fica dentro de casa (dorme na cama). Foge um pouco de hostis. Não fica preso: usa o mesmo cuidado de movimento das criaturas (desvio de obstáculos, sem atravessar blocos), com teste de "morador preso".
- **Profissões (3 nesta etapa):** *ferreiro* (ferramentas), *cozinheiro* (comida) e *construtor* (blocos de construção). Cada profissão tem sua oficina com o bloco de trabalho correspondente (fornalha, fornalha acesa ou mesa de trabalho).
- **Interação:** tocar/clicar com o botão de usar num morador abre a tela de trocas. Bater no morador não o machuca (ele se assusta, dá a voz de susto e se afasta).

## Trocas
- **Tela simples:** cada morador mostra de 3 a 5 trocas fixas, cada uma "dê isto → receba aquilo", com os ícones dos itens, a quantidade e um botão grande de trocar (alvos de 44 px ou mais, funciona com toque, mouse e teclado).
- **Sem moeda:** as trocas usam itens que já existem (ex.: 8 troncos → 1 picareta de pedra; 3 peixes crus → 2 peixes assados; 10 pedregulhos → 8 tijolos de pedra). As tabelas ficam num arquivo só, iguais em todos os temas.
- **Equilíbrio:** trocas não criam itens raros (nada de cristal ou ouro de graça); no modo criativo a tela funciona igual (o criativo já tem tudo, então serve só para ver). Cada troca pode ser repetida à vontade nesta etapa.
- **Diário:** missões "Encontre um povoado", "Faça 3 trocas" e "Visite as 3 oficinas", nos textos de cada tema.

## Cada tema (só aparência, nomes e vozes)
| Tema | Povoado | Moradores | Marco da praça |
|---|---|---|---|
| Bruma e Luz | Aldeia das lanternas | lanterneiros | poço com lanternas |
| Planeta Vivo | Posto de pesquisa | alienígenas simpáticos (cabeçudos, antenas) | antena de comunicação |
| Mata Encantada | Vila dos artesãos | moradores da mata | fonte de pedra |
| Doce Reino | Vilarejo dos confeiteiros | confeiteiros | fonte de chocolate |
| Era dos Dinos | Acampamento dos paleontólogos | paleontólogos | esqueleto em exposição |
| Exploração Lunar | Colônia lunar | astronautas e robôs | antena parabólica |

O pacote de tema ganha `povoado`: nome do povoado, nomes das profissões, nomes dos moradores (sorteados de uma lista curta por tema), forma de cada construção, pele do morador (por profissão: roupa e acessório), vozes (chamado, susto, contente, "obrigado" na troca) e o texto das missões. Notas de conteúdo: nenhum povo real ou grupo étnico retratado; na Era dos Dinos, cientistas em vez de "homens das cavernas"; tom gentil e engraçado, para crianças.

## Critérios de qualidade (definição de pronto)
1. **Mesma mecânica em todo tema:** teste confere que construções (tipos, quantidades, blocos), profissões, trocas e baús são idênticos entre os temas na mesma semente; só formas, nomes e peles mudam.
2. **Determinismo:** o mesmo povoado sai igual na thread principal e no worker, e em duas gerações seguidas; chunks gerados em qualquer ordem dão o mesmo resultado.
3. **Terreno bem encaixado:** teste mede degraus em volta dos lotes (nenhum acima de 1 bloco entre lote e terreno natural) e confere que nenhuma porta fica bloqueada e que todo caminho liga a casa à praça.
4. **Moradores não ficam presos:** simulação de 10 dias no jogo em povoados de vários biomas; nenhum morador dentro de bloco, fora do povoado por mais de 1 minuto ou parado na rua à noite.
5. **Trocas corretas:** testes de cada troca (tira os itens certos, dá os itens certos, recusa sem itens, inventário cheio devolve ou solta no chão), sem duplicar item.
6. **UX da tela de trocas:** e2e abre, troca e fecha com mouse, teclado e toque; alvos ≥ 44 px; foco visível; leitores de tela leem cada troca.
7. **Cobertura de tema:** a cobertura da spec 007 passa a exigir a seção `povoado` completa em todo tema (nomes, peles das 3 profissões, vozes e formas válidas).
8. **Capturas:** a matriz de capturas da spec 007 ganha "povoado de dia", "povoado à noite" e "tela de trocas" por tema, revisadas antes de dar o tema por pronto.
9. **Exploração automática:** o robô de exploração passa por um povoado, faz uma troca e confere que nada travou.
10. **Desempenho:** gerar um chunk com parte de povoado não passa de 1,5× o tempo de um chunk comum; moradores não pesam mais que as criaturas (mesmo limite de malhas).
11. **Robustez:** mundos criados antes desta etapa ganham povoados só em regiões ainda não geradas, sem sobrescrever nada que o jogador já editou; nenhum povoado corta o nascimento do jogador.
12. **Auditoria independente** ao fim, com os achados verificados e corrigidos.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Planejamento de povoado por região (centro, lotes, caminhos), determinístico, e aplicação por chunk |
| T02 | Aplainar lotes e caminhos com rampas suaves; descartar lotes ruins (critério 3) |
| T03 | Construções do motor (praça, casa, oficina, depósito) em várias formas, com os mesmos blocos |
| T04 | Criatura `morador`: rotina de dia e noite, casa, profissão, salvamento, anti-trava (critério 4) |
| T05 | Trocas: tabelas, lógica, tela (mouse, teclado, toque) e testes (critérios 5 e 6) |
| T06 | Seção `povoado` no pacote de tema e no Bruma e Luz; cobertura (critério 7) |
| T07 | Povoado nos 5 outros temas (formas, peles, nomes, vozes, textos) |
| T08 | Missões do diário, capturas, exploração automática, desempenho e mundos antigos (critérios 8 a 11) |
| T09 | Auditoria final, correções e relatório com capturas por tema |

## Riscos
- **Povoado cortado entre chunks:** construções pela metade se o planejamento não for por região. Mitigação: plano da região inteira calculado de forma pura e determinística, com teste de ordem de geração.
- **Terreno feio em volta:** degraus e buracos ao aplainar. Mitigação: rampas e descarte de lotes, com teste de degraus.
- **Moradores presos ou perdidos:** Mitigação: rotina simples (praça, oficina, casa), caminhos sempre livres, teste de 10 dias.
- **Trocas desequilibrando a sobrevivência:** Mitigação: tabelas fixas sem itens raros, revisadas.
- **Celular:** mais malhas na tela. Mitigação: mesmo limite de criaturas e construções simples.

## Decisões do dono (2026-11-06)
- Ideia aprovada: povoados com moradores e trocas, ligados ao tema de cada mundo.
- Execução emendada direto ao fim da spec 007, sem nova aprovação.
- Começar pela versão enxuta: até 6 casas, 3 profissões e a tela de trocas, já nos seis temas.
