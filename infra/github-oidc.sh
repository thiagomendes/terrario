#!/bin/sh
# Cria a identidade que o GitHub Actions usa para publicar o servidor (sem senha, OIDC).
# Roda uma vez, com o az e o gh já logados:  sh infra/github-oidc.sh
# - app gh-terrario-servidor, só aceita tokens do main de thiagomendes/terrario;
# - AcrPush no registro de imagens e Contributor só no Container App;
# - grava os três identificadores como variáveis do repositório (não são segredos).
set -e
REPO=thiagomendes/terrario
GRUPO=rg-terrario
REGISTRO=crterrarioxuvrtk4qwp
APP_CA=ca-terrario-servidor

ASSINATURA=$(az account show --query id -o tsv)
TENANT=$(az account show --query tenantId -o tsv)

APP=$(az ad app list --display-name gh-terrario-servidor --query "[0].appId" -o tsv)
if [ -z "$APP" ]; then
  APP=$(az ad app create --display-name gh-terrario-servidor --query appId -o tsv)
  echo "app criado: $APP"
fi
az ad sp show --id "$APP" >/dev/null 2>&1 || az ad sp create --id "$APP" -o none
SP=$(az ad sp show --id "$APP" --query id -o tsv)

if ! az ad app federated-credential list --id "$APP" --query "[].name" -o tsv | grep -q github-terrario-main; then
  az ad app federated-credential create --id "$APP" --parameters "{
    \"name\": \"github-terrario-main\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:$REPO:ref:refs/heads/main\",
    \"description\": \"GitHub Actions do terrario, só no main\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" -o none
  echo "credencial federada criada (só o main de $REPO)"
fi

ACR_ID=$(az acr show -n $REGISTRO --query id -o tsv)
CA_ID=$(az containerapp show -g $GRUPO -n $APP_CA --query id -o tsv)
az role assignment create --assignee-object-id "$SP" --assignee-principal-type ServicePrincipal \
  --role AcrPush --scope "$ACR_ID" -o none
az role assignment create --assignee-object-id "$SP" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "$CA_ID" -o none
echo "permissões: AcrPush no registro e Contributor só no Container App"

gh variable set AZURE_CLIENT_ID -R $REPO -b "$APP"
gh variable set AZURE_TENANT_ID -R $REPO -b "$TENANT"
gh variable set AZURE_SUBSCRIPTION_ID -R $REPO -b "$ASSINATURA"
echo "pronto: o servidor passa a ser publicado sozinho a cada envio ao main"
