# Guia de Verificação - Timeout de Autenticação

## Problema
Login retorna erro 503/504 (Gateway Timeout) devido a problemas de conexão com o banco de dados.

## Soluções Implementadas

### 1. Endpoint de Diagnóstico Melhorado
- **URL**: `/.netlify/functions/health`
- **Método**: GET
- **Retorna**: Status detalhado do sistema, banco de dados, variáveis de ambiente e tabelas

### 2. Timeout e Retry Logic
- Timeout configurável para queries (padrão: 10 segundos)
- Retry automático para erros de conexão
- Mensagens de erro mais claras

### 3. Tratamento de Erros Melhorado
- Erro específico para timeout (504)
- Logs detalhados de problemas de conexão
- Fallback gracioso quando banco não responde

## Verificação no Netlify

### 1. Verificar Variáveis de Ambiente

```bash
# Listar todas as variáveis
netlify env:list

# Verificar DATABASE_URL especificamente
netlify env:get DATABASE_URL

# Verificar JWT_SECRET
netlify env:get JWT_SECRET
```

### 2. Testar Health Check

```bash
# Acessar endpoint de diagnóstico
curl https://seu-site.netlify.app/.netlify/functions/health

# Ou via browser
https://seu-site.netlify.app/.netlify/functions/health
```

**Resposta esperada (sistema saudável):**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production",
  "responseTime": 150,
  "services": {
    "database": {
      "status": "connected",
      "responseTime": 120,
      "serverTime": "2024-01-01T12:00:00.000Z"
    },
    "environment": {
      "status": "configured",
      "variables": {
        "DATABASE_URL": {
          "present": true,
          "length": 150,
          "valid": true
        },
        "JWT_SECRET": {
          "present": true,
          "length": 64,
          "valid": true
        }
      }
    },
    "tables": {
      "status": "accessible",
      "details": {
        "users": { "exists": true, "count": 1 },
        "requests": { "exists": true, "count": 1 },
        "sessions": { "exists": true, "count": 1 },
        "audit_logs": { "exists": true, "count": 1 }
      }
    }
  }
}
```

### 3. Testar Login Localmente

```bash
# Iniciar servidor local
netlify dev

# Testar login
curl -X POST http://localhost:8888/.netlify/functions/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@antilhas.com","password":"admin123"}'
```

### 4. Verificar Logs do Netlify

```bash
# Ver logs em tempo real
netlify logs

# Ver logs de uma função específica
netlify logs --function auth
```

## Possíveis Problemas e Soluções

### 1. DATABASE_URL não configurada
**Sintoma**: Health check retorna `"environment": {"status": "misconfigured"}`

**Solução**:
```bash
# Configurar DATABASE_URL
netlify env:set DATABASE_URL "postgres://user:pass@host.neon.tech/db?sslmode=require"
```

### 2. DATABASE_URL inválida
**Sintoma**: Health check retorna `"database": {"status": "disconnected"}`

**Solução**:
- Verificar se a URL está correta
- Verificar se o banco Neon está ativo (não pausado)
- Testar conexão diretamente no Neon Console

### 3. Timeout de conexão
**Sintoma**: Login retorna 504 com mensagem de timeout

**Solução**:
- Verificar se o banco Neon está respondendo
- Aumentar timeout se necessário:
```bash
netlify env:set DB_QUERY_TIMEOUT "15000"  # 15 segundos
netlify env:set DB_CONNECTION_TIMEOUT "15000"
```

### 4. Banco pausado (Neon)
**Sintoma**: Erro de conexão recusada

**Solução**:
- Acessar Neon Console
- Reativar o banco se estiver pausado
- Aguardar alguns minutos para estabilizar

## Configurações Recomendadas

### Variáveis de Ambiente Essenciais
```bash
# Banco de dados
DATABASE_URL=postgres://user:pass@host.neon.tech/db?sslmode=require

# JWT
JWT_SECRET=sua-chave-secreta-de-64-caracteres-minimo
JWT_EXPIRES_IN=24h

# Ambiente
NODE_ENV=production

# Timeouts (opcional)
DB_QUERY_TIMEOUT=10000
DB_CONNECTION_TIMEOUT=10000
DB_MAX_RETRIES=3
```

### Teste Completo
1. Acesse `/.netlify/functions/health`
2. Verifique se `status: "healthy"`
3. Teste login via interface web
4. Verifique logs se houver problemas

## Monitoramento Contínuo

### Health Check Automático
Configure monitoramento para verificar o endpoint de health:
- **URL**: `/.netlify/functions/health`
- **Frequência**: A cada 5 minutos
- **Alerta**: Se status != "healthy"

### Logs Importantes
Monitore estes tipos de log:
- `login_timeout` - Timeouts durante login
- `Database health check failed` - Problemas de conexão
- `Database query error` - Erros de query

## Contato de Suporte

Se os problemas persistirem:
1. Execute o health check e salve a resposta
2. Verifique os logs do Netlify
3. Teste a conexão diretamente no Neon Console
4. Documente os erros específicos encontrados
