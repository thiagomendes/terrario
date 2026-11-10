---
id: 013-rancho-alegre
title: 'Rancho Alegre: plantar, colher e criar bichos'
status: IN_PROGRESS
base_branch: main
branch: feat/rancho-alegre
created_at: 2026-11-07T22:00:00Z
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
Os seis temas de hoje são fantasiosos: espíritos, robôs, dinossauros, doces, planetas e a Lua. O dono quer mundos reconhecíveis do dia a dia. O estudo de 7 nov 2026 (abaixo) propôs dois: uma cidade grande e uma fazenda. O dono aprovou os dois em desenho de brinquedo (`referencia/temas.html`, https://claude.ai/artifact/1YbkZd2Tv5TezzkkBzhVMd) e escolheu começar pelo **Rancho Alegre**. A **Cidade Grande** virou a spec 014.

Uma fazenda sem plantação e sem bichos de criação fica rasa. Por isso esta spec traz duas **mecânicas novas que valem para todos os temas**, plantar e colher e criar bichos, e o tema Rancho Alegre como pele completa por cima delas.

## Objetivo
- **Plantar e colher** em todo tema: arar a terra com a enxada, plantar a semente, ver crescer em 4 estágios (mais rápido com sol e chuva) e colher. O trigo vira pão, o milho vira pipoca e a abóbora vira torta.
- **Criar bichos** em todo tema: o bicho segue quem segura a comida dele; ao ganhar comida, fica sendo seu (não some, fica perto de onde foi deixado, e o cercado segura). A galinha criada bota ovo.
- **Rancho Alegre**, o 7º tema: céu de interior, sítios com casa de varanda, celeiro, silo, curral, galinheiro e lavoura plantada, moinho de vento, bichos e moradores de brinquedo como no desenho, música de viola e sons do campo.

## Fora de escopo (desta etapa)
- A Cidade Grande (spec 014).
- Leite e balde, filhotes, colmeia e mel (ficam no backlog).
- Água para regar, pisotear a lavoura, pragas: nada que faça a criança perder o que plantou.
- Crescer com o jogo fechado: a lavoura cresce enquanto o mundo está aberto (no aparelho) ou com alguém na sala (na nuvem), como a fornalha.

## Viabilidade (estudo de 7 nov 2026)
**Como um tema funciona hoje.** É uma "pele" sobre as mesmas regras. Os blocos, itens, receitas, os 5 papéis de bicho (cervo, coelho, raposa, peixe e a criatura da noite), as 3 profissões e os biomas são iguais em todo tema. O tema troca nomes, texturas, cores, céu, água, sons, música, o desenho das árvores, da estrutura rara, das casas do povoado, dos bichos e dos moradores.

**O que faltava, e por que não pode ser gambiarra:**
1. **Plantar e colher** não existe (nem semente, nem enxada, nem planta que cresce). É mecânica nova no núcleo, igual no aparelho e na nuvem.
2. **Criar bichos:** hoje só a raposa é domada, com frutinhas. Seguir quem tem a comida e ficar no cercado é geral, para todo tema.
3. **Sítio:** o planejador de povoado faz lotes de casas iguais. O sítio precisa de lotes de lavoura, curral e galinheiro (`EstiloMundo.povoado.planta: 'sitio'`), com o mesmo jeito determinístico por região.
4. **A criatura da noite mansa:** no desenho aprovado a coruja só pia e foge. Hoje a criatura da noite sempre ataca. Vira um dado do mundo (`EstiloMundo.noite: 'assusta' | 'mansa'`), levado ao servidor.

## Lições aplicadas (o que já deu bug antes e como esta spec evita)
1. **Comando novo sem caso no saneamento some na nuvem.** Funciona sozinho (o núcleo local confia) e é jogado fora no servidor. Todo comando novo ganha caso em `saneamento.ts` e um teste no modo nuvem (`confiar: false`).
2. **Estilo do mundo filtrado no servidor.** `estiloSeguro` só deixa passar o que conhece. Campos novos (`planta`, `noite`, formas novas) entram na lista, e o teste "estiloSeguro(estilo) == estilo" cobre os sete temas.
3. **Sorteios novos não usam os geradores de hoje** (drops, população, clima): mudariam tudo o que vem depois e quebrariam a paridade gravada. Usam `hash3` ou um gerador próprio com semente nova.
4. **Estado novo só dentro do `criarNucleo`.** O servidor roda várias salas no mesmo processo.
5. **Uma regra só para prever e para conferir.** O cliente prevê com a mesma função que o núcleo usa (`src/jogo/plantio.ts`), para não piscar nem ser desfeito.
6. **Mundos salvos continuam abrindo.** Ids de bloco só são acrescentados (68 em diante), chaves novas em `extras` são opcionais e o teste de mundos antigos cobre a falta delas.
7. **Protocolo novo sobe a versão de rede** (`VERSAO_REDE`), e site e servidor são publicados juntos.
8. **Listas de temas escritas à mão nos testes de tela** (sete arquivos e um "6" fixo): todas passam a sair de uma lista só.
9. **Tudo pelo toque também.** Tocar com a enxada ara, tocar com a semente planta, segurar colhe, tocar no bicho com a comida dá a comida. Testado no celular.
10. **Sons do campo nunca em laço.** Galo, vaca, cigarra e sapo são sons curtos com o vigia de vozes presas (o grilo contínuo do backlog da 012).
11. **Bichos de brinquedo com peças fundidas por parte que se mexe** (a queda de 60 para 42 fps da 012), olhos com brilho e sem transparência; conferidos de perto.
12. **Item na mão, no chão e no ícone com o formato de verdade** (a flor-cubo e a tocha-cubo da 012): enxada, sementes, trigo, milho, pão, pipoca, ovo.
13. **Planta não flutua nem some calada.** A lavoura sai (e devolve a semente) se a terra de baixo é quebrada, e colocar bloco em cima dela é recusado, em vez de apagá-la.

## Plantar e colher (mecânica nova, todos os temas)
- **Blocos novos** (ids 68 em diante, nesta ordem): terra arada; trigo em 4 estágios; milho em 4 estágios; abóbora em 4 estágios (o último é o pé com a abóbora); fardo de feno. Os estágios não viram item (não aparecem no inventário nem no criativo).
- **Itens novos:** enxada (nos 5 níveis de material, como as outras ferramentas), semente de trigo, semente de milho, semente de abóbora, trigo, milho, pão, pipoca, ovo e ovo cozido.
- **Arar:** com a enxada na mão, usar (clique direito ou toque) na grama ou na terra com ar em cima vira terra arada. Gasta a enxada. Planta baixa em cima (grama alta, flor) sai junto.
- **Plantar:** a semente vai na terra arada (usar com a semente na mão). Fora da terra arada, aviso: "A semente precisa de terra arada. Use a enxada na grama."
- **Crescer:** 4 estágios. Em sol aberto, de dia, cada estágio leva cerca de 2 minutos (do plantio ao maduro, 6 minutos). Chuva acelera em 1,5×. À noite ou no escuro, metade da velocidade, e perto de tocha ou lanterna (luz 9 ou mais) cresce como de dia. O progresso é contínuo e salvo, sem sorteio.
- **Colher:** quebrar a planta. Madura: o produto (trigo 1 a 2, milho 1 a 3, abóbora 1) e 1 a 2 sementes. Verde: devolve a semente. Nunca se perde o que se plantou.
- **Sementes:** a grama alta solta semente de trigo às vezes; o baú do celeiro dos sítios tem sementes e uma enxada; a cozinheira troca sementes; colher solta sementes.
- **Receitas:** pão (3 trigo, mesa); fardo de feno (9 trigo) e de volta (1 fardo dá 9 trigo); pipoca (milho na fornalha); ovo cozido (ovo na fornalha); sementes de abóbora (1 abóbora dá 4); enxada nos 5 materiais.
- **Trocas** (iguais em todo tema): a cozinheira troca sementes e pão; o construtor, cercas e fardos de feno.
- **Regras que protegem a criança:** a terra arada não volta a ser terra sozinha; ninguém pisoteia a lavoura; colocar bloco em cima da planta é recusado; quebrar a terra embaixo solta a planta e a semente.
- **Na nuvem:** visitante sem permissão de construir não ara, não planta e não colhe; dois jogadores colhendo a mesma planta, só um leva. O visitante abre e fecha portas e porteiras (como hoje), mas não quebra nenhuma.

## Criar bichos (mecânica nova, todos os temas)
- **Comida de cada papel** (igual em todo tema; o nome muda): cervo come trigo; coelho come semente (qualquer); raposa come frutinhas (como hoje). Peixe e criatura da noite não são criados.
- **Seguir:** quem segura a comida de um bicho a até 8 blocos é seguido por ele, que para a uns 2 blocos. Soltou a comida da mão, ele para.
- **Dar comida:** usar (clique direito ou toque) no bicho com a comida dele. Ele mostra coraçõezinhos e passa a ser **criado**:
  - não some quando o jogador vai longe e é salvo com o mundo;
  - passeia perto da "casa" dele (o lugar onde ganhou comida ou onde parou de seguir), até 6 blocos;
  - a cerca segura o bicho, então curral funciona.
- **A raposa continua igual:** domada com frutinhas, segue o dono e ajuda contra a criatura da noite.
- **Ovo:** a galinha criada (papel coelho) bota um ovo a cada 5 minutos, mais ou menos, perto da casa dela. O ovo cozido é comida.
- **Limite:** até 24 bichos criados por mundo (para o celular e para o servidor). No limite, aviso: "Já tem bicho demais por aqui. Que tal um curral?"
- **Na nuvem:** criar bicho novo é mexer no mundo: o visitante sem permissão de construir não cria (como não ara nem planta). Ao bicho que já é criado ele pode dar comida, e o mesmo bicho mostra corações no máximo uma vez por segundo, para um clique repetido não encher todo mundo de corações e vozes.

## Sítio (planejador `planta: 'sitio'`)
- Mesma região de 128 blocos, mesmo raio e lote de 7×7 do povoado de hoje. Muda o que vai em cada lote:
  - **casa da fazenda** com varanda, onde mora a fazendeira (cozinheira);
  - **celeiro vermelho** com portão de tábuas, mesa, baú com sementes e enxada (oficina do construtor, que vira carpinteiro);
  - **oficina da ferreira** (fornalha);
  - **silo** (depósito, com baú);
  - **lavoura** já plantada e madura (trigo, milho ou abóbora), com terra arada;
  - **curral** com cerca e porteira e **galinheiro**, onde nascem vacas e galinhas do sítio (como os moradores: renascem com o sítio, até 3 por curral);
  - **no meio:** um moinho de vento.
- **Nascimento perto de um sítio:** no Rancho Alegre, o jogador nasce com um sítio a até 60 blocos (em ao menos 18 de 20 sementes testadas).
- **Estrutura rara:** espantalho com baú no meio de uma lavoura abandonada.
- **Os outros temas não mudam:** o terreno dos seis temas de hoje sai igual bloco por bloco (`paridade-bruma.test.ts`).

## Tema Rancho Alegre (pele completa)
Como no desenho aprovado:
- **Céu e clima:** amanhecer dourado e céu aberto; chuva de gotas boa para a lavoura; arco-íris; noite estrelada com vaga-lumes. Sem neve.
- **Terreno:** campos largos (biomas campos e floresta mais comuns), morros suaves, açude, mata nos morros e pomar perto das casas.
- **Bichos:** vaca (cervo), galinha (coelho), cachorro do sítio (raposa), tilápia do açude (peixe), coruja curiosa à noite (criatura da noite **mansa**: olhos que brilham, pia e foge, nunca ataca).
- **Moradores:** fazendeira ou fazendeiro (cozinheiro), carpinteira ou carpinteiro (construtor), ferreira ou ferreiro (ferreiro). Chapéu de palha, boné, avental, como no desenho.
- **Sons:** galo ao amanhecer, mugido ao longe, cigarra de tarde e sapo à noite, todos curtos. Música de viola caipira e sanfona leve.
- **Nomes de todos os blocos e itens** com cara de roça (sem palavras da Bruma).
- **Personagem sugerido:** com chapéu de palha (acessório novo, disponível a todos).

## Capricho na experiência (para não frustrar)
- **Primeira colheita em até 8 minutos** no Rancho Alegre, partindo do nascimento: o sítio está à vista, o baú do celeiro tem enxada e sementes, e o diário guia (Arar, Plantar, Colher).
- **Ver crescer:** cada estágio muda de forma e de cor de um jeito que dá para notar de longe; um brilhinho e um som curto quando a planta fica madura e o jogador está perto.
- **Dicas na mira:** "Toque na grama para arar" (com a enxada), "Toque na terra arada para plantar" (com a semente), "Segure trigo para a vaca seguir você", "Toque para dar trigo à vaca".
- **Mensagens de criança, sem texto técnico:** recusas dizem o que fazer ("A semente precisa de terra arada...").
- **Festa:** confete de folhinhas ao colher maduro; coraçõezinhos ao dar comida; aviso do diário ao completar a missão.
- **Missões novas no diário** (todos os temas, capítulo "Roça"): arar a terra, plantar, colher, fazer pão, criar um bicho.
- **Medido:** 60 fps no computador e pelo menos 45 com a CPU 4× mais lenta, em pé ao lado de um sítio com lavoura.
- **Revisão jogando de verdade** antes de fechar: do nascimento à primeira colheita, no computador e no celular.

## Critérios de qualidade (definição de pronto)
1. **Plantio no núcleo:** arar, plantar, crescer (sol, chuva, escuro, luz), colher (madura e verde), suporte da terra, recusas; testes de núcleo, de salvar e reabrir, de mundos antigos e de determinismo.
2. **Plantio no multijogador:** comandos no modo nuvem (saneamento), visitante recusado, colheita disputada, lavoura que cresce e sala que dorme e acorda igual (`salas.test.ts`), previsão sem piscar (`canal.test.ts`).
3. **Criação:** seguir quem segura a comida, dar comida, casa, cerca, salvar e reabrir, ovo, limite; testes de núcleo e multijogador.
4. **Sítio:** determinístico, igual no servidor, todos os lotes com porta e acesso, lavoura madura, curral fechado; os seis temas de hoje sem nenhum bloco diferente.
5. **Pele completa** do Rancho Alegre coberta pelos testes de tema (`cobertura.test.ts` e os demais), bichos e moradores desenhados à mão como no esboço.
6. **Todos os temas** com nome e textura para os blocos e itens novos.
7. **Toque:** arar, plantar, colher e dar comida pelo toque (e2e no celular).
8. **Desempenho medido** (computador e CPU 4× mais lenta) ao lado de um sítio.
9. **Capturas** de dia e de noite do Rancho, de perto (bichos, moradores, lavoura nos 4 estágios), a vitrine e a foto do tema; capturas dos blocos novos nos outros temas.
10. **Nada quebra:** os seis temas e os mundos salvos continuam iguais; todos os testes passam (vitest e e2e na GPU); paridade gravada só muda onde a mecânica nova muda de propósito (anotado).
11. **Auditoria independente** ao fim, com os achados corrigidos.
12. **Rodada em família** no Rancho Alegre.
13. **Relatório visual** publicado ao fechar.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Blocos e itens novos: registro, nomes e texturas nos 6 temas de hoje, peças de brinquedo da lavoura (4 estágios), ícones, mão e chão |
| T02 | Plantio no núcleo: `plantio.ts`, comando `arar`, plantar pelo `colocar`, crescer, colher, suporte, `extras.lavoura`, previsão no cliente, toque, sons, eventos e missões |
| T03 | Criação no núcleo: comida por papel, seguir, comando `alimentar`, criados com casa, salvar, ovo, limite, dicas e toque |
| T04 | Criatura da noite mansa (`EstiloMundo.noite`) e `estiloSeguro` com os campos novos |
| T05 | Sítio: `planta: 'sitio'`, lotes novos, construções, bichos do curral, nascimento perto do sítio, espantalho |
| T06 | Tema Rancho Alegre: pele completa (céu, água, partículas, terreno, nomes, texturas, bichos, moradores, vozes, música, sons do campo, chapéu de palha) |
| T07 | Receitas, trocas e diário (capítulo "Roça") |
| T08 | Testes de tela: lista única de temas, plantio e criação no computador e no celular, multijogador, paridade |
| T09 | Desempenho, capturas, vitrine, auditoria independente, publicação, rodada em família e relatório visual |

## Riscos
- **Atlas:** 82 de 128 lugares usados. As lavouras usam uma textura por planta (os estágios saem da peça 3D), então entram só 6 texturas novas.
- **Paridade gravada:** a grama alta soltando semente muda os itens de sessões que quebram grama alta. A semente usa sorteio próprio (não mexe nos outros), e só esses totais são regravados, anotados.
- **Muito trabalho de arte:** cada um dos 7 temas precisa nomear e pintar os blocos novos, e o Rancho precisa de uns 95 desenhos. Divide-se por tema.
- **Lavoura muito cheia de peças:** medir o desempenho com os sítios; se pesar, a peça madura distante simplifica.

## Decisões do dono
- 7 nov 2026: os nomes "Cidade Grande" e "Rancho Alegre"; começar pelo Rancho; bichos da noite fofos que não atacam.
