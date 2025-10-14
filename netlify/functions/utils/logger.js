/**
 * Logger - Sistema de Logs Estruturados
 */

const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Formata e imprime log estruturado
 * @param {String} level - Nível do log
 * @param {String} action - Ação sendo executada
 * @param {Object} details - Detalhes adicionais
 */
function log(level, action, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    action,
    ...details
  };

  const logString = JSON.stringify(logEntry);

  // Em produção, usar console.log para integração com Netlify logs
  if (level === LOG_LEVELS.ERROR) {
    console.error(logString);
  } else if (level === LOG_LEVELS.WARN) {
    console.warn(logString);
  } else {
    console.log(logString);
  }

  return logEntry;
}

/**
 * Log de erro
 */
function logError(action, error, additionalDetails = {}) {
  return log(LOG_LEVELS.ERROR, action, {
    error: error.message,
    stack: error.stack,
    ...additionalDetails
  });
}

/**
 * Log de aviso
 */
function logWarn(action, message, details = {}) {
  return log(LOG_LEVELS.WARN, action, {
    message,
    ...details
  });
}

/**
 * Log informativo
 */
function logInfo(action, details = {}) {
  return log(LOG_LEVELS.INFO, action, details);
}

/**
 * Log de debug (apenas em desenvolvimento)
 */
function logDebug(action, details = {}) {
  if (process.env.NODE_ENV !== 'production') {
    return log(LOG_LEVELS.DEBUG, action, details);
  }
}

/**
 * Log de auditoria para o banco de dados
 * @param {Function} sql - Conexão com banco
 * @param {Number} userId - ID do usuário
 * @param {String} acao - Ação realizada
 * @param {String} tabelaAfetada - Tabela afetada
 * @param {Number} registroId - ID do registro
 * @param {Object} detalhes - Detalhes adicionais
 * @param {String} ipAddress - IP do usuário
 * @param {String} userAgent - User agent
 */
async function logAudit(sql, userId, acao, tabelaAfetada, registroId, detalhes = {}, ipAddress = null, userAgent = null) {
  try {
    await sql`
      INSERT INTO audit_logs 
        (user_id, acao, tabela_afetada, registro_id, detalhes_json, ip_address, user_agent)
      VALUES 
        (${userId}, ${acao}, ${tabelaAfetada}, ${registroId}, ${JSON.stringify(detalhes)}::jsonb, ${ipAddress}, ${userAgent})
    `;
    
    logInfo('audit_log_created', { userId, acao, tabelaAfetada, registroId });
  } catch (error) {
    logError('audit_log_failed', error, { userId, acao });
  }
}

/**
 * Log de performance para queries lentas
 * @param {String} queryName - Nome da query
 * @param {Number} duration - Duração em ms
 * @param {Object} details - Detalhes
 */
function logPerformance(queryName, duration, details = {}) {
  if (duration > 1000) { // Mais de 1 segundo
    logWarn('slow_query', `Query "${queryName}" took ${duration}ms`, details);
  } else {
    logDebug('query_performance', { queryName, duration, ...details });
  }
}

module.exports = {
  LOG_LEVELS,
  logError,
  logWarn,
  logInfo,
  logDebug,
  logAudit,
  logPerformance
};

