# Sistema de Transferência de Material Intercompany

Sistema completo para gerenciamento de solicitações de transferência de material entre empresas, com autenticação, auditoria completa e histórico de alterações.

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+ Modules)
- **Backend**: Netlify Edge Functions (Node.js)
- **Banco de Dados**: Neon PostgreSQL (Serverless)
- **Autenticação**: JWT (JSON Web Tokens)
- **Cloud**: Netlify + Neon + GitHub

## ✨ Funcionalidades

### Autenticação e Segurança
- ✅ Login com JWT
- ✅ Controle de acesso por roles (Admin, Separador, Solicitante)
- ✅ Proteção contra brute force (bloqueio após tentativas falhadas)
- ✅ Sessões rastreadas no banco de dados
- ✅ Soft delete para recuperação de dados

### Gerenciamento de Solicitações
- ✅ CRUD completo de solicitações
- ✅ Filtros por status, urgência e busca
- ✅ Indicadores visuais de prazo (atrasado, hoje, ok)
- ✅ Badges coloridos por status e urgência
- ✅ Seleção múltipla para impressão

### Auditoria e Histórico
- ✅ Log completo de todas as ações (audit_logs)
- ✅ Histórico detalhado de alterações por solicitação (request_history)
- ✅ Timeline visual de mudanças
- ✅ Rastreamento de quem fez cada alteração e quando

### Importação e Exportação
- ✅ Template Excel para download
- ✅ Validação de arquivo antes de importar
- ✅ Importação em massa com relatório de erros
- ✅ Rollback de importações

### Impressão
- ✅ Lista de separação com múltiplas solicitações
- ✅ Impressão individual de solicitação
- ✅ Layout otimizado para A4
- ✅ Checkboxes para: Separado, Conferido, Despachado

### Dashboard
- ✅ Estatísticas em tempo real
- ✅ Cards com totais: Total, Em Atraso, Vencem Hoje, Concluídos
- ✅ Visão filtrada por role do usuário

## 📁 Estrutura do Projeto

```
infra/
├── db/                          # Scripts de banco de dados
│   ├── schema.sql              # Schema completo
│   ├── seed_users.sql          # Usuários iniciais
│   ├── clear_all.sql           # Limpar dados (dev)
│   └── backup_policy.md        # Política de backup
├── netlify/
│   └── functions/              # API Endpoints
│       ├── auth.js             # Autenticação
│       ├── requests.js         # CRUD de solicitações
│       ├── dashboard.js        # Estatísticas
│       ├── history.js          # Histórico e auditoria
│       ├── users.js            # Gerenciamento de usuários
│       ├── import.js           # Importação Excel
│       ├── print.js            # Geração de PDF/HTML
│       ├── health.js           # Health check
│       └── utils/              # Utilitários
│           ├── db.js           # Conexão com banco
│           ├── logger.js       # Sistema de logs
│           ├── errorHandler.js # Tratamento de erros
│           ├── validators.js   # Validações
│           └── middleware.js   # Autenticação/Autorização
├── scripts/                    # Scripts auxiliares
│   ├── backup.js               # Backup automatizado
│   └── data_integrity_check.js # Verificação de integridade
├── web/                        # Frontend
│   ├── index.html              # Dashboard principal
│   ├── login.html              # Página de login
│   ├── css/
│   │   └── styles.css          # Estilos
│   └── js/
│       ├── auth.js             # Módulo de autenticação
│       └── api.js              # Client API
├── package.json                # Dependências
├── netlify.toml                # Configuração Netlify
└── README.md                   # Este arquivo
```

## 🛠️ Setup e Instalação

### 1. Pré-requisitos

- Node.js 18+
- Conta no [Neon](https://neon.tech) (banco de dados)
- Conta no [Netlify](https://netlify.com) (hosting)
- Git e GitHub

### 2. Configuração do Banco de Dados

1. Criar conta no Neon: https://neon.tech
2. Criar novo projeto
3. Copiar a CONNECTION_STRING
4. Executar o schema:
   ```bash
   psql $DATABASE_URL -f db/schema.sql
   ```
5. Criar usuários iniciais:
   ```bash
   psql $DATABASE_URL -f db/seed_users.sql
   ```

### 3. Configuração Local

```bash
# Clonar repositório
git clone <seu-repo>
cd infra

# Instalar dependências
npm install

# Criar arquivo .env (copiar de .env.example)
DATABASE_URL=postgres://...@neon.tech/database
JWT_SECRET=sua-chave-secreta-aqui
JWT_EXPIRES_IN=24h

# Testar localmente
netlify dev
```

### 4. Deploy na Netlify

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Inicializar projeto
netlify init

# Configurar variáveis de ambiente
netlify env:set DATABASE_URL "sua-connection-string"
netlify env:set JWT_SECRET "sua-chave-secreta"
netlify env:set JWT_EXPIRES_IN "24h"

# Deploy
netlify deploy --prod
```

## 👥 Usuários Padrão

Após executar `seed_users.sql`:

| Email | Senha | Role |
|-------|-------|------|
| admin@antilhas.com | admin123 | Admin |
| separador@antilhas.com | admin123 | Separador |
| solicitante@antilhas.com | admin123 | Solicitante |

⚠️ **IMPORTANTE**: Alterar senhas no primeiro login!

## 🔐 Roles e Permissões

### Admin
- ✅ Gerenciar usuários (criar, editar, desativar)
- ✅ Ver todas as solicitações
- ✅ Criar/editar/excluir qualquer solicitação
- ✅ Acessar logs de auditoria completos
- ✅ Importar em massa

### Separador
- ✅ Ver todas as solicitações
- ✅ Criar novas solicitações
- ✅ Editar status de solicitações
- ✅ Imprimir listas de separação
- ✅ Importar em massa

### Solicitante
- ✅ Ver apenas suas próprias solicitações
- ✅ Criar novas solicitações
- ✅ Editar suas solicitações (se não concluídas)
- ✅ Ver histórico de suas solicitações

## 📊 API Endpoints

### Autenticação
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Dados do usuário
- `POST /api/auth/register` - Criar usuário (admin)
- `PUT /api/auth/change-password` - Alterar senha

### Solicitações
- `GET /api/requests` - Listar com filtros
- `GET /api/requests/:id` - Buscar uma
- `POST /api/requests` - Criar
- `PUT /api/requests/:id` - Atualizar
- `DELETE /api/requests/:id` - Excluir (soft delete)

### Dashboard
- `GET /api/dashboard/stats` - Estatísticas
- `GET /api/dashboard/urgentes` - Lista de urgentes
- `GET /api/dashboard/trends` - Tendências

### Histórico
- `GET /api/history/:request_id` - Histórico de uma solicitação
- `GET /api/history/audit` - Logs de auditoria (admin)
- `GET /api/history/recent` - Atividades recentes

### Usuários
- `GET /api/users` - Listar (admin)
- `POST /api/users` - Criar (admin)
- `PUT /api/users/:id` - Atualizar
- `DELETE /api/users/:id` - Desativar (admin)

### Importação
- `GET /api/import/template` - Download template
- `POST /api/import/validate` - Validar arquivo
- `POST /api/import/execute` - Executar importação

### Impressão
- `POST /api/print/picking-list` - Lista de separação
- `POST /api/print/single` - Solicitação individual

### Health
- `GET /api/health` - Status do sistema

## 🔧 Scripts Úteis

```bash
# Backup completo
node scripts/backup.js --full

# Backup incremental
node scripts/backup.js

# Verificar integridade
node scripts/data_integrity_check.js

# Deploy
npm run deploy

# Desenvolvimento local
npm run dev
```

## 📝 Banco de Dados

### Tabelas Principais

- **users**: Usuários do sistema
- **material_requests**: Solicitações de material
- **request_history**: Histórico de alterações
- **audit_logs**: Logs completos de auditoria
- **sessions**: Sessões JWT ativas
- **import_batches**: Histórico de importações

### Backups

- Automático pelo Neon (30 dias de PITR)
- Exports semanais via GitHub Actions
- Veja `db/backup_policy.md` para detalhes

## 🚨 Troubleshooting

### Erro: "DATABASE_URL não configurada"
```bash
netlify env:set DATABASE_URL "sua-connection-string"
```

### Erro: "Token inválido" ou "Sessão expirada"
- Fazer logout e login novamente
- Verificar se JWT_SECRET está configurado

### Erro de conexão com banco
- Verificar se DATABASE_URL está correta
- Testar conexão: `node scripts/data_integrity_check.js`

### Importação falhando
- Verificar formato do Excel (usar template)
- Limite de 1000 linhas por vez
- Tamanho máximo: 5MB

## 📚 Documentação Adicional

- [DEPLOY.md](DEPLOY.md) - Guia detalhado de deploy
- [db/backup_policy.md](db/backup_policy.md) - Política de backup
- [DISASTER_RECOVERY.md](DISASTER_RECOVERY.md) - Recuperação de desastres

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

MIT License - veja LICENSE para detalhes

## 👨‍💻 Suporte

Em caso de problemas:
1. Verificar logs no Netlify
2. Executar `node scripts/data_integrity_check.js`
3. Consultar documentação
4. Abrir issue no GitHub

---

**Desenvolvido com ❤️ para Antilhas**

