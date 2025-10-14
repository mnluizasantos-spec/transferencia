# Deploy Manual no Netlify

## Via Netlify CLI

```bash
# Instalar Netlify CLI globalmente
npm install -g netlify-cli

# Login no Netlify
netlify login

# Deploy manual
netlify deploy --prod
```

## Via Interface Web

1. **Acesse**: https://app.netlify.com/sites/transferencia-mp/deploys
2. **Clique** em "Trigger deploy" → "Deploy site"
3. **Aguarde** o build completar

## Verificar se Funcionou

Após o deploy:

1. **Teste**: https://transferencia-mp.netlify.app/.netlify/functions/health
2. **Deve retornar**: `{"status":"healthy",...}`
3. **Se der 404**, as funções não foram deployadas

## Troubleshooting

### Se ainda der 404:

1. **Verificar** se `functions = "netlify/functions"` está no netlify.toml
2. **Verificar** se a pasta `netlify/functions/` existe
3. **Verificar** se as variáveis de ambiente estão configuradas
4. **Verificar** logs do build para erros
