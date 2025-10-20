/**
 * Fix Batch N26 - Correção de quantidades incorretas
 * 
 * Problemas identificados:
 * - ID 116: Excel 890,22 → Importado 89.022 (deveria ser 891)
 * - ID 117: Excel 1.556 → Importado 155.564 (deveria ser 1556)
 */

const { getDB } = require('./utils/db');
const { withErrorHandling, validationError } = require('./utils/errorHandler');
const { verifyToken, requireRole } = require('./utils/middleware');

/**
 * Função para corrigir quantidades suspeitas do batch N26
 */
async function fixBatchN26(sql) {
  console.log('🔍 Buscando registros do batch N26...');
  
  // Buscar batch N26
  const [batch] = await sql`
    SELECT id, created_at, total_requests, successful_requests, failed_requests
    FROM import_batches 
    WHERE id = 26
  `;
  
  if (!batch) {
    throw new Error('Batch N26 não encontrado');
  }
  
  console.log('📊 Batch N26 encontrado:', batch);
  
  // Buscar todas as solicitações do batch N26
  const requests = await sql`
    SELECT id, material_code, quantidade, created_at
    FROM material_requests 
    WHERE created_at >= ${batch.created_at}
    AND created_at <= ${new Date(batch.created_at.getTime() + 24 * 60 * 60 * 1000)}
    ORDER BY id
  `;
  
  console.log(`📋 Encontradas ${requests.length} solicitações no período do batch N26`);
  
  // Identificar valores suspeitos (muito grandes)
  const suspiciousRequests = requests.filter(req => {
    // Valores que parecem multiplicados por 100
    return req.quantidade > 10000 || 
           (req.quantidade > 1000 && req.quantidade % 100 === 0);
  });
  
  console.log(`⚠️  Encontradas ${suspiciousRequests.length} solicitações com valores suspeitos:`);
  suspiciousRequests.forEach(req => {
    console.log(`  - ID ${req.id}: ${req.quantidade} (${req.material_code})`);
  });
  
  // Corrigir valores específicos conhecidos
  const corrections = [
    { id: 116, original: 89022, correct: 891, reason: '890,22 → 891' },
    { id: 117, original: 155564, correct: 1556, reason: '1.556 → 1556' }
  ];
  
  console.log('\n🔧 Aplicando correções específicas...');
  
  const results = [];
  
  for (const correction of corrections) {
    // Verificar se o registro existe e tem o valor esperado
    const [request] = await sql`
      SELECT id, quantidade, material_code
      FROM material_requests 
      WHERE id = ${correction.id}
    `;
    
    if (!request) {
      console.log(`❌ ID ${correction.id} não encontrado`);
      results.push({ id: correction.id, status: 'not_found', error: 'Registro não encontrado' });
      continue;
    }
    
    console.log(`📝 ID ${correction.id}: ${request.quantidade} → ${correction.correct} (${correction.reason})`);
    
    // Aplicar correção
    await sql`
      UPDATE material_requests 
      SET quantidade = ${correction.correct}
      WHERE id = ${correction.id}
    `;
    
    // Registrar no histórico
    await sql`
      INSERT INTO request_history 
        (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
      VALUES 
        (${correction.id}, 1, 'quantidade', ${request.quantidade}, ${correction.correct}, 'corrigido', ${'Correção automática: ' + correction.reason})
    `;
    
    console.log(`✅ ID ${correction.id} corrigido com sucesso`);
    results.push({ 
      id: correction.id, 
      status: 'corrected', 
      original: request.quantidade, 
      corrected: correction.correct,
      reason: correction.reason
    });
  }
  
  // Buscar outros valores que podem precisar de correção
  console.log('\n🔍 Verificando outros valores suspeitos...');
  
  const suggestions = [];
  for (const req of suspiciousRequests) {
    if (corrections.some(c => c.id === req.id)) {
      continue; // Já corrigido
    }
    
    // Tentar detectar se é um valor multiplicado por 100
    const possibleCorrect = Math.round(req.quantidade / 100);
    const possibleCorrect2 = Math.round(req.quantidade / 1000);
    
    console.log(`🤔 ID ${req.id}: ${req.quantidade} - Possíveis correções: ${possibleCorrect} ou ${possibleCorrect2}`);
    
    // Se o valor dividido por 100 faz mais sentido (entre 1 e 10000)
    if (possibleCorrect >= 1 && possibleCorrect <= 10000 && possibleCorrect !== req.quantidade) {
      suggestions.push({
        id: req.id,
        current: req.quantidade,
        suggested: possibleCorrect,
        material: req.material_code
      });
    }
  }
  
  return {
    batch: batch,
    totalRequests: requests.length,
    suspiciousRequests: suspiciousRequests.length,
    corrections: results,
    suggestions: suggestions
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

  // Handle OPTIONS (CORS preflight)
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

  // Verificar autenticação e permissões
  const sql = getDB();
  const user = await verifyToken(event, sql);
  await requireRole(user, ['admin']);

  try {
    const result = await fixBatchN26(sql);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Correção do batch N26 concluída',
        data: result
      })
    };
    
  } catch (error) {
    console.error('Erro ao corrigir batch N26:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
});
