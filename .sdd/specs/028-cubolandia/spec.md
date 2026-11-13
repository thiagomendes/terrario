---
id: 028-cubolandia
title: 'Nome novo: Terrário vira Cubolândia (antes das contas e das lojas)'
status: DRAFT
base_branch: main
created_at: 2026-11-13T18:00:00Z
---
## Contexto
O dono, em 13 nov 2026: manter o rebranding para Cubolândia no radar e fazer **antes** de ir para a loja: "depois que criar tudo para loja aí, depois é ruim ficar renomeando tudo". A decisão do nome e a busca preliminar estão na 020 (seção "Nome novo: Cubolândia"). Esta spec tira de lá a etapa 0 e a põe antes da 024 (conta da família). A conta já nasce com o nome final, porque o nome aparece em vários lugares:
- os e-mails dos códigos (remetente e domínio);
- a política de privacidade e os termos;
- o endereço do site;
- o ícone.

Motivo da troca: "Terrário" fica a uma letra de **Terraria**, marca registrada da Re-Logic, jogo do mesmo gênero e das mesmas lojas.

## O que só o dono pode fazer (e que vale começar já)
1. **Busca de marca no INPI** (busca.inpi.gov.br, gratuita) por "Cubolândia" e "Cubolandia", nas classes 9 (software e jogos para baixar), 41 (entretenimento e jogos online) e 28 (brinquedos, se um dia houver produto físico). Repetir com as reservas, Montamundo e Mundaréu.
2. **Domínio:** registrar `cubolandia.com.br` no registro.br, que é barato, e se possível `cubolandia.com`, antes que alguém pegue.
3. **Pedido de registro da marca no INPI:** com a busca limpa, pedir o registro em nome dele, com desconto de pessoa física ou MEI. O pedido garante a prioridade mesmo antes de sair o registro.
4. **Fora do Brasil** (USPTO e EUIPO): busca simples agora; o registro fica só se for distribuir lá.

Sem advogado, essas buscas não são parecer. Elas reduzem o risco, e o parecer vem quando der.

## O que nós fazemos (quando a busca estiver limpa)
- **Onde o nome muda:**
  - tela de abertura, logotipo e ícone;
  - nome do app instalável, manifesto e título da página;
  - créditos;
  - textos de ajuda;
  - o endereço do site: `cubolandia...`, com o antigo redirecionando.
- **O que não muda:**
  - os mundos e as preferências salvas; nada se perde;
  - as chaves internas (`terrario:config` e as outras) migram em silêncio, ou ficam como estão quando não aparecem para ninguém;
  - o código interno e o repositório podem continuar "terrario" sem problema. Só o que o jogador vê precisa mudar.
- **Logotipo:** esboço para o dono escolher, feito por nós, original.
- **Ordem:** 022 → 023 → **028** → 024 → 020 → 025. Se a busca do INPI demorar, a 028 espera sem travar a 023.

## Cuidados (ver `.sdd/cuidados-legais.md`)
- Não lançar nas lojas com o nome "Terrário".
- Conferir também se Cubolândia não colide com marca de brinquedo ou de escola infantil, mesmo fora dos jogos (classe 28 e uma busca na web).

## Decisões do dono
- 11 nov 2026: Cubolândia escolhida; reservas Montamundo e Mundaréu (ver a 020).
- 13 nov 2026: fazer antes das contas e das lojas.
