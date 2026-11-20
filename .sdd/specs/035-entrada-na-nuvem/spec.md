---
id: 035-entrada-na-nuvem
title: 'Quem cria o mundo e chama um amigo não fica sem ver ninguém'
status: DRAFT
base_branch: main
created_at: 2026-11-20T17:00:00Z
---
## Contexto
O dono, em 20 nov 2026: o filho criou um mundo na Vila Neon e o levou para a nuvem; o pai entrou. **O pai via o filho, mas o filho não via ninguém** ("é como se não tivesse ninguém no jogo pra ele"). O filho saiu e entrou de novo, e aí funcionou. O dono pediu para corrigir logo depois da 034, sem misturar as duas.

## A causa (investigada e reproduzida no código da `main` 65b0a57)
- **Por onde entra o filho:** quem cria o mundo ou o leva para a nuvem entra pela página `?sala=…&novo=1&direto=1`.
- **A espera que só esse caminho tem:** entre o "bem-vindo" do servidor e a criação da cena há uma leitura do IndexedDB (`src/main.ts:176-182`, `repo.listar()` no ramo `nuvem.novo`).
- **O pacote perdido:** `src/cliente/conexaoNuvem.ts:165` entrega as mensagens só a quem já ouve (`for (const f of ouvintes)`), sem fila. O primeiro quadro (`primeiro: true`), que o servidor manda em até 50 ms depois do bem-vindo, chega antes de `criarEstadoCliente` ligar o `aoReceber` (`src/render/cena.ts:1340`) e se perde.
- **O travamento:** `src/cliente/estado.ts:142-153`. Sem o `primeiro`, `proximoQuadro` fica em -1, todo quadro vai para `adiantados` (que cresce sem fim) e nenhum é aplicado nunca mais. A física é local e os comandos seguem para o servidor, então o pai vê o filho andando. Já o filho não vê:
  - os outros jogadores;
  - os moradores e os bichos se mexendo;
  - a hora e o céu mudando;
  - os blocos dos outros;
  - o estado da Vila.
- **Por que só às vezes:** no computador o IndexedDB responde antes do quadro e o e2e passa. No celular, pela internet, o quadro muitas vezes já está na fila atrás do bem-vindo.
- **Reprodução:** `referencia/corrida.ts`. Usa o servidor real (`criarGerenciador` e `armazemMemoria`), a Vila Neon, o `conexaoNuvem` e o `criarEstadoCliente` reais, com um WebSocket de mentira que entrega cada mensagem como tarefa separada. Com atraso 0 ms o filho aplica 28 quadros e vê o pai; com 120 ms aplica 0 e não vê ninguém. Para rodar: `npx vite-node .sdd/specs/035-entrada-na-nuvem/referencia/corrida.ts`.

## O que já entrou na 034 (e7027fb)
- **O conserto mínimo:** a espera saiu do meio. Quem leva o mundo para a nuvem lê a lista do aparelho antes de conectar, e entre o bem-vindo e a cena nada espera. A linha de `src/main.ts` citada em "A causa" já não existe.
- **O teste dele:** `tests/cliente/entradaNuvem.test.ts` só procura texto no `main.ts`. Ele não cobre `src/nuvem.ts` (`conectar`, `entrarNaSala`, `entrarPeloLink`), nem um `.then` ou `setTimeout` antes de `criarCena`.
- **O que fica:** os `import()` dos esboços (`src/main.ts`) ainda reabririam a janela se `?esboco=` viesse junto de `?sala=`.
- **Nesta spec:** o teste de comportamento abaixo substitui esse teste de texto.
- **A reprodução:** `referencia/levar-a-nuvem.ts` copia a ordem do `main.ts`, mas não roda o arquivo. Ela prova o princípio.

## O segundo defeito: preso no mundo da nuvem (achado do dono, 20 nov)
- **O que acontece:**
  - quem entrou num mundo com amigos e tenta abrir outro mundo cai sempre de volta no mundo da nuvem;
  - isso vale para criar um mundo novo (ex.: Rancho Alegre, "Criar", "Jogar") e para escolher um da lista;
  - a criança nunca consegue sair daquele mundo.
- **A causa (lida no código, a reproduzir):**
  - `abrirMundo` em `src/main.ts` (perto da linha 221) põe `?mundo=<id>` no endereço, mas deixa o `?sala=` que já estava lá;
  - a página nova lê primeiro o `sala` (`src/main.ts`, perto da linha 108) e volta para a nuvem;
  - `abrirMundoDoAparelho` (`src/nuvem.ts`, perto da linha 632) e `irParaSala` limpam o endereço; o `abrirMundo` do `main.ts`, não.
- **O conserto:**
  - abrir um mundo do aparelho tira `sala`, `novo` e `direto` do endereço;
  - um e2e: entrar pela nuvem, criar um mundo do Rancho e conferir que ele abre.

## O que muda (a escrever e revisar quando a 034 for publicada)
- **Não perder mensagem:** `conexaoNuvem` guarda as mensagens até o primeiro `aoReceber` e entrega todas, em ordem, quando ele chega.
- **Rede de segurança:** se o estado do cliente ficar acumulando `adiantados` sem nenhum `primeiro` por mais de um tempo curto, ressincroniza (reconecta) em vez de ficar parado para sempre.
- **Testes:**
  - a reprodução vira teste de unidade (falha antes, passa depois);
  - o e2e `multiplayer` ganha uma variante com o IndexedDB ou o `repo.listar` da Ana atrasado.

## Fora desta spec
O toque da roleta usando `e.timeStamp` em vez de `performance.now()` (ideia no backlog).
