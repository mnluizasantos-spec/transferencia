/**
 * Inspeciona um arquivo Excel e mostra estrutura e primeiras linhas
 * Uso: node scripts/inspect-excel.js "C:\Users\maria.nunes\Downloads\template_solicitacoes (1).xlsx"
 */
const XLSX = require('xlsx');
const path = process.argv[2] || require('path').join(__dirname, '..', '..', '..', 'Downloads', 'template_solicitacoes (1).xlsx');

const expected = ['Material', 'Descrição', 'Quantidade', 'Unidade', 'Solicitante', 'Urgencia', 'Prazo', 'Justificativa'];
const expectedUnidades = ['kg', 'pc', 'm'];

try {
  const wb = XLSX.readFile(path);
  console.log('Abas:', wb.SheetNames);
  const firstSheet = wb.SheetNames[0];
  const ws = wb.Sheets[firstSheet];
  const data = XLSX.utils.sheet_to_json(ws, { raw: true });
  console.log('Total de linhas (com cabeçalho como linha 1):', data.length + 1);
  if (data.length === 0) {
    console.log('Nenhuma linha de dados. Verifique se a primeira aba tem cabeçalho na linha 1 e dados a partir da linha 2.');
    process.exit(1);
  }
  const headers = Object.keys(data[0]);
  console.log('\nColunas encontradas:', headers);
  console.log('Colunas esperadas:', expected);
  const missing = expected.filter(c => !headers.some(h => h === c || h === c.replace('ã', 'a')));
  if (missing.length) console.log('Colunas em falta (exato):', missing);
  console.log('\n--- Primeiras 3 linhas (como o import lê) ---');
  data.slice(0, 3).forEach((row, i) => {
    console.log('\nLinha', i + 2, row);
    const unidade = (row.Unidade || row.unidade || '').toString().trim().toLowerCase();
    if (unidade && !expectedUnidades.includes(unidade)) {
      console.log('  >>> Unidade "' + (row.Unidade || row.unidade) + '" não é permitida. Use: kg, pc ou m');
    }
    const prazo = row.Prazo || row.prazo;
    if (prazo !== undefined && typeof prazo === 'number' && prazo > 50000) {
      console.log('  >>> Prazo parece número de série Excel (ex: 45500). Use data no formato dd/mm/aaaa (ex: 20/10/2025)');
    }
  });
} catch (err) {
  console.error('Erro:', err.message);
  process.exit(1);
}
