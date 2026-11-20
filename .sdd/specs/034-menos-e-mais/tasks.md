# 034 Menos é mais: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez. Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit `tipo(034-menos-e-mais): ...` e fotos em `capturas-034/` quando há o que ver.

Na nuvem (Claude Code na web), o e2e roda com `E2E_CHROMIUM=/opt/pw-browsers/chromium npx playwright test <arquivo> --workers 2 --trace off`.

## Fase 0: as provas, no código de antes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T00 | **Antes de qualquer outra mudança** (spec, "O que muda", seção 0):<br>- `tests/temas/paridade-cinco.test.ts` com os hashes dos cinco (atlas; terreno com povoados em 3 sementes; criaturas, movimento, vozes, povoado, céu e mundo);<br>- o hash do canto do Doce;<br>- a paridade e2e com o Rancho no lugar do Bruma, gravada e conferida 36/36;<br>- as fotos de antes do nascer dos cinco;<br>- commit só disso. | M |
| T01 | ~~O painel de medida da janela~~: feita (65c6e2d) e desfeita quando a faixa azul saiu da spec (dono, 19 nov). | — |

## Fase 1: quatro mundos saem, a base fica
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T02 | **A base:**<br>- `src/temas/base/` com `temaBase()` completo e neutro, mais `corpoDeMorador` e `naCabeca`;<br>- os povoados importam dali;<br>- o resto da base fica onde está, com os comentários trocados;<br>- `paridade-bruma` vira `paridade-base`, com os mesmos hashes. | M |
| T03 | **Os cinco temas:**<br>- `IdTema` com os cinco e `TEMA_PADRAO = 'vila-neon'`;<br>- `obterTema` cai na base;<br>- a ordem explícita dos cartões;<br>- "Meu primeiro mundo" e todo mundo novo com o tema gravado;<br>- as reservas `?? 'bruma-e-luz'` saem. | P |
| T04 | **Sai o que é só dos quatro** (a lista da spec, completada pela busca):<br>- pastas, formas e listas do saneamento, segundo sol;<br>- a alma (d1 a d3, banca, chaves de XP, `mundoAlmaDoEstilo`, habilidades);<br>- o ramo `'dinos'` do canto, sem tocar no Doce nem no caminho do e2;<br>- fantasias, peças e desenhos;<br>- nomes, `DO_TEMA`, `NOMES_TEMAS` e os níveis de som;<br>- o gemido do espectro;<br>- os pacotes de som, o índice recalculado e os 16 créditos (mais o teste "todo som tem crédito");<br>- as prévias e a imagem de compartilhar (fica para a T09).<br><br>Os hashes da T00 continuam iguais. | G |
| T05 | **Textos e rastros:**<br>- nenhum texto com "bruma" ou com os nomes dos quatro nos cinco (teste por tema);<br>- a limpeza das chaves do aparelho e a regravação de `terrario:aparencia` e `terrario:trilha-saida`;<br>- testes de cada limpeza;<br>- moedinhas, XP e nível ficam. | P |
| T06 | **Testes de unidade e docs:**<br>- os testes de unidade que usavam os quatro, adaptados sem perder o que protegem;<br>- servidor e scripts (`salas.test.ts`, `carga.mjs`, `escuta-temas`, `vitrine-*`);<br>- `README.md`, `ARCHITECTURE.md` e `e2e/paridade/LEIAME.md`. | M |

## Fase 2: os mundos salvos
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T07 | **No aparelho:**<br>- a limpeza depois de `prepararFormato`, primeiro o índice e depois os dados;<br>- o tema desconhecido fica;<br>- o mundo aberto que saiu dá lugar ao próximo;<br>- testes com armazém em memória. | P |
| T08 | **Na nuvem:**<br>- `Armazem` lista mundos e salas e apaga a pasta do mundo (Azure e memória);<br>- a varredura pelos mundos depois do `listen`, e de novo em ~10 min;<br>- a remoção na leitura;<br>- o log sem nome;<br>- `recusar('versao')` para tema removido;<br>- `VERSAO_REDE` 17;<br>- os testes da seção 2.<br><br>**Investigar:** as memórias de `encontrarNascimento` e dos planos de povoado são chaveadas só pela semente. No servidor, que abre mundos de temas diferentes no mesmo processo, dois mundos com a mesma semente (ex.: 1337) e temas diferentes podem trocar de plano. Se for verdade, a chave passa a levar o tema, com teste. | M |

## Fase 3: prévias e ícones
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T09 | **Prévias:**<br>- o roteiro cobre todos os temas, com enquadramento por tema;<br>- a Vila Neon nova, a Lua e o Rancho refeitos;<br>- a Cidade e o Doce conferidos;<br>- a imagem de compartilhar;<br>- o teste "todo tema tem prévia";<br>- fotos do cartão nos três tamanhos. | M |
| T10 | **Ícones dos gestos, a folha:** as direções A e B com o boneco do jogo, os 11 gestos e a carinha, no tamanho real da roleta e do balão.<br><br>**Para aqui:** o orquestrador leva ao dono. | M |
| T11 | **Ícones dos gestos, a escolhida:** no jogo, na roleta, no balão e nas carinhas, em pé e deitado; os e2e de gestos e da roleta passando. | M |

## Fase 4: a faixa azul do iPhone
Saiu da spec (dono, 19 nov): vai com a casca nativa (020). A T12 não existe mais.

## Fase 5: os testes
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T13 | **Os e2e que dependiam dos quatro:**<br>- rodar todos;<br>- os que caírem pela troca para a Vila Neon recebem o tema que faz sentido, escrito no teste;<br>- `e2e/temas.ts`, `temas.spec.ts`, `alma.spec.ts`, `roleta-mundos`, `fantasias-aba`, `capturas-fantasias`, os palcos de achar-amigo, `missoes-dinos-doce` (a parte do Doce) e os outros da lista do mapa. | G |
| T14 | **Os que já falhavam e os instáveis:** a causa de cada um e o conserto (do jogo ou do teste, dito no registro); 3 rodadas seguidas verdes. | M |
| T15 | **Nada voltou para trás:**<br>- Vitest inteiro;<br>- `npm run build`;<br>- os hashes da T00;<br>- paridade 36/36;<br>- o e2e inteiro em pedaços de 2 trabalhadores;<br>- a busca no `dist/`;<br>- as fotos de depois contra as de antes. | M |

## Fase 6: acabamento e publicação
| # | Tarefa | Tamanho |
| --- | --- | --- |
| T16 | **Portão visual:**<br>- a escolha de mundos e os gestos, em pé de dia e de noite, e deitado;<br>- autocrítica e refazer;<br>- o revisor novo só com as fotos;<br>- acertos. | M |
| T17 | **Publicar:**<br>- push na `main` e cancelar na hora a execução de `publicar.yml`;<br>- disparar `servidor.yml` com `agora: true`;<br>- a revisão nova de pé e o log da varredura;<br>- disparar `publicar.yml` de novo;<br>- conferir no ar;<br>- o relatório para o dono e a Situação aqui. | P |

**Ordem:** T00 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 (o dono escolhe) → T11 → T13 → T14 → T15 → T16 → T17.

## Situação
- **(19 nov 2026) Spec aprovada.** O revisor aprovou com ajustes; os ajustes entraram (ver "Revisão da spec") e ele conferiu a versão final.
- **Linha de base nesta máquina** (nuvem, sem placa de vídeo):
  - Vitest: 204 arquivos, 2044 de 2044;
  - os e2e precisam de `E2E_CHROMIUM`; `fumaca` passa 3 de 3.
- **(20 nov 2026) T00 feita** (501f256, f0a26d8, a65117b):
  - hashes dos cinco (atlas, terreno com povoados em 3 sementes, plano urbano e metas, sons, dados e resto do tema) e do canto do Doce;
  - fotos de antes com `escala=1`.
  - A paridade agora é Rancho + Doce, 36/36 conferida duas vezes nesta máquina.
  - Na nuvem a paridade não fechava com tema nenhum: a saturação caía 5→4 conforme a duração em tempo real, a ~1 FPS. O atalho de teste `relogioCansa` desliga só o cansaço do relógio durante a paridade; o servidor de produção não aceita `depurar`. A queda pela exaustão ficou coberta por testes de unidade.
  - O roteiro da raposa na paridade estava errado: ela é curiosa e para a ~2,75 blocos, e o jogador ficava a 1,6.
  - **As fotos de depois (T15) têm de ser tiradas na nuvem**, por software (SwiftShader), como as de antes (`capturas-034/antes`, `CAPTURAS_034=depois`, mesma semente, hora e `escala=1`): na placa de vídeo do computador do dono o desenho e a chegada dos chunks mudam, e a comparação deixaria de ser do mesmo jeito.
- **(20 nov 2026) Ajustes da revisão da T00**, ainda no código de antes:
  - `paridade-cinco`: hash dos nomes dos moradores (cada nome com o gênero, e `nomeDoMorador` e `generoDoMorador` de n = 0 a 8 em cada profissão nos povoados achados, na cidade e no bairro), hash dos textos aplicados (a busca por "bruma" e pelos nomes dos quatro não achou nenhuma chave nos cinco: a lista das chaves de fora fica vazia e o teste confere a busca), e as regras de `musica` (sem os créditos) e `vozes` do índice no hash dos sons;
  - a sessão `sobrevivencia` da paridade confere que a exaustão gravada não sobe parada 6 s logo depois de abrir (o núcleo desligou de fato o cansaço do relógio). Ela não começa sempre em 0: na semente 42 do Rancho o nascer já dá 0,2 exatos (um passo de pulo); com o relógio religado, de prova, subiu de 0,2 a 0,38 em 6 s.
- **T01 feita e desfeita** (65c6e2d, 947ba23): a faixa azul saiu da spec.
- **(20 nov 2026) T11 feita** (4a57bfc, caf511c, d5d8ca5), na direção A reforçada que o dono aprovou (`capturas-034/gestos/folha-A2.png`):
  - os 11 gestos e a carinha de Gestos são o boneco do jogo com o objeto forte de cada gesto, na roleta, na carinha do menu e da plaquinha Voltar, no balão em cima da cabeça (contorno engrossado para a textura de 256 ler bem) e nas carinhas dos amigos (o aceno de quem chama e o botão Chamar);
  - o esboço `gestos034` saiu do código; o roteiro de fotos (`e2e/capturas-gestos.spec.ts`) fica fora da suíte;
  - as fotos estão em `capturas-034/gestos-jogo/`: a roleta de Gestos (um por um), o menu, o balão de sempre e o de estrelinha, em pé de dia e de noite, deitado e no computador, e as carinhas dos amigos no celular;
  - os e2e de gestos e da roleta (`gestos`, `menu-roda`, `roleta`, `roleta-mundos`, `premium-presentes`) precisam ser conferidos na placa de vídeo: nesta máquina eles caem também na `main` (o toque passa de 600 ms e a roleta fecha sozinha antes do passo seguinte).
- **(20 nov 2026) T13 feita** (f45c59c, fb6b0ef, acdf53e), nesta máquina (nuvem, sem placa de vídeo):
  - cada e2e que caiu pela troca para a Vila Neon recebeu, escrito nele, o tema do que protege: Doce Reino para terreno natural, povoado com trocas e perigo; Exploração Lunar para "sem missões" e para o Eco-sombra no lugar do Saci; Vila Neon para o roqueiro e para quebrar fora do bairro protegido (`mundo`, `temas`);
  - `mundo.spec`: na prévia `?tema=doce-reino` não há mundo guardado e salvar dava false; o teste volta ao "Meu primeiro mundo" e quebra fora do bairro (passou);
  - conferência: o que ainda cai da lista foi rodado também na `main` 65b0a57, nesta mesma máquina, e cai lá igual ou pior (camera:112, gestos ×3, menu-roda ×4, mineração das capturas, mira-toque, trilha:95, construções na nuvem, multiplayer, premium ×2, roleta-mundos, fantasias-aba); nada novo da 034. As causas são da máquina (abaixo, e o que sobrar vai para a T15).
  - Sem par na `main`: o golpe no Eco-sombra (`vozes`) toca o "ai" e o chamado gravados, mas o baque de pano não chega nos 450 ms depois do primeiro golpe, nesta máquina; na `main` o teste do Saci nem chegou lá (abriu o Bruma, a corrida do índice da T14). Conferir na placa de vídeo.
- **(20 nov 2026) T14**: a causa de cada um e o conserto.

  | Teste | Causa | Conserto | Aqui |
  | --- | --- | --- | --- |
  | `criacao` ×2 | (1) a dica dizia "uma semente": o feno da Vila na lista da vaca; (2) às vezes o mundo novo abria como o "Meu primeiro mundo" (na `main`, as vozes abriam o Bruma no lugar da Mata): o salvar automático lia o índice dos mundos, esperava e regravava por cima do mundo recém-criado | do jogo: a dica só com a comida do mundo (f45c59c); o índice numa fila, um por vez, com teste de armazém lento (b4c6175) | celular verde 3 rodadas seguidas; computador esgota os 400 s nesta máquina (a vaca e o `sincronizar` a 1 quadro por segundo), também na `main` |
  | `temas` Cidade Grande e Vila Neon | a Vila: o chão do bairro é protegido e o bloco nem sai | do teste: quebra fora do bairro, como a Cidade (fb6b0ef) | os dois verdes |
  | HUD do `plantio` no celular | a medida vinha logo depois do texto da dica, ainda na entrada de 0,18 s (opacidade < 0,05, fora dos "vistos") | do teste: espera a dica surgir, como já fazia com o aviso (b4c6175); folga de 20 s para a dica chegar na nuvem (c10c575) | a dica passa; o aviso seguinte some antes de assentar, a 1 quadro por segundo |
  | `trilha-regua` | a Vila Neon (+0,7 a +1,8 dB): a régua da 019 compara o RMS com a trilha sintetizada de antes dela, e a Vila (026) foi afinada pelo volume percebido (LUFS) na média do Rancho e da Cidade; o synth-pop tem mais grave | do teste: a Vila ficou na régua com a faixa dela (−0,6 a +2,1 dB, a medida de hoje com folga; 2652538, decisão do orquestrador na revisão), e a regra da 026 ganhou teste de unidade com as medidas do pacote (d508ee8) | cada contexto leva ~6 min aqui: os outros quatro temas não cabem no tempo; conferir na placa de vídeo |
  | `vozes-regua` | a Vila Neon não tem pacote de vozes ("tema sem vozes no índice") | do teste: só os temas com vozes, e confere que só a Vila fica de fora (fb6b0ef) | esgota os 9 min aqui; conferir na placa de vídeo |
  | testes de tempo do Vitest | mediam a máquina ocupada, não o código | do teste: o melhor de algumas rodadas e a lavoura contando trabalho (f45c59c); a maior medida em 20 rodadas fica muito abaixo de cada teto (caminho 6,0 ms de 15; proteção 0,81 ms de 20 por chunk; permissão 1,45 µs de 100) | 20 rodadas sozinhas e 3 com o e2e rodando junto: verdes |
  | roleta (menu-roda, `roleta`, premium:51, gestos, roleta-mundos, guia) | (1) o toque vale até 600 ms entre encostar e soltar, e o botão abre os gestos com 450 ms (relógio da página); o Playwright manda os dois em mensagens separadas, e na nuvem o soltar chegava depois; (2) a roleta fecha sozinha em 8 s de relógio e assenta contando quadros, e um passo do teste (uma foto) leva segundos aqui | do teste: o toque rápido, numa sequência só (c10c575); o balão dos gestos conta o relógio do jogo, com folga para 1 quadro por segundo (c10c575) | o toque passa (abre o menu), mas a roleta ainda fecha antes do passo seguinte, também na `main`: causa da máquina |
  | `guia-chegada` c3 e c6, `tesouro-fantasia` | aqui: os da roleta (acima) e toques de 10 s que esgotam; a causa na placa de vídeo não foi achada nesta máquina | — | conferir na placa de vídeo |
  | `achar-amigo-nuvem` (instável) | aqui: com dois navegadores a página não fica pronta em 180 s | — | conferir na placa de vídeo |

  - Falta: as 3 rodadas seguidas dos que só rodam de verdade na placa de vídeo (as réguas, guia-chegada, tesouro-fantasia, achar-amigo-nuvem, a roleta).
- **(20 nov 2026) T15, a parte sem placa de vídeo** (nesta máquina, na nuvem; a suíte e2e inteira roda no computador do dono):
  - **Vitest inteiro:** 211 arquivos, 1985 de 1985 (eram 2044 em 204 antes da 034: saíram os testes dos quatro); `npm run build` limpo.
  - **Hashes da T00:** `paridade-cinco` (6) e `paridade-base` (3) passam, sem nenhum hash regravado depois da T00 (o canto do Doce foi só dividido em duas partes, plano e chunks, em e4e62fe, com os de antes no comentário).
  - **Busca no `dist/`** (build novo): zero ocorrências de "Bruma e Luz", "Planeta Vivo", "Mata Encantada", "Era dos Dinos", "Fantasia de Dino", "Guardiã da Mata", "Guardião da Mata", "Lanterneira", "Lanterneiro", das peças `capuz-dino`, `jaleco`, `coroa-folhas`, `capa-folhas`, `capuz-lanterneira`, e dos nomes de morador só dos quatro (Zib, Plim, Blup, Quark, Nebi, Glim, Tuti, Bop, Lulo, Ziza, Lila, Iris, Otto). O que aparece, e por quê:
    - `brumaluz` (o gancho dos testes, o banco do aparelho, os eventos), `corBruma`/`forcaBruma`/`brumaM` (a névoa no desenho) e o bloco `areia-bruma` (o nome na tela é "Areias douradas"): nomes internos;
    - "Cientista": o modelo `musgueira`, que fica;
    - as listas da limpeza do aparelho (os ids dos quatro temas e das quatro fantasias, e os finais " da Bruma", " dos Dinos", " da Mata", " Estelar" do apelido): precisam deles para limpar, nunca vão para a tela;
    - Teo, Mira, Nina, Rui, Luz, Ivo: o povoado de reserva da base, que continua (com hash), e não aparece com os cinco registrados; Nina, Zuzu e Pipo também são da plateia do show da Vila;
    - "Onde a bruma brilha", "Espectro da bruma", "Caçador da bruma", "coelho-bruma": os textos de registro da base; nos cinco eles têm texto próprio (`textosDosCinco`);
    - levados ao dono: a palavra `BRUMA` na lista dos códigos de sala (`src/jogo/codigos.ts`; um código podia sair "BRUMA-LUA-12") e a fantasia livre "Herói da Mata" (`heroi-mata`, de folha, não é do tema). **Decisão do dono (20 nov 2026):** "BRUMA" sai do sorteio dos códigos (201 × 200 × 100 = 4,02 milhões de combinações) e continua aceita na leitura, para as salas que já existem com ela continuarem entrando (`PALAVRAS_SO_DE_LEITURA`, com teste); "Herói da Mata" fica. Mexe no servidor (o sorteio é dele): publicar o servidor junto.
  - **Fotos de depois** (`CAPTURAS_034=depois`, nesta máquina, por software, como as de antes; 10 de 10): `capturas-034/depois/`, e as folhas lado a lado antes|depois por tema e tamanho, com a interface e só a cena, em `capturas-034/comparacao/`. Conferidas uma a uma: o terreno, as construções, as árvores, o céu, a luz e a interface dos cinco são os mesmos. As diferenças que aparecem:
    - o balão de gesto dos moradores da Cidade com o ícone novo da T11 (era a mãozinha);
    - bichos e moradores em outro lugar (andam com o relógio; a vaca do Rancho, o cachorro e o coelho do Doce, o coelho da Lua);
    - na Cidade a 390×844, a ferramenta da barra no desenho de pixel (antes, no desenho 3D): os ícones 3D dos brinquedos chegam num lote assíncrono, e a foto pegou cada um num momento (a 1280×720, os dois no de pixel);
    - no Doce, o vidro de baixo da janela um pouco mais escuro (o que aparece atrás do vidro);
    - nenhuma vem dos quatro temas que saíram.
  - **Portão visual, ajustes do revisor das fotos** (os 4 ícones de gesto esperam o dono):
    - prévia do Rancho mais perto e mais baixa, com a distância de visão maior: sem a faixa de neve à esquerda e sem a borda do mundo (o sítio com o moinho, a casa, o celeiro e a lavoura no centro);
    - prévia da Lua refeita: a floresta de cristais roxos no chão cinza, a ~90 blocos do nascer, olhando para a Terra (o chão quase branco da base parecia neve no cartão);
    - cartões de criar mundo: a descrição começa colada no título em todos (o texto do cartão não estica mais as linhas na altura que sobra);
    - no cartão do mundo salvo (1280×720), o "·" solto e a data quebrada em coluna: a lista de mundos (`src/ui/mundos.ts`) não mudou na 034, já era assim na `main` (a coluna do meio fica estreita com os quatro botões ao lado). Anotado, não mexido;
    - `public/compartilhar.jpg`: a tela em 1400×735 fotografada em 1200×630, com margem embaixo do cartão "Criar mundo novo", e a câmera um passo à frente do boneco (nada dele atrás dos botões). A descrição da Vila Neon na vitrine continua o `lema` do tema ("O bairro anos 80 com o show do Festival Trovão"): o cartão de mundos mostra o `convite`, e o lema está no hash da T00; igualar pede mudar a vitrine para o convite em todos os temas (no celular o da Lua passa de 3 linhas) — para decidir;
    - a roleta de Gestos no computador: o 11º gesto (o roqueiro da Vila) ganhava o selinho "1" repetido; agora só 1 a 9 e 0 têm selinho (57e52c3; já era assim na `main`);
    - o contador de FPS aparece por padrão no jogo publicado (`mostrarFps: true` em `src/jogo/config.ts`, desligável em Configurações; já era assim antes da 034): decisão do dono, só relatado;
    - o ícone da ferramenta na barra da Cidade a 390×844: confirmado no código, os ícones 3D dos brinquedos são feitos depois de o mundo ficar pronto, poucos por quadro (`gerarIconesBrinquedo`), e até lá vale o desenho de pixel.
  - **Paridade 36 de 36** (`PARIDADE=conferir`, um trabalhador, 55 min), contra a gravação da T00, no código depois dos ajustes da revisão.
- **(20 nov 2026) O apelido** (decisão do dono, 972c346): o apelido guardado que termina em " da Bruma", " dos Dinos", " da Mata" ou " Estelar" troca só o final por " da Vila", na limpeza do aparelho; idempotente, com teste.
- **(20 nov 2026) Suíte e2e na placa de vídeo, 1ª rodada** (computador do dono, em 1a968b1, com a placa dividida com o esboço da 027):
  - 211 de 218 passaram (204 de primeira, mais 7 na repetição); a paridade deu 36/36.
  - Caem duas vezes e **também na `main`** (não são da 034): `construcoes-protegidas:151` (três amigos na nuvem), `guia-chegada:128` (c6 em pé), `plantio:210` (HUD do Rancho no celular), `premium-presentes:207` (premium em 1 s; na main 1125 ms) e `tesouro-fantasia:61` (instável nas duas). A T14 não os fechou na placa de vídeo: ficam no backlog como "testes antigos instáveis".
  - Caem só na 034, por limite de tempo ou de volume e na beira (a main rodou uma vez só): `achar-amigo-nuvem:99` (pulo 2657/2545 ms; limite 2500; main 2174/2403), `som-veiculos:61` (sorvete +4,30/+4,93 dB; precisa >5; main 6,16) e `lojinha:107` (3609/3557 ms; limite 3400; passou na repetição). Uma 3ª rodada, alternando main e 034 sem o esboço na placa, separa regressão de instabilidade.
  - Os nove que caem por tempo na nuvem (menu-roda, roleta, gestos, réguas, guia, tesouro, achar-amigo) passam na placa de vídeo, fora os listados acima.
- **(20 nov 2026) Na placa de vídeo, a 3ª rodada:** 6 passadas alternando `main` (65b0a57) e 034 (ec4f682), com 1 trabalhador e sem o esboço na placa. **Nenhuma das três diferenças se sustenta:**
  - `som-veiculos` (sorvete, precisa de mais de 5 dB): a `main` deu 5,76, 5,83 e 4,90, e caiu na 5ª passada (os bombeiros deram 0,38 dB); a 034 deu 5,85, 5,92 e 6,18. Fica perto do limite nas duas.
  - `achar-amigo-nuvem` (o pulo, limite de 2500 ms):
    - nas duas versões, entre 2,0 e 2,6 s; a 034 passou do limite uma vez (2641 ms);
    - a `main` caiu uma vez no celular porque a Ana não via a Bia: é o defeito da 035, que também existe na `main`.
  - `lojinha:107` (limite de 3400 ms): a `main` foi de 1145 a 3460 ms e passou do limite uma vez; a 034 ficou entre 2772 e 3011 ms.
  - Os três ficam no backlog com os testes antigos instáveis.
- **(20 nov 2026) Na placa de vídeo, a 4ª rodada** (em 380fdae, 2 trabalhadores): 30 de 32 passaram.
  - Resolvidos:
    - `multiplayer:31` passou 3 de 3 (do link ao mundo pronto: 4,7 a 5,1 s);
    - a roleta e o menu-roda no celular voltaram a passar com o `tap()`;
    - `premium-presentes:207` ficou abaixo de 1 s pela primeira vez;
    - passaram também gestos, roleta-mundos e os outros testes do guia.
  - `guia-chegada:128` cai igual na `main`.
  - `construcoes-protegidas:151` não é instabilidade:
    - na 034, parou sempre no mesmo ponto, quando o Léo mira a parede da Bia (4 de 4 no dia);
    - na `main`, cai em outro ponto e passa às vezes;
    - a causa está sendo investigada: o teste foi para o Doce Reino nesta spec.
- **(20 nov 2026) O teste dos três amigos** (cea3f45, só no teste):
  - a causa: no Doce Reino, semente 1337, a busca do campo livre parava na copa de uma árvore. A parede da Bia ficava no ar, 8 blocos acima do chão, fora do alcance da mira do Léo;
  - o conserto: agora o campo exige chão de verdade e nada mais alto entre quem fica e os blocos, e o teleporte vai com a altura do campo.
- **(20 nov 2026) Na placa de vídeo, a rodada final** (em cea3f45): 13 de 13.
  - `construcoes-protegidas` 3 vezes: o arquivo inteiro passou;
  - `multiplayer` (do link ao mundo pronto, 6,1 s);
  - `achar-amigo-nuvem` no computador e no celular.
- **(20 nov 2026) A revisão do conserto da entrada na nuvem** (e7027fb):
  - aprovada;
  - os ajustes entraram em 1fb86a4: a leitura do aparelho que falha não trava a entrada, o teste ficou menos literal, e a 035 registra o que já entrou;
  - Vitest inteiro: 212 arquivos, 1991 de 1991. `npm run build` limpo.
- **Fica para depois** (backlog, "testes antigos instáveis", que caem também na `main`):
  - `guia-chegada:128` (c6 em pé, a mãozinha em 4 s);
  - `plantio:210`, `tesouro-fantasia:61`;
  - os de beira de limite: `som-veiculos:61`, `lojinha:107`, o pulo do `achar-amigo-nuvem`.
- **Falta:** a rodada em família, que é o dono com as crianças no aparelho de verdade.
