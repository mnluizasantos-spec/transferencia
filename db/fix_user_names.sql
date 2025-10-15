-- ============================================================================
-- Fix User Names - Sincronizar campos name e nome
-- ============================================================================
-- Este script sincroniza os campos 'name' e 'nome' na tabela users
-- para garantir consistência entre JWT e filtros de requisições

-- Sincronizar: definir 'name' = 'nome' onde 'name' está NULL ou vazio
UPDATE users 
SET name = nome 
WHERE name IS NULL OR name = '';

-- Log da operação
INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)
VALUES (
  NULL,
  'fix_user_names',
  'users',
  '{"message": "Campos name sincronizados com nome", "timestamp": "' || CURRENT_TIMESTAMP || '"}'::jsonb
);

-- Verificar resultado
SELECT 
  id, 
  email, 
  nome, 
  name, 
  role,
  CASE 
    WHEN name = nome THEN 'Sincronizado' 
    ELSE 'Inconsistente' 
  END as status
FROM users 
ORDER BY id;
