import pool from "../config/mysqlConnect.js";

async function addOrigemDestinoFields() {
  try {
    console.log('🚀 Iniciando migração: Adicionar campos origem e destino na tabela prontuario...');

    // Adicionar colunas origem e destino
    await pool.query(`
      ALTER TABLE prontuario 
      ADD COLUMN IF NOT EXISTS origem VARCHAR(100) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS destino VARCHAR(100) DEFAULT NULL
    `);
    
    console.log('✅ Campos origem e destino adicionados com sucesso!');

    // Criar índices para melhorar performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_prontuario_origem ON prontuario(origem)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_prontuario_destino ON prontuario(destino)
    `);
    
    console.log('✅ Índices criados com sucesso!');
    
    console.log('🎉 Migração concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  }
}

addOrigemDestinoFields();
