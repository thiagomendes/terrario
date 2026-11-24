---
id: 036-lojinha-maior
title: 'Lojinha maior: 12 itens novos, com brinquedos de andar, e o Unicórnio-pônei consertado'
status: APPROVED
base_branch: main
branch: feat/036-lojinha-maior
created_at: 2026-11-24T14:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
---

## Contexto
O filho do dono comprou os 6 itens da lojinha premium (22 nov 2026): a criança esgotou a vitrine, e a lojinha é a meta das moedinhas (o modelo da 023). O dono pediu uma lojinha com mais variedade logo depois da parte 1 da 027, antes das partes 2 e 3. A ideia do filho é um brinquedo para andar, diferente da vassoura-patinete da festa.

O dono também reclamou do **Unicórnio-pônei**: ele tem uma borda estranha, brilha forte demais e treme quando voa. Isso é defeito, então vai junto, por decisão do orquestrador.

## O que existia
### O esboço (23 e 24 nov 2026, branch `esboco/036-lojinha-maior`)
- **Rodada 1:** 16 candidatos (`capturas-036/esboco/`, prancha `00-prancha.jpg`, vídeo `17-video-andar-e-bichos.mp4`).
- **Rodada 2:** mais 4, sem bichinho (`capturas-036/esboco/rodada2/`), e o passarinho refeito na ponta do ombro.
- **O código** está em `src/esboco/lojinha.ts`, `lojinhaPecas.ts` e `lojinhaBichos.ts`, ligado só com `?esboco=lojinha`. As peças usam o `Pecas` do `bonecoPremium`; os de andar usam a junta `prancha`, como o skate.
- **O que ficou fraco no esboço** e se conserta aqui:
  - a bicicletinha pequena perto do boneco;
  - a fumacinha do foguete, que junta num tufo branco logo abaixo dele;
  - o guarda-chuva pequeno perto da cabeça;
  - o passarinho, que de três-quartos ainda passa na frente da quina da cabeça.

### O jogo hoje (`main` ff958e3, `VERSAO_REDE` 18)
- **O catálogo:** `PREMIUM` em `src/jogo/alma.ts`, com 6 itens.
  - As categorias são `roupa`, `costas`, `fantasia` e `bicho`, uma peça por categoria.
  - As costas e a fantasia dividem o lugar (`LUGAR_DIVIDIDO`): a capa sai quando entra o dragão, e vice-versa.
  - **A compra acontece no aparelho:** `almaCrianca.ts` chama `comprarPremium` e grava no localStorage. O núcleo nunca vê o perfil; o servidor só passa a aparência a limpo (`sanearAparencia`).
  - A aparência leva o `premium`, e `normalizarPremium` só percorre as 4 categorias e descarta o id que não conhece.
  - O `normalizarPerfilAlma` também joga fora o id desconhecido em `premium` e em `vestidos`.
- **As fantasias da 017 e da 027** (`tesouroEFantasia.ts`, `fantasias.ts`): ao trocar, vale a última escolha. A troca entre premium e fantasia não aparece às claras; só a troca entre dois premium aparece.
- **As mãos:**
  - a direita segura o item da barra e a comida da 032;
  - a esquerda segura a lanterna do look e a varinha ou o cetro da fantasia;
  - a varinha da 027 tem efeito no núcleo: as florzinhas do baile, pelo `temVarinha`.
- **A roda** (`menuRoda.ts`): cada item tem nome e desenho fixos.
- **Mudar a aparência refaz o boneco inteiro**, aqui e em cada amigo (`aplicarAparencia`).
- **A vitrine:** `src/ui/alma/loja.ts`, aberta pela roda em qualquer mundo.
  - Seis cartões de vidro, com o detalhe, o provador, o confirmar e a festa.
  - O que vai sair do boneco ao vestir aparece às claras.
- **Os desenhos:** `src/personagem/bonecoPremium.ts` (as peças no boneco), `src/render/bichoPremium.ts` (pinguim e unicórnio), `src/render/premiumMundo.ts` (seguir a criança) e `src/render/premiumLuzes.ts` (o brilho).
- **Onde a criança já anda, senta ou guia:**
  - na Vila Neon: os patins do rinque, o skate e o trilho da rampa (só lá), os carrinhos de bate-bate, as cadeiras do carrossel e da roda-gigante, e o sofá da Casa anos 80;
  - na 027 parte 3 virão a vassoura-patinete, o trem, o carrossel, o balanço e o escorregador;
  - os carros da Cidade Grande são só trânsito: ninguém entra neles;
  - sentar no parque hoje não tira os patins nem o skate.

## Decisões do dono
- **12 itens novos** (22 nov). Os escolhidos sobre o esboço (23 e 24 nov), com os preços que ele viu:

| Nº | Item | Lugar no boneco | Preço | O que faz |
|---|---|---|---|---|
| 1 | Patinete de luz | andar | 110 | anda de pé, dando impulso com o pé; as 3 rodinhas acendem em verde-água quando rodam |
| 2 | Carrinho de pedal | andar | 140 | sentada no carrinho aberto, com volante e bandeirinha; os faróis acendem de noite |
| 3 | Bicicletinha | andar | 120 | pedala de verdade, com rodinhas de apoio e cestinha com uma flor |
| 4 | Nuvem fofa | andar | 150 | sentada, flutua baixinho balançando devagar e deixa nuvenzinhas para trás |
| 8 | Passarinho de ombro | bicho | 45 | mora no ombro, balança junto e bate as asinhas |
| 10 | Boné de hélice | chapéu | 30 | a hélice gira devagar com a criança parada e rápido quando ela corre |
| 12 | Pijama de nuvem | roupa | 35 | azul-céu com nuvenzinhas, gola fofa e pantufas de nuvem |
| 14 | Asas de borboleta | costas | 55 | lilás e rosa com bolinhas; batem devagar, e mais rápido quando a criança corre |
| 15 | Mochila-foguete | costas | 65 | foguetinho com janelinha, soltando fumacinha branca |
| 16 | Varinha de bolhas | mão | 40 | solta bolhas que sobem devagar e estouram sozinhas |
| 18 | Guarda-chuva de gotinhas | mão | 45 | lilás e branco, gira devagar no alto; gotinhas azuis caem em volta, sem molhar |
| 19 | Pipa de lacinhos | mão | 50 | amarela e azul, presa na mão por uma linha, voando atrás e acima da criança com o rabo de lacinhos |

- **Nada de bichinho além do passarinho** (23 nov): o jogo já tem muito bichinho, e o filho veria como sobra.
- **Sem pressão de escassez:** preço fixo, nada some, nada é sorteado, nenhuma oferta por tempo (023, `.sdd/cuidados-legais.md`).
- **O passarinho:** o dono gostou; acertar a posição para ele não colar na cabeça.

## Decisões do orquestrador (pequenas, contadas ao dono; ajustadas na revisão de 24 nov)
- **Três lugares novos no boneco:** `andar`, `chapeu` e `mao`.
  - O passarinho fica em `bicho` (um bichinho por vez, como hoje), mas preso ao ombro do boneco. Ele não entra pelo "seguir" do pinguim e do unicórnio.
  - A pipa fica na `mao`, porque é segurada pela linha. O guarda-chuva, a varinha de bolhas e a pipa vão um de cada vez.
- **Os ids:** `patinete-luz`, `carrinho-pedal`, `bicicletinha`, `nuvem-fofa`, `passarinho-ombro`, `bone-helice`, `pijama-nuvem`, `asas-borboleta`, `mochila-foguete`, `varinha-bolhas`, `guarda-chuva-gotinhas` e `pipa-lacinhos`. Nenhum colide com tipo de peça ou fantasia; depois de publicados, só mudam pelo `PREMIUM_RENOMEADOS`.
- **Os brinquedos de andar são só enfeite:** a mesma velocidade, o mesmo pulo e o mesmo caminho de quem anda a pé. Num jogo com amigos, ninguém fica mais rápido por ter comprado. A nuvem flutua baixinho só no desenho; não atravessa água nem buraco.
- **Montar e descer:**
  - a roda ganha um item por brinquedo vestido ("Andar de patinete", com o desenho dele) e, montada, o "Descer"; sem brinquedo vestido, nada muda;
  - comprar ou vestir um brinquedo de andar já monta a criança, quando pode montar;
  - montar e descer têm um puf e um som curto;
  - recarregar a página entra a pé, como os patins.
- **Um só "pode montar"** no cliente decide a roda e o descer sozinho. Pode montar quem está a pé, sem patins nem skate, sem estar sentada, guiando, no trilho ou no sofá, fora de casa por dentro, sem nadar, sem voar e sem estar desmaiada, e fora do provador e do modo foto.
  - Cada brinquedo de tema novo (a 027 parte 3 incluída) se registra nele.
  - O descer sozinho acontece na ação da própria criança, e não quando o núcleo responde, para os amigos não verem a bicicleta no carrossel.
- **Montada:**
  - continua tudo: minerar, colocar, comer e os gestos;
  - o abraço faz a criança descer antes;
  - o premium da mão se guarda e volta ao descer; o item da barra continua na mão direita;
  - pular para perto de um amigo ou voltar para casa mantém a criança montada, se puder montar no destino.
- **As mãos:**
  - o premium da mão vai na esquerda, e a lanterna do look some debaixo dele;
  - com uma fantasia de varinha ou de cetro, vale a última escolha;
  - as florzinhas do baile são só da varinha da fantasia da 027.
- **A cabeça:**
  - o boné segue o padrão da capa: vale a última escolha, sempre com uma peça só à vista;
  - vestir o boné tira a peça de cabeça da fantasia que sai sozinha (ou a fantasia inteira, quando a peça não sai sozinha); vestir uma fantasia de cabeça tira o boné;
  - o chapéu e o capuz do look somem debaixo do boné, como a mochila some debaixo da capa;
  - as peças de cabeça ficam numa lista só (`PECAS_DA_CABECA`, em `tesouroEFantasia.ts`); a tiara, que hoje é `cabeca: 'livre'`, entra nela se não couber bonita por baixo do boné, e quem decide é o artista.
- **Às claras em todo lugar:** uma função só de "o que sai" (premium e fantasia) vale na lojinha, no provador, em "Meus tesouros" e no editor. A figurinha do que sai, a seta e o que entra aparecem também quando o que sai é uma fantasia.
- **A vitrine com 18 itens:**
  - separada por lugar, com abas de figurinha (andar, roupa, costas, mão, chapéu, bichinho, fantasia) e rolagem dentro da aba;
  - a aba de andar abre primeiro na primeira visita depois da atualização;
  - o que é novo tem uma estrelinha até a criança abrir o detalhe dele uma vez;
  - a estrelinha e a primeira visita ficam numa chave própria do aparelho, fora do perfil.

## O que muda
### 1. O catálogo e o núcleo
- Os 12 itens entram no `PREMIUM`, com as categorias `andar`, `chapeu` e `mao`.
- O `LUGAR_DIVIDIDO` vira lista (`fantasia: ['costas', 'chapeu']`); `saiAoVestir`, `vestirPeca` e o conserto "fantasia tira costas" do `normalizarPerfilAlma` acompanham.
- As regras de cabeça e de mão ficam em `tesouroEFantasia.ts`, com a função única de "o que sai".
- **A compra continua no aparelho;** a aparência leva os itens novos pela rede para os amigos, e o servidor os passa a limpo.
- **Nada some, nem se o site voltar atrás:**
  - os ids comprados também ficam numa chave à parte do aparelho, que o código de hoje não toca, e as duas se unem na leitura;
  - daqui para a frente, um id bem formado e desconhecido vai para uma lista de "depois", em vez de ser jogado fora;
  - um teste prova que um perfil com id desconhecido sobrevive a carregar e salvar.
- **A versão da rede fica em 18** (revisão do engenheiro, 24 nov):
  - um navegador de antes descarta o item novo e o `montado` e vê o amigo sem eles;
  - um servidor de antes, se o site sair primeiro por engano, tira o que não conhece, e nada quebra;
  - subir abriria uma janela em que o site 18 é recusado pelo servidor 19 entre as duas publicações, e a 027 parte 2 já reservou a 19;
  - a condição: nenhum comando, evento ou campo de quadro novo;
  - o motivo fica na Situação e num comentário junto da `VERSAO_REDE`, mais um teste: uma cópia congelada das regras de hoje recebe a aparência da 036 e devolve a de sem item;
  - o servidor publica antes do site mesmo assim, senão os amigos não veem os itens.
- **O estado "montado" mora na aparência, como os patins e o skate:**
  - `montado?: true` só com `premium.andar` e sem patins nem skate;
  - nunca é salvo; apaga ao carregar;
  - o `estado.personagem.definir` preserva o montado como preserva os patins, senão vestir em "Meus tesouros" desmonta a criança.
- **Montar não refaz o boneco:** o brinquedo é montado uma vez, quando `premium.andar` está vestido, e o `montado` só troca a pose e a visibilidade, aqui e nos amigos (`outrosJogadores` não refaz o boneco quando só o `montado` mudou).
- **A paridade 36/36** e o hash de cada tema ficam sem mudança: nada aqui muda a geração do mundo, e o hash não inclui o desenho do boneco. A paridade roda na conferência, porque o `normalizarAparencia` está no caminho do núcleo.

### 2. As peças no boneco
- O boné, o pijama, as asas, a mochila-foguete, a varinha, o guarda-chuva e a pipa saem do esboço para `bonecoPremium.ts`, no padrão das peças de hoje, com as correções:
  - o guarda-chuva maior e sempre em pé por cima da cabeça;
  - a fumacinha do foguete subindo e se desfazendo, sem tufo;
  - a pipa com os lacinhos maiores e a linha que não atravessa o corpo.
- **O passarinho** sai do esboço (`pousarNoOmbro`) preso ao tronco do boneco, na ponta do ombro, sem passar na frente da cabeça em nenhum ângulo do jogo (a câmera de terceira pessoa).
- **As figuras** de cada item novo na lojinha e em "Meus tesouros" (`ui/alma/figuras.ts`).
- **Os efeitos** (bolhas, gotinhas, fumacinha, hélice) com brilho contido: nada de borda clara, nada que borre, nada que trema.

### 3. Os brinquedos de andar
- **Os 4 modelos** saem do esboço, com a bicicletinha maior.
- **As animações:**
  - o impulso com o pé no patinete;
  - pedalar na bicicletinha e no carrinho;
  - balançar na nuvem;
  - as rodinhas giram com a velocidade de verdade;
  - parado, a criança fica em cima, e o patinete descansa com um pé no chão.
- **Os sons curtos:** rodinhas, pedal, uma buzininha fofa do carrinho ao montar, a campainha da bicicleta ao montar e o "fuf" da nuvem.
- **Os amigos veem** a criança no brinquedo, com a mesma animação.

### 4. O Unicórnio-pônei consertado
- **A borda estranha:** descobrir de onde vem (contorno, malha de brilho ou o halo do `premiumLuzes`) e tirar.
- **O brilho:** o chifre e os coraçõezinhos no mesmo nível contido dos itens novos.
- **O tremor quando voa:** achar a causa (a altura que segue a criança voando, o passo de tempo, a câmera) e consertar, para ele seguir liso.
- **Fotos de antes e depois:** parado, trotando, pulando e voando, de dia e de noite.

### 5. A vitrine e o provador
- As abas por lugar, a rolagem e a estrelinha de novo, como em "Decisões do orquestrador".
- Os 18 cartões com o item de verdade desenhado do 3D, como hoje.
- **O provador dos de andar:** a criança aparece montada, e o brinquedo anda um pouquinho em volta.
- **O provador da pipa:** a pipa aparece voando.
- **"Meus tesouros"** (`src/ui/meusTesouros.ts`) mostra os 18 itens, com a mesma função de "o que sai".

## Experiência medida (para não frustrar)
- **Achar e comprar:** do toque na lojinha até o detalhe de um brinquedo de andar, no máximo 2 toques.
- **Montar:** 2 toques (abrir a roda e escolher o brinquedo), com o brinquedo em menos de 0,5 s, com puf e som.
- **Sem tranco ao montar:** com 4 amigos montando e descendo, com a CPU 4×, o quadro mais longo fica abaixo de 100 ms.
- **Desempenho**, no celular em pé (390×844) com a CPU 4× mais lenta, na Vila Neon de dia, com 4 amigos montados em brinquedos diferentes e com itens novos:
  - os quadros não caem mais de 10% em relação ao mesmo lugar sem os itens;
  - as chamadas de desenho sobem no máximo 20 (uns 5 por boneco).
- **A vitrine com 18 itens** abre em até 1 s no celular (a mesma régua da 023).
- **Nada some:** comprar, sair do jogo e voltar mantém o item comprado e vestido, também num mundo da nuvem.

## Cuidados (crianças e legais; ver `.sdd/cuidados-legais.md`)
- **Preço sempre conhecido.** Nada é sorteado, nada expira, sem limite por dia nem oferta por tempo. A moedinha não passa a outro jogador.
- **Nada de arco-íris** nos itens. Nada que lembre personagem, marca ou brinquedo conhecido: o carrinho é aberto e sem teto; a nuvem não tem carinha.
- **Nenhuma vantagem de jogo** para quem comprou (os de andar são só enfeite).

## Fora desta spec
- Os 6 candidatos que o dono não quis (cachorrinho, coelhinho, tartaruguinha, coroa de flores, chapéu de explorador, jardineira) e os 2 da rodada 2 (óculos de estrela, rastro de florzinhas). Ficam no histórico do esboço.
- A compra conferida no núcleo: fica para a 024 (conta da família), que leva o perfil para a nuvem.
- Andar no brinquedo dentro das casas por dentro.
- Brinquedo de andar com mais de uma criança.
- Os brinquedos de cada tema (vassoura-patinete, patins, skate) continuam só no seu mundo.
