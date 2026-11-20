---
id: 033-camera-roleta
title: 'No celular a câmera começa mais afastada, e a roleta de baixo toma o lugar da roda do menu em todo mundo'
status: DONE
base_branch: main
branch: feat/033-camera-roleta
created_at: 2026-11-18T18:00:00Z
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
O dono, jogando no celular, deixava a câmera sempre mais afastada com a pinça, e achava a roda do menu (spec 015, em volta do boneco, no meio da tela) cheia demais depois que ela cresceu: 12 itens no menu da Vila Neon e 11 gestos. A spec 026 já tinha medido e afastado os botões para nada encostar, mas a roda cobria o boneco e o que ele fazia.

O esboço (`esboco/033-camera-roleta`, 18 nov 2026, só com `?esboco=033`) mediu a câmera em cinco distâncias e trouxe a roleta. O dono aprovou no mesmo dia. Esta spec torna o esboço o jogo de verdade, sem parâmetro nenhum.

## O que existia (18 nov 2026, `VERSAO_REDE` 16)
- **Câmera no toque:** começa a 4,4 blocos (`ZOOM_PADRAO_TOQUE`), igual em pé e deitado. A pinça vai de 2,5 a 7. O computador começa a 3,8.
- **A roda do menu** (`src/ui/roda.ts`, `src/ui/menuRoda.ts`):
  - abre no meio da tela, em volta do boneco, pelo botão de cima (ou pelo O no computador);
  - Gestos troca a roda pelos gestos, com "Voltar" no meio; segurar o botão abre os gestos direto;
  - tocar fora fecha; fecha sozinha em 8 s; no computador as teclas de sempre e 1 a 9 e 0 nos gestos.

## As medidas do esboço
**A criança simulada da 022** (as mesmas quatro cenas, os mesmos alvos e o erro de dedo de 24 px; 2 sementes × 4 giros × 7 alvos por cena), no corredor da obra:

| Distância | Deitado: acertos | Deitado: de primeira | Em pé: acertos | Em pé: de primeira |
| --- | --- | --- | --- | --- |
| 4,4 (antes) | 47/56 | 29 | 50/56 | 35 |
| 4,75 (+8 %) | 47/56 | 28 | 50/56 | 32 |
| 5,06 (+15 %) | 45/56 | 25 | 49/56 | 32 |
| 5,5 (+25 %) | 45/56 | 25 | 49/56 | 32 |
| 5,94 (+35 %) | 39/56 | 24 | 42/56 | 30 |

- **No campo aberto**, deitado o acerto de primeira cai a partir de +15 % (50 % → 44 %); em pé fica igual até +15 % (60 % → 61 %) e cai a partir de +25 %.
- **Na casinha** todas as distâncias acertam 56/56 (a câmera para antes da parede).
- **Quadros por segundo** (CPU 4× mais lenta): dentro do ruído entre 4,4 e a recomendada, nos dois mundos medidos.
- **Recomendado e aprovado:** 4,75 deitado e 5,06 em pé.

**A roleta:** o do meio com 96 px, os vizinhos a 78 % e 58 %, embaixo, por cima da barrinha. As variantes (no meio da tela, acima da barrinha; 80 e 112 px) ficaram nas fotos do esboço.

## Decisões do dono (18 nov 2026)
1. **Câmera, só no celular:**
   - começa a **5,06 em pé** (+15 %) e **4,75 deitado** (+8 %);
   - virar o celular sem ter mexido na pinça troca para a de começo da outra posição; depois da pinça, vale a da criança;
   - a pinça continua, o computador não muda, nenhum botão novo;
   - o recorte de adereços da 022 fica fora por enquanto.
2. **A roleta no lugar da roda, em todo mundo e modo:**
   - embaixo, por cima da barrinha; aberta, a barrinha, o joystick e os botões de correr e pular somem e voltam quando ela fecha;
   - o do meio com 96 px e o nome embaixo; os vizinhos a 78 % e 58 %, sumindo devagar nas pontas;
   - a lista dá a volta sem fim;
   - o arraste perdoa (um quarto de passo já anda um item) e assenta no item; um "toc" baixinho a cada item que passa pelo meio;
   - tocar num vizinho rola até ele; tocar no do meio escolhe;
   - **uma plaquinha só para sair**, sempre no mesmo lugar, em cima da bandeja: "‹ [ícone de onde veio] Voltar" dentro de uma lista, "✕ Fechar" na de cima. Em pé no meio (nunca onde fica o joystick); deitado à esquerda;
   - tocar fora sobe um nível (na de cima, fecha);
   - abre pelo botão de sempre e fecha sozinha em 8 s;
   - **níveis ligados**, como as sub-rodas: cada item pode abrir uma roleta filha, em qualquer profundidade. Agora não há terceiro nível; Gestos continua um nível só.
3. **Nada se perde:** todo item e sub-roda da roda está na roleta, em todo mundo (a lista por mundo está em "Os itens por mundo").
4. **Computador:** a roda também existia lá, então a roleta também está lá. Arrastar com o mouse, a rodinha, as setas, Enter (ou espaço) escolhe, Backspace sobe um nível e Esc fecha. As teclas de sempre continuam: O abre e fecha, G abre os gestos, 1 a 9 e 0 escolhem os gestos, Tab, J, C, P, E, Esc.

## Como ficou
### Câmera (`src/player/camera.ts`, `src/render/cena.ts`)
- `ZOOM_TOQUE_EM_PE = 5.06` e `ZOOM_TOQUE_DEITADO = 4.75`; `zoomInicialToque(largura, altura)` escolhe pela tela.
- A cena começa com a da tela; no `resize`, se a distância ainda é a de começo, troca para a da posição nova.
- `preverToque` (testes): o que um toque faria, sem tocar, para a criança simulada.
- **Revisão das fotos:** no celular deitado a bandeja cobria as pernas do boneco. Com a roleta aberta deitado, a vista baixa 0,9 bloco, suave (`baixarVista`, `VISTA_BAIXA_ROLETA`), e o boneco fica inteiro acima da bandeja; volta ao fechar. Em pé sobra tela e nada muda.

### A roleta (`src/ui/roleta.ts`)
- Implementa a mesma interface `Roda` (`src/ui/roda.ts`, que agora guarda só os tipos e as teclas); o menu (`src/ui/menuRoda.ts`) só troca quem desenha.
- 7 botões reaproveitados (o meio, 2 vizinhos de cada lado e mais um sumindo na ponta), então cabe qualquer número de itens sem encostar.
- A lista de Gestos leva o pai (`ListaRoda.pai`): a plaquinha mostra a carinha de Gestos.
- O toque que escolhe não deixa o clique do navegador cair na tela que abriu (a pausa, o mapa).
- Enquanto o dedo arrasta, o nome some (ele fica parado no meio e o anel anda com o botão) e volta quando a fileira assenta.
- A rodinha do mouse na roleta não aproxima a câmera nem troca o item da barrinha.

## Os itens por mundo
O menu e os gestos vêm das mesmas listas de antes (`itensDoMenu`, `EXTRAS_RODA`, `gestosLiberados`), então a roleta tem exatamente o que a roda tinha. `e2e/roleta-mundos.spec.ts` abre cada tema no celular, lê a lista inteira e rola com o dedo até cada item.

| Mundo | Menu | Gestos |
| --- | --- | --- |
| Todos | Mapa, Diário, Personagem, Baú, Lojinha, Foto, Gestos, Para casa, Tela cheia (onde o navegador deixa), Pausa | Acenar, Cumprimentar, Chamar, Comemorar, Aplaudir, Dançar, Apontar, Sentar; Pulo de estrela (nível 3) e Reverência (nível 8) |
| Onde há missões (Cidade Grande, Rancho Alegre, Era dos Dinos, Doce Reino, Vila Neon) | + Missões, logo depois de Personagem | — |
| Sem missões (o mundo de sempre, Planeta Vivo, Mata Encantada, Exploração Lunar) | só os de todos | — |
| Vila Neon | + Tirar patins (só de patins), Guardar skate (só de skate), Sair do brinquedo (só sentada num brinquedo) | + Roqueiro |

## A criança simulada na entrega (18 nov 2026)
As cinco cenas da 022 (corredor, casinha, obra, campo e copa da árvore), 2 sementes × 4 giros × 7 alvos, 56 tentativas por cena (280 por distância):

| Distância | Deitado: de primeira | Deitado: acerto | Em pé: de primeira | Em pé: acerto |
| --- | --- | --- | --- | --- |
| 4,4 (antes) | 66,1 % | 89,3 % | 205/280 (73,2 %) | 256/280 (91,4 %) |
| 4,75 (deitado, a nova) | 66,4 % | 88,9 % | 208/280 (74,3 %) | 258/280 (92,1 %) |
| 5,06 (em pé, a nova) | 63,6 % | 86,8 % | 205/280 (73,2 %) | 257/280 (91,8 %) |

Nas distâncias escolhidas (4,75 deitado, 5,06 em pé) a criança simulada acerta igual à câmera de antes, como no esboço. (Em pé, a primeira rodada perdeu o desenho da página depois da obra; a obra, o campo e a copa foram medidos de novo numa página só.)

## Quadros por segundo (RTX 3060 pela ponte do WSL)
- **A roleta:** fechada, aberta e arrastando com o dedo, na Vila Neon em pé e deitado: 60 nos três (depois de a fileira passar a escrever só o estilo que mudou e montar o desenho de cada item uma vez; antes, arrastando deitado caía para 50–54).
- **As zonas do celular em pé** (`vila-casa-medida`, a casa, a rampa, o parque e a rua, de dia e de noite): 60.
- **O pior caso do festival:** com a câmera nova ele caía (no mesmo lugar e hora, alternado três vezes: 4,4 dá 49, 51 e 51; 5,06 dá 43, 41 e 47), porque a câmera mais longe põe o público inteiro na tela (+20 mil triângulos, +18 desenhos). Então, **no campo do festival com o show tocando, a distância de começo volta à de antes (4,4)**; fora dele volta a nova, e a pinça da criança sempre vale.
- **Câmera de antes e a nova com a CPU 4× mais lenta** (`medidas-033-camera`, alternadas): dentro do ruído da medida.

## Experiência medida
- Os toques, arrastes, vizinhos, voltas sem fim, Gestos, Voltar, Fechar, tocar fora e o fechar sozinho, com dedo de verdade, em pé e deitado (`e2e/roleta.spec.ts`).
- Nada encosta e nada sai da tela com a roleta mais cheia, de 320×568 a 1280×720 (`e2e/vila-patins.spec.ts`).
- A câmera do começo em pé e deitado, a pinça e o virar o celular (`e2e/roleta.spec.ts`).
- A criança simulada da 022 nas distâncias escolhidas e os quadros no celular (`e2e/medidas-033-camera.spec.ts`, `e2e/vila-casa-medida.spec.ts`).

## Fora desta spec
- O recorte de adereços da 022.
- Um terceiro nível (o esboço mostrou "Festa" dentro de Gestos; o dono deixou para depois).
