/**
 * Soft delete de solicitações com mais de 45 dias (created_at).
 * Uso: node scripts/run-soft-delete.js
 * Requer: DATABASE_URL no ambiente (ou .env).
 */

try {
  require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
} catch (_) {}

const { neon } = require('@neondatabase/serverless');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não configurada. Defina no ambiente ou em .env');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function runSoftDelete() {
  console.log('🔄 Soft delete: solicitações com created_at > 45 dias...\n');

  try {
    const before = await sql`
      SELECT COUNT(*) as count
      FROM material_requests
      WHERE deleted_at IS NULL AND created_at::date < current_date - 45
    `;
    const toPurge = parseInt(before[0]?.count ?? 0, 10);
    console.log(`   Encontradas ${toPurge} solicitações a marcar como deletadas.`);

    if (toPurge === 0) {
      console.log('   Nada a fazer.');
      return;
    }

    const result = await sql`
      UPDATE material_requests
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE deleted_at IS NULL AND created_at::date < current_date - 45
      RETURNING id
    `;
    const affected = Array.isArray(result) ? result.length : 0;
    console.log(`   ✅ ${affected} solicitações atualizadas (deleted_at preenchido).\n`);
  } catch (err) {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }
}

runSoftDelete();
