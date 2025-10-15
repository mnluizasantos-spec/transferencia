# Corrigir Erros Finais e Ajustar Permissões

## Problemas Identificados

1. **Erro ao iniciar separação** - Verificar erro específico
2. **Erro ao imprimir** - Função printPickingList pode não existir ou estar quebrada
3. **Solicitante e Admin devem ter Importar Excel** - Apenas Separador não deve ter
4. **Trocar nome do perfil** - "Solicitante Teste" → "Solicitante"

## Soluções

### 1. Corrigir Visibilidade do Botão Excel

**Arquivo:** `web/index.html` na função `setupRoleVisibility()`

**Problema:** Código atual esconde Excel para solicitante e separador
**Correção:** Esconder apenas para separador

```javascript
function setupRoleVisibility() {
    const user = getCurrentUser();
    if (!user) return;
    
    // Esconder importação Excel APENAS para separador
    if (user.role === 'separador') {
        const importLabel = document.querySelector('label.btn-info');
        if (importLabel) importLabel.style.display = 'none';
        
        const templateBtn = document.querySelector('.btn-secondary');
        if (templateBtn && templateBtn.textContent.includes('Template')) {
            templateBtn.style.display = 'none';
        }
    }
}
```

### 2. Verificar Função printPickingList

**Arquivo:** `netlify/functions/print.js`

Verificar se a função existe e está funcionando corretamente. Se não existir, criar.

**Possível problema:** Função pode estar esperando dados em formato diferente.

### 3. Trocar Nome do Usuário Solicitante

**Opção A - Via SQL direto no banco:**
```sql
UPDATE users 
SET nome = 'Solicitante', name = 'Solicitante'
WHERE email = 'solicitante@antilhas.com';
```

**Opção B - Via função Netlify:**
Criar endpoint temporário para atualizar o nome.

**Opção C - Via setup-users.js:**
Modificar a função existente para usar "Solicitante" em vez de "Solicitante Teste".

### 4. Investigar Erro ao Iniciar Separação

**Possíveis causas:**
- Função `updateRequest` não está funcionando
- Campo `status` não está sendo atualizado no banco
- Erro na função `printPickingList`

**Verificação necessária:**
- Checar logs do Netlify Functions
- Verificar se backend aceita status "Em Separação"
- Testar updateRequest isoladamente

### 5. Investigar Erro ao Imprimir

**Arquivo:** `web/js/api.js` - verificar função `printPickingList`

**Possíveis problemas:**
- Função não existe
- Endpoint `/print/picking-list` não existe
- Formato de dados incorreto

## Ordem de Implementação

1. **PRIMEIRO:** Corrigir visibilidade Excel (solicitante e admin devem ver)
2. **SEGUNDO:** Trocar nome do usuário solicitante
3. **TERCEIRO:** Verificar/criar função printPickingList
4. **QUARTO:** Testar iniciar separação sem PDF primeiro
5. **QUINTO:** Adicionar geração de PDF após confirmar que status funciona

## Testes Necessários

1. Login como solicitante → Deve ver botão Excel
2. Login como admin → Deve ver botão Excel  
3. Login como separador → NÃO deve ver botão Excel
4. Separador clica "Iniciar Separação" → Deve mudar status (sem PDF primeiro)
5. Após status funcionar, adicionar PDF
6. Verificar nome do usuário solicitante
