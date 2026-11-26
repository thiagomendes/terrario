# 038 Retoques e a moto dourada: tarefas

| Fase | Tarefa | Quem | O que entra | Pronto quando | Tam. |
|---|---|---|---|---|---|
| 0 | T00 **Medidas de antes** | `testador` | os três cenários da "Experiência medida" na `main` (a pé sem brinquedo; a pé com brinquedo de pedal vestido; montados nos brinquedos de hoje), com a suíte que a T06 vai repetir | os números na Situação | P |
| 1 | T01 **O catálogo e a rede** | `engenheiro-nucleo-rede` | só o catálogo: a motoquinha no `PREMIUM` e a linha dela no `IDS_ANDAR`; as regras congeladas do `main` a217838 com os 4 casos; o perfil com a camiseta e o tênis sobrevivendo a carregar e salvar | testes de unidade; paridade 36/36 | P |
| 2 | T02 **O joelho, os pés no pedal e a bandeirinha** | `artista-voxel` | o `pernaAte` em `src/personagem/`, chamado no `aplicarPose` depois da suavização; a tabela de pedais e apoios; a divisão das roupas; a bicicletinha e o carrinho novos; a bandeirinha; a medida pé–pedal como teste do jogo (7 modelos, andando e parada, dt 1/60 e 1/20, os amigos); o teste "a pé nada muda"; o `montarBoneco.test.ts` e o teste de encaixe verdes | testes de unidade; fotos de lado com a perna mais dobrada, numa matriz de roupas e fantasias; foto de perto do joelho | G |
| 2 | T03 **A motoquinha dourada** | `artista-voxel` (o mesmo, depois da T02) | o modelo, a pose, as rodas, o farol e o custo juntado; o ícone, a figura e o provador | fotos nas três telas, de dia e de noite, parada e andando; o custo medido | M |
| 2 | T04 **A camiseta e o tênis** | `artista-voxel` (o mesmo, depois da T03) | a lista padrão `PEIXES` nova, com o teste sem listra; o tênis Violeta e ouro, a luz `cometa`, os brilhos, o anel e o `efeito`; os ícones e as figuras | fotos de frente, de costas e de lado, de dia e de noite | P |
| 3 | T05 **O som e a ligação** | `desenvolvedor-jogo` | o "vrum" pela régua da 019; a moto na vitrine e em "Meus tesouros"; comprar já monta; recarregar a camiseta e o tênis no `e2e-nuvem`; o esboço sai do código | e2e: comprar, montar, descer e recarregar | P |
| 4 | T06 **Desempenho** | `testador` | a medida da T00, `main` contra o ramo na mesma rodada | as metas da "Experiência medida" | P |
| 4 | T07 **Conferência por área** | `testador` | `node scripts/conferir.ts` com a paridade | o tempo registrado | M |
| 4 | T08 **Revisão do núcleo** | `engenheiro-nucleo-rede` novo | a T01 | consenso | P |
| 4 | T09 **Portão visual e publicação** | `revisor-visual` novo, depois o orquestrador | as fotos (vídeos num formato que o celular abra); com gente jogando, cancelar o `publicar.yml`, disparar o `servidor.yml` com `agora: true` e só depois o site; conferir no ar | publicado e conferido | P |

## Situação (26 nov 2026)
| Parte | Estado |
|---|---|
| Esboço | feito em 26 nov (`capturas-038/esboco/`); o dono escolheu pela prancha às 13h |
| Spec | revisada por um `artista-voxel` novo em 26 nov: 4 altos (a régua de custo, a suavização contra a medida, a medida só num modelo e sem a motoquinha, as roupas que cobrem a perna), 6 médios e 4 baixos, todos ajustados no texto; "na curva" saiu da bandeirinha. Na releitura: os pedais do carrinho giram num nó próprio (o carrinho fica com +8) e o teto da bandeirinha é 0,15 rad por quadro. **Aprovada em 26 nov** |
