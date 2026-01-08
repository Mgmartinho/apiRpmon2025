import pool from "../config/mysqlConnect.js";

/**
 * Migration: Adicionar campo precisa_baixar na tabela prontuario
 * 
 * Este campo armazena a escolha original do usuário:
 * - 'sim' quando o usuário optou por baixar o solípede
 * - 'nao' quando o usuário optou por não baixar
 * - NULL para registros que não são tratamentos ou registros antigos
 */

async function up() {
  const connection = await pool.getConnection();
  
  try {
    console.log("🔄 Iniciando migration: add_precisa_baixar_field");
    
    // Adicionar coluna precisa_baixar
    const sqlAddColumn = `
      ALTER TABLE prontuario 
      ADD COLUMN IF NOT EXISTS precisa_baixar VARCHAR(10) DEFAULT NULL 
      COMMENT 'Escolha do usuário: sim ou nao para baixar o solípede no tratamento'
    `;
    
    await connection.query(sqlAddColumn);
    console.log("✅ Coluna 'precisa_baixar' adicionada com sucesso!");
    
    // Atualizar registros existentes baseado no foi_responsavel_pela_baixa
    const sqlUpdate = `
      UPDATE prontuario 
      SET precisa_baixar = CASE 
        WHEN tipo = 'Tratamento' AND foi_responsavel_pela_baixa = 1 THEN 'sim'
        WHEN tipo = 'Tratamento' AND foi_responsavel_pela_baixa = 0 THEN 'nao'
        ELSE NULL
      END
      WHERE tipo = 'Tratamento'
    `;
    
    const [result] = await connection.query(sqlUpdate);
    console.log(`✅ ${result.affectedRows} registros de tratamento atualizados!`);
    
    console.log("✅ Migration concluída com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao executar migration:", error);
    throw error;
  } finally {
    connection.release();
  }
}

async function down() {
  const connection = await pool.getConnection();
  
  try {
    console.log("🔄 Revertendo migration: add_precisa_baixar_field");
    
    const sql = `ALTER TABLE prontuario DROP COLUMN IF EXISTS precisa_baixar`;
    await connection.query(sql);
    
    console.log("✅ Coluna 'precisa_baixar' removida com sucesso!");
    
  } catch (error) {
    console.error("❌ Erro ao reverter migration:", error);
    throw error;
  } finally {
    connection.release();
  }
}

// Permitir executar a migration diretamente
if (process.argv[2] === "up") {
  up()
    .then(() => {
      console.log("✅ Migration executada com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro ao executar migration:", error);
      process.exit(1);
    });
} else if (process.argv[2] === "down") {
  down()
    .then(() => {
      console.log("✅ Migration revertida com sucesso!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Erro ao reverter migration:", error);
      process.exit(1);
    });
}

export { up, down };
