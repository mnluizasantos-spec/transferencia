/**
 * Middleware - Autenticação e Autorização
 */

const jwt = require('jsonwebtoken');
const { authenticationError, authorizationError } = require('./errorHandler');
const { logWarn } = require('./logger');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';

/**
 * Verifica e decodifica JWT token
 * @param {Object} event - Evento Netlify
 * @param {Function} sql - Conexão com banco
 * @returns {Object} Dados do usuário decodificados do token
 */
async function verifyToken(event, sql) {
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader) {
    throw authenticationError('Token não fornecido');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw authenticationError('Formato de token inválido');
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    // Decodificar token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verificar se token está na lista de sessões ativas
    const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
    
    const [session] = await sql`
      SELECT * FROM sessions 
      WHERE token_hash = ${tokenHash}
      AND user_id = ${decoded.userId}
      AND expires_at > CURRENT_TIMESTAMP
    `;

    if (!session) {
      throw authenticationError('Sessão inválida ou expirada');
    }

    // Verificar se usuário ainda está ativo
    const [user] = await sql`
      SELECT 
        u.id, 
        u.email, 
        r.name as role,
        u.ativo 
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ${decoded.userId} 
      AND u.deleted_at IS NULL
    `;

    if (!user) {
      throw authenticationError('Usuário não encontrado');
    }

    if (!user.ativo) {
      throw authenticationError('Usuário desativado');
    }

    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name || decoded.nome,
      nome: decoded.name || decoded.nome
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw authenticationError('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw authenticationError('Token inválido');
    }
    throw error;
  }
}

/**
 * Verifica se usuário tem permissão para acessar recurso
 * @param {Object} user - Usuário autenticado
 * @param {Array} allowedRoles - Roles permitidas
 */
function requireRole(user, allowedRoles) {
  if (!allowedRoles.includes(user.role)) {
    logWarn('authorization_failed', 'Usuário sem permissão', {
      userId: user.userId,
      userRole: user.role,
      requiredRoles: allowedRoles
    });
    throw authorizationError('Você não tem permissão para acessar este recurso');
  }
}

/**
 * Verifica se usuário é admin
 */
function requireAdmin(user) {
  requireRole(user, ['admin']);
}

/**
 * Verifica se usuário é admin ou separador
 */
function requireAdminOrSeparador(user) {
  requireRole(user, ['admin', 'separador']);
}

/**
 * Verifica se usuário pode acessar/editar recurso
 * (Admin pode tudo, outros apenas seus próprios recursos)
 * @param {Object} user - Usuário autenticado
 * @param {Number} resourceOwnerId - ID do dono do recurso
 */
function requireOwnerOrAdmin(user, resourceOwnerId) {
  if (user.role !== 'admin' && user.userId !== resourceOwnerId) {
    throw authorizationError('Você só pode acessar seus próprios recursos');
  }
}

/**
 * Rate limiting simples baseado em memória
 * Para produção, considerar Redis ou similar
 */
const rateLimitStore = new Map();

function checkRateLimit(userId, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const userKey = `rate_${userId}`;
  
  if (!rateLimitStore.has(userKey)) {
    rateLimitStore.set(userKey, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const userLimit = rateLimitStore.get(userKey);

  if (now > userLimit.resetTime) {
    // Resetar contador
    rateLimitStore.set(userKey, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (userLimit.count >= maxRequests) {
    logWarn('rate_limit_exceeded', 'Usuário excedeu limite de requisições', {
      userId,
      count: userLimit.count,
      maxRequests
    });
    return false;
  }

  userLimit.count++;
  return true;
}

/**
 * Limpa rate limits antigos periodicamente
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Limpar a cada minuto

/**
 * Wrapper para adicionar autenticação e rate limiting
 */
function withAuth(handler, options = {}) {
  return async (event, context, sql) => {
    // Verificar autenticação
    const user = await verifyToken(event, sql);

    // Verificar rate limit
    const maxRequests = options.maxRequests || parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100', 10);
    if (!checkRateLimit(user.userId, maxRequests)) {
      return {
        statusCode: 429,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            type: 'RATE_LIMIT_ERROR',
            message: 'Muitas requisições. Tente novamente em alguns instantes.'
          }
        })
      };
    }

    // Verificar role se especificado
    if (options.requireRole) {
      requireRole(user, options.requireRole);
    }

    // Executar handler com usuário autenticado
    return await handler(event, context, sql, user);
  };
}

module.exports = {
  verifyToken,
  requireRole,
  requireAdmin,
  requireAdminOrSeparador,
  requireOwnerOrAdmin,
  checkRateLimit,
  withAuth
};

