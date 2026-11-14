# 031 Missões da Era dos Dinos e do Doce Reino: tarefas

Tamanho: **P** (até meio dia), **M** (1 a 2 dias), **G** (3 dias ou mais). Uma fase por vez (pesa no computador do dono). Cada fase fecha com `npx tsc --noEmit -p .`, os testes que tocou, um commit e capturas em `scratchpad/031impl/`.

## Fase 1: o canto, o ninho e os cartões (o que aparece na tela)
| # | Tarefa | Tamanho |
|---|---|---|
| T01 | **Regras** `src/jogo/alma.ts`: os dois mundos, `mundoAlmaDoEstilo` (sem campo novo), d1–d3 e e1–e2 (15 moedinhas cada), o desenho `arte` (resultado à direita), contas novas, banca | P |
| T02 | **Canto das missões** `src/world/cantoMissoes.ts`: planejador puro perto do nascer, peças no chão de verdade, geração (`chunk.ts`), proteção (`protecao.ts`), testes | M |
| T03 | **Núcleo:** o mundo pelo estilo; os ovinhos marcados ao escolher a d1; os bichos do pasto; a comida na mão; a rocha de osso com um toque; o bolo de graça para quem tem a e1 | M |
| T04 | **Arte e modelos:** desenhos novos (`arteCanto.ts`), ninho de gravetos 3D, ovinho de dino 3D, broto-doce 3D | M |
| T05 | **Quadro:** o pedacinho da próxima missão, selo maior, barra e mapinha escondidos com o painel; os fantasmas do bolo (os da obra) | P |
| T06 | **Parada para revisão:** fotos deitado e em pé, nos dois mundos, e os cartões de perto | P |

## Fase 2: fazer a coisa no lugar
| # | Tarefa | Tamanho |
|---|---|---|
| T07 | **Guia:** `alvoDaMissao` no canto (ovinho, bicho que anda, caixa, mesa); a placa some a ~4 blocos (todas as missões); boneco transparente com a mãozinha atrás | M |
| T08 | **Toques:** a rocha de osso (um toque, pó, o osso voa ao selinho), o bicho sem comida no raio do dedo (corações, sai andando), a comida que aparece na mão (pop e som), a mãozinha do bolo que pula, a do bicho e a da rocha em até 1,5 s | M |
| T09 | **Testes de tela** (`e2e/missoes-dinos-doce.spec.ts`): as 5 missões de ponta a ponta com o andador e o toque de verdade, moedinhas na carteira de verdade | M |

## Fase 3: fechamento
| # | Tarefa | Tamanho |
|---|---|---|
| T10 | **Nada voltou para trás:** alma, guia-missao, guia-chegada, menu-roda, passeio-c3; paridade 36 de 36; suíte inteira; build | M |
| T11 | **Vídeos** de ~1 min no celular deitado com som, um por mundo; relatório visual | M |

**Ordem:** T01 → T02 → T03 → T04 → T05 → T06 (parada) → T07 → T08 → T09 → T10 → T11.

## Situação (14 nov 2026)
- Fase 1 feita (b7ba8b5); revisão de UX aplicada e fase 2 feita (a404a55, c6bd71e).
- Fase 3: `tsc` limpo; Vitest 1696/1696; e2e `missoes-dinos-doce` 12/12 (as 5 missões deitado e em pé, com moedinhas de verdade); alma, guia-missao, menu-roda, passeio-c3 e guia-chegada passam, menos o c6 em pé do guia-chegada, que também falha no `main` (2a8eff3) do mesmo jeito; paridade 36/36; `npm run build` ok.
- Falta: rodada em família antes de publicar.
