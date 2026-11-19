---
id: 034-menos-e-mais
title: 'Menos é mais: saem quatro mundos; a Vila Neon vira o padrão; prévias, ícones dos gestos, a faixa azul do iPhone e os testes que já falhavam'
status: DRAFT
base_branch: main
created_at: 2026-11-19T20:00:00Z
---
## Contexto
O dono, em 18 nov 2026 à noite: "menos é mais". Manter mundos simples é caro; os mundos que nasceram da Cidade Grande para frente (veículos, lugares por dentro, missões com história) são o nível do jogo agora. Decidiu:
- **Saem** Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos. As missões dos Dinos (031) saem junto.
- **Ficam** Vila Neon, Cidade Grande, Rancho Alegre, Doce Reino e Exploração Lunar. Mais tarde a Lua, o Doce Reino e o Rancho ganham a riqueza da Cidade e da Vila (backlog).
- **Mundos já salvos nesses quatro temas são apagados**, no aparelho e na nuvem, sem cópia ("melhor que não cria lastro"; "as crianças não vão sentir falta").
- Na mesma rodada: a prévia preta da Vila Neon na escolha de mundos, ícones dos gestos que uma criança de 3 anos entenda e os testes que já falhavam na `main`. A voz do orelhão fica como está.

Em 19 nov:
- **Tema padrão:** a Vila Neon.
- **O que a criança ganhou nesses mundos** (fantasias, coisas da banca) some junto, "para não deixar rastros".
- **Na nuvem só saem os mundos dos quatro temas combinados**, e nada mais.
- **Mundos do aparelho sem tema gravado** (abrem como Bruma) também saem.
- **Entra na spec:** a faixa azul embaixo no iPhone, aberto pelo ícone da tela de início (captura do dono em 19 nov).
- **Entra também:** refazer as prévias fracas (Lua e Rancho).

## O que existia (19 nov 2026, `main` 65b0a57, `VERSAO_REDE` 16)
- **Registro dos temas:**
  - `src/temas/index.ts`: `TEMA_PADRAO = 'bruma-e-luz'`; o Bruma é o construtor embutido (`temaBase`).
  - `src/temas/todos.ts` registra os outros.
  - `obterTema(id)` cai no padrão para id ausente ou desconhecido.
  - A ordem dos cartões é a do registro.
- **A Bruma é também a base interna:**
  - `temaBase()` é o tema ativo antes de qualquer ativação (`src/temas/ativo.ts`), na tela de título, nos testes e nos scripts;
  - `textosOriginais()` (`src/temas/originais.ts`) é o texto de volta de todo tema;
  - `corpoDeMorador` e `naCabeca` (`src/temas/bruma-e-luz/povoado.ts`) são usados pelos povoados do Doce, Rancho, Cidade e Vila;
  - `ESTILO_PADRAO` e `FORMAS_PADRAO` (`src/world/`) são a base do terreno.
- **Mundos e salvamento:**
  - "Meu primeiro mundo" (`src/main.ts:119`) nasce **sem tema** e, por isso, é Bruma.
  - Os mundos do aparelho ficam no IndexedDB (`src/jogo/mundos.ts`), com `tema` opcional.
  - A spec 016 apagou todos os mundos uma vez (`FORMATO_MUNDOS = 2`, `prepararFormato`).
  - Na nuvem:
    - tabela `salas` (código, `mundoId`) e blobs `mundos/<id>/mundo.json.gz` (com `mundo.tema` e `mundo.estilo`), `regioes/*` e `jogadores/*` (`servidor/src/armazemAzure.ts`);
    - a interface `Armazem` não lista nada;
    - a limpeza da 016 na nuvem foi feita à mão, fora do código;
    - o servidor não confere o tema ao criar (`salas.ts:268`).
  - Num mundo dos Dinos o estilo gravado tem `estrutura: 'ninho'`, e `mundoAlmaDoEstilo` (`src/jogo/alma.ts:52`) liga as missões dos Dinos por ele.
- **O que é só dos quatro:**
  - pastas `src/temas/{bruma-e-luz,planeta-vivo,mata-encantada,era-dos-dinos}`;
  - formas de mundo `samambaia`, `palmeira`, `circulo`, `ninho`, `tenda`, `esqueleto` (e `arcos` e `totem`, que já não tinham uso), e o segundo sol do céu (só o Planeta Vivo);
  - as missões d1 a d3, a banca dos Dinos, o canto do ninho (`world/cantoMissoes.ts`, `render/ninhoCanto.ts`, `ui/alma/arteCanto.ts`; o canto do Doce fica), as chaves de XP `coletou:ovo:ninho` e `escavou:fossil`;
  - as fantasias `dino`, `cientista`, `guardia-mata` e `lanterneira` e as peças só delas (`capuz-dino`, `jaleco`, `oculos` de fantasia, `coroa-folhas`, `capa-folhas`, `capuz-lanterneira`, `lanterna` de fantasia). Não confundir com o acessório `oculos` e `lanterna` da aparência nem com o bloco `lanterna`.
  - nomes de morador só desses povoados (`src/temas/nomes.ts`), `DO_TEMA` (`cliente/identidade.ts`), `NOMES_TEMAS` (`ui/abaFantasias.ts`), níveis de trilha e vozes (`audio/trilha.ts`, `audio/vozesGravadas.ts`);
  - os pacotes de som em `public/sons/pacotes/` e as chaves deles em `public/sons/indice.json`;
  - as prévias `public/temas/<id>.jpg`.
- **Prévias dos cartões:**
  - fotos em `public/temas/<id>.jpg`, geradas por `e2e/capturas-temas.spec.ts` (só com `CAPTURAS_TEMAS=1`);
  - **não existe `vila-neon.jpg`**: o cartão da Vila Neon fica preto (captura do dono, 19 nov);
  - a da Lua é quase só céu preto; a do Rancho tem um morro tapando o sítio.
- **Ícones dos gestos:** `src/ui/iconesGestos.ts`, SVG em 32×32, desenhados na 015. Na 033 o revisor das fotos achou alguns abstratos demais para 3 anos (o polegar de "Cumprimentar", a seta de "Apontar", a cadeira de "Sentar", as notas de "Dançar").
- **Faixa azul no iPhone:**
  - aberto pelo ícone da tela de início (`display: fullscreen`, `black-translucent`, `viewport-fit=cover`), aparece embaixo uma faixa da cor do fundo da página (`#8fcaf5`);
  - ela tem a altura da área do risquinho de baixo;
  - a correção de nitidez 90387de só foi testada em emulação.
- **Testes:**
  - 38 e2e abrem o "Meu primeiro mundo" e assim dependem do Bruma sem dizer;
  - a paridade grava 18 das 36 sessões no Bruma (`e2e/paridade.spec.ts`, `bruma-e-luz,doce-reino`).
  - **Já falhavam na `main`** (registro da 033):
    - `criacao` ×2;
    - `guia-chegada` c3 e c6;
    - o HUD do `plantio` no celular;
    - `temas` (Cidade Grande e Vila Neon);
    - `tesouro-fantasia`;
    - `trilha-regua` e `vozes-regua`.
  - **Instáveis:** `achar-amigo-nuvem` e os testes de tempo do Vitest.

## O que muda
### 1. Quatro mundos saem, a base fica
- **A base interna sai do nome Bruma:**
  - o que é base (o tema neutro de antes da ativação, `textosOriginais`, os ajudantes de morador, `ESTILO_PADRAO` e `FORMAS_PADRAO`, os pintores e o atlas base, `PALETAS_MUSICAIS`) fica num lugar com nome de base (ex.: `src/temas/base/`, `temaBase()`), sem id escolhível;
  - os ajudantes de morador vão para um módulo comum, que os povoados importam;
  - o que é só do tema Bruma (criaturas com pele e voz da Bruma, povoado, música, prévia) sai.
  - **O terreno, o atlas e o povoado dos cinco que ficam não mudam um bit:** os hashes de `tests/temas/paridade-*.test.ts` dos que ficam continuam iguais.
  - O teste do Bruma vira o da base, com os mesmos hashes do que continua.
- **`IdTema`** fica com os cinco.
  - `TEMA_PADRAO = 'vila-neon'`.
  - Os cartões ficam em ordem explícita: Vila Neon, Cidade Grande, Rancho Alegre, Doce Reino, Exploração Lunar.
- **"Meu primeiro mundo"** nasce com o tema `vila-neon` gravado.
  - Todo mundo novo passa a ter o tema gravado.
  - Toda reserva `?? 'bruma-e-luz'` (`main.ts`, `nuvem.ts`, `ui/interface.ts`, `sugestaoFantasia.ts`, `identidade.ts`) sai ou vira o padrão.
- **Sai tudo o que é só dos quatro** (a lista de "O que existia"):
  - formas de mundo e o saneamento (`world/estiloSeguro.ts`), o segundo sol, as missões d1 a d3, a banca, o canto do ninho, as chaves de XP, `'era-dos-dinos'` em `MundoAlma`, `mundoAlmaDoEstilo` e nas habilidades;
  - as fantasias, as peças e os desenhos delas, os nomes, os níveis de som, os pacotes de som e as entradas no índice e nos créditos (o teste dos créditos continua passando), as prévias.
  - O Doce Reino continua com as missões e o canto dele, iguais.
- **Sem rastro do que a criança ganhou:**
  - fantasia vestida de id removido vira "sem fantasia" (já acontece ao ler);
  - itens da banca removida e missões removidas saem do baú e do livro (`normalizarAlmaMundo` já filtra);
  - as listas do aparelho com ids de fantasia ou mundo (`terrario:fantasias-brilhou`, `terrario:fantasia-anterior`, `terrario:fantasia-sugerida`, `terrario:mundo-novo`, e o que mais a busca achar) são limpas dos ids removidos;
  - as moedinhas da carteira ficam (são da criança, não do mundo).
  - Teste de unidade para cada limpeza.
- **Docs:** `README.md` (temas, "mundos antigos abrem como Bruma"), `ARCHITECTURE.md` e `e2e/paridade/LEIAME.md`.

### 2. Mundos salvos desses temas são apagados
- **No aparelho** (`src/jogo/mundos.ts`):
  - a cada abertura, antes de listar, sai todo mundo do índice cujo `tema` é um dos quatro ou que não tem `tema`, com os dados dele;
  - uma entrada que aponta para a nuvem (`nuvem`) com tema removido também sai;
  - **não** se muda `FORMATO_MUNDOS` (isso apagaria todos);
  - a limpeza é idempotente e não toca em nenhum outro mundo;
  - sem aviso na tela (a criança não lê, e o mundo some da lista);
  - se o mundo aberto por último era um dos removidos, abre o próximo da lista ou cria "Meu primeiro mundo" na Vila Neon.
- **Na nuvem** (`servidor/src/`):
  - **A regra:** só se apaga um mundo cujo `mundo.tema` gravado é **exatamente** `bruma-e-luz`, `planeta-vivo`, `mata-encantada` ou `era-dos-dinos`. Tema ausente, desconhecido, de outro tipo ou mundo sem `formato` 2 não são tocados.
  - **O que sai junto:** a pasta `<mundoId>/` inteira (`mundo`, `regioes`, `jogadores`) e as salas cuja `mundoId` é desse mundo.
  - **A varredura:** o `Armazem` ganha listar salas e mundos, e o servidor faz a varredura ao subir (idempotente: roda a cada publicação e não acha mais nada).
  - **O log:** o servidor registra cada mundo apagado (código da sala, tema e nome) e o total.
  - **Proteção contra a réplica antiga:** uma réplica antiga pode regravar um mundo removido logo depois da varredura. Por isso:
    - o servidor novo não abre nem grava mundo de tema removido (para ele, esse mundo não existe);
    - a varredura da próxima publicação apaga o que sobrar.
  - **Criar:** o servidor só aceita os cinco temas que ficam; tema fora da lista vira `vila-neon` (cliente antigo em cache).
  - **Testes** com o armazém em memória:
    - os quatro temas saem, com as salas, as regiões e os jogadores;
    - os cinco ficam inteiros;
    - tema vazio, estranho ou sem formato fica;
    - rodar duas vezes não muda nada.
- **`VERSAO_REDE` 16 → 17:** o servidor recusa tema removido. O site e o servidor publicam juntos, e o cliente antigo recarrega.

### 3. Prévias dos cartões
- **Vila Neon:** prévia nova, de capricho, com a cara dela: o bairro com neon, o rinque ou o palco e gente na rua (de dia ou no começo da noite, o que ficar melhor na foto pequena do cartão).
- **Lua:** refazer mostrando o que é dela (a base, os robôs ou coelhos, a Terra no céu), não só o céu preto.
- **Rancho:** refazer com o sítio à vista (o celeiro, o moinho e a lavoura), sem o morro na frente.
- **Cidade Grande e Doce Reino** passam pelo mesmo portão; refazer só se ficarem abaixo das novas.
- **O roteiro:**
  - `e2e/capturas-temas.spec.ts` cobre todo tema de `temasDisponiveis()`, com o enquadramento de cada um escrito no roteiro;
  - o teste de unidade novo falha se algum tema não tiver `public/temas/<id>.jpg`;
  - o fundo de `ui/amigos.ts` usa as mesmas.
- **Medida:** no cartão de verdade, a 390×844 e a 1280×720, a prévia mostra o tema numa olhada.

### 4. Ícones dos gestos para 3 anos
- **Redesenhar os 11 gestos e a carinha do botão** (`src/ui/iconesGestos.ts`), no mesmo jeito e família.
- **Regras:**
  - um bonequinho com a cara dos bonecos do jogo (cabeça grande, sorriso) fazendo o gesto;
  - uma ação só e óbvia, traço grosso;
  - lê a 48 px na roleta e no balão em cima da cabeça;
  - nada de símbolo abstrato (seta, nota, cadeira sozinha);
  - sem texto, sem arco-íris.
- **Antes de fechar, uma folha para o dono escolher**, com duas direções, cada gesto no tamanho real da roleta e do balão:
  - **A:** desenho novo em SVG;
  - **B:** foto do próprio boneco do jogo fazendo o gesto (`render/fotoBoneco.ts`), recortada no círculo.
  - O orquestrador manda com a recomendada, e o dono decide.
- **O revisor das fotos** responde, para cada ícone, "uma criança de 3 anos sabe o que acontece se tocar?".

### 5. A faixa azul do iPhone
- **Achar a causa no código:** qual camada não cobre a tela inteira no modo tela de início do iOS (o canvas, o contêiner do jogo ou a altura por `100vh`, `innerHeight` ou `100%`). A área do risquinho e a área segura de baixo precisam ser cobertas pelo jogo, com os botões continuando dentro da área segura.
- **Corrigir** sem mudar nada no Chromium do computador nem no celular pelo navegador (as fotos de antes e depois a 390×844, 844×390 e 1280×720 ficam iguais).
- **Teste e2e:** emulando a área segura de baixo, o canvas cobre até a borda e nenhum pixel da cor do fundo da página aparece embaixo.
- **Confirmação final:** no iPhone do dono, na rodada em família (fica no relatório).

### 6. Os testes que já falhavam
- **Para cada um:**
  - achar a causa e dizer, no registro da spec, se era o teste ou o jogo;
  - se era o jogo, consertar o jogo;
  - se era o teste (texto que mudou, palco que mudou, tempo apertado), consertar o teste mantendo o que ele protege.
  - Nunca pular, desligar ou afrouxar o que o teste confere.
- **Os instáveis** (`achar-amigo-nuvem`, os de tempo do Vitest): achar o que varia.
  - Testes de tempo que medem a máquina, não o jogo, passam a medir de um jeito estável (ex.: contar trabalho em vez de milissegundos, ou um teto com folga medida em 20 rodadas) e dizem no comentário o que protegem.
- **Fechamento:** cada um passa em 3 rodadas seguidas.

### 7. Os testes que dependiam do Bruma
- **Os e2e que abriam o "Meu primeiro mundo"** passam a abrir na Vila Neon.
  - Se um deles ficar pesado demais por software ou depender de coisa que só existia no Bruma (a raposa, o povoado de praça), escolhe o tema que faz sentido para o que ele protege e diz isso no teste (`?tema=` ou mundo criado com tema).
  - Nenhum teste perde o que conferia.
- **Paridade:**
  - as 18 sessões do Bruma passam para o Rancho Alegre (tem raposa e povoado de roça), ou para o tema que tiver tudo o que as sessões usam;
  - **a gravação nova é feita no código de antes desta spec** (a `main` 65b0a57, com o Rancho), e a conferência no código novo;
  - continua 36 de 36.
- **Os testes que usavam a Mata como "mundo sem missões"** passam a usar a Lua.

## Experiência medida
- **Escolha de mundo:**
  - cinco cartões, a Vila Neon primeiro e marcada;
  - nenhum cartão sem prévia;
  - fotos a 390×844, 844×390 e 1280×720.
- **Mundos salvos:**
  - um aparelho com mundos dos nove temas (montado no teste) abre só com os cinco;
  - o mundo que estava aberto, se removido, dá lugar ao próximo;
  - na nuvem, os testes de cima.
- **Nenhum texto, nome, som, fantasia ou item dos quatro temas** aparece no jogo: busca no `dist/` pelos nomes (Bruma e Luz, Planeta Vivo, Mata Encantada, Era dos Dinos e os nomes das fantasias), fora os nomes internos (`brumaluz`).
- **Os cinco mundos abrem iguais a antes:** fotos de antes e depois do nascer em cada um, mais as paridades de terreno e povoado.
- **Os gestos:** a folha das duas direções; depois, a roleta de Gestos e o balão com os ícones escolhidos, em pé e deitado.
- **O iPhone:** o teste da área segura; as fotos de antes e depois.
- **A suíte inteira:**
  - Vitest;
  - paridade 36/36;
  - e2e inteiro em pedaços de 2 trabalhadores, sem nenhuma falha que já existia (as da seção 6 consertadas), cada pedaço que caiu rodado de novo.

## Fora desta spec
- **A riqueza nova da Lua, do Doce Reino e do Rancho** (specs próprias). Aqui só a prévia.
- **A voz do orelhão.**
- **Renomear `brumaluz`**, que é nome interno: o banco IndexedDB, `window.__brumaluz` e os eventos.
- **Os modelos de personagem** `herbolaria`, `lanterneiro` e `musgueira`: são genéricos e ficam.

## Decisões do dono
- **18 nov 2026:**
  - saem Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos; ficam Lua, Doce, Rancho, Cidade e Vila;
  - os mundos salvos desses temas são apagados, sem cópia;
  - a voz do orelhão fica;
  - consertar os testes antigos;
  - redesenhar os ícones dos gestos.
- **19 nov 2026:**
  - na Azure só os mundos desses quatro temas, sem a rodada de conferência antes;
  - os mundos do aparelho sem tema saem;
  - o padrão é a Vila Neon;
  - o que a criança ganhou nesses mundos some junto;
  - a faixa azul do iPhone entra;
  - as prévias fracas são refeitas.
