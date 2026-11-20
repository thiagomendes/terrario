# Backlog

Ideias e pedidos do dono que ainda não viraram spec, e a fila combinada. A ordem é combinada com o dono na hora; o número da spec não é a ordem. Atualizar ao fechar cada spec.

## Fila combinada (19 nov 2026)
1. **035, Entrada na nuvem** (`.sdd/specs/035-entrada-na-nuvem/spec.md`): logo depois da 034 (dono, 20 nov). Dois defeitos de quem joga com amigos, com a causa achada:
   - quem cria o mundo e chama um amigo às vezes fica sem ver ninguém (reproduzido; o conserto mínimo já foi na 034, e falta o completo);
   - quem entrou num mundo com amigos fica preso nele: ao criar ou abrir outro mundo, volta sempre para o da nuvem.
2. **027, Noite das Fantasias** (`.sdd/specs/027-mundo-halloween/spec.md`): **esboço aprovado pelo dono em 20 nov** (branch `esboco/027-noite-das-fantasias`); a spec sai do esboço, no nível da Vila Neon. Ela traz:
   - sete lugares;
   - os moradores Vovó Zuleica, Conde Dudu, Lulu, Bento e Seu Jerônimo;
   - umas 10 missões;
   - a vassoura-patinete;
   - comidas de festa brasileira.

   O gato preto não pode se chamar Pretinho (ex.: Tufinho).
3. **Riqueza nos mundos antigos**: Lua, Doce Reino e Rancho Alegre, um por spec, depois da 027, na ordem que o dono escolher. Cada um ganha:
   - lugares por dentro;
   - objetos, brinquedos e veículos de toque;
   - moradores com nome e missões com história;
   - barracas de comprar e comer com as comidas do tema (o que a 032 deixou para depois).

## Esperando o dono
- **028, Cubolândia:** busca no INPI e domínio (`cubolandia.com.br`). Depois dela: 024 (conta da família), 020 (lojas), 025 (loja do jogo).
- **Rodadas em família pendentes:**
  - 010 (15 minutos em dois aparelhos);
  - 013 (Rancho);
  - 015;
  - 023;
  - 026 (Vila Neon);
  - 032;
  - 033;
  - 034 (os cinco mundos, a escolha de mundos, os ícones dos gestos, e quem cria o mundo vendo o amigo);
  - a 023 também pede: fps com 4 amigos de premium, o provador girando e se a criança de 3 a 4 anos entende a troca dragão e capa e o pote de moedas.
- **Faixa azul embaixo no iPhone pelo ícone da tela de início** (12 nov 2026; captura do dono em 19 nov): vai com a casca nativa (020), decisão do dono em 19 nov. Correção genérica, para qualquer aparelho. O painel de medida da janela está pronto no commit 65c6e2d (desfeito na 034) para quando precisar.

## Paradas
- **029, WebGPU:** medida feita no iPhone em 13 nov; a página `?medir=webgpu` continua escondida para medir de novo.
- **022, Câmera em lugar apertado:** "deixa isso aí parado" (13 nov). O recorte de adereços continua fora.
- **033, terceiro nível da roleta:** depois (ex.: "Festa" dentro de Gestos).

## Testes antigos instáveis (caem também na `main`; achados na 034)
- **`guia-chegada:128`:** no c6 em pé, a mãozinha não aparece em 4 s.
- **`plantio:210`:** o HUD do Rancho no celular.
- **`tesouro-fantasia:61`.**
- **Na beira do limite, nas duas versões:**
  - `som-veiculos:61`: o sorvete passa de 5 dB por pouco;
  - `lojinha:107`: a festa leva perto de 3400 ms;
  - o pulo do `achar-amigo-nuvem`: perto de 2500 ms.
- **Na nuvem, sem placa de vídeo:** os da roleta e os de tempo caem por lentidão; o e2e de verdade é no computador do dono.

## Ideias soltas
- **Acabamento do Rancho** (entra na spec de riqueza do Rancho):
  - refazer a foto da vitrine (um morro tapa o sítio);
  - girar as pás do moinho;
  - quebrar porta numa pilha de duas.
- **Leite e balde, filhotes, colmeia e mel** (fora da 013).
- **Contador de FPS ligado para todos** (decisão do dono, 20 nov): fica ligado durante o desenvolvimento, para acompanhar o desempenho; desligar de fábrica antes de ir para as lojas (020).
- **Balão do gesto com a cara de quem gesticula** (achado no portão visual da 034): hoje o balão e a carinha do amigo mostram sempre o boneco padrão de azul; ficaria melhor com o boneco de quem faz o gesto (o pipoqueiro, o amigo de chapéu).
- **Toque da roleta em aparelho travando:** usar o `e.timeStamp` do evento em vez de `performance.now()`, para um toque de criança contar mesmo num aparelho lento (achado na 034).
- **Acabamento do cartão do mundo salvo** (visto no ar, depois da 034):
  - a miniatura do "Meu primeiro mundo" é um degradê genérico, e não a cara da Vila Neon;
  - no computador, o nome quebra em 3 linhas;
  - a data começa com um "·" solto.
- **Queda curta da conexão** (vista no ar, depois da 034): na sala de teste, a conexão de quem criou caiu uma vez (código 1005) e voltou meio segundo depois. Pode ser a troca de `?mundo=` para `?sala=`; conferir na 035.
- **Voz do orelhão:** o dono achou rápida demais, mas fica como está por enquanto (18 nov).

## Feitas e publicadas (resumo)
- **007 a 017, 019, 021, 023, 026, 030 a 034:** ver cada spec.
- **034 (20 nov 2026):**
  - saíram Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos;
  - ficaram Vila Neon (o padrão), Cidade Grande, Rancho Alegre, Doce Reino e Exploração Lunar.
- **018:** juntou-se à 023.
- **A 031 perde a Era dos Dinos na 034;** as missões do Doce Reino ficam.
- **As mãos dos ícones dos gestos sem dedos (20 nov 2026, 19c8808):** a mão de bolinha do boneco em todos os ícones; o aplauso com as mãos lado a lado e o "plac" entre elas, o tchau com o braço dobrado. Conferido no ar. Fotos em `capturas-034/maos/`.
