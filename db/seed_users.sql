-- ============================================================================
-- Seed de Usuários Iniciais
-- ============================================================================
-- IMPORTANTE: Altere as senhas padrão após o primeiro login!
-- Senha padrão para todos: admin123
-- Hash gerado com bcrypt rounds=10

-- Admin padrão
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'admin@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
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
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
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
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
  'Solicitante Teste',
  'Solicitante Teste',
  'solicitante',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Solicitante Flexíveis
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'flexiveis@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
  'Flexíveis',
  'Flexíveis',
  'solicitante',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Solicitante Salto
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'salto@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- admin123
  'Salto',
  'Salto',
  'solicitante',
  false
)
ON CONFLICT (email) DO NOTHING;

-- Log da operação
INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)
VALUES (
  NULL,
  'seed_users',
  'users',
  '{"message": "Usuários iniciais criados", "count": 5}'::jsonb
);

