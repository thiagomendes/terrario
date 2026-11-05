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

Controles: WASD anda, espaço pula, shift corre, mouse olha (pointer lock).

## Testar

```sh
docker compose -f .nants/compose.yaml run --rm workspace sh -lc 'npm ci --no-audit --no-fund && npx vitest run && npx playwright test'
```

Resultado esperado: todos os testes do Vitest passam e os 3 testes e2e do Playwright (desktop, tablet e celular) passam, sem erros de página. As capturas ficam em `test-results/screens`.

## Relatório

Veja `docs/validacao-visual.md` para a direção visual, os compromissos de desempenho e as capturas.
