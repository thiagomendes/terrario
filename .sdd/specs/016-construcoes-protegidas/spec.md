---
id: 016-construcoes-protegidas
title: 'Construções protegidas: o que o mundo fez não quebra, e cada um só quebra o que colocou'
status: IN_PROGRESS
base_branch: main
branch: feat/construcoes-protegidas
created_at: 2026-11-10T14:00:00Z
test_command: npx vitest run
run_command: npm run dev -- --host 0.0.0.0 --port 5174 --strictPort
run_url: http://127.0.0.1:5174
checks:
- name: typecheck
  command: npx tsc --noEmit
  blocking: true
- name: build
  command: npm run build
  blocking: true
environment: docker
full_test_command: npx vitest run && scripts/e2e-gpu.sh
install_command: npm ci --no-audit --no-fund
---
## Contexto
Ideia do dono (10 nov 2026), com a estratégia aprovada: sair do modelo "tudo quebra tudo". Quebrar a casa do sítio ou a parede do amigo frustra a criança e deixa o jogo com cara de bagunça. As regras foram refinadas com o dono em 11 nov 2026: o dono do mundo **não** pode tudo. O que o mundo construiu é blindado até para ele.

## Objetivo
- O que o mundo construiu fica sempre de pé e bonito.
- No multijogador, cada criança tem a sua construção segura.
- Ninguém some com o baú nem com o bicho do outro.
- O que é protegido fica claro sem ler: cadeadinho na mira e aviso curto.

## Regras (decididas com o dono em 11 nov 2026)
### 1. O que o mundo construiu é blindado: ninguém quebra, nem o dono
- **O que entra:** casas dos povoados, sítios (casa, celeiro, silo, curral, galinheiro, moinho), ruínas e estruturas raras. Vale em **todo modo**: sobrevivência, criativo, sozinho e com amigos.
- **O chão embaixo e em volta também:** o terreno sob a construção, mais uma pequena margem, fica protegido, para ninguém cavar por baixo e deixar a casa flutuando.
- **Continua usável por todos:** portas, porteiras, camas, mesas, fornalhas e baús do povoado. A lavoura do sítio é colhida e se replanta sozinha.
- **Enfeitar pode:** dentro e em volta das construções do mundo, a criança coloca e tira as **próprias** coisas (flores, mesa, baú). Só não dá para tapar porta, porteira e passagem da construção.

### 2. O que cada um colocou: só ele quebra, e o dono do mundo também pode
- O bloco guarda quem o colocou. O amigo entra, abre a porta e usa a mesa, mas não quebra a parede do outro.
- **Sem opção no convite:** cada um só quebra o seu, sempre.
- **O dono do mundo pode desfazer a construção de um amigo** no mundo dele, por exemplo se alguém fechar a porta do sítio com blocos.
- O que um amigo colocou continua dele depois que ele sai.
- **Mundos antigos:** blocos colocados antes, sem dono registrado, passam a ser do dono do mundo. Ao "levar para a nuvem", o que o dono construiu no aparelho é dele.
- **Jogando sozinho:** a criança é a dona de tudo o que colocou; só a regra 1 muda algo.

### 3. Terreno natural livre
- Pedra, terra, areia, árvores e minérios quebram como hoje, para todos, menos o chão protegido da regra 1.

### 4. Baús, bichos e portas
- **Baú colocado por alguém:** só quem colocou e o dono do mundo abrem e mexem. Os baús do mundo (povoado, ruínas) são de todos.
- **Bichos criados:** quem criou e o dono do mundo chamam com o gesto "chamar" e levam. O bicho do amigo fica onde está. Os bichos ganham um dono, e os já criados ficam com quem os criou, se conhecido, ou com o dono do mundo.
- **Portas e porteiras:** visitantes abrem e fecham as do mundo e as dos amigos, mas não quebram.

### 5. Ao tentar quebrar algo protegido
- A rachadura nem começa: aparece um cadeadinho na mira e um aviso de criança, como "Essa casa é da vila. Que tal construir a sua?" ou "Essa parede é da Ana".
- O aviso não se repete a cada clique, porque usa a fila de avisos sem repetição da 015.

## Fora de escopo
- Terrenos demarcados ("lote" de cada criança) e permissões finas por pessoa.
- Explosões e fogo (o jogo não tem).

## Lições aplicadas
1. **Uma regra só para prever e para conferir:** a mesma função de proteção no núcleo (servidor e modo local) e no cliente (cadeado e rachadura), como a regra de alcance da 015.
2. **O servidor não confia no aparelho:** a quebra proibida é recusada no servidor, o cliente volta o bloco e nada some.
3. **Comando com saneamento e teste no modo nuvem** para tudo o que mudar no protocolo, como o dono do bloco nas edições.
4. **Mundos antigos abrem iguais** (migração do dono), e as salas na nuvem seguem valendo.
5. **Leve:** a proteção do mundo é calculada da geração (sem gravar bloco por bloco), e o dono do bloco é gravado de forma compacta nas edições.

## Capricho na experiência (para não frustrar)
- **Sem ler:** cadeadinho na mira antes mesmo de bater. No toque, o contorno do dedo fica com cadeado.
- **Nada some:** nenhuma quebra "pisca" e volta. O cliente prevê com a mesma regra do servidor.
- **Avisos curtos e gentis,** com o nome do amigo ou da vila. Nunca "acesso negado".
- **O dono entende o poder dele:** ao desfazer a construção de um amigo, aparece um aviso discreto ("Você tirou um bloco do Léo").
- **Medido:** nada de queda de quadros ao mirar e minerar; conferir a proteção não pode custar mais que 0,1 ms por bloco mirado; mundos grandes abrem no mesmo tempo de hoje.
- **Revisão jogando de verdade,** com 3 jogadores na nuvem, no computador e no celular.

## Critérios de qualidade (definição de pronto)
1. **Regra 1:** nenhuma construção do mundo nem o chão protegido quebram, em nenhum modo, para ninguém. Testado em todos os temas com povoado ou sítio.
2. **Regra 2:** no multijogador, cada um só quebra o seu, e o dono quebra o dos amigos. Recusa no servidor, previsão igual no cliente e teste no modo nuvem.
3. **Enfeitar:** dentro e em volta das construções do mundo funciona. Tapar porta, porteira ou passagem é recusado com aviso.
4. **Baú e bichos** seguem a regra 4, também no servidor.
5. **Mundos antigos e "levar para a nuvem"** abrem iguais, com o dono certo nos blocos.
6. **Cadeado e avisos** no computador e no toque.
7. **Desempenho medido;** todos os testes passam; auditoria independente; relatório visual.

## Fases e tarefas
| # | Tarefa |
|---|---|
| T01 | Proteção do mundo: volumes das construções geradas (povoados, sítios, ruínas, raras), chão e margem, portas e passagens; uma função usada no núcleo e no cliente |
| T02 | Dono do bloco: gravar quem colocou nas edições (local e nuvem), protocolo e saneamento, migração dos mundos antigos e do "levar para a nuvem" |
| T03 | Regras no núcleo: quebrar, colocar (sem tapar passagem), baú, bichos criados (dono e chamar) e portas; recusa no servidor com o motivo |
| T04 | Cliente: cadeado na mira e no toque, rachadura que não começa, avisos com nome, aviso do dono ao desfazer |
| T05 | Desempenho, testes de tela (3 jogadores na nuvem), auditoria, publicação e relatório visual |

## Decisões do dono
- 10 nov 2026: estratégia aprovada (o mundo não quebra; cada um quebra o seu); 016 antes da 014.
- 11 nov 2026: o que o mundo construiu é blindado até para o dono, em todo modo, com o chão protegido; sem opção de "construir junto" no convite; o dono do mundo desfaz a construção dos amigos; baú só de quem colocou e do dono; bichos criados chamados só por quem criou e pelo dono; visitantes abrem e fecham portas e porteiras; enfeitar dentro das construções pode, sem tapar portas. Sem esboço grande: a spec vai direto.
