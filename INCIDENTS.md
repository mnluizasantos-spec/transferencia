# Registro de Incidentes

Este arquivo documenta todos os incidentes significativos do sistema, suas causas e resoluções.

## Como Usar

Após resolver um incidente, copie o template abaixo e preencha com os detalhes.

---

## Template

```markdown
## Incidente: [Título Descritivo]

**Data**: YYYY-MM-DD HH:MM  
**Reportado por**: [Nome]  
**Gravidade**: [Baixa/Média/Alta/Crítica]  
**Status**: [Em Andamento/Resolvido]  
**Duração Total**: X horas Y minutos

### Descrição do Problema
[Descrição detalhada do que aconteceu]

### Impacto
- **Usuários Afetados**: X usuários / Y%
- **Funcionalidades Afetadas**: [Lista]
- **Dados Perdidos**: [Sim/Não] - [Detalhes se sim]
- **Tempo de Downtime**: X minutos
- **Impacto Financeiro**: [Se aplicável]

### Timeline

| Horário | Evento |
|---------|--------|
| HH:MM | Problema detectado |
| HH:MM | Equipe notificada |
| HH:MM | Investigação iniciada |
| HH:MM | Causa identificada |
| HH:MM | Correção aplicada |
| HH:MM | Sistema restaurado |
| HH:MM | Validação completa |

### Causa Raiz
[Análise técnica detalhada da causa do problema]

**Categoria**: [Bug/Configuração/Infraestrutura/Humano/Outro]

### Resolução Aplicada
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

**Procedimento Usado**: [Link para DISASTER_RECOVERY.md se aplicável]

### Dados Técnicos
```
[Logs relevantes, stack traces, queries, etc]
```

### Medidas Preventivas Implementadas
- [ ] [Medida 1]
- [ ] [Medida 2]
- [ ] [Medida 3]

### Lições Aprendidas
1. [Lição 1]
2. [Lição 2]
3. [Lição 3]

### Ações de Follow-up
- [ ] [Ação 1] - Responsável: [Nome] - Prazo: [Data]
- [ ] [Ação 2] - Responsável: [Nome] - Prazo: [Data]

### Documentação Atualizada
- [ ] README.md
- [ ] DEPLOY.md
- [ ] DISASTER_RECOVERY.md
- [ ] Código comentado

---
```

---

## Histórico de Incidentes

<!-- Adicionar incidentes abaixo, mais recentes primeiro -->

### Exemplo: Incidente Inicial

**Data**: 2025-10-13 10:00  
**Reportado por**: Sistema  
**Gravidade**: Informativo  
**Status**: N/A

**Descrição**: Este é o registro inicial do sistema de incidentes. Nenhum incidente real ocorreu ainda.

---

<!-- Adicionar novos incidentes acima desta linha -->

## Estatísticas

### Por Gravidade

| Gravidade | Total | % |
|-----------|-------|---|
| Crítica | 0 | 0% |
| Alta | 0 | 0% |
| Média | 0 | 0% |
| Baixa | 0 | 0% |

### Por Categoria

| Categoria | Total | % |
|-----------|-------|---|
| Bug | 0 | 0% |
| Configuração | 0 | 0% |
| Infraestrutura | 0 | 0% |
| Humano | 0 | 0% |
| Outro | 0 | 0% |

### Tempo Médio de Resolução

| Gravidade | MTTR* |
|-----------|-------|
| Crítica | - |
| Alta | - |
| Média | - |
| Baixa | - |

*MTTR = Mean Time To Recovery

### Disponibilidade (Uptime)

| Período | Uptime | Downtime | Disponibilidade |
|---------|--------|----------|-----------------|
| Último Mês | - | - | -% |
| Último Trimestre | - | - | -% |
| Último Ano | - | - | -% |

## Análise de Tendências

[Atualizar trimestralmente]

### Incidentes Recorrentes
[Lista de problemas que acontecem repetidamente]

### Áreas de Maior Risco
[Componentes que causam mais problemas]

### Melhorias Implementadas
[Lista de melhorias baseadas em incidentes passados]

## Revisões

| Data | Responsável | Notas |
|------|-------------|-------|
| 2025-10-13 | Sistema | Documento criado |

---

## Contatos para Reporte de Incidentes

### Durante Horário Comercial
- **Email**: suporte@antilhas.com
- **Telefone**: [Preencher]

### Fora do Horário / Emergências
- **On-Call**: [Preencher]
- **WhatsApp**: [Preencher]

### Severidades e SLA

| Severidade | Descrição | Tempo de Resposta | Tempo de Resolução |
|------------|-----------|-------------------|-------------------|
| **Crítica** | Sistema completamente indisponível | 15 minutos | 2 horas |
| **Alta** | Funcionalidade principal comprometida | 30 minutos | 4 horas |
| **Média** | Funcionalidade secundária com workaround | 2 horas | 1 dia útil |
| **Baixa** | Problema cosmético ou menor | 1 dia útil | 1 semana |

---

**Nota**: Manter este documento atualizado é responsabilidade de toda a equipe. Todos os incidentes, por menores que sejam, devem ser documentados para análise de tendências e melhorias contínuas.

