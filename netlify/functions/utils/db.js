/**
 * Database Connection and Utilities
 * Módulo para conexão com Neon PostgreSQL
 */

const { neon } = require('@neondatabase/serverless');

// Configurações de timeout
const CONNECTION_TIMEOUT = parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000', 10); // 10 segundos
const QUERY_TIMEOUT = parseInt(process.env.DB_QUERY_TIMEOUT || '10000', 10); // 10 segundos
const MAX_RETRIES = parseInt(process.env.DB_MAX_RETRIES || '3', 10);
const RETRY_DELAY = parseInt(process.env.DB_RETRY_DELAY || '1000', 10); // 1 segundo

/**
 * Obtém conexão com o banco de dados
 * @returns {Function} SQL template function
 */
function getDB() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada nas variáveis de ambiente');
  }

  // Configurar conexão com timeout
  const config = {
    connectionTimeoutMillis: CONNECTION_TIMEOUT,
    query_timeout: QUERY_TIMEOUT,
    statement_timeout: QUERY_TIMEOUT
  };

  return neon(databaseUrl, config);
}

/**
 * Executa uma query de forma segura com tratamento de erros e retry
 * @param {Function} queryFn - Função que executa a query
 * @returns {Promise} Resultado da query
 */
async function safeQuery(queryFn) {
  let lastError;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await queryFn();
      return { success: true, data: result };
    } catch (error) {
      lastError = error;
      console.error(`Database query error (attempt ${attempt}/${MAX_RETRIES}):`, error);
      
      // Se não é o último attempt e é um erro de conexão, tenta novamente
      if (attempt < MAX_RETRIES && isRetryableError(error)) {
        console.log(`Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        continue;
      }
      
      break;
    }
  }
  
  return {
    success: false,
    error: lastError.message,
    code: lastError.code,
    attempts: MAX_RETRIES
  };
}

/**
 * Verifica se o erro é recuperável (pode tentar novamente)
 * @param {Error} error - Erro ocorrido
 * @returns {boolean} Se deve tentar novamente
 */
function isRetryableError(error) {
  const retryableCodes = [
    'ECONNRESET',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EHOSTUNREACH'
  ];
  
  const retryableMessages = [
    'timeout',
    'connection',
    'network',
    'temporary'
  ];
  
  return retryableCodes.includes(error.code) || 
         retryableMessages.some(msg => error.message.toLowerCase().includes(msg));
}

/**
 * Função auxiliar para sleep
 * @param {number} ms - Milissegundos para aguardar
 * @returns {Promise} Promise que resolve após o tempo especificado
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verifica se o banco está acessível com timeout
 * @returns {Promise<Object>} Status detalhado do banco
 */
async function healthCheck() {
  const startTime = Date.now();
  
  try {
    const sql = getDB();
    
    // Query simples com timeout
    const result = await Promise.race([
      sql`SELECT 1 as health, NOW() as server_time`,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), QUERY_TIMEOUT)
      )
    ]);
    
    const responseTime = Date.now() - startTime;
    
    return {
      healthy: true,
      responseTime,
      serverTime: result[0]?.server_time,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Database health check failed:', error);
    
    return {
      healthy: false,
      responseTime,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };
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

