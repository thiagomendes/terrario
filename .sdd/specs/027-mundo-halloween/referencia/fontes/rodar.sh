#!/bin/sh
# Refaz do zero a amostra de música e a folha de sons do esboço da Noite das Fantasias (spec 027).
# Uso (na raiz do repositório):  sh .sdd/specs/027-mundo-halloween/referencia/fontes/rodar.sh <trabalho> [saida]
#   <trabalho>  pasta para os intermediários (MIDI, render, WAV, espectrogramas)
#   [saida]     onde gravar os MP3 (padrão: capturas-027/esboco/sons)
# Nada é baixado de fora: a música é partitura nossa (compor_noite.py) gravada com o FluidR3_GM (MIT) e os sons são síntese
# nossa em numpy (sons_noite.py). Precisa de Docker. A imagem som014:local (a mesma da 014, da 019 e da 026) é
# debian:bookworm-slim + fluidsynth, fluid-soundfont-gm, ffmpeg, python3-numpy, python3-scipy.
set -e
REPO=$(pwd)
F=$REPO/.sdd/specs/027-mundo-halloween/referencia/fontes
W=$(mkdir -p "$1" && cd "$1" && pwd)
SAI=$(mkdir -p "${2:-$REPO/capturas-027/esboco/sons}" && cd "${2:-$REPO/capturas-027/esboco/sons}" && pwd)
if ! docker image inspect som014:local >/dev/null 2>&1; then
  printf 'FROM debian:bookworm-slim\nRUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fluidsynth fluid-soundfont-gm ffmpeg python3-numpy python3-scipy && rm -rf /var/lib/apt/lists/*\n' \
    | docker build -t som014:local -
fi
run() { docker run --rm -u "$(id -u):$(id -g)" -v "$F":/s -v "$W":/o -v "$SAI":/m som014:local "$@"; }
# 1. a partitura -> MIDI -> FluidSynth (a mesma linha da 019/026: reverb 0,5, sem chorus)
run sh -c 'python3 -I /s/compor_noite.py /o/midi && mkdir -p /o/render && \
  fluidsynth -ni -q -F /o/render/noite-das-fantasias-demo.wav -T wav -O float -r 44100 -g 0.5 -R 1 -C 0 \
    -o synth.reverb.room-size=0.5 -o synth.reverb.damp=0.45 -o synth.reverb.width=0.9 -o synth.reverb.level=0.5 \
    /usr/share/sounds/sf2/FluidR3_GM.sf2 /o/midi/noite-das-fantasias-demo.mid 2>/dev/null'
# 2. os sons (síntese nossa)
run python3 -I /s/sons_noite.py /o/sons_wav
# 3. nivela (música -16 LUFS; sons -17 LUFS momentâneo), fecha, codifica em MP3 e mede de novo -> medidas-sons.json
run python3 -I /s/finalizar_noite.py /o/render/noite-das-fantasias-demo.wav /o/midi/noite-das-fantasias-demo.json /o/sons_wav /m /o/final /s/medidas-sons.json
# 4. espectrogramas para olhar (no <trabalho>/espectros)
run sh -c 'mkdir -p /o/espectros && for a in /m/*.mp3; do n=$(basename "$a" .mp3); \
  ffmpeg -v error -y -i "$a" -lavfi "showspectrumpic=s=1200x400:legend=1:scale=log:fscale=lin" "/o/espectros/$n.png"; done'
ls -l "$SAI"
