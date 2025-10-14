/**
 * Data Integrity Check
 * Verifica integridade dos dados do banco
 * 
 * Uso: node scripts/data_integrity_check.js
 */

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function checkIntegrity() {
  console.log('🔍 Verificando integridade dos dados...\n');

  let totalIssues = 0;

  try {
    // 1. Verificar solicitações órfãs (sem solicitante válido)
    console.log('1️⃣  Verificando solicitações órfãs...');
    const [orphanRequests] = await sql`
      SELECT COUNT(*) as count 
      FROM material_requests mr
      LEFT JOIN users u ON mr.solicitante_id = u.id
      WHERE mr.deleted_at IS NULL 
      AND (u.id IS NULL OR u.deleted_at IS NOT NULL)
    `;

    if (parseInt(orphanRequests.count) > 0) {
      console.log(`   ⚠️  ${orphanRequests.count} solicitações sem solicitante válido`);
      totalIssues += parseInt(orphanRequests.count);
    } else {
      console.log(`   ✅ Nenhuma solicitação órfã encontrada`);
    }

    // 2. Verificar histórico sem solicitação
    console.log('\n2️⃣  Verificando histórico órfão...');
    const [orphanHistory] = await sql`
      SELECT COUNT(*) as count 
      FROM request_history rh
      LEFT JOIN material_requests mr ON rh.request_id = mr.id
      WHERE mr.id IS NULL
    `;

    if (parseInt(orphanHistory.count) > 0) {
      console.log(`   ⚠️  ${orphanHistory.count} registros de histórico sem solicitação`);
      totalIssues += parseInt(orphanHistory.count);
    } else {
      console.log(`   ✅ Todo histórico está vinculado a solicitações`);
    }

    // 3. Verificar quantidades inválidas
    console.log('\n3️⃣  Verificando quantidades inválidas...');
    const [invalidQuantities] = await sql`
      SELECT COUNT(*) as count 
      FROM material_requests
      WHERE deleted_at IS NULL 
      AND (quantidade IS NULL OR quantidade <= 0)
    `;

    if (parseInt(invalidQuantities.count) > 0) {
      console.log(`   ⚠️  ${invalidQuantities.count} solicitações com quantidade inválida`);
      totalIssues += parseInt(invalidQuantities.count);
    } else {
      console.log(`   ✅ Todas as quantidades são válidas`);
    }

    // 4. Verificar status inválidos
    console.log('\n4️⃣  Verificando status inválidos...');
    const [invalidStatus] = await sql`
      SELECT COUNT(*) as count 
      FROM material_requests
      WHERE deleted_at IS NULL 
      AND status NOT IN ('Pendente', 'Em Separação', 'Concluído', 'Cancelado')
    `;

    if (parseInt(invalidStatus.count) > 0) {
      console.log(`   ⚠️  ${invalidStatus.count} solicitações com status inválido`);
      totalIssues += parseInt(invalidStatus.count);
    } else {
      console.log(`   ✅ Todos os status são válidos`);
    }

    // 5. Verificar completed_at sem status Concluído
    console.log('\n5️⃣  Verificando inconsistências de conclusão...');
    const [inconsistentCompletion] = await sql`
      SELECT COUNT(*) as count 
      FROM material_requests
      WHERE deleted_at IS NULL 
      AND ((status = 'Concluído' AND completed_at IS NULL) 
           OR (status != 'Concluído' AND completed_at IS NOT NULL))
    `;

    if (parseInt(inconsistentCompletion.count) > 0) {
      console.log(`   ⚠️  ${inconsistentCompletion.count} solicitações com dados de conclusão inconsistentes`);
      totalIssues += parseInt(inconsistentCompletion.count);
    } else {
      console.log(`   ✅ Dados de conclusão estão consistentes`);
    }

    // 6. Verificar sessões expiradas não revogadas
    console.log('\n6️⃣  Verificando sessões expiradas...');
    const [expiredSessions] = await sql`
      SELECT COUNT(*) as count 
      FROM sessions
      WHERE expires_at < CURRENT_TIMESTAMP 
      AND revoked_at IS NULL
    `;

    if (parseInt(expiredSessions.count) > 0) {
      console.log(`   ⚠️  ${expiredSessions.count} sessões expiradas não revogadas`);
      console.log(`      Limpando automaticamente...`);
      
      await sql`
        UPDATE sessions 
        SET revoked_at = CURRENT_TIMESTAMP 
        WHERE expires_at < CURRENT_TIMESTAMP 
        AND revoked_at IS NULL
      `;
      
      console.log(`      ✅ Sessões limpas`);
    } else {
      console.log(`   ✅ Nenhuma sessão expirada pendente`);
    }

    // 7. Estatísticas gerais
    console.log('\n📊 Estatísticas Gerais:');
    
    const [stats] = await sql`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE deleted_at IS NULL) as total_users,
        (SELECT COUNT(*) FROM material_requests WHERE deleted_at IS NULL) as total_requests,
        (SELECT COUNT(*) FROM request_history) as total_history,
        (SELECT COUNT(*) FROM audit_logs) as total_audit_logs,
        (SELECT COUNT(*) FROM sessions WHERE revoked_at IS NULL) as active_sessions
    `;

    console.log(`   👥 Usuários ativos: ${stats.total_users}`);
    console.log(`   📦 Solicitações ativas: ${stats.total_requests}`);
    console.log(`   📋 Registros de histórico: ${stats.total_history}`);
    console.log(`   🔍 Logs de auditoria: ${stats.total_audit_logs}`);
    console.log(`   🔐 Sessões ativas: ${stats.active_sessions}`);

    // 8. Tamanho estimado do banco
    console.log('\n💾 Tamanho das Tabelas:');
    
    const tableSizes = await sql`
      SELECT 
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;

    tableSizes.forEach(table => {
      console.log(`   📊 ${table.tablename}: ${table.size}`);
    });

    // Resumo final
    console.log('\n' + '='.repeat(50));
    if (totalIssues === 0) {
      console.log('✅ VERIFICAÇÃO CONCLUÍDA - Nenhum problema encontrado!');
    } else {
      console.log(`⚠️  VERIFICAÇÃO CONCLUÍDA - ${totalIssues} problema(s) encontrado(s)`);
      console.log('   Revise os itens marcados acima.');
    }
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('❌ Erro durante verificação:', error);
    process.exit(1);
  }
}

// Executar
checkIntegrity().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

