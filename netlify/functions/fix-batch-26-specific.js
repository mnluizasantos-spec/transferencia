/**
 * Correção Específica do Batch 26 - IDs Conhecidos
 * 
 * Corrige IDs específicos do batch 26 que sabemos que estão incorretos:
 * - ID 116: 89.022 → 891
 * - ID 117: 155.564 → 1.556  
 * - ID 125: (valor a ser verificado e corrigido)
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

/**
 * Corrige IDs específicos do batch 26
 */
async function fixBatch26Specific(sql) {
  console.log('🔧 Iniciando correção específica do batch 26...');
  
  // Buscar IDs específicos do batch 26
  const specificIds = [116, 117, 125];
  
  const results = [];
  
  for (const id of specificIds) {
    try {
      console.log(`\n📝 Verificando ID ${id}...`);
      
      // Buscar valor atual
      const [request] = await sql`
        SELECT id, quantidade, material_code, material_description, created_at
        FROM material_requests 
        WHERE id = ${id}
      `;
      
      if (!request) {
        console.log(`❌ ID ${id} não encontrado`);
        results.push({ 
          id, 
          status: 'not_found', 
          error: 'Registro não encontrado' 
        });
        continue;
      }
      
      console.log(`   Valor atual: ${request.quantidade}`);
      console.log(`   Material: ${request.material_code}`);
      console.log(`   Descrição: ${request.material_description}`);
      
      // Detectar se precisa de correção (dividir por 100)
      let correctedValue = null;
      let reason = '';
      
      if (request.quantidade > 10000) {
        // Valor muito grande, provavelmente multiplicado por 100
        correctedValue = Math.round(request.quantidade / 100);
        reason = `Valor muito grande: ${request.quantidade} → ${correctedValue} (÷100)`;
      } else if (request.quantidade > 1000 && request.quantidade % 100 === 0) {
        // Múltiplo de 100, provavelmente multiplicado
        correctedValue = Math.round(request.quantidade / 100);
        reason = `Múltiplo de 100: ${request.quantidade} → ${correctedValue} (÷100)`;
      } else {
        console.log(`   ✅ ID ${id} parece estar correto (${request.quantidade})`);
        results.push({ 
          id, 
          status: 'correct', 
          current: request.quantidade,
          message: 'Valor parece estar correto'
        });
        continue;
      }
      
      if (correctedValue && correctedValue > 0) {
        console.log(`   🔧 Corrigindo: ${request.quantidade} → ${correctedValue}`);
        
        // Aplicar correção
        await sql`
          UPDATE material_requests 
          SET quantidade = ${correctedValue}
          WHERE id = ${id}
        `;
        
        // Registrar no histórico
        await sql`
          INSERT INTO request_history 
            (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
          VALUES 
            (${id}, 1, 'quantidade', ${request.quantidade}, ${correctedValue}, 'corrigido', ${reason})
        `;
        
        console.log(`   ✅ ID ${id} corrigido com sucesso`);
        results.push({ 
          id, 
          status: 'corrected', 
          original: request.quantidade, 
          corrected: correctedValue,
          reason: reason,
          material: request.material_code
        });
      }
      
    } catch (error) {
      console.error(`❌ Erro ao processar ID ${id}:`, error);
      results.push({ 
        id, 
        status: 'error', 
        error: error.message 
      });
    }
  }
  
  // Buscar outros valores suspeitos no batch 26
  console.log('\n🔍 Verificando outros valores suspeitos no batch 26...');
  
  try {
    // Buscar batch 26
    const [batch] = await sql`
      SELECT id, created_at
      FROM import_batches 
      WHERE id = 26
    `;
    
    if (batch) {
      const startTime = new Date(batch.created_at);
      const endTime = new Date(batch.created_at.getTime() + 24 * 60 * 60 * 1000);
      
      const suspiciousRequests = await sql`
        SELECT id, quantidade, material_code, material_description
        FROM material_requests 
        WHERE created_at >= ${startTime}
        AND created_at <= ${endTime}
        AND quantidade > 10000
        ORDER BY id
      `;
      
      console.log(`   📊 Encontrados ${suspiciousRequests.length} valores suspeitos adicionais`);
      
      for (const req of suspiciousRequests) {
        if (!specificIds.includes(req.id)) {
          console.log(`   🤔 ID ${req.id}: ${req.quantidade} (${req.material_code}) - Possível correção: ${Math.round(req.quantidade / 100)}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar outros valores:', error);
  }
  
  console.log('\n🎉 CORREÇÃO ESPECÍFICA CONCLUÍDA!');
  
  return results;
}

/**
 * Handler principal - SEM AUTENTICAÇÃO (TEMPORÁRIO)
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  // ⚠️ AVISO: Este endpoint é temporário e não requer autenticação
  console.log('⚠️  CORREÇÃO ESPECÍFICA BATCH 26 - SEM AUTENTICAÇÃO');

  try {
    const sql = getDB();
    const results = await fixBatch26Specific(sql);
    
    const successCount = results.filter(r => r.status === 'corrected').length;
    const correctCount = results.filter(r => r.status === 'correct').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `✅ Correção específica do batch 26 concluída: ${successCount} corrigidos, ${correctCount} corretos, ${errorCount} erros`,
        warning: '⚠️ Este endpoint é temporário e será removido após uso',
        results: results,
        summary: {
          total: results.length,
          corrected: successCount,
          correct: correctCount,
          errors: errorCount
        },
        instructions: {
          next: 'Recarregue a página para ver os valores corrigidos',
          cleanup: 'Este endpoint deve ser removido após a correção'
        }
      })
    };
    
  } catch (error) {
    console.error('❌ Erro na correção específica:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        warning: '⚠️ Este endpoint é temporário e será removido após uso'
      })
    };
  }
});
