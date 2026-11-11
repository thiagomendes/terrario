#!/usr/bin/env bash
# Limpeza semanal do registro de imagens do servidor (ACR Basic não tem retenção automática).
# Guarda as 10 versões mais novas (para voltar rápido se uma publicação der problema) e
# apaga as outras com mais de 30 dias, junto com as imagens sem nome. Roda dentro do
# próprio registro (tarefa agendada), aos domingos às 3h de Brasília; custa centavos.
# Criada em 11 nov 2026. Rodar de novo recria a tarefa com a mesma regra.
#   Ver o que apagaria:  az acr run -r crterrarioxuvrtk4qwp --cmd "$REGRA --dry-run" /dev/null
#   Histórico:           az acr task list-runs -r crterrarioxuvrtk4qwp -n limpar-imagens -o table
set -euo pipefail
REGISTRO=crterrarioxuvrtk4qwp
REGRA="acr purge --filter 'servidor:.*' --ago 30d --keep 10 --untagged"
az acr task create -r "$REGISTRO" -n limpar-imagens \
  --cmd "$REGRA" \
  --schedule "0 6 * * 0" \
  --context /dev/null \
  --timeout 600 \
  -o none
echo "tarefa limpar-imagens pronta em $REGISTRO"
