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
| 1 | T01 **Catálogo e núcleo** | `engenheiro-nucleo-rede` | os 12 itens e as categorias `andar`, `chapeu` e `mao`; o lugar dividido e o "o que sai"; a compra e o vestir no núcleo; `normalizarPremium`; o estado "montado"; a decisão da `VERSAO_REDE` | testes de `alma` e da aparência; paridade 36/36; o motivo da versão registrado | M |
| 2 | T02 **As peças no boneco** | `artista-voxel` | o boné, o pijama, as asas, a mochila-foguete, a varinha, o guarda-chuva e a pipa, com as correções da spec; o passarinho na ponta do ombro | fotos de cada um (três-quartos, de frente, de costas, dia e noite, 390×844), mais uma tela deitada e o computador | M |
| 2 | T03 **Os efeitos** | `artista-voxel` | as bolhas, as gotinhas, a fumacinha e a hélice, com brilho contido e sem tremor | fotos e um vídeo curto | P |
| 3 | T04 **Os brinquedos de andar** | `artista-voxel` | os 4 modelos e as animações (impulso, pedal, balanço, rodinhas) | fotos parado e andando; vídeo | M |
| 3 | T05 **Montar e descer** | `desenvolvedor-jogo` | a roda ("Andar de ..." e "Descer"); o puf e o som; o guardar sozinho (veículos, brinquedos do tema, casas por dentro); o item da mão guardado e devolvido; os amigos veem | testes e2e de montar e descer em 2 mundos e com um amigo na sala | M |
| 4 | T06 **O Unicórnio-pônei** | `artista-voxel` | a borda, o brilho e o tremor ao voar, achando a causa de cada um | fotos de antes e depois; vídeo voando | P |
| 5 | T07 **A vitrine e o provador** | `desenvolvedor-jogo` | as abas por lugar, a rolagem, a estrelinha de novo; o provador montado e o da pipa | os testes da lojinha; fotos nas 3 telas | M |
| 5 | T08 **Sons** | `desenvolvedor-jogo` | os sons curtos dos itens novos e dos de andar, no padrão de `src/audio/` | o aperitivo de sons ao dono | P |
| 6 | T09 **Desempenho** | `testador` | a mesma medida da T00 com os 4 amigos montados e com itens novos | as metas da "Experiência medida" | P |
| 6 | T10 **Conferência por área** | `testador` | a conferência do passo 6 do `CLAUDE.md` (áreas: alma e lojinha, gestos e roda, nuvem e amigos, leiaute; paridade, porque mexe no núcleo) | o tempo da conferência registrado | P |
| 6 | T11 **Revisão do núcleo** | `engenheiro-nucleo-rede` novo | a revisão de código das partes de núcleo e rede | consenso | P |
| 6 | T12 **Portão visual e publicação** | `revisor-visual` novo, depois o orquestrador | o revisor só com as fotos; o esboço sai do código; o servidor antes do site; conferir no ar; vídeo ao dono | publicado e conferido no ar | P |

## Situação (24 nov 2026)
| Parte | Estado |
|---|---|
| Esboço | o dono escolheu 10 em 23 nov e mais 2 em 24 nov (os 12 da spec) |
| Spec | rascunho em revisão |
| Código | não começou |

Falta sempre, ao fim, a **rodada em família**.
