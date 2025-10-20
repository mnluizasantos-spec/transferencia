# Relatório de Correção Automática de Batches

## Problema Identificado
- **Múltiplos batches** de importação têm valores multiplicados por 100
- Exemplos: `890,22` → `89.022`, `1.556` → `155.564`
- Problema afeta **TODOS** os batches, não apenas N26

## Solução Implementada

### 1. Análise Global (Dry-Run)
**Endpoint:** `GET /.netlify/functions/analyze-all-batches`

**Funcionalidade:**
- Analisa TODOS os batches de importação
- Identifica valores suspeitos automaticamente
- Retorna relatório detalhado SEM fazer alterações
- Agrupa resultados por batch

**Critérios de Detecção:**
```javascript
// Valores suspeitos se:
- quantidade > 50000 (muito grande)
- quantidade > 10000 && quantidade % 1000 < 100 (múltiplo suspeito)
- quantidade >= 10000 && quantidade % 100 === 0 (termina com zeros)
- quantidade > 1000 && quantidade % 100 === 0 (padrão multiplicado por 100)
```

### 2. Correção Automática
**Endpoint:** `POST /.netlify/functions/fix-all-batches?confirm=true`

**Funcionalidade:**
- Aplica correções em TODOS os valores identificados
- Divide por 100 e arredonda: `89022` → `891`
- Registra todas as correções no histórico
- Requer confirmação explícita (`?confirm=true`)

## Como Usar

### Passo 1: Análise (Dry-Run)
```bash
# Via navegador
https://transferencia-mp.netlify.app/.netlify/functions/analyze-all-batches

# Via JavaScript
fetch('https://transferencia-mp.netlify.app/.netlify/functions/analyze-all-batches')
.then(r => r.json())
.then(data => {
  console.log('📊 Análise:', data);
  console.log('Batches com problemas:', data.analysis.globalStats.batchesWithIssues);
  console.log('Total de correções:', data.analysis.globalStats.totalCorrections);
});
```

### Passo 2: Revisar Relatório
Verificar se as correções propostas fazem sentido:
- Valores muito grandes sendo divididos por 100
- Padrões consistentes por batch
- Quantidade total de correções

### Passo 3: Aplicar Correções
```bash
# Via navegador (POST)
https://transferencia-mp.netlify.app/.netlify/functions/fix-all-batches?confirm=true

# Via JavaScript
fetch('https://transferencia-mp.netlify.app/.netlify/functions/fix-all-batches?confirm=true', {
  method: 'POST'
})
.then(r => r.json())
.then(data => {
  console.log('✅ Correção concluída:', data);
  if (data.success) {
    alert('Correção automática concluída! Recarregue a página.');
    location.reload();
  }
});
```

## Exemplo de Output

### Análise (Dry-Run)
```json
{
  "success": true,
  "analysis": {
    "totalBatches": 10,
    "totalRequests": 500,
    "suspiciousRequests": 45,
    "globalStats": {
      "batchesWithIssues": 8,
      "totalCorrections": 45,
      "averageSuspiciousPerBatch": 6
    },
    "byBatch": {
      "25": {
        "suspicious": 12,
        "corrections": [
          { "id": 110, "current": 234500, "suggested": 2345 },
          { "id": 111, "current": 156000, "suggested": 1560 }
        ]
      },
      "26": {
        "suspicious": 15,
        "corrections": [
          { "id": 116, "current": 89022, "suggested": 891 },
          { "id": 117, "current": 155564, "suggested": 1556 }
        ]
      }
    }
  }
}
```

### Correção Aplicada
```json
{
  "success": true,
  "results": {
    "totalBatches": 10,
    "batchesProcessed": 10,
    "batchesWithCorrections": 8,
    "totalCorrections": 45,
    "totalErrors": 0,
    "summary": {
      "batchesProcessed": 10,
      "batchesWithCorrections": 8,
      "totalCorrections": 45,
      "totalErrors": 0
    }
  }
}
```

## Segurança

### Proteções Implementadas
1. **Dry-run obrigatório** - análise antes de correção
2. **Confirmação explícita** - `?confirm=true` obrigatório
3. **Backup automático** - valores originais salvos no histórico
4. **Logs detalhados** - cada correção é registrada
5. **Tratamento de erros** - falhas não interrompem o processo

### Histórico de Correções
Todas as correções são registradas em `request_history`:
```sql
INSERT INTO request_history 
  (request_id, user_id, campo_alterado, valor_anterior, valor_novo, acao, justificativa)
VALUES 
  (116, 1, 'quantidade', 89022, 891, 'corrigido', 'Correção automática: 89022 → 891 (÷100)')
```

## Monitoramento

### Verificar Correções
```sql
-- Ver correções aplicadas hoje
SELECT 
  rh.request_id,
  rh.valor_anterior,
  rh.valor_novo,
  rh.justificativa,
  mr.material_code
FROM request_history rh
JOIN material_requests mr ON rh.request_id = mr.id
WHERE rh.acao = 'corrigido'
AND rh.justificativa LIKE '%Correção automática%'
AND DATE(rh.created_at) = CURRENT_DATE
ORDER BY rh.created_at DESC;
```

### Verificar Valores Atuais
```sql
-- Ver valores corrigidos
SELECT id, quantidade, material_code, material_description
FROM material_requests 
WHERE id IN (116, 117, 110, 111) -- IDs conhecidos
ORDER BY id;
```

## Pós-Correção

### Deploy do Código Corrigido
Após correção dos dados, fazer deploy do código com `parseQuantity` corrigida:
1. Push do código para GitHub
2. Deploy automático no Netlify
3. Importações futuras funcionarão corretamente

### Limpeza
Após correção bem-sucedida, remover endpoints temporários:
```bash
rm netlify/functions/correct-quantities-temp.js
rm netlify/functions/analyze-all-batches.js
rm netlify/functions/fix-all-batches.js
```

## Troubleshooting

### Se Análise Não Encontrar Problemas
- Verificar se critérios de detecção estão corretos
- Ajustar limites em `isSuspicious()`
- Verificar se batches estão sendo encontrados

### Se Correção Falhar
- Verificar logs do Netlify Functions
- Verificar se confirmação foi fornecida
- Verificar conectividade com banco

### Se Valores Ainda Estiverem Incorretos
- Verificar se correção foi aplicada
- Verificar cache do navegador
- Recarregar página com Ctrl+F5
