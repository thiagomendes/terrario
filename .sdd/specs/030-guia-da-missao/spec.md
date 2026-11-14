---
id: 030-guia-da-missao
title: 'Guia da missão: a trilha de pegadinhas até o lugar, a placa do alvo e a mãozinha da obra'
status: APPROVED
approved_at: 2026-11-14
base_branch: main
branch: feat/030-guia-da-missao
created_at: 2026-11-14T12:00:00Z
test_command: npx vitest run
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
full_test_command: npx vitest run && scripts/e2e-gpu.sh
---
## Contexto e problema
O dono, testando a 023 ao vivo com os filhos (14 nov 2026): o cartão da missão mostra só um desenho, e nem ele nem as crianças entenderam **o que fazer** nem **para onde ir**. O c3 "Passeio" mostrava um sorvete (a figurinha era a sorveteria) e nada dizia **onde** ficam a padaria, a escola ou o canteiro 4. O quadro de missões abria sozinho na primeira visita e cobria a tela inteira.

A 021 já tem o caminho a pé pelos blocos (`src/jogo/caminho.ts`) e a 014 tem a rede de calçadas dos moradores, que atravessa na faixa (`src/world/ruasCidade.ts`). Nenhum dos dois era usado pelas missões.

## Objetivo
Uma criança de 3 anos, sem ler, escolhe a missão e **chega ao lugar certo e começa a fazer** sem ajuda de adulto, nos dois mundos com missões (Cidade Grande e Rancho Alegre), sem lotar a tela do celular.

## Decisões finais (dono, 14 nov 2026, depois de três rodadas de esboço)
O esboço (`esboco/guia-da-missao`, `?esboco=guia`) testou três jeitos e um vaga-lume guia. **O vaga-lume saiu** (decisão do dono, com a segunda opinião de acordo): fica a trilha, a placa e um canto pequeno.

1. **O quadro nunca abre sozinho** ao entrar no mundo. "Missões" e o baú moram na **roda do menu**. Sem bolinha de lado (alvo fora da tela), sem vaga-lume, sem moedinha por ação (o modelo da 023 não muda).
2. **Trilha de pegadinhas** verde-água com borda clara e escura (lê na calçada, na grama e na terra arada), pé esquerdo e pé direito. Ela **sempre nasce nos pés do boneco** (um trechinho de ligação se a criança saiu da rota) e uma **ondinha** corre dos pés para a frente, pela trilha. Na cidade vai pelas calçadas e atravessa na faixa (`caminhoNaCidade`); fora dela, a busca a pé da 021, alisada.
3. **Placa do alvo** flutuando em cima do lugar, com o mesmo desenho da missão (rodada 1), vista por cima dos prédios.
4. **A câmera vira devagar uma vez** quando a trilha acende (1,5 s, entra e sai macio), **só se a criança não estiver mexendo na câmera**. Nada de virar ao chegar.
5. **O canto:** a estrela do nível e um **selinho** com o desenho da missão escolhida. Tocar no selinho repete a ondinha e a virada macia. **O convite:** sem missão escolhida, depois de ~2 min brincando com o jogo à vista (painel aberto não conta), o selinho vira o **baú com "?"**, que brilha uma vez e fica quieto; tocar abre o quadro. Zera quando uma missão acaba.
6. **Ao chegar:** um brilho no lugar e um som curto nosso, pelo motor de som do jogo (segue o volume e o mudo). A **mãozinha** mostra o gesto só onde já está bem feita: **na obra**, só nos blocos da camada de baixo e só onde o raio do dedo pega aquele bloco (a conta do jogo, `fantasmaNoRaio`). Nos outros lugares: trilha e placa.
7. **O ✓ vem do núcleo** (o evento de progresso da alma), para todo tipo de missão: andou a conta, o carimbo verde pula no lugar.
8. **As moedinhas no fim** voam do lugar para o canto, que abre de lado e conta (a festa da 023 continua, o total é o mesmo).
9. **Com amigos:** trilha, placa e selinho só na tela de quem tem a missão. **Nada novo vai pela rede** (paridade 36 de 36, `VERSAO_REDE` igual).
10. **Rancho:** a busca da 021 alisada (sem zigue-zague), sem pisar na roça plantada e sem raspar na cerca. **Um alvo por vez**, mantido até acabar (nada de pular de um lugar para outro). Sem trigo maduro, a trilha leva ao passo de antes (a terra arada); a r7 (a roça da própria criança, que só o núcleo conhece) vai para a lavoura.
11. **c5 (a padeira):** a placa em cima da cabeça dela; ela **para e espera** quando a criança chega perto; a trilha só refaz depois que ela andou uns metros.
12. **c3** ganha o desenho do **passeio** (o tênis e as casinhas) na figurinha e na festa. **O pedreiro** sai da frente dos blocos azuis: `POSTO_PEDREIRO = [6, -1]`, na calçada, do lado de fora do tapume.
13. Nada de palavra na tela (nem inglês); a tela do celular fica limpa.

## O resolvedor de alvo (`alvoDaMissao`, peça pura)
Devolve **um** alvo (aonde a trilha vai, onde fica a placa e quando "chegou"), ou nada.

| Missão | Alvo | Chegou |
| --- | --- | --- |
| obra (c1, c2, c4, c6–c8) | a entrada do tapume do canteiro, por dentro | dentro do lote do canteiro |
| lugares (c3) | o lugar ainda não visto (núcleo: `usos`) mais perto **pela calçada** | dentro do lote |
| c5 troca com a padeira | a padeira (alvo que anda; a trilha refaz depois que ela andou 4 blocos) | a 3 blocos dela (ela para) |
| r1 colher | a lavoura do sítio mais perto **com trigo maduro**; sem maduro, a com terra arada livre | na beira da lavoura |
| r3 plantar | a lavoura com terra arada livre; sem nenhuma, a lavoura | na beira da lavoura |
| r7 a sua roça | a lavoura mais perto (o dono da planta é só do núcleo) | na beira da lavoura |
| r2 milho às galinhas, r6 ovos | o galinheiro (do lado de fora da porteira) | na porteira |
| r4 trigo às vacas | o curral (do lado de fora da porteira) | na porteira |
| r5 pão | o celeiro (a mesa de trabalho) | na porta do celeiro |

O alvo escolhido fica até deixar de valer (a lavoura sem maduro, a missão mudou); só então procura outro.

## Experiência medida (para não frustrar)
Medido no esboço (Cidade Grande, semente 1337, celular deitado, placa de vídeo), andando pela trilha com o controle de verdade, sem correr: c3 inteira em 72 s (praça → sorveteria 7 s, → padaria 14 s, → escola 31 s); c6 até o canteiro 4 em 25 s. Na simulação nos blocos de verdade, sem guia, 40 crianças "passeando" acharam a padaria 4 vezes em 5 min e a escola 3; com a trilha, todas em menos de 45 s.

Medidas que precisam passar:
- **A trilha nasce em até 300 ms** do toque em "brincar" ou no selinho (a busca anda em fatias de 4 ms, como a 021).
- **A primeira pegada fica a menos de 1,5 bloco dos pés** da criança, sempre.
- **Tempo até o alvo** no ritmo de criança: c3 inteira em até 2 min; c6 em até 45 s; r1 até a lavoura em até 45 s.
- **Mãozinha:** aparece em até 1,5 s depois de chegar na obra, num bloco que o dedo alcança, longe do HUD; o toque onde ela mostrou põe o bloco.
- **Rancho:** nenhuma pegada em cima de planta da roça; a trilha alisada não muda de rumo mais que 45° entre pegadas vizinhas fora das quinas.
- **Nada tapa o HUD:** o selinho e a mãozinha nas três telas (1280×720, 844×390, 390×844), teste de caixas como na 021 e na 023.
- **Tela limpa:** a parte da missão no canto fica em ~1 ponto de cobertura (a estrela e o selinho), contra ~5 do cartão de hoje.
- **Desempenho:** a trilha custa 2 chamadas de desenho (pegada e borda, instâncias finas), a placa 2; até 420 pegadas.
- **Rodada em família** antes de fechar.

## Com amigos
Tudo da missão é do aparelho: a trilha, a placa, o selinho e a mãozinha só na tela de quem escolheu. O núcleo já manda a vista da alma só para cada jogador; o ✓ e as moedinhas vêm do evento `alma` dele. Nenhuma mensagem nova, nenhum campo novo.

## Cuidados legais (ver `.sdd/cuidados-legais.md`)
- **Sem dado novo:** a trilha usa só a posição de jogo no aparelho; nada sai do jogo.
- **Sem pressão:** o quadro não abre sozinho; a trilha só acende no "brincar" e no toque no selinho; o convite aparece depois de ~2 min brincando, brilha uma vez e fica quieto; nada pisca para chamar a criança de volta, nada de contagem.
- **Arte e som originais:** pegadas, placa, carimbo, mãozinha e o som da chegada feitos no projeto.
- **Atravessar a rua:** a trilha cruza na faixa (a rede dos moradores).

## Testes
- **Unidade (Vitest):** `alvoDaMissao` para cada tipo (cidade e sítio); lugar mais perto pela calçada; alvo mantido até acabar; trilha nasce nos pés (ligação); alisamento sem pisar na roça; pegadas; a ondinha; o relógio do convite.
- **Tela (Playwright, GPU):** c3 inteira andando pelo controle de verdade (✓ em cada lugar, moedinhas no canto); c6 até 2 blocos postos onde a mãozinha mostrou; r1 até a lavoura no Rancho; nada abre ao entrar; o convite; o selinho repete a ondinha; a trilha nasce em até 300 ms; caixas nas três telas; com amigos, a trilha só na tela de quem tem a missão; paridade 36 de 36.
- **Capturas e vídeos** para o relatório visual.

## Fora desta parte
- Os outros mundos (026, 027, 028): o resolvedor vale para eles quando tiverem missões.
- A mãozinha fora da obra (colher, dar comida, pegar ovo): fica para quando der para fazer com o mesmo capricho.
- Voz ("vamos à padaria!"): sem texto nem voz nesta parte.

## Histórico do esboço
Rodada 1 (trilha, placa, carimbo, mãozinha), rodada 2 (três jeitos de HUD com a medida de cobertura) e rodada 3 (o vaga-lume e a mistura) estão no ramo `esboco/guia-da-missao`, com os vídeos nos relatórios visuais `030`, `030b` e `030c`. O que veio de lá para a versão de verdade: a trilha, a placa, a virada macia, a mãozinha com a correção da camada de baixo, o posto do pedreiro e o desenho do passeio.
