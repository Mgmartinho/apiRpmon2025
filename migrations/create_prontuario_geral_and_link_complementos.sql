-- Migration: criar tabela prontuario_geral e vincular tabelas de complementos
-- Data: 2026-03-16

START TRANSACTION;

CREATE TABLE IF NOT EXISTS prontuario_geral (
  id INT NOT NULL AUTO_INCREMENT,
  numero_solipede INT NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_atualizacao TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  usuarioId INT NULL,
  PRIMARY KEY (id),
  KEY idx_prontuario_geral_numero (numero_solipede),
  KEY idx_prontuario_geral_tipo (tipo),
  KEY idx_prontuario_geral_usuario (usuarioId),
  CONSTRAINT fk_prontuario_geral_solipede
    FOREIGN KEY (numero_solipede) REFERENCES solipede(numero)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT fk_prontuario_geral_usuario
    FOREIGN KEY (usuarioId) REFERENCES usuarios(id)
    ON UPDATE CASCADE
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Migra dados legados da tabela prontuario para manter compatibilidade de IDs
INSERT INTO prontuario_geral (id, numero_solipede, tipo, data_criacao, data_atualizacao, usuarioId)
SELECT
  p.id,
  p.numero_solipede,
  p.tipo,
  COALESCE(p.data_criacao, NOW()),
  p.data_atualizacao,
  p.usuarioId
FROM prontuario p
WHERE NOT EXISTS (
  SELECT 1 FROM prontuario_geral pg WHERE pg.id = p.id
);

SET @next_id := (SELECT COALESCE(MAX(id), 0) + 1 FROM prontuario_geral);
SET @sql_ai := CONCAT('ALTER TABLE prontuario_geral AUTO_INCREMENT = ', @next_id);
PREPARE stmt_ai FROM @sql_ai;
EXECUTE stmt_ai;
DEALLOCATE PREPARE stmt_ai;

-- Remove FKs antigas que apontam para prontuario.id na coluna prontuario_id
-- (compatível com MariaDB: um PREPARE por statement)

-- prontuario_tratamentos
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_tratamentos'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_tratamentos` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prontuario_restricoes
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_restricoes'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_restricoes` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prontuario_dietas
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_dietas'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_dietas` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prontuario_dieta
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_dieta'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_dieta` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prontuario_suplementacoes
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_suplementacoes'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_suplementacoes` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prontuario_suplementacao
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_suplementacao'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_suplementacao` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prontuario_movimentacoes
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_movimentacoes'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_movimentacoes` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- prontuario_movimentacao
SET @fk_name := (
  SELECT kcu.CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE kcu
  WHERE kcu.TABLE_SCHEMA = DATABASE()
    AND kcu.TABLE_NAME = 'prontuario_movimentacao'
    AND kcu.COLUMN_NAME = 'prontuario_id'
    AND kcu.REFERENCED_TABLE_NAME = 'prontuario'
  LIMIT 1
);
SET @sql := IF(
  @fk_name IS NOT NULL,
  CONCAT('ALTER TABLE `prontuario_movimentacao` DROP FOREIGN KEY `', @fk_name, '`'),
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Helper para adicionar FK nas tabelas de complemento, preservando coluna prontuario_id
-- Tratamentos
SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_tratamentos'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_tratamentos'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_tratamentos ADD CONSTRAINT fk_pt_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Restrições
SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_restricoes'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_restricoes'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_restricoes ADD CONSTRAINT fk_pr_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Dietas (plural/singular)
SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_dietas'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_dietas'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_dietas ADD CONSTRAINT fk_pd_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_dieta'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_dieta'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_dieta ADD CONSTRAINT fk_pd_singular_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Suplementações (plural/singular)
SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_suplementacoes'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_suplementacoes'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_suplementacoes ADD CONSTRAINT fk_ps_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_suplementacao'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_suplementacao'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_suplementacao ADD CONSTRAINT fk_ps_singular_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Movimentações (plural/singular)
SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_movimentacoes'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_movimentacoes'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_movimentacoes ADD CONSTRAINT fk_pm_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @exists_tbl := (
  SELECT COUNT(*) FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prontuario_movimentacao'
);
SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'prontuario_movimentacao'
    AND COLUMN_NAME = 'prontuario_id'
    AND REFERENCED_TABLE_NAME = 'prontuario_geral'
);
SET @sql := IF(
  @exists_tbl > 0 AND @fk_exists = 0,
  'ALTER TABLE prontuario_movimentacao ADD CONSTRAINT fk_pm_singular_prontuario_geral FOREIGN KEY (prontuario_id) REFERENCES prontuario_geral(id) ON UPDATE CASCADE ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

COMMIT;
