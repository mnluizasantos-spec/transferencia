-- ============================================================================
-- Sistema de Transferência de Material Intercompany
-- Schema Principal - PostgreSQL/Neon
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
  nome VARCHAR(255) NOT NULL, -- Campo principal para nome
  name VARCHAR(255), -- Campo alternativo (usado pelo JWT/auth)
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'separador', 'solicitante')),
  -- NOTA: Coluna 'ativo' removida - controle de status via deleted_at
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
  -- Campos legados (mantidos para compatibilidade)
  material TEXT, -- DEPRECATED: usar material_code + material_description
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  justificativa TEXT,
  solicitante_id INTEGER REFERENCES users(id), -- DEPRECATED: usar requester_name
  prazo DATE, -- DEPRECATED: usar deadline
  inicio_producao DATE, -- DEPRECATED: usar production_start_date
  -- Novos campos (estrutura atual)
  material_code VARCHAR(100) NOT NULL,
  material_description TEXT NOT NULL,
  unidade VARCHAR(20),
  requester_name VARCHAR(255) NOT NULL,
  deadline DATE,
  production_start_date DATE,
  urgencia VARCHAR(20) DEFAULT 'Normal' CHECK (urgencia IN ('Urgente', 'Normal')),
  status VARCHAR(50) DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Em Separação', 'Concluído', 'Cancelado')),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  deleted_at TIMESTAMP
);

-- Índices para material_requests
CREATE INDEX idx_material_requests_status ON material_requests(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_requests_urgencia ON material_requests(urgencia) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_requests_prazo ON material_requests(prazo) WHERE deleted_at IS NULL AND status != 'Concluído';
CREATE INDEX idx_material_requests_solicitante ON material_requests(solicitante_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_material_requests_material ON material_requests(material) WHERE deleted_at IS NULL;
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
-- TABELA DE SESSÕES (para controle adicional de JWT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  -- NOTA: Coluna 'revoked_at' removida - não existe no banco real
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

-- Trigger para limpar sessões expiradas (limpeza automática)
CREATE OR REPLACE FUNCTION clean_expired_sessions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM sessions 
    WHERE expires_at < CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS ÚTEIS
-- ============================================================================

-- View de solicitações ativas com informações do solicitante
CREATE OR REPLACE VIEW v_active_requests AS
SELECT 
    mr.id,
    mr.material,
    mr.quantidade,
    mr.justificativa,
    mr.urgencia,
    mr.prazo,
    mr.inicio_producao,
    mr.status,
    mr.created_at,
    mr.updated_at,
    mr.completed_at,
    u_solicitante.nome as solicitante_nome,
    u_solicitante.email as solicitante_email,
    u_creator.nome as criado_por_nome,
    CASE 
        WHEN mr.prazo IS NULL THEN 'sem_prazo'
        WHEN mr.prazo < CURRENT_DATE AND mr.status != 'Concluído' THEN 'atrasado'
        WHEN mr.prazo = CURRENT_DATE AND mr.status != 'Concluído' THEN 'vence_hoje'
        ELSE 'no_prazo'
    END as prazo_status,
    CASE 
        WHEN mr.prazo IS NOT NULL THEN mr.prazo - CURRENT_DATE
        ELSE NULL
    END as dias_restantes
FROM material_requests mr
JOIN users u_solicitante ON mr.solicitante_id = u_solicitante.id
JOIN users u_creator ON mr.created_by = u_creator.id
WHERE mr.deleted_at IS NULL;

-- View de estatísticas do dashboard
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_solicitacoes,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND prazo < CURRENT_DATE AND status != 'Concluído') as em_atraso,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND prazo = CURRENT_DATE AND status != 'Concluído') as vence_hoje,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Concluído') as concluidos,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Pendente') as pendentes,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND status = 'Em Separação') as em_separacao,
    COUNT(*) FILTER (WHERE deleted_at IS NULL AND urgencia = 'Urgente' AND status != 'Concluído') as urgentes
FROM material_requests;

-- ============================================================================
-- INSERÇÃO DA MIGRATION INICIAL
-- ============================================================================
INSERT INTO schema_migrations (version, description) 
VALUES (1, 'Initial schema with users, requests, history, audit, imports, sessions')
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- COMENTÁRIOS NAS TABELAS
-- ============================================================================
COMMENT ON TABLE users IS 'Usuários do sistema com autenticação e controle de acesso';
COMMENT ON TABLE material_requests IS 'Solicitações de transferência de material intercompany';
COMMENT ON TABLE request_history IS 'Histórico detalhado de todas as alterações em solicitações';
COMMENT ON TABLE audit_logs IS 'Log completo de auditoria de todas as ações do sistema';
COMMENT ON TABLE import_batches IS 'Registro de importações em massa via Excel';
COMMENT ON TABLE sessions IS 'Controle de sessões JWT ativas';
COMMENT ON TABLE schema_migrations IS 'Rastreamento de versões do schema do banco';

