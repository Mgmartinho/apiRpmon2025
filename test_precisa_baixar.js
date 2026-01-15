import mysql from 'mysql2/promise';

(async () => {
  try {
    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'dashboardrpmon',
      waitForConnections: true,
      connectionLimit: 10
    });

    console.log('🔍 Buscando últimos 5 tratamentos no banco...\n');
    
    const [rows] = await pool.query(`
      SELECT 
        id, 
        numero_solipede, 
        tipo, 
        precisa_baixar, 
        foi_responsavel_pela_baixa,
        DATE_FORMAT(data_criacao, '%Y-%m-%d %H:%i') as data_criacao,
        observacao
      FROM prontuario 
      WHERE tipo = 'Tratamento' 
      ORDER BY id DESC 
      LIMIT 5
    `);

    console.table(rows);
    
    console.log('\n📊 Análise:');
    rows.forEach((row, i) => {
      console.log(`Tratamento ${i + 1}:`);
      console.log(`  - ID: ${row.id}`);
      console.log(`  - Solípede: ${row.numero_solipede}`);
      console.log(`  - precisa_baixar: ${row.precisa_baixar} (tipo: ${typeof row.precisa_baixar})`);
      console.log(`  - foi_responsavel_pela_baixa: ${row.foi_responsavel_pela_baixa}`);
      console.log(`  - Data: ${row.data_criacao}`);
      console.log('');
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
})();
