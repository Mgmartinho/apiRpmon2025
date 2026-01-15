import pool from "../config/mysqlConnect.js";

async function adicionarCampoIndocil() {
  try {
    console.log("🔄 Adicionando campo 'indocil' na tabela solipede...");

    // Verificar se a coluna já existe
    const [columns] = await pool.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'dashboardrpmon' 
        AND TABLE_NAME = 'solipede' 
        AND COLUMN_NAME = 'indocil'
    `);

    if (columns.length === 0) {
      await pool.query(`
        ALTER TABLE solipede 
        ADD COLUMN indocil BOOLEAN DEFAULT FALSE COMMENT 'Indica se o solípede é indócil (difícil manejo/ferrageamento)'
      `);
      console.log("✅ Campo 'indocil' adicionado com sucesso");
      console.log("   - Tipo: BOOLEAN");
      console.log("   - Padrão: FALSE (dócil)");
      console.log("   - Descrição: Indica comportamento do animal");
    } else {
      console.log("⏭️  Campo 'indocil' já existe na tabela solipede");
    }

    console.log("\n✅ Migration concluída!");
  } catch (error) {
    console.error("❌ Erro na migration:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar migration
adicionarCampoIndocil()
  .then(() => {
    console.log("🎉 Processo finalizado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na migration:", error);
    process.exit(1);
  });
