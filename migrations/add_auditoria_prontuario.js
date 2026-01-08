import pool from "../config/mysqlConnect.js";

async function addAuditoriaProntuario() {
  try {
    console.log("🔧 Verificando e adicionando campos de auditoria na tabela prontuario...\n");

    // Verificar se os campos já existem
    const [columns] = await pool.query(`SHOW COLUMNS FROM prontuario`);
    const columnNames = columns.map(col => col.Field);
    console.log("📋 Colunas existentes:", columnNames.join(", "), "\n");

    let alteracoes = 0;

    // Adicionar status_anterior se não existir
    if (!columnNames.includes('status_anterior')) {
      console.log("➕ Adicionando campo status_anterior...");
      await pool.query(`
        ALTER TABLE prontuario
        ADD COLUMN status_anterior VARCHAR(50) NULL COMMENT 'Status anterior do solípede'
      `);
      console.log("✅ Campo status_anterior adicionado!\n");
      alteracoes++;
    } else {
      console.log("✓ Campo status_anterior já existe\n");
    }

    // Adicionar status_novo se não existir
    if (!columnNames.includes('status_novo')) {
      console.log("➕ Adicionando campo status_novo...");
      await pool.query(`
        ALTER TABLE prontuario
        ADD COLUMN status_novo VARCHAR(50) NULL COMMENT 'Novo status do solípede'
      `);
      console.log("✅ Campo status_novo adicionado!\n");
      alteracoes++;
    } else {
      console.log("✓ Campo status_novo já existe\n");
    }

    // Adicionar data_atualizacao se não existir
    if (!columnNames.includes('data_atualizacao')) {
      console.log("➕ Adicionando campo data_atualizacao...");
      await pool.query(`
        ALTER TABLE prontuario
        ADD COLUMN data_atualizacao DATETIME NULL COMMENT 'Data da última atualização'
      `);
      console.log("✅ Campo data_atualizacao adicionado!\n");
      alteracoes++;
    } else {
      console.log("✓ Campo data_atualizacao já existe\n");
    }

    // Adicionar usuario_atualizacao_id se não existir
    if (!columnNames.includes('usuario_atualizacao_id')) {
      console.log("➕ Adicionando campo usuario_atualizacao_id...");
      await pool.query(`
        ALTER TABLE prontuario
        ADD COLUMN usuario_atualizacao_id INT NULL COMMENT 'ID do usuário que atualizou'
      `);
      
      // Adicionar foreign key
      console.log("➕ Adicionando foreign key para usuario_atualizacao_id...");
      await pool.query(`
        ALTER TABLE prontuario
        ADD FOREIGN KEY (usuario_atualizacao_id) REFERENCES usuarios(id)
      `);
      console.log("✅ Campo usuario_atualizacao_id adicionado com foreign key!\n");
      alteracoes++;
    } else {
      console.log("✓ Campo usuario_atualizacao_id já existe\n");
    }

    console.log("═".repeat(60));
    console.log(`✅ Migração concluída! ${alteracoes} campo(s) adicionado(s).`);
    console.log("═".repeat(60));

    // Fechar pool de conexões
    await pool.end();

  } catch (error) {
    console.error("\n❌ Erro ao adicionar campos de auditoria:");
    console.error(error.message);
    console.error("\nStack trace:", error.stack);
    
    // Fechar pool mesmo em caso de erro
    try {
      await pool.end();
    } catch (e) {
      // Ignorar erro ao fechar pool
    }
    
    throw error;
  }
}

// Executar a migração
addAuditoriaProntuario()
  .then(() => {
    console.log("\n✅ Script finalizado com sucesso!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Erro ao executar script");
    process.exit(1);
  });
