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
- **Para a T06:** o `e2e/lojinha.spec.ts` ("os seis cartões à vista, sem rolar") e outros testes de tela da vitrine vão falhar com os 18 até as abas entrarem.
- **Para a T04:**
  - ao reconectar na nuvem, o "entrar" leva a aparência guardada, sem o montado (nem os patins, como já é hoje): o amigo vê a criança a pé até a próxima aparência;
  - vale mandar a aparência de agora depois do "bem-vindo";
  - o `INTERVALO_APARENCIA` do núcleo junta montar e descer muito seguidos (fica a última, como já é).

Falta sempre, ao fim, a **rodada em família**.
