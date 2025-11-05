/**
 * Correção da Solicitação 350
 * 
 * Ajusta a quantidade da solicitação 350 de 2.377.705 para 2.377,705
 * Como o campo é INTEGER, converte 2377705 para 2377 (removendo os últimos 3 dígitos)
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');
const { verifyToken } = require('./utils/middleware');

/**
 * Corrige a solicitação 350
 */
async function fixRequest350(sql, user) {
  console.log('🔧 Iniciando correção da solicitação 350...');
  
  const requestId = 350;
  
  try {
    // Buscar solicitação atual
    const [request] = await sql`
      SELECT id, quantidade, material_code, material_description, status, created_at
      FROM material_requests 
      WHERE id = ${requestId} AND deleted_at IS NULL
    `;
    
    if (!request) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Solicitação 350 não encontrada ou foi excluída'
        })
      };
    }
    
    console.log(`📝 Solicitação ${requestId} encontrada:`);
    console.log(`   Valor atual: ${request.quantidade}`);
    console.log(`   Material: ${request.material_code}`);
    console.log(`   Descrição: ${request.material_description}`);
    console.log(`   Status: ${request.status}`);
    
    // Valor atual: 2377705 (2.377.705)
    // Valor desejado: 2377 (2.377,705) - removendo os últimos 3 dígitos
    const valorAtual = request.quantidade;
    const valorCorrigido = 2377; // 2.377,705 convertido para INTEGER
    
    if (valorAtual === valorCorrigido) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Solicitação 350 já está com o valor correto',
          request: {
            id: request.id,
            quantidade: request.quantidade
          }
        })
      };
    }
    
    // Atualizar quantidade
    const [updated] = await sql`
      UPDATE material_requests 
      SET 
        quantidade = ${valorCorrigido},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${requestId}
      RETURNING *
    `;
    
    // Registrar no histórico
    await sql`
      INSERT INTO request_history 
        (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao)
      VALUES 
        (${requestId}, ${user.userId}, 'quantidade', ${String(valorAtual)}, ${String(valorCorrigido)}, 'atualizado')
    `;
    
    // Log de auditoria
    await sql`
      INSERT INTO audit_logs 
        (user_id, acao, tabela_afetada, registro_id, detalhes_json, ip_address, user_agent)
      VALUES 
        (${user.userId}, 'request_updated', 'material_requests', ${requestId}, 
         ${JSON.stringify({ quantidade: { anterior: valorAtual, novo: valorCorrigido } })}::jsonb,
         'system', 'fix-request-350')
    `;
    
    console.log(`✅ Solicitação ${requestId} corrigida com sucesso:`);
    console.log(`   Valor anterior: ${valorAtual}`);
    console.log(`   Valor corrigido: ${valorCorrigido}`);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Solicitação 350 corrigida com sucesso',
        request: {
          id: updated.id,
          quantidade_anterior: valorAtual,
          quantidade_corrigida: valorCorrigido,
          material_code: updated.material_code,
          material_description: updated.material_description,
          status: updated.status
        }
      })
    };
  } catch (error) {
    console.error('❌ Erro ao corrigir solicitação 350:', error);
    throw error;
  }
}

exports.handler = withErrorHandling(async (event) => {
  const sql = getDB();
  const user = await verifyToken(event, sql);
  
  // Apenas admin pode executar correções
  if (user.role !== 'admin') {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Apenas administradores podem executar correções'
      })
    };
  }
  
  return await fixRequest350(sql, user);
});

