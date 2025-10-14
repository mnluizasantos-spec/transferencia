/**
 * History API
 * Histórico de alterações e logs de auditoria
 */

const { getDB } = require('./utils/db');
const { withErrorHandling, notFoundError } = require('./utils/errorHandler');
const { verifyToken, requireAdmin } = require('./utils/middleware');

/**
 * GET /api/history/:request_id
 * Histórico completo de uma solicitação
 */
async function handleRequestHistory(event, sql, user) {
  const requestId = event.path.split('/').pop();

  // Verificar se solicitação existe e usuário tem acesso
  const [request] = await sql`
    SELECT id, solicitante_id 
    FROM material_requests 
    WHERE id = ${requestId} AND deleted_at IS NULL
  `;

  if (!request) {
    throw notFoundError('Solicitação');
  }

  // Solicitantes só veem histórico de suas próprias solicitações
  if (user.role === 'solicitante' && request.solicitante_id !== user.userId) {
    throw notFoundError('Solicitação');
  }

  // Buscar histórico
  const history = await sql`
    SELECT 
      rh.*,
      u.nome as usuario_nome,
      u.email as usuario_email
    FROM request_history rh
    JOIN users u ON rh.user_id = u.id
    WHERE rh.request_id = ${requestId}
    ORDER BY rh.timestamp DESC
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(history)
  };
}

/**
 * GET /api/history/audit
 * Logs de auditoria do sistema (apenas admin)
 */
async function handleAuditLogs(event, sql, user) {
  requireAdmin(user);

  const params = event.queryStringParameters || {};
  const limit = parseInt(params.limit || '100', 10);
  const offset = parseInt(params.offset || '0', 10);
  const userId = params.user_id ? parseInt(params.user_id, 10) : null;
  const acao = params.acao || null;
  const tabela = params.tabela || null;

  let query = sql`
    SELECT 
      al.*,
      u.nome as usuario_nome,
      u.email as usuario_email
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE 1=1
  `;

  if (userId) {
    query = sql`${query} AND al.user_id = ${userId}`;
  }

  if (acao) {
    query = sql`${query} AND al.acao = ${acao}`;
  }

  if (tabela) {
    query = sql`${query} AND al.tabela_afetada = ${tabela}`;
  }

  query = sql`
    ${query}
    ORDER BY al.timestamp DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `;

  const logs = await query;

  // Total count para paginação
  const [{ count }] = await sql`SELECT COUNT(*) as count FROM audit_logs WHERE 1=1`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      logs,
      pagination: {
        limit,
        offset,
        total: parseInt(count)
      }
    })
  };
}

/**
 * GET /api/history/user-activity/:user_id
 * Atividades recentes de um usuário (admin ou próprio usuário)
 */
async function handleUserActivity(event, sql, user) {
  const targetUserId = parseInt(event.path.split('/').pop(), 10);

  // Verificar permissão
  if (user.role !== 'admin' && user.userId !== targetUserId) {
    throw notFoundError('Usuário');
  }

  const params = event.queryStringParameters || {};
  const limit = parseInt(params.limit || '50', 10);

  // Atividades do usuário
  const activities = await sql`
    SELECT 
      al.id,
      al.acao,
      al.tabela_afetada,
      al.registro_id,
      al.timestamp,
      al.detalhes_json
    FROM audit_logs al
    WHERE al.user_id = ${targetUserId}
    ORDER BY al.timestamp DESC
    LIMIT ${limit}
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activities)
  };
}

/**
 * GET /api/history/recent
 * Atividades recentes do sistema (últimas 100)
 */
async function handleRecentActivity(event, sql, user) {
  // Apenas admin e separador podem ver atividades gerais
  if (user.role === 'solicitante') {
    // Solicitantes veem apenas suas próprias atividades
    return await handleUserActivity({ ...event, path: `/api/history/user-activity/${user.userId}` }, sql, user);
  }

  const params = event.queryStringParameters || {};
  const limit = parseInt(params.limit || '100', 10);

  const activities = await sql`
    SELECT 
      al.id,
      al.acao,
      al.tabela_afetada,
      al.registro_id,
      al.timestamp,
      al.detalhes_json,
      u.nome as usuario_nome
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    ORDER BY al.timestamp DESC
    LIMIT ${limit}
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(activities)
  };
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  const sql = getDB();
  const user = await verifyToken(event, sql);

  const pathParts = event.path.replace('/.netlify/functions/history', '').replace('/api/history', '').split('/').filter(Boolean);

  // /api/history/:request_id - histórico de solicitação
  if (pathParts.length === 1 && /^\d+$/.test(pathParts[0])) {
    return await handleRequestHistory(event, sql, user);
  }

  // /api/history/audit - logs de auditoria
  if (pathParts[0] === 'audit') {
    return await handleAuditLogs(event, sql, user);
  }

  // /api/history/user-activity/:user_id
  if (pathParts[0] === 'user-activity' && pathParts.length === 2) {
    return await handleUserActivity(event, sql, user);
  }

  // /api/history/recent
  if (pathParts[0] === 'recent') {
    return await handleRecentActivity(event, sql, user);
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Rota não encontrada' })
  };
});

