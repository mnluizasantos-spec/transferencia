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

    console.log('Dashboard Stats - Iniciando', { userRole: user.role, userName: user.name, meuNome, isSolicitante });

    let stats;

    if (!isSolicitante) {
      // Admin / separador: ver todas as solicitações
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
    } else if (user.email === 'solicitante@antilhas.com') {
      // Perfil Gráfica
      [stats] = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'Concluído') as concluidos,
          COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as atrasados,
          COUNT(*) FILTER (WHERE DATE(deadline) = CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as vencem_hoje
        FROM material_requests
        WHERE deleted_at IS NULL
        AND (entregar_em IS NULL OR entregar_em = 'Grafica')
      `;
    } else if (user.email === 'flexiveis@antilhas.com' || meuNome === 'Flexíveis' || meuNome === 'Flexiveis') {
      // Perfil Flexíveis
      [stats] = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'Concluído') as concluidos,
          COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as atrasados,
          COUNT(*) FILTER (WHERE DATE(deadline) = CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as vencem_hoje
        FROM material_requests
        WHERE deleted_at IS NULL
        AND entregar_em = 'Flexiveis'
      `;
    } else {
      // Perfil Salto (ou outro solicitante sem perfil Gráfica/Flexíveis):
      // considerar tanto Salto quanto Camaçari
      [stats] = await sql`
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'Pendente') as pendentes,
          COUNT(*) FILTER (WHERE status = 'Concluído') as concluidos,
          COUNT(*) FILTER (WHERE deadline < CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as atrasados,
          COUNT(*) FILTER (WHERE DATE(deadline) = CURRENT_DATE AND status != 'Concluído' AND status != 'Cancelado' AND status != 'Recusado') as vencem_hoje
        FROM material_requests
        WHERE deleted_at IS NULL
        AND (entregar_em = 'Salto' OR entregar_em = 'Camacari')
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
      AND (mr.entregar_em IS NULL OR mr.entregar_em = 'Grafica')
      ORDER BY mr.deadline ASC NULLS LAST, mr.created_at ASC
    `;
  } else if (user.role === 'solicitante') {
    const meuNome = (user.name || user.nome || '').toString().trim();
    if (user.email === 'flexiveis@antilhas.com' || meuNome === 'Flexíveis' || meuNome === 'Flexiveis') {
      urgentes = await sql`
        SELECT mr.*, mr.requester_name as solicitante_nome
        FROM material_requests mr
        WHERE mr.deleted_at IS NULL AND mr.urgencia = 'Urgente' AND mr.status != 'Concluído'
        AND mr.entregar_em = 'Flexiveis'
        ORDER BY mr.deadline ASC NULLS LAST, mr.created_at ASC
      `;
    } else {
      // Perfil Salto: filtrar por entregar_em (igual à listagem) - Salto ou Camaçari
      urgentes = await sql`
        SELECT 
          mr.*,
          mr.requester_name as solicitante_nome
        FROM material_requests mr
        WHERE mr.deleted_at IS NULL
        AND mr.urgencia = 'Urgente'
        AND mr.status != 'Concluído'
        AND (mr.entregar_em = 'Salto' OR mr.entregar_em = 'Camacari')
        ORDER BY mr.deadline ASC NULLS LAST, mr.created_at ASC
      `;
    }
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
      AND (entregar_em IS NULL OR entregar_em = 'Grafica')
      GROUP BY DATE(created_at)
      ORDER BY data DESC
    `;
  } else if (user.role === 'solicitante') {
    const meuNome = (user.name || user.nome || '').toString().trim();
    if (user.email === 'flexiveis@antilhas.com' || meuNome === 'Flexíveis' || meuNome === 'Flexiveis') {
      trends = await sql`
        SELECT 
          DATE(created_at) as data,
          COUNT(*) as total_criadas,
          COUNT(*) FILTER (WHERE status = 'Concluído') as total_concluidas,
          COUNT(*) FILTER (WHERE urgencia = 'Urgente') as total_urgentes
        FROM material_requests
        WHERE deleted_at IS NULL
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND entregar_em = 'Flexiveis'
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
        AND requester_name = ${meuNome}
        GROUP BY DATE(created_at)
        ORDER BY data DESC
      `;
    }
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
 * GET /api/dashboard/separacao-por-dia
 * Volume pendente de separação agrupado por prazo e unidade
 * Visível para todos os roles (respeitando o escopo de cada um)
 */
async function handleSeparacaoPorDia(event, sql, user) {
  try {
    const meuNome = (user.name || user.nome || '').toString().trim();
    let rows;

    if (user.role !== 'solicitante') {
      // Admin / separador: todas as solicitações abertas
      rows = await sql`
        SELECT
          deadline,
          unidade,
          SUM(quantidade) as total_quantidade,
          COUNT(*) as total_ordens
        FROM material_requests
        WHERE deleted_at IS NULL
          AND status IN ('Pendente', 'Em Separação')
          AND deadline IS NOT NULL
        GROUP BY deadline, unidade
        ORDER BY deadline ASC, unidade ASC
      `;
    } else if (user.email === 'solicitante@antilhas.com') {
      // Perfil Gráfica
      rows = await sql`
        SELECT
          deadline,
          unidade,
          SUM(quantidade) as total_quantidade,
          COUNT(*) as total_ordens
        FROM material_requests
        WHERE deleted_at IS NULL
          AND status IN ('Pendente', 'Em Separação')
          AND deadline IS NOT NULL
          AND (entregar_em IS NULL OR entregar_em = 'Grafica')
        GROUP BY deadline, unidade
        ORDER BY deadline ASC, unidade ASC
      `;
    } else if (user.email === 'flexiveis@antilhas.com' || meuNome === 'Flexíveis' || meuNome === 'Flexiveis') {
      // Perfil Flexíveis
      rows = await sql`
        SELECT
          deadline,
          unidade,
          SUM(quantidade) as total_quantidade,
          COUNT(*) as total_ordens
        FROM material_requests
        WHERE deleted_at IS NULL
          AND status IN ('Pendente', 'Em Separação')
          AND deadline IS NOT NULL
          AND entregar_em = 'Flexiveis'
        GROUP BY deadline, unidade
        ORDER BY deadline ASC, unidade ASC
      `;
    } else {
      // Perfil Salto / Camaçari
      rows = await sql`
        SELECT
          deadline,
          unidade,
          SUM(quantidade) as total_quantidade,
          COUNT(*) as total_ordens
        FROM material_requests
        WHERE deleted_at IS NULL
          AND status IN ('Pendente', 'Em Separação')
          AND deadline IS NOT NULL
          AND (entregar_em = 'Salto' OR entregar_em = 'Camacari')
        GROUP BY deadline, unidade
        ORDER BY deadline ASC, unidade ASC
      `;
    }

    // Pivotear: agrupar por deadline, colocar kg e pc em colunas
    const byDay = {};
    for (const row of rows) {
      const dia = row.deadline instanceof Date
        ? row.deadline.toISOString().split('T')[0]
        : String(row.deadline).split('T')[0];

      if (!byDay[dia]) {
        byDay[dia] = { deadline: dia, kg: 0, pc: 0, m: 0, total_ordens: 0 };
      }

      const unidade = (row.unidade || '').toLowerCase();
      const qtd = parseFloat(row.total_quantidade) || 0;
      const ordens = parseInt(row.total_ordens) || 0;

      if (unidade === 'kg') byDay[dia].kg += qtd;
      else if (unidade === 'pc') byDay[dia].pc += qtd;
      else if (unidade === 'm') byDay[dia].m += qtd;

      byDay[dia].total_ordens += ordens;
    }

    const result = Object.values(byDay).sort((a, b) => a.deadline.localeCompare(b.deadline));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('handleSeparacaoPorDia - Erro:', error);
    throw error;
  }
}

/**
 * Handler principal
 */
/**
 * Garante que a tabela dashboard_config existe
 */
async function ensureConfigTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS dashboard_config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

/**
 * GET /api/dashboard/config
 * Retorna configurações do dashboard (capacidade diária em kg)
 *
 * PUT /api/dashboard/config
 * Salva configurações (apenas admin)
 */
async function handleCapacidadeConfig(event, sql, user) {
  await ensureConfigTable(sql);

  if (event.httpMethod === 'GET') {
    const rows = await sql`SELECT key, value FROM dashboard_config WHERE key = 'capacidade_diaria_kg'`;
    const capacidade = rows.length > 0 ? parseFloat(rows[0].value) : null;
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacidade_diaria_kg: capacidade })
    };
  }

  if (event.httpMethod === 'PUT') {
    if (user.role !== 'admin') {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Apenas administradores podem alterar configurações' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const valor = parseFloat(body.capacidade_diaria_kg);

    if (isNaN(valor) || valor < 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Valor inválido para capacidade diária' })
      };
    }

    await sql`
      INSERT INTO dashboard_config (key, value, updated_at)
      VALUES ('capacidade_diaria_kg', ${String(valor)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = ${String(valor)}, updated_at = NOW()
    `;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ capacidade_diaria_kg: valor })
    };
  }

  return {
    statusCode: 405,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Método não permitido' })
  };
}

/**
 * GET /api/dashboard/capacidade-hoje
 * Retorna solicitado/realizado/pendente em kg para hoje
 */
async function handleCapacidadeHoje(event, sql, user) {
  const meuNome = (user.name || user.nome || '').toString().trim();
  const isGrafica   = user.role === 'solicitante' && user.email === 'solicitante@antilhas.com';
  const isFlexiveis = user.role === 'solicitante' && (user.email === 'flexiveis@antilhas.com' || meuNome === 'Flexíveis' || meuNome === 'Flexiveis');
  const isAdmin     = user.role !== 'solicitante';

  // ── Totais de HOJE ──────────────────────────────────────────────────────────
  let solicitado, realizado, pendente;

  if (isAdmin) {
    [solicitado] = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status NOT IN ('Cancelado','Recusado')`;
    [realizado]  = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status='Concluído'`;
    [pendente]   = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status IN ('Pendente','Em Separação')`;
  } else if (isGrafica) {
    [solicitado] = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status NOT IN ('Cancelado','Recusado') AND (entregar_em IS NULL OR entregar_em='Grafica')`;
    [realizado]  = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status='Concluído' AND (entregar_em IS NULL OR entregar_em='Grafica')`;
    [pendente]   = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status IN ('Pendente','Em Separação') AND (entregar_em IS NULL OR entregar_em='Grafica')`;
  } else if (isFlexiveis) {
    [solicitado] = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status NOT IN ('Cancelado','Recusado') AND entregar_em='Flexiveis'`;
    [realizado]  = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status='Concluído' AND entregar_em='Flexiveis'`;
    [pendente]   = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status IN ('Pendente','Em Separação') AND entregar_em='Flexiveis'`;
  } else {
    [solicitado] = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status NOT IN ('Cancelado','Recusado') AND (entregar_em='Salto' OR entregar_em='Camacari')`;
    [realizado]  = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status='Concluído' AND (entregar_em='Salto' OR entregar_em='Camacari')`;
    [pendente]   = await sql`SELECT COALESCE(SUM(quantidade),0) as total FROM material_requests WHERE deleted_at IS NULL AND unidade='kg' AND DATE(deadline)=CURRENT_DATE AND status IN ('Pendente','Em Separação') AND (entregar_em='Salto' OR entregar_em='Camacari')`;
  }

  // ── Histórico por dia (todos os dias com movimentação em kg) ────────────────
  let porDia;

  if (isAdmin) {
    porDia = await sql`
      SELECT
        DATE(deadline) as dia,
        COALESCE(SUM(quantidade) FILTER (WHERE status NOT IN ('Cancelado','Recusado')), 0) as solicitado,
        COALESCE(SUM(quantidade) FILTER (WHERE status = 'Concluído'), 0) as realizado,
        COALESCE(SUM(quantidade) FILTER (WHERE status IN ('Pendente','Em Separação')), 0) as pendente
      FROM material_requests
      WHERE deleted_at IS NULL AND unidade = 'kg' AND deadline IS NOT NULL
      GROUP BY DATE(deadline)
      ORDER BY DATE(deadline) ASC
    `;
  } else if (isGrafica) {
    porDia = await sql`
      SELECT
        DATE(deadline) as dia,
        COALESCE(SUM(quantidade) FILTER (WHERE status NOT IN ('Cancelado','Recusado')), 0) as solicitado,
        COALESCE(SUM(quantidade) FILTER (WHERE status = 'Concluído'), 0) as realizado,
        COALESCE(SUM(quantidade) FILTER (WHERE status IN ('Pendente','Em Separação')), 0) as pendente
      FROM material_requests
      WHERE deleted_at IS NULL AND unidade = 'kg' AND deadline IS NOT NULL
        AND (entregar_em IS NULL OR entregar_em = 'Grafica')
      GROUP BY DATE(deadline)
      ORDER BY DATE(deadline) ASC
    `;
  } else if (isFlexiveis) {
    porDia = await sql`
      SELECT
        DATE(deadline) as dia,
        COALESCE(SUM(quantidade) FILTER (WHERE status NOT IN ('Cancelado','Recusado')), 0) as solicitado,
        COALESCE(SUM(quantidade) FILTER (WHERE status = 'Concluído'), 0) as realizado,
        COALESCE(SUM(quantidade) FILTER (WHERE status IN ('Pendente','Em Separação')), 0) as pendente
      FROM material_requests
      WHERE deleted_at IS NULL AND unidade = 'kg' AND deadline IS NOT NULL
        AND entregar_em = 'Flexiveis'
      GROUP BY DATE(deadline)
      ORDER BY DATE(deadline) ASC
    `;
  } else {
    porDia = await sql`
      SELECT
        DATE(deadline) as dia,
        COALESCE(SUM(quantidade) FILTER (WHERE status NOT IN ('Cancelado','Recusado')), 0) as solicitado,
        COALESCE(SUM(quantidade) FILTER (WHERE status = 'Concluído'), 0) as realizado,
        COALESCE(SUM(quantidade) FILTER (WHERE status IN ('Pendente','Em Separação')), 0) as pendente
      FROM material_requests
      WHERE deleted_at IS NULL AND unidade = 'kg' AND deadline IS NOT NULL
        AND (entregar_em = 'Salto' OR entregar_em = 'Camacari')
      GROUP BY DATE(deadline)
      ORDER BY DATE(deadline) ASC
    `;
  }

  // Capacidade diária configurada
  await ensureConfigTable(sql);
  const configRows = await sql`SELECT value FROM dashboard_config WHERE key = 'capacidade_diaria_kg'`;
  const capacidade = configRows.length > 0 ? parseFloat(configRows[0].value) : null;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      capacidade_diaria_kg: capacidade,
      solicitado_kg: parseFloat(solicitado.total) || 0,
      realizado_kg: parseFloat(realizado.total) || 0,
      pendente_kg: parseFloat(pendente.total) || 0,
      por_dia: porDia.map(r => ({
        dia: r.dia instanceof Date ? r.dia.toISOString().split('T')[0] : String(r.dia).split('T')[0],
        solicitado: parseFloat(r.solicitado) || 0,
        realizado:  parseFloat(r.realizado)  || 0,
        pendente:   parseFloat(r.pendente)   || 0
      }))
    })
  };
}

exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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

  if (path === '/separacao-por-dia' && event.httpMethod === 'GET') {
    return await handleSeparacaoPorDia(event, sql, user);
  }

  if (path === '/config' && (event.httpMethod === 'GET' || event.httpMethod === 'PUT')) {
    return await handleCapacidadeConfig(event, sql, user);
  }

  if (path === '/capacidade-hoje' && event.httpMethod === 'GET') {
    return await handleCapacidadeHoje(event, sql, user);
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
