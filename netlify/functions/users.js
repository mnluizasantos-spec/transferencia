/**
 * Users API
 * Gerenciamento de usuários (apenas admin)
 */

const bcrypt = require('bcryptjs');
const { getDB } = require('./utils/db');
const { withErrorHandling, notFoundError, conflictError } = require('./utils/errorHandler');
const { verifyToken, requireAdmin, requireOwnerOrAdmin } = require('./utils/middleware');
const { validateUserData, getClientIP, getUserAgent } = require('./utils/validators');
const { logInfo, logAudit } = require('./utils/logger');

/**
 * GET /api/users
 * Lista todos os usuários (apenas admin)
 */
async function handleList(event, sql, user) {
  requireAdmin(user);

  const params = event.queryStringParameters || {};
  const role = params.role || null;
  const ativo = params.ativo !== undefined ? params.ativo === 'true' : null;

  let query = sql`
    SELECT 
      id, email, nome, role, ativo, last_login, created_at, updated_at
    FROM users
    WHERE deleted_at IS NULL
  `;

  if (role) {
    query = sql`${query} AND role = ${role}`;
  }

  if (ativo !== null) {
    query = sql`${query} AND ativo = ${ativo}`;
  }

  query = sql`${query} ORDER BY created_at DESC`;

  const users = await query;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(users)
  };
}

/**
 * GET /api/users/:id
 * Busca um usuário específico
 */
async function handleGet(event, sql, user) {
  const targetId = parseInt(event.path.split('/').pop(), 10);

  // Verificar permissão
  requireOwnerOrAdmin(user, targetId);

  const [userData] = await sql`
    SELECT 
      id, email, nome, role, ativo, last_login, failed_login_attempts, created_at, updated_at
    FROM users
    WHERE id = ${targetId} AND deleted_at IS NULL
  `;

  if (!userData) {
    throw notFoundError('Usuário');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  };
}

/**
 * POST /api/users
 * Cria novo usuário (apenas admin)
 */
async function handleCreate(event, sql, user) {
  requireAdmin(user);

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
    INSERT INTO users (email, password_hash, nome, role, ativo, force_password_change)
    VALUES (${validatedData.email}, ${passwordHash}, ${validatedData.nome}, ${validatedData.role}, true, true)
    RETURNING id, email, nome, role, ativo, created_at
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
    body: JSON.stringify(newUser)
  };
}

/**
 * PUT /api/users/:id
 * Atualiza usuário (admin ou próprio usuário)
 */
async function handleUpdate(event, sql, user) {
  const targetId = parseInt(event.path.split('/').pop(), 10);
  const data = JSON.parse(event.body || '{}');

  // Verificar se usuário existe
  const [existingUser] = await sql`
    SELECT * FROM users WHERE id = ${targetId} AND deleted_at IS NULL
  `;

  if (!existingUser) {
    throw notFoundError('Usuário');
  }

  // Verificar permissão
  requireOwnerOrAdmin(user, targetId);

  // Usuários normais só podem alterar alguns campos
  let allowedFields = ['nome'];
  if (user.role === 'admin') {
    allowedFields = ['nome', 'email', 'role', 'ativo'];
  }

  // Filtrar apenas campos permitidos
  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Nenhum campo válido para atualizar' })
    };
  }

  // Validar dados
  const validatedData = validateUserData(updateData, true);

  // Verificar conflito de email se estiver sendo alterado
  if (validatedData.email && validatedData.email !== existingUser.email) {
    const [emailExists] = await sql`
      SELECT id FROM users WHERE email = ${validatedData.email} AND id != ${targetId} AND deleted_at IS NULL
    `;

    if (emailExists) {
      throw conflictError('Email já cadastrado para outro usuário');
    }
  }

  // Atualizar
  const setClauses = Object.entries(validatedData)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k} = '${v}'`)
    .join(', ');

  if (!setClauses) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Nenhum dado para atualizar' })
    };
  }

  const [updated] = await sql`
    UPDATE users
    SET ${sql(validatedData)}
    WHERE id = ${targetId}
    RETURNING id, email, nome, role, ativo, updated_at
  `;

  await logAudit(
    sql,
    user.userId,
    'user_updated',
    'users',
    targetId,
    validatedData,
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('user_updated', { userId: targetId, updatedBy: user.userId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  };
}

/**
 * DELETE /api/users/:id
 * Soft delete de usuário (apenas admin)
 */
async function handleDelete(event, sql, user) {
  requireAdmin(user);

  const targetId = parseInt(event.path.split('/').pop(), 10);

  if (targetId === user.userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Você não pode desativar sua própria conta' })
    };
  }

  const [existingUser] = await sql`
    SELECT id FROM users WHERE id = ${targetId} AND deleted_at IS NULL
  `;

  if (!existingUser) {
    throw notFoundError('Usuário');
  }

  // Soft delete
  await sql`
    UPDATE users
    SET deleted_at = CURRENT_TIMESTAMP, ativo = false
    WHERE id = ${targetId}
  `;

  // Revogar todas as sessões do usuário
  await sql`
    UPDATE sessions
    SET revoked_at = CURRENT_TIMESTAMP
    WHERE user_id = ${targetId} AND revoked_at IS NULL
  `;

  await logAudit(
    sql,
    user.userId,
    'user_deleted',
    'users',
    targetId,
    {},
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('user_deleted', { userId: targetId, deletedBy: user.userId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, message: 'Usuário desativado' })
  };
}

/**
 * PUT /api/users/:id/reactivate
 * Reativa usuário desativado (apenas admin)
 */
async function handleReactivate(event, sql, user) {
  requireAdmin(user);

  const targetId = parseInt(event.path.split('/').filter(p => p && /^\d+$/.test(p))[0], 10);

  await sql`
    UPDATE users
    SET ativo = true, deleted_at = NULL
    WHERE id = ${targetId}
  `;

  await logAudit(
    sql,
    user.userId,
    'user_reactivated',
    'users',
    targetId,
    {},
    getClientIP(event),
    getUserAgent(event)
  );

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, message: 'Usuário reativado' })
  };
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const sql = getDB();
  const user = await verifyToken(event, sql);

  const pathParts = event.path.split('/').filter(Boolean);
  const hasId = pathParts[pathParts.length - 1] && /^\d+$/.test(pathParts[pathParts.length - 1]);
  const isReactivate = event.path.includes('/reactivate');

  if (event.httpMethod === 'GET' && !hasId) {
    return await handleList(event, sql, user);
  }

  if (event.httpMethod === 'GET' && hasId) {
    return await handleGet(event, sql, user);
  }

  if (event.httpMethod === 'POST') {
    return await handleCreate(event, sql, user);
  }

  if (event.httpMethod === 'PUT' && hasId && isReactivate) {
    return await handleReactivate(event, sql, user);
  }

  if (event.httpMethod === 'PUT' && hasId) {
    return await handleUpdate(event, sql, user);
  }

  if (event.httpMethod === 'DELETE' && hasId) {
    return await handleDelete(event, sql, user);
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Rota não encontrada' })
  };
});

