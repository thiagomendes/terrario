---
id: 020-lojas
title: 'Nas lojas: casca nativa para iPhone, Android e computador, sem reescrever o jogo'
status: DRAFT
base_branch: main
branch: feat/lojas
created_at: 2026-11-11T18:00:00Z
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
## Contexto
Pergunta do dono (11 nov 2026): levar o Terrário para a App Store e o Google Play. Abrir pelo navegador não é intuitivo para crianças. Ele não quer perder o trabalho feito na web e quer manter o computador e a web integrados no jogo online. No futuro, talvez venda coisas dentro do jogo. Por enquanto fica no backlog, como rascunho, e o esboço vem quando chegar a vez dela.

## Decisão de caminho (recomendada e aceita para estudo)
- **Casca nativa, sem reescrever.** O mesmo jogo web vai dentro de um app.
  - **Celular:** Capacitor. O app usa o WebView do sistema (no iPhone, o mesmo motor do Safari) e tem extensões nativas para compra, vibração, notificações e tela cheia.
  - **Computador:** Tauri (leve) ou Electron, para Windows, Mac e, se fizer sentido, Steam.
- **A web continua no ar.** Um código só e um servidor só. O iPhone, o Android, o computador e o navegador entram nas mesmas salas pelo código, e uma correção chega a todos.
- **Por que não reescrever em Unity ou Godot:** seria refazer meses de trabalho (mundo, bonecos, multijogador, specs 001–019). O ganho seria desempenho e um caminho para consoles, e o Terrário não precisa disso hoje. Só faz sentido se o jogo bater no limite do navegador ou quiser ir para videogame. Mesmo assim, o servidor e a lógica do núcleo seriam aproveitados.
- **Desempenho:** no iPhone, o WebView é o mesmo motor do Safari, então fica igual ao de hoje. A memória tem limites parecidos. Valem as metas da 019 e o cuidado que corrigiu a tela azul.

## O que as lojas exigem
- **Google Play:** aceita esse formato. Conta de desenvolvedor de US$ 25, paga uma vez.
- **Apple (App Store):**
  - Recusa app que seja só um site embrulhado (regra de "funcionalidade mínima"). Para passar:
    - o jogo vai **dentro** do app, não carregado de um endereço;
    - funciona sem internet nos mundos do aparelho;
    - tem recursos de app (tela cheia, vibração, salvamento local, compra pela loja).
  - Conta de US$ 99 por ano.
  - O build do iPhone precisa de Mac ou de um serviço na nuvem (GitHub Actions com macOS, Codemagic e similares).
- As regras mudam: conferir as diretrizes atuais das duas lojas quando a spec começar.

## Jogo de criança: o que mais pesa
- **Categoria infantil (Apple) e programa de família (Google):**
  - nada de propaganda nem de rastreadores ou analytics de terceiros;
  - "portão dos pais" (uma continha que criança pequena não resolve) antes de qualquer compra, link para fora do app ou ajuste sensível.
- **Multijogador:** as lojas pedem **denunciar e bloquear** outro jogador. Já temos expulsar, sala fechada, frases prontas no lugar de chat livre (decisão da 009–011) e as construções protegidas da 016. Falta o botão de denunciar e bloquear, e o destino das denúncias (registro no servidor e aviso ao dono da sala).
- **Privacidade:** política de privacidade publicada, classificação de idade nas duas lojas e cuidado com dados de criança: LGPD no Brasil, COPPA nos EUA e GDPR-K na Europa, se for distribuído lá. Hoje o jogo não pede nome real nem e-mail da criança, e isso deve continuar assim.
- **Contas:**
  - Hoje cada aparelho é uma identidade.
  - Para compras e para não perder o progresso ao trocar de aparelho, vai precisar de uma conta, de preferência de um dos pais.
  - Se houver login com Google, a Apple exige também o "Entrar com a Apple".

## Vender dentro do jogo (fase futura, opcional)
- Itens digitais (fantasias especiais, mundos novos, temas) passam pela compra da loja.
  - A comissão é de 15% para quem fatura pouco (programas de pequenas empresas) e 30% acima disso.
  - Na web, poderia ter outro meio de pagamento.
- O servidor confere o recibo da compra antes de liberar, como já confere tudo hoje, já que não confia no aparelho.
- Em jogo infantil, toda compra fica atrás do portão dos pais, sem pressão nem truques para a criança.

## Etapas propostas (cada uma com esboço e aprovação, como sempre)
1. **Android:** casca Capacitor, ícone, tela de abertura, tela cheia, vibração, salvamento local e teste fechado na loja com a família. É a mais simples.
2. **Regras de jogo infantil:** portão dos pais, denunciar e bloquear, política de privacidade, classificação de idade e revisão de rastreadores. Vale para as duas lojas.
3. **iPhone:** a mesma casca, build na nuvem, TestFlight com a família e envio à Apple.
4. **Contas e compras:** conta dos pais, progresso na nuvem e compra pela loja com conferência no servidor. Só se e quando o dono quiser vender.
5. **Computador:** Tauri ou Electron e, se fizer sentido, Steam.

## Capricho na experiência (para não frustrar)
- Abrir o app leva direto ao jogo, com o "Carregando o mundo…" de hoje, sem tela de navegador nem barra de endereço.
- Os mundos do aparelho abrem sem internet. "Jogar com amigos" avisa com calma quando não há rede.
- Nenhuma loja nem propaganda no caminho da criança. Só os pais chegam a compras e ajustes.
- O progresso não se perde ao atualizar o app.

## Fora de escopo (por enquanto)
- Consoles, reescrita nativa e chat livre.

## Decisões do dono
- 11 nov 2026: registrar no backlog como rascunho, com tudo o que conversamos. O esboço vem quando chegar a vez.
