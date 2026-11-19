#!/bin/sh
# Roda os testes e2e no contêiner, desenhando na placa de vídeo do Windows pela ponte do
# WSL (/dev/dxg + Mesa d3d12). Uso: scripts/e2e-gpu.sh [argumentos do playwright test]
# Precisa da imagem do workspace (terrario-workspace: docker compose -f docker/compose.yaml build) e do node_modules em ../mine-browser.
set -e
AQUI=$(cd "$(dirname "$0")/.." && pwd)
MODULOS=$(cd "$AQUI" && readlink -f node_modules)
exec docker run --rm --shm-size 1g -w /work \
  -v "$AQUI":/work \
  -v "$MODULOS":/mine-browser/node_modules -v "$MODULOS":"$MODULOS" \
  --device /dev/dxg -v /usr/lib/wsl:/usr/lib/wsl:ro \
  -e LD_LIBRARY_PATH=/usr/lib/wsl/lib -e GALLIUM_DRIVER=d3d12 \
  -e MESA_D3D12_DEFAULT_ADAPTER_NAME=NVIDIA -e E2E_GPU=1 -e FORCE_COLOR=0 \
  ${E2E_ENV:-} \
  terrario-workspace:latest sh -lc "npx playwright test $*"
