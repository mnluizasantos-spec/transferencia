/**
 * Executa a migration entregar_em e numero_remessa no banco Neon.
 * Uso: node scripts/run-migration.js
 * Requer: DATABASE_URL no ambiente (ou .env na raiz do projeto).
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

async function runMigration() {
  console.log('🔄 Aplicando migration: entregar_em e numero_remessa...\n');

  try {
    await sql`ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS entregar_em VARCHAR(50)`;
    console.log('   ✅ Coluna entregar_em OK');

    await sql`ALTER TABLE material_requests DROP CONSTRAINT IF EXISTS chk_entregar_em`;
    await sql`ALTER TABLE material_requests ADD CONSTRAINT chk_entregar_em CHECK (entregar_em IS NULL OR entregar_em IN ('Grafica', 'Salto', 'Flexiveis'))`;
    console.log('   ✅ Constraint chk_entregar_em OK');

    await sql`ALTER TABLE material_requests ADD COLUMN IF NOT EXISTS numero_remessa VARCHAR(100)`;
    console.log('   ✅ Coluna numero_remessa OK');

    console.log('\n✅ Migration aplicada com sucesso.');
  } catch (err) {
    console.error('\n❌ Erro na migration:', err.message);
    process.exit(1);
  }
}

runMigration();
