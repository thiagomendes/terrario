#!/bin/sh
# Apaga os restos de teste que o contêiner do e2e cria como root (capturas-*, test-results,
# dist) dentro de uma pasta de trabalho do projeto, que o usuário comum não consegue apagar.
# Uso: scripts/limpar-restos-root.sh /home/thiago/NantsProjects/mb-bicho-tema [...]
# Só aceita pastas de trabalho do Terrário (mb-* e mine-browser-*) em /home/thiago/NantsProjects.
set -eu
[ "$#" -ge 1 ] || { echo "uso: $0 <pasta-de-trabalho>..." >&2; exit 2; }
for alvo in "$@"; do
  real=$(readlink -f -- "$alvo") || { echo "não existe: $alvo" >&2; exit 2; }
  case "$real" in
    /home/thiago/NantsProjects/mb-*|/home/thiago/NantsProjects/mine-browser-*) ;;
    *) echo "recusado (fora das pastas de trabalho do projeto): $real" >&2; exit 2 ;;
  esac
  case "$real" in */*/*/*/*/*) echo "recusado (subpasta): $real" >&2; exit 2 ;; esac
  [ -d "$real/.git" ] || [ -f "$real/.git" ] || { echo "recusado (não é checkout git): $real" >&2; exit 2; }
  # capturas-* cobre capturas-temas e as pastas de fotos de cada spec (capturas-cidade, capturas-t08...)
  docker run --rm -v "$real":/w nants-workspace:latest \
    sh -c 'rm -rf /w/capturas-* /w/test-results /w/dist /w/servidor/dist'
  # o que ainda sobrar como root (o usuário comum não apaga): avisa em vez de mexer
  sobra=$(find "$real" -path "$real/.git" -prune -o ! -user "$(id -un)" -print 2>/dev/null | head -5)
  [ -z "$sobra" ] || echo "ainda de root em $real:
$sobra" >&2
  echo "limpo: $real"
done
