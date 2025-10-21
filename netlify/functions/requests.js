/**
 * Requests API
 * CRUD de solicitações de material com auditoria completa
 */

const { getDB } = require('./utils/db');
const { logInfo, logAudit } = require('./utils/logger');
const { withErrorHandling, validationError, notFoundError } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');
const { validateRequestData, getClientIP, getUserAgent } = require('./utils/validators');

/**
 * Registra alteração no histórico
 */
async function logHistory(sql, requestId, userId, campo, valorAnterior, valorNovo, acao) {
  await sql`
    INSERT INTO request_history 
      (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao)
    VALUES 
      (${requestId}, ${userId}, ${campo}, ${valorAnterior}, ${valorNovo}, ${acao})
  `;
}

/**
 * GET /api/requests
 * Lista solicitações com filtros
 */
async function handleList(event, sql, user) {
  try {
    console.log('Requests List - Iniciando', { userRole: user.role, userName: user.name });
    
    // Obter filtros da query string
    const params = event.queryStringParameters || {};
    const statusFilter = params.status;
    const urgenciaFilter = params.urgencia;
    const searchFilter = params.search;
    const created_at_start = params.created_at_start;
    const created_at_end = params.created_at_end;
    const deadline_start = params.deadline_start;
    const deadline_end = params.deadline_end;
    
    console.log('Filtros recebidos:', { statusFilter, urgenciaFilter, searchFilter, created_at_start, created_at_end, deadline_start, deadline_end });
    
    // Construir filtros SQL (não JavaScript!)
    let whereConditions = ['deleted_at IS NULL'];
    let queryParams = {};
    
    if (statusFilter) {
      whereConditions.push('status = ${status}');
      queryParams.status = statusFilter;
    }
    
    if (urgenciaFilter) {
      whereConditions.push('urgencia = ${urgencia}');
      queryParams.urgencia = urgenciaFilter;
    }
    
    if (created_at_start) {
      whereConditions.push('created_at >= ${created_at_start}::timestamp');
      queryParams.created_at_start = created_at_start;
    }
    
    if (created_at_end) {
      whereConditions.push('created_at <= ${created_at_end}::timestamp + interval \'1 day\'');
      queryParams.created_at_end = created_at_end;
    }
    
    if (deadline_start) {
      whereConditions.push('deadline >= ${deadline_start}::date');
      queryParams.deadline_start = deadline_start;
    }
    
    if (deadline_end) {
      whereConditions.push('deadline <= ${deadline_end}::date');
      queryParams.deadline_end = deadline_end;
    }
    
    if (searchFilter) {
      whereConditions.push(`(
        material_description ILIKE ${sql('%' + searchFilter + '%')} OR 
        material_code ILIKE ${sql('%' + searchFilter + '%')} OR 
        requester_name ILIKE ${sql('%' + searchFilter + '%')}
      )`);
    }
    
    // Query otimizada usando índices
    const requests = await sql`
      SELECT 
        id, material_code, material_description, quantidade, unidade,
        requester_name, urgencia, status, deadline, justificativa,
        created_at, updated_at, created_by
      FROM material_requests
      WHERE ${sql(whereConditions.join(' AND '))}
      ORDER BY created_at DESC
      LIMIT 500
    `;
    
    console.log('Requests List - Resultado', { count: requests.length });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requests)
    };
  } catch (error) {
    console.error('Requests List - Erro:', error);
    throw error;
  }
}

/**
 * GET /api/requests/:id
 * Busca uma solicitação específica
 */
async function handleGet(event, sql, user) {
  const id = event.path.split('/').pop();

  const [request] = await sql`
    SELECT 
      mr.*,
      mr.requester_name as solicitante_nome,
      u_creator.name as criado_por_nome
    FROM material_requests mr
    LEFT JOIN users u_creator ON mr.created_by = u_creator.id
    WHERE mr.id = ${id} AND mr.deleted_at IS NULL
  `;

  if (!request) {
    throw notFoundError('Solicitação');
  }

  // Solicitantes só podem ver suas próprias solicitações
  if (user.role === 'solicitante' && request.requester_name !== user.name) {
    throw notFoundError('Solicitação');
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  };
}

/**
 * POST /api/requests
 * Cria nova solicitação
 */
async function handleCreate(event, sql, user) {
  console.log('=== CREATE REQUEST DEBUG ===');
  console.log('User:', JSON.stringify(user));
  console.log('Body:', event.body);
  
  const data = JSON.parse(event.body || '{}');
  console.log('Parsed data:', JSON.stringify(data));
  
  // Adicionar created_by do usuário autenticado
  const requestData = {
    ...data,
    created_by: user.userId,
    requester_name: data.requester_name || user.name || user.nome
  };
  console.log('Request data with user info:', JSON.stringify(requestData));
  
  // Validar dados
  const validatedData = validateRequestData(requestData, false);

  // Criar solicitação (Neon serverless não suporta transações complexas)
  const [newRequest] = await sql`
    INSERT INTO material_requests 
      (material_code, material_description, quantidade, unidade, justificativa, requester_name, urgencia, deadline, production_start_date, status, created_by)
    VALUES 
      (${validatedData.material_code}, ${validatedData.material_description}, ${validatedData.quantidade}, 
       ${validatedData.unidade}, ${validatedData.justificativa}, ${validatedData.requester_name}, ${validatedData.urgencia}, 
       ${validatedData.deadline}, ${validatedData.production_start_date}, 'Pendente', ${user.userId})
    RETURNING *
  `;

  // Registrar no histórico
  await sql`
    INSERT INTO request_history 
      (request_id, user_id, campo_alterado, valor_novo, acao)
    VALUES 
      (${newRequest.id}, ${user.userId}, 'solicitação', 'criada', 'criado')
  `;

  // Log de auditoria
  await sql`
    INSERT INTO audit_logs 
      (user_id, acao, tabela_afetada, registro_id, detalhes_json, ip_address, user_agent)
    VALUES 
      (${user.userId}, 'request_created', 'material_requests', ${newRequest.id}, 
       ${JSON.stringify({ material_code: newRequest.material_code, quantidade: newRequest.quantidade })}::jsonb,
       ${getClientIP(event)}, ${getUserAgent(event)})
  `;

  const result = newRequest;

  logInfo('request_created', { requestId: result.id, userId: user.userId });

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
}

/**
 * PUT /api/requests/:id
 * Atualiza solicitação (com histórico de alterações)
 */
async function handleUpdate(event, sql, user) {
  const id = event.path.split('/').pop();
  const data = JSON.parse(event.body || '{}');

  // Buscar solicitação atual
  const [currentRequest] = await sql`
    SELECT * FROM material_requests WHERE id = ${id} AND deleted_at IS NULL
  `;

  if (!currentRequest) {
    throw notFoundError('Solicitação');
  }

  // Solicitantes só podem editar suas próprias solicitações
  if (user.role === 'solicitante' && currentRequest.created_by !== user.userId) {
    throw notFoundError('Solicitação');
  }

  // Validar dados
  const validatedData = validateRequestData(data, true);

  // Remover campos undefined
  const updateData = Object.fromEntries(
    Object.entries(validatedData).filter(([_, v]) => v !== undefined)
  );

  if (Object.keys(updateData).length === 0) {
    throw validationError('Nenhum dado para atualizar');
  }

  // Mesclar dados atuais com novos dados (preservar deadline se não enviado)
  const finalData = { ...currentRequest };
  Object.keys(updateData).forEach(key => {
    if (updateData[key] !== undefined) {
      finalData[key] = updateData[key];
    }
  });

  // Atualizar solicitação com todos os campos (preservando os não enviados)
  const [updated] = await sql`
    UPDATE material_requests 
    SET 
      material_code = ${finalData.material_code},
      material_description = ${finalData.material_description},
      quantidade = ${finalData.quantidade},
      unidade = ${finalData.unidade},
      requester_name = ${finalData.requester_name},
      urgencia = ${finalData.urgencia},
      status = ${finalData.status},
      deadline = ${finalData.deadline},
      justificativa = ${finalData.justificativa},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;

  // Registrar mudanças no histórico
  for (const [campo, valorNovo] of Object.entries(updateData)) {
    const valorAnterior = currentRequest[campo];
    
    if (valorAnterior !== valorNovo) {
      const acao = campo === 'status' ? 'status_mudado' : 'atualizado';
      
      await sql`
        INSERT INTO request_history 
          (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao)
        VALUES 
          (${id}, ${user.userId}, ${campo}, ${String(valorAnterior)}, ${String(valorNovo)}, ${acao})
      `;
    }
  }

  // Log de auditoria
  await sql`
    INSERT INTO audit_logs 
      (user_id, acao, tabela_afetada, registro_id, detalhes_json, ip_address, user_agent)
    VALUES 
      (${user.userId}, 'request_updated', 'material_requests', ${id}, 
       ${JSON.stringify(updateData)}::jsonb,
       ${getClientIP(event)}, ${getUserAgent(event)})
  `;

  const result = updated;

  logInfo('request_updated', { requestId: id, userId: user.userId, changes: Object.keys(updateData) });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result)
  };
}

/**
 * DELETE /api/requests/:id
 * Soft delete de solicitação (apenas admin)
 */
async function handleDelete(event, sql, user) {
  if (user.role !== 'admin') {
    throw validationError('Apenas administradores podem excluir solicitações');
  }

  const id = event.path.split('/').pop();

  const [request] = await sql`
    SELECT id FROM material_requests WHERE id = ${id} AND deleted_at IS NULL
  `;

  if (!request) {
    throw notFoundError('Solicitação');
  }

  // Soft delete
  await sql`
    UPDATE material_requests 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = ${id}
  `;

  // Registrar no histórico
  await sql`
    INSERT INTO request_history 
      (request_id, user_id, campo_alterado, valor_novo, acao)
    VALUES 
      (${id}, ${user.userId}, 'solicitação', 'excluída', 'cancelado')
  `;

  // Log de auditoria
  await sql`
    INSERT INTO audit_logs 
      (user_id, acao, tabela_afetada, registro_id, ip_address, user_agent)
    VALUES 
      (${user.userId}, 'request_deleted', 'material_requests', ${id},
       ${getClientIP(event)}, ${getUserAgent(event)})
  `;

  logInfo('request_deleted', { requestId: id, userId: user.userId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ success: true, message: 'Solicitação excluída' })
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

  // Roteamento
  const pathParts = event.path.split('/');
  const hasId = pathParts[pathParts.length - 1] && /^\d+$/.test(pathParts[pathParts.length - 1]);

  if (event.httpMethod === 'GET' && !hasId) {
    return await handleList(event, sql, user);
  }

  if (event.httpMethod === 'GET' && hasId) {
    return await handleGet(event, sql, user);
  }

  if (event.httpMethod === 'POST') {
    return await handleCreate(event, sql, user);
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

