---
id: 036-lojinha-maior
title: 'Lojinha maior: 12 itens novos, com brinquedos de andar, e o Unicórnio-pônei consertado'
status: DRAFT
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
  - O núcleo confere a compra.
  - A aparência leva o `premium`, e `normalizarPremium` descarta o id que não está no catálogo ou que veio na categoria errada.
- **A vitrine:** `src/ui/alma/loja.ts`, aberta pela roda em qualquer mundo.
  - Seis cartões de vidro, com o detalhe, o provador, o confirmar e a festa.
  - O que vai sair do boneco ao vestir aparece às claras.
- **Os desenhos:** `src/personagem/bonecoPremium.ts` (as peças no boneco), `src/render/bichoPremium.ts` (pinguim e unicórnio), `src/render/premiumMundo.ts` (seguir a criança) e `src/render/premiumLuzes.ts` (o brilho).
- **Andar em alguma coisa:**
  - na Vila Neon, os patins do rinque e o skate da pista, que ficam só lá;
  - no Parque, os carrinhos de bate-bate;
  - na Cidade Grande, os carros;
  - na 027 parte 3 virá a vassoura-patinete.

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

## Decisões do orquestrador (pequenas, contadas ao dono)
- **Três lugares novos no boneco:** `andar`, `chapeu` e `mao`.
  - O passarinho fica em `bicho`: um bichinho por vez, como hoje.
  - A pipa fica na `mao`, porque é segurada pela linha. O guarda-chuva, a varinha e a pipa vão um de cada vez, às claras na lojinha.
- **Os brinquedos de andar são só enfeite:** a mesma velocidade, o mesmo pulo e o mesmo caminho de quem anda a pé. Num jogo com amigos, ninguém fica mais rápido por ter comprado. A nuvem flutua baixinho só no desenho; não atravessa água nem buraco.
- **Subir e descer pela roda:**
  - com um brinquedo de andar vestido, a roda ganha "Andar de patinete" (com o desenho do brinquedo); montada, ganha "Descer";
  - a roda não ganha item à toa: sem brinquedo vestido, nada muda;
  - montar e descer têm um puf e um som curto.
- **Quando o brinquedo sai sozinho:**
  - ao entrar num carro, carrinho de bate-bate, cadeira de brinquedo do parque, patins ou skate de um tema, ou ao entrar numa casa por dentro, o brinquedo de andar se guarda sozinho;
  - ao sair, a criança fica a pé (descer não pune: é só tocar de novo na roda).
- **Andando num brinquedo, o item da mão se guarda** e volta ao descer.
- **O boné e a fantasia:** quando a fantasia cobre a cabeça (capuz, chapéu ou tiara de fantasia, o dragão incluído), o boné não aparece por cima. No provador e na lojinha isso aparece às claras, como hoje com a capa e o dragão; nunca as duas peças com uma escondida.
- **A vitrine com 18 itens:** separada por lugar, com abas de figurinha (andar, roupa, costas, mão, chapéu, bichinho, fantasia) e rolagem dentro da aba. A aba de andar abre primeiro na primeira visita depois da atualização. O que é novo tem uma estrelinha até a criança abrir o detalhe dele uma vez.

## O que muda
### 1. O catálogo e o núcleo
- Os 12 itens entram no `PREMIUM`, com as categorias `andar`, `chapeu` e `mao`.
- O `LUGAR_DIVIDIDO` e o "o que sai ao vestir" seguem as regras de cima.
- O núcleo aceita a compra e o vestir dos itens novos, e a aparência os leva pela rede para os amigos.
- **A versão da rede:** o servidor publica antes do site.
  - O engenheiro de núcleo e rede decide na fase 1 se a `VERSAO_REDE` sobe para 19 e registra o motivo.
  - O critério: um navegador de antes que receba um item novo de um amigo não pode quebrar nem mostrar outra coisa; mostrar o amigo sem o item novo é aceitável.
- **O estado "montado"** vai na aparência ou no quadro do jogador, para os amigos verem a criança no patinete.
- **A paridade 36/36** e o hash de cada tema sem mudança. Nada aqui muda a geração do mundo.

### 2. As peças no boneco
- O boné, o pijama, as asas, a mochila-foguete, a varinha, o guarda-chuva e a pipa saem do esboço para `bonecoPremium.ts`, no padrão das peças de hoje, com as correções:
  - o guarda-chuva maior e sempre em pé por cima da cabeça;
  - a fumacinha do foguete subindo e se desfazendo, sem tufo;
  - a pipa com os lacinhos maiores e a linha que não atravessa o corpo.
- **O passarinho** sai do esboço para `bichoPremium.ts`, na ponta do ombro, sem passar na frente da cabeça em nenhum ângulo do jogo (a câmera de terceira pessoa).
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

## Experiência medida (para não frustrar)
- **Achar e comprar:** do toque na lojinha até o detalhe de um brinquedo de andar, no máximo 2 toques.
- **Montar:** 1 toque na roda, com o brinquedo em menos de 0,5 s, com puf e som.
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
- Andar no brinquedo dentro das casas por dentro.
- Brinquedo de andar com mais de uma criança.
- Os brinquedos de cada tema (vassoura-patinete, patins, skate) continuam só no seu mundo.
