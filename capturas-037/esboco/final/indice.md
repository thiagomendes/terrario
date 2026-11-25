# Esboço 037: a primeira pessoa final (a recomendação do estudo)

Para jogar, abra `?esboco=primeira-pessoa` e toque no **olhinho** amarelo na beira direita para entrar e sair da primeira pessoa. Não há mais as opções 1 e 2.

As fotos e o vídeo saem de `e2e/esboco-primeira-pessoa.spec.ts`:
- `ESBOCO_PP=final` gera o vídeo e as fotos;
- `ESBOCO_PP=mira` gera a medida da mira e do alcance.

O estudo que guiou o esboço está em `.sdd/specs/037-construir-melhor/referencia/estudo-braco-primeira-pessoa.md`. As fotos são na Vila Neon, de dia e com o celular em pé (390×844), menos onde o nome diz outra coisa.

## O que o esboço faz

**A câmera:**
- Fica nos olhos de verdade do boneco: o ponto entre os olhos, logo atrás do rosto, a 1,21 do chão. Antes ficava a 1,62, no alto da cabeça.
- Anda com o corpo (o passo, o pulo, o pouso), mas não acompanha o balanço da cabeça.
- A cabeça some e o resto do corpo fica.

**O braço:**
- É o braço inteiro de um segundo boneco, com a roupa e o item do jogador, no tamanho de verdade, sem dobra e sem esticar.
- Ele gira num ombro fixo fora da beira direita.
- O ponto do ombro sai de uma conta para cada tela (`acharOmbro`, a mesma de `conta-braco.mjs`). A mão de segurar fica no canto de baixo à direita, com o bloco acima dos botões; o ombro e a grossura da manga ficam fora da tela.
- A mão é 1,2 vez a menor que a conta permite, para mostrar mais antebraço: 76 px em pé e 52 deitado.

**Os ângulos (os da terceira pessoa):**
- **Segurar:** o "comer" baixado 15°: para a frente, 40° para dentro, descendo um pouco até a mão.
- **Passo:** o balanço do boneco em 12%.
- **Pulo:** o "abre" em 25%.
- **Colocar:** um empurrão de 0,32 rad.
- **Aceno:** o braço sobe para a frente, no tempo do aceno do boneco, com o mesmo abano.
- **Comer:** a refeição do boneco (leva, as mordidas, desce), em 37% para cima e 30% para dentro.

**O resto:**
- A mão vazia some e só entra para agir (a variante A).
- A mira tem o pontinho e o contorno fino.
- A câmera é solta: arrastar para olhar.

## Arquivos

| Arquivo | O que é |
|---|---|
| `primeira-pessoa.webm` | Em pé, só a cena: entra pela cabeça, anda com o bloco, a mira, põe três blocos (chão, parede e pilha), pula, acena de mão vazia, come a maçã, olha em volta e para baixo, e sai pela cabeça |
| `01-andando-com-bloco.png` | Andando com o bloco |
| `02-mira.png` | Olhando para o chão: o pontinho e o contorno onde o bloco vai entrar |
| `03-colocando.png` | Logo depois do toque: o bloco entrou no contorno e a mão empurra |
| `04-pulando.png` | No ar, logo depois de pular |
| `05-acenando.png` | O aceno de mão vazia |
| `06-comendo.png` | Comendo a maçã |
| `07-olhando-para-baixo.png` | Olhando bem para baixo: a camiseta, o cinto e os sapatos |
| `deitado-segurando.png` | Celular deitado (844×390), segurando o bloco |
| `noite-segurando.png` | De noite, segurando o bloco |
| `medidas.json` | A mira, o alcance e o ombro, em pé e deitado |

## A mira e o alcance (`medidas.json`)

**A mira:** foram 20 toques seguidos no pontinho, em pé e deitado:
- 6 no chão, 10 na parede (o lado de um bloco posto) e 4 em cima da pilha;
- os 20 puseram o bloco exatamente na célula do contorno, nas duas telas.

**Por que a mira bate:**
- O contorno e o toque usam a mesma conta (`preverToque`).
- O raio sai da câmera que desenha a tela, que agora está nos olhos, e passa pelo meio da tela.

**O alcance continua com a regra de hoje:**
- A conta do alcance é a de sempre e sai dos olhos do controle, não da câmera: o ponto atingido fica a até 6,5 (`ALCANCE_TOQUE`), o centro do bloco a até 7,5 (`clienteAlcanca`), e o núcleo aceita até 8.
- A medida varre o olhar no chão plano, num leque de rumos, e pega a célula mais longe que a mira aceita: 6,74 na terceira pessoa e 7,04 de dentro, em pé e deitado.
- **Por que de dentro dá uma célula a mais:** o raio de dentro sai mais baixo e mais raso. Ele pega a beirada de perto de uma lajota cujo centro já está um pouco mais longe; o ponto atingido continua dentro de 6,5.
- **O que o teste prova:** de dentro nunca se alcança menos que hoje, e nunca passa do que o núcleo aceita. Não mexi na regra, que é do núcleo.

**O ombro fora da tela:**
- Foi conferido quadro a quadro, com a grossura da manga.
- A menor folga foi de 5 px em pé e 13 px deitado na mira, e de 5 px no vídeo, em 1395 quadros.

## O que ficou fraco

- **O aceno e o comer:** o braço fica a mais de um bloco da câmera, então a mão sobe pouco na tela (de 559 para uns 500 px). Mais que isso tiraria a mão da tela pela direita, ou faria a mão crescer além do limite de 85 px.
- **O contorno de perto:** olhando para o chão perto dos pés, o contorno da célula pega boa parte da tela, mesmo com o traço fino.
- **O bloco posto:** na foto de colocar, o bloco que acabou de entrar fica grande na frente.
- **Os vídeos:** são só a cena; o olhinho e o pontinho aparecem só nas fotos.
