/**
 * Script para sincronizar campos name e nome no banco Neon
 */

const { neon } = require('@neondatabase/serverless');

async function fixUserNames() {
  try {
    console.log('🔗 Conectando ao banco Neon...');
    
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL não configurada');
    }
    
    const sql = neon(databaseUrl);
    
    console.log('📝 Sincronizando campos name e nome...');
    
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
    
    console.log('📊 Verificando resultado...');
    
    // Verificar resultado
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
    
    console.log('\n📋 Status dos usuários:');
    console.table(users);
    
    console.log('\n✅ Script executado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  fixUserNames();
}

module.exports = { fixUserNames };
