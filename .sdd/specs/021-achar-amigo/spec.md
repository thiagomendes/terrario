---
id: 021-achar-amigo
title: 'Achar o amigo: a carinha na borda, a trilha de estrelinhas, pular para perto e chamar'
status: DONE
approved_at: 2026-11-12
base_branch: main
branch: feat/achar-amigo
created_at: 2026-11-12T15:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
full_test_command: npx vitest run && scripts/e2e-gpu.sh
---
## Contexto e problema
Pedido do dono (12 nov 2026), em resumo: as crianças reclamam que não se acham no mundo "com amigos". A seta e a bolinha no mapa são difíceis demais para elas. Os dois filhos que jogam têm 3 e 4 anos e ainda não leem.

**Como é hoje:**
- **Minimapa** (`src/ui/mapa.ts`, `amigos()`): uma bolinha da cor do amigo (`corDoAmigo`) com a inicial dele. É pequena, fica num canto e exige ler a letra e entender o mapa.
- **Setas na borda** (`src/ui/setasAmigos.ts`, spec 010): uma pílula discreta com o apelido e "· 48 m". Ela é quase transparente, fica a 20 blocos, é toda em texto e não dá para tocar.
- Em grupo, ninguém sabe qual bolinha é qual, nem como chegar lá quando há um morro ou uma mata no meio.

## Objetivo
Uma criança que não lê acha o amigo sozinha, em poucos segundos, com o rosto do amigo e sem texto. Se cansar, ela "pula" para perto dele com um toque comprido. Quem quer ser achado pode **chamar**.

## As ideias do esboço
O dono aprovou testar a 1, a 3 e a 4 juntas, mais o botão "Chamar". A 2 entra só para comparar.

1. **A carinha do amigo na borda da tela.**
   - Quando o amigo está fora da tela, aparece uma bolha redonda com a cabeça de verdade do boneco dele: fantasia, cabelo e o aro na cor `corDoAmigo`.
   - A bolha fica presa na borda, do lado em que ele está, com uma setinha para fora.
   - Ela cresce conforme o amigo chega perto (48 → 78 px no computador, 40 → 62 px no celular) e some quando ele aparece na tela.
   - Atrás da câmera, a bolha vai para baixo, para o lado dele.
   - Na tela, mas escondido por morro, árvore ou casa: a bolha fica em cima de onde ele está, sem seta.
   - Nunca tapa a barra de itens, o minimapa, a bússola, o selinho de FPS, os botões do toque nem a mochila. Ela desliza pela borda até achar lugar.
2. **Balão (para comparar).** Um balão da cor do amigo flutua sobre a cabeça dele, com a carinha na frente. Dá para ver de longe e através de morros e prédios.
3. **Trilha de estrelinhas.**
   - Tocar na carinha desenha no chão uma trilha de estrelinhas douradas até o amigo, contornando paredes, água e buracos.
   - Um brilho corre pela trilha no sentido do amigo.
   - As estrelinhas que a criança já passou somem.
   - A trilha se apaga ao chegar ou depois de 14 s.
4. **Pular para perto.**
   - Segurar a carinha enche um anel amarelo em 0,9 s.
   - Quando o anel fecha, sai um "puf" de poeira com estrelinhas, a criança aparece ao lado do amigo, virada para ele, com outro "puf", e acena (gesto da 015).
5. **Botão "Chamar".**
   - Fica ao lado do minimapa, com a mão do gesto "chamar" e ondinhas. Sem texto.
   - Quem aperta faz o gesto "chamar".
   - Na tela de cada amigo, a carinha de quem chamou vem para a frente por 6 s, pulsa com ondas na cor dele e uma maozinha acenando, e toca um sininho suave. A seta aponta para quem chamou.

### Muitos amigos sem bagunça (pedido do dono, 12 nov 2026)
A sala aceita até 8 (`MAX_JOGADORES` em `src/rede/protocolo.ts`), ou seja, até 7 amigos.
- **Sem amigo escolhido:**
  - no máximo **3 carinhas** na borda, as dos amigos mais perto que estão fora da tela;
  - as que se encostariam na mesma borda viram um **montinho**, com até 3 carinhas e um "+N".
- **Escolher um amigo:** a criança toca numa carinha, ou abre a **bandeja** e toca numa das caras.
  - A bandeja é um botão de três carinhas ao lado do minimapa. Ela abre uma fileira com todos os amigos, do mais perto para o mais longe, e uma bolinha verde marca quem já está perto.
  - Escolhido, o amigo fica com a carinha grande e um aro creme. Os outros viram **pontinhos** da cor deles na borda.
  - Tocar de novo no escolhido, na bandeja, desfaz a escolha.
- **O escolhido** é o amigo em quem a trilha e o "pular para perto" agem.
- **Chamar** sempre traz a carinha de quem chamou para a frente por alguns segundos, seja qual for a escolha.
- **Amigo perto não tem carinha:** quem está na tela, ou a menos de 12 blocos, nunca ganha bolha.

## Esboço
- Palco de verdade em `src/esboco/amigos.ts`.
  - Carrega só com `?esboco=amigos`, num pedaço à parte que o jogo nunca baixa.
  - Usa o motor, os bonecos, a interface e as regras de proteção de verdade.
- Capturas e vídeos em `e2e/esboco-amigos.spec.ts`. Só rodam com `ESBOCO_AMIGOS=1`, na placa de vídeo, por `scripts/e2e-gpu.sh`.
- **O que é de verdade no esboço:**
  - os bonecos dos amigos, com as fantasias da 017, pelo gancho de teste `amigosDeTeste`;
  - a foto da cabeça, de `fotografarBoneco` (recorte `cabeca`);
  - a cor de cada um (`corDoAmigo`);
  - o caminho das estrelinhas, procurado nos blocos do mundo (A* por colunas: sobe 1, desce até 3, sem água);
  - o lugar do pulo, conferido com a proteção da 016 e com o dono do bloco;
  - o andar pela trilha, com o controle de verdade;
  - o aceno e o gesto "chamar" da 015;
  - o HUD de verdade, medido para a bolha desviar dele.
- **O que é de mentirinha:**
  - não há rede: os amigos ficam parados onde o teste os põe;
  - o "Chamar" é simulado, chegando de um amigo;
  - o pulo é um teleporte do cliente, sem passar pelo núcleo;
  - os sons são de síntese própria (`chamar-sininho.mp3`, `pular-puf.mp3`, -6 dBFS de pico);
  - a estrelinha e a poeira são peças provisórias;
  - os botões "bandeja" e "Chamar" foram postos à mão na coluna do minimapa.

- **Capturas (12 nov 2026):** no Rancho com morros (642, -593) e na mata fechada (782, 807), de dia, em 1280×720 e 390×844, cada uma em `computador-*` e `celular-*`:
  - `1-carinha-*`: longe, perto, atrás, escondida pelo morro, na mata e à vista sem carinha;
  - `2-balao-*`: o balão, para comparar;
  - `3-trilha-*`: começo, meio, chegando e na mata;
  - `4-pular-*`: segurando, poeira saindo, poeira chegando e ao lado acenando;
  - `5-chamar-*`: apertou e recebendo;
  - `6-muitos-*`: padrão, montinho, bandeja e escolhido.
- **Vídeos (computador):**
  - `video-1-carinha-ao-virar`;
  - `video-2-trilha-seguida`: o toque de verdade na carinha e a caminhada pelo controle de verdade;
  - `video-3-pular-para-perto`: segurar de verdade com o mouse.
- **O que o esboço já mostrou:**
  - No primeiro pulo de teste, a Lia estava num sítio dos vizinhos (016). A criança caiu no terreiro, fora das casas, e a regra do lugar seguro funcionou.
  - No celular em pé, a bolha do amigo escondido bateu no joystick. A correção já está no esboço: ela sobe até sair do HUD.
  - Quando o morro é alto demais para subir, a trilha vai até o ponto mais perto aonde dá para chegar. A spec precisa decidir o resto (ver pergunta 8).

## Capricho na experiência (para não frustrar)
Metas medidas nos testes de tela e na sessão em família:
- **Achar sem ler:** uma criança de 4 anos acha um amigo a 60 blocos, atrás de um morro, em **menos de 30 s**, só com a carinha e a trilha. Hoje leva minutos ou não acha.
  - No teste de tela, um robô que só "vira para a carinha e anda pela trilha" chega em menos de 20 s.
- **Pular é sempre possível:** de qualquer lugar, segurar a carinha leva para perto do amigo em **menos de 1,5 s** (0,9 s de anel + 0,3 s de puf).
  - O pulo nunca falha calado: se não houver lugar seguro perto do amigo, a carinha balança "não" e o anel esvazia. Nada de texto.
- **Tudo sem texto:** nenhuma ideia depende de ler. O "+N" do montinho é a única marca, e a bandeja resolve sem ele.
- **Não tapa o jogo:** a bolha nunca cobre o HUD, e isso é conferido nas capturas pelas caixas medidas (`proibidos()`). Com 7 amigos, no máximo 3 coisas na borda.
- **Toque grande:** a menor carinha tem 40 px no celular. O pontinho do não escolhido é tocável numa área de 40 px.
- **Segurar não assusta:**
  - o anel começa a encher só depois de 0,25 s, para um toque curto nunca virar pulo;
  - soltar antes de 0,9 s cancela sem efeito.
- **Chamar não irrita:** o sininho é mais baixo que os efeitos (régua da 019), e cada criança pode chamar no máximo uma vez a cada 8 s (o botão "dorme" com um relógio de areia desenhado).
- **Fluido:** com 7 amigos, a camada das carinhas custa **menos de 0,3 ms por quadro**; a trilha de até 300 estrelinhas é **1 chamada de desenho** (instâncias finas); procurar o caminho leva **menos de 15 ms** a 150 blocos, num worker se passar disso.
- **Revisão jogando de verdade,** com 3 aparelhos na nuvem (computador, celular e tablet) e as crianças.

## Multijogador e servidor
- **O pulo passa pelo núcleo autoritativo.** O comando novo é `{ t: 'pularPerto', alvo: idDoAmigo }`, e o núcleo:
  1. confere que o alvo está na sala, que quem pula está vivo e que não pulou há menos de **10 s** (o mesmo tipo de intervalo do `voltarCasa` da 016);
  2. procura o lugar com a mesma função do cliente, posta em `src/nucleo/` e usada nos dois lados: de pé, duas células livres, sem água, sem buraco em volta e no máximo 1 bloco de diferença do chão do amigo;
  3. respeita a **proteção da 016**: não cai dentro do que o mundo construiu (casas do povoado, sítio, cidade) nem do que **outra pessoa** construiu, e o chão não pode ser bloco de outro dono;
  4. se o amigo estiver dentro de casa, cai do lado de fora, na porta;
  5. libera o salto (`saltoPermitido`) e manda o evento `teleporte`, como o `voltarCasa`. A conferência de velocidade da telemetria segue valendo;
  6. sem lugar seguro, devolve `recusa` com o motivo `pularPerto`, e o cliente faz a carinha balançar.
- **Justiça:**
  - pular não leva itens nem cura;
  - em modo sobrevivência não vale durante o combate (dano nos últimos 5 s) nem para quem está caído;
  - o amigo pode estar em qualquer lugar do mundo, mas o pulo não atravessa mundos.
- **Chamar:** é um gesto novo de sala, `{ t: 'chamarAmigos' }`.
  - Vai para todos da sala (não só para os 48 blocos do gesto), com limite no núcleo de 1 a cada 8 s por jogador.
  - O núcleo repassa `{ e: 'chamado', de: id }`.
  - Entra no saneamento, como o `gesto` da 015.
- **A trilha é só do cliente:** procura nos blocos que o aparelho já tem; onde não houver bloco carregado, a trilha segue em linha reta até a borda do que se conhece.
- **Posição dos amigos longe:**
  - hoje o servidor manda todos da sala em todo quadro (até 8, é pouco);
  - a carinha precisa da posição e do perfil (aparência), que já chegam;
  - nada novo no protocolo além dos dois comandos.
- **Modo local (servidor no aparelho, 009):** os mesmos comandos, com o mesmo núcleo. Teste de paridade gravado.

## Desempenho
- **Carinhas:**
  - em HTML, por cima do jogo, como o apelido dos amigos: uma projeção por amigo por quadro e um `transform`;
  - as caixas do HUD são medidas só ao mudar o tamanho da janela, não a cada quadro como no esboço;
  - a foto da cabeça é tirada uma vez por aparência, no estúdio de `fotoBoneco`, e guardada.
- **Escondido pelo morro:** um raio pelos blocos a cada 0,3 s por amigo, só para quem está dentro da vista.
- **Trilha:** um mesh de estrela com instâncias finas (uma chamada) e no máximo 300 estrelinhas.
  - O caminho é procurado uma vez ao tocar, e de novo só se a criança se afastar mais de 6 blocos dele.
- **Balão (se escolhido):** 4 peças por amigo num grupo de desenho próprio, com a profundidade limpa. Custa mais que a carinha (até 28 malhas com 7 amigos) e tapa o céu.
- **Celular:** a meta da 012 continua valendo (60 quadros no Moto e no iPhone de teste com 4 amigos fantasiados). Mede-se com 7 amigos e a trilha acesa.

## Testes
- **Unidade (Vitest):**
  - **Borda:** prende na borda certa e desvia do HUD em 1280×720, 390×844 e 844×390.
  - **Tamanho:** cresce com a distância.
  - **Somem:** perto (< 12) e na tela.
  - **Montinho e limite de 3.**
  - **Escolhido e pontinhos.**
  - **Chamado** passa na frente.
  - **Caminho:** contorna parede, buraco e água; sobe 1, desce até 3; não acha → vazio.
  - **Lugar do pulo:** respeita a proteção da 016 (mundo e outro dono), não cai em buraco nem na água, fica fora de casa.
- **Núcleo:**
  - `pularPerto`: intervalo, alvo inexistente, morto, em combate, sem lugar, recusa e teleporte;
  - `chamarAmigos`: limite e repasse para a sala toda;
  - paridade gravada local × nuvem (009).
- **Tela (Playwright, GPU):**
  - dois jogadores na nuvem: B fora da tela → a carinha de B aparece na tela de A, sem tapar o HUD;
  - tocar → trilha; segurar → A aparece ao lado de B, acenando;
  - B chama → a carinha de B pulsa na tela de A;
  - 7 amigos (bots) com o montinho e a bandeja;
  - computador e celular, com capturas para o relatório.
- **Desempenho:** custo por quadro com 7 amigos e a trilha, no computador e no celular imitado.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Esboço no motor (este) e aprovação do dono: ideias 1 a 4, Chamar e muitos amigos |
| T02 | Conta da borda: projeção, prender na borda, desviar do HUD, montinho, limite de 3, escolhido e pontinhos, com testes de unidade |
| T03 | Carinha no jogo: foto da cabeça guardada por aparência, bolha, seta, tamanho, tapado pelo morro, troca de fantasia ao vivo; tira as setas de texto da 010 |
| T04 | Bandeja de amigos ao lado do minimapa (computador, celular em pé e deitado) e o escolhido |
| T05 | Trilha de estrelinhas: caminho nos blocos (worker se precisar), estrela com instâncias finas, brilho no sentido, apagar ao chegar |
| T06 | Pular para perto no núcleo (`pularPerto`): lugar seguro com a proteção da 016, intervalo, recusa; saneamento e paridade local × nuvem |
| T07 | Pular no cliente: anel de segurar, puf, aceno, carinha que balança "não" |
| T08 | Chamar (`chamarAmigos`): botão, limite, carinha na frente, sininho na régua da 019 |
| T09 | Desempenho, testes de tela com 2 e com 7 jogadores, auditoria, publicação e relatório visual |

## Decisões do dono (12 nov 2026)
O dono viu o esboço (https://claude.ai/artifact/6x1RYL3e5rWfYd3MLC2eW5), aprovou a spec do jeito que está e aceitou as 8 recomendações abaixo. Nas palavras dele: "O balão não fica legal, acho que é a carinha mesmo. Tudo que você colocou ali tá perfeito."
- O balão sai: fica só a carinha.
- O limite de carinhas, o montinho "+N", a bandeja e o amigo escolhido ficam como no esboço.
- O pulo não pede licença. Vale na sobrevivência, com intervalo de 10 s, fora do combate e sem itens nem cura.
- O Chamar vai para a sala toda, no máximo 1 vez a cada 8 s.
- A trilha para casa e para os marcadores fica para depois.
- As setas de texto da 010 saem. A bolinha no minimapa fica.
- Sem caminho a pé, a trilha vai até o ponto mais perto, e a carinha sugere o pulo.

## Perguntas para o dono (respondidas: todas as recomendações aceitas)
1. **Carinha ou balão?** Recomendo a **carinha**, com o balão fora. A carinha funciona atrás, dos lados e longe, custa menos e não suja o céu. O balão só ajuda quando o amigo já está na frente.
2. **Limite de carinhas e escolher um amigo.** Recomendo **no máximo 3 coisas na borda, com montinho "+N", bandeja ao lado do minimapa e o escolhido grande com os outros em pontinhos**, como no esboço. Com 2 ou 3 amigos (o caso de casa), nada disso aparece: só as carinhas.
3. **O pulo precisa de licença do amigo?** Recomendo que **não**. Com 3 e 4 anos, esperar um "sim" do outro trava tudo. O que protege é a regra da 016: nunca cair dentro do que o outro construiu.
4. **Pulo no modo sobrevivência.** Recomendo **valer**, com intervalo de 10 s e fora do combate (dano nos últimos 5 s), sem levar itens nem curar.
5. **Chamar todos ou só o escolhido?** Recomendo **todos da sala**. É uma família jogando, e "vem cá!" é para todo mundo. Limite de 1 a cada 8 s.
6. **A trilha também para a casa e para os marcadores do mapa?** Recomendo **deixar para depois**, numa spec curta, reaproveitando a mesma trilha.
7. **As setas de texto da 010 ("Léo · 48 m").** Recomendo **tirar**: a carinha as substitui, e a distância em números não ajuda quem não lê. A bolinha no minimapa fica.
8. **Trilha quando não há caminho a pé** (morro de 2 ou mais blocos, rio). Recomendo que ela vá até o ponto mais perto e termine ali com uma estrela grande pulsando, e que a carinha mostre o anel do pulo para sugerir "segure para pular". Escada automática fica para depois.

## Notas da implementação (13 nov 2026)
- **T02–T08 feitas.** Arquivos: `src/jogo/acharAmigo.ts` (a conta da borda), `src/jogo/caminho.ts` (o caminho a pé, em fatias), `src/nucleo/lugarPulo.ts` (o lugar do pulo, usado pelo núcleo), `src/render/acharAmigo.ts` (projeção, escondido, trilha, pulo e chamado), `src/render/estrelinhas.ts` (a trilha e o puf), `src/ui/carinhasAmigos.ts` (carinhas, montinho, pontinhos, bandeja e Chamar). Saíram `src/ui/setasAmigos.ts` e o esboço continua só com `?esboco=amigos`.
- **Protocolo:** comandos `pularPerto` e `chamarAmigos`, evento `chamado` e o campo `pulo` do `teleporte`. `VERSAO_REDE` 4 → 5: o servidor precisa ser publicado junto.
- **Diferenças do texto da spec:**
  - A busca do caminho não foi para um worker: anda em fatias de 4 ms por quadro (gerador), no próprio cliente. Num caminho sem saída (que explora tudo) leva ~30 ms de CPU no celular imitado (4x), espalhados em ~8 quadros; nenhum quadro passa da fatia.
  - O combate do pulo conta qualquer dano dos últimos 5 s, menos a fome (senão quem está com fome nunca pularia).
  - O destino do pulo vale na telemetria por 3 s (o cliente mostra o puf da saída antes de ir).
  - O lugar do pulo prefere onde nada fica entre os dois e há espaço para a câmera atrás; ao chegar, a câmera fica atrás da criança, olhando para o amigo.
  - Com o amigo dentro de casa, os anéis em volta dele vão até 8 blocos e acham o lado de fora (perto da porta, quando ela é o lado aberto); não há procura explícita da porta.
  - As caixas do HUD são medidas a cada 5 s, ao mudar a janela e ao abrir a bandeja (o HUD do toque aparece depois de entrar).
  - Com poucos amigos, tocar numa carinha também a marca como escolhida (aro creme) enquanto a trilha dura.
