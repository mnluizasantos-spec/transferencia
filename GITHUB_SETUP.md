# Guia de Publicação no GitHub

## 📋 Pré-requisitos

- Conta no GitHub (https://github.com)
- Git instalado no computador
- Terminal/PowerShell aberto na pasta do projeto

## 🚀 Passo a Passo

### 1. Inicializar Repositório Local

```bash
# Na pasta do projeto (infra)
cd "C:\Users\maria.nunes\antilhas-solicitacoes\infra"

# Inicializar git (se ainda não foi feito)
git init

# Verificar status
git status
```

### 2. Criar .gitignore (já existe, mas verificar)

O arquivo `.gitignore` já foi criado, mas verifique se contém:

```
node_modules/
.env
.env.local
.env.production
.netlify/
*.log
backups/*.json
backups/*.sql
```

### 3. Adicionar Arquivos ao Git

```bash
# Adicionar todos os arquivos (exceto os do .gitignore)
git add .

# Verificar o que será commitado
git status

# Fazer o primeiro commit
git commit -m "feat: implementação completa do sistema de transferência de material"
```

### 4. Criar Repositório no GitHub

**Opção A: Via Interface Web**

1. Acesse https://github.com
2. Clique no botão **"+"** no canto superior direito
3. Selecione **"New repository"**
4. Configure:
   - **Repository name**: `sistema-transferencia-material`
   - **Description**: `Sistema de gerenciamento de transferência de material intercompany com auditoria completa`
   - **Visibility**: 
     - ✅ **Private** (recomendado - dados sensíveis)
     - ⚠️ Public (apenas se quiser código aberto)
   - **Inicializar**: 
     - ❌ NÃO marcar "Add a README file"
     - ❌ NÃO adicionar .gitignore
     - ❌ NÃO escolher license
5. Clique em **"Create repository"**

**Opção B: Via GitHub CLI** (se instalado)

```bash
gh repo create sistema-transferencia-material --private --source=. --remote=origin
```

### 5. Conectar Repositório Local ao GitHub

Após criar o repositório no GitHub, você verá instruções. Execute:

```bash
# Adicionar remote (substitua YOUR-USERNAME pelo seu usuário)
git remote add origin https://github.com/YOUR-USERNAME/sistema-transferencia-material.git

# Verificar remote
git remote -v

# Renomear branch para main (se necessário)
git branch -M main

# Fazer push inicial
git push -u origin main
```

### 6. Verificar Upload

1. Acesse seu repositório no GitHub
2. Verifique se todos os arquivos foram enviados
3. Confirme que `.env` NÃO está no repositório

## 🔐 Configurar Secrets do GitHub (para CI/CD)

Se quiser configurar GitHub Actions para backup automático:

1. No repositório, vá em **Settings** > **Secrets and variables** > **Actions**
2. Clique em **"New repository secret"**
3. Adicione:
   - Nome: `DATABASE_URL`
   - Value: Sua connection string do Neon
   - Clique **"Add secret"**

## 📝 Adicionar Badge de Status (Opcional)

Adicione ao README.md:

```markdown
[![Deploy Status](https://api.netlify.com/api/v1/badges/YOUR-SITE-ID/deploy-status)](https://app.netlify.com/sites/YOUR-SITE/deploys)
```

## 🌿 Criar Branch de Desenvolvimento

```bash
# Criar e mudar para branch develop
git checkout -b develop

# Fazer push da branch
git push -u origin develop

# Voltar para main
git checkout main
```

## 🔄 Workflow de Commits Futuros

```bash
# 1. Verificar status
git status

# 2. Adicionar arquivos modificados
git add .
# OU específicos
git add arquivo1.js arquivo2.js

# 3. Commit com mensagem descritiva
git commit -m "tipo: descrição"

# Tipos de commit:
# - feat: nova funcionalidade
# - fix: correção de bug
# - docs: documentação
# - style: formatação
# - refactor: refatoração
# - test: testes
# - chore: manutenção

# 4. Push para GitHub
git push origin main
```

## 📋 Estrutura de Branches Recomendada

```
main (produção)
  └── develop (desenvolvimento)
       ├── feature/nova-funcionalidade
       ├── feature/outra-funcionalidade
       └── hotfix/correcao-urgente
```

### Criar Feature Branch

```bash
# Criar branch de feature
git checkout -b feature/nome-da-funcionalidade

# Trabalhar e fazer commits
git add .
git commit -m "feat: implementa funcionalidade X"

# Push da feature
git push -u origin feature/nome-da-funcionalidade

# Depois, criar Pull Request no GitHub
```

## 🔗 Integrar com Netlify

### Deploy Automático via GitHub

1. No Netlify Dashboard
2. Vá em **Site Settings** > **Build & deploy** > **Continuous deployment**
3. Conecte ao GitHub
4. Selecione o repositório `sistema-transferencia-material`
5. Configure:
   - **Branch to deploy**: `main`
   - **Build command**: `npm run build`
   - **Publish directory**: `web`

Agora, cada push para `main` fará deploy automático!

## 📊 Adicionar GitHub Actions (Opcional)

### Backup Automático Semanal

Crie `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * 0'  # Domingo às 2h AM
  workflow_dispatch:  # Permite execução manual

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: node scripts/backup.js --full
      
      - name: Upload backup artifact
        uses: actions/upload-artifact@v3
        with:
          name: backup-${{ github.run_number }}
          path: backups/backup_*.json
```

Commit e push:

```bash
git add .github/workflows/backup.yml
git commit -m "ci: adiciona workflow de backup automático"
git push origin main
```

## 🛡️ Proteger Branch Main

1. No GitHub, vá em **Settings** > **Branches**
2. Clique **"Add rule"** em **Branch protection rules**
3. Em **Branch name pattern**, digite: `main`
4. Marque:
   - ✅ **Require a pull request before merging**
   - ✅ **Require approvals** (1 approval)
   - ✅ **Require status checks to pass**
   - ✅ **Require branches to be up to date**
5. Clique **"Create"**

## 📄 Criar Tags de Versão

```bash
# Criar tag
git tag -a v1.0.0 -m "Versão 1.0.0 - Release inicial"

# Push da tag
git push origin v1.0.0

# Listar tags
git tag
```

No GitHub, isso cria uma **Release** automaticamente.

## 🔍 Comandos Úteis

```bash
# Ver histórico de commits
git log --oneline

# Ver diferenças
git diff

# Desfazer alterações não commitadas
git checkout -- arquivo.js

# Desfazer último commit (mantém alterações)
git reset --soft HEAD~1

# Ver branches
git branch -a

# Deletar branch local
git branch -d nome-branch

# Deletar branch remota
git push origin --delete nome-branch

# Atualizar do remote
git pull origin main

# Ver remote URL
git remote -v
```

## ⚠️ Checklist Antes do Push

- [ ] Verificar que `.env` NÃO está sendo commitado
- [ ] Remover console.logs de debug
- [ ] Atualizar README.md se necessário
- [ ] Testar localmente antes do push
- [ ] Commit com mensagem descritiva
- [ ] Verificar branch correta

## 🆘 Problemas Comuns

### Erro: "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/YOUR-USERNAME/seu-repo.git
```

### Erro: "failed to push some refs"

```bash
# Puxar alterações primeiro
git pull origin main --rebase

# Depois push
git push origin main
```

### Acidentalmente commitou .env

```bash
# Remover do git mas manter no disco
git rm --cached .env

# Commit
git commit -m "chore: remove .env do git"

# Adicionar ao .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: adiciona .env ao gitignore"

# Push
git push origin main
```

## 📞 Suporte

- **GitHub Docs**: https://docs.github.com
- **Git Docs**: https://git-scm.com/doc

## ✅ Conclusão

Após seguir estes passos, seu projeto estará:
- ✅ Versionado no Git
- ✅ Publicado no GitHub
- ✅ Pronto para colaboração
- ✅ Integrado com Netlify
- ✅ Com deploy automático
- ✅ Backups configurados

**Próximos passos**: 
1. Adicionar colaboradores (Settings > Collaborators)
2. Configurar Issues e Projects
3. Criar documentação no Wiki

