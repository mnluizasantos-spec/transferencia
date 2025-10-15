# Corrigir PDF e Campo Prazo

## Problemas Identificados

### 1. PDF mostra "undefined" no material
**Causa:** `print.js` linha 40 usa `req.material` mas o backend retorna `material_description`

**Arquivo:** `netlify/functions/print.js`
```javascript
// LINHA 40 - PROBLEMA:
<strong>${req.material}</strong>

// DEVERIA SER:
<strong>${req.material_description || req.material_code}</strong>
```

### 2. Campo prazo não está sendo salvo/exibido
**Causa:** Backend não retorna campo `deadline` no SELECT

**Arquivo:** `netlify/functions/requests.js` linha 35-52
```javascript
// FALTA ADICIONAR:
SELECT 
  id,
  material_code,
  material_description,
  quantidade,
  unidade,
  requester_name,
  urgencia,
  status,
  deadline,  // ✅ ADICIONAR
  justificativa,  // ✅ ADICIONAR (para PDF)
  created_at,
  updated_at,
  created_by
FROM material_requests
```

### 3. Timezone do PDF (+3 horas)
**Causa:** JavaScript usa UTC, Brasil é UTC-3

**Arquivo:** `netlify/functions/print.js` linha 21-22
```javascript
// PROBLEMA:
const hoje = new Date().toLocaleDateString('pt-BR');
const agora = new Date().toLocaleTimeString('pt-BR');

// SOLUÇÃO:
const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const agora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
```

### 4. PDF usa `req.prazo` mas backend retorna `deadline`
**Arquivo:** `netlify/functions/print.js` linha 45
```javascript
// PROBLEMA:
<td class="center">${req.prazo ? new Date(req.prazo).toLocaleDateString('pt-BR') : '-'}</td>

// SOLUÇÃO:
<td class="center">${req.deadline ? new Date(req.deadline).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}</td>
```

## Soluções Completas

### 1. Corrigir print.js

**Linha 40 - Material:**
```javascript
<strong>${req.material_description || req.material_code}</strong>
```

**Linha 21-22 - Timezone:**
```javascript
const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const agora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
```

**Linha 45 - Prazo:**
```javascript
<td class="center">${req.deadline ? new Date(req.deadline).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : '-'}</td>
```

### 2. Corrigir requests.js - Adicionar campos no SELECT

**Linha 35-52:**
```javascript
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
    deadline,
    justificativa,
    created_at,
    updated_at,
    created_by
  FROM material_requests
  WHERE deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 100
`;
```

## Ordem de Implementação

1. **PRIMEIRO:** Corrigir requests.js - adicionar `deadline` e `justificativa` no SELECT
2. **SEGUNDO:** Corrigir print.js - usar `material_description` em vez de `material`
3. **TERCEIRO:** Corrigir print.js - usar `deadline` em vez de `prazo`
4. **QUARTO:** Corrigir print.js - adicionar timezone correto
5. **QUINTO:** Testar fluxo completo

## Testes

1. Criar solicitação com prazo preenchido
2. Verificar se prazo aparece na lista do frontend
3. Clicar "Iniciar Separação"
4. Verificar se PDF mostra:
   - ✅ Material correto (não "undefined")
   - ✅ Prazo correto
   - ✅ Horário correto (Brasil, não UTC)
   - ✅ Justificativa (se preenchida)

## Resumo das Mudanças

**netlify/functions/requests.js:**
- Adicionar `deadline` no SELECT
- Adicionar `justificativa` no SELECT

**netlify/functions/print.js:**
- Linha 21-22: Adicionar timezone 'America/Sao_Paulo'
- Linha 40: Mudar `req.material` para `req.material_description || req.material_code`
- Linha 45: Mudar `req.prazo` para `req.deadline` + adicionar timezone
