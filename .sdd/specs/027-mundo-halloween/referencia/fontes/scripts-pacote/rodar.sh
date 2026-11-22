#!/bin/sh
# Refaz os pacotes de som da Noite das Fantasias (spec 027, T21) e a entrada dela em public/sons/indice.json.
# Uso (na raiz do repositório):  sh .sdd/specs/027-mundo-halloween/referencia/fontes/scripts-pacote/rodar.sh <trabalho>
#   <trabalho>  pasta vazia para os arquivos intermediários (MIDI, renders, WAV, MP3, o índice novo)
# Nada é baixado de fora: a música é a partitura aprovada no esboço gravada com o FluidR3_GM (MIT) e o resto é síntese nossa
# (a folha aprovada ../sons_noite.py e as receitas de vozes_noite.py, com a voz de formantes da 019).
# Precisa de Docker. A imagem som014:local (a mesma da 014, da 019 e da 026) é debian:bookworm-slim + fluidsynth,
# fluid-soundfont-gm, ffmpeg, python3-numpy, python3-scipy.
set -e
REPO=$(pwd)
F=$REPO/.sdd/specs/027-mundo-halloween/referencia/fontes
S=$F/scripts-pacote
S26=$REPO/.sdd/specs/026-mundo-anos-80/referencia/fontes/scripts-pacote
S19=$REPO/.sdd/specs/019-som-vivo/referencia/fontes/scripts-vozes
W=$(mkdir -p "$1" && cd "$1" && pwd)
mkdir -p "$W/final"
if ! docker image inspect som014:local >/dev/null 2>&1; then
  printf 'FROM debian:bookworm-slim\nRUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fluidsynth fluid-soundfont-gm ffmpeg python3-numpy python3-scipy && rm -rf /var/lib/apt/lists/*\n' \
    | docker build -t som014:local -
fi
run() { docker run --rm -u "$(id -u):$(id -g)" -v "$F":/f:ro -v "$S":/s:ro -v "$S26":/s026:ro -v "$S19":/s019:ro -v "$W":/o \
  -v "$REPO/public/sons":/ps:ro som014:local "$@"; }
# 1. a trilha: partitura -> MIDI -> FluidSynth (o renderizar da 026) -> laços e frases na régua da 019 (o processar da 026) -> MP3
run sh -c 'python3 -I /s/musica_compor.py /o/midi && sh /s026/renderizar.sh /o/midi /o/render'
run python3 -I /s026/musica_processar.py /o/render /o/midi/plano.json /o/wav /o/medidas_wav.json
run python3 -I /s/musica_finalizar.py /o/midi/plano.json /o/medidas_wav.json /o/wav /o/musica /o/final/noite-das-fantasias-musica.mp3 /o/final/musica_tema.json
# 2. os sons: a folha aprovada no esboço, as receitas novas, os bichos e os moradores -> régua -> MP3 (confere o teto de -12 LUFS M)
run python3 -I /f/sons_noite.py /o/aprovados
run python3 -I /s/vozes_noite.py /o/aprovados /o/vozes/wav /o/vozes/receitas.json
run python3 -I /s/vozes_codificar.py /o/vozes/wav /o/vozes/mp3 /o/vozes/medidas.json
# 3. o pacote das vozes, o índice novo (conferindo que os cinco de antes não mudam) e as medidas
run python3 -I /s/empacotar.py /o /ps/indice.json /o/final/medidas-pacote.json
# 4. os arquivos gerados no lugar deles
cp "$W/final/noite-das-fantasias-musica.mp3" "$W/final/noite-das-fantasias-vozes.mp3" "$REPO/public/sons/pacotes/"
cp "$W/final/indice-novo.json" "$REPO/public/sons/indice.json"
cp "$W/final/medidas-pacote.json" "$F/medidas-pacote.json"
ls -l "$REPO/public/sons/pacotes/" | grep noite-das-fantasias
