# Corrigir PDF, Filtros e Função Em Separação

## Problemas Identificados

### 1. PDF - Trocar Solicitante por Descrição
**Problema:** PDF mostra coluna "Solicitante" mas usuário quer "Descrição do Material"

**Arquivo:** `netlify/functions/print.js` linha 44

**Mudança:**
```javascript
// ANTES:
<td>${req.solicitante_nome}</td>

// DEPOIS:
<td>${req.material_description || req.material_code}</td>
```

**Cabeçalho da tabela também precisa mudar (linha ~240):**
```javascript
// ANTES:
<th>Solicitante</th>

// DEPOIS:
<th>Descrição</th>
```

### 2. Filtros não funcionam
**Problema:** Backend não processa os filtros `status` e `urgencia`

**Arquivo:** `netlify/functions/requests.js` - função `handleList`

**Causa:** Query não usa `queryStringParameters` para filtrar

**Solução:**
```javascript
async function handleList(event, sql, user) {
  try {
    console.log('Requests List - Iniciando', { userRole: user.role, userName: user.name });
    
    // Obter filtros da query string
    const params = event.queryStringParameters || {};
    const statusFilter = params.status;
    const urgenciaFilter = params.urgencia;
    const searchFilter = params.search;
    
    console.log('Filtros recebidos:', { statusFilter, urgenciaFilter, searchFilter });
    
    // Construir query com filtros
    let whereConditions = ['deleted_at IS NULL'];
    let queryParams = [];
    
    if (statusFilter) {
      whereConditions.push(`status = '${statusFilter}'`);
    }
    
    if (urgenciaFilter) {
      whereConditions.push(`urgencia = '${urgenciaFilter}'`);
    }
    
    if (searchFilter) {
      whereConditions.push(`(material_description ILIKE '%${searchFilter}%' OR material_code ILIKE '%${searchFilter}%' OR requester_name ILIKE '%${searchFilter}%')`);
    }
    
    const whereClause = whereConditions.join(' AND ');
    
    const requests = await sql`
      SELECT 
        id,
        material_code,
        material_description,
        quantidade,
        unidade,
        requester_name,
        urgencia,
        status,
        deadline,
        justificativa,
        created_at,
        updated_at,
        created_by
      FROM material_requests
      WHERE ${sql.unsafe(whereClause)}
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    // ... resto do código
  }
}
```

### 3. Função "Em Separação" não funciona
**Possíveis causas:**
1. Função `updateRequest` no backend não aceita apenas `status`
2. Validação muito restritiva
3. Erro de permissão
4. Frontend não está enviando corretamente

**Investigação necessária:**
- Ver logs do Netlify Functions
- Verificar se `updateRequest` aceita atualização parcial
- Verificar validação em `validators.js`

**Possível solução em `netlify/functions/utils/validators.js`:**
```javascript
function validateRequestData(data, isUpdate = false) {
  const errors = [];

  // Se for update, todos os campos são opcionais
  if (!isUpdate) {
    // Validações obrigatórias apenas para criação
    if (!data.material_code || data.material_code.trim() === '') {
      errors.push('Código do material é obrigatório');
    }
    // ... outras validações obrigatórias
  }
  
  // Validações de formato (sempre aplicadas se campo existir)
  if (data.material_code && data.material_code.length > 100) {
    errors.push('Código do material deve ter no máximo 100 caracteres');
  }
  
  // ... resto das validações
}
```

## Ordem de Implementação

1. **PRIMEIRO:** Corrigir PDF - trocar solicitante por descrição
2. **SEGUNDO:** Implementar filtros no backend
3. **TERCEIRO:** Investigar e corrigir função "Em Separação"
4. **QUARTO:** Testar todos os fluxos

## Testes

1. **PDF:**
   - Gerar PDF e verificar se mostra "Descrição" em vez de "Solicitante"
   - Verificar se descrição aparece corretamente

2. **Filtros:**
   - Filtrar por Status "Pendente" → Deve mostrar apenas pendentes
   - Filtrar por Urgência "Urgente" → Deve mostrar apenas urgentes
   - Buscar por texto → Deve filtrar por material/código/solicitante
   - Combinar filtros → Deve aplicar todos

3. **Em Separação:**
   - Separador clica "Iniciar Separação"
   - Status deve mudar para "Em Separação"
   - PDF deve ser gerado automaticamente

## Resumo das Mudanças

**netlify/functions/print.js:**
- Linha 44: Trocar `req.solicitante_nome` por `req.material_description || req.material_code`
- Linha ~240: Trocar cabeçalho "Solicitante" por "Descrição"

**netlify/functions/requests.js:**
- Função `handleList`: Adicionar processamento de `queryStringParameters`
- Implementar filtros de status, urgência e busca

**netlify/functions/utils/validators.js (se necessário):**
- Garantir que `isUpdate = true` torna todos os campos opcionais
