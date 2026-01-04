import pool from "../config/mysqlConnect.js";

async function criarTabelaHistoricoMovimentacao() {
  try {
    console.log("🔄 Criando tabela historico_movimentacao...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS historico_movimentacao (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero INT NOT NULL,
        esquadraoOrigem VARCHAR(100),
        esquadraoDestino VARCHAR(100) NOT NULL,
        usuarioId INT NOT NULL,
        dataMovimentacao DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (numero) REFERENCES solipede(numero) ON DELETE CASCADE,
        FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);

    console.log("✅ Tabela historico_movimentacao criada com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao criar tabela:", err);
  } finally {
    process.exit();
  }
}

criarTabelaHistoricoMovimentacao();
