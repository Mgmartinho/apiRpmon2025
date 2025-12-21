import pool from './config/mysqlConnect.js';

async function runMigration() {
  try {
    console.log('🔄 Iniciando migração...');

    try {
      // 1. Adicionar coluna usuarioId se não existir
      await pool.query(`
        ALTER TABLE historicoHoras 
        ADD COLUMN usuarioId INT NULL
      `);
      console.log('✅ Coluna usuarioId adicionada');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ Coluna usuarioId já existe');
      } else {
        throw err;
      }
    }

    try {
      // Remover foreign key antiga se existir
      await pool.query(`
        ALTER TABLE historicoHoras DROP FOREIGN KEY fk_usuario_id
      `);
      console.log('✅ Foreign key antiga removida');
    } catch (err) {
      console.log('ℹ️ Foreign key antiga não existe ou erro:', err.message);
    }

    try {
      // Remover coluna usuario_id se existir
      await pool.query(`
        ALTER TABLE historicoHoras DROP COLUMN usuario_id
      `);
      console.log('✅ Coluna usuario_id removida');
    } catch (err) {
      console.log('ℹ️ Coluna usuario_id não existe ou erro:', err.message);
    }

    try {
      // 2. Adicionar foreign key
      await pool.query(`
        ALTER TABLE historicoHoras 
        ADD CONSTRAINT fk_usuario_id 
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id) 
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

    // 4. Adicionar índices para performance
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_solipede_alocacao ON solipede(alocacao)`);
      console.log('✅ Índice alocacao adicionado');
    } catch (err) {
      console.log('ℹ️ Índice alocacao já existe ou erro:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_solipede_esquadrao ON solipede(esquadrao)`);
      console.log('✅ Índice esquadrao adicionado');
    } catch (err) {
      console.log('ℹ️ Índice esquadrao já existe ou erro:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_solipede_nome ON solipede(nome)`);
      console.log('✅ Índice nome adicionado');
    } catch (err) {
      console.log('ℹ️ Índice nome já existe ou erro:', err.message);
    }

    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_historico_solipede ON historicoHoras(solipedeNumero)`);
      console.log('✅ Índice historico solipede adicionado');
    } catch (err) {
      console.log('ℹ️ Índice historico solipede já existe ou erro:', err.message);
    }

    console.log('✅✅✅ Migração concluída com sucesso!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Erro na migração:', err.message);
    process.exit(1);
  }
}

runMigration();
