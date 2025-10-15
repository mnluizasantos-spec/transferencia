/**
 * Dashboard API - VERSÃO TEMPORÁRIA
 * Usando apenas colunas que sabemos que existem
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');

/**
 * GET /api/dashboard/stats
 * Estatísticas gerais - VERSÃO SIMPLIFICADA
 */
async function handleStats(event, sql, user) {
  // Query simplificada usando apenas colunas básicas
  const baseCondition = user.role === 'solicitante' 
    ? sql`deleted_at IS NULL AND requester_name = ${user.name}`
    : sql`deleted_at IS NULL`;

  const [stats] = await sql`
    SELECT 
      COUNT(*) FILTER (WHERE ${baseCondition}) as total,
      COUNT(*) FILTER (WHERE ${baseCondition} AND status != 'Concluído') as pendentes,
      COUNT(*) FILTER (WHERE ${baseCondition} AND status = 'Concluído') as concluidos,
      COUNT(*) FILTER (WHERE ${baseCondition} AND urgencia = 'Urgente' AND status != 'Concluído') as urgentes
    FROM material_requests
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      total: parseInt(stats.total),
      atrasados: 0, // Temporariamente 0
      vencem_hoje: 0, // Temporariamente 0
      concluidos: parseInt(stats.concluidos),
      concluidos_hoje: 0, // Temporariamente 0
      pendentes: parseInt(stats.pendentes),
      em_separacao: 0, // Temporariamente 0
      urgentes: parseInt(stats.urgentes)
    })
  };
}

/**
 * GET /api/dashboard/urgentes
 * Lista de solicitações urgentes - VERSÃO SIMPLIFICADA
 */
async function handleUrgentes(event, sql, user) {
  const urgentes = await sql`
    SELECT 
      mr.*,
      mr.requester_name as solicitante_nome
    FROM material_requests mr
    WHERE mr.deleted_at IS NULL
    AND mr.urgencia = 'Urgente'
    AND mr.status != 'Concluído'
    ${user.role === 'solicitante' ? sql`AND mr.requester_name = ${user.name}` : sql``}
    ORDER BY mr.created_at ASC
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(urgentes)
  };
}

/**
 * GET /api/dashboard/trends
 * Tendências - VERSÃO SIMPLIFICADA
 */
async function handleTrends(event, sql, user) {
  const trends = await sql`
    SELECT 
      DATE(created_at) as data,
      COUNT(*) as total_criadas,
      COUNT(*) FILTER (WHERE status = 'Concluído') as total_concluidas,
      COUNT(*) FILTER (WHERE urgencia = 'Urgente') as total_urgentes
    FROM material_requests
    WHERE deleted_at IS NULL
    AND created_at >= CURRENT_DATE - INTERVAL '30 days'
    ${user.role === 'solicitante' ? sql`AND requester_name = ${user.name}` : sql``}
    GROUP BY DATE(created_at)
    ORDER BY data DESC
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(trends)
  };
}

exports.handler = withErrorHandling(async (event, sql, user) => {
  const path = event.path.replace('/.netlify/functions/dashboard', '');
  
  switch (path) {
    case '/stats':
      return handleStats(event, sql, user);
    case '/urgentes':
      return handleUrgentes(event, sql, user);
    case '/trends':
      return handleTrends(event, sql, user);
    default:
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Endpoint não encontrado' })
      };
  }
}, verifyToken);

