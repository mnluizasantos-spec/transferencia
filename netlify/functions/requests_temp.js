/**
 * Requests API - VERSÃO TEMPORÁRIA
 * Usando apenas colunas que sabemos que existem
 */

const { getDB } = require('./utils/db');
const { logInfo, logAudit } = require('./utils/logger');
const { withErrorHandling, validationError, notFoundError } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');
const { validateRequestData, getClientIP, getUserAgent } = require('./utils/validators');

/**
 * GET /api/requests
 * Lista solicitações - VERSÃO SIMPLIFICADA
 */
async function handleList(event, sql, user) {
  const params = event.queryStringParameters || {};
  
  // Query simplificada
  const requests = await sql`
    SELECT 
      mr.*,
      mr.requester_name as solicitante_nome
    FROM material_requests mr
    WHERE mr.deleted_at IS NULL
    ${user.role === 'solicitante' ? sql`AND mr.requester_name = ${user.name}` : sql``}
    ORDER BY 
      CASE WHEN mr.urgencia = 'Urgente' THEN 0 ELSE 1 END,
      mr.created_at DESC
    LIMIT 100
  `;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requests)
  };
}

/**
 * GET /api/requests/:id
 * Busca uma solicitação específica - VERSÃO SIMPLIFICADA
 */
async function handleGet(event, sql, user) {
  const id = event.path.split('/').pop();

  const [request] = await sql`
    SELECT 
      mr.*,
      mr.requester_name as solicitante_nome
    FROM material_requests mr
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
 * Criar solicitação - VERSÃO SIMPLIFICADA
 */
async function handleCreate(event, sql, user) {
  const data = JSON.parse(event.body || '{}');
  
  // Dados básicos obrigatórios
  if (!data.material_code || !data.material_description || !data.quantidade || !data.requester_name) {
    throw validationError('Dados obrigatórios: material_code, material_description, quantidade, requester_name');
  }

  const [newRequest] = await sql`
    INSERT INTO material_requests 
      (material_code, material_description, quantidade, unidade, requester_name, urgencia, status, created_by)
    VALUES 
      (${data.material_code}, 
       ${data.material_description}, 
       ${parseInt(data.quantidade)}, 
       ${data.unidade || 'pc'}, 
       ${data.requester_name}, 
       ${data.urgencia || 'Normal'}, 
       'Pendente', 
       ${user.userId})
    RETURNING *
  `;

  return {
    statusCode: 201,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRequest)
  };
}

exports.handler = withErrorHandling(async (event, sql, user) => {
  const method = event.httpMethod;
  const path = event.path.replace('/.netlify/functions/requests', '');
  
  switch (method) {
    case 'GET':
      if (path === '' || path === '/') {
        return handleList(event, sql, user);
      } else {
        return handleGet(event, sql, user);
      }
    case 'POST':
      return handleCreate(event, sql, user);
    default:
      return {
        statusCode: 405,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Método não permitido' })
      };
  }
}, verifyToken);

