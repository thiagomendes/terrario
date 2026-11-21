#!/bin/sh
# Vigia silenciosa: só termina (e avisa) quando o worktree fica parado.
# Parado = nenhum contêiner de pé e nenhum arquivo mexido no worktree há LIMITE minutos.
# Uso: scripts/vigia-agente.sh <worktree> [limite_min]
W=${1:-/home/thiago/NantsProjects/mb-034}
LIMITE=${2:-25}
while true; do
  sleep 300
  hora=$(date +%H)
  [ "$hora" -ge 22 ] && exit 0
  [ -n "$(docker ps -q 2>/dev/null)" ] && continue
  recente=$(find "$W" -path "$W/node_modules" -prune -o -type f -mmin -"$LIMITE" -print -quit 2>/dev/null)
  [ -n "$recente" ] && continue
  echo "PARADO: nenhum contêiner e nada mexido em $W há $LIMITE min ($(date +%H:%M))"
  exit 1
done
