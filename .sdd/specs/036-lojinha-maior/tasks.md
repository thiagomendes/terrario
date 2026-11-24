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
| Código | não começou |

Falta sempre, ao fim, a **rodada em família**.
