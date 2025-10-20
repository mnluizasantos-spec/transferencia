/**
 * Test Connection - Diagnóstico Simples
 * 
 * Endpoint para testar conectividade básica sem autenticação
 * Identifica se o problema é de banco, rede ou código
 */

const { getDB } = require('./utils/db');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  console.log('🔍 Iniciando teste de conectividade...');

  try {
    // Teste 1: Conectividade básica
    console.log('1️⃣ Testando conectividade básica...');
    const sql = getDB();
    
    // Teste 2: Query simples
    console.log('2️⃣ Testando query simples...');
    const result = await sql`SELECT 1 as test, now() as server_time`;
    
    // Teste 3: Verificar tabelas
    console.log('3️⃣ Verificando tabelas...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('material_requests', 'import_batches', 'users')
      ORDER BY table_name
    `;
    
    // Teste 4: Verificar ID 125 especificamente
    console.log('4️⃣ Verificando ID 125...');
    const id125 = await sql`
      SELECT id, quantidade, material_code, material_description, created_at
      FROM material_requests 
      WHERE id = 125
    `;
    
    // Teste 5: Verificar batch 26
    console.log('5️⃣ Verificando batch 26...');
    const batch26 = await sql`
      SELECT id, created_at, user_id
      FROM import_batches 
      WHERE id = 26
    `;
    
    // Teste 6: Verificar outros IDs problemáticos
    console.log('6️⃣ Verificando outros IDs...');
    const problemIds = await sql`
      SELECT id, quantidade, material_code
      FROM material_requests 
      WHERE id IN (116, 117, 125)
      ORDER BY id
    `;

    console.log('✅ Todos os testes concluídos com sucesso!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Conectividade OK - Todos os testes passaram',
        timestamp: new Date().toISOString(),
        tests: {
          basicConnection: '✅ OK',
          simpleQuery: '✅ OK',
          serverTime: result[0]?.server_time,
          tablesFound: tables.map(t => t.table_name),
          id125: id125.length > 0 ? {
            found: true,
            quantidade: id125[0].quantidade,
            material: id125[0].material_code,
            description: id125[0].material_description
          } : { found: false },
          batch26: batch26.length > 0 ? {
            found: true,
            createdAt: batch26[0].created_at
          } : { found: false },
          problemIds: problemIds.map(p => ({
            id: p.id,
            quantidade: p.quantidade,
            material: p.material_code
          }))
        },
        recommendations: {
          id125: id125.length > 0 && id125[0].quantidade > 10000 ? 
            `ID 125 tem quantidade ${id125[0].quantidade} - provavelmente precisa de correção` : 
            'ID 125 parece estar correto',
          nextSteps: [
            'Se conectividade OK, problema pode ser token expirado',
            'Fazer logout/login para renovar token',
            'Se persistir, verificar logs do Netlify Functions'
          ]
        }
      }, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Erro no teste de conectividade:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          possibleCauses: [
            'DATABASE_URL incorreta ou expirada',
            'Neon PostgreSQL com problema',
            'Timeout de conexão',
            'Erro de sintaxe SQL',
            'Tabela não existe'
          ],
          nextSteps: [
            'Verificar DATABASE_URL no Netlify',
            'Testar conexão no Neon Console',
            'Verificar logs do Netlify Functions',
            'Fazer logout/login na aplicação'
          ]
        }
      }, null, 2)
    };
  }
};
