/**
 * Atualizar nome do usuário solicitante
 */

const { getDB } = require('./utils/db');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const sql = getDB();
    
    // Atualizar nome do usuário solicitante
    const result = await sql`
      UPDATE users 
      SET nome = 'Solicitante', name = 'Solicitante'
      WHERE email = 'solicitante@antilhas.com'
      RETURNING id, email, nome, name
    `;

    console.log('Usuário atualizado:', result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Nome do usuário solicitante atualizado com sucesso',
        user: result[0]
      })
    };

  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Erro interno do servidor'
      })
    };
  }
};
