/**
 * Error Handler - Tratamento centralizado de erros
 */

const { logError } = require('./logger');

/**
 * Tipos de erro conhecidos
 */
const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  DATABASE: 'DATABASE_ERROR',
  TIMEOUT: 'TIMEOUT_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR'
};

/**
 * Classe de erro customizada
 */
class AppError extends Error {
  constructor(message, type = ERROR_TYPES.INTERNAL, statusCode = 500, details = {}) {
    super(message);
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Mapeia tipos de erro para códigos HTTP
 */
function getStatusCode(errorType) {
  const statusMap = {
    [ERROR_TYPES.VALIDATION]: 400,
    [ERROR_TYPES.AUTHENTICATION]: 401,
    [ERROR_TYPES.AUTHORIZATION]: 403,
    [ERROR_TYPES.NOT_FOUND]: 404,
    [ERROR_TYPES.CONFLICT]: 409,
    [ERROR_TYPES.RATE_LIMIT]: 429,
    [ERROR_TYPES.DATABASE]: 500,
    [ERROR_TYPES.TIMEOUT]: 504,
    [ERROR_TYPES.INTERNAL]: 500
  };

  return statusMap[errorType] || 500;
}

/**
 * Formata mensagem de erro para o usuário (sem expor detalhes internos)
 */
function getUserFriendlyMessage(error) {
  const friendlyMessages = {
    [ERROR_TYPES.VALIDATION]: 'Dados inválidos fornecidos.',
    [ERROR_TYPES.AUTHENTICATION]: 'Credenciais inválidas ou sessão expirada.',
    [ERROR_TYPES.AUTHORIZATION]: 'Você não tem permissão para realizar esta ação.',
    [ERROR_TYPES.NOT_FOUND]: 'Recurso não encontrado.',
    [ERROR_TYPES.CONFLICT]: 'Conflito com dados existentes.',
    [ERROR_TYPES.RATE_LIMIT]: 'Muitas requisições. Tente novamente em alguns instantes.',
    [ERROR_TYPES.DATABASE]: 'Erro ao acessar o banco de dados.',
    [ERROR_TYPES.TIMEOUT]: 'Tempo limite excedido. Tente novamente em alguns instantes.',
    [ERROR_TYPES.INTERNAL]: 'Erro interno do servidor.'
  };

  return error.message || friendlyMessages[error.type] || 'Erro desconhecido.';
}

/**
 * Manipula erro e retorna resposta HTTP apropriada
 */
function handleError(error, context = {}) {
  // Log detalhado no servidor
  logError('error_occurred', error, context);

  // Se for AppError customizado, usa as propriedades
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: {
          type: error.type,
          message: getUserFriendlyMessage(error),
          timestamp: error.timestamp,
          ...(process.env.NODE_ENV !== 'production' && { details: error.details })
        }
      })
    };
  }

  // Erro genérico
  const statusCode = error.statusCode || 500;
  const errorType = error.type || ERROR_TYPES.INTERNAL;

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      error: {
        type: errorType,
        message: getUserFriendlyMessage({ type: errorType }),
        timestamp: new Date().toISOString()
      }
    })
  };
}

/**
 * Wrapper para handlers de função com tratamento de erro automático
 */
function withErrorHandling(handler) {
  return async (event, context) => {
    try {
      return await handler(event, context);
    } catch (error) {
      return handleError(error, {
        path: event.path,
        method: event.httpMethod,
        headers: event.headers
      });
    }
  };
}

/**
 * Cria erro de validação
 */
function validationError(message, details = {}) {
  return new AppError(message, ERROR_TYPES.VALIDATION, 400, details);
}

/**
 * Cria erro de autenticação
 */
function authenticationError(message = 'Não autenticado') {
  return new AppError(message, ERROR_TYPES.AUTHENTICATION, 401);
}

/**
 * Cria erro de autorização
 */
function authorizationError(message = 'Sem permissão') {
  return new AppError(message, ERROR_TYPES.AUTHORIZATION, 403);
}

/**
 * Cria erro de não encontrado
 */
function notFoundError(resource = 'Recurso') {
  return new AppError(`${resource} não encontrado`, ERROR_TYPES.NOT_FOUND, 404);
}

/**
 * Cria erro de conflito
 */
function conflictError(message) {
  return new AppError(message, ERROR_TYPES.CONFLICT, 409);
}

/**
 * Cria erro de banco de dados
 */
function databaseError(message, details = {}) {
  return new AppError(message, ERROR_TYPES.DATABASE, 500, details);
}

/**
 * Cria erro de timeout
 */
function timeoutError(message = 'Tempo limite excedido', details = {}) {
  return new AppError(message, ERROR_TYPES.TIMEOUT, 504, details);
}

module.exports = {
  ERROR_TYPES,
  AppError,
  handleError,
  withErrorHandling,
  validationError,
  authenticationError,
  authorizationError,
  notFoundError,
  conflictError,
  databaseError,
  timeoutError
};

