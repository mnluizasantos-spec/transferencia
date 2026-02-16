/**
 * Gera hashes bcrypt (10 rounds) apenas para os usuários NOVOS (Flexíveis e Salto).
 * Escreve:
 * - db/update_passwords_neon.sql (INSERT/UPDATE para Flexíveis e Salto no Neon)
 * - db/SENHAS_INICIAIS.md (apenas os dois novos usuários)
 *
 * As senhas antigas (admin, separador, solicitante) permanecem admin123 e não são alteradas.
 *
 * Uso: node scripts/generate-seed-passwords.js
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const ROUNDS = 10;

// Apenas os dois novos usuários com senhas distintas (8+ chars, letra, número)
const NEW_USERS = [
  { email: 'flexiveis@antilhas.com', nome: 'Flexíveis', name: 'Flexíveis', role: 'solicitante', password: 'Flexiveis#2025' },
  { email: 'salto@antilhas.com', nome: 'Salto', name: 'Salto', role: 'solicitante', password: 'Salto#2025' }
];

async function main() {
  const root = path.resolve(__dirname, '..');
  const dbDir = path.join(root, 'db');

  console.log('Gerando hashes bcrypt (rounds=%d) apenas para Flexíveis e Salto...', ROUNDS);
  for (const u of NEW_USERS) {
    u.password_hash = await bcrypt.hash(u.password, ROUNDS);
  }

  // --- update_passwords_neon.sql (apenas Flexíveis e Salto)
  const neonLines = [
    '-- ============================================================================',
    '-- Atualizar senhas Flexíveis e Salto no Neon (bcrypt rounds=10)',
    '-- Execute este script no Neon para que os logins flexiveis@antilhas.com e salto@antilhas.com funcionem.',
    '-- ============================================================================',
    '',
    '-- Flexíveis',
    `INSERT INTO users (email, password_hash, nome, name, role, force_password_change)`,
    `VALUES (`,
    `  'flexiveis@antilhas.com',`,
    `  '${NEW_USERS[0].password_hash}',`,
    `  'Flexíveis',`,
    `  'Flexíveis',`,
    `  'solicitante',`,
    `  false`,
    `)`,
    `ON CONFLICT (email) DO UPDATE SET`,
    `  password_hash = EXCLUDED.password_hash,`,
    `  nome = EXCLUDED.nome,`,
    `  name = EXCLUDED.name;`,
    '',
    '-- Salto',
    `INSERT INTO users (email, password_hash, nome, name, role, force_password_change)`,
    `VALUES (`,
    `  'salto@antilhas.com',`,
    `  '${NEW_USERS[1].password_hash}',`,
    `  'Salto',`,
    `  'Salto',`,
    `  'solicitante',`,
    `  false`,
    `)`,
    `ON CONFLICT (email) DO UPDATE SET`,
    `  password_hash = EXCLUDED.password_hash,`,
    `  nome = EXCLUDED.nome,`,
    `  name = EXCLUDED.name;`,
    ''
  ];
  fs.writeFileSync(path.join(dbDir, 'update_passwords_neon.sql'), neonLines.join('\n'), 'utf8');
  console.log('Escrito: db/update_passwords_neon.sql');

  // --- SENHAS_INICIAIS.md (apenas Flexíveis e Salto)
  const senhasMd = [
    '# Senhas iniciais – usuários novos (Flexíveis e Salto)',
    '',
    '**Não versionar este arquivo em repositório público.**',
    '',
    '| Usuário   | Email                  | Senha inicial  |',
    '|-----------|------------------------|----------------|',
    ...NEW_USERS.map(u => `| ${u.nome} | ${u.email} | \`${u.password}\` |`),
    '',
    '## Neon',
    'Execute no Neon SQL Editor o conteúdo de `db/update_passwords_neon.sql` para criar/atualizar Flexíveis e Salto com essas senhas.',
    '',
    '*(Admin, Separador e Solicitante continuam com a senha antiga admin123.)*',
    ''
  ];
  fs.writeFileSync(path.join(dbDir, 'SENHAS_INICIAIS.md'), senhasMd.join('\n'), 'utf8');
  console.log('Escrito: db/SENHAS_INICIAIS.md');

  console.log('\nSenhas dos novos usuários (guardar em local seguro):');
  NEW_USERS.forEach(u => console.log(`  ${u.email} => ${u.password}`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
