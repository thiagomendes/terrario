# Esboço 037: a primeira pessoa depois do celular do dono (25 nov)

Para jogar, abra `?esboco=primeira-pessoa` e toque no olhinho. As fotos e o vídeo saem de `e2e/esboco-primeira-pessoa.spec.ts`, em cinco modos de `ESBOCO_PP`: `visao`, `toques`, `ritmo`, `itens` e `video`. As fotos são no celular em pé (390×844), de dia, na Vila Neon, menos onde o nome diz outra coisa. O tamanho do braço não mudou: 76 px de mão, em pé.

## 1. A visão

Antes de mudar, medi as câmeras no jogo e fiz a conta (`.sdd/specs/037-construir-melhor/referencia/conta-visao.mjs`). Os números estão em `medidas.json`, nas partes `cameraMedidaNoJogo` e `visao`.

| | Campo (vertical / horizontal) | Inclinação | Horizonte (px de cima) | Lajotas à frente, acima dos botões | Largura a 3 / 6 blocos |
|---|---|---|---|---|---|
| Terceira pessoa de hoje | 70° / 36° | 0,5 (olhando o boneco de cima) | 93 | 37 | 5,4 / 7,1 |
| De dentro, antes | 70° / 36° | a de fora (0,5) | 93 | 10 | 1,9 / 3,6 |
| **De dentro, agora** | **90,5° / 50°** | **0,32 (para a frente)** | **282** | **18** | **2,7 / 5,4** |

- **Por que via "quase nada":** no celular em pé, 70° na vertical dá só 36° na horizontal, um efeito de zoom. Além disso, a câmera entrava com a inclinação de fora, olhando o chão.
- **A regra de agora:**
  - o campo vertical de hoje, mas nunca menos que 50° na horizontal (90,5° na vertical em pé; deitado e no computador continua 70°);
  - ao entrar, o olhar vai para a frente, com o horizonte no terço de cima da tela.
- **O limite:** de dentro não dá para ver tanto chão quanto de fora. A câmera de fora fica de 4 a 5 blocos atrás e de 2 a 4 acima do boneco. Mesmo com 100° de campo, de dentro se veem só 24 lajotas, e as beiradas já deformam muito. Fiquei com 50° na horizontal: quase o dobro de chão e de largura que antes.
- **O braço continua do mesmo tamanho:** ele é medido no campo de 70°, e o suporte dele compensa o campo mais aberto.

## 2. A mira segue o dedo (a regra nova do dono)

- **No celular:**
  - o toque põe ou quebra onde o dedo tocou, pelo mesmo caminho da terceira pessoa (`src/ui/toque.ts`, `preverToque`), dentro do alcance de hoje;
  - segurar quebra embaixo do dedo;
  - arrastar gira a câmera;
  - o pontinho do meio saiu. O contorno aparece embaixo do dedo enquanto ele segura, e por 0,6 s depois do toque.
- **No computador:**
  - o clique põe onde está o ponteiro, e segurar parado quebra ali;
  - o botão direito também põe;
  - arrastar gira a câmera, sem travar o mouse;
  - o contorno fica embaixo do ponteiro, e a mira do meio da tela some.
- **Por que "não mirava certinho":**
  - O jogo refazia a mira do dedo a cada quadro antes de o esboço levar a câmera para os olhos. Por isso a mira do segurar e o destaque saíam da câmera de fora, por trás do boneco.
  - Agora a câmera de dentro vai para os olhos antes da mira, por um gancho pequeno em `src/render/cena.ts` (`antesDaMira`).
- **Prova:**
  - em pé, 20 toques de verdade na tela, em 5 pontos diferentes e fora do meio: 6 no chão, 9 na parede e 5 em cima da pilha. Os 20 entraram na célula embaixo do dedo;
  - no computador, 10 cliques em pontos diferentes: os 10 na célula embaixo do ponteiro, sem travar o mouse.

## 3. O golpe e o colocar no ritmo

- **Antes:** o braço mexia uma vez no começo de segurar.
- **Agora:**
  - o braço dá um golpe a cada golpe do jogo, com o mesmo evento que toca o som e anima o boneco, e a mesma curva do golpe da terceira pessoa;
  - dá um empurrão a cada colocação.
- **Prova, num mundo de sobrevivência:** segurando a picareta, 3 golpes do jogo e 3 golpes do braço (as tábuas quebram em 3). Colocando com 5 toques seguidos, 5 colocações e 5 empurrões.

## 4. Os itens de frente

- **Bloco:** de pé, um pouco virado (aparecem duas faces), em cima da mão.
- **Ferramenta:** o cabo na mão, subindo para a frente. A cabeça gira no cabo para a ponta da picareta, a lâmina do machado e a pá apontarem para a frente, no plano do golpe. No golpe, ela bate para a frente e para baixo.
- **Comida, semente, sacola e brinquedo:** de pé, acima e um pouco à frente da mão.

A `folha-dos-itens.png` tem 88 itens, cada um num recorte em `itens/`:
- um bloco de cada forma: cheio, tijolo, flor, tocha, cama, porta, escada, laje, cerca, porteira, placa e cogumelo;
- todos os itens que não são bloco: comidas, sementes, materiais, brinquedos, sacolas, lampiões, a colher de pedreiro e todas as ferramentas, de madeira a cristal.

**Os tesouros da mão** (a varinha, o guarda-chuva e a pipa) ficam na mão esquerda de verdade, no alto, como na terceira pessoa. Pelo estudo, essa mão fica atrás do plano dos olhos, e de dentro eles não aparecem (`itens/tesouro-*.png`). Os amigos e a terceira pessoa continuam vendo.

## Arquivos

| Arquivo | O que é |
|---|---|
| `primeira-pessoa.webm` | Em pé: entra olhando para a frente, anda com o bloco, põe três blocos tocando em pontos diferentes, segura para quebrar com a picareta (os golpes no ritmo), olha à frente e em volta e sai |
| `01-entrou-olhando-a-frente.png` | Logo depois de entrar: o olhar para a frente, o campo de 50° na horizontal |
| `02-andando-com-bloco.png` | Andando com o bloco |
| `03-colocando-onde-tocou.png` | Logo depois do toque: o bloco entrou embaixo do dedo |
| `04-picareta-na-mao.png` | A picareta de frente, o cabo para cima e para a frente |
| `05-golpe.png` | No meio de um golpe, segurando para quebrar |
| `06-olhando-a-frente.png` | Olhando à frente |
| `visao-terceira-pessoa.png`, `visao-primeira-pessoa.png` | O mesmo lugar de fora e de dentro (a medida da visão) |
| `deitado-segurando.png`, `noite-segurando.png`, `computador-segurando.png` | Deitado, de noite e no computador |
| `computador-depois-dos-cliques.png` | O computador depois dos 10 cliques: o contorno embaixo do ponteiro |
| `folha-dos-itens.png`, `itens/` | Cada item na mão |
| `medidas.json` | A visão, os toques, os cliques e o ritmo |

## O que ficou fraco

- **De perto:** com os olhos baixos, o bloco posto a um passo fica grande na frente. É a altura de verdade do boneco.
- **O ioiô e o pião:** não aparecem na mão de dentro. São brinquedos com um jeito próprio de segurar, e não olhei esse caminho.
- **As ferramentas:** ficam altas na tela, do meio para a direita, e o cabo comprido cruza um bom pedaço dela.
- **O pulo da câmera:** a câmera agora sai da posição do corpo, sem o pequeno sobe e desce da cabeça do boneco. A câmera fica mais firme.
