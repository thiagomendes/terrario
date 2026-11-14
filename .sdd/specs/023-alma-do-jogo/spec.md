---
id: 023-alma-do-jogo
title: 'Alma do jogo: missões, nível da criança, moedinhas, banca do mundo e lojinha premium'
status: DONE
approved_at: 2026-11-13
done_at: 2026-11-14
base_branch: main
branch: feat/alma-do-jogo
created_at: 2026-11-13T17:00:00Z
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
O dono, em 13 nov 2026:
- **O que ele viu com o filho:** "quando ele descobriu na cidade que ele podia construir e ele ganhava uma roupa ali... ficou jogando até ele conseguir aquilo. Quando não tinha isso, ele entrava rapidinho, em 5 minutos já saía."
- **A referência dele:** os RP do GTA 5, que sobem conforme as ações (mira, corrida, direção), e o dinheiro do jogo para comprar coisas. Quando os objetivos acabaram, ele perdeu o interesse.
- **O que ele quer:** descolar do Minecraft, que acha "meio sem objetivo".

**Esta spec junta a antiga 018 ("cada mundo com seu jeito"), por decisão do dono em 13 nov 2026.** A atividade própria de cada mundo é o lugar natural dos objetivos. O texto da 018 fica em `.sdd/specs/018-cada-mundo-seu-jeito/spec.md` como referência: a roça completa é a marca do Rancho, a Lua tem estufa, o Doce Reino tem confeitaria, o Planeta Vivo tem pesquisa e a Cidade tem o canteiro de obras.

**Como é hoje:** o diário (`src/jogo/diario.ts`) tem missões de texto que viram conquista, o canteiro da cidade (014) dá o capacete e o colete, e nada mais junta o que a criança faz. Não há moeda, nível, loja nem objetivo que atravesse os mundos.

## Objetivo
A criança sempre tem um prêmio à vista e chegando, e enxerga isso sem ler:
- missões curtas, com o prêmio mostrado antes;
- um nível que sobe com tudo o que ela faz, em qualquer mundo, e dá um presentinho a cada nível;
- moedinhas que ela ganha brincando e troca por coisas que valem a pena mostrar aos amigos.

Medida de sucesso: o tempo de sessão das crianças antes e depois (o dono observa a rodada em família).

## Esboço (aprovado em 13 nov 2026)
O esboço rodou no jogo de verdade com `?esboco=alma` (`src/esboco/alma/`), na Cidade Grande e no Rancho Alegre, e teve duas rodadas. Saiu na T08: a arte, as figuras e as festas viraram `src/ui/alma/`, e os três premium do esboço esperam a fase C em `src/render/premium3d.ts`.
- **Rodada 1:** missões, álbum, habilidades e lojinha, tudo por mundo.
- **Rodada 2 (o modelo do dono):** carteira, nível, habilidades e fantasias são da criança; missões, prêmios especiais e a banca são do mundo; a lojinha premium é universal. Três premium foram feitos de verdade no motor: o tênis-cometa, o dragãozinho e o unicórnio-pônei.

O que o esboço provou e esta spec mantém:
- o quadro de missões aparece sozinho na primeira visita ao mundo;
- o cartão da missão no HUD mostra tarefa, progresso e prêmio, sem texto;
- as festas (missão, nível e compra premium);
- a vitrine noturna com o provador que gira a câmera em volta da criança;
- os premium vistos nos amigos.

Os números e as regras puras do esboço (`src/esboco/alma/dados.ts`, `estado.ts`) são o ponto de partida da T01.

## O modelo (decisão do dono, 13 nov 2026)
**Da criança (universal), vale em todo mundo:**
- **Carteira:** uma só, de moedinhas.
- **Nível da criança:** sobe com XP de tudo o que ela faz, em qualquer mundo. Cada nível dá um presentinho visível e algumas moedinhas.
- **Habilidades:** 5, cada uma com 5 estrelas: construtor, explorador, amigo dos bichos, fazendeiro e cozinheiro. Cada mundo alimenta algumas.
- **Fantasias:** já vão com a criança (017). Os prêmios das missões entram aí.
- **Premium comprados** e o que está vestido.

**Até as contas da 024, isso mora no aparelho**, ao lado da aparência e das preferências do personagem (`terrario:alma-crianca`, junto de `terrario:aparencia`). Com a 024, vai para o servidor, na conta da família (ver "Multijogador e servidor").

**De cada mundo:**
- **Missões e os prêmios especiais delas.** O capacete e o colete de obra só saem do canteiro da cidade; a Caipira e o Peão campeão só saem do Rancho. O progresso das missões é do mundo, como todo o resto do mundo (014: cada mundo é uma história).
- **Banca do mundo:** o que se põe no mundo (blocos, enfeites, a galinha). Só itens do tema daquele mundo, pagos com a carteira da criança.

**Lojinha premium (universal):**
- abre pela roda do menu, de qualquer mundo;
- vende coisas que o jogo nunca dá, que **nunca** saem de missão, nível ou habilidade, só com moedinhas;
- é exclusiva pela qualidade e por ser só da lojinha: movimento, efeito e acabamento que os itens normais não têm;
- tudo aparece nos amigos, no multijogador.

## Missões (Cidade Grande e Rancho Alegre nesta parte)
As mesmas do esboço. Ficam abertas 2 de cada vez, na ordem, e toda missão aberta conta, fixada ou não. As "devagar" (que esperam a natureza) correm por baixo das outras e nunca falham.

**Cidade Grande (8 missões, 30 moedinhas):**
| # | Missão | Conta | Minutos (4 anos) | Prêmio |
|---|---|---|---|---|
| c1 | Casinha do cachorro | obra 1 | 2–3 | 3 + capacete de obra |
| c2 | Banca de frutas | obra 2 | 2–3 | 3 |
| c3 | Passeio: padaria, escola e sorveteria | lugares | 3–4 | 3 |
| c4 | Ponto de ônibus | obra 3 | 2–3 | 3 |
| c5 | Pão da padeira | `trocou:cozinheiro` | 2–3 | 3 |
| c6 | Sorveteria | obra 4 | 5–7 | 5 |
| c7 | Casinha com porta e janela | obra 5 | 6–8 | 5 |
| c8 | Coreto da praça | obra 6 | 6–8 | 5 + colete laranja |

**Rancho Alegre (7 missões, 25 moedinhas):**
| # | Missão | Conta | Minutos (4 anos) | Prêmio |
|---|---|---|---|---|
| r1 | Colheita do sítio (5 maduras) | `colheu` | 2–3 | 3 + **Caipira da festa** |
| r2 | Milho para 2 galinhas | `criou:coelho` | 2–3 | 3 |
| r3 | Roça nova (6 sementes) | `plantou` | 3–4 | 3 |
| r4 | Trigo para 2 vacas | `criou:cervo` | 2–4 | 3 |
| r5 | Pão caseiro | `fabricou:pao` | 3–4 | 4 |
| r6 | 2 ovos do galinheiro (devagar) | `coletou:ovo` | 6–10 | 4 |
| r7 | A sua roça cresceu (6, devagar) | `colheu:minha` (nova: a planta que o próprio jogador plantou) | 6–10 | 5 + **Peão campeão** |

**Depois da lista:** missões de bis (as mesmas, de novo), com 2 moedinhas e metade do XP, sem prêmio de fantasia, sem prazo.

**Fantasias novas de prêmio:** a Caipira da festa e o Peão campeão entram no catálogo da 017 como peças desbloqueáveis (`DESBLOQUEIOS`, limite subindo de 16 para 32). O esboço as montou com peças que já existem; aqui elas ganham acabamento (bordado da camisa xadrez, o chapéu de palha da festa, a estrela do peão).

## Nível, XP e presentinhos
- **XP:** 20 por missão; ações soltas dão pouco (obra: 1 por bloco; colher maduro: 2; plantar: 1; dar comida a um bicho: 4; pão: 5; lugar novo: 5; troca com morador: 3; pôr bloco: 0,2).
- **Níveis 2 a 10:** 40, 100, 180, 280, 400, 540, 700, 880 e 1080 XP. Depois do 10, a conta continua com +200 por nível, com presentes a escolher numa próxima rodada.
- **Presentinhos (pequenos, visíveis, nunca premium), todos à vista no caminho dos níveis:**
| Nível | Presente | Moedinhas |
|---|---|---|
| 2 | Etiqueta do nome colorida (os amigos veem) | 2 |
| 3 | Gesto novo: pulo de estrela (roda de gestos da 015) | 2 |
| 4 | Cor nova para as fantasias: lilás | 2 |
| 5 | Moldura de foto de flores (modo foto) | 3 |
| 6 | Balão de fala com estrelinha (frases prontas) | 3 |
| 7 | Etiqueta do nome com estrela | 3 |
| 8 | Gesto novo: reverência | 3 |
| 9 | Cor nova para as fantasias: menta | 3 |
| 10 | Troféu do nível 10 no álbum | 5 |

## Habilidades
5 habilidades universais, com 5 estrelas cada (5, 15, 30, 50 e 80 pontos). Cada missão feita dá 3 pontos à habilidade dela; as ações soltas dão o resto.
| Habilidade | Mundos que alimentam | O que conta |
|---|---|---|
| Construtor | Cidade e Rancho | blocos na obra, construções, trocas com o construtor |
| Explorador | Cidade e Rancho | lugares novos (lojas, praça, açude, morro) |
| Amigo dos bichos | Rancho | bicho alimentado ou criado, ovos (o mesmo bicho não conta de novo em menos de 1 minuto) |
| Fazendeiro | Rancho | plantar e colher maduro |
| Cozinheiro | Cidade e Rancho | pão, pipoca, pão da padeira |

A estrela nova aparece na festa da missão (selo no canto) e no baú. Nesta parte, as estrelas não liberam nada: são o retrato do jeito de brincar. Os mundos novos (026, 027) entram alimentando as mesmas cinco.

## Banca do mundo
Só itens do tema daquele mundo, pagos com a carteira, com preço fixo e a confirmação de sempre. O pacote vai **de verdade para o inventário** (o núcleo entrega). O que não cabe na mochila espera no baú da banca, para não se perder.
| Mundo | Item | Quantidade | Preço |
|---|---|---|---|
| Cidade | Flores para a praça | 6 | 3 |
| Cidade | Toldo verde | 8 | 4 |
| Cidade | Toldo vermelho | 8 | 4 |
| Cidade | Poste de luz | 4 | 5 |
| Cidade | Janela acesa | 6 | 5 |
| Rancho | Fardos de feno | 4 | 3 |
| Rancho | Sementes de abóbora | 6 | 3 |
| Rancho | Lampião de abóbora | 2 | 4 |
| Rancho | Porteira | 2 | 4 |
| Rancho | Cerca do curral | 12 | 4 |
| Rancho | Galinha para o galinheiro (já criada) | 1 | 6 |

Sem bicho que não exista no tema (o gato e o pônei da rodada 1 saíram).

## Lojinha premium
**Catálogo de lançamento: só o que está pronto de verdade** (decisão do dono). Nada de cartão "em breve". As outras 5 do esboço (visor estelar, asas de borboleta, mochila-foguete, pandinha, cãozinho-robô) vêm em rodadas seguintes, poucas de cada vez, cada uma com o mesmo capricho.
| Item | Categoria | Preço | O que o faz premium |
|---|---|---|---|
| Camiseta aquário | roupa | 15 | água azul-mar com peixinhos (laranja, amarelo, coral e branco) nadando em volta do corpo e das mangas, o rabinho abanando; bolhas subindo, areia e algas na barra; gola, punhos e barra de pérola acesa e a estrela-do-mar de ouro na areia |
| Tênis-cometa | roupa | 20 | faixa de luz que vai do ouro ao azul; o cometa de ouro com a cauda de ouro e azul; pegadas de luz de ouro e de azul que somem devagar e estrelinhas a cada passo; anel de estrelinhas ao cair de um pulo |
| Capa de estrelas | costas | 30 | balança com o andar e o vento; estrelas que piscam; rastro de brilho correndo |
| Dragãozinho | fantasia | 55 | capuz de dragão com focinho, chifres de ouro e espinhos; asas que batem (devagar parado, rápido correndo, forte no ar) |
| Pinguinzinho | bicho | 60 | segue gingando, escorrega de barriga nas descidas, bate as asinhas quando a criança comemora |
| Unicórnio-pônei | bicho | 80 | crina e rabo de rosa e lilás com brilhinhos; trota atrás, pula junto, chifre que solta brilho, coraçõezinhos quando a criança para perto; o sonho da lojinha |

**Como a criança compra, sem ler:**
- **Vitrine:** fundo de veludo azul-noite, holofotes, estrelas piscando. Cartões com borda de ouro, a arte flutuando e um brilho que passa. Preço numa fita dourada. Um potinho mostra quanto da carteira já dá.
- **Detalhe:** a arte grande no pedestal, o preço, e os botões "experimentar" (espelho) e "comprar".
- **Provador:** a vitrine some, a criança aparece no mundo vestindo o item, e a câmera gira devagar em volta dela. O bicho aparece ao lado. Embaixo ficam voltar, o preço e comprar.
- **Confirmar:** sempre, com os dois botões grandes (✗ e ✓).
- **Festa da compra:** o item sobe no pedestal dourado, sob o holofote. Ao fechar, a criança já está vestindo, com um puf de brilho.
- **Vestir e tirar:** pelo próprio cartão (camiseta e camiseta riscada). Um item por categoria: roupa, costas, fantasia e bicho. Os premium de roupa ficam por cima do look e da fantasia da 017, como a camada da 017.

**Acabamento antes de lançar (pedido do dono):**
- **Capuz do dragão:** hoje é o capuz-dino recolorido, que lê como "uma caixa verde com olhos". Ganha focinho com narinas, sobrancelha de escama, chifres de ouro maiores, os espinhos descendo pelas costas até o rabo e a barriga de escamas de verdade.
- **Unicórnio maior e mais vivo de longe:** escala de 1,15 para 1,4; crina e rabo mais cheios e mais saturados; o chifre com brilho que se vê a 12 blocos; contorno claro de leve.
- **Os três da rodada 2 de novo:** revisão de cada captura como foto de loja de aplicativo, no computador e no celular.

## Multijogador e servidor
**Princípio:** o núcleo (no aparelho com o servidor local da 009, e na nuvem) decide **todo ganho**. O cliente só mostra e aplica no perfil da criança o que o núcleo mandou.

**Regras puras numa peça só** (`src/jogo/alma.ts`, vindas de `src/esboco/alma/estado.ts`): missões, XP, níveis, pontos das habilidades, preços e a conta da banca. O núcleo confere com elas e o cliente prevê com elas (lição 5 da 014).

**Ganhos (do núcleo para o cliente):**
- o núcleo já decide cada ação que dá ganho: colher, plantar, dar comida, obra terminada, trocar, fazer, pegar ovo, lugar novo (conferido no passo do núcleo com o plano da cidade);
- a cada uma, o núcleo calcula os ganhos e manda **só para quem ganhou**: `{ e: 'alma', missoes: [...progresso e concluídas], ganho: { moedas, xp, pontos } }`;
- o cliente soma `ganho` ao perfil do aparelho e mostra a festa. **O cliente nunca soma um ganho que não veio do núcleo.**
- obra: todo ajudante presente ganha (como o prêmio da 014);
- o limite fica no núcleo: o mesmo bicho alimentado de novo em menos de 1 minuto não conta. Não há limite por dia (decisão do dono).

**Estado do mundo no núcleo:**
- `extras.alma[jogadorId]`: as missões feitas, a fixada, o progresso e o bis daquele jogador, naquele mundo;
- também o livro-razão do que foi ganho e gasto ali (moedas, XP, compras da banca), para a migração da 024 e para auditoria;
- tudo novo só dentro do `criarNucleo` (lição 4 da 014: o servidor roda várias salas no mesmo processo). A sala dorme e acorda com tudo igual.

**Comandos novos:**
- `almaFixar { missao }`: escolhe a missão do HUD.
- `comprarBanca { item, saldo }`:
  - o núcleo confere que o item é do tema do mundo, o limite (1 compra a cada 2 s, 30 por sessão de sala) e a vaga na mochila;
  - entrega o pacote (ou cria a galinha no galinheiro mais perto) e responde `{ e: 'almaCompra', item, preco }`;
  - o cliente desconta o preço da carteira só com essa resposta.
- `almaVestir { premium }` não existe: o que está vestido vai na aparência, no comando `aparencia` de sempre.

**Saneamento:** cada comando novo ganha caso em `src/nucleo/saneamento.ts` e teste no modo nuvem (`confiar: false`), como na lição 1 da 014.

**Premium na aparência:**
- campo novo `premium: { roupa?, costas?, fantasia?, bicho? }` em `Aparencia`;
- `normalizarAparencia` aceita só ids do catálogo e uma por categoria; `sanearAparencia` continua com o limite de 4096 caracteres;
- vai pela rede como a fantasia, e cada aparelho desenha o mesmo nos amigos.

**Até a 024 (carteira no aparelho):**
- **Ganhos:** só o núcleo dá; na nuvem, o servidor guarda o livro-razão por jogador e por sala.
- **Gastos com a carteira:** a carteira mora no aparelho, então o servidor não tem como conferir o saldo.
  - Na banca, o cliente manda o saldo que tem, o núcleo recusa se o saldo não cobre o preço e guarda o gasto no livro-razão.
  - Uma carteira mexida à mão daria blocos comuns do tema, sem vantagem num jogo de família; os limites seguram o abuso.
- **Premium:** fica com o aparelho (como os desbloqueios da 014). O pior caso é alguém vestir um premium sem ter comprado.
- **Com a 024:**
  - a carteira, o nível, as habilidades e os premium vão para a conta da família no servidor;
  - o servidor passa a conferir saldo e posse em toda compra e ao repassar a aparência;
  - o livro-razão das salas serve para a primeira conta.

**`VERSAO_REDE` 5 → 6:** comandos e eventos novos e o campo `premium` na aparência. O servidor é publicado junto.

**Paridade (009):** sessões novas gravadas antes e depois (colher e completar r1, encher a obra 1, comprar na banca). Local e nuvem dão os mesmos eventos `alma`.

**Modo local:** o mesmo núcleo no trabalhador. Nada de caminho especial no cliente.

## Experiência medida (para não frustrar)
Medidas que precisam passar antes de fechar:
- **O prêmio antes de começar:** na primeira visita, o quadro de missões aparece em até 3 s depois de entrar, com o prêmio grande e as moedinhas à vista, sem texto (captura automática nos dois mundos, celular e computador).
- **Primeiro prêmio em até 3 minutos** num ritmo de criança (um toque a cada 6 s), na Cidade (c1, com o capacete) e no Rancho (r1, com a Caipira). Teste de tela com o ritmo imitado.
- **Primeira moedinha e primeiro nível na primeira sessão:** o nível 2 chega até a segunda missão (simulação das listas).
- **Primeiro premium em até 2 sessões de 15 min:** a camiseta (15) com 3 missões por sessão a 3,6 moedinhas mais os presentes de nível. O unicórnio (80) fica entre 6 e 8 sessões. Teste de unidade do ritmo.
- **Progresso visível a cada ação:** a bolinha do cartão enche e faz "plim" em até 300 ms do evento do núcleo, nos dois modos (local e nuvem).
- **Festas curtas que não prendem:** os botões aparecem em até 2,5 s (missão com até 5 moedas), 1,7 s (nível) e 1,5 s (premium). Fecham com um toque; duas festas na fila (missão e nível) passam uma depois da outra, sem sobrepor.
- **Nada tapa o HUD:** carteira, nível e cartão da missão sem encostar no botão de informações, na roda, na bússola, no minimapa, na mochila, no joystick e na barra, em 1280×720, 844×390 e 390×844 (teste de caixas, como na 021).
- **Legível sem ler:** o caminho inteiro (quadro, missão, festa, baú, banca, vitrine, provador, compra) revisado jogando com o texto escondido; nenhum botão sem desenho.
- **Premium que se vê:**
  - o unicórnio é reconhecível a 12 blocos de distância;
  - as pegadas de luz aparecem a cada passo andando;
  - as asas batem visivelmente parado (amplitude de pelo menos 15°).
  - Capturas de loja (de lado, perto e visto por um amigo) revisadas uma a uma.
- **Amigos veem igual:** com 2 jogadores na nuvem, o premium de A aparece em B em até 1 s depois de vestir (teste de tela).
- **Compra que nunca se perde:** banca com a mochila cheia guarda no baú da banca; premium comprado fica vestido e reaparece ao reabrir o jogo (teste de tela).
- **Desempenho:**
  - meta da 012 (60 quadros no celular de teste) com 4 amigos vestindo os 6 premium e 2 bichos seguindo;
  - medido na GPU com a CPU 4× mais lenta;
  - cada bicho custa no máximo 6 chamadas de desenho (peças fundidas por material) e as estrelinhas usam um só pool de no máximo 80 sprites.
- **Rodada em família** na Cidade e no Rancho, no computador e no celular, antes de fechar. O dono anota o tempo de sessão antes e depois.

## Cuidados legais (ver `.sdd/cuidados-legais.md`)
Checados contra o esboço e valendo para a implementação:
- **Sem pressão de retorno:** nada de "volte em 2 horas senão perde", sequência que pune quem falta, notificação insistente ou oferta que acaba. Nada expira; as missões devagar nunca falham; o quadro só abre sozinho na primeira visita ao mundo.
- **Escasso e único, do jeito certo:** exclusivo pela qualidade e por ser só da lojinha.
  - **Nunca:** oferta por tempo, contagem regressiva, "só restam N", estoque que gira, item que some da vitrine.
  - Preço fixo, sempre o mesmo, sempre à venda (CONANDA 163/2014; ECA Digital).
- **Sem sorteio:** prêmio e preço sempre conhecidos antes. Nenhuma caixa misteriosa, nenhum cartão escondido (ECA Digital, Lei 15.211/2025).
- **Confirmação em toda compra:** dois passos, com os botões grandes ✗ e ✓.
- **Moedinha não passa a outro jogador e não vira dinheiro:**
  - não há comando de transferência;
  - a carteira é de cada criança.
  - **Ponto de atenção:** os pacotes da banca podem ser dados a um amigo pelo "dar item" que já existe. É presente de bloco comum, não de moeda; fica assim.
- **Sem dado pessoal novo:** só estado de jogo (moedas, XP, missões, o que está vestido). Nada de analytics de terceiros. O tempo de sessão é observado pelo dono, sem coleta.
- **Empurrão leve, para o dono pesar:** o brilho verde e o potinho nos itens que dá para comprar, e o provador (que aumenta a vontade). Ficam porque informam ("já dá" e "falta pouco"), sem pressa nem pressão.

**Notas para a 025 (dinheiro de verdade):**
- O dinheiro de verdade **nunca** compra moedinhas nem premium direto. Senão o caminho brincando perde o valor, e o premium vira "pague para ter" (atenção à categoria Kids da Apple e ao programa de famílias do Google).
- Qualquer compra paga só na área dos pais, atrás do portão, com o item visto antes.
- O catálogo premium é o mesmo para quem ganha brincando e para qualquer outra via. Nada de item só pago.
- Nada de pacote, "oferta especial", desconto por tempo ou personagem pedindo compra para a criança.
- Conferir de novo o CDC art. 37 §2, a CONANDA 163/2014 e a regulamentação do ECA Digital antes de qualquer compra paga, e com advogado.

## Testes
- **Unidade (Vitest):**
  - **Regras** (`src/jogo/alma.ts`): missões abertas, prêmio igual ao mostrado, XP e níveis, presentes, estrelas, preços, banca só do tema, premium nunca vindo de missão nem de nível, normalização do perfil e do estado do mundo.
  - **Ritmo:** primeiro premium em até 2 sessões, unicórnio entre 6 e 8.
  - **Aparência:** campo `premium` só com ids do catálogo, um por categoria, cabe no limite.
- **Núcleo:**
  - eventos `alma` só para quem ganhou;
  - limites do amigo dos bichos;
  - obra para todos os ajudantes;
  - `comprarBanca` (tema errado, sem saldo, limite, mochila cheia, galinha);
  - saneamento no modo nuvem;
  - a sala dorme e acorda igual (`servidor/testes/salas.test.ts`);
  - paridade gravada local × nuvem.
- **Tela (Playwright, GPU):**
  - laço c1 e r1 de verdade até a festa, no computador e no toque;
  - nível sobe com a festa;
  - banca entrega no inventário;
  - vitrine → provador → comprar → festa → vestido;
  - premium visto por outro jogador na nuvem;
  - nada tapa o HUD nos três tamanhos;
  - reabrir o jogo mantém tudo.
- **Capturas:** cada premium vestido ou seguindo, de lado, perto e visto por um amigo; vitrine, provador, festas, baú e banca, no celular e no computador; vídeos curtos para o relatório visual.

## Fases e tarefas
Ver `tasks.md` (nesta pasta). Ordem: a regra e o núcleo primeiro, depois o HUD e as festas, depois os premium e a lojinha. O que for premium e não chegar ao capricho fica para a rodada seguinte, sem cartão "em breve".

## Fora desta parte
- Os outros mundos (Lua, Doce Reino, Planeta Vivo, Mata, Dinos, Bruma), cada um com o seu esboço e a sua atividade (a antiga 018).
- As outras 5 premium (visor estelar, asas de borboleta, mochila-foguete, pandinha, cãozinho-robô), poucas de cada vez.
- Presentes depois do nível 10.
- A carteira no servidor (vem com a 024) e qualquer compra com dinheiro (025).

## Riscos
- **Ganho falso na nuvem:** só o núcleo manda ganho; o cliente nunca soma sozinho. Teste no modo nuvem.
- **Carteira no aparelho até a 024:** dá para mexer à mão. Aceito (sem dinheiro, jogo de família); os limites seguram a banca.
- **Desempenho com bichos e efeitos:** peças fundidas por material, um pool de brilhos, e o bicho longe (mais de 24 blocos) em versão simples.
- **Muito trabalho de arte:** 6 premium com capricho, 2 fantasias de prêmio e 9 presentes. Cada premium é uma tarefa; o que não chegar ao nível fica para a rodada seguinte.
- **O boneco que flutua no céu nas capturas:** nas fotos do provador, uma criança de chapéu de palha aparece parada no alto (`prova-cel-1-lado.png`), sempre no mesmo lugar da tela. Só aparece com a câmera fixa das capturas, então pode ser algo preso à câmera do jogo (a T00 investiga e conserta, se for do jogo).

## Decisões do dono
- 13 nov 2026: junta a 018. Fica logo depois da câmera (022), na ordem 022 → 023 → 024 → 020 → 025, com os mundos novos (026 e 027) intercalados.
- 13 nov 2026 (rodada 2 do esboço): carteira, nível, habilidades e fantasias são da criança, no aparelho até a 024; missões, prêmios especiais e banca são do mundo; lojinha premium universal, pela roda do menu, com coisas que o jogo nunca dá, só com moedinhas; escasso e único quer dizer exclusivo pela qualidade, nunca por tempo ou quantidade.
- 13 nov 2026 (depois da rodada 2): preços de 15 a 80, com o unicórnio como sonho; **catálogo de lançamento só com o que está pronto** (camiseta arco-íris, depois trocada pela camiseta aquário; tênis-cometa, capa de estrelas, dragãozinho, pinguinzinho e unicórnio-pônei), as outras 5 depois, poucas de cada vez; os presentes de nível mantêm as moedinhas (2 a 5); antes de lançar, acabamento no capuz do dragão e no unicórnio (maior e mais vivo de longe), e conferir o boneco que flutua no céu das capturas.
- 13 nov 2026, ao aprovar a spec ("Manda ver"), com as recomendações aceitas:
  - a banca funciona nos mundos da nuvem, com saldo informado pelo aparelho e os limites do núcleo, até a 024;
  - moedinha ganha no mundo de um amigo vai para o cofrinho de quem visita;
  - o cartão da missão substitui o chip do diário na Cidade e no Rancho, e o diário fica no menu;
  - presentes depois do nível 10 ficam para uma rodada futura;
  - o boneco no céu: a T00 confirma antes de consertar;
  - sem limite diário de amigo dos bichos, só a regra de 1 minuto por bicho.
- 14 nov 2026 (depois de publicada): **nada de arco-íris nos premium.** A camiseta arco-íris vira a **camiseta aquário** (mesmo preço e lugar no catálogo; o id `camiseta-arco-iris` passa a `camiseta-aquario`, e quem já tinha comprado ou vestia a de antes, guardado no aparelho ou chegando de um amigo com o jogo antigo, fica com a nova sem pagar de novo); a crina e o rabo do unicórnio ficam rosa e lilás com brilhinhos; a faixa e a cauda do tênis-cometa ficam de ouro e azul; os brilhos de cada premium nas cores dele. O arco-íris do céu depois da chuva fica como está, até o dono decidir.
