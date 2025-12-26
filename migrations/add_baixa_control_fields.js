import pool from "../config/mysqlConnect.js";

/**
 * Migration: Adicionar campos de controle de baixa na tabela prontuario
 * 
 * Campos adicionados:
 * - status_baixa: 'pendente' ou 'liberada'
 * - data_liberacao: data/hora quando foi liberada
 * - usuario_liberacao_id: ID do veterinário que liberou
 * - tipo_baixa: 'Baixa Eterna' ou NULL para baixa comum
 * - data_lancamento: data de lançamento da baixa (opcional)
 * - data_validade: data de validade da baixa (opcional)
 */

async function up() {
  try {
    console.log("🚀 Iniciando migração: add_baixa_control_fields");

    // Adicionar campos de controle de baixa
    await pool.query(`
      ALTER TABLE prontuario
      ADD COLUMN IF NOT EXISTS status_baixa VARCHAR(20) DEFAULT NULL COMMENT 'Status da baixa: pendente, liberada',
      ADD COLUMN IF NOT EXISTS data_liberacao TIMESTAMP NULL DEFAULT NULL COMMENT 'Data/hora da liberação',
      ADD COLUMN IF NOT EXISTS usuario_liberacao_id INT NULL DEFAULT NULL COMMENT 'ID do veterinário que liberou',
      ADD COLUMN IF NOT EXISTS tipo_baixa VARCHAR(50) NULL DEFAULT NULL COMMENT 'Tipo: Baixa Eterna ou NULL',
      ADD COLUMN IF NOT EXISTS data_lancamento DATE NULL DEFAULT NULL COMMENT 'Data de lançamento da baixa',
      ADD COLUMN IF NOT EXISTS data_validade DATE NULL DEFAULT NULL COMMENT 'Data de validade da baixa'
    `);

    console.log("✅ Campos adicionados na tabela prontuario");

    // Adicionar foreign key para usuario_liberacao_id
    await pool.query(`
      ALTER TABLE prontuario
      ADD CONSTRAINT fk_prontuario_usuario_liberacao
      FOREIGN KEY (usuario_liberacao_id) 
      REFERENCES usuarios(id) 
      ON DELETE SET NULL
    `);

    console.log("✅ Foreign key criada: fk_prontuario_usuario_liberacao");

    console.log("🎉 Migração concluída com sucesso!");

  } catch (error) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  }
}

async function down() {
  try {
    console.log("⬇️  Revertendo migração: add_baixa_control_fields");

    // Remover foreign key
    await pool.query(`
      ALTER TABLE prontuario
      DROP FOREIGN KEY IF EXISTS fk_prontuario_usuario_liberacao
    `);

    // Remover colunas
    await pool.query(`
      ALTER TABLE prontuario
      DROP COLUMN IF EXISTS status_baixa,
      DROP COLUMN IF EXISTS data_liberacao,
      DROP COLUMN IF EXISTS usuario_liberacao_id,
      DROP COLUMN IF EXISTS tipo_baixa,
      DROP COLUMN IF EXISTS data_lancamento,
      DROP COLUMN IF EXISTS data_validade
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
  console.log("Usage: node add_baixa_control_fields.js [up|down]");
  process.exit(1);
}
