#!/bin/sh
# Refaz os pacotes de som da Vila Neon (spec 026, T18 e T19) e a entrada dela em public/sons/indice.json.
# Uso (na raiz do repositório):  sh .sdd/specs/026-mundo-anos-80/referencia/fontes/scripts-pacote/rodar.sh <trabalho> [amostras]
#   <trabalho>  pasta vazia para os arquivos intermediários (MIDI, renders, WAV, MP3)
#   [amostras]  onde gravar as amostras para ouvir (padrão: <trabalho>/amostras)
# Nada é baixado de fora: a música e o show são partitura nossa gravada com o FluidR3_GM (MIT) e o resto é síntese nossa.
# Precisa de Docker. A imagem som014:local (a mesma da 014) é debian:bookworm-slim + fluidsynth, fluid-soundfont-gm, ffmpeg,
# python3-numpy, python3-scipy.
set -e
REPO=$(pwd)
S=$REPO/.sdd/specs/026-mundo-anos-80/referencia/fontes/scripts-pacote
W=$1; AM=${2:-$1/amostras}
mkdir -p "$W/final" "$AM"
if ! docker image inspect som014:local >/dev/null 2>&1; then
  printf 'FROM debian:bookworm-slim\nRUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fluidsynth fluid-soundfont-gm ffmpeg python3-numpy python3-scipy && rm -rf /var/lib/apt/lists/*\n' \
    | docker build -t som014:local -
fi
U="$(id -u):$(id -g)"
run() { docker run --rm -u "$U" -v "$S":/s:ro -v "$W":/o -v "$REPO":/r -v "$AM":/a som014:local "$@"; }
# 1. a trilha do bairro: partitura -> MIDI -> FluidSynth -> laços e frases na régua da 019 -> MP3 e pacote
run sh -c 'python3 -I /s/musica_compor.py /o/midi && sh /s/renderizar.sh /o/midi /o/render'
run python3 -I /s/musica_processar.py /o/render /o/midi/plano.json /o/wav /o/medidas_wav.json
run python3 -I /s/musica_finalizar.py /o/midi/plano.json /o/medidas_wav.json /o/wav /o/musica /o/final/vila-neon-musica.mp3 /o/final/musica_tema.json
# 2. o show e os brinquedos: partitura -> MIDI -> FluidSynth + síntese nossa -> régua -> MP3 e pacote
run sh -c 'python3 -I /s/show_compor.py /o/show_midi && sh /s/renderizar.sh /o/show_midi /o/show_render'
run python3 -I /s/show_pacote.py /o/show_render /o/show_midi/show_plano.json /o /o/final/vila-neon-show.mp3 /o/final/show_tema.json
# 3. pacotes + índice + medidas-pacote.json (só biblioteca padrão)
run python3 -I /s/empacotar.py /o /r
# 4. conferência das fatias pelo índice, o volume percebido (NIVEL_TRILHA) e as amostras para ouvir
run python3 -I /s/amostras.py /r /a /o
