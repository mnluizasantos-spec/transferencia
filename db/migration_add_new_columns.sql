-- ============================================================================
-- MIGRAÇÃO: Adicionar novas colunas para material_requests
-- ============================================================================

-- Adicionar novas colunas
ALTER TABLE material_requests 
ADD COLUMN IF NOT EXISTS material_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS material_description TEXT,
ADD COLUMN IF NOT EXISTS unidade VARCHAR(20),
ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS production_start_date DATE;

-- Migrar dados existentes (se houver)
UPDATE material_requests 
SET 
  material_code = COALESCE(material_code, 'LEGACY-' || id::text),
  material_description = COALESCE(material_description, material),
  requester_name = COALESCE(requester_name, 'Usuário Legado'),
  deadline = COALESCE(deadline, prazo),
  production_start_date = COALESCE(production_start_date, inicio_producao),
  unidade = COALESCE(unidade, 'pc')
WHERE material_code IS NULL;

-- Tornar as novas colunas obrigatórias
ALTER TABLE material_requests 
ALTER COLUMN material_code SET NOT NULL,
ALTER COLUMN material_description SET NOT NULL,
ALTER COLUMN requester_name SET NOT NULL;

-- Criar índices para as novas colunas
CREATE INDEX IF NOT EXISTS idx_material_requests_code ON material_requests(material_code);
CREATE INDEX IF NOT EXISTS idx_material_requests_requester ON material_requests(requester_name);
CREATE INDEX IF NOT EXISTS idx_material_requests_deadline ON material_requests(deadline);

-- Comentários para documentação
COMMENT ON COLUMN material_requests.material_code IS 'Código único do material';
COMMENT ON COLUMN material_requests.material_description IS 'Descrição detalhada do material';
COMMENT ON COLUMN material_requests.unidade IS 'Unidade de medida (kg, pc, m, l, etc.)';
COMMENT ON COLUMN material_requests.requester_name IS 'Nome do solicitante';
COMMENT ON COLUMN material_requests.deadline IS 'Data limite para separação';
COMMENT ON COLUMN material_requests.production_start_date IS 'Data de início da produção';
