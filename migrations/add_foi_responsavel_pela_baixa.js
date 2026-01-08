import pool from "../config/mysqlConnect.js";

/**
 * Migration: Adicionar campo foi_responsavel_pela_baixa na tabela prontuario
 * 
 * Campo adicionado:
 * - foi_responsavel_pela_baixa: BOOLEAN (0 ou 1) para marcar se um tratamento foi o responsável por baixar o solípede
 * 
 * Lógica:
 * - Quando um tratamento baixa o solípede, este campo é marcado como 1
 * - Se outro tratamento solicita baixa mas o solípede já está baixado, este campo fica 0
 * - Na conclusão, apenas tratamentos com foi_responsavel_pela_baixa=1 podem retornar o status para Ativo
 */

async function up() {
  try {
    console.log("🚀 Iniciando migração: add_foi_responsavel_pela_baixa");

    // Adicionar campo foi_responsavel_pela_baixa
    await pool.query(`
      ALTER TABLE prontuario
      ADD COLUMN IF NOT EXISTS foi_responsavel_pela_baixa TINYINT(1) DEFAULT 0 COMMENT 'Se 1, este tratamento foi o responsável por baixar o solípede'
    `);

    console.log("✅ Campo foi_responsavel_pela_baixa adicionado na tabela prontuario");

    console.log("🎉 Migração concluída com sucesso!");

  } catch (error) {
    console.error("❌ Erro na migração:", error.message);
    throw error;
  }
}

async function down() {
  try {
    console.log("⬇️  Revertendo migração: add_foi_responsavel_pela_baixa");

    // Remover coluna
    await pool.query(`
      ALTER TABLE prontuario
      DROP COLUMN IF EXISTS foi_responsavel_pela_baixa
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
  console.log("Usage: node add_foi_responsavel_pela_baixa.js [up|down]");
  process.exit(1);
}
