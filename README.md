# Brumaluz

Jogo sandbox de exploração, construção e sobrevivência em mundo voxel, que roda no navegador. Visual pixel-art (tiles de 16x16 pintados por código) com iluminação moderna: ciclo de dia e noite, céu com sol, lua, nuvens e estrelas, água com reflexo, luz de tochas, sombras, clima, estações, bruma nos vales e pós-processamento. Arte, música e sons são 100% gerados por código. Interface em português do Brasil.

## Pré-requisitos

- Docker com Compose.
- Não é preciso ter Node instalado no host: tudo roda no container.

## Executar

```sh
docker compose -f .nants/compose.yaml run --rm --service-ports workspace sh -lc 'npm ci --no-audit --no-fund && npm run dev -- --host 0.0.0.0 --port 5174 --strictPort'
```

Abra `http://127.0.0.1:5174/` no navegador e clique em "Clique para jogar".

Comando de desenvolvimento: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`.

## O que há no jogo

- **Mundos salvos** (IndexedDB): vários mundos com nome, semente e modo, miniatura, salvamento automático a cada 30 s, ao pausar e ao sair. Botão "Mundos" na tela de título e no menu de pausa.
- **Modos**: criativo (padrão; voo, blocos infinitos, catálogo) e sobrevivência (vida, fome, ar, dano de queda, afogamento, morte e renascer).
- **Mundo de 128 de altura** com biomas (floresta, campos floridos, deserto, taiga nevada, montanhas, pântano bioluminescente, praia, oceano), cavernas, minérios (carvão, cobre, ferro, ouro, luzita), árvores variadas e ruínas com baú de tesouro.
- **67 blocos**, incluindo vidro, tochas, lanternas, lãs coloridas, tijolos, escadas, lajes, cercas, portas, camas, fornalha, baú e mesa de trabalho.
- **Inventário e crafting**: 36 slots, receitas 2x2 e 3x3, livro de receitas com busca, fornalha, 20 ferramentas em 5 níveis com durabilidade, comidas.
- **Criaturas**: cervo-musgo, coelho-bruma, peixe-lume, espectro da bruma (hostil à noite e em cavernas, foge da luz) e raposa-lume (domável com frutinhas).
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

Configurações (vídeo, áudio, controles e acessibilidade) ficam salvas em `localStorage` (`brumaluz:config`). A aparência do personagem fica em `brumaluz:aparencia`. Os mundos ficam no IndexedDB `brumaluz`.

## Testar

```sh
docker compose -f .nants/compose.yaml run --rm --service-ports workspace sh -lc 'npm ci --no-audit --no-fund && npx vitest run && npx playwright test'
```

Dentro do container, o comando completo é `npx vitest run && npx playwright test`. As capturas dos e2e ficam em `test-results/screens`.

## Relatórios

- `docs/validacao-visual.md`: direção visual e desempenho das specs 001 a 005.
- `.sdd/specs/006-expansao/report.md`: relatório da expansão de funcionalidades.
