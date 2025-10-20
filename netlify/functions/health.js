/**
 * Health Check API
 * Verifica saúde do sistema com diagnósticos detalhados
 */

const { healthCheck } = require('./utils/db');
const { withErrorHandling, timeoutError } = require('./utils/errorHandler');

/**
 * Verifica variáveis de ambiente críticas
 * @returns {Object} Status das variáveis
 */
function checkEnvironmentVariables() {
  const criticalVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NODE_ENV'
  ];

  const status = {};
  let allPresent = true;

  criticalVars.forEach(varName => {
    const value = process.env[varName];
    status[varName] = {
      present: !!value,
      length: value ? value.length : 0,
      // Para DATABASE_URL, verificar se parece válida
      valid: varName === 'DATABASE_URL' ? 
        (value && value.startsWith('postgres://')) : 
        !!value
    };
    
    if (!status[varName].present || !status[varName].valid) {
      allPresent = false;
    }
  });

  return {
    allPresent,
    variables: status
  };
}

/**
 * Verifica status das tabelas principais
 * @returns {Promise<Object>} Status das tabelas
 */
async function checkTables() {
  try {
    const { getDB } = require('./utils/db');
    const sql = getDB();
    
    const tables = ['users', 'requests', 'sessions', 'audit_logs'];
    const tableStatus = {};
    
    for (const table of tables) {
      try {
        const result = await sql`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_name = ${table}
        `;
        tableStatus[table] = {
          exists: result[0]?.count > 0,
          count: result[0]?.count || 0
        };
      } catch (error) {
        tableStatus[table] = {
          exists: false,
          error: error.message
        };
      }
    }
    
    return {
      success: true,
      tables: tableStatus
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * GET /api/health
 * Retorna status de saúde do sistema com diagnósticos detalhados
 */
exports.handler = withErrorHandling(async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  const startTime = Date.now();
  
  try {
    // Verificar variáveis de ambiente
    const envCheck = checkEnvironmentVariables();
    
    // Verificar banco de dados
    const dbStatus = await healthCheck();
    
    // Verificar tabelas (apenas se banco estiver saudável)
    let tableStatus = null;
    if (dbStatus.healthy) {
      tableStatus = await checkTables();
    }
    
    const totalTime = Date.now() - startTime;
    
    const health = {
      status: dbStatus.healthy && envCheck.allPresent ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: totalTime,
      services: {
        database: {
          status: dbStatus.healthy ? 'connected' : 'disconnected',
          responseTime: dbStatus.responseTime,
          serverTime: dbStatus.serverTime,
          error: dbStatus.error
        },
        environment: {
          status: envCheck.allPresent ? 'configured' : 'misconfigured',
          variables: envCheck.variables
        },
        tables: tableStatus ? {
          status: tableStatus.success ? 'accessible' : 'inaccessible',
          details: tableStatus.tables || tableStatus.error
        } : null,
        api: 'running'
      },
      diagnostics: {
        totalCheckTime: totalTime,
        databaseTimeout: process.env.DB_QUERY_TIMEOUT || '10000',
        connectionTimeout: process.env.DB_CONNECTION_TIMEOUT || '10000',
        maxRetries: process.env.DB_MAX_RETRIES || '3'
      }
    };

    const statusCode = health.status === 'healthy' ? 200 : 503;

    return {
      statusCode,
      headers,
      body: JSON.stringify(health, null, 2)
    };
    
  } catch (error) {
    // Se o próprio health check falhar, retornar erro de timeout
    if (error.message.includes('timeout')) {
      throw timeoutError('Health check timeout - sistema pode estar sobrecarregado');
    }
    throw error;
  }
});

