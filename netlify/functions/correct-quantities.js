/**
 * Correção Direta de Quantidades - IDs 116 e 117
 * 
 * Este endpoint corrige diretamente os valores incorretos no banco
 * sem depender do deploy do código de importação
 */

const { getDB } = require('./utils/db');
const { withErrorHandling, validationError } = require('./utils/errorHandler');
const { verifyToken, requireRole } = require('./utils/middleware');

/**
 * Corrige quantidades específicas dos IDs 116 e 117
 */
async function correctQuantities(sql) {
  console.log('🔧 Iniciando correção de quantidades...');
  
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
      
      console.log(`📝 ID ${correction.id}: ${request.quantidade} → ${correction.correct}`);
      console.log(`   Material: ${request.material_code} - ${request.material_description}`);
      
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
          (${correction.id}, 1, 'quantidade', ${request.quantidade}, ${correction.correct}, 'corrigido', ${correction.reason})
      `;
      
      console.log(`✅ ID ${correction.id} corrigido com sucesso`);
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
  
  return results;
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
    const results = await correctQuantities(sql);
    
    const successCount = results.filter(r => r.status === 'corrected').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Correção concluída: ${successCount} sucessos, ${errorCount} erros`,
        results: results,
        summary: {
          total: results.length,
          corrected: successCount,
          errors: errorCount
        }
      })
    };
    
  } catch (error) {
    console.error('Erro na correção de quantidades:', error);
    
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
