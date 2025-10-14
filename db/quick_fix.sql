-- QUICK FIX: Adicionar colunas básicas para resolver erros 500
-- Execute este SQL no Neon para corrigir os erros imediatamente

-- Adicionar colunas básicas (se não existirem)
ALTER TABLE material_requests 
ADD COLUMN IF NOT EXISTS material_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS material_description TEXT,
ADD COLUMN IF NOT EXISTS unidade VARCHAR(20),
ADD COLUMN IF NOT EXISTS requester_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS deadline DATE,
ADD COLUMN IF NOT EXISTS production_start_date DATE;

-- Preencher dados básicos para evitar NULL
UPDATE material_requests 
SET 
  material_code = COALESCE(material_code, 'LEGACY-' || id::text),
  material_description = COALESCE(material_description, COALESCE(material, 'Material Legado')),
  requester_name = COALESCE(requester_name, 'Usuário Legado'),
  deadline = COALESCE(deadline, prazo),
  production_start_date = COALESCE(production_start_date, inicio_producao),
  unidade = COALESCE(unidade, 'pc')
WHERE material_code IS NULL;

-- Tornar colunas obrigatórias
ALTER TABLE material_requests 
ALTER COLUMN material_code SET NOT NULL,
ALTER COLUMN material_description SET NOT NULL,
ALTER COLUMN requester_name SET NOT NULL;
