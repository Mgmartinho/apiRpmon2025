import pool from "../config/mysqlConnect.js";

/**
 * Migration: Adicionar campos de conclusão de tratamento na tabela prontuario
 * 
 * Campos adicionados:
 * - status_conclusao: 'em_andamento', 'concluido'
 * - data_conclusao: data/hora quando foi concluído
 * - usuario_conclusao_id: ID do usuário que concluiu
 */

async function up() {
  try {
    console.log("🚀 Iniciando migração: add_conclusao_tratamento_fields");

    // Adicionar campos de conclusão
    await pool.query(`
      ALTER TABLE prontuario
      ADD COLUMN IF NOT EXISTS status_conclusao VARCHAR(20) DEFAULT 'em_andamento' COMMENT 'Status: em_andamento, concluido',
      ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP NULL DEFAULT NULL COMMENT 'Data/hora da conclusão',
      ADD COLUMN IF NOT EXISTS usuario_conclusao_id INT NULL DEFAULT NULL COMMENT 'ID do usuário que concluiu'
    `);

    console.log("✅ Campos adicionados na tabela prontuario");

    // Verificar se a constraint já existe antes de adicionar
    const [constraints] = await pool.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_SCHEMA = 'dashboardrpmon' 
      AND TABLE_NAME = 'prontuario' 
      AND CONSTRAINT_NAME = 'fk_prontuario_usuario_conclusao'
    `);

    if (constraints.length === 0) {
      // Adicionar foreign key para usuario_conclusao_id
      await pool.query(`
        ALTER TABLE prontuario
        ADD CONSTRAINT fk_prontuario_usuario_conclusao
        FOREIGN KEY (usuario_conclusao_id) 
        REFERENCES usuarios(id) 
        ON DELETE SET NULL
      `);

      console.log("✅ Foreign key criada: fk_prontuario_usuario_conclusao");
    } else {
      console.log("⚠️  Foreign key já existe: fk_prontuario_usuario_conclusao");
    }

    console.log("🎉 Migração concluída com sucesso!");

  } catch (error) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  }
}

async function down() {
  try {
    console.log("⬇️  Revertendo migração: add_conclusao_tratamento_fields");

    // Remover foreign key
    await pool.query(`
      ALTER TABLE prontuario
      DROP FOREIGN KEY IF EXISTS fk_prontuario_usuario_conclusao
    `);

    // Remover colunas
    await pool.query(`
      ALTER TABLE prontuario
      DROP COLUMN IF EXISTS status_conclusao,
      DROP COLUMN IF EXISTS data_conclusao,
      DROP COLUMN IF EXISTS usuario_conclusao_id
    `);

    console.log("✅ Migração revertida com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao reverter migração:", error.message);
    throw error;
  }
}

// Executar migração
if (process.argv[2] === 'up') {
  up().then(() => process.exit(0)).catch(() => process.exit(1));
} else if (process.argv[2] === 'down') {
  down().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  console.log("Usage: node add_conclusao_tratamento_fields.js [up|down]");
  process.exit(1);
}
