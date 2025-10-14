# Política de Backup e Recuperação

## Estratégia de Backup

### 1. Backup Automático (Neon PostgreSQL)

O Neon oferece backup automático com as seguintes características:

- **Point-in-Time Recovery (PITR)**: Até 30 dias de histórico
- **Frequência**: Contínua (WAL streaming)
- **Retenção**: 30 dias no plano gratuito, customizável em planos pagos
- **Localização**: Multi-região para redundância

### 2. Exports Manuais

Além dos backups automáticos do Neon, realizamos exports periódicos:

#### Frequência
- **Diário**: Backup incremental das alterações do dia
- **Semanal**: Backup completo de todas as tabelas
- **Mensal**: Archive para armazenamento de longo prazo

#### Execução
```bash
# Via GitHub Actions (automatizado)
# Ver: .github/workflows/backup.yml

# Manual (se necessário)
node scripts/backup.js
```

#### Armazenamento
- **Primário**: GitHub repository privado (backup-antilhas-solicitacoes)
- **Secundário**: Cloud Storage (AWS S3 ou Google Cloud Storage)
- **Retenção**: 
  - Diários: 7 dias
  - Semanais: 90 dias
  - Mensais: 2 anos

### 3. Backup antes de Migrations

Sempre realizar backup completo antes de aplicar migrations ao banco de produção:

```bash
# 1. Backup
node scripts/backup.js --full

# 2. Testar migration em staging
psql $STAGING_DATABASE_URL -f db/migrations/XXX_migration.sql

# 3. Aplicar em produção
psql $DATABASE_URL -f db/migrations/XXX_migration.sql
```

## Procedimento de Recuperação

### Cenário 1: Recuperação de Dados Deletados (< 24h)

1. Identificar o momento exato da deleção
2. Usar PITR do Neon para restaurar em branch separado
3. Exportar dados específicos
4. Importar de volta no banco principal

**RTO**: < 30 minutos  
**RPO**: < 1 minuto (graças ao WAL)

### Cenário 2: Corrupção de Dados

1. Identificar extensão da corrupção
2. Restaurar backup do export mais recente
3. Aplicar WAL logs desde o backup
4. Validar integridade com `scripts/data_integrity_check.js`

**RTO**: < 1 hora  
**RPO**: < 24 horas

### Cenário 3: Perda Total do Banco (Desastre)

1. Provisionar nova instância Neon
2. Restaurar schema: `psql $NEW_DATABASE_URL -f db/schema.sql`
3. Restaurar dados do export mais recente
4. Aplicar logs incrementais se disponíveis
5. Validar integridade completa
6. Atualizar DNS/configurações
7. Testar aplicação end-to-end

**RTO**: < 2 horas  
**RPO**: < 24 horas

## Testes de Recuperação

### Frequência
- **Mensal**: Teste de recuperação de dados deletados
- **Trimestral**: Teste de restauração completa em ambiente staging
- **Semestral**: Simulação completa de desastre

### Checklist de Teste
- [ ] Restauração de schema
- [ ] Restauração de dados
- [ ] Validação de integridade referencial
- [ ] Teste de queries principais
- [ ] Verificação de índices
- [ ] Teste de autenticação
- [ ] Validação de auditoria
- [ ] Performance check

## Monitoramento

### Alertas Configurados
- Falha em backup automático
- Espaço em disco > 80%
- Tempo de backup > 30 minutos
- Export com erros

### Métricas Registradas
- Tamanho dos backups
- Tempo de execução
- Taxa de sucesso
- Tamanho do banco de dados

## Responsabilidades

| Atividade | Responsável | Frequência |
|-----------|-------------|------------|
| Backup automático | Neon | Contínuo |
| Export semanal | GitHub Actions | Semanal |
| Validação de backups | Admin do Sistema | Mensal |
| Teste de recuperação | Equipe de TI | Trimestral |
| Atualização de procedimentos | Admin do Sistema | Quando necessário |

## Contatos de Emergência

Em caso de necessidade de recuperação urgente:

1. **Suporte Neon**: support@neon.tech
2. **Admin Principal**: admin@antilhas.com
3. **Equipe de TI**: ti@antilhas.com

## Histórico de Recuperações

Documentar todas as recuperações em `INCIDENTS.md`:
- Data e hora
- Tipo de incidente
- Procedimento utilizado
- Tempo de recuperação
- Dados recuperados/perdidos
- Lições aprendidas

