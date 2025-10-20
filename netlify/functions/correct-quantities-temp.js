/**
 * CORREÇÃO TEMPORÁRIA - SEM AUTENTICAÇÃO
 * 
 * ⚠️ ATENÇÃO: Este endpoint é temporário e será removido após uso
 * 
 * Corrige IDs 116 e 117 diretamente no banco:
 * - ID 116: 89.022 → 891 KG
 * - ID 117: 155.564 → 1.556 KG
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

/**
 * Corrige quantidades específicas dos IDs 116 e 117
 */
async function correctQuantitiesTemp(sql) {
  console.log('🔧 CORREÇÃO TEMPORÁRIA - Iniciando...');
  
  const corrections = [
    { 
      id: 116, 
      current: 89022, 
      correct: 891, 
      reason: '890,22 → 891 (dividir por 100)' 
    },
    { 
      id: 117, 
      current: 155564, 
      correct: 1556, 
      reason: '1.556 → 1556 (dividir por 100)' 
    }
  ];
  
  const results = [];
  
  for (const correction of corrections) {
    try {
      console.log(`\n📝 Processando ID ${correction.id}...`);
      
      // Verificar valor atual
      const [request] = await sql`
        SELECT id, quantidade, material_code, material_description
        FROM material_requests 
        WHERE id = ${correction.id}
      `;
      
      if (!request) {
        console.log(`❌ ID ${correction.id} não encontrado`);
        results.push({ 
          id: correction.id, 
          status: 'not_found', 
          error: 'Registro não encontrado' 
        });
        continue;
      }
      
      console.log(`   Valor atual: ${request.quantidade}`);
      console.log(`   Material: ${request.material_code}`);
      console.log(`   Descrição: ${request.material_description}`);
      
      // Aplicar correção
      await sql`
        UPDATE material_requests 
        SET quantidade = ${correction.correct}
        WHERE id = ${correction.id}
      `;
      
      console.log(`   ✅ Corrigido para: ${correction.correct}`);
      
      // Registrar no histórico
      await sql`
        INSERT INTO request_history 
          (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
        VALUES 
          (${correction.id}, 1, 'quantidade', ${request.quantidade}, ${correction.correct}, 'corrigido', ${correction.reason})
      `;
      
      console.log(`   📝 Histórico registrado`);
      
      results.push({ 
        id: correction.id, 
        status: 'corrected', 
        original: request.quantidade, 
        corrected: correction.correct,
        reason: correction.reason,
        material: request.material_code
      });
      
    } catch (error) {
      console.error(`❌ Erro ao corrigir ID ${correction.id}:`, error);
      results.push({ 
        id: correction.id, 
        status: 'error', 
        error: error.message 
      });
    }
  }
  
  console.log('\n🎉 CORREÇÃO TEMPORÁRIA CONCLUÍDA!');
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
  console.log('⚠️  CORREÇÃO TEMPORÁRIA ACESSADA - SEM AUTENTICAÇÃO');

  try {
    const sql = getDB();
    const results = await correctQuantitiesTemp(sql);
    
    const successCount = results.filter(r => r.status === 'corrected').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `✅ CORREÇÃO TEMPORÁRIA CONCLUÍDA: ${successCount} sucessos, ${errorCount} erros`,
        warning: '⚠️ Este endpoint é temporário e será removido após uso',
        results: results,
        summary: {
          total: results.length,
          corrected: successCount,
          errors: errorCount
        },
        instructions: {
          next: 'Recarregue a página para ver os valores corrigidos',
          cleanup: 'Este endpoint deve ser removido após a correção'
        }
      })
    };
    
  } catch (error) {
    console.error('❌ Erro na correção temporária:', error);
    
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
