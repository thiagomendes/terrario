# 039 · Móveis e utensílios: o esboço (26 nov 2026)

- **O código:** ramo `esboco/039-moveis`, em `src/esboco/moveis.ts` (o palco) e em `moveisPecas.ts` (o desenho de cada móvel). Só liga com `?esboco=moveis`.
- **As fotos:** saem do `e2e/esboco-moveis.spec.ts`, na placa, com `ESBOCO_039=empe,deitado,pc`.
- **O estudo:** `.sdd/specs/039-moveis/referencia/estudo-moveis.md`.

**O palco:**
- uma casinha de blocos de verdade (chão de tábua, paredes de tábua clara com janelas), num gramado ao sul da Vila Neon;
- **sem teto e sem a parede da frente**, como uma casa de bonecas, só para os móveis aparecerem nas fotos de fora;
- três cômodos lado a lado: a sala, a cozinha e o quarto;
- a criança é o boneco de verdade do jogo (`criarBoneco`).

**O que tem aqui:**
- **A prancha para escolher pelo celular:** `00-prancha.jpg`. A recomendada de cada item tem a borda dourada.
- **As pastas:**
  - `empe/` (390 × 844): tudo;
  - `deitado/` (844 × 390) e `computador/` (1280 × 720): a casa inteira, os cômodos e os toques;
  - `provas/`: as vistas de acerto, que não vão para o dono.
- **O custo:** `custo.json`, com as malhas e os triângulos de cada móvel, tudo ligado (o pior caso).
- **Vídeo:** nenhum. O `.mp4` não abria no celular do dono, então os toques vão em sequência de fotos.

## Os cômodos (nas três telas)
| Foto | O que é |
|---|---|
| `casa-dia`, `casa-noite` (deitado e computador) | a casa inteira, de fora |
| `sala-dia`, `sala-noite` | a sala: a TV no rack, o sofá, o abajur, o som e o tapete de pista; de noite o abajur aceso |
| `cozinha-dia`, `cozinha-noite` | a cozinha: a geladeira, a pia, o fogão, a mesa posta e as três cadeiras |
| `quarto-dia`, `quarto-noite` | o quarto: a cama nova, o criado-mudo com a lua e o guarda-roupa; de noite a lua acesa |
| `*-dentro-dia`, `*-dentro-noite` | de dentro, nos olhos da criança (a primeira pessoa do jogo, 80° em pé) |

## As versões (em pé)
| Foto | O que é |
|---|---|
| `cama-a`, `cama-a-deitada`, `cama-a-frente` | **Cama do ícone (recomendada)**: dois blocos, a cabeceira de madeira escura em degrau, o cobertor vermelho de retalhos, o travesseiro gordinho; deitada, o edredom fofo por cima e só a cabeça de fora |
| `cama-b`, `cama-b-deitada`, `cama-b-frente` | Cama de estrelas: azul, a cabeceira de três montinhos com estrelinhas, o cobertor azul-noite |
| `sofa-a`, `sofa-a-sentada` | **Sofá gordinho (recomendado)**: coral, almofadas fofas, rolos nos braços, botõezinhos |
| `sofa-b`, `sofa-b-sentada` | Sofá de blocos: menta, baixo, capitonê, pés redondos |
| `tv-a` | **TV de rack (recomendada)**: a tela larga de moldura azul, o rack de duas portas, os alto-falantes redondos |
| `tv-b` | TV de pezinhos: o caixote manteiga num bloco só |

## Os toques em sequência
| Fotos | O toque |
|---|---|
| `toque-tv-1` a `5` | a TV liga: desligada, a luz abre do meio, o desenho aparece; outro toque troca o desenho |
| `toque-geladeira-1` a `4` | a geladeira abre: a porta gira, a luz de dentro acende e aparece a comidinha |
| `toque-som-1` a `4` | o som toca: os alto-falantes pulam e três notinhas sobem |
| `toque-cama-1` a `3` | deitar: a criança perto da cama, deitada de dia, dormindo de noite com a lua acesa |
| `toque-fogao-1`, `2` | o fogão acende as bocas, a tampa da panela pula e sai o vapor de cubinhos |
| `toque-pia`, `toque-guarda-roupa`, `toque-tapete` (em pé) | a água cai na cuba, o guarda-roupa abre e mostra as roupinhas, o carrinho anda na pista |

## O que é de mentirinha no esboço
- Não há bloco de móvel, núcleo nem toque de verdade: o teste liga cada toque pela API.
- A luz do abajur e da lua no chão é um disco morno. No jogo, a luz do bloco faz isso no chão e nas paredes.
- Sem teto, de dentro aparece o céu por cima das paredes.
- Os desenhos da TV são os quatro da Casa anos 80 (Vila Neon), só para o esboço. A TV geral ganharia os dela.
