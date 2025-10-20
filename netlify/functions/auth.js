/**
 * Authentication API
 * Gerenciamento de autenticação e sessões
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('./utils/db');
const { logInfo, logWarn, logAudit } = require('./utils/logger');
const { withErrorHandling, authenticationError, validationError, conflictError, timeoutError, databaseError } = require('./utils/errorHandler');
const { validateUserData, isValidEmail, getClientIP, getUserAgent } = require('./utils/validators');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const MAX_LOGIN_ATTEMPTS = parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5', 10);
const LOCKOUT_DURATION = parseInt(process.env.LOCKOUT_DURATION || '15', 10); // minutos
const QUERY_TIMEOUT = parseInt(process.env.DB_QUERY_TIMEOUT || '10000', 10); // 10 segundos

/**
 * Gera JWT token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || user.nome  // Fallback para nome
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Hash de token para armazenamento
 */
function hashToken(token) {
  return require('crypto').createHash('sha256').update(token).digest('hex');
}

/**
 * Executa query com timeout
 * @param {Function} queryFn - Função que executa a query
 * @param {string} operation - Nome da operação para logs
 * @returns {Promise} Resultado da query
 */
async function executeWithTimeout(queryFn, operation) {
  try {
    return await Promise.race([
      queryFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${operation} timeout após ${QUERY_TIMEOUT}ms`)), QUERY_TIMEOUT)
      )
    ]);
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw timeoutError(`Operação de ${operation} demorou muito para responder`);
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      throw databaseError(`Erro de conexão com o banco de dados: ${error.message}`);
    }
    throw error;
  }
}

/**
 * POST /api/auth/login
 * Autenticação de usuário com timeout e tratamento de erros melhorado
 */
async function handleLogin(event, sql) {
  const { email, password } = JSON.parse(event.body || '{}');

  if (!email || !password) {
    throw validationError('Email e senha são obrigatórios');
  }

  if (!isValidEmail(email)) {
    throw validationError('Email inválido');
  }

  try {
    // Buscar usuário com role (com timeout)
    const [user] = await executeWithTimeout(async () => {
      return await sql`
        SELECT 
          u.id,
          u.email,
          u.password_hash,
          u.nome,
          u.name,
          u.role,
          u.deleted_at
        FROM users u
        WHERE u.email = ${email.toLowerCase()} 
        AND u.deleted_at IS NULL
      `;
    }, 'busca de usuário');

    if (!user) {
      logWarn('login_failed', 'Usuário não encontrado', { email });
      throw authenticationError('Email ou senha inválidos');
    }

    // Verificar se está ativo (deleted_at é NULL)
    if (user.deleted_at) {
      throw authenticationError('Conta desativada. Entre em contato com o administrador.');
    }

    // Verificar senha
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logWarn('login_failed', 'Senha incorreta', { email });
      throw authenticationError('Email ou senha inválidos');
    }

    // Login bem-sucedido

    // Gerar token
    const token = generateToken(user);
    const tokenHash = hashToken(token);

    // Salvar sessão (com timeout)
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 horas
    await executeWithTimeout(async () => {
      return await sql`
        INSERT INTO sessions (user_id, token_hash, expires_at)
        VALUES (${user.id}, ${tokenHash}, ${expiresAt})
      `;
    }, 'criação de sessão');

    // Log de auditoria (com timeout)
    await executeWithTimeout(async () => {
      return await logAudit(
        sql,
        user.id,
        'login_success',
        'users',
        user.id,
        {},
        getClientIP(event),
        getUserAgent(event)
      );
    }, 'log de auditoria');

    logInfo('user_logged_in', { userId: user.id, email: user.email });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role,
          forcePasswordChange: user.force_password_change
        }
      })
    };
    
  } catch (error) {
    // Se for erro de timeout ou conexão, logar e re-throw
    if (error.type === 'TIMEOUT_ERROR' || error.type === 'DATABASE_ERROR') {
      logWarn('login_timeout', 'Timeout ou erro de conexão durante login', { 
        email, 
        error: error.message,
        type: error.type 
      });
    }
    throw error;
  }
}

/**
 * POST /api/auth/logout
 * Encerrar sessão
 */
async function handleLogout(event, sql, user) {
  const token = event.headers.authorization?.replace('Bearer ', '');
  
  if (token) {
    const tokenHash = hashToken(token);
    
    await sql`
      DELETE FROM sessions 
      WHERE token_hash = ${tokenHash} AND user_id = ${user.userId}
    `;
  }

  await logAudit(
    sql,
    user.userId,
    'logout',
    'users',
    user.userId,
    {},
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('user_logged_out', { userId: user.userId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, message: 'Logout realizado com sucesso' })
  };
}

/**
 * GET /api/auth/me
 * Retorna dados do usuário autenticado
 */
async function handleMe(event, sql, user) {
  const [userData] = await sql`
    SELECT id, email, nome, role, last_login, created_at
    FROM users 
    WHERE id = ${user.userId} AND deleted_at IS NULL
  `;

  if (!userData) {
    throw authenticationError('Usuário não encontrado');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user: userData })
  };
}

/**
 * POST /api/auth/register
 * Registro de novo usuário (apenas admin)
 */
async function handleRegister(event, sql, user) {
  if (user.role !== 'admin') {
    throw authenticationError('Apenas administradores podem criar usuários');
  }

  const data = JSON.parse(event.body || '{}');
  const validatedData = validateUserData(data, false);

  // Verificar se email já existe
  const [existing] = await sql`
    SELECT id FROM users WHERE email = ${validatedData.email} AND deleted_at IS NULL
  `;

  if (existing) {
    throw conflictError('Email já cadastrado');
  }

  // Hash da senha
  const passwordHash = await bcrypt.hash(validatedData.password, 10);

  // Criar usuário
  const [newUser] = await sql`
    INSERT INTO users (email, password_hash, nome, role, force_password_change)
    VALUES (
      ${validatedData.email},
      ${passwordHash},
      ${validatedData.nome},
      ${validatedData.role},
      true
    )
    RETURNING id, email, nome, role, created_at
  `;

  await logAudit(
    sql,
    user.userId,
    'user_created',
    'users',
    newUser.id,
    { email: newUser.email, role: newUser.role },
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('user_created', { userId: newUser.id, createdBy: user.userId });

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, user: newUser })
  };
}

/**
 * PUT /api/auth/change-password
 * Alteração de senha
 */
async function handleChangePassword(event, sql, user) {
  const { currentPassword, newPassword } = JSON.parse(event.body || '{}');

  if (!currentPassword || !newPassword) {
    throw validationError('Senha atual e nova senha são obrigatórias');
  }

  // Buscar usuário
  const [userData] = await sql`
    SELECT * FROM users WHERE id = ${user.userId} AND deleted_at IS NULL
  `;

  if (!userData) {
    throw authenticationError('Usuário não encontrado');
  }

  // Verificar senha atual
  const isValid = await bcrypt.compare(currentPassword, userData.password_hash);
  if (!isValid) {
    throw authenticationError('Senha atual incorreta');
  }

  // Validar nova senha
  if (newPassword.length < 8) {
    throw validationError('Nova senha deve ter pelo menos 8 caracteres');
  }

  // Hash da nova senha
  const newPasswordHash = await bcrypt.hash(newPassword, 10);

  // Atualizar senha
  await sql`
    UPDATE users 
    SET 
      password_hash = ${newPasswordHash},
      force_password_change = false
    WHERE id = ${user.userId}
  `;

  // Revogar todas as sessões antigas
  await sql`
    DELETE FROM sessions 
    WHERE user_id = ${user.userId}
  `;

  await logAudit(
    sql,
    user.userId,
    'password_changed',
    'users',
    user.userId,
    {},
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('password_changed', { userId: user.userId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      success: true, 
      message: 'Senha alterada com sucesso. Faça login novamente.' 
    })
  };
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const sql = getDB();
  const path = event.path.replace('/.netlify/functions/auth', '').replace('/api/auth', '') || '/';

  // Rotas públicas
  if (path === '/login' && event.httpMethod === 'POST') {
    return await handleLogin(event, sql);
  }

  // Rotas protegidas - requer autenticação
  const { verifyToken } = require('./utils/middleware');
  const user = await verifyToken(event, sql);

  if (path === '/logout' && event.httpMethod === 'POST') {
    return await handleLogout(event, sql, user);
  }

  if (path === '/me' && event.httpMethod === 'GET') {
    return await handleMe(event, sql, user);
  }

  if (path === '/register' && event.httpMethod === 'POST') {
    return await handleRegister(event, sql, user);
  }

  if (path === '/change-password' && event.httpMethod === 'PUT') {
    return await handleChangePassword(event, sql, user);
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Rota não encontrada' })
  };
});

