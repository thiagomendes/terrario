#!/bin/sh
# Refaz o pacote dos sons dos veículos da Cidade Grande (spec 014) e a entrada temas["cidade-grande"].veiculos de public/sons/indice.json.
# Uso (na raiz do repositório):  sh .sdd/specs/014-cidade-grande/referencia/fontes/scripts-veiculos/rodar.sh <trabalho> <baixados> [amostras]
#   <trabalho>  pasta para os arquivos intermediários (MIDI, renders, WAV, MP3)
#   <baixados>  as gravações do BigSoundBank em <baixados>/bsb/{0187,0896,1145,1490}.mp3 (CC0; páginas nos créditos do índice)
#   [amostras]  onde gravar as amostras para ouvir (padrão: <trabalho>/amostras)
# Precisa de Docker. A imagem som014:local é debian:bookworm-slim + fluidsynth, fluid-soundfont-gm, ffmpeg, python3-numpy, python3-scipy
# (a mesma da T09, scripts-pacote/rodar.sh). As funções de tratamento e síntese são as da 019 (scripts-vozes/lib.py, a mesma do esboço).
# Os arquivos baixados são dados de fora: o Python roda com -I e recebe os caminhos por argumento.
set -e
REPO=$(pwd)
S=$REPO/.sdd/specs/014-cidade-grande/referencia/fontes/scripts-veiculos
S019=$REPO/.sdd/specs/019-som-vivo/referencia/fontes/scripts-vozes
W=$1; BX=$2; AM=${3:-$1/amostras}
mkdir -p "$W" "$AM"
if ! docker image inspect som014:local >/dev/null 2>&1; then
  printf 'FROM debian:bookworm-slim\nRUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends fluidsynth fluid-soundfont-gm ffmpeg python3-numpy python3-scipy && rm -rf /var/lib/apt/lists/*\n' \
    | docker build -t som014:local -
fi
U="$(id -u):$(id -g)"
run() { docker run --rm -u "$U" -e BAIXADOS=/b -v "$S":/s:ro -v "$S019":/s019:ro -v "$BX":/b:ro -v "$W":/o -v "$REPO":/r -v "$AM":/a som014:local "$@"; }
# 1. laços crus, freio, uí-uí, buzina, toc e a musiquinha (o MIDI tem de sair igual ao do esboço) -> WAV
rm -rf "$W/wav" "$W/mp3"
run python3 -I /s/veiculos_sons.py /o/wav /o/receitas.json /o/midi
cmp "$W/midi/sorvete.mid" "$REPO/.sdd/specs/014-cidade-grande/referencia/fontes/sorvete.mid"
# 2. WAV -> MP3 na régua (-23 dB enquanto soa, pico <= -1 dBFS), sem Xing nem metadados
run python3 -I /s/veiculos_codificar.py /o/wav /o/mp3 /o/receitas.json /o/medidas.json
# 3. pacote + índice + créditos + medidas-veiculos-pacote.json (só biblioteca padrão)
run python3 -I /s/veiculos_empacotar.py /o /r
# 4. conferência das fatias pelo índice, amostras para ouvir e a costura dos laços
run python3 -I /s/veiculos_conferir.py /r /o/wav /a /o/conferencia.json
