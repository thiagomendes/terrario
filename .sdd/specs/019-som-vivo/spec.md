---
id: 019-som-vivo
title: 'Som vivo: trilhas que acompanham o mundo e vozes de verdade para os bichos'
status: DONE
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
- **Instrumentos de verdade** (decisão de 11 nov: gravados, ver Decisões do dono): corda dedilhada (viola caipira com cordas em par, violão), sanfona, flauta, marimba, sinos, sintetizador espacial. Cada tema ganha a sua orquestrinha.
- **Música composta, não sorteada:** frases curtas por tema e contexto (ponteio de moda de viola no Rancho), que se repetem com variação.
- **Camadas que seguem o mundo:** uma base que nunca para, com instrumentos que entram e saem conforme a hora do dia, a chuva, a caverna, o perigo, o andar e o correr, a lavoura e os amigos por perto. As trocas são em cruz, no tempo da música, nunca bruscas. O silêncio também conta: há pausas.
- **Vozes dos bichos com personalidade:** galinha, vaca, cavalo, porco, cachorro, saci, dinos, bichos da Lua... Cada um tem chamado, susto, contente e "ai" de golpe de desenho animado (nada de vidro nem de grito), e os filhotes falam mais fino.
- **Leve:** um teto de vozes, nada de laço contínuo pesado e CPU medida no celular.

## Decisões do dono
- 11 nov 2026: proposta do esboço aprovada ("gostei da proposta", "ficaram legal as novas").
- 11 nov 2026 (depois de ouvir a amostra gravada: "diferença absurda... ficou muito bom"): **híbrido, gravado onde faz diferença.**
  - **Música:** gravada a partir da nossa partitura, com instrumentos amostrados de licença livre. Vai em camadas e em frases separadas, montadas na hora para variar. No Rancho, o dono preferiu o arranjo **acústico** (violões dobrados e sanfona).
  - **Vozes de bichos e moradores:** gravadas, com algumas versões de cada.
  - **Passos, quebrar e colocar bloco:** continuam gerados na hora.
  - **Metas medidas:**
    - por tema, a música ocupa menos de 15 MB de memória e baixa menos de 2 MB;
    - só baixa ao entrar num mundo daquele tema e fica guardada;
    - o mundo nunca espera a música para abrir;
    - só ficam abertas as camadas que tocam;
    - a música do tema é solta ao sair do mundo.
  - **Teste WebKit:** imita o iPhone e confere a memória ao trocar de mundo.
- **Fluxo:** no começo da spec, um esboço maior com tudo pré-gravado para aprovar, e só depois entra no jogo.
- 11 nov 2026: **sem aumentar o volume da trilha.** Ela tem que ser suave e não irritar o jogador. A música nova entra no jogo com o mesmo volume percebido da de hoje (no esboço, o "Hoje" foi aumentado só para comparar) e fica sempre abaixo dos efeitos e das vozes. Isso será medido com uma régua de volume (RMS) nos testes. O controle "Música" de Configurações → Áudio, que já existe (padrão 60%), continua sendo o jeito de baixar ou subir a trilha.

## Revisar tudo o que já existe (pedido do dono, 11 nov 2026)
O esboço mostrou só alguns bichos. A spec revê **todo** o som do jogo, para nenhum bicho ou momento ficar bom e outro pobre. A primeira tarefa é um inventário completo, uma tabela com o que existe, como soa hoje, a proposta e o estado (feito ou falta). Nada fecha enquanto sobrar linha "como hoje" sem motivo.
- **Bichos de todos os 7 temas:** as 5 vagas de criatura de cada tema (cervo, coelho, peixe, espectro e raposa, cada uma com o nome e o jeito do tema: vaca, galinha, saci, dinos, bichos da Lua...), ou seja, 35 bichos. Cada um com chamado, susto, contente, "ai" do golpe e o baque do tamanho dele, mais a voz de filhote dos bichos criados e domados.
- **Moradores dos 7 povoados:** a voz de cada tema (chamado, susto, contente e "obrigado"), a resposta aos gestos da 015 e as falas das missões.
- **Ações da criança:** golpe, quebrar, colocar, passos, pulo, aterrissagem, comer, coletar, dano, trocar de item, recusa e entrada, em todos os materiais e nos materiais próprios de cada tema (biscoito, cristal, regolito...).
- **Mundo:** trovão, chuva, vento, pássaros, grilos, sons da roça (galo, mugido, cigarra, sapo), bipes da Lua, água e caverna.
- **Música dos 7 temas** em camadas (dia, entardecer, noite, chuva, caverna, perigo, andando e correndo, amigos perto), cada tema com a sua orquestrinha, todos com o capricho do Rancho do esboço.
- **Interface:** menus, a roda, o inventário, o craft, as conquistas e a festa ao vestir fantasia (017).
- **Régua para todos:** volume percebido por grupo (música abaixo dos efeitos e das vozes), teto de sons ao mesmo tempo e um teste que toca cada som do inventário e confere que nenhum fica mudo, cortado ou alto demais.

## Na sequência
Recomendado depois da 016 e antes da 014: 017 → 016 → **019** → 014 → 018. Assim a Cidade Grande (014) e os mundos da 018 já nascem com a trilha e os sons deles.

## Esboço
`referencia/sons.html`, https://claude.ai/artifact/9FjUNAaG9PJg1U47wMzbUW: página para ouvir o hoje e a proposta lado a lado, por tema e por contexto, e as vozes dos bichos.

## Arquivos de som no repositório
- `public/sons/pacotes/<tema>-musica.mp3`, `<tema>-vozes.mp3` e `comum-vozes.mp3`: os MP3 de cada tema emendados num pacote só; cada som é uma fatia do pacote.
- `public/sons/indice.json`: onde cada som começa e acaba no pacote, as receitas de contexto da música, as camadas, as frases e os créditos.
- O que gerou tudo isso (partituras, scripts e manifestos) fica em `referencia/fontes/`, para regravar quando for preciso.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Inventário de todo o som do jogo: tabela com o que existe, como soa hoje, a proposta e o estado |
| T02 | Esboço grande, todo pré-gravado: música dos 7 temas em camadas e frases; vozes de todos os bichos e moradores dos 7 temas; golpes; ambiente. Aprovação do dono |
| T03 | Motor de som gravado no jogo: baixa por tema e guarda; camadas e frases montadas na hora conforme o mundo; só abre o que toca e solta ao sair; metas de memória e download; o mundo nunca espera a música |
| T04 | Vozes e golpes gravados no jogo, com variações e teto de vozes |
| T05 | Revisão do resto do inventário (ações, mundo, interface) e régua de volume para todos |
| T06 | Desempenho e memória (teste WebKit), testes de tela, auditoria, publicação e relatório visual |
