-- ============================================================================
-- Migration: 002_create_prontuario_cirurgias
-- Objetivo: criar tabela de cirurgias vinculada ao prontuario_geral, solipede e usuarios
-- ============================================================================

-- =========================
-- UP
-- =========================

CREATE TABLE IF NOT EXISTS prontuario_cirurgias (
  id INT(11) NOT NULL AUTO_INCREMENT,
  prontuario_id INT(11) NOT NULL,
  numero_solipede INT(11) NOT NULL,

  procedimento VARCHAR(500) DEFAULT NULL,
  descricao_procedimento LONGTEXT NOT NULL,
  status_conclusao ENUM('em_andamento','concluido') DEFAULT 'em_andamento',

  usuario_id INT(11) DEFAULT NULL,
  usuario_atualizacao INT(11) DEFAULT NULL,

  cirurgiao_principal_id INT(11) DEFAULT NULL,
  cirurgiao_anestesista_id INT(11) DEFAULT NULL,
  cirurgiao_auxiliar_id INT(11) DEFAULT NULL,
  auxiliar_id INT(11) DEFAULT NULL,

  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  KEY idx_prontuario (prontuario_id),
  KEY idx_solipede (numero_solipede),
  KEY idx_status (status_conclusao),
  KEY idx_status_data (status_conclusao, data_criacao),
  KEY idx_usuario (usuario_id),
  KEY idx_usuario_atualizacao (usuario_atualizacao),
  KEY idx_cirurgiao_principal (cirurgiao_principal_id),
  KEY idx_cirurgiao_anestesista (cirurgiao_anestesista_id),
  KEY idx_cirurgiao_auxiliar (cirurgiao_auxiliar_id),
  KEY idx_auxiliar (auxiliar_id),

  CONSTRAINT fk_cirurgia_prontuario
    FOREIGN KEY (prontuario_id)
    REFERENCES prontuario_geral (id)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT fk_cirurgia_solipede
    FOREIGN KEY (numero_solipede)
    REFERENCES solipede (numero)
    ON UPDATE CASCADE,

  CONSTRAINT fk_cirurgia_usuario
    FOREIGN KEY (usuario_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE,

  CONSTRAINT fk_cirurgia_usuario_atualizacao
    FOREIGN KEY (usuario_atualizacao)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE,

  CONSTRAINT fk_cirurgia_cirurgiao_principal
    FOREIGN KEY (cirurgiao_principal_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE,

  CONSTRAINT fk_cirurgia_cirurgiao_anestesista
    FOREIGN KEY (cirurgiao_anestesista_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE,

  CONSTRAINT fk_cirurgia_cirurgiao_auxiliar
    FOREIGN KEY (cirurgiao_auxiliar_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE,

  CONSTRAINT fk_cirurgia_auxiliar
    FOREIGN KEY (auxiliar_id)
    REFERENCES usuarios (id)
    ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;

-- Garante numero_solipede automaticamente com base no prontuario_geral
DROP TRIGGER IF EXISTS tr_prontuario_cirurgias_before_insert;

CREATE TRIGGER tr_prontuario_cirurgias_before_insert
BEFORE INSERT ON prontuario_cirurgias
FOR EACH ROW
SET NEW.numero_solipede = (
  SELECT pg.numero_solipede
  FROM prontuario_geral pg
  WHERE pg.id = NEW.prontuario_id
  LIMIT 1
);


-- =========================
-- DOWN
-- =========================

-- Para rollback manual, execute este bloco separadamente quando necessario:
-- DROP TRIGGER IF EXISTS tr_prontuario_cirurgias_before_insert;
-- DROP TABLE IF EXISTS prontuario_cirurgias;
