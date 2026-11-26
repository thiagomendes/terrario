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
| T00 Medidas de antes | **feita (26 nov)**, na `main` a217838, com o `e2e/desempenho-038.spec.ts` (área desempenho; 4,5 min na placa, 1 trabalhador). Mediana de 3 rodadas, celular em pé, CPU 4×: a pé 46,8 fps e 184 chamadas (andando 46,5 e 185); vestido 46,3 e 188 (andando 45,6 e 189); montados (2 bicicletinhas, 2 carrinhos) 44,6 e 205 (andando 42,8 e 203). Maior quadro: 48 a 150 ms; ao montar os bonecos, até 278 ms. Malhas por boneco: 10,3 a pé, 17,3 vestido ou montado (ativas 4,8, 5,3 e 9,3). Hoje, montados contra a pé: +21 chamadas e de -5% a -8% nos quadros. As rodadas variam até 7 fps, então a T06 alterna a `main` e o ramo na mesma sessão. Os números estão em `capturas-038/t00-desempenho/medidas.txt` |
| T01 O catálogo e a rede | **feita (26 nov)**. A `motoquinha-dourada` no `PREMIUM` (andar, 140, depois da nuvem) e no `IDS_ANDAR`; a `MONTARIA`, o `GUIDAO` e o desenho dela são os do carrinho, provisórios, até a T03 (o teste das peças exige desenho para cada id). A rede continua 18: `tests/rede/congelado037.ts` congela as regras da `main` a217838 (o catálogo de 18, a aparência com o `montado`, o saneamento e o perfil com o "depois" e a chave à parte), com um teste de que a cópia é fiel sem a moto, e `tests/rede/versao-038.test.ts` tem os 4 casos da spec e a camiseta e o tênis com o mesmo id; os 4 casos já valem hoje, sem conserto. O servidor de antes tira a moto e, com ela, o `montado` (que só vale com o brinquedo); a moto volta do "depois" comprada, mas não vestida. Vitest 262 arquivos e 2432 testes; paridade 36/36 (9,3 min na placa) |
| T02 O joelho, os pés no pedal e a bandeirinha | **feita (26 nov)**, pelo `artista-voxel`. Os detalhes abaixo |

### T02 (26 nov 2026, `artista-voxel`)
- **O joelho** (`src/personagem/joelho.ts`, sem Babylon):
  - `dividirPernas`: com brinquedo de pedal ou de apoio vestido, e sem patins nem skate (`planoBoneco`), a caixa da perna vira a coxa e a canela, que se cruzam 0,05 no joelho; esticada, cobre a perna de antes inteira. A canela e o sapato vão para os nós `joelhoE` e `joelhoD`;
  - as roupas vão para a canela pelo nome (sapato, bota, tênis, polaina, pantufa, pata, dedo, garra, joelheira, remendo, barra) ou pelo meio delas abaixo do joelho; o degradê (`pintar`) é corrigido pelo deslocamento;
  - `pernaAte` é a conta exata da coxa e do joelho. `pernaNoPedal` escolhe por onde a sola pisa no pedal redondo (do meio do pé à ponta, contínuo), para a sola não virar com a volta: sem tornozelo, uma sola fixa chegava a 60° na bicicletinha.
- **No `aplicarPose`** (`render/boneco.ts`, que serve o jogador, os amigos, a figura e o provador): depois da suavização, a perna e o joelho saem da conta a cada quadro, com o quadril de verdade daquele quadro (pela matriz do corpo). Um peso leva da pose a pé para a conta ao montar e ao descer. A criança senta no assento pela perna do modelo dela (`corpoNoAssento`, com o `assentoY` da `MONTARIA`).
- **A tabela dos pés** (`PES` em `brinquedoAndar.ts`, com `ondeOsPes`): as peças e a pose leem dela, como o `GUIDAO`.
  - **A bicicletinha:** o selim mais baixo (0,425), o guidão mais baixo (0,74 e 0,31), o eixo do pedal mais alto e mais perto (0,32 e 0,12, na escala 1,2), a pedivela mais curta (0,05) e o pedal redondo. As cores e os detalhes são os mesmos.
  - **O carrinho:** o capô mais curto, o painel na boca dele, o volante mais alto e mais para a frente, e os pedais embaixo do painel, girando com os pés num nó próprio. Os pedais ficaram mais baixos e mais perto que no esboço (0,24 e 0,18): mais para a frente, a perna curta esticava e a sola virava para a frente.
  - Os números saíram da medida nos 7 modelos, e não só no `andarilho`.
- **A bandeirinha** num nó próprio no alto do mastro (`bandeiraNoVento`): balanço de até uns 20° (0,55 Hz) e tremular de uns 5° (2 Hz), pela força do vento, que sobe e desce devagar; parada, quase nada. A 20 quadros por segundo, o maior salto fica abaixo de 0,15 rad.
- **Menos gomos:** o campo `lados` da peça (cilindro e anel) e `gomos` nas bolinhas pequenas: as rodas, os pedais, os tubos e os faróis.
- **Os testes novos:**
  - `tests/render/pePedal.test.ts`: os 7 modelos, a bicicletinha, o carrinho e a moto provisória, uma volta andando e parada em 8 pontos, com dt de 1/60 e de 1/20; e o caminho dos amigos (o animador e o personagem do jogo). A sola fica a menos de 0,02 bloco do pedal (dá 0) e a no máximo 35° do chão;
  - `tests/render/joelhoAPe.test.ts`: a pé com o brinquedo vestido nada muda (a sola e a ponta do sapato em 3 modelos, andando, correndo, pulando, sentada e nos gestos); a bandeirinha; o custo (até 10 mil triângulos; montada +7 malhas na bicicletinha e +8 no carrinho; a pé com ele, +2);
  - `tests/personagem/joelho.test.ts`: a conta, a divisão nos 7 modelos, as roupas de todas as fantasias e o degradê.
- **Os testes que mudaram:**
  - `brinquedoAndar.test.ts`: o selim desceu, e continua acima do selim do esboço;
  - `pesNoCarrinho.test.ts`: o joelho dobrado pode subir acima da beira entre o assento e o painel; o pé fica abaixo dela, e nada da perna passa do painel.
- **A moto provisória** da T01 (o carrinho) tem +8 malhas montada; a T03 a deixa com +7.
- **A conferência:** `npx tsc --noEmit -p .` limpo; Vitest inteiro com 265 arquivos e 2455 testes. Dois de tempo (`selinho de quadros` e `fila de remalha`) caíram com a placa rodando ao lado e passaram sozinhos.
- **As fotos:** `capturas-038/t02-pes/` (com o `indice.md`):
  - a matriz de 12 roupas e fantasias pedalando de lado;
  - o joelho de perto;
  - as sequências de fotos no lugar do vídeo (a bicicletinha de dia e de noite, o carrinho e a bandeirinha);
  - deitado e computador.
- **O desempenho** (`desempenho-038`, 3 rodadas, no ramo com a moto provisória, que é o carrinho):

  | Cenário | Chamadas | fps |
  |---|---|---|
  | a pé | 185 | 45,1 |
  | vestido | 196 | 44,1 |
  | montados, parados (2 motos provisórias, bicicletinha e carrinho) | 217 | 40,5 |
  | montados, andando | 215 | 42,8 |

  - **Montados contra a pé:** +32 chamadas parados e +30 andando (a meta é +30); -10% nos quadros parados e +2% andando.
  - **Por boneco:** 10,3 malhas a pé, 20,3 vestido e 20,5 montado (ativas 4,8, 7,3 e 12,3).
  - Está no limite. A T03 tira uma malha de cada moto, e a T06 mede a `main` contra o ramo na mesma sessão. |
