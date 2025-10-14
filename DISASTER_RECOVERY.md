# Plano de Recuperação de Desastres

## Objetivo

Documentar procedimentos para recuperação do sistema em caso de falhas catastróficas.

## Cenários e Procedimentos

### Cenário 1: Perda de Dados (< 24 horas)

**Gravidade**: Média  
**RTO**: 30 minutos  
**RPO**: < 1 hora

#### Sintomas
- Dados deletados acidentalmente
- Corrupção de registros específicos
- Importação incorreta

#### Procedimento

1. **Identificar Momento do Problema**
   ```sql
   -- Verificar logs de auditoria
   SELECT * FROM audit_logs 
   WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
   ORDER BY timestamp DESC;
   ```

2. **Usar Point-in-Time Recovery do Neon**
   - Acesse Neon Console
   - Vá em "Backups" > "Point-in-Time Recovery"
   - Selecione timestamp antes do problema
   - Crie branch com dados restaurados
   - Extraia dados necessários
   - Importe de volta ao banco principal

3. **Validar Dados**
   ```bash
   node scripts/data_integrity_check.js
   ```

4. **Documentar Incidente**
   - Registrar em INCIDENTS.md
   - Causa raiz
   - Dados afetados
   - Procedimento usado

---

### Cenário 2: Corrupção do Banco de Dados

**Gravidade**: Alta  
**RTO**: 1 hora  
**RPO**: 24 horas

#### Sintomas
- Erros consistentes ao acessar tabelas
- Referências quebradas
- Constraints violados

#### Procedimento

1. **Avaliar Extensão do Dano**
   ```bash
   node scripts/data_integrity_check.js
   ```

2. **Restaurar de Backup**
   ```bash
   # Localizar backup mais recente
   ls -lht backups/

   # Criar novo branch no Neon para testes
   # Via Neon Console: Branches > Create Branch

   # Importar backup para branch de teste
   node scripts/restore_backup.js --file=backups/backup_XXXX.json --target=test-branch

   # Validar integridade
   DATABASE_URL="connection-string-test-branch" node scripts/data_integrity_check.js
   ```

3. **Se Validação OK, Aplicar em Produção**
   - Anunciar maintenance window (15 min)
   - Trocar production para usar branch restaurado
   - Validar aplicação funcionando
   - Notificar usuários

---

### Cenário 3: Perda Total do Banco Neon

**Gravidade**: Crítica  
**RTO**: 2 horas  
**RPO**: 24 horas

#### Sintomas
- Banco de dados inacessível
- Projeto Neon deletado/corrompido
- Região inteira down

#### Procedimento

1. **Criar Novo Projeto Neon**
   ```bash
   # Via Neon Console
   # Criar projeto: antilhas-solicitacoes-recovery
   ```

2. **Restaurar Schema**
   ```bash
   export NEW_DATABASE_URL="postgres://...novo-projeto..."
   psql $NEW_DATABASE_URL -f db/schema.sql
   ```

3. **Restaurar Dados do Backup Mais Recente**
   ```bash
   # Usar backup JSON
   node scripts/restore_backup.js --file=backups/backup_XXXX.json

   # OU importar SQL dump se disponível
   psql $NEW_DATABASE_URL < backups/dump_XXXX.sql
   ```

4. **Aplicar Logs Incrementais (se disponíveis)**
   ```bash
   # Se houver backups incrementais após o full
   for file in backups/backup_incremental_*.json; do
       node scripts/restore_backup.js --file=$file
   done
   ```

5. **Validar Integridade**
   ```bash
   DATABASE_URL=$NEW_DATABASE_URL node scripts/data_integrity_check.js
   ```

6. **Atualizar Variáveis de Ambiente no Netlify**
   ```bash
   netlify env:set DATABASE_URL "$NEW_DATABASE_URL"
   ```

7. **Redeploy e Teste**
   ```bash
   netlify deploy --prod
   ```

8. **Validação End-to-End**
   - Login funcionando
   - CRUD de solicitações
   - Histórico preservado
   - Estatísticas corretas

---

### Cenário 4: Netlify Site Deletado

**Gravidade**: Alta  
**RTO**: 1 hora  
**RPO**: 0 (código no GitHub)

#### Procedimento

1. **Criar Novo Site**
   ```bash
   netlify sites:create --name antilhas-solicitacoes
   ```

2. **Configurar Variáveis**
   ```bash
   netlify env:set DATABASE_URL "..."
   netlify env:set JWT_SECRET "..."
   netlify env:set JWT_EXPIRES_IN "24h"
   ```

3. **Deploy**
   ```bash
   git push origin main
   # OU
   netlify deploy --prod
   ```

4. **Reconfigurar Domínio**
   - Via Netlify Console
   - Domain Management
   - Adicionar domínio customizado
   - Atualizar DNS

---

### Cenário 5: Código Corrompido/Deletado

**Gravidade**: Baixa  
**RTO**: 15 minutos  
**RPO**: Último commit

#### Procedimento

1. **Restaurar do GitHub**
   ```bash
   # Clonar repositório limpo
   git clone https://github.com/seu-user/seu-repo.git antilhas-recovery
   cd antilhas-recovery

   # Checkout do último commit bom
   git log --oneline
   git checkout <commit-hash>
   ```

2. **Redeploy**
   ```bash
   netlify deploy --prod
   ```

---

## Testes de Recuperação

### Frequência
- **Mensal**: Cenário 1 (dados deletados)
- **Trimestral**: Cenário 2 (corrupção)
- **Semestral**: Cenário 3 (perda total)

### Checklist de Teste

```bash
# 1. Criar ambiente de teste
netlify sites:create --name test-disaster-recovery

# 2. Simular problema
psql $TEST_DATABASE_URL -c "DELETE FROM material_requests WHERE created_at >= CURRENT_DATE"

# 3. Executar procedimento de recuperação
# (seguir passos do cenário relevante)

# 4. Validar
# - Dados restaurados?
# - Aplicação funciona?
# - Tempo dentro do RTO?

# 5. Documentar resultados
# - O que funcionou
# - O que falhou
# - Melhorias necessárias

# 6. Limpar ambiente de teste
netlify sites:delete --site-id=<test-site-id>
```

---

## Contatos de Emergência

### Ordem de Escalação

1. **Admin Primário**
   - Nome: [Preencher]
   - Email: admin@antilhas.com
   - Telefone: [Preencher]

2. **Admin Secundário**
   - Nome: [Preencher]
   - Email: [Preencher]
   - Telefone: [Preencher]

3. **Suporte Neon**
   - Email: support@neon.tech
   - Discord: https://discord.gg/neon

4. **Suporte Netlify**
   - Email: support@netlify.com
   - Twitter: @Netlify

---

## Ferramentas e Acessos

### Necessários para Recuperação

- [ ] Acesso Neon Console
- [ ] Acesso Netlify Dashboard
- [ ] Acesso GitHub (admin do repo)
- [ ] Variáveis de ambiente documentadas
- [ ] Último backup (< 7 dias)
- [ ] Netlify CLI configurado
- [ ] psql instalado

### Localização de Backups

- **Primário**: `/backups/` (no repositório GitHub privado)
- **Secundário**: [AWS S3 / Google Drive / outro]
- **Automáticos**: Neon PITR (30 dias)

---

## Métricas

### RTO (Recovery Time Objective)

| Cenário | RTO Alvo | RTO Atual* |
|---------|----------|------------|
| Dados deletados | 30 min | - |
| Corrupção | 1 hora | - |
| Perda total | 2 horas | - |
| Site deletado | 1 hora | - |
| Código corrompido | 15 min | - |

*Atualizar após cada teste

### RPO (Recovery Point Objective)

| Sistema | RPO Alvo | RPO Atual |
|---------|----------|-----------|
| Banco de dados | < 24h | ~1h (PITR) |
| Código | 0 (GitHub) | 0 |
| Configurações | 0 (IaC) | 0 |

---

## Pós-Incidente

### Checklist

- [ ] Sistema restaurado e validado
- [ ] Usuários notificados
- [ ] Incidente documentado em INCIDENTS.md
- [ ] Análise de causa raiz realizada
- [ ] Medidas preventivas implementadas
- [ ] Documentação atualizada
- [ ] Teste de recuperação agendado

### Template de Relatório

Copiar para INCIDENTS.md:

```markdown
## Incidente: [Título]

**Data**: YYYY-MM-DD HH:MM
**Gravidade**: [Baixa/Média/Alta/Crítica]
**Duração**: X horas

### Descrição
[O que aconteceu]

### Impacto
- Usuários afetados: X
- Dados perdidos: [Sim/Não]
- Downtime: X minutos

### Causa Raiz
[Análise técnica]

### Resolução
[Passos executados]

### Prevenção Futura
- [ ] [Ação 1]
- [ ] [Ação 2]

### Lições Aprendidas
[Insights]
```

---

## Revisão

Este documento deve ser revisado:
- Após cada incidente real
- Após cada teste de recuperação
- Semestralmente (mesmo sem incidentes)

**Última Revisão**: [Data]  
**Próxima Revisão**: [Data + 6 meses]

