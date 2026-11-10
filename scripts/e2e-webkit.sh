#!/bin/sh
# Roda os testes do WebKit com um iPhone emulado (playwright.webkit.config.ts) no contêiner.
# Sem a ponte da placa de vídeo: com as variáveis do Mesa d3d12 o WebKit fecha ao abrir a
# página; por software ele desenha (devagar, mas desenha).
# Uso: scripts/e2e-webkit.sh [argumentos do playwright test]
set -e
AQUI=$(cd "$(dirname "$0")/.." && pwd)
MODULOS=$(cd "$AQUI" && readlink -f node_modules)
exec docker run --rm --shm-size 1g -w /work \
  -v "$AQUI":/work \
  -v "$MODULOS":/mine-browser/node_modules -v "$MODULOS":"$MODULOS" \
  -e FORCE_COLOR=0 \
  nants-workspace:latest sh -lc "npx playwright test -c playwright.webkit.config.ts $*"
