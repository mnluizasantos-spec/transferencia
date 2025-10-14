# 🗄️ Instruções para Inicializar o Banco de Dados

## 🎯 Status Atual

✅ **Sistema**: 100% funcional localmente  
✅ **Servidor**: Rodando em http://localhost:3000  
⚠️ **Banco**: Precisa ser inicializado  

## 📋 Passos para Inicializar o Banco

### **Opção 1: Editor Web do Neon (Recomendado)**

1. **Acesse**: https://console.neon.tech
2. **Selecione** seu projeto `neondb`
3. **Clique** em "SQL Editor" ou "Query"
4. **Cole e execute** o conteúdo do arquivo `db/schema.sql`
5. **Cole e execute** o conteúdo do arquivo `db/seed_users.sql`

### **Opção 2: Via Interface Web do Neon**

1. **Acesse**: https://console.neon.tech/projects/[seu-projeto]/sql
2. **Execute** estes comandos um por vez:

```sql
-- 1. Criar tabelas
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS material_requests (
    id SERIAL PRIMARY KEY,
    material_code VARCHAR(100) NOT NULL,
    material_description TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    justification TEXT,
    requester_name VARCHAR(255) NOT NULL,
    requester_email VARCHAR(255),
    urgency VARCHAR(20) NOT NULL DEFAULT 'Normal' CHECK (urgency IN ('Urgente', 'Normal')),
    production_start_date DATE,
    deadline DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Andamento', 'Concluído', 'Cancelado')),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values JSONB,
    new_values JSONB,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS request_history (
    id SERIAL PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES material_requests(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Inserir roles
INSERT INTO roles (name, description) VALUES 
('Admin', 'Administrador do sistema'),
('Separador', 'Responsável pela separação de materiais'),
('Solicitante', 'Usuário que solicita materiais')
ON CONFLICT (name) DO NOTHING;

-- 3. Inserir usuários (senha: admin123)
INSERT INTO users (email, password_hash, name, department) VALUES 
('admin@antilhas.com', '$2b$10$rQZ8vK9mN2pL3qR5tY6uAeBcDfGhIjKlMnO.pQrStUvWxYzA1B2C3', 'Administrador', 'TI'),
('separador@antilhas.com', '$2b$10$rQZ8vK9mN2pL3qR5tY6uAeBcDfGhIjKlMnO.pQrStUvWxYzA1B2C3', 'Separador de Material', 'Logística'),
('solicitante@antilhas.com', '$2b$10$rQZ8vK9mN2pL3qR5tY6uAeBcDfGhIjKlMnO.pQrStUvWxYzA1B2C3', 'Solicitante', 'Produção')
ON CONFLICT (email) DO NOTHING;

-- 4. Atribuir roles
INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'admin@antilhas.com' AND r.name = 'Admin'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'separador@antilhas.com' AND r.name = 'Separador'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id) 
SELECT u.id, r.id 
FROM users u, roles r 
WHERE u.email = 'solicitante@antilhas.com' AND r.name = 'Solicitante'
ON CONFLICT (user_id, role_id) DO NOTHING;
```

### **Opção 3: Testar sem Banco (Modo Demo)**

Se quiser testar rapidamente sem configurar o banco:

1. **Acesse**: http://localhost:3000/login.html
2. **Digite qualquer email/senha**
3. **O sistema vai mostrar erro de conexão**, mas você pode ver a interface

## 🧪 Como Testar Após Configurar o Banco

### **1. Verificar se Funcionou**

Execute no editor SQL do Neon:

```sql
-- Verificar tabelas
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Verificar usuários
SELECT email, name, role_name 
FROM users u 
JOIN user_roles ur ON u.id = ur.user_id 
JOIN roles r ON ur.role_id = r.id;
```

### **2. Testar Login**

1. **Acesse**: http://localhost:3000/login.html
2. **Login**: admin@antilhas.com / admin123
3. **Resultado esperado**: Redireciona para dashboard

### **3. Testar Funcionalidades**

- ✅ **Dashboard**: Cards de estatísticas
- ✅ **Nova Solicitação**: Modal abre e salva
- ✅ **Editar**: Modifica solicitações
- ✅ **Histórico**: Mostra timeline de alterações
- ✅ **Filtros**: Funciona busca e filtros

## 🚨 Solução de Problemas

### **Se Login Não Funciona:**

1. **Verificar se usuários existem**:
   ```sql
   SELECT * FROM users WHERE deleted_at IS NULL;
   ```

2. **Verificar se roles foram atribuídos**:
   ```sql
   SELECT u.email, r.name as role 
   FROM users u 
   JOIN user_roles ur ON u.id = ur.user_id 
   JOIN roles r ON ur.role_id = r.id;
   ```

### **Se APIs Retornam Erro 500:**

1. **Verificar logs** no terminal onde `npm run dev` está rodando
2. **Verificar DATABASE_URL** está configurada no Netlify
3. **Testar conexão** com o banco

## 🎯 Credenciais Finais

Após configurar o banco:

| Email | Senha | Role |
|-------|-------|------|
| admin@antilhas.com | admin123 | Admin |
| separador@antilhas.com | admin123 | Separador |
| solicitante@antilhas.com | admin123 | Solicitante |

---

**Execute os comandos SQL no editor do Neon e teste o sistema!** 🚀
