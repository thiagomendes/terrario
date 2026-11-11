---
id: 019-som-vivo
title: 'Som vivo: trilhas que acompanham o mundo e vozes de verdade para os bichos'
status: DRAFT
base_branch: main
branch: feat/som-vivo
created_at: 2026-11-11T12:00:00Z
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
Pedido do dono (11 nov 2026): "o som ainda está muito básico para o jogo". A moda de viola combinada na 013 não aparece de verdade. A trilha é monótona e devia acompanhar o clima, o ambiente e o tema, sem nada extravagante. Os bichos soam pobres: o saci faz barulho de vidro quando apanha, e os golpes nos bichos soam todos iguais. Nada pode pesar no celular.

**Como é hoje (`src/audio/`):**
- Tudo é sintetizado na hora. A música de cada tema é feita de acordes de onda simples e notas sorteadas de uma escala (`PaletaMusicalTema`), mudando por contexto (dia, noite, caverna, perigo...).
- A "viola" do Rancho é uma onda serrilhada com filtro.
- A voz de cada criatura é uma varredura de tom (`PioCriatura`).
- O golpe no bicho usa o som de material.

## Direção (a confirmar com o esboço)
- **Instrumentos de verdade, ainda sintetizados**, sem baixar arquivos: corda dedilhada (viola caipira com cordas em par, violão), sanfona, flauta, marimba, sinos, sintetizador espacial. Cada tema ganha a sua orquestrinha.
- **Música composta, não sorteada:** frases curtas por tema e contexto (ponteio de moda de viola no Rancho), que se repetem com variação.
- **Camadas que seguem o mundo:** uma base que nunca para, com instrumentos que entram e saem conforme a hora do dia, a chuva, a caverna, o perigo, o andar e o correr, a lavoura e os amigos por perto. As trocas são em cruz, no tempo da música, nunca bruscas. O silêncio também conta: há pausas.
- **Vozes dos bichos com personalidade:** galinha, vaca, cavalo, porco, cachorro, saci, dinos, bichos da Lua... Cada um tem chamado, susto, contente e "ai" de golpe de desenho animado (nada de vidro nem de grito), e os filhotes falam mais fino.
- **Leve:** um teto de vozes, nada de laço contínuo pesado e CPU medida no celular.

## Na sequência
Recomendado depois da 016 e antes da 014: 017 → 016 → **019** → 014 → 018. Assim a Cidade Grande (014) e os mundos da 018 já nascem com a trilha e os sons deles.

## Esboço
`referencia/sons.html`, https://claude.ai/artifact/9FjUNAaG9PJg1U47wMzbUW: página para ouvir o hoje e a proposta lado a lado, por tema e por contexto, e as vozes dos bichos.
