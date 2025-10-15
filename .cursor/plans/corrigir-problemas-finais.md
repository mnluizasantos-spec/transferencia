# Corrigir Problemas Finais do Sistema

## Problemas Identificados

1. **Botão "Iniciar Separação" não funciona** - Possível erro no updateStatus ou updateRequest
2. **Horário do PDF com 3 horas a mais** - Timezone incorreto (UTC vs Brasil)
3. **Histórico não funciona** - Erro na função getRequestHistory ou no backend

## Investigação Necessária

### 1. Botão "Iniciar Separação"
**Possíveis causas:**
- Função `updateRequest` no backend não aceita o campo `status`
- Validação de dados muito restritiva
- Erro de permissão no backend
- Campo `status` não está sendo atualizado corretamente

**Verificar:**
- Logs do Netlify Functions para ver erro específico
- Se `updateRequest` no backend aceita apenas `status` sem outros campos obrigatórios
- Se validação está rejeitando a atualização

### 2. Horário do PDF (+3 horas)
**Problema:** JavaScript `new Date()` retorna UTC, mas Brasil é UTC-3

**Arquivo:** `netlify/functions/print.js` linhas 21-22

**Solução:**
```javascript
// ANTES:
const hoje = new Date().toLocaleDateString('pt-BR');
const agora = new Date().toLocaleTimeString('pt-BR');

// DEPOIS:
const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const agora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
```

### 3. Histórico não funciona
**Possíveis causas:**
- Endpoint `/history/:id` não existe ou está quebrado
- Tabela `request_history` vazia (nenhum histórico sendo salvo)
- Erro de permissão no backend
- Frontend não está chamando corretamente

**Verificar:**
- Se a tabela `request_history` tem dados
- Se as ações (criar, atualizar, etc.) estão salvando histórico
- Se o endpoint está retornando erro 404 ou 500

## Soluções

### 1. Corrigir Timezone do PDF

**Arquivo:** `netlify/functions/print.js`

```javascript
function generatePrintHTML(requests, user, options = {}) {
  const { title = 'Lista de Separação', showCheckboxes = true } = options;
  
  // Usar timezone do Brasil
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const agora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  
  // ... resto do código
}
```

### 2. Verificar e Corrigir updateRequest

**Arquivo:** `netlify/functions/requests.js` - função `handleUpdate`

**Verificar se:**
- Aceita atualização apenas de `status`
- Validação não está muito restritiva
- Campos obrigatórios não estão sendo exigidos em updates

**Possível correção:**
```javascript
// Validar dados - permitir update parcial
const validatedData = validateRequestData(data, true); // true = isUpdate
```

### 3. Verificar Histórico

**Opção A - Histórico está vazio:**
Se a tabela `request_history` não tem dados, precisamos garantir que as ações salvem histórico.

**Opção B - Endpoint quebrado:**
Verificar se `netlify/functions/history.js` está funcionando corretamente.

**Opção C - Criar histórico simples:**
Se histórico não for crítico, podemos simplificar mostrando apenas data de criação e última atualização.

## Ordem de Implementação

1. **PRIMEIRO:** Corrigir timezone do PDF (simples e rápido)
2. **SEGUNDO:** Investigar erro do "Iniciar Separação" via logs
3. **TERCEIRO:** Corrigir updateRequest se necessário
4. **QUARTO:** Investigar e corrigir histórico
5. **QUINTO:** Testar fluxo completo

## Testes Necessários

1. Separador clica "Iniciar Separação" → Status deve mudar
2. PDF gerado deve mostrar horário correto do Brasil
3. Clicar em "📋 Histórico" → Deve abrir modal com dados
4. Verificar se todas as ações salvam histórico

## Perguntas para o Usuário

1. Qual erro específico aparece ao clicar "Iniciar Separação"?
   - Nenhuma mensagem?
   - Erro no console?
   - Mensagem de erro?

2. O histórico mostra "Nenhum histórico disponível" ou dá erro?

3. O botão "Iniciar Separação" aparece para o separador?
