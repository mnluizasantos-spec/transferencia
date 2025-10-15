# Corrigir Permissões e Funcionalidades do Solicitante

## Problemas Identificados

1. **Solicitante vê botões de Excel e Nova Solicitação** - Deve esconder Excel, mas manter Nova Solicitação
2. **Erro ao "Iniciar Separação"** - Solicitante não deve ver este botão
3. **Erro de histórico** - Verificar função getRequestHistory
4. **Gerar PDF ao iniciar separação** - Implementar impressão automática

## Soluções

### 1. Esconder botão "Importar Excel" para Solicitante

**Arquivo:** `web/index.html` linha ~97-100

Adicionar controle de visibilidade baseado em role:

```javascript
// Após initializeUser(), adicionar:
function setupRoleVisibility() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Esconder importação Excel para solicitantes
    if (user.role === 'solicitante') {
        const importButton = document.querySelector('label.btn-info');
        if (importButton) importButton.style.display = 'none';
        
        const templateButton = document.querySelector('.btn-secondary');
        if (templateButton && templateButton.textContent.includes('Template')) {
            templateButton.style.display = 'none';
        }
    }
}
```

### 2. Verificar Botão "Iniciar Separação"

O código já implementado em `getActionButtons()` deve prevenir que solicitantes vejam este botão. Verificar se `req.created_by` está sendo retornado corretamente do backend.

**Verificação necessária:** Backend deve retornar `created_by` em todas as requisições.

### 3. Corrigir Erro de Histórico

**Arquivo:** `netlify/functions/history.js`

Verificar se a função existe e está funcionando corretamente. Se não existir, criar.

### 4. Gerar PDF ao Iniciar Separação

**Arquivo:** `web/index.html`

Modificar função `updateStatus` para gerar PDF automaticamente quando status muda para "Em Separação":

```javascript
window.updateStatus = async function(id, newStatus) {
    // ... código existente ...
    
    try {
        await updateRequest(id, { status: newStatus });
        alert(`Status alterado para "${statusLabels[newStatus]}"!`);
        
        // Se mudou para "Em Separação", gerar PDF automaticamente
        if (newStatus === 'Em Separação') {
            await printPickingList([id]);
        }
        
        await loadRequests();
    } catch (error) {
        alert(`Erro: ${error.message}`);
    }
};
```

## Prioridades

1. **Urgente:** Esconder botão Excel para solicitante
2. **Urgente:** Verificar erro de histórico
3. **Importante:** Garantir que solicitante não vê botão "Iniciar Separação"
4. **Importante:** Implementar geração automática de PDF
5. **Verificação:** Confirmar que backend retorna `created_by`

## Testes Necessários

1. Login como solicitante → Verificar que não vê botão Excel
2. Login como solicitante → Verificar que vê botão Nova Solicitação
3. Login como solicitante → Criar solicitação e verificar que só vê botão Editar
4. Login como separador → Iniciar separação e verificar se PDF é gerado
5. Verificar histórico em todas as solicitações
