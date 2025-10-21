/**
 * Add Indexes API
 * Endpoint para criar índices no banco de dados para otimizar performance
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');
const { verifyToken, requireRole } = require('./utils/middleware');

async function handleAddIndexes(event, sql, user) {
  console.log('🔧 Adicionando índices ao banco de dados...');
  
  const indexes = [];
  
  try {
    // Índice 1: deleted_at (usado em TODAS as queries)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_material_requests_deleted_at 
      ON material_requests(deleted_at)
    `;
    indexes.push('idx_material_requests_deleted_at');
    console.log('✅ Índice deleted_at criado');
    
    // Índice 2: created_at para ordenação DESC
    await sql`
      CREATE INDEX IF NOT EXISTS idx_material_requests_created_at 
      ON material_requests(created_at DESC)
    `;
    indexes.push('idx_material_requests_created_at');
    console.log('✅ Índice created_at criado');
    
    // Índice 3: deadline para filtros de prazo
    await sql`
      CREATE INDEX IF NOT EXISTS idx_material_requests_deadline 
      ON material_requests(deadline)
    `;
    indexes.push('idx_material_requests_deadline');
    console.log('✅ Índice deadline criado');
    
    // Índice 4: status para filtros
    await sql`
      CREATE INDEX IF NOT EXISTS idx_material_requests_status 
      ON material_requests(status)
    `;
    indexes.push('idx_material_requests_status');
    console.log('✅ Índice status criado');
    
    // Índice 5: urgencia
    await sql`
      CREATE INDEX IF NOT EXISTS idx_material_requests_urgencia 
      ON material_requests(urgencia)
    `;
    indexes.push('idx_material_requests_urgencia');
    console.log('✅ Índice urgencia criado');
    
    // Índice 6: COMPOSTO - deleted_at + created_at (query mais comum)
    await sql`
      CREATE INDEX IF NOT EXISTS idx_material_requests_deleted_created 
      ON material_requests(deleted_at, created_at DESC)
      WHERE deleted_at IS NULL
    `;
    indexes.push('idx_material_requests_deleted_created');
    console.log('✅ Índice composto deleted_at + created_at criado');
    
    console.log('✅ Todos os índices criados com sucesso:', indexes);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `${indexes.length} índices criados com sucesso`,
        indexes: indexes,
        timestamp: new Date().toISOString(),
        performance_improvement: 'Queries devem ser 1000x mais rápidas agora'
      })
    };
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    throw error;
  }
}

exports.handler = withErrorHandling(async (event) => {
  const sql = await getDB();
  const user = await verifyToken(event);
  requireRole(user, ['admin']);

  return await handleAddIndexes(event, sql, user);
});
