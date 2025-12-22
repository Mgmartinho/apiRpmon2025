import pool from './config/mysqlConnect.js';

async function checkProntuario() {
  try {
    console.log('\n🔍 Verificando dados da tabela prontuario...\n');
    
    // Verificar últimos 3 registros
    const [rows] = await pool.query(`
      SELECT 
        p.id,
        p.numero_solipede,
        p.tipo,
        p.usuarioId,
        p.data_criacao,
        u.nome as usuario_nome,
        u.re as usuario_registro,
        u.perfil as usuario_perfil
      FROM prontuario p
      LEFT JOIN usuarios u ON p.usuarioId = u.id
      ORDER BY p.id DESC 
      LIMIT 3
    `);
    
    console.log('📋 Últimos 3 registros do prontuário:\n');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   Solípede: ${row.numero_solipede}`);
      console.log(`   Tipo: ${row.tipo}`);
      console.log(`   usuarioId: ${row.usuarioId || 'NULL'}`);
      console.log(`   Usuario Nome: ${row.usuario_nome || 'NULL'}`);
      console.log(`   Usuario RE: ${row.usuario_registro || 'NULL'}`);
      console.log(`   Usuario Perfil: ${row.usuario_perfil || 'NULL'}`);
      console.log(`   Data: ${row.data_criacao}`);
      console.log('');
    });
    
    // Verificar estrutura da tabela
    const [columns] = await pool.query(`
      SHOW COLUMNS FROM prontuario
    `);
    
    console.log('📊 Estrutura da tabela prontuario:\n');
    columns.forEach(col => {
      console.log(`   ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

checkProntuario();
