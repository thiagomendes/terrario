# Brumaluz

Jogo 3D de exploração em mundo voxel, que roda no navegador. Esta fase entrega uma cena jogável para validar o visual e o desempenho: crepúsculo âmbar e violeta, névoa, flora bioluminescente. Interface em português do Brasil.

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

- Botão esquerdo: quebra o bloco apontado (a camada mais baixa não pode ser quebrada).
- Botão direito: coloca o bloco do slot ativo na face apontada, a menos que ele colida com o jogador.
- Teclas 1 a 6: escolhem o slot da barra de blocos (terra musgosa, pedra rachada, areia-bruma, madeira retorcida, tábuas, cristal-luz).
- Roda do mouse: troca o slot, voltando ao início e ao fim.

O bloco apontado ganha contorno âmbar e há uma mira central. Os blocos são ilimitados. O salvamento ainda não existe: as edições se perdem ao recarregar a página.

## Testar

```sh
docker compose -f .nants/compose.yaml run --rm workspace sh -lc 'npm ci --no-audit --no-fund && npx vitest run && npx playwright test'
```

Dentro do container, o comando completo é `npx vitest run && npx playwright test`.

Resultado esperado: todos os testes do Vitest passam e os testes e2e do Playwright (desktop, tablet e celular) passam, sem erros de página. As capturas ficam em `test-results/screens`.

O teste `e2e/cristal.spec.ts` coloca um cristal-luz diante da câmera e confere, em cada viewport, que no máximo 1% dos pixels são brancos estourados (R, G e B maiores ou iguais a 245). Também falha com `pageerror` ou `console.error`.

## Relatório

Veja `docs/validacao-visual.md` para a direção visual, os compromissos de desempenho e as capturas.
