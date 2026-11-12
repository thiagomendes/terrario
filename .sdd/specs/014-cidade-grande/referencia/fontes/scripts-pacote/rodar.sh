#!/bin/sh
# Refaz os pacotes de som da Cidade Grande (spec 014, T09) e a entrada dela em public/sons/indice.json.
# Uso (na raiz do repositório):  sh .sdd/specs/014-cidade-grande/referencia/fontes/scripts-pacote/rodar.sh <trabalho> <baixados> [amostras]
#   <trabalho>  pasta vazia para os arquivos intermediários (MIDI, renders, WAV, MP3)
#   <baixados>  as gravações baixadas, em <baixados>/commons/*.ogg (+ meta.json do commons_baixar.py da 019) e <baixados>/bsb/*.mp3
#               (lista em vozes_cidade.py; baixar com 019/referencia/fontes/scripts-vozes/commons_baixar.py e do BigSoundBank)
#   [amostras]  onde gravar as amostras para ouvir (padrão: <trabalho>/amostras)
# Precisa de Docker. A imagem som014:local é debian:bookworm-slim + fluidsynth, fluid-soundfont-gm, ffmpeg, python3-numpy, python3-scipy.
# Os arquivos baixados são dados de fora: o Python roda com -I e recebe os caminhos por argumento.
set -e
REPO=$(pwd)
S=$REPO/.sdd/specs/014-cidade-grande/referencia/fontes/scripts-pacote
S019=$REPO/.sdd/specs/019-som-vivo/referencia/fontes/scripts-vozes
W=$1; BX=$2; AM=${3:-$1/amostras}
mkdir -p "$W" "$AM"
if ! docker image inspect som014:local >/dev/null 2>&1; then
  printf 'FROM debian:bookworm-slim\nRUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fluidsynth fluid-soundfont-gm ffmpeg python3-numpy python3-scipy && rm -rf /var/lib/apt/lists/*\n' \
    | docker build -t som014:local -
fi
U="$(id -u):$(id -g)"
run() { docker run --rm -u "$U" -e BAIXADOS=/b -v "$S":/s:ro -v "$S019":/s019:ro -v "$BX":/b:ro -v "$W":/o -v "$REPO":/r -v "$AM":/a som014:local "$@"; }
# 1. música: partitura -> MIDI -> FluidSynth -> laços e frases na régua -> MP3 e pacote
run sh -c 'python3 -I /s/musica_compor.py /o/midi && sh /s/renderizar.sh /o/midi /o/render'
run python3 -I /s/musica_processar.py /o/render /o/midi/plano.json /o/wav /o/medidas_wav.json
mkdir -p "$W/final"
run python3 -I /s/musica_finalizar.py /o/midi/plano.json /o/medidas_wav.json /o/wav /o/musica /o/final/cidade-grande-musica.mp3 /o/final/musica_tema.json
# 2. obra (instrumentos), vozes, ambiente -> WAV na régua -> MP3 conferido
run sh -c 'python3 -I /s/obra_compor.py /o/obra_midi && sh /s/renderizar.sh /o/obra_midi /o/obra_render'
rm -rf "$W/vozes"
run python3 -I /s/vozes_cidade.py /o/obra_render /o/vozes/wav /o/vozes/receitas.json
run python3 -I /s/vozes_codificar.py /o/vozes/wav /o/vozes/mp3 /o/vozes/medidas.json
# 3. pacotes + índice + medidas-pacote.json + créditos (só biblioteca padrão)
run python3 -I /s/empacotar.py /o /b/commons/meta.json /r
# 4. conferência das fatias pelo índice e amostras para ouvir
run python3 -I /s/amostras.py /r /a /o/conferencia.json
