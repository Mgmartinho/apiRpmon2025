import pool from './config/mysqlConnect.js';

const adicionarCampoTamanho = async () => {
  try {
    console.log('Adicionando coluna tamanho_ferradura...');
    
    const alterTableSQL = `
      ALTER TABLE ferrageamentos 
      ADD COLUMN tamanho_ferradura VARCHAR(20) AFTER prazo_validade;
    `;

    await pool.query(alterTableSQL);
    console.log('✅ Coluna tamanho_ferradura adicionada com sucesso!');

    // Verificar
    const [columns] = await pool.query("DESCRIBE ferrageamentos");
    console.log('\n📋 Estrutura atualizada:');
    columns.forEach(col => console.log(`  - ${col.Field}: ${col.Type}`));

    process.exit(0);
  } catch (error) {
    if (error.message.includes("Duplicate column")) {
      console.log('⚠️ Coluna tamanho_ferradura já existe!');
      process.exit(0);
    }
    console.error('❌ Erro:', error.message);
    process.exit(1);
  }
};

adicionarCampoTamanho();
