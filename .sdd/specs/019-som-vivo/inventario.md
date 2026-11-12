# Inventário de som (spec 019, T01)

Levantado do código em 11 nov 2026 (branch `feat/som-vivo`, base `main` em 7453138). Mostra todo
som que o jogo toca hoje, como ele é feito, o que propomos e o estado de cada linha.

**Estados**
- **gravar**: troca por som gravado (vozes, música e ambiente marcante, decisão do dono de 11 nov).
- **refazer gerado**: continua gerado na hora, mas precisa de outra receita, outro gatilho ou de
  variação.
- **como hoje**: fica como está. Toda linha assim traz o motivo.

**Arquivos e linhas** (as linhas valem para o commit 7453138)
- `cena` = `src/render/cena.ts`, `sons` = `src/audio/sons.ts`, `amostras` = `src/audio/amostras.ts`,
  `ligador` = `src/audio/ligador.ts`, `motor` = `src/audio/motor.ts`.
- Todo som passa por `tocarSom(motor, evento, grupo)` (`sons:642`) ou
  `tocarVoz(motor, tipo, momento, volume)` (`sons:725`). A paisagem (vento, chuva, bichos ao fundo
  e trilha) é uma voz só, de prioridade alta, criada em `iniciarAmbiente` (`sons:920`), que
  `cena:3017` chama quando o som liga.
- A interface (`src/ui/*`) não toca som nenhum. Os sons de interface que existem (troca, recusa,
  coleta, entrada) saem da cena e do `ligador`.

**Como soa hoje, em resumo**
- **Vozes**: uma `PioCriatura` (varredura de tom de uma onda simples, com repetição e, às vezes,
  vibrato ou um pouco de ruído), desenhada em `sons:658`. Cada vaga tem três momentos (chamado,
  susto e contente), e o morador tem também "obrigado".
- **Golpe no bicho**: a amostra de material 'golpe' (`cena:3997`). A vaga espectro usa `'cristal'`
  e todas as outras usam `'terra'`, em todo tema. O tema ainda troca a receita e o tom do material
  (`sons:472`).
- **Grupos de volume**: `efeitos` (1.0), `passos` (0.6) e `ambiente` (0.7) (`motor:72`). As vozes
  vão em `efeitos`. O teto é de 12 vozes (`motor:4`).
- **Música**: `busMusica` 0.6 × volume Música (60% por padrão) × mestre 0.5
  (`GANHO_MAXIMO_AMBIENTE`), dentro do grupo ambiente (0.7). Esse é o volume percebido que a
  trilha nova tem que manter.

---

## 1. Bichos dos 7 temas (35 vagas)

Mecânica igual em todo tema (`src/jogo/criaturas.ts:56`):
- cervo: passivo, caixa de 1,3 de altura;
- coelho: passivo, 0,5;
- peixe: nada, 0,3;
- espectro: da noite, 1,7; hostil, menos no Rancho, onde é "mansa" (`src/jogo/criaturas.ts:1098`);
- raposa: companheira, domada com frutinhas, 0,6.

Vagas criadas com comida (`src/jogo/criacao.ts:17`): cervo e coelho. A raposa é domada.

**Momentos de som de bicho hoje (iguais em todo tema)**

| Momento | Quando | Como soa hoje | Gatilho |
|---|---|---|---|
| chamado | De 5 a 14 s, um bicho sorteado a menos de 18 blocos chama (o espectro não entra no sorteio) | `tocarVoz(tipo,'chamado')`; a raposa domada usa 'contente' | `cena:3475` |
| golpe no bicho | O núcleo avisa `criaturaFerida` | Amostra 'golpe': 'cristal' no espectro e 'terra' nos outros | `cena:3997` |
| susto | O mesmo `criaturaFerida` (serve também de "ai") | `tocarVoz(tipo,'susto')` | `cena:3998` |
| derrota | `criaturaMorreu` | Espectro no Bruma: síntese 'espectro' (`sons:551`). Espectro nos outros temas: voz 'susto' de novo. Demais bichos: **'quebra' de folhagem** (farfalhar de arbusto) | `cena:4002-4005` |
| criatura da noite por perto | `criaturaSom` (a menos de 20 blocos), com legenda | Bruma: 'espectro'. Outros temas: voz 'chamado' do espectro | `cena:4012-4013` |
| domou (raposa) | `domou` | 'entrada' (arpejo) + voz 'contente' | `cena:4033`, `cena:4036` |
| ganhou comida | `alimentou` | Voz 'contente'; da primeira vez, mais 'coleta' | `cena:4041`, `cena:4043` |
| dar comida / domar (clique) | Previsão local | 'comer' | `cena:1906`, `cena:1912` |
| botou ovo (coelho criado) | `botouOvo` | Voz 'chamado' do coelho | `cena:4054` |
| filhote | **Não existe no jogo** (não há bicho bebê nem estado de filhote) | n/a | n/a |
| chamar (gesto) | Os bichos criados e a raposa vêm | Mudo | `src/nucleo/nucleo.ts:1290` |

**Conjunto gravado proposto para cada bicho**
- chamado: 3 versões;
- susto: 2;
- contente: 2;
- "ai" do golpe: 2, de desenho animado e curtinho, separado do susto;
- derrota: 1 ("puf" fofo, sem grito);
- baque do golpe: pelo porte, em 3 versões (pequeno, médio e grande), com o sabor do material do
  tema (fofo no Doce, metal nos robôs, couro nos dinos, gelatina...);
- filhote: chamado e contente mais finos, para bichos criados e domados (vagas cervo, coelho e
  raposa). Hoje não há estado de filhote: a T04 decide se vale para o bicho "criado" ou se espera
  uma mecânica de filhote.

O peixe ganha bolhas (chamado), espirro d'água no golpe e "plop" na derrota.

Na tabela abaixo, "Hoje" mostra a PioCriatura de cada momento (`onda de→até Hz, duração × repetições`).
Golpe hoje: `golpe/cristal` no espectro e `golpe/terra` nos outros, com a receita do tema.

### Bruma e Luz (`bruma-e-luz`, vozes em `src/temas/bruma-e-luz/vozes.ts`)
O tema não muda nenhum material.

| Vaga | Nome | Porte | Hoje (chamado / susto / contente) | Golpe hoje | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|---|
| cervo | Cervo-musgo | médio | tri 420→300 0,5s vib / tri 600→380 ×2 / sen 330→380 | terra | Balido macio de cervo filhote, "ai" de fungada, baque médio de musgo | gravar | :14 |
| coelho | Coelho-bruma | pequeno | sen 1800→2300 ×2 / sen 2600→1700 / sen 1500→1900 ×3 | terra | Fungadinhas, guincho curto, baque pequeno fofo | gravar | :44 |
| peixe | Peixe-lume | pequeno | sen 500→1400 ×2 / sen 900→1800 ×3 / sen 600→1200 | terra (baque de terra num peixe) | Bolhas, "blub" no susto, espirro d'água no golpe | gravar | :73 |
| espectro | Espectro da bruma | grande | sen 260→200 0,9s / tri 520→760 / sen 300→340 (o chamado nunca toca: o Bruma usa a síntese 'espectro', `sons:551`) | **cristal** | "Uuuh" de fantasma de desenho, susto "oh!", baque grande de pano/névoa (sem vidro) | gravar | :102 |
| raposa | Raposa-lume | pequeno | tri 900→1300 ×2 / tri 1400→800 / sen 700→1000 ×2 | terra | Latidinho agudo de raposa, ganido curto, contente "rrr" | gravar | :135 |

### Planeta Vivo (`planeta-vivo`, vozes em `src/temas/planeta-vivo/criaturas.ts`)
Materiais: terra 1.15, pedra 0.85, areia 1.2, madeira→folhagem 0.75, folhagem 1.25, cristal 1.3.

| Vaga | Nome | Porte | Hoje | Golpe hoje | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|---|
| cervo | Lesma-pastora | médio | sen 300→430 vib / tri 520→720 ×2 / sen 380→470 ×3 | terra 1.15 | Ronronado gosmento e alegre, "blorp" no susto, baque médio gelatinoso | gravar | :257 |
| coelho | Pulga-bola | pequeno | tri 1300→2500 ×3 / sen 2400→1200 / sen 900→1800 vib | terra 1.15 | "Boing" de mola, gritinho, baque pequeno de borracha | gravar | :279 |
| peixe | Água-viva lilás | pequeno | sen 700→1100 vib / sen 1200→2000 ×3 / sen 500→800 | terra 1.15 | Bolhas cintilantes, "plim" aquoso | gravar | :309 |
| espectro | Sombrinha curiosa | médio | sen 500→660 ×2 / tri 700→1500 vib14 / sen 620→900 ×4 | **cristal 1.3** | Risadinha sussurrada (a legenda diz "risadinha"), "ih!" no susto, baque médio de sombra (nada de vidro) | gravar | :340 |
| raposa | Robô-cão | pequeno | sq 880→1320 ×2 / sq 1500→600 / tri 1000→1500 ×4 | terra 1.15 | Latido robótico fofo (bipes com formante), baque pequeno metálico | gravar | :371 |

### Mata Encantada (`mata-encantada`, vozes em `src/temas/mata-encantada/vozes.ts`)
Materiais: terra 0.9, pedra 0.95, areia 1.1, madeira 0.9, folhagem 1.15, cristal 1.2.

| Vaga | Nome | Porte | Hoje | Golpe hoje | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|---|
| cervo | Capivara | médio | tri 760→640 ×4 / tri 320→220 ×2 / tri 150→165 vib18 | terra 0.9 | Assobio-estalo de capivara, "hm!" no susto, ronco contente, baque médio | gravar | :18 |
| coelho | Sapo-cururu | pequeno | sq 230→180 ×3 / sq 420→260 / tri 280→330 | terra 0.9 | Coaxo "cururu", "croc" no susto, baque pequeno molhado | gravar | :50 |
| peixe | Lambari | pequeno | sen 700→1500 ×3 / sen 1100→2000 ×4 / sen 500→1000 ×2 | terra 0.9 | Bolhas, rabanada na água | gravar | :81 |
| espectro | Saci travesso | médio | sen 1400→2100 ×2 (assobio) / tri 900→1600 / tri 820→980 ×4 | **cristal 1.2: o "vidro" de que o dono reclamou** | Assobio do Saci, risada "hehe", "ai!" de moleque, baque médio de pano e redemoinho (nunca vidro) | gravar | :110 |
| raposa | Lobo-guará | médio | tri 400→300 ×2 / tri 640→420 / sen 520→700 ×2 | terra 0.9 | "Uó" (latido-uivo grave do guará), ganido, baque médio | gravar | :144 |

### Doce Reino (`doce-reino`, vozes em `src/temas/doce-reino/vozes.ts`)
Materiais: madeira 1.25 (biscoito), pedra→cristal 0.8 (caramelo), areia 1.3 (açúcar),
terra 0.9 (chocolate), folhagem 1.35 (algodão-doce), cristal 1.2.

| Vaga | Nome | Porte | Hoje | Golpe hoje | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|---|
| cervo | Ovelha de marshmallow | médio | tri 520→430 vib / tri 640→900 ×2 / sen 440→520 | terra 0.9 | "Béé" fofinho, susto "bé!", baque médio de marshmallow (squish) | gravar | :17 |
| coelho | Coelho de gelatina | pequeno | sen 320→760 vib16 ×2 / sen 1100→420 / sen 600→950 ×3 | terra 0.9 | "Bloing" gelatinoso, gritinho, baque pequeno de gelatina | gravar | :23 |
| peixe | Peixe-bala | pequeno | sen 420→1300 ×3 / sen 1500→700 ×3 / sen 700→1100 ×2 | terra 0.9 | Bolhas de refrigerante (fizz) | gravar | :29 |
| espectro | Fantasminha de alcaçuz | médio | sen 330→440 0,6s / tri 900→1500 ×2 / sen 720→900 ×4 | **cristal 1.2** | Risadinha de fantasminha, "uuh" fofo, baque médio elástico (alcaçuz) | gravar | :35 |
| raposa | Cãozinho de biscoito | pequeno | tri 760→520 ×2 / tri 1300→700 / sen 900→1250 ×3 | terra 0.9 | Latidinho, ganido, contente ofegante, baque pequeno crocante (biscoito) | gravar | :41 |

### Era dos Dinos (`era-dos-dinos`, vozes em `src/temas/era-dos-dinos/criaturas.ts`)
Materiais: tudo mais grave (terra 0.85, pedra 0.8, areia 0.9, madeira 0.88, folhagem 0.8, cristal 0.85).

| Vaga | Nome | Porte | Hoje | Golpe hoje | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|---|
| cervo | Pescoçudo-filhote | grande | tri 200→150 0,7s vib / tri 340→230 ×2 / sen 180→230 ×2 | terra 0.85 | Mugido-trombeta de saurópode filhote, "ô!" no susto, baque grande de couro | gravar | :196 |
| coelho | Lagartixa-pula-pula | pequeno | tri 1200→1600 ×3 / tri 1900→1100 / sen 1100→1400 ×2 | terra 0.85 | Chilreio-estalo de lagarto, chiado curto, baque pequeno | gravar | :226 |
| peixe | Peixe-couraça | pequeno | sen 300→720 ×2 / sen 500→1000 ×3 / sen 360→600 | terra 0.85 | Bolhas graves, batida de couraça na água | gravar | :256 |
| espectro | Morcegossauro | médio | sen 900→1300 ×2 vib / tri 1600→600 0,4s / sen 700→820 ×3 | **cristal 0.85** | Guincho de morcego fofo (a legenda já diz "guincho"), bater de asas, baque médio de asa de couro | gravar | :285 |
| raposa | Raptorzinho | médio | sen 1000→1500 ×3 vib / tri 1600→900 / sen 800→1100 ×2 | terra 0.85 | Trinado-gorjeio de raptor filhote, "rrah" de susto (fofo, sem rugido), baque médio | gravar | :318 |

### Exploração Lunar (`exploracao-lunar`, vozes em `src/temas/exploracao-lunar/vozes.ts`)
Materiais: terra→areia 0.8 (regolito), areia 0.75, pedra 1.2, madeira→pedra 1.45 (placa de liga),
folhagem→cristal 1.3, cristal 1.15.

| Vaga | Nome | Porte | Hoje | Golpe hoje | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|---|
| cervo | Rover-pastor | médio | sq 660→880 ×3 / saw 900→380 ruído / sq 520→780 ×2 | **terra→areia** (estalo de areia num robô) | Bipe-motor de rover, servo que geme no susto, baque médio metálico oco | gravar | :7 |
| coelho | Coelho-lunar | pequeno | sen 1400→2000 ×2 vib / sen 2400→1500 / tri 1200→1600 ×3 | terra→areia | Fungadinha com eco de rádio, baque pequeno abafado (traje) | gravar | :38 |
| peixe | Peixe de gelo | pequeno | sen 1800→2400 ×2 / sen 2600→3400 ×3 / sen 1500→1900 | terra→areia | Bolhas cristalinas, "tlim" de gelo | gravar | :69 |
| espectro | Eco-sombra | grande | sen 220→310 0,6s / tri 520→1100 ×2 / sen 300→360 ×2 | **cristal 1.15** | Resmungo com eco (a legenda diz "resmungando"), baque grande abafado de poeira | gravar | :99 |
| raposa | Robô-companheiro | pequeno | sq 880→1320 ×2 / saw 1200→600 / sen 660→990 ×3 | terra→areia | Bipes alegres (R2 fofo), "uh-oh" no susto, baque pequeno de lata | gravar | :133 |

### Rancho Alegre (`rancho-alegre`, vozes em `src/temas/rancho-alegre/vozes.ts`)
Materiais: madeira 0.95, terra 0.95, folhagem 1.05. A criatura da noite é mansa: nunca persegue.

| Vaga | Nome | Porte | Hoje | Golpe hoje | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|---|
| cervo | Vaca malhada | grande | saw 165→125 0,95s / saw 230→160 / tri 150→135 | terra 0.95 | "Muuu" (3 versões), "mô!" no susto, ruminar contente, baque grande | gravar | :17 |
| coelho | Galinha caipira | pequeno | tri 720→520 ×3 / tri 1100→700 ×4 / tri 560→480 ×2 | terra 0.95 | Cacarejo "có-có-có", alvoroço curto no susto, "cocoricó" ao botar ovo, baque pequeno de penas | gravar | :23 |
| peixe | Tilápia do açude | pequeno | sen 380→1100 ×3 / sen 1300→600 ×3 / sen 650→1000 ×2 | terra 0.95 | Bolhas e rabanada no açude | gravar | :29 |
| espectro | Coruja curiosa | médio | sen 420→380 ×2 / sen 900→1300 ×2 / sen 460→520 | **cristal: vidro numa coruja** | "Hu-hu" de coruja, piado de susto, bater de asas, baque médio de penas | gravar | :35 |
| raposa | Cachorro do sítio | médio | tri 640→420 ×2 / tri 1200→650 vib / tri 820→1100 ×3 | terra 0.95 | "Au-au" de vira-lata, ganido, ofegante contente, baque médio | gravar | :41 |

**Bichos que a spec cita mas não existem no jogo:** cavalo e porco. O Rancho tem só as 5 vagas
acima. O mugido e o galo do ambiente (seção 4) são outras sínteses, que não usam a voz da vaca e
não têm galo-bicho.

---

## 2. Moradores dos 7 povoados

Vozes em `src/temas/<tema>/povoado.ts` (bloco `vozes:`). O tipo é `VozCriatura & { obrigado }`.

**Momentos de som do morador hoje (iguais em todo tema)**

| Momento | Quando | Hoje | Gatilho |
|---|---|---|---|
| chamado | No sorteio de chamados, com 35% de chance e nunca até 20 s depois de uma conversa ou troca | voz 'chamado' | `cena:3471-3475` |
| oi (falar) | Clique de uso no morador, que abre as trocas | voz 'contente' | `cena:1901` |
| golpe no morador | O morador não apanha: o golpe vira "oi" | voz 'contente' | `cena:3285` |
| resposta ao gesto (015) | Gesto que o morador responde: até 2 moradores perto acenam, e só o primeiro fala | voz 'contente' | `cena:3248`, núcleo em `src/nucleo/nucleo.ts:1287` |
| obrigado | Depois de uma troca feita | voz 'obrigado' | `cena:3431` |
| troca recusada | `trocaRecusada` (faltam itens) | **mudo** (só o aviso escrito) | `src/main.ts:322` |
| susto | **Nunca toca:** o morador não se assusta nem apanha | n/a | n/a |
| falas de missão | **Não existem:** as missões são do diário, não dos moradores (ver seção 6) | n/a | n/a |

**Proposta para os 7 temas** (balbucio sem palavras, para nada soar estranho em idioma nenhum):
- oi: 3 versões;
- chamado ao longe: 2;
- contente ao acenar de volta: 2;
- "obrigado": 2;
- "hum-hum" gentil na troca recusada: 1;
- susto (se um dia houver motivo): 1.

| Tema | Povoado | Profissões | Hoje (chamado / susto / contente / obrigado) | Proposta gravada | Estado | Linha das vozes |
|---|---|---|---|---|---|---|
| bruma-e-luz | Aldeia das lanternas | Ferreira, Cozinheiro, Construtora | tri 260→320 ×2 / tri 420→260 / tri 280→380 ×2 / tri 300→420 ×3 | Balbucio suave e etéreo, "hm-hm!" contente | gravar | `bruma-e-luz/povoado.ts:88` |
| planeta-vivo | Posto de pesquisa | Mecânica, Chef estelar, Engenheiro | sen 520→880 ×2 / tri 900→1500 / sen 440→760 ×3 / sen 600→1200 ×2 | Balbucio de pesquisador com chilreio alienígena | gravar | `planeta-vivo/povoado.ts:155` |
| mata-encantada | Vila dos artesãos | Ferreiro, Quituteira, Carpinteiro | tri 300→400 ×2 / tri 520→300 / tri 360→460 ×3 / tri 340→520 ×3 | Balbucio de vila do interior, risadinha | gravar | `mata-encantada/povoado.ts:153` |
| doce-reino | Vilarejo dos confeiteiros | Colhereira, Confeiteiro, Construtor de casinhas | sen 520→680 ×2 / tri 820→560 / sen 460→620 / sen 560→840 ×3 | Balbucio fofinho e agudo, "huhu!" | gravar | `doce-reino/povoado.ts:129` |
| era-dos-dinos | Acampamento dos paleontólogos | Ferramenteira, Cozinheiro, Montadora de tendas | tri 220→300 ×2 / tri 460→240 / tri 250→360 ×2 / tri 280→400 ×3 | Balbucio de explorador animado, "ôpa!" | gravar | `era-dos-dinos/povoado.ts:96` |
| exploracao-lunar | Colônia lunar | Mecânica, Chef-robô, Engenheira | tri 520→620 ×2 ruído / saw 760→340 / tri 600→900 ×2 / tri 700→1050 ×3 | Balbucio com filtro de rádio de capacete e bipe no fim | gravar | `exploracao-lunar/povoado.ts:149` |
| rancho-alegre | Sítio dos vizinhos | Fazendeira, Carpinteiro, Ferreira | tri 300→420 ×2 / tri 520→360 / sen 330→440 / tri 380→560 ×3 | Balbucio caipira ("ô de casa", "uai" só na entonação), assobio | gravar | `rancho-alegre/povoado.ts:93` |

---

## 3. Ações da criança, por material e por tema

Os eventos de material ('golpe', 'quebra', 'colocar', 'passo', 'pulo' e 'aterrissagem') tocam
amostras PCM geradas uma vez por contexto (`amostras:339`), com 4 versões. Elas vêm de uma
receita por grupo:

| Grupo | Receita | Linha | Blocos (exemplos) |
|---|---|---|---|
| pedra | estalo e cascalho | `amostras:195` | Pedregulho, minérios, tijolos, fornalha, lanterna e **água** (ver bugs) |
| terra | baque abafado | `amostras:213` | Terra, terra musgosa, lama, terra arada |
| areia | chiado granulado | `amostras:229` | Areias, cascalho, neve |
| madeira | toque oco | `amostras:246` | Troncos, tábuas, porta, porteira, baú, mesa, cerca, abóbora |
| folhagem | farfalhar | `amostras:280` | Folhas, grama alta, flores, plantações, lã, cama, feno |
| cristal | tilintar com parciais | `amostras:296` | Cristal-luz, luzita, gelo, vidro |

O tema troca o tom e, às vezes, a receita (`AjusteMaterial`, aplicado em `sons:472`):

| Tema | terra | pedra | areia | madeira | folhagem | cristal |
|---|---|---|---|---|---|---|
| bruma-e-luz | 1 | 1 | 1 | 1 | 1 | 1 |
| planeta-vivo (solo âmbar, seixos violeta, placas de talo) | 1.15 | 0.85 | 1.2 | **folhagem** 0.75 | 1.25 | 1.3 |
| mata-encantada (terra roxa, pedra de rio, jequitibá) | 0.9 | 0.95 | 1.1 | 0.9 | 1.15 | 1.2 |
| doce-reino (chocolate, caramelo, biscoito, algodão-doce) | 0.9 | **cristal** 0.8 | 1.3 | 1.25 | 1.35 | 1.2 |
| era-dos-dinos (terra vulcânica, basalto, samambaia) | 0.85 | 0.8 | 0.9 | 0.88 | 0.8 | 0.85 |
| exploracao-lunar (regolito, brecha lunar, placa de liga, pontas de quartzo) | **areia** 0.8 | 1.2 | 0.75 | **pedra** 1.45 | **cristal** 1.3 | 1.15 |
| rancho-alegre (terra vermelha, pedra de muro, ipê) | 0.95 | 1 | 1 | 0.95 | 1.05 | 1 |

**Ações**

| Ação | Hoje | Gatilho | Proposta | Estado |
|---|---|---|---|---|
| Golpe em bloco | Amostra 'golpe' do grupo | `ligador:8` (`src/player/minerador.ts:57`) | Mantém. A T05 confere o volume com a régua | como hoje (decisão do dono: blocos gerados) |
| Quebrar bloco | Amostra 'quebra' do grupo | `ligador:11`; dos outros em `cena:3978` | Idem | como hoje (decisão do dono) |
| Colocar bloco | Amostra 'colocar' do grupo | `ligador:14`; dos outros em `cena:3978` | Idem | como hoje (decisão do dono) |
| Passo | Amostra 'passo' do bloco sob os pés | `cena:3062` (detector em `src/player/movimento.ts`) | Idem. Andar e correr podem ganhar ritmo diferente | como hoje (decisão do dono) |
| Pulo | Amostra 'pulo' | `cena:3062` | Idem | como hoje (decisão do dono) |
| Aterrissagem | Amostra 'aterrissagem' | `cena:3062` | Idem | como hoje (decisão do dono) |
| Arar com a enxada | 'quebra' de terra | `cena:1778`; dos outros em `cena:4131` | Raspar de enxada gerado na hora (hoje é igual a quebrar terra) | refazer gerado |
| Abrir e fechar porta ou porteira | 'colocar' de madeira | `cena:3986` | Rangido curto de dobradiça (porta de liga na Lua, porta de biscoito no Doce) | refazer gerado |
| Comer (começar) | 'comer' (3 mordidas de ruído) | `cena:3325` | Mordidas gravadas e "nhac" final | **feito (T05), gerado**: as mordidas continuam geradas e tocam uma vez só |
| Comer (terminou, aviso do núcleo) | 'comer' de novo (o som toca 2 vezes por refeição) | `cena:4060` | Só o "nhac" final | **feito (T05)**: segurando para comer, o fim é o 'nhac'; no clique, a refeição toca 'comer' uma vez |
| Coletar item do chão | 'coleta' (blip ascendente) | `cena:2522` | Mantém o blip, com tom por raridade | refazer gerado |
| Colher planta madura | 'coleta' + confete | `cena:2510`; vista de perto em `cena:2502` | Festinha da colheita: blip e chocalho | refazer gerado |
| Dano | 'dano' (ruído grave + tom que desce) | `cena:4065` | "Ui!" fofo gravado, sem grito; pode variar por causa (queda, afogamento, criatura) | gravar |
| Trocar de item (slot) | 'troca' (dois bipes) | `ligador:20` | Mantém | como hoje (é curto, discreto e funciona) |
| Jogar item | 'troca' | `cena:2553` | "Fuup" de arremesso | refazer gerado |
| Recusa (não pode quebrar ou colocar, dedo longe, ferramenta quebrou) | 'recusa' (dois tons que descem) | `ligador:17`; `cena:3797`, `cena:3992`, `cena:4123` | Mantém a recusa. Ferramenta quebrou ganha um "crec" próprio | **em parte (T05)**: o que a proteção barra (spec 016: bloco, baú, fornalha, bicho do amigo) é um "toc" baixinho no lugar da recusa; falta o "crec" da ferramenta |
| Entrada (ligar o som, amigo entrou, domou) | 'entrada' (arpejo pentatônico em ré) | `cena:3015`, `cena:4102`, `cena:4033` | Vinheta curta gravada por tema, tocada pela orquestrinha dele | gravar |
| Água: entrar, nadar, mergulhar | **Mudo** | n/a | Splash ao entrar, braçadas e som abafado debaixo d'água | **feito em parte (T05)**: "chuá" ao cair na água e ao pôr ou tirar o bloco de água (bug 8), braçada macia nadando (`src/audio/somAgua.ts`); falta o abafado debaixo d'água |
| Bicho protegido (do amigo) | Só o aviso escrito, sem som | `cena:3292` | 'recusa' | **feito (T05)**: o "toc" do cadeado, o mesmo dos blocos protegidos |

---

## 4. Mundo e ambiente

Tudo vive em `iniciarAmbiente` (`sons:920`): dois barramentos (`busNatureza` 0.8 e `busMusica`
0.6) e reverb de 3,2 s. A cena passa noite, hora, chuva e contexto a cada quadro
(`cena:1076`, `cena:1089`, `cena:1167-1168`).

| Som | Temas | Hoje | Gatilho | Proposta | Estado |
|---|---|---|---|---|---|
| Vento | Todos menos a Lua (vento 0) | Ruído em laço com filtro que respira (LFO a 0,07 Hz) | `sons:1204-1224` | Laço gravado curto e leve (folhas no Rancho e na Mata, assobio na taiga) que sobe com chuva e tempestade | gravar |
| Chuva | Todos (na neve, ×0,25) | Ruído com passa-alta, ganho ∝ chuva | `sons:1225-1237`, `cena:1089` | Laço gravado de chuva: garoa e toró. No Doce, granulado (chuva de confeito); na Lua, chiado de poeira bem baixinho. Chuva no telhado quando coberto | **em parte (T05)**: na Lua não há mais chiado (`chuvaMuda`, bug 13); o laço gravado fica para depois |
| Trovão | Todos com `relampago`, ou seja, todos menos a Lua | Síntese 'trovao' (2 ruídos graves + tom) depois do relâmpago | `cena:4085`, `sons:546` | Trovão gravado e macio, em 2 versões. No Doce, "estouro de pipoca" (como diz a legenda); no Planeta, trovão elétrico | **em parte (T05), gerado**: o Doce estoura pipoca ('pipoca'); a Lua, sem clarão, toca o chiado de rádio 'estalo' com a legenda "Estalo de tempestade solar" (bug 14). Os outros seguem com o trovão de antes |
| Pássaros | Dia; multiplicador por tema (Bruma 1, Planeta 1, Mata 1.6, Doce 0.8, Dinos 0.6, Lua 0, Rancho 1.1) e tom (Planeta e Doce 1.3, Dinos 0.55) | 2 a 5 pios de senoide sorteados | `sons:1003`, `sons:1164` | Pássaros gravados por tema: sabiá e bem-te-vi na Mata e no Rancho, chilreio alienígena no Planeta, pios de caixinha no Doce, aves pré-históricas nos Dinos | gravar |
| Grilos | Noite; multiplicador (Bruma 1, Planeta 0.2, Mata 1.5, Doce 0.5, Dinos 1.2, Lua 0, Rancho 1) | 4 bipes de senoide a 4,3 kHz | `sons:1032`, `sons:1160` | Grilos gravados, curtos e sem laço. Sapinhos na Mata | gravar |
| Bipes de rádio | Lua (no lugar de pássaros e grilos) | 2 bipes de senoide | `sons:1026`, `sons:1161`, `sons:1165` | Rádio da base: bipes e chiado curto, gravados | gravar |
| Galo | Rancho, ao amanhecer (hora 0,22 a 0,34) | Sawtooth em 4 partes | `sons:1043`, `sons:1080` | "Cocoricó" gravado, 2 versões | gravar |
| Mugido ao longe | Rancho, de dia | Sawtooth que desce | `sons:1056`, `sons:1090` | A mesma gravação da voz da vaca, longe (reverb e filtro) | gravar |
| Cigarra | Rancho, de tarde, sem chuva | 18 pulsos de onda quadrada | `sons:1061`, `sons:1082-1089` | Cigarra gravada (sobe e some) | gravar |
| Sapo | Rancho, de noite | Onda quadrada 200→140 Hz | `sons:1072`, `sons:1081` | Sapo-cururu gravado. Vale também para o brejo da Mata, o pântano de todos e os sapinhos no lugar dos grilos | gravar |
| Gotas de caverna | Todos, no contexto caverna (`gotas` na paleta) | Senoide que desce | `sons:1147-1154` | Gotas gravadas com eco | gravar |
| Eco da caverna | Todos | **Não existe:** o reverb é o mesmo em todo lugar | n/a | Mais reverb e um passa-baixa leve quando coberto (gerado) | refazer gerado |
| Água ao fundo (rio, mar, açude) | Todos | **Não existe** | n/a | Laço curto de marolinha perto de água | gravar |
| Criatura da noite (gemido) | Bruma | Síntese 'espectro' | `cena:4012`, `sons:551` | O "uuuh" gravado do Espectro da bruma (seção 1) | gravar |
| Criatura da noite (chamado) | Outros 6 temas | Voz 'chamado' do espectro do tema | `cena:4013` | Gravação da seção 1 | gravar |

---

## 5. Música dos 7 temas

**Como funciona hoje** (`sons:1112`, `agendar`):
- **Acordes**: soam a cada `intervalo`; cada nota são 2 osciladores desafinados com filtro
  (`sons:965`).
- **Melodia**: "sino" sorteado a cada 1,5 a 4 s, com eco a 0,375 s.
- **Pulso**: só nas paletas que têm um (`sons:1135`).
- **Gotas**: só na caverna.

A paleta vem do tema (`src/temas/<tema>/musica.ts` ou `index.ts`). Se faltar, usa a base
(`sons:798`).

**O que escolhe o contexto** (`cena:1066-1076`), nesta ordem:
1. `perigo`: modo sobrevivência e um espectro em 'perseguir' a menos de 14 blocos (`cena:3484`).
2. `caverna`: há bloco opaco acima do jogador e ele está abaixo de y 55 (`cena:2250`).
3. `deserto`, `taiga` ou `pantano`, pelo bioma sob o jogador.
4. `noite`, se a noite passa de 0,6.
5. `dia`.

A troca acontece adiantando o próximo acorde em até 1,5 s (`sons:1264`). Não há transição em cruz.

**Contextos que existem hoje:** dia, noite, deserto, taiga, pantano, caverna e perigo (7). Não
existem entardecer, chuva, andar, correr, amigos perto nem lavoura.

| Tema | Timbre hoje | Paletas | Contextos que o jogo alcança | Orquestrinha proposta | Estado |
|---|---|---|---|---|---|
| bruma-e-luz | Triângulo, sino de senoide, sem coro; transporte 0 | Base (`sons:798`) | dia, noite, deserto, taiga, pantano, caverna, perigo | Harpa, celesta, flauta suave, pad de cordas, sinos de vento | gravar |
| planeta-vivo | Senoide em coro 12, sino de triângulo; lídio | Próprias, `planeta-vivo/index.ts:75` | Todos os 7 | Sintetizador espacial macio, marimba, vibrafone, coro "aah" | gravar |
| mata-encantada | Violão (triângulo brilhante, notas curtas); bossa, choro e baião | Próprias, `mata-encantada/musica.ts:16` | Todos os 7 | Violão de náilon, flauta, cavaquinho. Na caatinga, zabumba e triângulo bem leves | gravar |
| doce-reino | Caixinha de música (senoide, sino de triângulo); transporte +2 | Próprias, `doce-reino/index.ts:203` | Todos os 7 | Caixinha de música, glockenspiel, celesta, pizzicato, ukulele | gravar |
| era-dos-dinos | Pads quentes (triângulo, coro 7); ré dórico; transporte −2 | Próprias, `era-dos-dinos/musica.ts`. Tambor no dia, no deserto, no pântano e no perigo | Todos os 7 | Marimba, kalimba, tambores leves de aventura, flauta de madeira, pad quente | gravar |
| exploracao-lunar | Senoides longas e esparsas, lídio e hexatônico | Próprias, `exploracao-lunar/musica.ts` | Todos os 7 (sem chuva de verdade: o clima é poeira) | Pad espacial, vibrafone e sinos com eco, piano elétrico suave | gravar |
| rancho-alegre | "Sanfona" (dente de serra, coro 7) e "viola" (sino de triângulo); terças de moda de viola; baixo no pulso de dia | Próprias, `rancho-alegre/index.ts:216` | dia, noite, deserto, taiga, pantano, caverna. **Perigo nunca toca** (a noite é mansa) | Arranjo acústico escolhido pelo dono: violões dobrados, sanfona e ponteio de viola caipira; triângulo e zabumba bem leves | gravar |

**Camadas propostas** (para todos os temas; a T02 grava e a T03 monta):
- **Base que nunca para.** Acordes e pad do tema, em frases de 4 a 8 compassos com variações.
- **Hora do dia.** Dia, entardecer e noite. Hoje não há entardecer; a cena já calcula
  `a.crepusculo` (`cena:1094`).
- **Bioma.** Deserto, taiga e pântano viram uma cor sobre a base e somam com a hora. Hoje o bioma
  especial anula a noite: de noite no deserto toca a paleta do deserto.
- **Chuva.** A camada abaixa a melodia e põe pad molhado. A cena já tem `clima.estado.chuva`.
- **Caverna.** Grave, com gotas e mais reverb.
- **Perigo.** Pulso. Fica para todos os temas, menos o Rancho, que não alcança esse contexto: lá,
  basta uma frase de "coruja curiosa" à noite.
- **Andando e correndo.** O ritmo entra ao andar e o pulso ao correr. A cena já mede
  `velocidadeHoriz` e `corrida` (`cena:3042`).
- **Amigos perto.** Uma voz a mais na melodia. A cena já tem `outrosJogadores.lista`.
- **Lavoura** (Rancho). Ponteio de viola perto da roça.
- **Pausas.** Silêncio de 20 a 60 s entre ciclos.

---

## 6. Interface

Nenhum arquivo de `src/ui/` toca som.

| Onde | Hoje | Gatilho para ligar | Proposta | Estado |
|---|---|---|---|---|
| Trocar de item na barra | 'troca' | `ligador:20` | Mantém | como hoje (discreto e já existe) |
| Botão da roda: abrir e fechar (menu e gestos) | Mudo | `src/ui/roda.ts:247` (`abrir`), `src/ui/menuRoda.ts:220`, `:224` | "Plop" suave ao abrir, ao fechar e ao escolher | **feito (T05)**: 'rodaAbrir' e 'rodaFechar' (escolher fecha a roda) |
| Gestos: acenar, aplaudir, comemorar, dançar, chamar... | Mudos (só a animação; o morador responde com voz) | `src/render/gestosJogo.ts`, `cena:3245` | Palminhas no aplaudir, "êêê" no comemorar, assobio no chamar, musiquinha de 2 s no dançar | **feito (T05), gerado**: palminhas (aplaudir), sino (acenar e cumprimentar), estrelinhas (comemorar), assobio (chamar), musiquinha (dançar), tique (apontar), "puf" (sentar); `SOM_DO_GESTO` em `src/audio/somInterface.ts` |
| Mochila (inventário): abrir e fechar | Mudo | `src/ui/inventario.ts:607` | Zíper ou bolsa curto | **feito em parte (T05)**: zíper ao abrir ('mochila'); fechar segue mudo |
| Arrastar e soltar item no inventário | Mudo | `src/ui/inventario.ts` (soltar no slot) | Tique leve | refazer gerado |
| Craft: receita feita | Mudo | `src/main.ts:293` (`registrarFabricacao`) | "Tchanam" curto de criação | **feito (T05)**: 'criar' |
| Baú e fornalha: abrir | Mudo | Contêiner aberto (`cena:3964`, `conteinerAberto`) | Rangido de tampa e chama da fornalha | refazer gerado |
| Trocas com morador: abrir | Voz 'contente' (`cena:1901`) | `src/main.ts:317` | Já tem voz. Ganha um tique de papel na troca feita | refazer gerado |
| Conquista (missão do diário concluída) | Mudo (toast amarelo) | `src/main.ts:636` (`notificar(..., 'trofeu')`), `src/ui/interface.ts:204` | Vinheta de conquista gravada, uma por tema (3 a 4 notas da orquestrinha) | **feito (T05), gerado**: arpejo 'conquista', o mesmo em todo tema (no máximo um por segundo) |
| Toasts comuns | Mudos | `src/ui/interface.ts:204` | Seguem mudos (são muitos e seriam irritantes) | como hoje (só a conquista ganha som) |
| Festa ao vestir fantasia (017) | Muda (só a animação `.festa`) | `src/ui/abaFantasias.ts:396` (`escolher`) | Fanfarrinha de confete gravada, em 2 versões | **feito (T05), gerado**: confete 'festa' (4 versões) |
| Título, pausa, configurações, mundos | Mudos | `src/ui/titulo.ts`, `src/ui/pausa.ts`, `src/ui/configuracoes.ts` | Tique de botão leve e comum a todos | refazer gerado |
| Dormir e acordar | Mudo | `src/main.ts:479` (`brumaluz:sono`), `cena:4092` (`acordou`) | Canção de ninar de 2 compassos ao dormir e o galo ou passarinho do tema ao acordar | gravar |
| Ligar o som (primeiro toque) | 'entrada' | `cena:3015` | A vinheta do tema (seção 3) | gravar |
| Tecla M (mudo) e volumes | Funciona; os volumes ficam em Configurações → Áudio | `cena:3169-3173`, `src/ui/configuracoes.ts:132` | Grupo próprio 'vozes'; o controle "Música" segue em 60% por padrão | refazer gerado |

---

## Bugs e achados

1. **Vidro em toda criatura da noite.** `cena:3997` usa `'cristal'` em todo espectro, de qualquer
   tema. Soam como vidro: o Saci (cristal 1.2), a Coruja do Rancho, o Fantasminha de alcaçuz, o
   Morcegossauro, o Eco-sombra, a Sombrinha e o Espectro da bruma.
2. **Todos os outros golpes são o mesmo baque de terra.** A vaca, a galinha, o peixe e o robô
   soam iguais. Na Lua é pior: a terra usa a receita de areia, e bater num robô soa como pisar
   em areia.
3. **Bicho derrotado soa como arbusto.** `cena:4005` toca `quebra/folhagem` para vaca, peixe,
   robô...
4. **Não há "ai".** O susto serve de reação ao golpe. Nos espectros fora do Bruma, o susto toca de
   novo na derrota (`cena:4004`).
5. **O bicho criado nunca soa contente ao chamar.** Só a raposa domada usa 'contente'
   (`cena:3475`); a vaca e a galinha criadas usam o mesmo chamado das soltas. Também não há
   mecânica de filhote para a voz de filhote.
6. **O Espectro da bruma não usa a própria voz.** `VOZES_BRUMA.espectro.chamado` nunca toca: o
   Bruma usa a síntese 'espectro' (`cena:4003`, `cena:4012`).
7. **Comer toca 'comer' duas vezes** por refeição: ao começar (`cena:3325`) e quando o núcleo
   confirma (`cena:4060`). **Corrigido na T05.**
8. **A água soa como pedra.** O bloco "água" tem som de pedra (`src/world/blocks.ts`) ao colocar
   ou tirar. Nadar e mergulhar não têm som. **Corrigido na T05** (falta o abafado submerso).
9. **O bioma especial apaga a noite na trilha.** De noite no deserto, na taiga ou no pântano toca
   a paleta de bioma, que soa como dia (`cena:1067-1075`).
10. **"Caverna" toca dentro de casa.** Basta um teto opaco abaixo de y 55 (`cena:2250`).
11. **O perigo nunca toca no Rancho** (noite mansa) nem no criativo. A paleta de perigo do Rancho
    é código morto.
12. **A troca de contexto é seca.** Muda a paleta e só adianta o próximo acorde; não há transição
    em cruz (`sons:1264-1268`).
13. **Chuva no vácuo.** O chiado de chuva toca também na "chuva de poeira" da Lua: o vento é 0,
    mas a chuva não. O granulado do Doce usa o mesmo chiado. **Lua corrigida na T05.**
14. **O trovão do Doce não é pipoca.** A legenda diz "Estouro de pipoca", mas toca o trovão comum.
    Na Lua não há relâmpago, então a legenda "Estalo de tempestade solar" nunca aparece.
    **Corrigido na T05** (pipoca no Doce; estalo de rádio com a legenda na Lua).
15. **As vozes não têm volume próprio.** Bichos e moradores vão no grupo 'efeitos'
    (`sons:739`). A régua da spec (música abaixo dos efeitos e das vozes) pede um grupo 'vozes'.
16. **O mugido e o galo do ambiente são sínteses à parte.** Não usam a voz da vaca, e o galo não
    tem bicho. Gravados, devem sair do mesmo arquivo da vaca.
17. **O morador nunca fala "susto"** (não apanha) e é mudo na troca recusada.
18. **Interface muda:** roda, mochila, craft, baú, conquistas, fantasia, menus e gestos do próprio
    jogador. **Em parte na T05:** roda, mochila (abrir), craft, conquistas, fantasia e gestos
    ganharam som; baú, menus e fechar a mochila seguem mudos.
19. **A spec cita cavalo e porco**, que não existem no jogo. O Rancho tem vaca, galinha, tilápia,
    coruja e cachorro.

## Contagem

| Grupo | Linhas | gravar | refazer gerado | como hoje |
|---|---|---|---|---|
| Bichos (7 × 5) | 35 | 35 | 0 | 0 |
| Moradores (temas) | 7 | 7 | 0 | 0 |
| Ações | 18 | 3 | 10 | 5 (6 de material + troca; decisão do dono e já discreto) |
| Mundo e ambiente | 15 | 13 | 1 | 0 |
| Música (temas) | 7 | 7 | 0 | 0 |
| Interface | 15 | 5 | 8 | 2 |

Linhas "como hoje": golpe, quebrar e colocar bloco, passo, pulo e aterrissagem (decisão do dono de
11 nov: ficam gerados, só passam pela régua de volume na T05), troca de item (curta e discreta) e
toasts comuns (seriam irritantes).

## Resumo para máquina

```json
{
  "criaturas": {
    "bruma-e-luz": [
      {"slot":"cervo","nome":"Cervo-musgo","porte":"medio","materialHoje":"terra"},
      {"slot":"coelho","nome":"Coelho-bruma","porte":"pequeno","materialHoje":"terra"},
      {"slot":"peixe","nome":"Peixe-lume","porte":"pequeno","materialHoje":"terra"},
      {"slot":"espectro","nome":"Espectro da bruma","porte":"grande","materialHoje":"cristal"},
      {"slot":"raposa","nome":"Raposa-lume","porte":"pequeno","materialHoje":"terra"}
    ],
    "planeta-vivo": [
      {"slot":"cervo","nome":"Lesma-pastora","porte":"medio","materialHoje":"terra"},
      {"slot":"coelho","nome":"Pulga-bola","porte":"pequeno","materialHoje":"terra"},
      {"slot":"peixe","nome":"Água-viva lilás","porte":"pequeno","materialHoje":"terra"},
      {"slot":"espectro","nome":"Sombrinha curiosa","porte":"medio","materialHoje":"cristal"},
      {"slot":"raposa","nome":"Robô-cão","porte":"pequeno","materialHoje":"terra"}
    ],
    "mata-encantada": [
      {"slot":"cervo","nome":"Capivara","porte":"medio","materialHoje":"terra"},
      {"slot":"coelho","nome":"Sapo-cururu","porte":"pequeno","materialHoje":"terra"},
      {"slot":"peixe","nome":"Lambari","porte":"pequeno","materialHoje":"terra"},
      {"slot":"espectro","nome":"Saci travesso","porte":"medio","materialHoje":"cristal"},
      {"slot":"raposa","nome":"Lobo-guará","porte":"medio","materialHoje":"terra"}
    ],
    "doce-reino": [
      {"slot":"cervo","nome":"Ovelha de marshmallow","porte":"medio","materialHoje":"terra"},
      {"slot":"coelho","nome":"Coelho de gelatina","porte":"pequeno","materialHoje":"terra"},
      {"slot":"peixe","nome":"Peixe-bala","porte":"pequeno","materialHoje":"terra"},
      {"slot":"espectro","nome":"Fantasminha de alcaçuz","porte":"medio","materialHoje":"cristal"},
      {"slot":"raposa","nome":"Cãozinho de biscoito","porte":"pequeno","materialHoje":"terra"}
    ],
    "era-dos-dinos": [
      {"slot":"cervo","nome":"Pescoçudo-filhote","porte":"grande","materialHoje":"terra"},
      {"slot":"coelho","nome":"Lagartixa-pula-pula","porte":"pequeno","materialHoje":"terra"},
      {"slot":"peixe","nome":"Peixe-couraça","porte":"pequeno","materialHoje":"terra"},
      {"slot":"espectro","nome":"Morcegossauro","porte":"medio","materialHoje":"cristal"},
      {"slot":"raposa","nome":"Raptorzinho","porte":"medio","materialHoje":"terra"}
    ],
    "exploracao-lunar": [
      {"slot":"cervo","nome":"Rover-pastor","porte":"medio","materialHoje":"terra(areia)"},
      {"slot":"coelho","nome":"Coelho-lunar","porte":"pequeno","materialHoje":"terra(areia)"},
      {"slot":"peixe","nome":"Peixe de gelo","porte":"pequeno","materialHoje":"terra(areia)"},
      {"slot":"espectro","nome":"Eco-sombra","porte":"grande","materialHoje":"cristal"},
      {"slot":"raposa","nome":"Robô-companheiro","porte":"pequeno","materialHoje":"terra(areia)"}
    ],
    "rancho-alegre": [
      {"slot":"cervo","nome":"Vaca malhada","porte":"grande","materialHoje":"terra"},
      {"slot":"coelho","nome":"Galinha caipira","porte":"pequeno","materialHoje":"terra"},
      {"slot":"peixe","nome":"Tilápia do açude","porte":"pequeno","materialHoje":"terra"},
      {"slot":"espectro","nome":"Coruja curiosa","porte":"medio","materialHoje":"cristal"},
      {"slot":"raposa","nome":"Cachorro do sítio","porte":"medio","materialHoje":"terra"}
    ]
  },
  "criados": {"criadoComComida":["cervo","coelho"],"domado":["raposa"],"filhoteNoJogo":false},
  "contextosMusica": {
    "bruma-e-luz": ["dia","noite","deserto","taiga","pantano","caverna","perigo"],
    "planeta-vivo": ["dia","noite","deserto","taiga","pantano","caverna","perigo"],
    "mata-encantada": ["dia","noite","deserto","taiga","pantano","caverna","perigo"],
    "doce-reino": ["dia","noite","deserto","taiga","pantano","caverna","perigo"],
    "era-dos-dinos": ["dia","noite","deserto","taiga","pantano","caverna","perigo"],
    "exploracao-lunar": ["dia","noite","deserto","taiga","pantano","caverna","perigo"],
    "rancho-alegre": ["dia","noite","deserto","taiga","pantano","caverna"]
  },
  "camadasPropostas": ["base","dia","entardecer","noite","bioma:deserto","bioma:taiga","bioma:pantano","chuva","caverna","perigo","andando","correndo","amigosPerto","lavoura(rancho)"]
}
```

Notas sobre o resumo:
- `perigo` só toca no modo sobrevivência.
- `terra(areia)` quer dizer que o tema troca a receita de terra pela de areia
  (`exploracao-lunar/index.ts:79`).

## T04: vozes e golpes gravados no jogo (11 nov 2026)

Tocador em `src/audio/vozesGravadas.ts`, ligado na cena. O que cada momento toca agora:

| Momento | Agora | Gatilho |
|---|---|---|
| chamado do bicho (sorteio de 5 a 14 s) | 'chamado' gravado, pela distância | `chamadosCriaturas` na cena |
| chamado do bicho criado ou domado | 'contente' gravado em 70% das vezes, 'chamado' no resto (bug 5) | idem |
| golpe no bicho (`criaturaFerida`) | baque do material e do porte do bicho no índice (`pelo`, `pena`, `pano`, `gelatina`, `agua`, `lata`, `crocante` × pequeno, médio, grande) e, 60 ms depois, o "ai" gravado. Nada de cristal nem de terra (bugs 1, 2 e 4) | `tratarEvento` |
| derrota (`criaturaMorreu`) | "puf" do porte, "plop" do peixe, robô desmontando (Lua e Planeta) (bug 3) | idem |
| criatura da noite por perto | 'chamado' gravado da noturna do tema, também no Bruma (bug 6) | idem |
| domou, ganhou comida (carinho) | 'contente' gravado | idem |
| botou ovo | 'chamado' gravado do coelho (a galinha do Rancho cacareja) | idem |
| morador: falar (clique) | 'cumprimento' (conjunto A, voz do gênero do morador) | clique de uso |
| morador: golpe (vira "oi") ou ferido | 'surpresa' | `atacarNaMira`, `criaturaFerida` |
| morador: acena de volta (015) | 'cumprimento' | `gestoDoMorador` |
| morador: chamado de longe | 'cumprimento' pela distância | `chamadosCriaturas` |
| morador: troca feita | 'obrigado' na primeira troca da conversa, 'contente' nas seguintes | `brumaluz:trocou` |
| morador: troca recusada (faltam itens) | 'surpresa' gentil: volume 0,7 e tom 0,92 (bug 17) | `brumaluz:trocaRecusada` |

- **Filhote:** fica sem uso. O bicho criado é o mesmo bicho adulto (a vaca criada tem o
  tamanho da vaca), e um "bezerro" saindo da vaca grande soaria errado. As vozes de filhote
  ficam no pacote para quando houver um bicho bebê de verdade.
- **Grupo 'vozes'** no motor (ganho 1, o mesmo dos efeitos onde as vozes iam) e controle
  "Vozes" em Configurações → Áudio (padrão 100%; quem tinha baixado os efeitos começa no mesmo
  valor). Baque e derrota ficam no grupo 'efeitos', como o golpe e a quebra de antes.
- **Reserva:** até o pacote chegar (2,5 s depois de abrir o mundo, em segundo plano), ou se
  ele falhar, toca a voz sintetizada de antes. O golpe da reserva é o baque de terra (nunca o
  vidro) e a derrota da reserva é o susto sintetizado (nunca o arbusto).
- **Teto:** 8 vozes do tocador (a mais velha esmaece em 30 ms), dentro das 12 do motor.
  Espera mínima entre dois toques do mesmo momento do mesmo bicho (chamado 2 s, susto 0,5 s,
  "ai" 0,18 s...).

## T05: régua de volume, o resto do inventário e os créditos (11 nov 2026)

**Música no mesmo volume de hoje** (decisão do dono: suave, nunca mais alta). A T03 usava um
ganho só (0,7), que deixava a maioria dos temas de 2,6 a 7,8 dB abaixo da trilha de hoje. Agora
cada tema tem um ajuste por contexto (`NIVEL_TRILHA` em `src/audio/trilha.ts`, um nó de ganho
depois da saída do motor, que troca em 1,5 compasso junto com as camadas). A régua
(`e2e/trilha-regua.spec.ts`, RMS de 40 s renderizados offline, Música 60%) falha se a gravada
passar 0,25 dB da de hoje ou ficar mais de 1,5 dB abaixo. `REGUA_CRUA=1` mede sem o ajuste,
para refazer a tabela.

| Tema | dia | tarde | noite | caverna | perigo |
|---|---|---|---|---|---|
| bruma-e-luz | +2,4 → −0,47 | +2,9 → −0,47 | +5,8 → −0,48 | +4,9 → −0,52 | +4,2 → −0,53 |
| planeta-vivo | +4,1 → −0,53 | +4,5 → −0,51 | +7,0 → −0,45 | +7,2 → −0,52 | +5,5 → −0,52 |
| mata-encantada | +2,4 → −0,50 | +2,9 → −0,51 | +5,4 → −0,53 | +5,9 → −0,48 | +4,1 → −0,51 |
| doce-reino | +3,6 → −0,52 | +3,8 → −0,53 | +7,2 → −0,55 | +6,5 → −0,53 | +5,9 → −0,52 |
| era-dos-dinos | +2,1 → −0,50 | +2,6 → −0,46 | +5,1 → −0,49 | +5,0 → −0,53 | +4,0 → −0,46 |
| exploracao-lunar | +4,8 → −0,54 | +5,2 → −0,53 | +7,2 → −0,55 | +6,9 → −0,47 | +5,6 → −0,46 |
| rancho-alegre | 0 → −0,27 | +0,2 → −0,53 | +2,5 → −0,53 | +3,0 → −0,50 | (não tem) |

Cada célula: ajuste (dB) → gravada menos hoje (dB). A "tarde" compara com o dia de hoje (a
trilha de hoje não tem entardecer).

**Vozes e golpes no mesmo volume de hoje.** Régua nova (`src/audio/reguaVozes.ts`,
`e2e/vozes-regua.spec.ts`): cada som de hoje (a voz sintetizada, o baque de terra e o
farfalhar da derrota) e cada fatia gravada renderizados offline com o filtro K (o da medida de
loudness), só no tempo em que soam (janelas de 50 ms a menos de 20 dB da mais forte). Com ganho
1, as gravadas já soavam de 1 a 9 dB acima das de hoje (a estimativa de +2 dB da T04 as deixava
ainda mais altas). Agora cada tema tem um ganho por grupo (`NIVEL_VOZES` em
`src/audio/vozesGravadas.ts`); a régua falha se a média do grupo passar 0,25 dB da de hoje,
ficar mais de 1,5 dB abaixo, ou se alguma versão sozinha passar 4,5 dB da média de hoje.

| Tema | bichos | moradores | baque | derrota |
|---|---|---|---|---|
| bruma-e-luz | −2,2 → −0,50 | −3,3 → −0,54 | −0,9 → −0,54 | +0,6 → −0,50 |
| planeta-vivo | −4,6 → −0,49 | −2,9 → −0,49 | −0,1 → −0,53 | +0,7 → −0,46 |
| mata-encantada | −5,9 → −0,50 | −4,4 → −0,49 | −1,3 → −0,51 | +0,8 → −0,54 |
| doce-reino | −3,5 → −0,49 | −1,7 → −0,51 | +0,2 → −0,51 | +0,5 → −0,49 |
| era-dos-dinos | −3,6 → −0,49 | −2,7 → −0,48 | −1,5 → −0,49 | +0,4 → −0,52 |
| exploracao-lunar | −8,5 → −0,54 | −9,8 → −0,52 | −3,8 → −0,48 | −1,1 → −0,46 |
| rancho-alegre | −5,9 → −0,48 | −3,0 → −0,53 | −1,3 → −0,49 | +0,4 → −0,55 |

**Sons novos** (todos gerados na hora, curtos e macios, nenhum mais alto que o golpe de bloco;
receitas em `desenharNovo`, `src/audio/sons.ts`):
- ações: 'nhac' (fim da refeição), 'agua' (chuá ao cair na água e no bloco de água), 'nado'
  (braçada);
- mundo: 'pipoca' (tempestade do Doce), 'estalo' (tempestade solar na Lua, sem clarão), Lua
  sem chiado de chuva (`chuvaMuda`);
- gestos (`SOM_DO_GESTO`): 'aceno', 'assobio', 'brilho', 'palmas', 'danca', 'apontar', 'sentar';
- interface (pedida pela janela, `terrario:som`, `src/audio/somInterface.ts`): 'rodaAbrir',
  'rodaFechar', 'mochila', 'criar', 'conquista', 'festa' e 'toc' (cadeado da spec 016, no lugar
  da recusa).

**Créditos:** o rodapé do título diz "arte e efeitos por código, música e vozes gravadas
(créditos em Configurações → Áudio)". Em Configurações → Áudio, "Créditos dos sons" (recolhido)
lista a música (FluidR3_GM, Frank Wen e colaboradores, MIT), as gravações livres dos bichos
(Wikimedia Commons, BigSoundBank e PDSounds, com os autores) e a nossa síntese
(`src/audio/creditosSons.ts`; um teste confere que os autores batem com `indice.json`).

**Falta (fica para depois):** o laço gravado de chuva, vento, pássaros, grilos e sons da roça;
o abafado debaixo d'água e o eco da caverna; porta, enxada, jogar item, "crec" da ferramenta;
baú, menus e fechar a mochila; dormir e acordar; a vinheta de entrada por tema.
