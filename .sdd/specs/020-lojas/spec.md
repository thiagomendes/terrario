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

## Atualização de 13 nov 2026
- **A casca não deixa o jogo mais rápido.** Pergunta do dono: a casca nativa melhoraria desempenho e qualidade? Não: no celular ela usa o mesmo motor do navegador (o WebView do sistema). O que ela melhora:
  - tela cheia de verdade, o que acaba com a faixa azul do iPhone aberto pelo ícone;
  - jogo guardado no aparelho, que abre mais rápido e não some da memória do iPhone;
  - som e memória mais estáveis em segundo plano;
  - vibração e a presença na loja.
- **Desempenho de verdade** vem de outros caminhos: WebGPU (o Babylon já suporta, e os iPhones novos têm) e otimização do jogo. Vale estudar o WebGPU numa etapa desta spec ou numa spec própria.
- **Contas e compras saíram daqui:**
  - a etapa 4 ("Contas e compras") virou duas specs: a **024 (Conta da família)**, antes desta, e a **025 (Loja do jogo)**, depois desta;
  - os cuidados legais de todas ficam em `.sdd/cuidados-legais.md`.
- **Ordem combinada:** 022 → 023 → 024 → **020** → 025, com os mundos 026 e 027 intercalados.

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
0. **Nome e propriedade intelectual:** buscas de marca, parecer, registro da Cubolândia e troca de nome no jogo, mantendo os mundos salvos.
1. **Android:** casca Capacitor, ícone, tela de abertura, tela cheia, vibração, salvamento local e teste fechado na loja com a família. É a mais simples.
2. **Regras de jogo infantil:** portão dos pais, denunciar e bloquear, política de privacidade, classificação de idade e revisão de rastreadores. Vale para as duas lojas.
3. **iPhone:** a mesma casca, build na nuvem, TestFlight com a família e envio à Apple.
4. **Contas e compras:** conta dos pais, progresso na nuvem e compra pela loja com conferência no servidor. Só se e quando o dono quiser vender.
5. **Computador:** Tauri ou Electron e, se fizer sentido, Steam.

## Nome novo: Cubolândia (decisão do dono, 11 nov 2026)
- **Por que trocar:** "Terrário" fica a uma letra de **Terraria**, um jogo famoso de construir e explorar e marca registrada da Re-Logic, no mesmo gênero e nas mesmas lojas. Há risco de recusa na revisão ou de reclamação de marca.
- **Nome escolhido: Cubolândia.**
  - Nas telas e no logotipo, com acento; em endereço, nome do pacote e fora do Brasil, `cubolandia`.
  - Na loja vai com subtítulo, por exemplo "Cubolândia: mundos de brinquedo", para não se perder entre os muitos jogos de cubo.
- **Reservas, se a Cubolândia não passar:** Montamundo e Mundaréu. Brumaluz é a mais segura para registrar, mas fala só de um tema.
- **Descartado:** Cubiverso, porque já existe "Cubiverse" na Steam e numa game jam.
- **Busca preliminar** (11 nov 2026, só web e páginas das lojas):
  - Cubolândia e Cubolandia não colidiram com nenhum jogo. Só apareceram "Cubalandia", uma peça de teatro cubana, "Republic of Cubeland", uma micronação, e "Jogo do Cubolito", um app brasileiro de nome parecido e diferente o bastante.
  - Montamundo, Mundaréu e Brumaluz também estavam livres.
- **Antes de trocar qualquer coisa no jogo:**
  1. Busca de marca no INPI (classes 9 e 41) e nas bases dos EUA (USPTO) e da Europa (EUIPO).
  2. Busca direta na App Store e no Google Play, no Brasil e nos EUA.
  3. Domínio (cubolandia.com.br e .com) e perfis nas redes livres.
  4. Parecer do advogado de propriedade intelectual.
  5. Se tudo passar, pedir o registro da marca no INPI antes de publicar.
- **Troca no jogo (rebrand):**
  - nome, logotipo e ícone nas telas (título, carregando, pausa, manifest do app, ícones, cartão de compartilhar, título da página);
  - textos que citam "Terrário";
  - domínio novo com redirecionamento do antigo (terrario.tmdevlab.com continua abrindo e leva ao novo);
  - **mundos e preferências salvos continuam iguais:** o armazenamento local não pode mudar de nome sem migrar, e as salas da nuvem e os códigos seguem valendo.
  - Os nomes internos da infraestrutura (rg-terrario, repositório) podem ficar como estão.

## Revisão de propriedade intelectual (antes de enviar às lojas)
- **Jeito de jogar** (blocos, quebrar e colocar, receitas, sobrevivência, jogar item no chão): são mecânicas, que o direito autoral não protege. Não precisa mudar.
- **Inventário de tudo o que vai no app,** com a licença de cada item:
  - fontes (Google Fonts, licença aberta);
  - sons gravados da 019 (CC0 ou domínio público, crédito por arquivo);
  - banco de instrumentos (FluidR3 GM, MIT);
  - voz sintética dos moradores (eSpeak NG: confirmar que o som gerado não herda a GPL);
  - bibliotecas do código (Babylon.js e as demais, com as licenças de cada uma).
- **Nada que imite outro jogo:** sem texturas, personagens, criaturas, itens, nomes de blocos ou sons copiados. A busca de 11 nov não achou nenhum nome do Minecraft no jogo.
- **Texto e palavras-chave da loja sem citar outros jogos.** Nada de "igual ao Minecraft"; é marca registrada, e a Apple recusa apps que se apresentam como cópia.
- **Limpar os cinco comentários "como no Minecraft"** do código (src/main.ts, src/render/cena.ts, src/jogo/drops.ts, src/ui/inventario.ts). Não aparecem para o jogador, mas o código vai para as lojas sem referência a outro jogo.
- **Parecer do advogado** anexado antes do envio.

## Capricho na experiência (para não frustrar)
- Abrir o app leva direto ao jogo, com o "Carregando o mundo…" de hoje, sem tela de navegador nem barra de endereço.
- Os mundos do aparelho abrem sem internet. "Jogar com amigos" avisa com calma quando não há rede.
- Nenhuma loja nem propaganda no caminho da criança. Só os pais chegam a compras e ajustes.
- O progresso não se perde ao atualizar o app.

## Fora de escopo (por enquanto)
- Consoles, reescrita nativa e chat livre.

## Decisões do dono
- 11 nov 2026: registrar no backlog como rascunho, com tudo o que conversamos. O esboço vem quando chegar a vez.
- 11 nov 2026: nome novo **Cubolândia** (reservas: Montamundo e Mundaréu), a confirmar com busca de marca e advogado antes de trocar; revisão de propriedade intelectual antes do envio às lojas.
