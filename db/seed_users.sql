-- ============================================================================
-- Seed de Usuários Iniciais
-- ============================================================================
-- IMPORTANTE: Altere as senhas padrão após o primeiro login!
-- Senha padrão para todos: admin123
-- Hash gerado com bcrypt rounds=10

-- Admin padrão
INSERT INTO users (email, password_hash, nome, role, ativo, force_password_change)
VALUES (
  'admin@antilhas.com',
  '$2a$10$rKQZxVZH7JVYvGQZ9xvHKOZ8c9zDXk6xR4xMQEp5xL8vYzKJvYvGS', -- admin123
  'Administrador do Sistema',
  'admin',
  true,
  true -- Forçar troca de senha no primeiro login
)
ON CONFLICT (email) DO NOTHING;

-- Separador padrão
INSERT INTO users (email, password_hash, nome, role, ativo, force_password_change)
VALUES (
  'separador@antilhas.com',
  '$2a$10$rKQZxVZH7JVYvGQZ9xvHKOZ8c9zDXk6xR4xMQEp5xL8vYzKJvYvGS', -- admin123
  'Separador de Material',
  'separador',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;

-- Solicitante padrão
INSERT INTO users (email, password_hash, nome, role, ativo, force_password_change)
VALUES (
  'solicitante@antilhas.com',
  '$2a$10$rKQZxVZH7JVYvGQZ9xvHKOZ8c9zDXk6xR4xMQEp5xL8vYzKJvYvGS', -- admin123
  'Solicitante Teste',
  'solicitante',
  true,
  true
)
ON CONFLICT (email) DO NOTHING;

-- Log da operação
INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)
VALUES (
  NULL,
  'seed_users',
  'users',
  '{"message": "Usuários iniciais criados", "count": 3}'::jsonb
);

