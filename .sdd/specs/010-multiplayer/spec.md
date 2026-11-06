---
id: 010-multiplayer
title: 'Multiplayer: mundos na nuvem com código, servidor no Brasil e jogadores sincronizados'
status: IN_PROGRESS
base_branch: feat/servidor-local
branch: feat/multiplayer
created_at: 2026-11-06T21:30:00Z
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
full_test_command: npx vitest run && npx playwright test
install_command: npm ci --no-audit --no-fund
---
## Contexto e problema
O Terrário está publicado em https://yellow-field-0d32c420f.5.azurestaticapps.net, só para um jogador e com os mundos guardados no aparelho. O dono quer que qualquer pessoa crie um mundo no site, receba um código e jogue junto com quem tiver o código. O mundo fica na nuvem, disponível mesmo com o dono desconectado. A spec 009 separa a simulação do desenho; esta spec põe a mesma simulação num servidor.

## Objetivo
- **Servidor:** um servidor Node na Azure, no Brasil, roda o núcleo da spec 009 como **dono do mundo**.
- **Clientes:** os navegadores mostram o mundo e mandam comandos.
- **Mesmo mundo para todos:** quem está no mundo vê o mesmo, ao mesmo tempo: blocos, baús, itens no chão, criaturas, moradores, dia, clima e os outros jogadores.
- **Persistência:** o mundo fica salvo num Storage Account e acorda quando alguém entra com o código.

## Fora de escopo (desta etapa)
- Contas e login (começa sem: apelido e identidade anônima por aparelho).
- Conversa por texto livre e frases rápidas (spec 011, convivência).
- Combate entre jogadores (PvP), lista pública de mundos e mais de 8 jogadores por mundo.
- Vários servidores ao mesmo tempo; um servidor guarda todas as salas nesta etapa.

## Experiência
- **Abrir para amigos:** no mundo, o dono toca em "Abrir para amigos". O jogo leva o mundo para a nuvem e mostra o **código**, um link e um QR Code.
  - Formato do código: duas palavras do tema e dois dígitos, por exemplo `LUA-COMETA-48`. É fácil de ditar para uma criança, com pelo menos 4 milhões de combinações.
  - Ao subir para a nuvem, o mundo local fica marcado como "na nuvem", e jogar nele passa a ser pelo servidor.
- **Criar já na nuvem:** na criação do mundo, a opção "Mundo para jogar com amigos".
- **Entrar com código:** botão na tela de título, campo grande com teclado próprio de palavras no celular, escolha do personagem e entrada. Pelo link ou QR Code, o código já vem preenchido.
- **Meus mundos na nuvem:** a lista de mundos mostra os mundos do aparelho e os da nuvem em que o jogador já entrou, com um selo.
- **Dono:**
  - expulsar alguém;
  - trocar o código, e o antigo deixa de valer;
  - fechar o mundo para visitas;
  - escolher se visitantes **constroem** ou **só passeiam**.

  O modo (criativo ou sobrevivência) é do mundo, igual para todos.
- **Outros jogadores:** aparecem com o personagem, o apelido acima da cabeça e as animações (andar, voar, minerar, item na mão). Aparecem também no minimapa e numa lista de quem está no mundo, com entrada e saída avisadas.
- **Sem internet ou servidor fora:** aviso claro, tentativa de reconexão automática e volta ao mesmo lugar. Os mundos locais continuam funcionando offline.
- **Identidade:** cada aparelho ganha um id anônimo e uma chave guardados no navegador, mais um apelido escolhido. Nenhum dado pessoal é pedido. O dono do mundo é o aparelho que o criou.

## Capricho na experiência (para não frustrar)
Jogar com amigos tem que parecer mágico desde o primeiro toque. Nenhuma espera sem explicação, nenhum erro técnico na tela e nenhum progresso perdido.
- **Convite gostoso de mandar:**
  - o código aparece grande, com as palavras do tema e um ícone de cada palavra (lua, cometa), para uma criança ler para outra;
  - botões de copiar, de compartilhar (WhatsApp e outros, pelo compartilhamento do próprio celular) e o QR Code para o outro apontar a câmera;
  - o link abre o jogo já entrando no mundo.
- **Entrada sem atrito:**
  - quem abre o link pela primeira vez escolhe apelido e personagem numa tela só, com o personagem do tema sugerido, e entra;
  - do toque no link até estar jogando: menos de 10 s com internet boa;
  - enquanto o mundo acorda, uma tela de carregamento com o nome do mundo, quem já está lá e o progresso real, nunca uma tela parada.
- **Chegada com festa:** quem entra aparece com um efeito de partículas do tema e um som de chegada, e os outros recebem um aviso amigável ("Maria chegou no mundo!"). Ao sair, um aviso suave.
- **Achar os amigos:** os amigos aparecem no minimapa com a cor de cada um, há uma seta na borda da tela apontando para quem está longe e um botão "ir até" no criativo.
- **Nunca brusco:**
  - correções do servidor são suaves, sem o jogador "puxado" para trás;
  - com conexão fraca, um ícone discreto, e o jogo segue;
  - se cair, um aviso calmo ("Reconectando…") com o mundo ainda visível atrás, e a volta ao mesmo lugar.
- **Mensagens para crianças:** nada de "erro 1006" ou "WebSocket". Exemplos:
  - "Esse código não existe. Confere com quem te mandou?";
  - "O mundo está cheio (8 amigos). Tenta daqui a pouco.";
  - "Você está sem internet, mas seus mundos do aparelho continuam aqui."
- **O dono no controle, com carinho:** expulsar pede confirmação e quem sai recebe uma mensagem gentil. Trocar o código mostra o novo na hora para compartilhar.
- **Primeira vez guiada:** na primeira abertura de "Abrir para amigos", três passos curtos ilustrados explicam como convidar, e dá para pular.
- **Teste com a família:** antes de fechar, uma rodada de jogo de verdade entre dois aparelhos (computador e celular) no servidor publicado, com capturas e gravação. Tudo o que travar ou confundir entra como correção.

## Sincronismo (o que cada um vê)
- **Um dono do mundo só:** o servidor. Ele aplica os comandos de todos na ordem em que chegam e publica o resultado. Se dois jogadores quebram o mesmo bloco ou pegam o mesmo item, só um consegue, e os dois veem o mesmo resultado. Nunca há item duplicado nem sumido.
- **Ritmo:** o servidor avança 20 vezes por segundo e manda a cada jogador só o que mudou perto dele: blocos, baús, itens, criaturas e jogadores dentro da distância de visão.
- **O próprio jogador:** o movimento e as ações aparecem na hora (resposta imediata da 009) e são confirmados pelo servidor. Se o servidor recusar (bloco que outro já quebrou, item que já foi pego), o cliente corrige suavemente.
- **Os outros:** jogadores e criaturas são desenhados com cerca de 100 ms de atraso, interpolando entre duas atualizações, para o movimento sair suave e sem saltos.
- **Atraso esperado no Brasil:** o servidor fica em Brazil South (São Paulo). Uma ação de um jogador aparece para os outros em cerca de 50 a 200 ms, como num jogo online comum. Com internet ruim, o aviso de conexão fraca aparece e o jogo continua.
- **Tempo do mundo:** dia, clima e estações vêm do relógio do servidor, iguais para todos.
- **Sons e efeitos:** saem dos eventos do servidor. Quem está perto ouve a picareta do amigo e vê os fragmentos.

## Servidor e infraestrutura (Azure, grupo `rg-terrario`, Brazil South)
- **App Service:** plano `asp-terrario`, Linux B1 (US$ 14,60 por mês; o B2 sai US$ 29,93 se precisar). App `app-terrario-servidor` com Node 22, WebSockets ligados, sempre ligado (Always On), somente HTTPS e identidade gerenciada. Uma instância, porque as salas ficam na memória do servidor.
- **Servidor:** TypeScript com o mesmo `src/nucleo/` do jogo, WebSocket e mensagens binárias compactas.
  - Cada sala é um mundo carregado na memória, que dorme e é salvo quando fica vazia.
  - Limites por sala: 8 jogadores, tamanho e ritmo de mensagens por jogador.
  - **Validação de tudo:** alcance, inventário, receitas, permissões e posição plausível. O cliente nunca é acreditado sem conferência.
- **Storage Account** (`stterrario…`, StorageV2, LRS, Brazil South), com acesso pela identidade gerenciada e sem chave no código:
  - **Blob `mundos`:** uma pasta por mundo, com dados do mundo (semente, tema, modo, dia, clima, dono), edições por região de 128×128 blocos comprimidas, baús, fornalhas, itens no chão, criaturas, moradores e o inventário e a posição de cada jogador. Versionamento e lixeira de 14 dias ligados, para restaurar um mundo.
  - **Table `salas`:** código → mundo, dono, permissões, criação e último acesso.
  - **Gravação:** o servidor grava as regiões alteradas a cada 5 s e ao esvaziar a sala. Se o servidor reiniciar, perde-se no máximo esse intervalo.
- **Application Insights:** erros, salas ativas, jogadores, ritmo do servidor e latência, para saber se algo está engasgando.
- **Publicação:** o GitHub Actions publica o servidor no App Service com login federado (OIDC), sem segredo guardado, e o site estático como hoje. O site descobre o endereço do servidor por configuração do build.
- **Segurança e abuso:**
  - tentativas de código limitadas por endereço, para impedir adivinhar códigos;
  - salas sem visita há 90 dias são arquivadas;
  - nenhum dado pessoal guardado.

## Critérios de qualidade (definição de pronto)
1. **Dois navegadores no mesmo mundo (e2e):**
   - A quebra e coloca blocos, e B vê em menos de 500 ms;
   - A mexe num baú e B vê o conteúdo novo;
   - os dois veem as mesmas criaturas e moradores na mesma posição, com até 1 bloco de diferença, e o mesmo dia e clima.
2. **Sem duplicar nem sumir:** testes em que dois jogadores pegam o mesmo item, abrem o mesmo baú, quebram o mesmo bloco e trocam com o mesmo morador ao mesmo tempo. Só um consegue, e o total de itens do mundo se conserva.
3. **Rede ruim simulada:** com 200 ms de atraso, 5% de pacotes atrasados e quedas de 10 s, o jogo continua consistente, reconecta sozinho e volta ao mesmo lugar sem perder nada.
4. **Persistência:** derrubar o servidor no meio do jogo, subir de novo e entrar com o código: o mundo está lá, com no máximo 5 s de perda. Um mundo levado para a nuvem fica idêntico ao local.
5. **Validação:** um cliente adulterado (colocar sem ter o item, quebrar a 50 blocos, teleportar, craftar sem receita, agir sem permissão) é recusado pelo servidor, com testes de cada caso.
6. **Carga:** 8 robôs em 4 salas ao mesmo tempo num B1: o servidor mantém os 20 passos por segundo, a CPU fica abaixo de 60% e o tráfego abaixo de 20 KB/s por jogador.
7. **Códigos:** formato e quantidade de combinações testados; tentativas limitadas; o código trocado deixa de valer na hora.
8. **UX:** "Abrir para amigos", "Entrar com código", lista de mundos, expulsar e permissões funcionam com mouse, teclado e toque, com alvos de 44 px ou mais. Capturas em computador e celular, nos 6 temas.
9. **Infra como código:** os recursos da Azure ficam descritos num arquivo (Bicep) no repositório, e o deploy roda pelo GitHub Actions. O custo mensal estimado vai para o relatório.
10. **Observabilidade:** painel no Application Insights com salas, jogadores, ritmo e erros, e um alerta por e-mail se o servidor cair.
11. **Single player intacto:** os mundos locais funcionam offline como na spec 009, e todos os testes anteriores passam.
12. **Experiência medida:**
    - do link até estar jogando em menos de 10 s (medido no e2e contra o servidor publicado);
    - nenhuma mensagem técnica na tela (teste procura termos como "erro", "WebSocket" e códigos numéricos);
    - correção do servidor sem salto visível acima de meio bloco;
    - todas as telas novas revisadas em capturas nos 6 temas.
13. **Rodada de jogo real:** dois aparelhos no servidor publicado por pelo menos 15 minutos (construir junto, trocar com moradores, anoitecer, cair a internet de um e voltar), com relato e correções.
14. **Auditoria independente** ao fim (incluindo segurança e uma revisão de experiência feita jogando com dois navegadores), com os achados verificados e corrigidos.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Infra: Bicep com plano, app, Storage Account, Application Insights e identidade; deploy com OIDC |
| T02 | Servidor de salas: WebSocket, núcleo por sala, relógio, limites, dormir e acordar |
| T03 | Persistência no Storage Account: regiões, baús, criaturas, jogadores; gravação a cada 5 s; restaurar |
| T04 | Códigos, identidade anônima, dono, permissões, expulsar, trocar código, limite de tentativas |
| T05 | Cliente em rede: conectar, entrar, reconectar, resposta imediata com correção, interpolação, interesse por região |
| T06 | Outros jogadores: personagem, apelido, animações, minimapa, lista, entrada e saída; sons e efeitos dos outros |
| T07 | Telas: "Abrir para amigos" (código, link, QR), "Entrar com código", mundos na nuvem, painel do dono |
| T08 | Validação no servidor e testes de cliente adulterado (critério 5) |
| T09 | e2e com dois navegadores, rede ruim simulada, conservação de itens, persistência e carga (critérios 1 a 6) |
| T10 | Capricho: convite (código ilustrado, compartilhar, QR), entrada em 10 s, chegada com festa, achar amigos, mensagens para crianças, primeira vez guiada |
| T11 | Rodada de jogo real em dois aparelhos, capturas nos 6 temas, painel, alerta, custo, auditoria e relatório visual |

## Riscos
- **Servidor como ponto único:** se cair, ninguém joga na nuvem. Mitigação: sempre ligado, reinício automático, gravação a cada 5 s e alerta. Os mundos locais continuam offline.
- **Crescimento:** um B1 tem limite de salas. Mitigação: medir na carga (critério 6), subir para B2 ou P0v3 por configuração e, mais adiante, separar salas por servidor.
- **Crianças e desconhecidos:** sem conversa por texto nesta etapa, sem lista pública, códigos difíceis de adivinhar e dono com expulsar e trocar código. As frases prontas vêm na 011.
- **Perda do aparelho do dono:** o dono é o aparelho. Mitigação nesta etapa: mostrar ao dono uma "chave do dono" para guardar. Contas ficam para depois.
- **Custo:** cerca de US$ 15 por mês (B1, Storage Account e monitoramento) na assinatura Visual Studio Enterprise. É conferido no relatório.

## Decisões do dono (2026-11-06)
- Mundo na nuvem, acessível por código; plano próprio do Terrário, sem usar o plano do FamFlux.
- App Service no Brasil, mesmo pagando uma mensalidade, para não travar.
- Frases prontas em vez de conversa livre, até 8 jogadores e sem login no começo.
- Capricho de sempre: a experiência tem que ser gostosa e não frustrar, com relatório visual ao fechar.
