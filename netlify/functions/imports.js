const { getDB } = require('./utils/db');
const { withErrorHandling, validationError } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');

// Garante que a tabela exista (idempotente)
async function ensureImportFilesTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS import_files (
      id BIGSERIAL PRIMARY KEY,
      batch_id BIGINT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
      original_filename TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      file_bytes BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      user_id BIGINT REFERENCES users(id)
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS uq_import_files_batch ON import_files(batch_id)`;
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const params = event.queryStringParameters || {};

  // Garantir tabela antes de usar em LEFT JOIN e downloads
  await ensureImportFilesTable(sql);

  // Listar lotes com info de arquivo original
  if (params.list) {
    const batches = await sql`
      SELECT 
        b.id,
        b.created_at,
        b.filename,
        b.success_rows AS success_count,
        b.error_rows AS error_count,
        u.name AS user_name,
        u.email AS user_email,
        (f.id IS NOT NULL) AS has_original
      FROM import_batches b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN import_files f ON f.batch_id = b.id
      ORDER BY b.created_at DESC
      LIMIT 200
    `;
    return { statusCode: 200, headers, body: JSON.stringify({ batches }) };
  }

  // Itens de um lote (requests ligados ao batch)
  if (params.batchId && !params.downloadOriginal) {
    const batchId = Number(params.batchId);
    const items = await sql`
      SELECT 
        r.id, r.material_code, r.material_description AS descricao, r.quantidade, r.unidade,
        r.urgencia, r.deadline AS prazo, r.created_at, r.status,
        r.requester_name AS solicitante
      FROM material_requests r
      WHERE r.batch_id = ${batchId} AND r.deleted_at IS NULL
      ORDER BY r.created_at DESC
    `;
    return { statusCode: 200, headers, body: JSON.stringify({ items }) };
  }

  // Download do original
  if (params.downloadOriginal && params.batchId) {
    const batchId = Number(params.batchId);
    const files = await sql`
      SELECT original_filename, mime_type, file_bytes
      FROM import_files
      WHERE batch_id = ${batchId}
      LIMIT 1
    `;
    const file = files[0];
    if (!file) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Arquivo não encontrado' }) };
    }
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': file.mime_type,
        'Content-Disposition': `attachment; filename="${file.original_filename}"`
      },
      body: Buffer.from(file.file_bytes).toString('base64'),
      isBase64Encoded: true
    };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'bad_request' }) };
});


