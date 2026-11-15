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
| **Palco gigante ao ar livre:** torres de andaime e treliça de metal dos lados, a grade de luzes por cima, paredes de caixas de som, fumaça, a passarela no meio do povo | O **Palco Trovão**, o prédio-símbolo do mundo: tablado grafite com fita no chão e beira vermelha, a **passarela** que entra na plateia (onde o vocalista canta), fundo grafite com o **raio de neon da logo** (cromo, vermelho e amarelo) e um arco de lâmpadas de cubinho de uma cor só, torres de treliça cromada com flâmulas do raio, 8 holofotes coloridos que varrem e o **siga-me** branco quente no vocalista, caixas de som penduradas (2 × 4 de cada lado). A fumaça vira nuvenzinha macia, rente ao chão. |
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
| **f3 O grande show** | caixa de som + dedinho → o palco aceso | no festival; ligar as 3 caixas e tocar | **6** |

**Na parte 1 (decisão do dono, rodada 4)** o parque ainda não existe, e as missões funcionam sem ele:
- **f1:** um estojo em cada zona da parte 1: na **Rua anos 80** (o teclado), na **pista e no fliperama** (a guitarra) e no **campo do festival** (as baquetas). **4 moedinhas.**
- **f2:** as lhamas moram num **cercadinho na beira do campo do festival** (nunca no lote do parque) e seguem o feno até a grade da plateia. **5 moedinhas.**
- **f3:** o grande show. **6 moedinhas.**
- São 15 no mundo, pagas só no fim de cada missão, nunca por ação. Quando o parque chegar (parte 2), só o lugar das lhamas pode mudar.

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
- Dirigir o carrinho bate-bate (ele anda sozinho; a criança só dá o "tum").
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
   - **No show:** os holofotes acendem e varrem, as caixas acendem, cai confete (sem rosa), os chafarizes soltam estrelinhas frias e a fumaça cobre o chão. **No acorde final**, uma explosão de estrelinhas sai da passarela e a plateia pula de braços para o alto.
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
3. **O show.** Com as três acesas, o vocalista começa, os holofotes acendem, a plateia vem para a grade e pula, e caem confete e estrelinhas.
   - **Qualquer toque no palco toca um acorde** (não precisa estar segurando a guitarra): o jogo encaixa o toque no tempo e sempre na nota certa, então não dá para errar.
   - **O fim é o ponto alto:** no último compasso, o palco pisca chamando, e **o toque da criança dispara o acorde final**: explosão de estrelinhas da passarela, a plateia vibra e o aplauso. Se ela não tocar em 4 s, o acorde vem sozinho (nunca fica esperando).
   - O show dura uma volta da música (~40 s).
4. **Depois do show, as três caixas ficam como brinquedo livre:** cada toque liga e desliga a camada dela, para sempre, sem moedinha.

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
| **f3 O grande show** | caixa de som apagada + selo do dedinho que toca → o palco aceso com confete | a escadinha do palco | tocar nas 3 caixas (bolinha: caixa acesa); o show começa e a festa vem depois do acorde final | `show:caixa` × 3 | **6** |

- **Ordem:** f1 primeiro (põe os instrumentos no palco); f2 a qualquer hora; f3 depois da f1.
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
- **Sem rosa no palco:** fumaça branco-gelo, faíscas douradas, a logo só com contorno cromado e o raio vermelho (o miolo amarelo deslocado lembrava capa de disco famosa).
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
- **Desempenho:** 45 quadros no celular de noite no meio do show (8 holofotes, confete, faíscas, 12 moradores, 2 lhamas); se não couber, primeiro saem a fumaça e metade do confete.
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
