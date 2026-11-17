---
id: 026-mundo-anos-80
title: 'Vila Neon: o bairro anos 80 com o Festival Trovão, de brinquedo, já nascendo completo'
status: APPROVED
base_branch: main
branch: feat/026-vila-neon
created_at: 2026-11-13T17:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit -p .
  blocking: true
- name: build
  command: npm run build
  blocking: true
full_test_command: npx vitest run && scripts/e2e-gpu.sh
---
## Contexto
O dono, em 13 nov 2026, pediu um mundo "voltado aos anos 80, uma pegada dos looks dos anos 80". Os exemplos dele foram o roqueiro cabeludo do heavy metal com faixas no braço, o pessoal do flashdance e um palco colorido, "na pegada infantil, brinquedo".

Em 14 nov 2026 ele pediu mais:
- **Puxar este mundo agora,** antes das missões dos outros mundos: "aí ele já nasce com missões, e tudo mais que os mundos completos já têm, ex: rancho, cidade".
- **Mais heavy metal,** "tipo Rock in Rio, aquelas coisas que estavam acontecendo nos anos 80", com o clima nostálgico da época, mas de brinquedo.
- **Um personagem marcante** inspirado no vocalista de metal dos anos 80: cabelão, faixas no braço, munhequeira, jaqueta de tachinha, calça justa, tênis de cano alto, pose de quem canta com energia. Ele vira o morador-símbolo do mundo e também uma fantasia para a criança. Não pode ser nenhum cantor de verdade.
- **Muitas cores, como nos anos 80.** Pode neon e várias cores na mesma roupa. Só não pode o que lê como arco-íris ou símbolo do orgulho: camiseta listrada de arco-íris, o espectro em ordem (vermelho, laranja, amarelo, verde, azul, roxo) em faixas, bandeira de arco-íris. O arco-íris do céu continua liberado.
- **"Capricha, quero que esse seja o melhor mundo do jogo, o mais caprichado, nostálgico."**

**Rodada 2 (14 nov 2026):** o dono viu a primeira rodada, ouviu uma segunda opinião e decidiu: o nome **Festival Trovão** (o raio é a logo), o Show da Vila com acertos, a f2 como "levar as lhamas para o show", o vocalista com cabelão maior que balança e bate cabeça, mais metal e menos pop (grafite, cromo, brim, vermelho e azul-elétrico; o rosa só na dançarina e na pista), a noite escura de verdade no chão, **patins de graça neste mundo**, 4 brinquedos de tocar no lugar do fliperama jogável, e tudo do tema só neste mundo. Esta versão da spec já traz tudo isso.

**Rodada 3 (14 e 15 nov 2026):** o dono achou o mundo **ralo**: "Heavy metal deveria ser só uma parte do mundo, deveríamos ter outras partes deste mesmo mundo com outras coisas de 80's...". Ele escolheu **um bairro anos 80 inteiro, com cinco zonas**: a Rua anos 80, o Parque de diversões, a Pista de patins e skate, a Casa anos 80 por dentro e o Festival Trovão (que continua, como o marco do bairro). O que mais incomodava:
- pouca coisa construída, gramado vazio;
- pouco anos 80 nos detalhes;
- cara de Rancho por baixo.

Ele pediu também:
- **cabelo liso e preto no vocalista**, e cabelo **nunca maior que o boneco** em nenhum morador ou fantasia;
- **um desenho completo do bairro**: sons, mecânicas, movimentos, interações, missões, itens e blocos por zona, e o que cortar.

O dono escolheu o nome do mundo: **Vila Neon** (o bairro). **Festival Trovão** continua como o nome da zona do palco. "Vila Neon" entra na busca de marca no INPI junto com Cubolândia (ver a 020), antes de publicar.

**Regra do dono para todo esboço daqui em diante (15 nov 2026):** o esboço sempre segue a identidade visual do jogo. "Esboço que não segue é tempo perdido", porque no fim o mundo terá de seguir o padrão.
- Terreno, prédios, árvores e estruturas grandes são feitos de **blocos do jogo**, com as texturas do atlas, o mesmo tamanho de bloco e a mesma luz.
- Árvores no estilo do gerador do jogo; nunca árvore pirulito redonda.
- Brinquedos de parque, barracas, rampa e balões em blocos ou em peças quadradas de brinquedo, como os carrinhos da cidade e o ninho da 031.
- Cilindro, esfera e cápsula lisos só onde o jogo já usa (os bonecos, as rodas, os enfeites que já existem).
- Bonecos com as proporções de sempre.
- Variar de mundo só na paleta, nas texturas e na decoração, nunca num jeito de desenhar diferente.

A rodada 3 está em "A Vila Neon (rodada 3)", logo abaixo do inventário. A zona do festival continua como foi decidida na rodada 2 ("A zona do festival").

**Aprovada em 15 nov 2026** ("Manda ver, vamos com suas recomendações"), em três partes, uma de cada vez. Esta implementação é a **parte 1** (ver "Decisões do dono", rodada 4, e `tasks.md`). As seções de rodadas anteriores ficam como o histórico do desenho; onde elas e a rodada 4 discordam, vale a rodada 4.

**O esboço** (`esboco/mundo-anos-80`, `?esboco=anos80`) roda no motor de verdade, num palco à parte que o jogo nunca baixa:
- `src/esboco/anos80.ts`: o festival;
- `src/esboco/anos80Arte.ts`: os desenhos das missões, da banca e das fantasias;
- `src/esboco/anos80Ui.ts`: o quadro, a banca e a festa, com as peças de verdade da 023 e da 031.

As capturas saem de `e2e/esboco-anos80.spec.ts` (`ESBOCO_80=1`, na placa de vídeo) e ficam em `referencia/imagens/`. A amostra de música está em `referencia/sons/festival-demo.mp3`, e a partitura em `referencia/fontes/compor_festival.py`.

## Pesquisa de atmosfera (como cada coisa vira brinquedo)
De memória da época e da imagem que ficou dos grandes festivais de rock dos anos 80 (o de 1985 no Rio, o primeiro grande do Brasil, é o retrato que os pais guardam). Nada copiado de nenhum festival, banda ou artista.

| O que marcava | Como fica no jogo, de brinquedo |
| --- | --- |
| **Palco gigante ao ar livre:** torres de andaime e treliça de metal dos lados, a grade de luzes por cima, paredes de caixas de som, fumaça, a passarela no meio do povo | O **Palco Trovão**, o prédio-símbolo do mundo: tablado grafite com fita no chão e beira vermelha, a **passarela** que entra na plateia (onde o vocalista canta), fundo grafite com o **raio de neon da logo** (cromo, vermelho e amarelo) e um arco de lâmpadas de cubinho de uma cor só, torres de treliça cromada com flâmulas do raio, 8 holofotes coloridos que varrem e o **siga-me** branco quente no vocalista, caixas de som penduradas (2 × 4 de cada lado). Sem fumaça no palco (decisão do dono, 15 nov: "só atrapalha a qualidade gráfica do jogo"); os feixes pousam no chão escuro. |
| **Pirotecnia e chuva de papel** | **Faíscas de brinquedo:** chafarizes de estrelinhas frias que sobem e caem, sempre para cima e longe de gente. Confete de seis cores, sem ordem de arco-íris. Nada de fogo apontado para ninguém. |
| **O campo da plateia,** a multidão de braços para o alto, a lama e a chuva | Um gramado com caminho de cascalho do portão ao palco e a grade da plateia. Os moradores pulam com os braços em V. Sem lama nem chuva no show. |
| **O portão do festival,** faixas, bandeiras e barracas | Portão de duas torres azul-elétrico e vermelho com o raio no alto, cordões de bandeirinhas (vermelho, azul, amarelo e branco) e duas barracas: a do lanche (pipoca e refresco) e a das camisetas com estrela, raio e coração. Nenhum nome, nenhuma letra. |
| **O visual do metal:** colete de brim com remendos, jaqueta de couro com tachinhas, faixa no braço, munhequeira, bandana, cabelão armado, calça justa de lycra, tênis de cano alto | As peças das fantasias e dos moradores: jaqueta grafite com detalhes azuis e tachinhas **redondas** grandes de prata (nunca espeto), colete de brim com remendos de estrela e raio, faixa vermelha no braço, munhequeira de tachinhas, faixa na testa, cabelo comprido e liso (nunca maior que o boneco), calça justa com uma listra só, tênis de cano alto com sola branca. |
| **Guitarras pontudas,** bateria de dois bumbos, paredes de amplificador | A **guitarra-raio**: corpo de raio gordinho vermelho, braço grosso e tarraxas grandes. É uma forma inventada aqui, porque o "V" e outras silhuetas de guitarra de marca são protegidas. Bateria vermelha num praticável alto, com dois bumbos de pele branca e a estrela amarela; teclado azul-elétrico; uma parede de amplificadores grafite com friso dourado e luzinha de neon. |
| **Os objetos da época:** fita cassete (e o lápis para rebobinar), walkman, rádio gigante no ombro, pôster na parede, fita de vídeo, fliperama | Rádio gigante prateado no campo e um morador com o rádio no ombro. A fita cassete gigante vermelha em pé, com a base em trapézio, os parafusinhos e o lápis enfiado no carretel. O **fliperama**, com cinco máquinas acesas (vermelho, azul e amarelo, alternadas) e telas de jogos inventados (navinha, carrinho, blocos que caem), com linhas de tubo de imagem bem de leve. Pôsteres nossos (o raio da logo, a guitarra-raio, a fita) e o globo de espelhos num arco de treliça com luzinhas sobre a **pista quadriculada rosa e grafite que acende** sob os pés. O quadriculado fica só na pista, para não virar lanchonete dos anos 50. |
| **O fim de tarde do festival** e as luzes de noite | Céu de entardecer magenta e laranja, noite roxa estrelada. O show fica mais bonito no fim de tarde e de noite. |

**O que fica de fora de propósito:**
- caveira, chifre do diabo, fogo, fumaça escura, bebida, cigarro, briga, roda de empurra-empurra;
- qualquer nome, logotipo ou símbolo de festival, banda ou artista de verdade. Isso inclui o globo com guitarra de um festival conhecido, que é marca registrada.

## O que um mundo completo tem (inventário)
Lista do que a Cidade Grande (014), o Rancho Alegre (013) e as specs de 015 a 031 deram aos mundos. Serve de checklist para a implementação; cada item diz onde mora hoje.

**Tema e registro**
- [ ] `IdTema` novo (`src/temas/tipos.ts`) e a pasta `src/temas/festival-estrela/` com `index.ts`, `ceu.ts`, `criaturas.ts`, `pintores.ts`, `povoado.ts`, `textos.ts` e `vozes.ts`. Registro com `registrarTema` em `src/temas/todos.ts`; a ordem ali é a ordem dos cartões.
- [ ] Nome, lema, convite e cores do cartão (`cores.acento`, `fundoTitulo`, `logo`). A foto do cartão em `public/temas/<id>.jpg` (`e2e/capturas-temas.spec.ts`).
- [ ] O sufixo do nome sugerido do mundo (`DO_TEMA` em `src/cliente/identidade.ts`).
- [ ] Os nomes de todos os blocos, itens, bichos, biomas, estações, climas, capítulos e missões do diário (`TextosTema`), sem palavra da Bruma e com até 26 letras (`tests/temas/cobertura.test.ts`, `legibilidade.test.ts`).
- [ ] Os nomes dos moradores com gênero (`NOMES_GENERO` em `src/temas/nomes.ts`).

**Céu, luz e água**
- [ ] `quadrosCeu` (8 quadros), `ceu` (estrelas, sol, lua, nuvens, faixa do crepúsculo), `agua`, `bruma`, `particulas`, `climaVisual`, `emissivos`.
- [ ] Decidir se a névoa estica até a beira como na cidade (a conta fixa de `'cidade-grande'` em `cena.ts`).

**Terreno, geração e proteção**
- [ ] Um jeito próprio de gerar que o núcleo reconheça (`EstiloMundo.povoado.planta`). Os campos novos passam pelo `estiloSeguro` (`src/world/estiloSeguro.ts`), testado com todos os temas.
- [ ] O planejador do mundo, como `cidade.ts` e `sitio.ts`:
  - onde ficam o palco, o campo, o fliperama, a pista e o portão;
  - terreno plano em volta;
  - a criança nasce vendo o palco.
- [ ] A estrutura rara do tema (`construirEstrutura`).
- [ ] O lugar das missões: o canto da 031 (`src/world/cantoMissoes.ts`) ou um lugar no próprio planejador.
- [ ] A proteção da 016 (`src/world/protecao.ts`): o festival é do mundo e ninguém quebra. Avisos de recusa com a cara do tema (`avisoDaRecusa`).
- [ ] As paridades: os outros temas saem iguais bloco por bloco (`paridade-povoados`, `paridade-bruma`), e as 36 sessões gravadas continuam iguais.

**Blocos e exclusivos**
- [ ] Blocos novos a partir do id **103** (o último é `ESCADA_GRADE: 102`; o limite é 255), com texturas em `src/art/tiles.ts`. **Só sobram 15 lugares no atlas** (`tests/art/atlas.test.ts`).
- [ ] O que é só deste mundo em `src/jogo/exclusivos.ts`. Hoje os exclusivos são por `planta` (`POR_PLANTA = { cidade }`), então o festival ganha uma entrada ali. Valem na geração, nas trocas, no criativo, nas receitas e no núcleo.
- [ ] O item na mão, no chão e no ícone com o formato de verdade (`itensBrinquedo.ts`), como na 012.

**Moradores e trocas**
- [ ] `PovoadoTema` com as 3 profissões de sempre (`cozinheiro`, `construtor`, `ferreiro`): nome e desenho do tema, peças por profissão, vozes, `obrigado` e textos das trocas.
- [ ] As trocas do tema (`src/jogo/trocas.ts`). Hoje `Troca.planta` só aceita `'cidade'` e precisa aceitar o festival.
- [ ] O morador-símbolo (o vocalista) e as fantasias dos moradores (`FANTASIAS_DE_MORADOR`).
- [ ] Os testes que passam por todos os moradores: `encaixe`, `moradorFundido`, `moradorPele`, `generoMoradores`.

**Bichos**
- [ ] Os 5 papéis com a cara do tema (`cervo`, `coelho`, `raposa`, `peixe`, `espectro`), com corpo, movimento, vozes e as partes que se mexem (`cobertura`, `encaixeBicho`, `juntasBicho`, `bichoBrinquedo`).
- [ ] O bicho da noite manso (`EstiloMundo.noite: 'mansa'`), que nunca ataca.
- [ ] A comida de domar, se não for frutinhas (`EstiloMundo.domar`).
- [ ] Criar bichos (013) continua valendo: o bicho segue quem segura a comida dele.

**Atividade própria do tema**
- [ ] A regra no núcleo autoritativo (`src/nucleo/nucleo.ts`), igual no aparelho e na nuvem.
- [ ] Comandos novos com caso no saneamento (`saneamento.ts`) e teste no modo nuvem (`confiar: false`).
- [ ] Estado novo salvo em `extras`, opcional nos mundos antigos.
- [ ] A previsão no cliente com a mesma função do núcleo, para não piscar.
- [ ] Tudo pelo toque, com o alvo generoso de 80 px da 031.
- [ ] Os sons e a festa da atividade.

**Fantasias (017)**
- [ ] Ao menos uma fantasia "Dos temas" com o `tema` do mundo (`tests/personagem/fantasias.test.ts` exige uma por tema):
  - peças novas (`TipoPeca`) desenhadas em `bonecoFantasia.ts`;
  - nomes por corpo;
  - de 3 a 5 cores.
- [ ] O nome do tema na aba (`NOMES_TEMAS` em `src/ui/abaFantasias.ts`; sem ele, não compila) e a sugestão ao criar mundo ("Quer vestir a fantasia do...?").
- [ ] O teste de encaixe (nada solto, nada atravessando) com as peças novas, em todos os modelos, corpos e cabelos.

**Som e música (019)**
- [ ] A trilha do tema em camadas (base, dia, entardecer, noite, amigos, andar, chuva), gravada da nossa partitura com FluidSynth e FluidR3_GM. Vai em `public/sons/pacotes/<id>-musica.mp3`, com a entrada no `public/sons/indice.json`.
- [ ] As vozes dos bichos e dos moradores (`<id>-vozes.mp3`), com créditos (`creditosSons.ts`).
- [ ] As tabelas de nível (`NIVEL_TRILHA`, `NIVEL_VOZES`, `NIVEL_EXTRAS`). Sem camada de perigo se a noite é mansa, como no Rancho (`trilhaMundo.ts`, `reguaTrilha.ts`, `cena.ts`).
- [ ] A régua de volume da 019: a música abaixo dos efeitos e das vozes. Metas: menos de 15 MB de memória e menos de 2 MB de download.
- [ ] Os testes com a lista de temas: `trilha.test.ts` (8 temas) e `vozesGravadas.test.ts` (`ordem` com 8).

**A alma do jogo (023)**
- [ ] `MundoAlma` novo, e `mundoAlmaDoEstilo` reconhecendo o festival. É o único jeito de o núcleo saber que mundo é.
- [ ] As missões em `MISSOES` (`src/jogo/alma.ts`): `desenho: 'arte'` da 031, conta, moedinhas (15 no mundo) e habilidade. As contas novas em `GANHO_DE_EVENTO` e `HABILIDADES[].mundos`.
- [ ] A banca (`BANCA`), com `conferirBanca` no núcleo.
- [ ] O baú com o desenho e a cor do mundo (hoje `bau.ts` só sabe cidade ou rancho).
- [ ] O ritmo testado em `tests/jogo/alma.test.ts`: nível 2 até a segunda missão, a camiseta em 2 sessões, o unicórnio entre 6 e 8.

**Missões e guia (030, 031)**
- [ ] Os desenhos das missões (`arteCanto.ts` ou um arquivo do tema), legíveis a 28 px.
- [ ] O alvo de cada missão em `alvoDaMissao` (`src/jogo/guia.ts`).
- [ ] A busca de caminho no festival (hoje `guiaMissao.ts` escolhe entre cidade e sítio).
- [ ] A placa, o selinho, a mãozinha, o ✓ do núcleo e as moedinhas no fim.
- [ ] O que é de cada missão volta só quando ela é escolhida de novo, nunca com o tempo.
- [ ] "Missões" aparece na roda sozinha quando `mundoAlmaDoEstilo` reconhece o mundo (`main.ts`).

**Testes com listas escritas à mão**
- [ ] `e2e/temas.ts` (`TEMAS_E2E`, conferido por `listaE2e.test.ts`), `fantasias.test.ts`, `trilha.test.ts`, `vozesGravadas.test.ts`, `alma.test.ts` e `missoes-*.spec.ts`.

**O piso de luz da noite (rodada 2)**
- [ ] Hoje o chão do mundo nunca escurece de verdade: o material dos blocos (`matSolido` e `matPlanta` em `cena.ts`) tem `emissiveColor` branco, um piso de luz do visual de brinquedo. O festival precisa de noite escura no chão para os feixes "pousarem" nele. Proposta: um campo do tema (`ceu.pisoNoite`, 0 a 1, padrão 1 = como hoje) que baixa esse piso conforme a noite; no festival, 0,3. Os outros temas não mudam (paridade de imagem das capturas).

**Fechamento (como toda spec de mundo)**
- [ ] Desempenho medido no meio do show, de noite: 60 quadros no computador e 45 no celular com a CPU 4× mais lenta.
- [ ] Capturas de dia, de entardecer e de noite; a vitrine e a foto do cartão.
- [ ] Auditoria independente, publicação do site e do servidor juntos, rodada em família e relatório visual.

## A Vila Neon (rodada 3)

### O mapa
`referencia/mapa.svg` (e a foto `referencia/imagens/mapa.png`): o bairro tem **~180 × 150 blocos**, com o norte para cima.
- **A avenida** corta o bairro de leste a oeste. **A rua da pracinha** corta de norte a sul. Todas têm calçada, faixa amarela no meio e faixa de pedestre nos cruzamentos.
- **Sudoeste:** o **Festival Trovão** (cercado de alambrado, com o portão na avenida). A oeste dele, casas com muro e portão.
- **Noroeste:** a **Rua anos 80**: banca de jornal, orelhão, locadora, a **Casa anos 80** e, na esquina, a lanchonete. Também o ponto de ônibus, as bicicletas, a pipa no fio e o varal de lâmpadas. Atrás, mais casas.
- **Nordeste:** o **Parque de diversões**: roda-gigante (o segundo marco, visto de longe), carrossel, carrinho bate-bate, bilheteria, barracas de prendas, pipoca, algodão-doce, balões e a **fazendinha** das lhamas.
- **Sudeste:** a **pracinha**, onde a criança nasce, com o **mural de recados** (o canto das missões) e o letreiro VILA NEON. Ao lado ficam o **fliperama**, o **rinque** e a **rampa de skate**.
- **Feito de blocos do jogo**:
  - rua de asfalto com faixa e faixa de pedestre, calçada, postes que acendem (os da Cidade Grande, pintados do jeito da Vila Neon);
  - lojas com sobrado, janelas, toldos de bloco e sacada de grade;
  - casas de reboco com telhado de tijolo em degraus, muro e portão;
  - árvores do gerador do jogo (verdes e ipês amarelos), cerca-viva, canteiros de flor;
  - roda-gigante, carrossel, bate-bate, barracas e rampa também de blocos.
  
  Peças de brinquedo só onde o jogo já usa: moradores, carrinhos, cavalinhos e os objetos pequenos de dentro das lojas e da casa.

**Onde a criança nasce:** na pracinha da Vila Neon (sudeste do cruzamento), embaixo do letreiro de neon com o nome do bairro. Dali ela vê o fliperama e a placa do rinque logo ao lado, a roda-gigante a nordeste e a grade de luzes do palco a oeste.

**Bairro compacto (depois da revisão do coordenador):**
- o fliperama, o rinque e a rampa vieram para o lado da pracinha;
- a lanchonete foi para a esquina da avenida;
- o palco chegou 20 blocos mais perto do portão.

**Distâncias andando a partir do nascer** (~4 blocos por segundo):

| Lugar | Blocos | Tempo |
| --- | --- | --- |
| mural | 6 | |
| fliperama | 20 | |
| entrada do parque | 24 | |
| rinque | 35 | |
| lanchonete | 49 | |
| carrossel | 50 | |
| portão do festival | 52 | ~13 s |
| bate-bate | 66 | |
| rampa de skate | 70 | |
| roda-gigante | 75 | |
| casa anos 80 | 81 | |
| ponta da passarela | 84 | ~20 s |
| locadora | 95 | |
| banca | 109 | ~25 s |

- **Toda entrada de zona fica a até ~15 s.**
- O ponto mais longe é a banca de jornal, no fim da Rua anos 80, a ~25 s. Se o dono quiser tudo em 20 s, a banca e a locadora encostam na lanchonete, e a rua fica mais curta.

**Densidade:** a cada ~10 blocos de calçada há algo novo para olhar ou tocar: poste, árvore, lixeira, bicicleta, carro, orelhão, banca, ponto de ônibus, vitrine ou brinquedo. Nenhum gramado fica vazio: cerca-viva, árvores de rua (verdes e ipês amarelos e rosa), bancos e canteiros.

**Chão próprio, nada de Rancho:**
- asfalto com tracejado amarelo e faixa de pedestre;
- calçada de cimento;
- gramado aparado em faixas;
- muro baixo pastel com portão de grade;
- árvores de rua do gerador do jogo (verdes e ipês amarelos), nunca árvore pirulito redonda;
- postes com luminária que acende de noite.

O terreno é plano no bairro (o planejador nivela) e tem morros baixos só na beira. Nada de árvore ou mato da roça.

### Campo de visão sem buracos (pedido do dono, 15 nov 2026)
A dor veio da Cidade Grande.
- **O que aconteceu na 014** (correção `362398c`, 13 nov 2026): no iPhone do dono, a rua acabava num corte a uns 25 a 30 blocos, e os carrinhos eram desenhados além do chão carregado, vindo "voando" do horizonte.
- **Como foi resolvido:**
  - o veículo só aparece em cima de chão desenhado (as duas pontas dele num pedaço com malha) e entra crescendo;
  - a névoa da cidade vai até a ponta do chão desenhado (`NEVOA_NA_PONTA` em `cena.ts`);
  - as torres do horizonte são sósias de longe dentro da névoa.
- **Os números de hoje:**
  - a distância de visão padrão é de **3 pedaços (48 blocos)**, e vai de 2 a 8 nas configurações (`src/jogo/config.ts`);
  - a borda do chão desenhado fica em `raioChunks × 16 − 4`.

Regras da Vila Neon:
1. **O bairro e a distância de visão:**
   - Com 3 pedaços, o chão desenhado em volta da pracinha vai a ~48 blocos. Isso cobre o rinque (35), o fliperama (20), a entrada do parque (24), o carrossel (50, na beira) e o portão do festival (52, na beira).
   - O palco (passarela a 84 blocos, a grade de luzes a ~70) e a roda-gigante (75) **não** cabem nos 48. Então eles têm sósia de longe (item 2).
   - Ao entrar no mundo, o jogo carrega primeiro os pedaços da pracinha e do rumo da câmera, e só tira a cortina de entrada quando o chão dos 48 blocos está desenhado.
2. **Marcos altos com sósia de longe:**
   - A roda-gigante, a grade de luzes do palco e a placa de neon do rinque são parte dos pedaços do mundo quando perto.
   - Longe, cada um tem um sósia simples: a silhueta em blocos grandes, sem detalhe, **com o próprio pedaço de chão por baixo** (um quadrado de grama e calçada). É o caminho das torres do horizonte da 014.
   - O sósia só aparece além do chão carregado e some quando o pedaço de verdade chega. **Nada aparece antes do chão onde fica.**
   - Feixes do palco, varais de lâmpadas e o fio da pipa são do pedaço onde estão e somem com ele.
3. **Peças que não são blocos** (veículos, brinquedos que giram, moradores, barracas, balões):
   - são criadas só quando a malha do pedaço onde ficam está pronta, e saem com ele (a regra dos carrinhos da 014 vale para todas);
   - um teste de tela anda pelo bairro e confere, a cada quadro, que nenhuma peça visível está em cima de pedaço sem malha.
4. **Bordas:** a névoa da cidade (até a ponta do chão desenhado) vale também na Vila Neon. Da pracinha, nenhuma borda do mundo aparece: o bairro é cercado de árvores do jogo, e além delas vem a névoa.
5. **Celular:**
   - a fila de carregamento põe primeiro a pracinha e o rumo da câmera;
   - orçamento de no máximo 2 pedaços malhados por quadro no celular;
   - a distância de visão padrão continua 3, e o sósia cobre o resto.
6. **No esboço:** as fotos são tiradas com a distância 8 e o jogador escondido no meio do bairro, para nenhum quadro mostrar peça flutuando ou chão faltando.

### As zonas, uma por uma
Cada zona tem o seu jeito, os seus sons e o que fazer. A coluna "Na F…" diz em que parte entra (ver "Escopo honesto").

#### 1. Rua anos 80
| | |
| --- | --- |
| **Visual** | avenida com asfalto, calçada e postes; lojas de reboco com faixa colorida e letreiro: **Locadora Fita Mágica** (parede de fitas de vídeo coloridas e balcão), **Banca do Bairro** (quiosque verde com revistas e gibis inventados), **Lanchonete Dois Canudos** (na esquina, com sobrado, sacada de grade e toldo de blocos; balcão, banquinhos e vitaminas com canudo); orelhão de cúpula redonda (forma genérica); ponto de ônibus com cartaz; bicicletas no paraciclo; van e carrinho redondo estacionados (formas genéricas, sem marca); lixeiras laranja, hidrante, caixa de correio; a **pipa enroscada no fio**; varal de lâmpadas atravessando a rua |
| **Sons** | zumbido de rua tranquilo, campainha de bicicleta e um passarinho de dia; de noite, grilo e o zumbido do neon; ao passar na lanchonete, liquidificador e conversa baixinha |
| **O que a criança faz** | **ligar do orelhão** (um toque: toca e atende uma voz boba nossa, uma de 6 falas); **pegar uma fita na locadora** (vai para a mochila e serve na TV da casa); **ganhar uma vitamina na lanchonete** (troca com a moça do balcão: vira comida); **folhear a banca** (um toque mostra uma revista inventada grande, na tela, sem texto) |
| **Movimento** | andar; bicicleta é cenário (não se monta) |
| **Brinquedos de tocar** | orelhão, a campainha das bicicletas, o letreiro que pisca, o liquidificador |
| **Moradores** | moça da lanchonete (cozinheira: vitamina, cachorro-quente, pipoca), moço da banca, rapaz da locadora, criança de bicicleta, alguém no orelhão |
| **Itens** | fita de vídeo, vitamina, revistinha (enfeite de parede) |
| **Missões** | um estojo de instrumento perdido (f1) pode estar aqui (ver "As missões") |
| **Na parte** | 1 |

#### 2. Casa anos 80 por dentro
| | |
| --- | --- |
| **Visual** | casa térrea de muro baixo e portão; dentro, a sala: **TV de tubo** de madeira com antena, **console de cartucho genérico** com dois controles, **toca-discos** com caixinhas, **sofá xadrez**, tapete, abajur, relógio, telefone de disco, estante de fitas cassete, cortina e planta. O quarto de brinquedos tem ioiô, pião, **cubo de cores 2 × 2** (nunca o 3 × 3 de marca), robô de lata, bola e tapete de quebra-cabeça. |
| **Sons** | lá dentro, o som do desenho na TV e o disco tocando, abafados quando se está do lado de fora |
| **O que a criança faz** | **trocar o canal da TV** (um toque: 4 desenhos inventados nossos, em laço curto); **pôr a fita da locadora** na TV (passa um desenho "de cinema" de 20 s); **tocar o disco** (liga e desliga uma musiquinha); **sentar no sofá**; brincar com o ioiô e o pião (um toque: o brinquedo faz o que faz) |
| **Movimento** | sentar no sofá (o gesto de sentar da 015, encaixado no lugar) |
| **Brinquedos de tocar** | TV, toca-discos, telefone de disco, ioiô, pião, cubo (gira uma face), robô (anda dois passos e para) |
| **Moradores** | a avó no sofá (cozinheira: bolo de fubá), a criança jogando videogame no tapete |
| **Itens** | ioiô, pião, cubo de cores (para carregar e usar em qualquer lugar deste mundo) |
| **Na parte** | 3 |

#### 3. Parque de diversões
| | |
| --- | --- |
| **Visual** | arco de lâmpadas na entrada; **roda-gigante** iluminada com 8 cadeirinhas; **carrossel** de cavalinhos com toldo de duas cores; **carrinho bate-bate** com teto de malha e faíscas; barracas de prendas (argola, pescaria); carrinho de pipoca; algodão-doce; vendedor de balões; a **fazendinha** das lhamas com o fardo de feno; bancos e árvores |
| **Sons** | realejo de parque (órgão de brinquedo, música nossa) que fica mais forte perto do carrossel; o "tum" e as risadas do bate-bate; o sininho da pipoca; de noite, as lâmpadas zumbem baixinho |
| **O que a criança faz** | **andar na roda-gigante** (senta na cadeirinha, dá uma volta inteira de ~25 s vendo o bairro de cima e desce sozinha); **andar no carrossel** (sobe no cavalinho, que sobe e desce e gira; descer é só tocar em "sair"); **carrinho bate-bate** (senta e o carrinho anda sozinho, devagar, em volta da pista; cada toque dá um "tum" no carrinho da frente, que balança e solta estrelinhas; nunca vira, nunca empurra a criança para fora); **pegar pipoca e algodão-doce** (troca com o pipoqueiro) |
| **Movimento** | sentar e ser levado (roda-gigante, carrossel, bate-bate) |
| **Brinquedos de tocar** | a roda-gigante gira mais rápido um tiquinho e as lâmpadas piscam; o carrossel toca o realejo; os balões sobem um pouco; as argolas caem num pino (sempre acerta) |
| **Moradores** | pipoqueiro (cozinheiro: pipoca, algodão-doce), moço do bate-bate (construtor: troca peças do parque), vendedora de balões |
| **Itens** | pipoca, algodão-doce, balão (segue preso na mão) |
| **Missões** | **f2** começa aqui: a lhama da fazendinha |
| **Na parte** | 2 |

#### 4. Pista de patins e skate
| | |
| --- | --- |
| **Visual** | o rinque quadriculado rosa e grafite que **acende sob os pés**, o globo de espelhos no arco de treliça, o suporte dos patins; a **rampa em U** de concreto com borda de cromo e grafite de formas (raio, estrela e ondas, sem palavra); bancos; o fliperama na frente, de cara para a avenida |
| **Sons** | a batida do rinque (o mesmo pacote da música do bairro, com mais bateria eletrônica); as rodinhas no piso; o "clac" do skate na borda da rampa; os bipes do fliperama |
| **O que a criança faz** | **patinar** no rinque (os patins de graça do suporte); **descer a rampa de skate** (toca no skate do suporte: anda de skate como de patins; na rampa ele sobe, para no alto e desce sozinho, sem tombo); **jogar no fliperama** (um toque: musiquinha de 8 bits e a tela anima; não é jogo de verdade) |
| **Movimento** | patins (decidido na rodada 2); skate na rampa (subida e descida automáticas, encaixadas na curva) |
| **Brinquedos de tocar** | globo de espelhos (gira e solta pontinhos de luz), os 5 fliperamas, o ladrilho que acende |
| **Moradores** | o patinador, a menina do skate, o menino da BMX (cenário: a BMX não se monta) |
| **Itens** | patins, skate (de graça, do suporte; só neste mundo) |
| **Missões** | um estojo de instrumento (f1) perdido no rinque |
| **Na parte** | 1 (rinque e fliperama) e 3 (rampa de skate) |

#### 5. Festival Trovão (o marco)
| | |
| --- | --- |
| **Visual** | tudo o que foi decidido na rodada 2 (ver "A zona do festival"), agora **cercado de alambrado** com o portão na avenida, e com a **torre de som** no meio do campo (a mesa de som da época) |
| **Sons** | o show, as camadas das caixas, o acorde final e o aplauso |
| **O que a criança faz** | o **Show da Vila** (achar os instrumentos, ligar as caixas, tocar no palco, disparar o acorde final), **bater cabeça** na grade (o gesto da plateia) |
| **Movimento** | bater cabeça e pular na plateia (gestos da 015) |
| **Brinquedos de tocar** | as caixas de som depois do show, o rádio gigante, o lápis da fita gigante |
| **Moradores** | o vocalista (dá o pôster), o roadie (troca peças de palco), a guitarrista, a moça do lanche, o técnico de som |
| **Itens** | guitarra-raio, baquetas, microfone, lança-confete, pulseira que brilha, pôster |
| **Missões** | f1 (os instrumentos), f2 (as lhamas chegam na grade), f3 (o grande show) |
| **Na parte** | 1 |

### Os movimentos (como é para uma criança de 3 a 4 anos, e justo com amigos)
| Movimento | Como é | Justo no multijogador |
| --- | --- | --- |
| **Patins** | remada com faíscas, velocidade de andar, deslize de 0,5 s só no rinque, nunca cai | só animação no aparelho; a posição é a de sempre, do núcleo |
| **Skate na rampa** | sobe a rampa sozinho, para no alto um instante, desce; a criança só segura para a frente | a rampa é um trilho do núcleo (como a cadeira de um brinquedo): o núcleo diz onde ela está |
| **Roda-gigante, carrossel, bate-bate** | um toque senta; o brinquedo leva; um toque em "sair" (ou o fim da volta) desce no chão, do lado de fora | o núcleo é dono das cadeiras (quem senta, onde está cada cadeira); dois amigos podem sentar na mesma cadeirinha da roda-gigante |
| **Dançar no rinque** | o gesto "dançar" da 015 no ladrilho aceso faz o ladrilho piscar no ritmo | gesto já existe na rede |
| **Bater cabeça no show** | um gesto novo, "roqueiro", que só aparece neste mundo (cabeça e cabelo no tempo da música) | gesto vai pela rede como os da 015 |

**Cortado de movimento:** BMX montável, cair, manobra, empurrar outro jogador, corrida.

### Fazer junto com amigos
- **Roda-gigante:** sentar dois na mesma cadeirinha (cabem dois).
- **Bate-bate:** cada um no seu carrinho. O "tum" num amigo faz os dois balançarem e rirem, sem tirar ninguém do lugar.
- **O show:** todos tocam no palco e cada toque soma um acorde. O acorde final é de quem tocar primeiro, com festa para todos.
- **A TV da casa:** quem troca o canal troca para todos que estão na sala.
- **Trocas e gestos:** as trocas com os moradores e os gestos da 015 valem em todo o bairro.

### Os sons do bairro
- **Ambiente por zona,** cada um no seu raio, cruzando suave quando a criança anda (~1,5 s), nunca dois altos ao mesmo tempo:
  - rua: zumbido tranquilo, campainha de bicicleta, passarinho;
  - parque: realejo e risadas;
  - rinque: a batida;
  - casa: TV e disco, abafados do lado de fora;
  - festival: o show.
- **A música do bairro** é uma trilha só, em camadas (o caminho da 019). Cada zona puxa uma camada:
  - a rua: a melodia de sintetizador calma;
  - o parque: o realejo por cima;
  - o rinque: mais bateria eletrônica;
  - o festival: o rock do show, que já existe na amostra.
  
  Assim não há corte seco ao trocar de zona: a camada da zona entra e a outra sai, no tempo da música.
- **Toque:** todo objeto que se toca tem um som curto nosso:
  - o orelhão chama e atende;
  - a TV faz o "tchk" de trocar de canal;
  - o disco faz o chiado da agulha;
  - a fita rebobina;
  - o fliperama dá os bipes;
  - o bate-bate faz "tum";
  - a roda-gigante range;
  - a pipoca estoura;
  - o balão faz "fuu";
  - o ladrilho do rinque faz "plim".
- **Régua da 019:** música abaixo dos efeitos e das vozes. No máximo 2 ambientes e 1 música tocando ao mesmo tempo. Nada em laço contínuo além do ambiente da zona onde a criança está.

### As missões (3, 15 moedinhas, agora passando pelo bairro)
Fica a mesma ideia da rodada 2, agora atravessando as zonas, no estilo de cartão da 031:

| | Cartão (esquerda → direita) | Por onde passa | Moedinhas |
| --- | --- | --- | --- |
| **f1 Os instrumentos da banda** | guitarra-raio + lupa → os três no palco | três estojos, **um em cada zona**: no rinque (a guitarra), no parque perto do carrossel (o teclado) e no campo do festival (as baquetas); o guia leva a um de cada vez | **4** |
| **f2 Levar as lhamas para o show** | lhama + fardo de feno → lhama na grade com as notinhas | da **fazendinha do parque** pela avenida (faixa de pedestre) até a grade do festival; a lhama segue o feno | **5** |
| ~~f3 O grande show~~ → **f4 Volta no rinque** (16 nov 2026) | o arco de neon + os patins → os patins no arco aceso | no rinque; calçar os patins e passar pelos 3 arcos | **6** |

**Na parte 1 (decisão do dono, rodada 4)** o parque ainda não existe, e as missões funcionam sem ele:
- **f1:** um estojo em cada zona da parte 1: na **Rua anos 80** (o teclado), na **pista e no fliperama** (a guitarra) e no **campo do festival** (as baquetas). **4 moedinhas.**
- **f2:** as lhamas moram num **cercadinho na beira do campo do festival** (nunca no lote do parque) e seguem o feno até a grade da plateia. **5 moedinhas.**
- **f4 (16 nov 2026, no lugar da f3 do show):** a volta no rinque, de patins pelos três arcos de neon. **6 moedinhas.**
- São 15 no mundo, pagas só no fim de cada missão, nunca por ação. Quando o parque chegar (parte 2), só o lugar das lhamas pode mudar.

**Na parte 2, etapa B (17 nov 2026)** o parque trouxe mais quatro (18 moedinhas; o mundo dá 33), depois da f4 (ver as decisões de 17 nov):

| | Cartão (esquerda → direita) | Por onde passa | Moedinhas |
| --- | --- | --- | --- |
| **f5 Bilhete do parque** | o bilhete em branco + a cadeirinha → o bilhete com os três carimbos | a roda-gigante, o carrossel e o bate-bate (o passeio inteiro carimba) | **5** |
| **f6 Balões fugidos** | o balão preso na árvore + a mãozinha → o balão na mão | o pé da roda-gigante, a árvore do passeio e o toldo do carrossel | **4** |
| **f7 Lanche das lhamas** | o cocho vazio + o feno → a lhama comendo | o fardo da beira do caminho e o cocho da fazendinha, duas vezes | **4** |
| **f8 Prenda para a vovó** | a lhama de pelúcia + a argola → a vovó com a prenda | a argola, a pescaria e o portãozinho da Casa anos 80, na Rua anos 80 | **5** |

### Blocos, itens, banca e o atlas
- **O atlas tem 15 lugares livres.** O jeito de caber:
  1. **Reaproveitar os blocos da cidade com a pintura do bairro.** Asfalto, faixa, faixa de pedestre, calçada, poste, janela e janela acesa já têm id (84 em diante) e lugar no atlas. O tema do bairro pinta esses lugares do seu jeito (cada mundo pinta o atlas do seu tema). A regra do "só deste mundo" vira uma lista por planta que pode repetir o id, com a pintura de cada um.
  2. **Até 10 texturas novas, só do bairro:**
     - piso de palco que acende;
     - caixa de som e parede de amplificador;
     - treliça cromada;
     - pista quadriculada que acende;
     - letreiro de neon;
     - parede de pôster;
     - reboco pastel;
     - muro com portão;
     - telha colonial;
     - grade da plateia.
  3. **O resto é peça de brinquedo** (instanciada): fitas de vídeo, revistas, bicicletas, carros, lâmpadas, banquinhos, cavalinhos, cadeirinhas, brinquedos da casa.
  
  Sobram ~5 lugares livres para os próximos mundos.
- **Itens do bairro** (só deste mundo):
  - guitarra-raio, baquetas, microfone;
  - fita cassete, walkman, fita de vídeo;
  - patins, skate;
  - lança-confete, pulseira que brilha;
  - ioiô, pião, cubo de cores, balão;
  - comida: pipoca, algodão-doce, cachorro-quente, vitamina, suco, bolo de fubá.
  - Sem roça: a comida vem das trocas.
- **Banca** (preço fixo, sempre à venda):
  - piso de pista que acende ×12 (3);
  - banco de fita cassete ×2 (3);
  - letreiro de neon ×4 (4);
  - holofote ×4 (4);
  - globo de espelhos ×1 (5);
  - rádio gigante ×1 (5).
  - Patins e skate **não** se vendem: são de graça no suporte.

### Desempenho no celular, com essa densidade
- **Meta:** 45 quadros no celular e 60 no computador, de noite, no cruzamento (rua, parque e festival à vista), como a cidade da 014.
- **Instâncias:** tudo o que se repete é uma malha só desenhada várias vezes: postes, árvores, lixeiras, bicicletas, fitas de vídeo, revistas, lâmpadas do varal e da roda-gigante, cavalinhos, cadeirinhas, carrinhos e confete.
- **Fundir por chunk:** as peças paradas de cada chunk viram poucas malhas (como os moradores da 013).
- **Longe e perto:**
  - a mais de 3 chunks, os brinquedos e os prédios viram uma versão simples (a roda-gigante sem os raios finos, as lojas sem o interior);
  - os moradores longe param de animar;
  - os brinquedos só giram perto (ou à vista).
- **Orçamento à vista:** até 250 mil triângulos e até 120 chamadas de desenho (o da cidade). Malha de um chunk do bairro em até 12 ms no trabalhador.
- **Luz:** janela acesa e neon brilham sem espalhar luz; os feixes do palco num material só.
- **Se não couber:** primeiro sai o interior das lojas visto de fora, depois a metade das lâmpadas, depois a roda-gigante fica parada longe.
- **Medido:** no esboço tudo foi montado peça por peça, sem fundir, então nada foi medido ainda. A primeira tarefa da parte 1 mede o cruzamento.

### Escopo honesto (a regra do dono: menos recurso, mais acabamento)
Cinco zonas no capricho da Cidade Grande **não cabem numa spec só**. A Cidade, com um planejador, um canteiro e veículos, já foi uma spec grande. Proposta, sempre uma de cada vez:
1. **026 (parte 1): o bairro e o festival.**
   - Entram: o planejador do bairro inteiro (ruas, calçadas, lotes, casas de fachada), a Rua anos 80, a pracinha com o mural, a Pista de patins (rinque, patins, fliperama) e o Festival Trovão completo (show, missões, banca, fantasias, sons).
   - Os lotes do parque (parte 2) e da casa e da rampa (parte 3) nascem como um pedaço de bairro acabado: gramado aparado, cerca-viva, alambrado ou muro baixo, árvores do jogo, canteiros e bancos. **Nada de placa de obra, lona de "em breve" ou texto** (rodada 4): tem de parecer pronto, nunca vazio.
   - Já é um mundo completo e denso.
2. **026b: o Parque de diversões.** O mecanismo novo de "sentar no brinquedo" (roda-gigante, carrossel, bate-bate) e a fazendinha no lugar dela.
3. **026c: a Casa anos 80 por dentro e a rampa de skate.** A TV, o disco, a fita da locadora, os brinquedos e o skate.

O esboço mostra as cinco, para o dono ver o bairro inteiro e decidir.

### O que eu cortaria
- BMX montável, manobras, tombos e corrida (fica a BMX de enfeite).
- ~~Dirigir o carrinho bate-bate (ele anda sozinho; a criança só dá o "tum").~~ **Voltou (dono, 16 nov 2026, depois do vídeo da etapa A):** a criança guia e bate de verdade; ver as decisões.
- Comprar lanche com dinheiro ou itens (vira troca simples com o morador, como as outras).
- Jogos de verdade no fliperama e no console (só animação e musiquinha).
- Ler revista de verdade (só a capa grande, sem texto).
- Entrar em todas as casas (só a Casa anos 80; as outras têm fachada e quintal).
- Ônibus andando, carros andando (ficam parados: é cenário).
- Mais de uma música por zona (uma trilha em camadas para o bairro todo).

## A zona do festival (decidida na rodada 2)

### O mundo: Festival Trovão
Um parque de festival de rock dos anos 80, de brinquedo, num campo aberto e plano. **O raio é a logo**: está no fundo do palco, no portão, nas flâmulas, nos estojos, nos pôsteres e nos desenhos das missões. Nenhum nome escrito na tela (o nome aparece só no cartão do mundo, como os outros temas).
- No meio fica o **Palco Trovão**, que se vê de qualquer lugar.
- Do **portão** sai o caminho de cascalho até a grade da plateia.
- De um lado ficam o **fliperama**, a **pista quadriculada** com o globo de espelhos e o **suporte dos patins**.
- Do outro ficam as barracas e o pastinho com os fardos de feno.
- Espalhados pelo campo estão o **rádio gigante**, a **fita cassete gigante com o lápis** e a parede de pôsteres.

**Poucas peças, cada uma rica** (pedido do dono). O palco é a estrela do mundo; o fliperama e a pista são o segundo; o resto são enfeites grandes e fáceis de reconhecer.

**Paleta (rodada 2: mais metal, menos pop):**
- base **grafite** `#2e2d36` e `#3a3944` no palco, nos amplificadores e na jaqueta (preto puro vira mancha na tela do celular), **cromo** `#d4d8e2` na treliça e no microfone, **brim** `#3a6fb8` nos coletes;
- destaques **vermelho** `#e8302a` e **azul-elétrico** `#2f8cff`, com amarelo `#ffe14a` e branco quente nas luzes;
- **rosa só na dançarina e na pista de dança**;
- grama verde forte de dia; de noite o chão escurece de verdade e a luz vem do palco, do fliperama e da pista.

Muitas cores dos anos 80 continuam valendo; o que não pode é o espectro em ordem como faixas, nem bandeira.

**Terreno:** o campo do festival é plano (o planejador do bairro nivela) e fica dentro do alambrado; em volta do bairro, morros baixinhos e a moldura de árvores do gerador do jogo (nunca árvore pirulito redonda; regra da identidade visual). Nada de caverna funda perto do bairro.

### Os prédios e peças (o que o esboço mostra)
1. **Palco Trovão** (o símbolo):
   - tablado de 33 × 15 blocos e 3 de altura, grafite com marcas de fita e beira vermelha; saia grafite e azul;
   - a passarela de 6 × 5 que entra na plateia, onde o vocalista canta, com a grade em volta;
   - fundo grafite com o raio de neon da logo (cromo, vermelho e amarelo), raios menores azuis e amarelos e um arco de lâmpadas de cubinho de uma cor só;
   - torres de treliça cromada com flâmulas do raio, a grade de luzes por cima, 8 holofotes (vermelho, azul, branco quente e amarelo) de feixe que some na ponta e o siga-me no vocalista;
   - parede de amplificadores grafite, caixas de som penduradas 2 × 4 de cada lado, a bateria no praticável alto vermelho, o teclado e o pedestal do microfone;
   - escadinha para a criança subir.
   - **No show:** os holofotes acendem e varrem, as caixas acendem, cai confete (sem rosa), os chafarizes soltam estrelinhas frias e os feixes pousam no chão escuro (sem fumaça). **No acorde final**, uma explosão de estrelinhas sai da passarela e a plateia pula de braços para o alto.
2. **Fliperama:** caixa grafite com friso vermelho e azul, frente aberta com colunas, tubos de neon no teto, cinco máquinas com telas de jogos inventados por nós, o letreiro de neon do controle e a parede de pôsteres.
3. **Pista quadriculada** rosa e grafite que acende **sob os pés**, com o globo de espelhos num arco de treliça com luzinhas. É onde moram a dançarina e o patinador, e onde fica o **suporte dos patins**.
4. **Portão do festival** com o raio e as bandeirinhas, e **duas barracas** (lanche e camisetas).
5. **Enfeites grandes:** o rádio gigante, a fita cassete gigante com o lápis, os estojos dos instrumentos e os fardos de feno.
6. **Veículo:** a **van da banda**, grafite com o raio vermelho, estacionada atrás do palco (cenário; não anda).

### Os moradores
Arquétipos da época, de brinquedo. **Nenhum é pessoa de verdade:** o rosto é o do boneco do jogo, sem nome nem figurino marcante de ninguém.

| Profissão (núcleo) | No festival | Visual |
| --- | --- | --- |
| nenhuma (é o símbolo) | **O Vocalista** (ou a Vocalista), na ponta da passarela | **cabelo preto, liso e comprido** (rodada 3), caindo reto além dos ombros, com pontas em mechas separadas e franja reta, **nunca mais largo que a cabeça** (o boneco vem primeiro); faixa vermelha fina e lisa na testa; jaqueta grafite com gola e lapelas azuis e **tachinhas redondas grandes de prata**; camiseta vermelha; faixa vermelha no braço; munhequeira de tachinhas; calça justa de brim escuro com uma listra branca; tênis vermelho de cano alto. **Pose-símbolo:** pernas bem abertas e o microfone erguido no alto. No show, **bate cabeça no tempo** e o cabelo acompanha a cabeça. |
| construtor | **Roadie** (técnica ou técnico de palco) | boné amarelo virado para trás, fone de técnico, camiseta grafite, bermuda verde-oliva e a fita crepe no cinto. **Troca peças de palco:** caixa de som, treliça e holofote. |
| ferreiro | **Guitarrista** | cabelo loiro liso e comprido, colete de brim com remendos de estrela e raio por cima da camiseta azul lisa, calça vermelha, faixa azul no braço e a guitarra-raio vermelha |
| cozinheiro | **Moça ou moço do lanche** | viseira vermelha e avental branco. **Troca a comida:** pipoca, cachorro-quente e suco. |
| nenhuma (plateia e pista) | **Dançarina** e **patinador** | a dançarina é a única de rosa (moletom, faixa e polainas); o patinador de azul e branco, com viseira laranja, joelheiras e patins |

**O vocalista dá um presente:** um toque nele (uma vez por mundo) dá o **pôster da banda do festival** (banda inventada, sem nome escrito: o desenho do raio, a guitarra-raio e a bateria), que a criança pendura em qualquer parede.

No show, a plateia de moradores se junta na grade e pula com os braços em V; no acorde final, pula mais alto com os braços para cima.

### Os bichos
| Papel | No festival | Jeito |
| --- | --- | --- |
| cervo | **Lhama de franja** | lã creme, franja de cabelão vermelha ou azul, mantinha de duas cores; come **feno** e segue quem segura feno. Levada até a grade do show, **balança no ritmo da música**. |
| coelho | **Coelhinho de topete** | topete armado; come semente |
| raposa | **Cachorrinho de bandana** | domado com frutinhas, como hoje |
| peixe | **Peixinho-dourado** do lago | |
| espectro (noite) | **Ouricinho do moicano** | moicano de barbatanas azuis que brilha de leve no escuro. **Nada de espinho pontudo:** o corpo é uma bolinha de pelúcia com carocinhos redondos, bochechas rosadas e pezinhos. É **manso** (`noite: 'mansa'`): faz um "tsc-tsc" de chocalho, enrola numa bolinha e rola para longe. Nunca ataca. |

### A atividade do tema: o Show da Vila (com os acertos da rodada 2)
Uma criança de 3 ou 4 anos faz tudo só tocando:
1. **Achar os instrumentos.** Três estojos com o raio brilham no campo: guitarra, teclado e baquetas. É só andar até eles: o estojo vem para a mochila sozinho, e o instrumento aparece no palco com um "plim".
2. **Ligar o som.** No palco há três caixas de som apagadas. Cada toque acende uma caixa e soma uma camada da música do festival: a bateria, depois o baixo e a guitarra, depois o teclado com a melodia. Não existe ordem errada.
3. **O show.** Com as três acesas, o vocalista começa (e toda noite, com alguém no festival, elas acendem sozinhas uma a uma e o show começa sem ninguém tocar em nada; decisão do dono, 15 nov 2026), os holofotes acendem, a plateia vem para a grade e pula, e caem confete e estrelinhas.
   - **Qualquer toque no palco toca um acorde** (não precisa estar segurando a guitarra): o jogo encaixa o toque no tempo e sempre na nota certa, então não dá para errar.
   - **O fim é o ponto alto:** no último compasso, o palco pisca chamando, e **o toque da criança dispara o acorde final**: explosão de estrelinhas da passarela, a plateia vibra e o aplauso. Se ela não tocar em 4 s, o acorde vem sozinho (nunca fica esperando).
   - O show dura uma volta da música (~40 s).
4. **Depois do show, as três caixas ficam como brinquedo livre** até a noite seguinte: cada toque liga e desliga a camada dela, sem moedinha. Na noite seguinte o show toca de novo (um por noite).

Dá para fazer de novo sempre que quiser (sem moedinha por ação). Com amigos, todo mundo vê o mesmo show e cada um toca.

### Os brinquedos de tocar (no lugar do fliperama jogável)
Quatro toques que fazem algo bonito, sem regra, sem prêmio:
- **A máquina de fliperama:** toca uma musiquinha de 8 bits nossa e a tela anima (a navinha, o carrinho ou os blocos).
- **O lápis da fita gigante:** um toque no lápis rebobina a fita (os carretéis giram e sai o "zzzzip").
- **O rádio gigante:** liga e desliga uma batida.
- **A pista:** os ladrilhos acendem sob os pés de quem anda (a criança, os amigos, a dançarina).

### Os patins (de graça, só neste mundo)
- **Ganhar:** um toque no **suporte dos patins**, ao lado da pista, calça; outro toque tira. Também vêm com a fantasia Patinadora/Patinador. **Não são vendidos na loja.**
- **Andar:** remada alternada com o corpo inclinado e faíscas nas rodinhas; **a mesma velocidade máxima de andar**; ao soltar o controle, desliza ~0,5 s **só nos ladrilhos da pista** (fora dela para na hora); virar é direto (nunca escorrega como gelo); parar tem um giro pequeno e **nunca cai**; escada e degrau ele sobe andando normal.
- **Rede:** o deslize é só animação no aparelho por cima do movimento autoritativo de sempre. O único estado novo na rede é a aparência (`patins: true`, com saneamento).
- **Sai do mundo:** os patins ficam neste mundo (o personagem sai descalço deles nos outros temas, como os itens do tema).

### O que é só deste mundo (regra da 014 e da 018)
- **Blocos básicos** (terra, pedra, madeira, vidro) continuam como em todo mundo. **Todo o resto é só daqui.**
- **Blocos próprios:** piso de palco que acende, caixa de som e parede de amplificador, treliça cromada, pista quadriculada, letreiro de neon (raio ou estrela), parede de pôster (com pôsteres inventados), veludo de palco e grade da plateia. São até **8 texturas** (o atlas tem 15 lugares livres).
- **Itens:** guitarra-raio, baquetas e microfone (cada um faz um som ao usar), fita cassete, walkman, patins, lança-confete e pulseira que brilha.
- **Sem roça neste mundo.** A comida vem da barraca do lanche (pipoca, cachorro-quente e suco). O feno sai dos fardos de enfeite e serve para chamar as lhamas.
- **Trocas:** o roadie troca peças de palco (caixa de som, treliça, holofote); a moça do lanche troca a comida; o vocalista dá o pôster da banda do festival.
- **Nada do Rancho, da Cidade ou do Doce Reino entra aqui**, e nada daqui sai.

### As missões (3, só moedinhas, 15 no mundo)
No jeito da 031: o que fazer à esquerda, o resultado à direita, o selo da ação e as moedinhas mostradas antes e pagas só no fim.

| | Cartão (esquerda → direita) | Alvo do guia | No lugar | Conta (núcleo) | Moedinhas |
| --- | --- | --- | --- | --- | --- |
| **f1 Os instrumentos da banda** | guitarra-raio + selo da lupa → os três instrumentos no palco | o estojo mais perto ainda no chão | andar até ele: vem para a mochila, ✓. Bolinhas: guitarra, teclado, baquetas | `achou:instrumento` × 3 | **4** |
| **f2 Levar as lhamas para o show** | lhama + selo do fardo de feno → lhama na grade do show com as notinhas | a lhama ainda no pastinho | o feno aparece na mão ao chegar; a lhama segue o feno até a grade da plateia e fica ali balançando no ritmo, ✓ | `levou:lhama` × 2 | **5** |
| ~~f3 O grande show~~ (saiu em 16 nov 2026: o show é do bairro, sem missão) | | | | | |
| **f4 Volta no rinque** (16 nov 2026) | o arco de neon apagado + selo dos patins → os patins passando no arco aceso | sem patins, o suporte dos patins; de patins, o arco apagado mais perto | calçar os patins e passar por dentro dos 3 arcos da pista (bolinha: arco aceso) | `rinque:arco` × 3 | **6** |

- **Ordem:** f1 primeiro (põe os instrumentos no palco); f2 a qualquer hora; f4 depois de uma das duas.
- **Volta só quando escolhida de novo:** os estojos voltam ao campo, as lhamas voltam ao pastinho e as caixas se apagam quando a criança escolhe a missão outra vez, nunca com o tempo.
- **Sem pressão:** nada de prazo, contagem, estoque que gira ou sorteio.
- **O quadro em pé (390 × 844):** as três missões cabem inteiras, sem cortar a terceira nem o selo das moedinhas; numa tela menor a lista rola. Deitado continua o pedacinho da próxima, da 031. Isto muda o quadro de verdade para todos os mundos (o corte em pé da 031 escondia o selo).
- **Desenhos** (`anos80Arte.ts`): conferidos a 96, 48 e 28 px na folha `referencia/imagens/desenhos-folha.jpg`.

### As fantasias (Dos temas, livres como na 017)
1. **Roqueira do Palco / Roqueiro do Palco:** o look do vocalista ajustado à criança: jaqueta grafite de tachinhas redondas com detalhes azuis, faixa no braço, munhequeira, faixa na testa, tênis de cano alto e calça justa. **O cabelo comprido e liso vem LIGADO** e sai com um toque (peça opcional); nunca maior que o boneco.
2. **Dançarina do Neon / Dançarino do Neon:** moletom de ombro caído, legging, polainas e faixa na testa (aqui o rosa vale).
3. **Patinadora / Patinador:** viseira, joelheiras e **os patins de verdade** (os mesmos do suporte).

### A banca do festival (só do tema, preço fixo, sempre à venda)
| Item | Quantidade | Preço |
| --- | --- | --- |
| Piso de pista que acende (rosa e grafite) | 12 | 3 |
| Banco de fita cassete | 2 | 3 |
| Letreiro de neon (raio) | 4 | 4 |
| Holofote | 4 | 4 |
| Globo de espelhos | 1 | 5 |
| Rádio gigante | 1 | 5 |

Os patins **não** estão à venda: são de graça no suporte da pista.

### A música e os sons
**A amostra** (`referencia/sons/festival-demo.mp3`, ~24 s, composta aqui): introdução com arpejo e a contagem nas baquetas; o riff galopando na guitarra abafada; o refrão com a melodia no sintetizador e no glockenspiel, **dobrada uma oitava abaixo pela guitarra com distorção** (rodada 2: mais metal), bumbo duplo macio e acordes de quinta; a subida e o **acorde final** com a caixinha de música por cima. Caminho da 019: partitura em código, FluidSynth com FluidR3_GM (MIT) e ffmpeg.

**A trilha do jogo** (com a régua da 019) vai em camadas: base (baixo e bateria eletrônica baixinha), dia (a melodia em duas versões), entardecer (guitarra limpa com eco), noite (sintetizador macio, sem bateria), amigos (palmas), andar (chimbal), chuva (gotinhas), o show (as três camadas das caixas) e o acorde final. Sem camada de perigo (a noite é mansa).

**Sons:** aplauso e "uhuu" curtos; o "plim" do estojo; o "tum" da caixa; o acorde de cada toque no palco; o "zzzzip" da fita; a batida do rádio; a musiquinha de 8 bits; o chocalho do ouricinho; o "bé" da lhama; as rodinhas dos patins. Nada em laço contínuo.

## As revisões do consultor de experiência
**Rodada 1 (aplicada):** guitarra-raio no lugar do V; arco de lâmpadas de uma cor; juba longa; passarela e siga-me; quadriculado só na pista; selos de ação (lupa, dedinho); fita com base em trapézio; ouricinho com moicano de barbatanas.

**Rodada 2 (aplicada nas fotos finais):**
- **Vocalista:** pernas bem abertas e o microfone mais alto e para fora; as mechas da frente foram para trás dos ombros (a jaqueta e as tachinhas aparecem); as pontas do cabelão afinam em três mechas com um reflexo claro (antes formavam um monte no chão).
- **Brim com remendos nas costas** do vocalista e da guitarrista (raio, estrela e coração), que é o que a plateia vê.
- **Acorde final inconfundível:** estrelinhas maiores, douradas e brancas, todos os feixes brancos por um instante e a plateia pulando de braços para cima; o confete fica só para o acorde final (o show normal fica mais limpo, e o fim se destaca).
- **Sem rosa no palco:** faíscas douradas, a logo só com contorno cromado e o raio vermelho (o miolo amarelo deslocado lembrava capa de disco famosa).
- **Globo de espelhos** com facetas que contrastam e pontinhos de luz no chão da pista.
- **Suporte dos patins** com botas maiores, listra colorida e o patins de neon em cima (o desenho diz o que é).
- **Lhamas** na ponta da grade, sem atravessar a plateia, com notinhas no ar, e a foto de noite.
- **Fica para a implementação:** a pilha de cabelo vista de trás, na plateia, pode ganhar a mesma ponta em mechas; o quadro deitado continua com o pedacinho da próxima (decisão da 031) e só o em pé mostra as três.

**Rodada 3 (a Vila Neon, aplicada nas fotos finais):**
- **Neon de noite:** a luz de noite no chão ficou um pouco mais alta, para a criança ver o chão. Entraram faixa de neon e letreiro no fliperama, e letreiros e lâmpadas acesos.
- **Rampa:** chão pintado em faixas, laterais azul e vermelha, mais skatistas e o cachorro.
- **Casa:**
  - forro claro;
  - parede de pôsteres à vista;
  - avó no sofá e o cachorro;
  - criança e brinquedos no quarto.
- **Rua:**
  - o varal de lâmpadas subiu acima dos letreiros e tem fio;
  - saíram as grades escuras do sobrado, que liam como risco;
  - entraram mais carros e gente.
- **Pracinha:** os bancos viraram peças de madeira (antes pareciam laje escura no chão); a gangorra ficou curta e grossa; o letreiro VILA NEON cabe inteiro.
- **Roda-gigante:** a foto do passeio olha do alto da cadeirinha para o bairro.
- **Telhados variados** (tijolo, pedra marrom, azul e grafite), para não parecer vila de sítio. A moldura de árvores do jogo ficou mais fechada.

Ficou para a implementação: o papel de parede anos 80 por dentro da casa (textura nova), mais variedade na plateia do festival vista de trás, e mais neon rosa e turquesa nas fachadas (letreiros de luz própria em todas as lojas).

## O que fica de fora (cortado de propósito)
- Qualquer veículo que se mexa (a van fica parada).
- Rinque de patinação com corrida, tombo ou manobra.
- Fliperama jogável (a máquina é um brinquedo de tocar).
- Fita de vídeo e videolocadora.
- Karaokê, pontuação e acertar o ritmo.
- Roça, plantio e colheita neste mundo.
- Mais missões e fantasias de prêmio (vêm depois, juntas, como na 031).
- Lama, chuva no show, fogo e multidão apertada.

## Impacto na rede (`VERSAO_REDE`)
Hoje é **7**. **Precisa subir para 8**, uma vez só, com o site e o servidor publicados juntos, porque:
- o festival é gerado por um planejador próprio (uma `planta` nova no `EstiloMundo`, que o `estiloSeguro` deixa passar), e um navegador de antes veria outro chão que o servidor;
- os blocos novos (103 em diante) entram na geração e nos exclusivos;
- `MundoAlma` ganha o festival (vista da alma, banca, recusas);
- o show tem estado no núcleo (caixas acesas, instrumentos no palco, show tocando, o acorde final) e eventos novos (`achou:instrumento`, `levou:lhama`, `show:caixa`, `show` com o tempo da música); o toque no palco vai como comando, com saneamento e limite por segundo;
- a aparência ganha as fantasias novas e o `patins` (o deslize é só no aparelho).

As 36 sessões gravadas não mudam: o planejador só existe com os povoados ligados, como o canto da 031.

**Rodada 3:** o bairro (parte 1) cabe na mesma subida para 8: planejador, blocos e exclusivos. A parte 2 (o parque) traz estado novo no núcleo: quem está sentado em cada cadeira de brinquedo e onde cada cadeira está. Ela sobe para **9**, de novo com o site e o servidor juntos. A parte 3 (a casa e a rampa) traz o canal da TV da sala e o trilho da rampa, e vai na mesma subida da parte 2 se vierem juntas.

## Fases
**Parte 1 (esta spec, 026):** o bairro e o festival. As fases abaixo, com o planejador do bairro inteiro na F1 (ruas, calçadas, casas de fachada, a Rua anos 80, a pracinha) e o rinque com os patins na F5.
**Parte 2 (026b):** o Parque de diversões (sentar no brinquedo, roda-gigante, carrossel, bate-bate, fazendinha). **Parte 3 (026c):** a Casa anos 80 por dentro e a rampa de skate.

| # | Fase | O que entra |
| --- | --- | --- |
| F1 | **Pele e terreno** | o tema registrado (nome Festival Trovão, céu, água, cores, cartão); `ceu.pisoNoite`; os blocos 103+ e os exclusivos; o planejador do festival; proteção; nascer vendo o palco; `estiloSeguro`; paridades |
| F2 | **Gente e bichos** | moradores e trocas (roadie, lanche, o pôster do vocalista); a lhama e o ouricinho fofo; a comida da barraca; o feno dos fardos |
| F3 | **O show no núcleo** | instrumentos, caixas, o show no tempo, o toque no palco, o acorde final, as caixas como brinquedo depois; comandos com saneamento, teste no modo nuvem; `VERSAO_REDE` 8 |
| F4 | **Alma e missões** | o `MundoAlma` do festival, f1–f3 (com a lhama que segue até a grade), banca, guia da 030 no festival, desenhos, baú; o quadro em pé sem corte |
| F5 | **Fantasias e patins** | as 3 fantasias, o cabelo comprido e liso ligado por padrão (nunca maior que o boneco), os patins (suporte, animação, deslize só na pista) e a aparência na rede |
| F6 | **Som e brinquedos de tocar** | trilha em camadas, acorde final, aplauso; fliperama, fita, rádio e pista |
| F7 | **Acabamento e fechamento** | desempenho no meio do show, capturas, vitrine, auditoria, publicação, rodada em família e relatório visual |

Uma fase por vez (o computador do dono é um só).

## Experiência medida (para não frustrar)
- **Ver o que fazer em 10 s:** ao nascer, o palco está à vista (20 de 20 sementes testadas).
- **Primeiro instrumento em até 1 minuto** com o guia; as três missões em até 6 minutos no ritmo de criança.
- **Nenhum toque perdido no show:** todo toque no palco toca, encaixado no tempo em até 1/8 de compasso, e nunca desafina.
- **O acorde final** sai em até 100 ms do toque; sem toque, vem sozinho em 4 s.
- **Patins:** velocidade máxima igual à de andar (medida); deslize de 0,5 ± 0,1 s só na pista; nenhum tombo; degrau e escada como andando.
- **A lhama** segue o feno até a grade sem se perder (no máximo 25 blocos do pastinho à grade, caminho livre).
- **Desempenho:** 45 quadros no celular de noite no meio do show (8 holofotes, confete, faíscas, 12 moradores, 2 lhamas); se não couber, primeiro sai metade do confete (a fumaça já saiu: decisão do dono).
- **Volume:** a música do show abaixo dos efeitos e das vozes (régua da 019).
- **Nada tapa o HUD** com o quadro, a banca e a festa abertos (1280×720, 844×390 e 390×844); o quadro em pé mostra as três missões inteiras.
- **Rodada em família** antes de publicar.

## Cuidados legais (ver `.sdd/cuidados-legais.md`)
- **Pessoas e marcas reais:** só arquétipos da época. Nenhum rosto, nome, assinatura, figurino de palco, logotipo, mascote, capa de disco ou música de alguém de verdade. O vocalista é o boneco do jogo com peças genéricas da época; a pose de microfone erguido e o bater cabeça são gestos comuns do gênero. "Rock in Rio" é marca registrada: o mundo diz só "festival" e o símbolo é o nosso raio. A "banda do festival" do pôster é inventada e não tem nome escrito.
- **Fliperama:** jogos inventados, sem personagem, nome ou forma de jogo conhecido.
- **Música:** composta aqui, nota por nota. Antes de publicar, alguém que conheça o rock da época ouve a amostra para conferir que não lembra nenhum riff ou refrão famoso.
- **Para crianças:** sem caveira, chifre, fogo, bebida, cigarro, briga ou susto; tachinhas sempre redondas (nunca espeto); o ouricinho é de pelúcia, sem espinho pontudo; pirotecnia são estrelinhas frias.
- **Sem arco-íris em roupa e objeto:** cores fortes à vontade, nunca o espectro em ordem como faixas, nem bandeira.
- **Moedinhas:** só no fim da missão, mostradas antes; banca com preço fixo; os patins são de graça (nada de "compre para patinar").
- **Arte original:** tudo feito aqui, em código.

## Riscos
- **Atlas:** só 15 lugares livres; o tema cabe em até 8 texturas novas.
- **Piso de luz da noite:** mexer no material do chão é global; o campo do tema tem padrão 1 e as capturas dos outros temas conferem que nada mudou.
- **Desempenho do show:** feixes transparentes, confete e a explosão do acorde final em instâncias e com teto (no esboço, conferidos só de olho).
- **A música sincronizada com amigos:** o núcleo manda o tempo do show; cada aparelho toca a música do pacote dali.
- **Patins:** o deslize no aparelho não pode divergir da posição autoritativa; por isso só 0,5 s, só na pista e corrigido suavemente.
- **Cabelão grande:** não pode atravessar capuz, chapéu ou ombro; o teste de encaixe da 017 cobre. O balanço no tempo é só na cabeça (o cabelo é preso nela), sem física.
- **Cabeça grande do boneco:** o braço levantado não passa da cabeça; a pose-símbolo usa o microfone erguido à frente e as pernas abertas.

## O que o esboço tem de provisório
- **Céu, texturas e o piso de luz:** o céu foi trocado por um entardecer magenta e uma noite roxa; lãs repintadas (vermelho, azul-elétrico, grafite) e o vidro como moldura; o piso de luz do chão foi baixado na hora pelo esboço (na F1 vira `ceu.pisoNoite`).
- **Mundo-base:** um mundo do Rancho Alegre aplainado (árvores da beira são do Rancho).
- **Peças** montadas peça por peça, sem fundir; na implementação, fundidas e instanciadas.
- **Missões, banca e festa:** as peças de verdade da 023 e da 031 com dados do esboço; nada vai ao núcleo nem à rede.
- **Patins:** só a pose da remada, as faíscas e o suporte (sem o movimento de verdade).
- **O palco do esboço** não entra no jogo: `src/esboco/anos80*.ts`, `?esboco=anos80` e `e2e/esboco-anos80.spec.ts`.

## Perguntas ao dono (rodada 3, respondidas em 15 nov 2026)
1. **Dividir em três partes** (o bairro e o festival primeiro; depois o parque; depois a casa e a rampa)? Recomendo que sim, pela regra "menos recurso, mais acabamento". Cada parte é publicada inteira e caprichada.
2. **Nomes nas lojas** (Locadora Fita Mágica, Banca do Bairro, Lanchonete Dois Canudos, Parque Alegria, e o letreiro VILA NEON na pracinha): pode ter letreiro com nome escrito no mundo? Recomendo que sim, só nos letreiros (é o que dá cara de rua dos anos 80). Nenhuma palavra na interface, como hoje, e nenhum nome de marca de verdade.
3. **A criança nasce na pracinha,** com o mural de recados como o canto das missões? Recomendo que sim: dali ela vê o festival e a roda-gigante.
4. **Os brinquedos de sentar do parque (parte 2):** a roda-gigante, o carrossel e o bate-bate? Recomendo os três, com o bate-bate andando sozinho.
5. **A rampa de skate (parte 3) com subida e descida automáticas,** sem manobra e sem tombo? Recomendo que sim, ou cortar o skate de vez se o dono preferir o rinque só com patins.

### Perguntas que ficaram da rodada 2
Respondidas em 14 e 15 nov 2026 (ver "Decisões do dono"):
1. **O acorde final vem sozinho se a criança não tocar em 4 s?** Recomendo que sim: o show nunca fica parado esperando.
2. **Os patins ficam só neste mundo** (ao ir para outro tema, o personagem sai sem eles)? Recomendo que sim, pela regra da 014 e da 018; dentro do festival eles ficam calçados até a criança tirar.
3. **O quadro em pé sem o corte da próxima vale para todos os mundos?** Recomendo que sim: a mudança é pequena e tira o selo cortado também na Cidade, no Rancho, nos Dinos e no Doce.

## Decisões do dono
- **17 nov 2026 (parte 3, etapa A: a Casa anos 80 por dentro e a rampa de skate; as missões vêm na etapa B, depois de o dono escolher).** Escolhas de quem implementou, para o dono conferir:
  1. **A casa cresceu para o leste** (o lote vai de u 43 a 62; as duas árvores do lado foram para u 67) e ganhou **paredes de cinco blocos** e o telhado mais baixo (um degrau a cada dois blocos). A porta aberta, de dois blocos, fica na frente do portãozinho; o poste da calçada que ficava na frente dele foi para o lado.
  2. **A câmera lá dentro (o risco maior):** com a criança dentro da casa, **o telhado some** (aos pedacinhos em 0,35 s, só no desenho) e **as paredes que ficam entre a câmera e a criança somem também**, e a do lado quando a câmera chega perto dela; a do meio fica sempre só na fileira de pedra lá dentro (some até o alto da fileira de pedra de baixo, que fica com uma tampa, a planta da casa no chão; as paredes em pé ganham uma tampa no alto; o relógio e as cortinas da parede que sumiu somem junto). A câmera sobe e olha a casa de cima (a uns 6 blocos, inclinada 42°, com o campo de visão 30% mais aberto lá dentro: na porta a sala já lê inteira), **como uma casinha de bonecas**, e nunca sai da casa: o lado de fora segura a câmera (de cima da parede ela via o avesso do telhado). Ela pode girar à vontade; mais deitada que 31° ela volta sozinha. Na saída tudo volta. Sem telhado, a sala tem a luz do dia; de noite o abajur acende e a sala fica morna.
  3. **A sala:** a TV de tubo de madeira (antena, botões, a grade do som) em cima do móvel com o **videocassete**, o console de cartucho genérico (cartucho vermelho, sem nome) com os dois controles no tapete, a estante de fitas cassete com o rádio-gravador em cima, o toca-discos no móvel de madeira com as duas caixinhas de som, o sofá xadrez (ferrugem, marrom e um fio claro), o tapete vinho de losangos mostarda, o abajur, a mesinha do telefone de disco vermelho, o relógio de parede (anda com a hora do mundo), a planta, as cortinas laranja e o capacho.
  4. **O quarto de brinquedos** (pela passagem larga da parede do meio): o tapete de quebra-cabeça em três cores, o ioiô no suporte, o pião, o cubo de cores 2 × 2 (em três cores: amarelo, vermelho e azul; nunca o de marca), o robô de lata, a bola e o baú azul de tampa amarela.
  5. **Os toques (cada um com a dica, só o toque de verdade):** a **TV** troca o canal ("Toque para trocar o canal"; quatro desenhos nossos em laço: o sol saltitante, o peixinho, o foguete e o carrinho; o chuvisco de 0,3 s e as bolinhas verdes do canal no canto, sem número); com **a fita da locadora na mochila**, a dica é a do **videocassete** ("Toque para pôr a fita": o filme de 20 s "a lhama e o balão", com a contagem de bolinhas, as tarjas de cinema e a íris no fim; a fita continua na mochila); o **toca-discos** ("Toque para ouvir": o braço desce, o prato gira, notinhas sobem das caixinhas; outro toque para); o **telefone** ("Toque para ligar": o fone pula tocando e levanta quando a voz boba do orelhão atende); o **sofá** ("Toque para sentar"); **o ioiô, o pião, o cubo e o robô** ("Toque para brincar": o ioiô desce e sobe duas vezes, o pião fica de pé, roda e deita, o cubo gira a face de cima, o robô vira, anda dois passos e para, e no toque seguinte volta); a **bola** quica (sem dica); o **baú** ("Toque para pegar") dá o ioiô, o pião e o cubo para levar, um de cada (com os três, ele não chama mais). A TV alcança do sofá (como quem tem o controle remoto).
  6. **Os brinquedos para levar vêm do baú** (e não do brinquedo do chão, que continua lá para brincar): um toque no chão é brincar; pegar é no baú. Eles vão para a mão com o "pop", como a fita e a vitamina, e só existem neste mundo.
  7. **A TV e o disco são da sala, de todos** (o núcleo guarda o canal, quando mudou, até quando passa o filme e desde quando o disco toca; cada aparelho desenha e toca no relógio do núcleo). **A esperinha da sala**: 1,2 s entre duas trocas de canal (de qualquer um) e 1,5 s entre duas viradas do disco; **o filme passa até o fim** (durante ele o canal não troca). Nada vai salvo: ao abrir o mundo a TV está no primeiro canal.
  8. **Sentar no sofá:** o pulinho até o assento livre mais perto (o do leste é da vovó, nunca), de frente para a TV, e o gesto de sentar da 015 (os amigos veem); andar desce.
  9. **A vovó mora no sofá** (o posto `avo` é o assento dela; o núcleo a põe sentada, a tela a desenha com a pose de sentar). A f8 continua igual (é só chegar perto com a prenda); a trilha do guia entra pela porta e acaba na frente dela.
  10. **O som:** a musiquinha de cada desenho e a do filme saem da TV, a do disco das caixinhas (tudo composto aqui); **do lado de fora da casa vem abafado** (um passa-baixa fecha em 650 Hz e o volume cai 7 dB); dentro, a trilha do bairro baixa. O "tic" e o chiado da troca de canal, a fita entrando, a agulha, o baú, o sofá, o ioiô, o pião, o cubo, os passinhos de lata do robô, a bola e o "clac" da rampa, tudo feito na hora.
  11. **A pista de skate** (o jardim do sudeste): a mini rampa em U de concreto (o fundo de 6 blocos, as curvas de raio 3,5 até a borda de cromo a 1,4 de altura e os decks), com grafite de formas (ondas nas paredes de fora, o raio e a estrela nas pontas, sem palavra), o piso de pedra em volta, quatro bancos, o suporte dos skates (três skates de pé), a BMX de enfeite, árvores, canteiros, postes e a passagem nova pelo jardim do rinque (a entrada do norte).
  12. **O skate:** um toque no suporte pega ("Toque para pegar"), outro guarda ("Toque para guardar"; e "Guardar skate" na roda do menu, só de skate), como os patins (nunca junto deles). De skate a criança fica de pé na prancha (turquesa, rodinhas amarelas) e anda como sempre.
  13. **A rampa é um trilho do núcleo:** de skate, no fundo, empurrando o controle para uma das curvas perto do pé dela, o núcleo põe a criança no trilho: o skate sobe a curva freando, para lá em cima com o "clac" e vira de frente, desce e atravessa o fundo até o pé da outra curva (uns 3,4 s). **Segurando o controle (para qualquer lado), vai e vem; soltando, para.** O boneco deita junto com a prancha na curva; a câmera vira devagar para olhar ao longo da rampa (o vai e vem de lado na tela). A pé dá para subir a curva em degrauzinhos. O trilho inteiro conta a chave `andou:rampa` (para a etapa B).
  14. **Os moradores da pista:** a Lelê, menina do skate (camiseta rosa, short jeans, joelheiras, boné turquesa para trás e o skate debaixo do braço), e o Tito, menino da BMX (camiseta azul, capacete amarelo); sem trocas.
  15. **Cortado, e por quê:** a criança jogando videogame no tapete (ela sentaria no chão na frente da TV e taparia a tela vista de cima); usar o ioiô, o pião e o cubo na mão (eles ficam na mão e na mochila, mas o "usar" pedia um gesto novo bem acabado: fica para depois); o bolo de fubá da vovó (é troca, vem com as missões); a tampa da fita entrando no videocassete (o som faz o papel).
  - `VERSAO_REDE` 14 (os lotes mudam a geração do bairro e as peças sólidas; o comando `vila` ganhou `tv`, `videocassete`, `disco`, `bau` e `rampa`; o quadro da vila, a `casa` e a `rampa`; o `skate` na aparência; a vovó no sofá; dois moradores; três itens). A paridade não tem Vila Neon.
- **17 nov 2026 (parte 2, etapa B: as quatro missões do parque e os toques da Rua anos 80).** O dono escolheu as quatro missões. Escolhas de quem implementou, para o dono conferir:
  1. **As moedinhas: 5 + 4 + 4 + 5 = 18** (o mundo passa a dar 33). O bilhete e a prenda, que pedem mais, dão 5; os balões e o lanche, 4. Com 6 + 4 + 4 + 6 o unicórnio da lojinha chegava na 5ª sessão de quem começa pela Vila Neon, e o ritmo da 023 pede entre a 6ª e a 8ª (o teste do ritmo é que decidiu). Ids `f5` a `f8`, depois da f4; pagas só no fim de cada missão; sem fantasia.
  2. **f5 Bilhete do parque:** o passeio inteiro em cada brinquedo carimba o dele (a volta da roda-gigante, uma volta do carrossel, o passeio do bate-bate: três batidas ou vinte segundos guiando). **Só carimba com a missão aberta** (o passeio de antes não conta: ela anda de novo). Cada carimbo é um "lugar" da missão (como o passeio da cidade): a bolinha de cada brinquedo acende no lugar dela, na ordem em que a criança quiser. A trilha leva ao brinquedo sem carimbo mais perto; lá, a dica "Toque para andar" mostra o resto. Como o passeio da cidade, **o bilhete e a prenda não voltam no bis** (acontecem uma vez).
  3. **f6 Balões fugidos:** três balões (vermelho, amarelo e azul) presos no pé da roda-gigante (do lado de fora da grade), na copa de uma árvore do passeio e na barra do toldo do carrossel (gira com ele). **O toque no balão, de perto e de baixo (até 8 blocos no chão), conta na hora**: o balão desce até a mão, fica um instante e sobe de volta para a Dona Flor, que acena. Não há a caminhada de devolver (três idas e voltas cansavam). No terceiro, a festa e **um balão de presente** (turquesa ou amarelo), que fica na mão dela neste mundo (salvo com o mundo; os amigos também veem). Cada criança vê e pega os balões dela.
  4. **f7 Lanche das lhamas:** o toque no fardo da beira do caminho põe o feno na mão; o toque no cocho põe o feno nele. **Duas braçadas** (uma para cada lhama). As duas lhamas da fazendinha vêm para o cocho, comem e pulam (mais na segunda). O cocho fica vazio fora da missão (só uma caminha de palha).
  5. **f8 Prenda para a vovó:** um toque na argola e um na pescaria (a ordem que quiser, sempre acerta); com as duas, a **lhama de pelúcia** (creme, cachecol vermelho, mantinha azul) vem para a mão. A **vovó (Vó Zezé, boneca de verdade: coque grisalho, óculos redondos, casaquinho lilás, saia comprida e avental)** espera **no portãozinho aberto da Casa anos 80, no vão do muro baixo do quintal, de frente para a calçada** (primeiro ela ficou na porta, debaixo do beiral, mas lá dentro do quintal o muro baixo tapava a criança e ela na câmera); é só chegar perto com a prenda (3,4 blocos) e ela recebe, comemora, solta corações e fica uns 20 segundos com a pelúcia nos braços. Sem a pelúcia na mochila ela recebe do mesmo jeito (nada se perde). Ela é o morador 70 do bairro, com o posto `avo` no plano: a parte 3 muda só esse ponto para levá-la ao sofá. Ela não tem trocas (o bolo de fubá é da parte 3).
  6. **Os toques da rua** (o toque de verdade: arrastar o dedo por cima continua da câmera), cada um com a dica de toque: **o orelhão** ("Toque para ligar": toca duas vezes e uma voz boba atende, uma de seis falas em roda, nunca a mesma duas vezes seguidas); **a locadora** ("Toque para pegar": uma fita de vídeo na mochila, item de verdade, uma por vez; a parte 3 a põe na TV); **a lanchonete** ("Toque para pedir": o liquidificador, a moça acena e a vitamina de morango vai para a mochila, até duas; é comida como as outras); **a banca** ("Toque para ver": uma de quatro capas inventadas, grande, sem nenhuma letra; qualquer toque fecha); **a campainha das bicicletas** (sem dica: são muitas).
  7. **A voz do orelhão é nossa, feita em código** (uma fonte de pulsos por três formantes, na faixa de telefone): "alô-ô?", uma risadinha, um "la-la-láá", um "óóh!", um blá-blá que acaba em beijo e um bocejo. Não imita ninguém. A vovó e a lhama feliz usam a mesma voz. Tudo feito na hora (nada novo no pacote de sons).
  8. **Cortado, e por quê:** o letreiro que pisca ao toque (os letreiros são luz assada na malha do pedaço: não dava para piscar um só com capricho); o orelhão, a bicicleta e o liquidificador não se mexem (também são da malha do pedaço): respondem com o som e uns risquinhos amarelos de "trim" por cima.
  9. **Acertos da revisão das fotos (de dia, de noite, em pé e deitado):** a dica de toque nunca aparece em cima do joystick nem dos botões de pular e correr (vale para todas as dicas da vila: ali a mãozinha confundia e o dedo pegava o joystick); com o dedo entre o balão preso no pé da roda-gigante e a cadeirinha, vale o que está mais perto do dedo; as lhamas param com a cabeça em cima do cocho (paravam a dois blocos e meio); **a festa do balão, do lanche e da prenda espera de 3 a 5 segundos** para a criança ver o fim no mundo (o balão de presente chegando, as lhamas comendo e pulando, a vovó comemorando); o balão de presente sobe um pouco mais e puxa para o lado da mão, com o fio mais fino (de costas, o fio sumia atrás da cabeça); o que chega na mão acende o espaço certo na barra de baixo.
  - `VERSAO_REDE` 13 (o comando `vila` ganhou `balao`, `prenda`, `feno`, `cocho`, `fita` e `vitamina`; os eventos `vilaBalao`, `vilaPrenda`, `vilaVovo` e `vilaLanche`; o quadro da vila ganhou `bal` e `balao`; a vovó; os itens `vitamina`, `fita_video` e `pelucia`).
- **16 nov 2026 (noite, depois de andar no parque): a câmera e as hastes.** (1) No bate-bate, **a haste do carrinho de quem guia não é desenhada** (a câmera vai atrás dele) e a de um carrinho a menos de uns 3,4 blocos da câmera afina até sumir; as lâmpadas do carrossel a menos de 3 blocos da câmera encolhem até sumir (de perto o cubinho aceso virava uma bola amarela na frente da tela); a câmera do bate-bate olha um pouco mais de cima. (2) **No carrossel a câmera vai junto do cavalinho, atrás e do lado de fora** (a 6,8 blocos do meio, fora do toldo, baixa o bastante para ver por baixo da barra): antes ficava parada no mundo e, uma vez por volta, atravessava a coluna do meio. Se a criança arrasta o dedo, a câmera é dela (volta a seguir depois de 2,5 s) e, colada na coluna, a coluna some.
- **16 nov 2026 (depois do vídeo da etapa A do parque): o bate-bate é de guiar.** O dono: "ele não toca... não bate de fato nos carrinhos. E também é um carrinho atrás do outro, fica uma impressão de carrossel... aumentar a pista do bate-bate, deixar maior para o usuário poder guiar o carrinho e bater no outro de fato. Seria muito legal se tivesse essa jogabilidade." O corte "dirigir o carrinho bate-bate" foi desfeito, e os itens 1, 2, 4 e 5 da etapa A (abaixo) mudaram no que toca o bate-bate. Escolhas de quem implementou, para o dono conferir:
  1. **A pista:** 24 × 13 blocos por dentro (era 14 × 10), no canto noroeste do lote, da cerca-viva até perto do laguinho; a beira do sul ficou onde estava, na ponta do caminho. Saíram seis árvores do canto. A mureta de borracha em gomos vermelhos e brancos dá a volta por dentro da grade (é nela que o para-choque encosta), e o **tapete verde da saída** fica na ponta do caminho, com gomos e lampadinhas verdes na mureta.
  2. **Guiar é apontar.** O controle (ou W, A, S e D) diz para onde ir, pela câmera, e o carrinho vira devagar para lá: 3,4 blocos por segundo no máximo, chega nessa velocidade em menos de um segundo, vira no máximo 2,5 rad/s. Não tem ré nem derrapagem: com o rumo para trás ele dá meia-volta quase parado e segue. A câmera vai atrás do carrinho, devagar; se a criança arrasta o dedo, é dela, e volta a seguir depois de 2,5 s sem mexer.
  3. **A regra de descer (uma só, clara):** **parar o carrinho no tapete verde** (o controle solto por um segundo em cima dele; o balãozinho "Pare aqui para sair" aparece ali), ou **"Sair do brinquedo" na roda do menu**, que vale em qualquer lugar da pista (ela desce na calçadinha mais perto). Empurrar o controle **nunca** desce do bate-bate (no carrossel continua descendo).
  4. **A batida é de verdade.** Cada carrinho é uma roda de borracha de 0,96 de raio; dois que se encontram se afastam, trocam um empurrão elástico (com teto, e que some em menos de um segundo) e perdem o embalo; a mureta devolve igual. Abaixo de 1,2 bloco/s um contra o outro é encostar (sem "tum"). No instante do toque: o "tum", o balanço dos dois, as estrelinhas no ponto onde os para-choques se tocaram e a faísca nas hastes. Nunca vira, nunca sai da pista, e quem empurra o controle sem sair do lugar por 1,1 s ganha um empurrãozinho para o meio. Nada de dano nem de placar.
  5. **Oito carrinhos:** quatro de **moradores** (Rafa, Mel, Dudu e Bia, bonecos de verdade, da turma do bairro, sentados com as mãos no volante) e quatro das crianças, estacionados na beira do sul, dois de cada lado do tapete. Os moradores passeiam devagar (2,4 blocos/s), de vez em quando vão brincar com uma criança que está andando, **desviam de criança parada** e, depois de bater numa criança, ficam longe dela 4,5 s. O carrinho sem ninguém volta sozinho para a vaga.
  6. **Quem manda é o núcleo.** Ele anda os oito carrinhos a cada passo (20 por segundo), só com alguém a menos de 80 blocos da pista. A criança manda o controle numerado (`guiar`); o quadro `bate` devolve os carrinhos e o número do último controle usado. A tela prevê o carrinho dela com a mesma conta e, a cada quadro do núcleo, refaz os controles que ainda não chegaram lá: a diferença some devagar, sem pulo. Quem só olha vê os carrinhos entre dois quadros (0,15 s de atraso). O controle é passado a limpo (inteiros de -100 a 100), com limite de 40 por segundo e fila de 4.
  7. **A missão:** a chave `andou:bate` conta com **três batidas em outro carrinho** ou **vinte segundos guiando**, uma vez por passeio (a etapa B usa para o "Bilhete do parque").
  8. **Dicas, sem nada fixo na tela:** "Toque para andar" no carrinho livre; sentada, "Empurre o controle para guiar" (no computador, "Use W, A, S e D para guiar") até ela sair do lugar; no tapete, "Pare aqui para sair".
  9. **O mastro do carrossel** (o dono, no mesmo dia: "como se estivesse entrando na cabeça dele"): o mastro agora passa pelo lombo do cavalinho, na frente da sela, 0,8 bloco à frente do assento (a cabeça do boneco é grande: quase um bloco); o cavalinho ficou mais comprido na frente e ganhou a **alça da sela**, onde as duas mãos seguram.
  - `VERSAO_REDE` 12. A paridade (Bruma e Luz e Doce Reino) não tem Vila Neon: os carrinhos não entram nela.
- **16 nov 2026 (parte 2, etapa A, na implementação: o Parque de diversões). Escolhas de quem implementou, para o dono conferir:**
  1. **O relógio do mundo move os brinquedos.** A roda-gigante, o carrossel e os carrinhos do bate-bate giram sempre (com ou sem criança), e onde está cada cadeira é uma conta do relógio do núcleo: todo mundo vê a mesma coisa sem nenhuma mensagem por quadro. O núcleo guarda só quem está sentado em qual cadeira (e o empurrãozinho da roda).
  2. **Uma criança por cadeira** (8 na roda, 8 no carrossel, 6 no bate-bate); dois amigos andam juntos em cadeiras vizinhas. A spec falava em dois na mesma cadeirinha da roda: ficou uma por cadeirinha (mais simples e sem um boneco dentro do outro).
  3. **A roda-gigante:** o toque senta na cadeirinha que está embaixo; uma volta inteira (entre 23,5 e 26,5 s) e a criança desce sozinha na frente da roda, com estrelinhas. A cadeirinha olha ao longo da roda, para o oeste (a Rua anos 80 e o festival), e a câmera vai sozinha para trás dela, entre os dois aros, com a vista livre; se a criança arrastar o dedo, a câmera é dela.
  4. **Descer do carrossel e do bate-bate:** "Sair do brinquedo" na roda do menu (só aparece sentada, como o "Tirar patins") e, a mais, **empurrar o controle para andar por meio segundo** também desce (uma criança de 3 anos não acha a roda do menu).
  5. **O bate-bate:** sentada, cada toque na tela é um "tum" no carrinho da frente (balança, pulinho, estrelinhas, a faísca na haste); o carrinho dela dá um tranquinho. Nada sai do lugar de verdade: é só desenho e som.
  6. **As lhamas:** a fazendinha é um segundo cercado, com duas lhamas dela; as da f2 continuam no cercadinho da beira do campo (a missão não mudou).
  7. **Os sons são feitos na hora** (nada novo no pacote de 2,37 MiB): o realejo é uma valsa nossa em Dó maior, 16 compassos em laço.
  8. **Pipoca e algodão-doce:** o toque faz a pipoca estourar (com o sininho) e a cuba girar, e o pipoqueiro acena; comprar e comer de verdade fica para a spec seguinte. O pipoqueiro é cozinheiro e já oferece a troca da pipoca que o bairro tinha.
  - `VERSAO_REDE` 11.
- **16 nov 2026 (depois de jogar o show publicado: "fluiu, iniciou e terminou normal, subiram no palco, desceram"): cinco acertos.**
  1. **O bastão de luz aparecia através do corpo** (olhando a turma por trás). A causa: os bonecos ficam fora do mapa do brilho da cena, então nada ali tapava o bastão, e a luz dele era somada por cima de quem estava na frente. O bastão saiu do brilho da cena e ganhou a luz dele: o tubo de miolo claro e uma casquinha de neon somada (cheia de frente, sumindo na beira), desenhada com a profundidade de sempre. O friso de neon do teclado de pendurar continua no brilho, e o corpo do teclado, o da tecladista e o do vocalista passam a tapá-lo. O microfone nunca brilhou.
  2. **O jogo oferecia de novo as missões já feitas** (em todo mundo com missões, não só na Vila Neon). A causa: acabada a lista, as abertas viram o bis (as mesmas, de novo, 2 moedinhas), e o convite (o baú com "?", depois de 2 min sem missão) convidava para ele. Agora **o convite só aparece para missão que a criança ainda não fez neste mundo; com tudo feito, o jogo não oferece nada**. O quadro continua sem abrir sozinho. O bis da 023 não foi tirado: quem abre "Missões" na roda por conta própria ainda o acha lá (fica a pergunta ao dono se ele quer tirar também). A missão de bis que acaba sai do selinho, como as da lista.
  3. **Os patins são uma escolha da criança.** A causa do "entrar no rinque calça sozinho": o suporte fica na entrada do rinque e qualquer dedo que descia perto dele calçava (até o dedo que arrasta para virar a câmera); o mundo salvo de patins voltava de patins; e a Patinadora calçava sozinha. Agora: só o toque de verdade no suporte calça (o dedo desce e sobe no mesmo lugar), outro toque tira; **"Tirar patins" na roda do menu, só enquanto ela está de patins**, tira em qualquer lugar; ninguém entra no mundo de patins; a Patinadora não calça (o suporte é o único jeito, e a f4 leva primeiro a ele, como já levava). Resposta na hora: calçando, um pulinho, as rodinhas, o "plim" e faíscas de neon nos pés; tirando, o som de guardar e uma poeirinha. **Fora da pista os patins continuam no pé (a escolha foi dela) e não mudam o andar: anda e corre como sempre**; na pista, o embalo de 0,5 s e nunca mais rápido que andar. No núcleo nada mudou (quem está de patins é a aparência, como antes).
  4. **A turma (e os bichos) sumiam no portão do festival, na frente da gente.** A causa: quem ia embora andava até o portão e era tirado do mundo ali, de um passo para o outro; quem chegava nascia no portão. Agora **ninguém some nem aparece à vista**: quem vai embora sai pelo portão, pega a calçada da avenida e a das casas e entra no quintal de casa (as seis casas a oeste do festival), e só sai do mundo onde nenhuma criança pode estar vendo; quem chega nasce fora da vista (no lugar dele, numa calçada da avenida ou no quintal) e vem andando, um de cada vez, atravessando na faixa de pedestre. O núcleo não conhece a câmera: a conta (`alguemVe`) é de quem tem medo de errar (a até 16 blocos tudo se vê; até 56, tudo o que não está bem atrás de quem olha; parede não conta). À vista, quem chegou em casa fica de papo no quintal. E na tela, quem entra no mundo cresce e quem sai de repente encolhe (0,3 s): nenhum bicho e nenhum morador pisca. Os bichos que saem do festival já saíam andando e ficavam no mundo (não achei no núcleo onde sumiam; agora há o teste disso e a tela não deixa nenhum piscar).
  5. **Na roda cheia os ícones e os nomes ficavam um em cima do outro** (11 gestos na Vila Neon com os presentes de nível e o roqueiro; 11 itens no menu). A roda agora mede os nomes e abre até nada encostar em nada; quando a tela acaba de um lado, vira oval (em pé mais alta que larga; deitada mais larga que alta); o nome comprido quebra em duas linhas; só em último caso a letra e o botão diminuem (nunca menos de 46 px). Conferido de 320 px de largura ao computador, com até 14 itens.
  - `VERSAO_REDE` segue 10: nenhum comando, evento ou campo novo (o núcleo usa o olhar que a criança já mandava; os patins continuam na aparência).
- **16 nov 2026 (depois de jogar o show de verdade: "melhorou bastante"): o show separado das missões.**
  1. **Os bichos invadiam o show** (e o passarinho cantava por cima da música). Agora o festival inteiro (dentro do alambrado) não tem bicho solto, sempre: nenhum nasce lá dentro, o portão e o alambrado são cerca para eles, e quem já estava dentro sai a pé pelo portão (`zonaSemBichos`, `bichoSolto`). Passam as lhamas do cercadinho (moram ali), o bicho que segue a comida na mão da criança, os criados e os moradores. No show, perto do festival, nenhum bicho nem morador chama (nem a lhama da grade) e a natureza cala 30 dB (era 12).
  2. **A banda ficava presa no palco** ("desceu para subir de novo e ficou presa"). A causa: de dia a banda ficava no palco; quando a noite chegava, quem estava a caminho virava "atrasado" e andava por uma rota refeita a cada passo; nos degraus da escadinha a rota mandava voltar ao pé dela e, um passo depois, subir de novo: a pessoa ficava indo e voltando entre o pé e o primeiro degrau. Agora: **fora do show a banda nunca fica no palco** (de dia de papo na frente da van, atrás do palco; de noite na coxia, no chão do lado da escadinha; a roadie fica na coxia); a rota pelos degraus segue para o lado de onde vai; o caminho de quem anda fora da coreografia é feito uma vez e seguido; e quem está a mais de 4 blocos da coxia quando o show começa aparece nela, no escuro da abertura. Teste: a banda começa de qualquer lugar (tablado, degraus, praticável, ponta da passarela, atrás do teclado, chão longe) e chega ao lugar dela até o fim da entrada.
  3. **A tecladista** (Nina Lua, morador 62): toca o teclado que já ficava no palco, entra com a banda (sobe a escadinha depois da baixista), balança tocando, levanta a mão no começo dos refrões e, no último refrão da segunda música (o gancho no sintetizador), pega o teclado de pendurar e vai para a frente do palco; as teclas do teclado acendem no tempo da música enquanto ela toca. O look é do jogo (boneco de verdade), anos 80, sem rosa (é da dançarina) e sem arco-íris; cabelo médio, nunca maior que o boneco.
  4. **O show é um acontecimento do bairro, sem missão:** começa sozinho toda noite com alguém no festival (as três caixas acendem sozinhas uma a uma, como aviso), uma vez por noite. Tocar nas caixas não começa nem adianta o show: elas são brinquedo livre fora dele (liga e desliga a camada), e não fazem nada no show nem enquanto acendem sozinhas. **Saiu o chamado do acorde final** ("não fica claro e não faz sentido"): o acorde final vem sozinho; e **saiu o acorde do toque no palco**: o show é só para ver e dançar (o dedo é todo do jogo: o arrastar gira a câmera o show inteiro). Saiu a passagem de som de dia (a banda não está no palco). Fica o palco que aquece quando a noite chega (o aviso de que vai ter show).
  5. **O público dobra na hora do show:** 40 moradores de verdade (os 20 de sempre ficam pelo festival de noite; os outros 20 chegam pelo portão para o show e vão embora depois), com a mesma cara dos bonecos do jogo (duas roupas novas da turma: a viseira com a munhequeira e o moletom de ombro caído, nunca rosa). Para caber no celular, o boneco dos moradores ficou mais barato sem mudar o desenho: as peças do mesmo material de todas as juntas viraram uma malha só com esqueleto (cada vértice preso à junta dele, como os bichos da lojinha da 023), de ~14 para 3 chamadas de desenho por boneco, e as bolinhas pequenas (o brilho do olho, a boca, o botão do boné) com menos gomos.
  6. **A f3 nova, escolhida pelo dono: "Volta no rinque"** (id novo `f4`, 6 moedinhas): a criança calça os patins (de graça no suporte do rinque, ou com a Patinadora) e passa por dentro dos três arcos de neon da pista (o do oeste e o do leste passam-se andando para o sul e para o norte, o do fundo para o leste: uma volta em torno do globo). Conta no núcleo (`rinque:arco`, um por arco, só de patins, cada jogador os dele); sem pressa nem ordem; o vão tem uns 4 blocos. Os arcos são de blocos (pilares de cubos grafite, trave com lampadinhas, a estrela), o tubo de neon apagado por dentro acende para quem passou, pisca e solta estrelinhas com o "plim". O guia leva primeiro ao suporte dos patins e depois ao arco apagado mais perto. A dançarina foi para debaixo do globo (o arco do oeste ficava onde ela dançava). Quem tinha feito a f3 do show faz a f4 também; as moedinhas de antes ficam. Saíram a f3, a lua no cartão e no selinho e a espera da noite do guia.
  - `VERSAO_REDE` 10 (o comando `vila` só com a caixa, o evento `vilaArco` no lugar do `vilaAcorde`, os `arcos` de cada jogador no quadro, a banda com a tecladista e os números novos, o público dobrado, os arcos nas peças sólidas e a f4).
- **15 nov 2026 (noite, no iPhone): o show começa sozinho, toda noite.** O dono: "o mundo ficou muito bom graficamente, só o show que não começou nunca, fiz todas as missões, mas não começou, a galera só ficava ali em rodas, mas só saía som de passarinho e ninguém dançava"; e depois: "mas eu toquei nas caixas de som!" (elas acendiam e soltavam luzinhas, mas nada tocava).
  - **O que travava:** (1) o show só começava com as três caixas acesas por toque, e nada levava a criança até elas sem a f3 no selinho; (2) o toque só valia a 7 blocos da caixa, mas a tela oferecia as três a quem estava em qualquer ponto do palco: do meio do palco só a caixa do meio acendia e as outras não respondiam; (3) depois de um show a rodada fechava para sempre (salvo como `tocou`): nas noites seguintes cada toque só ligava e desligava a caixa (com as luzinhas), sem show; (4) no fim da tarde roxo, antes da noite do show, o toque também só ligava e desligava; (5) a natureza seguia a noite do sol, que só fecha em 0,79: no começo da noite do show (céu roxo, a turma com bastão de luz) ainda saía passarinho.
  - **Agora:** toda noite de show, com alguém no festival (a zona do festival e 6 blocos em volta), as caixas apagadas **acendem sozinhas uma a uma** (1,2 s entre elas, cada uma com o "tum" e um acorde do show) e a banda toca; a turma vai para a grade e dança. As esperas: 20 s de noite de show e 6 s de alguém no festival (quem chega de noite vê começar logo); com a f3 aberta para alguém perto, 35 s, para a criança acender ela mesma, sem pressa nenhuma (se não der, elas acendem sozinhas e a f3 fecha igual no acorde final para quem estava no show). **Um show por noite** (`idDaNoite`: a madrugada é da noite de antes; salvo em `extras.vila.noite`; o `tocou` de antes é ignorado e o mundo abre igual; salvo no meio do show, a noite fica aberta). Quando a noite chega, as caixas acesas de dia (ou do brinquedo livre de ontem) se apagam, para acender de novo. Escolher a f3 de novo reabre o show da noite.
  - **As caixas ao alcance de onde a criança está:** palco, pé do palco e a plateia inteira (`alcancaOPalco`, a mesma conta na tela e no núcleo): da grade a criança toca nas três.
  - **Passarinho não canta de noite, em nenhum mundo:** os bichos têm a noite deles (`noiteDosBichos`): à tarde ela vem adiantada (0,06) e fecha antes de a noite do show abrir; de manhã segue o sol. Enquanto o show toca, a natureza baixa (já era assim).
  - Determinístico; `VERSAO_REDE` segue 8 (nenhum campo novo no protocolo: a caixa que acende sozinha vai com `quem: 'auto'`).
- **15 nov 2026 (depois do fechamento da parte 1): o show só na noite do jogo e o público de uns 20.**
  - **O show acontece só de noite** (antes o show trazia a noite). O núcleo só começa o show com `noiteDeShow(hora)`: `noiteNaHora` adiantada de 0,025 acima de 0,15, que abre perto de 0,734 (uns 30 s antes de escurecer de vez, o entardecer roxo já vale) e fecha perto de 0,216. Com o dia de 20 min e o mundo nascendo às 0,32, a primeira noite de show chega com uns 8 min de jogo. O show que já começou termina mesmo que o dia chegue. Determinístico, paridade 36 de 36, `VERSAO_REDE` segue 8.
  - **De dia, a passagem de som:** a banda afina (a guitarrista balança a cabeça devagar, o vocalista testa o microfone, a roadie confere as caixas) e, de vez em quando, um "tum… tum" do bumbo ou uma batida de guitarra bem baixinha. As três caixas seguem brinquedo livre e não começam o show nem contam a f3.
  - **A f3 de dia:** a lua (céu roxo, lua crescente dormindo, duas estrelinhas, no traço dos desenhos das missões, lida a 28 px) no canto do desenho do cartão, no selinho e na placa em cima do palco. Sem trilha para o palco, sem mãozinha, sem texto, sem relógio. **Quando a noite chega:** o palco aquece (a beira e o raio acendem devagar, os holofotes sobem num leque macio), um acorde macio cresce, e a trilha da f3 acende sozinha. A f1 e a f2 não mudam; a f3 sempre pode ser feita numa noite seguinte, e os mundos salvos (inclusive no meio do show) abrem.
  - **O público (rodada 2 do dono, no mesmo dia):** primeiro pedi 40 a 60 pessoas, com 12 moradores na grade e uns 44 bonecos simplificados atrás; o dono viu que os simplificados tinham "cara de remendo" e decidiu: **uns 20 bonecos no total, todos com a cara dos bonecos do jogo, espalhados pelo campo** (nada de bloco apertado), sem nenhum boneco falso. São 20 moradores de verdade (a turma, cada um de um jeito: boné para a frente e para trás, faixa, colete de brim, jaqueta de tachinhas, cabelos curtos e médios). No show, seis ficam na grade, dois logo atrás e doze espalhados pelo campo até o meio, de frente para o palco; pulam, batem cabeça, batem palma e erguem os braços no tempo; oito seguram um bastão de luz em neon sorteado (nunca em ordem de arco-íris, nunca isqueiro nem fogo), que só aparece de noite. De noite sem show conversam em cinco rodinhas que mudam de lugar; de dia só 4 ficam. Ficam livres o caminho de cascalho, o corredor das lhamas até a grade, a volta da escadinha, as barracas, o estojo do festival e o rádio.
- **15 nov 2026 (na implementação):** **sem fumaça no show** ("só atrapalha a qualidade gráfica do jogo"). Ficam os feixes que pousam no chão escuro, o siga-me, as estrelinhas frias, o confete e o estouro do acorde final.
- **15 nov 2026 (rodada 4, aprovação): "Manda ver, vamos com suas recomendações".**
  1. **Três partes,** cada uma publicada inteira e caprichada. A **parte 1** (esta implementação) traz o bairro, a Rua anos 80, a pracinha onde a criança nasce (parquinho, letreiro VILA NEON e o mural de recados), o rinque com os patins, o fliperama e o Festival Trovão com o Show da Vila. A **parte 2** é o parque de diversões com o "sentar no brinquedo". A **parte 3** é a casa por dentro e a rampa de skate. Os lugares das partes 2 e 3 ficam reservados no mapa como um pedaço de bairro acabado e cercado (gramado, cerca-viva, árvores, canteiros), **sem placa de obra, sem "em breve" e sem texto**.
  2. **Nomes escritos nos letreiros das lojas: sim** (nomes inventados, em português), só nos letreiros do mundo, nunca na interface. Nenhuma marca de verdade.
  3. **A criança nasce na pracinha,** e o mural de recados é o canto das missões.
  4. (Parte 2) roda-gigante, carrossel e bate-bate, com o bate-bate andando sozinho.
  5. (Parte 3) a rampa de skate é automática, sem manobra e sem tombo.
  6. **O acorde final toca sozinho** se a criança não tocar em 4 s.
  7. **Os patins ficam só na Vila Neon;** ao trocar de mundo, o personagem sai sem eles.
  8. O quadro de missões em pé sem o corte da próxima vale para todos os mundos (a recomendação da rodada 2).
  9. **Missões da parte 1 sem o parque:** f1 um estojo por zona da parte 1 (rua, pista e fliperama, festival), 4 moedinhas; f2 as lhamas num cercadinho na beira do campo do festival, seguindo o feno até a grade, 5 moedinhas; f3 o grande show, 6 moedinhas. 15 no total, pagas só no fim de cada missão.
  10. Tudo o que foi decidido nas rodadas 2 e 3 continua valendo.
- 15 nov 2026:
  - o nome do mundo é **Vila Neon**, e o Festival Trovão é a zona do palco (o nome vai para a busca no INPI com Cubolândia);
  - o esboço sempre segue a identidade visual do jogo (blocos, árvores do jogo, nada de liso redondo), e isso vale para todo esboço;
  - campo de visão sem buracos, nada flutuando.
- 14 e 15 nov 2026 (rodada 3; substitui o "cabelão" da rodada 2):
  - o mundo é um **bairro anos 80 com cinco zonas** (Rua anos 80, Parque de diversões, Pista de patins e skate, Casa anos 80 por dentro e o Festival Trovão como o marco);
  - chão próprio, nada de Rancho;
  - densidade: algo novo a cada ~10 blocos;
  - o vocalista com **cabelo preto e liso**, e cabelo **nunca maior que o boneco** em nenhum morador ou fantasia;
  - o desenho completo por zona (sons, mecânicas, movimentos, interações, missões, itens e blocos).
- 13 nov 2026: aprovado como ideia. Começa por esboço, como os mundos da 013 e da 014.
- 14 nov 2026 (pedido): puxar agora, já nascendo completo; mais heavy metal, no clima dos grandes festivais dos anos 80; um vocalista marcante, nunca uma pessoa de verdade; muitas cores, sem arco-íris em roupa e objeto; "o melhor mundo do jogo, o mais caprichado, nostálgico".
- 14 nov 2026 (rodada 2, depois de uma segunda opinião):
  1. Nome **Festival Trovão**; o raio é a logo.
  2. **Show da Vila: sim**, com qualquer toque no palco tocando, o acorde final disparado pela criança (estrelinhas e plateia) e as caixas como brinquedo livre depois.
  3. **Missões:** f1 instrumentos (4), f2 levar as lhamas para o show (5), f3 o grande show (6); o quadro em pé sem corte.
  4. **Vocalista:** cabelão bem maior, comprido e em camadas que balança no tempo; pose-símbolo (pernas abertas, microfone no alto) e bater cabeça; na fantasia, o cabelão vem ligado.
  5. **Bichos:** o ouricinho do moicano (fofo, nada de espinho) e a lhama de franja.
  6. **Cortes mantidos**, sem minijogo de fliperama; no lugar, 4 brinquedos de tocar (fliperama, lápis da fita, rádio, pista que acende).
  7. **Mais metal:** grafite, cromo, brim, tachinhas redondas, vermelho e azul-elétrico; rosa só na dançarina e na pista; noite escura de verdade no chão.
  8. **Patins** de graça neste mundo (suporte na pista e fantasia Patinadora), fora da loja, com o movimento descrito acima.
  9. **Tudo do tema só neste mundo**, com os blocos, itens, comida, feno, trocas e banca listados acima.
