---
id: 015-terceira-pessoa
title: 'Só terceira pessoa: câmera caprichada, movimento com vida e roda de gestos'
status: DONE
base_branch: main
branch: feat/terceira-pessoa
created_at: 2026-11-10T12:00:00Z
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
Pedido do dono em 10 nov 2026: o boneco de brinquedo da 012 quase não aparece em 1ª pessoa. O jogo passa a ser só em 3ª pessoa, com a câmera caprichada, o movimento menos robótico ("nada exagerado, já tá bem bom") e um menu de gestos sem encher a tela de botões.

**Esboço aprovado** (10 nov 2026, "ficou excelente... vamos seguir o que está ali, como qualidade de entrega"): `referencia/camera-e-gestos.html`, https://claude.ai/artifact/HxVe9akzormCaxXt2sw7WZ. A entrega tem que ficar igual ao esboço no jeito de mexer, na câmera e na roda.

## Objetivo
- Jogar só em 3ª pessoa, com uma câmera que segue suave, desvia de paredes e nunca atrapalha minerar e construir.
- Um boneco com peso e vida ao andar, correr, pular e ficar parado.
- Oito gestos numa roda de um botão só, vistos pelos amigos e respondidos pelo mundo.

## Fora de escopo (desta etapa)
- Fantasias (017), construções protegidas (016), Cidade Grande (014).
- Frases prontas e chat (convivência, mais adiante).
- Animações novas para os moradores e bichos além de responder aos gestos.

## Como no esboço aprovado
- **Só 3ª pessoa:** saem a 1ª pessoa, a câmera de frente e o botão de câmera (V); o braço de 1ª pessoa deixa de ser desenhado. A câmera de frente fica só no modo foto (selfie). Preferências salvas com "1ª pessoa" abrem em 3ª, sem aviso.
- **Câmera:**
  - solta do corpo: girar a câmera não gira o boneco;
  - segue com leve atraso, sem tranco;
  - andando sem mexer nela, volta devagar para trás do boneco;
  - desvia de paredes, árvores e tetos chegando perto, em vez de atravessar; bem perto, o boneco fica meio transparente;
  - aproximar e afastar de 2,5 a 7 blocos (roda do mouse e pinça);
  - para minerar e construir, o boneco vira para o bloco e a mira fica no centro da tela; o alcance continua medido a partir do boneco.
- **Movimento:**
  - arranque e freada suaves; o corpo gira para a direção nova em vez de virar de uma vez;
  - inclina ao correr e para dentro nas curvas;
  - passada e braços acompanham a velocidade; correr tem passada própria;
  - pulo com agachadinha e amortecida;
  - parado, respira e pisca; a cabeça acompanha um pouco a câmera;
  - os amigos veem o mesmo (o boneco do amigo vira para onde anda).
- **Roda de gestos:**
  - os 8 do esboço: acenar, cumprimentar, chamar, comemorar, aplaudir, dançar, apontar e sentar;
  - abre no meio da tela em volta do boneco, botões grandes, tocar fora fecha, fecha sozinha; no computador `G` e as teclas de 1 a 8;
  - o ícone do gesto aparece num balão em cima da cabeça por 2 s;
  - no multijogador todos veem (comando novo com saneamento e limite de repetição);
  - o mundo responde: o morador perto acena de volta; "chamar" traz o cachorro (raposa domada) e os bichos criados que estão perto;
  - andar interrompe o gesto; "sentar" fica até andar.
- **Botão da carinha:** no canto superior esquerdo, ao lado do "+" (decisão do dono), para a tela ficar limpa.

## Menus da tela: opção C em todos os aparelhos (decisão do dono, 10 nov 2026)
> **Trocada pela spec 033 (18 nov 2026):** a roda em volta do boneco virou a **roleta** de baixo, por cima da barrinha, em todo mundo, modo e aparelho (`src/ui/roleta.ts`; `.sdd/specs/033-camera-roleta/`). O botão de cima, os itens, os extras de cada mundo, os gestos (agora uma roleta ligada, com a plaquinha "Voltar") e as teclas continuam os mesmos. O resto desta seção vale como história.

Esboço: `referencia/menus.html`, https://claude.ai/artifact/1ZGL5c9T41PnvQDUbGUghs. O dono escolheu a C e pediu a mesma experiência no celular, no tablet e no computador ("para a criança aprender a jogar tanto no browser quanto no tablet ou no celular"):
- **Em cima à esquerda:** o botão de informações e, ao lado, um botão só que abre a roda (a mesma peça da roda de gestos, no meio da tela, em volta do boneco).
- **Na roda:** Mapa, Diário, Personagem, Foto, Gestos, Tela cheia e Pausa. "Gestos" troca a roda pelos 8 gestos no mesmo lugar, com "Voltar" no meio; segurar o botão da roda abre direto os gestos.
- **Fora da roda:** só a mochila, a um toque, embaixo do minimapa; tocar no minimapa abre o mapa grande.
- **No computador:** o mesmo desenho, com o tamanho da tela do navegador; as teclas continuam (E, Tab, J, C, P, G, Esc; de 1 a 8 com a roda de gestos aberta) e cada item da roda mostra a tecla dele. Saem a barra de botões de baixo do computador e a coluna de cima do toque (mapa, pausa, "+").

## Lições aplicadas
1. **Comando novo com caso no saneamento** (`gesto`) e teste no modo nuvem; limite de repetição no servidor.
2. **Telemetria plausível:** o arranque suave não pode mudar a velocidade máxima que o servidor confere (`VEL_MAX`); o movimento novo é de desenho, a física do jogador segue a mesma.
3. **Uma regra só para prever e para conferir** (mira e alcance a partir do boneco, no cliente e no núcleo).
4. **Tudo pelo toque também:** girar a câmera arrastando, pinça para aproximar, roda de gestos com botões grandes.
5. **Peças fundidas e nada transparente sem motivo:** o boneco meio transparente só quando a câmera está perto demais, sem custo nos outros quadros.
6. **Mundos e preferências antigos abrem iguais** (modo de câmera salvo migra para 3ª).
7. **Listas e testes que dependem da 1ª pessoa** (testes de tela do personagem, mira, braço, capturas) passam a 3ª pessoa, sem perder o que conferiam.

## Capricho na experiência (para não frustrar)
- **Construir de perto é fácil:** a mira acerta o bloco que a criança vê no centro, mesmo com a câmera atrás; nunca mira um bloco escondido atrás do boneco.
- **Cavernas e casas:** a câmera nunca entra na parede nem mostra o lado de dentro dos blocos; dentro de uma casa pequena ela chega perto e o boneco fica meio transparente.
- **Sem enjoo:** nada de tranco, de câmera girando sozinha enquanto a criança mexe nela, nem de chacoalhar.
- **Gestos sem ler:** só ícones grandes, com nome curto embaixo.
- **Medido:** 60 fps no computador e pelo menos 45 com a CPU 4× mais lenta, andando no Rancho ao lado do sítio e dentro de uma caverna.
- **Revisão jogando de verdade** antes de fechar, no computador e no celular, comparando com o esboço.

## Critérios de qualidade (definição de pronto)
1. Só 3ª pessoa; modo foto mantém a selfie; preferências antigas migram.
2. Câmera como no esboço (seguir, voltar para trás, desviar, transparência, zoom), testada em campo aberto, caverna e dentro de casa.
3. Mira e alcance certos em 3ª pessoa (quebrar e colocar acertam o bloco do centro), no computador e no toque.
4. Movimento como no esboço, também no boneco dos amigos.
5. Os 8 gestos com animação, balão, `G`/1–8 e roda no toque; multijogador com saneamento e limite; morador acena de volta; "chamar" traz bichos.
6. Menus na opção C, iguais no computador, no tablet e no celular, com as teclas de atalho no computador.
7. Desempenho medido; capturas lado a lado com o esboço; testes de tela no computador e no celular.
8. Nada quebra: todos os testes passam; auditoria independente; relatório visual.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Só 3ª pessoa: tirar 1ª pessoa, câmera de frente (fica no modo foto), V e o braço; migrar preferências; ajustar testes |
| T02 | Câmera nova: órbita solta, seguir suave, voltar para trás, desvio de blocos, transparência, zoom; mira e alcance a partir do boneco |
| T03 | Movimento com vida no boneco do jogador e dos amigos |
| T04 | Gestos: poses, balão, comando `gesto` no núcleo e na nuvem, respostas do mundo |
| T05 | Menus na opção C (roda única com a mochila fora) no computador e no toque, com as teclas |
| T06 | Desempenho, capturas com o esboço, testes de tela, auditoria, publicação e relatório visual |

## Decisões do dono
- 10 nov 2026: esboço aprovado como padrão de entrega; os 8 gestos ficam; ordem 013 → 015 → 017 → 016 → 014.
- 10 nov 2026: menus na opção C, iguais em todos os aparelhos.
