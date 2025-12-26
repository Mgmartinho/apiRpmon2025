import pool from './config/mysqlConnect.js';

const testarQuery = async () => {
  try {
    console.log('Testando query listarComStatus...\n');
    
    const query = `
      SELECT 
        f.*,
        s.nome as solipede_nome,
        s.alocacao as solipede_alocacao,
        s.status as solipede_status,
        DATEDIFF(f.proximo_ferrageamento, CURDATE()) as dias_restantes,
        CASE
          WHEN DATEDIFF(f.proximo_ferrageamento, CURDATE()) < 0 THEN 'VENCIDO'
          WHEN DATEDIFF(f.proximo_ferrageamento, CURDATE()) <= 7 THEN 'PROXIMO_VENCIMENTO'
          ELSE 'EM_DIA'
        END as status_ferrageamento
      FROM (
        SELECT 
          f1.*
        FROM ferrageamentos f1
        INNER JOIN (
          SELECT solipede_numero, MAX(data_ferrageamento) as max_data
          FROM ferrageamentos
          GROUP BY solipede_numero
        ) f2 ON f1.solipede_numero = f2.solipede_numero 
        AND f1.data_ferrageamento = f2.max_data
      ) f
      LEFT JOIN solipede s ON f.solipede_numero = s.numero
      WHERE s.status IN ('Ativo')
      ORDER BY dias_restantes ASC, f.proximo_ferrageamento ASC
    `;
    
    const [rows] = await pool.query(query);
    console.log('✅ Registros encontrados:', rows.length);
    console.log('\n📊 Dados:');
    console.log(JSON.stringify(rows, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
};

testarQuery();
