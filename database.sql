-- Criar tabela prontuario se não existir
CREATE TABLE IF NOT EXISTS prontuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_solipede INT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'Observação Geral',
  observacao LONGTEXT NOT NULL,
  recomendacoes LONGTEXT,
  usuarioId INT NULL,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (numero_solipede) REFERENCES solipede(numero) ON DELETE CASCADE,
  FOREIGN KEY (usuarioId) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_numero_solipede (numero_solipede),
  INDEX idx_data_criacao (data_criacao)
);

ALTER TABLE historicoHoras ADD COLUMN usuario_id INT NULL;
ALTER TABLE historicoHoras ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;

-- Criar tabela solipedes_excluidos (histórico de exclusões)
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