#!/bin/sh
# roda dentro do contêiner esb019m-work: /s = scripts (só leitura), /o = trabalho
set -e
mkdir -p /o/render
for m in /o/midi/*.mid; do
  n=$(basename $m .mid)
  fluidsynth -ni -q -F /o/render/$n.wav -T wav -O float -r 44100 -g 0.5 -R 1 -C 0 \
    -o synth.reverb.room-size=0.55 -o synth.reverb.damp=0.45 -o synth.reverb.width=0.9 -o synth.reverb.level=0.55 \
    /usr/share/sounds/sf2/FluidR3_GM.sf2 $m 2>/dev/null
done
ls /o/render | wc -l
