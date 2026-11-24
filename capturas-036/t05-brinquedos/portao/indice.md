# 036, portão visual: as pernas no carrinho de pedal

Pedido do revisor: os sapatos apareciam por cima do capô, na frente do volante, e as pernas
atravessavam o carro. Celular em pé (390x844), parado e andando, de três-quartos e de lado, de dia e
de noite. `antes/` (a rodada de acertos da T05) e `depois/` com os mesmos nomes e ângulos.

O que mudou (`MONTARIA['carrinho-pedal']` em `src/personagem/brinquedoAndar.ts`): as pernas descem
para dentro do capô, onde ficam os pedais (de -1,45 para -1,05 rad), e a criança senta 2,5 cm mais
baixo no assento. As mãos continuam no volante (`tests/render/maosNoGuidao.test.ts`).

Prova: `tests/render/pesNoCarrinho.test.ts`, o boneco de verdade sentado, parado e pedalando, nos
dois corpos: nada da perna nem do pé, da frente do assento para a frente, passa da beira das
laterais e do capô (0,43) nem sai por fora das laterais.
