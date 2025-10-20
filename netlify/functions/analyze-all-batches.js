/**
 * Análise Global de Todos os Batches
 * 
 * Identifica valores suspeitos em TODOS os batches de importação
 * Retorna relatório detalhado sem fazer alterações (dry-run)
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

/**
 * Detecta se uma quantidade é suspeita (provavelmente multiplicada por 100)
 */
function isSuspicious(quantidade) {
  // Valor muito grande
  if (quantidade > 50000) return true;
  
  // Múltiplo suspeito de 1000 (ex: 89022, 155564)
  if (quantidade > 10000 && quantidade % 1000 < 100) return true;
  
  // Padrão específico: termina com 2+ zeros e tem 5+ dígitos
  if (quantidade >= 10000 && quantidade % 100 === 0) return true;
  
  // Valores que parecem multiplicados por 100
  if (quantidade > 1000 && quantidade % 100 === 0 && quantidade < 1000000) return true;
  
  return false;
}

/**
 * Sugere correção para valor suspeito
 */
function suggestCorrection(quantidade) {
  // Dividir por 100 e arredondar
  const corrected = Math.round(quantidade / 100);
  
  // Se o valor corrigido for muito pequeno (< 1), talvez não seja multiplicado por 100
  if (corrected < 1) {
    return null; // Não sugerir correção
  }
  
  return corrected;
}

/**
 * Analisa todos os batches e identifica valores suspeitos
 */
async function analyzeAllBatches(sql) {
  console.log('🔍 Iniciando análise global de todos os batches...');
  
  // Buscar todos os batches
  const batches = await sql`
    SELECT id, created_at, total_requests, successful_requests, failed_requests
    FROM import_batches 
    ORDER BY id DESC
  `;
  
  console.log(`📊 Encontrados ${batches.length} batches`);
  
  const analysis = {
    totalBatches: batches.length,
    totalRequests: 0,
    suspiciousRequests: 0,
    byBatch: {},
    globalStats: {
      batchesWithIssues: 0,
      totalCorrections: 0,
      averageSuspiciousPerBatch: 0
    }
  };
  
  // Analisar cada batch
  for (const batch of batches) {
    console.log(`\n📋 Analisando batch ${batch.id}...`);
    
    // Buscar solicitações do batch (período de 24h após criação)
    const startTime = new Date(batch.created_at);
    const endTime = new Date(batch.created_at.getTime() + 24 * 60 * 60 * 1000);
    
    const requests = await sql`
      SELECT id, quantidade, material_code, material_description, created_at
      FROM material_requests 
      WHERE created_at >= ${startTime}
      AND created_at <= ${endTime}
      ORDER BY id
    `;
    
    console.log(`   📝 ${requests.length} solicitações no período`);
    
    // Identificar valores suspeitos
    const suspiciousRequests = [];
    
    for (const request of requests) {
      if (isSuspicious(request.quantidade)) {
        const suggested = suggestCorrection(request.quantidade);
        
        if (suggested !== null) {
          suspiciousRequests.push({
            id: request.id,
            current: request.quantidade,
            suggested: suggested,
            material_code: request.material_code,
            material_description: request.material_description,
            reason: `Detectado: ${request.quantidade} → ${suggested} (÷100)`
          });
        }
      }
    }
    
    // Adicionar ao relatório se houver valores suspeitos
    if (suspiciousRequests.length > 0) {
      analysis.byBatch[batch.id] = {
        batchInfo: {
          id: batch.id,
          created_at: batch.created_at,
          total_requests: batch.total_requests,
          successful_requests: batch.successful_requests
        },
        suspicious: suspiciousRequests.length,
        corrections: suspiciousRequests
      };
      
      analysis.globalStats.batchesWithIssues++;
      analysis.globalStats.totalCorrections += suspiciousRequests.length;
      
      console.log(`   ⚠️  ${suspiciousRequests.length} valores suspeitos encontrados`);
    } else {
      console.log(`   ✅ Nenhum valor suspeito encontrado`);
    }
    
    analysis.totalRequests += requests.length;
    analysis.suspiciousRequests += suspiciousRequests.length;
  }
  
  // Calcular estatísticas finais
  analysis.globalStats.averageSuspiciousPerBatch = analysis.globalStats.batchesWithIssues > 0 
    ? Math.round(analysis.globalStats.totalCorrections / analysis.globalStats.batchesWithIssues)
    : 0;
  
  console.log(`\n📊 ANÁLISE CONCLUÍDA:`);
  console.log(`   Total de batches: ${analysis.totalBatches}`);
  console.log(`   Batches com problemas: ${analysis.globalStats.batchesWithIssues}`);
  console.log(`   Total de correções: ${analysis.globalStats.totalCorrections}`);
  
  return analysis;
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    const sql = getDB();
    const analysis = await analyzeAllBatches(sql);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Análise global concluída',
        analysis: analysis,
        instructions: {
          next: 'Para aplicar correções, use: POST /.netlify/functions/fix-all-batches?confirm=true',
          warning: 'Esta é apenas uma análise (dry-run). Nenhum dado foi alterado.'
        }
      }, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Erro na análise global:', error);
    
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
