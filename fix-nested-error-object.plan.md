# Plano: Corrigir Extração de Mensagem de Erro Aninhada

## Problema Identificado

**Logs do console:**
```
Token presente: false
Usuário atual: admin
Erro do servidor (status 401): {
  "error": {
    "type": "AUTHENTICATION_ERROR",
    "message": "Token inválido",
    "timestamp": "2025-10-15T19:12:21.625Z"
  }
}
Mensagem de erro extraída: {type: 'AUTHENTICATION_ERROR', message: 'Token inválido', timestamp: '2025-10-15T19:12:21.625Z'}
Erro ao excluir: Error: [object Object]
```

**Problema:** 
- O erro do servidor tem estrutura aninhada: `error.error.message`
- Estamos extraindo `error.error` (objeto) ao invés de `error.error.message` (string)
- Resultado: ainda temos `[object Object]` na mensagem final

**Causa Raiz:**
- Token não está presente no localStorage (`Token presente: false`)
- Usuário está logado mas token foi perdido/expirado
- Backend retorna erro com estrutura: `{ error: { type, message, timestamp } }`
- Código atual não trata estruturas aninhadas

## Análise do Código

### Código Atual (linha 753-758)
```javascript
errorMessage = error.message 
    || error.error 
    || error.msg 
    || error.details 
    || (typeof error === 'string' ? error : JSON.stringify(error))
    || errorMessage;
```

**Problema:** `error.error` retorna o objeto completo `{ type, message, timestamp }` ao invés da string `"Token inválido"`

## Solução

### 1. Tratar Estruturas Aninhadas

Verificar se `error.error` é um objeto e extrair sua propriedade `message`:

```javascript
// Função auxiliar para extrair mensagem de erro
function extractErrorMessage(error) {
    // Se for string, retornar direto
    if (typeof error === 'string') return error;
    
    // Tentar propriedades diretas
    if (error.message && typeof error.message === 'string') return error.message;
    if (error.msg && typeof error.msg === 'string') return error.msg;
    if (error.details && typeof error.details === 'string') return error.details;
    
    // Tentar propriedades aninhadas (error.error.message)
    if (error.error) {
        if (typeof error.error === 'string') return error.error;
        if (error.error.message) return error.error.message;
        if (error.error.msg) return error.error.msg;
    }
    
    // Fallback para JSON
    return JSON.stringify(error);
}

// Usar a função
errorMessage = extractErrorMessage(error) || errorMessage;
```

### 2. Solução Inline (Mais Simples)

```javascript
// Tentar extrair mensagem de erro de várias propriedades possíveis
errorMessage = error.message 
    || (error.error && typeof error.error === 'object' ? error.error.message : error.error)
    || error.msg 
    || error.details 
    || (typeof error === 'string' ? error : JSON.stringify(error))
    || errorMessage;
```

### 3. Corrigir Problema do Token

**Problema adicional:** Token está `false` mas usuário está logado como `admin`

**Causa:** Token foi removido do localStorage mas dados do usuário permanecem

**Solução:** Verificar token antes de fazer requisição e redirecionar para login se não existir

```javascript
window.deleteRequest = async function(id) {
    if (!confirm('Tem certeza que deseja EXCLUIR permanentemente esta solicitação? Esta ação não pode ser desfeita.')) return;
    
    try {
        console.log('Tentando excluir solicitação:', id);
        const token = localStorage.getItem('token');
        const user = getCurrentUser();
        console.log('Token presente:', !!token);
        console.log('Usuário atual:', user?.role);
        
        // FIX: Se não tem token, redirecionar para login imediatamente
        if (!token) {
            alert('Sessão expirada. Faça login novamente.');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        // ... resto do código
    }
}
```

## Código Completo Corrigido

```javascript
window.deleteRequest = async function(id) {
    if (!confirm('Tem certeza que deseja EXCLUIR permanentemente esta solicitação? Esta ação não pode ser desfeita.')) return;
    
    try {
        console.log('Tentando excluir solicitação:', id);
        const token = localStorage.getItem('token');
        const user = getCurrentUser();
        console.log('Token presente:', !!token);
        console.log('Usuário atual:', user?.role);
        
        // FIX: Se não tem token, redirecionar para login imediatamente
        if (!token) {
            alert('Sessão expirada. Faça login novamente.');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
            return;
        }
        
        const response = await fetch(`/.netlify/functions/requests/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        
        if (!response.ok) {
            let errorMessage = 'Erro ao excluir';
            try {
                const error = await response.json();
                // Log detalhado do erro
                console.error('Erro do servidor (status ' + response.status + '):', JSON.stringify(error, null, 2));
                
                // FIX: Tentar extrair mensagem de erro tratando estruturas aninhadas
                errorMessage = error.message 
                    || (error.error && typeof error.error === 'object' ? error.error.message : error.error)
                    || error.msg 
                    || error.details 
                    || (typeof error === 'string' ? error : JSON.stringify(error))
                    || errorMessage;
                    
                console.log('Mensagem de erro extraída:', errorMessage);
            } catch (e) {
                console.error('Erro ao parsear resposta JSON:', e);
                console.error('Response status:', response.status);
                console.error('Response statusText:', response.statusText);
                
                if (response.status === 401) {
                    errorMessage = 'Sessão expirada. Faça login novamente.';
                    setTimeout(() => {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = 'login.html';
                    }, 2000);
                } else if (response.status === 403) {
                    errorMessage = 'Sem permissão para excluir. Apenas administradores podem excluir solicitações.';
                } else if (response.status === 404) {
                    errorMessage = 'Solicitação não encontrada.';
                } else if (response.status === 500) {
                    errorMessage = 'Erro interno do servidor. Tente novamente.';
                } else {
                    errorMessage = `Erro ${response.status}: ${response.statusText}`;
                }
            }
            throw new Error(errorMessage);
        }
        
        console.log('Exclusão bem-sucedida');
        
        // Remover da lista local imediatamente
        currentRequests = currentRequests.filter(r => r.id !== id);
        renderRequests();
        
        // Recarregar para garantir sincronização
        await loadRequests();
        await loadDashboard();
        
        alert('Solicitação excluída com sucesso');
    } catch (error) {
        const errorMsg = error?.message || error?.toString() || 'Erro desconhecido ao excluir';
        alert('Erro ao excluir: ' + errorMsg);
        console.error('Erro ao excluir:', error);
        
        // Se for erro de autenticação, redirecionar para login
        if (errorMsg.includes('autorizado') || errorMsg.includes('Sessão expirada') || errorMsg.includes('Token inválido')) {
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }, 2000);
        }
    }
};
```

## Arquivos Afetados

- `web/index.html` - função `window.deleteRequest()`

## Mudanças Específicas

1. **Linha ~735:** Adicionar verificação de token antes da requisição
2. **Linha ~753:** Melhorar extração de mensagem para tratar `error.error.message`
3. **Linha ~793:** Adicionar "Token inválido" na verificação de redirecionamento

## Benefícios

1. ✅ Extrai corretamente mensagens de erros aninhados
2. ✅ Verifica token antes de fazer requisição (evita 401 desnecessário)
3. ✅ Redireciona automaticamente para login se token não existir
4. ✅ Mensagens sempre legíveis, nunca `[object Object]`
5. ✅ Melhor experiência do usuário

## To-do

- [ ] Adicionar verificação de token antes da requisição
- [ ] Melhorar extração de mensagem para tratar estruturas aninhadas
- [ ] Adicionar "Token inválido" na lista de erros de autenticação
- [ ] Testar exclusão sem token (deve redirecionar imediatamente)
- [ ] Testar exclusão com token inválido (deve mostrar mensagem e redirecionar)

