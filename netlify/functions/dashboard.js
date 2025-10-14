/**
 * Dashboard API
 * Estatísticas e métricas do sistema
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');

/**
 * GET /api/dashboard/stats
 * Estatísticas gerais
 */
async function handleStats(event, sql, user) {
  const baseCondition = user.role === 'solicitante' 
    ? sql`deleted_at IS NULL AND requester_name = ${user.name}`
    : sql`deleted_at IS NULL`;

  const [stats] = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE ${baseCondition}) as total,
      COUNT(*) FILTER (WHERE ${baseCondition} AND deadline < CURRENT_DATE AND status != 'Concluído') as atrasados,
      COUNT(*) FILTER (WHERE ${baseCondition} AND deadline = CURRENT_DATE AND status != 'Concluído') as vence_hoje,
      COUNT(*) FILTER (WHERE ${baseCondition} AND status = 'Concluído') as concluidos,
      COUNT(*) FILTER (WHERE ${baseCondition} AND status = 'Pendente') as pendentes,
      COUNT(*) FILTER (WHERE ${baseCondition} AND status = 'Em Separação') as em_separacao,
      COUNT(*) FILTER (WHERE ${baseCondition} AND urgencia = 'Urgente' AND status != 'Concluído') as urgentes,
      COUNT(*) FILTER (WHERE ${baseCondition} AND DATE(completed_at) = CURRENT_DATE) as concluidos_hoje
    FROM material_requests
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total: parseInt(stats.total),
      atrasados: parseInt(stats.atrasados),
      vencem_hoje: parseInt(stats.vence_hoje),
      concluidos: parseInt(stats.concluidos),
      concluidos_hoje: parseInt(stats.concluidos_hoje),
      pendentes: parseInt(stats.pendentes),
      em_separacao: parseInt(stats.em_separacao),
      urgentes: parseInt(stats.urgentes)
    })
  };
}

/**
 * GET /api/dashboard/urgentes
 * Lista de solicitações urgentes não concluídas
 */
async function handleUrgentes(event, sql, user) {
  let query = sql`
    SELECT 
      mr.*,
      mr.requester_name as solicitante_nome
    FROM material_requests mr
    WHERE mr.deleted_at IS NULL
    AND mr.urgencia = 'Urgente'
    AND mr.status != 'Concluído'
  `;

  if (user.role === 'solicitante') {
    query = sql`${query} AND mr.requester_name = ${user.name}`;
  }

  query = sql`${query} ORDER BY mr.deadline ASC NULLS LAST, mr.created_at ASC`;

  const urgentes = await query;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(urgentes)
  };
}

/**
 * GET /api/dashboard/trends
 * Tendências e métricas temporais
 */
async function handleTrends(event, sql, user) {
  // Últimos 30 dias
  const whereClause = user.role === 'solicitante' 
    ? sql`AND requester_name = ${user.name}` 
    : sql``;

  const trends = await sql`
    SELECT 
      DATE(created_at) as data,
      COUNT(*) as total_criadas,
      COUNT(*) FILTER (WHERE status = 'Concluído') as total_concluidas,
      COUNT(*) FILTER (WHERE urgencia = 'Urgente') as total_urgentes
    FROM material_requests
    WHERE deleted_at IS NULL
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ${whereClause}
    GROUP BY DATE(created_at)
    ORDER BY data DESC
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trends)
  };
}

/**
 * GET /api/dashboard/top-solicitantes
 * Solicitantes com mais pedidos (apenas admin/separador)
 */
async function handleTopSolicitantes(event, sql, user) {
  if (user.role === 'solicitante') {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Sem permissão' })
    };
  }

  const params = event.queryStringParameters || {};
  const limit = parseInt(params.limit || '10', 10);

  const topSolicitantes = await sql`
    SELECT 
      u.id,
      u.nome,
      u.email,
      COUNT(mr.id) as total_solicitacoes,
      COUNT(mr.id) FILTER (WHERE mr.status = 'Concluído') as concluidas,
      COUNT(mr.id) FILTER (WHERE mr.status = 'Pendente') as pendentes
    FROM users u
    LEFT JOIN material_requests mr ON u.id = mr.solicitante_id AND mr.deleted_at IS NULL
    WHERE u.role = 'solicitante' AND u.deleted_at IS NULL
    GROUP BY u.id, u.nome, u.email
    ORDER BY total_solicitacoes DESC
    LIMIT ${limit}
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(topSolicitantes)
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

  const sql = getDB();
  const user = await verifyToken(event, sql);

  const path = event.path.replace('/.netlify/functions/dashboard', '').replace('/api/dashboard', '') || '/';

  if (path === '/stats' && event.httpMethod === 'GET') {
    return await handleStats(event, sql, user);
  }

  if (path === '/urgentes' && event.httpMethod === 'GET') {
    return await handleUrgentes(event, sql, user);
  }

  if (path === '/trends' && event.httpMethod === 'GET') {
    return await handleTrends(event, sql, user);
  }

  if (path === '/top-solicitantes' && event.httpMethod === 'GET') {
    return await handleTopSolicitantes(event, sql, user);
  }

  // Default: retorna stats
  if (path === '/' && event.httpMethod === 'GET') {
    return await handleStats(event, sql, user);
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Rota não encontrada' })
  };
});

