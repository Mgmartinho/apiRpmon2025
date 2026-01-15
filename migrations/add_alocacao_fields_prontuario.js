import pool from "../config/mysqlConnect.js";

async function adicionarCamposAlocacao() {
  try {
    console.log("🔄 Adicionando campos de alocação na tabela prontuario...");

    // Adicionar campos alocacao_anterior e alocacao_nova
    await pool.query(`
      ALTER TABLE prontuario 
      ADD COLUMN IF NOT EXISTS alocacao_anterior VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS alocacao_nova VARCHAR(100) DEFAULT NULL
    `);

    console.log("✅ Campos alocacao_anterior e alocacao_nova adicionados com sucesso!");

    // Adicionar índices
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_prontuario_tipo ON prontuario(tipo)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_prontuario_alocacao_nova ON prontuario(alocacao_nova)
    `);

    console.log("✅ Índices criados com sucesso!");
    console.log("✅ Migração concluída!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro na migração:", error);
    process.exit(1);
  }
}

adicionarCamposAlocacao();
