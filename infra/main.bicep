// Terrário: servidor do multiplayer (spec 010), no grupo rg-terrario, em Brazil South.
// Container Apps com 0,5 CPU e 1 GB sempre ligado (uma réplica: as salas ficam na memória;
// a rodada da família em 10 nov usou 135 MB e 1 ms por passo com 3 jogadores),
// registro de imagens (ACR), Storage Account para os mundos (blob) e as salas (tabela),
// monitoramento e alerta se o servidor cair. O app usa a própria identidade para baixar
// a imagem e acessar o armazenamento: nenhuma chave em código ou configuração.

@description('Região dos recursos (perto dos jogadores no Brasil).')
param local string = 'brazilsouth'

@description('Imagem do servidor. Até a primeira publicação, uma imagem de exemplo.')
param imagem string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('Porta em que o servidor escuta dentro do container.')
param porta int = 80

@description('CPU e memória da réplica.')
param cpu string = '0.5'
param memoria string = '1Gi'

@description('Origens que podem abrir o WebSocket (o site do jogo).')
param origens string = 'https://yellow-field-0d32c420f.5.azurestaticapps.net,https://terrario.tmdevlab.com'

var sufixo = take(uniqueString(resourceGroup().id), 10)
// a imagem de exemplo não tem /saude: as sondas só valem para o servidor de verdade
var servidorDeVerdade = !startsWith(imagem, 'mcr.microsoft.com/k8se/')

resource registros 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: 'log-terrario'
  location: local
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource insights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-terrario'
  location: local
  kind: 'web'
  properties: {
    Application_Type: 'Node.JS'
    WorkspaceResourceId: registros.id
  }
}

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'crterrario${sufixo}'
  location: local
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
  }
}

resource conta 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: 'stterrario${sufixo}'
  location: local
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    supportsHttpsTrafficOnly: true
  }
}

resource blobs 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  parent: conta
  name: 'default'
  properties: {
    // restaurar um mundo: versões antigas (7 dias) e lixeira de 14 dias
    isVersioningEnabled: true
    deleteRetentionPolicy: {
      enabled: true
      days: 14
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 14
    }
  }
}

// o mundo é gravado a cada 5 s: versões com mais de 7 dias saem, para não crescer sem fim
resource ciclo 'Microsoft.Storage/storageAccounts/managementPolicies@2023-05-01' = {
  parent: conta
  name: 'default'
  properties: {
    policy: {
      rules: [
        {
          name: 'versoes-antigas'
          enabled: true
          type: 'Lifecycle'
          definition: {
            filters: {
              blobTypes: ['blockBlob']
              prefixMatch: ['mundos/']
            }
            actions: {
              version: {
                delete: {
                  daysAfterCreationGreaterThan: 7
                }
              }
            }
          }
        }
      ]
    }
  }
}

resource mundos 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  parent: blobs
  name: 'mundos'
}

resource tabelas 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: conta
  name: 'default'
}

resource salas 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tabelas
  name: 'salas'
}

resource ambiente 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'cae-terrario'
  location: local
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: registros.properties.customerId
        sharedKey: registros.listKeys().primarySharedKey
      }
    }
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
  }
}

resource servidor 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-terrario-servidor'
  location: local
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: ambiente.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: porta
        transport: 'auto'
        allowInsecure: false
      }
      registries: servidorDeVerdade
        ? [
            {
              server: acr.properties.loginServer
              identity: 'system'
            }
          ]
        : []
    }
    template: {
      containers: [
        {
          name: 'servidor'
          image: imagem
          resources: {
            cpu: json(cpu)
            memory: memoria
          }
          env: [
            { name: 'PORT', value: string(porta) }
            { name: 'TERRARIO_CONTA', value: conta.name }
            { name: 'TERRARIO_ORIGENS', value: origens }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: insights.properties.ConnectionString }
          ]
          probes: servidorDeVerdade
            ? [
                {
                  type: 'Liveness'
                  httpGet: { path: '/saude', port: porta }
                  periodSeconds: 10
                  failureThreshold: 3
                }
                {
                  type: 'Readiness'
                  httpGet: { path: '/saude', port: porta }
                  periodSeconds: 5
                  failureThreshold: 3
                }
              ]
            : []
        }
      ]
      // sempre uma réplica ligada (sem esperar acordar) e só uma (salas na memória)
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

// o app baixa a imagem e lê e grava mundos e salas pela própria identidade
var papelAcr = '7f951dda-4ed3-4680-a7ca-43fe172d538d' // AcrPull
var papelBlob = 'ba92f5b4-2d11-453d-a403-e96b0029c9fe' // Storage Blob Data Contributor
var papelTabela = '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3' // Storage Table Data Contributor

resource acessoAcr 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: acr
  name: guid(acr.id, servidor.id, papelAcr)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', papelAcr)
    principalId: servidor.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource acessoBlob 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: conta
  name: guid(conta.id, servidor.id, papelBlob)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', papelBlob)
    principalId: servidor.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource acessoTabela 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: conta
  name: guid(conta.id, servidor.id, papelTabela)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', papelTabela)
    principalId: servidor.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// alerta: avisa por e-mail os donos da assinatura se o servidor ficar sem réplica no ar
resource grupoAviso 'Microsoft.Insights/actionGroups@2023-01-01' = {
  name: 'ag-terrario'
  location: 'global'
  properties: {
    groupShortName: 'terrario'
    enabled: true
    armRoleReceivers: [
      {
        name: 'donos'
        roleId: '8e3af657-a8ff-443c-a75c-2fe8c4bcb635' // Owner
        useCommonAlertSchema: true
      }
    ]
  }
}

resource alertaFora 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alerta-servidor-fora'
  location: 'global'
  properties: {
    description: 'O servidor do Terrário ficou sem réplica no ar.'
    severity: 1
    enabled: true
    scopes: [servidor.id]
    evaluationFrequency: 'PT5M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'replicas'
          metricName: 'Replicas'
          operator: 'LessThan'
          threshold: 1
          timeAggregation: 'Maximum'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [{ actionGroupId: grupoAviso.id }]
  }
}

output servidor string = servidor.properties.configuration.ingress.fqdn
output registro string = acr.properties.loginServer
output conta string = conta.name
