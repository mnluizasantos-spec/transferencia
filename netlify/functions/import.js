/**
 * Import API
 * Importação em massa via Excel/CSV
 */

const XLSX = require('xlsx');
const { getDB } = require('./utils/db');
const { withErrorHandling, validationError } = require('./utils/errorHandler');
const { verifyToken, requireRole } = require('./utils/middleware');
const { validateImportRow, validateFileSize, getClientIP, getUserAgent, parseBrazilianDate, parseExcelDate } = require('./utils/validators');
const { logInfo, logAudit } = require('./utils/logger');

/**
 * Função robusta para parsing de quantidades
 * Detecta formato brasileiro vs internacional e converte corretamente
 * @param {any} value - Valor da quantidade (pode ser string ou número)
 * @returns {number} Quantidade convertida e arredondada para cima
 */
function parseQuantity(value) {
  // Converter para string e limpar
  let str = String(value).trim();
  
  // Remover espaços
  str = str.replace(/\s/g, '');
  
  // Log do valor original
  console.log(`🔍 Parsing quantidade: "${value}" → "${str}"`);
  
  // Se for apenas número sem separadores, retornar direto
  if (/^\d+$/.test(str)) {
    const num = parseInt(str, 10);
    console.log(`✅ Número inteiro: ${num}`);
    return num;
  }
  
  // Detectar formato
  const hasComma = str.includes(',');
  const hasDot = str.includes('.');
  
  if (hasComma && hasDot) {
    // Tem ambos - determinar qual é decimal
    const lastComma = str.lastIndexOf(',');
    const lastDot = str.lastIndexOf('.');
    
    if (lastComma > lastDot) {
      // BR: 1.234,56 - vírgula é decimal, ponto é separador de milhar
      str = str.replace(/\./g, '').replace(',', '.');
      console.log(`🇧🇷 Formato BR detectado: ${str}`);
    } else {
      // US: 1,234.56 - vírgula é separador de milhar, ponto é decimal
      str = str.replace(/,/g, '');
      console.log(`🇺🇸 Formato US detectado: ${str}`);
    }
  } else if (hasComma) {
    // Só vírgula - assumir decimal brasileiro
    str = str.replace(',', '.');
    console.log(`🇧🇷 Apenas vírgula (decimal BR): ${str}`);
  } else if (hasDot) {
    // Só ponto - pode ser decimal ou separador de milhar
    // Se tem mais de 2 dígitos após o ponto, provavelmente é separador de milhar
    const parts = str.split('.');
    if (parts.length === 2 && parts[1].length > 2) {
      // Separador de milhar: 1.234 → 1234
      str = str.replace(/\./g, '');
      console.log(`🔢 Separador de milhar: ${str}`);
    } else {
      // Decimal: 123.45 → 123.45
      console.log(`🔢 Decimal: ${str}`);
    }
  }
  
  const num = Number(str);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error(`Valor inválido: ${value} → ${str}`);
  }
  
  const result = Math.ceil(num);
  console.log(`✅ Resultado final: ${num} → ${result}`);
  
  // Alertar se valor mudou drasticamente (possível erro)
  const originalNum = Number(String(value).replace(/[^\d,.-]/g, '').replace(',', '.'));
  if (originalNum > 0 && (result / originalNum > 10 || originalNum / result > 10)) {
    console.warn(`⚠️  ATENÇÃO: Conversão suspeita! Original: ${value} → ${result} (${originalNum} → ${result})`);
  }
  
  return result;
}

// Garantir que a tabela import_files exista (criação leve, idempotente)
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

/**
 * GET /api/import/template
 * Gera e retorna template Excel para download
 */
async function handleGetTemplate(event) {
  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Aba de dados
  const wsData = XLSX.utils.aoa_to_sheet([
    ['Material', 'Descrição', 'Quantidade', 'Unidade', 'Solicitante', 'Urgencia', 'Prazo', 'Justificativa'],
    ['MP001', 'Matéria-Prima X123 - Aço inoxidável', '100', 'kg', 'João Silva', 'Normal', '20/10/2025', 'Exemplo de justificativa'],
    ['COMP002', 'Componente Y456 - Parafuso M8x20', '250', 'pc', 'Maria Santos', 'Urgente', '14/10/2025', 'Produção urgente']
  ]);

  XLSX.utils.book_append_sheet(wb, wsData, 'Solicitações');

  // Aba de instruções
  const wsInstructions = XLSX.utils.aoa_to_sheet([
    ['INSTRUÇÕES PARA IMPORTAÇÃO'],
    [''],
    ['1. Preencha as colunas conforme o exemplo fornecido'],
    ['2. Campos obrigatórios: Material, Descrição, Quantidade, Unidade, Solicitante, Prazo'],
    ['3. Urgencia deve ser: "Normal" ou "Urgente"'],
    ['4. Datas no formato brasileiro: DD/MM/AAAA (ex: 20/10/2025)'],
    ['5. Quantidade deve ser um número inteiro positivo'],
    ['6. Unidade deve ser: "kg", "pc", "m", "l", etc.'],
    ['7. Máximo de 1000 linhas por importação'],
    [''],
    ['DESCRIÇÃO DOS CAMPOS:'],
    [''],
    ['Material: Código do material (obrigatório)'],
    ['Descrição: Descrição detalhada do material (obrigatório)'],
    ['Quantidade: Quantidade numérica (obrigatório)'],
    ['Unidade: Unidade de medida - kg, pc, m, l, etc. (obrigatório)'],
    ['Solicitante: Nome do solicitante (obrigatório)'],
    ['Urgencia: Normal ou Urgente (opcional, padrão: Normal)'],
    ['Prazo: Data limite para separação (obrigatório)'],
    ['Justificativa: Motivo da solicitação (opcional)']
  ]);

  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instruções');

  // Converter para buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="template_solicitacoes.xlsx"',
      'Access-Control-Allow-Origin': '*'
    },
    body: buffer.toString('base64'),
    isBase64Encoded: true
  };
}

/**
 * POST /api/import/validate
 * Valida arquivo Excel sem importar
 */
async function handleValidate(event, sql, user) {
  const contentType = event.headers['content-type'] || '';
  
  if (!contentType.includes('multipart/form-data') && !event.body) {
    throw validationError('Arquivo não fornecido');
  }

  // Parsear arquivo do body (base64)
  let fileBuffer;
  try {
    fileBuffer = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  } catch (error) {
    throw validationError('Formato de arquivo inválido');
  }

  // Validar tamanho
  validateFileSize(fileBuffer.length);

  // Ler Excel
  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (error) {
    throw validationError('Não foi possível ler o arquivo Excel');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: true });

  if (data.length === 0) {
    throw validationError('Arquivo vazio');
  }

  if (data.length > 1000) {
    throw validationError('Máximo de 1000 linhas por importação');
  }

  // Validar cada linha
  const validRows = [];
  const errors = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2; // +2 porque linha 1 é cabeçalho e array é 0-based

    const rowErrors = validateImportRow(row, rowNumber);
    
    if (rowErrors.length > 0) {
      errors.push(...rowErrors);
    } else {
      validRows.push({
        rowNumber,
        material_code: row.Material || row.material,
        material_description: row.Descrição || row.Descricao || row.descrição || row.descricao,
        quantidade: parseInt(row.Quantidade || row.quantidade, 10),
        unidade: row.Unidade || row.unidade,
        solicitante: row.Solicitante || row.solicitante,
        urgencia: row.Urgencia || row.urgencia || 'Normal',
        prazo: row.Prazo || row.prazo || null,
        inicio_producao: row['Inicio Producao'] || row.inicio_producao || null,
        justificativa: row.Justificativa || row.justificativa || null
      });
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      totalRows: data.length,
      validRows: validRows.length,
      invalidRows: errors.length,
      errors,
      preview: validRows.slice(0, 10) // Primeiras 10 linhas válidas
    })
  };
}

/**
 * POST /api/import/execute
 * Executa importação em massa
 */
async function handleExecute(event, sql, user) {
  requireRole(user, ['admin', 'solicitante']);

  // Parsear JSON body
  const requestBody = JSON.parse(event.body || '{}');
  
  if (!requestBody.file) {
    throw validationError('Arquivo não fornecido');
  }

  // Converter base64 para buffer
  let fileBuffer;
  try {
    fileBuffer = Buffer.from(requestBody.file, 'base64');
  } catch (error) {
    throw validationError('Formato de arquivo inválido');
  }

  validateFileSize(fileBuffer.length);

  // Ler Excel
  let workbook;
  try {
    workbook = XLSX.read(fileBuffer, { type: 'buffer' });
  } catch (error) {
    throw validationError('Não foi possível ler o arquivo Excel');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { raw: true });

  if (data.length === 0) {
    throw validationError('Arquivo vazio');
  }

  if (data.length > 1000) {
    throw validationError('Máximo de 1000 linhas por importação');
  }

  // Iniciar batch de importação
  const [batch] = await sql`
    INSERT INTO import_batches 
      (user_id, filename, total_rows, status)
    VALUES 
      (${user.userId}, ${requestBody.filename || 'import.xlsx'}, ${data.length}, 'processing')
    RETURNING id
  `;

  const batchId = batch.id;
  
  // Salvar arquivo original no Neon (tabela import_files)
  try {
    await ensureImportFilesTable(sql);
    // Definir MIME simples por extensão
    const filename = requestBody.filename || 'import.xlsx';
    const lower = filename.toLowerCase();
    const mime = lower.endsWith('.xlsx') || lower.endsWith('.xls')
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/octet-stream';
    await sql`
      INSERT INTO import_files (batch_id, original_filename, mime_type, size_bytes, file_bytes, user_id)
      VALUES (${batchId}, ${filename}, ${mime}, ${fileBuffer.length}, ${fileBuffer}, ${user.userId})
      ON CONFLICT (batch_id) DO NOTHING
    `;
  } catch (e) {
    console.warn('Não foi possível salvar arquivo original do lote', { error: e?.message });
    // Continua import normalmente mesmo se falhar o save do arquivo
  }
  let successCount = 0;
  let errorCount = 0;
  const importErrors = [];

  // Processar cada linha (sem transação devido ao Neon serverless)
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNumber = i + 2;

    console.log(`Processando linha ${rowNumber}:`, JSON.stringify(row, null, 2));

    try {
      const rowErrors = validateImportRow(row, rowNumber);
      
      if (rowErrors.length > 0) {
        console.error(`Erros de validação na linha ${rowNumber}:`, rowErrors);
        throw new Error(rowErrors.join('; '));
      }

      // Usar nome do solicitante diretamente do Excel
      const solicitanteName = row.Solicitante || row.solicitante;

      // Usar função robusta de parsing de quantidade
      const rawQty = row.Quantidade ?? row.quantidade ?? '';
      const parsedQty = parseQuantity(rawQty);
      
      if (parsedQty <= 0) {
        throw new Error(`Quantidade inválida: ${rawQty}`);
      }

      // Criar solicitação
      const [request] = await sql`
        INSERT INTO material_requests 
          (material_code, material_description, quantidade, unidade, justificativa, requester_name, urgencia, deadline, status, created_by)
        VALUES 
          (${row.Material || row.material},
           ${row.Descrição || row.Descricao || row.descrição || row.descricao},
           ${parsedQty},
           ${row.Unidade || row.unidade || 'pc'},
           ${row.Justificativa || row.justificativa || null},
           ${solicitanteName},
           ${row.Urgencia || row.urgencia || 'Normal'},
           ${parseExcelDate(row.Prazo || row.prazo)},
           'Pendente',
           ${user.userId})
        RETURNING id
      `;

      // Registrar no histórico
      await sql`
        INSERT INTO request_history 
          (request_id, user_id, campo_alterado, valor_novo, acao)
        VALUES 
          (${request.id}, ${user.userId}, 'importação', ${'via Excel batch ' + batchId}, 'criado')
      `;

      successCount++;
      console.log(`✅ Linha ${rowNumber} importada com sucesso`);

    } catch (error) {
      errorCount++;
      console.error(`❌ Erro na linha ${rowNumber}:`, error.message);
      importErrors.push({
        row: rowNumber,
        error: error.message
      });
      // Continue com próxima linha
    }
  }

  // Atualizar batch como completo
  await sql`
    UPDATE import_batches
    SET 
      status = 'completed',
      success_rows = ${successCount},
      error_rows = ${errorCount},
      errors_json = ${JSON.stringify(importErrors)}::jsonb,
      completed_at = CURRENT_TIMESTAMP
    WHERE id = ${batchId}
  `;

  // Log de auditoria
  await logAudit(
    sql,
    user.userId,
    'import_executed',
    'import_batches',
    batchId,
    { successCount, errorCount, totalRows: data.length },
    getClientIP(event),
    getUserAgent(event)
  );

  logInfo('import_completed', { batchId, successCount, errorCount, userId: user.userId });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      success: true,
      batchId,
      imported: successCount,
      errors: errorCount,
      total: data.length,
      details: importErrors
    })
  };
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/import', '').replace('/api/import', '') || '/';

  // Template é público
  if (path === '/template' && event.httpMethod === 'GET') {
    return await handleGetTemplate(event);
  }

  // Outras rotas requerem autenticação
  const sql = getDB();
  const user = await verifyToken(event, sql);

  if (path === '/validate' && event.httpMethod === 'POST') {
    return await handleValidate(event, sql, user);
  }

  if (path === '/execute' && event.httpMethod === 'POST') {
    return await handleExecute(event, sql, user);
  }

  return {
    statusCode: 404,
    headers,
    body: JSON.stringify({ error: 'Rota não encontrada' })
  };
});

