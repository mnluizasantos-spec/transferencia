# Ajustes Finais do Sistema

## Problemas/Solicitações

1. **Remover geração automática de PDF ao iniciar separação**
2. **Urgência está sendo resetada para "Normal" ao atualizar status**
3. **Deixar apenas 3 primeiras unidades (kg, pc, m)**
4. **Tornar campo "Prazo" obrigatório**

## Soluções

### 1. Remover PDF Automático

**Arquivo:** `web/index.html` linhas 579-587

**Mudança:**
```javascript
// ANTES:
window.updateStatus = async function(id, newStatus) {
    // ...
    try {
        await updateRequest(id, { status: newStatus });
        
        // Se mudou para "Em Separação", gerar PDF automaticamente
        if (newStatus === 'Em Separação') {
            try {
                await printPickingList([id]);
                alert(`Status alterado para "Em Separação" e lista de separação gerada!`);
            } catch (printError) {
                console.error('Erro ao gerar PDF:', printError);
                alert(`Status alterado para "Em Separação", mas houve erro ao gerar PDF.`);
            }
        } else {
            alert(`Status alterado para "${statusLabels[newStatus]}"!`);
        }
        // ...
    }
};

// DEPOIS:
window.updateStatus = async function(id, newStatus) {
    // ...
    try {
        await updateRequest(id, { status: newStatus });
        alert(`Status alterado para "${statusLabels[newStatus]}"!`);
        await loadRequests();
    } catch (error) {
        alert(`Erro: ${error.message}`);
    }
};
```

### 2. Manter Urgência ao Atualizar Status

**Problema:** Validador retorna `urgencia: data.urgencia || 'Normal'`, forçando "Normal" quando não enviado.

**Arquivo:** `netlify/functions/utils/validators.js` linha ~169-180

**Mudança:**
```javascript
// ANTES:
return {
    material_code: data.material_code && data.material_code.trim() !== '' ? sanitizeString(data.material_code) : undefined,
    material_description: data.material_description && data.material_description.trim() !== '' ? sanitizeString(data.material_description) : undefined,
    quantidade: data.quantidade ? parseInt(data.quantidade, 10) : undefined,
    unidade: data.unidade || 'un',
    requester_name: data.requester_name && data.requester_name.trim() !== '' ? sanitizeString(data.requester_name) : undefined,
    urgencia: data.urgencia || 'Normal',  // ❌ PROBLEMA: força "Normal"
    status: data.status || 'Pendente',
    deadline: data.deadline || null,
    production_start_date: data.production_start_date || null,
    justificativa: data.justificativa && data.justificativa.trim() !== '' ? sanitizeString(data.justificativa) : null,
    created_by: data.created_by
};

// DEPOIS:
return {
    material_code: data.material_code && data.material_code.trim() !== '' ? sanitizeString(data.material_code) : undefined,
    material_description: data.material_description && data.material_description.trim() !== '' ? sanitizeString(data.material_description) : undefined,
    quantidade: data.quantidade ? parseInt(data.quantidade, 10) : undefined,
    unidade: data.unidade ? data.unidade : undefined,  // ✅ Não força valor padrão
    requester_name: data.requester_name && data.requester_name.trim() !== '' ? sanitizeString(data.requester_name) : undefined,
    urgencia: data.urgencia ? data.urgencia : undefined,  // ✅ Não força valor padrão
    status: data.status ? data.status : undefined,  // ✅ Não força valor padrão
    deadline: data.deadline || null,
    production_start_date: data.production_start_date || null,
    justificativa: data.justificativa && data.justificativa.trim() !== '' ? sanitizeString(data.justificativa) : null,
    created_by: data.created_by
};
```

**Explicação:** Quando atualizamos apenas `status`, não devemos enviar `urgencia`. Se enviarmos `undefined`, o validador não deve forçar "Normal".

### 3. Deixar Apenas 3 Unidades (kg, pc, m)

**Arquivo:** `web/index.html` linhas 168-178

**Mudança:**
```javascript
// ANTES:
<select id="unidade" required>
    <option value="">Selecione a unidade</option>
    <option value="kg">kg (Quilograma)</option>
    <option value="pc">pc (Peça)</option>
    <option value="m">m (Metro)</option>
    <option value="l">l (Litro)</option>
    <option value="g">g (Grama)</option>
    <option value="ton">ton (Tonelada)</option>
    <option value="m²">m² (Metro quadrado)</option>
    <option value="m³">m³(Metro cúbico)</option>
</select>

// DEPOIS:
<select id="unidade" required>
    <option value="">Selecione a unidade</option>
    <option value="kg">kg (Quilograma)</option>
    <option value="pc">pc (Peça)</option>
    <option value="m">m (Metro)</option>
</select>
```

### 4. Tornar Campo "Prazo" Obrigatório

**Arquivo:** `web/index.html` linha 195-197

**Mudança:**
```javascript
// ANTES:
<div class="form-group">
    <label for="prazo">Prazo</label>
    <input type="date" id="prazo">
</div>

// DEPOIS:
<div class="form-group">
    <label for="prazo">Prazo *</label>
    <input type="date" id="prazo" required>
</div>
```

**Validação Backend:** `netlify/functions/utils/validators.js`

```javascript
// Adicionar validação obrigatória para deadline
if (!isUpdate && !data.deadline) {
    errors.push('Prazo é obrigatório');
}

if (data.deadline && !isValidDate(data.deadline)) {
    errors.push('Prazo deve ser uma data válida');
}
```

## Ordem de Implementação

1. **PRIMEIRO:** Remover PDF automático (frontend)
2. **SEGUNDO:** Corrigir validador para não forçar valores padrão (backend)
3. **TERCEIRO:** Remover unidades extras (frontend)
4. **QUARTO:** Tornar prazo obrigatório (frontend + backend)
5. **QUINTO:** Testar fluxo completo

## Testes

1. **PDF:** Clicar "Em Separação" → Não deve gerar PDF automaticamente
2. **Urgência:** Criar solicitação "Urgente" → Clicar "Em Separação" → Deve manter "Urgente"
3. **Unidades:** Abrir modal → Deve mostrar apenas kg, pc, m
4. **Prazo:** Tentar criar sem prazo → Deve dar erro de validação

## Resumo das Mudanças

**web/index.html:**
- Remover código de PDF automático (linhas 579-587)
- Remover unidades extras (linhas 171-178)
- Tornar prazo obrigatório (linha 196)

**netlify/functions/utils/validators.js:**
- Não forçar valores padrão em updates (linha ~169-180)
- Adicionar validação obrigatória para deadline
