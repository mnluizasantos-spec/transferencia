-- ============================================================================
-- Migração: entregar_em (Entregar em) e numero_remessa (Nº Remessa)
-- ============================================================================

-- Campo "Entregar em": Gráfica, Salto ou Flexíveis (todas as solicitações)
ALTER TABLE material_requests
ADD COLUMN IF NOT EXISTS entregar_em VARCHAR(50);

-- Valores permitidos (sem acento no banco para consistência) - idempotente
ALTER TABLE material_requests DROP CONSTRAINT IF EXISTS chk_entregar_em;
ALTER TABLE material_requests
ADD CONSTRAINT chk_entregar_em
CHECK (entregar_em IS NULL OR entregar_em IN ('Grafica', 'Salto', 'Flexiveis'));

-- Campo "Nº Remessa": preenchido pelo separador (principalmente para Flexíveis/Salto)
ALTER TABLE material_requests
ADD COLUMN IF NOT EXISTS numero_remessa VARCHAR(100);

COMMENT ON COLUMN material_requests.entregar_em IS 'Destino da entrega: Gráfica, Salto ou Flexíveis';
COMMENT ON COLUMN material_requests.numero_remessa IS 'Número da remessa preenchido pelo separador';
