# Instruções para Push e Deploy

## Situação Atual
- ✅ Código corrigido e commitado localmente
- ❌ Push falhou por problemas de credenciais
- ❌ Dados no banco ainda incorretos

## Soluções

### Opção 1: Push Manual via GitHub Desktop
1. Abra o GitHub Desktop
2. Selecione o repositório `transferencia`
3. Clique em "Push origin" para enviar as alterações

### Opção 2: Push via VSCode
1. Abra o VSCode
2. Vá na aba Source Control (Ctrl+Shift+G)
3. Clique no botão "Sync Changes" ou "Push"

### Opção 3: Push via Linha de Comando (com token)
```bash
# Configurar token de acesso pessoal
git config --global credential.helper store

# Fazer push (vai pedir username e token)
git push origin main
```

### Opção 4: Push via SSH (se configurado)
```bash
# Mudar para SSH
git remote set-url origin git@github.com:mnluizasantos-spec/transferencia.git
git push origin main
```

## Após o Push

### 1. Aguardar Deploy Automático
- O Netlify fará deploy automático em 2-3 minutos
- Verificar no painel do Netlify se o deploy foi bem-sucedido

### 2. Corrigir Dados Existentes
Após o deploy, executar a correção via API:

**Via Interface Web (como admin):**
1. Acesse a aplicação
2. Abra o console do navegador (F12)
3. Execute:
```javascript
fetch('/.netlify/functions/correct-quantities', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(console.log);
```

**Via cURL (se tiver token):**
```bash
curl -X POST https://seu-site.netlify.app/.netlify/functions/correct-quantities \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Verificar Correção
- Recarregar a página
- Verificar se ID 116 mostra `891 KG`
- Verificar se ID 117 mostra `1.556 KG`

## Arquivos Criados
- ✅ `netlify/functions/import.js` - Código corrigido
- ✅ `netlify/functions/fix-batch-n26.js` - Script de correção completo
- ✅ `netlify/functions/correct-quantities.js` - Correção direta e simples

## Valores Esperados Após Correção
- **ID 116:** `891 KG` (era 89.022)
- **ID 117:** `1.556 KG` (era 155.564)

## Próximos Passos
1. Fazer push usando uma das opções acima
2. Aguardar deploy (2-3 minutos)
3. Executar correção via API
4. Verificar resultado na interface
