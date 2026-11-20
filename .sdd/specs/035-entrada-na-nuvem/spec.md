---
id: 035-entrada-na-nuvem
title: 'Entrada na nuvem: quem cria o mundo vê o amigo, e quem joga com amigos consegue abrir outro mundo'
status: DRAFT
base_branch: main
created_at: 2026-11-20T17:00:00Z
---
## Contexto
Dois defeitos de quem joga com amigos, os dois achados pelo dono em 20 nov 2026.

**1. Quem cria o mundo às vezes não vê o amigo.**
- O filho criou um mundo na Vila Neon e o levou para a nuvem; o pai entrou.
- O pai via o filho, mas o filho não via ninguém ("é como se não tivesse ninguém no jogo pra ele").
- O filho saiu e entrou de novo, e aí funcionou.

**2. Quem entrou num mundo da nuvem fica preso nele.**
- Ao abrir outro mundo (criar um novo, ex.: Rancho Alegre, ou escolher um da lista), a criança cai sempre de volta no mundo da nuvem.
- Ela nunca consegue sair daquele mundo.

**Do backlog, para conferir aqui:** a "Queda curta da conexão". Na sala de teste, a conexão de quem criou o mundo caiu uma vez (código 1005) e voltou meio segundo depois.

O conserto mínimo do defeito 1 já entrou na 034. Esta spec faz o conserto completo, conserta o defeito 2 e responde sobre a queda 1005.

## O que existia (20 nov 2026, `main` 94b3b6e, `VERSAO_REDE` 17)
### Defeito 1: o primeiro quadro perdido
**A causa** (investigada e reproduzida na `main` 65b0a57, antes da 034):
- Quem cria o mundo ou o leva para a nuvem entra pela página `?sala=…&novo=1&direto=1` (`src/nuvem.ts:156-163`, `irParaSala`).
- Nessa página havia uma leitura do IndexedDB (`repo.listar()`) entre o "bem-vindo" do servidor e a criação da cena.
- O servidor manda o primeiro quadro (`primeiro: true`) logo atrás do bem-vindo: ele monta um quadro por jogador a cada passo de 50 ms (`servidor/src/salas.ts:826`) e marca o primeiro de cada um (`src/nucleo/nucleo.ts:3016-3018`).
- A conexão entrega as mensagens só a quem já ouve, sem fila: `else for (const f of ouvintes) f(m)` (`src/cliente/conexaoNuvem.ts:165`).
- Quem ouve é o estado do cliente (`src/cliente/estado.ts:157`), criado pela cena (`src/render/cena.ts:1346`). Se o quadro chega antes, se perde.
- **O travamento** (`src/cliente/estado.ts:136-153`):
  - sem o `primeiro`, `proximoQuadro` fica em -1 (`:138`);
  - todo quadro vai para `adiantados` (`:146`), que cresce sem fim;
  - nenhum quadro é aplicado nunca mais.
- **O que o filho deixa de ver:** os outros jogadores, os moradores e os bichos se mexendo, a hora e o céu, os blocos dos outros e o estado da Vila. A física é local e os comandos seguem para o servidor, então o pai vê o filho andando.
- **Por que só às vezes:** no computador o IndexedDB responde antes do quadro. No celular, pela internet, o quadro muitas vezes já está na fila atrás do bem-vindo.
- **Reprodução:** `referencia/corrida.ts`, com o servidor real (`criarGerenciador`, `armazemMemoria`), a Vila Neon, o `conexaoNuvem` e o `criarEstadoCliente` reais e um WebSocket de mentira que entrega cada mensagem como tarefa separada:
  - com atraso 0 ms o filho aplica 28 quadros e vê o pai;
  - com 120 ms aplica 0 e não vê ninguém.
  - O arquivo importa de uma pasta temporária da sessão que o escreveu (`W`): para rodar, trocar `W` pela raiz do repositório.

**O que já entrou na 034** (e7027fb, 1fb86a4):
- A lista do aparelho é lida antes de conectar (`src/main.ts:119-120`). Entre o bem-vindo (`src/main.ts:130`) e `criarCena` (`src/main.ts:300`) nada espera, fora os esboços.
- Se a leitura falhar, a entrada segue sem a lista (`.catch(() => [])`, 1fb86a4).
- **O teste dele** (`tests/cliente/entradaNuvem.test.ts`) só procura `await` no texto do `main.ts`. Ele não vê um `.then` ou um `setTimeout`, nem as esperas de `src/nuvem.ts` (`conectar`, `entrarNaSala`, `entrarPeloLink`).
- **A janela que sobra:** os `import()` dos esboços (`src/main.ts:233-241`) reabririam a espera se `?esboco=` viesse junto de `?sala=`.
- `referencia/levar-a-nuvem.ts` copia a ordem do `main.ts` com um IndexedDB de mentira: "agora" (antes da 034) perde a Bia em até 16 de 16 rodadas; "antes" (o conserto) vê em 64 de 64. Ela prova o princípio, mas não roda o `main.ts`.

**O que a conexão e o estado já fazem bem:**
- A conexão reconecta sozinha quando cai, com espera crescente de 0,5 s a 8 s (`src/cliente/conexaoNuvem.ts:55`, `:167-175`).
- Mensagem de uma conexão velha é ignorada (`:121`, `:168`).
- Ao voltar, o servidor recomeça os quadros de quem voltou com um `primeiro` novo (`servidor/src/salas.ts:492`, `src/nucleo/nucleo.ts:3150-3162`).
- A página zera a sequência ao voltar (`src/nuvem.ts:540-543`, `cena.reconferir()` em `src/cliente/estado.ts:204-213`) e avisa "Voltamos! A conexão está de pé de novo."
- Durante a queda aparece o aviso "A internet caiu. Reconectando…" (`src/ui/amigos.ts:583-588`).
- **O servidor local** (Web Worker) não tem a corrida: o worker é criado e ouvido na mesma tarefa (`src/cliente/conexao.ts:15-31`, chamado em `src/render/cena.ts:1334-1346`).
- **Cuidado para o conserto:** o `aoQuadro` da cena usa `cliente.ambiente` (`src/render/cena.ts:1370`), e `cliente` só existe depois que `criarEstadoCliente` volta. Entregar a fila dentro do próprio `aoReceber` quebraria a cena.

### Defeito 2: preso no mundo da nuvem (causa confirmada na leitura do código)
- **No mundo da nuvem a lista de mundos existe:** o `repo` vai para a interface também na nuvem (`src/main.ts:204-205`). "Criar" (`src/ui/mundos.ts:389`) e "Jogar" (`src/ui/mundos.ts:440`) chamam `abrirMundo`.
- **`abrirMundo` (`src/main.ts:221-228`):**
  - copia o endereço atual (`:223`);
  - põe `?mundo=<id>` (`:224`);
  - tira só o `tema` (`:226`);
  - deixa `sala` e `direto`.
- **A página nova lê o `sala` primeiro** (`src/main.ts:108`, `:121`) e volta para a nuvem.
- **O endereço de quem está na nuvem:**
  - quem criou: `?sala=X&direto=1` (o `novo` sai em `src/nuvem.ts:562-565`);
  - quem entrou pelo link: `?sala=X`.
- **Reprodução** (a lógica do `abrirMundo` no Node, 20 nov):
  - `?sala=LUA-SOL-01&direto=1` vira `?sala=LUA-SOL-01&direto=1&mundo=m123`: a página entra direto na sala de novo, sem tela;
  - `?sala=LUA-SOL-01` vira `?sala=LUA-SOL-01&mundo=m123`: a página mostra de novo o cartão "Entrar no mundo de…".
- **Por isso quem mais sofre é quem criou o mundo.** Quem entrou pelo link ainda escapa tocando em "Voltar" no cartão: `voltarAoLocal` (`src/nuvem.ts:145-150`) tira `sala` e `novo` e o `?mundo=` que sobrou abre. Quem criou não vê cartão nenhum.
- **Os outros caminhos já limpam o endereço:** `irParaSala` (`src/nuvem.ts:158`) e `abrirMundoDoAparelho` (`src/nuvem.ts:632-637`) zeram a busca inteira.

### A queda 1005 (conclusão: inofensiva, é o registro que engana)
- **O que é o 1005:** o código que o servidor recebe quando o outro lado fecha a conexão sem dizer o código ("sem código").
- **Quem fecha sem código:**
  - `conexaoNuvem.encerrar()` chama `ws?.close()` sem código (`src/cliente/conexaoNuvem.ts:203`);
  - ao levar o mundo para a nuvem, `subirParaNuvem` cria a sala numa conexão, grava o código no aparelho, chama `encerrar()` e só então vai para `?sala=` (`src/nuvem.ts:787-791`).
- **O que o servidor registra:** tudo o que não é 1000 ou 1001 entra como "conexão caiu" (`servidor/src/index.ts:135-138`).
- **O "voltou meio segundo depois"** é a página nova, `?sala=`, entrando pelo código.
- **Conclusão:** não é queda. É a conexão de criar a sala, fechada de propósito. A sequência bate com o que se viu: a troca de `?mundo=` para `?sala=`, um 1005 e a volta em meio segundo.
- **Nada se perde nela:**
  - o jogador fica na sala esperando voltar (`servidor/src/salas.ts:704-714`);
  - a página nova é o mesmo jogador e recebe um `primeiro` novo (`:492`).
- **Outra fonte do mesmo número:** o "substituído" (a mesma criança abriu o mundo em outra aba) também fecha sem código, do lado do servidor (`servidor/src/salas.ts:485-486`, `servidor/src/index.ts:111`). Também é de propósito.
- **Por que vale um ajuste pequeno:** com o 1005 de propósito misturado às quedas de verdade, o registro não mostra se as crianças estão caindo. O ajuste está em "O que muda", seção 4.

## Decisões do dono
**20 nov 2026:**
- Corrigir logo depois da 034, sem misturar as duas.
- O defeito 2 (preso no mundo da nuvem) entra nesta spec.
- A "Queda curta da conexão" do backlog é conferida nesta spec.

**Perguntas para o dono** (a recomendada primeiro):
1. **O que a criança vê enquanto o jogo se reacerta** (a rede de segurança da seção 2, de 1 a 2 s, quase sempre com a tela de entrada ainda na frente):
   - **(recomendada) Nada novo.** O mundo segue na tela e, quando acerta, os amigos aparecem.
     - O aviso de hoje, "A internet caiu. Reconectando…", não aparece: a internet não caiu.
     - O "Voltamos!" também não.
   - O aviso de hoje, com a bolinha. A frase diz uma coisa falsa, e a criança não lê.
   - Um ícone pequeno no botão dos amigos: os dois bonequinhos com um círculo girando, sem texto.
2. **Se o jogo não se acertar nem depois das tentativas** (não deve acontecer depois do conserto da seção 1; é para uma causa que ainda não conhecemos):
   - **(recomendada) Recarregar a página uma vez,** sozinho, com a tela de entrada, e entrar direto no mesmo mundo. É o que resolveu para o dono ("saiu e entrou de novo"). Nunca mais de uma vez por mundo em 10 min.
   - Parar de tentar e seguir sem os amigos. A criança brinca sozinha, como no defeito de hoje, até sair e entrar.

## O que muda
**Não muda o protocolo:**
- nenhuma mensagem nova e nenhum campo novo;
- `VERSAO_REDE` fica 17;
- o servidor não muda. Só o site publica (sem o cuidado de "Publicar com mudança de protocolo").

### 1. A conexão não perde mensagem
Em `src/cliente/conexaoNuvem.ts`:
- **A fila:** enquanto ninguém ouve (`ouvintes` vazio), as mensagens do núcleo (quadro, salvo, erro) entram numa fila, em vez de sumir (`:165`).
- **A entrega:**
  - o primeiro `aoReceber` recebe a fila inteira, em ordem;
  - a entrega é logo depois que o `aoReceber` volta (`queueMicrotask`), nunca dentro dele: a cena precisa de `cliente` pronto (`src/render/cena.ts:1370`);
  - mensagem que chega enquanto a fila não esvaziou vai para o fim dela: a ordem nunca troca.
- **O teto da fila:** 200 mensagens (10 s de quadros). Passando disso, sai a mais antiga.
  - Isso protege as conexões que nunca ouvem quadros, como a de criar a sala (`src/nuvem.ts:771`) e a de parar de jogar com amigos (`src/nuvem.ts:715`, até 45 s aberta).
  - Se o teto cortar o `primeiro`, a rede de segurança da seção 2 acerta.
- **`encerrar()`** esvazia a fila.
- O que já vale fica igual: as mensagens da sala (bem-vindo, sala, devolvido, recusas) e as de uma conexão velha.
- **Os esboços** (`src/main.ts:233-241`) deixam de ser perigo: com a fila, uma espera entre o bem-vindo e a cena não perde nada.

### 2. A rede de segurança: o estado do cliente não trava para sempre
Em `src/cliente/estado.ts`:
- **Quando dispara:**
  - chegam quadros, mas nenhum é aplicado há **1 s**;
  - e há pelo menos **10 quadros** esperando em `adiantados`.
  - Cobre o caso de hoje (nenhum `primeiro`) e o de um buraco na sequência depois do `primeiro`.
  - A conta é feita quando cada quadro chega, sem relógio à parte: se nada chega, é queda de verdade, e a reconexão da conexão já cuida.
- **Por que 1 s e 10 quadros:**
  - **Numa conexão boa isso nunca acontece:**
    - o WebSocket entrega em ordem;
    - o primeiro quadro de cada conexão é o `primeiro`;
    - com a fila da seção 1, ele não se perde.
    - O tempo é só folga.
  - **No celular pela internet:** a rede às vezes para alguns segundos e depois entrega tudo de uma vez. Nesse caso os quadros chegam em ordem e são aplicados na hora; não contam como travados.
  - **10 quadros** são meio segundo do servidor: um tropeço de um quadro não dispara nada.
  - **1 s** fica abaixo do que a criança nota: na entrada, a tela "Entrando…" ainda está na frente enquanto o terreno é montado. Somado à volta da conexão (uma ida e volta, mais o bem-vindo), a criança fica no máximo uns 2 s sem os amigos, e não para sempre.
- **O que faz: ressincroniza.** Fecha a conexão e abre outra na hora, com um `primeiro` novo do servidor.
  - **O estado** zera a sua sequência (`proximoQuadro = -1`, `adiantados` vazio) e pede de volta as células ainda previstas, como no `reconferir` (`src/cliente/estado.ts:204-213`).
  - **Na interface `Conexao`** (`src/cliente/conexao.ts:8-12`) entra `ressincronizar?()`, opcional. O servidor local não precisa dela: não tem a corrida.
  - **Na `conexaoNuvem`:**
    - `ressincronizar()` fecha a conexão atual com o código 4001 ("ressincronizar"), que o registro do servidor mostra (seção 4);
    - abre outra na hora, sem a espera da reconexão;
    - o estado da conexão passa por `'ressincronizando'` e volta a `'conectado'` no bem-vindo;
    - os comandos do meio esperam na fila de guardados, como numa queda (`src/cliente/conexaoNuvem.ts:87-101`);
    - se a conexão nova não abrir, vale a reconexão de sempre, com o aviso de sempre: aí a internet caiu mesmo.
  - **Em `src/nuvem.ts:537-553`:** `'ressincronizando'` não mostra o aviso de queda nem o "Voltamos!" (pergunta 1).
- **Sem laço de reconexão:**
  - no máximo **2 ressincronizações** por página: a primeira na hora, a segunda só se travar de novo depois de pelo menos **3 s**;
  - a conta volta a zero depois de **60 s** com os quadros andando;
  - **depois da segunda**, o que o dono escolher na pergunta 2. Na recomendada, a página recarrega uma vez, direto no mesmo mundo (com `direto=1`). Uma marca em `sessionStorage` por código de sala impede um segundo recarregar em 10 min; com ela, para de tentar.
  - O pior caso é 2 reconexões e 1 recarregar em 10 min. A espera da reconexão de sempre (0,5 s a 8 s) continua valendo se a internet cair de verdade.
  - O servidor não limita quem entra por um código válido: a tentativa conta e é descontada na hora (`servidor/src/salas.ts:446-468`).
  - **A queda de verdade não confunde a conta:** durante a queda não chega quadro, e o `reconferir` da volta (`src/nuvem.ts:542`) também zera a medida do travamento.
- **Para os testes:**
  - um relógio que o teste pode trocar (`agora?: () => number` nas opções do estado);
  - o número de ressincronizações no `window.__brumaluz` (`src/render/cena.ts:1109`).

### 3. Sair do mundo da nuvem para um mundo do aparelho
- **A função:** abrir um mundo do aparelho tira `sala`, `novo` e `direto` do endereço, além do `tema`, e põe `mundo`.
  - Ela fica numa função pequena e sem DOM, com teste de unidade (ex.: `enderecoDoMundo(href, id)`).
  - O resto do endereço fica como está: os testes e as capturas usam parâmetros próprios.
- **Onde:** `abrirMundo` (`src/main.ts:221-228`) usa essa função. `abrirMundoDoAparelho` (`src/nuvem.ts:632-637`) fica como está: ele já zera tudo.
- **O mundo que foi para a nuvem continua abrindo na nuvem:** "Jogar" nele leva ao `?mundo=` e dali à sala (`src/main.ts:142`).

### 4. O registro da queda 1005
- `encerrar()` fecha com o código 1000 ("saiu normalmente"): `ws?.close(1000)` em `src/cliente/conexaoNuvem.ts:203`.
- A conexão de criar a sala deixa de aparecer como queda no registro.
- **O servidor não muda.** O "substituído", fechado pelo servidor sem código, continua a aparecer como 1005 (`servidor/src/index.ts:111`). Isso fica para quando o servidor publicar de novo (ver "Fora desta spec").
- **A ressincronização (4001) aparece no registro** como "conexão caiu (código 4001…)". Assim dá para ver no ar se a rede de segurança dispara.

### 5. Testes
**Unidade:**
- **A corrida com o servidor de verdade:** `referencia/corrida.ts` vira `tests/cliente/corridaNuvem.test.ts`:
  - com o servidor real (`criarGerenciador`, `armazemMemoria`), a Vila Neon, a conexão e o estado reais;
  - a espera entre o bem-vindo e o estado: 0 ms, uma tarefa, 120 ms, 500 ms e 2 s;
  - em todas, o filho aplica quadros, vê o pai e o pai vê o filho;
  - **falha antes do conserto** (com 120 ms, 0 quadros) e passa depois;
  - a ida para a nuvem como no jogo: a conexão de criar fecha e a página nova entra pelo código.
- **O teste de comportamento substitui `tests/cliente/entradaNuvem.test.ts`** (o teste de texto sai):
  - a conexão com o WebSocket de mentira (o de `tests/cliente/conexaoNuvem.test.ts`): bem-vindo, `primeiro` e mais quadros chegam antes de alguém ouvir; o estado liga depois de uma espera qualquer (`await`, `.then`, `setTimeout`);
  - todos os quadros são aplicados em ordem, e o primeiro aplicado é o `primeiro`;
  - nada é entregue dentro do `aoReceber`;
  - quadros que chegam no meio da entrega da fila ficam na ordem;
  - o teto de 200 e o `encerrar()` esvaziando a fila.
- **A rede de segurança** (`tests/cliente/estado.test.ts` ou junto do teste de comportamento):
  - quadros sem `primeiro` por 1 s, com 10 ou mais esperando: ressincroniza uma vez;
  - um buraco na sequência depois do `primeiro`: também ressincroniza;
  - quadros parados por 5 s e depois todos de uma vez, em ordem: não ressincroniza;
  - travou de novo antes de 3 s: espera; depois de 3 s: a segunda;
  - depois da segunda: o que o dono decidir (pergunta 2), uma vez só;
  - 60 s com os quadros andando: a conta volta a zero.
- **A conexão:** `ressincronizar()` fecha com 4001, abre outra na hora e passa por `'ressincronizando'`, sem `'reconectando'`; o que chega pela conexão velha é ignorado; `encerrar()` fecha com 1000.
- **O endereço:** `enderecoDoMundo` com `?sala=X&direto=1`, `?sala=X`, `?sala=X&novo=1&direto=1`, `?tema=…` e um parâmetro de teste que tem de ficar.

**E2e** (num arquivo novo, `e2e/entrada-nuvem.spec.ts`, com os ajudantes de `e2e/multiplayer.spec.ts`):
- **A. A leitura do aparelho da Ana atrasada:**
  - a variante do `multiplayer`, com o IndexedDB da página da Ana lento (cada pedido com uns 150 ms a mais, por um script de início);
  - Ana leva o mundo para a nuvem, Bia entra pelo link e cada uma vê a outra.
  - **Este já passa na `main`,** pelo conserto da 034: ele guarda o caso do dono contra uma volta da espera.
  - O desenvolvedor confere que o atraso não quebra o IndexedDB (uma transação que se fecha antes do pedido seguinte) e escreve no teste como atrasou.
- **B. O primeiro quadro perdido:**
  - um script de início na página da Ana, só no `?sala=`, joga fora a primeira mensagem com `"primeiro":true`;
  - Ana vê a Bia mesmo assim, em até 5 s depois de a Bia entrar;
  - o aviso de queda não aparece (pergunta 1);
  - Ana teve exatamente 1 ressincronização.
  - **Falha antes do conserto:** Ana nunca vê a Bia.
- **C. Sair da nuvem:**
  - Ana entra num mundo da nuvem (leva o dela, como no `multiplayer`);
  - dali, cria um mundo do Rancho Alegre ("Criar", "Jogar");
  - o endereço fica com `mundo=` e sem `sala`, `novo` ou `direto`;
  - o mundo que abre é o novo, do Rancho, sem conexão com a nuvem (sem o botão dos amigos);
  - depois, de volta à lista, "Jogar" num terceiro mundo do aparelho também abre ele.
  - **Falha antes do conserto:** volta para a sala.
- **Nada de ressincronização à toa:** no `multiplayer` e nos e2e de amigos (`achar-amigo-nuvem`, `amigos-sem-atrito`, `vila-bate-amigos`, `vila-casa-amigos`), o número de ressincronizações fica em 0.

## Experiência medida
**O que a criança e o pai veem:**
- **Quem cria o mundo vê o amigo,** no computador e no celular, sempre:
  - no teste da corrida, com espera de 0 ms a 2 s entre o bem-vindo e a cena: o filho vê o pai em 5 de 5 esperas, 3 rodadas cada;
  - no e2e A, 3 rodadas seguidas verdes na placa de vídeo.
- **Se o primeiro quadro se perder mesmo assim** (e2e B):
  - do primeiro quadro travado até a Bia aparecer: no máximo 1 s mais a volta da conexão; meta de até 3 s no computador, medida e escrita na Situação;
  - nenhuma tela, aviso ou texto novo (pergunta 1, se a recomendada for aceita);
  - a criança não precisa fazer nada.
- **Quem está na nuvem abre outro mundo** (e2e C):
  - o toque em "Jogar" ou "Criar" abre o mundo escolhido, 3 de 3 rodadas;
  - nenhuma volta para a sala.
- **Nada piora:**
  - na entrada normal, nenhuma ressincronização (o contador em 0 nos e2e de amigos);
  - a entrada pelo link e a reconexão de quando a internet cai continuam iguais: o aviso, o "Voltamos!" e o `multiplayer` verde.

**No servidor (o registro):**
- levar um mundo para a nuvem não registra mais "conexão caiu (código 1005)";
- uma ressincronização aparece como código 4001.
- Depois de publicar, o orquestrador abre um mundo na nuvem com o celular, leva para a nuvem, e confere no registro: nenhum 1005 e nenhum 4001.

**A suíte inteira:**
- Vitest;
- `npm run build`;
- paridade 36/36 (o estado do cliente mudou);
- o e2e inteiro em pedaços de 2 trabalhadores;
- o que cair, conferido contra a `main`.

**Fotos:** não há visual novo, então não há portão visual. Se o dono escolher o ícone na pergunta 1, entram as fotos do botão dos amigos, em pé e deitado, de dia e de noite.

## Fora desta spec
- **A reconexão não traz os blocos mudados durante a queda** (achado lateral, a conferir):
  - o `primeiro` novo não manda os blocos de novo (`src/nucleo/nucleo.ts:3150-3162` não marca blocos);
  - o bem-vindo da reconexão traz as edições, mas ninguém lê depois do primeiro (`src/nuvem.ts:375`, só na entrada).
  - Vale para toda queda, não só para a ressincronização. Vai para o backlog.
- O "substituído" fechar com um código próprio, do lado do servidor: na próxima vez que o servidor publicar.
- `voltarAoLocal` (`src/nuvem.ts:145-150`) não tira o `direto`. É inofensivo: sem `sala`, o `direto` não é lido.
- O toque da roleta usando `e.timeStamp` em vez de `performance.now()` (ideia no backlog).
