-- Criar tabela prontuario se não existir
CREATE TABLE IF NOT EXISTS prontuario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  numero_solipede INT NOT NULL,
  tipo VARCHAR(50) DEFAULT 'Observação Geral',
  observacao LONGTEXT NOT NULL,
  recomendacoes LONGTEXT,
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (numero_solipede) REFERENCES solipede(numero) ON DELETE CASCADE,
  INDEX idx_numero_solipede (numero_solipede),
  INDEX idx_data_criacao (data_criacao)
);

ALTER TABLE historicoHoras ADD COLUMN usuario_id INT NULL;
ALTER TABLE historicoHoras ADD FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL;