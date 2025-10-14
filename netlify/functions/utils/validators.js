/**
 * Validators - Validação e sanitização de dados
 */

const { validationError } = require('./errorHandler');

/**
 * Valida se email é válido
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida senha forte
 * Mínimo 8 caracteres, pelo menos uma letra e um número
 */
function isValidPassword(password) {
  if (password.length < 8) return false;
  if (!/[a-zA-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  return true;
}

/**
 * Sanitiza string removendo tags HTML e caracteres perigosos
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove caracteres perigosos
    .trim();
}

/**
 * Valida se é número inteiro positivo
 */
function isPositiveInteger(value) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && Number.isInteger(num);
}

/**
 * Valida se data é válida
 */
function isValidDate(dateString) {
  if (!dateString) return true; // Data opcional
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Valida se valor está em lista de opções válidas
 */
function isValidOption(value, validOptions) {
  return validOptions.includes(value);
}

/**
 * Validação de dados de usuário
 */
function validateUserData(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.email) {
    if (!data.email) {
      errors.push('Email é obrigatório');
    } else if (!isValidEmail(data.email)) {
      errors.push('Email inválido');
    }
  }

  if (!isUpdate || data.password) {
    if (!isUpdate && !data.password) {
      errors.push('Senha é obrigatória');
    } else if (data.password && !isValidPassword(data.password)) {
      errors.push('Senha deve ter pelo menos 8 caracteres, incluindo letras e números');
    }
  }

  if (!isUpdate || data.nome) {
    if (!data.nome) {
      errors.push('Nome é obrigatório');
    } else if (data.nome.length < 3) {
      errors.push('Nome deve ter pelo menos 3 caracteres');
    }
  }

  if (!isUpdate || data.role) {
    if (!data.role) {
      errors.push('Role é obrigatório');
    } else if (!isValidOption(data.role, ['admin', 'separador', 'solicitante'])) {
      errors.push('Role inválido. Deve ser: admin, separador ou solicitante');
    }
  }

  if (errors.length > 0) {
    throw validationError('Dados de usuário inválidos', { errors });
  }

  return {
    email: data.email ? sanitizeString(data.email).toLowerCase() : undefined,
    nome: data.nome ? sanitizeString(data.nome) : undefined,
    role: data.role,
    password: data.password // Senha não é sanitizada (será hasheada)
  };
}

/**
 * Validação de dados de solicitação
 */
function validateRequestData(data, isUpdate = false) {
  const errors = [];

  if (!isUpdate || data.material !== undefined) {
    if (!data.material || data.material.trim() === '') {
      errors.push('Material é obrigatório');
    } else if (data.material.length > 500) {
      errors.push('Material deve ter no máximo 500 caracteres');
    }
  }

  if (!isUpdate || data.quantidade !== undefined) {
    if (!data.quantidade) {
      errors.push('Quantidade é obrigatória');
    } else if (!isPositiveInteger(data.quantidade)) {
      errors.push('Quantidade deve ser um número inteiro positivo');
    }
  }

  if (!isUpdate || data.solicitante_id !== undefined) {
    if (!isUpdate && !data.solicitante_id) {
      errors.push('Solicitante é obrigatório');
    } else if (data.solicitante_id && !isPositiveInteger(data.solicitante_id)) {
      errors.push('ID do solicitante inválido');
    }
  }

  if (data.urgencia && !isValidOption(data.urgencia, ['Urgente', 'Normal'])) {
    errors.push('Urgência inválida. Deve ser: Urgente ou Normal');
  }

  if (data.status && !isValidOption(data.status, ['Pendente', 'Em Separação', 'Concluído', 'Cancelado'])) {
    errors.push('Status inválido');
  }

  if (data.prazo && !isValidDate(data.prazo)) {
    errors.push('Prazo deve ser uma data válida');
  }

  if (data.inicio_producao && !isValidDate(data.inicio_producao)) {
    errors.push('Início de produção deve ser uma data válida');
  }

  if (data.justificativa && data.justificativa.length > 2000) {
    errors.push('Justificativa deve ter no máximo 2000 caracteres');
  }

  if (errors.length > 0) {
    throw validationError('Dados de solicitação inválidos', { errors });
  }

  return {
    material: data.material ? sanitizeString(data.material) : undefined,
    quantidade: data.quantidade ? parseInt(data.quantidade, 10) : undefined,
    solicitante_id: data.solicitante_id ? parseInt(data.solicitante_id, 10) : undefined,
    urgencia: data.urgencia || 'Normal',
    status: data.status || 'Pendente',
    prazo: data.prazo || null,
    inicio_producao: data.inicio_producao || null,
    justificativa: data.justificativa ? sanitizeString(data.justificativa) : null
  };
}

/**
 * Valida dados de importação em massa
 */
function validateImportRow(row, rowNumber) {
  const errors = [];

  // Verificar campos com diferentes nomes possíveis
  const material = row.Material || row.material;
  const descricao = row.Descrição || row.Descricao || row.descrição || row.descricao;
  const quantidade = row.Quantidade || row.quantidade;
  const unidade = row.Unidade || row.unidade;
  const solicitante = row.Solicitante || row.solicitante;
  const urgencia = row.Urgencia || row.urgencia;

  if (!material || material.trim() === '') {
    errors.push(`Linha ${rowNumber}: Material é obrigatório`);
  }

  if (!descricao || descricao.trim() === '') {
    errors.push(`Linha ${rowNumber}: Descrição é obrigatória`);
  }

  if (!quantidade || !isPositiveInteger(quantidade)) {
    errors.push(`Linha ${rowNumber}: Quantidade deve ser um número positivo`);
  }

  if (!unidade || unidade.trim() === '') {
    errors.push(`Linha ${rowNumber}: Unidade é obrigatória`);
  }

  if (!solicitante || solicitante.trim() === '') {
    errors.push(`Linha ${rowNumber}: Solicitante é obrigatório`);
  }

  if (urgencia && !isValidOption(urgencia, ['Urgente', 'Normal'])) {
    errors.push(`Linha ${rowNumber}: Urgência deve ser "Urgente" ou "Normal"`);
  }

  const prazo = row.Prazo || row.prazo;
  if (prazo && !isValidDate(prazo)) {
    errors.push(`Linha ${rowNumber}: Prazo deve ser uma data válida`);
  }

  const inicio_producao = row['Inicio Producao'] || row.inicio_producao;
  if (inicio_producao && !isValidDate(inicio_producao)) {
    errors.push(`Linha ${rowNumber}: Início de produção deve ser uma data válida`);
  }

  return errors;
}

/**
 * Extrai IP do evento Netlify
 */
function getClientIP(event) {
  return event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         event.headers['x-real-ip'] ||
         'unknown';
}

/**
 * Extrai User-Agent do evento
 */
function getUserAgent(event) {
  return event.headers['user-agent'] || 'unknown';
}

/**
 * Valida tamanho de arquivo
 */
function validateFileSize(fileSize, maxSize = 5242880) { // 5MB padrão
  if (fileSize > maxSize) {
    throw validationError(`Arquivo muito grande. Tamanho máximo: ${maxSize / 1024 / 1024}MB`);
  }
}

/**
 * Limita string para evitar overflow
 */
function truncateString(str, maxLength = 255) {
  if (!str) return str;
  return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
}

module.exports = {
  isValidEmail,
  isValidPassword,
  sanitizeString,
  isPositiveInteger,
  isValidDate,
  isValidOption,
  validateUserData,
  validateRequestData,
  validateImportRow,
  getClientIP,
  getUserAgent,
  validateFileSize,
  truncateString
};

