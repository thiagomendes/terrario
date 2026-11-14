# 023 Alma do jogo: tarefas (parte 1: Cidade Grande e Rancho Alegre)

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma tarefa por vez (pesa no computador do dono). Cada uma fecha com `npx tsc --noEmit`, os testes que tocou e capturas (aperitivo para o dono).

| # | Tarefa | Tamanho | Depende de |
|---|---|---|---|
| T00 | **O boneco no céu:** achar o que é a criança de chapéu de palha parada no alto das capturas do provador (`prova-cel-1-lado.png`), presa ao mesmo lugar da tela; consertar se for do jogo, documentar se for só da câmera fixa das capturas | P | — |
| T01 | **Regras puras** em `src/jogo/alma.ts` (do esboço): missões das duas listas, XP, níveis e presentes, 5 habilidades, banca, catálogo premium de lançamento (6), normalização do perfil e do mundo; testes de unidade, inclusive o ritmo (primeiro premium em até 2 sessões, unicórnio entre 6 e 8) | M | — |
| T02 | **Perfil da criança no aparelho** (`terrario:alma-crianca`, ao lado de `terrario:aparencia`): ler, normalizar, aplicar só os ganhos que o núcleo manda, guardar; formato pronto para a migração da 024 | P | T01 |
| T03 | **Núcleo: missões e ganhos.** `extras.alma[jogadorId]` (missões, fixada, progresso, bis, livro-razão); evento `alma` só para quem ganhou; `colheu:minha` (planta do próprio jogador); lugares conferidos no passo; obra para todos os ajudantes; limites do amigo dos bichos; `almaFixar`; saneamento; `VERSAO_REDE` 5 → 6; sala que dorme e acorda igual; testes local e nuvem; paridade gravada (009) | G | T01 |
| T04 | **Banca do mundo no núcleo:** `comprarBanca` (só tema do mundo, saldo informado, 1 a cada 2 s, 30 por sessão, mochila cheia vai para o baú da banca), entrega no inventário, galinha criada no galinheiro mais perto, `almaCompra`; testes local e nuvem | M | T03 |
| T05 | **Fantasias de prêmio:** Caipira da festa e Peão campeão no catálogo da 017, com acabamento (camisa xadrez bordada, chapéu de palha da festa, estrela do peão); `DESBLOQUEIOS` com os dois e limite 16 → 32; silhueta com cadeado na aba Fantasias | M | — |
| T06 | **HUD:** carteira com o nível (estrela com o anel do XP) e o cartão da missão (tarefa, progresso, prêmio) nos dois mundos, no lugar do chip do diário; quadro de missões na primeira visita; teste de caixas nos três tamanhos | M | T02, T03 |
| T07 | **Baú:** álbum de missões do mundo com as fantasias de prêmio, caminho dos níveis com os presentes à vista e a carinha da criança, habilidades com estrelas e mundos, banca com toldo e confirmação | M | T04, T06 |
| T08 | **Festas:** missão (fantasia no boneco de verdade, figurinha, moedas com o tlim, estrela da habilidade), nível (estrela com o número e o presente), premium (veludo, holofote, pedestal); fila sem sobrepor; voo para a carteira; sons na régua da 019 | M | T06 |
| T09 | **Presentes de nível de verdade:** etiqueta do nome colorida e com estrela (os amigos veem), gestos pulo de estrela e reverência (015), tintas lilás e menta nas fantasias, moldura de foto, balão com estrelinha, troféu no álbum | G | T08 |
| T10 | **Premium na aparência e na rede:** campo `premium` (uma peça por categoria, ids do catálogo), `normalizarAparencia`, `sanearAparencia` e limite, desenho nos amigos; montagem nas juntas do boneco; pool único de brilhos e pegadas | M | T01 |
| T11 | **Premium 1, roupa:** tênis-cometa (do esboço, revisado) e camiseta arco-íris (listras que correm na tinta do boneco) | M | T10 |
| T12 | **Premium 2, costas e fantasia:** capa de estrelas (balanço na junta da capa, estrelas que piscam) e **dragãozinho com o capuz refeito** (focinho, narinas, chifres maiores, espinhos até o rabo, barriga de escamas) e as asas do esboço | G | T10 |
| T13 | **Premium 3, bichos:** **unicórnio maior e mais vivo de longe** (escala 1,4, crina e rabo mais cheios, chifre que se vê a 12 blocos) e pinguinzinho (ginga, escorrega de barriga, bate as asinhas); seguir, pular junto, reações, versão simples longe; peças fundidas (até 6 chamadas por bicho) | G | T10 |
| T14 | **Lojinha premium:** item "Lojinha" na roda do menu, vitrine, detalhe, provador com a câmera girando, confirmação, compra, vestir e tirar; só os 6 de lançamento | M | T08, T11 |
| T15 | **Desempenho e fechamento:** 4 amigos com os 6 premium e 2 bichos no celular de teste (GPU, CPU 4×); testes de tela da spec (laço c1 e r1, banca, compra, amigo vê, reabrir); capturas de loja revisadas uma a uma; vídeos; relatório visual; rodada em família | M | todas |

**Ordem sugerida:** T00 → T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → T12 → T13 → T14 → T15.

**Se faltar fôlego:** a T09 (presentes) e um dos premium (o pinguinzinho ou a capa) podem ir para a rodada seguinte sem mexer no resto. O que não chegar ao capricho não entra no catálogo de lançamento, e não fica cartão "em breve".
