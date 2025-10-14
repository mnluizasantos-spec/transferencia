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
    
    console.log('Requests List - Executando query');
    
    const userName = user.name || user.nome || 'Unknown';
    
    let requests;
    if (user.role === 'solicitante') {
      requests = await sql`
        SELECT 
          id,
          material_code,
          material_description,
          quantidade,
          unidade,
          requester_name,
          urgencia,
          status,
          created_at,
          updated_at
        FROM material_requests
        WHERE deleted_at IS NULL AND requester_name = ${userName}
        ORDER BY created_at DESC
        LIMIT 100
      `;
    } else {
      requests = await sql`
        SELECT 
          id,
          material_code,
          material_description,
          quantidade,
          unidade,
          requester_name,
          urgencia,
          status,
          created_at,
          updated_at
        FROM material_requests
        WHERE deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 100
      `;
    }
    
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
  const data = JSON.parse(event.body || '{}');
  
  // Validar dados
  const validatedData = validateRequestData(data, false);

  // Usar transação para garantir atomicidade
  const result = await sql.begin(async (tx) => {
    // 1. Criar solicitação
    const [newRequest] = await tx`
      INSERT INTO material_requests 
        (material_code, material_description, quantidade, justificativa, requester_name, urgencia, deadline, production_start_date, status, created_by)
      VALUES 
        (${validatedData.material_code}, ${validatedData.material_description}, ${validatedData.quantidade}, 
         ${validatedData.justificativa}, ${validatedData.requester_name}, ${validatedData.urgencia}, 
         ${validatedData.deadline}, ${validatedData.production_start_date}, 'Pendente', ${user.userId})
      RETURNING *
    `;

    // 2. Registrar no histórico
    await tx`
      INSERT INTO request_history 
        (request_id, user_id, campo_alterado, valor_novo, acao)
      VALUES 
        (${newRequest.id}, ${user.userId}, 'solicitação', 'criada', 'criado')
    `;

    // 3. Log de auditoria
    await tx`
      INSERT INTO audit_logs 
        (user_id, acao, tabela_afetada, registro_id, detalhes_json, ip_address, user_agent)
      VALUES 
        (${user.userId}, 'request_created', 'material_requests', ${newRequest.id}, 
         ${JSON.stringify({ material: newRequest.material, quantidade: newRequest.quantidade })}::jsonb,
         ${getClientIP(event)}, ${getUserAgent(event)})
    `;

    return newRequest;
  });

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
  if (user.role === 'solicitante' && currentRequest.requester_name !== user.name) {
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

  // Usar transação
  const result = await sql.begin(async (tx) => {
    // 1. Atualizar solicitação - construir query dinamicamente
    const updateFields = [];
    const updateValues = [];
    
    for (const [key, value] of Object.entries(updateData)) {
      updateFields.push(`${key} = $${updateFields.length + 1}`);
      updateValues.push(value);
    }
    
    updateValues.push(id); // Para o WHERE id = ?
    
    const query = `
      UPDATE material_requests 
      SET ${updateFields.join(', ')} 
      WHERE id = $${updateFields.length + 1} 
      RETURNING *
    `;
    
    const [updated] = await tx.unsafe(query, ...updateValues);

    // 2. Registrar mudanças no histórico
    for (const [campo, valorNovo] of Object.entries(updateData)) {
      const valorAnterior = currentRequest[campo];
      
      if (valorAnterior !== valorNovo) {
        const acao = campo === 'status' ? 'status_mudado' : 'atualizado';
        
        await tx`
          INSERT INTO request_history 
            (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao)
          VALUES 
            (${id}, ${user.userId}, ${campo}, ${String(valorAnterior)}, ${String(valorNovo)}, ${acao})
        `;
      }
    }

    // 3. Log de auditoria
    await tx`
      INSERT INTO audit_logs 
        (user_id, acao, tabela_afetada, registro_id, detalhes_json, ip_address, user_agent)
      VALUES 
        (${user.userId}, 'request_updated', 'material_requests', ${id}, 
         ${JSON.stringify(updateData)}::jsonb,
         ${getClientIP(event)}, ${getUserAgent(event)})
    `;

    return updated;
  });

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

  await sql.begin(async (tx) => {
    // Soft delete
    await tx`
      UPDATE material_requests 
      SET deleted_at = CURRENT_TIMESTAMP 
      WHERE id = ${id}
    `;

    // Registrar no histórico
    await tx`
      INSERT INTO request_history 
        (request_id, user_id, campo_alterado, valor_novo, acao)
      VALUES 
        (${id}, ${user.userId}, 'solicitação', 'excluída', 'cancelado')
    `;

    // Log de auditoria
    await tx`
      INSERT INTO audit_logs 
        (user_id, acao, tabela_afetada, registro_id, ip_address, user_agent)
      VALUES 
        (${user.userId}, 'request_deleted', 'material_requests', ${id},
         ${getClientIP(event)}, ${getUserAgent(event)})
    `;
  });

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

