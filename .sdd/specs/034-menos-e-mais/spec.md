---
id: 034-menos-e-mais
title: 'Menos é mais: saem quatro mundos; a Vila Neon vira o padrão; prévias, ícones dos gestos e os testes que já falhavam'
status: DONE
base_branch: main
created_at: 2026-11-19T20:00:00Z
---
## Contexto
O dono, em 18 nov 2026 à noite: "menos é mais". Manter mundos simples custa caro, e os mundos que nasceram da Cidade Grande para frente (veículos, lugares por dentro, missões com história) são agora o nível do jogo.

**Decidiu em 18 nov:**
- **Saem** Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos. As missões dos Dinos (031) saem junto.
- **Ficam** Vila Neon, Cidade Grande, Rancho Alegre, Doce Reino e Exploração Lunar. Mais tarde a Lua, o Doce Reino e o Rancho ganham a riqueza da Cidade e da Vila (está no backlog).
- **Os mundos já salvos nesses quatro temas são apagados**, no aparelho e na nuvem, sem cópia: "melhor que não cria lastro"; "as crianças não vão sentir falta".
- **Na mesma rodada:**
  - a prévia preta da Vila Neon na escolha de mundos;
  - ícones de gestos que uma criança de 3 anos entenda;
  - os testes que já falhavam na `main`.
- **A voz do orelhão fica** como está.

**Decidiu em 19 nov:**
- O tema padrão passa a ser a Vila Neon.
- O que a criança ganhou nesses mundos (fantasias, coisas da banca) some junto, "para não deixar rastros".
- Na nuvem saem só os mundos desses quatro temas, e nada mais.
- Os mundos do aparelho sem tema gravado, que abrem como Bruma, também saem.
- A faixa azul embaixo no iPhone, aberto pelo ícone da tela de início, entrou nesta spec e depois saiu: vai com a casca nativa (020).
- As prévias fracas (Lua e Rancho) são refeitas.

## O que existia (19 nov 2026, `main` 65b0a57, `VERSAO_REDE` 16)
### Registro e base
- **Registro dos temas:**
  - `src/temas/index.ts` tem `TEMA_PADRAO = 'bruma-e-luz'`; o Bruma é o único construtor embutido.
  - `src/temas/todos.ts` registra os outros.
  - `obterTema(id)` cai no padrão quando o id falta ou é desconhecido.
  - A ordem dos cartões é a ordem do registro.
- **A Bruma também é a base interna:**
  - `temaBase()` (`src/temas/bruma-e-luz/index.ts`) é o tema ativo antes de qualquer ativação (`src/temas/ativo.ts:11`) e a reserva do povoado (`ativo.ts:20`).
  - O nome e o lema dele são "Bruma e Luz".
  - `textosOriginais()` (`src/temas/originais.ts`) é o texto de volta de todo tema.
  - `corpoDeMorador` e `naCabeca` (`src/temas/bruma-e-luz/povoado.ts`) são usados pelos povoados do Doce, Rancho, Cidade e Vila.
  - Também são base: `ESTILO_PADRAO`, `FORMAS_PADRAO`, os pintores e o atlas base, e `PALETAS_MUSICAIS`.

### Mundos e salvamento
- **No aparelho:**
  - "Meu primeiro mundo" (`src/main.ts:119`) nasce **sem tema**, ou seja, Bruma.
  - Os mundos ficam no IndexedDB (`src/jogo/mundos.ts`), com `tema` opcional.
  - A spec 016 apagou todos uma vez (`FORMATO_MUNDOS = 2`, `prepararFormato`, chamado em `main.ts:85`).
- **Na nuvem:**
  - a tabela `salas` (código e `mundoId`);
  - os blobs `mundos/<id>/mundo.json.gz` (com `mundo.tema` e `mundo.estilo`), `regioes/*` e `jogadores/*` (`servidor/src/armazemAzure.ts`);
  - o `Armazem` não lista nem apaga mundos;
  - a limpeza da 016 na nuvem foi feita à mão;
  - o servidor não confere o tema ao criar (`salas.ts:268`) e guarda o `estilo` que o cliente mandou (`:271`);
  - quando o dono traz o mundo de volta, a sala sai e o mundo fica (`salas.ts:546-548`).
- **O app** roda numa revisão só, com 1 réplica (`infra/main.bicep`).
  - A réplica antiga recebe SIGTERM depois que a nova está de pé, e grava as salas abertas ao sair (`servidor/src/index.ts:203-209`).
  - O `servidor.yml` só publica quando mudam os caminhos dele, e espera até 2 h por ninguém jogando.
  - O `publicar.yml` (o site) roda separado.
- **Cliente antigo e versão nova:** quando a versão do cliente é mais antiga que a do servidor, ele mostra "Tem uma versão nova do jogo. Recarregue a página para entrar." (`ui/amigos.ts:142`) e não recarrega sozinho.

### O que é só dos quatro (lista de partida; a busca do desenvolvedor completa)
- **As pastas** `src/temas/{bruma-e-luz,planeta-vivo,mata-encantada,era-dos-dinos}`, com a ressalva da base acima.
- **Formas de mundo e céu:**
  - formas `samambaia`, `palmeira`, `circulo`, `ninho`, `tenda`, `esqueleto`, além de `arcos` e `totem`, que já não tinham uso;
  - o lugar delas no saneamento (as listas de `world/estiloSeguro.ts:25-49`; o módulo fica, o servidor usa);
  - `world/chunk.ts:919,961` e `world/construcoes.ts:234-244`;
  - o segundo sol do céu, só do Planeta Vivo.
- **Era dos Dinos na alma:**
  - `'era-dos-dinos'` em `MundoAlma`, `MUNDOS_ALMA`, `mundoAlmaDoEstilo` (`'ninho'`) e nas habilidades explorador e bichos (`src/jogo/alma.ts`);
  - as missões d1 a d3;
  - a banca dos Dinos;
  - as chaves de XP `coletou:ovo:ninho` e `escavou:fossil`.
- **O canto do ninho, só o ramo `'dinos'`:**
  - **Fica (é do Doce):** `world/cantoMissoes.ts` (o arquivo, o tipo `TemaCanto` e o ramo `'doce'`) e `ui/alma/arteCanto.ts` (o bolo e o broto-doce).
  - **Sai (só dos Dinos):**
    - `render/ninhoCanto.ts`;
    - o ninho, o pescocudo, o ovo de dino e a rocha de osso de `arteCanto.ts`;
    - `criarNinho` e `criarBrilhoOvos` de `ui/alma/canto.ts`;
    - em `nucleo/nucleo.ts`: `MARCA_OVO` (:699), o d1 e o d3 de `prepararCanto` (:705-713), a rocha de osso (:1199-1207) e o ovinho (:2905-2906);
    - `jogo/guia.ts:506-525` e `:558-568`, `jogo/drops.ts:82`, `render/itensBrinquedo.ts:491`, `world/protecao.ts:269`, `ui/alma/guia.ts:293` e `ui/alma/arte.ts:402`.
  - **Cuidado:** `nucleo.ts:709` faz `missao === 'd2' || missao === 'e2'`, e a e2 do Doce usa a mesma chave `criou:cervo` (`alma.ts:370`, `guia.ts:527`). O d2 sai sem tocar no caminho do e2.
- **Fantasias:**
  - `dino`, `cientista`, `guardia-mata` e `lanterneira`;
  - as peças só delas: `capuz-dino`, `jaleco`, `oculos` de fantasia, `coroa-folhas`, `capa-folhas`, `capuz-lanterneira` e `lanterna` de fantasia;
  - os desenhos (`personagem/bonecoFantasia.ts`), `tesouroEFantasia.ts:21` e `NOMES_PECAS`.
  - Não confundir com o acessório `oculos` e `lanterna` da aparência, com o bloco `lanterna` nem com o modelo `musgueira` (que se chama "Cientista"). Os modelos `herbolaria`, `lanterneiro` e `musgueira` são genéricos e ficam.
- **Nomes e textos:**
  - os nomes de morador só desses povoados (`src/temas/nomes.ts`);
  - `DO_TEMA` (`cliente/identidade.ts`) e `NOMES_TEMAS` (`ui/abaFantasias.ts`);
  - os níveis de trilha e vozes (`audio/trilha.ts:55-59`, `audio/vozesGravadas.ts:104-108`);
  - o gemido `espectro` só do Bruma (`render/cena.ts:7012-7014`) e o som `espectro` se ninguém mais usar.
- **Sons:** os pacotes de som em `public/sons/pacotes/` e as chaves deles em `public/sons/indice.json` (`temas`, `tamanhos`, `ordem`, `totalGeralVozes`).
- **Créditos:** 16 créditos aparecem só nos pacotes removidos:
  - `commons/assobio1.ogg`, `commons/assobio2.ogg`, `commons/cabra1.wav`, `commons/cabras.ogg`;
  - `commons/caoz_pradaria.ogg`, `commons/cobaia_wheek.ogg`, `commons/elefante.ogg`, `commons/guira.wav`;
  - `commons/lobos.ogg`, `commons/pardal.wav`, `commons/pelicano.ogg`, `commons/perereca.ogg`;
  - `commons/peru.wav`, `commons/ra_comestivel.ogg`, `commons/risada_elfo.ogg`, `commons/sapo.ogg`.
  - Hoje esses créditos estão no índice e em `AUTORES_GRAVACOES` (`audio/creditosSons.ts:14`).
  - Quatro créditos não aparecem em pacote nenhum (`bsb/0283.mp3`, `bsb/0440.mp3`, `commons/c_galo_medio.ogg`, `commons/c_galo_pequeno.ogg`) e **ficam**.
- **Imagens:**
  - as prévias `public/temas/<id>.jpg`;
  - a imagem de compartilhar `public/compartilhar.jpg` (o `og:image`), que mostra "Bruma e Luz" e o cartão do Planeta Vivo.
- **Testes, scripts e servidor:**
  - `servidor/testes/salas.test.ts:45,227`;
  - `scripts/carga.mjs:45`, `scripts/escuta-temas.ts` e `scripts/vitrine-*.ts`.

### Prévias, gestos, iPhone e testes
- **Prévias dos cartões:**
  - são fotos em `public/temas/<id>.jpg`, geradas por `e2e/capturas-temas.spec.ts`;
  - **não existe `vila-neon.jpg`**, e o cartão fica preto;
  - a da Lua é quase só céu preto;
  - a do Rancho tem um morro tapando o sítio.
- **Ícones dos gestos:**
  - SVG em 32×32 (`src/ui/iconesGestos.ts`), usados na roleta, no balão em cima da cabeça (`render/balaoGesto.ts`, como texto SVG) e nas carinhas dos amigos (`ui/carinhasAmigos.ts`);
  - na 033, o revisor das fotos achou abstratos para 3 anos o polegar de "Cumprimentar", a seta de "Apontar", a cadeira de "Sentar" e as notas de "Dançar".
- **Faixa azul no iPhone:**
  - aberto pelo ícone (`display: fullscreen`, `black-translucent`, `viewport-fit=cover`), aparece embaixo a cor do fundo da página (`#8fcaf5`, `index.html:26,35`, `manifest.webmanifest`);
  - a correção de 12 nov (`tamanhoDoCanvas` em `src/ui/telaCheia.ts:140-160`) completa o canvas até o tamanho da tela quando falta até 1/8, mas a faixa continua no aparelho (captura de 19 nov).
- **Testes:**
  - 38 e2e abrem o "Meu primeiro mundo" e por isso dependem do Bruma sem dizer;
  - a paridade grava 18 das 36 sessões no Bruma (`e2e/paridade.spec.ts`, `bruma-e-luz,doce-reino`; as sessões domam a raposa e fazem trocas de três profissões);
  - só a base e seis povoados têm hash de paridade (`tests/temas/paridade-bruma.test.ts`, `paridade-povoados.test.ts`). Vila Neon, Cidade e Rancho não têm, e o canto do Doce também não.
  - Já falhavam na `main`, pelo registro da 033: `criacao` ×2, `guia-chegada` c3 e c6, o HUD do `plantio` no celular, `temas` (Cidade Grande e Vila Neon), `tesouro-fantasia`, `trilha-regua` e `vozes-regua`.
  - Instáveis: `achar-amigo-nuvem` e os testes de tempo do Vitest.

## O que muda
### 0. Antes de mexer: as provas de que nada muda nos cinco
Na T00, ainda no código de antes (a `main` de hoje, sem nenhuma outra mudança), gravar:
- **Hashes dos cinco que ficam** num teste novo (`tests/temas/paridade-cinco.test.ts`):
  - o atlas, com pintores, emissivos e máscaras;
  - o terreno **com os povoados ligados**, em 3 sementes, numa área em volta do nascer que pegue o bairro, a cidade e o sítio;
  - o JSON de `criaturas`, `movimento`, `vozes`, `povoado`, `ceu`, `quadrosCeu` e `mundo`.
- **Hash do canto do Doce:** `planejarCantos('doce')` e os chunks da caixa do canto com os povoados ligados, em 3 sementes.
- **Hash da base:** o que continua base (atlas base, terreno de `ESTILO_PADRAO`, as criaturas genéricas) fica como hoje em `paridade-bruma`, que vira `paridade-base`.
- **A paridade e2e nova:**
  - as 18 sessões do Bruma passam para o Rancho Alegre (tem raposa e as profissões);
  - se a gravação falhar no sítio, escolher outro tema que tenha tudo o que as sessões usam, e registrar a escolha;
  - gravar e conferir 36/36;
  - os 18 JSON do Bruma saem.
- **Fotos de antes:** o nascer de cada um dos cinco a 390×844 e a 1280×720.

Depois disso, todos esses hashes continuam iguais até o fim da spec.

### 1. Quatro mundos saem, a base fica
- **A base com outro nome, mexendo o mínimo:**
  - vão para `src/temas/base/` só o construtor `temaBase()` e os ajudantes `corpoDeMorador` e `naCabeca`; os povoados passam a importar de lá;
  - o resto da base (pintores e atlas, `PALETAS_MUSICAIS`, `ESTILO_PADRAO`, `FORMAS_PADRAO`, `textosOriginais`) fica onde está, só com os comentários trocados (nada de "Bruma" para o que é base).
- **O `temaBase()` continua um `Tema` completo e não escolhível:**
  - tem nome neutro ("Base"), sem lema de Bruma;
  - as criaturas, os movimentos e as vozes de hoje ficam como a reserva genérica, com o hash mantido;
  - o povoado de reserva continua.
  - Ele não aparece em lugar nenhum da tela.
- **`IdTema` fica com os cinco.**
  - `TEMA_PADRAO = 'vila-neon'`.
  - `obterTema` cai na base quando o padrão não estiver registrado (quem não importa `todos.ts`: scripts, testes, servidor). Com tudo registrado, um id desconhecido cai na Vila Neon.
  - Os cartões ficam em ordem explícita: Vila Neon, Cidade Grande, Rancho Alegre, Doce Reino, Exploração Lunar.
- **Mundo novo:** "Meu primeiro mundo" nasce com o tema `vila-neon` gravado, e todo mundo novo passa a ter o tema gravado. Toda reserva `?? 'bruma-e-luz'` (`main.ts`, `nuvem.ts`, `ui/interface.ts`, `sugestaoFantasia.ts`, `identidade.ts`) sai ou vira o padrão.
- **Sai tudo o que é só dos quatro** (a lista de "O que existia", completada pela busca). O Doce Reino continua com as missões, o canto e as chaves dele iguais (os hashes da seção 0 e `e2e/missoes-dinos-doce.spec.ts` na parte do Doce).
- **Os créditos:**
  - saem os 16 listados, do índice e de `AUTORES_GRAVACOES`, juntos;
  - `tamanhos`, `ordem` e `totalGeralVozes` do índice são recalculados;
  - teste novo: todo som citado pelos pacotes que ficam tem crédito.
- **Nenhum texto visível com "bruma" ou os nomes dos quatro nos cinco que ficam.** Os textos de registro da base (ex.: "Espectro da bruma", "Caçador da bruma") que aparecem em algum dos cinco por não terem texto próprio ganham texto neutro. Teste de unidade por tema sobre os textos aplicados.
- **Sem rastro do que a criança ganhou:**
  - a fantasia vestida com id removido vira "sem fantasia", e `terrario:aparencia` é regravado já normalizado;
  - os itens da banca removida e as missões removidas saem do baú e do livro (`normalizarAlmaMundo`);
  - são limpas dos ids removidos as chaves `terrario:fantasias-brilhou`, `terrario:fantasia-anterior`, `terrario:fantasia-sugerida`, `terrario:mundo-novo` e `terrario:trilha-saida`, e o que mais a busca achar;
  - teste de unidade para cada limpeza.
  - **Ficam com a criança:** as moedinhas, o XP, os pontos e o nível (são dela, não do mundo; a mesma lógica das moedinhas).
- **A imagem de compartilhar** (`public/compartilhar.jpg`) é refeita com a Vila Neon.
- **Docs:** `README.md` (os temas e o trecho "mundos antigos abrem como Bruma"), `ARCHITECTURE.md` e `e2e/paridade/LEIAME.md`.

### 2. Mundos salvos desses temas são apagados
**No aparelho** (`src/jogo/mundos.ts`, chamado em `main.ts` logo depois de `prepararFormato`, antes dos caminhos de `?sala` e `?mundo`):
- **O que sai,** a cada abertura: todo mundo do índice com `tema` igual a um dos quatro ou sem `tema`, inclusive as entradas que apontam para a nuvem.
- **A ordem:** tirar do índice primeiro, depois os dados.
- **O que fica:** um mundo com tema desconhecido (nem dos quatro, nem dos cinco).
- **Não muda `FORMATO_MUNDOS`**, porque isso apagaria todos.
- **Sem aviso na tela:** a criança não lê, e o mundo some da lista.
- **O mundo aberto por último:** se ele saiu, abre o próximo da lista ou cria "Meu primeiro mundo" na Vila Neon.
- **Aba antiga:** uma aba com o cliente antigo aberta pode regravar `mundo:<id>` sem entrada no índice. É lixo que ninguém vê e fica aceito.

**Na nuvem** (`servidor/src/`):
- **A regra:** só sai o mundo cujo `mundo.tema` gravado é **exatamente** `bruma-e-luz`, `planeta-vivo`, `mata-encantada` ou `era-dos-dinos`. Tema ausente, desconhecido, de outro tipo, ou mundo sem `formato` 2, não é tocado.
- **O que sai junto:** a pasta `<mundoId>/` inteira (prefixo com barra no fim; 404 tolerado) e as salas cuja `mundoId` é desse mundo.
- **O `Armazem` ganha** listar mundos e salas e apagar a pasta de um mundo, na Azure e na memória.
- **A varredura:**
  - percorre os **mundos** (não as salas);
  - roda depois do `listen`, sem segurar `/saude`;
  - roda de novo uns 10 minutos depois de subir;
  - é idempotente;
  - os erros vão só para o log.
- **Na leitura:** o servidor novo não abre nem grava mundo de tema removido. Se `lerMundoAtual` encontrar um, apaga na hora (isso cobre a réplica antiga que regrava ao sair).
- **O log:** cada mundo apagado (código da sala, id e tema, **sem o nome**, que a criança digita) e o total.
- **Criar com tema fora dos cinco:** `recusar('versao')` (o motivo já existe).
- **`VERSAO_REDE` 16 → 17.**
- **Testes com o armazém em memória:**
  - os quatro temas saem, com as salas, as regiões e os jogadores;
  - os cinco ficam inteiros, mesmo com o mundo sem sala;
  - tema vazio, estranho ou sem formato fica;
  - rodar duas vezes não muda nada;
  - o mundo removido regravado depois da varredura sai na leitura;
  - criar com tema removido é recusado.
- **Publicar nesta ordem.** O push na `main` dispara o site (`publicar.yml`) em minutos e o servidor (`servidor.yml`) esperando até 2 h. Por isso:
  1. fazer o push e cancelar na hora a execução de `publicar.yml`;
  2. disparar `servidor.yml` à mão com `agora: true`;
  3. conferir a revisão nova de pé e o log da varredura;
  4. disparar `publicar.yml` de novo.
  - Quem estiver com o cliente antigo aberto vê o aviso de versão nova até recarregar, como em toda subida de versão.

### 3. Prévias dos cartões
- **Vila Neon:** prévia nova e de capricho, com a cara dela: o bairro com neon, o rinque ou o palco e gente na rua. De dia ou no começo da noite, o que ficar melhor na foto pequena do cartão.
- **Lua:** refazer mostrando o que é dela (a base, os robôs ou coelhos, a Terra no céu), e não só o céu preto.
- **Rancho:** refazer com o sítio à vista (celeiro, moinho e lavoura), sem o morro na frente.
- **Cidade Grande e Doce Reino** passam pelo mesmo portão e só são refeitos se ficarem abaixo das novas.
- **O roteiro:** `e2e/capturas-temas.spec.ts` cobre todo tema de `temasDisponiveis()`, com o enquadramento de cada um escrito no roteiro.
- **O teste:** um teste de unidade falha se algum tema não tiver `public/temas/<id>.jpg`. O fundo de `ui/amigos.ts` usa as mesmas imagens.
- **Medida:** no cartão de verdade, a 390×844 e a 1280×720, a prévia mostra o tema numa olhada.

### 4. Ícones dos gestos para 3 anos
- **O que se redesenha:** os 11 gestos e a carinha do botão, na roleta, no balão e nas carinhas dos amigos.
- **Regras:**
  - uma ação só e óbvia, que uma criança de 3 anos entende sem ler;
  - lê a 48 px;
  - nada de símbolo abstrato (seta sozinha, nota, cadeira sem ninguém);
  - sem texto, sem arco-íris;
  - quem aparece no ícone tem a cara dos bonecos do jogo (regra do produto: nada de boneco simplificado).
- **A folha para o dono escolher**, antes de entrar no jogo: duas direções, cada gesto no tamanho real da roleta e do balão.
  - **A:** ilustração em SVG do **mesmo boneco do jogo**, com as mesmas proporções, rosto e roupa padrão, fazendo o gesto. Não pode ser um palitinho.
  - **B:** foto do próprio boneco do jogo fazendo o gesto (`render/fotoBoneco.ts`).
    - Um boneco fixo e neutro, que não é o da criança.
    - Gerada por um script, fora do jogo, como as prévias, e guardada em `public/` como imagem.
    - O balão passa a usar a imagem: a T10 cresce.
  - O orquestrador manda as duas com a recomendada, e o dono decide.
- **O revisor das fotos** responde, para cada ícone: "uma criança de 3 anos sabe o que acontece se tocar?"

### 5. A faixa azul do iPhone: fora desta spec
Entrou em 19 nov e saiu no mesmo dia (dono: "não precisamos nos preocupar com tratar essa barra azul do iPhone agora, pois na sequência faremos a casca nativa para distribuir nas lojas").
- Vai com a 020 (casca nativa).
- O painel de medida feito na T01 foi desfeito, e fica no commit 65c6e2d para quando a 020 precisar.
- A regra continua: a correção é genérica, para qualquer aparelho e tamanho, nunca específica de iPhone.

### 6. Os testes que já falhavam
- **Para cada um,** achar a causa e dizer no registro da spec se era o teste ou o jogo:
  - se era o jogo, consertar o jogo;
  - se era o teste (texto, palco ou tempo), consertar o teste mantendo o que ele protege;
  - nunca pular, desligar ou afrouxar o que o teste confere.
- **Os instáveis** (`achar-amigo-nuvem` e os de tempo do Vitest): achar o que varia.
  - Testes de tempo que medem a máquina, e não o jogo, passam a medir de um jeito estável: contar trabalho em vez de milissegundos, ou usar um teto com folga medida em 20 rodadas.
  - O comentário diz o que o teste protege.
- **Critério:** cada um passa em 3 rodadas seguidas.

### 7. Os testes que dependiam dos quatro
- **Os e2e que abriam o "Meu primeiro mundo"** passam a abrir na Vila Neon.
  - Se algum ficar pesado demais por software, ou depender de algo que só existia no Bruma (a raposa, o povoado de praça), passa a usar o tema que faz sentido para o que ele protege, escrito no teste (`?tema=` ou mundo criado com tema).
  - Nenhum teste perde o que conferia.
- **Os testes que usavam a Mata como "mundo sem missões"** passam a usar a Lua.
- **Os testes que usavam fantasias removidas**, como os palcos de achar-amigo com `dino`, passam a usar uma fantasia que fica.
- **`e2e/missoes-dinos-doce.spec.ts`** mantém a parte do Doce.

## Experiência medida
- **Escolha de mundo:** cinco cartões, com a Vila Neon primeiro e marcada, e nenhum cartão sem prévia. Fotos a 390×844, 844×390 e 1280×720.
- **Mundos salvos:**
  - um aparelho montado no teste com mundos dos nove temas, sem tema e com tema estranho abre só com os cinco mais o estranho;
  - se o mundo aberto saiu, abre o próximo;
  - na nuvem, os testes da seção 2.
- **Nada dos quatro no jogo:**
  - busca num build novo do `dist/` pelos nomes "Bruma e Luz", "Planeta Vivo", "Mata Encantada", "Era dos Dinos", "Fantasia de Dino", "Guardiã da Mata" e "Guardião da Mata", e pelos nomes de morador e de peça removidos;
  - as exceções ficam escritas: os nomes internos `brumaluz` e o modelo "Cientista" (`musgueira`), que fica;
  - o teste de textos por tema da seção 1.
- **Os cinco iguais a antes:** os hashes da T00 e as fotos de antes e depois do nascer.
- **Os gestos:** a folha das duas direções; depois, a roleta de Gestos, o balão e as carinhas com os ícones escolhidos, em pé e deitado.
- **A suíte inteira:**
  - Vitest;
  - paridade 36/36 contra a gravação da T00;
  - o e2e inteiro em pedaços de 2 trabalhadores, sem nenhuma das falhas antigas da seção 6;
  - cada pedaço que cair, rodado de novo.

## Fora desta spec
- **A faixa azul do iPhone** (vai com a 020).
- **A riqueza nova da Lua, do Doce Reino e do Rancho** (specs próprias). Aqui entra só a prévia.
- **A voz do orelhão.**
- **Renomear o `brumaluz` interno**: o banco IndexedDB, `window.__brumaluz` e os eventos.
- **Os modelos de personagem** `herbolaria`, `lanterneiro` e `musgueira`.

## Decisões do dono
**18 nov 2026:**
- Saem Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos.
- Ficam Lua, Doce, Rancho, Cidade e Vila.
- Os mundos salvos desses temas são apagados, sem cópia.
- A voz do orelhão fica.
- Consertar os testes antigos.
- Redesenhar os ícones dos gestos.

**19 nov 2026:**
- Na Azure saem só os mundos desses quatro temas, sem a rodada de conferência antes.
- Os mundos do aparelho sem tema saem.
- A Vila Neon é o padrão.
- O que a criança ganhou nesses mundos some junto.
- A faixa azul do iPhone entra (e sai no mesmo dia: vai com a casca nativa, 020).
- As prévias fracas são refeitas.
- Moedinhas, experiência e nível ganhos nos mundos que saem ficam com a criança (recomendação aceita).

**20 nov 2026:**
- **Ícones dos gestos:** a direção A reforçada. É o boneco do jogo desenhado fazendo o gesto, com um objeto forte em cada um para nenhum ficar parecido com outro:
  - notas no Dançar;
  - confete no Comemorar;
  - a cadeira no Sentar;
  - setinha no Apontar;
  - a estrela no Pulo de estrela;
  - faíscas no Aplaudir.
  
  A folha refeita volta ao dono antes de entrar no jogo.
- **A folha da A reforçada foi aprovada pelo dono** (20 nov): os ícones entram no jogo como estão na folha (`capturas-034/gestos/folha-A2.png`).
- **Portão visual (20 nov):** refazer 4 ícones de gesto que confundiam (reverência sem nada saindo de trás, tirando o chapéu; apontar para a direita, para uma estrela; aplaudir com mãos grandes e "plac"; roqueiro com guitarra de verdade); os outros 7 ficam. O balão continua com o boneco padrão (a cara de quem faz o gesto vai para o backlog).
- **Os 4 ícones refeitos foram aprovados pelo dono** (20 nov; `capturas-034/gestos/folha-A3.png`).
- **Rastros do nome nos códigos e fantasias:** a palavra "BRUMA" sai do sorteio dos códigos de sala (os códigos antigos continuam valendo); a fantasia "Herói da Mata" fica ("mata" é floresta, não o mundo).
- **Apelido salvo com o final de um tema que saiu** ("… da Bruma", "… dos Dinos", "… da Mata", "… Estelar"): troca só o final pelo da Vila ("… da Vila"), na limpeza do aparelho.

## Revisão da spec (19 nov 2026)
O revisor aprovou com ajustes. Entraram nesta versão:
- O canto do Doce protegido: só sai o ramo dos Dinos, e o d2 sai sem tocar no e2.
- Os hashes dos cinco e do canto do Doce, gravados na T00.
- O `temaBase()` definido: completo, neutro e não escolhível; o `obterTema` cai na base.
- A imagem de compartilhar.
- A lista exata de créditos e o teste novo.
- A lista do que é só dos quatro completada.
- Criar com tema removido é recusado por versão.
- A publicação com o servidor primeiro, e a correção do texto do cliente antigo.
- Na varredura:
  - a segunda varredura e a remoção na leitura;
  - a varredura sem segurar `/saude`;
  - a varredura percorre os mundos;
  - o `Armazem` apaga a pasta;
  - o log sem o nome do mundo.
- No iPhone: medir no aparelho antes de corrigir.
- Nos gestos: as duas direções com o boneco do jogo, e as carinhas dos amigos.
- A busca no `dist/` com palavras e exceções.
- A mudança mínima de lugar da base.
- A limpeza do aparelho: lugar, ordem e o tema desconhecido.
- As chaves `terrario:aparencia` e `terrario:trilha-saida`.
- Moedinhas, XP e nível ficam com a criança.
- Os JSON do Bruma na paridade.
