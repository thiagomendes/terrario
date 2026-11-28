---
id: 027-mundo-halloween
title: 'Noite das Fantasias: a festa à fantasia de uma vila de brinquedo, já nascendo completa'
status: APPROVED
base_branch: main
branch: feat/027-noite-das-fantasias
created_at: 2026-11-13T17:00:00Z
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
## Contexto
O dono, em 13 nov 2026: um "mundo de criaturas, estilo Dia das Bruxas... criaturas não muito feias para não assustar, mas na pegada das fantasias do Halloween".

Em 18 nov ele aprovou a ideia completa (ver "A ideia aprovada"), para nascer no nível da Vila Neon: lugares por dentro, objetos que reagem ao toque, moradores com nome, missões com história, comprar e comer. Em 20 nov aprovou o esboço ("Esboço da 27 aprovado"), feito no motor de verdade, no computador dele.

Esta spec transforma o esboço no **sexto mundo do jogo**, a Noite das Fantasias, ao lado da Vila Neon (o padrão), da Cidade Grande, do Rancho Alegre, do Doce Reino e da Exploração Lunar (034). O que o dono aprovou fica todo aqui. O que muda em relação à ideia ou ao esboço está dito no lugar e resumido em "O que muda em relação ao aprovado".

**A direção de 13 nov**, que a ideia de 18 nov completou:
- criaturas fofas e moradores em fantasia, com cara de brinquedo e sorriso: fantasminha de lençol, abóbora com carinha, vampirinho de capa, bruxinha, monstrinho peludo, gato preto e morceguinho;
- entardecer roxo e laranja, lanternas de abóbora acesas, casinhas tortas, teias de barbante, névoa baixa clarinha;
- atividade própria no laço da 023 ("doces ou travessuras");
- música de festa à fantasia, travessa, nunca de terror, feita por nós;
- o que é deste tema fica neste tema (014).

## A ideia aprovada (18 nov 2026, à noite)
O dono: "Gostei da ideia, de forma geral tá bem legal. Amanhã me traz um esboço daí que a gente aprova." Vem logo depois da 034 ("menos é mais") e nasce no nível da Vila Neon.

**Clima:** a festa à fantasia de uma vila de brinquedo.
- De dia, entardecer laranja dourado.
- De noite, roxo, com lua grande e lanternas acesas; nunca escuro de verdade.
- Moradores fantasiados, com o mesmo visual de boneco do jogo; bichos fofos e sorridentes.
- Música travessa (xilofone, risadinhas), nunca de terror.

**Lugares:**
1. Praça da Abóbora: abóbora gigante sorridente, o palco da festa e as barracas.
2. Rua das Casinhas Tortas: telhados tortos e campainha em cada porta (doces ou travessuras).
3. Casa da Vovó Bruxinha, por dentro (como a casa anos 80): caldeirão de verdade para poções de suco, vassoura na parede, o gato no sofá.
4. Loja de Fantasias: experimentar capa, chapéu, lençol de fantasma e máscara, e se ver no espelho mágico (aproveita as fantasias do jogo).
5. Bosque das Lanternas: caminho de lanternas que se acendem com um toque, vagalumes, morceguinhos dormindo de cabeça para baixo.
6. Castelinho do Vampirinho: escorregador em espiral na torre, órgão que toca notas ao encostar, quadros que piscam.
7. Horta de Abóboras: plantar, colher e escolher a carinha da abóbora, que vira lanterna.

**Personagens:**
- Vovó Zuleica: a bruxinha boa, com o gato **Tufinho**. Nunca "Pretinho" e nunca a missão "o Pretinho fugiu": o dono acha que pode soar racista.
- Conde Dudu: o vampirinho com medo do escuro.
- Lulu: a fantasminha de lençol, tímida, que adora esconde-esconde (era "Lili"; mudou em 20 nov).
- Bento: o monstrinho peludo grandão que ama abraço e toca bumbo na banda.
- Seu Jerônimo: o dono da horta de abóboras.
- Bichos: fantasminhas flutuando, abóboras saltitantes, morceguinhos, coruja e gato preto.

**Missões (10 a 12, com moedinhas, como na Vila):**
- doces ou travessuras (5 casas, encher a sacola);
- o Conde Dudu tem medo do escuro (acender as lanternas do bosque);
- esconde-esconde com a Lulu (achar pela risadinha);
- abóbora de carinha (plantar, colher, escolher a cara, pôr na porta);
- a poção da Vovó (uva, maçã e hortelã no caldeirão);
- o gato da Vovó sumiu (seguir as pegadas do Tufinho, como a lhama);
- fantasia completa (vestir na loja e desfilar no palco);
- a banda da festa (levar os instrumentos; o show começa com todos dançando, como no festival da Vila);
- com amigos: desfile de fantasias juntos, e todo mundo ganha.

**Além dos cubos:**
- Trem das Risadas: passeio em que fantasminhas fofos aparecem sorrindo.
- Vassoura-patinete: desliza rente ao chão como os patins da Vila; não voa (justo no multijogador).
- Carrossel de morcegos e balanço de teia.

**Itens só deste mundo:** sacola de doces; lanterna de abóbora (pôr onde quiser); varinha de condão (brilhinho e flores); caldeirão; blocos novos (telha roxa, tijolo torto, teia de barbante, folhas laranja).

**Comer:** doce de abóbora, maçã do amor, brigadeiro, cocada, chocolate quente e a "poção" de uva com canudinho. É Halloween com sabor de festa brasileira.

**Cuidados:** nada de caveira, sangue, susto ou escuro total; cores no roxo, laranja e verde-musgo, sem arco-íris.

## O que existia
### O esboço (piloto no computador do dono, 20 nov 2026)
O primeiro trabalho da divisão "o que precisa de placa de vídeo vai para o computador do dono": o orquestrador, na nuvem, coordenou; a sessão do computador do dono fez o esboço num branch próprio (`esboco/027-noite-das-fantasias`) e não publicou nada.
- **O que mostrou, com o motor de verdade e só com `?esboco=fantasias`** (código em `src/esboco/`, que o jogo nunca carrega):
  - o visual do mundo: o entardecer e a noite, a praça com a abóbora gigante, a rua das casinhas tortas, o bosque das lanternas, a horta;
  - os moradores fantasiados (Vovó Zuleica com o Tufinho, Conde Dudu, Lulu, Bento, Seu Jerônimo) e os bichos fofos;
  - uma amostra de cada "além dos cubos" que mais pesa na decisão: a vassoura-patinete e o Trem das Risadas, em foto e vídeo curto;
  - a música e os sons, num trecho para ouvir.
- **As fotos:** em pé de dia e de noite, e deitado (390×844, 844×390), e no computador (1280×720); autocrítica e uma rodada de refazer antes de entregar.
- **Regras:** as do `CLAUDE.md`.

### O que o esboço entregou (20 nov 2026)
Branch `esboco/027-noite-das-fantasias`, `?esboco=fantasias`, fotos e vídeos em `capturas-027/esboco/`, música e sons em `capturas-027/esboco/sons/` (partitura e `rodar.sh` em `referencia/fontes/`). Teste das fotos: `e2e/esboco-fantasias.spec.ts` (`ESBOCO_027=1`, na placa de vídeo).
- **Código** (só `src/esboco/` e uma linha no `main.ts`):
  - `fantasias.ts`: o palco e a API `window.__fantasias`;
  - `fantasiasCeu.ts`: o céu, a lua, a névoa e os tiles repintados;
  - `fantasiasPecas.ts`: as peças;
  - `fantasiasGente.ts`: os moradores, com o boneco de verdade e as peças de fantasia presas às juntas;
  - `fantasiasBichos.ts` e `fantasiasPasseios.ts`: os bichos, a vassoura e o trem.
- **Mundo-base:** um mundo da Vila Neon (semente 1337), montado fora do bairro, num platô aplainado. O tema é mudado só na memória e nada vai ao núcleo nem à rede.
- **Portão visual:** autocrítica com várias rodadas por parte, mais dois revisores novos que só viram as fotos (um na parte 1, outro nas partes 2 e 3).
- **O que o dono viu e aprovou no caminho:**
  - os sons ("muito bons");
  - a abóbora gigante como peça de brinquedo arredondada, e não de cubos (pedido dele);
  - a vassoura-patinete ("ficou muito bom");
  - o túnel do trem mais alto, depois de ele ver as cabeças atravessando o teto ("agora ficou ótimo o trem, tá ficando muito bom esse mundo novo").
- **Decisões de acabamento do orquestrador:** todas as abóboras com olhos redondos, da família da gigante, e nenhuma com olho triangular de cara brava. A locomotiva entra inteira no quadro.
- **Achados que valem para a spec:**
  - a abóbora gigante e as abóboras com rosto são malhas de brinquedo arredondadas; o resto do mundo é de blocos;
  - a Lulu precisa de malha própria (cúpula com abertura oval), porque as peças do plano não fazem furo oval;
  - a capa do Dudu também é malha própria, um pano curvo;
  - o brilho somado da lanterninha lavava a calça do Dudu até a cor de pele: luz perto de roupa escura precisa de cuidado;
  - a abertura (fov) das tomadas era ignorada, porque a câmera do jogo copia a dela a cada quadro: o esboço usa `fovFixo`;
  - o túnel tem de ser medido contra o passageiro mais alto (o teste escreve as linhas "FOLGA"; o Bento chega a ~3,55 e o teto está a 4,25).
- **O que ficou fraco (para a spec resolver):**
  - **Barracas:** o toldo lê como faixa de bicos, não como cobertura.
  - **Bento:** o alto do capuz é liso, com pouca franja.
  - **Morceguinho:** o que voa, de longe, vira uma mancha roxa.
  - **Seu Jerônimo:** a faixa de cabelo branco sob o chapéu pode ser lida como faixa.
  - **Vídeos:** a vassoura é filmada de 3/4 de frente (o dono aprovou assim); a parede do túnel passa perto da câmera ao entrar; as lanterninhas do túnel saem cortadas na vista a bordo; a música começa do início nos três.
  - **Vista do alto:** ao longe ainda aparecem morros cortados de outro bioma.
  - **Peças:** são montadas uma a uma, sem fundir; na implementação, fundir e instanciar.
  - **Texturas:** repintam tiles da Vila; a telha roxa, o tijolo torto, a teia e as folhas laranja precisam de id próprio.

**Duas coisas que as fotos do esboço não dizem sozinhas:**
- As fotos `07-panorama-*` são de antes do pedido do dono e ainda mostram a abóbora gigante **de cubos**; o comentário do topo de `fantasias.ts` também. Vale a arredondada (fotos `01-praca-*`, `10-moradores-fila-*`).
- O esboço não mostrou **o Castelinho do Vampirinho, a Loja de Fantasias nem a Casa da Vovó por dentro** (só a fachada da casa, com o caldeirão na varanda). Ver "Perguntas ao dono", 3.

### O jogo hoje (21 nov 2026, `main` 5996d11, com a 035; `VERSAO_REDE` 17)
- **Temas:** cinco (`IdTema` e `IDS_TEMAS` em `src/temas/tipos.ts`; registro em `src/temas/todos.ts`; ordem dos cartões em `ORDEM_TEMAS`, `src/temas/index.ts`). O servidor confere o tema de um mundo novo contra `IDS_TEMAS` e recusa o que não conhece.
- **O núcleo sabe o mundo só pelo estilo:** `mundoAlmaDaPlanta` (`src/jogo/alma.ts`) liga a planta do povoado ao mundo da alma (`'bairro'` é a Vila Neon). As plantas aceitas estão em `PLANTAS` (`src/world/estiloSeguro.ts`): `vila`, `sitio`, `cidade`, `bairro`.
- **Blocos e atlas:** o último bloco é `ALAMBRADO: 116` (limite 255). O atlas tem 16 × 8 = **128 células e 127 estão ocupadas** (contada em 21 nov). A ordem das células é a de `NOMES_TILES` (`src/art/tiles.ts`): os tiles dos blocos na ordem do registro, depois `porta_cima`, depois `TILES_PECAS` (`branco` e os `brilho_*`). Cada tema pode repintar os tiles (`pintores`), e foi isso que o esboço fez com tiles da Vila.
- **Os hashes da 034** (`tests/temas/paridade-cinco.test.ts`), um conjunto por tema: atlas, emissivos, terreno, dados do tema, sons, nomes, textos aplicados e o resto do tema.
- **Abóboras:** `ABOBORA` (65) e `LAMPIAO_ABOBORA` (66) são blocos de todo mundo; o modelo arredondado de brinquedo (`render/blocosBrinquedo.ts`) já existe. O Rancho vende o lampião na banca dele. `FOLHAS_OUTONO` (55) também existe.
- **Peças de fantasia que já existem** (`TipoPeca`): `varinha`, `chapeu-palha`, `capa`, `capa-curta`, `mascara`, `macacao`, `camisa-xadrez`, `colete-lenco`, entre outras.
- **Gestos da 015:** não há abraço.
- **Missões:** `c1` a `c8` (Cidade), `r1` a `r7` (Rancho), `e1` e `e2` (Doce), `f1`, `f2` e `f4` a `f12` (Vila, 51 moedinhas). O ritmo da 023 é testado por mundo em `tests/jogo/alma.test.ts` (nível 2 até a segunda missão; camiseta em 2 sessões; unicórnio entre a 6ª e a 8ª). As missões valem no criativo e na sobrevivência.
- **Progresso de cada criança com objeto único do mundo:** a Vila já resolve isso em `src/nucleo/vilaMissoes.ts` (cada criança tem o progresso dela; o núcleo confere a missão aberta e o alcance; os brinquedos da f10 aparecem só para quem tem a missão aberta).
- **O que a Vila Neon já tem e este mundo reaproveita** (hoje preso à planta `'bairro'` e ao plano da Vila):
  - comprar nas barracas e comer em três mordidas (032: `src/jogo/compra.ts`, `src/nucleo/vilaCompras.ts`, `render/vila/compras.ts`, `render/refeicao.ts`, `jogo/refeicao.ts`), nos dois modos;
  - sentar no brinquedo e ser levado (`src/jogo/parque.ts`, `src/nucleo/parque.ts`: o núcleo é dono das cadeiras);
  - o trilho que o núcleo controla (`src/jogo/rampa.ts`, `render/vila/trilhoSkate.ts`);
  - os patins (aparência `patins`, deslize só no aparelho, `src/jogo/rinque.ts`, e o "Tirar patins" na roda só enquanto calçados);
  - os brinquedos de tocar, a casa por dentro (`render/vila/casa.ts`, `nucleo/casa.ts`), o comando `vila` com saneamento (`nucleo/saneamento.ts`) e o estado `extras.vila`;
  - o guia da 030 (`jogo/guia.ts`, `render/guiaMissao.ts`), os sósias de longe (`render/vila/sosias.ts`) e o retrato do boneco (`render/fotoBoneco.ts`).
- **Comidas e bichos dos outros mundos** (o que não pode repetir): no Doce Reino a maçã vira "Maçã do amor", a torta vira "Doce de abóbora" e o lingote vira "Cocada" (e "brigadeiro granulado" e "massa de chocolate" são blocos); no Rancho a torta também é "Doce de abóbora". O gato de domar é da Cidade ("Gato de rua"); a coruja é a criatura da noite do Rancho; o Doce tem o "Fantasminha de alcaçuz".
- **Nomes repetidos:** "Lulu", "Bento" e "Dudu" também são nomes da plateia da Vila, e "Bento" e "Juca" estão no sorteio do Rancho (ver "O que muda", 6).

## Decisões do dono
- **13 nov 2026:** aprovado como ideia. Entra intercalado na sequência. Começa por esboço.
- **18 nov 2026, à noite:** aprovada a ideia completa ("A ideia aprovada"); vem logo depois da 034 e nasce no nível da Vila Neon.
- **20 nov 2026, o plano do esboço** (as quatro recomendadas):
  - a fantasminha se chama **Lulu**, porque "Lili" já é a guitarrista da Vila Neon;
  - o lençol da Lulu é de capuz, com o rosto do boneco à mostra (fica a cara de boneco do jogo e o sorriso);
  - a vassoura-patinete tem o cabo em pé como guidão, a palha atrás e as rodinhas escondidas: a criança entende que é patinete e que não voa;
  - o Trem das Risadas é ao ar livre, em volta da praça, com um túnel curto e claro.
- **20 nov 2026, durante o esboço:** os sons ("muito bons"); a abóbora gigante arredondada e não de cubos (pedido dele); a vassoura-patinete ("ficou muito bom"); o túnel do trem mais alto ("agora ficou ótimo o trem").
- **20 nov 2026, à noite: esboço aprovado** ("Esboço da 27 aprovado"), depois de ver o Bento e os morcegos refeitos na rodada do revisor. Ele vira spec; o pelo do Bento fica como item a refinar na spec, com versões lado a lado para o dono escolher (recomendação do orquestrador).
  - Decisões pequenas do esboço: o Conde Dudu sem presas; o Tufinho cor de carvão, com focinho e patinhas claros e lacinho laranja (o preto puro some de noite); nenhum letreiro com palavra.
- **21 nov 2026: spec aprovada** ("Aprovada"), com as recomendadas nas seis perguntas:
  1. dez missões: "O desfile" junta a fantasia completa e o desfile com amigos, e entram "Volta de vassoura" e "Tchau, fantasminhas!";
  2. 45 moedinhas (22, 15 e 8 nas três partes), com a banca como está em "Perguntas ao dono";
  3. as casas por dentro se aprovam por fotos no começo da parte 2;
  4. cajuzinho, beijinho e surpresa de uva no lugar da maçã do amor, da cocada e do doce de abóbora;
  5. a varinha faz brilho e uma florzinha que some sozinha em ~4 s, sem criar bloco;
  6. três partes, cada uma publicada inteira.

**Decisões do orquestrador na revisão (21 nov), para o boletim:**
- este mundo não usa os blocos de rua da Cidade e da Vila: tem janela, toldinho e caminho próprios;
- o lampião de abóbora posto vira a peça arredondada em todos os mundos, com o rosto de cada tema (o Rancho mantém a carinha de festa junina; os outros ganham o sorriso de olhos redondos); toca o Rancho: uma linha para o dono, sem tirar nada;
- o toque no fantasminha é o gesto principal da n10; os instrumentos da n8 e o Tufinho já em casa da n5 são cópias na tela de cada criança; a uva se colhe sempre;
- os nomes Lulu, Bento e Dudu ficam (os da Vila e do Rancho não são falados nem lidos pela criança).

## Perguntas ao dono (respondidas em 21 nov: as recomendadas)
Só o que é dele: regra do jogo, economia, a cara do mundo e a ordem. A recomendada vem sempre primeiro.

**1. As missões: dez, juntando "fantasia completa" com o "desfile com amigos"?**
- **(a) Recomendo: juntar as duas numa missão só, "O desfile", e completar as dez com duas missões dos passeios:** "Volta de vassoura" (passar pelos três arcos de lanternas) e "Tchau, fantasminhas!" (no trem, tocar nos fantasminhas do túnel, que acenam de volta, em três voltas). Ver "As missões".
  - Por quê: as duas eram quase a mesma coisa (vestir e desfilar no palco), e uma missão que só se faz com amigo fica parada no quadro de quem brinca sozinha, o que frustra uma criança de 3 anos. No desfile junto, quem brinca sozinha desfila com os moradores; com amigos, todo mundo que está no palco ganha (a ideia de 18 nov continua).
  - E os passeios ganham uma razão para a criança achar a vassoura e o trem.
- (b) As nove da ideia como estão (o desfile com amigos separado, e sozinha ele se faz com os moradores) mais "Tchau, fantasminhas!": dez.
- (c) As nove da ideia mais as duas dos passeios: onze.

**2. Quantas moedinhas o mundo dá, e o que a banca vende?**
- **(a) Recomendo: 45, de 4 ou 5 por missão** (22 na parte 1, 15 na parte 2 e 8 na parte 3). É a média da Vila Neon (51 em 11 missões), e o teste do ritmo da 023 (unicórnio entre a 6ª e a 8ª sessão começando por este mundo) tem de passar.
  - **A banca** (preço fixo, sempre à venda, só coisas deste mundo): telha roxa ×12 por 3; folhas laranja ×8 por 3; teia de barbante ×4 por 3; janela torta acesa ×4 por 4; toldinho listrado ×4 por 4; caldeirão ×1 por 5. O lampião de abóbora não entra: o Rancho já vende.
- (b) 50, cinco por missão, com a mesma banca: um pouco mais rápido; o teste do ritmo diz se ainda cabe.

**3. O Castelinho, a Loja de Fantasias e a Casa da Vovó por dentro não foram esboçados. Como aprovar?**
- **(a) Recomendo: aprovar por fotos no começo da parte 2**, antes de fazer os toques e as missões deles: uma folha com a fachada e o lado de dentro de cada um, de dia e de noite, no padrão do jogo e do esboço aprovado. Se o dono pedir mudança, ela entra ali, sem parar o resto.
  - Por quê: o jeito de desenhar já está aprovado (blocos, abóboras arredondadas, peças da Vila), e a casa por dentro segue a Casa anos 80, que o dono já conhece.
- (b) Um esboço à parte antes da spec seguir, como foi o da praça.

**4. Três comidas da festa já existem em outros mundos. Trocar?**
A maçã do amor e a cocada são do Doce Reino, e o doce de abóbora é do Doce Reino e do Rancho. A regra é "cada tema com o seu conteúdo".
- **(a) Recomendo: trocar as três por docinhos de festa de aniversário brasileira**, que combinam com "festa à fantasia" (nenhum existe em outro mundo; conferido no código):
  - **cajuzinho** no lugar da maçã do amor;
  - **beijinho** no lugar da cocada;
  - **surpresa de uva** no lugar do doce de abóbora (a uva coberta de docinho branco, da parreirinha do Seu Jerônimo).
  - Os três vêm na forminha com três, e um some a cada mordida.
  - O quindim, que combinaria, ficou de fora: "Quindim" já é nome de morador do Doce Reino.
  - **Por que não pé de moleque e canjica** (a primeira ideia): são doces de festa junina, a cara do Rancho Alegre, que vai ganhar barracas na riqueza dele.
  - Ficam o brigadeiro, o chocolate quente e a poção de uva (no Doce Reino, brigadeiro e chocolate são blocos, não comida).
- (b) Manter o cardápio de 18 nov e anotar no backlog que o Doce Reino, quando ganhar barracas, terá outros doces.

**5. A varinha de condão: flor que some ou flor de verdade?**
- **(a) Recomendo: brilhinho e uma florzinha que nasce no chão tocado e some sozinha em ~4 s.** Não cria bloco, então não há regra nova de construção nem disputa entre amigos, e funciona em qualquer lugar do mundo, inclusive nos protegidos.
- (b) Flor de verdade (o bloco de flor que já existe), só onde se pode construir, com limite (ex.: até 20 flores por criança no mundo; a 21ª faz só o brilho).

**6. Confirma as três partes, cada uma publicada inteira** (ver "As três partes")? Recomendo que sim.

**Escolha do dono que vem em foto durante a parte 1 (não é pergunta agora):** o pelo do Bento, em três versões lado a lado (ver "O que muda", 7). Se o dono não escolher no mesmo dia, segue a recomendada (tufos grandes e redondos), para o trabalho não parar; trocar depois é só trocar a versão.

## As três partes
A mesma regra da Vila Neon: **menos recurso, mais acabamento**, uma parte de cada vez, cada uma publicada inteira.

| Parte | O que entra | Missões | Moedinhas | `VERSAO_REDE` |
| --- | --- | --- | --- | --- |
| **1. A vila da festa** | o mundo registrado, o céu, os blocos, o mapa inteiro; a Praça da Abóbora (abóbora gigante, palco, barracas), a Rua das Casinhas Tortas, o Bosque das Lanternas e a Horta; a Casa da Vovó, a Loja e o Castelinho **por fora**, como fachada acabada e de porta fechada; os moradores (com o abraço do Bento), os bichos e as fantasias do tema; comprar e comer; a música e os sons; a banca; a varinha | n1 a n5 | 22 | 18 |
| **2. Por dentro** | a Casa da Vovó por dentro (caldeirão, vassoura na parede, o Tufinho no sofá), a Loja de Fantasias (cabides e espelho mágico), o Castelinho (escorregador em espiral, órgão, quadros que piscam); a banda da festa no palco | n6 a n8 | 15 | 21 |
| **3. Os passeios** | a vassoura-patinete, o Trem das Risadas com o túnel, o carrossel de morcegos e o balanço de teia | n9 e n10 | 8 | 22 |

- **Por que as missões vão junto com os lugares:** "Missões" só aparece na roda quando o mundo é reconhecido pela alma, e um mundo publicado sem missões não é um mundo completo. A parte 1 já sai com cinco.
- **Por que comprar e comer vão na parte 1:** as barracas estão na praça onde a criança nasce, e barraca que não vende é cenário (a lição da Dona Cida, na 032). É quase todo reaproveitamento da 032.
- **Na parte 1, as portas fechadas** da Casa da Vovó, da Loja e do Castelinho não têm placa, lona nem texto de "em breve" (a regra da Vila): a casa da Vovó tem a varanda com o caldeirão e o Tufinho, a loja tem a vitrine com cabides e chapéus, o castelinho tem a torre e as bandeirinhas. Tocar na porta faz a porta balançar e um brilhinho, sem abrir.
- **`VERSAO_REDE`:** os números supõem que nada sobe antes (a 035, já na `main`, ficou no 17). Se outra spec subir antes, cada parte pega o próximo livre. A 039 (os móveis, parte 1) veio antes no backlog e ficou com a 19 (27 nov 2026), e a 039b (os móveis, parte 2) com a 20: as partes 2 e 3 passaram para 21 e 22.

## O que muda
### 1. O mundo registrado
- `IdTema` `'noite-das-fantasias'`, pasta `src/temas/noite-das-fantasias/` (`index.ts`, `ceu.ts`, `criaturas.ts`, `pintores.ts`, `povoado.ts`, `textos.ts`, `vozes.ts`), `registrarTema` em `todos.ts` e o id em `IDS_TEMAS`.
- **O cartão:** nome **Noite das Fantasias**, lema e convite curtos, cores roxo e laranja, a prévia `public/temas/noite-das-fantasias.jpg` (a praça de noite com a abóbora gigante acesa). A Vila Neon continua o padrão e o primeiro cartão; a Noite das Fantasias entra logo depois dela, para a novidade aparecer sem rolar no celular (acabamento do orquestrador).
- **Nenhuma palavra em inglês na tela:** "Halloween" nunca aparece; o mundo diz "festa à fantasia" ou "Noite das Fantasias".
- Os nomes de blocos, itens, bichos, capítulos e missões do diário (`TextosTema`), o sufixo do nome sugerido (`DO_TEMA`, "… da Festa"), `NOMES_TEMAS` na aba de fantasias e as listas escritas à mão dos testes (`e2e/temas.ts`, `trilha.test.ts`, `vozesGravadas.test.ts`, `fantasias.test.ts`, `alma.test.ts`).
- **Planta nova `'baile'`** (`PlantaPovoado` e `PLANTAS` do `estiloSeguro`), e `mundoAlmaDaPlanta('baile') = 'noite-das-fantasias'`, que entra em `MundoAlma` e `MUNDOS_ALMA`. É o único jeito de o núcleo saber que mundo é, como na Vila. O mesmo nome serve ao comando (`baile`) e ao estado (`extras.baile`).
- **No criativo e na sobrevivência, igual à Vila:** comprar e comer valem nos dois modos (no criativo sem conta de fome, e a comida acaba quando é comida, 032); as missões e as moedinhas valem nos dois modos; os blocos e itens deste mundo aparecem no catálogo do criativo só neste mundo.

### 2. O céu: entardecer o dia inteiro e a noite roxa
Vem do esboço (`fantasiasCeu.ts`), aprovado pelo dono:
- **O "dia" é um entardecer laranja dourado** que dura o dia inteiro (o mundo mora no fim de tarde): laranja dourado embaixo, pêssego no meio, lilás no alto. Pólen dourado no ar.
- **A noite é roxa**, com a lua grande e estrelas; o chão continua legível (o piso de luz da noite fica alto, ao contrário da Vila, que escurece o chão no festival). Vaga-lumes mornos.
- **Névoa baixa clarinha**, quase branca com um toque lilás, rente ao chão.
- **Sem arco-íris no céu deste mundo** (cores roxo, laranja e musgo; `climaVisual.arcoIris: false`).
- **As lanternas brilham sem espalhar luz** (como o neon da Vila): nada de luz somada sobre roupa (ver "Achados técnicos").
- **Os interiores** (parte 2) seguem a mesma régua de luz da noite: nunca escuros.

### 3. Os blocos novos e o atlas
**Este mundo não usa os blocos de rua da Cidade e da Vila** (decisão do orquestrador). Ele tem os seus, com id próprio, de 117 a 127:

| Id | Bloco | Onde | Tiles |
| --- | --- | --- | --- |
| 117 | telha roxa (aprovado) | os telhados tortos | 2 (topo e lado) |
| 118 | tijolo torto (aprovado) | casinhas, castelinho | 1 |
| 119 | teia de barbante (aprovado) | as quinas das casinhas e do bosque; bloco de recorte, como a grade; barbante colorido (roxo, laranja e creme), sem aranha | 1 |
| 120 | folhas laranja (aprovado) | as árvores do bosque e da moldura | 1 |
| 121 | tábua musgo | as paredes das casinhas | 1 |
| 122 | **pedrinha lilás** | o chão da praça e **todos os caminhos** (rua, bosque, horta, estação): é o "caminho de pedra" onde a vassoura desliza | 1 |
| 123 | tábua roxa | o palco e o castelinho | 1 |
| 124 | janela torta | as casinhas, apagada (o caixilho torto de cortina) | 1 |
| 125 | janela torta acesa | a mesma, com a luz morna; brilha sem espalhar luz | 1 |
| 126 | toldinho listrado | roxo e laranja (nunca na ordem do arco-íris), sobre as portas e janelas | 2 (topo e lado) |
| 127 | caldeirão | o da varanda e o da banca; desenhado como peça de brinquedo (como o lampião), borbulhando | 2 (topo e lado) |

- São **11 blocos e até 14 tiles**. Os blocos de base que todo mundo tem continuam e são repintados no jeito deste tema (como a Vila faz): grama musgo, folhas musgo, folhas de outono e de bétula nos tons do bosque, pedregulho, lanterna.
- Hoje o esboço repinta tiles **da Vila** (rebocos, lãs, telha colonial, faixa de neon). Isso sai: são blocos só da Vila, e no criativo e nas trocas eles apareceriam com nome e cara trocados.
- **Exclusivos:** os onze blocos e os itens do mundo ganham a entrada `baile` em `src/jogo/exclusivos.ts` (geração, trocas, criativo, receitas e núcleo).

**O atlas sem mexer em nenhum hash da 034:**
- O atlas cresce para **16 linhas** (256 células).
- Os tiles dos blocos 117 em diante entram em `NOMES_TILES` **depois de `TILES_PECAS`**, numa lista própria, e começam na **célula 128** (a primeira da 9ª linha). Para o primeiro tile novo não cair na célula 127, que está vazia, a lista dos tiles novos começa com um tile de enchimento na 127, fora do hash, ou a contagem das células da lista nova começa direto na 128 (a T02 escolhe e testa). Assim `porta_cima`, `branco` e os `brilho_*` não mudam de célula, e as 8 primeiras linhas ficam iguais pixel a pixel.
- O `paridade-cinco` passa a fazer o hash **só das 8 primeiras linhas** do atlas e do mapa emissivo (a leitura muda; o valor gravado não).
- **Os textos e o resto do tema** entram no hash dos cinco **só pelas chaves que já existiam**: os nomes dos blocos 117+ nos textos de base e a entrada `baile` dos exclusivos ficam de fora.
- **Meta: nenhum hash da 034 é gravado de novo.** Um teste novo prova isso: o `paridade-cinco` roda com os mesmos valores, e as 128 primeiras células são comparadas uma a uma com o atlas de antes.

### 4. O mapa e os lugares
Planejador puro `src/world/noiteFantasias.ts`, no caminho de `vilaNeon.ts`: o mapa, o chão, os prédios de blocos e o ponto de cada coisa. O terreno é plano na vila e tem morrinhos baixos de grama musgo só na beira, com uma moldura de árvores laranja, douradas e musgo, e a névoa além delas: **nenhum morro de outro bioma à vista** (o que ficou fraco na vista do alto).

**O mapa** (~130 × 110 blocos, norte para cima; as distâncias exatas saem do planejador e são medidas na T03):
- **No meio, a Praça da Abóbora**, onde a criança nasce, de frente para a abóbora gigante. O palco fica no lado norte da praça, as barracas no lado oeste, mesinhas e bancos em volta.
- **Ao norte, a Rua das Casinhas Tortas**, saindo da praça; a Casa da Vovó é a última, no fim da rua.
- **A leste, a Loja de Fantasias**, de frente para a praça.
- **Ao sul, o gramado da festa**, colado à praça, com o laço do Trem das Risadas e a estaçãozinha; o carrossel de morcegos e o balanço de teia ficam do lado de fora do laço, perto da estação (parte 3; na parte 1, o lugar é gramado acabado com canteiros de abóbora e lanternas).
- **A sudoeste, o Bosque das Lanternas**, e no fim do caminho dele o **Castelinho do Vampirinho**, cuja torre se vê da praça (sósia de longe).
- **A sudeste, a Horta do Seu Jerônimo.**
- **Toda entrada de lugar fica a até 60 blocos de caminho da praça** (contados pelo caminho de pedrinha, não em linha reta; ~15 s a pé a ~4 blocos por segundo).

**O trem "em volta da praça":** a decisão de 20 nov diz "em volta da praça"; o esboço aprovado pôs o laço em volta do gramado colado ao sul dela, para nenhum caminho de quem anda cruzar o trilho. Fica como o esboço. O trilho é cercado por uma cerquinha baixa, e só se entra pela estação.

#### Os lugares, um por um
| Lugar | O que se vê | O que a criança faz | Sons | Parte |
| --- | --- | --- | --- | --- |
| **1. Praça da Abóbora** | a abóbora gigante sorridente (malha de brinquedo arredondada, rosto que acende de noite), o palco de tábua roxa com bandeirinhas roxas e laranja, as barracas, mesinhas, bancos e lanternas; chão de pedrinha lilás | comprar e comer nas barracas; **tocar na abóbora gigante** (ela pisca os olhos e dá uma risadinha); subir no palco; dançar (gestos da 015) | a música da festa mais cheia; o burburinho alegre | 1 |
| **2. Rua das Casinhas Tortas** | casinhas de tábua musgo e tijolo torto com telhado roxo torto, janelas tortas acesas de cortina, teias de barbante nas quinas, lampiões de abóbora nas portas, toldinhos listrados | **tocar a campainha** de cada porta (ding-dong; a porta abre e um morador acena); doces ou travessuras | campainhas, risadinhas de fantasminha, grilo de noite | 1 |
| **3. Casa da Vovó Zuleica** | por fora (parte 1): a varanda com o caldeirão borbulhando, o porta-vassouras e o Tufinho no banquinho. Por dentro (parte 2): a sala com o sofá, o caldeirão grande, a vassoura na parede, prateleiras de potinhos, o relógio de lua | (parte 2) **mexer o caldeirão** (bolhas e o "blub"), pôr as frutas, sentar no sofá, fazer carinho no Tufinho (ronrona) | o borbulhar, o ronrom, a chaleira | 1 e 2 |
| **4. Loja de Fantasias** | por fora (parte 1): a vitrine **só com cabides e chapéus nos suportes** (sem manequim). Por dentro (parte 2): cabides por tipo (chapéu, capa, lençol, máscara de bichinho), o provador e o **espelho mágico** de moldura dourada | (parte 2) tocar no cabide veste a peça; tocar no espelho: a câmera vira para a criança, que se vê com brilhinho; tocar de novo volta | o "plim" de vestir, o brilho do espelho | 1 e 2 |
| **5. Bosque das Lanternas** | o caminho de pedrinha lilás entre árvores laranja e douradas, lanternas de poste, vaga-lumes, os morceguinhos dormindo de cabeça para baixo num galho, a corujinha | **acender cada lanterna com um toque** (fica acesa); tocar nos morceguinhos (eles se espreguiçam e voltam a dormir) | grilo, a corujinha de leve, o "plim" da lanterna acendendo | 1 |
| **6. Castelinho do Vampirinho** | por fora (parte 1): castelinho de brinquedo de tábua roxa e tijolo torto, com a torre, bandeirinhas e janelas redondas acesas. Por dentro (parte 2): o **órgão** de canos, os **quadros** (retratos dos moradores sorrindo, feitos com `render/fotoBoneco.ts`), a escada da torre e o **escorregador em espiral** que desce por fora dela | (parte 2) encostar no órgão toca notas alegres (sempre afinadas, escala maior); **tocar no quadro, ele pisca um olho** (só ao toque); subir a escada e escorregar | as notas do órgão, o "uiii" do escorregador | 1 e 2 |
| **7. Horta do Seu Jerônimo** | a horta cercada com abóboras de brinquedo, as abóboras saltitantes, a bancada de abóboras com carinha, a parreirinha de uva e o canteiro de hortelã, o regador | plantar, regar, colher e escolher a carinha (n4); **colher uva na parreirinha a qualquer hora, desde a parte 1** (um toque, a uva vai para a mão; é a comida do sapinho); colher hortelã (n6) | o regador, as abóboras pulando ("pof") | 1 |

**Cuidados com os lugares:**
- **Densidade como a Vila:** a cada ~10 blocos de caminho, algo para olhar ou tocar (lanterna, abóbora, banco, teia, canteiro, bicho). Nenhum gramado vazio.
- **Peças só onde o jogo já usa:** prédios, árvores e estruturas grandes de blocos; as abóboras são o modelo arredondado do jogo; barracas, palco, lanternas, órgão, trem e brinquedos são peças quadradas de brinquedo, como as da Vila (`render/vila/ref.ts`).
- **A paleta fixa dos objetos coloridos** (os canos do órgão, os potinhos da Vovó, as bolhas do caldeirão, as bandeirinhas, as teias): roxo, laranja, musgo e dourado, sempre alternados nessa ordem ou em duas cores, **nunca na ordem do arco-íris**, sem azul nem vermelho em sequência.
- **Os quadros piscam só ao toque e nunca seguem a criança com o olho.**
- **Nenhum letreiro com palavra** (decisão de 20 nov): as barracas e a loja dizem o que são por desenho (o docinho, a caneca, o chapéu).

### 5. Campo de visão sem buracos
As regras da Vila Neon valem aqui:
- o chão desenhado em volta da praça (48 blocos com a visão padrão) cobre a rua, a loja, as barracas, o gramado da festa e a entrada do bosque e da horta;
- **sósias de longe:** a torre do castelinho e a abóbora gigante (a mais de 48 blocos de quem está na beira), com o próprio pedaço de chão por baixo; somem quando o pedaço de verdade chega;
- peças que não são bloco nascem só quando a malha do pedaço onde ficam está pronta, e saem com ele;
- a névoa vai até a ponta do chão desenhado; da praça, nenhuma borda do mundo aparece;
- a cortina de entrada sai só com o chão dos 48 blocos pronto.

### 6. Os moradores
Todos com o boneco de verdade do jogo (rosto, proporções e plástico), as peças de fantasia presas às juntas (`personagem/bonecoFantasia.ts`) e um posto. O que vem do esboço (`fantasiasGente.ts`), com as correções. **As peças que já existem são reaproveitadas, com cor e símbolo próprios** (`varinha`, `chapeu-palha`, `capa`, `capa-curta`, `mascara`, `macacao`, `camisa-xadrez`, `colete-lenco`); peça nova só onde nenhuma serve (ver "Achados técnicos").

| Morador | Onde fica | O look | O que faz |
| --- | --- | --- | --- |
| **Vovó Zuleica**, a bruxinha boa | na varanda dela (parte 1); na sala, ao lado do caldeirão (parte 2) | chapéu de bruxa de aba mole e ponta caída (peça nova), xale (`colete-lenco` em lilás), vestido musgo, óculos redondos (o acessório que já existe), a `varinha` com a estrela | acena; abre a n5 e a n6; recebe o Tufinho de volta |
| **Tufinho**, o gato dela | no banquinho da varanda (no sofá, na parte 2) | carvão, focinho, peito e patinhas claros, lacinho laranja, olhões amigáveis | ronrona e mia no toque; foge na n5 e segue a criança de volta |
| **Conde Dudu**, o vampirinho com medo do escuro | na entrada do bosque, com a lanterninha | a `capa` roxa de forro laranja com a gola alta (o pano curvo do esboço como variação da `capa`), colete e gravatinha; **sem presas** | treme de leve com o bosque apagado; sorri e acena com o bosque aceso (n2) |
| **Lulu**, a fantasminha tímida | espiando da quina de uma casinha | lençol de capuz com o rosto à mostra (peça nova: cúpula com abertura oval), barra ondulada nos joelhos, mãozinhas de fora | dá risadinha e se esconde (n3) |
| **Bento**, o monstrinho peludo grandão | no palco, com o bumbo | macacão peludo de tufos verde-musgo (peça nova), chifrinhos redondos, pezões; **o pelo vem em três versões para o dono**, todas verde-musgo | **ama abraço** (ver abaixo); toca o bumbo na banda (n8) |
| **Seu Jerônimo**, o dono da horta | na horta, com o regador | `chapeu-palha` com a fita roxa e laranja, `macacao` jeans, `camisa-xadrez`; **o detalhe de festa que o separa da fantasia de fazendeiro do Rancho:** um lenço roxo de festa no pescoço e um broche de abóbora sorridente no peito; **o cabelo grisalho em mechas dos lados e na nuca**, nunca como faixa contínua | empresta o regador e as sementes (n4); vende na Bancada da Horta |
| **Tia Filó** (nova) | na Barraca dos Doces | avental de bolinhas laranja e lenço roxo na cabeça | vende os doces |
| **Seu Olavo** (novo) | na Barraca das Canecas | chapeuzinho de mágico baixo e colete musgo | vende chocolate quente e poção de uva |
| **Moradores das casinhas** | nas portas da rua | fantasias simples do tema (chapéu de bruxa, capa, orelhinha de gato) | abrem a porta na campainha e dão o doce (n1) |

- **O abraço do Bento:** a 015 não tem abraço; ele é feito aqui, numa tarefa própria. Um toque no Bento, de perto: os dois corpos se encontram (o Bento se abaixa um pouco, envolve a criança com os braços, balança de leve 1,2 s e solta), coraçõezinhos sobem. O núcleo manda o abraço como evento (quem, com qual morador), e o amigo que está perto vê os dois abraçados. Um abraço por vez; outra criança espera o fim (0,3 s depois). Nada prende a criança: mexer no controle solta na hora.
- **As três profissões de sempre** (`cozinheiro`, `construtor`, `ferreiro`) ganham nome e desenho do tema, com trocas próprias (`trocas.ts`, `planta: 'baile'`). Os vendedores não abrem a janela de trocas (`semTrocas`, como na 032).
- **Nomes:**
  - Lulu, Bento e Dudu ficam: foram aprovados pelo dono, e os da plateia da Vila e do sorteio do Rancho não são falados nem lidos pela criança. Trocar os de lá mudaria os hashes `povoado` e `nomes` da 034 (não o terreno), sem ganho para quem brinca.
  - **Os nomes novos deste mundo não podem estar em nenhum povoado, nem perto de um** (Tia Filó e Seu Olavo foram conferidos no código); a mesma regra para os moradores das casinhas e das profissões.
- Os testes que passam por todos os moradores (`encaixe`, `moradorFundido`, `moradorPele`, `generoMoradores`) passam com eles.

### 7. O que ficou fraco no esboço, e a correção
| O que ficou fraco | A correção | Como se confere |
| --- | --- | --- |
| **Toldo das barracas** lê como faixa de bicos | um toldo de verdade: o pano listrado inclinado que **cobre o balcão inteiro**, apoiado nos postes da frente, com caimento, e os bicos só na beirada da frente; visto de baixo, o forro claro | um revisor novo, só com as fotos de frente e de 3/4, diz "cobertura" sem ajuda |
| **Bento:** o alto do capuz liso, pouca franja | tufos também no alto do capuz e uma franja que cai na testa, sem tapar os olhos. **Três versões lado a lado, todas verde-musgo** (tufos grandes e redondos, a recomendada; tufos miúdos e cheios; mechas compridas que balançam), nas mesmas tomadas, de dia e de noite | o dono escolhe (ou segue a recomendada, se ele não escolher no dia); o revisor confere que a escolhida não lembra nenhum monstro peludo conhecido |
| **Morceguinho voando, de longe,** vira mancha roxa | silhueta que se lê: asas maiores e mais abertas no voo, com a borda lilás clara e a barriga creme; os olhinhos claros; voo mais baixo e mais perto do caminho; de longe, uma versão simples com o mesmo contorno claro | foto a 15 blocos, de noite: o morcego se reconhece (revisor novo) |
| **Seu Jerônimo:** o cabelo branco sob o chapéu lê como faixa | mechas grisalhas dos lados e na nuca, sobrancelhas grisalhas, o chapéu assentado um pouco mais baixo; nenhuma linha branca contínua em volta da cabeça | foto de frente, de lado e de costas |
| **Vídeos:** a parede do túnel perto da câmera; as lanterninhas cortadas a bordo; a música do começo nos três | no jogo, a câmera de quem está no trem passa pelo túnel sem raspar (o túnel tem largura para ela, ou ela chega mais perto do boneco ao entrar, como na câmera apertada); as lanterninhas ficam no campo de visão de quem vai sentado; nos vídeos, a música é a trilha do jogo, que continua de onde estava. A vassoura continua filmada de 3/4 de frente (aprovado) | o vídeo a bordo de ponta a ponta, deitado e em pé |
| **Vista do alto:** morros de outro bioma ao longe | o planejador põe a moldura própria (morrinhos baixos de grama musgo e árvores do tema) e a névoa além; nada de bioma alheio dentro da visão máxima (8 pedaços) | foto do alto com a visão 8, nos quatro rumos |
| **Peças** montadas uma a uma | fundidas por pedaço e instanciadas (o que se repete é uma malha só), como `render/vila/index.ts` | as chamadas de desenho do pior caso (ver "Experiência medida") |
| **Texturas** repintando tiles da Vila | os onze blocos com id próprio (seção 3) | teste de exclusivos e de atlas |

### 8. Os bichos
Os cinco papéis com a cara do tema (`cobertura`, `encaixeBicho`, `juntasBicho`, `bichoBrinquedo`), no padrão dos bichos do jogo (montador `bicho(k)`, o plástico de sempre), nenhum repetido de outro mundo:
- **abóbora saltitante** (no lugar do cervo): de perninhas curtas, pula na horta e no gramado;
- **morceguinho** (no lugar do coelho): de asa redonda e carinha sorrindo, voa baixinho; os do bosque dormem de cabeça para baixo;
- **sapinho de chapeuzinho** (no lugar da raposa, o bicho de domar): sapinho verde-musgo de olhos grandes e um chapeuzinho pontudo roxo, pula atrás de quem tem **uva** na mão (a uva da parreirinha). Entra no lugar do gatinho de lacinho, que confundia com o Tufinho na n5 e repetia o gato da Cidade;
- **peixinho lilás** (no lugar do peixe), no laguinho do bosque;
- **fantasminha de lençol pastel** (no lugar do espectro): brilha de leve e flutua, **manso** (`noite: 'mansa'`), nunca ataca e nunca dá susto. Outro desenho e outro nome que o "Fantasminha de alcaçuz" do Doce Reino (de bala); o revisor do portão confere que não se parecem.
- **A corujinha** do galho do bosque é um **modelo próprio**, e não a coruja do Rancho repintada: corujinha lilás e creme, redondinha, com um cachecol laranja, que vira a cabeça devagar (enfeite, não é bicho de papel).
- **Os vaga-lumes** do bosque são do céu (partículas), nunca guia: o guia da missão é só a trilha e a plaquinha (030).

### 9. Comprar e comer (parte 1)
O desenho da 032, igual: "Toque para comprar", a fichinha dourada de mentirinha (de graça; se o dono decidir outro jeito na 032, vale aqui), o preparo, a entrega, o lanche na mão e na barrinha; uma compra por vez; no máximo 3 de cada; barrinha cheia não perde nada.

O cardápio abaixo é o recomendado na pergunta 4. Se o dono escolher manter o de 18 nov, a maçã do amor (mordida), a cocada (mordida) e o doce de abóbora (colherada) entram no lugar do cajuzinho, do beijinho e da surpresa de uva.

| Barraca | Quem | O que vende | Como se come |
| --- | --- | --- | --- |
| **Barraca dos Doces** (praça) | Tia Filó | brigadeiro, beijinho, cajuzinho | a forminha com três, um some a cada mordida (o jeito da pipoca) |
| **Barraca das Canecas** (praça) | Seu Olavo | chocolate quente, poção de uva com canudinho | chocolate quente: **gole de caneca** (jeito novo: a caneca sobe, o nível desce, sai fumacinha); poção: canudinho |
| **Bancada da Horta** | Seu Jerônimo | surpresa de uva | a forminha com três |

- **A sacola de doces** da n1 também se come: um docinho sai a cada mordida (o jeito da pipoca) e a sacola vazia some com brilhinho.
- **A poção da Vovó** (n6) é o mesmo copo de poção de uva, com canudinho.
- **Generalizar, não copiar:** `compra.ts` e `vilaCompras.ts` passam a ler os balcões do mundo pela planta (`'bairro'` ou `'baile'`), e a Vila continua igual (os testes da 032 sem mudança).
- Todas as comidas são só deste mundo.

### 10. As missões
No cartão da 031 (esquerda → direita), com o guia da 030: a trilha de pegadinhas e a plaquinha do alvo, o ✓ do núcleo e as moedinhas no fim. **O quadro nunca abre sozinho**; "Missões" e o baú moram na roda. **Moedinhas só no fim de cada missão, nunca por ação.** Ids `n1` a `n10`. A lista abaixo é a recomendada na pergunta 1; se o dono escolher outra, só esta tabela muda.

| | Cartão | Por onde passa | Moedinhas | Parte |
| --- | --- | --- | --- | --- |
| **n1 Doces ou travessuras** | a sacola vazia + a campainha → a sacola cheia | as cinco portas da rua (a da Vovó é uma); cada campainha: a porta abre, o morador põe um doce na sacola. Numa das portas, a "travessura": um fantasminha solta confete de folhinhas com risadinha, e o doce vem igual. Nada de susto | **5** | 1 |
| **n2 O Conde Dudu tem medo do escuro** | a lanterna apagada + o Dudu → o bosque aceso com o Dudu sorrindo | as cinco lanternas do caminho do bosque, um toque em cada; vale de dia e de noite (nunca esperar a noite) | **4** | 1 |
| **n3 Esconde-esconde com a Lulu** | a Lulu + a risadinha → a Lulu achada, rindo | três esconderijos, um de cada vez (atrás da abóbora gigante, na quina de uma casinha, atrás de uma árvore do bosque). A trilha leva até perto; nos últimos blocos, a risadinha fica mais alta e a ponta do lençol aparece. Achou: ela pula com os braços para cima | **4** | 1 |
| **n4 Abóbora de carinha** | a semente + o regador → o lampião sorrindo na porta | a horta (plantar no canteiro marcado, regar: o broto vira abóbora em ~5 s, colher), a bancada (escolher uma de três carinhas, todas de olhos redondos: sorriso, língua de fora, piscadinha) e a porta da Vovó (pôr o lampião) | **5** | 1 |
| **n5 O gato da Vovó sumiu** | o Tufinho + as patinhas → o Tufinho no colo da Vovó | da varanda, as patinhas do Tufinho pela rua até a horta, onde ele brinca com as abóboras saltitantes; um toque chama (miado) e ele segue a criança de volta até a Vovó, como a lhama segue o feno | **4** | 1 |
| **n6 A poção da Vovó** | o caldeirão + uva, maçã e hortelã → o copo de poção | a parreirinha e o canteiro de hortelã da horta, a macieira do quintal da Vovó e o caldeirão da sala; cada fruta no caldeirão faz bolhas (na paleta fixa); no fim sai o copo de poção | **5** | 2 |
| **n7 O desfile** | o espelho + o cabide → a criança fantasiada no palco, com aplausos | a loja (vestir uma fantasia do cabide; quem já está fantasiada só se vê no espelho), o espelho mágico, e o palco da praça (andar até a ponta). Sozinha, a Lulu, o Dudu e o Bento desfilam junto; com amigos, **todos os fantasiados que estão no palco fazem a missão juntos**, cada um com as suas moedinhas | **5** | 2 |
| **n8 A banda da festa** | o bumbo + os instrumentos → a banda tocando, todos dançando | três instrumentos, um em cada lugar de dentro (o pandeiro na Casa da Vovó, o chocalho de abóbora na loja, o xilofone no castelinho); levar ao palco; o show começa: o Bento no bumbo, a banda e todos os moradores dançando, como no festival da Vila. Vale a qualquer hora | **5** | 2 |
| **n9 Volta de vassoura** | a vassoura + o arco de lanternas → os três arcos acesos | o porta-vassouras da varanda da Vovó e os três arcos de lanternas da rua e da praça; passar de vassoura por eles acende cada um | **4** | 3 |
| **n10 Tchau, fantasminhas!** | o vagãozinho + a mãozinha acenando → os três fantasminhas do túnel acenando de volta | o Trem das Risadas: em cada volta, na passagem perto do túnel, **tocar num fantasminha das janelinhas**; ele acena de volta, e isso conta. O tchau da roda de gestos também conta, se a criança usar. A dica no túnel é desenho (a mãozinha tocando o fantasminha), nunca texto. Cada volta com um toque é uma bolinha, três voltas | **4** | 3 |

- **Total: 45 moedinhas** (pergunta 2). O ritmo da 023 é testado para este mundo.
- **Missões de lugares** (n1, n3, n4, n5, n6, n8): cada passo uma bolinha, não voltam no bis. **De ação** (n2, n7, n9, n10): voltam no bis.
- **O alvo de cada missão** em `alvoDaMissao` (`jogo/guia.ts`), com a busca de caminho deste mundo. **Na n5, as pegadinhas da trilha viram patinhas de gato** (o mesmo verde-água): uma trilha só na tela, nunca duas.
- **Desenhos das missões** legíveis a 28 px; o baú com o desenho e a cor do mundo; a banca da pergunta 2.

#### O progresso de cada criança com os objetos únicos do mundo (n1 a n5)
Os objetos destas missões são um só no mundo (a porta, a lanterna, a Lulu, a abóbora da porta, o Tufinho), mas cada criança tem o progresso dela, como em `src/nucleo/vilaMissoes.ts`. O núcleo confere a missão aberta, o passo e o alcance de cada toque. A regra, missão por missão:
- **n1 (as portas):** cada criança tem a lista das portas dela. O toque na campainha conta para quem tocou, se ela tem a n1 aberta e aquela porta ainda não é dela; a porta abre e fecha para todos verem (2 s), e o doce vai só para a sacola de quem tocou. Tocar numa porta que um amigo acabou de abrir conta do mesmo jeito.
- **n2 (as lanternas):** as lanternas acesas são do mundo, para todos. Uma lanterna **já acesa** conta para quem tem a n2 aberta quando ela toca nela: a lanterna pisca e acende a bolinha dela. O Dudu sorri para cada criança que completou.
- **n3 (a Lulu):** a Lulu de cada criança é o progresso dela. A Lulu escondida é uma cópia que só aparece na tela de quem tem a n3 aberta, no esconderijo do passo dessa criança (como os brinquedos da f10); a Lulu de verdade continua no posto dela, espiando, para todos. Achar conta só para quem achou.
- **n4 (a abóbora e a porta):** a planta do canteiro marcado é de cada criança (só na tela de quem tem a n4 aberta, no passo dela). **Pôr o lampião na porta** conta para quem põe e para quem também tem a n4 no último passo a até 4 blocos da porta. O lampião da porta é um só no mundo; o último posto fica.
- **n5 (o Tufinho):** o gato é um só. Ele foge para a horta quando alguém abre a n5 e ele está em casa. Segue uma criança por vez (a que chamou). **A entrega conta para quem está perto:** quando ele chega à Vovó, todas as crianças com a n5 aberta a até 6 blocos dela fazem o passo. **Se ele já está em casa** (depois da entrega de um amigo) e outra criança está num passo anterior da n5, na tela dela ele volta a estar "fugido" na horta: é uma cópia só na tela dela, como a Lulu, e é essa cópia que segue a criança de volta; o Tufinho de verdade fica com a Vovó para os outros.
- **O que volta quando a missão é escolhida de novo nunca apaga o que é do amigo:** as lanternas só se apagam no começo da n2 se ninguém mais na sala tem a n2 aberta; o Tufinho de verdade só foge de novo se está em casa e não está seguindo ninguém (senão, a cópia); o lampião da porta, as portas e a Lulu do amigo não mudam.
- **Testes de dois jogadores** no núcleo (aparelho e modo nuvem), um por missão: os dois na mesma missão, um adiantado e outro atrasado, e um que escolhe de novo enquanto o outro está no meio.

**n6 a n10 seguem a mesma regra de cada criança:** as frutas da n6 e a fantasia da n7 são de cada uma; **na n8, o instrumento é uma cópia na tela de cada criança**, como a Lulu, e o que ela pega não some para o amigo; **na n9, o arco já aceso conta para quem passa de vassoura e pisca**, como a lanterna da n2; na n10, o fantasminha acena para quem tocou, e cada criança tem as voltas dela. Testes de dois jogadores na T29 e na T36.

### 11. Os passeios (parte 3)
| Passeio | Como é | Justo no multijogador |
| --- | --- | --- |
| **Vassoura-patinete** | o cabo em pé é o guidão (pegadores roxos), a palha deitada é o deque onde vai um pé, as rodinhas escondidas; rastro de estrelinhas douradas e lilases. **A mesma velocidade máxima de andar**; ao soltar o controle, desliza ~0,5 s **só na pedrinha lilás** (a praça e os caminhos); virar é direto; **nunca cai, nunca voa**; degrau e escada como andando | como os patins: o deslize é só animação no aparelho, a posição é a de sempre, do núcleo; o único estado novo é a aparência (`vassoura: true`, com saneamento); some ao sair do mundo |
| **Trem das Risadas** | a locomotiva de abóbora com chaminezinha e fumacinha clara, três vagõezinhos abertos (roxo, laranja e musgo), o laço em volta do gramado da festa e o túnel curto e claro (arcos de tábua roxa e laranja, aberto, com lanterninhas acesas), onde fantasminhas sorridentes aparecem nas janelinhas e acenam. Um toque na estação senta; a volta leva ~30 s; no fim desce do lado da estação; "sair" desce na hora, na estação mais perto | o núcleo é dono das cadeiras e de onde o trem está (o caminho do parque da Vila); dois amigos cabem no mesmo vagão |
| **Carrossel de morcegos** | morceguinhos de montar, de asa aberta e sorriso, sobem e descem enquanto o carrossel gira, com a música de realejo da festa | o mesmo do carrossel da Vila |
| **Balanço de teia** | um balanço redondo de corda trançada (o desenho de teia, sem aranha), pendurado num pórtico de tábua; cabem três; balança sozinho, devagar | o núcleo é dono dos lugares e do balanço |

**A vassoura, em detalhe:**
- **Pegar:** um toque no porta-vassouras da varanda da Vovó pega; outro toque ali devolve. É de graça.
- **Parar de andar nela longe do porta-vassouras:** como o "Tirar patins" da Vila, a roda do menu ganha **"Guardar vassoura"** só enquanto a criança está nela; a vassoura some com brilhinho e a criança anda a pé. Para pegar de novo, o porta-vassouras.
- **"A Bruxinha já vem com ela":** neste mundo, vestir a fantasia de Bruxinha ou Bruxinho já põe a criança na vassoura (como a Patinadora já calça os patins na Vila). "Guardar vassoura" tira só a vassoura; a fantasia fica. Fora deste mundo a fantasia vem sem vassoura.
- **Onde desliza:** só sobre a pedrinha lilás (bloco 122). Na grama, na terra da horta e no tablado do palco ela anda sem deslizar.
- **Dentro das casas e do castelinho** a vassoura vai para a mão (a criança anda); na porta, volta.

- **Generalizar, não copiar:** o "sentar no brinquedo" (`jogo/parque.ts`, `nucleo/parque.ts`) passa a servir aos brinquedos de mais de um mundo; o trem é um brinquedo de cadeiras num trilho; os testes do parque da Vila continuam iguais.
- **O túnel é medido contra o passageiro mais alto** de qualquer aparência possível sentada no vagão (todas as fantasias, chapéus, cabelos e os premium da 023, como o chifre do unicórnio), e não só contra o Bento.

### 12. Itens só deste mundo
- **Sacola de doces** (n1; vira comida).
- **Lanterna de abóbora:** é o `LAMPIAO_ABOBORA` (66), que já existe em todo mundo. Neste mundo ela vem da n4 (o lampião da porta). Ver o item 13.
- **Varinha de condão:** vem com a fantasia de Bruxinha e fica no cabide da loja (de graça). **Como a criança usa:** com a varinha na mão, o toque no chão (ou o clique, no computador) é a ação dela, como comer é a da comida: a mão sobe, a estrela brilha e o efeito sai no ponto tocado, a até 5 blocos. O efeito é o da pergunta 5: na recomendada, brilhinho e uma florzinha que nasce e some sozinha em ~4 s, vista pelos amigos (o núcleo repassa o toque como evento, sem estado salvo); na outra, a flor de verdade com limite.
- **Caldeirão** (bloco 127; banca): pôr onde quiser; borbulha.
- **Vassoura-patinete** (parte 3), **os instrumentos** da banda (parte 2) e **as comidas** da seção 9.

### 13. O lampião de abóbora em todos os mundos (decisão do orquestrador)
- **O lampião posto** passa a ser a peça arredondada em todos os mundos, com o mesmo bloco 66 (nada muda no terreno, no salvamento nem na rede).
- **A peça lê o rosto do tema:** o Rancho mantém a carinha de festa junina dele; este mundo e os outros ganham o sorriso de olhos redondos. O mesmo rosto vale no ícone, na mão e no item caído.
- **Instanciados por pedaço:** o lampião e o caldeirão postos são uma malha só por tipo, desenhada várias vezes em cada pedaço, porque a criança pode pôr muitos.
- **Toca o Rancho**, que tem e vende o lampião: a peça arredondada é uma melhora, sem tirar nada, e entra para o dono numa linha do boletim.
- **Testes:** o lampião do Rancho continua aceso, com a mesma luz (a mesma cor e o mesmo raio de antes) e a carinha dele; cem lampiões e cem caldeirões postos num pedaço somam no máximo duas chamadas de desenho a mais.

### 14. As fantasias do tema (017)
De graça, como todas as fantasias dos temas, só na aba deste mundo (`NOMES_TEMAS`), reaproveitando as peças que existem:
- **Bruxinha / Bruxinho:** chapéu de bruxa (peça nova), `capa-curta` roxa, a `varinha`; neste mundo, com a vassoura;
- **Vampirinha / Vampirinho:** a `capa` de gola alta com forro laranja, colete e gravatinha; sem presas;
- **Fantasminha:** o lençol de capuz com o rosto à mostra (peça nova), a barra ondulada;
- **Monstrinho Peludo:** o macacão de tufos com chifrinhos e pezões (o pelo escolhido para o Bento).
- **Máscaras de bichinho** (a `mascara`, de gatinho e de morceguinho, olhos grandes e sorriso) nos cabides da loja; nenhuma máscara de cara feia.
- O teste de encaixe da 017 (nada solto, nada atravessando) com todas as peças novas, em todos os modelos, corpos e cabelos.

### 15. Música e sons
- **A trilha do mundo em camadas** (base, entardecer, noite, amigos, andar), gravada da partitura aprovada (`referencia/fontes/compor_noite.py`) com o mesmo caminho da 019 (FluidSynth e FluidR3_GM), em `public/sons/pacotes/noite-das-fantasias-musica.mp3`.
- **As vozes e os sons** aprovados pelo dono ("muito bons"), de `referencia/fontes/sons_noite.py`: campainha, risadinha da fantasminha, miado do Tufinho, morceguinho, lanterna acendendo, abóbora pulando, apito do trem. Mais os que faltam, no mesmo jeito: o borbulhar do caldeirão, as notas do órgão, o bumbo do Bento, o "uiii" do escorregador, a vassoura no caminho, o coaxinho do sapinho, o abraço.
- **Ambiente por lugar**, cruzando suave (~1,5 s), nunca dois altos ao mesmo tempo: praça (a festa), rua (campainhas e risadinhas), bosque (grilo e corujinha), horta (regador e abóboras), castelinho (o órgão de leve).
- **Nunca de terror:** escalas maiores, nada de órgão sombrio, grito, trovão ou risada de bruxa malvada.
- A régua de volume da 019 (música abaixo dos efeitos e das vozes) e as metas de tamanho (menos de 2 MB de download e menos de 15 MB de memória por pacote).
- Sem camada de perigo (a noite é mansa).
- **O hash `sons` dos cinco não muda:** o pacote novo entra no índice, e o hash dos cinco lê só a entrada deles, a comum e as regras de antes; o que muda no índice com um tema a mais (a ordem e os totais) é lido sem a entrada deste mundo. Se a leitura não der para separar, a T00 grava a prova de que só esses campos mudaram.

## Achados técnicos do esboço, e o que fazer com eles
- **Malhas arredondadas só para as abóboras e o caldeirão:** a abóbora gigante, as de rosto e o lampião são o modelo de brinquedo do jogo; todo o resto é bloco ou peça quadrada de brinquedo. Nenhuma forma lisa nova (a regra do esboço que segue o visual do jogo).
- **Peças novas só onde nenhuma serve:** o chapéu de bruxa, o lençol de capuz (a cúpula com a abertura oval, malha própria) e o macacão de tufos do Bento. A capa do Dudu é a `capa` que já existe, com o pano curvo da gola como variação dela. Tudo feito uma vez e reaproveitado pelos moradores e pelas fantasias da criança.
- **Luz perto de roupa escura:** as lanternas e a lanterninha do Dudu brilham sem luz que soma na roupa (material que brilha, sem luz pontual), como o neon da Vila.
- **`fovFixo` era só do esboço:** no jogo vale a câmera do jogo. As fotos do portão visual usam a abertura da câmera do jogo e enquadram mudando a posição, nunca a abertura.
- **O túnel com a prova "FOLGA":** o teste do esboço vira teste de verdade (seção 11).
- **O que se aproveita do código do esboço** (que não entra na `main`; lê-se com `git show esboco/027-noite-das-fantasias:src/esboco/<arquivo>`):
  - `fantasiasCeu.ts`: os quadros do céu, o céu, a névoa, as partículas e os pintores, que passam a pintar os tiles **próprios** do mundo;
  - `fantasiasPecas.ts`: o desenho das barracas (com o toldo refeito), do palco, das lanternas e das peças da praça, que viram peças do mundo fundidas por pedaço;
  - `fantasiasGente.ts`: as peças de fantasia dos moradores (com as correções da seção 7);
  - `fantasiasBichos.ts`: o Tufinho, os morceguinhos, os fantasminhas e as abóboras saltitantes (a coruja do esboço, que era a do Rancho, não);
  - `fantasiasPasseios.ts`: o desenho da vassoura e da pose de quem anda nela, a locomotiva de abóbora, os vagões, os arcos do túnel e a conta da folga;
  - `e2e/esboco-fantasias.spec.ts` e `esboco-fantasias-palco.ts`: as tomadas, que viram o teste de fotos do portão visual de cada parte.
- **O que não se aproveita:** o palco à parte e a API `window.__fantasias`, o `fovFixo`, o mundo-base da Vila (semente 1337, platô aplainado), os tiles da Vila repintados e as peças montadas uma a uma.

## Impacto no multijogador
- **Servidor autoritativo:** tudo o que muda o mundo ou a alma passa pelo núcleo (`src/nucleo/`), igual no aparelho e na nuvem, com o estado novo em `extras.baile` (opcional nos mundos antigos):
  - parte 1: as portas de cada criança, as lanternas acesas, o passo da Lulu de cada criança, a planta de cada criança e o lampião da porta, o Tufinho (onde está, quem ele segue), as compras, o abraço (evento) e a varinha (evento);
  - parte 2: o caldeirão, as peças vestidas na loja, os instrumentos e a banda, o órgão (as notas tocam para todos na sala), o escorregador (um trilho do núcleo, como a rampa de skate);
  - parte 3: as cadeiras do trem, do carrossel e do balanço, e onde estão.
- **Comando `baile`** com saneamento em `saneamento.ts`, limite de toques por segundo e teste no modo nuvem (`confiar: false`), no caminho do comando `vila`. O que é generalizado (comprar, sentar no brinquedo) não muda o comando `vila` da Vila Neon.
- **A previsão no cliente** usa a mesma função do núcleo, para nada piscar.
- **`VERSAO_REDE` sobe uma vez por parte** (a parte 1 saiu na 18; a 19 ficou com a 039 e a 20 com a 039b, então as partes 2 e 3 vão na 21 e na 22), porque cada parte traz comandos, eventos ou estado novos:
  - parte 1: o tema novo em `IDS_TEMAS` (um servidor antigo recusaria criar o mundo), a planta `'baile'`, os blocos 117+, `MundoAlma`, as missões n1 a n5, o comando `baile`, o abraço, a varinha, as comidas e as fantasias na aparência;
  - parte 2: a casa, a loja, o castelinho, a banda e n6 a n8;
  - parte 3: as cadeiras dos passeios, a `vassoura` na aparência e n9 e n10.
- **Publicar:** o servidor sai antes do site, em toda parte (o `servidor.yml` espera ninguém estar jogando; com gente jogando, cancelar o `publicar.yml`, disparar o `servidor.yml` com `agora: true` e depois o `publicar.yml`). Cliente antigo vê "Tem uma versão nova do jogo".
- **A paridade continua 36 de 36:** as sessões gravadas são do Rancho e do Doce e não passam por este mundo; o planejador só existe com os povoados ligados. **Nenhum hash da 034 é gravado de novo** (seção 3, e "o hash `sons`" na seção 15). O lampião arredondado (seção 13) é só desenho: não muda terreno, atlas nem salvamento.
- **Hash do mundo novo entre as partes:** ao fechar cada parte, um hash do terreno e do povoado deste mundo (3 sementes, com os povoados ligados) entra no teste de paridade dos temas. Ele vale **só fora dos lotes que a parte seguinte mexe** (o interior da casa, da loja e do castelinho para a parte 2; o gramado da festa para a parte 3), e o que muda de propósito na parte seguinte fica listado no teste, com o motivo. Assim a parte 2 não muda a parte 1 sem querer.
- **Nada de dado novo:** nenhuma digitação, só toques e frases prontas (LGPD).

## Experiência medida (para não frustrar)
Medido no computador do dono, na placa de vídeo (`scripts/e2e-gpu.sh`), em cada parte.
- **Carregar:** do toque no cartão até a cortina sair, no celular (CPU 4× mais lenta), **não mais que 10% acima da Vila Neon** medida na mesma rodada (a T00 grava a da Vila).
- **Ver o que fazer em 10 s:** ao nascer, a abóbora gigante e uma barraca à vista (20 de 20 sementes).
- **Caminho:** toda entrada de lugar a até 60 blocos de caminho da praça (o planejador mede pelo caminho de pedrinha).
- **Quadros:** 60 no computador; no celular com a CPU 4× mais lenta, **45 no pior caso** (a praça de noite com a abóbora acesa, as barracas, o palco com a banda, o trem passando, todos os moradores) e **60 nos outros lugares**, de dia e de noite. No pior caso, até **250 chamadas de desenho e 450 mil triângulos** (o pior caso da Vila é 232 e 436 mil). Se não couber, primeiro saem metade dos vaga-lumes e do confete; depois os fantasminhas da rua param de flutuar de longe.
- **Toque:** todo alvo de toque com pelo menos 80 px (031); o que foi tocado responde (som ou brilho) em até 100 ms; nenhum toque perdido nas campainhas, lanternas, órgão e barracas.
- **Missões no ritmo de criança, com o guia:** a trilha nasce em até 300 ms; o primeiro ✓ em até 1 minuto depois de escolher; cada missão em até 3 minutos; as cinco da parte 1 em até 12 minutos.
- **O quadro nunca abre sozinho** ao entrar no mundo (teste de tela).
- **Comprar e comer:** os números da 032 (1,6 ± 0,2 s do toque até a mão; três mordidas que se veem; a comida nunca atravessa o rosto, também com o chapéu de bruxa e o capuz da fantasminha).
- **Vassoura:** velocidade máxima igual à de andar (medida); deslize de 0,5 ± 0,1 s só na pedrinha lilás e nenhum fora dela; nenhum tombo; a posição no aparelho nunca se afasta mais de 0,3 bloco da do núcleo.
- **Trem:** folga de pelo menos **0,5 bloco** entre o teto do túnel e o passageiro mais alto possível (linhas "FOLGA" do teste); a câmera a bordo nunca atravessa a parede do túnel.
- **A noite nunca escura** (fotos de noite, nas três telas, em cada lugar, por fora e por dentro):
  - **a conta:** a luminância de cada pixel é 0,2126 R + 0,7152 G + 0,0722 B, com R, G e B do pixel da foto divididos por 255 (sem linearizar);
  - **a área do chão:** os pixels onde o raio da câmera acerta um bloco de chão (o teste pega o chão pela cena, não pela cor), sem o HUD;
  - **a meta:** a mediana da luminância do chão acima de 0,25;
  - **"parte grande":** nenhum quadrado com lado de 10% da largura da tela (128 px a 1280×720) com a luminância média abaixo de 0,1.
- **A calça do Dudu de noite:** a distância de cor (ΔE CIE76, em Lab) entre a cor média da calça e a cor da pele dele, nas fotos de noite perto da lanterninha, é de pelo menos 20.
- **Nada que assuste, medido:**
  - os fantasminhas nunca aparecem de repente: ficam à vista de longe (brilho leve que se lê a 30 blocos de noite) e nunca surgem a menos de 8 blocos da criança de trás de uma parede ou árvore; flutuam a no máximo 0,5 bloco por segundo e nunca vêm na direção dela;
  - os quadros piscam só ao toque e os olhos deles não seguem a criança;
  - os interiores passam na mesma conta da noite.
- **Volume:** a régua da 019. **Nenhum som acima de -12 LUFS momentâneo**, medido com ebur128 em dois lugares: no arquivo de cada som e da música (a amostra aprovada chega a -12,8), e na saída do jogo gravada com o volume padrão, a 2 blocos da fonte de cada som e no meio da praça com a banda tocando.
- **Nada tapa o HUD** com o quadro, a banca, a compra e a festa abertos, nas três telas (1280×720, 844×390, 390×844).
- **Portão visual de cada parte:** fotos em pé de dia (entardecer) e de noite, e deitado, a 390×844, 844×390 e 1280×720, de cada lugar, morador, bicho, passeio e momento de missão da parte; autocrítica e uma rodada de refazer; um revisor novo só com as fotos; o orquestrador confere as principais antes de publicar.
- **Rodada em família** depois de cada parte publicada.

## Cuidados (crianças e legais; ver `.sdd/cuidados-legais.md`)
- **Nada que assuste:** sem caveira, sangue, osso, aranha, olho triangular bravo, presas, susto repentino, grito, som alto de terror ou escuro total. A "travessura" é confete e risadinha. Os fantasminhas sempre sorriem (ver as medidas acima).
- **Arte e música originais**, feitas no projeto. Nenhum personagem conhecido: a Lulu não lembra nenhum fantasminha de desenho; o Conde Dudu não lembra nenhum conde vampiro de marca (de cereal ou de desenho); o pelo do Bento não lembra nenhum monstro peludo conhecido (verde ou azul, de chifrinhos). O revisor do portão visual confere isso.
- **Sem arco-íris** em roupa, comida, copo e enfeite (a paleta fixa da seção 4); o céu deste mundo também fica sem.
- **Nomes sensíveis:** o gato é o Tufinho (nunca "Pretinho"); nenhum nome que soe preconceituoso.
- **Moedinhas:** só no fim da missão, mostradas antes; banca com preço fixo; a fichinha das barracas é de mentirinha; as fantasias e a vassoura são de graça. Nada de "compre agora", contagem ou escassez.
- **Nome do mundo:** "Noite das Fantasias" entra na mesma busca de marca da 028 antes de ir para as lojas (não segura o site).
- **Conteúdo do tema:** tudo o que é deste mundo fica neste mundo; nenhuma comida, bicho ou bloco repetido de outro mundo (salvo os de base e o lampião).

## O que muda em relação ao aprovado
- **As missões:** "fantasia completa" e "desfile com amigos" juntas em "O desfile", mais "Volta de vassoura" e "Tchau, fantasminhas!" (se o dono aceitar a pergunta 1).
- **As comidas:** cajuzinho, beijinho e surpresa de uva no lugar da maçã do amor, da cocada e do doce de abóbora, que já são de outros mundos (se o dono aceitar a pergunta 4).
- **A uva da parreirinha** se colhe a qualquer hora desde a parte 1 (a ideia só a usava na poção), porque o sapinho segue quem tem uva.
- **A varinha:** a florzinha some em ~4 s (se o dono aceitar a pergunta 5).
- **A lanterna de abóbora** não é só deste mundo: é o lampião que todo mundo tem, agora arredondado em todos, com o rosto de cada tema (seção 13). O que é só deste mundo é o lampião da porta, da n4.
- **O trem** fica em volta do gramado colado à praça, como no esboço aprovado, e não em volta da praça inteira.
- **Blocos:** além dos quatro aprovados, sete de apoio com id próprio (tábua musgo, pedrinha lilás, tábua roxa, janela torta apagada e acesa, toldinho listrado, caldeirão), no lugar dos tiles da Vila que o esboço repintava e dos blocos de rua da Cidade e da Vila.
- **A teia** é de barbante colorido (roxo, laranja e creme), não cinza.
- **O chão da praça** é de pedrinha lilás também de dia (no esboço, de dia ela lia cinza e só ficava lilás com a luz roxa da noite).
- **Na n5, as pegadinhas da trilha viram patinhas** do Tufinho, para não haver duas trilhas na tela.
- **O Bento** fica verde-musgo nas três versões do pelo (só a forma dos tufos varia).
- **Bichos:** o bicho de domar é o sapinho de chapeuzinho (não um gato), e a coruja tem modelo próprio.
- **Moradores novos:** dois vendedores (Tia Filó e Seu Olavo) e os moradores das casinhas, porque barraca que vende precisa de alguém que entrega.
- **A Loja** tem a vitrine só com cabides e chapéus, sem manequim.

## Fora desta spec
- Mudar os outros mundos, salvo a generalização de comprar e de sentar no brinquedo (que deixa a Vila igual) e o lampião arredondado (seção 13).
- Trocar os nomes da plateia da Vila e do sorteio do Rancho.
- A dica "trocar" que aparece nos fãs da plateia da Vila (vai para o backlog, ideia solta).
- Entrar nas casinhas da rua (só a da Vovó tem lado de dentro).
- Voar de vassoura, corrida, tombo e manobra.
- O abraço como gesto da roleta (aqui ele é só do Bento).
- A "Festa" na roleta de gestos (o terceiro nível da 033).
- Pagar a comida com moedinhas (espera a decisão do dono na 032).
- Fantasias premium deste mundo (o modelo da 023 continua; as do tema são de graça).
- A busca de marca do nome (vai com a 028).
