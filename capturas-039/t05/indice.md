# 039 · T05, o desenho dos móveis (27 nov 2026)

As fotos saem do jogo de verdade, pelo `e2e/capturas-039-t05.spec.ts`, na placa:
- as três telas: `FOTOS_039_T05=empe,deitado,pc`;
- a prancha: `FOTOS_039_T05=prancha`, depois das telas.

O palco:
- uma casa de blocos ao sul da Vila Neon, com três cômodos:
  - a sala: o sofá em cima do tapete, o abajur e uma cadeira;
  - o meio: a pia, uma cadeira e um criado-mudo;
  - o quarto: a cama nova, o criado-mudo, o guarda-roupa e a cama curtinha;
- uma vitrine no gramado atrás da casa, com cada móvel nas quatro direções;
- tudo posto pelo lote (só a âncora; o núcleo monta o resto) e os tapetes pelo `colocar`.

**De fora**, a casa fica sem o teto e sem a parede da frente, como uma casa de bonecas, e a câmera das fotos fica por cima da do jogo. **De dentro**, a casa tem teto, e as fotos são na primeira pessoa do jogo.

- **A prancha:** `00-prancha.jpg` (1080 × uns 5000 px).
- **As pastas:** `empe/` (390 × 844), `deitado/` (844 × 390) e `computador/` (1280 × 720). A vitrine está só no deitado e no computador, porque em pé as quatro direções não cabem lado a lado.
- **O custo:** `*/custo.json`, com os pedaços, as malhas, os triângulos, os móveis e os tapetes à vista.
- **As provas:** `provas/`, as vistas de acerto, que não vão para o dono.

| Foto | O que é |
|---|---|
| `casa-dia`, `casa-noite` | a casa inteira; de noite, o abajur e a lua do criado-mudo acesos (a luz do bloco esquenta o cômodo) |
| `sala-dia`, `meio-dia`, `quarto-dia`, `sala-noite`, `quarto-noite` | os cômodos de fora |
| `sentada-sofa-dia`, `sentada-cadeira-dia` | a criança sentada (o boneco do jogo, pela pose da T05) |
| `deitada-cama-dia`, `deitada-cama-noite` | deitada na cama nova: a cabeça no travesseiro e o edredom do queixo ao pé |
| `deitada-curtinha-dia` | na curtinha, encolhidinha (pequena, os joelhos dobrados), de costas, com o edredom. De lado, a cara sumia no edredom |
| `deitada-sofa-dia`, `deitada-sofa-noite` | no sofá, de noite e sem cama, de costas e encolhidinha, a cabeça na almofadinha e a mantinha por cima |
| `guarda-aberto-dia`, `pia-agua-dia` | o que mexe: as portas do guarda-roupa abertas e a água da pia (a T06 liga isso ao toque) |
| `barra-e-mao` | os oito ícones na barra e o sofá na mão, de dentro |
| `*-dentro-dia`, `*-dentro-noite` | de dentro, na primeira pessoa, com o teto |
| `vitrine-*` (deitado e computador) | cada móvel nas quatro direções |

**O desempenho** (`e2e/desempenho-039.spec.ts`, `DESEMPENHO_039=casa`, celular em pé, CPU 4×, na placa, no ramo, 3 rodadas):

| Casa | Quadros | Chamadas (girando / paradas) | Maior quadro |
|---|---|---|---|
| Vazia | 67,0 | 108 / 116 | 55 ms |
| Com os oito móveis | 65,3 | 110 / 118 | 55 ms |

Os móveis somam **+2 chamadas paradas** (meta: no máximo +3) e os quadros caem **2,5%** (meta: no máximo 5%).
