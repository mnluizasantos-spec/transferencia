const XLSX = require('xlsx');
const { getDB } = require('./utils/db');
const { withErrorHandling, validationError } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');

function parseQuantity(value) {
  const parsed = Math.ceil(Number(String(value ?? '').replace(/\./g, '').replace(',', '.')));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Quantidade inválida: ${value}`);
  }
  return parsed;
}

exports.handler = withErrorHandling(async (event) => {
  const sql = getDB();
  const user = await verifyToken(event, sql);
  if (user.role !== 'admin') {
    return { statusCode: 403, body: JSON.stringify({ error: 'forbidden' }) };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'method_not_allowed' }) };
  }

  const { batchId, dryRun } = JSON.parse(event.body || '{}');
  if (!batchId) {
    throw validationError('batchId é obrigatório');
  }

  // Buscar arquivo original
  const files = await sql`
    SELECT original_filename, mime_type, file_bytes
    FROM import_files
    WHERE batch_id = ${batchId}
    LIMIT 1
  `;
  const file = files[0];

  // Buscar requests do lote via request_history (ordem de criação)
  const requests = await sql`
    SELECT r.id, r.quantidade, r.material_code, r.material_description, r.created_at
    FROM material_requests r
    WHERE r.id IN (
      SELECT request_id FROM request_history 
      WHERE valor_novo LIKE ${'via Excel batch ' + batchId}
    )
    ORDER BY r.created_at ASC
  `;

  if (requests.length === 0) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Nenhuma solicitação encontrada para este lote' }) };
  }

  let preview = [];
  let meta = {};

  if (file) {
    // Caminho preciso usando arquivo original
    const workbook = XLSX.read(Buffer.from(file.file_bytes), { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Quantidades corrigidas por ordem
    const corrected = rows.map((r, idx) => ({
      index: idx,
      material: r.Material ?? r.material,
      descricao: r['Descrição'] ?? r['Descricao'] ?? r['descrição'] ?? r['descricao'],
      quantidadeCorrigida: parseQuantity(r.Quantidade ?? r.quantidade)
    }));

    const countMismatch = corrected.length !== requests.length;
    const limit = Math.min(corrected.length, requests.length);
    for (let i = 0; i < limit; i++) {
      const req = requests[i];
      const cor = corrected[i];
      if (Number(req.quantidade) !== Number(cor.quantidadeCorrigida)) {
        preview.push({
          requestId: req.id,
          from: Number(req.quantidade),
          to: Number(cor.quantidadeCorrigida),
          material_code: req.material_code,
          material_description: req.material_description
        });
      }
    }
    meta = { mode: 'from_file', totalRows: rows.length, totalRequests: requests.length, countMismatch };
  } else {
    // Caminho heurístico sem arquivo original
    // Regra por item: reduzir fator até o valor ficar razoável
    function heuristicFix(q) {
      const n = Number(q);
      if (!Number.isFinite(n) || n <= 0) return null;
      if (n >= 1_000_000) return Math.ceil(n / 1000);
      if (n >= 100_000) return Math.ceil(n / 100);
      if (n >= 10_000) return Math.ceil(n / 10);
      return n; // já parece razoável
    }
    for (const req of requests) {
      const fixed = heuristicFix(Number(req.quantidade));
      if (!fixed) continue;
      if (fixed !== Number(req.quantidade)) {
        preview.push({
          requestId: req.id,
          from: Number(req.quantidade),
          to: fixed,
          material_code: req.material_code,
          material_description: req.material_description
        });
      }
    }
    meta = { mode: 'heuristic', totalRequests: requests.length };
  }

  if (dryRun) {
    return { statusCode: 200, headers, body: JSON.stringify({ ...meta, changes: preview }) };
  }

  // Aplicar alterações
  for (const change of preview) {
    await sql`
      UPDATE material_requests SET quantidade = ${change.to}, updated_at = CURRENT_TIMESTAMP WHERE id = ${change.requestId}
    `;
    await sql`
      INSERT INTO request_history (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao)
      VALUES (${change.requestId}, ${user.userId}, 'quantidade', ${String(change.from)}, ${String(change.to)}, 'atualizado')
    `;
  }

  return { statusCode: 200, headers, body: JSON.stringify({ updated: preview.length, ...meta }) };
});


