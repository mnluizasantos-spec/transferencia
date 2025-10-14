/**
 * Backup Script
 * Exporta dados do banco para JSON
 * 
 * Uso: node scripts/backup.js [--full]
 */

const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada');
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const isFullBackup = process.argv.includes('--full');

async function backup() {
  console.log('🔄 Iniciando backup...');
  console.log(`Tipo: ${isFullBackup ? 'COMPLETO' : 'INCREMENTAL'}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '..', 'backups');

  // Criar diretório se não existir
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const backupData = {
    timestamp,
    type: isFullBackup ? 'full' : 'incremental',
    version: '1.0.0',
    tables: {}
  };

  try {
    // Tabelas para backup
    const tables = [
      'users',
      'material_requests',
      'request_history',
      'audit_logs',
      'import_batches'
    ];

    for (const table of tables) {
      console.log(`📦 Exportando tabela: ${table}`);

      let query;
      if (isFullBackup) {
        // Backup completo
        query = sql`SELECT * FROM ${sql(table)}`;
      } else {
        // Backup incremental (últimas 24 horas)
        if (table === 'users') {
          query = sql`SELECT * FROM ${sql(table)} WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`;
        } else {
          query = sql`SELECT * FROM ${sql(table)} WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours' OR updated_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'`;
        }
      }

      const data = await query;
      backupData.tables[table] = data;
      console.log(`  ✅ ${data.length} registros exportados`);
    }

    // Salvar arquivo
    const filename = `backup_${isFullBackup ? 'full' : 'incremental'}_${timestamp}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    const fileSizeMB = (fs.statSync(filepath).size / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Backup concluído com sucesso!`);
    console.log(`📁 Arquivo: ${filename}`);
    console.log(`📊 Tamanho: ${fileSizeMB} MB`);
    console.log(`📍 Local: ${filepath}`);

    // Limpar backups antigos (manter últimos 30)
    cleanOldBackups(backupDir);

  } catch (error) {
    console.error('❌ Erro durante backup:', error);
    process.exit(1);
  }
}

function cleanOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Manter apenas os 30 mais recentes
    if (files.length > 30) {
      console.log(`\n🧹 Limpando backups antigos...`);
      const toDelete = files.slice(30);
      
      for (const file of toDelete) {
        fs.unlinkSync(file.path);
        console.log(`  🗑️  ${file.name} removido`);
      }
    }
  } catch (error) {
    console.warn('⚠️  Erro ao limpar backups antigos:', error.message);
  }
}

// Executar
backup().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});

