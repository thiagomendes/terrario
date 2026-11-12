---
id: 014-cidade-grande
title: 'Cidade Grande: prédios de visitar, ruas e praças'
status: DRAFT
base_branch: main
branch: feat/cidade-grande
created_at: 2026-11-07T23:30:00Z
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
Separada da spec 013 em 7 nov 2026: o dono escolheu fazer o Rancho Alegre primeiro (013), que traz o plantio e a criação para todos os temas. A Cidade Grande vem depois, por cima do que a 013 deixar pronto. O estudo de viabilidade está na spec 013 (`.sdd/specs/013-rancho-alegre/spec.md`, seção "Viabilidade"). O desenho de referência é `.sdd/specs/013-rancho-alegre/referencia/temas.html` (https://claude.ai/artifact/1YbkZd2Tv5TezzkkBzhVMd).

## Esboço (aprovado em desenho)
- **Céu e clima:** azul limpo de dia e pôr do sol laranja atrás dos prédios. À noite, as janelas acesas e os postes desenham a cidade. A chuva é de gotas. Sem neve; tem arco-íris.
- **Terreno:** a cidade ocupa as regiões perto do nascimento. Entre elas ficam parques (gramado, lagos e árvores de rua como ipê e sibipiruna) e um rio com ponte. Longe da cidade, o mundo volta a ser natural (morros e praia), para dar onde minerar e construir.
- **Planejador de cidade** (`EstiloMundo.povoado.planta: 'cidade'`, ao lado do `'vila'` e do `'sitio'` da 013), determinístico por região e igual no servidor:
  - ruas de asfalto com faixa, calçada e poste;
  - lotes: prédio de apartamentos (escada por dentro, apartamentos com cama, mesa e baú, janelas), padaria (fornalha), oficina mecânica (mesa de trabalho), loja de construção (baú), escola, praça (fonte, bancos, árvores) e prédio alto no centro com terraço;
  - tudo dá para visitar, com porta no térreo e escada até o terraço.
- **Moradores:** padeira ou padeiro (cozinheiro), mecânica ou mecânico (ferreiro), pedreira ou pedreiro (construtor; vende tijolo, vidro e escada). Moram nos apartamentos e trabalham nas lojas.
- **Bichos:** cachorro grande (cervo), pombo (coelho), gato de rua (raposa, domável com peixe), carpa do lago (peixe), guaxinim travesso à noite (fofo, não ataca; usa a criatura da noite mansa da 013).
- **Blocos novos:** asfalto, faixa de rua, calçada, concreto, janela grande, poste de luz e placa.
- **Estrutura rara:** roda-gigante de um parque de diversões abandonado, com baú.
- **Sons e música:** buzininha distante de dia, passarinho de praça, grilo de jardim à noite; piano e baixo de jazz leve.

## Atividade própria da cidade (decisão do dono, 10 nov 2026)
A cidade já nasce com o jeito dela, em vez de herdar a roça dos outros temas (ver a 018, que vem depois). **Decidido em 12 nov 2026: canteiro de obras.** O pedreiro mostra a planta de uma obra pequena (casinha, banca, ponto de ônibus...) em blocos fantasmas; a criança preenche os blocos e, ao terminar, a obra passa a fazer parte da cidade. Usa o construir de que as crianças já gostam.

## Decisões do dono antes de começar (12 nov 2026)
- **Altura dos prédios:** de 2 a 6 andares, como no esboço.

## Ferramenta para os prédios (decisão do dono, 10 nov 2026)
- **Sem Blender.** "Não vamos complicar."
- **MagicaVoxel, se ajudar de verdade:** prédios desenhados como "plantas" de blocos no editor de voxel e convertidos por um script para dados do jogo, no padrão de sempre (blocos de verdade, iguais no servidor; o planejador da cidade escolhe, gira e combina as plantas). Validar no começo da spec com um prédio de teste; se não compensar, as plantas ficam escritas em código como as do sítio.

## Riscos já conhecidos
- **Desempenho:** prédios altos têm muito mais blocos à vista e muito vidro. A janela vira bloco com recorte (não transparente), o miolo dos prédios fecha e a cidade fica limitada aos quarteirões próximos. Medir no celular (meta: 45 fps no centro).
