---
id: 035-entrada-na-nuvem
title: 'Entrada na nuvem: quem cria o mundo vê o amigo, e quem joga com amigos consegue abrir outro mundo'
status: DONE
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

**Achados na escrita e na revisão desta spec, que o dono pôs dentro dela:**
- quem volta de uma queda não vê os blocos que os amigos mudaram enquanto estava fora;
- com a sala fechada pelo dono, o visitante que cai é barrado na volta.

O conserto mínimo do defeito 1 já entrou na 034. Esta spec faz o conserto completo, conserta o defeito 2 e os dois achados, e responde sobre a queda 1005.

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

**O mesmo travamento por outro caminho: o buraco na sequência.**
- O núcleo conta o passo antes de fazer o resto dele: `n++` é a primeira linha de `passo` (`src/nucleo/nucleo.ts:2819`).
- No servidor, um erro no meio do passo ou na montagem dos quadros cai num `catch` que só registra (`servidor/src/salas.ts:817-833`).
- Nesse passo o número já subiu e nenhum quadro sai: **a sala inteira fica com um número sem quadro**.
- Quem já tinha o `primeiro` espera esse número para sempre (`src/cliente/estado.ts:147`). Todo quadro seguinte vai para `adiantados`, e o cliente trava igual.

**A conexão morta sem aviso.**
- O servidor não tem ping/pong, nem o navegador.
- Uma conexão que morre sem aviso (o celular troca de antena, o roteador cai) pode ficar minutos sem disparar o `onclose` (`src/cliente/conexaoNuvem.ts:167`).
- Nesse tempo não chega quadro nenhum e a reconexão não começa: a criança fica parada com o mundo congelado.

**O que já entrou na 034** (e7027fb, 1fb86a4):
- A lista do aparelho é lida antes de conectar (`src/main.ts:119-120`). Entre o bem-vindo (`src/main.ts:130`) e `criarCena` (`src/main.ts:300`) nada espera, fora os esboços.
- Se a leitura falhar, a entrada segue sem a lista (`.catch(() => [])`, 1fb86a4).
- **O teste dele** (`tests/cliente/entradaNuvem.test.ts`) só procura `await` no texto do `main.ts`. Ele não vê um `.then` ou um `setTimeout`, nem as esperas de `src/nuvem.ts` (`conectar`, `entrarNaSala`, `entrarPeloLink`).
- **A janela que sobra:** os `import()` dos esboços (`src/main.ts:233-241`) reabririam a espera se `?esboco=` viesse junto de `?sala=`.
- `referencia/levar-a-nuvem.ts` copia a ordem do `main.ts` com um IndexedDB de mentira: "agora" (antes da 034) perde a Bia em até 16 de 16 rodadas; "antes" (o conserto) vê em 64 de 64. Ela prova o princípio, mas não roda o `main.ts`.

**O que a conexão e o estado já fazem bem:**
- A conexão reconecta sozinha quando o `onclose` chega, com espera crescente de 0,5 s a 8 s (`src/cliente/conexaoNuvem.ts:55`, `:167-175`).
- Mensagem de uma conexão velha é ignorada (`:121`, `:168`).
- Ao voltar, o servidor recomeça os quadros de quem voltou com um `primeiro` novo (`servidor/src/salas.ts:492`, `src/nucleo/nucleo.ts:3150-3162`).
- A página zera a sequência ao voltar (`src/nuvem.ts:540-543`, `cena.reconferir()` em `src/cliente/estado.ts:204-213`) e avisa "Voltamos! A conexão está de pé de novo."
- Durante a queda aparece o aviso "A internet caiu. Reconectando…" (`src/ui/amigos.ts:583-588`).
- **O servidor local** (Web Worker) não tem a corrida: o worker é criado e ouvido na mesma tarefa (`src/cliente/conexao.ts:15-31`, chamado em `src/render/cena.ts:1334-1346`).
- **Cuidado para o conserto:** o `aoQuadro` da cena usa `cliente.ambiente` (`src/render/cena.ts:1370`), e `cliente` só existe depois que `criarEstadoCliente` volta. Entregar a fila dentro do próprio `aoReceber` quebraria a cena.

### Os blocos mudados durante a queda
- O `primeiro` novo de quem volta não manda os blocos de novo: `reiniciarQuadros` marca o inventário, o baú, a sobrevivência, os donos e as missões, mas não os blocos (`src/nucleo/nucleo.ts:3150-3162`).
- O bem-vindo de cada volta traz as edições e os donos do mundo inteiro (`servidor/src/salas.ts:527-545`), mas a página só os lê na entrada (`dadosDaSala`, `src/nuvem.ts:375-408`). Na volta, a conexão só resolve o `pronta` uma vez (`src/cliente/conexaoNuvem.ts:139`) e ninguém mais olha o bem-vindo.
- **Resultado:** um bloco que o pai põe ou tira enquanto o filho está fora não aparece para o filho, nem depois que ele volta, até sair e entrar de novo.
- Uma edição também pode sair, quando a célula volta ao terreno gerado (`remover`, `src/world/edicoes.ts:246-255`).

### A sala fechada que barra quem cai
- Em `entrar` (`servidor/src/salas.ts:474-475`), a sala fechada recusa quem não é dono **antes** de ver se ele já estava na sala:
  - `if (s.sala.fechado && !ehDono) return recusar('fechado');`
  - `const ja = s.presentes.get(jog.id);`
- O visitante que cai depois de o dono fechar a sala é recusado na volta e vê a tela "Não deu para voltar".
- Com a rede de segurança desta spec, uma ressincronização do visitante teria o mesmo fim.

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
- **Na lista, dentro da nuvem,** o mundo do aparelho que foi para esta sala mostra "Jogar", não "Continuar" (`src/ui/mundos.ts:437-440`): `op.atual` é o mundo da nuvem (`nuvem:<id>`, `src/nuvem.ts:380`), com outro id.

### A queda 1005 (conclusão: inofensiva, é o registro que engana)
- **O que é o 1005:** o código que o servidor recebe quando a conexão fecha sem que ninguém diga o código ("sem código").
- **Quem fecha sem código, do lado do navegador:**
  - `conexaoNuvem.encerrar()` chama `ws?.close()` sem código (`src/cliente/conexaoNuvem.ts:203`);
  - ao levar o mundo para a nuvem, `subirParaNuvem` cria a sala numa conexão, grava o código no aparelho, chama `encerrar()` e só então vai para `?sala=` (`src/nuvem.ts:787-791`).
- **Quem fecha sem código, do lado do servidor** (`canal.fechar()` é `ws.close()`, `servidor/src/index.ts:111`), todos de propósito:
  - a recusa (`servidor/src/salas.ts:419`);
  - a sala apagada, que encerra quem está nela (`:234`);
  - o "substituído", a mesma criança em outra aba (`:485-486`);
  - o expulso (`:569`);
  - os outros, quando o dono leva o mundo de volta para o aparelho (`:635`), e o próprio dono depois (`:643`);
  - a despedida de quem ficou fora tempo demais (`:742`).
- **O que o servidor registra:** tudo o que não é 1000 ou 1001 entra como "conexão caiu (código …, depois de N s)" (`servidor/src/index.ts:135-138`).
- **O "voltou meio segundo depois"** é a página nova, `?sala=`, entrando pelo código.
- **Conclusão:** não é queda. É a conexão de criar a sala, fechada de propósito. A sequência bate com o que se viu: a troca de `?mundo=` para `?sala=`, um 1005 de uma conexão de poucos segundos e a volta em meio segundo.
- **Nada se perde nela:**
  - o jogador fica na sala esperando voltar (`servidor/src/salas.ts:704-714`);
  - a página nova é o mesmo jogador e recebe um `primeiro` novo (`:492`).
- **Por que vale um ajuste pequeno:** com o 1005 de propósito misturado às quedas de verdade, o registro não mostra se as crianças estão caindo. O ajuste está em "O que muda", seção 6.

## Decisões do dono
**20 nov 2026:**
- Corrigir logo depois da 034, sem misturar as duas.
- O defeito 2 (preso no mundo da nuvem) entra nesta spec.
- A "Queda curta da conexão" do backlog é conferida nesta spec.
- **As duas perguntas, respondidas pelas recomendadas** ("Concordo com suas recomendações"):
  - enquanto o jogo se reacerta, a criança não vê nada novo: os amigos simplesmente aparecem (sem o aviso "A internet caiu", que seria falso, e sem o "Voltamos!");
  - se não se acertar depois das tentativas, a página recarrega uma vez sozinha e entra direto no mesmo mundo, nunca mais de uma vez por mundo em 10 min.
- **Os blocos que os amigos mudam durante a queda entram na 035:**
  - a cada bem-vindo depois do primeiro, o cliente aplica a diferença das edições e dos donos;
  - é uma fase própria, só no cliente;
  - começa provada por um teste no Node, como a corrida.
  - A ressincronização não perde os blocos dos `adiantados` jogados fora: o bem-vindo novo traz o estado.
- **A sala fechada que barra o visitante na volta entra na 035:**
  - a linha do servidor, com teste;
  - o servidor publica, e o protocolo não muda.

## O que muda
**Não muda o protocolo:**
- nenhuma mensagem nova e nenhum campo novo;
- `VERSAO_REDE` fica 17.

**O servidor muda uma linha** (seção 4) e publica antes do site, pelo `servidor.yml` (ver a T07).
- **O cliente novo funciona com o servidor antigo:** a fila, a rede de segurança, os blocos da volta e o endereço são só do navegador. Enquanto o servidor antigo está no ar, só a sala fechada continua barrando quem cai, como hoje.
- **O cliente antigo funciona com o servidor novo:** a linha só deixa entrar quem antes era barrado.

### 1. A conexão não perde mensagem
Em `src/cliente/conexaoNuvem.ts`:
- **A fila:** enquanto ninguém ouve (`ouvintes` vazio), as mensagens do núcleo (quadro, salvo, erro) entram numa fila, em vez de sumir (`:165`).
- **A entrega:**
  - o primeiro `aoReceber` recebe a fila inteira, em ordem;
  - a entrega é logo depois que o `aoReceber` volta (`queueMicrotask`), nunca dentro dele: a cena precisa de `cliente` pronto (`src/render/cena.ts:1370`);
  - mensagem que chega enquanto a fila não esvaziou vai para o fim dela: a ordem nunca troca;
  - cada mensagem é entregue num `try/catch` próprio, com `console.error`: um erro numa não para as outras;
  - o laço relê o tamanho da fila a cada volta, porque um `encerrar()` no meio pode esvaziá-la.
- **O teto da fila:** 200 mensagens (10 s de quadros). Passando disso, sai a mais antiga.
  - Isso protege as conexões que nunca ouvem quadros, como a de criar a sala (`src/nuvem.ts:771`) e a de parar de jogar com amigos (`src/nuvem.ts:715`, até 45 s aberta).
  - Se o teto cortar o `primeiro`, a rede de segurança da seção 2 acerta.
- **`encerrar()`** esvazia a fila.
- O que já vale fica igual: as mensagens da sala (bem-vindo, sala, devolvido, recusas) e as de uma conexão velha.
- **Os esboços** (`src/main.ts:233-241`) deixam de ser perigo: com a fila, uma espera entre o bem-vindo e a cena não perde nada.

### 2. A rede de segurança: o estado do cliente não trava para sempre
Em `src/cliente/estado.ts`.

**Só quando a conexão sabe ressincronizar.** Na interface `Conexao` (`src/cliente/conexao.ts:8-12`) entra `ressincronizar?()`, opcional.
- Sem ela (o servidor local, o canal dos testes do protocolo em `tests/nucleo/canal.test.ts`), o estado não mede nem dispara nada.
- O servidor local não tem a corrida, e um teste com o canal ruim (atraso e ordem trocada) não pode ressincronizar.

**Ao receber um `primeiro`,** os `adiantados` de número menor saem (`src/cliente/estado.ts:145`): sobras de antes não ficam presas no mapa.

**Dois jeitos de travar, uma resposta só.**
- **Quadros chegam e nenhum é aplicado:**
  - a medida é feita a cada quadro que chega, depois de aplicar o que der;
  - o tempo conta desde o último quadro aplicado, a criação do estado ou o último `reconferir`, o que for mais recente;
  - dispara com **1 s** sem aplicar e pelo menos **10 quadros** esperando em `adiantados`;
  - cobre o `primeiro` perdido e o buraco na sequência.
- **Silêncio: nenhum quadro chega:**
  - um relógio de 1 s confere: sem nenhum quadro por **4 s**, com `document.visibilityState === 'visible'`, dispara;
  - **só com a conexão em `'conectado'`:** durante `'conectando'`, `'reconectando'` ou `'ressincronizando'` o vigia não age (quem cuida é a conexão);
  - **só depois do primeiro quadro aplicado:** na entrada, antes disso, o silêncio não conta;
  - a contagem recomeça quando a página volta a ficar visível: em segundo plano o navegador segura a página e o silêncio é dele;
  - **a contagem recomeça se passarem mais de 2 s entre duas voltas do próprio relógio:** num celular lento, montando o terreno, a página fica ocupada e os quadros esperam na fila do navegador; esse silêncio é da página, não da rede;
  - cobre a conexão morta sem aviso, que não dispara o `onclose` por minutos.
- **Por que esses números:**
  - **Numa conexão boa nada disso acontece:**
    - o WebSocket entrega em ordem;
    - o primeiro quadro de cada conexão é o `primeiro`;
    - com a fila da seção 1, ele não se perde;
    - o servidor manda 20 quadros por segundo.
  - **No celular pela internet:** a rede às vezes para alguns segundos e depois entrega tudo de uma vez. Os quadros chegam em ordem e são aplicados na hora, então não contam como travados.
  - **10 quadros** são meio segundo do servidor: um tropeço de um quadro não dispara nada.
  - **1 s** fica abaixo do que a criança nota: na entrada, a tela "Entrando…" ainda está na frente enquanto o terreno é montado. Somado à volta da conexão (uma ida e volta, mais o bem-vindo), a criança fica no máximo uns 2 s sem os amigos.
  - **4 s de silêncio** ficam bem acima de uma parada comum da rede do celular e bem abaixo dos minutos de uma conexão morta.

**O que faz: ressincroniza.** Fecha a conexão e abre outra na hora, com um bem-vindo e um `primeiro` novos do servidor.
- **O estado** zera a sua sequência (`proximoQuadro = -1`, `adiantados` vazio) e pede de volta as células ainda previstas, como no `reconferir` (`src/cliente/estado.ts:204-213`).
- **Os blocos dos `adiantados` jogados fora não se perdem:** o bem-vindo novo traz o mundo como está, e a seção 3 aplica a diferença.
- **Na `conexaoNuvem`,** `ressincronizar()`:
  - troca o `ws` (ou solta os ouvintes da conexão velha) **antes** de fechar a velha: assim o `onclose` dela não agenda uma reconexão a mais (`:167-175`);
  - fecha a velha com o código 4001 ("ressincronizar"), que o registro do servidor mostra (seção 6);
  - abre outra na hora, sem a espera da reconexão;
  - passa por `'ressincronizando'` e volta a `'conectado'` no bem-vindo;
  - os comandos do meio esperam na fila de guardados, como numa queda (`src/cliente/conexaoNuvem.ts:87-101`);
  - se a conexão nova não abrir, vale a reconexão de sempre, com o aviso de sempre: aí a internet caiu mesmo;
  - **se `'ressincronizando'` passar 5 s sem bem-vindo,** a conexão vira `'reconectando'`, com o aviso de sempre e a reconexão de sempre: com a internet morta, a criança não fica num laço calado.
- **Em `src/nuvem.ts:537-553`:** `'ressincronizando'` não mostra o aviso de queda nem o "Voltamos!" (decisão do dono).

**Sem laço de reconexão:**
- no máximo **2 ressincronizações** por página: a primeira na hora, a segunda só se travar de novo depois de pelo menos **3 s**;
- a conta volta a zero depois de **60 s** com os quadros andando;
- **depois da segunda, a página recarrega uma vez** (decisão do dono):
  - antes, manda o `guardar` com o diário e o mapa (`src/nuvem.ts:555`);
  - recarrega direto no mesmo mundo, com `direto=1` (quem entrou pelo link não vê o cartão de novo);
  - uma marca em `sessionStorage` por código de sala impede um segundo recarregar em 10 min;
  - **se o `sessionStorage` não abrir ou der erro, não recarrega:** sem a marca, não há como garantir que não vira laço;
  - com a marca de pé (ou sem `sessionStorage`), para de tentar e o jogo segue como está.
- **O recarregar só vem do travamento com a conexão de pé (quadros chegando e nenhum aplicado). O silêncio só leva a ressincronizar, com conta própria, fora das 2 do travamento, e no máximo uma vez a cada 30 s; ele nunca leva a recarregar.**
- **O pior caso, seguido:** 2 ressincronizações, 1 recarregar e mais 2 ressincronizações na página nova: **4 ressincronizações e 1 recarregar em 10 min**, pelo travamento. O silêncio soma no máximo uma ressincronização a cada 30 s, e só com a conexão de pé.
- A espera da reconexão de sempre (0,5 s a 8 s) continua valendo se a internet cair de verdade.
- **O limite do servidor por endereço:** um código válido também é barrado com `limite` se o endereço já juntou 20 tentativas erradas na janela (`servidor/src/salas.ts:446`, `TENTATIVAS` em `:59`). A volta pelo código certo conta e é descontada na hora (`:448`, `:468`), então as ressincronizações não enchem essa conta.
- **A queda de verdade não confunde a conta:** o `reconferir` da volta (`src/nuvem.ts:542`) também zera a medida do travamento.

**Para os testes:**
- um relógio que o teste pode trocar (`agora?: () => number` nas opções do estado);
- o número de ressincronizações no `window.__brumaluz` (`src/render/cena.ts:1109`).

### 3. Os blocos da volta
Só no cliente.
- **A conexão avisa cada bem-vindo depois do primeiro** (um `aoBemVindo` novo em `conexaoNuvem`):
  - dentro do mesmo tratamento do bem-vindo, antes de qualquer quadro da conexão nova;
  - não vale para a sala reaberta, que recarrega a página (`src/cliente/conexaoNuvem.ts:140-143`).
- **A página aplica a diferença** (em `src/nuvem.ts`, ligando o `aoBemVindo` à cena):
  - primeiro os donos: a tabela do bem-vindo é importada antes dos blocos, porque os blocos apontam para ela;
  - célula com valor diferente no bem-vindo: aplica o valor de lá;
  - célula editada aqui que não está no bem-vindo: a edição sai (`remover`) e a célula volta ao terreno gerado;
  - célula com previsão local ainda não confirmada: fica, e o `reconferir` resolve;
  - só as células que mudaram refazem a malha.
- **A conta da diferença** é uma função pura em `src/cliente/` (e não em `src/world/`, para o servidor não publicar por ela), com teste de unidade.
- **Na ressincronização e numa queda de verdade é igual:** os dois passam por um bem-vindo novo.

### 4. A sala fechada não barra quem já estava nela
- Em `servidor/src/salas.ts:474-475`: o `ja` vem antes, e a recusa vira `fechado && !ehDono && !ja`.
- Quem estava na sala e caiu volta, com a sala fechada ou não. Quem chega de novo continua barrado.
- **Vale só dentro da `TOLERANCIA_QUEDA`, de 30 s** (`servidor/src/salas.ts:53`): depois disso o servidor despede quem caiu (`:870`), ele sai de `presentes` e, com a sala fechada, volta a ser barrado como quem chega de novo.
- Um teste em `servidor/testes/salas.test.ts`: o dono fecha a sala; o visitante cai e volta **antes dos 30 s**; ele entra. Um terceiro que nunca entrou é recusado.
- É a única linha do servidor nesta spec.

### 5. Sair do mundo da nuvem para um mundo do aparelho
- **A função:** abrir um mundo do aparelho tira `sala`, `novo` e `direto` do endereço, além do `tema`, e põe `mundo`.
  - Ela fica numa função pequena e sem DOM, com teste de unidade (`enderecoDoMundo(href, id)`, em `src/pagina.ts`).
  - O resto do endereço fica como está: os testes e as capturas usam parâmetros próprios.
- **Onde:** `abrirMundo` (`src/main.ts:221-228`) usa essa função. `abrirMundoDoAparelho` (`src/nuvem.ts:632-637`) fica como está: ele já zera tudo.
- **O mundo que foi para a nuvem continua abrindo na nuvem:** "Jogar" nele leva ao `?mundo=` e dali à sala (`src/main.ts:142`).
- **"Continuar" no mundo desta sala:** dentro da nuvem, o mundo da lista cujo `nuvem` é o código da sala aberta (o de agora, que o dono pode ter trocado) mostra "Continuar" e só fecha a lista (`src/ui/mundos.ts:437-440`).

### 6. O registro da queda 1005
- `encerrar()` fecha com o código 1000 ("saiu normalmente"): `ws?.close(1000)` em `src/cliente/conexaoNuvem.ts:203`.
- A conexão de criar a sala deixa de aparecer como queda no registro.
- **Os fechamentos do servidor continuam sem código** (a lista em "O que existia"): eles ficam fora (ver "Fora desta spec"), para que a única mudança do servidor seja a da sala fechada.
- **A ressincronização (4001) aparece no registro** como "conexão caiu (código 4001…)". Assim dá para ver no ar se a rede de segurança dispara.

### 7. Testes
**Unidade:**
- **A corrida com o servidor de verdade:** `referencia/corrida.ts` vira `tests/cliente/corridaNuvem.test.ts`:
  - com o servidor real (`criarGerenciador`, `armazemMemoria`), a Vila Neon, a conexão e o estado reais;
  - a espera entre o bem-vindo e o estado: 0 ms, uma tarefa, 120 ms, 500 ms e 2 s;
  - em todas, o filho aplica quadros, vê o pai e o pai vê o filho;
  - em todas, **0 ressincronizações**: a fila resolve sozinha;
  - **falha antes do conserto** (com 120 ms, 0 quadros) e passa depois;
  - a ida para a nuvem como no jogo: a conexão de criar fecha e a página nova entra pelo código;
  - uma rodada na suíte; 3 rodadas com uma variável de ambiente (ex.: `CORRIDA_RODADAS=3`).
- **Os blocos da volta, com o servidor de verdade** (`tests/cliente/blocosDaVolta.test.ts`, como a corrida):
  - o pai põe um bloco e tira outro com o filho fora (a conexão do filho caída);
  - o filho volta: tem o bloco posto e não tem o tirado, com o dono certo;
  - **falha antes do conserto:** o filho volta sem o bloco;
  - o mesmo com uma ressincronização no lugar da queda.
- **O teste de comportamento substitui `tests/cliente/entradaNuvem.test.ts`** (o teste de texto sai):
  - a conexão com o WebSocket de mentira (o de `tests/cliente/conexaoNuvem.test.ts`): bem-vindo, `primeiro` e mais quadros chegam antes de alguém ouvir; o estado liga depois de uma espera qualquer (`await`, `.then`, `setTimeout`);
  - todos os quadros são aplicados em ordem, e o primeiro aplicado é o `primeiro`;
  - nada é entregue dentro do `aoReceber`;
  - quadros que chegam no meio da entrega da fila ficam na ordem;
  - um ouvinte que lança erro numa mensagem não para as seguintes;
  - um `encerrar()` no meio da entrega para o laço sem erro;
  - o teto de 200 e o `encerrar()` esvaziando a fila.
- **A rede de segurança** (`tests/cliente/estado.test.ts`, com o relógio trocado):
  - quadros sem `primeiro` por 1 s, com 10 ou mais esperando: ressincroniza uma vez;
  - um buraco na sequência depois do `primeiro`: também ressincroniza;
  - quadros parados por 5 s e depois todos de uma vez, em ordem: não ressincroniza;
  - silêncio de 4 s com a página visível: ressincroniza; com a página escondida, não; voltou a ficar visível, conta de novo do zero;
  - o silêncio não dispara durante `'ressincronizando'`, nem antes do primeiro quadro aplicado;
  - com o relógio trocado, um intervalo de mais de 2 s entre duas voltas do vigia recomeça a contagem;
  - dois silêncios seguidos não recarregam e não gastam a conta do travamento; o segundo só depois de 30 s;
  - travou de novo antes de 3 s: espera; depois de 3 s: a segunda;
  - depois da segunda: manda o `guardar` e recarrega uma vez; com a marca de pé, não recarrega; com o `sessionStorage` dando erro, não recarrega;
  - 60 s com os quadros andando: a conta volta a zero;
  - um `primeiro` apaga os `adiantados` de número menor;
  - **com a conexão local** (o canal de `tests/nucleo/canal.test.ts`, com atraso e ordem trocada): nunca mede nem dispara.
- **A conexão:**
  - `ressincronizar()` fecha com 4001, abre outra na hora e passa por `'ressincronizando'`, sem `'reconectando'`;
  - um FalsoWS que nunca abre: o estado vira `'reconectando'` e o aviso de queda aparece em até 5 s;
  - o `onclose` da velha não agenda outra conexão: o FalsoWS conta exatamente 2 conexões abertas;
  - o que chega pela conexão velha é ignorado;
  - o `aoBemVindo` chega em cada bem-vindo depois do primeiro, antes dos quadros da conexão nova;
  - `encerrar()` fecha com 1000.
- **A diferença das edições:**
  - célula mudada, célula nova, edição que saiu, célula com previsão e a tabela de donos;
  - uma volta que não muda nada não muda nenhuma célula, na Vila Neon e na Cidade Grande (com as obras do canteiro);
  - o tempo da diferença medido num mundo com muitas edições, e escrito na Situação.
- **O endereço:** `enderecoDoMundo` com `?sala=X&direto=1`, `?sala=X`, `?sala=X&novo=1&direto=1`, `?tema=…` e um parâmetro de teste que tem de ficar.
- **O servidor:** a sala fechada da seção 4.

**E2e** (num arquivo novo, `e2e/entrada-nuvem.spec.ts`, com os ajudantes de `e2e/multiplayer.spec.ts`; o contador é lido com acesso opcional, `?.ressincronizacoes ?? 0`, para o teste rodar também no código de antes):
- **B. O primeiro quadro perdido:**
  - Ana leva o mundo para a nuvem; Bia entra pelo link com a Ana já na sala;
  - um script de início na página da Bia joga fora a primeira mensagem com `"primeiro":true`;
  - mede do mundo pronto da Bia até ela ver a Ana: **meta de até 3 s**; o total, do bem-vindo até ver a Ana, fica registrado (a montagem da cena vem antes e é a de qualquer entrada);
  - `ressincronizacoes === 1`;
  - o aviso de queda e o "Voltamos!" não aparecem em nenhum momento (conferidos o tempo todo, não só no fim);
  - **falha antes do conserto:** Bia nunca vê a Ana.
- **B, buraco:** o mesmo, mas o script joga fora um quadro do meio, depois do `primeiro`. Bia continua vendo a Ana andar, com 1 ressincronização.
- **B2. Nada se acerta:**
  - o script joga fora todo `primeiro`;
  - 2 ressincronizações, 1 recarregar;
  - depois do recarregar, mais 2 ressincronizações e nenhum segundo recarregar.
- **C. Sair da nuvem:**
  - Ana entra num mundo da nuvem (leva o dela, como no `multiplayer`);
  - na lista, o mundo dela mostra "Continuar";
  - dali, cria um mundo do Rancho Alegre ("Criar", "Jogar");
  - o endereço fica com `mundo=` e sem `sala`, `novo` ou `direto`;
  - o mundo que abre é o novo, do Rancho, sem conexão com a nuvem (sem o botão dos amigos);
  - depois, de volta à lista, "Jogar" num terceiro mundo do aparelho também abre ele;
  - **falha antes do conserto:** volta para a sala.
- **Nada de ressincronização à toa:** no `multiplayer` e nos e2e de amigos (`achar-amigo-nuvem`, `amigos-sem-atrito`, `vila-bate-amigos`, `vila-casa-amigos`), o contador fica em 0.

## Experiência medida
**O que a criança e o pai veem:**
- **Quem cria o mundo vê o amigo,** no computador e no celular, sempre:
  - no teste da corrida, com espera de 0 ms a 2 s entre o bem-vindo e a cena: o filho vê o pai em 5 de 5 esperas, 3 rodadas cada, sem nenhuma ressincronização.
- **Se o primeiro quadro se perder mesmo assim, ou faltar um no meio** (e2e B e B, buraco):
  - do mundo pronto da Bia até ela ver a Ana: até 3 s, medido e escrito na Situação;
  - o total, do bem-vindo até ver a Ana, fica registrado e comparado com a entrada normal (do link ao mundo pronto, de 3,3 a 6,2 s na máquina do dono): a montagem da cena é a mesma de qualquer entrada, e a rede de segurança soma uns 120 ms (decisão do orquestrador, 20 nov);
  - 1 ressincronização;
  - nenhuma tela, aviso ou texto novo (decisão do dono);
  - a criança não precisa fazer nada.
- **Se nada se acertar** (e2e B2): a página recarrega uma vez sozinha, com o diário e o mapa guardados antes, e nunca entra em laço.
- **Se a conexão morrer sem aviso:** com a página na frente, em até 4 s o jogo tenta de novo, em vez de ficar congelado por minutos.
- **Quem volta de uma queda vê o que os amigos construíram enquanto estava fora:** no teste dos blocos da volta, o bloco posto e o tirado, com o dono certo.
- **Com a sala fechada pelo dono, o amigo que caiu volta para ela.**
- **Quem está na nuvem abre outro mundo** (e2e C):
  - o toque em "Jogar" ou "Criar" abre o mundo escolhido, 3 de 3 rodadas;
  - nenhuma volta para a sala;
  - o mundo desta sala aparece como "Continuar".
- **Nada piora:**
  - na entrada normal, nenhuma ressincronização (o contador em 0 nos e2e de amigos);
  - a entrada pelo link e a reconexão de quando a internet cai continuam iguais: o aviso, o "Voltamos!" e o `multiplayer` verde.

**No servidor (o registro):**
- levar um mundo para a nuvem não registra mais "conexão caiu (código 1005)";
- uma ressincronização aparece como código 4001.
- **Depois de publicar,** o orquestrador leva um mundo para a nuvem pelo celular e confere no registro:
  - nenhum 1005 de quem levou o mundo (a conexão de criar, de poucos segundos: olhar o "depois de N s");
  - nenhum 4001.

**A suíte inteira:**
- Vitest;
- `npm run build`;
- paridade 36/36 (o estado do cliente mudou);
- o e2e inteiro em pedaços de 2 trabalhadores;
- o que cair, conferido contra a `main`.

**Fotos:** não há visual novo, então não há portão visual.

## Fora desta spec
- **A queda antes de a página ouvir o `aoBemVindo`:** se a conexão cair e voltar antes de `ligarAmigos` ligar o `aoBemVindo` (`src/main.ts:317`), os blocos mudados naquela janela se perdem. A janela é de milissegundos.
- **O relógio da rajada:** a fila entregue de uma vez aplica os quadros guardados com o horário da entrega, não o da chegada (`src/cliente/estado.ts:118-119`, veículos e Vila). Não é grave: os quadros seguintes acertam.
- **Os fechamentos do servidor com um código próprio** (a lista em "O que existia"): eles aparecem como 1005 no registro. Fica para uma próxima vez que o servidor publicar.
- `voltarAoLocal` (`src/nuvem.ts:145-150`) não tira o `direto`. É inofensivo: sem `sala`, o `direto` não é lido.
- O toque da roleta usando `e.timeStamp` em vez de `performance.now()` (ideia no backlog).
