# Backlog

Ideias e pedidos do dono que ainda não viraram spec, e a fila combinada. A ordem é combinada com o dono na hora; o número da spec não é a ordem. Atualizar ao fechar cada spec.

## Fila combinada (23 nov 2026; a 037 entrou em 24 nov)
1. ~~**Lojinha maior**~~ **publicada em 24 nov** (ver "Feitas"). (decisão do dono em 22 nov; spec nova, 036): o filho já comprou os 6 itens da lojinha premium.
   - **12 itens novos**, com preço fixo, sem nada que some ou é sorteado;
   - a ideia do filho é um brinquedo de andar (patinete, carrinho), diferente da vassoura-patinete da festa;
   - primeiro vai um **esboço com uma foto de cada item candidato**, para o dono escolher com o filho;
   - junto vai o conserto do **Unicórnio-pônei**, que tem borda estranha, brilho forte demais e treme quando voa (é defeito, e o orquestrador decide).
2. **037, Construir melhor** (pedido do dono em 24 nov, vindo do filho; logo depois da lojinha):
   - **câmera em primeira pessoa num botão de trocar** (olho), com transição suave, as mãozinhas segurando o bloco, a escolha guardada no aparelho; volta sozinha à terceira pessoa ao comprar ou vestir na lojinha. Esboço primeiro;
   - **bloco nunca em cima de corpo** (defeito): hoje o núcleo só olha os jogadores, numa caixa menor que o corpo, e deixa pôr bloco em cima de bicho e de amigo, que ficam presos. Recusar onde houver criança, amigo, bicho ou morador, e soltar quem ficar preso;
   - **bloco só encostado**, em todos os modos: o bloco só entra encostado em outro bloco ou no chão (lado, embaixo ou em cima), com o tremor de mão das outras recusas.
3. **038, retoques e a moto dourada** (antes: "Redesenho de dois itens antigos") (decisão do dono em 24 nov, pelo portão visual da 036; spec pequena logo depois da 037). Os dois continuam com quem já comprou e só mudam de desenho:
   - a camiseta de aquário: o peixe laranja de listras brancas pode lembrar um personagem de filme conhecido;
   - o tênis de 20 moedinhas: as listras rosa, amarela e azul ficam perto de arco-íris.
   - **e os pés no pedal** (dono, 25 nov): na bicicletinha (e no carrinho de pedal), o pedal gira mas os pés pedalam flutuando em cima, sem encostar. É o mesmo problema que as mãos tinham no guidão (resolvido na 036 apontando o braço para o ponto de segurar): apontar a perna para o pedal, com teste de distância.
   - **a moto dourada na lojinha** (pedido do filho, 25 nov): mais um brinquedo de andar, de criança, original (nada de marca), dourada com brilho contido e sem arco-íris; mesmas regras dos brinquedos da 036 (só enfeite, comprar já monta, as mãos no guidão e os pés nos pedais). Esboço primeiro, com 2 ou 3 versões e o preço proposto para o dono.
4. **027, Noite das Fantasias, partes 2 e 3** (`.sdd/specs/027-mundo-halloween/`, branch `feat/027-noite-das-fantasias`). A parte 1 está no ar desde 22 nov. Faltam:
   - a parte 2, por dentro: os três lugares por dentro e as missões n6 a n8;
   - a parte 3, os passeios: a vassoura-patinete, os brinquedos e as missões n9 e n10.
5. **Riqueza nos mundos antigos**: Lua, Doce Reino e Rancho Alegre, um por spec, depois da 027, na ordem que o dono escolher. Cada um ganha:
   - lugares por dentro;
   - objetos, brinquedos e veículos de toque;
   - moradores com nome e missões com história;
   - barracas de comprar e comer com as comidas do tema (o que a 032 deixou para depois).

## Jeito de testar (decisão do dono em 22 nov 2026)
- **A conferência passa a ser por área**, escolhida pelo que mudou:
  - uma suíte curta de fumaça, de uns 15 min;
  - a paridade só quando mexer no núcleo ou na rede;
  - as três telas só nos testes de leiaute;
  - os testes instáveis consertados, ou tirados do caminho que bloqueia a entrega.
- **Nada de testes à noite** (a ventoinha), e nada de entregas em pedaços sem valor.
- **Medir a qualidade:** em cada entrega, registrar o tempo da conferência e os defeitos achados depois de publicar. A referência do jeito antigo é a parte 1 da 027, com 4 a 6 h de conferência. Se a qualidade piorar, revemos.
- **Feito em 24 nov 2026** (main fb35dff): `node scripts/conferir.ts`, o mapa `e2e/areas.json`, a fumaça de uns 11 min e a quarentena. Uma mudança típica conferida em uns 30 min, contra 2 h 17 min do regime antigo. O passo 6 do `CLAUDE.md` já cita o script.

## Repositório público
- Em 22 nov, o dono abriu o repositório `terrario` para contornar o limite de gastos das Actions.
- **Fechar antes do lançamento nas lojas (020).**
- A varredura de segredos de 22 nov não achou nada no histórico (chaves da Azure, SAS, tokens do GitHub, Anthropic e AWS, chaves privadas, senhas).
- Os workflows só usam `secrets.*` e rodam em push na `main` e `workflow_dispatch`, nunca em `pull_request`.

## Esperando o dono
- **028, Cubolândia:** busca no INPI e domínio (`cubolandia.com.br`). Depois dela: 024 (conta da família), 020 (lojas), 025 (loja do jogo).
- **Rodadas em família pendentes:**
  - 010 (15 minutos em dois aparelhos);
  - 013 (Rancho);
  - 015;
  - 023;
  - 026 (Vila Neon);
  - 032;
  - 033;
  - 034 (os cinco mundos, a escolha de mundos, os ícones dos gestos, e quem cria o mundo vendo o amigo);
  - 035 (levar o mundo para a nuvem, o amigo entrar, cair e voltar, e sair para outro mundo);
  - 027 parte 1 (a festa inteira, com o celular deitado também, por causa da perda do contexto WebGL vista só na ponte da placa do WSL). Para olhar com as crianças: o pelo do Monstrinho de noite (parece musgo?), a gola do vampirinho (parece orelha?) e o lençol do fantasminha, mais cinza de noite;
  - a 023 também pede: fps com 4 amigos de premium, o provador girando e se a criança de 3 a 4 anos entende a troca dragão e capa e o pote de moedas.
- **Faixa azul embaixo no iPhone pelo ícone da tela de início** (12 nov 2026; captura do dono em 19 nov): vai com a casca nativa (020), decisão do dono em 19 nov. Correção genérica, para qualquer aparelho. O painel de medida da janela está pronto no commit 65c6e2d (desfeito na 034) para quando precisar.

## Paradas
- **029, WebGPU:** medida feita no iPhone em 13 nov; a página `?medir=webgpu` continua escondida para medir de novo.
- **022, Câmera em lugar apertado:** "deixa isso aí parado" (13 nov). O recorte de adereços continua fora.
- **033, terceiro nível da roleta:** depois (ex.: "Festa" dentro de Gestos).

## Testes instáveis e defeitos achados nos testes (24 nov 2026)
- **A quarentena** fica em `e2e/areas.json`, com o motivo de cada teste (9 em 24 nov). Ela roda à parte e não segura a entrega. Instável novo entra lá com o motivo e só sai consertado.
- **Defeitos do jogo achados pelos testes, ainda abertos:**
  - **Nuvem, tirar e pôr na mesma célula com a conexão morrendo** (25 nov, do conserto dos blocos que somem): se os dois já entraram e a confirmação se perdeu, o reenvio pode deixar a célula vazia, calada. Precisa do núcleo ignorar o comando repetido (mexe no servidor).
  - **Nuvem, a página recarregada em menos de 30 s não confere nada** (25 nov): os ids dos comandos recomeçam do 1. Começar o id de `Date.now()` ou zerar o `ack` em página nova.
  - **Instável:** `amigos-sem-atrito.spec.ts:41` mostrou o nome sugerido em vez do digitado (1 vez; passou 4 de 4 sozinho).
  - **A tela trava ao ver um premium pela primeira vez:** quando a amiga veste um premium (capa de estrelas, pinguim, camiseta), a tela de quem vê para de 730 a 870 ms, provavelmente compilando os materiais. A amiga aparece em 1,1 a 3,5 s, e o limite é 1 s. Pesa na 036 (itens novos): conferir na T08.
  - **c6 no celular em pé:** a mãozinha da obra não aparece; a criança chega pela trilha de lado e os blocos azuis de baixo ficam fora da tela ou atrás do boneco.
  - **c3, a conferir:** às vezes a criança para na porta da padaria, o cliente diz que chegou, o ✓ do núcleo não vem e ela fica sem pegadas.
  - **`cidade-grande:242`:** os 12 tijolos soltos não voltam para a mochila (o concreto e o asfalto voltam); 2 de 3 na `main` (achado na 027).
- **Consertado:** a velocidade do carrinho de quem guia o bate-bate dobrava sem controle para refazer (`src/cliente/bate.ts`); vai ao ar com a próxima publicação.
- **A página deitada perde o contexto WebGL** na ponte da placa do WSL (a placa trava uns 2 min). Esses testes só rodam no `--tudo`; conferir no aparelho de verdade.

## Ideias soltas
- **Sobras da parte 1 da 027** (o orquestrador decide e encaixa):
  - **a volta ao lugar de nascer depois do teleporte:** com a máquina carregada, o teste da T23 viu a criança voltar ao ponto de nascer logo depois do teleporte; foi contornado no teste. Conferir se uma criança que anda logo depois do `pronto` é puxada de volta (defeito, se for);
  - **o custo do véu:** o pior caso em pé ficou em 255 a 264 chamadas de desenho (a régua é 250), com 47 a 55 quadros. Para baixar, tapar o halo só nos bonecos perto de um lampião aceso;
  - **o halo do lampião de abóbora** ficou fora: com 100 lampiões, somava 5 chamadas por pedaço;
  - **a abóbora de bloco posta** continua cubo; virar peça redonda mexe em todos os mundos;
  - **o `?tema=` no compartilhar:** abrir para os amigos um mundo aberto com `?tema=` leva a vila da festa à nuvem com a cara da Vila Neon (vinha de antes);
  - **a Vila Neon, no pior caso, faz 29 quadros com a CPU 4× mais lenta** (a meta é 45), medida na T00 da 027;
  - **o abraço do Bento de frente,** com os braços nas costas, pede a junta de cotovelo no braço dele (M); ficou o abraço de lado, bochecha com bochecha;
  - **o cartão da festa de três-quartos:** a criança ficou de costas, mais perto (bom o bastante);
  - **detalhes do revisor do portão:** as barracas em pé com metade de chão vazio; o forro da varanda da Vovó esticado; a Vovó acinzentada de noite sob a varanda; o morceguinho a 15 blocos aparece baixo.
- **Acabamento do Rancho** (entra na spec de riqueza do Rancho):
  - refazer a foto da vitrine (um morro tapa o sítio);
  - girar as pás do moinho;
  - quebrar porta numa pilha de duas.
- **Leite e balde, filhotes, colmeia e mel** (fora da 013).
- **Contador de FPS ligado para todos** (decisão do dono, 20 nov): fica ligado durante o desenvolvimento, para acompanhar o desempenho; desligar de fábrica antes de ir para as lojas (020).
- **Balão do gesto com a cara de quem gesticula** (achado no portão visual da 034): hoje o balão e a carinha do amigo mostram sempre o boneco padrão de azul; ficaria melhor com o boneco de quem faz o gesto (o pipoqueiro, o amigo de chapéu).
- **Toque da roleta em aparelho travando:** usar o `e.timeStamp` do evento em vez de `performance.now()`, para um toque de criança contar mesmo num aparelho lento (achado na 034).
- **Acabamento do cartão do mundo salvo** (visto no ar, depois da 034):
  - a miniatura do "Meu primeiro mundo" é um degradê genérico, e não a cara da Vila Neon;
  - no computador, o nome quebra em 3 linhas;
  - a data começa com um "·" solto.
- **Amigos nascem no mesmo ponto** (visto no ar, na conferência da 035): quem entra na sala nasce exatamente onde o dono está, e um boneco fica dentro do outro; a criança vê só o nome flutuando sobre a própria cabeça até alguém andar. Nascer lado a lado, a 1 ou 2 blocos. É conserto de defeito: o orquestrador decide e encaixa.
- **Na sala da nuvem** (visto na conferência da 035):
  - quem sai normalmente (fecha a aba, vai para outro mundo) continua contado na sala por 30 s, e a prévia mostra "No mundo agora" com ele;
  - no celular, a chave "Fechar para novas visitas" fica abaixo da dobra do painel;
  - a recusa da sala fechada fecha sem código (aparece como 1005 no registro) e não registra o nome de quem foi barrado;
  - a miniatura do mundo da sala na lista é só um degradê.
- **Dica "trocar" nos fãs da plateia da Vila** (achado na revisão da 027): a dica da mira oferece "Toque em <nome> para trocar" também aos fãs, que não trocam.
- **Voz do orelhão:** o dono achou rápida demais, mas fica como está por enquanto (18 nov).
- **A dica "trocar" nos fãs da plateia da Vila** (achado na revisão da 027, 21 nov): o defeito da dica de trocar nos fãs da plateia, a conferir e consertar numa spec própria. Fora da 027.

## Feitas e publicadas (resumo)
- **036, Lojinha maior (24 nov 2026):** 12 itens novos: os 4 brinquedos de andar (patinete-luz, carrinho de pedal, bicicletinha, nuvem fofa; só enfeite, comprar já monta, 2 toques na roda para montar e descer), o passarinho voando perto do ombro, o boné de hélice, o pijama de nuvem, as asas de borboleta, a mochila-foguete, a varinha de bolhas, o guarda-chuva e a pipa; a vitrine com abas só de desenho e a estrelinha de novo; o provador montado; os sons; o Unicórnio-pônei e o pinguim sem tremer. `VERSAO_REDE` 18. Conferência por área (79 min e a final de 38 min); dois portões visuais. Pendências pequenas na Situação da spec.
- **007 a 017, 019, 021, 023, 026, 030 a 035:** ver cada spec.
- **027 parte 1, Noite das Fantasias (22 nov 2026):** o sexto mundo, a vila da festa: os lugares, os moradores com fantasia, os bichos, comprar e comer as comidas de festa, a varinha, as missões n1 a n5, a música e os sons (aprovados pelo dono). `VERSAO_REDE` 18. Também valem em todo mundo: a dica "Toque para comer" some depois de 8 s; os moradores e os bichos de longe com menos peças. Conferida no ar; fotos e vídeo em `capturas-027/parte1/no-ar/`.
- **035, Entrada na nuvem (21 nov 2026):** quem leva o mundo para a nuvem vê o amigo na hora; quem cai volta vendo os blocos e as obras que mudaram; a sala fechada deixa voltar quem caiu (até 30 s); sair da nuvem abre o outro mundo, e o da sala mostra "Continuar". Conferida no ar; fotos em `capturas-035/no-ar/`.
- **034 (20 nov 2026):**
  - saíram Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos;
  - ficaram Vila Neon (o padrão), Cidade Grande, Rancho Alegre, Doce Reino e Exploração Lunar.
- **018:** juntou-se à 023.
- **A 031 perde a Era dos Dinos na 034;** as missões do Doce Reino ficam.
- **As mãos dos ícones dos gestos sem dedos (20 nov 2026, 19c8808):** a mão de bolinha do boneco em todos os ícones; o aplauso com as mãos lado a lado e o "plac" entre elas, o tchau com o braço dobrado. Conferido no ar. Fotos em `capturas-034/maos/`.
