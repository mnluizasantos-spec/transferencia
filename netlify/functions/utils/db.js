/**
 * Database Connection and Utilities
 * Módulo para conexão com Neon PostgreSQL
 */

const { neon } = require('@neondatabase/serverless');

/**
 * Obtém conexão com o banco de dados
 * @returns {Function} SQL template function
 */
function getDB() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada nas variáveis de ambiente');
  }

  return neon(databaseUrl);
}

/**
 * Executa uma query de forma segura com tratamento de erros
 * @param {Function} queryFn - Função que executa a query
 * @returns {Promise} Resultado da query
 */
async function safeQuery(queryFn) {
  try {
    const result = await queryFn();
    return { success: true, data: result };
  } catch (error) {
    console.error('Database query error:', error);
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

/**
 * Verifica se o banco está acessível
 * @returns {Promise<Boolean>}
 */
async function healthCheck() {
  try {
    const sql = getDB();
    await sql`SELECT 1 as health`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Executa transação com rollback automático em caso de erro
 * @param {Function} sql - Conexão SQL
 * @param {Function} transactionFn - Função contendo operações da transação
 * @returns {Promise} Resultado da transação
 */
async function transaction(sql, transactionFn) {
  try {
    return await sql.begin(async (tx) => {
      return await transactionFn(tx);
    });
  } catch (error) {
    console.error('Transaction failed:', error);
    throw error;
  }
}

/**
 * Helper para construir queries com filtros dinâmicos
 * @param {Object} filters - Objeto com filtros
 * @returns {Object} WHERE clause e valores
 */
function buildFilters(filters) {
  const conditions = [];
  const values = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      conditions.push(`${key} = $${key}`);
      values[key] = value;
    }
  });

  return {
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    values
  };
}

module.exports = {
  getDB,
  safeQuery,
  healthCheck,
  transaction,
  buildFilters
};

