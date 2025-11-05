/**
 * Add Indexes API
 * Endpoint para criar índices no banco de dados para otimizar performance
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');
const { verifyToken, requireRole } = require('./utils/middleware');

async function handleAddIndexes(event, sql, user) {
  console.log('🔧 Adicionando índices compostos ao banco de dados...');
  
  const indexes = [];
  const errors = [];
  
  try {
    // Índice composto 1: (deleted_at, status, created_at DESC) - usado em listagem com filtro de status
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_material_requests_deleted_status_created 
        ON material_requests(deleted_at, status, created_at DESC)
        WHERE deleted_at IS NULL
      `;
      indexes.push('idx_material_requests_deleted_status_created');
      console.log('✅ Índice composto (deleted_at, status, created_at DESC) criado');
    } catch (e) {
      errors.push(`idx_material_requests_deleted_status_created: ${e.message}`);
      console.error('❌ Erro ao criar índice deleted_status_created:', e.message);
    }
    
    // Índice composto 2: (deleted_at, deadline, status) - usado em filtros de prazo e status
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_material_requests_deleted_deadline_status 
        ON material_requests(deleted_at, deadline, status)
        WHERE deleted_at IS NULL
      `;
      indexes.push('idx_material_requests_deleted_deadline_status');
      console.log('✅ Índice composto (deleted_at, deadline, status) criado');
    } catch (e) {
      errors.push(`idx_material_requests_deleted_deadline_status: ${e.message}`);
      console.error('❌ Erro ao criar índice deleted_deadline_status:', e.message);
    }
    
    // Índice composto 3: (deleted_at, created_by, created_at DESC) - usado em filtros por criador
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_material_requests_deleted_created_by_created 
        ON material_requests(deleted_at, created_by, created_at DESC)
        WHERE deleted_at IS NULL
      `;
      indexes.push('idx_material_requests_deleted_created_by_created');
      console.log('✅ Índice composto (deleted_at, created_by, created_at DESC) criado');
    } catch (e) {
      errors.push(`idx_material_requests_deleted_created_by_created: ${e.message}`);
      console.error('❌ Erro ao criar índice deleted_created_by_created:', e.message);
    }
    
    // Índice composto 4: (deleted_at, urgencia, created_at DESC) - usado em filtros de urgência
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_material_requests_deleted_urgencia_created 
        ON material_requests(deleted_at, urgencia, created_at DESC)
        WHERE deleted_at IS NULL
      `;
      indexes.push('idx_material_requests_deleted_urgencia_created');
      console.log('✅ Índice composto (deleted_at, urgencia, created_at DESC) criado');
    } catch (e) {
      errors.push(`idx_material_requests_deleted_urgencia_created: ${e.message}`);
      console.error('❌ Erro ao criar índice deleted_urgencia_created:', e.message);
    }
    
    // Índice composto 5: (deleted_at, created_at DESC) - query base mais comum
    try {
      await sql`
        CREATE INDEX IF NOT EXISTS idx_material_requests_deleted_created 
        ON material_requests(deleted_at, created_at DESC)
        WHERE deleted_at IS NULL
      `;
      indexes.push('idx_material_requests_deleted_created');
      console.log('✅ Índice composto (deleted_at, created_at DESC) criado');
    } catch (e) {
      errors.push(`idx_material_requests_deleted_created: ${e.message}`);
      console.error('❌ Erro ao criar índice deleted_created:', e.message);
    }
    
    console.log(`✅ ${indexes.length} índices compostos criados com sucesso`);
    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} erros ao criar índices:`, errors);
    }
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: `${indexes.length} índices compostos criados com sucesso`,
        indexes: indexes,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
    throw error;
  }
}

exports.handler = withErrorHandling(async (event) => {
  const sql = getDB();
  const user = await verifyToken(event, sql);
  requireRole(user, ['admin']);

  return await handleAddIndexes(event, sql, user);
});
