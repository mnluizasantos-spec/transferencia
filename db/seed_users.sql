-- ============================================================================
-- Seed de Usuários Iniciais
-- ============================================================================
-- Admin, Separador e Solicitante: senha admin123 (hash bcrypt rounds=10).
-- Flexíveis e Salto: senhas distintas; ver db/SENHAS_INICIAIS.md (apenas os dois novos).

-- admin@antilhas.com (senha: admin123)
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'admin@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Administrador',
  'Administrador',
  'admin',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- separador@antilhas.com (senha: admin123)
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'separador@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Separador de Material',
  'Separador de Material',
  'separador',
  false
)
ON CONFLICT (email) DO NOTHING;

-- solicitante@antilhas.com (senha: admin123)
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'solicitante@antilhas.com',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Solicitante Teste',
  'Solicitante Teste',
  'solicitante',
  false
)
ON CONFLICT (email) DO NOTHING;

-- flexiveis@antilhas.com
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'flexiveis@antilhas.com',
  '$2a$10$QQIPLrCrf2qU.tdtYfop..9cuIFOpyyXcQ5PNmoRdZhFwU3Qis0oe',
  'Flexíveis',
  'Flexíveis',
  'solicitante',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- salto@antilhas.com
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'salto@antilhas.com',
  '$2a$10$eGuujbcgkJ0mj/LaZC/9GuNC.og7xLGmiB4tXqPFvSOB.RdwDgijG',
  'Salto',
  'Salto',
  'solicitante',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- Log da operação
INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)
VALUES (
  NULL,
  'seed_users',
  'users',
  '{"message": "Usuários iniciais criados", "count": 5}'::jsonb
);
