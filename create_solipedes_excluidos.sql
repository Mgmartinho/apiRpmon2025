-- Script para criar tabela de solípedes excluídos (histórico de exclusões)
-- Execute este script no MySQL para criar a tabela

USE rpmon_db;

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
);

SELECT 'Tabela solipedes_excluidos criada com sucesso!' AS Status;
