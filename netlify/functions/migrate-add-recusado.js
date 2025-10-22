const { neon } = require('@neondatabase/serverless');

exports.handler = async (event) => {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Iniciando migração para adicionar status "Recusado"');
    
    // Remover constraint antiga
    await sql`
      ALTER TABLE material_requests
      DROP CONSTRAINT IF EXISTS material_requests_status_check
    `;
    
    console.log('Constraint antiga removida');
    
    // Adicionar nova constraint com 'Recusado'
    await sql`
      ALTER TABLE material_requests
      ADD CONSTRAINT material_requests_status_check
      CHECK (status IN ('Pendente', 'Em Separação', 'Concluído', 'Cancelado', 'Recusado'))
    `;
    
    console.log('Nova constraint adicionada com sucesso');
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Constraint atualizada com sucesso - Status "Recusado" agora é aceito' 
      })
    };
  } catch (error) {
    console.error('Erro na migração:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        error: error.message,
        details: 'Erro ao atualizar constraint do banco de dados'
      })
    };
  }
};
