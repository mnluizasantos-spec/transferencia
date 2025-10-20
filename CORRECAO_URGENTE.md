# 🚨 CORREÇÃO URGENTE - IDs 116 e 117

## Situação
- Token de autenticação inválido
- Push automático falhando
- Precisa corrigir dados imediatamente

## SOLUÇÃO 1: Endpoint Temporário (Recomendado)

### 1. Fazer Push Manual
**Escolha uma opção:**

**A) GitHub Desktop:**
- Abra GitHub Desktop
- Clique em "Push origin"

**B) VSCode:**
- Abra VSCode
- Source Control (Ctrl+Shift+G)
- Clique em "Sync Changes"

**C) Linha de Comando:**
```bash
git push origin main
```

### 2. Aguardar Deploy (2-3 minutos)

### 3. Executar Correção
Após deploy, acesse diretamente no navegador:
```
https://transferencia-mp.netlify.app/.netlify/functions/correct-quantities-temp
```

**OU via JavaScript no console:**
```javascript
fetch('https://transferencia-mp.netlify.app/.netlify/functions/correct-quantities-temp')
.then(r => r.json())
.then(data => {
  console.log('✅ Resultado:', data);
  if (data.success) {
    alert('Correção concluída! Recarregue a página.');
    location.reload();
  }
});
```

---

## SOLUÇÃO 2: SQL Direto no Neon (Alternativa)

Se não conseguir fazer push, execute este SQL diretamente no Neon Console:

### 1. Acesse Neon Console
- Vá para: https://console.neon.tech
- Acesse seu projeto
- Vá em "SQL Editor"

### 2. Execute este SQL:
```sql
-- Corrigir ID 116: 89.022 → 891
UPDATE material_requests 
SET quantidade = 891 
WHERE id = 116;

INSERT INTO request_history 
  (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
VALUES 
  (116, 1, 'quantidade', 89022, 891, 'corrigido', 'Correção manual: 890,22 → 891');

-- Corrigir ID 117: 155.564 → 1.556
UPDATE material_requests 
SET quantidade = 1556 
WHERE id = 117;

INSERT INTO request_history 
  (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
VALUES 
  (117, 1, 'quantidade', 155564, 1556, 'corrigido', 'Correção manual: 1.556 → 1556');

-- Verificar correções
SELECT id, quantidade, material_code 
FROM material_requests 
WHERE id IN (116, 117);
```

### 3. Verificar Resultado
Execute esta query para confirmar:
```sql
SELECT id, quantidade, material_code, material_description
FROM material_requests 
WHERE id IN (116, 117)
ORDER BY id;
```

**Resultado esperado:**
- ID 116: `891 KG`
- ID 117: `1556 KG`

---

## ⚠️ IMPORTANTE

### Após Correção:
1. **Recarregue a página** da aplicação
2. **Verifique** se os valores estão corretos
3. **Remova** o endpoint temporário (se usado)

### Limpeza:
Após usar o endpoint temporário, remova o arquivo:
```bash
rm netlify/functions/correct-quantities-temp.js
git add .
git commit -m "Remove: Endpoint temporário após correção"
git push origin main
```

---

## 🎯 Valores a Corrigir

| ID | Valor Atual | Valor Correto | Material |
|----|-------------|---------------|----------|
| 116 | 89.022 KG | **891 KG** | - |
| 117 | 155.564 KG | **1.556 KG** | PAPEL FSCM 115G... |

**Escolha a solução mais rápida para você!**
