# Terrário

Jogo sandbox de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Cada mundo é criado com um **tema** que muda toda a aparência, os nomes e os sons, sem mudar as regras. Visual pixel-art (tiles de 16x16 pintados por código) com iluminação moderna: ciclo de dia e noite, céu com sol, lua, nuvens e estrelas, água com reflexo, luz de tochas, sombras, clima, estações, bruma nos vales e pós-processamento. Arte, música e sons são 100% gerados por código. Interface em português do Brasil.

## Pré-requisitos

- Docker com Compose.
- Não é preciso ter Node instalado no host: tudo roda no container.

## Executar

```sh
docker compose -f docker/compose.yaml run --rm --service-ports workspace sh -lc 'npm ci --no-audit --no-fund && npm run dev -- --host 0.0.0.0 --port 5174 --strictPort'
```

Abra `http://127.0.0.1:5174/` no navegador e clique em "Jogar". O menu de título também tem Mundos, Personagem (aparência com prévia) e Configurações.

Comando de desenvolvimento: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`.

## Temas

Ao criar um mundo, escolha o tema no cartão com a prévia. O tema muda blocos, plantas, árvores, água, céu, astros, clima visual, criaturas (pele, jeito de andar e vozes), música, sons de material e todos os textos; blocos, receitas, criaturas e biomas são os mesmos em todos (mesmos ids e regras).

Os cartões aparecem nesta ordem (a Vila Neon é o padrão, e o "Meu primeiro mundo" nasce nela):

- **Vila Neon**: o bairro dos anos 80, com rinque de patins, fliperama e o show do Festival Trovão.
- **Cidade Grande**: a cidade com o canteiro de obras, os veículos e os lugares por dentro.
- **Rancho Alegre**: um sítio do interior, com lavoura, celeiro, vaca, galinha, cachorro, viola caipira e os sons do campo.
- **Doce Reino**: um mundo de bolo, glacê, biscoito e pirulitos, com chuva de granulado.
- **Exploração Lunar**: regolito, crateras, céu negro com estrelas e a Terra no horizonte.

Todo mundo novo nasce com o tema gravado. Bruma e Luz, Planeta Vivo, Mata Encantada e Era dos Dinos saíram do jogo na spec 034, com os mundos salvos neles. Por baixo dos temas fica a base (`src/temas/base/`): um tema completo que não se escolhe, a reserva de quem não registra os temas (scripts, testes, servidor). Para ver o mundo aberto em outro tema sem salvar a troca, use `?tema=<id>` na URL. Os temas ficam em `src/temas/<id>/`; o formato está em `src/temas/tipos.ts`. Ferramentas para autores de tema, sem abrir o jogo:

```sh
npx vite-node scripts/vitrine-tema.ts <id> <pasta>       # tiles, blocos, criaturas, céu, mapa e chunks em PNG
npx vite-node scripts/vitrine-personagem.ts <pasta>      # personagem com cada acessório e o visual de cada tema
npx vite-node scripts/escuta-temas.ts <pasta>            # vozes, música e sons de material em WAV
```

## O que há no jogo

- **Mundos salvos** (IndexedDB): vários mundos com nome, semente e modo, miniatura, salvamento automático a cada 30 s, ao pausar e ao sair. Botão "Mundos" na tela de título e no menu de pausa.
- **Modos**: criativo (padrão; voo, blocos infinitos, catálogo) e sobrevivência (vida, fome, ar, dano de queda, afogamento, morte e renascer).
- **Mundo de 128 de altura** com biomas (floresta, campos floridos, deserto, taiga nevada, montanhas, pântano bioluminescente, praia, oceano), cavernas, minérios (carvão, cobre, ferro, ouro, luzita), árvores variadas e ruínas com baú de tesouro.
- **67 blocos**, incluindo vidro, tochas, lanternas, lãs coloridas, tijolos, escadas, lajes, cercas, portas, camas, fornalha, baú e mesa de trabalho.
- **Inventário e crafting**: 36 slots, receitas 2x2 e 3x3, livro de receitas com busca, fornalha, 20 ferramentas em 5 níveis com durabilidade, comidas.
- **Criaturas**: cinco papéis (um bicho grande, um pequeno, o peixe, a criatura da noite, hostil à noite e em cavernas, que foge da luz, e o companheiro domável), cada um com a cara e o nome do tema.
- **Clima e estações**: chuva, tempestade com relâmpagos, neblina, neve, arco-íris; outono com folhas ocre e inverno com neve sobre os blocos.
- **Construção assistida** (criativo), **modo foto**, **minimapa, mapa e marcadores**, **diário de missões e conquistas**, **música adaptativa**, **toque, gamepad e legendas**.

## Controles

| Ação                                                      | Teclado e mouse                                  |
| --------------------------------------------------------- | ------------------------------------------------ |
| Andar, pular, correr                                      | W A S D, Espaço, Shift                           |
| Olhar                                                     | Mouse (clique na tela para travar)               |
| Quebrar / atacar                                          | Botão esquerdo (segurar)                         |
| Colocar / usar (mesa, fornalha, baú, porta, cama) / comer | Botão direito (Shift + direito coloca sem usar)  |
| Barra de itens                                            | 1 a 9 ou roda do mouse                           |
| Inventário e criação                                      | E                                                |
| Voar (criativo)                                           | Dois toques no Espaço; Shift desce, Ctrl acelera |
| Câmera 1ª/3ª pessoa                                       | V                                                |
| Personagem                                                | C                                                |
| Mapa do mundo / marcador                                  | Tab / K                                          |
| Diário                                                    | J                                                |
| Modo foto (Enter captura)                                 | P                                                |
| Construção (criativo): ferramentas / girar / espelho      | B / R / N                                        |
| Desfazer / refazer (criativo)                             | Ctrl+Z / Ctrl+Y                                  |
| Som ligado/mudo                                           | M (volumes em Configurações)                     |
| Pausa e configurações                                     | Esc                                              |

No celular aparecem joystick, arrastar para olhar e botões de ação. No gamepad: analógicos andam e olham, RT quebra, LT usa, LB/RB trocam o slot, X inventário, Y câmera, Select mapa, Start pausa.

Configurações (vídeo, áudio, controles e acessibilidade) ficam salvas em `localStorage` (`terrario:config`). A aparência do personagem fica em `terrario:aparencia`. As chaves antigas (`brumaluz:*`) são lidas automaticamente na primeira vez. Os mundos ficam no IndexedDB `brumaluz` (nome mantido para não perder mundos salvos).

## Testar

```sh
docker compose -f docker/compose.yaml run --rm --service-ports workspace sh -lc 'npm ci --no-audit --no-fund && npx vitest run && npx playwright test'
```

Roteiros pesados, fora da bateria normal: `CAPTURAS_TEMAS=1 npx playwright test e2e/capturas-temas.spec.ts` (matriz de capturas por tema e prévias dos cartões em `public/temas/`) e `EXPLORACAO=1 npx playwright test e2e/exploracao.spec.ts` (robô que joga uns minutos em cada tema). Os dois aceitam uma lista de ids no lugar de `1`.

Dentro do container, o comando completo é `npx vitest run && npx playwright test`. As capturas dos e2e ficam em `test-results/screens`.

A conferência de uma spec (no computador do dono, na placa de vídeo) é por área: `node scripts/conferir.ts` roda o Vitest, o build, a fumaça, as áreas que o ramo tocou (o mapa é o `e2e/areas.json`), a paridade quando mexeu no núcleo e a quarentena à parte, e mostra o tempo de cada parte. `--seco` só mostra o plano; `--areas a,b` junta áreas; `--tudo` roda tudo, nas três telas (`E2E_TELAS=todas`), como antes.

## Relatórios

- `docs/validacao-visual.md`: direção visual e desempenho das specs 001 a 005.
- `.sdd/specs/006-expansao/report.md`: relatório da expansão de funcionalidades.
