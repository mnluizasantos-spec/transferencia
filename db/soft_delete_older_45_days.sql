-- ============================================================================
-- Soft delete: solicitações com created_at há mais de 45 dias
-- Executar no Neon (ou cliente SQL) conectado ao mesmo banco do Netlify.
-- ============================================================================

-- Opcional: ver quantas linhas serão afetadas antes
-- SELECT COUNT(*) FROM material_requests WHERE deleted_at IS NULL AND created_at::date < current_date - 45;

UPDATE material_requests
SET deleted_at = CURRENT_TIMESTAMP
WHERE deleted_at IS NULL
  AND created_at::date < current_date - 45;

-- Opcional: ver quantas foram atualizadas (rodar após o UPDATE, no mesmo cliente)
-- SELECT COUNT(*) FROM material_requests WHERE deleted_at IS NOT NULL;
