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
  | `trilha-regua` | a Vila Neon (+0,7 a +1,8 dB): a régua da 019 compara o RMS com a trilha sintetizada de antes dela, e a Vila (026) foi afinada pelo volume percebido (LUFS) na média do Rancho e da Cidade; o synth-pop tem mais grave | do teste: a Vila sai da régua da 019, e a regra da 026 ganhou teste de unidade com as medidas do pacote (d508ee8) | cada contexto leva ~6 min aqui: os outros quatro temas não cabem no tempo; conferir na placa de vídeo |
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
    - **para o dono decidir:** a palavra `BRUMA` na lista dos códigos de sala (`src/jogo/codigos.ts`; um código pode sair "BRUMA-LUA-12") e a fantasia livre "Herói da Mata" (`heroi-mata`, de folha, não é do tema). Nenhum dos dois foi mexido: tirar a palavra muda a conta dos códigos e os que já existem.
- **(20 nov 2026) O apelido** (decisão do dono, 972c346): o apelido guardado que termina em " da Bruma", " dos Dinos", " da Mata" ou " Estelar" troca só o final por " da Vila", na limpeza do aparelho; idempotente, com teste.
