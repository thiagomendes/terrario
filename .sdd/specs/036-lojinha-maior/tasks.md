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

Falta sempre, ao fim, a **rodada em família**.
