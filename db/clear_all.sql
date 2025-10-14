-- ============================================================================
-- Script para Limpar Todas as Tabelas
-- ============================================================================
-- ATENÇÃO: Este script remove TODOS os dados do banco de dados!
-- Use apenas em ambiente de desenvolvimento/teste!
-- ============================================================================

-- Desabilitar triggers temporariamente
SET session_replication_role = replica;

-- Limpar dados em ordem reversa de dependências
TRUNCATE TABLE sessions CASCADE;
TRUNCATE TABLE import_batches CASCADE;
TRUNCATE TABLE audit_logs CASCADE;
TRUNCATE TABLE request_history CASCADE;
TRUNCATE TABLE material_requests CASCADE;
TRUNCATE TABLE users CASCADE;

-- Resetar sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE material_requests_id_seq RESTART WITH 1;
ALTER SEQUENCE request_history_id_seq RESTART WITH 1;
ALTER SEQUENCE audit_logs_id_seq RESTART WITH 1;
ALTER SEQUENCE import_batches_id_seq RESTART WITH 1;
ALTER SEQUENCE sessions_id_seq RESTART WITH 1;

-- Reabilitar triggers
SET session_replication_role = DEFAULT;

-- Log da operação
INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)
VALUES (
  NULL,
  'clear_all_data',
  'all',
  jsonb_build_object(
    'message', 'Todas as tabelas foram limpas',
    'timestamp', CURRENT_TIMESTAMP
  )
);

SELECT 'Banco de dados limpo com sucesso!' as result;

