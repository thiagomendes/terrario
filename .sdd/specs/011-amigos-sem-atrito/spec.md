---
id: 011-amigos-sem-atrito
title: 'Amigos sem atrito: o mundo já nasce para jogar junto, e entrar é um toque'
status: IN_PROGRESS
base_branch: main
branch: feat/amigos-sem-atrito-2
created_at: 2026-11-07T15:30:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
environment: docker
full_test_command: npx vitest run && scripts/e2e-gpu.sh
install_command: npm ci --no-audit --no-fund
---
## Contexto e problema
A spec 010 pôs o multiplayer no ar e ele funciona: o servidor aguenta folgado e as duas
sessões de teste em família (6 e 7 nov) rodaram sem erro. O caminho até jogar junto, porém,
está confuso:
- **Para quem cria:**
  1. criar o mundo;
  2. entrar nele;
  3. abrir a pausa;
  4. tocar em "Jogar com amigos";
  5. esperar o jogo ir para outra tela;
  6. só então ver o código.
- **Para quem entra:** colar o código e, já no mundo, ainda apertar "Jogar" numa tela de título que mostra o nome de outro mundo.
- **O apelido do dono:** saiu como "Jogador" nas duas sessões, porque é pedido numa caixinha do navegador que some fácil.

## Objetivo
Jogar com amigos vira uma escolha do mundo, feita na hora de criar:
- quem cria marca "Jogar com amigos" e, ao entrar no mundo, o convite já está na tela;
- quem recebe o código ou o link entra direto no jogo;
- um mundo que já existe pode passar a ser com amigos, ou deixar de ser, pelas configurações dele.

## Fora de escopo (desta etapa)
- Contas e login (vem numa spec própria; aqui continua o apelido por aparelho).
- Frases prontas e emojis (convivência).
- Contas de jogador (conversa depois desta spec).

## Experiência
- **Criar mundo:** o painel de mundo novo ganha a opção **"Jogar com amigos"**, desligada por
  padrão (o mundo fica só no aparelho, como hoje).
  - Ligada, aparece logo abaixo o campo **"Seu nome para os amigos"**, já preenchido se o aparelho tem
    um apelido.
  - "Criar" leva o mundo direto para a nuvem (sem a passagem pelo aparelho) e entra nele.
- **Convite dentro do mundo:** na primeira entrada de quem criou, um cartão aparece sobre o
  mundo, já carregado atrás. Ele mostra:
  - o código grande;
  - o QR Code;
  - "Copiar convite" e "Compartilhar" (o compartilhamento do próprio celular, como WhatsApp);
  - a lista de **quem está no mundo**, ao vivo: "Esperando os amigos…" até alguém chegar, e cada um que chega aparece com um brilho.

  "Começar a jogar" fecha o cartão.
- **Amigos sempre à mão:** um botão fixo e discreto no canto da tela mostra quantos estão no
  mundo e reabre o mesmo cartão (convite, lista, poderes do dono). A pausa tem
  "Convidar amigos" no mesmo lugar de hoje.
- **Entrar com código:** uma tela só, com o código e o "Seu nome" no mesmo lugar, e o botão
  **"Entrar"**. Depois do toque, a criança está jogando: sem tela de título no meio e sem
  segundo "Jogar". O toque em "Entrar" já vale para liberar o som do navegador.
- **Entrar pelo link ou pelo QR:** abre uma tela **"Entrar no mundo de Ana"**, com o nome do
  mundo, o tema (a cor e a arte do tema) e quem já está lá. Tem o campo "Seu nome" (lembrado para
  a próxima vez) e um botão "Entrar". Um toque e está jogando.
- **Mundo que já existe:** nas configurações do mundo (lista de mundos e pausa):
  - **"Jogar com amigos" ligado:** leva o mundo para a nuvem, como hoje, mas com o cartão de convite aparecendo já no mundo, sem trocar de tela.
  - **"Parar de jogar com amigos" (só o dono):** pede confirmação, traz o mundo de volta inteiro para o aparelho e apaga o código. Quem estava no mundo recebe uma mensagem gentil.
- **Lista de mundos:** mostra o selo "com amigos" e o código nos mundos da nuvem. Abrir um
  deles entra direto, como pelo link.
- **Nomes:** nunca mais "Jogador". O nome é pedido na própria tela (criar ou entrar). Se ficar vazio, o jogo sugere um nome do tema, por exemplo "Explorador Lunar", que a criança pode trocar.

## Capricho na experiência (para não frustrar)
- **Poucos toques, medidos no e2e:**
  - do "Criar" com "Jogar com amigos" ligado até o código na tela: **no máximo 1 toque e menos de 5 s**;
  - do link ou QR até jogando: **1 toque** ("Entrar") **e menos de 8 s**;
  - do "Entrar com código" na tela de título até jogando: **digitar o código e 1 toque**.
- **O convite não atrapalha:** o mundo já aparece atrás do cartão, e o cartão some sozinho
  quando o primeiro amigo chega e o dono toca em qualquer lugar fora dele.
- **Mensagens claras** em cada passo que pode dar errado:
  - código que não existe;
  - mundo cheio;
  - sem internet;
  - mundo fechado pelo dono.

  O texto é o mesmo de hoje, na tela em que a criança está, nunca numa tela nova vazia.
- **Nada técnico na tela**, como hoje.
- **Teste em família no fim:** uma rodada de 15 minutos em dois aparelhos (o critério 13 da 010 entra aqui), com relato e correções.

## Critérios de qualidade (definição de pronto)
1. **Criar com amigos (e2e):** criar mundo com "Jogar com amigos" ligado mostra o cartão com código e QR no mundo, sem tela intermediária, em menos de 5 s. O mundo aparece na lista com o selo.
2. **Entrar pelo link (e2e):** 1 toque até jogando, em menos de 8 s. O apelido digitado aparece para o dono e fica lembrado.
3. **Entrar com código (e2e):** sem segundo "Jogar"; o som funciona depois do toque.
4. **Mundo existente:** ligar "Jogar com amigos" pelas configurações leva o mundo para a nuvem igualzinho (blocos, baús, inventário). "Parar de jogar com amigos" traz de volta tudo, inclusive o que os amigos construíram, e o código antigo deixa de valer.
5. **Lista ao vivo:** quem entra e sai aparece no cartão e no botão de amigos em até 1 s.
6. **Nomes:** nenhum jogador aparece como "Jogador"; nome vazio vira o sugerido do tema.
7. **Toque e teclado:** tudo funciona com mouse, teclado e toque, com alvos de 44 px ou mais. Capturas no computador e no celular nos 6 temas.
8. **Nada quebra:** mundos locais e mundos da nuvem antigos continuam abrindo; todos os testes anteriores passam.
9. **Rodada em família:** 15 minutos em dois aparelhos no site publicado.
10. **Auditoria independente** ao fim, com os achados corrigidos.

## Decisões de implementação (7 nov 2026, ao começar)
Aprovada pelo dono ("pode mandar ver na próxima spec"), depois da 012. O que muda em relação ao rascunho:
- **Visual:** todas as telas novas seguem o brinquedo da 012 (cartão creme, botões-peça, diálogo de brinquedo). O apelido já sai do diálogo de brinquedo desde a 012; aqui ele vai para dentro das próprias telas.
- **Prévia do mundo pelo link:** o servidor ganha um endereço só de leitura, `GET /previa/<código>`, que devolve o nome do mundo, o tema, o apelido do dono e quem está lá (nada de chave nem de id). Ele tem o mesmo limite de tentativas do "entrar".
- **Parar de jogar com amigos:** pedido do dono `{ t: 'dono', acao: 'devolver' }`. O servidor:
  1. grava o mundo;
  2. monta os dados do mundo como no aparelho (blocos, baús, criaturas e o inventário, a vida e o diário do dono);
  3. manda esses dados ao dono;
  4. avisa os outros com uma mensagem gentil;
  5. apaga o código.

  O navegador grava tudo no mundo do aparelho e abre o mundo.
- **Som depois do "Entrar":** o toque em "Entrar" acontece antes de a página do mundo abrir. No Chrome, o som costuma valer depois de um toque no mesmo site; onde não valer (iPhone), o primeiro toque no jogo libera o som, como hoje. Isso fica medido no e2e e anotado no relatório.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Painel de mundo novo: "Jogar com amigos" e "Seu nome"; criar direto na nuvem |
| T02 | Cartão de convite dentro do mundo (código, QR, copiar, compartilhar, lista ao vivo) e botão fixo de amigos |
| T03 | Entrada direta: tela "Entrar no mundo de…" pelo link/QR e "Entrar com código" sem tela de título |
| T04 | Configurações do mundo: ligar e parar de jogar com amigos (servidor devolve o mundo inteiro ao dono) |
| T05 | Nomes sugeridos por tema; fim da caixinha do navegador |
| T06 | e2e dos fluxos com tempos e toques medidos; capturas nos 6 temas |
| T07 | Rodada em família, auditoria e relatório visual |
| T08 | Celular em pé com mais tela (pedido do dono em 7 nov, durante a 011): as informações do canto esquerdo de cima (personagem, clima, missão) viram ícones que abrem os detalhes num toque, ou um menu que abre e fecha; o joystick e os botões importantes continuam sempre à mão |

## Riscos
- **Áudio no navegador:** sem um toque, o navegador não toca som. Por isso todo fluxo de
  entrada termina num botão ("Entrar", "Começar a jogar"), que serve de gesto.
- **Parar de compartilhar** com amigos jogando: o servidor avisa todos, grava, devolve o
  mundo ao dono e só então fecha a sala.

## Andamento (7 nov 2026, publicado em d81a9aa)
- [x] T01 Mundo novo com amigos: do "Criar" até o código na tela em 3,1 a 3,5 s (critério 1: menos de 5 s).
- [x] T02 Convite no mundo, com o mundo já carregado atrás: "Esperando os amigos…", quem chega brilha e "Começar a jogar". Botão fixo com quantos estão no mundo; a pausa tem "Convidar amigos".
- [x] T03 Pelo link: "Entrar no mundo de Ana", com o tema e quem está lá; do "Entrar" até jogando em 4,0 a 4,6 s, com o som já ligado (critério 2: menos de 8 s). O código digitado entra direto, sem segundo "Jogar" (critério 3).
- [x] T04 Parar de jogar com amigos: o mundo volta inteiro para o aparelho, com a construção dos amigos. O código morre, e quem estava recebe uma despedida gentil. Se o dono cair no meio, recebe o mundo ao voltar (critério 4).
- [x] T05 Nomes: nunca mais "Jogador". O nome vazio vira o personagem mais o tema, como "Aventureiro Lunar" (critério 6).
- [x] T06 e2e com toques e tempos medidos (`e2e/amigos-sem-atrito.spec.ts`), capturas nos 6 temas no computador e no celular, alvos de 44 px.
- [x] Auditoria independente: 17 achados; os de gravidade alta e média estão corrigidos (critério 10).
- [x] T08 Celular em pé: as informações da esquerda recolhem num botão.
- [ ] T07 Rodada em família de 15 minutos em dois aparelhos, no site publicado (critério 9). Depende do dono.
- [ ] Relatório visual da spec, ao fechar.

**Ficou de fora, anotado:**
- Ligar e parar "Jogar com amigos" pela lista de mundos: hoje é pelo cartão de amigos e pela pausa.
- No "Entrar com código", o som depende do primeiro toque no jogo (no iPhone, o navegador exige isso).

