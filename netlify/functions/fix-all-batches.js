/**
 * Correção Automática de Todos os Batches
 * 
 * Aplica correções em TODOS os valores suspeitos identificados
 * Requer confirmação explícita via ?confirm=true
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
 * Aplica correções em todos os batches
 */
async function fixAllBatches(sql) {
  console.log('🔧 Iniciando correção automática de todos os batches...');
  
  // Buscar todos os batches
  const batches = await sql`
    SELECT id, created_at, total_requests, successful_requests, failed_requests
    FROM import_batches 
    ORDER BY id DESC
  `;
  
  console.log(`📊 Processando ${batches.length} batches...`);
  
  const results = {
    totalBatches: batches.length,
    batchesProcessed: 0,
    batchesWithCorrections: 0,
    totalCorrections: 0,
    totalErrors: 0,
    byBatch: {},
    corrections: [],
    errors: []
  };
  
  // Processar cada batch
  for (const batch of batches) {
    console.log(`\n📋 Processando batch ${batch.id}...`);
    
    try {
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
      
      console.log(`   📝 ${requests.length} solicitações encontradas`);
      
      // Identificar e corrigir valores suspeitos
      const batchCorrections = [];
      const batchErrors = [];
      
      for (const request of requests) {
        if (isSuspicious(request.quantidade)) {
          const suggested = suggestCorrection(request.quantidade);
          
          if (suggested !== null) {
            try {
              console.log(`   🔧 Corrigindo ID ${request.id}: ${request.quantidade} → ${suggested}`);
              
              // Aplicar correção
              await sql`
                UPDATE material_requests 
                SET quantidade = ${suggested}
                WHERE id = ${request.id}
              `;
              
              // Registrar no histórico
              await sql`
                INSERT INTO request_history 
                  (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
                VALUES 
                  (${request.id}, 1, 'quantidade', ${request.quantidade}, ${suggested}, 'corrigido', ${'Correção automática: ' + request.quantidade + ' → ' + suggested + ' (÷100)'})
              `;
              
              batchCorrections.push({
                id: request.id,
                original: request.quantidade,
                corrected: suggested,
                material_code: request.material_code,
                material_description: request.material_description
              });
              
              results.totalCorrections++;
              
            } catch (error) {
              console.error(`   ❌ Erro ao corrigir ID ${request.id}:`, error);
              batchErrors.push({
                id: request.id,
                error: error.message,
                material_code: request.material_code
              });
              results.totalErrors++;
            }
          }
        }
      }
      
      // Adicionar resultados do batch
      if (batchCorrections.length > 0 || batchErrors.length > 0) {
        results.byBatch[batch.id] = {
          batchInfo: {
            id: batch.id,
            created_at: batch.created_at,
            total_requests: batch.total_requests
          },
          corrections: batchCorrections,
          errors: batchErrors,
          summary: {
            corrections: batchCorrections.length,
            errors: batchErrors.length
          }
        };
        
        if (batchCorrections.length > 0) {
          results.batchesWithCorrections++;
        }
        
        results.corrections.push(...batchCorrections);
        results.errors.push(...batchErrors);
      }
      
      results.batchesProcessed++;
      
      if (batchCorrections.length > 0) {
        console.log(`   ✅ ${batchCorrections.length} correções aplicadas`);
      }
      if (batchErrors.length > 0) {
        console.log(`   ❌ ${batchErrors.length} erros encontrados`);
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar batch ${batch.id}:`, error);
      results.errors.push({
        batch_id: batch.id,
        error: error.message
      });
      results.totalErrors++;
    }
  }
  
  console.log(`\n🎉 CORREÇÃO AUTOMÁTICA CONCLUÍDA!`);
  console.log(`   Batches processados: ${results.batchesProcessed}`);
  console.log(`   Batches com correções: ${results.batchesWithCorrections}`);
  console.log(`   Total de correções: ${results.totalCorrections}`);
  console.log(`   Total de erros: ${results.totalErrors}`);
  
  return results;
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  // Verificar confirmação
  const queryString = event.queryStringParameters || {};
  const confirmed = queryString.confirm === 'true';
  
  if (!confirmed) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Confirmação necessária',
        message: 'Para executar a correção, adicione ?confirm=true à URL',
        example: 'POST /.netlify/functions/fix-all-batches?confirm=true'
      })
    };
  }

  try {
    const sql = getDB();
    const results = await fixAllBatches(sql);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Correção automática concluída',
        results: results,
        summary: {
          batchesProcessed: results.batchesProcessed,
          batchesWithCorrections: results.batchesWithCorrections,
          totalCorrections: results.totalCorrections,
          totalErrors: results.totalErrors
        },
        instructions: {
          next: 'Recarregue a aplicação para ver os valores corrigidos',
          verification: 'Verifique se os valores estão corretos na interface'
        }
      }, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Erro na correção automática:', error);
    
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
