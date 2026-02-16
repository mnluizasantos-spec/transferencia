-- ============================================================================
-- Atualizar solicitações sem "Entregar em" para Gráfica
-- ============================================================================
-- Executar no Neon SQL Editor (ou via script) para padronizar registros antigos.

UPDATE material_requests
SET entregar_em = 'Grafica'
WHERE entregar_em IS NULL
  AND deleted_at IS NULL;
