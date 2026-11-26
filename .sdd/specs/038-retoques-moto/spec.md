---
id: 038-retoques-moto
title: 'Retoques e a moto dourada: a motoquinha na lojinha, a camiseta e o tênis redesenhados, os pés no pedal e a bandeirinha'
status: DONE
base_branch: main
branch: feat/038-retoques-moto
created_at: 2026-11-26T13:30:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
---

## Contexto
O filho do dono já joga com a Lojinha maior (036), no ar desde 24 nov 2026. Em 25 nov ele pediu **uma moto dourada** na lojinha.

Junto com ela vêm quatro retoques pequenos:
- **Dois itens antigos**, apontados pelo portão visual da 036, ganham desenho novo:
  - a camiseta de aquário, porque o peixe laranja de listras brancas pode lembrar um personagem de filme;
  - o tênis de 20 moedinhas, porque as listras rosa, amarela e azul ficam perto de arco-íris.
- **Os pés no pedal**, que o dono viu jogando: na bicicletinha o pedal gira, mas os pés pedalam flutuando; no carrinho de pedal, os sapatos saem pelo capô.
- **A bandeirinha do carrinho**, que fica parada quando o carro anda (o filho reclamou em 26 nov).

## O que existia
### O esboço (26 nov 2026, branch `esboco/038-retoques-moto`)
- O código está em `src/esboco/retoques.ts` e `retoquesPecas.ts`, ligado só com `?esboco=retoques`. As fotos saem do `e2e/esboco-retoques.spec.ts` (`ESBOCO_038`).
- Prancha, fotos, vídeos e medidas estão em `capturas-038/esboco/`, com o porquê de cada versão no `indice.md`.
- **A medida pé–pedal do esboço** é da sola até o alto do pedal, em 72 amostras numa volta, com o modelo `andarilho`:
  - a bicicletinha de hoje fica de 0,087 a 0,43 bloco (média 0,28);
  - com o joelho, dá 0 na bicicletinha nova, no carrinho novo e na Motoca de pedal (que ficou de fora);
  - **a motoquinha ainda não foi medida.**

  A medida escreve o giro direto nas juntas, sem a suavização do jogo, então **não vale como prova do jogo**.
- **O custo do esboço** (`custo.json`):
  - a motoquinha soma 8 malhas no brinquedo, mais 2 do joelho, com 16,8 mil triângulos;
  - a bicicletinha nova tem 6 malhas (hoje são 5) e 15,6 mil triângulos (hoje 9,5 mil).
- O esboço só fotografou o menino, de túnica e sapato comum.

### O jogo hoje (`main` a217838, `VERSAO_REDE` 18)
- **Os quatro brinquedos de andar** da 036:
  - estão no `PREMIUM` de `src/jogo/alma.ts`, na categoria `andar`: patinete 110, bicicletinha 120, carrinho 140 e nuvem 150;
  - são desenhados em `src/personagem/brinquedoAndar.ts` (`IDS_ANDAR`, `MONTARIA`, `GUIDAO`, `avancarAndar`), com ícone (`iconesAndar.ts`), figura (`figuras.ts`) e som;
  - o estado `montado` mora na aparência. Montar não refaz o boneco: o brinquedo é montado quando é vestido, e o `montado` só troca a pose.
- **A pose** passa por `render/boneco.aplicarPose`, que suaviza as juntas (`suave`, k = 1−e^(−16·dt)) e o `corpoY`. Esse caminho serve o jogador, os amigos, a figura da lojinha e o provador.
- **A perna do boneco é uma peça só**, do quadril ao sapato, e não dobra. Os modelos têm pernas de 0,62 a 0,74.
- **O carrinho** tem um brilho só, então o brinquedo inteiro, com a bandeirinha, é uma malha juntada.
- **O tênis-cometa** tem luz `cometa`, que anima do ouro ao azul, além de `BRILHOS.cometa` e do anel do pouso azul em `premiumMundo.ts`. O `efeito` do catálogo diz "faixa de luz de ouro e azul".
- **A camiseta de aquário** desenha a lista padrão `PEIXES` em `premiumLuzes.ts`.
- **A rede 18** tem o teste `tests/rede/versao-036.test.ts` contra as regras congeladas do `main` ff958e3, de antes da 036.
- **A primeira pessoa (037)** sai para fora ao montar.

## Decisões do dono (26 nov 2026, pela prancha do esboço)
| Pergunta | Decisão |
|---|---|
| A moto | **A Motoquinha dourada**, por **140 moedinhas**: tanque gordinho com estrela, farol redondo, guidão alto, escapamento curtinho e rodinhas de apoio. A Motoca de pedal fica de fora. |
| A camiseta de aquário | **Os Peixinhos de bolinhas:** o mesmo aquário, com um amarelinho de bolinhas brancas no lugar do peixe de listras. Nenhum peixe tem listra. Quem já comprou fica com ela, e o preço continua 15. |
| O tênis de 20 | **Violeta e ouro:** o mesmo tênis com duas cores só, o cano violeta e o ouro na faixa de luz, na estrela e na cauda. Quem já comprou fica com ele. |
| Os pés no pedal | **Como no esboço:** o joelho dobra nos brinquedos de pedal ou apoio, a bicicletinha é ajustada, e o carrinho ganha pedais embaixo do painel. |
| A bandeirinha | Pedido do filho: tremular quando o carrinho anda. |

Continuam valendo as regras da 036:
- os brinquedos são só enfeite, com a mesma velocidade e o mesmo pulo;
- comprar já monta;
- as mãos vão no guidão;
- o brilho é contido, sem arco-íris e sem cara de marca ou modelo real.

## Decisões do orquestrador (pequenas, contadas ao dono; ajustadas na revisão de 26 nov)
- **O nome:** "Motoquinha dourada", na aba dos de andar, depois da nuvem. O efeito do catálogo é "sentada na motoquinha, com farol que acende de noite e rodinhas de apoio".
- **As motos ficam sem espelhinhos.** De frente, eles pareciam dragonas nos ombros.
- **O som da motoquinha:** um "vrum" de brinquedo, curto e baixo, só ao montar, pela régua da 019 (`somResto.test.ts`: curto e abaixo do golpe). Andando, só as rodinhas.
- **A régua de custo sobe**, porque o joelho e as peças que giram precisam de malha própria:
  - montado, no máximo **+7 malhas** sobre o mesmo boneco a pé sem brinquedo vestido, na bicicletinha e na motoquinha, e **+8** no carrinho;
  - a pé com brinquedo de pedal vestido, no máximo **+2** (o joelho);
  - cada brinquedo com no máximo **10 mil triângulos**;
  - os pedais do carrinho giram de verdade, com os pés, num nó próprio (+1). O dono escolheu os pedais no esboço, e pedal parado com o pé girando em volta fica errado. Por isso o carrinho tem +8;
  - as rodas e os pedais redondos ficam com menos gomos;
  - as peças se juntam por material.
- **"Na curva" sai da bandeirinha:** dá pouco ganho, e o giro dos amigos vem da rede, com o risco de tremor que o Unicórnio-pônei teve.
- **O tênis:** a luz `cometa` passa a animar só do ouro ao ouro claro, sem azul. O `BRILHOS.cometa` e o anel do pouso ficam em ouro e violeta. O `efeito` passa a ser "faixa de luz de ouro; pegadas de luz e estrelinhas a cada passo".
- **A primeira pessoa** continua saindo para fora ao montar, como na 037.

## O que muda
### 1. O catálogo e a rede
- `motoquinha-dourada` entra no `PREMIUM`, na categoria `andar`, por 140, com o `desenho` `premium:motoquinha-dourada`, e no `IDS_ANDAR`.
- **A versão da rede continua 18:** não entra nenhum comando, evento ou campo de quadro novo.
- **As regras congeladas novas** são as do `main` a217838, o servidor e o site de antes da 038 (normalizar e sanear a aparência e o perfil). Quatro testes:
  - o servidor de antes tira só a moto e mantém o resto, com o `montado`;
  - o site de antes mostra o amigo a pé;
  - um perfil com a moto, no site de antes, vai para a lista de "depois" e volta;
  - a própria criança, numa sala com o servidor de antes, vê a própria moto.
- **A camiseta e o tênis mantêm o mesmo id**, e só o desenho muda.
- **A paridade 36/36 roda na conferência**, porque o catálogo está no caminho do núcleo.

### 2. O joelho e os pés no pedal
- **Onde mora a conta:** o `pernaAte` vai para `src/personagem/`, sem Babylon.
  - Ele é chamado dentro de `render/boneco.aplicarPose`, que serve o jogador, os amigos, a figura da lojinha e o provador.
  - Os pedais e os apoios ficam numa tabela só, como o `GUIDAO`, usada pelas peças e pela pose.
  - Os números de `avancarAndar`, `MONTARIA` e `GUIDAO` são atualizados para a bicicletinha e o carrinho novos.
- **Depois da suavização:** montada em brinquedo de pedal ou apoio, a perna e o joelho saem da conta a cada quadro.
  - A conta usa o quadril de verdade daquele quadro, depois de suavizar o corpo, e não passa pelo `suave`.
  - Ao montar e ao descer, um peso leva da pose a pé para a conta, sem salto.
- **Quando a perna se divide:** quando há brinquedo de pedal ou apoio vestido (bicicletinha, carrinho ou motoquinha), e não com patins ou skate.
  - A pé, o joelho e o giro para o lado ficam em 0 e voltam suaves ao descer.
  - Esticada, a perna dividida é a mesma perna de antes.
- **As roupas que cobrem a perna:**
  - uma peça vai para a canela pelo seu ponto mais baixo e pelo nome;
  - a joelheira e o remendo vão para o joelho;
  - o degradê `pintar` é corrigido pelo deslocamento da peça;
  - nada espeta para fora com a perna dobrada.

  Isso vale para as polainas, as botas, o tênis de cano, o tênis-cometa, a barra do pijama, os tufos do boneco peludo, as patas das fantasias, e as saias e os vestidos da criação (que não podem atravessar a perna dobrada).
- **A quina do joelho:** com o joelho mais dobrado, não pode abrir fresta nem quina. Se abrir, tapar com uma peça no mesmo nó e no mesmo material, sem malha a mais.
- **A bicicletinha** fica com as medidas do esboço:
  - o selim um tico mais baixo;
  - o eixo do pedal mais alto e mais perto;
  - a pedivela mais curta;
  - o pedal redondo.

  As cores e os detalhes ficam iguais.
- **O carrinho** ganha os pedais embaixo do painel, girando com os pés num nó próprio, com o capô um tico mais curto e o volante um tico mais alto. Os sapatos não saem mais pelo capô.
- **A bandeirinha do carrinho** sai para um nó próprio (+1 malha, dentro da régua de +8 do carrinho).
  - Ela gira em volta do mastro pela velocidade suavizada (`e.vel`). Parada, fica de lado e quase quieta. Andando, o pano vai para trás com o vento, uns 70 a 90° a partir da posição parada (mais para trás quanto mais rápido), e por cima disso tremula pouco, até uns 8°, nunca acima de 3 Hz. Acertado pelo orquestrador em 26 nov, vendo as fotos: só o balanço de lado não respondia à reclamação.
  - Ela não encosta na capa, nas asas nem na mochila-foguete.
  - Os amigos veem igual.
- **O patinete e a nuvem** não mudam.

### 3. A motoquinha dourada
- Sai do esboço para `brinquedoAndar.ts`, com a pose sentada, as mãos no guidão e os pés nos apoios (o joelho dobra).
- **O dourado:**
  - amarelo quente e fundo, com o ouro escuro embaixo e o reflexo de plástico lustroso;
  - só o farol acende, com a luz mansa do farol do carrinho;
  - nada entra no brilho que borra;
  - de noite continua clara, sem halo.
- **As rodas e as rodinhas de apoio** giram com a velocidade de verdade. Parada, a moto fica em pé nas rodinhas.
- **Na lojinha e em "Meus tesouros":** ícone, figura e provador, com a criança montada andando um pouquinho em volta.

### 4. A camiseta de aquário e o tênis-cometa
- **A camiseta:** a lista padrão `PEIXES` vira a dos Peixinhos de bolinhas. Assim o jogo, a figura e o provador mudam juntos. Um teste prova que nenhum peixe tem listra.
- **O tênis:**
  - as cores ficam Violeta e ouro;
  - a luz `cometa`, o `BRILHOS.cometa`, o anel do pouso e o `efeito` mudam como nas decisões acima;
  - as pegadas de luz ficam nas mesmas cores.
- **Os ícones e as figuras** da lojinha e de "Meus tesouros" acompanham o desenho novo.

### 5. O convite das missões aparece e some (pedido do dono, 26 nov)
- **Hoje:** o baú com "?" é o convite que aparece depois de uns 2 minutos sem missão. Ele fica para sempre embaixo da estrela. No celular deitado, depois que a 037 levou o mapinha e a mochila para a esquerda, ele fica espremido entre eles.
- **Como fica:** o convite aparece com a pulsada, as estrelinhas e o "plim", fica uns 8 s e some.
  - Volta no máximo uma vez a cada 5 minutos, enquanto a criança continua sem missão.
  - Tocar nele enquanto está à vista abre o quadro, como hoje.
  - O quadro continua vindo pela roda e nunca abre sozinho (030).
- **O selinho da missão escolhida** não muda: ele fica, porque mostra o que a criança está fazendo.
- **No celular deitado,** o selinho e o convite não encostam no mapinha, na mochila nem na estrela.

### 6. O esboço sai
`src/esboco/retoques.ts`, `retoquesPecas.ts` e o e2e do esboço saem só **depois** de a medida pé–pedal estar no teste do jogo. As fotos e as medidas continuam em `capturas-038/esboco/`.

## Experiência medida (para não frustrar)
- **Pé no pedal**, medido pelo `aplicarPose` de verdade (com a suavização), também pelo caminho dos amigos (`outrosJogadores`), com dt de 1/60 e de 1/20:
  - os 7 modelos, na bicicletinha, no carrinho e nos apoios da motoquinha;
  - numa volta inteira andando, e parada em 8 ângulos do pedal;
  - a sola fica a no máximo 0,02 bloco do pedal ou do apoio;
  - a sola fica a no máximo uns 35° do pedal, e o pedal não atravessa o sapato de forma visível (conferido nas fotos de lado).
- **A pé com o brinquedo vestido nada muda:** um teste prova que a sola e a ponta do sapato ficam onde estão hoje ao andar, correr, pular, sentar no parque e fazer gestos.
- **A bandeirinha não treme:** a 20 quadros por segundo, nenhum salto de ângulo entre quadros passa de 0,15 rad.
- **Achar e comprar a moto:** do toque na lojinha até o detalhe dela, no máximo 2 toques. O cartão aparece sem rolar no celular em pé, ou a rolagem conta como um toque.
- **Montar:** em menos de 0,5 s, com puf e som, como na 036.
- **Desempenho:** no celular em pé (390×844), com a CPU 4× mais lenta, na Vila Neon de dia, medindo a `main` contra o ramo na mesma rodada. Os cenários são:
  - 4 amigos a pé sem brinquedo;
  - 4 amigos a pé com brinquedo de pedal vestido;
  - 4 amigos montados: motoquinha, motoquinha, bicicletinha e carrinho.

  Com eles montados:
  - as chamadas de desenho sobem no máximo 30 sobre os 4 a pé sem brinquedo;
  - os quadros caem no máximo 10%.
- **Nada some:** quem já tem a camiseta ou o tênis continua com eles, com o desenho novo, depois de recarregar, também num mundo da nuvem.

## Cuidados (crianças e legais; ver `.sdd/cuidados-legais.md`)
- **A moto:**
  - não tem cara de marca ou de modelo real: nada de logotipo, tanque de marca ou forma conhecida;
  - é dourada, sem arco-íris;
  - não tem ronco alto nem som de corrida, e não corre mais que os outros brinquedos.
- **A compra:** o preço é fixo, nada é sorteado e nada expira. A moto não dá vantagem no jogo.

## Fora desta spec
- A Motoca de pedal, que fica no histórico do esboço.
- A bandeirinha inclinando na curva, cortada pelo risco de tremor nos amigos.
- A cama nova: saiu da 038 por decisão do dono (26 nov) e vai para a 039, Móveis e utensílios.
- A primeira pessoa montada.
- O formato da colher do pedreiro e os outros defeitos antigos da lista do backlog.
- Os vídeos em `.mp4` do esboço, que não abriram no celular do dono. Os próximos vão num formato que o celular abra, ou como sequência de fotos.
