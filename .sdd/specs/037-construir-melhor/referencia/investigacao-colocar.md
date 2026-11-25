# Investigação: colocar bloco (25 nov 2026, engenheiro-nucleo-rede)

## Relatório: 037 "Construir melhor", investigação das duas queixas

Não mexi em nada no mb-037. As provas ficaram no meu worktree `/home/thiago/NantsProjects/mb-037-nucleo` (ramo `prova/037-construir`, tirado da `main`). O arquivo é `/home/thiago/NantsProjects/mb-037-nucleo/tests/prova-037/prova.test.ts`, com 11 testes que passam na `main` e mostram cada defeito. Não está no commit. Os números de linha são do mb-037.

### O que existia

**Queixa 1: bloco em cima de corpo**
- O `colocar` do núcleo (`src/nucleo/nucleo.ts:1520-1524`) só confere os jogadores, pela `o.tel` e pelo `colocacaoBloqueada` (`src/player/alvo.ts:74`). Não olha bicho nem morador. A prova põe tábua em cima de um cervo.
- **Por que o amigo fica preso mesmo assim:**
  1. **Posição atrasada.** A `tel` do amigo é a última que ele mandou: a cada 50 ms, mais o atraso da rede (`nucleo.ts:2541`). O bloco só chega a ele depois de mais uma viagem. São uns 150 a 300 ms, ou seja, 0,6 a 2 blocos andando ou correndo. A prova pega o amigo 0,95 bloco antes da célula, andando, e o bloco entra. O pulo cabe na mesma conta.
  2. **A metade de cima da porta** não confere corpo nenhum (`nucleo.ts:1510-1524` só olha `y`). Quem pula ou voa por cima fica preso. A prova mostra isso.
  3. **O lote do criativo** (`editarLote`, `nucleo.ts:1565`) não confere corpo nenhum: colar, espelho, desfazer e refazer, e os ganchos `definirBloco` e `editarLote` dos testes. A prova mostra isso.
  4. **Quem entra no meio e quem volta.**
     - O `conectar` (`nucleo.ts:1011-1019`) põe a criança na posição salva ou na altura do terreno gerado (`alturaTerreno`), sem olhar as edições.
     - Se alguém construiu ali enquanto ela estava fora, ou em cima do nascimento, ela já nasce dentro do bloco. A prova mostra isso.
  5. **A obra feita** abre o próximo canteiro e gera o andaime de novo (`concluirObra`, `nucleo.ts:1675`), em cima de quem estiver no lote. Isso eu só li no código, não provei.
- **Por que ela não sai mais:** a física do boneco (`src/player/fisica.ts`, `moverHorizontal` e `avancoLivre`, "0 é livre por hipótese") não anda nem pula se já começa dentro de um bloco. Não existe nada que solte o boneco. A prova faz 2 s andando e pulando e ele fica parado.
- **Os bichos:**
  - **Bichos do mundo e moradores** (cervo, coelho, raposa, espectro, morador, e as peles de cada tema): não ficam presos, porque o `mover` (`src/jogo/criaturas.ts:422-456`) os sobe até 6 blocos. Mas pulam para cima do bloco, às vezes para o telhado.
  - **O peixe** está fora desse socorro. Com um bloco posto na água em cima dele, ele "se debate" e morre: na prova, a vida vai de 3 a 0 e ele fica "morrendo". Isso fere o "nada que assuste".
  - **Bichos premium** (só no cliente, `src/render/premiumMundo.ts:469`, 780-797): o chão é procurado de 1,5 acima, então ele salta para cima do bloco. Longe mais de 14 blocos, reaparece com um puf. Não fica preso, e o núcleo nem sabe deles.
  - **Bichos da festa** (`render/baile/bichos.ts`): são enfeites fixos.

**Queixa 2: bloco no ar**
- O núcleo não confere apoio nenhum. Aceita qualquer célula ao alcance: a prova põe tábua 3 acima do chão, sem nada encostado. Então um cliente forjado também põe.
- A mira sempre encosta numa face, mas os caminhos para o bloco ficar no ar são estes:
  1. **Apoio que não é sólido.** O `ehAlvo` (`src/world/blocks.ts:736`) aceita como face tocha, porta aberta, porteira aberta, placa, poste de luz e toda a lavoura (trigo, milho, aboboreira). Pôr em cima de um pé da lavoura ou de uma tocha deixa o bloco no ar. Isso é comum no Rancho Alegre.
  2. **Quebrar o bloco de baixo.** O de cima fica no ar, porque não há queda. O outro jogo faz igual.
  3. **Previsão recusada.** O bloco B é posto contra o bloco A, que o cliente previu e o núcleo recusou (corpo, proteção, alcance). O núcleo aceita B, que fica no ar.
  4. **Fantasma da obra e do bolo.**
     - O cliente oferece fantasmas de todas as camadas (`cena.ts:7316-7342`; `fantasmaNaMira`, `cena.ts:7379`, com ímã de 0,5 no dedo), e o núcleo não confere a ordem.
     - A planta da **casinha (obra 5)** tem o miolo do telhado (9 células, y=4) que só encosta pela quina, mesmo com a obra pronta. A prova acha exatamente essas 9.
     - O bolo (`src/world/cantoMissoes.ts:321-341`) se apoia de baixo para cima e cabe na regra.
  5. **Criativo no teclado:** espelho (`cena.ts:3325`), colar e as ferramentas (`usarConstrucao`, `cena.ts:6774`). Tudo passa pelo `editarLote`, sem apoio. Só no computador.
- Não achei toque no ar: o `mirarDaCamera` sem face devolve null. A água e a planta baixa não deixam bloco no ar, porque o bloco vai para a face do sólido, ou para o lugar da flor, com chão embaixo.
- **Tremor de mão:** não existe para a recusa comum. O que existe é o som `recusa` (`src/audio/ligador.ts:47`), o cadeado da proteção e o fantasma que treme na obra (`src/render/fantasmasObra.ts:286`). Se o dono quiser a mão tremendo, é visual novo, para o artista.

### A regra proposta
A regra vai numa função pura nova, por exemplo `src/jogo/construir.ts`, e é a mesma no núcleo e na previsão do cliente, para nada piscar.

1. **Sem corpo na célula.** Vale para as células do `colocar` e as da porta, quando o bloco é sólido.
   - **Quem coloca:** a caixa de hoje.
   - **Amigo:** a caixa alargada pela velocidade que ele mesmo informa, `0,3 + min(0,6; vel × 0,15)`. Parado não ganha folga nenhuma.
     - Testei uma folga fixa de 0,5: quebra 10 testes e impede construir uma parede colada no amigo parado.
     - Com a folga pela velocidade, nenhum teste de hoje quebra.
   - **Bichos e moradores** da `populacao`, peixe incluído, com o `mw` e o `alt` de cada um.
   - **No `editarLote`:** amigos e bichos, sim; o próprio jogador, não, para não quebrar os ganchos dos e2e.
2. **Soltar quem já ficou preso, na física do cliente:** o `passoFisica` começando dentro de sólido procura o lugar livre mais perto.
   - Primeiro na mesma altura, a até 1 bloco; depois subindo, até 6 blocos, como o `mover` dos bichos.
   - Isso pega todos os caminhos acima, inclusive os mundos salvos com gente presa.
   - A conferência de velocidade do núcleo já tolera esse salto: `VEL_MAX × dt + 2`, de 6,9 blocos para cima.
   - Junto, o `conectar` passa a nascer na primeira célula livre da coluna, olhando as edições.
   - Não usaria o `teleporte` do núcleo para isso: ele depende da `tel` atrasada.
3. **Apoio:** pelo menos um dos 6 vizinhos é sólido (`obterBloco(...).solido`), ou é a última camada do mundo (`y === 0`). Vale em todos os modos.
   - **Célula da obra aberta e do bolo, com o bloco certo:** fica liberada. A planta é a regra, e o telhado da casinha não fecha de outro jeito.
     - De quebra, recomendo que a mira prefira o fantasma apoiado.
     - A outra opção é mudar a planta da casinha, que muda a cara: decisão do dono.
   - **Lavoura:** já exige a terra arada. A planta baixa e a água continuam dando lugar, e o apoio é o chão de baixo.
   - **Porta:** o apoio vale para a metade de baixo. Sugiro exigir chão sólido embaixo.
   - **Tocha e flor:** seguem a mesma regra.
   - **O `editarLote` do criativo fica sem a regra de apoio.** É ferramenta de computador, e os ganchos dos e2e montam cenas com ele.
   - **Quebrar o bloco de baixo continua deixando o de cima no ar**, como no outro jogo. Mudar isso é regra do jogo e mexeria nos mundos salvos.
4. **A recusa:** o `recusa` de motivo `colocar` que já existe dá o som, e o fantasma treme na obra. A ordem importa: a recusa da proteção, com o cadeado e o motivo, vem antes da do corpo. Um teste de hoje depende disso: o morador parado na passagem.

### Impacto
- **Protocolo:** não muda e não precisa subir a `VERSAO_REDE`. O motivo novo, se houver, cai em `colocar` no cliente antigo (`cena.ts:7964`).
  - Um site antigo com o servidor novo só vê o bloco piscar, com o som de recusa.
  - O `servidor.yml` sai porque o núcleo muda, e é melhor que saia primeiro.
- **Testes:** fiz um protótipo no meu worktree, já desfeito, e rodei o Vitest inteiro.
  - **Só o apoio:** quebram 17 testes, todos pondo bloco no ar de propósito, a `alturaTerreno + 3`:
    - `tests/nucleo/protecao-regras.test.ts`, 11;
    - `tests/jogo/exclusivos.test.ts`, 2;
    - `servidor/testes/salas.test.ts`, 4.
    - O conserto é descer a célula ou pôr um apoio, sem afrouxar nada.
  - **Corpos com a folga pela velocidade:** quebram só os 2 de "a passagem fica livre" (local e nuvem), por causa da ordem da recusa.
  - **Paridade:** os hashes por tema (`tests/temas/paridade-*.test.ts`) não mudaram. A paridade e2e coloca em cima de bloco (`e2e/paridade.spec.ts:120`), então deve continuar 36/36, mas tem que rodar.
  - **Áreas e2e a conferir:** canteiro, alma, cidade-grande, construcoes-protegidas, bichos-passo, abraco-027 e camera. 30 suítes usam os ganchos de lote, que ficam sem apoio.
- **Mundos salvos:** nada é mexido, os blocos no ar ficam. A regra só vale para o bloco novo. Quem estiver preso num mundo salvo sai pelo "soltar".

### Custo e ordem
**Médio.**
1. **(P)** A função pura com os testes: apoio, corpo e folga.
2. **(M)** O núcleo: o `colocar` (corpo, porta e apoio, com a exceção da obra e do bolo, recusando depois da proteção), os corpos no `editarLote`, o `conectar` em célula livre e os 19 testes ajustados.
3. **(M)** O cliente: a mesma regra antes de prever (`interagir`, `cena.ts:3613`; `encherFantasma`, `cena.ts:7428`), a mira preferindo o fantasma apoiado e o "soltar" no `passoFisica`, com o teste.
4. **(P)** Paridade 36/36, as áreas acima e a revisão por um `engenheiro-nucleo-rede` novo.

### Riscos
- A folga pela velocidade ainda deixa passar o amigo com rede muito lenta. O "soltar" é a rede de proteção.
- O "soltar" pode jogar o boneco para cima do telhado se a casa estiver lotada em volta. Por isso a busca começa na mesma altura.
- O morador e o peixe passam a impedir o bloco. A criança ouve a recusa, e pode estranhar no lago.

### Commits
Nenhum. O worktree `/home/thiago/NantsProjects/mb-037-nucleo` fica com a prova sem commit, para o orquestrador apagar ou reaproveitar.