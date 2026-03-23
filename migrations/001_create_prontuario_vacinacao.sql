-- ============================================================================
-- Criar tabela prontuario_vacinacao
-- Referências: prontuario_geral e usuarios (mesmo padrão das outras tabelas)
-- ============================================================================

CREATE TABLE IF NOT EXISTS prontuario_vacinacao (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prontuario_id INT NOT NULL,
  numero_solipede INT,
  usuario_id INT NOT NULL,
  
  -- Dados específicos de vacinação
  produto VARCHAR(255) NOT NULL COMMENT 'Nome do produto/vacina',
  partida VARCHAR(100) COMMENT 'Número da partida',
  fabricacao DATE COMMENT 'Data de fabricação',
  lote VARCHAR(100) COMMENT 'Número do lote',
  dose VARCHAR(100) COMMENT 'Dose administrada',
  
  -- Datas
  data_inicio DATE COMMENT 'Data de início da vacinação',
  data_validade DATE COMMENT 'Data de validade da vacina',
  data_fim DATE COMMENT 'Data do término/conclusão',
  
  -- Observações
  descricao TEXT COMMENT 'Observações adicionais',
  
  -- Status e controle
  status_conclusao VARCHAR(20) DEFAULT 'em_andamento' COMMENT 'em_andamento, concluido',
  usuario_atualizacao INT COMMENT 'Usuário que atualizou por último',
  
  -- Timestamps
  data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Chaves estrangeiras
  FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
  FOREIGN KEY (usuario_atualizacao) REFERENCES usuarios(id) ON DELETE SET NULL,
  
  -- Índices
  INDEX idx_prontuario_id (prontuario_id),
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_numero_solipede (numero_solipede),
  INDEX idx_status_conclusao (status_conclusao),
  INDEX idx_data_criacao (data_criacao)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- Adicionar coluna numero_solipede a partir do prontuario_geral (trigger)
-- ============================================================================

DELIMITER $$

CREATE TRIGGER IF NOT EXISTS tr_prontuario_vacinacao_insert
BEFORE INSERT ON prontuario_vacinacao
FOR EACH ROW
BEGIN
  DECLARE solipede_num INT;
  
  SELECT numero_solipede INTO solipede_num
  FROM prontuario_geral
  WHERE id = NEW.prontuario_id
  LIMIT 1;
  
  SET NEW.numero_solipede = solipede_num;
END$$

DELIMITER ;
