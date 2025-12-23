import pool from "./config/mysqlConnect.js";

async function criarTabelaExclusao() {
  try {
    console.log("🗄️  Criando tabela solipedes_excluidos...\n");

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS solipedes_excluidos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        -- Dados do solípede original
        numero INT NOT NULL,
        nome VARCHAR(100),
        sexo VARCHAR(20),
        pelagem VARCHAR(50),
        raca VARCHAR(50),
        DataNascimento DATE,
        origem VARCHAR(100),
        status VARCHAR(20),
        esquadrao VARCHAR(50),
        movimentacao VARCHAR(100),
        alocacao VARCHAR(100),
        -- Dados da exclusão
        motivo_exclusao TEXT NOT NULL,
        data_exclusao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        usuario_exclusao_id INT NULL,
        FOREIGN KEY (usuario_exclusao_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        INDEX idx_numero (numero),
        INDEX idx_data_exclusao (data_exclusao)
      )
    `;

    await pool.query(createTableSQL);
    console.log("✅ Tabela 'solipedes_excluidos' criada com sucesso!\n");

    // Verificar estrutura da tabela
    const [columns] = await pool.query("DESCRIBE solipedes_excluidos");
    console.log("📋 Estrutura da tabela:");
    console.table(columns);

    // Contar registros
    const [[{ count }]] = await pool.query(
      "SELECT COUNT(*) as count FROM solipedes_excluidos"
    );
    console.log(`\n📊 Total de registros na tabela: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao criar tabela:", error.message);
    process.exit(1);
  }
}

criarTabelaExclusao();
