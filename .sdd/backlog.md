# Backlog

Ideias e pedidos do dono que ainda não viraram spec, e a fila combinada. A ordem é combinada com o dono na hora; o número da spec não é a ordem. Atualizar ao fechar cada spec.

## Fila combinada (19 nov 2026)
1. **034, Menos é mais** (`.sdd/specs/034-menos-e-mais/`), decidida em 18 e 19 nov 2026:
   - saem Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos, com tudo que é só deles, inclusive o que a criança ganhou neles e os mundos salvos no aparelho e na nuvem (só os desses quatro temas);
   - ficam Vila Neon (o novo padrão), Cidade Grande, Rancho Alegre, Doce Reino e Exploração Lunar;
   - junto: a miniatura escura na escolha de mundos, os ícones dos gestos para 3 anos e os testes que já falhavam na `main`.
2. **035, Entrada na nuvem** (`.sdd/specs/035-entrada-na-nuvem/spec.md`): logo depois da 034 (dono, 20 nov). Quem cria o mundo e chama um amigo às vezes fica sem ver ninguém; a causa já foi achada e reproduzida.
3. **027, Noite das Fantasias** (`.sdd/specs/027-mundo-halloween/spec.md`): esboço com fotos a partir da ideia aprovada em 18 nov, no nível da Vila Neon. Ela traz:
   - sete lugares;
   - os moradores Vovó Zuleica, Conde Dudu, Lili, Bento e Seu Jerônimo;
   - umas 10 missões;
   - a vassoura-patinete;
   - comidas de festa brasileira.

   O gato preto não pode se chamar Pretinho (ex.: Tufinho).
4. **Riqueza nos mundos antigos**: Lua, Doce Reino e Rancho Alegre, um por spec, depois da 027, na ordem que o dono escolher. Cada um ganha:
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
  - a 023 também pede: fps com 4 amigos de premium, o provador girando e se a criança de 3 a 4 anos entende a troca dragão e capa e o pote de moedas.
- **Faixa azul embaixo no iPhone pelo ícone da tela de início** (12 nov 2026; captura do dono em 19 nov): vai com a casca nativa (020), decisão do dono em 19 nov. Correção genérica, para qualquer aparelho. O painel de medida da janela está pronto no commit 65c6e2d (desfeito na 034) para quando precisar.

## Paradas
- **029, WebGPU:** medida feita no iPhone em 13 nov; a página `?medir=webgpu` continua escondida para medir de novo.
- **022, Câmera em lugar apertado:** "deixa isso aí parado" (13 nov). O recorte de adereços continua fora.
- **033, terceiro nível da roleta:** depois (ex.: "Festa" dentro de Gestos).

## Ideias soltas
- **Acabamento do Rancho** (entra na spec de riqueza do Rancho):
  - refazer a foto da vitrine (um morro tapa o sítio);
  - girar as pás do moinho;
  - quebrar porta numa pilha de duas.
- **Leite e balde, filhotes, colmeia e mel** (fora da 013).
- **Contador de FPS ligado para todos** (decisão do dono, 20 nov): fica ligado durante o desenvolvimento, para acompanhar o desempenho; desligar de fábrica antes de ir para as lojas (020).
- **Balão do gesto com a cara de quem gesticula** (achado no portão visual da 034): hoje o balão e a carinha do amigo mostram sempre o boneco padrão de azul; ficaria melhor com o boneco de quem faz o gesto (o pipoqueiro, o amigo de chapéu).
- **Toque da roleta em aparelho travando:** usar o `e.timeStamp` do evento em vez de `performance.now()`, para um toque de criança contar mesmo num aparelho lento (achado na 034).
- **Voz do orelhão:** o dono achou rápida demais, mas fica como está por enquanto (18 nov).

## Feitas e publicadas (resumo)
- **007 a 017, 019, 021, 023, 026, 030 a 033:** ver cada spec.
- **018:** juntou-se à 023.
- **A 031 perde a Era dos Dinos na 034;** as missões do Doce Reino ficam.
