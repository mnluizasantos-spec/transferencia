/**
 * Gera hashes bcrypt (10 rounds) para todos os usuários e escreve:
 * - db/seed_users.sql (completo com os 5 usuários)
 * - db/update_passwords_neon.sql (INSERT/UPDATE dos 5 no Neon)
 * - db/SENHAS_INICIAIS.md (tabela de senhas)
 *
 * Senhas: admin=admin123, separador=sep@rador@ntilhas, solicitante=solicit@m@t,
 *         flexiveis=Flexiveis#2025, salto=Salto#2025
 *
 * Uso: node scripts/generate-seed-passwords.js
 */

const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const ROUNDS = 10;

const USERS = [
  { email: 'admin@antilhas.com', nome: 'Administrador', name: 'Administrador', role: 'admin', password: 'admin123' },
  { email: 'separador@antilhas.com', nome: 'Separador de Material', name: 'Separador de Material', role: 'separador', password: 'sep@rador@ntilhas' },
  { email: 'solicitante@antilhas.com', nome: 'Gráfica', name: 'Gráfica', role: 'solicitante', password: 'solicit@m@t' },
  { email: 'flexiveis@antilhas.com', nome: 'Flexíveis', name: 'Flexíveis', role: 'solicitante', password: 'Flexiveis#2025' },
  { email: 'salto@antilhas.com', nome: 'Salto', name: 'Salto', role: 'solicitante', password: 'Salto#2025' }
];

async function main() {
  const root = path.resolve(__dirname, '..');
  const dbDir = path.join(root, 'db');

  console.log('Gerando hashes bcrypt (rounds=%d) para os 5 usuários...', ROUNDS);
  for (const u of USERS) {
    u.password_hash = await bcrypt.hash(u.password, ROUNDS);
  }

  // --- seed_users.sql (completo)
  const seedLines = [
    '-- ============================================================================',
    '-- Seed de Usuários Iniciais',
    '-- ============================================================================',
    '-- Senhas: admin=admin123, separador=sep@rador@ntilhas, solicitante=solicit@m@t,',
    '--         flexiveis=Flexiveis#2025, salto=Salto#2025. Hashes bcrypt rounds=10.',
    ''
  ];
  for (const u of USERS) {
    seedLines.push(`-- ${u.email} (senha: ${u.password})`);
    seedLines.push(`INSERT INTO users (email, password_hash, nome, name, role, force_password_change)`);
    seedLines.push(`VALUES (`);
    seedLines.push(`  '${u.email}',`);
    seedLines.push(`  '${u.password_hash}',`);
    seedLines.push(`  '${u.nome}',`);
    seedLines.push(`  '${u.name}',`);
    seedLines.push(`  '${u.role}',`);
    seedLines.push(`  false`);
    seedLines.push(`)`);
    seedLines.push(`ON CONFLICT (email) DO UPDATE SET`);
    seedLines.push(`  password_hash = EXCLUDED.password_hash,`);
    seedLines.push(`  nome = EXCLUDED.nome,`);
    seedLines.push(`  name = EXCLUDED.name;`);
    seedLines.push('');
  }
  seedLines.push('-- Log da operação');
  seedLines.push(`INSERT INTO audit_logs (user_id, acao, tabela_afetada, detalhes_json)`);
  seedLines.push(`VALUES (NULL, 'seed_users', 'users', '{"message": "Usuários iniciais criados", "count": 5}'::jsonb);`);
  seedLines.push('');

  fs.writeFileSync(path.join(dbDir, 'seed_users.sql'), seedLines.join('\n'), 'utf8');
  console.log('Escrito: db/seed_users.sql');

  // --- update_passwords_neon.sql (todos os 5 para rodar no Neon)
  const neonLines = [
    '-- ============================================================================',
    '-- Atualizar senhas de todos os usuários no Neon (bcrypt rounds=10)',
    '-- Execute no Neon SQL Editor para alinhar: admin, separador, solicitante, Flexíveis, Salto.',
    '-- ============================================================================',
    ''
  ];
  for (const u of USERS) {
    neonLines.push(`-- ${u.email}`);
    neonLines.push(`INSERT INTO users (email, password_hash, nome, name, role, force_password_change)`);
    neonLines.push(`VALUES (`);
    neonLines.push(`  '${u.email}',`);
    neonLines.push(`  '${u.password_hash}',`);
    neonLines.push(`  '${u.nome}',`);
    neonLines.push(`  '${u.name}',`);
    neonLines.push(`  '${u.role}',`);
    neonLines.push(`  false`);
    neonLines.push(`)`);
    neonLines.push(`ON CONFLICT (email) DO UPDATE SET`);
    neonLines.push(`  password_hash = EXCLUDED.password_hash,`);
    neonLines.push(`  nome = EXCLUDED.nome,`);
    neonLines.push(`  name = EXCLUDED.name;`);
    neonLines.push('');
  }
  fs.writeFileSync(path.join(dbDir, 'update_passwords_neon.sql'), neonLines.join('\n'), 'utf8');
  console.log('Escrito: db/update_passwords_neon.sql');

  // --- SENHAS_INICIAIS.md
  const senhasMd = [
    '# Senhas iniciais dos usuários',
    '',
    '**Não versionar em repositório público.**',
    '',
    '| Usuário   | Email                  | Senha              |',
    '|-----------|------------------------|--------------------|',
    ...USERS.map(u => `| ${u.nome} | ${u.email} | \`${u.password}\` |`),
    '',
    '## Neon',
    'Execute no Neon SQL Editor o conteúdo de `db/update_passwords_neon.sql` para atualizar as senhas de todos os usuários.',
    ''
  ];
  fs.writeFileSync(path.join(dbDir, 'SENHAS_INICIAIS.md'), senhasMd.join('\n'), 'utf8');
  console.log('Escrito: db/SENHAS_INICIAIS.md');

  console.log('\nSenhas (guardar em local seguro):');
  USERS.forEach(u => console.log(`  ${u.email} => ${u.password}`));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
