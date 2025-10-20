-- ============================================================================
-- Script Completo de Recriação do Schema
-- Sistema de Transferência de Material Intercompany
-- ============================================================================
-- ATENÇÃO: Este script APAGA TODOS OS DADOS e recria o schema do zero!
-- Use apenas em ambiente de desenvolvimento ou para reset completo.
-- ============================================================================

-- PASSO 1: DROPAR TODAS AS TABELAS EXISTENTES
-- ============================================================================
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS request_history CASCADE;
DROP TABLE IF EXISTS import_batches CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS material_requests CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS schema_migrations CASCADE;

-- PASSO 2: RECRIAR SCHEMA COMPLETO
-- ============================================================================

-- Tabela de rastreamento de migrations
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description TEXT NOT NULL
);

-- ============================================================================
-- TABELA DE USUÁRIOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'separador', 'solicitante')),
  force_password_change BOOLEAN DEFAULT false,
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABELA DE SOLICITAÇÕES DE MATERIAL
-- ============================================================================
CREATE TABLE IF NOT EXISTS material_requests (
  id SERIAL PRIMARY KEY,
  material_code VARCHAR(100) NOT NULL,
  material_description TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  unidade VARCHAR(20),
  requester_name VARCHAR(255) NOT NULL,
  justificativa TEXT,
  urgencia VARCHAR(20) DEFAULT 'Normal' CHECK (urgencia IN ('Urgente', 'Normal')),
  status VARCHAR(50) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Separação', 'Concluído', 'Cancelado')),
  deadline DATE,
  production_start_date DATE,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Índices para material_requests
CREATE INDEX idx_material_requests_status ON material_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_requests_urgencia ON material_requests(urgencia) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_requests_created_by ON material_requests(created_by);

-- ============================================================================
-- TABELA DE HISTÓRICO DE ALTERAÇÕES
-- ============================================================================
CREATE TABLE IF NOT EXISTS request_history (
  id SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES material_requests(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  campo_alterado VARCHAR(100) NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  acao VARCHAR(50) NOT NULL CHECK (acao IN ('criado', 'atualizado', 'status_mudado', 'concluído', 'cancelado')),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para request_history
CREATE INDEX idx_request_history_request ON request_history(request_id);
CREATE INDEX idx_request_history_user ON request_history(user_id);
CREATE INDEX idx_request_history_timestamp ON request_history(timestamp DESC);

-- ============================================================================
-- TABELA DE LOGS DE AUDITORIA
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  acao VARCHAR(100) NOT NULL,
  tabela_afetada VARCHAR(100),
  registro_id INTEGER,
  detalhes_json JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para audit_logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_acao ON audit_logs(acao);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_tabela_registro ON audit_logs(tabela_afetada, registro_id);

-- ============================================================================
-- TABELA DE IMPORTAÇÕES EM LOTE
-- ============================================================================
CREATE TABLE IF NOT EXISTS import_batches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  success_rows INTEGER DEFAULT 0,
  error_rows INTEGER DEFAULT 0,
  errors_json JSONB,
  status VARCHAR(20) NOT NULL CHECK (status IN ('processing', 'completed', 'failed', 'rolled_back')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  rolled_back_at TIMESTAMP
);

-- Índice para import_batches
CREATE INDEX idx_import_batches_user ON import_batches(user_id);
CREATE INDEX idx_import_batches_status ON import_batches(status);
CREATE INDEX idx_import_batches_created ON import_batches(created_at DESC);

-- ============================================================================
-- TABELA DE SESSÕES
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Índices para sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token_hash);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para atualizar updated_at automaticamente em users
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- Trigger para atualizar updated_at automaticamente em material_requests
CREATE OR REPLACE FUNCTION update_material_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_material_requests_updated_at
    BEFORE UPDATE ON material_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_material_requests_updated_at();

-- Trigger para definir completed_at quando status muda para Concluído
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'Concluído' AND OLD.status != 'Concluído' THEN
        NEW.completed_at = CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_completed_at
    BEFORE UPDATE ON material_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- ============================================================================
-- INSERÇÃO DA MIGRATION INICIAL
-- ============================================================================
INSERT INTO schema_migrations (version, description) 
VALUES (1, 'Initial schema with users, requests, history, audit, imports, sessions')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- PASSO 3: SEED DE USUÁRIOS INICIAIS
-- ============================================================================
-- Senha padrão para todos: admin123

-- Admin padrão
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'admin@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Administrador',
  'Administrador',
  'admin',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- Separador padrão
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'separador@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Separador de Material',
  'Separador de Material',
  'separador',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Solicitante padrão
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'solicitante@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Solicitante Teste',
  'Solicitante Teste',
  'solicitante',
  false
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- FIM DO SCRIPT
-- ============================================================================












