/**
 * Health Check API
 * Verifica saúde do sistema
 */

const { healthCheck } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

/**
 * GET /api/health
 * Retorna status de saúde do sistema
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

  // Verificar banco de dados
  const dbHealthy = await healthCheck();

  const health = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: dbHealthy ? 'connected' : 'disconnected',
      api: 'running'
    }
  };

  const statusCode = dbHealthy ? 200 : 503;

  return {
    statusCode,
    headers,
    body: JSON.stringify(health)
  };
});

