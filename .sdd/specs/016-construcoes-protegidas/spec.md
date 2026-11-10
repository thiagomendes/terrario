---
id: 016-construcoes-protegidas
title: 'Construções protegidas: o que o mundo fez não quebra, e cada um só quebra o que colocou'
status: DRAFT
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
Ideia do dono (10 nov 2026), aprovada a estratégia: sair do modelo "tudo quebra tudo". Quebrar a casa do sítio ou a parede do amigo frustra a criança e deixa o jogo com cara de bagunça. A spec 013 (Rancho) não tenta resolver isso; fica tudo aqui.

## Regras (estratégia aprovada)
1. **O que o mundo construiu não quebra:** casas dos povoados, sítios (casa, celeiro, silo, curral, galinheiro, moinho), ruínas e estruturas raras. Continuam usáveis: portas, porteiras, baús, camas, fornalhas e mesas. A lavoura do sítio pode ser colhida e se replanta sozinha. O terreno natural (pedra, terra, areia, árvores, minérios) quebra como hoje.
2. **No multijogador, cada um só quebra o que ele mesmo colocou.** O bloco guarda quem colocou; o amigo entra, abre a porta e usa a mesa, mas não quebra a parede. O dono do mundo pode tudo. Jogando sozinho nada muda.
3. **Ao tentar quebrar algo protegido:** a rachadura nem começa; aparece um cadeadinho na mira e um aviso de criança ("Essa casa é do sítio. Que tal construir a sua?", "Essa parede é da Ana").

## A confirmar no começo da spec (recomendações já apresentadas ao dono)
- **Construir junto:** opção no convite "amigos podem mexer nas construções uns dos outros", desligada por padrão.
- **Baú colocado por um amigo:** abre só para quem colocou e para o dono do mundo.
- **Criativo:** o dono do mundo quebra tudo no criativo.
- **Mundos antigos:** blocos colocados antes, sem dono registrado, passam a ser do dono do mundo.
- **Visitante e porteira:** hoje o visitante abre portas e porteiras (013); rever junto com estas regras.

## Ordem
Depois da 015 (terceira pessoa) e antes da 014 (Cidade Grande), que já nasce com os prédios protegidos.
