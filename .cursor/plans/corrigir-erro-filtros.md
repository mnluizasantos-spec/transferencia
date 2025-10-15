# Corrigir Erro 500 nos Filtros

## Problema

**Erro:** `sql.unsafe()` não funciona com o driver `@neondatabase/serverless`

**Linha 75:** `WHERE ${sql.unsafe(whereClause)}`

## Solução

Usar a abordagem correta do Neon com queries condicionais:

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
    
    // Construir query base
    let query = sql`
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
      WHERE deleted_at IS NULL
    `;
    
    // Adicionar filtros condicionalmente
    if (statusFilter) {
      query = sql`${query} AND status = ${statusFilter}`;
    }
    
    if (urgenciaFilter) {
      query = sql`${query} AND urgencia = ${urgenciaFilter}`;
    }
    
    if (searchFilter) {
      const searchPattern = `%${searchFilter}%`;
      query = sql`${query} AND (
        material_description ILIKE ${searchPattern} OR 
        material_code ILIKE ${searchPattern} OR 
        requester_name ILIKE ${searchPattern}
      )`;
    }
    
    // Adicionar ordenação e limite
    query = sql`${query} ORDER BY created_at DESC LIMIT 100`;
    
    const requests = await query;
    
    console.log('Requests List - Resultado', { count: requests.length });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requests)
    };
  } catch (error) {
    console.error('Erro em handleList:', error);
    throw error;
  }
}
```

## Alternativa Mais Simples

Se a abordagem acima não funcionar, usar filtro no JavaScript:

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
    
    // Buscar todas as solicitações
    let requests = await sql`
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
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 100
    `;
    
    // Aplicar filtros em JavaScript
    if (statusFilter) {
      requests = requests.filter(r => r.status === statusFilter);
    }
    
    if (urgenciaFilter) {
      requests = requests.filter(r => r.urgencia === urgenciaFilter);
    }
    
    if (searchFilter) {
      const search = searchFilter.toLowerCase();
      requests = requests.filter(r => 
        (r.material_description && r.material_description.toLowerCase().includes(search)) ||
        (r.material_code && r.material_code.toLowerCase().includes(search)) ||
        (r.requester_name && r.requester_name.toLowerCase().includes(search))
      );
    }
    
    console.log('Requests List - Resultado', { count: requests.length });
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requests)
    };
  } catch (error) {
    console.error('Erro em handleList:', error);
    throw error;
  }
}
```

## Recomendação

Usar a **Alternativa Mais Simples** (filtro em JavaScript) porque:
1. Mais fácil de implementar
2. Funciona com certeza
3. Performance aceitável para até 100 registros
4. Evita problemas com sintaxe SQL do Neon
