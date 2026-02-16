-- ============================================================================
-- Seed de Usuários Iniciais
-- ============================================================================
-- Senhas: admin=admin123, separador=sep@rador@ntilhas, solicitante=solicit@m@t,
--         flexiveis=Flexiveis#2025, salto=Salto#2025. Hashes bcrypt rounds=10.

-- admin@antilhas.com (senha: admin123)
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'admin@antilhas.com',
  '$2a$10$r2LUHAIVJYV/ge63o0Gscev7xZcv0LbyUkUVImgHqaztFBV4KEHz6',
  'Administrador',
  'Administrador',
  'admin',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- separador@antilhas.com (senha: sep@rador@ntilhas)
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'separador@antilhas.com',
  '$2a$10$LjfIF3saStpQPkARIXl73OR8SiGNqfsBSy92VXA7.ynYijshLsMti',
  'Separador de Material',
  'Separador de Material',
  'separador',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- solicitante@antilhas.com (senha: solicit@m@t) – perfil Gráfica
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'solicitante@antilhas.com',
  '$2a$10$Ymoz.CK6mIO6X6db7o5X.u/GNuA7Tpi9lbiml2JB//Ysn8MFCa0ru',
  'Gráfica',
  'Gráfica',
  'solicitante',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- flexiveis@antilhas.com (senha: Flexiveis#2025)
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'flexiveis@antilhas.com',
  '$2a$10$qn7bUTJfPWVE.4Ds8zw81ux0hoDSwrK5sLBdHAMF89KnVV6KNwAqS',
  'Flexíveis',
  'Flexíveis',
  'solicitante',
  false
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  nome = EXCLUDED.nome,
  name = EXCLUDED.name;

-- salto@antilhas.com (senha: Salto#2025)
INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
VALUES (
  'salto@antilhas.com',
  '$2a$10$Xf.ZJXdggKylI5XXL9sWeuZPtF66AVC3f4v8PW3B69RQltt0c7fmS',
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
VALUES (NULL, 'seed_users', 'users', '{"message": "Usuários iniciais criados", "count": 5}'::jsonb);
