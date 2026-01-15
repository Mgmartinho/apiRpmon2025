import mysql from 'mysql2/promise';
import fetch from 'node-fetch';

const API_BASE_URL = 'http://localhost:3003';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJtYXJ0aW5oby5ndWlsaGVybWUxM0Bob3RtYWlsLmNvbSIsImlhdCI6MTczNjg4MTk3NywiZXhwIjoxNzM2OTY4Mzc3fQ.QEgZ6E0_fJPH9kDBqJTMx_4gWpQ5d-RP0u3-pKBnOks'; // Token do login anterior

async function testarRegistroEspecifico() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'dashboardrpmon'
  });

  try {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('🎯 TESTE ESPECÍFICO - Tratamento ID 274');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Buscar ID 274 no banco
    const [rows] = await pool.query(`
      SELECT id, numero_solipede, tipo, precisa_baixar, 
             foi_responsavel_pela_baixa, DATE_FORMAT(data_criacao, '%Y-%m-%d %H:%i:%s') as data_criacao,
             observacao
      FROM prontuario WHERE id = 274
    `);

    if (rows.length === 0) {
      console.log('❌ Registro ID 274 não encontrado no banco');
      await pool.end();
      return;
    }

    const registro = rows[0];
    console.log('📊 DADOS NO BANCO (ID 274):');
    console.log(`   Solípede: ${registro.numero_solipede}`);
    console.log(`   Data: ${registro.data_criacao}`);
    console.log(`   Observação: "${registro.observacao}"`);
    console.log(`   precisa_baixar: "${registro.precisa_baixar}"`);
    console.log(`   foi_responsavel_pela_baixa: ${registro.foi_responsavel_pela_baixa}\n`);

    // Buscar na API
    console.log(`📡 Buscando na API: GET /gestaoFVR/prontuario/${registro.numero_solipede}\n`);

    const response = await fetch(`${API_BASE_URL}/gestaoFVR/prontuario/${registro.numero_solipede}`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` }
    });

    if (!response.ok) {
      console.log(`❌ Erro na API: ${response.status}`);
      await pool.end();
      return;
    }

    const apiData = await response.json();
    console.log(`✅ API retornou ${apiData.length} registros\n`);

    // Procurar ID 274 na resposta
    const registroAPI = apiData.find(r => r.id === 274);

    if (!registroAPI) {
      console.log('❌ ID 274 NÃO ENCONTRADO na resposta da API!');
      console.log('\nRegistros retornados pela API:');
      console.table(apiData.map(r => ({ id: r.id, tipo: r.tipo, data: r.data_criacao })));
    } else {
      console.log('✅ ID 274 ENCONTRADO na API!\n');
      console.log('📋 DADOS RETORNADOS PELA API:');
      console.log(`   ID: ${registroAPI.id}`);
      console.log(`   Tipo: ${registroAPI.tipo}`);
      console.log(`   precisa_baixar existe? ${registroAPI.hasOwnProperty('precisa_baixar') ? '✅ SIM' : '❌ NÃO'}`);
      
      if (registroAPI.hasOwnProperty('precisa_baixar')) {
        console.log(`   Valor: "${registroAPI.precisa_baixar}"`);
        console.log(`   Tipo: ${typeof registroAPI.precisa_baixar}`);
      } else {
        console.log(`   Valor: undefined (campo não existe no objeto)`);
      }

      console.log('\n🔍 COMPARAÇÃO:');
      console.log(`   Banco: "${registro.precisa_baixar}" (tipo: ${typeof registro.precisa_baixar})`);
      console.log(`   API: "${registroAPI.precisa_baixar}" (tipo: ${typeof registroAPI.precisa_baixar})`);
      
      if (registro.precisa_baixar === registroAPI.precisa_baixar) {
        console.log(`   ✅ VALORES IGUAIS!`);
      } else {
        console.log(`   ❌ VALORES DIFERENTES!`);
      }

      console.log('\n🎨 SIMULAÇÃO DE RENDERIZAÇÃO:');
      const condicao1 = registroAPI.tipo === 'Tratamento';
      const condicao2 = Boolean(registroAPI.precisa_baixar);
      const mostraBadge = condicao1 && condicao2;

      console.log(`   registro.tipo === "Tratamento": ${condicao1 ? '✅ true' : '❌ false'}`);
      console.log(`   Boolean(registro.precisa_baixar): ${condicao2 ? '✅ true' : '❌ false'}`);
      console.log(`   Ambas verdadeiras (&&): ${mostraBadge ? '✅ true' : '❌ false'}`);
      console.log(`   \n   RESULTADO: Badge ${mostraBadge ? '✅ DEVE APARECER' : '❌ NÃO APARECE'}`);

      if (mostraBadge) {
        if (registroAPI.precisa_baixar === 'sim') {
          console.log(`   🚨 Badge VERMELHO: "Este tratamento baixou o solípede"`);
        } else if (registroAPI.precisa_baixar === 'nao') {
          console.log(`   ✅ Badge VERDE: "Este tratamento NÃO baixou o solípede"`);
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ TESTE CONCLUÍDO');
    console.log('═══════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

testarRegistroEspecifico();
