# Corrigir Permissões e Banco de Dados

## Problemas Confirmados

1. **CRÍTICO:** Solicitante vê banco diferente (só suas próprias solicitações)
2. **Separador vê botão "Importar Excel"** - Deve ser escondido (só Admin)
3. **Gerar PDF ao "Iniciar Separação"** - Implementar geração automática
4. **Erro de histórico** - Corrigir função
5. **Falta campo `created_by` no SELECT** - Frontend precisa para verificar ownership

## Soluções

### 1. Corrigir Filtro de Solicitante (CRÍTICO)

**Arquivo:** `netlify/functions/requests.js` linha 37-56

**Problema:** Solicitante só vê suas próprias solicitações devido ao filtro WHERE.

**Opção A - Todos veem tudo (sem filtro):**
```javascript
// Remover o if/else e usar mesma query para todos
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
    created_at,
    updated_at,
    created_by  -- ADICIONAR ESTE CAMPO
  FROM material_requests
  WHERE deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 100
`;
```

**Opção B - Manter segurança mas mostrar todas (recomendado):**
Manter filtro mas adicionar `created_by` no SELECT para frontend funcionar.

### 2. Esconder "Importar Excel" para Separador

**Arquivo:** `web/index.html`

Adicionar função após `initializeUser()`:

```javascript
function setupRoleVisibility() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Esconder importação Excel para separador e solicitante
    if (user.role === 'separador' || user.role === 'solicitante') {
        const importLabel = document.querySelector('label.btn-info');
        if (importLabel) importLabel.style.display = 'none';
        
        const templateBtn = document.querySelector('.btn-secondary');
        if (templateBtn && templateBtn.textContent.includes('Template')) {
            templateBtn.style.display = 'none';
        }
    }
}

// Chamar em DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initializeUser();
    setupRoleVisibility(); // ADICIONAR AQUI
    loadDashboard();
    loadRequests();
    setupEventListeners();
});
```

### 3. Gerar PDF Automaticamente ao Iniciar Separação

**Arquivo:** `web/index.html` na função `updateStatus`

```javascript
window.updateStatus = async function(id, newStatus) {
    const statusLabels = {
        'Pendente': 'Pendente',
        'Em Separação': 'Em Separação',
        'Concluído': 'Concluído',
        'Cancelado': 'Cancelado'
    };
    
    if (!confirm(`Alterar status para "${statusLabels[newStatus]}"?`)) return;

    try {
        await updateRequest(id, { status: newStatus });
        
        // Se mudou para "Em Separação", gerar PDF automaticamente
        if (newStatus === 'Em Separação') {
            try {
                await printPickingList([id]);
                alert(`Status alterado e lista de separação gerada!`);
            } catch (printError) {
                console.error('Erro ao gerar PDF:', printError);
                alert(`Status alterado para "${statusLabels[newStatus]}", mas houve erro ao gerar PDF.`);
            }
        } else {
            alert(`Status alterado para "${statusLabels[newStatus]}"!`);
        }
        
        await loadRequests();
    } catch (error) {
        alert(`Erro: ${error.message}`);
    }
};
```

### 4. Adicionar `created_by` no SELECT

**Arquivo:** `netlify/functions/requests.js`

Adicionar campo `created_by` em TODAS as queries SELECT (linhas 41-50 e 59-70):

```javascript
SELECT 
  id,
  material_code,
  material_description,
  quantidade,
  unidade,
  requester_name,
  urgencia,
  status,
  created_at,
  updated_at,
  created_by  -- ADICIONAR
FROM material_requests
```

### 5. Verificar Função de Histórico

**Arquivo:** `netlify/functions/history.js`

Verificar se existe e está funcionando. Se não existir, criar baseado em `requests.js`.

## Decisão Necessária

**IMPORTANTE:** Como você quer que o sistema funcione?

- **Opção A:** Todos os usuários veem TODAS as solicitações (sem filtro)
- **Opção B:** Solicitante vê apenas suas próprias, Admin/Separador veem todas (atual)

Qual opção você prefere?

## Ordem de Implementação

1. **PRIMEIRO:** Decidir sobre filtro de solicitante (Opção A ou B)
2. Adicionar `created_by` em todos os SELECTs
3. Esconder botão Excel para separador
4. Implementar geração automática de PDF
5. Verificar/corrigir função de histórico
6. Testar fluxo completo
