# 036 T02: o pinguinzinho com a criança pulando, voando e descendo de um lugar alto

O mesmo gramado da Vila Neon das fotos do unicórnio, com uma torrinha de 3×3 e 6 blocos ao
lado. `antes/` é o jogo no commit de antes do conserto (0c1c86d, rodado num worktree à parte);
`depois/` é o de agora. Celular em pé; o vídeo no computador. Feito com
`e2e/capturas-036.spec.ts` (`CAPTURAS_036=pinguim`).

| Arquivo | O que mostra |
|---|---|
| `pulando.jpg` | a criança pulando três vezes, parada |
| `voando.jpg` | a criança voando de lado, uns 10 blocos acima do chão (o pinguim espera embaixo) |
| `parada-no-ar.jpg` | a criança parada no ar |
| `no-alto.jpg`, `desceu.jpg` | em cima da torrinha e depois de descer andando pela beira |
| `tremor.json` | a medida de cada trecho, quadro a quadro |
| `depois/pinguim-voando.webm` | o vídeo: pula, sobe voando, vai de lado, para no ar, desce, sobe na torrinha e desce |

## A medida (saltos de mais de 1 bloco num quadro; degraus de mais de ¼ de bloco para cima num quadro)

| Trecho | antes | depois |
|---|---|---|
| pulando | 0 saltos, 0 degraus | 0 saltos, 0 degraus |
| voando | 9 saltos (o maior de 13 blocos), 131 degraus | 0 saltos, 0 degraus (o maior passo, 0,16 bloco) |
| parada no ar | 8 saltos, 119 degraus | 0, 0 (parado embaixo) |
| pousando | 3 saltos, 32 degraus | 1 salto, 0 degraus |
| descendo da torrinha | 0, 0 | 0, 0 |

O salto que sobrou ao pousar é de propósito: a criança pousou a uns 18 blocos dele, e ele
aparece perto dela num puf (como sempre foi quando ela se afasta). Voando, ele não aparece mais
no ar: espera embaixo e corre atrás pelo chão.

## As causas
- A mesma do unicórnio (25b6afe): sem chão achado, a procura devolvia a própria altura
  procurada; o pinguim via um degrau a cada quadro e subia aos trancos atrás da criança, até ser
  jogado de volta num puf.
- Depois do 25b6afe ainda sobravam três coisas, consertadas aqui:
  - com a criança voando para longe, ele "aparecia perto" dela no ar (a mais de 14 blocos),
    onde não havia chão;
  - ao subir um degrau, pulava e era posto em cima dele no quadro seguinte, de uma vez;
  - diante de uma parede mais alta que um pulinho (a torrinha, os terraços do morro), subia de
    elevador.
