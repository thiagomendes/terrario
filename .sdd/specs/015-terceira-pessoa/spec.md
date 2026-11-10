---
id: 015-terceira-pessoa
title: 'Só terceira pessoa: câmera caprichada, movimento com vida e roda de gestos'
status: DRAFT
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
## Contexto
Pedido do dono em 10 nov 2026: o boneco de brinquedo da 012 quase não aparece em 1ª pessoa. O jogo passa a ser só em 3ª pessoa, com a câmera caprichada, o movimento menos robótico ("nada exagerado, já tá bem bom") e um menu de gestos sem encher a tela de botões.

**Esboço aprovado** (10 nov 2026, "ficou excelente... vamos seguir o que está ali, como qualidade de entrega"): `referencia/camera-e-gestos.html`, https://claude.ai/artifact/HxVe9akzormCaxXt2sw7WZ. A entrega tem que ficar igual ao esboço no jeito de mexer, na câmera e na roda.

## O que entra (como no esboço)
- **Só 3ª pessoa:** saem a 1ª pessoa, a câmera de frente e o botão de câmera (V); o braço de 1ª pessoa deixa de ser desenhado. A câmera de frente fica só no modo foto (selfie). Preferências salvas com "1ª pessoa" abrem em 3ª, sem aviso.
- **Câmera:** solta do corpo (girar a câmera não gira o boneco); segue com leve atraso; andando sem mexer nela, volta devagar para trás do boneco; desvia de paredes, árvores e tetos chegando perto em vez de atravessar; bem perto, o boneco fica meio transparente; aproximar e afastar de 2,5 a 7 blocos (roda do mouse e pinça); para minerar e construir o boneco vira para o bloco e a mira fica no centro.
- **Movimento:** arranque e freada suaves; o corpo gira para a direção nova; inclina ao correr e nas curvas; passada e braços acompanham a velocidade; pulo com agachadinha e amortecida; parado respira e pisca; a cabeça acompanha um pouco a câmera.
- **Roda de gestos:** os 8 do esboço (acenar, cumprimentar, chamar, comemorar, aplaudir, dançar, apontar, sentar), aprovados. Abre no meio da tela em volta do boneco, botões grandes, tocar fora fecha, fecha sozinha; no computador `G` e as teclas de 1 a 8. Ícone do gesto num balão em cima da cabeça por 2 s. No multijogador todos veem (comando novo com saneamento e limite de repetição). O mundo responde: o morador acena de volta; "chamar" traz o cachorro e os bichos criados.
- **Botão da carinha:** no canto superior esquerdo, ao lado do "+" (decisão do dono), para a tela ficar limpa.

## Para explorar no começo da spec (ideia do dono)
- **Uma roda só para os menus da tela:** em vez de vários botões, um botão abre uma roda que destrava inventário, mapa, diário, personagem, foto, configurações e os gestos. Fazer um esboço comparando "roda única" com "roda de gestos + botões de hoje" antes de decidir. Se não ficar bom, segue como no esboço aprovado.

## Ordem
Depois de fechar a 013 (Rancho Alegre) e antes da 014 (Cidade Grande), decisão do dono em 10 nov 2026.
