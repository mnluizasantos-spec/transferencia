# Guia de Deploy - Sistema de Transferência de Material

Este documento detalha o processo completo de deploy do sistema em produção.

## Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Banco de Dados (Neon)](#configuração-do-banco-de-dados-neon)
3. [Configuração do Netlify](#configuração-do-netlify)
4. [Deploy](#deploy)
5. [Pós-Deploy](#pós-deploy)
6. [Ambiente de Staging](#ambiente-de-staging)
7. [Rollback](#rollback)

## Pré-requisitos

- Conta GitHub (com repositório do projeto)
- Conta Neon (https://neon.tech)
- Conta Netlify (https://netlify.com)
- Node.js 18+ instalado localmente
- Netlify CLI instalado: `npm install -g netlify-cli`

## Configuração do Banco de Dados (Neon)

### 1. Criar Projeto no Neon

1. Acesse https://console.neon.tech
2. Clique em "Create Project"
3. Configure:
   - **Project Name**: `antilhas-solicitacoes-prod`
   - **Region**: Escolha a mais próxima (ex: US East)
   - **PostgreSQL Version**: 15 ou superior
4. Clique em "Create Project"

### 2. Obter Connection String

1. No dashboard do projeto, vá em "Connection Details"
2. Copie a **Connection String** completa
3. Formato: `postgres://user:password@host.neon.tech/database?sslmode=require`
4. Salve em local seguro (usaremos nas variáveis de ambiente)

### 3. Executar Schema

```bash
# Definir variável temporária
export DATABASE_URL="sua-connection-string-do-neon"

# Executar schema
psql $DATABASE_URL -f db/schema.sql

# Verificar se tabelas foram criadas
psql $DATABASE_URL -c "\dt"

# Criar usuários iniciais
psql $DATABASE_URL -f db/seed_users.sql
```

### 4. Verificar Integridade

```bash
# Teste local
node scripts/data_integrity_check.js
```

## Configuração do Netlify

### 1. Criar Site no Netlify

#### Opção A: Via Interface Web

1. Acesse https://app.netlify.com
2. Clique em "Add new site" > "Import an existing project"
3. Conecte ao GitHub e selecione o repositório
4. Configure:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `web`
   - **Functions directory**: `netlify/functions`
5. Clique em "Deploy site"

#### Opção B: Via CLI

```bash
# Login no Netlify
netlify login

# Inicializar site
netlify init

# Seguir o wizard:
# - Create & configure a new site
# - Team: Escolher seu team
# - Site name: antilhas-solicitacoes (ou deixar gerar automaticamente)
# - Build command: npm run build
# - Directory to deploy: web
# - Netlify functions folder: netlify/functions
```

### 2. Configurar Variáveis de Ambiente

#### Via Interface Web

1. No dashboard do site, vá em "Site configuration" > "Environment variables"
2. Adicione as seguintes variáveis:

| Key | Value | Context |
|-----|-------|---------|
| DATABASE_URL | Sua connection string do Neon | Production |
| JWT_SECRET | Gere uma chave aleatória segura* | Production |
| JWT_EXPIRES_IN | 24h | Production |
| NODE_ENV | production | Production |

*Gerar JWT_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

#### Via CLI

```bash
netlify env:set DATABASE_URL "postgres://user:pass@host.neon.tech/db"
netlify env:set JWT_SECRET "sua-chave-secreta-aqui"
netlify env:set JWT_EXPIRES_IN "24h"
netlify env:set NODE_ENV "production"
```

### 3. Configurar Domínio (Opcional)

1. No dashboard, vá em "Domain management"
2. Clique em "Add domain"
3. Siga instruções para:
   - Usar domínio customizado
   - Configurar DNS
   - Ativar HTTPS automático

## Deploy

### Deploy Automático (Recomendado)

Após configuração inicial, deploys acontecem automaticamente:

1. Faça commit das alterações:
   ```bash
   git add .
   git commit -m "feat: nova funcionalidade"
   git push origin main
   ```

2. Netlify detecta o push e inicia deploy automaticamente

3. Acompanhe o deploy:
   - Via dashboard: https://app.netlify.com/sites/seu-site/deploys
   - Via CLI: `netlify watch`

### Deploy Manual via CLI

```bash
# Deploy para produção
netlify deploy --prod

# O CLI perguntará:
# - Publish directory: web
# - Functions directory: netlify/functions

# Confirme e aguarde o deploy
```

### Deploy de Preview (Branch Deploy)

```bash
# Criar branch de feature
git checkout -b feature/nova-funcionalidade

# Fazer alterações e commit
git add .
git commit -m "feat: implementa nova funcionalidade"
git push origin feature/nova-funcionalidade

# Netlify cria automaticamente um deploy de preview
# URL: https://feature-nova-funcionalidade--seu-site.netlify.app
```

## Pós-Deploy

### 1. Verificar Health Check

```bash
curl https://seu-site.netlify.app/.netlify/functions/health
```

Resposta esperada:
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2025-10-13T12:00:00Z",
  "version": "1.0.0"
}
```

### 2. Testar Login

1. Acesse https://seu-site.netlify.app/login.html
2. Faça login com:
   - Email: `admin@antilhas.com`
   - Senha: `admin123`
3. Verifique se dashboard carrega corretamente

### 3. Alterar Senhas Padrão

**IMPORTANTE**: Alterar senhas dos usuários padrão imediatamente!

1. Login como admin
2. Vá em Configurações > Alterar Senha
3. Defina uma senha forte

### 4. Configurar Monitoramento

#### Uptime Monitoring

Use serviço externo (grátis):
- [UptimeRobot](https://uptimerobot.com)
- [StatusCake](https://www.statuscake.com)

Monitore o endpoint:
```
https://seu-site.netlify.app/.netlify/functions/health
```

#### Logs

Netlify guarda logs automaticamente:
```bash
# Ver logs via CLI
netlify logs
```

### 5. Backup Inicial

```bash
# Executar primeiro backup manual
node scripts/backup.js --full

# Configurar backup automático via GitHub Actions
# (ver .github/workflows/backup.yml)
```

## Ambiente de Staging

Recomenda-se manter ambiente de staging para testes:

### 1. Criar Branch Staging

```bash
git checkout -b staging
git push origin staging
```

### 2. Configurar Site Staging no Netlify

```bash
netlify sites:create --name antilhas-solicitacoes-staging

# Configurar variáveis (usar banco staging)
netlify env:set DATABASE_URL "postgres://...staging..." --context branch-deploy
```

### 3. Configurar Deploy Automático

No `netlify.toml`, branch `staging` deployará automaticamente.

### 4. Workflow

```bash
# Desenvolver em feature
git checkout -b feature/nova-funcionalidade

# Merge para staging (testes)
git checkout staging
git merge feature/nova-funcionalidade
git push origin staging

# Após testes, merge para main (produção)
git checkout main
git merge staging
git push origin main
```

## Rollback

### Rollback via Interface

1. Acesse https://app.netlify.com/sites/seu-site/deploys
2. Encontre o deploy anterior que funcionava
3. Clique em "..." > "Publish deploy"
4. Confirme

### Rollback via CLI

```bash
# Listar deploys
netlify deploy:list

# Restaurar deploy específico
netlify deploy:publish --deploy-id=<deploy-id>
```

### Rollback de Banco de Dados

Se migration causou problemas:

```bash
# 1. Restaurar backup mais recente
# Ver procedimento em db/backup_policy.md

# 2. Usar PITR do Neon (se < 30 dias)
# Via dashboard Neon: Backups > Restore
```

## Checklist de Deploy

- [ ] Banco de dados configurado no Neon
- [ ] Schema executado (`db/schema.sql`)
- [ ] Usuários iniciais criados (`db/seed_users.sql`)
- [ ] Site criado no Netlify
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado com sucesso
- [ ] Health check respondendo
- [ ] Login funcionando
- [ ] Senhas padrão alteradas
- [ ] Monitoramento configurado
- [ ] Backup inicial executado
- [ ] Domínio customizado configurado (se aplicável)
- [ ] Documentação atualizada
- [ ] Equipe notificada

## Troubleshooting

### Deploy falhou

```bash
# Ver logs detalhados
netlify logs

# Testar build localmente
netlify build

# Verificar dependências
npm install
```

### Função retorna erro 500

```bash
# Ver logs da função
netlify logs:function nome-da-funcao

# Verificar variáveis de ambiente
netlify env:list
```

### Banco não conecta

1. Verificar DATABASE_URL nas variáveis
2. Testar conexão direta:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```
3. Verificar IP whitelist no Neon (geralmente não necessário)

## Contatos

Em caso de problemas críticos:
- **Suporte Neon**: support@neon.tech
- **Suporte Netlify**: support@netlify.com
- **Admin Sistema**: admin@antilhas.com

## Histórico de Deploys

Manter registro em CHANGELOG.md:
- Data e hora
- Versão
- Principais mudanças
- Quem fez o deploy
- Problemas encontrados

