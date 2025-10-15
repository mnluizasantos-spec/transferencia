/**
 * Print API
 * Geração de PDFs para lista de separação
 * 
 * Nota: Para produção, considerar usar puppeteer ou pdfkit
 * Esta implementação gera HTML otimizado para impressão
 */

const { getDB } = require('./utils/db');
const { withErrorHandling, validationError, notFoundError } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');
const { logInfo, logAudit } = require('./utils/logger');
const { getClientIP, getUserAgent } = require('./utils/validators');

/**
 * Gera HTML otimizado para impressão
 */
function generatePrintHTML(requests, user, options = {}) {
  const { title = 'Lista de Separação', showCheckboxes = true } = options;
  
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const agora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });

  // Ordenar: urgentes primeiro, depois por prazo
  const sorted = requests.sort((a, b) => {
    if (a.urgencia === 'Urgente' && b.urgencia !== 'Urgente') return -1;
    if (a.urgencia !== 'Urgente' && b.urgencia === 'Urgente') return 1;
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    return 0;
  });

  const rows = sorted.map((req, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td class="center"><strong>#${req.id}</strong></td>
      <td class="center">
        <span class="badge ${req.urgencia.toLowerCase()}">${req.urgencia}</span>
      </td>
      <td>
        <strong>${req.material_code}</strong>
        ${req.justificativa ? `<br><small>${req.justificativa}</small>` : ''}
      </td>
      <td class="center">${req.quantidade}</td>
      <td>${req.material_description}</td>
      <td class="center">${req.deadline ? new Date(req.deadline).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}</td>
      ${showCheckboxes ? `
      <td class="center checkbox-col">☐</td>
      <td class="center checkbox-col">☐</td>
      <td class="center checkbox-col">☐</td>
      ` : ''}
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }

    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }

    .header h1 {
      font-size: 18pt;
      margin-bottom: 5px;
    }

    .header-info {
      font-size: 10pt;
      color: #333;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }

    th, td {
      border: 1px solid #000;
      padding: 8px 6px;
      text-align: left;
    }

    th {
      background-color: #e0e0e0;
      font-weight: bold;
      font-size: 10pt;
      text-transform: uppercase;
    }

    td {
      font-size: 10pt;
    }

    .center {
      text-align: center;
    }

    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 3px;
      font-weight: bold;
      font-size: 9pt;
    }

    .badge.urgente {
      background-color: #ffcccc;
      color: #cc0000;
      border: 1px solid #cc0000;
    }

    .badge.normal {
      background-color: #e0e0e0;
      color: #666;
      border: 1px solid #999;
    }

    .checkbox-col {
      width: 40px;
      font-size: 16pt;
    }

    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 1px solid #666;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
    }

    .signature-area {
      margin-top: 40px;
    }

    .signature-line {
      border-top: 1px solid #000;
      width: 300px;
      margin: 40px auto 5px;
      text-align: center;
    }

    .obs-area {
      margin-top: 20px;
      border: 1px solid #000;
      padding: 10px;
      min-height: 80px;
    }

    .obs-area strong {
      display: block;
      margin-bottom: 5px;
    }

    small {
      font-size: 9pt;
      color: #666;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }

      .no-print {
        display: none;
      }

      @page {
        margin: 15mm;
      }
    }

    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .print-button:hover {
      background: #5568d3;
    }
  </style>
</head>
<body>
  <button class="print-button no-print" onclick="window.print()">🖨️ Imprimir</button>

  <div class="header">
    <h1>${title}</h1>
    <div class="header-info">
      <strong>Data:</strong> ${hoje} às ${agora} | 
      <strong>Separador:</strong> ${user.nome} | 
      <strong>Total de Itens:</strong> ${requests.length}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="center">#</th>
        <th class="center">ID</th>
        <th class="center">Urgência</th>
        <th>Código</th>
        <th class="center">Qtd</th>
        <th>Descrição</th>
        <th class="center">Prazo</th>
        ${showCheckboxes ? `
        <th class="center checkbox-col">Sep</th>
        <th class="center checkbox-col">Conf</th>
        <th class="center checkbox-col">Desp</th>
        ` : ''}
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="obs-area">
    <strong>Observações:</strong>
    <br><br><br>
  </div>

  <div class="signature-area">
    <div class="signature-line">
      Assinatura do Separador
    </div>
  </div>

  <div class="footer">
    <div>
      <strong>Sistema de Transferência de Material Intercompany</strong><br>
      Gerado automaticamente em ${hoje} às ${agora}
    </div>
    <div style="text-align: right;">
      <strong>Página 1</strong><br>
      Total: ${requests.length} item(ns)
    </div>
  </div>

  <script>
    // Auto-print quando abrir (opcional)
    // window.onload = () => setTimeout(() => window.print(), 500);
  </script>
</body>
</html>
  `;
}

/**
 * POST /api/print/picking-list
 * Gera lista de separação com IDs selecionados
 */
async function handlePickingList(event, sql, user) {
  const { requestIds } = JSON.parse(event.body || '{}');

  if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
    throw validationError('IDs de solicitações são obrigatórios');
  }

  if (requestIds.length > 100) {
    throw validationError('Máximo de 100 solicitações por vez');
  }

  // Buscar solicitações
  const requests = await sql`
    SELECT 
      mr.*,
      mr.requester_name as solicitante_nome
    FROM material_requests mr
    WHERE mr.id = ANY(${requestIds})
    AND mr.deleted_at IS NULL
  `;

  if (requests.length === 0) {
    throw notFoundError('Solicitações');
  }

  // Filtrar por permissão (solicitantes só veem suas próprias)
  const filtered = user.role === 'solicitante'
    ? requests.filter(r => r.created_by === user.userId)
    : requests;

  if (filtered.length === 0) {
    throw notFoundError('Solicitações');
  }

  // Gerar HTML
  const html = generatePrintHTML(filtered, user, {
    title: 'Lista de Separação de Material',
    showCheckboxes: true
  });

  // Registrar impressão na auditoria
  await logAudit(
    sql,
    user.userId,
    'print_picking_list',
    'material_requests',
    null,
    { requestIds: filtered.map(r => r.id), count: filtered.length },
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('picking_list_printed', { userId: user.userId, count: filtered.length });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*'
    },
    body: html
  };
}

/**
 * POST /api/print/single
 * Gera PDF de uma solicitação individual
 */
async function handleSingleRequest(event, sql, user) {
  const { requestId } = JSON.parse(event.body || '{}');

  if (!requestId) {
    throw validationError('ID da solicitação é obrigatório');
  }

  // Buscar solicitação
  const [request] = await sql`
    SELECT 
      mr.*,
      mr.requester_name as solicitante_nome,
      u_creator.nome as criado_por_nome
    FROM material_requests mr
    LEFT JOIN users u_creator ON mr.created_by = u_creator.id
    WHERE mr.id = ${requestId} AND mr.deleted_at IS NULL
  `;

  if (!request) {
    throw notFoundError('Solicitação');
  }

  // Verificar permissão
  if (user.role === 'solicitante' && request.created_by !== user.userId) {
    throw notFoundError('Solicitação');
  }

  // Gerar HTML
  const html = generatePrintHTML([request], user, {
    title: `Solicitação #${request.id}`,
    showCheckboxes: true
  });

  // Registrar impressão
  await logAudit(
    sql,
    user.userId,
    'print_single_request',
    'material_requests',
    requestId,
    {},
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('single_request_printed', { userId: user.userId, requestId });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
      'Access-Control-Allow-Origin': '*'
    },
    body: html
  };
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  const sql = getDB();
  const user = await verifyToken(event, sql);

  const path = event.path.replace('/.netlify/functions/print', '').replace('/api/print', '') || '/';

  if (path === '/picking-list') {
    return await handlePickingList(event, sql, user);
  }

  if (path === '/single') {
    return await handleSingleRequest(event, sql, user);
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Rota não encontrada' })
  };
});

