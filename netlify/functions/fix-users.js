/**
 * Função para sincronizar campos name e nome no banco
 * Endpoint: /.netlify/functions/fix-users
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

async function handleFixUsers(event, sql) {
  console.log('🔧 Iniciando sincronização de campos name/nome...');
  
  try {
    // Sincronizar: definir 'name' = 'nome' onde 'name' está NULL ou vazio
    const result = await sql`
      UPDATE users 
      SET name = nome 
      WHERE name IS NULL OR name = ''
      RETURNING id, email, nome, name, role
    `;
    
    console.log(`✅ ${result.length} usuários atualizados:`, result);
    
    // Log da operação
    await sql`
      INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)
      VALUES (
        NULL,
        'fix_user_names',
        'users',
        ${JSON.stringify({ 
          message: "Campos name sincronizados com nome", 
          updated_count: result.length,
          timestamp: new Date().toISOString()
        })}::jsonb
      )
    `;
    
    // Verificar resultado final
    const users = await sql`
      SELECT 
        id, 
        email, 
        nome, 
        name, 
        role,
        CASE 
          WHEN name = nome THEN 'Sincronizado' 
          ELSE 'Inconsistente' 
        END as status
      FROM users 
      ORDER BY id
    `;
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `Sincronização concluída. ${result.length} usuários atualizados.`,
        updated_users: result,
        all_users: users
      })
    };
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    throw error;
  }
}

exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

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

  const sql = getDB();
  return await handleFixUsers(event, sql);
});
