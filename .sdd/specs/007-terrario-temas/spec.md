---
id: 007-terrario-temas
title: 'Terrário: novo nome do jogo e temas de mundo (Bruma e Luz e mais 5)'
status: IN_PROGRESS
base_branch: feat/expansao
branch: feat/terrario
created_at: 2026-11-06T13:00:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: lint
  command: npx eslint src tests e2e
  blocking: true
- name: build
  command: npm run build
  blocking: true
environment: docker
full_test_command: npx vitest run && npx playwright test
install_command: npm ci --no-audit --no-fund
---
## Contexto e problema
O nome "Brumaluz" e o tema (bruma e luz) não sustentam o jogo: hoje são um verniz de nomes e estética noturna, sem identidade forte. O dono decidiu (2026-11-06):
- o jogo passa a se chamar **Terrário**;
- o tema vira uma escolha **na criação do mundo**, e "Bruma e Luz" é o primeiro tema;
- os temas mudam **só aparência e nomes** (texto, cor, textura, criaturas como "pele", céu, som, pesos de bioma) — **nenhuma mecânica** muda, para não afetar a jogabilidade;
- o público inclui **crianças**: tudo legível, amigável e sem nada assustador de verdade;
- a implementação deve ser **extremamente caprichosa** nos detalhes visuais, de jogabilidade, de UX e de testes.

## Objetivo
Um sistema de temas em que cada tema é um **pacote de dados** e adicionar um tema novo é trabalho de conteúdo, não de engenharia — com seis temas iniciais prontos, polidos e verificados.

## Fora de escopo
- Qualquer mudança de mecânica por tema (gravidade, oxigênio, terraformação, dano, velocidade, receitas).
- Blocos, itens ou criaturas exclusivos de um tema (todo tema rebatiza e repinta os mesmos ids).
- Trocar o tema de um mundo já criado (fica para depois; nesta versão o tema é fixo após a criação).
- Multijogador.

## Regra central: ids estáveis
O tema **nunca** cria nem remove blocos, itens, criaturas, receitas ou biomas. Ele diz **como cada um se chama, que cara tem e que som faz**, e com que frequência cada bioma aparece. Salvamento, receitas, física, mineração, IA e regras são idênticos em todos os temas.

## Pacote de tema (formato)
`src/temas/<id>.ts` exporta um `Tema`:
- **Identidade:** `id`, `nome`, `lema`, cores do logo e da interface (acento, fundo do título), ícone e cartão de prévia.
- **Textos:** nome de cada bloco, item, criatura, bioma, estação e clima; título e descrição de cada missão; dica de início; legendas de som.
- **Texturas:** paleta e variações para cada pintor de tile do atlas (os tiles já são pintados por código); detalhes opcionais por tile (padrão, salpico, veio).
- **Atmosfera:** quadros do ciclo do dia (zênite, meio, horizonte, névoa, luz, ambiente), cor e força da bruma dos vales, estrelas, luas, planeta no céu, nuvens (cor e cobertura), arco-íris, cor da água e reflexo.
- **Criaturas (pele):** para cada tipo existente, nome, cores por parte, proporções das partes (sem mudar a caixa de colisão), brilho, sons (tom e timbre).
- **Mundo:** pesos dos biomas e cores de grama/folha por bioma (o terreno muda de cara, as regras não).
- **Som:** escala e timbres da música por contexto, ambiente (vento, bichos), receita base dos sons de material (mesmo motor de amostras, parâmetros do tema).
- **Partículas e efeitos:** cor de vaga-lumes/pólen, chuva, neve, folhas caindo, poeira de colocação.

Registro em `src/temas/index.ts`; o mundo salva `tema` em `MetaMundo`; o worker recebe o id do tema no pedido de chunk; mundos antigos e temas desconhecidos abrem como Bruma e Luz (com aviso discreto no segundo caso).

## Temas iniciais
| Tema | Clima | Criaturas (pastador · saltitante · peixe · noturna · companheira) |
|---|---|---|
| **Bruma e Luz** | o atual, extraído sem nenhuma mudança visível | cervo-musgo · coelho-bruma · peixe-lume · espectro da bruma · raposa-lume |
| **Planeta Vivo** | planeta alienígena amigável: céu lilás, dois sóis, anéis e luas; fungos gigantes; rochas violeta; cristais de energia | lesma-pastora · pulga-bola · água-viva · sombrinha curiosa · robô-cão |
| **Mata Encantada** | mata atlântica e folclore leve: ipês, bromélias, jequitibás, pedras preciosas brasileiras | capivara · sapo · lambari · Saci brincalhão · lobo-guará |
| **Doce Reino** | mundo de doces: bolo, glacê, biscoito, açúcar, pirulitos, céu rosa e nuvens de algodão-doce | ovelha de marshmallow · coelho de gelatina · peixe-bala · fantasminha de alcaçuz · cãozinho de biscoito |
| **Era dos Dinos** | pré-história: samambaias gigantes, coníferas antigas, vulcões ao longe, fósseis e âmbar | dino herbívoro filhote · réptil saltador · peixe de couraça · morcego-réptil · filhote de raptor |
| **Exploração Lunar** | Lua: regolito cinza, crateras, céu negro com estrelas e a Terra no horizonte, bases e cristais lunares | rover-pastor · coelho-lunar · (lagos de gelo: peixe de gelo) · eco-sombra · robô-companheiro |

Notas de conteúdo: na Mata Encantada o folclore tem tom leve e respeitoso (sem figuras religiosas ou de povos específicos como inimigos). Em todos os temas a criatura noturna é "assustadiça", nunca aterrorizante.

## Imersão: o que cada tema precisa ter (bíblia do tema)
Pedido do dono (2026-11-06): temas que **realmente** levem para dentro do tema proposto, não poucas trocas para dizer que existe um tema. Cada tema só fica pronto quando **todos** os pontos abaixo foram pensados para ele (nenhum herda o valor do Bruma e Luz por omissão; um teste falha se algum ponto estiver igual ao padrão sem a marcação explícita `mesmoQueBase`).

**Mundo e paisagem**
- Todos os blocos repintados com identidade própria (não só cor): padrão da superfície, veios, salpicos, bordas.
- Plantas em cruz redesenhadas (flores, grama alta, cogumelos, mudas viram a flora do tema).
- Árvores: tronco, copa e formato (pinheiro, palmeira, fungo, pirulito) por bioma, usando os mesmos blocos.
- Água com cor, reflexo e transparência do tema (sempre legível e distinguível do chão).
- Estruturas do mundo (hoje as ruínas com baú) com a cara do tema: base lunar abandonada, ninho com fósseis, casinha de pão de mel, destroço de nave, clareira com pedras antigas.
- Nomes e cores dos biomas; peso de cada bioma ajustado ao tema.

**Céu e atmosfera**
- Ciclo completo do dia (zênite, meio, horizonte nos 8 quadros), névoa e bruma.
- Astros: sóis, luas, planeta no horizonte, anéis, estrelas, constelações.
- Nuvens (formato, cor, cobertura) e clima com a cara do tema: chuva de granulado colorido, poeira lunar, cinza vulcânica leve, garoa na mata.
- Arco-íris, relâmpago e neve adaptados (ou desligados visualmente onde não fizer sentido).
- Partículas: vaga-lumes e pólen viram o equivalente do tema (esporos, faíscas de energia, açúcar, cinzas, poeira estelar).

**Criaturas**
- As 5 criaturas com nome, cores, proporções, detalhes (orelhas, antenas, rodas, chifres) e animação de idle próprios.
- Sons próprios de cada criatura (chamado, susto, contentamento).
- A noturna sempre assustadiça e engraçada, nunca aterrorizante; a companheira com expressão carinhosa.

**Som e música**
- Paisagem sonora própria (vento, fauna, máquinas, borbulhas, cigarras).
- Música por contexto (dia, noite, caverna, perigo, bioma) com escala e timbres do tema.
- Sons de material com o "material" do tema (biscoito crocante, regolito arenoso, coral, cristal de energia).

**Interface e texto**
- Nome, lema e logo do mundo no tema; cor de acento da interface.
- Nomes de todos os blocos, itens, ferramentas e comidas (picareta pode virar "broca" na Lua, "colher de pau" no Doce Reino, mantendo a função).
- Diário com nome e missões escritos para o tema ("Caderno de bordo", "Diário de expedição", "Livro de receitas da fada").
- Dicas, avisos, legendas de som e textos de morte/renascer no tema.
- Cartão do tema na criação de mundo com arte, frase de efeito e uma cena de prévia.
- Tela de título com panorama e faíscas no tema do mundo.

**Personagem**
- Aparência sugerida ao criar o mundo (astronauta, explorador, confeiteiro), mantendo a personalização livre.
- Acessórios e roupas temáticos disponíveis em todos os temas (capacete, chapéu de explorador, avental), sem exclusividade.

**Verificação da imersão**
- Página de vitrine por tema (capturas da matriz e sons) revisada pelo dono antes do tema ser dado como pronto.
- Teste "nenhum vazamento de outro tema": nenhum nome, cor ou texto do Bruma e Luz aparece num mundo de outro tema (varredura de strings e da paleta do atlas).

## Renomeação para Terrário
Título, logo em blocos, textos, `<title>`, manifesto do app, ícone, README e documentação. As preferências salvas no navegador (`brumaluz:config`, `brumaluz:aparencia`) são **migradas** sem perda para `terrario:*`. Identificadores internos que o jogador não vê (eventos `brumaluz:*`, o gancho de testes `window.__brumaluz` e o nome do banco IndexedDB) **ficam como estão**, para não perder mundos salvos nem quebrar testes.

## Critérios de qualidade (definição de pronto de cada tarefa)
1. **Cobertura automática do tema:** um teste carrega cada tema e falha se faltar nome, cor, textura, pele, som ou texto para qualquer bloco, item, criatura, bioma, missão ou legenda; textos não vazios, sem emoji e em pt-BR; GLSL só ASCII.
2. **Paridade do Bruma e Luz:** depois de extraído, o atlas gerado tem o mesmo hash de pixels de hoje, e textos e cores são idênticos (o refactor não muda nada visível).
3. **Mesma jogabilidade em todo tema:** testes de invariantes por tema — nascimento seguro, todos os blocos necessários às receitas existem no mundo, minérios na mesma faixa de altura, física e IA intocadas (os mesmos testes de comportamento rodam com cada tema).
4. **Legibilidade visual medida:** contraste mínimo entre minério e pedra, planta e grama, água e chão, bloco e céu/névoa, interface e fundo; nenhum tile quase igual a outro de função diferente; checado por teste.
5. **Matriz de capturas por tema:** dia, crepúsculo, noite, caverna com tocha, debaixo d'água, chuva, inverno, criação de mundo, inventário — em desktop e celular (retrato e paisagem). Cada imagem revisada antes de dar a tarefa por pronta.
6. **Criaturas:** silhueta legível a 20 blocos, cores coerentes com o tema, pernas e cabeça animadas como hoje; revisão "amigável para crianças".
7. **Som:** cada tema com sons de material e música revisados numa página de escuta (como a dos sons de material) antes de integrar.
8. **UX da criação de mundo:** cartões de tema com prévia renderizada, teclado e toque, foco visível, alvos ≥ 44 px, texto claro para crianças; e2e cria um mundo de cada tema, joga, salva, recarrega e confere o tema.
9. **Robustez:** mundos antigos abrem como Bruma e Luz; tema desconhecido cai no padrão com aviso; migração das chaves testada; nenhuma regressão no e2e existente.
10. **Desempenho:** gerar o atlas e as peles de um tema leva < 150 ms no desktop; FPS e memória iguais aos de hoje (medidos na mesma cena).
11. **Exploração automática:** um roteiro joga ~3 minutos em cada tema (andar, correr, voar, nadar, quebrar e colocar todos os grupos de material, anoitecer, chover) e falha com erro de console, quadro > 250 ms, posição NaN, criatura presa, malha faltando ou som que não toca.
12. **Auditoria independente ao fim de cada fase:** revisão somente leitura por área (visual, UX/celular, criaturas, mundo/regras, testes); cada achado é verificado no código e corrigido antes da fase seguinte.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Estrutura de temas: tipo `Tema`, registro, tema no `MetaMundo`, no worker e no salvamento; migração das chaves |
| T02 | Extrair Bruma e Luz para o pacote (textos, atlas, atmosfera, criaturas, som, efeitos) com paridade de pixels |
| T03 | Testes de cobertura, invariantes e legibilidade (critérios 1 a 4) |
| T04 | Renomear para Terrário: logo, textos, manifesto, ícone, documentação |
| T05 | Criação de mundo com escolha de tema (cartões com prévia) e título no tema do último mundo |
| T06 | Tema Planeta Vivo |
| T07 | Tema Mata Encantada |
| T08 | Tema Doce Reino |
| T09 | Tema Era dos Dinos |
| T10 | Tema Exploração Lunar |
| T11 | Roteiro de exploração automática por tema (critério 11) e matriz de capturas |
| T12 | Auditoria final, correções, relatório com capturas por tema |

Cada tema (T06 a T10) passa sozinho por todos os critérios antes do próximo começar.

## Riscos
- **Paridade do refactor:** extrair o tema pode mudar sem querer cores ou textos. Mitigação: teste de hash do atlas e dos textos antes e depois.
- **Temas parecidos demais:** a força está na paleta e no céu. Mitigação: capturas lado a lado de todos os temas na mesma semente e hora.
- **Criaturas com outra "pele" mas mesma geometria:** proporções ajustáveis dentro da mesma caixa de colisão.
- **Tempo de geração no celular:** atlas e peles gerados uma vez por mundo e reaproveitados.

## Decisões do dono (2026-11-06)
- **Tela de título:** vitrine que alterna entre os temas (panorama, logo e cores de cada um).
- **Exploração Lunar:** céu como na Lua de verdade — sempre preto, com estrelas visíveis também de dia, a Terra no horizonte e o sol branco e forte; a duração do dia continua a mesma (só a aparência muda).
- Spec aprovada para execução até o fim.
- Técnica: um tema ativo por página (cada mundo abre numa carga de página própria); o tema e o estilo de mundo são definidos uma vez na inicialização, na thread principal e no worker.
- Vitrine do título e cartões de criação usam imagens de prévia de cada tema geradas pelo próprio jogo (capturas do motor), guardadas em `public/temas/`.
