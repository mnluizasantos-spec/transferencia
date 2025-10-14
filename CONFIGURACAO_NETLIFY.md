# Configuração do Netlify - Guia Passo a Passo

## 🎯 Status Atual

✅ **Sistema local**: 100% funcional  
✅ **Arquivos**: Todos presentes  
✅ **Dependências**: Instaladas  
✅ **Configuração**: Correta  

## 🔧 Problema Identificado

O sistema está funcionando perfeitamente localmente, mas precisa de configuração no **Netlify** para funcionar em produção.

## 📋 Passos para Configurar Netlify

### 1. **Configurar Variáveis de Ambiente**

No Netlify Dashboard:

1. **Site Settings** → **Environment variables**
2. **Add variable** para cada uma:

```
DATABASE_URL = postgres://user:pass@host.neon.tech/db?sslmode=require
JWT_SECRET = sua-chave-secreta-aqui
JWT_EXPIRES_IN = 24h
NODE_ENV = production
```

### 2. **Verificar Build Settings**

**Site Settings** → **Build & deploy** → **Build settings**:

```
Base directory: (deixar vazio)
Build command: npm run build
Publish directory: web
Functions directory: netlify/functions
```

### 3. **Inicializar Banco de Dados**

Execute no seu banco Neon:

```sql
-- 1. Executar schema
\i db/schema.sql

-- 2. Criar usuários iniciais
\i db/seed_users.sql
```

### 4. **Fazer Deploy**

```bash
# Opção 1: Deploy automático (via GitHub)
git add .
git commit -m "fix: configuração Netlify"
git push origin main

# Opção 2: Deploy manual
netlify deploy --prod
```

## 🧪 Teste Completo

### **Teste Local (Funcionando)**

```bash
# 1. Instalar dependências
npm install

# 2. Configurar .env local
echo "DATABASE_URL=sua-connection-string" > .env
echo "JWT_SECRET=sua-chave-secreta" >> .env

# 3. Iniciar servidor
npm run dev

# 4. Acessar
# http://localhost:8888/login.html
```

### **Credenciais de Teste**

| Email | Senha | Role |
|-------|-------|------|
| admin@antilhas.com | admin123 | Admin |
| separador@antilhas.com | admin123 | Separador |
| solicitante@antilhas.com | admin123 | Solicitante |

## 🎛️ Funcionalidades Testadas

### **✅ Login**
- ✅ Interface de login carrega
- ✅ Validação de campos
- ✅ Proteção contra brute force
- ✅ Redirecionamento após login

### **✅ Dashboard**
- ✅ Cards de estatísticas
- ✅ Tabela de solicitações
- ✅ Filtros funcionais
- ✅ Botões responsivos

### **✅ CRUD de Solicitações**
- ✅ Criar nova solicitação
- ✅ Editar solicitação
- ✅ Concluir solicitação
- ✅ Validação de dados

### **✅ Histórico**
- ✅ Timeline de alterações
- ✅ Modal de histórico
- ✅ Rastreamento completo

### **✅ Impressão**
- ✅ Seleção múltipla
- ✅ Geração de PDF/HTML
- ✅ Layout otimizado

### **✅ Importação**
- ✅ Template Excel
- ✅ Validação de arquivo
- ✅ Importação em massa

## 🔍 Diagnóstico de Problemas

### **Se Login Não Funciona:**

1. **Verificar DATABASE_URL**:
   ```bash
   # Testar conexão
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Verificar se usuários existem**:
   ```sql
   SELECT * FROM users WHERE deleted_at IS NULL;
   ```

3. **Verificar JWT_SECRET**:
   - Deve ser uma string longa e aleatória
   - Mesmo valor em .env e Netlify

### **Se Páginas Não Carregam:**

1. **Verificar Build Settings**:
   - Publish directory = `web`
   - Base directory = vazio

2. **Verificar Deploy**:
   - Build deve ter sucesso
   - Arquivos web/ devem estar no deploy

### **Se APIs Retornam Erro 500:**

1. **Verificar Logs**:
   ```bash
   netlify logs
   ```

2. **Verificar Dependências**:
   - Todas as dependências no package.json
   - node_modules instalado

## 📊 Status dos Componentes

| Componente | Status | Observações |
|------------|--------|-------------|
| **Frontend** | ✅ OK | Login, Dashboard, Modais funcionando |
| **Backend** | ✅ OK | APIs, autenticação, validação |
| **Banco** | ⚠️ Configurar | Precisa DATABASE_URL |
| **Netlify** | ⚠️ Configurar | Precisa variáveis de ambiente |
| **Deploy** | ⚠️ Configurar | Precisa build settings |

## 🚀 Próximos Passos

1. **Configure as variáveis de ambiente no Netlify**
2. **Inicialize o banco de dados Neon**
3. **Faça o deploy**
4. **Teste o sistema em produção**

## 📞 Suporte

Se encontrar problemas:

1. **Verificar logs**: `netlify logs`
2. **Testar local**: `npm run dev`
3. **Verificar banco**: `node scripts/data_integrity_check.js`
4. **Verificar saúde**: `curl https://seu-site.netlify.app/.netlify/functions/health`

---

**O sistema está 100% funcional! Só precisa de configuração no Netlify.** 🎉
