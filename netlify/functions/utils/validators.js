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

  // material_code é obrigatório apenas para criação
  if (!isUpdate && (!data.material_code || data.material_code.trim() === '')) {
    errors.push('Código do material é obrigatório');
  } else if (data.material_code && data.material_code.trim() !== '' && data.material_code.length > 100) {
    errors.push('Código do material deve ter no máximo 100 caracteres');
  }
  
  // material_description é obrigatório apenas para criação
  if (!isUpdate && (!data.material_description || data.material_description.trim() === '')) {
    errors.push('Descrição do material é obrigatória');
  } else if (data.material_description && data.material_description.trim() !== '' && data.material_description.length > 1000) {
    errors.push('Descrição do material deve ter no máximo 1000 caracteres');
  }
  
  // quantidade é obrigatória apenas para criação
  if (!isUpdate && !data.quantidade) {
    errors.push('Quantidade é obrigatória');
  } else if (data.quantidade && !isPositiveInteger(data.quantidade)) {
    errors.push('Quantidade deve ser um número inteiro positivo');
  }

  // requester_name é obrigatório apenas para criação
  if (!isUpdate && (!data.requester_name || data.requester_name.trim() === '')) {
    errors.push('Nome do solicitante é obrigatório');
  } else if (data.requester_name && data.requester_name.length > 255) {
    errors.push('Nome do solicitante deve ter no máximo 255 caracteres');
  }

  // deadline é obrigatório apenas para criação
  if (!isUpdate && !data.deadline) {
    errors.push('Prazo é obrigatório');
  }

  if (data.urgencia && !isValidOption(data.urgencia, ['Urgente', 'Normal'])) {
    errors.push('Urgência inválida. Deve ser: Urgente ou Normal');
  }

  if (data.status && !isValidOption(data.status, ['Pendente', 'Em Separação', 'Concluído', 'Cancelado'])) {
    errors.push('Status inválido');
  }

  if (data.deadline && !isValidDate(data.deadline)) {
    errors.push('Prazo deve ser uma data válida');
  }

  if (data.production_start_date && !isValidDate(data.production_start_date)) {
    errors.push('Início de produção deve ser uma data válida');
  }

  if (data.justificativa && data.justificativa.length > 2000) {
    errors.push('Justificativa deve ter no máximo 2000 caracteres');
  }

  if (errors.length > 0) {
    throw validationError('Dados de solicitação inválidos', { errors });
  }

  // Ajustar timezone do deadline para evitar -1 dia
  let adjustedDeadline = data.deadline;
  if (data.deadline) {
    // Se não tem timezone, adicionar T12:00:00 para evitar problemas
    const dateString = data.deadline.includes('T') ? data.deadline : data.deadline + 'T12:00:00';
    const date = new Date(dateString);
    date.setHours(12, 0, 0, 0); // Meio-dia para evitar problemas de timezone
    adjustedDeadline = date.toISOString().split('T')[0];
  }

  const result = {
    material_code: data.material_code && data.material_code.trim() !== '' ? sanitizeString(data.material_code) : undefined,
    material_description: data.material_description && data.material_description.trim() !== '' ? sanitizeString(data.material_description) : undefined,
    quantidade: data.quantidade ? parseInt(data.quantidade, 10) : undefined,
    unidade: data.unidade ? data.unidade : (isUpdate ? undefined : 'un'),
    requester_name: data.requester_name && data.requester_name.trim() !== '' ? sanitizeString(data.requester_name) : undefined,
    urgencia: data.urgencia ? data.urgencia : (isUpdate ? undefined : 'Normal'),
    status: data.status ? data.status : (isUpdate ? undefined : 'Pendente'),
    deadline: adjustedDeadline || (isUpdate ? undefined : null),
    production_start_date: data.production_start_date || (isUpdate ? undefined : null),
    justificativa: data.justificativa && data.justificativa.trim() !== '' ? sanitizeString(data.justificativa) : null,
    created_by: data.created_by // Passar created_by sem validação
  };

  // Filtrar undefined em updates
  if (isUpdate) {
    return Object.fromEntries(
      Object.entries(result).filter(([_, v]) => v !== undefined)
    );
  }

  return result;
}

/**
 * Converte data brasileira (dd/mm/yyyy) para ISO (yyyy-mm-dd)
 */
function parseBrazilianDate(dateStr) {
  if (!dateStr) return null;
  
  // Se já está em formato ISO (yyyy-mm-dd)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }
  
  // Mapeamento de meses abreviados
  const meses = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'set': '09', 'out': '10', 'nov': '11', 'dez': '12'
  };
  
  // Formato brasileiro com mês abreviado (dd/mmm ou dd/mmm/yyyy)
  const matchAbrev = dateStr.match(/^(\d{1,2})[\/\-]([a-z]{3})(?:[\/\-](\d{4}))?$/i);
  if (matchAbrev) {
    const [_, day, mesAbrev, year] = matchAbrev;
    const month = meses[mesAbrev.toLowerCase()];
    if (month) {
      const fullYear = year || new Date().getFullYear();
      return `${fullYear}-${month}-${day.padStart(2, '0')}`;
    }
  }
  
  // Formato brasileiro numérico (dd/mm/yyyy)
  const match = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [_, day, month, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
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

  // Limpar separadores de milhares antes de converter
  const quantidadeStr = String(quantidade).replace(/[.,]/g, '');
  const quantidadeNum = parseInt(quantidadeStr, 10);

  if (!quantidadeNum || quantidadeNum <= 0) {
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

  const prazo = parseBrazilianDate(row.Prazo || row.prazo);
  if (!prazo) {
    errors.push(`Linha ${rowNumber}: Prazo é obrigatório e deve estar no formato dd/mm/yyyy ou dd/mmm (ex: 20/10/2025 ou 20/out)`);
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
  parseBrazilianDate,
  getClientIP,
  getUserAgent,
  validateFileSize,
  truncateString
};

