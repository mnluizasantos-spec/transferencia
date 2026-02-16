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
  try {
    const meuNome = (user.name || user.nome || '').toString().trim();
    const isSolicitante = user.role === 'solicitante' && meuNome;
    const isGraficaUser = user.email === 'solicitante@antilhas.com';
    console.log('Dashboard Stats - Iniciando', { userRole: user.role, userName: user.name, isSolicitante, isGraficaUser });

    let stats;
    if (isSolicitante && isGraficaUser) {
      [stats] = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'Concluído') as concluidos,
          COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as atrasados,
          COUNT(*) FILTER (WHERE DATE(deadline) = CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as vencem_hoje
        FROM material_requests
        WHERE deleted_at IS NULL
          AND COALESCE(TRIM(requester_name), '') NOT IN ('Salto', 'Flexíveis')
      `;
    } else if (isSolicitante) {
      [stats] = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'Concluído') as concluidos,
          COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as atrasados,
          COUNT(*) FILTER (WHERE DATE(deadline) = CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as vencem_hoje
        FROM material_requests
        WHERE deleted_at IS NULL AND requester_name = ${meuNome}
      `;
    } else {
      [stats] = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'Concluído') as concluidos,
          COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as atrasados,
          COUNT(*) FILTER (WHERE DATE(deadline) = CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as vencem_hoje
        FROM material_requests
        WHERE deleted_at IS NULL
      `;
    }

    console.log('Dashboard Stats - Resultado', stats);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        total: parseInt(stats.total) || 0,
        pendentes: parseInt(stats.pendentes) || 0,
        concluidos: parseInt(stats.concluidos) || 0,
        atrasados: parseInt(stats.atrasados) || 0,
        vencem_hoje: parseInt(stats.vencem_hoje) || 0,
        concluidos_hoje: 0,
        em_separacao: 0,
        urgentes: 0
      })
    };
  } catch (error) {
    console.error('Dashboard Stats - Erro:', error);
    throw error;
  }
}

/**
 * GET /api/dashboard/urgentes
 * Lista de solicitações urgentes não concluídas
 */
async function handleUrgentes(event, sql, user) {
  let urgentes;
  if (user.role === 'solicitante' && user.email === 'solicitante@antilhas.com') {
    urgentes = await sql`
      SELECT 
        mr.*,
        mr.requester_name as solicitante_nome
      FROM material_requests mr
      WHERE mr.deleted_at IS NULL
      AND mr.urgencia = 'Urgente'
      AND mr.status != 'Concluído'
      AND COALESCE(TRIM(mr.requester_name), '') NOT IN ('Salto', 'Flexíveis')
      ORDER BY mr.deadline ASC NULLS LAST, mr.created_at ASC
    `;
  } else if (user.role === 'solicitante') {
    const meuNome = (user.name || user.nome || '').toString().trim();
    urgentes = await sql`
      SELECT 
        mr.*,
        mr.requester_name as solicitante_nome
      FROM material_requests mr
      WHERE mr.deleted_at IS NULL
      AND mr.urgencia = 'Urgente'
      AND mr.status != 'Concluído'
      AND mr.requester_name = ${meuNome}
      ORDER BY mr.deadline ASC NULLS LAST, mr.created_at ASC
    `;
  } else {
    urgentes = await sql`
      SELECT 
        mr.*,
        mr.requester_name as solicitante_nome
      FROM material_requests mr
      WHERE mr.deleted_at IS NULL
      AND mr.urgencia = 'Urgente'
      AND mr.status != 'Concluído'
      ORDER BY mr.deadline ASC NULLS LAST, mr.created_at ASC
    `;
  }

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
  let trends;
  if (user.role === 'solicitante' && user.email === 'solicitante@antilhas.com') {
    trends = await sql`
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total_criadas,
        COUNT(*) FILTER (WHERE status = 'Concluído') as total_concluidas,
        COUNT(*) FILTER (WHERE urgencia = 'Urgente') as total_urgentes
      FROM material_requests
      WHERE deleted_at IS NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND COALESCE(TRIM(requester_name), '') NOT IN ('Salto', 'Flexíveis')
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `;
  } else if (user.role === 'solicitante') {
    const meuNome = (user.name || user.nome || '').toString().trim();
    trends = await sql`
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total_criadas,
        COUNT(*) FILTER (WHERE status = 'Concluído') as total_concluidas,
        COUNT(*) FILTER (WHERE urgencia = 'Urgente') as total_urgentes
      FROM material_requests
      WHERE deleted_at IS NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      AND requester_name = ${meuNome}
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `;
  } else {
    trends = await sql`
      SELECT 
        DATE(created_at) as data,
        COUNT(*) as total_criadas,
        COUNT(*) FILTER (WHERE status = 'Concluído') as total_concluidas,
        COUNT(*) FILTER (WHERE urgencia = 'Urgente') as total_urgentes
      FROM material_requests
      WHERE deleted_at IS NULL
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `;
  }

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

