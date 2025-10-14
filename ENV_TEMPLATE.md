# Template de Variáveis de Ambiente

Este arquivo documenta todas as variáveis de ambiente necessárias para o sistema.

## Arquivo .env (Local)

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```bash
# ============================================================================
# Variáveis de Ambiente - Sistema de Transferência de Material
# ============================================================================
# IMPORTANTE: Este arquivo contém informações sensíveis
# NUNCA commite este arquivo no Git!
# ============================================================================

# =========================
# BANCO DE DADOS (Neon PostgreSQL)
# =========================
# Connection string do Neon
# Formato: postgres://user:password@host.neon.tech/database?sslmode=require
# Obter em: https://console.neon.tech > seu projeto > Connection Details
DATABASE_URL=postgres://user:password@ep-xxx.neon.tech/neondb?sslmode=require

# =========================
# JWT (JSON Web Tokens)
# =========================
# Secret para assinar JWTs - DEVE ser uma string aleatória forte
# Gerar com: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=sua-chave-secreta-super-segura-aqui-minimo-32-caracteres

# Tempo de expiração do token
# Valores válidos: 1h, 24h, 7d, etc
JWT_EXPIRES_IN=24h

# =========================
# AMBIENTE
# =========================
# Valores: development | staging | production
NODE_ENV=development

# =========================
# SEGURANÇA
# =========================
# Número máximo de tentativas de login antes de bloquear
MAX_LOGIN_ATTEMPTS=5

# Duração do bloqueio após tentativas falhadas (em minutos)
LOCKOUT_DURATION=15

# =========================
# UPLOADS
# =========================
# Tamanho máximo de upload em bytes (5MB = 5242880)
MAX_UPLOAD_SIZE=5242880

# =========================
# RATE LIMITING
# =========================
# Limite de requisições por minuto por usuário
RATE_LIMIT_PER_MINUTE=100

# =========================
# LOGGING
# =========================
# Nível de log: error | warn | info | debug
LOG_LEVEL=info

# =========================
# APLICAÇÃO
# =========================
# URL base da aplicação (para geração de links)
# Local: http://localhost:8888
# Produção: https://seu-site.netlify.app
APP_URL=http://localhost:8888

# =========================
# EMAIL (OPCIONAL - Futuro)
# =========================
# Configurações de SMTP para envio de emails
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# EMAIL_FROM=noreply@antilhas.com

# =========================
# OUTROS
# =========================
# Timezone (opcional)
# TZ=America/Sao_Paulo
```

## Netlify Environment Variables

Configure as seguintes variáveis no Netlify via:
- **Interface Web**: Site Settings > Environment Variables
- **CLI**: `netlify env:set VARIABLE_NAME "value"`

### Produção

```bash
# Banco de Dados
netlify env:set DATABASE_URL "postgres://user:pass@host.neon.tech/db?sslmode=require"

# JWT
netlify env:set JWT_SECRET "sua-chave-secreta-de-producao"
netlify env:set JWT_EXPIRES_IN "24h"

# Ambiente
netlify env:set NODE_ENV "production"

# Segurança
netlify env:set MAX_LOGIN_ATTEMPTS "5"
netlify env:set LOCKOUT_DURATION "15"

# Uploads e Rate Limiting
netlify env:set MAX_UPLOAD_SIZE "5242880"
netlify env:set RATE_LIMIT_PER_MINUTE "100"

# Aplicação
netlify env:set APP_URL "https://seu-site.netlify.app"
```

### Staging

```bash
# Usar banco de staging diferente!
netlify env:set DATABASE_URL "postgres://...staging..." --context branch-deploy

# Outras variáveis podem ser iguais ou diferentes
netlify env:set JWT_SECRET "chave-de-staging" --context branch-deploy
netlify env:set NODE_ENV "staging" --context branch-deploy
```

## Verificação

### Verificar localmente

```bash
# Carregar .env e testar conexão
node -e "require('dotenv').config(); console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'NÃO configurada');"
```

### Verificar no Netlify

```bash
# Listar todas as variáveis
netlify env:list

# Verificar uma variável específica (não mostra o valor por segurança)
netlify env:get DATABASE_URL
```

## Segurança

### ⚠️ IMPORTANTE

1. **NUNCA** commite o arquivo `.env` no Git
2. `.env` deve estar no `.gitignore`
3. Use valores diferentes entre ambientes (dev/staging/prod)
4. Rotacione JWT_SECRET periodicamente (a cada 3-6 meses)
5. Use secrets managers em produção crítica (AWS Secrets Manager, etc)

### Gerar Senhas Seguras

```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Password Hash (bcrypt)
node -e "console.log(require('bcryptjs').hashSync('suaSenha', 10))"
```

### Backup de Variáveis

Manter backup seguro das variáveis de produção em local seguro:
- Password manager (1Password, LastPass, etc)
- Secrets manager (AWS, Azure, GCP)
- Documento criptografado offline

## Troubleshooting

### Erro: "DATABASE_URL não configurada"

```bash
# Verificar se variável existe
echo $DATABASE_URL

# Se vazio, criar .env com a variável
cat > .env << EOF
DATABASE_URL=postgres://...
EOF
```

### Erro: "JWT verification failed"

- JWT_SECRET diferente entre ambientes
- Token gerado em um ambiente, usado em outro
- Solução: Fazer logout e login novamente

### Erro: "Connection refused" ao banco

- DATABASE_URL incorreta
- Banco Neon pausado (inativo por 7 dias)
- Firewall bloqueando conexão

## Referências

- [Neon Documentation](https://neon.tech/docs)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

