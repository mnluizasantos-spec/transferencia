/**
 * Debug File Download - Diagnóstico de Arquivo Corrompido
 * 
 * Endpoint para diagnosticar problema de conversão de arquivo
 * Retorna informações sobre como o arquivo está armazenado
 */

const { getDB } = require('./utils/db');
const { withErrorHandling } = require('./utils/errorHandler');

/**
 * Analisa arquivo do batch 26 para diagnóstico
 */
async function debugFileDownload(sql) {
  console.log('🔍 Iniciando diagnóstico de arquivo...');
  
  try {
    // Buscar arquivo do batch 26
    const files = await sql`
      SELECT 
        batch_id,
        original_filename,
        mime_type,
        size_bytes,
        LENGTH(file_bytes) as file_bytes_length,
        pg_typeof(file_bytes) as file_bytes_type,
        created_at
      FROM import_files
      WHERE batch_id = 26
      LIMIT 1
    `;
    
    if (files.length === 0) {
      return {
        error: 'Nenhum arquivo encontrado para o batch 26',
        suggestion: 'Verificar se o arquivo foi salvo corretamente durante a importação'
      };
    }
    
    const file = files[0];
    
    // Analisar primeiros bytes do arquivo
    const firstBytes = await sql`
      SELECT 
        SUBSTRING(file_bytes::text, 1, 100) as first_100_chars,
        SUBSTRING(file_bytes::text, 1, 20) as first_20_chars
      FROM import_files
      WHERE batch_id = 26
      LIMIT 1
    `;
    
    const analysis = {
      fileInfo: {
        batchId: file.batch_id,
        filename: file.original_filename,
        mimeType: file.mime_type,
        sizeBytes: file.size_bytes,
        fileBytesLength: file.file_bytes_length,
        fileBytesType: file.file_bytes_type,
        createdAt: file.created_at
      },
      firstBytes: {
        first20Chars: firstBytes[0]?.first_20_chars,
        first100Chars: firstBytes[0]?.first_100_chars
      },
      analysis: {
        isBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(firstBytes[0]?.first_20_chars || ''),
        isBinary: firstBytes[0]?.first_20_chars?.includes('\x00') || false,
        startsWithPK: firstBytes[0]?.first_20_chars?.startsWith('PK') || false, // ZIP/Excel signature
        sizeMatch: file.size_bytes === file.file_bytes_length
      },
      recommendations: []
    };
    
    // Gerar recomendações baseadas na análise
    if (analysis.analysis.startsWithPK) {
      analysis.recommendations.push('✅ Arquivo parece ser Excel válido (começa com PK)');
    } else if (analysis.analysis.isBase64) {
      analysis.recommendations.push('⚠️ Arquivo parece estar em base64 - pode precisar de conversão');
    } else {
      analysis.recommendations.push('❓ Formato de arquivo não identificado');
    }
    
    if (!analysis.analysis.sizeMatch) {
      analysis.recommendations.push('⚠️ Tamanho não confere - possível problema de armazenamento');
    }
    
    // Testar diferentes métodos de conversão
    const conversionTests = [];
    
    try {
      // Teste 1: Buffer.from(file_bytes).toString('base64')
      const test1 = await sql`
        SELECT encode(file_bytes, 'base64') as base64_conversion
        FROM import_files
        WHERE batch_id = 26
        LIMIT 1
      `;
      conversionTests.push({
        method: 'encode(file_bytes, \'base64\')',
        result: test1[0]?.base64_conversion?.substring(0, 50) + '...',
        length: test1[0]?.base64_conversion?.length
      });
    } catch (e) {
      conversionTests.push({
        method: 'encode(file_bytes, \'base64\')',
        error: e.message
      });
    }
    
    try {
      // Teste 2: file_bytes direto
      const test2 = await sql`
        SELECT file_bytes::text as direct_text
        FROM import_files
        WHERE batch_id = 26
        LIMIT 1
      `;
      conversionTests.push({
        method: 'file_bytes::text',
        result: test2[0]?.direct_text?.substring(0, 50) + '...',
        length: test2[0]?.direct_text?.length
      });
    } catch (e) {
      conversionTests.push({
        method: 'file_bytes::text',
        error: e.message
      });
    }
    
    analysis.conversionTests = conversionTests;
    
    console.log('📊 Diagnóstico concluído');
    return analysis;
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    return {
      error: error.message,
      suggestion: 'Verificar conectividade com banco de dados'
    };
  }
}

/**
 * Handler principal
 */
exports.handler = withErrorHandling(async (event, context) => {
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

  try {
    const sql = getDB();
    const analysis = await debugFileDownload(sql);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Diagnóstico de arquivo concluído',
        analysis: analysis
      }, null, 2)
    };
    
  } catch (error) {
    console.error('❌ Erro no diagnóstico:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
});
