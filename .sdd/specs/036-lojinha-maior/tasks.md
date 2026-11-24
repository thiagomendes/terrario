# 036 Lojinha maior: tarefas

Uma entrega só, publicada inteira. Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com:
- `npx tsc --noEmit -p .`;
- os testes que tocou;
- um commit `tipo(036-lojinha-maior): ...`;
- as fotos em `capturas-036/<fase>/`;
- o aperitivo ao dono.

O esboço fica no branch `esboco/036-lojinha-maior` (o código em `src/esboco/lojinha*.ts`) e sai do código na T11.

| Fase | Tarefa | Quem | O que entrega | Pronto quando | Tam. |
|---|---|---|---|---|---|
| 0 | T00 **Medidas de antes** | `testador` | na Vila Neon de dia, celular em pé com a CPU 4×: os quadros e as chamadas com 4 amigos de premium de hoje; o tempo de abrir a vitrine | os números na Situação | P |
| 1 | T01 **Catálogo, regras e rede** | `engenheiro-nucleo-rede` | os 12 itens e as categorias `andar`, `chapeu` e `mao`; o `LUGAR_DIVIDIDO` em lista; as regras de cabeça e de mão e a função única de "o que sai" em `tesouroEFantasia.ts`; a chave à parte dos comprados e a lista de "depois"; o `montado` na aparência; o "pode montar"; a `VERSAO_REDE` em 18, com o motivo e o teste da cópia congelada | testes de `alma`, da aparência e de `tesouroEFantasia`; paridade 36/36 | M |
| 1 | T02 **O Unicórnio-pônei** (em paralelo com a T01) | `artista-voxel` | a borda, o brilho e o tremor ao voar, achando a causa de cada um | fotos de antes e depois; vídeo voando | M |
| 2 | T03 **As peças no boneco e os efeitos** | `artista-voxel` | o boné, o pijama, as asas, a mochila-foguete, a varinha, o guarda-chuva e a pipa, com as correções da spec; o passarinho preso ao ombro; as bolhas, as gotinhas, a fumacinha e a hélice; as figuras de cada item | fotos de cada um (três-quartos, de frente, de costas, dia e noite, 390×844), uma tela deitada e o computador; vídeo curto dos efeitos | M |
| 3 | T04 **Montar e descer** (pode começar com um brinquedo provisório logo depois da T01) | `desenvolvedor-jogo` | a roda (um item por brinquedo e o "Descer"); comprar ou vestir já monta; o puf e os sons de montar e descer; o descer sozinho pelo "pode montar"; o premium da mão guardado e devolvido; os amigos veem sem refazer o boneco | testes e2e de montar e descer em 2 mundos, com um amigo na sala e com o carrossel | M |
| 3 | T05 **Os brinquedos de andar** | `artista-voxel` | os 4 modelos e as animações (impulso, pedal, balanço, rodinhas), ligados no montar da T04 | fotos parado e andando; vídeo | M |
| 4 | T06 **A vitrine, o provador e Meus tesouros** | `desenvolvedor-jogo` | as abas por lugar, a rolagem, a estrelinha de novo (na chave própria); o provador montado e o da pipa; "Meus tesouros" com os 18 itens e o "o que sai" às claras | os testes da lojinha e de Meus tesouros; fotos nas 3 telas | M |
| 4 | T07 **Sons dos itens** | `desenvolvedor-jogo` | os sons das rodinhas, do pedal, da hélice, das bolhas, do foguete, das gotinhas e da pipa | o aperitivo de sons ao dono | P |
| 5 | T08 **Desempenho** | `testador` | a mesma medida da T00 com os 4 amigos montados e com itens novos; o quadro mais longo ao montar | as metas da "Experiência medida" | P |
| 5 | T09 **Conferência por área** | `testador` | a conferência do passo 6 do `CLAUDE.md` (áreas: alma e lojinha, gestos e roda, nuvem e amigos, leiaute; paridade, porque o `normalizarAparencia` está no caminho do núcleo) | o tempo da conferência registrado | P |
| 5 | T10 **Revisão do núcleo** | `engenheiro-nucleo-rede` novo | a revisão de código das partes de núcleo e rede | consenso | P |
| 5 | T11 **Portão visual e publicação** | `revisor-visual` novo, depois o orquestrador | o revisor só com as fotos; o esboço sai do código; o servidor antes do site; conferir no ar; vídeo ao dono | publicado e conferido no ar | P |

## Situação (24 nov 2026)
| Parte | Estado |
|---|---|
| Esboço | o dono escolheu 10 em 23 nov e mais 2 em 24 nov (os 12 da spec) |
| Spec | revisada pelo engenheiro de núcleo e rede em 24 nov (15 apontamentos, todos acolhidos: a compra fica no aparelho, a `VERSAO_REDE` fica em 18, as regras de cabeça e de mão, o `montado` na aparência, a chave à parte dos comprados); **aprovada pelo dono em 24 nov**, com as três regras recomendadas (brinquedos só enfeite, montada faz tudo menos o abraço, comprar já monta) |
| T01 Catálogo, regras e rede | **pronta (24 nov)**. Os detalhes abaixo |
| T02 O Unicórnio-pônei | **pronta (24 nov)**: a borda, o brilho e o tremor, cada um com a causa achada. Os detalhes abaixo |
| T03 As peças no boneco e os efeitos | **pronta (24 nov)**: as 7 peças, o passarinho no ombro, os efeitos e as figuras. Os detalhes abaixo |
| T04 Montar e descer | **pronta (24 nov)**, com um brinquedo provisório: a roda, comprar já monta, o puf e os sons, o descer sozinho, a mão guardada, os amigos sem refazer o boneco, a volta da queda. Os detalhes abaixo |
| T05 Os brinquedos de andar | **pronta (24 nov)**: os 4 modelos do esboço e as animações, +15 chamadas de desenho com 4 amigos montados. Os detalhes abaixo |
| T06 A vitrine, o provador e Meus tesouros | **pronta (24 nov)**: as abas só com desenho, a estrelinha de novo, o provador montado e o da pipa, a linha da pipa na figura, Meus tesouros com os 18 e o "o que sai" com a fantasia. Os detalhes abaixo |
| T07 Sons dos itens | **pronta (24 nov)**: as rodinhas, o pedal, a hélice, as bolhas, o foguete, as gotinhas e a pipa, feitos em código e mais baixos que os passos. Os detalhes abaixo |
| T00 Medidas de antes | **feita (24 nov)**, na `main` 2ed1739. Os números estão junto com os da T08 |
| T08 Desempenho | **medida (24 nov)**: os brinquedos sozinhos passam (-6% de quadros, +17 chamadas), montar passa (50 a 95 ms), a vitrine passa (cartões em 0,1 s). **Duas metas falham com os itens novos juntos** (-14% a -19% de quadros, +39 a +47 chamadas), como já falhavam os premium de hoje na `main` (-23%, +71). E há picos ao descer. As causas estão abaixo. **Depois de juntar as malhas**, a mão ficou com -13% e +23 e os montados com -14% e +32: as duas metas ainda falham, e o descer passou nas 6 vezes |
| T09 Conferência por área | **feita (24 nov)**: nada voltou para trás por causa do ramo. Levou 79 min, mais 45 min conferindo contra a `main`. Uma suíte instável que também falha na `main` foi para a quarentena. Os detalhes abaixo |

### T01 (24 nov 2026, `engenheiro-nucleo-rede`)
- **O catálogo:** os 12 no `PREMIUM` (`src/jogo/alma.ts`), com os ids, preços e efeitos da spec; as categorias `andar`, `chapeu` e `mao` no fim de `CATEGORIAS_PREMIUM`. A vitrine já lista os 18, sem a figura dos novos até a T03 e sem as abas até a T06.
- **O lugar dividido em lista:** `LUGAR_DIVIDIDO = { fantasia: ['costas', 'chapeu'], costas: ['fantasia'], chapeu: ['fantasia'] }`, com o `lugaresDe`. O `saiAoVestir`, o `vestirPeca` e o conserto do `normalizarPerfilAlma` (a fantasia fica, a capa e o boné saem) seguem a lista. O `normalizarPremium` da aparência faz o mesmo, venha a aparência de onde vier: uma peça só à vista.
- **A cabeça e a mão** (`src/personagem/tesouroEFantasia.ts`):
  - `PECAS_DA_CABECA`, `PECAS_DA_MAO` (a varinha e o cetro);
  - `oQueSai(a, vestidos, escolha)` é a regra única, para um tesouro ou uma fantasia. Ela devolve, em ordem, os tesouros que saem e, da fantasia, ela inteira ou só a peça que sai sozinha (`{ tipo: 'premium' | 'fantasia' | 'peca' }`). O `tirarDaFantasia` aplica a lista;
  - o `tesourosQueSaem` e o `aoVestirTesouro` de hoje passaram a usar a regra única, e a interface continua igual até a T06;
  - o `acessorioEscondido` diz quando o enfeite do look some debaixo do tesouro: a mochila debaixo das costas, o chapéu e o capuz debaixo do boné, a lanterna debaixo da mão. **Para a T03:** ligar no `boneco.ts:206` no lugar da regra só da mochila;
  - **Para a T03:** a tiara, o enfeite de cabeça e a faixa da testa ficaram **fora** de `PECAS_DA_CABECA`. O artista decide pelas fotos se algum entra. Um teste garante que toda fantasia que cobre a cabeça tem a peça dela na lista;
  - a varinha de bolhas não liga as florzinhas do baile: o `temVarinha` só olha a fantasia, e vestir o premium da mão tira a varinha da fantasia (põe em `sem`).
- **Nada some:**
  - a chave à parte `terrario:alma-comprados` (`{ versao: 1, ids }`, que só cresce) se une ao perfil na leitura;
  - o `PerfilAlma` ganhou o `depois`, com os ids bem formados e desconhecidos (até 64), que voltam aos comprados quando o catálogo os conhecer;
  - o teste do site que volta atrás usa a cópia congelada do `normalizarPerfilAlma` de antes;
  - um perfil com id desconhecido sobrevive a carregar e salvar.
- **O montado:**
  - `montado?: true` na aparência, só com `premium.andar` e sem patins nem skate;
  - nunca é salvo: o `salvarAparencia` e o `carregarAparencia` o apagam, e a cena o apaga ao entrar no mundo;
  - o `manterMontado` é usado no `estado.personagem.definir` como os patins: o `definir` nunca monta, e só desmonta quando o brinquedo sai.
- **O "pode montar":** `src/personagem/montar.ts`, puro, com:
  - `motivoSemMontar`, `podeMontar` e `precisaDescer`;
  - `brinquedoMontado`;
  - o registro `criarBrinquedosDeTema()`, em que cada brinquedo de tema se registra.

  Ninguém o chama ainda: é a T04.
- **A rede fica na 18:**
  - o motivo está no comentário da `VERSAO_REDE`;
  - `tests/rede/congelado18.ts` é a cópia congelada das regras da 18 de antes, e `tests/rede/versao-036.test.ts` prova que ela passa a aparência da 036 a limpo, sem os itens novos e sem o `montado`, e que a aparência mais cheia cabe com folga no teto de 4096;
  - nenhum comando, evento ou campo de quadro novo.
- **Um conserto de quebra:** o `premiumMundo` montava como bicho que segue qualquer `premium.bicho`. Com o passarinho, o `DESENHOS[id]` não existe e daria erro. Agora só o pinguim e o unicórnio seguem pelo chão (`ehBichoQueSegue`).
- **Os testes:**
  - novos: `tests/personagem/montar.test.ts`, `tests/rede/versao-036.test.ts`, os blocos 036 de `alma.test.ts`, `tesouroEFantasia.test.ts` e `premiumPlacas.test.ts`;
  - mudou um caso de `almaCrianca.test.ts`: o perfil reescrito à mão sem o unicórnio agora o recebe de volta pela chave à parte, de propósito.
- **A conferência:**
  - o `npx tsc --noEmit -p .` está limpo;
  - o Vitest inteiro está verde: 242 arquivos e 2231 testes;
  - antes, numa rodada com a máquina cheia (a paridade na placa e outro agente), 3 testes de tempo tinham caído. Eram o `fila`, o `politicaCelular` e o `cobertura` (o atlas levou 168 ms, e o teto é 150). Passaram sozinhos e na rodada inteira de depois;
  - a paridade deu **36/36** (`PARIDADE=conferir`, 1 trabalhador, 19 min). O hash dos temas não mudou.
- **Para a T06:** o `e2e/lojinha.spec.ts` ("os seis cartões à vista, sem rolar") e outros testes de tela da vitrine vão falhar com os 18 até as abas entrarem.
- **Para a T04:**
  - ao reconectar na nuvem, o "entrar" leva a aparência guardada, sem o montado (nem os patins, como já é hoje): o amigo vê a criança a pé até a próxima aparência;
  - vale mandar a aparência de agora depois do "bem-vindo";
  - o `INTERVALO_APARENCIA` do núcleo junta montar e descer muito seguidos (fica a última, como já é).

### T02 (24 nov 2026, `artista-voxel`)
- **As fotos:** `capturas-036/t02-unicornio/` (`antes/` e `depois/`, com o `indice.md`): parado, de perto, trotando, pulando e voando, de dia e de noite, no celular em pé; o vídeo voando (`voando.webm`, computador) e a medida do tremor (`tremor.json`). Saem de `e2e/capturas-036.spec.ts` (`CAPTURAS_036=t02`).
- **A borda estranha:**
  - o bicho ficava no mapa do brilho da cena (o `GlowLayer`), que pinta o piso de luz do plástico pela silhueta inteira e borra: de noite, um halo branco em volta do corpo;
  - o contorno claro (`renderOutline`) fazia a linha branca da borda;
  - as malhas agora levam o nome `personagem-premium-…` (fora do brilho, como os bonecos), e o contorno saiu. O pinguim tem a mesma montagem e ganhou o mesmo conserto (uma chamada de desenho a menos por bicho).
- **O brilho:**
  - o chifre ia de 1,45 a 1,75 de luz, acima do limiar do bloom (1,0); agora fica entre 0,74 e 0,86 (`premiumLuzes.ts`);
  - os brilhinhos e os coraçõezinhos (o pool de todos os premium) saíram do mapa do brilho. Isso vale também para os brilhinhos do tênis-cometa e da capa, que deixam de borrar;
  - o unicórnio solta menos brilhinho (a cada 0,3 a 0,4 s trotando, antes 0,12 a 0,2 s), menores, e 4 corações em vez de 5.
- **O tremor ao voar:**
  - a procura do chão, sem achar nada (criança a mais de uns 7 blocos do chão), devolvia a própria altura procurada: o bicho via um degrau acima a cada quadro, subia aos trancos e, passando 8 blocos de diferença, era jogado de volta num puf (e recomeçava);
  - voando a 11 ou 20 blocos por segundo, ele (6,5) ficava para trás e reaparecia num puf a cada 1 ou 2 s;
  - agora o `chao` devolve `null` sem chão; com a criança no alto, o unicórnio voa junto pela mola crítica (`src/render/seguirVoando.ts`, a conta exata, com o lugar adiantado pela velocidade dela) e desce planando; o pinguim espera embaixo;
  - medido voando de lado por 3 s: **antes 8 e 11 saltos** (o maior de 8 blocos num quadro), **depois 0** (o maior passo, 0,56 bloco).
- **Os testes:** `tests/render/seguirVoando.test.ts` (novo: voando a 11 e 20 blocos por segundo com quadros de tamanhos variados, sem salto, sem atraso e sem tranco; a mola estável e sem passar do ponto; um pulo comum não liga o voo). `tests/render` e `tests/personagem` verdes.
- **Ficou fraco:** a foto trotando pega o unicórnio na beira (a câmera do jogo vira junto); o vídeo é `.webm` (sem `ffmpeg` no computador).
- **O pinguim** (pedido do orquestrador: o filho do dono o viu subindo e descendo aos trancos): `capturas-036/t02-unicornio/pinguim/` (`antes/` no commit de antes do 25b6afe, `depois/`, o `indice.md` e o vídeo `depois/pinguim-voando.webm`).
  - a mesma causa do unicórnio, já consertada no 25b6afe; depois dele ainda sobravam três: voando longe, ele "aparecia perto" da criança no ar; o degrau era subido de uma vez no quadro seguinte ao pulinho; e a parede mais alta que um pulinho era subida de elevador;
  - agora ele espera embaixo e corre atrás pelo chão (só aparece perto num puf quando ela pousa longe), pula o degrau por cima e para diante da parede;
  - medido (saltos de mais de 1 bloco num quadro; degraus de mais de ¼ de bloco para cima num quadro): **voando, antes 9 saltos e 131 degraus, depois 0 e 0**; parada no ar, 8 e 119 para 0 e 0; pousando, 3 e 32 para 1 e 0 (o puf de propósito, ela pousou a 18 blocos); pulando e descendo da torrinha, 0 e 0 nos dois;
  - nenhum outro bicho usa essa procura do chão: o passarinho vai preso ao boneco (`tronco`), e os bichos dos mundos que seguem a comida andam pela física do núcleo.

### T03 (24 nov 2026, `artista-voxel`)
- **As fotos:** `capturas-036/t03-pecas/` (com o `indice.md`): cada peça de três-quartos, de frente e de costas, de dia e de noite, no celular em pé; uma tela deitada e uma no computador; as figuras da lojinha (`figuras/`); a decisão da cabeça (`cabeca/`); o custo (`custo.md`); o vídeo dos efeitos (`efeitos.webm`). Saem de `e2e/capturas-036.spec.ts` (`CAPTURAS_036=t03`, e `custo`).
- **As peças** (`src/personagem/bonecoPremiumLojinha.ts`, chamado pelo `vestirPremiumNoPlano`): o boné de hélice, o pijama de nuvem, as asas de borboleta, a mochila-foguete, a varinha de bolhas, o guarda-chuva e a pipa, saídas do esboço no padrão das peças de hoje. As correções da spec:
  - o guarda-chuva maior (raio 0,66 para 0,82) e sempre em pé por cima da cabeça: o nó dele desfaz o giro da mão a cada quadro e gira devagar em volta do cabo;
  - a fumacinha: andando, fica para trás e sobe se desfazendo; parada, sai para baixo e para os lados e some antes de voltar à altura do foguete (nem tufo embaixo, nem coluna na frente dele);
  - a pipa com os lacinhos maiores (0,08 para 0,13), voando atrás, à esquerda e no alto, com o desenho virado para a câmera do jogo; a linha sai da mão esquerda levantada para o alto e para fora e passa por fora do corpo e da cabeça.
- **A mão esquerda:** os três tesouros da mão vão na `maoE`, e o braço esquerdo segura no alto (`bracoDoTesouro` em `render/boneco.ts`), menos durante um gesto. A lanterna do look some debaixo deles.
- **O passarinho:** peças do boneco presas ao tronco (o nó `passaro`, com as asinhas em nós dentro dele: o `subjunta` ganhou `rot` e `pai`), na ponta do ombro direito, mais para fora e um tico para trás do que no esboço. Não entra no "seguir" (`ehBichoQueSegue`). `tests/personagem/passarinhoOmbro.test.ts` prova que, de nenhum ângulo da câmera do jogo (a volta inteira, do pitch mais baixo ao mais alto), ele cobre o rosto ou a quina da cabeça vista de frente ou de lado; a posição do esboço falha nesse teste. Visto de trás, ele fica na frente do lado da cabeça, como um passarinho de verdade no ombro.
- **Os efeitos** (`src/render/efeitosLojinha.ts`, uma malha com instâncias finas por efeito para todos os bonecos da cena): a fumacinha, as bolhas (o material do esboço aprovado), as gotinhas (só por fora, dos lados e de trás) e a linha da pipa. Brilho contido: nada passa de 0,5 de luz própria, a chaminha do foguete fica entre 0,76 e 0,92 (`chama` em `premiumLuzes.ts`), tudo fica fora do mapa do brilho e nada pisca. A hélice, as asas, o guarda-chuva, a pipa e o passarinho se mexem por fases que andam com o tempo, no `aplicarPose`.
- **As figuras:** os 8 novos no `FOTO_PREMIUM` (`ui/alma/figuras.ts`); o fotógrafo ganhou o quadro `tudo` (o guarda-chuva e a pipa cabem) e a pose parada com o braço no alto quando há tesouro da mão.
- **O `acessorioEscondido`** ligado no `planoBoneco` (`personagem/boneco.ts`), no lugar da regra só da mochila.
- **A cabeça** (decidido pelas fotos em `cabeca/`): a tiara e o enfeite de cabeça entraram em `PECAS_DA_CABECA` (o arco e a concha atravessavam a cúpula do boné); a faixa da testa ficou de fora (fica na testa, debaixo da aba).
- **O custo** (na placa, `custo.md`): cada peça soma de 0 a 3 malhas ao boneco (o pijama, 0; a varinha e o guarda-chuva, 1; o boné e o passarinho, 2; as asas, o foguete e a pipa, 3) e de 1,4 mil a 6,4 mil triângulos; cada efeito é 1 chamada de desenho para todos (as bolhas, 2). Boné, pijama, asas, varinha e passarinho juntos: +10 malhas e +20 mil triângulos. As bolinhas novas ganharam os gomos pelo tamanho (antes o passarinho, as pantufas e as asas passavam de 10 mil triângulos cada). A medida com 4 amigos é a T08.
- **Os testes:** novos `tests/personagem/passarinhoOmbro.test.ts` e `tests/personagem/tesourosNoBoneco.test.ts` (as peças, a mão esquerda, o que some debaixo, a cabeça); `tests/render/premiumPlacas.test.ts` com os tesouros novos. `tests/render` e `tests/personagem` verdes (o `politicaCelular`, de tempo, cai com a placa ocupada e passa sozinho).
- **Ficou fraco:**
  - a figura da pipa na lojinha não tem a linha (a linha é efeito do mundo; no estúdio da foto não há);
  - com várias peças ao mesmo tempo o boneco passa de 5 malhas a mais (as asas e a pipa têm nós próprios); vale conferir na T08;
  - as bolhas de noite ficam acinzentadas (seguem a luz do lugar, como o resto).
- **Os acertos (24 nov, pelo dono e pelo orquestrador):** fotos de antes e depois em `capturas-036/t03-pecas/acertos/` (com o `indice.md`) e o vídeo `depois/passarinho-voando.webm`.
  - o passarinho voa pertinho do ombro direito (decisão do dono: "faz ele voando mesmo, próximo"), um pouco acima e para fora, batendo as asinhas e boiando devagar, preso ao tronco; o `passarinhoOmbro.test.ts` agora conta a volta das asas e o sobe e desce;
  - as asas de borboleta saem das omoplatas, mais baixas e 0,27 para trás, com uma hastezinha; um teste novo prova que nenhuma parte encosta na cabeça nem no cabelo, batendo, nos 9 penteados dos dois corpos (a posição de antes falha);
  - a mochila-foguete ficou sem a aleta do meio (lia como nariz): duas aletas, dos lados;
  - o guarda-chuva: o cabo sai da mão inclinado para o pano ficar centrado por cima da cabeça, com o braço mais alto e o cabo mais comprido;
  - quase todo o código dos acertos entrou no commit da T04 (997764b), que levou os arquivos em comum enquanto eu trabalhava; o commit dos acertos leva o resto (o braço e o cabo do guarda-chuva), as fotos e o spec das capturas.

### T04 (24 nov 2026, `desenvolvedor-jogo`)
- **A roda** (`main.ts`, `ui/iconesAndar.ts`): um item por brinquedo **comprado** ("Andar de patinete", com o desenho dele), só quando ela pode montar nele e não está nele; montada, o "Descer". Sem brinquedo comprado, a roda não muda. Escolher um brinquedo que não está vestido veste pelo perfil (o caminho da lojinha) e já monta: trocar de brinquedo também é 2 toques.
  - **2 toques de verdade:** a roleta abria sempre no Mapa, e o item de andar ficava a 3 ou 4 toques. A lista agora pode dizer o seu começo (`ListaRoda.inicio`, `ExtraRoda.inicio`): com brinquedo, a roda abre no brinquedo; montada, no "Descer". Depois, ela volta onde a criança deixou, como antes. Sem brinquedo, nada muda.
- **Comprar ou vestir já monta** (`vestirPremiumNoBoneco` com festa): quando pode, com o puf e o som do brinquedo no lugar do brilho de vestir. Ao abrir o jogo, ela entra a pé.
- **Montar e descer** (`cena.ts`, `montarNoBrinquedo` e `descerDoBrinquedo`): o puf (um anel de fumacinha clara nos pés, com brilhinhos ao montar) e os sons novos feitos em código (`sons.ts`): o "zum" do patinete, a buzininha do carrinho, a campainha da bicicletinha e o "fuf" da nuvem, todos abaixo do golpe de bloco; descer é o puf. Medido: **4 ms** do toque até o brinquedo aparecer (meta 500 ms).
- **Não refaz o boneco:** o brinquedo entra no plano uma vez, quando vestido, no nó `brinquedo` da junta `prancha` (`personagem/brinquedoAndar.ts`), apagado; o `definirMontado` do `render/boneco.ts` só acende o nó e troca a pose. Nos amigos, o `outrosJogadores` guarda a chave da aparência sem o `montado`: montar e descer só chamam o `definirMontado` (e o puf, sem som).
- **O descer sozinho:** a cada quadro, só com ela montada, o `precisaDescer` do `montar.ts`. Os brinquedos de tema registrados: o parque (carrossel, roda-gigante, bate-bate) e a casa (sofá e trilho). Na ação dela, antes do núcleo: o toque de sentar no parque, calçar os patins, pegar o skate e o toque no Bento (o abraço). O provador desce antes de vestir o look.
- **O tesouro da mão:** montada, sai da aparência e fica guardado; ao descer volta o que o perfil diz que ela veste. Vestir outro tesouro da mão montada também fica guardado.
- **A volta da queda:** depois do bem-vindo, a aparência de agora vai de novo (`cena.reenviarAparencia`, no `nuvem.ts`).
- **O `INTERVALO_APARENCIA`:** conferido, fica com a última (montar e descer dentro da janela não sai nada; montar, descer e montar sai montada), nos dois modos (`tests/nucleo/aparencia-limite.test.ts`). Nada mudou no núcleo, na rede nem no servidor.
- **Onde a T05 liga** (`personagem/brinquedoAndar.ts`): `vestirBrinquedoAndar` (os modelos, na `prancha`, no nó `brinquedo`; rodinhas e pedal em nós com `pai: 'brinquedo'`), `MONTARIA` (as medidas do esboço), `poseNoBrinquedo` (o impulso e o pedal) e, no `render/boneco.ts`, `animarBrinquedo` (vazio, chamado só montada).
- **Os testes:** novos `tests/personagem/brinquedoAndar.test.ts`, `tests/render/montarBoneco.test.ts` (as mesmas malhas antes e depois de montar) e o caso 036 em `outrosJogadores.test.ts` e `aparencia-limite.test.ts`; `tests/render`, `tests/personagem`, `tests/audio`, `tests/ui`, `tests/rede` verdes. E2E `e2e/montar-036.spec.ts`: a Vila Neon no celular em pé (comprar já monta, a roda nos 2 toques, sem refazer, a mão guardada, o carrossel sem nenhum quadro montada e sentada, voar desce, recarregar entra a pé) e duas crianças no Rancho Alegre na nuvem (a Bia vê montar e descer sem o boneco ser refeito, e depois da queda da internet da Ana).
- **As fotos:** `capturas-036/t04-montar/`.
- **Ficou fraco:**
  - os brinquedos são caixinhas provisórias (a T05);
  - com um tesouro da mão, montar e descer refazem o boneco (o tesouro sai da aparência), aqui e nos amigos; sem ele, não. Medir na T08;
  - o provador faz descer (o provador montado é da T06); **o modo foto não faz descer** (orquestrador, 24 nov: a foto em cima do brinquedo), só impede montar enquanto está aberto (`precisaDescer`, corrigido depois da T04);
  - o ícone do "Descer" é provisório, no estilo dos ícones da roda.

### T05 (24 nov 2026, `artista-voxel`)
- **As fotos:** `capturas-036/t05-brinquedos/` (com o `indice.md`): cada brinquedo parado e andando, de três-quartos e de lado, de dia e de noite, no celular em pé; uma tela deitada e uma no computador; o vídeo dos 4 andando (`brinquedos-andando.webm`); o custo (`custo.md`). Saem de `e2e/capturas-036.spec.ts` (`CAPTURAS_036=t05`).
- **Os modelos** (`src/personagem/brinquedoAndar.ts`, no lugar das caixinhas da T04): o patinete de luz, o carrinho de pedal (aberto, sem teto), a bicicletinha (1,2 vez maior que no esboço, a correção da spec) e a nuvem fofa (sem carinha), saídos do esboço, todos na junta `prancha` e no nó `brinquedo`. As partes que giram ficam em nós dentro dele (`andarRodaF`, `andarRodaT`, `andarRodinhaE` com as duas rodinhas de apoio no mesmo eixo, `andarPedal`); a nuvem boia com o nó do brinquedo inteiro.
- **As animações:** o estado do andar (`avancarAndar`, pela passada da criança) é um só para a pose e para os nós:
  - as rodas giram pelo caminho andado sobre o raio (sem patinar);
  - o pedal gira e as pernas vão e voltam na mesma volta (o carrinho e a bicicletinha);
  - o patinete dá o impulso com o pé esquerdo a cada 1,3 s andando; parado, o pé descansa para trás;
  - a nuvem e a criança boiam juntas (um seno só, 0,035 de altura), e andando ficam nuvenzinhas para trás (o pool da fumacinha, em `efeitosLojinha.ts`).
- **O brilho contido:** as rodinhas do patinete (`menta`) e os faróis do carrinho (`farol`) são luzes novas do `premiumLuzes.ts`, abaixo de 1 e fora do mapa do brilho; o resto é plástico. Sem arco-íris (violeta, azul, menta, branco).
- **O custo** (na placa, `custo.md`): montado, o boneco soma 5 malhas no patinete, 3 no carrinho, 5 na bicicletinha e 0 na nuvem (de 3 a 11,7 mil triângulos). Com 4 amigos montados, um em cada brinquedo, **+15 chamadas de desenho** por quadro sobre os mesmos 4 a pé (a meta é +20). Para chegar lá: o brinquedo inteiro num brilho só (uma malha por nó), as duas rodinhas de apoio num nó e a nuvem sem nó próprio (antes eram +23).
- **Montar não refaz o boneco:** o `tests/render/montarBoneco.test.ts` continua verde.
- **Os testes:** `tests/personagem/brinquedoAndar.test.ts` ganhou as animações (as rodas sem patinar, nada gira parado, as pernas no pedal na mesma volta, o impulso e o pé descansando, a nuvem boiando sem tranco, a bicicletinha maior) e aceita os nós dentro do brinquedo; `tests/render/premiumPlacas.test.ts` com os de andar.
- **Ficou fraco:**
  - as rodinhas do patinete ficam acesas o tempo todo (a luz é uma por cena, para todos os bonecos: não dá para acender só quando roda);
  - os faróis do carrinho também ficam acesos de dia (mansos);
  - a figura do passarinho voando na lojinha não foi refeita: é uma linha no `fotoBoneco.ts` (aplicar a pose parada também com o passarinho), que está com o `desenvolvedor-jogo` na T06.
- **Os acertos (24 nov, pelo vídeo do dono):** fotos de antes e depois em `capturas-036/t05-brinquedos/acertos/` (de três-quartos e de lado, parada e andando, de dia; o depois também de noite) e o vídeo novo `depois/brinquedos-andando.webm`.
  - as mãos fecham no guidão: montada, os braços apontam do ombro para o punho (o patinete e a bicicletinha), para os lados do volante (o carrinho) e para os bracinhos da poltrona de nuvem (dois novos), no espaço do tronco de cada quadro (`maosNoGuidao` em `render/boneco.ts`, os pontos em `GUIDAO`). A bicicletinha ganhou a mesa do guidão (o guidão um tico para trás e para baixo) e a criança inclina um pouco mais para a frente;
  - o volante "mexendo a cada passo" era o corpo de quem anda a pé: o tronco torcendo a cada passo e o corpo inclinando na corrida levavam os braços e as mãos junto, por cima do volante parado. Montada, o tronco e o corpo ficam firmes (só o impulso do patinete e o pedal mexem);
  - `tests/render/maosNoGuidao.test.ts` (novo, com o boneco de verdade num motor sem tela): nos 4 brinquedos e nos dois corpos, parada e andando (o passo, o giro do tronco e a inclinação do corpo de quem anda), a mão fica a menos de 0,07 bloco do ponto do guidão ao longo de um ciclo inteiro; e o guidão e o volante não saem do lugar com o passo (só a nuvem boia, de propósito);
  - o volante não vira nas curvas (ficaria natural, mas o boneco não sabe da curva sem mexer no corpo vivo: ficou de fora).

### T06 (24 nov 2026, `desenvolvedor-jogo`)
- **As abas** (`src/ui/alma/loja.ts`): uma por lugar do corpo, na ordem andar, roupa, costas, mão, chapéu, bichinho e fantasia, só com o desenho (o nome fica no `aria-label`). No computador e deitado elas ficam no topo, entre a placa e a carteira; em pé, numa linha própria logo abaixo. A aba escolhida sobe e acende em azul.
  - Só os cartões da aba aberta são desenhados (de 1 a 4): a vitrine abre mais leve que com os 18.
  - A prateleira cabe sem rolar em toda aba, nas 3 telas (4 numa fileira no computador e deitado, 2 × 2 em pé), e rola por dentro se um dia não couber; a página nunca rola. Os cartões têm o mesmo tamanho de antes.
  - O detalhe de um item de outra aba (vindo de "Meus tesouros") leva a vitrine para a aba dele.
- **A lembrança do aparelho** (`src/ui/alma/lojaNovidades.ts`, chave `terrario:loja-novidades`, fora do perfil): a primeira visita depois da atualização abre na aba de andar; depois, na aba de onde ela saiu. A estrelinha de novo fica nos 12 itens da 036 (no cartão e na aba que ainda tem algum) até a criança abrir o detalhe do item uma vez. Perder a chave só traz as estrelinhas de volta.
- **O provador:** o brinquedo de andar se prova montada (só na tela dela: `personagem.provar(look, montada)`; a aparência de verdade não muda); a câmera fica mais longe para o brinquedo caber. A pipa se prova vista por trás, com a câmera longe e alta, para a pipa voando caber. O "anda um pouquinho em volta" da spec não entrou: a criança fica parada no provador (ver "Ficou fraco").
- **As figuras** (`ui/alma/figuras.ts`, `render/fotoBoneco.ts`): os 4 brinquedos com a criança montada e o brinquedo inteiro no quadro; a linha da pipa desenhada da mão até a ponta de baixo da pipa, por trás do boneco; o passarinho voando perto do ombro (a pose parada também com ele, pedido do artista).
- **O "o que sai" às claras:** a lojinha e "Meus tesouros" usam a regra única `oQueSai` da T01. A figurinha da fantasia (inteira ou só a peça dela) aparece junto da dos tesouros que saem.
- **"Meus tesouros"** (`src/ui/meusTesouros.ts`): os 18 itens, com as figuras dos de andar e da pipa. Com muitos, a prateleira rola dentro de um rolo em volta da grade e não toma o painel. Na primeira tentativa a grade mesma rolava, e os cartões se encavalavam (as asas tapavam a bicicletinha): o rolo em volta resolveu, e o teste agora confere que nenhum cartão fica por cima de outro.
- **O tempo de abrir** (medido na página, quadro a quadro, na placa e com o outro agente usando a placa ao mesmo tempo): a vitrine aberta, com os cartões da aba na tela, em **35 a 52 ms** (meta: 1 s). As figuras do 3D ficam prontas em **0,9 a 1,8 s** na primeira vez da página (o estúdio de fotos nasce aqui); depois vêm do cache.
- **Os testes:**
  - `e2e/lojinha.spec.ts` agora confere em cada aba, nas 3 telas, os cartões à vista sem rolar e dentro da tela, só números como texto, as abas sem palavra, o tamanho dos cartões, a estrelinha, a aba lembrada, o provador montado e o da pipa;
  - `e2e/meus-tesouros.spec.ts` ganhou os 18 (prateleira cabendo, sem cartão por cima de outro, as figuras, vestir um de andar);
  - novo `tests/ui/lojaNovidades.test.ts`.
  - Passaram na placa: `lojinha` (3/3), `meus-tesouros` (3/3), `tesouro-fantasia` e `menu-roda`. Uma rodada de `lojinha` caiu no tempo da festa (3,5 s para uma meta de 3,4 s) com o outro agente usando a placa, e passou na rodada seguinte.
- **As fotos:** `capturas-036/t06-vitrine/` (cada aba nas 3 telas, os detalhes, os provadores, a festa) e `capturas-036/t06-vitrine/tesouros/` (Meus tesouros, com os 18).
- **Ficou fraco:**
  - no provador o brinquedo não anda em volta;
  - em pé, a câmera do provador montado ainda fica perto: a criança aparece grande;
  - as figuras do 3D levam de 0,9 a 1,8 s na primeira abertura da página (os cartões aparecem antes, com o preço e o pedestal).

### T07 (24 nov 2026, `desenvolvedor-jogo`)
- **Os sons** (`src/audio/somItens.ts`, que é puro, e os timbres em `src/audio/sons.ts`), todos feitos em código, curtos e mais baixos que os passos:
  - as rodinhas do patinete e do carrinho e o pedal da bicicletinha e do carrinho, só montada e andando no chão, com o ritmo pela velocidade;
  - a hélice do boné, só correndo;
  - as bolhas da varinha, cada 2,3 s;
  - a fumacinha do foguete, andando;
  - as gotinhas do guarda-chuva, cada 1,3 s;
  - a pipa no vento, cada 3,2 s;
  - a nuvem fica calada (só o "fuf" de montar).
- **O que decidi:**
  - só a criança da tela toca, para não virar um coro de bolhas com 4 amigos;
  - nada toca no modo foto nem com uma tela por cima;
  - nenhum som passa de 2 por segundo;
  - o som que volta a valer espera um pouco antes do primeiro;
  - a velocidade vem do caminho andado (um teleporte não vira corrida).
- **Os testes:** novo `tests/audio/somItens.test.ts`; os sons novos passam pela régua da 019 (`somResto.test.ts`: curtos e abaixo do golpe).
- **Falta:** o aperitivo de sons ao dono (gravar o áudio pede o navegador com som; fica com o orquestrador).

### T00 e T08 (24 nov 2026, `testador`)
- **Como foi medido:** a suíte nova `e2e/desempenho-036.spec.ts` (`MEDIR_DESEMPENHO=1`, `E2E_SEM_VSYNC=1`), igual na `main` 2ed1739 (T00) e no ramo 6f5d877 (T08). Vila Neon de dia, celular em pé 390×844, CPU 4×, distância e qualidade de fábrica do celular, na placa.
  - Os 4 amigos ficam à vista, de 6 a 14 blocos, e a câmera gira devagar por 8 s. São 3 rodadas alternadas por cenário:
    - **nada:** sem premium;
    - **hoje:** os 6 de antes da 036;
    - **andar:** só os 4 brinquedos, montados;
    - **montados:** um em cada brinquedo, mais o boné, o pijama, as asas ou o foguete e o passarinho;
    - **mão:** a pé, com a varinha, o guarda-chuva e a pipa, mais o boné, o pijama, as asas ou o foguete.
  - Os números brutos estão em `capturas-036/t08-desempenho/medidas.txt`. A primeira medida da T00, com a qualidade alta e a distância 7, deu 5 quadros com nada e foi descartada.
- **Os números** (médias das 3 rodadas; a `main` e o ramo saem de rodadas diferentes, por isso cada um compara com o próprio "nada"):

  | Cenário | Quadros por segundo | Queda | Chamadas | A mais |
  |---|---|---|---|---|
  | `main` nada | 25,0 | | 185 | |
  | `main` hoje | 19,1 | -23% | 256 | +71 |
  | ramo nada | 26,8 | | 184 | |
  | ramo hoje | 22,2 | -17% | 238 | +54 |
  | ramo andar | 25,3 | **-6%** | 202 | **+17** |
  | ramo montados | 21,7 | **-19%** | 232 | **+47** |
  | ramo mão | 23,0 | **-14%** | 223 | **+39** |

- **Contra as metas:**
  - **queda de no máximo 10%:** passa com os brinquedos sozinhos (-6%). **Falha com os itens novos** (-14% e -19%). Os premium de hoje já caíam 23% na `main`; no ramo eles caem 17% e gastam 17 chamadas a menos;
  - **no máximo +20 chamadas:** passa com os brinquedos sozinhos (+17, a T05 achou +15). **Falha com os itens novos** (+39 e +47);
    - **a causa:** cada peça nova é uma ou mais malhas próprias por boneco, e cada malha desenha de novo na sombra. O `custo.md` da T03 dá o boné com 2 malhas, as asas, o foguete e a pipa com 3 cada, e o passarinho com 2. Um amigo montado com boné, asas e passarinho soma umas 12 chamadas, e 4 amigos passam de 40;
    - **onde está:** `src/personagem/bonecoPremiumLojinha.ts`, nas peças em nós próprios. Juntar as malhas do mesmo nó e do mesmo material, como a T05 fez no brinquedo, deve trazer de volta para perto de +20;
  - **o quadro mais longo abaixo de 100 ms ao montar e descer** (os 4 juntos, 10 vezes cada nas duas rodadas):
    - montar passa: de 50 a 95 ms;
    - descer: 7 das 10 vezes passam, de 47 a 87 ms; **3 vezes passaram de 100 ms** (104, 175 e 263 ms);
    - a cena parada também tem picos de 177 a 239 ms em 1 de cada 4 janelas de 8 s, sem nada mudando. Por isso não se prova que o pico vem do descer. O suspeito é o puf (`aoMontar`) e o boneco voltando à pose a pé, os 4 no mesmo quadro;
  - **montar em menos de 0,5 s:** passa. A T04 mediu 4 ms do toque até o brinquedo, e o `e2e/montar-036.spec.ts` confere menos de 500 ms (na T09);
  - **a vitrine em no máximo 1 s:** passa. Os cartões ficam na tela em 97 a 106 ms (a `main` levava de 85 a 137 ms). As figuras do 3D ficam prontas em 2,2 a 2,3 s com a CPU 4× (a `main`, com 6 cartões, levava 4,2 s). Enquanto o estúdio das fotos nasce, há um quadro parado de 0,97 a 1,03 s, logo depois de os cartões aparecerem (a `main` tinha 0,87 a 0,91 s): a criança vê a vitrine parada por 1 s, como já via na `main`;
- **A trava de vestir:** é o quadro mais longo nos 5 s depois de os 4 amigos trocarem de roupa todos juntos:

  | Cenário | Primeira vez | Segunda e terceira |
  |---|---|---|
  | `main` hoje | 1,5 s | 0,8 a 0,9 s |
  | ramo hoje | 1,4 s | 0,9 s |
  | ramo andar | 0,36 s | 0,28 a 0,33 s |
  | ramo montados | 0,69 s | 0,55 a 0,60 s |
  | ramo mão | 0,62 s | 0,40 a 0,51 s |

  - Os itens novos travam menos que os de hoje.
  - A trava não vem só da primeira compilação: a segunda vez ainda custa uns 0,2 s por boneco com a CPU 4×.
  - **A causa:** o `definirPerfis` (`src/render/outrosJogadores.ts`, perto da linha 209) refaz no mesmo quadro o boneco de todos os amigos que mudaram, com o `aplicarAparencia`.
  - **Na nuvem** chega um amigo por vez, e é o caso da quarentena (`premium-presentes`, de 730 a 870 ms sem desacelerar). Refazer um boneco por quadro, ou compilar os materiais antes, tiraria a trava. Fica na quarentena.
- **Depois de juntar as malhas** (24 nov, a12e065, com o merge 333db1b; a mesma suíte, 3 rodadas; os números brutos estão no fim do `medidas.txt`). A máquina rodou mais rápida nesta vez (nada com 33,8 quadros): por isso a régua é cada cenário contra o "nada" da mesma rodada.
  - **Os números:**

    | Cenário | Queda de quadros | Chamadas |
    |---|---|---|
    | andar | -7% | +16 |
    | montados | -14% (antes -19%) | +32 (antes +47) |
    | mão | -13% (antes -14%) | +23 (antes +39) |
    | hoje | -17% | +53 |

  - **Contra as metas:**
    - **as chamadas** caíram 15 e 16. Com os itens novos, **ainda passam de +20**: +23 na mão, rente à meta, e +32 nos montados;
    - **a queda de quadros** também **ainda passa de 10%**, de 13% a 14%;
  - **Montar e descer:**
    - **descer** passou nas 6 vezes, de 38 a 60 ms;
    - **montar** passou em 5 de 6, de 43 a 84 ms, e uma vez foi a 158 ms. A cena parada também teve um pico de 165 ms, o mesmo sinal da medida de antes;
  - **A trava de vestir** caiu um pouco: 0,42 a 0,60 s nos montados e 0,32 a 0,47 s na mão.

### T09 (24 nov 2026, `testador`)
- **O mapa das áreas** (`e2e/areas.json`) ganhou o que é da 036:
  - na alma e lojinha: `bonecoPremiumLojinha`, `brinquedoAndar`, `montar`, `efeitosLojinha`, `seguirVoando`, `lojaNovidades` e o esboço (`src/esboco/lojinha*.ts`), com as suítes `montar-036`, `capturas-036` e `esboco-lojinha`;
  - na roda: o `iconesAndar`;
  - no som: o `somItens`;
  - no desempenho: a suíte nova `desempenho-036`.
- **Como rodou:** `node scripts/conferir.ts --base main --areas leiaute-interface`.
  - A base é a `main` local: a `origin/main` está 18 commits atrás e só difere no `src/cliente/bate.ts`.
  - O leiaute entrou à mão: o ramo não muda nenhum arquivo dele.
  - O script pegou sozinho a alma e lojinha, a roda, a nuvem e amigos, o personagem, o núcleo e rede (`nuvem.ts`, `protocolo.ts`), a câmera e roleta (`roleta.ts`), o som e a paridade (`alma.ts`, `aparencia.ts`, `protocolo.ts`).
  - Com `LOJA_PASTA=capturas-036/t06-vitrine`, as fotos da vitrine foram refeitas.
- **Os tempos (na placa, 2 trabalhadores):**

  | Parte | Tempo | Resultado |
  |---|---|---|
  | Vitest | 6 min 55 s | 2315 de 2316 |
  | build | 10 s | ok |
  | fumaça | 9 min 17 s | 26 de 26 |
  | áreas (8 áreas e 54 suítes, em 5 lotes) | 51 min 57 s | 126 passaram, 1 falhou, 77 pulados (fotos e medidas que só rodam com variável) |
  | paridade | 9 min 41 s | 36 de 36 |
  | quarentena (não segura) | 41 s | 0 de 1 |
  | **total** | **78 min 40 s** | |

  Depois vieram mais uns 45 min conferindo as duas falhas: o `B2` sozinho e na `main`, e o Vitest de novo.
- **O que falhou:**
  - **Vitest, `tests/render/fila.test.ts`** ("gerarMalha de chunk editado... menos de 500 ms"):
    - mediu 563 ms com a máquina cheia; sozinho, passou 3 de 3, e o Vitest inteiro de novo deu 2316 de 2316;
    - o ramo não toca no teste nem no `fila.ts`, e o teste já usa o melhor de 3;
    - é instável de tempo e já era assim antes. Não foi mexido;
  - **`entrada-nuvem.spec.ts`, `B2: nada se acerta...`:** em 40 s o recarregar depois da segunda ressincronização não veio.
    - Sozinho no ramo, passou 3 de 3 (48 a 53 s).
    - Rodando ao lado do `construcoes-protegidas`, caiu do mesmo jeito na `main` (1 de 2), e no ramo passou 2 de 2.
    - É instável com a placa ocupada e não vem do ramo. **Foi para a quarentena**, com a pista: o `medirTravamento` (`src/cliente/estado.ts`) com o servidor de teste lento.
    - Uma tentativa de consertar no teste (contar as cargas desde a primeira) não se confirmou: a carga lida era 1 nas duas vezes. Ficou de fora.
- **Também caíram, só nas rodadas com carga feitas à parte** (e passaram na conferência):
  - no ramo, o `B, buraco` (a Ana não andou na tela dela) e o `C` (a sala não abriu em 60 s);
  - na `main`, o `voltar para casa` do `construcoes-protegidas`.
  - É o mesmo sinal: a nuvem nos testes fica frágil com a placa cheia. Não foram para a quarentena.
- **A quarentena:** o `premium-presentes` continuou caindo, agora com 1016 ms e o maior quadro de 651 ms. O motivo dele ganhou a causa achada na T08.
- **As fotos da vitrine refeitas** (`capturas-036/t06-vitrine/`, às 16h07 em pé e às 16h49 no computador e deitado, depois do conserto das mãos cd8d9cd):
  - a aba de andar nas 3 telas e o provador montado;
  - nas figuras, as mãos fecham no guidão do patinete e da bicicletinha, no volante do carrinho e nos bracinhos da nuvem;
  - no provador montado em pé, as mãos ficam nas manoplas da bicicletinha.
  - As fotos da T04 (`capturas-036/t04-montar/`) também saíram de novo, porque o `montar-036` rodou.
- **O aperitivo de sons da T07:** está em `capturas-036/t07-sons/`, com o `indice.md`.
  - `1-tesouros.wav` e `2-montar.wav` trazem os sons em sequência, no volume do jogo, com o passo de régua;
  - há também um arquivo por som, no volume cheio;
  - o `tocarSom` do jogo foi tocado num `OfflineAudioContext`.
  - A hélice (0,06) e a pipa (0,09) ficam quase sumidas perto do passo (0,90): vale ouvir no aparelho.

Falta sempre, ao fim, a **rodada em família**.
