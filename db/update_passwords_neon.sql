-- ============================================================================
-- Atualizar senhas Flexíveis e Salto no Neon (bcrypt rounds=10)
-- Execute este script no Neon para que os logins flexiveis@antilhas.com e salto@antilhas.com funcionem.
-- ============================================================================

-- Flexíveis
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

-- Salto
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
