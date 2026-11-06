# Brumaluz

Jogo 3D de exploração em mundo voxel, que roda no navegador. Visual pixel-art (tiles de 16x16 pintados por código) com iluminação moderna: ciclo de dia e noite, céu com sol, lua, nuvens e estrelas, lagos com reflexo, sombras, bruma nos vales, vagalumes à noite e pós-processamento (tonemapping ACES, bloom, vinheta). Interface em português do Brasil.

## Pré-requisitos

- Docker com Compose.
- Não é preciso ter Node instalado no host: tudo roda no container.

## Executar

```sh
docker compose -f .nants/compose.yaml run --rm --service-ports workspace sh -lc 'npm ci --no-audit --no-fund && npm run dev -- --host 0.0.0.0 --port 5174 --strictPort'
```

Abra `http://127.0.0.1:5174/` no navegador e clique em "Clique para jogar".

Comando de desenvolvimento: `npm run dev -- --host 0.0.0.0 --port 5174 --strictPort`.

Controles: WASD anda, espaço pula, shift corre, mouse olha (pointer lock).

Edição de blocos (alcance de 5 blocos, com pointer lock):

- Botão esquerdo: segure para minerar o bloco apontado. A quebra ocorre ao completar o tempo do material (de instantâneo nas plantas a 1,6 s na pedra), com rachaduras e fragmentos. Soltar, trocar de slot ou mirar outro bloco interrompe, e o dano decai em cerca de 1 s. A camada mais baixa não pode ser quebrada.
- Botão direito: coloca o bloco do slot ativo na face apontada, a menos que ele colida com o jogador.
- Tecla M: liga e desliga o som.
- Teclas 1 a 6: escolhem o slot da barra de blocos (terra musgosa, pedra rachada, areia-bruma, madeira retorcida, tábuas, cristal-luz).
- Roda do mouse: troca o slot, voltando ao início e ao fim.
- Tecla V: alterna entre a câmera de primeira pessoa (braço e bloco na mão) e a de terceira pessoa (personagem visto de trás). O alvo, a mineração e a colocação saem sempre dos olhos, então o bloco apontado é o mesmo nos dois modos. O HUD mostra "Câmera: 1ª pessoa (V)" ou "Câmera: 3ª pessoa (V)".
- Tecla C: reabre o painel de personagem. Com o painel aberto, a tecla V é ignorada.

Personagem: há 4 modelos voxel originais, com opções de aparência por paletas fixas e um nome que serve só de rótulo. O painel de personagem aparece na tela de entrada e permite escolher modelo e opções antes de jogar.

Salvamento da aparência: só a aparência é salva, em `localStorage` (chave `brumaluz:aparencia`), a cada mudança confirmada no painel, e carregada ao abrir a página. Se o armazenamento estiver indisponível ou o dado for inválido, vale a aparência padrão. O mundo continua sem salvamento.

Áudio: sintetizado por código, sem arquivos. Cada material tem seu timbre (terra fofa, pedra estalada, areia chiada, madeira oca, folhas farfalhando, cristal de vidro) e há uma paisagem sonora com vento, pássaros de dia, grilos à noite e uma trilha generativa suave com reverb. Ele só ativa após o primeiro clique (a tela de entrada), por regra dos navegadores. O indicador no HUD mostra "Som: ativa ao clicar", "Som: ligado", "Som: mudo" ou "Som: indisponível".

Ciclo de dia: um dia completo dura 20 minutos e começa de manhã. O braço em primeira pessoa fica em repouso no canto e só avança nos golpes e colocações, com balanço ao andar.

O bloco apontado ganha contorno âmbar e há uma mira central. Os blocos são ilimitados. O mundo não é salvo: as edições se perdem ao recarregar a página.

## Testar

```sh
docker compose -f .nants/compose.yaml run --rm --service-ports workspace sh -lc 'npm ci --no-audit --no-fund && npx vitest run && npx playwright test'
```

Dentro do container, o comando completo é `npx vitest run && npx playwright test`.

Resultado esperado: todos os testes do Vitest passam e os testes e2e do Playwright (desktop, tablet e celular) passam, sem erros de página. As capturas ficam em `test-results/screens`.

O teste `e2e/cristal.spec.ts` coloca um cristal-luz diante da câmera e confere, em cada viewport, que no máximo 1% dos pixels são brancos estourados (R, G e B maiores ou iguais a 245). Também falha com `pageerror` ou `console.error`.

## Relatório

Veja `docs/validacao-visual.md` para a direção visual, os compromissos de desempenho e as capturas.
