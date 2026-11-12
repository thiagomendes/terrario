#!/bin/sh
# Grava cada MIDI de <pasta_midi> com FluidSynth + FluidR3_GM (MIT), a mesma linha do 019/renderizar.sh com o
# reverb do esboço da cidade (0,5). Roda dentro do contêiner som014:local (ver rodar.sh).
# Uso: sh renderizar.sh <pasta_midi> <pasta_render>
set -e
mkdir -p "$2"
for m in "$1"/*.mid; do
  n=$(basename "$m" .mid)
  fluidsynth -ni -q -F "$2/$n.wav" -T wav -O float -r 44100 -g 0.5 -R 1 -C 0 \
    -o synth.reverb.room-size=0.55 -o synth.reverb.damp=0.45 -o synth.reverb.width=0.9 -o synth.reverb.level=0.5 \
    /usr/share/sounds/sf2/FluidR3_GM.sf2 "$m" 2>/dev/null
done
ls "$2" | wc -l
