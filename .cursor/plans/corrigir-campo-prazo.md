# Corrigir Campo Prazo - Inconsistência de Nomes

## Problema Identificado

**Inconsistência entre frontend e backend:**

1. **Frontend HTML:** Campo se chama `prazo` (`<input id="prazo">`)
2. **Frontend JavaScript:** Envia `deadline` (`deadline: document.getElementById('prazo').value`)
3. **Backend:** Usa `deadline` na tabela e validação
4. **Frontend renderização:** Busca `req.prazo || req.deadline`

## Problemas

1. **Campo não está sendo salvo:** Frontend envia `deadline` mas pode não estar sendo processado
2. **Campo não está sendo exibido:** Inconsistência na busca `req.prazo || req.deadline`
3. **Validação pode estar rejeitando:** Validador pode não estar aceitando `deadline`

## Soluções

### Opção A - Padronizar tudo como `deadline` (Recomendado)

**1. Corrigir Frontend - Enviar dados corretos:**
```javascript
// Em saveRequest() - linha 520
const requestData = {
    material_code: document.getElementById('material-code').value,
    material_description: document.getElementById('material-description').value,
    quantidade: parseInt(document.getElementById('quantidade').value),
    unidade: document.getElementById('unidade').value,
    urgencia: document.getElementById('urgencia').value,
    deadline: document.getElementById('prazo').value || null, // ✅ Correto
    production_start_date: document.getElementById('inicio-producao').value || null,
    justificativa: document.getElementById('justificativa').value || null,
    requester_name: document.getElementById('solicitante').value
};
```

**2. Corrigir Backend - Garantir que `deadline` seja salvo:**
```javascript
// Em handleCreate() - linha 126-130
INSERT INTO material_requests 
  (material_code, material_description, quantidade, unidade, justificativa, requester_name, urgencia, deadline, production_start_date, status, created_by)
VALUES 
  (${validatedData.material_code}, ${validatedData.material_description}, ${validatedData.quantidade}, 
   ${validatedData.unidade}, ${validatedData.justificativa}, ${validatedData.requester_name}, ${validatedData.urgencia}, 
   ${validatedData.deadline}, ${validatedData.production_start_date}, 'Pendente', ${user.userId})
```

**3. Corrigir Backend - Adicionar `deadline` no SELECT:**
```javascript
// Em handleList() - linha 35-52
SELECT 
  id,
  material_code,
  material_description,
  quantidade,
  unidade,
  requester_name,
  urgencia,
  status,
  deadline, // ✅ ADICIONAR ESTE CAMPO
  created_at,
  updated_at,
  created_by
FROM material_requests
```

**4. Corrigir Frontend - Usar apenas `deadline`:**
```javascript
// Em formatPrazo() - linha 402
<td>${formatPrazo(req.deadline, req.status)}</td>

// Em editRequest() - linha 505
document.getElementById('prazo').value = request.deadline || '';

// Em formatPrazo() - linha 424
function formatPrazo(deadline, status) {
    if (!deadline || status === 'Concluído') return '-';
    // ... resto da função
}
```

### Opção B - Padronizar tudo como `prazo`

Menos recomendado pois requer mudança no banco de dados.

## Verificações Necessárias

1. **Banco de dados:** Confirmar que coluna se chama `deadline`
2. **Validação:** Verificar se `validateRequestData` aceita `deadline`
3. **Frontend:** Confirmar que está enviando `deadline` corretamente

## Implementação

1. **PRIMEIRO:** Adicionar `deadline` no SELECT do backend
2. **SEGUNDO:** Corrigir frontend para usar apenas `deadline`
3. **TERCEIRO:** Testar criação de solicitação com prazo
4. **QUARTO:** Testar exibição do prazo na lista
5. **QUINTO:** Testar edição de solicitação com prazo

## Testes

1. Criar solicitação com prazo preenchido
2. Verificar se prazo aparece na lista
3. Editar solicitação e verificar se prazo é carregado
4. Alterar prazo e salvar
5. Verificar se novo prazo aparece na lista
