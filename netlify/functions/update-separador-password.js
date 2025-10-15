/**
 * Atualizar senha do separador
 * Endpoint: /.netlify/functions/update-separador-password
 */

const bcrypt = require('bcryptjs');
const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

module.exports.handler = withErrorHandling(async (event) => {
  const sql = getDB();

  try {
    console.log('🔐 Atualizando senha do separador...');
    
    // Nova senha
    const newPassword = 'sep@rador@ntilhas';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    console.log('📝 Atualizando senha do separador...');
    
    // Atualizar senha do separador
    const result = await sql`
      UPDATE users 
      SET 
        password_hash = ${passwordHash},
        force_password_change = false
      WHERE email = 'separador@antilhas.com'
      RETURNING id, email, nome, role
    `;
    
    if (result.length === 0) {
      throw new Error('Usuário separador não encontrado');
    }
    
    const user = result[0];
    console.log('✅ Senha do separador atualizada com sucesso:', {
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role
    });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Senha do separador atualizada com sucesso',
        user: {
          id: user.id,
          email: user.email,
          nome: user.nome,
          role: user.role
        }
      })
    };
    
  } catch (error) {
    console.error('❌ Erro ao atualizar senha do separador:', error);
    throw error;
  }
});
