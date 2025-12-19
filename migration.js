import pool from './config/mysqlConnect.js';

async function runMigration() {
  try {
    console.log('🔄 Iniciando migração...');

    try {
      // 1. Adicionar coluna usuario_id se não existir
      await pool.query(`
        ALTER TABLE historicoHoras 
        ADD COLUMN usuario_id INT NULL
      `);
      console.log('✅ Coluna usuario_id adicionada');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Coluna usuario_id já existe');
      } else {
        throw err;
      }
    }

    try {
      // 2. Adicionar foreign key
      await pool.query(`
        ALTER TABLE historicoHoras 
        ADD CONSTRAINT fk_usuario_id 
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) 
        ON DELETE SET NULL
      `);
      console.log('✅ Foreign key adicionada');
    } catch (err) {
      if (err.code === 'ER_DUP_KEYNAME') {
        console.log('✅ Foreign key já existe');
      } else {
        throw err;
      }
    }

    // 3. Criar tabela prontuario se não existir
    await pool.query(`
      CREATE TABLE IF NOT EXISTS prontuario (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero_solipede INT NOT NULL,
        tipo VARCHAR(50) DEFAULT 'Observação Geral',
        observacao LONGTEXT NOT NULL,
        recomendacoes LONGTEXT,
        data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (numero_solipede) REFERENCES solipede(numero) ON DELETE CASCADE,
        INDEX idx_numero_solipede (numero_solipede),
        INDEX idx_data_criacao (data_criacao)
      )
    `);
    console.log('✅ Tabela prontuario criada/verificada');

    console.log('✅✅✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    process.exit(1);
  }
}

runMigration();
