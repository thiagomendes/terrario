---
id: 016-construcoes-protegidas
title: 'Construções protegidas: o que o mundo fez não quebra, e cada um só quebra o que colocou'
status: IN_PROGRESS
base_branch: main
branch: feat/construcoes-protegidas
created_at: 2026-11-10T14:00:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
environment: docker
full_test_command: npx vitest run && scripts/e2e-gpu.sh
install_command: npm ci --no-audit --no-fund
---
## Contexto
Ideia do dono (10 nov 2026), com a estratégia aprovada: sair do modelo "tudo quebra tudo". Quebrar a casa do sítio ou a parede do amigo frustra a criança e deixa o jogo com cara de bagunça. As regras foram refinadas com o dono em 11 nov 2026: o dono do mundo **não** pode tudo. O que o mundo construiu é blindado até para ele.

## Objetivo
- O que o mundo construiu fica sempre de pé e bonito.
- No multijogador, cada criança tem a sua construção segura.
- Ninguém some com o baú nem com o bicho do outro.
- O que é protegido fica claro sem ler: cadeadinho na mira e aviso curto.

## Regras (decididas com o dono em 11 nov 2026)
### 1. O que o mundo construiu é blindado: ninguém quebra, nem o dono
- **O que entra:** casas dos povoados, sítios (casa, celeiro, silo, curral, galinheiro, moinho), ruínas e estruturas raras. Vale em **todo modo**: sobrevivência, criativo, sozinho e com amigos.
- **O chão embaixo e em volta também:** o terreno sob a construção, mais uma pequena margem, fica protegido, para ninguém cavar por baixo e deixar a casa flutuando.
- **Continua usável por todos:** portas, porteiras, camas, mesas, fornalhas e baús do povoado. A lavoura do sítio é colhida e se replanta sozinha.
- **Enfeitar pode:** dentro e em volta das construções do mundo, a criança coloca e tira as **próprias** coisas (flores, mesa, baú). Só não dá para tapar porta, porteira e passagem da construção.

### 2. O que cada um colocou: só ele quebra, e o dono do mundo também pode
- O bloco guarda quem o colocou. O amigo entra, abre a porta e usa a mesa, mas não quebra a parede do outro.
- **Sem opção no convite:** cada um só quebra o seu, sempre.
- **O dono do mundo pode desfazer a construção de um amigo** no mundo dele, por exemplo se alguém fechar a porta do sítio com blocos.
- O que um amigo colocou continua dele depois que ele sai.
- **Mundos antigos:** blocos colocados antes, sem dono registrado, passam a ser do dono do mundo. Ao "levar para a nuvem", o que o dono construiu no aparelho é dele.
- **Jogando sozinho:** a criança é a dona de tudo o que colocou; só a regra 1 muda algo.

### 3. Terreno natural livre
- Pedra, terra, areia, árvores e minérios quebram como hoje, para todos, menos o chão protegido da regra 1.

### 4. Baús, bichos e portas
- **Baú colocado por alguém:** só quem colocou e o dono do mundo abrem e mexem. Os baús do mundo (povoado, ruínas) são de todos.
- **Bichos criados:** quem criou e o dono do mundo chamam com o gesto "chamar" e levam. O bicho do amigo fica onde está. Os bichos ganham um dono, e os já criados ficam com quem os criou, se conhecido, ou com o dono do mundo.
- **Portas e porteiras:** visitantes abrem e fecham as do mundo e as dos amigos, mas não quebram.

### 5. Ao tentar quebrar algo protegido
- A rachadura nem começa: aparece um cadeadinho na mira e um aviso de criança, como "Essa casa é da vila. Que tal construir a sua?" ou "Essa parede é da Ana".
- O aviso não se repete a cada clique, porque usa a fila de avisos sem repetição da 015.

## Fora de escopo
- Terrenos demarcados ("lote" de cada criança) e permissões finas por pessoa.
- Explosões e fogo (o jogo não tem).

## Lições aplicadas
1. **Uma regra só para prever e para conferir:** a mesma função de proteção no núcleo (servidor e modo local) e no cliente (cadeado e rachadura), como a regra de alcance da 015.
2. **O servidor não confia no aparelho:** a quebra proibida é recusada no servidor, o cliente volta o bloco e nada some.
3. **Comando com saneamento e teste no modo nuvem** para tudo o que mudar no protocolo, como o dono do bloco nas edições.
4. **Mundos antigos abrem iguais** (migração do dono), e as salas na nuvem seguem valendo.
5. **Leve:** a proteção do mundo é calculada da geração (sem gravar bloco por bloco), e o dono do bloco é gravado de forma compacta nas edições.

## Capricho na experiência (para não frustrar)
- **Sem ler:** cadeadinho na mira antes mesmo de bater. No toque, o contorno do dedo fica com cadeado.
- **Nada some:** nenhuma quebra "pisca" e volta. O cliente prevê com a mesma regra do servidor.
- **Avisos curtos e gentis,** com o nome do amigo ou da vila. Nunca "acesso negado".
- **O dono entende o poder dele:** ao desfazer a construção de um amigo, aparece um aviso discreto ("Você tirou um bloco do Léo").
- **Medido:** nada de queda de quadros ao mirar e minerar; conferir a proteção não pode custar mais que 0,1 ms por bloco mirado; mundos grandes abrem no mesmo tempo de hoje.
- **Revisão jogando de verdade,** com 3 jogadores na nuvem, no computador e no celular.

## Critérios de qualidade (definição de pronto)
1. **Regra 1:** nenhuma construção do mundo nem o chão protegido quebram, em nenhum modo, para ninguém. Testado em todos os temas com povoado ou sítio.
2. **Regra 2:** no multijogador, cada um só quebra o seu, e o dono quebra o dos amigos. Recusa no servidor, previsão igual no cliente e teste no modo nuvem.
3. **Enfeitar:** dentro e em volta das construções do mundo funciona. Tapar porta, porteira ou passagem é recusado com aviso.
4. **Baú e bichos** seguem a regra 4, também no servidor.
5. **Mundos antigos e "levar para a nuvem"** abrem iguais, com o dono certo nos blocos.
6. **Cadeado e avisos** no computador e no toque.
7. **Desempenho medido;** todos os testes passam; auditoria independente; relatório visual.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Proteção do mundo: volumes das construções geradas (povoados, sítios, ruínas, raras), chão e margem, portas e passagens; uma função usada no núcleo e no cliente |
| T02 | Dono do bloco: gravar quem colocou nas edições (local e nuvem), protocolo e saneamento, migração dos mundos antigos e do "levar para a nuvem" |
| T03 | Regras no núcleo: quebrar, colocar (sem tapar passagem), baú, bichos criados (dono e chamar) e portas; recusa no servidor com o motivo |
| T04 | Cliente: cadeado na mira e no toque, rachadura que não começa, avisos com nome, aviso do dono ao desfazer |
| T05 | Desempenho, testes de tela (3 jogadores na nuvem), auditoria, publicação e relatório visual |

## Notas da T01 (proteção do mundo)
- **Uma função, da geração:** `src/world/protecao.ts`. O chunk refaz num rascunho o último passo de `gerarChunk` (`pintarEstruturas`, o mesmo código que a geração usa agora) e classifica cada célula. Nada é gravado: a máscara fica em memória por chunk (só a faixa de altura protegida, poucos KB), com limite de 512 chunks, e se esquece sozinha quando o estilo do mundo ou as regiões sem povoado mudam. Núcleo (servidor e modo local) e cliente criam a sua com `criarProtecaoMundo(semente)`.
- **O que a célula é:** `livre` (terreno natural e o vão das construções: enfeitar pode), `estrutura` (o que a geração pôs), `usavel` (porta, porteira, cama, mesa, fornalha e baú do mundo: não quebra, usa), `lavoura` (pé da lavoura gerada: colhe e replanta o estágio 0 da mesma planta, `replantioDaLavoura`), `chao` e `passagem`. Ajudas: `naoQuebra`, `naoColoca`.
- **O que entra:** todas as construções dos povoados e sítios em todo tema (casas de toda forma, oficinas, depósito, marco da praça, postes, casa da fazenda, celeiro, ferraria, silo, lavoura, curral, galinheiro, moinho), as ruínas e as estruturas raras dos temas (cúpula, círculo, arcos, casinha, ninho, espantalho, torre). Plantas de enfeite postas pela geração (grama alta, cogumelo da ruína) ficam livres. A água do poço, da fonte e do bebedouro conta como estrutura (ninguém tapa).
- **Margem do chão:** o piso do povoado (lotes, praça e caminhos) e mais 2 colunas em volta, do chão até 3 blocos abaixo; na ruína, o piso 7x7 e mais 2 colunas. Duas colunas é a borda plana que o povoado já aplaina: quem cava encostado na parede não abre buraco sob a casa, e dali para fora a rampa é terreno de cavar como sempre. Três blocos de fundo bastam para nada ficar no ar (a geração já não abre caverna sob o povoado).
- **Passagens:** na frente de toda porta (s = 3), da célula de fora (onde o caminho começa) até o miolo da casa (onde o morador dorme), dois blocos de altura; o portão largo do celeiro (3 de largura e 3 de altura); a trilha do meio da lavoura; as duas células do vão da porteira (fora e dentro); os caminhos dos moradores; a porta da cúpula e da casinha das estruturas raras.
- **Estruturas já mexidas nos mundos salvos (decisão):** a proteção vale para a forma gerada. Uma célula da estrutura que hoje está vazia (alguém quebrou antes desta spec) continua `estrutura`: ninguém a tapa com outra coisa. Recomendação para a T03: aceitar ali só o bloco que a geração pôs (`gerado`), como conserto; e um bloco diferente que alguém pôs no lugar da estrutura (mundo antigo) segue a regra 2 (é de quem pôs, ou do dono do mundo). **Não restaurar ao carregar:** restaurar mexeria nas edições salvas (portas e porteiras abertas, colheitas, baús), na paridade gravada da 009 e nas salas da nuvem, e um mundo antigo deixaria de abrir igual (lição 4).
- **Medido** (`tests/world/protecao.test.ts`, sítio do Rancho, 16 chunks): máscara ~0,23 ms por chunk na primeira mira; consulta ~0,1 µs; amortizada do zero ~0,4 µs (o teto da spec é 0,1 ms).
- **Para ver:** `window.__brumaluz.protecao(x, y, z)` e `tingirProtecao(raio, tipos?)` (só nos testes de tela) e `CAPTURAS_PROTECAO=1 npx playwright test e2e/capturas-protecao.spec.ts`.

## Decisões do dono
- 10 nov 2026: estratégia aprovada (o mundo não quebra; cada um quebra o seu); 016 antes da 014.
- 11 nov 2026: o que o mundo construiu é blindado até para o dono, em todo modo, com o chão protegido; sem opção de "construir junto" no convite; o dono do mundo desfaz a construção dos amigos; baú só de quem colocou e do dono; bichos criados chamados só por quem criou e pelo dono; visitantes abrem e fecham portas e porteiras; enfeitar dentro das construções pode, sem tapar portas. Sem esboço grande: a spec vai direto.
- 11 nov 2026: **mundos antigos apagados, sem retrocompatibilidade.** Depois da 016 todos começam de novo: os mundos do aparelho de antes da 016 são apagados uma vez (o personagem e as preferências ficam) e o Storage da nuvem é limpo na publicação. Não há migração de dono para mundos antigos. O "levar para a nuvem" continua: o que o dono construiu no aparelho é dele.
- 11 nov 2026: **a fornalha posta por alguém segue o baú:** só quem pôs e o dono do mundo abrem e mexem (pôr combustível, tirar o que saiu); a fornalha que o mundo gerou (povoado) continua de todos. Aviso: "Essa fornalha é da Ana."

## Notas da T02 (dono do bloco)
- **Formato:** o dono vai nos bits 16 em diante do valor de cada edição (`bloco | meta << 8 | dono << 16`). O índice 0 é o dono do mundo (no aparelho, o jogador local; na nuvem, quem criou a sala); de 1 em diante, a posição + 1 na tabela `extras.donos` (`[id, apelido]`, até 4095 pessoas, guardada com o mundo). Ar não tem dono. O que o dono faz não grava nada a mais; por isso o "levar para a nuvem" já fica com o dono certo, e o mundo que volta da nuvem guarda os amigos.
- **Quem carimba:** colocar (as duas metades da porta), o lote do criativo e arar (a terra arada é de quem arou). Porta que abre, fornalha que acende e lavoura que cresce ficam com o dono que tinham. O cliente nunca manda dono (o saneamento recusa valor acima de 65535 no lote).
- **Protocolo:** `BlocoMudado.v` leva o dono; `Quadro.donos` traz a tabela inteira no primeiro quadro (se tiver alguém) e quando muda; o "bem-vindo" traz `donos`. `VERSAO_REDE` = 3: o navegador de antes recebe "versão nova, recarregue". Atenção na publicação: o navegador novo também é recusado pelo servidor velho, então publicar o servidor junto (ou antes) do site.
- **Nuvem:** `MundoGuardado.formato` = 2; mundo guardado sem ele é ignorado (o código dá "não existe").
- **Aparelho:** chave `formato` = 2 no IndexedDB; sem ela, os mundos são apagados uma vez (só as chaves dos mundos; personagem e preferências estão no localStorage e ficam) e, junto das boas-vindas, aparece uma vez "Os mundos começaram de novo! Bora construir?".
- **Paridade:** as sessões gravadas (`e2e/paridade`) não mudaram (sozinho, tudo é do dono, índice 0); o teste só passou a marcar o formato ao montar o mundo.
- **Para a T03:** `nucleo.donoDoBloco(x, y, z)` e, no cliente, `estado.donoDoBloco` (a mesma `donoNaCelula`); `null` é natural, ar ou célula sem edição. A proteção da T01 (o que o mundo construiu) vem antes: uma porta da vila aberta por alguém tem edição e responde o dono do mundo.
- **Tamanho medido** (240 mil edições, `tests/nucleo/donos.test.ts`): só o dono, +0%; um quarto dos amigos, +6% no JSON e +4% no gzip; tudo dos amigos, +24% no JSON e +4% no gzip.

## Notas da T03 (regras no núcleo)
- **Uma regra só:** `src/jogo/permissao.ts` (`recusaQuebrar`, `recusaColocar`, `recusaBau`, `podeLevarBicho`), lida sobre um `MundoDaRegra` (proteção da T01, bloco, bloco gerado, dono da T02, apelido, dono do mundo). O núcleo (`src/nucleo/nucleo.ts`) confere com ela em quebrar, colocar (as duas metades da porta), arar (o chão e a planta de cima), o lote do criativo (célula a célula: o que sai segue a regra de quebrar, o que entra a de colocar) e abrir baú; o cliente prevê com a mesma (T04).
- **Quebrar:** estrutura, usável e chão do mundo não quebram para ninguém, em todo modo. A lavoura do mundo é de todos: colher o pé maduro dá a colheita e replanta o estágio 0 da mesma planta na hora (entra na lista que cresce); colher verde só recomeça, sem dar nada (senão o sítio virava fonte de sementes). O bloco de alguém, só ele e o dono do mundo. A horta (terra arada e pé) é de quem arou e plantou: o amigo não colhe.
- **Colocar:** passagem, estrutura e usável recusam; o conserto (o bloco que a geração pôs, na célula vazia da estrutura) passa e volta a ser do mundo. Chão e o vão das casas aceitam (enfeitar). A flor (planta baixa) do amigo não some debaixo do bloco de outro.
- **Baú:** o do mundo (usável) é de todos; o posto, de quem pôs e do dono do mundo. O núcleo não abre (não há contêiner aberto, então nenhuma transação alcança o baú) e a transação também confere o dono, por garantia. A fornalha posta segue a mesma regra (decisão do dono de 11 nov, ver "Acabamento").
- **Bichos:** `Criatura.dono` (quem deu a comida ou domou; o dono do mundo fica sem o campo, como o índice 0 dos blocos), salvo com os criados e as raposas. O gesto "chamar" só traz os bichos de quem chamou (o dono do mundo chama todos); se havia só bicho dos outros por perto, o aviso diz de quem é. Com a comida na mão, o bicho dos outros "vê" quem não pode levá-lo sem comida e fica onde está; a raposa domada acompanha só quem domou (ou o dono do mundo) e, sem nenhum deles, fica parada. O amigo ainda dá comida: corações e o aviso, sem gastar e sem mudar a casa do bicho.
- **Portas e porteiras:** usar continua para todos (visitante também); quebrar segue a regra (a do mundo, ninguém; a do amigo, ele e o dono).
- **Recusa:** `{ e: 'recusa', comando, motivo, protecao: { motivo: 'mundo' | 'amigo' | 'passagem' | 'bau' | 'bicho', dono?: apelido, lugar?: 'vila' | 'sitio' | 'ruina' | 'estrutura' } }`, e a célula (com a de cima e a de baixo, como antes) volta na tela de quem previu, com o dono certo. `MascaraProtecao.lugar` e `ProtecaoMundo.lugar(x, z)` dizem de quem é a construção do chunk (o sítio é o povoado com lotes de uso). Telemetria e conferências anti-trapaça não mudaram.
- **Testes:** `tests/nucleo/protecao-regras.test.ts` (local e nuvem, na vila e no sítio de verdade da semente; inclui a cópia do cliente dando a mesma resposta e a volta limpa de uma quebra recusada), `tests/nucleo/protecao-bichos.test.ts`, `tests/jogo/permissao.test.ts` e a sala com três jogadores em `servidor/testes/salas.test.ts`. Os testes antigos que quebravam o baú do mundo ou colhiam a horta da outra foram ajustados à regra nova.

## Notas da T04 (cliente)
- **Previsão:** a cena (`src/render/cena.ts`) monta o seu `MundoDaRegra` (a proteção da T01 é uma só por cena, a mesma das capturas) e confere antes de prever: quebra, colocação (com a metade de cima da porta e o espelho), arar, lote, abrir baú. Recusado, nada é previsto nem mandado (nada pisca). A lavoura do sítio prevê o replantio.
- **Cadeado:** `src/ui/cadeado.ts`. No computador, ao lado da mira do centro; no toque, em cima do bloco que o dedo pegou (projeção do bloco na tela). O contorno do bloco fica cor de mel. Não aparece no que se usa (porta, porteira, cama, mesa, fornalha da vila: com cadeado pareciam trancadas); aparece no baú que não abre. A conta é feita uma vez por bloco mirado e versão do mundo.
- **Rachadura:** o alvo protegido não chega ao minerador (nem golpe nem rachadura); segurando, o aviso fala.
- **Avisos:** `src/player/avisosProtecao.ts` em cima da fila de avisos da 015: cada motivo com o seu dono (ou lugar) fala no máximo a cada 4 s; o "Você tirou um bloco do Léo." do dono do mundo, a cada 6 s. "da/do/de" pelo fim do nome (Ana, Léo, Davi).
- **Fantasma:** com a prévia de colocar (ou nas ferramentas do criativo), na passagem e na casa do mundo o fantasma fica cor de mel e mais apagado.
- **Medido:** conferir um bloco mirado custa ~0,8 µs do zero (com a máscara do chunk nascendo) e ~0,3 µs com ela pronta (teto 0,1 ms); a mira parada não custa nada (memória por bloco). Tela: `e2e/construcoes-protegidas.spec.ts` (três jogadores na nuvem e o celular).

## Acabamento (fornalha e nome da dona)
- **Fornalha:** `recusaConteiner` (no lugar do `recusaBau`) vale para baú e fornalha (apagada ou acesa): a da vila (usável) é de todos; a posta, de quem pôs e do dono do mundo. O núcleo não abre e a transação confere pelo contêiner aberto (`tipo`), mesmo que o bloco tenha mudado; quebrar a fornalha do amigo avisa "Essa fornalha é da Ana." (motivo `fornalha`). O cliente prevê igual: cadeado na mira, nada abre e o aviso entra na mesma fila de 4 s.
- **Nome da dona com ela fora:** a sala guarda `apelidoDono` (na criação e cada vez que o dono entra; gravado com a sala) e o núcleo recebe `apelidoDono` ao abrir. A sala que acorda sem a dona avisa "Essa parede é da Bia." em vez de "de um amigo". A prévia também usa o nome guardado (uma leitura a menos no Storage).
- **Apelido passado a limpo:** `limparApelido` saiu para `src/jogo/apelido.ts` (sem nada do navegador) e vale no servidor (o que chega no "entrar"), no núcleo (`apelidoDono`) e na tabela de donos (`sanearDonos`): até 22, só letras, números, espaço, `-` e `_`.
- **Testes:** `tests/jogo/permissao.test.ts` (fornalha apagada e acesa, da vila e posta), `tests/nucleo/protecao-regras.test.ts` (fornalha no aparelho e na nuvem: abrir, transação fingindo a fornalha aberta, quebrar, a da vila), `servidor/testes/salas.test.ts` (fornalha da Bia na sala; a sala acorda sem a dona e diz "Ana", e o nome estragado na sala guardada entra limpo) e `e2e/construcoes-protegidas.spec.ts` (a fornalha da Bia fechada para o Léo, aberta para a dona).
