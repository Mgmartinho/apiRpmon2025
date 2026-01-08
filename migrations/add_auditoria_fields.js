import pool from "../config/mysqlConnect.js";

async function adicionarCamposAuditoria() {
  try {
    console.log("🔄 Adicionando campos de auditoria na tabela solipede...");

    // Verificar se as colunas já existem
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'dashboardrpmon' 
        AND TABLE_NAME = 'solipede' 
        AND COLUMN_NAME IN ('data_atualizacao', 'usuario_atualizacao_id')
    `);

    const existingColumns = columns.map(col => col.COLUMN_NAME);

    if (!existingColumns.includes('data_atualizacao')) {
      await pool.query(`
        ALTER TABLE solipede 
        ADD COLUMN data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      `);
      console.log("✅ Campo data_atualizacao adicionado");
    } else {
      console.log("⏭️  Campo data_atualizacao já existe");
    }

    if (!existingColumns.includes('usuario_atualizacao_id')) {
      await pool.query(`
        ALTER TABLE solipede 
        ADD COLUMN usuario_atualizacao_id INT DEFAULT NULL,
        ADD FOREIGN KEY (usuario_atualizacao_id) REFERENCES usuarios(id) ON DELETE SET NULL
      `);
      console.log("✅ Campo usuario_atualizacao_id adicionado");
    } else {
      console.log("⏭️  Campo usuario_atualizacao_id já existe");
    }

    console.log("\n🔄 Criando tabela historico_alteracoes...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_alteracoes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tabela VARCHAR(50) NOT NULL,
        registro_id VARCHAR(50) NOT NULL,
        campo_alterado VARCHAR(100) NOT NULL,
        valor_anterior TEXT,
        valor_novo TEXT,
        tipo_operacao ENUM('INSERT', 'UPDATE', 'DELETE', 'STATUS_CHANGE') NOT NULL,
        usuario_id INT NOT NULL,
        data_alteracao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        observacao TEXT,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
        INDEX idx_tabela_registro (tabela, registro_id),
        INDEX idx_usuario (usuario_id),
        INDEX idx_data (data_alteracao)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log("✅ Tabela historico_alteracoes criada com sucesso!");
    
  } catch (err) {
    console.error("❌ Erro:", err);
  } finally {
    process.exit();
  }
}

adicionarCamposAuditoria();
