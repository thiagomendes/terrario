---
id: 038-retoques-moto
title: 'Retoques e a moto dourada: a motoquinha na lojinha, a camiseta e o tênis redesenhados e os pés no pedal'
status: DRAFT
base_branch: main
branch: feat/038-retoques-moto
created_at: 2026-11-26T13:30:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
---

## Contexto
O filho do dono já joga com a Lojinha maior (036), no ar desde 24 nov 2026. Em 25 nov ele pediu **uma moto dourada** na lojinha.

Vão junto três retoques pequenos:
- **Dois itens antigos com desenho novo**, apontados pelo portão visual da 036:
  - a camiseta de aquário, porque o peixe laranja de listras brancas pode lembrar um personagem de filme;
  - o tênis de 20 moedinhas, porque as listras rosa, amarela e azul ficam perto de arco-íris.
- **Os pés no pedal**, que o dono viu jogando: na bicicletinha o pedal gira, mas os pés pedalam flutuando, e no carrinho de pedal os sapatos saem pelo capô.

## O que existia
### O esboço (26 nov 2026, branch `esboco/038-retoques-moto`)
- O código está em `src/esboco/retoques.ts` e `retoquesPecas.ts`, ligado só com `?esboco=retoques`. As fotos saem do `e2e/esboco-retoques.spec.ts` (`ESBOCO_038`).
- Prancha, fotos, vídeos e medidas estão em `capturas-038/esboco/`. O `indice.md` traz o porquê de cada versão.
- **A medida pé–pedal**, da sola até o alto do pedal, em 72 amostras numa volta:
  - na bicicletinha de hoje, de 0,087 a 0,43 bloco (média 0,28);
  - com o joelho do esboço, 0 (menos de 0,1 mm) na bicicletinha, no carrinho e na motoca;
  - o carrinho de hoje não tem pedal.
- **O custo do esboço** (`custo.json`) passa da régua da 036:
  - a motoquinha soma 8 malhas no brinquedo, mais 2 do joelho, e tem 16,8 mil triângulos;
  - a bicicletinha nova tem 6 malhas (hoje são 5) e 15,6 mil triângulos (hoje 9,5 mil).
- `src/render/premiumLuzes.ts` já aceita outra lista de peixinhos no `desenharAquario`. Sem a lista, o desenho continua igual.

### O jogo hoje (`main` a217838, `VERSAO_REDE` 18)
- **Os quatro brinquedos de andar** da 036:
  - estão no `PREMIUM` de `src/jogo/alma.ts`, na categoria `andar`: patinete 110, bicicletinha 120, carrinho 140 e nuvem 150;
  - são desenhados em `src/personagem/brinquedoAndar.ts` (`IDS_ANDAR`, a pose de cada um, as mãos no guidão);
  - têm ícone em `src/ui/iconesAndar.ts`, figura em `src/ui/alma/figuras.ts` e som em `src/audio/somItens.ts` e na cena;
  - o estado `montado` mora na aparência;
  - comprar já monta, e são 2 toques na roda para montar e descer.
- **A perna do boneco é uma peça só**, do quadril ao sapato, e não dobra.
- **A camiseta de aquário** (`camiseta-aquario`, 15) e **o tênis-cometa** (`tenis-cometa`, 20) estão no `PREMIUM`, desenhados em `premiumLuzes.ts` e `bonecoPremium.ts`.
- **A primeira pessoa (037)** sai para fora quando a criança monta, porque montado é um lugar com câmera própria.

## Decisões do dono (26 nov 2026, pela prancha do esboço)
| Pergunta | Decisão |
|---|---|
| A moto | **A Motoquinha dourada**, por **140 moedinhas**: tanque gordinho com estrela, farol redondo, guidão alto, escapamento curtinho e rodinhas de apoio. A Motoca de pedal, de três rodas, fica de fora. |
| A camiseta de aquário | **Os Peixinhos de bolinhas:** o mesmo aquário, com um amarelinho de bolinhas brancas no lugar do peixe de listras, e nenhum peixe com listra. Quem já comprou fica com ela. O preço continua 15. |
| O tênis de 20 | **Violeta e ouro:** o mesmo tênis com duas cores só, o cano violeta e o ouro na faixa de luz, na estrela e na cauda. As pegadas de luz ficam nas mesmas cores. Quem já comprou fica com ele. |
| Os pés no pedal | **Como no esboço:** o joelho dobra nos brinquedos de pedal ou de apoio, a bicicletinha é ajustada para o pé alcançar, e o carrinho ganha pedais embaixo do painel. |

Regras que já valem desde a 036 e continuam:
- a moto é só enfeite, com a mesma velocidade e o mesmo pulo;
- comprar já monta;
- as mãos vão no guidão;
- o brilho é contido e sem arco-íris;
- nada lembra marca ou modelo real.

## Decisões do orquestrador (pequenas, contadas ao dono)
- **O nome na lojinha:** "Motoquinha dourada", na aba dos de andar, depois da nuvem. O efeito fica escrito no catálogo: "sentada na motoquinha, com farol que acende de noite e rodinhas de apoio".
- **Nas motos, os espelhinhos saem.** De frente, pareciam dragonas nos ombros da criança.
- **O som da motoquinha** é um "vrum" de brinquedo, curto e baixo, ao montar, sem ronco de motor. Andando, só as rodinhas, como no carrinho. A buzininha do carrinho não se repete.
- **O custo da motoquinha:** ela entra na régua da 036, com uns 5 chamadas de desenho por boneco montado.
  - Para isso, as peças se juntam por material: o ouro, o creme, o pneu e o farol.
  - As rodas ficam com menos gomos.
  - O joelho junta a canela e o sapato numa malha só quando der.
  - Se não couber, a meta é no máximo 6, com a medida registrada.
- **O joelho** vale só para quem está montado num brinquedo com pedal ou apoio: a bicicletinha, o carrinho e a motoquinha. Andando a pé, a perna continua como hoje: esticada, é a mesma perna.
- **A primeira pessoa** continua saindo para fora ao montar, como na 037.
- **Os amigos veem** a motoquinha, o joelho e os pés no pedal, com a mesma animação.

## O que muda
### 1. O catálogo e a rede
- `motoquinha-dourada` entra no `PREMIUM`, na categoria `andar`, por 140, com o `desenho` `premium:motoquinha-dourada`, e no `IDS_ANDAR`.
- **A versão da rede continua 18**, pela mesma regra da 036: nenhum comando, evento ou campo de quadro novo.
  - Um navegador de antes descarta o id desconhecido e mostra o amigo sem a moto.
  - Um servidor de antes tira o que não conhece.
  - O servidor publica antes do site, para os amigos verem a moto.
  - Um teste prova que a aparência com a motoquinha passa pelas regras congeladas de hoje.
- **Nada some:** a lista de ids de "depois" da 036 continua valendo.
- **A camiseta e o tênis mantêm o mesmo id**: só o desenho muda.
- **A paridade 36/36 roda na conferência**, porque o catálogo está no caminho do núcleo.

### 2. A motoquinha dourada
- Sai do esboço para `brinquedoAndar.ts`, com a pose sentada, as mãos no guidão e os pés nos apoios (o joelho dobra).
- **O dourado:** amarelo quente e fundo, com o ouro escuro embaixo e o reflexo de plástico lustroso.
  - Só o farol acende, com a mesma luz mansa do farol do carrinho.
  - Nada entra no brilho que borra.
  - De noite, a moto continua clara, sem halo.
- **As rodas e as rodinhas de apoio** giram com a velocidade de verdade. Parada, a moto fica em pé nas rodinhas.
- **Na lojinha e em "Meus tesouros"** ela tem ícone (`iconesAndar.ts`), figura (`figuras.ts`) e provador, montada e andando um pouquinho em volta, como os outros de andar.

### 3. Os pés no pedal (o joelho)
- **A perna ganha um joelho**, como no esboço (`pernaAte`):
  - a canela e o sapato passam para um nó dentro da perna;
  - a cada quadro, a perna e o joelho apontam o pé para o alto do pedal ou do apoio;
  - a conta é exata e pura, com teste de unidade.
- **A bicicletinha** fica com as medidas do esboço:
  - o selim um tico mais baixo;
  - o eixo do pedal mais alto e mais perto;
  - a pedivela mais curta e o pedal redondo.

  As cores e os detalhes ficam iguais. O custo volta para as 5 malhas de hoje, ou registra por que não cabe.
- **O carrinho** ganha pedais embaixo do painel, com o capô um tico mais curto e o volante um tico mais alto. Os sapatos não saem mais pelo capô.
- **A bandeirinha do carrinho tremula** (o filho do dono reclamou em 26 nov que ela não mexe quando o carro anda). Hoje é uma placa laranja triangular, parada, num mastro atrás do banco.
  - Ela balança em volta do mastro, para trás, com a amplitude pela velocidade: parado, quase nada; andando, um tremular vivo e liso, sem tremor nem giro.
  - Na curva, ela se inclina para fora.
  - Os amigos veem igual.
  - Se a bandeira estiver juntada com outras peças laranja na mesma malha, ela sai para um nó próprio, sem passar da régua de custo.
- **O patinete e a nuvem** não mudam: não têm pedal.

### 4. A camiseta de aquário e o tênis-cometa
- **A camiseta:** o `desenharAquario` recebe a lista dos Peixinhos de bolinhas, e o peixe de listras sai.
- **O tênis:** fica com as cores de Violeta e ouro, e as pegadas de luz ganham as mesmas cores.
- **Os ícones e as figuras** da lojinha e de "Meus tesouros" acompanham o desenho novo.

### 5. O esboço sai
`src/esboco/retoques.ts`, `retoquesPecas.ts` e o e2e do esboço saem quando a spec estiver pronta. As fotos e as medidas continuam em `capturas-038/esboco/`.

## Experiência medida (para não frustrar)
- **Pé no pedal:** numa volta inteira, andando, a sola fica a no máximo 0,02 bloco do pedal ou do apoio, na bicicletinha, no carrinho e na motoquinha. Medido em teste, como no esboço.
- **Achar e comprar a moto:** do toque na lojinha até o detalhe dela, no máximo 2 toques.
- **Montar:** em menos de 0,5 s, com puf e som, como na 036.
- **Desempenho:** no celular em pé (390×844), com a CPU 4× mais lenta, na Vila Neon de dia, com 4 amigos montados (um em cada brinquedo com pedal ou apoio, mais a motoquinha):
  - os quadros não caem mais de 10% em relação ao mesmo lugar sem brinquedo;
  - as chamadas de desenho sobem no máximo 5 por boneco montado.
- **Nada some:** quem já tem a camiseta ou o tênis continua com eles, com o desenho novo, depois de recarregar, também num mundo da nuvem.

## Cuidados (crianças e legais; ver `.sdd/cuidados-legais.md`)
- A moto não tem cara de marca ou de modelo real: nada de logotipo, tanque de marca nem forma conhecida. É dourada, sem arco-íris.
- Nada de ronco alto nem som de corrida. A moto não corre mais que os outros brinquedos.
- O preço é fixo, nada é sorteado e nada expira. A moto não dá nenhuma vantagem no jogo.

## Fora desta spec
- A Motoca de pedal, de três rodas, que o dono não escolheu. Fica no histórico do esboço.
- A primeira pessoa montada, porque a 037 sai para fora ao montar.
- O formato da colher do pedreiro, que parece cutelo, e os outros defeitos antigos da lista do backlog.
- Os vídeos do esboço em `.mp4` não abriram no celular do dono. Os próximos vídeos vão num formato que o celular abra, ou como sequência de fotos.
