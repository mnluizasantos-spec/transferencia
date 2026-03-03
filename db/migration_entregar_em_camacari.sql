-- ============================================================================
-- Migração: incluir destino Camacari em entregar_em
-- ============================================================================

-- Atualiza a constraint de valores permitidos para incluir o novo destino lógico "Camacari"
ALTER TABLE material_requests DROP CONSTRAINT IF EXISTS chk_entregar_em;
ALTER TABLE material_requests
ADD CONSTRAINT chk_entregar_em
CHECK (entregar_em IS NULL OR entregar_em IN ('Grafica', 'Salto', 'Flexiveis', 'Camacari'));

-- Atualiza comentário da coluna para refletir o novo destino
COMMENT ON COLUMN material_requests.entregar_em IS 'Destino da entrega: Gráfica, Salto, Flexíveis ou Camaçari';

