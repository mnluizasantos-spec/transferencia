# 🚨 Diagnóstico do Erro 500 - Guia Imediato

## Problema Atual
- ❌ Erro 500 no servidor
- ❌ ID 125 mostrando 40.881 KG (provavelmente incorreto)
- ❌ Download de arquivo corrompido
- ❌ Botão "Ver itens" não funciona

## Diagnóstico Imediato

### Passo 1: Testar Conectividade (SEM AUTENTICAÇÃO)
**Acesse no navegador:**
```
https://transferencia-mp.netlify.app/.netlify/functions/test-connection
```

**Ou via JavaScript no console:**
```javascript
fetch('https://transferencia-mp.netlify.app/.netlify/functions/test-connection')
.then(r => r.json())
.then(data => {
  console.log('🔍 Diagnóstico:', data);
  if (data.success) {
    console.log('✅ Conectividade OK');
    console.log('ID 125:', data.tests.id125);
    console.log('IDs problemáticos:', data.tests.problemIds);
  } else {
    console.log('❌ Erro:', data.error);
  }
});
```

### Passo 2: Verificar Network Tab (F12)
1. Abrir DevTools (F12)
2. Ir em Network tab
3. Recarregar página
4. Identificar qual requisição retorna 500
5. Clicar na requisição falhada
6. Ver detalhes do erro

### Passo 3: Verificar Logs do Netlify
1. Acessar https://app.netlify.com
2. Selecionar site "transferencia-mp"
3. Ir em "Functions"
4. Ver logs recentes
5. Procurar por erros 500

## Possíveis Causas do Erro 500

### 1. Token Expirado (MAIS PROVÁVEL)
**Sintoma:** Erro ao chamar endpoints que requerem autenticação
**Solução:** Fazer logout/login

### 2. Endpoint Não Deployado
**Sintoma:** 404 ou 500 em endpoints temporários
**Solução:** Fazer push manual

### 3. Problema de Banco de Dados
**Sintoma:** Erro 500 em todas as funções
**Solução:** Verificar DATABASE_URL

### 4. Erro de Sintaxe
**Sintoma:** Erro 500 em função específica
**Solução:** Verificar logs do Netlify

## Correção do ID 125

### Se Conectividade OK:
**Corrigir via SQL direto no Neon Console:**
```sql
-- Ver valor atual
SELECT id, quantidade, material_code, material_description 
FROM material_requests 
WHERE id = 125;

-- Se quantidade > 10000, corrigir para valor razoável
UPDATE material_requests 
SET quantidade = 41 
WHERE id = 125 AND quantidade > 10000;

-- Registrar no histórico
INSERT INTO request_history 
  (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
VALUES 
  (125, 1, 'quantidade', 40881, 41, 'corrigido', 'Correção manual: 40.881 → 41 KG');
```

### Se Conectividade Falhar:
**Problema mais sério - verificar:**
1. DATABASE_URL no Netlify
2. Status do Neon PostgreSQL
3. Logs do Netlify Functions

## Push Manual (Se Necessário)

### Opção A: GitHub Desktop (RECOMENDADO)
1. Abrir GitHub Desktop
2. Ver commits pendentes
3. Clicar "Push origin"

### Opção B: VSCode
1. Source Control (Ctrl+Shift+G)
2. "Sync Changes"

### Opção C: Linha de Comando
```bash
git push origin main
```

## Sequência de Testes

### Teste 1: Conectividade
```
GET /.netlify/functions/test-connection
```
**Resultado esperado:** JSON com testes OK

### Teste 2: Logout/Login
1. Sair da aplicação
2. Fazer login novamente
3. Testar "Ver itens"

### Teste 3: Download
1. Ir na aba Importações
2. Clicar "Baixar original"
3. Verificar se arquivo abre

### Teste 4: Correção de Quantidades
```javascript
// Após push, testar correção
fetch('/.netlify/functions/fix-batch-26-specific')
.then(r => r.json())
.then(data => {
  console.log('Correção:', data);
  if (data.success) {
    alert('Quantidades corrigidas!');
    location.reload();
  }
});
```

## Resultados Esperados

### Após Diagnóstico:
- ✅ Identificação da causa do erro 500
- ✅ Status da conectividade com banco
- ✅ Valores atuais dos IDs problemáticos

### Após Correção:
- ID 116: `891 KG`
- ID 117: `1.556 KG`
- ID 125: `41 KG` (ou valor correto)
- Download funcionando
- "Ver itens" funcionando
- Sem erro 500

## Troubleshooting

### Se test-connection retornar erro:
- Problema de banco de dados
- Verificar DATABASE_URL
- Verificar status do Neon

### Se test-connection OK mas outros endpoints falharem:
- Problema de autenticação
- Fazer logout/login
- Verificar token no localStorage

### Se push falhar:
- Usar GitHub Desktop
- Ou VSCode Source Control
- Verificar credenciais

## Próximos Passos

1. 🔍 **Executar test-connection** (diagnóstico)
2. 📊 **Analisar resultado** (identificar causa)
3. 🔧 **Aplicar correção** (conforme resultado)
4. ✅ **Testar funcionalidades** (verificar se tudo funciona)

**Execute o diagnóstico primeiro para identificar a causa exata do erro 500!** 🚀
