---
id: 022-camera-apertada
title: 'Câmera em lugar apertado: ver e mexer no mundo sem trocar de câmera'
status: DRAFT
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
