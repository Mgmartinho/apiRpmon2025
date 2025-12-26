import pool from './config/mysqlConnect.js';

const criarTabela = async () => {
  try {
    // Criar a tabela sem a FK primeiro
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ferrageamentos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        solipede_numero VARCHAR(50) NOT NULL,
        data_ferrageamento DATE NOT NULL,
        prazo_validade INT NOT NULL DEFAULT 45,
        proximo_ferrageamento DATE NOT NULL,
        responsavel VARCHAR(255),
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_solipede_numero (solipede_numero),
        INDEX idx_data_ferrageamento (data_ferrageamento),
        INDEX idx_proximo_ferrageamento (proximo_ferrageamento)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    console.log('Criando tabela ferrageamentos...');
    await pool.query(createTableSQL);
    console.log('✅ Tabela ferrageamentos criada com sucesso!');

    // Verificar se a tabela foi criada
    const [tables] = await pool.query("SHOW TABLES LIKE 'ferrageamentos'");
    console.log('Verificação:', tables.length > 0 ? '✅ Tabela existe' : '❌ Tabela não encontrada');

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message);
    console.error('Detalhes:', error);
    process.exit(1);
  }
};

criarTabela();
