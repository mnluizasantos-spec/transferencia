# Corrigir Função Update (Em Separação)

## Problema

**Linha 241:** `const [updated] = await sql.unsafe(query, ...updateValues);`

O `sql.unsafe()` não funciona com `@neondatabase/serverless`, causando erro ao tentar atualizar o status.

## Solução

Usar a sintaxe correta do Neon para UPDATE dinâmico:

```javascript
async function handleUpdate(event, sql, user) {
  const id = event.path.split('/').pop();
  const data = JSON.parse(event.body || '{}');

  // Buscar solicitação atual
  const [currentRequest] = await sql`
    SELECT * FROM material_requests WHERE id = ${id} AND deleted_at IS NULL
  `;

  if (!currentRequest) {
    throw notFoundError('Solicitação');
  }

  // Solicitantes só podem editar suas próprias solicitações
  if (user.role === 'solicitante' && currentRequest.created_by !== user.userId) {
    throw notFoundError('Solicitação');
  }

  // Validar dados
  const validatedData = validateRequestData(data, true);

  // Remover campos undefined
  const updateData = Object.fromEntries(
    Object.entries(validatedData).filter(([_, v]) => v !== undefined)
  );

  if (Object.keys(updateData).length === 0) {
    throw validationError('Nenhum dado para atualizar');
  }

  // Atualizar solicitação usando sintaxe Neon
  let updated;
  
  if (updateData.status) {
    [updated] = await sql`
      UPDATE material_requests 
      SET status = ${updateData.status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id} 
      RETURNING *
    `;
  } else {
    // Para outros campos, construir update mais complexo
    const setClause = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    
    // Usar abordagem alternativa: buscar, modificar, salvar
    const updatedRequest = { ...currentRequest, ...updateData, updated_at: new Date() };
    
    [updated] = await sql`
      UPDATE material_requests 
      SET 
        material_code = ${updatedRequest.material_code},
        material_description = ${updatedRequest.material_description},
        quantidade = ${updatedRequest.quantidade},
        unidade = ${updatedRequest.unidade},
        requester_name = ${updatedRequest.requester_name},
        urgencia = ${updatedRequest.urgencia},
        status = ${updatedRequest.status},
        deadline = ${updatedRequest.deadline},
        justificativa = ${updatedRequest.justificativa},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;
  }

  // ... resto do código (histórico, logs, etc.)
}
```

## Alternativa Mais Simples

Como a maioria das atualizações é apenas de `status`, podemos simplificar:

```javascript
async function handleUpdate(event, sql, user) {
  const id = event.path.split('/').pop();
  const data = JSON.parse(event.body || '{}');

  // Buscar solicitação atual
  const [currentRequest] = await sql`
    SELECT * FROM material_requests WHERE id = ${id} AND deleted_at IS NULL
  `;

  if (!currentRequest) {
    throw notFoundError('Solicitação');
  }

  // Solicitantes só podem editar suas próprias solicitações
  if (user.role === 'solicitante' && currentRequest.created_by !== user.userId) {
    throw notFoundError('Solicitação');
  }

  // Validar dados
  const validatedData = validateRequestData(data, true);

  // Remover campos undefined
  const updateData = Object.fromEntries(
    Object.entries(validatedData).filter(([_, v]) => v !== undefined)
  );

  if (Object.keys(updateData).length === 0) {
    throw validationError('Nenhum dado para atualizar');
  }

  // Mesclar dados atuais com novos dados
  const updatedRequest = { ...currentRequest, ...updateData };

  // Atualizar solicitação com todos os campos
  const [updated] = await sql`
    UPDATE material_requests 
    SET 
      material_code = ${updatedRequest.material_code},
      material_description = ${updatedRequest.material_description},
      quantidade = ${updatedRequest.quantidade},
      unidade = ${updatedRequest.unidade},
      requester_name = ${updatedRequest.requester_name},
      urgencia = ${updatedRequest.urgencia},
      status = ${updatedRequest.status},
      deadline = ${updatedRequest.deadline},
      justificativa = ${updatedRequest.justificativa},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id}
    RETURNING *
  `;

  // Registrar mudanças no histórico
  for (const [campo, valorNovo] of Object.entries(updateData)) {
    const valorAnterior = currentRequest[campo];
    
    if (valorAnterior !== valorNovo) {
      const acao = campo === 'status' ? 'status_mudado' : 'atualizado';
      
      await sql`
        INSERT INTO request_history 
          (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao)
        VALUES 
          (${id}, ${user.userId}, ${campo}, ${String(valorAnterior)}, ${String(valorNovo)}, ${acao})
      `;
    }
  }

  // Log de auditoria
  await sql`
    INSERT INTO audit_logs 
      (user_id, acao, tabela_afetada, registro_id, detalhes_json, ip_address, user_agent)
    VALUES 
      (${user.userId}, 'request_updated', 'material_requests', ${id}, 
       ${JSON.stringify(updateData)}::jsonb,
       ${getClientIP(event)}, ${getUserAgent(event)})
  `;

  logInfo('request_updated', { requestId: id, userId: user.userId, changes: Object.keys(updateData) });

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  };
}
```

## Recomendação

Usar a **Alternativa Mais Simples** porque:
1. Funciona com certeza
2. Não usa `sql.unsafe()`
3. Atualiza todos os campos explicitamente
4. Mais fácil de debugar
