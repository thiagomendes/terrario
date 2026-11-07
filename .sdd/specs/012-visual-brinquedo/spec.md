---
id: 012-visual-brinquedo
title: 'Visual de brinquedo: o jogo inteiro com cara de brinquedo, do bloco ao personagem e ao site'
status: IN_PROGRESS
base_branch: main
branch: feat/visual-brinquedo
created_at: 2026-11-07T17:00:00Z
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
## Contexto e problema
O personagem e o mundo do Terrário ainda têm cara de cópia de Minecraft: cubos retos com textura de pixels, personagem quadrado e desproporcional e, na primeira pessoa, um braço quadrado cor de pele.

O dono e o filho querem um jogo com identidade própria. Em 7 nov foram feitos três esboços em 3D, guardados em `referencia/`:
- **`personagem.html`:** quatro direções de personagem. Escolhida a **B, Brinquedo**.
- **`mundo.html`:** o mesmo pedaço de mundo no estilo de hoje e no estilo brinquedo.
- **`movimento.html`:** o boneco B em cada ação, com o movimento de hoje e o novo, nas três câmeras.
- **`telas.html`:** a tela inicial, criar mundo, jogando (HUD), pausa e inventário no estilo brinquedo.

O dono aprovou os esboços: "se o jogo sair igual ao esboço, será incrível".

## Objetivo
O jogo inteiro passa para o estilo brinquedo, **igual aos esboços**. Isso vale para:
- mundo, blocos, plantas e água;
- personagem, moradores e bichos;
- movimentos;
- primeira e terceira pessoa;
- itens e ícones;
- tela inicial, menus e o site.

As regras, o mundo salvo, o multiplayer e os temas continuam iguais. Muda só o desenho, que já é separado da simulação desde a spec 009.

## Definição de sucesso
**O jogo sai igual aos esboços.** As capturas do jogo, nos mesmos enquadramentos dos esboços, vão lado a lado com as imagens de `referencia/` no relatório:
- personagem de frente;
- terceira pessoa minerando;
- primeira pessoa com a picareta;
- pulo;
- o mundo de longe e de perto;
- as cinco telas: inicial, criar mundo, jogando, pausa e inventário.

A spec só fecha quando o dono olha as duplas e diz que está igual ou melhor.

## Fora de escopo (desta etapa)
- Os amigos verem os movimentos uns dos outros no multiplayer: a próxima spec, que usa a animação feita aqui.
- O fluxo de amigos sem atrito (spec 011, rascunho).
- Contas.
- Regras novas, blocos novos e temas novos.

## Experiência
- **Mundo:** blocos com quinas arredondadas e acabamento de plástico (brilho suave, verniz leve). As cores são limpas, com um degradê de baixo para cima, sem a textura de pixels. Cada peça tem uma variação mínima de tom, para parecer feita à mão. O sol faz sombra macia.
- **Juntas entre blocos:** aparentes, como no esboço, parecendo peça de montar. O dono confirma na primeira captura do jogo, comparando com a opção "suaves" (cada morro uma peça só), que fica disponível para a comparação.
- **Natureza por tema:** árvores em forma de pirulito no Bruma e Luz, e de cogumelo, pinheiro de cone, pirulito de doce, palmeira e cristal nos outros temas, cada uma com a cara do tema. Flores de bolinha, grama em tufos arredondados e água brilhante que deixa ver o fundo.
- **Personagem:** o boneco B (cabeça grande, 40% da altura; formas arredondadas; mãos redondas; olhos grandes com brilho; bochechas). O editor de personagem mantém todas as escolhas de hoje (corpo, rosto, pele, cortes e cores de cabelo, estilos de roupa, calças e acessórios), redesenhadas no estilo novo. Personagens já salvos abrem convertidos, sem perder nada.
- **Movimentos com vida**, como no esboço:
  - peso ao andar e ao correr;
  - mola no pulo (agacha, estica, achata ao cair);
  - golpe com preparo ao minerar, bater e colocar;
  - comer levando a comida à boca;
  - respirar, olhar em volta e piscar quando parado;
  - topete e acessórios que balançam atrasados.

  Também ganham movimento próprio: nadar, voar (criativo), cair, deitar na cama, desmaiar e renascer, e acenar.
- **Câmeras:**
  - **Primeira pessoa:** como na terceira pessoa, aparecem separadas a manga da blusa (na cor da roupa), o punho marcando onde ela termina e a mãozinha redonda cor de pele, bem à vista, segurando o item em estilo brinquedo. Não aparece mais o braço inteiro de uma peça só, e o braço **nunca parece solto**: a manga sempre sai pela borda de baixo da tela, como se viesse do corpo, e o que se vê é só a ponta do braço, o punho e a mão. Ao comer, a mão sobe de baixo até perto da boca. A mão balança ao andar e faz cada ação com o mesmo preparo da terceira pessoa.
  - **Terceira pessoa:** por cima do ombro, como no esboço.
  - **De frente:** como hoje.
- **Moradores e bichos:** no mesmo traço do personagem, nos seis temas. Isso inclui os moradores de cada profissão, a raposa e as criaturas de cada tema (dia e noite), com os movimentos de cada um.
- **Ferramentas na mão:** cada item tem o seu ponto de pega. Nas ferramentas é a **ponta do cabo**: a mão fecha ali, o cabo sobe a partir da mão até a cabeça da ferramenta, e o golpe gira em torno da mão. O mesmo ponto vale na primeira e na terceira pessoa e para os amigos.
- **Itens e ícones:** os itens são modelos de brinquedo (picareta, espada, comida, blocos), e os ícones da barra e do inventário são desenhados a partir desses modelos, sempre iguais ao que aparece na mão.
- **Efeitos, todos no mesmo estilo** (nada de quadradinho de pixel sobrando):
  - **Quebrar um bloco:** os pedaços saem como **peças arredondadas e confetes de plástico** na cor do bloco, que quicam e somem encolhendo, e não como cubinhos de textura.
  - **Golpes e colocação:** o golpe solta uma poeirinha de bolinhas e a peça colocada entra com um "plim" (cresce e assenta com mola).
  - **Rachadura:** vira **trincas desenhadas** que se espalham pela peça, sem o padrão de pixels.
  - **Destaque do bloco mirado:** um contorno arredondado e macio.
  - **Itens no chão:** mini peças e mini itens de brinquedo que flutuam e giram.
  - **Clima:** chuva em gotas de plástico, neve em bolinhas, folhas de outono em formato de brinquedo e relâmpago.
  - **Ambiente:** fumaça da fornalha e da chaminé em nuvenzinhas fofas, vaga-lumes como luzinhas redondas e o brilho dos cristais.
  - **Céu e água:** nuvens fofas no céu e água com respingos em gotas.
  - **Gente e bichos:** a chegada de um amigo (festa de confete), o dano e o desmaio, o sono (Zzz em balão) e a criatura derrotada (some num "puf" de fumacinha).

  Qualquer efeito novo que aparecer no caminho segue a mesma regra.
- **Tela inicial, menus e site:**
  - o título "Terrário" em letras de brinquedo;
  - botões com cara de peça;
  - a vitrine dos temas com o mundo novo;
  - o ícone do site e da tela inicial do celular.

  Tudo no mesmo estilo.

### O amigo vê os movimentos
No jogo com amigos, cada um vê o boneco do outro com os mesmos movimentos que ele vê no próprio: andar, correr, pular, voar, olhar para cima e para baixo, item na mão, golpe ao minerar e bater, colocar bloco e comer. Os três últimos chegam como contadores que só sobem, junto com a posição: quem vê dispara o movimento quando um número cresce. O campo é opcional, então servidor e clientes antigos continuam funcionando. O e2e de dois navegadores confere que a Ana vê o boneco da Bia golpeando.

### Água e chuva de brinquedo
A água parece gelatina azul ou resina de brinquedo, e a chuva parece chuvinha de desenho. Nada fica escuro nem sujo.
- **Superfície:** azul-clara e brilhante, com um reflexo largo de plástico e risquinhos de brilho que andam devagar. Ondinhas lentas, sem chuvisco de pixel.
- **Fundo:** na beira, rasa, a água é translúcida e deixa ver a areia e as pedras. Quanto mais funda, mais azul e menos se vê; no fundo do mar, azul firme.
- **Beira:** uma espuminha branca e macia onde a água encosta nos blocos e na areia.
- **Boneco entrando e saindo:** ao entrar, saltam gotinhas redondas (contas de água) e abre uma roda de ondinhas na superfície. Nadando, o corpo aparece pela água, o boneco boia com um balanço leve e deixa um rastro de ondinhas. Ao sair, pingam gotas por um instante.
- **Debaixo d'água:** a tela fica azul-clara com degradê (mais claro em cima), com bolhinhas redondas subindo e faixas de luz balançando. A visão alcança alguns blocos e some devagar no azul. Nunca preto: é piscina de brinquedo, não abismo.
- **Água corrente e cachoeira:** listras claras descendo devagar e espuma no pé da queda.
- **Chuva:** gotinhas em forma de gota (ou traço arredondado), azuladas e translúcidas, caindo em diagonal leve. No chão e na água, cada gota abre um respingo pequeno de bolinhas ou uma rodinha. O céu fica cinza-azulado claro, não escuro. A tempestade só aperta o ritmo e escurece um pouco, com relâmpago suave. A neve vira flocos de bolinha que caem balançando.
- **Medida:** capturas na beira (fundo visível), no mar aberto, entrando na água (gotas e roda), nadando de fora e debaixo d'água, e com chuva de dia e à noite. O desempenho vem medido como nas outras etapas, porque as gotas e respingos usam o mesmo motor de partículas, com limite.

## Capricho na experiência (para não frustrar)
- **Igual ao esboço**, conferido lado a lado (definição de sucesso).
- **Nenhum aparelho fica pior de jogar:** o jogo mede o próprio desempenho e escolhe a qualidade sozinho. A malha arredondada fica perto e a simples longe, a sombra pode ficar mais curta e o brilho pode ser desligado. O ajuste nunca causa trancos no meio do jogo; tudo isso também fica nas configurações, para quem quiser escolher.
- **Os temas continuam reconhecíveis à primeira vista:** cada um com a sua paleta e as suas formas. Uma captura de cada tema vai no relatório.
- **Nada muda para quem já jogava:** mundos e personagens salvos abrem iguais, só com o desenho novo.

## Critérios de qualidade (definição de pronto)
1. **Fidelidade ao esboço:** as seis duplas (jogo × esboço) da definição de sucesso, aprovadas pelo dono.
2. **Personagem:** todas as opções do editor existem no estilo novo; personagens salvos abrem convertidos (teste com aparências antigas).
3. **Movimentos:** cada ação tem a pose e o ritmo do esboço; teste confere que as poses mudam como esperado em cada ação.
4. **Pega das ferramentas:** toda ferramenta é segurada pela ponta do cabo (teste confere que o ponto de pega de cada item fica na mão), nas duas câmeras.
4b. **Primeira pessoa:** manga, punho e mão separados e nas cores do personagem (roupa sem manga mostra o braço cor de pele até a mão), item na mão no estilo novo, sem o braço quadrado; captura de cada ação.
5. **Bichos e moradores:** todos no estilo novo nos seis temas, com captura de cada um.
6. **Mundo:** blocos, plantas e água no estilo novo nos seis temas, sem textura de pixels; capturas de dia e à noite.
7. **Desempenho:**
   - no computador com placa de vídeo, a cena padrão a 60 quadros por segundo;
   - no celular simulado (CPU 4× mais lenta), não pior que hoje no nível de qualidade escolhido;
   - medição antes e depois, como na spec 009;
   - a troca automática de qualidade testada.
8. **Telas:** as cinco telas do esboço (inicial, criar mundo, HUD, pausa, inventário) e as demais (personagem, diário, mapa, trocas, baú, fornalha, configurações, jogar com amigos) no estilo: botões de peça que afundam, painéis arredondados, ícones a partir dos modelos de brinquedo.
9. **Efeitos:** cada efeito da lista da Experiência no estilo novo, com captura de cada um (quebrar e colocar nos seis temas); nenhum efeito usa ainda a textura de pixels.
10. **Tela inicial e site:** título, menus, vitrine, HUD e ícone do site no estilo novo; capturas no computador e no celular.
11. **Nada quebra:** a paridade das 36 sessões, que muda só o desenho e não as regras, o multiplayer e todos os testes passam.
12. **Auditoria independente** ao fim, com os achados corrigidos.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Base do estilo: material de plástico, sombra macia do sol perto do jogador, luz e cor do esboço; níveis de qualidade com escolha automática |
| T02 | Personagem B com todas as opções do editor; conversão das aparências salvas |
| T03 | Animações novas (todas as ações), num módulo que serve também para moradores e, depois, para os amigos no multiplayer |
| T04 | Câmeras: mão de brinquedo na 1ª pessoa, 3ª pessoa sobre o ombro |
| T05 | Moradores e criaturas dos seis temas no estilo novo |
| T06 | Blocos: quinas arredondadas nas arestas à mostra perto do jogador, malha simples longe, cores limpas com degradê |
| T07 | Formas por tema: árvores, flores, grama, água e estruturas (água e chuva de brinquedo: ver a seção própria). Plantas do chão viram peças de brinquedo (tufo baixo, flor de bolinha, cogumelo de cúpula, arbusto redondo) e o cenário não pode ficar poluído: capim baixo e na cor do chão, as flores são o destaque |
| T08 | Itens em 3D e ícones gerados a partir deles |
| T08b | Efeitos: pedaços, poeira, rachadura, destaque, itens no chão, clima, fumaça, vaga-lumes, nuvens, respingos, chegada, sono, dano |
| T09 | Tela inicial, menus, HUD, vitrine dos temas e ícone do site. Minimapa e mapa grande no mesmo traço: sem pixel por bloco, cores limpas, relevo macio, água e árvores desenhadas, e nada de cantos pretos |
| T10 | Desempenho: medição antes e depois, qualidade automática |
| T11 | Capturas lado a lado com os esboços nos seis temas, auditoria e relatório visual |

## Riscos
- **Celular:** quinas arredondadas e sombra macia custam mais. Mitigação: malha arredondada só perto, sombra só perto, qualidade automática e medição a cada fase.
- **Muitas peças de arte** (seis temas, todos os bichos, todos os itens). Mitigação: as formas saem de geradores com parâmetros por tema, como as texturas de hoje, e não de modelos feitos um a um.
- **Ficar diferente do esboço no caminho:** as duplas de captura são refeitas a cada fase, não só no fim.
