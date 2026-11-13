---
id: 024-conta-da-familia
title: 'Conta da família: jogar online com segurança, perfis para as crianças'
status: DRAFT
base_branch: main
created_at: 2026-11-13T17:00:00Z
---
## Contexto
O dono, em 13 nov 2026:
- "Para rodar local, talvez não precisaria ter conta. Mas para você entrar em mundos, jogar online... precisaria ter uma criação de conta."
- Criança e adulto têm contas diferentes: a criança cadastra o e-mail do responsável.
- Segundo fator por código de e-mail, e no futuro login com Google e com Apple.
- A conta serve para limitar os mundos na nuvem ("não virar bagunça... comprometendo os recursos"), banir, "conhecer o usuário" e, no futuro, vender dentro do jogo.

Hoje cada aparelho é uma identidade, e qualquer um cria mundos na nuvem.

## Direção recomendada (aceita em 13 nov 2026)
- **Uma conta da família, com perfis.**
  - **Quem é dono da conta:** o adulto. Cria com e-mail e confirma por um código enviado ao e-mail; o mesmo código serve de segundo fator ao entrar num aparelho novo.
  - **As crianças:** cada uma é um **perfil** dentro da conta, **sem e-mail e sem senha**. Escolhe o boneco e o nome de brincadeira e entra tocando no rosto dela.
  - **Por que assim:** é mais simples para crianças de 3 a 4 anos, e a lei pede consentimento dos pais. O adulto dá o consentimento uma vez, ao criar a conta, com o texto claro do que se guarda.
- **Sem conta continua dando para brincar** nos mundos do aparelho, sem nuvem.
- **Online pede conta.**
  - **Limites:** uma quantidade de mundos na nuvem por família, salas com limite de jogadores e mundos parados há muito tempo arquivados, com aviso antes.
  - **Moderação:** suspender ou banir uma conta, e denunciar e bloquear jogador (exigência das lojas, ver a 020).
- **Depois:** "Entrar com Google" e "Entrar com a Apple". Se houver o do Google, a Apple exige o dela.
- **Área dos pais**, atrás do portão dos pais:
  - perfis;
  - mundos e amigos;
  - ver e apagar os dados;
  - **apagar a conta** (exigência da Apple);
  - mais tarde, as compras.
- **Os mundos de hoje** passam para a conta da família na primeira entrada, sem perder nada. Isso vai no esboço.

## Cuidados (ver `.sdd/cuidados-legais.md`)
- **O que a criança nunca digita:** nome real, e-mail, foto ou idade exata. No máximo uma faixa de idade, escolhida pelo adulto.
- **O e-mail do adulto:**
  - guardado só para entrar, avisar e recuperar a conta;
  - nada de marketing sem pedir à parte;
  - o envio dos códigos usa um serviço de e-mail transacional, e isso entra na política de privacidade.
- **O que guardar:** o mínimo, com prazo para apagar, na Azure do Brasil, sem rastreadores.
- **Política de privacidade e termos:** escritos em linguagem simples, antes de abrir as contas ao público. São rascunhos nossos até ter advogado.
- **Banimento:** guardar o motivo e dar ao adulto um caminho para contestar.

## Antes de implementar
- Esboço:
  - o fluxo do adulto criando a conta e recebendo o código;
  - a criança escolhendo o perfil;
  - a área dos pais;
  - a mensagem de limite de mundos.
- Decidir com o dono os números dos limites (mundos por família, jogadores por sala, tempo para arquivar).

## Decisões do dono
- 13 nov 2026: aceitou a conta da família com perfis. Fica depois da 023 e antes da 020 (lojas).
