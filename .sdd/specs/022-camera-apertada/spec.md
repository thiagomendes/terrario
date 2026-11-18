---
id: 022-camera-apertada
title: 'Câmera em lugar apertado: ver e mexer no mundo sem trocar de câmera'
status: PARKED
base_branch: main
created_at: 2026-11-13T17:00:00Z
---
## Contexto
O dono jogando a Cidade Grande, em 13 nov 2026: "quando você entra em lugares muito apertados, fica muito ruim de interagir com o ambiente... para clicar naqueles bloquinhos azuis da construção está muito difícil". Ele não quer voltar para a primeira pessoa (a 015 decidiu só terceira pessoa). Quer resolver **só a câmera**, sem nada específico da obra. A expectativa dele é que, resolvida a câmera, mirar os blocos melhore em todo lugar.

## Direção combinada
1. **A parede vira recorte.** A câmera não gruda no boneco quando bate numa parede: fica a uma distância boa, e o que estiver entre ela e o boneco (blocos, adereços) fica transparente num recorte em volta do boneco e da mira.
2. **Boneco transparente de perto.** Se a câmera chegar muito perto mesmo assim, o boneco fica meio transparente e nunca tapa a mira.
3. **A câmera sobe em lugar fechado.** Com teto por cima e paredes em volta, a câmera sobe um pouco e olha mais de cima, e o chão e os blocos em volta aparecem.

Ajuda na mira fica fora, a não ser que as medidas mostrem que a câmera sozinha não basta.

## Antes de implementar
- Esboço com a câmera de hoje e a nova lado a lado, em 4 lugares:
  - um corredor de 1 bloco;
  - um quartinho 3×3 com teto;
  - dentro de uma obra da cidade junto de uma parede;
  - debaixo de uma copa de árvore ou numa caverna.
- Para cada lugar: fotos no computador e no celular, e vídeos entrando e virando.
- Medidas:
  - acertos por tentativa e tempo para acertar um bloco, com um boneco automático, hoje e com a câmera nova;
  - quanto o recorte custa em quadros por segundo no celular.

## Cuidados
- A câmera de hoje continua sendo o padrão até o dono aprovar.
- O recorte não pode deixar ver através do mundo para "trapacear" no multijogador, como achar baús escondidos de longe. Ele só abre perto do boneco.

## Decisões do dono
- 13 nov 2026: só a câmera, sem solução específica da obra. Entra depois do refino da Cidade Grande. Esboço em andamento.

## Resultado do esboço (13 nov 2026), parada
- **Onde está o esboço:** branch `esboco/camera-apertada` (commits 8291550 … f94cc15). Ela só roda com `?esboco=camera` e tem os modos `hoje`, `esboco`, `esboco-perto`, `esboco-sem-afastar` e `esboco-ima`. O relatório visual está em https://claude.ai/artifact/GWW7LFkPbuwLRNs1JtSTHS.
- **Teste:** uma criança simulada fez 224 tentativas por modo, em 4 cenas, com erro de dedo de 24 px.

| Modo, no celular | Alvo à vista no início | Acerto de 1ª |
|---|---|---|
| Câmera de hoje | 50% | 70% |
| Câmera afastada (3,2 blocos), com recorte, silhueta e grua | 61% | 49% |
| Câmera afastada, mais perto (2,2 blocos) | 51% | 47% |
| Sem afastar, só recorte e silhueta | 54% | 71% |
| Câmera afastada com ímã no toque (28 px) | 55% | 52% |

- **Conclusões:**
  - Afastar a câmera melhora a visão, mas deixa os blocos menores que o erro do dedo. O ímã não recupera isso, porque o dedo cai dentro do bloco vizinho.
  - Sem afastar, o recorte quase não tem o que tirar, já que a câmera de hoje para antes da parede.
  - O recorte custa pouco: dentro do ruído no celular. O custo de quadros vem da câmera mais longe.
  - O ímã pega bloco ao tocar no céu logo acima dele. Sem esse "pulo para o céu", o problema quase some.
- **Limite do teste:** o boneco automático não sente a confusão da câmera colada na parede, que é a queixa do dono.
- **Para retomar:** testar com as crianças, no aparelho de verdade, num endereço separado com `?esboco=camera`; ou pensar em alvos maiores na tela.

## Decisões do dono (continuação)
- 13 nov 2026: depois das medidas, "Vamos de WebGPU então, deixa isso aí parado." A 022 fica parada; a câmera de hoje continua.
- 18 nov 2026 (spec 033): no celular a câmera começa um pouco mais afastada (4,75 deitado e 5,06 em pé, contra 4,4), medida com a criança simulada desta spec; o recorte da parede continua fora.
