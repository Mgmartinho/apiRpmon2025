import mysql from 'mysql2/promise';
import fetch from 'node-fetch';
import readline from 'readline';

const API_BASE_URL = 'http://localhost:3003';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function fazerLogin() {
  console.log('\n🔐 AUTENTICAÇÃO NECESSÁRIA\n');
  const email = await pergunta('Digite seu email: ');
  const senha = await pergunta('Digite sua senha: ');
  
  console.log('\n🔄 Fazendo login...');
  
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha })
    });
    
    if (!response.ok) {
      console.log(`❌ Erro no login: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Login realizado!\n');
    return data.token;
  } catch (error) {
    console.log(`❌ Erro: ${error.message}`);
    return null;
  }
}

async function testar() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboardrpmon'
  });

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🧪 TESTE AUTOMÁTICO - CAMPO precisa_baixar');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log('📊 FASE 1: Banco de dados...\n');
    
    const [rows] = await pool.query(`
      SELECT id, numero_solipede, tipo, precisa_baixar, 
             foi_responsavel_pela_baixa, DATE_FORMAT(data_criacao, '%Y-%m-%d %H:%i') as data_criacao,
             LEFT(observacao, 50) as observacao_preview
      FROM prontuario WHERE tipo = 'Tratamento' ORDER BY id DESC LIMIT 3
    `);

    if (rows.length === 0) {
      console.log('❌ Nenhum tratamento encontrado');
      await pool.end();
      rl.close();
      return;
    }

    console.log('✅ Tratamentos no BANCO:');
    console.table(rows);

    const numeroSolipede = rows[0].numero_solipede;
    const tratamentoAlvo = rows[0];

    console.log('\n🔐 FASE 2: Autenticação...\n');
    const token = await fazerLogin();
    if (!token) {
      await pool.end();
      rl.close();
      return;
    }
    
    console.log('🌐 FASE 3: Testando API...\n');
    console.log(`📡 GET /gestaoFVR/prontuario/${numeroSolipede}\n`);

    const response = await fetch(`${API_BASE_URL}/gestaoFVR/prontuario/${numeroSolipede}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      console.log(`❌ Erro: HTTP ${response.status}`);
      await pool.end();
      rl.close();
      return;
    }

    const apiResponse = await response.json();
    console.log(`✅ API OK! Registros: ${apiResponse.length}\n`);

    const tratamentosAPI = apiResponse.filter(r => r.tipo === 'Tratamento');
    console.log(`💊 Tratamentos na API: ${tratamentosAPI.length}\n`);

    console.log('🔬 FASE 4: Análise detalhada...\n');
    console.log(`🎯 Analisando ID ${tratamentoAlvo.id}:\n`);

    const registroAPI = apiResponse.find(r => r.id === tratamentoAlvo.id);

    console.log('📋 BANCO DE DADOS:');
    console.log(`   precisa_baixar: "${tratamentoAlvo.precisa_baixar}"`);
    console.log(`   Tipo: ${typeof tratamentoAlvo.precisa_baixar}\n`);

    if (registroAPI) {
      console.log('📋 API RESPONSE:');
      console.log(`   Campo existe? ${registroAPI.hasOwnProperty('precisa_baixar') ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   Valor: ${registroAPI.precisa_baixar === undefined ? '❌ undefined' : registroAPI.precisa_baixar === null ? '⚠️ null' : `"${registroAPI.precisa_baixar}"`}`);
      console.log(`   Tipo: ${typeof registroAPI.precisa_baixar}\n`);

      console.log('🔍 COMPARAÇÃO:');
      const iguais = tratamentoAlvo.precisa_baixar === registroAPI.precisa_baixar;
      console.log(`   Banco: "${tratamentoAlvo.precisa_baixar}"`);
      console.log(`   API:   "${registroAPI.precisa_baixar}"`);
      console.log(`   ${iguais ? '✅ IGUAIS' : '❌ DIFERENTES'}\n`);

      console.log('🎨 RENDERIZAÇÃO FRONTEND:');
      console.log(`   Condição: tipo === "Tratamento" && precisa_baixar`);
      console.log(`   tipo === "Tratamento": ${registroAPI.tipo === 'Tratamento' ? '✅' : '❌'}`);
      console.log(`   precisa_baixar truthy: ${registroAPI.precisa_baixar ? '✅' : '❌'}`);
      
      const mostraBadge = registroAPI.tipo === 'Tratamento' && registroAPI.precisa_baixar;
      console.log(`   Badge aparece? ${mostraBadge ? '✅ SIM' : '❌ NÃO'}\n`);
      
      if (mostraBadge) {
        if (registroAPI.precisa_baixar === 'sim') {
          console.log(`   🚨 Badge VERMELHO: "Este tratamento baixou o solípede"`);
        } else if (registroAPI.precisa_baixar === 'nao') {
          console.log(`   ✅ Badge VERDE: "Este tratamento NÃO baixou o solípede"`);
        }
      }
    }

    console.log('\n📊 DIAGNÓSTICO FINAL:\n');

    const existeBanco = tratamentoAlvo.precisa_baixar !== null;
    const existeAPI = registroAPI && registroAPI.precisa_baixar !== null;

    if (!existeBanco) {
      console.log('❌ Campo NULL no banco');
    } else if (!existeAPI) {
      console.log('❌ API não retorna o campo');
      console.log('   → Verificar SELECT em Solipedes.js');
    } else if (tratamentoAlvo.precisa_baixar !== registroAPI.precisa_baixar) {
      console.log('❌ Valores diferentes');
    } else {
      console.log('✅ BACKEND OK - Campo existe e API retorna corretamente!');
      console.log('\nSe badge não aparece no navegador:');
      console.log('   1. Abrir Console (F12) e buscar "DEBUG RENDER"');
      console.log('   2. Verificar valor de precisa_baixar no log');
      console.log('   3. Verificar JSX linha 2245 de pronturarioEdit.js');
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TESTE CONCLUÍDO');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
  } finally {
    await pool.end();
    rl.close();
  }
}

testar();
