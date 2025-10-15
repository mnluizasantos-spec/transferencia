/**
 * Script para testar login via fetch
 */

async function testLogin() {
  try {
    console.log('🔐 Testando login...');
    
    const response = await fetch('https://transferencia-mp.netlify.app/.netlify/functions/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@antilhas.com',
        password: 'admin123'
      })
    });
    
    console.log('📊 Status:', response.status);
    console.log('📋 Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.json();
    console.log('📄 Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('✅ Login bem-sucedido!');
      console.log('🎫 Token:', data.token ? 'Presente' : 'Ausente');
      console.log('👤 User:', data.user);
    } else {
      console.log('❌ Erro no login:', data.error);
    }
    
  } catch (error) {
    console.error('💥 Erro na requisição:', error.message);
  }
}

// Executar teste
testLogin();
