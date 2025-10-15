/**
 * Função para criar/verificar usuários iniciais
 * Endpoint: /.netlify/functions/setup-users
 */

const bcrypt = require('bcryptjs');
const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

async function setupUsers(event, sql) {
  console.log('🔧 Verificando/criando usuários iniciais...');
  
  try {
    // Hash da senha padrão (admin123)
    const defaultPassword = 'admin123';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);
    
    console.log('📝 Criando/atualizando usuários...');
    
    // Admin padrão
    const adminResult = await sql`
      INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
      VALUES (
        'admin@antilhas.com',
        ${passwordHash},
        'Administrador',
        'Administrador',
        'admin',
        false
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        nome = EXCLUDED.nome,
        name = EXCLUDED.name,
        role = EXCLUDED.role
      RETURNING id, email, nome, role
    `;
    
    // Separador padrão
    const separadorResult = await sql`
      INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
      VALUES (
        'separador@antilhas.com',
        ${passwordHash},
        'Separador de Material',
        'Separador de Material',
        'separador',
        false
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        nome = EXCLUDED.nome,
        name = EXCLUDED.name,
        role = EXCLUDED.role
      RETURNING id, email, nome, role
    `;
    
    // Solicitante padrão
    const solicitanteResult = await sql`
      INSERT INTO users (email, password_hash, nome, name, role, force_password_change)
      VALUES (
        'solicitante@antilhas.com',
        ${passwordHash},
        'Solicitante Teste',
        'Solicitante Teste',
        'solicitante',
        false
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        nome = EXCLUDED.nome,
        name = EXCLUDED.name,
        role = EXCLUDED.role
      RETURNING id, email, nome, role
    `;
    
    // Log da operação
    await sql`
      INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)
      VALUES (
        NULL,
        'setup_users',
        'users',
        ${JSON.stringify({ 
          message: "Usuários iniciais criados/atualizados", 
          admin: adminResult[0],
          separador: separadorResult[0],
          solicitante: solicitanteResult[0],
          timestamp: new Date().toISOString()
        })}::jsonb
      )
    `;
    
    // Verificar todos os usuários
    const allUsers = await sql`
      SELECT 
        id, 
        email, 
        nome, 
        name, 
        role,
        deleted_at
      FROM users 
      ORDER BY id
    `;
    
    console.log('✅ Usuários criados/atualizados:', { adminResult, separadorResult, solicitanteResult });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Usuários iniciais criados/atualizados com sucesso',
        users: {
          admin: adminResult[0],
          separador: separadorResult[0],
          solicitante: solicitanteResult[0]
        },
        all_users: allUsers,
        default_password: defaultPassword
      })
    };
    
  } catch (error) {
    console.error('❌ Erro na criação de usuários:', error);
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
  return await setupUsers(event, sql);
});
